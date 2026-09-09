"""Data quality auditing module for safety incident reports.

Separates raw dataset auditing from benchmark filtering. Detects exact duplicates,
repeated descriptions, and conflicting label groups. Preserves full audit indicators
in the historical dataset, while generating a conflict-free, deduplicated modeling dataset.
"""

import logging
from typing import Any, Dict, List, Tuple

import pandas as pd

logger = logging.getLogger(__name__)


def audit_data_quality(
    df: pd.DataFrame,
    text_col: str = "description_clean",
    label_col: str = "sif_proxy",
    level_col: str = "Potential Accident Level",
) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """Performs data quality audit, flagging duplicates and label conflicts.

    Workflow:
    1. Flags exact row duplicates across all semantic columns.
    2. Flags repeated descriptions sharing identical normalized text.
    3. Identifies conflicting groups where identical descriptions have differing
       target labels or potential accident levels.
    4. Generates an audited dataset retaining all historical rows with audit flags.
    5. Generates a clean modeling dataset with conflicting groups excluded and
       repeated descriptions deduplicated (retaining first occurrence).

    Args:
        df: Input DataFrame containing normalized text and proxy label.
        text_col: Column name containing the cleaned description.
        label_col: Column name containing the binary proxy label.
        level_col: Column name containing the original potential accident level.

    Returns:
        A tuple of (audited_full_df, clean_modeling_df, quality_metrics).
    """
    df_audited = df.copy()

    # 1. Flag exact duplicate rows (excluding the auto-generated report_id)
    feature_cols = [c for c in df_audited.columns if c != "report_id"]
    df_audited["is_exact_duplicate"] = df_audited.duplicated(subset=feature_cols, keep=False)

    # 2. Flag repeated normalized descriptions
    df_audited["is_repeated_description"] = df_audited.duplicated(subset=[text_col], keep=False)

    # 3. Detect conflicting repeated descriptions
    # A description has a label conflict if the same cleaned description maps to >1 unique label or level
    conflict_groups = (
        df_audited.groupby(text_col)[[label_col, level_col]]
        .nunique()
        .query(f"{label_col} > 1 or `{level_col}` > 1")
        .index.tolist()
    )

    df_audited["has_label_conflict"] = df_audited[text_col].isin(conflict_groups)

    # Collect detailed evidence on conflicting groups
    conflict_details: List[Dict[str, Any]] = []
    if conflict_groups:
        for text in conflict_groups:
            matched_rows = df_audited[df_audited[text_col] == text]
            conflict_details.append({
                "description_clean": text[:120] + ("..." if len(text) > 120 else ""),
                "report_ids": matched_rows["report_id"].tolist(),
                "accident_levels": matched_rows[level_col].tolist(),
                "proxy_labels": matched_rows[label_col].tolist(),
                "row_count": len(matched_rows),
            })
        logger.warning(
            "Found %d conflicting description group(s) across %d rows!",
            len(conflict_groups),
            df_audited["has_label_conflict"].sum(),
        )

    # 4. Construct modeling dataset:
    # Rule A: Exclude all conflicting description groups
    df_modeling = df_audited[~df_audited["has_label_conflict"]].copy()

    # Rule B: Deduplicate repeated normalized descriptions, keeping the first occurrence
    df_modeling = df_modeling.drop_duplicates(subset=[text_col], keep="first").copy()
    df_modeling.reset_index(drop=True, inplace=True)

    # Compute audit summary statistics
    exact_dup_count = int(df_audited["is_exact_duplicate"].sum())
    repeated_desc_count = int(df_audited["is_repeated_description"].sum())
    conflicting_rows_count = int(df_audited["has_label_conflict"].sum())

    quality_metrics: Dict[str, Any] = {
        "total_audited_rows": len(df_audited),
        "exact_duplicate_rows": exact_dup_count,
        "repeated_description_rows": repeated_desc_count,
        "conflicting_description_groups_count": len(conflict_groups),
        "conflicting_rows_count": conflicting_rows_count,
        "conflicting_groups_detail": conflict_details,
        "modeling_rows_count": len(df_modeling),
    }

    logger.info(
        "Audit complete. Audited: %d rows | Exact dups: %d | Repeated desc: %d | "
        "Conflicts: %d groups (%d rows) | Clean Modeling Dataset: %d rows",
        len(df_audited),
        exact_dup_count,
        repeated_desc_count,
        len(conflict_groups),
        conflicting_rows_count,
        len(df_modeling),
    )

    return df_audited, df_modeling, quality_metrics
