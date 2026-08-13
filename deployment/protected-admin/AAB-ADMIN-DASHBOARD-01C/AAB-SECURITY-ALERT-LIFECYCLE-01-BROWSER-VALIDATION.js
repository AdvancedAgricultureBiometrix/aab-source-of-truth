(async()=>{'use strict';
const report=window.open('','AAB_SECURITY_ALERT_LIFECYCLE_01_VALIDATION','width=1180,height=900,scrollbars=yes,resizable=yes');
if(!report){throw new Error('Allow pop-ups, then run the validation again.');}
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const section=(title,value)=>`<section><h2>${esc(title)}</h2><pre>${esc(JSON.stringify(value,null,2))}</pre></section>`;
const render=(title,sections)=>{report.document.open();report.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:15px/1.5 system-ui;margin:0;background:#f3f7f5;color:#163329}header{padding:24px 28px;background:#173d32;color:#fff}main{padding:22px;display:grid;gap:16px}section{background:#fff;border:1px solid #bed2ca;border-radius:14px;padding:18px;box-shadow:0 5px 18px rgba(21,55,45,.08)}h1,h2{margin:0 0 10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}.pass{color:#92f0bd}.fail{color:#ffb0a7}</style></head><body><header><h1>${esc(title)}</h1></header><main>${sections.join('')}</main></body></html>`);report.document.close();};
try{
 const admin=window.AAB_ADMIN_DASHBOARD_01;
 const security=window.AAB_ADMIN_SECURITY_01;
 const client=window.AAB_ADMIN_SUPABASE_CLIENT;
 if(!admin||!security||!client)throw new Error('Open the authenticated AAB Administration dashboard and wait for both panels to load.');
 const adminContract=await admin.validateContract();
 const securityContractBefore=security.getContract();
 const adminBefore=(await client.rpc('aab_admin_dashboard_snapshot')).data;
 const securityBefore=(await client.rpc('aab_admin_security_snapshot')).data;
 const countryCountBefore=Number(adminBefore?.counts?.countries||0);
 const firstRun=await security.runGovernedReview();
 const afterFirstRun=await security.refresh();
 const secondRun=await security.runGovernedReview();
 const securityAfter=await security.refresh();
 const adminAfter=(await client.rpc('aab_admin_dashboard_snapshot')).data;
 const directResolutionAttempt=await client.rpc('aab_admin_resolve_security_alert',{
   p_alert_id:'00000000-0000-0000-0000-000000000000',
   p_status:'RESOLVED',
   p_rationale:'Browser authority boundary validation only.'
 });
 const ids=(securityAfter?.alerts||[]).map(alert=>alert.alert_id);
 const fingerprints=(securityAfter?.alerts||[]).map(alert=>alert.alert_fingerprint);
 const pendingBefore=(securityBefore?.alerts||[]).filter(alert=>alert.alert_type==='PARTICIPATION_REVIEW_PENDING');
 const pendingAfter=(securityAfter?.alerts||[]).filter(alert=>alert.alert_type==='PARTICIPATION_REVIEW_PENDING');
 const checks={
   admin_contract_passed:adminContract?.status==='PASS',
   one_shared_supabase_client:security.getContract().shared_client===true&&adminContract?.shared_client===true,
   authority_advisory_only:securityAfter?.authority_boundary==='ADVISORY_ONLY_HUMAN_DECISION_REQUIRED',
   browser_resolution_rpc_absent:!!directResolutionAttempt.error,
   no_duplicate_alert_ids:new Set(ids).size===ids.length,
   no_duplicate_alert_fingerprints:new Set(fingerprints).size===fingerprints.length,
   repeated_run_created_no_duplicate:Number(secondRun?.alerts_created_or_refreshed||0)===0,
   country_count_unchanged:countryCountBefore===Number(adminAfter?.counts?.countries||0),
   approval_does_not_provision_country:adminBefore?.guardrails?.approval_provisions_country===false,
   security_panel_refreshed:security.getContract().refresh_count>securityContractBefore.refresh_count,
   open_count_matches_rows:Number(securityAfter?.counts?.open||0)===(securityAfter?.alerts||[]).length
 };
 checks.overall=Object.values(checks).every(Boolean);
 const title=`AAB Security Alert Lifecycle 01 — ${checks.overall?'PASS':'REVIEW'}`;
 render(title,[
   `<section><h2 class="${checks.overall?'pass':'fail'}">Overall: ${checks.overall?'PASS':'REVIEW REQUIRED'}</h2><p>This window records live browser-visible state. A governed participation decision must still be made by an authorised human through the dashboard; this script never approves a request or resolves an alert.</p></section>`,
   section('Contract Checks',{admin:adminContract,security_before:securityContractBefore,security_after:security.getContract()}),
   section('Security State Before Reconciliation',securityBefore),
   section('First Governed Security Run',firstRun),
   section('State After First Run',afterFirstRun),
   section('Repeated Governed Security Run',secondRun),
   section('Security State After Reconciliation',securityAfter),
   section('Participation Alert Comparison',{before:pendingBefore,after:pendingAfter,note:pendingBefore.length?'Complete the governed human review in the dashboard, then rerun this script to prove automatic closure.':'No pending participation condition exists in the current live state.'}),
   section('Administration State Before and After',{before:adminBefore,after:adminAfter}),
   section('Authority Boundary Test',{browser_resolution_rpc_absent:!!directResolutionAttempt.error,error:directResolutionAttempt.error?.message||null}),
   section('Validation Checks',checks)
 ]);
 console.log(title,{checks,adminBefore,securityBefore,firstRun,secondRun,securityAfter,adminAfter});
 return{checks,adminBefore,securityBefore,firstRun,secondRun,securityAfter,adminAfter};
}catch(error){
 render('AAB Security Alert Lifecycle 01 — BLOCKED',[`<section><h2 class="fail">Validation blocked</h2><pre>${esc(error?.stack||error?.message||error)}</pre></section>`]);
 throw error;
}
})();