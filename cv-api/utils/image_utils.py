"""
utils/image_utils.py
Image preprocessing utilities for face recognition pipelines.
"""

from __future__ import annotations

import base64
import io
import logging
from typing import List, Optional, Tuple

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger("frams.image_utils")


# ─────────────────────────────────────────────────────────────────────────────
# Format conversions
# ─────────────────────────────────────────────────────────────────────────────

def bytes_to_bgr(image_bytes: bytes) -> np.ndarray:
    """Convert raw image bytes → BGR ndarray (OpenCV format)."""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)


def bgr_to_base64(image: np.ndarray, ext: str = ".jpg") -> str:
    """Encode a BGR ndarray to a base64 string."""
    success, buf = cv2.imencode(ext, image)
    if not success:
        raise ValueError("Failed to encode image.")
    return base64.b64encode(buf.tobytes()).decode("utf-8")


def base64_to_bgr(b64_string: str) -> np.ndarray:
    """Decode a base64 image string → BGR ndarray."""
    img_bytes = base64.b64decode(b64_string)
    return bytes_to_bgr(img_bytes)


def bgr_to_rgb(image: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def rgb_to_bgr(image: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(image, cv2.COLOR_RGB2BGR)


# ─────────────────────────────────────────────────────────────────────────────
# Resizing & normalisation
# ─────────────────────────────────────────────────────────────────────────────

def resize_with_aspect(
    image: np.ndarray,
    max_dim: int = 640,
    interpolation: int = cv2.INTER_AREA,
) -> np.ndarray:
    """
    Resize image so its largest dimension equals *max_dim* while preserving
    aspect ratio.
    """
    h, w = image.shape[:2]
    if max(h, w) <= max_dim:
        return image
    scale = max_dim / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(image, (new_w, new_h), interpolation=interpolation)


def normalise_pixel(image: np.ndarray) -> np.ndarray:
    """Normalise pixel values to [0.0, 1.0] as float32."""
    return image.astype(np.float32) / 255.0


def standardise_image(
    image: np.ndarray,
    mean: Tuple[float, float, float] = (0.485, 0.456, 0.406),
    std: Tuple[float, float, float] = (0.229, 0.224, 0.225),
) -> np.ndarray:
    """
    Channel-wise standardisation (ImageNet stats by default).
    Expects float32 RGB image in [0, 1].
    """
    img = image.astype(np.float32)
    for c in range(3):
        img[:, :, c] = (img[:, :, c] - mean[c]) / std[c]
    return img


# ─────────────────────────────────────────────────────────────────────────────
# Enhancement
# ─────────────────────────────────────────────────────────────────────────────

def apply_clahe(image: np.ndarray, clip_limit: float = 2.0) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalisation) to the
    L-channel of a BGR image.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_ch, a_ch, b_ch = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
    l_eq = clahe.apply(l_ch)
    lab_eq = cv2.merge([l_eq, a_ch, b_ch])
    return cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)


def denoise(image: np.ndarray, strength: int = 10) -> np.ndarray:
    """Apply non-local means denoising."""
    return cv2.fastNlMeansDenoisingColored(image, None, strength, strength, 7, 21)


def sharpen(image: np.ndarray) -> np.ndarray:
    """Apply an unsharp-mask sharpening kernel."""
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]], dtype=np.float32)
    return cv2.filter2D(image, -1, kernel)


# ─────────────────────────────────────────────────────────────────────────────
# Quality assessment
# ─────────────────────────────────────────────────────────────────────────────

def blur_score(image: np.ndarray) -> float:
    """
    Return the Laplacian variance as a sharpness proxy.
    Higher = sharper (typical sharp face: > 50).
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def brightness_score(image: np.ndarray) -> float:
    """Return mean pixel brightness in [0, 255]."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    return float(np.mean(gray))


def is_image_usable(
    image: np.ndarray,
    min_blur: float = 20.0,
    min_brightness: float = 30.0,
    max_brightness: float = 230.0,
) -> Tuple[bool, str]:
    """
    Quick usability check:
    * Not too blurry
    * Brightness within acceptable range

    Returns (is_usable, reason).
    """
    b = blur_score(image)
    if b < min_blur:
        return False, f"Image too blurry (score={b:.1f} < {min_blur})"

    brightness = brightness_score(image)
    if brightness < min_brightness:
        return False, f"Image too dark (brightness={brightness:.1f})"
    if brightness > max_brightness:
        return False, f"Image too bright / overexposed (brightness={brightness:.1f})"

    return True, "ok"


# ─────────────────────────────────────────────────────────────────────────────
# Drawing utilities
# ─────────────────────────────────────────────────────────────────────────────

def draw_bounding_boxes(
    image: np.ndarray,
    bboxes: List[Tuple[int, int, int, int]],
    labels: Optional[List[str]] = None,
    color: Tuple[int, int, int] = (0, 255, 0),
    thickness: int = 2,
) -> np.ndarray:
    """Draw bounding boxes (and optional labels) on a copy of *image*."""
    out = image.copy()
    for idx, (x, y, w, h) in enumerate(bboxes):
        cv2.rectangle(out, (x, y), (x + w, y + h), color, thickness)
        if labels and idx < len(labels):
            cv2.putText(
                out,
                labels[idx],
                (x, max(y - 8, 0)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.55,
                color,
                thickness,
            )
    return out
