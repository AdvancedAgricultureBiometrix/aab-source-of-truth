# SCS pilot — vertical proof

The Supply Chain Sovereignty pilot: the SCS vertical proof, merged to `main` in PRs #22 to #25. It implements SCS-CAP-01 to SCS-CAP-06, SCS-CAP-08 and SCS-CAP-09, each for its minimum vertical slice, with AAB-PLATFORM-01 (evidence object store) and AAB-PLATFORM-02 (governed document rendition). Each capability README records which operations are built and what is proven. Every capability remains `PROPOSED_NOT_ADMITTED`; nothing here is admitted or commissioned. Current state across the platform: `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`.

| Path | What it is |
|---|---|
| `docker-compose.yml` | Local stack: PostgreSQL 17, the migration runner, SeaweedFS (S3-compatible: the evidence object store, locked with Object Lock, with three identities: admin, api and backup), the object store setup step (`objectstore-init`), and the API |
| `.env.example` | Every environment variable, with placeholder values only |
| `packages/api` | Node.js 24 + TypeScript API. Serves `GET /health` and the capability and platform routes; anything else gets the canonical 404 envelope |
| `packages/api/src/capabilities/` | Capability code, one folder per capability; `README.md` there sets out the pattern every capability follows, with `cap-01/` as the reference implementation |
| `packages/api/src/foundation/` | Shared runtime used by every capability: `server.ts` (node:http routing, parsing, responses), `errors.ts` (canonical failure envelope), `correlation.ts` (correlation IDs, JSON logs), `validation.ts` (strict Ajv), `auth.ts` (bearer token → ActorReference version 2), `actor.ts` (reading either ActorReference version: `holdsRole`, `sameActor`), `signatures.ts` (Ed25519 verification of signed statements), `db.ts` (restricted-role pool, startup guard, transactions), `receipts.ts` (immutable decision receipts), `idempotency.ts` (Idempotency-Key replay and conflict), `canonical.ts` (canonical JSON, SHA-256) |
| `packages/api/src/platform/` | AAB-PLATFORM-01 (`evidence-objects/`) and AAB-PLATFORM-02 (`renditions/`) |
| `packages/api/src/ops/` | Operator tools built into the image: `object-store-archive.ts` (export and import) and `verify-integrity.ts` (the integrity check used by backup and restore) |
| `packages/api/src/schemas/` | JSON Schemas for every request, record and receipt, and the shared ActorReference (versions 1 and 2, AAB-PLATFORM-03) |
| `packages/api/src/types/` | TypeScript types **generated** from the schemas (`npm run generate:types`). Never edit these by hand; `npm test` fails if they drift |
| `packages/api/src/capabilities/cap-NN` | One folder per capability (01 to 06, 08, 09), each with a README linking its canonical contract and recording what is built and proven |
| `packages/db/schema/cap-NN.sql` | Current-state definition of each capability's tables |
| `packages/db/schema/platform.sql` | Current-state definition of the platform tables: the append-only `decision_receipt` and `idempotency_record`, evidence objects and renditions |
| `packages/db/schema/roles-rls.sql` | Current-state definition of the `scs_api` role, grants and row-level security |
| `packages/db/migrations/` | Applied history, 001–025. Committed migrations are immutable. 025 lets receipts carry AAB landscape capability identifiers (`CAP-01` to `CAP-99`, except the retired `CAP-29`) and platform contract identifiers (`AAB-PLATFORM-NN`), by pattern: a format check only, which makes no capability canonical |
| `edge/`, `isolation/` | The edge container's committed nginx configuration, and the network isolation check (see the access isolation proof) |
| `backup/` | The backup and restore procedure and its proof (see its README) |
| `packages/api/src/migrations/` | The migration runner (`npm run migrate`, the `migrate` service): applies pending migrations in order as the owner role, records them in `scs_migration.applied_migration`, then sets the `scs_api` password |

## Run locally

```bash
cp .env.example .env    # set every change-me value, including SCS_API_DB_PASSWORD
cp packages/api/config/static-actors.example.json packages/api/config/static-actors.json
# replace each tokenSha256 with the SHA-256 of a random token of at least 32 characters
docker compose up -d --build
curl http://127.0.0.1:3000/health
```

