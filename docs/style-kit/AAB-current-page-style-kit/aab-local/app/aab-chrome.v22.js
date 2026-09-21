// aab-chrome.js v2 (adds Overall + Nav pills)
(() => {
  const AAB = (window.AAB = window.AAB || {});

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>\"]/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;'
    }[c]));
  }

  const ICON = {
    home: '⌂',
    nav: '≡',
    sync: '↻',
    export: '⇩',
    import: '⇧',
    refresh: '⟲',
    diag: '●',
    logout: '⎋'
  };

  const DEFAULT_NAV_SECTIONS = [
    { section_code:'OVERVIEW', section_label:'Overview', items:[
      { item_code:'dashboard', item_label:'Dashboard', href:'/aab-local/app/indexDASH.html' }
    ]},
    { section_code:'WORK', section_label:'Work', items:[
      { item_code:'workbench', item_label:'Workbench', href:'/aab-local/app/_rebuild/workbench.html' },
      { item_code:'trials', item_label:'Trials', href:'/aab-local/app/trials.html' },
      { item_code:'observations', item_label:'Observations', href:'/aab-local/app/observations.html' },
      { item_code:'plots', item_label:'Plots', href:'/aab-local/app/plots.html' }
    ]},
    { section_code:'LIBRARIES', section_label:'Libraries', items:[
      { item_code:'libraries', item_label:'Libraries', href:'/aab-local/app/_rebuild/libraries.html' },
      { item_code:'ingredients', item_label:'Ingredients', href:'/aab-local/app/_rebuild/ingredients.html' }
    ]},
    { section_code:'INTELLIGENCE', section_label:'Intelligence', items:[
      { item_code:'hypotheses', item_label:'Hypotheses', href:'/aab-local/app/hypotheses.html' }
    ]},
    { section_code:'SETTINGS', section_label:'Settings', items:[
      { item_code:'settings', item_label:'Settings & Administration', href:'/aab-local/app/_rebuild/settings.html' }
    ]}
  ];

  function getLegacyNavLinks() {
    const raw = document.body.dataset.aabNav;
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (_) {}
    return null;
  }

  function currentPath() {
    return (location.pathname || '').replace(/\/+$/, '').toLowerCase();
  }

  function renderNavSections(sections, domains) {
    const host = document.getElementById('aabNavSections');
    if (!host) return;
    const here = currentPath();
    const safeSections = Array.isArray(sections) && sections.length ? sections : DEFAULT_NAV_SECTIONS;
    host.innerHTML = safeSections.map(section => {
      const items = Array.isArray(section.items) ? section.items : [];
      if (!items.length) return '';
      const rows = items.map(x => {
        const href = x.href || '#';
        let targetPath = '';
        try { targetPath = new URL(href, location.origin).pathname.replace(/\/+$/, '').toLowerCase(); } catch (_) { targetPath = String(href).toLowerCase(); }
        const active = here === targetPath;
        return active
          ? `<span class="aab-navitem is-current" aria-current="page"><span>${escapeHtml(x.item_label || x.label || '')}</span><small>Current</small></span>`
          : `<a class="aab-navitem" href="${escapeHtml(href)}"><span>${escapeHtml(x.item_label || x.label || '')}</span><small>Open</small></a>`;
      }).join('');
      return `<section class="aab-navsection"><div class="aab-navsection-title">${escapeHtml(section.section_label || section.label || '')}</div>${rows}</section>`;
    }).join('');

    const domainHost = document.getElementById('aabDomainList');
    if (domainHost) {
      const list = Array.isArray(domains) && domains.length ? domains : [{domain_code:'AGRICULTURE',domain_name:'Agriculture',enabled:true,lifecycle_status:'ACTIVE'}];
      domainHost.innerHTML = list.map(d => {
        const enabled = !!d.enabled;
        const cls = enabled ? 'aab-domainchip is-enabled' : 'aab-domainchip';
        const suffix = enabled ? 'Active' : (d.lifecycle_status || 'Registered');
        return `<span class="${cls}" title="${escapeHtml(suffix)}">${escapeHtml(d.domain_name || d.domain_code)}<small>${escapeHtml(suffix)}</small></span>`;
      }).join('');
    }
  }

  async function loadPlatformNavigation() {
    const legacy = getLegacyNavLinks();
    if (legacy) {
      renderNavSections([{section_code:'PAGE',section_label:'Page Navigation',items:legacy.map((x,i)=>({item_code:'legacy_'+i,item_label:x.label,href:x.href}))}], null);
    } else {
      renderNavSections(DEFAULT_NAV_SECTIONS, null);
    }
    try {
      const api = location.pathname.includes('/_rebuild/')
        ? './api.php?action=platform_navigation_context'
        : '/aab-local/app/_rebuild/api.php?action=platform_navigation_context';
      const res = await fetch(api,{credentials:'include',cache:'no-store'});
      if (!res.ok) return;
      const data = await res.json();
      if (!data || data.ok !== true || !data.navigation) return;
      renderNavSections(data.navigation.sections || [], data.navigation.domains || []);
      const pill = document.getElementById('aabNavPill');
      if (pill) {
        const t = pill.querySelector('span:last-child');
        if (t) t.textContent = 'AAB Menu';
      }
    } catch (_) {}
  }

