"""
services/dropout_predictor.py
Predict the probability that a student will drop out or fail to complete
the semester based on attendance, academic, and socio-demographic features.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    roc_auc_score,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBClassifier
    _XGB_AVAILABLE = True
except ImportError:
    _XGB_AVAILABLE = False

from config import settings

logger = logging.getLogger("frams.dropout_predictor")

_MODEL_PATH = settings.MODELS_DIR / "dropout_predictor.joblib"
_SCALER_PATH = settings.MODELS_DIR / "dropout_scaler.joblib"

_model: Optional[object] = None
_scaler: Optional[StandardScaler] = None

FEATURE_COLUMNS = [
    "attendance_pct",
    "cgpa",
    "num_backlogs",
    "semester",
    "num_warnings",
    "consecutive_absences_max",
    "trend_30d",
    "is_hostel",
    "distance_km",
    "financial_aid",            # 1 if receiving financial aid
    "part_time_job",            # 1 if working part-time
    "family_issues",            # 1 if self-reported family problems
    "previous_dropout_attempt", # 1 if attempted dropout before
    "cgpa_drop_last_sem",       # CGPA decrease from previous semester
    "mental_health_score",      # 0–10, higher = better
]


def _build_features(data: dict) -> np.ndarray:
    return np.array(
        [
            float(data.get("attendance_pct", 75.0)),
            float(data.get("cgpa", 7.0)),
            int(data.get("num_backlogs", 0)),
            int(data.get("semester", 1)),
            int(data.get("num_warnings", 0)),
            int(data.get("consecutive_absences_max", 0)),
            float(data.get("trend_30d", 0.0)),
            int(bool(data.get("is_hostel", 0))),
            float(data.get("distance_km", 5.0)),
            int(bool(data.get("financial_aid", 0))),
            int(bool(data.get("part_time_job", 0))),
            int(bool(data.get("family_issues", 0))),
            int(bool(data.get("previous_dropout_attempt", 0))),
            float(data.get("cgpa_drop_last_sem", 0.0)),
            float(data.get("mental_health_score", 7.0)),
        ],
        dtype=np.float32,
    )


def train(data: pd.DataFrame, random_state: int = 42) -> Dict:
    """
    Train dropout predictor.

    data must contain FEATURE_COLUMNS + 'dropped_out' (0/1).
    """
    global _model, _scaler

    X = data[FEATURE_COLUMNS].values.astype(np.float32)
    y = data["dropped_out"].values.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s = scaler.transform(X_test)

    # Try multiple models
    candidates = {
        "RandomForest": RandomForestClassifier(
            n_estimators=300,
            max_depth=10,
            class_weight="balanced",
            random_state=random_state,
            n_jobs=-1,
        ),
    }
    if _XGB_AVAILABLE:
        candidates["XGBoost"] = XGBClassifier(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.03,
            subsample=0.8,
            scale_pos_weight=float((y == 0).sum() / max((y == 1).sum(), 1)),
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=random_state,
        )

    best_auc = -1.0
    best_name = None
    best_clf = None
    model_metrics: Dict[str, Dict] = {}

    for name, clf in candidates.items():
        clf.fit(X_train_s, y_train)
        y_pred = clf.predict(X_test_s)
        y_prob = clf.predict_proba(X_test_s)[:, 1]
        cv_auc = cross_val_score(clf, X_train_s, y_train, cv=5, scoring="roc_auc")

        m = {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, y_prob)), 4),
            "cv_auc_mean": round(float(cv_auc.mean()), 4),
            "cv_auc_std": round(float(cv_auc.std()), 4),
            "report": classification_report(y_test, y_pred, output_dict=True),
        }
        model_metrics[name] = m
        logger.info("[%s] AUC=%.4f  F1=%.4f", name, m["roc_auc"], m["f1"])

        if m["roc_auc"] > best_auc:
            best_auc = m["roc_auc"]
            best_name = name
            best_clf = clf

    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_clf, str(_MODEL_PATH))
    joblib.dump(scaler, str(_SCALER_PATH))
    _model, _scaler = best_clf, scaler

    logger.info("Best dropout model: %s (AUC=%.4f)", best_name, best_auc)
    return {"winner": best_name, "models": model_metrics}


def _ensure_loaded():
    global _model, _scaler
    if _model is None and _MODEL_PATH.exists():
        _model = joblib.load(str(_MODEL_PATH))
        _scaler = joblib.load(str(_SCALER_PATH))


def predict_dropout(student_data: dict) -> Dict:
    """
    Predict dropout risk for a single student.

    Returns
    -------
    dict with: dropout_probability, dropout_risk, risk_factors.
    """
    _ensure_loaded()

    factors: List[str] = []
    pct = float(student_data.get("attendance_pct", 75.0))
    cgpa = float(student_data.get("cgpa", 7.0))
    backlogs = int(student_data.get("num_backlogs", 0))
    warnings = int(student_data.get("num_warnings", 0))

    if pct < 60:
        factors.append(f"Very low attendance ({pct:.1f}%)")
    if cgpa < 5.0:
        factors.append(f"Low CGPA ({cgpa:.1f})")
    if backlogs >= 3:
        factors.append(f"{backlogs} academic backlogs")
    if warnings >= 2:
        factors.append(f"{warnings} attendance warnings")
    if student_data.get("family_issues"):
        factors.append("Reported family issues")
    if student_data.get("previous_dropout_attempt"):
        factors.append("Previous dropout attempt")

    if _model is not None:
        X = _build_features(student_data).reshape(1, -1)
        X_s = _scaler.transform(X)
        prob = float(_model.predict_proba(X_s)[0][1])
    else:
        # Simple heuristic fallback
        prob = 0.0
        if pct < 60:
            prob += 0.3
        if cgpa < 5.0:
            prob += 0.25
        if backlogs >= 3:
            prob += 0.2
        if warnings >= 2:
            prob += 0.1
        if student_data.get("previous_dropout_attempt"):
            prob += 0.15
        prob = min(prob, 1.0)

    risk = (
        "critical" if prob >= 0.75
        else "high" if prob >= 0.55
        else "moderate" if prob >= 0.35
        else "low"
    )

    return {
        "dropout_probability": round(prob, 4),
        "dropout_risk": risk,
        "risk_factors": factors,
        "intervention_required": prob >= 0.55,
    }


def batch_predict_dropout(students_data: List[dict]) -> List[Dict]:
    return [predict_dropout(s) for s in students_data]
