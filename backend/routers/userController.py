from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas
from ..dependencies import getCurrentActiveUser, getDb
from ..errors import ConflictError, NotFoundError, ValidationError
from ..services import userService

router = APIRouter(prefix="/api/users", tags=["users"])


def _require_admin(currentUser=Depends(getCurrentActiveUser)):
    if getattr(currentUser, "rol", None) != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden borrar usuarios")
    return currentUser

@router.get("", response_model=list[schemas.UserId])
def readUsers(skip: int = 0, limit: int = 1000, db: Session = Depends(getDb)):
    try:
        return userService.listUsers(db, skip=skip, limit=limit)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.get("/{userId}", response_model=schemas.UserId)
def readUser(userId: int, db: Session = Depends(getDb)):
    try:
        return userService.getUserById(db, userId=userId)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    
@router.get("/dni/{dni}", response_model=schemas.UserId)
def readUserByDni(dni: str, db: Session = Depends(getDb)):
    try:
        return userService.getUserByDni(db, dni=dni)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.get("/email/{email}", response_model=schemas.UserId)
def readUserByEmail(email: str, db: Session = Depends(getDb)):
    try:
        return userService.getUserByEmail(db, email=email)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.post("", response_model=schemas.UserId)
def createUser(user: schemas.UserCreate, db: Session = Depends(getDb)):
    try:
        if not user.termsAccepted:
            raise HTTPException(status_code=400, detail="Debes aceptar los términos y condiciones de uso para crear una cuenta")
        return userService.createUser(db=db, user=user)
    except ConflictError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    
@router.delete("/{userId}")
def deleteUser(userId: int, db: Session = Depends(getDb), currentUser=Depends(_require_admin)):
    try:
        userService.deleteUser(db, userId=userId)
        return {"deleted": True, "userId": userId}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    
@router.delete("/dni/{dni}")
def deleteUserByDni(dni: str, db: Session = Depends(getDb), currentUser=Depends(_require_admin)):
    try:
        userService.deleteUserByDni(db, dni=dni)
        return {"deleted": True, "dni": dni}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc  
    
@router.delete("/email/{email}")
def deleteUserByEmail(email: str, db: Session = Depends(getDb), currentUser=Depends(_require_admin)):
    try:
        userService.deleteUserByEmail(db, email=email)
        return {"deleted": True, "email": email}
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@router.put("/{userId}", response_model=schemas.UserId)
def updateUser(userId: int, userUpdate: schemas.UserUpdate, db: Session =
    Depends(getDb)):
        try:
            update_data = userUpdate.model_dump(exclude_unset=True)
            if "password" in update_data:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Cambio de contraseña no permitido por administrador. "
                        "El usuario debe confirmar el cambio mediante el flujo de restablecimiento de contraseña."
                    ),
                )

            return userService.updateUser(db, userId=userId, updatedUser=userUpdate)
        except NotFoundError as exc:
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        except ConflictError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except ValidationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc



