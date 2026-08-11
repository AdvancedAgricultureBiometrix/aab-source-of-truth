(function (global) {
  "use strict";

  var BUILD_ID = "ID-09";
  var VERSION = "1.0.0";
  var PASS = "PASS_READY_READ_ONLY";
  var BLOCKED = "BLOCKED_OPERATIONAL_REQUEST";

  var CONTRACT = Object.freeze({
    buildId: BUILD_ID,
    contractName: "AAB Protected Dashboard Read Adapter Handoff Contract",
    version: VERSION,
    status: PASS,
    classification: Object.freeze([
      "READ_ONLY", "FAIL_CLOSED", "SYNTHETIC_VALIDATION_ONLY",
      "TRUSTED_ID_08_DECISION_REQUIRED", "SERVER_DEFINED_ADAPTER_REGISTRY",
      "EXACT_DECISION_HANDOFF_MATCH", "CLIENT_ADAPTER_OVERRIDE_BLOCKED",
      "HANDOFF_ONLY", "NO_QUERY_PLAN", "NO_QUERY_EXECUTION",
      "NO_RECORD_FETCH", "NO_API_CALL", "NO_BROWSER_NAVIGATION",
      "NO_SESSION_CREATION", "NO_TOKEN_ISSUANCE", "NO_AUTHORITY_GRANT",
      "NO_DATABASE_WRITE", "NO_AUTH_ACTIVATION"
    ]),
    purpose: "Convert one trusted allowed ID-08 compatibility decision into one immutable, non-executable handoff descriptor for a future protected server read adapter without exposing query details or performing any operation.",
    dependencies: Object.freeze({
      requiredBuild: "ID-08",
      requiredNamespace: "AAB_PROTECTED_DASHBOARD_READ_POLICY_DECISION_08",
      requiredResult: PASS
    }),
    doctrine: Object.freeze({
      trustedAllowedId08DecisionIsRequired: true,
      adapterMustComeFromServerDefinedRegistry: true,
      actorDashboardRoleScopeResourcePolicyAndProjectionArePreserved: true,
      handoffNeverCreatesOrExpandsAuthority: true,
      clientAdapterScopeQueryAndExecutionOverridesFailClosed: true,
      malformedDeniedExecutableOrOperationalDecisionFailsClosed: true,
      handoffIsImmutableAndNonExecutable: true,
      handoffContainsNoTableEndpointSqlFiltersCredentialsOrQueryPlan: true,
      contractNeverQueriesFetchesRecordsOrCallsApis: true,
      databaseWritesAndAuthActivationAreProhibited: true
    }),
    allowedActions: Object.freeze([
      "GET_CONTRACT", "VALIDATE_CONTRACT", "CREATE_SYNTHETIC_ADAPTER_HANDOFF"
    ]),
    prohibitedActions: Object.freeze([
      "BUILD_QUERY", "EXECUTE_QUERY", "QUERY_DATA", "FETCH_RECORDS",
      "CALL_API", "NAVIGATE_BROWSER", "CREATE_SESSION", "ISSUE_TOKEN",
      "SET_AUTH_COOKIE", "GRANT_ROLE", "CREATE_MEMBERSHIP",
      "WRITE_DATABASE", "ENABLE_AUTH"
    ]),
    nextAllowedBuild: "ID-10"
  });

  var ADAPTER_REGISTRY = Object.freeze({
    SCIENTIST_INSTITUTION_SUMMARY_READ_POLICY: Object.freeze({
      adapterId: "PROTECTED_SCIENTIST_SUMMARY_READ_ADAPTER",
      policyId: "SCIENTIST_INSTITUTION_SUMMARY_READ_POLICY",
      readModel: "SCIENTIST_INSTITUTION_SUMMARY",
      resourceId: "SCIENTIST_WORKSPACE_SUMMARY",
      dashboardId: "SCIENTIST_WORKSPACE",
      roleCode: "SCIENTIST",
      scopeType: "INSTITUTION",
      handoffMode: "SERVER_REBUILD_REQUIRED",
      executable: false
    })
  });

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalise(value) { return String(value || "").trim(); }
  function upper(value) { return normalise(value).toUpperCase(); }
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function unique(values) { return values.filter(function (v, i, all) { return all.indexOf(v) === i; }); }
  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.keys(value).forEach(function (key) { deepFreeze(value[key]); });
      Object.freeze(value);
    }
    return value;
  }

  function dependencyStatus() {
    var dependency = global.AAB_PROTECTED_DASHBOARD_READ_POLICY_DECISION_08;
    var validation = dependency && typeof dependency.validateContract === "function"
      ? dependency.validateContract() : null;
    return Object.freeze({
      exists: Boolean(dependency),
      result: validation ? validation.result : "MISSING",
      ready: Boolean(validation && validation.result === PASS && validation.ready === true)
    });
  }

  function validateContract() {
    var failures = [];
    var dependency = dependencyStatus();
    if (!dependency.exists) failures.push("ID_08_DEPENDENCY_MISSING");
    if (dependency.exists && !dependency.ready) failures.push("ID_08_NOT_READY_READ_ONLY");
    if (CONTRACT.status !== PASS) failures.push("STATUS_NOT_READ_ONLY_READY");
    if (!CONTRACT.doctrine.trustedAllowedId08DecisionIsRequired) failures.push("TRUSTED_DECISION_BOUNDARY_MISSING");
    if (!CONTRACT.doctrine.adapterMustComeFromServerDefinedRegistry) failures.push("SERVER_ADAPTER_BOUNDARY_MISSING");
    if (!CONTRACT.doctrine.handoffContainsNoTableEndpointSqlFiltersCredentialsOrQueryPlan) failures.push("NO_QUERY_DETAIL_BOUNDARY_MISSING");
    if (!CONTRACT.doctrine.contractNeverQueriesFetchesRecordsOrCallsApis) failures.push("NO_EXECUTION_BOUNDARY_MISSING");
    return Object.freeze({
      buildId: BUILD_ID, version: VERSION,
      result: failures.length ? "FAIL_CLOSED" : PASS,
      ready: failures.length === 0, failureReasons: failures,
      dependency: dependency,
      mode: "READ_ONLY_SYNTHETIC_PROTECTED_DASHBOARD_READ_ADAPTER_HANDOFF",
      nextAllowedBuild: failures.length ? null : CONTRACT.nextAllowedBuild
    });
  }

  function createSyntheticAdapterHandoff(request) {
    var input = request && typeof request === "object" ? request : {};
    var decisionResult = input.decisionResult && typeof input.decisionResult === "object"
      ? input.decisionResult : {};
    var decision = decisionResult.readDecision && typeof decisionResult.readDecision === "object"
      ? decisionResult.readDecision : {};
    var scope = decision.scope && typeof decision.scope === "object" ? decision.scope : {};
    var policyId = upper(decision.policyId);
    var adapter = ADAPTER_REGISTRY[policyId] || null;
    var reasons = [];

    if (decisionResult.buildId !== "ID-08") reasons.push("ID_08_POLICY_DECISION_RESULT_REQUIRED");
    if (decisionResult.result !== "PROTECTED_DASHBOARD_READ_POLICY_ALLOWED_READ_ONLY" || decisionResult.allowed !== true) reasons.push("TRUSTED_ALLOWED_POLICY_DECISION_REQUIRED");
    if (decisionResult.syntheticOnly !== true) reasons.push("NON_SYNTHETIC_DECISION_BLOCKED");
    if (decisionResult.authorityGranted === true || decisionResult.navigationPerformed === true ||
        decisionResult.apiCalled === true || decisionResult.queryExecuted === true ||
        decisionResult.dataQueried === true || decisionResult.recordsFetched === true ||
        decisionResult.sessionCreated === true || decisionResult.tokenIssued === true ||
        decisionResult.mutationPerformed === true || decisionResult.dataWritten === true) {
      reasons.push("OPERATIONAL_OR_MUTATED_POLICY_DECISION_BLOCKED");
    }
    if (upper(decision.decisionKind) !== "READ_COMPATIBILITY_DECISION_ONLY" ||
        upper(decision.effect) !== "ALLOW_READ_COMPATIBILITY_ONLY" ||
        upper(decision.policySource) !== "SERVER_DEFINED_READ_POLICY_REGISTRY" ||
        decision.readOnly !== true || decision.executable !== false || decision.immutable !== true) {
      reasons.push("NON_CANONICAL_ID_08_DECISION_BLOCKED");
    }

    var overrideKeys = [
      "adapterId", "adapter", "policyId", "readModel", "resourceId", "actorId",
      "dashboardId", "roleCode", "scope", "scopeType", "scopeId", "projection",
      "query", "queryPlan", "sql", "table", "view", "endpoint", "filters",
      "where", "fields", "credentials", "token", "execute", "allow"
    ];
    if (overrideKeys.some(function (key) { return own(input, key); })) {
      reasons.push("CLIENT_SUPPLIED_ADAPTER_SCOPE_QUERY_OR_EXECUTION_OVERRIDE_BLOCKED");
    }

    var actorId = normalise(decision.actorId);
    var dashboardId = upper(decision.dashboardId);
    var roleCode = upper(decision.roleCode);
    var scopeType = upper(scope.scopeType);
    var scopeId = normalise(scope.scopeId);
    var resourceId = upper(decision.resourceId);
    var readModel = upper(decision.readModel);
    var projection = Array.isArray(decision.projection) ? decision.projection.map(upper) : [];
    if (!actorId || !dashboardId || !roleCode || !scopeType || !scopeId || !resourceId || !readModel || !policyId || !projection.length) reasons.push("MALFORMED_TRUSTED_POLICY_DECISION");
    if (!adapter) reasons.push("POLICY_NOT_IN_SERVER_DEFINED_ADAPTER_REGISTRY");
    if (adapter) {
      if (adapter.executable !== false || adapter.handoffMode !== "SERVER_REBUILD_REQUIRED") reasons.push("EXECUTABLE_OR_INVALID_ADAPTER_BLOCKED");
      if (adapter.policyId !== policyId || adapter.readModel !== readModel || adapter.resourceId !== resourceId ||
          adapter.dashboardId !== dashboardId || adapter.roleCode !== roleCode || adapter.scopeType !== scopeType) {
        reasons.push("ADAPTER_DECISION_MISMATCH");
      }
    }

    reasons = unique(reasons);
    var created = reasons.length === 0;
    return deepFreeze({
      buildId: BUILD_ID,
      result: created ? "PROTECTED_READ_ADAPTER_HANDOFF_CREATED" : "PROTECTED_READ_ADAPTER_HANDOFF_DENIED",
      created: created,
      failureReasons: reasons,
      adapterHandoff: created ? {
        handoffKind: "PROTECTED_SERVER_READ_ADAPTER_HANDOFF_ONLY",
        adapterId: adapter.adapterId,
        handoffMode: "SERVER_REBUILD_REQUIRED",
        actorId: actorId,
        dashboardId: dashboardId,
        roleCode: roleCode,
        scope: clone(scope),
        resourceId: resourceId,
        readModel: readModel,
        projection: projection.slice(),
        policyId: policyId,
        decisionSource: "TRUSTED_ID_08_READ_POLICY_DECISION",
        adapterSource: "SERVER_DEFINED_ADAPTER_REGISTRY",
        containsQueryPlan: false,
        containsCredentials: false,
        readOnly: true,
        executable: false,
        immutable: true
      } : null,
      authorityGranted: false, navigationPerformed: false, apiCalled: false,
      queryBuilt: false, queryExecuted: false, dataQueried: false,
      recordsFetched: false, sessionCreated: false, tokenIssued: false,
      mutationPerformed: false, dataWritten: false, syntheticOnly: true
    });
  }

  function checkSafeRequest(request) {
    var input = request && typeof request === "object" ? request : {};
    var action = upper(input.action);
    var reasons = [];
    if (!CONTRACT.allowedActions.includes(action)) reasons.push("ACTION_NOT_ALLOWED_READ_ONLY");
    if (CONTRACT.prohibitedActions.includes(action)) reasons.push("OPERATIONAL_ACTION_BLOCKED");
    if (input.buildQuery === true || input.executeQuery === true || input.queryData === true || input.fetchRecords === true) reasons.push("QUERY_BUILD_OR_EXECUTION_BLOCKED");
    if (input.callApi === true || input.navigate === true) reasons.push("API_OR_NAVIGATION_BLOCKED");
    if (input.createSession === true || input.issueToken === true || input.setAuthCookie === true) reasons.push("SESSION_OR_CREDENTIAL_CREATION_BLOCKED");
    if (input.grantRole === true || input.createMembership === true) reasons.push("AUTHORITY_OR_MEMBERSHIP_CHANGE_BLOCKED");
    if (input.write === true || input.mutate === true || input.persist === true) reasons.push("WRITE_OR_MUTATION_BLOCKED");
    if (input.liveSupabase === true || input.liveAirtable === true || input.enableAuth === true) reasons.push("LIVE_DATA_SOURCE_OR_AUTH_ACTIVATION_BLOCKED");
    return Object.freeze({
      buildId: BUILD_ID, result: reasons.length ? BLOCKED : "SAFE_READ_ONLY_REQUEST",
      allowed: reasons.length === 0, failureReasons: reasons,
      authorityGranted: false, navigationPerformed: false, apiCalled: false,
      queryBuilt: false, queryExecuted: false, dataQueried: false,
      recordsFetched: false, sessionCreated: false, tokenIssued: false,
      mutationPerformed: false, dataWritten: false
    });
  }

  global.AAB_PROTECTED_DASHBOARD_READ_ADAPTER_HANDOFF_09 = Object.freeze({
    buildId: BUILD_ID, version: VERSION,
    getContract: function () { return clone(CONTRACT); },
    getAdapterRegistry: function () { return clone(ADAPTER_REGISTRY); },
    validateContract: validateContract,
    createSyntheticAdapterHandoff: createSyntheticAdapterHandoff,
    checkSafeRequest: checkSafeRequest
  });
})(window);
