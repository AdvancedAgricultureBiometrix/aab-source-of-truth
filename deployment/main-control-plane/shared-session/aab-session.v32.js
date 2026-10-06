// AAB shared session v32 — Supabase refresh lifecycle repair
// Country-safe: refreshes identity only. It never assigns roles, membership or authority.
(()=>{
  'use strict';
  if(window.AAB_SESSION_V32?.installed)return;
  const AAB=window.AAB=window.AAB||{},FLAGS=AAB._flags=AAB._flags||{};
  const originalFetch=window.fetch.bind(window);
  const scriptUrl=(()=>{try{return new URL(document.currentScript?.src||'./aab-session.js',location.href)}catch{return new URL('./aab-session.js',location.href)}})();
  const appBase=new URL('./',scriptUrl);
  let refreshPromise=null;

  const runtimeConfig=()=>window.AAB_COUNTRY_RUNTIME_CONFIG||{};
  const projectRef=()=>String(runtimeConfig().project_ref||'').trim();
  const standardKey=()=>{const ref=projectRef();return /^[a-z0-9]{20}$/.test(ref)?'sb-'+ref+'-auth-token':''};
  const legacyKey=()=>AAB.intel?.runtime?.auth?.token_key||'aab_auth_token_v1';
  const authUrl=()=>String(runtimeConfig().supabase_url||'').replace(/\/$/,'');
  const publishableKey=()=>String(runtimeConfig().publishable_key||'');

  function readJson(key){try{const raw=key&&localStorage.getItem(key);return raw?JSON.parse(raw):null}catch{return null}}
  function sessionFrom(value){
    if(!value)return null;
    if(Array.isArray(value))return sessionFrom(value[0]);
    if(value.access_token)return value;
    if(value.currentSession?.access_token)return value.currentSession;
    if(value.session?.access_token)return value.session;
    return null;
  }
  function storedSession(){return sessionFrom(readJson(standardKey()))}
  function legacyToken(){try{return localStorage.getItem(legacyKey())||''}catch{return ''}}
  function accessToken(){return String(storedSession()?.access_token||legacyToken()||'')}
  function jwtExpiry(token){try{const part=token.split('.')[1];if(!part)return 0;const json=atob(part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'='));return Number(JSON.parse(json).exp||0)}catch{return 0}}
  function tokenFresh(token){const exp=jwtExpiry(token);return !!token&&(!exp||exp>(Date.now()/1000)+45)}

  function writeSession(session){
    if(!session?.access_token)return;
    try{const key=standardKey();if(key)localStorage.setItem(key,JSON.stringify(session))}catch{}
    try{localStorage.setItem(legacyKey(),session.access_token)}catch{}
  }
  function clearSession(){
    try{const key=standardKey();if(key)localStorage.removeItem(key)}catch{}
    try{localStorage.removeItem(legacyKey())}catch{}
  }
  async function refreshSession(force=false){
    const current=storedSession(),token=String(current?.access_token||legacyToken()||'');
    if(!force&&tokenFresh(token))return token;
    if(refreshPromise)return refreshPromise;
    const refreshToken=String(current?.refresh_token||'');
    if(!refreshToken)return '';
    const url=authUrl(),key=publishableKey();
    if(!url||!key)return '';
    refreshPromise=(async()=>{
      try{
        const response=await originalFetch(url+'/auth/v1/token?grant_type=refresh_token',{
          method:'POST',cache:'no-store',headers:{apikey:key,'Content-Type':'application/json'},
          body:JSON.stringify({refresh_token:refreshToken})
        });
        const data=await response.json().catch(()=>null);
        if(!response.ok||!data?.access_token)return '';
        writeSession(data);
        return String(data.access_token);
      }catch{return ''}
      finally{refreshPromise=null}
    })();
    return refreshPromise;
  }
  function shouldAttach(url){
    return url.origin===location.origin&&(
      url.pathname.includes('/api.php')||url.pathname.startsWith('/api/')||
      url.pathname.includes('/api/')||url.pathname.includes('aab-intel-live.php')
    );
  }
  function withToken(input,init,token){
    const headers=new Headers(input instanceof Request?input.headers:undefined);
    if(init?.headers)new Headers(init.headers).forEach((v,k)=>headers.set(k,v));
    headers.set('Authorization','Bearer '+token);
    headers.set('X-AAB-SESSION',token);
    headers.set('X-AAB-TOKEN',token);
    const next={...(init||{}),headers,credentials:init?.credentials||'include'};
    return input instanceof Request?[new Request(input.clone(),next),undefined]:[input,next];
  }
  async function authenticatedFetch(input,init){
    let url;try{url=new URL(typeof input==='string'?input:input.url,location.href)}catch{return originalFetch(input,init)}
    if(!shouldAttach(url))return originalFetch(input,init);
    let token=await refreshSession(false);
    if(!token)token=accessToken();
    if(!token){redirectToAuth();return new Response('',{status:401})}
    let args=withToken(input,init,token),response=await originalFetch(...args);
    if(response.status!==401)return response;
    const renewed=await refreshSession(true);
    if(!renewed){clearSession();redirectToAuth();return response}
    args=withToken(input,init,renewed);
    response=await originalFetch(...args);
    if(response.status===401){clearSession();redirectToAuth()}
    return response;
  }
  function sharedUrl(path){try{return /^https?:\/\//i.test(path)||String(path).startsWith('/')?path:new URL(path,appBase).href}catch{return path}}
  function redirectToAuth(){
    try{sessionStorage.setItem('return_to',location.href)}catch{}
    const target=String(runtimeConfig().auth_entry_path||AAB.intel?.runtime?.auth?.auth_page||'/');
    location.replace(sharedUrl(target));
  }
  async function loadIntel(){
    if(AAB.intel)return AAB.intel;
    try{const response=await originalFetch(sharedUrl('aab-intel.json?v=32'),{cache:'no-store'});if(!response.ok)throw new Error();AAB.intel=await response.json()}
    catch{AAB.intel={runtime:{mock_api:false,api_base:'',auth:{protected:[],auth_page:'/'}}}}
    return AAB.intel;
  }
  async function guard(){
    const intel=await loadIntel(),name=location.pathname.split('/').pop()||'';
    if(!(intel.runtime?.auth?.protected||[]).includes(name))return;
    const token=await refreshSession(false);
    if(!token&&!accessToken())redirectToAuth();
  }
  async function aabFetch(url,options={}){
    const intel=await loadIntel(),base=intel.runtime?.api_base||'';
    const full=/^(https?:|\/)/.test(String(url))?String(url):base+String(url);
    return window.fetch(full,{credentials:'include',...options});
  }
  async function logout(){
    if(FLAGS.logoutInProgress)return;FLAGS.logoutInProgress=true;
    try{
      const token=accessToken(),url=authUrl(),key=publishableKey();
      if(token&&url&&key)await originalFetch(url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+token}}).catch(()=>{});
    }finally{
      clearSession();try{sessionStorage.removeItem('return_to')}catch{}
      location.replace('https://aab.ag/enter-aab/');
    }
  }
  AAB._origFetch=originalFetch;AAB.aabFetch=aabFetch;AAB.getAccessToken=accessToken;AAB.refreshSession=refreshSession;AAB.redirectToAuth=redirectToAuth;AAB.logout=logout;
  window.fetch=authenticatedFetch;
  window.AAB_SESSION_V32={installed:true,refreshSession,logout};
  guard();
})();
