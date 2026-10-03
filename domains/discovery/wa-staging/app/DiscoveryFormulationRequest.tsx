"use client";

import {useMemo,useRef,useState} from "react";

const ingredientInterfaces=[
  ["Recovered glass-derived silica","Investigate material chemistry, plant-available silicon, contamination, particle size and respirable-dust controls first."],
  ["GS-Gel Polymer Base (AAB™)","Investigate whether a characterised candidate fraction can remain physically stable in a governed gel matrix."],
  ["Polymer Crosslinker (AAB-XCL)","Investigate crosslinking behaviour only after pH, ionic load and material compatibility are measured."],
  ["Matrix Stabiliser Polymer (Xanthan-type)","Investigate suspension, settling, viscosity and storage stability."],
  ["UE-CM Chelation Matrix","Investigate measured ion-binding behaviour; no nutrient-availability claim is created."],
  ["AminoBoost™ L-Amino Complex","Investigate compatibility and crop-response questions under a controlled comparison."],
  ["Osmolyte + Betaine Extract","Investigate a governed plant-stress response question with untreated controls."],
  ["Seaweed Bioactive Extract (Ascophyllum-type)","Investigate compatibility and response under a defined crop, soil and climate context."],
] as const;

const candidatePrompts:Record<string,string[]>={
  "Grain crop residues":["Compare dry-gel and wet-gel investigation pathways","Investigate fibre or silica-bearing fractions separately","Test moisture retention and release as a measured property","Design untreated and carrier-only controls","Measure seasonal availability and competing on-farm uses"],
  "FOGO-derived organics":["Characterise stable and unstable organic fractions","Investigate contamination before biological compatibility","Compare compost-derived and separated feedstock fractions","Measure water, nutrient and energy processing demands","Identify horticulture, rehabilitation and broadacre research contexts"],
  "Red Hill landfill material system":["Separate recoverable fractions before proposing any pathway","Investigate physical and chemical variability","Establish contamination and worker-safety exclusions","Map current processors and verified end users","Design a material-specific characterisation sequence"],
};

const fallbackPrompts=["Characterise the physical candidate before pathway testing","Identify present producers, users and competing uses","Define a farming or production context","Design a control and graduated investigation","Resolve safety, environmental and regulatory exclusions"];

