import os
import boto3
from botocore.config import Config

R2_ENDPOINT = os.getenv("CLOUDFLARE_R2_ENDPOINT")
R2_ACCESS_KEY = os.getenv("CLOUDFLARE_R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("CLOUDFLARE_R2_SECRET_KEY")
R2_BUCKET = os.getenv("CLOUDFLARE_R2_BUCKET")

def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        config=Config(signature_version='s3v4')
    )

def upload_video_to_r2(file_path: str, object_name: str) -> str:
    s3 = get_s3_client()
    s3.upload_file(file_path, R2_BUCKET, object_name)
    return f"{R2_ENDPOINT}/{R2_BUCKET}/{object_name}"
