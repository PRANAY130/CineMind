import os
import re
import asyncpg
from dotenv import load_dotenv

load_dotenv()

_RAW_URL = os.getenv("NEON_DB_URL", "")

def _clean_asyncpg_dsn(dsn: str) -> str:
    """
    asyncpg does NOT support 'channel_binding' (libpq-only flag).
    Strip it before passing the DSN to asyncpg.
    """
    # Remove channel_binding=... as a query param
    dsn = re.sub(r"[&?]channel_binding=[^&]*", "", dsn)
    # Clean up a trailing ? or & left after removal
    dsn = re.sub(r"[?&]$", "", dsn)
    return dsn

NEON_DB_URL = _clean_asyncpg_dsn(_RAW_URL)

_pool = None

async def get_db_pool() -> asyncpg.Pool:
    global _pool
    if not NEON_DB_URL:
        raise ValueError("NEON_DB_URL is not set in environment")
    if _pool is None:
        print(f"[DB] Creating asyncpg connection pool...")
        _pool = await asyncpg.create_pool(dsn=NEON_DB_URL, min_size=1, max_size=5)
        print(f"[DB] Pool created successfully")
    return _pool

async def init_db():
    pool = await get_db_pool()
    print("[DB] Running schema migrations...")
    async with pool.acquire() as conn:
        # Neon Auth manages the 'user' table externally.
        # user_id is TEXT to match Neon Auth's UUID-based IDs.
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS videos (
                id SERIAL PRIMARY KEY,
                user_id TEXT,
                title VARCHAR(255),
                r2_url TEXT,
                duration_sec INTEGER,
                status VARCHAR(50) DEFAULT 'processing',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id SERIAL PRIMARY KEY,
                video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
                step VARCHAR(100),
                progress_pct INTEGER DEFAULT 0,
                error TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS chapters (
                id SERIAL PRIMARY KEY,
                video_id INTEGER REFERENCES videos(id) ON DELETE CASCADE,
                title VARCHAR(255),
                summary TEXT,
                start_time INTEGER,
                end_time INTEGER,
                order_index INTEGER
            )
        """)
    print("[DB] Schema ready ✓")
