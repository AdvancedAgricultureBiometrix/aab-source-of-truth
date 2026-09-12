# AAB Platform and Country Isolation Architecture

**Status:** Canonical architecture record  
**Recorded:** 2026-09-12  
**Scope:** AAB platform/control-plane role, canonical clean foundation, WA rehearsal role, country-by-country deployment, scientific sovereignty, and governed capability distribution.

## Core principle

> **AAB capability can improve globally. Scientific knowledge remains sovereign locally.**

AAB is built once as a governed platform/capability, but each participating country receives its own isolated, scientifically clean AAB environment.

A country deployment is not a folder, account or partition inside one shared scientific database. It is a distinct country application environment with its own hosting, authentication, database, users, institutions, scientific records, evidence, learning and scientific memory.

## Conceptual architecture

```text
                         AAB PLATFORM
                  aab.ag / Platform Control Plane
                               |
                               |
                  +------------+------------+
                  |                         |
            AAB CANONICAL             AAB GOVERNANCE
           CLEAN FOUNDATION          / RELEASE CONTROL
                  |
                  | Approved AAB versions
                  |
        +---------+-----------+--------------+
        |         |           |              |
        v         v           v              v
   WA REHEARSAL  VIETNAM     INDIA        THAILAND
   ------------  -------     -----        --------
   Own website   Own website Own website  Own website
   Own AAB app   Own AAB app Own AAB app  Own AAB app
   Own Supabase  Own DB      Own DB       Own DB
   Own Auth      Own Auth    Own Auth     Own Auth
   Own users     Own users   Own users    Own users
   Own science   Own science Own science  Own science
   Own memory    Own memory  Own memory   Own memory
   Own evidence  Own evidence Own evidence Own evidence

             NO COUNTRY DATA CROSS-MIXING
```

## 1. AAB platform / `aab.ag`

`aab.ag` is the public/platform doorway and control-plane environment.

Its role includes platform-level identity/authority, governed participation decisions, canonical provisioning decisions, release/governance control and public AAB presentation.

It must not become the shared repository into which all participating countries' scientific knowledge is accumulated.

The platform may know that a country participates and may govern the provisioning/release relationship, but the country's scientific information belongs within that country's isolated environment.

## 2. Canonical AAB

The canonical AAB is the protected clean blueprint from which country environments are provisioned.

It is:

> **Structurally complete, scientifically clean.**

It may contain approved schema, functions, views, triggers, constraints, governance contracts, security controls, baseline/reference definitions and reusable cognitive capability.

It must not contain inherited country scientific records, country discovery findings, local institutions, country memberships, historical research imports, local approved learning, country scientific memory or rehearsal/test data.

The canonical clean baseline was independently restored and proven on 2026-09-12.

## 3. WA rehearsal

`wa-rehearsal.nexiuma.ai` is the controlled rehearsal/testing environment for the country-isolation model.

It is not the canonical AAB template and it is not the production environment of another future country.

WA exists so AAB can safely:

- test country onboarding;
- test country Head Admin and institution workflows;
- test role and authority boundaries;
- test Discovery;
- test historical scientific-memory recovery;
- test trials, observations and learning;
- test new platform capability;
- deliberately encounter and repair failures;
- validate improvements before promotion.

Experimental/rehearsal data belongs in WA and must not contaminate the canonical template.

Conceptually:

```text
                    AAB CANONICAL
                         |
                         v
                    WA REHEARSAL
                         |
                   Test and prove
                         |
                         v
                 GOVERNANCE APPROVAL
                         |
                         v
                  AAB CANONICAL UPDATE
                         |
                 +-------+-------+
                 v       v       v
              Vietnam  India  Thailand
```

No automatic promotion is allowed. Scientific, governance and technical approval remain required before a proven capability becomes part of the canonical AAB release.

## 4. Future country deployment model

When Vietnam, India, Thailand or another country joins AAB, the country does not inherit WA or another country's database.

It receives a fresh AAB country environment created from the approved canonical clean foundation.

For example:

