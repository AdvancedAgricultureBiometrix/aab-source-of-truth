(function (global) {
  "use strict";

  var BUILD_ID = "ID-03";
  var VERSION = "1.0.0";
  var PASS = "PASS_READY_READ_ONLY";
  var BLOCKED = "BLOCKED_OPERATIONAL_REQUEST";
  var ACTIVE_STATES = Object.freeze(["ACTIVE"]);
  var KNOWN_STATES = Object.freeze(["PENDING", "ACTIVE", "SUSPENDED", "REVOKED", "EXPIRED"]);
  var KNOWN_SCOPES = Object.freeze(["COUNTRY", "INSTITUTION", "PLATFORM", "DOMAIN"]);

  var CONTRACT = Object.freeze({
    buildId: BUILD_ID,
    contractName: "AAB Protected Membership Authority Resolver Contract",
    version: VERSION,
    status: PASS,
    classification: Object.freeze([
      "READ_ONLY",
      "FAIL_CLOSED",
      "SYNTHETIC_VALIDATION_ONLY",
      "NO_AUTHORITY_GRANT",
      "NO_MEMBERSHIP_MUTATION",
      "NO_DATABASE_WRITE",
      "NO_DASHBOARD_ROUTING"
    ]),
    purpose: "Resolve an ID-02 identity context against existing protected AAB membership records without creating, changing, or inferring authority.",
    dependencies: Object.freeze({
      requiredBuild: "ID-02",
      requiredNamespace: "AAB_IDENTITY_ACTOR_LINK_02",
      requiredResult: PASS
    }),
    doctrine: Object.freeze({
      accountIsNotAuthority: true,
      identityLinkIsNotAuthority: true,
      protectedMembershipRecordsAreCanonical: true,
      onlyActiveMembershipsCanBeResolved: true,
      actorIdentityMustMatchExactly: true,
      countryAndInstitutionScopeMustRemainExplicit: true,
      conflictingOrMalformedMembershipFailsClosed: true,
      absenceOfMembershipReturnsNoAuthority: true,
      browserCannotSupplyOrElevateAuthority: true,
      emailAndUserMetadataCannotGrantAuthority: true,
      resolverNeverCreatesOrChangesMemberships: true,
      dashboardRoutingIsDeferred: true
    }),
    membershipStates: KNOWN_STATES,
    authorityScopes: KNOWN_SCOPES,
    allowedActions: Object.freeze([
      "GET_CONTRACT",
      "VALIDATE_CONTRACT",
      "RESOLVE_SYNTHETIC_AUTHORITY",
      "CHECK_AUTHORITY_COMPATIBILITY"
    ]),
    prohibitedActions: Object.freeze([
      "CREATE_MEMBERSHIP",
      "UPDATE_MEMBERSHIP",
      "DELETE_MEMBERSHIP",
      "ACTIVATE_MEMBERSHIP",
      "GRANT_ROLE",
      "REVOKE_ROLE",
      "ASSIGN_AUTHORITY",
      "ELEVATE_AUTHORITY",
      "ROUTE_DASHBOARD",
      "WRITE_DATABASE",
      "ENABLE_AUTH"
    ]),
    nextAllowedBuild: "ID-04"
  });

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalise(value) {
    return String(value || "").trim();
  }

  function upper(value) {
    return normalise(value).toUpperCase();
  }

  function dependencyStatus() {
    var dependency = global.AAB_IDENTITY_ACTOR_LINK_02;
    var validation = dependency && typeof dependency.validateContract === "function"
      ? dependency.validateContract()
      : null;
    return {
      exists: Boolean(dependency),
      result: validation ? validation.result : "MISSING",
      ready: Boolean(validation && validation.result === CONTRACT.dependencies.requiredResult)
    };
  }

  function validateContract() {
    var failures = [];
    var dependency = dependencyStatus();
    if (!dependency.exists) failures.push("ID_02_DEPENDENCY_MISSING");
    if (dependency.exists && !dependency.ready) failures.push("ID_02_NOT_READY_READ_ONLY");
    if (CONTRACT.status !== PASS) failures.push("STATUS_NOT_READ_ONLY_READY");
    if (CONTRACT.doctrine.protectedMembershipRecordsAreCanonical !== true) failures.push("CANONICAL_MEMBERSHIP_SOURCE_NOT_LOCKED");
    if (CONTRACT.doctrine.onlyActiveMembershipsCanBeResolved !== true) failures.push("ACTIVE_MEMBERSHIP_GATE_MISSING");
    if (CONTRACT.doctrine.absenceOfMembershipReturnsNoAuthority !== true) failures.push("NO_MEMBERSHIP_FAIL_CLOSED_RULE_MISSING");
    if (CONTRACT.doctrine.browserCannotSupplyOrElevateAuthority !== true) failures.push("BROWSER_AUTHORITY_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.resolverNeverCreatesOrChangesMemberships !== true) failures.push("NO_MEMBERSHIP_MUTATION_RULE_MISSING");

    return Object.freeze({
      buildId: BUILD_ID,
      version: VERSION,
      result: failures.length === 0 ? PASS : "FAIL_CLOSED",
      ready: failures.length === 0,
      failureReasons: failures,
      dependency: dependency,
      mode: "READ_ONLY_SYNTHETIC_PROTECTED_MEMBERSHIP_RESOLVER",
      nextAllowedBuild: failures.length === 0 ? CONTRACT.nextAllowedBuild : null
    });
  }

  function resolveSyntheticAuthority(request) {
    var input = request && typeof request === "object" ? request : {};
    var identity = input.identityContext && typeof input.identityContext === "object" ? input.identityContext : {};
    var memberships = Array.isArray(input.memberships) ? input.memberships : [];
    var reasons = [];
    var actorId = normalise(identity.actorId);

    if (!actorId) reasons.push("ACTOR_ID_REQUIRED");
    if (identity.authorityResolved === true) reasons.push("PRE_RESOLVED_AUTHORITY_NOT_ACCEPTED");
    if (upper(identity.linkState) !== "LINKED") reasons.push("ID_02_LINK_NOT_ACTIVE");
    if (upper(identity.authoritySource) !== "PROTECTED_SERVER_MEMBERSHIP_RECORDS") reasons.push("NON_CANONICAL_AUTHORITY_SOURCE_BLOCKED");
    if (input.browserRole || input.userMetadataRole || input.emailRole) reasons.push("CLIENT_SUPPLIED_AUTHORITY_BLOCKED");

    var actorMemberships = memberships.filter(function (membership) {
      return normalise(membership.actorId) === actorId;
    });
    var malformed = false;
    var active = [];

    actorMemberships.forEach(function (membership) {
      var membershipId = normalise(membership.membershipId);
      var roleCode = upper(membership.roleCode);
      var state = upper(membership.state);
      var scopeType = upper(membership.scopeType);
      var scopeId = normalise(membership.scopeId);
      var countryId = normalise(membership.countryId);
      var institutionId = normalise(membership.institutionId);

      if (!membershipId || !roleCode || !KNOWN_STATES.includes(state) || !KNOWN_SCOPES.includes(scopeType) || !scopeId) {
        malformed = true;
        return;
      }
      if (scopeType === "COUNTRY" && (!countryId || scopeId !== countryId)) {
        malformed = true;
        return;
      }
      if (scopeType === "INSTITUTION" && (!institutionId || scopeId !== institutionId)) {
        malformed = true;
        return;
      }
      if (ACTIVE_STATES.includes(state)) {
        active.push({
          membershipId: membershipId,
          actorId: actorId,
          roleCode: roleCode,
          state: state,
          scopeType: scopeType,
          scopeId: scopeId,
          countryId: countryId || null,
          institutionId: institutionId || null
        });
      }
    });

    if (malformed) reasons.push("MALFORMED_OR_CONFLICTING_MEMBERSHIP");
    if (active.length === 0) reasons.push("NO_ACTIVE_PROTECTED_MEMBERSHIP");

    var seenIds = {};
    var duplicateMembership = active.some(function (membership) {
      if (seenIds[membership.membershipId]) return true;
      seenIds[membership.membershipId] = true;
      return false;
    });
    if (duplicateMembership) reasons.push("DUPLICATE_MEMBERSHIP_ID");

    var resolved = reasons.length === 0;
    return Object.freeze({
      buildId: BUILD_ID,
      result: resolved ? "PROTECTED_AUTHORITY_RESOLVED_READ_ONLY" : "PROTECTED_AUTHORITY_BLOCKED",
      resolved: resolved,
      failureReasons: reasons,
      authorityContext: resolved ? Object.freeze({
        actorId: actorId,
        authoritySource: "PROTECTED_SERVER_MEMBERSHIP_RECORDS",
        memberships: clone(active),
        membershipCount: active.length,
        dashboardRouteResolved: false
      }) : null,
      authorityGranted: false,
      membershipCreatedOrChanged: false,
      mutationPerformed: false,
      dataWritten: false,
      syntheticOnly: true
    });
  }

  function checkSafeRequest(request) {
    var input = request && typeof request === "object" ? request : {};
    var action = upper(input.action);
    var reasons = [];
    if (!CONTRACT.allowedActions.includes(action)) reasons.push("ACTION_NOT_ALLOWED_READ_ONLY");
    if (CONTRACT.prohibitedActions.includes(action)) reasons.push("OPERATIONAL_ACTION_BLOCKED");
    if (input.write === true || input.mutate === true || input.persist === true) reasons.push("WRITE_OR_MUTATION_BLOCKED");
    if (input.createMembership === true || input.updateMembership === true || input.deleteMembership === true) reasons.push("MEMBERSHIP_MUTATION_BLOCKED");
    if (input.grantRole === true || input.revokeRole === true || input.assignAuthority === true || input.elevateAuthority === true) reasons.push("AUTHORITY_CHANGE_BLOCKED");
    if (input.browserRole || input.userMetadataRole || input.emailRole) reasons.push("CLIENT_SUPPLIED_AUTHORITY_BLOCKED");
    if (input.routeDashboard === true) reasons.push("DASHBOARD_ROUTING_DEFERRED");
    if (input.liveSupabase === true || input.enableAuth === true) reasons.push("LIVE_SUPABASE_OR_AUTH_ACTIVATION_BLOCKED");

    return Object.freeze({
      buildId: BUILD_ID,
      result: reasons.length === 0 ? "SAFE_READ_ONLY_REQUEST" : BLOCKED,
      allowed: reasons.length === 0,
      failureReasons: reasons,
      authorityGranted: false,
      membershipCreatedOrChanged: false,
      mutationPerformed: false,
      dataWritten: false
    });
  }

  function getContract() {
    return clone(CONTRACT);
  }

  global.AAB_PROTECTED_MEMBERSHIP_AUTHORITY_RESOLVER_03 = Object.freeze({
    buildId: BUILD_ID,
    version: VERSION,
    getContract: getContract,
    validateContract: validateContract,
    resolveSyntheticAuthority: resolveSyntheticAuthority,
    checkSafeRequest: checkSafeRequest
  });
})(window);
