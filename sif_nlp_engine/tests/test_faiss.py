"""Unit tests for FAISS vector store operations."""

import numpy as np
import pandas as pd
import pytest
from src.vectorstore.faiss_store import FaissVectorStore


def test_faiss_store_build_and_search(tmp_path):
    """Verify index creation, exact cosine retrieval ordering, and persistence."""
    # Create 3 normalized vectors of dimension 4
    v1 = np.array([1.0, 0.0, 0.0, 0.0], dtype=np.float32)
    v2 = np.array([0.0, 1.0, 0.0, 0.0], dtype=np.float32)
    v3 = np.array([0.7071, 0.7071, 0.0, 0.0], dtype=np.float32)
    embeddings = np.vstack([v1, v2, v3])

    metadata_df = pd.DataFrame({
        "report_id": ["R000001", "R000002", "R000003"],
        "description_clean": ["desc 1", "desc 2", "desc 3"],
        "sif_proxy": [1, 0, 1],
    })

    store = FaissVectorStore()
    store.build_index(embeddings, metadata_df)

    assert store.index.ntotal == 3

    # Query identical to v1 -> top result must be R000001 with similarity ~1.0
    results = store.search(v1, top_k=2)
    assert len(results) == 2
    assert results[0]["report_id"] == "R000001"
    assert pytest.approx(results[0]["similarity"], 1e-4) == 1.0
    assert results[1]["report_id"] == "R000003"
    assert pytest.approx(results[1]["similarity"], 1e-4) == 0.7071

    # Test serialization and deserialization
    idx_path = tmp_path / "test.index"
    meta_path = tmp_path / "test_meta.json"
    store.save(str(idx_path), str(meta_path))

    new_store = FaissVectorStore()
    new_store.load(str(idx_path), str(meta_path))
    assert new_store.index.ntotal == 3
    new_results = new_store.search(v1, top_k=1)
    assert new_results[0]["report_id"] == "R000001"
