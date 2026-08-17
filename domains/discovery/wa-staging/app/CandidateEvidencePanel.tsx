"use client";

type EvidenceStatus="CONNECTED"|"DOCUMENTED"|"REQUIRED";
type EvidenceRecord={name:string;status:EvidenceStatus;detail:string;source?:string;sourceUrl?:string};

const fogoFacilityRecords=[
  {facility:"Landsdale Resource Recovery Park",place:"15 Attwell Street, Landsdale · Lot 79 on Diagram 57260",recordDate:"10 Jan 2025",recordType:"DWER works approval decision",fact:"DWER granted works approval W6947/2024/1. The decision report defines the premises by legal parcel and the premises maps attached to the instrument, and records proposed receival of 30,000 tonnes per annum of FOGO.",qualification:"Regulated premises and approved receival quantity — not a record of tonnes actually received.",sourceUrl:"https://der.wa.gov.au/images/documents/our-work/licences-and-works-approvals/Decisions_/W6947/W6947_20250110_DR.pdf",states:["IDENTITY · DOCUMENTED","PIXEL BOUNDARY · CONNECTED","ACTUAL TONNAGE · REQUIRED"]},
  {facility:"Veolia Landsdale facility expansion",place:"Landsdale · Perth metropolitan area",recordDate:"29 Apr 2025",recordType:"WA Government funding announcement",fact:"WA Government announced funding for a fully enclosed FOGO transfer facility designed to receive and process up to 50,000 tonnes per year.",qualification:"Published project capacity — not a record of actual annual tonnes received or processed.",sourceUrl:"https://www.wa.gov.au/government/media-statements/Cook%20Labor%20Government/-FOGO-facility-expansions-go-ahead-thanks-to-WasteSorted-funding-20250429",states:["PROJECT · DOCUMENTED","CAPACITY · DOCUMENTED","ACTUAL TONNAGE · REQUIRED"]},
];
const fogoAnnouncement="https://www.wa.gov.au/government/media-statements/Cook%20Labor%20Government/-FOGO-facility-expansions-go-ahead-thanks-to-WasteSorted-funding-20250429";

const common:EvidenceRecord[]=[
  {name:"Candidate provenance",status:"DOCUMENTED",detail:"The candidate record retains its named public supporting source."},
  {name:"Material characterisation",status:"REQUIRED",detail:"Composition, contamination and recoverable fractions require candidate-specific sampling or authoritative records."},
];

