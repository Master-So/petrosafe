"""Historical precursor pattern and recurring safety trend analytics engine.

Aggregates precursor density, barrier failure frequency, and SIF rates across
operational dimensions (site, activity, equipment, hazard, IOGP rule, time).
"""

import logging
from collections import Counter
from typing import Any, Dict, List, Optional

import pandas as pd
from src.extraction.event_parser import EventParser
from src.safety.iogp_rules import map_iogp_rules
from src.safety.precursor_detector import SafetyPrecursorDetector

logger = logging.getLogger(__name__)


class PatternEngine:
    """Computes multidimensional safety metrics and recurring precursor hotspots."""

    def __init__(self, enriched_df: Optional[pd.DataFrame] = None) -> None:
        self.enriched_df = enriched_df
        self.detector = SafetyPrecursorDetector()
        self.parser = EventParser()

    def enrich_dataset(self, df: pd.DataFrame) -> pd.DataFrame:
        """Enriches dataframe with precursors, equipment, activity, and IOGP rules."""
        logger.info("Enriching %d historical reports for pattern analysis...", len(df))
        enriched = df.copy()

        precursors_col = []
        activities_col = []
        equipment_col = []
        hazards_col = []
        iogp_col = []

        for text in enriched["description_clean"].fillna(""):
            p_objs = self.detector.detect_precursors(text)
            parsed = self.parser.parse(text)
            iogp = map_iogp_rules(text, detected_precursors=p_objs)

            precursors_col.append([p["name"] for p in p_objs])
            activities_col.append(parsed["activity"])
            equipment_col.append(parsed["equipment"]["equipment_type"])
            hazards_col.append(parsed["hazards"])
            iogp_col.append([r["rule"] for r in iogp])

        enriched["extracted_precursors"] = precursors_col
        enriched["extracted_activity"] = activities_col
        enriched["extracted_equipment"] = equipment_col
        enriched["extracted_hazards"] = hazards_col
        enriched["extracted_iogp_rules"] = iogp_col

        self.enriched_df = enriched
        return enriched

    def get_patterns_by_dimension(
        self,
        dimension: str = "equipment",
        site: Optional[str] = None,
        activity: Optional[str] = None,
        min_reports: int = 2,
    ) -> List[Dict[str, Any]]:
        """Calculates precursor density and SIF rates aggregated along a given dimension.

        Args:
            dimension: One of 'equipment', 'activity', 'site', 'hazard', 'iogp_rule'.
            site: Optional filter by site ('Local').
            activity: Optional filter by activity.
            min_reports: Minimum report threshold for statistical significance.

        Returns:
            List of aggregated pattern records.
        """
        if self.enriched_df is None:
            raise RuntimeError("Dataset has not been enriched. Call enrich_dataset first.")

        df = self.enriched_df.copy()

        # Apply filters
        if site and "Local" in df.columns:
            df = df[df["Local"].str.lower() == site.lower()]
        if activity and "extracted_activity" in df.columns:
            df = df[df["extracted_activity"].str.lower() == activity.lower()]

        patterns = []

        if dimension == "equipment":
            col = "extracted_equipment"
            for val, grp in df.groupby(col):
                if len(grp) < min_reports:
                    continue
                patterns.append(self._calculate_group_stats(val, grp))

        elif dimension == "activity":
            col = "extracted_activity"
            for val, grp in df.groupby(col):
                if len(grp) < min_reports:
                    continue
                patterns.append(self._calculate_group_stats(val, grp))

        elif dimension == "site":
            col = "Local"
            for val, grp in df.groupby(col):
                if len(grp) < min_reports:
                    continue
                patterns.append(self._calculate_group_stats(val, grp))

        elif dimension == "iogp_rule":
            # Explode multi-value list
            exploded = df.explode("extracted_iogp_rules")
            for val, grp in exploded.groupby("extracted_iogp_rules"):
                if pd.isna(val) or len(grp) < min_reports:
                    continue
                patterns.append(self._calculate_group_stats(val, grp))

        elif dimension == "hazard":
            exploded = df.explode("extracted_hazards")
            for val, grp in exploded.groupby("extracted_hazards"):
                if pd.isna(val) or len(grp) < min_reports:
                    continue
                patterns.append(self._calculate_group_stats(val, grp))

        # Sort by sif_density descending
        patterns.sort(key=lambda x: (x["sif_density"], x["total_reports"]), reverse=True)
        return patterns

    @staticmethod
    def _calculate_group_stats(value: Any, grp: pd.DataFrame) -> Dict[str, Any]:
        """Helper to calculate total, SIF count, SIF density, and top precursors."""
        total = len(grp)
        sif_count = int((grp["sif_proxy"] == 1).sum())
        density = round(sif_count / total, 4) if total > 0 else 0.0

        # Collect top precursors in this group
        all_precursors = []
        for p_list in grp["extracted_precursors"]:
            if isinstance(p_list, list):
                all_precursors.extend(p_list)

        top_precursors = [item[0] for item in Counter(all_precursors).most_common(3)]

        return {
            "value": str(value),
            "total_reports": total,
            "sif_reports": sif_count,
            "sif_density": density,
            "top_precursors": top_precursors,
        }
