-- ============================================================================
-- SCS-CAP-05 — Supply Chain Custody Evidence Admission — table definitions
--
-- Implements the records from
--   governance/workstream-b/SCS-CAP-05-SUPPLY-CHAIN-CUSTODY-EVIDENCE-ADMISSION-CANONICAL-CONTRACT-2026-09-23.md
-- as settled for the pilot (commits 7b4fc02, 9845179):
--
--   ScsCustodyEventRecord                → scs.custody_event
--     .commodity.sourcePlotIds[]          → scs.custody_event_source_plot
--     .predecessorEventIds[],
--     .successorEventIds[],
--     .splitFromEventId,
--     .consolidatedFromEventIds[]         → scs.custody_event_link
--
-- Current-state reference for the CAP-05 tables. Migration 014 is generated
-- from this file (everything from the first statement onward). Requires
-- cap-01.sql (regulatory_framework, with its (framework, commodity) key),
-- cap-02.sql (party_identity,
-- representation_mandate), cap-03.sql (plot), platform.sql (evidence_object,
-- reject_modification) and roles-rls.sql (scs_api).
--
-- All three tables are APPEND-ONLY for every role: an admitted event is never
-- changed. Quarantine will be a separate event record (quarantineCustodyEvent
-- is not yet built); event_version stays 1 until a revision operation exists.
--
-- Mapping rules as cap-02.sql / cap-04.sql. Nested contract objects are
-- flattened into prefixed columns (source_party_*, destination_party_*,
-- quantity_*, location_*, transformation_*, document_*, admission_*). Optional
-- groups are all-or-nothing.
--
-- frameworkAssociationId names an SCS-CAP-01 framework (contract "Framework"),
-- so the column is framework_id. It is keyed together with the specification
-- and with the commodity code, so the database itself refuses an event whose
-- specification or commodity is not its framework's.
--
-- Cited identifiers (mandates, source plots, linked events) are kept exactly
-- as submitted; the linked_* column is filled only when the identifier
-- resolves, and then equals the cited one. An unresolved identifier is a
-- limitation, never a failure.
--
-- Limitation codes that are fully determined by the row are tied to it by
-- custody_event_limitation_rules_ck, so a record cannot omit or invent them.
-- PARTY_UNVERIFIED, SOURCE_PLOT_NOT_REGISTERED, SOURCE_PLOT_RETIRED,
-- LINKED_EVENT_NOT_ADMITTED and LINKED_EVENT_OUT_OF_SCOPE depend on other rows
-- and are checked by the application only.
--
-- A SPLIT has exactly one SPLIT_FROM link and a CONSOLIDATION at least two
-- CONSOLIDATED_FROM links: checked at commit by a deferred constraint
-- trigger, since the links are inserted after the event.
--
-- Not checked here (application only): dates not in the future (need the
-- clock), ISO 3166-1 assignment of the country code, parties not RETIRED and
-- mandate validity (depend on other rows).
--
-- NOT YET IMPLEMENTED
--   TODO(actor-reference): ActorReference stored as a jsonb object.
-- ============================================================================


