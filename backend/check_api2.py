import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db.firestore import get_firestore_client
from dotenv import load_dotenv

load_dotenv()

def run():
    fs_db = get_firestore_client()
    videos = list(fs_db.collection_group("videos").limit(3).stream())
    for v in videos:
        if v.id == "19":
            doc = v.reference.get()
            d = doc.to_dict()
            emotion_data = d.get("emotions", {}).get("emotion_data", [])
            print(f"Video 19 length: {len(emotion_data)}")
            for item in emotion_data:
                print(item)

if __name__ == "__main__":
    run()
