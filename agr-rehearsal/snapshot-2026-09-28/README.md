# AGR rehearsal: Step 0 evidence snapshot, 2026-09-28

**This is a read-only evidence record. Nothing in this folder is ever edited after commit.** A later snapshot is a new, separately dated folder, never a change to this one.

It is step 0 of the AGR rehearsal migration path (`governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`, section 8.3): the rehearsal's PHP gateway code and a schema-only export of its database, committed before any contract work. **It is evidence of what exists, not governed code.** Nothing here is deployed, run or tested from this repository. The rehearsal code is a source, not a template (section 8.3, step 4).

- **Date:** 2026-09-28.
- **Snapshot digest:** `a1f2c1e7f5ddb9912989d92c2a276f6d1a11cbb95afac167a2c4c66dff5623a0`, the SHA-256 of `SHA256SUMS`. That file lists the SHA-256 of every file under `source-a/` and `source-b/`. From this folder, `sha256sum -c SHA256SUMS` checks every file, and `sha256sum SHA256SUMS` gives the snapshot digest.
- **Byte exactness:** `agr-rehearsal/.gitattributes` turns off line-ending conversion for the snapshot, so the files keep the bytes they were taken with. Four files have line endings other than LF, kept as they were taken. `php_preflight.php` and `postgresql_health.php` (in `source-a/aab-local/app/_rebuild/api/agriculture/validation/`) are CRLF throughout. `source-a/aab-local/app/_rebuild/api/agriculture/config/PrivateConfigLoader.php` has mixed CRLF and LF endings, as in the bundle. `source-b/agriculture/functions.sql` has mixed endings because some function bodies stored in the database contain CRLF; the lines this snapshot adds are LF.
- **Every file, its size and digest, and what was excluded and why:** `MANIFEST.md`.

## Source A: the deployed rehearsal's PHP (`source-a/`, 29 files)

> Deployed rehearsal, wa-rehearsal.nexiuma.ai. Static files verified against the live site 733 of 733 on 2026-09-28. PHP not verifiable over HTTP. From hPanel download public_html (56).zip.

- The 29 PHP files in that bundle, copied byte for byte at their paths in it, and compared with the bundle after copying.
- The bundle is `public_html (56).zip`, 10,760,930 bytes, SHA-256 `4c3a05f15b0c6f5ac87de8f42bd27ddefe1d912e9d1edabd9db0f8573402e924`.
- The 733 of 733 static file verification was made on 2026-09-28 before this snapshot was assembled. It was not repeated during assembly, and the static files are not in this snapshot.
- The PHP files read their configuration from the environment. They hold no credentials: the only credential-shaped values are the placeholders in `smtp_config.example.php`. `aab-local/app/gate.php` is a 337-byte stub that returns `410 LEGACY_LOCAL_AUTH_RETIRED`.

## Source B: the rehearsal database schema (`source-b/`, 19 files)

> Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.

- **The database:** Supabase project `kdpcfbaeklkffozryjah`, "AAB WA Clean-Room Rehearsal 20260815", PostgreSQL 17.6.
- **How it was read:** one read-only query over the system catalogs at 2026-09-28 07:30:53 UTC. No table row was read.
- **The files:** for each of the `agriculture`, `platform` and `public` schemas, one file each for tables, views, functions, triggers, row level security and grants, and `migrations.sql` for the migration list. Each file opens with the source label, the read time and that schema's catalog counts. A file for an object kind that the schema lacks says so.

| Schema | Functions | Tables | Views | Tables with RLS | Constraints | Triggers | Policies | Indexes |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `agriculture` | 170 | 121 | 65 | 121 | 998 | 80 | 0 | 334 |
| `platform` | 6 | 9 | 3 | 5 | 36 | 0 | 0 | 12 |
| `public` | 35 | 3 | 0 | 3 | 23 | 1 | 0 | 10 |

- **Migrations:** 41, from `20260814230043` to `20260902101859` (14 August to 2 September 2026). Versions and names only: some migrations insert rows, so their statements are not included.
- **Row level security:** enabled on 129 of the 133 tables across the three schemas. The four `platform` tables without it are `domain_registry`, `navigation_item`, `navigation_section` and `participation_request_decision`. None of them grants any privilege to `anon` or `authenticated`. No schema has a row level security policy, so the browser roles reach tables only through functions.
- **The files are a record, not a migration.** They are generated from the catalogs, so they are not guaranteed to replay into a working database in file order. Tables, views and functions refer to one another across files and schemas.

## Not in this snapshot

- **The aab.ag application tree (bundles 55 and 57).** By owner decision on 2026-09-28, it is legacy Airtable-era code, no longer in use, and not the rehearsal.
- **Any table row, the migration statements, and the deployed static files** (`MANIFEST.md`, "Excluded").
