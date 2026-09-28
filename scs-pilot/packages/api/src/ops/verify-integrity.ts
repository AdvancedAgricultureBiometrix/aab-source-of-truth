// Verifies that an environment's governed evidence chain is intact: used on
// the source before a backup is taken, and on the restored environment after
// a restore. Run inside the api image, on the stack's internal network:
//
//   node dist/ops/verify-integrity.js [--expect <source-report.json>]
//
// It connects as the owner (SCS_VERIFY_DB_HOST, _PORT, _NAME, _USER,
// _PASSWORD) because it must read every table, including the migration
// history, and reaches the object store with the api service's S3_* settings.
// It reads only. Intact means:
//   - migrations: every migration in the image is applied, in order, with the
//     same checksum, and nothing else is;
//   - receipts: every receipt hashes to its recorded digest and names its id;
//   - packages: every package's content hashes to its packageDigest, and its
//     PACKAGE_COMPILATION receipt names that digest;
//   - evidence files: every stored evidence object is in the object store and
//     re-hashes to its SHA-256 and size;
//   - renditions: every rendition's bytes are in the object store and
//     re-hash to its SHA-256 and byte length;
//   - actor–party links (AAB-PLATFORM-04): every link's statement signature is
//     verified against the key its statement names, as at its createdAt, in
//     the public-key registry (AAB-PLATFORM-09); its record is its signed
//     statement; it re-digests to its linkDigest; and its
//     ACTOR_PARTY_LINK_CREATION receipt names that digest. Every status record
//     likewise, as at its recordedAt, against its link's digest. The keys come
//     from the registry in this same database, never from the actors file;
//   - the public-key registry itself (platform/key-registry/integrity.ts):
//     every registration, event, compromise, ceremony, notice and assessment
//     re-digests and names its receipt; every signature on it verifies against
//     the key it names, as at its acceptance; every proof of possession, piece
//     of cross-issuer evidence and notice verifies.
// A signature that is NOT_VERIFIABLE is a problem. One under compromise
// review, affirmed or repudiated is counted, not a problem: the record is
// intact, and its verification result says what it is worth.
// With --expect, the row count of every table and the database-level grants
// must also equal the source's.
//
// Prints a JSON report; exits 1 unless everything holds.

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import pg from "pg";

import { toLink, toStatusRecord, type LinkRow, type StatusRow } from "../capabilities/cap-02/link-store.js";
import { canonicalJson, sha256Hex } from "../foundation/canonical.js";
import type { Tx } from "../foundation/db.js";
import { linkIntegrity, statusRecordIntegrity, type IntegrityResult } from "../platform/actor-subject-links/links.js";
import { verifyRegistryIntegrity, type IntegritySection, type RegistryIntegrity } from "../platform/key-registry/integrity.js";
import { verifyLinkSignature, verifyStatusSignature } from "../platform/key-registry/signed-records.js";
import { keyRegistryReader } from "../platform/key-registry/store.js";
import { DEFAULT_MIGRATIONS_DIR, loadMigrations } from "../migrations/runner.js";
import { objectStoreConfigFromEnv, S3ObjectStore } from "../platform/evidence-objects/object-store.js";

interface Section { checked: number; problems: string[] }
interface Report {
  ok: boolean;
  verifiedAt: string;
  migrations: Section & { expected: number; applied: Array<{ version: string; name: string; checksum: string }> };
  receipts: Section;
  packages: Section;
  evidenceObjects: Section;
  renditions: Section;
  links: IntegritySection;
  linkStatusRecords: IntegritySection;
  keyRegistry: RegistryIntegrity;
  counts: Record<string, number>;
  databaseAcl: string | null;
  comparison?: { source: string; problems: string[] };
}

const need = (name: string) => {
  const v = process.env[name];
  if (v === undefined || v === "") throw new Error(`${name} is not set`);
  return v;
};
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

