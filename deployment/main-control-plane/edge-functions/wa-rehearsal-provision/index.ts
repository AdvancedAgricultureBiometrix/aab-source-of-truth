import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2.57.4";

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const hex=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(v=>v.toString(16).padStart(2,"0")).join("");
const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,"0")).join("");

Deno.serve(async req=>{
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const publishable=Deno.env.get("SUPABASE_ANON_KEY")||"";
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const authorization=req.headers.get("authorization")||"";
  if(!url||!publishable||!service||!authorization.startsWith("Bearer "))return json({error:"Provisioning unavailable"},503);
  try{
    const body=await req.json();
    const decisionId=String(body.decision_id||"");
    if(!/^[0-9a-f-]{36}$/i.test(decisionId))return json({error:"Controlled decision required"},400);

    const userClient=createClient(url,publishable,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    const token=authorization.slice(7);
    const {data:{user},error:userError}=await userClient.auth.getUser(token);
    if(userError||!user)return json({error:"Verified Platform Owner session required"},401);

    const {data:authority,error:authorityError}=await userClient.rpc("aab_authorize_internal_wa_rehearsal_handoff",{p_decision_id:decisionId});
    if(authorityError||!authority?.ok||authority.authentication_assurance!=="aal2")return json({error:"AAL2 Platform Owner handoff authorization required"},403);

    const pdf=Uint8Array.from(atob(String(body.pdf_base64||"")),c=>c.charCodeAt(0));
    if(pdf.length<1000||pdf.length>5_242_880)return json({error:"Valid rehearsal PDF required"},400);
    const digest=await hex(pdf);

    const admin=createClient(url,service,{auth:{persistSession:false}});
    const {data:handoff,error:handoffError}=await admin.rpc("aab_get_rehearsal_handoff_payload",{p_decision_id:decisionId});
    if(handoffError)throw handoffError;
    if(handoff.decision_id!==decisionId||handoff.source_type!=="INTERNAL_REHEARSAL_NOMINATION"||handoff.request_id!==null||!handoff.internal_nomination_id||handoff.document_sha256!==digest||handoff.classification!=="PERSONAL_WA_REHEARSAL")throw new Error("CONTROL_PLANE_HANDOFF_PROOF_MISMATCH");

    const activationToken=randomToken();
    const expiresAt=new Date(Date.now()+24*60*60*1000).toISOString();
    const response=await fetch(handoff.endpoint_url,{
      method:"POST",
      headers:{"content-type":"application/json","x-aab-rehearsal-handoff":handoff.shared_secret},
      body:JSON.stringify({
        decision_id:handoff.decision_id,
        request_id:null,
        internal_nomination_id:handoff.internal_nomination_id,
        source_type:handoff.source_type,
        correlation_id:handoff.correlation_id,
        nominated_email:handoff.nominated_email,
        document_sha256:digest,
        document_id:handoff.document_id,
        document_version:handoff.document_version,
        pdf_base64:body.pdf_base64,
        activation_token:activationToken,
        expires_at:expiresAt
      })
    });
    const receipt=await response.json();
    if(!response.ok||!receipt?.ok)throw new Error(`WA_HANDOFF_FAILED:${receipt?.error||response.status}`);

    const {error:completeError}=await admin.rpc("aab_complete_rehearsal_handoff",{p_decision_id:decisionId,p_receipt:receipt});
    if(completeError)throw completeError;

    return json({
      ok:true,
      decision_id:decisionId,
      correlation_id:handoff.correlation_id,
      source_type:handoff.source_type,
      classification:"PERSONAL_WA_REHEARSAL",
      government_authority:false,
      production:false,
      legal_effect:"NONE_TEST_ONLY",
      external_invitations_locked:true,
      document_readback_verified:receipt.document_readback_verified===true,
      pending_activation_issued:true,
      activation_claimed:false,
      document_accepted:false,
      membership_created:false,
      authority_granted:false,
      activation_token:activationToken,
      activation_expires_at:expiresAt
    });
  }catch(error){
    console.error("wa-rehearsal-provision",String(error));
    return json({error:"Rehearsal handoff failed closed"},409);
  }
});