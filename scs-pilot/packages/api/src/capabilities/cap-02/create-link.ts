// SCS-CAP-02 createActorPartyLink — POST /scs/v1/actor-party-links.
//
// Before this runs, the server layer has authenticated the actor, validated
// the body against actor-party-link-request.schema.json (a statement for an
// SCS PARTY, at least one evidence object, a well-formed signature), checked
// the Idempotency-Key and opened the transaction. Everything below runs in
// that one transaction.
//
// Order (AAB-PLATFORM-04 section 2, with SCS-CAP-02's additions,
// "Actor–party links" and "Link endpoints: rules this contract adds"):
//   1. creator role   — LINK_OFFICER, in a scope covering the party
//                       → LINK_CREATOR_NOT_AUTHORISED (403)
//   2. not self       — the statement's actor is not the creator
//                       → LINK_SELF_ASSERTED (403)
//      lock           — every link write for this actor and party is
//                       serialised from here; the clock is read after it
//   3. party          — the resolver answers CURRENT
//                       → LINK_SUBJECT_NOT_FOUND / LINK_SUBJECT_NOT_CURRENT (422);
//                       the relation fits the party's type
//                       → LINK_RELATION_NOT_PERMITTED (422)
//   4. evidence       — each object cited once, and each stored in AAB-PLATFORM-01
//                       → LINK_EVIDENCE_MISSING (422)
//   5. validity       — validUntil after validFrom, within 12 months; valid
//                       when recorded → LINK_VALIDITY_INVALID (400)
//      independence   — the creator verified no mandate whose representative
//                       is the party → LINK_CREATOR_NOT_AUTHORISED (403)
//      supersession   — a link for the same actor and party, ACTIVE
//                       → LINK_NOT_FOUND (404) / LINK_NOT_ACTIVE (422)
//   6. one link       — no other ACTIVE or SUSPENDED link of the same relation
//                       → LINK_ALREADY_ACTIVE (409)
//   7. signature      — the creator is HUMAN with an accountable name, is the
//                       statement's creator, and signed it with their key
//                       → LINK_SIGNATURE_INVALID (422)
//   8. insert         — linkDigest over the whole record; the link and its evidence rows
//   9. receipt        — ACTOR_PARTY_LINK_CREATION, same transaction; 201

import { randomUUID } from "node:crypto";

import { holdsRole, sameActor } from "../../foundation/actor.js";
import type { ActorDirectory } from "../../foundation/auth.js";
import { platformFailure } from "../../foundation/errors.js";
import type { OperationResult } from "../../foundation/idempotency.js";
import { writeReceipt } from "../../foundation/receipts.js";
import type { RouteContext } from "../../foundation/server.js";
import { verifyStatementSignature } from "../../foundation/signatures.js";
import { deriveLinkState, isStatementActor, linkDigestOf } from "../../platform/actor-subject-links/links.js";
import { SCHEMAS } from "../../schemas/registry.js";
import type {
  ScsActorPartyLinkDecision,
  ScsActorPartyLinkEligibilityChecks,
  ScsActorPartyLinkReceipt,
  ScsActorPartyLinkRequest,
  ScsActorPartyLinkResponse,
} from "../../types/cap-02.js";
import type { ActorSubjectLink } from "../../types/platform.js";
import type { ActorReferenceV2 } from "../../types/shared.js";
import { CAPABILITY_ID, cap02Failure } from "./errors.js";
import {
  clockNow,
  findLinksForActorParty,
  findMandateVerifiersOfRepresentative,
  findPartyForLink,
  findStoredObjects,
  insertLink,
  lockActorParty,
  withinTwelveMonths,
} from "./link-store.js";
import { ScsPartyResolver } from "./subject-resolver.js";

/** SCS's creating role (SCS-CAP-02, "Creating role"). TODO(role-registry). */
export const LINK_OFFICER_ROLE = "LINK_OFFICER";

