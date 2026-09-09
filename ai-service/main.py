"""
main.py
───────
FastAPI micro-service that wraps the pre-trained safety models located in
/AIModels/safety_platform and enriches results via Gemini 3.8 Flash.

Endpoints:
    POST /analyze-local   → Local model inference only
    POST /process-report  → Local models + Gemini GenAI enrichment (unified)
    GET  /health          → Liveness probe
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from model_loader import get_pipeline
from api_schemas import (
    ReportRequest,
    AnalyzeResponse,
    ProcessReportResponse,
)
from gemini_client import enrich_with_gemini

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(name)-28s │ %(levelname)-7s │ %(message)s",
)
logger = logging.getLogger("ai_service.main")


# ── Lifespan: warm up models on startup ──────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eagerly initialise the pipeline so the first request isn't slow."""
    # logger.info("🔧  Warming up SafetyInferencePipeline …")
    # try:
    #     pipeline = get_pipeline()
    #     logger.info(
    #         "✅  Pipeline ready  (resolution_mode=%s)", pipeline.resolution_mode
    #     )
    # except Exception as exc:
    #     logger.critical("❌  Pipeline failed to load: %s", exc, exc_info=True)
    #     raise  # Fail fast — don't start a broken server
    logger.info("🔧  Bypassing SafetyInferencePipeline warmup (using Gemini only).")
    yield


app = FastAPI(
    title="PetroSafe AI Service",
    version="0.2.0",
    description=(
        "Local model inference for industrial incident triage & summarisation, "
        "with optional Gemini GenAI enrichment."
    ),
    lifespan=lifespan,
)


# ── Risk-level mapping ──────────────────────────────────────────────────────
def _map_risk_level(predicted_severity: int, sif_label: str) -> str:
    """Map the 5-class severity prediction to the three-tier risk label.

    Mapping logic:
        • Severity 4–5 (SIF)  → SIF-HIGH
        • Severity 3   (SIF)  → MEDIUM
        • Severity 1–2 (Non-SIF) → LOW
    """
    if sif_label == "SIF" and predicted_severity >= 4:
        return "SIF-HIGH"
    if sif_label == "SIF":  # severity == 3
        return "MEDIUM"
    return "LOW"


def _run_local_inference(payload: ReportRequest) -> tuple[dict, str, str]:
    """Run the local safety pipeline and return (raw_result, summary, risk_level)."""
    pipeline = get_pipeline()
    result = pipeline.predict(
        narrative=payload.description,
        category=payload.short_cause,
        location=payload.location,
        perceived_severity=1,  # conservative default
    )
    risk_level = _map_risk_level(result["predicted_severity"], result["sif_label"])
    return result, result["executive_summary"], risk_level


# ── POST /analyze-local ─────────────────────────────────────────────────────
@app.post(
    "/analyze-local",
    response_model=AnalyzeResponse,
    summary="Analyse a single incident using local AI models",
    tags=["Inference"],
)
async def analyze_local(payload: ReportRequest) -> AnalyzeResponse:
    """Run the incident description through the local severity classifier and
    executive summary generator.

    The `short_cause` is forwarded as the model's *category* parameter to
    improve severity heuristic accuracy.  `location` enriches the generated
    executive summary.
    """
    try:
        # _, summary, risk_level = _run_local_inference(payload)
        report_data = payload.model_dump()
        enrichment = await enrich_with_gemini(report_data, "", "")
        summary = enrichment.summary
        risk_level = enrichment.risk_level
    except RuntimeError as exc:
        logger.error("Pipeline unavailable: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="AI models are not available. Check server logs for details.",
        ) from exc
    except Exception as exc:
        logger.exception("Inference failed for payload: %s", payload.model_dump())
        raise HTTPException(
            status_code=500,
            detail=f"Model inference error: {exc}",
        ) from exc

    return AnalyzeResponse(
        local_summary=summary,
        local_risk_level=risk_level,
    )


# ── POST /process-report (unified: local + Gemini) ──────────────────────────
@app.post(
    "/process-report",
    response_model=ProcessReportResponse,
    summary="Full AI pipeline: local models + Gemini GenAI enrichment",
    tags=["Inference"],
)
async def process_report(payload: ReportRequest) -> ProcessReportResponse:
    """Master endpoint that runs the complete AI pipeline in a single call.

    Step 1 — Local model inference (severity classification + executive summary).
    Step 2 — Gemini GenAI enrichment (SIF precursor analysis, life-saving rule
             mapping, fatal potential, risk reasoning, corrective actions).
    Step 3 — Return a unified JSON payload combining both outputs.

    If Gemini fails or times out, local model results are still returned with
    safe default enrichment fields.
    """
    # ── Step 1: Local models ─────────────────────────────────────────────────
    # try:
    #     _, local_summary, local_risk = _run_local_inference(payload)
    # except RuntimeError as exc:
    #     logger.error("Pipeline unavailable: %s", exc)
    #     raise HTTPException(
    #         status_code=503,
    #         detail="AI models are not available. Check server logs for details.",
    #     ) from exc
    # except Exception as exc:
    #     logger.exception("Local inference failed: %s", exc)
    #     raise HTTPException(
    #         status_code=500,
    #         detail=f"Local model inference error: {exc}",
    #     ) from exc

    # ── Step 2: Gemini enrichment (non-blocking, graceful fallback) ──────────
    report_data = payload.model_dump()
    enrichment = await enrich_with_gemini(report_data, "", "")

    # ── Step 3: Unified response ─────────────────────────────────────────────
    return ProcessReportResponse(
        date=payload.date,
        location=payload.location,
        short_cause=payload.short_cause,
        description=payload.description,
        primary_cause_category=payload.primary_cause_category,
        equipment_failed=payload.equipment_failed,
        shift=payload.shift,
        local_summary=enrichment.summary,
        local_risk_level=enrichment.risk_level,
        sif_precursor_density_score=enrichment.sif_precursor_density_score,
        life_saving_rule=enrichment.life_saving_rule,
        fatal_potential_flag=enrichment.fatal_potential_flag,
        risk_reasoning=enrichment.risk_reasoning,
        corrective_actions=enrichment.corrective_actions,
    )


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Ops"])
async def health():
    """Lightweight liveness probe."""
    return {"status": "ok"}
