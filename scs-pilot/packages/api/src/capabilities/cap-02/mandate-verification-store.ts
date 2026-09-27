// SCS-CAP-02 mandate verification: every SQL statement
// addMandateVerificationAssessment runs (migration 022:
// scs.mandate_verification_assessment). All functions take the request's
// transaction.

import type { Tx } from "../../foundation/db.js";
import { withDatabaseErrors } from "../../foundation/db-errors.js";
import type { ActorSubjectLinkActor } from "../../types/platform.js";
import type { ScsMandateVerificationAssessmentRequest } from "../../types/cap-02.js";
import type { ActorReference } from "../../types/shared.js";
import { CAPABILITY_ID } from "./errors.js";
import type { MandateAssessmentSummary } from "./mandate-verification-status.js";

const db = <T>(fn: () => Promise<T>) => withDatabaseErrors(CAPABILITY_ID, fn);

/** Serialise verification assessments of one mandate until the transaction ends: supersession and the derived status cannot race. */
export async function lockMandateVerification(tx: Tx, mandateId: string): Promise<void> {
  const lockName = ["scs-cap-02-mandate-verification", mandateId].join("\u001f");
  await db(() => tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [lockName]));
}

export interface MandateForVerification {
  readonly mandateId: string;
  readonly grantingPartyId: string;
  readonly representativePartyId: string;
  readonly validUntil: Date;
  readonly revocationStatus: string;
  readonly mandateEvidenceIds: readonly string[];
  readonly createdBy: ActorReference;
}

export async function findMandateForVerification(tx: Tx, mandateId: string): Promise<MandateForVerification | null> {
  const { rows } = await db(() =>
    tx.query<{ mandate_id: string; granting_party_id: string; representative_party_id: string; valid_until: Date; revocation_status: string; mandate_evidence_ids: string[]; created_by: ActorReference }>(
      `SELECT mandate_id, granting_party_id, representative_party_id, valid_until, revocation_status, mandate_evidence_ids, created_by
         FROM scs.representation_mandate WHERE mandate_id = $1::uuid`,
      [mandateId],
    ),
  );
  const r = rows[0];
  return r === undefined ? null : {
    mandateId: r.mandate_id, grantingPartyId: r.granting_party_id, representativePartyId: r.representative_party_id,
    validUntil: r.valid_until, revocationStatus: r.revocation_status, mandateEvidenceIds: r.mandate_evidence_ids, createdBy: r.created_by,
  };
}

/** Every link, in any state, whose linked actor is `actorId` and whose party is one of `partyIds`. */
export async function findLinksHeldBy(tx: Tx, actorId: string, partyIds: readonly string[]): Promise<Array<{ linkId: string; partyId: string; actor: ActorSubjectLinkActor }>> {
  const { rows } = await db(() =>
    tx.query<{ link_id: string; party_id: string; actor: ActorSubjectLinkActor }>(
      `SELECT link_id, party_id, link_statement -> 'actor' AS actor FROM scs.actor_party_link
        WHERE actor_id = $1 AND party_id = ANY($2::uuid[]) ORDER BY created_at, link_id`,
      [actorId, partyIds],
    ),
  );
  return rows.map((r) => ({ linkId: r.link_id, partyId: r.party_id, actor: r.actor }));
}

/** Every link to `partyId`, in any state, with who created it. */
export async function findLinkCreators(tx: Tx, partyId: string): Promise<Array<{ linkId: string; createdBy: ActorReference }>> {
  const { rows } = await db(() =>
    tx.query<{ link_id: string; created_by: ActorReference }>(
      `SELECT link_id, created_by FROM scs.actor_party_link WHERE party_id = $1::uuid ORDER BY created_at, link_id`,
      [partyId],
    ),
  );
  return rows.map((r) => ({ linkId: r.link_id, createdBy: r.created_by }));
}

/** Every verification assessment of the mandate, oldest first. */
export async function findMandateAssessments(tx: Tx, mandateId: string): Promise<MandateAssessmentSummary[]> {
  const { rows } = await db(() =>
    tx.query<{ assessment_id: string; verification_status: string; expires_at: Date | null; recorded_at: Date; supersedes_assessment_id: string | null }>(
      `SELECT assessment_id, verification_status, expires_at, recorded_at, supersedes_assessment_id
         FROM scs.mandate_verification_assessment WHERE mandate_id = $1::uuid ORDER BY recorded_at, assessment_id`,
      [mandateId],
    ),
  );
  return rows.map((r) => ({
    assessmentId: r.assessment_id,
    verificationStatus: r.verification_status,
    expiresAt: r.expires_at?.toISOString() ?? null,
    recordedAt: r.recorded_at.toISOString(),
    supersedesAssessmentId: r.supersedes_assessment_id,
  }));
}

export interface NewMandateAssessment {
  readonly mandateId: string;
  readonly request: ScsMandateVerificationAssessmentRequest;
  readonly recordedBy: ActorReference;
  readonly recordedAt: Date;
}

/**
 * Insert the ScsMandateVerificationAssessment; every authorityBoundary flag
 * true (column defaults, checked by the database). The database generates
 * assessmentId, and refuses evidence outside the mandate's and an expiry
 * after its validUntil (migration 022). Nothing else is touched: not the
 * mandate, not the superseded assessment.
 */
export async function insertMandateAssessment(tx: Tx, n: NewMandateAssessment): Promise<string> {
  const r = n.request;
  const { rows } = await db(() =>
    tx.query<{ assessment_id: string }>(
      `INSERT INTO scs.mandate_verification_assessment (
         mandate_id, schema_version, verification_status,
         scope_description, scope_verified_attributes, scope_excluded_from_verification,
         verifying_authority_id, verifying_authority_name, verifying_authority_basis, verifying_authority_jurisdiction_code,
         verified_at, expires_at, evidence_ids, limitations, recorded_by, recorded_at, supersedes_assessment_id
       ) VALUES ($1, '1', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING assessment_id`,
      [
        n.mandateId, r.verificationStatus,
        r.verificationScope.scopeDescription, r.verificationScope.verifiedAttributes, r.verificationScope.excludedFromVerification,
        r.verifyingAuthority.authorityId, r.verifyingAuthority.authorityName, r.verifyingAuthority.authorityBasis, r.verifyingAuthority.jurisdictionCode,
        r.verifiedAt, r.expiresAt ?? null, r.evidenceIds, r.limitations, JSON.stringify(n.recordedBy), n.recordedAt, r.supersedesAssessmentId ?? null,
      ],
    ),
  );
  return rows[0]!.assessment_id;
}
