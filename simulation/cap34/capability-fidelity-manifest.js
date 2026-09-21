(function () {
  "use strict";
  const VALIDATOR_ID="AAB-CAP34-FIDELITY-MANIFEST-VALIDATOR";
  const VALIDATOR_VERSION="1.2.0";
  const TRUSTED_ROSTER=Object.freeze({rosterId:"AAB-WORKSTREAM-B-CAPABILITY-IDENTITY-ROSTER",rosterVersion:"1.0.0",rosterSnapshotId:"WORKSTREAM-B-LAUNCH-GAP-2026-09-19-ROSTER-001",rosterDigest:"sha256:72b3469699159d47bd6c882a39378f52ff70de24c6cbe2017ac37434e5d3f41e",sourceCommitSha:"b9be2de868618b9d4d00ded7ea99159a129813af",sourceBlobSha:"ccdf183b89c4fc45d083643d89d4425a156a8230"});
  const FIDELITY = Object.freeze({REAL:"REAL_LOGIC_SYNTHETIC_REFERENCE_DATA",PARTIAL:"PARTIAL_REAL_LOGIC_LIMITATIONS_SHOWN",PREVIEW:"CONCEPT_PREVIEW_NOT_IMPLEMENTED",NONE:"NOT_YET_REPRESENTED"});
  const MODE = Object.freeze({LIVE:"LIVE_SIMULATION",PREVIEW:"ROADMAP_PREVIEW",NONE:"NONE"});
  function canonicalize(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalize(value[key])).join(",") + "}";
  }
  function sha256(text) {
    const bytes=new TextEncoder().encode(text),words=[],bitLength=bytes.length*8;
    for(let i=0;i<bytes.length;i+=1) words[i>>2]=(words[i>>2]||0)|bytes[i]<<(24-(i%4)*8);
    words[bitLength>>5]=(words[bitLength>>5]||0)|0x80<<(24-bitLength%32);
    words[((bitLength+64>>9)<<4)+15]=bitLength;
    const k=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2],h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],rotr=(n,x)=>(x>>>n)|(x<<(32-n));
    for(let offset=0;offset<words.length;offset+=16){const w=new Array(64);for(let i=0;i<16;i+=1)w[i]=words[offset+i]|0;for(let i=16;i<64;i+=1){const s0=rotr(7,w[i-15])^rotr(18,w[i-15])^(w[i-15]>>>3),s1=rotr(17,w[i-2])^rotr(19,w[i-2])^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0;}let[a,b,c,d,e,f,g,hh]=h;for(let i=0;i<64;i+=1){const s1=rotr(6,e)^rotr(11,e)^rotr(25,e),ch=(e&f)^(~e&g),t1=(hh+s1+ch+k[i]+w[i])|0,s0=rotr(2,a)^rotr(13,a)^rotr(22,a),maj=(a&b)^(a&c)^(b&c),t2=(s0+maj)|0;hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0;}h[0]=(h[0]+a)|0;h[1]=(h[1]+b)|0;h[2]=(h[2]+c)|0;h[3]=(h[3]+d)|0;h[4]=(h[4]+e)|0;h[5]=(h[5]+f)|0;h[6]=(h[6]+g)|0;h[7]=(h[7]+hh)|0;}
    return h.map(value=>(value>>>0).toString(16).padStart(8,"0")).join("");
  }
  function computeSnapshotDigest(entries){return "sha256:"+sha256(canonicalize(entries));}
  function identityOf(entry){return entry.capabilityId+":"+(entry.capabilityPart||"ROOT");}
  function computeRosterDigest(identities){return "sha256:"+sha256(canonicalize(identities));}
  function validateRoster(roster,registry){
    const errors=[];
    if(!roster||!Array.isArray(roster.identities))errors.push("AUTHORITATIVE_ROSTER_REQUIRED");
    if(!registry||registry.appendOnly!==true||!Array.isArray(registry.rosters))errors.push("APPEND_ONLY_ROSTER_REGISTRY_REQUIRED");
    if(errors.length)return errors;
    if(roster.rosterId!==TRUSTED_ROSTER.rosterId)errors.push("TRUSTED_ROSTER_ID_MISMATCH");
    if(roster.rosterVersion!==TRUSTED_ROSTER.rosterVersion)errors.push("TRUSTED_ROSTER_VERSION_MISMATCH");
    if(roster.rosterSnapshotId!==TRUSTED_ROSTER.rosterSnapshotId)errors.push("TRUSTED_ROSTER_SNAPSHOT_MISMATCH");
    if(roster.rosterDigest!==TRUSTED_ROSTER.rosterDigest)errors.push("TRUSTED_ROSTER_DIGEST_MISMATCH");
    if(roster.sourceCommitSha!==TRUSTED_ROSTER.sourceCommitSha)errors.push("TRUSTED_ROSTER_SOURCE_COMMIT_MISMATCH");
    if(roster.sourceBlobSha!==TRUSTED_ROSTER.sourceBlobSha)errors.push("TRUSTED_ROSTER_SOURCE_BLOB_MISMATCH");
    if(!/^sha256:[0-9a-f]{64}$/.test(roster.rosterDigest||""))errors.push("VALID_ROSTER_DIGEST_REQUIRED");else if(roster.rosterDigest!==computeRosterDigest(roster.identities))errors.push("ROSTER_DIGEST_MISMATCH");
    const archive=registry.rosters.find(item=>item.rosterId===roster.rosterId&&item.rosterVersion===roster.rosterVersion&&item.rosterSnapshotId===roster.rosterSnapshotId);
    if(!archive)errors.push("ROSTER_NOT_ARCHIVED");else{
      if(archive.rosterDigest!==roster.rosterDigest)errors.push("ARCHIVED_ROSTER_DIGEST_MISMATCH");
      if(archive.sourceCommitSha!==roster.sourceCommitSha)errors.push("ROSTER_SOURCE_COMMIT_MISMATCH");
      if(archive.sourceBlobSha!==roster.sourceBlobSha)errors.push("ROSTER_SOURCE_BLOB_MISMATCH");
    }
    const identities=new Set();
    for(const entry of roster.identities){const identity=identityOf(entry);if(identities.has(identity))errors.push("DUPLICATE_ROSTER_IDENTITY:"+identity);identities.add(identity);if(!["ACTIVE","RETIRED"].includes(entry.lifecycleStatus))errors.push("INVALID_ROSTER_LIFECYCLE:"+identity);if(entry.lifecycleStatus==="ACTIVE"&&entry.requiredInManifest!==true)errors.push("ACTIVE_IDENTITY_MUST_BE_REQUIRED:"+identity);if(entry.lifecycleStatus==="RETIRED"&&entry.requiredInManifest!==false)errors.push("RETIRED_IDENTITY_MUST_NOT_BE_REQUIRED:"+identity);}
    const activeCount=roster.identities.filter(entry=>entry.lifecycleStatus==="ACTIVE").length;
    const retiredCount=roster.identities.filter(entry=>entry.lifecycleStatus==="RETIRED").length;
    if(roster.identityCount!==roster.identities.length)errors.push("ROSTER_IDENTITY_COUNT_MISMATCH");
    if(roster.activeIdentityCount!==activeCount)errors.push("ROSTER_ACTIVE_COUNT_MISMATCH");
    if(roster.retiredIdentityCount!==retiredCount)errors.push("ROSTER_RETIRED_COUNT_MISMATCH");
    return errors;
  }
  function validateManifest(m,roster,rosterRegistry){
    const errors=[];
    if(!m||!Array.isArray(m.entries))errors.push("MANIFEST_ENTRIES_REQUIRED");
    if(!m||!m.manifestSnapshotId)errors.push("SNAPSHOT_ID_REQUIRED");
    if(!m||!m.manifestVersion)errors.push("MANIFEST_VERSION_REQUIRED");
    errors.push(...validateRoster(roster,rosterRegistry));
    if(errors.length)return Object.freeze({status:"FAIL_CLOSED_MANIFEST_INVALID",validatorId:VALIDATOR_ID,validatorVersion:VALIDATOR_VERSION,errors});
    if(!/^sha256:[0-9a-f]{64}$/.test(m.snapshotDigest||""))errors.push("VALID_SNAPSHOT_DIGEST_REQUIRED");else if(m.snapshotDigest!==computeSnapshotDigest(m.entries))errors.push("SNAPSHOT_DIGEST_MISMATCH");
    const identities=new Set();
    for(const e of m.entries){const itemIdentity=e.capabilityId+":"+(e.capabilityPart||"ROOT");if(identities.has(itemIdentity))errors.push("DUPLICATE_IDENTITY:"+itemIdentity);identities.add(itemIdentity);if(!e.representationVersion)errors.push("REPRESENTATION_VERSION_REQUIRED:"+itemIdentity);if(!Object.values(FIDELITY).includes(e.fidelity))errors.push("INVALID_FIDELITY:"+itemIdentity);if(!Object.values(MODE).includes(e.simulatorMode))errors.push("INVALID_MODE:"+itemIdentity);if(e.fidelity===FIDELITY.REAL&&e.simulatorMode!==MODE.LIVE)errors.push("REAL_REQUIRES_LIVE:"+itemIdentity);if(e.fidelity===FIDELITY.PREVIEW&&e.simulatorMode!==MODE.PREVIEW)errors.push("PREVIEW_REQUIRES_PREVIEW_MODE:"+itemIdentity);if(e.fidelity===FIDELITY.NONE&&e.simulatorMode!==MODE.NONE)errors.push("NOT_REPRESENTED_REQUIRES_NONE:"+itemIdentity);if(e.fidelity===FIDELITY.REAL&&(!e.implementationReferences||!e.implementationReferences.length))errors.push("REAL_REQUIRES_IMPLEMENTATION_REFERENCE:"+itemIdentity);if(e.simulatorMode===MODE.PREVIEW&&(!e.limitations?.length||!e.nonImplications?.length))errors.push("PREVIEW_DISCLOSURE_REQUIRED:"+itemIdentity);if(e.capabilityId==="CAP-33"&&e.disclosureBurden!=="EXCEPTIONAL")errors.push("CAP33_EXCEPTIONAL_DISCLOSURE_REQUIRED");}
    if(m.capabilityCount!==m.entries.length)errors.push("CAPABILITY_COUNT_MISMATCH");
    const requiredRosterIdentities=new Set(roster.identities.filter(entry=>entry.lifecycleStatus==="ACTIVE"&&entry.requiredInManifest===true).map(identityOf));
    const retiredRosterIdentities=new Set(roster.identities.filter(entry=>entry.lifecycleStatus==="RETIRED").map(identityOf));
    for(const requiredIdentity of requiredRosterIdentities)if(!identities.has(requiredIdentity))errors.push("MISSING_CANONICAL_IDENTITY:"+requiredIdentity);
    for(const identity of identities){if(retiredRosterIdentities.has(identity))errors.push("RETIRED_IDENTITY_PRESENT:"+identity);else if(!requiredRosterIdentities.has(identity))errors.push("UNDECLARED_MANIFEST_IDENTITY:"+identity);}
    if(identities.has("CAP-14:ROOT"))errors.push("CAP14_MERGED_IDENTITY_FORBIDDEN");
    if(m.capabilityCount!==requiredRosterIdentities.size)errors.push("AUTHORITATIVE_CAPABILITY_COUNT_MISMATCH");
    return Object.freeze({status:errors.length?"FAIL_CLOSED_MANIFEST_INVALID":"PASS_CAP34_FIDELITY_MANIFEST_VALID",validatorId:VALIDATOR_ID,validatorVersion:VALIDATOR_VERSION,rosterId:roster.rosterId,rosterVersion:roster.rosterVersion,rosterSnapshotId:roster.rosterSnapshotId,rosterDigest:roster.rosterDigest,manifestSnapshotId:m.manifestSnapshotId,manifestVersion:m.manifestVersion,snapshotDigest:m.snapshotDigest,capabilityCount:m.entries.length,errors});
  }
  // Checks each manifest entry's declared representationVersion against the
  // corresponding live implementation file's own self-declared version
  // constant (e.g. CAP01_IMPLEMENTATION_VERSION), so an implementation
  // edited without updating the manifest -- or a manifest edited without
  // touching the implementation -- fails closed instead of silently
  // drifting apart. Deliberately independent of validateManifest: archived
  // manifest snapshots are validated by validateManifest alone (see
  // cap34-historical-snapshot-validity.behavioural-test.js) and must never
  // be checked against today's implementation versions, since an archived
  // snapshot's representationVersion was correct for the implementation AT
  // THE TIME it was archived, not for the implementation as it stands now.
  // Only capabilities present as keys in implementationVersionsByCapabilityId
  // are checked; a capability with no live implementation to compare
  // against (e.g. a roadmap-preview or plan-only entry) is silently skipped,
  // not treated as a failure.
  function validateImplementationVersions(entries,implementationVersionsByCapabilityId){
    const errors=[];
    const list=Array.isArray(entries)?entries:[];
    const map=implementationVersionsByCapabilityId||{};
    for(const e of list){
      if(!Object.prototype.hasOwnProperty.call(map,e.capabilityId))continue;
      const identity=identityOf(e);
      const implementationVersion=map[e.capabilityId];
      if(!implementationVersion){errors.push("IMPLEMENTATION_VERSION_REQUIRED:"+identity);continue;}
      if(implementationVersion!==e.representationVersion)errors.push("IMPLEMENTATION_VERSION_MISMATCH:"+identity);
    }
    return Object.freeze({status:errors.length?"FAIL_CLOSED_IMPLEMENTATION_VERSION_MISMATCH":"PASS_IMPLEMENTATION_VERSIONS_MATCH",validatorId:VALIDATOR_ID,validatorVersion:VALIDATOR_VERSION,errors});
  }
  window.AAB_CAP34_FIDELITY_MANIFEST=Object.freeze({validatorId:VALIDATOR_ID,validatorVersion:VALIDATOR_VERSION,trustedRoster:TRUSTED_ROSTER,FIDELITY,MODE,canonicalize,computeSnapshotDigest,computeRosterDigest,validateRoster,validateManifest,validateImplementationVersions});
}());
