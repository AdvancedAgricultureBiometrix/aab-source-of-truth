# Key bootstrap ceremonies — operator runbook

**Status:** OPERATOR RUNBOOK — PILOT
**Governs:** nothing. It is the procedure for AAB-PLATFORM-09 section 3a, with its amendments of 2026-09-28 (`governance/AAB-PLATFORM-09-GOVERNED-PUBLIC-KEY-REGISTRY-CANONICAL-CONTRACT-2026-09-28.md`). Where this runbook and the contract differ, the contract holds.
**Proven by:** `governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md`. The tests and the backup proof play every role with generated keys. **No real ceremony has been performed.**

A registry's first key cannot be registered by anyone else's key, since none exists yet. It is self-attested, once, in a recorded ceremony. That is disclosed in the record, and is a pilot position, not a production solution. Everything after the first key is an ordinary registration, by a registration authority who is not the key holder.

**The order is fixed** (build plan, "The bootstrap, in the order it must happen"):
1. the control plane's registry is provisioned, empty;
2. the Platform Owner's ceremony;
3. a country registry is provisioned, empty;
4. the country's ceremony, performed by its authorised representative and witnessed and co-signed by the Platform Owner;
5. only then, the representative registers other country actors' keys.

**A country's ceremony waits on its representative being identified.** That is a country decision, not yet made for any country.

## Rules that hold throughout

- **Private keys never touch a server.** Every key pair is generated on its holder's own machine. Nothing below sends a private key anywhere, and no server holds one, including the attestation key.
- **Each statement is signed as its canonical JSON:** keys sorted, no whitespace (`packages/api/src/foundation/canonical.ts`). The signature is Ed25519, in standard base64. The signing command is in `README.md`, "Signing keys (operators)", step 4.
- **Public keys are Ed25519, in base64 SPKI DER.** A `publicKeyDigest` is `sha256:` followed by the hex SHA-256 of the DER bytes.
- **Every write is `POST` with a bearer token and an `Idempotency-Key`.** Its receipt is the record of what the server accepted, and when (`acceptedAt`, the database clock).
- **A refusal writes nothing.** Every failure code, with its status, is in the contract's section 13.
- **Challenges last 30 minutes and are single-use.** Verification evidence must be attested at most 60 minutes before the record that relies on it is accepted. Plan the ceremony so both fit.

## 1. Provision the control plane's registry

The control plane's registry is **the same program as a country's API, run as a separate instance with its own database** (second amendment). The country stack never connects to it.
- **Database:** a new, empty PostgreSQL database, migrated like any other (`packages/db`). It holds no country data.
- **Environment:** `AAB_REGISTRY_INSTANCE=CONTROL_PLANE`, `SCS_AUTH_STATIC_ACTORS_FILE`, the database settings and `API_PORT`. **`SCS_ACTOR_ISSUER_COUNTRY` must be unset;** the instance refuses to start with it. It needs no object store.
- **Actors file:** actors are issued by `PLATFORM_CONTROL_PLANE`, with the deployment scope `AAB-CONTROL-PLANE`. The Platform Owner's entry is a `HUMAN` with the `KEY_REGISTRAR` role and an `accountableName`. It carries no `signingPublicKey`.
- **Routes:** only the registry's, under `/aab/v1/`.
- **Pilot limitation:** there is no compose definition for this instance. It is run by hand, and is disclosed as a pilot instance.

## 2. The Platform Owner's ceremony

**Present:** the Platform Owner, and whoever the record will name as witnesses.

1. **Generate two key pairs, offline:** the Platform Owner's signing key, and the control plane's **attestation key**. Keep both private halves offline. The attestation key signs evidence and notices that other domains will trust; it is never loaded into a server.
2. **Request a challenge** from the control plane, as the Platform Owner:
   `POST /aab/v1/key-registration-challenges` with `{ "purpose": "BOOTSTRAP", "actorId": "<the Platform Owner's actorId>" }`.
   The decision returns `challengeId`, `keyId` and `nonce`.
