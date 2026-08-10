(function (global) {
  "use strict";

  var BUILD_ID = "ID-05";
  var VERSION = "1.0.0";
  var PASS = "PASS_READY_READ_ONLY";
  var BLOCKED = "BLOCKED_OPERATIONAL_REQUEST";

  var CONTRACT = Object.freeze({
    buildId: BUILD_ID,
    contractName: "AAB Trusted Dashboard Access Decision Contract",
    version: VERSION,
    status: PASS,
    classification: Object.freeze([
      "READ_ONLY", "FAIL_CLOSED", "SYNTHETIC_VALIDATION_ONLY",
      "PROTECTED_ROUTE_PLAN_REQUIRED", "EXACT_SCOPE_MATCH_REQUIRED",
      "NO_BROWSER_NAVIGATION", "NO_SESSION_CREATION", "NO_TOKEN_ISSUANCE",
      "NO_AUTHORITY_GRANT", "NO_DATABASE_WRITE", "NO_AUTH_ACTIVATION"
    ]),
    purpose: "Convert an ID-04 protected route plan into a read-only dashboard access decision without navigating, creating a session, issuing credentials, granting authority, or changing data.",
    dependencies: Object.freeze({
      requiredBuild: "ID-04",
      requiredNamespace: "AAB_SCOPED_DASHBOARD_ROUTE_RESOLVER_04",
      requiredResult: PASS
    }),
    doctrine: Object.freeze({
      protectedRoutePlanIsRequired: true,
      routeSourceMustBeServerDefined: true,
      actorRoleAndScopeMustMatchExactly: true,
      decisionNeverCreatesAuthority: true,
      clientSuppliedAccessClaimsFailClosed: true,
      unknownAmbiguousOrDuplicateRouteFailsClosed: true,
      decisionReturnsVerdictButNeverNavigates: true,
      sessionTokenCookieAndAuthActivationAreDeferred: true,
      databaseWritesAreProhibited: true
    }),
    allowedActions: Object.freeze([
      "GET_CONTRACT", "VALIDATE_CONTRACT", "DECIDE_SYNTHETIC_ACCESS", "CHECK_ACCESS_COMPATIBILITY"
    ]),
    prohibitedActions: Object.freeze([
      "NAVIGATE_BROWSER", "REDIRECT_USER", "CREATE_SESSION", "ISSUE_TOKEN",
      "SET_AUTH_COOKIE", "GRANT_ROLE", "CREATE_MEMBERSHIP", "WRITE_DATABASE", "ENABLE_AUTH"
    ]),
    nextAllowedBuild: "ID-06"
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalise(value) { return String(value || "").trim(); }
  function upper(value) { return normalise(value).toUpperCase(); }

  function dependencyStatus() {
    var dependency = global.AAB_SCOPED_DASHBOARD_ROUTE_RESOLVER_04;
    var validation = dependency && typeof dependency.validateContract === "function" ? dependency.validateContract() : null;
    return Object.freeze({
      exists: Boolean(dependency),
      result: validation ? validation.result : "MISSING",
      ready: Boolean(validation && validation.result === CONTRACT.dependencies.requiredResult)
    });
  }

  function validateContract() {
    var failures = [];
    var dependency = dependencyStatus();
    if (!dependency.exists) failures.push("ID_04_DEPENDENCY_MISSING");
    if (dependency.exists && !dependency.ready) failures.push("ID_04_NOT_READY_READ_ONLY");
    if (CONTRACT.status !== PASS) failures.push("STATUS_NOT_READ_ONLY_READY");
    if (CONTRACT.doctrine.protectedRoutePlanIsRequired !== true) failures.push("PROTECTED_ROUTE_PLAN_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.actorRoleAndScopeMustMatchExactly !== true) failures.push("EXACT_SCOPE_MATCH_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.clientSuppliedAccessClaimsFailClosed !== true) failures.push("CLIENT_ACCESS_CLAIM_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.decisionReturnsVerdictButNeverNavigates !== true) failures.push("NO_NAVIGATION_BOUNDARY_MISSING");
    return Object.freeze({
      buildId: BUILD_ID,
      version: VERSION,
      result: failures.length ? "FAIL_CLOSED" : PASS,
      ready: failures.length === 0,
      failureReasons: failures,
      dependency: dependency,
      mode: "READ_ONLY_SYNTHETIC_TRUSTED_DASHBOARD_ACCESS_DECISION",
      nextAllowedBuild: failures.length ? null : CONTRACT.nextAllowedBuild
    });
  }

  function decideSyntheticAccess(request) {
    var input = request && typeof request === "object" ? request : {};
    var routeContext = input.routeContext && typeof input.routeContext === "object" ? input.routeContext : {};
    var routes = Array.isArray(routeContext.routes) ? routeContext.routes : [];
    var reasons = [];
    var actorId = normalise(routeContext.actorId);

    if (!actorId) reasons.push("ACTOR_ID_REQUIRED");
    if (upper(routeContext.routeSource) !== "SERVER_DEFINED_ROUTE_REGISTRY") reasons.push("NON_CANONICAL_ROUTE_SOURCE_BLOCKED");
    if (routeContext.navigationPerformed === true) reasons.push("PRE_NAVIGATED_CONTEXT_BLOCKED");
    if (Number(routeContext.routeCount) !== routes.length || routes.length !== 1) reasons.push("EXACTLY_ONE_PROTECTED_ROUTE_REQUIRED");
    if (input.requestedPath || input.requestedDashboardId || input.claimedRole || input.claimedScope || input.returnUrl) {
      reasons.push("CLIENT_SUPPLIED_ACCESS_CLAIM_BLOCKED");
    }

    var route = routes.length === 1 ? routes[0] : {};
    var dashboardId = upper(route.dashboardId);
    var path = normalise(route.path);
    var roleCode = upper(route.roleCode);
    var scopeType = upper(route.scopeType);
    var scopeId = normalise(route.scopeId);

    if (!dashboardId || !path || path.charAt(0) !== "/" || !roleCode || !scopeType || !scopeId) {
      reasons.push("MALFORMED_PROTECTED_ROUTE");
    }
    if (scopeType === "COUNTRY" && normalise(route.countryId) !== scopeId) reasons.push("COUNTRY_SCOPE_MISMATCH");
    if (scopeType === "INSTITUTION" && normalise(route.institutionId) !== scopeId) reasons.push("INSTITUTION_SCOPE_MISMATCH");

    reasons = reasons.filter(function (reason, index, all) { return all.indexOf(reason) === index; });
    var allowed = reasons.length === 0;

    return Object.freeze({
      buildId: BUILD_ID,
      result: allowed ? "TRUSTED_DASHBOARD_ACCESS_ALLOWED_READ_ONLY" : "TRUSTED_DASHBOARD_ACCESS_DENIED",
      allowed: allowed,
      failureReasons: reasons,
      accessDecision: allowed ? Object.freeze({
        actorId: actorId,
        dashboardId: dashboardId,
        path: path,
        roleCode: roleCode,
        scopeType: scopeType,
        scopeId: scopeId,
        countryId: normalise(route.countryId) || null,
        institutionId: normalise(route.institutionId) || null,
        decisionSource: "PROTECTED_ID_04_ROUTE_PLAN",
        navigationPerformed: false,
        sessionCreated: false,
        tokenIssued: false
      }) : null,
      authorityGranted: false,
      navigationPerformed: false,
      sessionCreated: false,
      tokenIssued: false,
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
    if (input.navigate === true || input.redirect === true || input.locationChange === true) reasons.push("BROWSER_NAVIGATION_BLOCKED");
    if (input.requestedPath || input.requestedDashboardId || input.claimedRole || input.claimedScope || input.returnUrl) reasons.push("CLIENT_SUPPLIED_ACCESS_CLAIM_BLOCKED");
    if (input.createSession === true || input.issueToken === true || input.setAuthCookie === true) reasons.push("SESSION_OR_CREDENTIAL_CREATION_BLOCKED");
    if (input.grantRole === true || input.createMembership === true) reasons.push("AUTHORITY_OR_MEMBERSHIP_CHANGE_BLOCKED");
    if (input.write === true || input.mutate === true || input.persist === true) reasons.push("WRITE_OR_MUTATION_BLOCKED");
    if (input.liveSupabase === true || input.enableAuth === true) reasons.push("LIVE_SUPABASE_OR_AUTH_ACTIVATION_BLOCKED");
    return Object.freeze({
      buildId: BUILD_ID,
      result: reasons.length ? BLOCKED : "SAFE_READ_ONLY_REQUEST",
      allowed: reasons.length === 0,
      failureReasons: reasons,
      authorityGranted: false,
      navigationPerformed: false,
      sessionCreated: false,
      tokenIssued: false,
      mutationPerformed: false,
      dataWritten: false
    });
  }

  function getContract() { return clone(CONTRACT); }

  global.AAB_TRUSTED_DASHBOARD_ACCESS_DECISION_05 = Object.freeze({
    buildId: BUILD_ID,
    version: VERSION,
    getContract: getContract,
    validateContract: validateContract,
    decideSyntheticAccess: decideSyntheticAccess,
    checkSafeRequest: checkSafeRequest
  });
})(window);