function ensureCanonicalNavigation(){
  const CSS_ID='aabNavV24Css';
  const JS_ID='aabNavV24Script';
  if(!document.getElementById(CSS_ID)){
    const l=document.createElement('link');
    l.id=CSS_ID;l.rel='stylesheet';l.href='/aab-local/app/aab-navigation.v24.css?v=24';
    document.head.appendChild(l);
  }
  if(!document.getElementById(JS_ID) && !window.AAB_NAV_V24){
    const s=document.createElement('script');
    s.id=JS_ID;s.src='/aab-local/app/aab-navigation.v24.js?v=24';s.defer=true;
    document.head.appendChild(s);
  }
}

function enableDragNav(){
  const menu = document.getElementById('aabNavMenu');
  if(!menu) return;
  const handle = menu.querySelector('.card-h');
  if(!handle) return;

  menu.style.position = 'fixed';
  menu.style.left = menu.style.left || '16px';
  menu.style.top = menu.style.top || '84px';
  menu.style.right = 'auto';
  menu.style.bottom = 'auto';
  menu.style.zIndex = 9999;

  try{
    const saved = JSON.parse(localStorage.getItem('aab_nav_pos') || 'null');
    if(saved && typeof saved.x === 'number' && typeof saved.y === 'number'){
      menu.style.left = saved.x + 'px';
      menu.style.top = saved.y + 'px';
    }
  }catch(e){}

  let dragging=false, startX=0, startY=0, origX=0, origY=0;
  handle.style.cursor = 'move';
  handle.style.userSelect = 'none';

  handle.addEventListener('mousedown', (e)=>{
    dragging=true;
    startX=e.clientX; startY=e.clientY;
    origX=parseInt(menu.style.left||'0',10);
    origY=parseInt(menu.style.top||'0',10);
    e.preventDefault();
  });

  window.addEventListener('mousemove',(e)=>{
    if(!dragging) return;
    const dx=e.clientX-startX;
    const dy=e.clientY-startY;
    menu.style.left=(origX+dx)+'px';
    menu.style.top=(origY+dy)+'px';
  });

  window.addEventListener('mouseup',()=>{
    if(!dragging) return;
    dragging=false;
    try{
      localStorage.setItem('aab_nav_pos', JSON.stringify({
        x: parseInt(menu.style.left||'0',10),
        y: parseInt(menu.style.top||'0',10)
      }));
    }catch(e){}
  });
}

  function toolbarButtons(list) {
    const items = (list || '').split(',').map((s) => s.trim()).filter(Boolean);
    const out = [];
    for (const key of items) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      out.push(
        `<button class="btn" data-aab-action="${escapeHtml(key)}"><span class="badge">${ICON[key] || '•'}</span>${escapeHtml(label)}</button>`
      );
    }
    return out.join('');
  }

  function injectHeader() {
function applyNavPillLabel(){
  const p = document.getElementById('aabNavPill');
  if(!p) return;
  const desired = (document.body && document.body.dataset && document.body.dataset.aabNavLabel) ? document.body.dataset.aabNavLabel : '';
  if(!desired) return;
  const s = p.querySelector('span:last-child');
  if(s) s.textContent = desired;
  p.setAttribute('title', desired);
}

    const title = document.body.dataset.aabTitle || 'AAB Workbench';
    const sub = document.body.dataset.aabSub || '';
    const toolbar = document.body.dataset.aabToolbar || 'nav,home,refresh,diag';

    const hdr = el(`
      <header class="aab-header" id="aabHeader">
        <div class="aab-header-inner">
          <div class="aab-title">
            <h1>${escapeHtml(title)}</h1>
            <p>${escapeHtml(sub)}</p>
          </div>

          <div class="aab-pillrow">
            <span class="pill" id="aabNetPill"><span class="dot"></span>
            <span class="pill goldline" id="aabDatePill" title="Today"><span class="dot gold"></span><span>—</span></span><span>…</span></span>
            <span class="pill" id="aabQueuePill"><span class="dot"></span><span>Queue: 0</span></span>
            <span class="pill" id="aabReadyPill"><span class="dot"></span><span>…</span></span>
            <span class="pill goldline" id="aabOverallPill" title="Overall status"><span class="dot gold"></span><span>Overall: —</span></span>
            <span class="pill goldline" id="aabNavPill" data-aab-action="nav" title="Navigation"><span class="dot gold"></span><span>Navigation</span></span>

            <div class="toolbar" id="aabToolbar">${toolbarButtons(toolbar)}</div>

            <span class="pill goldline" id="aabHealthPill" data-aab-action="diag" title="System Health"><span class="dot gold"></span><span>System Health</span></span>
          </div>
        </div>
      </header>
    `);

    document.body.prepend(hdr);

    
    applyNavPillLabel();
// Dashboard governance panels (only when requested)
    const govWanted = document.body?.dataset?.aabGov;
    if(govWanted){
      const banner = el(`
        <div class="aab-loop-banner" id="aabLoopBanner">
          Observation → Hypothesis → Formulation Candidate → Trial Evidence → Learning Signal → New Hypothesis
        </div>
      `);
      hdr.insertAdjacentElement('afterend', banner);

      const row = el(`
        <div class="aab-govrow" id="aabGovPanelRow">
          <div class="gov-panel" id="aabGovOverview">
            <div class="gov-h"><span class="dot gold"></span><span class="gov-t">Overview</span></div>
            <div class="gov-s" id="aabGovOverviewTxt">—</div>
          </div>
          <div class="gov-panel" id="aabGovPurpose">
            <div class="gov-h"><span class="dot gold"></span><span class="gov-t">Purpose</span></div>
            <div class="gov-s" id="aabGovPurposeTxt">—</div>
          </div>
          <div class="gov-panel" id="aabGovProgress">
            <div class="gov-h"><span class="dot gold"></span><span class="gov-t">Progress</span></div>
            <div class="gov-s" id="aabGovProgressTxt">—</div>
          </div>
          <div class="gov-panel" id="aabGovWelcome">
            <div class="gov-h"><span class="dot gold"></span><span class="gov-t">Welcome</span></div>
            <div class="gov-s" id="aabGovWelcomeTxt">—</div>
          </div>
        </div>
      `);
      banner.insertAdjacentElement('afterend', row);
    }
// Canonical navigation is owned by aab-navigation.v24.js.
// Legacy page-specific and platform menus are intentionally not created here.
ensureCanonicalNavigation();

    // Toast host
    if (!document.querySelector('.toast-host')) {
      document.body.append(el('<div class="toast-host" id="aabToastHost" aria-live="polite" aria-atomic="true"></div>'));
    }

    // Modal
    if (!document.getElementById('aabModalBackdrop')) {
      document.body.append(el('<div class="modal-backdrop" id="aabModalBackdrop"></div>'));
      document.body.append(el(`
        <div class="modal" id="aabModal">
          <div class="card">
            <div class="card-h">
              <h2>System Health</h2>
              <div style="display:flex;gap:8px;align-items:center">
                <button class="btn" id="aabModalRefresh" data-aab-action="diag_refresh"><span class="badge">⟳</span>Refresh</button>
                <button class="btn danger" id="aabModalClose" data-aab-action="diag_close"><span class="badge">×</span>Close</button>
              </div>
            </div>
            <div class="card-b">
              <div class="kv" id="aabHealthKV"></div>
              <div class="details">
                <details>
                  <summary>Why this matters</summary>
                  <div class="small" style="margin-top:10px">
                    AAB uses a calm, auditable approach: evidence is append-only, offline work is queued, and readiness is explainable.
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>
      `));
    }
  }

  function toggleNav(open) {
    ensureCanonicalNavigation();
    if (window.AAB_NAV_V24 && typeof window.AAB_NAV_V24.toggle === 'function') {
      window.AAB_NAV_V24.toggle(open);
      return;
    }
    window.dispatchEvent(new CustomEvent('aab:navigation-toggle', { detail: { open } }));
  }

  function onToolbarClick(e) {
    const btn = e.target.closest('[data-aab-action]');
    if (!btn) return;
    const act = btn.dataset.aabAction;
    switch (act) {
      case 'home':
        location.href = '/aab-local/app/indexDASH.html';
        break;
      case 'nav':
        toggleNav();
        break;
      case 'refresh':
        location.reload();
        break;
      case 'sync':
        AAB.queueSync?.();
        break;
      case 'export':
        AAB.exportData?.();
        break;
      case 'import':
        AAB.importData?.();
        break;
      case 'diag':
        AAB.openHealth?.();
        break;
      case 'logout':
        AAB.logout?.();
        break;
      case 'diag_refresh':
        AAB.refreshHealth?.();
        break;
      case 'diag_close':
        AAB.closeHealth?.();
        break;
      default:
        // allow pages to hook additional actions
        AAB.onAction?.(act);
    }
  }

  function wire() {
    const header = document.getElementById('aabHeader');
    if (!header) return;
    header.addEventListener('click', onToolbarClick);

    const backdrop = document.getElementById('aabModalBackdrop');
    backdrop?.addEventListener('click', () => AAB.closeHealth?.());
  }

  document.addEventListener('DOMContentLoaded', () => {
    injectHeader();
    wire();
    ensureCanonicalNavigation();
  });
})();
