// Migration 014: the SCS-CAP-05 custody event tables, tested against a
// database built from every migration. Parties, the framework and a plot are
// registered through the API; event rows are inserted directly (the CAP-05
// endpoint is not built yet). Grants and RLS are covered by
// db-security.test.ts, which checks every scs table.

import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

import { CAPABILITY_ROUTES } from "../capabilities/index.js";
import { StaticTokenAuthenticator } from "../foundation/auth.js";
import { connectDatabase, type Database } from "../foundation/db.js";
import { createApiServer } from "../foundation/server.js";
import { frameworkRequest, partyRequest } from "./fixtures.js";
import { createMigratedDatabase, type MigratedDatabase } from "./harness.js";

const TOKEN = "custody-schema-officer-token-0123456789";
const ACTOR = { actorId: "officer-custody-schema", actorType: "HUMAN", roles: ["COMPLIANCE_OFFICER"], authenticationMethod: "STATIC_TOKEN" };
const ACTOR_JSON = JSON.stringify(ACTOR);
const SQUARE = [[101.5, 13.5], [101.501, 13.5], [101.501, 13.501], [101.5, 13.501], [101.5, 13.5]];

let harness: MigratedDatabase;
let api: Database;
let server: Server;
let base = "";
let farmer = "";
let collector = "";
let plotId = "";
let framework = { frameworkId: "", specId: "" };

async function post(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json", "idempotency-key": `custody-schema-${randomUUID()}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  assert.ok(res.status === 201, `${path}: ${res.status} ${JSON.stringify(json)}`);
  return json["decision"] as Record<string, unknown>;
}

async function registerFramework(): Promise<{ frameworkId: string; specId: string }> {
  const frameworkId = (await post("/scs/v1/frameworks", frameworkRequest()))["frameworkId"] as string;
  const specId = (await harness.admin.query<{ evidence_spec_id: string }>(`SELECT evidence_spec_id FROM scs.regulatory_framework WHERE framework_id = $1`, [frameworkId])).rows[0]!.evidence_spec_id;
  return { frameworkId, specId };
}

/** An evidence object row, inserted as the owner; returns its digest. */
async function storedObject(): Promise<string> {
  const digest = createHash("sha256").update(randomUUID()).digest("hex");
  await harness.admin.query(
    `INSERT INTO scs.evidence_object (content_sha256, size_bytes, media_type, storage_bucket, storage_key, stored_by) VALUES ($1, 10, 'application/pdf', 'b', $1, $2)`,
    [digest, ACTOR_JSON],
  );
  return digest;
}

before(async () => {
  harness = await createMigratedDatabase();
  const role = await harness.createLoginRole("NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS IN ROLE scs_api");
  api = await connectDatabase(harness.configFor(role.user, role.password));
  const authenticator = StaticTokenAuthenticator.fromConfig({ actors: [{ tokenSha256: createHash("sha256").update(TOKEN).digest("hex"), actor: ACTOR }] });
  server = createApiServer({ routes: CAPABILITY_ROUTES, authenticator, db: api });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  farmer = (await post("/scs/v1/parties", partyRequest("NATURAL_PERSON")))["partyId"] as string;
  collector = (await post("/scs/v1/parties", partyRequest("COOPERATIVE")))["partyId"] as string;
  framework = await registerFramework();
  const plot = await post("/scs/v1/plots", {
    plot: {
      countryCode: "TH",
      geometry: { geometryType: "POLYGON", coordinates: [SQUARE], coordinateReferenceSystem: "EPSG:4326", areaHectares: 1.2, captureMethod: "PHONE_GPS" },
      identityEvidence: { registryVerificationStatus: "NOT_APPLICABLE", supportingEvidenceIds: [], evidenceLimitations: [] },
      sourceType: "field survey",
    },
    tenureClaims: [{ claimantType: "INDIVIDUAL", claimantId: farmer, tenureBasis: "UNKNOWN", evidenceIds: [], limitations: [] }],
  });
  plotId = plot["plotId"] as string;
});

