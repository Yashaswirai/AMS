"""
utils/model_utils.py – Utility functions to load and save ML model metrics.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Dict

logger = logging.getLogger("frams.model_utils")

METRICS_FILENAME = "metrics.json"


def load_model_metrics(models_dir: Path) -> Dict[str, Any]:
    """
    Load evaluation metrics for all trained models from models_dir/metrics.json.
    """
    path = Path(models_dir) / METRICS_FILENAME
    if not path.exists():
        logger.debug("Metrics file not found at %s", path)
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            metrics = json.load(f)
        logger.debug("Loaded metrics for %d model(s) from %s", len(metrics), path)
        return metrics
    except Exception as exc:
        logger.warning("Failed to load metrics from %s: %s", path, exc)
        return {}


def save_model_metrics(models_dir: Path, metrics: Dict[str, Any]) -> None:
    """
    Save evaluation metrics for all trained models to models_dir/metrics.json.
    """
    models_dir = Path(models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)
    path = models_dir / METRICS_FILENAME
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(metrics, f, indent=4, ensure_ascii=False)
        logger.info("Saved model metrics to %s", path)
    except Exception as exc:
        logger.error("Failed to save metrics to %s: %s", path, exc)
