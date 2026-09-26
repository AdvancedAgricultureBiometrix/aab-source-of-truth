# SCS Pilot — Access Isolation Proof — 2026-09-26

**Status:** PROOF RECORD — PILOT STACK
**Authority:** RECORDS WHAT HAS BEEN VERIFIED ABOUT THE ISOLATION OF THE SCS PILOT STACK, ON WHICH PLATFORMS, AND WHAT HAS NOT. Admits no capability, grants no production, commissioning or regulatory authority, and does not satisfy Gate D or close WP05.
**Evidence base:** branch `implementation/scs-vertical-proof`: `d25c935` (the built image), `8c00fc5` (the internal network and the edge container), `46991c3` (the tenant disclosures and the `scs_migration` test). CI run 36225055661 on `8c00fc5` and CI run 36225819409 on `46991c3` (GitHub Actions, `ubuntu-24.04`, Docker 28.0.4, Linux 6.17), and local runs on Docker Desktop (Docker 29.7.2, WSL2 Linux 6.6).

## Scope and verdict

The proof covers four properties of one country environment: the pilot stack defined by
`scs-pilot/docker-compose.yml`.

| Property | Verdict |
|---|---|
| 1. Network isolation: the services cannot reach anything outside the stack | **Proven**, on native Linux (CI) and Docker Desktop |
| 2. Data residency: country data stays in the environment's storage | **Proven at the network level; partly by construction** (see item 2) |
| 3. Role isolation: `scs_api` reaches only what it is granted | **Proven** at the table level; **no organisation-level row filtering** (`TODO(tenant-scope)`) |
| 4. Cross-environment isolation on a shared host | **Not proven; disclosed** (`TODO(tenant-network-policy)`) |

## How it is verified

- **The governed test** is `scs-pilot/isolation/verify-network-isolation.mjs`. It probes the
  running stack from inside every long-running container and from the host, and fails if any
  result departs from the isolation model. Every probe is a TCP connect, a DNS lookup, or a read
  of the container's routing table; no data is sent anywhere.
- **The structural check carries the proof.** A container whose routing table has no default
  route can reach nothing outside its own subnet, on any platform. The connect and DNS probes
  corroborate it.
- **It runs in CI on every pull request** (the `isolation` job): the stack is built from the
  compose files with throwaway secrets generated for the run, verified without and with the
  development override, and removed.
- **Role isolation** is verified by `scs-pilot/packages/api/src/integration/db-security.test.ts`
  in the `test` job.

## The isolation model

| Container | Networks | Route outside | Holds |
|---|---|---|---|
| `postgres` | `internal` only | none | the database (volume `postgres-data`) |
| `seaweedfs` | `internal` only | none | the object store (volume `seaweedfs-data`) |
| `api` | `internal` only | none | nothing persistent; its credentials, from the environment |
| `migrate` | `internal` only | none | nothing; runs the migrations and exits |
| `edge` | `internal` and `edge` | **yes** | nothing: no data, no credentials |

- `internal` is a Docker network declared `internal: true`: Docker gives its containers no
  gateway. `edge` is an ordinary bridge network.
- **The edge container is the one container with an outbound path, and why.** A container on an
  internal-only network cannot publish a port to the host. The edge exists to publish the one
  host port, `127.0.0.1:${API_PORT}`, and forward it to the API. It is nginx 1.30.5 pinned by
  digest, doing TCP forwarding only, with a read-only filesystem.
- **Its configuration is committed and auditable.** It is exactly `scs-pilot/edge/nginx.conf`,
  or `nginx.dev.conf` with the development override. The file is mounted read-only, no
  templating is present, and the running configuration's SHA-256 was checked against the
  committed file.
- **It holds no data and no credentials.** It terminates nothing and inspects nothing; the
  API's own authentication applies to every request that passes through it.
- **Only the API is reachable from the host** in a country deployment (`docker-compose.yml`
  alone). The development override (`docker-compose.dev.yml`) also forwards PostgreSQL and the
  object store to `127.0.0.1`, for the integration tests. The services themselves stay on the
  internal network in both modes.

## Item 1 — Network isolation

