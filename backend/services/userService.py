from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets

from ..repositories import userRepository
from .. import schemas
from ..errors import (
    DniAlreadyRegisteredError,
    EmailAlreadyRegisteredError,
    PasswordTooLongError,
    PasswordTooShortError,
    ValidationError,
    UserNotFoundError,
)


MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 32
PASSWORD_RESET_EXPIRE_MINUTES = 10
PASSWORD_RESET_CODE_LENGTH = 6


def validatePasswordLimits(password: str | None):
    if password is None:
        return

    if len(password) < MIN_PASSWORD_LENGTH:
        raise PasswordTooShortError()

    if len(password) > MAX_PASSWORD_LENGTH:
        raise PasswordTooLongError()


def listUsers(db: Session, skip: int = 0, limit: int = 1000):
    return userRepository.getUsers(db, skip=skip, limit=limit)


def getUserById(db: Session, userId: int):
    user = userRepository.getUserById(db, userId=userId)
    if user is None:
        raise UserNotFoundError()
    return user


def getUserByDni(db: Session, dni: str):
    user = userRepository.getUserByDni(db, dni=dni)
    if user is None:
        raise UserNotFoundError()
    return user


def getUserByEmail(db: Session, email: str):
    user = userRepository.getUserByEmail(db, email=email)
    if user is None:
        raise UserNotFoundError()
    return user


def createUser(db: Session, user: schemas.UserCreate):
    existingUserByDni = userRepository.getUserByDni(db, dni=user.dni)
    existingUserByEmail = userRepository.getUserByEmail(db, email=user.email)

    if existingUserByDni and (
        existingUserByEmail is None or existingUserByDni.id != existingUserByEmail.id
    ):
        raise DniAlreadyRegisteredError()

    if existingUserByEmail:
        if userRepository.isGoogleProvisionedUser(existingUserByEmail):
            validatePasswordLimits(user.password)
            return userRepository.completeGoogleUserRegistration(
                db=db, user=existingUserByEmail, registration=user
            )
        raise EmailAlreadyRegisteredError()

    validatePasswordLimits(user.password)

    return userRepository.createUser(db=db, user=user)


def deleteUser(db: Session, userId: int):
    if not userRepository.deleteUser(db, userId=userId):
        raise UserNotFoundError()
    return True


def deleteUserByDni(db: Session, dni: str):
    if not userRepository.deleteUserByDni(db, dni=dni):
        raise UserNotFoundError()
    return True


def deleteUserByEmail(db: Session, email: str):
    if not userRepository.deleteUserByEmail(db, email=email):
        raise UserNotFoundError()
    return True


def updateUser(db: Session, userId: int, updatedUser: schemas.UserUpdate):
    existingUser = userRepository.getUserById(db, userId=userId)
    if not existingUser:
        raise UserNotFoundError()

    if updatedUser.dni and updatedUser.dni != existingUser.dni:
        if userRepository.getUserByDni(db, dni=updatedUser.dni):
            raise DniAlreadyRegisteredError()

    if updatedUser.email and updatedUser.email != existingUser.email:
        if userRepository.getUserByEmail(db, email=updatedUser.email):
            raise EmailAlreadyRegisteredError()

    validatePasswordLimits(updatedUser.password)

    return userRepository.updateUser(db=db, userId=userId, updatedUser=updatedUser)


def requestPasswordReset(db: Session, userId: int):
    user = userRepository.getUserById(db, userId=userId)
    if user is None:
        raise UserNotFoundError()

    userRepository.invalidateActivePasswordResetTokens(db, userId=userId)
    expiresAt = datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    for _ in range(10):
        code = f"{secrets.randbelow(10 ** PASSWORD_RESET_CODE_LENGTH):0{PASSWORD_RESET_CODE_LENGTH}d}"
        if not userRepository.passwordResetCodeExists(db, code=code):
            return userRepository.createPasswordResetCode(
                db, userId=userId, code=code, expiresAt=expiresAt
            )

    raise ValidationError("No se pudo generar un codigo de recuperacion")


def confirmPasswordReset(db: Session, email: str, code: str, newPassword: str):
    validatePasswordLimits(newPassword)

    if not userRepository.consumePasswordResetCode(
        db, email=email, code=code, newPassword=newPassword
    ):
        raise ValidationError("Codigo de restablecimiento invalido o expirado")
    return True


