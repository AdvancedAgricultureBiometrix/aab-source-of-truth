-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: regulatory_core. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for regulatory_core: functions 4, tables 9, views 1, sequences 0, rls_enabled_tables 0, constraints 40, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION regulatory_core.api_actor_can_access_regulatory(p_actor_id uuid, p_workspace_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'country_core', 'agriculture', 'public'
AS $function$
 select exists(select 1 from country_core.workspace_membership m where m.actor_id=p_actor_id and m.country_workspace_id=p_workspace_id and m.membership_status='ACTIVE' and (m.membership_role='HEAD_ADMIN' or (m.membership_role='REGULATORY_ADMIN' and m.can_access_regulatory_gate)));
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION regulatory_core.api_create_dossier_passport(p_workspace_id uuid, p_passport_name text, p_subject_type text, p_subject_id uuid, p_product_category text, p_actor_id uuid)
 RETURNS regulatory_core.dossier_passport
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'regulatory_core', 'country_core', 'agriculture', 'public'
AS $function$
declare r regulatory_core.dossier_passport; w country_core.country_workspace;
begin
 if not regulatory_core.api_actor_can_access_regulatory(p_actor_id,p_workspace_id) then raise exception 'REGULATORY_GATE_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 select * into w from country_core.country_workspace where country_workspace_id=p_workspace_id;
 insert into regulatory_core.dossier_passport(country_workspace_id,passport_code,passport_name,subject_entity_type,subject_entity_id,product_category,created_by)
 values(p_workspace_id,'DSP-'||w.country_code||'-'||upper(substr(gen_random_uuid()::text,1,8)),btrim(p_passport_name),upper(btrim(p_subject_type)),p_subject_id,btrim(p_product_category),p_actor_id) returning * into r;
 insert into country_core.regulatory_access_event(country_workspace_id,actor_id,event_type,event_summary) values(p_workspace_id,p_actor_id,'DOSSIER_OPENED','Created Dossier Passport '||r.passport_code);
 return r;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION regulatory_core.api_regulatory_context(p_actor_id uuid, p_workspace_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'regulatory_core', 'country_core', 'agriculture', 'public'
AS $function$
declare allowed boolean; result jsonb;
begin
 allowed:=regulatory_core.api_actor_can_access_regulatory(p_actor_id,p_workspace_id);
 if not allowed then raise exception 'REGULATORY_GATE_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 select jsonb_build_object(
  'gate',(select to_jsonb(g) from country_core.regulatory_security_gate g where g.country_workspace_id=p_workspace_id),
  'workspace',(select jsonb_build_object('country_workspace_id',w.country_workspace_id,'country_code',w.country_code,'country_name',w.country_name,'workspace_name',w.workspace_name) from country_core.country_workspace w where w.country_workspace_id=p_workspace_id),
  'passports',coalesce((select jsonb_agg(to_jsonb(p) order by p.updated_at desc) from regulatory_core.v_dossier_passport_summary p where p.country_workspace_id=p_workspace_id),'[]'::jsonb),
  'jurisdictions',coalesce((select jsonb_agg(to_jsonb(j) order by j.jurisdiction_name) from regulatory_core.jurisdiction j where j.active),'[]'::jsonb),
  'verified_sources',(select count(*) from regulatory_core.regulatory_source where verification_status='VERIFIED_CURRENT'),
  'active_requirements',(select count(*) from regulatory_core.regulatory_requirement where lifecycle_status='ACTIVE'),
  'recent_changes',coalesce((select jsonb_agg(to_jsonb(c) order by c.detected_at desc) from (select * from regulatory_core.regulatory_change_event order by detected_at desc limit 25)c),'[]'::jsonb)
 ) into result;
 return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION regulatory_core.api_run_dossier_translation(p_passport_id uuid, p_destination_jurisdiction text, p_actor_id uuid)
 RETURNS regulatory_core.translation_run
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'regulatory_core', 'country_core', 'agriculture', 'public'
AS $function$
declare p regulatory_core.dossier_passport; r regulatory_core.translation_run; total_n int; assessed_n int; complete_n int; partial_n int; missing_n int; local_n int; confirm_n int;
begin
 select * into p from regulatory_core.dossier_passport where dossier_passport_id=p_passport_id;
 if p.dossier_passport_id is null then raise exception 'DOSSIER_NOT_FOUND'; end if;
 if not regulatory_core.api_actor_can_access_regulatory(p_actor_id,p.country_workspace_id) then raise exception 'REGULATORY_GATE_AUTHORITY_REQUIRED' using errcode='42501'; end if;
 insert into regulatory_core.translation_run(dossier_passport_id,destination_jurisdiction_code,initiated_by) values(p_passport_id,p_destination_jurisdiction,p_actor_id) returning * into r;
 select count(*) into total_n from regulatory_core.regulatory_requirement q join regulatory_core.regulatory_source s on s.regulatory_source_id=q.regulatory_source_id where q.jurisdiction_code=p_destination_jurisdiction and q.lifecycle_status='ACTIVE' and s.verification_status='VERIFIED_CURRENT' and (q.effective_from is null or q.effective_from<=current_date) and (q.effective_to is null or q.effective_to>=current_date);
 if total_n=0 then
   update regulatory_core.translation_run set run_status='BLOCKED',assessment_summary='No verified current regulatory requirements are loaded for this jurisdiction. AAB will not invent dossier readiness.',completed_at=now() where translation_run_id=r.translation_run_id returning * into r;
   return r;
 end if;
 -- Requirement matching is deliberately not guessed. Each requirement begins MISSING/LOCAL-STUDY until evidence mapping is explicitly implemented/reviewed.
 insert into regulatory_core.requirement_assessment(translation_run_id,regulatory_requirement_id,assessment_status,gap_summary,assessment_rationale)
 select r.translation_run_id,q.regulatory_requirement_id,case when q.local_study_required then 'REQUIRES_LOCAL_STUDY' else 'MISSING' end,'No governed dossier evidence has yet been mapped to this requirement.','Fail-closed initial assessment; evidence must be mapped and reviewed.'
 from regulatory_core.regulatory_requirement q join regulatory_core.regulatory_source s on s.regulatory_source_id=q.regulatory_source_id where q.jurisdiction_code=p_destination_jurisdiction and q.lifecycle_status='ACTIVE' and s.verification_status='VERIFIED_CURRENT' and (q.effective_from is null or q.effective_from<=current_date) and (q.effective_to is null or q.effective_to>=current_date);
 select count(*) filter(where assessment_status='COMPLETE'),count(*) filter(where assessment_status='PARTIAL'),count(*) filter(where assessment_status='MISSING'),count(*) filter(where assessment_status='REQUIRES_LOCAL_STUDY'),count(*) filter(where assessment_status='REQUIRES_REGULATOR_CONFIRMATION') into complete_n,partial_n,missing_n,local_n,confirm_n from regulatory_core.requirement_assessment where translation_run_id=r.translation_run_id;
 update regulatory_core.translation_run set run_status='COMPLETE',readiness_percent=round((complete_n + partial_n*0.5)::numeric/total_n*100,1),reusable_requirements=complete_n,partial_requirements=partial_n,missing_requirements=missing_n,local_study_requirements=local_n,regulator_confirmation_requirements=confirm_n,assessment_summary='Initial fail-closed dossier translation against verified current requirements. Missing evidence is not inferred as complete.',completed_at=now() where translation_run_id=r.translation_run_id returning * into r;
 return r;
end $function$
;
