# Signing-key history — build plan

**Status:** BUILD PLAN — APPROVED 2026-09-28, WITH THE FOUR DECISIONS RECORDED BELOW — ALL SEVEN PRS BUILT; PROVEN IN `governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md`
**Builds:** AAB-PLATFORM-09 Governed Public-Key Registry (`governance/AAB-PLATFORM-09-GOVERNED-PUBLIC-KEY-REGISTRY-CANONICAL-CONTRACT-2026-09-28.md`, with its amendment of 2026-09-28), in the SCS pilot, and the switch of every signature check from the signer's current key to the key active when the server accepted the signature.
**Removes, when the proof merges:** `TODO(signing-key-history)` as the blocker before real data, replaced by the contract's section 11 proof.
**Order:** contract gaps first, then migrations, then the foundation, then endpoints (each with its own tests, as always), then the switch-over, then the proof. One PR per step, each with CI passing, each reviewed before the next begins.

## What exists today

- **Keys live in the actors file.** `foundation/auth.ts` reads an optional `signingPublicKey` (Ed25519, SPKI DER, `HUMAN` only) per actor, refuses a key used by two actors, and answers `signingKeyOf(actor)` with that one key. There is no history, no registration evidence, and no way to record a compromise.
- **Two statements are signed:** the link statement and the link status statement (AAB-PLATFORM-04; schemas `urn:aab:scs:schema:platform:actor-subject-link-statement:1` and `…-status-statement:1`, both `additionalProperties: false`). **Neither names a key.** Mandate verification, review decisions and assessments are not signed.
- **Where signatures are checked:**
  - at creation: `cap-02/create-link.ts` and `cap-02/record-link-status.ts`, against `signingKeyOf`;
  - **at every use of a link:** `platform/actor-subject-links/use.ts` re-verifies the link against its creator's *current* key (`LINK_SIGNATURE_INVALID`). A rotated key therefore breaks every link its holder made;
  - **status records are not re-verified at use:** `deriveLinkState` reads only `action` and `recordedAt`;
  - `ops/verify-integrity.ts` and the backup proof re-verify links and status records, loading keys from the actors file.
- **Time.** Links and status records take the database clock after the advisory lock (`clockNow`: `clock_timestamp()`). Receipts take `issuedAt` from the Node clock (`receipts.ts`), a different clock.
- **Receipts** can only carry an SCS capability id: `GovernedCapabilityId` excludes `SCS-PLATFORM`, and the receipt table's `CHECK` lists `SCS-CAP-01` to `09` (dependency audit, V5). No receipt records a key.
- **A test encodes today's rotation behaviour.** `integration/representative-submission.test.ts` rotates `linkerOld`'s key in its second phase and expects the link `repForged` to fail `LINK_SIGNATURE_INVALID`. Under AAB-PLATFORM-09 that link still verifies.
- **The backup proof record is stale.** `SCS-PILOT-BACKUP-RESTORE-PROOF-2026-09-26.md` still describes 14 steps; the proof now runs 16.
- **There is no platform control plane.** Every pilot actor is issued by the country (`COUNTRY_TENANCY`, from `SCS_ACTOR_ISSUER_COUNTRY`). The Platform Owner's registry, which the bootstrap co-signature and the cross-issuer tests need, has nowhere to run.
- **Patterns to reuse:** append-only tables with `reject_modification` triggers; `SELECT, INSERT` grants with RLS for `scs_api` (enforced for every `scs` table by `db-security.test.ts`); advisory locks serialising writes on one subject; a receipt in the same transaction as every decision; the migration runner and its checksums.

## Step 0 — Contract gaps, fixed before any code

Found while planning. Each is settled in the contracts, in one governance PR, before anything is built.

