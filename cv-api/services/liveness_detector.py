"""
services/liveness_detector.py
Anti-spoofing / liveness detection using:
  - Eye Aspect Ratio (EAR) for blink detection
  - Nose-tip displacement for head movement
  - Mouth Aspect Ratio (MAR) for smile detection
  - Frequency-domain texture analysis for a single-frame check
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

from services.face_detector import get_face_landmarks

logger = logging.getLogger("frams.liveness_detector")

# ── MediaPipe landmark indices (FaceMesh 478-point model) ─────────────────────
# Left eye
LEFT_EYE_UPPER = [159, 145]   # vertical pair 1
LEFT_EYE_LOWER = [158, 153]   # vertical pair 2
LEFT_EYE_CORNERS = [33, 133]  # horizontal

# Right eye
RIGHT_EYE_UPPER = [386, 374]
RIGHT_EYE_LOWER = [385, 380]
RIGHT_EYE_CORNERS = [362, 263]

# Nose tip
NOSE_TIP = 1

# Mouth
MOUTH_UPPER = [13, 14]
MOUTH_LOWER = [17, 18]
MOUTH_CORNERS = [61, 291]


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _lm_px(
    landmarks: List[Tuple[float, float, float]],
    idx: int,
    img_w: int,
    img_h: int,
) -> np.ndarray:
    """Convert normalised landmark to pixel coordinates."""
    lm = landmarks[idx]
    return np.array([lm[0] * img_w, lm[1] * img_h], dtype=np.float64)


def _eye_aspect_ratio(
    landmarks: List[Tuple[float, float, float]],
    upper_idx: List[int],
    lower_idx: List[int],
    corner_idx: List[int],
    img_w: int,
    img_h: int,
) -> float:
    """
    Compute the Eye Aspect Ratio (EAR):
        EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
    where p1..p6 are the six eye-contour points.
    """
    p1 = _lm_px(landmarks, corner_idx[0], img_w, img_h)
    p4 = _lm_px(landmarks, corner_idx[1], img_w, img_h)
    p2 = _lm_px(landmarks, upper_idx[0], img_w, img_h)
    p6 = _lm_px(landmarks, lower_idx[0], img_w, img_h)
    p3 = _lm_px(landmarks, upper_idx[1], img_w, img_h)
    p5 = _lm_px(landmarks, lower_idx[1], img_w, img_h)

    vertical_1 = np.linalg.norm(p2 - p6)
    vertical_2 = np.linalg.norm(p3 - p5)
    horizontal = np.linalg.norm(p1 - p4)

    if horizontal < 1e-6:
        return 0.0
    return float((vertical_1 + vertical_2) / (2.0 * horizontal))


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def detect_blink(
    landmarks: List[Tuple[float, float, float]],
    img_w: int = 640,
    img_h: int = 480,
    ear_threshold: float = 0.21,
) -> Dict:
    """
    Compute EAR for both eyes and decide whether a blink is occurring.

    Returns
    -------
    dict with keys: left_ear, right_ear, mean_ear, blink_detected.
    """
    left_ear = _eye_aspect_ratio(
        landmarks, LEFT_EYE_UPPER, LEFT_EYE_LOWER, LEFT_EYE_CORNERS, img_w, img_h
    )
    right_ear = _eye_aspect_ratio(
        landmarks, RIGHT_EYE_UPPER, RIGHT_EYE_LOWER, RIGHT_EYE_CORNERS, img_w, img_h
    )
    mean_ear = (left_ear + right_ear) / 2.0
    blink = mean_ear < ear_threshold

    return {
        "left_ear": round(left_ear, 4),
        "right_ear": round(right_ear, 4),
        "mean_ear": round(mean_ear, 4),
        "blink_detected": blink,
    }


def detect_head_movement(
    landmarks_sequence: List[List[Tuple[float, float, float]]],
    movement_threshold: float = 0.015,
) -> Dict:
    """
    Track nose-tip movement across a sequence of frames to detect head motion.

    Parameters
    ----------
    landmarks_sequence : list of per-frame landmark lists
    movement_threshold : float
        Minimum normalised displacement to count as movement.

    Returns
    -------
    dict with keys: max_displacement, head_movement_detected, direction.
    """
    if len(landmarks_sequence) < 2:
        return {
            "max_displacement": 0.0,
            "head_movement_detected": False,
            "direction": "none",
        }

    nose_positions = []
    for lm_list in landmarks_sequence:
        nose = lm_list[NOSE_TIP]
        nose_positions.append(np.array([nose[0], nose[1]], dtype=np.float64))

    displacements = [
        np.linalg.norm(nose_positions[i + 1] - nose_positions[i])
        for i in range(len(nose_positions) - 1)
    ]
    max_disp = float(max(displacements)) if displacements else 0.0

    # Determine dominant direction from first-to-last nose position
    delta = nose_positions[-1] - nose_positions[0]
    if abs(delta[0]) > abs(delta[1]):
        direction = "left" if delta[0] < 0 else "right"
    else:
        direction = "up" if delta[1] < 0 else "down"

    return {
        "max_displacement": round(max_disp, 6),
        "head_movement_detected": max_disp >= movement_threshold,
        "direction": direction if max_disp >= movement_threshold else "none",
    }


def detect_smile(
    landmarks: List[Tuple[float, float, float]],
    img_w: int = 640,
    img_h: int = 480,
    mar_threshold: float = 0.5,
) -> Dict:
    """
    Compute Mouth Aspect Ratio (MAR) and detect a smile / open mouth.

    Returns dict with keys: mar, smile_detected.
    """
    p_upper = np.mean(
        [_lm_px(landmarks, i, img_w, img_h) for i in MOUTH_UPPER], axis=0
    )
    p_lower = np.mean(
        [_lm_px(landmarks, i, img_w, img_h) for i in MOUTH_LOWER], axis=0
    )
    p_left = _lm_px(landmarks, MOUTH_CORNERS[0], img_w, img_h)
    p_right = _lm_px(landmarks, MOUTH_CORNERS[1], img_w, img_h)

    vertical = np.linalg.norm(p_upper - p_lower)
    horizontal = np.linalg.norm(p_left - p_right)

    mar = float(vertical / horizontal) if horizontal > 1e-6 else 0.0
    return {"mar": round(mar, 4), "smile_detected": mar >= mar_threshold}


def check_liveness(
    frame_sequence: List[np.ndarray],
    ear_threshold: float = 0.21,
    movement_threshold: float = 0.015,
) -> Dict:
    """
    Run full liveness check on a sequence of frames.

    Checks:
    1. Blink detection (EAR across frames)
    2. Head movement (nose tip displacement)
    3. Smile / mouth open detection

    Returns
    -------
    dict with keys: is_live, blink_detected, head_movement_detected,
                    smile_detected, confidence, details.
    """
    if not frame_sequence:
        return {
            "is_live": False,
            "blink_detected": False,
            "head_movement_detected": False,
            "smile_detected": False,
            "confidence": 0.0,
            "details": "No frames provided.",
        }

    all_landmarks = []
    for frame in frame_sequence:
        lm_lists = get_face_landmarks(frame)
        if lm_lists:
            all_landmarks.append(lm_lists[0])

    if not all_landmarks:
        return {
            "is_live": False,
            "blink_detected": False,
            "head_movement_detected": False,
            "smile_detected": False,
            "confidence": 0.0,
            "details": "No face landmarks detected in any frame.",
        }

    h, w = frame_sequence[0].shape[:2]

    # --- Blink check (look for at least one blink event) --------------------
    blink_events = 0
    prev_above_threshold = True
    for lm in all_landmarks:
        result = detect_blink(lm, img_w=w, img_h=h, ear_threshold=ear_threshold)
        if not result["blink_detected"] and not prev_above_threshold:
            blink_events += 1  # EAR went below then came back
        prev_above_threshold = not result["blink_detected"]

    blink_detected = blink_events >= 1 or any(
        detect_blink(lm, img_w=w, img_h=h, ear_threshold=ear_threshold)[
            "blink_detected"
        ]
        for lm in all_landmarks
    )

    # --- Head movement check -------------------------------------------------
    head_result = detect_head_movement(all_landmarks, movement_threshold)
    head_movement_detected = head_result["head_movement_detected"]

    # --- Smile check on last frame -------------------------------------------
    smile_result = detect_smile(all_landmarks[-1], img_w=w, img_h=h)
    smile_detected = smile_result["smile_detected"]

    # --- Confidence score ----------------------------------------------------
    checks_passed = sum([blink_detected, head_movement_detected, smile_detected])
    confidence = round(checks_passed / 3.0, 4)
    is_live = checks_passed >= 2  # at least 2 out of 3 checks must pass

    return {
        "is_live": is_live,
        "blink_detected": blink_detected,
        "head_movement_detected": head_movement_detected,
        "smile_detected": smile_detected,
        "confidence": confidence,
        "head_direction": head_result["direction"],
        "checks_passed": checks_passed,
        "details": (
            f"{checks_passed}/3 liveness checks passed."
        ),
    }


def simple_liveness_check(image: np.ndarray) -> Dict:
    """
    Single-frame liveness check using texture and frequency-domain analysis.

    Techniques:
    * Laplacian variance (blurry = possible printed photo)
    * FFT high-frequency energy ratio
    * Local Binary Pattern-like texture uniformity

    Returns
    -------
    dict with keys: is_live, blur_score, frequency_score, texture_score,
                    confidence.
    """
    gray = (
        cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if len(image.shape) == 3
        else image.copy()
    )

    # ── 1. Blur detection via Laplacian variance ───────────────────────────
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    # Typical live face: > 50; printed photo: usually < 30
    blur_score = min(laplacian_var / 150.0, 1.0)

    # ── 2. Frequency-domain high-energy ratio ─────────────────────────────
    f_transform = np.fft.fft2(gray.astype(np.float64))
    f_shift = np.fft.fftshift(f_transform)
    magnitude = np.abs(f_shift)
    total_energy = float(np.sum(magnitude))

    h_img, w_img = gray.shape
    cy, cx = h_img // 2, w_img // 2
    band = max(h_img, w_img) // 8
    high_freq = magnitude.copy()
    high_freq[cy - band : cy + band, cx - band : cx + band] = 0.0
    high_freq_energy = float(np.sum(high_freq))
    freq_score = min(high_freq_energy / (total_energy + 1e-9) / 0.5, 1.0)

    # ── 3. Texture uniformity (standard deviation of local blocks) ─────────
    block_size = 16
    stds = []
    for r in range(0, h_img - block_size, block_size):
        for c in range(0, w_img - block_size, block_size):
            block = gray[r : r + block_size, c : c + block_size]
            stds.append(float(np.std(block)))
    mean_std = float(np.mean(stds)) if stds else 0.0
    texture_score = min(mean_std / 40.0, 1.0)

    # ── Composite confidence ──────────────────────────────────────────────
    confidence = round(
        0.4 * blur_score + 0.3 * freq_score + 0.3 * texture_score, 4
    )
    is_live = confidence >= 0.45

    return {
        "is_live": is_live,
        "blur_score": round(blur_score, 4),
        "frequency_score": round(freq_score, 4),
        "texture_score": round(texture_score, 4),
        "confidence": confidence,
    }
