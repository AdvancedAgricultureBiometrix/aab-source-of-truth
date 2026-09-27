// SCS-CAP-02 getActorPartyLink — GET /scs/v1/actor-party-links/:linkId.
//
// The link and its status records exactly as recorded, in recordedAt order,
// with currentState and supersededByLinkId derived now. Nothing is written.
// One REPEATABLE READ snapshot. Checks (SCS-CAP-02, "Who may read a link"):
//   1. reader — LINK_OFFICER or COMPLIANCE_OFFICER → LINK_READER_NOT_AUTHORISED (403)
//   2. link   — an unknown linkId → LINK_NOT_FOUND (404)
// The read does not verify signatures or digests: the use checks do, whenever
// a link is relied on.

import { holdsRole } from "../../foundation/actor.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import type { RouteContext } from "../../foundation/server.js";
import { deriveLinkState } from "../../platform/actor-subject-links/links.js";
import type { ScsActorPartyLink } from "../../types/cap-02.js";
import { LINK_OFFICER_ROLE } from "./create-link.js";
import { cap02Failure } from "./errors.js";
import { clockNow, findLink } from "./link-store.js";

export const LINK_READER_ROLES = [LINK_OFFICER_ROLE, "COMPLIANCE_OFFICER"] as const;

export async function getActorPartyLink(ctx: RouteContext<undefined>): Promise<OperationResult> {
  const tx = ctx.tx!;
  const actor = ctx.actor!;
  if (!LINK_READER_ROLES.some((r) => holdsRole(actor, r))) {
    throw cap02Failure("LINK_READER_NOT_AUTHORISED", [`Reading an actor–party link requires the ${LINK_READER_ROLES.join(" or ")} role; actor ${actor.actorId} holds neither.`]);
  }
  const linkId = ctx.params["linkId"]!.toLowerCase();
  const found = await findLink(tx, linkId);
  if (found === null) throw cap02Failure("LINK_NOT_FOUND", [`No actor–party link is recorded with linkId ${linkId}.`]);
  const body: ScsActorPartyLink = {
    link: found.link,
    statusRecords: [...found.statusRecords],
    currentState: deriveLinkState(found, await clockNow(tx)),
    ...(found.successor === undefined ? {} : { supersededByLinkId: found.successor.linkId }),
  };
  return { status: 200, body };
}
