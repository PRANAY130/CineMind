from dotenv import load_dotenv
load_dotenv()  # Must be FIRST — populates env before any module reads os.getenv()

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, videos, chat
from db.postgres import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Replaces deprecated @app.on_event('startup')."""
    print("[CineMind] Starting up API server...")
    try:
        await init_db()
    except Exception as e:
        print(f"[CineMind] WARNING: DB init failed (non-fatal): {e}")
    yield
    print("[CineMind] Shutting down...")


app = FastAPI(title="CineMind API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://cine-mind-inky.vercel.app",  # Production frontend
        "http://localhost:3000",               # Local development
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(chat.router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "CineMind API is running"}


# ── WebSocket: Live pipeline progress ────────────────────────────────────────

active_connections: dict[int, WebSocket] = {}


@app.websocket("/ws/progress/{video_id}")
async def websocket_endpoint(websocket: WebSocket, video_id: int):
    await websocket.accept()
    active_connections[video_id] = websocket
    print(f"[WebSocket] Client connected for video_id={video_id}")

    from db.postgres import get_db_pool
    try:
        pool = await get_db_pool()
        while True:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT step, progress_pct
                       FROM jobs
                       WHERE video_id = $1
                       ORDER BY updated_at DESC LIMIT 1""",
                    video_id,
                )

            if row:
                data = {"step": row["step"], "progress_pct": row["progress_pct"]}
                await websocket.send_json(data)
                print(f"[WebSocket] video={video_id} → {data}")

                # FIX: break out when done instead of looping forever
                if row["progress_pct"] >= 100:
                    print(f"[WebSocket] Pipeline complete for video {video_id}. Closing socket gracefully.")
                    await websocket.close()
                    break

            await asyncio.sleep(2)

    except WebSocketDisconnect:
        print(f"[WebSocket] Client disconnected for video_id={video_id}")
    except Exception as e:
        print(f"[WebSocket] Unexpected error for video_id={video_id}: {e}")
    finally:
        active_connections.pop(video_id, None)
