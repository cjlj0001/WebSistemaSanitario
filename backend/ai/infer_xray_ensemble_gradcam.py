from collections import Counter
from pathlib import Path
from threading import Lock

import numpy as np
import torch
import torch.nn as nn
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from torchvision import models, transforms


CLASS_NAMES = [
    "atelectasis",
    "effusion",
    "emphysema",
    "no finding",
    "nodule",
    "pneumonia",
    "pneumothorax"
]

MODEL_PATHS = [
    "best_model_fold_1.pt",
    "best_model_fold_2.pt",
    "best_model_fold_3.pt",
    "best_model_fold_4.pt",
    "best_model_fold_5.pt",
]

IMAGE_SIZE = 224
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
ARCHITECTURE = "efficientnet_v2_s"

# Los pesos no cambian entre peticiones. Recargarlos para cada subida consumía
# varios cientos de MB y hacía que las peticiones concurrentes agotasen la RAM.
_MODEL_CACHE: dict[tuple[str, str], nn.Module] = {}
_MODEL_CACHE_LOCK = Lock()


def build_model(architecture: str = ARCHITECTURE) -> nn.Module:
    def replace_classifier_head(model: nn.Module) -> nn.Module:
        classifier_layer = model.classifier[1]
        input_features = getattr(classifier_layer, "in_features", None)
        if input_features is None:
            input_features = classifier_layer.weight.shape[1]
        model.classifier[1] = nn.Linear(input_features, len(CLASS_NAMES))
        return model

    if architecture == "efficientnet_v2_s":
        model = models.efficientnet_v2_s(weights=None)
        return replace_classifier_head(model)

    if architecture == "efficientnet_b0":
        model = models.efficientnet_b0(weights=None)
        return replace_classifier_head(model)

    if architecture == "efficientnet_b1":
        model = models.efficientnet_b1(weights=None)
        return replace_classifier_head(model)

    if architecture == "efficientnet_b2":
        model = models.efficientnet_b2(weights=None)
        return replace_classifier_head(model)

    if architecture == "efficientnet_b3":
        model = models.efficientnet_b3(weights=None)
        return replace_classifier_head(model)

    raise ValueError(f"Unsupported architecture: {architecture}")


def extract_state_dict(checkpoint):
    if hasattr(checkpoint, "state_dict") and not isinstance(checkpoint, dict):
        return None

    if not isinstance(checkpoint, dict):
        return None

    for key in ("model_state_dict", "state_dict", "model", "net"):
        value = checkpoint.get(key)
        if isinstance(value, dict):
            return value

    if all(torch.is_tensor(value) for value in checkpoint.values()):
        return checkpoint

    raise RuntimeError(
        "Checkpoint dict found, but no state_dict key was recognized. "
        f"Available keys: {list(checkpoint.keys())}"
    )


def clean_state_dict_keys(state_dict):
    cleaned = {}
    for key, value in state_dict.items():
        if key.startswith("module."):
            key = key.removeprefix("module.")
        if key.startswith("model."):
            key = key.removeprefix("model.")
        cleaned[key] = value
    return cleaned


def load_model(path: str, architecture: str = ARCHITECTURE) -> nn.Module:
    path_obj = Path(path)
    if not path_obj.is_absolute():
        path_obj = Path(__file__).parent / path_obj

    if not path_obj.is_file():
        raise FileNotFoundError(f"No se encontró el archivo de modelo: {path_obj}")

    cache_key = (str(path_obj.resolve()), architecture)
    with _MODEL_CACHE_LOCK:
        cached_model = _MODEL_CACHE.get(cache_key)
        if cached_model is not None:
            return cached_model

        checkpoint = torch.load(path_obj, map_location=DEVICE)
        state_dict = extract_state_dict(checkpoint)

        if state_dict is None:
            model = checkpoint
        else:
            model = build_model(architecture)
            model.load_state_dict(clean_state_dict_keys(state_dict))

        model.to(DEVICE)
        model.eval()
        _MODEL_CACHE[cache_key] = model
        return model


def find_last_conv_layer(model: nn.Module) -> nn.Module:
    conv_layers = [module for module in model.modules() if isinstance(module, nn.Conv2d)]
    if not conv_layers:
        raise RuntimeError("No Conv2d layer found. Grad-CAM needs a convolutional layer.")
    return conv_layers[-1]


def read_dicom_image(dicom_path: str) -> np.ndarray:
    """
    Read and preprocess DICOM image for model inference.
    
    Args:
        dicom_path: Path to DICOM file
    
    Returns:
        Normalized RGB image as float32 in range [0, 1]
    """
    import pydicom
    import cv2
    
    ds = pydicom.dcmread(dicom_path)
    
    # Extract pixel array
    if hasattr(ds, "pixel_array"):
        pixel_array = ds.pixel_array.astype(np.float32)
    else:
        pixel_data = np.frombuffer(ds.PixelData, dtype=np.uint16)
        pixel_array = pixel_data.reshape(int(ds.Rows), int(ds.Columns)).astype(np.float32)
    
    # Apply RescaleSlope and RescaleIntercept if present (DICOM standard)
    if hasattr(ds, 'RescaleSlope') and hasattr(ds, 'RescaleIntercept'):
        slope = float(ds.RescaleSlope)
        intercept = float(ds.RescaleIntercept)
        pixel_array = pixel_array * slope + intercept
    
    # Handle PhotometricInterpretation (MONOCHROME1 = inverted)
    if hasattr(ds, 'PhotometricInterpretation'):
        if ds.PhotometricInterpretation == "MONOCHROME1":
            pixel_array = -pixel_array
    
    # Normalize to [0, 1]
    pixel_min = pixel_array.min()
    pixel_max = pixel_array.max()
    if pixel_max > pixel_min:
        pixel_array = (pixel_array - pixel_min) / (pixel_max - pixel_min)
    else:
        pixel_array = np.zeros_like(pixel_array)
    
    # Handle grayscale (convert to 3-channel RGB)
    if pixel_array.ndim == 2:
        rgb_array = np.stack([pixel_array, pixel_array, pixel_array], axis=-1)
    else:
        # Multi-channel: take first 3 channels
        rgb_array = pixel_array[..., :3]
    
    # Convert to uint8, resize, and back to float32
    uint8_array = (rgb_array * 255).astype(np.uint8)
    resized = cv2.resize(uint8_array, (IMAGE_SIZE, IMAGE_SIZE))
    
    return resized.astype(np.float32) / 255.0


