// AAB-PLATFORM-04 Actor–Subject Link: what the platform defines, for every
// domain that stores links.
//
//   * digests      — linkDigest and recordDigest: "sha256:" over the canonical
//                    JSON of every other field of the record
//   * integrity    — a record's statement signature, verified against the key
//                    its statement names as at the record's acceptance
//                    (AAB-PLATFORM-09; platform/key-registry/signed-records.ts),
//                    may be relied on; its statement is the record's own; and
//                    its digest matches its content
//   * state        — ACTIVE, SUSPENDED, REVOKED or EXPIRED, derived when read,
//                    never stored
//   * SubjectResolver — the one interface a domain implements to say whether
//                    a subject exists and is current
//
// Platform code: subjects are the generic (domain, subjectType, subjectId).
// Nothing here imports a domain's types or reads a domain's tables (section 5,
// "Direction"). Domains store the records and call these functions.

import { isVersion2 } from "../../foundation/actor.js";
import { canonicalJson } from "../../foundation/canonical.js";
import { recordDigest } from "../../foundation/signatures.js";
import { mayBeReliedOn, type VerificationResult } from "../key-registry/registry.js";
import type { ActorSubjectLink, ActorSubjectLinkActor, ActorSubjectLinkStatusRecord, SubjectKey } from "../../types/platform.js";
import type { ActorReference } from "../../types/shared.js";

export type LinkState = "ACTIVE" | "SUSPENDED" | "REVOKED" | "EXPIRED";
export type LinkRelation = ActorSubjectLink["relation"];
export type StatusAction = ActorSubjectLinkStatusRecord["statusStatement"]["action"];

// ── Subject resolver (section 5) ─────────────────────────────────────────────

export type SubjectResolution = "CURRENT" | "NOT_CURRENT" | "NOT_FOUND";

/** Implemented by each domain that stores links: is this subject known, and current at this time? */
export interface SubjectResolver {
  resolve(subject: SubjectKey, at: string): Promise<SubjectResolution>;
}

// ── Digests ──────────────────────────────────────────────────────────────────

/** linkDigest: over every field of the link but linkDigest itself. */
export function linkDigestOf(link: Omit<ActorSubjectLink, "linkDigest">): string {
  const { linkDigest: _ignored, ...rest } = link as ActorSubjectLink;
  return recordDigest(rest);
}

/** recordDigest: over every field of the status record but recordDigest itself. */
export function statusRecordDigestOf(record: Omit<ActorSubjectLinkStatusRecord, "recordDigest">): string {
  const { recordDigest: _ignored, ...rest } = record as ActorSubjectLinkStatusRecord;
  return recordDigest(rest);
}

// ── Integrity ────────────────────────────────────────────────────────────────

/**
 * Whether an ActorReference is the actor a statement names: the same
 * (issuer, actorId). A version 1 reference records no issuer, so it is
 * compared by actorId alone, as sameActor does (foundation/actor.ts).
 */
export function isStatementActor(reference: ActorReference, named: ActorSubjectLinkActor): boolean {
  if (reference.actorId !== named.actorId) return false;
  if (!isVersion2(reference)) return true;
  return reference.issuer.issuerType === named.issuer.issuerType && reference.issuer.countryCode === named.issuer.countryCode;
}

export interface IntegrityResult {
  /** The statement signature's verification, against the key the statement names, as at the record's acceptance (AAB-PLATFORM-09 section 7). */
  readonly signature: VerificationResult;
  /** The record's fields are its statement's, and the statement names the recorded signer. */
  readonly statementIsRecord: boolean;
  /** The digest recomputes from the record's content. */
  readonly digestMatches: boolean;
}

/** Intact: a signature that may be relied on (VERIFIED or AFFIRMED_AFTER_COMPROMISE), the statement the record's own, the digest its content's. */
export const isIntact = (r: IntegrityResult): boolean => mayBeReliedOn(r.signature) && r.statementIsRecord && r.digestMatches;

/**
 * A link's integrity (section 1, "What is signed"): the creator's signature
 * over the statement, the record taking its fields from the statement, and
 * linkDigest over the whole record. `signature` is the creator's signature
 * verified as AAB-PLATFORM-09 requires: against the key the statement names,
 * as at the link's createdAt (verifyLinkSignature in
 * platform/key-registry/signed-records.ts).
 */
