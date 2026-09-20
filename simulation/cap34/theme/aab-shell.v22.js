// aab-shell.v22.js — Workbench shell glue across all pages
// Injects: default nav, mini console, global health hotkey, and keeps mini console in sync.

(() => {
  const AAB = (window.AAB = window.AAB || {});

  const DEFAULT_NAV = [
    { label: 'Dashboard', href: 'indexDASH.html' },
    { label: 'Formulation Build', href: 'formulation_build.html' },
    { label: 'Field Ops', href: 'field_ops.html' },
    { label: 'Workbench', href: 'workbench.html' },
    { label: 'Trials', href: 'trials.html' },
    { label: 'Plots', href: 'plots.html' },
    { label: 'Capture', href: 'capture.html' },
    { label: 'Observations', href: 'observations.html' },
    { label: 'Templates', href: 'templates.html' },
    { label: 'Matrix Explorer', href: 'matrix_explorer.html' },
    { label: 'Hypotheses', href: 'hypotheses.html' },
    { label: 'Audit', href: 'audit.html' }
  ];

  function ensureBodyDatasets() {
    if (!document.body) return;
    if (!document.body.dataset.aabNav) {
      try {
        document.body.dataset.aabNav = JSON.stringify(DEFAULT_NAV);
      } catch (_) {}
    }
    if (!document.body.dataset.aabNavLabel) {
      document.body.dataset.aabNavLabel = 'Navigation';
    }
    // Default toolbar if not provided (pages can override)
    if (!document.body.dataset.aabToolbar) {
      document.body.dataset.aabToolbar = 'home,refresh,diag,sync,logout';
    }
  }

  // Make sure datasets exist BEFORE aab-chrome runs its DOMContentLoaded injection.
  // Deferred scripts execute in order after parsing; this runs immediately.
  ensureBodyDatasets();

  function miniConsoleHTML() {
    return `
      <div id="aabMiniConsole" aria-label="AAB Mini Console">
        <span class="aab-net" id="aabNet" title="Network status" aria-label="Network status"></span>
        <div class="aab-heart is-quiet" id="aabHeart" title="System pulse (click for health)" aria-label="System pulse" role="img">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path class="lobe" d="M9.2 6.6c2.0 0 3.4 1.3 3.9 2.8.5-1.6 1.9-2.8 3.9-2.8 2.4 0 4.0 1.7 4.0 4.1 0 3.1-3.0 5.6-7.9 9.0-4.9-3.4-7.9-5.9-7.9-9.0 0-2.4 1.6-4.1 4.0-4.1z" />
          </svg>
        </div>
        <button class="aab-mini-btn" id="openHealth" type="button" title="System Health (H)">Health</button>
      </div>
    `.trim();
  }

  function isTypingTarget(el) {
    if (!el) return false;
    const tag = (el.tagName || '').toUpperCase();
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
  }

  function setHeart(state) {
    const heart = document.getElementById('aabHeart');
    if (!heart) return;
    heart.classList.remove('is-quiet', 'is-ok', 'is-active', 'is-attn', 'is-halt');
    heart.classList.add(state);
  }

  function updateMiniFromPills() {
    // Network
    const netDot = document.getElementById('aabNet');
    if (netDot) {
      netDot.classList.remove('is-loading', 'is-online', 'is-offline');
      if (!navigator.onLine) netDot.classList.add('is-offline');
      else netDot.classList.add('is-online');
    }

    // Heart mirrors Overall pill state (worst-case)
    const overall = document.getElementById('aabOverallPill');
    if (!overall) {
      setHeart(navigator.onLine ? 'is-ok' : 'is-attn');
      return;
    }
    if (overall.classList.contains('halt')) setHeart('is-halt');
    else if (overall.classList.contains('attn')) setHeart('is-attn');
    else if (overall.classList.contains('ok')) setHeart('is-ok');
    else setHeart('is-quiet');
  }

  function injectMiniConsoleIfMissing() {
    if (document.getElementById('aabMiniConsole')) return false;
    const host = document.createElement('div');
    host.innerHTML = miniConsoleHTML();
    document.body.appendChild(host.firstElementChild);
    return true;
  }

  function wireMiniConsole() {
    const btn = document.getElementById('openHealth');
    const heart = document.getElementById('aabHeart');

    const open = () => {
      // Prefer shared modal from aab-features.
      if (window.AAB && typeof window.AAB.openHealth === 'function') {
        window.AAB.openHealth();
      } else {
        // Fallback to opening diag page.
        window.open('./api.php?action=diag', '_blank');
      }
    };

    if (btn) btn.addEventListener('click', open);
    if (heart) heart.addEventListener('click', open);

    // Hotkey: H opens health. Avoid hijacking typing.
    document.addEventListener('keydown', (e) => {
      if (e.defaultPrevented) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        open();
      }
    }, true);

    // Keep net/heart synced
    window.addEventListener('online', updateMiniFromPills);
    window.addEventListener('offline', updateMiniFromPills);
  }

  function hookUpdatePills() {
    if (AAB.__aabShellHooked) return;
    if (typeof AAB.updatePills !== 'function') return;

    const orig = AAB.updatePills.bind(AAB);
    AAB.updatePills = function(...args) {
      const out = orig(...args);
      try { updateMiniFromPills(); } catch (_) {}
      return out;
    };

    AAB.__aabShellHooked = true;
    try { updateMiniFromPills(); } catch (_) {}
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Only wire the mini console if we injected it (avoids double-wiring on pages
    // that already ship their own Workbench console).
    let inserted = false;
    try { inserted = !!injectMiniConsoleIfMissing(); } catch (_) { inserted = false; }
    if (inserted) {
      try { wireMiniConsole(); } catch (_) {}
    }

    // Hook pills after features initializes.
    // Features also runs on DOMContentLoaded; give it a tick.
    window.setTimeout(() => {
      try { hookUpdatePills(); } catch (_) {}
      // Also update once even if updatePills isn't hooked yet.
      try { updateMiniFromPills(); } catch (_) {}
    }, 0);
  });
})();
