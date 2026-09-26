# SCS pilot — vertical proof

The Supply Chain Sovereignty pilot: the SCS vertical proof, merged to `main` in PRs #22 to #25. It implements SCS-CAP-01 to SCS-CAP-06, SCS-CAP-08 and SCS-CAP-09, each for its minimum vertical slice, with SCS-PLATFORM-01 (evidence object store) and SCS-PLATFORM-02 (governed document rendition). Each capability README records which operations are built and what is proven. Every capability remains `PROPOSED_NOT_ADMITTED`; nothing here is admitted or commissioned. Current state across the platform: `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`.

| Path | What it is |
|---|---|
| `docker-compose.yml` | Local stack: PostgreSQL 17, the migration runner, SeaweedFS (S3-compatible: the evidence object store), and the API |
| `.env.example` | Every environment variable, with placeholder values only |
| `packages/api` | Node.js 24 + TypeScript API. Serves `GET /health` and the capability and platform routes; anything else gets the canonical 404 envelope |
| `packages/api/src/capabilities/` | Capability code, one folder per capability; `README.md` there sets out the pattern every capability follows, with `cap-01/` as the reference implementation |
| `packages/api/src/foundation/` | Shared runtime used by every capability: `server.ts` (node:http routing, parsing, responses), `errors.ts` (canonical failure envelope), `correlation.ts` (correlation IDs, JSON logs), `validation.ts` (strict Ajv), `auth.ts` (bearer token → ActorReference), `db.ts` (restricted-role pool, startup guard, transactions), `receipts.ts` (immutable decision receipts), `idempotency.ts` (Idempotency-Key replay and conflict), `canonical.ts` (canonical JSON, SHA-256) |
| `packages/api/src/platform/` | SCS-PLATFORM-01 (`evidence-objects/`) and SCS-PLATFORM-02 (`renditions/`) |
| `packages/api/src/ops/` | Operator tools built into the image: `object-store-archive.ts` (export and import) and `verify-integrity.ts` (the integrity check used by backup and restore) |
| `packages/api/src/schemas/` | JSON Schemas for every request, record and receipt, and the shared ActorReference (pilot definition) |
| `packages/api/src/types/` | TypeScript types **generated** from the schemas (`npm run generate:types`). Never edit these by hand; `npm test` fails if they drift |
| `packages/api/src/capabilities/cap-NN` | One folder per capability (01 to 06, 08, 09), each with a README linking its canonical contract and recording what is built and proven |
| `packages/db/schema/cap-NN.sql` | Current-state definition of each capability's tables |
| `packages/db/schema/platform.sql` | Current-state definition of the platform tables: the append-only `decision_receipt` and `idempotency_record`, evidence objects and renditions |
| `packages/db/schema/roles-rls.sql` | Current-state definition of the `scs_api` role, grants and row-level security |
| `packages/db/migrations/` | Applied history, 001–019. Committed migrations are immutable |
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

The API connects only as `scs_api`, and refuses to start if its database role is a superuser, can bypass row-level security, can create roles or databases, or owns anything in the database. It also refuses to start without a valid static actors file; the example file in the repository is rejected until its placeholder hashes are replaced.

## Tests

```bash
cd packages/api
SCS_TEST_ADMIN_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres npm test
```

The integration tests need a superuser connection to a **disposable** PostgreSQL 17 instance. They create and drop their own databases and roles. Without the variable they fail; they are never skipped. Test files build their databases one at a time, because migration 004 alters the instance-wide role `scs_api`, then run in parallel.

## Database standard

Every governed record gets a `uuid` primary key, generated by the database by default. Every identifier (table, column, constraint, index) is at most 63 characters, because PostgreSQL silently truncates longer names. When a contract field name is too long, the column is shortened and the full contract name is given in a comment beside it. The contracts say `string` for identifiers only because TypeScript has no uuid type. Every SCS table follows this, starting with CAP-01.

## Deliberately not done yet

- **Done in migration 004:** the `scs_api` application role, which has SELECT + INSERT only, and row-level security on every table. Operations that change rows get column-level UPDATE grants in their own migrations.
- **TODO(actor-reference):** `ActorReference` has a pilot JSON Schema (`src/schemas/shared/actor-reference.schema.json`), because no contract defines it. It needs confirming in a shared contract before any capability is admitted.
- **TODO(idempotency-retention):** idempotency records are never expired.
- **TODO(oidc):** authentication uses static bearer tokens (SHA-256 hashes in a file). OIDC will replace them behind the same `Authenticator` interface without changing any capability code.
- **TODO(tenant-scope):** row-level security is enabled on every `scs` table, but the policies are `USING (true)` / `WITH CHECK (true)` for `scs_api`: they enforce RLS at the table level and apply no organisation-level row filtering. That is sufficient only while each country deployment serves one organisation. A country deployment with several organisations would need policies of the form `USING (organization_id = current_setting('scs.organization_id')::uuid)`, an organisation column on every scoped table, and the API setting `scs.organization_id` per transaction. Not implemented; disclosed as a known gap.
- **TODO(tenant-network-policy):** the `internal` network isolates the services from the outside, not one environment from another on the same host. The edge container has a route outside, so two environments on one host, each with this architecture, can still reach each other through the host's network-facing interfaces (and, on Docker Desktop, through `host.docker.internal`). Cross-environment isolation on a shared host needs infrastructure-level network policy that Docker Compose cannot provide: separate hosts, or a host firewall or kernel-level network policy. Not fixed; disclosed.
- **TODO(immutability):** `scs_api` can't change the CAP-01 evidence specification, and UPDATE will never be granted on those columns. The owner still can.
- **TODO(append-only):** CAP-01 `versionHistory` must be append-only. It is stored as a JSON array until the vertical proof works end to end, and its own insert-only table is the long-term answer.
- **Verified 24 Sep 2026, Docker end to end (was TODO(docker-e2e)):** on first start the init scripts applied migrations 001→005 in order and set the `scs_api` password. The API passed its role check as `scs_api` and `/health` returned 200. `scs_api` logs in with scram-sha-256 from outside the container, and wrong or missing passwords are refused. The full `npm test` (83 tests, security suite included) passes against the containerised PostgreSQL. If port 5432 is already in use on the host, for example by a native PostgreSQL, run `POSTGRES_PORT=55433 docker compose up -d`.
- **Migration runner (was TODO(migration-runner)):** the `migrate` service runs on every start, before the api. It applies any pending migration in order as the owner role, and each migration runs in one transaction with its history record. It fails closed if an applied migration's file has changed or is missing, and it refuses to run as `scs_api`. A volume built by the old first-start init hook must be baselined once: `docker compose run --rm migrate node dist/migrations/cli.js --baseline 011`. The `api` and `migrate` services run the image built from `packages/api/Dockerfile`: dependencies are installed and the code compiled at build time, and nothing is installed or fetched at start (`docker compose up -d --build` after a code or migration change).
