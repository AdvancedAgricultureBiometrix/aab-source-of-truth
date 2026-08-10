(function (global) {
  "use strict";

  var BUILD_ID = "ID-07";
  var VERSION = "1.0.0";
  var PASS = "PASS_READY_READ_ONLY";
  var BLOCKED = "BLOCKED_OPERATIONAL_REQUEST";

  var CONTRACT = Object.freeze({
    buildId: BUILD_ID,
    contractName: "AAB Protected Dashboard Read Request Envelope Contract",
    version: VERSION,
    status: PASS,
    classification: Object.freeze([
      "READ_ONLY", "FAIL_CLOSED", "SYNTHETIC_VALIDATION_ONLY",
      "TRUSTED_ID_06_CONTEXT_REQUIRED", "EXACT_SCOPE_BINDING",
      "SERVER_DEFINED_RESOURCE_REGISTRY", "CLIENT_SCOPE_OVERRIDE_BLOCKED",
      "REQUEST_ENVELOPE_ONLY", "NO_QUERY_EXECUTION", "NO_API_CALL",
      "NO_BROWSER_NAVIGATION", "NO_SESSION_CREATION", "NO_TOKEN_ISSUANCE",
      "NO_AUTHORITY_GRANT", "NO_DATABASE_WRITE", "NO_AUTH_ACTIVATION"
    ]),
    purpose: "Convert one trusted ID-06 dashboard context and one server-defined resource descriptor into an immutable scope-bound read request envelope without executing a query, calling an API, fetching records, navigating, granting authority, or changing state.",
    dependencies: Object.freeze({
      requiredBuild: "ID-06",
      requiredNamespace: "AAB_PROTECTED_DASHBOARD_CONTEXT_PROJECTION_06",
      requiredResult: PASS
    }),
    doctrine: Object.freeze({
      trustedId06ContextIsRequired: true,
      resourceMustComeFromServerDefinedRegistry: true,
      actorRoleDashboardRouteAndScopeArePreserved: true,
      envelopeNeverCreatesOrExpandsAuthority: true,
      clientScopeFilterAndResourceOverridesFailClosed: true,
      malformedOrDeniedContextProducesNoEnvelope: true,
      envelopeIsImmutableAndNonExecutable: true,
      contractNeverQueriesCallsApisOrFetchesRecords: true,
      sessionTokenCookieAndAuthActivationAreDeferred: true,
      databaseWritesAreProhibited: true
    }),
    allowedActions: Object.freeze([
      "GET_CONTRACT", "VALIDATE_CONTRACT",
      "CREATE_SYNTHETIC_READ_ENVELOPE", "CHECK_READ_ENVELOPE_COMPATIBILITY"
    ]),
    prohibitedActions: Object.freeze([
      "EXECUTE_QUERY", "QUERY_DATA", "FETCH_RECORDS", "CALL_API",
      "NAVIGATE_BROWSER", "REDIRECT_USER", "CREATE_SESSION", "ISSUE_TOKEN",
      "SET_AUTH_COOKIE", "GRANT_ROLE", "CREATE_MEMBERSHIP",
      "WRITE_DATABASE", "ENABLE_AUTH"
    ]),
    nextAllowedBuild: "ID-08"
  });

  var RESOURCE_REGISTRY = Object.freeze({
    SCIENTIST_WORKSPACE_SUMMARY: Object.freeze({
      resourceId: "SCIENTIST_WORKSPACE_SUMMARY",
      resourceType: "DASHBOARD_SUMMARY",
      dashboardId: "SCIENTIST_WORKSPACE",
      allowedRoles: Object.freeze(["SCIENTIST"]),
      allowedScopeTypes: Object.freeze(["INSTITUTION"]),
      readModel: "SCIENTIST_INSTITUTION_SUMMARY",
      projection: Object.freeze([
        "FORMULATION_SUMMARY", "TRIAL_SUMMARY",
        "PLOT_SUMMARY", "OBSERVATION_SUMMARY"
      ])
    })
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalise(value) { return String(value || "").trim(); }
  function upper(value) { return normalise(value).toUpperCase(); }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }

  function dependencyStatus() {
    var dependency = global.AAB_PROTECTED_DASHBOARD_CONTEXT_PROJECTION_06;
    var validation = dependency && typeof dependency.validateContract === "function"
      ? dependency.validateContract()
      : null;
    return Object.freeze({
      exists: Boolean(dependency),
      result: validation ? validation.result : "MISSING",
      ready: Boolean(
        validation &&
        validation.result === CONTRACT.dependencies.requiredResult &&
        validation.ready === true
      )
    });
  }

  function validateContract() {
    var failures = [];
    var dependency = dependencyStatus();
    if (!dependency.exists) failures.push("ID_06_DEPENDENCY_MISSING");
    if (dependency.exists && !dependency.ready) failures.push("ID_06_NOT_READY_READ_ONLY");
    if (CONTRACT.status !== PASS) failures.push("STATUS_NOT_READ_ONLY_READY");
    if (CONTRACT.doctrine.trustedId06ContextIsRequired !== true) failures.push("TRUSTED_CONTEXT_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.resourceMustComeFromServerDefinedRegistry !== true) failures.push("SERVER_RESOURCE_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.clientScopeFilterAndResourceOverridesFailClosed !== true) failures.push("CLIENT_OVERRIDE_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.contractNeverQueriesCallsApisOrFetchesRecords !== true) failures.push("NO_QUERY_EXECUTION_BOUNDARY_MISSING");
    return Object.freeze({
      buildId: BUILD_ID,
      version: VERSION,
      result: failures.length ? "FAIL_CLOSED" : PASS,
      ready: failures.length === 0,
      failureReasons: failures,
      dependency: dependency,
      mode: "READ_ONLY_SYNTHETIC_PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE",
      nextAllowedBuild: failures.length ? null : CONTRACT.nextAllowedBuild
    });
  }

  function createSyntheticReadEnvelope(request) {
    var input = request && typeof request === "object" ? request : {};
    var contextResult = input.contextResult && typeof input.contextResult === "object"
      ? input.contextResult
      : {};
    var context = contextResult.dashboardContext &&
      typeof contextResult.dashboardContext === "object"
      ? contextResult.dashboardContext
      : {};
    var resourceId = upper(input.resourceId);
    var resource = RESOURCE_REGISTRY[resourceId] || null;
    var reasons = [];

    if (contextResult.buildId !== "ID-06") reasons.push("ID_06_CONTEXT_RESULT_REQUIRED");
    if (
      contextResult.result !== "PROTECTED_DASHBOARD_CONTEXT_PROJECTED_READ_ONLY" ||
      contextResult.projected !== true
    ) reasons.push("TRUSTED_DASHBOARD_CONTEXT_NOT_PROJECTED");
    if (contextResult.syntheticOnly !== true) reasons.push("NON_SYNTHETIC_CONTEXT_BLOCKED");
    if (
      contextResult.authorityGranted === true ||
      contextResult.navigationPerformed === true ||
      contextResult.dataQueried === true ||
      contextResult.sessionCreated === true ||
      contextResult.tokenIssued === true ||
      contextResult.mutationPerformed === true ||
      contextResult.dataWritten === true
    ) reasons.push("OPERATIONAL_OR_MUTATED_CONTEXT_BLOCKED");
    if (
      upper(context.contextSource) !== "TRUSTED_ID_05_ACCESS_DECISION" ||
      context.renderOnly !== true ||
      context.immutable !== true
    ) reasons.push("NON_CANONICAL_ID_06_CONTEXT_BLOCKED");

    var overrideKeys = [
      "actorId", "dashboardId", "path", "roleCode", "scopeType", "scopeId",
      "countryId", "institutionId", "domainId", "filters", "where", "query",
      "table", "view", "endpoint", "requestedPath", "returnUrl",
      "limit", "offset", "sort", "fields", "projection"
    ];
    if (overrideKeys.some(function (key) { return own(input, key); })) {
      reasons.push("CLIENT_SUPPLIED_READ_SCOPE_OR_QUERY_OVERRIDE_BLOCKED");
    }

    if (!resourceId) reasons.push("RESOURCE_ID_REQUIRED");
    if (!resource) reasons.push("RESOURCE_NOT_IN_SERVER_DEFINED_REGISTRY");

    var actorId = normalise(context.actorId);
    var dashboardId = upper(context.dashboardId);
    var path = normalise(context.path);
    var roleCode = upper(context.roleCode);
    var scopeType = upper(context.scopeType);
    var scopeId = normalise(context.scopeId);
    var countryId = normalise(context.countryId);
    var institutionId = normalise(context.institutionId);
    var domainId = normalise(context.domainId);

    if (!actorId || !dashboardId || !path || path.charAt(0) !== "/" || !roleCode || !scopeType || !scopeId) {
      reasons.push("MALFORMED_TRUSTED_DASHBOARD_CONTEXT");
    }
    if (scopeType === "COUNTRY" && countryId !== scopeId) reasons.push("COUNTRY_SCOPE_MISMATCH");
    if (scopeType === "INSTITUTION" && institutionId !== scopeId) reasons.push("INSTITUTION_SCOPE_MISMATCH");
    if (scopeType === "DOMAIN" && domainId !== scopeId) reasons.push("DOMAIN_SCOPE_MISMATCH");

    if (resource) {
      if (resource.dashboardId !== dashboardId) reasons.push("RESOURCE_DASHBOARD_MISMATCH");
      if (!resource.allowedRoles.includes(roleCode)) reasons.push("RESOURCE_ROLE_NOT_ALLOWED");
      if (!resource.allowedScopeTypes.includes(scopeType)) reasons.push("RESOURCE_SCOPE_TYPE_NOT_ALLOWED");
    }

    reasons = reasons.filter(function (reason, index, all) {
      return all.indexOf(reason) === index;
    });
    var created = reasons.length === 0;

    return Object.freeze({
      buildId: BUILD_ID,
      result: created
        ? "PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE_CREATED"
        : "DASHBOARD_READ_REQUEST_ENVELOPE_DENIED",
      created: created,
      failureReasons: reasons,
      readEnvelope: created ? Object.freeze({
        requestKind: "READ_ONLY_DASHBOARD_RESOURCE_REQUEST",
        actorId: actorId,
        dashboardId: dashboardId,
        path: path,
        roleCode: roleCode,
        scope: Object.freeze({
          scopeType: scopeType,
          scopeId: scopeId,
          countryId: countryId || null,
          institutionId: institutionId || null,
          domainId: domainId || null
        }),
        resource: Object.freeze(clone(resource)),
        contextSource: "PROTECTED_ID_06_DASHBOARD_CONTEXT",
        resourceSource: "SERVER_DEFINED_RESOURCE_REGISTRY",
        readOnly: true,
        executable: false,
        immutable: true
      }) : null,
      authorityGranted: false,
      navigationPerformed: false,
      apiCalled: false,
      queryExecuted: false,
      dataQueried: false,
      recordsFetched: false,
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
    if (input.executeQuery === true || input.queryData === true || input.fetchRecords === true) reasons.push("QUERY_OR_FETCH_EXECUTION_BLOCKED");
    if (input.callApi === true || input.apiRequest === true || input.endpointRequest === true) reasons.push("API_CALL_BLOCKED");
    if (input.navigate === true || input.redirect === true || input.locationChange === true) reasons.push("BROWSER_NAVIGATION_BLOCKED");
    if (input.createSession === true || input.issueToken === true || input.setAuthCookie === true) reasons.push("SESSION_OR_CREDENTIAL_CREATION_BLOCKED");
    if (input.grantRole === true || input.createMembership === true) reasons.push("AUTHORITY_OR_MEMBERSHIP_CHANGE_BLOCKED");
    if (input.write === true || input.mutate === true || input.persist === true) reasons.push("WRITE_OR_MUTATION_BLOCKED");
    if (input.liveSupabase === true || input.liveAirtable === true || input.enableAuth === true) reasons.push("LIVE_DATA_SOURCE_OR_AUTH_ACTIVATION_BLOCKED");
    return Object.freeze({
      buildId: BUILD_ID,
      result: reasons.length ? BLOCKED : "SAFE_READ_ONLY_REQUEST",
      allowed: reasons.length === 0,
      failureReasons: reasons,
      authorityGranted: false,
      navigationPerformed: false,
      apiCalled: false,
      queryExecuted: false,
      dataQueried: false,
      recordsFetched: false,
      sessionCreated: false,
      tokenIssued: false,
      mutationPerformed: false,
      dataWritten: false
    });
  }

  function getContract() { return clone(CONTRACT); }
  function getResourceRegistry() { return clone(RESOURCE_REGISTRY); }

  global.AAB_PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE_07 = Object.freeze({
    buildId: BUILD_ID,
    version: VERSION,
    getContract: getContract,
    getResourceRegistry: getResourceRegistry,
    validateContract: validateContract,
    createSyntheticReadEnvelope: createSyntheticReadEnvelope,
    checkSafeRequest: checkSafeRequest
  });
})(window);
