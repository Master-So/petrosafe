"""Robust data loader module for safety incident reports.

Loads raw CSV datasets, validates mandatory semantic columns, removes artifact index
columns, preserves and logs unexpected columns, computes cryptographic provenance
hashes, and assigns stable deterministic application identifiers (`report_id`).
"""

import hashlib
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import yaml

logger = logging.getLogger(__name__)

# Mandatory semantic columns required by the HSE domain specification
REQUIRED_SEMANTIC_COLUMNS: List[str] = [
    "Data",
    "Countries",
    "Local",
    "Industry Sector",
    "Accident Level",
    "Potential Accident Level",
    "Genre",
    "Employee or Third Party",
    "Critical Risk",
    "Description",
]


def compute_file_sha256(file_path: Path) -> str:
    """Computes the SHA-256 checksum of a file for data provenance tracking."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()


def resolve_data_path(
    csv_path: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    config_path: str = "config.yaml",
) -> Path:
    """Resolves data file path from argument, environment variable, or config file."""
    # 1. Explicit parameter
    if csv_path:
        return Path(csv_path)

    # 2. Environment variable override
    env_path = os.environ.get("SIF_DATA_PATH")
    if env_path:
        return Path(env_path)

    # 3. Provided configuration dictionary
    if config and "data" in config and "raw_path" in config["data"]:
        return Path(config["data"]["raw_path"])

    # 4. Load from config.yaml if available
    cfg_file = Path(config_path)
    if cfg_file.exists():
        with open(cfg_file, "r", encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
            if cfg and "data" in cfg and "raw_path" in cfg["data"]:
                return Path(cfg["data"]["raw_path"])

    # Default fallback
    return Path("data/raw/IHMStefanini_industrial_safety_and_health_database_with_accidents_description.csv")


def load_raw_dataset(
    csv_path: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Loads and validates the raw incident dataset.

    Args:
        csv_path: Optional path to the CSV file. If None, resolved via env or config.
        config: Optional parsed configuration dictionary.

    Returns:
        A tuple of (validated_dataframe, provenance_metadata).

    Raises:
        FileNotFoundError: If the resolved CSV path does not exist.
        ValueError: If mandatory semantic columns are missing or the file is empty.
    """
    resolved_path = resolve_data_path(csv_path, config)

    if not resolved_path.exists():
        raise FileNotFoundError(
            f"Dataset file not found at: {resolved_path.resolve()}. "
            f"Please copy the CSV file to this path or set the SIF_DATA_PATH environment variable."
        )

    file_hash = compute_file_sha256(resolved_path)
    logger.info("Loading dataset from: %s (SHA-256: %s)", resolved_path, file_hash[:12])

    # Load raw CSV
    try:
        df = pd.read_csv(resolved_path, encoding="utf-8")
    except UnicodeDecodeError:
        logger.warning("UTF-8 decoding failed, falling back to latin-1 encoding.")
        df = pd.read_csv(resolved_path, encoding="latin-1")

    if df.empty:
        raise ValueError(f"Loaded dataset at {resolved_path} is empty.")

    original_rows = len(df)
    original_cols = list(df.columns)

    # 1. Normalize column names (strip whitespace)
    df.columns = [str(col).strip() for col in df.columns]

    # 2. Safely remove index artifact columns (e.g., 'Unnamed: 0' or empty column headers)
    index_artifacts = [
        col for col in df.columns
        if col.startswith("Unnamed:") or col == ""
    ]
    if index_artifacts:
        logger.info("Dropping CSV index artifact column(s): %s", index_artifacts)
        df = df.drop(columns=index_artifacts)

    # 3. Validate mandatory semantic columns
    missing_mandatory = [col for col in REQUIRED_SEMANTIC_COLUMNS if col not in df.columns]
    if missing_mandatory:
        raise ValueError(
            f"Dataset at {resolved_path} is missing mandatory semantic column(s): {missing_mandatory}. "
            f"Available columns: {list(df.columns)}"
        )

    # 4. Check and report unexpected additional columns without failing
    additional_columns = [
        col for col in df.columns
        if col not in REQUIRED_SEMANTIC_COLUMNS
    ]
    if additional_columns:
        logger.info(
            "Preserving unexpected additional column(s): %s", additional_columns
        )

    # 5. Clean string whitespace for all object columns
    for col in df.select_dtypes(include=["object"]).columns:
        df[col] = df[col].astype(str).str.strip()

    # 6. Safely parse 'Data' column as datetime
    if "Data" in df.columns:
        df["Data"] = pd.to_datetime(df["Data"], errors="coerce")

    # 7. Assign deterministic, stable application-level identifier (report_id)
    # Formatted as R000001, R000002, etc. based on original ingestion index
    df.insert(0, "report_id", [f"R{i + 1:06d}" for i in range(len(df))])

    provenance_metadata: Dict[str, Any] = {
        "source_path": str(resolved_path.resolve()),
        "file_sha256": file_hash,
        "original_rows": original_rows,
        "loaded_rows": len(df),
        "original_columns": original_cols,
        "semantic_columns": REQUIRED_SEMANTIC_COLUMNS,
        "additional_columns": additional_columns,
        "dropped_artifacts": index_artifacts,
        "has_nulls": bool(df[REQUIRED_SEMANTIC_COLUMNS].isna().any().any()),
        "null_counts": df[REQUIRED_SEMANTIC_COLUMNS].isna().sum().to_dict(),
    }

    logger.info(
        "Successfully loaded %d rows and %d columns. Assigned stable report_id range: %s to %s",
        len(df),
        len(df.columns),
        df["report_id"].iloc[0],
        df["report_id"].iloc[-1],
    )

    return df, provenance_metadata
