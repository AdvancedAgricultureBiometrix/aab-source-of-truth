// SCS pilot — backup and restore proof: the whole procedure, end to end, on
// throwaway environments. It never touches an existing environment.
//
//   node backup/prove-backup-restore.mjs [--ref <git ref>] [--work <empty directory>] [--keep]
//
//   1. two git worktrees at <ref> (default HEAD): the source, and the fresh
//      restore target — the code at its recorded version, as an institution
//      would check it out after a disaster
//   2. the source: throwaway secrets and API tokens, the stack started, and a
//      governed chain created through the API — framework, parties, plot, an
//      uploaded evidence file, admitted evidence, evaluation, review decision,
//      and a compiled due diligence package with its PDF rendition
//   3. backup (backup/backup.mjs, from the worktree: the committed script)
//   4. restore into a new compose project with no volumes (backup/restore.mjs),
//      which checks migrations, receipts, packages, files, row counts and
//      grants against the source
//   5. the restored API itself: the package reads back byte-for-byte, its
//      integrity verification is INTACT, and its PDF downloads intact
//   6. refusals: a backup with one altered byte is refused before anything
//      is started, and a restore over an existing environment is refused
//   7. both environments, their image and the worktrees removed, and the
//      backup deleted (it holds throwaway credentials), unless --keep
//
// Writes <work>/proof-report.json and prints it. Exits 1 unless every step holds.

import { spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { git, log, parseArgs, Stack } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const here = dirname(fileURLToPath(import.meta.url));
const repo = git(here, ["rev-parse", "--show-toplevel"]);
const commit = git(repo, ["rev-parse", typeof args.ref === "string" ? args.ref : "HEAD"]);
const run = randomBytes(3).toString("hex");
const work = typeof args.work === "string" ? resolve(args.work) : mkdtempSync(join(tmpdir(), "scs-bkp-"));
mkdirSync(work, { recursive: true });

const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const random = () => randomBytes(24).toString("hex");

// canonical JSON, exactly as src/foundation/canonical.ts
function canonicalJson(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  if (typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

const freePort = () =>
  new Promise((ok) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
  });

const steps = [];
const step = (name, ok, detail) => {
  steps.push({ name, ok, detail });
  log(`${ok ? "PASS" : "FAIL"} ${name}${detail === undefined ? "" : `: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) throw new Error(`proof step failed: ${name}`);
};

function nodeScript(script, scriptArgs) {
  const r = spawnSync(process.execPath, [script, ...scriptArgs], { stdio: ["ignore", "inherit", "inherit"] });
  return r.status === 0;
}

/** Run a script that is expected to refuse; returns whether it did, and what it said. */
function refused(script, scriptArgs) {
  const r = spawnSync(process.execPath, [script, ...scriptArgs], { encoding: "utf8" });
  return { refused: r.status !== 0, output: `${r.stdout}${r.stderr}` };
}

/** The refusal line a script printed, or the end of its output. */
const refusalOf = (output) => output.split(/\r?\n/).find((l) => /^Error: restore refused/.test(l.trim()))?.trim() ?? output.slice(-300);

// ── The API client for the seed and the checks ──────────────────────────────

function client(base, tokens) {
  const call = async (method, path, { body, raw, type, who = "officer" } = {}) => {
    const headers = { authorization: `Bearer ${tokens[who]}` };
    if (method === "POST") {
      headers["content-type"] = type ?? "application/json";
      headers["idempotency-key"] = `proof-${randomUUID()}`;
    }
    const res = await fetch(base + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    const bytes = Buffer.from(await res.arrayBuffer());
    return { status: res.status, headers: res.headers, bytes, json: () => JSON.parse(bytes.toString("utf8")) };
  };
  const created = async (path, body, field, who) => {
    const r = await call("POST", path, { body, who });
    if (r.status !== 201) throw new Error(`POST ${path} → ${r.status}: ${r.bytes.toString("utf8").slice(0, 400)}`);
    return field === undefined ? r.json() : r.json().decision[field];
  };
  return { call, created };
}

const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];
const SCENE = [[101.4, 13.4], [101.6, 13.4], [101.6, 13.6], [101.4, 13.6], [101.4, 13.4]];
const party = (partyType, extra = {}) => ({ partyType, partyName: `Proof ${partyType} ${randomUUID()}`, countryOfRegistration: "TH", identityEvidence: { evidenceIds: [], evidenceLimitations: [] }, ...extra });

/** A governed chain, created through the API: returns what the restored environment must reproduce. */
async function seed(api, stack) {
  const env = stack.env;
  const evidence = randomUUID();
  const farmer = await api.created("/scs/v1/parties", party("NATURAL_PERSON", { identityEvidence: { evidenceIds: [evidence], evidenceLimitations: [] } }), "partyId");
  await api.created(`/scs/v1/parties/${farmer}/verifications`, {
    verificationStatus: "VERIFIED_FOR_DECLARED_SCOPE",
    verificationScope: { scopeDescription: "Legal name", jurisdictionCode: "TH", verifiedAttributes: ["legal name"], excludedFromVerification: [] },
    verifyingAuthority: { authorityId: "TH-DOPA", authorityName: "Department of Provincial Administration", authorityBasis: "Registry check", jurisdictionCode: "TH" },
    verifiedAt: "2026-03-01T00:00:00Z",
    evidenceIds: [evidence],
    limitations: [],
  }, "assessmentId", "verifier");
  const operator = await api.created("/scs/v1/parties", party("LEGAL_ENTITY"), "partyId");
  const reviewerOrg = await api.created("/scs/v1/parties", party("LEGAL_ENTITY"), "partyId");
  const frameworkId = await api.created("/scs/v1/frameworks", {
    applicableLawsAttested: true,
    regulation: { regulationId: `EUDR-${randomUUID()}`, regulationName: "EU Deforestation Regulation", regulationVersion: "consolidated-2024", regulationDate: "2023-05-31", regulatoryAuthority: "European Commission", sourceReference: "Regulation (EU) 2023/1115" },
    scope: { commodityCode: "4001", commodityName: "Commodity 4001", countryOfOrigin: "TH", destinationMarket: "EU", applicableNationalLaws: ["National forestry law"], effectiveFrom: "2025-12-30" },
    evidenceRequirements: {
      deforestationEvidence: { referenceCutoffDate: "2020-12-31", requiredCoverageType: "FULL_PLOT_COVERAGE", acceptedSourceTypes: ["SATELLITE_IMAGE"], minimumResolutionMetres: 10, integrityRequirement: "VERIFIED", authorityConfirmationRequired: false },
      custodyEvidence: { requiredDocumentTypes: [], chainOfCustodyStandards: [], traceabilityDepth: "FULL_CHAIN" },
      plotRequirements: { geolocationRequired: true, landRegistryRequired: false, minimumPlotIdentifierType: "GPS_POLYGON", ownershipVerificationRequired: false },
      sufficiencyThreshold: { allPlotsRegistered: true, allPlotsHaveDeforestationEvidence: true, custodyChainComplete: false, noUnresolvedGaps: true, humanReviewCompleted: true },
      specLimitations: [],
    },
  }, "frameworkId");
  // the evidence specification's id is not returned by the API; this proof reads it from its own throwaway database
  const [specId, regulationVersion] = stack.compose(["exec", "-T", "postgres", "psql", "-U", env.POSTGRES_USER, "-d", env.POSTGRES_DB, "-tAF", "|", "-c",
    `SELECT evidence_spec_id, regulation_version FROM scs.regulatory_framework WHERE framework_id = '${frameworkId}'`]).trim().split("|");
  const plotRes = await api.created("/scs/v1/plots", {
    plot: {
      plotName: "สวนยางบ้านนาสาร",
      countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: farmer, tenureBasis: "CUSTOMARY_INDIVIDUAL_RIGHT", evidenceIds: [], limitations: [] }],
    initialFrameworkAssociations: [{ frameworkId, commodityCode: "4001", associationReason: "EUDR due diligence" }],
  });
  const plotId = plotRes.decision.plotId;
  const associationId = plotRes.decision.frameworkAssociationResults[0].associationId;
  const file = Buffer.concat([Buffer.from("II*\0"), randomBytes(4096)]);
  const upload = await api.call("POST", "/scs/v1/evidence-objects", { raw: file, type: "image/tiff" });
  if (upload.status !== 201) throw new Error(`evidence upload → ${upload.status}`);
  const objectId = sha256(file);
  const evidenceId = await api.created("/scs/v1/deforestation-evidence", {
    plotId,
    frameworkAssociationId: associationId,
    evidenceType: "SATELLITE_IMAGE",
    source: { sourceId: `S2-${randomUUID()}`, sourceOrganizationId: "ESA", sourceReference: "https://dataspace.copernicus.eu/", sourceTitle: "Sentinel-2 L2A" },
    evidenceObject: { objectId, originalObjectReference: "S2B_MSIL2A", contentDigest: objectId, chainOfCustodyComplete: true },
    spatialCoverage: { coverageGeometry: { geometryType: "POLYGON", coordinates: [SCENE], coordinateReferenceSystem: "EPSG:4326" }, spatialResolutionMetres: 10 },
    temporalCoverage: { analysisPeriodStart: "2020-12-31T00:00:00Z", analysisPeriodEnd: "2024-07-01T00:00:00Z", coverageMode: "CHANGE_ANALYSIS", knownGapPeriods: [] },
    analyticalMethod: { methodName: "Forest loss change detection", detectionTarget: "DEFORESTATION", qualityStatus: "ACCEPTABLE" },
    evidenceClaim: { claimType: "NO_DEFORESTATION_DETECTED", claimSummary: "No forest loss detected over the plot.", confidence: "HIGH", limitations: [] },
    coverageAttestation: { attestationProvided: false },
  }, "evidenceId");
  const evalRes = await api.created("/scs/v1/sufficiency-evaluations", {
    subject: { plotIds: [plotId], commodityCode: "4001" },
    framework: { frameworkId, frameworkVersion: regulationVersion, evidenceRequirementSpecId: specId },
    evaluationPeriod: { evaluationEndDate: "2024-06-30", assessmentType: "DEFORESTATION" },
    evidenceScope: { includeQuarantinedEvidence: false },
    requestedAnalysis: ["CONFLICT_DETECTION"],
  });
  const evaluationId = evalRes.decision.evaluationId;
  const e = (await api.call("GET", `/scs/v1/sufficiency-evaluations/${evaluationId}`, { who: "reviewer" })).json();
  if (e.overallState !== "GAPS_REQUIRE_HUMAN_DECISION") throw new Error(`evaluation is ${e.overallState}, not GAPS_REQUIRE_HUMAN_DECISION`);
  const decision = (await api.created("/scs/v1/review-decisions", {
    evaluationId,
    evaluationSnapshotDigest: sha256(canonicalJson(e)),
    frameworkId: e.frameworkId,
    frameworkVersion: e.frameworkVersion,
    commodityCode: e.commodityCode,
    operatorId: operator,
    decisionOutcome: "PROCEED_TO_PACKAGE_COMPILATION",
    reviewReasoning: {
      evaluationSummaryAssessed: `Reviewed evaluation ${evaluationId}.`,
      gapsConsidered: e.allGaps.map((g) => ({ gapId: g.gapId, assessment: `Gap ${g.requirementCode}: accepted as a disclosed pilot limit.` })),
      conflictsConsidered: [],
      limitationsAcknowledged: ["Spatial coverage is not evaluated in the pilot."],
      basisForOutcome: "The disclosed gaps are limits of the pilot.",
    },
    reviewer: { reviewerName: "Proof Reviewer", reviewerOrganizationId: reviewerOrg, reviewerRoleReference: "Independent reviewer", authorityBasis: "Proof run." },
  }, undefined, "reviewer")).decision;
  const compiled = await api.created("/scs/v1/due-diligence-packages", {
    reviewDecisionId: decision.decisionId,
    operatorId: operator,
    frameworkId: e.frameworkId,
    frameworkVersion: e.frameworkVersion,
    commodityCode: e.commodityCode,
    plotIds: [plotId],
    evaluationId,
    deforestationEvidenceIds: [evidenceId],
    custodyEvidenceIds: [],
    packageTitle: "Backup-restore proof package",
  });
  return {
    packageId: compiled.package.compilationMetadata.packageId,
    envelope: compiled.package,
    renditionId: compiled.decision.rendition.renditionId,
    renditionSha256: compiled.decision.rendition.sha256,
    objectId,
  };
}

// ── The proof ───────────────────────────────────────────────────────────────

const tag = `proof-${run}`;
const src = new Stack({ dir: join(work, "source", "scs-pilot"), project: `scs-proof-src-${run}`, overrides: { SCS_API_IMAGE_TAG: tag } });
const dstDir = join(work, "target", "scs-pilot");
const dstProject = `scs-proof-dst-${run}`;
const backupDir = join(work, "backup");
let outcome = "FAILED";
let seeded;
try {
  log(`proof ${run}: commit ${commit}, work ${work}`);
  for (const w of ["source", "target"]) {
    const r = spawnSync("git", ["-C", repo, "-c", "core.longpaths=true", "worktree", "add", "--detach", join(work, w), commit], { encoding: "utf8" });
    if (r.status !== 0) throw new Error(`git worktree add ${w} failed: ${r.stderr}`);
  }

  // the source: throwaway secrets and tokens
  const tokens = { officer: random(), verifier: random(), reviewer: random() };
  const roles = { officer: ["COMPLIANCE_OFFICER"], verifier: ["VERIFICATION_OFFICER"], reviewer: ["REGULATORY_REVIEWER"] };
  writeFileSync(join(src.dir, ".env"), [
    "POSTGRES_DB=scs_pilot", "POSTGRES_USER=scs_owner", `POSTGRES_PASSWORD=${random()}`, "POSTGRES_PORT=5432",
    `SCS_API_DB_PASSWORD=${random()}`, `S3_ACCESS_KEY_ID=${random()}`, `S3_SECRET_ACCESS_KEY=${random()}`, "S3_PORT=9000", "S3_BUCKET=scs-evidence", "API_PORT=3000",
  ].join("\n") + "\n");
  writeFileSync(join(src.dir, "packages/api/config/static-actors.json"), JSON.stringify({
    actors: Object.keys(tokens).map((who) => ({
      tokenSha256: sha256(tokens[who]),
      actor: { actorId: `proof-${who}`, actorType: "HUMAN", roles: roles[who], authenticationMethod: "STATIC_TOKEN" },
    })),
  }, null, 2) + "\n");
  const srcPort = await freePort();
  src.overrides.API_PORT = String(srcPort);
  log("starting the source environment");
  src.compose(["up", "-d", "--build", "--wait"]);
  const srcApi = client(`http://127.0.0.1:${srcPort}`, tokens);

  seeded = await seed(srcApi, src);
  const srcVerify = (await srcApi.call("GET", `/scs/v1/due-diligence-packages/${seeded.packageId}/integrity`)).json();
  step("source: a governed chain created through the API, its package INTACT", srcVerify.integrityStatus === "INTACT", { packageId: seeded.packageId, integrityStatus: srcVerify.integrityStatus });

  // backup, with the committed script
  step("backup", nodeScript(join(src.dir, "backup/backup.mjs"), ["--dir", src.dir, "--project", src.project, "--out", backupDir, "--set", `SCS_API_IMAGE_TAG=${tag}`]));
  const manifest = JSON.parse(readFileSync(join(backupDir, "manifest.json"), "utf8"));
  step("backup: roles, database, objects, configuration and source report all present", ["database/roles.sql", "database/database.dump", "objects.json", "config/.env", "config/static-actors.json", "config/edge/nginx.conf", "config/edge/nginx.dev.conf", "source-report.json"].every((f) => manifest.files.some((x) => x.path === f)), { files: manifest.files.length, objects: manifest.objects.exported });

  // restore into a fresh project, with the committed script
  const dstPort = await freePort();
  const restoreReport = join(work, "restore-report.json");
  const restored = nodeScript(join(dstDir, "backup/restore.mjs"), ["--backup", backupDir, "--dir", dstDir, "--project", dstProject, "--report", restoreReport, "--set", `API_PORT=${dstPort}`, "--set", `SCS_API_IMAGE_TAG=${tag}`]);
  const report = JSON.parse(readFileSync(restoreReport, "utf8"));
  const i = report.integrity;
  step("restore: all migrations already applied, with matching checksums", restored && /0 applied, 0 baselined, \d+ already applied/.test(report.migrateLog) && i.migrations.problems.length === 0, report.migrateLog);
  step("restore: every receipt verifies against its stored digest", i.receipts.checked > 0 && i.receipts.problems.length === 0, { receipts: i.receipts.checked });
  step("restore: every package verifies against its stored digest", i.packages.checked > 0 && i.packages.problems.length === 0, { packages: i.packages.checked });
  step("restore: every evidence file re-hashes to its recorded SHA-256", i.evidenceObjects.checked > 0 && i.evidenceObjects.problems.length === 0, { evidenceObjects: i.evidenceObjects.checked });
  step("restore: every rendition re-hashes to its recorded SHA-256", i.renditions.checked > 0 && i.renditions.problems.length === 0, { renditions: i.renditions.checked });
  step("restore: every table's row count and the database grants equal the source's", i.comparison !== undefined && i.comparison.problems.length === 0, { tables: Object.keys(i.counts).length });

  // the restored API itself
  const dstApi = client(`http://127.0.0.1:${dstPort}`, tokens);
  const read = (await dstApi.call("GET", `/scs/v1/due-diligence-packages/${seeded.packageId}`)).json();
  step("restored API: the package reads back byte-for-byte as compiled", canonicalJson(read.envelope) === canonicalJson(seeded.envelope), { packageDigest: read.envelope.packageDigest, currency: read.currency.status });
  const v = (await dstApi.call("GET", `/scs/v1/due-diligence-packages/${seeded.packageId}/integrity`, { who: "reviewer" })).json();
  step("restored API: verifyPackageIntegrity is INTACT, every check PASS", v.integrityStatus === "INTACT" && v.checks.every((c) => c.result === "PASS"), { integrityStatus: v.integrityStatus, checks: v.checks.length });
  const pdf = await dstApi.call("GET", `/scs/v1/renditions/${seeded.renditionId}`);
  step("restored API: the PDF rendition downloads and re-hashes to its recorded SHA-256", pdf.status === 200 && sha256(pdf.bytes) === seeded.renditionSha256, { bytes: pdf.bytes.length });

  // refusals
  const tampered = join(work, "backup-tampered");
  cpSync(backupDir, tampered, { recursive: true });
  const file = join(tampered, "objects", seeded.objectId);
  const bytes = readFileSync(file);
  bytes.writeUInt8(bytes.readUInt8(bytes.length - 1) ^ 0xff, bytes.length - 1);
  writeFileSync(file, bytes);
  const untouched = `scs-proof-refused-${run}`;
  const t = refused(join(dstDir, "backup/restore.mjs"), ["--backup", tampered, "--dir", dstDir, "--project", untouched, "--set", `SCS_API_IMAGE_TAG=${tag}`]);
  const left = new Stack({ dir: dstDir, project: untouched }).resources();
  step("refused: a backup with one altered byte, before anything is started", t.refused && /objects\/[0-9a-f]{64} does not match SHA256SUMS/.test(t.output) && left.containers.length === 0 && left.volumes.length === 0,
    refusalOf(t.output));
  rmSync(tampered, { recursive: true, force: true });
  const x = refused(join(dstDir, "backup/restore.mjs"), ["--backup", backupDir, "--dir", dstDir, "--project", dstProject, "--set", `SCS_API_IMAGE_TAG=${tag}`]);
  step("refused: a restore over an existing environment", x.refused && /is not fresh/.test(x.output), refusalOf(x.output));
  outcome = "PROVEN";
} catch (err) {
  log(`proof failed: ${err.message}`);
} finally {
  const proof = { proof: "scs-pilot backup and restore", outcome, commit, run, at: new Date().toISOString(), steps };
  writeFileSync(join(work, "proof-report.json"), JSON.stringify(proof, null, 2) + "\n");
  console.log(JSON.stringify(proof, null, 2));
  if (args.keep === true) {
    log(`kept: ${work} (projects ${src.project}, ${dstProject}; the backup holds throwaway credentials)`);
  } else {
    log("removing the proof environments, image, worktrees and backup");
    for (const [dir, project] of [[src.dir, src.project], [dstDir, dstProject]]) {
      spawnSync("docker", ["compose", "-p", project, "--project-directory", dir, "-f", join(dir, "docker-compose.yml"), "down", "-v", "--remove-orphans"], { stdio: "ignore", env: { ...process.env, SCS_API_IMAGE_TAG: tag } });
    }
    spawnSync("docker", ["image", "rm", "-f", `scs-pilot-api:${tag}`], { stdio: "ignore" });
    for (const w of ["source", "target"]) spawnSync("git", ["-C", repo, "-c", "core.longpaths=true", "worktree", "remove", "--force", join(work, w)], { stdio: "ignore" });
    spawnSync("git", ["-C", repo, "worktree", "prune"], { stdio: "ignore" });
    rmSync(backupDir, { recursive: true, force: true });
  }
  process.exit(outcome === "PROVEN" ? 0 : 1);
}
