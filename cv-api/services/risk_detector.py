"""
services/risk_detector.py
Classify a student's attendance risk level as:
  low | medium | high | critical

Uses a GradientBoosting classifier with engineered risk features.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score, f1_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler

from config import settings

logger = logging.getLogger("frams.risk_detector")

_MODEL_PATH = settings.MODELS_DIR / "risk_detector.joblib"
_SCALER_PATH = settings.MODELS_DIR / "risk_scaler.joblib"
_ENCODER_PATH = settings.MODELS_DIR / "risk_label_encoder.joblib"

_model: Optional[GradientBoostingClassifier] = None
_scaler: Optional[StandardScaler] = None
_encoder: Optional[LabelEncoder] = None

RISK_LEVELS = ["low", "medium", "high", "critical"]

FEATURE_COLUMNS = [
    "current_percentage",     # current attendance %
    "trend_7d",               # 7-day trend (positive = improving)
    "trend_30d",              # 30-day trend
    "consecutive_absences",
    "total_classes",
    "total_attended",
    "cgpa",
    "semester",
    "is_hostel",
    "distance_km",
    "previous_semester_rate", # attendance % in previous semester
    "warnings_issued",        # number of attendance warnings received
]


# ─────────────────────────────────────────────────────────────────────────────
# Risk threshold logic
# ─────────────────────────────────────────────────────────────────────────────

def _attendance_to_risk(percentage: float) -> str:
    if percentage >= 85:
        return "low"
    elif percentage >= 75:
        return "medium"
    elif percentage >= 60:
        return "high"
    return "critical"


def _build_features(student_data: dict) -> np.ndarray:
    total = max(int(student_data.get("total_classes", 100)), 1)
    attended = int(student_data.get("total_attended", 75))
    pct = float(student_data.get("current_percentage", attended / total * 100))

    row = [
        pct,
        float(student_data.get("trend_7d", 0.0)),
        float(student_data.get("trend_30d", 0.0)),
        int(student_data.get("consecutive_absences", 0)),
        total,
        attended,
        float(student_data.get("cgpa", 7.0)),
        int(student_data.get("semester", 1)),
        int(bool(student_data.get("is_hostel", 0))),
        float(student_data.get("distance_km", 5.0)),
        float(student_data.get("previous_semester_rate", 80.0)),
        int(student_data.get("warnings_issued", 0)),
    ]
    return np.array(row, dtype=np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────────────────────

def train(data: pd.DataFrame, random_state: int = 42) -> Dict:
    """
    Train a GradientBoosting risk classifier.

    data must contain FEATURE_COLUMNS + 'risk_level' column
    (values: low / medium / high / critical).
    """
    global _model, _scaler, _encoder

    X = data[FEATURE_COLUMNS].values.astype(np.float32)
    le = LabelEncoder()
    le.fit(RISK_LEVELS)
    y = le.transform(data["risk_level"].values)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    clf = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        min_samples_split=10,
        subsample=0.8,
        random_state=random_state,
    )
    clf.fit(X_train_s, y_train)

    y_pred = clf.predict(X_test_s)
    cv_f1 = cross_val_score(clf, X_train_s, y_train, cv=5, scoring="f1_macro")

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "f1_macro": round(float(f1_score(y_test, y_pred, average="macro")), 4),
        "cv_f1_mean": round(float(cv_f1.mean()), 4),
        "cv_f1_std": round(float(cv_f1.std()), 4),
        "classes": le.classes_.tolist(),
        "report": classification_report(
            y_test, y_pred, target_names=le.classes_, output_dict=True
        ),
    }
    logger.info("Risk detector – Acc=%.4f  F1=%.4f", metrics["accuracy"], metrics["f1_macro"])

    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(clf, str(_MODEL_PATH))
    joblib.dump(scaler, str(_SCALER_PATH))
    joblib.dump(le, str(_ENCODER_PATH))

    _model, _scaler, _encoder = clf, scaler, le
    return metrics


# ─────────────────────────────────────────────────────────────────────────────
# Inference
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_loaded():
    global _model, _scaler, _encoder
    if _model is None:
        if _MODEL_PATH.exists():
            _model = joblib.load(str(_MODEL_PATH))
            _scaler = joblib.load(str(_SCALER_PATH))
            _encoder = joblib.load(str(_ENCODER_PATH))
        else:
            # Fall back to rule-based classification
            logger.warning(
                "Risk detector model not found – using rule-based fallback."
            )


def predict_risk(student_data: dict) -> Dict:
    """
    Predict risk level for a single student.

    Returns dict with keys:
        risk_level, score, factors, recommendation.
    """
    _ensure_loaded()

    pct = float(student_data.get("current_percentage", 75.0))
    consec = int(student_data.get("consecutive_absences", 0))

    factors: List[str] = []
    if pct < 75:
        factors.append(f"Attendance below 75% ({pct:.1f}%)")
    if consec >= 3:
        factors.append(f"{consec} consecutive absences")
    if float(student_data.get("trend_7d", 0.0)) < -5:
        factors.append("Declining 7-day attendance trend")
    if int(student_data.get("warnings_issued", 0)) >= 2:
        factors.append("Multiple attendance warnings issued")

    if _model is not None:
        X = _build_features(student_data).reshape(1, -1)
        X_s = _scaler.transform(X)
        pred_idx = int(_model.predict(X_s)[0])
        probs = _model.predict_proba(X_s)[0]
        risk_level = _encoder.inverse_transform([pred_idx])[0]
        score = round(float(probs[pred_idx]), 4)
    else:
        risk_level = _attendance_to_risk(pct)
        score = round(1.0 - pct / 100.0, 4)

    recommendations = {
        "low": "Maintain current attendance. Keep up the good work!",
        "medium": "Attendance is borderline. Avoid further absences.",
        "high": "Immediate improvement needed. Consult academic advisor.",
        "critical": "URGENT: At risk of detention. Attend all remaining classes.",
    }

    return {
        "risk_level": risk_level,
        "score": score,
        "factors": factors,
        "recommendation": recommendations.get(risk_level, ""),
    }


def batch_predict(students_data: List[dict]) -> List[Dict]:
    """Predict risk for a list of students."""
    return [predict_risk(s) for s in students_data]
