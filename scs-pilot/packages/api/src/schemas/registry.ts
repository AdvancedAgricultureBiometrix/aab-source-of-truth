// Every JSON Schema the API validates against, registered with the validator
// by $id so schemas can $ref one another (e.g. the CAP-01 receipt references
// the shared ActorReference). Importing this module registers them all.
//
// Imported as JSON modules so the TypeScript build copies them into dist.
// The matching TypeScript types in src/types/ are generated from these same
// files (npm run generate:types) — never hand-written.

import actorReference from "./shared/actor-reference.schema.json" with { type: "json" };
import cap01FrameworkRegistrationRequest from "./cap-01/framework-registration-request.schema.json" with { type: "json" };
import cap01FrameworkRegistrationReceipt from "./cap-01/framework-registration-receipt.schema.json" with { type: "json" };

import { registerSchema, type JsonSchema } from "../foundation/validation.js";

export const SCHEMAS = {
  actorReference,
  cap01FrameworkRegistrationRequest,
  cap01FrameworkRegistrationReceipt,
} as const satisfies Record<string, JsonSchema>;

for (const schema of Object.values(SCHEMAS)) registerSchema(schema);
