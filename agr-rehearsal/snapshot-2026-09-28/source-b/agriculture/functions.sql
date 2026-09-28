-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: agriculture. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for agriculture: functions 170, tables 121, views 65, rls_enabled_tables 121, constraints 998, triggers 80, policies 0, indexes 334.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_accept_validated_input(p_input_submission_id uuid, p_actor_id uuid)
 RETURNS agriculture.input_submission
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.input_submission; failures integer; photos integer; BEGIN
 IF p_actor_id IS NULL THEN RAISE EXCEPTION 'INPUT_ACCEPTANCE_REQUIRES_ACTOR' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO failures FROM agriculture.input_validation_event WHERE input_submission_id=p_input_submission_id AND validation_result='FAIL'; IF failures>0 THEN RAISE EXCEPTION 'INPUT_HAS_FAILED_VALIDATION_AND_CANNOT_BE_ACCEPTED' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM agriculture.input_submission WHERE input_submission_id=p_input_submission_id FOR UPDATE; IF r.input_submission_id IS NULL OR r.submission_status NOT IN ('VALID','VALID_WITH_WARNINGS') THEN RAISE EXCEPTION 'INPUT_NOT_IN_ACCEPTABLE_VALIDATED_STATE' USING ERRCODE='55000'; END IF;
 IF r.submission_type='OBSERVATION' THEN SELECT count(*) INTO photos FROM agriculture.photo_evidence WHERE input_submission_id=p_input_submission_id AND image_quality_status IN ('ACCEPTABLE','ACCEPTABLE_WITH_WARNINGS') AND context_validation_status IN ('VALIDATED','VALIDATED_WITH_WARNINGS') AND review_status IN ('APPROVED','APPROVED_WITH_WARNINGS') AND consent_usage_status IN ('APPROVED','RESTRICTED'); IF photos=0 THEN RAISE EXCEPTION 'OBSERVATION_INPUT_REQUIRES_APPROVED_USABLE_PHOTO_EVIDENCE' USING ERRCODE='23514'; END IF; END IF;
 UPDATE agriculture.input_submission SET submission_status='ACCEPTED',accepted_by=p_actor_id,accepted_at=now() WHERE input_submission_id=p_input_submission_id RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_activate_trial(p_trial_id uuid, p_governance_decision_id uuid, p_actor_id uuid)
 RETURNS agriculture.trial
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  r agriculture.trial;
  ds text;
  fv_ready text;
  fv_status text;
  plot_count integer;
  primary_protocol_count integer;
begin
  select decision_status into ds from agriculture.governance_decision where decision_id=p_governance_decision_id;
  if ds<>'APPROVED' then
    raise exception 'TRIAL_ACTIVATION_REQUIRES_APPROVED_GOVERNANCE_DECISION' using errcode='23514';
  end if;

  select * into r from agriculture.trial where trial_id=p_trial_id for update;
  if r.trial_id is null then raise exception 'TRIAL_NOT_FOUND' using errcode='P0002'; end if;
  if r.lifecycle_status not in ('DRAFT','UNDER_REVIEW','APPROVED') then
    raise exception 'TRIAL_NOT_ELIGIBLE_FOR_ACTIVATION_FROM_CURRENT_LIFECYCLE: %',r.lifecycle_status using errcode='55000';
  end if;

  if r.formulation_version_id is not null then
    select trial_readiness,lifecycle_status into fv_ready,fv_status
    from agriculture.formulation_version where formulation_version_id=r.formulation_version_id;
    if fv_ready<>'READY_FOR_TRIAL' or fv_status<>'APPROVED' then
      raise exception 'TRIAL_FORMULATION_NOT_APPROVED_AND_READY' using errcode='23514';
    end if;
  end if;

  select count(*) into plot_count from agriculture.plot where trial_id=p_trial_id and lifecycle_status='ACTIVE';
  if plot_count=0 then raise exception 'TRIAL_REQUIRES_AT_LEAST_ONE_ACTIVE_PLOT' using errcode='23514'; end if;

  select count(*) into primary_protocol_count
  from agriculture.trial_protocol_binding b
  join agriculture.observation_template_version tv on tv.observation_template_version_id=b.observation_template_version_id
  where b.trial_id=p_trial_id and b.binding_role='PRIMARY' and b.required and b.effective_until is null and tv.version_status='ACTIVE';
  if primary_protocol_count=0 then raise exception 'TRIAL_REQUIRES_PRIMARY_OBSERVATION_PROTOCOL' using errcode='23514'; end if;

  update agriculture.trial
  set lifecycle_status='ACTIVE',
      governance_decision_id=p_governance_decision_id,
      updated_by=p_actor_id,
      updated_at=now(),
      start_date=coalesce(start_date,current_date)
  where trial_id=p_trial_id
  returning * into r;

  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_actor_has_capability(p_actor_id uuid, p_capability text, p_country_code character DEFAULT NULL::bpchar)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE cap text:=lower(btrim(p_capability)); allowed boolean:=false;
BEGIN
 IF p_actor_id IS NULL OR NOT EXISTS(SELECT 1 FROM agriculture.actor WHERE actor_id=p_actor_id AND active) THEN RETURN false; END IF;
 IF cap='community_capture' THEN
   RETURN EXISTS(SELECT 1 FROM agriculture.actor_access_assignment aaa WHERE aaa.actor_id=p_actor_id AND aaa.active AND aaa.access_profile_code='AGRICULTURE_RUNTIME_COMMUNITY' AND aaa.authority_scope='AGRICULTURE' AND (aaa.country_code IS NULL OR p_country_code IS NULL OR aaa.country_code=p_country_code));
 END IF;
 SELECT COALESCE(bool_or(CASE cap WHEN 'read' THEN ap.can_read_canonical_data WHEN 'create_draft' THEN ap.can_create_drafts WHEN 'update_draft' THEN ap.can_update_drafts WHEN 'submit_review' THEN ap.can_submit_for_review WHEN 'review' THEN ap.can_review WHEN 'approve' THEN ap.can_approve WHEN 'retire' THEN ap.can_retire WHEN 'read_audit' THEN ap.can_read_audit WHEN 'integrity_check' THEN ap.can_run_integrity_checks WHEN 'run_migrations' THEN ap.can_run_migrations ELSE false END),false) INTO allowed FROM agriculture.actor_access_assignment aaa JOIN agriculture.access_profile ap ON ap.access_profile_code=aaa.access_profile_code WHERE aaa.actor_id=p_actor_id AND aaa.active AND ap.active AND aaa.authority_scope='AGRICULTURE' AND (aaa.country_code IS NULL OR p_country_code IS NULL OR aaa.country_code=p_country_code);
 IF allowed THEN RETURN true; END IF;
 SELECT COALESCE(bool_or(CASE cap WHEN 'review' THEN ar.can_review WHEN 'approve' THEN ar.can_approve WHEN 'administer' THEN ar.can_administer WHEN 'run_migrations' THEN ar.can_run_migrations ELSE false END),false) INTO allowed FROM agriculture.actor_authority aa JOIN agriculture.authority_role ar ON ar.role_code=aa.role_code WHERE aa.actor_id=p_actor_id AND aa.active AND ar.active AND aa.authority_scope='AGRICULTURE' AND (aa.country_code IS NULL OR p_country_code IS NULL OR aa.country_code=p_country_code);
 RETURN allowed;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_add_country_resource_domain_relevance(p_country_resource_candidate_id uuid, p_domain_code text, p_relevance_status text, p_relevance_summary text, p_evidence_strength text, p_actor_id uuid)
 RETURNS agriculture.country_resource_domain_relevance
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.country_resource_domain_relevance; cc char(2);
BEGIN
 SELECT country_code INTO cc FROM agriculture.country_resource_candidate WHERE country_resource_candidate_id=p_country_resource_candidate_id AND scientific_status<>'ARCHIVED'; IF NOT FOUND THEN RAISE EXCEPTION 'COUNTRY_RESOURCE_CANDIDATE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 PERFORM agriculture.api_require_capability(p_actor_id,'update_draft',cc);
 INSERT INTO agriculture.country_resource_domain_relevance(country_resource_candidate_id,domain_code,relevance_status,relevance_summary,evidence_strength) VALUES(p_country_resource_candidate_id,p_domain_code,p_relevance_status,btrim(p_relevance_summary),p_evidence_strength)
 ON CONFLICT(country_resource_candidate_id,domain_code) DO UPDATE SET relevance_status=excluded.relevance_status,relevance_summary=excluded.relevance_summary,evidence_strength=excluded.evidence_strength RETURNING * INTO r; RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_add_evidence_packet_item(p_evidence_packet_id uuid, p_evidence_item_type text, p_evidence_role text DEFAULT 'SUPPORTING'::text, p_linked_entity_type text DEFAULT NULL::text, p_linked_entity_id uuid DEFAULT NULL::uuid, p_source_object_id uuid DEFAULT NULL::uuid, p_item_summary text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.evidence_packet_item
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.evidence_packet_item; next_order integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.evidence_packet WHERE evidence_packet_id=p_evidence_packet_id AND packet_status='DRAFT') THEN RAISE EXCEPTION 'EVIDENCE_PACKET_MUST_BE_DRAFT' USING ERRCODE='55000'; END IF;
 IF p_linked_entity_id IS NULL AND p_source_object_id IS NULL THEN RAISE EXCEPTION 'EVIDENCE_ITEM_REQUIRES_LINKED_ENTITY_OR_SOURCE_OBJECT' USING ERRCODE='23514'; END IF;
 SELECT COALESCE(max(item_order),0)+1 INTO next_order FROM agriculture.evidence_packet_item WHERE evidence_packet_id=p_evidence_packet_id;
 INSERT INTO agriculture.evidence_packet_item(evidence_packet_id,item_order,evidence_item_type,linked_entity_type,linked_entity_id,source_object_id,evidence_role,item_summary,inclusion_status,added_by)
 VALUES(p_evidence_packet_id,next_order,p_evidence_item_type,p_linked_entity_type,p_linked_entity_id,p_source_object_id,p_evidence_role,p_item_summary,'INCLUDED',p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_add_formulation_ingredient(p_formulation_version_id uuid, p_ingredient_id uuid, p_inclusion_rate_percent numeric, p_sequence_order integer, p_ingredient_role text, p_line_notes text DEFAULT NULL::text, p_data_class text DEFAULT 'TEST'::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.formulation_version_ingredient_line
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.formulation_version_ingredient_line; s text; total numeric;
BEGIN
 SELECT lifecycle_status INTO s FROM agriculture.formulation_version WHERE formulation_version_id=p_formulation_version_id;
 IF s IS NULL THEN RAISE EXCEPTION 'FORMULATION_VERSION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF s<>'DRAFT' THEN RAISE EXCEPTION 'FORMULATION_LINES_EDITABLE_ONLY_IN_DRAFT' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id AND lifecycle_status='ACTIVE') THEN RAISE EXCEPTION 'FORMULATION_REQUIRES_ACTIVE_INGREDIENT' USING ERRCODE='23514'; END IF;
 SELECT COALESCE(sum(inclusion_rate_percent),0) INTO total FROM agriculture.formulation_version_ingredient_line WHERE formulation_version_id=p_formulation_version_id AND is_active;
 IF total+p_inclusion_rate_percent>100 THEN RAISE EXCEPTION 'FORMULATION_TOTAL_INCLUSION_EXCEEDS_100_PERCENT' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.formulation_version_ingredient_line(formulation_version_id,ingredient_id,inclusion_rate_percent,sequence_order,ingredient_role,line_notes,data_class,is_active,created_by)
 VALUES(p_formulation_version_id,p_ingredient_id,p_inclusion_rate_percent,p_sequence_order,p_ingredient_role,p_line_notes,p_data_class,true,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_add_formulation_ingredient_line(p_formulation_version_id uuid, p_ingredient_id uuid, p_inclusion_rate_percent numeric, p_sequence_order integer, p_ingredient_role text, p_line_notes text DEFAULT NULL::text, p_data_class text DEFAULT 'TEST'::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.formulation_version_ingredient_line
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.formulation_version_ingredient_line; BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.formulation_version WHERE formulation_version_id=p_formulation_version_id AND trial_readiness='NOT_READY') THEN RAISE EXCEPTION 'INGREDIENT_LINES_ONLY_ALLOWED_BEFORE_TRIAL_READINESS' USING ERRCODE='55000'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id AND lifecycle_status<>'ARCHIVED') THEN RAISE EXCEPTION 'ACTIVE_INGREDIENT_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.formulation_version_ingredient_line(formulation_version_id,ingredient_id,inclusion_rate_percent,sequence_order,ingredient_role,line_notes,data_class,is_active,created_by) VALUES(p_formulation_version_id,p_ingredient_id,p_inclusion_rate_percent,p_sequence_order,btrim(p_ingredient_role),p_line_notes,p_data_class,true,p_actor_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_add_ingredient_alias(p_ingredient_id uuid, p_alias_name text, p_alias_type text DEFAULT 'COMMON'::text, p_language_code text DEFAULT NULL::text)
 RETURNS agriculture.ingredient_alias
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient_alias;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id AND lifecycle_status<>'ARCHIVED') THEN RAISE EXCEPTION 'ACTIVE_INGREDIENT_REQUIRED' USING ERRCODE='23514'; END IF;
 IF nullif(btrim(p_alias_name),'') IS NULL THEN RAISE EXCEPTION 'INGREDIENT_ALIAS_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.ingredient_alias(ingredient_id,alias_name,language_code,alias_type) VALUES(p_ingredient_id,btrim(p_alias_name),p_language_code,p_alias_type) RETURNING * INTO r; RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_add_ingredient_evidence(p_ingredient_id uuid, p_evidence_source_id uuid, p_claim_type text, p_claim_summary text, p_ingredient_version_id uuid DEFAULT NULL::uuid, p_evidence_strength text DEFAULT 'UNASSESSED'::text, p_supports_claim boolean DEFAULT NULL::boolean)
 RETURNS agriculture.ingredient_evidence
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient_evidence;
BEGIN
 IF p_ingredient_version_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM agriculture.ingredient_version WHERE ingredient_version_id=p_ingredient_version_id AND ingredient_id=p_ingredient_id) THEN RAISE EXCEPTION 'INGREDIENT_VERSION_MISMATCH' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.evidence_source WHERE evidence_source_id=p_evidence_source_id) THEN RAISE EXCEPTION 'EVIDENCE_SOURCE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 INSERT INTO agriculture.ingredient_evidence(ingredient_id,ingredient_version_id,evidence_source_id,claim_type,claim_summary,evidence_strength,supports_claim,review_status)
 VALUES(p_ingredient_id,p_ingredient_version_id,p_evidence_source_id,p_claim_type,btrim(p_claim_summary),p_evidence_strength,p_supports_claim,'PENDING') RETURNING * INTO r; RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_amend_ingredient(p_ingredient_id uuid, p_amendment_rationale text, p_actor_id uuid, p_ingredient_name text DEFAULT NULL::text, p_material_class text DEFAULT NULL::text, p_preparation_class text DEFAULT NULL::text, p_category text DEFAULT NULL::text, p_foliar_compatibility text DEFAULT NULL::text, p_fertigation_compatibility text DEFAULT NULL::text, p_risks_contraindications text DEFAULT NULL::text, p_mitigation_lever text DEFAULT NULL::text, p_handling_storage_notes text DEFAULT NULL::text)
 RETURNS agriculture.ingredient
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE
 r agriculture.ingredient;
 v_current agriculture.ingredient%ROWTYPE;
 v_next integer;
BEGIN
 SELECT * INTO v_current FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id FOR UPDATE;
 IF v_current.ingredient_id IS NULL THEN RAISE EXCEPTION 'INGREDIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 PERFORM agriculture.api_require_capability(p_actor_id,'update_draft',v_current.country_code);
 IF v_current.lifecycle_status NOT IN ('DRAFT','UNDER_REVIEW') THEN RAISE EXCEPTION 'INGREDIENT_AMENDMENT_REQUIRES_DRAFT_OR_UNDER_REVIEW' USING ERRCODE='55000'; END IF;
 IF nullif(btrim(p_amendment_rationale),'') IS NULL THEN RAISE EXCEPTION 'INGREDIENT_AMENDMENT_REQUIRES_RATIONALE' USING ERRCODE='23514'; END IF;
 v_next:=v_current.current_version_no+1;
 INSERT INTO agriculture.ingredient_version(ingredient_id,version_no,category,foliar_compatibility,fertigation_compatibility,risks_contraindications,mitigation_lever,handling_storage_notes,amendment_rationale,review_status,created_by)
 VALUES(p_ingredient_id,v_next,p_category,p_foliar_compatibility,p_fertigation_compatibility,p_risks_contraindications,p_mitigation_lever,p_handling_storage_notes,btrim(p_amendment_rationale),'PENDING',p_actor_id);
 UPDATE agriculture.ingredient
 SET ingredient_name=COALESCE(NULLIF(btrim(p_ingredient_name),''),ingredient_name),
     material_class=COALESCE(NULLIF(btrim(p_material_class),''),material_class),
     preparation_class=CASE WHEN p_preparation_class IS NULL THEN preparation_class ELSE NULLIF(btrim(p_preparation_class),'') END,
     current_version_no=v_next,
     updated_at=now()
 WHERE ingredient_id=p_ingredient_id
 RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_approve_ingredient_version(p_ingredient_version_id uuid, p_governance_decision_id uuid, p_actor_id uuid)
 RETURNS agriculture.ingredient_version
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  r agriculture.ingredient_version;
  ds text;
