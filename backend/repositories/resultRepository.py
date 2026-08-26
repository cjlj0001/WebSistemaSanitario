from sqlalchemy.orm import Session

from .. import models, schemas


def getResults(db: Session, skip: int = 0, limit: int = 1000):
    return db.query(models.Result).offset(skip).limit(limit).all()


def getResultById(db: Session, resultId: int):
    return db.query(models.Result).filter(models.Result.id == resultId).first()


def getResultsByUserDni(db: Session, userDni: str):
    user = db.query(models.User).filter(models.User.dni == userDni).first()
    if not user:
        return []
    return db.query(models.Result).filter(models.Result.idUsuario == user.id).all()


def userExistsByDni(db: Session, userDni: str) -> bool:
    return db.query(models.User).filter(models.User.dni == userDni).first() is not None


def getResultsByAnomalia(db: Session, anomalia: str):
    target = anomalia.strip().lower()
    results = db.query(models.Result).all()
    filtered = []
    for result in results:
        ranking = result.rankingProbabilidades or []
        if ranking and str(ranking[0][0]).strip().lower() == target:
            filtered.append(result)
    return filtered


def getResultsByImageId(db: Session, imageId: int):
    image = db.query(models.MedicalImage).filter(models.MedicalImage.id == imageId).first()
    if not image:
        return []
    return db.query(models.Result).filter(models.Result.id == image.idResult).all()


def imageExistsById(db: Session, imageId: int) -> bool:
    return db.query(models.MedicalImage).filter(models.MedicalImage.id == imageId).first() is not None

def getResultsByPorcentajeAcierto(db: Session, minPorcentaje: float, maxPorcentaje: float):
    results = db.query(models.Result).all()
    filtered = []
    for result in results:
        ranking = result.rankingProbabilidades or []
        if not ranking:
            continue
        top_probability = float(ranking[0][1])
        if minPorcentaje <= top_probability <= maxPorcentaje:
            filtered.append(result)
    return filtered


def createResult(db: Session, result: schemas.ResultCreate):
    dbResult = models.Result(
        idUsuario=result.idUsuario,
        observaciones=result.observaciones,
        rankingProbabilidades=result.rankingProbabilidades,
    )
    db.add(dbResult)
    db.commit()
    db.refresh(dbResult)
    return dbResult


def deleteResult(db: Session, resultId: int) -> bool:
    result = db.query(models.Result).filter(models.Result.id == resultId).first()
    if result:
        db.query(models.MedicalImage).filter(models.MedicalImage.idResult == resultId).update(
            {"idResult": None}, synchronize_session=False
        )
        db.delete(result)
        db.commit()
        return True
    return False


def deleteResultsByUserDni(db: Session, userDni: str) -> bool:
    user = db.query(models.User).filter(models.User.dni == userDni).first()
    if not user:
        return False
    results = db.query(models.Result).filter(models.Result.idUsuario == user.id).all()
    if results:
        resultIds = [result.id for result in results]
        db.query(models.MedicalImage).filter(models.MedicalImage.idResult.in_(resultIds)).update(
            {"idResult": None}, synchronize_session=False
        )
        for result in results:
            db.delete(result)
        db.commit()
        return True
    return False


def deleteResultsByImageId(db: Session, imageId: int) -> bool:
    image = db.query(models.MedicalImage).filter(models.MedicalImage.id == imageId).first()
    if image and image.result:
        db.query(models.MedicalImage).filter(models.MedicalImage.id == imageId).update(
            {"idResult": None}, synchronize_session=False
        )
        db.delete(image.result)
        db.commit()
        return True
    return False


def updateResult(db: Session, resultId: int, updatedResult: schemas.ResultUpdate):
    result = db.query(models.Result).filter(models.Result.id == resultId).first()
    if not result:
        return None
    for var, value in vars(updatedResult).items():
        if value is not None:
            setattr(result, var, value)
    db.commit()
    db.refresh(result)
    return result

