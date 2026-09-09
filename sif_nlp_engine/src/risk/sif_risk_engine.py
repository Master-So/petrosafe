"""SIF Risk Scoring Engine.

Calculates multi-factor precursor risk scores using configurable weights and thresholds.
IMPORTANT: Prototype engineering risk score only; not official OIL/IOGP risk methodology.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_WEIGHTS: Dict[str, int] = {
    "energy_exposure": 20,
    "isolation_failure": 25,
    "line_of_fire": 20,
    "fall_exposure": 20,
    "confined_space": 25,
    "hot_work": 20,
    "barrier_failure": 15,
}


class SIFRiskEngine:
    """Calculates prototype precursor risk scores and risk categories."""

    def __init__(self, config: Optional[Dict[str, Any]] = None) -> None:
        risk_cfg = config.get("risk", {}) if config else {}
        self.weights = risk_cfg.get("weights", DEFAULT_WEIGHTS)

    def calculate_risk(
        self,
        precursors: List[Dict[str, Any]],
        barrier_failures: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Calculates multi-factor risk score (0-100) and assigns qualitative category.

        Args:
            precursors: List of detected precursor dictionaries.
            barrier_failures: List of detected barrier failure dictionaries.

        Returns:
            Dictionary containing 'risk_score' (int), 'risk_category' (str),
            and 'contributing_factors' (list of dicts).
        """
        score = 0
        factors = []

        # Tally precursor weights
        precursor_cats = {p.get("category") for p in precursors}
        for cat in precursor_cats:
            w = self.weights.get(cat, 15)
            score += w
            factors.append({"factor": cat, "weight": w})

        # Add barrier failure weight
        if barrier_failures:
            bf_weight = self.weights.get("barrier_failure", 15) * min(len(barrier_failures), 2)
            score += bf_weight
            factors.append({"factor": "barrier_failure", "weight": bf_weight})

        # Clamp score to 0 - 100
        score = min(max(score, 0), 100)

        # Categorize
        if score >= 80:
            category = "CRITICAL"
        elif score >= 60:
            category = "HIGH"
        elif score >= 30:
            category = "MEDIUM"
        else:
            category = "LOW"

        return {
            "risk_score": score,
            "risk_category": category,
            "contributing_factors": factors,
            "disclaimer": "Prototype precursor risk score only. Not official OIL/IOGP risk methodology.",
        }
