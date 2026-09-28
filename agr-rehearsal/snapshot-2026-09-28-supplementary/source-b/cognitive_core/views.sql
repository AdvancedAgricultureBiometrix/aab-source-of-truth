-- Source B supplement. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows. The eight application schemas not in snapshot-2026-09-28.
-- Read at 2026-09-28 09:04:35.914286+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: cognitive_core. Views: definitions, options and comments.
-- Catalog counts for cognitive_core: functions 25, tables 18, views 1, sequences 0, rls_enabled_tables 0, constraints 157, triggers 0, policies 0, indexes 39.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE VIEW cognitive_core.v_cognitive_foundation AS
 SELECT ( SELECT count(*) AS count
           FROM cognitive_core.brain_registry
          WHERE brain_registry.lifecycle_status = 'ACTIVE'::text) AS active_brains,
    ( SELECT count(*) AS count
           FROM cognitive_core.algorithm_registry
          WHERE algorithm_registry.lifecycle_status = ANY (ARRAY['ACTIVE'::text, 'EXPERIMENTAL'::text])) AS algorithms,
    ( SELECT count(*) AS count
           FROM cognitive_core.intelligent_node
          WHERE intelligent_node.lifecycle_status = 'ACTIVE'::text) AS active_nodes,
    ( SELECT count(*) AS count
           FROM cognitive_core.intelligent_relationship
          WHERE intelligent_relationship.lifecycle_status = 'ACTIVE'::text) AS active_relationships,
    ( SELECT count(*) AS count
           FROM cognitive_core.target_registry
          WHERE target_registry.lifecycle_status = 'ACTIVE'::text) AS active_targets,
    ( SELECT count(*) AS count
           FROM cognitive_core.problem_signal
          WHERE problem_signal.lifecycle_status = ANY (ARRAY['OPEN'::text, 'UNDER_ANALYSIS'::text, 'TRANSFORMED'::text])) AS open_problem_signals,
    ( SELECT count(*) AS count
           FROM cognitive_core.transformation_opportunity
          WHERE transformation_opportunity.status = ANY (ARRAY['CANDIDATE'::text, 'UNDER_REVIEW'::text, 'ACCEPTED_FOR_INVESTIGATION'::text])) AS open_transformation_opportunities,
    ( SELECT count(*) AS count
           FROM cognitive_core.ingredient_build_candidate
          WHERE ingredient_build_candidate.scientific_status <> ALL (ARRAY['REJECTED'::text, 'ARCHIVED'::text])) AS ingredient_build_candidates,
    ( SELECT count(*) AS count
           FROM cognitive_core.domain_brain_inheritance
          WHERE domain_brain_inheritance.fail_closed_on_kernel_absence = true) AS domain_brain_inheritance_links,
    true AS autonomous_approval_disabled,
    true AS scientist_authority_preserved,
    'Can this problem become a resource, mechanism, process, material, learning asset or discovery opportunity?'::text AS transformation_question;
