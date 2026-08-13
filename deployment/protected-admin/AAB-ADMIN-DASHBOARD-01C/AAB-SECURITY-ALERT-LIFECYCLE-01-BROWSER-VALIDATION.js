(async()=>{'use strict';
const report=window.open('','AAB_SECURITY_ALERT_LIFECYCLE_01_VALIDATION','width=1180,height=900,scrollbars=yes,resizable=yes');
if(!report)throw new Error('Allow pop-ups, then run the validation again.');

const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const section=(title,value)=>`<section><h2>${esc(title)}</h2><pre>${esc(JSON.stringify(value,null,2))}</pre></section>`;
const render=(title,sections)=>{
  report.document.open();
  report.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:15px/1.5 system-ui;margin:0;background:#f3f7f5;color:#163329}header{padding:24px 28px;background:#173d32;color:#fff}main{padding:22px;display:grid;gap:16px}section{background:#fff;border:1px solid #bed2ca;border-radius:14px;padding:18px;box-shadow:0 5px 18px rgba(21,55,45,.08)}h1,h2{margin:0 0 10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.pass{color:#92f0bd}.warn{color:#ffd888}.fail{color:#ffb0a7}</style></head><body><header><h1>${esc(title)}</h1></header><main>${sections.join('')}</main></body></html>`);
  report.document.close();
};

try{
  const admin=window.AAB_ADMIN_DASHBOARD_01;
  const security=window.AAB_ADMIN_SECURITY_01;
  const client=window.AAB_ADMIN_SUPABASE_CLIENT;
  if(!admin||!security||!client)throw new Error('Open the authenticated AAB Administration dashboard and wait for both panels to load.');

  const rpc=async(name,params)=>{
    const {data,error}=await client.rpc(name,params);
    if(error)throw error;
    return data;
  };
  const runGovernedReview=async()=>{
    if(typeof security.runGovernedReview==='function')return security.runGovernedReview();
    return rpc('aab_admin_run_security_brain');
  };
  const refreshSecurity=async()=>{
    if(typeof security.refresh==='function')return security.refresh();
    return rpc('aab_admin_security_snapshot');
  };

  const adminContract=await admin.validateContract();
  const securityContractBefore=security.getContract();
  const enhancedFrontend=
    typeof security.runGovernedReview==='function' &&
    typeof security.refresh==='function' &&
    Number.isFinite(Number(securityContractBefore.refresh_count));

  const adminBefore=await rpc('aab_admin_dashboard_snapshot');
  const securityBefore=await rpc('aab_admin_security_snapshot');
  const countryCountBefore=Number(adminBefore?.counts?.countries||0);

  const firstRun=await runGovernedReview();
  const afterFirstRun=await refreshSecurity();
  const secondRun=await runGovernedReview();
  const securityAfter=await refreshSecurity();
  const adminAfter=await rpc('aab_admin_dashboard_snapshot');

  const directResolutionAttempt=await client.rpc('aab_admin_resolve_security_alert',{
    p_alert_id:'00000000-0000-0000-0000-000000000000',
    p_status:'RESOLVED',
    p_rationale:'Browser authority boundary validation only.'
  });

  const ids=(securityAfter?.alerts||[]).map(alert=>alert.alert_id);
  const fingerprints=(securityAfter?.alerts||[]).map(alert=>alert.alert_fingerprint);
  const pendingBefore=(securityBefore?.alerts||[]).filter(alert=>alert.alert_type==='PARTICIPATION_REVIEW_PENDING');
  const pendingAfter=(securityAfter?.alerts||[]).filter(alert=>alert.alert_type==='PARTICIPATION_REVIEW_PENDING');
  const securityContractAfter=security.getContract();

  const lifecycleChecks={
    admin_contract_passed:adminContract?.status==='PASS',
    one_shared_supabase_client:securityContractAfter.shared_client===true&&adminContract?.shared_client===true,
    authority_advisory_only:securityAfter?.authority_boundary==='ADVISORY_ONLY_HUMAN_DECISION_REQUIRED',
    ungoverned_browser_resolution_rpc_absent:!!directResolutionAttempt.error,
    no_duplicate_alert_ids:new Set(ids).size===ids.length,
    no_duplicate_alert_fingerprints:new Set(fingerprints).size===fingerprints.length,
    repeated_run_created_no_duplicate:Number(secondRun?.alerts_created_or_refreshed||0)===0,
    country_count_unchanged:countryCountBefore===Number(adminAfter?.counts?.countries||0),
    approval_does_not_provision_country:adminBefore?.guardrails?.approval_provisions_country===false,
    open_count_matches_rows:Number(securityAfter?.counts?.open||0)===(securityAfter?.alerts||[]).length
  };

  const deploymentChecks={
    enhanced_security_module_deployed:enhancedFrontend,
    automatic_refresh_api_available:typeof security.refresh==='function',
    governed_review_api_available:typeof security.runGovernedReview==='function',
    automatic_refresh_observed:enhancedFrontend
      ? Number(securityContractAfter.refresh_count)>Number(securityContractBefore.refresh_count)
      : false
  };

  const lifecyclePass=Object.values(lifecycleChecks).every(Boolean);
  const deploymentPass=Object.values(deploymentChecks).every(Boolean);
  const status=lifecyclePass&&deploymentPass?'PASS':lifecyclePass?'PASS_DATABASE_FRONTEND_DEPLOYMENT_PENDING':'REVIEW_REQUIRED';
  const title=`AAB Security Alert Lifecycle 01 — ${status}`;

  render(title,[
    `<section><h2 class="${status==='PASS'?'pass':lifecyclePass?'warn':'fail'}">Overall: ${esc(status)}</h2><p>The validation automatically falls back to the protected Supabase RPCs when the live page still has the earlier Security Intelligence module. It never approves a request, assigns authority, provisions a country or resolves an alert.</p></section>`,
    section('Lifecycle Checks',lifecycleChecks),
    section('Frontend Deployment Checks',deploymentChecks),
    section('Contract Checks',{admin:adminContract,security_before:securityContractBefore,security_after:securityContractAfter}),
    section('Security State Before Reconciliation',securityBefore),
    section('First Governed Security Run',firstRun),
    section('State After First Run',afterFirstRun),
    section('Repeated Governed Security Run',secondRun),
    section('Security State After Reconciliation',securityAfter),
    section('Participation Alert Comparison',{
      before:pendingBefore,
      after:pendingAfter,
      note:pendingBefore.length
        ?'Complete the governed human review in the dashboard, then rerun this script to prove automatic closure.'
        :'No pending participation condition exists in the current live state.'
    }),
    section('Administration State Before and After',{before:adminBefore,after:adminAfter}),
    section('Authority Boundary Test',{
      ungoverned_browser_resolution_rpc_absent:!!directResolutionAttempt.error,
      error:directResolutionAttempt.error?.message||null
    })
  ]);

  console.log(title,{status,lifecycleChecks,deploymentChecks,adminBefore,securityBefore,firstRun,secondRun,securityAfter,adminAfter});
  return{status,lifecycleChecks,deploymentChecks,adminBefore,securityBefore,firstRun,secondRun,securityAfter,adminAfter};
}catch(error){
  render('AAB Security Alert Lifecycle 01 — BLOCKED',[`<section><h2 class="fail">Validation blocked</h2><pre>${esc(error?.stack||error?.message||error)}</pre></section>`]);
  throw error;
}
})();