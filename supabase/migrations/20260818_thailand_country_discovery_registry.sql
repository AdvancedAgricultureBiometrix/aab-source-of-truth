insert into country_core.country_workspace
  (workspace_code, country_code, country_name, workspace_name, lifecycle_status, default_language, timezone_name, data_residency_note)
values
  ('TH-PITCH-EVIDENCE', 'TH', 'Thailand', 'Thailand governed evidence pitch', 'BOOTSTRAP_RUNNING', 'th', 'Asia/Bangkok', 'Public-evidence pitch workspace in the AAB test project. No Thailand brain or operational country tenancy is created.')
on conflict (country_code) do update set
  workspace_name = excluded.workspace_name,
  lifecycle_status = excluded.lifecycle_status,
  default_language = excluded.default_language,
  timezone_name = excluded.timezone_name,
  data_residency_note = excluded.data_residency_note,
  updated_at = now();

insert into country_core.country_scan_profile
  (country_workspace_id, profile_code, country_code, focus_jurisdiction_code, profile_status, administrative_levels, scan_recipes, evidence_policy, sovereignty_policy)
select country_workspace_id, 'TH-COUNTRY-DISCOVERY-V1', 'TH', 'TH', 'ACTIVE',
  '["country","province","district","site"]'::jsonb,
  '["agricultural_residuals","aquaculture_residuals","environmental_hazards","geology_and_historic_workings","groundwater_context","unclassified_signals"]'::jsonb,
  '{"minimum_candidate_threshold":true,"not_detected_requires_adequate_coverage":true,"unclassified_signals_quarantined":true,"benefits_not_assumed":true}'::jsonb,
  '{"country_locked":true,"cross_country_learning":false,"automatic_brain_promotion":false,"pitch_workspace_only":true}'::jsonb
from country_core.country_workspace where country_code = 'TH'
on conflict (profile_code) do update set
  profile_status = excluded.profile_status,
  scan_recipes = excluded.scan_recipes,
  evidence_policy = excluded.evidence_policy,
  sovereignty_policy = excluded.sovereignty_policy,
  updated_at = now();

insert into country_core.country_source_registry
  (source_code, country_code, source_name, source_category, authority_tier, publisher, source_url, refresh_cadence, data_scope, verification_status)
values
  ('TH-OAE-RICE', 'TH', 'Rice production statistics', 'AGRICULTURE', 'TIER_1_GOVERNMENT', 'Thailand Office of Agricultural Economics', 'https://www.oae.go.th/uploads/files/2025/10/02/ed7431cc5ef993dd.pdf', 'ANNUAL', 'Production context; does not establish residual quantity or suitability', 'VERIFIED_SOURCE'),
  ('TH-DOF-MARINE', 'TH', 'Marine fish culture production statistics', 'AGRICULTURE', 'TIER_1_GOVERNMENT', 'Thailand Department of Fisheries', 'https://www4.fisheries.go.th/local/file_document/20260713151302_new.pdf', 'ANNUAL', 'Marine production context; residual streams require facility evidence', 'VERIFIED_SOURCE'),
  ('TH-PCD-AIR4THAI', 'TH', 'Air4Thai monitoring service', 'ENVIRONMENT', 'TIER_1_GOVERNMENT', 'Thailand Pollution Control Department', 'https://air4thai.pcd.go.th/webV2/index.php', 'DAILY', 'Official air monitoring; readings do not establish source attribution', 'VERIFIED_SOURCE'),
  ('TH-DMR-GEOLOGY', 'TH', 'Official geological maps', 'ENVIRONMENT', 'TIER_1_GOVERNMENT', 'Thailand Department of Mineral Resources', 'https://www.dmr.go.th/map_service/geological_map/', 'EVENT_DRIVEN', 'Geological coverage; no material benefit or candidate equivalence assumed', 'VERIFIED_SOURCE'),
  ('TH-DGR-GROUNDWATER', 'TH', 'Groundwater map service', 'ENVIRONMENT', 'TIER_1_GOVERNMENT', 'Thailand Department of Groundwater Resources', 'https://datum.dgr.go.th/mapgroundwater/index.php', 'EVENT_DRIVEN', 'Groundwater spatial context; site chemistry and permissions unresolved', 'VERIFIED_SOURCE')
on conflict (source_code) do update set
  source_name = excluded.source_name,
  source_url = excluded.source_url,
  data_scope = excluded.data_scope,
  verification_status = excluded.verification_status,
  active = true,
  updated_at = now();
