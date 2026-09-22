"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=__dirname;
const REPO_ROOT=path.join(ROOT,"..","..");
const read=n=>fs.readFileSync(path.join(ROOT,n),"utf8");

const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(read("scs-roadmap-preview.js"),sandbox);
const scs=sandbox.window.AAB_CAP34_SCS_ROADMAP_PREVIEW;

const cases=[];function check(id,passed,actual){cases.push({fixtureId:id,passed,actual});}

check("SCS-01-TWELVE-CAPABILITIES-PRESENT",scs.capabilities.length===12,{count:scs.capabilities.length});
check("SCS-02-ROSTER-ORDER-PRESERVED",scs.capabilities.every((c,i)=>c.id==="SCS-CAP-"+String(i+1).padStart(2,"0")),scs.capabilities.map(c=>c.id));

const designContractIds=["SCS-CAP-01","SCS-CAP-03","SCS-CAP-04","SCS-CAP-06","SCS-CAP-08","SCS-CAP-09"];
const conceptPreviewIds=["SCS-CAP-02","SCS-CAP-05","SCS-CAP-07","SCS-CAP-10","SCS-CAP-11","SCS-CAP-12"];

check("SCS-03-DESIGN-CONTRACT-BADGES-RENDER",designContractIds.every(id=>{const c=scs.capabilities.find(x=>x.id===id);return !!c&&c.maturity===scs.MATURITY.DESIGN_CONTRACT&&typeof c.contractPath==="string"&&c.contractPath.length>0;}),designContractIds.map(id=>scs.capabilities.find(x=>x.id===id)));
check("SCS-04-CONCEPT-PREVIEW-BADGES-RENDER",conceptPreviewIds.every(id=>{const c=scs.capabilities.find(x=>x.id===id);return !!c&&c.maturity===scs.MATURITY.CONCEPT_PREVIEW&&c.contractPath===null;}),conceptPreviewIds.map(id=>scs.capabilities.find(x=>x.id===id)));

check("SCS-05-NO-CAPABILITY-EVALUATE-ACTION",scs.capabilities.every(c=>typeof c.evaluate==="undefined"&&typeof c.run==="undefined"&&typeof c.onEvaluate==="undefined"),scs.capabilities.map(c=>Object.keys(c)));
check("SCS-06-NO-RUN-OR-EVALUATE-API-EXPOSED",typeof scs.runCapability==="undefined"&&typeof scs.evaluateCapability==="undefined"&&typeof scs.run==="undefined",{keys:Object.keys(scs)});

const denied=scs.revealPreview({accepted:false,wordingVersion:scs.SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION});
check("SCS-07-ACK-GATE-FAIL-CLOSED-WHEN-UNCHECKED",denied.status==="FAIL_CLOSED_SCS_ROADMAP_ACKNOWLEDGEMENT_REQUIRED"&&typeof denied.capabilities==="undefined",denied);

const wrongVersion=scs.revealPreview({accepted:true,wordingVersion:"WRONG-VERSION"});
check("SCS-08-ACK-GATE-VERSION-LOCKED",wrongVersion.status==="FAIL_CLOSED_SCS_ROADMAP_ACKNOWLEDGEMENT_REQUIRED",wrongVersion);

const revealed=scs.revealPreview({accepted:true,wordingVersion:scs.SCS_ROADMAP_ACKNOWLEDGEMENT_VERSION});
check("SCS-09-ACK-GATE-REVEALS-CARDS-ON-ACCEPT",revealed.status==="PASS_SCS_ROADMAP_PREVIEW_DISCLOSED"&&revealed.capabilities.length===12&&revealed.productionAuthority===false&&revealed.implementedCapability===false&&revealed.admittedCapability===false,revealed);

check("SCS-10-BRAIN-CANDIDATE-NOT-NUMBERED",scs.brainCandidate.isNumberedCapability===false&&scs.brainCandidate.designation==="SCS-BRAIN-CANDIDATE-01"&&scs.capabilities.every(c=>c.id!==scs.brainCandidate.designation),scs.brainCandidate);
check("SCS-11-BRAIN-CANDIDATE-NOT-ADMITTED-OR-IMPLEMENTED",scs.brainCandidate.admissionStatus==="NOT_ADMITTED"&&scs.brainCandidate.implementationStatus==="NOT_IMPLEMENTED",scs.brainCandidate);

check("SCS-12-DOMAIN-DISCLOSURE-PRESENT-AND-VISIBLE",typeof scs.DOMAIN_DISCLOSURE==="string"&&/none of the twelve scs capabilities are admitted, implemented, or operational/i.test(scs.DOMAIN_DISCLOSURE),{disclosure:scs.DOMAIN_DISCLOSURE});

check("SCS-13-SELF-VALIDATION-PASSES",scs.runValidation().status==="PASS_SCS_ROADMAP_PREVIEW_READY",scs.runValidation());

// Isolation proof: load only this module into a fresh sandbox and confirm the
// AGR disclosure-receipt and fidelity-manifest APIs never come into existence
// as a side effect, and this module exposes no receipt-generation function.
const isolatedSandbox={window:{}};vm.createContext(isolatedSandbox);vm.runInContext(read("scs-roadmap-preview.js"),isolatedSandbox);
check("SCS-14-NO-RECEIPT-CHAIN-INVOKED",typeof isolatedSandbox.window.AAB_CAP34_DISCLOSURE_RECEIPT==="undefined"&&typeof isolatedSandbox.window.AAB_CAP34_FIDELITY_MANIFEST==="undefined"&&typeof isolatedSandbox.window.AAB_CAP34_SCS_ROADMAP_PREVIEW.generateReceipt==="undefined"&&typeof isolatedSandbox.window.AAB_CAP34_SCS_ROADMAP_PREVIEW.validateDisclosureReceipt==="undefined",{windowKeys:Object.keys(isolatedSandbox.window)});

const all=cases.every(c=>c.passed);
const proof={proofId:"AAB-CAP34-SCS-ROADMAP-PREVIEW-BEHAVIOURAL-PROOF",proofVersion:"1.0.0",generatedAtUtc:new Date().toISOString(),result:all?"PASS_CAP34_SCS_ROADMAP_PREVIEW_BEHAVIOURAL_PROOF":"FAIL_CLOSED_CAP34_SCS_ROADMAP_PREVIEW_BEHAVIOURAL_PROOF",scope:"Proves only that the SCS Roadmap Preview section presents twelve non-operational SCS capability identities and the SCS Brain candidate under a fail-closed acknowledgement gate, with no evaluate/run action and no disclosure-receipt or fidelity-manifest API invoked. It does not prove SCS capability admission, implementation, scientific completeness, regulatory compliance, production readiness or commissioning.",fixtureCount:cases.length,passedFixtureCount:cases.filter(c=>c.passed).length,fixtures:cases};
fs.writeFileSync(path.join(REPO_ROOT,"governance","workstream-b","CAP-34-SCS-ROADMAP-PREVIEW-BEHAVIOURAL-PROOF.json"),JSON.stringify(proof,null,2)+"\n");
process.stdout.write(JSON.stringify(proof,null,2)+"\n");
process.exitCode=all?0:1;
