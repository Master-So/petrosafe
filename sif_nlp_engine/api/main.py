"""FastAPI application entrypoint for the SIF Backend Engine.

Exposes REST APIs for SIF potential prediction, nearest incident retrieval,
historical precursor patterns, metadata, and benchmark evaluation.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import health, patterns, prediction, reports
from src.pipeline.prediction_pipeline import PredictionPipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("sif_api")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manages application startup and shutdown lifecycle."""
    logger.info("Initializing SIF Backend Prediction Pipeline...")
    try:
        app.state.pipeline = PredictionPipeline()
        logger.info("Prediction Pipeline initialized successfully.")
    except Exception as e:
        logger.warning("Could not fully initialize pipeline at startup: %s", e)
        logger.warning("Make sure training scripts (03-05) have been executed.")
        app.state.pipeline = None

    yield
    logger.info("Shutting down SIF Backend service.")


app = FastAPI(
    title="OIL SIF Precursor Detection Engine API",
    description=(
        "AI/NLP Engine to Detect Serious Injury & Fatality (SIF) Precursors in Safety Reports. "
        "Exposes SIF-potential classification, precursor detection, IOGP Life-Saving Rules mapping, "
        "and recurring pattern analytics.\n\n"
        "**NOTE**: The current SIF label is a development proxy derived from Potential Accident Level "
        "and is not an official OIL/IOGP SIF classification."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for frontend team integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(health.router)
app.include_router(prediction.router)
app.include_router(patterns.router)
app.include_router(reports.router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api.main:app", host="0.0.0.0", port=8000, reload=True)
