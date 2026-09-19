"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const childProcess = require("child_process");

const ROOT = __dirname;
const read = (name) => fs.readFileSync(path.join(ROOT, name));
const json = (name) => JSON.parse(read(name).toString("utf8"));
const copy = (value) => JSON.parse(JSON.stringify(value));
const gitBlobSha = (name) => {
  const bytes = read(name);
  return crypto.createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
};
const sha256 = (name) => crypto.createHash("sha256").update(read(name)).digest("hex");

const canonicalSources = [
  {file:"PR16-CAP-34-DISCLOSURE-RECEIPT-CONTRACT.md",path:"governance/workstream-b/CAP-34-DISCLOSURE-RECEIPT-CONTRACT.md",blobSha:"4d01b86546d0c08cb6507cfc3345e1bf98bad766"},
  {file:"PR16-CAP-34-DISCLOSURE-RECEIPT-VALIDATOR-TEST-MATRIX.md",path:"governance/workstream-b/CAP-34-DISCLOSURE-RECEIPT-VALIDATOR-TEST-MATRIX.md",blobSha:"65b1311d2b1df463439122bf54e7c94ba84c3266"},
  {file:"PR16-cap34-disclosure-receipt-v1.0.0.schema.json",path:"simulation/cap34/cap34-disclosure-receipt-v1.0.0.schema.json",blobSha:"e1291b5c6ea0b808c64ff1584485e748a7d74eb6"},
  {file:"PR16-cap34-disclosure-receipt.js",path:"simulation/cap34/cap34-disclosure-receipt.js",blobSha:"14b171198363f5797245601530c95488bafac7de"}
];
const contractBinding = canonicalSources.map((source) => ({...source,actualBlobSha:gitBlobSha(source.file),passed:gitBlobSha(source.file)===source.blobSha}));

const manifest = json("capability-fidelity-manifest.json");
const roster = json("CAP-34-Authoritative-Capability-Identity-Roster.json");
const rosterRegistry = json("CAP-34-Capability-Identity-Roster-Registry.json");
const snapshotRegistry = json("CAP-34-Fidelity-Manifest-Snapshot-Registry.json");
const sandbox = {window:{},TextEncoder};
vm.createContext(sandbox);
vm.runInContext(read("CAP-34-Capability-Fidelity-Manifest-Validator.js").toString("utf8"),sandbox);
vm.runInContext(read("CAP-34-Canonical-Disclosure-Receipt-Validator.js").toString("utf8"),sandbox);
const manifestApi=sandbox.window.AAB_CAP34_FIDELITY_MANIFEST;
const receiptApi=sandbox.window.AAB_CAP34_DISCLOSURE_RECEIPT;
const manifestRun=childProcess.spawnSync(process.execPath,[path.join(ROOT,"CAP-34-Capability-Fidelity-Manifest-Validator-Behavioural-Test.js")],{cwd:ROOT,encoding:"utf8"});
const manifestProof=JSON.parse(manifestRun.stdout);

function entry(id,part="ROOT",source=manifest){return source.entries.find((item)=>item.capabilityId===id&&(item.capabilityPart||"ROOT")===part);}
function presented(item){return {capabilityId:item.capabilityId,capabilityPart:item.capabilityPart,capabilityName:item.capabilityName,representationVersion:item.representationVersion,simulatorMode:item.simulatorMode,fidelity:item.fidelity,manifestDisclosureBurden:item.disclosureBurden,limitationsPresented:copy(item.limitations),nonImplicationsPresented:copy(item.nonImplications)};}
function baseReceipt(){return {receiptId:"CAP34-CANONICAL-RECEIPT-001",receiptContractVersion:"1.0.0",createdAt:"2026-09-19T22:30:00.000Z",correlationId:"CAP34-CORRELATION-001",authority:"DISCLOSURE_ACKNOWLEDGEMENT_ONLY_NO_LEGAL_COMMERCIAL_SCIENTIFIC_REGULATORY_PRODUCTION_OR_COMMISSIONING_AUTHORITY",manifestSnapshotId:manifest.manifestSnapshotId,manifestVersion:manifest.manifestVersion,manifestSourceReference:manifest.sourceLandscapeReference,evaluator:{displayName:"Synthetic evaluator",evaluatorReferenceId:null,role:"GOVERNMENT_EVALUATOR",organisation:"Synthetic organisation"},capabilitiesPresented:[presented(entry("CAP-34"))],roadmapPreview:{entered:false,previewVersion:null,enteredAt:null,capabilitiesEntered:[]},acknowledgement:{wordingVersion:"CAP34-ROADMAP-ACK-1.0.0",wording:"I understand that Roadmap Preview is planned capability and is not evidence of implementation or readiness.",accepted:true,acceptedAt:"2026-09-19T22:30:00.000Z"},receiptDigest:null,signature:null};}
const fail="FAIL_CLOSED_DISCLOSURE_RECEIPT_INVALID",pass="PASS_CAP34_DISCLOSURE_RECEIPT_VALID";
const mutate=(fn)=>()=>{const r=baseReceipt();fn(r);return {receipt:r,manifest,snapshotRegistry};};

