// aab-session.js v2 (Patch 4) — v31
// Nested-path hardening: runtime intel and auth page resolve from this script's directory.
// Purpose: load runtime intel, guard protected pages, and provide a fetch wrapper that supports
// both cookie sessions and Bearer tokens (token is injected when present).
(() => {
  const DEFAULTS = {
    runtime: {
      mock_api: false,
      api_base: "",
      auth: {
        token_key: "aab_auth_token_v1",
        protected: [],
        auth_page: "auth.html",
        dash_fallback: "field_ops.html"
      }
    }
  };

  const AAB = (window.AAB = window.AAB || {});
  const FLAGS = (AAB._flags = AAB._flags || {});

  // Resolve shared runtime assets from the physical location of this script,
  // not from the page URL. This keeps nested pages such as /_rebuild/ safe.
  const SESSION_SCRIPT_URL = (() => {
    try {
      const current = document.currentScript && document.currentScript.src
        ? document.currentScript.src
        : "./aab-session.js";
      return new URL(current, location.href);
    } catch (_) {
      return new URL("./aab-session.js", location.href);
    }
  })();
  const APP_BASE_URL = new URL("./", SESSION_SCRIPT_URL);

  function sharedAppUrl(path) {
    try {
      const value = String(path || "");
      if (/^https?:\/\//i.test(value) || value.startsWith("/")) return value;
      return new URL(value, APP_BASE_URL).href;
    } catch (_) {
      return String(path || "");
    }
  }

  function pageName() {
    const p = location.pathname.split("/").pop();
    return p || "field_ops.html";
  }

  function tokenKey(intel) {
    return (
      (intel && intel.runtime && intel.runtime.auth && intel.runtime.auth.token_key) ||
      (AAB.intel && AAB.intel.runtime && AAB.intel.runtime.auth && AAB.intel.runtime.auth.token_key) ||
      DEFAULTS.runtime.auth.token_key
    );
  }

  function getToken(intel) {
    try {
      const k = tokenKey(intel);
      return localStorage.getItem(k) || "";
    } catch (_) {
      return "";
    }
  }

  function shouldAttachAuth(pathname, href) {
    const p = String(pathname || "");
    const h = String(href || "");
    // Only attach to known API surfaces (avoid leaking tokens to other endpoints).
    if (p.includes("aab-intel.json")) return false;
    if (p.includes("gate.php")) return false;

    return (
      p.includes("api.php") ||
      p.startsWith("/api/") ||
      p.includes("/api/") ||
      p.includes("aab-intel-live.php") ||
      h.includes("api.php") ||
      h.includes("/api/")
    );
  }

  function redirectToAuth(intel) {
    try {
      sessionStorage.setItem("return_to", location.href);
    } catch (_) {}
    const authPage =
      (intel && intel.runtime && intel.runtime.auth && intel.runtime.auth.auth_page) ||
      DEFAULTS.runtime.auth.auth_page;
    location.replace(sharedAppUrl(authPage));
  }

  function hasAuthToken(intel) {
    return !!getToken(intel);
  }

  async function loadIntel() {
    if (AAB.intel) return AAB.intel;
    try {
      // cache-bust to avoid serving stale runtime/auth config
      const res = await fetch(sharedAppUrl("aab-intel.json?v=27"), { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      AAB.intel = await res.json();
    } catch (e) {
      AAB.intel = DEFAULTS;
    }
    return AAB.intel;
  }

  async function guardIfProtected() {
    const intel = await loadIntel();
    const protectedPages = (intel && intel.runtime && intel.runtime.auth && intel.runtime.auth.protected) || [];
    if (!protectedPages.includes(pageName())) return;
    if (!hasAuthToken(intel)) redirectToAuth(intel);
  }

  function installFetchAuthShim() {
    // Wrap window.fetch so pages that still use raw fetch get Bearer auth automatically (same-origin API only).
    if (FLAGS.fetchAuthShimInstalled) return;
    if (typeof window.fetch !== "function") return;

    FLAGS.fetchAuthShimInstalled = true;
    const origFetch = window.fetch.bind(window);
    AAB._origFetch = origFetch;

    window.fetch = function (input, init) {
      const token = getToken();
      if (!token) return origFetch(input, init);

      let urlStr = "";
      try {
        urlStr = typeof input === "string" ? input : (input && input.url ? input.url : String(input));
      } catch (_) {
        urlStr = String(input);
      }

      try {
        const u = new URL(urlStr, location.href);
        if (u.origin !== location.origin) return origFetch(input, init);
        if (!shouldAttachAuth(u.pathname, u.href)) return origFetch(input, init);

        const headers = new Headers();

        // Start with Request headers (if any)
        if (input instanceof Request) {
          try { input.headers.forEach((v, k) => headers.set(k, v)); } catch (_) {}
        }

        // Merge init headers (if any)
        if (init && init.headers) {
          try {
            new Headers(init.headers).forEach((v, k) => headers.set(k, v));
          } catch (_) {}
        }

        // Primary: standard Authorization header
        if (!headers.has("Authorization")) headers.set("Authorization", "Bearer " + token);
        // Fallback: some hosts/proxies do not forward Authorization to PHP.
        // api.php supports HTTP_X_AAB_SESSION as an alternate token source.
        if (!headers.has("X-AAB-SESSION")) headers.set("X-AAB-SESSION", token);
        if (!headers.has("X-AAB-TOKEN")) headers.set("X-AAB-TOKEN", token);

        const nextInit = Object.assign({}, init || {}, { headers });

        // If input is a Request, create a new Request so headers apply.
        if (input instanceof Request) {
          const req = new Request(input, nextInit);
          return origFetch(req);
        }
        return origFetch(input, nextInit);
      } catch (_) {
        return origFetch(input, init);
      }
    };
  }

  // Public: aabFetch wrapper (uses cookie + bearer; bearer injected when present)
  async function aabFetch(url, opts = {}) {
    const intel = await loadIntel();
    const base = (intel && intel.runtime && intel.runtime.api_base) || "";
    const fullUrl = (String(url).startsWith("http") || String(url).startsWith("/")) ? String(url) : (base + String(url));

    const headers = new Headers(opts.headers || {});
    try {
      const u = new URL(fullUrl, location.href);
      const token = getToken(intel);
      if (token && u.origin === location.origin && shouldAttachAuth(u.pathname, u.href)) {
        if (!headers.has("Authorization")) headers.set("Authorization", "Bearer " + token);
        if (!headers.has("X-AAB-SESSION")) headers.set("X-AAB-SESSION", token);
        if (!headers.has("X-AAB-TOKEN")) headers.set("X-AAB-TOKEN", token);
      }
    } catch (_) {}

    const o = Object.assign(
      {
        credentials: "include",
        headers
      },
      opts || {}
    );

    // In local testing, optionally simulate an API.
    if (intel && intel.runtime && intel.runtime.mock_api) {
      // Simulate auth enforcement
      if (!hasAuthToken(intel)) {
        redirectToAuth(intel);
        // never resolves; but keep a consistent shape
        return new Response("", { status: 401 });
      }
      // A tiny fake latency
      await new Promise((r) => setTimeout(r, 240));
      // Fake endpoints
      if (fullUrl.includes("/api/ping")) {
        return new Response(JSON.stringify({ ok: true, ts: new Date().toISOString() }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      return new Response(JSON.stringify({ ok: true, echo: { url: fullUrl, opts: { ...o, headers: undefined } } }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    let res;
    try {
      res = await fetch(fullUrl, o);
    } catch (e) {
      // Network failure: let caller decide to queue.
      throw e;
    }

    if (res.status === 401) {
      try { localStorage.removeItem(tokenKey(intel)); } catch (_) {}
      redirectToAuth(intel);
    } else if (res.status === 403) {
      redirectToAuth(intel);
    }
    return res;
  }

  async function logout() {
    if (FLAGS.logoutInProgress) return;
    FLAGS.logoutInProgress = true;

    try {
      let client =
        window.AAB_ADMIN_SUPABASE_CLIENT ||
        window.AAB_SUPABASE_CLIENT ||
        AAB.supabaseClient ||
        null;

      if (!client && window.supabase && typeof window.supabase.createClient === "function") {
        try {
          const response = await fetch("/api/aab-config", { cache: "no-store" });
          const config = await response.json();
          if (response.ok && config && config.ok && config.url && config.publishableKey) {
            client = window.supabase.createClient(config.url, config.publishableKey, {
              auth: {
                persistSession: true,
                autoRefreshToken: false,
                detectSessionInUrl: false,
                flowType: "pkce"
              }
            });
          }
        } catch (_) {}
      }

      if (client && client.auth && typeof client.auth.signOut === "function") {
        try {
          await client.auth.signOut({ scope: "local" });
        } catch (_) {}
      }
    } finally {
      try { localStorage.removeItem(tokenKey()); } catch (_) {}
      try { sessionStorage.removeItem("return_to"); } catch (_) {}
      location.replace("https://aab.ag/enter-aab/");
    }
  }

  AAB.loadIntel = loadIntel;
  AAB.aabFetch = aabFetch;
  AAB.hasAuthToken = hasAuthToken;
  AAB.redirectToAuth = redirectToAuth;
  AAB.installFetchAuthShim = installFetchAuthShim;
  AAB.logout = logout;

  // Install shim first so raw fetch calls get Bearer support.
  installFetchAuthShim();

  // Guard early
  guardIfProtected();
})();
