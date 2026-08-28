from sqlalchemy import Column, Date, DateTime, Enum as SQLEnum, Integer, String, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    dni = Column(String, unique=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    fechaNacimiento = Column(Date, index=True)
    password = Column(String(255), nullable=False)
    rol = Column(
        SQLEnum("admin", "especialista", "usuarioBase", name="userRolEnum"),
        nullable=False,
        default="usuarioBase",
        server_default="usuarioBase",
    )

    @property
    def role(self):
        return self.rol

    @role.setter
    def role(self, value):
        self.rol = value

    results = relationship("Result", back_populates="usuario")
    medicalImages = relationship("MedicalImage", back_populates="usuario")

    orthancPatientId = Column(String, nullable=True, unique=True, index=True)
    termsAcceptedAt = Column(DateTime(timezone=True), nullable=True)

class Result(Base):
    __tablename__ = "results"
    
    id = Column(Integer, primary_key=True, index=True)
    idUsuario = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    rankingProbabilidades = Column(JSON, nullable=True)
    observaciones = Column(String, nullable=True)
    
    usuario = relationship("User", back_populates="results")
    medicalImages = relationship("MedicalImage", back_populates="result")

class MedicalImage(Base):
    __tablename__ = "medicalImages"
    
    id = Column(Integer, primary_key=True, index=True)
    fechaSubida = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    rangoEdad = Column(String, nullable=True, index=True)
    tipo = Column(
        SQLEnum("Limpia", "Resultado IA", "Resultado Manual", name="imageTipoEnum"),
        nullable=False,
        default="Limpia",
        server_default="Limpia",
    )
    validado = Column(
        SQLEnum("SI", "NO", "PARCIAL", name="imageValidadoEnum"),
        nullable=False,
        default="NO",
        server_default="NO",
    )
    
    idUsuario = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    
    idResult = Column(Integer, ForeignKey("results.id"), nullable=True, index=True)
    
    orthancInstanceId = Column(String, unique=True, nullable=False, index=True)
    orthancStudyUid = Column(String, nullable=False, index=True)
    orthancSeriesUid = Column(String, nullable=False, index=True)
    orthancPatientId = Column(String, nullable=False)
    modalidad = Column(String, nullable=True)
    specialistName = Column(String, nullable=True)
    # This is a local PostgreSQL presentation flag. It never changes Orthanc.
    isStudy = Column(Boolean, nullable=False, default=True, server_default="true")
    
    usuario = relationship("User", back_populates="medicalImages")
    result = relationship("Result", back_populates="medicalImages")


class PasswordResetToken(Base):
    """One-time codes stored in the existing passwordResetTokens table."""
    __tablename__ = "passwordResetTokens"

    id = Column(Integer, primary_key=True, index=True)
    userId = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    code = Column("token", String(6), nullable=False, unique=True, index=True)
    expiresAt = Column(DateTime(timezone=True), nullable=False, index=True)
    used = Column(Boolean, nullable=False, default=False, server_default="false")
    createdAt = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    user = relationship("User")

