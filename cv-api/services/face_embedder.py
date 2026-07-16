"""
services/face_embedder.py
Generate 128-dimensional face embeddings using the face_recognition library
(dlib's ResNet-34 model under the hood).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional, Tuple

import numpy as np
import cv2

try:
    import face_recognition as fr
    _FR_AVAILABLE = True
except ImportError:
    fr = None  # type: ignore
    _FR_AVAILABLE = False
    logging.getLogger("frams.face_embedder").warning(
        "face_recognition library not available – embedding will fail. "
        "Install it with: pip install face-recognition"
    )

logger = logging.getLogger("frams.face_embedder")


# ─────────────────────────────────────────────────────────────────────────────
# Core embedding functions
# ─────────────────────────────────────────────────────────────────────────────

def generate_embedding(
    face_image: np.ndarray,
    model: str = "large",
) -> Optional[np.ndarray]:
    """
    Generate a 128-dim face embedding from a cropped face image.

    Parameters
    ----------
    face_image : np.ndarray
        BGR or RGB face image (should already be cropped/aligned).
    model : str
        'large' (more accurate) or 'small' (faster).

    Returns
    -------
    numpy array of shape (128,) or None if no face is found.
    """
    if not _FR_AVAILABLE:
        raise RuntimeError("face_recognition library is not installed.")

    # face_recognition expects RGB
    if len(face_image.shape) == 3 and face_image.shape[2] == 3:
        rgb = cv2.cvtColor(face_image, cv2.COLOR_BGR2RGB)
    else:
        rgb = face_image

    # Detect face locations first
    face_locations = fr.face_locations(rgb, model="hog")
    if not face_locations:
        # Try the whole image as a face
        h, w = rgb.shape[:2]
        face_locations = [(0, w, h, 0)]

    encodings = fr.face_encodings(rgb, known_face_locations=face_locations, model=model)
    if not encodings:
        logger.debug("No encoding generated for the provided image.")
        return None

    return np.array(encodings[0], dtype=np.float32)


def generate_embeddings_batch(
    images: List[np.ndarray],
    model: str = "large",
) -> List[Optional[np.ndarray]]:
    """
    Generate embeddings for a list of face images.

    Returns a list of the same length; entries are None where embedding
    generation failed.
    """
    results: List[Optional[np.ndarray]] = []
    for idx, img in enumerate(images):
        try:
            emb = generate_embedding(img, model=model)
            results.append(emb)
        except Exception as exc:
            logger.warning("Embedding failed for image %d: %s", idx, exc)
            results.append(None)
    return results


# ─────────────────────────────────────────────────────────────────────────────
# Persistence helpers
# ─────────────────────────────────────────────────────────────────────────────

def save_embeddings(
    student_id: str,
    embeddings: List[np.ndarray],
    base_dir: Path,
) -> Path:
    """
    Save a list of embeddings for *student_id* to a .npy file.

    The file is stored at ``base_dir / student_id.npy``.

    Parameters
    ----------
    student_id : str
    embeddings : list of np.ndarray, each shape (128,)
    base_dir : Path
        Directory in which to save (created if it doesn't exist).

    Returns
    -------
    Path to the saved .npy file.
    """
    base_dir = Path(base_dir)
    base_dir.mkdir(parents=True, exist_ok=True)

    valid = [e for e in embeddings if e is not None]
    if not valid:
        raise ValueError(f"No valid embeddings to save for student '{student_id}'.")

    arr = np.stack(valid, axis=0)  # shape: (N, 128)
    path = base_dir / f"{student_id}.npy"
    np.save(str(path), arr)
    logger.info("Saved %d embedding(s) for student '%s' → %s", len(valid), student_id, path)
    return path


def load_embeddings(path: Path) -> np.ndarray:
    """
    Load embeddings from a .npy file.

    Returns
    -------
    numpy array of shape (N, 128).
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Embeddings file not found: {path}")
    arr = np.load(str(path))
    if arr.ndim == 1:
        arr = arr[np.newaxis, :]  # treat as single embedding
    return arr.astype(np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# Quality metric
# ─────────────────────────────────────────────────────────────────────────────

def compute_embedding_quality(embedding: np.ndarray) -> float:
    """
    Heuristic quality score in [0, 1] for a single face embedding.

    Score is based on:
    * L2 norm proximity to expected range for face_recognition encodings
    * Standard deviation of embedding components (more spread = richer)
    * Non-zero ratio

    A score close to 1 indicates a likely clean, well-captured face.
    """
    if embedding is None or embedding.size == 0:
        return 0.0

    emb = embedding.astype(np.float64)

    # 1. L2 norm – face_recognition encodings should be near 1.0
    norm = float(np.linalg.norm(emb))
    norm_score = max(0.0, 1.0 - abs(norm - 1.0))

    # 2. Standard deviation – richer embeddings have higher std
    std = float(np.std(emb))
    std_score = min(std / 0.15, 1.0)  # typical std ≈ 0.10–0.15

    # 3. Non-zero ratio
    nz_ratio = float(np.count_nonzero(emb)) / emb.size

    quality = 0.4 * norm_score + 0.4 * std_score + 0.2 * nz_ratio
    return round(min(max(quality, 0.0), 1.0), 4)


def average_embedding(embeddings: List[np.ndarray]) -> np.ndarray:
    """Return the mean embedding (normalised to unit length) of a list."""
    valid = [e for e in embeddings if e is not None]
    if not valid:
        raise ValueError("No valid embeddings to average.")
    mean_emb = np.mean(np.stack(valid, axis=0), axis=0)
    norm = np.linalg.norm(mean_emb)
    if norm > 0:
        mean_emb /= norm
    return mean_emb.astype(np.float32)
