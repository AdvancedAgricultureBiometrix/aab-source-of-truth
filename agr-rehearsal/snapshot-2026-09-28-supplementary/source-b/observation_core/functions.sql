-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: observation_core. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for observation_core: functions 22, tables 10, views 9, sequences 0, rls_enabled_tables 0, constraints 71, triggers 0, policies 0, indexes 28.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_actor_can_attach_community_photo(p_actor_id uuid, p_observation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
SELECT EXISTS(SELECT 1 FROM observation_core.community_submission cs JOIN observation_core.community_participant_profile cp ON cp.community_participant_profile_id=cs.participant_profile_id WHERE cs.observation_id=p_observation_id AND cp.actor_id=p_actor_id AND cp.active) OR agriculture.api_actor_has_capability(p_actor_id,'review',NULL);
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_attach_photo_evidence(p_observation_id uuid, p_photo_evidence_id uuid)
 RETURNS observation_core.evidence_link
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.evidence_link; pe agriculture.photo_evidence;
BEGIN
 SELECT * INTO pe FROM agriculture.photo_evidence WHERE photo_evidence_id=p_photo_evidence_id;
 IF pe.photo_evidence_id IS NULL THEN RAISE EXCEPTION 'PHOTO_EVIDENCE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF pe.subject_entity_type<>'UNIVERSAL_OBSERVATION' OR pe.subject_entity_id<>p_observation_id THEN RAISE EXCEPTION 'PHOTO_EVIDENCE_SUBJECT_MISMATCH' USING ERRCODE='23514'; END IF;
 INSERT INTO observation_core.evidence_link(observation_id,evidence_type,photo_evidence_id,evidence_summary,review_status)
 VALUES(p_observation_id,'PHOTO',p_photo_evidence_id,'Photo evidence attached to universal observation.',CASE WHEN pe.review_status IN ('APPROVED','APPROVED_WITH_WARNINGS') THEN pe.review_status WHEN pe.review_status='REJECTED' THEN 'REJECTED' ELSE 'PENDING' END)
 ON CONFLICT DO NOTHING RETURNING * INTO r;
 IF r.evidence_link_id IS NULL THEN SELECT * INTO r FROM observation_core.evidence_link WHERE observation_id=p_observation_id AND photo_evidence_id=p_photo_evidence_id LIMIT 1; END IF;
 UPDATE observation_core.community_submission SET submission_status='READY_TO_SUBMIT' WHERE observation_id=p_observation_id AND submission_status='AWAITING_PHOTO';
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_community_country_context()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
SELECT coalesce(jsonb_agg(jsonb_build_object('country_code',country_code,'country_name',country_name,'is_operating_country',is_operating_country) ORDER BY is_operating_country DESC,country_name),'[]'::jsonb)
FROM agriculture.country_scope WHERE active;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_create_campaign(p_campaign_name text, p_country_code character, p_primary_domain_code text, p_campaign_question text, p_purpose text, p_actor_id uuid, p_supporting_domain_codes text[] DEFAULT '{}'::text[], p_target_locations jsonb DEFAULT '[]'::jsonb, p_required_observations jsonb DEFAULT '[]'::jsonb, p_participant_source_modes text[] DEFAULT ARRAY['SCIENTIST'::text, 'FIELD_TECHNICIAN'::text], p_photo_policy text DEFAULT 'REQUIRED'::text, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS observation_core.campaign
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.campaign;
BEGIN
 PERFORM agriculture.api_require_capability(p_actor_id,'create_draft',p_country_code);
 IF NOT EXISTS(SELECT 1 FROM observation_core.domain_adapter WHERE domain_code=upper(btrim(p_primary_domain_code)) AND enabled) THEN RAISE EXCEPTION 'ACTIVE_OBSERVATION_DOMAIN_ADAPTER_REQUIRED' USING ERRCODE='23514'; END IF;
 INSERT INTO observation_core.campaign(campaign_code,campaign_name,country_code,primary_domain_code,supporting_domain_codes,campaign_question,purpose,target_locations,required_observations,participant_source_modes,photo_policy,start_date,end_date,created_by)
 VALUES('CMP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),btrim(p_campaign_name),p_country_code,upper(btrim(p_primary_domain_code)),coalesce(p_supporting_domain_codes,'{}'),btrim(p_campaign_question),btrim(p_purpose),coalesce(p_target_locations,'[]'::jsonb),coalesce(p_required_observations,'[]'::jsonb),coalesce(p_participant_source_modes,ARRAY['SCIENTIST','FIELD_TECHNICIAN']),p_photo_policy,p_start_date,p_end_date,p_actor_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_create_observation(p_domain_code text, p_country_code character, p_observation_type text, p_subject_type text, p_source_mode text, p_observed_at timestamp with time zone, p_brief_description text, p_actor_id uuid, p_subject_reference text DEFAULT NULL::text, p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric, p_location_accuracy_metres numeric DEFAULT NULL::numeric, p_location_description text DEFAULT NULL::text, p_context_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS observation_core.observation
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.observation; c text; a observation_core.domain_adapter; sm text:=upper(btrim(p_source_mode));
BEGIN
 c:=upper(btrim(p_domain_code)); SELECT * INTO a FROM observation_core.domain_adapter WHERE domain_code=c;
 IF a.domain_code IS NULL THEN RAISE EXCEPTION 'OBSERVATION_DOMAIN_ADAPTER_NOT_FOUND: %',c USING ERRCODE='23514'; END IF;
 IF NOT a.enabled THEN RAISE EXCEPTION 'OBSERVATION_DOMAIN_ADAPTER_DISABLED: %',c USING ERRCODE='42501'; END IF;
 IF NOT sm=ANY(a.allowed_source_modes) THEN RAISE EXCEPTION 'OBSERVATION_SOURCE_MODE_NOT_ALLOWED_FOR_DOMAIN' USING ERRCODE='23514'; END IF;
 IF p_actor_id IS NULL OR NOT (agriculture.api_actor_has_capability(p_actor_id,'create_draft',p_country_code) OR (sm IN ('FARMER','PUBLIC','STUDENT','TEACHER') AND agriculture.api_actor_has_capability(p_actor_id,'community_capture',p_country_code))) THEN RAISE EXCEPTION 'OBSERVATION_CREATE_CAPABILITY_DENIED' USING ERRCODE='42501'; END IF;
 IF nullif(btrim(p_brief_description),'') IS NULL THEN RAISE EXCEPTION 'OBSERVATION_DESCRIPTION_REQUIRED' USING ERRCODE='23514'; END IF;
 IF a.location_policy='REQUIRED' AND (p_latitude IS NULL OR p_longitude IS NULL) THEN RAISE EXCEPTION 'OBSERVATION_LOCATION_REQUIRED_FOR_DOMAIN' USING ERRCODE='23514'; END IF;
 INSERT INTO observation_core.observation(observation_code,domain_code,country_code,observation_type,subject_type,subject_reference,source_mode,observer_actor_id,observed_at,latitude,longitude,location_accuracy_metres,location_description,brief_description,context_payload) VALUES('OBS-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),c,p_country_code,upper(btrim(p_observation_type)),upper(btrim(p_subject_type)),p_subject_reference,sm,p_actor_id,p_observed_at,p_latitude,p_longitude,p_location_accuracy_metres,p_location_description,btrim(p_brief_description),coalesce(p_context_payload,'{}'::jsonb)) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_decide_campaign(p_campaign_id uuid, p_decision text, p_rationale text, p_actor_id uuid)
 RETURNS observation_core.campaign
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.campaign; d text:=upper(btrim(p_decision));
BEGIN
 PERFORM agriculture.api_require_capability(p_actor_id,'review',NULL);
 IF d NOT IN ('APPROVE','REJECT') OR nullif(btrim(p_rationale),'') IS NULL THEN RAISE EXCEPTION 'CAMPAIGN_REVIEW_REQUIRES_DECISION_AND_RATIONALE' USING ERRCODE='23514'; END IF;
 UPDATE observation_core.campaign SET lifecycle_status=CASE WHEN d='APPROVE' THEN 'ACTIVE' ELSE 'REJECTED' END,reviewed_by=p_actor_id,review_rationale=btrim(p_rationale),reviewed_at=now(),updated_at=now() WHERE campaign_id=p_campaign_id AND lifecycle_status='UNDER_REVIEW' RETURNING * INTO r;
 IF r.campaign_id IS NULL THEN RAISE EXCEPTION 'CAMPAIGN_NOT_UNDER_REVIEW' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_finalize_community_submission(p_community_submission_id uuid, p_actor_id uuid)
 RETURNS observation_core.community_submission
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.community_submission; photo_count integer;
BEGIN
 SELECT count(*) INTO photo_count FROM observation_core.community_submission cs JOIN observation_core.evidence_link el ON el.observation_id=cs.observation_id WHERE cs.community_submission_id=p_community_submission_id AND el.evidence_type='PHOTO';
 IF photo_count=0 THEN RAISE EXCEPTION 'COMMUNITY_PHOTO_REQUIRED' USING ERRCODE='23514'; END IF;
 UPDATE observation_core.community_submission cs SET submission_status='SUBMITTED',submitted_at=now() FROM observation_core.community_participant_profile cp WHERE cs.community_submission_id=p_community_submission_id AND cs.participant_profile_id=cp.community_participant_profile_id AND cp.actor_id=p_actor_id AND cs.submission_status IN ('AWAITING_PHOTO','READY_TO_SUBMIT') RETURNING cs.* INTO r;
 IF r.community_submission_id IS NULL THEN RAISE EXCEPTION 'COMMUNITY_SUBMISSION_NOT_FINALISABLE' USING ERRCODE='55000'; END IF;
 UPDATE observation_core.observation SET lifecycle_status='VALIDATING',updated_at=now() WHERE observation_id=r.observation_id;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_find_offline_capture(p_actor_id uuid, p_offline_capture_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
SELECT coalesce((SELECT jsonb_build_object('community_submission',to_jsonb(cs),'observation',to_jsonb(o)) FROM observation_core.community_submission cs JOIN observation_core.community_participant_profile cp ON cp.community_participant_profile_id=cs.participant_profile_id JOIN observation_core.observation o ON o.observation_id=cs.observation_id WHERE cp.actor_id=p_actor_id AND cs.offline_capture_id=p_offline_capture_id LIMIT 1),'null'::jsonb);
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_get_community_photo_metadata(p_actor_id uuid, p_photo_evidence_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE allowed boolean:=false; result jsonb;
BEGIN
 SELECT EXISTS(
   SELECT 1 FROM agriculture.photo_evidence pe
   JOIN observation_core.evidence_link el ON el.photo_evidence_id=pe.photo_evidence_id
   JOIN observation_core.observation o ON o.observation_id=el.observation_id
   LEFT JOIN observation_core.community_submission cs ON cs.observation_id=o.observation_id
   LEFT JOIN observation_core.community_participant_profile cp ON cp.community_participant_profile_id=cs.participant_profile_id
   WHERE pe.photo_evidence_id=p_photo_evidence_id AND (cp.actor_id=p_actor_id OR agriculture.api_actor_has_capability(p_actor_id,'review',NULL))
 ) INTO allowed;
 IF NOT allowed THEN RAISE EXCEPTION 'COMMUNITY_PHOTO_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('photo_evidence_id',pe.photo_evidence_id,'storage_provider',pe.storage_provider,'storage_object_key',pe.storage_object_key,'original_filename',pe.original_filename,'media_type',pe.media_type,'file_size_bytes',pe.file_size_bytes,'image_quality_status',pe.image_quality_status,'context_validation_status',pe.context_validation_status,'review_status',pe.review_status,'consent_usage_status',pe.consent_usage_status) INTO result FROM agriculture.photo_evidence pe WHERE pe.photo_evidence_id=p_photo_evidence_id;
 RETURN result;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_get_community_profile(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
SELECT coalesce((SELECT to_jsonb(cp) FROM observation_core.community_participant_profile cp WHERE cp.actor_id=p_actor_id AND cp.active LIMIT 1),'null'::jsonb);
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_link_observation_to_campaign(p_campaign_id uuid, p_observation_id uuid, p_actor_id uuid)
 RETURNS observation_core.campaign_observation
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.campaign_observation; c observation_core.campaign; o observation_core.observation;
BEGIN
 SELECT * INTO c FROM observation_core.campaign WHERE campaign_id=p_campaign_id AND lifecycle_status='ACTIVE';
 SELECT * INTO o FROM observation_core.observation WHERE observation_id=p_observation_id;
 IF c.campaign_id IS NULL OR o.observation_id IS NULL THEN RAISE EXCEPTION 'ACTIVE_CAMPAIGN_AND_OBSERVATION_REQUIRED' USING ERRCODE='23514'; END IF;
 IF c.country_code IS NOT NULL AND o.country_code IS DISTINCT FROM c.country_code THEN RAISE EXCEPTION 'OBSERVATION_COUNTRY_OUTSIDE_CAMPAIGN_SCOPE' USING ERRCODE='23514'; END IF;
 IF NOT (o.source_mode=ANY(c.participant_source_modes)) THEN RAISE EXCEPTION 'OBSERVATION_SOURCE_MODE_NOT_ALLOWED_IN_CAMPAIGN' USING ERRCODE='23514'; END IF;
 INSERT INTO observation_core.campaign_observation(campaign_id,observation_id) VALUES(p_campaign_id,p_observation_id) RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_list_my_community_submissions(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC),'[]'::jsonb) FROM observation_core.v_community_submission_queue q WHERE q.actor_id=p_actor_id;
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_promote_observation_to_evidence(p_observation_id uuid, p_review_summary text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE o observation_core.observation; ep agriculture.evidence_packet; pe agriculture.photo_evidence; gd agriculture.governance_decision; gr agriculture.governance_review; dq agriculture.data_quality_assessment; be agriculture.brain_evidence_eligibility; ev_strength text; method_quality text;
BEGIN
 PERFORM agriculture.api_require_capability(p_actor_id,'approve',NULL);
 SELECT * INTO o FROM observation_core.observation WHERE observation_id=p_observation_id AND lifecycle_status='ACCEPTED';
 IF o.observation_id IS NULL THEN RAISE EXCEPTION 'ACCEPTED_OBSERVATION_REQUIRED' USING ERRCODE='23514'; END IF;
 SELECT pe2.* INTO pe FROM agriculture.photo_evidence pe2 WHERE pe2.subject_entity_type='UNIVERSAL_OBSERVATION' AND pe2.subject_entity_id=p_observation_id AND pe2.image_quality_status IN ('ACCEPTABLE','ACCEPTABLE_WITH_WARNINGS') AND pe2.context_validation_status IN ('VALID','VALID_WITH_WARNINGS') AND pe2.review_status='APPROVED' AND pe2.consent_usage_status IN ('APPROVED_FOR_RESEARCH','RESTRICTED') ORDER BY pe2.created_at LIMIT 1;
 IF pe.photo_evidence_id IS NULL THEN RAISE EXCEPTION 'APPROVED_USABLE_PHOTO_REQUIRED_FOR_UNIVERSAL_OBSERVATION' USING ERRCODE='23514'; END IF;
 ep:=agriculture.api_create_evidence_packet('EVP-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),'OBSERVATION','UNIVERSAL_OBSERVATION',p_observation_id,p_review_summary,p_actor_id);
 PERFORM agriculture.api_add_evidence_packet_item(ep.evidence_packet_id,'OBSERVATION','PRIMARY','UNIVERSAL_OBSERVATION',p_observation_id,NULL,o.brief_description,p_actor_id);
 PERFORM agriculture.api_add_evidence_packet_item(ep.evidence_packet_id,'PHOTO','SUPPORTING','PHOTO_EVIDENCE',pe.photo_evidence_id,NULL,'Approved photo evidence for universal observation.',p_actor_id);
 ep:=agriculture.api_finalize_evidence_packet(ep.evidence_packet_id,p_review_summary,p_actor_id);
 gd:=agriculture.api_create_governance_decision('DEC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),'APPROVE','UNIVERSAL_OBSERVATION',p_observation_id,'AGRICULTURE_SCIENTIST',p_review_summary,'Accepted universal observation with approved photo evidence.',p_actor_id);
 gr:=agriculture.api_create_governance_review('REV-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),'UNIVERSAL_OBSERVATION',p_observation_id,'EVIDENCE','AGRICULTURE_SCIENTIST',gd.decision_id,p_actor_id);
 gr:=agriculture.api_complete_governance_review(gr.review_id,'APPROVED','Reviewed observation, validation history, context and approved photo evidence.',p_review_summary,'Eligible for governed evidence computation.',NULL,p_actor_id);
 gd:=agriculture.api_finalize_governance_decision(gd.decision_id,'APPROVED','Universal observation approved for evidence eligibility computation.',p_actor_id);
 ev_strength:=CASE WHEN o.source_mode IN ('SCIENTIST','LABORATORY','INSTRUMENT') THEN 'STRONG' ELSE 'MODERATE' END;
 method_quality:=CASE WHEN o.source_mode IN ('SCIENTIST','FIELD_TECHNICIAN','LABORATORY','INSTRUMENT') THEN 'HIGH' ELSE 'MODERATE' END;
 dq:=agriculture.api_assess_data_quality('UNIVERSAL_OBSERVATION',p_observation_id,'ACCEPTABLE','COMPLETE','ADEQUATE',method_quality,ev_strength,'ACCEPTABLE',p_review_summary,true,o.input_submission_id,gr.review_id,p_actor_id);
 be:=agriculture.api_compute_brain_evidence_eligibility('UNIVERSAL_OBSERVATION',p_observation_id,ep.evidence_packet_id,gd.decision_id,p_actor_id);
 UPDATE observation_core.observation SET evidence_status=be.eligibility_status,updated_at=now() WHERE observation_id=p_observation_id;
 RETURN jsonb_build_object('observation_id',p_observation_id,'evidence_packet_id',ep.evidence_packet_id,'governance_decision_id',gd.decision_id,'governance_review_id',gr.review_id,'data_quality_assessment_id',dq.data_quality_assessment_id,'eligibility_status',be.eligibility_status);
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_propose_observation_routes(p_observation_id uuid)
 RETURNS SETOF observation_core.route
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE o observation_core.observation; hint text; r observation_core.route; target text;
BEGIN
 SELECT * INTO o FROM observation_core.observation WHERE observation_id=p_observation_id;
 IF o.observation_id IS NULL THEN RAISE EXCEPTION 'OBSERVATION_NOT_FOUND' USING ERRCODE='P0002'; END IF;
 IF o.domain_code<>'COMMUNITY_INTAKE' THEN
   INSERT INTO observation_core.route(observation_id,target_domain_code,route_type,route_reason,proposed_by_type,confidence_status)
   VALUES(o.observation_id,o.domain_code,'PRIMARY','Primary route from the governed observation domain adapter.','RULE_ENGINE','HIGH')
   ON CONFLICT(observation_id,target_domain_code,route_type) DO UPDATE SET route_reason=excluded.route_reason RETURNING * INTO r; RETURN NEXT r;
 END IF;
 hint:=lower(coalesce(o.context_payload->>'community_category_hint','')||' '||coalesce(o.context_payload->>'community_identification_text','')||' '||coalesce(o.brief_description,''));
 FOR target IN SELECT * FROM unnest(ARRAY[
   CASE WHEN hint ~ '(crop|farm|farmer|leaf|plant|pest|disease|harvest|fertili)' THEN 'AGRICULTURE' END,
   CASE WHEN hint ~ '(water|river|stream|canal|drain|lake|well|turbid|algae)' THEN 'WATER' END,
   CASE WHEN hint ~ '(fish|shrimp|prawn|aquaculture|pond|tank|cage)' THEN 'AQUACULTURE' END,
   CASE WHEN hint ~ '(soil|erosion|compaction|ground|earth)' THEN 'SOIL' END,
   CASE WHEN hint ~ '(smoke|pollution|air quality|erosion|biodiversity|habitat|invasive|dump|rubbish|trash|waste|burn)' THEN 'ENVIRONMENT' END,
   CASE WHEN hint ~ '(waste|rubbish|trash|residue|burn|burning|dump|dumping|by-product|byproduct|straw|husk|ash|discard)' THEN 'RESOURCE_RECOVERY' END,
   CASE WHEN hint ~ '(mineral|volcan|rock|plant material|resource|biomass|seaweed|ferment|microb|compost|unusual material)' THEN 'COUNTRY_RESOURCE' END
 ]) WHERE unnest IS NOT NULL
 LOOP
   r:=NULL;
   INSERT INTO observation_core.route(observation_id,target_domain_code,route_type,route_reason,proposed_by_type,confidence_status)
   VALUES(o.observation_id,target,CASE WHEN o.domain_code='COMMUNITY_INTAKE' THEN 'SUPPORTING' ELSE 'INTELLIGENCE_REVIEW' END,'Rule-based community routing from description/context. Reviewer confirmation required.','RULE_ENGINE','MODERATE')
   ON CONFLICT(observation_id,target_domain_code,route_type) DO NOTHING RETURNING * INTO r;
   IF r.observation_route_id IS NOT NULL THEN RETURN NEXT r; END IF;
 END LOOP;
 IF o.domain_code='COMMUNITY_INTAKE' AND NOT EXISTS(SELECT 1 FROM observation_core.route WHERE observation_id=o.observation_id) THEN
   INSERT INTO observation_core.route(observation_id,target_domain_code,route_type,route_reason,proposed_by_type,confidence_status)
   VALUES(o.observation_id,'ENVIRONMENT','SUPPORTING','No confident domain keyword match; route to Environment for general contextual review.','RULE_ENGINE','LOW') RETURNING * INTO r; RETURN NEXT r;
 END IF;
 IF EXISTS(SELECT 1 FROM observation_core.route rr WHERE rr.observation_id=o.observation_id AND rr.target_domain_code IN ('AGRICULTURE','RESOURCE_RECOVERY','COUNTRY_RESOURCE','WATER','SOIL')) THEN
   r:=NULL; INSERT INTO observation_core.route(observation_id,target_domain_code,route_type,route_reason,proposed_by_type,confidence_status) VALUES(o.observation_id,'ENVIRONMENTAL_INTELLIGENCE','INTELLIGENCE_REVIEW','Cross-domain environmental context review is relevant to the proposed routes.','RULE_ENGINE','MODERATE') ON CONFLICT(observation_id,target_domain_code,route_type) DO NOTHING RETURNING * INTO r; IF r.observation_route_id IS NOT NULL THEN RETURN NEXT r; END IF;
 END IF;
 RETURN;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_record_validation(p_observation_id uuid, p_dimension text, p_result text, p_rule_code text, p_summary text, p_actor_id uuid DEFAULT NULL::uuid, p_detail jsonb DEFAULT '{}'::jsonb)
 RETURNS observation_core.validation_event
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.validation_event;
BEGIN
 INSERT INTO observation_core.validation_event(observation_id,validation_dimension,validation_result,rule_code,summary,detail,validated_by)
 VALUES(p_observation_id,upper(btrim(p_dimension)),upper(btrim(p_result)),upper(btrim(p_rule_code)),btrim(p_summary),coalesce(p_detail,'{}'::jsonb),p_actor_id) RETURNING * INTO r;
 IF upper(btrim(p_result))='FAIL' THEN UPDATE observation_core.observation SET lifecycle_status='QUARANTINED',evidence_status='NOT_ELIGIBLE',updated_at=now() WHERE observation_id=p_observation_id AND lifecycle_status<>'ARCHIVED'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_review_observation(p_observation_id uuid, p_decision text, p_review_summary text, p_actor_id uuid)
 RETURNS observation_core.observation
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.observation; d text:=upper(btrim(p_decision)); failures integer; photos integer; required_pass integer; src text;
BEGIN
 PERFORM agriculture.api_require_capability(p_actor_id,'review',NULL);
 IF d NOT IN ('ACCEPT','REJECT','QUARANTINE') OR nullif(btrim(p_review_summary),'') IS NULL THEN RAISE EXCEPTION 'OBSERVATION_REVIEW_REQUIRES_DECISION_AND_SUMMARY' USING ERRCODE='23514'; END IF;
 SELECT source_mode INTO src FROM observation_core.observation WHERE observation_id=p_observation_id;
 SELECT count(*) INTO failures FROM observation_core.validation_event WHERE observation_id=p_observation_id AND validation_result='FAIL';
 SELECT count(*) INTO photos FROM observation_core.evidence_link WHERE observation_id=p_observation_id AND evidence_type='PHOTO' AND review_status IN ('APPROVED','APPROVED_WITH_WARNINGS');
 SELECT count(DISTINCT validation_dimension) INTO required_pass FROM observation_core.validation_event WHERE observation_id=p_observation_id AND validation_dimension IN ('PHOTO','LOCATION','DESCRIPTION','CONSENT') AND validation_result IN ('PASS','WARNING');
 IF d='ACCEPT' AND (failures>0 OR photos=0) THEN RAISE EXCEPTION 'OBSERVATION_ACCEPTANCE_REQUIRES_NO_FAILED_VALIDATION_AND_APPROVED_PHOTO' USING ERRCODE='23514'; END IF;
 IF d='ACCEPT' AND src IN ('FARMER','PUBLIC','STUDENT','TEACHER') AND required_pass<4 THEN RAISE EXCEPTION 'COMMUNITY_ACCEPTANCE_REQUIRES_PHOTO_LOCATION_DESCRIPTION_CONSENT_VALIDATION' USING ERRCODE='23514'; END IF;
 UPDATE observation_core.observation SET lifecycle_status=CASE d WHEN 'ACCEPT' THEN 'ACCEPTED' WHEN 'REJECT' THEN 'REJECTED' ELSE 'QUARANTINED' END,trust_status=CASE WHEN d='ACCEPT' THEN CASE WHEN source_mode IN ('SCIENTIST','FIELD_TECHNICIAN','LABORATORY','INSTRUMENT') THEN 'HIGH' ELSE 'MODERATE' END ELSE trust_status END,evidence_status=CASE WHEN d='ACCEPT' THEN 'PENDING_REVIEW' ELSE 'NOT_ELIGIBLE' END,updated_at=now() WHERE observation_id=p_observation_id AND lifecycle_status NOT IN ('ARCHIVED','REJECTED') RETURNING * INTO r;
 IF r.observation_id IS NULL THEN RAISE EXCEPTION 'OBSERVATION_NOT_REVIEWABLE' USING ERRCODE='55000'; END IF;
 UPDATE observation_core.community_submission SET submission_status=CASE d WHEN 'ACCEPT' THEN 'ACCEPTED' WHEN 'REJECT' THEN 'REJECTED' ELSE 'QUARANTINED' END,reviewed_by=p_actor_id,review_summary=btrim(p_review_summary),reviewed_at=now() WHERE observation_id=p_observation_id;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_settings_snapshot(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE can_review boolean:=false;
BEGIN
 can_review:=agriculture.api_actor_has_capability(p_actor_id,'review',NULL);
 RETURN jsonb_build_object(
  'engine','AAB_UNIVERSAL_OBSERVATION_ENGINE',
  'photo_first_community_capture',true,
  'community_location_required',true,
  'community_direct_brain_promotion',false,
  'community_scientist_review_required',true,
  'offline_capture_supported',true,
  'can_review',can_review,
  'adapters',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.domain_name),'[]'::jsonb) FROM observation_core.v_settings_summary s),
  'counts',jsonb_build_object(
    'observations',(SELECT count(*) FROM observation_core.observation),
    'community_submissions',(SELECT count(*) FROM observation_core.community_submission),
    'active_campaigns',(SELECT count(*) FROM observation_core.campaign WHERE lifecycle_status='ACTIVE'),
    'review_queue',(SELECT count(*) FROM observation_core.v_review_queue)
  )
 );
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_start_community_submission(p_actor_id uuid, p_domain_code text, p_country_code character, p_brief_description text, p_latitude numeric, p_longitude numeric, p_observed_at timestamp with time zone, p_consent_confirmed boolean, p_user_category_hint text DEFAULT NULL::text, p_user_identification_text text DEFAULT NULL::text, p_campaign_id uuid DEFAULT NULL::uuid, p_offline_capture_id text DEFAULT NULL::text, p_client_captured_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_client_app_version text DEFAULT NULL::text, p_low_bandwidth_mode boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE prof observation_core.community_participant_profile; obs observation_core.observation; cs observation_core.community_submission; ad observation_core.domain_adapter; dc text:=upper(btrim(coalesce(nullif(p_domain_code,''),'COMMUNITY_INTAKE'))); co observation_core.campaign_observation; existing_obs_id uuid;
BEGIN
 IF p_offline_capture_id IS NOT NULL THEN
   SELECT cs0.observation_id INTO existing_obs_id FROM observation_core.community_submission cs0 JOIN observation_core.community_participant_profile cp0 ON cp0.community_participant_profile_id=cs0.participant_profile_id WHERE cp0.actor_id=p_actor_id AND cs0.offline_capture_id=p_offline_capture_id LIMIT 1;
   IF existing_obs_id IS NOT NULL THEN
     SELECT * INTO cs FROM observation_core.community_submission WHERE observation_id=existing_obs_id;
     SELECT * INTO obs FROM observation_core.observation WHERE observation_id=existing_obs_id;
     RETURN jsonb_build_object('community_submission',to_jsonb(cs),'observation',to_jsonb(obs),'idempotent_replay',true);
   END IF;
 END IF;
 SELECT * INTO prof FROM observation_core.community_participant_profile WHERE actor_id=p_actor_id AND active;
 IF prof.community_participant_profile_id IS NULL THEN RAISE EXCEPTION 'COMMUNITY_PROFILE_REQUIRED' USING ERRCODE='23514'; END IF;
 IF NOT p_consent_confirmed OR NOT (prof.consent_scientific_use OR prof.consent_environmental_use) THEN RAISE EXCEPTION 'COMMUNITY_SUBMISSION_CONSENT_REQUIRED' USING ERRCODE='23514'; END IF;
 IF p_latitude IS NULL OR p_longitude IS NULL THEN RAISE EXCEPTION 'COMMUNITY_LOCATION_REQUIRED' USING ERRCODE='23514'; END IF;
 SELECT * INTO ad FROM observation_core.domain_adapter WHERE domain_code=dc AND enabled;
 IF ad.domain_code IS NULL OR NOT prof.participant_type=ANY(ad.allowed_source_modes) THEN RAISE EXCEPTION 'COMMUNITY_PARTICIPANT_NOT_ALLOWED_FOR_DOMAIN' USING ERRCODE='23514'; END IF;
 obs:=observation_core.api_create_observation(dc,p_country_code,'COMMUNITY_REPORT','OBSERVED_CONDITION_OR_RESOURCE',prof.participant_type,coalesce(p_observed_at,now()),p_brief_description,p_actor_id,p_user_identification_text,p_latitude,p_longitude,NULL,NULL,jsonb_build_object('community_category_hint',p_user_category_hint,'community_identification_text',p_user_identification_text));
 INSERT INTO observation_core.community_submission(submission_code,observation_id,participant_profile_id,campaign_id,user_category_hint,user_identification_text,consent_confirmed,offline_capture_id,client_captured_at,client_app_version,low_bandwidth_mode)
 VALUES('COM-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,20)),obs.observation_id,prof.community_participant_profile_id,p_campaign_id,p_user_category_hint,p_user_identification_text,true,p_offline_capture_id,p_client_captured_at,p_client_app_version,coalesce(p_low_bandwidth_mode,false)) RETURNING * INTO cs;
 IF p_campaign_id IS NOT NULL THEN co:=observation_core.api_link_observation_to_campaign(p_campaign_id,obs.observation_id,p_actor_id); END IF;
 RETURN jsonb_build_object('community_submission',to_jsonb(cs),'observation',to_jsonb(obs),'campaign_linked',co.campaign_observation_id IS NOT NULL,'idempotent_replay',false);
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_submit_campaign_for_review(p_campaign_id uuid, p_actor_id uuid)
 RETURNS observation_core.campaign
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.campaign;
BEGIN
 PERFORM agriculture.api_require_capability(p_actor_id,'submit_review',NULL);
 UPDATE observation_core.campaign SET lifecycle_status='UNDER_REVIEW',updated_at=now() WHERE campaign_id=p_campaign_id AND lifecycle_status='DRAFT' RETURNING * INTO r;
 IF r.campaign_id IS NULL THEN RAISE EXCEPTION 'CAMPAIGN_NOT_DRAFT_OR_NOT_FOUND' USING ERRCODE='55000'; END IF;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_upsert_community_profile(p_actor_id uuid, p_participant_type text, p_country_code character, p_consent_scientific_use boolean, p_consent_environmental_use boolean, p_organization_or_school text DEFAULT NULL::text, p_preferred_language text DEFAULT NULL::text)
 RETURNS observation_core.community_participant_profile
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE r observation_core.community_participant_profile; pt text:=upper(btrim(p_participant_type));
BEGIN
 IF p_actor_id IS NULL OR NOT EXISTS(SELECT 1 FROM agriculture.actor WHERE actor_id=p_actor_id AND active) THEN RAISE EXCEPTION 'AUTHENTICATED_ACTIVE_ACTOR_REQUIRED' USING ERRCODE='42501'; END IF;
 IF pt NOT IN ('FARMER','PUBLIC','STUDENT','TEACHER') THEN RAISE EXCEPTION 'INVALID_COMMUNITY_PARTICIPANT_TYPE' USING ERRCODE='23514'; END IF;
 INSERT INTO observation_core.community_participant_profile(actor_id,participant_type,country_code,organization_or_school,preferred_language,consent_scientific_use,consent_environmental_use)
 VALUES(p_actor_id,pt,p_country_code,p_organization_or_school,p_preferred_language,coalesce(p_consent_scientific_use,false),coalesce(p_consent_environmental_use,false))
 ON CONFLICT(actor_id) DO UPDATE SET participant_type=excluded.participant_type,country_code=excluded.country_code,organization_or_school=excluded.organization_or_school,preferred_language=excluded.preferred_language,consent_scientific_use=excluded.consent_scientific_use,consent_environmental_use=excluded.consent_environmental_use,active=true,updated_at=now() RETURNING * INTO r;
 RETURN r;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_validate_community_access_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'public'
AS $function$
DECLARE a uuid; created observation_core.observation; result jsonb;
BEGIN
 BEGIN
  INSERT INTO agriculture.actor(external_subject,display_name,actor_type,active) VALUES('rollback:community-access:089','Rollback Community Access','USER',true) RETURNING actor_id INTO a;
  INSERT INTO agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,country_code,granted_by,grant_reason,active) VALUES(a,'AGRICULTURE_RUNTIME_COMMUNITY','AGRICULTURE',NULL,NULL,'Rollback-only community access validation.',true);
  INSERT INTO observation_core.community_participant_profile(actor_id,participant_type,country_code,consent_scientific_use,consent_environmental_use,active) VALUES(a,'PUBLIC',NULL,true,true,true);
  created:=observation_core.api_create_observation('COMMUNITY_INTAKE',NULL,'COMMUNITY_REPORT','OBSERVED_CONDITION_OR_RESOURCE','PUBLIC',now(),'Rollback community access observation.',a,NULL,-1,100,NULL,NULL,'{}'::jsonb);
  result:=jsonb_build_object('ok',true,'contract','AAB_COMMUNITY_ACCESS_E2E_089','status','PASS_ROLLBACK_ONLY','community_capture',agriculture.api_actor_has_capability(a,'community_capture',NULL),'canonical_read',agriculture.api_actor_has_capability(a,'read',NULL),'create_draft',agriculture.api_actor_has_capability(a,'create_draft',NULL),'review',agriculture.api_actor_has_capability(a,'review',NULL),'observation_created',created.observation_id IS NOT NULL,'scientific_write_authority_blocked',NOT agriculture.api_actor_has_capability(a,'create_draft',NULL));
  RAISE EXCEPTION 'AAB_ROLLBACK_089' USING ERRCODE='P0001';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'AAB_ROLLBACK_089' THEN RAISE; END IF; END;
 RETURN result;
END; $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION observation_core.api_validate_universal_observation_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'observation_core', 'agriculture', 'platform', 'public'
AS $function$
DECLARE public_actor uuid; reviewer_actor uuid; prof observation_core.community_participant_profile; started jsonb; replayed jsonb; obs_id uuid; replay_obs_id uuid; cs_id uuid; pe agriculture.photo_evidence; camp observation_core.campaign; reviewed observation_core.observation; promoted jsonb; routes integer; env_route integer; recovery_route integer; result jsonb; test_marker text:='AAB_OBS_E2E_ROLLBACK_079';
BEGIN
 BEGIN
  INSERT INTO agriculture.country_scope(country_code,country_name,is_operating_country,active) VALUES('ZZ','AAB Rollback Validation',false,true) ON CONFLICT(country_code) DO NOTHING;
  INSERT INTO agriculture.actor(external_subject,display_name,actor_type,active) VALUES('rollback:community:079','Rollback Community','USER',true) RETURNING actor_id INTO public_actor;
  INSERT INTO agriculture.actor(external_subject,display_name,actor_type,active) VALUES('rollback:reviewer:079','Rollback Reviewer','SCIENTIST',true) RETURNING actor_id INTO reviewer_actor;
  INSERT INTO agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,country_code,granted_by,grant_reason,active) VALUES(public_actor,'AGRICULTURE_RUNTIME_USER','AGRICULTURE',NULL,NULL,'Rollback-only E2E validation.',true),(reviewer_actor,'AGRICULTURE_RUNTIME_SCIENTIST','AGRICULTURE',NULL,NULL,'Rollback-only E2E validation.',true);
  prof:=observation_core.api_upsert_community_profile(public_actor,'PUBLIC','ZZ',true,true,NULL,'en');
  camp:=observation_core.api_create_campaign('Rollback Community Burning Campaign','ZZ','ENVIRONMENT','Can public observations identify residue burning and recoverable biomass?','Rollback-only E2E validation.',reviewer_actor,ARRAY['RESOURCE_RECOVERY','COUNTRY_RESOURCE'],jsonb_build_array(jsonb_build_object('country','ZZ')),jsonb_build_array('photo','location','description'),ARRAY['PUBLIC'],'REQUIRED',current_date,current_date+30);
  PERFORM observation_core.api_submit_campaign_for_review(camp.campaign_id,reviewer_actor);
  camp:=observation_core.api_decide_campaign(camp.campaign_id,'APPROVE','Rollback campaign approved for controlled validation.',reviewer_actor);
  started:=observation_core.api_start_community_submission(public_actor,'COMMUNITY_INTAKE','ZZ','Observed crop residue burning and discarded biomass near a field.','10.0000'::numeric,'100.0000'::numeric,now(),true,NULL,'Possible crop residue',camp.campaign_id,test_marker,now(),'E2E-086',true);
  replayed:=observation_core.api_start_community_submission(public_actor,'COMMUNITY_INTAKE','ZZ','Observed crop residue burning and discarded biomass near a field.','10.0000'::numeric,'100.0000'::numeric,now(),true,NULL,'Possible crop residue',camp.campaign_id,test_marker,now(),'E2E-086',true);
  obs_id:=(started->'observation'->>'observation_id')::uuid; replay_obs_id:=(replayed->'observation'->>'observation_id')::uuid; cs_id:=(started->'community_submission'->>'community_submission_id')::uuid;
  pe:=agriculture.api_register_photo_evidence('UNIVERSAL_OBSERVATION',obs_id,'OTHER','ROLLBACK_TEST','rollback/086/'||obs_id::text||'.jpg','image/jpeg',12345,repeat('b',64),public_actor,'rollback.jpg',800,600,NULL,now(),'ROLLBACK_DEVICE','10.0000','100.0000',false,NULL);
  PERFORM observation_core.api_attach_photo_evidence(obs_id,pe.photo_evidence_id);
  pe:=agriculture.api_assess_photo_evidence(pe.photo_evidence_id,'ACCEPTABLE','VALID','APPROVED','APPROVED_FOR_RESEARCH',reviewer_actor);
  PERFORM observation_core.api_finalize_community_submission(cs_id,public_actor);
  PERFORM observation_core.api_record_validation(obs_id,'PHOTO','PASS','PHOTO_APPROVED','Approved usable photo present.',reviewer_actor);
  PERFORM observation_core.api_record_validation(obs_id,'LOCATION','PASS','GPS_PRESENT','Valid location coordinates present.',reviewer_actor);
  PERFORM observation_core.api_record_validation(obs_id,'DESCRIPTION','PASS','DESCRIPTION_CONTEXT','Brief description provides useful context.',reviewer_actor);
  PERFORM observation_core.api_record_validation(obs_id,'CONSENT','PASS','CONSENT_CONFIRMED','Scientific/environmental use consent confirmed.',reviewer_actor);
  PERFORM * FROM observation_core.api_propose_observation_routes(obs_id);
  SELECT count(*) INTO routes FROM observation_core.route WHERE observation_id=obs_id;
  SELECT count(*) INTO env_route FROM observation_core.route WHERE observation_id=obs_id AND target_domain_code='ENVIRONMENT';
  SELECT count(*) INTO recovery_route FROM observation_core.route WHERE observation_id=obs_id AND target_domain_code='RESOURCE_RECOVERY';
  reviewed:=observation_core.api_review_observation(obs_id,'ACCEPT','Photo, location, description, consent and route context reviewed.',reviewer_actor);
  promoted:=observation_core.api_promote_observation_to_evidence(obs_id,'Rollback-only E2E evidence promotion after controlled scientist review.',reviewer_actor);
  result:=jsonb_build_object('ok',true,'contract','AAB_UNIVERSAL_OBSERVATION_E2E_086','status','PASS_ROLLBACK_ONLY','neutral_community_intake',true,'community_profile_created',prof.community_participant_profile_id IS NOT NULL,'campaign_created_and_approved',camp.lifecycle_status='ACTIVE','community_submission_created',cs_id IS NOT NULL,'offline_idempotency_proven',obs_id=replay_obs_id AND coalesce((replayed->>'idempotent_replay')::boolean,false),'photo_registered_and_approved',pe.review_status='APPROVED','environment_route_created',env_route>0,'resource_recovery_route_created',recovery_route>0,'cross_domain_routes_created',routes>=2,'scientist_review_accepted',reviewed.lifecycle_status='ACCEPTED','evidence_eligibility_status',promoted->>'eligibility_status','direct_public_brain_promotion',false,'photo_required',true,'location_required',true,'scientist_authority_preserved',true,'all_validation_mutations_rolled_back',true);
  RAISE EXCEPTION 'AAB_ROLLBACK_086' USING ERRCODE='P0001';
 EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM<>'AAB_ROLLBACK_086' THEN RAISE; END IF; END;
 RETURN result;
END; $function$
;
