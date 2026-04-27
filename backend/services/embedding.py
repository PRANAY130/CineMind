import os
import requests
import statistics
from typing import Optional

# HuggingFace Serverless Inference API (router) — no local model download needed
# The old api-inference.huggingface.co/pipeline/ endpoint was retired.
HF_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
HF_API_URL = (
    f"https://router.huggingface.co/hf-inference/models/{HF_MODEL}/pipeline/feature-extraction"
)


def generate_embeddings(text: str) -> Optional[list]:
    """
    Generate a 384-dimensional embedding vector via the HuggingFace Inference API.
    Uses all-MiniLM-L6-v2 (same model as local sentence-transformers) — no download needed.
    Returns None on failure so the caller can skip gracefully.
    """
    hf_api_key = os.getenv("HUGGINGFACE_API_KEY")
    if not hf_api_key:
        print("[Embedding] WARNING: HUGGINGFACE_API_KEY not set — skipping embedding")
        return None
    if not text or not text.strip():
        return None

    # HF API has a ~512-token input limit for this model
    truncated = text.strip()[:1500]

    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.post(
                HF_API_URL,
                headers={
                    "Authorization": f"Bearer {hf_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": [truncated],          # list input for feature-extraction
                    "options": {"wait_for_model": True},
                },
                timeout=90, # Increased timeout for cold boots
            )
            response.raise_for_status()
            result = response.json()
            break # Success, exit retry loop
        except requests.exceptions.Timeout:
            print(f"[Embedding] Timeout on attempt {attempt + 1}/{max_retries}")
            if attempt == max_retries - 1:
                return None
        except Exception as e:
            print(f"[Embedding] HuggingFace API error: {e}")
            return None

    # New router endpoint returns: [[float, float, ...]] for a single input
    # i.e. a list containing one embedding vector
    if isinstance(result, list) and result:
        first = result[0]
        if isinstance(first, float):
            # Already a flat embedding vector
            return result
        if isinstance(first, list):
            inner = first[0]
            if isinstance(inner, float):
                # [[float, ...]] — standard sentence embedding, take first
                return first
            if isinstance(inner, list):
                # [[[token_emb,...], ...]] — token-level, mean-pool
                dim = len(inner[0])
                return [statistics.mean(tok[i] for tok in inner) for i in range(dim)]
    
    print(f"[Embedding] Unexpected HF response shape: {type(result)}")
    return None

def chunk_text(full_text: str, segments: list = None) -> list:
    """
    Split transcript into overlapping ~300-word chunks for RAG indexing.
    If Whisper segments are provided, chunks align to segment boundaries
    so timestamps are accurate.
    """
    if segments:
        chunks = []
        current_texts = []
        current_start = segments[0].get("start", 0) if segments else 0
        current_words = 0

        for seg in segments:
            text = seg.get("text", "").strip()
            current_texts.append(text)
            current_words += len(text.split())

            if current_words >= 300:
                chunks.append({
                    "text": " ".join(current_texts),
                    "start": current_start,
                    "end": seg.get("end", 0),
                })
                # 50-word overlap: keep last segment for context
                current_texts = [text]
                current_words = len(text.split())
                current_start = seg.get("start", 0)

        if current_texts:
            chunks.append({
                "text": " ".join(current_texts),
                "start": current_start,
                "end": segments[-1].get("end", 0) if segments else 0,
            })
        return chunks

    # Fallback: plain word-based sliding window
    words = full_text.split()
    chunk_size, overlap = 300, 50
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk_words = words[i: i + chunk_size]
        chunks.append({"text": " ".join(chunk_words), "start": 0, "end": 0})

    return chunks or [{"text": full_text[:1500], "start": 0, "end": 0}]
