import os
from io import BytesIO
from datetime import datetime, timezone
import requests
import pydicom
from pydicom.dataset import Dataset
from pydicom.uid import SecondaryCaptureImageStorage, generate_uid
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload
from sqlalchemy.exc import IntegrityError
from typing import List, Dict, Any, Optional

from .. import models
from ..utils.anonymization import (
    calculate_age_range,
    build_series_instance_uid,
    generate_anonymized_patient_id,
    anonymize_dicom_file,
    stamp_upload_datetime,
)

orthancUrl = os.getenv("ORTHANC_URL", "http://localhost:8042")
orthancUsername = os.getenv("ORTHANC_USERNAME", "orthanc")
orthancPassword = os.getenv("ORTHANC_PASSWORD", "orthanc")
orthancAuth = (orthancUsername, orthancPassword)


def get_instance_info(instance_id: str) -> Dict[str, Any]:
    response = requests.get(
        f"{orthancUrl}/instances/{instance_id}/tags?simplify",
        auth=orthancAuth,
    )
    response.raise_for_status()
    tags = response.json()

    return {
        "studyUid": tags.get("StudyInstanceUID") or tags.get("0020000D", ""),
        "seriesUid": tags.get("SeriesInstanceUID") or tags.get("0020000E", ""),
        "modality": tags.get("Modality") or tags.get("00080060", ""),
    }


def upload_dicom_to_orthanc(dicom_file_path: str, anonymized_patient_id: str) -> Dict[str, Any]:
    anonymized_dicom = anonymize_dicom_file(dicom_file_path, anonymized_patient_id)
    anonymized_dicom = stamp_upload_datetime(anonymized_dicom)
    response = requests.post(
        f"{orthancUrl}/instances",
        data=anonymized_dicom,
        headers={"Content-Type": "application/dicom"},
        auth=orthancAuth,
    )
    response.raise_for_status()
    payload = response.json()

    instance_id = payload.get("ID")
    instance_info = get_instance_info(instance_id)

    return {
        "instanceId": instance_id,
        "studyUid": instance_info.get("studyUid", ""),
        "seriesUid": instance_info.get("seriesUid", ""),
        "patientId": anonymized_patient_id,
        "modality": instance_info.get("modality", ""),
    }


def upload_dicom_to_orthanc_with_fixed_metadata(
    dicom_file_path: str,
    orthanc_patient_id: str,
    orthanc_study_uid: str,
    orthanc_series_uid: str,
    modality: str | None,
) -> Dict[str, Any]:
    dataset = pydicom.dcmread(dicom_file_path, force=True)
    dataset.remove_private_tags()

    dataset.PatientID = orthanc_patient_id
    dataset.PatientName = orthanc_patient_id

    if orthanc_study_uid:
        dataset.StudyInstanceUID = orthanc_study_uid
    if orthanc_series_uid:
        dataset.SeriesInstanceUID = orthanc_series_uid
    if modality:
        dataset.Modality = modality

    dataset.SOPInstanceUID = generate_uid()

    if not getattr(dataset, "file_meta", None):
        dataset.file_meta = Dataset()

    if not getattr(dataset.file_meta, "MediaStorageSOPClassUID", None):
        dataset.file_meta.MediaStorageSOPClassUID = getattr(dataset, "SOPClassUID", SecondaryCaptureImageStorage)

    dataset.file_meta.MediaStorageSOPInstanceUID = dataset.SOPInstanceUID

    output = BytesIO()
    dataset.save_as(output, write_like_original=False)
    stamped_dicom = stamp_upload_datetime(output.getvalue())

    response = requests.post(
        f"{orthancUrl}/instances",
        data=stamped_dicom,
        headers={"Content-Type": "application/dicom"},
        auth=orthancAuth,
    )
    response.raise_for_status()
    payload = response.json()

    instance_id = payload.get("ID")
    instance_info = get_instance_info(instance_id)

    return {
        "instanceId": instance_id,
        "studyUid": instance_info.get("studyUid", "") or orthanc_study_uid,
        "seriesUid": instance_info.get("seriesUid", "") or orthanc_series_uid,
        "patientId": orthanc_patient_id,
        "modality": instance_info.get("modality", "") or (modality or ""),
    }


