// AAB-PLATFORM-09 Governed Public-Key Registry routes, under /aab/v1/ (the
// naming rule: new platform routes take AAB names). Built with the
// directory, which supplies this deployment's issuer, its actors and their
// accountable names. The same routes serve a country's registry and the
// control plane's (AAB-PLATFORM-09, second amendment: one implementation, two
// deployments).

import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { KeyBootstrapRequest, KeyChallengeRequest, KeyEventRequest, KeyRegistrationRequest } from "../../types/key-registry.js";
import { bootstrapRegistry } from "./bootstrap.js";
import { issueChallenge } from "./challenge.js";
import type { RegistryDirectory } from "./common.js";
import { CAPABILITY_ID } from "./errors.js";
import { recordKeyEvent } from "./events.js";
import { readKey } from "./read.js";
import { registerKey } from "./register.js";

export function keyRegistryRoutes(directory: RegistryDirectory): readonly Route<never>[] {
  const write = { capabilityId: CAPABILITY_ID, auth: "required", transactional: true, idempotency: "required" } as const;
  const bootstrap: Route<KeyBootstrapRequest> = {
    ...write, method: "POST", path: "/aab/v1/key-bootstrap-ceremonies", requestSchema: SCHEMAS.platformKeyBootstrapRequest, handle: bootstrapRegistry(directory),
  };
  const challenge: Route<KeyChallengeRequest> = {
    ...write, method: "POST", path: "/aab/v1/key-registration-challenges", requestSchema: SCHEMAS.platformKeyChallengeRequest, handle: issueChallenge(directory),
  };
  const register: Route<KeyRegistrationRequest> = {
    ...write, method: "POST", path: "/aab/v1/signing-keys", requestSchema: SCHEMAS.platformKeyRegistrationRequest, handle: registerKey(directory),
  };
  const event: Route<KeyEventRequest> = {
    ...write, method: "POST", path: "/aab/v1/signing-keys/:keyId/events", requestSchema: SCHEMAS.platformKeyEventRequest,
    paramsSchema: SCHEMAS.platformKeyParams, handle: recordKeyEvent(directory),
  };
  const read: Route<undefined> = {
    method: "GET", path: "/aab/v1/signing-keys/:keyId", capabilityId: CAPABILITY_ID, auth: "required", transactional: true,
    isolation: "repeatable read", idempotency: "none", paramsSchema: SCHEMAS.platformKeyParams, handle: readKey,
  };
  return [bootstrap, challenge, register, event, read] as unknown as readonly Route<never>[];
}
