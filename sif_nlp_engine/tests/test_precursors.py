"""Unit tests for safety precursor detection and IOGP rules mapping."""

import pytest
from src.safety.iogp_rules import map_iogp_rules
from src.safety.precursor_detector import SafetyPrecursorDetector


@pytest.fixture
def detector():
    return SafetyPrecursorDetector()


def test_detect_energy_isolation_failure(detector):
    """Verify isolation failure and energy exposure detection with matched terms."""
    text = "Technician opened valve before confirming zero energy isolation. System was pressurized."
    precursors = detector.detect_precursors(text)
    names = [p["name"] for p in precursors]

    assert "Isolation Failure" in names
    assert "Energy Exposure" in names

    barriers = detector.detect_barrier_failures(text)
    b_types = [b["type"] for b in barriers]
    assert any("Isolation" in t for t in b_types)


def test_detect_line_of_fire(detector):
    """Verify line of fire exposure detection."""
    text = "Worker in the line of fire was struck by moving object during pipe disconnection."
    precursors = detector.detect_precursors(text)
    names = [p["name"] for p in precursors]

    assert "Line of Fire" in names


def test_detect_confined_space_and_hot_work(detector):
    """Verify confined space and hot work identification."""
    text = "Welding and cutting performed inside confined space tank entry without gas test."
    precursors = detector.detect_precursors(text)
    names = [p["name"] for p in precursors]

    assert "Confined Space" in names
    assert "Hot Work" in names


def test_map_iogp_rules():
    """Verify transparent IOGP Life-Saving Rules mapping."""
    text = "Working at height on scaffolding without safety harness."
    rules = map_iogp_rules(text)
    rule_names = [r["rule"] for r in rules]

    assert "Working at Height" in rule_names
