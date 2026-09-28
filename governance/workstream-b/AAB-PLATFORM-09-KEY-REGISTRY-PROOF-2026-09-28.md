# AAB-PLATFORM-09 — Governed Public-Key Registry — Proof — 2026-09-28

**Status:** PROOF RECORD — PILOT STACK
**Authority:** RECORDS WHAT HAS BEEN VERIFIED ABOUT THE GOVERNED PUBLIC-KEY REGISTRY (AAB-PLATFORM-09) IN THE SCS PILOT, AGAINST THE FOUR CONDITIONS OF THE CONTRACT'S SECTION 11 AND ITS BOOTSTRAP CEREMONIES, AND WHAT HAS NOT. Raises AAB-PLATFORM-09 to `behaviourally proven`, for what the tests below cover. Admits no capability and no data, grants no production, commissioning or regulatory authority, and does not satisfy Gate D or close WP05.
**Evidence base:** `main` at `80b3c14` (signing-key history PRs 1 to 6), and commit `1223f00` of pull request #59 (PR 7: the rotation and compromise-window tests, the backup proof's rotation, the runbook and the contract corrections). **CI run 36369519581, a pull request run: it tested `6aa17d2`, the pull request merge of `1223f00` with `main` (`80b3c14`).** All three jobs passed (`test`, `isolation`, `backup-restore`). GitHub Actions, `ubuntu-24.04`.

## Scope and verdict

**Section 11 of AAB-PLATFORM-09:** "No real-data admission relies on the registry until its behaviour is proven, by tests that pass in CI and a proof record naming them." This is that record.

| Condition | Verdict |
|---|---|
| 1. **Rotation:** a record signed with a key later retired still verifies against that key; a new signature with the retired key is refused, whatever date its statement claims | **Proven** |
| 2. **Restoration:** after a backup is restored, every record verifies against its historical key, retired keys included, exactly as before | **Proven** |
| 3. **Compromise:** records accepted inside an exposure window are `UNDER_COMPROMISE_REVIEW` and fail closed where their authority is required; records accepted before it are unaffected; an assessment affirms or repudiates a record without removing it | **Proven** |
| 4. **Cross-issuer evidence:** a record signed with another issuer's key verifies with no call outside the domain; a compromise notice places the domain's records inside the window under review | **Proven** |
| The bootstrap ceremonies (section 3a, and the amendments of 2026-09-28) | **Proven**, with both first keys self-attested, as the pilot positions disclose |

**These replace `TODO(signing-key-history)` as the condition for real data** (section 11). The pilot's interim rule, "a key is never rotated while records it signed are in use", is lifted. Nothing is admitted by this record; admitting data remains a separate decision (AAB-PLATFORM-06).

## How it is verified

- **Every test runs through real HTTP,** against a migrated PostgreSQL database, as the least-privileged API role (`scs_api`: no superuser, no `BYPASSRLS`). Keys are registered through the registry's own endpoints, never by writing rows (`integration/signing-keys.ts`), so every record the tests leave is genuinely signed.
- **Ed25519 keys are generated in the test process,** and every statement is signed there, outside the server. The server holds only public keys.
- **Verification is by the platform's own code:** `verifyLinkSignature` and `verifyStatusSignature` (`platform/key-registry/signed-records.ts`), and the integrity verifier (`ops/verify-integrity.ts`, `platform/key-registry/integrity.ts`).
- **All paths below are under `scs-pilot/packages/api/src/`,** except the backup proof (`scs-pilot/backup/`). The test names are quoted as they appear in the files.
- **The file names differ from the build plan's step 5.** The plan named `key-compromise.test.ts` and `key-cross-issuer.test.ts`. Compromise and cross-issuer evidence were built and proven in PR 5, in `key-registry-compromise.test.ts`, and the ceremonies in PR 4, in `key-registry-endpoints.test.ts`. This record cites the files as they are.

## 1. Rotation

