"""
services/dataset_generator.py
Auto-generate a face dataset for a student by capturing / preprocessing
multiple images and generating embeddings for each.
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np

from config import settings
from services.face_detector import detect_faces_dnn, extract_face_roi
from services.face_embedder import (
    generate_embedding,
    save_embeddings,
    compute_embedding_quality,
)

logger = logging.getLogger("frams.dataset_generator")


# ─────────────────────────────────────────────────────────────────────────────
# Image-list preprocessing
# ─────────────────────────────────────────────────────────────────────────────

def preprocess_images(
    images: List[np.ndarray],
    target_size: Tuple[int, int] = (224, 224),
) -> List[np.ndarray]:
    """
    For each raw image:
    1. Detect the largest face.
    2. Extract ROI with padding.
    3. Resize to *target_size*.
    4. Apply CLAHE equalisation.

    Returns a list of processed face crops (may be shorter than input
    if some images have no detectable face).
    """
    processed: List[np.ndarray] = []
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    for idx, img in enumerate(images):
        bboxes = detect_faces_dnn(img)
        if not bboxes:
            logger.warning("No face in image %d – skipping.", idx)
            continue

        # Pick the largest face
        bbox = max(bboxes, key=lambda b: b[2] * b[3])
        roi = extract_face_roi(img, bbox, padding=0.25)
        if roi.size == 0:
            continue

        resized = cv2.resize(roi, target_size)

        # CLAHE on L-channel of LAB
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        l_eq = clahe.apply(l_ch)
        lab_eq = cv2.merge([l_eq, a_ch, b_ch])
        enhanced = cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)

        processed.append(enhanced)

    logger.info("Preprocessed %d/%d images successfully.", len(processed), len(images))
    return processed


# ─────────────────────────────────────────────────────────────────────────────
# Dataset generation
# ─────────────────────────────────────────────────────────────────────────────

def generate_student_dataset(
    student_id: str,
    images: List[np.ndarray],
    embeddings_dir: Optional[Path] = None,
    min_quality: float = 0.3,
) -> dict:
    """
    Process a list of raw images for a student, generate embeddings,
    filter by quality, and save to disk.

    Parameters
    ----------
    student_id : str
    images : list of BGR ndarrays (raw uploads)
    embeddings_dir : Path | None
    min_quality : float
        Embeddings below this quality threshold are discarded.

    Returns
    -------
    dict with keys: student_id, saved, discarded, embedding_path, qualities.
    """
    directory = Path(embeddings_dir or settings.EMBEDDINGS_DIR)
    directory.mkdir(parents=True, exist_ok=True)

    # Step 1: preprocess
    processed = preprocess_images(images)
    if not processed:
        raise ValueError(
            f"No usable face images found for student '{student_id}'."
        )

    # Step 2: generate embeddings
    embeddings_with_quality: List[Tuple[np.ndarray, float]] = []
    for idx, face_img in enumerate(processed):
        emb = generate_embedding(face_img)
        if emb is None:
            logger.warning("Embedding generation failed for processed image %d.", idx)
            continue
        quality = compute_embedding_quality(emb)
        embeddings_with_quality.append((emb, quality))

    # Step 3: filter by quality
    good_embeddings = [
        (emb, q) for emb, q in embeddings_with_quality if q >= min_quality
    ]
    discarded = len(embeddings_with_quality) - len(good_embeddings)

    if not good_embeddings:
        raise ValueError(
            f"All embeddings for student '{student_id}' failed quality check "
            f"(threshold={min_quality})."
        )

    # Step 4: save
    emb_list = [emb for emb, _ in good_embeddings]
    qualities = [round(q, 4) for _, q in good_embeddings]
    path = save_embeddings(student_id, emb_list, directory)

    return {
        "student_id": student_id,
        "saved": len(good_embeddings),
        "discarded": discarded,
        "embedding_path": str(path),
        "qualities": qualities,
        "mean_quality": round(float(np.mean(qualities)), 4),
    }


def delete_student_dataset(
    student_id: str,
    embeddings_dir: Optional[Path] = None,
) -> bool:
    """Remove the student's .npy embedding file. Returns True if deleted."""
    directory = Path(embeddings_dir or settings.EMBEDDINGS_DIR)
    npy_path = directory / f"{student_id}.npy"
    if npy_path.exists():
        npy_path.unlink()
        logger.info("Deleted dataset for student '%s'.", student_id)
        return True
    return False


def get_dataset_info(
    student_id: str,
    embeddings_dir: Optional[Path] = None,
) -> Optional[dict]:
    """
    Return metadata about a student's stored dataset, or None if not found.
    """
    directory = Path(embeddings_dir or settings.EMBEDDINGS_DIR)
    npy_path = directory / f"{student_id}.npy"
    if not npy_path.exists():
        return None

    arr = np.load(str(npy_path))
    stat = npy_path.stat()
    return {
        "student_id": student_id,
        "num_embeddings": int(arr.shape[0]) if arr.ndim == 2 else 1,
        "file_size_bytes": stat.st_size,
        "last_modified": stat.st_mtime,
        "embedding_path": str(npy_path),
    }


def list_registered_students(embeddings_dir: Optional[Path] = None) -> List[str]:
    """Return sorted list of student IDs that have embeddings on disk."""
    directory = Path(embeddings_dir or settings.EMBEDDINGS_DIR)
    directory.mkdir(parents=True, exist_ok=True)
    return sorted(p.stem for p in directory.glob("*.npy"))
