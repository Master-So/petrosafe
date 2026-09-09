/**
 * src/controllers/incidentController.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Business logic for the /api/incidents resource.
 *
 * Handlers:
 *   createIncident  — POST /api/incidents
 *   getAllIncidents  — GET  /api/incidents
 *   getAnalytics    — GET  /api/incidents/analytics
 */

const prisma = require("../config/db");
const { analyzeIncident, AiServiceError } = require("../services/aiService");

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validate the required raw incident fields from the request body.
 * Returns an array of missing field names.
 */
function validateIncidentInput({ date, location, short_cause, description }) {
  const missing = [];
  if (!date) missing.push("date");
  if (!location) missing.push("location");
  if (!short_cause) missing.push("short_cause");
  if (!description || description.trim().length < 5)
    missing.push("description (min 5 chars)");
  return missing;
}

// ── POST /api/incidents ───────────────────────────────────────────────────────
/**
 * 1. Validate raw input
 * 2. Call Python FastAPI for AI enrichment
 * 3. Persist the merged record to PostgreSQL
 * 4. Return the created record (201)
 */
async function createIncident(req, res, next) {
  const { date, location, short_cause, description } = req.body;

  // ── Validation ─────────────────────────────────────────────────────────────
  const missing = validateIncidentInput({ date, location, short_cause, description });
  if (missing.length > 0) {
    return res.status(400).json({
      error: "Missing or invalid fields",
      missing,
    });
  }

  // ── AI Enrichment ──────────────────────────────────────────────────────────
  let enriched;
  try {
    enriched = await analyzeIncident({ date, location, short_cause, description });
  } catch (err) {
    if (err instanceof AiServiceError) {
      // Log and propagate with the HTTP status code the error carries
      console.error("[incidentController] AI enrichment failed:", err.message);
      return res.status(err.statusCode).json({
        error: "AI enrichment failed",
        detail: err.message,
      });
    }
    return next(err); // unexpected — let the global handler deal with it
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  const incident = await prisma.incident.create({
    data: {
      date: new Date(enriched.date ?? date),
      location: enriched.location ?? location,
      short_cause: enriched.short_cause ?? short_cause,
      description: enriched.description ?? description,
      local_summary: enriched.local_summary,
      local_risk_level: enriched.local_risk_level,
      sif_precursor_density_score: enriched.sif_precursor_density_score,
      life_saving_rule: enriched.life_saving_rule,
      fatal_potential_flag: enriched.fatal_potential_flag,
      risk_reasoning: enriched.risk_reasoning,
      corrective_actions: enriched.corrective_actions, // JSON array → JSONB
    },
  });

  return res.status(201).json(incident);
}

// ── GET /api/incidents ────────────────────────────────────────────────────────
/**
 * Fetch all incidents ordered by created_at DESC (newest first).
 */
async function getAllIncidents(req, res) {
  const incidents = await prisma.incident.findMany({
    orderBy: { created_at: "desc" },
  });
  return res.json(incidents);
}

// ── GET /api/incidents/analytics ─────────────────────────────────────────────
/**
 * Returns dashboard-ready aggregated metrics:
 *   - total_incidents
 *   - fatal_potential_count   (fatal_potential_flag = true)
 *   - avg_sif_score           (average sif_precursor_density_score)
 *   - by_risk_level           ({ SIF-HIGH, MEDIUM, LOW })
 *   - by_life_saving_rule     ({ ruleName: count, … })
 */
async function getAnalytics(req, res) {
  // Run all aggregation queries in parallel for performance
  const [
    totalCount,
    fatalCount,
    avgScoreResult,
    byRiskLevel,
    byLifeSavingRule,
    byLocation,
  ] = await Promise.all([
    // 1. Total count
    prisma.incident.count(),

    // 2. Count where fatal_potential_flag = true
    prisma.incident.count({
      where: { fatal_potential_flag: true },
    }),

    // 3. Average SIF precursor density score
    prisma.incident.aggregate({
      _avg: { sif_precursor_density_score: true },
    }),

    // 4. Group by local_risk_level
    prisma.incident.groupBy({
      by: ["local_risk_level"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // 5. Group by life_saving_rule
    prisma.incident.groupBy({
      by: ["life_saving_rule"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // 6. Group by location
    prisma.incident.groupBy({
      by: ["location"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  // Reshape grouped results into flat maps for easy frontend consumption
  const riskLevelMap = byRiskLevel.reduce((acc, row) => {
    acc[row.local_risk_level] = row._count.id;
    return acc;
  }, {});

  const lifeSavingRuleMap = byLifeSavingRule.reduce((acc, row) => {
    acc[row.life_saving_rule] = row._count.id;
    return acc;
  }, {});

  const locationMap = byLocation.reduce((acc, row) => {
    acc[row.location] = row._count.id;
    return acc;
  }, {});

  return res.json({
    total_incidents: totalCount,
    fatal_potential_count: fatalCount,
    avg_sif_score: parseFloat(
      (avgScoreResult._avg.sif_precursor_density_score ?? 0).toFixed(2)
    ),
    by_risk_level: riskLevelMap,
    by_life_saving_rule: lifeSavingRuleMap,
    by_location: locationMap,
  });
}

module.exports = { createIncident, getAllIncidents, getAnalytics };