after(async () => {
  if (server) await new Promise<void>((r) => server.close(() => r()));
  await api?.close();
  await harness?.drop();
});

type Query = (sql: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
const adminQuery: Query = (sql, values) => harness.admin.query(sql, values);

/**
 * Insert a custody event; `overrides` replace column values (undefined removes
 * a column). The default is a farm-gate PURCHASE of 120 kg of rubber from the
 * farmer by the cooperative, with an unverified document: its one limitation
 * code is INTEGRITY_UNVERIFIED.
 */
async function insertEvent(overrides: Record<string, unknown> = {}, q: Query = adminQuery): Promise<string> {
  const cols: Record<string, unknown> = {
    event_version: 1,
    schema_version: "1",
    framework_id: framework.frameworkId,
    evidence_requirement_spec_id: framework.specId,
    event_type: "PURCHASE",
    source_party_id: farmer,
    source_party_version: 1,
    source_party_role: "SUPPLIER",
    destination_party_id: collector,
    destination_party_version: 1,
    destination_party_role: "AGGREGATOR",
    commodity_code: "4001",
    commodity_name: "Natural rubber (cup lump)",
    source_plot_ids_complete: true,
    batch_identifier: `LOT-${randomUUID()}`,
    quantity_amount: 120,
    quantity_unit: "KG",
    quantity_measurement_method: "Hanging scale at farm gate",
    location_country_code: "TH",
    event_date: "2024-06-30",
    time_precision: "DATE_ONLY",
    document_id: "RCPT-0412",
    document_type: "PURCHASE_RECEIPT",
    document_reference: "Cooperative ledger page 12",
    content_digest: createHash("sha256").update(randomUUID()).digest("hex"),
    integrity_status: "UNVERIFIED",
    submitted_by: ACTOR_JSON,
    submitted_at: new Date().toISOString(),
    chain_of_custody_complete: true,
    uncertainties: [],
    contradictions: [],
    known_gaps: [],
    admission_status: "ADMITTED_WITH_LIMITATIONS",
    admission_limitations: ["Integrity unverified: no stored document was cited."],
    admission_limitation_codes: ["INTEGRITY_UNVERIFIED"],
    admitted_by: ACTOR_JSON,
    admitted_at: new Date().toISOString(),
    ...overrides,
  };
  const names = Object.keys(cols).filter((n) => cols[n] !== undefined);
  const sql = `INSERT INTO scs.custody_event (${names.join(", ")}) VALUES (${names.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING event_id`;
  const { rows } = await q(sql, names.map((n) => cols[n]));
  return rows[0]!["event_id"] as string;
}

const insertLink = (eventId: string, eventType: string, linkType: string, cited: string, linked: string | null, q: Query = adminQuery) =>
  q(`INSERT INTO scs.custody_event_link (event_id, event_type, link_type, cited_event_id, linked_event_id) VALUES ($1, $2, $3, $4, $5)`, [eventId, eventType, linkType, cited, linked]);

const insertSourcePlot = (eventId: string, cited: string, linked: string | null) =>
  harness.admin.query(`INSERT INTO scs.custody_event_source_plot (event_id, cited_plot_id, linked_plot_id) VALUES ($1, $2, $3)`, [eventId, cited, linked]);

/** Runs `body` in one owner transaction, so the deferred link check fires at its COMMIT. */
async function inTransaction(body: (q: Query) => Promise<void>): Promise<void> {
  await harness.admin.query("BEGIN");
  try {
    await body(adminQuery);
    await harness.admin.query("COMMIT");
  } catch (e) {
    await harness.admin.query("ROLLBACK").catch(() => undefined);
    throw e;
  }
}

/** A transformation group: 100 kg in, 60 kg out (drying). */
const DRYING = {
  event_type: "PROCESSING",
  transformation_type: "DRYING",
  transformation_input_quantity: 100,
  transformation_input_unit: "KG",
  transformation_output_quantity: 60,
  transformation_output_unit: "KG",
};


test("migration 014 creates the three CAP-05 tables, the framework's (id, commodity) key and the deferred link check", async () => {
  const { rows } = await harness.admin.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'scs' AND table_name LIKE 'custody_event%' ORDER BY table_name`,
  );
  assert.deepEqual(rows.map((r) => r.table_name), ["custody_event", "custody_event_link", "custody_event_source_plot"]);
  const uq = await harness.admin.query(`SELECT 1 FROM pg_constraint WHERE conname = 'regulatory_framework_framework_commodity_uq' AND contype = 'u'`);
  assert.equal(uq.rowCount, 1);
  const trigger = await harness.admin.query<{ tgdeferrable: boolean; tginitdeferred: boolean }>(
    `SELECT tgdeferrable, tginitdeferred FROM pg_trigger WHERE tgname = 'custody_event_links_complete'`,
  );
  assert.deepEqual(trigger.rows, [{ tgdeferrable: true, tginitdeferred: true }]);
});

test("scs_api can insert and read an event; nobody can change it (all three tables append-only)", async () => {
  const id = await api.transaction((tx) => insertEvent({}, (sql, values) => tx.query(sql, values)));
  const read = await api.transaction((tx) => tx.query(`SELECT 1 FROM scs.custody_event WHERE event_id = $1`, [id]));
  assert.equal(read.rowCount, 1);
  const other = await insertEvent();
  await insertLink(id, "PURCHASE", "PREDECESSOR", other, other);
  await insertSourcePlot(id, plotId, plotId);
  for (const table of ["custody_event", "custody_event_link", "custody_event_source_plot"]) {
    await assert.rejects(api.transaction((tx) => tx.query(`UPDATE scs.${table} SET created_at = now() WHERE event_id = $1`, [id])), /permission denied/, `scs_api: ${table}`);
    await assert.rejects(harness.admin.query(`UPDATE scs.${table} SET created_at = now() WHERE event_id = $1`, [id]), /append-only/, `owner: ${table}`);
    await assert.rejects(harness.admin.query(`DELETE FROM scs.${table} WHERE event_id = $1`, [id]), /append-only/, `owner delete: ${table}`);
  }
});

test("framework: the specification and the commodity code must be the event's framework's", async () => {
  const other = await registerFramework();
  await assert.rejects(insertEvent({ evidence_requirement_spec_id: other.specId }), /custody_event_framework_spec_fk/, "another framework's specification");
  await assert.rejects(insertEvent({ commodity_code: "1801" }), /custody_event_framework_commodity_fk/, "a commodity outside the framework");
  await assert.rejects(insertEvent({ framework_id: randomUUID() }), /custody_event_framework_(spec|commodity)_fk/);
});

test("parties: registered; different for PURCHASE, TRANSFER, EXPORT, IMPORT; the same allowed otherwise", async () => {
  await assert.rejects(insertEvent({ source_party_id: randomUUID() }), /custody_event_source_party_fk/);
  await assert.rejects(insertEvent({ destination_party_id: randomUUID() }), /custody_event_destination_party_fk/);
  for (const eventType of ["PURCHASE", "TRANSFER", "EXPORT", "IMPORT"]) {
    await assert.rejects(insertEvent({ event_type: eventType, destination_party_id: farmer }), /custody_event_distinct_parties_ck/, eventType);
  }
  for (const eventType of ["WEIGHING", "INSPECTION", "CERTIFICATION", "OTHER"]) {
    await insertEvent({ event_type: eventType, destination_party_id: farmer, destination_party_role: "OTHER" });
  }
  await insertEvent({ ...DRYING, destination_party_id: farmer });
  await assert.rejects(insertEvent({ source_party_role: "IMPORTER" }), /custody_event_source_role_ck/);
  await assert.rejects(insertEvent({ destination_party_role: "SUPPLIER" }), /custody_event_destination_role_ck/);
});

test("quantity: required except for CERTIFICATION and INSPECTION; positive; OTHER unit with its description only", async () => {
  const none = { quantity_amount: undefined, quantity_unit: undefined, quantity_measurement_method: undefined };
  await insertEvent({ ...none, event_type: "CERTIFICATION" });
  await insertEvent({ ...none, event_type: "INSPECTION" });
  for (const eventType of ["PURCHASE", "WEIGHING", "EXPORT"]) {
    await assert.rejects(insertEvent({ ...none, event_type: eventType }), /custody_event_quantity_ck/, eventType);
  }
  await assert.rejects(insertEvent({ quantity_unit: undefined }), /custody_event_quantity_ck/, "an amount without a unit");
  await assert.rejects(insertEvent({ quantity_amount: 0 }), /custody_event_quantity_ck/);
  await assert.rejects(insertEvent({ quantity_unit: "OTHER" }), /custody_event_quantity_ck/, "OTHER without a description");
  await assert.rejects(insertEvent({ quantity_unit_description: "baskets" }), /custody_event_quantity_ck/, "a description without OTHER");
  await insertEvent({ quantity_unit: "OTHER", quantity_unit_description: "Woven baskets of about 15 kg" });
  await assert.rejects(insertEvent({ quantity_unit: "POUND" }), /custody_event_units_ck/);
  await assert.rejects(insertEvent({ ...none, event_type: "CERTIFICATION", quantity_measurement_method: "scale" }), /custody_event_quantity_ck/, "a method without a quantity");
});

test("time: EXACT needs a timestamp, which must lie within the local date's span in some time zone (UTC−12 to UTC+14)", async () => {
  const exact = (at: string, date = "2024-06-30") => insertEvent({ time_precision: "EXACT", event_date: date, event_time_utc: at });
  await assert.rejects(insertEvent({ time_precision: "EXACT" }), /custody_event_time_ck/);
  await exact("2024-06-29T23:00:00Z"); // 06:00 on 30 June in Bangkok (UTC+7)
  await exact("2024-06-29T10:00:00Z"); // 00:00 on 30 June at UTC+14, the earliest possible
  await exact("2024-07-01T11:59:59Z"); // 23:59:59 on 30 June at UTC−12, the latest possible
  await assert.rejects(exact("2024-06-29T09:59:59Z"), /custody_event_time_ck/, "before 30 June began anywhere");
  await assert.rejects(exact("2024-07-01T12:00:00Z"), /custody_event_time_ck/, "after 30 June ended everywhere");
  await assert.rejects(insertEvent({ time_precision: "ROUGHLY" }), /custody_event_time_precision_ck/);
});

test("transformation: present exactly for TRANSFORMATION and PROCESSING, recorded whole, positive, units from the vocabulary", async () => {
  await insertEvent(DRYING);
  await insertEvent({ ...DRYING, event_type: "TRANSFORMATION", transformation_type: "MILLING" });
  await assert.rejects(insertEvent({ event_type: "PROCESSING" }), /custody_event_transformation_ck/, "PROCESSING without a transformation");
  await assert.rejects(insertEvent({ ...DRYING, event_type: "PURCHASE" }), /custody_event_transformation_ck/, "a transformation on a PURCHASE");
  await assert.rejects(insertEvent({ ...DRYING, transformation_output_unit: undefined }), /custody_event_transformation_ck/);
  await assert.rejects(insertEvent({ ...DRYING, transformation_output_quantity: 0 }), /custody_event_transformation_ck/);
  await assert.rejects(insertEvent({ ...DRYING, transformation_output_unit: "OTHER" }), /custody_event_transformation_ck/);
  await insertEvent({ ...DRYING, transformation_output_unit: "OTHER", transformation_output_unit_description: "Ribbed smoked sheets" });
  await assert.rejects(insertEvent({ ...DRYING, transformation_type: "FERMENTING" }), /custody_event_transformation_type_ck/);
});

test("integrity: VERIFIED exactly when a stored object is cited with the declared digest; FAILED never recorded", async () => {
  const digest = await storedObject();
  await insertEvent({ evidence_object_sha256: digest, content_digest: digest, integrity_status: "VERIFIED", admission_status: "ADMITTED", admission_limitations: [], admission_limitation_codes: [] });
  await assert.rejects(insertEvent({ integrity_status: "VERIFIED", admission_limitation_codes: ["CHAIN_OF_CUSTODY_INCOMPLETE"] }), /custody_event_integrity_ck/, "VERIFIED without an object");
  await assert.rejects(insertEvent({ evidence_object_sha256: digest, content_digest: digest }), /custody_event_integrity_ck/, "UNVERIFIED although it matches");
  await assert.rejects(insertEvent({ integrity_status: "FAILED" }), /custody_event_integrity_ck/);
  const unknown = createHash("sha256").update(randomUUID()).digest("hex");
  await assert.rejects(
    insertEvent({ evidence_object_sha256: unknown, content_digest: unknown, integrity_status: "VERIFIED", admission_status: "ADMITTED", admission_limitation_codes: [] }),
    /custody_event_object_fk/,
  );
  await assert.rejects(insertEvent({ content_digest: "ABC" }), /custody_event_digest_ck/);
});

test("outcomes: ADMITTED is reachable; limitations exactly when codes are recorded; codes from the contract, once each", async () => {
  const digest = await storedObject();
  await insertEvent({ evidence_object_sha256: digest, content_digest: digest, integrity_status: "VERIFIED", admission_status: "ADMITTED", admission_limitations: [], admission_limitation_codes: [] });
  for (const status of ["QUARANTINED", "REJECTED"]) {
    await assert.rejects(insertEvent({ admission_status: status }), /custody_event_status_ck/, status);
  }
  await assert.rejects(insertEvent({ admission_status: "ADMITTED" }), /custody_event_status_ck/, "ADMITTED with codes");
  await assert.rejects(insertEvent({ admission_limitation_codes: ["INTEGRITY_UNVERIFIED", "MADE_UP"] }), /custody_event_limitation_codes_ck/);
  await assert.rejects(insertEvent({ admission_limitation_codes: ["INTEGRITY_UNVERIFIED", "INTEGRITY_UNVERIFIED"] }), /custody_event_limitation_codes_ck/);
});

test("limitation codes determined by the row are recorded exactly when they apply", async () => {
  const codes = (...extra: string[]) => ({ admission_limitation_codes: ["INTEGRITY_UNVERIFIED", ...extra] });
  const rule = /custody_event_limitation_rules_ck/;
  // chain of custody
  await insertEvent({ chain_of_custody_complete: false, ...codes("CHAIN_OF_CUSTODY_INCOMPLETE") });
  await assert.rejects(insertEvent({ chain_of_custody_complete: false }), rule);
  await assert.rejects(insertEvent(codes("CHAIN_OF_CUSTODY_INCOMPLETE")), rule);
  // integrity
  await assert.rejects(insertEvent({ admission_limitation_codes: ["CHAIN_OF_CUSTODY_INCOMPLETE"], chain_of_custody_complete: false }), rule, "UNVERIFIED without INTEGRITY_UNVERIFIED");
  // event time
  await insertEvent({ time_precision: "APPROXIMATE", ...codes("EVENT_TIME_APPROXIMATE") });
  await insertEvent({ time_precision: "UNKNOWN", ...codes("EVENT_TIME_APPROXIMATE") });
  await assert.rejects(insertEvent({ time_precision: "UNKNOWN" }), rule);
  // declared contradictions (uncertainties and known gaps carry no code)
  await insertEvent({ contradictions: ["Weight ticket says 118 kg"], ...codes("CONTRADICTION_DECLARED") });
  await assert.rejects(insertEvent({ contradictions: ["Weight ticket says 118 kg"] }), rule);
  await insertEvent({ uncertainties: ["Scale not calibrated"], known_gaps: ["No transport record"] });
  // quantity precision: an uncertainty stated, or no method
  await insertEvent({ quantity_measurement_uncertainty: "±2 kg", ...codes("QUANTITY_PRECISION_UNCERTAIN") });
  await insertEvent({ quantity_measurement_method: undefined, ...codes("QUANTITY_PRECISION_UNCERTAIN") });
  await assert.rejects(insertEvent({ quantity_measurement_method: undefined }), rule);
  await assert.rejects(insertEvent(codes("QUANTITY_PRECISION_UNCERTAIN")), rule);
  // an unexplained gain in the same unit
  const gain = { ...DRYING, transformation_output_quantity: 140 };
  await insertEvent({ ...gain, ...codes("QUANTITY_GAIN_UNEXPLAINED") });
  await assert.rejects(insertEvent(gain), rule);
  await insertEvent({ ...gain, transformation_conversion_ratio_description: "Blended with latex from the same lot" });
  await insertEvent({ ...gain, transformation_output_unit: "TONNE" }, adminQuery).catch(() => assert.fail("different units are never compared"));
  // incomplete source plots always carry the code
  await insertEvent({ source_plot_ids_complete: false, ...codes("SOURCE_PLOTS_INCOMPLETE") });
  await assert.rejects(insertEvent({ source_plot_ids_complete: false }), rule);
  // MANDATE_NOT_VALID only when a mandate is cited
  await assert.rejects(insertEvent(codes("MANDATE_NOT_VALID")), rule);
  await insertEvent({ source_mandate_cited_id: randomUUID(), ...codes("MANDATE_NOT_VALID") });
});

test("mandates: the cited id is kept; a linked id must be that mandate and must exist", async () => {
  const cited = randomUUID();
  await insertEvent({ submission_mandate_cited_id: cited, ...{ admission_limitation_codes: ["INTEGRITY_UNVERIFIED", "MANDATE_NOT_VALID"] } });
  await assert.rejects(insertEvent({ source_mandate_cited_id: cited, source_mandate_linked_id: randomUUID() }), /custody_event_mandates_ck/);
  await assert.rejects(insertEvent({ source_mandate_cited_id: cited, source_mandate_linked_id: cited }), /custody_event_source_mandate_fk/);
  await assert.rejects(insertEvent({ submission_mandate_cited_id: cited, submission_mandate_linked_id: cited }), /custody_event_submission_mandate_fk/);
});

test("location: two-letter country code; latitude and longitude together and in range", async () => {
  await insertEvent({ location_latitude: 13.5, location_longitude: 101.5, location_accuracy_metres: 8 });
  await assert.rejects(insertEvent({ location_country_code: "tha" }), /custody_event_location_ck/);
  await assert.rejects(insertEvent({ location_latitude: 13.5 }), /custody_event_location_ck/);
  await assert.rejects(insertEvent({ location_accuracy_metres: 8 }), /custody_event_location_ck/);
  await assert.rejects(insertEvent({ location_latitude: 91, location_longitude: 0 }), /custody_event_location_ck/);
  await assert.rejects(insertEvent({ location_latitude: 0, location_longitude: 181 }), /custody_event_location_ck/);
});

test("links: resolved only to an admitted event (any framework or batch); successors never resolved; no self-reference", async () => {
  const a = await insertEvent();
  const b = await insertEvent();
  const otherFramework = await registerFramework();
  const elsewhere = await insertEvent({ framework_id: otherFramework.frameworkId, evidence_requirement_spec_id: otherFramework.specId });
  await insertLink(a, "PURCHASE", "PREDECESSOR", b, b);
  await insertLink(a, "PURCHASE", "PREDECESSOR", elsewhere, elsewhere); // LINKED_EVENT_OUT_OF_SCOPE: kept
  const unknown = randomUUID();
  await insertLink(a, "PURCHASE", "PREDECESSOR", unknown, null); // LINKED_EVENT_NOT_ADMITTED: kept as cited
  await insertLink(a, "PURCHASE", "SUCCESSOR", b, null);
  await assert.rejects(insertLink(a, "PURCHASE", "SUCCESSOR", elsewhere, elsewhere), /custody_event_link_successor_ck/);
  await assert.rejects(insertLink(a, "PURCHASE", "PREDECESSOR", randomUUID(), b), /custody_event_link_resolution_ck/);
  const ghost = randomUUID();
  await assert.rejects(insertLink(a, "PURCHASE", "PREDECESSOR", ghost, ghost), /custody_event_link_linked_fk/);
  await assert.rejects(insertLink(a, "PURCHASE", "PREDECESSOR", a, null), /custody_event_link_not_self_ck/);
  await assert.rejects(insertLink(a, "PURCHASE", "PREDECESSOR", b, b), /custody_event_link_uq/);
  await assert.rejects(insertLink(a, "WEIGHING", "PREDECESSOR", randomUUID(), null), /custody_event_link_citing_fk/, "the citing event's own type");
  await assert.rejects(insertLink(a, "PURCHASE", "COPY_OF", b, null), /custody_event_link_type_ck/);
});

test("splits and consolidations: a SPLIT has exactly one source and a CONSOLIDATION at least two, checked at commit", async () => {
  const lot = await insertEvent();
  const lot2 = await insertEvent();
  const same = { destination_party_id: farmer, destination_party_role: "OTHER" };
  // a split with its source commits
  await inTransaction(async (q) => {
    const split = await insertEvent({ event_type: "SPLIT", ...same }, q);
    await insertLink(split, "SPLIT", "SPLIT_FROM", lot, lot, q);
  });
  // a split without one does not
  await assert.rejects(inTransaction(async (q) => void (await insertEvent({ event_type: "SPLIT", ...same }, q))), /custody_event_split_link_ck/);
  // nor with two
  await assert.rejects(
    inTransaction(async (q) => {
      const split = await insertEvent({ event_type: "SPLIT", ...same }, q);
      await insertLink(split, "SPLIT", "SPLIT_FROM", lot, lot, q);
      await insertLink(split, "SPLIT", "SPLIT_FROM", lot2, lot2, q);
    }),
    /custody_event_link_one_split_from_uq/,
  );
  // a consolidation of two lots commits; of one does not
  await inTransaction(async (q) => {
    const merged = await insertEvent({ event_type: "CONSOLIDATION", ...same }, q);
    await insertLink(merged, "CONSOLIDATION", "CONSOLIDATED_FROM", lot, lot, q);
    await insertLink(merged, "CONSOLIDATION", "CONSOLIDATED_FROM", randomUUID(), null, q); // cited, not yet admitted
  });
  await assert.rejects(
    inTransaction(async (q) => {
      const merged = await insertEvent({ event_type: "CONSOLIDATION", ...same }, q);
      await insertLink(merged, "CONSOLIDATION", "CONSOLIDATED_FROM", lot, lot, q);
    }),
    /custody_event_consolidation_links_ck/,
  );
  // split-from and consolidated-from only on their own event types
  await assert.rejects(insertLink(lot, "PURCHASE", "SPLIT_FROM", lot2, lot2), /custody_event_link_event_type_ck/);
  await assert.rejects(insertLink(lot, "PURCHASE", "CONSOLIDATED_FROM", lot2, lot2), /custody_event_link_event_type_ck/);
});

test("source plots: the cited id is kept; a linked id must be that plot and a registered one", async () => {
  const id = await insertEvent();
  await insertSourcePlot(id, plotId, plotId);
  const unregistered = randomUUID();
  await insertSourcePlot(id, unregistered, null); // SOURCE_PLOT_NOT_REGISTERED: kept as cited
  await assert.rejects(insertSourcePlot(id, randomUUID(), plotId), /custody_event_source_plot_resolution_ck/);
  const ghost = randomUUID();
  await assert.rejects(insertSourcePlot(id, ghost, ghost), /custody_event_source_plot_linked_fk/);
  await assert.rejects(insertSourcePlot(id, plotId, plotId), /custody_event_source_plot_uq/);
});
