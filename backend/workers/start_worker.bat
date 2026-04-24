@echo off
:: ─────────────────────────────────────────────────────────────────────────────
:: CineMind — Start Celery Worker (Windows)
:: Run this from the backend\ directory with the venv activated:
::   .venv\Scripts\activate
::   workers\start_worker.bat
:: ─────────────────────────────────────────────────────────────────────────────
echo [CineMind] Starting Celery worker (solo pool for Windows)...
echo [CineMind] Worker will process video pipeline tasks.
echo [CineMind] Press Ctrl+C to stop.
echo.

cd /d %~dp0\..

.venv\Scripts\celery -A workers.celery_app worker --pool=solo --loglevel=info --concurrency=1
