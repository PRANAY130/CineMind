import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

NEON_DB_URL = os.getenv("NEON_DB_URL")

async def get_db_pool():
    if not NEON_DB_URL:
        raise ValueError("NEON_DB_URL is not set")
    return await asyncpg.create_pool(dsn=NEON_DB_URL)

async def init_db():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Neon Auth automatically provisions the users table.
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS videos (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                title VARCHAR(255),
                r2_url TEXT,
                duration_sec INTEGER,
                status VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS jobs (
                id SERIAL PRIMARY KEY,
                video_id INTEGER REFERENCES videos(id),
                step VARCHAR(100),
                progress_pct INTEGER,
                error TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS chapters (
                id SERIAL PRIMARY KEY,
                video_id INTEGER REFERENCES videos(id),
                title VARCHAR(255),
                summary TEXT,
                start_time INTEGER,
                end_time INTEGER,
                order_index INTEGER
            )
        ''')
    await pool.close()
