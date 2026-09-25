// SCS-CAP-08 routes. The server layer enforces, for every write route:
// authentication, schema validation, a mandatory Idempotency-Key and one
// transaction around the handler (foundation/server.ts).
//
// requestCompilation runs in one REPEATABLE READ transaction, so the gate, the
// decision's currency and every record packaged are read in one snapshot. It
// needs the object store (to re-hash cited files and store the rendition), so
// its routes are built with it, like the evidence object routes, and are not
// in CAPABILITY_ROUTES. getPackage and verifyPackageIntegrity are not built
// yet.

import type { Route } from "../../foundation/server.js";
import type { ObjectStore } from "../../platform/evidence-objects/object-store.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsPackageCompilationSubmission } from "../../types/cap-08.js";
import { CAPABILITY_ID } from "./errors.js";
import { requestCompilation } from "./request-compilation.js";

export function cap08Routes(objectStore: ObjectStore): readonly Route<never>[] {
  const requestCompilationRoute: Route<ScsPackageCompilationSubmission> = {
    method: "POST",
    path: "/scs/v1/due-diligence-packages",
    capabilityId: CAPABILITY_ID,
    auth: "required",
    transactional: true,
    isolation: "repeatable read",
    idempotency: "required",
    requestSchema: SCHEMAS.cap08PackageCompilationRequest,
    handle: requestCompilation(objectStore),
  };
  return [requestCompilationRoute as unknown as Route<never>];
}