def getMedicalImages(db: Session, skip: int = 0, limit: int = 1000) -> List[models.MedicalImage]:
    """Obtiene todas las imágenes médicas con paginación"""
    return (
        db.query(models.MedicalImage)
        .options(
            joinedload(models.MedicalImage.result),
            joinedload(models.MedicalImage.usuario)
        )
        .order_by(models.MedicalImage.fechaSubida.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def getMedicalImageById(db: Session, medicalImageId: int) -> Optional[models.MedicalImage]:
    """Obtiene una imagen médica por ID en PostgreSQL"""
    return db.query(models.MedicalImage).filter(
        models.MedicalImage.id == medicalImageId
    ).first()


def getMedicalImageByOrthancInstanceId(
    db: Session,
    orthanc_instance_id: str
) -> Optional[models.MedicalImage]:
    """Obtiene una imagen médica por su ID en Orthanc"""
    return db.query(models.MedicalImage).filter(
        models.MedicalImage.orthancInstanceId == orthanc_instance_id
    ).first()


def getOrthancMedicalImageById(imageId: str) -> Optional[Dict[str, Any]]:
    """Obtiene información de una instancia en Orthanc"""
    response = requests.get(f"{orthancUrl}/instances/{imageId}", auth=orthancAuth)
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()


def downloadMedicalImageDicom(orthanc_instance_id: str) -> Optional[bytes]:
    """Descarga el DICOM de Orthanc"""
    response = requests.get(
        f"{orthancUrl}/instances/{orthanc_instance_id}/file",
        auth=orthancAuth
    )
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.content


def getMedicalImagesByUserId(db: Session, user_id: int) -> List[models.MedicalImage]:
    """Obtiene todas las imágenes de un usuario"""
    return db.query(models.MedicalImage).filter(
        models.MedicalImage.idUsuario == user_id
    ).order_by(models.MedicalImage.fechaSubida.desc()).all()


def getMedicalImagesByUserDni(db: Session, user_dni: str) -> List[models.MedicalImage]:
    user = db.query(models.User).filter(models.User.dni == user_dni).first()
    if not user:
        return []
    return getMedicalImagesByUserId(db=db, user_id=user.id)


def getMedicalImagesByOrthancStudyUid(db: Session, orthanc_study_uid: str) -> List[models.MedicalImage]:
    """Obtiene todas las imágenes de un orthancStudyUid"""
    return db.query(models.MedicalImage).filter(
        models.MedicalImage.orthancStudyUid == orthanc_study_uid
    ).all()


def createMedicalImage(
    db: Session,
    user_id: int,
    dicom_file_path: str,
    result_id: int,
    tipo: str = "Limpia",
    validado: str = "NO",
    orthanc_patient_id: str | None = None,
    orthanc_study_uid: str | None = None,
    increment_series: bool = False,
) -> Dict[str, Any]:
    """
    Crea una nueva imagen médica:
    1. Anonimiza el DICOM
    2. Sube a Orthanc
    3. Guarda referencia en PostgreSQL
    
    Args:
        db: Sesión de BD
        user_id: ID del usuario
        dicom_file_path: Ruta local del archivo DICOM
        result_id: ID del resultado asociado
        tipo: Tipo de imagen ("Limpia", "Resultado IA", "Resultado Manual")
        orthanc_patient_id: ID anonimizado del paciente en Orthanc (si no se proporciona, se genera uno nuevo)
        orthanc_study_uid: UID del estudio en Orthanc (si no se proporciona, se genera uno nuevo)
        increment_series: Si True, incrementa la serie en 1 respecto a la estudios existentes
    
    Returns:
        dict: Información de la imagen creada
    """
    # Obtener usuario para calcular rango de edad
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise ValueError(f"Usuario con ID {user_id} no encontrado")
    
    # Generar o reutilizar ID anonimizado
    if orthanc_patient_id is None:
        # Prefer explicit canonical patient id stored on the User, if present
        if getattr(user, "orthancPatientId", None):
            anonymized_patient_id = user.orthancPatientId
        else:
            # Fall back to first historical MedicalImage patient id (stable historical choice)
            first = (
                db.query(models.MedicalImage)
                .filter(models.MedicalImage.idUsuario == user_id)
                .filter(models.MedicalImage.orthancPatientId != None)
                .order_by(models.MedicalImage.id.asc())
                .first()
            )
            if first and first.orthancPatientId:
                anonymized_patient_id = first.orthancPatientId
            else:
                anonymized_patient_id = generate_anonymized_patient_id()

            # Persist canonical orthancPatientId on the user for future uploads
            try:
                user.orthancPatientId = anonymized_patient_id
                db.add(user)
                db.commit()
                db.refresh(user)
            except Exception:
                db.rollback()
    else:
        anonymized_patient_id = orthanc_patient_id
    
    # Subir a Orthanc
    if orthanc_study_uid is None:
        # Primera imagen: subida normal
        orthanc_response = upload_dicom_to_orthanc(dicom_file_path, anonymized_patient_id)
    else:
        # Determine series slot: Limpia=0, Resultado IA=1, Resultado Manual=2
        if tipo == "Resultado IA":
            series_slot = 1
        elif tipo == "Resultado Manual":
            series_slot = 2
        else:  # tipo == "Limpia"
            series_slot = 0
        
        orthanc_response = upload_dicom_to_orthanc_with_fixed_metadata(
            dicom_file_path=dicom_file_path,
            orthanc_patient_id=anonymized_patient_id,
            orthanc_study_uid=orthanc_study_uid,
            orthanc_series_uid=build_series_instance_uid(orthanc_study_uid, series_slot),
            modality=None,
        )
    
    rango_edad = calculate_age_range(user.fechaNacimiento)

    # Ensure at most one image per (studyUid, tipo). If an image of the same tipo
    # already exists for this study/result, we will overwrite it (and attempt
    # to cleanup the old Orthanc instance). This enforces exactly 3 images per
    # study: one Limpia, one Resultado IA and one Resultado Manual.
    
    # Crear registro en PostgreSQL (o actualizar si ya existe por orthancInstanceId)
    # Esto hace la operación idempotente y evita duplicados por tipo en un estudio.
    existing_image = (
        db.query(models.MedicalImage)
        .filter(models.MedicalImage.orthancInstanceId == orthanc_response["instanceId"])
        .first()
    )

    # Buscar existencia de otra imagen del mismo tipo en el mismo estudio
    existing_same = (
        db.query(models.MedicalImage)
        .filter(models.MedicalImage.idResult == result_id)
        .filter(models.MedicalImage.orthancStudyUid == orthanc_response["studyUid"])
        .filter(models.MedicalImage.tipo == tipo)
        .order_by(models.MedicalImage.fechaSubida.desc())
        .first()
    )

    if existing_same and existing_same.orthancInstanceId != orthanc_response["instanceId"]:
        # Overwrite existing_same with the new Orthanc instance (same semantics
        # as manual results: best-effort cleanup of previous instance).
        old_instance_id = existing_same.orthancInstanceId

        existing_same.idUsuario = user_id
        existing_same.idResult = result_id
        existing_same.rangoEdad = rango_edad
        existing_same.tipo = tipo
        existing_same.validado = validado
        existing_same.orthancInstanceId = orthanc_response["instanceId"]
        existing_same.orthancStudyUid = orthanc_response["studyUid"]
        existing_same.orthancSeriesUid = orthanc_response["seriesUid"]
        existing_same.orthancPatientId = orthanc_response["patientId"]
        existing_same.modalidad = orthanc_response.get("modality")
        existing_same.fechaSubida = datetime.now(timezone.utc)

        db.commit()
        db.refresh(existing_same)

        # Best effort cleanup in Orthanc for old overwritten instance.
        if old_instance_id and old_instance_id != existing_same.orthancInstanceId:
            try:
                requests.delete(f"{orthancUrl}/instances/{old_instance_id}", auth=orthancAuth)
            except Exception:
                pass

        medical_image = existing_same
        return {
            "id": medical_image.id,
            "validado": medical_image.validado,
            "orthancInstanceId": medical_image.orthancInstanceId,
            "orthancStudyUid": medical_image.orthancStudyUid,
            "orthancSeriesUid": medical_image.orthancSeriesUid,
            "orthancPatientId": medical_image.orthancPatientId,
        }
    
    if existing_image:
        # If the existing DB row has the same `tipo`, treat as idempotent update.
        if existing_image.tipo == tipo:
            existing_image.idUsuario = user_id
            existing_image.idResult = result_id
            existing_image.rangoEdad = rango_edad
            existing_image.validado = validado
            existing_image.orthancStudyUid = orthanc_response["studyUid"]
            existing_image.orthancSeriesUid = orthanc_response["seriesUid"]
            existing_image.orthancPatientId = orthanc_response["patientId"]
            existing_image.modalidad = orthanc_response.get("modality")
            existing_image.fechaSubida = datetime.now(timezone.utc)
            db.commit()
            db.refresh(existing_image)
            medical_image = existing_image
        else:
            # Conflict: Orthanc returned an instanceId that already exists in DB
            # but with a different `tipo`. Prefer to create a new DB row. If
            # unique constraint on `orthancInstanceId` prevents insertion,
            # fallback to keeping the existing row to avoid changing its `tipo`.
            try:
                medical_image = models.MedicalImage(
                    idUsuario=user_id,
                    idResult=result_id,
                    rangoEdad=rango_edad,
                    tipo=tipo,
                    validado=validado,
                    orthancInstanceId=orthanc_response["instanceId"],
                    orthancStudyUid=orthanc_response["studyUid"],
                    orthancSeriesUid=orthanc_response["seriesUid"],
                    orthancPatientId=orthanc_response["patientId"],
                    modalidad=orthanc_response.get("modality"),
                )
                db.add(medical_image)
                db.commit()
                db.refresh(medical_image)
            except IntegrityError:
                db.rollback()
                # Could not insert duplicate orthancInstanceId: keep existing row
                medical_image = existing_image
    else:
        # Create new row
        medical_image = models.MedicalImage(
            idUsuario=user_id,
            idResult=result_id,
            rangoEdad=rango_edad,
            tipo=tipo,
            validado=validado,
            orthancInstanceId=orthanc_response["instanceId"],
            orthancStudyUid=orthanc_response["studyUid"],
            orthancSeriesUid=orthanc_response["seriesUid"],
            orthancPatientId=orthanc_response["patientId"],
            modalidad=orthanc_response.get("modality")
        )
        
        db.add(medical_image)
        db.commit()
        db.refresh(medical_image)
    
    return {
        "id": medical_image.id,
        "validado": medical_image.validado,
        "orthancInstanceId": medical_image.orthancInstanceId,
        "orthancStudyUid": medical_image.orthancStudyUid,
        "orthancSeriesUid": medical_image.orthancSeriesUid,
        "orthancPatientId": medical_image.orthancPatientId
    }


def createMedicalImageManualResult(
    db: Session,
    sourceMedicalImage: models.MedicalImage,
    dicom_file_path: str,
    validado: str = "NO",
    specialistName: str | None = None,
) -> Dict[str, Any]:
    user = db.query(models.User).filter(models.User.id == sourceMedicalImage.idUsuario).first()
    if not user:
        raise ValueError(f"Usuario con ID {sourceMedicalImage.idUsuario} no encontrado")

    if not sourceMedicalImage.idResult:
        raise ValueError("La imagen base no tiene resultado asociado")

    orthanc_response = upload_dicom_to_orthanc_with_fixed_metadata(
        dicom_file_path=dicom_file_path,
        orthanc_patient_id=sourceMedicalImage.orthancPatientId,
        orthanc_study_uid=sourceMedicalImage.orthancStudyUid,
        orthanc_series_uid=build_series_instance_uid(sourceMedicalImage.orthancStudyUid, 2),
        modality=sourceMedicalImage.modalidad,
    )

    existing_manual = (
        db.query(models.MedicalImage)
        .filter(models.MedicalImage.idResult == sourceMedicalImage.idResult)
        .filter(models.MedicalImage.orthancStudyUid == sourceMedicalImage.orthancStudyUid)
        .filter(models.MedicalImage.tipo == "Resultado Manual")
        .order_by(models.MedicalImage.fechaSubida.desc())
        .first()
    )

    # Overwrite the existing manual result for the same study instead of creating a new DB row.
    if existing_manual:
        old_instance_id = existing_manual.orthancInstanceId

        existing_manual.validado = validado
        existing_manual.orthancInstanceId = orthanc_response["instanceId"]
        existing_manual.orthancStudyUid = orthanc_response["studyUid"] or sourceMedicalImage.orthancStudyUid
        existing_manual.orthancSeriesUid = orthanc_response["seriesUid"] or sourceMedicalImage.orthancSeriesUid
        existing_manual.orthancPatientId = sourceMedicalImage.orthancPatientId
        existing_manual.modalidad = sourceMedicalImage.modalidad
        existing_manual.rangoEdad = calculate_age_range(user.fechaNacimiento)
        existing_manual.specialistName = specialistName
        existing_manual.isStudy = sourceMedicalImage.isStudy
        existing_manual.fechaSubida = datetime.now(timezone.utc)

        db.commit()
        db.refresh(existing_manual)

        # Best effort cleanup in Orthanc for old overwritten instance.
        if old_instance_id and old_instance_id != existing_manual.orthancInstanceId:
            try:
                requests.delete(f"{orthancUrl}/instances/{old_instance_id}", auth=orthancAuth)
            except Exception:
                pass

        medical_image = existing_manual
    else:
        medical_image = models.MedicalImage(
            idUsuario=sourceMedicalImage.idUsuario,
            idResult=sourceMedicalImage.idResult,
            rangoEdad=calculate_age_range(user.fechaNacimiento),
            tipo="Resultado Manual",
            validado=validado,
            orthancInstanceId=orthanc_response["instanceId"],
            orthancStudyUid=orthanc_response["studyUid"] or sourceMedicalImage.orthancStudyUid,
            orthancSeriesUid=orthanc_response["seriesUid"] or build_series_instance_uid(sourceMedicalImage.orthancStudyUid, 2),
            orthancPatientId=sourceMedicalImage.orthancPatientId,
            modalidad=sourceMedicalImage.modalidad,
            specialistName=specialistName,
            isStudy=sourceMedicalImage.isStudy,
        )

        db.add(medical_image)
        db.commit()
        db.refresh(medical_image)

    return {
        "id": medical_image.id,
        "validado": medical_image.validado,
        "tipo": medical_image.tipo,
        "orthancInstanceId": medical_image.orthancInstanceId,
        "orthancStudyUid": medical_image.orthancStudyUid,
        "orthancSeriesUid": medical_image.orthancSeriesUid,
        "orthancPatientId": medical_image.orthancPatientId,
        "modalidad": medical_image.modalidad,
        "idResult": medical_image.idResult,
        "idUsuario": medical_image.idUsuario,
        "specialistName": medical_image.specialistName,
    }


def updateMedicalImageValidation(
    db: Session,
    medicalImageId: int,
    validado: str,
) -> Optional[models.MedicalImage]:
    medical_image = getMedicalImageById(db=db, medicalImageId=medicalImageId)
    if not medical_image:
        return None

    medical_image.validado = validado
    db.commit()
    db.refresh(medical_image)
    return medical_image


def deleteMedicalImage(db: Session, medicalImageId: int) -> dict | None:
    """Delete only the local record, never the corresponding Orthanc instance."""
    medical_image = getMedicalImageById(db, medicalImageId)
    if not medical_image:
        return None

    study_dissolved = medical_image.tipo in {"Limpia", "Resultado IA"}
    try:
        if study_dissolved:
            # Original or AI removal dissolves the local study. The remaining
            # rows stay available as standalone images, with their Orthanc UID
            # and instance untouched.
            db.query(models.MedicalImage).filter(
                models.MedicalImage.orthancStudyUid == medical_image.orthancStudyUid,
                models.MedicalImage.id != medical_image.id,
            ).update({"isStudy": False}, synchronize_session=False)
        db.delete(medical_image)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"studyDissolved": study_dissolved}


def deleteUnavailableMedicalImage(db: Session, medicalImageId: int) -> bool:
    """Remove a stale local reference without querying or changing Orthanc."""
    medical_image = getMedicalImageById(db, medicalImageId)
    if not medical_image:
        return False

    try:
        db.delete(medical_image)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return True


def deleteMedicalImagesByUserId(db: Session, user_id: int) -> int:
    """Delete all local image rows for a user without contacting Orthanc."""
    try:
        deleted_count = (
            db.query(models.MedicalImage)
            .filter(models.MedicalImage.idUsuario == user_id)
            .delete(synchronize_session=False)
        )
        db.commit()
        return deleted_count
    except Exception:
        db.rollback()
        raise


def deleteMedicalImagesByUserDni(db: Session, user_dni: str) -> int:
    user = db.query(models.User).filter(models.User.dni == user_dni).first()
    if not user:
        return 0
    return deleteMedicalImagesByUserId(db=db, user_id=user.id)


def deleteMedicalImagesByOrthancStudyUid(db: Session, orthanc_study_uid: str) -> int:
    images = getMedicalImagesByOrthancStudyUid(db=db, orthanc_study_uid=orthanc_study_uid)
    if not images:
        return 0

    try:
        for image in images:
            db.delete(image)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return len(images)



def userExistsByDni(db: Session, userDni: str) -> bool:
    return db.query(models.User).filter(models.User.dni == userDni).first() is not None

