/**
 * src/server.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Application entry point.
 *
 * Starts the Express HTTP server and handles graceful shutdown so the
 * Prisma connection pool is properly closed on SIGTERM / SIGINT.
 */

require("dotenv").config();

const app = require("./app");
const prisma = require("./config/db");

const PORT = parseInt(process.env.PORT || "5000", 10);

const server = app.listen(PORT, () => {
  console.log(`\n🛢  PetroSafe Backend running on http://localhost:${PORT}`);
  console.log(`   NODE_ENV     : ${process.env.NODE_ENV || "development"}`);
  console.log(`   DATABASE_URL : ${process.env.DATABASE_URL ? "✅ set" : "❌ MISSING"}`);
  console.log(`   AI_SERVICE   : ${process.env.AI_SERVICE_URL || "http://localhost:8000"}\n`);
});

// ── Graceful Shutdown ──────────────────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully …`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("✅  Prisma disconnected. Bye.");
    process.exit(0);
  });

  // Force exit if graceful close takes too long
  setTimeout(() => {
    console.error("⚠️  Forced exit after 10s timeout");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