export default function DiscoveryFormulationRequest({candidate,pathways,knowledgeGap}:{candidate:string;pathways:string[];knowledgeGap:string}){
  const prompts=candidatePrompts[candidate]??fallbackPrompts;
  const [selectedPrompts,setSelectedPrompts]=useState<string[]>([]),[selectedIngredients,setSelectedIngredients]=useState<string[]>([]);
  const [why,setWhy]=useState(""),[expected,setExpected]=useState(""),[farmingContext,setFarmingContext]=useState(""),[drafted,setDrafted]=useState(false);
  const draftRef=useRef<HTMLDivElement|null>(null);
  const ready=selectedPrompts.length>0&&selectedIngredients.length>0&&why.trim().length>=12&&farmingContext.trim().length>=3;
  const requestId=useMemo(()=>`DISC-${candidate.replace(/[^A-Z0-9]/gi,"").slice(0,8).toUpperCase()}-DRAFT`,[candidate]);
  const toggle=(value:string,setter:(next:string[])=>void,current:string[])=>setter(current.includes(value)?current.filter(item=>item!==value):[...current,value]);
  const prepareDraft=()=>{setDrafted(true);window.setTimeout(()=>draftRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),80)};
  const downloadRequest=()=>{
    const createdAt=new Date().toISOString();
    const payload={
      schema:"AAB_FORMULATION_INVESTIGATION_REQUEST",
      schema_version:"1.0.0",
      request_id:requestId,
      created_at:createdAt,
      jurisdiction:"AU/WA",
      status:"SCIENTIST_INITIATED_EXPERIMENTAL_UNVERIFIED",
      primary_candidate:{name:candidate,role:"DISCOVERED_PRIMARY_CANDIDATE",evidence_origin:"AAB governed Discovery workspace"},
      requested_formulation_purpose:`Build an experimental formulation investigation using ${candidate} as the primary candidate and investigate compatibility with ${selectedIngredients.join(", ")} in the stated context.`,
      farming_or_production_context:farmingContext,
      scientific_why:why,
      expected_measured_outcome:expected||null,
      investigation_prompts:selectedPrompts,
      selected_research_interfaces:selectedIngredients.map(name=>({name,role:"INVESTIGATE_COMPATIBILITY_ONLY",note:ingredientInterfaces.find(([item])=>item===name)?.[1]??""})),
      governance:{formulation_created:false,trial_created:false,submitted_to_aab:false,ingredient_inclusion_rates_present:false,scientist_review_required:true},
      upload_instruction:"Upload this request individually into the future AAB Formulation Request workspace and review every field before submission."
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download=`AAB-${candidate.replace(/[^a-z0-9]+/gi,"-").replace(/^-|-$/g,"")}-formulation-investigation-request.json`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url);
  };
  return <section className="discoveryRequest" aria-label="Scientist-led discovery request">
    <header><div><small>GOVERNED DISCOVERY WORKSPACE</small><h4>Turn this candidate into a scientific question</h4><p>AAB supplies evidence and investigation prompts. The scientist chooses the question, confirms the WHY and decides whether a draft should enter formal review.</p></div><span>FORMULATION REMAINS LOCKED</span></header>
    <div className="discoveryBoundary"><b>DISCOVERY OUTPUT</b><span>Scientist-initiated request · experimental / unverified · no ingredient, formulation, trial or recommendation is created here.</span></div>
    <div className="discoveryMarketGrid"><article><small>ADOPTION EVIDENCE TO CONNECT</small><strong>Who uses it, where and how usage is changing</strong><p>Connect verified production, sales, processor, grower-survey and government records. Satellite observations cannot identify individual users.</p></article><article><small>FARMING CONTEXT TO TEST</small><strong>Where could investigation be relevant?</strong><p>{pathways.join(" · ")}. These are investigation pathways, not suitability claims.</p></article><article><small>KNOWN BLOCKER</small><strong>Evidence must precede compatibility</strong><p>{knowledgeGap}</p></article></div>
    <div className="discoveryBuilder">
      <section><small>1 · SELECT INVESTIGATION PROMPTS</small><div className="discoveryChoices">{prompts.map(prompt=><button type="button" aria-pressed={selectedPrompts.includes(prompt)} className={selectedPrompts.includes(prompt)?"selected":""} onClick={()=>toggle(prompt,setSelectedPrompts,selectedPrompts)} key={prompt}>{selectedPrompts.includes(prompt)?"✓ ":"+ "}{prompt}</button>)}</div></section>
      <section><small>2 · SELECT POSSIBLE RESEARCH INTERFACES</small><p className="sectionHelp">Choose one or many. Each remains a compatibility question and is never treated as an ingredient inclusion.</p><div className="interfaceSelectionCount"><b>1 PRIMARY CANDIDATE</b><span>{selectedIngredients.length} POSSIBLE RESEARCH INTERFACE{selectedIngredients.length===1?"":"S"} SELECTED</span></div><div className="ingredientInterfaces">{ingredientInterfaces.map(([name,note])=><button type="button" aria-pressed={selectedIngredients.includes(name)} className={selectedIngredients.includes(name)?"selected":""} onClick={()=>{toggle(name,setSelectedIngredients,selectedIngredients);setDrafted(false)}} key={name}><b>{selectedIngredients.includes(name)?"✓ ":"+ "}{name}</b><span>{note}</span></button>)}</div></section>
      <section className="scientistRequestFields"><small>3 · SCIENTIST DEFINES THE REQUEST</small><label>Farming or production context<input value={farmingContext} onChange={event=>{setFarmingContext(event.target.value);setDrafted(false)}} placeholder="e.g. Wheatbelt broadacre grain, horticulture or rehabilitation"/></label><label>WHY must AAB investigate this?<textarea value={why} onChange={event=>{setWhy(event.target.value);setDrafted(false)}} placeholder="State the scientific reason—required for governance."/></label><label>Expected measured outcome <span>optional</span><textarea value={expected} onChange={event=>{setExpected(event.target.value);setDrafted(false)}} placeholder="Describe what would be measured, not what AAB assumes will happen."/></label><button className="prepareDiscoveryRequest" disabled={!ready} onClick={prepareDraft}>{drafted?"Draft prepared ✓ · review below":"Prepare governed draft request"}</button>{!ready&&<p className="requestRequirement">Required: select at least one investigation prompt, select one or more possible research interfaces, and provide the farming context and WHY.</p>}</section>
    </div>
    {drafted&&<div className="discoveryDraft" role="status" ref={draftRef}><header><div><small>{requestId}</small><strong>Formulation investigation request ready to save</strong></div><b>SCIENTIST-INITIATED · EXPERIMENTAL / UNVERIFIED</b></header><p className="requestPurpose">Request: build an experimental formulation investigation using <b>{candidate}</b> as the primary candidate and investigate compatibility with <b>{selectedIngredients.join(", ")}</b> in the stated farming or production context.</p><dl><div><dt>Primary candidate</dt><dd>{candidate} · DISCOVERED PRIMARY CANDIDATE</dd></div><div><dt>Context</dt><dd>{farmingContext}</dd></div><div><dt>WHY</dt><dd>{why}</dd></div><div><dt>Investigation prompts</dt><dd>{selectedPrompts.join(" · ")}</dd></div><div><dt>Possible research interfaces</dt><dd>{selectedIngredients.join(" · ")} · INVESTIGATE COMPATIBILITY ONLY</dd></div><div><dt>Expected measurement</dt><dd>{expected||"Scientist has not specified an expected measurement"}</dd></div></dl><div className="draftLocalActions"><button onClick={downloadRequest}>Download this request to my computer</button><button onClick={()=>{setDrafted(false);window.scrollTo({top:Math.max(0,window.scrollY-240),behavior:"smooth"})}}>Edit request</button></div><footer><b>NO FORMULATION CREATED</b><span>The downloaded JSON file remains on the user’s computer. It can later be uploaded individually into AAB’s separate Formulation Request workspace for review. Nothing is submitted from this Discovery page.</span></footer></div>}
  </section>;
}
