(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = { config:null, captcha:'', widget:null, email:'', busy:false };
  const authorityResolvers = Object.freeze([
    Object.freeze({ rpc:'aab_rehearsal_head_admin_authority', authority:'PERSISTED_WA_HEAD_ADMIN', semanticRoute:'/head-admin', destination:'/aab-local/app/_rebuild/country-admin.html' }),
    Object.freeze({ rpc:'aab_rehearsal_institution_authority', authority:'PERSISTED_REHEARSAL_INSTITUTION_ADMIN', semanticRoute:'/institution-admin', destination:'/aab-local/app/_rebuild/institution-setup.html' }),
    Object.freeze({ rpc:'aab_rehearsal_team_authority', authority:'PERSISTED_REHEARSAL_TEAM_MEMBER', semanticRoute:'/institution-workspace', destination:'/aab-local/app/_rebuild/my-dashboard.html' })
  ]);
  function show(message='', error=''){ $('message').textContent=message; $('error').textContent=error; }
  function busy(on){ state.busy=on; document.querySelectorAll('button,input').forEach(el=>el.disabled=on); if(!on && !state.captcha && !$('code-form').hidden) $('send').disabled=true; }
  async function json(url, options={}){
    const response=await fetch(url,options); let body=null; try{body=await response.json()}catch{}
    if(!response.ok) throw new Error(body?.msg||body?.message||body?.error_description||body?.error||`Request failed (${response.status})`);
    return body;
  }
  function headers(token=''){ const h={'apikey':state.config.publishableKey,'Content-Type':'application/json'}; if(token)h.Authorization='Bearer '+token; return h; }
  function saveSession(session){
    if(!session?.access_token||!session?.refresh_token)throw new Error('Verification did not create a valid session.');
    if(!session.expires_at && session.expires_in)session.expires_at=Math.floor(Date.now()/1000)+Number(session.expires_in);
    localStorage.setItem(`sb-${state.config.projectRef}-auth-token`,JSON.stringify(session));
  }
  async function rpc(name, token){
    return json(state.config.supabaseUrl+'/rest/v1/rpc/'+encodeURIComponent(name),{method:'POST',headers:headers(token),body:'{}'});
  }
  async function resolve(token){
    for(const expected of authorityResolvers){
      const result=await rpc(expected.rpc,token);
      if(!result?.ok)continue;
      if(result.authority!==expected.authority||result.route!==expected.semanticRoute)throw new Error('WA authority response did not match the governed route contract.');
      show(`Access approved: ${result.route_code||expected.authority}. Redirecting…`);
      location.assign(expected.destination);
      return;
    }
    throw new Error('No active persisted WA rehearsal membership is assigned to this account.');
  }
  async function existingSession(){
    let session=null; try{session=JSON.parse(localStorage.getItem(`sb-${state.config.projectRef}-auth-token`)||'null')}catch{}
    if(!session?.access_token)return false;
    try{await json(state.config.supabaseUrl+'/auth/v1/user',{headers:headers(session.access_token)})}
    catch{localStorage.removeItem(`sb-${state.config.projectRef}-auth-token`);return false}
    await resolve(session.access_token);
    return true;
  }
  $('email-form').addEventListener('submit',async event=>{
    event.preventDefault(); state.email=$('email').value.trim().toLowerCase(); busy(true); show('Requesting the newest verification code…');
    try{
      await json(state.config.supabaseUrl+'/auth/v1/otp',{method:'POST',headers:headers(),body:JSON.stringify({email:state.email,create_user:false,gotrue_meta_security:{captcha_token:state.captcha}})});
      $('email-form').hidden=true;$('code-form').hidden=false;$('code-email').textContent=state.email;$('code').focus();show('Verification code sent. Keep this page open.');
    }catch(error){show('',error.message.includes('captcha')?'Human verification was not accepted. Please retry.':'A verification code could not be issued to this approved account.');if(window.turnstile&&state.widget!==null)window.turnstile.reset(state.widget);state.captcha='';}
    finally{busy(false)}
  });
  $('code-form').addEventListener('submit',async event=>{
    event.preventDefault();busy(true);show('Verifying identity and persisted WA membership…');
    try{const data=await json(state.config.supabaseUrl+'/auth/v1/verify',{method:'POST',headers:headers(),body:JSON.stringify({email:state.email,token:$('code').value.trim(),type:'email'})});saveSession(data);await resolve(data.access_token)}
    catch(error){show('',error.message||'Verification failed. Use the newest six-digit code.');busy(false)}
  });
  $('restart').addEventListener('click',()=>location.reload());
  async function init(){
    try{
      state.config=await json('/api/aab-config/',{cache:'no-store'});
      if(!/^[a-z0-9]{20}$/.test(state.config.projectRef)||!state.config.publishableKey||!state.config.turnstileSiteKey)throw new Error('Country entry configuration is incomplete.');
      if(await existingSession())return;
      for(let i=0;i<50&&typeof window.turnstile?.render!=='function';i++)await new Promise(resolve=>setTimeout(resolve,100));
      if(typeof window.turnstile?.render!=='function')throw new Error('Human verification service is unavailable.');
      state.widget=window.turnstile.render('#turnstile',{sitekey:state.config.turnstileSiteKey,theme:'dark',callback:token=>{state.captcha=token;$('send').disabled=false},'expired-callback':()=>{state.captcha='';$('send').disabled=true},'error-callback':()=>show('','Human verification could not be completed.')});
      $('email-form').hidden=false;show('Enter an approved WA rehearsal email address.');
    }catch(error){show('',error.message||'Secure entry is unavailable.')}
  }
  init();
})();
