import os
import chromadb

CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_data")

def get_chroma_client():
    return chromadb.PersistentClient(path=CHROMA_DB_DIR)

def get_video_chunks_collection():
    client = get_chroma_client()
    return client.get_or_create_collection(
        name="video_chunks",
        metadata={"hnsw:space": "cosine"}
    )
