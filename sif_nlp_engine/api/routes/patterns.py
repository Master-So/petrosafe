"""Pattern analytics endpoints."""

import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Query
from api.schemas import PatternItem, PatternResponse

router = APIRouter(tags=["Patterns"])


@router.get("/patterns", response_model=PatternResponse)
def get_safety_patterns(
    dimension: str = Query(
        default="equipment",
        description="Dimension to aggregate: equipment, activity, site, hazard, iogp_rule",
    ),
    site: Optional[str] = Query(default=None, description="Filter by site name (Local)"),
    activity: Optional[str] = Query(default=None, description="Filter by activity"),
) -> PatternResponse:
    """Returns recurring precursor patterns and SIF density along specified dimensions."""
    pattern_file = Path("artifacts/patterns/pattern_summary.json")

    if not pattern_file.exists():
        return PatternResponse(
            dimension=dimension,
            site_filter=site,
            activity_filter=activity,
            patterns=[],
        )

    with open(pattern_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    dimension_data = data.get("dimensions", {}).get(dimension, [])
    items = [
        PatternItem(
            value=item["value"],
            total_reports=item["total_reports"],
            sif_reports=item["sif_reports"],
            sif_density=item["sif_density"],
            top_precursors=item.get("top_precursors", []),
        )
        for item in dimension_data
    ]

    return PatternResponse(
        dimension=dimension,
        site_filter=site,
        activity_filter=activity,
        patterns=items,
    )
