import os
import sys
# Ensure backend root is in PYTHONPATH so 'services' and 'db' can be found
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import re
import json
import tempfile
import traceback
import boto3
from dotenv import load_dotenv
from .celery_app import celery_app

load_dotenv()


#  Helpers 

def _clean_psycopg2_dsn(dsn: str) -> str:
    """psycopg2 (unlike libpq) does not support channel_binding. Strip it."""
    dsn = re.sub(r"[&?]channel_binding=[^&]*", "", dsn)
    dsn = re.sub(r"[?&]$", "", dsn)
    return dsn


def get_r2_client():
    from botocore.config import Config
    endpoint = os.getenv("CLOUDFLARE_R2_ENDPOINT")
    access_key = os.getenv("CLOUDFLARE_R2_ACCESS_KEY")
    secret_key = os.getenv("CLOUDFLARE_R2_SECRET_KEY")
    print(f"[R2] Connecting to endpoint: {endpoint}")
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def _parse_r2_key(r2_url: str) -> str:
    """
    Extract the object key (path inside bucket) from a full R2 URL.
    URL format: https://<account>.r2.cloudflarestorage.com/<bucket>/<key...>
    parsed.path = /<bucket>/<key...>
    We want just <key...>
    """
    from urllib.parse import urlparse
    parsed = urlparse(r2_url)
    # path = /videoanalyser/videos/user123/uuid.mp4
    path_no_slash = parsed.path.lstrip("/")          # videoanalyser/videos/...
    parts = path_no_slash.split("/", 1)              # ['videoanalyser', 'videos/...']
    if len(parts) < 2:
        raise ValueError(f"Cannot extract R2 key from URL: {r2_url}")
    key = parts[1]                                   # videos/<user>/<uuid>.mp4
    print(f"[R2] Parsed key: '{key}'")
    return key


def _normalise_segment(seg) -> dict:
    """Accept both dict segments (verbose_json) and object segments."""
    if isinstance(seg, dict):
        return {
            "start": seg.get("start", 0),
            "end":   seg.get("end",   0),
            "text":  seg.get("text",  "").strip(),
        }
    return {
        "start": getattr(seg, "start", 0),
        "end":   getattr(seg, "end",   0),
        "text":  getattr(seg, "text",  "").strip(),
    }


#  Celery Task 

