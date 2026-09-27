// SCS-CAP-02 "Representative submission" (AAB-PLATFORM-03 section 3), shared
// by every SCS act that is a mandate action: identity evidence (SCS-CAP-02),
// deforestation evidence (SCS-CAP-04) and custody events (SCS-CAP-05).
//
//   submissionAuthority — who is submitting, and on what basis:
//     actingUnder given   → a representative act; needs PARTY_REPRESENTATIVE
//     actingUnder absent  → a direct act on the capability's own role; a
//                           PARTY_REPRESENTATIVE never acts directly
//   checkRepresentation — the eight checks, in the contract's order, each
//     failing closed with its own code, which the capability raises as its own:
//       1. role          PARTY_REPRESENTATIVE granted for the representative
//                        party itself (scopeType SUBJECT); a deployment-wide
//                        grant does not count (SCS-CAP-02, fifth amendment)
//                                               → REPRESENTATIVE_NOT_AUTHORISED
//       2. link          exactly one ACTIVE, intact ACTS_FOR_SUBJECT link to
//                        the representative party, which is current
//                        (AAB-PLATFORM-04 use checks) → LINK_*
//       3. parties       the mandate exists (MANDATE_NOT_FOUND); its
//                        representative is the linked party and its granting
//                        party one the act may be for → MANDATE_PARTIES_MISMATCH
//       4. current       NOT_REVOKED, and validFrom <= now < validUntil
//                        → MANDATE_NOT_CURRENT
//       5. action        permittedActions include the act's → MANDATE_ACTION_NOT_PERMITTED
//       6. scope         the act's framework, commodity and country within the
//                        mandate's → MANDATE_SCOPE_MISMATCH
//       7. relationship  an ACTIVE relationship between the two parties covers
//                        every framework the mandate names → MANDATE_RELATIONSHIP_NOT_ACTIVE
//       8. verified      the mandate's derived verification status is
//                        VERIFIED_FOR_DECLARED_SCOPE → MANDATE_NOT_VERIFIED
//
// Every check reads in the act's own transaction. The actor's links to the
// representative party, and the mandate's assessments, are locked for the
// rest of the transaction, so a suspension, supersession or new assessment
// cannot land between the check and the act.

import { holdsRole, holdsSubjectGrant, isVersion2, type SubjectRef } from "../../foundation/actor.js";
import type { SigningKeyDirectory } from "../../foundation/auth.js";
import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import { ScsFailure, type CapabilityId } from "../../foundation/errors.js";
import { checkLinkUse, type LinkUseFailureCode } from "../../platform/actor-subject-links/use.js";
import type { ScsActingUnder, ScsRepresentationChecks } from "../../types/cap-02.js";
import type { ActorReference, ActorReferenceV2 } from "../../types/shared.js";
import { clockNow, findLinksForActorParty, lockActorParty } from "../cap-02/link-store.js";
import { findMandateAssessments, lockMandateVerification } from "../cap-02/mandate-verification-store.js";
import { deriveMandateVerificationStatus } from "../cap-02/mandate-verification-status.js";
import { findCoveringRelationship } from "../cap-02/store.js";
import { ScsPartyResolver } from "../cap-02/subject-resolver.js";

/** The role a representative act requires (AAB-PLATFORM-03 section 3). TODO(role-registry). */
export const REPRESENTATIVE_ROLE = "PARTY_REPRESENTATIVE";

export type RepresentationFailureCode =
  | LinkUseFailureCode
  | "REPRESENTATIVE_NOT_AUTHORISED"
  | "MANDATE_NOT_FOUND"
  | "MANDATE_PARTIES_MISMATCH"
  | "MANDATE_NOT_CURRENT"
  | "MANDATE_ACTION_NOT_PERMITTED"
  | "MANDATE_SCOPE_MISMATCH"
  | "MANDATE_RELATIONSHIP_NOT_ACTIVE"
  | "MANDATE_NOT_VERIFIED";

/** A refused representative act: the capability raises `code` as its own failure. */
export class RepresentationRefused extends Error {
  constructor(readonly code: RepresentationFailureCode, readonly reasons: readonly string[]) {
    super(`${code}: ${reasons.join(" ")}`);
  }
}

