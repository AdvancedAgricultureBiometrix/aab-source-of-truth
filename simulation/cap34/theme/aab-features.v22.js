function setAabTodayDatePill(){
  const el = document.getElementById("aabDatePill");
  if(!el) return;
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Perth",
    weekday: "short",
    day: "2-digit",
    month: "short"
  });
  const txt = fmt.format(now).replace(",", "");
  const label = el.querySelector("span:last-child");
  if(label) label.textContent = txt;
}


// aab-features.js v1
(() => {
  let __aabLastHeaderState = { online:true, queueLen:0, requiredDone:0, requiredTotal:0 };

  const AAB = (window.AAB = window.AAB || {});

  const DEFAULT_INTEL = {
    version: 1,
    contracts: {
      status_map_key: 'aab_status_map_v1',
      queue_key: 'aab_queue_v1',
      queue_lock_key: 'aab_queue_v1_lock',
      queue_state_key: 'aab_queue_v1_state',
      ledger: {
        pages_key: 'aab_ledger_v1_pages',
        page_prefix: 'aab_ledger_v1_page_',
        idx_by_trial_key: 'aab_ledger_v1_idx_by_trial',
        idx_recent_key: 'aab_ledger_v1_idx_recent',
        state_key: 'aab_ledger_v1_state',
        events_per_page: 200
      }
    },
    next_best_action: {
      priority: ['auth', 'required', 'queue', 'ready'],
      labels: { required: 'Fill required metrics', queue: 'Queue', ready: 'Ready' },
      explainable: true
    },
    toasts: { enabled: true, duration_ms: 2200 },
    learning_note_panel: {
      enabled: true,
      fields: ['changed', 'unusual', 'confidence'],
      confidence_levels: ['low', 'med', 'high'],
      storage: { mode: 'local', key_prefix: 'aab_note_v1_' }
    },
    queue: {
      enabled: true,
      mode: 'coach',
      retry: { max_attempts: 7, backoff_seconds: [10, 30, 120, 600, 1800, 3600, 7200] },
      dedupe: { enabled: true, dedupe_key_field: 'dedupe_key' }
    },
    ledger: { enabled: true, mode: 'silent', id_strategy: 'ulid' },
    anomalies: { enabled: true, mode: 'coach', rules: [] },
    signature_wow: {
      ship_first: 'explainable_readiness_playback',
      playback: {
        enabled: true,
        events: ['capture.saved', 'obs.added', 'queue.enqueued', 'queue.sync_ok', 'anomaly.detected'],
        max_items: 5
      }
    }
  };

  const $ = (sel) => document.querySelector(sel);

  function nowISO() { return new Date().toISOString(); }
  function uid(prefix) {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2, 10);
    return `${prefix}_${t}_${r}`;
  }

  function intel() { return (AAB.intel || DEFAULT_INTEL); }

  function readJSON(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(k, v) {
    localStorage.setItem(k, JSON.stringify(v));
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  }

  // ---------------- Toasts ----------------
  function toast(msg, kind = 'ok') {
    const i = intel();
    if (!i?.toasts?.enabled) return;
    const host = $('#aabToastHost');
    if (!host) return;

    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.innerHTML = `<div class="ico">✓</div><div class="t">${escapeHtml(msg)}</div>`;
    if (kind === 'attn') el.querySelector('.ico').textContent = '!';
    if (kind === 'halt') el.querySelector('.ico').textContent = '×';

    host.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => el.remove(), 250);
    }, i.toasts.duration_ms || 2200);
  }

  // ---------------- Ledger (paged) ----------------
  function ledgerKeys() {
    const c = intel().contracts || {};
    const l = c.ledger || {};
    return {
      pages: l.pages_key || 'aab_ledger_v1_pages',
      prefix: l.page_prefix || 'aab_ledger_v1_page_',
      idxTrial: l.idx_by_trial_key || 'aab_ledger_v1_idx_by_trial',
      idxRecent: l.idx_recent_key || 'aab_ledger_v1_idx_recent',
      state: l.state_key || 'aab_ledger_v1_state',
      perPage: l.events_per_page || 200
    };
  }

  function ledgerAppend(evt) {
    if (!intel().ledger?.enabled) return;

    const K = ledgerKeys();
    const pages = readJSON(K.pages, []);
    let pageId = pages[pages.length - 1];

    if (!pageId) {
      pageId = 1;
      pages.push(pageId);
      writeJSON(K.pages, pages);
      writeJSON(`${K.prefix}${pageId}`, []);
    }

    let page = readJSON(`${K.prefix}${pageId}`, []);
    if (page.length >= K.perPage) {
      // roll
      writeJSON(`${K.prefix}${pageId}`, page);
      pageId += 1;
      pages.push(pageId);
      writeJSON(K.pages, pages);
      page = [];
    }

    page.push(evt);
    writeJSON(`${K.prefix}${pageId}`, page);

    // recent pages index
    const recent = readJSON(K.idxRecent, []);
    if (!recent.includes(pageId)) {
      recent.unshift(pageId);
      writeJSON(K.idxRecent, recent.slice(0, 30));
    }

    // by trial index
    const t = evt.trial_id;
    if (t) {
      const byTrial = readJSON(K.idxTrial, {});
      const arr = byTrial[t] || [];
      if (!arr.includes(pageId)) arr.push(pageId);
      byTrial[t] = arr;
      writeJSON(K.idxTrial, byTrial);
    }

    // rolling state
    const state = readJSON(K.state, {});
    state.last_evt_ts = evt.ts;
    if (evt.trial_id) state.last_trial_id = evt.trial_id;
    if (evt.queue?.len != null) state.queue_len = evt.queue.len;
    if (evt.net?.online != null) state.net_online = evt.net.online;
    if (evt.required?.done != null) state.required = evt.required;
    writeJSON(K.state, state);
  }

  function ledgerRecentEvents(max = 20) {
    const K = ledgerKeys();
    const pages = readJSON(K.pages, []);
    const last = pages[pages.length - 1];
    if (!last) return [];
    const page = readJSON(`${K.prefix}${last}`, []);
    return page.slice(-max);
  }

  // ---------------- Queue ----------------
  // Patch 2: unify legacy queue key (aab_offline_queue_v1) with the canonical intel queue key.
  let __aabQueueMigrated = false;

  function queueCanonicalKey() {
    return intel().contracts?.queue_key || 'aab_queue_v1';
  }

  function queueLegacyKeys() {
    const primary = queueCanonicalKey();
    const legacy = [];
    // Earlier pages used this key; keep it in sync for backwards compatibility.
    if (primary !== 'aab_offline_queue_v1') legacy.push('aab_offline_queue_v1');
    return legacy;
  }

  function queueItemKey(item) {
    if (!item) return '';
    if (item.id) return 'id:' + item.id;
    if (item.client_id) return 'c:' + item.client_id;
    const dedupeField = intel().queue?.dedupe?.dedupe_key_field || 'dedupe_key';
    if (item[dedupeField]) return 'd:' + item[dedupeField];
    try { return 'j:' + JSON.stringify(item); } catch (_) { return 's:' + String(item); }
  }

  function queueMerge(lists) {
    const out = [];
    const seen = new Set();
    (lists || []).forEach((arr) => {
      (arr || []).forEach((it) => {
        const k = queueItemKey(it);
        if (k && seen.has(k)) return;
        if (k) seen.add(k);
        out.push(it);
      });
    });
    return out;
  }

  function queueMigrateOnce() {
    if (__aabQueueMigrated) return;
    __aabQueueMigrated = true;

    const primary = queueCanonicalKey();
    const legacyKeys = queueLegacyKeys();
    const keys = [primary].concat(legacyKeys);

    const lists = keys.map((k) => readJSON(k, []));
    const merged = queueMerge(lists);

    const anyLegacy = lists.slice(1).some((arr) => Array.isArray(arr) && arr.length);
    if (anyLegacy) {
      writeJSON(primary, merged);
      legacyKeys.forEach((k) => writeJSON(k, merged));
    }
  }

  function queueRead() {
    queueMigrateOnce();
    return readJSON(queueCanonicalKey(), []);
  }

  function queueWrite(q) {
    const qq = Array.isArray(q) ? q : [];
    writeJSON(queueCanonicalKey(), qq);
    // Keep legacy key in sync for older pages.
    queueLegacyKeys().forEach((k) => writeJSON(k, qq));
  }

  function queueLen() {
    return queueRead().length;
  }

  function queueEnqueue(item) {
    let q = queueRead();

    const dedupeField = intel().queue?.dedupe?.dedupe_key_field || 'dedupe_key';
    if (intel().queue?.dedupe?.enabled && item?.[dedupeField]) {
      if (q.some((x) => x?.[dedupeField] === item[dedupeField])) {
        return;
      }
    }

    q.push(item);
    queueWrite(q);

    ledgerAppend({
      id: uid('evt'),
      ts: nowISO(),
      type: 'queue.enqueued',
      trial_id: item.trial_id || null,
      net: { online: navigator.onLine },
      queue: { len: q.length },
      payload: { kind: item.kind, id: item.id }
    });

    toast('Queued (offline) ✓', 'attn');
    updatePills();
  }

  function queueDequeue(id) {
    let q = queueRead();
    q = q.filter((x) => (x.id !== id) && (x.client_id !== id));
    queueWrite(q);

    ledgerAppend({
      id: uid('evt'),
      ts: nowISO(),
      type: 'queue.dequeued',
      trial_id: null,
      net: { online: navigator.onLine },
      queue: { len: q.length },
      payload: { id }
    });

    updatePills();
  }

  async function queueSync() {
    if (!intel().queue?.enabled) return;

    const lockKey = intel().contracts?.queue_lock_key || 'aab_queue_v1_lock';
    if (localStorage.getItem(lockKey)) {
      toast('Sync already running', 'attn');
      return;
    }
    localStorage.setItem(lockKey, uid('lock'));

    try {
      let q = queueRead();

      if (!q.length) {
        toast('Queue empty ✓', 'ok');
        updatePills();
        return;
      }

      ledgerAppend({ id: uid('evt'), ts: nowISO(), type: 'queue.sync_started', net: { online: navigator.onLine }, queue: { len: q.length } });

      if (!navigator.onLine) {
        toast('Offline — queue will sync when online', 'attn');
        return;
      }

      // Patch 3: process only items that are due (respects next_retry_ts) and avoid false “complete ✓”.
      let processed = 0;
      let failed = false;

      const maxBatch = (intel().queue?.retry?.max_batch ?? 25);

      while (true) {
        q = queueRead();
        if (!q.length) break;

        const now = Date.now();
        const dueIdx = q.findIndex((it) => !it?.next_retry_ts || Number(it.next_retry_ts) <= now);
        if (dueIdx === -1) break;

        const item = q[dueIdx];

        try {
          // Support both the v22 job schema and legacy Warm Midnight B observation queue items.
          const legacyObs = (!item.endpoint && item.plot_id && item.fields);
          const endpoint = legacyObs ? './api.php?action=create_observation' : item.endpoint;
          const method = legacyObs ? 'POST' : (item.method || 'POST');
          const headers = legacyObs
            ? { 'content-type': 'application/json' }
            : (item.headers || { 'content-type': 'application/json' });
          const bodyObj = legacyObs ? { plot_id: item.plot_id, fields: item.fields } : item.body;
          const body = (bodyObj == null) ? undefined : (typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj));

          const res = await AAB.aabFetch(endpoint, { method, headers, body });
          if (!res.ok) {
            let js = null;
            try { js = await res.json(); } catch(e) {}
            const msg = (js && (js.error || js.message)) ? (js.error || js.message) : (`HTTP ${res.status}`);

            // Treat common validation/permission conflicts as non-retriable so the queue doesn't spin forever.
            const perm = [400, 401, 403, 404, 409, 410, 422].includes(Number(res.status));
            if (perm) {
              const rid = item.id || item.client_id || null;
              if (rid) {
                queueDequeue(rid);
              } else {
                const qq2 = queueRead();
                qq2.splice(dueIdx, 1);
                queueWrite(qq2);
              }

              processed += 1;
              q = queueRead();

              ledgerAppend({
                id: uid('evt'),
                ts: nowISO(),
                type: 'queue.sync_dead',
                trial_id: item.trial_id || null,
                net: { online: navigator.onLine },
                queue: { len: q.length },
                payload: { id: rid, kind: legacyObs ? 'legacy.create_observation' : item.kind, status: res.status, msg }
              });

              toast('A queued item failed validation — removed from queue', 'attn');
              continue;
            }
            throw new Error(msg);
          }

          const rid = item.id || item.client_id || null;
          if (rid) {
            queueDequeue(rid);
          } else {
            // Fallback: remove by index if the item has no identifier.
            const qq = queueRead();
            qq.splice(dueIdx, 1);
            queueWrite(qq);
          }

          processed += 1;
          q = queueRead();

          ledgerAppend({
            id: uid('evt'),
            ts: nowISO(),
            type: 'queue.sync_ok',
            trial_id: item.trial_id || null,
            net: { online: true },
            queue: { len: q.length },
            payload: { id: rid, kind: legacyObs ? 'legacy.create_observation' : item.kind }
          });
        } catch (e) {
          // Update the failed item in-place with retry metadata.
          const qq = queueRead();
          const it = qq[dueIdx] || item;
          it.attempts = (it.attempts || 0) + 1;
          it.last_error = String(e);

          const backoffs = intel().queue?.retry?.backoff_seconds || [10, 30, 120, 600, 1800, 3600, 7200];
          const idx = Math.min(it.attempts - 1, backoffs.length - 1);
          it.next_retry_ts = Date.now() + backoffs[idx] * 1000;

          qq[dueIdx] = it;
          queueWrite(qq);

          ledgerAppend({
            id: uid('evt'),
            ts: nowISO(),
            type: 'queue.sync_fail',
            trial_id: it.trial_id || null,
            net: { online: navigator.onLine },
            queue: { len: qq.length },
            payload: { id: (it.id || it.client_id || null), err: it.last_error, attempts: it.attempts, next_retry_ts: it.next_retry_ts }
          });

          toast('Sync paused — will retry', 'attn');
          failed = true;
          break;
        }

        if (processed >= maxBatch) break;
      }

      q = queueRead();

      if (!q.length) {
        toast(processed ? 'Sync complete ✓' : 'Queue empty ✓', 'ok');
      } else if (!failed) {
        // Queue still has items, but none are due yet.
        const now = Date.now();
        const next = Math.min(
          ...q
            .map((it) => Number(it?.next_retry_ts))
            .filter((n) => Number.isFinite(n) && n > now)
        );

        if (Number.isFinite(next)) {
          const ms = Math.max(0, next - now);
          const mins = Math.max(1, Math.ceil(ms / 60000));
          toast(`Queue waiting — next retry in ~${mins} min`, 'attn');

          ledgerAppend({
            id: uid('evt'),
            ts: nowISO(),
            type: 'queue.sync_wait',
            trial_id: null,
            net: { online: navigator.onLine },
            queue: { len: q.length },
            payload: { next_retry_ts: next }
          });
        } else {
          toast(`Queue pending (${q.length})`, 'attn');
        }
      }
    } finally {
      localStorage.removeItem(lockKey);
      updatePills();
    }
  }

  // ---------------- Readiness + Anomalies ----------------
  function readStatusMap() {
    const k = intel().contracts?.status_map_key || 'aab_status_map_v1';
    return readJSON(k, null);
  }

  function requiredState() {
    const sm = readStatusMap();
    const r = sm?.required || sm;
    if (!r || typeof r.done !== 'number' || typeof r.total !== 'number') return { done: 0, total: 0, known: false };
    return { done: r.done, total: r.total, known: true };
  }

  function setPill(pill, cls, text) {
    if (!pill) return;
    pill.classList.remove('ok', 'attn', 'halt');
    pill.classList.add(cls);
    const span = pill.querySelector('span:last-child');
    if (span) span.textContent = text;
  }

  function updatePills() {
    const ql = queueLen();
    const req = requiredState();
    const online = navigator.onLine;
    const requiredTotal = (req && req.known) ? Number(req.total || 0) : 0;
    const requiredDone  = (req && req.known) ? Number(req.done  || 0) : 0;

    const net = $('#aabNetPill');
    const q   = $('#aabQueuePill');
    const r   = $('#aabReadyPill');
    const o   = $('#aabOverallPill');
    const nav = $('#aabNavPill');

    setPill(net, online ? 'ok' : 'attn', online ? 'Online' : 'Offline');
    setPill(q, ql > 0 ? 'attn' : 'ok', `Queue: ${ql}`);

    const hasReq = !!(req && req.known && requiredTotal > 0);
    const incomplete = hasReq && requiredDone < requiredTotal;

    if (incomplete) {
      setPill(r, 'attn', `${intel().next_best_action?.labels?.required || 'Fill required metrics'} (${requiredDone}/${requiredTotal})`);
    } else if (ql > 0) {
      setPill(r, 'attn', `${intel().next_best_action?.labels?.queue || 'Queue'}: ${ql}`);
    } else {
      setPill(r, 'ok', intel().next_best_action?.labels?.ready || 'Ready');
    }

    // Overall (IndexDASH-style): worst-case summary
    if (o) {
      let kind = 'ok';
      let msg = 'Overall: Stable';
      if (!online) {
        kind = 'attn';
        msg = 'Overall: Offline';
      } else if (incomplete) {
        kind = 'attn';
        msg = 'Overall: Needs required';
      } else if (ql > 0) {
        kind = 'attn';
        msg = 'Overall: Queue pending';
      } else {
        kind = 'ok';
        msg = 'Overall: OK';
      }
      setPill(o, kind, msg);
    }
    // Nav pill label (optional) — prefer explicit label, never overwrite while running
    if (nav) {
      const desired = document.body?.dataset?.aabNavLabel;
      if (desired) {
        const labelEl = nav.querySelector('span:last-child');
        if (labelEl) labelEl.textContent = desired;
      }
    }

    // Choose the single “active” pill (next best action)
    if (!online) setActivePill('net');
    else if (ql > 0) setActivePill('queue');
    else if (incomplete) setActivePill('ready');
    else setActivePill('ready');

    // Dashboard governance panels (baseline state; loop may overwrite text)
    if (document.getElementById('aabGovPanelRow')) {
      const setGov = (baseId, state, text) => {
        const panel = document.getElementById(baseId);
        const dot = panel?.querySelector('.dot');
        const txt = document.getElementById(baseId + 'Txt');
        if (dot) {
          dot.classList.remove('ok','attn','halt');
          dot.classList.add(state);
        }
        if (txt) txt.textContent = text;
      };

      setGov('aabGovOverview', (!online || ql > 0) ? 'attn' : 'ok', (!online ? 'Offline' : (ql > 0 ? 'Items awaiting review' : 'Operating normally')));
      setGov('aabGovPurpose', 'ok', 'Direction is set');
      setGov('aabGovProgress', (ql > 0 || incomplete) ? 'attn' : 'ok', (ql > 0 ? 'Queue pending' : (incomplete ? 'Capture required' : 'Learning signals stable')));
      setGov('aabGovWelcome', 'ok', 'Console active');
    }

    // Cache latest header state for gov loop
    __aabLastHeaderState = { online, queueLen: ql, requiredDone, requiredTotal };

    // Start gov panel loop once (Dashboard only)
    if (!window.__aabGovLoopStarted && document.getElementById('aabGovPanelRow')) {
      window.__aabGovLoopStarted = true;
      startGovLoop(() => __aabLastHeaderState);
    }
}


  function detectAnomalies(metrics, prevMetrics) {
    const rules = intel().anomalies?.rules || [];
    const hits = [];
    for (const rule of rules) {
      try {
        if (rule.type === 'range') {
          const v = metrics?.[rule.field];
          if (typeof v === 'number' && (v < rule.min || v > rule.max)) hits.push(rule);
        }
        if (rule.type === 'jump_abs' && prevMetrics) {
          const v = metrics?.[rule.field];
          const p = prevMetrics?.[rule.field];
          if (typeof v === 'number' && typeof p === 'number' && Math.abs(v - p) > rule.threshold_abs) hits.push(rule);
        }
        if (rule.type === 'jump_pct' && prevMetrics) {
          const v = metrics?.[rule.field];
          const p = prevMetrics?.[rule.field];
          if (typeof v === 'number' && typeof p === 'number' && p !== 0) {
            const pct = Math.abs((v - p) / p) * 100;
            if (pct > rule.threshold_pct) hits.push(rule);
          }
        }
      } catch (_) {}
    }
    return hits;
  }


  // ---------------- Active Pill (Next Best Action) ----------------
  function setActivePill(kind){
    const ids = ['aabNetPill','aabQueuePill','aabReadyPill'];
    ids.forEach(id => { const el = document.getElementById(id); if(el) el.classList.remove('aab-active'); });
    const map = { net:'aabNetPill', queue:'aabQueuePill', ready:'aabReadyPill' };
    const id = map[kind];
    if(id){
      const el = document.getElementById(id);
      if(el) el.classList.add('aab-active');
    }
  }


  // ---------------- Gov panel loop (fade) ----------------
  const GOV_LOOP_MS = 10000; // 10s


  // ---------------- Intel live feed (Option 3) ----------------
  // Endpoint should exist server-side (e.g. /aab-local/app/aab-intel-live.php or /aab-local/app/aab-intel-live.php)
  const AAB_INTEL_URL_CANDIDATES = [
    './aab-intel-live.php',
    './aab-intel-live.php',
    '/aab-local/app/aab-intel-live.php',
    '/aab-local/app/aab-intel-live.php',
    '/aab-local/app/aab-intel-live.php'
  ];

  let __aabIntelLive = null;
  let __aabIntelOk = false;
  let __aabIntelLastErr = null;

  async function fetchFirstOk(urls){
    for(const u of urls){
      try{
        const r = await fetch(u, { credentials:'include', cache:'no-store' });
        if(!r.ok) continue;
        const j = await r.json();
        if(j && (j.ok === true || j.ok === undefined)) return { url:u, json:j };
      }catch(e){ /* try next */ }
    }
    return null;
  }

  function applyIntelHighlights(s){
    if(!s || typeof s !== 'string') return '';
    // Very light, safe highlights
    let out = s;
    out = out.replace(/\bOffline\b/g, kw('Offline','attn'));
    out = out.replace(/\bOnline\b/g, kw('Online','ok'));
    out = out.replace(/\bOperating normally\b/g, kw('Operating normally','ok'));
    out = out.replace(/\bReady\b/g, kw('Ready','ok'));
    out = out.replace(/\bRequired incomplete\b/g, kw('Required incomplete','attn'));
    out = out.replace(/\bawaiting review\b/gi, kw('awaiting review','gold'));
    out = out.replace(/\bEvidence:\s*High\b/g, 'Evidence: ' + kw('High','ok'));
    out = out.replace(/\bEvidence:\s*Medium\b/g, 'Evidence: ' + kw('Medium','gold'));
    out = out.replace(/\bEvidence:\s*Low\b/g, 'Evidence: ' + kw('Low','attn'));
    return out;
  }

  async function refreshIntelLive(){
    const got = await fetchFirstOk(AAB_INTEL_URL_CANDIDATES);
    if(!got){
      __aabIntelOk = false;
      __aabIntelLastErr = 'Intel live endpoint not reachable';
      return;
    }
    __aabIntelLive = got.json;
    __aabIntelOk = true;
    __aabIntelLastErr = null;
  }

  let govLoopTimer = null;
  let govIntelTimer = null;
  let govFocusWired = false;
  let govLoopTick = 0;

  function kw(text, kind){
    const cls = (kind==='ok'?'kw-ok':kind==='attn'?'kw-attn':kind==='halt'?'kw-halt':'kw-gold');
    return `<span class="${cls}">${text}</span>`;
  }

  function govLinePack(state){
    const online = !!state.online;
    const queueLen = Number(state.queueLen || 0);
    const requiredDone = Number(state.requiredDone || 0);
    const requiredTotal = Number(state.requiredTotal || 0);
    const requiredIncomplete = (requiredTotal > 0 && requiredDone < requiredTotal);



    // If live intel provides panel messages, prefer them.
    const intelMsg = (__aabIntelOk && __aabIntelLive && __aabIntelLive.messages) ? __aabIntelLive.messages : null;
    if(intelMsg){
      const toArr = (x)=> Array.isArray(x) ? x : (x ? [String(x)] : []);
      const mk = (arr)=> toArr(arr).map(applyIntelHighlights);
      return {
        aabGovOverviewTxt: mk(intelMsg.overview),
        aabGovPurposeTxt:  mk(intelMsg.purpose),
        aabGovProgressTxt: mk(intelMsg.progress),
        aabGovWelcomeTxt:  mk(intelMsg.welcome)
      };
    }
    const overview = [];
    if(!online) overview.push(`Status: ${kw('Offline','attn')}`);
    else overview.push(`Status: ${kw('Operating normally','ok')}`);
    overview.push(`Learning: ${kw(queueLen>0?'Signals pending review':'Signals stable', queueLen>0?'attn':'ok')}`);
    overview.push(`Review: ${kw(String(queueLen)+' item'+(queueLen===1?'':'s'),'gold')} awaiting`);

    const purpose = [
      `Direction: ${kw('Resilience + seed quality','gold')}`,
      `Method: ${kw('Evidence append-only','gold')}`,
      `Rule: ${kw('No overwrites','gold')}`
    ];

    const progress = [];
    if(queueLen>0) progress.push(`Queue: ${kw('Pending','attn')} (${queueLen})`);
    else progress.push(`Queue: ${kw('Clear','ok')}`);
    progress.push(`Capture: ${kw(requiredIncomplete?'Required incomplete':'Ready', requiredIncomplete?'attn':'ok')}`);
    progress.push(`Mode: ${kw('Coach','gold')} (calm flags)`);

    const welcome = [
      `Console: ${kw('Active','ok')}`,
      `Tip: Toggle ${kw('Offline','gold')} to test queue`,
      `Next: Use ${kw('Navigation','gold')} to enter Workbench`
    ];

    return {
      aabGovOverviewTxt: overview,
      aabGovPurposeTxt: purpose,
      aabGovProgressTxt: progress,
      aabGovWelcomeTxt: welcome
    };
  }

  function setGovText(id, html){
    const el = document.getElementById(id);
    if(!el) return;
    el.classList.add('is-fading');
    window.setTimeout(()=>{
      el.innerHTML = html;
      el.classList.remove('is-fading');
    }, 180);
  }

  function runGovLoop(state){
    if(!document.getElementById('aabGovPanelRow')) return;

    const packs = govLinePack(state);
    govLoopTick += 1;

    const pick = (arr, offset) => arr[(govLoopTick + offset) % arr.length];

    setGovText('aabGovOverviewTxt', pick(packs.aabGovOverviewTxt, 0));
    setGovText('aabGovPurposeTxt',  pick(packs.aabGovPurposeTxt, 1));
    setGovText('aabGovProgressTxt', pick(packs.aabGovProgressTxt, 2));
    setGovText('aabGovWelcomeTxt',  pick(packs.aabGovWelcomeTxt, 3));
  }

  function startGovLoop(getState){
    // Clear any existing timers (prevents interval leaks when the loop is restarted)
    if(govLoopTimer) { window.clearInterval(govLoopTimer); govLoopTimer = null; }
    if(govIntelTimer) { window.clearInterval(govIntelTimer); govIntelTimer = null; }
    govLoopTick = 0;

    runGovLoop(getState());

    // Prime intel live feed + poll (drives governance panel content)
    refreshIntelLive().then(()=>{ try{ runGovLoop(getState()); }catch(e){} });

    govIntelTimer = window.setInterval(async ()=>{
      if(document.hidden) return;
      await refreshIntelLive();
      try{ runGovLoop(getState()); }catch(e){}
    }, GOV_LOOP_MS);

    govLoopTimer = window.setInterval(()=>{
      if(document.hidden) return;
      runGovLoop(getState());
    }, GOV_LOOP_MS);

    const pause = ()=>{
      if(govLoopTimer){ window.clearInterval(govLoopTimer); govLoopTimer = null; }
      if(govIntelTimer){ window.clearInterval(govIntelTimer); govIntelTimer = null; }
    };

    const resume = ()=>{
      if(!govLoopTimer && !govIntelTimer){
        startGovLoop(getState);
      }
    };

    // Avoid stacking event listeners if startGovLoop is called repeatedly
    if(!govFocusWired){
      govFocusWired = true;
      window.addEventListener('focusin', (e)=>{
        const t = e.target;
        if(t && (t.tagName==='INPUT' || t.tagName==='TEXTAREA' || t.isContentEditable)) pause();
      });
      window.addEventListener('focusout', ()=>{
        window.setTimeout(()=>{ if(!document.hidden) resume(); }, 600);
      });
    }
  }

