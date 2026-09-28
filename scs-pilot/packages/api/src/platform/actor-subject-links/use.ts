// AAB-PLATFORM-04 section 3: the checks made whenever an act relies on a
// link, as the act's own transaction sees the actor's links to the subject.
// Failing closed at the first unmet check:
//
//   1. exactly one link applies — a link applies when it is ACTIVE or
//      SUSPENDED: it is the actor's current relationship with the subject.
//      A REVOKED, superseded or EXPIRED link has ended and applies to nothing.
//        · none with the act's relation, but one with the other relation
//          → LINK_RELATION_NOT_PERMITTED (check 3: the relation does not fit)
//        · none at all, but an ended one with the act's relation
//          → LINK_NOT_ACTIVE, naming its state
//        · none → LINK_NOT_FOUND
//        · more than one with the act's relation → LINK_AMBIGUOUS; none is chosen
//   2. the link is ACTIVE, and intact, and so is every status record against
//      it (AAB-PLATFORM-04, third amendment): each signature verified against
//      the key its statement names, as at the record's acceptance
//      (AAB-PLATFORM-09), each record its statement, each digest its content's
//      → LINK_NOT_ACTIVE; LINK_SIGNATURE_UNDER_REVIEW when a signature was
//      accepted inside a compromise window and is not yet assessed, and
//      nothing else fails; otherwise LINK_SIGNATURE_INVALID, naming each
//      verification result
//   4. the subject is current, as its domain's resolver answers now
//      → LINK_SUBJECT_NOT_CURRENT
//
// Platform code: the caller passes every link it holds for this actor and
// subject, and the resolver; nothing here reads a domain's tables.

import type { Verification } from "../key-registry/registry.js";
import type { ActorSubjectLink, ActorSubjectLinkActor, ActorSubjectLinkStatusRecord, SubjectKey } from "../../types/platform.js";
import { deriveLinkState, isIntact, linkIntegrity, statusRecordIntegrity, type IntegrityResult, type LinkHistory, type LinkRelation, type LinkState, type SubjectResolver } from "./links.js";

export type LinkUseFailureCode =
  | "LINK_NOT_FOUND"
  | "LINK_AMBIGUOUS"
  | "LINK_NOT_ACTIVE"
  | "LINK_SIGNATURE_INVALID"
  | "LINK_SIGNATURE_UNDER_REVIEW"
  | "LINK_RELATION_NOT_PERMITTED"
  | "LINK_SUBJECT_NOT_CURRENT";

export interface LinkUseInput {
  readonly actor: ActorSubjectLinkActor;
  readonly subject: SubjectKey;
  /** The relation the act requires: IS_SUBJECT to act as oneself, ACTS_FOR_SUBJECT to represent. */
  readonly relation: LinkRelation;
  /** Every link recorded for this actor and subject, in any state. Others are ignored. */
  readonly links: readonly (LinkHistory & { readonly link: ActorSubjectLink; readonly statusRecords: readonly ActorSubjectLinkStatusRecord[] })[];
  /** Verifies signatures as AAB-PLATFORM-09 requires (platform/key-registry/signed-records.ts, with the act's transaction). */
  readonly signatures: {
    link(link: ActorSubjectLink): Promise<Verification>;
    statusRecord(record: ActorSubjectLinkStatusRecord): Promise<Verification>;
  };
  readonly resolver: SubjectResolver;
  readonly at: Date;
}

export type LinkUseResult =
  | { readonly ok: true; readonly link: ActorSubjectLink; readonly reason: string }
  | { readonly ok: false; readonly code: LinkUseFailureCode; readonly reasons: readonly string[] };

const refuse = (code: LinkUseFailureCode, reason: string): LinkUseResult => ({ ok: false, code, reasons: [reason] });

const sameSubject = (a: SubjectKey, b: SubjectKey) => a.domain === b.domain && a.subjectType === b.subjectType && a.subjectId === b.subjectId;
const sameLinkActor = (a: ActorSubjectLinkActor, b: ActorSubjectLinkActor) =>
  a.actorId === b.actorId && a.issuer.issuerType === b.issuer.issuerType && a.issuer.countryCode === b.issuer.countryCode;

