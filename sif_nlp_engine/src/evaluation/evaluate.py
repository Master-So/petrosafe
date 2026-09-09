"""Model evaluation and benchmarking suite.

Computes Precision, Recall, F1, ROC-AUC, PR-AUC, Accuracy, and Confusion Matrix
on the untouched test partition. Generates structured comparison JSON and terminal tables.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    auc,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
)

logger = logging.getLogger(__name__)


def compute_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: Optional[np.ndarray] = None,
) -> Dict[str, Any]:
    """Calculates comprehensive classification metrics for SIF prediction.

    Args:
        y_true: Ground truth binary targets (0 or 1).
        y_pred: Predicted binary labels (0 or 1).
        y_prob: Predicted continuous probabilities [0.0, 1.0].

    Returns:
        Dictionary containing all evaluation metrics.
    """
    y_true = np.asarray(y_true).astype(int)
    y_pred = np.asarray(y_pred).astype(int)

    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, zero_division=0))
    rec = float(recall_score(y_true, y_pred, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, zero_division=0))
    cm = confusion_matrix(y_true, y_pred).tolist()

    roc_auc_val = 0.0
    pr_auc_val = 0.0
    if y_prob is not None:
        y_prob = np.asarray(y_prob).astype(float)
        try:
            roc_auc_val = float(roc_auc_score(y_true, y_prob))
        except ValueError:
            roc_auc_val = 0.0

        try:
            precision_curve, recall_curve, _ = precision_recall_curve(y_true, y_prob)
            pr_auc_val = float(auc(recall_curve, precision_curve))
        except ValueError:
            pr_auc_val = 0.0

    return {
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1": round(f1, 4),
        "roc_auc": round(roc_auc_val, 4),
        "pr_auc": round(pr_auc_val, 4),
        "confusion_matrix": cm,
    }


def evaluate_predictions(
    model_results: Dict[str, Dict[str, Any]],
    output_dir: str = "artifacts/evaluation",
) -> Dict[str, Any]:
    """Generates comparison summary, saves JSON artifact, and outputs formatted table."""
    out_p = Path(output_dir)
    out_p.mkdir(parents=True, exist_ok=True)

    summary_file = out_p / "model_comparison.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(model_results, f, indent=2)

    logger.info("Saved model evaluation comparison to: %s", summary_file)
    return model_results
