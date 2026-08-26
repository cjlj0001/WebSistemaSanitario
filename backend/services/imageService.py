import os
import shutil
import tempfile
from pathlib import Path

from PIL import Image
from sqlalchemy.orm import Session

from ..errors import ImageConversionError, ImageUserMismatchError, MedicalImageNotFoundError, ValidationError
from ..repositories import imageRepository
from . import resultService
from .. import schemas, models
from ..utils.converterDICOM import imageToDicom
from ..utils.converterPNG import dicomBytesToPngBytes, dicomFileToPilRgb


def _buildMedicalImagePayload(db: Session, record):
    medical = {
        "id": record.id,
        "fechaSubida": record.fechaSubida,
        "rangoEdad": record.rangoEdad,
        "tipo": record.tipo,
        "validado": record.validado,
        "idUsuario": record.idUsuario,
        "orthancInstanceId": record.orthancInstanceId,
        "orthancStudyUid": record.orthancStudyUid,
        "orthancSeriesUid": record.orthancSeriesUid,
        "orthancPatientId": record.orthancPatientId,
        "modalidad": record.modalidad,
        "idResult": record.idResult,
        "specialistName": record.specialistName,
    }

    if getattr(record, "usuario", None):
        medical["nombreUsuario"] = record.usuario.name
        medical["dniUsuario"] = record.usuario.dni

    result_obj = None
    if record.result:
        gradcam = (
            db.query(models.MedicalImage)
            .filter(models.MedicalImage.idResult == record.result.id)
            .filter(models.MedicalImage.tipo == "Resultado IA")
            .filter(models.MedicalImage.orthancStudyUid == record.orthancStudyUid)
            .order_by(models.MedicalImage.fechaSubida.desc())
            .first()
        )

        manual = (
            db.query(models.MedicalImage)
            .filter(models.MedicalImage.idResult == record.result.id)
            .filter(models.MedicalImage.tipo == "Resultado Manual")
            .filter(models.MedicalImage.orthancStudyUid == record.orthancStudyUid)
            .order_by(models.MedicalImage.fechaSubida.desc())
            .first()
        )

        result_obj = {
            "id": record.result.id,
            "idUsuario": record.result.idUsuario,
            "dniUsuario": getattr(record.usuario, "dni", None),
            "rankingProbabilidades": record.result.rankingProbabilidades,
            "observaciones": record.result.observaciones,
            "gradcamImageId": gradcam.id if gradcam else None,
            "manualImageId": manual.id if manual else None,
            "specialistName": getattr(manual, "specialistName", None) if manual else None,
        }

    return {"medicalImage": medical, "result": result_obj}


def listMedicalImages(db: Session, skip: int = 0, limit: int = 1000):
    records = imageRepository.getMedicalImages(db=db, skip=skip, limit=limit)
    return [_buildMedicalImagePayload(db, record) for record in records]


def getMedicalImageById(imageId: str):
    image = imageRepository.getOrthancMedicalImageById(imageId=imageId)
    if image is None:
        raise MedicalImageNotFoundError()
    return image


def downloadMedicalImage(db: Session, medicalImageId: int):
    medicalImage = imageRepository.getMedicalImageById(db=db, medicalImageId=medicalImageId)
    if medicalImage is None:
        raise MedicalImageNotFoundError()

    dicomBytes = imageRepository.downloadMedicalImageDicom(medicalImage.orthancInstanceId)
    if dicomBytes is None:
        raise MedicalImageNotFoundError()
    return dicomBytes, medicalImage


def getMedicalImagePreviewPng(db: Session, medicalImageId: int):
    dicomBytes, medicalImage = downloadMedicalImage(db=db, medicalImageId=medicalImageId)
    previewBytes = dicomBytesToPngBytes(dicomBytes)
    return previewBytes, medicalImage


