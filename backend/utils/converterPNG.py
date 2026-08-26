import io

import numpy as np
import pydicom
from PIL import Image


def _normalize_grayscale(dataset, pixels: np.ndarray) -> np.ndarray:
    values = pixels.astype(np.float32)
    values = values * float(getattr(dataset, "RescaleSlope", 1) or 1) + float(getattr(dataset, "RescaleIntercept", 0) or 0)

    center = getattr(dataset, "WindowCenter", None)
    width = getattr(dataset, "WindowWidth", None)
    if center is not None and width is not None:
        center = float(np.asarray(center).flat[0])
        width = max(float(np.asarray(width).flat[0]), 1.0)
        values = np.clip((values - (center - width / 2)) / width, 0, 1)
    else:
        low, high = np.percentile(values, (1, 99))
        if high > low:
            values = np.clip((values - low) / (high - low), 0, 1)
        else:
            values = np.zeros_like(values)

    if str(getattr(dataset, "PhotometricInterpretation", "")).upper() == "MONOCHROME1":
        values = 1 - values

    gray = (values * 255).astype(np.uint8)
    return np.repeat(gray[..., None], 3, axis=-1)


def _decodeDicomToRgbArray(dataset) -> np.ndarray:
    try:
        pixels = np.asarray(dataset.pixel_array)
    except Exception as exc:
        raise ValueError(f"No se pudieron leer los píxeles DICOM: {exc}") from exc

    if pixels.ndim == 4:
        pixels = pixels[0]
    if pixels.ndim == 2:
        return _normalize_grayscale(dataset, pixels)

    if pixels.ndim != 3:
        raise ValueError("El DICOM no contiene una imagen compatible")

    if pixels.shape[0] in (3, 4) and pixels.shape[-1] not in (3, 4):
        pixels = np.moveaxis(pixels, 0, -1)
    rgb = pixels[..., :3].astype(np.float32)

    # DICOM puede guardar color con 8 o 16 bits. Se normaliza cada archivo sin
    # truncar bytes, que era el origen de previsualizaciones negras o azuladas.
    max_value = float(np.iinfo(pixels.dtype).max) if np.issubdtype(pixels.dtype, np.integer) else float(rgb.max() or 1)
    if max_value > 0:
        rgb = rgb / max_value

    if str(getattr(dataset, "PhotometricInterpretation", "")).upper().startswith("YBR"):
        y = rgb[..., 0]
        cb = rgb[..., 1] - 0.5
        cr = rgb[..., 2] - 0.5
        rgb = np.stack([y + 1.402 * cr, y - 0.344136 * cb - 0.714136 * cr, y + 1.772 * cb], axis=-1)

    return (np.clip(rgb, 0, 1) * 255).astype(np.uint8)


def dicomBytesToPngBytes(dicomBytes: bytes) -> bytes:
    dataset = pydicom.dcmread(io.BytesIO(dicomBytes), force=True)
    buffer = io.BytesIO()
    Image.fromarray(_decodeDicomToRgbArray(dataset), mode="RGB").save(buffer, format="PNG")
    return buffer.getvalue()


def dicomFileToPilRgb(path: str) -> Image.Image:
    dataset = pydicom.dcmread(path, force=True)
    return Image.fromarray(_decodeDicomToRgbArray(dataset), mode="RGB")
