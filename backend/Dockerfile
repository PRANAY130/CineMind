FROM python:3.11

WORKDIR /app

# Install system dependencies
# ffmpeg: required for audio chunking in the pipeline
# nodejs: required as a JS runtime for yt-dlp to decrypt YouTube signatures
RUN apt-get update && apt-get install -y \
    ffmpeg \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install -U yt-dlp

# Copy application code
COPY . .

# Make the startup script executable
RUN chmod +x start.sh

EXPOSE 8000

# Start both FastAPI + Celery Worker in one container
CMD ["./start.sh"]
