-- ============================================================================
-- SCS-CAP-02 — Operator and Supplier Identity Registration — table definitions
--
-- Implements the records from
--   governance/workstream-b/SCS-CAP-02-OPERATOR-AND-SUPPLIER-IDENTITY-REGISTRATION-CANONICAL-CONTRACT-2026-09-23.md
--
--   ScsPartyIdentity                  → scs.party_identity
--     .identityEvidence.evidenceIds   → scs.party_identity_evidence (one row per id)
--   ScsPartyIdentityEvidenceSubmission → scs.party_identity_evidence_submission
--     .evidenceIds                    → scs.party_identity_evidence (submission_id set)
--     .verificationAssessments[]      → scs.party_verification_assessment
--   ScsPartyRoleClaim                 → scs.party_role_claim
--   ScsSupplyChainRelationship        → scs.supply_chain_relationship
--   ScsRepresentationMandate          → scs.representation_mandate
--   ScsMandateVerificationAssessment  → scs.mandate_verification_assessment (migration 022)
--   AAB-PLATFORM-04 ActorSubjectLink  → scs.actor_party_link (migration 021)
--     .authorisationEvidence          → scs.actor_party_link_evidence (one row per object)
--   ActorSubjectLinkStatusRecord      → scs.actor_party_link_status (migration 021)
--
-- Current-state reference for the CAP-02 tables. The migration that creates
-- them is generated from this file and must produce exactly this definition.
-- Requires cap-01.sql first: it creates schema scs and scs.set_updated_at().
-- party_identity_evidence_submission also needs scs.reject_modification()
-- from platform.sql and role scs_api from roles-rls.sql.
--
-- Mapping rules (same as CAP-01)
--   * Governed record primary key (…Id)          → uuid, gen_random_uuid() default
--   * Reference to another governed record (…Id) → uuid (+ foreign key when the
--                                                  target table exists)
--   * Identifier issued outside SCS (authority,
--     organisation, jurisdiction, country codes) → text
--   * Contract `string` timestamps (…At)         → timestamptz
--   * validFrom / validUntil                      → timestamptz (instants: a
--                                                  mandate can start or end
--                                                  part-way through a day)
--   * `string[]`                                  → text[] / uuid[] — NOT NULL,
--                                                  may be empty, no NULL elements
--   * optional (`?`) → nullable; otherwise NOT NULL
--   * string-literal unions                       → text + CHECK (… IN (…))
--   * authorityBoundary literal `true` fields     → boolean NOT NULL DEFAULT true
--                                                  CHECK (… = true)
--   * contract createdAt on a record              → the created_at column
--   * ActorReference                              → jsonb object (see TODO)
--   * Every identifier ≤ 63 characters — PostgreSQL silently truncates longer
--     names. A too-long contract field name gets a shortened column plus a
--     comment giving the full contract name (see representation_mandate).
--
-- Identity evidence submission: added to the CAP-02 contract (commit 3e508ed)
-- and implemented in migration 006 — party_identity_evidence_submission
-- (append-only) and party_identity_evidence.submission_id.
--
-- Verification assessment recording rules: added to the CAP-02 contract
-- (commit e85c58a) and implemented in migration 010 — recorded_by,
-- recorded_at, supersedes_assessment_id, append-only, recordable statuses and
-- non-empty evidence.
--
-- Role claim registration rules: added to the CAP-02 contract (commit
-- 9a3e978) and implemented in migration 009 —
-- party_role_claim.other_role_description, the framework foreign key and the
-- non-empty scope check.
--
-- Mandate registration rules: added to the CAP-02 contract (commit 9a3e978)
-- and implemented in migration 008 — representation_mandate.valid_until is
-- required, and the non-empty framework, scope and consent evidence checks.
--
-- Relationship registration rules: added to the CAP-02 contract (commit
-- 9a3e978) and implemented in migration 007 —
-- supply_chain_relationship.other_relationship_type_description and the
-- non-empty framework and scope checks.
--
-- otherActionDescription: added to the CAP-02 contract (commit 2ee4503) and
-- implemented in migration 003 — representation_mandate.other_action_description,
-- required exactly when OTHER_EXPLICITLY_NAMED is a permitted action.
--
-- Deletion: every foreign key is ON DELETE RESTRICT / ON UPDATE RESTRICT.
-- Nothing cascades. A party with claims, assessments, evidence links,
-- relationships or mandates cannot be deleted; those records are retired
-- through their own status fields, never silently removed.
--
-- NOT YET IMPLEMENTED
--   Roles and RLS: done in migration 004 (schema/roles-rls.sql). scs_api has
--                SELECT + INSERT only — no UPDATE, DELETE or TRUNCATE — so the
--                child tables cannot be deleted from either; RESTRICT covers
--                the owner.
--   TODO(party-versions): records reference a party by (partyId, partyVersion).
--                Only the current party version is stored; earlier versions
--                are not kept, so party_version on child rows is recorded but
--                cannot be joined to a historical party row. Acceptable for the
--                pilot; full party version history is a later migration, and
--                party_version on child rows is the breadcrumb for it.
--   Framework associations: a framework association is a CAP-01 frameworkId
--                (contract 9a3e978). party_role_claim.framework_association_id
--                has a foreign key to scs.regulatory_framework (migration 009).
--                TODO(framework-association-arrays): the uuid[] columns on
--                supply_chain_relationship and representation_mandate cannot
--                carry a foreign key; the capability checks every element
--                exists and is ACTIVE when the record is registered.
--   TODO(evidence): evidence ids are stored as uuid without a foreign key; the
--                evidence records they point to are not modelled yet.
--   Decisions: every CAP-02 decision is persisted inside its immutable
--                receipt (scs.decision_receipt, platform.sql), written in the
--                same transaction as the record it decides on.
--
-- ActorReference is stored as a jsonb object, in the shape AAB-PLATFORM-03
-- defines: version 2 for new records; version 1 records stay readable.
-- ============================================================================


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


