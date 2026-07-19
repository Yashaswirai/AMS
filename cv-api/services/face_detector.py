"""
services/face_detector.py
Face detection using OpenCV (Haar Cascade + DNN) and MediaPipe Face Mesh.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import mediapipe as mp
import numpy as np

logger = logging.getLogger("frams.face_detector")

# ── Mediapipe globals ─────────────────────────────────────────────────────────
_mp_face_mesh = mp.solutions.face_mesh
_mp_drawing = mp.solutions.drawing_utils

# Mediapipe FaceMesh singleton (lazy initialised)
_face_mesh: Optional[mp.solutions.face_mesh.FaceMesh] = None

# OpenCV DNN model paths (will auto-download / skip if missing)
_DNN_PROTO = (
    Path(__file__).resolve().parent.parent
    / "models"
    / "deploy.prototxt"
)
_DNN_MODEL = (
    Path(__file__).resolve().parent.parent
    / "models"
    / "res10_300x300_ssd_iter_140000.caffemodel"
)


# ─────────────────────────────────────────────────────────────────────────────
# Haar Cascade helpers
# ─────────────────────────────────────────────────────────────────────────────

def load_face_cascade() -> cv2.CascadeClassifier:
    """Load OpenCV's built-in frontal-face Haar cascade."""
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    cascade = cv2.CascadeClassifier(cascade_path)
    if cascade.empty():
        raise RuntimeError(
            f"Failed to load Haar cascade from: {cascade_path}"
        )
    logger.debug("Haar cascade loaded from %s", cascade_path)
    return cascade


def detect_faces(
    image: np.ndarray,
    scale_factor: float = 1.1,
    min_neighbors: int = 5,
    min_size: Tuple[int, int] = (30, 30),
) -> List[Tuple[int, int, int, int]]:
    """
    Detect faces using Haar cascade.

    Parameters
    ----------
    image : np.ndarray
        BGR or grayscale image.
    scale_factor : float
        How much the image size is reduced at each scale.
    min_neighbors : int
        How many neighbours each rectangle should have to retain it.
    min_size : tuple
        Minimum possible object size.

    Returns
    -------
    List of (x, y, w, h) bounding boxes.
    """
    cascade = load_face_cascade()
    gray = (
        cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        if len(image.shape) == 3
        else image
    )
    gray = cv2.equalizeHist(gray)
    detections = cascade.detectMultiScale(
        gray,
        scaleFactor=scale_factor,
        minNeighbors=min_neighbors,
        minSize=min_size,
        flags=cv2.CASCADE_SCALE_IMAGE,
    )
    if len(detections) == 0:
        return []
    return [(int(x), int(y), int(w), int(h)) for x, y, w, h in detections]


# ─────────────────────────────────────────────────────────────────────────────
# OpenCV DNN helpers
# ─────────────────────────────────────────────────────────────────────────────

_dnn_net: Optional[cv2.dnn.Net] = None


def _download_file(url: str, target: Path) -> bool:
    """Download a file from *url* to *target* path."""
    import urllib.request
    try:
        logger.info("Downloading %s ...", url)
        target.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(url, str(target))
        logger.info("Successfully downloaded to %s", target)
        return True
    except Exception as exc:
        logger.warning("Failed to download %s: %s", url, exc)
        if target.exists():
            target.unlink()
        return False


def _ensure_dnn_models_exist() -> bool:
    """Ensure deploy.prototxt and caffemodel exist, downloading if missing."""
    proto_url = (
        "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt"
    )
    model_url = (
        "https://raw.githubusercontent.com/opencv/opencv_3rdparty/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel"
    )

    if not _DNN_PROTO.exists():
        _download_file(proto_url, _DNN_PROTO)
    if not _DNN_MODEL.exists():
        _download_file(model_url, _DNN_MODEL)

    return _DNN_PROTO.exists() and _DNN_MODEL.exists()


def _load_dnn_net() -> Optional[cv2.dnn.Net]:
    """Load the SSD face-detection DNN model (lazy singleton)."""
    global _dnn_net
    if _dnn_net is not None:
        return _dnn_net
    
    if not (_DNN_PROTO.exists() and _DNN_MODEL.exists()):
        _ensure_dnn_models_exist()

    if _DNN_PROTO.exists() and _DNN_MODEL.exists():
        try:
            _dnn_net = cv2.dnn.readNetFromCaffe(
                str(_DNN_PROTO), str(_DNN_MODEL)
            )
            logger.info("OpenCV DNN face model loaded.")
        except Exception as exc:
            logger.error("Failed to load Caffe model: %s", exc)
            _dnn_net = None
    else:
        logger.warning(
            "DNN model files not found at %s / %s. "
            "Falling back to Haar cascade for DNN calls.",
            _DNN_PROTO,
            _DNN_MODEL,
        )
    return _dnn_net


