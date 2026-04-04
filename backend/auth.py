from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, stored_hash: str | None) -> bool:
    if not stored_hash:
        return False
    try:
        return pwd_context.verify(plain_password, stored_hash)
    except Exception:
        return False


async def get_current_user():
    # JWT removed; kept only for compatibility with Depends(...)
    return None
