"""Unified event parsing interface for industrial safety reports."""

from typing import Any, Dict

from src.extraction.activity_extractor import extract_activity
from src.extraction.equipment_extractor import extract_equipment
from src.extraction.hazard_extractor import extract_hazards_and_exposures


class EventParser:
    """Orchestrates structured entity and domain attribute extraction from safety texts."""

    def __init__(self) -> None:
        pass

    def parse(self, text: str) -> Dict[str, Any]:
        """Extracts equipment, activity, hazards, and exposures from free-form report text."""
        equipment_info = extract_equipment(text)
        activity = extract_activity(text)
        hazards, exposures = extract_hazards_and_exposures(text)

        return {
            "equipment": equipment_info,
            "activity": activity,
            "hazards": hazards,
            "exposures": exposures,
        }
