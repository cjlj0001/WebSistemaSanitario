from fastapi import APIRouter, Depends, HTTPException

from .. import schemas
from ..ai.cargarModelo import listAvailableAiModels
from ..dependencies import getCurrentActiveUser
from ..services.aiRuntime import (
    AiModelTransitionInProgressError,
    activateAiModel,
    getAiRuntimeStatus,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _require_admin(currentUser=Depends(getCurrentActiveUser)):
    if getattr(currentUser, "rol", None) != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores pueden cambiar la IA activa")
    return currentUser


def _buildModelSettings() -> dict:
    runtimeStatus = getAiRuntimeStatus()
    activeModelKey = runtimeStatus["activeModelKey"]
    models = [
        {
            "modelKey": model["modelKey"],
            "label": model["label"],
            "isActive": model["modelKey"] == activeModelKey,
        }
        for model in listAvailableAiModels()
    ]
    return {
        "activeModelKey": activeModelKey,
        "models": models,
        "isTransitioning": runtimeStatus["isTransitioning"],
        "activeInferenceCount": runtimeStatus["activeInferenceCount"],
    }


@router.get("/models", response_model=schemas.AIModelSettings)
def getAvailableModels(currentUser=Depends(_require_admin)):
    return _buildModelSettings()


@router.get("/status", response_model=schemas.AIModelRuntimeStatus)
def getModelRuntimeStatus(currentUser=Depends(getCurrentActiveUser)):
    return getAiRuntimeStatus()


@router.put("/models/active", response_model=schemas.AIModelSettings)
def updateActiveModel(payload: schemas.AIModelSelectionUpdate, currentUser=Depends(_require_admin)):
    try:
        activateAiModel(payload.modelKey)
        return _buildModelSettings()
    except AiModelTransitionInProgressError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