def detect_faces_dnn(
    image: np.ndarray,
    confidence_threshold: float = 0.5,
) -> List[Tuple[int, int, int, int]]:
    """
    Detect faces using the OpenCV SSD DNN model.
    Falls back to Haar cascade if the model is unavailable.

    Returns
    -------
    List of (x, y, w, h) bounding boxes (pixel coords).
    """
    net = _load_dnn_net()
    if net is None:
        return detect_faces(image)

    h, w = image.shape[:2]
    blob = cv2.dnn.blobFromImage(
        cv2.resize(image, (300, 300)),
        scalefactor=1.0,
        size=(300, 300),
        mean=(104.0, 177.0, 123.0),
        swapRB=False,
        crop=False,
    )
    net.setInput(blob)
    detections = net.forward()  # shape: (1, 1, N, 7)

    boxes: List[Tuple[int, int, int, int]] = []
    for i in range(detections.shape[2]):
        conf = float(detections[0, 0, i, 2])
        if conf < confidence_threshold:
            continue
        x1 = int(detections[0, 0, i, 3] * w)
        y1 = int(detections[0, 0, i, 4] * h)
        x2 = int(detections[0, 0, i, 5] * w)
        y2 = int(detections[0, 0, i, 6] * h)
        # Clamp to image boundaries
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        bw, bh = x2 - x1, y2 - y1
        if bw > 0 and bh > 0:
            boxes.append((x1, y1, bw, bh))
    return boxes


# ─────────────────────────────────────────────────────────────────────────────
# MediaPipe Face Mesh helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_face_mesh() -> mp.solutions.face_mesh.FaceMesh:
    """Lazy-initialise MediaPipe FaceMesh singleton."""
    global _face_mesh
    if _face_mesh is None:
        _face_mesh = _mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=10,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        logger.debug("MediaPipe FaceMesh initialised.")
    return _face_mesh


def get_face_landmarks(
    image: np.ndarray,
) -> List[List[Tuple[float, float, float]]]:
    """
    Detect faces and return 478 (or 468) landmarks per face using
    MediaPipe FaceMesh.

    Parameters
    ----------
    image : np.ndarray
        BGR image.

    Returns
    -------
    List of landmark lists.  Each landmark list contains
    (x_normalised, y_normalised, z_normalised) tuples.
    Returns an empty list if no face is found.
    """
    face_mesh = _get_face_mesh()
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(rgb)

    all_landmarks: List[List[Tuple[float, float, float]]] = []
    if not results.multi_face_landmarks:
        return all_landmarks

    for face_lm in results.multi_face_landmarks:
        landmarks = [
            (lm.x, lm.y, lm.z) for lm in face_lm.landmark
        ]
        all_landmarks.append(landmarks)
    return all_landmarks


def align_face(
    image: np.ndarray,
    landmarks: List[Tuple[float, float, float]],
    output_size: Tuple[int, int] = (112, 112),
) -> np.ndarray:
    """
    Align a face chip using eye-corner landmarks so that the eyes
    appear horizontal.

    Parameters
    ----------
    image : np.ndarray
        Full BGR image.
    landmarks : list
        478-element landmark list from get_face_landmarks().
    output_size : tuple
        (width, height) of the returned aligned face chip.

    Returns
    -------
    Aligned face as a BGR ndarray.
    """
    h, w = image.shape[:2]

    # MediaPipe landmark indices for left/right eye corners
    # Left eye outer corner: 33, inner: 133
    # Right eye inner corner: 362, outer: 263
    LEFT_EYE_OUTER = 33
    RIGHT_EYE_OUTER = 263

    def lm_px(idx: int) -> Tuple[float, float]:
        lm = landmarks[idx]
        return lm[0] * w, lm[1] * h

    left_eye = np.array(lm_px(LEFT_EYE_OUTER), dtype=np.float32)
    right_eye = np.array(lm_px(RIGHT_EYE_OUTER), dtype=np.float32)

    # Angle between eyes
    dy = right_eye[1] - left_eye[1]
    dx = right_eye[0] - left_eye[0]
    angle = float(np.degrees(np.arctan2(dy, dx)))

    # Centre of eyes
    eye_centre = ((left_eye + right_eye) / 2.0).astype(np.float32)

    # Rotation matrix
    M = cv2.getRotationMatrix2D(tuple(eye_centre), angle, scale=1.0)

    # Rotate full image
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_LINEAR)

    # Crop a square around the eye centre
    side = int(max(output_size) * 1.5)
    cx, cy = int(eye_centre[0]), int(eye_centre[1])
    x1 = max(0, cx - side // 2)
    y1 = max(0, cy - side // 2)
    x2 = min(w, x1 + side)
    y2 = min(h, y1 + side)
    crop = rotated[y1:y2, x1:x2]
    if crop.size == 0:
        crop = rotated

    return cv2.resize(crop, output_size)


def extract_face_roi(
    image: np.ndarray,
    bbox: Tuple[int, int, int, int],
    padding: float = 0.2,
) -> np.ndarray:
    """
    Extract the face region-of-interest (ROI) from *image* with optional
    proportional padding on each side.

    Parameters
    ----------
    image : np.ndarray
        Full BGR image.
    bbox : (x, y, w, h)
        Bounding box from detect_faces / detect_faces_dnn.
    padding : float
        Fractional padding applied to each side (0.2 = 20 %).

    Returns
    -------
    Cropped face ndarray (may be empty if bbox is out of bounds).
    """
    h_img, w_img = image.shape[:2]
    x, y, bw, bh = bbox

    pad_x = int(bw * padding)
    pad_y = int(bh * padding)

    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(w_img, x + bw + pad_x)
    y2 = min(h_img, y + bh + pad_y)

    return image[y1:y2, x1:x2].copy()
