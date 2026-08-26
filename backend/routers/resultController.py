from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import getDb
from ..errors import ConflictError, NotFoundError, ValidationError
from ..services import resultService

router = APIRouter(prefix="/api/results", tags=["results"])

@router.get("", response_model=list[schemas.Result])
def readResults(skip: int = 0, limit: int = 1000, db: Session = Depends(getDb)):
    try:
        return resultService.listResults(db, skip=skip, limit=limit)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc  
    
@router.get("/{resultId}", response_model=schemas.Result)
def readResult(resultId: int, db: Session = Depends(getDb)):
    try:
        return resultService.getResultById(db, resultId=resultId)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    
@router.get("/user/{userDni}", response_model=list[schemas.Result])
def readResultsByUserDni(userDni: str, db: Session = Depends(getDb)):
    try:
        return resultService.getResultsByUserDni(db, userDni=userDni)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    
@router.get("/anomalia/{anomalia}", response_model=list[schemas.Result])
def readResultsByAnomalia(anomalia: str, db: Session = Depends(getDb)):
    try:
        return resultService.getResultsByAnomalia(db, anomalia=anomalia)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.get("/image/{imageId}", response_model=list[schemas.Result])
def readResultsByImageId(imageId: int, db: Session = Depends(getDb)):
    try:
        return resultService.getResultsByImageId(db, imageId=imageId)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.get("/porcentajeAcierto", response_model=list[schemas.Result])
def readResultsByPorcentajeAcierto(minPorcentaje: float, maxPorcentaje: float, db: Session = Depends(getDb)):
    try:
        return resultService.getResultsByPorcentajeAcierto(db, minPorcentaje=minPorcentaje, maxPorcentaje=maxPorcentaje)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.post("", response_model=schemas.Result)
def createResult(result: schemas.ResultCreate, db: Session = Depends(getDb)):
    try:
        return resultService.createResult(db=db, result=result)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ConflictError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.delete("/{resultId}")
def deleteResult(resultId: int, db: Session = Depends(getDb)):
    try:
        resultService.deleteResult(db, resultId=resultId)
        return {"deleted": True, "resultId": resultId}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.delete("/user/{userDni}")
def deleteResultsByUserDni(userDni: str, db: Session = Depends(getDb)):
    try:
        resultService.deleteResultsByUserDni(db, userDni=userDni)
        return {"deleted": True, "userDni": userDni}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.delete("/image/{imageId}")
def deleteResultsByImageId(imageId: int, db: Session = Depends(getDb)):
    try:
        resultService.deleteResultsByImageId(db, imageId=imageId)
        return {"deleted": True, "imageId": imageId}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

@router.put("/{resultId}", response_model=schemas.Result)
def updateResult(resultId: int, resultUpdate: schemas.ResultUpdate, db: Session = Depends(getDb)):
    try:
        return resultService.updateResult(db, resultId=resultId, updatedResult=resultUpdate)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    
