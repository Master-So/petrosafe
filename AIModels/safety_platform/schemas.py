from typing import List, Optional
from pydantic import BaseModel, Field

class IncidentRequest(BaseModel):
    gender: str = Field(default="Male")
    category: str
    location: str
    perceived_severity: int = Field(..., ge=1, le=5)
    description: str = Field(..., min_length=5)

class IncidentResponse(BaseModel):
    predicted_severity: int = Field(..., ge=1, le=5)
    sif_label: str
    confidence: float
    probabilities: List[float]
    near_miss_gap: int
    under_reported: bool
    executive_summary: str
    rule_violations: List[str]

class MetaSummaryRequest(BaseModel):
    incident_ids: List[int]
    focus_area: Optional[str] = None

class MetaSummaryResponse(BaseModel):
    incident_count: int
    sif_count: int
    sif_rate_pct: float
    executive_trend_assessment: str
    primary_failure_vectors: List[str]
    actionable_prevention_directives: List[str]
