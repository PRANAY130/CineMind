from dotenv import load_dotenv
load_dotenv()  # Must be first — loads .env before any other module reads os.getenv()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, videos, chat
from db.postgres import init_db

app = FastAPI(title="CineMind API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(chat.router)

@app.on_event("startup")
async def on_startup():
    try:
        await init_db()
    except Exception as e:
        print(f"Warning: Failed to init DB: {e}")

@app.get("/")
async def root():
    return {"status": "ok", "message": "CineMind API is running"}

# Active WebSocket connections mapping video_id to connection
active_connections: dict[int, WebSocket] = {}

@app.websocket("/ws/progress/{video_id}")
async def websocket_endpoint(websocket: WebSocket, video_id: int):
    await websocket.accept()
    active_connections[video_id] = websocket
    from db.postgres import get_db_pool
    import asyncio
    
    try:
        pool = await get_db_pool()
        while True:
            async with pool.acquire() as conn:
                row = await conn.fetchrow("SELECT step, progress_pct FROM jobs WHERE video_id = $1 ORDER BY updated_at DESC LIMIT 1", video_id)
            if row:
                await websocket.send_json({"step": row["step"], "progress_pct": row["progress_pct"]})
                if row["progress_pct"] == 100:
                    while True:
                        await asyncio.sleep(10)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        if video_id in active_connections:
            del active_connections[video_id]
