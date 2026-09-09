#!/usr/bin/env python3
"""Script 02: Prepare Data & Create Leakage-Safe Stratified Train/Test Split.

Executes the complete Phase 1 data pipeline:
1. Loads and validates raw data with deterministic `report_id`
2. Normalizes text using Unicode NFKC without aggressive token removal
3. Maps Potential Accident Level to binary SIF proxy label
4. Audits duplicates and isolates conflicting label groups
5. Saves full audited dataset (cleaned_all_reports.csv)
6. Saves deduplicated, conflict-free modeling dataset (modeling_data.csv)
7. Executes 70/30 stratified train/test split with strict assertions
8. Saves train.csv and test.csv
9. Updates EDA and split provenance metadata

Usage:
    python scripts/02_prepare_data.py [--config config.yaml] [--data-path path/to/dataset.csv]
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
from src.data.splitter import split_dataset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("02_prepare_data")


def main() -> None:
    parser = argparse.ArgumentParser(description="SIF Backend — End-to-End Data Preparation")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    parser.add_argument("--data-path", default=None, help="Explicit path to raw CSV file")
    args = parser.parse_args()

    # Load configuration
    cfg_path = Path(args.config)
    config = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    processed_dir = Path(config.get("data", {}).get("processed_dir", "data/processed"))
    eda_dir = Path(config.get("data", {}).get("eda_dir", "outputs/eda"))
    processed_dir.mkdir(parents=True, exist_ok=True)
    eda_dir.mkdir(parents=True, exist_ok=True)

    logger.info("=" * 70)
    logger.info("STARTING PHASE 1 DATA PREPARATION PIPELINE")
    logger.info("=" * 70)

    # 1. Load raw dataset with robust schema validation & report_id
    logger.info("[1/6] Loading raw dataset and computing provenance hash...")
    df_raw, provenance = load_raw_dataset(csv_path=args.data_path, config=config)

    # 2. Conservative text cleaning
    logger.info("[2/6] Performing conservative NFKC text normalization...")
    df = df_raw.copy()
    text_col = config.get("preprocessing", {}).get("text_column", "Description")
    clean_col = config.get("preprocessing", {}).get("clean_text_column", "description_clean")
    df[clean_col] = df[text_col].apply(clean_text)

    # 3. Create configurable proxy label
    logger.info("[3/6] Mapping Potential Accident Level to development proxy label...")
    df = create_proxy_label(df, config=config)

    # 4. Audit duplicates and isolate conflicting groups
    logger.info("[4/6] Auditing data quality, duplicates, and label conflicts...")
    target_col = config.get("proxy_label", {}).get("target_column", "sif_proxy")
    src_col = config.get("proxy_label", {}).get("source_column", "Potential Accident Level")
    df_audited, df_modeling, quality_metrics = audit_data_quality(
        df,
        text_col=clean_col,
        label_col=target_col,
        level_col=src_col,
    )

    # Save audited full dataset and clean modeling dataset
    audited_csv_path = processed_dir / "cleaned_all_reports.csv"
    modeling_csv_path = processed_dir / "modeling_data.csv"
    df_audited.to_csv(audited_csv_path, index=False)
    df_modeling.to_csv(modeling_csv_path, index=False)
    logger.info("Saved audited dataset to: %s (%d rows)", audited_csv_path, len(df_audited))
    logger.info("Saved clean modeling dataset to: %s (%d rows)", modeling_csv_path, len(df_modeling))

    # 5. Leakage-safe 70/30 stratified train/test split with strict verification
    logger.info("[5/6] Creating 70/30 stratified train/test split with leakage verification...")
    split_cfg = config.get("split", {})
    test_size = float(split_cfg.get("test_size", 0.30))
    random_state = int(split_cfg.get("random_state", 42))
    stratify_col = split_cfg.get("stratify_col", "sif_proxy")

    train_df, test_df, split_metadata = split_dataset(
        df=df_modeling,
        test_size=test_size,
        random_state=random_state,
        stratify_col=stratify_col,
        text_col=clean_col,
        id_col="report_id",
    )

    # Save train and test datasets
    train_csv_path = processed_dir / "train.csv"
    test_csv_path = processed_dir / "test.csv"
    train_df.to_csv(train_csv_path, index=False)
    test_df.to_csv(test_csv_path, index=False)
    logger.info("Saved train dataset to: %s (%d rows)", train_csv_path, len(train_df))
    logger.info("Saved test dataset to: %s (%d rows)", test_csv_path, len(test_df))

    # 6. Generate full EDA, split summary, and provenance metadata
    logger.info("[6/6] Generating and saving EDA metadata and reports...")
    eda_summary = generate_eda_report(
        raw_df=df_raw,
        audited_df=df_audited,
        modeling_df=df_modeling,
        train_df=train_df,
        test_df=test_df,
        provenance_metadata=provenance,
        quality_metrics=quality_metrics,
        split_metadata=split_metadata,
        config=config,
    )

    saved_artifacts = save_eda_artifacts(eda_summary, provenance, output_dir=str(eda_dir))

    print("\n" + "=" * 80)
    print("PHASE 1 DATA PREPARATION COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print(f"Raw Input Rows             : {provenance['loaded_rows']}")
    print(f"Audited Dataset            : {len(df_audited)} rows -> {audited_csv_path}")
    print(f"Modeling Dataset           : {len(df_modeling)} rows -> {modeling_csv_path}")
    print(f"Train Dataset (70%)        : {len(train_df)} rows (SIF={split_metadata['train_class_distribution']['1_sif']}, {split_metadata['train_class_distribution']['sif_percentage']}%) -> {train_csv_path}")
    print(f"Test Dataset (30%)         : {len(test_df)} rows (SIF={split_metadata['test_class_distribution']['1_sif']}, {split_metadata['test_class_distribution']['sif_percentage']}%) -> {test_csv_path}")
    print("\nLeakage Verification Checks:")
    for check, status in split_metadata["verification_status"].items():
        print(f"  [PASSED] {check}: {status}")
    print("\nMetadata and EDA Artifacts:")
    for key, path in saved_artifacts.items():
        print(f"  - {key}: {path}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
