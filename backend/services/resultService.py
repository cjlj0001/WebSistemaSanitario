from sqlalchemy.orm import Session

from .. import models
from ..repositories import resultRepository
from .. import schemas
from ..errors import (
    ResultNotFoundError,
    ResultImageMismatchError,
    ResultUserMismatchError,
    ValidationError,
)


def listResults(db: Session, skip: int = 0, limit: int = 1000):
    return resultRepository.getResults(db, skip=skip, limit=limit)


def getResultById(db: Session, resultId: int):
    result = resultRepository.getResultById(db, resultId=resultId)
    if result is None:
        raise ResultNotFoundError()
    return result


def getResultsByUserDni(db: Session, userDni: str):
    if not resultRepository.userExistsByDni(db, userDni=userDni):
        raise ResultUserMismatchError()
    return resultRepository.getResultsByUserDni(db, userDni=userDni)


def getResultsByAnomalia(db: Session, anomalia: str):
    return resultRepository.getResultsByAnomalia(db, anomalia=anomalia)


def getResultsByImageId(db: Session, imageId: int):
    if not resultRepository.imageExistsById(db, imageId=imageId):
        raise ResultImageMismatchError()
    return resultRepository.getResultsByImageId(db, imageId=imageId)


def getResultsByPorcentajeAcierto(db: Session, minPorcentaje: float, maxPorcentaje: float):
    return resultRepository.getResultsByPorcentajeAcierto(
        db, minPorcentaje=minPorcentaje, maxPorcentaje=maxPorcentaje
    )


def createResult(db: Session, result: schemas.ResultCreate):
    rankingProbabilidades = result.rankingProbabilidades
    if result.probabilidades:
        orderedProbabilities = sorted(
            result.probabilidades.items(),
            key=lambda item: item[1],
            reverse=True,
        )
        rankingProbabilidades = [
            (label, float(probability)) for label, probability in orderedProbabilities
        ]
    elif rankingProbabilidades:
        rankingProbabilidades = sorted(
            [(str(label), float(probability)) for label, probability in rankingProbabilidades],
            key=lambda item: item[1],
            reverse=True,
        )
    else:
        raise ValidationError(
            "Fallo en el procesamiento del resultado de la IA: se requiere ranking o probabilidades"
        )

    if not db.query(models.User).filter(models.User.id == result.idUsuario).first():
        raise ResultUserMismatchError()

    normalized = schemas.ResultCreate(
        idUsuario=result.idUsuario,
        observaciones=result.observaciones,
        rankingProbabilidades=rankingProbabilidades,
    )
    return resultRepository.createResult(db=db, result=normalized)


def deleteResult(db: Session, resultId: int):
    if not resultRepository.deleteResult(db, resultId=resultId):
        raise ResultNotFoundError()
    return True


def deleteResultsByUserDni(db: Session, userDni: str):
    if not resultRepository.userExistsByDni(db, userDni=userDni):
        raise ResultUserMismatchError()
    if not resultRepository.deleteResultsByUserDni(db, userDni=userDni):
        raise ResultNotFoundError()
    return True


def deleteResultsByImageId(db: Session, imageId: int):
    if not resultRepository.imageExistsById(db, imageId=imageId):
        raise ResultImageMismatchError()
    if not resultRepository.deleteResultsByImageId(db, imageId=imageId):
        raise ResultNotFoundError()
    return True


def updateResult(db: Session, resultId: int, updatedResult: schemas.ResultUpdate):
    existingResult = resultRepository.getResultById(db, resultId=resultId)
    if existingResult is None:
        raise ResultNotFoundError()
    if updatedResult.idUsuario:
        if not db.query(models.User).filter(models.User.id == updatedResult.idUsuario).first():
            raise ResultUserMismatchError()
    return resultRepository.updateResult(db=db, resultId=resultId, updatedResult=updatedResult)