async function verify(): Promise<Report> {
  const client = new pg.Client({
    host: need("SCS_VERIFY_DB_HOST"),
    port: Number(process.env["SCS_VERIFY_DB_PORT"] ?? 5432),
    database: need("SCS_VERIFY_DB_NAME"),
    user: need("SCS_VERIFY_DB_USER"),
    password: need("SCS_VERIFY_DB_PASSWORD"),
  });
  await client.connect();
  const store = new S3ObjectStore(objectStoreConfigFromEnv());
  try {
    // one snapshot for every database read
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");

    // migrations
    const files = await loadMigrations(process.env["SCS_MIGRATIONS_DIR"] ?? DEFAULT_MIGRATIONS_DIR);
    const applied = (await client.query<{ version: string; name: string; checksum: string }>(
      "SELECT version, name, checksum FROM scs_migration.applied_migration ORDER BY version",
    )).rows;
    const migrationProblems: string[] = [];
    if (applied.length !== files.length) migrationProblems.push(`${applied.length} migrations are recorded as applied; the image has ${files.length}.`);
    files.forEach((f, i) => {
      const a = applied[i];
      if (a === undefined) migrationProblems.push(`${f.name} is not recorded as applied.`);
      else if (a.version !== f.version || a.name !== f.name || a.checksum !== f.checksum) {
        migrationProblems.push(`${f.name}: recorded ${a.version} ${a.name} ${a.checksum.slice(0, 12)}…, image has ${f.version} ${f.name} ${f.checksum.slice(0, 12)}….`);
      }
    });

    // receipts
    const receipts = (await client.query<{ receipt_id: string; receipt: Record<string, unknown>; receipt_digest: string }>(
      "SELECT receipt_id, receipt, receipt_digest FROM scs.decision_receipt ORDER BY receipt_id",
    )).rows;
    const receiptProblems = receipts.flatMap((r) => [
      ...(sha256Hex(canonicalJson(r.receipt)) === r.receipt_digest ? [] : [`receipt ${r.receipt_id} does not hash to its recorded digest.`]),
      ...(r.receipt["receiptId"] === r.receipt_id ? [] : [`receipt ${r.receipt_id} does not name its own id.`]),
    ]);

    // packages
    const packages = (await client.query<{ package_id: string; package: unknown; package_digest: string; recorded: string | null }>(
      `SELECT p.package_id, p.package, p.package_digest,
              (SELECT r.receipt -> 'decision' ->> 'packageDigest' FROM scs.decision_receipt r
                WHERE r.capability_id = 'SCS-CAP-08' AND r.decision_type = 'PACKAGE_COMPILATION' AND r.subject_id = p.package_id) AS recorded
         FROM scs.due_diligence_package p ORDER BY p.package_id`,
    )).rows;
    const packageProblems = packages.flatMap((p) => [
      ...(`sha256:${sha256Hex(canonicalJson(p.package))}` === p.package_digest ? [] : [`package ${p.package_id} does not hash to its packageDigest.`]),
      ...(p.recorded === p.package_digest ? [] : [`package ${p.package_id}: its PACKAGE_COMPILATION receipt names ${p.recorded ?? "no digest"}, not ${p.package_digest}.`]),
    ]);

    // evidence files and renditions
    const objectProblems: string[] = [];
    const objects = (await client.query<{ content_sha256: string; size_bytes: string }>(
      "SELECT content_sha256, size_bytes FROM scs.evidence_object ORDER BY content_sha256",
    )).rows;
    for (const o of objects) {
      const bytes = await store.get(o.content_sha256);
      if (bytes === null) objectProblems.push(`evidence object ${o.content_sha256} is not in the object store.`);
      else if (sha256(bytes) !== o.content_sha256 || bytes.length !== Number(o.size_bytes)) objectProblems.push(`evidence object ${o.content_sha256} does not re-hash to its SHA-256 and size.`);
    }
    const renditionProblems: string[] = [];
    const renditions = (await client.query<{ rendition_id: string; sha256: string; byte_length: string }>(
      "SELECT rendition_id, sha256, byte_length FROM scs.rendition ORDER BY rendition_id",
    )).rows;
    for (const r of renditions) {
      const bytes = await store.get(r.sha256);
      if (bytes === null) renditionProblems.push(`rendition ${r.rendition_id}: its bytes (${r.sha256}) are not in the object store.`);
      else if (sha256(bytes) !== r.sha256 || bytes.length !== Number(r.byte_length)) renditionProblems.push(`rendition ${r.rendition_id} does not re-hash to its SHA-256 and byte length.`);
    }

    // actor–party links and their status records
    const linkRows = (await client.query<LinkRow & { recorded: string | null }>(
      `SELECT l.link_id, l.schema_version, l.created_at, l.created_by, l.link_statement, l.statement_signature, l.link_digest,
              (SELECT r.receipt -> 'decision' ->> 'linkDigest' FROM scs.decision_receipt r
                WHERE r.capability_id = 'SCS-CAP-02' AND r.decision_type = 'ACTOR_PARTY_LINK_CREATION' AND r.subject_id = l.link_id) AS recorded
         FROM scs.actor_party_link l ORDER BY l.link_id`,
    )).rows;
    const statusRows = (await client.query<StatusRow & { recorded: string | null }>(
      `SELECT s.status_record_id, s.link_id, s.schema_version, s.status_statement, s.statement_signature, s.writer_capacity, s.recorded_at, s.written_by, s.record_digest,
              (SELECT r.receipt -> 'decision' ->> 'recordDigest' FROM scs.decision_receipt r
                WHERE r.capability_id = 'SCS-CAP-02' AND r.decision_type = 'ACTOR_PARTY_LINK_STATUS' AND r.subject_id = s.status_record_id) AS recorded
         FROM scs.actor_party_link_status s ORDER BY s.link_id, s.recorded_at, s.status_record_id`,
    )).rows;
    // their signatures, against the public-key registry in this database (AAB-PLATFORM-09)
    const registry = keyRegistryReader(client as unknown as Tx);
    const links: IntegritySection = { checked: linkRows.length, problems: [], verification: {} };
    const linkStatusRecords: IntegritySection = { checked: statusRows.length, problems: [], verification: {} };
    const note = (section: IntegritySection, what: string, r: IntegrityResult, reason: string | undefined) => {
      section.verification[r.signature] = (section.verification[r.signature] ?? 0) + 1;
      if (r.signature === "NOT_VERIFIABLE") section.problems.push(`${what}: its statement signature is NOT_VERIFIABLE (${reason ?? "no reason"}).`);
      if (!r.statementIsRecord) section.problems.push(`${what}: its record differs from its signed statement.`);
      if (!r.digestMatches) section.problems.push(`${what}: it does not re-digest to its recorded digest.`);
    };
    const linksById = new Map(linkRows.map((r) => [r.link_id, toLink(r)]));
    for (const r of linkRows) {
      const link = linksById.get(r.link_id)!;
      const v = await verifyLinkSignature(registry, link);
      note(links, `link ${r.link_id}`, linkIntegrity(link, v.result), v.reason);
      if (r.recorded !== r.link_digest) links.problems.push(`link ${r.link_id}: its ACTOR_PARTY_LINK_CREATION receipt names ${r.recorded ?? "no digest"}, not ${r.link_digest}.`);
    }
    for (const r of statusRows) {
      const record = toStatusRecord(r);
      const v = await verifyStatusSignature(registry, record);
      note(linkStatusRecords, `status record ${r.status_record_id}`, statusRecordIntegrity(record, linksById.get(r.link_id)!, v.result), v.reason);
      if (r.recorded !== r.record_digest) linkStatusRecords.problems.push(`status record ${r.status_record_id}: its ACTOR_PARTY_LINK_STATUS receipt names ${r.recorded ?? "no digest"}, not ${r.record_digest}.`);
    }
    const keyRegistry = await verifyRegistryIntegrity(client as unknown as Tx);

    // row counts and database-level grants
    const tables = (await client.query<{ schema: string; name: string }>(
      `SELECT n.nspname AS schema, c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('scs', 'scs_migration') AND c.relkind IN ('r', 'p') ORDER BY 1, 2`,
    )).rows;
    const counts: Record<string, number> = {};
    for (const t of tables) {
      counts[`${t.schema}.${t.name}`] = Number((await client.query<{ n: string }>(`SELECT count(*) AS n FROM ${t.schema}.${t.name}`)).rows[0]!.n);
    }
    const acl = (await client.query<{ acl: string | null }>("SELECT datacl::text AS acl FROM pg_database WHERE datname = current_database()")).rows[0]!.acl;
    await client.query("COMMIT");

    const report: Report = {
      ok: false,
      verifiedAt: new Date().toISOString(),
      migrations: { expected: files.length, checked: applied.length, applied, problems: migrationProblems },
      receipts: { checked: receipts.length, problems: receiptProblems },
      packages: { checked: packages.length, problems: packageProblems },
      evidenceObjects: { checked: objects.length, problems: objectProblems },
      renditions: { checked: renditions.length, problems: renditionProblems },
      links,
      linkStatusRecords,
      keyRegistry,
      counts,
      databaseAcl: acl,
    };
    return report;
  } finally {
    await client.end();
  }
}

try {
  const expectAt = process.argv.indexOf("--expect");
  const report = await verify();
  if (expectAt !== -1) {
    const path = process.argv[expectAt + 1]!;
    const source = JSON.parse(await readFile(path, "utf8")) as Report;
    const problems: string[] = [];
    for (const k of new Set([...Object.keys(source.counts), ...Object.keys(report.counts)])) {
      if (source.counts[k] !== report.counts[k]) problems.push(`${k}: ${report.counts[k] ?? "missing"} rows, the source had ${source.counts[k] ?? "none"}.`);
    }
    if (source.databaseAcl !== report.databaseAcl) problems.push(`database grants are ${report.databaseAcl}, the source's were ${source.databaseAcl}.`);
    report.comparison = { source: path, problems };
  }
  const sections = [report.migrations, report.receipts, report.packages, report.evidenceObjects, report.renditions, report.links, report.linkStatusRecords, ...Object.values(report.keyRegistry)];
  report.ok = sections.every((s) => s.problems.length === 0) && (report.comparison?.problems.length ?? 0) === 0;
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
} catch (err) {
  console.error(`verify-integrity failed: ${(err as Error).message}`);
  process.exit(1);
}