/** The relation each party type takes (SCS-CAP-02, "Subject type"). */
export const relationForPartyType = (partyType: string) => (partyType === "NATURAL_PERSON" ? "IS_SUBJECT" : "ACTS_FOR_SUBJECT");

export function createActorPartyLink(directory: ActorDirectory) {
  return async (ctx: RouteContext<ScsActorPartyLinkRequest>): Promise<OperationResult> => {
    const tx = ctx.tx!;
    const actor = ctx.actor!;
    const statement = ctx.body.linkStatement;
    const partyId = statement.subject.subjectId.toLowerCase();
    const subject = { domain: "SCS", subjectType: "PARTY", subjectId: partyId };
    const linked = statement.actor;

    // 1. Creator role, in a scope covering the party
    if (!holdsRole(actor, LINK_OFFICER_ROLE, subject)) {
      throw cap02Failure("LINK_CREATOR_NOT_AUTHORISED", [`Creating an actor–party link requires the ${LINK_OFFICER_ROLE} role for party ${partyId}; actor ${actor.actorId} does not hold it.`]);
    }

    // 2. Never self-asserted
    if (isStatementActor(actor, linked)) {
      throw cap02Failure("LINK_SELF_ASSERTED", [`Actor ${actor.actorId} cannot create a link for themselves; a link is never self-asserted.`]);
    }

    await lockActorParty(tx, linked, partyId);
    const now = await clockNow(tx);

    // 3. The party exists, is current, and takes this relation
    const resolution = await new ScsPartyResolver(tx).resolve(subject, now.toISOString());
    if (resolution === "NOT_FOUND") throw cap02Failure("LINK_SUBJECT_NOT_FOUND", [`/linkStatement/subject/subjectId: no party is registered with partyId ${partyId}.`]);
    if (resolution === "NOT_CURRENT") throw cap02Failure("LINK_SUBJECT_NOT_CURRENT", [`Party ${partyId} is RETIRED; a link cannot be created to it.`]);
    const party = (await findPartyForLink(tx, partyId))!;
    if (relationForPartyType(party.partyType) !== statement.relation) {
      throw cap02Failure("LINK_RELATION_NOT_PERMITTED", [
        `Party ${partyId} is a ${party.partyType}: it takes ${relationForPartyType(party.partyType)} links only, not ${statement.relation}.`,
      ]);
    }

    // 4. Evidence: each object once, each stored
    const cited = statement.authorisationEvidence.map((e) => e.evidenceObjectSha256);
    const twice = [...new Set(cited.filter((sha, i) => cited.indexOf(sha) !== i))];
    if (twice.length > 0) {
      throw platformFailure("REQUEST_VALIDATION_FAILED", twice.map((sha) => `/linkStatement/authorisationEvidence: evidence object ${sha} is cited more than once.`));
    }
    const stored = await findStoredObjects(tx, cited);
    const missing = cited.filter((sha) => !stored.has(sha));
    if (missing.length > 0) {
      throw cap02Failure("LINK_EVIDENCE_MISSING", missing.map((sha) => `/linkStatement/authorisationEvidence: no stored object has SHA-256 ${sha}; upload it first (POST /scs/v1/evidence-objects).`));
    }

    // 5. Validity: ordered, at most 12 months, valid when recorded
    const from = Date.parse(statement.validFrom);
    const until = Date.parse(statement.validUntil);
    if (until <= from) throw cap02Failure("LINK_VALIDITY_INVALID", [`validUntil (${statement.validUntil}) must be after validFrom (${statement.validFrom}).`]);
    if (!(await withinTwelveMonths(tx, statement.validFrom, statement.validUntil))) {
      throw cap02Failure("LINK_VALIDITY_INVALID", [`A link to a CAP-02 party is valid for at most 12 months; ${statement.validFrom} to ${statement.validUntil} is longer.`]);
    }
    if (from > now.getTime()) throw cap02Failure("LINK_VALIDITY_INVALID", [`validFrom (${statement.validFrom}) is after the link would be recorded (${now.toISOString()}); a link is valid when it is recorded.`]);
    if (until <= now.getTime()) throw cap02Failure("LINK_VALIDITY_INVALID", [`validUntil (${statement.validUntil}) has already passed (${now.toISOString()}); a link is valid when it is recorded.`]);

    // Independence from mandate verification (SCS-CAP-02, "Creating role")
    const verified = (await findMandateVerifiersOfRepresentative(tx, partyId)).filter((v) => sameActor(v.recordedBy, actor));
    if (verified.length > 0) {
      throw cap02Failure("LINK_CREATOR_NOT_AUTHORISED", verified.map((v) => `Actor ${actor.actorId} recorded verification assessment ${v.assessmentId} of mandate ${v.mandateId}, whose representative is party ${partyId}, and cannot also create a link to that party (separation of duties).`));
    }

    // Supersession, then 6. at most one ACTIVE (or SUSPENDED) link per relation
    const existing = await findLinksForActorParty(tx, linked, partyId);
    const supersedes = statement.supersedesLinkId?.toLowerCase();
    if (supersedes !== undefined) {
      const predecessor = existing.find((l) => l.link.linkId === supersedes);
      if (predecessor === undefined) {
        throw cap02Failure("LINK_NOT_FOUND", [`/linkStatement/supersedesLinkId: no link ${supersedes} is recorded for actor ${linked.actorId} and party ${partyId}.`]);
      }
      const state = deriveLinkState(predecessor, now);
      if (state !== "ACTIVE") {
        throw cap02Failure("LINK_NOT_ACTIVE", [
          `Link ${supersedes} is ${state}; only an ACTIVE link is superseded. ${state === "SUSPENDED" ? "Reinstate or revoke it first." : "Create a new link without supersedesLinkId."}`,
        ]);
      }
    }
    const blocking = existing.filter((l) => l.link.linkId !== supersedes && l.link.relation === statement.relation).map((l) => ({ id: l.link.linkId, state: deriveLinkState(l, now) }))
      .filter((l) => l.state === "ACTIVE" || l.state === "SUSPENDED");
    if (blocking.length > 0) {
      throw cap02Failure("LINK_ALREADY_ACTIVE", blocking.map((l) => l.state === "ACTIVE"
        ? `Link ${l.id} is ACTIVE for actor ${linked.actorId}, party ${partyId} and ${statement.relation}; supersede it (supersedesLinkId) instead.`
        : `Link ${l.id} for actor ${linked.actorId}, party ${partyId} and ${statement.relation} is SUSPENDED; reinstate or revoke it first, so that two links can never be ACTIVE.`));
    }

    // 7. The creator is a named human who signed this statement
    const accountableName = directory.accountableNameOf(actor);
    const key = directory.signingKeyOf(actor);
    const signatureProblem =
      actor.actorType !== "HUMAN" ? `Link creation is a governance decision: actor ${actor.actorId} is a ${actor.actorType}, not a HUMAN.`
      : accountableName === null ? `Link creation is a governance decision: no accountable name is recorded for actor ${actor.actorId}.`
      : !isStatementActor(actor, statement.creator) ? `The statement's creator (${statement.creator.actorId}) is not the authenticated actor (${actor.actorId}).`
      : key === null ? `No signing key is registered for actor ${actor.actorId}.`
      : !verifyStatementSignature(statement, ctx.body.statementSignature, key) ? `The statement signature does not verify against actor ${actor.actorId}'s registered key.`
      : null;
    if (signatureProblem !== null) throw cap02Failure("LINK_SIGNATURE_INVALID", [signatureProblem]);

    // 8. The record: its fields are the statement's; linkDigest over all of it
    const createdBy: ActorReferenceV2 = { ...(actor as ActorReferenceV2), accountableName: accountableName! };
    const unsigned: Omit<ActorSubjectLink, "linkDigest"> = {
      linkId: randomUUID(),
      schemaVersion: "1",
      actor: statement.actor,
      subject: statement.subject,
      relation: statement.relation,
      validFrom: statement.validFrom,
      validUntil: statement.validUntil,
      authorisationEvidence: statement.authorisationEvidence,
      ...(statement.supersedesLinkId === undefined ? {} : { supersedesLinkId: statement.supersedesLinkId }),
      createdAt: now.toISOString(),
      createdBy,
      linkStatement: statement,
      statementSignature: ctx.body.statementSignature,
    };
    const link: ActorSubjectLink = { ...unsigned, linkDigest: linkDigestOf(unsigned) };
    await insertLink(tx, link);

    const eligibilityChecks: ScsActorPartyLinkEligibilityChecks = {
      creatorAuthorised: true,
      notSelfAsserted: true,
      partyCurrent: true,
      relationFitsPartyType: true,
      evidenceStored: true,
      validityWithinMaximum: true,
      noOverlappingActiveLink: true,
      creatorIndependentOfMandateVerification: true,
      statementSignatureVerified: true,
    };
    const decision: ScsActorPartyLinkDecision = {
      decisionId: randomUUID(),
      linkId: link.linkId,
      partyId,
      decision: "CREATED",
      eligibilityChecks,
      linkDigest: link.linkDigest,
      decisionReasons: [
        `creatorAuthorised: evaluated — actor ${actor.actorId} holds ${LINK_OFFICER_ROLE} in a scope covering party ${partyId}.`,
        `notSelfAsserted: evaluated — the linked actor ${linked.actorId} is not the creator.`,
        `partyCurrent: evaluated — the subject resolver answered CURRENT (registrationStatus ${party.registrationStatus}).`,
        `relationFitsPartyType: evaluated — ${statement.relation} for a ${party.partyType} party.`,
        `evidenceStored: evaluated — all ${cited.length} authorisation evidence object(s) are stored in AAB-PLATFORM-01. Their content was not examined: what they show is the creator's judgement, which the signature records.`,
        `validityWithinMaximum: evaluated — ${statement.validFrom} to ${statement.validUntil}: within 12 months, and valid when recorded.`,
        supersedes === undefined
          ? `noOverlappingActiveLink: evaluated — no other ACTIVE or SUSPENDED ${statement.relation} link for this actor and party.`
          : `noOverlappingActiveLink: evaluated — supersedes ACTIVE link ${supersedes}, which is REVOKED from now; no other ACTIVE or SUSPENDED ${statement.relation} link for this actor and party.`,
        `creatorIndependentOfMandateVerification: evaluated — actor ${actor.actorId} recorded no verification assessment of a mandate whose representative is party ${partyId}.`,
        `statementSignatureVerified: evaluated — the statement is signed by its creator, ${actor.actorId} (${accountableName}), and verifies against their registered Ed25519 key.`,
        `Pilot limitation: the creator's role and signing key are operator configuration (the actors file), not signed, evidenced or receipted grants.`,
      ],
      decidedBy: createdBy,
      decidedAt: link.createdAt,
    };

    // 9. Receipt — same transaction; any failure rolls back the link too
    const written = await writeReceipt<ScsActorPartyLinkReceipt, typeof CAPABILITY_ID, ScsActorPartyLinkDecision>(tx, {
      capabilityId: CAPABILITY_ID,
      decisionType: "ACTOR_PARTY_LINK_CREATION",
      subjectId: link.linkId,
      decision,
      issuedFor: actor,
      requestDigest: ctx.requestDigest,
      idempotencyKey: ctx.idempotencyKey,
      schema: SCHEMAS.cap02ActorPartyLinkReceipt,
    });

    const body: ScsActorPartyLinkResponse = { decision, receipt: written.receipt, receiptDigest: written.receiptDigest };
    return { status: 201, body };
  };
}
