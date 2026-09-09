"""Equipment and equipment identifier extractor."""

import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Standard industrial equipment taxonomy
EQUIPMENT_TYPES: Dict[str, List[str]] = {
    "Compressor": ["compressor", "air compressor", "gas compressor"],
    "Pump": ["pump", "centrifugal pump", "hydraulic pump", "submersible pump"],
    "Valve": ["valve", "relief valve", "isolation valve", "ball valve", "gate valve"],
    "Pipeline": ["pipeline", "piping", "hose", "flange", "manifold", "flowline"],
    "Pressure Vessel": ["pressure vessel", "silo", "autoclave", "accumulator"],
    "Separator": ["separator", "cyclone", "decanter"],
    "Tank": ["tank", "storage tank", "vessel", "cistern"],
    "Crane": ["crane", "overhead crane", "mobile crane", "gantry"],
    "Generator": ["generator", "diesel generator", "alternator"],
    "Boiler": ["boiler", "furnace", "heater"],
    "Scaffold": ["scaffold", "scaffolding", "elevated work platform"],
    "Electrical Panel": ["electrical panel", "switchgear", "sub-station", "substation", "transformer"],
    "Drill": ["drill", "drilling rig", "jumbo", "jackhammer", "rock drill"],
    "Vehicle": ["truck", "forklift", "loader", "pickup", "van"],
    "Conveyor": ["conveyor", "belt", "feeder"],
}

# Conservative regular expression for industrial equipment tag numbers (e.g. K-201, P-102, V-204A, HM-100, CX-695)
EQUIPMENT_ID_REGEX = re.compile(
    r"\b(?:[A-Z]{1,3}-\d{2,4}[A-Z]?|[A-Z]{2,3}\s*\d{3,4})\b",
    re.IGNORECASE,
)


def extract_equipment(text: str) -> Dict[str, Optional[str]]:
    """Extracts equipment name, category, and specific equipment ID tag from description.

    Args:
        text: Safety incident description.

    Returns:
        Dictionary with 'name', 'equipment_type', and 'equipment_id'.
    """
    text_lower = text.lower()
    detected_type: Optional[str] = None
    detected_name: Optional[str] = None

    # 1. Match equipment type from domain taxonomy
    for eq_type, keywords in EQUIPMENT_TYPES.items():
        for kw in keywords:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, text_lower):
                detected_type = eq_type
                detected_name = kw.title()
                break
        if detected_type:
            break

    # 2. Extract equipment identifier tag using conservative regex
    equipment_id: Optional[str] = None
    matches = EQUIPMENT_ID_REGEX.findall(text)
    if matches:
        # Filter out obvious false positives (like 'COVID-19' or month codes)
        filtered = [m.upper().strip() for m in matches if not m.upper().startswith("COVID")]
        if filtered:
            equipment_id = filtered[0]

    return {
        "name": detected_name or (detected_type if detected_type else "Not Specified"),
        "equipment_type": detected_type or "Unspecified",
        "equipment_id": equipment_id,
    }
