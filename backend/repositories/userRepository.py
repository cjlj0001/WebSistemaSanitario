from datetime import date, datetime, timezone
import secrets

from sqlalchemy import update
from sqlalchemy.orm import Session

from .. import models, schemas
from ..security import getPasswordHash


def getUsers(db: Session, skip: int = 0, limit: int = 1000):
    return db.query(models.User).offset(skip).limit(limit).all()


def getUserById(db: Session, userId: int):
    return db.query(models.User).filter(models.User.id == userId).first()


def getUserByDni(db: Session, dni: str):
    return db.query(models.User).filter(models.User.dni == dni).first()


def getUserByEmail(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def createUser(db: Session, user: schemas.UserCreate):
    dbUser = models.User(
        name=user.name,
        dni=user.dni,
        email=user.email,
        password=getPasswordHash(user.password),
        fechaNacimiento=user.fechaNacimiento,
        rol=user.role,
        termsAcceptedAt=datetime.now(timezone.utc),
    )
    db.add(dbUser)
    db.commit()
    db.refresh(dbUser)
    return dbUser


def _detachImagesFromResults(db: Session, resultIds: list[int]):
    if not resultIds:
        return


def _detachImagesFromUser(db: Session, userId: int):
    # Remove the relationship but keep the images orphaned
    db.query(models.MedicalImage).filter(models.MedicalImage.idUsuario == userId).update(
        {"idUsuario": None}, synchronize_session=False
    )


def _buildGoogleDniCandidate(googleSub: str, suffixLength: int = 10) -> str:
    normalizedSub = "".join(ch for ch in googleSub if ch.isalnum())
    tail = normalizedSub[-suffixLength:] if normalizedSub else secrets.token_hex(4)
    return f"GOOGLE-{tail.upper()}"


def createGoogleUser(db: Session, name: str, email: str, googleSub: str):
    dniCandidate = _buildGoogleDniCandidate(googleSub)
    attempt = 0
    while getUserByDni(db, dniCandidate) is not None:
        attempt += 1
        dniCandidate = f"{_buildGoogleDniCandidate(googleSub)}-{attempt}"

    dbUser = models.User(
        name=name or "Usuario Google",
        dni=dniCandidate,
        email=email,
        password=getPasswordHash(secrets.token_urlsafe(32)),
        fechaNacimiento=date(1970, 1, 1),
        rol="usuarioBase",
        termsAcceptedAt=datetime.now(timezone.utc),
    )
    db.add(dbUser)
    db.commit()
    db.refresh(dbUser)
    return dbUser


def acceptTerms(db: Session, user: models.User):
    user.termsAcceptedAt = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def deleteUser(db: Session, userId: int) -> bool:
    user = db.query(models.User).filter(models.User.id == userId).first()
    if user:
        db.query(models.MedicalImage).filter(models.MedicalImage.idUsuario == userId).delete(synchronize_session=False)
        db.query(models.Result).filter(models.Result.idUsuario == userId).delete(synchronize_session=False)
        db.delete(user)
        db.commit()
        return True
    return False


def deleteUserByDni(db: Session, dni: str) -> bool:
    user = db.query(models.User).filter(models.User.dni == dni).first()
    if user:
        return deleteUser(db, user.id)
    return False


def deleteUserByEmail(db: Session, email: str) -> bool:
    user = db.query(models.User).filter(models.User.email == email).first()
    if user:
        return deleteUser(db, user.id)
    return False


def updateUser(db: Session, userId: int, updatedUser: schemas.UserUpdate):
    user = db.query(models.User).filter(models.User.id == userId).first()
    if not user:
        return None
    data = {}
    try:
        data = updatedUser.model_dump(exclude_unset=True, by_alias=False)
    except Exception as e:
        data = {}

    if "fechaNacimiento" in data and isinstance(data["fechaNacimiento"], str):
        try:
            data["fechaNacimiento"] = date.fromisoformat(data["fechaNacimiento"])
        except Exception:
            pass

    if "password" in data and data["password"]:
        data["password"] = getPasswordHash(data["password"])

    for var, value in data.items():
        setattr(user, var, value)

    db.commit()
    db.refresh(user)
    return user


def passwordResetCodeExists(db: Session, code: str) -> bool:
    return db.query(models.PasswordResetToken.id).filter(models.PasswordResetToken.code == code).first() is not None


def createPasswordResetCode(db: Session, userId: int, code: str, expiresAt: datetime):
    dbToken = models.PasswordResetToken(
        userId=userId,
        code=code,
        expiresAt=expiresAt,
        used=False,
    )
    db.add(dbToken)
    db.commit()
    db.refresh(dbToken)
    return dbToken


def invalidateActivePasswordResetTokens(db: Session, userId: int):
    now = datetime.now(timezone.utc)
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.userId == userId,
        models.PasswordResetToken.used == False,
        models.PasswordResetToken.expiresAt > now,
    ).update({"used": True}, synchronize_session=False)
    db.commit()


def consumePasswordResetCode(db: Session, email: str, code: str, newPassword: str) -> bool:
    """Consume one valid code and update the password atomically."""
    now = datetime.now(timezone.utc)
    resetCode = (
        db.query(models.PasswordResetToken)
        .join(models.User, models.User.id == models.PasswordResetToken.userId)
        .filter(
            models.User.email == email,
            models.PasswordResetToken.code == code,
            models.PasswordResetToken.used.is_(False),
            models.PasswordResetToken.expiresAt > now,
        )
        .first()
    )
    if resetCode is None:
        return False

    try:
        consumed = db.execute(
            update(models.PasswordResetToken)
            .where(
                models.PasswordResetToken.id == resetCode.id,
                models.PasswordResetToken.used.is_(False),
                models.PasswordResetToken.expiresAt > now,
            )
            .values(used=True)
        )
        if consumed.rowcount != 1:
            db.rollback()
            return False

        user = db.query(models.User).filter(models.User.id == resetCode.userId).first()
        if user is None:
            db.rollback()
            return False
        user.password = getPasswordHash(newPassword)
        db.commit()
        return True
    except Exception:
        db.rollback()
        raise

