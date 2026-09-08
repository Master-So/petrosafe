/**
 * src/app.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Express application factory.
 *
 * Responsible for:
 *   - Middleware stack (cors, json body parser, morgan request logging)
 *   - Route mounting
 *   - Global error handler
 */

require("dotenv").config();
require("express-async-errors"); // patches Router so async errors propagate

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const incidentRoutes = require("./routes/incidentRoutes");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow React dev servers on both Vite (5173) and CRA (3000) ports.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no Origin header) and allowed origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// ── Body Parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request Logging ────────────────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Health Check ───────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "petrosafe-backend", ts: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────────
app.use("/api/incidents", incidentRoutes);

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isDev = process.env.NODE_ENV !== "production";

  console.error(`[ERROR] ${err.name || "Error"}: ${err.message}`);

  res.status(statusCode).json({
    error: err.name || "InternalServerError",
    message: err.message,
    ...(isDev && err.stack ? { stack: err.stack } : {}),
  });
});

module.exports = app;
