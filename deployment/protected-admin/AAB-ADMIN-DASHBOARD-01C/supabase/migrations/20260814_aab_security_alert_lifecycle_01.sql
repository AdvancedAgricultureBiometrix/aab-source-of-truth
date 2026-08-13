
-- AAB Security Alert Lifecycle 01
-- WHY: keep advisory security alerts synchronised with current protected evidence.
-- No country provisioning, role mutation, access revocation or autonomous authority.

create or replace function security_core.api_run_security_brain()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, security_core, platform, agriculture, public
as $function$
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
$function$;

create or replace function public.aab_admin_review_participation_request(
  p_request_id uuid,
  p_decision text,
  p_rationale text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, platform, country_core, agriculture, security_core
as $function$
declare
  v_actor uuid;
  v_old text;
  v_new text;
  v_reference text;
  v_security_result jsonb;
begin
  v_actor := platform.current_actor_id();
  if v_actor is null or not platform.is_platform_admin(v_actor) then
    raise exception 'AAB_PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  v_new := upper(btrim(coalesce(p_decision, '')));
  if v_new not in ('MORE_INFORMATION_REQUIRED', 'APPROVED', 'DECLINED') then
    raise exception 'INVALID_REVIEW_DECISION';
  end if;

  if length(btrim(coalesce(p_rationale, ''))) < 12 then
    raise exception 'MEANINGFUL_REVIEW_RATIONALE_REQUIRED';
  end if;

  select review_status, reference
  into v_old, v_reference
  from public.aab_country_participation_requests
  where id = p_request_id
  for update;

  if v_old is null then
    raise exception 'PARTICIPATION_REQUEST_NOT_FOUND';
  end if;

  if v_old not in ('PENDING_REVIEW', 'MORE_INFORMATION_REQUIRED') then
    raise exception 'REQUEST_ALREADY_DECIDED';
  end if;

  update public.aab_country_participation_requests
  set review_status = v_new,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      review_notes = btrim(p_rationale)
  where id = p_request_id;

  insert into platform.participation_request_decision(
    request_id,
    previous_status,
    decision_status,
    rationale,
    decided_by
  )
  values (
    p_request_id,
    v_old,
    v_new,
    btrim(p_rationale),
    v_actor
  );

  update country_core.action_item
  set action_status = 'DONE',
      completed_at = now()
  where assigned_actor_id = v_actor
    and source_entity_type = 'AAB_COUNTRY_PARTICIPATION_REQUEST'
    and source_entity_id = p_request_id
    and action_status in ('OPEN', 'IN_PROGRESS');

  v_security_result := security_core.api_run_security_brain();

  return jsonb_build_object(
    'ok', true,
    'reference', v_reference,
    'status', v_new,
    'country_provisioned', false,
    'provisioning_confirmation_required', v_new = 'APPROVED',
    'security_reconciliation', v_security_result
  );
end
$function$;

create or replace function public.aab_admin_security_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, security_core, platform, agriculture, public
as $function$
declare
  v_actor uuid;
begin
  v_actor := platform.current_actor_id();
  if v_actor is null or not platform.is_platform_admin(v_actor) then
    raise exception 'AAB_PLATFORM_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'counts', jsonb_build_object(
      'open', (
        select count(*)
        from security_core.security_alert
        where alert_status = 'OPEN'
      ),
      'high_or_critical', (
        select count(*)
        from security_core.security_alert
        where alert_status = 'OPEN'
          and severity in ('HIGH', 'CRITICAL')
      )
    ),
    'alerts', coalesce((
      select jsonb_agg(to_jsonb(alert_row) order by alert_row.detected_at desc)
      from (
        select *
        from security_core.security_alert
        where alert_status = 'OPEN'
        order by detected_at desc
        limit 100
      ) alert_row
    ), '[]'::jsonb),
    'latest_run', (
      select to_jsonb(run_row)
      from security_core.security_brain_run run_row
      order by started_at desc
      limit 1
    ),
    'authority_boundary', 'ADVISORY_ONLY_HUMAN_DECISION_REQUIRED'
  );
end
$function$;

revoke all on function security_core.api_run_security_brain() from public, anon, authenticated;
revoke all on function public.aab_admin_review_participation_request(uuid, text, text) from public, anon;
revoke all on function public.aab_admin_security_snapshot() from public, anon;
grant execute on function public.aab_admin_review_participation_request(uuid, text, text) to authenticated;
grant execute on function public.aab_admin_security_snapshot() to authenticated;