**Verified results.** CI run 36225055661 on `8c00fc5`: all 20 required checks passed in both
modes; CI run 36225819409 on `46991c3` passed them again. The Docker Desktop results are from the
local runs.

| Container | Check | Required | Native Linux (CI), base | Native Linux (CI), dev | Docker Desktop |
|---|---|---|---|---|---|
| api, postgres, seaweedfs (each) | default route | none | none | none | none |
| api, postgres, seaweedfs (each) | public address 1.1.1.1:443 | unreachable | unreachable | unreachable | unreachable |
| api, postgres, seaweedfs (each) | public DNS (registry.npmjs.org) | unreachable | unreachable | unreachable | unreachable |
| api, postgres, seaweedfs (each) | `host.docker.internal:3000` | unreachable | unreachable | unreachable | unreachable |
| api | postgres:5432, seaweedfs:8333 | reachable | reachable | reachable | reachable |
| edge | api:3000 | reachable | reachable | reachable | reachable |
| edge | default route | present | present | present | present |
| edge | public address 1.1.1.1:443 | reachable | reachable | reachable | reachable |
| edge | `host.docker.internal:3000` | reported, not required | unreachable | unreachable | **reachable** |
| host | 127.0.0.1:3000 (the API) | reachable | reachable | reachable | reachable |
| host | 127.0.0.1:55433 (PostgreSQL) | base: unreachable; dev: reachable | unreachable | reachable | as required |
| host | 127.0.0.1:9000 (object store) | base: unreachable; dev: reachable | unreachable | reachable | as required |

**What this proves.**
- The API, PostgreSQL and the object store cannot reach the internet or resolve public names.
  From inside the API container, a connection to 1.1.1.1:443 fails at once with `ENETUNREACH`
  (no route), and a public name lookup fails with `EAI_AGAIN`.
- `host.docker.internal` is not reachable from the API, database or object store containers on
  either platform. It is reachable from the edge container on Docker Desktop.
- On native Linux the internal containers' `host.docker.internal` result is the weaker
  evidence, because the name does not resolve there. The absence of a default route is what
  proves they cannot reach the host on every platform.

**What the edge can reach.** The edge has an outbound path to the internet and to the host's
network-facing services on every platform, and to the host's loopback services on Docker
Desktop. On native Linux the edge did not reach `host.docker.internal:3000` in CI: that name is
not defined there, and ports bound to the host's loopback are not reachable from containers.
That result does not show the edge cannot reach the host on Linux. The edge has a default route
there too, so any host service listening on a network-facing interface would be reachable from
it; none was listening in CI.

**Not verified.** The `migrate` container is not probed, because it exits after applying
migrations. It is on the same internal-only network as the services, with no other network.

## Item 2 — Data residency

**Where the data is.**
- Evidence records, receipts, decisions, packages and rendition records are in PostgreSQL
  (volume `postgres-data`).
- Evidence files and PDF renditions are in the object store (volume `seaweedfs-data`).
- Container logs, including the API's request log and the edge's access log, go to Docker's
  `json-file` logging driver on the host.

**What is proven.** None of the containers holding or processing country data has a route
outside the stack (item 1). None of them can send data anywhere except to another container on
the internal network.

**What holds by construction, from review, not a test.**
- The API has no telemetry, analytics or error-reporting dependencies.
- Its only outbound connections are to its configured PostgreSQL and S3 endpoints.
- The edge's access log records client address, protocol, status, byte counts, session time
  and upstream address, and no request content.

**Not proven.**
- That the API's own logs never contain protected content. Error logs can include error
  details, and no test inspects log content.
- Where backups go. That is the subject of the backup-restore proof.

## Item 3 — Role isolation

**Verified** by `db-security.test.ts`, against a database built from every migration. In CI run
36225819409 on `46991c3` the full suite passed, 549 of 549, on native Linux. The tests establish:
- every `scs` table has row-level security enabled;
- `scs_api` has exactly SELECT and INSERT on every `scs` table, and no UPDATE, DELETE,
  TRUNCATE, REFERENCES or TRIGGER;
- PUBLIC has no privileges on any `scs` table;
- `scs_api` is a login role with no elevated attributes (it cannot bypass RLS), owns nothing,
  and is not a member of any role that owns `scs` objects or the database;
