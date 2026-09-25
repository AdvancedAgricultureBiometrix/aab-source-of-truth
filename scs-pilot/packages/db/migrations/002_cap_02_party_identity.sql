-- ============================================================================
-- Migration 002 — SCS-CAP-02 party identity, role claims, identity evidence,
-- verification assessments, supply-chain relationships, representation mandates
--
-- Applied history. Never edit after it has been applied anywhere; add a new
-- numbered migration instead. The DDL below is identical to
-- packages/db/schema/cap-02.sql at the time this migration was written.
-- Requires migration 001 (schema scs and scs.set_updated_at()).
-- ============================================================================

BEGIN;

-- CHECK constraints cannot contain subqueries; this helper keeps the
-- "no duplicate elements" rule declarative.
CREATE FUNCTION scs.text_array_is_distinct(a text[]) RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT count(*) = count(DISTINCT x) FROM unnest(a) AS x
$$;


-- ── ScsPartyIdentity ────────────────────────────────────────────────────────
CREATE TABLE scs.party_identity (
  party_id                          uuid        NOT NULL DEFAULT gen_random_uuid(),
  party_version                     integer     NOT NULL,
  schema_version                    text        NOT NULL,
  registered_at                     timestamptz NOT NULL,
  registered_by                     jsonb       NOT NULL,   -- ActorReference

  party_type                        text        NOT NULL,
  party_name                        text        NOT NULL,
  country_of_registration           text        NOT NULL,
  country_of_operation              text,                   -- optional

  -- Registration status — not verification status
  registration_status               text        NOT NULL,

  -- identityEvidence.evidenceLimitations (evidenceIds → party_identity_evidence)
  identity_evidence_limitations     text[]      NOT NULL,

  -- provenance
  provenance_submitted_by           jsonb       NOT NULL,   -- ActorReference
  provenance_submitting_organization_id text,               -- optional
  provenance_recorded_at            timestamptz NOT NULL,

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT party_identity_pk PRIMARY KEY (party_id),

  CONSTRAINT party_identity_party_type_ck
    CHECK (party_type IN ('NATURAL_PERSON', 'LEGAL_ENTITY', 'COOPERATIVE',
                          'COMMUNITY_GROUP', 'GOVERNMENT_BODY', 'OTHER')),
  CONSTRAINT party_identity_registration_status_ck
    CHECK (registration_status IN ('REGISTERED', 'REQUIRES_HUMAN_REVIEW',
                                   'DISPUTED', 'RETIRED')),

  CONSTRAINT party_identity_actor_refs_object_ck
    CHECK (jsonb_typeof(registered_by) = 'object'
       AND jsonb_typeof(provenance_submitted_by) = 'object'),
  CONSTRAINT party_identity_arrays_no_null_elements_ck
    CHECK (array_position(identity_evidence_limitations, NULL) IS NULL),

  -- deliberate — beyond the contract
  CONSTRAINT party_identity_version_positive_ck
    CHECK (party_version >= 1),
  CONSTRAINT party_identity_required_text_not_blank_ck
    CHECK (btrim(schema_version) <> '' AND btrim(party_name) <> ''
       AND btrim(country_of_registration) <> ''),
  CONSTRAINT party_identity_optional_text_not_blank_ck
    CHECK ((country_of_operation IS NULL OR btrim(country_of_operation) <> '')
       AND (provenance_submitting_organization_id IS NULL
            OR btrim(provenance_submitting_organization_id) <> '')),
  CONSTRAINT party_identity_updated_after_created_ck
    CHECK (updated_at >= created_at)
);