1. **Where the Platform Owner's registry runs in the pilot (AAB-PLATFORM-09).** **Proposed:** the same registry code, run as a **second, separate instance** configured for the issuer `PLATFORM_CONTROL_PLANE`, with its own database, holding no country data. The country stack never connects to it; what crosses is verification evidence, carried by the operator as a file. **Decided** (decision 1): a separate instance, not a command-line registry kept as a file. One implementation, two deployments.
2. **Who signs an attestation (AAB-PLATFORM-09, sections 1 and 9).** Section 1 says no registry or server ever holds a private key; section 9 has "the issuing registry's signature". **Proposed:** an attestation is made outside the server, by the holder of the registry's attestation key, over evidence the registry exports. The registry never holds the attestation private key.
3. **The attestation key's pilot position (AAB-PLATFORM-09, open item).** **Proposed:** the control plane's attestation public key is declared in the Platform Owner's bootstrap ceremony record, and pinned in a country by that country's bootstrap ceremony (item 6).
4. **A key holder declaring their own key compromised (AAB-PLATFORM-09, section 8).** A key holder has one active key, the compromised one, and a declaration must never need it. **Proposed:** a key holder's declaration is accepted **unsigned**, authenticated by their token, and says so. A registration authority's or security officer's declaration is signed with their own key.
5. **The registration challenge (AAB-PLATFORM-09, section 3).** **Proposed:** requested by a registration authority for a named actor; single use; valid for 30 minutes; its use recorded by the registration that consumes it, never by changing the challenge.
6. **The country bootstrap ceremony record (AAB-PLATFORM-09, amendment of 2026-09-28).** **Proposed contents:** the representative's key registration (self-attested, with proof of possession); the control plane's attestation public key, pinned; verification evidence for the Platform Owner's key; who was present, what was done and when; the representative's signature with the new key, and the Platform Owner's co-signature with their control-plane key. Accepted only while the country registry is empty.
7. **`acceptedAt` (AAB-PLATFORM-09, section 6).** **Proposed:** the database clock after the advisory lock, the same value as the record's `createdAt` or `recordedAt`, recorded in the receipt's decision. The receipt's own `issuedAt` is unchanged in this build and is not used as `acceptedAt`.
8. **Statements name their key (AAB-PLATFORM-04).** **Proposed:** version 2 of the link statement and the status statement, each with `signingKeyId`. Version 1 statements already stored stay readable; a new version 1 statement is refused. **A breaking change for every client that signs.** **Decided** (decision 3): no transition period.
9. **Checks at use (AAB-PLATFORM-04).** **Proposed:**
   - a link's signature is verified against its key as at its `createdAt`, not the current key;
   - **status records are verified at use too,** as at their `recordedAt`: a status record that is not `VERIFIED` or `AFFIRMED_AFTER_COMPROMISE` makes the link unusable, failing closed;
   - **decided** (decision 4): status records are held to the same standard as links;
   - a new failure code, `LINK_SIGNATURE_UNDER_REVIEW`, for a link or status record inside a compromise window and not yet assessed; `REPUDIATED` and `NOT_VERIFIABLE` stay `LINK_SIGNATURE_INVALID`, with the result named in the reason.
10. **Roles.** **Proposed:** `KEY_REGISTRAR` (the issuer's key-registration role) and `KEY_SECURITY_OFFICER` (the issuer's security role: declares compromises, assesses records in a window). Both `HUMAN` only.
11. **The compromise assessment (AAB-PLATFORM-09, section 8).** **Proposed:** one signed record per affected record, `AFFIRM` or `REPUDIATE`, with reasons and the evidence considered, by a `KEY_SECURITY_OFFICER` who is not the key holder. It follows AAB-PLATFORM-08's rules for a human decision; AAB-PLATFORM-08 is not otherwise adopted in this build.
12. **Existing keys (AAB-PLATFORM-09, section 12).** Pilot instances hold no real data and are disposable. **Decided** (decision 2): no import tool. A deployment adopts the registry from a fresh database, by the bootstrap ceremonies. Any existing test instance is re-provisioned. The import path is designed, with its own contract and proof, when a production deployment with real data first needs it.
13. **Receipts for the registry (dependency audit, V5).** **Proposed:** `AAB-PLATFORM-09` becomes a governed capability id for the registry's own receipts and failures, with its own boundary flags. The receipt table's capability check is widened by a new migration.
14. **Citations.** AAB-PLATFORM-03, 04 and 08 are amended to cite AAB-PLATFORM-09 in place of their signing-key history open items.

## Step 1 — Migrations

Two migrations, each applied by the runner and mirrored in a current-state schema file, as always. Tables stay in the `scs` schema (the naming rule keeps it), with neutral names; new schemas use `urn:aab:schema:`.