-- ── ScsCustodyEventRecord ───────────────────────────────────────────────────
CREATE TABLE scs.custody_event (
  event_id                          uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_version                     integer     NOT NULL,
  schema_version                    text        NOT NULL,

  -- framework (frameworkAssociationId) and its specification, set by the system
  framework_id                      uuid        NOT NULL,
  evidence_requirement_spec_id      text        NOT NULL,

  event_type                        text        NOT NULL,

  -- parties: versions set by the system at admission
  source_party_id                   uuid        NOT NULL,
  source_party_version              integer     NOT NULL,
  source_party_role                 text        NOT NULL,
  source_mandate_cited_id           uuid,                   -- actingUnderMandateId, as submitted
  source_mandate_linked_id          uuid,                   -- the mandate, when it exists
  destination_party_id              uuid        NOT NULL,
  destination_party_version         integer     NOT NULL,
  destination_party_role            text        NOT NULL,

  -- commodity and batch (source plots in custody_event_source_plot)
  commodity_code                    text        NOT NULL,
  commodity_name                    text        NOT NULL,
  source_plot_ids_complete          boolean     NOT NULL,   -- as declared
  batch_identifier                  text        NOT NULL,   -- no batch registry: recorded as given
  batch_version                     integer,

  -- quantity: absent only for CERTIFICATION and INSPECTION
  quantity_amount                   numeric,
  quantity_unit                     text,
  quantity_unit_description         text,                   -- required for OTHER, only for OTHER
  quantity_measurement_method       text,
  quantity_measurement_uncertainty  text,

  -- location
  location_country_code             text        NOT NULL,
  location_administrative_area      text,
  location_facility_id              text,                   -- no facility registry: recorded as given
  location_facility_name            text,
  location_latitude                 numeric,
  location_longitude                numeric,
  location_accuracy_metres          numeric,

  -- time: event_date is the local date at the event location
  event_date                        date        NOT NULL,
  event_time_utc                    timestamptz,
  time_precision                    text        NOT NULL,

  -- transformation: present exactly for TRANSFORMATION and PROCESSING
  transformation_type               text,
  transformation_input_quantity     numeric,
  transformation_input_unit         text,
  transformation_input_unit_description text,
  transformation_output_quantity    numeric,
  transformation_output_unit        text,
  transformation_output_unit_description text,
  transformation_conversion_ratio_description text,

  -- supporting document
  document_id                       text        NOT NULL,
  document_type                     text        NOT NULL,
  document_reference                text        NOT NULL,
  document_issuing_authority        text,
  document_date                     date,
  content_digest                    text        NOT NULL,   -- declared by the submitter
  evidence_object_sha256            text,                   -- the cited SCS-PLATFORM-01 object, if any
  integrity_status                  text        NOT NULL,

  -- provenance
  submitted_by                      jsonb       NOT NULL,   -- ActorReference
  submitted_at                      timestamptz NOT NULL,
  submission_mandate_cited_id       uuid,                   -- submissionMandateId, as submitted
  submission_mandate_linked_id      uuid,                   -- the mandate, when it exists
  chain_of_custody_complete         boolean     NOT NULL,   -- as declared

  -- the submitter's disclosure, verbatim
  uncertainties                     text[]      NOT NULL,
  contradictions                    text[]      NOT NULL,
  known_gaps                        text[]      NOT NULL,

  -- admission
  admission_status                  text        NOT NULL,
  admission_limitations             text[]      NOT NULL,
  admission_limitation_codes        text[]      NOT NULL,
  admitted_by                       jsonb       NOT NULL,   -- ActorReference
  admitted_at                       timestamptz NOT NULL,

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT custody_event_pk PRIMARY KEY (event_id),
  -- the target of custody_event_link's (event, type) foreign key
  CONSTRAINT custody_event_type_uq UNIQUE (event_id, event_type),

  -- ── Foreign keys ──────────────────────────────────────────────────────────
  CONSTRAINT custody_event_framework_spec_fk
    FOREIGN KEY (framework_id, evidence_requirement_spec_id)
    REFERENCES scs.regulatory_framework (framework_id, evidence_spec_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_framework_commodity_fk
    FOREIGN KEY (framework_id, commodity_code)
    REFERENCES scs.regulatory_framework (framework_id, commodity_code)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_source_party_fk
    FOREIGN KEY (source_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_destination_party_fk
    FOREIGN KEY (destination_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_source_mandate_fk
    FOREIGN KEY (source_mandate_linked_id) REFERENCES scs.representation_mandate (mandate_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_submission_mandate_fk
    FOREIGN KEY (submission_mandate_linked_id) REFERENCES scs.representation_mandate (mandate_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_object_fk
    FOREIGN KEY (evidence_object_sha256) REFERENCES scs.evidence_object (content_sha256)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- ── Contract enumerations ─────────────────────────────────────────────────
  CONSTRAINT custody_event_event_type_ck
    CHECK (event_type IN ('PURCHASE', 'TRANSFER', 'WEIGHING', 'PROCESSING', 'TRANSFORMATION', 'SPLIT',
                          'CONSOLIDATION', 'EXPORT', 'IMPORT', 'CERTIFICATION', 'INSPECTION', 'OTHER')),
  CONSTRAINT custody_event_source_role_ck
    CHECK (source_party_role IN ('SUPPLIER', 'AGGREGATOR', 'PROCESSOR', 'EXPORTER', 'OTHER')),
  CONSTRAINT custody_event_destination_role_ck
    CHECK (destination_party_role IN ('AGGREGATOR', 'PROCESSOR', 'EXPORTER', 'IMPORTER', 'OTHER')),
  CONSTRAINT custody_event_time_precision_ck
    CHECK (time_precision IN ('EXACT', 'DATE_ONLY', 'APPROXIMATE', 'UNKNOWN')),
  CONSTRAINT custody_event_transformation_type_ck
    CHECK (transformation_type IS NULL
        OR transformation_type IN ('DRYING', 'MILLING', 'PRESSING', 'BLENDING', 'GRADING', 'PACKAGING', 'OTHER')),
  CONSTRAINT custody_event_document_type_ck
    CHECK (document_type IN ('PURCHASE_RECEIPT', 'WEIGHT_TICKET', 'TRANSPORT_DOCUMENT', 'PROCESSING_RECORD',
                             'CERTIFICATION_DOCUMENT', 'INSPECTION_REPORT', 'CUSTOMS_DECLARATION', 'OTHER')),
  -- ScsCustodyQuantityUnit, for all three unit columns
  CONSTRAINT custody_event_units_ck
    CHECK ((quantity_unit IS NULL
            OR quantity_unit IN ('KG', 'TONNE', 'LITRE', 'M3', 'BALE', 'SACK', 'UNIT', 'OTHER'))
       AND (transformation_input_unit IS NULL
            OR transformation_input_unit IN ('KG', 'TONNE', 'LITRE', 'M3', 'BALE', 'SACK', 'UNIT', 'OTHER'))
       AND (transformation_output_unit IS NULL
            OR transformation_output_unit IN ('KG', 'TONNE', 'LITRE', 'M3', 'BALE', 'SACK', 'UNIT', 'OTHER'))),

  -- ── Parties ───────────────────────────────────────────────────────────────
  -- a change of custody needs two parties; WEIGHING, INSPECTION, PROCESSING,
  -- TRANSFORMATION, SPLIT, CONSOLIDATION, CERTIFICATION and OTHER may name one
  CONSTRAINT custody_event_distinct_parties_ck
    CHECK (source_party_id <> destination_party_id
        OR event_type NOT IN ('PURCHASE', 'TRANSFER', 'EXPORT', 'IMPORT')),
  CONSTRAINT custody_event_mandates_ck
    CHECK ((source_mandate_linked_id IS NULL OR source_mandate_linked_id = source_mandate_cited_id)
       AND (submission_mandate_linked_id IS NULL OR submission_mandate_linked_id = submission_mandate_cited_id)),
  CONSTRAINT custody_event_versions_ck
    CHECK (event_version >= 1 AND source_party_version >= 1 AND destination_party_version >= 1
       AND (batch_version IS NULL OR batch_version >= 1)),

  -- ── Quantity ──────────────────────────────────────────────────────────────
  CONSTRAINT custody_event_quantity_ck
    CHECK ((quantity_amount IS NULL) = (quantity_unit IS NULL)
       AND (quantity_amount IS NOT NULL OR event_type IN ('CERTIFICATION', 'INSPECTION'))
       AND (quantity_amount IS NOT NULL
            OR (quantity_measurement_method IS NULL AND quantity_measurement_uncertainty IS NULL))
       AND (quantity_amount IS NULL OR quantity_amount > 0)
       AND (quantity_unit_description IS NOT NULL) = (quantity_unit IS NOT DISTINCT FROM 'OTHER')),

  -- ── Location ──────────────────────────────────────────────────────────────
  CONSTRAINT custody_event_location_ck
    CHECK (location_country_code ~ '^[A-Z]{2}$'
       AND (location_latitude IS NULL) = (location_longitude IS NULL)
       AND (location_latitude IS NOT NULL OR location_accuracy_metres IS NULL)
       AND (location_latitude IS NULL OR location_latitude BETWEEN -90 AND 90)
       AND (location_longitude IS NULL OR location_longitude BETWEEN -180 AND 180)
       AND (location_accuracy_metres IS NULL OR location_accuracy_metres >= 0)),

  -- ── Time ──────────────────────────────────────────────────────────────────
  -- EXACT needs a timestamp; the timestamp lies within event_date's span in
  -- some time zone from UTC−12:00 to UTC+14:00
  CONSTRAINT custody_event_time_ck
    CHECK ((time_precision <> 'EXACT' OR event_time_utc IS NOT NULL)
       AND (event_time_utc IS NULL
            OR ((event_time_utc AT TIME ZONE 'UTC') >= event_date - interval '14 hours'
                AND (event_time_utc AT TIME ZONE 'UTC') < event_date + interval '36 hours'))),

  -- ── Transformation ────────────────────────────────────────────────────────
  CONSTRAINT custody_event_transformation_ck
    CHECK ((transformation_type IS NOT NULL) = (event_type IN ('TRANSFORMATION', 'PROCESSING'))
       AND (transformation_type IS NULL) = (transformation_input_quantity IS NULL)
       AND (transformation_type IS NULL) = (transformation_input_unit IS NULL)
       AND (transformation_type IS NULL) = (transformation_output_quantity IS NULL)
       AND (transformation_type IS NULL) = (transformation_output_unit IS NULL)
       AND (transformation_type IS NOT NULL OR transformation_conversion_ratio_description IS NULL)
       AND (transformation_input_quantity IS NULL OR transformation_input_quantity > 0)
       AND (transformation_output_quantity IS NULL OR transformation_output_quantity > 0)
       AND (transformation_input_unit_description IS NOT NULL)
         = (transformation_input_unit IS NOT DISTINCT FROM 'OTHER')
       AND (transformation_output_unit_description IS NOT NULL)
         = (transformation_output_unit IS NOT DISTINCT FROM 'OTHER')),

  -- ── Document and integrity ────────────────────────────────────────────────
  -- VERIFIED exactly when a stored object is cited with the declared digest;
  -- FAILED is never recorded (a failed check writes nothing)
  CONSTRAINT custody_event_integrity_ck
    CHECK (integrity_status IN ('VERIFIED', 'UNVERIFIED')
       AND (integrity_status = 'VERIFIED')
         = (evidence_object_sha256 IS NOT NULL AND evidence_object_sha256 = content_digest)),
  CONSTRAINT custody_event_digest_ck
    CHECK (content_digest ~ '^[0-9a-f]{64}$'),

  -- ── Admission ─────────────────────────────────────────────────────────────
  CONSTRAINT custody_event_status_ck
    CHECK (admission_status IN ('ADMITTED', 'ADMITTED_WITH_LIMITATIONS')
       AND (admission_status = 'ADMITTED_WITH_LIMITATIONS') = (cardinality(admission_limitation_codes) > 0)),
  CONSTRAINT custody_event_limitation_codes_ck
    CHECK (admission_limitation_codes <@ ARRAY['PARTY_UNVERIFIED', 'SOURCE_PLOTS_INCOMPLETE',
             'SOURCE_PLOT_NOT_REGISTERED', 'SOURCE_PLOT_RETIRED', 'QUANTITY_PRECISION_UNCERTAIN',
             'EVENT_TIME_APPROXIMATE', 'LINKED_EVENT_NOT_ADMITTED', 'LINKED_EVENT_OUT_OF_SCOPE',
             'INTEGRITY_UNVERIFIED', 'CHAIN_OF_CUSTODY_INCOMPLETE', 'MANDATE_NOT_VALID',
             'QUANTITY_GAIN_UNEXPLAINED', 'CONTRADICTION_DECLARED']::text[]
       AND scs.text_array_is_distinct(admission_limitation_codes)),
  -- codes fully determined by this row are recorded exactly when they apply
  CONSTRAINT custody_event_limitation_rules_ck
    CHECK (('CHAIN_OF_CUSTODY_INCOMPLETE' = ANY (admission_limitation_codes)) = (NOT chain_of_custody_complete)
       AND ('INTEGRITY_UNVERIFIED' = ANY (admission_limitation_codes)) = (integrity_status = 'UNVERIFIED')
       AND ('EVENT_TIME_APPROXIMATE' = ANY (admission_limitation_codes))
         = (time_precision IN ('APPROXIMATE', 'UNKNOWN'))
       AND ('CONTRADICTION_DECLARED' = ANY (admission_limitation_codes)) = (cardinality(contradictions) > 0)
       AND ('QUANTITY_PRECISION_UNCERTAIN' = ANY (admission_limitation_codes))
         = (quantity_amount IS NOT NULL
            AND (quantity_measurement_uncertainty IS NOT NULL OR quantity_measurement_method IS NULL))
       AND ('QUANTITY_GAIN_UNEXPLAINED' = ANY (admission_limitation_codes))
         = COALESCE(transformation_input_unit = transformation_output_unit
                    AND transformation_input_unit <> 'OTHER'
                    AND transformation_output_quantity > transformation_input_quantity
                    AND transformation_conversion_ratio_description IS NULL, false)
       -- incomplete plots always carry the code (no plots at all do too:
       -- checked by the application)
       AND (source_plot_ids_complete OR 'SOURCE_PLOTS_INCOMPLETE' = ANY (admission_limitation_codes))
       -- MANDATE_NOT_VALID only when a mandate was cited
       AND (NOT ('MANDATE_NOT_VALID' = ANY (admission_limitation_codes))
            OR source_mandate_cited_id IS NOT NULL OR submission_mandate_cited_id IS NOT NULL)),

  -- ── Defensive ─────────────────────────────────────────────────────────────
  CONSTRAINT custody_event_actor_refs_ck
    CHECK (jsonb_typeof(submitted_by) = 'object' AND jsonb_typeof(admitted_by) = 'object'),
  CONSTRAINT custody_event_arrays_ck
    CHECK (array_position(uncertainties, NULL) IS NULL
       AND array_position(contradictions, NULL) IS NULL
       AND array_position(known_gaps, NULL) IS NULL
       AND array_position(admission_limitations, NULL) IS NULL
       AND array_position(admission_limitation_codes, NULL) IS NULL),
  CONSTRAINT custody_event_required_text_ck
    CHECK (btrim(schema_version) <> '' AND btrim(evidence_requirement_spec_id) <> ''
       AND btrim(commodity_code) <> '' AND btrim(commodity_name) <> '' AND btrim(batch_identifier) <> ''
       AND btrim(document_id) <> '' AND btrim(document_reference) <> ''
       AND (quantity_unit_description IS NULL OR btrim(quantity_unit_description) <> '')
       AND (transformation_input_unit_description IS NULL OR btrim(transformation_input_unit_description) <> '')
       AND (transformation_output_unit_description IS NULL OR btrim(transformation_output_unit_description) <> ''))
);


-- ── commodity.sourcePlotIds ─────────────────────────────────────────────────
CREATE TABLE scs.custody_event_source_plot (
  source_plot_id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_id                          uuid        NOT NULL,
  cited_plot_id                     uuid        NOT NULL,   -- as submitted
  linked_plot_id                    uuid,                   -- the plot, when it is registered
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT custody_event_source_plot_pk PRIMARY KEY (source_plot_id),
  CONSTRAINT custody_event_source_plot_uq UNIQUE (event_id, cited_plot_id),
  CONSTRAINT custody_event_source_plot_event_fk
    FOREIGN KEY (event_id) REFERENCES scs.custody_event (event_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_source_plot_linked_fk
    FOREIGN KEY (linked_plot_id) REFERENCES scs.plot (plot_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_source_plot_resolution_ck
    CHECK (linked_plot_id IS NULL OR linked_plot_id = cited_plot_id)
);


-- ── predecessor / successor / split-from / consolidated-from ────────────────
CREATE TABLE scs.custody_event_link (
  link_id                           uuid        NOT NULL DEFAULT gen_random_uuid(),
  event_id                          uuid        NOT NULL,   -- the citing event
  event_type                        text        NOT NULL,   -- the citing event's type
  link_type                         text        NOT NULL,
  cited_event_id                    uuid        NOT NULL,   -- as submitted
  linked_event_id                   uuid,                   -- the cited event, when it is admitted
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT custody_event_link_pk PRIMARY KEY (link_id),
  CONSTRAINT custody_event_link_uq UNIQUE (event_id, link_type, cited_event_id),
  CONSTRAINT custody_event_link_citing_fk
    FOREIGN KEY (event_id, event_type) REFERENCES scs.custody_event (event_id, event_type)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- any admitted event: a link to another framework or batch is kept
  -- (limitation LINKED_EVENT_OUT_OF_SCOPE)
  CONSTRAINT custody_event_link_linked_fk
    FOREIGN KEY (linked_event_id) REFERENCES scs.custody_event (event_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT custody_event_link_type_ck
    CHECK (link_type IN ('PREDECESSOR', 'SUCCESSOR', 'SPLIT_FROM', 'CONSOLIDATED_FROM')),
  CONSTRAINT custody_event_link_resolution_ck
    CHECK (linked_event_id IS NULL OR linked_event_id = cited_event_id),
  -- successors are recorded as declared and never resolved at admission
  CONSTRAINT custody_event_link_successor_ck
    CHECK (link_type <> 'SUCCESSOR' OR linked_event_id IS NULL),
  CONSTRAINT custody_event_link_not_self_ck
    CHECK (cited_event_id <> event_id),
  CONSTRAINT custody_event_link_event_type_ck
    CHECK ((link_type <> 'SPLIT_FROM' OR event_type = 'SPLIT')
       AND (link_type <> 'CONSOLIDATED_FROM' OR event_type = 'CONSOLIDATION'))
);

-- a split comes from exactly one event
CREATE UNIQUE INDEX custody_event_link_one_split_from_uq
  ON scs.custody_event_link (event_id) WHERE link_type = 'SPLIT_FROM';


-- ── A SPLIT has its source; a CONSOLIDATION at least two (checked at commit) ─
CREATE FUNCTION scs.custody_event_links_complete() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  n integer;
BEGIN
  IF NEW.event_type = 'SPLIT' THEN
    SELECT count(*) INTO n FROM scs.custody_event_link
     WHERE event_id = NEW.event_id AND link_type = 'SPLIT_FROM';
    IF n <> 1 THEN
      RAISE EXCEPTION 'custody_event_split_link_ck: SPLIT event % needs exactly one SPLIT_FROM link (has %)', NEW.event_id, n
        USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW.event_type = 'CONSOLIDATION' THEN
    SELECT count(*) INTO n FROM scs.custody_event_link
     WHERE event_id = NEW.event_id AND link_type = 'CONSOLIDATED_FROM';
    IF n < 2 THEN
      RAISE EXCEPTION 'custody_event_consolidation_links_ck: CONSOLIDATION event % needs at least two CONSOLIDATED_FROM links (has %)', NEW.event_id, n
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER custody_event_links_complete
  AFTER INSERT ON scs.custody_event
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION scs.custody_event_links_complete();


-- ── Indexes on foreign keys and lookups ─────────────────────────────────────
CREATE INDEX custody_event_framework_idx ON scs.custody_event (framework_id, evidence_requirement_spec_id);
CREATE INDEX custody_event_source_party_idx ON scs.custody_event (source_party_id);
CREATE INDEX custody_event_destination_party_idx ON scs.custody_event (destination_party_id);
CREATE INDEX custody_event_object_idx ON scs.custody_event (evidence_object_sha256);
CREATE INDEX custody_event_source_mandate_idx ON scs.custody_event (source_mandate_linked_id);
CREATE INDEX custody_event_submission_mandate_idx ON scs.custody_event (submission_mandate_linked_id);
-- SCS-CAP-06 reads the events of a batch
CREATE INDEX custody_event_batch_idx ON scs.custody_event (batch_identifier, framework_id);
CREATE INDEX custody_event_source_plot_event_idx ON scs.custody_event_source_plot (event_id);
CREATE INDEX custody_event_source_plot_linked_idx ON scs.custody_event_source_plot (linked_plot_id);
CREATE INDEX custody_event_link_event_idx ON scs.custody_event_link (event_id, event_type);
CREATE INDEX custody_event_link_linked_idx ON scs.custody_event_link (linked_event_id);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER custody_event_append_only
  BEFORE UPDATE OR DELETE ON scs.custody_event
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER custody_event_no_truncate
  BEFORE TRUNCATE ON scs.custody_event
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER custody_event_source_plot_append_only
  BEFORE UPDATE OR DELETE ON scs.custody_event_source_plot
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER custody_event_source_plot_no_truncate
  BEFORE TRUNCATE ON scs.custody_event_source_plot
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER custody_event_link_append_only
  BEFORE UPDATE OR DELETE ON scs.custody_event_link
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER custody_event_link_no_truncate
  BEFORE TRUNCATE ON scs.custody_event_link
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.custody_event IS
  'SCS-CAP-05 ScsCustodyEventRecord. One custody event, recorded honestly. Admission means genuine and attributable, not that any chain is continuous or sufficient. Append-only.';
COMMENT ON TABLE scs.custody_event_source_plot IS
  'SCS-CAP-05 commodity.sourcePlotIds: cited_plot_id as submitted; linked_plot_id only when it names a registered plot. Append-only.';
COMMENT ON TABLE scs.custody_event_link IS
  'SCS-CAP-05 predecessor, successor, split-from and consolidated-from references. cited_event_id as submitted; linked_event_id only when it names an admitted event (never for successors). Append-only.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.custody_event TO scs_api;
ALTER TABLE scs.custody_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY custody_event_scs_api_select ON scs.custody_event
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY custody_event_scs_api_insert ON scs.custody_event
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.custody_event_source_plot TO scs_api;
ALTER TABLE scs.custody_event_source_plot ENABLE ROW LEVEL SECURITY;
CREATE POLICY custody_event_source_plot_scs_api_select ON scs.custody_event_source_plot
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY custody_event_source_plot_scs_api_insert ON scs.custody_event_source_plot
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.custody_event_link TO scs_api;
ALTER TABLE scs.custody_event_link ENABLE ROW LEVEL SECURITY;
CREATE POLICY custody_event_link_scs_api_select ON scs.custody_event_link
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY custody_event_link_scs_api_insert ON scs.custody_event_link
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);
