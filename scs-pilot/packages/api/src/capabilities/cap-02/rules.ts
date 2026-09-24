// SCS-CAP-02 registration rules shared by role claims, relationships and
// mandates (contract 9a3e978, "Role claims, relationships and mandates:
// registration rules"). Each check throws the contract's failure code; none
// writes anything.

import type { Tx } from "../../foundation/db.js";
import { cap02Failure } from "./errors.js";
import { findFrameworksById, type FrameworkForAssociation } from "./store.js";

/** When both are given, validUntil must be after validFrom → VALIDITY_PERIOD_INVALID. */
export function checkValidityPeriod(validFrom: string | undefined, validUntil: string | undefined): void {
  if (validFrom !== undefined && validUntil !== undefined && Date.parse(validUntil) <= Date.parse(validFrom)) {
    throw cap02Failure("VALIDITY_PERIOD_INVALID", [`validUntil (${validUntil}) must be after validFrom (${validFrom}).`]);
  }
}

/**
 * Every framework must be registered by SCS-CAP-01 (FRAMEWORK_ASSOCIATION_NOT_FOUND)
 * and ACTIVE (FRAMEWORK_NOT_ACTIVE). Returns them, in request order.
 */
export async function checkFrameworks(tx: Tx, frameworkIds: readonly string[]): Promise<FrameworkForAssociation[]> {
  const found = await findFrameworksById(tx, frameworkIds);
  const missing = frameworkIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw cap02Failure("FRAMEWORK_ASSOCIATION_NOT_FOUND", missing.map((id) => `No SCS-CAP-01 framework is registered with frameworkId ${id}.`));
  }
  const frameworks = frameworkIds.map((id) => found.get(id)!);
  const inactive = frameworks.filter((f) => f.status !== "ACTIVE");
  if (inactive.length > 0) {
    throw cap02Failure(
      "FRAMEWORK_NOT_ACTIVE",
      inactive.map((f) => `Framework ${f.frameworkId} is ${f.status}; only an ACTIVE framework can be the basis for a new registration.`),
    );
  }
  return frameworks;
}

/**
 * Each commodityScope value must equal a referenced framework's commodityCode,
 * and each geographicScope value its countryOfOrigin → SCOPE_OUTSIDE_FRAMEWORK,
 * naming every value outside scope. Values are checked one by one (contract
 * gap: commodity and country are not paired per framework).
 */
export function checkScope(frameworks: readonly FrameworkForAssociation[], commodityScope: readonly string[], geographicScope: readonly string[]): void {
  const commodities = new Set(frameworks.map((f) => f.commodityCode));
  const countries = new Set(frameworks.map((f) => f.countryOfOrigin));
  const outside = [
    ...commodityScope.filter((c) => !commodities.has(c)).map((c) => `/commodityScope: "${c}" is not the commodityCode of any referenced framework (${[...commodities].join(", ")}).`),
    ...geographicScope.filter((g) => !countries.has(g)).map((g) => `/geographicScope: "${g}" is not the countryOfOrigin of any referenced framework (${[...countries].join(", ")}).`),
  ];
  if (outside.length > 0) throw cap02Failure("SCOPE_OUTSIDE_FRAMEWORK", outside);
}

/**
 * The reason recorded for a scope check that passed, including its known
 * limit. `check` is the decision's check name (scopeWithinFrameworks, or
 * scopeWithinFramework on a role claim).
 */
export function scopeReason(frameworkCount: number, check = "scopeWithinFrameworks"): string {
  return frameworkCount > 1
    ? `${check}: evaluated — every commodity is a referenced framework's commodityCode and every country its countryOfOrigin. Values are checked one by one: with several frameworks, commodity and country are not paired per framework (contract gap).`
    : `${check}: evaluated — every commodity is the referenced framework's commodityCode and every country its countryOfOrigin.`;
}