| Test | What it shows |
|---|---|
| `integration/key-rotation.test.ts`: "rotation by a replacing registration: the old key retires at the new key's activeFrom, and what it signed still verifies" | A link is signed with the first key; a replacement is registered with `replacesKeyId`. The first key is `RETIRED`, with `retiredAt` equal to the replacement's `activeFrom`. The link still verifies (`VERIFIED`), and the creator's new key writes status records on it. |
| `integration/key-rotation.test.ts`: "a new signature with a retired key is refused, whatever date its statement claims" | A new link statement signed with the retired key, claiming a `validFrom` 30 days earlier, is refused: 422 `LINK_SIGNATURE_INVALID`, "was RETIRED when the record was accepted". A status record signed with it is refused the same way. The same statement, signed with the key in use, is accepted. |
| `integration/key-rotation.test.ts`: "retirement by an event, with no replacement: the holder has no key until a new one is registered" | The holder retires their key by a signed `RETIRED` event. A status record signed with it is refused. A new key is registered, with nothing to replace, and acts on the link. Both earlier links still verify, each against the key that signed it. |
| `integration/integrity-links.test.ts`: "signing-key history: after the creator's key is rotated, every record signed with the old key still verifies" | The integrity verifier re-checks every link and status record after a rotation: all `VERIFIED`, no problems. |
| `integration/representative-submission.test.ts`: "check 2, the link, and signing-key history (AAB-PLATFORM-09): a rotated key's link still verifies; a compromised key's is under review until affirmed" | End to end: a representative acts for a party under a link whose creator's key has since been rotated, and the act succeeds. |
| `integration/key-registry-endpoints.test.ts`: "one active key per actor: a second key replaces the first, which retires and stays readable" | The registry's own rule: one active key per actor, and a retired key's history stays readable. |
| `platform/key-registry/registry.test.ts`: "VERIFIED: the named key, active at acceptance; later retirement and suspension change nothing", and "NOT_VERIFIABLE: a key not ACTIVE at acceptance, whatever the statement claims" | The same rules, in the pure derivations every check uses. |

## 2. Restoration

**The backup proof** (`backup/prove-backup-restore.mjs`), run by the CI job `backup-restore` on every pull request, on throwaway environments.
- **Before the backup,** it:
  - bootstraps the country's registry, co-signed by a throwaway Platform Owner whose key is verified from attested evidence;
  - registers the link officer's key;
  - signs a link with that key, then suspends and reinstates it;
  - **rotates the key,** by registering a replacement;
  - signs a second link with the new key.
- **It then backs up and restores** into a new environment with no volumes, and checks the restored environment.

**The 18 steps — CI run 36369519581,** job `backup-restore`. It tested `6aa17d2`. Proof run `39527c`, outcome **PROVEN**:

| # | Step | Result in CI |
|---|---|---|
| 1 | Source: a governed chain created through the API, its package INTACT | PASS (package `c5ef1e2c-d9b2-444a-a91b-c62296cad2e1`) |
| 2 | Backup | PASS |
| 3 | Backup: roles, database, objects, configuration and source report all present | PASS (10 files, 2 objects) |
| 4 | Restore: all migrations already applied, with matching checksums | PASS (24 already applied, latest 024) |
| 5 | Restore: every receipt verifies against its stored digest | PASS (20 receipts) |
| 6 | Restore: every package verifies against its stored digest | PASS (1) |
| 7 | Restore: every evidence file re-hashes to its recorded SHA-256 | PASS (1) |
| 8 | Restore: every rendition re-hashes to its recorded SHA-256 | PASS (1) |
| 9 | **Restore: every actor–party link and status record verifies against the key it names, as at its acceptance, and re-digests — before and after the rotation** | PASS: 2 links, both `VERIFIED`, one against the retired key; 2 status records, both `VERIFIED` |
| 10 | **Restore: the public-key registry verifies — every registration, ceremony, signature and piece of evidence** | PASS: 3 registrations, 1 ceremony (both signatures `VERIFIED`), no problems |
| 11 | Restore: every table's row count and the database grants equal the source's | PASS (47 tables) |
| 12 | Restored API: the package reads back byte-for-byte as compiled | PASS (`packageDigest` `sha256:32f9cb0a67c4eccca95e1f988b597f8366b74fc1a92096be4824143f8323e2a4`, currency `CURRENT`) |
| 13 | Restored API: verifyPackageIntegrity is INTACT, every check PASS | PASS (5 checks) |
| 14 | Restored API: the PDF rendition downloads and re-hashes to its recorded SHA-256 | PASS (110,457 bytes) |
| 15 | Restored API: the link reads back ACTIVE, with its digest and both status records | PASS (`ACTIVE`, 2 status records) |
| 16 | **Restored API: a new statement signed with the retired key is refused** | PASS: 422 `LINK_SIGNATURE_INVALID`, the key "was RETIRED" |
| 17 | Refused: a backup with one altered byte, before anything is started | PASS: `restore refused: backup file objects/517b1fd5… does not match SHA256SUMS` |
| 18 | Refused: a restore over an existing environment | PASS: `restore refused: compose project scs-proof-dst-39527c is not fresh (5 containers, 2 volumes)` |

