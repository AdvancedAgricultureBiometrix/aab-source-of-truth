// Reading an ActorReference (AAB-PLATFORM-03), whichever version it is.
//
// Records stored before version 2 keep version 1 references, unchanged, and
// are read for as long as they exist. Code never reads `roles`,
// `authorityBasis` or `issuer` directly: it asks these helpers, which apply
// the contract's reading rules to both versions.
//   * holdsRole        — does the actor hold a role, in a scope covering the act?
//   * holdsSubjectGrant — does the actor hold a role granted for one subject?
//   * sameActor        — do two references name the same actor?
//
// Platform code: nothing here knows any domain's subjects.

import type { ActorReference, ActorReferenceV2 } from "../types/shared.js";

/** A domain subject, named generically (AAB-PLATFORM-04). */
export interface SubjectRef {
  readonly domain: string;
  readonly subjectType: string;
  readonly subjectId: string;
}

export function isVersion2(actor: ActorReference): actor is ActorReferenceV2 {
  return (actor as { referenceVersion?: unknown }).referenceVersion === "2";
}

/** The scopeId of a SUBJECT grant: "<domain>:<subjectType>:<subjectId>". */
export function subjectScopeId(subject: SubjectRef): string {
  return `${subject.domain}:${subject.subjectType}:${subject.subjectId}`;
}

/**
 * Whether the actor holds `role` in a scope that covers the act.
 *
 * - Version 1: `roles` are grants with scopeType DEPLOYMENT, so any listed role covers the act.
 * - Version 2: a DEPLOYMENT grant covers every act in the deployment; a
 *   SUBJECT grant covers an act on that subject only, so it counts only when
 *   `subject` is given and matches.
 * - PLATFORM, COUNTRY, INSTITUTION and DOMAIN grants are not honoured yet:
 *   the pilot issues none, and how they cover an act is not defined. They
 *   fail closed.
 */
export function holdsRole(actor: ActorReference, role: string, subject?: SubjectRef): boolean {
  if (!isVersion2(actor)) return actor.roles.includes(role);
  const scopeId = subject === undefined ? undefined : subjectScopeId(subject);
  return actor.authorityBasis.some(
    (g) => g.role === role && (g.scopeType === "DEPLOYMENT" || (g.scopeType === "SUBJECT" && g.scopeId === scopeId)),
  );
}

/**
 * Whether the actor holds `role` granted for exactly this subject (scopeType
 * SUBJECT). A deployment-wide grant does not count: this is for roles that
 * must be designated per subject, such as a party's authority representative.
 * A version 1 reference has no subject grants.
 */
export function holdsSubjectGrant(actor: ActorReference, role: string, subject: SubjectRef): boolean {
  if (!isVersion2(actor)) return false;
  const scopeId = subjectScopeId(subject);
  return actor.authorityBasis.some((g) => g.role === role && g.scopeType === "SUBJECT" && g.scopeId === scopeId);
}

/**
 * Whether two references name the same actor.
 *
 * Both version 2: the same (issuer, actorId). Either version 1: the same
 * actorId, because a version 1 reference's issuer is the deployment's own and
 * is not recorded. TODO(multi-issuer-idempotency): once a second issuer acts
 * in a deployment, an actorId alone no longer identifies an actor, and the
 * version 1 comparison must be revisited with it.
 */
export function sameActor(a: ActorReference, b: ActorReference): boolean {
  if (a.actorId !== b.actorId) return false;
  if (!isVersion2(a) || !isVersion2(b)) return true;
  return a.issuer.issuerType === b.issuer.issuerType && a.issuer.countryCode === b.issuer.countryCode;
}