const fixtures=[
  {id:"DRV-01",expect:pass,errors:[],prepare:()=>({receipt:baseReceipt(),manifest,snapshotRegistry})},
  {id:"DRV-02",expect:fail,errors:["MANIFEST_SNAPSHOT_MISMATCH"],prepare:mutate(r=>r.manifestSnapshotId="CAP34-WRONG")},
  {id:"DRV-03",expect:fail,errors:["MANIFEST_VERSION_MISMATCH"],prepare:mutate(r=>r.manifestVersion="999.0.0")},
  {id:"DRV-04",expect:fail,errors:["REPRESENTATION_VERSION_MISMATCH:CAP-34:ROOT"],prepare:mutate(r=>r.capabilitiesPresented[0].representationVersion="0.0.9")},
  {id:"DRV-05",expect:fail,errors:["FIDELITY_MISMATCH:CAP-34:ROOT"],prepare:mutate(r=>r.capabilitiesPresented[0].fidelity="REAL_LOGIC_SYNTHETIC_REFERENCE_DATA")},
  {id:"DRV-06",expect:fail,errors:["SIMULATOR_MODE_MISMATCH:CAP-34:ROOT"],prepare:mutate(r=>r.capabilitiesPresented[0].simulatorMode="ROADMAP_PREVIEW")},
  {id:"DRV-07",expect:fail,errors:["DISCLOSURE_BURDEN_MISMATCH:CAP-34:ROOT"],prepare:mutate(r=>r.capabilitiesPresented[0].manifestDisclosureBurden="HEIGHTENED")},
  {id:"DRV-08",expect:fail,errors:["UNREPRESENTED_CAPABILITY_CANNOT_BE_SHOWN:CAP-01:ROOT"],prepare:mutate(r=>r.capabilitiesPresented=[presented(entry("CAP-01"))])},
  {id:"DRV-09",expect:fail,errors:["CAPABILITY_NOT_IN_MANIFEST:CAP-99:ROOT"],prepare:mutate(r=>{const p=copy(r.capabilitiesPresented[0]);p.capabilityId="CAP-99";r.capabilitiesPresented=[p];})},
  {id:"DRV-10",expect:fail,errors:["DUPLICATE_PRESENTED_CAPABILITY:CAP-34:ROOT"],prepare:mutate(r=>r.capabilitiesPresented.push(copy(r.capabilitiesPresented[0])))},
  {id:"DRV-11",expect:fail,errors:["LIMITATIONS_REQUIRED:CAP-34:ROOT"],prepare:mutate(r=>r.capabilitiesPresented[0].limitationsPresented=[])},
  {id:"DRV-12",expect:fail,errors:["NON_IMPLICATIONS_REQUIRED:CAP-34:ROOT"],prepare:mutate(r=>r.capabilitiesPresented[0].nonImplicationsPresented=[])},
  {id:"DRV-13",expect:fail,errors:["ROADMAP_ACKNOWLEDGEMENT_REQUIRED","ACKNOWLEDGEMENT_NOT_ACCEPTED"],prepare:mutate(r=>{r.roadmapPreview={entered:true,previewVersion:"1.0.0",enteredAt:r.createdAt,capabilitiesEntered:[{capabilityId:"CAP-34",capabilityPart:null}]};r.acknowledgement.accepted=false;})},
  {id:"DRV-14",expect:fail,errors:["ROADMAP_PREVIEW_VERSION_REQUIRED","ROADMAP_PREVIEW_ENTERED_AT_REQUIRED","ROADMAP_PREVIEW_CAPABILITIES_REQUIRED"],prepare:mutate(r=>{r.roadmapPreview={entered:true,previewVersion:null,enteredAt:null,capabilitiesEntered:[]};})},
  {id:"DRV-15",expect:fail,errors:["ROADMAP_CAPABILITY_NOT_CLASSIFIED_PREVIEW:CAP-34:ROOT"],prepare:mutate(r=>r.roadmapPreview={entered:true,previewVersion:"1.0.0",enteredAt:r.createdAt,capabilitiesEntered:[{capabilityId:"CAP-34",capabilityPart:null}]})},
  {id:"DRV-16",expect:fail,errors:["ROADMAP_CAPABILITY_NOT_RECORDED_AS_PRESENTED:CAP-01:ROOT"],prepare:mutate(r=>r.roadmapPreview={entered:true,previewVersion:"1.0.0",enteredAt:r.createdAt,capabilitiesEntered:[{capabilityId:"CAP-01",capabilityPart:null}]})},
  {id:"DRV-17",expect:fail,errors:["ROADMAP_CAPABILITIES_WITHOUT_ENTRY"],prepare:mutate(r=>r.roadmapPreview={entered:false,previewVersion:null,enteredAt:null,capabilitiesEntered:[{capabilityId:"CAP-34",capabilityPart:null}]})},
  {id:"DRV-18",expect:fail,errors:["EVALUATOR_REFERENCE_REQUIRED"],prepare:mutate(r=>{r.evaluator.displayName=null;r.evaluator.evaluatorReferenceId=null;})},
  {id:"DRV-19",expect:fail,errors:["EVALUATOR_ROLE_REQUIRED"],prepare:mutate(r=>r.evaluator.role="")},
  {id:"DRV-20",expect:fail,errors:["CORRELATION_ID_REQUIRED"],prepare:mutate(r=>r.correlationId="")},
  {id:"DRV-21",expect:fail,errors:["INVALID_RECEIPT_AUTHORITY"],prepare:mutate(r=>r.authority="ALTERED")},
  {id:"DRV-22",expect:fail,errors:["UNSUPPORTED_RECEIPT_CONTRACT_VERSION"],prepare:mutate(r=>r.receiptContractVersion="2.0.0")},
  {id:"DRV-23",expect:fail,errors:["DISCLOSURE_BURDEN_MISMATCH:CAP-33:ROOT"],prepare:mutate(r=>{const p=presented(entry("CAP-33"));p.manifestDisclosureBurden="STANDARD";r.capabilitiesPresented=[p];})},
  {id:"DRV-24",expect:fail,errors:["FIDELITY_MISMATCH:CAP-33:ROOT"],prepare:mutate(r=>{const p=presented(entry("CAP-33"));p.fidelity="CONCEPT_PREVIEW_NOT_IMPLEMENTED";r.capabilitiesPresented=[p];})},
  {id:"DRV-25",expect:pass,errors:[],prepare:()=>{const reg=copy(snapshotRegistry);reg.snapshots.push({manifestId:manifest.manifestId,manifestVersion:"1.1.0",manifestSnapshotId:"CAP34-MANIFEST-FUTURE-002",snapshotDigest:"sha256:"+"a".repeat(64),archivedManifestReference:"future.json"});return {receipt:baseReceipt(),manifest,snapshotRegistry:reg};}},
  {id:"DRV-26",expect:fail,errors:["MANIFEST_SNAPSHOT_MISMATCH"],prepare:()=>{const future=copy(manifest);entry("CAP-14","A",future).representationVersion="0.2.0";future.manifestVersion="1.1.0";future.manifestSnapshotId="CAP34-MANIFEST-FUTURE-002";future.snapshotDigest=manifestApi.computeSnapshotDigest(future.entries);return {receipt:baseReceipt(),manifest:future,snapshotRegistry};}},
  {id:"DRV-27",expect:fail,errors:["RECEIPT_AND_MANIFEST_REQUIRED"],prepare:()=>({receipt:null,manifest:null,snapshotRegistry})},
  {id:"DRV-28",expect:fail,errors:["ACKNOWLEDGEMENT_NOT_ACCEPTED"],prepare:mutate(r=>r.acknowledgement.accepted=false)}
];

