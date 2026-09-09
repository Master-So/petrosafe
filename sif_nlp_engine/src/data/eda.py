"""Exploratory Data Analysis (EDA) and dataset provenance reporting module.

Calculates actual dataset statistics, checks against sanity benchmarks without hardcoding,
and generates structured JSON metadata and human-readable audit reports.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd

logger = logging.getLogger(__name__)

# Known sanity benchmarks for variance detection
SANITY_BENCHMARKS = {
    "approx_raw_rows": 425,
    "approx_non_sif": 250,
    "approx_sif": 175,
    "approx_modeling_rows": 410,
    "known_levels": ["I", "II", "III", "IV", "V", "VI"],
}


def generate_eda_report(
    raw_df: pd.DataFrame,
    audited_df: pd.DataFrame,
    modeling_df: pd.DataFrame,
    train_df: Optional[pd.DataFrame] = None,
    test_df: Optional[pd.DataFrame] = None,
    provenance_metadata: Optional[Dict[str, Any]] = None,
    quality_metrics: Optional[Dict[str, Any]] = None,
    split_metadata: Optional[Dict[str, Any]] = None,
    config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Computes comprehensive statistical profile and data quality metrics.

    All metrics are calculated directly from dataframes without hardcoded values.
    """
    total_raw_rows = len(raw_df)
    total_audited_rows = len(audited_df)
    total_modeling_rows = len(modeling_df)

    # Missing value analysis
    missing_by_column = raw_df.isna().sum().to_dict()

    # Potential Accident Level distribution
    pal_dist = audited_df["Potential Accident Level"].value_counts().to_dict()

    # Proxy label distribution
    proxy_counts = audited_df["sif_proxy"].value_counts().to_dict()
    proxy_dist = {
        "0_non_sif": int(proxy_counts.get(0, 0)),
        "1_sif": int(proxy_counts.get(1, 0)),
        "total": total_audited_rows,
        "sif_percentage": round(proxy_counts.get(1, 0) / total_audited_rows * 100, 2) if total_audited_rows > 0 else 0.0,
    }

    # Modeling dataset proxy distribution
    mod_proxy_counts = modeling_df["sif_proxy"].value_counts().to_dict()
    mod_proxy_dist = {
        "0_non_sif": int(mod_proxy_counts.get(0, 0)),
        "1_sif": int(mod_proxy_counts.get(1, 0)),
        "total": total_modeling_rows,
        "sif_percentage": round(mod_proxy_counts.get(1, 0) / total_modeling_rows * 100, 2) if total_modeling_rows > 0 else 0.0,
    }

    # Sanity comparison
    sanity_variances = {
        "raw_rows_diff": total_raw_rows - SANITY_BENCHMARKS["approx_raw_rows"],
        "non_sif_diff": proxy_dist["0_non_sif"] - SANITY_BENCHMARKS["approx_non_sif"],
        "sif_diff": proxy_dist["1_sif"] - SANITY_BENCHMARKS["approx_sif"],
        "modeling_rows_diff": total_modeling_rows - SANITY_BENCHMARKS["approx_modeling_rows"],
    }

    eda_summary: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_dimensions": {
            "raw_rows": total_raw_rows,
            "raw_columns": len(raw_df.columns),
            "audited_rows": total_audited_rows,
            "modeling_rows": total_modeling_rows,
        },
        "missing_values": missing_by_column,
        "quality_audit": quality_metrics or {},
        "potential_accident_level_distribution": pal_dist,
        "proxy_label_distribution_full": proxy_dist,
        "proxy_label_distribution_modeling": mod_proxy_dist,
        "split_summary": split_metadata or {},
        "sanity_benchmark_comparison": {
            "benchmarks": SANITY_BENCHMARKS,
            "variances": sanity_variances,
        },
        "proxy_label_caveat": (
            "The current SIF label is a development proxy derived from Potential Accident Level "
            "and is not an official OIL/IOGP SIF classification."
        ),
    }

    return eda_summary


def save_eda_artifacts(
    eda_summary: Dict[str, Any],
    provenance_metadata: Dict[str, Any],
    output_dir: str = "outputs/eda",
) -> Dict[str, Path]:
    """Serializes EDA summaries, dataset provenance, and text report to output directory."""
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    # 1. Save eda_summary.json
    summary_file = out_path / "eda_summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(eda_summary, f, indent=2, default=str)

    # 2. Save dataset_metadata.json (Provenance)
    metadata_file = out_path / "dataset_metadata.json"
    combined_metadata = {
        **provenance_metadata,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "preprocessing_version": "0.1.0",
        "random_state": 42,
        "quality_metrics": eda_summary.get("quality_audit", {}),
        "proxy_label_distribution": eda_summary.get("proxy_label_distribution_modeling", {}),
    }
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(combined_metadata, f, indent=2, default=str)

    # 3. Save data_split_summary.json
    split_file = out_path / "data_split_summary.json"
    with open(split_file, "w", encoding="utf-8") as f:
        json.dump(eda_summary.get("split_summary", {}), f, indent=2, default=str)

    # 4. Generate human-readable eda_report.txt
    report_file = out_path / "eda_report.txt"
    report_text = format_human_readable_report(eda_summary, provenance_metadata)
    with open(report_file, "w", encoding="utf-8") as f:
        f.write(report_text)

    logger.info("Saved EDA artifacts to: %s", out_path.resolve())
    return {
        "eda_summary": summary_file,
        "dataset_metadata": metadata_file,
        "data_split_summary": split_file,
        "eda_report": report_file,
    }