```text
Vietnam AAB
|
+-- Vietnam web application
+-- Vietnam authentication
+-- Vietnam database / Supabase or approved equivalent
+-- Vietnam institutions
+-- Vietnam scientists
+-- Vietnam Discovery
+-- Vietnam historical scientific memory
+-- Vietnam ingredients
+-- Vietnam formulations
+-- Vietnam trials
+-- Vietnam observations
+-- Vietnam evidence
+-- Vietnam scientific learning
```

India receives its own separate environment from the clean canonical baseline. Thailand receives another separate environment. One country's scientific history does not become the seed for another country.

## 5. Hosting and jurisdiction

A country environment does not necessarily require a manual upload to a physical government-owned server.

The hosting implementation may differ according to the country's legal, security, operational and data-localisation requirements.

A country may use an approved local cloud/data-centre provider, sovereign cloud, government infrastructure or another authorised hosting arrangement.

The non-negotiable principle is isolation and authority:

- country application isolated;
- country database isolated;
- country authentication isolated;
- country secrets isolated;
- country scientific information kept within the authorised country boundary;
- no hidden shared scientific database across countries.

## 6. Capability versus country knowledge

AAB must distinguish between **AAB capability** and **country scientific knowledge**.

### AAB capability

Examples:

- improved contradiction detection;
- better evidence reasoning;
- new formulation-analysis capability;
- improved historical spreadsheet ingestion;
- stronger trial workflows;
- better security and provenance controls.

Once validated and approved, these capabilities may be distributed as a governed AAB release to authorised country environments.

### Country scientific knowledge

Examples:

- a Vietnamese formulation;
- an Indian trial result;
- Thai institutional research;
- country Discovery findings;
- country historical spreadsheets;
- country scientific memory;
- country-specific ingredient intelligence.

This information does not automatically move to another country or to canonical AAB.

Conceptually:

```text
AAB capability improvement
        |
        +----> Vietnam
        +----> India
        +----> Thailand
        +----> WA rehearsal

Country scientific knowledge
Vietnam -----X-----> India
Vietnam -----X-----> Thailand
Vietnam -----X-----> Canonical AAB
```

Any future cross-country scientific sharing must be explicit, authorised, governed and provenance-preserving. It must never be assumed merely because all countries use AAB.

## 7. Release and update principle

The long-term objective is not to manually maintain divergent copies of AAB for every country.

AAB should eventually have a governed release/provisioning mechanism that can distribute approved structural and capability improvements to country installations without pulling country scientific data back into the control plane or mixing country data.

Future release workflow:

```text
WA / controlled development
        |
        v
Technical validation
        |
Scientific/governance review where applicable
        |
        v
Approved canonical AAB release
        |
        +----> Country A
        +----> Country B
        +----> Country C
```

Country data remains in place while the approved AAB capability is updated.

## 8. Why the isolation model matters

The architecture allows AAB to become more capable over time without creating a central scientific-data dependency.

After many years, countries may have very different bodies of scientific memory:

```text
                    AAB PLATFORM
                         |
                 Approved AAB release
                         |
        +----------------+----------------+
        v                v                v
     VIETNAM            INDIA          THAILAND
  local science      local science    local science
  local institutions local institutions local institutions
  local memory       local memory     local memory

      Scientific histories remain isolated.
      AAB capability can continue to improve.
```

This preserves country scientific sovereignty while allowing the platform itself to improve.

## 9. Relationship to current domains

The current public/main domain and WA rehearsal host have different roles:

```text
aab.ag
Platform/public/control-plane doorway

wa-rehearsal.nexiuma.ai
WA isolated rehearsal web application

WA Supabase
WA isolated tenancy/data/authentication
```

The web host and database together form the practical country environment. The hostname itself does not create sovereignty or isolation; isolation is established by the combined hosting, authentication, database, secrets, access-control and governance boundaries.

## 10. Provisioning rule

Every future country onboarding must begin from the approved canonical clean baseline, not from another country tenancy.

The resulting environment must be:

> **Structurally complete, scientifically clean, locally authoritative.**

The country may then onboard its institutions, recover its historical scientific memory and begin generating its own governed scientific history.

## 11. Permanent architecture rule

The architecture must always preserve the distinction:

> **Build and improve AAB once. Deploy isolated clean AAB environments country by country. Share approved capability, not sovereign scientific data.**
