"""
services/data_analyzer.py
Exploratory Data Analysis (EDA) and statistical analysis of attendance data.
Returns rich JSON-serialisable results for the /ds/* endpoints.
"""

from __future__ import annotations

import base64
import io
import logging
from typing import Any, Dict, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from scipy import stats

logger = logging.getLogger("frams.data_analyzer")

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _fig_to_b64(fig: plt.Figure, dpi: int = 120) -> str:
    """Convert matplotlib figure to base64-encoded PNG."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=dpi, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _df_from_payload(data: Any) -> pd.DataFrame:
    """Accept list-of-dicts or dict-of-lists and return a DataFrame."""
    if isinstance(data, list):
        return pd.DataFrame(data)
    if isinstance(data, dict):
        return pd.DataFrame(data)
    raise ValueError(f"Unsupported data type: {type(data)}")


# ─────────────────────────────────────────────────────────────────────────────
# Full EDA
# ─────────────────────────────────────────────────────────────────────────────

def run_full_eda(data: Any) -> Dict:
    """
    Run a complete EDA pipeline on the provided attendance records.

    Expected columns (minimal): student_id, date, is_absent, attendance_pct,
    day_of_week, month, subject_id.

    Returns a rich dict with statistics, distributions, trends, and plots.
    """
    df = _df_from_payload(data)
    if df.empty:
        return {"error": "Empty dataset provided."}

    # ── Basic info ────────────────────────────────────────────────────────────
    result: Dict[str, Any] = {
        "total_records": int(len(df)),
        "total_columns": int(len(df.columns)),
        "columns": df.columns.tolist(),
        "dtypes": {c: str(df[c].dtype) for c in df.columns},
        "missing_values": df.isnull().sum().to_dict(),
        "missing_pct": (df.isnull().mean() * 100).round(2).to_dict(),
    }

    # ── Summary statistics ────────────────────────────────────────────────────
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if num_cols:
        desc = df[num_cols].describe().round(4)
        result["summary_statistics"] = desc.to_dict()

    # ── Attendance distribution ────────────────────────────────────────────────
    if "attendance_pct" in df.columns:
        pct = df["attendance_pct"].dropna()
        result["attendance_distribution"] = {
            "mean": round(float(pct.mean()), 2),
            "median": round(float(pct.median()), 2),
            "std": round(float(pct.std()), 2),
            "below_75_pct": round(float((pct < 75).mean() * 100), 2),
            "below_60_pct": round(float((pct < 60).mean() * 100), 2),
            "histogram": {
                "counts": np.histogram(pct, bins=20)[0].tolist(),
                "edges": np.histogram(pct, bins=20)[1].tolist(),
            },
        }

    # ── Absence patterns by day ────────────────────────────────────────────────
    if "day_of_week" in df.columns and "is_absent" in df.columns:
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        day_absence = (
            df.groupby("day_of_week")["is_absent"].mean() * 100
        ).round(2)
        result["absence_by_day"] = {
            day_names[int(k)]: float(v)
            for k, v in day_absence.items()
            if int(k) < 7
        }

    # ── Absence patterns by month ──────────────────────────────────────────────
    if "month" in df.columns and "is_absent" in df.columns:
        month_names = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        ]
        month_absence = (
            df.groupby("month")["is_absent"].mean() * 100
        ).round(2)
        result["absence_by_month"] = {
            month_names[int(k) - 1]: float(v)
            for k, v in month_absence.items()
            if 1 <= int(k) <= 12
        }

    # ── Correlation matrix ────────────────────────────────────────────────────
    if len(num_cols) >= 2:
        corr = df[num_cols].corr().round(4)
        result["correlation_matrix"] = corr.to_dict()

    # ── Outlier detection via IQR ─────────────────────────────────────────────
    outliers: Dict[str, int] = {}
    for col in num_cols:
        q1, q3 = df[col].quantile([0.25, 0.75])
        iqr = q3 - q1
        n_out = int(((df[col] < q1 - 1.5 * iqr) | (df[col] > q3 + 1.5 * iqr)).sum())
        if n_out:
            outliers[col] = n_out
    result["outliers_iqr"] = outliers

    # ── Normality test (Shapiro-Wilk on a sample) ─────────────────────────────
    normality: Dict[str, Dict] = {}
    for col in num_cols[:5]:  # limit to first 5 numeric cols
        sample = df[col].dropna().sample(min(500, len(df)), random_state=42)
        if len(sample) >= 3:
            stat, p = stats.shapiro(sample)
            normality[col] = {
                "statistic": round(float(stat), 4),
                "p_value": round(float(p), 6),
                "is_normal": bool(p > 0.05),
            }
    result["normality_tests"] = normality

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Individual analysis functions
# ─────────────────────────────────────────────────────────────────────────────

def get_attendance_distribution(df: pd.DataFrame) -> Dict:
    """Return attendance % distribution statistics and histogram data."""
    if "attendance_pct" not in df.columns:
        return {"error": "attendance_pct column not found."}

    pct = df["attendance_pct"].dropna()
    counts, edges = np.histogram(pct, bins=20)
    percentiles = np.percentile(pct, [10, 25, 50, 75, 90]).tolist()

    return {
        "count": int(len(pct)),
        "mean": round(float(pct.mean()), 2),
        "median": round(float(pct.median()), 2),
        "std": round(float(pct.std()), 2),
        "min": round(float(pct.min()), 2),
        "max": round(float(pct.max()), 2),
        "percentiles": {
            "p10": round(percentiles[0], 2),
            "p25": round(percentiles[1], 2),
            "p50": round(percentiles[2], 2),
            "p75": round(percentiles[3], 2),
            "p90": round(percentiles[4], 2),
        },
        "risk_bands": {
            "safe_>=85": round(float((pct >= 85).mean() * 100), 2),
            "ok_75-85": round(float(((pct >= 75) & (pct < 85)).mean() * 100), 2),
            "warning_60-75": round(float(((pct >= 60) & (pct < 75)).mean() * 100), 2),
            "critical_<60": round(float((pct < 60).mean() * 100), 2),
        },
        "histogram": {
            "counts": counts.tolist(),
            "bin_edges": [round(e, 2) for e in edges.tolist()],
        },
    }


def get_trends(df: pd.DataFrame) -> Dict:
    """
    Compute time-based attendance trends.
    Expects a 'date' column (parseable) and 'is_absent' column.
    """
    if "date" not in df.columns:
        return {"error": "date column not found."}

    df = df.copy()
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date"])

    # Weekly trend
    df["week"] = df["date"].dt.isocalendar().week.astype(int)
    df["year"] = df["date"].dt.year

    weekly: Dict = {}
    if "is_absent" in df.columns:
        weekly_agg = (
            df.groupby(["year", "week"])["is_absent"]
            .agg(["mean", "count"])
            .reset_index()
        )
        weekly_agg["absence_rate"] = (weekly_agg["mean"] * 100).round(2)
        weekly = weekly_agg.tail(20).to_dict(orient="records")

    # Monthly trend
    df["month_period"] = df["date"].dt.to_period("M").astype(str)
    monthly: Dict = {}
    if "is_absent" in df.columns:
        monthly_agg = (
            df.groupby("month_period")["is_absent"]
            .agg(["mean", "count"])
            .reset_index()
        )
        monthly_agg["absence_rate"] = (monthly_agg["mean"] * 100).round(2)
        monthly = monthly_agg.to_dict(orient="records")

    # 7-day rolling average (if enough data)
    rolling_trend: List[Dict] = []
    if "is_absent" in df.columns and len(df) >= 7:
        daily = df.groupby("date")["is_absent"].mean().reset_index()
        daily = daily.sort_values("date")
        daily["rolling_7d"] = daily["is_absent"].rolling(7, min_periods=1).mean()
        daily["date"] = daily["date"].astype(str)
        rolling_trend = daily.tail(60).to_dict(orient="records")

    return {
        "weekly_trend": weekly,
        "monthly_trend": monthly,
        "rolling_7d_trend": rolling_trend,
    }


def get_correlation(df: pd.DataFrame) -> Dict:
    """Return correlation matrix for all numeric columns."""
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(num_cols) < 2:
        return {"error": "Insufficient numeric columns for correlation."}
    corr = df[num_cols].corr().round(4)
    return {
        "columns": num_cols,
        "matrix": corr.to_dict(),
        "top_correlations": _top_correlations(corr),
    }


def _top_correlations(corr: pd.DataFrame, n: int = 10) -> List[Dict]:
    """Extract top-N absolute correlations (excluding self-correlation)."""
    pairs = []
    cols = corr.columns.tolist()
    for i, c1 in enumerate(cols):
        for j, c2 in enumerate(cols):
            if j <= i:
                continue
            pairs.append(
                {
                    "feature_1": c1,
                    "feature_2": c2,
                    "correlation": round(float(corr.loc[c1, c2]), 4),
                }
            )
    pairs.sort(key=lambda x: abs(x["correlation"]), reverse=True)
    return pairs[:n]


def get_statistical_summary(df: pd.DataFrame) -> Dict:
    """Return extended statistical summary."""
    num_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    summary: Dict[str, Any] = {}
    for col in num_cols:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        skewness = float(stats.skew(s))
        kurtosis = float(stats.kurtosis(s))
        summary[col] = {
            "count": int(len(s)),
            "mean": round(float(s.mean()), 4),
            "std": round(float(s.std()), 4),
            "min": round(float(s.min()), 4),
            "q1": round(float(s.quantile(0.25)), 4),
            "median": round(float(s.median()), 4),
            "q3": round(float(s.quantile(0.75)), 4),
            "max": round(float(s.max()), 4),
            "skewness": round(skewness, 4),
            "kurtosis": round(kurtosis, 4),
            "iqr": round(float(s.quantile(0.75) - s.quantile(0.25)), 4),
        }
    return summary


def get_day_hour_heatmap(df: pd.DataFrame) -> Dict:
    """
    Build a day × hour heatmap of absence rates.
    Expects columns: day_of_week (0-6), hour (0-23), is_absent.
    """
    required = {"day_of_week", "is_absent"}
    missing = required - set(df.columns)
    if missing:
        return {"error": f"Missing columns: {missing}"}

    if "hour" not in df.columns:
        # Synthesise hour from time_slot if available
        slot_map = {0: 9, 1: 13, 2: 16}
        df = df.copy()
        df["hour"] = df.get("time_slot", pd.Series(0, index=df.index)).map(
            slot_map
        ).fillna(9).astype(int)

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    pivot = (
        df.groupby(["day_of_week", "hour"])["is_absent"]
        .mean()
        .unstack(fill_value=0)
        .round(4)
    )
    pivot.index = [day_names[i] for i in pivot.index if i < 7]

    return {
        "days": pivot.index.tolist(),
        "hours": pivot.columns.tolist(),
        "absence_rates": pivot.values.tolist(),
    }
