"""Safety precursor and barrier failure detector.

Executes rule-based matching over safety reports based on configurable YAML patterns.
Returns structured evidence, detected precursors, and barrier failures.
"""

import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

logger = logging.getLogger(__name__)


class SafetyPrecursorDetector:
    """Detects dangerous conditions, unsafe actions, and barrier failures in safety reports."""

    def __init__(self, patterns_path: Optional[str] = None) -> None:
        if patterns_path is None:
            patterns_path = str(Path(__file__).parent / "safety_patterns.yaml")

        self.patterns_path = Path(patterns_path)
        self.precursor_patterns: Dict[str, Any] = {}
        self.barrier_patterns: Dict[str, Any] = {}
        self._load_patterns()

    def _load_patterns(self) -> None:
        """Loads precursor and barrier rules from YAML configuration."""
        if not self.patterns_path.exists():
            raise FileNotFoundError(f"Patterns file not found at: {self.patterns_path}")

        with open(self.patterns_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        self.precursor_patterns = data.get("precursors", {})
        self.barrier_patterns = data.get("barrier_failures", {})
        logger.info(
            "Loaded %d precursor categories and %d barrier patterns.",
            len(self.precursor_patterns),
            len(self.barrier_patterns),
        )

    def detect_precursors(self, text: str) -> List[Dict[str, Any]]:
        """Identifies safety precursors present in the text description.

        Args:
            text: Lowercased or cleaned report text.

        Returns:
            List of detected precursor objects with name, matched terms, and confidence.
        """
        text_lower = text.lower()
        detected: List[Dict[str, Any]] = []

        for category_key, cfg in self.precursor_patterns.items():
            name = cfg.get("name", category_key.replace("_", " ").title())
            keywords = cfg.get("keywords", [])

            matched = []
            for kw in keywords:
                # Word boundary check for keywords
                pattern = r"\b" + re.escape(kw.lower()) + r"\b"
                if re.search(pattern, text_lower):
                    matched.append(kw)

            if matched:
                # Rule confidence based on term matches
                confidence = min(0.70 + 0.10 * len(matched), 0.95)
                detected.append({
                    "category": category_key,
                    "name": name,
                    "confidence": round(confidence, 2),
                    "matched_terms": matched,
                })

        return detected

    def detect_barrier_failures(self, text: str) -> List[Dict[str, Any]]:
        """Identifies safety barrier breakdowns and collects sentence-level evidence.

        Args:
            text: Raw or cleaned report text.

        Returns:
            List of barrier failure entries with type, matched terms, and text evidence.
        """
        text_lower = text.lower()
        failures: List[Dict[str, Any]] = []

        for key, cfg in self.barrier_patterns.items():
            barrier_type = cfg.get("type", key.replace("_", " ").title())
            keywords = cfg.get("keywords", [])

            matched = []
            for kw in keywords:
                pattern = r"\b" + re.escape(kw.lower()) + r"\b"
                if re.search(pattern, text_lower):
                    matched.append(kw)

            if matched:
                # Extract sentence snippet containing the match
                evidence = self._extract_evidence(text, matched[0])
                failures.append({
                    "type": barrier_type,
                    "matched_terms": matched,
                    "evidence": evidence,
                })

        return failures

    @staticmethod
    def _extract_evidence(text: str, keyword: str) -> str:
        """Extracts the sentence or context window containing the matched keyword."""
        sentences = re.split(r"[.!?\n]+", text)
        kw_lower = keyword.lower()
        for s in sentences:
            if kw_lower in s.lower():
                return s.strip()
        return text[:150].strip()
