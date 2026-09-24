// SCS pilot API — entry point.
//
// Boot order: read database configuration, connect as the restricted role and
// verify it (foundation/db.ts refuses owner, superuser and BYPASSRLS roles),
// then listen. Any startup failure is logged and the process exits non-zero.
//
// Exposes GET /health only. No capability is implemented yet; the HTTP layer
// moves to foundation/server.ts next.

import { createServer } from "node:http";

import { log } from "./foundation/correlation.js";
import { connectDatabase, dbConfigFromEnv, RestrictedRoleViolation, type Database } from "./foundation/db.js";

async function main(): Promise<void> {
  let db: Database;
  try {
    db = await connectDatabase(dbConfigFromEnv());
  } catch (err) {
    if (err instanceof RestrictedRoleViolation) {
      log.error("startup refused: database role is not the restricted application role", { violations: err.violations });
    } else {
      log.error("startup failed: invalid database configuration or database unreachable", { err });
    }
    process.exitCode = 1;
    return;
  }

  const port = Number(process.env["API_PORT"] ?? 3000);
  const server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "scs-pilot-api", capabilitiesImplemented: [] }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "NOT_FOUND" }));
  });

  server.listen(port, () => log.info("scs-pilot-api listening", { port }));

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      server.close(() => {
        void db.close().finally(() => process.exit(0));
      });
    });
  }
}

void main();
