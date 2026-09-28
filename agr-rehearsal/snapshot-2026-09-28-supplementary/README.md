# AGR rehearsal: Step 0 supplementary evidence snapshot, 2026-09-28

**This is a read-only evidence record. Nothing in this folder is ever edited after commit.**

It supplements `agr-rehearsal/snapshot-2026-09-28/` and does not change it. That snapshot records the `agriculture`, `platform` and `public` schemas, as its README states. **This supplement records the eight other application schemas of the same database.** The rehearsal's gateway calls five of them, so step 0 of the migration path (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3) needs them to cover the whole rehearsal. Together, the two snapshots record every schema the rehearsal owns.

**It is evidence of what exists, not governed code.** Nothing here is deployed, run or tested from this repository.

- **Date:** 2026-09-28.
- **Snapshot digest:** `9afb6079e2e03df0ff11c6c8a1d340e72d6b94451836a977a12fd2ef8f32d0a1`, the SHA-256 of `SHA256SUMS`. That file lists the SHA-256 of every file under `source-b/`. From this folder, `sha256sum -c SHA256SUMS` checks every file, and `sha256sum SHA256SUMS` gives the snapshot digest.
- **Byte exactness:** `agr-rehearsal/.gitattributes` turns off line-ending conversion for every snapshot folder. Every file in this supplement has LF line endings.
- **Every file, its size and digest, and what was excluded and why:** `MANIFEST.md`.

## Source B supplement (`source-b/`, 57 files)

> Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas that snapshot-2026-09-28 did not record.

- **The database:** Supabase project `kdpcfbaeklkffozryjah`, "AAB WA Clean-Room Rehearsal 20260815", PostgreSQL 17.6.
- **How it was read:** one read-only query over the system catalogs at 2026-09-28 09:04:35 UTC. The query is the same as the first snapshot's, with sequences added. No table row was read.
- **The files:**
  - for each schema, one file each for tables, sequences, views, functions, triggers, row level security and grants;
  - `database.sql`: every non-system schema with its owner and which snapshot records it, the installed extensions, and the event triggers.

  Each file opens with the source label, the read time and that schema's catalog counts. A file for an object kind that the schema lacks says so.

| Schema | Functions | Tables | Views | Sequences | Tables with RLS | Constraints | Indexes | Gateway calls |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `cognitive_core` | 25 | 18 | 1 | 0 | 0 | 157 | 39 | 13 |
| `continuity_core` | 1 | 2 | 1 | 0 | 0 | 6 | 3 | 1 |
| `country_core` | 41 | 72 | 9 | 0 | 71 | 427 | 147 | 37 |
| `manufacturing_core` | 1 | 4 | 1 | 0 | 0 | 29 | 9 | 2 |
| `observation_core` | 22 | 10 | 9 | 0 | 0 | 71 | 28 | 24 |
| `presentation_core` | 0 | 8 | 0 | 1 | 0 | 28 | 15 | 0 |
| `regulatory_core` | 4 | 9 | 1 | 0 | 0 | 40 | 12 | 0 |
| `security_core` | 1 | 2 | 0 | 0 | 0 | 9 | 3 | 0 |

- **"Gateway calls"** counts the references to the schema's objects in the deployed PHP (`snapshot-2026-09-28/source-a/`).
- **No schema has a trigger or a row level security policy.**
- **Row level security is enabled on 71 of these 125 tables,** all of them in `country_core`. The other 54 have it disabled: one in `country_core`, and every table of the other seven schemas.
  - No table or sequence in these schemas grants any privilege to `anon`, `authenticated` or `PUBLIC`.
  - Only `security_core` grants schema `USAGE` to `authenticated`. Its functions and tables grant nothing to browser roles.
  - Functions without an explicit grant keep PostgreSQL's default `EXECUTE` for `PUBLIC`. Without schema `USAGE`, the browser roles cannot reach them. `grants.sql` records every such function.
- **The event trigger `ensure_rls`** belongs to the rehearsal. Its function, `public.rls_auto_enable()`, is in `snapshot-2026-09-28/source-b/public/functions.sql`. The other six event triggers belong to the Supabase platform.
- **The files are a record, not a migration.** They are generated from the catalogs, so they are not guaranteed to replay into a working database in file order. Objects refer to one another across files, schemas and both snapshots.

## Not in this supplement

- **Any table row,** including the configuration rows of `storage.buckets` (two buckets) and `cron.job` (no jobs).
- **The Supabase platform schemas.**
- **What `snapshot-2026-09-28/` already records.**

Details are in `MANIFEST.md`, under "Excluded".
