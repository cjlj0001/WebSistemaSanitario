from fastapi import APIRouter, Depends, HTTPException

from .. import schemas
from ..dependencies import getCurrentActiveUser
from ..ai.cargarModelo import getActiveAiModelKey, listAvailableAiModels, setActiveAiModelKey

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _require_admin(currentUser=Depends(getCurrentActiveUser)):
    if getattr(currentUser, "rol", None) != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden cambiar la IA activa")
    return currentUser


@router.get("/models", response_model=schemas.AIModelSettings)
def getAvailableModels(currentUser=Depends(_require_admin)):
    activeModelKey = getActiveAiModelKey()
    models = [
        {"modelKey": model["modelKey"], "label": model["label"], "isActive": model["modelKey"] == activeModelKey}
        for model in listAvailableAiModels()
    ]
    return {"activeModelKey": activeModelKey, "models": models}


@router.put("/models/active", response_model=schemas.AIModelSettings)
def updateActiveModel(payload: schemas.AIModelSelectionUpdate, currentUser=Depends(_require_admin)):
    try:
        setActiveAiModelKey(payload.modelKey)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    activeModelKey = getActiveAiModelKey()
    models = [
        {"modelKey": model["modelKey"], "label": model["label"], "isActive": model["modelKey"] == activeModelKey}
        for model in listAvailableAiModels()
    ]
    return {"activeModelKey": activeModelKey, "models": models}