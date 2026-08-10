(function (global) {
  "use strict";

  var BUILD_ID = "ID-06";
  var VERSION = "1.0.0";
  var PASS = "PASS_READY_READ_ONLY";
  var BLOCKED = "BLOCKED_OPERATIONAL_REQUEST";

  var CONTRACT = Object.freeze({
    buildId: BUILD_ID,
    contractName: "AAB Protected Dashboard Context Projection Contract",
    version: VERSION,
    status: PASS,
    classification: Object.freeze([
      "READ_ONLY", "FAIL_CLOSED", "SYNTHETIC_VALIDATION_ONLY",
      "TRUSTED_ID_05_DECISION_REQUIRED", "EXACT_CONTEXT_PROJECTION",
      "CLIENT_OVERRIDE_BLOCKED", "NO_BROWSER_NAVIGATION",
      "NO_SESSION_CREATION", "NO_TOKEN_ISSUANCE", "NO_DATA_QUERY",
      "NO_AUTHORITY_GRANT", "NO_DATABASE_WRITE", "NO_AUTH_ACTIVATION"
    ]),
    purpose: "Project one trusted ID-05 access decision into an immutable read-only dashboard context without accepting client overrides, navigating, querying data, creating credentials, granting authority, or changing state.",
    dependencies: Object.freeze({
      requiredBuild: "ID-05",
      requiredNamespace: "AAB_TRUSTED_DASHBOARD_ACCESS_DECISION_05",
      requiredResult: PASS
    }),
    doctrine: Object.freeze({
      trustedId05AccessDecisionIsRequired: true,
      exactActorRoleRouteAndScopeArePreserved: true,
      projectionNeverCreatesOrExpandsAuthority: true,
      clientContextOverridesFailClosed: true,
      deniedOrMalformedAccessProducesNoContext: true,
      contextIsImmutableAndRenderOnly: true,
      projectionNeverNavigatesOrQueriesData: true,
      sessionTokenCookieAndAuthActivationAreDeferred: true,
      databaseWritesAreProhibited: true
    }),
    allowedActions: Object.freeze([
      "GET_CONTRACT", "VALIDATE_CONTRACT", "PROJECT_SYNTHETIC_CONTEXT", "CHECK_CONTEXT_COMPATIBILITY"
    ]),
    prohibitedActions: Object.freeze([
      "NAVIGATE_BROWSER", "REDIRECT_USER", "QUERY_DATA", "FETCH_RECORDS",
      "CREATE_SESSION", "ISSUE_TOKEN", "SET_AUTH_COOKIE", "GRANT_ROLE",
      "CREATE_MEMBERSHIP", "WRITE_DATABASE", "ENABLE_AUTH"
    ]),
    nextAllowedBuild: "ID-07"
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalise(value) { return String(value || "").trim(); }
  function upper(value) { return normalise(value).toUpperCase(); }

  function dependencyStatus() {
    var dependency = global.AAB_TRUSTED_DASHBOARD_ACCESS_DECISION_05;
    var validation = dependency && typeof dependency.validateContract === "function" ? dependency.validateContract() : null;
    return Object.freeze({
      exists: Boolean(dependency),
      result: validation ? validation.result : "MISSING",
      ready: Boolean(validation && validation.result === CONTRACT.dependencies.requiredResult && validation.ready === true)
    });
  }

  function validateContract() {
    var failures = [];
    var dependency = dependencyStatus();
    if (!dependency.exists) failures.push("ID_05_DEPENDENCY_MISSING");
    if (dependency.exists && !dependency.ready) failures.push("ID_05_NOT_READY_READ_ONLY");
    if (CONTRACT.status !== PASS) failures.push("STATUS_NOT_READ_ONLY_READY");
    if (CONTRACT.doctrine.trustedId05AccessDecisionIsRequired !== true) failures.push("TRUSTED_ACCESS_DECISION_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.exactActorRoleRouteAndScopeArePreserved !== true) failures.push("EXACT_CONTEXT_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.clientContextOverridesFailClosed !== true) failures.push("CLIENT_OVERRIDE_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.projectionNeverNavigatesOrQueriesData !== true) failures.push("NO_OPERATIONAL_ACCESS_BOUNDARY_MISSING");
    return Object.freeze({
      buildId: BUILD_ID,
      version: VERSION,
      result: failures.length ? "FAIL_CLOSED" : PASS,
      ready: failures.length === 0,
      failureReasons: failures,
      dependency: dependency,
      mode: "READ_ONLY_SYNTHETIC_PROTECTED_DASHBOARD_CONTEXT_PROJECTION",
      nextAllowedBuild: failures.length ? null : CONTRACT.nextAllowedBuild
    });
  }

  function projectSyntheticContext(request) {
    var input = request && typeof request === "object" ? request : {};
    var decisionResult = input.accessResult && typeof input.accessResult === "object" ? input.accessResult : {};
    var decision = decisionResult.accessDecision && typeof decisionResult.accessDecision === "object" ? decisionResult.accessDecision : {};
    var reasons = [];

    if (decisionResult.buildId !== "ID-05") reasons.push("ID_05_ACCESS_RESULT_REQUIRED");
    if (decisionResult.result !== "TRUSTED_DASHBOARD_ACCESS_ALLOWED_READ_ONLY" || decisionResult.allowed !== true) reasons.push("TRUSTED_ACCESS_NOT_ALLOWED");
    if (decisionResult.syntheticOnly !== true) reasons.push("NON_SYNTHETIC_ACCESS_RESULT_BLOCKED");
    if (decisionResult.authorityGranted === true || decisionResult.navigationPerformed === true || decisionResult.sessionCreated === true || decisionResult.tokenIssued === true || decisionResult.mutationPerformed === true || decisionResult.dataWritten === true) {
      reasons.push("OPERATIONAL_OR_MUTATED_ACCESS_RESULT_BLOCKED");
    }
    if (upper(decision.decisionSource) !== "PROTECTED_ID_04_ROUTE_PLAN") reasons.push("NON_CANONICAL_ACCESS_DECISION_SOURCE_BLOCKED");

    var overrideKeys = [
      "actorId", "dashboardId", "path", "roleCode", "scopeType", "scopeId",
      "countryId", "institutionId", "domainId", "requestedPath", "returnUrl"
    ];
    if (overrideKeys.some(function (key) { return Object.prototype.hasOwnProperty.call(input, key); })) {
      reasons.push("CLIENT_SUPPLIED_CONTEXT_OVERRIDE_BLOCKED");
    }

    var actorId = normalise(decision.actorId);
    var dashboardId = upper(decision.dashboardId);
    var path = normalise(decision.path);
    var roleCode = upper(decision.roleCode);
    var scopeType = upper(decision.scopeType);
    var scopeId = normalise(decision.scopeId);
    var countryId = normalise(decision.countryId);
    var institutionId = normalise(decision.institutionId);
    var domainId = normalise(decision.domainId);

    if (!actorId || !dashboardId || !path || path.charAt(0) !== "/" || !roleCode || !scopeType || !scopeId) reasons.push("MALFORMED_TRUSTED_ACCESS_DECISION");
    if (decision.navigationPerformed === true || decision.sessionCreated === true || decision.tokenIssued === true) reasons.push("OPERATIONAL_ACCESS_DECISION_BLOCKED");
    if (scopeType === "COUNTRY" && countryId !== scopeId) reasons.push("COUNTRY_SCOPE_MISMATCH");
    if (scopeType === "INSTITUTION" && institutionId !== scopeId) reasons.push("INSTITUTION_SCOPE_MISMATCH");
    if (scopeType === "DOMAIN" && domainId !== scopeId) reasons.push("DOMAIN_SCOPE_MISMATCH");

    reasons = reasons.filter(function (reason, index, all) { return all.indexOf(reason) === index; });
    var projected = reasons.length === 0;

    return Object.freeze({
      buildId: BUILD_ID,
      result: projected ? "PROTECTED_DASHBOARD_CONTEXT_PROJECTED_READ_ONLY" : "DASHBOARD_CONTEXT_PROJECTION_DENIED",
      projected: projected,
      failureReasons: reasons,
      dashboardContext: projected ? Object.freeze({
        actorId: actorId,
        dashboardId: dashboardId,
        path: path,
        roleCode: roleCode,
        scopeType: scopeType,
        scopeId: scopeId,
        countryId: countryId || null,
        institutionId: institutionId || null,
        domainId: domainId || null,
        contextSource: "TRUSTED_ID_05_ACCESS_DECISION",
        renderOnly: true,
        immutable: true
      }) : null,
      authorityGranted: false,
      navigationPerformed: false,
      dataQueried: false,
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
    if (input.queryData === true || input.fetchRecords === true || input.apiRequest === true) reasons.push("DATA_QUERY_BLOCKED");
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
      dataQueried: false,
      sessionCreated: false,
      tokenIssued: false,
      mutationPerformed: false,
      dataWritten: false
    });
  }

  function getContract() { return clone(CONTRACT); }

  global.AAB_PROTECTED_DASHBOARD_CONTEXT_PROJECTION_06 = Object.freeze({
    buildId: BUILD_ID,
    version: VERSION,
    getContract: getContract,
    validateContract: validateContract,
    projectSyntheticContext: projectSyntheticContext,
    checkSafeRequest: checkSafeRequest
  });
})(window);