def read_image_for_display(image_path: str) -> np.ndarray:
    """
    Read image (DICOM or PNG/JPG) and return normalized RGB image.
    
    Args:
        image_path: Path to image file (DICOM .dcm or standard formats)
    
    Returns:
        Normalized RGB image as float32 in range [0, 1]
    """
    path_obj = Path(image_path)
    ext = path_obj.suffix.lower()
    import cv2
    
    # Handle DICOM files
    if ext == ".dcm":
        return read_dicom_image(image_path)
    
    # Handle standard image formats (PNG, JPG, etc.)
    bgr = cv2.imread(image_path, cv2.IMREAD_COLOR)
    if bgr is None:
        raise FileNotFoundError(image_path)
    bgr = cv2.resize(bgr, (IMAGE_SIZE, IMAGE_SIZE))
    return cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0


def image_to_tensor(rgb_image: np.ndarray) -> torch.Tensor:
    preprocess = transforms.Compose(
        [
            transforms.ToTensor(),
            # Adjust this if training used different normalization.
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )
    return preprocess(rgb_image).unsqueeze(0).to(DEVICE)


@torch.no_grad()
def predict(model: nn.Module, input_tensor: torch.Tensor) -> tuple[int, np.ndarray]:
    logits = model(input_tensor)
    probs = torch.softmax(logits, dim=1)[0].detach().cpu().numpy()
    return int(probs.argmax()), probs


def make_gradcam(
    model: nn.Module,
    input_tensor: torch.Tensor,
    rgb_image: np.ndarray,
    class_index: int,
    output_path: str,
) -> None:
    import cv2

    target_layer = find_last_conv_layer(model)
    targets = [ClassifierOutputTarget(class_index)]

    with GradCAM(model=model, target_layers=[target_layer]) as cam:
        grayscale_cam = cam(input_tensor=input_tensor, targets=targets)[0]

    base_image = np.clip(rgb_image * 255, 0, 255).astype(np.uint8)
    # JET mantiene el contraste habitual azul-verde-rojo de los mapas de
    # atención. HOT fue introducido aquí y es el origen del aspecto amarillo.
    heatmap = cv2.applyColorMap(
        np.clip(grayscale_cam * 255, 0, 255).astype(np.uint8),
        cv2.COLORMAP_JET,
    )
    heatmap = cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB)
    visualization = cv2.addWeighted(base_image, 0.68, heatmap, 0.32, 0)
    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    written = cv2.imwrite(str(destination), cv2.cvtColor(visualization, cv2.COLOR_RGB2BGR))
    if not written or not destination.is_file() or destination.stat().st_size == 0:
        raise RuntimeError(f"No se pudo guardar la visualización Grad-CAM en {destination}")


def default_gradcam_path(image_path: str) -> str:
    path = Path(image_path)
    return str(path.with_name(f"{path.stem}_gradcam.png"))


def run(image_path: str, output_path: str | None = None, architecture: str = ARCHITECTURE) -> None:
    if output_path is None:
        output_path = default_gradcam_path(image_path)

    rgb_image = read_image_for_display(image_path)
    input_tensor = image_to_tensor(rgb_image)

    # 1) Load the 5 models
    models = [load_model(path, architecture) for path in MODEL_PATHS]

    # 2) Run prediction on each model and collect votes and probabilities
    votes = []
    probabilities = []
    for idx, model in enumerate(models, start=1):
        class_idx, probs = predict(model, input_tensor)
        votes.append(class_idx)
        probabilities.append(probs)
        print(f"model {idx}: {CLASS_NAMES[class_idx]} ({probs[class_idx]:.3f})")

    # 3) Majority voting
    vote_counts = Counter(votes)
    top_vote_count = vote_counts.most_common(1)[0][1]
    tied_classes = [class_idx for class_idx, count in vote_counts.items() if count == top_vote_count]

    if len(tied_classes) == 1:
        final_class = tied_classes[0]
    else:
        # tie-breaker: mean probability across models
        mean_probs = np.mean(np.stack(probabilities), axis=0)
        final_class = max(tied_classes, key=lambda class_idx: mean_probs[class_idx])

    # 4) Select a model that voted for the final class (first occurrence)
    selected_model_index = votes.index(final_class)
    selected_model = models[selected_model_index]

    # 5) Generate Grad-CAM using the selected model for the final class
    make_gradcam(selected_model, input_tensor, rgb_image, final_class, output_path)

    print(f"final: {CLASS_NAMES[final_class]}")
    print(f"gradcam model: {selected_model_index + 1}")
    print(f"gradcam saved: {Path(output_path).resolve()}")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("image", help="Path to the chest X-ray image")
    parser.add_argument(
        "--out",
        default=None,
        help="Output Grad-CAM image path. Defaults to original_name_gradcam.ext",
    )
    parser.add_argument("--arch", default=ARCHITECTURE, help="Model architecture")
    args = parser.parse_args()

    run(args.image, args.out, args.arch)
