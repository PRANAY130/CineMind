from fastapi import APIRouter, UploadFile, File, BackgroundTasks

router = APIRouter(prefix="/videos", tags=["videos"])

@router.post("/upload")
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # TODO: Upload to Cloudflare R2
    # TODO: Create NeonDB record
    # TODO: Dispatch Celery task for pipeline
    return {"message": "Video uploaded, processing started", "video_id": 1}

@router.get("/")
async def list_videos():
    # TODO: Fetch from NeonDB
    return []

@router.get("/{video_id}")
async def get_video(video_id: int):
    # TODO: Fetch video details from NeonDB and chapters
    return {"id": video_id}