const profiles:Record<string,{domain:string;summary:string;records:EvidenceRecord[]}>= {
  "Red Hill landfill material system":{domain:"MATERIAL RECOVERY + ENVIRONMENT",summary:"Facility, land-surface, water-risk and material records belong on one dated candidate timeline.",records:[
    {name:"Registered investigation envelope",status:"CONNECTED",detail:"Exact candidate-local polygon available to the spatial investigation."},
    {name:"Landsat surface history",status:"CONNECTED",detail:"Natural colour, vegetation, moisture and disturbance records can be measured inside the same polygon."},
    {name:"Facility scale and throughput",status:"DOCUMENTED",detail:"365 ha facility and approximately 230,000 tonnes per year are stated by the supporting facility source.",source:"EMRC"},
    {name:"Rainfall and temperature",status:"REQUIRED",detail:"Dated rainfall, heat and cold records must be aligned to the candidate polygon timeline."},
    {name:"Fire and inundation boundaries",status:"REQUIRED",detail:"Only authoritative dated intersections may be displayed; no fire or flood statement is currently made."},
    {name:"Groundwater and drainage",status:"REQUIRED",detail:"Authoritative monitoring points, dates, analytes and results must be connected."},
    {name:"Land-use and operational history",status:"REQUIRED",detail:"Dated facility-cell, rehabilitation and disturbance boundaries are required."},
    {name:"Material fractions and safety",status:"REQUIRED",detail:"Waste-stream composition, contamination, recoverability and access are not established."},
  ]},
  "Grain crop residues":{domain:"AGRICULTURE + CLIMATE",summary:"Crop, climate, soil and land-surface records are aligned to the same Wheatbelt timeline.",records:[
    {name:"Official Wheatbelt boundary",status:"CONNECTED",detail:"The governed DPIRD regional geometry is available for regional observation."},
    {name:"Landsat surface history",status:"CONNECTED",detail:"Seasonally matched multi-scene imagery and QA-screened pixel measurements are available."},
    {name:"Rainfall, heat, cold and frost-temperature",status:"CONNECTED",detail:"Annual gridded records are available in expandable five-year groups."},
    {name:"Fire, flood and soil records",status:"REQUIRED",detail:"Authoritative dated spatial sources remain to be connected."},
  ]},
  "FOGO-derived organics":{domain:"URBAN ORGANICS + MATERIAL FLOW",summary:"Collection, facility, composition and processing facts are required before a physical stream can be measured.",records:[
    {name:"Municipal FOGO evidence",status:"DOCUMENTED",detail:"The supporting source documents source-separated food and garden organics systems.",source:"Waste Authority WA"},
    {name:"Named Perth facility project",status:"DOCUMENTED",detail:"A WA Government announcement names Veolia's Landsdale facility and states a planned FOGO receiving and processing capacity of up to 50,000 tonnes per year. This is capacity, not measured throughput.",source:"WA Government · 29 Apr 2025",sourceUrl:fogoAnnouncement},
    {name:"Regulated premises boundary",status:"CONNECTED",detail:"The machine-readable Landgate parcel for 15 Attwell Street is connected for pixel measurement and cross-checked against DWER works approval W6947/2024/1 and its Lot 79 on Diagram 57260 premises description.",source:"Landgate LGATE-002 + DWER W6947/2024/1",sourceUrl:"https://services.slip.wa.gov.au/public/rest/services/SLIP_Public_Services/Places_and_Addresses_WFS/MapServer/2"},
    {name:"Actual annual tonnage",status:"REQUIRED",detail:"A dated facility record of tonnes actually received or processed has not been located. Published capacity is not substituted for throughput."},
    {name:"Composition and contamination",status:"REQUIRED",detail:"Dated audits, sampling method and measured fractions are required."},
    {name:"Processing, water and energy records",status:"REQUIRED",detail:"Facility-specific operational records are not connected."},
  ]},
  "Managed biosolids":{domain:"WATER + RESIDUAL SAFETY",summary:"Treatment-plant, batch, analytical and destination records must remain separately traceable.",records:[
    {name:"WA management guidance",status:"DOCUMENTED",detail:"The supporting source defines the regulated management context.",source:"DWER WA"},
    {name:"Treatment-plant boundaries and volumes",status:"REQUIRED",detail:"Plant-level locations, production dates and quantities are not connected."},
    {name:"Batch analytical results",status:"REQUIRED",detail:"Nutrients, pathogens, PFAS, metals and sampling provenance are required."},
    {name:"Application and destination records",status:"REQUIRED",detail:"Dated destination boundaries and governed approvals are required."},
  ]},
  "Mine tailings":{domain:"MINERAL RESIDUAL + WATER",summary:"A mine-specific boundary must be established before mineral, water or rehabilitation records can be aligned.",records:[
    {name:"Aggregate research context",status:"DOCUMENTED",detail:"The supporting source documents mineral-carbonation research context.",source:"MRIWA"},
    {name:"Site and tailings boundaries",status:"REQUIRED",detail:"Aggregate evidence has not been attributed to a governed physical site."},
    {name:"Mineralogy and geochemistry",status:"REQUIRED",detail:"Dated sampling, analytes, methods and laboratory provenance are required."},
    {name:"Water, seepage and rehabilitation",status:"REQUIRED",detail:"Monitoring points, rainfall, drainage and rehabilitation observations are not connected."},
  ]},
  "Kimberley aquaculture zone":{domain:"AQUACULTURE + MARINE WATER",summary:"Zone, water, ecosystem and production records must be aligned without converting an opportunity into a stock claim.",records:[
    {name:"Aquaculture-zone evidence",status:"DOCUMENTED",detail:"The supporting source identifies the Cone Bay development zone.",source:"DPIRD WA"},
    {name:"Authoritative zone geometry",status:"REQUIRED",detail:"The governed polygon must be connected before spatial measurement."},
    {name:"Water temperature, salinity and oxygen",status:"REQUIRED",detail:"Dated monitoring records and station provenance are required."},
    {name:"Tides, currents, turbidity and marine events",status:"REQUIRED",detail:"Authoritative time-series records are not connected."},
    {name:"Species, production and biosecurity",status:"REQUIRED",detail:"No physical biological output is currently claimed."},
  ]},
  "Mid West aquaculture zone":{domain:"AQUACULTURE + MARINE WATER",summary:"Zone, water, ecosystem and production records must be aligned without converting an opportunity into a stock claim.",records:[
    {name:"Aquaculture-zone evidence",status:"DOCUMENTED",detail:"The supporting source identifies the Geraldton–Abrolhos development context.",source:"DPIRD WA"},
    {name:"Authoritative zone geometry",status:"REQUIRED",detail:"The governed polygon must be connected before spatial measurement."},
    {name:"Water temperature, salinity and oxygen",status:"REQUIRED",detail:"Dated monitoring records and station provenance are required."},
    {name:"Waves, currents, turbidity and marine events",status:"REQUIRED",detail:"Authoritative time-series records are not connected."},
    {name:"Species, production and biosecurity",status:"REQUIRED",detail:"No physical biological output is currently claimed."},
  ]},
  "Albany shellfish locations":{domain:"SHELLFISH + WATER QUALITY",summary:"Each shellfish location requires its own boundary, water-quality history and production record.",records:[
    {name:"Four-location zone evidence",status:"DOCUMENTED",detail:"The supporting source documents an approximately 800 ha zone.",source:"DPIRD WA"},
    {name:"Separate location geometries",status:"REQUIRED",detail:"Each governed polygon must remain individually traceable."},
    {name:"Temperature, salinity, oxygen and harmful algae",status:"REQUIRED",detail:"Dated station and event records are not connected."},
    {name:"Harvest closures and production",status:"REQUIRED",detail:"Authoritative dated closure, species and output records are required."},
  ]},
  "Seaweed aquaculture pathway":{domain:"MARINE BIOMASS + ECOSYSTEM",summary:"A policy pathway cannot receive site measurements until a physical cultivation location and species are established.",records:[
    {name:"Sector pathway",status:"DOCUMENTED",detail:"The supporting source documents a developable sector pathway.",source:"DPIRD WA"},
    {name:"Physical site and governed boundary",status:"REQUIRED",detail:"No candidate-local stock or defensible scan polygon is established."},
    {name:"Species and biomass",status:"REQUIRED",detail:"Species, standing biomass and production dates are unresolved."},
    {name:"Water and ecosystem records",status:"REQUIRED",detail:"Temperature, nutrients, currents, water quality and ecological observations require a selected site."},
  ]},
  "Acidic saline groundwater":{domain:"GROUNDWATER + LAND",summary:"Regional hazard mapping supplies context; bore-level chemistry and hydrology are required for candidate facts.",records:[
    {name:"Regional hazard assessment",status:"DOCUMENTED",detail:"Mapped acidic and saline groundwater context is documented by the supporting source.",source:"DWER WA"},
    {name:"Governed hazard geometry",status:"REQUIRED",detail:"The authoritative regional layer must be connected for spatial intersection."},
    {name:"Bore chemistry and water levels",status:"REQUIRED",detail:"Dated bore identifiers, analytes, methods and results are required."},
    {name:"Rainfall, recharge and surface-water context",status:"REQUIRED",detail:"Aligned climate and hydrological records must be connected."},
    {name:"Volume, access and treatment",status:"REQUIRED",detail:"Recoverable volume and treatment suitability are not claimed."},
  ]},
};

