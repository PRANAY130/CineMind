import os
import uuid
import json
import asyncio
import tempfile
import subprocess
import boto3
from dotenv import load_dotenv
from .celery_app import celery_app

load_dotenv()

FFMPEG_AVAILABLE = None  # lazy check

def check_ffmpeg():
    global FFMPEG_AVAILABLE
    if FFMPEG_AVAILABLE is None:
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
            FFMPEG_AVAILABLE = True
        except (FileNotFoundError, subprocess.CalledProcessError):
            FFMPEG_AVAILABLE = False
    return FFMPEG_AVAILABLE

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("CLOUDFLARE_R2_ENDPOINT"),
        aws_access_key_id=os.getenv("CLOUDFLARE_R2_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("CLOUDFLARE_R2_SECRET_KEY"),
        region_name="auto",
    )

@celery_app.task(bind=True, ignore_result=True)
def run_video_pipeline(self, video_id: int, r2_url: str):
    """
    Full AI processing pipeline. All exceptions are caught and logged
    so Celery never crashes — status is tracked in NeonDB.
    """
    import asyncpg
    from groq import Groq

    NEON_DB_URL = os.getenv("NEON_DB_URL")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    BUCKET = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")
    HAS_FFMPEG = check_ffmpeg()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def run():
        conn = await asyncpg.connect(dsn=NEON_DB_URL)
        groq_client = Groq(api_key=GROQ_API_KEY)
        duration = 0

        try:
            with tempfile.TemporaryDirectory() as tmpdir:

                # ── Step 1: Download video from R2 ─────────────────────────
                self.update_state(state='PROGRESS', meta={'step': 'Downloading video...', 'progress_pct': 5})
                print(f"[Pipeline] Downloading video {video_id} from R2...")
                r2 = get_r2_client()
                r2_key = r2_url.split(f"{BUCKET}/")[-1]
                local_video = os.path.join(tmpdir, f"video_{video_id}.mp4")
                r2.download_file(BUCKET, r2_key, local_video)
                print(f"[Pipeline] Downloaded to {local_video}")

                # ── Step 2: Get duration (optional, needs FFmpeg) ───────────
                if HAS_FFMPEG:
                    try:
                        probe = subprocess.run(
                            ["ffprobe", "-v", "quiet", "-print_format", "json",
                             "-show_streams", local_video],
                            capture_output=True, text=True
                        )
                        if probe.returncode == 0:
                            info = json.loads(probe.stdout)
                            streams = info.get("streams", [])
                            duration = int(float(streams[0].get("duration", 0))) if streams else 0
                            await conn.execute(
                                "UPDATE videos SET duration_sec = $1 WHERE id = $2",
                                duration, video_id
                            )
                    except Exception as e:
                        print(f"[Pipeline] ffprobe error (non-fatal): {e}")
                else:
                    print("[Pipeline] WARNING: FFmpeg not found. Skipping duration & audio extraction.")
                    print("[Pipeline] Install FFmpeg from https://ffmpeg.org/download.html and add to PATH")

                # ── Step 3: Extract audio + Transcribe ─────────────────────
                transcript_text = ""
                segments = []

                if HAS_FFMPEG:
                    self.update_state(state='PROGRESS', meta={'step': 'Extracting audio...', 'progress_pct': 20})
                    local_audio = os.path.join(tmpdir, f"audio_{video_id}.mp3")
                    try:
                        subprocess.run([
                            "ffmpeg", "-y", "-i", local_video,
                            "-q:a", "0", "-map", "a", local_audio
                        ], capture_output=True, check=True)

                        self.update_state(state='PROGRESS', meta={'step': 'Transcribing with Whisper...', 'progress_pct': 35})
                        print(f"[Pipeline] Transcribing with Groq Whisper...")
                        with open(local_audio, "rb") as af:
                            transcription = groq_client.audio.transcriptions.create(
                                file=(os.path.basename(local_audio), af.read()),
                                model="whisper-large-v3",
                                response_format="verbose_json"
                            )
                        transcript_text = transcription.text
                        segments = getattr(transcription, "segments", []) or []
                        print(f"[Pipeline] Transcription complete: {len(transcript_text)} chars")
                    except Exception as e:
                        print(f"[Pipeline] Transcription error (non-fatal): {e}")
                        transcript_text = ""
                else:
                    # No FFmpeg: use Groq vision/text on the raw file name as placeholder
                    transcript_text = f"[Auto-transcription unavailable: FFmpeg not installed. Video: {r2_key}]"

                # ── Step 4: Store transcript in Firestore ───────────────────
                self.update_state(state='PROGRESS', meta={'step': 'Indexing transcript...', 'progress_pct': 55})
                try:
                    import firebase_admin
                    from firebase_admin import credentials, firestore as fs
                    cert_path = os.getenv("FIREBASE_CERT_PATH", "firebase-adminsdk.json")
                    if not firebase_admin._apps:
                        cred = credentials.Certificate(cert_path)
                        firebase_admin.initialize_app(cred)
                    db = fs.client()
                    db.collection("transcripts").document(str(video_id)).set({
                        "video_id": video_id,
                        "full_text": transcript_text,
                        "segments": [
                            {"start": s.get("start", 0), "end": s.get("end", 0), "text": s.get("text", "")}
                            for s in (segments if isinstance(segments, list) else [])
                        ]
                    })
                    print(f"[Pipeline] Transcript saved to Firestore")
                except Exception as e:
                    print(f"[Pipeline] Firestore error (non-fatal): {e}")

                # ── Step 5: Generate chapters with LLaMA 3 ─────────────────
                self.update_state(state='PROGRESS', meta={'step': 'Generating chapters...', 'progress_pct': 70})
                chapters = []
                if transcript_text and "unavailable" not in transcript_text:
                    try:
                        print(f"[Pipeline] Generating chapters with LLaMA 3...")
                        chat = groq_client.chat.completions.create(
                            model="llama3-70b-8192",
                            messages=[
                                {
                                    "role": "system",
                                    "content": (
                                        "You are a video analysis AI. Given a transcript, return a JSON array of chapters. "
                                        "Each chapter must have: title (string), summary (string), "
                                        "start_time (integer seconds), end_time (integer seconds). "
                                        "Return ONLY the JSON array, no markdown fences, no explanation."
                                    )
                                },
                                {
                                    "role": "user",
                                    "content": f"Create chapters for this transcript:\n\n{transcript_text[:4000]}"
                                }
                            ],
                            temperature=0.3,
                            max_tokens=1024
                        )
                        raw = chat.choices[0].message.content.strip()
                        if raw.startswith("```"):
                            raw = "\n".join(raw.split("\n")[1:])
                            raw = raw.rsplit("```", 1)[0]
                        chapters = json.loads(raw)
                        print(f"[Pipeline] Generated {len(chapters)} chapters")
                    except Exception as e:
                        print(f"[Pipeline] Chapter generation error (non-fatal): {e}")
                        chapters = [{
                            "title": "Full Content",
                            "summary": transcript_text[:300] + "..." if len(transcript_text) > 300 else transcript_text,
                            "start_time": 0,
                            "end_time": duration
                        }]

                # ── Step 6: Save chapters to NeonDB ────────────────────────
                self.update_state(state='PROGRESS', meta={'step': 'Saving chapters...', 'progress_pct': 85})
                for i, ch in enumerate(chapters):
                    try:
                        await conn.execute(
                            """INSERT INTO chapters (video_id, title, summary, start_time, end_time, order_index)
                               VALUES ($1, $2, $3, $4, $5, $6)""",
                            video_id,
                            str(ch.get("title", f"Chapter {i+1}"))[:255],
                            str(ch.get("summary", "")),
                            int(ch.get("start_time", 0)),
                            int(ch.get("end_time", 0)),
                            i
                        )
                    except Exception as e:
                        print(f"[Pipeline] Chapter insert error (non-fatal): {e}")

                # ── Step 7: Mark video as ready ─────────────────────────────
                await conn.execute("UPDATE videos SET status = 'ready' WHERE id = $1", video_id)
                print(f"[Pipeline] Video {video_id} marked as READY ✓")
                self.update_state(state='SUCCESS', meta={'step': 'completed', 'progress_pct': 100})
                return {"status": "success", "video_id": video_id}

        except Exception as e:
            # Catch-all: mark failed in DB but DON'T re-raise so Celery stays alive
            print(f"[Pipeline] FATAL error for video {video_id}: {e}")
            try:
                await conn.execute("UPDATE videos SET status = 'failed' WHERE id = $1", video_id)
            except Exception:
                pass
            return {"status": "failed", "error": str(e)}
        finally:
            await conn.close()

    return loop.run_until_complete(run())
