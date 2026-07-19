"""
services/face_recognizer.py
Match face embeddings using cosine similarity against a database of
known student embeddings stored on disk.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from scipy.spatial.distance import cosine

from config import settings
from services.face_detector import detect_faces_dnn, extract_face_roi
from services.face_embedder import generate_embedding, load_embeddings

logger = logging.getLogger("frams.face_recognizer")

# ── In-memory cache of known embeddings ──────────────────────────────────────
# Structure: { student_id: np.ndarray of shape (N, 128) }
_known_embeddings: Dict[str, np.ndarray] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Embedding database management
# ─────────────────────────────────────────────────────────────────────────────

def load_all_embeddings(
    embeddings_dir: Optional[Path] = None,
    force: bool = False,
) -> Dict[str, np.ndarray]:
    """
    Scan *embeddings_dir* for ``<student_id>.npy`` files and load them
    all into memory.

    Returns
    -------
    dict mapping student_id → ndarray of shape (N, 128).
    """
    global _known_embeddings
    if _known_embeddings and not force:
        return _known_embeddings

    directory = Path(embeddings_dir or settings.EMBEDDINGS_DIR)
    directory.mkdir(parents=True, exist_ok=True)

    loaded: Dict[str, np.ndarray] = {}
    for npy_file in directory.glob("*.npy"):
        student_id = npy_file.stem
        try:
            embs = load_embeddings(npy_file)
            loaded[student_id] = embs
            logger.debug(
                "Loaded %d embedding(s) for student '%s'.", len(embs), student_id
            )
        except Exception as exc:
            logger.warning("Failed to load '%s': %s", npy_file, exc)

    _known_embeddings = loaded
    logger.info("Total students in recognition DB: %d", len(loaded))
    return loaded


def update_known_embeddings(
    student_id: str,
    new_embedding: np.ndarray,
    embeddings_dir: Optional[Path] = None,
) -> None:
    """
    Append *new_embedding* to the in-memory cache and re-save the .npy
    file for *student_id*.
    """
    global _known_embeddings
    directory = Path(embeddings_dir or settings.EMBEDDINGS_DIR)
    directory.mkdir(parents=True, exist_ok=True)

    new_emb = np.array(new_embedding, dtype=np.float32)
    if new_emb.ndim == 1:
        new_emb = new_emb[np.newaxis, :]

    if student_id in _known_embeddings:
        _known_embeddings[student_id] = np.vstack(
            [_known_embeddings[student_id], new_emb]
        )
    else:
        _known_embeddings[student_id] = new_emb

    npy_path = directory / f"{student_id}.npy"
    np.save(str(npy_path), _known_embeddings[student_id])
    logger.info(
        "Updated embeddings for '%s' → %d total vector(s).",
        student_id,
        len(_known_embeddings[student_id]),
    )


def delete_student_embeddings(
    student_id: str,
    embeddings_dir: Optional[Path] = None,
) -> bool:
    """Delete embedding file and remove from cache. Returns True on success."""
    global _known_embeddings
    directory = Path(embeddings_dir or settings.EMBEDDINGS_DIR)
    npy_path = directory / f"{student_id}.npy"

    removed = _known_embeddings.pop(student_id, None) is not None
    if npy_path.exists():
        npy_path.unlink()
        logger.info("Deleted embedding file: %s", npy_path)
        return True
    return removed


# ─────────────────────────────────────────────────────────────────────────────
# Core recognition logic
# ─────────────────────────────────────────────────────────────────────────────

def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Return cosine similarity in [0, 1] (1 = identical)."""
    dist = cosine(a.flatten().astype(np.float64), b.flatten().astype(np.float64))
    return float(1.0 - dist)


def recognize_face(
    face_embedding: np.ndarray,
    known_embeddings: Optional[Dict[str, np.ndarray]] = None,
    threshold: float = 0.60,
) -> Tuple[Optional[str], float]:
    """
    Match *face_embedding* against all known embeddings.

    For each student, compute the maximum cosine similarity across all
    their stored embeddings; return the best match above *threshold*.

    Parameters
    ----------
    face_embedding : np.ndarray, shape (128,)
    known_embeddings : optional dict; defaults to the in-memory cache.
    threshold : float
        Minimum cosine-similarity required for a positive match.

    Returns
    -------
    (student_id, confidence) or (None, 0.0) if no match.
    """
    db = known_embeddings if known_embeddings is not None else _known_embeddings
    if not db:
        logger.warning("Recognition DB is empty – call load_all_embeddings() first.")
        return None, 0.0

    query = face_embedding.flatten().astype(np.float64)
    best_student: Optional[str] = None
    best_similarity: float = -1.0

    for student_id, embs in db.items():
        # embs: (N, 128)
        similarities = [
            _cosine_similarity(query, embs[i])
            for i in range(embs.shape[0])
        ]
        max_sim = max(similarities)
        if max_sim > best_similarity:
            best_similarity = max_sim
            best_student = student_id

    if best_similarity >= threshold:
        confidence = round(best_similarity, 4)
        logger.debug("Recognised '%s' with confidence %.4f", best_student, confidence)
        return best_student, confidence

    logger.debug(
        "No match (best similarity %.4f < threshold %.4f).",
        best_similarity,
        threshold,
    )
    return None, round(best_similarity, 4)


def recognize_faces_in_image(
    image: np.ndarray,
    threshold: float = 0.60,
    known_embeddings: Optional[Dict[str, np.ndarray]] = None,
) -> List[Dict]:
    """
    Full pipeline:  detect → embed → match.

    Parameters
    ----------
    image : np.ndarray
        BGR image (frame or still photo).
    threshold : float
        Cosine-similarity threshold.
    known_embeddings : optional dict; defaults to the in-memory cache.

    Returns
    -------
    List of dicts::

        {
            "student_id": str | None,
            "confidence": float,
            "bbox": [x, y, w, h],
            "matched": bool,
        }
    """
    # 1. Detect faces
    bboxes = detect_faces_dnn(image)
    if not bboxes:
        logger.debug("No faces detected in image.")
        return []

    results = []
    for bbox in bboxes:
        # 2. Extract ROI
        face_roi = extract_face_roi(image, bbox, padding=0.2)
        if face_roi.size == 0:
            continue

        # 3. Generate embedding
        embedding = generate_embedding(face_roi)
        if embedding is None:
            results.append(
                {
                    "student_id": None,
                    "confidence": 0.0,
                    "bbox": list(bbox),
                    "matched": False,
                    "error": "embedding_failed",
                }
            )
            continue

        # 4. Match
        student_id, confidence = recognize_face(
            embedding, known_embeddings=known_embeddings, threshold=threshold
        )

        results.append(
            {
                "student_id": student_id,
                "confidence": confidence,
                "bbox": list(bbox),
                "matched": student_id is not None,
            }
        )

    return results