- acting as `scs_api`, UPDATE, DELETE, TRUNCATE and DDL are refused;
- migration 004 refuses to run as `scs_api`;
- acting as `scs_api`, SELECT and INSERT on `scs_migration.applied_migration` are refused, and
  `scs_api` has no USAGE on the `scs_migration` schema.

The last test was added in `46991c3` and passed in CI run 36225819409. The CI PostgreSQL server
logged `permission denied for schema scs_migration` for both its SELECT and its INSERT.

**Known gap: `TODO(tenant-scope)`.** The policies are `USING (true)` / `WITH CHECK (true)` for
`scs_api`. They enforce row-level security at the table level, and apply no
organisation-level row filtering. That is sufficient only while a country deployment serves one
organisation. A country deployment with several organisations needs:
- an organisation column on every scoped table;
- policies of the form `USING (organization_id = current_setting('scs.organization_id')::uuid)`;
- the API setting `scs.organization_id` in each transaction.

Not implemented; disclosed.

## Item 4 — Cross-environment isolation on a shared host

**Not proven; disclosed as `TODO(tenant-network-policy)`.**
- The `internal` network isolates the services of one environment from the outside. It does
  not isolate one environment from another on the same host.
- Two environments on one host, each with this architecture, each have an edge container with
  a route outside. They can reach each other through the host's network-facing interfaces, and
  on Docker Desktop through the host's loopback (`host.docker.internal`).
- Isolating them needs infrastructure-level network policy that Docker Compose cannot provide:
  separate hosts, or host firewall or kernel-level network policy.

What is separate between two environments deployed as separate compose projects: their
containers, networks and named volumes, and so their databases and object stores. The compose
file fixes the project name (`name: scs-pilot`) and default host ports, so a second environment
on the same host must be started under its own project name and its own ports.

## This platform's isolation model

This is the isolation model for the pilot's platform: Docker Compose, on Docker Desktop for
development and native Linux Docker in CI.
- On Docker Desktop an internal network is the only Docker setting that blocks a container's
  outbound traffic. Disabling outbound address translation on an ordinary network did not
  block it, and the isolated gateway mode is not supported there.
- A native Linux deployment with kernel-level network policy (host firewall rules, or a
  network policy layer that enforces per-container egress and per-environment separation) would
  be stronger:
  - it could restrict the edge's outbound path to nothing but its forwarding;
  - it could close the path between environments on a shared host.

## Relation to the country data egress specification

`governance/AAB-COUNTRY-DATA-EGRESS-TECHNICAL-CONTROL-SPEC-2026-09-13.md` lists the verification
evidence required before an external institutional partner relies on the non-return claim.

**This proof provides, for the SCS pilot stack:**
- the architecture and network boundaries (item 1 of that list): this record and the compose
  files;
- the inventory of outbound endpoints (item 2): only the edge container has an outbound path,
  and it forwards inbound connections only;
- the telemetry and logging destinations (item 3): none external; container logs on the host;
- the review of outbound communication paths (item 4): API connections to the configured
  PostgreSQL and S3 endpoints only, and no telemetry;
- regression testing on every change (item 12): the `isolation` CI job.

**It does not provide:**
- tests that category-2 data cannot be exported (item 5), beyond the network isolation of item 1
  here;
- canonical-service separation (item 6);
- one country unable to access another's records (item 7): see item 4 here;
- embeddings and model artefacts (item 8): none exist in the pilot;
- backup location and recovery evidence (item 9): the backup-restore proof;
- feedback audit (item 10);
- independent penetration or security review (item 11).

**Public-claim rule.** In line with that specification, nothing in this record supports public
wording stronger than: the SCS pilot's services run on an internal network with no outbound
route, verified by an automated test on every change; isolation between environments on a
shared host is not yet provided.

## What this record does not establish

- It does not establish isolation between environments on a shared host
  (`TODO(tenant-network-policy)`)
- It does not establish organisation-level row isolation within a deployment
  (`TODO(tenant-scope)`)
- It does not establish that logs never contain protected content
- It does not cover backups, which the backup-restore proof addresses
- It is not an independent security review
- It admits no capability, and does not alter commissioning status, satisfy Gate D, close WP05,
  or grant any production, commissioning or regulatory authority
