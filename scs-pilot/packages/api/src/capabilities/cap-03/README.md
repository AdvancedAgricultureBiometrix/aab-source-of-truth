# SCS-CAP-03 — Plot and Land Unit Registration

**Status: `registerPlot` (`POST /scs/v1/plots`) is implemented for the pilot (contract 2151321). `addTenureClaim` and `associateFramework` need their contract redefined before they are built. The reads (`getPlot`, `listPlots` and so on) and `retirePlot` are deferred.**

- **Plot-level checks.** Each is FAIL_CLOSED and writes nothing:
  1. Authority: only `COMPLIANCE_OFFICER`.
  2. The coordinate reference system must be `EPSG:4326`.
  3. The geometry must be valid (`geometry.ts`, below).
  4. `countryCode` must be ISO 3166-1 alpha-2.
  5. Two request rules, each a 400: a `registryVerificationStatus` other than `NOT_APPLICABLE` needs a `registryReference`, and each framework may appear at most once.
  6. Tenure claims: at least one (checked by the schema); valid validity periods; every claimant must be a registered CAP-02 party that is not RETIRED.
- **Geometry** (`geometry.ts`) is GeoJSON, checked in the application:
  - positions and coordinate ranges;
  - rings with at least 4 positions, closed, and not self-intersecting;
  - the EUDR rule: a point may represent a plot of at most 4 ha, and polygons must declare their area.

  There's no PostGIS yet (`TODO(postgis)`). Holes, overlap between multipolygon parts, and precision aren't checked, and the declared area isn't compared with the geometry. The pilot also sets limits of 1000 positions per ring and 10000 per plot, to keep the self-intersection check fast.
- **Framework associations** are evaluated before anything is written, because the plot's status depends on them. A failing association becomes a `FAILED` result with a `failureCode`, in this order: `FRAMEWORK_REFERENCE_NOT_FOUND`, `FRAMEWORK_NOT_ACTIVE`, `COMMODITY_OUTSIDE_FRAMEWORK`, `PRODUCER_PARTY_NOT_FOUND`, `PARTY_RETIRED`. Nothing is written for it, and it never fails the plot.
- **What is written,** in one transaction:
  - the plot, with `overlapState` `NOT_EVALUATED`;
  - its tenure claims, each `UNVERIFIED`;
  - each successful association (`APPLICABLE`, `ACTIVE`; `frameworkVersion` and `evidenceRequirementSpecId` taken from CAP-01);
  - the receipt (`PLOT_REGISTRATION`).
- **Outcome:** `REGISTERED_WITH_GAPS` whenever a gap is disclosed. Overlap is never evaluated in the pilot, so **every pilot plot is `REGISTERED_WITH_GAPS`**, and pilot partners must be told why.


Canonical contract: [`governance/workstream-b/SCS-CAP-03-PLOT-AND-LAND-UNIT-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md`](../../../../../../governance/workstream-b/SCS-CAP-03-PLOT-AND-LAND-UNIT-REGISTRATION-CANONICAL-CONTRACT-2026-09-22.md)

The contract is the specification. Code added here must implement it as written, including its failure contract and the boundaries listed under "What this document does not establish". SCS-CAP-03 is PROPOSED_NOT_ADMITTED: no code here grants commissioning, production or regulatory authority.