**What steps 9, 10 and 16 add.** The restore verifies with no actors file and no call outside the environment: keys come only from the restored registry. A signature is checked against the key its statement names, in the state it was in when the record was accepted. So the retired key still verifies what it signed, and still refuses what it did not.

Also: `integration/integrity-links.test.ts`, "intact, with no actors file: every link, status record and registry record verifies against the registry, re-digests, and matches its receipt".

## 3. Compromise

| Test | What it shows |
|---|---|
| `integration/key-compromise-window.test.ts`: "a known start: a record accepted before the window is unaffected; one accepted inside it is under review" | Two links, one accepted before the suspected start and one after. The holder declares the key compromised. The first is `VERIFIED`, the second `UNDER_COMPROMISE_REVIEW`. |
| `integration/key-compromise-window.test.ts`: "a later start narrows nothing; an unknown start widens the window to the key's whole life" | A second declaration, with a later start, changes nothing. A third, with no start, widens the window to the key's `activeFrom`, and the earlier link goes under review. The window's end stays at the first compromise record. |
| `integration/key-compromise-window.test.ts`: "an assessment decides a record without removing it; a repudiated record is reported apart from one that does not verify" | A security officer affirms one link (`AFFIRMED_AFTER_COMPROMISE`) and repudiates the other (`REPUDIATED`). Both remain readable. The repudiated link, altered, is `NOT_VERIFIABLE`: a different result. |
| `integration/representative-submission.test.ts`: "check 2, the link, and signing-key history (AAB-PLATFORM-09): …" | **Fails closed where authority is required:** a representative's act under a link signed inside the window is refused, 422 `LINK_SIGNATURE_UNDER_REVIEW`, until a security officer affirms the link; then it succeeds. |
| `platform/actor-subject-links/use.test.ts`: "check 2: a signature under compromise review, and nothing else wrong → LINK_SIGNATURE_UNDER_REVIEW" | The same refusal, in the link-use checks. |
| `integration/key-registry-compromise.test.ts`: "compromise: the holder declares unsigned; anyone else signs with their own key, never the compromised one" | Who may declare, and how. A suspected start outside the key's life is refused. An unknown start widens the window. |
| `integration/key-registry-compromise.test.ts`: "assessment: a record signed with a compromised key, inside the window, by a security officer who is not its holder, once" | Assessment rules: no role, the key's holder, an unknown record, a record not under review, and a second assessment are each refused. A repudiated record is never removed. |
| `integration/integrity-links.test.ts`: "a compromise of the old key: its records are under review — counted, not problems; the environment is intact" | The integrity verifier counts records under review without reporting them as problems. |
| `platform/key-registry/registry.test.ts`: "compromise: inside the window, under review until a person assesses it; before it, unaffected", "exposure: from the earliest suspected start to the first record; widened, never narrowed", and "reliance: only VERIFIED and AFFIRMED_AFTER_COMPROMISE" | The same rules, in the pure derivations. |

## 4. Cross-issuer evidence

| Test | What it shows |
|---|---|
| `integration/key-registry-compromise.test.ts`: "setup: the Platform Owner's registry and Thailand's, bootstrapped in their own databases" | The control plane's registry and Thailand's run in **separate databases**. The country's database holds no control-plane key registration, only the attested evidence. |
| `integration/key-registry-compromise.test.ts`: "the Platform Owner's key is compromised in the control plane; the notice is attested offline" | The Platform Owner's key is declared compromised in the control plane. The notice is attested outside any server, with the attestation key. |
| `integration/key-registry-compromise.test.ts`: **"cross-issuer: with the control plane stopped and its database dropped, the country verifies its ceremony, records the notice, and assesses"** | With the control plane **stopped and its database dropped:**<br>- the country verifies the Platform Owner's co-signature on its ceremony from the evidence it holds: `VERIFIED`;<br>- a notice is refused if recorded by someone without the security role, attested by an unpinned or wrong key, or naming the country's own issuer;<br>- the attested notice is recorded, and the ceremony goes `UNDER_COMPROMISE_REVIEW`;<br>- a security officer affirms it: `AFFIRMED_AFTER_COMPROMISE`. |
| `platform/key-registry/registry.test.ts`: "evidence: verified offline against a pinned attestation key, then used as the key's history", and "evidence: refused if not pinned, not attested by the pin, attested for another issuer, or stale" | The evidence rules, including the 60-minute limit (third amendment). |

