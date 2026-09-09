# AAB Canonical Template Protection and Country Provisioning Rule

**Status:** Canonical architecture and protection rule  
**Recorded:** 2026-09-10  
**Scope:** Main AAB template/control-plane protection, country clean-room provisioning, rehearsal isolation and backup discipline

## Core rule

> Every newly provisioned country AAB environment must be structurally complete but scientifically clean.

The canonical AAB template may contain approved schema, functions, views, triggers, reference definitions, validation rules, cognitive registries, governance contracts and other platform foundation required to create a new country tenancy. It must not contain inherited country-specific scientific, institutional, discovery, learning, rehearsal or historical-import data.

## Main AAB project role

The main AAB Supabase is the platform control plane and canonical source for approved provisioning decisions and platform-level identity/authority. It is not the scientific sandbox for Western Australia or any future country.

Country-specific scientific work belongs in isolated country tenancies.

## Western Australia role

Western Australia is the controlled rehearsal and testing sandpit. Experimental onboarding, historical-data ingestion, trial records, discovery data, test institutions, test scientists, observations, outcomes and generated learning used for rehearsal must remain in the WA clean-room and must not be copied into the canonical template.

## Provisioning contract

A new country environment should be created from an approved clean AAB baseline using the following sequence:

1. create isolated country infrastructure;
2. apply the approved canonical schema/migrations;
3. install approved functions, triggers, views and security controls;
4. install permitted baseline reference/configuration data only;
5. verify integrity and security attestation;
6. verify zero inherited country-specific scientific data;
7. activate the country environment;
8. allow that country and its authorised institutions to begin onboarding and importing their own data.

The result must be **structurally complete, scientifically clean**.

## Data that must never be inherited into a new country tenancy

Unless a future governance record explicitly authorises a narrowly defined shared reference dataset, a new country tenancy must not inherit:

- trials, plots, observations, measurements or outcomes;
- country discovery findings or country intelligence records from another tenancy;
- institution records or memberships from another tenancy;
- country-specific governance decisions;
- scientific memory or approved learning generated in another tenancy;
- historical research imports or source files from another tenancy;
- rehearsal users, invitations, acknowledgements or test records;
- generated/test cognitive state;
- secrets, keys, sessions or authentication records.

## Historical Scientific Memory Recovery

The Historical Scientific Memory Recovery engine is a reusable AAB capability. The historical files and recovered scientific records are country/institution data and must remain inside the authorised country tenancy where they are uploaded.

Example:

- the importer capability may be deployed to every approved country;
- Cambodian institutional spreadsheets belong only in the Cambodia tenancy;
- Thai institutional archives belong only in the Thailand tenancy;
- WA rehearsal spreadsheets belong only in the WA rehearsal tenancy.

## Canonical-template protection principle

The clean template is a protected asset. Test data must never be introduced merely to demonstrate that a schema or function works.

Where validation requires populated data, use the designated rehearsal tenancy or an explicitly disposable development environment.

Any proposed write to canonical scientific/domain tables in the main template must be treated as exceptional and reviewed against this rule before execution.

## Backup and restore discipline

The canonical template must have independently restorable backups outside the live database service. A valid private backup should include, at minimum:

- a schema-only PostgreSQL dump containing schemas, tables, views, functions, triggers, constraints, indexes, grants and extensions;
- approved baseline/reference data required for a structurally complete clean deployment;
- migration/source repository snapshot at a known commit;
- a manifest containing project reference, timestamp, Git commit, database/Postgres version and SHA-256 hashes of backup artifacts;
- no secrets or credentials inside the backup archive.

At least one backup copy should be stored privately outside GitHub and outside the live Supabase project.

A backup is not considered proven until a restore test has successfully recreated a clean environment and integrity checks have passed.

## Change discipline

Before modifying the canonical template:

1. confirm the change is platform/template work rather than country rehearsal work;
2. implement and validate in WA rehearsal or another controlled development environment where practical;
3. record the WHY and applicable governance decision;
4. apply only the approved structural/configuration change to the canonical template;
5. confirm that no country/rehearsal data crossed the boundary;
6. update the canonical backup after the approved change;
7. record the new backup manifest and integrity hash.

## Fail-closed interpretation

If it is unclear whether a record belongs to the template or a country tenancy, it must not be inserted into the canonical template until the ownership and authority boundary is resolved.

The default is preservation of the clean template, not convenience of testing.
