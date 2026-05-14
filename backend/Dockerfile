FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
# ffmpeg: required for audio chunking in the pipeline
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Make the startup script executable
RUN chmod +x start.sh

EXPOSE 8000

# Start both FastAPI + Celery Worker in one container
CMD ["./start.sh"]
