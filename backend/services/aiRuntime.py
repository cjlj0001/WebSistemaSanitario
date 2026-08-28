"""Coordinate AI inference and model activation inside the backend process."""

from threading import Condition

from PIL import Image

from ..ai.cargarModelo import (
    getActiveAiModelKey,
    listAvailableAiModels,
    prepareAiModel,
    predictPil,
    setActiveAiModelKey,
)


class AiModelTransitionInProgressError(RuntimeError):
    """Raised when a new upload arrives while the AI engine is changing model."""

    defaultMessage = (
        "El motor de IA está actualizando el modelo seleccionado. "
        "Vuelve a intentar la carga en unos instantes."
    )

    def __init__(self):
        super().__init__(self.defaultMessage)


class AiModelRuntime:
    def __init__(self):
        self._condition = Condition()
        self._activeInferences = 0
        self._isTransitioning = False

    def status(self) -> dict:
        availableModels = listAvailableAiModels()
        activeModelKey = getActiveAiModelKey()
        activeModel = next(
            (model for model in availableModels if model["modelKey"] == activeModelKey),
            None,
        )
        with self._condition:
            return {
                "activeModelKey": activeModelKey,
                "activeModelLabel": activeModel["label"] if activeModel else activeModelKey,
                "isTransitioning": self._isTransitioning,
                "activeInferenceCount": self._activeInferences,
            }

    def predict(self, image: Image.Image, outputPath: str) -> dict:
        with self._condition:
            if self._isTransitioning:
                raise AiModelTransitionInProgressError()
            modelKey = getActiveAiModelKey()
            self._activeInferences += 1

        try:
            return predictPil(image, output_path=outputPath, model_key=modelKey)
        finally:
            with self._condition:
                self._activeInferences -= 1
                if self._activeInferences == 0:
                    self._condition.notify_all()

    def activate(self, modelKey: str) -> dict:
        requestedKey = str(modelKey or "").strip()
        availableKeys = {model["modelKey"] for model in listAvailableAiModels()}
        if requestedKey not in availableKeys:
            raise ValueError("El modelo seleccionado no está disponible o no es compatible")

        with self._condition:
            if self._isTransitioning:
                raise AiModelTransitionInProgressError()
            if requestedKey == getActiveAiModelKey():
                return self.status()

            # Closing the gate before waiting prevents new uploads from
            # starting while active predictions are being drained.
            self._isTransitioning = True
            while self._activeInferences > 0:
                self._condition.wait()

        try:
            try:
                prepareAiModel(requestedKey)
            except ValueError:
                raise
            except Exception as exc:
                raise ValueError(
                    "No se pudo preparar el modelo seleccionado; el modelo activo no se ha modificado"
                ) from exc
            setActiveAiModelKey(requestedKey)
        finally:
            with self._condition:
                self._isTransitioning = False
                self._condition.notify_all()

        return self.status()


aiRuntime = AiModelRuntime()


def getAiRuntimeStatus() -> dict:
    return aiRuntime.status()


def activateAiModel(modelKey: str) -> dict:
    return aiRuntime.activate(modelKey)
