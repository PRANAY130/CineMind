from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    video_id: int
    query: str

@router.post("/")
async def chat_with_video(request: ChatRequest):
    # TODO: Encode query with Sentence-BERT
    # TODO: Search ChromaDB for relevant chunks
    # TODO: Pass context to Groq (Llama 3)
    # TODO: Return Groq response + timestamps
    return {"answer": "Mock answer", "timestamps": []}
