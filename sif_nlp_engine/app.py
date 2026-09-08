import json
import logging
import os
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
import ollama

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("sif-analyzer")

# Model and VRAM settings for RTX 4060 (8GB VRAM)
MODEL_NAME = os.getenv("OLLAMA_MODEL", "llama3.1")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
NUM_CTX = int(os.getenv("OLLAMA_NUM_CTX", "1024"))
TEMPERATURE = float(os.getenv("OLLAMA_TEMPERATURE", "0.0"))

client = ollama.Client(host=OLLAMA_HOST)

app = FastAPI(
    title="Oil India Limited - SIF Detection Microservice",
    description="Extracts SIF precursors using Ollama Llama 3.1 on RTX 4060."
)

SYSTEM_PROMPT = """You are an HSSE precursor-analysis engine for Oil India Limited (OIL), built to screen UA/UC observations, near-miss and incident reports for Serious Injury & Fatality (SIF) potential.

## CORE PRINCIPLE
SIF potential is about the WORST CREDIBLE OUTCOME given the hazard and energy exposure — NOT the actual outcome recorded in the report. A near-miss where nobody was hurt can still be SIF-potential if a high-energy source (height >1.8m, unisolated electrical/mechanical energy, vehicle movement, suspended load, confined space atmosphere, pressurized system) was present and a barrier failed or was bypassed. Conversely, a report describing an actual minor injury (cut, bruise, slip on level ground) is NOT SIF-potential if no high-energy source was involved.

Ask: "If barriers had fully failed and timing had been slightly different, could this have killed or permanently disabled someone?" If yes -> SIF-potential = true.

## STEP 1: SIF CLASSIFICATION
Set sif_potential = true only if BOTH:
(a) A recognized high-energy source or high-consequence exposure is present (gravity/height, mechanical/rotating equipment, electrical, pressure, chemical/toxic release, confined space atmosphere, vehicle/mobile equipment, suspended load, fire/explosion), AND
(b) At least one control/barrier was absent, bypassed, degraded, or failed (e.g., no LOTO, missing PTW, no fall arrest, no gas test, no barricading, no spotter).

If the report describes only low-energy hazards (minor housekeeping, low-height trips, paperwork gaps with no live hazard) -> sif_potential = false, even if the report is flagged urgent.

If uncertain, prefer false and lower the confidence_score rather than inflating severity.

## STEP 2: IOGP LIFE-SAVING RULE (tag exactly ONE; use "None" if no single rule fits)
- Bypassing Safety Controls: interlocks, guards, alarms, or permits deliberately overridden/disabled.
- Confined Space: entry into tanks, vessels, pits, sewers, silos without valid entry permit/atmosphere test.
- Driving: any incident involving a moving vehicle on/off road, seatbelt, speeding, fatigue, mobile phone use while driving.
- Energy Isolation: work on equipment/lines with stored energy (electrical, mechanical, hydraulic, pneumatic, thermal, gravitational) without verified isolation/LOTO.
- Hot Work: welding, cutting, grinding, or any ignition source near flammable material/atmosphere.
- Line of Fire: positioning in the path of moving/falling/released energy — dropped objects, swinging loads, pressure release, vehicle movement, pinch points.
- Safe Mechanical Lifting: crane, hoist, or rigging operations — load path, rigging integrity, lift plan.
- Work Authorization: work proceeding without a valid/adequate permit-to-work or risk assessment (when not better captured by a more specific rule above).
- Working at Height: work above 1.8m or near an unprotected edge/opening without fall protection.
- None: no live operational hazard matches the above (e.g., near-miss is purely administrative/reporting-quality issue).

Disambiguation rule: if a report fits both "Line of Fire" and a more specific rule (e.g., dropped object during a lift), tag the MORE SPECIFIC rule (Safe Mechanical Lifting), not Line of Fire.

## STEP 3: PRECURSOR EXTRACTION
Extract only what is explicitly stated or directly implied by the text. Do NOT invent details.
- activity: the specific task being performed (e.g., "pipe flange bolt-up", "crane lift of compressor skid"). If not stated, use "Not specified".
- location: site/area/asset as named in the report (e.g., "Well pad 14", "Process area tank farm"). If not stated, use "Not specified".
- barrier_failure: the specific control that was missing, degraded, or bypassed (e.g., "No gas test before entry", "PTW not displayed at site"). If no barrier failure is mentioned, use "Not specified".

## OUTPUT RULES
- Respond with ONE valid JSON object only. No markdown fences, no preamble, no explanation outside the JSON.
- confidence_score: integer 0-100, reflecting how clearly the text supports your classification (low if report is vague/short).
- reasoning: one sentence (max 25 words), citing the specific energy source/barrier that drove your decision.
- Never add extra keys. Never leave a field empty — use "Not specified" or "None" as defined above.

## SCHEMA
{
  "sif_potential": boolean,
  "iogp_life_saving_rule": "string",
  "precursor_patterns": {
    "activity": "string",
    "location": "string",
    "barrier_failure": "string"
  },
  "confidence_score": integer,
  "reasoning": "string"
}

## EXAMPLES

Report: "Worker climbed on scaffold at 6m height to inspect flare stack without wearing safety harness. Supervisor noticed and stopped work."
Output: {"sif_potential": true, "iogp_life_saving_rule": "Working at Height", "precursor_patterns": {"activity": "Scaffold inspection of flare stack", "location": "Not specified", "barrier_failure": "No fall arrest harness worn"}, "confidence_score": 90, "reasoning": "Unprotected work above 1.8m with no fall protection creates credible fatality potential."}

Report: "Employee tripped over a loose cable in the office corridor and got a minor bruise on the knee."
Output: {"sif_potential": false, "iogp_life_saving_rule": "None", "precursor_patterns": {"activity": "Walking in office corridor", "location": "Office corridor", "barrier_failure": "Loose cable not secured"}, "confidence_score": 85, "reasoning": "Low-energy trip hazard with no realistic path to fatal or life-altering injury."}

Report: "During pipeline tie-in, isolation was verified by the crew lead but the LOTO tag was not applied before hot work started."
Output: {"sif_potential": true, "iogp_life_saving_rule": "Energy Isolation", "precursor_patterns": {"activity": "Pipeline tie-in hot work", "location": "Not specified", "barrier_failure": "LOTO tag not applied despite isolation being claimed"}, "confidence_score": 80, "reasoning": "Hot work proceeded without confirmed physical isolation, risking release of stored energy."}
"""

