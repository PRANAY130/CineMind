import os
import asyncio
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    video_id: int
    query: str


@router.post("/")
async def chat_with_video(request: ChatRequest):
    """
    RAG-powered chat endpoint:
      1. Embed the user's query via HuggingFace API
      2. Retrieve the top-5 most relevant transcript chunks from ChromaDB
      3. Pass chunks as context to Groq LLaMA 3 for a grounded answer
      4. Return the answer + video timestamps for referenced segments
    """
    from groq import Groq
    from services.embedding import generate_embeddings
    from db.chroma_db import get_video_chunks_collection

    video_id = request.video_id
    query = request.query
    print(f"[Chat] RAG query  video_id={video_id}  query='{query}'")

    # ── Step 1: Embed the query ────────────────────────────────────────────
    query_embedding = await asyncio.to_thread(generate_embeddings, query)
    if not query_embedding:
        print("[Chat] ⚠  Embedding failed — returning error message")
        return {
            "answer": "I'm having trouble with the AI engine right now. Please try again in a moment.",
            "timestamps": [],
        }

    # ── Step 2: ChromaDB similarity search ────────────────────────────────
    context_texts = []
    timestamps = []
    try:
        collection = get_video_chunks_collection()
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=5,
            where={"video_id": video_id},
        )
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        print(f"[Chat] ChromaDB returned {len(docs)} chunks")

        for doc, meta in zip(docs, metas):
            context_texts.append(doc)
            start_sec = meta.get("start", 0)
            if start_sec:
                m, s = divmod(int(start_sec), 60)
                timestamps.append(f"{m:02d}:{s:02d}")
    except Exception as e:
        print(f"[Chat] ChromaDB search error: {e}")

    # ── Step 3: Build prompt & call Groq LLaMA 3 ─────────────────────────
    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    if context_texts:
        context_block = "\n\n".join(
            f"[Segment {i+1}]:\n{chunk}" for i, chunk in enumerate(context_texts)
        )
        system_msg = (
            "You are CineMind, an intelligent video analysis assistant. "
            "Answer the user's question using ONLY the transcript segments below. "
            "Be concise and specific. If you reference a moment in the video, "
            "mention the approximate timestamp."
        )
        user_msg = f"Transcript segments:\n\n{context_block}\n\nQuestion: {query}"
    else:
        # No indexed chunks yet (video may still be processing)
        print("[Chat] No chunks found in ChromaDB — answering without context")
        system_msg = (
            "You are CineMind, an intelligent video analysis assistant. "
            "The video transcript is still being processed or unavailable. "
            "Let the user know politely and suggest waiting a moment."
        )
        user_msg = query

    try:
        def _call_groq():
            return groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user",   "content": user_msg},
                ],
                temperature=0.4,
                max_tokens=512,
            )

        response = await asyncio.to_thread(_call_groq)
        answer = response.choices[0].message.content
        print(f"[Chat] Groq answered: {len(answer)} chars, {len(timestamps)} timestamps")
        return {"answer": answer, "timestamps": timestamps}

    except Exception as e:
        print(f"[Chat] Groq API error: {e}")
        return {"answer": f"I encountered an error communicating with the AI: {str(e)}", "timestamps": []}
