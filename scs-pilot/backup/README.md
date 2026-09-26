# Backup and restore — SCS pilot

The procedure for backing up one SCS pilot environment and restoring it into a fresh one, for
example on a new host after a disaster. Run the scripts with Node 24 from `scs-pilot/`, on the
host that runs the environment. They drive Docker Compose; the database and object store tools
run inside the environment's own containers, on its internal network.

## What a backup contains

| Part | File | How |
|---|---|---|
| Every role | `database/roles.sql` | `pg_dumpall --roles-only`; passwords as their stored hashes |
| The whole database: every schema, row and database-level grant | `database/database.dump` | `pg_dump --create`, custom format |
| Every object: evidence files and PDF renditions | `objects/<sha256>`, `objects.json` | exported through the S3 API; each file checked against its SHA-256 key |
| The configuration | `config/.env`, `config/static-actors.json`, `config/edge/nginx.conf`, `config/edge/nginx.dev.conf` | copied |
| The source's integrity, before the dump | `source-report.json` | migrations, receipts, packages, files, row counts, grants |
| What was backed up, from which commit | `manifest.json`, `SHA256SUMS` | the SHA-256 of every file |

## Taking a backup

```bash
node backup/backup.mjs --dir . --project scs-pilot --out /path/to/new/backup-directory
```

- **Writers stop while it runs.** The API and the edge are stopped, so the database, the
  object store and the counts are one consistent state. They are started again afterwards,
  also on failure. Expect a short outage.
- **The source is verified first.** If it is not intact, no backup is taken; the report is left
  in the output directory.
- If the environment was started with settings that differ from its `.env`, pass them the same
  way: `--set SCS_API_IMAGE_TAG=...`.

## Keeping it

A backup holds credentials and country data:
- `.env`: the database, object store and API passwords;
- the static actors file: API token digests;
- every record and evidence file.

It is part of the country information boundary (country data egress specification, §6). It must:
- be stored only inside the country, with access restricted to the environment's operators;
- never be committed: `scs-pilot/.gitignore` excludes `backups/`.

The scripts do not encrypt it: `TODO(backup-encryption)`.

## Restoring

On the target host:

1. **Check out the recorded code.** Clone the repository, and check out the commit the backup
   was taken from (`manifest.json`, `source.commit`). The restore refuses any other commit.
2. **Use a fresh project.** The compose project must have no containers and no volumes, and
   the checkout must have no `.env` and no static actors file. Nothing is ever overwritten.
3. **Run the restore:**

   ```bash
   node backup/restore.mjs --backup /path/to/backup-directory --dir . --project scs-pilot --report restore-report.json
   ```

   `--set KEY=VALUE` overrides a `.env` setting for this host only, for example
   `--set API_PORT=3001`, without changing the restored `.env`.

The restore does the following, each step failing closed:
1. It checks every backup file against `SHA256SUMS` and the manifest.
2. It restores the configuration.
3. It starts PostgreSQL and the object store on new, empty volumes.
4. It restores the roles, and replaces the empty database created at first start with the
   backed-up one, including its database-level grants.
5. It imports and reads back every object.
6. It starts the stack. The migrate service must report every migration already applied: it
   checks each recorded checksum and fails closed on any difference.
7. It verifies the restored environment against the source's report:
   - every receipt verifies against its stored digest;
   - every package verifies against its stored digest;
   - every evidence file and rendition re-hashes to its recorded SHA-256;
   - every table's row count and the database grants equal the source's.

## The proof

```bash
node backup/prove-backup-restore.mjs [--ref <git ref>] [--keep]
```

The proof runs the whole procedure on throwaway environments; it never touches an existing
one:
1. It creates a source environment from a checkout at `<ref>`, with throwaway secrets.
2. It creates a governed chain through the API: framework, parties, plot, an evidence file,
   evaluation, review decision, and a package with its PDF.
3. It backs up the source, and restores into a fresh environment.
4. It checks the restored API: the package reads back byte-for-byte, its integrity verification
   is INTACT, and its PDF downloads intact.
5. It checks that a tampered backup, and a restore over an existing environment, are refused.

The CI job `backup-restore` runs it on every pull request.
