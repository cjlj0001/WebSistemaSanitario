class AppError(Exception):

    defaultMessage = "Application error"

    def __init__(self, message: str | None = None):
        super().__init__(message or self.defaultMessage)


class NotFoundError(AppError):

    defaultMessage = "Resource not found"


class ConflictError(AppError):

    defaultMessage = "Resource conflict"


class ValidationError(AppError):

    defaultMessage = "Validation error"


class UserNotFoundError(NotFoundError):
    defaultMessage = "Usuario no encontrado"


class DniAlreadyRegisteredError(ConflictError):
    defaultMessage = "DNI ya registrado"


class EmailAlreadyRegisteredError(ConflictError):
    defaultMessage = "Email ya registrado"


class PasswordTooShortError(ValidationError):
    defaultMessage = "La contrasena debe tener al menos 8 caracteres"


class PasswordTooLongError(ValidationError):
    defaultMessage = "La contrasena no puede superar 32 caracteres"


class ImageConversionError(ValidationError):
    defaultMessage = "No se pudo convertir la imagen a DICOM"


class MedicalImageNotFoundError(NotFoundError):
    defaultMessage = "Imagen medica no encontrada"


class ResultNotFoundError(NotFoundError):
    defaultMessage = "Resultado no encontrado"


class ResultUserMismatchError(ValidationError):
    defaultMessage = "El identificador de usuario del resultado no coincide con ningun usuario"


class ImageUserMismatchError(ValidationError):
    defaultMessage = "El identificador de usuario de la imagen no coincide con ningun usuario"


class ResultImageMismatchError(ValidationError):
    defaultMessage = "El identificador de imagen del resultado no coincide con ninguna imagen"

class TokenGenerationError(ValidationError):
    defaultMessage = "Error al generar el token de acceso, faltan variables de entorno necesarias"
