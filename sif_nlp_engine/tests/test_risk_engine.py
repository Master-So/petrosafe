"""Unit tests for the prototype SIF risk scoring engine."""

import pytest
from src.risk.sif_risk_engine import SIFRiskEngine


def test_risk_scoring_bands():
    """Verify multi-factor risk calculation and qualitative band categorization."""
    engine = SIFRiskEngine()

    # 1. Low risk: no critical precursors
    low_res = engine.calculate_risk(precursors=[], barrier_failures=[])
    assert low_res["risk_score"] == 0
    assert low_res["risk_category"] == "LOW"

    # 2. Medium risk: one moderate precursor
    med_res = engine.calculate_risk(
        precursors=[{"category": "energy_exposure", "name": "Energy Exposure"}],
        barrier_failures=[],
    )
    assert med_res["risk_score"] == 20
    assert med_res["risk_category"] == "LOW"  # 20 is < 30, so LOW

    med_res2 = engine.calculate_risk(
        precursors=[{"category": "isolation_failure", "name": "Isolation Failure"}],
        barrier_failures=[{"type": "Isolation not verified"}],
    )
    # 25 + 15 = 40 -> MEDIUM
    assert med_res2["risk_score"] == 40
    assert med_res2["risk_category"] == "MEDIUM"

    # 3. Critical risk: multiple high-risk precursors + barrier breakdown
    crit_res = engine.calculate_risk(
        precursors=[
            {"category": "energy_exposure", "name": "Energy Exposure"},
            {"category": "isolation_failure", "name": "Isolation Failure"},
            {"category": "line_of_fire", "name": "Line of Fire"},
            {"category": "confined_space", "name": "Confined Space"},
        ],
        barrier_failures=[{"type": "Isolation not verified"}],
    )
    # 20 + 25 + 20 + 25 + 15 = 105 -> clamped to 100 -> CRITICAL
    assert crit_res["risk_score"] == 100
    assert crit_res["risk_category"] == "CRITICAL"
