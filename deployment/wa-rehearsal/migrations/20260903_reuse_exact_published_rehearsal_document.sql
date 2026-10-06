-- WA clean-room rehearsal repair, 2026-09-03.
-- Reuse the immutable TEST-0.1 document only after exact governed matching.
-- This function cannot insert, retire, replace, or otherwise modify legal documents.

create or replace function country_core.api_apply_personal_wa_rehearsal_handoff(
 p_handoff_correlation_id uuid, p_source_request_id uuid, p_source_internal_nomination_id uuid,
 p_source_decision_id uuid, p_nominated_email text, p_document_sha256 text, p_storage_path text,
 p_plain_activation_code text, p_expires_at timestamptz
) returns jsonb
language plpgsql security definer
set search_path to pg_catalog, country_core, platform, agriculture, extensions, storage
as $function$
declare
  v_doc uuid;
  v_activation uuid;
  v_canonical_storage_path text;
begin
  if num_nonnulls(p_source_request_id,p_source_internal_nomination_id) <> 1 then
    raise exception 'EXACTLY_ONE_REHEARSAL_SOURCE_REQUIRED' using errcode='23514';
  end if;
  if p_document_sha256 !~ '^[0-9a-f]{64}$' or length(coalesce(p_plain_activation_code,''))<32 or p_expires_at<=now() then
    raise exception 'VALID_REHEARSAL_HANDOFF_INPUT_REQUIRED' using errcode='23514';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='aab-rehearsal-legal' and name=p_storage_path) then
    raise exception 'VERIFIED_REHEARSAL_DOCUMENT_UPLOAD_REQUIRED' using errcode='55000';
  end if;
  if exists(select 1 from country_core.rehearsal_provisioning_handoff
    where handoff_correlation_id=p_handoff_correlation_id or source_control_plane_decision_id=p_source_decision_id) then
    raise exception 'REHEARSAL_HANDOFF_ALREADY_APPLIED' using errcode='23505';
  end if;
  if exists(select 1 from country_core.legal_document_version
    where document_scope='AAB_PLATFORM' and document_status='PUBLISHED' and coalesce(production_eligible,true)) then
    raise exception 'OPERATIONAL_PLATFORM_DOCUMENT_PRESENT_REHEARSAL_PUBLICATION_BLOCKED' using errcode='55000';
  end if;

  select legal_document_version_id,storage_path
    into v_doc,v_canonical_storage_path
  from country_core.legal_document_version
  where document_scope='AAB_PLATFORM'
    and document_id='AAB-WA-TEST-TERMS-0001'
    and version_label='TEST-0.1'
    and document_sha256=lower(p_document_sha256)
    and production_eligible=false
    and government_authority_verified=false
    and legal_effect='NONE_TEST_ONLY'
    and environment_classification='WA_CLEAN_ROOM_TEST'
    and acknowledgement_type='REHEARSAL_ACKNOWLEDGEMENT'
    and document_status='PUBLISHED'
  limit 1;

  if v_doc is null then
    raise exception 'EXACT_PUBLISHED_REHEARSAL_DOCUMENT_REQUIRED' using errcode='23514';
  end if;
  if not exists(select 1 from storage.objects where bucket_id='aab-rehearsal-legal' and name=v_canonical_storage_path) then
    raise exception 'CANONICAL_REHEARSAL_DOCUMENT_OBJECT_MISSING' using errcode='55000';
  end if;

  update country_core.country_activation
     set activation_status='REVOKED'
   where country_code='AU'
     and activation_status='ISSUED'
     and provisioning_classification='PERSONAL_WA_REHEARSAL'
     and nominated_head_admin_email=lower(btrim(p_nominated_email));

  insert into country_core.country_activation(
   country_code,country_name,nominated_head_admin_email,activation_code_hash,activation_status,expires_at,
   handoff_correlation_id,source_participation_request_id,source_internal_rehearsal_nomination_id,
   source_control_plane_decision_id,provisioning_classification,government_authority_verified,
   production_authority,legal_effect,external_invitations_locked,required_rehearsal_document_version_id
  ) values(
   'AU','Australia',lower(btrim(p_nominated_email)),extensions.crypt(p_plain_activation_code,extensions.gen_salt('bf')),
   'ISSUED',p_expires_at,p_handoff_correlation_id,p_source_request_id,p_source_internal_nomination_id,
   p_source_decision_id,'PERSONAL_WA_REHEARSAL',false,false,'NONE_TEST_ONLY',true,v_doc
  ) returning country_activation_id into v_activation;

  insert into country_core.rehearsal_provisioning_handoff(
   handoff_correlation_id,source_participation_request_id,source_internal_rehearsal_nomination_id,
   source_control_plane_decision_id,classification,nominated_test_head_admin_email,
   document_version_id,document_sha256,activation_id
  ) values(
   p_handoff_correlation_id,p_source_request_id,p_source_internal_nomination_id,p_source_decision_id,
   'PERSONAL_WA_REHEARSAL',lower(btrim(p_nominated_email)),v_doc,lower(p_document_sha256),v_activation
  );

  return jsonb_build_object(
    'ok',true,
    'activation_id',v_activation,
    'document_version_id',v_doc,
    'document_reused',true,
    'canonical_storage_path',v_canonical_storage_path,
    'source_type',case when p_source_internal_nomination_id is not null
      then 'INTERNAL_REHEARSAL_NOMINATION' else 'APPROVED_PARTICIPATION_REQUEST' end,
    'classification','PERSONAL_WA_REHEARSAL',
    'external_invitations_locked',true
  );
end
$function$;