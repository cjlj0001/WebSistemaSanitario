from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .repositories import userRepository
from .security import decodeAccessToken
from .database import SessionLocal

oauth2Scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

def getDb():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def getCurrentUser(token: str = Depends(oauth2Scheme), db: Session = Depends(getDb)):
    credentialsException = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autorizado",
    )

    payload = decodeAccessToken(token)
    if payload is None:
        raise credentialsException

    email = payload.get("sub")
    if not email:
        raise credentialsException

    user = userRepository.getUserByEmail(db, email=email)
    if user is None:
        raise credentialsException

    return user

def getCurrentActiveUser(currentUser=Depends(getCurrentUser)):
    return currentUser
