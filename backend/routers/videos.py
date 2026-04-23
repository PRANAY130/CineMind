import os
import uuid
import boto3
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from db.postgres import get_db_pool
from routers.auth import get_current_user
from workers.pipeline import run_video_pipeline
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/videos", tags=["videos"])

def get_r2_client():
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("CLOUDFLARE_R2_ENDPOINT"),
        aws_access_key_id=os.getenv("CLOUDFLARE_R2_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("CLOUDFLARE_R2_SECRET_KEY"),
        region_name="auto",
    )

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    user_id = user.get("sub") or user.get("id", "anonymous")
    bucket = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")

    # Generate unique key in R2
    file_ext = file.filename.split(".")[-1] if file.filename else "mp4"
    r2_key = f"videos/{user_id}/{uuid.uuid4()}.{file_ext}"

    # Upload to Cloudflare R2
    try:
        r2 = get_r2_client()
        contents = await file.read()
        r2.put_object(Bucket=bucket, Key=r2_key, Body=contents, ContentType=file.content_type)
        r2_url = f"{os.getenv('CLOUDFLARE_R2_ENDPOINT')}/{bucket}/{r2_key}"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"R2 upload failed: {str(e)}")

    # Create NeonDB record
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """INSERT INTO videos (user_id, title, r2_url, status)
               VALUES ($1, $2, $3, 'processing') RETURNING id""",
            user_id, file.filename or "Untitled", r2_url
        )
        video_id = row["id"]
    await pool.close()

    # Dispatch Celery pipeline task
    run_video_pipeline.delay(video_id, r2_url)

    return {"message": "Video uploaded, processing started", "video_id": video_id}


@router.get("/")
async def list_videos(user: dict = Depends(get_current_user)):
    user_id = user.get("sub") or user.get("id", "anonymous")
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM videos WHERE user_id = $1 ORDER BY created_at DESC",
            user_id
        )
    await pool.close()
    return [dict(r) for r in rows]


@router.get("/{video_id}")
async def get_video(video_id: int, user: dict = Depends(get_current_user)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        video = await conn.fetchrow("SELECT * FROM videos WHERE id = $1", video_id)
        chapters = await conn.fetch(
            "SELECT * FROM chapters WHERE video_id = $1 ORDER BY order_index",
            video_id
        )
    await pool.close()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return {**dict(video), "chapters": [dict(c) for c in chapters]}
