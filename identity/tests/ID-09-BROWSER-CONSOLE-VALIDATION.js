(async function AAB_ID_09_BROWSER_VALIDATION() {
  "use strict";
  function copy(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); } }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character];
    });
  }
  function block(title, value) {
    return "<section><h2>" + escapeHtml(title) + "</h2><pre>" +
      escapeHtml(JSON.stringify(copy(value), null, 2)) + "</pre></section>";
  }
  var bootstrap = window.AAB_GOVERNED_RUNTIME_BOOTSTRAP;
  var bootstrapValidation = bootstrap && bootstrap.validateContract ? await bootstrap.validateContract() : null;
  var id05 = window.AAB_TRUSTED_DASHBOARD_ACCESS_DECISION_05;
  var id06 = window.AAB_PROTECTED_DASHBOARD_CONTEXT_PROJECTION_06;
  var id07 = window.AAB_PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE_07;
  var id08 = window.AAB_PROTECTED_DASHBOARD_READ_POLICY_DECISION_08;
  var id09 = window.AAB_PROTECTED_DASHBOARD_READ_ADAPTER_HANDOFF_09;
  var contractExists = Boolean(id09);
  var validation = contractExists && id09.validateContract ? id09.validateContract() : null;
  var snapshot = contractExists && id09.getContract ? id09.getContract() : null;

  var access = id05 && id05.decideSyntheticAccess({ routeContext: {
    actorId: "actor-scientist-001", routeSource: "SERVER_DEFINED_ROUTE_REGISTRY",
    navigationPerformed: false, routeCount: 1, routes: [{
      dashboardId: "SCIENTIST_WORKSPACE", path: "/scientist/workspace", roleCode: "SCIENTIST",
      scopeType: "INSTITUTION", scopeId: "institution-aab-001", institutionId: "institution-aab-001"
    }]
  }});
  var projected = id06 && id06.projectSyntheticContext({ accessResult: access });
  var envelope = id07 && id07.createSyntheticReadEnvelope({
    contextResult: projected, resourceId: "SCIENTIST_WORKSPACE_SUMMARY"
  });
  var decision = id08 && id08.decideSyntheticReadPolicy({ envelopeResult: envelope });
  var handoff = id09 && id09.createSyntheticAdapterHandoff({ decisionResult: decision });
  var override = id09 && id09.createSyntheticAdapterHandoff({
    decisionResult: decision, adapterId: "CLIENT_ADAPTER"
  });
  var unknownInput = decision ? copy(decision) : {};
  if (unknownInput.readDecision) unknownInput.readDecision.policyId = "UNKNOWN_POLICY";
  var unknown = id09 && id09.createSyntheticAdapterHandoff({ decisionResult: unknownInput });
  var denied = id09 && id09.createSyntheticAdapterHandoff({ decisionResult: {
    buildId: "ID-08", result: "PROTECTED_DASHBOARD_READ_POLICY_DENIED",
    allowed: false, syntheticOnly: true
  }});
  var contaminatedInput = decision ? copy(decision) : {};
  contaminatedInput.queryExecuted = true;
  var contaminated = id09 && id09.createSyntheticAdapterHandoff({ decisionResult: contaminatedInput });
  var blocked = id09 && id09.checkSafeRequest({
    action: "EXECUTE_QUERY", buildQuery: true, executeQuery: true, fetchRecords: true,
    callApi: true, navigate: true, createSession: true, issueToken: true,
    grantRole: true, write: true, liveSupabase: true, liveAirtable: true, enableAuth: true
  });
  var directIdentityTags = Array.from(document.scripts).filter(function (script) {
    var src = script.getAttribute("src") || "";
    return /AAB-ID-0[1-9]-/i.test(src) && !script.dataset.aabGovernedSrc;
  }).map(function (script) { return script.getAttribute("src"); });
  var noOperations = [handoff, override, unknown, denied, contaminated, blocked].every(function (result) {
    return result && result.authorityGranted === false && result.navigationPerformed === false &&
      result.apiCalled === false && result.queryBuilt === false && result.queryExecuted === false &&
      result.dataQueried === false && result.recordsFetched === false &&
      result.sessionCreated === false && result.tokenIssued === false &&
      result.mutationPerformed === false && result.dataWritten === false;
  });
  var noQueryMaterial = Boolean(handoff && handoff.adapterHandoff &&
    handoff.adapterHandoff.containsQueryPlan === false &&
    handoff.adapterHandoff.containsCredentials === false &&
    !Object.prototype.hasOwnProperty.call(handoff.adapterHandoff, "sql") &&
    !Object.prototype.hasOwnProperty.call(handoff.adapterHandoff, "table") &&
    !Object.prototype.hasOwnProperty.call(handoff.adapterHandoff, "endpoint") &&
    !Object.prototype.hasOwnProperty.call(handoff.adapterHandoff, "filters"));
  var manifest = bootstrap && bootstrap.getManifest ? bootstrap.getManifest() : [];
  var finalGate = {
    buildId: "ID-09",
    passed: Boolean(
      contractExists && bootstrapValidation &&
      bootstrapValidation.result === "PASS_READY_READ_ONLY" &&
      bootstrapValidation.ready === true &&
      bootstrap && bootstrap.version === "1.4.0" &&
      manifest.map(function (item) { return item.buildId; }).join(",") ===
        "ID-01,ID-02,ID-03,ID-04,ID-05,ID-06,ID-07,ID-08,ID-09" &&
      validation && validation.result === "PASS_READY_READ_ONLY" && validation.ready === true &&
      access && access.allowed === true && projected && projected.projected === true &&
      envelope && envelope.created === true && decision && decision.allowed === true &&
      handoff && handoff.created === true && handoff.adapterHandoff &&
      handoff.adapterHandoff.executable === false &&
      Object.isFrozen(handoff) && Object.isFrozen(handoff.adapterHandoff) &&
      Object.isFrozen(handoff.adapterHandoff.scope) &&
      override && override.created === false &&
      override.failureReasons.includes("CLIENT_SUPPLIED_ADAPTER_SCOPE_QUERY_OR_EXECUTION_OVERRIDE_BLOCKED") &&
      unknown && unknown.created === false &&
      unknown.failureReasons.includes("POLICY_NOT_IN_SERVER_DEFINED_ADAPTER_REGISTRY") &&
      denied && denied.created === false && denied.adapterHandoff === null &&
      contaminated && contaminated.created === false &&
      contaminated.failureReasons.includes("OPERATIONAL_OR_MUTATED_POLICY_DECISION_BLOCKED") &&
      blocked && blocked.result === "BLOCKED_OPERATIONAL_REQUEST" && blocked.allowed === false &&
      noQueryMaterial && directIdentityTags.length === 0 && noOperations
    ),
    result: validation ? validation.result : "MISSING",
    nextBuildAfterFormalClosure: "ID-10",
    authorityGranted: false, navigationPerformed: false, apiCalled: false,
    queryBuilt: false, queryExecuted: false, recordsFetched: false,
    sessionCreated: false, tokenIssued: false, mutationPerformed: false, dataWritten: false
  };
  var sections = [
    ["Contract Exists", contractExists], ["Bootstrap Validation", bootstrapValidation],
    ["Manifest", manifest], ["Validation Result", validation], ["Contract Snapshot", snapshot],
    ["ID-05 Access Result", access], ["ID-06 Projection Result", projected],
    ["ID-07 Envelope Result", envelope], ["ID-08 Policy Decision", decision],
    ["ID-09 Safe Adapter Handoff", handoff], ["Client Override Check", override],
    ["Unknown Policy Check", unknown], ["Denied Decision Check", denied],
    ["Contaminated Decision Check", contaminated], ["Blocked Operational Request", blocked],
    ["No Query Material", noQueryMaterial], ["Direct Identity Tags", directIdentityTags],
    ["No Operations Performed", noOperations], ["Final Gate", finalGate]
  ];
  var reportWindow = window.open("", "AAB_ID_09_VALIDATION_" + Date.now(), "width=1180,height=900");
  if (!reportWindow) {
    console.error("AAB ID-09 validation report window was blocked.", finalGate);
    return finalGate;
  }
  reportWindow.document.open();
  reportWindow.document.write("<!doctype html><html><head><meta charset='utf-8'><title>AAB ID-09 Validation</title>" +
    "<style>body{font-family:system-ui;background:#f4f7f5;color:#17231c;margin:0;padding:24px}" +
    "main{max-width:1100px;margin:auto}h1{margin:0 0 18px}section{background:#fff;border:1px solid #cbd8cf;" +
    "border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 3px 12px rgba(19,46,29,.06)}" +
    "h2{font-size:17px;margin:0 0 10px}pre{white-space:pre-wrap;word-break:break-word;margin:0}" +
    ".pass{color:#116329}.fail{color:#a11919}</style></head><body><main><h1 class='" +
    (finalGate.passed ? "pass" : "fail") + "'>AAB ID-09 — " +
    (finalGate.passed ? "PASS_READY_READ_ONLY" : "FAIL_CLOSED") + "</h1>" +
    sections.map(function (entry) { return block(entry[0], entry[1]); }).join("") +
    "</main></body></html>");
  reportWindow.document.close();
  console.log("AAB ID-09 Final Gate", finalGate);
  return finalGate;
})();
