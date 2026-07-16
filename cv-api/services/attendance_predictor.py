"""
services/attendance_predictor.py
Predict whether a student will be absent for a given class session.
Uses an ensemble of RandomForest + XGBoost; the best model by F1-score
is saved and used for inference.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    classification_report,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

try:
    from xgboost import XGBClassifier
    _XGB_AVAILABLE = True
except ImportError:
    _XGB_AVAILABLE = False

from config import settings

logger = logging.getLogger("frams.attendance_predictor")

_MODEL_PATH = settings.MODELS_DIR / "attendance_predictor.joblib"
_SCALER_PATH = settings.MODELS_DIR / "attendance_scaler.joblib"

# Module-level loaded model
_model: Optional[object] = None
_scaler: Optional[StandardScaler] = None

FEATURE_COLUMNS = [
    "day_of_week",      # 0=Mon … 6=Sun
    "month",            # 1–12
    "semester",         # 1–8
    "previous_rate",    # attendance % in previous period (0–100)
    "consecutive_absences",
    "is_hostel",        # 1 if hostel resident
    "cgpa",             # 0.0–10.0
    "distance_km",      # distance from home
    "weather_score",    # 0–1, bad=0
    "monday_factor",    # 1 if Mon else 0
    "friday_factor",    # 1 if Fri else 0
    "subject_difficulty", # 0–1
    "time_slot",        # 0=morning, 1=afternoon, 2=evening
]


# ─────────────────────────────────────────────────────────────────────────────
# Feature engineering
# ─────────────────────────────────────────────────────────────────────────────

def generate_features(student_data: dict) -> np.ndarray:
    """
    Convert raw student / session data into a feature vector aligned with
    FEATURE_COLUMNS.

    Missing values are filled with sensible defaults.
    """
    row = {
        "day_of_week": int(student_data.get("day_of_week", 2)),
        "month": int(student_data.get("month", 8)),
        "semester": int(student_data.get("semester", 1)),
        "previous_rate": float(student_data.get("previous_rate", 75.0)),
        "consecutive_absences": int(student_data.get("consecutive_absences", 0)),
        "is_hostel": int(bool(student_data.get("is_hostel", 0))),
        "cgpa": float(student_data.get("cgpa", 7.0)),
        "distance_km": float(student_data.get("distance_km", 5.0)),
        "weather_score": float(student_data.get("weather_score", 0.8)),
        "monday_factor": int(student_data.get("day_of_week", 2) == 0),
        "friday_factor": int(student_data.get("day_of_week", 2) == 4),
        "subject_difficulty": float(student_data.get("subject_difficulty", 0.5)),
        "time_slot": int(student_data.get("time_slot", 0)),
    }
    return np.array([row[col] for col in FEATURE_COLUMNS], dtype=np.float32)


# ─────────────────────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────────────────────

def train(data: pd.DataFrame, random_state: int = 42) -> Dict:
    """
    Train RandomForest and (if available) XGBoost classifiers.
    Select the best by ROC-AUC and save to disk.

    Parameters
    ----------
    data : pd.DataFrame
        Must contain FEATURE_COLUMNS + 'is_absent' column.

    Returns
    -------
    dict with training metrics for both models + winner.
    """
    X = data[FEATURE_COLUMNS].values.astype(np.float32)
    y = data["is_absent"].values.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    candidates = {
        "RandomForest": RandomForestClassifier(
            n_estimators=200,
            max_depth=12,
            min_samples_split=5,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        ),
    }
    if _XGB_AVAILABLE:
        candidates["XGBoost"] = XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.8,
            colsample_bytree=0.8,
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=random_state,
        )

    results: Dict[str, Dict] = {}
    best_auc = -1.0
    best_name = None
    best_clf = None

    for name, clf in candidates.items():
        clf.fit(X_train_s, y_train)
        y_pred = clf.predict(X_test_s)
        y_prob = clf.predict_proba(X_test_s)[:, 1]

        cv_scores = cross_val_score(
            clf, X_train_s, y_train, cv=5, scoring="roc_auc", n_jobs=-1
        )

        metrics = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
            "cv_auc_mean": round(float(cv_scores.mean()), 4),
            "cv_auc_std": round(float(cv_scores.std()), 4),
        }
        results[name] = metrics
        logger.info("[%s] ROC-AUC=%.4f  F1=%.4f", name, metrics["roc_auc"], metrics["f1"])

        if metrics["roc_auc"] > best_auc:
            best_auc = metrics["roc_auc"]
            best_name = name
            best_clf = clf

    # Save best model + scaler
    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_clf, str(_MODEL_PATH))
    joblib.dump(scaler, str(_SCALER_PATH))

    global _model, _scaler
    _model = best_clf
    _scaler = scaler

    logger.info("Best model: %s (AUC=%.4f) saved.", best_name, best_auc)
    return {
        "winner": best_name,
        "models": results,
        "feature_columns": FEATURE_COLUMNS,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Inference
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_model_loaded():
    global _model, _scaler
    if _model is None:
        if _MODEL_PATH.exists():
            _model = joblib.load(str(_MODEL_PATH))
            _scaler = joblib.load(str(_SCALER_PATH))
        else:
            raise RuntimeError(
                "Attendance predictor model not found. "
                "Run train_models.py first."
            )


def predict(features: dict) -> Dict:
    """
    Predict whether a student will be absent.

    Parameters
    ----------
    features : dict with keys matching FEATURE_COLUMNS.

    Returns
    -------
    dict with: will_be_absent, probability, confidence, risk_label.
    """
    _ensure_model_loaded()

    X = generate_features(features).reshape(1, -1)
    X_s = _scaler.transform(X)
    prob = float(_model.predict_proba(X_s)[0][1])
    prediction = prob >= 0.5

    risk_label = (
        "high" if prob >= 0.75
        else "medium" if prob >= 0.5
        else "low"
    )

    # Confidence: distance from 0.5 boundary, scaled
    confidence = round(abs(prob - 0.5) * 2.0, 4)

    return {
        "will_be_absent": bool(prediction),
        "probability": round(prob, 4),
        "confidence": confidence,
        "risk_label": risk_label,
    }


def evaluate(X_test: np.ndarray, y_test: np.ndarray) -> Dict:
    """Return evaluation metrics for the loaded model on held-out data."""
    _ensure_model_loaded()
    X_s = _scaler.transform(X_test)
    y_pred = _model.predict(X_s)
    y_prob = _model.predict_proba(X_s)[:, 1]
    return {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
        "report": classification_report(y_test, y_pred, output_dict=True),
    }
