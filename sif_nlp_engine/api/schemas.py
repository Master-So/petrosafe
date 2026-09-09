"""Pydantic schemas for request validation and response serialization."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", example="ok")
    model: str = Field(default="BGE + weighted kNN", example="BGE + weighted kNN")
    version: str = Field(default="0.1.0", example="0.1.0")


class PredictionRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=5,
        max_length=10000,
        description="Free-text safety incident or near-miss report description.",
        example="During maintenance of compressor K-201, the equipment was opened before confirming zero energy isolation. Residual pressure was released and workers were standing near the discharge line.",
    )
    top_k_similar: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Number of nearest historical incidents to retrieve.",
    )


class EquipmentDetails(BaseModel):
    name: str = Field(example="Compressor")
    equipment_type: str = Field(example="Compressor")
    equipment_id: Optional[str] = Field(default=None, example="K-201")


class SimilarReport(BaseModel):
    report_id: str = Field(example="R000124")
    similarity: float = Field(example=0.9123)
    sif_proxy: int = Field(example=1)
    description: str = Field(example="...")


class ModelMetadata(BaseModel):
    model_version: str = Field(example="0.1.0")
    embedding_model: str = Field(example="BAAI/bge-small-en-v1.5")
    label_type: str = Field(example="development_proxy")
    disclaimer: str = Field(
        example="The current SIF label is a development proxy derived from Potential Accident Level and is not an official OIL/IOGP SIF classification."
    )


class PredictionResponse(BaseModel):
    sif_potential: bool = Field(description="Model prediction of SIF potential")
    sif_probability: float = Field(description="Model confidence probability [0.0, 1.0]")
    risk_score: int = Field(description="Prototype precursor risk score [0, 100]")
    risk_category: str = Field(description="Risk band: LOW, MEDIUM, HIGH, CRITICAL")
    activity: str = Field(description="Detected industrial activity")
    equipment: EquipmentDetails = Field(description="Detected equipment attributes")
    hazards: List[str] = Field(description="Identified physical hazards")
    exposures: List[str] = Field(description="Identified personnel exposures")
    barrier_failures: List[str] = Field(description="Identified safety barrier breakdowns")
    precursors: List[str] = Field(description="Detected safety precursors")
    iogp_rules: List[str] = Field(description="Mapped IOGP Life-Saving Rules")
    similar_reports: List[SimilarReport] = Field(description="Nearest historical training reports")
    explanation: List[str] = Field(description="Evidence-backed explanatory notes")
    model_metadata: ModelMetadata = Field(description="Model provenance and disclaimers")


class SimilarReportsRequest(BaseModel):
    text: str = Field(..., min_length=5, max_length=10000)
    top_k: int = Field(default=10, ge=1, le=50)


class SimilarReportsResponse(BaseModel):
    query_text: str
    top_k: int
    similar_reports: List[SimilarReport]


class PatternItem(BaseModel):
    value: str
    total_reports: int
    sif_reports: int
    sif_density: float
    top_precursors: List[str]


class PatternResponse(BaseModel):
    dimension: str
    site_filter: Optional[str] = None
    activity_filter: Optional[str] = None
    patterns: List[PatternItem]


class MetadataResponse(BaseModel):
    available_sites: List[str]
    activities: List[str]
    equipment_categories: List[str]
    hazards: List[str]
    iogp_rules: List[str]
    precursor_categories: List[str]
    model_version: str
    disclaimer: str
