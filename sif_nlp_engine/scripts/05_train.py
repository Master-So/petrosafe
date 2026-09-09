#!/usr/bin/env python3
"""Script 05: Train Classifiers and Tune Weighted kNN Hyperparameters.

Trains classical TF-IDF baselines on train.csv.
Performs 5-fold cross-validation on train embeddings to select the optimal K for kNN.
Persists model artifacts to models/classifiers/ and models/metadata/.

Usage:
    python scripts/05_train.py [--config config.yaml]
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
from src.models.baseline_classifier import BaselineClassifiers
from src.models.knn_classifier import WeightedKNNClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("05_train")


def main() -> None:
    parser = argparse.ArgumentParser(description="Train SIF classifiers and tune kNN")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    config = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    processed_dir = Path(config.get("data", {}).get("processed_dir", "data/processed"))
    train_df = pd.read_csv(processed_dir / "train.csv")

    clean_col = config.get("preprocessing", {}).get("clean_text_column", "description_clean")
    train_texts = train_df[clean_col].fillna("").tolist()
    train_labels = train_df["sif_proxy"].values.astype(int)

    # 1. Train Classical TF-IDF Baselines
    logger.info("=" * 60)
    logger.info("TRAINING CLASSICAL TF-IDF BASELINES")
    logger.info("=" * 60)
    baselines = BaselineClassifiers(random_state=config.get("split", {}).get("random_state", 42))
    baselines.fit(train_texts, train_labels)
    baselines.save("models/classifiers")

    # 2. Tune K for Weighted kNN using 5-Fold Cross-Validation on Training Embeddings
    logger.info("=" * 60)
    logger.info("TUNING kNN HYPERPARAMETER K (5-FOLD CV ON TRAIN SPLIT)")
    logger.info("=" * 60)

    emb_dir = Path("models/embeddings")
    k_candidates = [3, 5, 10, 20, 50]
    best_k_dict = {}

    for tag in ["bge", "minilm"]:
        emb_file = emb_dir / f"train_embeddings_{tag}.npy"
        if not emb_file.exists():
            raise FileNotFoundError(f"Missing embeddings: {emb_file}")

        train_emb = np.load(emb_file)
        logger.info("Tuning K for '%s' embeddings over candidate K values: %s...", tag, k_candidates)
        best_k, k_results = WeightedKNNClassifier.tune_k(
            train_embeddings=train_emb,
            train_labels=train_labels,
            candidate_k_values=k_candidates,
            cv_folds=5,
            random_state=42,
        )
        best_k_dict[tag] = {
            "optimal_k": best_k,
            "cv_results": k_results,
        }

    # Save model metadata
    meta_dir = Path("models/metadata")
    meta_dir.mkdir(parents=True, exist_ok=True)
    model_config = {
        "model_version": "0.1.0",
        "label_definition": "development_proxy",
        "train_samples": len(train_df),
        "best_k": best_k_dict,
        "selected_model": "bge",
        "decision_threshold": config.get("model", {}).get("threshold", 0.5),
        "disclaimer": "The current SIF label is a development proxy derived from Potential Accident Level and is not an official OIL/IOGP SIF classification.",
    }

    with open(meta_dir / "model_config.json", "w", encoding="utf-8") as f:
        json.dump(model_config, f, indent=2)

    print("\n" + "=" * 80)
    print("MODEL TRAINING & HYPERPARAMETER TUNING COMPLETED")
    print("=" * 80)
    print(f"Classical Baselines Saved To: models/classifiers/")
    print(f"Optimal K for BGE           : {best_k_dict['bge']['optimal_k']}")
    print(f"Optimal K for MiniLM        : {best_k_dict['minilm']['optimal_k']}")
    print(f"Model Metadata Saved To     : models/metadata/model_config.json")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
