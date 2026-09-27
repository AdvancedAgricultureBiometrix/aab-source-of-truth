// SCS-CAP-02 actor–party link routes (AAB-PLATFORM-04; SCS-CAP-02 amendments
// of 2026-09-27). Built with the ActorDirectory, which supplies the accountable
// name and signing key a governance decision needs; only these routes are
// given it. Built in index.ts, as SCS-CAP-08's routes are with the object store.

import type { ActorDirectory } from "../../foundation/auth.js";
import type { Route } from "../../foundation/server.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type { ScsActorPartyLinkRequest, ScsActorPartyLinkStatusRequest } from "../../types/cap-02.js";
import { createActorPartyLink } from "./create-link.js";
import { CAPABILITY_ID } from "./errors.js";
import { getActorPartyLink } from "./get-link.js";
import { recordActorPartyLinkStatus } from "./record-link-status.js";

export function cap02LinkRoutes(directory: ActorDirectory): readonly Route<never>[] {
  const create: Route<ScsActorPartyLinkRequest> = {
    method: "POST",
    path: "/scs/v1/actor-party-links",
    capabilityId: CAPABILITY_ID,
    auth: "required",
    transactional: true,
    idempotency: "required",
    requestSchema: SCHEMAS.cap02ActorPartyLinkRequest,
    handle: createActorPartyLink(directory),
  };
  const status: Route<ScsActorPartyLinkStatusRequest> = {
    method: "POST",
    path: "/scs/v1/actor-party-links/:linkId/status-records",
    capabilityId: CAPABILITY_ID,
    auth: "required",
    transactional: true,
    idempotency: "required",
    requestSchema: SCHEMAS.cap02ActorPartyLinkStatusRequest,
    paramsSchema: SCHEMAS.cap02ActorPartyLinkParams,
    handle: recordActorPartyLinkStatus(directory),
  };
  const read: Route<undefined> = {
    method: "GET",
    path: "/scs/v1/actor-party-links/:linkId",
    capabilityId: CAPABILITY_ID,
    auth: "required",
    transactional: true,
    isolation: "repeatable read",
    idempotency: "none",
    paramsSchema: SCHEMAS.cap02ActorPartyLinkParams,
    handle: getActorPartyLink,
  };
  return [create, status, read] as unknown as readonly Route<never>[];
}
