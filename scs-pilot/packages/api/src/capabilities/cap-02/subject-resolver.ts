// SCS-CAP-02's AAB-PLATFORM-04 SubjectResolver, for subjectType PARTY
// (contract, "Subject resolver"):
//   no party with this partyId              → NOT_FOUND
//   registrationStatus RETIRED              → NOT_CURRENT
//   REGISTERED, REQUIRES_HUMAN_REVIEW,
//   DISPUTED                                → CURRENT
// Any subject that is not (SCS, PARTY) is NOT_FOUND: SCS knows no other.
//
// It answers from the party's current record, read in the request's
// transaction. The pilot keeps no history of registrationStatus, so `at` can
// only be the time of the request itself.

import type { Tx } from "../../foundation/db.js";
import type { SubjectResolution, SubjectResolver } from "../../platform/actor-subject-links/links.js";
import type { SubjectKey } from "../../types/platform.js";
import { findPartyForLink } from "./link-store.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ScsPartyResolver implements SubjectResolver {
  constructor(private readonly tx: Tx) {}

  async resolve(subject: SubjectKey, _at: string): Promise<SubjectResolution> {
    if (subject.domain !== "SCS" || subject.subjectType !== "PARTY" || !UUID.test(subject.subjectId)) return "NOT_FOUND";
    const party = await findPartyForLink(this.tx, subject.subjectId);
    if (party === null) return "NOT_FOUND";
    return party.registrationStatus === "RETIRED" ? "NOT_CURRENT" : "CURRENT";
  }
}
