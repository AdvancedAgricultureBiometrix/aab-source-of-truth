-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: security_core. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for security_core: functions 1, tables 2, views 0, sequences 0, rls_enabled_tables 0, constraints 9, triggers 0, policies 0, indexes 3.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION security_core.api_run_security_brain()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'security_core', 'platform', 'agriculture', 'public'
AS $function$
declare
  v_actor uuid;
  v_run uuid;
  v_created integer := 0;
  v_resolved integer := 0;
  v_rows integer := 0;
  v_count integer := 0;
  v_fingerprint text;
  v_request record;
begin
  v_actor := platform.current_actor_id();
  if v_actor is null or not platform.is_platform_admin(v_actor) then
    raise exception 'AAB_PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  insert into security_core.security_brain_run(initiated_by)
  values (v_actor)
  returning run_id into v_run;

  select count(*) into v_count
  from platform.entry_audit_event
  where outcome_code <> 'ALLOWED'
    and occurred_at > now() - interval '15 minutes';

  if v_count >= 5 then
    v_fingerprint := 'REPEATED_ENTRY_DENIALS:' ||
      to_char(date_trunc('hour', now()), 'YYYYMMDDHH24');

    insert into security_core.security_alert(
      alert_fingerprint,
      alert_type,
      severity,
      confidence_status,
      title,
      explanation,
      evidence_summary,
      recommended_response
    )
    values (
      v_fingerprint,
      'REPEATED_ENTRY_DENIALS',
      'HIGH',
      'HIGH',
      'Repeated protected-entry denials',
      'Five or more fail-closed entry decisions occurred within fifteen minutes.',
      jsonb_build_object('denied_count', v_count, 'window_minutes', 15),
      'Review affected identities and source context. Do not change access without human verification.'
    )
    on conflict (alert_fingerprint) do nothing;

    get diagnostics v_rows = row_count;
    v_created := v_created + v_rows;

    update security_core.security_alert
    set evidence_summary = jsonb_build_object('denied_count', v_count, 'window_minutes', 15),
        explanation = 'Five or more fail-closed entry decisions occurred within fifteen minutes.',
        recommended_response = 'Review affected identities and source context. Do not change access without human verification.'
    where alert_fingerprint = v_fingerprint
      and alert_status = 'OPEN';
  end if;

  for v_request in
    select id, reference, country_name, jurisdiction_level, organisation_name, submitted_at
    from public.aab_country_participation_requests
    where review_status = 'PENDING_REVIEW'
  loop
    v_fingerprint := 'PARTICIPATION_REVIEW_PENDING:' || v_request.id::text;

    insert into security_core.security_alert(
      alert_fingerprint,
      alert_type,
      severity,
      confidence_status,
      title,
      explanation,
      evidence_summary,
      recommended_response
    )
    values (
      v_fingerprint,
      'PARTICIPATION_REVIEW_PENDING',
      'INFORMATION',
      'HIGH',
      'Governed participation review pending',
      'A verified participation request remains pending a governed human decision.',
      jsonb_build_object(
        'request_id', v_request.id,
        'reference', v_request.reference,
        'country_name', v_request.country_name,
        'jurisdiction_level', v_request.jurisdiction_level,
        'organisation_name', v_request.organisation_name,
        'review_status', 'PENDING_REVIEW',
        'submitted_at', v_request.submitted_at
      ),
      'An authorised Platform Owner or support reviewer should assess the evidence and record a decision with rationale. Approval must remain separate from country provisioning.'
    )
    on conflict (alert_fingerprint) do nothing;

    get diagnostics v_rows = row_count;
    v_created := v_created + v_rows;

    update security_core.security_alert
    set evidence_summary = jsonb_build_object(
          'request_id', v_request.id,
          'reference', v_request.reference,
          'country_name', v_request.country_name,
          'jurisdiction_level', v_request.jurisdiction_level,
          'organisation_name', v_request.organisation_name,
          'review_status', 'PENDING_REVIEW',
          'submitted_at', v_request.submitted_at
        ),
        explanation = 'A verified participation request remains pending a governed human decision.',
        recommended_response = 'An authorised Platform Owner or support reviewer should assess the evidence and record a decision with rationale. Approval must remain separate from country provisioning.'
    where alert_fingerprint = v_fingerprint
      and alert_status = 'OPEN';
  end loop;

  update security_core.security_alert alert
  set alert_status = 'RESOLVED',
      acknowledged_at = now(),
      acknowledged_by = v_actor,
      resolution_rationale =
        'Automatically reconciled from protected evidence: the linked participation request is no longer PENDING_REVIEW.'
  where alert.alert_type = 'PARTICIPATION_REVIEW_PENDING'
    and alert.alert_status = 'OPEN'
    and not exists (
      select 1
      from public.aab_country_participation_requests request
      where request.id::text = alert.evidence_summary ->> 'request_id'
        and request.review_status = 'PENDING_REVIEW'
    );

  get diagnostics v_rows = row_count;
  v_resolved := v_resolved + v_rows;

  v_fingerprint := 'DAILY_ENTRY_BASELINE:' || to_char(current_date, 'YYYYMMDD');

  insert into security_core.security_alert(
    alert_fingerprint,
    alert_type,
    severity,
    confidence_status,
    title,
    explanation,
    evidence_summary,
    recommended_response,
    alert_status,
    acknowledged_at,
    acknowledged_by,
    resolution_rationale
  )
  values (
    v_fingerprint,
    'DAILY_ENTRY_BASELINE',
    'INFORMATION',
    'HIGH',
    'Daily protected-entry baseline',
    'A daily baseline was recorded for explainable comparison. This is not a threat determination.',
    jsonb_build_object(
      'allowed_entries',
      (select count(*) from platform.entry_audit_event
       where outcome_code = 'ALLOWED'
         and occurred_at > now() - interval '24 hours'),
      'window_hours',
      24
    ),
    'No action required. Retain for trend comparison.',
    'RESOLVED',
    now(),
    v_actor,
    'Informational baseline retained as historical evidence; no human response is required.'
  )
  on conflict (alert_fingerprint) do update
    set evidence_summary = excluded.evidence_summary,
        alert_status = case
          when security_core.security_alert.alert_status = 'OPEN'
            then 'RESOLVED'
          else security_core.security_alert.alert_status
        end,
        acknowledged_at = coalesce(
          security_core.security_alert.acknowledged_at,
          excluded.acknowledged_at
        ),
        acknowledged_by = coalesce(
          security_core.security_alert.acknowledged_by,
          excluded.acknowledged_by
        ),
        resolution_rationale = coalesce(
          security_core.security_alert.resolution_rationale,
          excluded.resolution_rationale
        );

  get diagnostics v_rows = row_count;

  update security_core.security_brain_run
  set completed_at = now(),
      rules_evaluated = 3,
      alerts_created = v_created,
      status = 'COMPLETED'
  where run_id = v_run;

  return jsonb_build_object(
    'ok', true,
    'run_id', v_run,
    'rules_evaluated', 3,
    'alerts_created_or_refreshed', v_created,
    'alerts_resolved', v_resolved,
    'open_alerts', (
      select count(*)
      from security_core.security_alert
      where alert_status = 'OPEN'
    ),
    'authority', 'ADVISORY_ONLY'
  );
exception
  when others then
    if v_run is not null then
      update security_core.security_brain_run
      set completed_at = now(), status = 'FAILED'
      where run_id = v_run;
    end if;
    raise;
end
$function$
;
