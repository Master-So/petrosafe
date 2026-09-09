"""Prediction and similarity retrieval endpoints."""

from fastapi import APIRouter, HTTPException, Request
from api.schemas import (
    PredictionRequest,
    PredictionResponse,
    SimilarReportsRequest,
    SimilarReportsResponse,
    SimilarReport,
)

router = APIRouter(tags=["Prediction"])


@router.post("/predict", response_model=PredictionResponse)
def predict_safety_report(request: PredictionRequest, req: Request) -> PredictionResponse:
    """End-to-end incident analysis endpoint.

    Returns SIF potential, confidence probability, prototype risk score,
    safety precursors, entity extractions, IOGP rule mapping, and explanatory notes.
    """
    pipeline = req.app.state.pipeline
    if pipeline is None:
        raise HTTPException(status_code=503, detail="Prediction pipeline is not initialized.")

    try:
        result = pipeline.predict_report(text=request.text, top_k_similar=request.top_k_similar)
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/similar-reports", response_model=SimilarReportsResponse)
def get_similar_reports(request: SimilarReportsRequest, req: Request) -> SimilarReportsResponse:
    """Retrieves top-K nearest historical incidents from the training vector store."""
    pipeline = req.app.state.pipeline
    if pipeline is None or pipeline.vector_store.index is None:
        raise HTTPException(status_code=503, detail="Vector store is not initialized.")

    try:
        cleaned = pipeline.embedding_engine.encode(request.text)[0]
        neighbors = pipeline.vector_store.search(cleaned, top_k=request.top_k)

        similar = [
            SimilarReport(
                report_id=n.get("report_id"),
                similarity=round(float(n.get("similarity", 0.0)), 4),
                sif_proxy=int(n.get("sif_proxy", 0)),
                description=n.get("description_clean", ""),
            )
            for n in neighbors
        ]
        return SimilarReportsResponse(
            query_text=request.text,
            top_k=request.top_k,
            similar_reports=similar,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