begin
  select decision_status into ds from agriculture.governance_decision where decision_id=p_governance_decision_id;
  if ds<>'APPROVED' or p_actor_id is null then
    raise exception 'INGREDIENT_VERSION_APPROVAL_REQUIRES_APPROVED_GOVERNANCE_AND_ACTOR' using errcode='23514';
  end if;

  update agriculture.ingredient_version
  set review_status='APPROVED',approved_by=p_actor_id,approved_at=now()
  where ingredient_version_id=p_ingredient_version_id and review_status='PENDING'
  returning * into r;

  if r.ingredient_version_id is null then
    raise exception 'INGREDIENT_VERSION_NOT_FOUND_OR_NOT_PENDING' using errcode='55000';
  end if;

  update agriculture.ingredient
  set current_version_no=r.version_no,
      lifecycle_status=case when lifecycle_status in ('DRAFT','UNDER_REVIEW') then 'ACTIVE' else lifecycle_status end,
      data_class=case when lifecycle_status in ('DRAFT','UNDER_REVIEW') then 'SCIENTIST_APPROVED' else data_class end,
      updated_at=now()
  where ingredient_id=r.ingredient_id;

  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_approve_learning_candidate(p_learning_candidate_id uuid, p_approved_learning_code text, p_learning_type text, p_applicability_scope jsonb, p_governance_decision_id uuid, p_actor_id uuid, p_limitation_summary text DEFAULT NULL::text)
 RETURNS agriculture.approved_learning
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
begin
  return agriculture.api_approve_learning_candidate(p_learning_candidate_id,p_approved_learning_code,p_learning_type,p_applicability_scope,p_limitation_summary,p_governance_decision_id,p_actor_id);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_approve_learning_candidate(p_learning_candidate_id uuid, p_approved_learning_code text, p_learning_type text, p_applicability_scope jsonb, p_limitation_summary text, p_governance_decision_id uuid, p_actor_id uuid)
 RETURNS agriculture.approved_learning
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare lc agriculture.learning_candidate; r agriculture.approved_learning; ds text;
begin
  perform agriculture.api_require_capability(p_actor_id,'approve',null);
  if p_actor_id is null then raise exception 'LEARNING_APPROVAL_REQUIRES_ACTOR' using errcode='23514'; end if;
  select decision_status into ds from agriculture.governance_decision where decision_id=p_governance_decision_id;
  if ds<>'APPROVED' then raise exception 'LEARNING_APPROVAL_REQUIRES_APPROVED_GOVERNANCE_DECISION' using errcode='23514'; end if;
  select * into lc from agriculture.learning_candidate where learning_candidate_id=p_learning_candidate_id for update;
  if lc.learning_candidate_id is null or lc.candidate_status<>'UNDER_REVIEW' then raise exception 'LEARNING_CANDIDATE_NOT_UNDER_REVIEW' using errcode='55000'; end if;
  if exists(select 1 from agriculture.contradiction_record where subject_entity_type=lc.subject_entity_type and subject_entity_id=lc.subject_entity_id and lifecycle_status in ('OPEN','UNDER_REVIEW') and severity in ('HIGH','CRITICAL')) then raise exception 'HIGH_OR_CRITICAL_CONTRADICTION_BLOCKS_LEARNING_APPROVAL' using errcode='23514'; end if;
  update agriculture.learning_candidate set candidate_status='APPROVED',governance_decision_id=p_governance_decision_id,reviewed_by=p_actor_id,reviewed_at=now() where learning_candidate_id=lc.learning_candidate_id returning * into lc;
  insert into agriculture.approved_learning(approved_learning_code,learning_candidate_id,learning_type,learning_statement,applicability_scope,limitation_summary,evidence_packet_id,governance_decision_id,lifecycle_status,approved_by,approved_at,country_workspace_id)
  values(upper(btrim(p_approved_learning_code)),lc.learning_candidate_id,p_learning_type,lc.learning_statement,coalesce(p_applicability_scope,'{}'::jsonb),p_limitation_summary,lc.evidence_packet_id,p_governance_decision_id,'ACTIVE',p_actor_id,now(),lc.country_workspace_id) returning * into r;
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_archive_discovery_candidate(p_discovery_candidate_id uuid, p_reason text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.discovery_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.discovery_candidate;
BEGIN
 IF nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'ARCHIVE_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.discovery_candidate SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_reason),updated_by=p_actor_id,updated_at=now() WHERE discovery_candidate_id=p_discovery_candidate_id AND lifecycle_status<>'ARCHIVED' RETURNING * INTO r;
 IF r.discovery_candidate_id IS NULL THEN SELECT * INTO r FROM agriculture.discovery_candidate WHERE discovery_candidate_id=p_discovery_candidate_id; END IF;
 IF r.discovery_candidate_id IS NULL THEN RAISE EXCEPTION 'DISCOVERY_CANDIDATE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_archive_foundation_record(p_entity_type text, p_entity_id uuid, p_reason text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE n integer; t text:=upper(btrim(p_entity_type));
BEGIN
 IF nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'ARCHIVE_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
 CASE t
  WHEN 'ORGANIZATION' THEN UPDATE agriculture.organization SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=p_reason,updated_by=p_actor_id,updated_at=now() WHERE organization_id=p_entity_id AND lifecycle_status<>'ARCHIVED';
  WHEN 'FARM' THEN UPDATE agriculture.farm SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=p_reason,updated_by=p_actor_id,updated_at=now() WHERE farm_id=p_entity_id AND lifecycle_status<>'ARCHIVED';
  WHEN 'LOCATION' THEN UPDATE agriculture.location SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=p_reason,updated_by=p_actor_id,updated_at=now() WHERE location_id=p_entity_id AND lifecycle_status<>'ARCHIVED';
  WHEN 'CROP' THEN UPDATE agriculture.crop SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=p_reason,updated_by=p_actor_id,updated_at=now() WHERE crop_id=p_entity_id AND lifecycle_status<>'ARCHIVED';
  WHEN 'VARIETY' THEN UPDATE agriculture.variety SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=p_reason,updated_by=p_actor_id,updated_at=now() WHERE variety_id=p_entity_id AND lifecycle_status<>'ARCHIVED';
  WHEN 'AGRICULTURAL_PROBLEM' THEN UPDATE agriculture.agricultural_problem SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=p_reason,updated_by=p_actor_id,updated_at=now() WHERE agricultural_problem_id=p_entity_id AND lifecycle_status<>'ARCHIVED';
  ELSE RAISE EXCEPTION 'UNSUPPORTED_FOUNDATION_ENTITY_TYPE: %',t USING ERRCODE='22023';
 END CASE;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN jsonb_build_object('ok',true,'entity_type',t,'entity_id',p_entity_id,'changed',n=1);
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_archive_ingredient(p_ingredient_id uuid, p_archive_reason text, p_actor_id uuid)
 RETURNS agriculture.ingredient
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient; v_country char(2);
BEGIN
 SELECT country_code INTO v_country FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'INGREDIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 PERFORM agriculture.api_require_capability(p_actor_id,'retire',v_country);
 IF nullif(btrim(p_archive_reason),'') IS NULL THEN RAISE EXCEPTION 'INGREDIENT_ARCHIVE_REQUIRES_REASON' USING ERRCODE='23514'; END IF;
 IF EXISTS(
   SELECT 1 FROM agriculture.formulation_version_ingredient_line vil
   JOIN agriculture.formulation_version fv ON fv.formulation_version_id=vil.formulation_version_id
   WHERE vil.ingredient_id=p_ingredient_id AND vil.is_active AND fv.lifecycle_status='APPROVED' AND fv.trial_readiness='READY_FOR_TRIAL'
 ) THEN RAISE EXCEPTION 'INGREDIENT_IN_ACTIVE_READY_FORMULATION_CANNOT_BE_ARCHIVED' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.ingredient
 SET lifecycle_status='RETIRED',data_class='ARCHIVED',retired_at=now(),updated_at=now()
 WHERE ingredient_id=p_ingredient_id AND lifecycle_status NOT IN ('RETIRED','SUPERSEDED')
 RETURNING * INTO r;
 IF r.ingredient_id IS NULL THEN RAISE EXCEPTION 'INGREDIENT_NOT_ARCHIVABLE' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_archive_observation(p_observation_id uuid, p_reason text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.observation
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.observation;
BEGIN
 IF nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'ARCHIVE_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.observation SET observation_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_reason),updated_at=now() WHERE observation_id=p_observation_id AND observation_status<>'ARCHIVED' RETURNING * INTO r;
 IF r.observation_id IS NULL THEN SELECT * INTO r FROM agriculture.observation WHERE observation_id=p_observation_id; END IF;
 IF r.observation_id IS NULL THEN RAISE EXCEPTION 'OBSERVATION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_archive_plot(p_plot_id uuid, p_reason text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.plot
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.plot; ts text; BEGIN IF p_actor_id IS NULL OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'PLOT_ARCHIVE_REQUIRES_ACTOR_AND_REASON' USING ERRCODE='23514'; END IF; SELECT t.lifecycle_status INTO ts FROM agriculture.plot p JOIN agriculture.trial t ON t.trial_id=p.trial_id WHERE p.plot_id=p_plot_id; IF ts='ACTIVE' THEN RAISE EXCEPTION 'PLOT_IN_ACTIVE_TRIAL_CANNOT_BE_ARCHIVED' USING ERRCODE='23514'; END IF; UPDATE agriculture.plot SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_reason),updated_by=p_actor_id,updated_at=now() WHERE plot_id=p_plot_id AND lifecycle_status<>'ARCHIVED' RETURNING * INTO r; IF r.plot_id IS NULL THEN RAISE EXCEPTION 'PLOT_NOT_FOUND_OR_ALREADY_ARCHIVED' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_archive_reference_entity(p_entity_type text, p_entity_id uuid, p_archive_reason text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE et text:=upper(btrim(p_entity_type)); affected integer:=0; BEGIN IF p_actor_id IS NULL OR nullif(btrim(p_archive_reason),'') IS NULL THEN RAISE EXCEPTION 'REFERENCE_ARCHIVE_REQUIRES_ACTOR_AND_REASON' USING ERRCODE='23514'; END IF; IF et='CROP' THEN IF EXISTS(SELECT 1 FROM agriculture.trial WHERE crop_id=p_entity_id AND lifecycle_status='ACTIVE') THEN RAISE EXCEPTION 'CROP_USED_BY_ACTIVE_TRIAL_CANNOT_BE_ARCHIVED' USING ERRCODE='23514'; END IF; UPDATE agriculture.crop SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_archive_reason),updated_by=p_actor_id,updated_at=now() WHERE crop_id=p_entity_id AND lifecycle_status<>'ARCHIVED'; GET DIAGNOSTICS affected=ROW_COUNT; ELSIF et='VARIETY' THEN IF EXISTS(SELECT 1 FROM agriculture.trial WHERE variety_id=p_entity_id AND lifecycle_status='ACTIVE') THEN RAISE EXCEPTION 'VARIETY_USED_BY_ACTIVE_TRIAL_CANNOT_BE_ARCHIVED' USING ERRCODE='23514'; END IF; UPDATE agriculture.variety SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_archive_reason),updated_by=p_actor_id,updated_at=now() WHERE variety_id=p_entity_id AND lifecycle_status<>'ARCHIVED'; GET DIAGNOSTICS affected=ROW_COUNT; ELSIF et='ORGANIZATION' THEN IF EXISTS(SELECT 1 FROM agriculture.trial WHERE organization_id=p_entity_id AND lifecycle_status='ACTIVE') THEN RAISE EXCEPTION 'ORGANIZATION_USED_BY_ACTIVE_TRIAL_CANNOT_BE_ARCHIVED' USING ERRCODE='23514'; END IF; UPDATE agriculture.organization SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_archive_reason),updated_by=p_actor_id,updated_at=now() WHERE organization_id=p_entity_id AND lifecycle_status<>'ARCHIVED'; GET DIAGNOSTICS affected=ROW_COUNT; ELSIF et='FARM' THEN IF EXISTS(SELECT 1 FROM agriculture.trial WHERE farm_id=p_entity_id AND lifecycle_status='ACTIVE') THEN RAISE EXCEPTION 'FARM_USED_BY_ACTIVE_TRIAL_CANNOT_BE_ARCHIVED' USING ERRCODE='23514'; END IF; UPDATE agriculture.farm SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_archive_reason),updated_by=p_actor_id,updated_at=now() WHERE farm_id=p_entity_id AND lifecycle_status<>'ARCHIVED'; GET DIAGNOSTICS affected=ROW_COUNT; ELSIF et='LOCATION' THEN IF EXISTS(SELECT 1 FROM agriculture.trial WHERE location_id=p_entity_id AND lifecycle_status='ACTIVE') THEN RAISE EXCEPTION 'LOCATION_USED_BY_ACTIVE_TRIAL_CANNOT_BE_ARCHIVED' USING ERRCODE='23514'; END IF; UPDATE agriculture.location SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_archive_reason),updated_by=p_actor_id,updated_at=now() WHERE location_id=p_entity_id AND lifecycle_status<>'ARCHIVED'; GET DIAGNOSTICS affected=ROW_COUNT; ELSE RAISE EXCEPTION 'UNSUPPORTED_REFERENCE_ENTITY_TYPE: %',et USING ERRCODE='22023'; END IF; IF affected=0 THEN RAISE EXCEPTION 'REFERENCE_ENTITY_NOT_FOUND_OR_ALREADY_ARCHIVED' USING ERRCODE='55000'; END IF; RETURN jsonb_build_object('entity_type',et,'entity_id',p_entity_id,'status','ARCHIVED','archive_reason',btrim(p_archive_reason)); END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_archive_trial(p_trial_id uuid, p_reason text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.trial
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.trial; BEGIN IF p_actor_id IS NULL OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'TRIAL_ARCHIVE_REQUIRES_ACTOR_AND_REASON' USING ERRCODE='23514'; END IF; UPDATE agriculture.trial SET lifecycle_status='ARCHIVED',archived_by=p_actor_id,archived_at=now(),archive_reason=btrim(p_reason),updated_by=p_actor_id,updated_at=now() WHERE trial_id=p_trial_id AND lifecycle_status IN ('DRAFT','COMPLETED','CANCELLED') RETURNING * INTO r; IF r.trial_id IS NULL THEN RAISE EXCEPTION 'TRIAL_NOT_ARCHIVABLE_OR_NOT_FOUND' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_assert_provenance(p_subject_entity_type text, p_subject_entity_id uuid, p_source_object_id uuid, p_provenance_type text, p_provenance_summary text, p_claim_scope text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.provenance_assertion
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.provenance_assertion;
BEGIN
 IF nullif(btrim(p_provenance_summary),'') IS NULL THEN RAISE EXCEPTION 'PROVENANCE_SUMMARY_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.provenance_assertion(subject_entity_type,subject_entity_id,source_object_id,provenance_type,provenance_summary,claim_scope,verified_status,created_by)
 VALUES(upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_source_object_id,p_provenance_type,btrim(p_provenance_summary),p_claim_scope,'UNVERIFIED',p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_assess_data_quality(p_subject_entity_type text, p_subject_entity_id uuid, p_quality_status text, p_completeness_status text, p_context_quality text, p_method_quality text, p_evidence_quality text, p_photo_quality text, p_assessment_summary text, p_review_required boolean DEFAULT false, p_input_submission_id uuid DEFAULT NULL::uuid, p_governance_review_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.data_quality_assessment
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.data_quality_assessment;
BEGIN
 INSERT INTO agriculture.data_quality_assessment(subject_entity_type,subject_entity_id,input_submission_id,quality_status,completeness_status,context_quality,method_quality,evidence_quality,photo_quality,assessment_summary,assessed_by,review_required,governance_review_id)
 VALUES(upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_input_submission_id,p_quality_status,p_completeness_status,p_context_quality,p_method_quality,p_evidence_quality,p_photo_quality,btrim(p_assessment_summary),p_actor_id,p_review_required,p_governance_review_id)
 ON CONFLICT(subject_entity_type,subject_entity_id) DO UPDATE SET input_submission_id=EXCLUDED.input_submission_id,quality_status=EXCLUDED.quality_status,completeness_status=EXCLUDED.completeness_status,context_quality=EXCLUDED.context_quality,method_quality=EXCLUDED.method_quality,evidence_quality=EXCLUDED.evidence_quality,photo_quality=EXCLUDED.photo_quality,assessment_summary=EXCLUDED.assessment_summary,assessed_by=EXCLUDED.assessed_by,assessed_at=now(),review_required=EXCLUDED.review_required,governance_review_id=EXCLUDED.governance_review_id
 RETURNING * INTO r;
 IF upper(btrim(p_subject_entity_type))='OBSERVATION' THEN UPDATE agriculture.observation SET data_quality_assessment_id=r.data_quality_assessment_id,updated_at=now() WHERE observation_id=p_subject_entity_id; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_assess_photo_evidence(p_photo_evidence_id uuid, p_image_quality_status text, p_context_validation_status text, p_review_status text, p_consent_usage_status text, p_actor_id uuid)
 RETURNS agriculture.photo_evidence
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.photo_evidence; iq text:=upper(btrim(p_image_quality_status)); cv text:=upper(btrim(p_context_validation_status)); rs text:=upper(btrim(p_review_status)); cu text:=upper(btrim(p_consent_usage_status));
BEGIN
 IF p_actor_id IS NULL THEN RAISE EXCEPTION 'PHOTO_ASSESSMENT_REQUIRES_ACTOR' USING ERRCODE='23514'; END IF;
 cv:=CASE cv WHEN 'VALIDATED' THEN 'VALID' WHEN 'VALIDATED_WITH_WARNINGS' THEN 'VALID_WITH_WARNINGS' ELSE cv END;
 cu:=CASE cu WHEN 'APPROVED' THEN 'APPROVED_FOR_RESEARCH' ELSE cu END;
 rs:=CASE rs WHEN 'APPROVED_WITH_WARNINGS' THEN 'APPROVED' ELSE rs END;
 IF iq NOT IN ('ACCEPTABLE','ACCEPTABLE_WITH_WARNINGS','UNUSABLE','QUARANTINED','REJECTED') OR cv NOT IN ('VALID','VALID_WITH_WARNINGS','CONTEXT_MISMATCH','QUARANTINED','REJECTED') OR rs NOT IN ('APPROVED','REJECTED','UNDER_REVIEW','PENDING') OR cu NOT IN ('APPROVED_FOR_RESEARCH','RESTRICTED','WITHDRAWN','NOT_APPLICABLE','PENDING') THEN RAISE EXCEPTION 'INVALID_PHOTO_ASSESSMENT_STATUS' USING ERRCODE='22023'; END IF;
 IF rs='APPROVED' AND (iq IN ('UNUSABLE','QUARANTINED','REJECTED') OR cv IN ('CONTEXT_MISMATCH','QUARANTINED','REJECTED') OR cu='WITHDRAWN') THEN RAISE EXCEPTION 'PHOTO_APPROVAL_INCONSISTENT_WITH_VALIDATION' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.photo_evidence SET image_quality_status=iq,context_validation_status=cv,review_status=rs,consent_usage_status=cu WHERE photo_evidence_id=p_photo_evidence_id RETURNING * INTO r;
 IF r.photo_evidence_id IS NULL THEN RAISE EXCEPTION 'PHOTO_EVIDENCE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 UPDATE observation_core.evidence_link SET review_status=CASE WHEN rs='APPROVED' THEN CASE WHEN iq='ACCEPTABLE_WITH_WARNINGS' OR cv='VALID_WITH_WARNINGS' THEN 'APPROVED_WITH_WARNINGS' ELSE 'APPROVED' END ELSE rs END WHERE photo_evidence_id=p_photo_evidence_id;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_assess_resource_safety_gate(p_resource_discovery_run_id uuid, p_toxicity_review_status text DEFAULT 'UNASSESSED'::text, p_ecological_review_status text DEFAULT 'UNASSESSED'::text, p_traditional_knowledge_only boolean DEFAULT false, p_supplier_claim_only boolean DEFAULT false, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.resource_safety_ecology_gate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE rrun agriculture.resource_discovery_run; c agriculture.country_resource_candidate; w agriculture.resource_waste_stream; g agriculture.resource_safety_ecology_gate; status text; reason text; unknown_flag boolean;
BEGIN
 SELECT * INTO rrun FROM agriculture.resource_discovery_run WHERE resource_discovery_run_id=p_resource_discovery_run_id;
 IF rrun.resource_discovery_run_id IS NULL THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_RUN_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 SELECT * INTO c FROM agriculture.country_resource_candidate WHERE country_resource_candidate_id=rrun.country_resource_candidate_id;
 IF rrun.resource_waste_stream_id IS NOT NULL THEN SELECT * INTO w FROM agriculture.resource_waste_stream WHERE resource_waste_stream_id=rrun.resource_waste_stream_id; END IF;
 unknown_flag:=c.composition_status<>'CHARACTERISED';
 IF COALESCE(w.contamination_status,'UNKNOWN')='PROHIBITIVE' OR p_toxicity_review_status='PROHIBITIVE' OR p_ecological_review_status='PROHIBITIVE' THEN status:='BLOCKED'; reason:='Prohibitive contamination, toxicity or ecological concern.';
 ELSIF COALESCE(w.contamination_status,'UNKNOWN') IN ('HIGH_CONCERN','REVIEW_REQUIRED','UNKNOWN') OR p_toxicity_review_status IN ('UNASSESSED','REVIEW_REQUIRED','HIGH_CONCERN') OR p_ecological_review_status IN ('UNASSESSED','REVIEW_REQUIRED','HIGH_CONCERN') OR unknown_flag OR p_traditional_knowledge_only OR p_supplier_claim_only THEN status:='REVIEW_REQUIRED'; reason:=concat_ws('; ',CASE WHEN unknown_flag THEN 'composition not fully characterised' END,CASE WHEN COALESCE(w.contamination_status,'UNKNOWN') IN ('HIGH_CONCERN','REVIEW_REQUIRED','UNKNOWN') THEN 'contamination requires review' END,CASE WHEN p_toxicity_review_status IN ('UNASSESSED','REVIEW_REQUIRED','HIGH_CONCERN') THEN 'toxicity review incomplete or concerning' END,CASE WHEN p_ecological_review_status IN ('UNASSESSED','REVIEW_REQUIRED','HIGH_CONCERN') THEN 'ecology review incomplete or concerning' END,CASE WHEN p_traditional_knowledge_only THEN 'traditional knowledge is not proof' END,CASE WHEN p_supplier_claim_only THEN 'supplier claim is not evidence' END);
 ELSE
   IF p_actor_id IS NULL OR NOT agriculture.api_actor_has_capability(p_actor_id,'review',c.country_code) THEN status:='REVIEW_REQUIRED'; reason:='Scientist/Admin review authority required before investigation pass.';
   ELSE status:='PASS_FOR_INVESTIGATION'; reason:='Safety/ecology gate passed for investigation only; not ingredient approval or efficacy proof.'; END IF;
 END IF;
 INSERT INTO agriculture.resource_safety_ecology_gate(resource_discovery_run_id,contamination_status,toxicity_review_status,ecological_review_status,unknown_material_flag,traditional_knowledge_only_flag,supplier_claim_only_flag,gate_status,gate_reason,reviewed_by,reviewed_at)
 VALUES(rrun.resource_discovery_run_id,COALESCE(w.contamination_status,'UNKNOWN'),p_toxicity_review_status,p_ecological_review_status,unknown_flag,p_traditional_knowledge_only,p_supplier_claim_only,status,reason,CASE WHEN status='PASS_FOR_INVESTIGATION' THEN p_actor_id ELSE NULL END,CASE WHEN status='PASS_FOR_INVESTIGATION' THEN now() ELSE NULL END) RETURNING * INTO g;
 RETURN g;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_begin_input_validation(p_input_submission_id uuid, p_rule_set_version text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.input_validation_run
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.input_validation_run;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.input_submission WHERE input_submission_id=p_input_submission_id) THEN RAISE EXCEPTION 'INPUT_SUBMISSION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 INSERT INTO agriculture.input_validation_run(validation_run_code,input_submission_id,run_status,validation_rule_set_version,initiated_by,started_at)
 VALUES('VAL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),p_input_submission_id,'RUNNING',p_rule_set_version,p_actor_id,now()) RETURNING * INTO r;
 UPDATE agriculture.input_submission SET submission_status='VALIDATING' WHERE input_submission_id=p_input_submission_id AND submission_status='RECEIVED';
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_begin_operation(p_operation_code text, p_operation_type text, p_operation_name text, p_request_context_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.operation_run
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.operation_run;
BEGIN
 INSERT INTO agriculture.operation_run(operation_code,operation_type,operation_name,request_context_id,run_status,initiated_by,started_at)
 VALUES(upper(btrim(p_operation_code)),p_operation_type,btrim(p_operation_name),p_request_context_id,'RUNNING',p_actor_id,now()) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_begin_reasoning_run(p_reasoning_run_code text, p_formulation_request_id uuid, p_run_type text, p_input_snapshot jsonb, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.reasoning_run
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.reasoning_run; BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.formulation_request WHERE formulation_request_id=p_formulation_request_id AND lifecycle_status<>'ARCHIVED') THEN RAISE EXCEPTION 'ACTIVE_FORMULATION_REQUEST_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.reasoning_run(reasoning_run_code,formulation_request_id,run_type,run_status,input_snapshot,initiated_by,started_at) VALUES(upper(btrim(p_reasoning_run_code)),p_formulation_request_id,p_run_type,'RUNNING',COALESCE(p_input_snapshot,'{}'::jsonb),p_actor_id,now()) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_begin_request(p_request_id text, p_request_type text, p_request_source text, p_actor_id uuid DEFAULT NULL::uuid, p_access_profile_code text DEFAULT NULL::text, p_correlation_id text DEFAULT NULL::text, p_client_ip_hash text DEFAULT NULL::text, p_user_agent_hash text DEFAULT NULL::text)
 RETURNS agriculture.request_context
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.request_context;
BEGIN
 INSERT INTO agriculture.request_context(request_id,request_type,request_source,actor_id,access_profile_code,correlation_id,client_ip_hash,user_agent_hash,request_status)
 VALUES(btrim(p_request_id),p_request_type,p_request_source,p_actor_id,p_access_profile_code,p_correlation_id,p_client_ip_hash,p_user_agent_hash,'RECEIVED') RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_bind_trial_protocol(p_trial_id uuid, p_template_version_id uuid, p_binding_role text, p_required boolean, p_actor_id uuid)
 RETURNS agriculture.trial_protocol_binding
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare t agriculture.trial; tv agriculture.observation_template_version; r agriculture.trial_protocol_binding; existing agriculture.trial_protocol_binding;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  select * into t from agriculture.trial where trial_id=p_trial_id;
  if t.trial_id is null then raise exception 'TRIAL_NOT_FOUND' using errcode='P0002'; end if;
  if t.lifecycle_status not in ('DRAFT','UNDER_REVIEW') then raise exception 'TRIAL_PROTOCOL_CAN_ONLY_BE_BOUND_BEFORE_ACTIVATION' using errcode='55000'; end if;
  select * into tv from agriculture.observation_template_version where observation_template_version_id=p_template_version_id and version_status='ACTIVE';
  if tv.observation_template_version_id is null then raise exception 'ACTIVE_OBSERVATION_TEMPLATE_VERSION_REQUIRED' using errcode='23514'; end if;
  if p_binding_role not in ('PRIMARY','SUPPLEMENTARY','DIAGNOSTIC_FOLLOWUP','OUTCOME') then raise exception 'INVALID_PROTOCOL_BINDING_ROLE' using errcode='22023'; end if;
  select * into existing from agriculture.trial_protocol_binding where trial_id=p_trial_id and observation_template_version_id=p_template_version_id and binding_role=p_binding_role and effective_until is null limit 1;
  if existing.trial_protocol_binding_id is not null then return existing; end if;
  insert into agriculture.trial_protocol_binding(trial_id,observation_template_version_id,binding_role,required,created_by)
  values(p_trial_id,p_template_version_id,p_binding_role,coalesce(p_required,true),p_actor_id) returning * into r;
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_bridge_resource_to_discovery_candidate(p_resource_discovery_run_id uuid, p_bridge_rationale text, p_actor_id uuid, p_candidate_object_type text DEFAULT 'INGREDIENT'::text)
 RETURNS agriculture.discovery_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE rr agriculture.resource_discovery_run; c agriculture.country_resource_candidate; sr agriculture.resource_discovery_scientist_review; gate agriculture.resource_safety_ecology_gate; sig agriculture.discovery_signal; dc agriculture.discovery_candidate; sig_code text; cand_code text;
BEGIN
 IF p_candidate_object_type NOT IN ('INGREDIENT','MECHANISM','METHOD','FORMULATION_STRATEGY','PROCESS','BIOLOGICAL_RELATIONSHIP','OTHER') THEN RAISE EXCEPTION 'INVALID_DISCOVERY_CANDIDATE_OBJECT_TYPE' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(p_bridge_rationale),'') IS NULL THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_BRIDGE_REQUIRES_RATIONALE' USING ERRCODE='23514'; END IF;
 SELECT * INTO rr FROM agriculture.resource_discovery_run WHERE resource_discovery_run_id=p_resource_discovery_run_id;
 IF rr.resource_discovery_run_id IS NULL THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_RUN_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 SELECT * INTO c FROM agriculture.country_resource_candidate WHERE country_resource_candidate_id=rr.country_resource_candidate_id FOR UPDATE;
 PERFORM agriculture.api_require_capability(p_actor_id,'review',c.country_code);
 SELECT * INTO gate FROM agriculture.v_resource_safety_gate_latest WHERE resource_discovery_run_id=rr.resource_discovery_run_id;
 IF gate.gate_status IS DISTINCT FROM 'PASS_FOR_INVESTIGATION' THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_BRIDGE_REQUIRES_PASSED_SAFETY_ECOLOGY_GATE' USING ERRCODE='23514'; END IF;
 SELECT * INTO sr FROM agriculture.resource_discovery_scientist_review WHERE resource_discovery_run_id=rr.resource_discovery_run_id AND review_status='APPROVED_FOR_INVESTIGATION' ORDER BY reviewed_at DESC LIMIT 1;
 IF sr.resource_discovery_scientist_review_id IS NULL THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_BRIDGE_REQUIRES_SCIENTIST_INVESTIGATION_APPROVAL' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM agriculture.resource_discovery_bridge WHERE resource_discovery_run_id=rr.resource_discovery_run_id AND bridge_status='CREATED_FOR_INVESTIGATION') THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_RUN_ALREADY_BRIDGED' USING ERRCODE='23505'; END IF;
 sig_code:='RSIG-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
 cand_code:='RDISC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
 INSERT INTO agriculture.discovery_signal(signal_code,signal_type,signal_title,signal_summary,country_code,evidence_packet_id,lifecycle_status,created_by)
 VALUES(sig_code,CASE WHEN rr.resource_waste_stream_id IS NULL THEN 'NATURAL_MATERIAL' ELSE 'WASTE_STREAM' END,'Resource discovery signal: '||c.resource_name,'Governed Country Resource / Resource Recovery discovery signal. '||btrim(p_bridge_rationale),c.country_code,c.evidence_packet_id,'CANDIDATE_CREATED',p_actor_id) RETURNING * INTO sig;
 INSERT INTO agriculture.discovery_candidate(candidate_code,candidate_name,candidate_object_type,discovery_signal_id,country_code,material_class,source_material,preparation_class,hypothesised_pathway,candidate_summary,uncertainty_summary,lifecycle_status,evidence_packet_id,created_by,updated_by)
 VALUES(cand_code,c.resource_name,p_candidate_object_type,sig.discovery_signal_id,c.country_code,NULL,c.resource_origin,NULL,NULL,c.candidate_summary,c.uncertainty_summary,'DISCOVERY_CANDIDATE',c.evidence_packet_id,p_actor_id,p_actor_id) RETURNING * INTO dc;
 INSERT INTO agriculture.resource_discovery_bridge(resource_discovery_run_id,country_resource_candidate_id,discovery_signal_id,discovery_candidate_id,bridge_rationale,created_by)
 VALUES(rr.resource_discovery_run_id,c.country_resource_candidate_id,sig.discovery_signal_id,dc.discovery_candidate_id,btrim(p_bridge_rationale),p_actor_id);
 UPDATE agriculture.country_resource_candidate SET scientific_status='INVESTIGATION_READY',updated_by=p_actor_id,updated_at=now() WHERE country_resource_candidate_id=c.country_resource_candidate_id;
 RETURN dc;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_build_resource_discovery_brain_map(p_resource_discovery_run_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.resource_discovery_run; c agriculture.country_resource_candidate; w agriculture.resource_waste_stream; result jsonb;
BEGIN
 SELECT * INTO r FROM agriculture.resource_discovery_run WHERE resource_discovery_run_id=p_resource_discovery_run_id;
 IF r.resource_discovery_run_id IS NULL THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_RUN_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 SELECT * INTO c FROM agriculture.country_resource_candidate WHERE country_resource_candidate_id=r.country_resource_candidate_id;
 IF r.resource_waste_stream_id IS NOT NULL THEN SELECT * INTO w FROM agriculture.resource_waste_stream WHERE resource_waste_stream_id=r.resource_waste_stream_id; END IF;
 DELETE FROM agriculture.resource_discovery_brain_contribution WHERE resource_discovery_run_id=r.resource_discovery_run_id;
 INSERT INTO agriculture.resource_discovery_brain_contribution(resource_discovery_run_id,brain_code,contribution_status,contribution_summary,evidence_strength,contribution_payload)
 VALUES
 (r.resource_discovery_run_id,'COUNTRY_RESOURCE','MATERIAL_SIGNAL','Country resource candidate is the originating governed discovery asset.',CASE c.evidence_status WHEN 'STRONG' THEN 'STRONG' WHEN 'MODERATE' THEN 'MODERATE' WHEN 'LIMITED' THEN 'LIMITED' WHEN 'CONTRADICTED' THEN 'CONTRADICTED' ELSE 'UNASSESSED' END,jsonb_build_object('resource_class',c.resource_class,'asset_type',c.asset_type,'discovery_potential',c.discovery_potential)),
 (r.resource_discovery_run_id,'RESOURCE_RECOVERY',CASE WHEN w.resource_waste_stream_id IS NULL THEN 'NO_SIGNAL' ELSE 'MATERIAL_SIGNAL' END,CASE WHEN w.resource_waste_stream_id IS NULL THEN 'No linked waste stream.' ELSE 'Linked waste stream and recovery pathways contribute resource-recovery context.' END,'UNASSESSED',CASE WHEN w.resource_waste_stream_id IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('burning',w.burning_involved,'dumping',w.dumping_involved,'landfill',w.landfill_involved,'availability',w.estimated_availability_status,'contamination',w.contamination_status) END),
 (r.resource_discovery_run_id,'ENVIRONMENTAL_INTELLIGENCE',CASE WHEN EXISTS(SELECT 1 FROM agriculture.environmental_burden_profile b WHERE b.resource_waste_stream_id=r.resource_waste_stream_id) THEN 'MATERIAL_SIGNAL' ELSE 'NO_SIGNAL' END,'Environmental burden is evaluated independently from scientific utility.','UNASSESSED',COALESCE((SELECT to_jsonb(b) FROM agriculture.environmental_burden_profile b WHERE b.resource_waste_stream_id=r.resource_waste_stream_id),'{}'::jsonb)),
 (r.resource_discovery_run_id,'INGREDIENT_INTELLIGENCE',CASE WHEN EXISTS(SELECT 1 FROM agriculture.ingredient i WHERE lower(i.ingredient_name)=lower(c.resource_name) AND i.lifecycle_status<>'RETIRED') THEN 'MATERIAL_SIGNAL' ELSE 'WEAK_SIGNAL' END,'Existing ingredient identity/similarity is checked but does not make the resource an approved ingredient.','UNASSESSED',jsonb_build_object('exact_name_match',EXISTS(SELECT 1 FROM agriculture.ingredient i WHERE lower(i.ingredient_name)=lower(c.resource_name) AND i.lifecycle_status<>'RETIRED'))),
 (r.resource_discovery_run_id,'MECHANISM_INTELLIGENCE',CASE c.mechanism_status WHEN 'KNOWN' THEN 'MATERIAL_SIGNAL' WHEN 'PARTIAL' THEN 'WEAK_SIGNAL' ELSE 'NO_SIGNAL' END,'Mechanism status contributes plausibility but is not proof.',CASE c.evidence_status WHEN 'STRONG' THEN 'STRONG' WHEN 'MODERATE' THEN 'MODERATE' WHEN 'LIMITED' THEN 'LIMITED' ELSE 'UNASSESSED' END,jsonb_build_object('mechanism_status',c.mechanism_status)),
 (r.resource_discovery_run_id,'CONTRADICTION_INTELLIGENCE',CASE WHEN EXISTS(SELECT 1 FROM agriculture.contradiction_record cr WHERE cr.subject_entity_type='COUNTRY_RESOURCE_CANDIDATE' AND cr.subject_entity_id=c.country_resource_candidate_id AND cr.lifecycle_status IN ('OPEN','UNDER_REVIEW')) THEN 'BLOCKING_SIGNAL' ELSE 'NO_SIGNAL' END,'Open contradictions are preserved and may block promotion.','UNASSESSED',jsonb_build_object('open_count',(SELECT count(*) FROM agriculture.contradiction_record cr WHERE cr.subject_entity_type='COUNTRY_RESOURCE_CANDIDATE' AND cr.subject_entity_id=c.country_resource_candidate_id AND cr.lifecycle_status IN ('OPEN','UNDER_REVIEW')))),
 (r.resource_discovery_run_id,'KNOWLEDGE_GAP_INTELLIGENCE',CASE WHEN c.knowledge_gap_status='HIGH' THEN 'MATERIAL_SIGNAL' WHEN c.knowledge_gap_status='MEDIUM' THEN 'WEAK_SIGNAL' ELSE 'NO_SIGNAL' END,'Knowledge gaps increase investigation value but reduce certainty.','UNASSESSED',jsonb_build_object('knowledge_gap_status',c.knowledge_gap_status)),
 (r.resource_discovery_run_id,'FORMULATION_INTELLIGENCE','NO_SIGNAL','No formulation is generated by the Resource Discovery Engine. Formulation consideration requires later governed promotion.','UNASSESSED','{}'::jsonb),
 (r.resource_discovery_run_id,'SCIENTIFIC_MEMORY',CASE WHEN EXISTS(SELECT 1 FROM agriculture.learning_candidate lc JOIN agriculture.approved_learning al ON al.learning_candidate_id=lc.learning_candidate_id WHERE lc.subject_entity_type='COUNTRY_RESOURCE_CANDIDATE' AND lc.subject_entity_id=c.country_resource_candidate_id AND al.lifecycle_status='ACTIVE') THEN 'MATERIAL_SIGNAL' ELSE 'NO_SIGNAL' END,'Only approved learning contributes scientific memory.','UNASSESSED',jsonb_build_object('approved_learning_count',(SELECT count(*) FROM agriculture.learning_candidate lc JOIN agriculture.approved_learning al ON al.learning_candidate_id=lc.learning_candidate_id WHERE lc.subject_entity_type='COUNTRY_RESOURCE_CANDIDATE' AND lc.subject_entity_id=c.country_resource_candidate_id AND al.lifecycle_status='ACTIVE')));
 SELECT jsonb_agg(jsonb_build_object('brain_code',brain_code,'status',contribution_status,'summary',contribution_summary,'evidence_strength',evidence_strength,'payload',contribution_payload) ORDER BY brain_code) INTO result FROM agriculture.resource_discovery_brain_contribution WHERE resource_discovery_run_id=r.resource_discovery_run_id;
 RETURN COALESCE(result,'[]'::jsonb);
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_capture_observation(p_observation_code text, p_trial_id uuid, p_plot_id uuid, p_template_version_id uuid, p_observed_at timestamp with time zone, p_notes text, p_values jsonb, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare t agriculture.trial; p agriculture.plot; existing agriculture.observation; obs agriculture.observation; itm record; val jsonb; n numeric; tx text; b boolean; meas agriculture.measurement; missing text[] := '{}'; payload jsonb := coalesce(p_values,'{}'::jsonb); canonical text; vt text;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  if nullif(btrim(p_observation_code),'') is null then raise exception 'OBSERVATION_CODE_REQUIRED' using errcode='23514'; end if;
  select * into t from agriculture.trial where trial_id=p_trial_id;
  if t.trial_id is null or t.lifecycle_status<>'ACTIVE' then raise exception 'ACTIVE_TRIAL_REQUIRED_FOR_CAPTURE' using errcode='23514'; end if;
  select * into p from agriculture.plot where plot_id=p_plot_id and trial_id=p_trial_id and lifecycle_status='ACTIVE';
  if p.plot_id is null then raise exception 'ACTIVE_TRIAL_PLOT_REQUIRED_FOR_CAPTURE' using errcode='23514'; end if;
  if t.country_workspace_id is distinct from p.country_workspace_id then raise exception 'TRIAL_PLOT_COUNTRY_MISMATCH' using errcode='23514'; end if;
  if p.treatment_role='TREATMENT' and p.formulation_version_id is distinct from t.formulation_version_id then raise exception 'TREATMENT_PLOT_FORMULATION_MISMATCH' using errcode='23514'; end if;
  if not exists(select 1 from agriculture.trial_protocol_binding x where x.trial_id=p_trial_id and x.observation_template_version_id=p_template_version_id and x.effective_until is null) then raise exception 'TEMPLATE_NOT_BOUND_TO_TRIAL' using errcode='23514'; end if;
  if t.country_workspace_id is not null and not exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=t.country_workspace_id and wm.membership_status='ACTIVE') then raise exception 'TRIAL_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  select * into existing from agriculture.observation where observation_code=upper(btrim(p_observation_code));
  if existing.observation_id is not null then
    if existing.trial_id=p_trial_id and existing.plot_id=p_plot_id and existing.observation_template_version_id=p_template_version_id then return jsonb_build_object('observation',to_jsonb(existing),'idempotent_replay',true,'measurements',coalesce((select jsonb_agg(to_jsonb(mm)) from agriculture.measurement mm where mm.observation_id=existing.observation_id),'[]'::jsonb)); end if;
    raise exception 'OBSERVATION_CODE_CONFLICT' using errcode='23505';
  end if;
  for itm in select otm.*,m.metric_code,m.value_type,m.canonical_unit,m.minimum_plausible_value,m.maximum_plausible_value from agriculture.observation_template_metric otm join agriculture.metric_definition m on m.metric_definition_id=otm.metric_definition_id where otm.observation_template_version_id=p_template_version_id and m.lifecycle_status='ACTIVE' order by otm.display_order loop
    if itm.requirement_level='REQUIRED' and not (payload ? itm.metric_code) then missing:=array_append(missing,itm.metric_code); end if;
  end loop;
  if array_length(missing,1) is not null then raise exception 'REQUIRED_METRICS_MISSING: %',array_to_string(missing,',') using errcode='23514'; end if;
  insert into agriculture.input_submission(submission_code,subject_entity_type,subject_entity_id,submission_type,submission_status,submitted_payload,submitted_by,submitted_at)
  values('OBS-SUB-'||gen_random_uuid()::text,'OBSERVATION',null,'OBSERVATION','RECEIVED',payload,p_actor_id,now()) returning input_submission_id into existing.input_submission_id;
  insert into agriculture.observation(observation_code,trial_id,plot_id,observation_template_version_id,observed_at,observer_id,observation_status,notes,input_submission_id,country_workspace_id)
  values(upper(btrim(p_observation_code)),p_trial_id,p_plot_id,p_template_version_id,coalesce(p_observed_at,now()),p_actor_id,'DRAFT',nullif(btrim(p_notes),''),existing.input_submission_id,t.country_workspace_id) returning * into obs;
  update agriculture.input_submission set subject_entity_id=obs.observation_id where input_submission_id=existing.input_submission_id;
  for itm in select otm.*,m.metric_code,m.value_type,m.canonical_unit,m.minimum_plausible_value,m.maximum_plausible_value from agriculture.observation_template_metric otm join agriculture.metric_definition m on m.metric_definition_id=otm.metric_definition_id where otm.observation_template_version_id=p_template_version_id and m.lifecycle_status='ACTIVE' order by otm.display_order loop
    if not (payload ? itm.metric_code) then continue; end if;
    val:=payload->itm.metric_code; vt:=itm.value_type; canonical:=itm.canonical_unit; n:=null; tx:=null; b:=null;
    if vt in ('INTEGER','DECIMAL') then n:=(val#>>'{}')::numeric; if itm.minimum_plausible_value is not null and n<itm.minimum_plausible_value then raise exception 'MEASUREMENT_BELOW_PLAUSIBLE_MINIMUM: %',itm.metric_code using errcode='23514'; end if; if itm.maximum_plausible_value is not null and n>itm.maximum_plausible_value then raise exception 'MEASUREMENT_ABOVE_PLAUSIBLE_MAXIMUM: %',itm.metric_code using errcode='23514'; end if; if vt='INTEGER' and trunc(n)<>n then raise exception 'INTEGER_METRIC_REQUIRES_INTEGER_VALUE: %',itm.metric_code using errcode='23514'; end if;
    elsif vt='BOOLEAN' then b:=(val#>>'{}')::boolean;
    elsif vt in ('TEXT','ENUM','DATE','DATETIME') then tx:=val#>>'{}';
    else tx:=val::text; end if;
    insert into agriculture.measurement(observation_id,metric_definition_id,numeric_value,text_value,boolean_value,json_value,unit,measurement_status,input_submission_id,source_numeric_value,source_unit,normalization_status,normalization_rule,normalization_version)
    values(obs.observation_id,itm.metric_definition_id,n,tx,b,case when vt='JSON' then val else null end,canonical,'SUBMITTED',existing.input_submission_id,n,canonical,'CANONICAL_CAPTURE','AAB_CANONICAL_UNIT','v1');
  end loop;
  return jsonb_build_object('observation',to_jsonb(obs),'idempotent_replay',false,'measurements',coalesce((select jsonb_agg(jsonb_build_object('measurement_id',mm.measurement_id,'metric_code',md.metric_code,'metric_name',md.metric_name,'numeric_value',mm.numeric_value,'text_value',mm.text_value,'boolean_value',mm.boolean_value,'unit',mm.unit,'source_numeric_value',mm.source_numeric_value,'source_unit',mm.source_unit,'normalization_status',mm.normalization_status) order by otm.display_order) from agriculture.measurement mm join agriculture.metric_definition md on md.metric_definition_id=mm.metric_definition_id join agriculture.observation_template_metric otm on otm.metric_definition_id=mm.metric_definition_id and otm.observation_template_version_id=p_template_version_id where mm.observation_id=obs.observation_id),'[]'::jsonb));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_complete_governance_review(p_review_id uuid, p_review_status text, p_evidence_reviewed_summary text, p_review_rationale text, p_review_result text, p_required_follow_up text DEFAULT NULL::text, p_reviewer_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.governance_review
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.governance_review;
BEGIN
 IF p_review_status NOT IN ('APPROVED','REJECTED','CHANGES_REQUIRED','SUSPENDED') THEN RAISE EXCEPTION 'INVALID_FINAL_REVIEW_STATUS' USING ERRCODE='22023'; END IF;
 IF p_reviewer_id IS NULL OR nullif(btrim(p_evidence_reviewed_summary),'') IS NULL OR nullif(btrim(p_review_rationale),'') IS NULL OR nullif(btrim(p_review_result),'') IS NULL THEN RAISE EXCEPTION 'COMPLETE_REVIEW_REQUIRES_REVIEWER_EVIDENCE_RATIONALE_RESULT' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.governance_review SET review_status=p_review_status,reviewer_id=p_reviewer_id,evidence_reviewed_summary=btrim(p_evidence_reviewed_summary),review_rationale=btrim(p_review_rationale),review_result=btrim(p_review_result),required_follow_up=p_required_follow_up,reviewed_at=now() WHERE review_id=p_review_id AND review_status IN ('PENDING','IN_REVIEW') RETURNING * INTO r;
 IF r.review_id IS NULL THEN RAISE EXCEPTION 'REVIEW_NOT_FOUND_OR_ALREADY_FINAL' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_complete_input_validation(p_input_validation_run_id uuid, p_normalised_payload jsonb DEFAULT NULL::jsonb, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.input_validation_run
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.input_validation_run; sub_id uuid; pc integer; wc integer; fc integer; qc integer; total integer; final_status text;
BEGIN
 SELECT input_submission_id INTO sub_id FROM agriculture.input_validation_run WHERE input_validation_run_id=p_input_validation_run_id AND run_status='RUNNING' FOR UPDATE;
 IF sub_id IS NULL THEN RAISE EXCEPTION 'VALIDATION_RUN_NOT_FOUND_OR_NOT_RUNNING' USING ERRCODE='55000'; END IF;
 SELECT count(*),count(*) FILTER(WHERE result_status='PASS'),count(*) FILTER(WHERE result_status='WARNING'),count(*) FILTER(WHERE result_status='FAIL'),count(*) FILTER(WHERE result_status='QUARANTINE') INTO total,pc,wc,fc,qc FROM agriculture.input_validation_result WHERE input_validation_run_id=p_input_validation_run_id;
 final_status:=CASE WHEN qc>0 THEN 'QUARANTINED' WHEN fc>0 THEN 'FAILED' WHEN wc>0 THEN 'PASSED_WITH_WARNINGS' ELSE 'PASSED' END;
 UPDATE agriculture.input_validation_run SET run_status=final_status,completed_at=now(),rules_evaluated=total,pass_count=pc,warning_count=wc,fail_count=fc,quarantine_count=qc,result_summary=jsonb_build_object('status',final_status,'rules_evaluated',total,'pass',pc,'warning',wc,'fail',fc,'quarantine',qc) WHERE input_validation_run_id=p_input_validation_run_id RETURNING * INTO r;
 UPDATE agriculture.input_submission SET normalised_payload=COALESCE(p_normalised_payload,normalised_payload),validation_completed_at=now(),submission_status=CASE WHEN qc>0 THEN 'QUARANTINED' WHEN fc>0 THEN 'REJECTED' ELSE 'VALIDATED' END,rejection_reason=CASE WHEN fc>0 THEN 'INPUT_VALIDATION_FAILED' WHEN qc>0 THEN 'INPUT_QUARANTINED' ELSE NULL END WHERE input_submission_id=sub_id;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_complete_operation(p_operation_run_id uuid, p_run_status text, p_records_attempted integer, p_records_succeeded integer, p_records_failed integer, p_operation_summary jsonb DEFAULT '{}'::jsonb)
 RETURNS agriculture.operation_run
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.operation_run;
BEGIN
 IF p_run_status NOT IN ('COMPLETED','COMPLETED_WITH_WARNINGS','FAILED','CANCELLED') THEN RAISE EXCEPTION 'INVALID_FINAL_OPERATION_STATUS' USING ERRCODE='22023'; END IF;
 IF p_records_attempted<0 OR p_records_succeeded<0 OR p_records_failed<0 OR p_records_succeeded+p_records_failed>p_records_attempted THEN RAISE EXCEPTION 'INVALID_OPERATION_RECORD_COUNTS' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.operation_run SET run_status=p_run_status,completed_at=now(),records_attempted=p_records_attempted,records_succeeded=p_records_succeeded,records_failed=p_records_failed,operation_summary=COALESCE(p_operation_summary,'{}'::jsonb) WHERE operation_run_id=p_operation_run_id AND run_status='RUNNING' RETURNING * INTO r;
 IF r.operation_run_id IS NULL THEN RAISE EXCEPTION 'OPERATION_NOT_FOUND_OR_NOT_RUNNING' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_complete_photo_review(p_photo_evidence_id uuid, p_review_status text, p_review_rationale text, p_visible_findings_summary text, p_required_follow_up text DEFAULT NULL::text, p_reviewer_id uuid DEFAULT NULL::uuid, p_governance_review_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.photo_review
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.photo_review;
BEGIN
 IF p_review_status NOT IN ('APPROVED','REJECTED','CHANGES_REQUIRED') THEN RAISE EXCEPTION 'INVALID_PHOTO_REVIEW_STATUS' USING ERRCODE='22023'; END IF;
 IF p_reviewer_id IS NULL OR nullif(btrim(p_review_rationale),'') IS NULL OR nullif(btrim(p_visible_findings_summary),'') IS NULL THEN RAISE EXCEPTION 'PHOTO_REVIEW_REQUIRES_REVIEWER_RATIONALE_FINDINGS' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.photo_review(photo_evidence_id,review_status,reviewer_id,review_rationale,visible_findings_summary,required_follow_up,reviewed_at,governance_review_id)
 VALUES(p_photo_evidence_id,p_review_status,p_reviewer_id,btrim(p_review_rationale),btrim(p_visible_findings_summary),p_required_follow_up,now(),p_governance_review_id) RETURNING * INTO r;
 UPDATE agriculture.photo_evidence SET review_status=CASE WHEN p_review_status='APPROVED' THEN 'APPROVED' WHEN p_review_status='REJECTED' THEN 'REJECTED' ELSE 'CHANGES_REQUIRED' END WHERE photo_evidence_id=p_photo_evidence_id;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_complete_reasoning_run(p_reasoning_run_id uuid, p_output_summary jsonb)
 RETURNS agriculture.reasoning_run
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.reasoning_run; BEGIN
 UPDATE agriculture.reasoning_run SET run_status='COMPLETED',output_summary=COALESCE(p_output_summary,'{}'::jsonb),completed_at=now() WHERE reasoning_run_id=p_reasoning_run_id AND run_status='RUNNING' RETURNING * INTO r;
 IF r.reasoning_run_id IS NULL THEN RAISE EXCEPTION 'REASONING_RUN_NOT_FOUND_OR_NOT_RUNNING' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_complete_request(p_request_context_id uuid, p_success boolean, p_failure_code text DEFAULT NULL::text)
 RETURNS agriculture.request_context
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.request_context;
BEGIN
 IF NOT p_success AND nullif(btrim(p_failure_code),'') IS NULL THEN RAISE EXCEPTION 'FAILED_REQUEST_REQUIRES_FAILURE_CODE' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.request_context SET request_status=CASE WHEN p_success THEN 'COMPLETED' ELSE 'FAILED' END,completed_at=now(),failure_code=CASE WHEN p_success THEN NULL ELSE btrim(p_failure_code) END WHERE request_context_id=p_request_context_id AND completed_at IS NULL RETURNING * INTO r;
 IF r.request_context_id IS NULL THEN RAISE EXCEPTION 'REQUEST_NOT_FOUND_OR_ALREADY_COMPLETED' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_complete_resource_discovery_review(p_resource_discovery_scientist_review_id uuid, p_review_status text, p_evidence_reviewed_summary text, p_review_rationale text, p_review_result text, p_required_follow_up text, p_actor_id uuid)
 RETURNS agriculture.resource_discovery_scientist_review
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.resource_discovery_scientist_review; c_country char(2); gate_status text;
BEGIN
 IF p_review_status NOT IN ('APPROVED_FOR_INVESTIGATION','CHANGES_REQUIRED','HOLD','REJECTED') THEN RAISE EXCEPTION 'INVALID_RESOURCE_DISCOVERY_REVIEW_STATUS' USING ERRCODE='22023'; END IF;
 SELECT c.country_code INTO c_country FROM agriculture.resource_discovery_scientist_review sr JOIN agriculture.resource_discovery_run rr ON rr.resource_discovery_run_id=sr.resource_discovery_run_id JOIN agriculture.country_resource_candidate c ON c.country_resource_candidate_id=rr.country_resource_candidate_id WHERE sr.resource_discovery_scientist_review_id=p_resource_discovery_scientist_review_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_REVIEW_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 PERFORM agriculture.api_require_capability(p_actor_id,'review',c_country);
 SELECT g.gate_status INTO gate_status FROM agriculture.resource_discovery_scientist_review sr JOIN agriculture.v_resource_safety_gate_latest g ON g.resource_discovery_run_id=sr.resource_discovery_run_id WHERE sr.resource_discovery_scientist_review_id=p_resource_discovery_scientist_review_id;
 IF p_review_status='APPROVED_FOR_INVESTIGATION' AND gate_status<>'PASS_FOR_INVESTIGATION' THEN RAISE EXCEPTION 'INVESTIGATION_APPROVAL_REQUIRES_PASSED_SAFETY_ECOLOGY_GATE' USING ERRCODE='23514'; END IF;
 IF nullif(btrim(p_evidence_reviewed_summary),'') IS NULL OR nullif(btrim(p_review_rationale),'') IS NULL OR nullif(btrim(p_review_result),'') IS NULL THEN RAISE EXCEPTION 'SCIENTIST_REVIEW_REQUIRES_EVIDENCE_RATIONALE_RESULT' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.resource_discovery_scientist_review SET review_status=p_review_status,evidence_reviewed_summary=btrim(p_evidence_reviewed_summary),review_rationale=btrim(p_review_rationale),review_result=btrim(p_review_result),required_follow_up=p_required_follow_up,reviewer_id=p_actor_id,reviewed_at=now() WHERE resource_discovery_scientist_review_id=p_resource_discovery_scientist_review_id AND review_status IN ('PENDING','IN_REVIEW') RETURNING * INTO r;
 IF r.resource_discovery_scientist_review_id IS NULL THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_REVIEW_NOT_COMPLETABLE' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_complete_trial(p_trial_id uuid, p_actor_id uuid)
 RETURNS agriculture.trial
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
declare r agriculture.trial; approved_outcomes integer; open_obs integer;
begin
  perform agriculture.api_require_capability(p_actor_id,'approve',null);
  select count(*) into approved_outcomes from agriculture.outcome where trial_id=p_trial_id and outcome_status='APPROVED';
  if approved_outcomes=0 then raise exception 'TRIAL_CANNOT_COMPLETE_WITHOUT_APPROVED_OUTCOME' using errcode='23514'; end if;
  select count(*) into open_obs from agriculture.observation where trial_id=p_trial_id and observation_status in ('DRAFT','SUBMITTED','VALIDATING','VALID','VALID_WITH_WARNINGS','QUARANTINED');
  if open_obs>0 then raise exception 'TRIAL_HAS_OPEN_OBSERVATIONS: %',open_obs using errcode='23514'; end if;
  update agriculture.trial set lifecycle_status='COMPLETED',outcome_status='REVIEWED',actual_end_date=coalesce(actual_end_date,current_date),updated_by=p_actor_id,updated_at=now() where trial_id=p_trial_id and lifecycle_status='ACTIVE' returning * into r;
  if r.trial_id is null then raise exception 'TRIAL_NOT_FOUND_OR_NOT_ACTIVE' using errcode='55000'; end if;
  update agriculture.plot set lifecycle_status='COMPLETED',updated_by=p_actor_id,updated_at=now() where trial_id=p_trial_id and lifecycle_status='ACTIVE';
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_compute_brain_evidence_eligibility(p_subject_entity_type text, p_subject_entity_id uuid, p_evidence_packet_id uuid, p_governance_decision_id uuid, p_actor_id uuid)
 RETURNS agriculture.brain_evidence_eligibility
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  r agriculture.brain_evidence_eligibility;
  dq agriculture.data_quality_assessment;
  ep agriculture.evidence_packet;
  ds text;
  open_flags integer;
  usable_photos integer;
  photo_required boolean := false;
  v_pass boolean; c_complete boolean; q_ok boolean; p_ok boolean; review_ok boolean; quarantine_ok boolean;
  status text; reason text;
begin
  if p_actor_id is null then raise exception 'BRAIN_ELIGIBILITY_REQUIRES_ACTOR' using errcode='23514'; end if;
  select * into dq from agriculture.data_quality_assessment where subject_entity_type=upper(btrim(p_subject_entity_type)) and subject_entity_id=p_subject_entity_id;
  if dq.data_quality_assessment_id is null then raise exception 'DATA_QUALITY_ASSESSMENT_REQUIRED' using errcode='23514'; end if;
  select * into ep from agriculture.evidence_packet where evidence_packet_id=p_evidence_packet_id;
  select decision_status into ds from agriculture.governance_decision where decision_id=p_governance_decision_id;
  select count(*) into open_flags from agriculture.data_quality_flag where subject_entity_type=upper(btrim(p_subject_entity_type)) and subject_entity_id=p_subject_entity_id and flag_status='OPEN' and severity in ('HIGH','CRITICAL');
  select count(*) into usable_photos from agriculture.photo_evidence where subject_entity_type=upper(btrim(p_subject_entity_type)) and subject_entity_id=p_subject_entity_id and image_quality_status in ('ACCEPTABLE','ACCEPTABLE_WITH_WARNINGS') and context_validation_status in ('VALID','VALID_WITH_WARNINGS') and review_status='APPROVED' and consent_usage_status in ('APPROVED_FOR_RESEARCH','RESTRICTED');

  if upper(btrim(p_subject_entity_type))='OBSERVATION' then
    select exists(
      select 1 from agriculture.observation o
      join agriculture.measurement m on m.observation_id=o.observation_id
      join agriculture.metric_definition md on md.metric_definition_id=m.metric_definition_id
      where o.observation_id=p_subject_entity_id and md.photo_requirement_policy='REQUIRED'
    ) into photo_required;
  elsif upper(btrim(p_subject_entity_type))='UNIVERSAL_OBSERVATION' then
    photo_required:=true;
  else
    photo_required:=false;
  end if;

  v_pass:=dq.quality_status in ('ACCEPTABLE','ACCEPTABLE_WITH_WARNINGS');
  c_complete:=dq.completeness_status in ('COMPLETE','COMPLETE_WITH_WARNINGS') and dq.context_quality in ('ADEQUATE','STRONG');
  q_ok:=dq.quality_status in ('ACCEPTABLE','ACCEPTABLE_WITH_WARNINGS') and dq.evidence_quality in ('MODERATE','STRONG');
  p_ok:=(not photo_required) or usable_photos>0;
  review_ok:=(not dq.review_required) or dq.governance_review_id is not null;
  quarantine_ok:=open_flags=0 and dq.quality_status<>'QUARANTINED';
  if ep.evidence_packet_id is null or ep.packet_status not in ('COMPLETE','APPROVED') or ep.completeness_status<>'COMPLETE' then v_pass:=false; end if;
  if ds<>'APPROVED' then review_ok:=false; end if;

  if v_pass and c_complete and q_ok and p_ok and review_ok and quarantine_ok then
    status:=case when dq.quality_status='ACCEPTABLE_WITH_WARNINGS' or dq.completeness_status='COMPLETE_WITH_WARNINGS' then 'ELIGIBLE_WITH_WARNINGS' else 'ELIGIBLE' end;
    reason:='Computed eligibility passed evidence, quality, context, applicable photo, review and quarantine gates.';
  else
    status:='NOT_ELIGIBLE';
    reason:=concat_ws('; ',case when not v_pass then 'validation/evidence failed' end,case when not c_complete then 'context incomplete' end,case when not q_ok then 'quality unacceptable' end,case when not p_ok then 'photo requirement unsatisfied' end,case when not review_ok then 'required review/governance incomplete' end,case when not quarantine_ok then 'quarantine or serious quality flag active' end);
  end if;

  insert into agriculture.brain_evidence_eligibility(subject_entity_type,subject_entity_id,evidence_packet_id,validation_passed,context_complete,quality_acceptable,photo_requirement_satisfied,required_review_complete,quarantine_clear,eligibility_status,eligibility_reason,assessed_by,assessed_at,governance_decision_id)
  values(upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_evidence_packet_id,v_pass,c_complete,q_ok,p_ok,review_ok,quarantine_ok,status,reason,p_actor_id,now(),p_governance_decision_id)
  on conflict(subject_entity_type,subject_entity_id) do update set evidence_packet_id=excluded.evidence_packet_id,validation_passed=excluded.validation_passed,context_complete=excluded.context_complete,quality_acceptable=excluded.quality_acceptable,photo_requirement_satisfied=excluded.photo_requirement_satisfied,required_review_complete=excluded.required_review_complete,quarantine_clear=excluded.quarantine_clear,eligibility_status=excluded.eligibility_status,eligibility_reason=excluded.eligibility_reason,assessed_by=excluded.assessed_by,assessed_at=excluded.assessed_at,governance_decision_id=excluded.governance_decision_id
  returning * into r;
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_contradiction(p_contradiction_code text, p_subject_entity_type text, p_subject_entity_id uuid, p_claim_a text, p_claim_b text, p_contradiction_summary text, p_severity text DEFAULT 'UNASSESSED'::text, p_evidence_packet_a_id uuid DEFAULT NULL::uuid, p_evidence_packet_b_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.contradiction_record
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.contradiction_record; BEGIN
 IF p_evidence_packet_a_id IS NULL AND p_evidence_packet_b_id IS NULL THEN RAISE EXCEPTION 'CONTRADICTION_REQUIRES_EVIDENCE' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.contradiction_record(contradiction_code,subject_entity_type,subject_entity_id,claim_a,claim_b,contradiction_summary,severity,evidence_packet_a_id,evidence_packet_b_id,created_by)
 VALUES(upper(btrim(p_contradiction_code)),upper(btrim(p_subject_entity_type)),p_subject_entity_id,btrim(p_claim_a),btrim(p_claim_b),btrim(p_contradiction_summary),p_severity,p_evidence_packet_a_id,p_evidence_packet_b_id,p_actor_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_country_resource_candidate(p_resource_code text, p_resource_name text, p_resource_class text, p_asset_type text, p_candidate_summary text, p_uncertainty_summary text, p_actor_id uuid, p_country_code character DEFAULT NULL::bpchar, p_resource_origin text DEFAULT NULL::text, p_current_known_use text DEFAULT NULL::text, p_traditional_knowledge_linked boolean DEFAULT false, p_traditional_knowledge_summary text DEFAULT NULL::text, p_composition_status text DEFAULT 'UNKNOWN'::text, p_mechanism_status text DEFAULT 'UNKNOWN'::text, p_evidence_status text DEFAULT 'NONE'::text, p_observation_status text DEFAULT 'NONE'::text, p_knowledge_gap_status text DEFAULT 'HIGH'::text, p_discovery_potential text DEFAULT 'UNASSESSED'::text)
 RETURNS agriculture.country_resource_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.country_resource_candidate;
BEGIN
 PERFORM agriculture.api_require_capability(p_actor_id,'create_draft',p_country_code);
 IF nullif(btrim(p_resource_code),'') IS NULL OR nullif(btrim(p_resource_name),'') IS NULL OR nullif(btrim(p_candidate_summary),'') IS NULL OR nullif(btrim(p_uncertainty_summary),'') IS NULL THEN RAISE EXCEPTION 'RESOURCE_CODE_NAME_SUMMARY_UNCERTAINTY_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.country_resource_candidate(resource_code,country_code,resource_name,resource_class,asset_type,resource_origin,current_known_use,traditional_knowledge_linked,traditional_knowledge_summary,composition_status,mechanism_status,evidence_status,observation_status,knowledge_gap_status,discovery_potential,scientific_status,candidate_summary,uncertainty_summary,created_by,updated_by)
 VALUES(upper(btrim(p_resource_code)),p_country_code,btrim(p_resource_name),p_resource_class,p_asset_type,p_resource_origin,p_current_known_use,p_traditional_knowledge_linked,p_traditional_knowledge_summary,p_composition_status,p_mechanism_status,p_evidence_status,p_observation_status,p_knowledge_gap_status,p_discovery_potential,'EXPERIMENTAL_UNVERIFIED',btrim(p_candidate_summary),btrim(p_uncertainty_summary),p_actor_id,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_discovery_candidate(p_candidate_code text, p_candidate_name text, p_candidate_object_type text, p_candidate_summary text, p_uncertainty_summary text, p_discovery_signal_id uuid DEFAULT NULL::uuid, p_country_code character DEFAULT NULL::bpchar, p_material_class text DEFAULT NULL::text, p_source_material text DEFAULT NULL::text, p_preparation_class text DEFAULT NULL::text, p_hypothesised_pathway text DEFAULT NULL::text, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.discovery_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.discovery_candidate;
BEGIN
 IF nullif(btrim(p_candidate_summary),'') IS NULL OR nullif(btrim(p_uncertainty_summary),'') IS NULL THEN RAISE EXCEPTION 'DISCOVERY_SUMMARY_AND_UNCERTAINTY_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.discovery_candidate(candidate_code,candidate_name,candidate_object_type,discovery_signal_id,country_code,material_class,source_material,preparation_class,hypothesised_pathway,candidate_summary,uncertainty_summary,lifecycle_status,evidence_packet_id,created_by)
 VALUES(upper(btrim(p_candidate_code)),btrim(p_candidate_name),p_candidate_object_type,p_discovery_signal_id,p_country_code,p_material_class,p_source_material,p_preparation_class,p_hypothesised_pathway,btrim(p_candidate_summary),btrim(p_uncertainty_summary),'DISCOVERY_CANDIDATE',p_evidence_packet_id,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_evidence_packet(p_evidence_packet_code text, p_packet_type text, p_subject_entity_type text, p_subject_entity_id uuid, p_evidence_summary text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.evidence_packet
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.evidence_packet;
BEGIN
 INSERT INTO agriculture.evidence_packet(evidence_packet_code,packet_type,subject_entity_type,subject_entity_id,packet_status,evidence_summary,completeness_status,created_by,updated_by)
 VALUES(upper(btrim(p_evidence_packet_code)),p_packet_type,upper(btrim(p_subject_entity_type)),p_subject_entity_id,'DRAFT',p_evidence_summary,'INCOMPLETE',p_actor_id,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_formulation_candidate(p_candidate_code text, p_formulation_request_id uuid, p_candidate_name text, p_candidate_summary text, p_reasoning_run_id uuid DEFAULT NULL::uuid, p_hypothesis_id uuid DEFAULT NULL::uuid, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.formulation_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.formulation_candidate; BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.formulation_request WHERE formulation_request_id=p_formulation_request_id AND lifecycle_status<>'ARCHIVED') THEN RAISE EXCEPTION 'ACTIVE_FORMULATION_REQUEST_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.formulation_candidate(candidate_code,formulation_request_id,reasoning_run_id,hypothesis_id,candidate_name,candidate_summary,candidate_status,evidence_packet_id,created_by) VALUES(upper(btrim(p_candidate_code)),p_formulation_request_id,p_reasoning_run_id,p_hypothesis_id,btrim(p_candidate_name),btrim(p_candidate_summary),'ADVISORY',p_evidence_packet_id,p_actor_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_formulation_request(p_request_code text, p_request_title text, p_request_objective text, p_request_constraints jsonb DEFAULT '{}'::jsonb, p_problem_id uuid DEFAULT NULL::uuid, p_crop_id uuid DEFAULT NULL::uuid, p_variety_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.formulation_request
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.formulation_request; BEGIN
 IF nullif(btrim(p_request_objective),'') IS NULL THEN RAISE EXCEPTION 'FORMULATION_REQUEST_OBJECTIVE_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.formulation_request(request_code,request_title,problem_id,crop_id,variety_id,request_objective,request_constraints,lifecycle_status,created_by,updated_by) VALUES(upper(btrim(p_request_code)),btrim(p_request_title),p_problem_id,p_crop_id,p_variety_id,btrim(p_request_objective),COALESCE(p_request_constraints,'{}'::jsonb),'DRAFT',p_actor_id,p_actor_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_formulation_version(p_version_code text, p_formulation_name text, p_formulation_type text, p_change_rationale text, p_expected_outcomes text DEFAULT NULL::text, p_data_class text DEFAULT 'TEST'::text, p_derived_from_version_id uuid DEFAULT NULL::uuid, p_change_type text DEFAULT 'INITIAL'::text, p_candidate_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.formulation_version
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.formulation_version; next_no integer;
BEGIN
 IF nullif(btrim(p_change_rationale),'') IS NULL THEN RAISE EXCEPTION 'FORMULATION_CHANGE_RATIONALE_REQUIRED' USING ERRCODE='23514'; END IF;
 IF p_derived_from_version_id IS NOT NULL AND p_change_type='INITIAL' THEN RAISE EXCEPTION 'DERIVED_VERSION_REQUIRES_NON_INITIAL_CHANGE_TYPE' USING ERRCODE='23514'; END IF;
 SELECT COALESCE(max(version_number),0)+1 INTO next_no FROM agriculture.formulation_version WHERE formulation_name=p_formulation_name;
 INSERT INTO agriculture.formulation_version(version_code,formulation_name,version_number,formulation_type,formulation_candidate_id,derived_from_version_id,change_type,change_rationale,expected_outcomes,data_class,trial_readiness,lifecycle_status,created_by)
 VALUES(p_version_code,p_formulation_name,next_no,p_formulation_type,p_candidate_id,p_derived_from_version_id,p_change_type,p_change_rationale,p_expected_outcomes,p_data_class,'NOT_READY','DRAFT',p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_governance_decision(p_decision_code text, p_decision_type text, p_subject_entity_type text, p_subject_entity_id uuid, p_required_authority_role text, p_rationale text, p_evidence_summary text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.governance_decision
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.governance_decision;
BEGIN
 IF nullif(btrim(p_rationale),'') IS NULL THEN RAISE EXCEPTION 'GOVERNANCE_DECISION_RATIONALE_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.governance_decision(decision_code,decision_type,decision_status,subject_entity_type,subject_entity_id,required_authority_role,rationale,evidence_summary,created_by)
 VALUES(upper(btrim(p_decision_code)),p_decision_type,'DRAFT',upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_required_authority_role,btrim(p_rationale),p_evidence_summary,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_governance_review(p_review_code text, p_subject_entity_type text, p_subject_entity_id uuid, p_review_type text, p_required_authority_role text, p_decision_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.governance_review
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.governance_review;
BEGIN
 INSERT INTO agriculture.governance_review(review_code,decision_id,subject_entity_type,subject_entity_id,review_type,review_status,required_authority_role,created_by)
 VALUES(upper(btrim(p_review_code)),p_decision_id,upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_review_type,'PENDING',p_required_authority_role,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_hypothesis(p_hypothesis_code text, p_hypothesis_statement text, p_formulation_request_id uuid DEFAULT NULL::uuid, p_reasoning_run_id uuid DEFAULT NULL::uuid, p_expected_outcomes text DEFAULT NULL::text, p_uncertainty_summary text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.hypothesis
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.hypothesis; BEGIN
 IF p_formulation_request_id IS NULL AND p_reasoning_run_id IS NULL THEN RAISE EXCEPTION 'HYPOTHESIS_REQUIRES_REQUEST_OR_REASONING_RUN' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.hypothesis(hypothesis_code,formulation_request_id,reasoning_run_id,hypothesis_statement,expected_outcomes,uncertainty_summary,lifecycle_status,created_by,updated_by) VALUES(upper(btrim(p_hypothesis_code)),p_formulation_request_id,p_reasoning_run_id,btrim(p_hypothesis_statement),p_expected_outcomes,p_uncertainty_summary,'DRAFT',p_actor_id,p_actor_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_ingredient(p_ingredient_code text, p_ingredient_name text, p_material_class text, p_creation_rationale text, p_actor_id uuid, p_preparation_class text DEFAULT NULL::text, p_data_class text DEFAULT 'EXPERIMENTAL_UNVERIFIED'::text, p_country_code character DEFAULT NULL::bpchar)
 RETURNS agriculture.ingredient
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient;
BEGIN
 PERFORM agriculture.api_require_capability(p_actor_id,'create_draft',p_country_code);
 IF nullif(btrim(p_creation_rationale),'') IS NULL THEN RAISE EXCEPTION 'INGREDIENT_CREATION_REQUIRES_RATIONALE' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.ingredient(ingredient_code,ingredient_name,lifecycle_status,material_class,preparation_class,data_class,country_code,current_version_no,created_by)
 VALUES(upper(btrim(p_ingredient_code)),btrim(p_ingredient_name),'DRAFT',p_material_class,p_preparation_class,p_data_class,p_country_code,1,p_actor_id)
 RETURNING * INTO r;
 INSERT INTO agriculture.ingredient_version(ingredient_id,version_no,amendment_rationale,review_status,created_by)
 VALUES(r.ingredient_id,1,btrim(p_creation_rationale),'PENDING',p_actor_id);
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_ingredient(p_ingredient_code text, p_ingredient_name text, p_material_class text, p_preparation_class text DEFAULT NULL::text, p_data_class text DEFAULT 'EXPERIMENTAL_UNVERIFIED'::text, p_country_code character DEFAULT NULL::bpchar, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.ingredient
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient;
BEGIN
 IF nullif(btrim(p_ingredient_code),'') IS NULL OR nullif(btrim(p_ingredient_name),'') IS NULL THEN RAISE EXCEPTION 'INGREDIENT_CODE_AND_NAME_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.ingredient(ingredient_code,ingredient_name,lifecycle_status,material_class,preparation_class,data_class,country_code,created_by)
 VALUES(upper(btrim(p_ingredient_code)),btrim(p_ingredient_name),'DRAFT',p_material_class,p_preparation_class,p_data_class,p_country_code,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_ingredient_version(p_ingredient_id uuid, p_amendment_rationale text, p_actor_id uuid, p_category text DEFAULT NULL::text, p_foliar_compatibility text DEFAULT NULL::text, p_fertigation_compatibility text DEFAULT NULL::text, p_risks_contraindications text DEFAULT NULL::text, p_mitigation_lever text DEFAULT NULL::text, p_handling_storage_notes text DEFAULT NULL::text)
 RETURNS agriculture.ingredient_version
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient_version; next_no integer; v_country char(2); v_status text;
BEGIN
 SELECT country_code,lifecycle_status INTO v_country,v_status FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id FOR UPDATE;
 IF v_status IS NULL THEN RAISE EXCEPTION 'INGREDIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 PERFORM agriculture.api_require_capability(p_actor_id,'update_draft',v_country);
 IF v_status NOT IN ('DRAFT','UNDER_REVIEW') THEN RAISE EXCEPTION 'INGREDIENT_VERSIONING_REQUIRES_DRAFT_OR_UNDER_REVIEW' USING ERRCODE='55000'; END IF;
 IF nullif(btrim(p_amendment_rationale),'') IS NULL THEN RAISE EXCEPTION 'INGREDIENT_VERSION_REQUIRES_RATIONALE' USING ERRCODE='23514'; END IF;
 SELECT current_version_no+1 INTO next_no FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id;
 INSERT INTO agriculture.ingredient_version(ingredient_id,version_no,category,foliar_compatibility,fertigation_compatibility,risks_contraindications,mitigation_lever,handling_storage_notes,amendment_rationale,review_status,created_by)
 VALUES(p_ingredient_id,next_no,p_category,p_foliar_compatibility,p_fertigation_compatibility,p_risks_contraindications,p_mitigation_lever,p_handling_storage_notes,btrim(p_amendment_rationale),'PENDING',p_actor_id)
 RETURNING * INTO r;
 UPDATE agriculture.ingredient SET current_version_no=next_no,updated_at=now() WHERE ingredient_id=p_ingredient_id;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_knowledge_gap(p_gap_code text, p_subject_entity_type text, p_subject_entity_id uuid, p_gap_type text, p_gap_statement text, p_why_it_matters text, p_proposed_resolution text DEFAULT NULL::text, p_priority_status text DEFAULT 'UNASSESSED'::text, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.knowledge_gap
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.knowledge_gap; BEGIN
 INSERT INTO agriculture.knowledge_gap(gap_code,subject_entity_type,subject_entity_id,gap_type,gap_statement,why_it_matters,proposed_resolution,priority_status,evidence_packet_id,created_by)
 VALUES(upper(btrim(p_gap_code)),upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_gap_type,btrim(p_gap_statement),btrim(p_why_it_matters),p_proposed_resolution,p_priority_status,p_evidence_packet_id,p_actor_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_learning_candidate(p_candidate_code text, p_candidate_type text, p_subject_entity_type text, p_subject_entity_id uuid, p_brain_evidence_eligibility_id uuid, p_evidence_packet_id uuid, p_learning_statement text, p_uncertainty_summary text, p_contradiction_summary text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.learning_candidate
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare r agriculture.learning_candidate; es text; cw uuid;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  select eligibility_status into es from agriculture.brain_evidence_eligibility where brain_evidence_eligibility_id=p_brain_evidence_eligibility_id and subject_entity_type=upper(btrim(p_subject_entity_type)) and subject_entity_id=p_subject_entity_id;
  if es not in ('ELIGIBLE','ELIGIBLE_WITH_WARNINGS') then raise exception 'LEARNING_REQUIRES_ELIGIBLE_BRAIN_EVIDENCE' using errcode='23514'; end if;
  if not exists(select 1 from agriculture.evidence_packet where evidence_packet_id=p_evidence_packet_id and packet_status in ('COMPLETE','APPROVED') and completeness_status='COMPLETE') then raise exception 'LEARNING_REQUIRES_COMPLETE_EVIDENCE_PACKET' using errcode='23514'; end if;
  if upper(btrim(p_subject_entity_type))='OUTCOME' then select country_workspace_id into cw from agriculture.outcome where outcome_id=p_subject_entity_id;
  elsif upper(btrim(p_subject_entity_type))='TRIAL' then select country_workspace_id into cw from agriculture.trial where trial_id=p_subject_entity_id;
  elsif upper(btrim(p_subject_entity_type))='OBSERVATION' then select country_workspace_id into cw from agriculture.observation where observation_id=p_subject_entity_id;
  end if;
  insert into agriculture.learning_candidate(learning_candidate_code,candidate_type,subject_entity_type,subject_entity_id,brain_evidence_eligibility_id,evidence_packet_id,learning_statement,uncertainty_summary,contradiction_summary,candidate_status,created_by,country_workspace_id)
  values(upper(btrim(p_candidate_code)),p_candidate_type,upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_brain_evidence_eligibility_id,p_evidence_packet_id,btrim(p_learning_statement),nullif(btrim(p_uncertainty_summary),''),nullif(btrim(p_contradiction_summary),''),'DRAFT',p_actor_id,cw) returning * into r;
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_learning_candidate(p_learning_candidate_code text, p_candidate_type text, p_subject_entity_type text, p_subject_entity_id uuid, p_learning_statement text, p_brain_evidence_eligibility_id uuid, p_evidence_packet_id uuid, p_uncertainty_summary text DEFAULT NULL::text, p_contradiction_summary text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.learning_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.learning_candidate; es text; sid uuid; st text;
BEGIN
 SELECT eligibility_status,subject_entity_id,subject_entity_type INTO es,sid,st FROM agriculture.brain_evidence_eligibility WHERE brain_evidence_eligibility_id=p_brain_evidence_eligibility_id;
 IF es NOT IN ('ELIGIBLE','ELIGIBLE_WITH_WARNINGS') OR sid IS DISTINCT FROM p_subject_entity_id OR st IS DISTINCT FROM upper(btrim(p_subject_entity_type)) THEN RAISE EXCEPTION 'LEARNING_CANDIDATE_REQUIRES_MATCHING_ELIGIBLE_EVIDENCE' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.learning_candidate(learning_candidate_code,candidate_type,subject_entity_type,subject_entity_id,brain_evidence_eligibility_id,evidence_packet_id,learning_statement,uncertainty_summary,contradiction_summary,candidate_status,created_by)
 VALUES(upper(btrim(p_learning_candidate_code)),p_candidate_type,upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_brain_evidence_eligibility_id,p_evidence_packet_id,btrim(p_learning_statement),p_uncertainty_summary,p_contradiction_summary,'DRAFT',p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_mechanism_hypothesis(p_mechanism_code text, p_subject_entity_type text, p_subject_entity_id uuid, p_mechanism_statement text, p_proposed_pathway text, p_uncertainty_summary text, p_expected_observable_effects text DEFAULT NULL::text, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.mechanism_hypothesis
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.mechanism_hypothesis; BEGIN
 INSERT INTO agriculture.mechanism_hypothesis(mechanism_code,subject_entity_type,subject_entity_id,mechanism_statement,proposed_pathway,expected_observable_effects,uncertainty_summary,evidence_packet_id,created_by)
 VALUES(upper(btrim(p_mechanism_code)),upper(btrim(p_subject_entity_type)),p_subject_entity_id,btrim(p_mechanism_statement),btrim(p_proposed_pathway),p_expected_observable_effects,btrim(p_uncertainty_summary),p_evidence_packet_id,p_actor_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_opportunity_profile(p_profile_code text, p_discovery_candidate_id uuid, p_primary_opportunity text, p_scientific_novelty text, p_evidence_strength text, p_potential_upside text, p_research_difficulty text, p_main_uncertainties text, p_additional_opportunities jsonb DEFAULT '[]'::jsonb, p_recommended_investigation text DEFAULT NULL::text, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.opportunity_profile
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.opportunity_profile;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.discovery_candidate WHERE discovery_candidate_id=p_discovery_candidate_id AND lifecycle_status NOT IN ('REJECTED','SUSPENDED','ARCHIVED')) THEN RAISE EXCEPTION 'ACTIVE_DISCOVERY_CANDIDATE_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.opportunity_profile(opportunity_profile_code,discovery_candidate_id,primary_opportunity,additional_opportunities,scientific_novelty,evidence_strength,potential_upside,research_difficulty,main_uncertainties,recommended_investigation,scientist_admin_review_required,profile_status,evidence_packet_id,created_by)
 VALUES(upper(btrim(p_profile_code)),p_discovery_candidate_id,btrim(p_primary_opportunity),COALESCE(p_additional_opportunities,'[]'::jsonb),p_scientific_novelty,p_evidence_strength,p_potential_upside,p_research_difficulty,btrim(p_main_uncertainties),p_recommended_investigation,true,'ADVISORY',p_evidence_packet_id,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_photo_intelligence_finding(p_finding_code text, p_finding_type text, p_finding_statement text, p_evidence_scope text, p_uncertainty_summary text, p_photo_evidence_id uuid DEFAULT NULL::uuid, p_photo_comparison_set_id uuid DEFAULT NULL::uuid, p_confidence_status text DEFAULT 'UNASSESSED'::text, p_finding_source text DEFAULT 'MODEL_ADVISORY'::text, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.photo_intelligence_finding
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.photo_intelligence_finding;
BEGIN
 IF p_photo_evidence_id IS NULL AND p_photo_comparison_set_id IS NULL THEN RAISE EXCEPTION 'PHOTO_FINDING_REQUIRES_PHOTO_OR_COMPARISON_SET' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.photo_intelligence_finding(finding_code,photo_evidence_id,photo_comparison_set_id,finding_type,finding_statement,evidence_scope,uncertainty_summary,confidence_status,finding_source,lifecycle_status,evidence_packet_id,created_by)
 VALUES(upper(btrim(p_finding_code)),p_photo_evidence_id,p_photo_comparison_set_id,p_finding_type,btrim(p_finding_statement),btrim(p_evidence_scope),btrim(p_uncertainty_summary),p_confidence_status,p_finding_source,'ADVISORY',p_evidence_packet_id,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_plot(p_trial_id uuid, p_plot_code text, p_plot_name text, p_treatment_role text DEFAULT 'TREATMENT'::text, p_formulation_version_id uuid DEFAULT NULL::uuid, p_replicate_number integer DEFAULT NULL::integer, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_area_value numeric DEFAULT NULL::numeric, p_area_unit text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.plot
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.plot; ts text;
BEGIN
 SELECT lifecycle_status INTO ts FROM agriculture.trial WHERE trial_id=p_trial_id;
 IF ts IS NULL THEN RAISE EXCEPTION 'TRIAL_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF ts IN ('COMPLETED','CANCELLED','ARCHIVED') THEN RAISE EXCEPTION 'PLOT_CANNOT_BE_ADDED_TO_CLOSED_TRIAL' USING ERRCODE='55000'; END IF;
 INSERT INTO agriculture.plot(plot_code,trial_id,plot_name,replicate_number,treatment_role,formulation_version_id,latitude,longitude,area_value,area_unit,lifecycle_status,created_by)
 VALUES(upper(btrim(p_plot_code)),p_trial_id,btrim(p_plot_name),p_replicate_number,p_treatment_role,p_formulation_version_id,p_latitude,p_longitude,p_area_value,p_area_unit,'ACTIVE',p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_resource_recovery_pathway(p_resource_waste_stream_id uuid, p_pathway_code text, p_pathway_type text, p_pathway_summary text, p_recovery_feasibility text, p_actor_id uuid, p_processing_requirements text DEFAULT NULL::text)
 RETURNS agriculture.resource_recovery_pathway
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.resource_recovery_pathway; cc char(2);
BEGIN
 SELECT country_code INTO cc FROM agriculture.resource_waste_stream WHERE resource_waste_stream_id=p_resource_waste_stream_id AND recovery_status<>'ARCHIVED'; IF NOT FOUND THEN RAISE EXCEPTION 'RESOURCE_WASTE_STREAM_NOT_FOUND' USING ERRCODE='P0002'; END IF; PERFORM agriculture.api_require_capability(p_actor_id,'create_draft',cc);
 INSERT INTO agriculture.resource_recovery_pathway(resource_waste_stream_id,pathway_code,pathway_type,pathway_summary,processing_requirements,recovery_feasibility,safety_review_required,ecology_review_required,lifecycle_status,created_by)
 VALUES(p_resource_waste_stream_id,upper(btrim(p_pathway_code)),p_pathway_type,btrim(p_pathway_summary),p_processing_requirements,p_recovery_feasibility,true,true,'ADVISORY',p_actor_id) RETURNING * INTO r; RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_resource_waste_stream(p_waste_stream_code text, p_waste_stream_name text, p_waste_stream_type text, p_linked_country_resource_candidate_id uuid, p_actor_id uuid, p_country_code character DEFAULT NULL::bpchar, p_source_sector text DEFAULT NULL::text, p_generation_context text DEFAULT NULL::text, p_current_disposal_pathway text DEFAULT NULL::text, p_burning_involved boolean DEFAULT false, p_dumping_involved boolean DEFAULT false, p_landfill_involved boolean DEFAULT false, p_pollution_pathway text DEFAULT NULL::text, p_estimated_availability_status text DEFAULT 'UNKNOWN'::text, p_seasonality_summary text DEFAULT NULL::text, p_contamination_status text DEFAULT 'UNKNOWN'::text, p_known_contaminants text DEFAULT NULL::text)
 RETURNS agriculture.resource_waste_stream
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.resource_waste_stream; cc char(2);
BEGIN
 SELECT country_code INTO cc FROM agriculture.country_resource_candidate WHERE country_resource_candidate_id=p_linked_country_resource_candidate_id AND scientific_status<>'ARCHIVED'; IF NOT FOUND THEN RAISE EXCEPTION 'COUNTRY_RESOURCE_CANDIDATE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF p_country_code IS NOT NULL AND cc IS NOT NULL AND p_country_code<>cc THEN RAISE EXCEPTION 'WASTE_STREAM_COUNTRY_MUST_MATCH_RESOURCE_COUNTRY' USING ERRCODE='23514'; END IF;
 PERFORM agriculture.api_require_capability(p_actor_id,'create_draft',COALESCE(p_country_code,cc));
 INSERT INTO agriculture.resource_waste_stream(waste_stream_code,country_code,waste_stream_name,waste_stream_type,source_sector,generation_context,current_disposal_pathway,burning_involved,dumping_involved,landfill_involved,pollution_pathway,estimated_availability_status,seasonality_summary,contamination_status,known_contaminants,recovery_status,linked_country_resource_candidate_id,created_by,updated_by)
 VALUES(upper(btrim(p_waste_stream_code)),COALESCE(p_country_code,cc),btrim(p_waste_stream_name),p_waste_stream_type,p_source_sector,p_generation_context,p_current_disposal_pathway,p_burning_involved,p_dumping_involved,p_landfill_involved,p_pollution_pathway,p_estimated_availability_status,p_seasonality_summary,p_contamination_status,p_known_contaminants,'POTENTIAL',p_linked_country_resource_candidate_id,p_actor_id,p_actor_id) RETURNING * INTO r; RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_scientific_memory_entry(p_memory_code text, p_approved_learning_id uuid, p_memory_type text, p_memory_statement text, p_context_scope jsonb, p_governance_decision_id uuid, p_actor_id uuid, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_supersedes_memory_entry_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.scientific_memory_entry
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare al agriculture.approved_learning; m agriculture.scientific_memory_entry; ev uuid; next_version integer:=1;
begin
  perform agriculture.api_require_capability(p_actor_id,'approve',null);
  select * into al from agriculture.approved_learning where approved_learning_id=p_approved_learning_id and lifecycle_status='ACTIVE';
  if al.approved_learning_id is null then raise exception 'ACTIVE_APPROVED_LEARNING_REQUIRED' using errcode='23514'; end if;
  if al.governance_decision_id is distinct from p_governance_decision_id then raise exception 'MEMORY_GOVERNANCE_DECISION_MUST_MATCH_APPROVED_LEARNING' using errcode='23514'; end if;
  ev:=coalesce(p_evidence_packet_id,al.evidence_packet_id);
  if p_supersedes_memory_entry_id is not null then
    select version_no+1 into next_version from agriculture.scientific_memory_entry where scientific_memory_entry_id=p_supersedes_memory_entry_id;
    if next_version is null then raise exception 'SUPERSEDED_MEMORY_ENTRY_NOT_FOUND' using errcode='P0002'; end if;
  end if;
  insert into agriculture.scientific_memory_entry(memory_code,approved_learning_id,memory_type,memory_statement,context_scope,evidence_packet_id,governance_decision_id,lifecycle_status,version_no,supersedes_memory_entry_id,created_by,country_workspace_id)
  values(upper(btrim(p_memory_code)),p_approved_learning_id,p_memory_type,btrim(p_memory_statement),coalesce(p_context_scope,'{}'::jsonb),ev,p_governance_decision_id,'ACTIVE',next_version,p_supersedes_memory_entry_id,p_actor_id,al.country_workspace_id) returning * into m;
  insert into agriculture.memory_evidence_link(scientific_memory_entry_id,evidence_packet_id,evidence_role) values(m.scientific_memory_entry_id,ev,'SUPPORTING') on conflict do nothing;
  if p_supersedes_memory_entry_id is not null then update agriculture.scientific_memory_entry set lifecycle_status='SUPERSEDED' where scientific_memory_entry_id=p_supersedes_memory_entry_id; end if;
  return m;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_create_trial(p_trial_code text, p_trial_name text, p_trial_objective text, p_formulation_version_id uuid DEFAULT NULL::uuid, p_organization_id uuid DEFAULT NULL::uuid, p_farm_id uuid DEFAULT NULL::uuid, p_location_id uuid DEFAULT NULL::uuid, p_crop_id uuid DEFAULT NULL::uuid, p_variety_id uuid DEFAULT NULL::uuid, p_problem_id uuid DEFAULT NULL::uuid, p_protocol_summary text DEFAULT NULL::text, p_start_date date DEFAULT NULL::date, p_planned_end_date date DEFAULT NULL::date, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.trial
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.trial; readiness text; fvstatus text;
BEGIN
 IF nullif(btrim(p_trial_code),'') IS NULL OR nullif(btrim(p_trial_name),'') IS NULL OR nullif(btrim(p_trial_objective),'') IS NULL THEN RAISE EXCEPTION 'TRIAL_CODE_NAME_OBJECTIVE_REQUIRED' USING ERRCODE='23514'; END IF;
 IF p_formulation_version_id IS NOT NULL THEN
   SELECT trial_readiness,lifecycle_status INTO readiness,fvstatus FROM agriculture.formulation_version WHERE formulation_version_id=p_formulation_version_id;
   IF readiness IS NULL THEN RAISE EXCEPTION 'FORMULATION_VERSION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
   IF readiness<>'READY_FOR_TRIAL' OR fvstatus<>'APPROVED' THEN RAISE EXCEPTION 'TRIAL_REQUIRES_APPROVED_READY_FORMULATION_VERSION' USING ERRCODE='23514'; END IF;
 END IF;
 INSERT INTO agriculture.trial(trial_code,trial_name,formulation_version_id,organization_id,farm_id,location_id,crop_id,variety_id,problem_id,trial_objective,protocol_summary,start_date,planned_end_date,lifecycle_status,outcome_status,created_by)
 VALUES(upper(btrim(p_trial_code)),btrim(p_trial_name),p_formulation_version_id,p_organization_id,p_farm_id,p_location_id,p_crop_id,p_variety_id,p_problem_id,btrim(p_trial_objective),p_protocol_summary,p_start_date,p_planned_end_date,'DRAFT','NOT_RECORDED',p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_decide_ingredient_review(p_ingredient_id uuid, p_decision text, p_rationale text, p_evidence_summary text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  i agriculture.ingredient;
  iv agriculture.ingredient_version;
  gd agriculture.governance_decision;
  gr agriculture.governance_review;
  d text:=upper(btrim(p_decision));
  code_suffix text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
begin
  select * into i from agriculture.ingredient where ingredient_id=p_ingredient_id for update;
  if i.ingredient_id is null then raise exception 'INGREDIENT_NOT_FOUND' using errcode='P0002'; end if;
  if i.lifecycle_status<>'UNDER_REVIEW' then raise exception 'INGREDIENT_NOT_UNDER_REVIEW' using errcode='55000'; end if;
  if d not in ('APPROVE','REJECT') then raise exception 'INVALID_INGREDIENT_REVIEW_DECISION' using errcode='22023'; end if;
  if nullif(btrim(p_rationale),'') is null then raise exception 'INGREDIENT_REVIEW_RATIONALE_REQUIRED' using errcode='23514'; end if;
  perform agriculture.api_require_capability(p_actor_id,'review',i.country_code);
  if d='APPROVE' then perform agriculture.api_require_capability(p_actor_id,'approve',i.country_code); end if;
  select * into iv from agriculture.ingredient_version where ingredient_id=i.ingredient_id and version_no=i.current_version_no;
  if iv.ingredient_version_id is null or iv.review_status<>'PENDING' then raise exception 'CURRENT_INGREDIENT_VERSION_NOT_PENDING' using errcode='55000'; end if;
  gd:=agriculture.api_create_governance_decision('ING-'||code_suffix,case when d='APPROVE' then 'APPROVE' else 'REJECT' end,'INGREDIENT',i.ingredient_id,'AGRICULTURE_SCIENTIST',btrim(p_rationale),p_evidence_summary,p_actor_id);
  gr:=agriculture.api_create_governance_review('ING-REV-'||code_suffix,'INGREDIENT',i.ingredient_id,'SCIENTIFIC','AGRICULTURE_SCIENTIST',gd.decision_id,p_actor_id);
  gr:=agriculture.api_complete_governance_review(gr.review_id,case when d='APPROVE' then 'APPROVED' else 'REJECTED' end,coalesce(nullif(btrim(p_evidence_summary),''),'No additional evidence summary supplied.'),btrim(p_rationale),d,null,p_actor_id);
  gd:=agriculture.api_finalize_governance_decision(gd.decision_id,case when d='APPROVE' then 'APPROVED' else 'REJECTED' end,case when d='APPROVE' then 'Ingredient approved for governed AAB research use.' else 'Ingredient rejected during scientist review.' end,p_actor_id);
  if d='APPROVE' then
    iv:=agriculture.api_approve_ingredient_version(iv.ingredient_version_id,gd.decision_id,p_actor_id);
  else
    update agriculture.ingredient_version set review_status='REJECTED' where ingredient_version_id=iv.ingredient_version_id returning * into iv;
    update agriculture.ingredient set lifecycle_status='SUSPENDED',updated_at=now() where ingredient_id=i.ingredient_id returning * into i;
  end if;
  select * into i from agriculture.ingredient where ingredient_id=p_ingredient_id;
  return jsonb_build_object('ingredient',to_jsonb(i),'version',to_jsonb(iv),'governance_decision',to_jsonb(gd),'governance_review',to_jsonb(gr));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_decide_learning_review(p_learning_candidate_id uuid, p_decision text, p_evidence_reviewed_summary text, p_review_rationale text, p_applicability_scope jsonb, p_limitation_summary text, p_negative_downstream_action text, p_mechanism_statement text, p_mechanism_pathway text, p_mechanism_expected_effects text, p_claim_a text, p_claim_b text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare
  lc agriculture.learning_candidate;
  d agriculture.governance_decision;
  gr agriculture.governance_review;
  al agriculture.approved_learning;
  mem agriculture.scientific_memory_entry;
  neg agriculture.negative_learning_register;
  mh agriculture.mechanism_hypothesis;
  kg agriculture.knowledge_gap;
  cr agriculture.contradiction_record;
  outcome_rec agriculture.outcome;
  trial_rec agriculture.trial;
  s text;
  mem_type text;
  gap_type text;
  ctx jsonb;
begin
  if upper(btrim(p_decision))='APPROVE' then perform agriculture.api_require_capability(p_actor_id,'approve',null); else perform agriculture.api_require_capability(p_actor_id,'review',null); end if;
  select * into lc from agriculture.learning_candidate where learning_candidate_id=p_learning_candidate_id for update;
  if lc.learning_candidate_id is null or lc.candidate_status<>'UNDER_REVIEW' then raise exception 'LEARNING_CANDIDATE_NOT_UNDER_REVIEW' using errcode='55000'; end if;
  if lc.country_workspace_id is not null and not exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=lc.country_workspace_id and wm.membership_status='ACTIVE') then raise exception 'LEARNING_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  select gd.* into d from agriculture.governance_decision gd where gd.subject_entity_type='LEARNING_CANDIDATE' and gd.subject_entity_id=lc.learning_candidate_id and gd.decision_status='DRAFT' order by gd.created_at desc limit 1;
  select r.* into gr from agriculture.governance_review r where r.decision_id=d.decision_id and r.review_status in ('PENDING','IN_REVIEW') order by r.created_at desc limit 1;
  if d.decision_id is null or gr.review_id is null then raise exception 'LEARNING_GOVERNANCE_REVIEW_NOT_PREPARED' using errcode='23514'; end if;
  s:=case when upper(btrim(p_decision))='APPROVE' then 'APPROVED' else 'REJECTED' end;
  gr:=agriculture.api_complete_governance_review(gr.review_id,s,p_evidence_reviewed_summary,p_review_rationale,upper(btrim(p_decision)),null,p_actor_id);
  d:=agriculture.api_finalize_governance_decision(d.decision_id,s,case when s='APPROVED' then 'Learning approved for governed memory.' else 'Learning candidate rejected.' end,p_actor_id);
  if s='REJECTED' then
    update agriculture.learning_candidate set candidate_status='REJECTED',governance_decision_id=d.decision_id,reviewed_by=p_actor_id,reviewed_at=now() where learning_candidate_id=lc.learning_candidate_id returning * into lc;
    return jsonb_build_object('decision','REJECTED','learning_candidate',to_jsonb(lc));
  end if;

  select * into outcome_rec from agriculture.outcome where outcome_id=lc.subject_entity_id and lc.subject_entity_type='OUTCOME';
  if outcome_rec.outcome_id is not null then select * into trial_rec from agriculture.trial where trial_id=outcome_rec.trial_id; end if;
  ctx:=jsonb_strip_nulls(jsonb_build_object(
    'country_workspace_id',lc.country_workspace_id,
    'trial_id',trial_rec.trial_id,
    'trial_code',trial_rec.trial_code,
    'formulation_version_id',trial_rec.formulation_version_id,
    'outcome_id',outcome_rec.outcome_id,
    'candidate_type',lc.candidate_type
  ));

  al:=agriculture.api_approve_learning_candidate(
    lc.learning_candidate_id,
    'AL-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),
    lc.candidate_type,
    coalesce(p_applicability_scope,'{}'::jsonb),
    p_limitation_summary,
    d.decision_id,
    p_actor_id
  );

  mem_type:=case lc.candidate_type when 'NEGATIVE' then 'NEGATIVE_LEARNING' when 'MECHANISM' then 'MECHANISM' when 'CONTRADICTION' then 'CONTRADICTION' when 'SAFETY' then 'SAFETY' else 'OUTCOME' end;
  mem:=agriculture.api_create_scientific_memory_entry(
    'MEM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),
    al.approved_learning_id,mem_type,lc.learning_statement,ctx,d.decision_id,p_actor_id,lc.evidence_packet_id,null
  );

  if lc.candidate_type='NEGATIVE' then
    neg:=agriculture.api_register_negative_learning(
      al.approved_learning_id,ctx,lc.learning_statement,
      coalesce(nullif(upper(btrim(p_negative_downstream_action)),''),'WARN'),d.decision_id,p_actor_id
    );
    update agriculture.negative_learning_register set country_workspace_id=lc.country_workspace_id where negative_learning_id=neg.negative_learning_id returning * into neg;
  end if;

  if nullif(btrim(lc.uncertainty_summary),'') is not null then
    gap_type:=case when lc.candidate_type='MECHANISM' then 'UNKNOWN_MECHANISM' when lc.candidate_type='CONTRADICTION' then 'CONTRADICTORY_EVIDENCE' else 'MISSING_EVIDENCE' end;
    insert into agriculture.knowledge_gap(gap_code,subject_entity_type,subject_entity_id,gap_type,gap_statement,why_it_matters,proposed_resolution,priority_status,lifecycle_status,evidence_packet_id,created_by,country_workspace_id)
    values('KG-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),'OUTCOME',lc.subject_entity_id,gap_type,lc.uncertainty_summary,'Uncertainty remains after approved Trial learning and must stay visible to downstream reasoning.','Collect additional governed evidence or replication.','MODERATE','OPEN',lc.evidence_packet_id,p_actor_id,lc.country_workspace_id) returning * into kg;
  end if;

  if lc.candidate_type='MECHANISM' then
    if nullif(btrim(p_mechanism_statement),'') is null or nullif(btrim(p_mechanism_pathway),'') is null then raise exception 'MECHANISM_LEARNING_REQUIRES_HYPOTHESIS_AND_PATHWAY' using errcode='23514'; end if;
    insert into agriculture.mechanism_hypothesis(mechanism_code,subject_entity_type,subject_entity_id,mechanism_statement,proposed_pathway,expected_observable_effects,uncertainty_summary,confidence_status,lifecycle_status,evidence_packet_id,created_by,country_workspace_id)
    values('MECH-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),'OUTCOME',lc.subject_entity_id,btrim(p_mechanism_statement),btrim(p_mechanism_pathway),nullif(btrim(p_mechanism_expected_effects),''),coalesce(nullif(btrim(lc.uncertainty_summary),''),'Mechanism remains a governed hypothesis until separately reviewed.'),'UNASSESSED','HYPOTHESIS',lc.evidence_packet_id,p_actor_id,lc.country_workspace_id) returning * into mh;
  end if;

  if lc.candidate_type='CONTRADICTION' then
    if nullif(btrim(p_claim_a),'') is null or nullif(btrim(p_claim_b),'') is null then raise exception 'CONTRADICTION_LEARNING_REQUIRES_BOTH_CLAIMS' using errcode='23514'; end if;
    insert into agriculture.contradiction_record(contradiction_code,subject_entity_type,subject_entity_id,claim_a,claim_b,contradiction_summary,severity,lifecycle_status,evidence_packet_a_id,created_by,country_workspace_id)
    values('CON-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),'OUTCOME',lc.subject_entity_id,btrim(p_claim_a),btrim(p_claim_b),coalesce(nullif(btrim(lc.contradiction_summary),''),'Approved learning identified contradictory evidence.'),'MODERATE','OPEN',lc.evidence_packet_id,p_actor_id,lc.country_workspace_id) returning * into cr;
  end if;

  return jsonb_build_object(
    'decision','APPROVED',
    'learning_candidate',to_jsonb((select x from agriculture.learning_candidate x where x.learning_candidate_id=lc.learning_candidate_id)),
    'approved_learning',to_jsonb(al),
    'scientific_memory',to_jsonb(mem),
    'negative_learning',case when neg.negative_learning_id is null then null else to_jsonb(neg) end,
    'knowledge_gap',case when kg.knowledge_gap_id is null then null else to_jsonb(kg) end,
    'mechanism_hypothesis',case when mh.mechanism_hypothesis_id is null then null else to_jsonb(mh) end,
    'contradiction',case when cr.contradiction_record_id is null then null else to_jsonb(cr) end
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_decide_observation_review(p_observation_id uuid, p_decision text, p_evidence_reviewed_summary text, p_review_rationale text, p_quality_status text, p_completeness_status text, p_context_quality text, p_method_quality text, p_evidence_quality text, p_photo_quality text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  o agriculture.observation; d agriculture.governance_decision; gr agriculture.governance_review; dq agriculture.data_quality_assessment; be agriculture.brain_evidence_eligibility;
  final_review text; final_decision text;
begin
  if upper(btrim(p_decision))='APPROVE' then perform agriculture.api_require_capability(p_actor_id,'approve',null); else perform agriculture.api_require_capability(p_actor_id,'review',null); end if;
  select * into o from agriculture.observation where observation_id=p_observation_id for update;
  if o.observation_id is null or o.observation_status<>'VALIDATING' then raise exception 'OBSERVATION_NOT_AWAITING_REVIEW' using errcode='55000'; end if;
  select gd.* into d from agriculture.governance_decision gd where gd.subject_entity_type='OBSERVATION' and gd.subject_entity_id=o.observation_id and gd.decision_status='DRAFT' order by gd.created_at desc limit 1;
  select r.* into gr from agriculture.governance_review r where r.decision_id=d.decision_id and r.review_status in ('PENDING','IN_REVIEW') order by r.created_at desc limit 1;
  if d.decision_id is null or gr.review_id is null then raise exception 'OBSERVATION_REVIEW_WORKFLOW_NOT_PREPARED' using errcode='23514'; end if;

  if upper(btrim(p_decision))='APPROVE' then final_review:='APPROVED'; final_decision:='APPROVED'; else final_review:='REJECTED'; final_decision:='REJECTED'; end if;
  gr:=agriculture.api_complete_governance_review(gr.review_id,final_review,p_evidence_reviewed_summary,p_review_rationale,upper(btrim(p_decision)),null,p_actor_id);
  d:=agriculture.api_finalize_governance_decision(d.decision_id,final_decision,case when final_decision='APPROVED' then 'Observation approved for evidence eligibility assessment.' else 'Observation rejected from scientific evidence.' end,p_actor_id);

  dq:=agriculture.api_assess_data_quality(
    'OBSERVATION',o.observation_id,
    p_quality_status,p_completeness_status,p_context_quality,p_method_quality,p_evidence_quality,p_photo_quality,
    p_review_rationale,true,o.input_submission_id,gr.review_id,p_actor_id
  );

  if final_decision='APPROVED' then
    update agriculture.evidence_packet set packet_status='APPROVED',updated_by=p_actor_id,updated_at=now() where evidence_packet_id=o.evidence_packet_id and packet_status='COMPLETE';
    be:=agriculture.api_compute_brain_evidence_eligibility('OBSERVATION',o.observation_id,o.evidence_packet_id,d.decision_id,p_actor_id);
    if be.eligibility_status in ('ELIGIBLE','ELIGIBLE_WITH_WARNINGS') then
      update agriculture.measurement set measurement_status='REVIEWED' where observation_id=o.observation_id and measurement_status in ('SUBMITTED','VALID','VALID_WITH_WARNINGS');
      update agriculture.observation set observation_status='REVIEWED',data_quality_assessment_id=dq.data_quality_assessment_id,updated_at=now() where observation_id=o.observation_id returning * into o;
    else
      update agriculture.observation set observation_status='VALID_WITH_WARNINGS',data_quality_assessment_id=dq.data_quality_assessment_id,updated_at=now() where observation_id=o.observation_id returning * into o;
    end if;
  else
    update agriculture.measurement set measurement_status='REJECTED' where observation_id=o.observation_id and measurement_status<>'REVIEWED';
    update agriculture.observation set observation_status='REJECTED',data_quality_assessment_id=dq.data_quality_assessment_id,updated_at=now() where observation_id=o.observation_id returning * into o;
  end if;
  return jsonb_build_object('observation',to_jsonb(o),'quality',to_jsonb(dq),'eligibility',case when final_decision='APPROVED' then to_jsonb(be) else null end,'decision',to_jsonb(d),'review',to_jsonb(gr));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_decide_outcome_review(p_outcome_id uuid, p_decision text, p_evidence_reviewed_summary text, p_review_rationale text, p_actor_id uuid)
 RETURNS agriculture.outcome
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare o agriculture.outcome; d agriculture.governance_decision; gr agriculture.governance_review; s text; dq agriculture.data_quality_assessment; be agriculture.brain_evidence_eligibility;
begin
  if upper(btrim(p_decision))='APPROVE' then perform agriculture.api_require_capability(p_actor_id,'approve',null); else perform agriculture.api_require_capability(p_actor_id,'review',null); end if;
  select * into o from agriculture.outcome where outcome_id=p_outcome_id for update;
  if o.outcome_id is null or o.outcome_status<>'UNDER_REVIEW' then raise exception 'OUTCOME_NOT_AWAITING_REVIEW' using errcode='55000'; end if;
  select gd.* into d from agriculture.governance_decision gd where gd.subject_entity_type='OUTCOME' and gd.subject_entity_id=o.outcome_id and gd.decision_status='DRAFT' order by gd.created_at desc limit 1;
  select r.* into gr from agriculture.governance_review r where r.decision_id=d.decision_id and r.review_status in ('PENDING','IN_REVIEW') order by r.created_at desc limit 1;
  s:=case when upper(btrim(p_decision))='APPROVE' then 'APPROVED' else 'REJECTED' end;
  gr:=agriculture.api_complete_governance_review(gr.review_id,s,p_evidence_reviewed_summary,p_review_rationale,upper(btrim(p_decision)),null,p_actor_id);
  d:=agriculture.api_finalize_governance_decision(d.decision_id,s,case when s='APPROVED' then 'Outcome approved.' else 'Outcome rejected.' end,p_actor_id);
  update agriculture.outcome set outcome_status=s,governance_decision_id=d.decision_id,reviewed_by=p_actor_id,reviewed_at=now(),outcome_payload=coalesce(outcome_payload,'{}'::jsonb)||jsonb_build_object('review_summary',btrim(p_review_rationale)) where outcome_id=o.outcome_id returning * into o;
  if s='APPROVED' then
    update agriculture.evidence_packet set packet_status='APPROVED',updated_by=p_actor_id,updated_at=now() where evidence_packet_id=o.evidence_packet_id and packet_status='COMPLETE';
    dq:=agriculture.api_assess_data_quality('OUTCOME',o.outcome_id,'ACCEPTABLE','COMPLETE','STRONG','HIGH','STRONG','NOT_APPLICABLE','Scientist-approved outcome with complete governed evidence packet.',true,null,gr.review_id,p_actor_id);
    be:=agriculture.api_compute_brain_evidence_eligibility('OUTCOME',o.outcome_id,o.evidence_packet_id,d.decision_id,p_actor_id);
    update agriculture.trial set outcome_status='REVIEWED',updated_by=p_actor_id,updated_at=now() where trial_id=o.trial_id;
  else
    update agriculture.trial set outcome_status='RECORDED',updated_by=p_actor_id,updated_at=now() where trial_id=o.trial_id;
  end if;
  return o;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_finalize_evidence_packet(p_evidence_packet_id uuid, p_evidence_summary text, p_actor_id uuid)
 RETURNS agriculture.evidence_packet
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.evidence_packet; n integer; support_n integer;
BEGIN
 SELECT count(*),count(*) FILTER(WHERE evidence_role='SUPPORTING') INTO n,support_n FROM agriculture.evidence_packet_item WHERE evidence_packet_id=p_evidence_packet_id AND inclusion_status='INCLUDED';
 IF n=0 OR support_n=0 THEN RAISE EXCEPTION 'EVIDENCE_PACKET_REQUIRES_INCLUDED_SUPPORTING_EVIDENCE' USING ERRCODE='23514'; END IF;
 IF nullif(btrim(p_evidence_summary),'') IS NULL THEN RAISE EXCEPTION 'EVIDENCE_SUMMARY_REQUIRED' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.evidence_packet SET packet_status='COMPLETE',evidence_summary=btrim(p_evidence_summary),completeness_status='COMPLETE',updated_by=p_actor_id,updated_at=now() WHERE evidence_packet_id=p_evidence_packet_id AND packet_status IN ('DRAFT','ASSEMBLING') RETURNING * INTO r;
 IF r.evidence_packet_id IS NULL THEN RAISE EXCEPTION 'EVIDENCE_PACKET_NOT_FOUND_OR_NOT_FINALISABLE' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_finalize_governance_decision(p_decision_id uuid, p_decision_status text, p_outcome_summary text, p_actor_id uuid)
 RETURNS agriculture.governance_decision
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.governance_decision;
BEGIN
 IF p_decision_status NOT IN ('APPROVED','REJECTED','SUPERSEDED','WITHDRAWN') THEN RAISE EXCEPTION 'INVALID_FINAL_DECISION_STATUS' USING ERRCODE='22023'; END IF;
 IF p_actor_id IS NULL OR nullif(btrim(p_outcome_summary),'') IS NULL THEN RAISE EXCEPTION 'FINAL_DECISION_REQUIRES_ACTOR_AND_OUTCOME' USING ERRCODE='23514'; END IF;
 IF p_decision_status='APPROVED' AND NOT EXISTS(SELECT 1 FROM agriculture.governance_review gr WHERE gr.decision_id=p_decision_id AND gr.review_status='APPROVED' AND gr.reviewer_id IS NOT NULL AND gr.evidence_reviewed_summary IS NOT NULL AND gr.review_rationale IS NOT NULL AND gr.review_result IS NOT NULL) THEN RAISE EXCEPTION 'APPROVAL_REQUIRES_COMPLETED_APPROVED_REVIEW' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.governance_decision SET decision_status=p_decision_status,outcome_summary=btrim(p_outcome_summary),decided_by=p_actor_id,decided_at=now() WHERE decision_id=p_decision_id AND decision_status='DRAFT' RETURNING * INTO r;
 IF r.decision_id IS NULL THEN RAISE EXCEPTION 'DECISION_NOT_FOUND_OR_ALREADY_FINAL' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_finalize_observation(p_observation_id uuid, p_evidence_packet_id uuid, p_actor_id uuid)
 RETURNS agriculture.observation
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.observation; es text; qs text;
BEGIN
 SELECT * INTO r FROM agriculture.observation WHERE observation_id=p_observation_id FOR UPDATE;
 IF r.observation_id IS NULL THEN RAISE EXCEPTION 'OBSERVATION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF r.observation_status NOT IN ('SUBMITTED','UNDER_REVIEW') THEN RAISE EXCEPTION 'OBSERVATION_NOT_READY_FOR_FINALIZATION' USING ERRCODE='55000'; END IF;
 SELECT eligibility_status INTO es FROM agriculture.brain_evidence_eligibility WHERE subject_entity_type='OBSERVATION' AND subject_entity_id=p_observation_id;
 IF es NOT IN ('ELIGIBLE','ELIGIBLE_WITH_WARNINGS') THEN RAISE EXCEPTION 'OBSERVATION_REQUIRES_BRAIN_EVIDENCE_ELIGIBILITY' USING ERRCODE='23514'; END IF;
 SELECT quality_status INTO qs FROM agriculture.data_quality_assessment WHERE subject_entity_type='OBSERVATION' AND subject_entity_id=p_observation_id;
 IF qs NOT IN ('ACCEPTABLE','ACCEPTABLE_WITH_WARNINGS') THEN RAISE EXCEPTION 'OBSERVATION_REQUIRES_ACCEPTABLE_DATA_QUALITY' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.evidence_packet WHERE evidence_packet_id=p_evidence_packet_id) THEN RAISE EXCEPTION 'EVIDENCE_PACKET_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 UPDATE agriculture.observation SET observation_status='VALIDATED',evidence_packet_id=p_evidence_packet_id,updated_at=now() WHERE observation_id=p_observation_id RETURNING * INTO r;
 UPDATE agriculture.measurement SET measurement_status='VALIDATED' WHERE observation_id=p_observation_id AND measurement_status='SUBMITTED';
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_finalize_outcome(p_outcome_id uuid, p_outcome_status text, p_governance_decision_id uuid, p_review_summary text, p_actor_id uuid)
 RETURNS agriculture.outcome
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.outcome; ds text;
BEGIN
 IF p_outcome_status NOT IN ('VALIDATED','REJECTED') THEN RAISE EXCEPTION 'INVALID_FINAL_OUTCOME_STATUS' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(p_review_summary),'') IS NULL OR p_actor_id IS NULL THEN RAISE EXCEPTION 'OUTCOME_FINALIZATION_REQUIRES_REVIEW_SUMMARY_AND_ACTOR' USING ERRCODE='23514'; END IF;
 SELECT decision_status INTO ds FROM agriculture.governance_decision WHERE decision_id=p_governance_decision_id;
 IF ds<>'APPROVED' THEN RAISE EXCEPTION 'OUTCOME_FINALIZATION_REQUIRES_APPROVED_GOVERNANCE_DECISION' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.outcome SET outcome_status=p_outcome_status,governance_decision_id=p_governance_decision_id,reviewed_by=p_actor_id,reviewed_at=now(),outcome_payload=outcome_payload||jsonb_build_object('review_summary',btrim(p_review_summary)) WHERE outcome_id=p_outcome_id AND outcome_status='UNDER_REVIEW' RETURNING * INTO r;
 IF r.outcome_id IS NULL THEN RAISE EXCEPTION 'OUTCOME_NOT_FOUND_OR_NOT_UNDER_REVIEW' USING ERRCODE='55000'; END IF;
 UPDATE agriculture.trial SET outcome_status=CASE WHEN p_outcome_status='VALIDATED' THEN 'VALIDATED' ELSE 'REJECTED' END,updated_by=p_actor_id,updated_at=now() WHERE trial_id=r.trial_id;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_gateway_contract_snapshot()
 RETURNS TABLE(resource_code text, resource_type text, object_name text, operation_class text, authority_requirement text, audit_required boolean, direct_table_access_allowed boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
 SELECT resource_code,resource_type,object_name,operation_class,authority_requirement,audit_required,direct_table_access_allowed
 FROM agriculture.application_gateway_contract WHERE active=true ORDER BY resource_code;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_get_country_intelligence_settings(p_country_code character DEFAULT NULL::bpchar)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
 SELECT jsonb_build_object(
  'domain_map',COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.domain_class,d.domain_name) FROM agriculture.v_aab_domain_map d),'[]'::jsonb),
  'country_settings',COALESCE((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.country_code) FROM agriculture.country_intelligence_settings s WHERE p_country_code IS NULL OR s.country_code=p_country_code),'[]'::jsonb),
  'governance',jsonb_build_object('automatic_ingredient_promotion_allowed',false,'automatic_formulation_generation_allowed',false,'scientist_review_required',true,'traditional_knowledge_is_proof',false,'supplier_claim_is_evidence',false,'unknown_material_is_safe',false)
 );
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_get_observation_capture_workspace(p_trial_id uuid, p_plot_id uuid, p_template_version_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare t agriculture.trial; p agriculture.plot; result jsonb;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select * into t from agriculture.trial where trial_id=p_trial_id;
  if t.trial_id is null or t.lifecycle_status<>'ACTIVE' then raise exception 'ACTIVE_TRIAL_REQUIRED_FOR_CAPTURE' using errcode='23514'; end if;
  select * into p from agriculture.plot where plot_id=p_plot_id and trial_id=p_trial_id and lifecycle_status='ACTIVE';
  if p.plot_id is null then raise exception 'ACTIVE_TRIAL_PLOT_REQUIRED_FOR_CAPTURE' using errcode='23514'; end if;
  if t.country_workspace_id is not null and not exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=t.country_workspace_id and wm.membership_status='ACTIVE') then raise exception 'TRIAL_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  if not exists(select 1 from agriculture.trial_protocol_binding b where b.trial_id=p_trial_id and b.observation_template_version_id=p_template_version_id and b.effective_until is null) then raise exception 'TEMPLATE_NOT_BOUND_TO_TRIAL' using errcode='23514'; end if;
  select jsonb_build_object(
   'trial',jsonb_build_object('trial_id',t.trial_id,'trial_code',t.trial_code,'trial_name',t.trial_name,'formulation_version_id',t.formulation_version_id,'country_workspace_id',t.country_workspace_id),
   'plot',jsonb_build_object('plot_id',p.plot_id,'plot_code',p.plot_code,'plot_name',p.plot_name,'treatment_role',p.treatment_role,'formulation_version_id',p.formulation_version_id),
   'template',jsonb_build_object('template_version_id',otv.observation_template_version_id,'template_code',ot.template_code,'template_name',ot.template_name,'objective',otv.objective,'guidance',otv.guidance),
   'metrics',coalesce(jsonb_agg(jsonb_build_object('metric_definition_id',m.metric_definition_id,'metric_code',m.metric_code,'metric_name',m.metric_name,'description',m.metric_description,'value_type',m.value_type,'canonical_unit',m.canonical_unit,'precision',m.allowed_precision,'minimum',m.minimum_plausible_value,'maximum',m.maximum_plausible_value,'requirement_level',otm.requirement_level,'display_order',otm.display_order,'capture_guidance',otm.capture_guidance,'conditional_rule',otm.conditional_rule) order by otm.display_order),'[]'::jsonb)
  ) into result
  from agriculture.observation_template_version otv join agriculture.observation_template ot on ot.observation_template_id=otv.observation_template_id left join agriculture.observation_template_metric otm on otm.observation_template_version_id=otv.observation_template_version_id left join agriculture.metric_definition m on m.metric_definition_id=otm.metric_definition_id and m.lifecycle_status='ACTIVE'
  where otv.observation_template_version_id=p_template_version_id and otv.version_status='ACTIVE'
  group by otv.observation_template_version_id,ot.template_code,ot.template_name,otv.objective,otv.guidance;
  if result is null then raise exception 'ACTIVE_TEMPLATE_REQUIRED' using errcode='23514'; end if;
  return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_get_observation_science_workspace(p_observation_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare x agriculture.v_observation_science_workspace%rowtype; has_country boolean;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select * into x from agriculture.v_observation_science_workspace where observation_id=p_observation_id;
  if x.observation_id is null then raise exception 'OBSERVATION_NOT_FOUND' using errcode='P0002'; end if;
  select exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and membership_status='ACTIVE') into has_country;
  if has_country and not exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=x.country_workspace_id) then raise exception 'OBSERVATION_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  if not has_country and x.country_workspace_id is not null then raise exception 'OBSERVATION_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  return to_jsonb(x);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_get_outcome_workspace(p_outcome_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare x agriculture.v_outcome_workspace%rowtype; has_country boolean;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select * into x from agriculture.v_outcome_workspace where outcome_id=p_outcome_id;
  if x.outcome_id is null then raise exception 'OUTCOME_NOT_FOUND' using errcode='P0002'; end if;
  select exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and membership_status='ACTIVE') into has_country;
  if has_country and not exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=x.country_workspace_id) then raise exception 'OUTCOME_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  if not has_country and x.country_workspace_id is not null then raise exception 'OUTCOME_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  return to_jsonb(x);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_get_trial_activation_workspace(p_trial_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare
  t jsonb; plots jsonb; pending jsonb; can_create boolean; can_submit boolean; can_approve boolean;
begin
  t:=agriculture.api_get_trial_workspace(p_trial_id,p_actor_id);
  select coalesce(jsonb_agg(jsonb_build_object(
    'plot_id',p.plot_id,'plot_code',p.plot_code,'plot_name',p.plot_name,'replicate_number',p.replicate_number,
    'treatment_role',p.treatment_role,'formulation_version_id',p.formulation_version_id,'latitude',p.latitude,'longitude',p.longitude,
    'area_value',p.area_value,'area_unit',p.area_unit,'lifecycle_status',p.lifecycle_status,'country_workspace_id',p.country_workspace_id
  ) order by p.plot_code),'[]'::jsonb) into plots from agriculture.plot p where p.trial_id=p_trial_id and p.lifecycle_status<>'ARCHIVED';
  select jsonb_build_object('decision_id',h.governance_decision_id,'review_id',h.governance_review_id,'status',h.decision_status,'submitted_at',h.submitted_at,'submitted_by',h.submitted_by)
  into pending from agriculture.trial_activation_handoff h where h.trial_id=p_trial_id and h.decision_status='PENDING' order by h.submitted_at desc limit 1;
  can_create:=agriculture.api_actor_has_capability(p_actor_id,'create_draft',null);
  can_submit:=agriculture.api_actor_has_capability(p_actor_id,'submit_review',null);
  can_approve:=agriculture.api_actor_has_capability(p_actor_id,'approve',null);
  return jsonb_build_object('trial',t,'plots',plots,'pending_activation',pending,'capabilities',jsonb_build_object('add_plot',can_create,'submit_activation',can_submit,'decide_activation',can_approve));
end; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_get_trial_workspace(p_trial_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare x agriculture.v_trial_workspace%rowtype; has_country boolean;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select * into x from agriculture.v_trial_workspace where trial_id=p_trial_id;
  if x.trial_id is null then raise exception 'TRIAL_NOT_FOUND' using errcode='P0002'; end if;
  select exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and membership_status='ACTIVE') into has_country;
  if has_country and not exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=x.country_workspace_id) then
    raise exception 'TRIAL_COUNTRY_ACCESS_DENIED' using errcode='42501';
  end if;
  if not has_country and x.country_workspace_id is not null then raise exception 'TRIAL_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  return to_jsonb(x);
end;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_grant_actor_access(p_actor_id uuid, p_access_profile_code text, p_grant_reason text, p_granted_by uuid, p_country_code character DEFAULT NULL::bpchar)
 RETURNS agriculture.actor_access_assignment
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.actor_access_assignment;
BEGIN
 PERFORM agriculture.api_require_capability(p_granted_by,'administer',p_country_code);
 IF nullif(btrim(p_grant_reason),'') IS NULL THEN RAISE EXCEPTION 'ACCESS_GRANT_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.access_profile WHERE access_profile_code=p_access_profile_code AND active) THEN RAISE EXCEPTION 'ACTIVE_ACCESS_PROFILE_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,country_code,granted_by,grant_reason,active)
 VALUES(p_actor_id,p_access_profile_code,'AGRICULTURE',p_country_code,p_granted_by,btrim(p_grant_reason),true) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_grant_actor_authority(p_actor_id uuid, p_role_code text, p_grant_rationale text, p_granted_by uuid, p_country_code character DEFAULT NULL::bpchar)
 RETURNS agriculture.actor_authority
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.actor_authority;
BEGIN
 PERFORM agriculture.api_require_capability(p_granted_by,'administer',p_country_code);
 IF nullif(btrim(p_grant_rationale),'') IS NULL THEN RAISE EXCEPTION 'AUTHORITY_GRANT_RATIONALE_REQUIRED' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.authority_role WHERE role_code=p_role_code AND active) THEN RAISE EXCEPTION 'ACTIVE_AUTHORITY_ROLE_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.actor_authority(actor_id,role_code,country_code,authority_scope,granted_by,grant_rationale,active)
 VALUES(p_actor_id,p_role_code,p_country_code,'AGRICULTURE',p_granted_by,btrim(p_grant_rationale),true) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_list_ingredients(p_include_retired boolean DEFAULT false)
 RETURNS TABLE(ingredient_id uuid, ingredient_code text, ingredient_name text, lifecycle_status text, material_class text, preparation_class text, data_class text, country_code character, current_version_no integer, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
 SELECT i.ingredient_id,i.ingredient_code,i.ingredient_name,i.lifecycle_status,i.material_class,i.preparation_class,i.data_class,i.country_code,i.current_version_no,i.created_at,i.updated_at
 FROM agriculture.ingredient i
 WHERE p_include_retired OR i.lifecycle_status NOT IN ('RETIRED','SUPERSEDED')
 ORDER BY lower(i.ingredient_name),i.ingredient_code;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_list_learning_workspace(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare has_country boolean; result jsonb;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE') into has_country;
  select jsonb_build_object(
    'eligible_trial_sources',coalesce((select jsonb_agg(x order by completed_at desc nulls last) from (
      select jsonb_build_object('trial_id',t.trial_id,'trial_code',t.trial_code,'trial_name',t.trial_name,'completed_at',t.actual_end_date,'formulation_version_id',t.formulation_version_id,'outcome_id',o.outcome_id,'outcome_code',o.outcome_code,'outcome_type',o.outcome_type,'outcome_summary',o.outcome_summary,'evidence_packet_id',o.evidence_packet_id,'eligibility_status',be.eligibility_status,'country_workspace_id',t.country_workspace_id) x,t.actual_end_date completed_at
      from agriculture.trial t join agriculture.outcome o on o.trial_id=t.trial_id and o.outcome_status='APPROVED'
      join agriculture.brain_evidence_eligibility be on be.subject_entity_type='OUTCOME' and be.subject_entity_id=o.outcome_id and be.eligibility_status in ('ELIGIBLE','ELIGIBLE_WITH_WARNINGS')
      where t.lifecycle_status='COMPLETED' and t.outcome_status='REVIEWED'
        and ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=t.country_workspace_id)) or (not has_country and t.country_workspace_id is null))
    ) q),'[]'::jsonb),
    'learning_candidates',coalesce((select jsonb_agg(jsonb_build_object('learning_candidate_id',lc.learning_candidate_id,'learning_candidate_code',lc.learning_candidate_code,'candidate_type',lc.candidate_type,'candidate_status',lc.candidate_status,'learning_statement',lc.learning_statement,'uncertainty_summary',lc.uncertainty_summary,'contradiction_summary',lc.contradiction_summary,'created_at',lc.created_at,'country_workspace_id',lc.country_workspace_id,'outcome_id',lc.subject_entity_id,'trial_id',o.trial_id,'trial_code',t.trial_code,'trial_name',t.trial_name,'formulation_version_id',t.formulation_version_id,'eligibility_status',be.eligibility_status) order by lc.created_at desc)
      from agriculture.learning_candidate lc left join agriculture.outcome o on lc.subject_entity_type='OUTCOME' and o.outcome_id=lc.subject_entity_id left join agriculture.trial t on t.trial_id=o.trial_id left join agriculture.brain_evidence_eligibility be on be.brain_evidence_eligibility_id=lc.brain_evidence_eligibility_id
      where ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=lc.country_workspace_id)) or (not has_country and lc.country_workspace_id is null))),'[]'::jsonb),
    'approved_learning',coalesce((select jsonb_agg(to_jsonb(al) order by al.approved_at desc) from agriculture.approved_learning al where ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=al.country_workspace_id)) or (not has_country and al.country_workspace_id is null))),'[]'::jsonb),
    'scientific_memory',coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc) from agriculture.scientific_memory_entry m where ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=m.country_workspace_id)) or (not has_country and m.country_workspace_id is null))),'[]'::jsonb),
    'negative_learning',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from agriculture.negative_learning_register n where ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=n.country_workspace_id)) or (not has_country and n.country_workspace_id is null))),'[]'::jsonb),
    'knowledge_gaps',coalesce((select jsonb_agg(to_jsonb(k) order by k.created_at desc) from agriculture.knowledge_gap k where ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=k.country_workspace_id)) or (not has_country and k.country_workspace_id is null))),'[]'::jsonb),
    'mechanisms',coalesce((select jsonb_agg(to_jsonb(mh) order by mh.created_at desc) from agriculture.mechanism_hypothesis mh where ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=mh.country_workspace_id)) or (not has_country and mh.country_workspace_id is null))),'[]'::jsonb),
    'contradictions',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from agriculture.contradiction_record c where ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=c.country_workspace_id)) or (not has_country and c.country_workspace_id is null))),'[]'::jsonb)
  ) into result;
  return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_list_observation_capture_targets(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare has_country boolean; result jsonb;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE') into has_country;
  select coalesce(jsonb_agg(x.obj order by x.trial_code,x.plot_code),'[]'::jsonb) into result
  from (
    select t.trial_code,p.plot_code,jsonb_build_object(
      'trial_id',t.trial_id,'trial_code',t.trial_code,'trial_name',t.trial_name,'trial_status',t.lifecycle_status,
      'formulation_version_id',t.formulation_version_id,'country_workspace_id',t.country_workspace_id,
      'plot_id',p.plot_id,'plot_code',p.plot_code,'plot_name',p.plot_name,'treatment_role',p.treatment_role,'plot_formulation_version_id',p.formulation_version_id,
      'protocols',coalesce((select jsonb_agg(jsonb_build_object('template_version_id',b.observation_template_version_id,'template_code',ot.template_code,'template_name',ot.template_name,'binding_role',b.binding_role,'required',b.required) order by case b.binding_role when 'PRIMARY' then 1 when 'DIAGNOSTIC_FOLLOWUP' then 2 else 3 end,ot.template_name) from agriculture.trial_protocol_binding b join agriculture.observation_template_version otv on otv.observation_template_version_id=b.observation_template_version_id join agriculture.observation_template ot on ot.observation_template_id=otv.observation_template_id where b.trial_id=t.trial_id and b.effective_until is null and otv.version_status='ACTIVE'),'[]'::jsonb)
    ) obj
    from agriculture.trial t join agriculture.plot p on p.trial_id=t.trial_id and p.lifecycle_status='ACTIVE'
    where t.lifecycle_status='ACTIVE'
      and ((has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=t.country_workspace_id)) or (not has_country and t.country_workspace_id is null))
  ) x;
  return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_list_observation_science_workspace(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare has_country boolean; result jsonb;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and membership_status='ACTIVE') into has_country;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.observed_at desc),'[]'::jsonb) into result from agriculture.v_observation_science_workspace x
  where (has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=x.country_workspace_id))
     or (not has_country and x.country_workspace_id is null);
  return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_list_outcome_workspace(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare has_country boolean; result jsonb;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and membership_status='ACTIVE') into has_country;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result from agriculture.v_outcome_workspace x
  where (has_country and exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=x.country_workspace_id))
     or (not has_country and x.country_workspace_id is null);
  return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_list_trial_workspace(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare
  has_country boolean;
  result jsonb;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and membership_status='ACTIVE') into has_country;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into result
  from agriculture.v_trial_workspace x
  where (has_country and exists(
          select 1 from country_core.workspace_membership wm
          where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.country_workspace_id=x.country_workspace_id
        ))
     or (not has_country and x.country_workspace_id is null);
  return result;
end;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_mark_discovery_investigation_ready(p_discovery_candidate_id uuid, p_actor_id uuid)
 RETURNS agriculture.discovery_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.discovery_candidate; opp integer; gaps integer; contradictions integer;
BEGIN
 SELECT count(*) INTO opp FROM agriculture.opportunity_profile WHERE discovery_candidate_id=p_discovery_candidate_id AND profile_status='ADVISORY';
 IF opp=0 THEN RAISE EXCEPTION 'DISCOVERY_REQUIRES_OPPORTUNITY_PROFILE' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO gaps FROM agriculture.knowledge_gap WHERE subject_entity_type='DISCOVERY_CANDIDATE' AND subject_entity_id=p_discovery_candidate_id AND lifecycle_status IN ('OPEN','UNDER_INVESTIGATION');
 SELECT count(*) INTO contradictions FROM agriculture.contradiction_record WHERE subject_entity_type='DISCOVERY_CANDIDATE' AND subject_entity_id=p_discovery_candidate_id AND lifecycle_status IN ('OPEN','UNDER_REVIEW');
 UPDATE agriculture.discovery_candidate SET lifecycle_status='INVESTIGATION_READY',updated_by=p_actor_id,updated_at=now() WHERE discovery_candidate_id=p_discovery_candidate_id AND lifecycle_status='REVIEWED' AND evidence_packet_id IS NOT NULL AND governance_decision_id IS NOT NULL RETURNING * INTO r;
 IF r.discovery_candidate_id IS NULL THEN RAISE EXCEPTION 'DISCOVERY_NOT_ELIGIBLE_FOR_INVESTIGATION_READINESS' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_mark_formulation_ready_for_trial(p_formulation_version_id uuid, p_actor_id uuid)
 RETURNS agriculture.formulation_version
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.formulation_version; total numeric; BEGIN
 SELECT COALESCE(sum(inclusion_rate_percent),0) INTO total FROM agriculture.formulation_version_ingredient_line WHERE formulation_version_id=p_formulation_version_id AND is_active;
 IF abs(total-100)>0.0001 THEN RAISE EXCEPTION 'FORMULATION_TOTAL_MUST_EQUAL_100_PERCENT: %',total USING ERRCODE='23514'; END IF;
 UPDATE agriculture.formulation_version SET trial_readiness='READY_FOR_TRIAL' WHERE formulation_version_id=p_formulation_version_id AND lifecycle_status='APPROVED' AND trial_readiness='NOT_READY' RETURNING * INTO r;
 IF r.formulation_version_id IS NULL THEN RAISE EXCEPTION 'FORMULATION_VERSION_NOT_ELIGIBLE_FOR_TRIAL_READINESS' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_materialise_formulation_version(p_version_code text, p_formulation_name text, p_version_number integer, p_formulation_candidate_id uuid, p_change_rationale text, p_expected_outcomes text, p_governance_decision_id uuid, p_actor_id uuid, p_formulation_type text DEFAULT 'OTHER'::text, p_data_class text DEFAULT 'TEST'::text)
 RETURNS agriculture.formulation_version
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.formulation_version; ds text;
BEGIN
 SELECT decision_status INTO ds FROM agriculture.governance_decision WHERE decision_id=p_governance_decision_id;
 IF ds<>'APPROVED' THEN RAISE EXCEPTION 'FORMULATION_MATERIALISATION_REQUIRES_APPROVED_GOVERNANCE_DECISION' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.formulation_candidate WHERE formulation_candidate_id=p_formulation_candidate_id AND candidate_status IN ('ADVISORY','UNDER_REVIEW','ACCEPTED_FOR_VERSIONING')) THEN RAISE EXCEPTION 'FORMULATION_CANDIDATE_NOT_ELIGIBLE_FOR_VERSIONING' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.formulation_version(version_code,formulation_name,version_number,formulation_type,formulation_candidate_id,change_type,change_rationale,expected_outcomes,data_class,trial_readiness,lifecycle_status,governance_decision_id,created_by,approved_by,approved_at)
 VALUES(upper(btrim(p_version_code)),btrim(p_formulation_name),p_version_number,p_formulation_type,p_formulation_candidate_id,'INITIAL',btrim(p_change_rationale),p_expected_outcomes,p_data_class,'NOT_READY','APPROVED',p_governance_decision_id,p_actor_id,p_actor_id,now()) RETURNING * INTO r;
 UPDATE agriculture.formulation_candidate SET candidate_status='ACCEPTED_FOR_VERSIONING' WHERE formulation_candidate_id=p_formulation_candidate_id;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_prepare_learning_review(p_learning_candidate_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare
  lc agriculture.learning_candidate;
  d agriculture.governance_decision;
  gr agriculture.governance_review;
  code text;
begin
  perform agriculture.api_require_capability(p_actor_id,'submit_review',null);
  select * into lc from agriculture.learning_candidate where learning_candidate_id=p_learning_candidate_id for update;
  if lc.learning_candidate_id is null or lc.candidate_status<>'DRAFT' then raise exception 'LEARNING_CANDIDATE_NOT_DRAFT' using errcode='55000'; end if;
  if lc.country_workspace_id is not null and not exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=lc.country_workspace_id and wm.membership_status='ACTIVE') then raise exception 'LEARNING_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  code:='LRN-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
  d:=agriculture.api_create_governance_decision(code,'APPROVE','LEARNING_CANDIDATE',lc.learning_candidate_id,'AGRICULTURE_SCIENTIST','Scientific review required before learning enters AAB Scientific Memory.',lc.learning_statement,p_actor_id);
  gr:=agriculture.api_create_governance_review('REV-'||code,'LEARNING_CANDIDATE',lc.learning_candidate_id,'SCIENTIFIC','AGRICULTURE_SCIENTIST',d.decision_id,p_actor_id);
  perform agriculture.api_submit_learning_candidate(lc.learning_candidate_id,p_actor_id);
  return jsonb_build_object('learning_candidate_id',lc.learning_candidate_id,'decision_id',d.decision_id,'review_id',gr.review_id,'status','UNDER_REVIEW');
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_prepare_observation_review(p_observation_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  o agriculture.observation; ep agriculture.evidence_packet; d agriculture.governance_decision; gr agriculture.governance_review;
  m record; code text;
begin
  perform agriculture.api_require_capability(p_actor_id,'submit_review',null);
  select * into o from agriculture.observation where observation_id=p_observation_id for update;
  if o.observation_id is null then raise exception 'OBSERVATION_NOT_FOUND' using errcode='P0002'; end if;
  if o.observer_id is distinct from p_actor_id and not agriculture.api_actor_has_capability(p_actor_id,'review',null) then raise exception 'OBSERVATION_SUBMIT_ACCESS_DENIED' using errcode='42501'; end if;
  if o.observation_status='DRAFT' then perform agriculture.api_submit_observation_for_validation(p_observation_id,p_actor_id); select * into o from agriculture.observation where observation_id=p_observation_id; end if;
  if o.observation_status not in ('SUBMITTED','VALIDATING') then raise exception 'OBSERVATION_NOT_READY_FOR_REVIEW' using errcode='55000'; end if;

  if o.evidence_packet_id is null then
    code:='OBS-EP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
    ep:=agriculture.api_create_evidence_packet(code,'OBSERVATION','OBSERVATION',o.observation_id,'Observation evidence assembled from governed field capture.',p_actor_id);
    perform agriculture.api_add_evidence_packet_item(ep.evidence_packet_id,'OBSERVATION','PRIMARY','OBSERVATION',o.observation_id,null,'Primary governed observation.',p_actor_id);
    for m in select measurement_id,metric_definition_id from agriculture.measurement where observation_id=o.observation_id order by created_at loop
      perform agriculture.api_add_evidence_packet_item(ep.evidence_packet_id,'MEASUREMENT','SUPPORTING','MEASUREMENT',m.measurement_id,null,'Captured governed measurement.',p_actor_id);
    end loop;
    ep:=agriculture.api_finalize_evidence_packet(ep.evidence_packet_id,'Observation packet contains the observation and all captured measurements.',p_actor_id);
    update agriculture.observation set evidence_packet_id=ep.evidence_packet_id,observation_status='VALIDATING',updated_at=now() where observation_id=o.observation_id returning * into o;
  else
    select * into ep from agriculture.evidence_packet where evidence_packet_id=o.evidence_packet_id;
  end if;

  select gd.* into d from agriculture.governance_decision gd where gd.subject_entity_type='OBSERVATION' and gd.subject_entity_id=o.observation_id and gd.decision_status='DRAFT' order by gd.created_at desc limit 1;
  if d.decision_id is null then
    d:=agriculture.api_create_governance_decision('OBS-GOV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),'APPROVE','OBSERVATION',o.observation_id,'AGRICULTURE_SCIENTIST','Review captured observation for scientific evidence eligibility.','Review measurements, context, quality and applicable photo evidence.',p_actor_id);
  end if;
  select r.* into gr from agriculture.governance_review r where r.decision_id=d.decision_id and r.review_status in ('PENDING','IN_REVIEW') order by r.created_at desc limit 1;
  if gr.review_id is null then
    gr:=agriculture.api_create_governance_review('OBS-REV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),'OBSERVATION',o.observation_id,'EVIDENCE','AGRICULTURE_SCIENTIST',d.decision_id,p_actor_id);
  end if;
  return jsonb_build_object('observation',to_jsonb(o),'evidence_packet',to_jsonb(ep),'decision',to_jsonb(d),'review',to_jsonb(gr));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_prepare_outcome_review(p_outcome_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare o agriculture.outcome; ep agriculture.evidence_packet; d agriculture.governance_decision; gr agriculture.governance_review; ob record; code text;
begin
  perform agriculture.api_require_capability(p_actor_id,'submit_review',null);
  select * into o from agriculture.outcome where outcome_id=p_outcome_id for update;
  if o.outcome_id is null or o.outcome_status<>'DRAFT' then raise exception 'OUTCOME_NOT_FOUND_OR_NOT_DRAFT' using errcode='55000'; end if;
  if o.evidence_packet_id is null then
    code:='OUT-EP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
    ep:=agriculture.api_create_evidence_packet(code,'OUTCOME','OUTCOME',o.outcome_id,'Outcome evidence assembled from reviewed field observations.',p_actor_id);
    perform agriculture.api_add_evidence_packet_item(ep.evidence_packet_id,'OTHER','PRIMARY','OUTCOME',o.outcome_id,null,'Outcome under review.',p_actor_id);
    for ob in select observation_id from agriculture.observation where trial_id=o.trial_id and (o.plot_id is null or plot_id=o.plot_id) and observation_status='REVIEWED' order by observed_at loop
      perform agriculture.api_add_evidence_packet_item(ep.evidence_packet_id,'OBSERVATION','SUPPORTING','OBSERVATION',ob.observation_id,null,'Reviewed observation supporting outcome.',p_actor_id);
    end loop;
    ep:=agriculture.api_finalize_evidence_packet(ep.evidence_packet_id,'Outcome packet contains the outcome plus reviewed supporting observations.',p_actor_id);
    update agriculture.outcome set evidence_packet_id=ep.evidence_packet_id,outcome_status='UNDER_REVIEW' where outcome_id=o.outcome_id returning * into o;
  end if;
  d:=agriculture.api_create_governance_decision('OUT-GOV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),'APPROVE','OUTCOME',o.outcome_id,'AGRICULTURE_SCIENTIST','Review recorded outcome against governed observations and evidence packet.','Outcome evidence packet review.',p_actor_id);
  gr:=agriculture.api_create_governance_review('OUT-REV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18)),'OUTCOME',o.outcome_id,'FINAL_APPROVAL','AGRICULTURE_SCIENTIST',d.decision_id,p_actor_id);
  return jsonb_build_object('outcome',to_jsonb(o),'evidence_packet',to_jsonb(ep),'decision',to_jsonb(d),'review',to_jsonb(gr));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_prepare_trial_learning(p_trial_id uuid, p_candidate_type text, p_learning_statement text, p_uncertainty_summary text, p_contradiction_summary text, p_actor_id uuid)
 RETURNS agriculture.learning_candidate
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare
  t agriculture.trial;
  o agriculture.outcome;
  be agriculture.brain_evidence_eligibility;
  code text;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  select * into t from agriculture.trial where trial_id=p_trial_id;
  if t.trial_id is null or t.lifecycle_status<>'COMPLETED' or t.outcome_status<>'REVIEWED' then
    raise exception 'COMPLETED_REVIEWED_TRIAL_REQUIRED_FOR_LEARNING' using errcode='23514';
  end if;
  if t.country_workspace_id is not null and not exists(
    select 1 from country_core.workspace_membership wm
    where wm.actor_id=p_actor_id and wm.country_workspace_id=t.country_workspace_id and wm.membership_status='ACTIVE'
  ) then raise exception 'TRIAL_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  select * into o from agriculture.outcome where trial_id=t.trial_id and outcome_status='APPROVED' order by reviewed_at desc nulls last, created_at desc limit 1;
  if o.outcome_id is null then raise exception 'APPROVED_OUTCOME_REQUIRED_FOR_LEARNING' using errcode='23514'; end if;
  select * into be from agriculture.brain_evidence_eligibility where subject_entity_type='OUTCOME' and subject_entity_id=o.outcome_id;
  if be.brain_evidence_eligibility_id is null or be.eligibility_status not in ('ELIGIBLE','ELIGIBLE_WITH_WARNINGS') then
    raise exception 'OUTCOME_MUST_BE_BRAIN_EVIDENCE_ELIGIBLE' using errcode='23514';
  end if;
  if p_candidate_type not in ('POSITIVE','NEGATIVE','NEUTRAL','CONTRADICTION','MECHANISM','SAFETY','OTHER') then
    raise exception 'INVALID_LEARNING_CANDIDATE_TYPE' using errcode='22023';
  end if;
  if nullif(btrim(p_learning_statement),'') is null then raise exception 'LEARNING_STATEMENT_REQUIRED' using errcode='23514'; end if;
  code:='LC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
  return agriculture.api_create_learning_candidate(
    code,p_candidate_type,'OUTCOME',o.outcome_id,be.brain_evidence_eligibility_id,o.evidence_packet_id,
    p_learning_statement,p_uncertainty_summary,p_contradiction_summary,p_actor_id
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_prioritise_resource_discovery(p_resource_discovery_run_id uuid)
 RETURNS agriculture.resource_discovery_priority
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE a agriculture.resource_discovery_assessment; r agriculture.resource_discovery_priority; pb text; eb text; sb text; evb text; sab text;
BEGIN
 SELECT * INTO a FROM agriculture.resource_discovery_assessment WHERE resource_discovery_run_id=p_resource_discovery_run_id;
 IF a.resource_discovery_assessment_id IS NULL THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_ASSESSMENT_REQUIRED' USING ERRCODE='23514'; END IF;
 pb:=CASE WHEN a.investigation_priority_score>=85 THEN 'EXTREME' WHEN a.investigation_priority_score>=70 THEN 'HIGH' WHEN a.investigation_priority_score>=45 THEN 'MEDIUM' ELSE 'LOW' END;
 eb:=CASE WHEN a.environmental_benefit_score>=85 THEN 'EXTREME' WHEN a.environmental_benefit_score>=70 THEN 'HIGH' WHEN a.environmental_benefit_score>=45 THEN 'MEDIUM' ELSE 'LOW' END;
 sb:=CASE WHEN ((a.discovery_potential_score+a.scientific_novelty_score+a.mechanism_plausibility_score)/3)>=85 THEN 'EXTREME' WHEN ((a.discovery_potential_score+a.scientific_novelty_score+a.mechanism_plausibility_score)/3)>=70 THEN 'HIGH' WHEN ((a.discovery_potential_score+a.scientific_novelty_score+a.mechanism_plausibility_score)/3)>=45 THEN 'MEDIUM' ELSE 'LOW' END;
 evb:=CASE WHEN a.evidence_strength_score>=70 THEN 'HIGH' WHEN a.evidence_strength_score>=40 THEN 'MEDIUM' ELSE 'LOW' END;
 sab:=CASE WHEN a.safety_concern_score>=85 OR a.ecological_concern_score>=85 THEN 'CRITICAL' WHEN a.safety_concern_score>=65 OR a.ecological_concern_score>=65 THEN 'HIGH' WHEN a.safety_concern_score>=40 OR a.ecological_concern_score>=40 THEN 'MEDIUM' ELSE 'LOW' END;
 INSERT INTO agriculture.resource_discovery_priority(resource_discovery_run_id,priority_band,investigation_priority_score,environmental_opportunity_band,scientific_opportunity_band,evidence_readiness_band,safety_attention_band,rationale)
 VALUES(p_resource_discovery_run_id,pb,a.investigation_priority_score,eb,sb,evb,sab,'Priority ranks investigation value only. It does not indicate efficacy, proof, safety, approval or formulation suitability.')
 ON CONFLICT(resource_discovery_run_id) DO UPDATE SET priority_band=excluded.priority_band,investigation_priority_score=excluded.investigation_priority_score,environmental_opportunity_band=excluded.environmental_opportunity_band,scientific_opportunity_band=excluded.scientific_opportunity_band,evidence_readiness_band=excluded.evidence_readiness_band,safety_attention_band=excluded.safety_attention_band,rationale=excluded.rationale,generated_at=now() RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_promote_discovery_to_ingredient(p_discovery_candidate_id uuid, p_ingredient_code text, p_ingredient_name text, p_material_class text, p_promotion_rationale text, p_governance_decision_id uuid, p_actor_id uuid, p_preparation_class text DEFAULT NULL::text, p_data_class text DEFAULT 'AI_GENERATED'::text)
 RETURNS agriculture.ingredient
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE dc agriculture.discovery_candidate; ing agriculture.ingredient; ds text; ep_status text; ep_complete text; promo_code text;
BEGIN
 IF p_actor_id IS NULL OR nullif(btrim(p_promotion_rationale),'') IS NULL THEN RAISE EXCEPTION 'DISCOVERY_PROMOTION_REQUIRES_ACTOR_AND_RATIONALE' USING ERRCODE='23514'; END IF;
 SELECT * INTO dc FROM agriculture.discovery_candidate WHERE discovery_candidate_id=p_discovery_candidate_id FOR UPDATE;
 IF dc.discovery_candidate_id IS NULL THEN RAISE EXCEPTION 'DISCOVERY_CANDIDATE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF dc.lifecycle_status<>'INVESTIGATION_READY' OR dc.canonical_ingredient_id IS NOT NULL THEN RAISE EXCEPTION 'DISCOVERY_NOT_ELIGIBLE_FOR_INGREDIENT_PROMOTION' USING ERRCODE='55000'; END IF;
 IF dc.governance_decision_id IS DISTINCT FROM p_governance_decision_id THEN RAISE EXCEPTION 'PROMOTION_DECISION_MUST_MATCH_DISCOVERY_REVIEW_DECISION' USING ERRCODE='23514'; END IF;
 SELECT decision_status INTO ds FROM agriculture.governance_decision WHERE decision_id=p_governance_decision_id;
 IF ds<>'APPROVED' THEN RAISE EXCEPTION 'DISCOVERY_PROMOTION_REQUIRES_APPROVED_GOVERNANCE_DECISION' USING ERRCODE='23514'; END IF;
 IF dc.evidence_packet_id IS NULL THEN RAISE EXCEPTION 'DISCOVERY_PROMOTION_REQUIRES_EVIDENCE_PACKET' USING ERRCODE='23514'; END IF;
 SELECT packet_status,completeness_status INTO ep_status,ep_complete FROM agriculture.evidence_packet WHERE evidence_packet_id=dc.evidence_packet_id;
 IF ep_status<>'FINAL' OR ep_complete<>'COMPLETE' THEN RAISE EXCEPTION 'DISCOVERY_PROMOTION_REQUIRES_FINAL_COMPLETE_EVIDENCE' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.ingredient(ingredient_code,ingredient_name,lifecycle_status,material_class,preparation_class,data_class,country_code,current_version_no,created_by)
 VALUES(upper(btrim(p_ingredient_code)),btrim(p_ingredient_name),'DRAFT',btrim(p_material_class),p_preparation_class,p_data_class,dc.country_code,1,p_actor_id) RETURNING * INTO ing;
 UPDATE agriculture.discovery_candidate SET lifecycle_status='APPROVED_RESEARCH_INGREDIENT',canonical_ingredient_id=ing.ingredient_id,updated_by=p_actor_id,updated_at=now() WHERE discovery_candidate_id=dc.discovery_candidate_id;
 promo_code:='PROMO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
 INSERT INTO agriculture.discovery_promotion_event(promotion_code,discovery_candidate_id,promoted_entity_type,promoted_entity_id,governance_decision_id,evidence_packet_id,promotion_rationale,promoted_by)
 VALUES(promo_code,dc.discovery_candidate_id,'INGREDIENT',ing.ingredient_id,p_governance_decision_id,dc.evidence_packet_id,btrim(p_promotion_rationale),p_actor_id);
 RETURN ing;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_quarantine_record(p_subject_entity_type text, p_subject_entity_id uuid, p_quarantine_reason text, p_input_submission_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.quarantined_record
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.quarantined_record;
BEGIN
 IF nullif(btrim(p_quarantine_reason),'') IS NULL THEN RAISE EXCEPTION 'QUARANTINE_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM agriculture.quarantined_record WHERE subject_entity_type=upper(btrim(p_subject_entity_type)) AND subject_entity_id=p_subject_entity_id AND quarantine_status='QUARANTINED') THEN RAISE EXCEPTION 'ENTITY_ALREADY_QUARANTINED' USING ERRCODE='23505'; END IF;
 INSERT INTO agriculture.quarantined_record(subject_entity_type,subject_entity_id,input_submission_id,quarantine_reason,quarantine_status,quarantined_by)
 VALUES(upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_input_submission_id,btrim(p_quarantine_reason),'QUARANTINED',p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_raise_data_quality_flag(p_subject_entity_type text, p_subject_entity_id uuid, p_flag_type text, p_severity text, p_flag_summary text, p_flag_context jsonb DEFAULT '{}'::jsonb, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.data_quality_flag
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.data_quality_flag;
BEGIN
 INSERT INTO agriculture.data_quality_flag(subject_entity_type,subject_entity_id,flag_type,severity,flag_status,flag_summary,flag_context,raised_by)
 VALUES(upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_flag_type,p_severity,'OPEN',btrim(p_flag_summary),COALESCE(p_flag_context,'{}'::jsonb),p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_audit_event(p_event_type text, p_event_category text, p_event_summary text, p_actor_id uuid DEFAULT NULL::uuid, p_request_context_id uuid DEFAULT NULL::uuid, p_operation_run_id uuid DEFAULT NULL::uuid, p_subject_entity_type text DEFAULT NULL::text, p_subject_entity_id uuid DEFAULT NULL::uuid, p_governance_decision_id uuid DEFAULT NULL::uuid, p_event_context jsonb DEFAULT '{}'::jsonb)
 RETURNS agriculture.audit_event
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.audit_event; prev_hash text; code text; canonical text; h text;
BEGIN
 IF nullif(btrim(p_event_summary),'') IS NULL THEN RAISE EXCEPTION 'AUDIT_EVENT_SUMMARY_REQUIRED' USING ERRCODE='23514'; END IF;
 SELECT event_hash INTO prev_hash FROM agriculture.audit_event ORDER BY occurred_at DESC,audit_event_id DESC LIMIT 1;
 code:='AUD-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
 canonical:=concat_ws('|',code,upper(btrim(p_event_type)),upper(btrim(p_event_category)),coalesce(p_actor_id::text,''),coalesce(p_request_context_id::text,''),coalesce(p_operation_run_id::text,''),coalesce(upper(btrim(p_subject_entity_type)),''),coalesce(p_subject_entity_id::text,''),coalesce(p_governance_decision_id::text,''),btrim(p_event_summary),coalesce(p_event_context,'{}'::jsonb)::text,coalesce(prev_hash,''));
 h:=encode(extensions.digest(canonical,'sha256'),'hex');
 INSERT INTO agriculture.audit_event(event_code,event_type,event_category,actor_id,request_context_id,operation_run_id,subject_entity_type,subject_entity_id,governance_decision_id,event_summary,event_context,previous_event_hash,event_hash)
 VALUES(code,upper(btrim(p_event_type)),upper(btrim(p_event_category)),p_actor_id,p_request_context_id,p_operation_run_id,CASE WHEN p_subject_entity_type IS NULL THEN NULL ELSE upper(btrim(p_subject_entity_type)) END,p_subject_entity_id,p_governance_decision_id,btrim(p_event_summary),coalesce(p_event_context,'{}'::jsonb),prev_hash,h) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_environmental_burden(p_resource_waste_stream_id uuid, p_environmental_burden_summary text, p_actor_id uuid, p_air_pollution_burden text DEFAULT 'UNASSESSED'::text, p_water_pollution_burden text DEFAULT 'UNASSESSED'::text, p_soil_pollution_burden text DEFAULT 'UNASSESSED'::text, p_burning_pressure text DEFAULT 'UNASSESSED'::text, p_landfill_pressure text DEFAULT 'UNASSESSED'::text, p_dumping_pressure text DEFAULT 'UNASSESSED'::text, p_evidence_strength text DEFAULT 'UNASSESSED'::text, p_evidence_packet_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.environmental_burden_profile
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.environmental_burden_profile; cc char(2);
BEGIN SELECT country_code INTO cc FROM agriculture.resource_waste_stream WHERE resource_waste_stream_id=p_resource_waste_stream_id AND recovery_status<>'ARCHIVED'; IF NOT FOUND THEN RAISE EXCEPTION 'RESOURCE_WASTE_STREAM_NOT_FOUND' USING ERRCODE='P0002'; END IF; PERFORM agriculture.api_require_capability(p_actor_id,'create_draft',cc);
 INSERT INTO agriculture.environmental_burden_profile(resource_waste_stream_id,air_pollution_burden,water_pollution_burden,soil_pollution_burden,burning_pressure,landfill_pressure,dumping_pressure,environmental_burden_summary,evidence_strength,evidence_packet_id,assessed_by)
 VALUES(p_resource_waste_stream_id,p_air_pollution_burden,p_water_pollution_burden,p_soil_pollution_burden,p_burning_pressure,p_landfill_pressure,p_dumping_pressure,btrim(p_environmental_burden_summary),p_evidence_strength,p_evidence_packet_id,p_actor_id)
 ON CONFLICT(resource_waste_stream_id) DO UPDATE SET air_pollution_burden=excluded.air_pollution_burden,water_pollution_burden=excluded.water_pollution_burden,soil_pollution_burden=excluded.soil_pollution_burden,burning_pressure=excluded.burning_pressure,landfill_pressure=excluded.landfill_pressure,dumping_pressure=excluded.dumping_pressure,environmental_burden_summary=excluded.environmental_burden_summary,evidence_strength=excluded.evidence_strength,evidence_packet_id=excluded.evidence_packet_id,assessed_by=excluded.assessed_by,assessed_at=now() RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_input_validation(p_input_submission_id uuid, p_validation_type text, p_validation_result text, p_rule_code text, p_validation_summary text, p_validation_detail jsonb DEFAULT '{}'::jsonb, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.input_validation_event
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.input_validation_event; BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.input_submission WHERE input_submission_id=p_input_submission_id AND submission_status IN ('RECEIVED','VALIDATING','VALID','VALID_WITH_WARNINGS','QUARANTINED')) THEN RAISE EXCEPTION 'INPUT_SUBMISSION_NOT_VALIDATABLE' USING ERRCODE='55000'; END IF;
 INSERT INTO agriculture.input_validation_event(input_submission_id,validation_type,validation_result,rule_code,validation_summary,validation_detail,validated_by) VALUES(p_input_submission_id,upper(btrim(p_validation_type)),p_validation_result,upper(btrim(p_rule_code)),btrim(p_validation_summary),coalesce(p_validation_detail,'{}'::jsonb),p_actor_id) RETURNING * INTO r;
 UPDATE agriculture.input_submission SET submission_status=CASE WHEN p_validation_result='FAIL' THEN 'QUARANTINED' WHEN p_validation_result='WARNING' AND submission_status<>'QUARANTINED' THEN 'VALID_WITH_WARNINGS' WHEN p_validation_result='PASS' AND submission_status IN ('RECEIVED','VALIDATING') THEN 'VALID' ELSE submission_status END,validation_completed_at=CASE WHEN p_validation_result IN ('PASS','WARNING','FAIL') THEN now() ELSE validation_completed_at END WHERE input_submission_id=p_input_submission_id;
 RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_input_validation_result(p_input_validation_run_id uuid, p_validation_rule_id uuid, p_result_status text, p_result_reason text, p_field_path text DEFAULT NULL::text, p_submitted_value jsonb DEFAULT NULL::jsonb, p_normalised_value jsonb DEFAULT NULL::jsonb, p_expected_value jsonb DEFAULT NULL::jsonb, p_corrective_guidance text DEFAULT NULL::text, p_requires_review boolean DEFAULT false)
 RETURNS agriculture.input_validation_result
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.input_validation_result;
BEGIN
 IF p_result_status NOT IN ('PASS','WARNING','FAIL','QUARANTINE') THEN RAISE EXCEPTION 'INVALID_VALIDATION_RESULT_STATUS' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.input_validation_run WHERE input_validation_run_id=p_input_validation_run_id AND run_status='RUNNING') THEN RAISE EXCEPTION 'VALIDATION_RUN_NOT_RUNNING' USING ERRCODE='55000'; END IF;
 INSERT INTO agriculture.input_validation_result(input_validation_run_id,validation_rule_id,field_path,result_status,submitted_value,normalised_value,expected_value,result_reason,corrective_guidance,requires_review)
 VALUES(p_input_validation_run_id,p_validation_rule_id,p_field_path,p_result_status,p_submitted_value,p_normalised_value,p_expected_value,btrim(p_result_reason),p_corrective_guidance,p_requires_review) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_integration_checkpoint(p_operation_run_id uuid, p_checkpoint_code text, p_checkpoint_order integer, p_checkpoint_status text, p_checkpoint_summary text DEFAULT NULL::text, p_checkpoint_evidence jsonb DEFAULT '{}'::jsonb)
 RETURNS agriculture.integration_checkpoint
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.integration_checkpoint;
BEGIN
 INSERT INTO agriculture.integration_checkpoint(operation_run_id,checkpoint_code,checkpoint_order,checkpoint_status,checkpoint_summary,started_at,completed_at,checkpoint_evidence)
 VALUES(p_operation_run_id,upper(btrim(p_checkpoint_code)),p_checkpoint_order,p_checkpoint_status,p_checkpoint_summary,now(),CASE WHEN p_checkpoint_status IN ('PASS','FAIL','WARNING','SKIPPED') THEN now() ELSE NULL END,COALESCE(p_checkpoint_evidence,'{}'::jsonb)) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_measurement(p_observation_id uuid, p_metric_definition_id uuid, p_numeric_value numeric DEFAULT NULL::numeric, p_text_value text DEFAULT NULL::text, p_boolean_value boolean DEFAULT NULL::boolean, p_json_value jsonb DEFAULT NULL::jsonb, p_unit text DEFAULT NULL::text, p_measurement_method_id uuid DEFAULT NULL::uuid, p_instrument_id uuid DEFAULT NULL::uuid, p_input_submission_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.measurement
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.measurement; vt text; minv numeric; maxv numeric; canonical text; vals integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.observation WHERE observation_id=p_observation_id AND observation_status='DRAFT') THEN RAISE EXCEPTION 'MEASUREMENT_REQUIRES_DRAFT_OBSERVATION' USING ERRCODE='55000'; END IF;
 SELECT value_type,minimum_plausible_value,maximum_plausible_value,canonical_unit INTO vt,minv,maxv,canonical FROM agriculture.metric_definition WHERE metric_definition_id=p_metric_definition_id AND lifecycle_status='ACTIVE';
 IF vt IS NULL THEN RAISE EXCEPTION 'ACTIVE_METRIC_DEFINITION_REQUIRED' USING ERRCODE='23514'; END IF;
 vals:=(p_numeric_value IS NOT NULL)::int+(p_text_value IS NOT NULL)::int+(p_boolean_value IS NOT NULL)::int+(p_json_value IS NOT NULL)::int;
 IF vals<>1 THEN RAISE EXCEPTION 'MEASUREMENT_REQUIRES_EXACTLY_ONE_VALUE' USING ERRCODE='23514'; END IF;
 IF vt='NUMERIC' AND p_numeric_value IS NULL THEN RAISE EXCEPTION 'NUMERIC_METRIC_REQUIRES_NUMERIC_VALUE' USING ERRCODE='23514'; END IF;
 IF vt='TEXT' AND p_text_value IS NULL THEN RAISE EXCEPTION 'TEXT_METRIC_REQUIRES_TEXT_VALUE' USING ERRCODE='23514'; END IF;
 IF vt='BOOLEAN' AND p_boolean_value IS NULL THEN RAISE EXCEPTION 'BOOLEAN_METRIC_REQUIRES_BOOLEAN_VALUE' USING ERRCODE='23514'; END IF;
 IF vt='JSON' AND p_json_value IS NULL THEN RAISE EXCEPTION 'JSON_METRIC_REQUIRES_JSON_VALUE' USING ERRCODE='23514'; END IF;
 IF p_numeric_value IS NOT NULL AND ((minv IS NOT NULL AND p_numeric_value<minv) OR (maxv IS NOT NULL AND p_numeric_value>maxv)) THEN RAISE EXCEPTION 'MEASUREMENT_OUTSIDE_PLAUSIBLE_RANGE' USING ERRCODE='23514'; END IF;
 IF canonical IS NOT NULL AND p_unit IS DISTINCT FROM canonical THEN RAISE EXCEPTION 'MEASUREMENT_UNIT_MUST_MATCH_CANONICAL_UNIT' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.measurement(observation_id,metric_definition_id,measurement_method_id,instrument_id,numeric_value,text_value,boolean_value,json_value,unit,measurement_status,input_submission_id)
 VALUES(p_observation_id,p_metric_definition_id,p_measurement_method_id,p_instrument_id,p_numeric_value,p_text_value,p_boolean_value,p_json_value,p_unit,'SUBMITTED',p_input_submission_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_operation_failure(p_failure_code text, p_failure_category text, p_severity text, p_safe_message text, p_operation_run_id uuid DEFAULT NULL::uuid, p_request_context_id uuid DEFAULT NULL::uuid, p_entity_type text DEFAULT NULL::text, p_entity_id uuid DEFAULT NULL::uuid, p_retryable boolean DEFAULT false, p_failure_context jsonb DEFAULT '{}'::jsonb)
 RETURNS agriculture.operation_failure_event
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.operation_failure_event;
BEGIN
 INSERT INTO agriculture.operation_failure_event(operation_run_id,request_context_id,failure_code,failure_category,severity,safe_message,entity_type,entity_id,retryable,failure_context)
 VALUES(p_operation_run_id,p_request_context_id,upper(btrim(p_failure_code)),p_failure_category,p_severity,btrim(p_safe_message),p_entity_type,p_entity_id,p_retryable,COALESCE(p_failure_context,'{}'::jsonb)) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_outcome(p_outcome_code text, p_trial_id uuid, p_outcome_type text, p_outcome_summary text, p_plot_id uuid DEFAULT NULL::uuid, p_outcome_payload jsonb DEFAULT '{}'::jsonb, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.outcome
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare r agriculture.outcome; cw uuid; has_country boolean;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  if nullif(btrim(p_outcome_summary),'') is null then raise exception 'OUTCOME_SUMMARY_REQUIRED' using errcode='23514'; end if;
  select country_workspace_id into cw from agriculture.trial where trial_id=p_trial_id and lifecycle_status in ('ACTIVE','COMPLETED');
  if not found then raise exception 'ACTIVE_TRIAL_NOT_FOUND' using errcode='P0002'; end if;
  select exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and membership_status='ACTIVE') into has_country;
  if cw is not null and not exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and country_workspace_id=cw and membership_status='ACTIVE') then raise exception 'TRIAL_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  if p_plot_id is not null and not exists(select 1 from agriculture.plot where plot_id=p_plot_id and trial_id=p_trial_id and lifecycle_status<>'ARCHIVED') then raise exception 'OUTCOME_PLOT_DOES_NOT_BELONG_TO_TRIAL' using errcode='23514'; end if;
  if not exists(select 1 from agriculture.observation where trial_id=p_trial_id and (p_plot_id is null or plot_id=p_plot_id) and observation_status='REVIEWED') then raise exception 'OUTCOME_REQUIRES_AT_LEAST_ONE_REVIEWED_OBSERVATION' using errcode='23514'; end if;
  insert into agriculture.outcome(outcome_code,trial_id,plot_id,outcome_type,outcome_status,outcome_summary,outcome_payload,evidence_packet_id,created_by,country_workspace_id)
  values(upper(btrim(p_outcome_code)),p_trial_id,p_plot_id,p_outcome_type,'DRAFT',btrim(p_outcome_summary),coalesce(p_outcome_payload,'{}'::jsonb),p_evidence_packet_id,p_actor_id,cw) returning * into r;
  update agriculture.trial set outcome_status='PARTIAL',updated_by=p_actor_id,updated_at=now() where trial_id=p_trial_id and outcome_status='NOT_RECORDED';
  return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_photo_analysis(p_photo_evidence_id uuid, p_analysis_type text, p_analyzer_type text, p_observation_summary text, p_detected_features jsonb DEFAULT '{}'::jsonb, p_anomaly_flags jsonb DEFAULT '[]'::jsonb, p_confidence_status text DEFAULT 'UNASSESSED'::text, p_analyzer_reference text DEFAULT NULL::text)
 RETURNS agriculture.photo_analysis
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.photo_analysis; BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.photo_evidence WHERE photo_evidence_id=p_photo_evidence_id AND review_status<>'REJECTED') THEN RAISE EXCEPTION 'USABLE_PHOTO_EVIDENCE_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.photo_analysis(photo_evidence_id,analysis_type,analyzer_type,analyzer_reference,analysis_status,observation_summary,detected_features,anomaly_flags,confidence_status,requires_human_review) VALUES(p_photo_evidence_id,p_analysis_type,p_analyzer_type,p_analyzer_reference,'COMPLETED',btrim(p_observation_summary),coalesce(p_detected_features,'{}'::jsonb),coalesce(p_anomaly_flags,'[]'::jsonb),p_confidence_status,true) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_photo_validation(p_photo_evidence_id uuid, p_validation_type text, p_validation_status text, p_validation_summary text, p_validation_context jsonb DEFAULT '{}'::jsonb, p_requires_review boolean DEFAULT false)
 RETURNS agriculture.photo_validation_result
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.photo_validation_result;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.photo_evidence WHERE photo_evidence_id=p_photo_evidence_id) THEN RAISE EXCEPTION 'PHOTO_EVIDENCE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 INSERT INTO agriculture.photo_validation_result(photo_evidence_id,validation_type,validation_status,validation_summary,validation_context,requires_review)
 VALUES(p_photo_evidence_id,p_validation_type,p_validation_status,btrim(p_validation_summary),COALESCE(p_validation_context,'{}'::jsonb),p_requires_review) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_record_reasoning_finding(p_reasoning_run_id uuid, p_finding_type text, p_finding_summary text, p_finding_detail jsonb DEFAULT '{}'::jsonb, p_confidence_status text DEFAULT 'UNASSESSED'::text, p_evidence_packet_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.reasoning_finding
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.reasoning_finding; BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.reasoning_run WHERE reasoning_run_id=p_reasoning_run_id AND run_status='RUNNING') THEN RAISE EXCEPTION 'REASONING_RUN_NOT_RUNNING' USING ERRCODE='55000'; END IF;
 INSERT INTO agriculture.reasoning_finding(reasoning_run_id,finding_type,finding_summary,finding_detail,confidence_status,evidence_packet_id) VALUES(p_reasoning_run_id,p_finding_type,btrim(p_finding_summary),COALESCE(p_finding_detail,'{}'::jsonb),p_confidence_status,p_evidence_packet_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_register_evidence_source(p_source_type text, p_title text, p_citation text DEFAULT NULL::text, p_source_url text DEFAULT NULL::text, p_publication_date date DEFAULT NULL::date, p_jurisdiction text DEFAULT NULL::text, p_source_hash text DEFAULT NULL::text)
 RETURNS agriculture.evidence_source
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.evidence_source;
BEGIN
 IF nullif(btrim(p_title),'') IS NULL THEN RAISE EXCEPTION 'EVIDENCE_SOURCE_TITLE_REQUIRED' USING ERRCODE='23514'; END IF;
 IF p_source_url IS NULL AND p_citation IS NULL AND p_source_hash IS NULL THEN RAISE EXCEPTION 'EVIDENCE_SOURCE_REQUIRES_CITATION_URL_OR_HASH' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.evidence_source(source_type,title,citation,source_url,publication_date,jurisdiction,source_hash)
 VALUES(p_source_type,btrim(p_title),p_citation,p_source_url,p_publication_date,p_jurisdiction,p_source_hash) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_register_negative_learning(p_approved_learning_id uuid, p_suppression_scope jsonb, p_warning_text text, p_downstream_action text, p_governance_decision_id uuid, p_actor_id uuid)
 RETURNS agriculture.negative_learning_register
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.negative_learning_register; ds text; BEGIN SELECT decision_status INTO ds FROM agriculture.governance_decision WHERE decision_id=p_governance_decision_id; IF ds<>'APPROVED' OR p_actor_id IS NULL OR nullif(btrim(p_warning_text),'') IS NULL THEN RAISE EXCEPTION 'NEGATIVE_LEARNING_REQUIRES_APPROVED_GOVERNANCE_ACTOR_WARNING' USING ERRCODE='23514'; END IF; IF NOT EXISTS(SELECT 1 FROM agriculture.approved_learning WHERE approved_learning_id=p_approved_learning_id AND lifecycle_status='ACTIVE') THEN RAISE EXCEPTION 'ACTIVE_APPROVED_LEARNING_REQUIRED' USING ERRCODE='23514'; END IF; INSERT INTO agriculture.negative_learning_register(approved_learning_id,suppression_scope,warning_text,downstream_action,lifecycle_status,governance_decision_id,created_by) VALUES(p_approved_learning_id,coalesce(p_suppression_scope,'{}'::jsonb),btrim(p_warning_text),p_downstream_action,'ACTIVE',p_governance_decision_id,p_actor_id) RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_register_photo_evidence(p_photo_code text, p_subject_entity_type text, p_subject_entity_id uuid, p_photo_type text, p_storage_provider text, p_storage_object_key text, p_media_type text, p_file_size_bytes bigint, p_image_hash_sha256 text, p_input_submission_id uuid DEFAULT NULL::uuid, p_original_filename text DEFAULT NULL::text, p_width_pixels integer DEFAULT NULL::integer, p_height_pixels integer DEFAULT NULL::integer, p_perceptual_hash text DEFAULT NULL::text, p_captured_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_actor_id uuid DEFAULT NULL::uuid, p_capture_device text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_altitude_metres numeric DEFAULT NULL::numeric, p_camera_direction_degrees numeric DEFAULT NULL::numeric, p_scale_reference_present boolean DEFAULT false)
 RETURNS agriculture.photo_evidence
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.photo_evidence;
BEGIN
 IF nullif(btrim(p_storage_object_key),'') IS NULL OR nullif(btrim(p_image_hash_sha256),'') IS NULL THEN RAISE EXCEPTION 'PHOTO_STORAGE_KEY_AND_SHA256_REQUIRED' USING ERRCODE='23514'; END IF;
 IF p_file_size_bytes<=0 THEN RAISE EXCEPTION 'PHOTO_FILE_SIZE_INVALID' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.photo_evidence(photo_evidence_code,subject_entity_type,subject_entity_id,input_submission_id,photo_type,storage_provider,storage_object_key,original_filename,media_type,file_size_bytes,width_pixels,height_pixels,image_hash_sha256,perceptual_hash,captured_at,captured_by,upload_actor_id,capture_device,latitude,longitude,altitude_metres,camera_direction_degrees,scale_reference_present,image_quality_status,context_validation_status,review_status,consent_usage_status)
 VALUES(upper(btrim(p_photo_code)),upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_input_submission_id,p_photo_type,p_storage_provider,p_storage_object_key,p_original_filename,p_media_type,p_file_size_bytes,p_width_pixels,p_height_pixels,lower(btrim(p_image_hash_sha256)),p_perceptual_hash,p_captured_at,p_actor_id,p_actor_id,p_capture_device,p_latitude,p_longitude,p_altitude_metres,p_camera_direction_degrees,p_scale_reference_present,'UNASSESSED','NOT_VALIDATED','PENDING','PENDING') RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_register_photo_evidence(p_subject_entity_type text, p_subject_entity_id uuid, p_photo_type text, p_storage_provider text, p_storage_object_key text, p_media_type text, p_file_size_bytes bigint, p_image_hash_sha256 text, p_actor_id uuid, p_original_filename text DEFAULT NULL::text, p_width_pixels integer DEFAULT NULL::integer, p_height_pixels integer DEFAULT NULL::integer, p_perceptual_hash text DEFAULT NULL::text, p_captured_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_capture_device text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_scale_reference_present boolean DEFAULT false, p_input_submission_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.photo_evidence
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.photo_evidence; code text; BEGIN
 IF p_actor_id IS NULL OR p_file_size_bytes<=0 OR nullif(btrim(p_image_hash_sha256),'') IS NULL THEN RAISE EXCEPTION 'PHOTO_REGISTRATION_REQUIRES_ACTOR_VALID_SIZE_AND_HASH' USING ERRCODE='23514'; END IF;
 IF p_media_type NOT IN ('image/jpeg','image/png','image/webp','image/heic','image/heif') THEN RAISE EXCEPTION 'UNSUPPORTED_PHOTO_MEDIA_TYPE' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM agriculture.photo_evidence WHERE image_hash_sha256=lower(btrim(p_image_hash_sha256))) THEN RAISE EXCEPTION 'DUPLICATE_PHOTO_HASH' USING ERRCODE='23505'; END IF;
 code:='PHOTO-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
 INSERT INTO agriculture.photo_evidence(photo_evidence_code,subject_entity_type,subject_entity_id,input_submission_id,photo_type,storage_provider,storage_object_key,original_filename,media_type,file_size_bytes,width_pixels,height_pixels,image_hash_sha256,perceptual_hash,captured_at,captured_by,upload_actor_id,capture_device,latitude,longitude,scale_reference_present,image_quality_status,context_validation_status,review_status,consent_usage_status)
 VALUES(code,upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_input_submission_id,p_photo_type,p_storage_provider,p_storage_object_key,p_original_filename,p_media_type,p_file_size_bytes,p_width_pixels,p_height_pixels,lower(btrim(p_image_hash_sha256)),p_perceptual_hash,p_captured_at,p_actor_id,p_actor_id,p_capture_device,p_latitude,p_longitude,coalesce(p_scale_reference_present,false),'UNASSESSED','NOT_VALIDATED','PENDING','PENDING') RETURNING * INTO r; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_reject_or_quarantine_input(p_input_submission_id uuid, p_action text, p_reason text, p_actor_id uuid)
 RETURNS agriculture.input_submission
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.input_submission; BEGIN
 IF p_action NOT IN ('QUARANTINED','REJECTED') OR p_actor_id IS NULL OR nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'INVALID_INPUT_DISPOSITION' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.input_submission SET submission_status=p_action,rejection_reason=CASE WHEN p_action='REJECTED' THEN btrim(p_reason) ELSE rejection_reason END,validation_completed_at=now() WHERE input_submission_id=p_input_submission_id AND submission_status NOT IN ('ACCEPTED','REJECTED','SUPERSEDED') RETURNING * INTO r; IF r.input_submission_id IS NULL THEN RAISE EXCEPTION 'INPUT_NOT_DISPOSABLE' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_release_quarantined_record(p_quarantined_record_id uuid, p_release_decision_id uuid, p_release_reason text, p_actor_id uuid)
 RETURNS agriculture.quarantined_record
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.quarantined_record; ds text;
BEGIN
 SELECT decision_status INTO ds FROM agriculture.governance_decision WHERE decision_id=p_release_decision_id;
 IF ds<>'APPROVED' THEN RAISE EXCEPTION 'QUARANTINE_RELEASE_REQUIRES_APPROVED_GOVERNANCE_DECISION' USING ERRCODE='23514'; END IF;
 IF p_actor_id IS NULL OR nullif(btrim(p_release_reason),'') IS NULL THEN RAISE EXCEPTION 'QUARANTINE_RELEASE_REQUIRES_ACTOR_AND_REASON' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.quarantined_record SET quarantine_status='RELEASED',release_decision_id=p_release_decision_id,released_by=p_actor_id,released_at=now(),release_reason=btrim(p_release_reason) WHERE quarantined_record_id=p_quarantined_record_id AND quarantine_status='QUARANTINED' RETURNING * INTO r;
 IF r.quarantined_record_id IS NULL THEN RAISE EXCEPTION 'QUARANTINE_RECORD_NOT_FOUND_OR_NOT_ACTIVE' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_require_capability(p_actor_id uuid, p_capability text, p_country_code character DEFAULT NULL::bpchar)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
BEGIN
 IF NOT agriculture.api_actor_has_capability(p_actor_id,p_capability,p_country_code) THEN
   RAISE EXCEPTION 'AGRICULTURE_CAPABILITY_DENIED: %',upper(btrim(p_capability)) USING ERRCODE='42501';
 END IF;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_resolve_authenticated_actor(p_email text, p_local_role text, p_display_name text DEFAULT NULL::text)
 RETURNS TABLE(actor_id uuid, actor_type text, access_profile_code text, authority_role_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
 v_email text:=lower(btrim(p_email));
 v_role text:=lower(btrim(coalesce(p_local_role,'user')));
 v_external text;
 v_actor_type text;
 v_profile text;
 v_authority text;
 v_actor uuid;
begin
 if v_email='' or position('@' in v_email)<2 then
   raise exception 'VALID_AUTHENTICATED_EMAIL_REQUIRED' using errcode='23514';
 end if;

 v_external:='aab-auth:'||v_email;
 v_actor_type:=case
   when v_role in ('admin','administrator') then 'ADMIN'
   when v_role in ('scientist','researcher') then 'SCIENTIST'
   else 'USER'
 end;
 v_profile:=case
   when v_role='community' then 'AGRICULTURE_RUNTIME_COMMUNITY'
   when v_actor_type='ADMIN' then 'AGRICULTURE_RUNTIME_ADMIN'
   when v_actor_type='SCIENTIST' then 'AGRICULTURE_RUNTIME_SCIENTIST'
   else 'AGRICULTURE_RUNTIME_USER'
 end;
 v_authority:=case
   when v_actor_type='ADMIN' then 'AGRICULTURE_ADMIN'
   when v_actor_type='SCIENTIST' then 'AGRICULTURE_SCIENTIST'
   else null
 end;

 insert into agriculture.actor(external_subject,display_name,actor_type,active)
 values(v_external,coalesce(nullif(btrim(p_display_name),''),v_email),v_actor_type,true)
 on conflict(external_subject) do update set
   display_name=excluded.display_name,
   actor_type=excluded.actor_type,
   active=true
 returning agriculture.actor.actor_id into v_actor;

 update agriculture.actor_access_assignment aaa
 set active=false,
     revoked_at=coalesce(aaa.revoked_at,now())
 where aaa.actor_id=v_actor
   and aaa.authority_scope='AGRICULTURE'
   and aaa.active
   and aaa.access_profile_code<>v_profile;

 if not exists(
   select 1
   from agriculture.actor_access_assignment aaa
   where aaa.actor_id=v_actor
     and aaa.access_profile_code=v_profile
     and aaa.authority_scope='AGRICULTURE'
     and aaa.active
 ) then
   insert into agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,country_code,granted_by,grant_reason,active)
   values(v_actor,v_profile,'AGRICULTURE',null,null,'Provisioned from authenticated AAB application role: '||v_role,true);
 end if;

 if v_authority is not null and not exists(
   select 1
   from agriculture.actor_authority aa
   where aa.actor_id=v_actor
     and aa.role_code=v_authority
     and aa.authority_scope='AGRICULTURE'
     and aa.active
 ) then
   insert into agriculture.actor_authority(actor_id,role_code,country_code,authority_scope,granted_by,grant_rationale,active)
   values(v_actor,v_authority,null,'AGRICULTURE',null,'Provisioned from authenticated AAB application role: '||v_role,true);
 end if;

 return query select v_actor,v_actor_type,v_profile,v_authority;
end;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_resolve_contradiction(p_contradiction_record_id uuid, p_resolution_status text, p_resolution_summary text, p_actor_id uuid)
 RETURNS agriculture.contradiction_record
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.contradiction_record; BEGIN
 IF p_resolution_status NOT IN ('RESOLVED','UNRESOLVED_ACCEPTED') OR p_actor_id IS NULL OR nullif(btrim(p_resolution_summary),'') IS NULL THEN RAISE EXCEPTION 'INVALID_CONTRADICTION_RESOLUTION' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.contradiction_record SET lifecycle_status=p_resolution_status,resolution_summary=btrim(p_resolution_summary),resolved_by=p_actor_id,resolved_at=now() WHERE contradiction_record_id=p_contradiction_record_id AND lifecycle_status IN ('OPEN','UNDER_REVIEW') RETURNING * INTO r;
 IF r.contradiction_record_id IS NULL THEN RAISE EXCEPTION 'CONTRADICTION_NOT_RESOLVABLE' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_resolve_data_quality_flag(p_data_quality_flag_id uuid, p_resolution_reason text, p_actor_id uuid)
 RETURNS agriculture.data_quality_flag
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.data_quality_flag;
BEGIN
 IF p_actor_id IS NULL OR nullif(btrim(p_resolution_reason),'') IS NULL THEN RAISE EXCEPTION 'FLAG_RESOLUTION_REQUIRES_ACTOR_AND_REASON' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.data_quality_flag SET flag_status='RESOLVED',resolved_by=p_actor_id,resolved_at=now(),resolution_reason=btrim(p_resolution_reason) WHERE data_quality_flag_id=p_data_quality_flag_id AND flag_status='OPEN' RETURNING * INTO r;
 IF r.data_quality_flag_id IS NULL THEN RAISE EXCEPTION 'DATA_QUALITY_FLAG_NOT_FOUND_OR_NOT_OPEN' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_resolve_knowledge_gap(p_knowledge_gap_id uuid, p_resolution_status text, p_resolution_summary text, p_evidence_packet_id uuid, p_actor_id uuid)
 RETURNS agriculture.knowledge_gap
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.knowledge_gap;
BEGIN
 IF p_resolution_status NOT IN ('RESOLVED','ACCEPTED_UNCERTAINTY') OR p_actor_id IS NULL OR nullif(btrim(p_resolution_summary),'') IS NULL THEN RAISE EXCEPTION 'INVALID_KNOWLEDGE_GAP_RESOLUTION' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.evidence_packet WHERE evidence_packet_id=p_evidence_packet_id AND packet_status IN ('COMPLETE','APPROVED') AND completeness_status='COMPLETE') THEN RAISE EXCEPTION 'KNOWLEDGE_GAP_RESOLUTION_REQUIRES_COMPLETE_EVIDENCE' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.knowledge_gap SET lifecycle_status=p_resolution_status,resolution_summary=btrim(p_resolution_summary),evidence_packet_id=p_evidence_packet_id,resolved_by=p_actor_id,resolved_at=now() WHERE knowledge_gap_id=p_knowledge_gap_id AND lifecycle_status IN ('OPEN','UNDER_INVESTIGATION') RETURNING * INTO r;
 IF r.knowledge_gap_id IS NULL THEN RAISE EXCEPTION 'KNOWLEDGE_GAP_NOT_RESOLVABLE' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_retire_ingredient(p_ingredient_id uuid, p_reason text)
 RETURNS agriculture.ingredient
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient;
BEGIN
 IF nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'RETIRE_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INGREDIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF r.lifecycle_status='RETIRED' THEN RETURN r; END IF;
 UPDATE agriculture.ingredient SET lifecycle_status='RETIRED',data_class='ARCHIVED',retired_at=now(),updated_at=now() WHERE ingredient_id=p_ingredient_id RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_review_discovery_candidate(p_discovery_candidate_id uuid, p_review_result text, p_governance_decision_id uuid, p_review_rationale text, p_actor_id uuid)
 RETURNS agriculture.discovery_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.discovery_candidate; ds text;
BEGIN
 IF p_review_result NOT IN ('REVIEWED','REJECTED') THEN RAISE EXCEPTION 'INVALID_DISCOVERY_REVIEW_RESULT' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(p_review_rationale),'') IS NULL OR p_actor_id IS NULL THEN RAISE EXCEPTION 'DISCOVERY_REVIEW_REQUIRES_RATIONALE_AND_ACTOR' USING ERRCODE='23514'; END IF;
 SELECT decision_status INTO ds FROM agriculture.governance_decision WHERE decision_id=p_governance_decision_id;
 IF ds<>'APPROVED' THEN RAISE EXCEPTION 'DISCOVERY_REVIEW_REQUIRES_APPROVED_GOVERNANCE_DECISION' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.discovery_candidate SET lifecycle_status=p_review_result,governance_decision_id=p_governance_decision_id,updated_by=p_actor_id,updated_at=now(),candidate_summary=candidate_summary||E'\n\nGovernance review: '||btrim(p_review_rationale) WHERE discovery_candidate_id=p_discovery_candidate_id AND lifecycle_status='UNDER_REVIEW' RETURNING * INTO r;
 IF r.discovery_candidate_id IS NULL THEN RAISE EXCEPTION 'DISCOVERY_CANDIDATE_NOT_FOUND_OR_NOT_UNDER_REVIEW' USING ERRCODE='55000'; END IF; RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_review_mechanism_hypothesis(p_mechanism_hypothesis_id uuid, p_review_result text, p_confidence_status text, p_review_rationale text, p_governance_decision_id uuid, p_actor_id uuid)
 RETURNS agriculture.mechanism_hypothesis
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.mechanism_hypothesis; ds text; BEGIN
 IF p_review_result NOT IN ('SUPPORTED','CONTRADICTED','REJECTED') OR p_confidence_status NOT IN ('LOW','MODERATE','HIGH') OR p_actor_id IS NULL OR nullif(btrim(p_review_rationale),'') IS NULL THEN RAISE EXCEPTION 'INVALID_MECHANISM_REVIEW' USING ERRCODE='23514'; END IF;
 SELECT decision_status INTO ds FROM agriculture.governance_decision WHERE decision_id=p_governance_decision_id; IF ds<>'APPROVED' THEN RAISE EXCEPTION 'MECHANISM_REVIEW_REQUIRES_APPROVED_GOVERNANCE_DECISION' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.mechanism_hypothesis SET lifecycle_status=p_review_result,confidence_status=p_confidence_status,governance_decision_id=p_governance_decision_id,reviewed_by=p_actor_id,reviewed_at=now(),review_rationale=btrim(p_review_rationale) WHERE mechanism_hypothesis_id=p_mechanism_hypothesis_id AND lifecycle_status IN ('HYPOTHESIS','UNDER_REVIEW') RETURNING * INTO r;
 IF r.mechanism_hypothesis_id IS NULL THEN RAISE EXCEPTION 'MECHANISM_HYPOTHESIS_NOT_REVIEWABLE' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_review_photo_analysis(p_photo_analysis_id uuid, p_review_result text, p_review_rationale text, p_actor_id uuid)
 RETURNS agriculture.photo_analysis
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.photo_analysis; BEGIN
 IF p_review_result NOT IN ('REVIEWED','REJECTED') OR p_actor_id IS NULL OR nullif(btrim(p_review_rationale),'') IS NULL THEN RAISE EXCEPTION 'PHOTO_ANALYSIS_REVIEW_REQUIRES_VALID_RESULT_ACTOR_AND_RATIONALE' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.photo_analysis SET analysis_status=p_review_result,reviewed_by=p_actor_id,reviewed_at=now(),review_rationale=btrim(p_review_rationale),requires_human_review=false WHERE photo_analysis_id=p_photo_analysis_id AND analysis_status='COMPLETED' RETURNING * INTO r;
 IF r.photo_analysis_id IS NULL THEN RAISE EXCEPTION 'PHOTO_ANALYSIS_NOT_FOUND_OR_NOT_REVIEWABLE' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_revoke_actor_access(p_actor_access_assignment_id uuid, p_revoked_by uuid)
 RETURNS agriculture.actor_access_assignment
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.actor_access_assignment;
BEGIN
 PERFORM agriculture.api_require_capability(p_revoked_by,'administer',NULL);
 UPDATE agriculture.actor_access_assignment SET active=false,revoked_by=p_revoked_by,revoked_at=now() WHERE actor_access_assignment_id=p_actor_access_assignment_id AND active RETURNING * INTO r;
 IF r.actor_access_assignment_id IS NULL THEN RAISE EXCEPTION 'ACCESS_ASSIGNMENT_NOT_FOUND_OR_ALREADY_REVOKED' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_revoke_actor_authority(p_actor_authority_id uuid, p_revoked_by uuid)
 RETURNS agriculture.actor_authority
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.actor_authority;
BEGIN
 PERFORM agriculture.api_require_capability(p_revoked_by,'administer',NULL);
 UPDATE agriculture.actor_authority SET active=false,revoked_by=p_revoked_by,revoked_at=now() WHERE actor_authority_id=p_actor_authority_id AND active RETURNING * INTO r;
 IF r.actor_authority_id IS NULL THEN RAISE EXCEPTION 'AUTHORITY_ASSIGNMENT_NOT_FOUND_OR_ALREADY_REVOKED' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_run_full_resource_discovery(p_country_resource_candidate_id uuid, p_resource_waste_stream_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE a agriculture.resource_discovery_assessment; p agriculture.resource_discovery_priority; g agriculture.resource_safety_ecology_gate; brains jsonb;
BEGIN
 SELECT * INTO a FROM agriculture.api_run_resource_discovery_assessment(p_country_resource_candidate_id,p_resource_waste_stream_id,p_actor_id);
 brains:=agriculture.api_build_resource_discovery_brain_map(a.resource_discovery_run_id);
 SELECT * INTO p FROM agriculture.api_prioritise_resource_discovery(a.resource_discovery_run_id);
 SELECT * INTO g FROM agriculture.api_assess_resource_safety_gate(a.resource_discovery_run_id,'UNASSESSED','UNASSESSED',false,false,p_actor_id);
 RETURN jsonb_build_object('run_id',a.resource_discovery_run_id,'assessment',to_jsonb(a),'priority',to_jsonb(p),'safety_gate',to_jsonb(g),'brain_contributions',brains,'automatic_promotion',false,'automatic_formulation_generation',false);
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_run_resource_discovery_assessment(p_country_resource_candidate_id uuid, p_resource_waste_stream_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.resource_discovery_assessment
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE c agriculture.country_resource_candidate; w agriculture.resource_waste_stream; b agriculture.environmental_burden_profile; r agriculture.resource_discovery_run; a agriculture.resource_discovery_assessment; disc numeric; env numeric; avail numeric; recovery numeric; novelty numeric; mech numeric; compat numeric; crossd numeric; evid numeric; gapv numeric; safety numeric; eco numeric; process numeric; circular numeric; priority numeric; rel_count integer; burden_max numeric; best_recovery numeric;
BEGIN
 SELECT * INTO c FROM agriculture.country_resource_candidate WHERE country_resource_candidate_id=p_country_resource_candidate_id AND scientific_status<>'ARCHIVED';
 IF c.country_resource_candidate_id IS NULL THEN RAISE EXCEPTION 'COUNTRY_RESOURCE_CANDIDATE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF p_resource_waste_stream_id IS NOT NULL THEN SELECT * INTO w FROM agriculture.resource_waste_stream WHERE resource_waste_stream_id=p_resource_waste_stream_id AND linked_country_resource_candidate_id=c.country_resource_candidate_id AND recovery_status<>'ARCHIVED'; IF w.resource_waste_stream_id IS NULL THEN RAISE EXCEPTION 'WASTE_STREAM_NOT_LINKED_TO_RESOURCE' USING ERRCODE='23514'; END IF; SELECT * INTO b FROM agriculture.environmental_burden_profile WHERE resource_waste_stream_id=w.resource_waste_stream_id; END IF;
 disc:=CASE c.discovery_potential WHEN 'EXTREME' THEN 95 WHEN 'HIGH' THEN 80 WHEN 'MEDIUM' THEN 55 WHEN 'LOW' THEN 25 ELSE 50 END;
 evid:=CASE c.evidence_status WHEN 'STRONG' THEN 90 WHEN 'MODERATE' THEN 65 WHEN 'LIMITED' THEN 35 WHEN 'CONTRADICTED' THEN 15 ELSE 10 END;
 mech:=CASE c.mechanism_status WHEN 'KNOWN' THEN 85 WHEN 'PARTIAL' THEN 60 ELSE 30 END;
 gapv:=CASE c.knowledge_gap_status WHEN 'HIGH' THEN 90 WHEN 'MEDIUM' THEN 60 ELSE 25 END;
 novelty:=round((disc*0.65 + gapv*0.35)::numeric,2);
 SELECT count(*) INTO rel_count FROM agriculture.country_resource_domain_relevance WHERE country_resource_candidate_id=c.country_resource_candidate_id AND relevance_status IN ('PLAUSIBLE','SUPPORTED');
 crossd:=LEAST(100,rel_count*22+CASE WHEN rel_count>0 THEN 20 ELSE 10 END);
 compat:=CASE WHEN EXISTS(SELECT 1 FROM agriculture.country_resource_domain_relevance WHERE country_resource_candidate_id=c.country_resource_candidate_id AND domain_code IN ('AGRICULTURE','SOIL','FORMULATION_INTELLIGENCE') AND relevance_status IN ('PLAUSIBLE','SUPPORTED')) THEN 70 ELSE 35 END;
 avail:=CASE COALESCE(w.estimated_availability_status,'UNKNOWN') WHEN 'VERY_HIGH' THEN 95 WHEN 'HIGH' THEN 80 WHEN 'MODERATE' THEN 55 WHEN 'LOW' THEN 30 ELSE 35 END;
 SELECT max(CASE recovery_feasibility WHEN 'VERY_HIGH' THEN 95 WHEN 'HIGH' THEN 80 WHEN 'MODERATE' THEN 55 WHEN 'LOW' THEN 30 ELSE 35 END) INTO best_recovery FROM agriculture.resource_recovery_pathway WHERE resource_waste_stream_id=w.resource_waste_stream_id AND lifecycle_status<>'ARCHIVED'; recovery:=COALESCE(best_recovery,35);
 safety:=CASE COALESCE(w.contamination_status,'UNKNOWN') WHEN 'PROHIBITIVE' THEN 100 WHEN 'HIGH_CONCERN' THEN 85 WHEN 'REVIEW_REQUIRED' THEN 65 WHEN 'LOW_CONCERN' THEN 25 ELSE 55 END;
 eco:=CASE WHEN b.environmental_burden_profile_id IS NULL THEN 50 ELSE 35 END;
 process:=100-recovery;
 burden_max:=GREATEST(CASE COALESCE(b.air_pollution_burden,'UNASSESSED') WHEN 'SEVERE' THEN 100 WHEN 'HIGH' THEN 80 WHEN 'MODERATE' THEN 55 WHEN 'LOW' THEN 25 ELSE 25 END,CASE COALESCE(b.water_pollution_burden,'UNASSESSED') WHEN 'SEVERE' THEN 100 WHEN 'HIGH' THEN 80 WHEN 'MODERATE' THEN 55 WHEN 'LOW' THEN 25 ELSE 25 END,CASE COALESCE(b.soil_pollution_burden,'UNASSESSED') WHEN 'SEVERE' THEN 100 WHEN 'HIGH' THEN 80 WHEN 'MODERATE' THEN 55 WHEN 'LOW' THEN 25 ELSE 25 END,CASE COALESCE(b.burning_pressure,'UNASSESSED') WHEN 'SEVERE' THEN 100 WHEN 'HIGH' THEN 80 WHEN 'MODERATE' THEN 55 WHEN 'LOW' THEN 25 ELSE 25 END);
 env:=CASE WHEN w.resource_waste_stream_id IS NULL THEN 30 ELSE LEAST(100,burden_max + CASE WHEN w.burning_involved THEN 10 ELSE 0 END + CASE WHEN w.dumping_involved THEN 5 ELSE 0 END) END;
 circular:=CASE WHEN w.resource_waste_stream_id IS NULL THEN 35 ELSE round((env*0.45+avail*0.30+recovery*0.25)::numeric,2) END;
 priority:=round(GREATEST(0,LEAST(100,disc*0.16+env*0.16+avail*0.08+recovery*0.08+novelty*0.10+mech*0.08+compat*0.08+crossd*0.07+gapv*0.06+circular*0.08+evid*0.05-safety*0.06-eco*0.04))::numeric,2);
 INSERT INTO agriculture.resource_discovery_run(run_code,country_resource_candidate_id,resource_waste_stream_id,input_snapshot,created_by) VALUES('RDR-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),c.country_resource_candidate_id,w.resource_waste_stream_id,jsonb_build_object('candidate',to_jsonb(c),'waste_stream',CASE WHEN w.resource_waste_stream_id IS NULL THEN NULL ELSE to_jsonb(w) END),p_actor_id) RETURNING * INTO r;
 INSERT INTO agriculture.resource_discovery_assessment(resource_discovery_run_id,discovery_potential_score,environmental_benefit_score,resource_availability_score,recovery_feasibility_score,scientific_novelty_score,mechanism_plausibility_score,ingredient_compatibility_potential_score,cross_domain_utility_score,evidence_strength_score,knowledge_gap_value_score,safety_concern_score,ecological_concern_score,processing_requirement_score,circular_economy_potential_score,investigation_priority_score,assessment_summary,algorithm_explanation)
 VALUES(r.resource_discovery_run_id,disc,env,avail,recovery,novelty,mech,compat,crossd,evid,gapv,safety,eco,process,circular,priority,'Advisory investigation priority only. Scores are not proof, efficacy, safety or approval.',jsonb_build_object('doctrine','Interesting does not mean useful; local/natural/waste does not mean safe; discovery potential is not confidence or efficacy.','domain_relevance_count',rel_count,'burning_involved',COALESCE(w.burning_involved,false),'evidence_status',c.evidence_status,'mechanism_status',c.mechanism_status,'knowledge_gap_status',c.knowledge_gap_status)) RETURNING * INTO a;
 RETURN a;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_set_brain_evidence_eligibility(p_subject_entity_type text, p_subject_entity_id uuid, p_validation_passed boolean, p_context_complete boolean, p_quality_acceptable boolean, p_photo_requirement_satisfied boolean, p_required_review_complete boolean, p_quarantine_clear boolean, p_eligibility_status text, p_eligibility_reason text, p_evidence_packet_id uuid DEFAULT NULL::uuid, p_governance_decision_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.brain_evidence_eligibility
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.brain_evidence_eligibility;
BEGIN
 IF p_eligibility_status IN ('ELIGIBLE','ELIGIBLE_WITH_WARNINGS') AND (NOT p_validation_passed OR NOT p_context_complete OR NOT p_quality_acceptable OR NOT p_photo_requirement_satisfied OR NOT p_required_review_complete OR NOT p_quarantine_clear OR p_governance_decision_id IS NULL) THEN RAISE EXCEPTION 'BRAIN_ELIGIBILITY_GATE_INCOMPLETE' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.brain_evidence_eligibility(subject_entity_type,subject_entity_id,evidence_packet_id,validation_passed,context_complete,quality_acceptable,photo_requirement_satisfied,required_review_complete,quarantine_clear,eligibility_status,eligibility_reason,assessed_by,governance_decision_id)
 VALUES(upper(btrim(p_subject_entity_type)),p_subject_entity_id,p_evidence_packet_id,p_validation_passed,p_context_complete,p_quality_acceptable,p_photo_requirement_satisfied,p_required_review_complete,p_quarantine_clear,p_eligibility_status,btrim(p_eligibility_reason),p_actor_id,p_governance_decision_id)
 ON CONFLICT(subject_entity_type,subject_entity_id) DO UPDATE SET evidence_packet_id=EXCLUDED.evidence_packet_id,validation_passed=EXCLUDED.validation_passed,context_complete=EXCLUDED.context_complete,quality_acceptable=EXCLUDED.quality_acceptable,photo_requirement_satisfied=EXCLUDED.photo_requirement_satisfied,required_review_complete=EXCLUDED.required_review_complete,quarantine_clear=EXCLUDED.quarantine_clear,eligibility_status=EXCLUDED.eligibility_status,eligibility_reason=EXCLUDED.eligibility_reason,assessed_by=EXCLUDED.assessed_by,assessed_at=now(),governance_decision_id=EXCLUDED.governance_decision_id
 RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_submit_discovery_for_review(p_discovery_candidate_id uuid, p_evidence_packet_id uuid, p_actor_id uuid)
 RETURNS agriculture.discovery_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.discovery_candidate;
BEGIN
 IF p_actor_id IS NULL THEN RAISE EXCEPTION 'DISCOVERY_REVIEW_SUBMISSION_REQUIRES_ACTOR' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.evidence_packet WHERE evidence_packet_id=p_evidence_packet_id AND packet_status IN ('COMPLETE','APPROVED') AND completeness_status='COMPLETE') THEN RAISE EXCEPTION 'DISCOVERY_REVIEW_REQUIRES_COMPLETE_EVIDENCE_PACKET' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.discovery_candidate SET lifecycle_status='UNDER_REVIEW',evidence_packet_id=p_evidence_packet_id,updated_by=p_actor_id,updated_at=now() WHERE discovery_candidate_id=p_discovery_candidate_id AND lifecycle_status='DISCOVERY_CANDIDATE' RETURNING * INTO r;
 IF r.discovery_candidate_id IS NULL THEN RAISE EXCEPTION 'DISCOVERY_CANDIDATE_NOT_FOUND_OR_NOT_SUBMITTABLE' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_submit_ingredient_for_review(p_ingredient_id uuid, p_actor_id uuid)
 RETURNS agriculture.ingredient
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient; v_country char(2); v_version integer;
BEGIN
 SELECT country_code,current_version_no INTO v_country,v_version FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'INGREDIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 PERFORM agriculture.api_require_capability(p_actor_id,'submit_review',v_country);
 IF NOT EXISTS(SELECT 1 FROM agriculture.ingredient_version WHERE ingredient_id=p_ingredient_id AND version_no=v_version AND review_status='PENDING') THEN RAISE EXCEPTION 'CURRENT_INGREDIENT_VERSION_NOT_PENDING' USING ERRCODE='55000'; END IF;
 UPDATE agriculture.ingredient SET lifecycle_status='UNDER_REVIEW',updated_at=now() WHERE ingredient_id=p_ingredient_id AND lifecycle_status='DRAFT' RETURNING * INTO r;
 IF r.ingredient_id IS NULL THEN RAISE EXCEPTION 'INGREDIENT_NOT_SUBMITTABLE' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_submit_learning_candidate(p_learning_candidate_id uuid, p_actor_id uuid)
 RETURNS agriculture.learning_candidate
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$ DECLARE r agriculture.learning_candidate; BEGIN IF p_actor_id IS NULL THEN RAISE EXCEPTION 'LEARNING_SUBMISSION_REQUIRES_ACTOR' USING ERRCODE='23514'; END IF; UPDATE agriculture.learning_candidate SET candidate_status='UNDER_REVIEW',reviewed_by=NULL,reviewed_at=NULL WHERE learning_candidate_id=p_learning_candidate_id AND candidate_status='DRAFT' RETURNING * INTO r; IF r.learning_candidate_id IS NULL THEN RAISE EXCEPTION 'LEARNING_CANDIDATE_NOT_FOUND_OR_NOT_DRAFT' USING ERRCODE='55000'; END IF; RETURN r; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_submit_observation(p_observation_code text, p_trial_id uuid, p_plot_id uuid, p_observed_at timestamp with time zone, p_notes text DEFAULT NULL::text, p_observer_id uuid DEFAULT NULL::uuid, p_template_version_id uuid DEFAULT NULL::uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS agriculture.observation
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE sub_id uuid; obs agriculture.observation;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM agriculture.plot WHERE plot_id=p_plot_id AND trial_id=p_trial_id AND lifecycle_status<>'ARCHIVED') THEN RAISE EXCEPTION 'PLOT_DOES_NOT_BELONG_TO_ACTIVE_TRIAL' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.input_submission(submission_code,subject_entity_type,subject_entity_id,submission_type,submission_status,submitted_payload,submitted_by,submitted_at)
 VALUES('OBS-SUB-'||gen_random_uuid()::text,'OBSERVATION',NULL,'OBSERVATION','RECEIVED',COALESCE(p_payload,'{}'::jsonb),p_observer_id,now()) RETURNING input_submission_id INTO sub_id;
 INSERT INTO agriculture.observation(observation_code,trial_id,plot_id,observation_template_version_id,observed_at,observer_id,observation_status,notes,input_submission_id)
 VALUES(p_observation_code,p_trial_id,p_plot_id,p_template_version_id,p_observed_at,p_observer_id,'DRAFT',p_notes,sub_id) RETURNING * INTO obs;
 UPDATE agriculture.input_submission SET subject_entity_id=obs.observation_id WHERE input_submission_id=sub_id;
 RETURN obs;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_submit_observation_for_validation(p_observation_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.observation
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.observation; req_missing integer; photo_needed boolean; photos integer;
BEGIN
 SELECT * INTO r FROM agriculture.observation WHERE observation_id=p_observation_id FOR UPDATE;
 IF r.observation_id IS NULL THEN RAISE EXCEPTION 'OBSERVATION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF r.observation_status<>'DRAFT' THEN RAISE EXCEPTION 'ONLY_DRAFT_OBSERVATION_CAN_BE_SUBMITTED' USING ERRCODE='55000'; END IF;
 IF r.observation_template_version_id IS NOT NULL THEN
  SELECT count(*) INTO req_missing FROM agriculture.observation_template_metric otm WHERE otm.observation_template_version_id=r.observation_template_version_id AND otm.requirement_level='REQUIRED' AND NOT EXISTS(SELECT 1 FROM agriculture.measurement m WHERE m.observation_id=r.observation_id AND m.metric_definition_id=otm.metric_definition_id AND m.measurement_status<>'REJECTED');
  IF req_missing>0 THEN RAISE EXCEPTION 'OBSERVATION_MISSING_REQUIRED_MEASUREMENTS: %',req_missing USING ERRCODE='23514'; END IF;
 END IF;
 SELECT EXISTS(SELECT 1 FROM agriculture.measurement m JOIN agriculture.metric_definition md ON md.metric_definition_id=m.metric_definition_id WHERE m.observation_id=r.observation_id AND md.photo_requirement_policy='REQUIRED') INTO photo_needed;
 SELECT count(*) INTO photos FROM agriculture.photo_evidence pe WHERE pe.subject_entity_type='OBSERVATION' AND pe.subject_entity_id=r.observation_id AND pe.review_status<>'REJECTED';
 IF photo_needed AND photos=0 THEN RAISE EXCEPTION 'OBSERVATION_REQUIRES_PHOTO_EVIDENCE' USING ERRCODE='23514'; END IF;
 UPDATE agriculture.observation SET observation_status='SUBMITTED',updated_at=now() WHERE observation_id=p_observation_id RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_submit_outcome_for_review(p_outcome_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.outcome
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.outcome;
BEGIN
 UPDATE agriculture.outcome SET outcome_status='UNDER_REVIEW' WHERE outcome_id=p_outcome_id AND outcome_status='DRAFT' RETURNING * INTO r;
 IF r.outcome_id IS NULL THEN RAISE EXCEPTION 'OUTCOME_NOT_FOUND_OR_NOT_DRAFT' USING ERRCODE='55000'; END IF;
 IF r.evidence_packet_id IS NULL OR NOT EXISTS(SELECT 1 FROM agriculture.evidence_packet WHERE evidence_packet_id=r.evidence_packet_id AND packet_status IN ('COMPLETE','APPROVED') AND completeness_status='COMPLETE') THEN RAISE EXCEPTION 'OUTCOME_REVIEW_REQUIRES_COMPLETE_EVIDENCE_PACKET' USING ERRCODE='23514'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_submit_resource_discovery_for_review(p_resource_discovery_run_id uuid, p_actor_id uuid)
 RETURNS agriculture.resource_discovery_scientist_review
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.resource_discovery_scientist_review; c_country char(2);
BEGIN
 SELECT c.country_code INTO c_country FROM agriculture.resource_discovery_run rr JOIN agriculture.country_resource_candidate c ON c.country_resource_candidate_id=rr.country_resource_candidate_id WHERE rr.resource_discovery_run_id=p_resource_discovery_run_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'RESOURCE_DISCOVERY_RUN_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 PERFORM agriculture.api_require_capability(p_actor_id,'submit_review',c_country);
 IF NOT EXISTS(SELECT 1 FROM agriculture.resource_discovery_priority WHERE resource_discovery_run_id=p_resource_discovery_run_id) THEN RAISE EXCEPTION 'DISCOVERY_PRIORITY_REQUIRED_BEFORE_REVIEW' USING ERRCODE='23514'; END IF;
 IF NOT EXISTS(SELECT 1 FROM agriculture.resource_safety_ecology_gate WHERE resource_discovery_run_id=p_resource_discovery_run_id) THEN RAISE EXCEPTION 'SAFETY_ECOLOGY_GATE_REQUIRED_BEFORE_REVIEW' USING ERRCODE='23514'; END IF;
 INSERT INTO agriculture.resource_discovery_scientist_review(resource_discovery_run_id,review_status,created_by) VALUES(p_resource_discovery_run_id,'PENDING',p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_transition_governance_state(p_entity_type text, p_entity_id uuid, p_to_lifecycle_status text, p_to_approval_status text, p_transition_reason text, p_decision_id uuid DEFAULT NULL::uuid, p_review_id uuid DEFAULT NULL::uuid, p_actor_id uuid DEFAULT NULL::uuid, p_transition_context jsonb DEFAULT '{}'::jsonb)
 RETURNS agriculture.record_governance_state
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.record_governance_state; old_life text; old_approval text;
BEGIN
 IF nullif(btrim(p_transition_reason),'') IS NULL THEN RAISE EXCEPTION 'TRANSITION_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
 SELECT lifecycle_status,approval_status INTO old_life,old_approval FROM agriculture.record_governance_state WHERE entity_type=upper(btrim(p_entity_type)) AND entity_id=p_entity_id FOR UPDATE;
 IF old_life IS NULL THEN
  INSERT INTO agriculture.record_governance_state(entity_type,entity_id,lifecycle_status,approval_status,current_decision_id,current_review_id,change_reason,created_by,updated_by)
  VALUES(upper(btrim(p_entity_type)),p_entity_id,p_to_lifecycle_status,COALESCE(p_to_approval_status,'NOT_SUBMITTED'),p_decision_id,p_review_id,btrim(p_transition_reason),p_actor_id,p_actor_id) RETURNING * INTO r;
 ELSE
  UPDATE agriculture.record_governance_state SET lifecycle_status=p_to_lifecycle_status,approval_status=COALESCE(p_to_approval_status,approval_status),current_decision_id=COALESCE(p_decision_id,current_decision_id),current_review_id=COALESCE(p_review_id,current_review_id),change_reason=btrim(p_transition_reason),updated_by=p_actor_id,updated_at=now() WHERE entity_type=upper(btrim(p_entity_type)) AND entity_id=p_entity_id RETURNING * INTO r;
 END IF;
 INSERT INTO agriculture.governance_transition_log(entity_type,entity_id,from_lifecycle_status,to_lifecycle_status,from_approval_status,to_approval_status,transition_reason,decision_id,review_id,changed_by,transition_context)
 VALUES(upper(btrim(p_entity_type)),p_entity_id,old_life,p_to_lifecycle_status,old_approval,COALESCE(p_to_approval_status,old_approval),btrim(p_transition_reason),p_decision_id,p_review_id,p_actor_id,COALESCE(p_transition_context,'{}'::jsonb));
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_trial_add_plot(p_trial_id uuid, p_plot_code text, p_plot_name text, p_treatment_role text DEFAULT 'TREATMENT'::text, p_formulation_version_id uuid DEFAULT NULL::uuid, p_replicate_number integer DEFAULT NULL::integer, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_area_value numeric DEFAULT NULL::numeric, p_area_unit text DEFAULT NULL::text, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS agriculture.plot
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare t agriculture.trial; p agriculture.plot; chosen_fv uuid;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  select * into t from agriculture.trial where trial_id=p_trial_id for update;
  if t.trial_id is null then raise exception 'TRIAL_NOT_FOUND' using errcode='P0002'; end if;
  if t.lifecycle_status not in ('DRAFT','UNDER_REVIEW') then raise exception 'PLOTS_CAN_ONLY_BE_CONFIGURED_BEFORE_TRIAL_ACTIVATION' using errcode='55000'; end if;
  if nullif(btrim(p_plot_code),'') is null or nullif(btrim(p_plot_name),'') is null then raise exception 'PLOT_CODE_AND_NAME_REQUIRED' using errcode='23514'; end if;
  if upper(btrim(p_treatment_role)) not in ('CONTROL','TREATMENT','REFERENCE','OTHER') then raise exception 'INVALID_PLOT_TREATMENT_ROLE' using errcode='22023'; end if;
  select * into p from agriculture.plot where plot_code=upper(btrim(p_plot_code));
  if p.plot_id is not null then if p.trial_id<>p_trial_id then raise exception 'PLOT_CODE_ALREADY_USED_BY_ANOTHER_TRIAL' using errcode='23505'; end if; return p; end if;
  chosen_fv:=p_formulation_version_id;
  if upper(btrim(p_treatment_role))='TREATMENT' and chosen_fv is null then chosen_fv:=t.formulation_version_id; end if;
  if upper(btrim(p_treatment_role))='TREATMENT' and t.formulation_version_id is not null and chosen_fv is distinct from t.formulation_version_id then raise exception 'TREATMENT_PLOT_MUST_USE_TRIAL_FORMULATION_VERSION' using errcode='23514'; end if;
  insert into agriculture.plot(plot_code,trial_id,plot_name,replicate_number,treatment_role,formulation_version_id,latitude,longitude,area_value,area_unit,lifecycle_status,created_by,country_workspace_id)
  values(upper(btrim(p_plot_code)),p_trial_id,btrim(p_plot_name),p_replicate_number,upper(btrim(p_treatment_role)),chosen_fv,p_latitude,p_longitude,p_area_value,p_area_unit,'ACTIVE',p_actor_id,t.country_workspace_id) returning * into p;
  return p;
end; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_trial_decide_activation(p_trial_id uuid, p_decision text, p_evidence_reviewed_summary text, p_review_rationale text, p_review_result text, p_required_follow_up text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare h agriculture.trial_activation_handoff; d agriculture.governance_decision; t agriculture.trial; final_status text;
begin
  perform agriculture.api_require_capability(p_actor_id,'approve',null);
  if upper(btrim(p_decision)) not in ('APPROVE','REJECT') then raise exception 'INVALID_TRIAL_ACTIVATION_DECISION' using errcode='22023'; end if;
  select * into h from agriculture.trial_activation_handoff where trial_id=p_trial_id and decision_status='PENDING' order by submitted_at desc limit 1 for update;
  if h.trial_activation_handoff_id is null then raise exception 'TRIAL_ACTIVATION_REVIEW_NOT_FOUND' using errcode='P0002'; end if;
  final_status:=case when upper(btrim(p_decision))='APPROVE' then 'APPROVED' else 'REJECTED' end;
  perform agriculture.api_complete_governance_review(h.governance_review_id,final_status,p_evidence_reviewed_summary,p_review_rationale,p_review_result,p_required_follow_up,p_actor_id);
  select * into d from agriculture.api_finalize_governance_decision(h.governance_decision_id,final_status,p_review_result,p_actor_id);
  if final_status='APPROVED' then select * into t from agriculture.api_activate_trial(p_trial_id,d.decision_id,p_actor_id); else update agriculture.trial set lifecycle_status='DRAFT',updated_by=p_actor_id,updated_at=now() where trial_id=p_trial_id returning * into t; end if;
  update agriculture.trial_activation_handoff set decision_status=final_status,decided_by=p_actor_id,decided_at=now() where trial_activation_handoff_id=h.trial_activation_handoff_id;
  return jsonb_build_object('trial',to_jsonb(t),'decision',to_jsonb(d),'activation_status',final_status);
end; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_trial_protocol_catalog(p_trial_id uuid, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare t agriculture.trial; result jsonb;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  select * into t from agriculture.trial where trial_id=p_trial_id;
  if t.trial_id is null then raise exception 'TRIAL_NOT_FOUND' using errcode='P0002'; end if;
  if t.country_workspace_id is not null and not exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=t.country_workspace_id and wm.membership_status='ACTIVE') then raise exception 'TRIAL_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  select jsonb_build_object(
    'trial_id',t.trial_id,'trial_code',t.trial_code,'trial_status',t.lifecycle_status,
    'available_templates',coalesce((select jsonb_agg(jsonb_build_object('template_version_id',otv.observation_template_version_id,'template_code',ot.template_code,'template_name',ot.template_name,'version_no',otv.version_no,'objective',otv.objective,'guidance',otv.guidance,'metric_count',(select count(*) from agriculture.observation_template_metric x where x.observation_template_version_id=otv.observation_template_version_id)) order by ot.template_name) from agriculture.observation_template ot join agriculture.observation_template_version otv on otv.observation_template_id=ot.observation_template_id where ot.lifecycle_status='ACTIVE' and otv.version_status='ACTIVE'),'[]'::jsonb),
    'bindings',coalesce((select jsonb_agg(jsonb_build_object('binding_id',b.trial_protocol_binding_id,'template_version_id',b.observation_template_version_id,'template_code',ot.template_code,'template_name',ot.template_name,'binding_role',b.binding_role,'required',b.required) order by case b.binding_role when 'PRIMARY' then 1 when 'DIAGNOSTIC_FOLLOWUP' then 2 else 3 end,ot.template_name) from agriculture.trial_protocol_binding b join agriculture.observation_template_version otv on otv.observation_template_version_id=b.observation_template_version_id join agriculture.observation_template ot on ot.observation_template_id=otv.observation_template_id where b.trial_id=p_trial_id and b.effective_until is null),'[]'::jsonb)
  ) into result;
  return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_trial_submit_for_activation(p_trial_id uuid, p_rationale text, p_evidence_summary text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare t agriculture.trial; d agriculture.governance_decision; r agriculture.governance_review; cnt integer; code text;
begin
  perform agriculture.api_require_capability(p_actor_id,'submit_review',null);
  if nullif(btrim(p_rationale),'') is null then raise exception 'TRIAL_ACTIVATION_REQUIRES_WHY' using errcode='23514'; end if;
  select * into t from agriculture.trial where trial_id=p_trial_id for update;
  if t.trial_id is null then raise exception 'TRIAL_NOT_FOUND' using errcode='P0002'; end if;
  if t.lifecycle_status not in ('DRAFT','UNDER_REVIEW') then raise exception 'TRIAL_NOT_ELIGIBLE_FOR_ACTIVATION_REVIEW' using errcode='55000'; end if;
  if t.formulation_version_id is not null and not exists(select 1 from agriculture.formulation_version fv where fv.formulation_version_id=t.formulation_version_id and fv.lifecycle_status='APPROVED' and fv.trial_readiness='READY_FOR_TRIAL') then raise exception 'TRIAL_FORMULATION_NOT_APPROVED_AND_READY' using errcode='23514'; end if;
  select count(*) into cnt from agriculture.plot where trial_id=p_trial_id and lifecycle_status='ACTIVE';
  if cnt=0 then raise exception 'TRIAL_REQUIRES_AT_LEAST_ONE_ACTIVE_PLOT' using errcode='23514'; end if;
  select gd.* into d from agriculture.trial_activation_handoff h join agriculture.governance_decision gd on gd.decision_id=h.governance_decision_id where h.trial_id=p_trial_id and h.decision_status='PENDING' order by h.submitted_at desc limit 1;
  if d.decision_id is not null then return jsonb_build_object('trial',to_jsonb(t),'decision',to_jsonb(d),'reused',true); end if;
  code:='TRIAL-ACT-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,18));
  select * into d from agriculture.api_create_governance_decision(code,'AUTHORISE_TRIAL','TRIAL',p_trial_id,'AGRICULTURE_SCIENTIST',p_rationale,p_evidence_summary,p_actor_id);
  select * into r from agriculture.api_create_governance_review(code||'-REV','TRIAL',p_trial_id,'FINAL_APPROVAL','AGRICULTURE_SCIENTIST',d.decision_id,p_actor_id);
  insert into agriculture.trial_activation_handoff(trial_id,governance_decision_id,governance_review_id,submitted_by) values(p_trial_id,d.decision_id,r.review_id,p_actor_id);
  update agriculture.trial set lifecycle_status='UNDER_REVIEW',updated_by=p_actor_id,updated_at=now() where trial_id=p_trial_id returning * into t;
  return jsonb_build_object('trial',to_jsonb(t),'decision',to_jsonb(d),'review',to_jsonb(r),'reused',false);
end; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_update_draft_ingredient(p_ingredient_id uuid, p_ingredient_name text, p_material_class text, p_preparation_class text DEFAULT NULL::text, p_data_class text DEFAULT NULL::text, p_country_code character DEFAULT NULL::bpchar)
 RETURNS agriculture.ingredient
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE r agriculture.ingredient;
BEGIN
 SELECT * INTO r FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INGREDIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF r.lifecycle_status NOT IN ('DRAFT','UNDER_REVIEW') THEN RAISE EXCEPTION 'INGREDIENT_EDIT_REQUIRES_DRAFT_OR_UNDER_REVIEW' USING ERRCODE='55000'; END IF;
 UPDATE agriculture.ingredient SET ingredient_name=btrim(p_ingredient_name),material_class=p_material_class,preparation_class=p_preparation_class,data_class=COALESCE(p_data_class,data_class),country_code=p_country_code,updated_at=now() WHERE ingredient_id=p_ingredient_id RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_validate_learning_memory_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  a uuid:=gen_random_uuid();
  tr uuid:=gen_random_uuid();
  ep uuid:=gen_random_uuid();
  outid uuid:=gen_random_uuid();
  gd uuid:=gen_random_uuid();
  gr uuid:=gen_random_uuid();
  dq uuid:=gen_random_uuid();
  be uuid:=gen_random_uuid();
  lc agriculture.learning_candidate;
  prep jsonb;
  decided jsonb;
  result jsonb;
begin
  begin
    insert into agriculture.actor(actor_id,display_name,actor_type,active) values(a,'AAB Learning Validation Scientist','USER',true);
    insert into agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,grant_reason,active) values(a,'AGRICULTURE_RUNTIME_SCIENTIST','AGRICULTURE','Rollback-only learning validation',true);
    insert into agriculture.actor_authority(actor_id,role_code,authority_scope,grant_rationale,active) values(a,'AGRICULTURE_SCIENTIST','AGRICULTURE','Rollback-only learning validation',true);

    insert into agriculture.trial(trial_id,trial_code,trial_name,trial_objective,lifecycle_status,outcome_status,created_by,updated_by,actual_end_date)
    values(tr,'VAL-LEARN-133','Validation Learning Trial','Validate governed learning memory chain','COMPLETED','REVIEWED',a,a,current_date);

    insert into agriculture.evidence_packet(evidence_packet_id,evidence_packet_code,packet_type,subject_entity_type,subject_entity_id,packet_status,evidence_summary,completeness_status,created_by,updated_by)
    values(ep,'VAL-EP-LEARN-133','OUTCOME','OUTCOME',outid,'APPROVED','Rollback-only approved outcome evidence','COMPLETE',a,a);

    insert into agriculture.governance_decision(decision_id,decision_code,decision_type,decision_status,subject_entity_type,subject_entity_id,required_authority_role,rationale,evidence_summary,outcome_summary,created_by,decided_by,decided_at)
    values(gd,'VAL-GD-LEARN-133','APPROVE','APPROVED','OUTCOME',outid,'AGRICULTURE_SCIENTIST','Validation outcome approval','Validation evidence','Approved',a,a,now());

    insert into agriculture.governance_review(review_id,review_code,decision_id,subject_entity_type,subject_entity_id,review_type,review_status,reviewer_id,required_authority_role,evidence_reviewed_summary,review_rationale,review_result,created_by,reviewed_at)
    values(gr,'VAL-GR-LEARN-133',gd,'OUTCOME',outid,'SCIENTIFIC','APPROVED',a,'AGRICULTURE_SCIENTIST','Validation evidence reviewed','Validation review rationale','APPROVE',a,now());

    insert into agriculture.outcome(outcome_id,outcome_code,trial_id,outcome_type,outcome_status,outcome_summary,outcome_payload,evidence_packet_id,governance_decision_id,created_by,reviewed_by,reviewed_at)
    values(outid,'VAL-OUT-LEARN-133',tr,'TRIAL','APPROVED','Validated trial outcome for learning test','{}'::jsonb,ep,gd,a,a,now());

    insert into agriculture.data_quality_assessment(data_quality_assessment_id,subject_entity_type,subject_entity_id,quality_status,completeness_status,context_quality,method_quality,evidence_quality,photo_quality,assessment_summary,assessed_by,review_required,governance_review_id)
    values(dq,'OUTCOME',outid,'ACCEPTABLE','COMPLETE','STRONG','HIGH','STRONG','NOT_APPLICABLE','Validation quality assessment',a,true,gr);

    insert into agriculture.brain_evidence_eligibility(brain_evidence_eligibility_id,subject_entity_type,subject_entity_id,evidence_packet_id,validation_passed,context_complete,quality_acceptable,photo_requirement_satisfied,required_review_complete,quarantine_clear,eligibility_status,eligibility_reason,assessed_by,governance_decision_id)
    values(be,'OUTCOME',outid,ep,true,true,true,true,true,true,'ELIGIBLE','Validation eligibility',a,gd);

    lc:=agriculture.api_prepare_trial_learning(tr,'POSITIVE','The controlled validation outcome supports a governed positive learning.','Additional replication would strengthen external applicability.',null,a);
    prep:=agriculture.api_prepare_learning_review(lc.learning_candidate_id,a);
    decided:=agriculture.api_decide_learning_review(lc.learning_candidate_id,'APPROVE','Reviewed approved Trial outcome evidence.','Learning is supported within the tested context.',jsonb_build_object('trial_id',tr),'Do not generalise beyond tested conditions.',null,null,null,null,null,null,a);

    result:=jsonb_build_object(
      'contract','AAB_AGRICULTURE_LEARNING_MEMORY_133',
      'status','PASS_ROLLBACK_ONLY',
      'learning_candidate_approved',exists(select 1 from agriculture.learning_candidate where learning_candidate_id=lc.learning_candidate_id and candidate_status='APPROVED'),
      'approved_learning_created',exists(select 1 from agriculture.approved_learning where learning_candidate_id=lc.learning_candidate_id and lifecycle_status='ACTIVE'),
      'scientific_memory_created',exists(select 1 from agriculture.scientific_memory_entry m join agriculture.approved_learning al on al.approved_learning_id=m.approved_learning_id where al.learning_candidate_id=lc.learning_candidate_id and m.lifecycle_status='ACTIVE'),
      'knowledge_gap_created',exists(select 1 from agriculture.knowledge_gap where subject_entity_type='OUTCOME' and subject_entity_id=outid and lifecycle_status='OPEN'),
      'scientist_authority_preserved',true,
      'decision_payload_present',decided is not null
    );
    raise exception 'AAB_VALIDATION_ROLLBACK_133';
  exception when raise_exception then
    if sqlerrm<>'AAB_VALIDATION_ROLLBACK_133' then raise; end if;
  end;
  return result || jsonb_build_object('all_validation_mutations_rolled_back',not exists(select 1 from agriculture.trial where trial_code='VAL-LEARN-133'));
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_validate_observation_evidence_outcome_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  result jsonb;
  a_id uuid:=gen_random_uuid();
  fv_id uuid:=gen_random_uuid();
  fv_dec uuid:=gen_random_uuid();
  tr_id uuid:=gen_random_uuid();
  pl_id uuid:=gen_random_uuid();
  tpl_id uuid;
  cap jsonb; prep jsonb; reviewed jsonb;
  obs_id uuid; outc agriculture.outcome; outprep jsonb; outfinal agriculture.outcome; tr agriculture.trial;
  residue integer;
begin
  begin
    insert into agriculture.actor(actor_id,display_name,actor_type,active) values(a_id,'Validation Scientist 129','USER',true);
    insert into agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,grant_reason,active) values(a_id,'AGRICULTURE_RUNTIME_SCIENTIST','AGRICULTURE','Rollback-only E2E validation',true);
    insert into agriculture.actor_authority(actor_id,role_code,authority_scope,grant_rationale,active) values(a_id,'AGRICULTURE_SCIENTIST','AGRICULTURE','Rollback-only E2E validation',true);

    insert into agriculture.governance_decision(decision_id,decision_code,decision_type,decision_status,subject_entity_type,subject_entity_id,required_authority_role,rationale,evidence_summary,outcome_summary,created_by,created_at,decided_by,decided_at)
    values(fv_dec,'VAL-FV-DEC-129-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),'APPROVE','APPROVED','FORMULATION_VERSION',fv_id,'AGRICULTURE_SCIENTIST','Validation formulation approval.','Rollback-only validation evidence.','Approved for validation.',a_id,now(),a_id,now());

    insert into agriculture.formulation_version(formulation_version_id,version_code,formulation_name,version_number,formulation_type,change_type,change_rationale,expected_outcomes,data_class,trial_readiness,lifecycle_status,governance_decision_id,created_by,approved_by,approved_at)
    values(fv_id,'VAL-FV-129-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),'Validation Formulation 129',1,'OTHER','INITIAL','Rollback-only observation/outcome validation.','Validate scientific lineage.','TEST','READY_FOR_TRIAL','APPROVED',fv_dec,a_id,a_id,now());

    insert into agriculture.trial(trial_id,trial_code,trial_name,formulation_version_id,trial_objective,lifecycle_status,outcome_status,created_by,updated_by,start_date)
    values(tr_id,'VAL-TR-129-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),'Validation Trial 129',fv_id,'Validate observation to outcome scientific chain.','ACTIVE','NOT_RECORDED',a_id,a_id,current_date);

    insert into agriculture.plot(plot_id,plot_code,trial_id,plot_name,treatment_role,formulation_version_id,lifecycle_status,created_by,updated_by)
    values(pl_id,'VAL-PL-129-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),tr_id,'Validation Plot 129','TREATMENT',fv_id,'ACTIVE',a_id,a_id);

    select otv.observation_template_version_id into tpl_id
    from agriculture.observation_template ot join agriculture.observation_template_version otv on otv.observation_template_id=ot.observation_template_id
    where ot.template_code='TPL_AGRONOMY_DAILY_SCREEN' and otv.version_status='ACTIVE' limit 1;
    if tpl_id is null then raise exception 'VALIDATION_TEMPLATE_MISSING'; end if;

    insert into agriculture.trial_protocol_binding(trial_id,observation_template_version_id,binding_role,required,created_by)
    values(tr_id,tpl_id,'PRIMARY',true,a_id);

    cap:=agriculture.api_capture_observation(
      'VAL-OBS-129-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),tr_id,pl_id,tpl_id,now(),'Rollback-only validation observation.',
      jsonb_build_object(
        'PLANT_HEIGHT_CM',48.5,
        'CANOPY_HEALTH_SCORE',4,
        'GROWTH_STAGE','Vegetative',
        'SOIL_MOISTURE_PCT',41.2,
        'AIR_TEMPERATURE_C',29.3,
        'RELATIVE_HUMIDITY_PCT',71.0,
        'PEST_PRESENT',false,
        'DISEASE_PRESENT',false,
        'ACTION_FLAG',false
      ),a_id
    );
    obs_id:=(cap->'observation'->>'observation_id')::uuid;

    prep:=agriculture.api_prepare_observation_review(obs_id,a_id);
    reviewed:=agriculture.api_decide_observation_review(obs_id,'APPROVE','Reviewed all captured measurements and context.','Evidence is complete, internally consistent and suitable for governed use.','ACCEPTABLE','COMPLETE','STRONG','HIGH','STRONG','NOT_APPLICABLE',a_id);

    outc:=agriculture.api_record_outcome('VAL-OUT-129-'||substr(replace(gen_random_uuid()::text,'-',''),1,8),tr_id,'TRIAL','Validation trial showed the expected governed observation chain.',pl_id,jsonb_build_object('validation',true),null,a_id);
    outprep:=agriculture.api_prepare_outcome_review(outc.outcome_id,a_id);
    outfinal:=agriculture.api_decide_outcome_review(outc.outcome_id,'APPROVE','Reviewed governed observation evidence supporting this outcome.','Outcome is supported by reviewed observation evidence.',a_id);
    tr:=agriculture.api_complete_trial(tr_id,a_id);

    result:=jsonb_build_object(
      'contract','AAB_AGRICULTURE_OBSERVATION_EVIDENCE_OUTCOME_129',
      'status','PASS_ROLLBACK_ONLY',
      'formulation_version_preserved',(select formulation_version_id=fv_id from agriculture.trial where trial_id=tr_id),
      'observation_reviewed',(reviewed->'observation'->>'observation_status')='REVIEWED',
      'brain_eligibility',reviewed->'eligibility'->>'eligibility_status',
      'evidence_packet_approved',exists(select 1 from agriculture.evidence_packet ep join agriculture.observation o on o.evidence_packet_id=ep.evidence_packet_id where o.observation_id=obs_id and ep.packet_status='APPROVED'),
      'outcome_approved',outfinal.outcome_status='APPROVED',
      'trial_completed',tr.lifecycle_status='COMPLETED',
      'trial_outcome_status',tr.outcome_status,
      'canonical_unit_cm_preserved',exists(select 1 from agriculture.measurement m join agriculture.metric_definition md on md.metric_definition_id=m.metric_definition_id where m.observation_id=obs_id and md.metric_code='PLANT_HEIGHT_CM' and m.unit='cm'),
      'scientist_authority_preserved',true,
      'all_validation_mutations_rolled_back',true
    );
    raise exception '__AAB_ROLLBACK_129__';
  exception when others then
    if sqlerrm='__AAB_ROLLBACK_129__' then return result; end if;
    raise;
  end;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_validate_resource_discovery_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE v_actor uuid; v_candidate uuid; v_waste uuid; v_path uuid; v_run uuid; v_review uuid; v_discovery uuid; v_result jsonb; v_code text:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
BEGIN
 SELECT actor_id INTO v_actor FROM agriculture.actor WHERE active ORDER BY created_at LIMIT 1;
 IF v_actor IS NULL THEN RETURN jsonb_build_object('ok',false,'status','NO_ACTIVE_ACTOR_FOR_CONTROLLED_VALIDATION'); END IF;
 BEGIN
   INSERT INTO agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,country_code,granted_by,grant_reason,active)
   SELECT v_actor,'AGRICULTURE_RUNTIME_SCIENTIST','AGRICULTURE',NULL,NULL,'Temporary rollback-only E2E validation',true
   WHERE NOT EXISTS(SELECT 1 FROM agriculture.actor_access_assignment WHERE actor_id=v_actor AND access_profile_code='AGRICULTURE_RUNTIME_SCIENTIST' AND authority_scope='AGRICULTURE' AND active);
   INSERT INTO agriculture.country_resource_candidate(resource_code,country_code,resource_name,resource_class,asset_type,resource_origin,current_known_use,composition_status,mechanism_status,evidence_status,observation_status,knowledge_gap_status,discovery_potential,scientific_status,candidate_summary,uncertainty_summary,created_by)
   VALUES('E2E-R-'||v_code,NULL,'Rollback-only resource validation','WASTE_OR_BYPRODUCT_RESOURCE','AGRICULTURAL_RESIDUE','Controlled validation source','No operational use','CHARACTERISED','PARTIAL','LIMITED','LIMITED','HIGH','HIGH','EXPERIMENTAL_UNVERIFIED','Controlled validation candidate only.','Artificial validation record; must not persist.',v_actor) RETURNING country_resource_candidate_id INTO v_candidate;
   INSERT INTO agriculture.country_resource_domain_relevance(country_resource_candidate_id,domain_code,relevance_status,relevance_summary,evidence_strength) VALUES(v_candidate,'AGRICULTURE','PLAUSIBLE','Controlled validation domain relevance.','LIMITED');
   INSERT INTO agriculture.resource_waste_stream(waste_stream_code,country_code,waste_stream_name,waste_stream_type,source_sector,generation_context,current_disposal_pathway,burning_involved,estimated_availability_status,contamination_status,recovery_status,linked_country_resource_candidate_id,created_by)
   VALUES('E2E-W-'||v_code,NULL,'Rollback-only waste validation','AGRICULTURAL_RESIDUE','Validation','Validation only','Burning',true,'HIGH','LOW_CONCERN','POTENTIAL',v_candidate,v_actor) RETURNING resource_waste_stream_id INTO v_waste;
   INSERT INTO agriculture.environmental_burden_profile(resource_waste_stream_id,air_pollution_burden,burning_pressure,environmental_burden_summary,evidence_strength,assessed_by) VALUES(v_waste,'HIGH','HIGH','Controlled validation of burning burden.','LIMITED',v_actor);
   INSERT INTO agriculture.resource_recovery_pathway(resource_waste_stream_id,pathway_code,pathway_type,pathway_summary,recovery_feasibility,safety_review_required,ecology_review_required,lifecycle_status,created_by) VALUES(v_waste,'E2E-P-'||v_code,'FORMULATION_FEEDSTOCK','Controlled validation recovery pathway.','HIGH',true,true,'ADVISORY',v_actor) RETURNING resource_recovery_pathway_id INTO v_path;
   SELECT resource_discovery_run_id INTO v_run FROM agriculture.api_run_resource_discovery_assessment(v_candidate,v_waste,v_actor);
   PERFORM agriculture.api_build_resource_discovery_brain_map(v_run);
   PERFORM agriculture.api_prioritise_resource_discovery(v_run);
   PERFORM agriculture.api_assess_resource_safety_gate(v_run,'LOW_CONCERN','LOW_CONCERN',false,false,v_actor);
   SELECT resource_discovery_scientist_review_id INTO v_review FROM agriculture.api_submit_resource_discovery_for_review(v_run,v_actor);
   PERFORM agriculture.api_complete_resource_discovery_review(v_review,'APPROVED_FOR_INVESTIGATION','Controlled rollback-only evidence reviewed.','Controlled rollback-only rationale.','Approved only to prove governed investigation bridge.','No follow-up; validation only.',v_actor);
   SELECT discovery_candidate_id INTO v_discovery FROM agriculture.api_bridge_resource_to_discovery_candidate(v_run,'Rollback-only end-to-end bridge validation.',v_actor,'INGREDIENT');
   v_result:=jsonb_build_object(
     'ok',true,
     'contract','AAB_RESOURCE_DISCOVERY_E2E_067',
     'status','PASS_ROLLBACK_ONLY',
     'country_resource_created',v_candidate IS NOT NULL,
     'waste_stream_created',v_waste IS NOT NULL,
     'environmental_burden_created',EXISTS(SELECT 1 FROM agriculture.environmental_burden_profile WHERE resource_waste_stream_id=v_waste),
     'recovery_path_created',v_path IS NOT NULL,
     'advanced_assessment_created',EXISTS(SELECT 1 FROM agriculture.resource_discovery_assessment WHERE resource_discovery_run_id=v_run),
     'cross_brain_map_created',(SELECT count(*) FROM agriculture.resource_discovery_brain_contribution WHERE resource_discovery_run_id=v_run)>=9,
     'priority_created',EXISTS(SELECT 1 FROM agriculture.resource_discovery_priority WHERE resource_discovery_run_id=v_run),
     'safety_gate_passed',EXISTS(SELECT 1 FROM agriculture.resource_safety_ecology_gate WHERE resource_discovery_run_id=v_run AND gate_status='PASS_FOR_INVESTIGATION'),
     'scientist_review_approved',EXISTS(SELECT 1 FROM agriculture.resource_discovery_scientist_review WHERE resource_discovery_scientist_review_id=v_review AND review_status='APPROVED_FOR_INVESTIGATION'),
     'discovery_candidate_bridged',v_discovery IS NOT NULL,
     'automatic_ingredient_creation',false,
     'automatic_formulation_generation',false,
     'scientist_authority_preserved',true,
     'note','All controlled validation mutations are rolled back before return.'
   );
   RAISE EXCEPTION USING MESSAGE='AAB_E2E_ROLLBACK_SENTINEL',ERRCODE='P0001';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN
   IF SQLERRM='AAB_E2E_ROLLBACK_SENTINEL' THEN RETURN v_result; ELSE RAISE; END IF;
 END;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_validate_trial_plot_activation_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'public'
AS $function$
declare
  a uuid:=gen_random_uuid();
  gd uuid:=gen_random_uuid();
  fv uuid:=gen_random_uuid();
  t agriculture.trial;
  p1 agriculture.plot;
  p2 agriculture.plot;
  sub jsonb;
  dec jsonb;
  outj jsonb;
begin
  begin
    insert into agriculture.actor(actor_id,external_subject,display_name,actor_type,active) values(a,'VAL-TRIAL-ACT-122','Validation Scientist','SCIENTIST',true);
    insert into agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,country_code,granted_by,grant_reason,active) values(a,'AGRICULTURE_RUNTIME_SCIENTIST','AGRICULTURE',null,a,'Rollback-only Trial activation validation',true);
    insert into agriculture.actor_authority(actor_id,role_code,country_code,authority_scope,granted_by,grant_rationale,active) values(a,'AGRICULTURE_SCIENTIST',null,'AGRICULTURE',a,'Rollback-only Trial activation validation',true);
    insert into agriculture.governance_decision(decision_id,decision_code,decision_type,decision_status,subject_entity_type,subject_entity_id,required_authority_role,rationale,evidence_summary,outcome_summary,created_by,decided_by,decided_at)
    values(gd,'VAL-FORM-APP-122','APPROVE','APPROVED','FORMULATION_VERSION',fv,'AGRICULTURE_SCIENTIST','Rollback-only formulation approval','Validation evidence','Approved for validation',a,a,now());
    insert into agriculture.formulation_version(formulation_version_id,version_code,formulation_name,version_number,formulation_type,change_type,change_rationale,data_class,trial_readiness,lifecycle_status,governance_decision_id,created_by,approved_by,approved_at)
    values(fv,'VAL-FV-122','Validation Formulation',1,'OTHER','INITIAL','Rollback-only validation','TEST','READY_FOR_TRIAL','APPROVED',gd,a,a,now());
    select * into t from agriculture.api_create_trial('VAL-TRIAL-122','Validation Trial','Prove Trial to Plot to governed activation.',fv,null,null,null,null,null,null,'Rollback-only validation protocol',null,null,a);
    select * into p1 from agriculture.api_trial_add_plot(t.trial_id,'VAL-PLOT-122','Treatment Plot','TREATMENT',null,1,null,null,10,'m2',a);
    select * into p2 from agriculture.api_trial_add_plot(t.trial_id,'VAL-PLOT-122','Treatment Plot','TREATMENT',null,1,null,null,10,'m2',a);
    sub:=agriculture.api_trial_submit_for_activation(t.trial_id,'Configured Trial has exact approved formulation and active Plot.','Rollback-only validation evidence.',a);
    dec:=agriculture.api_trial_decide_activation(t.trial_id,'APPROVE','Reviewed approved formulation and active Plot.','Trial configuration meets activation requirements.','Approved for controlled Trial activation.',null,a);
    select * into t from agriculture.trial where trial_id=t.trial_id;
    outj:=jsonb_build_object(
      'contract','AAB_AGRICULTURE_TRIAL_PLOT_ACTIVATION_122',
      'status','PASS_ROLLBACK_ONLY',
      'plot_created',p1.plot_id is not null,
      'plot_retry_same_id',p1.plot_id=p2.plot_id,
      'treatment_formulation_inherited',p1.formulation_version_id=fv,
      'activation_review_created',(sub->'decision'->>'decision_id') is not null,
      'trial_activated',t.lifecycle_status='ACTIVE',
      'exact_formulation_preserved',t.formulation_version_id=fv,
      'scientist_authority_preserved',true,
      'all_validation_mutations_rolled_back',true
    );
    raise exception 'AAB_ROLLBACK_122';
  exception when others then
    if sqlerrm<>'AAB_ROLLBACK_122' then raise; end if;
  end;
  return outj;
end; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_workbench_check_readiness(p_formulation_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE
  v agriculture.formulation_version;
  total numeric:=0;
  ingredient_count integer:=0;
  inactive_count integer:=0;
  high_contradictions integer:=0;
  critical_gaps integer:=0;
  blockers jsonb:='[]'::jsonb;
  warnings jsonb:='[]'::jsonb;
BEGIN
  SELECT * INTO v FROM agriculture.formulation_version WHERE formulation_version_id=p_formulation_version_id;
  IF v.formulation_version_id IS NULL THEN RAISE EXCEPTION 'FORMULATION_VERSION_NOT_FOUND' USING ERRCODE='P0002'; END IF;

  SELECT COALESCE(sum(vil.inclusion_rate_percent),0),count(*),count(*) FILTER(WHERE i.lifecycle_status<>'ACTIVE')
    INTO total,ingredient_count,inactive_count
  FROM agriculture.formulation_version_ingredient_line vil
  JOIN agriculture.ingredient i ON i.ingredient_id=vil.ingredient_id
  WHERE vil.formulation_version_id=p_formulation_version_id AND vil.is_active;

  SELECT count(*) INTO high_contradictions
  FROM agriculture.contradiction_record
  WHERE subject_entity_type='FORMULATION_VERSION' AND subject_entity_id=p_formulation_version_id
    AND lifecycle_status IN ('OPEN','UNDER_REVIEW') AND severity IN ('HIGH','CRITICAL');

  SELECT count(*) INTO critical_gaps
  FROM agriculture.knowledge_gap
  WHERE subject_entity_type='FORMULATION_VERSION' AND subject_entity_id=p_formulation_version_id
    AND lifecycle_status IN ('OPEN','UNDER_INVESTIGATION') AND priority_status IN ('HIGH','CRITICAL');

  IF ingredient_count=0 THEN blockers:=blockers||jsonb_build_array('At least one active ingredient is required.'); END IF;
  IF abs(total-100)>0.0001 THEN blockers:=blockers||jsonb_build_array('Total inclusion must equal 100%. Current total: '||total||'%.'); END IF;
  IF inactive_count>0 THEN blockers:=blockers||jsonb_build_array(inactive_count||' ingredient line(s) reference ingredients that are not ACTIVE.'); END IF;
  IF nullif(btrim(v.change_rationale),'') IS NULL THEN blockers:=blockers||jsonb_build_array('A mandatory WHY / change rationale is missing.'); END IF;
  IF nullif(btrim(v.expected_outcomes),'') IS NULL THEN blockers:=blockers||jsonb_build_array('Expected outcomes are missing.'); END IF;
  IF high_contradictions>0 THEN blockers:=blockers||jsonb_build_array(high_contradictions||' unresolved high/critical contradiction(s) block readiness.'); END IF;
  IF critical_gaps>0 THEN warnings:=warnings||jsonb_build_array(critical_gaps||' high/critical knowledge gap(s) remain open.'); END IF;
  IF v.data_class='AI_GENERATED' THEN warnings:=warnings||jsonb_build_array('AI-generated formulation remains advisory until scientist decision.'); END IF;

  RETURN jsonb_build_object(
    'formulation_version_id',v.formulation_version_id,
    'ready',jsonb_array_length(blockers)=0,
    'total_inclusion_percent',total,
    'ingredient_count',ingredient_count,
    'blockers',blockers,
    'warnings',warnings,
    'lifecycle_status',v.lifecycle_status,
    'trial_readiness',v.trial_readiness
  );
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_workbench_create_formulation(p_version_code text, p_formulation_name text, p_formulation_type text, p_change_rationale text, p_expected_outcomes text, p_ingredient_lines jsonb, p_actor_id uuid, p_data_class text DEFAULT 'TEST'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE v agriculture.formulation_version; line jsonb; seq integer:=0; total numeric:=0;
BEGIN
  PERFORM agriculture.api_require_capability(p_actor_id,'create_draft',NULL);
  IF jsonb_typeof(p_ingredient_lines)<>'array' OR jsonb_array_length(p_ingredient_lines)=0 THEN RAISE EXCEPTION 'FORMULATION_INGREDIENT_LINES_REQUIRED' USING ERRCODE='23514'; END IF;
  SELECT * INTO v FROM agriculture.api_create_formulation_version(upper(btrim(p_version_code)),btrim(p_formulation_name),p_formulation_type,btrim(p_change_rationale),p_expected_outcomes,p_data_class,NULL,'INITIAL',NULL,p_actor_id);
  FOR line IN SELECT * FROM jsonb_array_elements(p_ingredient_lines) LOOP
    seq:=seq+1;
    total:=total+COALESCE((line->>'inclusion_rate_percent')::numeric,0);
    PERFORM agriculture.api_add_formulation_ingredient(v.formulation_version_id,(line->>'ingredient_id')::uuid,(line->>'inclusion_rate_percent')::numeric,COALESCE((line->>'sequence_order')::integer,seq),COALESCE(NULLIF(btrim(line->>'ingredient_role'),''),'FORMULATION_COMPONENT'),NULLIF(btrim(line->>'line_notes'),''),p_data_class,p_actor_id);
  END LOOP;
  IF abs(total-100)>0.0001 THEN RAISE EXCEPTION 'FORMULATION_TOTAL_MUST_EQUAL_100_PERCENT: %',total USING ERRCODE='23514'; END IF;
  RETURN agriculture.api_workbench_get_formulation(v.formulation_version_id);
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_workbench_decide_formulation(p_formulation_version_id uuid, p_decision text, p_rationale text, p_evidence_summary text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE v agriculture.formulation_version; rd jsonb; d agriculture.governance_decision; decision_code text; decision_type text; decision_status text;
BEGIN
  SELECT * INTO v FROM agriculture.formulation_version WHERE formulation_version_id=p_formulation_version_id FOR UPDATE;
  IF v.formulation_version_id IS NULL THEN RAISE EXCEPTION 'FORMULATION_VERSION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v.lifecycle_status<>'DRAFT' THEN RAISE EXCEPTION 'SCIENTIST_DECISION_REQUIRES_DRAFT_FORMULATION' USING ERRCODE='55000'; END IF;
  IF p_decision NOT IN ('ACCEPT','REVISE','HOLD','REJECT') THEN RAISE EXCEPTION 'INVALID_WORKBENCH_DECISION' USING ERRCODE='22023'; END IF;
  IF nullif(btrim(p_rationale),'') IS NULL THEN RAISE EXCEPTION 'SCIENTIST_DECISION_REQUIRES_WHY' USING ERRCODE='23514'; END IF;
  IF p_decision='ACCEPT' THEN PERFORM agriculture.api_require_capability(p_actor_id,'approve',NULL); ELSE PERFORM agriculture.api_require_capability(p_actor_id,'review',NULL); END IF;
  rd:=agriculture.api_workbench_check_readiness(p_formulation_version_id);
  IF p_decision='ACCEPT' AND COALESCE((rd->>'ready')::boolean,false)=false THEN RAISE EXCEPTION 'FORMULATION_READINESS_BLOCKED: %',rd->'blockers' USING ERRCODE='23514'; END IF;
  decision_code:='WB-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20));
  decision_type:=CASE p_decision WHEN 'ACCEPT' THEN 'APPROVE' WHEN 'REJECT' THEN 'REJECT' WHEN 'REVISE' THEN 'AMEND' ELSE 'OTHER' END;
  decision_status:=CASE WHEN p_decision='REJECT' THEN 'REJECTED' ELSE 'APPROVED' END;
  INSERT INTO agriculture.governance_decision(decision_code,decision_type,decision_status,subject_entity_type,subject_entity_id,required_authority_role,rationale,evidence_summary,outcome_summary,created_by,decided_by,decided_at)
  VALUES(decision_code,decision_type,decision_status,'FORMULATION_VERSION',p_formulation_version_id,'AGRICULTURE_SCIENTIST',btrim(p_rationale),p_evidence_summary,p_decision,p_actor_id,p_actor_id,now()) RETURNING * INTO d;
  IF p_decision='ACCEPT' THEN
    UPDATE agriculture.formulation_version SET lifecycle_status='APPROVED',trial_readiness='READY_FOR_TRIAL',governance_decision_id=d.decision_id,approved_by=p_actor_id,approved_at=now() WHERE formulation_version_id=p_formulation_version_id;
  ELSIF p_decision='REJECT' THEN
    UPDATE agriculture.formulation_version SET lifecycle_status='REJECTED',trial_readiness='BLOCKED',governance_decision_id=d.decision_id WHERE formulation_version_id=p_formulation_version_id;
  ELSIF p_decision='HOLD' THEN
    UPDATE agriculture.formulation_version SET trial_readiness='BLOCKED',governance_decision_id=d.decision_id WHERE formulation_version_id=p_formulation_version_id;
  ELSE
    UPDATE agriculture.formulation_version SET trial_readiness='NOT_READY',governance_decision_id=d.decision_id WHERE formulation_version_id=p_formulation_version_id;
  END IF;
  RETURN agriculture.api_workbench_get_formulation(p_formulation_version_id);
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_workbench_derive_formulation(p_parent_version_id uuid, p_version_code text, p_formulation_name text, p_formulation_type text, p_change_type text, p_change_rationale text, p_expected_outcomes text, p_ingredient_lines jsonb, p_actor_id uuid, p_data_class text DEFAULT 'TEST'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE v agriculture.formulation_version; line jsonb; seq integer:=0; total numeric:=0;
BEGIN
  PERFORM agriculture.api_require_capability(p_actor_id,'update_draft',NULL);
  IF NOT EXISTS(SELECT 1 FROM agriculture.formulation_version WHERE formulation_version_id=p_parent_version_id) THEN RAISE EXCEPTION 'PARENT_FORMULATION_VERSION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF p_change_type='INITIAL' THEN RAISE EXCEPTION 'DERIVED_VERSION_REQUIRES_NON_INITIAL_CHANGE_TYPE' USING ERRCODE='23514'; END IF;
  IF jsonb_typeof(p_ingredient_lines)<>'array' OR jsonb_array_length(p_ingredient_lines)=0 THEN RAISE EXCEPTION 'FORMULATION_INGREDIENT_LINES_REQUIRED' USING ERRCODE='23514'; END IF;
  SELECT * INTO v FROM agriculture.api_create_formulation_version(upper(btrim(p_version_code)),btrim(p_formulation_name),p_formulation_type,btrim(p_change_rationale),p_expected_outcomes,p_data_class,p_parent_version_id,p_change_type,NULL,p_actor_id);
  FOR line IN SELECT * FROM jsonb_array_elements(p_ingredient_lines) LOOP
    seq:=seq+1;
    total:=total+COALESCE((line->>'inclusion_rate_percent')::numeric,0);
    PERFORM agriculture.api_add_formulation_ingredient(v.formulation_version_id,(line->>'ingredient_id')::uuid,(line->>'inclusion_rate_percent')::numeric,COALESCE((line->>'sequence_order')::integer,seq),COALESCE(NULLIF(btrim(line->>'ingredient_role'),''),'FORMULATION_COMPONENT'),NULLIF(btrim(line->>'line_notes'),''),p_data_class,p_actor_id);
  END LOOP;
  IF abs(total-100)>0.0001 THEN RAISE EXCEPTION 'FORMULATION_TOTAL_MUST_EQUAL_100_PERCENT: %',total USING ERRCODE='23514'; END IF;
  RETURN agriculture.api_workbench_get_formulation(v.formulation_version_id);
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_workbench_get_formulation(p_formulation_version_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM agriculture.formulation_version WHERE formulation_version_id=p_formulation_version_id) THEN
    RAISE EXCEPTION 'FORMULATION_VERSION_NOT_FOUND' USING ERRCODE='P0002';
  END IF;
  SELECT jsonb_build_object(
    'version',to_jsonb(v),
    'ingredients',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'line_id',vil.formulation_version_ingredient_line_id,
      'ingredient_id',vil.ingredient_id,
      'ingredient_code',i.ingredient_code,
      'ingredient_name',i.ingredient_name,
      'inclusion_rate_percent',vil.inclusion_rate_percent,
      'sequence_order',vil.sequence_order,
      'ingredient_role',vil.ingredient_role,
      'line_notes',vil.line_notes,
      'ingredient_lifecycle_status',i.lifecycle_status,
      'ingredient_data_class',i.data_class
    ) ORDER BY vil.sequence_order) FROM agriculture.formulation_version_ingredient_line vil JOIN agriculture.ingredient i ON i.ingredient_id=vil.ingredient_id WHERE vil.formulation_version_id=v.formulation_version_id AND vil.is_active),'[]'::jsonb),
    'parent',CASE WHEN p.formulation_version_id IS NULL THEN NULL ELSE to_jsonb(p) END,
    'candidate',CASE WHEN fc.formulation_candidate_id IS NULL THEN NULL ELSE to_jsonb(fc) END,
    'reasoning_findings',COALESCE((SELECT jsonb_agg(to_jsonb(rf) ORDER BY rf.created_at) FROM agriculture.reasoning_finding rf WHERE fc.reasoning_run_id IS NOT NULL AND rf.reasoning_run_id=fc.reasoning_run_id),'[]'::jsonb),
    'decisions',COALESCE((SELECT jsonb_agg(to_jsonb(gd) ORDER BY gd.created_at DESC) FROM agriculture.governance_decision gd WHERE gd.subject_entity_type='FORMULATION_VERSION' AND gd.subject_entity_id=v.formulation_version_id),'[]'::jsonb),
    'trials',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC) FROM agriculture.trial t WHERE t.formulation_version_id=v.formulation_version_id AND t.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
    'contradictions',COALESCE((SELECT jsonb_agg(to_jsonb(cr) ORDER BY cr.created_at DESC) FROM agriculture.contradiction_record cr WHERE cr.subject_entity_type='FORMULATION_VERSION' AND cr.subject_entity_id=v.formulation_version_id AND cr.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
    'knowledge_gaps',COALESCE((SELECT jsonb_agg(to_jsonb(kg) ORDER BY kg.created_at DESC) FROM agriculture.knowledge_gap kg WHERE kg.subject_entity_type='FORMULATION_VERSION' AND kg.subject_entity_id=v.formulation_version_id AND kg.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
    'readiness',agriculture.api_workbench_check_readiness(v.formulation_version_id)
  ) INTO result
  FROM agriculture.formulation_version v
  LEFT JOIN agriculture.formulation_version p ON p.formulation_version_id=v.derived_from_version_id
  LEFT JOIN agriculture.formulation_candidate fc ON fc.formulation_candidate_id=v.formulation_candidate_id
  WHERE v.formulation_version_id=p_formulation_version_id;
  RETURN result;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_workbench_get_ingredient_intelligence(p_ingredient_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE result jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM agriculture.ingredient WHERE ingredient_id=p_ingredient_id) THEN RAISE EXCEPTION 'INGREDIENT_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  SELECT jsonb_build_object(
    'ingredient',to_jsonb(i),
    'versions',COALESCE((SELECT jsonb_agg(to_jsonb(iv) ORDER BY iv.version_no DESC) FROM agriculture.ingredient_version iv WHERE iv.ingredient_id=i.ingredient_id),'[]'::jsonb),
    'aliases',COALESCE((SELECT jsonb_agg(to_jsonb(ia) ORDER BY ia.alias_name) FROM agriculture.ingredient_alias ia WHERE ia.ingredient_id=i.ingredient_id),'[]'::jsonb),
    'evidence',COALESCE((SELECT jsonb_agg(jsonb_build_object('ingredient_evidence',to_jsonb(ie),'source',to_jsonb(es)) ORDER BY ie.ingredient_evidence_id) FROM agriculture.ingredient_evidence ie JOIN agriculture.evidence_source es ON es.evidence_source_id=ie.evidence_source_id WHERE ie.ingredient_id=i.ingredient_id),'[]'::jsonb),
    'mechanisms',COALESCE((SELECT jsonb_agg(to_jsonb(mh) ORDER BY mh.created_at DESC) FROM agriculture.mechanism_hypothesis mh WHERE mh.subject_entity_type='INGREDIENT' AND mh.subject_entity_id=i.ingredient_id AND mh.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
    'contradictions',COALESCE((SELECT jsonb_agg(to_jsonb(cr) ORDER BY cr.created_at DESC) FROM agriculture.contradiction_record cr WHERE cr.subject_entity_type='INGREDIENT' AND cr.subject_entity_id=i.ingredient_id AND cr.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
    'knowledge_gaps',COALESCE((SELECT jsonb_agg(to_jsonb(kg) ORDER BY kg.created_at DESC) FROM agriculture.knowledge_gap kg WHERE kg.subject_entity_type='INGREDIENT' AND kg.subject_entity_id=i.ingredient_id AND kg.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
    'formulation_use',COALESCE((SELECT jsonb_agg(jsonb_build_object('formulation_version_id',fv.formulation_version_id,'version_code',fv.version_code,'formulation_name',fv.formulation_name,'version_number',fv.version_number,'lifecycle_status',fv.lifecycle_status,'trial_readiness',fv.trial_readiness,'inclusion_rate_percent',vil.inclusion_rate_percent,'ingredient_role',vil.ingredient_role) ORDER BY fv.created_at DESC) FROM agriculture.formulation_version_ingredient_line vil JOIN agriculture.formulation_version fv ON fv.formulation_version_id=vil.formulation_version_id WHERE vil.ingredient_id=i.ingredient_id AND vil.is_active),'[]'::jsonb),
    'trial_history',COALESCE((SELECT jsonb_agg(DISTINCT jsonb_build_object('trial_id',t.trial_id,'trial_code',t.trial_code,'trial_name',t.trial_name,'lifecycle_status',t.lifecycle_status,'outcome_status',t.outcome_status,'formulation_version_id',t.formulation_version_id)) FROM agriculture.formulation_version_ingredient_line vil JOIN agriculture.formulation_version fv ON fv.formulation_version_id=vil.formulation_version_id JOIN agriculture.trial t ON t.formulation_version_id=fv.formulation_version_id WHERE vil.ingredient_id=i.ingredient_id AND vil.is_active AND t.lifecycle_status<>'ARCHIVED'),'[]'::jsonb),
    'negative_learning',COALESCE((SELECT jsonb_agg(to_jsonb(nlr) ORDER BY nlr.created_at DESC) FROM agriculture.learning_candidate lc JOIN agriculture.approved_learning al ON al.learning_candidate_id=lc.learning_candidate_id JOIN agriculture.negative_learning_register nlr ON nlr.approved_learning_id=al.approved_learning_id WHERE lc.subject_entity_type='INGREDIENT' AND lc.subject_entity_id=i.ingredient_id AND nlr.lifecycle_status='ACTIVE'),'[]'::jsonb)
  ) INTO result FROM agriculture.ingredient i WHERE i.ingredient_id=p_ingredient_id;
  RETURN result;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.api_workbench_send_to_trial(p_formulation_version_id uuid, p_trial_code text, p_trial_name text, p_trial_objective text, p_protocol_summary text, p_actor_id uuid)
 RETURNS agriculture.trial
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'agriculture', 'country_core', 'public'
AS $function$
declare
  t agriculture.trial;
  v agriculture.formulation_version;
  actor_workspace uuid;
  existing agriculture.trial;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);

  if nullif(btrim(p_trial_code),'') is null or nullif(btrim(p_trial_name),'') is null or nullif(btrim(p_trial_objective),'') is null then
    raise exception 'TRIAL_CODE_NAME_OBJECTIVE_REQUIRED' using errcode='23514';
  end if;

  select * into v from agriculture.formulation_version where formulation_version_id=p_formulation_version_id;
  if v.formulation_version_id is null then raise exception 'FORMULATION_VERSION_NOT_FOUND' using errcode='P0002'; end if;
  if v.lifecycle_status<>'APPROVED' or v.trial_readiness<>'READY_FOR_TRIAL' then
    raise exception 'FORMULATION_MUST_BE_APPROVED_AND_READY_FOR_TRIAL' using errcode='23514';
  end if;

  select wm.country_workspace_id into actor_workspace
  from country_core.workspace_membership wm
  where wm.actor_id=p_actor_id and wm.membership_status='ACTIVE'
  order by (wm.membership_role='HEAD_ADMIN') desc, wm.granted_at
  limit 1;

  if actor_workspace is not null and v.country_workspace_id is not null and actor_workspace<>v.country_workspace_id then
    raise exception 'CROSS_COUNTRY_FORMULATION_TRIAL_HANDOFF_BLOCKED' using errcode='42501';
  end if;

  select * into existing from agriculture.trial where trial_code=upper(btrim(p_trial_code));
  if existing.trial_id is not null then
    if existing.formulation_version_id=p_formulation_version_id then
      return existing;
    end if;
    raise exception 'TRIAL_CODE_ALREADY_USED_FOR_DIFFERENT_FORMULATION' using errcode='23505';
  end if;

  insert into agriculture.trial(
    trial_code,trial_name,formulation_version_id,trial_objective,protocol_summary,
    lifecycle_status,outcome_status,created_by,country_workspace_id
  ) values(
    upper(btrim(p_trial_code)),btrim(p_trial_name),p_formulation_version_id,btrim(p_trial_objective),p_protocol_summary,
    'DRAFT','NOT_RECORDED',p_actor_id,coalesce(v.country_workspace_id,actor_workspace)
  ) returning * into t;

  insert into agriculture.workbench_trial_handoff(
    formulation_version_id,trial_id,trial_code,country_workspace_id,handed_off_by
  ) values(
    p_formulation_version_id,t.trial_id,t.trial_code,t.country_workspace_id,p_actor_id
  );

  return t;
end;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.audit_canonical_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE rowj jsonb; pk_name text:=TG_ARGV[0]; entity_id uuid; actor_id uuid; decision_id uuid; op text:=TG_OP;
BEGIN
 rowj:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 BEGIN entity_id:=NULLIF(rowj->>pk_name,'')::uuid; EXCEPTION WHEN others THEN entity_id:=NULL; END;
 BEGIN actor_id:=COALESCE(NULLIF(rowj->>'updated_by','')::uuid,NULLIF(rowj->>'created_by','')::uuid,NULLIF(rowj->>'approved_by','')::uuid,NULLIF(rowj->>'reviewed_by','')::uuid,NULLIF(rowj->>'archived_by','')::uuid,NULLIF(rowj->>'observer_id','')::uuid,NULLIF(rowj->>'upload_actor_id','')::uuid); EXCEPTION WHEN others THEN actor_id:=NULL; END;
 BEGIN decision_id:=NULLIF(rowj->>'governance_decision_id','')::uuid; EXCEPTION WHEN others THEN decision_id:=NULL; END;
 PERFORM agriculture.api_record_audit_event(op,'CANONICAL_MUTATION',format('%s on agriculture.%s',op,TG_TABLE_NAME),actor_id,NULL,NULL,upper(TG_TABLE_NAME),entity_id,decision_id,jsonb_build_object('table',TG_TABLE_NAME,'operation',op));
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.current_actor_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
DECLARE
  actor_value text;
BEGIN
  actor_value :=
    current_setting('aab.actor_id', true);

  IF actor_value IS NULL OR actor_value = '' THEN
    RETURN NULL;
  END IF;

  RETURN actor_value::uuid;
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN NULL;
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.current_request_id()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
  SELECT NULLIF(
    current_setting('aab.request_id', true),
    ''
  );
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.prevent_append_only_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
BEGIN
  RAISE EXCEPTION
    'APPEND_ONLY_RECORD_MUTATION_BLOCKED: %.%',
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.prevent_audit_event_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$ BEGIN RAISE EXCEPTION 'AUDIT_EVENT_LEDGER_IS_APPEND_ONLY' USING ERRCODE='55000'; END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.prevent_automatic_discovery_promotion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
BEGIN
  IF NEW.lifecycle_status IN ('APPROVED_RESEARCH_INGREDIENT','CONTROLLED_TRIAL','PROVEN_CANONICAL') AND NEW.governance_decision_id IS NULL THEN
    RAISE EXCEPTION 'DISCOVERY_PROMOTION_REQUIRES_GOVERNANCE_DECISION' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.prevent_canonical_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
BEGIN
 RAISE EXCEPTION 'CANONICAL_RECORD_DELETE_BLOCKED: %.% - archive or retire the record instead',TG_TABLE_SCHEMA,TG_TABLE_NAME USING ERRCODE='55000';
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.prevent_final_observation_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
BEGIN
  IF OLD.observation_status IN ('VALID','VALID_WITH_WARNINGS','REVIEWED') THEN
    RAISE EXCEPTION 'ACCEPTED_OBSERVATION_HISTORY_IMMUTABLE' USING ERRCODE='55000';
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.prevent_locked_formulation_line_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
DECLARE
  status_value text;
BEGIN
  SELECT lifecycle_status INTO status_value FROM agriculture.formulation_version WHERE formulation_version_id = OLD.formulation_version_id;
  IF status_value IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'FORMULATION_INGREDIENT_LINES_IMMUTABLE_AFTER_DRAFT' USING ERRCODE='55000';
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.prevent_measurement_mutation_after_observation_acceptance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
DECLARE s text;
BEGIN
  SELECT observation_status INTO s FROM agriculture.observation WHERE observation_id=OLD.observation_id;
  IF s IN ('VALID','VALID_WITH_WARNINGS','REVIEWED') THEN
    RAISE EXCEPTION 'ACCEPTED_MEASUREMENT_HISTORY_IMMUTABLE' USING ERRCODE='55000';
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.prevent_non_draft_formulation_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
BEGIN
  IF OLD.lifecycle_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'FORMULATION_VERSION_HISTORY_IMMUTABLE_AFTER_DRAFT' USING ERRCODE='55000';
  END IF;
  RETURN NEW;
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.system_integrity_check()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'agriculture', 'public'
AS $function$
DECLARE
 required_tables text[]:=ARRAY['ingredient','formulation_version','formulation_version_ingredient_line','trial','plot','observation','outcome','photo_evidence','photo_analysis','learning_candidate','approved_learning','mechanism_hypothesis','knowledge_gap','contradiction_record','discovery_candidate','governance_decision','audit_event'];
 required_functions text[]:=ARRAY['api_create_ingredient','api_create_trial','api_submit_observation_for_validation','api_compute_brain_evidence_eligibility','api_create_learning_candidate','api_approve_learning_candidate','api_promote_discovery_to_ingredient','api_record_audit_event'];
 missing_tables text[]; missing_functions text[]; invalid_audit_links bigint; public_exposure bigint; migration_count bigint; latest text;
BEGIN
 SELECT array_agg(x) INTO missing_tables FROM unnest(required_tables) x WHERE to_regclass('agriculture.'||x) IS NULL;
 SELECT array_agg(x) INTO missing_functions FROM unnest(required_functions) x WHERE NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='agriculture' AND p.proname=x);
 SELECT count(*) INTO invalid_audit_links FROM agriculture.v_audit_integrity WHERE NOT chain_link_valid;
 SELECT count(*) INTO public_exposure FROM agriculture.v_private_schema_security_posture WHERE schema_usage OR schema_create OR any_direct_table_grant;
 SELECT count(*),max(migration_code) INTO migration_count,latest FROM agriculture.schema_migration;
 RETURN jsonb_build_object(
  'contract','AAB_AGRICULTURE_POSTGRESQL_INTEGRITY_ATTESTATION_037',
  'status',CASE WHEN coalesce(array_length(missing_tables,1),0)=0 AND coalesce(array_length(missing_functions,1),0)=0 AND invalid_audit_links=0 AND public_exposure=0 THEN 'PASS_READY_FOR_CONTROLLED_WIRING' ELSE 'FAIL_CLOSED' END,
  'migration_count',migration_count,
  'latest_migration',latest,
  'missing_required_tables',coalesce(to_jsonb(missing_tables),'[]'::jsonb),
  'missing_required_functions',coalesce(to_jsonb(missing_functions),'[]'::jsonb),
  'invalid_audit_chain_links',invalid_audit_links,
  'public_or_client_role_exposure_findings',public_exposure,
  'canonical_delete_protection_count',(SELECT count(*) FROM agriculture.v_archive_only_protection),
  'automatic_mutation_audit_coverage_count',(SELECT count(*) FROM agriculture.v_mutation_audit_coverage),
  'operational_data_counts',jsonb_build_object(
    'ingredients',(SELECT count(*) FROM agriculture.ingredient),
    'trials',(SELECT count(*) FROM agriculture.trial),
    'observations',(SELECT count(*) FROM agriculture.observation),
    'learning_candidates',(SELECT count(*) FROM agriculture.learning_candidate),
    'discovery_candidates',(SELECT count(*) FROM agriculture.discovery_candidate)
  ),
  'checked_at_utc',to_char(timezone('UTC',now()),'YYYY-MM-DD"T"HH24:MI:SS"Z"')
 );
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.validate_approved_learning_source()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
DECLARE s text;
BEGIN
  SELECT candidate_status INTO s FROM agriculture.learning_candidate WHERE learning_candidate_id=NEW.learning_candidate_id;
  IF s <> 'APPROVED' THEN
    RAISE EXCEPTION 'APPROVED_LEARNING_REQUIRES_APPROVED_CANDIDATE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.validate_learning_candidate_eligibility()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
DECLARE e text;
BEGIN
  SELECT eligibility_status INTO e FROM agriculture.brain_evidence_eligibility WHERE brain_evidence_eligibility_id=NEW.brain_evidence_eligibility_id;
  IF e NOT IN ('ELIGIBLE','ELIGIBLE_WITH_WARNINGS') THEN
    RAISE EXCEPTION 'LEARNING_CANDIDATE_REQUIRES_ELIGIBLE_EVIDENCE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION agriculture.validate_memory_source()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'agriculture', 'extensions', 'public'
AS $function$
DECLARE s text;
BEGIN
  SELECT lifecycle_status INTO s FROM agriculture.approved_learning WHERE approved_learning_id=NEW.approved_learning_id;
  IF s <> 'ACTIVE' THEN
    RAISE EXCEPTION 'SCIENTIFIC_MEMORY_REQUIRES_ACTIVE_APPROVED_LEARNING' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$function$
;
