# CineMind — Full Codebase Review

> Comprehensive audit of every layer: Backend (FastAPI + Celery), Frontend (Next.js), DB, infra, and integration.

---

## 🔴 CRITICAL BUGS (Will Break The App)

### 1. `get_db_pool()` creates a NEW pool on every call — and then immediately closes it

**Files:** `backend/db/postgres.py`, `backend/routers/videos.py`, `backend/routers/auth.py`

```python
# postgres.py
async def get_db_pool():
    return await asyncpg.create_pool(dsn=NEON_DB_URL)  # new pool every time!

# videos.py
pool = await get_db_pool()
async with pool.acquire() as conn:
    ...
await pool.close()   # ← kills the pool right after use
```

**Why this is bad:**
- Every single API request opens a fresh TCP connection pool to Neon, uses one connection, then tears down the whole pool.
- This is **extremely slow** (500–2000ms overhead per request), can exhaust Neon's free-tier connection limit quickly, and will cause `pool closed` errors under any concurrent load.
- The pool is also closed BEFORE returning in `auth.py`'s `get_current_user`, which means if auth is called in rapid succession it will fail.

**Fix:** Use a single global/app-lifespan pool, not a new one each time.

```python
# postgres.py — correct pattern
_pool = None

async def get_db_pool():
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(dsn=NEON_DB_URL, min_size=1, max_size=5)
    return _pool

# Remove all `await pool.close()` calls from routers
```

---

### 2. Celery task uses `asyncio` inside a sync Celery worker — BROKEN on Windows

**File:** `backend/workers/pipeline.py`

```python
@celery_app.task(bind=True, ignore_result=True)
def run_video_pipeline(self, video_id: int, r2_url: str):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    ...
    return loop.run_until_complete(run())
```

**Why this is broken:**
- Celery workers on Windows use the `solo` pool by default (not `prefork`), and Windows **does not support `asyncio` subprocesses** reliably in the same way Linux does.
- More critically: `asyncio.set_event_loop(loop)` is not thread-safe. If Celery ever runs more than one task (which it does), multiple tasks fight over the same event loop setting.
- Also `asyncpg` requires a running event loop — creating a fresh one each task invocation is fragile and will cause `Event loop is closed` errors mid-pipeline.

**Fix (2 options):**
1. **Best:** Refactor the pipeline to be fully synchronous using `psycopg2` instead of `asyncpg` (Celery is sync, keep it sync).
2. **Alternative:** Use `celery -P solo` and be aware of the Windows limitation, or deploy to Linux (Docker).

---

### 3. Firebase Admin SDK initialized inside Celery task with no working directory awareness

**File:** `backend/workers/pipeline.py` (lines 126–129)

```python
cert_path = os.getenv("FIREBASE_CERT_PATH", "firebase-adminsdk.json")
if not firebase_admin._apps:
    cred = credentials.Certificate(cert_path)
    firebase_admin.initialize_app(cred)
```

**Why this fails:**
- `FIREBASE_CERT_PATH` is set to just `"firebase-adminsdk.json"` — a **relative path**.
- When Celery starts the worker, its **current working directory** is NOT guaranteed to be `backend/`. On Windows especially, it might be the project root or wherever you launched the command.
- This causes a `FileNotFoundError` crash in Step 4 of the pipeline, which silently marks the video as partially processed.

**Fix:** Use an absolute path:
```python
cert_path = os.path.join(os.path.dirname(__file__), '..', 'firebase-adminsdk.json')
```

---

### 4. The `r2_key` parsing is fragile and will produce wrong keys

**File:** `backend/workers/pipeline.py` (line 63)

```python
r2_key = r2_url.split(f"{BUCKET}/")[-1]
```

- `r2_url` is constructed as: `{CLOUDFLARE_R2_ENDPOINT}/{bucket}/{r2_key}`
- `CLOUDFLARE_R2_ENDPOINT` = `https://13a0fdfae869bfdc57760bbe827d047a.r2.cloudflarestorage.com`
- So `r2_url` = `https://13a0fdfae869bfdc57760bbe827d047a.r2.cloudflarestorage.com/videoanalyser/videos/user/uuid.mp4`