3. **Prepare and sign three statements,** each with the new signing key:
   - the **possession statement** (`SIGNING_KEY_POSSESSION`): `keyId`, `actorId`, `issuer` (`{ "issuerType": "PLATFORM_CONTROL_PLANE" }`), `publicKeyDigest`, `challengeId` and `nonce`;
   - the **registration statement** (`SIGNING_KEY_REGISTRATION`): `keyId`, `actorId`, `issuer`, `publicKeyDigest`, `algorithm: "Ed25519"`, `challengeId`, `signingKeyId` (the new `keyId`: it is self-signed) and `registrationAuthority` (the Platform Owner);
   - the **ceremony statement** (`KEY_BOOTSTRAP_CEREMONY`): `registry` (the control plane's issuer), `holder`, `keyId`, `challengeId`, `publicKeyDigest`, `record` (`present`: who was there; `procedure`: what was done; `performedAt`) and `declaredAttestationKey` (`attestationKeyId` and the attestation public key).
4. **Submit** `POST /aab/v1/key-bootstrap-ceremonies` with `publicKey`, the three statements and their signatures (`possessionSignature`, `registrationSignature` and `holderSignature`). A second ceremony into the same registry is refused (`KEY_REGISTRY_ALREADY_STARTED`).
5. **Keep, outside the server,** the attestation key's id and public key, which every country ceremony pins, and the ceremony's receipt.

## 3. Provision the country registry

The country's own API stack (`docker-compose.yml`), from a fresh database. There is no import (second amendment). Its actors file names the representative as a `HUMAN` with `KEY_REGISTRAR` and an `accountableName`.

## 4. The country's ceremony

**Present:** the country's authorised representative, who performs it, and the Platform Owner, who witnesses and co-signs. **The Platform Owner never registers, holds or controls a country key.**

1. **The representative generates their key pair, offline, on their own machine.**
2. **The Platform Owner prepares verification evidence for their own key,** from the control plane:
   - read `GET /aab/v1/signing-keys/<the Platform Owner's keyId>`;
   - build the evidence: `issuer`, `keyId`, `registration` (as read), `eventsAtAcceptance` (the events, as read), `compromisedAtAcceptance: false`, `attestedAt` (now) and `attestationKeyId`;
   - **the attestation key's holder signs it, offline:** over the canonical JSON of exactly `issuer`, `keyId`, `registration`, `eventsAtAcceptance`, `compromisedAtAcceptance` and `attestedAt` (`attestedContent`, `platform/key-registry/registry.ts`). The signature is the evidence's `attestation`.

   From here, the country must accept the ceremony within 60 minutes of `attestedAt`.
3. **The representative requests a challenge** from the country registry: `{ "purpose": "BOOTSTRAP", "actorId": "<their actorId>" }`.
4. **Prepare the statements:** possession and registration, as in section 2, but with the country's issuer (`{ "issuerType": "COUNTRY_TENANCY", "countryCode": "<XX>" }`). Then the ceremony statement, with:
   - `registry` and `holder`: the country and the representative;
   - `keyId`, `challengeId` and `publicKeyDigest`;
   - `record`: present, procedure and `performedAt`;
   - `pinnedAttestationKey`: the attestation key's id and public key, from the Platform Owner's ceremony;
   - `cosigner`: `actor` (the Platform Owner, issued by `PLATFORM_CONTROL_PLANE`), `accountableName` and `signingKeyId` (the Platform Owner's `keyId`).

   **The Platform Owner's name enters the country's record only here,** in a statement they sign themselves (fourth amendment).
5. **Both sign the ceremony statement:** the representative with the new key (`holderSignature`), and the Platform Owner with their control-plane key (`cosignature`). The representative also signs the possession and registration statements.
6. **The representative submits** `POST /aab/v1/key-bootstrap-ceremonies` with `publicKey`, the statements, their signatures, the `cosignature` and the `cosignerKeyEvidence`. The country verifies the evidence against the pinned attestation key, and the co-signature with the evidenced key, **with no call outside the country**. The evidence is stored with the ceremony.

## 5. After the ceremonies: registering keys

The representative, as the country's first `KEY_REGISTRAR`, registers other actors' keys, and never their own:
- a `REGISTRATION` challenge for the actor;
- the actor's possession statement, signed with their new key;
- the representative's registration statement, signed with the representative's key.

These are sent as `POST /aab/v1/signing-keys` (`README.md`, "Signing keys (operators)").

A second `KEY_REGISTRAR` is registered the same way. They can then register the representative's next key.

## 6. Rotation

- **A rotation is a new registration naming `replacesKeyId`.** The old key retires at the new key's `activeFrom`.
- **Records signed with the old key stay valid.** A signature is verified against the key its statement names, as at the time the server accepted it.
- **A new statement signed with the retired key is refused,** whatever date it claims (`LINK_SIGNATURE_INVALID`).
- **To stop using a key with no replacement,** its holder retires it: a `RETIRED` event (`POST /aab/v1/signing-keys/:keyId/events`), signed with the key while it is `ACTIVE`. A registrar retires a suspended key.

## 7. Compromise, and notices across the boundary

- **Declaring a compromise:** `POST /aab/v1/signing-keys/:keyId/compromises`.
  - The holder declares unsigned. Their only key is the compromised one, and a declaration never uses it.
  - A registrar or security officer signs the declaration with their own key.
  - An unknown start means the key's whole life. A window can be widened, never narrowed.
- **Records accepted inside the window are `UNDER_COMPROMISE_REVIEW`** and refused at use (`LINK_SIGNATURE_UNDER_REVIEW`) until assessed.
- **Assessing a record:** a `KEY_SECURITY_OFFICER` who is not the key's holder affirms or repudiates it (`POST /aab/v1/key-compromise-assessments`). The record is never removed.
- **A compromise of the Platform Owner's key** is declared in the control plane.
  - Its notice is prepared outside any server: `issuer`, `keyId`, `actorId`, `suspectedExposureFrom`, `recordedAt` (the window's start and end, from the declaration's decision), `attestedAt` and `attestationKeyId`.
  - The attestation key's holder signs the notice.
  - **The operator carries it by hand** to each country, whose security officer records it (`POST /aab/v1/key-compromise-notices`). The country's records co-signed inside the window then go under review.
  - **Until a notice arrives, a country cannot know of the compromise.** That is disclosed.

## 8. Check the result

- **The integrity verifier** (`dist/ops/verify-integrity.js`, run as the database owner) re-checks every registration, event, ceremony, piece of evidence, notice, assessment, link and status record against the key it names, as at its acceptance. Its `keyRegistry` section must report no problems.
- **Back up the country registry** with the environment (`backup/README.md`). The registry is in the database, and a restore re-verifies it.
- **Keep the ceremony's receipt, and a copy of the ceremony record,** where the country keeps its governance records.

## Not covered

- **Private-key custody,** including hardware keys (WP05). The runbook assumes each holder keeps their key safe, and does not govern how.
- **The attestation key's rotation or replacement,** across every country that pinned it (open item).
- **The production bootstrap.** Both first keys are self-attested here, as pilot positions.
- **The channel for notices.** They are carried by hand.
