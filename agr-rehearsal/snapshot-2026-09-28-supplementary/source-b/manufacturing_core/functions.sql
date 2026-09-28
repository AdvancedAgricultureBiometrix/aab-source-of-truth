-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: manufacturing_core. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for manufacturing_core: functions 1, tables 4, views 1, sequences 0, rls_enabled_tables 0, constraints 29, triggers 0, policies 0, indexes 9.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION manufacturing_core.api_generate_transfer_package(p_actor_id uuid, p_country_workspace_id uuid, p_source_organization_id uuid, p_destination_manufacturer_id uuid, p_formulation_version_id uuid, p_permitted_use text, p_access_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS manufacturing_core.transfer_package
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'manufacturing_core', 'country_core', 'agriculture', 'public'
AS $function$
declare r manufacturing_core.transfer_package; fv agriculture.formulation_version; allowed boolean; dest_type text; formula jsonb; payload jsonb; code text; line_count integer;
begin
  select * into fv from agriculture.formulation_version where formulation_version_id=p_formulation_version_id and country_workspace_id=p_country_workspace_id;
  if fv.formulation_version_id is null then raise exception 'FORMULATION_NOT_IN_COUNTRY_WORKSPACE' using errcode='23514'; end if;
  if fv.lifecycle_status<>'APPROVED' then raise exception 'ONLY_APPROVED_FORMULATIONS_CAN_BE_TRANSFERRED' using errcode='55000'; end if;
  if fv.governance_decision_id is null or fv.approved_by is null or fv.approved_at is null then raise exception 'APPROVED_FORMULATION_GOVERNANCE_INCOMPLETE' using errcode='23514'; end if;
  select organization_type into dest_type from country_core.organization where organization_id=p_destination_manufacturer_id and country_workspace_id=p_country_workspace_id and active;
  if dest_type<>'MANUFACTURER' then raise exception 'DESTINATION_MUST_BE_MANUFACTURER' using errcode='23514'; end if;
  select exists(select 1 from country_core.workspace_membership wm where wm.country_workspace_id=p_country_workspace_id and wm.actor_id=p_actor_id and wm.membership_status='ACTIVE' and wm.membership_role in ('HEAD_ADMIN','COUNTRY_ADMIN','SCIENTIST')) or exists(select 1 from country_core.organization_membership om where om.organization_id=p_source_organization_id and om.actor_id=p_actor_id and om.membership_status='ACTIVE' and om.can_share_records) into allowed;
  if not allowed then raise exception 'MANUFACTURING_TRANSFER_AUTHORITY_REQUIRED' using errcode='42501'; end if;
  select count(*),coalesce(jsonb_agg(jsonb_build_object('sequence_order',l.sequence_order,'ingredient_id',l.ingredient_id,'ingredient_code',i.ingredient_code,'ingredient_name',i.ingredient_name,'inclusion_rate_percent',l.inclusion_rate_percent,'ingredient_role',l.ingredient_role,'line_notes',l.line_notes,'material_class',i.material_class,'preparation_class',i.preparation_class) order by l.sequence_order),'[]'::jsonb)
    into line_count,formula
  from agriculture.formulation_version_ingredient_line l join agriculture.ingredient i on i.ingredient_id=l.ingredient_id
  where l.formulation_version_id=p_formulation_version_id and l.is_active;
  if line_count=0 then raise exception 'MANUFACTURING_TRANSFER_REQUIRES_FORMULATION_LINES' using errcode='23514'; end if;
  payload:=jsonb_build_object('formulation',jsonb_build_object('formulation_version_id',fv.formulation_version_id,'version_code',fv.version_code,'formulation_name',fv.formulation_name,'version_number',fv.version_number,'formulation_type',fv.formulation_type,'expected_outcomes',fv.expected_outcomes),'production_formula',formula,'quality_requirements',jsonb_build_object('raw_material_lot_trace_required',true,'batch_record_required',true,'qc_release_required',true,'deviation_log_required',true),'traceability',jsonb_build_object('ingredient_lot_tracking',true,'manufacturer_batch_id_required',true,'source_formulation_version_immutable',true),'governance',jsonb_build_object('source_lifecycle_status',fv.lifecycle_status,'trial_readiness',fv.trial_readiness,'governance_decision_id',fv.governance_decision_id,'evidence_packet_id',fv.evidence_packet_id),'withheld_by_default',jsonb_build_array('unpublished_mechanism_research','unrelated_trials','internal_hypotheses','other_formulations'));
  code:='MTP-'||to_char(clock_timestamp(),'YYYYMMDDHH24MISS')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  insert into manufacturing_core.transfer_package(country_workspace_id,source_organization_id,destination_manufacturer_id,formulation_version_id,transfer_code,permitted_use,access_expires_at,generated_payload,generated_by)
  values(p_country_workspace_id,p_source_organization_id,p_destination_manufacturer_id,p_formulation_version_id,code,upper(btrim(p_permitted_use)),p_access_expires_at,payload,p_actor_id) returning * into r;
  insert into manufacturing_core.transfer_section(transfer_package_id,section_code,section_name,section_payload,visibility,section_status) values
  (r.transfer_package_id,'FORMULA','Production Formula',payload->'production_formula','MANUFACTURER','GENERATED'),
  (r.transfer_package_id,'QUALITY','Quality Requirements',payload->'quality_requirements','MANUFACTURER','GENERATED'),
  (r.transfer_package_id,'TRACEABILITY','Traceability Requirements',payload->'traceability','MANUFACTURER','GENERATED'),
  (r.transfer_package_id,'GOVERNANCE','Governance & Evidence Identity',payload->'governance','MANUFACTURER','REVIEW_REQUIRED'),
  (r.transfer_package_id,'INTERNAL_RESEARCH','Internal Research Withheld',payload->'withheld_by_default','SOURCE_ONLY','WITHHELD');
  return r;
end $function$
;