const results=fixtures.map((fixture)=>{const c=fixture.prepare();const actual=receiptApi.validateDisclosureReceipt(c.receipt,c.manifest,c.snapshotRegistry,roster,rosterRegistry);return {fixtureId:fixture.id,expectedStatus:fixture.expect,actualStatus:actual.status,expectedErrors:fixture.errors,actualErrors:Array.from(actual.errors),passed:actual.status===fixture.expect&&fixture.errors.every(error=>actual.errors.includes(error))};});
const contractBound=contractBinding.every(item=>item.passed)&&json("PR16-cap34-disclosure-receipt-v1.0.0.schema.json").properties.receiptContractVersion.const==="1.0.0";
const manifestPassed=manifestRun.status===0&&manifestProof.result==="PASS_CAP34_MANIFEST_VALIDATOR_BEHAVIOURAL_PROOF"&&manifestProof.summary.fixtureCount===14;
const receiptPassed=results.length===28&&results.every(result=>result.passed);
const allPassed=contractBound&&manifestPassed&&receiptPassed;
const proof={proofId:"AAB-CAP34-CANONICAL-END-TO-END-BEHAVIOURAL-PROOF",proofVersion:"1.0.0",generatedAtUtc:new Date().toISOString(),result:allPassed?"PASS_CAP34_CANONICAL_END_TO_END_BEHAVIOURAL_PROOF":"FAIL_CLOSED_CAP34_CANONICAL_END_TO_END_BEHAVIOURAL_PROOF",scope:"Proves only byte-bound PR #16 contract relevance and the defined manifest/receipt validator behaviors. It does not prove capability implementation, scientific correctness, production readiness, sovereignty, commissioning, Gate D satisfaction or WP05 commencement.",pr16Binding:{repository:"AdvancedAgricultureBiometrix/aab-source-of-truth",pullRequest:16,headCommit:"b9be2de868618b9d4d00ded7ea99159a129813af",allCanonicalBlobShasMatched:contractBound,sources:contractBinding},manifestGate:{result:manifestProof.result,exitCode:manifestRun.status,fixtureCount:14,passedFixtureCount:manifestProof.summary.passedFixtureCount,validatorVersion:manifestApi.validatorVersion,validatorSha256:sha256("CAP-34-Capability-Fidelity-Manifest-Validator.js")},receiptGate:{result:receiptPassed?"PASS_CAP34_CANONICAL_DISCLOSURE_RECEIPT_BEHAVIOURAL_PROOF":"FAIL_CLOSED_CAP34_CANONICAL_DISCLOSURE_RECEIPT_BEHAVIOURAL_PROOF",fixtureCount:28,passedFixtureCount:results.filter(result=>result.passed).length,validatorVersion:receiptApi.validatorVersion,validatorSha256:sha256("CAP-34-Canonical-Disclosure-Receipt-Validator.js"),fixtures:results},summary:{totalFixtureCount:42,passedFixtureCount:manifestProof.summary.passedFixtureCount+results.filter(result=>result.passed).length,contractBindingPassed:contractBound}};
fs.writeFileSync(path.join(ROOT,"CAP-34-Canonical-End-to-End-Behavioural-Proof.json"),JSON.stringify(proof,null,2)+"\n");
process.stdout.write(JSON.stringify(proof,null,2)+"\n");
process.exitCode=allPassed?0:1;
