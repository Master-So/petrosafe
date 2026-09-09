"""Unit tests for the weighted kNN classifier."""

import pytest
from src.models.knn_classifier import WeightedKNNClassifier


def test_knn_similarity_weighted_voting():
    """Verify similarity-weighted probability calculation."""
    knn = WeightedKNNClassifier(k=3, threshold=0.5)

    # 3 neighbors: two positive with high similarity, one negative with low similarity
    neighbors = [
        {"report_id": "R1", "similarity": 0.9, "sif_proxy": 1},
        {"report_id": "R2", "similarity": 0.8, "sif_proxy": 1},
        {"report_id": "R3", "similarity": 0.3, "sif_proxy": 0},
    ]

    # Weighted sum = (0.9*1 + 0.8*1 + 0.3*0) = 1.7
    # Total weight = 0.9 + 0.8 + 0.3 = 2.0
    # Expected prob = 1.7 / 2.0 = 0.85
    result = knn.predict_from_neighbors(neighbors)
    assert result["sif_potential"] is True
    assert pytest.approx(result["sif_probability"], 1e-3) == 0.85
    assert result["evaluated_k"] == 3


def test_knn_negative_decision():
    """Verify negative classification when majority weight is non-SIF."""
    knn = WeightedKNNClassifier(k=2, threshold=0.5)
    neighbors = [
        {"report_id": "R1", "similarity": 0.9, "sif_proxy": 0},
        {"report_id": "R2", "similarity": 0.1, "sif_proxy": 1},
    ]
    # Weighted sum = 0.1 / 1.0 = 0.10
    result = knn.predict_from_neighbors(neighbors)
    assert result["sif_potential"] is False
    assert pytest.approx(result["sif_probability"], 1e-3) == 0.10


def test_knn_empty_neighbors():
    """Verify fallback behavior with empty neighbors list."""
    knn = WeightedKNNClassifier(k=5, threshold=0.5)
    result = knn.predict_from_neighbors([])
    assert result["sif_potential"] is False
    assert result["sif_probability"] == 0.0
