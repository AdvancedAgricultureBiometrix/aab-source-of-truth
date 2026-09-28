-- Source B. Live rehearsal database kdpcfbaeklkffozryjah, read through the Supabase connector on 2026-09-28. Schema only, no rows.
-- Read at 2026-09-28 07:30:53.092006+00 (UTC), PostgreSQL 17.6. Generated from the system catalogs, read only.
-- Schema: platform. Views: definitions, options and comments.
-- Catalog counts for platform: functions 6, tables 9, views 3, rls_enabled_tables 5, constraints 36, triggers 0, policies 0, indexes 12.
-- Evidence of what exists, not governed code. Never edited after commit.

-- owner: postgres
CREATE VIEW platform.v_domain_registry AS
 SELECT domain_code,
    domain_name,
    database_schema_name,
    lifecycle_status,
    enabled,
    sort_order,
    description,
    created_at,
    updated_at
   FROM platform.domain_registry
  ORDER BY sort_order, domain_name;

-- owner: postgres
CREATE VIEW platform.v_library_summary AS
 SELECT 'INGREDIENTS'::text AS library_code,
    'Ingredients'::text AS library_name,
    ( SELECT count(*) AS count
           FROM agriculture.ingredient
          WHERE ingredient.lifecycle_status <> ALL (ARRAY['RETIRED'::text, 'SUPERSEDED'::text])) AS total_records,
    ( SELECT count(*) AS count
           FROM agriculture.ingredient
          WHERE ingredient.lifecycle_status = 'ACTIVE'::text) AS active_records,
    ( SELECT count(*) AS count
           FROM agriculture.ingredient
          WHERE ingredient.lifecycle_status = ANY (ARRAY['DRAFT'::text, 'UNDER_REVIEW'::text])) AS pending_records,
    'ingredients.html'::text AS href,
    'WIRED_POSTGRESQL'::text AS wire_status
UNION ALL
 SELECT 'CROPS'::text AS library_code,
    'Crops'::text AS library_name,
    ( SELECT count(*) AS count
           FROM agriculture.crop
          WHERE crop.lifecycle_status <> 'ARCHIVED'::text) AS total_records,
    ( SELECT count(*) AS count
           FROM agriculture.crop
          WHERE crop.lifecycle_status = 'ACTIVE'::text) AS active_records,
    ( SELECT count(*) AS count
           FROM agriculture.crop
          WHERE crop.lifecycle_status = 'DRAFT'::text) AS pending_records,
    NULL::text AS href,
    'NOT_YET_WIRED'::text AS wire_status
UNION ALL
 SELECT 'VARIETIES'::text AS library_code,
    'Varieties'::text AS library_name,
    ( SELECT count(*) AS count
           FROM agriculture.variety
          WHERE variety.lifecycle_status <> 'ARCHIVED'::text) AS total_records,
    ( SELECT count(*) AS count
           FROM agriculture.variety
          WHERE variety.lifecycle_status = 'ACTIVE'::text) AS active_records,
    ( SELECT count(*) AS count
           FROM agriculture.variety
          WHERE variety.lifecycle_status = 'DRAFT'::text) AS pending_records,
    NULL::text AS href,
    'NOT_YET_WIRED'::text AS wire_status
UNION ALL
 SELECT 'PROBLEMS'::text AS library_code,
    'Problems'::text AS library_name,
    ( SELECT count(*) AS count
           FROM agriculture.agricultural_problem
          WHERE agricultural_problem.lifecycle_status <> 'ARCHIVED'::text) AS total_records,
    ( SELECT count(*) AS count
           FROM agriculture.agricultural_problem
          WHERE agricultural_problem.lifecycle_status = 'ACTIVE'::text) AS active_records,
    ( SELECT count(*) AS count
           FROM agriculture.agricultural_problem
          WHERE agricultural_problem.lifecycle_status = 'DRAFT'::text) AS pending_records,
    NULL::text AS href,
    'NOT_YET_WIRED'::text AS wire_status
UNION ALL
 SELECT 'METRICS'::text AS library_code,
    'Metrics'::text AS library_name,
    ( SELECT count(*) AS count
           FROM agriculture.metric_definition
          WHERE metric_definition.lifecycle_status <> 'ARCHIVED'::text) AS total_records,
    ( SELECT count(*) AS count
           FROM agriculture.metric_definition
          WHERE metric_definition.lifecycle_status = 'ACTIVE'::text) AS active_records,
    ( SELECT count(*) AS count
           FROM agriculture.metric_definition
          WHERE metric_definition.lifecycle_status = 'DRAFT'::text) AS pending_records,
    NULL::text AS href,
    'NOT_YET_WIRED'::text AS wire_status
UNION ALL
 SELECT 'TEMPLATES'::text AS library_code,
    'Observation Templates'::text AS library_name,
    ( SELECT count(*) AS count
           FROM agriculture.observation_template
          WHERE observation_template.lifecycle_status <> 'ARCHIVED'::text) AS total_records,
    ( SELECT count(*) AS count
           FROM agriculture.observation_template
          WHERE observation_template.lifecycle_status = 'ACTIVE'::text) AS active_records,
    ( SELECT count(*) AS count
           FROM agriculture.observation_template
          WHERE observation_template.lifecycle_status = 'DRAFT'::text) AS pending_records,
    NULL::text AS href,
    'NOT_YET_WIRED'::text AS wire_status
UNION ALL
 SELECT 'METHODS'::text AS library_code,
    'Measurement Methods'::text AS library_name,
    ( SELECT count(*) AS count
           FROM agriculture.measurement_method) AS total_records,
    ( SELECT count(*) AS count
           FROM agriculture.measurement_method
          WHERE measurement_method.active) AS active_records,
    0 AS pending_records,
    NULL::text AS href,
    'NOT_YET_WIRED'::text AS wire_status
UNION ALL
 SELECT 'INSTRUMENTS'::text AS library_code,
    'Instruments'::text AS library_name,
    ( SELECT count(*) AS count
           FROM agriculture.instrument) AS total_records,
    ( SELECT count(*) AS count
           FROM agriculture.instrument
          WHERE instrument.lifecycle_status = 'ACTIVE'::text) AS active_records,
    ( SELECT count(*) AS count
           FROM agriculture.instrument
          WHERE instrument.lifecycle_status <> 'ACTIVE'::text) AS pending_records,
    NULL::text AS href,
    'NOT_YET_WIRED'::text AS wire_status;

-- owner: postgres
CREATE VIEW platform.v_navigation_registry AS
 SELECT s.section_code,
    s.section_label,
    s.sort_order AS section_sort,
    s.admin_only AS section_admin_only,
    i.item_code,
    i.item_label,
    i.href,
    i.domain_code,
    i.required_capability,
    i.admin_only,
    i.sort_order AS item_sort,
    i.active
   FROM platform.navigation_section s
     JOIN platform.navigation_item i ON i.section_code = s.section_code
  WHERE s.active AND i.active
  ORDER BY s.sort_order, i.sort_order, i.item_label;
