// A mandate's current verification status, derived when read and never
// stored (SCS-CAP-02, "Mandate verification", as made exact by the fourth
// amendment of 2026-09-27). The mandate record's own
// verificationStatus keeps its starting value, CLAIMED_UNVERIFIED, forever.
//
//   * An assessment that another assessment supersedes no longer counts.
//   * No assessment left: CLAIMED_UNVERIFIED.
//   * Otherwise the most recently recorded one decides: its status, or
//     VERIFICATION_EXPIRED once its expiresAt has passed.
//
// Several assessments may stand unsuperseded, for example two verifiers
// assessing independently. The latest recorded decides, so the newest
// finding is never hidden by an older one; a verifier who means to replace
// an assessment supersedes it.

export interface MandateAssessmentSummary {
  readonly assessmentId: string;
  readonly verificationStatus: string;
  readonly expiresAt: string | null;
  readonly recordedAt: string;
  readonly supersedesAssessmentId: string | null;
}

export interface MandateVerificationStatus {
  readonly status: string;
  /** The assessment the status comes from; null for CLAIMED_UNVERIFIED. */
  readonly assessmentId: string | null;
}

export function deriveMandateVerificationStatus(assessments: readonly MandateAssessmentSummary[], at: Date): MandateVerificationStatus {
  const recorded = assessments.filter((a) => Date.parse(a.recordedAt) <= at.getTime());
  const superseded = new Set(recorded.map((a) => a.supersedesAssessmentId).filter((id): id is string => id !== null));
  const standing = recorded
    .filter((a) => !superseded.has(a.assessmentId))
    .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt) || a.assessmentId.localeCompare(b.assessmentId));
  const current = standing.at(-1);
  if (current === undefined) return { status: "CLAIMED_UNVERIFIED", assessmentId: null };
  const expired = current.expiresAt !== null && Date.parse(current.expiresAt) <= at.getTime();
  return { status: expired ? "VERIFICATION_EXPIRED" : current.verificationStatus, assessmentId: current.assessmentId };
}
