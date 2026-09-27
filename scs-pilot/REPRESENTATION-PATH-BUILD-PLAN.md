# Representation path — build plan

**Status:** BUILD PLAN — DECISIONS RECORDED 2026-09-27 — ALL SEVEN PRS BUILT — HISTORICAL RECORD
**Builds:** AAB-PLATFORM-03 (ActorReference version 2), AAB-PLATFORM-04 (actor–subject links), and the SCS-CAP-02, SCS-CAP-04 and SCS-CAP-05 amendments of 2026-09-27 (links, mandate verification, representative submission), in the SCS pilot.
**Order:** contract gaps first, then migrations, then endpoints (each with its own tests, as always), then the end-to-end proof. One PR per step, each with CI passing, each reviewed before the next begins.

## What exists today

- **The pilot's actors.** Actors come from the static actors file. Each has `actorId`, `actorType`, unscoped `roles`, an optional `organizationId` and `authenticationMethod`: ActorReference version 1. Capabilities check `actor.roles.includes(ROLE)`. Independence rules compare `actorId`, including in SQL (`registered_by ->> 'actorId'`).
- **Mandates.** CAP-02 registers mandates (migration 008). Their `verificationStatus` is stored at its starting value, `CLAIMED_UNVERIFIED`, and nothing can change it.
- **Representation.** CAP-05 checks a cited mandate and records `MANDATE_NOT_VALID` as a limitation; a mandate never authorises. CAP-02 and CAP-04 accept no representation at all.
- **Nothing exists** for links, signatures, mandate verification, `LINK_OFFICER` or `PARTY_REPRESENTATIVE`.
- **Patterns to reuse:**
  - append-only tables with triggers, as in migration 010 (party verification assessments);
  - advisory locks serialising writes on one subject, as in CAP-09 `submitDecision`;
  - a receipt in the same transaction as every decision;
  - migrations applied by the runner, with no hard-coded migration count anywhere.

## Step 0 — Contract gaps, fixed before any code

Found while planning. Each is fixed in the contract, in one governance PR, before anything is built.

1. **What the creator signs (AAB-PLATFORM-04).**
   - The contract defines `linkDigest` over every field of the link, including `linkId`, `createdAt` and `createdBy`, which the server sets. The creator cannot sign a digest they cannot compute before submitting.
   - **Proposed:** the creator signs a **link statement**: the canonical JSON of the fields the creator decides (actor, subject, relation, validity, evidence, `supersedesLinkId`), plus the creator's own identity (`issuer`, `actorId`).
   - The server verifies the signature against the statement, then computes `linkDigest` over the whole record, statement signature included.
2. **The status record (AAB-PLATFORM-04).** Section 4 names `SUSPEND`, `REINSTATE` and `REVOKE`, and requires each to be signed, but defines no record. **Proposed:** `ActorSubjectLinkStatusRecord`, with:
   - `statusRecordId`, `linkId`, `action` and `reason`;
   - `writtenBy` (ActorReference) and `writerCapacity`: `CREATING_ROLE` or `SUBJECT_REPRESENTATIVE`;
   - `recordedAt`;
   - a signed status statement, with its signature and `recordDigest`.
3. **Who is "the subject's authorised representative" (AAB-PLATFORM-04 and SCS-CAP-02).** They may suspend a link to their own organisation, but neither contract says how the system knows who they are. **Proposed:** an actor holding an `ACTIVE`, signed `ACTS_FOR_SUBJECT` link to the same party, and the role `PARTY_REPRESENTATIVE`. **For your decision:** this lets one staff member of an organisation suspend another's link.
4. **Request and decision types (SCS-CAP-02).** The amendment names `ScsActorPartyLinkRequest` and decision, `ScsActorPartyLinkStatusRequest` and decision, and `ScsMandateVerificationAssessmentRequest` and decision, but does not define them. **Proposed:** define each, mirroring the party verification request and decision.
5. **ActorReference version 2 in the pilot (AAB-PLATFORM-03).** **Proposed:** issuer `COUNTRY_TENANCY`, with the pilot country from configuration. Authority grants come from the actors file with `scopeType: DEPLOYMENT` and no `grantId`. That matches what the contract allows; it is recorded here, not changed.