## 5. The bootstrap ceremonies

| Test | What it shows |
|---|---|
| `integration/key-registry-endpoints.test.ts`: "the Platform Owner's ceremony: self-attested, declaring the attestation key, once" | The Platform Owner's first key, self-attested with proof of possession, declaring the attestation key. A second ceremony is refused. |
| `integration/key-registry-endpoints.test.ts`: "a country's ceremony: refused without the Platform Owner's verified co-signature and attested evidence" | A country's ceremony without a valid co-signature, or without valid attested evidence, is refused. |
| `integration/key-registry-endpoints.test.ts`: "a country's ceremony: the representative's first key, co-signed; the attestation key pinned; the evidence kept" | The representative's first key, co-signed by the Platform Owner. The attestation key is pinned, and the evidence is stored with the ceremony. |
| `integration/key-registry-endpoints.test.ts`: "registration: by a registration authority who is not the holder, with proof of possession" | After the ceremony, every key is registered by a registration authority who is not its holder, with proof of possession: self-registration, an unknown or non-human holder, a nonce not signed by the key, a key already registered, and a registration not signed by the authority's own key are each refused. |
| `integration/key-registry-endpoints.test.ts`: "a challenge is used once, for the actor and key it names", and "every registry decision has its receipt, and every registry record names it" | Challenges and receipts. |

**The Platform Owner cannot register a country key.** This is structural, not tested: the Platform Owner has no identity in a country's instance, whose actors file names only that country's actors, and every registration needs a `KEY_REGISTRAR` of the registry's own issuer.

**The procedure** an operator follows for both ceremonies is `scs-pilot/KEY-BOOTSTRAP-CEREMONY-RUNBOOK.md`. **No real ceremony has been performed.** The tests and the backup proof play every role with generated keys.

## The full test suite

- **CI run 36369519581, job `test`:** 723 of 723 tests pass. That includes every test named above.
- **Job `isolation`:** all 20 required checks match the isolation model, for the country stack and with `docker-compose.dev.yml`.
- **Development runs are not the evidence here.** The full suite and the backup proof also passed locally, on Docker Desktop, before the commit.

## Limits

- **Both first keys are self-attested.** The Platform Owner's, and a country's, are pilot positions, disclosed in their ceremony records (section 3a, and the amendments). The production bootstrap is open.
- **A receipt proves acceptance time and key, not signing time** (section 10). A signature is checked against the key's state when the server accepted the record. Nothing proves when the holder signed it.
- **The control plane is a pilot instance.** It is the same program, with its own database. It has no compose definition, and is run by hand. Its separation is proven in the tests by separate databases and a dropped control-plane database, not by a separate host.
- **Compromise notices are carried by hand.** There is no channel. Until a notice arrives, a country cannot know of a compromise elsewhere (section 9, open item).
- **No private-key custody is proven.** The tests hold keys in process memory. How a holder keeps their key, including the WP05 hardware key, is outside the contract and outside this proof.
- **The attestation key's rotation and replacement are not built** (open item).
- **Only Ed25519.**
- **Nothing is admitted.** AAB-PLATFORM-09 and every SCS capability stay `PROPOSED_NOT_ADMITTED`.
- **It is not an independent review.** The same author built and proved it.
- **Other blockers before real data remain:** `TODO(object-store-credentials)`, and the actor directory's history, which blocks production and is a disclosed limitation for the pilot (`governance/AAB-STOCK-TAKE-2026-09-28.md`).

## What this record does not establish

- It does not establish a production bootstrap, or any real ceremony
- It does not establish private-key custody, trusted timestamps, or algorithms other than Ed25519
- It does not establish a channel for compromise notices, or the attestation key's lifecycle
- It is not an independent review
- It admits no capability and no data, and does not alter commissioning status, satisfy Gate D, close WP05, or grant any production, commissioning or regulatory authority
