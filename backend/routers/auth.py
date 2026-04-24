import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.postgres import get_db_pool
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """
    Verifies the Better Auth session token sent as Bearer.
    Looks up the token in the NeonDB 'session' table and returns the user info.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )

    token = credentials.credentials

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        # Look up the session token in the Better Auth session table
        row = await conn.fetchrow(
            '''SELECT s."userId", s."expiresAt", u.name, u.email, u.image
               FROM session s
               JOIN "user" u ON u.id = s."userId"
               WHERE s.token = $1''',
            token
        )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )

    # Check expiry
    from datetime import datetime, timezone
    if row["expiresAt"].astimezone(timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired"
        )

    return {
        "sub": row["userId"],
        "id": row["userId"],
        "name": row["name"],
        "email": row["email"],
        "image": row["image"],
    }


@router.get("/me")
async def verify_login_state(user: dict = Depends(get_current_user)):
    return {"status": "authenticated", "user_id": user.get("sub"), "email": user.get("email")}
