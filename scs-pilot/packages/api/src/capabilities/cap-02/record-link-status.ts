// SCS-CAP-02 recordActorPartyLinkStatus —
// POST /scs/v1/actor-party-links/:linkId/status-records.
//
// Before this runs, the server layer has authenticated the actor, validated
// linkId and the body (actor-party-link-status-request.schema.json), checked
// the Idempotency-Key and opened the transaction.
//
// Order (AAB-PLATFORM-04 section 4, "The status rules"; SCS-CAP-02, "Who may
// suspend a link" and "Link endpoints: rules this contract adds"):
//   1. link      — exists → LINK_NOT_FOUND (404)
//      lock      — every link write for the linked actor and party is
//                  serialised from here; the link's history is read again
//   2. writer    — never the linked actor; LINK_OFFICER (CREATING_ROLE) for any
//                  action; for SUSPEND only, the party's authorised
//                  representative (SUBJECT_AUTHORITY):
//                    NATURAL_PERSON party: an ACTIVE, intact IS_SUBJECT link to it
//                    any other party: PARTY_AUTHORITY_REPRESENTATIVE granted for
//                    the party (scopeType SUBJECT), and an ACTIVE, intact
//                    ACTS_FOR_SUBJECT link to it
//                  → LINK_STATUS_WRITER_NOT_AUTHORISED (403)
//   3. state     — SUSPEND needs ACTIVE, REINSTATE SUSPENDED, REVOKE not REVOKED
//                  → LINK_STATUS_NOT_PERMITTED (409)
//   4. statement — names this link and its linkDigest, and the writer; the
//                  writer is HUMAN with an accountable name and signed it with
//                  their key → LINK_SIGNATURE_INVALID (422)
//   5. insert    — recordedAt strictly after the link's previous record;
//                  recordDigest over the whole record
//   6. receipt   — ACTOR_PARTY_LINK_STATUS, same transaction; 201

import { randomUUID } from "node:crypto";

import { holdsRole, holdsSubjectGrant, type SubjectRef } from "../../foundation/actor.js";
import type { ActorDirectory } from "../../foundation/auth.js";
import type { Tx } from "../../foundation/db.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { verifyStatementSignature } from "../../foundation/signatures.js";
import {
  actionPossible,
  deriveLinkState,
  isIntact,
  isStatementActor,
  linkIntegrity,
  stateAfter,
  statusRecordDigestOf,
  type LinkRelation,
} from "../../platform/actor-subject-links/links.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsActorPartyLinkStatusDecision,
  ScsActorPartyLinkStatusEligibilityChecks,
  ScsActorPartyLinkStatusReceipt,
  ScsActorPartyLinkStatusRequest,
  ScsActorPartyLinkStatusResponse,
} from "../../types/cap-02.js";
import type { ActorSubjectLinkActor, ActorSubjectLinkStatusRecord } from "../../types/platform.js";
import type { ActorReference, ActorReferenceV2 } from "../../types/shared.js";
import { LINK_OFFICER_ROLE } from "./create-link.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import { clockNow, findLink, findLinksForActorParty, findPartyForLink, insertStatusRecord, lockActorParty } from "./link-store.js";

/** SCS's subject authority role (SCS-CAP-02, "Who may suspend a link"). TODO(role-registry). */
export const PARTY_AUTHORITY_ROLE = "PARTY_AUTHORITY_REPRESENTATIVE";

/** The (issuer, actorId) of an authenticated actor, as a link names it. */
function asLinkActor(actor: ActorReferenceV2): ActorSubjectLinkActor {
  return { issuer: { ...actor.issuer }, actorId: actor.actorId };
}

/** The writer's own ACTIVE link to the party with this relation, whose signature and digest verify; or the reason there is none. */
async function writerOwnLink(tx: Tx, directory: ActorDirectory, writer: ActorReference, partyId: string, relation: LinkRelation, at: Date): Promise<{ linkId: string } | { problem: string }> {
  if (!("issuer" in writer)) return { problem: `actor ${writer.actorId} has no version 2 reference, so holds no link` };
  const links = await findLinksForActorParty(tx, asLinkActor(writer as ActorReferenceV2), partyId);
  const own = links.filter((l) => l.link.relation === relation && deriveLinkState(l, at) === "ACTIVE");
  if (own.length === 0) return { problem: `actor ${writer.actorId} holds no ACTIVE ${relation} link to party ${partyId}` };
  if (own.length > 1) return { problem: `actor ${writer.actorId} holds ${own.length} ACTIVE ${relation} links to party ${partyId}; none is chosen` };
  const l = own[0]!;
  if (!isIntact(linkIntegrity(l.link, directory.signingKeyOf(l.link.createdBy)))) {
    return { problem: `actor ${writer.actorId}'s ${relation} link ${l.link.linkId} to party ${partyId} does not verify (signature, statement or digest), so it is not a link` };
  }
  return { linkId: l.link.linkId };
}

