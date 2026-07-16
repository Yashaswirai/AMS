"""
services/cluster_analyzer.py
K-Means clustering of student attendance patterns with elbow-method
optimal-k selection and cluster insight descriptions.
"""

from __future__ import annotations

import base64
import io
import logging
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

import matplotlib
matplotlib.use("Agg")  # non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns

from config import settings

logger = logging.getLogger("frams.cluster_analyzer")

_MODEL_PATH = settings.MODELS_DIR / "cluster_kmeans.joblib"
_SCALER_PATH = settings.MODELS_DIR / "cluster_scaler.joblib"

_kmeans: Optional[KMeans] = None
_cluster_scaler: Optional[StandardScaler] = None

CLUSTER_FEATURES = [
    "attendance_pct",
    "monday_absence_rate",
    "friday_absence_rate",
    "consecutive_absences_max",
    "cgpa",
    "num_warnings",
    "trend_30d",
    "is_hostel",
]

CLUSTER_LABELS = {
    0: "Consistent Attenders",
    1: "Monday-Friday Absentees",
    2: "At-Risk Students",
    3: "Irregular Attenders",
}


# ─────────────────────────────────────────────────────────────────────────────
# Optimal K
# ─────────────────────────────────────────────────────────────────────────────

def find_optimal_k(
    data: np.ndarray,
    k_range: range = range(2, 11),
    random_state: int = 42,
) -> Dict:
    """
    Use the Elbow Method (inertia) + Silhouette Score to suggest optimal k.

    Returns
    -------
    dict with inertias, silhouette_scores, suggested_k.
    """
    inertias: List[float] = []
    sil_scores: List[float] = []

    for k in k_range:
        km = KMeans(n_clusters=k, random_state=random_state, n_init="auto")
        labels = km.fit_predict(data)
        inertias.append(float(km.inertia_))
        if k >= 2:
            sil_scores.append(float(silhouette_score(data, labels)))
        else:
            sil_scores.append(0.0)

    # Elbow: find the k with maximum second derivative of inertia
    if len(inertias) >= 3:
        inertia_arr = np.array(inertias)
        second_diff = np.diff(np.diff(inertia_arr))
        elbow_idx = int(np.argmax(second_diff)) + 2  # offset for second diff
        elbow_k = list(k_range)[elbow_idx]
    else:
        elbow_k = list(k_range)[0]

    # Best silhouette
    best_sil_idx = int(np.argmax(sil_scores))
    sil_k = list(k_range)[best_sil_idx]

    # Compromise: prefer silhouette over elbow
    suggested_k = sil_k

    return {
        "k_values": list(k_range),
        "inertias": [round(v, 2) for v in inertias],
        "silhouette_scores": [round(v, 4) for v in sil_scores],
        "elbow_k": elbow_k,
        "best_silhouette_k": sil_k,
        "suggested_k": suggested_k,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Fit clusters
# ─────────────────────────────────────────────────────────────────────────────

def fit_clusters(
    data: pd.DataFrame,
    n_clusters: int = 4,
    random_state: int = 42,
) -> Dict:
    """
    Scale features and fit K-Means.

    data must contain CLUSTER_FEATURES columns.

    Returns
    -------
    dict with labels, centroids, silhouette_score, inertia.
    """
    global _kmeans, _cluster_scaler

    X = data[CLUSTER_FEATURES].fillna(0).values.astype(np.float32)
    scaler = StandardScaler()
    X_s = scaler.fit_transform(X)

    km = KMeans(n_clusters=n_clusters, random_state=random_state, n_init="auto")
    labels = km.fit_predict(X_s)

    sil = float(silhouette_score(X_s, labels)) if n_clusters >= 2 else 0.0

    settings.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(km, str(_MODEL_PATH))
    joblib.dump(scaler, str(_SCALER_PATH))
    _kmeans, _cluster_scaler = km, scaler

    return {
        "labels": labels.tolist(),
        "n_clusters": n_clusters,
        "inertia": round(float(km.inertia_), 2),
        "silhouette_score": round(sil, 4),
        "centroids": km.cluster_centers_.tolist(),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Insights
# ─────────────────────────────────────────────────────────────────────────────

def get_cluster_insights(
    labels: List[int],
    data: pd.DataFrame,
) -> List[Dict]:
    """
    Generate descriptive statistics and a text label for each cluster.

    Parameters
    ----------
    labels : list of integer cluster assignments (length = len(data)).
    data : pd.DataFrame with CLUSTER_FEATURES.

    Returns
    -------
    List of dicts, one per cluster.
    """
    df = data[CLUSTER_FEATURES].copy()
    df["cluster"] = labels
    insights: List[Dict] = []

    for cluster_id in sorted(df["cluster"].unique()):
        subset = df[df["cluster"] == cluster_id]
        stats = {}
        for col in CLUSTER_FEATURES:
            if col in subset.columns:
                stats[col] = {
                    "mean": round(float(subset[col].mean()), 2),
                    "std": round(float(subset[col].std()), 2),
                    "min": round(float(subset[col].min()), 2),
                    "max": round(float(subset[col].max()), 2),
                }

        # Derive a human-readable label from stats
        avg_pct = stats.get("attendance_pct", {}).get("mean", 75.0)
        avg_cgpa = stats.get("cgpa", {}).get("mean", 7.0)
        avg_warn = stats.get("num_warnings", {}).get("mean", 0.0)

        if avg_pct >= 85 and avg_cgpa >= 7.5:
            auto_label = "High Performers – Regular Attendees"
        elif avg_pct < 65 or avg_warn >= 2:
            auto_label = "Critical Risk Students"
        elif avg_pct >= 75:
            auto_label = "Moderate Attendees"
        else:
            auto_label = "Irregular / At-Risk Students"

        insights.append(
            {
                "cluster_id": cluster_id,
                "label": CLUSTER_LABELS.get(cluster_id, auto_label),
                "count": int(len(subset)),
                "stats": stats,
            }
        )

    return insights


# ─────────────────────────────────────────────────────────────────────────────
# Visualisation
# ─────────────────────────────────────────────────────────────────────────────

def visualize_clusters(
    data: np.ndarray,
    labels: List[int],
    title: str = "Student Attendance Clusters (PCA)",
) -> str:
    """
    Reduce data to 2D with PCA and plot the clusters.

    Returns
    -------
    Base64-encoded PNG string.
    """
    pca = PCA(n_components=2, random_state=42)
    X_2d = pca.fit_transform(data)

    fig, ax = plt.subplots(figsize=(8, 6))
    palette = sns.color_palette("Set2", len(set(labels)))

    unique_labels = sorted(set(labels))
    for idx, cluster_id in enumerate(unique_labels):
        mask = np.array(labels) == cluster_id
        ax.scatter(
            X_2d[mask, 0],
            X_2d[mask, 1],
            c=[palette[idx]],
            label=CLUSTER_LABELS.get(cluster_id, f"Cluster {cluster_id}"),
            alpha=0.7,
            edgecolors="white",
            linewidths=0.5,
        )

    ax.set_title(title, fontsize=14, fontweight="bold")
    ax.set_xlabel(f"PC1 ({pca.explained_variance_ratio_[0]:.1%} var)")
    ax.set_ylabel(f"PC2 ({pca.explained_variance_ratio_[1]:.1%} var)")
    ax.legend(loc="best")
    sns.despine()
    plt.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=120)
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def predict_cluster(student_data: Dict) -> Optional[int]:
    """Predict the cluster for a single student (requires fitted model)."""
    global _kmeans, _cluster_scaler
    if _kmeans is None:
        if _MODEL_PATH.exists():
            _kmeans = joblib.load(str(_MODEL_PATH))
            _cluster_scaler = joblib.load(str(_SCALER_PATH))
        else:
            return None

    row = np.array(
        [float(student_data.get(col, 0.0)) for col in CLUSTER_FEATURES],
        dtype=np.float32,
    ).reshape(1, -1)
    row_s = _cluster_scaler.transform(row)
    return int(_kmeans.predict(row_s)[0])
