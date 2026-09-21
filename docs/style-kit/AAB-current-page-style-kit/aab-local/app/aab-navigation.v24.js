(() => {
  if (window.AAB_NAV_V24?.installed) return;

  const API = '/aab-local/app/_rebuild/api.php?action=platform_navigation_context';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cleanPath = p => String(p || '').replace(/[?#].*$/, '').replace(/\/$/, '').toLowerCase();
  let drawer = null;
  let navData = null;

  function removeLegacyNavigation() {
    ['aabNavMenu','aabNavV23'].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.aab-navmenu').forEach(el => {
      if (el.id !== 'aabNavV24') el.remove();
    });
    document.querySelectorAll('[data-aab-v23-nav]').forEach(el => el.remove());
  }

  function getMenuTriggers() {
    return [...document.querySelectorAll('#aabNavPill,[data-aab-action="nav"]')];
  }

  function close() {
    drawer?.classList.remove('open');
    document.body.classList.remove('aab-nav-open');
  }

  function open() {
    if (!drawer) installDrawer();
    drawer?.classList.add('open');
    document.body.classList.add('aab-nav-open');
    load();
  }

  function toggle(force) {
    const shouldOpen = typeof force === 'boolean' ? force : !drawer?.classList.contains('open');
    shouldOpen ? open() : close();
  }

  function installDrawer() {
    removeLegacyNavigation();
    if (drawer && document.body.contains(drawer)) return drawer;
    drawer = document.createElement('aside');
    drawer.id = 'aabNavV24';
    drawer.setAttribute('aria-label','AAB navigation');
    drawer.innerHTML = '<div class="nv24-loading">Loading AAB navigation…</div>';
    document.body.appendChild(drawer);
    return drawer;
  }

  function sectionClass(code) {
    return code === 'COUNTRY_ADMIN' ? 'nv24-section nv24-country' : 'nv24-section';
  }

  function render() {
    if (!drawer || !navData?.navigation) return;
    const n = navData.navigation;
    const domains = Array.isArray(n.domains) ? n.domains : [];
    const activeDomain = domains.find(d => d.enabled) || domains[0] || null;
    const current = cleanPath(location.pathname);
    const sections = (n.sections || []).filter(s => Array.isArray(s.items) && s.items.length);

    drawer.innerHTML = `
      <div class="nv24-head">
        <div>
          <div class="nv24-title">AAB</div>
          <div class="nv24-sub">Platform navigation</div>
        </div>
        <button type="button" class="nv24-close" aria-label="Close navigation">×</button>
      </div>
      <div class="nv24-scroll">
        ${domains.length ? `
          <div class="nv24-domain-block">
            <div class="nv24-label">Domain</div>
            <button type="button" class="nv24-domain-current" aria-expanded="false">
              <span><strong>${esc(activeDomain?.domain_name || 'Choose domain')}</strong><span class="nv24-state active">${esc(activeDomain?.lifecycle_status || '')}</span></span>
              <span class="nv24-chevron">⌄</span>
            </button>
            <div class="nv24-domain-list" hidden>
              ${domains.map(d => `
                <button type="button" class="nv24-domain-option ${d.enabled ? 'enabled' : ''}" ${d.enabled ? '' : 'disabled'}>
                  <span>${esc(d.domain_name || d.domain_code)}</span>
                  <span class="nv24-state ${d.enabled ? 'active' : ''}">${esc(d.lifecycle_status || '')}</span>
                </button>`).join('')}
            </div>
          </div>` : ''}

        ${sections.map(section => `
          <section class="${sectionClass(section.section_code)}">
            <div class="nv24-label">${esc(section.section_label)}</div>
            <div class="nv24-items">
              ${(section.items || []).map(item => {
                const active = cleanPath(item.href) === current;
                return `<a class="nv24-item ${active ? 'active' : ''}" href="${esc(item.href)}" ${active ? 'aria-current="page"' : ''}>
                  <span>${esc(item.item_label)}</span><span class="nv24-arrow">›</span>
                </a>`;
              }).join('')}
            </div>
          </section>`).join('')}
      </div>`;

    drawer.querySelector('.nv24-close')?.addEventListener('click', close);
    const domainButton = drawer.querySelector('.nv24-domain-current');
    const domainList = drawer.querySelector('.nv24-domain-list');
    domainButton?.addEventListener('click', () => {
      const nowHidden = !domainList.hidden;
      domainList.hidden = nowHidden;
      domainButton.setAttribute('aria-expanded', String(!nowHidden));
    });
  }

  async function load() {
    try {
      const r = await fetch(API, { credentials:'include', cache:'no-store' });
      const data = await r.json();
      if (!r.ok || data?.ok !== true || !data.navigation) throw new Error(data?.error || 'Navigation unavailable');
      navData = data;
      render();
    } catch (e) {
      if (!drawer) return;
      drawer.innerHTML = `<div class="nv24-head"><div><div class="nv24-title">AAB</div><div class="nv24-sub">Platform navigation</div></div><button type="button" class="nv24-close">×</button></div><div class="nv24-error">${esc(e.message)}</div>`;
      drawer.querySelector('.nv24-close')?.addEventListener('click', close);
    }
  }

  function bindTriggers() {
    getMenuTriggers().forEach(el => {
      if (el.dataset.aabNavV24Bound === '1') return;
      el.dataset.aabNavV24Bound = '1';
      el.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }, true);
      const text = el.querySelector('span:last-child');
      if (text && /^(navigation|nav|aab menu)$/i.test(text.textContent.trim())) text.textContent = 'AAB Menu';
      el.setAttribute('title','AAB Menu');
    });
  }

  function install() {
    installDrawer();
    bindTriggers();
    load();

    const mo = new MutationObserver(() => {
      removeLegacyNavigation();
      bindTriggers();
      if (!document.getElementById('aabNavV24')) installDrawer();
    });
    mo.observe(document.documentElement, { childList:true, subtree:true });

    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.addEventListener('click', e => {
      if (!drawer?.classList.contains('open')) return;
      if (drawer.contains(e.target)) return;
      if (e.target.closest?.('#aabNavPill,[data-aab-action="nav"]')) return;
      close();
    });

    window.addEventListener('aab:navigation-toggle', e => toggle(e.detail?.open));
  }

  window.AAB_NAV_V24 = { installed:true, open, close, toggle, reload:load };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
