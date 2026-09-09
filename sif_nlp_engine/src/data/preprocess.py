"""Text preprocessing and configurable SIF proxy label generation.

Implements conservative text normalization using Unicode NFKC normalization,
preserving crucial industrial safety tokens (e.g., equipment IDs like K-201,
voltage specs like 440V, zero energy, LOTO) without aggressive stemming or
stopword deletion.
Also implements configurable mapping for the development SIF proxy label.
"""

import logging
import re
import unicodedata
from typing import Any, Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)

# Pattern to replace invisible characters, control codes, non-breaking spaces
_CONTROL_AND_INVISIBLE_RE = re.compile(r"[\r\t\x00-\x08\x0b\x0c\x0e-\x1f\x7f\xa0\u200b\u200e\u200f\ufeff]")

# Pattern for safe punctuation: collapse multiple dots, repeated hyphens, etc.
_MULTIPLE_SPACES_RE = re.compile(r"\s+")


def clean_text(text: Optional[str]) -> str:
    """Conservatively cleans and normalizes industrial safety report descriptions.

    Applies:
    1. None/empty validation
    2. Unicode NFKC normalization
    3. Lowercase conversion
    4. Removal of control and invisible characters
    5. Normalization of whitespace

    Crucially preserves:
    - Technical identifiers: 'k-201', 'p-102', 'v-204a', 'hm-100', 'cx-695'
    - Technical notations: '440v', 'loto', 'gas test', 'zero energy'
    - Measurements: '1.06 meters', '48 grams / liter', '27 cm'

    Does NOT perform stemming, lemmatization, or stopword removal.

    Args:
        text: Raw report description string or None.

    Returns:
        Cleaned, normalized string.
    """
    if text is None:
        return ""

    if not isinstance(text, str):
        text = str(text)

    text = text.strip()
    if not text or text.lower() == "nan":
        return ""

    # 1. Unicode NFKC normalization
    normalized = unicodedata.normalize("NFKC", text)

    # 2. Lowercase
    lowered = normalized.lower()

    # 3. Replace control codes and invisible characters with space
    cleaned = _CONTROL_AND_INVISIBLE_RE.sub(" ", lowered)

    # 4. Collapse multiple whitespace characters into a single space
    cleaned = _MULTIPLE_SPACES_RE.sub(" ", cleaned)

    return cleaned.strip()


def create_proxy_label(
    df: pd.DataFrame,
    config: Optional[Dict[str, Any]] = None,
) -> pd.DataFrame:
    """Maps 'Potential Accident Level' to development binary label 'sif_proxy'.

    CAVEAT:
    "The current SIF label is a development proxy derived from Potential Accident Level
    and is not an official OIL/IOGP SIF classification."

    Default mapping:
    - Potential Accident Level I, II, III  -> 0 (non-SIF potential)
    - Potential Accident Level IV, V, VI  -> 1 (SIF potential)

    Args:
        df: Input DataFrame containing the source column.
        config: Configuration dictionary specifying positive/negative levels.

    Returns:
        DataFrame copy with new integer column 'sif_proxy'. Original column is preserved.

    Raises:
        ValueError: If the source column is missing or contains unmapped levels.
    """
    df_out = df.copy()

    # Extract proxy configuration
    proxy_cfg = config.get("proxy_label", {}) if config else {}
    src_col = proxy_cfg.get("source_column", "Potential Accident Level")
    target_col = proxy_cfg.get("target_column", "sif_proxy")
    positive_levels: List[str] = proxy_cfg.get("positive_levels", ["IV", "V", "VI"])
    negative_levels: List[str] = proxy_cfg.get("negative_levels", ["I", "II", "III"])

    if src_col not in df_out.columns:
        raise ValueError(
            f"Source column '{src_col}' not found in DataFrame. Available columns: {list(df_out.columns)}"
        )

    # Normalize values for comparison
    unique_levels = df_out[src_col].dropna().unique().tolist()
    expected_levels = set(positive_levels) | set(negative_levels)
    unexpected = [lvl for lvl in unique_levels if lvl not in expected_levels]

    if unexpected:
        raise ValueError(
            f"Encountered unexpected level(s) in column '{src_col}': {unexpected}. "
            f"Expected positive: {positive_levels}, negative: {negative_levels}."
        )

    # Create proxy label mapping
    mapping: Dict[str, int] = {}
    for lvl in positive_levels:
        mapping[lvl] = 1
    for lvl in negative_levels:
        mapping[lvl] = 0

    df_out[target_col] = df_out[src_col].map(mapping).astype(int)

    logger.info(
        "Mapped '%s' to '%s'. Distribution: 0 (non-SIF)=%d, 1 (SIF)=%d",
        src_col,
        target_col,
        (df_out[target_col] == 0).sum(),
        (df_out[target_col] == 1).sum(),
    )

    return df_out