export function recordActorPartyLinkStatus(directory: ActorDirectory) {
  return async (ctx: RouteContext<ScsActorPartyLinkStatusRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const actor = ctx.actor!;
    const linkId = ctx.params["linkId"]!.toLowerCase();
    const statement = ctx.body.statusStatement;
    const action = statement.action;

    // 1. The link exists; then lock its actor and party, and read its history again
    const found = await findLink(tx, linkId);
    if (found === null) throw cap02Failure("LINK_NOT_FOUND", [`No actor–party link is recorded with linkId ${linkId}.`]);
    const partyId = found.link.subject.subjectId;
    await lockActorParty(tx, found.link.actor, partyId);
    const current = (await findLink(tx, linkId))!;
    const now = await clockNow(tx);
    const subject: SubjectRef = { domain: "SCS", subjectType: "PARTY", subjectId: partyId };

    // 2. Who may write this record
    if (isStatementActor(actor, current.link.actor)) {
      throw cap02Failure("LINK_STATUS_WRITER_NOT_AUTHORISED", [`Actor ${actor.actorId} is the linked actor, and never writes a status record about their own link.`]);
    }
    let writerCapacity: ActorSubjectLinkStatusRecord["writerCapacity"];
    let capacityReason: string;
    if (holdsRole(actor, LINK_OFFICER_ROLE, subject)) {
      writerCapacity = "CREATING_ROLE";
      capacityReason = `actor ${actor.actorId} holds ${LINK_OFFICER_ROLE} in a scope covering party ${partyId}, which may write any status record`;
    } else if (action !== "SUSPEND") {
      throw cap02Failure("LINK_STATUS_WRITER_NOT_AUTHORISED", [`${action} requires the ${LINK_OFFICER_ROLE} role; the party's representative may only suspend a link. Actor ${actor.actorId} does not hold ${LINK_OFFICER_ROLE}.`]);
    } else {
      const party = (await findPartyForLink(tx, partyId))!;
      const person = party.partyType === "NATURAL_PERSON";
      const problems: string[] = [];
      if (!person && !holdsSubjectGrant(actor, PARTY_AUTHORITY_ROLE, subject)) {
        problems.push(`actor ${actor.actorId} does not hold ${PARTY_AUTHORITY_ROLE} granted for party ${partyId} (scopeType SUBJECT)`);
      }
      const own = await writerOwnLink(tx, directory, actor, partyId, person ? "IS_SUBJECT" : "ACTS_FOR_SUBJECT", now);
      if ("problem" in own) problems.push(own.problem);
      if (problems.length > 0) {
        throw cap02Failure("LINK_STATUS_WRITER_NOT_AUTHORISED", [
          `Suspending a link to ${person ? "a NATURAL_PERSON party requires the person's own ACTIVE IS_SUBJECT link" : `party ${partyId} requires ${PARTY_AUTHORITY_ROLE} for it and an ACTIVE ACTS_FOR_SUBJECT link to it`}, or the ${LINK_OFFICER_ROLE} role.`,
          ...problems.map((p) => `Not met: ${p}.`),
        ]);
      }
      writerCapacity = "SUBJECT_AUTHORITY";
      capacityReason = person
        ? `actor ${actor.actorId} is the party itself, holding ACTIVE IS_SUBJECT link ${"linkId" in own ? own.linkId : ""}`
        : `actor ${actor.actorId} holds ${PARTY_AUTHORITY_ROLE} for party ${partyId} and ACTIVE ACTS_FOR_SUBJECT link ${"linkId" in own ? own.linkId : ""}. Pilot limitation: the ${PARTY_AUTHORITY_ROLE} designation is operator configuration (the actors file), not a signed, evidenced act`;
    }

    // 3. The action is possible from the link's state now
    const state = deriveLinkState(current, now);
    if (!actionPossible(action, state)) {
      const needs = action === "SUSPEND" ? "an ACTIVE link" : action === "REINSTATE" ? "a SUSPENDED link" : "a link that is not already REVOKED";
      throw cap02Failure("LINK_STATUS_NOT_PERMITTED", [`Link ${linkId} is ${state}; ${action} needs ${needs}.`]);
    }

    // 4. The statement binds this link and this writer, who signed it
    const accountableName = directory.accountableNameOf(actor);
    const key = directory.signingKeyOf(actor);
    const problem =
      statement.linkId !== linkId ? `The statement names link ${statement.linkId}, not link ${linkId}.`
      : statement.linkDigest !== current.link.linkDigest ? `The statement names linkDigest ${statement.linkDigest}; link ${linkId}'s is ${current.link.linkDigest}.`
      : !isStatementActor(actor, statement.writer) ? `The statement's writer (${statement.writer.actorId}) is not the authenticated actor (${actor.actorId}).`
      : actor.actorType !== "HUMAN" ? `A status record is signed by a named human: actor ${actor.actorId} is a ${actor.actorType}.`
      : accountableName === null ? `A status record is signed by a named human: no accountable name is recorded for actor ${actor.actorId}.`
      : key === null ? `No signing key is registered for actor ${actor.actorId}.`
      : !verifyStatementSignature(statement, ctx.body.statementSignature, key) ? `The statement signature does not verify against actor ${actor.actorId}'s registered key.`
      : null;
    if (problem !== null) throw cap02Failure("LINK_SIGNATURE_INVALID", [problem]);

    // 5. The record, strictly after the link's previous record
    const previous = current.statusRecords.at(-1);
    const recordedAt = new Date(Math.max(now.getTime(), previous === undefined ? 0 : Date.parse(previous.recordedAt) + 1));
    const writtenBy: ActorReferenceV2 = { ...(actor as ActorReferenceV2), accountableName: accountableName! };
    const unsigned: Omit<ActorSubjectLinkStatusRecord, "recordDigest"> = {
      statusRecordId: randomUUID(),
      linkId,
      schemaVersion: "1",
      statusStatement: statement,
      statementSignature: ctx.body.statementSignature,
      writerCapacity,
      recordedAt: recordedAt.toISOString(),
      writtenBy,
    };
    const record: ActorSubjectLinkStatusRecord = { ...unsigned, recordDigest: statusRecordDigestOf(unsigned) };
    await insertStatusRecord(tx, record);
    const resultingState = stateAfter(action, current, recordedAt);

    const eligibilityChecks: ScsActorPartyLinkStatusEligibilityChecks = {
      linkExists: true,
      writerPermittedForAction: true,
      actionPossibleFromCurrentState: true,
      statementBindsCurrentLink: true,
      statementSignatureVerified: true,
    };
    const decision: ScsActorPartyLinkStatusDecision = {
      decisionId: randomUUID(),
      statusRecordId: record.statusRecordId,
      linkId,
      action,
      decision: "RECORDED",
      writerCapacity,
      eligibilityChecks,
      resultingState,
      recordDigest: record.recordDigest,
      decisionReasons: [
        `linkExists: evaluated — link ${linkId} (${current.link.relation}, actor ${current.link.actor.actorId}, party ${partyId}).`,
        `writerPermittedForAction: evaluated — ${writerCapacity}: ${capacityReason}. The writer is not the linked actor.`,
        `actionPossibleFromCurrentState: evaluated — the link was ${state}; ${action} is possible from ${state}.`,
        `statementBindsCurrentLink: evaluated — the statement names link ${linkId}, its linkDigest ${current.link.linkDigest}, and the writer.`,
        `statementSignatureVerified: evaluated — signed by ${actor.actorId} (${accountableName}), verified against their registered Ed25519 key.`,
        `The link is ${resultingState} after this record. Past acts that relied on the link are unchanged.`,
      ],
      decidedBy: writtenBy,
      decidedAt: record.recordedAt,
    };

    // 6. Receipt — same transaction
    const written = await writeReceipt<ScsActorPartyLinkStatusReceipt, typeof CAPABILITY_ID, ScsActorPartyLinkStatusDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "ACTOR_PARTY_LINK_STATUS",
      subjectId: record.statusRecordId,
      decision,
      issuedFor: actor,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.cap02ActorPartyLinkStatusReceipt,
    });

    const body: ScsActorPartyLinkStatusResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