// ---------------- Health Modal ----------------
  function openHealth() {
    const m = $('#aabModal');
    const b = $('#aabModalBackdrop');
    if (!m || !b) return;
    b.style.display = 'block';
    m.style.display = 'block';
    refreshHealth();
  }

  function closeHealth() {
    const m = $('#aabModal');
    const b = $('#aabModalBackdrop');
    if (!m || !b) return;
    b.style.display = 'none';
    m.style.display = 'none';
  }

  async function refreshHealth() {
    const kv = $('#aabHealthKV');
    if (!kv) return;

    const ql = queueLen();
    const req = requiredState();

    let apiOk = false;
    try {
      // Same-origin api.php entrypoint (works on plain PHP hosting)
      const res = await AAB.aabFetch('./api.php?action=ping', { method: 'GET' });
      apiOk = res.ok;
    } catch (_) {
      apiOk = false;
    }

    const authOk = !!(AAB.hasAuthToken && AAB.hasAuthToken(intel()));

    // Optional: governance-grade "System Ready" signal (trial-level)
    let systemReady = '—';
    try {
      const tid = localStorage.getItem('aab_selected_trial_v1');
      if (tid && authOk) {
        const d = new Date();
        const ymd = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const u = new URL('./api.php', window.location.href);
        u.searchParams.set('action','system_health');
        u.searchParams.set('trial_id', tid);
        u.searchParams.set('ymd', ymd);
        const r2 = await AAB.aabFetch(u.toString(), { method:'GET' });
        const js = await r2.json().catch(()=>null);
        if (r2.ok && js && js.ok) systemReady = String(js.status || '—');
      }
    } catch (_) { /* ignore */ }

    const rows = [
      ['Network', navigator.onLine ? 'Online' : 'Offline'],
      ['Auth', authOk ? 'OK' : 'Missing'],
      ['API reachable', apiOk ? 'OK' : 'Not reachable'],
      ['System Ready', systemReady],
      ['Queue', String(ql)],
      ['Required', req.known ? `${req.done}/${req.total}` : 'Unknown'],
      ['Last event', (readJSON(ledgerKeys().state, {}).last_evt_ts) || '—']
    ];

    kv.innerHTML = rows.map(([k, v]) => (
      `<div class="k">${escapeHtml(k)}</div><div class="v">${escapeHtml(v)}</div>`
    )).join('');
  }

  // ---------------- Signature wow: playback ----------------
  function attachReadyPillClick() {
    const pill = $('#aabReadyPill');
    if (!pill) return;
    pill.style.cursor = 'pointer';
    pill.title = 'Click for why + playback';
    pill.addEventListener('click', () => {
      const events = ledgerRecentEvents(60);
      const allow = new Set(intel().signature_wow?.playback?.events || []);
      const max = intel().signature_wow?.playback?.max_items || 5;
      const filtered = events.filter(e => allow.has(e.type)).slice(-max).reverse();

      const req = requiredState();
      const ql = queueLen();
      const reasons = [];
      if (!(AAB.hasAuthToken && AAB.hasAuthToken(intel()))) reasons.push('Auth required');
      else {
        if (req.known && req.total > 0 && req.done < req.total) reasons.push(`Missing required metrics (${req.done}/${req.total})`);
        if (ql > 0) reasons.push(`Queue has ${ql} item(s)`);
        if (!reasons.length) reasons.push('All checks good');
      }

      const msg = `Why: ${reasons.join(' + ')}`;
      toast(msg, reasons[0] === 'All checks good' ? 'ok' : 'attn');

      if (filtered.length) {
        const lines = filtered.map(e => `• ${e.type} @ ${e.ts.split('T')[1].slice(0,8)}`).join('\n');
        alert(`${msg}\n\nRecent changes:\n${lines}`);
      } else {
        alert(msg);
      }
    });
  }

