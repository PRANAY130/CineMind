import os
import ssl
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("UPSTASH_REDIS_URL", "redis://localhost:6379/0")

# Upstash uses rediss:// (TLS). Pass ssl_cert_reqs as the integer constant.
REDIS_SSL_OPTIONS = {}
if REDIS_URL.startswith("rediss://"):
    REDIS_SSL_OPTIONS = {"ssl_cert_reqs": ssl.CERT_NONE}

celery_app = Celery(
    "cinemind_worker",
    broker=REDIS_URL,
    # No result backend — pipeline status is tracked directly in NeonDB.
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    include=["workers.pipeline"],
    task_ignore_result=True,

    # ── Windows fix: prefork is broken on Windows, use solo pool ──────────
    worker_pool="solo",
    worker_prefetch_multiplier=1,

    # ── Upstash Redis TLS / timeout settings ──────────────────────────────
    broker_use_ssl=REDIS_SSL_OPTIONS,
    broker_transport_options={
        "visibility_timeout": 3600,      # 1 hour — longer than any task
        "socket_timeout": 30,
        "socket_connect_timeout": 30,
        "retry_on_timeout": True,
        "max_retries": 5,
    },

    # ── Reliability settings ───────────────────────────────────────────────
    task_acks_late=True,                 # Ack only after task completes
    task_reject_on_worker_lost=True,     # Re-queue if worker dies mid-task
)
