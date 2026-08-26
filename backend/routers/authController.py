import os

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from google.auth.transport import requests as googleRequests
from google.oauth2 import id_token as googleIdToken

from .. import schemas
from ..dependencies import getCurrentActiveUser, getDb
from ..errors import NotFoundError, ValidationError
from ..repositories import userRepository
from ..security import createAccessToken, verifyPassword
from ..services import userService
from ..utils.mail import send_password_reset_code

router = APIRouter(prefix="/auth", tags=["auth"])


def _verifyGoogleIdToken(token: str) -> dict:
    clientIdRaw = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    extraClientIdsRaw = os.getenv("GOOGLE_CLIENT_IDS", "").strip()
    clockSkewRaw = os.getenv("GOOGLE_CLOCK_SKEW_SECONDS", "10").strip()
    clientIds = [clientIdRaw] if clientIdRaw else []
    if extraClientIdsRaw:
        clientIds.extend([value.strip() for value in extraClientIdsRaw.split(",") if value.strip()])

    try:
        clockSkewSeconds = max(0, int(clockSkewRaw))
    except ValueError:
        clockSkewSeconds = 10

    if not clientIds:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_CLIENT_ID no configurado en el backend",
        )

    lastError: Exception | None = None
    payload = None
    try:
        for clientId in clientIds:
            try:
                payload = googleIdToken.verify_oauth2_token(
                    token,
                    googleRequests.Request(),
                    audience=clientId,
                    clock_skew_in_seconds=clockSkewSeconds,
                )
                break
            except Exception as exc:
                lastError = exc
                payload = None
    except Exception as exc:
        lastError = exc

    if payload is None:
        detail = "Token de Google inválido"
        if lastError is not None:
            detail = f"Token de Google inválido: {lastError}"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        ) from lastError

    if payload.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Emisor de Google inválido",
        )

    if not payload.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token de Google sin email",
        )

    if payload.get("email_verified") is not True:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email de Google no verificado",
        )

    return payload


@router.post("/token", response_model=schemas.Token)
def login(formData: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(getDb)):
    user = userRepository.getUserByEmail(db, email=formData.username)
    if user is None or not verifyPassword(formData.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    accessToken = createAccessToken({"sub": user.email, "role": user.rol})
    return {"access_token": accessToken, "token_type": "bearer"}


@router.post("/google", response_model=schemas.Token)
def loginWithGoogle(payload: schemas.GoogleLoginRequest, db: Session = Depends(getDb)):
    tokenPayload = _verifyGoogleIdToken(payload.idToken)

    email = tokenPayload["email"]
    name = tokenPayload.get("name") or tokenPayload.get("given_name") or "Usuario Google"
    googleSub = tokenPayload.get("sub", "")

    user = userRepository.getUserByEmail(db, email=email)
    if user is None:
        if not payload.acceptTerms:
            raise HTTPException(
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                detail="Debe aceptar los términos y condiciones para completar tu primer acceso con Google",
            )
        user = userRepository.createGoogleUser(db=db, name=name, email=email, googleSub=googleSub)
    elif user.termsAcceptedAt is None:
        if not payload.acceptTerms:
            raise HTTPException(
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                detail="Debe aceptar los términos y condiciones para continuar",
            )
        user = userRepository.acceptTerms(db, user)

    accessToken = createAccessToken({"sub": user.email, "role": user.rol})
    return {"access_token": accessToken, "token_type": "bearer"}


@router.get("/me", response_model=schemas.UserId)
def getMyProfile(currentUser=Depends(getCurrentActiveUser)):
    return currentUser


@router.post(
    "/password-reset/request",
    response_model=schemas.PasswordResetStartResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def requestPasswordReset(
    payload: schemas.PasswordResetRequest,
    backgroundTasks: BackgroundTasks,
    db: Session = Depends(getDb),
):
    user = userRepository.getUserByEmail(db, email=payload.email)
    if user is not None:
        codeRow = userService.requestPasswordReset(db, userId=user.id)
        backgroundTasks.add_task(send_password_reset_code, user.email, codeRow.code, codeRow.expiresAt)

    return {"message": "Correo existente, hemos enviado un código de recuperación"}


@router.post("/password-reset/confirm", response_model=schemas.PasswordResetConfirmResponse)
def confirmPasswordReset(payload: schemas.PasswordResetConfirmRequest, db: Session = Depends(getDb)):
    try:
        userService.confirmPasswordReset(
            db,
            email=payload.email,
            code=payload.code,
            newPassword=payload.newPassword,
        )
        return {"message": "Contraseña actualizada correctamente"}
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
