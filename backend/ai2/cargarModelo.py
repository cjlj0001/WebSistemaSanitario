"""
Wrapper module para inferencia de modelos de rayos X.
Proporciona la interfaz esperada por imageService.py.
"""

import importlib
import json
from pathlib import Path
from threading import Lock

import numpy as np
from PIL import Image

from .infer_xray_ensemble_gradcam import (
    ARCHITECTURE,
    CLASS_NAMES,
    MODEL_PATHS,
    image_to_tensor,
    load_model,
    make_gradcam,
    predict,
)

BACKEND_DIR = Path(__file__).resolve().parent.parent
ACTIVE_MODEL_CONFIG_PATH = Path(__file__).with_name("active_model.json")
CURRENT_MODEL_KEY = Path(__file__).resolve().parent.name

# Grad-CAM instala hooks temporales en el modelo. Serializar la inferencia evita
# que dos subidas simultáneas mezclen esos hooks o compitan por la memoria.
_INFERENCE_LOCK = Lock()


def _humanize_model_label(model_key: str) -> str:
    if model_key == "ai":
        return "IA principal"
    if model_key == "ai2":
        return "IA secundaria"
    return model_key.replace("_", " ").replace("-", " ").title()


def _model_folder_has_assets(model_folder: Path) -> bool:
    if not model_folder.is_dir():
        return False
    if not (model_folder / "cargarModelo.py").exists():
        return False
    return any(model_folder.glob("*.pt"))


def listAvailableAiModels() -> list[dict[str, str]]:
    models = []
    for folder in sorted(BACKEND_DIR.iterdir(), key=lambda path: path.name.lower()):
        if not folder.is_dir():
            continue
        if not folder.name.startswith("ai"):
            continue
        if not _model_folder_has_assets(folder):
            continue
        models.append({"modelKey": folder.name, "label": _humanize_model_label(folder.name)})
    return models


def _read_active_model_key_from_disk() -> str | None:
    if not ACTIVE_MODEL_CONFIG_PATH.exists():
        return None

    try:
        config = json.loads(ACTIVE_MODEL_CONFIG_PATH.read_text(encoding="utf-8"))
    except Exception:
        return None

    model_key = str(config.get("modelKey") or "").strip()
    return model_key or None


def getActiveAiModelKey() -> str:
    available_keys = {item["modelKey"] for item in listAvailableAiModels()}
    configured_key = _read_active_model_key_from_disk()

    if configured_key in available_keys:
        return configured_key

    if CURRENT_MODEL_KEY in available_keys:
        return CURRENT_MODEL_KEY

    return next(iter(sorted(available_keys)), CURRENT_MODEL_KEY)


def setActiveAiModelKey(model_key: str) -> str:
    normalized_key = str(model_key).strip()
    available_keys = {item["modelKey"] for item in listAvailableAiModels()}

    if normalized_key not in available_keys:
        raise ValueError("El modelo seleccionado no está disponible")

    ACTIVE_MODEL_CONFIG_PATH.write_text(
        json.dumps({"modelKey": normalized_key}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return normalized_key


def _predictPilLocal(image: Image.Image, output_path: str = None) -> dict:
    """Realiza predicción en una imagen PIL usando el ensemble local de modelos."""
    # Centralizar la conversión evita fallos con PNG con alfa, imágenes de 16
    # bits y modos de Pillow poco frecuentes. La IA siempre recibe RGB uint8.
    if image is None:
        raise ValueError("No se recibió una imagen para la predicción")
    img_array = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    if img_array.ndim != 3 or img_array.shape[2] != 3:
        raise ValueError("La imagen no se pudo convertir a RGB")

    input_tensor = image_to_tensor(img_array)

    ai_dir = Path(__file__).parent
    models = [load_model(str(ai_dir / p), ARCHITECTURE) for p in MODEL_PATHS]

    votes = []
    probabilities = []
    for model in models:
        class_idx, probs = predict(model, input_tensor)
        votes.append(class_idx)
        probabilities.append(probs)

    from collections import Counter

    vote_counts = Counter(votes)
    top_vote_count = vote_counts.most_common(1)[0][1]
    tied_classes = [cls for cls, count in vote_counts.items() if count == top_vote_count]

    if len(tied_classes) == 1:
        final_class = tied_classes[0]
    else:
        mean_probs = np.mean(np.stack(probabilities), axis=0)
        final_class = max(tied_classes, key=lambda cls: mean_probs[cls])

    selected_model_index = votes.index(final_class)
    selected_model = models[selected_model_index]

    if output_path is None:
        output_path = str(ai_dir / "prediction_gradcam.png")

    make_gradcam(selected_model, input_tensor, img_array, final_class, output_path)

    generated_path = Path(output_path)
    if not generated_path.is_file() or generated_path.stat().st_size == 0:
        raise RuntimeError("La IA no generó una imagen Grad-CAM válida")

    mean_probs = np.mean(np.stack(probabilities), axis=0)
    probabilities_dict = {CLASS_NAMES[i]: float(mean_probs[i]) for i in range(len(CLASS_NAMES))}

    return {
        "class": CLASS_NAMES[final_class],
        "class_index": final_class,
        "confidence": float(probabilities[selected_model_index][final_class]),
        "probabilities": probabilities_dict,
        "gradcam_path": output_path,
    }


def prepareAiModel() -> None:
    """Load the local checkpoints before this model is made active."""
    ai_dir = Path(__file__).parent
    for model_path in MODEL_PATHS:
        load_model(str(ai_dir / model_path), ARCHITECTURE)


def predictPil(image: Image.Image, output_path: str = None, model_key: str | None = None) -> dict:
    selected_model_key = (model_key or getActiveAiModelKey()).strip()

    if selected_model_key == CURRENT_MODEL_KEY:
        with _INFERENCE_LOCK:
            return _predictPilLocal(image, output_path=output_path)

    module = importlib.import_module(f"backend.{selected_model_key}.cargarModelo")
    if not hasattr(module, "predictPil"):
        raise RuntimeError(f"El modelo '{selected_model_key}' no expone predictPil")

    return module.predictPil(image, output_path=output_path)
