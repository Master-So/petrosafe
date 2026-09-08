/**
 * src/services/aiService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Axios client for the Python FastAPI AI microservice.
 *
 * Exposes:
 *   analyzeIncident(reportData) → Promise<EnrichedPayload>
 *
 * The function throws an AiServiceError (with .cause) on any failure so the
 * controller layer can return a clean 502 to the React client without leaking
 * internal stack traces.
 */

const axios = require("axios");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// Dedicated axios instance with a generous timeout matching the Gemini retry
// chain (up to ~90 s worst case: 3 models × 2 retries × 15 s each).
const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 120_000, // 2 minutes
  headers: { "Content-Type": "application/json" },
});

// ── Custom error ─────────────────────────────────────────────────────────────
class AiServiceError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "AiServiceError";
    this.cause = cause;
    this.statusCode = 502;
  }
}

/**
 * Send a raw incident report to the FastAPI /process-report endpoint and
 * return the fully-enriched payload (local model + Gemini fields).
 *
 * @param {{ date: string, location: string, short_cause: string, description: string }} reportData
 * @returns {Promise<Object>} Enriched incident payload
 * @throws {AiServiceError} If the AI service is unreachable or returns an error
 */
async function analyzeIncident(reportData) {
  try {
    const response = await aiClient.post("/process-report", reportData);
    return response.data;
  } catch (err) {
    if (err.response) {
      // FastAPI returned a non-2xx response
      const detail =
        err.response.data?.detail ||
        err.response.data?.message ||
        JSON.stringify(err.response.data);
      throw new AiServiceError(
        `AI service returned ${err.response.status}: ${detail}`,
        err
      );
    } else if (err.request) {
      // Network error — FastAPI not reachable
      throw new AiServiceError(
        `AI service unreachable at ${AI_SERVICE_URL}. Is the Python service running?`,
        err
      );
    } else {
      throw new AiServiceError(`AI service request setup failed: ${err.message}`, err);
    }
  }
}

module.exports = { analyzeIncident, AiServiceError };