export default function CandidateEvidencePanel({candidate}:{candidate:string}){
  const profile=profiles[candidate]??{domain:"CANDIDATE CONTEXT",summary:"Candidate-specific factual records must be connected to the governed investigation.",records:[]};
  const records=[...profile.records,...common];
  const connected=records.filter(record=>record.status==="CONNECTED").length;
  const documented=records.filter(record=>record.status==="DOCUMENTED").length;
  const required=records.filter(record=>record.status==="REQUIRED").length;
  return <section className="candidateEvidencePack" aria-label={`${candidate} context records`}>
    <header><div><small>CANDIDATE EVIDENCE ROUTER · {profile.domain}</small><h4>Facts this investigation requires</h4><p>{profile.summary} AAB displays connected and documented records separately from information that is still required.</p></div><span>{connected} CONNECTED · {documented} DOCUMENTED · {required} REQUIRED</span></header>
    <div className="candidateEvidenceGrid">{records.map(record=><article className={record.status.toLowerCase()} key={`${record.name}-${record.status}`}><div><b>{record.name}</b><em>{record.status}</em></div><p>{record.detail}</p>{record.source&&(record.sourceUrl?<a href={record.sourceUrl} target="_blank" rel="noreferrer">SOURCE · {record.source} ↗</a>:<small>SOURCE · {record.source}</small>)}</article>)}</div>
    {candidate==="FOGO-derived organics"&&<details className="fogoFacilityLedger">
      <summary><span><small>AUTHORITATIVE FACILITY RECORDS</small><b>View the Landsdale regulatory and capacity records</b></span><em>1 BOUNDARY CONNECTED · 0 ACTUAL TONNAGE</em></summary>
      <div className="fogoFacilityLedgerBody">
        <p>These are source facts only. A published project capacity does not establish actual throughput, composition, availability or suitability.</p>
        {fogoFacilityRecords.map(record=><article key={record.facility}>
          <header><div><small>{record.recordType}</small><b>{record.facility}</b><span>{record.place}</span></div><time>{record.recordDate}</time></header>
          <p>{record.fact}</p><strong>{record.qualification}</strong>
          <div className="fogoRecordState">{record.states.map(state=><span key={state}>{state}</span>)}</div>
          <a href={record.sourceUrl} target="_blank" rel="noreferrer">Open authoritative source ↗</a>
        </article>)}
      </div>
    </details>}
    <footer><b>INTERPRETATION BOUNDARY</b><span>Connection confirms that a record can be displayed. It does not establish cause, safety, suitability, recoverability or material identity.</span></footer>
  </section>;
}
