#!/usr/bin/env python3
"""Script 04: Build FAISS Vector Retrieval Index (Training Set Only).

Constructs cosine similarity indices (IndexFlatIP) exclusively over training records.
Strictly verifies that no test records leak into the retrieval store.

Usage:
    python scripts/04_build_faiss.py [--config config.yaml]
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
from src.vectorstore.faiss_store import FaissVectorStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("04_build_faiss")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build FAISS Vector Retrieval Index")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    config = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    processed_dir = Path(config.get("data", {}).get("processed_dir", "data/processed"))
    train_df = pd.read_csv(processed_dir / "train.csv")
    test_df = pd.read_csv(processed_dir / "test.csv")

    emb_dir = Path("models/embeddings")
    out_dir = Path("artifacts/vector_store")
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. LEAKAGE ASSERTION: Verify train and test sets have disjoint IDs
    train_ids = set(train_df["report_id"])
    test_ids = set(test_df["report_id"])
    if not train_ids.isdisjoint(test_ids):
        raise ValueError("CRITICAL LEAKAGE ERROR: Overlap detected between train and test report_ids!")

    for tag in ["bge", "minilm"]:
        emb_file = emb_dir / f"train_embeddings_{tag}.npy"
        if not emb_file.exists():
            raise FileNotFoundError(f"Embedding file {emb_file} not found. Run scripts/03_build_embeddings.py first.")

        train_emb = np.load(emb_file)
        logger.info("Building FAISS index for '%s' with %d training embeddings...", tag, len(train_emb))

        store = FaissVectorStore()
        # Build index exclusively with training data
        store.build_index(train_emb, train_df)

        # 2. LEAKAGE ASSERTION: Verify index metadata contains ONLY training report_ids
        index_ids = {item["report_id"] for item in store.metadata}
        leaked_ids = index_ids.intersection(test_ids)
        if leaked_ids:
            raise ValueError(
                f"CRITICAL LEAKAGE ERROR: Test report_ids found in FAISS index metadata! {leaked_ids}"
            )

        index_path = out_dir / f"faiss_train_{tag}.index"
        meta_path = out_dir / f"faiss_train_{tag}_metadata.json"
        store.save(str(index_path), str(meta_path))

        logger.info("Successfully built and verified FAISS index for '%s'. Total indexed: %d", tag, store.index.ntotal)

    print("\n" + "=" * 80)
    print("FAISS VECTOR STORES CREATED SUCCESSFULLY (TRAINING PARTITION ONLY)")
    print("All leakage assertions passed: 0 test reports present in retrieval store.")
    print(f"Artifacts saved to: {out_dir.resolve()}/")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