def getMedicalImagesByUserDni(db: Session, userDni: str):
    if not imageRepository.userExistsByDni(db, userDni=userDni):
        raise ImageUserMismatchError()

    records = imageRepository.getMedicalImagesByUserDni(db=db, user_dni=userDni)
    return [_buildMedicalImagePayload(db, record) for record in records]


def getCurrentUserMedicalImages(db: Session, currentUser):
    return getMedicalImagesByUserDni(db=db, userDni=currentUser.dni)


def createMedicalImage(db: Session, userDni: str, fileObj, filename: str):
    if not imageRepository.userExistsByDni(db, userDni=userDni):
        raise ImageUserMismatchError()

    from ..ai.cargarModelo import predictPil

    extension = Path(filename).suffix.lower()

    with tempfile.TemporaryDirectory() as tempDir:
        inputPath = os.path.join(tempDir, f"input{extension}")
        outputPath = os.path.join(tempDir, "output.dcm")
        gradcamPath = os.path.join(tempDir, "gradcam.png")
        gradcamDicomPath = os.path.join(tempDir, "gradcam.dcm")

        with open(inputPath, "wb") as buffer:
            shutil.copyfileobj(fileObj, buffer)

        uploadPath = inputPath
        if extension != ".dcm":
            converted = imageToDicom(inputPath, outputPath)
            if not converted:
                raise ImageConversionError()
            uploadPath = outputPath

        # For prediction, the AI expects (and currently works with) grayscale images.
        # We will always pass a grayscale PIL Image to the predictor, while keeping
        # the uploaded DICOM (created below) in color when available.
        if extension == ".dcm":
            imageForPrediction = dicomFileToPilRgb(uploadPath).convert("L")
        else:
            imageForPrediction = Image.open(inputPath).convert("L")

        # Realizar predicción (con gradcam)
        prediction = predictPil(imageForPrediction, output_path=gradcamPath)

        user = db.query(models.User).filter(models.User.dni == userDni).first()
        if not user:
            raise ImageUserMismatchError()

        # Crear Result con las probabilidades del ensemble
        result = resultService.createResult(
            db=db,
            result=schemas.ResultCreate(
                idUsuario=user.id,
                observaciones=f"Predicción generada automáticamente: {prediction['class']} (confianza: {prediction['confidence']:.2%})",
                probabilidades=prediction["probabilities"],
            ),
        )

        # 1. Crear MedicalImage para la imagen original (tipo="Limpia")
        originalImagePayload = imageRepository.createMedicalImage(
            db=db,
            user_id=user.id,
            dicom_file_path=uploadPath,
            result_id=result.id,
            tipo="Limpia",
        )

        if not originalImagePayload.get("orthancInstanceId"):
            raise ImageConversionError("Orthanc no devolvio identificador de instancia para imagen original")

        # 2. Convertir imagen gradcam (PNG) a DICOM
        gradcamConverted = imageToDicom(gradcamPath, gradcamDicomPath)
        if not gradcamConverted:
            raise ImageConversionError("No se pudo convertir gradcam a DICOM")

        # 3. Crear MedicalImage para la visualización gradcam (tipo="Resultado IA")
        # Reutiliza los datos de Orthanc de la imagen original
        gradcamImagePayload = imageRepository.createMedicalImage(
            db=db,
            user_id=user.id,
            dicom_file_path=gradcamDicomPath,
            result_id=result.id,
            tipo="Resultado IA",
            orthanc_patient_id=originalImagePayload.get("orthancPatientId"),
            orthanc_study_uid=originalImagePayload.get("orthancStudyUid"),
        )

        if not gradcamImagePayload.get("orthancInstanceId"):
            raise ImageConversionError("Orthanc no devolvio identificador de instancia para gradcam")

    return {
        "originalImage": {
            "id": originalImagePayload.get("id"),
            "validado": originalImagePayload.get("validado"),
            "tipo": "Limpia",
            "orthancInstanceId": originalImagePayload.get("orthancInstanceId"),
            "orthancStudyUid": originalImagePayload.get("orthancStudyUid"),
            "orthancPatientId": originalImagePayload.get("orthancPatientId"),
            "idResult": result.id,
        },
        "gradcamImage": {
            "id": gradcamImagePayload.get("id"),
            "validado": gradcamImagePayload.get("validado"),
            "tipo": "Resultado IA",
            "orthancInstanceId": gradcamImagePayload.get("orthancInstanceId"),
            "orthancStudyUid": gradcamImagePayload.get("orthancStudyUid"),
            "orthancPatientId": gradcamImagePayload.get("orthancPatientId"),
            "idResult": result.id,
        },
        "result": {
            "id": result.id,
            "idUsuario": result.idUsuario,
            "rankingProbabilidades": result.rankingProbabilidades,
            "observaciones": result.observaciones,
        },
    }


