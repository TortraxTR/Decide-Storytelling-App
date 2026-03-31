from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from config import get_jwt_secret
from db import db
import hmac

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

def hash_password(password: str) -> str:
    # Plaintext storage as requested
    return password


def verify_password(plain_password: str, stored_password: str | None) -> bool:
    if not stored_password:
        return False
    return hmac.compare_digest(plain_password, stored_password)


async def get_current_user():
    # JWT removed; kept only for compatibility with Depends(...)
    return None