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
//   2. the link is ACTIVE, and intact (its creator's signature, its record
//      being its statement, its digest) → LINK_NOT_ACTIVE / LINK_SIGNATURE_INVALID
//   4. the subject is current, as its domain's resolver answers now
//      → LINK_SUBJECT_NOT_CURRENT
//
// Platform code: the caller passes every link it holds for this actor and
// subject, and the resolver; nothing here reads a domain's tables.

import type { KeyObject } from "node:crypto";

import type { ActorSubjectLink, ActorSubjectLinkActor, SubjectKey } from "../../types/platform.js";
import type { ActorReference } from "../../types/shared.js";
import { deriveLinkState, isIntact, linkIntegrity, type LinkHistory, type LinkRelation, type LinkState, type SubjectResolver } from "./links.js";

export type LinkUseFailureCode =
  | "LINK_NOT_FOUND"
  | "LINK_AMBIGUOUS"
  | "LINK_NOT_ACTIVE"
  | "LINK_SIGNATURE_INVALID"
  | "LINK_RELATION_NOT_PERMITTED"
  | "LINK_SUBJECT_NOT_CURRENT";

export interface LinkUseInput {
  readonly actor: ActorSubjectLinkActor;
  readonly subject: SubjectKey;
  /** The relation the act requires: IS_SUBJECT to act as oneself, ACTS_FOR_SUBJECT to represent. */
  readonly relation: LinkRelation;
  /** Every link recorded for this actor and subject, in any state. Others are ignored. */
  readonly links: readonly (LinkHistory & { readonly link: ActorSubjectLink })[];
  readonly signingKeyOf: (createdBy: ActorReference) => KeyObject | null;
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

  // 2. ACTIVE, and intact
  if (l.state !== "ACTIVE") return refuse("LINK_NOT_ACTIVE", `${who}'s ${relation} link ${l.link.linkId} to ${what} is ${l.state}.`);
  const integrity = linkIntegrity(l.link, input.signingKeyOf(l.link.createdBy));
  if (!isIntact(integrity)) {
    const failed = [
      ...(integrity.signatureVerified ? [] : ["its statement signature does not verify against its creator's registered key"]),
      ...(integrity.statementIsRecord ? [] : ["its record differs from its signed statement"]),
      ...(integrity.digestMatches ? [] : ["its linkDigest does not match its content"]),
    ];
    return refuse("LINK_SIGNATURE_INVALID", `Link ${l.link.linkId} is not a link: ${failed.join("; ")}.`);
  }

  // 4. The subject is current
  const resolution = await input.resolver.resolve(subject, at.toISOString());
  if (resolution !== "CURRENT") return refuse("LINK_SUBJECT_NOT_CURRENT", `${what} is ${resolution === "NOT_FOUND" ? "not found" : "not current"}; link ${l.link.linkId} to it cannot be used.`);

  return { ok: true, link: l.link, reason: `link ${l.link.linkId} (${relation}) is ACTIVE, its signature and digest verify, and ${what} is current` };
}
