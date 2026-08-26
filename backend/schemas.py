from pydantic import BaseModel, ConfigDict, Field
from datetime import date, datetime
from typing import Literal

class UserCreate(BaseModel):
    name: str
    dni: str
    email: str
    password: str
    fechaNacimiento: date
    role: Literal["admin", "especialista", "usuarioBase"] = "usuarioBase"
    termsAccepted: bool = False

class UserId(BaseModel):
    id: int
    name: str
    dni: str
    email: str
    fechaNacimiento: date
    role: Literal["admin", "especialista", "usuarioBase"] = "usuarioBase"

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class AIModelOption(BaseModel):
    modelKey: str
    label: str
    isActive: bool = False


class AIModelSettings(BaseModel):
    activeModelKey: str
    models: list[AIModelOption]


class AIModelSelectionUpdate(BaseModel):
    modelKey: str


class GoogleLoginRequest(BaseModel):
    idToken: str
    acceptTerms: bool = False


class TokenData(BaseModel):
    email: str | None = None

class UserUpdate(BaseModel):
    name: str | None = None
    dni: str | None = None
    email: str | None = None
    password: str | None = None
    fechaNacimiento: date | None = None
    role: Literal["admin", "especialista", "usuarioBase"] | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class PasswordResetStartResponse(BaseModel):
    message: str


class PasswordResetConfirmRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    code: str = Field(pattern=r"^\d{6}$")
    newPassword: str = Field(min_length=8, max_length=32)


class PasswordResetConfirmResponse(BaseModel):
    message: str

class ResultCreate(BaseModel):
    idUsuario: int
    observaciones: str | None = None
    probabilidades: dict[str, float] | None = None
    rankingProbabilidades: list[tuple[str, float]] | None = None

class ResultUpdate(BaseModel):
    idUsuario: int | None = None
    observaciones: str | None = None
    rankingProbabilidades: list[tuple[str, float]] | None = None

class ResultId(ResultCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class Result(ResultId):
    pass


class MedicalImageCreate(BaseModel):
    idUsuario: int
    idResult: int
    rangoEdad: str | None = None
    tipo: Literal["Limpia", "Resultado IA", "Resultado Manual"] = "Limpia"
    validado: Literal["SI", "NO", "PARCIAL"] = "NO"
    orthancInstanceId: str
    orthancStudyUid: str
    orthancSeriesUid: str
    orthancPatientId: str
    modalidad: str | None = None


class MedicalImageId(MedicalImageCreate):
    id: int
    fechaSubida: datetime

    model_config = ConfigDict(from_attributes=True)


class MedicalImageValidationUpdate(BaseModel):
    validado: Literal["SI", "NO", "PARCIAL"]

