import os
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cert_path = os.getenv("FIREBASE_CERT_PATH", "firebase-adminsdk.json")
    if os.path.exists(cert_path):
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred)

def get_firestore_client():
    if not firebase_admin._apps:
        return None
    return firestore.client()
