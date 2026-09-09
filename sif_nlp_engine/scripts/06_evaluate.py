#!/usr/bin/env python3
"""Script 06: Comprehensive Model Evaluation on Untouched Test Partition.

Evaluates all models strictly on test.csv (123 reports) using the FAISS train index.
Reports Accuracy, Precision, Recall, F1, ROC-AUC, PR-AUC, and Confusion Matrix.
Saves comparison artifacts to artifacts/evaluation/model_comparison.json.

Usage:
    python scripts/06_evaluate.py [--config config.yaml]
"""

import argparse
import json
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
import yaml
from src.evaluation.evaluate import compute_metrics, evaluate_predictions
from src.models.baseline_classifier import BaselineClassifiers
from src.models.knn_classifier import WeightedKNNClassifier
from src.vectorstore.faiss_store import FaissVectorStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("06_evaluate")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate SIF models on test partition")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    config = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    processed_dir = Path(config.get("data", {}).get("processed_dir", "data/processed"))
    test_df = pd.read_csv(processed_dir / "test.csv")

    clean_col = config.get("preprocessing", {}).get("clean_text_column", "description_clean")
    test_texts = test_df[clean_col].fillna("").tolist()
    y_test = test_df["sif_proxy"].values.astype(int)

    # Load tuned model metadata
    meta_path = Path("models/metadata/model_config.json")
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            meta = json.load(f)
    else:
        meta = {"best_k": {"bge": {"optimal_k": 10}, "minilm": {"optimal_k": 10}}}

    threshold = float(config.get("model", {}).get("threshold", 0.5))
    results = {}

    logger.info("=" * 70)
    logger.info("EVALUATING MODELS ON UNTOUCHED TEST SET (N=%d)", len(test_df))
    logger.info("=" * 70)

    # 1. Evaluate TF-IDF + Logistic Regression
    baselines = BaselineClassifiers()
    baselines.load("models/classifiers")

    preds_logreg, probs_logreg = baselines.predict_logreg(test_texts, threshold=threshold)
    results["TF-IDF + Logistic Regression"] = compute_metrics(y_test, preds_logreg, probs_logreg)

    # 2. Evaluate TF-IDF + Linear SVM
    preds_svm, probs_svm = baselines.predict_svm(test_texts, threshold=threshold)
    results["TF-IDF + Linear SVM"] = compute_metrics(y_test, preds_svm, probs_svm)

    # 3 & 4. Evaluate kNN models using FAISS train index
    emb_dir = Path("models/embeddings")
    store_dir = Path("artifacts/vector_store")

    for tag, display_name in [
        ("minilm", "MiniLM + Weighted kNN"),
        ("bge", "BGE + Weighted kNN"),
    ]:
        k = int(meta.get("best_k", {}).get(tag, {}).get("optimal_k", 10))
        test_emb_file = emb_dir / f"test_embeddings_{tag}.npy"
        idx_file = store_dir / f"faiss_train_{tag}.index"
        meta_file = store_dir / f"faiss_train_{tag}_metadata.json"

        if not test_emb_file.exists() or not idx_file.exists():
            logger.warning("Skipping %s due to missing files.", display_name)
            continue

        test_emb = np.load(test_emb_file)
        store = FaissVectorStore()
        store.load(str(idx_file), str(meta_file))

        knn = WeightedKNNClassifier(k=k, threshold=threshold)
        knn_preds = []
        knn_probs = []

        for i in range(len(test_emb)):
            neighbors = store.search(test_emb[i], top_k=k)
            pred_dict = knn.predict_from_neighbors(neighbors)
            knn_preds.append(int(pred_dict["sif_potential"]))
            knn_probs.append(pred_dict["sif_probability"])

        results[f"{display_name} (k={k})"] = compute_metrics(
            y_test,
            np.array(knn_preds),
            np.array(knn_probs),
        )

    # Save results
    evaluate_predictions(results, output_dir="artifacts/evaluation")

    # Format table output
    print("\n" + "=" * 80)
    print("MODEL BENCHMARK COMPARISON ON UNTOUCHED TEST PARTITION (N=123)")
    print("=" * 80)
    header = f"{'Model':<32} | {'Precision':<9} | {'Recall':<7} | {'F1':<7} | {'PR-AUC':<7} | {'ROC-AUC':<7} | {'Accuracy':<8}"
    print(header)
    print("-" * len(header))
    for model_name, m in results.items():
        print(
            f"{model_name:<32} | "
            f"{m['precision']:<9.4f} | "
            f"{m['recall']:<7.4f} | "
            f"{m['f1']:<7.4f} | "
            f"{m['pr_auc']:<7.4f} | "
            f"{m['roc_auc']:<7.4f} | "
            f"{m['accuracy']:<8.4f}"
        )
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