def saveManualAnnotatedMedicalImage(db: Session, sourceMedicalImageId: int, fileObj, filename: str, currentUser=None):
    sourceMedicalImage = imageRepository.getMedicalImageById(db=db, medicalImageId=sourceMedicalImageId)
    if sourceMedicalImage is None:
        raise MedicalImageNotFoundError()

    extension = Path(filename).suffix.lower() or ".png"

    with tempfile.TemporaryDirectory() as tempDir:
        inputPath = os.path.join(tempDir, f"manual_input{extension}")
        outputPath = os.path.join(tempDir, "manual_output.dcm")

        with open(inputPath, "wb") as buffer:
            shutil.copyfileobj(fileObj, buffer)

        uploadPath = inputPath
        if extension != ".dcm":
            converted = imageToDicom(inputPath, outputPath)
            if not converted:
                raise ImageConversionError()
            uploadPath = outputPath

        payload = imageRepository.createMedicalImageManualResult(
            db=db,
            sourceMedicalImage=sourceMedicalImage,
            dicom_file_path=uploadPath,
            validado="NO",
            specialistName=getattr(currentUser, "name", None),
        )

    if not payload.get("orthancInstanceId"):
        raise ImageConversionError("Orthanc no devolvio identificador de instancia")

    return {
        "sourceMedicalImageId": sourceMedicalImageId,
        "medicalImage": payload,
    }


def updateMedicalImageValidation(db: Session, medicalImageId: int, update: schemas.MedicalImageValidationUpdate):
    medicalImage = imageRepository.updateMedicalImageValidation(
        db=db,
        medicalImageId=medicalImageId,
        validado=update.validado,
    )
    if medicalImage is None:
        raise MedicalImageNotFoundError()

    return {
        "id": medicalImage.id,
        "validado": medicalImage.validado,
        "tipo": medicalImage.tipo,
        "idUsuario": medicalImage.idUsuario,
        "idResult": medicalImage.idResult,
    }


def deleteMedicalImage(db: Session, imageId: int) -> bool:
    if not imageRepository.deleteMedicalImage(db=db, medicalImageId=imageId):
        raise MedicalImageNotFoundError()
    return True


def deleteUnavailableMedicalImage(db: Session, imageId: int) -> bool:
    if not imageRepository.deleteUnavailableMedicalImage(db=db, medicalImageId=imageId):
        raise MedicalImageNotFoundError("La imagen sigue disponible o ya no existe")
    return True


def deleteMedicalImagesByUserDni(db: Session, userDni: str) -> bool:
    if not imageRepository.userExistsByDni(db, userDni=userDni):
        raise ImageUserMismatchError()

    return imageRepository.deleteMedicalImagesByUserDni(db=db, user_dni=userDni) > 0


def deleteMedicalImagesByOrthancStudyUid(db: Session, orthancStudyUid: str) -> bool:
    if not orthancStudyUid or not str(orthancStudyUid).strip():
        raise ValidationError("Debes indicar un orthancStudyUid valido")

    return imageRepository.deleteMedicalImagesByOrthancStudyUid(db=db, orthanc_study_uid=str(orthancStudyUid).strip()) > 0

