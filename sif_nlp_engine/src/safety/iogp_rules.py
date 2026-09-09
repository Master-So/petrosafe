"""IOGP Life-Saving Rules mapping module.

Maps incident conditions, detected precursors, and text signals to the official
IOGP (International Association of Oil & Gas Producers) Life-Saving Rules.
"""

import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Transparent mapping of IOGP Life-Saving Rules to domain signal keywords
IOGP_RULE_DEFINITIONS: Dict[str, List[str]] = {
    "Energy Isolation": [
        "isolation",
        "zero energy",
        "zero-energy",
        "loto",
        "lockout",
        "tagout",
        "de-energized",
        "de-energize",
        "without isolation",
        "electrical isolation",
    ],
    "Line of Fire": [
        "line of fire",
        "struck by",
        "caught between",
        "pinch point",
        "pressure release",
        "moving object",
        "projectile",
        "suspended load",
        "tightens the fingers",
        "finger traps",
    ],
    "Confined Space": [
        "confined space",
        "tank entry",
        "vessel entry",
        "manhole",
        "atmosphere test",
        "gas test",
        "oxygen deficient",
    ],
    "Hot Work": [
        "hot work",
        "welding",
        "cutting",
        "grinding",
        "spark",
        "ignition",
        "open flame",
        "torch",
    ],
    "Working at Height": [
        "working at height",
        "scaffold",
        "scaffolding",
        "ladder",
        "fall protection",
        "safety harness",
        "fall from height",
        "elevation",
    ],
    "Safe Mechanical Lifting": [
        "crane",
        "rigging",
        "suspended load",
        "hoist",
        "lifting gear",
        "sling",
        "winch",
    ],
    "Driving": [
        "driving",
        "vehicle",
        "truck",
        "seatbelt",
        "speeding",
        "forklift",
        "collision",
    ],
    "Work Authorisation": [
        "work permit",
        "permit to work",
        "ptw",
        "authorisation",
        "authorization",
        "unauthorised",
        "toolbox talk",
    ],
    "Bypassing Safety Controls": [
        "bypassing safety controls",
        "bypassed",
        "interlock bypassed",
        "safety device removed",
        "override",
        "guard removed",
    ],
}


def map_iogp_rules(
    text: str,
    detected_precursors: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Maps safety report description to relevant IOGP Life-Saving Rules.

    Args:
        text: Incident report description.
        detected_precursors: Optional list of already detected precursors.

    Returns:
        List of matched IOGP rules with supporting matched terms and evidence.
    """
    text_lower = text.lower()
    matched_rules: List[Dict[str, Any]] = []

    # Map directly from text signals
    for rule_name, keywords in IOGP_RULE_DEFINITIONS.items():
        matched_terms = []
        for kw in keywords:
            pattern = r"\b" + re.escape(kw) + r"\b"
            if re.search(pattern, text_lower):
                matched_terms.append(kw)

        if matched_terms:
            matched_rules.append({
                "rule": rule_name,
                "matched_terms": matched_terms,
            })

    # Cross-reference with detected precursors if provided
    if detected_precursors:
        precursor_cats = {p.get("category") for p in detected_precursors}
        rule_names = {r["rule"] for r in matched_rules}

        if "isolation_failure" in precursor_cats and "Energy Isolation" not in rule_names:
            matched_rules.append({"rule": "Energy Isolation", "matched_terms": ["precursor: isolation_failure"]})
        if "line_of_fire" in precursor_cats and "Line of Fire" not in rule_names:
            matched_rules.append({"rule": "Line of Fire", "matched_terms": ["precursor: line_of_fire"]})
        if "fall_exposure" in precursor_cats and "Working at Height" not in rule_names:
            matched_rules.append({"rule": "Working at Height", "matched_terms": ["precursor: fall_exposure"]})
        if "confined_space" in precursor_cats and "Confined Space" not in rule_names:
            matched_rules.append({"rule": "Confined Space", "matched_terms": ["precursor: confined_space"]})
        if "hot_work" in precursor_cats and "Hot Work" not in rule_names:
            matched_rules.append({"rule": "Hot Work", "matched_terms": ["precursor: hot_work"]})

    return matched_rules
