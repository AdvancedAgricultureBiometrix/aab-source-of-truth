(async function AAB_ID_08_BROWSER_VALIDATION() {
  "use strict";

  function copy(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (error) { return String(value); }
  }
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
  var bootstrapValidation = bootstrap && typeof bootstrap.validateContract === "function"
    ? await bootstrap.validateContract()
    : null;
  var id05 = window.AAB_TRUSTED_DASHBOARD_ACCESS_DECISION_05;
  var id06 = window.AAB_PROTECTED_DASHBOARD_CONTEXT_PROJECTION_06;
  var id07 = window.AAB_PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE_07;
  var id08 = window.AAB_PROTECTED_DASHBOARD_READ_POLICY_DECISION_08;
  var contractExists = Boolean(id08);
  var validation = contractExists && typeof id08.validateContract === "function"
    ? id08.validateContract()
    : null;
  var snapshot = contractExists && typeof id08.getContract === "function"
    ? id08.getContract()
    : null;

  var access = id05 && id05.decideSyntheticAccess({
    routeContext: {
      actorId: "actor-scientist-001",
      routeSource: "SERVER_DEFINED_ROUTE_REGISTRY",
      navigationPerformed: false,
      routeCount: 1,
      routes: [{
        dashboardId: "SCIENTIST_WORKSPACE",
        path: "/scientist/workspace",
        roleCode: "SCIENTIST",
        scopeType: "INSTITUTION",
        scopeId: "institution-aab-001",
        institutionId: "institution-aab-001"
      }]
    }
  });
  var projected = id06 && id06.projectSyntheticContext({ accessResult: access });
  var envelope = id07 && id07.createSyntheticReadEnvelope({
    contextResult: projected,
    resourceId: "SCIENTIST_WORKSPACE_SUMMARY"
  });
  var decision = id08 && id08.decideSyntheticReadPolicy({ envelopeResult: envelope });
  var override = id08 && id08.decideSyntheticReadPolicy({
    envelopeResult: envelope,
    policyId: "CLIENT_ALLOW_ALL"
  });
  var unknownInput = envelope ? copy(envelope) : {};
  if (unknownInput.readEnvelope && unknownInput.readEnvelope.resource) {
    unknownInput.readEnvelope.resource.readModel = "UNKNOWN_READ_MODEL";
  }
  var unknown = id08 && id08.decideSyntheticReadPolicy({ envelopeResult: unknownInput });
  var denied = id08 && id08.decideSyntheticReadPolicy({
    envelopeResult: {
      buildId: "ID-07",
      result: "DASHBOARD_READ_REQUEST_ENVELOPE_DENIED",
      created: false,
      syntheticOnly: true
    }
  });
  var blocked = id08 && id08.checkSafeRequest({
    action: "EXECUTE_QUERY",
    executeQuery: true,
    fetchRecords: true,
    callApi: true,
    navigate: true,
    createSession: true,
    issueToken: true,
    grantRole: true,
    write: true,
    liveSupabase: true,
    liveAirtable: true,
    enableAuth: true
  });
  var directIdentityTags = Array.from(document.scripts).filter(function (script) {
    var src = script.getAttribute("src") || "";
    return /AAB-ID-0[1-8]-/i.test(src) && !script.dataset.aabGovernedSrc;
  }).map(function (script) { return script.getAttribute("src"); });

  var noOperations = [decision, override, unknown, denied, blocked].every(function (result) {
    return result &&
      result.authorityGranted === false &&
      result.navigationPerformed === false &&
      result.apiCalled === false &&
      result.queryExecuted === false &&
      result.dataQueried === false &&
      result.recordsFetched === false &&
      result.sessionCreated === false &&
      result.tokenIssued === false &&
      result.mutationPerformed === false &&
      result.dataWritten === false;
  });
  var manifest = bootstrap && bootstrap.getManifest ? bootstrap.getManifest() : [];
  var finalGate = {
    buildId: "ID-08",
    passed: Boolean(
      contractExists &&
      bootstrapValidation && bootstrapValidation.result === "PASS_READY_READ_ONLY" &&
      bootstrapValidation.ready === true &&
      bootstrap && bootstrap.version === "1.3.0" &&
      manifest.map(function (item) { return item.buildId; }).join(",") ===
        "ID-01,ID-02,ID-03,ID-04,ID-05,ID-06,ID-07,ID-08" &&
      validation && validation.result === "PASS_READY_READ_ONLY" && validation.ready === true &&
      access && access.allowed === true &&
      projected && projected.projected === true &&
      envelope && envelope.created === true &&
      decision && decision.allowed === true &&
      decision.readDecision && decision.readDecision.executable === false &&
      Object.isFrozen(decision) && Object.isFrozen(decision.readDecision) &&
      override && override.allowed === false &&
      override.failureReasons.includes("CLIENT_SUPPLIED_POLICY_SCOPE_QUERY_OR_DECISION_OVERRIDE_BLOCKED") &&
      unknown && unknown.allowed === false &&
      unknown.failureReasons.includes("READ_MODEL_NOT_IN_SERVER_DEFINED_POLICY_REGISTRY") &&
      denied && denied.allowed === false && denied.readDecision === null &&
      blocked && blocked.result === "BLOCKED_OPERATIONAL_REQUEST" && blocked.allowed === false &&
      directIdentityTags.length === 0 && noOperations
    ),
    result: validation ? validation.result : "MISSING",
    nextBuildAfterFormalClosure: "ID-09",
    authorityGranted: false,
    navigationPerformed: false,
    apiCalled: false,
    queryExecuted: false,
    recordsFetched: false,
    sessionCreated: false,
    tokenIssued: false,
    mutationPerformed: false,
    dataWritten: false
  };

  var reportWindow = window.open("", "AAB_ID_08_VALIDATION_" + Date.now(), "width=1180,height=900");
  if (!reportWindow) {
    console.error("AAB ID-08 validation report window was blocked.", finalGate);
    return finalGate;
  }
  var sections = [
    ["Contract Exists", contractExists],
    ["Bootstrap Validation", bootstrapValidation],
    ["Manifest", manifest],
    ["Validation Result", validation],
    ["Contract Snapshot", snapshot],
    ["ID-05 Access Result", access],
    ["ID-06 Projection Result", projected],
    ["ID-07 Envelope Result", envelope],
    ["ID-08 Safe Policy Decision", decision],
    ["Client Override Check", override],
    ["Unknown Read Model Check", unknown],
    ["Denied Envelope Check", denied],
    ["Blocked Operational Request", blocked],
    ["Direct Identity Tags", directIdentityTags],
    ["No Operations Performed", noOperations],
    ["Final Gate", finalGate]
  ];
  reportWindow.document.open();
  reportWindow.document.write("<!doctype html><html><head><meta charset='utf-8'><title>AAB ID-08 Validation</title>" +
    "<style>body{font-family:system-ui;background:#f4f7f5;color:#17231c;margin:0;padding:24px}" +
    "main{max-width:1100px;margin:auto}h1{margin:0 0 18px}section{background:#fff;border:1px solid #cbd8cf;" +
    "border-radius:12px;padding:16px;margin:12px 0;box-shadow:0 3px 12px rgba(19,46,29,.06)}" +
    "h2{font-size:17px;margin:0 0 10px}pre{white-space:pre-wrap;word-break:break-word;margin:0}" +
    ".pass{color:#116329}.fail{color:#a11919}</style></head><body><main><h1 class='" +
    (finalGate.passed ? "pass" : "fail") + "'>AAB ID-08 — " +
    (finalGate.passed ? "PASS_READY_READ_ONLY" : "FAIL_CLOSED") + "</h1>" +
    sections.map(function (entry) { return block(entry[0], entry[1]); }).join("") +
    "</main></body></html>");
  reportWindow.document.close();
  console.log("AAB ID-08 Final Gate", finalGate);
  return finalGate;
})();
