import os
import firebase_admin
from firebase_admin import credentials, firestore

_initialized = False

def _init_firebase() -> bool:
    """
    Lazily initialize Firebase Admin SDK on first use.
    This is intentionally NOT called at module level so that load_dotenv()
    in main.py / pipeline.py runs first and populates FIREBASE_CERT_PATH.
    """
    global _initialized
    if _initialized:
        return True
    if firebase_admin._apps:
        _initialized = True
        return True

    cert_path = os.getenv("FIREBASE_CERT_PATH", "firebase-adminsdk.json")
    if not cert_path:
        print("[Firestore] WARNING: FIREBASE_CERT_PATH not set")
        return False

    # Resolve relative path to the backend root directory
    if not os.path.isabs(cert_path):
        backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cert_path = os.path.join(backend_root, cert_path)

    if not os.path.exists(cert_path):
        print(f"[Firestore] WARNING: cert file not found at '{cert_path}'")
        return False

    try:
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred)
        _initialized = True
        print(f"[Firestore] Firebase Admin SDK initialized from '{cert_path}' ✓")
        return True
    except Exception as e:
        print(f"[Firestore] Init error: {e}")
        return False


def get_firestore_client():
    """Return a Firestore client, or None if Firebase is unavailable."""
    if not _init_firebase():
        return None
    try:
        return firestore.client()
    except Exception as e:
        print(f"[Firestore] Failed to get client: {e}")
        return None
