"""
services/performance_predictor.py
Predict academic performance (CGPA / grade) from attendance patterns
using a Ridge Regression (and optionally XGBoost Regressor).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBRegressor
    _XGB_AVAILABLE = True
except ImportError:
    _XGB_AVAILABLE = False

from config import settings

logger = logging.getLogger("frams.performance_predictor")

_MODEL_PATH = settings.MODELS_DIR / "performance_predictor.joblib"
_SCALER_PATH = settings.MODELS_DIR / "performance_scaler.joblib"

_model: Optional[object] = None
_scaler: Optional[StandardScaler] = None

FEATURE_COLUMNS = [
    "attendance_pct",           # overall attendance %
    "attendance_pct_sem1",
    "attendance_pct_sem2",
    "consecutive_absences_max",
    "num_medical_leaves",
    "num_warnings",
    "is_hostel",
    "distance_km",
    "cgpa_prev",                # previous semester CGPA
    "club_activities",          # 0 or 1
    "study_hours_per_day",
    "library_visits_per_month",
    "backlogs",                 # number of backlogs
]


def _build_features(data: dict) -> np.ndarray:
    row = [
        float(data.get("attendance_pct", 75.0)),
        float(data.get("attendance_pct_sem1", 75.0)),
        float(data.get("attendance_pct_sem2", 75.0)),
        int(data.get("consecutive_absences_max", 0)),
        int(data.get("num_medical_leaves", 0)),
        int(data.get("num_warnings", 0)),
        int(bool(data.get("is_hostel", 0))),
        float(data.get("distance_km", 5.0)),
        float(data.get("cgpa_prev", 7.0)),
        int(bool(data.get("club_activities", 0))),
        float(data.get("study_hours_per_day", 4.0)),
        int(data.get("library_visits_per_month", 4)),
        int(data.get("backlogs", 0)),
    ]
    return np.array(row, dtype=np.float32)


def train(data: pd.DataFrame, random_state: int = 42) -> Dict:
    """
    Train a performance predictor (regression).

    data must contain FEATURE_COLUMNS + 'cgpa' column.
    """
    global _model, _scaler

    X = data[FEATURE_COLUMNS].values.astype(np.float32)
    y = data["cgpa"].values.astype(np.float32)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    candidates = {
        "Ridge": Ridge(alpha=1.0),
        "RandomForest": RandomForestRegressor(
            n_estimators=200, max_depth=10, random_state=random_state, n_jobs=-1
        ),
        "GradientBoosting": GradientBoostingRegressor(
            n_estimators=200, learning_rate=0.05, max_depth=5,
            random_state=random_state,
        ),
    }
    if _XGB_AVAILABLE:
        candidates["XGBoost"] = XGBRegressor(
            n_estimators=200, learning_rate=0.05, max_depth=6,
            random_state=random_state,
        )

    results: Dict[str, Dict] = {}
    best_r2 = -999.0
    best_name = None
    best_clf = None

    for name, clf in candidates.items():
        clf.fit(X_train_s, y_train)
        y_pred = clf.predict(X_test_s)
        cv_r2 = cross_val_score(clf, X_train_s, y_train, cv=5, scoring="r2")

        metrics = {
            "r2": round(float(r2_score(y_test, y_pred)), 4),
            "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            "cv_r2_mean": round(float(cv_r2.mean()), 4),
            "cv_r2_std": round(float(cv_r2.std()), 4),
        }
        results[name] = metrics
        logger.info("[%s] R²=%.4f  MAE=%.4f", name, metrics["r2"], metrics["mae"])

        if metrics["r2"] > best_r2:
            best_r2 = metrics["r2"]
            best_name = name
            best_clf = clf

    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_clf, str(_MODEL_PATH))
    joblib.dump(scaler, str(_SCALER_PATH))
    _model, _scaler = best_clf, scaler

    logger.info("Best performance model: %s (R²=%.4f)", best_name, best_r2)
    return {"winner": best_name, "models": results}


def _ensure_loaded():
    global _model, _scaler
    if _model is None and _MODEL_PATH.exists():
        _model = joblib.load(str(_MODEL_PATH))
        _scaler = joblib.load(str(_SCALER_PATH))


def predict(attendance_data: dict) -> Dict:
    """
    Predict CGPA from attendance and study habits.

    Returns dict with: predicted_cgpa, grade, performance_band.
    """
    _ensure_loaded()

    if _model is None:
        # Simple linear heuristic fallback
        pct = float(attendance_data.get("attendance_pct", 75.0))
        cgpa_prev = float(attendance_data.get("cgpa_prev", 7.0))
        predicted_cgpa = round(
            cgpa_prev * 0.7 + pct / 100 * 10 * 0.3, 2
        )
    else:
        X = _build_features(attendance_data).reshape(1, -1)
        X_s = _scaler.transform(X)
        predicted_cgpa = round(float(np.clip(_model.predict(X_s)[0], 0.0, 10.0)), 2)

    grade = _cgpa_to_grade(predicted_cgpa)
    band = (
        "excellent" if predicted_cgpa >= 8.5
        else "good" if predicted_cgpa >= 7.0
        else "average" if predicted_cgpa >= 5.5
        else "poor"
    )

    return {
        "predicted_cgpa": predicted_cgpa,
        "grade": grade,
        "performance_band": band,
    }


def _cgpa_to_grade(cgpa: float) -> str:
    if cgpa >= 9.0:
        return "O"
    elif cgpa >= 8.0:
        return "A+"
    elif cgpa >= 7.0:
        return "A"
    elif cgpa >= 6.0:
        return "B+"
    elif cgpa >= 5.0:
        return "B"
    elif cgpa >= 4.0:
        return "C"
    return "F"