export function linkIntegrity(link: ActorSubjectLink, signature: VerificationResult): IntegrityResult {
  const s = link.linkStatement;
  const same = (a: unknown, b: unknown) => canonicalJson(a ?? null) === canonicalJson(b ?? null);
  return {
    signature,
    statementIsRecord:
      same(s.actor, link.actor) && same(s.subject, link.subject) && s.relation === link.relation
      && s.validFrom === link.validFrom && s.validUntil === link.validUntil
      && same(s.authorisationEvidence, link.authorisationEvidence) && s.supersedesLinkId === link.supersedesLinkId
      && isStatementActor(link.createdBy, s.creator),
    digestMatches: linkDigestOf(link) === link.linkDigest,
  };
}

/** A status record's integrity: the writer's signature, the statement binding the link and the recorded writer, and recordDigest. */
export function statusRecordIntegrity(record: ActorSubjectLinkStatusRecord, link: ActorSubjectLink, signature: VerificationResult): IntegrityResult {
  const s = record.statusStatement;
  return {
    signature,
    statementIsRecord: s.linkId === record.linkId && record.linkId === link.linkId && s.linkDigest === link.linkDigest && isStatementActor(record.writtenBy, s.writer),
    digestMatches: statusRecordDigestOf(record) === record.recordDigest,
  };
}

// ── State, derived when read (section 1, "States"; section 4) ───────────────

export interface LinkHistory {
  readonly link: Pick<ActorSubjectLink, "linkId" | "validFrom" | "validUntil">;
  /** Every status record against the link. */
  readonly statusRecords: readonly Pick<ActorSubjectLinkStatusRecord, "recordedAt" | "statusStatement">[];
  /** The link that supersedes this one, if any, and when it was recorded. */
  readonly successor?: { readonly linkId: string; readonly createdAt: string };
}

/**
 * The link's state at `at`. Only records and a successor recorded by `at`
 * count, so a past state can be derived as well as the current one.
 *   1. REVOKED  — a REVOKE record, or a successor recorded (permanent)
 *   2. EXPIRED  — `at` is at or after validUntil (the validity period is
 *                 [validFrom, validUntil)); no grace period
 *   3. SUSPENDED — the latest SUSPEND or REINSTATE record is a SUSPEND
 *   4. ACTIVE   — otherwise
 * A link is never recorded before its validity starts (SCS-CAP-02, third
 * amendment), so `at` before validFrom is not one of the four states: it is
 * refused, never guessed.
 */
export function deriveLinkState(history: LinkHistory, at: Date): LinkState {
  const t = at.getTime();
  if (t < Date.parse(history.link.validFrom)) {
    throw new Error(`deriveLinkState: link ${history.link.linkId} is not yet valid at ${at.toISOString()}; no state applies`);
  }
  const records = [...history.statusRecords]
    .filter((r) => Date.parse(r.recordedAt) <= t)
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt));
  if (records.some((r) => r.statusStatement.action === "REVOKE")) return "REVOKED";
  if (history.successor !== undefined && Date.parse(history.successor.createdAt) <= t) return "REVOKED";
  if (t >= Date.parse(history.link.validUntil)) return "EXPIRED";
  const last = records.filter((r) => r.statusStatement.action !== "REVOKE").at(-1);
  return last?.statusStatement.action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
}

/** Whether `action` is possible from `state` (section 4, the status rules). */
export function actionPossible(action: StatusAction, state: LinkState): boolean {
  switch (action) {
    case "SUSPEND":
      return state === "ACTIVE";
    case "REINSTATE":
      return state === "SUSPENDED";
    case "REVOKE":
      return state !== "REVOKED";
  }
}

/** The state a link is in just after a status record with `action` (the action having been possible). */
export function stateAfter(action: StatusAction, history: LinkHistory, at: Date): LinkState {
  return deriveLinkState({ ...history, statusRecords: [...history.statusRecords, { recordedAt: at.toISOString(), statusStatement: { action } as ActorSubjectLinkStatusRecord["statusStatement"] }] }, at);
}
