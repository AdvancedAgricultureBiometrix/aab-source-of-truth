# AAB Persistence Migration Boundary

**Status:** Mandatory technical direction  
**Recorded:** 2026-09-02

## Decision

SQLite, Airtable and browser-local authority shortcuts are legacy or transitional persistence mechanisms. They must eventually be replaced by the applicable country Supabase project, Supabase Auth and protected persisted memberships.

This is a controlled migration, not permission for a mechanical global rewrite.

## Authoritative target

- Supabase Auth establishes verified identity and session state.
- Protected country records establish tenancy participation.
- Persisted memberships establish role, scope and capability.
- RLS and protected server functions enforce data boundaries.
- Country-specific evidence and scientific state remain in the country project.
- The main control plane retains only platform-level identity, participation, provisioning and governed transfer functions.

Authentication alone never grants a dashboard, invitation right, scientific capability or country authority.

## Legacy classification

| Mechanism | Permitted status |
| --- | --- |
| SQLite runtime reads/writes | Transitional only; inventory and replace |
| Airtable runtime reads/writes | Transitional only; inventory and replace |
| Browser `localStorage` role or membership claims | Forbidden as authority |
| Browser-stored Supabase session | Permitted session transport, not authority |
| Static role flags in HTML/JavaScript | Presentation only; never authorization |
| Supabase Auth user | Verified identity only |
| Protected persisted membership | Required authority source |

Historical documentation may mention SQLite or Airtable and may remain as provenance. It must not be interpreted as an executable production dependency.

## Migration order

For each legacy adapter or storage path:

1. identify every caller and data contract;
2. classify the data owner: central control plane or country runtime;
3. identify the corresponding protected Supabase table/function or record a schema gap;
4. verify RLS, grants and server-side authorization;
5. implement one compatibility boundary where necessary;
6. migrate only controlled rehearsal data;
7. prove identity, membership, role and country isolation;
8. remove executable legacy fallback;
9. retain an audit record and rollback path;
10. repeat for the next bounded adapter.

Do not import old databases, personal records or uncontrolled Airtable exports into a country project merely to make a page display information.

## Dashboard wiring rule

Every governed role may have its own dashboard, but dashboard wiring follows persisted authority:

```text
verified Supabase session
→ server resolves country and active membership
→ server resolves bounded role and capabilities
→ approved data queries execute under RLS/server contract
→ dashboard renders only returned scope
```

No dashboard should be populated with invented data while real records are absent. Empty, unavailable and not-yet-authorised states must be explicit.

## Stop conditions

Stop and report before proceeding if a proposed migration:

- requires sharing a database between countries;
- requires a country runtime to use the main project service credential;
- weakens RLS or exposes a service-role/secret key to the browser;
- derives authority from user-editable metadata or browser state;
- silently treats authentication as membership;
- discards contradictions, negative results, provenance or human approval gates;
- changes rehearsal records into production or legal authority.

