import os
import boto3
from botocore.exceptions import ClientError

_jwt_secret: str | None = None


def get_jwt_secret() -> str:
    """
    Returns the JWT signing secret.
    Resolution order:
      1. In-process cache (after first load)
      2. JWT_SECRET environment variable (local dev / App Runner direct injection)
      3. AWS Secrets Manager (secret name from JWT_SECRET_NAME env var)
    """
    global _jwt_secret
    if _jwt_secret:
        return _jwt_secret

    secret = os.getenv("JWT_SECRET")
    if secret:
        _jwt_secret = secret
        return _jwt_secret

    secret_name = os.getenv("JWT_SECRET_NAME", "decide/dev/JWT_SECRET")
    region = os.getenv("AWS_REGION", "eu-central-1")
    try:
        client = boto3.client("secretsmanager", region_name=region)
        response = client.get_secret_value(SecretId=secret_name)
        _jwt_secret = response["SecretString"]
    except ClientError as e:
        raise RuntimeError(
            f"Could not load JWT_SECRET from Secrets Manager ({secret_name}): {e}"
        )

    return _jwt_secret