def format_human_readable_report(
    eda_summary: Dict[str, Any],
    provenance_metadata: Dict[str, Any],
) -> str:
    """Formats EDA summary into a structured, readable plain-text report."""
    dim = eda_summary["dataset_dimensions"]
    pal = eda_summary["potential_accident_level_distribution"]
    proxy_full = eda_summary["proxy_label_distribution_full"]
    proxy_mod = eda_summary["proxy_label_distribution_modeling"]
    audit = eda_summary.get("quality_audit", {})
    split = eda_summary.get("split_summary", {})
    var = eda_summary.get("sanity_benchmark_comparison", {}).get("variances", {})

    lines = [
        "=" * 80,
        "SIF BACKEND — EXPLORATORY DATA ANALYSIS & QUALITY AUDIT REPORT",
        "=" * 80,
        f"Timestamp (UTC)     : {eda_summary.get('timestamp')}",
        f"Source File         : {provenance_metadata.get('source_path')}",
        f"File SHA-256        : {provenance_metadata.get('file_sha256')}",
        "",
        "1. DATASET DIMENSIONS",
        "-" * 40,
        f"Raw Rows Loaded     : {dim['raw_rows']}",
        f"Raw Columns         : {dim['raw_columns']}",
        f"Audited Total Rows  : {dim['audited_rows']}",
        f"Clean Modeling Rows : {dim['modeling_rows']}",
        "",
        "2. DATA QUALITY AUDIT FINDINGS",
        "-" * 40,
        f"Exact Duplicate Rows             : {audit.get('exact_duplicate_rows', 0)}",
        f"Repeated Description Rows        : {audit.get('repeated_description_rows', 0)}",
        f"Conflicting Description Groups   : {audit.get('conflicting_description_groups_count', 0)}",
        f"Conflicting Rows Excluded        : {audit.get('conflicting_rows_count', 0)}",
        "",
        "3. POTENTIAL ACCIDENT LEVEL (PAL) DISTRIBUTION",
        "-" * 40,
    ]

    for level, count in sorted(pal.items()):
        lines.append(f"Level {level:4s} : {count:4d}")

    lines.extend([
        "",
        "4. SIF DEVELOPMENT PROXY LABEL DISTRIBUTION (FULL AUDITED DATASET)",
        "-" * 40,
        f"Class 0 (Non-SIF) : {proxy_full.get('0_non_sif', 0):4d} ({100 - proxy_full.get('sif_percentage', 0):.2f}%)",
        f"Class 1 (SIF)     : {proxy_full.get('1_sif', 0):4d} ({proxy_full.get('sif_percentage', 0):.2f}%)",
        f"Total             : {proxy_full.get('total', 0):4d}",
        "",
        "5. SIF DEVELOPMENT PROXY LABEL DISTRIBUTION (MODELING DATASET)",
        "-" * 40,
        f"Class 0 (Non-SIF) : {proxy_mod.get('0_non_sif', 0):4d} ({100 - proxy_mod.get('sif_percentage', 0):.2f}%)",
        f"Class 1 (SIF)     : {proxy_mod.get('1_sif', 0):4d} ({proxy_mod.get('sif_percentage', 0):.2f}%)",
        f"Total Modeling    : {proxy_mod.get('total', 0):4d}",
        "",
        "6. LEAKAGE-SAFE TRAIN / TEST SPLIT (70% Train / 30% Test, Seed 42)",
        "-" * 40,
        f"Train Rows : {split.get('train_rows', 'N/A')}",
        f"Train Classes: {split.get('train_class_distribution', {})}",
        f"Test Rows  : {split.get('test_rows', 'N/A')}",
        f"Test Classes : {split.get('test_class_distribution', {})}",
        f"Verification: {split.get('verification_status', {})}",
        "",
        "7. SANITY BENCHMARK COMPARISON",
        "-" * 40,
        f"Raw Rows Variance vs ~425      : {var.get('raw_rows_diff', 0):+d}",
        f"Non-SIF Variance vs ~250       : {var.get('non_sif_diff', 0):+d}",
        f"SIF Variance vs ~175           : {var.get('sif_diff', 0):+d}",
        f"Modeling Rows vs ~410          : {var.get('modeling_rows_diff', 0):+d}",
        "",
        "8. REGULATORY DISCLAIMER & PROXY CAVEAT",
        "-" * 40,
        eda_summary["proxy_label_caveat"],
        "=" * 80,
    ])

    return "\n".join(lines)
