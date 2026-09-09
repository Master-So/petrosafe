#!/usr/bin/env python3
"""Script 07: Build Historical Safety Patterns and Hotspot Intelligence.

Enriches historical reports with precursors, activities, equipment, and IOGP rules.
Computes precursor density across dimensions and saves machine-readable artifacts.

Usage:
    python scripts/07_build_patterns.py [--config config.yaml]
"""

import argparse
import json
import logging
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd
import yaml
from src.analytics.pattern_engine import PatternEngine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("07_build_patterns")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build recurring safety patterns")
    parser.add_argument("--config", default="config.yaml", help="Path to config.yaml")
    args = parser.parse_args()

    cfg_path = Path(args.config)
    config = {}
    if cfg_path.exists():
        with open(cfg_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

    processed_dir = Path(config.get("data", {}).get("processed_dir", "data/processed"))
    data_path = processed_dir / "cleaned_all_reports.csv"

    if not data_path.exists():
        raise FileNotFoundError(f"Missing {data_path}. Please run scripts/02_prepare_data.py first.")

    df = pd.read_csv(data_path)
    engine = PatternEngine()
    enriched_df = engine.enrich_dataset(df)

    # Save enriched reports
    out_dir = Path("artifacts/patterns")
    out_dir.mkdir(parents=True, exist_ok=True)
    enriched_df.to_csv(out_dir / "enriched_reports.csv", index=False)

    # Calculate multi-dimensional summaries
    summary = {
        "dimensions": {
            "equipment": engine.get_patterns_by_dimension("equipment"),
            "activity": engine.get_patterns_by_dimension("activity"),
            "site": engine.get_patterns_by_dimension("site"),
            "hazard": engine.get_patterns_by_dimension("hazard"),
            "iogp_rule": engine.get_patterns_by_dimension("iogp_rule"),
        },
        "metadata": {
            "total_reports_analyzed": len(df),
            "unique_sites": df["Local"].nunique() if "Local" in df.columns else 0,
        },
    }

    summary_path = out_dir / "pattern_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=str)

    print("\n" + "=" * 80)
    print("HISTORICAL PRECURSOR PATTERNS BUILT SUCCESSFULLY")
    print("=" * 80)
    print(f"Enriched reports saved to: {out_dir / 'enriched_reports.csv'}")
    print(f"Pattern summaries saved to: {summary_path}")
    print("\nTop Equipment SIF Hotspots:")
    for item in summary["dimensions"]["equipment"][:5]:
        print(f"  - {item['value']:<18}: Total={item['total_reports']:2d} | SIF={item['sif_reports']:2d} | Density={item['sif_density']:.3f} | Precursors={item['top_precursors']}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