**Migration 023: the public-key registry** (`schema/key-registry.sql`)
- `scs.key_registration_challenge`: issued challenges, with the requesting registrar, the named actor and the expiry.
- `scs.signing_key_registration`: every field of `KeyRegistration`, with `challenge_id` **unique** (one use per challenge), `(issuer, key_id)` unique, and `public_key_digest` unique within an issuer.
- `scs.signing_key_event`: `SUSPENDED`, `REINSTATED`, `RETIRED`, each signed.
- `scs.signing_key_compromise`: the compromise record, its own table; evidence digests in a child table.
- `scs.key_bootstrap_ceremony`: ceremony records, with their signatures and co-signatures.
- `scs.pinned_attestation_key`: attestation keys pinned by a ceremony.
- `scs.key_verification_evidence`: copies of other issuers' key evidence, each tied to the record that needed it.
- `scs.key_compromise_notice`: attested notices of another issuer's compromises.
- `scs.key_compromise_assessment`: `AFFIRM` or `REPUDIATE`, one per affected record.
- Every table append-only by trigger; `SELECT, INSERT` for `scs_api` with RLS, as `db-security.test.ts` requires. Database checks for formats, digests and the one-bootstrap-per-registry rule; "one active key per actor" is checked in the application under an advisory lock on the actor, as time-dependent rules are elsewhere.

**Migration 024: platform receipts** (`schema/platform.sql`)
- The receipt table's capability check widened to include `AAB-PLATFORM-09`. Nothing else in the receipt table changes.

**Also in this PR:** `scripts/generate-types.mjs` resolves `urn:aab:schema:` as well as `urn:aab:scs:schema:`. `ops/verify-integrity.ts` needs no change here: it already counts every `scs` table. (Corrected while building PR 2.)

## Step 2 — Foundation: the registry library and historical verification

- **`platform/key-registry/`** (new, platform code, no SCS imports): pure functions over a key's registration, events, compromises, notices and assessments:
  - the key's state at a time (`PENDING`, `ACTIVE`, `SUSPENDED`, `RETIRED`, `COMPROMISED`), with `retiredAt` derived;
  - the exposure window, from the earliest recorded start, never narrowed, the key's whole life when the start is `UNKNOWN`;
  - **the five verification results** for a signed record, given its statement, signature, `signingKeyId` and `acceptedAt`;
  - verification evidence and its attestation, against pinned keys.
- **`foundation/signatures.ts`:** `verifyStatementSignature` is unchanged; a new `verifySignedRecord(...)` returns the five results. `signingKeyOf` is removed from the directory interface; a `KeyRegistryReader` replaces `SigningKeyDirectory`, reading the registry inside the caller's transaction.
- **`foundation/errors.ts`:** `AAB-PLATFORM-09` added as a capability id, with its boundary flags; `GovernedCapabilityId` admits it.
- **Tests:** the state derivation, the window rules and the five results, exhaustively, as unit tests.

## Step 3 — Registry endpoints, each with its tests

| # | Endpoint | Operation | Role | Receipt decision type |
|---|---|---|---|---|
| 3.1 | `POST /aab/v1/key-bootstrap-ceremonies` | Record a bootstrap ceremony and the registry's first key | The first key holder; for a country, co-signed by the Platform Owner | `KEY_BOOTSTRAP` |
| 3.2 | `POST /aab/v1/key-registration-challenges` | Issue a challenge | `KEY_REGISTRAR` | `KEY_REGISTRATION_CHALLENGE` |
| 3.3 | `POST /aab/v1/signing-keys` | Register a key, with proof of possession, optionally replacing one | `KEY_REGISTRAR`, not the key holder | `KEY_REGISTRATION` |
| 3.4 | `POST /aab/v1/signing-keys/:keyId/events` | Suspend, reinstate or retire | Retire: key holder or `KEY_REGISTRAR`; suspend, reinstate: `KEY_REGISTRAR` | `KEY_EVENT` |
| 3.5 | `GET /aab/v1/signing-keys/:keyId` | Read a key, its events and its derived state | `KEY_REGISTRAR`, `KEY_SECURITY_OFFICER`, the key holder | — |
| 3.6 | `POST /aab/v1/signing-keys/:keyId/compromises` | Declare a compromise, or widen its window | Key holder (unsigned), `KEY_REGISTRAR`, `KEY_SECURITY_OFFICER` | `KEY_COMPROMISE` |
| 3.7 | `POST /aab/v1/key-compromise-notices` | Record another issuer's attested compromise | `KEY_SECURITY_OFFICER` | `KEY_COMPROMISE_NOTICE` |
| 3.8 | `POST /aab/v1/key-compromise-assessments` | Affirm or repudiate one record in a window | `KEY_SECURITY_OFFICER`, not the key holder | `KEY_COMPROMISE_ASSESSMENT` |

Every write is idempotent, transactional and receipted, as the server requires of every write route. Every refusal writes nothing.

## Step 4 — The switch-over

