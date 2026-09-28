// SCS pilot API — entry point.
//
// Boot order, each step fatal on failure (logged, exit 1):
//   1. database configuration, connection and role check — foundation/db.ts
//      refuses owner, superuser, BYPASSRLS and other elevated roles
//   2. authentication — the static actors file (SCS_AUTH_STATIC_ACTORS_FILE)
//      is loaded and every entry validated
//   3. evidence object store (AAB-PLATFORM-01): configuration from S3_*, and
//      the bucket created if missing — an unreachable store stops startup
//   4. listen — foundation/server.ts
//
// Routes: GET /health, POST /scs/v1/evidence-objects (platform/evidence-objects),
// every capability route in capabilities/index.ts, and the public-key
// registry's routes under /aab/v1/ (platform/key-registry).
//
// The control plane's registry instance (AAB-PLATFORM-09, second amendment:
// one implementation, two deployments) is this same program with
// AAB_REGISTRY_INSTANCE=CONTROL_PLANE: its actors are issued by
// PLATFORM_CONTROL_PLANE, it serves the registry's routes and nothing else,
// and it needs no object store. It holds no country data, and no country stack
// ever connects to it.

import { capabilityRoutes } from "./capabilities/index.js";
import { READER_ROLES as CAP08_READER_ROLES } from "./capabilities/cap-08/errors.js";
import { cap08Routes } from "./capabilities/cap-08/routes.js";
import { StaticTokenAuthenticator } from "./foundation/auth.js";
import { log } from "./foundation/correlation.js";
import { connectDatabase, dbConfigFromEnv, RestrictedRoleViolation, type Database } from "./foundation/db.js";
import { createApiServer } from "./foundation/server.js";
import { evidenceBucketProblemsForApi, objectStoreConfigFromEnv, S3ObjectStore } from "./platform/evidence-objects/object-store.js";
import { renditionRoutes } from "./platform/renditions/routes.js";
import { evidenceObjectRoutes } from "./platform/evidence-objects/routes.js";
import { keyRegistryRoutes } from "./platform/key-registry/routes.js";

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

  const instance = process.env["AAB_REGISTRY_INSTANCE"];
  if (instance !== undefined && instance !== "CONTROL_PLANE") {
    log.error("startup failed: AAB_REGISTRY_INSTANCE must be CONTROL_PLANE or unset", { instance });
    await db.close();
    process.exitCode = 1;
    return;
  }
  const controlPlane = instance === "CONTROL_PLANE";

  let authenticator: StaticTokenAuthenticator;
  try {
    const file = process.env["SCS_AUTH_STATIC_ACTORS_FILE"];
    if (file === undefined || file.trim() === "") throw new Error("SCS_AUTH_STATIC_ACTORS_FILE is not set");
    if (controlPlane) {
      if (process.env["SCS_ACTOR_ISSUER_COUNTRY"] !== undefined) throw new Error("The control plane's registry issues PLATFORM_CONTROL_PLANE actors: unset SCS_ACTOR_ISSUER_COUNTRY");
      authenticator = await StaticTokenAuthenticator.fromFile(file, { controlPlane: true });
    } else {
      // A country deployment's single issuer: its country tenancy (AAB-PLATFORM-03). No default.
      const issuerCountry = process.env["SCS_ACTOR_ISSUER_COUNTRY"];
      if (issuerCountry === undefined || issuerCountry.trim() === "") throw new Error("SCS_ACTOR_ISSUER_COUNTRY is not set");
      authenticator = await StaticTokenAuthenticator.fromFile(file, { issuerCountry });
    }
  } catch (err) {
    log.error("startup failed: authentication is not configured", { err });
    await db.close();
    process.exitCode = 1;
    return;
  }

  const port = Number(process.env["API_PORT"] ?? 3000);
  if (controlPlane) {
    const server = createApiServer({ routes: [...keyRegistryRoutes(authenticator)], authenticator, db });
    server.listen(port, () => log.info("aab control-plane key registry listening", { port }));
    shutdownOn(server, db);
    return;
  }

  // AAB-PLATFORM-01, amendment of 2026-09-28, section 5: the API runs only
  // with its own scoped credential, against a bucket the setup step
  // (objectstore-init) has created, locked and given its policy.
  let objectStore: S3ObjectStore;
  try {
    const config = objectStoreConfigFromEnv("API");
    const problems = await evidenceBucketProblemsForApi(config);
    if (problems.length > 0) {
      log.error("startup failed: the evidence object store is not as AAB-PLATFORM-01 requires", { problems });
      await db.close();
      process.exitCode = 1;
      return;
    }
    objectStore = new S3ObjectStore(config);
  } catch (err) {
    log.error("startup failed: the evidence object store is not configured or unreachable", { err });
    await db.close();
    process.exitCode = 1;
    return;
  }

  const server = createApiServer({ routes: [
      ...evidenceObjectRoutes(objectStore),
      ...renditionRoutes(objectStore, { "SCS-CAP-08": CAP08_READER_ROLES }),
      ...capabilityRoutes(authenticator),
      ...cap08Routes(objectStore),
      ...keyRegistryRoutes(authenticator),
    ], authenticator, db });
  server.listen(port, () => log.info("scs-pilot-api listening", { port }));
  shutdownOn(server, db);
}

function shutdownOn(server: ReturnType<typeof createApiServer>, db: Database): void {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      server.close(() => {
        void db.close().finally(() => process.exit(0));
      });
    });
  }
}

void main();