@celery_app.task(bind=True, ignore_result=True)
def run_video_pipeline(self, video_id: int, r2_url: str):
    """
    Full AI processing pipeline for a single video.
    All sub-steps are individually wrapped so one failure never kills the
    whole pipeline  status is tracked in NeonDB after every step.
    
    No FFmpeg required: the video file is sent directly to Groq Whisper
    (Groq's API accepts MP4/WEBM/MOV natively for audio transcription).
    """
    import psycopg2
    from groq import Groq

    NEON_DB_URL = _clean_psycopg2_dsn(os.getenv("NEON_DB_URL", ""))
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    BUCKET = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")

    print(f"[Pipeline]  Starting pipeline  video_id={video_id}")
    print(f"[Pipeline]   R2 URL : {r2_url}")
    print(f"[Pipeline]   Bucket : {BUCKET}")

    #  DB connection (sync psycopg2  Celery tasks are synchronous) 
    try:
        conn = psycopg2.connect(NEON_DB_URL)
        print("[Pipeline]  DB connected")
    except Exception as e:
        print(f"[Pipeline]  FATAL: DB connection failed: {e}")
        return {"status": "failed", "error": str(e)}

    groq_client = Groq(api_key=GROQ_API_KEY)

    def update_progress(step: str, pct: int):
        """Write progress to NeonDB so the WebSocket can poll it."""
        print(f"[Pipeline]   [{pct:3d}%] {step}")
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE jobs SET step=%s, progress_pct=%s, "
                    "updated_at=CURRENT_TIMESTAMP WHERE video_id=%s",
                    (step, pct, video_id),
                )
                if cur.rowcount == 0:
                    cur.execute(
                        "INSERT INTO jobs (video_id, step, progress_pct) "
                        "VALUES (%s, %s, %s)",
                        (video_id, step, pct),
                    )
            conn.commit()
        except Exception as db_err:
            print(f"[Pipeline]   DB progress write error: {db_err}")
            conn.rollback()

    #  Main pipeline body 
    try:
        with tempfile.TemporaryDirectory() as tmpdir:

            #  STEP 1  Download video from Cloudflare R2 
            update_progress("Downloading video from cloud...", 5)
            r2 = get_r2_client()
            r2_key = _parse_r2_key(r2_url)
            local_video = os.path.join(tmpdir, f"video_{video_id}.mp4")
            r2.download_file(BUCKET, r2_key, local_video)
            file_size = os.path.getsize(local_video)
            print(f"[Pipeline]  Downloaded: {local_video}  ({file_size:,} bytes)")

            #  STEP 2  Transcribe with Groq Whisper (no FFmpeg needed) 
            # Groq's Whisper API accepts video files (mp4, webm, mov, etc.)
            # directly  no need to extract audio separately.
            update_progress("Transcribing with Groq Whisper...", 25)
            transcript_text = ""
            segments = []

            # Groq enforces a 25 MB file-size limit
            MAX_BYTES = 24 * 1024 * 1024   # 24 MB safety margin
            transcribe_path = local_video
            if file_size > MAX_BYTES:
                print(f"[Pipeline]   File > 25 MB  truncating for Whisper")
                trunc_path = os.path.join(tmpdir, f"trunc_{video_id}.mp4")
                with open(local_video, "rb") as fin, open(trunc_path, "wb") as fout:
                    fout.write(fin.read(MAX_BYTES))
                transcribe_path = trunc_path

            try:
                print(f"[Pipeline]   Sending {os.path.getsize(transcribe_path):,} bytes to Groq Whisper")
                with open(transcribe_path, "rb") as af:
                    transcription = groq_client.audio.transcriptions.create(
                        file=(os.path.basename(transcribe_path), af.read()),
                        model="whisper-large-v3",
                        response_format="verbose_json",
                    )
                transcript_text = transcription.text or ""
                raw_segs = getattr(transcription, "segments", None) or []
                segments = [_normalise_segment(s) for s in raw_segs]
                print(f"[Pipeline]  Transcription: {len(transcript_text)} chars, "
                      f"{len(segments)} segments")
            except Exception as e:
                print(f"[Pipeline]   Transcription error (non-fatal): {e}")
                traceback.print_exc()
                transcript_text = f"[Transcription failed: {str(e)[:200]}]"

            #  STEP 3  Save transcript to Firestore 
            update_progress("Saving transcript to Firestore...", 45)
            try:
                from db.firestore import get_firestore_client
                fs_db = get_firestore_client()
                if fs_db:
                    fs_db.collection("transcripts").document(str(video_id)).set({
                        "video_id": video_id,
                        "full_text": transcript_text,
                        "segments": segments,
                    })
                    print(f"[Pipeline]  Firestore: saved {len(segments)} segments")
                else:
                    print("[Pipeline]   Firestore unavailable  skipping")
            except Exception as e:
                print(f"[Pipeline]   Firestore error (non-fatal): {e}")

            #  STEP 4  Embed chunks into ChromaDB for RAG 
            update_progress("Indexing transcript for AI chat...", 58)
            if transcript_text and "Transcription failed" not in transcript_text:
                try:
                    from services.embedding import generate_embeddings, chunk_text
                    from db.chroma_db import get_video_chunks_collection

                    collection = get_video_chunks_collection()
                    chunks = chunk_text(transcript_text, segments)
                    print(f"[Pipeline]   Embedding {len(chunks)} chunks via HuggingFace API")

                    # Delete stale chunks for this video
                    try:
                        existing = collection.get(where={"video_id": video_id})
                        if existing["ids"]:
                            collection.delete(ids=existing["ids"])
                            print(f"[Pipeline]   Deleted {len(existing['ids'])} old chunks")
                    except Exception:
                        pass

                    indexed = 0
                    for i, chunk in enumerate(chunks):
                        emb = generate_embeddings(chunk["text"])
                        if emb:
                            collection.add(
                                ids=[f"vid{video_id}_chunk{i}"],
                                embeddings=[emb],
                                documents=[chunk["text"]],
                                metadatas=[{
                                    "video_id": video_id,
                                    "start": float(chunk.get("start", 0)),
                                    "end":   float(chunk.get("end",   0)),
                                }],
                            )
                            indexed += 1
                    print(f"[Pipeline]  ChromaDB: indexed {indexed}/{len(chunks)} chunks")
                except Exception as e:
                    print(f"[Pipeline]   ChromaDB/embedding error (non-fatal): {e}")
                    traceback.print_exc()

            #  STEP 5  Generate chapters with Groq LLaMA 3 
            update_progress("Generating chapters with LLaMA 3...", 72)
            chapters = []
            if transcript_text and "Transcription failed" not in transcript_text:
                try:
                    print("[Pipeline]   Calling Groq LLaMA 3 for chapter generation")
                    chat_resp = groq_client.chat.completions.create(
                        model="llama-3.3-70b-versatile",
                        messages=[
                            {
                                "role": "system",
                                "content": (
                                    "You are a video analysis AI. Given a transcript, return a JSON array "
                                    "of chapters. Each chapter must have exactly these keys: "
                                    "title (string), summary (string), start_time (integer seconds), "
                                    "end_time (integer seconds). "
                                    "Return ONLY valid JSON array  no markdown fences, no explanation."
                                ),
                            },
                            {
                                "role": "user",
                                "content": f"Create chapters for this transcript:\n\n{transcript_text[:6000]}",
                            },
                        ],
                        temperature=0.3,
                        max_tokens=1024,
                    )
                    raw = chat_resp.choices[0].message.content.strip()
                    # Robust JSON extraction  strip any accidental markdown fences
                    match = re.search(r"\[.*\]", raw, re.DOTALL)
                    raw = match.group(0) if match else raw
                    chapters = json.loads(raw)
                    if not isinstance(chapters, list):
                        chapters = []
                    print(f"[Pipeline]  Generated {len(chapters)} chapters")
                except Exception as e:
                    print(f"[Pipeline]   Chapter generation error (non-fatal): {e}")
                    chapters = [{
                        "title": "Full Content",
                        "summary": transcript_text[:400],
                        "start_time": 0,
                        "end_time": 0,
                    }]

            #  STEP 6  Persist chapters to NeonDB 
            update_progress("Saving chapters to database...", 88)
            for i, ch in enumerate(chapters):
                try:
                    with conn.cursor() as cur:
                        cur.execute(
                            """INSERT INTO chapters
                               (video_id, title, summary, start_time, end_time, order_index)
                               VALUES (%s, %s, %s, %s, %s, %s)""",
                            (
                                video_id,
                                str(ch.get("title", f"Chapter {i+1}"))[:255],
                                str(ch.get("summary", "")),
                                int(ch.get("start_time", 0)),
                                int(ch.get("end_time",   0)),
                                i,
                            ),
                        )
                    conn.commit()
                except Exception as e:
                    print(f"[Pipeline]   Chapter {i} insert error: {e}")
                    conn.rollback()

            #  STEP 7  Mark video as ready 
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE videos SET status='ready' WHERE id=%s", (video_id,)
                )
            conn.commit()
            update_progress("completed", 100)
            print(f"[Pipeline]  Video {video_id} pipeline complete!")
            return {"status": "success", "video_id": video_id}

    except Exception as e:
        print(f"[Pipeline]  FATAL error for video {video_id}: {e}")
        traceback.print_exc()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE videos SET status='failed' WHERE id=%s", (video_id,)
                )
            conn.commit()
            update_progress("failed", 0)
        except Exception:
            conn.rollback()
        return {"status": "failed", "error": str(e)}
    finally:
        conn.close()
        print(f"[Pipeline] DB connection closed for video {video_id}")

