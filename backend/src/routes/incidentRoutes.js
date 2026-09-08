/**
 * src/routes/incidentRoutes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Express router for the /api/incidents resource.
 *
 * Routes:
 *   POST   /api/incidents            → createIncident
 *   GET    /api/incidents            → getAllIncidents
 *   GET    /api/incidents/analytics  → getAnalytics
 *
 * NOTE: /analytics must be declared BEFORE /:id-style routes (if added later)
 * so Express does not mistake "analytics" for a dynamic segment.
 */

const { Router } = require("express");
const {
  createIncident,
  getAllIncidents,
  getAnalytics,
} = require("../controllers/incidentController");

const router = Router();

// ── Analytics (must come before any future /:id route) ────────────────────────
router.get("/analytics", getAnalytics);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.post("/", createIncident);
router.get("/", getAllIncidents);

module.exports = router;
