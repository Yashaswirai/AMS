"""
routers/ds_routes.py
Data science / EDA endpoints.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, Body, HTTPException, status
from pydantic import BaseModel

from services.data_analyzer import (
    get_attendance_distribution,
    get_correlation,
    get_day_hour_heatmap,
    get_statistical_summary,
    get_trends,
    run_full_eda,
)

logger = logging.getLogger("frams.ds_routes")

router = APIRouter(prefix="/ds", tags=["Data Science"])


class AttendanceDataPayload(BaseModel):
    """Generic attendance records payload."""
    records: List[Dict[str, Any]]


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/analyze", summary="Run complete EDA on provided attendance records")
async def analyze(payload: AttendanceDataPayload):
    """
    Accept a list of attendance records (dicts) and run a full
    Exploratory Data Analysis (EDA) pipeline.

    Returns statistics, distributions, correlations, and outlier info.
    """
    try:
        if not payload.records:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="records list cannot be empty.",
            )
        result = run_full_eda(payload.records)
        return result
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("EDA failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/distribution", summary="Attendance percentage distribution statistics")
async def distribution(payload: AttendanceDataPayload):
    """Return attendance % distribution with risk-band breakdown."""
    try:
        df = pd.DataFrame(payload.records)
        return get_attendance_distribution(df)
    except Exception as exc:
        logger.exception("Distribution analysis failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/trends", summary="Time-based attendance trend analysis")
async def trends(payload: AttendanceDataPayload):
    """
    Compute weekly, monthly, and 7-day rolling attendance trends.
    Records must include a 'date' column.
    """
    try:
        df = pd.DataFrame(payload.records)
        return get_trends(df)
    except Exception as exc:
        logger.exception("Trend analysis failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/correlation", summary="Correlation matrix")
async def correlation(payload: AttendanceDataPayload):
    """Return a Pearson correlation matrix for all numeric features."""
    try:
        df = pd.DataFrame(payload.records)
        return get_correlation(df)
    except Exception as exc:
        logger.exception("Correlation analysis failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/summary", summary="Extended statistical summary")
async def statistical_summary(payload: AttendanceDataPayload):
    """
    Return mean, std, quartiles, skewness, and kurtosis for all numeric
    columns in the provided records.
    """
    try:
        df = pd.DataFrame(payload.records)
        return get_statistical_summary(df)
    except Exception as exc:
        logger.exception("Statistical summary failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/heatmap", summary="Day × Hour absence rate heatmap data")
async def heatmap(payload: AttendanceDataPayload):
    """
    Build a day-of-week × hour-of-day heatmap of absence rates.
    Records must include 'day_of_week' (0-6) and 'is_absent' columns.
    'hour' column is optional; defaults derived from 'time_slot' if present.
    """
    try:
        df = pd.DataFrame(payload.records)
        return get_day_hour_heatmap(df)
    except Exception as exc:
        logger.exception("Heatmap analysis failed")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


# ─────────────────────────────────────────────────────────────────────────────
# GET convenience endpoints (return info about a pre-loaded dataset)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/distribution", summary="Attendance distribution from sample data")
async def distribution_get():
    """
    Return distribution stats computed on the generated sample dataset
    (if available). Useful for dashboard widgets.
    """
    from pathlib import Path
    from config import settings

    csv_path = settings.DATASET_DIR / "attendance_data.csv"
    if not csv_path.exists():
        return {
            "message": "Sample dataset not found. Run data/generate_sample_data.py first.",
            "data": {},
        }
    df = pd.read_csv(csv_path)
    return get_attendance_distribution(df)


@router.get("/trends", summary="Trends from sample data")
async def trends_get():
    from pathlib import Path
    from config import settings

    csv_path = settings.DATASET_DIR / "attendance_data.csv"
    if not csv_path.exists():
        return {"message": "Sample dataset not found.", "data": {}}
    df = pd.read_csv(csv_path)
    return get_trends(df)


@router.get("/correlation", summary="Correlation from sample data")
async def correlation_get():
    from pathlib import Path
    from config import settings

    csv_path = settings.DATASET_DIR / "attendance_data.csv"
    if not csv_path.exists():
        return {"message": "Sample dataset not found.", "data": {}}
    df = pd.read_csv(csv_path)
    return get_correlation(df)


@router.get("/summary", summary="Statistical summary from sample data")
async def summary_get():
    from pathlib import Path
    from config import settings

    csv_path = settings.DATASET_DIR / "attendance_data.csv"
    if not csv_path.exists():
        return {"message": "Sample dataset not found.", "data": {}}
    df = pd.read_csv(csv_path)
    return get_statistical_summary(df)


@router.get("/heatmap", summary="Heatmap from sample data")
async def heatmap_get():
    from pathlib import Path
    from config import settings

    csv_path = settings.DATASET_DIR / "attendance_data.csv"
    if not csv_path.exists():
        return {"message": "Sample dataset not found.", "data": {}}
    df = pd.read_csv(csv_path)
    return get_day_hour_heatmap(df)