// ---------------- Optional learning note panel + quality gate ----------------
function mountLearningNote() {
  const cfg = intel().learning_note_panel;
  if (!cfg?.enabled) return;

  const host = document.getElementById('aabOptionalNote');
  if (!host) return;

  const confidenceLevels = cfg.confidence_levels || ['low','med','high'];

  host.innerHTML = `
    <div class="card" style="margin-top:12px" id="aabFieldInterpretationCard">
      <div class="card-h">
        <h2>Field Interpretation (required)</h2>
        <button class="btn" id="aabNoteToggle" type="button"><span class="badge">▾</span>Toggle</button>
      </div>

      <div class="card-b" id="aabNoteBody" style="display:block">
        <div class="small" style="margin-bottom:10px">
          Required before final save. Clean observations now = cleaner AI learning later.
        </div>

        <div class="grid two">
          <div class="field">
            <label>What changed since last observation?</label>
            <textarea id="aabNoteChanged" placeholder="Example: Leaf colour improved slightly; growth appears stronger than last visit."></textarea>
          </div>

          <div class="field">
            <label>Anything outside expected behaviour?</label>
            <textarea id="aabNoteUnusual" placeholder="Example: One plot shows edge yellowing not seen in nearby plots."></textarea>
          </div>
        </div>

        <div class="field" style="margin-top:10px">
          <label>Confidence</label>
          <select id="aabNoteConfidence">
            <option value="">Select confidence…</option>
            ${confidenceLevels.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}
          </select>
        </div>

        <div class="card" style="margin-top:12px;background:rgba(255,255,255,0.03)" id="aabNoteQualityCard">
          <div class="card-h">
            <h2 style="font-size:15px">AI Learning Quality</h2>
            <span class="badge" id="aabNoteQualityBadge">Not ready</span>
          </div>
          <div class="card-b">
            <div class="small" id="aabNoteQualityMsg">Add field interpretation to score learning quality.</div>
            <div class="field" style="margin-top:10px">
              <label>Suggested cleaner learning note</label>
              <textarea id="aabNoteRewrite" readonly placeholder="A clean AI-friendly rewrite will appear here before save."></textarea>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
              <button class="btn" id="aabUseRewrite" type="button" disabled>
                <span class="badge">↺</span>Use Suggested Rewrite
              </button>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
          <button class="btn" id="aabNoteSave" type="button">
            <span class="badge">✓</span>Save Field Interpretation
          </button>
        </div>
      </div>
    </div>
  `;

  const body = document.getElementById('aabNoteBody');

  function noteValue(){
    return {
      changed: document.getElementById('aabNoteChanged')?.value.trim() || '',
      unusual: document.getElementById('aabNoteUnusual')?.value.trim() || '',
      confidence: document.getElementById('aabNoteConfidence')?.value || ''
    };
  }

  function scoreNote(note){
    const txt = `${note.changed} ${note.unusual}`.trim();
    let score = 0;
    const tips = [];

    if (note.changed || note.unusual) score += 30;
    else tips.push('Add what changed or what looked unusual.');

    if (note.confidence) score += 20;
    else tips.push('Select confidence.');

    if (txt.length >= 40) score += 20;
    else tips.push('Add a little more field detail.');

    if (/\b(improved|declined|increased|reduced|stable|yellowing|wilting|growth|leaf|root|pest|disease|moisture|colour|color|height|canopy)\b/i.test(txt)) {
      score += 15;
    } else {
      tips.push('Use observable crop words like growth, colour, leaf, moisture, pest, disease, or stability.');
    }

    if (!/\b(good|bad|ok|fine|better|worse)\b\s*$/i.test(txt)) score += 15;
    else tips.push('Avoid vague endings like good, bad, ok, better, or worse.');

    score = Math.min(100, score);

    let level = 'Weak';
    if (score >= 80) level = 'Strong';
    else if (score >= 60) level = 'Usable';

    return { score, level, tips };
  }

  function buildRewrite(note){
    const changed = note.changed || 'No clear observed change recorded';
    const unusual = note.unusual || 'No unusual signal recorded';
    const confidence = note.confidence || 'not selected';

    return `[AI Learning Rewrite]
AI Learning Summary:
Observed change = ${changed}
Unusual signal = ${unusual}
Agronomist confidence = ${confidence}
Interpretation source = human agronomist field note`;
  }

  function validateNote(){
    const note = noteValue();
    const card = document.getElementById('aabFieldInterpretationCard') || body?.closest('.card');
    const saveBtn = document.getElementById('aabNoteSave');
    const rewriteEl = document.getElementById('aabNoteRewrite');
    const useBtn = document.getElementById('aabUseRewrite');
    const badge = document.getElementById('aabNoteQualityBadge');
    const msg = document.getElementById('aabNoteQualityMsg');

    const valid = !!((note.changed || note.unusual) && note.confidence);
    const scored = scoreNote(note);
    const rewrite = buildRewrite(note);

    if (rewriteEl) rewriteEl.value = valid ? rewrite : '';

    if (badge) badge.textContent = valid ? `${scored.level} · ${scored.score}/100` : 'Not ready';

    if (msg) {
      msg.textContent = valid
        ? (scored.tips.length ? scored.tips.join(' ') : 'Strong learning signal. Ready to save.')
        : 'Add what changed or what was unusual, plus confidence.';
    }

    if (useBtn) {
      useBtn.disabled = !valid;
      useBtn.style.opacity = valid ? '1' : '0.55';
    }

    if(card){
      if(!valid){
        card.style.border = '1px solid rgba(255,80,80,0.65)';
        card.style.boxShadow = '0 0 0 1px rgba(255,80,80,0.18)';
      } else if(scored.score < 60 || note.confidence === 'low'){
        card.style.border = '1px solid rgba(243,183,79,0.45)';
        card.style.boxShadow = '0 0 0 1px rgba(243,183,79,0.18)';
      } else {
        card.style.border = '';
        card.style.boxShadow = '';
      }
    }

    if(saveBtn){
      saveBtn.disabled = !valid;
      saveBtn.style.opacity = valid ? '1' : '0.55';
      saveBtn.title = valid ? 'Save Field Interpretation' : 'Add what changed or what was unusual, plus confidence';
    }

    return { valid, note, scored, rewrite };
  }

  document.getElementById('aabNoteToggle')?.addEventListener('click', () => {
    if (!body) return;
    body.style.display = (body.style.display === 'none') ? 'block' : 'none';
    validateNote();
  });

  document.getElementById('aabNoteChanged')?.addEventListener('input', validateNote);
  document.getElementById('aabNoteUnusual')?.addEventListener('input', validateNote);
  document.getElementById('aabNoteConfidence')?.addEventListener('change', validateNote);

  document.getElementById('aabUseRewrite')?.addEventListener('click', () => {
    const result = validateNote();
    if(!result.valid) return;
    document.getElementById('aabNoteUnusual').value = result.rewrite;
    document.getElementById('aabNoteUnusual').value = '';
    toast('Cleaner AI learning note applied ✓', 'ok');
    validateNote();
  });

  document.getElementById('aabNoteSave')?.addEventListener('click', () => {
    const result = validateNote();

    if(!result.valid){
      toast('Field Interpretation required before saving', 'attn');
      try{
        if (body) body.style.display = 'block';
        body?.scrollIntoView({ behavior:'smooth', block:'center' });
      }catch(_){}
      return;
    }

    const trialId =
      localStorage.getItem('aab_active_trial_id') ||
      localStorage.getItem('aab_selected_trial_v1') ||
      localStorage.getItem('aab_last_trial_id') ||
      null;

    const key = `${cfg.storage?.key_prefix || 'aab_note_v1_'}${trialId || 'global'}`;

    writeJSON(key, {
      ts: nowISO(),
      ...result.note,
      quality_score: result.scored.score,
      quality_level: result.scored.level,
      quality_tips: result.scored.tips,
      ai_learning_rewrite: result.rewrite
    });

    ledgerAppend({
      id: uid('evt'),
      ts: nowISO(),
      type: 'field_interpretation.saved',
      trial_id: trialId,
      net: { online: navigator.onLine },
      queue: { len: queueLen() },
      payload: {
        note: result.note,
        quality_score: result.scored.score,
        quality_level: result.scored.level,
        ai_learning_rewrite: result.rewrite
      }
    });

    toast(`Field Interpretation saved · ${result.scored.level} ${result.scored.score}/100`, 'ok');
    validateNote();
  });

  validateNote();
}

  // ---------------- logout / export / import ----------------
  function logout() {
    const key = intel().runtime?.auth?.token_key || 'aab_auth_token_v1';
    localStorage.removeItem(key);
    ledgerAppend({ id: uid('evt'), ts: nowISO(), type: 'auth.logout', net: { online: navigator.onLine }, queue: { len: queueLen() } });
    toast('Logged out', 'attn');
    AAB.redirectToAuth?.(intel());
  }

  function exportData() {
    const dump = {
      intel: intel(),
      status_map: readStatusMap(),
      queue: queueRead(),
      ledger_state: readJSON(ledgerKeys().state, {}),
      ts: nowISO()
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aab_export_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Exported ✓', 'ok');
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.status_map) writeJSON(intel().contracts.status_map_key, data.status_map);
        if (Array.isArray(data.queue)) queueWrite(data.queue);
        toast('Imported ✓', 'ok');
        updatePills();
      } catch (e) {
        toast('Import failed', 'halt');
      }
    };
    input.click();
  }

  // ---------------- Init ----------------
  async function init() {
    // Ensure intel loaded (aab-session loads it, but be resilient)
    if (!AAB.intel && AAB.loadIntel) await AAB.loadIntel();

    updatePills();
    attachReadyPillClick();
    mountLearningNote();

    window.addEventListener('online', updatePills);
    window.addEventListener('offline', updatePills);

    // Expose API
    AAB.toast = toast;
    AAB.uid = uid;
    AAB.nowISO = nowISO;
    AAB.queueLen = queueLen;
    AAB.ledgerAppend = ledgerAppend;
    AAB.ledgerRecentEvents = ledgerRecentEvents;
    AAB.queueEnqueue = queueEnqueue;
    AAB.queueSync = queueSync;
    AAB.updatePills = updatePills;
    AAB.openHealth = openHealth;
    AAB.closeHealth = closeHealth;
    AAB.refreshHealth = refreshHealth;
    AAB.logout = logout;
    AAB.exportData = exportData;
    AAB.importData = importData;
    AAB.detectAnomalies = detectAnomalies;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