export async function checkLinkUse(input: LinkUseInput): Promise<LinkUseResult> {
  const { actor, subject, relation, at } = input;
  const who = `actor ${actor.actorId}`;
  const what = `${subject.domain} ${subject.subjectType} ${subject.subjectId}`;
  const mine = input.links
    .filter((l) => sameLinkActor(l.link.actor, actor) && sameSubject(l.link.subject, subject))
    .map((l) => ({ ...l, state: deriveLinkState(l, at) as LinkState }));

  // 1. Exactly one link applies
  const applying = mine.filter((l) => l.state === "ACTIVE" || l.state === "SUSPENDED");
  const withRelation = applying.filter((l) => l.link.relation === relation);
  if (withRelation.length > 1) {
    return refuse("LINK_AMBIGUOUS", `${who} holds ${withRelation.length} current ${relation} links to ${what} (${withRelation.map((l) => l.link.linkId).join(", ")}); none is chosen.`);
  }
  if (withRelation.length === 0) {
    const other = applying[0];
    if (other !== undefined) {
      return refuse("LINK_RELATION_NOT_PERMITTED", `${who}'s current link ${other.link.linkId} to ${what} is ${other.link.relation}; this act requires ${relation}.`);
    }
    const ended = mine.filter((l) => l.link.relation === relation).at(-1);
    if (ended !== undefined) return refuse("LINK_NOT_ACTIVE", `${who}'s ${relation} link ${ended.link.linkId} to ${what} is ${ended.state}.`);
    return refuse("LINK_NOT_FOUND", `${who} holds no ${relation} link to ${what}.`);
  }
  const l = withRelation[0]!;

  // 2. ACTIVE, and intact: the link and every status record against it
  if (l.state !== "ACTIVE") return refuse("LINK_NOT_ACTIVE", `${who}'s ${relation} link ${l.link.linkId} to ${what} is ${l.state}.`);
  const checked: Array<{ name: string; integrity: IntegrityResult; reason?: string }> = [];
  const linkSignature = await input.signatures.link(l.link);
  checked.push({ name: `link ${l.link.linkId}`, integrity: linkIntegrity(l.link, linkSignature.result), ...(linkSignature.reason === undefined ? {} : { reason: linkSignature.reason }) });
  for (const r of l.statusRecords) {
    const v = await input.signatures.statusRecord(r);
    checked.push({ name: `status record ${r.statusRecordId}`, integrity: statusRecordIntegrity(r, l.link, v.result), ...(v.reason === undefined ? {} : { reason: v.reason }) });
  }
  const failing = checked.filter((c) => !isIntact(c.integrity));
  if (failing.length > 0) {
    const describe = (c: (typeof checked)[number]) => [
      ...(c.integrity.signature === "VERIFIED" || c.integrity.signature === "AFFIRMED_AFTER_COMPROMISE" ? [] : [`its signature is ${c.integrity.signature}${c.reason === undefined ? "" : ` (${c.reason})`}`]),
      ...(c.integrity.statementIsRecord ? [] : ["its record differs from its signed statement"]),
      ...(c.integrity.digestMatches ? [] : ["its digest does not match its content"]),
    ].join("; ");
    const onlyReview = failing.every((c) => c.integrity.signature === "UNDER_COMPROMISE_REVIEW" && c.integrity.statementIsRecord && c.integrity.digestMatches);
    return {
      ok: false,
      code: onlyReview ? "LINK_SIGNATURE_UNDER_REVIEW" : "LINK_SIGNATURE_INVALID",
      reasons: failing.map((c) => onlyReview
        ? `${c.name} of ${who}'s ${relation} link to ${what} was accepted inside a compromise's exposure window and has not been assessed; it cannot be relied on until a person affirms it: ${describe(c)}.`
        : `${c.name} of ${who}'s ${relation} link to ${what} cannot be relied on: ${describe(c)}.`),
    };
  }

  // 4. The subject is current
  const resolution = await input.resolver.resolve(subject, at.toISOString());
  if (resolution !== "CURRENT") return refuse("LINK_SUBJECT_NOT_CURRENT", `${what} is ${resolution === "NOT_FOUND" ? "not found" : "not current"}; link ${l.link.linkId} to it cannot be used.`);

  return { ok: true, link: l.link, reason: `link ${l.link.linkId} (${relation}) is ACTIVE, its signature and digest verify, and ${what} is current` };
}