export type MandateAction = "SUBMIT_IDENTITY_EVIDENCE" | "SUBMIT_DEFORESTATION_EVIDENCE" | "SUBMIT_CUSTODY_EVIDENCE";

// ── Who is submitting ────────────────────────────────────────────────────────

export type SubmissionAuthority =
  | { readonly kind: "DIRECT" }
  | { readonly kind: "REPRESENTATIVE"; readonly actingUnder: ScsActingUnder }
  | { readonly kind: "REFUSED_REPRESENTATIVE"; readonly reasons: readonly string[] }
  | { readonly kind: "REFUSED_DIRECT" };

/** Whether the actor holds PARTY_REPRESENTATIVE in any scope: used only to word a refusal, never to authorise. */
function isRepresentativeAnywhere(actor: ActorReference): boolean {
  return isVersion2(actor) ? actor.authorityBasis.some((g) => g.role === REPRESENTATIVE_ROLE) : actor.roles.includes(REPRESENTATIVE_ROLE);
}

/**
 * The basis of a submission. `actingUnder` makes it a representative act,
 * whatever other roles the actor holds (SCS-CAP-02, fifth amendment: a
 * deliberate departure from the literal "a COMPLIANCE_OFFICER sending
 * actingUnder is refused"); without it, only the capability's direct role
 * counts. A PARTY_REPRESENTATIVE without actingUnder, and anyone without
 * PARTY_REPRESENTATIVE for the named party sending it, are refused as
 * representatives; anyone else is refused by the capability's own
 * direct-authority failure.
 */
export function submissionAuthority(actor: ActorReference, directRole: string, actingUnder: ScsActingUnder | undefined): SubmissionAuthority {
  if (actingUnder !== undefined) {
    if (holdsSubjectGrant(actor, REPRESENTATIVE_ROLE, { domain: "SCS", subjectType: "PARTY", subjectId: actingUnder.representativePartyId })) {
      return { kind: "REPRESENTATIVE", actingUnder };
    }
    return {
      kind: "REFUSED_REPRESENTATIVE",
      reasons: [
        `actingUnder names a mandate, so this is a representative submission, which requires the ${REPRESENTATIVE_ROLE} role granted for party ${actingUnder.representativePartyId} (scopeType SUBJECT); actor ${actor.actorId} does not hold it.${holdsRole(actor, directRole) ? ` A ${directRole} submits directly, without actingUnder.` : ""}`,
      ],
    };
  }
  if (holdsRole(actor, directRole)) return { kind: "DIRECT" };
  if (isRepresentativeAnywhere(actor)) {
    return { kind: "REFUSED_REPRESENTATIVE", reasons: [`A ${REPRESENTATIVE_ROLE} submits only under a mandate, named in actingUnder; actor ${actor.actorId} named none, and does not hold ${directRole}.`] };
  }
  return { kind: "REFUSED_DIRECT" };
}

// ── The eight checks ─────────────────────────────────────────────────────────

export interface RepresentedAct {
  readonly action: MandateAction;
  /** The parties the act may be for; the mandate's granting party must be one of them. */
  readonly forParties: readonly string[];
  /** How those parties are described in a refusal, e.g. "the source party". */
  readonly forDescription: string;
  /** What must be within the mandate's scope. Absent framework or commodity: not tied to one. */
  readonly scope: { readonly frameworkId?: string; readonly commodityCode?: string; readonly countryCode: string | null; readonly countryDescription: string };
}

export interface Representation {
  readonly checks: ScsRepresentationChecks;
  /** The actor's reference for this act, carrying `representation`. */
  readonly reference: ActorReferenceV2;
  readonly reasons: readonly string[];
  readonly grantingPartyId: string;
  readonly linkId: string;
}

interface MandateRow {
  mandate_id: string;
  granting_party_id: string;
  representative_party_id: string;
  permitted_actions: string[];
  framework_association_ids: string[];
  commodity_scope: string[];
  geographic_scope: string[];
  valid_from: Date;
  valid_until: Date;
  revocation_status: string;
}

/** Runs `fn`, raising any SCS-CAP-02 database failure as the acting capability's own. */
async function asCapability<T>(capabilityId: CapabilityId, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ScsFailure && err.capabilityId !== capabilityId) {
      throw new ScsFailure({ capabilityId, code: err.code, reasons: err.reasons, httpStatus: err.httpStatus });
    }
    throw err;
  }
}

