import os
import boto3
from botocore.config import Config


def get_s3_client():
    """Build R2/S3 client — reads env vars inside the function, not at module level."""
    return boto3.client(
        "s3",
        endpoint_url=os.getenv("CLOUDFLARE_R2_ENDPOINT"),
        aws_access_key_id=os.getenv("CLOUDFLARE_R2_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("CLOUDFLARE_R2_SECRET_KEY"),
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def upload_video_to_r2(file_path: str, object_name: str) -> str:
    bucket = os.getenv("CLOUDFLARE_R2_BUCKET", "videoanalyser")
    endpoint = os.getenv("CLOUDFLARE_R2_ENDPOINT", "")
    s3 = get_s3_client()
    s3.upload_file(file_path, bucket, object_name)
    return f"{endpoint}/{bucket}/{object_name}"