## Step 1 — Migrations

Two migrations, each applied by the runner and mirrored in the current-state schema files, as always.

**Migration 021: actor–party links** (`schema/cap-02.sql`)
- **`scs.actor_party_link`,** append-only:
  - `link_id` (uuid);
  - the actor: `actor_issuer_type`, `actor_issuer_country`, `actor_id`;
  - `subject_domain` (always `SCS`), `subject_type` (always `PARTY`), and `party_id`, with a foreign key to `scs.party_identity`;
  - `relation` (`IS_SUBJECT` or `ACTS_FOR_SUBJECT`);
  - `valid_from`, `valid_until`;
  - `supersedes_link_id`, a self-reference;
  - `created_at`, `created_by` (jsonb, ActorReference v2);
  - `link_statement` (jsonb), `creator_signature`, `link_digest`.
  - **Constraints:** `valid_until > valid_from`; at most 12 months apart (SCS-CAP-02's maximum); a digest of the form `sha256:` plus 64 lowercase hex; a supersession never names itself.
- **`scs.actor_party_link_evidence`,** append-only: (`link_id`, `evidence_object_sha256`), with a foreign key to `scs.evidence_object`. A link's evidence is a list of stored objects, and an array cannot carry foreign keys.
- **`scs.actor_party_link_status`,** append-only: the status record of step 0, item 2, with a foreign key to its link.
- **All three tables:** append-only triggers (no UPDATE, DELETE or TRUNCATE for any role), row-level security, and `scs_api` limited to SELECT and INSERT, as for every `scs` table.

**Migration 022: mandate verification** (`schema/cap-02.sql`)
- **`scs.mandate_verification_assessment`,** append-only, mirroring `scs.party_verification_assessment` (migration 010):
  - a foreign key to `scs.representation_mandate`;
  - the recordable statuses only;
  - at least one evidence id;
  - `verified_at <= recorded_at`;
  - supersession within the same mandate, by composite foreign key.
- **Enforced in code, not by a constraint:** that the evidence ids are among the mandate's `mandateEvidenceIds`, and that `expires_at` does not outlast the mandate. The pilot's other cross-record checks are enforced the same way.

**Not enforceable in the database, and enforced in code:**
- **"At most one active link per actor, party and relation."** A link's state is derived when read, so no constraint can see it. Link creation and supersession take an advisory lock on (issuer, actorId, partyId, relation), and check within the lock, as CAP-09 does for decisions.

## Step 2 — Foundation: ActorReference version 2 and signatures

One PR, before any endpoint uses them.

- **The schema.**
  - `actor-reference.schema.json` gains version 2.
  - Stored records are read as version 1 or version 2 (`oneOf`), since every record already stored keeps version 1.
  - New records are written as version 2 only.
  - Types are regenerated.
- **The authenticator** builds version 2 from the actors file:
  - `issuer` from configuration (a new `SCS_ACTOR_ISSUER_COUNTRY`);
  - `authorityBasis` from each actor's roles, with `scopeType: DEPLOYMENT`;
  - `accountableName` and `publicKey` from new optional fields.
- **The actors file** gains optional `accountableName` and `signingPublicKey` (Ed25519, SPKI, base64) per human actor, and the roles `LINK_OFFICER` and `PARTY_REPRESENTATIVE`. The file is still validated at start.
- **Helpers used everywhere, replacing direct field reads:**
  - `holdsRole(actor, role)`, reading `authorityBasis` (version 2) or `roles` (version 1);
  - `sameActor(a, b)`, comparing (`issuer`, `actorId`), or `actorId` alone where either side is version 1.
- **Signatures** (`foundation/signatures.ts`):
  - Ed25519 verification of a signed statement against the actor's registered public key, over canonical JSON (`foundation/canonical.ts`);
  - statement digests computed the same way.
- **Existing code keeps working unchanged in behaviour.** Every existing test must pass: the whole 549-test suite stays green.

**Signing, for your decision:**
- **Proposed:** signatures are made **by the person, outside the server**, with their own Ed25519 key. The server holds only public keys and verifies. Tests generate throwaway keys.
- **In production,** a hardware key (the YubiKey noted for WP05) could hold the private key.
- **The alternative,** the server signing on the actor's behalf, would not be the person's signature, and would not meet "a named, accountable human signs".

## Step 3 — Endpoints, each with its tests

In dependency order. Each endpoint is its own commit with its integration tests, as for every capability so far.

| # | Endpoint | Operation | Role | Receipt decision type |
|---|---|---|---|---|
| 3.1 | `POST /scs/v1/actor-party-links` | `createActorPartyLink` | `LINK_OFFICER` | `ACTOR_PARTY_LINK_CREATION` |
| 3.2 | `POST /scs/v1/actor-party-links/:linkId/status-records` | `recordActorPartyLinkStatus` | `LINK_OFFICER`, or the subject's representative for `SUSPEND` | `ACTOR_PARTY_LINK_STATUS` |
| 3.3 | `GET /scs/v1/actor-party-links/:linkId` | `getActorPartyLink` (with derived state) | `LINK_OFFICER`, `COMPLIANCE_OFFICER` | — |
| 3.4 | `POST /scs/v1/mandates/:mandateId/verifications` | `addMandateVerificationAssessment` | `VERIFICATION_OFFICER` | `MANDATE_VERIFICATION` |
| 3.5 | `POST /scs/v1/parties/:partyId/evidence` gains `actingUnder` | representative submission of identity evidence | `COMPLIANCE_OFFICER` or `PARTY_REPRESENTATIVE` | unchanged |
| 3.6 | `POST /scs/v1/deforestation-evidence` gains `actingUnder` | representative submission | as above | unchanged |
| 3.7 | `POST /scs/v1/custody-events`: `actingUnder` replaces `submissionMandateId` | representative submission; the two mandate fields | as above | unchanged |

**Shared code:**
- **The link use checks** (AAB-PLATFORM-04, checks 1–3, and signature verification) live in the platform (`platform/actor-subject-links/`). They are generic over (domain, subjectType, subjectId), and take a `SubjectResolver`. They import no SCS type.
- **The SCS subject resolver** (`capabilities/cap-02/subject-resolver.ts`) answers from `scs.party_identity`.
- **The eight representative checks** live in `capabilities/shared/representation.ts`, used by 3.5 to 3.7. Each capability supplies its own action, the party acted for, and its scope.

**Tests per endpoint**, in the pattern of every capability so far: every failure code, happy paths, idempotent replay, and receipt rollback.
- **3.1:**
  - each of the seven creation rules;
  - the SCS additions: relation by party type, the 12-month maximum and evidence as stored objects;
  - the separation of duties with mandate verifiers;
  - a signature over the wrong statement is refused;
  - the one-active-link rule under concurrency.
- **3.2:**
  - who may write each action: the representative may suspend, but never reinstate or revoke;
  - reinstating a revoked link is refused;
  - supersession revokes the predecessor.
- **3.3:** each derived state: `ACTIVE`, `SUSPENDED`, `REVOKED`, `EXPIRED`, and superseded.
- **3.4:**
  - the eight recording rules, including independence from links and the evidence subset;
  - the derived current status, including expiry;
  - the stored `verificationStatus` is never updated.
- **3.5 to 3.7:**
  - each of the eight representative checks failing in turn, with its code;
  - a full representative submission admitted, with `representation` recorded on the ActorReference and in the decision;
  - a `COMPLIANCE_OFFICER` sending `actingUnder` refused;
  - direct submissions unchanged.
- **3.7 only:**
  - an old request with `submissionMandateId` refused as invalid, the breaking change;
  - the event mandate still producing `MANDATE_NOT_VALID`, now including scope.

## Step 4 — End-to-end proof, and records

- **One end-to-end test through real endpoints:**
  1. a link officer creates a signed link for a cooperative's staff member;
  2. a verification officer verifies the smallholder's mandate to the cooperative;
  3. the staff member, as `PARTY_REPRESENTATIVE`, submits identity evidence, deforestation evidence and a custody event for the smallholder;
  4. each is admitted with its representation recorded;
  5. the link is suspended by the cooperative's representative, and the next submission is refused;
  6. it is reinstated by the link officer, and the submission succeeds.
- **The integrity tool** (`ops/verify-integrity.ts`) gains link checks: every link and status record re-digests, and every signature verifies. Backup and restore then carry links, and the restore proves them.
- **README proof records.** `MINIMUM_VERTICAL_SLICE_PROVEN` for the new operations, in the CAP-02, 04 and 05 READMEs, each criterion mapped to a named test.
- **Operator documentation:** the actors file's new fields, `SCS_ACTOR_ISSUER_COUNTRY`, and how signing keys are generated and held.

## The PRs, in order

1. Contract gaps (step 0): AAB-PLATFORM-04 and SCS-CAP-02 amendments.
2. Migrations 021 and 022 (step 1).
3. Foundation: ActorReference version 2, helpers, signatures (step 2).
4. Links: endpoints 3.1 to 3.3.
5. Mandate verification: endpoint 3.4.
6. Representative submission: endpoints 3.5 to 3.7, including the CAP-05 breaking change.
7. End-to-end proof, integrity checks, README records and documentation (step 4).

## Decisions recorded on 2026-09-27

1. **The creator signs a link statement,** covering only the fields they decide. The server verifies it, then fingerprints the complete record.
2. **The status record shape is confirmed.** Only the subject itself (an `IS_SUBJECT` link), or a representative holding a subject authority role designated for that party, may suspend a link. For SCS that role is `PARTY_AUTHORITY_REPRESENTATIVE`, scoped to the party. An `ACTS_FOR_SUBJECT` link alone is not enough.
3. **Signing happens outside the server,** by the person, with their own Ed25519 key. The pilot keeps public keys in the actors file. The pilot documentation must explain that a creator signs the statement before submitting.
4. **The pilot's issuer is `COUNTRY_TENANCY`,** with the country from configuration (`SCS_ACTOR_ISSUER_COUNTRY`). This is recorded here, and goes into the pilot README with the foundation PR. With several countries, it becomes per-deployment configuration.
5. **The CAP-05 breaking change lands with no transition period.** No caller uses `submissionMandateId` in production.
6. **Seven PRs, each reviewed before the next begins.**

**Decisions made during the build** are recorded in the contracts they changed, each as a dated amendment: AAB-PLATFORM-04 (second amendment: which link applies; signing-key history, blocking before any real data), SCS-CAP-02 (third to fifth amendments: the link endpoints' rules, mandate verification made exact, representative submission made exact), and SCS-CAP-04 and SCS-CAP-05 (second amendments).

**Progress:** PR 1, the contract fixes, merged as #37 (`26590e8`). The pilot limitation on `PARTY_AUTHORITY_REPRESENTATIVE` grants is recorded in SCS-CAP-02. PR 2, migrations 021 and 022 with their schema tests, merged as #38 (`bd4f5d4`), with the CI actions moved to Node.js 24. PR 3, the foundation, merged as #39 (`aaf45bb`). PR 4, the link endpoints, merged as #40 (`ec71331`). PR 5, mandate verification, merged as #41 (`09456d1`). PR 6, representative submission, merged as #42 (`ca9dcb0`). PR 7 (end-to-end proof, integrity checks, README records, operator documentation) adds this plan to `main` as the record of the build. Each PR was reviewed before the next began. Beyond the plan, the database also enforces: the link record equals its signed statement (issuer, validity, evidence set), the relation fits the party type, and the creator and writer signed their statements.

## What this plan does not change

- No existing stored record: version 1 ActorReferences stay as they are.
- No admission, Gate D or commissioning status.
- No existing endpoint's behaviour, except the three that gain `actingUnder`, and CAP-05's request shape.
