"""Activity extraction module for industrial safety reports."""

import logging
import re
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

ACTIVITY_VOCABULARY: Dict[str, List[str]] = {
    "Maintenance": ["maintenance", "repair", "servicing", "overhaul", "replacement", "lubrication"],
    "Inspection": ["inspection", "check", "verifying", "auditing", "patrol", "assessment", "gauge"],
    "Lifting": ["lifting", "rigging", "crane operation", "hoisting", "unloading", "loading"],
    "Hot Work": ["hot work", "welding", "grinding", "cutting", "burning", "soldering"],
    "Construction": ["construction", "assembly", "installation", "building", "erection"],
    "Drilling": ["drilling", "boring", "drilling bar", "raise bore", "drill rod"],
    "Transportation": ["transportation", "driving", "transit", "delivery", "hauling"],
    "Operations": ["operation", "operating", "start-up", "shutdown", "running", "production"],
    "Electrical Work": ["electrical work", "wiring", "panel maintenance", "cable pulling"],
    "Cleaning": ["cleaning", "washdown", "flushing", "sweeping", "housekeeping", "purging"],
    "Excavation": ["excavation", "trenching", "digging", "drilling hole", "quarry"],
    "Uncoupling / Connection": ["uncoupled", "coupling", "connecting", "disconnection", "unclog"],
}


def extract_activity(text: str) -> str:
    """Extracts the primary industrial activity described in the report.

    Args:
        text: Incident description.

    Returns:
        Primary detected activity category (defaults to 'Operations' or 'Maintenance' if unspecified).
    """
    text_lower = text.lower()

    for activity, keywords in ACTIVITY_VOCABULARY.items():
        for kw in keywords:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, text_lower):
                return activity

    return "General Activity"