- **Link and status statements, version 2,** with `signingKeyId`. `create-link.ts` and `record-link-status.ts` accept only version 2; the key must be `ACTIVE` at `acceptedAt`; the decision records `acceptedAt`, `signingKeyId`, the key's `publicKeyDigest` and `registrationDigest`, and the evidence digest for another issuer's key.
- **Checks at use** (`use.ts`, `shared/representation.ts`): links and their status records verified historically (step 0, item 9).
- **`foundation/auth.ts`:** the actors file no longer carries keys. A `signingPublicKey` in it **stops the server from starting**, naming the registry, so a key is never silently ignored. The file keeps actors, roles and grants.
- **`ops/verify-integrity.ts`:** verifies every link and status record against the registry, as at its `acceptedAt`, and verifies the registry itself (registration digests, proofs of possession, event signatures, ceremony signatures, evidence attestations). It no longer reads the actors file for keys.
- **`integration/representative-submission.test.ts`:** its rotation case now expects the old link to verify and the act to succeed; a separate case keeps `LINK_SIGNATURE_INVALID` covered with a signature by the wrong key.
- **The backup proof** registers its link officer's key through the registry instead of the actors file.

## Step 5 — The proof

**The tests section 11 requires, each named in the proof record:**
- **Rotation** (`integration/key-rotation.test.ts`): a link signed with a key later retired still verifies and can be used; a new signature with the retired key is refused, whatever date its statement claims; rotation by a replacing registration retires the old key at the new key's `activeFrom`.
- **Restoration** (the backup proof): the proof bootstraps a registry, registers a key, signs a link, **rotates the key**, signs a second link, backs up, restores, and re-verifies both links against their historical keys, the retired one included, and verifies the registry itself.
- **Compromise** (`integration/key-compromise.test.ts`): records accepted inside the window are `UNDER_COMPROMISE_REVIEW` and refused at use (`LINK_SIGNATURE_UNDER_REVIEW`); records accepted before it are unaffected; widening moves records into review, and nothing narrows it; an assessment affirms or repudiates a record without removing it; `REPUDIATED` and `NOT_VERIFIABLE` are reported apart; a key holder's unsigned declaration is accepted.
- **Cross-issuer evidence** (`integration/key-cross-issuer.test.ts`): with a control-plane registry in its own database, a country record co-signed by the Platform Owner verifies **with the control-plane database unreachable**; evidence with a bad attestation is refused; a compromise notice places the country's records inside the window under review.
- **The bootstrap ceremonies:** the Platform Owner's self-attested first key; the country's first key, registered by the representative and co-signed by the Platform Owner; a second bootstrap into a non-empty registry refused; the Platform Owner unable to register a country key.

**The proof record** (`governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-<date>.md`):
- **Demonstrates:** the four conditions of section 11, and both bootstrap ceremonies, each by its named tests.
- **Cites:** the CI run on the merge commit, by run number, for all three jobs; the backup proof's report, step by step.
- **States its limits:** both first keys are self-attested (pilot positions, disclosed); receipts prove acceptance time and key, not signing time; the control plane runs as a pilot instance; compromise notices are carried by hand; no private-key custody is proven; nothing is admitted.
- **Raises AAB-PLATFORM-09 to `behaviourally proven`** for what the tests cover.

**Also in this PR:** `TODO(signing-key-history)` removed from the code and the README, each place pointing to the proof record; the backup proof record's stale step count corrected; the operator documentation (`scs-pilot/README.md`) rewritten for the registry, with a **runbook for both bootstrap ceremonies**.

## The bootstrap, in the order it must happen

No key can be registered in any registry before its first key exists.
1. **The control-plane registry is provisioned,** empty.
2. **The Platform Owner's ceremony.** The Platform Owner generates their key, and the control plane's attestation key, outside any server. They register their own key, self-attested with proof of possession, declaring the attestation public key in the ceremony record. The record says who was present, what was done and when, and is signed with the new key. Disclosed as the pilot position.
3. **The country registry is provisioned,** empty, in the country's tenancy.
4. **The country's ceremony.** Its authorised representative generates their key outside any server and registers it, self-attested with proof of possession. The Platform Owner witnesses. The ceremony record pins the control plane's attestation key, carries attested verification evidence for the Platform Owner's key, and is signed by the representative with the new key and co-signed by the Platform Owner. The Platform Owner never registers or holds a country key.
5. **Only then** does the representative, as the country's first `KEY_REGISTRAR`, register other country actors' keys, never their own.

