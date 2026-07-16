"""
train_models.py
Orchestrator script to train and evaluate all Machine Learning models for FRAMS.
"""

from __future__ import annotations

import logging
from pathlib import Path
import pandas as pd

from config import settings
from data.generate_sample_data import generate_data
from services import (
    attendance_predictor,
    risk_detector,
    performance_predictor,
    dropout_predictor,
    cluster_analyzer,
)
from utils.model_utils import save_model_metrics

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(message)s")
logger = logging.getLogger("frams.train_models")


def main():
    logger.info("=== FRAMS Model Training Pipeline ===")
    
    # ── 1. Check or Generate Sample Data ──────────────────────────────────────
    csv_path = settings.DATASET_DIR / "attendance_data.csv"
    if not csv_path.exists():
        logger.info("Sample dataset not found at %s. Generating synthetic data...", csv_path)
        generate_data(csv_path)
    else:
        logger.info("Found existing sample dataset at %s.", csv_path)
        
    logger.info("Loading training dataset...")
    df = pd.read_csv(csv_path)
    logger.info("Dataset shape: %s", df.shape)
    
    all_metrics = {}
    
    # ── 2. Train Attendance Predictor ─────────────────────────────────────────
    logger.info("\n--- Training Attendance Predictor ---")
    try:
        att_res = attendance_predictor.train(df)
        all_metrics["attendance_predictor"] = att_res
        winner = att_res["winner"]
        logger.info("Winner model: %s", winner)
        logger.info("Metrics: %s", att_res["models"][winner])
    except Exception as e:
        logger.exception("Error training attendance predictor: %s", e)
        
    # ── 3. Train Risk Detector ───────────────────────────────────────────────
    logger.info("\n--- Training Risk Detector ---")
    try:
        risk_res = risk_detector.train(df)
        all_metrics["risk_detector"] = risk_res
        logger.info("Metrics: Accuracy=%.4f, Macro F1=%.4f", risk_res["accuracy"], risk_res["f1_macro"])
    except Exception as e:
        logger.exception("Error training risk detector: %s", e)
        
    # ── 4. Train Performance Predictor ────────────────────────────────────────
    logger.info("\n--- Training Performance Predictor ---")
    try:
        perf_data = df.copy()
        # Ensure all columns required for performance prediction are present
        for col in performance_predictor.FEATURE_COLUMNS:
            if col not in perf_data.columns:
                perf_data[col] = 0.0
        perf_res = performance_predictor.train(perf_data)
        all_metrics["performance_predictor"] = perf_res
        winner = perf_res["winner"]
        logger.info("Winner model: %s", winner)
        logger.info("Metrics: %s", perf_res["models"][winner])
    except Exception as e:
        logger.exception("Error training performance predictor: %s", e)
        
    # ── 5. Train Dropout Predictor ────────────────────────────────────────────
    logger.info("\n--- Training Dropout Predictor ---")
    try:
        drop_data = df.copy()
        # Ensure all columns required for dropout prediction are present
        for col in dropout_predictor.FEATURE_COLUMNS:
            if col not in drop_data.columns:
                drop_data[col] = 0.0
        drop_res = dropout_predictor.train(drop_data)
        all_metrics["dropout_predictor"] = drop_res
        winner = drop_res["winner"]
        logger.info("Winner model: %s", winner)
        logger.info("Metrics: %s", drop_res["models"][winner])
    except Exception as e:
        logger.exception("Error training dropout predictor: %s", e)
        
    # ── 6. Fit Clustering Analyzer ────────────────────────────────────────────
    logger.info("\n--- Fitting Clustering Model ---")
    try:
        cluster_data = df.copy()
        for col in cluster_analyzer.CLUSTER_FEATURES:
            if col not in cluster_data.columns:
                cluster_data[col] = 0.0
        cluster_res = cluster_analyzer.fit_clusters(cluster_data, n_clusters=4)
        all_metrics["cluster_analyzer"] = {
            "silhouette_score": cluster_res["silhouette_score"],
            "inertia": cluster_res["inertia"],
            "n_clusters": cluster_res["n_clusters"],
        }
        logger.info("Metrics: Silhouette Score=%.4f, Inertia=%.2f", cluster_res["silhouette_score"], cluster_res["inertia"])
    except Exception as e:
        logger.exception("Error training clustering analyzer: %s", e)
        
    # ── 7. Save Metrics ───────────────────────────────────────────────────────
    logger.info("\nSaving evaluation metrics...")
    save_model_metrics(settings.MODELS_DIR, all_metrics)
    
    # ── 8. Print Summary Comparison Table ─────────────────────────────────────
    print("\n" + "="*80)
    print("                      MODEL TRAINING SUMMARY TABLE")
    print("="*80)
    print(f"{'Model Name / Task':<30} | {'Metric Name':<20} | {'Value':<10}")
    print("-"*80)
    
    # Attendance Predictor
    if "attendance_predictor" in all_metrics:
        ap = all_metrics["attendance_predictor"]
        win = ap["winner"]
        print(f"{'Attendance Predictor (' + win + ')':<30} | {'Accuracy':<20} | {ap['models'][win]['accuracy']:<10.4f}")
        print(f"{'':<30} | {'F1-Score':<20} | {ap['models'][win]['f1']:<10.4f}")
        print(f"{'':<30} | {'ROC-AUC':<20} | {ap['models'][win]['roc_auc']:<10.4f}")
    
    # Risk Detector
    if "risk_detector" in all_metrics:
        rd = all_metrics["risk_detector"]
        print(f"{'Risk Detector (GBM)':<30} | {'Accuracy':<20} | {rd['accuracy']:<10.4f}")
        print(f"{'':<30} | {'Macro F1':<20} | {rd['f1_macro']:<10.4f}")
        
    # Performance Predictor
    if "performance_predictor" in all_metrics:
        pp = all_metrics["performance_predictor"]
        win = pp["winner"]
        print(f"{'Performance Predictor (' + win + ')':<30} | {'R-Squared (R2)':<20} | {pp['models'][win]['r2']:<10.4f}")
        print(f"{'':<30} | {'Mean Abs Error (MAE)':<20} | {pp['models'][win]['mae']:<10.4f}")
        print(f"{'':<30} | {'Root Mean Sq Err (RMSE)':<20} | {pp['models'][win]['rmse']:<10.4f}")
        
    # Dropout Predictor
    if "dropout_predictor" in all_metrics:
        dp = all_metrics["dropout_predictor"]
        win = dp["winner"]
        print(f"{'Dropout Predictor (' + win + ')':<30} | {'Accuracy':<20} | {dp['models'][win]['accuracy']:<10.4f}")
        print(f"{'':<30} | {'F1-Score':<20} | {dp['models'][win]['f1']:<10.4f}")
        print(f"{'':<30} | {'ROC-AUC':<20} | {dp['models'][win]['roc_auc']:<10.4f}")
        
    # Clustering Analyzer
    if "cluster_analyzer" in all_metrics:
        ca = all_metrics["cluster_analyzer"]
        print(f"{'Clustering (K-Means)':<30} | {'Silhouette Score':<20} | {ca['silhouette_score']:<10.4f}")
        print(f"{'':<30} | {'Inertia':<20} | {ca['inertia']:<10.2f}")
        
    print("="*80)
    logger.info("Training pipeline completed. Models saved to %s", settings.MODELS_DIR)


if __name__ == "__main__":
    main()
