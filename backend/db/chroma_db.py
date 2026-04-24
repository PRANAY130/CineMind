import os
import chromadb

def _get_chroma_dir() -> str:
    """
    Always resolve ChromaDB path to an absolute directory.
    Relative paths break when Celery changes the working directory.
    """
    raw = os.getenv("CHROMA_DB_DIR", "./chroma_data")
    if os.path.isabs(raw):
        return raw
    # Resolve relative to the backend root (parent of db/ directory)
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    resolved = os.path.join(backend_root, raw.lstrip("./").lstrip(".\\"))
    return resolved

def get_chroma_client() -> chromadb.PersistentClient:
    chroma_dir = _get_chroma_dir()
    os.makedirs(chroma_dir, exist_ok=True)
    print(f"[ChromaDB] Using persistent store at: {chroma_dir}")
    return chromadb.PersistentClient(path=chroma_dir)

def get_video_chunks_collection():
    """
    Returns the ChromaDB collection used for RAG search over video transcripts.
    Includes a 'video_id' metadata field for per-video filtering.
    """
    client = get_chroma_client()
    collection = client.get_or_create_collection(
        name="video_chunks",
        metadata={"hnsw:space": "cosine"},
    )
    print(f"[ChromaDB] Collection 'video_chunks' ready")
    return collection
