"""
services/face_aligner.py
Standalone face-alignment utilities (wraps face_detector.align_face
and adds additional geometry helpers).
"""

from __future__ import annotations

import logging
from typing import List, Optional, Tuple

import cv2
import numpy as np

from services.face_detector import get_face_landmarks, align_face, extract_face_roi

logger = logging.getLogger("frams.face_aligner")


def align_face_from_image(
    image: np.ndarray,
    output_size: Tuple[int, int] = (112, 112),
) -> Optional[np.ndarray]:
    """
    Detect landmarks in *image* and return an aligned face chip.

    Returns None if no face / landmarks found.
    """
    all_landmarks = get_face_landmarks(image)
    if not all_landmarks:
        logger.debug("No landmarks found for alignment.")
        return None

    # Use the first (largest) detected face
    landmarks = all_landmarks[0]
    return align_face(image, landmarks, output_size=output_size)


def align_faces_batch(
    images: List[np.ndarray],
    output_size: Tuple[int, int] = (112, 112),
) -> List[Optional[np.ndarray]]:
    """
    Align a batch of face images.  Returns a list of the same length;
    entries are None where alignment failed.
    """
    return [align_face_from_image(img, output_size=output_size) for img in images]


def normalise_face(face: np.ndarray) -> np.ndarray:
    """
    Convert to RGB, resize to 112×112 and normalise pixel values to [0, 1].
    """
    if face is None:
        raise ValueError("Cannot normalise a None image.")
    rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB) if len(face.shape) == 3 else face
    resized = cv2.resize(rgb, (112, 112))
    return resized.astype(np.float32) / 255.0


def compute_face_area(bbox: Tuple[int, int, int, int]) -> int:
    """Return the pixel area of a bounding box (w × h)."""
    _, _, w, h = bbox
    return w * h


def select_largest_face(
    bboxes: List[Tuple[int, int, int, int]]
) -> Optional[Tuple[int, int, int, int]]:
    """Return the bounding-box with the largest area, or None."""
    if not bboxes:
        return None
    return max(bboxes, key=compute_face_area)


def crop_and_align(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int],
    output_size: Tuple[int, int] = (112, 112),
    padding: float = 0.2,
) -> np.ndarray:
    """
    Extract ROI with padding then attempt landmark-based alignment.
    Falls back to simple resize if alignment fails.
    """
    roi = extract_face_roi(image, bbox, padding=padding)
    aligned = align_face_from_image(roi, output_size=output_size)
    if aligned is None:
        aligned = cv2.resize(roi, output_size)
    return aligned
