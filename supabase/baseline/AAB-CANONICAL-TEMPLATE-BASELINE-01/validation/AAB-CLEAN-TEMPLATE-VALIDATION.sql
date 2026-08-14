do $$
declare
  item record;
  actual bigint;
begin
  for item in
    select * from (values
      ('auth.users'),
      ('auth.sessions'),
      ('auth.identities'),
      ('agriculture.actor'),
      ('agriculture.actor_access_assignment'),
      ('agriculture.actor_authority'),
      ('platform.auth_actor_identity'),
      ('platform.platform_role_assignment'),
      ('platform.support_scope_session'),
      ('public.aab_country_participation_requests'),
      ('platform.participation_request_decision'),
      ('security_core.security_alert'),
      ('security_core.security_brain_run'),
      ('platform.entry_audit_event'),
      ('continuity_core.continuity_checkpoint'),
      ('country_core.country_workspace'),
      ('country_core.country_activation'),
      ('country_core.organization'),
      ('country_core.organization_membership'),
      ('country_core.workspace_membership'),
      ('country_core.country_invitation'),
      ('country_core.action_item'),
      ('country_core.notification'),
      ('agriculture.trial'),
      ('agriculture.plot'),
      ('agriculture.observation'),
      ('agriculture.measurement'),
      ('agriculture.outcome'),
      ('agriculture.formulation_version'),
      ('agriculture.evidence_packet'),
      ('agriculture.governance_decision'),
      ('agriculture.governance_review'),
      ('agriculture.scientific_memory_entry'),
      ('agriculture.learning_candidate'),
      ('agriculture.approved_learning'),
      ('agriculture.knowledge_gap'),
      ('agriculture.contradiction_record'),
      ('cognitive_core.cognitive_loop_run'),
      ('cognitive_core.intelligent_node'),
      ('cognitive_core.intelligent_relationship'),
      ('cognitive_core.node_evidence_signal'),
      ('presentation_core.access_request'),
      ('presentation_core.activity_event'),
      ('presentation_core.invitation'),
      ('presentation_core.password_reset_request'),
      ('presentation_core.portal_owner'),
      ('presentation_core.viewer'),
      ('presentation_core.viewer_question'),
      ('presentation_core.viewer_session'),
      ('storage.buckets'),
      ('storage.objects')
    ) v(relation_name)
  loop
    if to_regclass(item.relation_name) is null then
      raise exception 'ZERO_STATE_REQUIRED_RELATION_MISSING: %', item.relation_name;
    end if;
    execute format('select count(*) from %s', item.relation_name) into actual;
    if actual <> 0 then
      raise exception 'ZERO_STATE_FAIL: % contains % row(s)', item.relation_name, actual;
    end if;
  end loop;

  -- Exhaustive application-table zero-state: every table not explicitly
  -- allowlisted as generic reference/configuration seed must remain empty.
  for item in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p')
      and n.nspname in (
        'public','agriculture','cognitive_core','continuity_core','country_core',
        'manufacturing_core','observation_core','platform','presentation_core',
        'regulatory_core','security_core'
      )
      and (n.nspname,c.relname) not in (
        ('agriculture','aab_domain_classification'),
        ('agriculture','access_profile'),
        ('agriculture','application_gateway_contract'),
        ('agriculture','authority_role'),
        ('agriculture','measurement_method'),
        ('agriculture','metric_definition'),
        ('agriculture','validation_rule'),
        ('agriculture','observation_template'),
        ('agriculture','observation_template_version'),
        ('agriculture','observation_template_metric'),
        ('cognitive_core','algorithm_registry'),
        ('cognitive_core','brain_registry'),
        ('cognitive_core','domain_brain_inheritance'),
        ('observation_core','domain_adapter'),
        ('platform','domain_registry'),
        ('platform','navigation_item'),
        ('platform','navigation_section')
      )
  loop
    execute format('select count(*) from %I.%I', item.schema_name, item.table_name) into actual;
    if actual <> 0 then
      raise exception 'NON_SEED_TABLE_NOT_EMPTY: %.% contains % row(s)', item.schema_name, item.table_name, actual;
    end if;
  end loop;

  if exists (
    select 1 from platform.domain_registry
    where enabled and domain_code <> 'AGRICULTURE'
  ) then
    raise exception 'DOMAIN_ALLOWLIST_FAIL: non-Agriculture domain enabled';
  end if;

  if exists (
    select 1 from observation_core.domain_adapter
    where enabled and domain_code <> 'AGRICULTURE'
  ) then
    raise exception 'ADAPTER_ALLOWLIST_FAIL: non-Agriculture adapter enabled';
  end if;

  if not exists (
    select 1 from agriculture.aab_domain_classification
    where domain_code = 'AGRICULTURE' and operational_enabled
  ) or exists (
    select 1 from agriculture.aab_domain_classification
    where domain_code <> 'AGRICULTURE' and operational_enabled
  ) then
    raise exception 'DOMAIN_CLASSIFICATION_ALLOWLIST_FAIL';
  end if;

  if exists (
    select 1 from cognitive_core.brain_registry
    where not advisory_only
       or not scientist_authority_required
       or autonomous_approval_allowed
  ) then
    raise exception 'COGNITIVE_AUTHORITY_INVARIANT_FAIL';
  end if;

  if exists (
    select 1 from cognitive_core.domain_brain_inheritance
    where domain_code <> 'AGRICULTURE'
       or inheritance_status <> 'REQUIRED'
       or local_override_allowed
       or not fail_closed_on_kernel_absence
  ) or exists (
    select 1 from cognitive_core.brain_registry b
    where b.lifecycle_status = 'ACTIVE'
      and not exists (
        select 1 from cognitive_core.domain_brain_inheritance i
        where i.domain_code = 'AGRICULTURE'
          and i.brain_code = b.brain_code
      )
  ) then
    raise exception 'AGRICULTURE_BRAIN_INHERITANCE_FAIL';
  end if;

  if exists (
    select 1
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where c.relkind in ('r','p') and n.nspname='public' and not c.relrowsecurity
  ) then
    raise exception 'RLS_FAIL: exposed public table without RLS';
  end if;

  if exists (
    select 1 from information_schema.role_table_grants
    where grantee in ('anon','authenticated')
      and table_schema in ('public','platform','agriculture','country_core','security_core')
  ) then
    raise exception 'DIRECT_BROWSER_TABLE_GRANT_FAIL';
  end if;
end $$;

select 'AAB-CANONICAL-TEMPLATE-BASELINE-01: PASS' as result;
