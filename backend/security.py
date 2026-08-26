import os
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from backend.errors.exceptions import TokenGenerationError


SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM")
minutos = os.getenv("JWT_EXPIRE_MINUTES")

if (
    SECRET_KEY is None
    or SECRET_KEY.strip() == ""
    or ALGORITHM is None
    or ALGORITHM.strip() == ""
    or minutos is None
    or minutos.strip() == ""
):
    raise TokenGenerationError()

try:
    ACCESS_TOKEN_EXPIRE_MINUTES = int(minutos)
except ValueError as exc:
    raise TokenGenerationError() from exc

if ACCESS_TOKEN_EXPIRE_MINUTES <= 0:
    raise TokenGenerationError()


pwdContext = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verifyPassword(plainPassword: str, hashedPassword: str) -> bool:
    return pwdContext.verify(plainPassword, hashedPassword)


def getPasswordHash(password: str) -> str:
    return pwdContext.hash(password)


def createAccessToken(data: dict, expiresDelta: timedelta | None = None) -> str:
    dataCopy = data.copy()
    expire = datetime.now(timezone.utc) + (
        expiresDelta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    dataCopy.update({"exp": expire})
    return jwt.encode(dataCopy, SECRET_KEY, algorithm=ALGORITHM)


def decodeAccessToken(token: str) -> dict | None:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
    