/**
 * AAB Governed Runtime Bootstrap
 * Loader reconciliation release: ID-LOADER-01, identity manifest v1.2.0
 *
 * Canonical, deterministic loader for the validated AAB identity chain.
 * Read-only. Fail-closed. No authority, navigation, session, token, database,
 * Airtable, Supabase, mutation, or activation capability.
 */
(function (global) {
  "use strict";

  const BUILD_ID = "ID-LOADER-01";
  const VERSION = "1.2.0";
  const PASS = "PASS_READY_READ_ONLY";
  const BASE_PATH = "/aab-local/app/_rebuild/js/";

  const IDENTITY_CHAIN = Object.freeze([
    Object.freeze({
      buildId: "ID-01",
      file: "AAB-ID-01-IDENTITY-AUTHORITY-COMPATIBILITY-CONTRACT.js",
      namespace: "AAB_IDENTITY_AUTHORITY_COMPATIBILITY_01"
    }),
    Object.freeze({
      buildId: "ID-02",
      file: "AAB-ID-02-IDENTITY-ACTOR-LINK-CONTRACT.js",
      namespace: "AAB_IDENTITY_ACTOR_LINK_02"
    }),
    Object.freeze({
      buildId: "ID-03",
      file: "AAB-ID-03-PROTECTED-MEMBERSHIP-AUTHORITY-RESOLVER-CONTRACT.js",
      namespace: "AAB_PROTECTED_MEMBERSHIP_AUTHORITY_RESOLVER_03"
    }),
    Object.freeze({
      buildId: "ID-04",
      file: "AAB-ID-04-SCOPED-DASHBOARD-ROUTE-RESOLVER-CONTRACT.js",
      namespace: "AAB_SCOPED_DASHBOARD_ROUTE_RESOLVER_04"
    }),
    Object.freeze({
      buildId: "ID-05",
      file: "AAB-ID-05-TRUSTED-DASHBOARD-ACCESS-DECISION-CONTRACT.js",
      namespace: "AAB_TRUSTED_DASHBOARD_ACCESS_DECISION_05"
    }),
    Object.freeze({
      buildId: "ID-06",
      file: "AAB-ID-06-PROTECTED-DASHBOARD-CONTEXT-PROJECTION-CONTRACT.js",
      namespace: "AAB_PROTECTED_DASHBOARD_CONTEXT_PROJECTION_06"
    }),
    Object.freeze({
      buildId: "ID-07",
      file: "AAB-ID-07-PROTECTED-DASHBOARD-READ-REQUEST-ENVELOPE-CONTRACT.js",
      namespace: "AAB_PROTECTED_DASHBOARD_READ_REQUEST_ENVELOPE_07"
    })
  ]);

  let activePromise = null;
  let latestReport = null;

  function freezeReport(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.keys(value).forEach(function (key) {
        freezeReport(value[key]);
      });
      Object.freeze(value);
    }
    return value;
  }

  function namespaceApi(item) {
    const api = global[item.namespace];
    return api && typeof api === "object" ? api : null;
  }

  function validateLoadedContract(item) {
    const api = namespaceApi(item);
    if (!api) {
      throw new Error(item.buildId + " namespace missing after script load");
    }
    if (typeof api.validateContract !== "function") {
      throw new Error(item.buildId + " validateContract() missing");
    }

    const validation = api.validateContract();
    if (!validation || validation.result !== PASS || validation.ready !== true) {
      throw new Error(item.buildId + " did not return " + PASS);
    }

    return freezeReport({
      buildId: item.buildId,
      namespace: item.namespace,
      result: validation.result,
      ready: validation.ready,
      nextAllowedBuild: validation.nextAllowedBuild || null
    });
  }

  function findManagedScript(src) {
    return Array.from(document.scripts).find(function (script) {
      return script.dataset.aabGovernedSrc === src;
    }) || null;
  }

  function loadOne(item) {
    const src = BASE_PATH + item.file;
    const existingApi = namespaceApi(item);

    if (existingApi) {
      return Promise.resolve({
        buildId: item.buildId,
        src: src,
        reused: true,
        validation: validateLoadedContract(item)
      });
    }

    const existingScript = findManagedScript(src);
    if (existingScript) {
      return new Promise(function (resolve, reject) {
        existingScript.addEventListener("load", function () {
          try {
            resolve({
              buildId: item.buildId,
              src: src,
              reused: true,
              validation: validateLoadedContract(item)
            });
          } catch (error) {
            reject(error);
          }
        }, { once: true });
        existingScript.addEventListener("error", function () {
          reject(new Error(item.buildId + " script failed to load"));
        }, { once: true });
      });
    }

    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = src + "?v=" + encodeURIComponent(VERSION);
      script.async = false;
      script.dataset.aabGovernedSrc = src;
      script.dataset.aabBuildId = item.buildId;

      script.addEventListener("load", function () {
        try {
          resolve({
            buildId: item.buildId,
            src: src,
            reused: false,
            validation: validateLoadedContract(item)
          });
        } catch (error) {
          reject(error);
        }
      }, { once: true });

      script.addEventListener("error", function () {
        reject(new Error(item.buildId + " script failed to load: " + src));
      }, { once: true });

      document.head.appendChild(script);
    });
  }

  async function run() {
    const startedAt = new Date().toISOString();
    const loaded = [];

    try {
      for (const item of IDENTITY_CHAIN) {
        loaded.push(await loadOne(item));
      }

      latestReport = freezeReport({
        buildId: BUILD_ID,
        version: VERSION,
        result: PASS,
        ready: true,
        failureReasons: [],
        mode: "DETERMINISTIC_IDENTITY_CHAIN_LOADER",
        chain: IDENTITY_CHAIN.map(function (item) { return item.buildId; }),
        loaded: loaded,
        duplicateExecutionPrevented: true,
        mutationPerformed: false,
        dataWritten: false,
        authorityGranted: false,
        navigationPerformed: false,
        startedAt: startedAt,
        completedAt: new Date().toISOString(),
        nextAllowedBuild: "ID-08"
      });
    } catch (error) {
      latestReport = freezeReport({
        buildId: BUILD_ID,
        version: VERSION,
        result: "FAIL_CLOSED",
        ready: false,
        failureReasons: [String(error && error.message ? error.message : error)],
        mode: "DETERMINISTIC_IDENTITY_CHAIN_LOADER",
        chain: IDENTITY_CHAIN.map(function (item) { return item.buildId; }),
        loaded: loaded,
        mutationPerformed: false,
        dataWritten: false,
        authorityGranted: false,
        navigationPerformed: false,
        startedAt: startedAt,
        completedAt: new Date().toISOString(),
        nextAllowedBuild: null
      });
    }

    global.dispatchEvent(new CustomEvent("aab:governed-runtime-ready", {
      detail: latestReport
    }));

    return latestReport;
  }

  function bootstrap() {
    if (!activePromise) {
      activePromise = run();
    }
    return activePromise;
  }

  const API = Object.freeze({
    buildId: BUILD_ID,
    version: VERSION,
    getManifest: function () { return IDENTITY_CHAIN; },
    getReport: function () { return latestReport; },
    whenReady: bootstrap,
    validateContract: async function () { return bootstrap(); },
    getContract: function () {
      return freezeReport({
        buildId: BUILD_ID,
        contractName: "AAB Governed Runtime Bootstrap",
        version: VERSION,
        status: latestReport ? latestReport.result : "LOADING",
        classification: [
          "DETERMINISTIC_ORDER",
          "FAIL_CLOSED",
          "DUPLICATE_EXECUTION_PROTECTION",
          "NO_AUTHORITY_GRANT",
          "NO_NAVIGATION",
          "NO_DATABASE_WRITE",
          "NO_AUTH_ACTIVATION"
        ],
        identityChain: IDENTITY_CHAIN.map(function (item) { return item.buildId; }),
        nextAllowedBuild: "ID-08"
      });
    }
  });

  global.AAB_GOVERNED_RUNTIME_BOOTSTRAP = API;
  bootstrap();
})(window);
