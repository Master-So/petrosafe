"""
schemas.py
──────────
Pydantic models shared across the ai-service application.
Covers request payloads, local model responses, Gemini enrichment,
and the unified process-report response.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ── Shared request payload ───────────────────────────────────────────────────
class ReportRequest(BaseModel):
    """Incident report payload accepted by both /analyze-local and /process-report."""

    date: str = Field(
        ...,
        description="Incident date in YYYY-MM-DD format",
        examples=["2024-06-15"],
    )
    location: str = Field(
        ...,
        description="Site or facility name",
        examples=["Refinery Unit-3, Jamnagar"],
    )
    short_cause: str = Field(
        ...,
        description="Short free-text cause label",
        examples=["Fall from height"],
    )
    description: str = Field(
        ...,
        min_length=5,
        description="Full narrative of the incident",
        examples=[
            "Contractor fell from 4m scaffolding platform without harness, sustaining wrist fracture."
        ],
    )
    primary_cause_category: Optional[str] = Field(None, description="Primary cause category")
    equipment_failed: Optional[List[str]] = Field(None, description="List of equipment that failed")
    shift: Optional[str] = Field(None, description="Day or Night shift")


# ── Local model response ────────────────────────────────────────────────────
class AnalyzeResponse(BaseModel):
    local_summary: str = Field(
        ..., description="AI-generated executive summary of the incident"
    )
    local_risk_level: str = Field(
        ...,
        description="Risk classification: SIF-HIGH | MEDIUM | LOW",
        examples=["SIF-HIGH"],
    )


# ── Gemini structured output schema ─────────────────────────────────────────
LIFE_SAVING_RULES = Literal[
    "Bypassing Safety Controls",
    "Confined Space",
    "Energy Isolation",
    "Hot Work",
    "Line of Fire",
    "Safe Driving",
    "Work Authorization",
    "Working at Height",
    "None",
]


class GeminiEnrichmentResponse(BaseModel):
    """Schema enforced on Gemini's structured JSON output."""

    summary: str = Field(
        ...,
        description="A concise executive summary of the incident (intel details)."
    )
    risk_level: str = Field(
        ...,
        description="Risk classification: SIF-HIGH | MEDIUM | LOW",
    )
    sif_precursor_density_score: int = Field(
        ...,
        ge=1,
        le=10,
        description=(
            "1-10 rating indicating the severity/density of SIF precursors "
            "present in the hazard scenario."
        ),
    )
    life_saving_rule: LIFE_SAVING_RULES = Field(
        ...,
        description=(
            "Auto-mapped IOGP Life-Saving Rule. Must be one of: "
            "'Bypassing Safety Controls', 'Confined Space', 'Energy Isolation', "
            "'Hot Work', 'Line of Fire', 'Safe Driving', 'Work Authorization', "
            "'Working at Height', or 'None'."
        ),
    )
    fatal_potential_flag: bool = Field(
        ...,
        description="True if the event carries realistic fatal potential.",
    )
    risk_reasoning: str = Field(
        ...,
        description=(
            "Concise 2-sentence explanation detailing why this risk level and "
            "SIF density apply based on energy and control failures."
        ),
    )
    corrective_actions: List[str] = Field(
        ...,
        min_length=2,
        max_length=2,
        description=(
            "Exactly 2 immediate, high-priority safety intervention measures "
            "for field supervisors."
        ),
    )


# ── Default fallback when Gemini is unavailable ─────────────────────────────
GEMINI_FALLBACK = GeminiEnrichmentResponse(
    summary="Gemini enrichment unavailable. Please check API key.",
    risk_level="MEDIUM",
    sif_precursor_density_score=1,
    life_saving_rule="None",
    fatal_potential_flag=False,
    risk_reasoning="Gemini enrichment unavailable. Local model results are still valid.",
    corrective_actions=[
        "Review incident with local safety officer.",
        "Conduct manual SIF precursor assessment.",
    ],
)


# ── Unified /process-report response ────────────────────────────────────────
class ProcessReportResponse(BaseModel):
    """Consolidated output combining local model + Gemini enrichment."""

    # Echo back input fields
    date: str
    location: str
    short_cause: str
    description: str
    primary_cause_category: Optional[str] = None
    equipment_failed: Optional[List[str]] = None
    shift: Optional[str] = None

    # Local model outputs
    local_summary: str
    local_risk_level: str

    # Gemini enrichment fields
    sif_precursor_density_score: int
    life_saving_rule: str
    fatal_potential_flag: bool
    risk_reasoning: str
    corrective_actions: List[str]
