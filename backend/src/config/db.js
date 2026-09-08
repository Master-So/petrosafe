/**
 * src/config/db.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports a singleton PrismaClient so the connection pool is shared across
 * all modules.  Hot-reload safe: stores the instance on `global` in dev mode
 * to avoid "Too many connections" errors from nodemon restarts.
 */

const { PrismaClient } = require("@prisma/client");

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
