#!/usr/bin/env python3
"""Script 03: Build Normalized Text Embeddings.

Generates L2-normalized semantic vector representations for train.csv and test.csv
using BAAI/bge-small-en-v1.5 and sentence-transformers/all-MiniLM-L6-v2.

Usage:
    python scripts/03_build_embeddings.py [--config config.yaml]
"""

import argparse
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np
import pandas as pd
import yaml
from src.embeddings.embedding_engine import EmbeddingEngine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("03_build_embeddings")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate semantic text embeddings")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    config = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    processed_dir = Path(config.get("data", {}).get("processed_dir", "data/processed"))
    train_path = processed_dir / "train.csv"
    test_path = processed_dir / "test.csv"

    if not train_path.exists() or not test_path.exists():
        raise FileNotFoundError("train.csv or test.csv not found. Please run scripts/02_prepare_data.py first.")

    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)

    clean_col = config.get("preprocessing", {}).get("clean_text_column", "description_clean")
    train_texts = train_df[clean_col].fillna("").tolist()
    test_texts = test_df[clean_col].fillna("").tolist()

    out_dir = Path("models/embeddings")
    out_dir.mkdir(parents=True, exist_ok=True)

    models_to_build = [
        ("bge", config.get("model", {}).get("embedding_model", "BAAI/bge-small-en-v1.5")),
        ("minilm", config.get("model", {}).get("comparison_embedding_model", "sentence-transformers/all-MiniLM-L6-v2")),
    ]

    for tag, model_name in models_to_build:
        logger.info("=" * 60)
        logger.info("Encoding with model '%s' (%s)...", tag, model_name)
        logger.info("=" * 60)

        engine = EmbeddingEngine(model_name=model_name, normalize_embeddings=True)

        logger.info("Encoding %d training descriptions...", len(train_texts))
        train_emb = engine.encode(train_texts, batch_size=32, show_progress_bar=True)
        train_out = out_dir / f"train_embeddings_{tag}.npy"
        np.save(train_out, train_emb)

        logger.info("Encoding %d test descriptions...", len(test_texts))
        test_emb = engine.encode(test_texts, batch_size=32, show_progress_bar=True)
        test_out = out_dir / f"test_embeddings_{tag}.npy"
        np.save(test_out, test_emb)

        logger.info(
            "Saved %s embeddings: train shape %s -> %s | test shape %s -> %s",
            tag,
            train_emb.shape,
            train_out,
            test_emb.shape,
            test_out,
        )

    print("\n" + "=" * 80)
    print("EMBEDDINGS GENERATED SUCCESSFULLY FOR BGE AND MINILM")
    print(f"Artifacts saved to: {out_dir.resolve()}/")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
