AAB ID-04 - Scoped Dashboard Route Resolver Contract

STATUS
Local, read-only, synthetic validation only. No Supabase change has been applied.

PURPOSE
ID-04 consumes the validated ID-03 authority context and resolves only fixed, server-defined dashboard route plans while preserving role and membership scope.

BOUNDARIES
It does not navigate or redirect the browser, accept client-supplied routes, create or change route mappings, grant authority, mutate memberships, enable Auth, or write data.

CONTENTS
1. AAB-ID-04-SCOPED-DASHBOARD-ROUTE-RESOLVER-CONTRACT.js
2. Updated indexDASH.html loader
3. ID-04-BROWSER-CONSOLE-VALIDATION.js
4. ID-04-FUTURE-MIGRATION-SPECIFICATION.sql

IMPORTANT
The SQL file is an unapplied future integration specification. Review and reconcile route paths against the final application inventory on a future Supabase Pro development branch. Do not run it against production.
