import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db.firestore import get_firestore_client
from dotenv import load_dotenv

load_dotenv()

def run():
    fs_db = get_firestore_client()
    if not fs_db: return

    videos = list(fs_db.collection_group("videos").limit(5).stream())
    
    for v in videos:
        data = v.to_dict()
        transcript = data.get("transcript", {})
        if "segments" in transcript:
            seg = transcript["segments"]
            if len(seg) > 0:
                print(f"Video {v.id}: last segment end = {seg[-1].get('end')}")

if __name__ == "__main__":
    run()
