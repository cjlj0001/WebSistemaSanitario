"""
Wrapper module para inferencia de modelos de rayos X.
Proporciona la interfaz esperada por imageService.py.
"""

import importlib
import json
from pathlib import Path
from collections import Counter

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
MODEL_WEIGHT_EXTENSIONS = {".pt", ".pth"}


def _humanize_model_label(model_key: str) -> str:
    if model_key == "ai":
        return "IA principal"
    if model_key[2:].isdigit():
        return f"IA {model_key[2:]}"
    return model_key.replace("_", " ").replace("-", " ").title()


def _model_folder_has_assets(model_folder: Path) -> bool:
    return model_folder.is_dir() and any(
        asset.suffix.lower() in MODEL_WEIGHT_EXTENSIONS
        for asset in model_folder.rglob("*")
        if asset.is_file()
    )


def _weight_paths(model_folder: Path) -> list[Path]:
    return sorted(
        (
            asset
            for asset in model_folder.rglob("*")
            if asset.is_file() and asset.suffix.lower() in MODEL_WEIGHT_EXTENSIONS
        ),
        key=lambda asset: str(asset).lower(),
    )


def listAvailableAiModels() -> list[dict[str, str]]:
    models = []
    for folder in sorted(BACKEND_DIR.iterdir(), key=lambda path: path.name.lower()):
        if not folder.is_dir():
            continue
        if not folder.name.startswith("ai") or not (folder.name == "ai" or folder.name[2:].isdigit()):
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
    img_array = np.array(image).astype(np.float32) / 255.0

    if img_array.ndim == 2:
        img_array = np.stack([img_array] * 3, axis=-1)
    elif img_array.shape[2] == 4:
        img_array = img_array[..., :3]

    input_tensor = image_to_tensor(img_array)

    ai_dir = Path(__file__).parent
    models = [load_model(str(ai_dir / p), ARCHITECTURE) for p in MODEL_PATHS]

    votes = []
    probabilities = []
    for model in models:
        class_idx, probs = predict(model, input_tensor)
        votes.append(class_idx)
        probabilities.append(probs)

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

    mean_probs = np.mean(np.stack(probabilities), axis=0)
    probabilities_dict = {CLASS_NAMES[i]: float(mean_probs[i]) for i in range(len(CLASS_NAMES))}

    return {
        "class": CLASS_NAMES[final_class],
        "class_index": final_class,
        "confidence": float(probabilities[selected_model_index][final_class]),
        "probabilities": probabilities_dict,
        "gradcam_path": output_path,
    }


def _predictPilWithWeights(image: Image.Image, model_folder: Path, output_path: str = None) -> dict:
    """Run a compatible EfficientNet checkpoint stored in an ``aiN`` folder."""
    if image is None:
        raise ValueError("No se recibió una imagen para la predicción")

    weight_paths = _weight_paths(model_folder)
    if not weight_paths:
        raise ValueError("La carpeta del modelo no contiene pesos .pt o .pth")

    img_array = np.asarray(image.convert("RGB"), dtype=np.float32) / 255.0
    input_tensor = image_to_tensor(img_array)
    models = [load_model(str(path), ARCHITECTURE) for path in weight_paths]

    votes = []
    probabilities = []
    for model in models:
        class_index, class_probabilities = predict(model, input_tensor)
        votes.append(class_index)
        probabilities.append(class_probabilities)

    vote_counts = Counter(votes)
    top_vote_count = vote_counts.most_common(1)[0][1]
    tied_classes = [class_index for class_index, count in vote_counts.items() if count == top_vote_count]
    mean_probabilities = np.mean(np.stack(probabilities), axis=0)
    final_class = (
        tied_classes[0]
        if len(tied_classes) == 1
        else max(tied_classes, key=lambda class_index: mean_probabilities[class_index])
    )

    selected_model = models[votes.index(final_class)]
    if output_path is None:
        output_path = str(model_folder / "prediction_gradcam.png")
    make_gradcam(selected_model, input_tensor, img_array, final_class, output_path)

    return {
        "class": CLASS_NAMES[final_class],
        "class_index": final_class,
        "confidence": float(mean_probabilities[final_class]),
        "probabilities": {
            CLASS_NAMES[index]: float(probability)
            for index, probability in enumerate(mean_probabilities)
        },
        "gradcam_path": output_path,
    }


def prepareAiModel(model_key: str) -> None:
    """Load model weights while transitions are closed, before activation."""
    normalized_key = str(model_key or "").strip()
    model_folder = BACKEND_DIR / normalized_key
    if normalized_key not in {model["modelKey"] for model in listAvailableAiModels()}:
        raise ValueError("El modelo seleccionado no está disponible")

    adapter_path = model_folder / "cargarModelo.py"
    if adapter_path.exists() and normalized_key != CURRENT_MODEL_KEY:
        importlib.invalidate_caches()
        try:
            module = importlib.import_module(f"backend.{normalized_key}.cargarModelo")
        except Exception as exc:
            raise ValueError("No se pudo preparar el módulo del modelo seleccionado") from exc
        prepare = getattr(module, "prepareAiModel", None)
        if callable(prepare):
            prepare()
            return
        if callable(getattr(module, "predictPil", None)):
            return
        raise ValueError("El adaptador del modelo no expone la función predictPil requerida")

    try:
        for weight_path in _weight_paths(model_folder):
            load_model(str(weight_path), ARCHITECTURE)
    except Exception as exc:
        raise ValueError("Los pesos del modelo no son compatibles con el motor de IA") from exc


def predictPil(image: Image.Image, output_path: str = None, model_key: str | None = None) -> dict:
    selected_model_key = (model_key or getActiveAiModelKey()).strip()

    if selected_model_key == CURRENT_MODEL_KEY:
        return _predictPilLocal(image, output_path=output_path)

    model_folder = BACKEND_DIR / selected_model_key
    adapter_path = model_folder / "cargarModelo.py"
    if adapter_path.exists():
        module = importlib.import_module(f"backend.{selected_model_key}.cargarModelo")
        if not callable(getattr(module, "predictPil", None)):
            raise RuntimeError(f"El modelo '{selected_model_key}' no expone predictPil")
        return module.predictPil(image, output_path=output_path)

    return _predictPilWithWeights(image, model_folder, output_path=output_path)