After changing API code or a migration, rebuild: `docker compose up -d --build`. The API runs from an image built from `packages/api/Dockerfile`; it installs and fetches nothing at start.

The API, PostgreSQL and the object store are on an internal network with no route outside (`internal: true`): they cannot reach the internet, public DNS or services on the host. The edge container (nginx, TCP forwarding only) is the one container with a route outside, and it publishes the only host port, the API on `127.0.0.1:${API_PORT}`. For the integration tests, which need PostgreSQL and the object store on the host, add the development override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
node isolation/verify-network-isolation.mjs dev    # or: base, without the override
```

The API connects only as `scs_api`, and refuses to start if its database role is a superuser, can bypass row-level security, can create roles or databases, or owns anything in the database. It also refuses to start without a valid static actors file, and without `SCS_ACTOR_ISSUER_COUNTRY`; the example file in the repository is rejected until its placeholder hashes are replaced.

**The object store (AAB-PLATFORM-01, amendment of 2026-09-28).**
- **Three identities, each with its own credential in `.env`:**
  - **admin:** given only to `seaweedfs` and the `objectstore-init` setup step;
  - **api:** read and write on the evidence bucket only;
  - **backup:** read and list only.

  `seaweedfs/start.sh` refuses to start on a missing, placeholder, short or shared credential, and on any `S3_OVERRIDE_*` value. The override credential is never configured in the store; its custodian holds it.
- **`objectstore-init` runs on every start, before the API.** It creates the evidence bucket with Object Lock (GOVERNANCE mode, 2,192 days) and a bucket policy that denies the API every delete and every lock, retention and policy change. It names the API by ARN, because a bare name is silently not enforced. It then verifies all of it, and refuses an existing bucket that differs: a drifted lock or policy is a security incident, never repaired automatically.
- **The API refuses to start unless** the bucket is locked as required, its credential is the scoped one (a listing must be refused), and the policy is enforced. Every read from the store is re-hashed against its key.
- **A local stack created before this change** has an unlocked bucket, which `objectstore-init` refuses. The pilot holds no real data: remove the object store volume and start again, with `docker compose down` and then `docker volume rm scs-pilot_seaweedfs-data`.

## Tests

```bash
cd packages/api
SCS_TEST_ADMIN_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres npm test
```

The object store tests also need a **disposable** SeaweedFS: `SCS_TEST_S3_ENDPOINT` and the admin credential, plus the two scoped test identities for the locked-bucket tests (`.env.example`, "Tests"). With `docker-compose.dev.yml`, setting `SCS_TEST_S3_API_*` and `SCS_TEST_S3_BACKUP_*` adds those identities to the stack's store, scoped to `scs-idt-*` buckets. The country stack never has them.

The integration tests need a superuser connection to a **disposable** PostgreSQL 17 instance. They create and drop their own databases and roles. Without the variable they fail; they are never skipped. Test files build their databases one at a time, because migration 004 alters the instance-wide role `scs_api`, then run in parallel.

## Database standard

Every governed record gets a `uuid` primary key, generated by the database by default. Every identifier (table, column, constraint, index) is at most 63 characters, because PostgreSQL silently truncates longer names. When a contract field name is too long, the column is shortened and the full contract name is given in a comment beside it. The contracts say `string` for identifiers only because TypeScript has no uuid type. Every SCS table follows this, starting with CAP-01.

## Deliberately not done yet

- **Done in migration 004:** the `scs_api` application role, which has SELECT + INSERT only, and row-level security on every table. Operations that change rows get column-level UPDATE grants in their own migrations.
- **TODO(actor-reference):** `ActorReference` is defined by AAB-PLATFORM-03 (`governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`), which is proposed, not admitted. Version 2 is implemented: every new record names its actor with a version 2 reference, and records stored earlier keep their version 1 references, unchanged and readable. Representation under a mandate (`representation`) is specified and not built.

## Signing keys (operators)

Link creation and link status records are governance decisions: the named person who makes one signs it, outside the server, with their own Ed25519 key. The server holds only public keys, **in the public-key registry** (AAB-PLATFORM-09, `/aab/v1/`), never in the actors file. How a link officer, or a party's authority representative, gets a key:

1. **The person generates a key pair, on their own machine.** The private key never leaves it.
   ```bash
   node -e "const {generateKeyPairSync}=require('crypto');const k=generateKeyPairSync('ed25519');require('fs').writeFileSync('signing-key.pem',k.privateKey.export({format:'pem',type:'pkcs8'}),{mode:0o600});console.log(k.publicKey.export({format:'der',type:'spki'}).toString('base64'))"
   ```
   It writes the private key to `signing-key.pem` and prints the public key, in base64 SPKI DER.
2. **The operator adds the person's name to their entry in the actors file:** `"accountableName": "<name as the issuer records it>"`. For a party's authority representative, or a representative who submits for a party, add the grant for that party: `"subjectGrants": [{ "role": "PARTY_AUTHORITY_REPRESENTATIVE", "scopeId": "SCS:PARTY:<partyId>" }]` (or `PARTY_REPRESENTATIVE`). The API refuses to start if any of it is malformed, **or if an entry still carries a `signingPublicKey`**: keys are not read from the actors file.
3. **A registration authority (`KEY_REGISTRAR`), who is not the person, registers the key:** a challenge (`POST /aab/v1/key-registration-challenges`), the person's proof of possession signed over its nonce, and the authority's signed registration (`POST /aab/v1/signing-keys`). A deployment's registry is started once, by a bootstrap ceremony (`POST /aab/v1/key-bootstrap-ceremonies`, AAB-PLATFORM-09 section 3a). How to perform both ceremonies, the Platform Owner's and a country's, is in `KEY-BOOTSTRAP-CEREMONY-RUNBOOK.md`.
4. **The person signs each statement before submitting it,** as version 2 (AAB-PLATFORM-04, third amendment): the statement carries `"statementVersion": "2"` and `"signingKeyId": "<their keyId>"`, and the Ed25519 signature, in base64, over its canonical JSON (keys sorted, no whitespace; `src/foundation/canonical.ts`) is sent as `statementSignature` beside it. A version 1 statement is refused.
   ```bash
   node -e "const c=(v)=>Array.isArray(v)?'['+v.map(c).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+c(v[k])).join(',')+'}':JSON.stringify(v);const {sign,createPrivateKey}=require('crypto');const fs=require('fs');console.log(sign(null,Buffer.from(c(JSON.parse(fs.readFileSync('statement.json','utf8'))),'utf8'),createPrivateKey(fs.readFileSync('signing-key.pem'))).toString('base64'))"
   ```
5. **Rotating a key** is a new registration naming the key it replaces (`replacesKeyId`). Records signed with the old key stay valid, and a new statement signed with it is refused: a signature is verified against the key its statement names, as at the time the server accepted it. A key that may have been stolen is declared compromised (`POST /aab/v1/signing-keys/:keyId/compromises`); the records it signed inside the exposure window are refused at use until a security officer assesses them.
6. **Backups carry the registry,** in the database, so a restored environment verifies every signature, and the registry itself, with no actors file (`ops/verify-integrity.ts`).

## Actor identity in the pilot

Recorded on 2026-09-27, from the representation-path build plan's decisions.
- **The issuer is a country tenancy.** Every ActorReference the pilot records names `issuer: { issuerType: COUNTRY_TENANCY, countryCode }`, with the country from `SCS_ACTOR_ISSUER_COUNTRY`. There is no default, and the API refuses to start without it. The pilot has one issuer per deployment; with several countries, the issuer becomes per-deployment configuration.
- **Authority comes from the actors file.** Each role in an actor's `roles` becomes a grant with `scopeType: DEPLOYMENT` and `scopeId: SCS-PILOT-<country>`. Each entry in `subjectGrants` becomes a grant for one subject (`scopeType: SUBJECT`, for example `SCS:PARTY:<partyId>`). No grant has a `grantId`. Pilot limitation: these grants are operator configuration, not signed, evidenced or receipted (SCS-CAP-02).
- **`accountableName`** is optional per human actor in the actors file. It is not put into every reference: the name is personal data, recorded only on governance decisions. **Signing keys are not in the actors file:** they are registered in the public-key registry (AAB-PLATFORM-09), and a `signingPublicKey` there stops the API from starting. The person signs outside the server with their own private key; the server holds only public keys.
- **`organizationId` is refused** in the actors file: version 2 has no such field. An actor acts for an organisation through an actor–party link (AAB-PLATFORM-04).
- **Readers never read `roles` or `issuer` directly.** `holdsRole` and `sameActor` (`src/foundation/actor.ts`) read both versions: a version 1 reference's roles count as deployment-wide grants, and it is the same actor as a version 2 reference with the same `actorId`.
- **Signing-key history is built and proven** (AAB-PLATFORM-09; `SIGNING-KEY-HISTORY-BUILD-PLAN.md`). Keys are held in the public-key registry with their history, and every signature is verified against the key its statement names, as at the time the server accepted it. The four conditions of the contract's section 11 (rotation, restoration, compromise, cross-issuer evidence) are proven, test by test, in `governance/workstream-b/AAB-PLATFORM-09-KEY-REGISTRY-PROOF-2026-09-28.md`, which replaces `TODO(signing-key-history)` as the condition for real data. The proof record states its limits; the ceremonies are in `KEY-BOOTSTRAP-CEREMONY-RUNBOOK.md`.
- **TODO(idempotency-retention):** idempotency records are never expired.
- **TODO(multi-issuer-idempotency):** idempotency keys are scoped by `actorId`, which is unique while a deployment has one identity issuer. When a second issuer first acts in a deployment, keys become (`issuer`, `actorId`), by a migration defined at that point (`governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`, section 4).
- **TODO(oidc):** authentication uses static bearer tokens (SHA-256 hashes in a file). OIDC will replace them behind the same `Authenticator` interface without changing any capability code.
- **TODO(tenant-scope):** row-level security is enabled on every `scs` table, but the policies are `USING (true)` / `WITH CHECK (true)` for `scs_api`: they enforce RLS at the table level and apply no organisation-level row filtering. That is sufficient only while each country deployment serves one organisation. A country deployment with several organisations would need policies of the form `USING (organization_id = current_setting('scs.organization_id')::uuid)`, an organisation column on every scoped table, and the API setting `scs.organization_id` per transaction. Not implemented; disclosed as a known gap.
- **TODO(tenant-network-policy):** the `internal` network isolates the services from the outside, not one environment from another on the same host. The edge container has a route outside, so two environments on one host, each with this architecture, can still reach each other through the host's network-facing interfaces (and, on Docker Desktop, through `host.docker.internal`). Cross-environment isolation on a shared host needs infrastructure-level network policy that Docker Compose cannot provide: separate hosts, or a host firewall or kernel-level network policy. Not fixed; disclosed.
- **TODO(immutability):** `scs_api` can't change the CAP-01 evidence specification, and UPDATE will never be granted on those columns. The owner still can.
- **TODO(append-only):** CAP-01 `versionHistory` must be append-only. It is stored as a JSON array until the vertical proof works end to end, and its own insert-only table is the long-term answer.
- **Verified 24 Sep 2026, Docker end to end (was TODO(docker-e2e)):** on first start the init scripts applied migrations 001→005 in order and set the `scs_api` password. The API passed its role check as `scs_api` and `/health` returned 200. `scs_api` logs in with scram-sha-256 from outside the container, and wrong or missing passwords are refused. The full `npm test` (83 tests, security suite included) passes against the containerised PostgreSQL. If port 5432 is already in use on the host, for example by a native PostgreSQL, run `POSTGRES_PORT=55433 docker compose up -d`.
- **Migration runner (was TODO(migration-runner)):** the `migrate` service runs on every start, before the api. It applies any pending migration in order as the owner role, and each migration runs in one transaction with its history record. It fails closed if an applied migration's file has changed or is missing, and it refuses to run as `scs_api`. A volume built by the old first-start init hook must be baselined once: `docker compose run --rm migrate node dist/migrations/cli.js --baseline 011`. The `api` and `migrate` services run the image built from `packages/api/Dockerfile`: dependencies are installed and the code compiled at build time, and nothing is installed or fetched at start (`docker compose up -d --build` after a code or migration change).
