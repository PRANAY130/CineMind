import os
from groq import Groq

# Ensure GROQ_API_KEY is available in env
def get_groq_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

def transcribe_audio_whisper(audio_file_path: str):
    """
    Use Groq's whisper-large-v3 model for extreme speed transcription.
    """
    client = get_groq_client()
    with open(audio_file_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
          file=(audio_file_path, file.read()),
          model="whisper-large-v3",
          response_format="verbose_json"
        )
    return transcription

def generate_chat_response(messages: list):
    """
    Use Groq's LLaMA 3 70B for RAG chat.
    """
    client = get_groq_client()
    chat_completion = client.chat.completions.create(
        messages=messages,
        model="llama-3.3-70b-versatile"
    )
    return chat_completion.choices[0].message.content
