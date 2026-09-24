// SCS pilot API — entry point.
//
// Boot order, each step fatal on failure (logged, exit 1):
//   1. database configuration, connection and role check — foundation/db.ts
//      refuses owner, superuser, BYPASSRLS and other elevated roles
//   2. authentication — the static actors file (SCS_AUTH_STATIC_ACTORS_FILE)
//      is loaded and every entry validated
//   3. listen — foundation/server.ts
//
// Routes: GET /health plus every capability route in capabilities/index.ts
// (currently SCS-CAP-01 POST /scs/v1/frameworks).

import { CAPABILITY_ROUTES } from "./capabilities/index.js";
import { StaticTokenAuthenticator } from "./foundation/auth.js";
import { log } from "./foundation/correlation.js";
import { connectDatabase, dbConfigFromEnv, RestrictedRoleViolation, type Database } from "./foundation/db.js";
import { createApiServer } from "./foundation/server.js";

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

  let authenticator: StaticTokenAuthenticator;
  try {
    const file = process.env["SCS_AUTH_STATIC_ACTORS_FILE"];
    if (file === undefined || file.trim() === "") throw new Error("SCS_AUTH_STATIC_ACTORS_FILE is not set");
    authenticator = await StaticTokenAuthenticator.fromFile(file);
  } catch (err) {
    log.error("startup failed: authentication is not configured", { err });
    await db.close();
    process.exitCode = 1;
    return;
  }

  const port = Number(process.env["API_PORT"] ?? 3000);
  const server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db });
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
