"""Hazard and exposure extraction module."""

import re
from typing import Dict, List, Tuple

HAZARDS_VOCABULARY: Dict[str, List[str]] = {
    "Stored Energy": ["stored energy", "residual energy", "pressurized", "spring loaded"],
    "Pressure": ["pressure", "hydraulic", "pneumatic", "depressurisation", "depressurization", "discharge"],
    "Electrical": ["electrical", "voltage", "440v", "shock", "short circuit", "sub-station"],
    "Fire/Explosion": ["fire", "explosion", "flame", "spark", "combustible", "gas leak"],
    "Fall": ["fall", "height", "scaffold", "ladder", "slip", "elevation"],
    "Vehicle": ["vehicle", "truck", "forklift", "collision", "mobile equipment"],
    "Confined Space": ["confined space", "vessel entry", "tank entry", "atmosphere"],
    "Chemical": ["chemical", "acid", "sulfide", "toxic", "sulphide", "caustic", "dust"],
    "Mechanical": ["mechanical", "pulley", "transmission belt", "rotating", "pinched", "gear"],
    "Dropped Object": ["dropped object", "falling object", "fell from", "falls from a distance"],
}

EXPOSURES_VOCABULARY: Dict[str, List[str]] = {
    "Line of Fire": ["line of fire", "struck by", "in front of", "discharge line", "trajectory"],
    "Pressure Release": ["pressure release", "unclog the discharge", "depressurisation", "solution was designed"],
    "Caught Between": ["caught between", "tightens the fingers", "finger traps", "pinch point", "pinched"],
    "Fall from Height": ["fall from height", "fall from a distance", "elevated", "working at height"],
    "Electrical Contact": ["electrical contact", "electrocution", "energized line"],
    "Moving Machinery": ["moving machinery", "rotating pulley", "conveyor belt", "transmission belt"],
    "Dropped Object": ["dropped object", "object fell", "falling rock", "bounces off"],
    "Toxic / Chemical Exposure": ["irritation in the eyes", "chemical spray", "inhalation", "skin contact"],
}


def extract_hazards_and_exposures(text: str) -> Tuple[List[str], List[str]]:
    """Extracts dangerous physical hazards and worker exposure modes.

    Args:
        text: Incident report description.

    Returns:
        Tuple of (detected_hazards_list, detected_exposures_list).
    """
    text_lower = text.lower()

    detected_hazards = []
    for hazard, keywords in HAZARDS_VOCABULARY.items():
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
                detected_hazards.append(hazard)
                break

    detected_exposures = []
    for exposure, keywords in EXPOSURES_VOCABULARY.items():
        for kw in keywords:
            if re.search(r"\b" + re.escape(kw) + r"\b", text_lower):
                detected_exposures.append(exposure)
                break

    return detected_hazards, detected_exposures