export async function checkRepresentation(
  capabilityId: CapabilityId,
  tx: Tx,
  keys: SigningKeyDirectory,
  actor: ActorReference,
  actingUnder: ScsActingUnder,
  act: RepresentedAct,
): Promise<Representation> {
  return asCapability(capabilityId, async () => {
    const refuse = (code: RepresentationFailureCode, ...reasons: string[]): never => {
      throw new RepresentationRefused(code, reasons);
    };
    const repParty = actingUnder.representativePartyId;
    const mandateId = actingUnder.mandateId;
    const subject: SubjectRef = { domain: "SCS", subjectType: "PARTY", subjectId: repParty };

    // 1. Role, granted for the representative party itself
    if (!holdsSubjectGrant(actor, REPRESENTATIVE_ROLE, subject)) {
      refuse("REPRESENTATIVE_NOT_AUTHORISED", `A representative submission requires the ${REPRESENTATIVE_ROLE} role granted for party ${repParty} (scopeType SUBJECT); actor ${actor.actorId} does not hold it.`);
    }
    if (!isVersion2(actor)) refuse("REPRESENTATIVE_NOT_AUTHORISED", `Actor ${actor.actorId} has no version 2 ActorReference, so holds no link.`);
    const me = actor as ActorReferenceV2;
    const linkActor = { issuer: { ...me.issuer }, actorId: me.actorId };

    // Lock the actor's links to the representative party, and the mandate's assessments, for the rest of the act
    await lockActorParty(tx, linkActor, repParty);
    await lockMandateVerification(tx, mandateId);
    const now = await clockNow(tx);

    // 2. The link
    const use = await checkLinkUse({
      actor: linkActor,
      subject,
      relation: "ACTS_FOR_SUBJECT",
      links: await findLinksForActorParty(tx, linkActor, repParty),
      signingKeyOf: (createdBy) => keys.signingKeyOf(createdBy),
      resolver: new ScsPartyResolver(tx),
      at: now,
    });
    if (!use.ok) refuse(use.code, ...use.reasons);
    const link = (use as Extract<typeof use, { ok: true }>).link;

    // 3. The mandate and its parties
    const { rows } = await withDatabaseErrors(capabilityId, () =>
      tx.query<MandateRow>(
        `SELECT mandate_id, granting_party_id, representative_party_id, permitted_actions, framework_association_ids,
                commodity_scope, geographic_scope, valid_from, valid_until, revocation_status
           FROM scs.representation_mandate WHERE mandate_id = $1::uuid`,
        [mandateId],
      ),
    );
    const m = rows[0] ?? refuse("MANDATE_NOT_FOUND", `/actingUnder/mandateId: no SCS-CAP-02 mandate is registered with mandateId ${mandateId}.`);
    const mismatch = [
      ...(m.representative_party_id === repParty ? [] : [`Mandate ${mandateId}'s representative is party ${m.representative_party_id}, not the linked party ${repParty}.`]),
      ...(act.forParties.includes(m.granting_party_id) ? [] : [`Mandate ${mandateId} is granted by party ${m.granting_party_id}, which is not ${act.forDescription} (${act.forParties.join(", ") || "none"}).`]),
    ];
    if (mismatch.length > 0) refuse("MANDATE_PARTIES_MISMATCH", ...mismatch);

    // 4. Current
    if (m.revocation_status !== "NOT_REVOKED") refuse("MANDATE_NOT_CURRENT", `Mandate ${mandateId} is ${m.revocation_status}.`);
    if (now < m.valid_from || now >= m.valid_until) {
      refuse("MANDATE_NOT_CURRENT", `The act (${now.toISOString()}) is outside mandate ${mandateId}'s validity (${m.valid_from.toISOString()} to ${m.valid_until.toISOString()}).`);
    }

    // 5. The action
    if (!m.permitted_actions.includes(act.action)) refuse("MANDATE_ACTION_NOT_PERMITTED", `Mandate ${mandateId} permits ${m.permitted_actions.join(", ")}; not ${act.action}.`);

    // 6. Scope
    const s = act.scope;
    const outside = [
      ...(s.frameworkId === undefined || m.framework_association_ids.includes(s.frameworkId) ? [] : [`framework ${s.frameworkId} is not among the mandate's frameworkAssociationIds (${m.framework_association_ids.join(", ")})`]),
      ...(s.commodityCode === undefined || m.commodity_scope.includes(s.commodityCode) ? [] : [`commodity ${s.commodityCode} is not within its commodityScope (${m.commodity_scope.join(", ")})`]),
      ...(s.countryCode !== null && m.geographic_scope.includes(s.countryCode) ? [] : [`${s.countryDescription} (${s.countryCode ?? "unknown"}) is not within its geographicScope (${m.geographic_scope.join(", ")})`]),
    ];
    if (outside.length > 0) refuse("MANDATE_SCOPE_MISMATCH", `The act is outside mandate ${mandateId}'s scope: ${outside.join("; ")}.`);

    // 7. The relationship
    const relationship = await findCoveringRelationship(tx, m.granting_party_id, m.representative_party_id, m.framework_association_ids);
    if (relationship === null) {
      refuse("MANDATE_RELATIONSHIP_NOT_ACTIVE", `No ACTIVE relationship between party ${m.granting_party_id} and party ${m.representative_party_id} covers every framework mandate ${mandateId} names.`);
    }

    // 8. Verified
    const verification = deriveMandateVerificationStatus(await findMandateAssessments(tx, mandateId), now);
    if (verification.status !== "VERIFIED_FOR_DECLARED_SCOPE") {
      refuse("MANDATE_NOT_VERIFIED", `Mandate ${mandateId}'s verification status is ${verification.status}; a representative act needs VERIFIED_FOR_DECLARED_SCOPE. A lesser status is refused, never accepted as a limitation.`);
    }

    const scopeText = [s.frameworkId === undefined ? null : `framework ${s.frameworkId}`, s.commodityCode === undefined ? null : `commodity ${s.commodityCode}`, `${s.countryDescription} ${s.countryCode}`]
      .filter((x) => x !== null).join(", ");
    return {
      checks: {
        representativeRoleHeld: true,
        activeLinkToRepresentativeParty: true,
        mandatePartiesMatch: true,
        mandateCurrent: true,
        actionPermitted: true,
        withinMandateScope: true,
        relationshipActive: true,
        mandateVerified: true,
      },
      reference: {
        ...me,
        representation: {
          domain: "SCS",
          subjectType: "PARTY",
          subjectId: repParty,
          actorLinkId: link.linkId,
          basis: { basisType: "MANDATE", basisId: mandateId, onBehalfOfSubjectId: m.granting_party_id },
        },
      },
      reasons: [
        `representation.representativeRoleHeld: evaluated — actor ${actor.actorId} holds ${REPRESENTATIVE_ROLE} granted for party ${repParty}. Pilot limitation: the grant is operator configuration (the actors file), not a signed, evidenced act.`,
        `representation.activeLinkToRepresentativeParty: evaluated — ${use.ok ? use.reason : ""}.`,
        `representation.mandatePartiesMatch: evaluated — mandate ${mandateId} is from party ${m.granting_party_id}, ${act.forDescription}, to the linked party ${repParty}.`,
        `representation.mandateCurrent: evaluated — NOT_REVOKED, and the act is within ${m.valid_from.toISOString()} to ${m.valid_until.toISOString()}.`,
        `representation.actionPermitted: evaluated — the mandate permits ${act.action}.`,
        `representation.withinMandateScope: evaluated — ${scopeText} within the mandate's scope.`,
        `representation.relationshipActive: evaluated — relationship ${relationship} between the two parties is ACTIVE and covers the mandate's frameworks.`,
        `representation.mandateVerified: evaluated — the mandate's verification status is VERIFIED_FOR_DECLARED_SCOPE (assessment ${verification.assessmentId}).`,
        `Submitted by actor ${actor.actorId} as a representative of party ${repParty}, for party ${m.granting_party_id}, under mandate ${mandateId}, relying on link ${link.linkId}. The mandate's authority boundary applies: it does not permit approving the granting party, altering its identity, legal declarations without explicit authority, or reuse outside its declared scope.`,
      ],
      grantingPartyId: m.granting_party_id,
      linkId: link.linkId,
    };
  });
}
