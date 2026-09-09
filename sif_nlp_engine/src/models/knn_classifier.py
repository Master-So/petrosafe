"""Similarity-weighted kNN classifier for SIF prediction.

Performs soft probability estimation using cosine similarity-weighted voting
over the top-K retrieved nearest neighbors from historical safety reports.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.metrics import f1_score, precision_recall_curve, auc
from sklearn.model_selection import StratifiedKFold

logger = logging.getLogger(__name__)


class WeightedKNNClassifier:
    """Similarity-weighted nearest neighbor classifier for incident reports."""

    def __init__(self, k: int = 10, threshold: float = 0.5) -> None:
        """Initializes the kNN classifier.

        Args:
            k: Number of nearest neighbors to consider.
            threshold: Decision threshold for positive SIF classification.
        """
        self.k = k
        self.threshold = threshold

    def predict_from_neighbors(
        self,
        neighbors: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Calculates probability and binary decision from retrieved neighbors.

        Formula:
            weighted_score = sum(similarity_i * label_i) / sum(max(0, similarity_i))

        Args:
            neighbors: List of retrieved neighbor dictionaries containing
                       'similarity' (float) and 'sif_proxy' (int).

        Returns:
            Dictionary with 'sif_potential' (bool), 'sif_probability' (float),
            and 'evaluated_k' (int).
        """
        if not neighbors:
            return {
                "sif_potential": False,
                "sif_probability": 0.0,
                "evaluated_k": 0,
            }

        k_neighbors = neighbors[: self.k]

        weights = []
        labels = []
        for n in k_neighbors:
            # Cosine similarity can theoretically be slightly negative; clamp to 0
            sim = max(0.0, float(n.get("similarity", 0.0)))
            label = int(n.get("sif_proxy", 0))
            weights.append(sim)
            labels.append(label)

        total_weight = sum(weights)
        if total_weight <= 1e-7:
            # Fallback to unweighted average if similarities are all near zero
            prob = float(np.mean(labels))
        else:
            prob = float(sum(w * y for w, y in zip(weights, labels)) / total_weight)

        prob = min(max(prob, 0.0), 1.0)
        prediction = prob >= self.threshold

        return {
            "sif_potential": bool(prediction),
            "sif_probability": round(prob, 4),
            "evaluated_k": len(k_neighbors),
        }

    @staticmethod
    def tune_k(
        train_embeddings: np.ndarray,
        train_labels: np.ndarray,
        candidate_k_values: Optional[List[int]] = None,
        cv_folds: int = 5,
        random_state: int = 42,
    ) -> Tuple[int, Dict[int, Dict[str, float]]]:
        """Finds the optimal K value using stratified cross-validation on the training set.

        Args:
            train_embeddings: Normalized embeddings matrix (N, D).
            train_labels: Binary label vector (N,).
            candidate_k_values: List of K values to benchmark (e.g. [3, 5, 10, 20, 50]).
            cv_folds: Number of cross-validation folds.
            random_state: Reproducibility seed.

        Returns:
            Tuple of (best_k, validation_results_dict).
        """
        if candidate_k_values is None:
            candidate_k_values = [3, 5, 10, 20, 50]

        skf = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=random_state)
        k_results: Dict[int, Dict[str, float]] = {}

        # Compute full cosine similarity matrix (inner product of normalized vectors)
        sim_matrix = np.dot(train_embeddings, train_embeddings.T)

        for k in candidate_k_values:
            fold_f1s = []
            fold_pr_aucs = []

            for train_idx, val_idx in skf.split(train_embeddings, train_labels):
                y_val = train_labels[val_idx]
                val_probs = []

                for i_val in val_idx:
                    # Retrieve similarities between val sample and all train fold samples
                    sims = sim_matrix[i_val, train_idx]
                    labels = train_labels[train_idx]

                    # Top-k indices
                    top_k_idx = np.argsort(sims)[::-1][:k]
                    top_sims = np.maximum(0.0, sims[top_k_idx])
                    top_labels = labels[top_k_idx]

                    tot_w = np.sum(top_sims)
                    if tot_w <= 1e-7:
                        prob = float(np.mean(top_labels))
                    else:
                        prob = float(np.sum(top_sims * top_labels) / tot_w)
                    val_probs.append(prob)

                val_probs = np.array(val_probs)
                val_preds = (val_probs >= 0.5).astype(int)

                f1 = f1_score(y_val, val_preds, zero_division=0)
                prec, rec, _ = precision_recall_curve(y_val, val_probs)
                pr_auc_val = auc(rec, prec)

                fold_f1s.append(f1)
                fold_pr_aucs.append(pr_auc_val)

            mean_f1 = float(np.mean(fold_f1s))
            mean_pr_auc = float(np.mean(fold_pr_aucs))
            k_results[k] = {
                "mean_f1": round(mean_f1, 4),
                "mean_pr_auc": round(mean_pr_auc, 4),
            }
            logger.info("k=%d: Mean CV F1=%.4f, Mean PR-AUC=%.4f", k, mean_f1, mean_pr_auc)

        # Select best K primarily based on PR-AUC (with F1 as tiebreaker)
        best_k = max(k_results.keys(), key=lambda k: (k_results[k]["mean_pr_auc"], k_results[k]["mean_f1"]))
        logger.info("Selected optimal k=%d through %d-fold cross-validation.", best_k, cv_folds)

        return best_k, k_results