**For a real country,** step 4 waits on the representative being identified, a country decision not yet made. Tests and the backup proof play every role with generated keys, and say so.

## The PRs, in order

1. **Contract gaps (step 0):** amendments to AAB-PLATFORM-09 and AAB-PLATFORM-04; AAB-PLATFORM-03 and 08 cite AAB-PLATFORM-09.
2. **Migrations 023 and 024 (step 1),** with the type generator and integrity-counter changes.
3. **Foundation (step 2):** the registry library, historical verification, the capability id.
4. **Registry endpoints 3.1 to 3.5:** bootstrap, challenges, registration, events, reads. **Also, moved here while building it:** the control plane's issuer (`PLATFORM_CONTROL_PLANE` actors, and `AAB_REGISTRY_INSTANCE=CONTROL_PLANE`, serving the registry's routes only), without which the Platform Owner's ceremony has no actor; and checking the Platform Owner's attested evidence, without which a country's ceremony cannot verify its co-signature.
5. **Compromise and cross-issuer evidence: endpoints 3.6 to 3.8,** and the cross-issuer tests (the control plane's registry in its own database).
6. **The switch-over (step 4):** statements version 2, checks at use, keys out of the actors file, the integrity verifier, the changed rotation test. **The breaking change for signing clients lands here.** **Also, found while building it:** the operator sections of the READMEs corrected here, not in PR 7, since after this PR they would tell operators to do what the server refuses; compromise evidence digested in canonical order (by digest), so that a compromise record re-digests from its stored rows; the integrity verifier reports a `NOT_VERIFIABLE` signature as a problem, and counts one under review, affirmed or repudiated without reporting it.
7. **The proof (step 5):** the section 11 tests, the extended backup proof, the proof record, documentation, and the removal of `TODO(signing-key-history)`. **As built:**
   - **The test files are named differently from step 5.** Compromise and cross-issuer evidence were proven in PR 5, in `integration/key-registry-compromise.test.ts`, and the bootstrap ceremonies in PR 4, in `integration/key-registry-endpoints.test.ts`. This PR adds `integration/key-rotation.test.ts` and `integration/key-compromise-window.test.ts`. The second shows, end to end over real links, what the registry library's unit tests showed only in pure functions: a record accepted before the window is unaffected, and a later start narrows nothing. The proof record cites the files as they are.
   - **The backup proof has 18 steps.** It rotates the link officer's key and signs a second link with the new one; after the restore, both links verify, the registry holds three registrations, and the restored API refuses a new statement signed with the retired key.
   - **The operator runbook** for both ceremonies is `KEY-BOOTSTRAP-CEREMONY-RUNBOOK.md`. The README's operator section was already corrected in PR 6, and now points to it.

Until PR 7 merged, the pilot's rule stood: a key is never rotated while records it signed are in use. The proof lifts it.

## Decisions recorded on 2026-09-28

The plan was approved subject to these four decisions:
1. **The Platform Owner's registry runs as a separate instance of the same code, with its own database** (step 0, item 1). A command-line registry kept as a signed file would be a second implementation of the same contract, and two implementations of one governance primitive create exactly the inconsistency the platform exists to avoid. One implementation, two deployments. The country stack never connects to it: it is air-gapped from country environments by design.
2. **Existing keys: a fresh database, no import tool** (step 0, item 12). The pilot holds no real data, so every deployment bootstraps from scratch through the ceremonies. An import tool would add complexity for a case that does not exist yet. When a production deployment with real data needs key migration, the import path is designed then, with its own contract and its own proof.
3. **Version 1 statements are refused as soon as the switch-over merges** (step 0, item 8). No transition period: the pilot has no real signers outside the controlled test environment. The test that expects rotation to break a link is corrected to expect the link to verify. It was wrong under AAB-PLATFORM-09, and should have been flagged when the contract was written.
4. **Status-record signatures are checked at use** (step 0, item 9), to the same standard as link signatures. The gap exists independently of rotation, and is closed: a status record whose signature cannot be verified at use is indistinguishable from a tampered one.

## What this plan does not change

- No committed migration, and no stored record: existing links and status records keep their version 1 statements, and are read as they are.
- Mandate verification, review decisions and assessments stay unsigned; signing them is AAB-PLATFORM-08's adoption, not this build.
- Private-key custody, the WP05 hardware key, a trusted timestamp mechanism, and the production bootstrap.
- `TODO(object-store-credentials)`, which still blocks real data on its own.
- Nothing is admitted.
