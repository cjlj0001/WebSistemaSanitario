from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Response
from sqlalchemy.orm import Session

from ..dependencies import getDb, getCurrentActiveUser
from ..errors import NotFoundError, ValidationError
from .. import schemas
from ..services import imageService

router = APIRouter(prefix="/medicalImages", tags=["medicalImages"])


# Preview endpoints are public for browser <img> usage; no token parsing here.


def _require_admin(currentUser=Depends(getCurrentActiveUser)):
    if getattr(currentUser, "rol", None) != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden borrar imagenes o estudios")
    return currentUser

@router.get("")
def readMedicalImages(skip: int = 0, limit: int = 1000, db: Session = Depends(getDb)):
    try:
        return imageService.listMedicalImages(db=db, skip=skip, limit=limit)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# Specific routes first (before generic {imageId} parameter)
@router.get("/user/{userDni}")
def readMedicalImagesByUserDni(
    userDni: str, 
    currentUser = Depends(getCurrentActiveUser),
    db: Session = Depends(getDb)
):
    # Users can only access their own images
    if currentUser.dni != userDni:
        raise HTTPException(status_code=403, detail="No tienes permiso para acceder a las imagenes de otro usuario")
    
    try:
        return imageService.getMedicalImagesByUserDni(db, userDni=userDni)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/me")
def readMyMedicalImages(
    currentUser = Depends(getCurrentActiveUser),
    db: Session = Depends(getDb)
):
    try:
        return imageService.getCurrentUserMedicalImages(db=db, currentUser=currentUser)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{imageId}/download")
def downloadMedicalImage(
    imageId: int,
    currentUser = Depends(getCurrentActiveUser),
    db: Session = Depends(getDb),
):
    try:
        dicomBytes, medicalImage = imageService.downloadMedicalImage(
            db=db,
            medicalImageId=imageId,
        )
        
        # Ownership/role checks: download requires authenticated user.
        currentRole = getattr(currentUser, "rol", None)
        if medicalImage.idUsuario != currentUser.id and currentRole not in {"admin", "especialista"}:
            raise HTTPException(status_code=403, detail="No tienes permiso para descargar esta imagen")
        
        return Response(
            content=dicomBytes,
            media_type="application/dicom",
            headers={
                "Content-Disposition": f'attachment; filename="medicalImage_{medicalImage.id}.dcm"'
            },
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{imageId}/preview")
def previewMedicalImage(
    imageId: int,
    db: Session = Depends(getDb),
):
    try:
        previewBytes, medicalImage = imageService.getMedicalImagePreviewPng(
            db=db,
            medicalImageId=imageId,
        )
        
        # Public preview: no token parsing, return PNG for browser <img> tags.
        return Response(
            content=previewBytes,
            media_type="image/png",
            headers={
                "Content-Disposition": f'inline; filename="medicalImage_{medicalImage.id}.png"'
            },
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


# Generic route last
@router.get("/{imageId}")
def readMedicalImageById(imageId: str, db: Session = Depends(getDb)):
    raise HTTPException(status_code=403, detail=f"GENERIC ROUTE HIT: imageId={imageId}")
    try:
        return imageService.getMedicalImageById(imageId=imageId)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/user/{userDni}")
def createMedicalImageEndpoint(userDni: str, file: UploadFile = File(...), db: Session = Depends(getDb)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Debes seleccionar un archivo")

    try:
        return imageService.createMedicalImage(db=db, userDni=userDni, fileObj=file.file, filename=file.filename)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error creando imagen medica: {exc}") from exc


@router.post("/{imageId}/manual-result")
def createManualMedicalImageResultEndpoint(
    imageId: int,
    file: UploadFile = File(...),
    db: Session = Depends(getDb),
    currentUser = Depends(getCurrentActiveUser),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Debes seleccionar un archivo")

    currentRole = getattr(currentUser, "rol", None)
    if currentRole not in {"especialista", "admin"}:
        raise HTTPException(status_code=403, detail="No autorizado para guardar resultados manuales")

    try:
        return imageService.saveManualAnnotatedMedicalImage(
            db=db,
            sourceMedicalImageId=imageId,
            fileObj=file.file,
            filename=file.filename,
            currentUser=currentUser,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error guardando resultado manual: {exc}") from exc


@router.put("/{imageId}/validation")
def updateMedicalImageValidationEndpoint(
    imageId: int,
    updatePayload: schemas.MedicalImageValidationUpdate,
    db: Session = Depends(getDb),
):
    try:
        return imageService.updateMedicalImageValidation(
            db=db,
            medicalImageId=imageId,
            update=updatePayload,
        )
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error actualizando validacion de imagen: {exc}") from exc


@router.delete("/{imageId}/unavailable")
def deleteUnavailableMedicalImageEndpoint(imageId: int, db: Session = Depends(getDb), currentUser=Depends(_require_admin)):
    try:
        imageService.deleteUnavailableMedicalImage(db=db, imageId=imageId)
        return {"deleted": True, "imageId": imageId, "reason": "unavailable_in_orthanc"}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.delete("/{imageId}")
def deleteMedicalImageEndpoint(imageId: int, db: Session = Depends(getDb), currentUser=Depends(_require_admin)):
    try:
        imageService.deleteMedicalImage(db=db, imageId=imageId)
        return {"deleted": True, "imageId": imageId}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.delete("/user/{userDni}")
def deleteMedicalImagesByUserDniEndpoint(userDni: str, db: Session = Depends(getDb), currentUser=Depends(_require_admin)):
    try:
        if not imageService.deleteMedicalImagesByUserDni(db=db, userDni=userDni):
            raise HTTPException(status_code=404, detail="No hay imagenes medicas para este usuario")
        return {"deleted": True, "userDni": userDni}
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/study/{orthancStudyUid}")
def deleteMedicalImagesByOrthancStudyUidEndpoint(orthancStudyUid: str, db: Session = Depends(getDb), currentUser=Depends(_require_admin)):
    try:
        if not imageService.deleteMedicalImagesByOrthancStudyUid(db=db, orthancStudyUid=orthancStudyUid):
            raise HTTPException(status_code=404, detail="No hay imagenes medicas para este orthancStudyUid")
        return {"deleted": True, "orthancStudyUid": orthancStudyUid}
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

