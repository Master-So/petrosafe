"""
gemini_client.py
────────────────
Async wrapper around the google-genai SDK for Gemini 3.8 Flash enrichment.

Loads GEMINI_API_KEY from environment / .env and exposes a single function:
    enrich_with_gemini(report_data, local_summary, local_risk) → GeminiEnrichmentResponse
"""

import os
import asyncio
import logging
from functools import lru_cache

from dotenv import load_dotenv

from api_schemas import GeminiEnrichmentResponse, GEMINI_FALLBACK

logger = logging.getLogger("ai_service.gemini_client")

# ── Load .env ────────────────────────────────────────────────────────────────
load_dotenv()


# ── Lazy-initialised Gemini client ───────────────────────────────────────────
@lru_cache(maxsize=1)
def _get_client():
    """Return a configured google.genai.Client singleton.

    Raises on startup if the API key is missing so the error is obvious.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "[gemini_client] GEMINI_API_KEY is not set. "
            "Add it to your .env file or export it as an environment variable."
        )

    from google import genai  # deferred import to keep startup fast when not used

    client = genai.Client(api_key=api_key)
    logger.info("Gemini client initialised (model=gemini-3.8-flash)")
    return client


# ── Prompt template ──────────────────────────────────────────────────────────
_SYSTEM_PROMPT = """\
You are an expert industrial safety analyst specialising in SIF (Serious Injury \
or Fatality) precursor identification for the oil, gas, mining, and heavy \
industry sectors. Your role is to enrich an incident report with structured \
risk intelligence.

You will receive:
1. The raw incident report fields (date, location, short_cause, description).

Your task:
- Write a concise executive summary of the incident (intel details).
- Assess the risk level as one of: SIF-HIGH, MEDIUM, LOW.
- Evaluate the SIF precursor density on a 1-10 scale based on the energy \
  sources, control barriers, and human factors described.
- Map the incident to the single most applicable IOGP Life-Saving Rule from \
  this exact list: "Bypassing Safety Controls", "Confined Space", \
  "Energy Isolation", "Hot Work", "Line of Fire", "Safe Driving", \
  "Work Authorization", "Working at Height", or "None" if no rule applies.
- Determine whether the event carries realistic fatal potential (boolean).
- Provide a concise 2-sentence risk reasoning grounded in energy type and \
  barrier failure analysis.
- Suggest exactly 2 immediate, high-priority corrective actions that a field \
  supervisor can execute within 24 hours.

Respond ONLY with valid JSON matching the enforced schema.
"""


def _build_user_prompt(
    report_data: dict, local_summary: str, local_risk: str
) -> str:
    return (
        f"=== INCIDENT REPORT ===\n"
        f"Date: {report_data['date']}\n"
        f"Location: {report_data['location']}\n"
        f"Short Cause: {report_data['short_cause']}\n"
        f"Description: {report_data['description']}\n\n"
        f"Analyse this incident and return structured enrichment."
    )


# ── Core enrichment function ────────────────────────────────────────────────
_DEFAULT_MODELS = "gemini-3.8-flash,gemini-3.7-flash,gemini-3.6-flash,gemini-3.5-flash-lite"
GEMINI_MODELS: list[str] = [
    m.strip()
    for m in os.getenv("GEMINI_MODEL", _DEFAULT_MODELS).split(",")
    if m.strip()
]
GEMINI_TIMEOUT_SECONDS = 30
MAX_RETRIES_PER_MODEL = 2          # retries only for transient 503s
INITIAL_BACKOFF_SECONDS = 1.5      # doubles on each retry


def _is_transient_503(exc: Exception) -> bool:
    """Return True if the exception looks like a transient 503 overload."""
    msg = str(exc)
    return "503" in msg and ("UNAVAILABLE" in msg or "high demand" in msg)


async def enrich_with_gemini(
    report_data: dict,
    local_summary: str,
    local_risk: str,
) -> GeminiEnrichmentResponse:
    """Call Gemini with structured output enforcement.

    Tries each model in the GEMINI_MODELS fallback chain (left → right).
    For transient 503 errors, retries the *same* model up to
    MAX_RETRIES_PER_MODEL times with exponential backoff before moving on.
    On permanent failures (404, parse error, timeout) the function moves
    directly to the next model.  If all models fail, returns a safe fallback
    so local model results are always preserved.
    """
    try:
        client = _get_client()
    except EnvironmentError as exc:
        logger.warning("Gemini skipped — %s", exc)
        return GEMINI_FALLBACK

    user_prompt = _build_user_prompt(report_data, local_summary, local_risk)

    from google.genai import types

    for model_name in GEMINI_MODELS:
        backoff = INITIAL_BACKOFF_SECONDS

        for attempt in range(1, MAX_RETRIES_PER_MODEL + 2):  # 1 initial + retries
            try:
                logger.info(
                    "Trying Gemini model: %s (attempt %d/%d)",
                    model_name, attempt, MAX_RETRIES_PER_MODEL + 1,
                )

                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client.models.generate_content,
                        model=model_name,
                        contents=user_prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=GeminiEnrichmentResponse,
                            system_instruction=_SYSTEM_PROMPT,
                            temperature=0.2,
                        ),
                    ),
                    timeout=GEMINI_TIMEOUT_SECONDS,
                )

                if response.text is None:
                    raise ValueError("Gemini returned empty response text")

                enrichment = GeminiEnrichmentResponse.model_validate_json(response.text)
                logger.info(
                    "Gemini enrichment OK (model=%s, attempt=%d) — SIF score=%d, rule=%s",
                    model_name,
                    attempt,
                    enrichment.sif_precursor_density_score,
                    enrichment.life_saving_rule,
                )
                return enrichment

            except asyncio.TimeoutError:
                logger.warning("Model %s timed out after %ds", model_name, GEMINI_TIMEOUT_SECONDS)
                break  # timeout → skip to next model

            except Exception as exc:
                if _is_transient_503(exc) and attempt <= MAX_RETRIES_PER_MODEL:
                    logger.warning(
                        "Model %s returned 503 (attempt %d) — retrying in %.1fs …",
                        model_name, attempt, backoff,
                    )
                    await asyncio.sleep(backoff)
                    backoff *= 2
                    continue
                logger.warning("Model %s failed: %s", model_name, exc)
                break  # permanent error → next model

    logger.error("All Gemini models exhausted %s — returning fallback", GEMINI_MODELS)
    return GEMINI_FALLBACK

