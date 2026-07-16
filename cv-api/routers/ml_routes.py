"""
routers/ml_routes.py
Machine-learning prediction endpoints.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request, status
from pydantic import BaseModel, Field

from config import settings
from services import (
    attendance_predictor,
    cluster_analyzer,
    dropout_predictor,
    performance_predictor,
    risk_detector,
)
from utils.model_utils import load_model_metrics, save_model_metrics

logger = logging.getLogger("frams.ml_routes")

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class AttendancePredictRequest(BaseModel):
    student_id: str
    subject_id: Optional[str] = None
    day_of_week: int = Field(2, ge=0, le=6)
    month: int = Field(8, ge=1, le=12)
    semester: int = Field(1, ge=1, le=8)
    previous_rate: float = Field(75.0, ge=0.0, le=100.0)
    consecutive_absences: int = Field(0, ge=0)
    is_hostel: bool = False
    cgpa: float = Field(7.0, ge=0.0, le=10.0)
    distance_km: float = Field(5.0, ge=0.0)
    weather_score: float = Field(0.8, ge=0.0, le=1.0)
    subject_difficulty: float = Field(0.5, ge=0.0, le=1.0)
    time_slot: int = Field(0, ge=0, le=2)


class RiskPredictRequest(BaseModel):
    student_id: str
    current_percentage: float = Field(..., ge=0.0, le=100.0)
    trend_7d: float = 0.0
    trend_30d: float = 0.0
    consecutive_absences: int = 0
    total_classes: int = 100
    total_attended: int = 75
    cgpa: float = 7.0
    semester: int = 1
    is_hostel: bool = False
    distance_km: float = 5.0
    previous_semester_rate: float = 80.0
    warnings_issued: int = 0


class PerformancePredictRequest(BaseModel):
    student_id: str
    attendance_pct: float = Field(75.0, ge=0.0, le=100.0)
    attendance_pct_sem1: float = 75.0
    attendance_pct_sem2: float = 75.0
    consecutive_absences_max: int = 0
    num_medical_leaves: int = 0
    num_warnings: int = 0
    is_hostel: bool = False
    distance_km: float = 5.0
    cgpa_prev: float = 7.0
    club_activities: bool = False
    study_hours_per_day: float = 4.0
    library_visits_per_month: int = 4
    backlogs: int = 0


class DropoutPredictRequest(BaseModel):
    student_id: str
    attendance_pct: float = Field(75.0, ge=0.0, le=100.0)
    cgpa: float = 7.0
    num_backlogs: int = 0
    semester: int = 1
    num_warnings: int = 0
    consecutive_absences_max: int = 0
    trend_30d: float = 0.0
    is_hostel: bool = False
    distance_km: float = 5.0
    financial_aid: bool = False
    part_time_job: bool = False
    family_issues: bool = False
    previous_dropout_attempt: bool = False
    cgpa_drop_last_sem: float = 0.0
    mental_health_score: float = 7.0


class ClusteringRequest(BaseModel):
    students: List[Dict[str, Any]]
    n_clusters: Optional[int] = 4


class TrainRequest(BaseModel):
    data_path: Optional[str] = None  # CSV path; if None uses default generated data


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/predict/attendance", summary="Predict student absence probability")
async def predict_attendance(req: AttendancePredictRequest):
    """
    Predict whether a student will be absent for a specific session.
    """
    try:
        features = req.dict()
        result = attendance_predictor.predict(features)
        return {"student_id": req.student_id, **result}
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.exception("Attendance prediction error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/predict/risk", summary="Predict attendance risk level")
async def predict_risk(req: RiskPredictRequest):
    """
    Predict a student's attendance risk level (low / medium / high / critical).
    """
    try:
        result = risk_detector.predict_risk(req.dict())
        return {"student_id": req.student_id, **result}
    except Exception as exc:
        logger.exception("Risk prediction error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/predict/performance", summary="Predict academic performance from attendance")
async def predict_performance(req: PerformancePredictRequest):
    """
    Predict CGPA and grade based on attendance patterns.
    """
    try:
        result = performance_predictor.predict(req.dict())
        return {"student_id": req.student_id, **result}
    except Exception as exc:
        logger.exception("Performance prediction error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/predict/dropout", summary="Predict dropout risk")
async def predict_dropout(req: DropoutPredictRequest):
    """
    Predict the probability that a student will drop out or fail to
    complete the current semester.
    """
    try:
        result = dropout_predictor.predict_dropout(req.dict())
        return {"student_id": req.student_id, **result}
    except Exception as exc:
        logger.exception("Dropout prediction error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/clustering", summary="Cluster students by attendance patterns")
async def get_clustering(req: ClusteringRequest):
    """
    Perform K-Means clustering on a list of student attendance feature dicts.
    Returns cluster assignments and per-cluster insights.
    """
    try:
        df = pd.DataFrame(req.students)

        # Fill missing cluster features with defaults
        for col in cluster_analyzer.CLUSTER_FEATURES:
            if col not in df.columns:
                df[col] = 0.0

        # Determine optimal k if not specified
        n_clusters = req.n_clusters or 4
        X = df[cluster_analyzer.CLUSTER_FEATURES].fillna(0).values.astype(np.float32)

        if len(df) < n_clusters:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Number of students ({len(df)}) must be >= n_clusters ({n_clusters}).",
            )

        fit_result = cluster_analyzer.fit_clusters(df, n_clusters=n_clusters)
        insights = cluster_analyzer.get_cluster_insights(
            fit_result["labels"], df
        )

        # Assign labels back
        student_clusters = []
        for idx, student in enumerate(req.students):
            label = fit_result["labels"][idx]
            student_clusters.append(
                {
                    "student_id": student.get("student_id", str(idx)),
                    "cluster": label,
                    "cluster_label": cluster_analyzer.CLUSTER_LABELS.get(
                        label, f"Cluster {label}"
                    ),
                }
            )

        return {
            "n_clusters": n_clusters,
            "silhouette_score": fit_result["silhouette_score"],
            "inertia": fit_result["inertia"],
            "clusters": insights,
            "student_assignments": student_clusters,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Clustering error")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("/model-metrics", summary="Return evaluation metrics for all ML models")
async def get_model_metrics(request: Request):
    """Return cached training metrics for all ML models."""
    app_state = getattr(request.app.state, "app_state", {})
    metrics = app_state.get("model_metrics", {})

    if not metrics:
        # Try loading from disk
        metrics = load_model_metrics(settings.MODELS_DIR)

    if not metrics:
        return {
            "message": "No model metrics found. Run /ml/train first.",
            "models": {},
        }

    return {"models": metrics}


@router.post("/train", summary="Retrain all ML models")
async def train_models(
    req: TrainRequest,
    background_tasks: BackgroundTasks,
    request: Request,
):
    """
    Trigger retraining of all ML models.
    Runs in the background; returns immediately with a job ID.
    """
    data_path = req.data_path or str(
        settings.DATASET_DIR / "attendance_data.csv"
    )

    if not Path(data_path).exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                f"Training data not found at '{data_path}'. "
                "Run data/generate_sample_data.py first."
            ),
        )

    app_state = getattr(request.app.state, "app_state", {})

    def _run_training():
        try:
            logger.info("Starting model retraining from %s …", data_path)
            df = pd.read_csv(data_path)

            all_metrics: Dict[str, Any] = {}

            # ── Attendance predictor ──────────────────────────────────────────
            att_metrics = attendance_predictor.train(df)
            all_metrics["attendance_predictor"] = att_metrics
            logger.info("✅ Attendance predictor trained.")

            # ── Risk detector ─────────────────────────────────────────────────
            if "risk_level" in df.columns:
                risk_metrics = risk_detector.train(df)
                all_metrics["risk_detector"] = risk_metrics
                logger.info("✅ Risk detector trained.")

            # ── Performance predictor ─────────────────────────────────────────
            if "cgpa" in df.columns:
                perf_data = df.copy()
                # Map performance features
                for col in performance_predictor.FEATURE_COLUMNS:
                    if col not in perf_data.columns:
                        perf_data[col] = 0.0
                perf_metrics = performance_predictor.train(perf_data)
                all_metrics["performance_predictor"] = perf_metrics
                logger.info("✅ Performance predictor trained.")

            # ── Dropout predictor ─────────────────────────────────────────────
            if "dropped_out" in df.columns:
                drop_data = df.copy()
                for col in dropout_predictor.FEATURE_COLUMNS:
                    if col not in drop_data.columns:
                        drop_data[col] = 0.0
                drop_metrics = dropout_predictor.train(drop_data)
                all_metrics["dropout_predictor"] = drop_metrics
                logger.info("✅ Dropout predictor trained.")

            # ── Clustering ────────────────────────────────────────────────────
            for col in cluster_analyzer.CLUSTER_FEATURES:
                if col not in df.columns:
                    df[col] = 0.0
            cluster_result = cluster_analyzer.fit_clusters(df, n_clusters=4)
            all_metrics["cluster_analyzer"] = {
                "silhouette_score": cluster_result["silhouette_score"],
                "inertia": cluster_result["inertia"],
            }
            logger.info("✅ Clustering model fitted.")

            # Save metrics
            save_model_metrics(settings.MODELS_DIR, all_metrics)
            app_state["model_metrics"] = all_metrics
            app_state["models_loaded"] = True
            logger.info("🎉 All models trained and saved successfully.")

        except Exception as exc:
            logger.exception("Training failed: %s", exc)

    background_tasks.add_task(_run_training)

    return {
        "message": "Model training started in the background.",
        "data_path": data_path,
        "status": "running",
    }