The `split(f"{BUCKET}/")[-1]` works ONLY if the bucket name appears **exactly once** in the URL. If the user's ID or filename contains "videoanalyser", it will produce an incorrect key and the download will fail with a 404 from R2.

**Fix:** Parse more robustly:
```python
from urllib.parse import urlparse
parsed = urlparse(r2_url)
r2_key = parsed.path.lstrip('/').split('/', 1)[1]  # strips bucket name prefix
```

---

### 5. `await pool.close()` after `async with pool.acquire()` in videos router

**File:** `backend/routers/videos.py` (lines 53, 70, 83)

Closing the pool immediately after use means the connection is technically returned to the pool and then the pool is destroyed. Under concurrent requests this causes `ConnectionDoesNotExist` errors. (Same root cause as Bug #1, but highlighted separately because it appears 3 times in this file alone.)

---

## 🟠 MAJOR ISSUES (Pipeline Won't Work Correctly)

### 6. WebSocket progress tracking is completely non-functional

**Files:** `backend/main.py`, `backend/workers/pipeline.py`, `frontend/lib/api.ts`

The pipeline sends state updates like:
```python
self.update_state(state='PROGRESS', meta={'step': '...', 'progress_pct': 5})
```

But `self.update_state()` writes to the **Celery result backend** — which is **disabled**:
```python
# celery_app.py
celery_app = Celery(
    "cinemind_worker",
    broker=REDIS_URL,
    # No result backend — ...
)
```

And the WebSocket in `main.py` just sits there waiting for `data = await websocket.receive_text()` and **never sends anything to the client**. The `active_connections` dict is populated but the pipeline never writes to it.

**Result:** The frontend WebSocket connects, nothing ever arrives, and the progress bar never updates.

**Fix:** Either:
- Add a result backend AND have the frontend poll for status, OR
- Have the pipeline look up the WebSocket connection from `active_connections` and send updates directly (but this crosses process boundaries — Celery worker ≠ FastAPI process), OR
- Best: Write progress to the DB `jobs` table and have the frontend poll `/videos/{id}` status.

---

### 7. Transcript is stored as Firestore segments using dict access on `Segment` objects

**File:** `backend/workers/pipeline.py` (lines 134–137)

```python
"segments": [
    {"start": s.get("start", 0), "end": s.get("end", 0), "text": s.get("text", "")}
    for s in (segments if isinstance(segments, list) else [])
]
```

Groq's `verbose_json` response returns `segments` as a list of **Pydantic-like objects**, NOT plain dicts. Calling `.get()` on them will raise `AttributeError`.

**Fix:**
```python
{"start": getattr(s, "start", 0), "end": getattr(s, "end", 0), "text": getattr(s, "text", "")}
```
Or convert: `s.model_dump()` if it's a Pydantic model.

---

### 8. LLM JSON parsing is incomplete for chapter extraction

**File:** `backend/workers/pipeline.py` (lines 170–173)

```python
if raw.startswith("```"):
    raw = "\n".join(raw.split("\n")[1:])
    raw = raw.rsplit("```", 1)[0]
chapters = json.loads(raw)
```

- Only handles triple-backtick wrapping, but Groq often returns ` ```json\n[...]\n``` ` — meaning the first line is ```` ```json ```` not ```` ``` ````. The current code strips `` ` ```json `` as the first line correctly, but if the model adds extra whitespace or different markdown, `json.loads` will throw a `JSONDecodeError`.
- There's no validation that `chapters` is actually a `list`. If the model returns a `{}` object instead, the `for i, ch in enumerate(chapters)` will fail.

**Fix:** Wrap in try/except already done (good), but the fallback chapter uses `transcript_text[:300]` which may contain control characters that break DB inserts.

---

### 9. Video player in `VideoWorkspace.tsx` plays a hardcoded sample video

**File:** `frontend/components/cine-mind/VideoWorkspace.tsx` (line 114)

```tsx
src="https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
```

The actual uploaded video's R2 URL is never used! Users will always see Big Buck Bunny instead of their own video. The `video` prop has `id`, `title`, `thumbnail`, `duration` but **no `r2_url`** field is passed down.

**Fix:** Pass `r2_url` through from the backend response and use it:
```tsx
src={video.r2_url}
```
But note: R2 URLs need to either be public or have presigned URLs generated. Public access may need to be enabled on the R2 bucket.

---

### 10. The Transcript and Chapters tabs show hardcoded mock data forever

**File:** `frontend/components/cine-mind/VideoWorkspace.tsx` (lines 249–293)

Both the Transcript and Chapters tabs show static placeholder data. There is no API call to fetch the real transcript from Firestore or chapters from NeonDB for the selected video. Even when the pipeline completes, users will see the same fake content.

**Fix:** Add a `useEffect` on `video.id` to call `fetchVideo(video.id)` and display real chapters; add a separate Firestore fetch for the transcript.

---

## 🟡 MODERATE ISSUES

### 11. `auth.py` — `expiresAt` timezone comparison may fail

**File:** `backend/routers/auth.py` (line 49)

```python
if row["expiresAt"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
```

`asyncpg` returns `datetime` objects. If the DB stores `expiresAt` **with** timezone info already, calling `.replace(tzinfo=timezone.utc)` will **overwrite** it, potentially making the comparison incorrect (especially if Better Auth stores it in a non-UTC zone). Should use `.astimezone(timezone.utc)` instead.

---

### 12. `storage.py` service has no `region_name`

**File:** `backend/services/storage.py`

The `get_s3_client()` in `storage.py` does not set `region_name="auto"`, unlike the duplicate `get_r2_client()` in `pipeline.py` and `videos.py`. This is an inconsistency — but `storage.py` is never actually used anywhere in the pipeline, so it's dead code for now.

---

### 13. `yt-dlp` is in `requirements.txt` but never imported or used

**File:** `backend/requirements.txt` line 13

`yt-dlp>=2024.8.6` is listed as a dependency but there's no code that uses it. This unnecessarily bloats the Docker image by ~50MB. Remove until YouTube URL upload is implemented.

---

### 14. `chromadb` is imported but never populated

**File:** `backend/db/chroma_db.py`, `backend/routers/chat.py`

ChromaDB collection is set up, but nothing ever writes embeddings to it (embedding.py is a stub with `# TODO`). The chat endpoint returns a hardcoded `"Mock answer"`. This entire RAG pipeline is not implemented yet.

---

### 15. `connectProgressSocket` in frontend uses wrong URL for HTTPS backend

**File:** `frontend/lib/api.ts` (line 80)

```ts
const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/ws/progress/${videoId}`
```

If `BACKEND_URL = "https://..."`, this becomes `"wss://..."` — ✓ correct.
But if someone accidentally sets `BACKEND_URL = "https://api.example.com"` and the backend is HTTP-only, it'll silently fail. A safer approach would be explicit `wss://` vs `ws://` logic. Minor issue, but worth noting.

---

### 16. Dashboard never auto-refreshes while a video is `processing`

**File:** `frontend/components/cine-mind/Dashboard.tsx`

After uploading, videos with `status: 'processing'` are shown in the grid but there is no polling or WebSocket update. The status badge will stay "Processing" forever until the user manually refreshes the page, even after the pipeline completes.

**Fix:** Add a `setInterval` to re-fetch videos every 5 seconds while any video has `status === 'processing'`.

---

### 17. Video cards are NOT clickable when status is `processing`

**File:** `frontend/components/cine-mind/Dashboard.tsx` (line 177)

```tsx
onClick={() => video.status === 'ready' && onSelectVideo(video)}
```

This is intentional but the UX gives no feedback — there's no tooltip, disabled cursor, or "still processing" message when you click a processing video. Users will think clicking is broken.

---

## 🔵 INFRASTRUCTURE / DEPLOYMENT ISSUES

### 18. Dockerfile has no `CMD` — cannot be deployed as-is

**File:** `backend/Dockerfile`

```dockerfile
EXPOSE 8000
# ← No CMD or ENTRYPOINT!
```

The Dockerfile exposes port 8000 but has no startup command. `render.yaml` works around this with `dockerCommand`, but if you try to `docker run` the image directly or use any other platform (Railway, Fly.io, etc.), it will fail with "no command specified".

**Fix:** Add:
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### 19. Render worker has no `disk` mount — ChromaDB data is ephemeral

**File:** `backend/render.yaml`

The `cinemind-worker` service has no `disk` configuration, but the Celery pipeline writes to `./chroma_data`. On every worker restart, all ChromaDB vector data will be lost. The API web service has the disk mount, but the worker does not.

---

### 20. Free Render plan for Celery worker will cause cold-start delays

**File:** `backend/render.yaml`

```yaml
- type: worker
  plan: free
```

Free plan workers on Render sleep after 15 minutes of inactivity and can take 30–60 seconds to wake up. A video upload will trigger `run_video_pipeline.delay(...)`, but the task will sit in the Redis queue until the worker wakes up — giving the appearance that "nothing is happening."

---

## 📋 SUMMARY TABLE

| # | Severity | Area | Issue |
|---|----------|------|-------|
| 1 | 🔴 Critical | Backend/DB | New pool created + closed on every request |
| 2 | 🔴 Critical | Celery/Windows | `asyncio` in sync Celery task breaks on Windows |
| 3 | 🔴 Critical | Celery/Firebase | Relative path for firebase cert fails in worker |
| 4 | 🔴 Critical | Pipeline | Fragile R2 key parsing causes wrong download key |
| 5 | 🔴 Critical | Backend/DB | Pool closed immediately after use (videos router) |
| 6 | 🟠 Major | WebSocket | Progress tracking completely broken (disabled result backend) |
| 7 | 🟠 Major | Pipeline | `.get()` on Pydantic objects causes AttributeError |
| 8 | 🟠 Major | Pipeline | LLM JSON chapter parsing too fragile |
| 9 | 🟠 Major | Frontend | Video player shows Big Buck Bunny, not user's video |
| 10 | 🟠 Major | Frontend | Transcript/Chapters are hardcoded mock data |
| 11 | 🟡 Moderate | Auth | Timezone comparison on expiresAt may be wrong |
| 12 | 🟡 Moderate | Services | `storage.py` has no region_name, is dead code |
| 13 | 🟡 Moderate | Deps | `yt-dlp` unused, bloats Docker image |
| 14 | 🟡 Moderate | Chat | Entire RAG pipeline is unimplemented (stubs) |
| 15 | 🟡 Moderate | Frontend | WebSocket URL replacement is fragile |
| 16 | 🟡 Moderate | Frontend | Dashboard never auto-refreshes processing status |
| 17 | 🟡 Moderate | UX | No feedback when clicking a processing video card |
| 18 | 🔵 Infra | Docker | No CMD in Dockerfile |
| 19 | 🔵 Infra | Render | Worker has no disk mount, ChromaDB data lost on restart |
| 20 | 🔵 Infra | Render | Free plan worker cold starts cause long apparent delays |

---

## ✅ What IS Working

- **Auth flow** (Better Auth + NeonDB session lookup) — logic is correct.
- **Video upload to R2** — the `put_object` call is correct.
- **DB schema creation** — `init_db()` correctly creates all 3 tables on startup.
- **Celery broker connection** — SSL setup for Upstash Redis is correctly handled.
- **Chapter generation prompt** — the LLaMA 3 prompt is well-written.
- **UI/design** — the frontend looks great and the component structure is clean.
- **Deployment config** — `render.yaml` has the right service types and commands.
