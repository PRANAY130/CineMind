import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db.firestore import get_firestore_client
from dotenv import load_dotenv

load_dotenv()

def run():
    fs_db = get_firestore_client()
    user_id = "d71U1Jrj6VotowEYvBpik4miP2a5nVPC"
    video_id = "19"
    doc = fs_db.collection("user").document(user_id).collection("videos").document(video_id).get()
    if doc.exists:
        data = doc.to_dict()
        summary = data.get("summary", {})
        summary_content = summary.get("data", {})
        for lang, text in summary_content.items():
            print(f"--- {lang} ---")
            print(text)
            print("-" * 20)
    else:
        print("Doc not found")

if __name__ == "__main__":
    run()
