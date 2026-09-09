"""Metadata and evaluation report endpoints."""

import json
from pathlib import Path
from typing import Any, Dict
from fastapi import APIRouter
from api.schemas import MetadataResponse

router = APIRouter(tags=["Metadata & Evaluation"])


@router.get("/metadata", response_model=MetadataResponse)
def get_system_metadata() -> MetadataResponse:
    """Returns available domain categories, sites, models, and regulatory caveats."""
    return MetadataResponse(
        available_sites=["Local_01", "Local_02", "Local_03", "Local_04", "Local_05", "Local_06", "Local_07", "Local_08", "Local_09", "Local_10", "Local_11", "Local_12"],
        activities=[
            "Maintenance", "Inspection", "Lifting", "Hot Work", "Construction",
            "Drilling", "Transportation", "Operations", "Electrical Work", "Cleaning", "Excavation",
        ],
        equipment_categories=[
            "Compressor", "Pump", "Valve", "Pipeline", "Pressure Vessel",
            "Separator", "Tank", "Crane", "Generator", "Boiler", "Scaffold", "Electrical Panel", "Drill",
        ],
        hazards=[
            "Stored Energy", "Pressure", "Electrical", "Fire/Explosion", "Fall",
            "Vehicle", "Confined Space", "Chemical", "Mechanical", "Dropped Object",
        ],
        iogp_rules=[
            "Energy Isolation", "Line of Fire", "Confined Space", "Hot Work",
            "Working at Height", "Safe Mechanical Lifting", "Driving",
            "Work Authorisation", "Bypassing Safety Controls",
        ],
        precursor_categories=[
            "Energy Exposure", "Isolation Failure", "Line of Fire",
            "Fall Exposure", "Confined Space", "Hot Work",
        ],
        model_version="0.1.0",
        disclaimer=(
            "The current SIF label is a development proxy derived from Potential Accident Level "
            "and is not an official OIL/IOGP SIF classification."
        ),
    )


@router.get("/evaluation")
def get_model_evaluation() -> Dict[str, Any]:
    """Returns stored benchmark evaluation results across all models on the untouched test partition."""
    eval_file = Path("artifacts/evaluation/model_comparison.json")
    if not eval_file.exists():
        return {
            "status": "not_evaluated_yet",
            "message": "Run python scripts/06_evaluate.py to generate test partition evaluation benchmarks.",
        }

    with open(eval_file, "r", encoding="utf-8") as f:
        return json.load(f)
