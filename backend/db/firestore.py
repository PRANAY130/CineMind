import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore

_initialized = False

def _init_firebase() -> bool:
    """
    Lazily initialize Firebase Admin SDK on first use.

    Supports two modes (checked in order):
    1. FIREBASE_CERT_JSON env var: base64-encoded JSON — used in production (Render).
    2. FIREBASE_CERT_PATH env var: path to a local JSON file — used in local dev.
    """
    global _initialized
    if _initialized:
        return True
    if firebase_admin._apps:
        _initialized = True
        return True

    # --- Mode 1: base64-encoded JSON in env var (production) ---
    cert_json_b64 = os.getenv("FIREBASE_CERT_JSON")
    if cert_json_b64:
        try:
            cert_dict = json.loads(base64.b64decode(cert_json_b64).decode("utf-8"))
            cred = credentials.Certificate(cert_dict)
            firebase_admin.initialize_app(cred)
            _initialized = True
            print("[Firestore] Firebase Admin SDK initialized from FIREBASE_CERT_JSON env var ✓")
            return True
        except Exception as e:
            print(f"[Firestore] Failed to init from FIREBASE_CERT_JSON: {e}")
            return False

    # --- Mode 2: local file path (local development) ---
    cert_path = os.getenv("FIREBASE_CERT_PATH", "firebase-adminsdk.json")

    # Resolve relative path to the backend root directory
    if not os.path.isabs(cert_path):
        backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cert_path = os.path.join(backend_root, cert_path)

    if not os.path.exists(cert_path):
        print(f"[Firestore] WARNING: cert file not found at '{cert_path}' and FIREBASE_CERT_JSON not set")
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
