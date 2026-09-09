"""Unit tests for equipment, activity, and hazard extraction."""

import pytest
from src.extraction.activity_extractor import extract_activity
from src.extraction.equipment_extractor import extract_equipment
from src.extraction.hazard_extractor import extract_hazards_and_exposures


def test_extract_equipment_tags():
    """Verify conservative extraction of equipment types and tag IDs."""
    # Test Compressor K-201
    eq1 = extract_equipment("Maintenance was performed on compressor K-201.")
    assert eq1["equipment_type"] == "Compressor"
    assert eq1["equipment_id"] == "K-201"

    # Test Pump P-102
    eq2 = extract_equipment("Technician inspected pump P-102 at the plant.")
    assert eq2["equipment_type"] == "Pump"
    assert eq2["equipment_id"] == "P-102"

    # Test Valve V-204A
    eq3 = extract_equipment("Isolation of valve V-204A was in progress.")
    assert eq3["equipment_type"] == "Valve"
    assert eq3["equipment_id"] == "V-204A"


def test_extract_activity():
    """Verify primary industrial activity extraction."""
    assert extract_activity("Performing overhaul and maintenance on drill rod.") == "Maintenance"
    assert extract_activity("Inspection and auditing of high voltage switchgear.") == "Inspection"
    assert extract_activity("Excavation work with pick in sub-station.") == "Excavation"


def test_extract_hazards_and_exposures():
    """Verify physical hazard and worker exposure identification."""
    text = "High pressure release exposed workers to line of fire and electrical contact at 440V."
    hazards, exposures = extract_hazards_and_exposures(text)

    assert "Pressure" in hazards
    assert "Electrical" in hazards
    assert "Line of Fire" in exposures
    assert "Electrical Contact" in exposures
