import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db.firestore import get_firestore_client
from dotenv import load_dotenv

load_dotenv()

def run():
    fs_db = get_firestore_client()
    if not fs_db: return

    videos = list(fs_db.collection_group("videos").limit(1).stream())
    if not videos:
        print("No videos found")
        return
        
    doc = videos[0]
    data = doc.to_dict()
    print(f"Data keys: {list(data.keys())}")
    
    if "emotions" in data:
        print("'emotions' is in data")
        emotions_map = data.get("emotions", {})
        emotion_data = emotions_map.get("emotion_data", [])
        print(f"Length of emotion_data: {len(emotion_data)}")
    else:
        print("'emotions' is NOT in data")

if __name__ == "__main__":
    run()