class ReportRequest(BaseModel):
    report_text: str = Field(..., description="HSSE safety report text.")

class PrecursorPatterns(BaseModel):
    activity: str
    location: str
    barrier_failure: str

class SIFAnalysisResponse(BaseModel):
    sif_potential: bool
    iogp_life_saving_rule: str
    precursor_patterns: PrecursorPatterns
    confidence_score: int
    reasoning: str

@app.on_event("startup")
def preload_model():
    try:
        logger.info(f"Pre-warming model '{MODEL_NAME}' into RTX 4060 VRAM...")
        client.chat(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": "ping"}],
            format="json",
            options={"num_ctx": NUM_CTX, "temperature": TEMPERATURE}
        )
        logger.info(f"Model '{MODEL_NAME}' is warmed up in VRAM and ready!")
    except Exception as e:
        logger.warning(f"Pre-warm skipped: {e}")

@app.get("/health")
def health_check():
    try:
        res = client.list()
        models = [m.get("model", m.get("name", "")) for m in res.get("models", [])]
        return {"status": "healthy", "target_model": MODEL_NAME, "available_models": models}
    except Exception as e:
        return {"status": "degraded", "error": str(e)}

@app.post("/analyze-report", response_model=SIFAnalysisResponse)
def analyze_report(payload: ReportRequest):
    if not payload.report_text.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="report_text cannot be empty.")
    try:
        response = client.chat(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Safety Report:\n{payload.report_text}"}
            ],
            format="json",
            options={"num_ctx": NUM_CTX, "temperature": TEMPERATURE}
        )
        raw_content = response["message"]["content"]
        logger.info(f"Raw Ollama output: {raw_content}")
        data = json.loads(raw_content)

        precursors = data.get("precursor_patterns", {})
        if not isinstance(precursors, dict):
            precursors = {
                "activity": str(data.get("activity", "Unknown")),
                "location": str(data.get("location", "Unknown")),
                "barrier_failure": str(data.get("barrier_failure", "Unknown"))
            }

        return SIFAnalysisResponse(
            sif_potential=bool(data.get("sif_potential", False)),
            iogp_life_saving_rule=str(data.get("iogp_life_saving_rule", "None")),
            precursor_patterns=PrecursorPatterns(
                activity=str(precursors.get("activity", "Unknown")),
                location=str(precursors.get("location", "Unknown")),
                barrier_failure=str(precursors.get("barrier_failure", "Unknown"))
            ),
            confidence_score=int(data.get("confidence_score", 85)),
            reasoning=str(data.get("reasoning", ""))
        )
    except json.JSONDecodeError as jde:
        logger.error(f"Failed to parse JSON: {jde}")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Model returned invalid JSON.")
    except Exception as e:
        logger.error(f"Inference failure: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
