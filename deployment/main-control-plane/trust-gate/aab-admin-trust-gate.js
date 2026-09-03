(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let client;
  let factorId = null;
  let challengeId = null;
  let nominationContext = null;
  let booting = false;

  function installStyles() {
    if ($('aab-trust-gate-style')) return;
    const style = document.createElement('style');
    style.id = 'aab-trust-gate-style';
    style.textContent = `
      [hidden]{display:none!important}.aa-trust-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,.7fr);gap:18px;align-items:start}
      .aa-trust-panel{padding:16px;border:1px solid var(--border);border-radius:14px;background:rgba(0,0,0,.025)}
      .aa-trust-panel h3{margin:0 0 8px}.aa-trust-qr{display:block;width:min(260px,100%);height:auto;margin:12px 0;background:#fff;border:10px solid #fff;border-radius:12px}
      .aa-trust-secret{overflow-wrap:anywhere;padding:10px;border:1px solid var(--border);border-radius:10px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
      .aa-code,.aa-controlled-input,.aa-controlled-select{width:100%;box-sizing:border-box;padding:11px;border:1px solid var(--border);border-radius:11px;background:#101418;color:#f7f4ec;font:inherit}
      .aa-controlled-select{color-scheme:dark}.aa-controlled-select option{background:#101418;color:#f7f4ec}
      .aa-code{max-width:260px;letter-spacing:.16em}.aa-controlled-field{display:grid;gap:7px;margin:12px 0}.aa-controlled-check{display:flex;gap:10px;align-items:flex-start;margin:14px 0;line-height:1.45}.aa-controlled-check input{margin-top:.25em}
      .aa-boundary{padding:12px;border:1px solid var(--border);border-radius:11px;line-height:1.5}.aa-boundary strong{display:block;margin-bottom:4px}.aa-result{overflow-wrap:anywhere}
      .aa-handoff-link{display:block;margin-top:10px;padding:12px;border:1px solid var(--border);border-radius:11px;overflow-wrap:anywhere}
      .aa-assurance{font-weight:800}.aa-assurance[data-level=aal2]{color:#1f8f68}.aa-assurance[data-level=aal1]{color:#b7791f}.aa-trust-note{font-size:13px;line-height:1.5;color:var(--muted)}
      @media(max-width:900px){.aa-trust-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function addCard() {
    if ($('aab-trust-gate')) return;
    installStyles();
    const grid = document.querySelector('.aa-grid');
    if (!grid) throw new Error('Administration layout is unavailable.');
    const card = document.createElement('article');
    card.className = 'aa-card aa-full';
    card.id = 'aab-trust-gate';
    card.innerHTML = `
      <h2>AAB Trust Gate</h2>
      <div class="aa-trust-grid">
        <section class="aa-trust-panel"><h3>Session assurance</h3><p id="trust-summary">Checking the authenticated session…</p><p class="aa-assurance" id="trust-level" data-level="unknown">Assurance: —</p><div class="aa-actions" id="trust-actions"></div><div class="aa-status" id="trust-status" role="status" aria-live="polite">No authority action is available until AAL2 is verified.</div></section>
        <section class="aa-trust-panel" id="trust-enrolment" hidden><h3 id="trust-factor-heading">Register an authenticator</h3><p class="aa-trust-note" id="trust-factor-instruction">Scan this QR code with a trusted authenticator app. The secret remains on this screen only and is never written to AAB records or logs.</p><img class="aa-trust-qr" id="trust-qr" alt="Authenticator enrolment QR code"><details id="trust-manual-setup"><summary>Cannot scan the QR code?</summary><p class="aa-trust-secret" id="trust-secret"></p></details><label class="aa-controlled-field">Six-digit authenticator code<input class="aa-code" id="trust-code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" pattern="[0-9]*"></label><div class="aa-actions"><button type="button" class="aa-btn primary" id="trust-verify">Verify authenticator</button><button type="button" class="aa-btn" id="trust-cancel">Cancel</button></div></section>
      </div>
      <section class="aa-trust-panel" id="rehearsal-nomination" hidden><h3>Controlled WA internal rehearsal nomination</h3><p class="aa-trust-note">This creates a test-only nomination and provisioning decision. It cannot approve a public country request and does not execute handoff, invitation, activation, membership or authority.</p><div class="aa-boundary" id="rehearsal-boundary">Loading the server-controlled boundary…</div><div id="rehearsal-create-fields"><label class="aa-controlled-field">Nominated rehearsal account email<input class="aa-controlled-input" id="rehearsal-email" type="email" inputmode="email" autocomplete="off" spellcheck="false"></label><label class="aa-controlled-field">Controlled validation purpose<select class="aa-controlled-select" id="rehearsal-purpose"><option value="">Select one controlled purpose</option></select></label><label class="aa-controlled-check"><input id="rehearsal-confirm" type="checkbox"><span>I confirm this is an isolated WA clean-room test: non-government, non-production, no legal effect, and no external invitations.</span></label><div class="aa-actions"><button type="button" class="aa-btn primary" id="rehearsal-create" disabled>Create nomination decision only</button></div></div><div id="rehearsal-handoff" hidden><h3>Deliberate governed handoff</h3><p class="aa-trust-note">Select the exact canonical PDF. The server verifies its SHA-256 before issuing a single-use activation valid for 24 hours.</p><label class="aa-controlled-field">Canonical rehearsal PDF<input class="aa-controlled-input" id="rehearsal-pdf" type="file" accept="application/pdf,.pdf"></label><label class="aa-controlled-check"><input id="handoff-confirm" type="checkbox"><span>I authorize this one test-only handoff. It creates only a pending activation; the nominated person must still verify their email, claim it, complete their profile, acknowledge the rehearsal document and finalize.</span></label><div class="aa-actions"><button type="button" class="aa-btn primary" id="handoff-create" disabled>Issue pending WA rehearsal activation</button></div><div id="handoff-result"></div></div><div class="aa-status aa-result" id="rehearsal-status" role="status" aria-live="polite">A separate deliberate action will still be required before any handoff.</div></section>
    `;
    grid.insertBefore(card, grid.firstChild);
    $('trust-actions').addEventListener('click', onAction);
    $('trust-verify').addEventListener('click', verify);
    $('trust-cancel').addEventListener('click', cancel);
    $('rehearsal-email').addEventListener('input', updateNominationButton);
    $('rehearsal-purpose').addEventListener('change', updateNominationButton);
    $('rehearsal-confirm').addEventListener('change', updateNominationButton);
    $('rehearsal-create').addEventListener('click', createNomination);
    $('rehearsal-pdf').addEventListener('change', updateHandoffButton);
    $('handoff-confirm').addEventListener('change', updateHandoffButton);
    $('handoff-create').addEventListener('click', executeHandoff);
  }

  const status = (message) => { $('trust-status').textContent = message; };
  const nominationStatus = (message) => { $('rehearsal-status').textContent = message; };

  function updateNominationButton() {
    $('rehearsal-create').disabled = !nominationContext || !$('rehearsal-email').value.trim() || !$('rehearsal-purpose').value || !$('rehearsal-confirm').checked;
  }

  function updateHandoffButton() {
    $('handoff-create').disabled = !nominationContext?.ready_handoff || !$('rehearsal-pdf').files?.[0] || !$('handoff-confirm').checked;
  }

  function fileBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('The selected PDF could not be read.'));
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.readAsDataURL(file);
    });
  }

  async function loadNominationContext() {
    nominationContext = null;
    $('rehearsal-nomination').hidden = false;
    nominationStatus('Loading the server-controlled rehearsal boundary…');
    const { data, error } = await client.rpc('aab_internal_wa_rehearsal_nomination_context');
    if (error) throw error;
    if (!data?.ok || data.authentication_assurance !== 'aal2') throw new Error('The server did not confirm the AAL2 rehearsal boundary.');
    nominationContext = data;
    const boundary = $('rehearsal-boundary');
    boundary.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = `${data.environment_classification} · ${data.target_workspace_code}`;
    const detail = document.createElement('span');
    detail.textContent = 'TEST ONLY · NON-GOVERNMENT · NON-PRODUCTION · NO LEGAL EFFECT · EXTERNAL INVITATIONS LOCKED';
    boundary.append(heading, detail);
    const select = $('rehearsal-purpose');
    select.replaceChildren(new Option('Select one controlled purpose', ''));
    for (const option of data.purpose_options || []) select.add(new Option(option.label, option.code));
    const ready = data.ready_handoff;
    $('rehearsal-create-fields').hidden = Boolean(ready);
    $('rehearsal-handoff').hidden = !ready;
    nominationStatus(ready ? `Decision ${ready.decision_id} is ready for a separate, deliberate handoff. No handoff has been executed by loading this page.` : `Canonical terms ${data.document_id} · ${data.document_version} resolved by the server. No handoff will be executed.`);
    updateNominationButton();
    updateHandoffButton();
  }

  async function assurance() {
    const { data, error } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error) throw error;
    const current = data?.currentLevel || 'aal1';
    const next = data?.nextLevel || current;
    $('trust-level').textContent = `Assurance: ${current.toUpperCase()}`;
    $('trust-level').dataset.level = current;
    $('trust-summary').textContent = current === 'aal2' ? 'This session has completed OTP identity verification and a registered second factor.' : next === 'aal2' ? 'A second factor is registered but must be verified for this session.' : 'This session has completed OTP identity verification only. A second factor is required.';
    $('trust-actions').innerHTML = current === 'aal2' ? '<span class="aa-chip">AAL2 verified · sensitive controls may be requested from the server</span>' : next === 'aal2' ? '<button type="button" class="aa-btn primary" data-trust="challenge">Verify registered authenticator</button>' : '<button type="button" class="aa-btn primary" data-trust="enrol">Register authenticator</button>';
    status(current === 'aal2' ? 'Trust Gate passed for this session. Authentication still does not grant country membership or scientific authority.' : 'Trust Gate locked. No sensitive action is available.');
    if (current === 'aal2') await loadNominationContext();
    else { nominationContext = null; $('rehearsal-nomination').hidden = true; }
  }

  async function onAction(event) {
    const button = event.target.closest('[data-trust]');
    if (!button) return;
    button.disabled = true;
    try {
      if (button.dataset.trust === 'enrol') await enrol();
      if (button.dataset.trust === 'challenge') await challengeExisting();
    } catch (error) { status(`Trust Gate blocked: ${error?.message || 'Unknown authentication error.'}`); button.disabled = false; }
  }

  async function enrol() {
    status('Creating a private authenticator enrolment…');
    const existing = await client.auth.mfa.listFactors();
    if (existing.error) throw existing.error;
    for (const factor of existing.data?.all || []) if (factor.factor_type === 'totp' && factor.status === 'unverified') await client.auth.mfa.unenroll({ factorId: factor.id });
    const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'AAB Trust Gate' });
    if (error) throw error;
    factorId = data.id; challengeId = null; $('trust-factor-heading').textContent = 'Register an authenticator'; $('trust-factor-instruction').textContent = 'Scan this QR code with a trusted authenticator app. The secret remains on this screen only and is never written to AAB records or logs.'; $('trust-qr').hidden = false; $('trust-qr').src = data.totp.qr_code; $('trust-manual-setup').hidden = false; $('trust-secret').textContent = data.totp.secret; $('trust-enrolment').hidden = false; $('trust-code').value = ''; $('trust-code').focus(); status('Scan the QR code, then enter the newest authenticator code.');
  }

  async function challengeExisting() {
    const { data, error } = await client.auth.mfa.listFactors();
    if (error) throw error;
    const factor = (data?.totp || []).find((item) => item.status === 'verified') || (data?.totp || [])[0];
    if (!factor) throw new Error('No verified authenticator is available.');
    factorId = factor.id; challengeId = null; $('trust-factor-heading').textContent = 'Verify registered authenticator'; $('trust-factor-instruction').textContent = 'Open the authenticator app already registered to this account and enter its newest six-digit code.'; $('trust-qr').removeAttribute('src'); $('trust-qr').hidden = true; $('trust-manual-setup').hidden = true; $('trust-secret').textContent = ''; $('trust-enrolment').hidden = false; $('trust-code').value = ''; $('trust-code').focus(); status('Enter the newest code from the registered authenticator.');
  }

  async function verify() {
    const code = $('trust-code').value.replace(/\D/g, '');
    if (!factorId || code.length < 6) { status('Enter the current six-digit authenticator code.'); return; }
    $('trust-verify').disabled = true;
    try {
      if (!challengeId) { const challenge = await client.auth.mfa.challenge({ factorId }); if (challenge.error) throw challenge.error; challengeId = challenge.data.id; }
      const result = await client.auth.mfa.verify({ factorId, challengeId, code });
      if (result.error) throw result.error;
      $('trust-enrolment').hidden = true; factorId = null; challengeId = null; await assurance();
    } catch (error) { challengeId = null; status('Authenticator verification failed. Use the newest code and try again.'); }
    finally { $('trust-verify').disabled = false; }
  }

  async function cancel() {
    if (factorId) {
      const factors = await client.auth.mfa.listFactors();
      const pending = (factors.data?.all || []).find((item) => item.id === factorId && item.status === 'unverified');
      if (pending) await client.auth.mfa.unenroll({ factorId });
    }
    factorId = null; challengeId = null; $('trust-enrolment').hidden = true; await assurance();
  }

  async function createNomination() {
    const email = $('rehearsal-email').value.trim().toLowerCase();
    const purposeCode = $('rehearsal-purpose').value;
    if (!nominationContext || !email || !purposeCode || !$('rehearsal-confirm').checked) return;
    if (!window.confirm(`Create a TEST-ONLY WA internal rehearsal nomination for ${email}?\n\nThis creates a nomination decision only. It does not execute handoff, invitation, activation, membership or authority.`)) return;
    const button = $('rehearsal-create');
    button.disabled = true;
    nominationStatus('Requesting a server-controlled nomination decision…');
    try {
      const { data, error } = await client.rpc('aab_create_internal_wa_rehearsal_nomination_v2', { p_nominated_email: email, p_purpose_code: purposeCode });
      if (error) throw error;
      nominationStatus(`Nomination decision created. Decision ${data.decision_id}; correlation ${data.handoff_correlation_id}. Handoff was not executed.`);
      $('rehearsal-email').disabled = true; $('rehearsal-purpose').disabled = true; $('rehearsal-confirm').disabled = true; button.textContent = 'Nomination decision created';
    } catch (error) { nominationStatus(`Nomination blocked: ${error?.message || 'The server rejected the request.'}`); updateNominationButton(); }
  }

  async function executeHandoff() {
    const ready = nominationContext?.ready_handoff;
    const file = $('rehearsal-pdf').files?.[0];
    if (!ready || !file || !$('handoff-confirm').checked) return;
    if (!window.confirm('Issue a single-use, 24-hour WA rehearsal activation now?\n\nThis is test-only and creates no membership or authority.')) return;
    const button = $('handoff-create');
    button.disabled = true;
    nominationStatus('Verifying the canonical PDF and executing the governed handoff…');
    try {
      const pdfBase64 = await fileBase64(file);
      const { data, error } = await client.functions.invoke('wa-rehearsal-provision', { body: { decision_id: ready.decision_id, pdf_base64: pdfBase64 } });
      if (error) throw error;
      if (!data?.ok || !data.activation_token || data.membership_created !== false || data.authority_granted !== false) throw new Error('The handoff response failed the governed boundary contract.');
      const activationUrl = `https://wa-rehearsal.nexiuma.ai/onboarding/activate/#code=${encodeURIComponent(data.activation_token)}`;
      const result = $('handoff-result');
      result.replaceChildren();
      const link = document.createElement('a');
      link.className = 'aa-handoff-link';
      link.href = activationUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Open the WA rehearsal activation page';
      result.append(link);
      nominationStatus(`Pending activation issued; expires ${data.activation_expires_at}. The token is held only in the link above and has not been claimed.`);
      $('rehearsal-pdf').disabled = true; $('handoff-confirm').disabled = true; button.textContent = 'Pending activation issued';
    } catch (error) {
      nominationStatus(`Handoff blocked: ${error?.message || 'The server rejected the handoff.'}`);
      updateHandoffButton();
    }
  }

  async function boot() {
    if (booting) return;
    addCard();
    client = window.AAB_ADMIN_SUPABASE_CLIENT;
    if (!client) { status('Waiting for the protected administration session…'); return; }
    booting = true;
    try { await assurance(); }
    catch (error) { status(`Trust Gate unavailable: ${error?.message || 'Session assurance could not be checked.'}`); $('rehearsal-nomination').hidden = true; }
    finally { booting = false; }
  }

  window.addEventListener('aab-admin-client-ready', boot);
  document.addEventListener('DOMContentLoaded', () => { addCard(); if (window.AAB_ADMIN_SUPABASE_CLIENT) boot(); });
})();
