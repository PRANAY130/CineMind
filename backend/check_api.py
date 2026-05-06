import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db.firestore import get_firestore_client
from dotenv import load_dotenv

load_dotenv()

def run():
    fs_db = get_firestore_client()
    if not fs_db: return

    videos = list(fs_db.collection_group("videos").limit(3).stream())
    if not videos:
        print("No videos")
        return
        
    for v in videos:
        print(f"Latest video ID: {v.id}")
        
        # Let's find its parent user_id
        user_ref = v.reference.parent.parent
        user_id = user_ref.id
        print(f"User ID: {user_id}")
        
        # Mimic get_emotions logic
        doc = fs_db.collection("user").document(user_id).collection("videos").document(v.id).get()
        print(f"Doc exists: {doc.exists}")
        
        d = doc.to_dict()
        if "emotions" in d:
            emotions_map = d.get("emotions", {})
            emotion_data = emotions_map.get("emotion_data", [])
            print(f"Emotion data returned {len(emotion_data)} buckets")
            if len(emotion_data) > 0:
                print(emotion_data[0])
        else:
            print("No 'emotions' key in doc")

if __name__ == "__main__":
    run()
