import os
import uuid
import asyncio
import boto3
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
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
    return [dict(r) for r in rows]


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
    return {**dict(video), "chapters": [dict(c) for c in chapters]}


@router.get("/{video_id}/transcript")
async def get_transcript(video_id: int):
    """Fetch transcript segments from Firestore."""
    print(f"[Videos] Fetching transcript for video_id={video_id}")
    try:
        # Use the shared lazy Firestore client (avoids re-initialization race)
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
