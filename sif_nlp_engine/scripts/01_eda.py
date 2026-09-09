#!/usr/bin/env python3
"""Script 01: Exploratory Data Analysis & Quality Audit.

Loads the safety incidents dataset, performs initial validation, audits duplicates
and label conflicts, and generates machine-readable EDA and provenance artifacts.

Usage:
    python scripts/01_eda.py [--config config.yaml] [--data-path path/to/dataset.csv]
"""

import argparse
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import yaml
from src.data.eda import generate_eda_report, save_eda_artifacts
from src.data.loader import load_raw_dataset
from src.data.preprocess import clean_text, create_proxy_label
from src.data.quality import audit_data_quality

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("01_eda")


def main() -> None:
    parser = argparse.ArgumentParser(description="SIF Backend — Dataset EDA & Quality Audit")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    parser.add_argument("--data-path", default=None, help="Explicit path to raw CSV file")
    args = parser.parse_args()

    # Load configuration
    cfg_path = Path(args.config)
    config = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    logger.info("Starting Phase 1 Exploratory Data Analysis...")

    # 1. Load raw dataset with robust schema handling
    df_raw, provenance = load_raw_dataset(csv_path=args.data_path, config=config)

    # 2. Conservative text cleaning
    df = df_raw.copy()
    text_col = config.get("preprocessing", {}).get("text_column", "Description")
    clean_col = config.get("preprocessing", {}).get("clean_text_column", "description_clean")
    df[clean_col] = df[text_col].apply(clean_text)

    # 3. Create configurable proxy label
    df = create_proxy_label(df, config=config)

    # 4. Audit duplicates and label conflicts
    df_audited, df_modeling, quality_metrics = audit_data_quality(
        df,
        text_col=clean_col,
        label_col=config.get("proxy_label", {}).get("target_column", "sif_proxy"),
        level_col=config.get("proxy_label", {}).get("source_column", "Potential Accident Level"),
    )

    # 5. Generate and save EDA report and metadata
    eda_summary = generate_eda_report(
        raw_df=df_raw,
        audited_df=df_audited,
        modeling_df=df_modeling,
        provenance_metadata=provenance,
        quality_metrics=quality_metrics,
        config=config,
    )

    eda_dir = config.get("data", {}).get("eda_dir", "outputs/eda")
    saved_files = save_eda_artifacts(eda_summary, provenance, output_dir=eda_dir)

    print("\n" + "=" * 80)
    print("PHASE 1 EDA COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print(f"Audited Total Rows      : {eda_summary['dataset_dimensions']['audited_rows']}")
    print(f"Exact Duplicate Rows    : {quality_metrics['exact_duplicate_rows']}")
    print(f"Repeated Description Rows: {quality_metrics['repeated_description_rows']}")
    print(f"Conflicting Groups      : {quality_metrics['conflicting_description_groups_count']} (Affecting {quality_metrics['conflicting_rows_count']} rows)")
    print(f"Usable Modeling Rows    : {eda_summary['dataset_dimensions']['modeling_rows']}")
    print(f"Full SIF Proxy Balance  : Class 0={eda_summary['proxy_label_distribution_full']['0_non_sif']}, Class 1={eda_summary['proxy_label_distribution_full']['1_sif']}")
    print(f"Artifacts Saved To      : {eda_dir}/")
    for name, path in saved_files.items():
        print(f"  - {name}: {path}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
