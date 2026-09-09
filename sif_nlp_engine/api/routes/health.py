"""Health and liveness route."""

from fastapi import APIRouter
from api.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Returns service health status and active model pipeline."""
    return HealthResponse(
        status="ok",
        model="BGE + weighted kNN",
        version="0.1.0",
    )
