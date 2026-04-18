import os
import urllib.request
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk
from jose.utils import base64url_decode

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

NEON_JWKS_URL = os.getenv("NEON_JWKS_URL")

def get_public_key(token: str):
    if not NEON_JWKS_URL:
        raise HTTPException(status_code=500, detail="NEON_JWKS_URL environment variable is missing")
    
    # Fetch public keys from Neon Auth
    with urllib.request.urlopen(NEON_JWKS_URL) as response:
        jwks = json.loads(response.read().decode())
        
    # Get the key ID from the header
    unverified_header = jwt.get_unverified_header(token)
    rsa_key = {}
    for key in jwks["keys"]:
        if key["kid"] == unverified_header["kid"]:
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"]
            }
            break
            
    if rsa_key:
        return rsa_key
    raise HTTPException(status_code=401, detail="Unable to find appropriate key")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Dependency to verify the Neon Auth JWT token.
    Extracts the Bearer token, fetches your Neon project's public key,
    verifies the signature, and returns the User ID payload.
    """
    token = credentials.credentials
    try:
        rsa_key = get_public_key(token)
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            options={"verify_aud": False} # Adjust audience tracking depending on your Neon Auth setup
        )
        # payload['sub'] is the external ID of our Neon Auth user
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token Expired")
    except jwt.JWTClaimsError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect Claims Check Audience/Issuer")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.get("/me")
async def verify_login_state(user: dict = Depends(get_current_user)):
    return {"status": "authenticated", "user_id": user.get("sub")}