-- ── ScsPartyIdentityEvidenceSubmission — evidence submitted after registration
-- Append-only for every role (trigger, function from platform.sql). Evidence
-- is admitted, not verified: a submission never changes the party record.
CREATE TABLE scs.party_identity_evidence_submission (
  submission_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  party_id                          uuid        NOT NULL,
  party_version                     integer     NOT NULL,   -- the party's version when submitted
  evidence_limitations              text[]      NOT NULL,
  submitted_by                      jsonb       NOT NULL,   -- ActorReference
  submitting_organization_id        text,                   -- optional; issued outside SCS
  submitted_at                      timestamptz NOT NULL DEFAULT now(),

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT party_identity_evidence_submission_pk PRIMARY KEY (submission_id),
  CONSTRAINT party_identity_evidence_submission_party_fk
    FOREIGN KEY (party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- deliberate — beyond the contract: the target of the evidence links'
  -- foreign key, so a link can only name a submission for its own party and
  -- party version
  CONSTRAINT party_identity_evidence_submission_party_version_uq
    UNIQUE (submission_id, party_id, party_version),
  CONSTRAINT party_identity_evidence_submission_version_ck
    CHECK (party_version >= 1),
  CONSTRAINT party_identity_evidence_submission_actor_object_ck
    CHECK (jsonb_typeof(submitted_by) = 'object'),
  CONSTRAINT party_identity_evidence_submission_no_null_elements_ck
    CHECK (array_position(evidence_limitations, NULL) IS NULL),
  CONSTRAINT party_identity_evidence_submission_org_not_blank_ck
    CHECK (submitting_organization_id IS NULL OR btrim(submitting_organization_id) <> '')
);

-- ── identityEvidence.evidenceIds, and evidenceIds of later submissions ──────
-- One row per evidence id. Evidence given at registration has no submission
-- (submission_id NULL; its limitations are kept on party_identity). Evidence
-- submitted later names its submission, which holds its limitations.
CREATE TABLE scs.party_identity_evidence (
  party_identity_evidence_id        uuid        NOT NULL DEFAULT gen_random_uuid(),
  party_id                          uuid        NOT NULL,
  party_version                     integer     NOT NULL,
  evidence_id                       uuid        NOT NULL,   -- no FK: TODO(evidence)
  submission_id                     uuid,                   -- NULL: given at registration

  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT party_identity_evidence_pk PRIMARY KEY (party_identity_evidence_id),
  CONSTRAINT party_identity_evidence_party_fk
    FOREIGN KEY (party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- submission, party and version must all match (not checked when NULL)
  CONSTRAINT party_identity_evidence_submission_fk
    FOREIGN KEY (submission_id, party_id, party_version)
    REFERENCES scs.party_identity_evidence_submission (submission_id, party_id, party_version)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- deliberate — beyond the contract; also stops the same evidence id being
  -- linked twice to one party version, at registration or by any submission
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

  -- provenance: who recorded the assessment in SCS, and when (migration 010)
  recorded_by                       jsonb       NOT NULL,   -- ActorReference
  recorded_at                       timestamptz NOT NULL DEFAULT now(),
  -- the earlier assessment of the same party this one replaces (migration 010)
  supersedes_assessment_id          uuid,                   -- optional

  -- authorityBoundary — verification never implies broader authority
  boundary_does_not_confirm_sanctions_clearance       boolean NOT NULL DEFAULT true,
  boundary_does_not_confirm_beneficial_ownership      boolean NOT NULL DEFAULT true,
  boundary_does_not_grant_regulatory_eligibility      boolean NOT NULL DEFAULT true,
  boundary_does_not_imply_compliance_with_other_frameworks boolean NOT NULL DEFAULT true,

  -- no updated_at: append-only for every role (migration 010)
  created_at                        timestamptz NOT NULL DEFAULT now(),

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

  -- Contract rules (commit e85c58a), added by migration 010.
  -- Only these statuses are recorded; REGISTERED_UNVERIFIED and
  -- VERIFICATION_EXPIRED are derived when read.
  CONSTRAINT party_verification_assessment_recordable_status_ck
    CHECK (verification_status IN ('PARTIALLY_VERIFIED', 'VERIFIED_FOR_DECLARED_SCOPE',
                                   'DISPUTED', 'FAIL_CLOSED')),
  -- verification always names its evidence
  CONSTRAINT party_verification_assessment_evidence_not_empty_ck
    CHECK (cardinality(evidence_ids) >= 1),
  -- verifiedAt is not in the future: not after the assessment was recorded
  CONSTRAINT party_verification_assessment_verified_not_after_recorded_ck
    CHECK (verified_at <= recorded_at),
  CONSTRAINT party_verification_assessment_recorded_by_object_ck
    CHECK (jsonb_typeof(recorded_by) = 'object'),
  -- the target of the supersession foreign key
  CONSTRAINT party_verification_assessment_party_uq
    UNIQUE (assessment_id, party_id),
  -- a superseded assessment belongs to the same party ...
  CONSTRAINT party_verification_assessment_supersedes_fk
    FOREIGN KEY (supersedes_assessment_id, party_id)
    REFERENCES scs.party_verification_assessment (assessment_id, party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- ... and is superseded at most once, never by itself
  CONSTRAINT party_verification_assessment_supersedes_once_uq
    UNIQUE (supersedes_assessment_id),
  CONSTRAINT party_verification_assessment_not_self_superseding_ck
    CHECK (supersedes_assessment_id IS NULL OR supersedes_assessment_id <> assessment_id)
);


-- ── ScsPartyRoleClaim ───────────────────────────────────────────────────────
CREATE TABLE scs.party_role_claim (
  role_claim_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  party_id                          uuid        NOT NULL,
  party_version                     integer     NOT NULL,

  claimed_role                      text        NOT NULL,

  framework_association_id          uuid        NOT NULL,   -- a CAP-01 frameworkId (FK, migration 009)
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

  -- otherRoleDescription (optional) — names the role when claimedRole is
  -- OTHER. Last column: added by migration 009.
  other_role_description            text,

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
    CHECK (updated_at >= created_at),

  -- Contract rules (commit 9a3e978), added by migration 009: a framework
  -- association is a CAP-01 frameworkId; OTHER requires a description and a
  -- description without OTHER is refused; scope is not empty.
  CONSTRAINT party_role_claim_framework_fk
    FOREIGN KEY (framework_association_id) REFERENCES scs.regulatory_framework (framework_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT party_role_claim_other_role_description_ck
    CHECK (CASE WHEN claimed_role = 'OTHER'
                THEN other_role_description IS NOT NULL
                     AND btrim(other_role_description) <> ''
                ELSE other_role_description IS NULL
           END),
  CONSTRAINT party_role_claim_scope_not_empty_ck
    CHECK (cardinality(commodity_scope) >= 1 AND cardinality(geographic_scope) >= 1)
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
  framework_association_ids         uuid[]      NOT NULL,   -- no FK: TODO(framework-association-arrays)

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

  -- otherRelationshipTypeDescription (optional) — names the relationship when
  -- relationshipType is OTHER. Last column: added by migration 007.
  other_relationship_type_description text,

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
    CHECK (updated_at >= created_at),

  -- Contract rule (commit 9a3e978): OTHER requires a description naming the
  -- relationship; a description without OTHER is refused. Added by migration 007.
  CONSTRAINT supply_chain_relationship_other_type_description_ck
    CHECK (CASE WHEN relationship_type = 'OTHER'
                THEN other_relationship_type_description IS NOT NULL
                     AND btrim(other_relationship_type_description) <> ''
                ELSE other_relationship_type_description IS NULL
           END),
  -- Contract rule (commit 9a3e978): at least one framework, and scope that
  -- is not empty. Added by migration 007.
  CONSTRAINT supply_chain_relationship_scope_not_empty_ck
    CHECK (cardinality(framework_association_ids) >= 1
       AND cardinality(commodity_scope) >= 1
       AND cardinality(geographic_scope) >= 1)
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
  framework_association_ids         uuid[]      NOT NULL,   -- no FK: TODO(framework-association-arrays)
  commodity_scope                   text[]      NOT NULL,
  geographic_scope                  text[]      NOT NULL,

  valid_from                        timestamptz NOT NULL,
  valid_until                       timestamptz NOT NULL,   -- required (contract 9a3e978; migration 008)

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

  -- otherActionDescription (optional) — names the action when
  -- OTHER_EXPLICITLY_NAMED is permitted. Last column: added by migration 003.
  other_action_description          text,

  CONSTRAINT representation_mandate_pk PRIMARY KEY (mandate_id),
  CONSTRAINT representation_mandate_granting_party_fk
    FOREIGN KEY (granting_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT representation_mandate_representative_party_fk
    FOREIGN KEY (representative_party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,

  -- every element is one of the contract's enumerated actions
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
    CHECK (updated_at >= created_at),

  -- Contract rule: OTHER_EXPLICITLY_NAMED requires otherActionDescription to
  -- name the action; without it the mandate is incomplete and is rejected.
  -- A description with no OTHER_EXPLICITLY_NAMED is rejected, not ignored:
  -- deliberate when added by migration 003, and the contract's own rule since
  -- commit 9a3e978 ("must be absent otherwise").
  CONSTRAINT representation_mandate_other_action_description_ck
    CHECK (CASE WHEN 'OTHER_EXPLICITLY_NAMED' = ANY (permitted_actions)
                THEN other_action_description IS NOT NULL
                     AND btrim(other_action_description) <> ''
                ELSE other_action_description IS NULL
           END),

  -- Contract rules (commit 9a3e978), added by migration 008: at least one
  -- framework and scope that is not empty; at least one consent evidence id
  -- (evidence that the granting party agreed).
  CONSTRAINT representation_mandate_scope_not_empty_ck
    CHECK (cardinality(framework_association_ids) >= 1
       AND cardinality(commodity_scope) >= 1
       AND cardinality(geographic_scope) >= 1),
  CONSTRAINT representation_mandate_consent_evidence_ck
    CHECK (cardinality(mandate_evidence_ids) >= 1)
);


-- ── Indexes on foreign keys (lookups by party, and RESTRICT checks) ─────────
CREATE INDEX party_identity_evidence_party_idx       ON scs.party_identity_evidence (party_id);
CREATE INDEX party_verification_assessment_party_idx ON scs.party_verification_assessment (party_id);
CREATE INDEX party_role_claim_party_idx              ON scs.party_role_claim (party_id);
CREATE INDEX party_role_claim_conflict_idx
  ON scs.party_role_claim (party_id, claimed_role, framework_association_id);
CREATE INDEX supply_chain_relationship_from_idx      ON scs.supply_chain_relationship (from_party_id);
CREATE INDEX supply_chain_relationship_to_idx        ON scs.supply_chain_relationship (to_party_id);
CREATE INDEX supply_chain_relationship_claimed_by_idx ON scs.supply_chain_relationship (claimed_by_party_id);
CREATE INDEX supply_chain_relationship_pair_type_idx
  ON scs.supply_chain_relationship (from_party_id, to_party_id, relationship_type);
CREATE INDEX representation_mandate_granting_idx     ON scs.representation_mandate (granting_party_id);
CREATE INDEX representation_mandate_representative_idx ON scs.representation_mandate (representative_party_id);
CREATE INDEX representation_mandate_pair_idx
  ON scs.representation_mandate (granting_party_id, representative_party_id);
CREATE INDEX party_identity_evidence_submission_party_idx
  ON scs.party_identity_evidence_submission (party_id);
CREATE INDEX party_identity_evidence_submission_link_idx
  ON scs.party_identity_evidence (submission_id);


-- ── updated_at maintained by the database (function from cap-01.sql) ───────
CREATE TRIGGER party_identity_set_updated_at
  BEFORE UPDATE ON scs.party_identity
  FOR EACH ROW EXECUTE FUNCTION scs.set_updated_at();
CREATE TRIGGER party_identity_evidence_set_updated_at
  BEFORE UPDATE ON scs.party_identity_evidence
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


-- ── Append-only (function from platform.sql) ───────────────────────────────
CREATE TRIGGER party_identity_evidence_submission_append_only
  BEFORE UPDATE OR DELETE ON scs.party_identity_evidence_submission
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER party_identity_evidence_submission_no_truncate
  BEFORE TRUNCATE ON scs.party_identity_evidence_submission
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER party_verification_assessment_append_only
  BEFORE UPDATE OR DELETE ON scs.party_verification_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER party_verification_assessment_no_truncate
  BEFORE TRUNCATE ON scs.party_verification_assessment
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.party_identity IS
  'SCS-CAP-02 ScsPartyIdentity. REGISTERED means a governed record exists — nothing more; verification is separate (party_verification_assessment).';
COMMENT ON TABLE scs.party_identity_evidence IS
  'SCS-CAP-02 ScsPartyIdentity.identityEvidence.evidenceIds, one row per evidence id.';
COMMENT ON TABLE scs.party_verification_assessment IS
  'SCS-CAP-02 ScsPartyVerificationAssessment. Always scoped; never implies sanctions clearance, beneficial ownership, regulatory eligibility or other-framework compliance. Append-only; supersession is recorded on the newer assessment.';
COMMENT ON TABLE scs.party_role_claim IS
  'SCS-CAP-02 ScsPartyRoleClaim. A claim until evidenced and assessed.';
COMMENT ON TABLE scs.supply_chain_relationship IS
  'SCS-CAP-02 ScsSupplyChainRelationship. Bilateral only; does not verify either party or prove commodity movement.';
COMMENT ON TABLE scs.representation_mandate IS
  'SCS-CAP-02 ScsRepresentationMandate. Separate from any relationship; enumerated actions only; revocable.';
COMMENT ON COLUMN scs.representation_mandate.other_action_description IS
  'otherActionDescription — names the specific action; required exactly when permitted_actions includes OTHER_EXPLICITLY_NAMED.';
COMMENT ON TABLE scs.party_identity_evidence_submission IS
  'SCS-CAP-02 ScsPartyIdentityEvidenceSubmission. Evidence admitted after registration, not verified; never changes the party record. Append-only for every role.';
COMMENT ON COLUMN scs.party_role_claim.other_role_description IS
  'otherRoleDescription — names the role; required exactly when claimed_role is OTHER.';
COMMENT ON COLUMN scs.supply_chain_relationship.other_relationship_type_description IS
  'otherRelationshipTypeDescription — names the relationship; required exactly when relationship_type is OTHER.';
COMMENT ON COLUMN scs.party_identity_evidence.submission_id IS
  'The ScsPartyIdentityEvidenceSubmission that linked this evidence id; NULL for evidence given at registration.';


-- ── Grants and row-level security for tables created after migration 004 ───
-- Same rule as schema/roles-rls.sql: SELECT + INSERT for scs_api, RLS on, two
-- permissive policies. (Tables created by migration 002 are in roles-rls.sql.)
GRANT SELECT, INSERT ON scs.party_identity_evidence_submission TO scs_api;
ALTER TABLE scs.party_identity_evidence_submission ENABLE ROW LEVEL SECURITY;
CREATE POLICY party_identity_evidence_submission_scs_api_select ON scs.party_identity_evidence_submission
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY party_identity_evidence_submission_scs_api_insert ON scs.party_identity_evidence_submission
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);


-- ── AAB-PLATFORM-04 ActorSubjectLink, for CAP-02 parties (migration 021) ────
-- A write-once record binding one AAB actor to one CAP-02 party, as the party
-- (IS_SUBJECT) or for it (ACTS_FOR_SUBJECT). Its state (ACTIVE, SUSPENDED,
-- REVOKED, EXPIRED) is derived when read, from the link and its status
-- records; it is never stored. "At most one active link per actor, party and
-- relation" depends on that derived state, so it is enforced by the API under
-- an advisory lock, not here.
CREATE TABLE scs.actor_party_link (
  link_id                           uuid        NOT NULL DEFAULT gen_random_uuid(),
  schema_version                    text        NOT NULL,

  -- who: the actor, as AAB-PLATFORM-03 identifies it
  actor_issuer_type                 text        NOT NULL,
  actor_issuer_country_code         text,                   -- required for COUNTRY_TENANCY
  actor_id                          text        NOT NULL,

  -- for whom: the subject, named generically; for SCS always a CAP-02 party
  subject_domain                    text        NOT NULL,
  subject_type                      text        NOT NULL,
  party_id                          uuid        NOT NULL,

  relation                          text        NOT NULL,
  valid_from                        timestamptz NOT NULL,
  valid_until                       timestamptz NOT NULL,   -- a link always expires
  supersedes_link_id                uuid,                   -- optional

  -- the creator's signed statement: the fields they decided, and their identity
  link_statement                    jsonb       NOT NULL,
  statement_signature               text        NOT NULL,   -- Ed25519, base64

  created_at                        timestamptz NOT NULL DEFAULT now(),
  created_by                        jsonb       NOT NULL,   -- ActorReference v2: HUMAN, accountableName
  link_digest                       text        NOT NULL,   -- sha256: over the whole record

  CONSTRAINT actor_party_link_pk PRIMARY KEY (link_id),
  CONSTRAINT actor_party_link_party_fk
    FOREIGN KEY (party_id) REFERENCES scs.party_identity (party_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- the target of the supersession foreign key
  CONSTRAINT actor_party_link_actor_party_uq
    UNIQUE (link_id, party_id, actor_id),
  -- a link is superseded by a link for the same actor and party, at most once
  CONSTRAINT actor_party_link_supersedes_fk
    FOREIGN KEY (supersedes_link_id, party_id, actor_id)
    REFERENCES scs.actor_party_link (link_id, party_id, actor_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT actor_party_link_supersedes_once_uq
    UNIQUE (supersedes_link_id),
  CONSTRAINT actor_party_link_not_self_superseding_ck
    CHECK (supersedes_link_id IS NULL OR supersedes_link_id <> link_id),
  CONSTRAINT actor_party_link_digest_uq
    UNIQUE (link_digest),

  CONSTRAINT actor_party_link_issuer_ck
    CHECK ((actor_issuer_type = 'PLATFORM_CONTROL_PLANE' AND actor_issuer_country_code IS NULL)
        OR (actor_issuer_type = 'COUNTRY_TENANCY' AND coalesce(actor_issuer_country_code ~ '^[A-Z]{2}$', false))),
  CONSTRAINT actor_party_link_actor_id_not_blank_ck
    CHECK (btrim(actor_id) <> ''),
  CONSTRAINT actor_party_link_subject_ck
    CHECK (subject_domain = 'SCS' AND subject_type = 'PARTY'),
  CONSTRAINT actor_party_link_relation_ck
    CHECK (relation IN ('IS_SUBJECT', 'ACTS_FOR_SUBJECT')),
  -- SCS-CAP-02: at most 12 months, and always ending after it starts
  CONSTRAINT actor_party_link_validity_ck
    CHECK (valid_until > valid_from AND valid_until <= valid_from + interval '12 months'),
  CONSTRAINT actor_party_link_signature_format_ck
    CHECK (statement_signature ~ '^[A-Za-z0-9+/]{86}==$'),
  CONSTRAINT actor_party_link_digest_format_ck
    CHECK (link_digest ~ '^sha256:[0-9a-f]{64}$'),

  -- the record is the statement: what was signed is what is stored. Each
  -- JSON check is wrapped in coalesce(..., false): a missing key yields NULL,
  -- and a CHECK that is NULL passes.
  CONSTRAINT actor_party_link_statement_ck
    CHECK (coalesce(jsonb_typeof(link_statement) = 'object'
       AND link_statement ->> 'statementType' = 'ACTOR_SUBJECT_LINK'
       AND link_statement -> 'actor' -> 'issuer' ->> 'issuerType' = actor_issuer_type
       AND (link_statement -> 'actor' -> 'issuer' ->> 'countryCode') IS NOT DISTINCT FROM actor_issuer_country_code
       AND link_statement -> 'actor' ->> 'actorId' = actor_id
       AND link_statement -> 'subject' ->> 'domain' = subject_domain
       AND link_statement -> 'subject' ->> 'subjectType' = subject_type
       AND link_statement -> 'subject' ->> 'subjectId' = party_id::text
       AND link_statement ->> 'relation' = relation
       AND (link_statement ->> 'supersedesLinkId') IS NOT DISTINCT FROM supersedes_link_id::text
       AND jsonb_typeof(link_statement -> 'authorisationEvidence') = 'array'
       AND jsonb_array_length(link_statement -> 'authorisationEvidence') >= 1
       -- the statement was signed by the recorded creator
       AND link_statement -> 'creator' ->> 'actorId' = created_by ->> 'actorId'
       AND link_statement -> 'creator' -> 'issuer' = created_by -> 'issuer', false)),
  -- the creator is a named human, and never the linked actor
  CONSTRAINT actor_party_link_creator_ck
    CHECK (coalesce(jsonb_typeof(created_by) = 'object'
       AND created_by ->> 'actorType' = 'HUMAN'
       AND btrim(coalesce(created_by ->> 'accountableName', '')) <> ''
       AND created_by ->> 'actorId' <> actor_id, false))
);

-- ── The link's evidence: stored objects that show the party authorised it ───
-- A child table, because an array cannot carry a foreign key. Every link has
-- at least one row (checked at commit, below).
CREATE TABLE scs.actor_party_link_evidence (
  link_id                           uuid        NOT NULL,
  evidence_object_sha256            text        NOT NULL,   -- AAB-PLATFORM-01 objectId
  description                       text        NOT NULL,
  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT actor_party_link_evidence_pk PRIMARY KEY (link_id, evidence_object_sha256),
  CONSTRAINT actor_party_link_evidence_link_fk
    FOREIGN KEY (link_id) REFERENCES scs.actor_party_link (link_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT actor_party_link_evidence_object_fk
    FOREIGN KEY (evidence_object_sha256) REFERENCES scs.evidence_object (content_sha256)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT actor_party_link_evidence_description_ck
    CHECK (btrim(description) <> '')
);

-- ── AAB-PLATFORM-04 ActorSubjectLinkStatusRecord ────────────────────────────
CREATE TABLE scs.actor_party_link_status (
  status_record_id                  uuid        NOT NULL DEFAULT gen_random_uuid(),
  link_id                           uuid        NOT NULL,
  schema_version                    text        NOT NULL,

  action                            text        NOT NULL,
  reason                            text        NOT NULL,
  writer_capacity                   text        NOT NULL,

  -- the writer's signed statement
  status_statement                  jsonb       NOT NULL,
  statement_signature               text        NOT NULL,   -- Ed25519, base64

  recorded_at                       timestamptz NOT NULL DEFAULT now(),
  written_by                        jsonb       NOT NULL,   -- ActorReference v2: HUMAN, accountableName
  record_digest                     text        NOT NULL,   -- sha256: over the whole record

  CONSTRAINT actor_party_link_status_pk PRIMARY KEY (status_record_id),
  CONSTRAINT actor_party_link_status_link_fk
    FOREIGN KEY (link_id) REFERENCES scs.actor_party_link (link_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT actor_party_link_status_digest_uq
    UNIQUE (record_digest),

  CONSTRAINT actor_party_link_status_action_ck
    CHECK (action IN ('SUSPEND', 'REINSTATE', 'REVOKE')),
  CONSTRAINT actor_party_link_status_reason_ck
    CHECK (btrim(reason) <> ''),
  -- a subject's authority may only suspend; reinstating and revoking need the creating role
  CONSTRAINT actor_party_link_status_capacity_ck
    CHECK (writer_capacity = 'CREATING_ROLE'
        OR (writer_capacity = 'SUBJECT_AUTHORITY' AND action = 'SUSPEND')),
  CONSTRAINT actor_party_link_status_signature_format_ck
    CHECK (statement_signature ~ '^[A-Za-z0-9+/]{86}==$'),
  CONSTRAINT actor_party_link_status_digest_format_ck
    CHECK (record_digest ~ '^sha256:[0-9a-f]{64}$'),
  -- the record is the statement
  CONSTRAINT actor_party_link_status_statement_ck
    CHECK (coalesce(jsonb_typeof(status_statement) = 'object'
       AND status_statement ->> 'statementType' = 'ACTOR_SUBJECT_LINK_STATUS'
       AND status_statement ->> 'linkId' = link_id::text
       AND status_statement ->> 'action' = action
       AND status_statement ->> 'reason' = reason
       AND status_statement ->> 'linkDigest' ~ '^sha256:[0-9a-f]{64}$'
       -- the statement was signed by the recorded writer
       AND status_statement -> 'writer' ->> 'actorId' = written_by ->> 'actorId'
       AND status_statement -> 'writer' -> 'issuer' = written_by -> 'issuer', false)),
  -- the writer is a named human
  CONSTRAINT actor_party_link_status_writer_ck
    CHECK (coalesce(jsonb_typeof(written_by) = 'object'
       AND written_by ->> 'actorType' = 'HUMAN'
       AND btrim(coalesce(written_by ->> 'accountableName', '')) <> ''
       AND btrim(coalesce(written_by ->> 'actorId', '')) <> '', false))
);

-- a link is revoked at most once
CREATE UNIQUE INDEX actor_party_link_status_revoked_once_uq
  ON scs.actor_party_link_status (link_id) WHERE action = 'REVOKE';


-- ── A status record binds its link, and is never written by the linked actor ─
CREATE FUNCTION scs.actor_party_link_status_binds_link() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  l scs.actor_party_link%ROWTYPE;
BEGIN
  SELECT * INTO l FROM scs.actor_party_link WHERE link_id = NEW.link_id;
  IF NOT FOUND OR NOT coalesce(NEW.status_statement ->> 'linkDigest' ~ '^sha256:[0-9a-f]{64}$', false) THEN
    RETURN NEW;  -- no such link, or no well-formed digest: the foreign key or actor_party_link_status_statement_ck refuses it
  END IF;
  IF NEW.status_statement ->> 'linkDigest' <> l.link_digest THEN
    RAISE EXCEPTION 'actor_party_link_status_binds_link_ck: the statement names digest %, not link %''s digest %',
      NEW.status_statement ->> 'linkDigest', NEW.link_id, l.link_digest
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.written_by ->> 'actorId' = l.actor_id THEN
    RAISE EXCEPTION 'actor_party_link_status_not_linked_actor_ck: actor % may not write a status record for their own link %',
      l.actor_id, NEW.link_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_party_link_status_binds_link
  BEFORE INSERT ON scs.actor_party_link_status
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_status_binds_link();


-- ── The link's validity is the statement's ──────────────────────────────────
-- A trigger, not a CHECK: the statement's timestamps are text, and a malformed
-- one must be refused as a violation, not fail as a cast error.
CREATE FUNCTION scs.actor_party_link_validity_matches_statement() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  from_ts timestamptz;
  until_ts timestamptz;
BEGIN
  IF jsonb_typeof(NEW.link_statement) IS DISTINCT FROM 'object' THEN
    RETURN NEW;  -- not a statement at all: actor_party_link_statement_ck refuses it
  END IF;
  BEGIN
    from_ts := (NEW.link_statement ->> 'validFrom')::timestamptz;
    until_ts := (NEW.link_statement ->> 'validUntil')::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    from_ts := NULL;
  END;
  IF from_ts IS DISTINCT FROM NEW.valid_from OR until_ts IS DISTINCT FROM NEW.valid_until THEN
    RAISE EXCEPTION 'actor_party_link_validity_matches_statement_ck: link % is valid % to %, its statement says % to %',
      NEW.link_id, NEW.valid_from, NEW.valid_until,
      NEW.link_statement ->> 'validFrom', NEW.link_statement ->> 'validUntil'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_party_link_validity_matches_statement
  BEFORE INSERT ON scs.actor_party_link
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_validity_matches_statement();


-- ── The relation fits the party (SCS-CAP-02), when the link is written ──────
-- IS_SUBJECT only for a natural person; ACTS_FOR_SUBJECT only for an organisation.
CREATE FUNCTION scs.actor_party_link_relation_fits_party() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  kind text;
BEGIN
  SELECT party_type INTO kind FROM scs.party_identity WHERE party_id = NEW.party_id;
  IF kind IS NULL OR NEW.relation NOT IN ('IS_SUBJECT', 'ACTS_FOR_SUBJECT') THEN
    RETURN NEW;  -- no such party, or no such relation: the foreign key or actor_party_link_relation_ck refuses it
  END IF;
  IF (NEW.relation = 'IS_SUBJECT') <> (kind = 'NATURAL_PERSON') THEN
    RAISE EXCEPTION 'actor_party_link_relation_fits_party_ck: % is not a relation to party %, a %',
      NEW.relation, NEW.party_id, kind
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_party_link_relation_fits_party
  BEFORE INSERT ON scs.actor_party_link
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_relation_fits_party();


-- ── The link's evidence is exactly the statement's authorisationEvidence ────
-- Each row must be in the statement, when written ...
CREATE FUNCTION scs.actor_party_link_evidence_in_statement() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  statement jsonb;
BEGIN
  SELECT link_statement INTO statement FROM scs.actor_party_link WHERE link_id = NEW.link_id;
  IF statement IS NULL THEN
    RETURN NEW;  -- no such link: actor_party_link_evidence_link_fk refuses it
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(statement -> 'authorisationEvidence') e
                  WHERE e ->> 'evidenceObjectSha256' = NEW.evidence_object_sha256
                    AND e ->> 'description' = NEW.description) THEN
    RAISE EXCEPTION 'actor_party_link_evidence_in_statement_ck: evidence % (%) is not in link %''s signed statement',
      NEW.evidence_object_sha256, NEW.description, NEW.link_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_party_link_evidence_in_statement
  BEFORE INSERT ON scs.actor_party_link_evidence
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_evidence_in_statement();

-- ... and every item of the statement must have its row, by commit.
CREATE FUNCTION scs.actor_party_link_evidence_complete() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  missing text;
BEGIN
  SELECT e ->> 'evidenceObjectSha256' INTO missing
    FROM jsonb_array_elements(NEW.link_statement -> 'authorisationEvidence') e
   WHERE NOT EXISTS (SELECT 1 FROM scs.actor_party_link_evidence v
                      WHERE v.link_id = NEW.link_id
                        AND v.evidence_object_sha256 = e ->> 'evidenceObjectSha256'
                        AND v.description = e ->> 'description')
   LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'actor_party_link_evidence_complete_ck: link % does not record statement evidence %', NEW.link_id, missing
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER actor_party_link_evidence_complete
  AFTER INSERT ON scs.actor_party_link
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION scs.actor_party_link_evidence_complete();


-- ── Indexes on foreign keys and lookups ─────────────────────────────────────
-- the use check: an actor's links to a party
CREATE INDEX actor_party_link_actor_idx ON scs.actor_party_link (actor_id, party_id);
CREATE INDEX actor_party_link_party_idx ON scs.actor_party_link (party_id);
CREATE INDEX actor_party_link_evidence_object_idx ON scs.actor_party_link_evidence (evidence_object_sha256);
CREATE INDEX actor_party_link_status_link_idx ON scs.actor_party_link_status (link_id, recorded_at);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER actor_party_link_append_only
  BEFORE UPDATE OR DELETE ON scs.actor_party_link
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_no_truncate
  BEFORE TRUNCATE ON scs.actor_party_link
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_evidence_append_only
  BEFORE UPDATE OR DELETE ON scs.actor_party_link_evidence
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_evidence_no_truncate
  BEFORE TRUNCATE ON scs.actor_party_link_evidence
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_status_append_only
  BEFORE UPDATE OR DELETE ON scs.actor_party_link_status
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER actor_party_link_status_no_truncate
  BEFORE TRUNCATE ON scs.actor_party_link_status
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.actor_party_link IS
  'AAB-PLATFORM-04 ActorSubjectLink for CAP-02 parties (SCS-CAP-02). Binds an actor to a party, as or for it; grants no authority. Its state is derived when read. Append-only.';
COMMENT ON TABLE scs.actor_party_link_evidence IS
  'The stored objects (AAB-PLATFORM-01) showing that the party authorised the link. At least one per link. Append-only.';
COMMENT ON TABLE scs.actor_party_link_status IS
  'AAB-PLATFORM-04 ActorSubjectLinkStatusRecord: SUSPEND, REINSTATE or REVOKE, signed by a named human, never the linked actor. Append-only.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.actor_party_link TO scs_api;
ALTER TABLE scs.actor_party_link ENABLE ROW LEVEL SECURITY;
CREATE POLICY actor_party_link_scs_api_select ON scs.actor_party_link
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY actor_party_link_scs_api_insert ON scs.actor_party_link
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.actor_party_link_evidence TO scs_api;
ALTER TABLE scs.actor_party_link_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY actor_party_link_evidence_scs_api_select ON scs.actor_party_link_evidence
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY actor_party_link_evidence_scs_api_insert ON scs.actor_party_link_evidence
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);

GRANT SELECT, INSERT ON scs.actor_party_link_status TO scs_api;
ALTER TABLE scs.actor_party_link_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY actor_party_link_status_scs_api_select ON scs.actor_party_link_status
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY actor_party_link_status_scs_api_insert ON scs.actor_party_link_status
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);


-- ── ScsMandateVerificationAssessment (migration 022) ────────────────────────
-- Mirrors scs.party_verification_assessment (migrations 002 and 010). A
-- mandate's current verification status is derived when read from its
-- assessments; scs.representation_mandate.verification_status keeps its
-- starting value and is never updated.
CREATE TABLE scs.mandate_verification_assessment (
  assessment_id                     uuid        NOT NULL DEFAULT gen_random_uuid(),
  mandate_id                        uuid        NOT NULL,
  schema_version                    text        NOT NULL,

  verification_status               text        NOT NULL,

  -- verificationScope
  scope_description                 text        NOT NULL,
  scope_verified_attributes         text[]      NOT NULL,
  scope_excluded_from_verification  text[]      NOT NULL,

  -- verifyingAuthority
  verifying_authority_id            text        NOT NULL,
  verifying_authority_name          text        NOT NULL,
  verifying_authority_basis         text        NOT NULL,
  verifying_authority_jurisdiction_code text    NOT NULL,

  verified_at                       timestamptz NOT NULL,
  expires_at                        timestamptz,            -- optional; never after the mandate's validUntil
  evidence_ids                      uuid[]      NOT NULL,   -- each among the mandate's mandate_evidence_ids
  limitations                       text[]      NOT NULL,

  recorded_by                       jsonb       NOT NULL,   -- ActorReference
  recorded_at                       timestamptz NOT NULL DEFAULT now(),
  supersedes_assessment_id          uuid,                   -- optional

  -- authorityBoundary — verifying a mandate verifies the mandate only
  boundary_does_not_extend_the_mandates_scope        boolean NOT NULL DEFAULT true,
  boundary_does_not_verify_either_partys_identity    boolean NOT NULL DEFAULT true,
  boundary_does_not_grant_regulatory_eligibility     boolean NOT NULL DEFAULT true,

  created_at                        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mandate_verification_assessment_pk PRIMARY KEY (assessment_id),
  CONSTRAINT mandate_verification_assessment_mandate_fk
    FOREIGN KEY (mandate_id) REFERENCES scs.representation_mandate (mandate_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  -- the target of the supersession foreign key
  CONSTRAINT mandate_verification_assessment_mandate_uq
    UNIQUE (assessment_id, mandate_id),
  -- a superseded assessment belongs to the same mandate, superseded at most once
  CONSTRAINT mandate_verification_assessment_supersedes_fk
    FOREIGN KEY (supersedes_assessment_id, mandate_id)
    REFERENCES scs.mandate_verification_assessment (assessment_id, mandate_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT mandate_verification_assessment_supersedes_once_uq
    UNIQUE (supersedes_assessment_id),
  CONSTRAINT mandate_verification_assessment_not_self_superseding_ck
    CHECK (supersedes_assessment_id IS NULL OR supersedes_assessment_id <> assessment_id),

  -- only these are recorded; CLAIMED_UNVERIFIED and VERIFICATION_EXPIRED are derived when read
  CONSTRAINT mandate_verification_assessment_recordable_status_ck
    CHECK (verification_status IN ('PARTIALLY_VERIFIED', 'VERIFIED_FOR_DECLARED_SCOPE',
                                   'DISPUTED', 'FAIL_CLOSED')),
  CONSTRAINT mandate_verification_assessment_boundary_ck
    CHECK (boundary_does_not_extend_the_mandates_scope
       AND boundary_does_not_verify_either_partys_identity
       AND boundary_does_not_grant_regulatory_eligibility),
  CONSTRAINT mandate_verification_assessment_required_text_not_blank_ck
    CHECK (btrim(scope_description) <> '' AND btrim(verifying_authority_id) <> ''
       AND btrim(verifying_authority_name) <> '' AND btrim(verifying_authority_basis) <> ''),
  CONSTRAINT mandate_verification_assessment_jurisdiction_ck
    CHECK (verifying_authority_jurisdiction_code ~ '^[A-Z]{2}$'),
  CONSTRAINT mandate_verification_assessment_arrays_no_null_elements_ck
    CHECK (array_position(scope_verified_attributes, NULL) IS NULL
       AND array_position(scope_excluded_from_verification, NULL) IS NULL
       AND array_position(evidence_ids, NULL) IS NULL
       AND array_position(limitations, NULL) IS NULL),
  -- verification always names its evidence
  CONSTRAINT mandate_verification_assessment_evidence_not_empty_ck
    CHECK (cardinality(evidence_ids) >= 1),
  CONSTRAINT mandate_verification_assessment_expiry_after_verification_ck
    CHECK (expires_at IS NULL OR expires_at > verified_at),
  CONSTRAINT mandate_verification_assessment_verified_not_after_recorded_ck
    CHECK (verified_at <= recorded_at),
  CONSTRAINT mandate_verification_assessment_recorded_by_object_ck
    CHECK (jsonb_typeof(recorded_by) = 'object')
);


-- ── An assessment stays within its mandate: its evidence and its expiry ─────
CREATE FUNCTION scs.mandate_verification_assessment_within_mandate() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  m scs.representation_mandate%ROWTYPE;
BEGIN
  SELECT * INTO m FROM scs.representation_mandate WHERE mandate_id = NEW.mandate_id;
  IF NOT FOUND OR array_position(NEW.evidence_ids, NULL) IS NOT NULL THEN
    RETURN NEW;  -- no such mandate, or a null evidence id: the foreign key or the array check refuses it
  END IF;
  IF NOT (NEW.evidence_ids <@ m.mandate_evidence_ids) THEN
    RAISE EXCEPTION 'mandate_verification_assessment_evidence_in_mandate_ck: evidence % is not among mandate %''s evidence',
      (SELECT array_agg(e) FROM unnest(NEW.evidence_ids) e WHERE NOT (e = ANY (m.mandate_evidence_ids))), NEW.mandate_id
      USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at > m.valid_until THEN
    RAISE EXCEPTION 'mandate_verification_assessment_within_validity_ck: expiry % is after mandate %''s validUntil %',
      NEW.expires_at, NEW.mandate_id, m.valid_until
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER mandate_verification_assessment_within_mandate
  BEFORE INSERT ON scs.mandate_verification_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.mandate_verification_assessment_within_mandate();


CREATE INDEX mandate_verification_assessment_mandate_idx
  ON scs.mandate_verification_assessment (mandate_id, recorded_at DESC);


-- ── Append-only for every role (function from platform.sql) ─────────────────
CREATE TRIGGER mandate_verification_assessment_append_only
  BEFORE UPDATE OR DELETE ON scs.mandate_verification_assessment
  FOR EACH ROW EXECUTE FUNCTION scs.reject_modification();
CREATE TRIGGER mandate_verification_assessment_no_truncate
  BEFORE TRUNCATE ON scs.mandate_verification_assessment
  FOR EACH STATEMENT EXECUTE FUNCTION scs.reject_modification();


COMMENT ON TABLE scs.mandate_verification_assessment IS
  'SCS-CAP-02 ScsMandateVerificationAssessment. Verifies a representation mandate only, never either party''s identity. The mandate''s current verification status is derived when read. Append-only; supersession is recorded on the newer assessment.';


-- ── Grants and row-level security (rule from migration 004) ─────────────────
GRANT SELECT, INSERT ON scs.mandate_verification_assessment TO scs_api;
ALTER TABLE scs.mandate_verification_assessment ENABLE ROW LEVEL SECURITY;
CREATE POLICY mandate_verification_assessment_scs_api_select ON scs.mandate_verification_assessment
  AS PERMISSIVE FOR SELECT TO scs_api USING (true);
CREATE POLICY mandate_verification_assessment_scs_api_insert ON scs.mandate_verification_assessment
  AS PERMISSIVE FOR INSERT TO scs_api WITH CHECK (true);
