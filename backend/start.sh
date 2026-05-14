#!/bin/bash
# CineMind All-in-One Startup Script
# Runs both the FastAPI web server and the Celery worker in the same container.

set -e

echo "[start.sh] Starting CineMind backend..."

# Start Celery worker in the background
echo "[start.sh] Launching Celery worker..."
celery -A workers.celery_app worker --loglevel=info --concurrency=1 &

CELERY_PID=$!
echo "[start.sh] Celery worker PID: $CELERY_PID"

# Start FastAPI in the foreground (keeps the container alive)
echo "[start.sh] Launching FastAPI on port ${PORT:-8000}..."
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
