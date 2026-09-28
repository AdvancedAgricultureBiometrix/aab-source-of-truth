-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: cognitive_core. Functions and procedures: full definitions (pg_get_functiondef), owners and comments.
-- Catalog counts for cognitive_core: functions 25, tables 18, views 1, sequences 0, rls_enabled_tables 0, constraints 157, triggers 0, policies 0, indexes 39.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_begin_intelligence_activity(p_domain_code text, p_activity_scope text, p_component_code text, p_component_label text, p_activity_type text, p_headline text, p_trigger_entity_type text, p_trigger_entity_id uuid, p_trigger_label text, p_detail jsonb, p_actor_id uuid, p_country_workspace_id uuid DEFAULT NULL::uuid, p_correlation_id uuid DEFAULT NULL::uuid, p_parent_event_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'country_core', 'platform', 'public'
AS $function$
declare
  v_event cognitive_core.intelligence_activity_event;
  v_domain text := upper(nullif(btrim(p_domain_code),''));
  v_scope text := upper(btrim(p_activity_scope));
  v_type text := upper(btrim(p_activity_type));
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  if v_domain is not null and not exists(select 1 from platform.domain_registry d where d.domain_code=v_domain) then
    raise exception 'INTELLIGENCE_ACTIVITY_DOMAIN_NOT_REGISTERED' using errcode='23514';
  end if;
  if p_country_workspace_id is not null and not exists(
    select 1 from country_core.workspace_membership wm
    where wm.actor_id=p_actor_id and wm.country_workspace_id=p_country_workspace_id and wm.membership_status='ACTIVE'
  ) then raise exception 'INTELLIGENCE_ACTIVITY_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  if nullif(btrim(p_headline),'') is null then raise exception 'INTELLIGENCE_ACTIVITY_HEADLINE_REQUIRED' using errcode='23514'; end if;

  insert into cognitive_core.intelligence_activity_event(
    correlation_id,parent_event_id,domain_code,country_workspace_id,activity_scope,
    component_code,component_label,activity_type,status,trigger_entity_type,trigger_entity_id,
    trigger_label,headline,detail,actor_id
  ) values(
    coalesce(p_correlation_id,gen_random_uuid()),p_parent_event_id,v_domain,p_country_workspace_id,v_scope,
    nullif(btrim(p_component_code),''),nullif(btrim(p_component_label),''),v_type,'RUNNING',
    nullif(btrim(p_trigger_entity_type),''),p_trigger_entity_id,nullif(btrim(p_trigger_label),''),
    btrim(p_headline),coalesce(p_detail,'{}'::jsonb),p_actor_id
  ) returning * into v_event;

  return to_jsonb(v_event);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_compute_node_state(p_node_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'public'
AS $function$
declare
  n cognitive_core.intelligent_node;
  support_w numeric:=0; contra_w numeric:=0; neg_w numeric:=0; neutral_w numeric:=0; total_w numeric:=0;
  q numeric:=0; ind numeric:=0; ctx numeric:=0.5; tmp numeric:=1; mech numeric:=0;
  cnt integer:=0; independent_count integer:=0; distinct_sources integer:=0; gaps integer:=0; rel_domains integer:=0;
  belief numeric:=0.5; uncertainty numeric:=1; evidence_strength numeric:=0; diversity numeric:=0; replication numeric:=0;
  contradiction numeric:=0; negative_p numeric:=0; mechanism numeric:=0; governance numeric:=0; cross_domain numeric:=0; info_gain numeric:=1;
  novelty numeric:=0.5; anomaly numeric:=0; label text; expl text; needs jsonb;
begin
  select * into n from cognitive_core.intelligent_node where node_id=p_node_id;
  if n.node_id is null then raise exception 'COGNITIVE_NODE_NOT_FOUND' using errcode='P0002'; end if;
  select
    coalesce(sum(case when signal_direction='SUPPORTS' and governance_eligible then evidence_quality*independence_weight*context_fit*temporal_relevance else 0 end),0),
    coalesce(sum(case when signal_direction='CONTRADICTS' and governance_eligible then evidence_quality*independence_weight*context_fit*temporal_relevance else 0 end),0),
    coalesce(sum(case when signal_direction='NEGATIVE_LEARNING' and governance_eligible then evidence_quality*independence_weight*context_fit*temporal_relevance else 0 end),0),
    coalesce(sum(case when signal_direction='NEUTRAL' and governance_eligible then evidence_quality*independence_weight*context_fit*temporal_relevance else 0 end),0),
    coalesce(avg(evidence_quality) filter(where governance_eligible),0),
    coalesce(avg(independence_weight) filter(where governance_eligible),0),
    coalesce(avg(context_fit) filter(where governance_eligible),0.5),
    coalesce(avg(temporal_relevance) filter(where governance_eligible),1),
    coalesce(avg(mechanism_fit) filter(where governance_eligible and signal_direction='SUPPORTS'),0),
    count(*) filter(where governance_eligible),
    count(*) filter(where governance_eligible and independence_weight>=0.7),
    count(distinct coalesce(source_fingerprint,source_entity_type||':'||coalesce(source_entity_id::text,''))) filter(where governance_eligible)
  into support_w,contra_w,neg_w,neutral_w,q,ind,ctx,tmp,mech,cnt,independent_count,distinct_sources
  from cognitive_core.node_evidence_signal where node_id=p_node_id;
  total_w:=support_w+contra_w+neg_w+neutral_w;
  if total_w>0 then
    belief:=greatest(0,least(1,0.5 + 0.5*((support_w-contra_w-(neg_w*0.8))/greatest(total_w,0.0001))));
    contradiction:=least(1,contra_w/greatest(total_w,0.0001));
    negative_p:=least(1,neg_w/greatest(total_w,0.0001));
  end if;
  evidence_strength:=least(1,(q*least(cnt,5))/5.0);
  diversity:=least(1,distinct_sources/5.0);
  replication:=least(1,independent_count/4.0);
  mechanism:=least(1,mech);
  governance:=case n.governance_status when 'APPROVED' then 1 when 'REVIEW_REQUIRED' then 0.6 when 'EXPERIMENTAL_UNVERIFIED' then 0.25 when 'QUARANTINED' then 0.05 else 0 end;
  select count(*) into gaps from agriculture.knowledge_gap where subject_entity_type=coalesce(n.subject_entity_type,'') and subject_entity_id=n.subject_entity_id and lifecycle_status in ('OPEN','UNDER_INVESTIGATION');
  select count(distinct coalesce(target_node.domain_code,'GLOBAL')) into rel_domains from cognitive_core.intelligent_relationship r join cognitive_core.intelligent_node target_node on target_node.node_id=r.target_node_id where r.source_node_id=p_node_id and r.lifecycle_status='ACTIVE';
  cross_domain:=least(1,rel_domains/4.0);
  novelty:=coalesce((select max(o.scientific_value) from cognitive_core.transformation_opportunity o where o.node_id=p_node_id),0.5);
  uncertainty:=greatest(0,least(1,1-((evidence_strength*0.35)+(diversity*0.2)+(replication*0.2)+(ctx*0.1)+(governance*0.15))+(contradiction*0.25)));
  info_gain:=greatest(0,least(1,(uncertainty*0.55)+((1-evidence_strength)*0.25)+(least(1,gaps/5.0)*0.2)));
  anomaly:=least(1,greatest(contradiction,negative_p)*0.7 + uncertainty*0.3);
  label:=case when cnt=0 then 'INSUFFICIENT_EVIDENCE' when n.governance_status='QUARANTINED' then 'QUARANTINED' when contradiction>=0.45 then 'CONTRADICTED_OR_CONTEXT_DEPENDENT' when belief>=0.8 and uncertainty<=0.35 then 'STRONGLY_SUPPORTED' when belief>=0.65 then 'SUPPORTED_WITH_UNCERTAINTY' when belief<=0.35 then 'NOT_SUPPORTED_OR_NEGATIVE' else 'MIXED_OR_UNRESOLVED' end;
  expl:='Belief '||round(belief,2)||'; evidence '||round(evidence_strength,2)||'; diversity '||round(diversity,2)||'; replication '||round(replication,2)||'; context '||round(ctx,2)||'; mechanism '||round(mechanism,2)||'; contradiction '||round(contradiction,2)||'; negative-learning '||round(negative_p,2)||'; uncertainty '||round(uncertainty,2)||'.';
  needs:=jsonb_build_array(case when evidence_strength<0.6 then 'Add higher-quality governed evidence.' else null end,case when diversity<0.5 then 'Add independent evidence from a different provenance lineage.' else null end,case when replication<0.5 then 'Replicate under independent conditions.' else null end,case when ctx<0.6 then 'Test under a closer target context.' else null end,case when contradiction>0.25 then 'Resolve contradiction or identify the hidden context variable.' else null end,case when mechanism<0.5 then 'Collect mechanism-discriminating measurements.' else null end,case when gaps>0 then 'Address '||gaps||' open knowledge gap(s).' else null end);
  needs:=(select coalesce(jsonb_agg(x),'[]'::jsonb) from jsonb_array_elements(needs) x where x <> 'null'::jsonb);
  insert into cognitive_core.node_cognitive_state(node_id,belief_confidence,uncertainty,evidence_strength,evidence_diversity,replication_strength,context_fit,mechanism_support,contradiction_pressure,negative_learning_pressure,novelty,knowledge_gap_density,temporal_relevance,governance_readiness,cross_domain_relevance,information_gain_opportunity,anomaly_pressure,state_label,explanation,next_evidence_needed,algorithm_version,calculated_at)
  values(p_node_id,belief,uncertainty,evidence_strength,diversity,replication,ctx,mechanism,contradiction,negative_p,novelty,least(1,gaps/5.0),tmp,governance,cross_domain,info_gain,anomaly,label,expl,needs,'UCK-v1',now())
  on conflict(node_id) do update set belief_confidence=excluded.belief_confidence,uncertainty=excluded.uncertainty,evidence_strength=excluded.evidence_strength,evidence_diversity=excluded.evidence_diversity,replication_strength=excluded.replication_strength,context_fit=excluded.context_fit,mechanism_support=excluded.mechanism_support,contradiction_pressure=excluded.contradiction_pressure,negative_learning_pressure=excluded.negative_learning_pressure,novelty=excluded.novelty,knowledge_gap_density=excluded.knowledge_gap_density,temporal_relevance=excluded.temporal_relevance,governance_readiness=excluded.governance_readiness,cross_domain_relevance=excluded.cross_domain_relevance,information_gain_opportunity=excluded.information_gain_opportunity,anomaly_pressure=excluded.anomaly_pressure,state_label=excluded.state_label,explanation=excluded.explanation,next_evidence_needed=excluded.next_evidence_needed,algorithm_version=excluded.algorithm_version,calculated_at=excluded.calculated_at;
  return (select to_jsonb(s) from cognitive_core.node_cognitive_state s where s.node_id=p_node_id);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_create_transformation_opportunity(p_problem_signal_id uuid, p_opportunity_type text, p_summary text, p_resource_hypothesis text, p_novelty_mode text, p_environmental_value numeric, p_economic_value numeric, p_scientific_value numeric, p_feasibility numeric, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'public'
AS $function$
declare ps cognitive_core.problem_signal; oid uuid; nid uuid; code text; info numeric;
begin
  select * into ps from cognitive_core.problem_signal where problem_signal_id=p_problem_signal_id and lifecycle_status in ('OPEN','UNDER_ANALYSIS','TRANSFORMED');
  if ps.problem_signal_id is null then raise exception 'OPEN_PROBLEM_SIGNAL_REQUIRED' using errcode='23514'; end if;
  if nullif(btrim(p_summary),'') is null then raise exception 'OPPORTUNITY_SUMMARY_REQUIRED' using errcode='23514'; end if;
  code:='OPP-'||replace(gen_random_uuid()::text,'-','');
  info:=greatest(0,least(1,0.6 + (coalesce(p_scientific_value,0.5)*0.2) + ((1-coalesce(p_feasibility,0.5))*0.2)));
  insert into cognitive_core.intelligent_node(node_code,node_type,node_label,node_description,domain_code,country_workspace_id,provenance_type,governance_status,created_by)
  values('NODE-'||code,'TRANSFORMATION_OPPORTUNITY',left(btrim(p_summary),160),btrim(p_summary),ps.domain_code,ps.country_workspace_id,'AAB_DETECTION','EXPERIMENTAL_UNVERIFIED',p_actor_id) returning node_id into nid;
  insert into cognitive_core.transformation_opportunity(opportunity_code,source_problem_signal_id,opportunity_type,opportunity_summary,scientific_resource_hypothesis,novelty_mode,environmental_value,economic_value,scientific_value,feasibility,expected_information_gain,next_best_action,node_id,created_by)
  values(code,p_problem_signal_id,upper(btrim(p_opportunity_type)),btrim(p_summary),nullif(btrim(p_resource_hypothesis),''),upper(coalesce(nullif(btrim(p_novelty_mode),''),'UNASSESSED')),coalesce(p_environmental_value,0),coalesce(p_economic_value,0),coalesce(p_scientific_value,0.5),coalesce(p_feasibility,0.5),info,'Characterise the problem/resource and test the highest-value uncertainty before any promotion or operational use.',nid,p_actor_id) returning transformation_opportunity_id into oid;
  update cognitive_core.intelligent_node set subject_entity_type='TRANSFORMATION_OPPORTUNITY',subject_entity_id=oid where node_id=nid;
  insert into cognitive_core.intelligent_relationship(relationship_code,source_node_id,target_node_id,relationship_type,semantic_strength,confidence,country_workspace_id,created_by)
  values('REL-'||replace(gen_random_uuid()::text,'-',''),ps.node_id,nid,'TRANSFORMS_INTO',0.8,0.4,ps.country_workspace_id,p_actor_id);
  update cognitive_core.problem_signal set lifecycle_status='TRANSFORMED' where problem_signal_id=p_problem_signal_id;
  return jsonb_build_object('transformation_opportunity_id',oid,'node_id',nid,'status','CANDIDATE','autonomous_execution_allowed',false,'scientist_review_required',true);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_finish_intelligence_activity(p_activity_event_id uuid, p_status text, p_headline text, p_detail jsonb, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'public'
AS $function$
declare v_event cognitive_core.intelligence_activity_event; v_status text:=upper(btrim(p_status));
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  if v_status not in ('COMPLETED','FAILED','ATTENTION') then raise exception 'INVALID_INTELLIGENCE_ACTIVITY_FINAL_STATUS' using errcode='22023'; end if;
  update cognitive_core.intelligence_activity_event
     set status=v_status,
         activity_type=case when v_status='FAILED' then 'FAILED' when v_status='ATTENTION' then 'ATTENTION' else 'COMPLETED' end,
         headline=coalesce(nullif(btrim(p_headline),''),headline),
         detail=detail || coalesce(p_detail,'{}'::jsonb),
         completed_at=now()
   where activity_event_id=p_activity_event_id and status='RUNNING'
   returning * into v_event;
  if v_event.activity_event_id is null then raise exception 'INTELLIGENCE_ACTIVITY_NOT_RUNNING' using errcode='55000'; end if;
  return to_jsonb(v_event);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_get_agriculture_cognitive_loop_workspace(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'country_core', 'public'
AS $function$
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  return jsonb_build_object(
    'integrity',jsonb_build_object(
      'domain','AGRICULTURE',
      'universal_kernel_inherited',(select count(*) from cognitive_core.domain_brain_inheritance where domain_code='AGRICULTURE' and inheritance_status='REQUIRED')=(select count(*) from cognitive_core.brain_registry where lifecycle_status='ACTIVE' and inherited_by_all_domains),
      'active_brains',(select count(*) from cognitive_core.brain_registry where lifecycle_status='ACTIVE'),
      'active_algorithms',(select count(*) from cognitive_core.algorithm_registry where lifecycle_status='ACTIVE'),
      'agriculture_nodes',(select count(*) from cognitive_core.intelligent_node n where n.domain_code='AGRICULTURE' and n.lifecycle_status='ACTIVE' and (n.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=n.country_workspace_id and wm.membership_status='ACTIVE'))),
      'agriculture_relationships',(select count(*) from cognitive_core.intelligent_relationship r join cognitive_core.intelligent_node n on n.node_id=r.source_node_id where n.domain_code='AGRICULTURE' and r.lifecycle_status='ACTIVE' and (r.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=r.country_workspace_id and wm.membership_status='ACTIVE'))),
      'open_investigations',(select count(*) from cognitive_core.next_investigation_candidate x where x.domain_code='AGRICULTURE' and x.status in ('CANDIDATE','UNDER_REVIEW','ACCEPTED_FOR_INVESTIGATION') and (x.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=x.country_workspace_id and wm.membership_status='ACTIVE'))),
      'autonomous_execution_allowed',false,
      'scientist_authority_preserved',true,
      'scientific_display_contract','ALGORITHM_PRIOR_IS_NOT_A_SCIENTIFIC_CLAIM'
    ),
    'latest_runs',coalesce((select jsonb_agg(to_jsonb(x) order by x.run_started_at desc) from (select * from cognitive_core.cognitive_loop_run where domain_code='AGRICULTURE' order by run_started_at desc limit 20) x),'[]'::jsonb),
    'node_states',coalesce((select jsonb_agg(jsonb_build_object(
      'node_id',n.node_id,'node_code',n.node_code,'node_type',n.node_type,'node_label',n.node_label,
      'subject_entity_type',n.subject_entity_type,'subject_entity_id',n.subject_entity_id,
      'governance_status',n.governance_status,'country_workspace_id',n.country_workspace_id,
      'state',to_jsonb(s),
      'scientific_interpretation',cognitive_core.interpret_node_state(to_jsonb(s))
    ) order by s.information_gain_opportunity desc nulls last,n.node_label)
    from cognitive_core.intelligent_node n
    left join cognitive_core.node_cognitive_state s on s.node_id=n.node_id
    where n.domain_code='AGRICULTURE' and n.lifecycle_status='ACTIVE'
      and (n.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=n.country_workspace_id and wm.membership_status='ACTIVE'))),'[]'::jsonb),
    'relationships',coalesce((select jsonb_agg(jsonb_build_object('relationship_id',r.relationship_id,'relationship_type',r.relationship_type,'source',jsonb_build_object('node_id',sn.node_id,'label',sn.node_label,'type',sn.node_type),'target',jsonb_build_object('node_id',tn.node_id,'label',tn.node_label,'type',tn.node_type),'semantic_strength',r.semantic_strength,'confidence',r.confidence,'governance_status',r.governance_status,'uncertainty_summary',r.uncertainty_summary) order by r.created_at desc) from cognitive_core.intelligent_relationship r join cognitive_core.intelligent_node sn on sn.node_id=r.source_node_id join cognitive_core.intelligent_node tn on tn.node_id=r.target_node_id where r.lifecycle_status='ACTIVE' and (sn.domain_code='AGRICULTURE' or tn.domain_code='AGRICULTURE') and (r.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=r.country_workspace_id and wm.membership_status='ACTIVE'))),'[]'::jsonb),
    'next_investigations',coalesce((select jsonb_agg(jsonb_build_object('candidate',to_jsonb(x),'source_node',jsonb_build_object('node_code',n.node_code,'node_label',n.node_label,'node_type',n.node_type),'knowledge_gap',case when g.knowledge_gap_id is null then null else jsonb_build_object('gap_code',g.gap_code,'gap_statement',g.gap_statement,'priority_status',g.priority_status,'why_it_matters',g.why_it_matters) end) order by x.priority_score desc,x.expected_information_gain desc,x.created_at desc) from cognitive_core.next_investigation_candidate x join cognitive_core.intelligent_node n on n.node_id=x.source_node_id left join agriculture.knowledge_gap g on g.knowledge_gap_id=x.knowledge_gap_id where x.domain_code='AGRICULTURE' and x.status in ('CANDIDATE','UNDER_REVIEW','ACCEPTED_FOR_INVESTIGATION') and (x.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=x.country_workspace_id and wm.membership_status='ACTIVE'))),'[]'::jsonb),
    'reassessment_queue',coalesce((select jsonb_agg(jsonb_build_object('reassessment',to_jsonb(q),'source_label',s.node_label,'affected_label',a.node_label) order by q.created_at desc) from cognitive_core.reassessment_queue q join cognitive_core.intelligent_node s on s.node_id=q.source_node_id join cognitive_core.intelligent_node a on a.node_id=q.affected_node_id where q.status='OPEN' and (s.domain_code='AGRICULTURE' or a.domain_code='AGRICULTURE')),'[]'::jsonb),
    'aab_detected_problems',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc) from cognitive_core.problem_signal p where p.domain_code='AGRICULTURE' and p.origin_type='AAB_DETECTION' and p.lifecycle_status in ('OPEN','UNDER_ANALYSIS','TRANSFORMED') and (p.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=p.country_workspace_id and wm.membership_status='ACTIVE'))),'[]'::jsonb),
    'transformation_opportunities',coalesce((select jsonb_agg(to_jsonb(o) order by o.expected_information_gain desc,o.created_at desc) from cognitive_core.transformation_opportunity o join cognitive_core.problem_signal p on p.problem_signal_id=o.source_problem_signal_id where p.domain_code='AGRICULTURE' and o.status in ('CANDIDATE','UNDER_REVIEW','ACCEPTED_FOR_INVESTIGATION') and (p.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=p.country_workspace_id and wm.membership_status='ACTIVE'))),'[]'::jsonb)
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_get_foundation_workspace(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'country_core', 'platform', 'public'
AS $function$
declare has_country boolean; result jsonb;
begin
  select exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and membership_status='ACTIVE') into has_country;
  select jsonb_build_object(
    'foundation',(select to_jsonb(v) from cognitive_core.v_cognitive_foundation v),
    'brains',(select coalesce(jsonb_agg(to_jsonb(b) order by b.brain_type,b.brain_code),'[]'::jsonb) from cognitive_core.brain_registry b where b.lifecycle_status='ACTIVE'),
    'algorithms',(select coalesce(jsonb_agg(to_jsonb(a) order by a.algorithm_family,a.algorithm_code),'[]'::jsonb) from cognitive_core.algorithm_registry a where a.lifecycle_status in ('ACTIVE','EXPERIMENTAL')),
    'domain_inheritance',(select coalesce(jsonb_agg(to_jsonb(x) order by x.domain_code,x.brain_code),'[]'::jsonb) from cognitive_core.domain_brain_inheritance x),
    'targets',(select coalesce(jsonb_agg(to_jsonb(t) order by t.target_scope,t.target_code),'[]'::jsonb) from cognitive_core.target_registry t where t.lifecycle_status='ACTIVE' and (t.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=t.country_workspace_id and wm.membership_status='ACTIVE'))),
    'problem_signals',(select coalesce(jsonb_agg(to_jsonb(p) order by p.created_at desc),'[]'::jsonb) from cognitive_core.problem_signal p where p.lifecycle_status<>'ARCHIVED' and (p.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=p.country_workspace_id and wm.membership_status='ACTIVE'))),
    'transformation_opportunities',(select coalesce(jsonb_agg(to_jsonb(o) order by o.created_at desc),'[]'::jsonb) from cognitive_core.transformation_opportunity o join cognitive_core.problem_signal p on p.problem_signal_id=o.source_problem_signal_id where o.status<>'ARCHIVED' and (p.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=p.country_workspace_id and wm.membership_status='ACTIVE'))),
    'ingredient_candidates',(select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at desc),'[]'::jsonb) from cognitive_core.ingredient_build_candidate i where i.scientific_status<>'ARCHIVED' and (i.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=i.country_workspace_id and wm.membership_status='ACTIVE'))),
    'reassessment_queue',(select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) from cognitive_core.reassessment_queue r where r.status='OPEN')
  ) into result;
  return result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_get_intelligence_activity_timeline(p_domain_code text, p_actor_id uuid, p_limit integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'country_core', 'public'
AS $function$
declare v_domain text:=upper(coalesce(nullif(btrim(p_domain_code),''),'AGRICULTURE')); v_limit integer:=greatest(1,least(coalesce(p_limit,100),250));
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.started_at desc) from (
    select e.* from cognitive_core.intelligence_activity_event e
    where e.visible and (e.domain_code=v_domain or e.domain_code is null)
      and (e.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=e.country_workspace_id and wm.membership_status='ACTIVE'))
    order by e.started_at desc limit v_limit
  ) x),'[]'::jsonb);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_get_live_intelligence_surface(p_domain_code text, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'country_core', 'platform', 'public'
AS $function$
declare
  v_domain text:=upper(coalesce(nullif(btrim(p_domain_code),''),'AGRICULTURE'));
  v_nodes integer; v_relationships integer; v_investigations integer; v_brains integer; v_algorithms integer;
  v_running integer; v_latest timestamptz;
begin
  perform agriculture.api_require_capability(p_actor_id,'read',null);

  select count(*) into v_nodes from cognitive_core.intelligent_node n
   where n.domain_code=v_domain and n.lifecycle_status='ACTIVE'
     and (n.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=n.country_workspace_id and wm.membership_status='ACTIVE'));

  select count(*) into v_relationships from cognitive_core.intelligent_relationship r
   join cognitive_core.intelligent_node n on n.node_id=r.source_node_id
   where r.lifecycle_status='ACTIVE' and n.domain_code=v_domain
     and (r.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=r.country_workspace_id and wm.membership_status='ACTIVE'));

  select count(*) into v_investigations from cognitive_core.next_investigation_candidate x
   where x.domain_code=v_domain and x.status in ('CANDIDATE','UNDER_REVIEW','ACCEPTED_FOR_INVESTIGATION')
     and (x.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=x.country_workspace_id and wm.membership_status='ACTIVE'));

  select count(*) into v_brains from cognitive_core.domain_brain_inheritance i join cognitive_core.brain_registry b using(brain_code)
   where i.domain_code=v_domain and i.inheritance_status in ('REQUIRED','ACTIVE') and b.lifecycle_status='ACTIVE';
  select count(*) into v_algorithms from cognitive_core.algorithm_registry where lifecycle_status='ACTIVE';

  select count(*),max(started_at) into v_running,v_latest
  from cognitive_core.intelligence_activity_event e
  where e.visible and (e.domain_code=v_domain or e.domain_code is null)
    and e.status='RUNNING' and e.started_at > now()-interval '15 minutes'
    and (e.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=e.country_workspace_id and wm.membership_status='ACTIVE'));

  return jsonb_build_object(
    'domain_code',v_domain,
    'generated_at',now(),
    'autonomous_execution_allowed',false,
    'scientist_authority_preserved',true,
    'counts',jsonb_build_object('nodes',v_nodes,'relationships',v_relationships,'investigations',v_investigations,'brains',v_brains,'algorithms',v_algorithms),
    'current',jsonb_build_object('running_events',v_running,'is_processing',v_running>0,'latest_started_at',v_latest),
    'active_events',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.started_at desc) from (
        select e.* from cognitive_core.intelligence_activity_event e
        where e.visible and (e.domain_code=v_domain or e.domain_code is null)
          and e.status='RUNNING' and e.started_at > now()-interval '15 minutes'
          and (e.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=e.country_workspace_id and wm.membership_status='ACTIVE'))
        order by e.started_at desc limit 20
      ) x
    ),'[]'::jsonb),
    'recent_activity',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.started_at desc) from (
        select e.* from cognitive_core.intelligence_activity_event e
        where e.visible and (e.domain_code=v_domain or e.domain_code is null)
          and (e.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=e.country_workspace_id and wm.membership_status='ACTIVE'))
        order by e.started_at desc limit 40
      ) x
    ),'[]'::jsonb),
    'brain_status',coalesce((
      select jsonb_agg(jsonb_build_object(
        'brain_code',b.brain_code,'brain_name',b.brain_name,'brain_type',b.brain_type,
        'runtime_status',case when exists(select 1 from cognitive_core.intelligence_activity_event e where e.activity_scope='BRAIN' and e.component_code=b.brain_code and (e.domain_code=v_domain or e.domain_code is null) and e.status='RUNNING' and e.started_at>now()-interval '15 minutes') then 'WORKING' else 'IDLE' end,
        'last_activity',(select jsonb_build_object('status',e.status,'activity_type',e.activity_type,'headline',e.headline,'started_at',e.started_at,'completed_at',e.completed_at) from cognitive_core.intelligence_activity_event e where e.activity_scope='BRAIN' and e.component_code=b.brain_code and (e.domain_code=v_domain or e.domain_code is null) order by e.started_at desc limit 1)
      ) order by b.brain_name)
      from cognitive_core.domain_brain_inheritance i join cognitive_core.brain_registry b using(brain_code)
      where i.domain_code=v_domain and i.inheritance_status in ('REQUIRED','ACTIVE') and b.lifecycle_status='ACTIVE'
    ),'[]'::jsonb),
    'algorithm_status',coalesce((
      select jsonb_agg(jsonb_build_object(
        'algorithm_code',a.algorithm_code,'algorithm_name',a.algorithm_name,'algorithm_version',a.algorithm_version,
        'lifecycle_status',a.lifecycle_status,
        'runtime_status',case when exists(select 1 from cognitive_core.intelligence_activity_event e where e.activity_scope='ALGORITHM' and (e.detail->'algorithm_codes') ? a.algorithm_code and (e.domain_code=v_domain or e.domain_code is null) and e.status='RUNNING' and e.started_at>now()-interval '15 minutes') then 'WORKING' else 'HEALTHY' end
      ) order by a.algorithm_name) from cognitive_core.algorithm_registry a where a.lifecycle_status='ACTIVE'
    ),'[]'::jsonb)
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_propagate_reassessment(p_source_node_id uuid, p_reason text, p_severity text DEFAULT 'MODERATE'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'public'
AS $function$
declare c integer:=0;
begin
  insert into cognitive_core.reassessment_queue(source_node_id,affected_node_id,reason,severity)
  select p_source_node_id,case when r.source_node_id=p_source_node_id then r.target_node_id else r.source_node_id end,btrim(p_reason),upper(p_severity)
  from cognitive_core.intelligent_relationship r
  where (r.source_node_id=p_source_node_id or r.target_node_id=p_source_node_id) and r.lifecycle_status='ACTIVE'
  on conflict do nothing;
  get diagnostics c=row_count;
  return jsonb_build_object('source_node_id',p_source_node_id,'reassessment_signals_created',c,'downstream_beliefs_mutated',false);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_propose_ingredient_candidate(p_opportunity_id uuid, p_candidate_name text, p_novelty_mode text, p_candidate_concept text, p_composition_plan jsonb, p_process_plan jsonb, p_target_mechanisms jsonb, p_predicted_functions jsonb, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'public'
AS $function$
declare o cognitive_core.transformation_opportunity; cid uuid; nid uuid; code text;
begin
  select * into o from cognitive_core.transformation_opportunity where transformation_opportunity_id=p_opportunity_id and status in ('CANDIDATE','UNDER_REVIEW','ACCEPTED_FOR_INVESTIGATION');
  if o.transformation_opportunity_id is null then raise exception 'OPEN_TRANSFORMATION_OPPORTUNITY_REQUIRED' using errcode='23514'; end if;
  if nullif(btrim(p_candidate_name),'') is null or nullif(btrim(p_candidate_concept),'') is null then raise exception 'INGREDIENT_CANDIDATE_NAME_AND_CONCEPT_REQUIRED' using errcode='23514'; end if;
  code:='ING-CAND-'||replace(gen_random_uuid()::text,'-','');
  insert into cognitive_core.intelligent_node(node_code,node_type,node_label,node_description,domain_code,country_workspace_id,provenance_type,governance_status,created_by)
  select 'NODE-'||code,'INGREDIENT_BUILD_CANDIDATE',btrim(p_candidate_name),btrim(p_candidate_concept),n.domain_code,n.country_workspace_id,'AAB_DETECTION','EXPERIMENTAL_UNVERIFIED',p_actor_id from cognitive_core.intelligent_node n where n.node_id=o.node_id returning node_id into nid;
  insert into cognitive_core.ingredient_build_candidate(candidate_code,candidate_name,source_opportunity_id,country_workspace_id,domain_code,novelty_mode,candidate_concept,composition_plan,process_plan,target_mechanisms,predicted_functions,safety_unknowns,regulatory_unknowns,manufacturing_unknowns,required_characterisation,required_tests,novelty_score,mechanism_plausibility,environmental_value,country_relevance,test_value,scientific_status,node_id,created_by)
  select code,btrim(p_candidate_name),p_opportunity_id,n.country_workspace_id,coalesce(n.domain_code,'AGRICULTURE'),upper(btrim(p_novelty_mode)),btrim(p_candidate_concept),coalesce(p_composition_plan,'[]'::jsonb),coalesce(p_process_plan,'{}'::jsonb),coalesce(p_target_mechanisms,'[]'::jsonb),coalesce(p_predicted_functions,'[]'::jsonb),
  '["Unknown toxicology / phytotoxicity until characterised","Unknown interaction effects until tested"]'::jsonb,
  '["Country-specific regulatory classification not yet established"]'::jsonb,
  '["Scale-up stability and reproducibility not yet established"]'::jsonb,
  '["Identity/composition","Contaminants","pH/EC where relevant","Solubility or dispersion","Stability","Compatibility","Phytotoxicity screen"]'::jsonb,
  '["Bench characterisation","Safety screen","Compatibility test","Small controlled biological trial","Replicated governed trial if justified"]'::jsonb,
  greatest(0.5,o.scientific_value),0.5,o.environmental_value,case when n.country_workspace_id is null then 0.3 else 0.8 end,greatest(0.6,o.expected_information_gain),'EXPERIMENTAL_UNVERIFIED',nid,p_actor_id
  from cognitive_core.intelligent_node n where n.node_id=o.node_id returning ingredient_build_candidate_id into cid;
  update cognitive_core.intelligent_node set subject_entity_type='INGREDIENT_BUILD_CANDIDATE',subject_entity_id=cid where node_id=nid;
  insert into cognitive_core.intelligent_relationship(relationship_code,source_node_id,target_node_id,relationship_type,semantic_strength,confidence,country_workspace_id,created_by)
  select 'REL-'||replace(gen_random_uuid()::text,'-',''),o.node_id,nid,'TRANSFORMS_INTO',0.9,0.35,n.country_workspace_id,p_actor_id from cognitive_core.intelligent_node n where n.node_id=o.node_id;
  return jsonb_build_object('ingredient_build_candidate_id',cid,'node_id',nid,'scientific_status','EXPERIMENTAL_UNVERIFIED','human_confirmation_required',true,'autonomous_promotion_allowed',false,'canonical_ingredient_created',false);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_record_completed_intelligence_activity(p_domain_code text, p_activity_scope text, p_component_code text, p_component_label text, p_activity_type text, p_headline text, p_trigger_entity_type text, p_trigger_entity_id uuid, p_trigger_label text, p_detail jsonb, p_actor_id uuid, p_country_workspace_id uuid DEFAULT NULL::uuid, p_correlation_id uuid DEFAULT NULL::uuid, p_parent_event_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'country_core', 'platform', 'public'
AS $function$
declare v jsonb; v_id uuid;
begin
  v:=cognitive_core.api_begin_intelligence_activity(
    p_domain_code,p_activity_scope,p_component_code,p_component_label,p_activity_type,p_headline,
    p_trigger_entity_type,p_trigger_entity_id,p_trigger_label,p_detail,p_actor_id,
    p_country_workspace_id,p_correlation_id,p_parent_event_id
  );
  v_id:=(v->>'activity_event_id')::uuid;
  return cognitive_core.api_finish_intelligence_activity(v_id,'COMPLETED',p_headline,'{}'::jsonb,p_actor_id);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_run_agriculture_cognitive_loop(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'public'
AS $function$
declare a jsonb; b jsonb;
begin
  a:=cognitive_core.api_sync_agriculture_observation_nodes(p_actor_id);
  b:=cognitive_core.api_sync_agriculture_cognitive_loop(p_actor_id);
  return jsonb_build_object('status','PASS','observation_sync',a,'agriculture_sync',b,'autonomous_execution_allowed',false,'scientist_authority_preserved',true);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_submit_problem_signal(p_problem_type text, p_problem_statement text, p_domain_code text, p_country_workspace_id uuid, p_origin_type text, p_origin_reference jsonb, p_local_context jsonb, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'platform', 'public'
AS $function$
declare pid uuid; nid uuid; tid uuid; code text;
begin
  if nullif(btrim(p_problem_statement),'') is null then raise exception 'PROBLEM_STATEMENT_REQUIRED' using errcode='23514'; end if;
  if p_domain_code is not null and not exists(select 1 from platform.domain_registry where domain_code=p_domain_code) then raise exception 'UNKNOWN_DOMAIN_CODE' using errcode='23514'; end if;
  code:='PROB-'||replace(gen_random_uuid()::text,'-','');
  insert into cognitive_core.intelligent_node(node_code,node_type,node_label,node_description,domain_code,country_workspace_id,provenance_type,provenance_payload,governance_status,created_by)
  values('NODE-'||code,'LOCAL_PROBLEM',left(btrim(p_problem_statement),160),btrim(p_problem_statement),p_domain_code,p_country_workspace_id,upper(btrim(p_origin_type)),coalesce(p_origin_reference,'{}'::jsonb),'EXPERIMENTAL_UNVERIFIED',p_actor_id) returning node_id into nid;
  insert into cognitive_core.problem_signal(problem_code,problem_type,problem_statement,domain_code,country_workspace_id,origin_type,origin_actor_id,origin_reference,local_context,node_id)
  values(code,upper(btrim(p_problem_type)),btrim(p_problem_statement),p_domain_code,p_country_workspace_id,upper(btrim(p_origin_type)),p_actor_id,coalesce(p_origin_reference,'{}'::jsonb),coalesce(p_local_context,'{}'::jsonb),nid) returning problem_signal_id into pid;
  update cognitive_core.intelligent_node set subject_entity_type='COGNITIVE_PROBLEM_SIGNAL',subject_entity_id=pid where node_id=nid;
  insert into cognitive_core.target_registry(target_code,target_scope,target_type,target_label,target_description,domain_code,country_workspace_id,source_object_type,source_object_id,node_id,priority_weight,created_by)
  values('TARGET-'||code,'LOCAL_PROBLEM','PROBLEM_RESOLUTION',left(btrim(p_problem_statement),160),btrim(p_problem_statement),p_domain_code,p_country_workspace_id,'COGNITIVE_PROBLEM_SIGNAL',pid,nid,0.8,p_actor_id) returning target_id into tid;
  return jsonb_build_object('problem_signal_id',pid,'problem_node_id',nid,'local_problem_target_id',tid,'transformation_question','Can this problem become a resource, mechanism, process, material, learning asset or discovery opportunity?');
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_submit_problem_signal_guarded(p_problem_type text, p_problem_statement text, p_domain_code text, p_country_workspace_id uuid, p_origin_type text, p_origin_reference jsonb, p_local_context jsonb, p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'country_core', 'public'
AS $function$
begin
  if p_country_workspace_id is not null and not exists(select 1 from country_core.workspace_membership where actor_id=p_actor_id and country_workspace_id=p_country_workspace_id and membership_status='ACTIVE') then raise exception 'COGNITIVE_COUNTRY_ACCESS_DENIED' using errcode='42501'; end if;
  return cognitive_core.api_submit_problem_signal(p_problem_type,p_problem_statement,p_domain_code,p_country_workspace_id,p_origin_type,p_origin_reference,p_local_context,p_actor_id);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_sync_agriculture_cognitive_loop(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'country_core', 'public'
AS $function$
declare
  r record; v_node uuid; v_source uuid; v_target uuid; v_run uuid; v_run_code text;
  v_nodes integer:=0; v_rels integer:=0; v_signals integer:=0; v_states integer:=0; v_investigations integer:=0; v_problems integer:=0;
  v_quality numeric; v_direction text; v_priority numeric; v_info numeric; v_problem uuid;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  v_run_code:='AGR-COG-'||replace(gen_random_uuid()::text,'-','');
  insert into cognitive_core.cognitive_loop_run(run_code,domain_code,actor_id) values(v_run_code,'AGRICULTURE',p_actor_id) returning cognitive_loop_run_id into v_run;

  for r in select f.* from agriculture.formulation_version f where f.lifecycle_status in ('APPROVED','SUPERSEDED') and (f.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=f.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('FORMULATION',r.formulation_name||' v'||r.version_number,r.change_rationale,'FORMULATION_VERSION',r.formulation_version_id,r.country_workspace_id,case when r.lifecycle_status='APPROVED' then 'APPROVED' else 'REVIEW_REQUIRED' end,p_actor_id,jsonb_build_object('version_code',r.version_code,'trial_readiness',r.trial_readiness,'expected_outcomes',r.expected_outcomes)); v_nodes:=v_nodes+1;
  end loop;

  for r in select t.* from agriculture.trial t where t.lifecycle_status='COMPLETED' and t.outcome_status='REVIEWED' and (t.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=t.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('TRIAL',r.trial_name,r.trial_objective,'TRIAL',r.trial_id,r.country_workspace_id,'APPROVED',p_actor_id,jsonb_build_object('trial_code',r.trial_code,'protocol_summary',r.protocol_summary,'start_date',r.start_date,'actual_end_date',r.actual_end_date)); v_nodes:=v_nodes+1;
    if r.formulation_version_id is not null then
      select node_id into v_source from cognitive_core.intelligent_node where subject_entity_type='FORMULATION_VERSION' and subject_entity_id=r.formulation_version_id and node_type='FORMULATION';
      if v_source is not null and cognitive_core.ensure_relationship(v_source,v_node,'TESTED_IN',1,0.95,null,r.country_workspace_id,'APPROVED',null,p_actor_id) is not null then v_rels:=v_rels+1; end if;
    end if;
  end loop;

  for r in select o.*,t.formulation_version_id from agriculture.outcome o join agriculture.trial t on t.trial_id=o.trial_id where o.outcome_status='APPROVED' and t.lifecycle_status='COMPLETED' and (o.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=o.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('OUTCOME',r.outcome_code,r.outcome_summary,'OUTCOME',r.outcome_id,r.country_workspace_id,'APPROVED',p_actor_id,jsonb_build_object('outcome_type',r.outcome_type,'payload',r.outcome_payload)); v_nodes:=v_nodes+1;
    select node_id into v_source from cognitive_core.intelligent_node where subject_entity_type='TRIAL' and subject_entity_id=r.trial_id and node_type='TRIAL';
    if v_source is not null and cognitive_core.ensure_relationship(v_node,v_source,'DERIVED_FROM',1,0.95,r.evidence_packet_id,r.country_workspace_id,'APPROVED',null,p_actor_id) is not null then v_rels:=v_rels+1; end if;
    select case bee.eligibility_status when 'ELIGIBLE' then 0.95 when 'ELIGIBLE_WITH_WARNINGS' then 0.8 else 0 end into v_quality from agriculture.brain_evidence_eligibility bee where bee.subject_entity_type='OUTCOME' and bee.subject_entity_id=r.outcome_id;
    if coalesce(v_quality,0)>0 then
      insert into cognitive_core.node_evidence_signal(node_id,evidence_packet_id,source_entity_type,source_entity_id,signal_direction,evidence_quality,independence_weight,context_fit,temporal_relevance,mechanism_fit,governance_eligible,source_fingerprint,source_context,recorded_by)
      values(v_node,r.evidence_packet_id,'OUTCOME',r.outcome_id,'SUPPORTS',v_quality,0.9,0.9,1,0.6,true,'OUTCOME:'||r.outcome_id,jsonb_build_object('trial_id',r.trial_id,'formulation_version_id',r.formulation_version_id),p_actor_id)
      on conflict(node_id,source_entity_type,source_entity_id,signal_direction) do update set evidence_quality=excluded.evidence_quality,evidence_packet_id=excluded.evidence_packet_id,source_context=excluded.source_context,recorded_by=excluded.recorded_by,recorded_at=now(); v_signals:=v_signals+1;
    end if;
  end loop;

  for r in select al.*,lc.subject_entity_type,lc.subject_entity_id,lc.uncertainty_summary,lc.contradiction_summary from agriculture.approved_learning al join agriculture.learning_candidate lc on lc.learning_candidate_id=al.learning_candidate_id where al.lifecycle_status='ACTIVE' and (al.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=al.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('APPROVED_LEARNING',r.approved_learning_code,r.learning_statement,'APPROVED_LEARNING',r.approved_learning_id,r.country_workspace_id,'APPROVED',p_actor_id,jsonb_build_object('learning_type',r.learning_type,'applicability_scope',r.applicability_scope,'limitations',r.limitation_summary,'uncertainty',r.uncertainty_summary)); v_nodes:=v_nodes+1;
    select node_id into v_source from cognitive_core.intelligent_node where subject_entity_type=r.subject_entity_type and subject_entity_id=r.subject_entity_id order by created_at desc limit 1;
    if v_source is not null and cognitive_core.ensure_relationship(v_node,v_source,'DERIVED_FROM',0.95,0.9,r.evidence_packet_id,r.country_workspace_id,'APPROVED',r.uncertainty_summary,p_actor_id) is not null then v_rels:=v_rels+1; end if;
    v_direction:=case when r.learning_type='NEGATIVE' then 'NEGATIVE_LEARNING' when r.learning_type='CONTRADICTION' then 'CONTRADICTS' else 'SUPPORTS' end;
    insert into cognitive_core.node_evidence_signal(node_id,evidence_packet_id,source_entity_type,source_entity_id,signal_direction,evidence_quality,independence_weight,context_fit,temporal_relevance,mechanism_fit,governance_eligible,source_fingerprint,source_context,recorded_by)
    values(v_node,r.evidence_packet_id,'APPROVED_LEARNING',r.approved_learning_id,v_direction,0.95,0.95,0.85,1,case when r.learning_type='MECHANISM' then 0.85 else 0.5 end,true,'LEARNING:'||r.approved_learning_id,jsonb_build_object('learning_type',r.learning_type),p_actor_id)
    on conflict(node_id,source_entity_type,source_entity_id,signal_direction) do update set evidence_quality=excluded.evidence_quality,source_context=excluded.source_context,recorded_by=excluded.recorded_by,recorded_at=now(); v_signals:=v_signals+1;
    if jsonb_typeof(r.applicability_scope->'target_codes')='array' then
      insert into cognitive_core.node_target_link(node_id,target_id,alignment_strength,alignment_basis,rationale)
      select v_node,tr.target_id,0.9,'APPROVED_LEARNING_SCOPE','Explicit target code carried by approved learning.' from cognitive_core.target_registry tr where tr.target_code in (select jsonb_array_elements_text(r.applicability_scope->'target_codes'))
      on conflict(node_id,target_id) do update set alignment_strength=excluded.alignment_strength,alignment_basis=excluded.alignment_basis,rationale=excluded.rationale;
    end if;
  end loop;

  for r in select sm.* from agriculture.scientific_memory_entry sm where sm.lifecycle_status='ACTIVE' and (sm.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=sm.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('SCIENTIFIC_MEMORY',r.memory_code,r.memory_statement,'SCIENTIFIC_MEMORY',r.scientific_memory_entry_id,r.country_workspace_id,'APPROVED',p_actor_id,jsonb_build_object('memory_type',r.memory_type,'context_scope',r.context_scope,'version_no',r.version_no)); v_nodes:=v_nodes+1;
    select node_id into v_source from cognitive_core.intelligent_node where subject_entity_type='APPROVED_LEARNING' and subject_entity_id=r.approved_learning_id and node_type='APPROVED_LEARNING';
    if v_source is not null and cognitive_core.ensure_relationship(v_node,v_source,'DERIVED_FROM',1,0.98,r.evidence_packet_id,r.country_workspace_id,'APPROVED',null,p_actor_id) is not null then v_rels:=v_rels+1; end if;
    insert into cognitive_core.node_evidence_signal(node_id,evidence_packet_id,source_entity_type,source_entity_id,signal_direction,evidence_quality,independence_weight,context_fit,temporal_relevance,mechanism_fit,governance_eligible,source_fingerprint,source_context,recorded_by)
    values(v_node,r.evidence_packet_id,'SCIENTIFIC_MEMORY',r.scientific_memory_entry_id,'SUPPORTS',1,1,0.9,1,0.6,true,'MEMORY:'||r.scientific_memory_entry_id,r.context_scope,p_actor_id)
    on conflict(node_id,source_entity_type,source_entity_id,signal_direction) do update set source_context=excluded.source_context,recorded_by=excluded.recorded_by,recorded_at=now(); v_signals:=v_signals+1;
  end loop;

  for r in select m.* from agriculture.mechanism_hypothesis m where m.lifecycle_status not in ('REJECTED','ARCHIVED') and (m.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=m.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('MECHANISM',r.mechanism_code,r.mechanism_statement,'MECHANISM_HYPOTHESIS',r.mechanism_hypothesis_id,r.country_workspace_id,case when r.lifecycle_status='SUPPORTED' then 'APPROVED' else 'REVIEW_REQUIRED' end,p_actor_id,jsonb_build_object('pathway',r.proposed_pathway,'confidence',r.confidence_status,'uncertainty',r.uncertainty_summary)); v_nodes:=v_nodes+1;
    select node_id into v_source from cognitive_core.intelligent_node where subject_entity_type=r.subject_entity_type and subject_entity_id=r.subject_entity_id order by created_at desc limit 1;
    if v_source is not null and cognitive_core.ensure_relationship(v_source,v_node,'HAS_MECHANISM',0.85,case r.confidence_status when 'HIGH' then 0.9 when 'MODERATE' then 0.7 else 0.45 end,r.evidence_packet_id,r.country_workspace_id,case when r.lifecycle_status='SUPPORTED' then 'APPROVED' else 'REVIEW_REQUIRED' end,r.uncertainty_summary,p_actor_id) is not null then v_rels:=v_rels+1; end if;
    v_direction:=case r.lifecycle_status when 'SUPPORTED' then 'SUPPORTS' when 'CONTRADICTED' then 'CONTRADICTS' else 'NEUTRAL' end;
    insert into cognitive_core.node_evidence_signal(node_id,evidence_packet_id,source_entity_type,source_entity_id,signal_direction,evidence_quality,independence_weight,context_fit,temporal_relevance,mechanism_fit,governance_eligible,source_fingerprint,recorded_by)
    values(v_node,r.evidence_packet_id,'MECHANISM_HYPOTHESIS',r.mechanism_hypothesis_id,v_direction,case r.confidence_status when 'HIGH' then 0.9 when 'MODERATE' then 0.7 when 'LOW' then 0.5 else 0.35 end,0.8,0.8,1,case r.lifecycle_status when 'SUPPORTED' then 0.95 else 0.5 end,r.lifecycle_status in ('SUPPORTED','CONTRADICTED'),'MECHANISM:'||r.mechanism_hypothesis_id,p_actor_id)
    on conflict(node_id,source_entity_type,source_entity_id,signal_direction) do update set evidence_quality=excluded.evidence_quality,mechanism_fit=excluded.mechanism_fit,governance_eligible=excluded.governance_eligible,recorded_by=excluded.recorded_by,recorded_at=now(); v_signals:=v_signals+1;
  end loop;

  for r in select g.* from agriculture.knowledge_gap g where g.lifecycle_status in ('OPEN','UNDER_INVESTIGATION') and (g.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=g.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('KNOWLEDGE_GAP',r.gap_code,r.gap_statement,'KNOWLEDGE_GAP',r.knowledge_gap_id,r.country_workspace_id,'REVIEW_REQUIRED',p_actor_id,jsonb_build_object('gap_type',r.gap_type,'priority',r.priority_status,'why_it_matters',r.why_it_matters,'proposed_resolution',r.proposed_resolution)); v_nodes:=v_nodes+1;
    select node_id into v_source from cognitive_core.intelligent_node where subject_entity_type=r.subject_entity_type and subject_entity_id=r.subject_entity_id order by created_at desc limit 1;
    if v_source is not null and cognitive_core.ensure_relationship(v_source,v_node,'HAS_GAP',0.9,0.95,r.evidence_packet_id,r.country_workspace_id,'REVIEW_REQUIRED',r.why_it_matters,p_actor_id) is not null then v_rels:=v_rels+1; end if;
    v_priority:=case r.priority_status when 'CRITICAL' then 1 when 'HIGH' then 0.85 when 'MODERATE' then 0.65 when 'LOW' then 0.4 else 0.55 end;
    v_info:=greatest(0.5,least(1,v_priority));
    insert into cognitive_core.next_investigation_candidate(candidate_code,domain_code,country_workspace_id,source_node_id,knowledge_gap_id,investigation_question,proposed_action,expected_information_gain,evidence_need,target_relevance,priority_score,created_by)
    values('NEXT-KG-'||replace(r.knowledge_gap_id::text,'-',''),'AGRICULTURE',r.country_workspace_id,coalesce(v_source,v_node),r.knowledge_gap_id,'What evidence will resolve: '||r.gap_statement,coalesce(r.proposed_resolution,'Design the smallest governed experiment that discriminates the main uncertainty.'),v_info,v_priority,0.5,v_priority,p_actor_id)
    on conflict(knowledge_gap_id) where knowledge_gap_id is not null and status in ('CANDIDATE','UNDER_REVIEW','ACCEPTED_FOR_INVESTIGATION') do update set investigation_question=excluded.investigation_question,proposed_action=excluded.proposed_action,expected_information_gain=excluded.expected_information_gain,evidence_need=excluded.evidence_need,priority_score=excluded.priority_score,updated_at=now();
    v_investigations:=v_investigations+1;
    if r.priority_status in ('HIGH','CRITICAL') and not exists(select 1 from cognitive_core.problem_signal ps where ps.origin_type='AAB_DETECTION' and ps.origin_reference->>'knowledge_gap_id'=r.knowledge_gap_id::text and ps.lifecycle_status in ('OPEN','UNDER_ANALYSIS','TRANSFORMED')) then
      select (cognitive_core.api_submit_problem_signal('KNOWLEDGE_GAP','Unresolved high-priority scientific gap: '||r.gap_statement,'AGRICULTURE',r.country_workspace_id,'AAB_DETECTION',jsonb_build_object('knowledge_gap_id',r.knowledge_gap_id,'gap_code',r.gap_code),jsonb_build_object('priority',r.priority_status,'why_it_matters',r.why_it_matters),p_actor_id)->>'problem_signal_id')::uuid into v_problem;
      v_problems:=v_problems+1;
    end if;
  end loop;

  for r in select c.* from agriculture.contradiction_record c where c.lifecycle_status in ('OPEN','UNDER_REVIEW','UNRESOLVED_ACCEPTED') and (c.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=c.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('CONTRADICTION',r.contradiction_code,r.contradiction_summary,'CONTRADICTION_RECORD',r.contradiction_record_id,r.country_workspace_id,'REVIEW_REQUIRED',p_actor_id,jsonb_build_object('severity',r.severity,'claim_a',r.claim_a,'claim_b',r.claim_b)); v_nodes:=v_nodes+1;
    select node_id into v_source from cognitive_core.intelligent_node where subject_entity_type=r.subject_entity_type and subject_entity_id=r.subject_entity_id order by created_at desc limit 1;
    if v_source is not null then
      if cognitive_core.ensure_relationship(v_source,v_node,'CONTRADICTS',0.9,case r.severity when 'CRITICAL' then 0.95 when 'HIGH' then 0.85 when 'MODERATE' then 0.7 else 0.55 end,coalesce(r.evidence_packet_a_id,r.evidence_packet_b_id),r.country_workspace_id,'REVIEW_REQUIRED',r.contradiction_summary,p_actor_id) is not null then v_rels:=v_rels+1; end if;
      insert into cognitive_core.node_evidence_signal(node_id,evidence_packet_id,source_entity_type,source_entity_id,signal_direction,evidence_quality,independence_weight,context_fit,temporal_relevance,mechanism_fit,governance_eligible,source_fingerprint,source_context,recorded_by)
      values(v_source,coalesce(r.evidence_packet_a_id,r.evidence_packet_b_id),'CONTRADICTION_RECORD',r.contradiction_record_id,'CONTRADICTS',case r.severity when 'CRITICAL' then 1 when 'HIGH' then 0.9 when 'MODERATE' then 0.7 else 0.5 end,0.9,0.8,1,0.5,true,'CONTRA:'||r.contradiction_record_id,jsonb_build_object('claim_a',r.claim_a,'claim_b',r.claim_b),p_actor_id)
      on conflict(node_id,source_entity_type,source_entity_id,signal_direction) do update set evidence_quality=excluded.evidence_quality,source_context=excluded.source_context,recorded_by=excluded.recorded_by,recorded_at=now(); v_signals:=v_signals+1;
      perform cognitive_core.api_propagate_reassessment(v_source,'Governed contradiction requires downstream reassessment.',case r.severity when 'CRITICAL' then 'CRITICAL' when 'HIGH' then 'HIGH' else 'MODERATE' end);
    end if;
  end loop;

  for r in select nl.*,al.evidence_packet_id,al.country_workspace_id as al_country from agriculture.negative_learning_register nl join agriculture.approved_learning al on al.approved_learning_id=nl.approved_learning_id where nl.lifecycle_status='ACTIVE' and (nl.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=nl.country_workspace_id and wm.membership_status='ACTIVE')) loop
    v_node:=cognitive_core.ensure_agriculture_node('NEGATIVE_LEARNING','Negative learning',r.warning_text,'NEGATIVE_LEARNING',r.negative_learning_id,coalesce(r.country_workspace_id,r.al_country),'APPROVED',p_actor_id,jsonb_build_object('downstream_action',r.downstream_action,'suppression_scope',r.suppression_scope)); v_nodes:=v_nodes+1;
    select node_id into v_source from cognitive_core.intelligent_node where subject_entity_type='APPROVED_LEARNING' and subject_entity_id=r.approved_learning_id and node_type='APPROVED_LEARNING';
    if v_source is not null then
      if cognitive_core.ensure_relationship(v_source,v_node,'HAS_NEGATIVE_LEARNING',1,0.98,r.evidence_packet_id,coalesce(r.country_workspace_id,r.al_country),'APPROVED',r.warning_text,p_actor_id) is not null then v_rels:=v_rels+1; end if;
      insert into cognitive_core.node_evidence_signal(node_id,evidence_packet_id,source_entity_type,source_entity_id,signal_direction,evidence_quality,independence_weight,context_fit,temporal_relevance,mechanism_fit,governance_eligible,source_fingerprint,source_context,recorded_by)
      values(v_source,r.evidence_packet_id,'NEGATIVE_LEARNING',r.negative_learning_id,'NEGATIVE_LEARNING',0.98,1,0.9,1,0.5,true,'NEGATIVE:'||r.negative_learning_id,jsonb_build_object('downstream_action',r.downstream_action),p_actor_id)
      on conflict(node_id,source_entity_type,source_entity_id,signal_direction) do update set source_context=excluded.source_context,recorded_by=excluded.recorded_by,recorded_at=now(); v_signals:=v_signals+1;
      perform cognitive_core.api_propagate_reassessment(v_source,'Negative learning changed downstream scientific risk.',case when r.downstream_action in ('REJECT','SUPPRESS') then 'HIGH' else 'MODERATE' end);
    end if;
  end loop;

  for r in select n.node_id from cognitive_core.intelligent_node n where n.domain_code='AGRICULTURE' and n.lifecycle_status='ACTIVE' and (n.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=n.country_workspace_id and wm.membership_status='ACTIVE')) loop
    perform cognitive_core.api_compute_node_state(r.node_id,p_actor_id); v_states:=v_states+1;
  end loop;

  update cognitive_core.cognitive_loop_run set run_completed_at=now(),nodes_materialised=v_nodes,relationships_materialised=v_rels,evidence_signals_materialised=v_signals,states_recomputed=v_states,investigations_created=v_investigations,aab_problem_signals_created=v_problems,status='PASS',run_summary=jsonb_build_object('autonomous_execution_allowed',false,'scientist_authority_preserved',true,'agriculture_mutation',false) where cognitive_loop_run_id=v_run;

  return jsonb_build_object('run_id',v_run,'run_code',v_run_code,'status','PASS','nodes_materialised',v_nodes,'relationships_materialised',v_rels,'evidence_signals_materialised',v_signals,'states_recomputed',v_states,'investigations_created',v_investigations,'aab_problem_signals_created',v_problems,'autonomous_execution_allowed',false,'scientist_authority_preserved',true);
exception when others then
  update cognitive_core.cognitive_loop_run set run_completed_at=now(),status='FAIL',run_summary=jsonb_build_object('error',sqlerrm) where cognitive_loop_run_id=v_run;
  raise;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_sync_agriculture_observation_nodes(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'country_core', 'public'
AS $function$
declare r record; v_obs uuid; v_trial uuid; v_quality numeric; v_nodes integer:=0; v_rels integer:=0; v_signals integer:=0;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  for r in
    select o.*,t.trial_name,t.trial_objective,t.lifecycle_status as trial_lifecycle,t.outcome_status as trial_outcome
    from agriculture.observation o join agriculture.trial t on t.trial_id=o.trial_id
    where o.observation_status='REVIEWED'
      and (o.country_workspace_id is null or exists(select 1 from country_core.workspace_membership wm where wm.actor_id=p_actor_id and wm.country_workspace_id=o.country_workspace_id and wm.membership_status='ACTIVE'))
  loop
    v_trial:=cognitive_core.ensure_agriculture_node('TRIAL',r.trial_name,r.trial_objective,'TRIAL',r.trial_id,r.country_workspace_id,case when r.trial_lifecycle='COMPLETED' and r.trial_outcome='REVIEWED' then 'APPROVED' else 'REVIEW_REQUIRED' end,p_actor_id,jsonb_build_object('lifecycle_status',r.trial_lifecycle,'outcome_status',r.trial_outcome));
    v_obs:=cognitive_core.ensure_agriculture_node('OBSERVATION',r.observation_code,coalesce(r.notes,'Governed reviewed observation.'),'OBSERVATION',r.observation_id,r.country_workspace_id,'APPROVED',p_actor_id,jsonb_build_object('trial_id',r.trial_id,'plot_id',r.plot_id,'observed_at',r.observed_at,'template_version_id',r.observation_template_version_id));
    v_nodes:=v_nodes+2;
    if cognitive_core.ensure_relationship(v_trial,v_obs,'EVIDENCED_BY',0.95,0.95,r.evidence_packet_id,r.country_workspace_id,'APPROVED','Reviewed field evidence linked to its exact Trial.',p_actor_id) is not null then v_rels:=v_rels+1; end if;
    select case bee.eligibility_status when 'ELIGIBLE' then 0.95 when 'ELIGIBLE_WITH_WARNINGS' then 0.8 else 0 end into v_quality
    from agriculture.brain_evidence_eligibility bee where bee.subject_entity_type='OBSERVATION' and bee.subject_entity_id=r.observation_id;
    if coalesce(v_quality,0)>0 then
      insert into cognitive_core.node_evidence_signal(node_id,evidence_packet_id,source_entity_type,source_entity_id,signal_direction,evidence_quality,independence_weight,context_fit,temporal_relevance,mechanism_fit,governance_eligible,source_fingerprint,source_context,recorded_by)
      values(v_obs,r.evidence_packet_id,'OBSERVATION',r.observation_id,'SUPPORTS',v_quality,0.9,0.9,1,0.55,true,'OBS:'||r.observation_id,jsonb_build_object('trial_id',r.trial_id,'plot_id',r.plot_id,'template_version_id',r.observation_template_version_id),p_actor_id)
      on conflict(node_id,source_entity_type,source_entity_id,signal_direction) do update set evidence_quality=excluded.evidence_quality,evidence_packet_id=excluded.evidence_packet_id,source_context=excluded.source_context,recorded_by=excluded.recorded_by,recorded_at=now();
      v_signals:=v_signals+1;
    end if;
  end loop;
  return jsonb_build_object('status','PASS','observation_nodes_materialised',v_nodes,'observation_relationships_materialised',v_rels,'observation_evidence_signals_materialised',v_signals);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_sync_country_objectives(p_country_workspace_id uuid, p_actor_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'country_core', 'public'
AS $function$
declare o record; nid uuid; tid uuid; c integer:=0; p numeric;
begin
  for o in select * from country_core.national_objective where country_workspace_id=p_country_workspace_id and lifecycle_status='ACTIVE' loop
    p:=case upper(o.priority) when 'CRITICAL' then 1 when 'HIGH' then 0.85 when 'MEDIUM' then 0.6 else 0.4 end;
    select node_id into nid from cognitive_core.intelligent_node where subject_entity_type='COUNTRY_NATIONAL_OBJECTIVE' and subject_entity_id=o.national_objective_id and node_type='TARGET';
    if nid is null then
      insert into cognitive_core.intelligent_node(node_code,node_type,node_label,node_description,country_workspace_id,subject_entity_type,subject_entity_id,provenance_type,governance_status,created_by)
      values('NODE-COUNTRY-OBJ-'||o.national_objective_id,'TARGET',o.objective_title,o.objective_description,p_country_workspace_id,'COUNTRY_NATIONAL_OBJECTIVE',o.national_objective_id,'GOVERNED_SYSTEM','APPROVED',p_actor_id) returning node_id into nid;
    end if;
    insert into cognitive_core.target_registry(target_code,target_scope,target_type,target_label,target_description,country_workspace_id,source_object_type,source_object_id,node_id,priority_weight,created_by)
    values('COUNTRY-'||p_country_workspace_id||'-'||o.objective_code,'COUNTRY','NATIONAL_OBJECTIVE',o.objective_title,o.objective_description,p_country_workspace_id,'COUNTRY_NATIONAL_OBJECTIVE',o.national_objective_id,nid,p,p_actor_id)
    on conflict(target_code) do update set target_label=excluded.target_label,target_description=excluded.target_description,priority_weight=excluded.priority_weight,lifecycle_status='ACTIVE';
    c:=c+1;
  end loop;
  return jsonb_build_object('country_workspace_id',p_country_workspace_id,'objectives_synced',c);
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_validate_agriculture_cognitive_loop_e2e(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'public'
AS $function$
declare
  v_trial uuid:=gen_random_uuid(); v_gap uuid:=gen_random_uuid(); v_code text:='VAL-COG-'||substr(replace(gen_random_uuid()::text,'-',''),1,12);
  v_sync jsonb; v_trial_node uuid; v_gap_node uuid; v_state jsonb; v_result jsonb; v_residue integer;
  v_rel boolean:=false; v_next boolean:=false; v_problem boolean:=false;
begin
  perform agriculture.api_require_capability(p_actor_id,'create_draft',null);
  begin
    insert into agriculture.trial(trial_id,trial_code,trial_name,trial_objective,lifecycle_status,outcome_status,created_by,updated_by)
    values(v_trial,v_code||'-TRIAL','Cognitive Loop Validation Trial','Validate cognitive propagation from governed Agriculture learning.','COMPLETED','REVIEWED',p_actor_id,p_actor_id);
    insert into agriculture.knowledge_gap(knowledge_gap_id,gap_code,subject_entity_type,subject_entity_id,gap_type,gap_statement,why_it_matters,proposed_resolution,priority_status,lifecycle_status,created_by)
    values(v_gap,v_code||'-GAP','TRIAL',v_trial,'MISSING_EVIDENCE','Validation gap requires independent replication.','Tests whether AAB turns a governed scientific gap into a next-investigation candidate.','Run independent replication under a second governed context.','HIGH','OPEN',p_actor_id);

    v_sync:=cognitive_core.api_sync_agriculture_cognitive_loop(p_actor_id);
    select node_id into v_trial_node from cognitive_core.intelligent_node where subject_entity_type='TRIAL' and subject_entity_id=v_trial and node_type='TRIAL';
    select node_id into v_gap_node from cognitive_core.intelligent_node where subject_entity_type='KNOWLEDGE_GAP' and subject_entity_id=v_gap and node_type='KNOWLEDGE_GAP';
    select exists(select 1 from cognitive_core.intelligent_relationship where source_node_id=v_trial_node and target_node_id=v_gap_node and relationship_type='HAS_GAP') into v_rel;
    select exists(select 1 from cognitive_core.next_investigation_candidate where knowledge_gap_id=v_gap and status='CANDIDATE') into v_next;
    select exists(select 1 from cognitive_core.problem_signal where origin_type='AAB_DETECTION' and origin_reference->>'knowledge_gap_id'=v_gap::text) into v_problem;
    select to_jsonb(s) into v_state from cognitive_core.node_cognitive_state s where s.node_id=v_trial_node;
    v_result:=jsonb_build_object(
      'contract','AAB_AGRICULTURE_COGNITIVE_LOOP_143',
      'sync_status',v_sync->>'status',
      'trial_node_created',v_trial_node is not null,
      'knowledge_gap_node_created',v_gap_node is not null,
      'has_gap_relationship_created',v_rel,
      'next_investigation_created',v_next,
      'aab_problem_signal_created',v_problem,
      'knowledge_gap_density',coalesce((v_state->>'knowledge_gap_density')::numeric,0),
      'information_gain_opportunity',coalesce((v_state->>'information_gain_opportunity')::numeric,0),
      'autonomous_execution_allowed',false,
      'scientist_authority_preserved',true
    );
    raise exception 'AAB_VALIDATION_ROLLBACK';
  exception when raise_exception then
    if sqlerrm <> 'AAB_VALIDATION_ROLLBACK' then raise; end if;
  end;
  select count(*) into v_residue from agriculture.trial where trial_id=v_trial;
  v_residue:=v_residue + (select count(*) from agriculture.knowledge_gap where knowledge_gap_id=v_gap);
  v_residue:=v_residue + (select count(*) from cognitive_core.intelligent_node where subject_entity_id in (v_trial,v_gap));
  v_result:=v_result||jsonb_build_object('validation_residue',v_residue,'all_validation_mutations_rolled_back',v_residue=0,'status',case when (v_result->>'trial_node_created')::boolean and (v_result->>'knowledge_gap_node_created')::boolean and (v_result->>'has_gap_relationship_created')::boolean and (v_result->>'next_investigation_created')::boolean and (v_result->>'aab_problem_signal_created')::boolean and coalesce((v_result->>'knowledge_gap_density')::numeric,0)>0 and v_residue=0 then 'PASS_ROLLBACK_ONLY' else 'FAIL' end);
  return v_result;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_validate_agriculture_full_scientific_learning_loop_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'country_core', 'public'
AS $function$
declare
  a uuid:=gen_random_uuid();
  ing agriculture.ingredient;
  ing_review jsonb;
  formj jsonb;
  fv uuid;
  form_decision jsonb;
  tr agriculture.trial;
  pl agriculture.plot;
  tpl uuid;
  act_submit jsonb;
  act_decide jsonb;
  cap jsonb;
  obs uuid;
  obs_review jsonb;
  outc agriculture.outcome;
  outfinal agriculture.outcome;
  trfinal agriculture.trial;
  lc agriculture.learning_candidate;
  learn_decide jsonb;
  alid uuid;
  memid uuid;
  gapid uuid;
  cog jsonb;
  fv_node uuid;
  tr_node uuid;
  obs_node uuid;
  out_node uuid;
  learn_node uuid;
  mem_node uuid;
  gap_node uuid;
  rel_count integer:=0;
  sig_count integer:=0;
  investigation_count integer:=0;
  problem_count integer:=0;
  residue integer:=0;
  result jsonb;
  prefix text:='VAL-FULL-148-';
begin
  begin
    insert into agriculture.actor(actor_id,external_subject,display_name,actor_type,active)
    values(a,prefix||replace(a::text,'-',''),'Full E2E Validation Scientist','SCIENTIST',true);

    insert into agriculture.actor_access_assignment(actor_id,access_profile_code,authority_scope,grant_reason,active)
    values(a,'AGRICULTURE_RUNTIME_SCIENTIST','AGRICULTURE','Rollback-only full scientific learning loop validation',true);

    insert into agriculture.actor_authority(actor_id,role_code,authority_scope,grant_rationale,active)
    values(a,'AGRICULTURE_SCIENTIST','AGRICULTURE','Rollback-only full scientific learning loop validation',true);

    select * into ing from agriculture.api_create_ingredient(
      prefix||'ING',
      'Rollback Validation Organic Ingredient',
      'PLANT_DERIVED',
      'Create one temporary governed ingredient to prove the complete Agriculture lineage.',
      a,
      'GROUND',
      'EXPERIMENTAL_UNVERIFIED',
      null::char(2)
    );

    perform agriculture.api_submit_ingredient_for_review(ing.ingredient_id,a);
    ing_review:=agriculture.api_decide_ingredient_review(
      ing.ingredient_id,'APPROVE',
      'Temporary ingredient is approved solely inside the rollback validation transaction.',
      'Identity and validation-only provenance reviewed.',a
    );

    formj:=agriculture.api_workbench_create_formulation(
      prefix||'FV',
      'Rollback Validation Organic Formulation',
      'OTHER',
      'Prove Ingredient to Formulation to scientific learning lineage.',
      'Produce a measurable governed crop-response observation.',
      jsonb_build_array(jsonb_build_object(
        'ingredient_id',ing.ingredient_id,
        'inclusion_rate_percent',100,
        'sequence_order',1,
        'ingredient_role','PRIMARY_VALIDATION_COMPONENT',
        'line_notes','Rollback-only validation line.'
      )),
      a,
      'TEST'
    );
    fv:=(formj->'version'->>'formulation_version_id')::uuid;

    form_decision:=agriculture.api_workbench_decide_formulation(
      fv,'ACCEPT',
      'Scientist accepts the temporary formulation for rollback-only validation.',
      'Ingredient identity, inclusion total and validation purpose reviewed.',a
    );

    tr:=agriculture.api_workbench_send_to_trial(
      fv,prefix||'TRIAL','Rollback Validation Trial',
      'Prove the complete Agriculture scientific learning and cognitive lineage.',
      'Governed rollback-only protocol.',a
    );

    select otv.observation_template_version_id into tpl
    from agriculture.observation_template ot
    join agriculture.observation_template_version otv on otv.observation_template_id=ot.observation_template_id
    where ot.template_code='TPL_AGRONOMY_DAILY_SCREEN'
      and ot.lifecycle_status='ACTIVE'
      and otv.version_status='ACTIVE'
    order by otv.version_no desc limit 1;
    if tpl is null then raise exception 'FULL_VALIDATION_TEMPLATE_MISSING'; end if;

    pl:=agriculture.api_trial_add_plot(
      tr.trial_id,prefix||'PLOT','Rollback Validation Treatment Plot','TREATMENT',null,1,
      null,null,10,'m2',a
    );

    perform agriculture.api_bind_trial_protocol(tr.trial_id,tpl,'PRIMARY',true,a);

    act_submit:=agriculture.api_trial_submit_for_activation(
      tr.trial_id,
      'Exact approved formulation, treatment Plot and primary observation protocol are configured.',
      'Rollback-only activation evidence.',a
    );
    act_decide:=agriculture.api_trial_decide_activation(
      tr.trial_id,'APPROVE',
      'Approved formulation, Plot and observation protocol reviewed.',
      'Trial is suitable for controlled rollback-only activation.',
      'Approved for validation activation.',null,a
    );

    cap:=agriculture.api_capture_observation(
      prefix||'OBS',tr.trial_id,pl.plot_id,tpl,now(),
      'Rollback-only full-loop observation.',
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
      ),a
    );
    obs:=(cap->'observation'->>'observation_id')::uuid;

    perform agriculture.api_prepare_observation_review(obs,a);
    obs_review:=agriculture.api_decide_observation_review(
      obs,'APPROVE',
      'Reviewed all canonical measurements, context and protocol lineage.',
      'Evidence is complete and suitable for governed scientific use.',
      'ACCEPTABLE','COMPLETE','STRONG','HIGH','STRONG','NOT_APPLICABLE',a
    );

    outc:=agriculture.api_record_outcome(
      prefix||'OUT',tr.trial_id,'TRIAL',
      'Rollback validation produced the expected governed scientific chain.',
      pl.plot_id,
      jsonb_build_object('validation',true,'plant_height_cm',48.5),
      null,a
    );
    perform agriculture.api_prepare_outcome_review(outc.outcome_id,a);
    outfinal:=agriculture.api_decide_outcome_review(
      outc.outcome_id,'APPROVE',
      'Reviewed governed observation evidence supporting this outcome.',
      'Outcome is supported within the controlled validation context.',a
    );

    trfinal:=agriculture.api_complete_trial(tr.trial_id,a);

    lc:=agriculture.api_prepare_trial_learning(
      tr.trial_id,'POSITIVE',
      'The temporary governed formulation produced a measurable observation and approved outcome in the controlled validation context.',
      'Independent replication and mechanism-discriminating measurements are still required before broader scientific generalisation.',
      null,a
    );
    perform agriculture.api_prepare_learning_review(lc.learning_candidate_id,a);
    learn_decide:=agriculture.api_decide_learning_review(
      lc.learning_candidate_id,'APPROVE',
      'Reviewed the approved Trial outcome and its governed evidence packet.',
      'Learning is supported only within this rollback validation context.',
      jsonb_build_object('trial_id',tr.trial_id,'formulation_version_id',fv),
      'Do not generalise beyond controlled validation conditions.',
      null,null,null,null,null,null,a
    );

    select approved_learning_id into alid
    from agriculture.approved_learning
    where learning_candidate_id=lc.learning_candidate_id and lifecycle_status='ACTIVE'
    order by approved_at desc limit 1;

    select scientific_memory_entry_id into memid
    from agriculture.scientific_memory_entry
    where approved_learning_id=alid and lifecycle_status='ACTIVE'
    order by created_at desc limit 1;

    select knowledge_gap_id into gapid
    from agriculture.knowledge_gap
    where lifecycle_status='OPEN'
      and country_workspace_id is not distinct from tr.country_workspace_id
      and created_at >= lc.created_at
    order by created_at desc limit 1;

    if gapid is not null then
      update agriculture.knowledge_gap
      set priority_status='HIGH',
          proposed_resolution='Run an independent governed replication with mechanism-discriminating measurements.'
      where knowledge_gap_id=gapid;
    end if;

    cog:=cognitive_core.api_run_agriculture_cognitive_loop(a);

    select node_id into fv_node from cognitive_core.intelligent_node where subject_entity_type='FORMULATION_VERSION' and subject_entity_id=fv and lifecycle_status='ACTIVE' limit 1;
    select node_id into tr_node from cognitive_core.intelligent_node where subject_entity_type='TRIAL' and subject_entity_id=tr.trial_id and lifecycle_status='ACTIVE' limit 1;
    select node_id into obs_node from cognitive_core.intelligent_node where subject_entity_type='OBSERVATION' and subject_entity_id=obs and lifecycle_status='ACTIVE' limit 1;
    select node_id into out_node from cognitive_core.intelligent_node where subject_entity_type='OUTCOME' and subject_entity_id=outc.outcome_id and lifecycle_status='ACTIVE' limit 1;
    select node_id into learn_node from cognitive_core.intelligent_node where subject_entity_type='APPROVED_LEARNING' and subject_entity_id=alid and lifecycle_status='ACTIVE' limit 1;
    select node_id into mem_node from cognitive_core.intelligent_node where subject_entity_type='SCIENTIFIC_MEMORY' and subject_entity_id=memid and lifecycle_status='ACTIVE' limit 1;
    if gapid is not null then
      select node_id into gap_node from cognitive_core.intelligent_node where subject_entity_type='KNOWLEDGE_GAP' and subject_entity_id=gapid and lifecycle_status='ACTIVE' limit 1;
    end if;

    select count(*) into rel_count
    from cognitive_core.intelligent_relationship r
    where r.lifecycle_status='ACTIVE'
      and (r.source_node_id in (fv_node,tr_node,obs_node,out_node,learn_node,mem_node,gap_node)
        or r.target_node_id in (fv_node,tr_node,obs_node,out_node,learn_node,mem_node,gap_node));

    select count(*) into sig_count
    from cognitive_core.node_evidence_signal
    where node_id in (fv_node,tr_node,obs_node,out_node,learn_node,mem_node,gap_node)
      and governance_eligible=true;

    select count(*) into investigation_count
    from cognitive_core.next_investigation_candidate
    where knowledge_gap_id=gapid and status in ('CANDIDATE','UNDER_REVIEW','ACCEPTED_FOR_INVESTIGATION');

    select count(*) into problem_count
    from cognitive_core.problem_signal
    where domain_code='AGRICULTURE' and origin_type='AAB_DETECTION'
      and origin_reference->>'knowledge_gap_id'=gapid::text;

    result:=jsonb_build_object(
      'contract','AAB_AGRICULTURE_FULL_SCIENTIFIC_LEARNING_LOOP_148',
      'status',case when
        ing.ingredient_id is not null and fv_node is not null and tr_node is not null and obs_node is not null
        and out_node is not null and learn_node is not null and mem_node is not null
        and rel_count>=4 and sig_count>=1 and investigation_count>=1 and problem_count>=1
        then 'PASS_ROLLBACK_ONLY' else 'FAIL' end,
      'ingredient_created_and_scientist_approved',exists(select 1 from agriculture.ingredient where ingredient_id=ing.ingredient_id and lifecycle_status='ACTIVE'),
      'formulation_created_and_scientist_approved',exists(select 1 from agriculture.formulation_version where formulation_version_id=fv and lifecycle_status='APPROVED' and trial_readiness='READY_FOR_TRIAL'),
      'trial_created_from_exact_formulation',tr.formulation_version_id=fv,
      'plot_inherits_exact_formulation',pl.formulation_version_id=fv,
      'trial_activated',exists(select 1 from agriculture.trial where trial_id=tr.trial_id and lifecycle_status='COMPLETED'),
      'observation_reviewed',(obs_review->'observation'->>'observation_status')='REVIEWED',
      'canonical_cm_preserved',exists(select 1 from agriculture.measurement m join agriculture.metric_definition md on md.metric_definition_id=m.metric_definition_id where m.observation_id=obs and md.metric_code='PLANT_HEIGHT_CM' and m.unit='cm' and m.numeric_value=48.5),
      'outcome_approved',outfinal.outcome_status='APPROVED',
      'trial_completed',trfinal.lifecycle_status='COMPLETED',
      'approved_learning_created',alid is not null,
      'scientific_memory_created',memid is not null,
      'knowledge_gap_created',gapid is not null,
      'cognitive_sync_status',cog->>'status',
      'formulation_node_created',fv_node is not null,
      'trial_node_created',tr_node is not null,
      'observation_node_created',obs_node is not null,
      'outcome_node_created',out_node is not null,
      'approved_learning_node_created',learn_node is not null,
      'scientific_memory_node_created',mem_node is not null,
      'knowledge_gap_node_created',gap_node is not null,
      'cognitive_relationship_count',rel_count,
      'governed_evidence_signal_count',sig_count,
      'next_investigation_created',investigation_count>=1,
      'aab_detected_problem_created',problem_count>=1,
      'neutral_prior_not_scientific_claim',(cognitive_core.interpret_node_state(jsonb_build_object('belief_confidence',0.5,'evidence_strength',0,'uncertainty',0.8,'information_gain_opportunity',0.69))->>'scientific_claim_state')='NOT_YET_ESTABLISHED',
      'autonomous_execution_allowed',false,
      'scientist_authority_preserved',true
    );

    raise exception '__AAB_FULL_E2E_ROLLBACK_148__';
  exception when others then
    if sqlerrm<>'__AAB_FULL_E2E_ROLLBACK_148__' then raise; end if;
  end;

  select
    (select count(*) from agriculture.actor where external_subject like prefix||'%') +
    (select count(*) from agriculture.ingredient where ingredient_code like prefix||'%') +
    (select count(*) from agriculture.formulation_version where version_code like prefix||'%') +
    (select count(*) from agriculture.trial where trial_code like prefix||'%') +
    (select count(*) from agriculture.plot where plot_code like prefix||'%') +
    (select count(*) from agriculture.observation where observation_code like prefix||'%') +
    (select count(*) from agriculture.outcome where outcome_code like prefix||'%')
  into residue;

  return result || jsonb_build_object(
    'validation_residue',residue,
    'all_validation_mutations_rolled_back',residue=0
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_validate_live_intelligence_surface(p_actor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'public'
AS $function$
declare
  e jsonb; before_state jsonb; during_state jsonb; after_state jsonb; water_state jsonb; result jsonb;
  eid uuid;
begin
  begin
    before_state:=cognitive_core.api_get_live_intelligence_surface('AGRICULTURE',p_actor_id);
    e:=cognitive_core.api_begin_intelligence_activity('AGRICULTURE','BRAIN','UNIVERSAL_COGNITIVE_KERNEL','Universal Cognitive Kernel','PROCESSING','Rollback-only live intelligence validation.',null,null,null,jsonb_build_object('validation',true),p_actor_id,null,null,null);
    eid:=(e->>'activity_event_id')::uuid;
    during_state:=cognitive_core.api_get_live_intelligence_surface('AGRICULTURE',p_actor_id);
    perform cognitive_core.api_finish_intelligence_activity(eid,'COMPLETED','Rollback-only live intelligence validation completed.',jsonb_build_object('validation',true),p_actor_id);
    after_state:=cognitive_core.api_get_live_intelligence_surface('AGRICULTURE',p_actor_id);
    water_state:=cognitive_core.api_get_live_intelligence_surface('WATER',p_actor_id);
    result:=jsonb_build_object(
      'contract','AAB_LIVE_INTELLIGENCE_SURFACE_154',
      'status','PASS_ROLLBACK_ONLY',
      'agriculture_running_before',coalesce((before_state->'current'->>'running_events')::int,0),
      'agriculture_processing_during',(during_state->'current'->>'is_processing')::boolean,
      'universal_kernel_working_during',exists(select 1 from jsonb_array_elements(during_state->'brain_status') x where x->>'brain_code'='UNIVERSAL_COGNITIVE_KERNEL' and x->>'runtime_status'='WORKING'),
      'agriculture_processing_after',(after_state->'current'->>'is_processing')::boolean,
      'water_inherits_brains',(water_state->'counts'->>'brains')::int,
      'water_inherits_algorithms',(water_state->'counts'->>'algorithms')::int,
      'autonomous_execution_allowed',(during_state->>'autonomous_execution_allowed')::boolean,
      'scientist_authority_preserved',(during_state->>'scientist_authority_preserved')::boolean
    );
    raise exception 'AAB_LIVE_INTEL_ROLLBACK_154';
  exception when raise_exception then
    if sqlerrm<>'AAB_LIVE_INTEL_ROLLBACK_154' then raise; end if;
  end;
  return result || jsonb_build_object(
    'validation_residue',(select count(*) from cognitive_core.intelligence_activity_event where headline like 'Rollback-only live intelligence validation%'),
    'all_validation_mutations_rolled_back',not exists(select 1 from cognitive_core.intelligence_activity_event where headline like 'Rollback-only live intelligence validation%')
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.api_validate_universal_cognitive_kernel_e2e()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'public'
AS $function$
declare
  nid uuid; pid uuid; oid uuid; cid uuid; state jsonb; p jsonb; o jsonb; c jsonb; ingredient_before integer; ingredient_after integer; residue integer;
begin
  select count(*) into ingredient_before from agriculture.ingredient;
  insert into cognitive_core.intelligent_node(node_code,node_type,node_label,node_description,domain_code,provenance_type,governance_status)
  values('VAL-COG-NODE-139','MECHANISM','Validation node','Rollback-only cognitive validation','AGRICULTURE','GOVERNED_SYSTEM','REVIEW_REQUIRED') returning node_id into nid;
  insert into cognitive_core.node_evidence_signal(node_id,source_entity_type,source_entity_id,signal_direction,evidence_quality,independence_weight,context_fit,temporal_relevance,mechanism_fit,governance_eligible,source_fingerprint)
  values
    (nid,'VALIDATION',gen_random_uuid(),'SUPPORTS',0.9,1,0.9,1,0.8,true,'VAL-INDEPENDENT-A'),
    (nid,'VALIDATION',gen_random_uuid(),'SUPPORTS',0.85,0.95,0.85,1,0.75,true,'VAL-INDEPENDENT-B'),
    (nid,'VALIDATION',gen_random_uuid(),'CONTRADICTS',0.5,0.8,0.7,1,0.4,true,'VAL-CONTRA-C');
  state:=cognitive_core.api_compute_node_state(nid,null);
  p:=cognitive_core.api_submit_problem_signal('WASTE_STREAM','Validation waste stream with possible scientific value','AGRICULTURE',null,'AAB_DETECTION','{}'::jsonb,'{"crop":"rice","issue":"burning"}'::jsonb,null);
  pid:=(p->>'problem_signal_id')::uuid;
  o:=cognitive_core.api_create_transformation_opportunity(pid,'INGREDIENT','Validation resource-recovery opportunity','Characterise the material as a potential agricultural input','NOVEL_INGREDIENT',0.9,0.7,0.8,0.6,null);
  oid:=(o->>'transformation_opportunity_id')::uuid;
  c:=cognitive_core.api_propose_ingredient_candidate(oid,'Validation Never-Seen-Before Candidate','NOVEL_RESOURCE_RECOVERY','A governed experimental ingredient candidate built from a waste problem.','[{"component":"validation recovered resource","role":"functional fraction"}]'::jsonb,'{"process":"characterise before use"}'::jsonb,'["unknown mechanism - test required"]'::jsonb,'["potential soil/input benefit"]'::jsonb,null);
  cid:=(c->>'ingredient_build_candidate_id')::uuid;
  select count(*) into ingredient_after from agriculture.ingredient;

  delete from cognitive_core.ingredient_candidate_component where ingredient_build_candidate_id=cid;
  delete from cognitive_core.intelligent_relationship where source_node_id in (select node_id from cognitive_core.transformation_opportunity where transformation_opportunity_id=oid) or target_node_id in (select node_id from cognitive_core.ingredient_build_candidate where ingredient_build_candidate_id=cid);
  delete from cognitive_core.ingredient_build_candidate where ingredient_build_candidate_id=cid;
  delete from cognitive_core.intelligent_node where subject_entity_type='INGREDIENT_BUILD_CANDIDATE' and subject_entity_id=cid;
  delete from cognitive_core.intelligent_relationship where target_node_id in (select node_id from cognitive_core.transformation_opportunity where transformation_opportunity_id=oid);
  delete from cognitive_core.transformation_opportunity where transformation_opportunity_id=oid;
  delete from cognitive_core.intelligent_node where subject_entity_type='TRANSFORMATION_OPPORTUNITY' and subject_entity_id=oid;
  delete from cognitive_core.target_registry where source_object_type='COGNITIVE_PROBLEM_SIGNAL' and source_object_id=pid;
  delete from cognitive_core.problem_signal where problem_signal_id=pid;
  delete from cognitive_core.intelligent_node where subject_entity_type='COGNITIVE_PROBLEM_SIGNAL' and subject_entity_id=pid;
  delete from cognitive_core.node_evidence_signal where node_id=nid;
  delete from cognitive_core.node_cognitive_state where node_id=nid;
  delete from cognitive_core.intelligent_node where node_id=nid;

  select count(*) into residue from cognitive_core.intelligent_node where node_code like 'VAL-COG-%' or node_label like 'Validation%';
  return jsonb_build_object(
    'contract','AAB_UNIVERSAL_COGNITIVE_KERNEL_139',
    'status',case when ingredient_before=ingredient_after and residue=0 and (state->>'belief_confidence')::numeric>0.5 and (c->>'autonomous_promotion_allowed')::boolean=false then 'PASS_CLEAN' else 'FAIL' end,
    'computed_belief',(state->>'belief_confidence')::numeric,
    'computed_uncertainty',(state->>'uncertainty')::numeric,
    'transformation_question',p->>'transformation_question',
    'ingredient_candidate_created',cid is not null,
    'candidate_status',c->>'scientific_status',
    'autonomous_promotion_allowed',(c->>'autonomous_promotion_allowed')::boolean,
    'canonical_ingredient_created',ingredient_after>ingredient_before,
    'scientist_authority_preserved',true,
    'validation_residue',residue
  );
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.ensure_agriculture_node(p_node_type text, p_label text, p_description text, p_subject_entity_type text, p_subject_entity_id uuid, p_country_workspace_id uuid, p_governance_status text, p_actor_id uuid, p_provenance_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'agriculture', 'public'
AS $function$
declare v_node_id uuid; v_code text;
begin
  if p_subject_entity_id is null then raise exception 'SUBJECT_ENTITY_ID_REQUIRED' using errcode='23514'; end if;
  select node_id into v_node_id from cognitive_core.intelligent_node
  where subject_entity_type=upper(btrim(p_subject_entity_type)) and subject_entity_id=p_subject_entity_id and node_type=upper(btrim(p_node_type));
  if v_node_id is not null then
    update cognitive_core.intelligent_node set
      node_label=left(btrim(p_label),240),
      node_description=nullif(btrim(p_description),''),
      country_workspace_id=p_country_workspace_id,
      governance_status=p_governance_status,
      provenance_payload=coalesce(p_provenance_payload,'{}'::jsonb),
      lifecycle_status='ACTIVE',
      updated_at=now()
    where node_id=v_node_id;
    return v_node_id;
  end if;
  v_code:='AGR-'||upper(regexp_replace(p_node_type,'[^A-Z0-9]+','','g'))||'-'||replace(p_subject_entity_id::text,'-','');
  insert into cognitive_core.intelligent_node(node_code,node_type,node_label,node_description,domain_code,country_workspace_id,subject_entity_type,subject_entity_id,provenance_type,provenance_payload,governance_status,lifecycle_status,created_by)
  values(v_code,upper(btrim(p_node_type)),left(btrim(p_label),240),nullif(btrim(p_description),''),'AGRICULTURE',p_country_workspace_id,upper(btrim(p_subject_entity_type)),p_subject_entity_id,'GOVERNED_SYSTEM',coalesce(p_provenance_payload,'{}'::jsonb),p_governance_status,'ACTIVE',p_actor_id)
  returning node_id into v_node_id;
  return v_node_id;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.ensure_relationship(p_source_node_id uuid, p_target_node_id uuid, p_relationship_type text, p_semantic_strength numeric, p_confidence numeric, p_evidence_packet_id uuid, p_country_workspace_id uuid, p_governance_status text, p_uncertainty_summary text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'cognitive_core', 'public'
AS $function$
declare v_id uuid; v_code text;
begin
  if p_source_node_id is null or p_target_node_id is null or p_source_node_id=p_target_node_id then return null; end if;
  v_code:='REL-'||upper(btrim(p_relationship_type))||'-'||substr(md5(p_source_node_id::text||':'||p_target_node_id::text||':'||upper(btrim(p_relationship_type))),1,24);
  insert into cognitive_core.intelligent_relationship(relationship_code,source_node_id,target_node_id,relationship_type,semantic_strength,confidence,evidence_packet_id,uncertainty_summary,country_workspace_id,governance_status,lifecycle_status,created_by)
  values(v_code,p_source_node_id,p_target_node_id,upper(btrim(p_relationship_type)),greatest(0,least(1,coalesce(p_semantic_strength,0.5))),greatest(0,least(1,coalesce(p_confidence,0.5))),p_evidence_packet_id,nullif(btrim(p_uncertainty_summary),''),p_country_workspace_id,p_governance_status,'ACTIVE',p_actor_id)
  on conflict(relationship_code) do update set semantic_strength=excluded.semantic_strength,confidence=excluded.confidence,evidence_packet_id=excluded.evidence_packet_id,uncertainty_summary=excluded.uncertainty_summary,country_workspace_id=excluded.country_workspace_id,governance_status=excluded.governance_status,lifecycle_status='ACTIVE'
  returning relationship_id into v_id;
  return v_id;
end $function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.interpret_node_state(p_state jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'cognitive_core', 'pg_temp'
AS $function$
select jsonb_build_object(
  'algorithm_prior', coalesce((p_state->>'belief_confidence')::numeric,0.5),
  'belief_display_allowed', coalesce((p_state->>'evidence_strength')::numeric,0) > 0,
  'scientific_claim_state', case
    when p_state is null then 'NOT_YET_CALCULATED'
    when coalesce((p_state->>'evidence_strength')::numeric,0)=0 then 'NOT_YET_ESTABLISHED'
    when p_state->>'state_label'='STRONGLY_SUPPORTED' then 'STRONGLY_SUPPORTED'
    when p_state->>'state_label'='SUPPORTED_WITH_UNCERTAINTY' then 'SUPPORTED_WITH_UNCERTAINTY'
    when p_state->>'state_label'='NOT_SUPPORTED_OR_NEGATIVE' then 'NOT_SUPPORTED_OR_NEGATIVE'
    when p_state->>'state_label'='CONTRADICTED_OR_CONTEXT_DEPENDENT' then 'CONTRADICTED_OR_CONTEXT_DEPENDENT'
    else 'MIXED_OR_UNRESOLVED'
  end,
  'evidence_strength_label', case
    when coalesce((p_state->>'evidence_strength')::numeric,0)=0 then 'NONE'
    when (p_state->>'evidence_strength')::numeric < 0.35 then 'LOW'
    when (p_state->>'evidence_strength')::numeric < 0.7 then 'MODERATE'
    else 'HIGH'
  end,
  'uncertainty_label', case
    when coalesce((p_state->>'uncertainty')::numeric,1) >= 0.7 then 'HIGH'
    when (p_state->>'uncertainty')::numeric >= 0.4 then 'MODERATE'
    else 'LOW'
  end,
  'investigation_value_label', case
    when coalesce((p_state->>'information_gain_opportunity')::numeric,0) >= 0.7 then 'HIGH'
    when (p_state->>'information_gain_opportunity')::numeric >= 0.4 then 'MODERATE'
    else 'LOW'
  end,
  'display_note', case
    when coalesce((p_state->>'evidence_strength')::numeric,0)=0 then 'The numeric belief value is an algorithmic neutral prior, not a scientific finding.'
    else 'Belief confidence is derived from governed evidence and must be read with uncertainty, context, contradiction and provenance.'
  end
);
$function$
;

-- owner: postgres
CREATE OR REPLACE FUNCTION cognitive_core.score_context_fit(p_a jsonb, p_b jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'cognitive_core', 'public'
AS $function$
declare k text; total numeric:=0; matched numeric:=0; va text; vb text;
begin
  if coalesce(jsonb_object_length(coalesce(p_a,'{}'::jsonb)),0)=0 or coalesce(jsonb_object_length(coalesce(p_b,'{}'::jsonb)),0)=0 then return 0.5; end if;
  for k in select key from jsonb_object_keys(coalesce(p_a,'{}'::jsonb)) key loop
    if p_b ? k then
      total:=total+1;
      va:=lower(coalesce(p_a->>k,'')); vb:=lower(coalesce(p_b->>k,''));
      if va=vb then matched:=matched+1;
      elsif va<>'' and vb<>'' and (position(va in vb)>0 or position(vb in va)>0) then matched:=matched+0.6;
      end if;
    end if;
  end loop;
  if total=0 then return 0.5; end if;
  return greatest(0,least(1,matched/total));
end $function$
;
