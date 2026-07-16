"""
routers/face_routes.py
All face-recognition related API endpoints.
"""

from __future__ import annotations

import io
import logging
from typing import List, Optional

import cv2
import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from PIL import Image

from config import settings
from services.dataset_generator import (
    delete_student_dataset,
    generate_student_dataset,
    get_dataset_info,
    list_registered_students,
)
from services.face_detector import detect_faces_dnn, get_face_landmarks
from services.face_recognizer import (
    load_all_embeddings,
    recognize_faces_in_image,
)
from services.liveness_detector import check_liveness, simple_liveness_check

logger = logging.getLogger("frams.face_routes")

router = APIRouter(prefix="/face", tags=["Face Recognition"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

async def _read_image(upload: UploadFile) -> np.ndarray:
    """Read an uploaded image file into a BGR OpenCV ndarray."""
    contents = await upload.read()
    pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
    bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    return bgr


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/detect", summary="Detect faces in an uploaded image")
async def detect_faces_endpoint(
    image: UploadFile = File(..., description="Image file (jpg/png)"),
    confidence: float = 0.5,
):
    """
    Detect all faces in the uploaded image.

    Returns a list of bounding boxes with confidence scores.
    """
    try:
        img = await _read_image(image)
        h, w = img.shape[:2]
        bboxes = detect_faces_dnn(img, confidence_threshold=confidence)

        faces = []
        for idx, (x, y, bw, bh) in enumerate(bboxes):
            faces.append(
                {
                    "id": idx,
                    "x": x,
                    "y": y,
                    "width": bw,
                    "height": bh,
                    "area": bw * bh,
                    "centre": [x + bw // 2, y + bh // 2],
                }
            )

        return {
            "image_width": w,
            "image_height": h,
            "face_count": len(faces),
            "faces": faces,
        }
    except Exception as exc:
        logger.exception("Face detection failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )


@router.post("/register", summary="Register a student's face embeddings")
async def register_face(
    student_id: str = Form(..., description="Unique student identifier"),
    images: List[UploadFile] = File(..., description="2–10 face images"),
    min_quality: float = Form(0.3, description="Minimum embedding quality threshold"),
):
    """
    Accept multiple images for a student, generate face embeddings,
    apply quality filtering, and save to disk.
    """
    if not student_id.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="student_id cannot be empty.",
        )
    if len(images) < 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least 1 image is required.",
        )

    try:
        img_list: List[np.ndarray] = []
        for upload in images:
            img_list.append(await _read_image(upload))

        result = generate_student_dataset(
            student_id=student_id.strip(),
            images=img_list,
            embeddings_dir=settings.EMBEDDINGS_DIR,
            min_quality=min_quality,
        )

        # Refresh in-memory embeddings
        load_all_embeddings()

        return {
            "success": True,
            "message": f"Registered {result['saved']} embedding(s) for student '{student_id}'.",
            **result,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as exc:
        logger.exception("Face registration failed for student '%s'", student_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        )


@router.post("/recognize", summary="Recognise all faces in an image")
async def recognize_face_endpoint(
    image: UploadFile = File(..., description="Image containing one or more faces"),
    threshold: float = Form(0.6, description="Cosine-similarity threshold (0–1)"),
):
    """
    Detect all faces in the image, generate embeddings, and match against
    the stored student database.

    Returns a list of matches with student_id, confidence, and bounding box.
    """
    try:
        img = await _read_image(image)

        # Ensure embeddings are loaded
        known = load_all_embeddings()
        if not known:
            return {
                "matches": [],
                "message": "No registered students found. Please register faces first.",
            }

        matches = recognize_faces_in_image(
            img, threshold=threshold, known_embeddings=known
        )
        return {
            "face_count": len(matches),
            "matched_count": sum(1 for m in matches if m["matched"]),
            "matches": matches,
        }
    except Exception as exc:
        logger.exception("Face recognition failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        )


@router.post("/liveness", summary="Check liveness of face(s) in uploaded image/frames")
async def liveness_check_endpoint(
    images: List[UploadFile] = File(
        ...,
        description="1 or more frames for liveness check (single image → texture analysis only)",
    ),
):
    """
    Run anti-spoofing liveness detection.

    * Single image → frequency-domain + texture analysis.
    * Multiple frames → full EAR blink + head-movement + smile checks.
    """
    try:
        frames: List[np.ndarray] = []
        for upload in images:
            frames.append(await _read_image(upload))

        if len(frames) == 1:
            result = simple_liveness_check(frames[0])
            result["method"] = "single_frame_texture_analysis"
        else:
            result = check_liveness(frames)
            result["method"] = "multi_frame_landmark_analysis"

        return result

    except Exception as exc:
        logger.exception("Liveness check failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        )


@router.delete(
    "/dataset/{student_id}",
    summary="Delete a student's face dataset",
)
async def delete_dataset(student_id: str):
    """Remove all stored face embeddings for the given student."""
    deleted = delete_student_dataset(
        student_id, embeddings_dir=settings.EMBEDDINGS_DIR
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No dataset found for student '{student_id}'.",
        )

    # Refresh in-memory cache
    load_all_embeddings()
    return {"success": True, "message": f"Dataset for '{student_id}' deleted."}


@router.get(
    "/dataset/{student_id}",
    summary="Get dataset information for a student",
)
async def get_dataset(student_id: str):
    """Return metadata about a student's stored face dataset."""
    info = get_dataset_info(student_id, embeddings_dir=settings.EMBEDDINGS_DIR)
    if info is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No dataset found for student '{student_id}'.",
        )
    return info


@router.get("/registered-students", summary="List all students with registered faces")
async def list_students():
    """Return a list of all student IDs that have face embeddings on disk."""
    students = list_registered_students(embeddings_dir=settings.EMBEDDINGS_DIR)
    return {
        "count": len(students),
        "student_ids": students,
    }
