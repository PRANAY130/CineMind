import os
import uuid
import asyncio
import boto3
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Body
from pydantic import BaseModel
import yt_dlp
import tempfile
from botocore.config import Config
from db.postgres import get_db_pool
from db.firestore import get_firestore_client
from routers.auth import get_current_user
from workers.pipeline import run_video_pipeline
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/videos", tags=["videos"])


def get_r2_client():
    """Build R2/S3 client — reads env vars inside the function (not at module load)."""
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("CLOUDFLARE_R2_ENDPOINT"),
        aws_access_key_id=os.getenv("CLOUDFLARE_R2_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("CLOUDFLARE_R2_SECRET_KEY"),
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )

def _parse_r2_key(r2_url: str) -> str:
    from urllib.parse import urlparse
    parsed = urlparse(r2_url)
    path_no_slash = parsed.path.lstrip("/")
    parts = path_no_slash.split("/", 1)
    if len(parts) < 2:
        raise ValueError(f"Cannot extract R2 key from URL: {r2_url}")
    return parts[1]


@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub") or user.get("id", "anonymous")
    bucket = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")
    file_ext = (file.filename or "video.mp4").rsplit(".", 1)[-1].lower()
    r2_key = f"videos/{user_id}/{uuid.uuid4()}.{file_ext}"

    print(f"[Upload] user={user_id}  file='{file.filename}'  key='{r2_key}'")

    # ── Upload to Cloudflare R2 ────────────────────────────────────────────
    try:
        r2 = get_r2_client()
        contents = await file.read()
        print(f"[Upload] File read: {len(contents):,} bytes — uploading to R2…")
        await asyncio.to_thread(
            r2.put_object,
            Bucket=bucket,
            Key=r2_key,
            Body=contents,
            ContentType=file.content_type or "video/mp4",
        )
        endpoint = os.getenv("CLOUDFLARE_R2_ENDPOINT", "")
        r2_url = f"{endpoint}/{bucket}/{r2_key}"
        print(f"[Upload] ✓ R2 upload success: {r2_url}")
    except Exception as e:
        print(f"[Upload] ✗ R2 upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"R2 upload failed: {e}")

    # ── Insert video record in NeonDB ─────────────────────────────────────
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """INSERT INTO videos (user_id, title, r2_url, status)
                   VALUES ($1, $2, $3, 'processing') RETURNING id""",
                user_id,
                file.filename or "Untitled",
                r2_url,
            )
            video_id = row["id"]
        print(f"[Upload] ✓ NeonDB record created  video_id={video_id}")
    except Exception as e:
        print(f"[Upload] ✗ NeonDB insert failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # ── Dispatch Celery pipeline task ─────────────────────────────────────
    try:
        run_video_pipeline.delay(video_id, r2_url)
        print(f"[Upload] ✓ Pipeline task dispatched  video_id={video_id}")
    except Exception as e:
        print(f"[Upload] ✗ Celery dispatch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start pipeline: {e}")

    return {"message": "Video uploaded, processing started", "video_id": video_id}

class YouTubeUploadRequest(BaseModel):
    url: str

@router.post("/upload-youtube")
async def upload_youtube(
    request: YouTubeUploadRequest,
    user: dict = Depends(get_current_user),
):
    user_id = user.get("sub") or user.get("id", "anonymous")
    bucket = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")
    
    print(f"[Upload] YouTube url='{request.url}'  user={user_id}")
    
    # ── Download with yt-dlp ───────────────────────────────────────────────
    # Use worst or best[height<=480] to keep size small as requested
    ydl_opts = {
        'format': 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/worst',
        'outtmpl': os.path.join(tempfile.gettempdir(), '%(id)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = await asyncio.to_thread(ydl.extract_info, request.url, download=True)
            video_title = info.get('title', 'YouTube Video')
            file_path = ydl.prepare_filename(info)
            # if ext is webm, it's fine.
            file_ext = file_path.rsplit(".", 1)[-1].lower()
    except Exception as e:
        print(f"[Upload] ✗ yt-dlp failed: {e}")
        raise HTTPException(status_code=400, detail=f"Failed to download YouTube video: {e}")

    r2_key = f"videos/{user_id}/{uuid.uuid4()}.{file_ext}"

    # ── Upload to Cloudflare R2 ────────────────────────────────────────────
    try:
        r2 = get_r2_client()
        with open(file_path, 'rb') as f:
            contents = f.read()
        print(f"[Upload] YouTube File read: {len(contents):,} bytes — uploading to R2…")
        await asyncio.to_thread(
            r2.put_object,
            Bucket=bucket,
            Key=r2_key,
            Body=contents,
            ContentType=f"video/{file_ext}",
        )
        endpoint = os.getenv("CLOUDFLARE_R2_ENDPOINT", "")
        r2_url = f"{endpoint}/{bucket}/{r2_key}"
        print(f"[Upload] ✓ R2 upload success: {r2_url}")
    except Exception as e:
        print(f"[Upload] ✗ R2 upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"R2 upload failed: {e}")
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass

    # ── Insert video record in NeonDB ─────────────────────────────────────
    try:
        pool = await get_db_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """INSERT INTO videos (user_id, title, r2_url, status)
                   VALUES ($1, $2, $3, 'processing') RETURNING id""",
                user_id,
                video_title,
                r2_url,
            )
            video_id = row["id"]
        print(f"[Upload] ✓ NeonDB record created  video_id={video_id}")
    except Exception as e:
        print(f"[Upload] ✗ NeonDB insert failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    # ── Dispatch Celery pipeline task ─────────────────────────────────────
    try:
        run_video_pipeline.delay(video_id, r2_url)
        print(f"[Upload] ✓ Pipeline task dispatched  video_id={video_id}")
    except Exception as e:
        print(f"[Upload] ✗ Celery dispatch failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start pipeline: {e}")

    return {"message": "YouTube video uploaded, processing started", "video_id": video_id}



@router.get("/")
async def list_videos(user: dict = Depends(get_current_user)):
    user_id = user.get("sub") or user.get("id", "anonymous")
    print(f"[Videos] Listing videos for user={user_id}")
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM videos WHERE user_id=$1 ORDER BY created_at DESC",
            user_id,
        )
    print(f"[Videos] Found {len(rows)} videos")
    
    # Generate presigned URLs for all videos so the frontend can use them as thumbnails
    videos_list = []
    r2 = None
    bucket = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")
    
    try:
        r2 = get_r2_client()
    except Exception:
        pass
        
    for r in rows:
        video_dict = dict(r)
        if r2 and video_dict.get("r2_url"):
            try:
                key = _parse_r2_key(video_dict["r2_url"])
                presigned_url = r2.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": bucket, "Key": key},
                    ExpiresIn=3600
                )
                video_dict["stream_url"] = presigned_url
            except Exception:
                pass
        videos_list.append(video_dict)
        
    return videos_list


@router.get("/{video_id}")
async def get_video(video_id: int, user: dict = Depends(get_current_user)):
    print(f"[Videos] Fetching video_id={video_id}")
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        video = await conn.fetchrow("SELECT * FROM videos WHERE id=$1", video_id)
        chapters = await conn.fetch(
            "SELECT * FROM chapters WHERE video_id=$1 ORDER BY order_index",
            video_id,
        )
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    video_dict = dict(video)
    
    # Generate a pre-signed URL for streaming
    try:
        r2 = get_r2_client()
        key = _parse_r2_key(video_dict["r2_url"])
        bucket = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")
        presigned_url = r2.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=3600
        )
        video_dict["stream_url"] = presigned_url
    except Exception as e:
        print(f"[Videos] Failed to generate presigned URL: {e}")
        video_dict["stream_url"] = video_dict["r2_url"]
        
    return {**video_dict, "chapters": [dict(c) for c in chapters]}

@router.delete("/{video_id}")
async def delete_video(video_id: int, user: dict = Depends(get_current_user)):
    user_id = user.get("sub") or user.get("id", "anonymous")
    print(f"[Videos] Deleting video_id={video_id} for user={user_id}")
    
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        video = await conn.fetchrow("SELECT * FROM videos WHERE id=$1 AND user_id=$2", video_id, user_id)
        if not video:
            raise HTTPException(status_code=404, detail="Video not found")
            
        # 1. Delete from R2
        try:
            r2 = get_r2_client()
            key = _parse_r2_key(video["r2_url"])
            bucket = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")
            r2.delete_object(Bucket=bucket, Key=key)
            print(f"[Videos] Deleted object from R2: {key}")
        except Exception as e:
            print(f"[Videos] ⚠ Failed to delete from R2: {e}")
            
        # 2. Delete from Firestore
        try:
            fs_db = get_firestore_client()
            if fs_db:
                fs_db.collection("transcripts").document(str(video_id)).delete()
                print(f"[Videos] Deleted transcript from Firestore")
        except Exception as e:
            print(f"[Videos] ⚠ Failed to delete from Firestore: {e}")
            
        # 3. Delete from ChromaDB
        try:
            from db.chroma_db import get_video_chunks_collection
            collection = get_video_chunks_collection()
            existing = collection.get(where={"video_id": video_id})
            if existing["ids"]:
                collection.delete(ids=existing["ids"])
                print(f"[Videos] Deleted {len(existing['ids'])} chunks from ChromaDB")
        except Exception as e:
            print(f"[Videos] ⚠ Failed to delete from ChromaDB: {e}")
            
        # 4. Delete from PostgreSQL (cascades to jobs and chapters)
        await conn.execute("DELETE FROM videos WHERE id=$1", video_id)
        print(f"[Videos] Deleted video record from DB")
        
    return {"status": "success", "message": "Video deleted"}


@router.get("/{video_id}/transcript")
async def get_transcript(video_id: int):
    """Fetch transcript segments from Firestore."""
    print(f"[Videos] Fetching transcript for video_id={video_id}")
    try:
        fs_db = get_firestore_client()
        if not fs_db:
            print("[Videos] Firestore unavailable")
            return []
        doc = fs_db.collection("transcripts").document(str(video_id)).get()
        if doc.exists:
            segments = doc.to_dict().get("segments", [])
            print(f"[Videos] Transcript returned {len(segments)} segments")
            return segments
    except Exception as e:
        print(f"[Videos] Transcript fetch error: {e}")
    return []


@router.get("/{video_id}/emotions")
async def get_emotions(video_id: int):
    """Fetch LLaMA-3 generated emotion data from Firestore."""
    print(f"[Videos] Fetching emotions for video_id={video_id}")
    try:
        fs_db = get_firestore_client()
        if not fs_db:
            return []
        doc = fs_db.collection("emotions").document(str(video_id)).get()
        if doc.exists:
            emotion_data = doc.to_dict().get("emotion_data", [])
            print(f"[Videos] Emotion data returned {len(emotion_data)} buckets")
            return emotion_data
    except Exception as e:
        print(f"[Videos] Emotion fetch error: {e}")
    return []