-- ── identityEvidence.evidenceIds ────────────────────────────────────────────
-- The contract defines identity evidence only as a list of evidence ids on
-- the party (plus limitations, kept on party_identity). One row per id.
CREATE TABLE scs.party_identity_evidence (
  party_identity_evidence_id        uuid        NOT NULL DEFAULT gen_random_uuid(),
  party_id                          uuid        NOT NULL,
  party_version                     integer     NOT NULL,
  evidence_id                       uuid        NOT NULL,   -- no FK: TODO(evidence)

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT party_identity_evidence_pk PRIMARY KEY (party_identity_evidence_id),
  CONSTRAINT party_identity_evidence_party_fk
    FOREIGN KEY (party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- deliberate — beyond the contract
  CONSTRAINT party_identity_evidence_uq
    UNIQUE (party_id, party_version, evidence_id),
  CONSTRAINT party_identity_evidence_version_positive_ck
    CHECK (party_version >= 1),
  CONSTRAINT party_identity_evidence_updated_after_created_ck
    CHECK (updated_at >= created_at)
);


-- ── ScsPartyVerificationAssessment — scoped, never blanket ──────────────────
CREATE TABLE scs.party_verification_assessment (
  assessment_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  party_id                          uuid        NOT NULL,
  party_version                     integer     NOT NULL,

  verification_status               text        NOT NULL,

  -- verificationScope
  scope_description                 text        NOT NULL,
  scope_jurisdiction_code           text        NOT NULL,
  scope_verified_attributes         text[]      NOT NULL,
  scope_excluded_from_verification  text[]      NOT NULL,

  -- verifyingAuthority
  verifying_authority_id            text        NOT NULL,
  verifying_authority_name          text        NOT NULL,
  verifying_authority_basis         text        NOT NULL,
  verifying_authority_jurisdiction_code text    NOT NULL,

  verified_at                       timestamptz NOT NULL,
  expires_at                        timestamptz,            -- optional
  evidence_ids                      uuid[]      NOT NULL,   -- no FK: TODO(evidence)
  limitations                       text[]      NOT NULL,

  -- authorityBoundary — verification never implies broader authority
  boundary_does_not_confirm_sanctions_clearance       boolean NOT NULL DEFAULT true,
  boundary_does_not_confirm_beneficial_ownership      boolean NOT NULL DEFAULT true,
  boundary_does_not_grant_regulatory_eligibility      boolean NOT NULL DEFAULT true,
  boundary_does_not_imply_compliance_with_other_frameworks boolean NOT NULL DEFAULT true,

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT party_verification_assessment_pk PRIMARY KEY (assessment_id),
  CONSTRAINT party_verification_assessment_party_fk
    FOREIGN KEY (party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  CONSTRAINT party_verification_assessment_status_ck
    CHECK (verification_status IN ('REGISTERED_UNVERIFIED', 'PARTIALLY_VERIFIED',
                                   'VERIFIED_FOR_DECLARED_SCOPE',
                                   'VERIFICATION_EXPIRED', 'DISPUTED',
                                   'FAIL_CLOSED')),
  CONSTRAINT party_verification_assessment_boundary_ck
    CHECK (boundary_does_not_confirm_sanctions_clearance
       AND boundary_does_not_confirm_beneficial_ownership
       AND boundary_does_not_grant_regulatory_eligibility
       AND boundary_does_not_imply_compliance_with_other_frameworks),
  CONSTRAINT party_verification_assessment_arrays_no_null_elements_ck
    CHECK (array_position(scope_verified_attributes, NULL) IS NULL
       AND array_position(scope_excluded_from_verification, NULL) IS NULL
       AND array_position(evidence_ids, NULL) IS NULL
       AND array_position(limitations, NULL) IS NULL),

  -- deliberate — beyond the contract
  CONSTRAINT party_verification_assessment_version_positive_ck
    CHECK (party_version >= 1),
  CONSTRAINT party_verification_assessment_required_text_not_blank_ck
    CHECK (btrim(scope_description) <> '' AND btrim(scope_jurisdiction_code) <> ''
       AND btrim(verifying_authority_id) <> '' AND btrim(verifying_authority_name) <> ''
       AND btrim(verifying_authority_basis) <> ''
       AND btrim(verifying_authority_jurisdiction_code) <> ''),
  CONSTRAINT party_verification_assessment_expiry_after_verification_ck
    CHECK (expires_at IS NULL OR expires_at > verified_at),
  CONSTRAINT party_verification_assessment_updated_after_created_ck
    CHECK (updated_at >= created_at)
);


-- ── ScsPartyRoleClaim ───────────────────────────────────────────────────────
CREATE TABLE scs.party_role_claim (
  role_claim_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  party_id                          uuid        NOT NULL,
  party_version                     integer     NOT NULL,

  claimed_role                      text        NOT NULL,

  framework_association_id          uuid        NOT NULL,   -- no FK: TODO(framework-association)
  framework_version                 text        NOT NULL,
  commodity_scope                   text[]      NOT NULL,
  geographic_scope                  text[]      NOT NULL,

  role_evidence_ids                 uuid[]      NOT NULL,   -- no FK: TODO(evidence)

  verification_status               text        NOT NULL,

  valid_from                        timestamptz,            -- optional
  valid_until                       timestamptz,            -- optional
  limitations                       text[]      NOT NULL,

  claimed_at                        timestamptz NOT NULL,
  claimed_by                        jsonb       NOT NULL,   -- ActorReference

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT party_role_claim_pk PRIMARY KEY (role_claim_id),
  CONSTRAINT party_role_claim_party_fk
    FOREIGN KEY (party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  CONSTRAINT party_role_claim_claimed_role_ck
    CHECK (claimed_role IN ('OPERATOR', 'SUPPLIER', 'AGGREGATOR', 'PROCESSOR',
                            'EXPORTER', 'IMPORTER', 'TRADER', 'OTHER')),
  CONSTRAINT party_role_claim_verification_status_ck
    CHECK (verification_status IN ('CLAIMED_UNVERIFIED', 'EVIDENCE_SUBMITTED',
                                   'PARTIALLY_VERIFIED',
                                   'VERIFIED_FOR_DECLARED_SCOPE', 'DISPUTED',
                                   'EXPIRED', 'SUPERSEDED', 'FAIL_CLOSED')),
  CONSTRAINT party_role_claim_actor_ref_object_ck
    CHECK (jsonb_typeof(claimed_by) = 'object'),
  CONSTRAINT party_role_claim_arrays_no_null_elements_ck
    CHECK (array_position(commodity_scope, NULL) IS NULL
       AND array_position(geographic_scope, NULL) IS NULL
       AND array_position(role_evidence_ids, NULL) IS NULL
       AND array_position(limitations, NULL) IS NULL),

  -- deliberate — beyond the contract
  CONSTRAINT party_role_claim_version_positive_ck
    CHECK (party_version >= 1),
  CONSTRAINT party_role_claim_required_text_not_blank_ck
    CHECK (btrim(framework_version) <> ''),
  CONSTRAINT party_role_claim_validity_range_ck
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT party_role_claim_updated_after_created_ck
    CHECK (updated_at >= created_at)
);


-- ── ScsSupplyChainRelationship — bilateral only ─────────────────────────────
CREATE TABLE scs.supply_chain_relationship (
  relationship_id                   uuid        NOT NULL DEFAULT gen_random_uuid(),
  schema_version                    text        NOT NULL,

  -- Exactly two parties — always bilateral
  from_party_id                     uuid        NOT NULL,
  to_party_id                       uuid        NOT NULL,

  relationship_type                 text        NOT NULL,

  commodity_scope                   text[]      NOT NULL,
  geographic_scope                  text[]      NOT NULL,

  -- explicit and version-bound; participation under one regulation does not
  -- imply participation under another
  framework_association_ids         uuid[]      NOT NULL,   -- no FK: TODO(framework-association)

  valid_from                        timestamptz,            -- optional
  valid_until                       timestamptz,            -- optional

  claimed_by_party_id               uuid        NOT NULL,
  claimed_at                        timestamptz NOT NULL,

  relationship_evidence_ids         uuid[]      NOT NULL,   -- no FK: TODO(evidence)

  verification_status               text        NOT NULL,
  verification_scope                text,                   -- optional
  lifecycle_status                  text        NOT NULL,

  -- Immutable history — superseded relationships remain on record
  supersedes_relationship_id        uuid,                   -- optional
  superseded_by_relationship_id     uuid,                   -- optional

  representation_version            text        NOT NULL,
  created_at                        timestamptz NOT NULL DEFAULT now(),  -- contract createdAt
  created_by                        jsonb       NOT NULL,   -- ActorReference
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT supply_chain_relationship_pk PRIMARY KEY (relationship_id),
  CONSTRAINT supply_chain_relationship_from_party_fk
    FOREIGN KEY (from_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT supply_chain_relationship_to_party_fk
    FOREIGN KEY (to_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT supply_chain_relationship_claimed_by_party_fk
    FOREIGN KEY (claimed_by_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT supply_chain_relationship_supersedes_fk
    FOREIGN KEY (supersedes_relationship_id)
    REFERENCES scs.supply_chain_relationship (relationship_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT supply_chain_relationship_superseded_by_fk
    FOREIGN KEY (superseded_by_relationship_id)
    REFERENCES scs.supply_chain_relationship (relationship_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- the contract's failure contract: SELF_REFERENTIAL_RELATIONSHIP
  CONSTRAINT supply_chain_relationship_not_self_referential_ck
    CHECK (from_party_id <> to_party_id),

  CONSTRAINT supply_chain_relationship_type_ck
    CHECK (relationship_type IN ('SUPPLIES_TO', 'PROCESSES_FOR', 'AGGREGATES_FOR',
                                 'EXPORTS_FOR', 'CERTIFIES_FOR', 'OTHER')),
  CONSTRAINT supply_chain_relationship_verification_status_ck
    CHECK (verification_status IN ('CLAIMED_UNVERIFIED', 'EVIDENCE_SUBMITTED',
                                   'PARTIALLY_VERIFIED',
                                   'VERIFIED_FOR_DECLARED_SCOPE', 'DISPUTED',
                                   'EXPIRED', 'SUPERSEDED', 'FAIL_CLOSED')),
  CONSTRAINT supply_chain_relationship_lifecycle_status_ck
    CHECK (lifecycle_status IN ('ACTIVE', 'EXPIRED', 'SUPERSEDED', 'WITHDRAWN')),
  CONSTRAINT supply_chain_relationship_actor_ref_object_ck
    CHECK (jsonb_typeof(created_by) = 'object'),
  CONSTRAINT supply_chain_relationship_arrays_no_null_elements_ck
    CHECK (array_position(commodity_scope, NULL) IS NULL
       AND array_position(geographic_scope, NULL) IS NULL
       AND array_position(framework_association_ids, NULL) IS NULL
       AND array_position(relationship_evidence_ids, NULL) IS NULL),

  -- deliberate — beyond the contract
  -- The relationship is claimed by a party to it; a third party cannot
  -- claim a bilateral relationship. The contract is silent, the rule is not.
  CONSTRAINT supply_chain_relationship_claimed_by_a_party_ck
    CHECK (claimed_by_party_id = from_party_id
        OR claimed_by_party_id = to_party_id),
  CONSTRAINT supply_chain_relationship_not_self_superseding_ck
    CHECK ((supersedes_relationship_id IS NULL
            OR supersedes_relationship_id <> relationship_id)
       AND (superseded_by_relationship_id IS NULL
            OR superseded_by_relationship_id <> relationship_id)),
  CONSTRAINT supply_chain_relationship_required_text_not_blank_ck
    CHECK (btrim(schema_version) <> '' AND btrim(representation_version) <> ''),
  CONSTRAINT supply_chain_relationship_optional_text_not_blank_ck
    CHECK (verification_scope IS NULL OR btrim(verification_scope) <> ''),
  CONSTRAINT supply_chain_relationship_validity_range_ck
    CHECK (valid_from IS NULL OR valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT supply_chain_relationship_updated_after_created_ck
    CHECK (updated_at >= created_at)
);


-- ── ScsRepresentationMandate — separate from relationship ───────────────────
CREATE TABLE scs.representation_mandate (
  mandate_id                        uuid        NOT NULL DEFAULT gen_random_uuid(),
  schema_version                    text        NOT NULL,

  -- Who grants authority and to whom
  granting_party_id                 uuid        NOT NULL,
  representative_party_id           uuid        NOT NULL,

  -- What the representative is permitted to do — enumerated, not open-ended
  permitted_actions                 text[]      NOT NULL,

  -- Scope — explicit and version-bound
  framework_association_ids         uuid[]      NOT NULL,   -- no FK: TODO(framework-association)
  commodity_scope                   text[]      NOT NULL,
  geographic_scope                  text[]      NOT NULL,

  valid_from                        timestamptz NOT NULL,
  valid_until                       timestamptz,            -- optional

  mandate_evidence_ids              uuid[]      NOT NULL,   -- no FK: TODO(evidence)

  verification_status               text        NOT NULL,

  revocation_status                 text        NOT NULL,
  revoked_at                        timestamptz,            -- optional
  revocation_reason                 text,                   -- optional

  created_at                        timestamptz NOT NULL DEFAULT now(),  -- contract createdAt
  created_by                        jsonb       NOT NULL,   -- ActorReference
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  -- authorityBoundary — what this mandate does not permit
  boundary_does_not_permit_approval_of_granting_party          boolean NOT NULL DEFAULT true,
  boundary_does_not_permit_alteration_of_granting_party_identity boolean NOT NULL DEFAULT true,
  boundary_no_legal_declarations_without_explicit_authority boolean NOT NULL DEFAULT true,  -- doesNotPermitLegalDeclarationsWithoutExplicitAuthority (full name > 63-char identifier limit)
  boundary_does_not_conceal_which_records_were_submitted       boolean NOT NULL DEFAULT true,
  boundary_does_not_reuse_authority_outside_declared_scope     boolean NOT NULL DEFAULT true,
  boundary_does_not_extend_to_other_frameworks_or_commodities  boolean NOT NULL DEFAULT true,

  CONSTRAINT representation_mandate_pk PRIMARY KEY (mandate_id),
  CONSTRAINT representation_mandate_granting_party_fk
    FOREIGN KEY (granting_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT representation_mandate_representative_party_fk
    FOREIGN KEY (representative_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- every element is one of the contract's enumerated actions
  -- (OTHER_EXPLICITLY_NAMED has no describing field yet — TODO(other-action))
  -- (MANDATE_ACTION_NOT_ENUMERATED in the failure contract)
  CONSTRAINT representation_mandate_permitted_actions_enumerated_ck
    CHECK (permitted_actions <@ ARRAY['SUBMIT_IDENTITY_EVIDENCE',
                                      'SUBMIT_PLOT_ASSOCIATION_EVIDENCE',
                                      'SUBMIT_CUSTODY_EVIDENCE',
                                      'SUBMIT_DEFORESTATION_EVIDENCE',
                                      'REQUEST_FRAMEWORK_ASSOCIATION',
                                      'OTHER_EXPLICITLY_NAMED']::text[]),
  CONSTRAINT representation_mandate_verification_status_ck
    CHECK (verification_status IN ('CLAIMED_UNVERIFIED', 'EVIDENCE_SUBMITTED',
                                   'PARTIALLY_VERIFIED',
                                   'VERIFIED_FOR_DECLARED_SCOPE', 'DISPUTED',
                                   'EXPIRED', 'REVOKED', 'FAIL_CLOSED')),
  CONSTRAINT representation_mandate_revocation_status_ck
    CHECK (revocation_status IN ('NOT_REVOKED', 'REVOKED', 'EXPIRED')),
  CONSTRAINT representation_mandate_boundary_ck
    CHECK (boundary_does_not_permit_approval_of_granting_party
       AND boundary_does_not_permit_alteration_of_granting_party_identity
       AND boundary_no_legal_declarations_without_explicit_authority
       AND boundary_does_not_conceal_which_records_were_submitted
       AND boundary_does_not_reuse_authority_outside_declared_scope
       AND boundary_does_not_extend_to_other_frameworks_or_commodities),
  CONSTRAINT representation_mandate_actor_ref_object_ck
    CHECK (jsonb_typeof(created_by) = 'object'),
  CONSTRAINT representation_mandate_arrays_no_null_elements_ck
    CHECK (array_position(permitted_actions, NULL) IS NULL
       AND array_position(framework_association_ids, NULL) IS NULL
       AND array_position(commodity_scope, NULL) IS NULL
       AND array_position(geographic_scope, NULL) IS NULL
       AND array_position(mandate_evidence_ids, NULL) IS NULL),

  -- deliberate — beyond the contract
  CONSTRAINT representation_mandate_not_self_granted_ck
    CHECK (granting_party_id <> representative_party_id),
  CONSTRAINT representation_mandate_permitted_actions_not_empty_ck
    CHECK (cardinality(permitted_actions) >= 1),
  CONSTRAINT representation_mandate_permitted_actions_distinct_ck
    CHECK (scs.text_array_is_distinct(permitted_actions)),
  CONSTRAINT representation_mandate_revocation_consistent_ck
    CHECK ((revocation_status = 'REVOKED'
            AND revoked_at IS NOT NULL
            AND revocation_reason IS NOT NULL AND btrim(revocation_reason) <> '')
        OR (revocation_status <> 'REVOKED'
            AND revoked_at IS NULL AND revocation_reason IS NULL)),
  CONSTRAINT representation_mandate_required_text_not_blank_ck
    CHECK (btrim(schema_version) <> ''),
  CONSTRAINT representation_mandate_validity_range_ck
    CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT representation_mandate_updated_after_created_ck
    CHECK (updated_at >= created_at)
);


-- ── Indexes on foreign keys (lookups by party, and RESTRICT checks) ─────────
CREATE INDEX party_identity_evidence_party_idx       ON scs.party_identity_evidence (party_id);
CREATE INDEX party_verification_assessment_party_idx ON scs.party_verification_assessment (party_id);
CREATE INDEX party_role_claim_party_idx              ON scs.party_role_claim (party_id);
CREATE INDEX supply_chain_relationship_from_idx      ON scs.supply_chain_relationship (from_party_id);
CREATE INDEX supply_chain_relationship_to_idx        ON scs.supply_chain_relationship (to_party_id);
CREATE INDEX supply_chain_relationship_claimed_by_idx ON scs.supply_chain_relationship (claimed_by_party_id);
CREATE INDEX representation_mandate_granting_idx     ON scs.representation_mandate (granting_party_id);
CREATE INDEX representation_mandate_representative_idx ON scs.representation_mandate (representative_party_id);


-- ── updated_at maintained by the database (function from cap-01.sql) ───────
CREATE TRIGGER party_identity_set_updated_at
  BEFORE UPDATE ON scs.party_identity
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();
CREATE TRIGGER party_identity_evidence_set_updated_at
  BEFORE UPDATE ON scs.party_identity_evidence
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();
CREATE TRIGGER party_verification_assessment_set_updated_at
  BEFORE UPDATE ON scs.party_verification_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();
CREATE TRIGGER party_role_claim_set_updated_at
  BEFORE UPDATE ON scs.party_role_claim
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();
CREATE TRIGGER supply_chain_relationship_set_updated_at
  BEFORE UPDATE ON scs.supply_chain_relationship
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();
CREATE TRIGGER representation_mandate_set_updated_at
  BEFORE UPDATE ON scs.representation_mandate
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();


COMMENT ON TABLE scs.party_identity IS
  'SCS-CAP-02 ScsPartyIdentity. REGISTERED means a governed record exists — nothing more; verification is separate (party_verification_assessment).';
COMMENT ON TABLE scs.party_identity_evidence IS
  'SCS-CAP-02 ScsPartyIdentity.identityEvidence.evidenceIds, one row per evidence id.';
COMMENT ON TABLE scs.party_verification_assessment IS
  'SCS-CAP-02 ScsPartyVerificationAssessment. Always scoped; never implies sanctions clearance, beneficial ownership, regulatory eligibility or other-framework compliance.';
COMMENT ON TABLE scs.party_role_claim IS
  'SCS-CAP-02 ScsPartyRoleClaim. A claim until evidenced and assessed.';
COMMENT ON TABLE scs.supply_chain_relationship IS
  'SCS-CAP-02 ScsSupplyChainRelationship. Bilateral only; does not verify either party or prove commodity movement.';
COMMENT ON TABLE scs.representation_mandate IS
  'SCS-CAP-02 ScsRepresentationMandate. Separate from any relationship; enumerated actions only; revocable.';

COMMIT;
