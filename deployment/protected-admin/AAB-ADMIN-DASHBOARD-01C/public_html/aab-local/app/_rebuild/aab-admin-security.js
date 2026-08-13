(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let client,snapshot=null,refreshCount=0,lastRefreshReason='INITIAL_LOAD',refreshPromise=null;

async function sharedClient(){
  if(window.AAB_ADMIN_SUPABASE_CLIENT)return window.AAB_ADMIN_SUPABASE_CLIENT;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Authenticated administration client was not initialised.')),5000);
    window.addEventListener('aab-admin-client-ready',()=>{
      clearTimeout(timer);
      resolve(window.AAB_ADMIN_SUPABASE_CLIENT);
    },{once:true});
  });
}

async function init(){
  const host=$('audit')?.parentElement;
  if(!host)return;
  host.insertAdjacentHTML('afterend','<article class="aa-card aa-full" id="security"><h2>Security Intelligence</h2><p class="aa-muted">Explainable, advisory-only security alerts. The Security Brain cannot change roles, revoke access, approve requests, provision countries or delete evidence.</p><div class="aa-actions"><button type="button" class="aa-btn primary" id="runSecurity">Run governed security review</button></div><div id="securitySummary" class="aa-status">Loading security context…</div><div id="securityAlerts"></div></article>');
  client=await sharedClient();
  $('runSecurity').onclick=run;
  window.addEventListener('aab-admin-security-refresh',event=>{
    refresh(event.detail?.reason||'GOVERNED_STATE_CHANGED').catch(error=>{
      $('securitySummary').textContent='Security refresh blocked: '+error.message;
    });
  });
  await refresh('INITIAL_LOAD');
}

function render(data){
  const c=data.counts||{};
  const authority=data.authority_boundary||'ADVISORY_ONLY_HUMAN_DECISION_REQUIRED';
  $('securitySummary').textContent=Number(c.open||0)===0
    ?`No open security alerts · High/Critical: ${c.high_or_critical||0} · Authority: ${authority}`
    :`Open alerts: ${c.open||0} · High/Critical: ${c.high_or_critical||0} · Authority: ${authority}`;
  $('securityAlerts').innerHTML=(data.alerts||[]).map(a=>`<div class="aa-row"><div><strong>${esc(a.title)}</strong><div class="aa-muted">${esc(a.explanation)}</div><details class="aa-detail"><summary>Evidence and response</summary><p>${esc(JSON.stringify(a.evidence_summary))}</p><p><b>Recommended:</b> ${esc(a.recommended_response)}</p></details></div><span class="aa-chip">${esc(a.severity)} · ${esc(a.alert_status)}</span></div>`).join('')||'<p class="aa-muted">No open security alerts.</p>';
}

async function load(reason='MANUAL_REFRESH'){
  const {data,error}=await client.rpc('aab_admin_security_snapshot');
  if(error)throw error;
  snapshot=data||{};
  refreshCount+=1;
  lastRefreshReason=reason;
  render(snapshot);
  return snapshot;
}

async function refresh(reason){
  if(refreshPromise)return refreshPromise;
  refreshPromise=load(reason).finally(()=>{refreshPromise=null;});
  return refreshPromise;
}

async function run(){
  $('runSecurity').disabled=true;
  try{
    const {data,error}=await client.rpc('aab_admin_run_security_brain');
    if(error)throw error;
    await refresh('GOVERNED_SECURITY_REVIEW');
    return data;
  }catch(error){
    $('securitySummary').textContent='Security review blocked: '+error.message;
    throw error;
  }finally{
    $('runSecurity').disabled=false;
  }
}

window.AAB_ADMIN_SECURITY_01={
  version:'1.0.1',
  getContract:()=>({
    id:'AAB-ADMIN-SECURITY-01',
    version:'1.0.1',
    shared_client:client===window.AAB_ADMIN_SUPABASE_CLIENT,
    loaded:!!snapshot,
    refresh_count:refreshCount,
    last_refresh_reason:lastRefreshReason,
    browser_alert_resolution_exposed:false,
    authority:'ADVISORY_ONLY'
  }),
  getSnapshot:()=>snapshot,
  refresh:()=>refresh('VALIDATION_REFRESH'),
  runGovernedReview:run
};

document.addEventListener('DOMContentLoaded',()=>init().catch(e=>{
  $('status').textContent='Security Intelligence unavailable: '+e.message;
}));
})();