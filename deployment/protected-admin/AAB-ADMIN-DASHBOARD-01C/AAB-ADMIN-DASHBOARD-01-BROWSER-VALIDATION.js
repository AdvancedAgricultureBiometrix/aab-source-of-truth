(async()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ns=window.AAB_ADMIN_DASHBOARD_01;
  const exists=!!ns;
  const validation=exists?await ns.validateContract():{ok:false,status:'FAIL',error:'Namespace missing'};
  const contract=exists?ns.getContract():null;
  const safe={name:'Protected snapshot read',passed:validation.ok===true};
  const blocked={name:'Approval does not provision',passed:contract?.guardrails?.approval_provisions_country===false};
  const report={contract_exists:exists,validation,contract_snapshot:contract,safe_request_check:safe,blocked_request_check:blocked};
  const w=window.open('','AAB_ADMIN_DASHBOARD_01_VALIDATION','width=920,height=760');
  if(!w){console.table(report);throw new Error('Validation window was blocked. Allow pop-ups and run again.');}
  w.document.write(`<!doctype html><title>AAB Admin Dashboard 01 Validation</title><style>body{font:15px/1.5 Arial,sans-serif;margin:28px;color:#132a21}h1{font-family:Georgia,serif}.pass{color:#087443}.fail{color:#a12828}pre{white-space:pre-wrap;background:#f2f5ef;padding:14px;border-radius:10px}</style><h1>AAB Admin Dashboard 01</h1><h2>Contract Exists</h2><pre class="${exists?'pass':'fail'}">${esc(exists)}</pre><h2>Validation Result</h2><pre>${esc(JSON.stringify(validation,null,2))}</pre><h2>Contract Snapshot</h2><pre>${esc(JSON.stringify(contract,null,2))}</pre><h2>Safe Request Check</h2><pre>${esc(JSON.stringify(safe,null,2))}</pre><h2>Blocked Request Check</h2><pre>${esc(JSON.stringify(blocked,null,2))}</pre>`);
  w.document.close();
  console.log('AAB-ADMIN-DASHBOARD-01',report);
  return report;
})();
