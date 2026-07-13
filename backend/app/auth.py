import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Cookie, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

ALGORITHM = "HS256"
# Falls back to a random per-process secret when JWT_SECRET is unset.
# Safe here because the database is reset on every server restart, so
# existing sessions becoming invalid on restart is already expected.
SECRET_KEY = os.getenv("JWT_SECRET") or secrets.token_hex(32)
ACCESS_TOKEN_EXPIRE_DAYS = 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


def _extract_user_id(token: str | None) -> int | None:
    if not token:
        return None
    user_id = decode_token(token)
    return int(user_id) if user_id else None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    access_token: str | None = Cookie(None),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials if credentials else None
    user_id = _extract_user_id(token)
    if user_id is None:
        user_id = _extract_user_id(access_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user
