"""Unit tests for the embedding engine."""

import numpy as np
import pytest
from src.embeddings.embedding_engine import EmbeddingEngine


def test_embedding_engine_shape_and_normalization():
    """Verify that embeddings are normalized float32 vectors with correct dimension."""
    # Use small MiniLM for fast unit testing
    engine = EmbeddingEngine(model_name="sentence-transformers/all-MiniLM-L6-v2", normalize_embeddings=True)
    texts = [
        "Worker fell from scaffolding at high altitude.",
        "Maintenance on hydraulic pump without isolation.",
    ]
    embeddings = engine.encode(texts)

    assert isinstance(embeddings, np.ndarray)
    assert embeddings.shape == (2, 384)
    assert embeddings.dtype == np.float32

    # Verify L2 normalization: Euclidean norm of each vector should be ~1.0
    norms = np.linalg.norm(embeddings, axis=1)
    np.testing.assert_allclose(norms, [1.0, 1.0], atol=1e-5)


def test_embedding_engine_empty_input():
    """Verify safe handling of empty input list."""
    engine = EmbeddingEngine(model_name="sentence-transformers/all-MiniLM-L6-v2")
    empty_res = engine.encode([])
    assert empty_res.shape == (0, 384)
