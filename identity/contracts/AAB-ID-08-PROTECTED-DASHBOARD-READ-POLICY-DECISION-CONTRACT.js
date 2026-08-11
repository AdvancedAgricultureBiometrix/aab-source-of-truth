(function (global) {
  "use strict";

  var BUILD_ID = "ID-08";
  var VERSION = "1.0.0";
  var PASS = "PASS_READY_READ_ONLY";
  var BLOCKED = "BLOCKED_OPERATIONAL_REQUEST";

  var CONTRACT = Object.freeze({
    buildId: BUILD_ID,
    contractName: "AAB Protected Dashboard Read Policy Decision Contract",
    version: VERSION,
    status: PASS,
    classification: Object.freeze([
      "READ_ONLY", "FAIL_CLOSED", "SYNTHETIC_VALIDATION_ONLY",
      "TRUSTED_ID_07_ENVELOPE_REQUIRED", "SERVER_DEFINED_POLICY_REGISTRY",
      "EXACT_ENVELOPE_POLICY_MATCH", "CLIENT_POLICY_OVERRIDE_BLOCKED",
      "DECISION_ONLY", "NO_QUERY_EXECUTION", "NO_RECORD_FETCH",
      "NO_API_CALL", "NO_BROWSER_NAVIGATION", "NO_SESSION_CREATION",
      "NO_TOKEN_ISSUANCE", "NO_AUTHORITY_GRANT", "NO_DATABASE_WRITE",
      "NO_AUTH_ACTIVATION"
    ]),
    purpose: "Evaluate one trusted ID-07 read-request envelope against one server-defined read policy and return an immutable, non-executable allow or deny decision without querying, fetching, calling an API, navigating, authenticating, granting authority, or changing state.",
    dependencies: Object.freeze({
      requiredBuild: "ID-07",
      requiredNamespace: "AAB_PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE_07",
      requiredResult: PASS
    }),
    doctrine: Object.freeze({
      trustedId07EnvelopeIsRequired: true,
      policyMustComeFromServerDefinedRegistry: true,
      actorDashboardRouteRoleScopeResourceAndProjectionArePreserved: true,
      decisionNeverCreatesOrExpandsAuthority: true,
      clientPolicyScopeQueryAndDecisionOverridesFailClosed: true,
      malformedDeniedExecutableOrOperationalEnvelopeFailsClosed: true,
      decisionIsImmutableAndNonExecutable: true,
      contractNeverQueriesFetchesRecordsOrCallsApis: true,
      sessionTokenCookieAndAuthActivationAreDeferred: true,
      databaseWritesAreProhibited: true
    }),
    allowedActions: Object.freeze([
      "GET_CONTRACT", "VALIDATE_CONTRACT",
      "DECIDE_SYNTHETIC_READ_POLICY", "CHECK_READ_POLICY_COMPATIBILITY"
    ]),
    prohibitedActions: Object.freeze([
      "EXECUTE_QUERY", "QUERY_DATA", "FETCH_RECORDS", "CALL_API",
      "NAVIGATE_BROWSER", "REDIRECT_USER", "CREATE_SESSION", "ISSUE_TOKEN",
      "SET_AUTH_COOKIE", "GRANT_ROLE", "CREATE_MEMBERSHIP",
      "WRITE_DATABASE", "ENABLE_AUTH"
    ]),
    nextAllowedBuild: "ID-09"
  });

  var POLICY_REGISTRY = Object.freeze({
    SCIENTIST_INSTITUTION_SUMMARY: Object.freeze({
      policyId: "SCIENTIST_INSTITUTION_SUMMARY_READ_POLICY",
      readModel: "SCIENTIST_INSTITUTION_SUMMARY",
      resourceId: "SCIENTIST_WORKSPACE_SUMMARY",
      resourceType: "DASHBOARD_SUMMARY",
      dashboardId: "SCIENTIST_WORKSPACE",
      allowedRoles: Object.freeze(["SCIENTIST"]),
      allowedScopeTypes: Object.freeze(["INSTITUTION"]),
      allowedProjection: Object.freeze([
        "FORMULATION_SUMMARY", "TRIAL_SUMMARY",
        "PLOT_SUMMARY", "OBSERVATION_SUMMARY"
      ]),
      effect: "ALLOW_READ_COMPATIBILITY_ONLY",
      executable: false
    })
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalise(value) { return String(value || "").trim(); }
  function upper(value) { return normalise(value).toUpperCase(); }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function unique(values) {
    return values.filter(function (value, index, all) { return all.indexOf(value) === index; });
  }

  function dependencyStatus() {
    var dependency = global.AAB_PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE_07;
    var validation = dependency && typeof dependency.validateContract === "function"
      ? dependency.validateContract()
      : null;
    return Object.freeze({
      exists: Boolean(dependency),
      result: validation ? validation.result : "MISSING",
      ready: Boolean(
        validation && validation.result === CONTRACT.dependencies.requiredResult &&
        validation.ready === true
      )
    });
  }

  function validateContract() {
    var failures = [];
    var dependency = dependencyStatus();
    if (!dependency.exists) failures.push("ID_07_DEPENDENCY_MISSING");
    if (dependency.exists && !dependency.ready) failures.push("ID_07_NOT_READY_READ_ONLY");
    if (CONTRACT.status !== PASS) failures.push("STATUS_NOT_READ_ONLY_READY");
    if (CONTRACT.doctrine.trustedId07EnvelopeIsRequired !== true) failures.push("TRUSTED_ENVELOPE_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.policyMustComeFromServerDefinedRegistry !== true) failures.push("SERVER_POLICY_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.clientPolicyScopeQueryAndDecisionOverridesFailClosed !== true) failures.push("CLIENT_OVERRIDE_BOUNDARY_MISSING");
    if (CONTRACT.doctrine.contractNeverQueriesFetchesRecordsOrCallsApis !== true) failures.push("NO_EXECUTION_BOUNDARY_MISSING");
    return Object.freeze({
      buildId: BUILD_ID,
      version: VERSION,
      result: failures.length ? "FAIL_CLOSED" : PASS,
      ready: failures.length === 0,
      failureReasons: failures,
      dependency: dependency,
      mode: "READ_ONLY_SYNTHETIC_PROTECTED_DASHBOARD_READ_POLICY_DECISION",
      nextAllowedBuild: failures.length ? null : CONTRACT.nextAllowedBuild
    });
  }

  function decideSyntheticReadPolicy(request) {
    var input = request && typeof request === "object" ? request : {};
    var envelopeResult = input.envelopeResult && typeof input.envelopeResult === "object"
      ? input.envelopeResult
      : {};
    var envelope = envelopeResult.readEnvelope && typeof envelopeResult.readEnvelope === "object"
      ? envelopeResult.readEnvelope
      : {};
    var scope = envelope.scope && typeof envelope.scope === "object" ? envelope.scope : {};
    var resource = envelope.resource && typeof envelope.resource === "object" ? envelope.resource : {};
    var readModel = upper(resource.readModel);
    var policy = POLICY_REGISTRY[readModel] || null;
    var reasons = [];

    if (envelopeResult.buildId !== "ID-07") reasons.push("ID_07_ENVELOPE_RESULT_REQUIRED");
    if (
      envelopeResult.result !== "PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE_CREATED" ||
      envelopeResult.created !== true
    ) reasons.push("TRUSTED_READ_ENVELOPE_NOT_CREATED");
    if (envelopeResult.syntheticOnly !== true) reasons.push("NON_SYNTHETIC_ENVELOPE_BLOCKED");
    if (
      envelopeResult.authorityGranted === true || envelopeResult.navigationPerformed === true ||
      envelopeResult.apiCalled === true || envelopeResult.queryExecuted === true ||
      envelopeResult.dataQueried === true || envelopeResult.recordsFetched === true ||
      envelopeResult.sessionCreated === true || envelopeResult.tokenIssued === true ||
      envelopeResult.mutationPerformed === true || envelopeResult.dataWritten === true
    ) reasons.push("OPERATIONAL_OR_MUTATED_ENVELOPE_RESULT_BLOCKED");
    if (
      upper(envelope.requestKind) !== "READ_ONLY_DASHBOARD_RESOURCE_REQUEST" ||
      upper(envelope.contextSource) !== "PROTECTED_ID_06_DASHBOARD_CONTEXT" ||
      upper(envelope.resourceSource) !== "SERVER_DEFINED_RESOURCE_REGISTRY" ||
      envelope.readOnly !== true || envelope.executable !== false || envelope.immutable !== true
    ) reasons.push("NON_CANONICAL_ID_07_ENVELOPE_BLOCKED");

    var overrideKeys = [
      "policyId", "readModel", "resourceId", "resourceType", "actorId",
      "dashboardId", "path", "roleCode", "scope", "scopeType", "scopeId",
      "countryId", "institutionId", "domainId", "projection", "filters",
      "where", "query", "table", "view", "endpoint", "allow", "effect",
      "decision", "execute", "limit", "offset", "sort", "fields"
    ];
    if (overrideKeys.some(function (key) { return own(input, key); })) {
      reasons.push("CLIENT_SUPPLIED_POLICY_SCOPE_QUERY_OR_DECISION_OVERRIDE_BLOCKED");
    }

    var actorId = normalise(envelope.actorId);
    var dashboardId = upper(envelope.dashboardId);
    var path = normalise(envelope.path);
    var roleCode = upper(envelope.roleCode);
    var scopeType = upper(scope.scopeType);
    var scopeId = normalise(scope.scopeId);
    var resourceId = upper(resource.resourceId);
    var resourceType = upper(resource.resourceType);
    var projection = Array.isArray(resource.projection) ? resource.projection.map(upper) : [];

    if (!actorId || !dashboardId || !path || path.charAt(0) !== "/" || !roleCode || !scopeType || !scopeId) {
      reasons.push("MALFORMED_TRUSTED_READ_ENVELOPE");
    }
    if (!resourceId || !resourceType || !readModel || !projection.length) reasons.push("MALFORMED_SERVER_RESOURCE_DESCRIPTOR");
    if (scopeType === "COUNTRY" && normalise(scope.countryId) !== scopeId) reasons.push("COUNTRY_SCOPE_MISMATCH");
    if (scopeType === "INSTITUTION" && normalise(scope.institutionId) !== scopeId) reasons.push("INSTITUTION_SCOPE_MISMATCH");
    if (scopeType === "DOMAIN" && normalise(scope.domainId) !== scopeId) reasons.push("DOMAIN_SCOPE_MISMATCH");
    if (!policy) reasons.push("READ_MODEL_NOT_IN_SERVER_DEFINED_POLICY_REGISTRY");

    if (policy) {
      if (policy.executable !== false) reasons.push("EXECUTABLE_POLICY_BLOCKED");
      if (policy.effect !== "ALLOW_READ_COMPATIBILITY_ONLY") reasons.push("NON_COMPATIBILITY_POLICY_EFFECT_BLOCKED");
      if (policy.readModel !== readModel) reasons.push("READ_MODEL_POLICY_MISMATCH");
      if (policy.resourceId !== resourceId) reasons.push("RESOURCE_POLICY_MISMATCH");
      if (policy.resourceType !== resourceType) reasons.push("RESOURCE_TYPE_POLICY_MISMATCH");
      if (policy.dashboardId !== dashboardId) reasons.push("DASHBOARD_POLICY_MISMATCH");
      if (!policy.allowedRoles.includes(roleCode)) reasons.push("ROLE_POLICY_MISMATCH");
      if (!policy.allowedScopeTypes.includes(scopeType)) reasons.push("SCOPE_TYPE_POLICY_MISMATCH");
      if (
        projection.length !== policy.allowedProjection.length ||
        projection.some(function (field) { return !policy.allowedProjection.includes(field); })
      ) reasons.push("PROJECTION_POLICY_MISMATCH");
    }

    reasons = unique(reasons);
    var allowed = reasons.length === 0;
    return Object.freeze({
      buildId: BUILD_ID,
      result: allowed
        ? "PROTECTED_DASHBOARD_READ_POLICY_ALLOWED_READ_ONLY"
        : "PROTECTED_DASHBOARD_READ_POLICY_DENIED",
      allowed: allowed,
      failureReasons: reasons,
      readDecision: allowed ? Object.freeze({
        decisionKind: "READ_COMPATIBILITY_DECISION_ONLY",
        effect: "ALLOW_READ_COMPATIBILITY_ONLY",
        actorId: actorId,
        dashboardId: dashboardId,
        path: path,
        roleCode: roleCode,
        scope: Object.freeze(clone(scope)),
        resourceId: resourceId,
        resourceType: resourceType,
        readModel: readModel,
        projection: Object.freeze(projection.slice()),
        policyId: policy.policyId,
        envelopeSource: "PROTECTED_ID_07_READ_REQUEST_ENVELOPE",
        policySource: "SERVER_DEFINED_READ_POLICY_REGISTRY",
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
    if (input.execute === true || input.executeQuery === true || input.queryData === true || input.fetchRecords === true) reasons.push("QUERY_OR_FETCH_EXECUTION_BLOCKED");
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
  function getPolicyRegistry() { return clone(POLICY_REGISTRY); }

  global.AAB_PROTECTED_DASHBOARD_READ_POLICY_DECISION_08 = Object.freeze({
    buildId: BUILD_ID,
    version: VERSION,
    getContract: getContract,
    getPolicyRegistry: getPolicyRegistry,
    validateContract: validateContract,
    decideSyntheticReadPolicy: decideSyntheticReadPolicy,
    checkSafeRequest: checkSafeRequest
  });
})(window);
