import os
import ssl
from celery import Celery
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("UPSTASH_REDIS_URL", "redis://localhost:6379/0")

# Upstash uses rediss:// (SSL). The redis library requires the actual
# ssl.CERT_NONE constant (integer), not the string "CERT_NONE".
REDIS_SSL_OPTIONS = {}
if REDIS_URL.startswith("rediss://"):
    REDIS_SSL_OPTIONS = {"ssl_cert_reqs": ssl.CERT_NONE}

celery_app = Celery(
    "cinemind_worker",
    broker=REDIS_URL,
    # No result backend — pipeline status is tracked in NeonDB directly.
    # Using Redis as both broker AND backend causes stale-data crashes on Upstash.
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    include=['workers.pipeline'],
    task_ignore_result=True,          # Don't store results in Redis
    broker_use_ssl=REDIS_SSL_OPTIONS,
)
