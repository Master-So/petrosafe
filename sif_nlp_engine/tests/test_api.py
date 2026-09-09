"""Unit tests for the FastAPI service endpoints."""

import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health check returns status ok and model description."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model" in data
    assert "version" in data


def test_metadata_endpoint():
    """Verify system metadata and regulatory disclaimers."""
    response = client.get("/metadata")
    assert response.status_code == 200
    data = response.json()
    assert "available_sites" in data
    assert "iogp_rules" in data
    assert "disclaimer" in data


def test_predict_validation_error_on_empty_text():
    """Verify HTTP 422 Unprocessable Entity on empty or too short input text."""
    response = client.post("/predict", json={"text": ""})
    assert response.status_code == 422

    response2 = client.post("/predict", json={"text": "ab"})
    assert response2.status_code == 422
