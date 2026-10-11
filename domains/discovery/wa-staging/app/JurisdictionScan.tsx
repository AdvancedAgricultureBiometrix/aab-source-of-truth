"use client";

import { useEffect, useMemo, useState } from "react";
import ScientificMap from "./ScientificMap";
import CandidateEvidencePanel from "./CandidateEvidencePanel";
import DiscoveryFormulationRequest from "./DiscoveryFormulationRequest";

const phases = [
  { title: "National context", detail: "Establishing Australia-wide evidence context", progress: 12 },
  { title: "WA jurisdiction focus", detail: "Focusing on Western Australia and its evidence regions", progress: 28 },
  { title: "Resource discovery", detail: "Registering evidence-backed resource candidates", progress: 52 },
  { title: "Governance screening", detail: "Applying provenance, safety and regulatory gates", progress: 70 },
  { title: "Domain Brain routing", detail: "Routing candidates to the relevant specialist Brain", progress: 88 },
  { title: "Scientific Memory", detail: "Preparing review-ready knowledge and open questions", progress: 100 },
];

const regions = [
  { name: "Kimberley", x: 190, y: 78, delay: "0s", kind: "Water · Aquaculture" },
  { name: "Pilbara", x: 118, y: 174, delay: ".2s", kind: "Minerals · Energy" },
  { name: "Mid West", x: 90, y: 260, delay: ".4s", kind: "Biomass · Agriculture" },
  { name: "Goldfields", x: 208, y: 310, delay: ".6s", kind: "Industrial residuals" },
  { name: "Wheatbelt", x: 118, y: 372, delay: ".8s", kind: "Crops · Soil" },
  { name: "Perth", x: 101, y: 414, delay: "1s", kind: "Research · Industry" },
  { name: "South West", x: 132, y: 462, delay: "1.2s", kind: "Food · Forestry" },
];

const brains = ["Agriculture", "Water", "Environment", "Aquaculture", "Resource & Manufacturing"];

const findings = [
  { name: "Red Hill landfill material system", region: "Perth & Peel", type: "Material recovery and environmental system", evidence: "Computed", source: "EMRC", url: "https://www.emrc.org.au/about-us/what-we-do/our-facilities/red-hill-waste-management-facility.aspx", find: "A documented 365 ha facility receiving approximately 230,000 tonnes a year, with a completed Landsat pixel baseline for its investigation envelope.", quantity: "~230,000 t/year documented facility throughput", identity: "Mixed managed waste streams; individual recoverable fractions not yet characterised", pathways: ["Material fraction characterisation", "Resource recovery investigation", "Environmental change monitoring"], brains: ["Environment", "Resource Recovery", "Water"], gap: "Material composition, contamination, recoverable fractions, safety and site-specific access." },
  { name: "Grain crop residues", region: "Wheatbelt", type: "Agricultural biomass", evidence: "Moderate", source: "DPIRD WA", url: "https://www.dpird.wa.gov.au/siteassets/documents/agriculture/carbon-neutral-grain-pilot-report_0.pdf", find: "Recurring biomass associated with a documented 151,636 ha pilot footprint and 416,797 t of grain.", quantity: "Residue tonnage not yet measured", identity: "Uncharacterised crop-residue mixture", pathways: ["Fibre recovery", "Biochar investigation", "Biological conversion"], brains: ["Agriculture", "Resource Recovery", "Climate"], gap: "Recoverable mass, soil-carbon value, moisture, contaminants and seasonal availability." },
  { name: "FOGO-derived organics", region: "Perth & Peel", type: "Urban organics", evidence: "Moderate", source: "Waste Authority WA", url: "https://www.wasteauthority.wa.gov.au/publications/view/fogo-resources", find: "Recurring source-separated food and garden organics stream with a governed Landsdale premises boundary available for candidate-local observation.", quantity: "30,000 t/year approved receival; actual annual throughput unresolved", identity: "Variable organic mixture", pathways: ["Compost quality", "Anaerobic digestion", "Biological conversion"], brains: ["Resource Recovery", "Environment", "Manufacturing"], gap: "Actual throughput, composition, contamination, stability and dependable annual tonnage." },
  { name: "Managed biosolids", region: "Statewide", type: "Wastewater residual", evidence: "Moderate", source: "DWER WA", url: "https://www.wa.gov.au/government/publications/western-australian-guidelines-biosolids-management", find: "Recurring stabilised wastewater-solid stream with controlled land-application pathways.", quantity: "Plant-level quantity unresolved", identity: "Safety characterisation required", pathways: ["Nutrient recovery", "Soil amendment research", "Mine rehabilitation"], brains: ["Water", "Environment", "Soil"], gap: "Plant volume, pathogens, PFAS, metals, nutrients and applicable approvals." },
  { name: "Mine tailings", region: "Pilbara & Goldfields", type: "Mineral residual", evidence: "Moderate", source: "MRIWA", url: "https://www.mriwa.wa.gov.au/research-projects/project-portfolio/carbon-negative-mines-mineral-carbonation-of-mine-waste/", find: "Large recurring mineral-residual stream from WA gold and nickel operations.", quantity: "80–100 Mt/year aggregate context; sites unresolved", identity: "Mineralogy uncharacterised", pathways: ["Mineral carbonation", "Metal recovery", "Construction materials"], brains: ["Resource Recovery", "Environment", "Climate"], gap: "Site coordinates, ownership, mineralogy, metal mobility and recoverable fraction." },
  { name: "Kimberley aquaculture zone", region: "Kimberley", type: "Aquaculture opportunity", evidence: "Strong", source: "DPIRD WA", url: "https://www.dpird.wa.gov.au/businesses/aquaculture/aquaculture-development-zones/", find: "A defined marine production opportunity at Cone Bay—not yet a harvested material stock.", quantity: "Biological output not estimated", identity: "Candidate biological stream undefined", pathways: ["Finfish production study", "By-product mapping"], brains: ["Aquaculture", "Water", "Ecosystem"], gap: "Zone geometry, species, carrying capacity, production, biosecurity and environmental limits." },
  { name: "Mid West aquaculture zone", region: "Mid West", type: "Aquaculture opportunity", evidence: "Strong", source: "DPIRD WA", url: "https://www.dpird.wa.gov.au/businesses/aquaculture/aquaculture-development-zones/", find: "A defined marine production opportunity between Geraldton and the southern Abrolhos Islands.", quantity: "Biological output not estimated", identity: "Candidate biological stream undefined", pathways: ["Marine production study", "By-product mapping"], brains: ["Aquaculture", "Water", "Ecosystem"], gap: "Zone geometry, species suitability, capacity, logistics, biosecurity and cumulative impacts." },
  { name: "Albany shellfish locations", region: "Great Southern", type: "Shellfish aquaculture", evidence: "Strong", source: "DPIRD WA", url: "https://www.dpird.wa.gov.au/businesses/aquaculture/aquaculture-development-zones/", find: "An approximately 800 ha aquaculture zone across four shellfish locations.", quantity: "Footprint known; production output unresolved", identity: "Future biological stream not characterised", pathways: ["Shellfish production", "Shell mineral stream", "By-product mapping"], brains: ["Aquaculture", "Food Systems", "Water"], gap: "Production, species, water-quality windows, shell volume and commercial readiness." },
  { name: "Seaweed aquaculture pathway", region: "Coastal WA", type: "Marine biomass", evidence: "Moderate", source: "DPIRD WA", url: "https://library.dpird.wa.gov.au/fr_fop/82/", find: "A developable sector pathway; no site-specific biomass stock has yet been detected.", quantity: "No physical stock quantified", identity: "Species and biomass undefined", pathways: ["Food ingredient research", "Biomaterials", "Nutrient recovery"], brains: ["Aquaculture", "Food Systems", "Climate"], gap: "Species, locations, biomass, ecological limits, composition and viable pathways." },
  { name: "Acidic saline groundwater", region: "Wheatbelt & South Coast", type: "Water constraint / research lead", evidence: "Strong", source: "DWER WA", url: "https://www.wa.gov.au/government/publications/assessment-of-acidic-saline-groundwater-hazard-the-western-australian-wheatbelt-yarra-yarra-blackwood-and-south-coast", find: "Mapped acidic and saline groundwater systems—a measurable hazard and research candidate, not a beneficial-resource claim.", quantity: "Recoverable volume unresolved", identity: "Bore-level chemistry required", pathways: ["Mineral recovery research", "Treatment pathways", "Salt-tolerant systems"], brains: ["Water", "Environment", "Agriculture"], gap: "Chemistry, volume, recharge, treatment demand, ecological impact and legal access." },
];

const potentialProfiles: Record<string, { value: string; confidence: string; condition: string }> = {
  "Red Hill landfill material system": { value: "Material recovery research and longitudinal environmental observation", confidence: "Measured spatial baseline · unvalidated", condition: "Characterise individual fractions and clear contamination, safety, ownership and regulatory gates." },
  "Grain crop residues": { value: "Fibre, carbon products or controlled biological conversion", confidence: "Early · moderate", condition: "Separate wheat straw/stubble/chaff, barley straw/stubble/chaff, canola stalk/pod/chaff, lupin stalk/pod and oat straw/chaff; then measure recoverable mass and composition." },
  "FOGO-derived organics": { value: "Stable compost inputs, biogas or recovered biological feedstocks", confidence: "Early · moderate", condition: "Verify facility tonnage, contamination, stability and end-market quality." },
  "Managed biosolids": { value: "Nutrient recovery or controlled rehabilitation material", confidence: "Early · low", condition: "Clear pathogens, PFAS, metals, site suitability and regulatory requirements." },
  "Mine tailings": { value: "Mineral carbonation, metal recovery or engineered material", confidence: "Early · moderate", condition: "Attribute material to sites and prove mineralogy, mobility, safety and processing yield." },
  "Kimberley aquaculture zone": { value: "Governed marine production and future biological by-product streams", confidence: "Opportunity · moderate", condition: "Establish species, carrying capacity, production evidence and ecological limits." },
  "Mid West aquaculture zone": { value: "Governed marine production and future biological by-product streams", confidence: "Opportunity · moderate", condition: "Establish species, logistics, carrying capacity and cumulative-impact evidence." },
  "Albany shellfish locations": { value: "Shellfish production plus possible shell-mineral and biological streams", confidence: "Opportunity · moderate", condition: "Measure production, shell volumes, composition and water-quality windows." },
  "Seaweed aquaculture pathway": { value: "Food ingredients, biomaterials, nutrient recovery or carbon research", confidence: "Hypothesis · low", condition: "Detect a physical stock or viable cultivation site, then identify species and composition." },
  "Acidic saline groundwater": { value: "Treatment research, selective mineral recovery or salt-tolerant systems", confidence: "Hazard-led · low", condition: "Prove bore-level chemistry, sustainable volume, treatment demand and ecological safety." },
};

const candidateSpatialProfiles: Record<string, { status: "EXACT" | "REGIONAL" | "UNRESOLVED"; label: string; action: string; note: string; known?: string; available?: string; boundaryReason?: string; nextInput?: string }> = {
  "Red Hill landfill material system": { status: "EXACT", label: "Exact investigation envelope", action: "Run candidate investigation", note: "Registered envelope · candidate-local Landsat computation available" },
  "Grain crop residues": { status: "REGIONAL", label: "Official regional scan", action: "Open Wheatbelt investigation", note: "Candidate is distributed across the Wheatbelt; no single candidate boundary exists." },
  "FOGO-derived organics": { status: "EXACT", label: "Landsdale premises boundary connected", action: "Run Landsdale observation", note: "The machine-readable Landgate parcel for 15 Attwell Street is connected and cross-checked against DWER works approval W6947/2024/1 and its Lot 79 on Diagram 57260 premises description." },
  "Managed biosolids": { status: "REGIONAL", label: "Statewide evidence scan", action: "Open statewide investigation", note: "Plant-level locations and quantities require authoritative records." },
  "Mine tailings": { status: "UNRESOLVED", label: "Boundary evidence required", action: "Review missing boundary evidence", note: "Aggregate evidence must be attributed to specific governed sites before scanning." },
  "Kimberley aquaculture zone": { status: "REGIONAL", label: "Defined regional boundary", action: "Open Kimberley investigation", note: "Authoritative zone geometry must be attached before candidate-level computation." },
  "Mid West aquaculture zone": { status: "REGIONAL", label: "Defined regional boundary", action: "Open Mid West investigation", note: "Authoritative zone geometry must be attached before candidate-level computation." },
  "Albany shellfish locations": { status: "REGIONAL", label: "Defined regional boundary", action: "Open Great Southern investigation", note: "Four authoritative location geometries must remain separately traceable." },
  "Seaweed aquaculture pathway": { status: "UNRESOLVED", label: "Location unresolved", action: "Review spatial knowledge gap", note: "A policy pathway is not a physical stock or defensible scan boundary." },
  "Acidic saline groundwater": { status: "REGIONAL", label: "Official regional boundary", action: "Open Wheatbelt & South Coast", note: "Regional hazard reconnaissance only; bore-level chemistry is still required." },
};

const genomeProfiles: Record<string, { known: string[]; inferred: string[]; unknown: string[] }> = {
  "Red Hill landfill material system": { known: ["365 ha facility", "~230,000 t/year", "Landsat pixel baseline"], inferred: ["Mixed material fractions", "Environmental change signals"], unknown: ["Recoverable fractions", "Contaminants", "Material chemistry"] },
  "Grain crop residues": { known: ["Wheat", "Barley", "Canola", "Lupins", "Oats"], inferred: ["Straw", "Stubble", "Chaff", "Stalks", "Pods"], unknown: ["Recoverable mass", "Fibre chemistry", "Contaminants"] },
  "FOGO-derived organics": { known: ["Food organics", "Garden organics"], inferred: ["Biogenic carbon", "Plant nutrients"], unknown: ["Composition", "Contamination", "Stability"] },
  "Managed biosolids": { known: ["Stabilised solids", "Organic matter"], inferred: ["Nitrogen", "Phosphorus"], unknown: ["PFAS", "Metals", "Pathogens"] },
  "Mine tailings": { known: ["Gold tailings", "Nickel tailings"], inferred: ["Reactive minerals", "Residual metals"], unknown: ["Site mineralogy", "Metal mobility", "Carbonation yield"] },
  "Kimberley aquaculture zone": { known: ["Marine zone", "Cone Bay"], inferred: ["Finfish biomass", "Processing residuals"], unknown: ["Species", "Output", "Carrying capacity"] },
  "Mid West aquaculture zone": { known: ["Marine zone", "Geraldton–Abrolhos"], inferred: ["Marine biomass", "Processing residuals"], unknown: ["Species", "Output", "Cumulative impact"] },
  "Albany shellfish locations": { known: ["Four locations", "~800 ha footprint"], inferred: ["Shell biomass", "Organic residuals"], unknown: ["Species output", "Shell volume", "Composition"] },
  "Seaweed aquaculture pathway": { known: ["Policy pathway", "Marine and land-based settings"], inferred: ["Marine biomass", "Bioactive compounds"], unknown: ["Species", "Physical stock", "Composition"] },
  "Acidic saline groundwater": { known: ["Acidity", "Salinity", "Mapped catchments"], inferred: ["Dissolved salts", "Mineral fractions"], unknown: ["Bore chemistry", "Volume", "Treatment demand"] },
};

const opportunityClusters = [
  { id: "WA-CLUSTER-01", region: "Wheatbelt", title: "Dryland circular materials", links: ["Grain residues", "Saline groundwater", "Regional transport"], potential: "Test whether locally separated biomass fractions and water-treatment research can support new controlled material pathways.", confidence: "EARLY SIGNAL" },
  { id: "WA-CLUSTER-02", region: "Perth & Peel", title: "Urban biological recovery", links: ["FOGO", "Biosolids", "Processing infrastructure"], potential: "Investigate complementary nutrient, carbon and energy recovery pathways across separately governed waste streams.", confidence: "EVIDENCE ASSEMBLY" },
  { id: "WA-CLUSTER-03", region: "Goldfields & Pilbara", title: "Mine residual transformation", links: ["Tailings", "Renewable energy context", "Mineral processing"], potential: "Characterise site-specific tailings for mineral carbonation, residual-metal recovery and engineered-material research.", confidence: "REGIONAL SIGNAL" },
  { id: "WA-CLUSTER-04", region: "Coastal WA", title: "Marine biological systems", links: ["Aquaculture zones", "Shellfish", "Seaweed pathway"], potential: "Map compatible species, biological outputs and processing residuals across established and emerging production settings.", confidence: "OPPORTUNITY MAP" },
];

const statewideQueue = [
  { name: "Red Hill landfill system", region: "Perth & Peel", brain: "Environment · Resource Recovery", stage: "PIXEL BASELINE ACTIVE", eligibility: "INVESTIGATION ONLY" },
  { name: "Grain crop residues", region: "Wheatbelt", brain: "Agriculture · Climate", stage: "EVIDENCE REGISTERED", eligibility: "SAMPLING REQUIRED" },
  { name: "FOGO-derived organics", region: "Perth & Peel", brain: "Resource Recovery · Environment", stage: "PIXEL BOUNDARY ACTIVE", eligibility: "CHARACTERISATION REQUIRED" },
  { name: "Managed biosolids", region: "Statewide", brain: "Water · Environment", stage: "EVIDENCE REGISTERED", eligibility: "SAFETY GATE" },
  { name: "Mine tailings", region: "Pilbara & Goldfields", brain: "Resource Recovery · Climate", stage: "EVIDENCE REGISTERED", eligibility: "MINERALOGY REQUIRED" },
  { name: "Kimberley aquaculture zone", region: "Kimberley", brain: "Aquaculture · Water", stage: "BOUNDARY QUEUED", eligibility: "PHYSICAL STOCK UNPROVEN" },
  { name: "Mid West aquaculture zone", region: "Mid West", brain: "Aquaculture · Water", stage: "BOUNDARY QUEUED", eligibility: "PHYSICAL STOCK UNPROVEN" },
  { name: "Albany shellfish locations", region: "Great Southern", brain: "Aquaculture · Food Systems", stage: "BOUNDARY QUEUED", eligibility: "OUTPUT UNMEASURED" },
  { name: "Seaweed aquaculture pathway", region: "Coastal WA", brain: "Aquaculture · Climate", stage: "EVIDENCE REGISTERED", eligibility: "SITE AND SPECIES REQUIRED" },
  { name: "Acidic saline groundwater", region: "Wheatbelt & South Coast", brain: "Water · Agriculture", stage: "EVIDENCE REGISTERED", eligibility: "CHEMISTRY REQUIRED" },
];

type LiveDiscoveryItem = {
  resource_code: string;
  resource_name: string;
  evidence_status: string;
  observation_status: string;
  knowledge_gap_status: string;
  scientific_status: string;
  run_status: string;
  routed_brains: string[];
  blocking_brains: string[];
  formulation_eligible: boolean;
};

type LiveDiscoveryMemory = {
  status: string;
  workspace: string;
  queue: LiveDiscoveryItem[];
  brain_routes: number;
  stored_spatial_metrics: number;
  formulation_eligible_count: number;
  scientist_authority_preserved: boolean;
};

type SavedScanArea = {
  databaseId: string;
  id: string;
  name: string;
  mode: "state" | "region" | "custom";
  geometry: [number, number][];
  geometryGeojson: { type: "Polygon"; coordinates: number[][][] };
  owner: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  runs: SavedScanRun[];
};

type SavedScanRun = {
  id: string;
  run_number: number;
  status: "QUEUED" | "PROCESSING" | "COMPUTED_UNVALIDATED" | "FAILED" | "REVIEWED" | "REJECTED";
  source_name: string | null;
  scene_id: string | null;
  acquired_at: string | null;
  observation: { clear_pixels_used?: number; metrics?: Record<string, number | null>; tile_summary?: { total: number; completed: number; failed: number }; tiles?: SpatialTile[]; scientist_review?: ScientistReview };
  change_summary: { classification?: string; metrics?: Record<string, number | null> };
  evidence_signals: string[];
  knowledge_gaps: string[];
  candidate_links: string[];
  formulation_eligible: false;
  method_version: string | null;
  error_message: string | null;
  requested_at: string;
  completed_at: string | null;
};

type SpatialTile = { tile_id: string; bbox: number[]; geometry_geojson?: {type:"Polygon";coordinates:number[][][]}; status: string; error?: string; preview_url?: string; observation?: { scene_id?: string; acquired_at?: string | null; clear_pixels_used?: number; metrics?: Record<string, number | null> }; baseline_observation?: { scene_id?: string; acquired_at?: string | null; clear_pixels_used?: number; metrics?: Record<string, number | null> }; change?: { classification?: string; metrics?: Record<string, number | null>; days_between?: number | null } };
type ScientistReview = { selected_tile_id: string; review_status: string; scientist_notes: string; hypotheses: string[]; verification_plan: string[]; confidence_percent: number; reviewed_by: string; reviewed_at: string; formulation_eligible: false };

const metricHelp: Record<string,string> = {
  NDVI: "Normalised Difference Vegetation Index — indicates the relative presence and vigour of green vegetation.",
  NDMI: "Normalised Difference Moisture Index — indicates moisture associated with vegetation and the surrounding surface.",
  NDWI: "Normalised Difference Water Index — helps screen for surface water or wetness signals.",
  "Bare soil": "A spectral screening index for exposed ground or reduced vegetation; it does not identify a material.",
  "Spectral change": "A measurable change in reflected light between observation dates. It shows that something changed, not why.",
  "Evidence confidence": "AAB's current evidence-strength estimate based on pixel availability, repeated observations and corroboration. It is not scientific certainty.",
  "Formulation eligibility": "Whether governance permits a material to be selected in a formulation. Spatial signals remain locked until verified and approved.",
  "Clear pixels": "Satellite pixels that passed the current quality screening and were used in the calculation.",
  "Computed unvalidated": "AAB calculated the result from source pixels, but a scientist has not yet verified its meaning.",
  "Knowledge gaps": "Important facts that remain unknown and must be resolved before a scientific or material claim.",
  "Baseline": "The earlier observation used as the comparison point for detecting change.",
  "Evidence signals": "Measured patterns that justify further investigation; they are not material identifications or conclusions.",
};
const HelpTerm = ({label,definition}:{label:string;definition?:string}) => <span className="helpTerm" tabIndex={0} data-help={definition ?? metricHelp[label]} aria-label={`${label}: ${definition ?? metricHelp[label]}`}>{label}<i>?</i></span>;
type ImageryMode = "natural" | "vegetation" | "moisture" | "change";
const imageryModeProfiles: Record<ImageryMode,{label:string;assets:string[];formula:string;help:string}> = {
  natural:{label:"Natural colour",assets:["red","green","blue"],formula:"gamma RGB 1.55, saturation 1.35, sigmoidal RGB 7 0.38","help":"Brightened red, green and blue bands for familiar visual interpretation."},
  vegetation:{label:"Vegetation",assets:["nir08","red","green"],formula:"gamma RGB 1.7, saturation 1.7, sigmoidal RGB 8 0.42","help":"False-colour view that makes vegetation patterns easier to distinguish."},
  moisture:{label:"Moisture",assets:["swir16","nir08","green"],formula:"gamma RGB 1.7, saturation 1.6, sigmoidal RGB 8 0.42","help":"Short-wave infrared view that helps distinguish moisture and surface-condition patterns."},
  change:{label:"Change context",assets:["swir16","nir08","red"],formula:"gamma RGB 1.65, saturation 1.7, sigmoidal RGB 9 0.42","help":"A disturbance-sensitive comparison view. The measured temporal change remains the numeric evidence below."},
};
const tileClipPath=(tile:SpatialTile)=>{const points=tile.geometry_geojson?.coordinates?.[0];if(!points?.length)return undefined;const [w,s,e,n]=tile.bbox;return `polygon(${points.map(([x,y])=>`${((x-w)/(e-w))*100}% ${((n-y)/(n-s))*100}%`).join(",")})`};
const tileMagnitude = (tile: SpatialTile) => Math.max(0,...Object.values(tile.change?.metrics ?? {}).filter((value): value is number => typeof value === "number").map(Math.abs));
const tileHypotheses = (tile: SpatialTile) => {
  const changes=tile.change?.metrics ?? {}, hypotheses:string[]=[];
  if (Math.abs(changes.mean_ndvi ?? 0) > .03) hypotheses.push("Vegetation cover, condition, harvest or regrowth may have changed.");
  if (Math.abs(changes.mean_ndmi ?? 0) > .03) hypotheses.push("Surface or vegetation moisture may differ between observation dates.");
  if (Math.abs(changes.mean_ndwi ?? 0) > .03) hypotheses.push("Water, inundation, drainage or wetness conditions may have changed.");
  if (Math.abs(changes.mean_bare_soil_index ?? 0) > .03) hypotheses.push("Ground exposure, disturbance, excavation or reduced cover may have changed.");
  return hypotheses.length ? hypotheses : ["The measured difference may reflect season, atmosphere, sensor conditions or subtle land-surface change."];
};
const evidenceConfidence = (tile: SpatialTile, runCount: number) => Math.min(85, 30 + Math.min(30, Math.round((tile.observation?.clear_pixels_used ?? 0) / 250)) + Math.min(15, runCount * 5) + (tile.baseline_observation ? 10 : 0));

const observationDate = (value: string | null) => value ? new Date(value).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "Date unavailable";
const signedMetric = (value: number | null | undefined) => value == null ? "—" : `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
const changeDirection = (value: number | null | undefined) => value == null ? "" : value > 0.01 ? "↑" : value < -0.01 ? "↓" : "→";

const waScanBoundary: [number, number][] = [[82,34],[174,39],[174,266],[156,266],[144,279],[119,286],[94,278],[76,262],[65,239],[52,226],[46,205],[50,184],[43,164],[48,143],[41,124],[48,105],[40,84],[31,65],[43,48],[39,31],[54,18],[68,12]];
const polygonPoints = (points: [number, number][]) => points.map(([x,y]) => `${x},${y}`).join(" ");
const mapGeometryToGeojson = (points: [number, number][]) => {
  const coordinates = points.map(([x,y]) => [112.9 + ((x - 31) / 143) * 16.1, -13.5 - ((y - 12) / 274) * 21.6]);
  if (coordinates.length) coordinates.push([...coordinates[0]]);
  return { type: "Polygon" as const, coordinates: [coordinates] };
};
const geoBboxToMapRect = ([west,south,east,north]: number[]) => ({
  x: 31 + ((west - 112.9) / 16.1) * 143,
  y: 12 + ((-13.5 - north) / 21.6) * 274,
  width: ((east - west) / 16.1) * 143,
  height: ((north - south) / 21.6) * 274,
});
const geoPolygonToMapPoints=(tile:SpatialTile)=>{const points=tile.geometry_geojson?.coordinates?.[0];if(!points?.length){const rect=geoBboxToMapRect(tile.bbox);return `${rect.x},${rect.y} ${rect.x+rect.width},${rect.y} ${rect.x+rect.width},${rect.y+rect.height} ${rect.x},${rect.y+rect.height}`};return points.map(([longitude,latitude])=>`${31+((longitude-112.9)/16.1)*143},${12+((-13.5-latitude)/21.6)*274}`).join(" ")};
const pointInsidePolygon = (point: [number, number], polygon: [number, number][]) => {
  const [x,y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi,yi] = polygon[i];
    const [xj,yj] = polygon[j];
    const intersects = ((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

export default function JurisdictionScan() {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [filter, setFilter] = useState("All findings");
  const [selectedFinding, setSelectedFinding] = useState<(typeof findings)[number] | null>(null);
  const [spatialRun, setSpatialRun] = useState<"idle" | "running" | "done" | "error">("idle");
  type SpatialObservation = { scene_id: string; acquired_at: string | null; cloud_cover_percent: number | null; pixels_sampled: number; clear_pixels_used: number; metrics: Record<string, number | null> };
  const [spatialResult, setSpatialResult] = useState<{ scenes_qualified: number; preview_url: string | null; evidence_status: string; method_version: string; observation: SpatialObservation; baseline_observation: SpatialObservation; change: { days_between: number | null; classification: string; metrics: Record<string, number | null>; review_note: string }; boundary: string; tiles?: SpatialTile[] } | null>(null);
  const [spatialError, setSpatialError] = useState("");
  const [regionalRun, setRegionalRun] = useState<"idle" | "boundary" | "running" | "done" | "error">("idle");
  const [regionalError, setRegionalError] = useState("");
  const [regionalResult, setRegionalResult] = useState<any>(null);
  const [regionalSelectedTileId, setRegionalSelectedTileId] = useState("T07");
  const [regionalProvenance, setRegionalProvenance] = useState<any>(null);
  const [regionalProgress, setRegionalProgress] = useState({ completed: 0, total: 0 });
  const [passportView, setPassportView] = useState<"overview" | "context" | "spatial" | "potential" | "gaps" | "governance">("overview");
  const [candidateAction, setCandidateAction] = useState<string | null>(null);
  const [statewideOpen, setStatewideOpen] = useState(false);
  const [liveMemory, setLiveMemory] = useState<LiveDiscoveryMemory | null>(null);
  const [memoryState, setMemoryState] = useState<"idle" | "loading" | "live" | "unavailable">("idle");
  const [scanMode, setScanMode] = useState<"state" | "region" | "custom">("state");
  const [mapZoom, setMapZoom] = useState(1);
  const [drawnBoundary, setDrawnBoundary] = useState<[number, number][]>([]);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [scanBoundaryMessage, setScanBoundaryMessage] = useState("Western Australia boundary selected");
  const [savedScanAreas, setSavedScanAreas] = useState<SavedScanArea[]>([]);
  const [selectedScanAreaId, setSelectedScanAreaId] = useState<string | null>(null);
  const [areaRecoveryKey, setAreaRecoveryKey] = useState("");
  const [areaMemoryState, setAreaMemoryState] = useState<"loading" | "live" | "error">("loading");
  const [runningAreaId, setRunningAreaId] = useState<string | null>(null);
  const [tileInvestigation, setTileInvestigation] = useState<{ areaId: string; runId: string; tileId: string } | null>(null);
  const [scientistNotes, setScientistNotes] = useState("");
  const [reviewSaveState, setReviewSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [imageryMode, setImageryMode] = useState<ImageryMode>("natural");
  type MosaicLayer = { image:string; mask:string; scene_id:string };
  type ImmediateMosaic = { scene_count:number; acquired_at:string|null; acquired_through?:string|null; coverage_percent?:number; clear_pixel_estimate?:number|null; image_layers?:Record<string,MosaicLayer[]> };
  const [immediateMosaic,setImmediateMosaic]=useState<{baseline:ImmediateMosaic|null;current:ImmediateMosaic|null;imagery_available:boolean;unavailable_reason?:string|null}|null>(null);
  const [immediateMosaicState,setImmediateMosaicState]=useState<"idle"|"loading"|"done"|"error">("idle");
  const complete = phase === phases.length - 1 && running;
  const active = phases[phase];

  useEffect(() => {
    if (!running || complete) return;
    const timer = window.setTimeout(() => setPhase((value) => Math.min(value + 1, phases.length - 1)), 1450);
    return () => window.clearTimeout(timer);
  }, [running, phase, complete]);

  useEffect(() => {
    if (!complete) return;
    let activeRequest = true;
    setMemoryState("loading");
    fetch("/api/discovery-memory", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Memory unavailable");
        if (payload.available === false || !Array.isArray(payload.queue)) {
          if (activeRequest) setMemoryState("unavailable");
          return;
        }
        if (activeRequest) {
          setLiveMemory(payload);
          setMemoryState("live");
        }
      })
      .catch(() => activeRequest && setMemoryState("unavailable"));
    return () => { activeRequest = false; };
  }, [complete]);

  useEffect(() => {
    const storageName = "aab_wa_area_recovery_key_v1";
    let key = window.localStorage.getItem(storageName) ?? "";
    if (!/^[a-f0-9]{64}$/i.test(key)) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      key = Array.from(bytes).map((value) => value.toString(16).padStart(2,"0")).join("");
      window.localStorage.setItem(storageName, key);
    }
    setAreaRecoveryKey(key);
  }, []);

  useEffect(()=>{
    if(!tileInvestigation)return;
    const area=savedScanAreas.find(item=>item.id===tileInvestigation.areaId),run=area?.runs.find(item=>item.id===tileInvestigation.runId),tile=run?.observation.tiles?.find(item=>item.tile_id===tileInvestigation.tileId);
    if(!tile||tile.status==="FAILED")return;
    let active=true;
    queueMicrotask(()=>{if(active){setImmediateMosaic(null);setImmediateMosaicState("loading")}});
    fetch("/api/spatial-history",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"comparison",bbox:tile.bbox,baseline_date:tile.baseline_observation?.acquired_at,current_date:tile.observation?.acquired_at})})
      .then(async response=>{const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Mosaic comparison failed");if(active){setImmediateMosaic(payload);setImmediateMosaicState("done")}})
      .catch(()=>active&&setImmediateMosaicState("error"));
    return()=>{active=false};
  },[tileInvestigation,savedScanAreas]);

  useEffect(() => {
    if (!areaRecoveryKey) return;
    loadSavedAreas(areaRecoveryKey);
  }, [areaRecoveryKey]);

  useEffect(() => {
    const glossary = Object.entries(metricHelp);
    const applyHelp = () => document.querySelectorAll("small,b,strong,span").forEach((element) => {
      if ((element as HTMLElement).closest(".helpTerm")) return;
      const text=(element.textContent ?? "").trim().toLowerCase();
      const match=glossary.find(([term]) => text === term.toLowerCase() || text.startsWith(`${term.toLowerCase()} `));
      if (match) { (element as HTMLElement).title=match[1]; (element as HTMLElement).classList.add("globalHelp"); }
    });
    applyHelp();
    const observer=new MutationObserver(applyHelp);
    observer.observe(document.body,{childList:true,subtree:true});
    return () => observer.disconnect();
  }, []);

  async function areaMemoryRequest(method: "GET" | "POST", body?: Record<string, unknown>, key = areaRecoveryKey) {
    const response = await fetch("/api/area-investigations", {
      method,
      cache: "no-store",
      headers: { "content-type": "application/json", "x-aab-area-key": key },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Area investigation memory failed");
    return payload;
  }

  function normaliseSavedArea(area: any): SavedScanArea {
    return {
      databaseId: area.id,
      id: area.code,
      name: area.name,
      mode: String(area.mode).toLowerCase() as SavedScanArea["mode"],
      geometry: area.map_geometry,
      geometryGeojson: area.geometry_geojson,
      owner: area.owner,
      status: area.status,
      runs: area.runs ?? [],
    };
  }

  async function loadSavedAreas(key = areaRecoveryKey) {
    setAreaMemoryState("loading");
    try {
      const payload = await areaMemoryRequest("GET", undefined, key);
      setSavedScanAreas((payload.areas ?? []).map(normaliseSavedArea));
      setAreaMemoryState("live");
    } catch {
      setAreaMemoryState("error");
    }
  }

  const status = useMemo(() => running ? active.detail : "Ready for a governed visual preview", [running, active]);
  const regionalEvidenceTiles = useMemo(() => (regionalResult?.tiles ?? []).map((outcome: any) => {
    if (outcome.ok) {
      const measured = outcome.result?.tiles?.[0];
      return measured ? { ...measured, tile_id: outcome.tile.tile_id } : { ...outcome.tile, status: "COMPUTED_UNVALIDATED", change: outcome.result?.change };
    }
    return { ...outcome.tile, status: "FAILED", change: { classification: "RETRY REQUIRED", metrics: {} } };
  }), [regionalResult]);
  const candidateEvidenceTiles = useMemo(() => (spatialResult?.tiles ?? []).filter(tile=>tile.status==="COMPUTED_UNVALIDATED").map((tile,index)=>({...tile,tile_id:index===0?(selectedFinding?.name==="FOGO-derived organics"?"LANDSDALE-LOT79":"RED-HILL-SITE"):tile.tile_id})), [spatialResult,selectedFinding]);

  function start() {
    setInviteOpen(false);
    setSelectedFinding(null);
    setLiveMemory(null);
    setMemoryState("idle");
    setPhase(0);
    setRunning(true);
  }

  async function runSpatialAnalysis(candidate="Red Hill landfill material system") {
    setSpatialRun("running");
    setSpatialError("");
    try {
      let request:RequestInit={method:"POST"};
      if(candidate==="FOGO-derived organics"){
        const boundaryResponse=await fetch("/api/candidate-boundary/landsdale",{cache:"no-store"});
        const boundary=await boundaryResponse.json();
        if(!boundaryResponse.ok||!boundary.feature?.geometry)throw new Error(boundary.error||"Landsdale boundary unavailable");
        request={method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({region_name:"Landsdale Resource Recovery Park · Lot 79",geometry_geojson:boundary.feature.geometry})};
      }
      const response = await fetch("/api/spatial-acquire", request);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Spatial acquisition failed");
      setSpatialResult(payload);
      setSpatialRun("done");
    } catch (error) {
      setSpatialError(error instanceof Error ? error.message : "Spatial acquisition failed");
      setSpatialRun("error");
    }
  }

  async function runWheatbeltScan() {
    let stage = "loading official boundary";
    setRegionalRun("boundary");
    setRegionalError("");
    setRegionalResult(null);
    setRegionalProgress({ completed: 0, total: 0 });
    try {
      const boundaryResponse = await fetch("/api/region-boundary/wheatbelt", { cache: "no-store" });
      const boundary = await boundaryResponse.json();
      if (!boundaryResponse.ok) throw new Error(boundary.error || "Official Wheatbelt boundary unavailable");
      setRegionalProvenance(boundary.provenance);
      stage = "building regional tile plan";
      const planResponse = await fetch("/api/spatial-acquire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "plan", region_code: boundary.region_code, region_name: boundary.region_name }),
      });
      const plan = await planResponse.json();
      if (!planResponse.ok) throw new Error(plan.error || "Wheatbelt processing plan failed");
      setRegionalRun("running");
      setRegionalProgress({ completed: 0, total: plan.tiles.length });
      const outcomes: any[] = [];
      for (const tile of plan.tiles) {
        stage = `processing ${tile.tile_id}`;
        const outcome = await (async () => {
          try {
            const response = await fetch("/api/spatial-acquire", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ region_name: `${boundary.region_name} · ${tile.tile_id}`, geometry_geojson: tile.geometry_geojson }),
            });
            const result = await response.json();
            return response.ok ? { ok: true, tile, result } : { ok: false, tile, error: result.error || "Tile failed" };
          } catch (error) {
            return { ok: false, tile, error: error instanceof Error ? error.message : "Tile request failed" };
          }
        })();
        outcomes.push(outcome);
        setRegionalProgress({ completed: outcomes.length, total: plan.tiles.length });
      }
      const complete = outcomes.filter(item => item.ok);
      stage = "combining completed tile evidence";
      if (!complete.length) throw new Error(outcomes[0]?.error || "No Wheatbelt tile produced a valid observation");
      const metricKeys = ["mean_ndvi","mean_ndmi","mean_ndwi","mean_bare_soil_index"];
      const aggregate = (path: "observation" | "baseline_observation") => Object.fromEntries(metricKeys.map(key => {
        const rows = complete.map(item => item.result[path]).filter(row => typeof row?.metrics?.[key] === "number" && row.clear_pixels_used > 0);
        const weight = rows.reduce((sum, row) => sum + row.clear_pixels_used, 0);
        return [key, weight ? rows.reduce((sum, row) => sum + row.metrics[key] * row.clear_pixels_used, 0) / weight : null];
      }));
      const currentMetrics = aggregate("observation"), baselineMetrics = aggregate("baseline_observation");
      const changeMetrics = Object.fromEntries(metricKeys.map(key => [key, currentMetrics[key] == null || baselineMetrics[key] == null ? null : currentMetrics[key] - baselineMetrics[key]]));
      const maxChange = Math.max(...Object.values(changeMetrics).filter((value): value is number => typeof value === "number").map(Math.abs), 0);
      const scan = {
        tile_summary: { total: plan.tiles.length, completed: complete.length, failed: outcomes.length - complete.length },
        observation: { metrics: currentMetrics, clear_pixels_used: complete.reduce((sum,item)=>sum+item.result.observation.clear_pixels_used,0) },
        baseline_observation: { metrics: baselineMetrics }, change: { metrics: changeMetrics, classification: maxChange < .03 ? "STABLE SPECTRAL SIGNAL" : maxChange > .1 ? "SIGNIFICANT SPECTRAL CHANGE" : "MODERATE SPECTRAL CHANGE" },
        scenes_qualified: complete.reduce((sum,item)=>sum+item.result.scenes_qualified,0), evidence_status: "COMPUTED_UNVALIDATED", tiles: outcomes,
      };
      setRegionalResult(scan);
      setRegionalSelectedTileId(plan.tiles.find((tile:any)=>tile.tile_id==="T07")?.tile_id ?? complete.at(-1)?.tile?.tile_id ?? plan.tiles.at(-1)?.tile_id ?? "");
      setRegionalRun("done");
    } catch (error) {
      setRegionalError(`${stage}: ${error instanceof Error ? error.message : "Wheatbelt scan failed"}`);
      setRegionalRun("error");
    }
  }

  const visibleFindings = filter === "All findings" ? findings : findings.filter((item) => item.region.includes(filter) || item.type.includes(filter));
  const liveRegion = (code: string) => code.includes("KIMBERLEY") ? "Kimberley" : code.includes("MIDWEST") ? "Mid West" : code.includes("ALBANY") ? "Great Southern" : code.includes("MINE") ? "Pilbara & Goldfields" : code.includes("GRAIN") || code.includes("SALINE") ? "Wheatbelt" : code.includes("SEAWEED") ? "Coastal WA" : "Perth & Peel";
  const displayQueue = liveMemory ? liveMemory.queue.map((item) => ({
    name: item.resource_name,
    region: liveRegion(item.resource_code),
    brain: item.routed_brains.map((brain) => brain.replaceAll("_", " ")).join(" · "),
    stage: `${item.run_status} · ${item.observation_status}`,
    eligibility: item.formulation_eligible ? "FORMULATION ELIGIBLE" : `${item.knowledge_gap_status} GAP · BLOCKED`,
  })) : statewideQueue;

  function chooseScanMode(mode: "state" | "region" | "custom") {
    setScanMode(mode);
    setDrawnBoundary(mode === "region" ? [[58,190],[83,184],[92,212],[69,230],[53,211]] : []);
    setScanBoundaryMessage(mode === "state" ? "Western Australia boundary selected" : mode === "region" ? "Perth & Peel official area selected" : "Click the map to draw at least three boundary points");
  }

  function mapPointerToCoordinate(svg: SVGSVGElement, clientX: number, clientY: number): [number, number] | null {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const mapped = point.matrixTransform(matrix.inverse());
    return [mapped.x, mapped.y];
  }

  function addCustomBoundaryPoint(event: React.PointerEvent<SVGSVGElement>) {
    if (scanMode !== "custom") return;
    const point = mapPointerToCoordinate(event.currentTarget, event.clientX, event.clientY);
    if (!point) return;
    if (!pointInsidePolygon(point, waScanBoundary)) {
      setScanBoundaryMessage("Outside the authorised WA workspace — point rejected");
      return;
    }
    setDrawnBoundary((current) => [...current, point]);
    setScanBoundaryMessage("Boundary remains inside the authorised WA workspace");
  }

  function startBoundaryDrag(event: React.PointerEvent<SVGCircleElement>, index: number) {
    if (scanMode !== "custom") return;
    event.stopPropagation();
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    setDraggingPoint(index);
    setScanBoundaryMessage(`Repositioning boundary point ${index + 1}`);
  }

  function moveBoundaryPoint(event: React.PointerEvent<SVGSVGElement>) {
    if (draggingPoint === null) return;
    const point = mapPointerToCoordinate(event.currentTarget, event.clientX, event.clientY);
    if (!point || !pointInsidePolygon(point, waScanBoundary)) {
      setScanBoundaryMessage("Country lock active — the point cannot move outside the authorised WA workspace");
      return;
    }
    setDrawnBoundary((current) => current.map((value,index) => index === draggingPoint ? point : value));
    setScanBoundaryMessage(`Boundary point ${draggingPoint + 1} repositioned`);
  }

  function finishBoundaryDrag(event: React.PointerEvent<SVGSVGElement>) {
    if (draggingPoint === null) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDraggingPoint(null);
    setScanBoundaryMessage("Boundary remains inside the authorised WA workspace");
  }

  const mosaicModeKey = imageryMode === "change" ? "disturbance" : imageryMode;
  const renderImmediateMosaic = (scene:ImmediateMosaic|null,label:string,tile:SpatialTile) => {
    const layers=scene?.image_layers?.[mosaicModeKey]??[];
    if(!layers.length)return <div className="imageryUnavailable"><b>Imagery unavailable — insufficient clear-pixel coverage</b><span>A defensible governed mosaic could not be formed for this observation window.</span></div>;
    return <div className="immediateMosaic">{layers.map((layer,index)=><img src={layer.image} key={layer.scene_id} style={{clipPath:tileClipPath(tile),maskImage:`url(${layer.mask})`,WebkitMaskImage:`url(${layer.mask})`}} alt={index===0?`${tile.tile_id} ${label} governed cloud-masked mosaic`:""} aria-hidden={index>0}/>) }<span>{tile.tile_id} · EXACT GOVERNED POLYGON · {scene?.scene_count??layers.length} SCENES</span></div>;
  };

  async function captureScanArea() {
    if (scanMode === "custom" && drawnBoundary.length < 3) {
      setScanBoundaryMessage("Add at least three valid points before saving this scan area");
      return;
    }
    const label = scanMode === "state" ? "Western Australia baseline" : scanMode === "region" ? "Perth & Peel investigation" : `Custom investigation ${savedScanAreas.length + 1}`;
    const geometry = scanMode === "state" ? waScanBoundary : [...drawnBoundary];
    setScanBoundaryMessage(`Saving ${label} to governed spatial memory…`);
    try {
      const payload = await areaMemoryRequest("POST", {
        action: "create",
        name: label,
        mode: scanMode.toUpperCase(),
        map_geometry: geometry,
        geometry_geojson: mapGeometryToGeojson(geometry),
        owner: "Head user",
      });
      const saved = normaliseSavedArea(payload.area);
      setSavedScanAreas((current) => [...current, saved]);
      setSelectedScanAreaId(saved.id);
      if (scanMode === "custom") setDrawnBoundary([]);
      setAreaMemoryState("live");
      setScanBoundaryMessage(`${label} saved — it will return when this workspace is reopened`);
    } catch (error) {
      setAreaMemoryState("error");
      setScanBoundaryMessage(error instanceof Error ? error.message : "Area could not be saved");
    }
  }

  async function runSavedScan(id: string) {
    const target = savedScanAreas.find((scan) => scan.id === id);
    if (!target || target.status === "ARCHIVED") return;
    setRunningAreaId(id);
    setSelectedScanAreaId(id);
    setScanBoundaryMessage("Checking area size, preparing evidence tiles and processing qualified imagery…");
    let runId = "";
    try {
      const started = await areaMemoryRequest("POST", { action: "start_run", area_id: target.databaseId });
      runId = started.run_id;
      const response = await fetch("/api/spatial-acquire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ geometry_geojson: started.geometry_geojson }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Spatial processing failed");
      const metrics = result.observation?.metrics ?? {};
      const signals = [
        metrics.mean_ndvi > .35 ? "Vegetation signal present" : null,
        metrics.mean_ndmi > .15 ? "Vegetation moisture signal present" : null,
        metrics.mean_ndwi > .05 ? "Surface water or wetness signal present" : null,
        metrics.mean_bare_soil_index > .1 ? "Bare-ground or mineral-surface signal present" : null,
      ].filter(Boolean);
      await areaMemoryRequest("POST", {
        action: "complete_run", area_id: target.databaseId, run_id: runId,
        source_name: result.source, scene_id: result.observation?.scene_id, acquired_at: result.observation?.acquired_at,
        observation: { ...result.observation, tile_summary: result.tile_summary, tiles: result.tiles }, change_summary: result.change,
        evidence_signals: signals.length ? signals : ["No strong spectral class signal crossed the current screening thresholds"],
        knowledge_gaps: ["Material identity requires ground sampling", "Quantity and recoverability are not established", "Safety, ownership and regulatory status require review"],
        candidate_links: [], method_version: result.method_version,
      });
      setScanBoundaryMessage(result.tiled ? `${result.tile_summary.completed} of ${result.tile_summary.total} tiles computed and recombined into one saved observation` : "Observation computed and saved — open the area card to see what AAB observed");
    } catch (error) {
      if (runId) await areaMemoryRequest("POST", { action: "complete_run", area_id: target.databaseId, run_id: runId, error_message: error instanceof Error ? error.message : "Spatial processing failed" }).catch(() => undefined);
      setScanBoundaryMessage(error instanceof Error ? error.message : "Spatial processing failed");
    } finally {
      await loadSavedAreas();
      setRunningAreaId(null);
    }
  }

  async function removeOrArchiveScan(id: string) {
    const target = savedScanAreas.find((scan) => scan.id === id);
    if (!target) return;
    try {
      await areaMemoryRequest("POST", { action: target.runs.length ? "archive" : "delete", area_id: target.databaseId });
      await loadSavedAreas();
      setSelectedScanAreaId(null);
      setScanBoundaryMessage(target.runs.length ? "Evidence-bearing investigation archived with its history retained" : "Draft investigation deleted");
    } catch (error) {
      setScanBoundaryMessage(error instanceof Error ? error.message : "Area could not be updated");
    }
  }

  async function saveScientificReview(scan: SavedScanArea, run: SavedScanRun, tile: SpatialTile, reviewStatus: "DRAFT_REVIEW" | "REVIEWED" | "REJECTED") {
    setReviewSaveState("saving");
    try {
      await areaMemoryRequest("POST", {
        action: "save_review", area_id: scan.databaseId, run_id: run.id, selected_tile_id: tile.tile_id,
        review_status: reviewStatus, scientist_notes: scientistNotes, hypotheses: tileHypotheses(tile),
        verification_plan: ["Compare the current and baseline imagery", "Check rainfall, season, fire and site-operation context", "Repeat the exact tile observation", "Conduct site inspection and collect representative samples", "Use laboratory characterisation before any material claim"],
        confidence_percent: evidenceConfidence(tile, scan.runs.length), reviewed_by: "Head user",
      });
      await loadSavedAreas();
      setReviewSaveState("saved");
    } catch {
      setReviewSaveState("error");
    }
  }

  const scanCentroid = (geometry: [number, number][]) => geometry.reduce(([sumX,sumY],[x,y]) => [sumX+x/geometry.length,sumY+y/geometry.length] as [number,number],[0,0] as [number,number]);

  return (
    <section className="discoveryExperience" aria-labelledby="discovery-title">
      <div className="experienceHead">
        <div>
          <p className="eyebrow">AAB Jurisdiction Discovery</p>
          <h2 id="discovery-title">See Western Australia become scientifically visible</h2>
          <p className="experienceIntro">A governed discovery run using authoritative public evidence. Candidates retain provenance and uncertainty, but remain unapproved until expert review.</p>
        </div>
        <button className="primaryAction" onClick={start}>{running ? "Restart visual scan" : "Preview guided scan"}</button>
      </div>

      <div className={`scanStage ${running ? "isRunning" : ""} phase${phase}`}>
        <div className="mapPanel">
          <div className="mapTitle"><span>DISCOVERY ANIMATION · NOT A COORDINATE MAP</span><strong>Western Australia</strong></div>
          <svg className="waMap" viewBox="0 0 360 520" role="img" aria-label="Illustrative map of Western Australia showing evidence discovery regions">
            <defs>
              <linearGradient id="wa-fill" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d8aa54" stopOpacity=".24"/><stop offset="1" stopColor="#55c995" stopOpacity=".05"/></linearGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <path className="waOutline" d="M112 20 L324 36 L324 476 L280 476 L263 495 L212 505 L159 497 L129 478 L113 446 L92 432 L78 398 L82 360 L67 333 L76 296 L62 270 L74 238 L62 206 L48 178 L69 146 L62 112 L74 82 L96 63 Z"/>
            <path className="regionalLine" d="M68 205 C140 222 210 214 322 218 M76 304 C154 290 225 312 322 300 M82 382 C160 368 235 390 322 377"/>
            {regions.map((region, index) => (
              <g className={`resourcePoint point${index}`} key={region.name} style={{ "--point-delay": region.delay } as React.CSSProperties}>
                <circle cx={region.x} cy={region.y} r="18" className="pulse"/><circle cx={region.x} cy={region.y} r="5" className="core"/>
                <text x={region.x + 13} y={region.y - 8}>{region.name}</text><text className="mapKind" x={region.x + 13} y={region.y + 9}>{region.kind}</text>
              </g>
            ))}
            <rect className="scanBeam" x="42" y="10" width="294" height="5" rx="3"/>
          </svg>
          <p className="mapDisclaimer">Animated jurisdiction overview only · all boundaries, tiles and coordinates use the geographic investigation map</p>
        </div>

        <div className="routingPanel">
          <div className="phaseReadout"><small>ACTIVE PROCESS</small><strong>{running ? active.title : "Awaiting preview"}</strong><span>{status}</span></div>
          <div className="progressTrack"><span style={{ width: `${running ? active.progress : 0}%` }} /></div>
          <div className="candidateStream">
            <div className="candidate"><span className="candidateIcon">01</span><div><strong>Candidate registered</strong><small>Source and provenance retained</small></div></div>
            <div className="gate"><span>Evidence</span><span>Safety</span><span>Regulatory</span><b>Human review gate</b></div>
            <div className="brainNetwork">
              {brains.map((brain) => <div className="brainNode" key={brain}><i/><span>{brain}</span><small>Domain Brain</small></div>)}
            </div>
            <div className="memoryNode"><span className="memoryOrb"/><div><strong>Governed Scientific Memory</strong><small>Reviewed evidence, uncertainty, contradictions and knowledge gaps</small></div></div>
          </div>
        </div>
      </div>

      <div className="phaseRail" aria-label="Discovery progress">
        {phases.map((item, index) => <div className={`${running && index <= phase ? "active" : ""}`} key={item.title}><span>{index + 1}</span><small>{item.title}</small></div>)}
      </div>

      {complete && (
        <>
          <div className="resultsPanel">
            <div className="resultsHead"><div><p className="eyebrow">Governed discovery result</p><h3>10 evidence-backed candidates found</h3><p>0 approved · 10 require scientist review · governed WA snapshot</p></div><div className="resultCounts"><span><b>10</b>Candidates</span><span><b>10</b>Evidence packets</span><span><b>0</b>Accepted</span></div></div>
            <details className="spatialWorkspace" id="spatial-investigation-workspace">
              <summary><span><b>Spatial Investigation Workspace</b><small>Define and revisit separate areas of interest</small></span><em>Open workspace →</em></summary>
            <section className="scanPlanner" aria-labelledby="scan-planner-title">
              <div className="scanPlannerHead"><div><p className="eyebrow">Country-locked multi-scan planner</p><h3 id="scan-planner-title">Define where AAB investigates</h3><p>The reusable planner loads the authorised jurisdiction profile. This WA workspace cannot create a scan outside Australia or beyond its assigned Western Australia boundary.</p></div><span>COUNTRY LOCK · AUSTRALIA</span></div>
              <div className="scanPlannerBody">
                <div className="scanMapShell">
                  <div className="mapControls"><button onClick={() => setMapZoom((z) => Math.min(2.2,z+.2))} aria-label="Zoom map in">+</button><button onClick={() => setMapZoom((z) => Math.max(1,z-.2))} aria-label="Zoom map out">−</button><button onClick={() => { setDrawnBoundary((points) => points.slice(0,-1)); setScanBoundaryMessage("Last boundary point removed"); }} disabled={scanMode !== "custom" || drawnBoundary.length === 0} aria-label="Undo last boundary point">↶</button></div>
                  <svg className={`countryScanMap ${scanMode === "custom" ? "drawing" : ""}`} viewBox={`${110-110/mapZoom} ${150-150/mapZoom} ${220/mapZoom} ${300/mapZoom}`} onPointerDown={addCustomBoundaryPoint} onPointerMove={moveBoundaryPoint} onPointerUp={finishBoundaryDrag} onPointerCancel={finishBoundaryDrag} role="img" aria-label="Country-locked Western Australia scan boundary map">
                    <path className="neighbourContext" d="M174 39 L205 48 214 83 207 116 217 146 204 171 213 203 197 226 190 258 169 280 144 279 156 266 174 266 Z"/>
                    <polygon className="authorisedBoundary" points={polygonPoints(waScanBoundary)}/>
                    <path className="internalBoundary" d="M48 105 C82 112 124 109 174 112 M48 184 C94 176 133 190 174 181 M52 226 C96 218 134 235 174 225"/>
                    {savedScanAreas.filter((scan) => scan.status !== "ARCHIVED").map((scan) => {
                      const [cx,cy] = scanCentroid(scan.geometry);
                      return <g className={`savedScanLayer ${selectedScanAreaId === scan.id ? "selected" : ""}`} onPointerDown={(event) => { event.stopPropagation(); setSelectedScanAreaId(scan.id); }} key={scan.id}><polygon points={polygonPoints(scan.geometry)}/><circle cx={cx} cy={cy} r={5}/><text x={cx} y={cy + 2}>{scan.runs.length > 0 ? "●" : "+"}</text></g>;
                    })}
                    {scanMode === "state" && <polygon className="activeScanBoundary" points={polygonPoints(waScanBoundary)}/>} 
                    {(scanMode === "region" || drawnBoundary.length > 1) && <polygon className="customScanBoundary" points={polygonPoints(drawnBoundary)}/>}
                    {drawnBoundary.map(([x,y],index) => <circle className={`boundaryPoint ${draggingPoint === index ? "dragging" : ""}`} cx={x} cy={y} r={4} onPointerDown={(event) => startBoundaryDrag(event,index)} role="button" aria-label={`Move boundary point ${index + 1}`} key={`boundary-point-${index}`}/>)}
                    <text x="96" y="132" className="mapCountryLabel">WESTERN AUSTRALIA</text>
                    <text x="187" y="138" className="mapNeighbourLabel">COUNTRY CONTEXT</text>
                    <g className="sovereigntyShield"><circle cx="78" cy="64" r="12"/><text x="78" y="67">AU</text></g>
                  </svg>
                  <div className="countryLockBar"><b>✓ AUTHORISED AREA</b><span>{scanBoundaryMessage}</span></div>
                </div>
                <div className="scanPlannerPanel">
                  <small>SCAN AREA TYPE</small>
                  <div className="scanModeButtons"><button className={scanMode === "state" ? "active" : ""} onClick={() => chooseScanMode("state")}><b>State baseline</b><span>Full authorised workspace</span></button><button className={scanMode === "region" ? "active" : ""} onClick={() => chooseScanMode("region")}><b>Official area</b><span>Administrative boundary</span></button><button className={scanMode === "custom" ? "active" : ""} onClick={() => chooseScanMode("custom")}><b>Draw an area</b><span>Custom investigation polygon</span></button></div>
                  <div className="scanRules"><span><b>Country</b>Australia</span><span><b>Workspace</b>Western Australia</span><span><b>Outside boundary</b>Rejected</span><span><b>Multiple scans</b>Permitted</span></div>
                  <button className="captureScanButton" onClick={captureScanArea} disabled={!areaRecoveryKey || areaMemoryState === "loading"}>Capture and save this area <span>→</span></button>
                  <p>Map selection is saved to governed WA spatial memory. Pixel observations remain unvalidated evidence and cannot become ingredients without review.</p>
                  <div className={`areaMemoryBadge ${areaMemoryState}`}><b>{areaMemoryState === "live" ? "✓ PERSISTENT MEMORY" : areaMemoryState === "loading" ? "CONNECTING MEMORY" : "MEMORY UNAVAILABLE"}</b><span>{areaMemoryState === "live" ? "Saved areas will return in this browser" : "New areas cannot be saved until memory reconnects"}</span>{areaMemoryState === "error" && <button onClick={() => loadSavedAreas()}>Reconnect memory</button>}</div>
                  {savedScanAreas.length > 0 && <div className="savedScans"><small>AREA INVESTIGATIONS</small><span><b>{savedScanAreas.filter((scan) => scan.status !== "ARCHIVED").length}</b> visible on this map</span><span><b>{savedScanAreas.reduce((total,scan) => total + scan.runs.length,0)}</b> scan runs retained</span></div>}
                </div>
              </div>
            </section>
            {savedScanAreas.length > 0 && (
              <section className="areaInvestigations" aria-labelledby="area-investigations-title">
                <div className="areaInvestigationsHead"><div><p className="eyebrow">Spatial investigation memory</p><h3 id="area-investigations-title">Saved areas of interest</h3><p>Every boundary is saved with its observation history so the user can return and check for change.</p></div><span>{savedScanAreas.length} INVESTIGATION{savedScanAreas.length === 1 ? "" : "S"}</span></div>
                <div className="areaInvestigationGrid">{savedScanAreas.map((scan) => {
                  const latest = scan.runs[0];
                  const latestMetrics = latest?.observation?.metrics ?? {};
                  const selectedTile = tileInvestigation?.areaId === scan.id && tileInvestigation.runId === latest?.id ? latest.observation.tiles?.find((tile) => tile.tile_id === tileInvestigation.tileId) : undefined;
                  return <article className={`${selectedScanAreaId === scan.id ? "selected" : ""} ${scan.status === "ARCHIVED" ? "archived" : ""}`} key={scan.id}>
                    <button className="scanThumbnail" onClick={() => setSelectedScanAreaId(scan.id)} aria-label={`Show ${scan.name} on map`}><svg viewBox="0 0 220 300" aria-hidden="true"><polygon className="thumbCountry" points={polygonPoints(waScanBoundary)}/><polygon className="thumbScan" points={polygonPoints(scan.geometry)}/>{latest?.observation?.tiles?.map((tile) => <polygon className={`thumbTile ${tile.status === "FAILED" ? "failed" : "complete"}`} points={geoPolygonToMapPoints(tile)} key={tile.tile_id}/>)}</svg><span>{latest?.status === "FAILED" ? "RUN FAILED" : latest?.status === "COMPUTED_UNVALIDATED" ? "OBSERVATION READY" : scan.status === "DRAFT" ? "AREA SAVED" : scan.status}</span></button>
                    <div className="areaInvestigationBody">
                      <small>{scan.id} · {scan.mode.toUpperCase()} AREA</small><h4>{scan.name}</h4>
                      <div className="areaInvestigationStats"><span><b>{scan.runs.length}</b>Runs retained</span><span><b>{latest?.completed_at ? observationDate(latest.completed_at) : "Not run"}</b>Latest observation</span><span><b>{latest?.change_summary?.classification ?? "Baseline pending"}</b>Change status</span></div>
                      <p>Created by {scan.owner} · boundary restored from governed WA memory · formulation eligibility remains locked.</p>
                      {latest && ["COMPUTED_UNVALIDATED","REVIEWED","REJECTED"].includes(latest.status) && <div className="areaFindingResult">
                        <small>WHAT AAB OBSERVED</small>
                        {latest.observation.tile_summary && <div className="tileSummary"><b>{latest.observation.tile_summary.total} TILE{latest.observation.tile_summary.total === 1 ? "" : "S"}</b><span>{latest.observation.tile_summary.completed} complete</span>{latest.observation.tile_summary.failed > 0 && <span className="failed">{latest.observation.tile_summary.failed} require retry</span>}</div>}
                        <div className="metricStrip compactMetrics">{[["NDVI",latestMetrics.mean_ndvi],["NDMI",latestMetrics.mean_ndmi],["NDWI",latestMetrics.mean_ndwi],["Bare soil",latestMetrics.mean_bare_soil_index]].map(([label,value])=><span key={String(label)}><small><HelpTerm label={String(label)}/></small><b>{typeof value === "number" ? value.toFixed(3) : "—"}</b></span>)}</div>
                        <ul>{latest.evidence_signals.map((signal)=><li key={signal}>{signal}</li>)}</ul>
                        <p><b>Potential:</b> these signals identify where investigation may be useful; they do not identify a material or ingredient.</p>
                        <details open><summary>Investigate individual tiles</summary>{latest.observation.tiles && <div className="tileLedger">{latest.observation.tiles.map((tile)=><button type="button" className={`${tile.status === "FAILED" ? "failed" : "complete"} ${selectedTile?.tile_id === tile.tile_id ? "active" : ""}`} onClick={() => { setTileInvestigation({areaId:scan.id,runId:latest.id,tileId:tile.tile_id}); setScientistNotes(latest.observation.scientist_review?.selected_tile_id === tile.tile_id ? latest.observation.scientist_review.scientist_notes : ""); setReviewSaveState("idle"); setImageryMode("natural"); }} key={tile.tile_id}><b>{tile.tile_id}</b>{tile.status === "FAILED" ? "Retry required" : `${tileMagnitude(tile).toFixed(3)} change`}</button>)}</div>}</details>
                        {selectedTile && selectedTile.status !== "FAILED" && <section className="scientificInvestigation" aria-label={`${selectedTile.tile_id} scientific investigation`}>
                          <div className="investigationHead"><div><small>SCIENTIFIC TILE INVESTIGATION</small><h5>{selectedTile.tile_id} · {selectedTile.change?.classification ?? "Change review"}</h5></div><button onClick={() => setTileInvestigation(null)} aria-label="Close tile investigation">×</button></div>
                          <ScientificMap tiles={latest.observation.tiles ?? []} selectedTileId={selectedTile.tile_id} onSelectTile={(tileId)=>setTileInvestigation({areaId:scan.id,runId:latest.id,tileId})}/>
                          <div className="evidenceConfidence"><span><HelpTerm label="Evidence confidence"/></span><b>{evidenceConfidence(selectedTile,scan.runs.length)}%</b><i><em style={{width:`${evidenceConfidence(selectedTile,scan.runs.length)}%`}}/></i><small>Screening strength only · ground verification outstanding</small></div>
                          <div className="imageryViewerHead"><div><small>IMAGERY VIEW</small><strong>{imageryModeProfiles[imageryMode].label}</strong><span>{imageryModeProfiles[imageryMode].help}</span></div><div className="imageryModes" role="group" aria-label="Satellite imagery view">{(Object.keys(imageryModeProfiles) as ImageryMode[]).map((mode)=><button className={imageryMode===mode?"active":""} onClick={()=>setImageryMode(mode)} aria-pressed={imageryMode===mode} key={mode}>{imageryModeProfiles[mode].label}</button>)}</div></div>
                          {immediateMosaicState==="loading"&&<div className="imageryQualityWarning"><b>BUILDING GOVERNED MOSAICS</b><span>Combining qualified Landsat scenes with the same polygon, pixel grid, QA_PIXEL mask and colour scale.</span></div>}
                          {(immediateMosaicState==="error"||immediateMosaicState==="done"&&!immediateMosaic?.imagery_available)&&<div className="imageryQualityWarning"><b>IMAGERY UNAVAILABLE</b><span>{immediateMosaic?.unavailable_reason??"Insufficient clear-pixel coverage for a defensible comparison."}</span></div>}
                          <div className={`imageryCompare mode-${imageryMode}`}><figure>{immediateMosaicState==="done"?renderImmediateMosaic(immediateMosaic?.baseline??null,"baseline",selectedTile):<div>Preparing baseline mosaic…</div>}<figcaption>BEFORE MOSAIC · SAME GOVERNED SHAPE · {observationDate(immediateMosaic?.baseline?.acquired_at??selectedTile.baseline_observation?.acquired_at??null)}</figcaption></figure><span>→</span><figure>{immediateMosaicState==="done"?renderImmediateMosaic(immediateMosaic?.current??null,"current",selectedTile):<div>Preparing current mosaic…</div>}<figcaption>AFTER MOSAIC · SAME GOVERNED SHAPE · {observationDate(immediateMosaic?.current?.acquired_at??selectedTile.observation?.acquired_at??null)}</figcaption></figure></div>
                          {immediateMosaic?.imagery_available&&<div className="alignmentProof"><b>ALIGNMENT + QUALITY PROOF</b><span>Exact governed polygon</span><span>Output grid 768 × 768</span><span>Fixed colour scaling</span><span>Baseline coverage {(immediateMosaic.baseline?.coverage_percent??0).toFixed(1)}%</span><span>Current coverage {(immediateMosaic.current?.coverage_percent??0).toFixed(1)}%</span><span>Cloud, shadow, snow and fill excluded by QA_PIXEL</span></div>}
                          <div className="dateChoice"><small>QUALIFYING DATES</small><button className="active">{observationDate(selectedTile.baseline_observation?.acquired_at ?? null)} · baseline</button><button className="active">{observationDate(selectedTile.observation?.acquired_at ?? null)} · current</button><button onClick={()=>runSavedScan(scan.id)} disabled={runningAreaId===scan.id}>{runningAreaId===scan.id?"Searching imagery…":"Find another qualifying date"}</button></div>
                          <div className="tileMetricChanges">{[["NDVI","mean_ndvi"],["NDMI","mean_ndmi"],["NDWI","mean_ndwi"],["Bare soil","mean_bare_soil_index"]].map(([label,key])=><span key={key}><small><HelpTerm label={label}/></small><b>{signedMetric(selectedTile.change?.metrics?.[key])}</b><em>{changeDirection(selectedTile.change?.metrics?.[key])}</em></span>)}</div>
                          <div className="scientificReasoning"><div><small>OBSERVED</small><p>{selectedTile.observation?.clear_pixels_used?.toLocaleString() ?? "—"} clear pixels measured. The strongest index change was {tileMagnitude(selectedTile).toFixed(3)}.</p></div><div><small>POSSIBLE EXPLANATIONS</small><ul>{tileHypotheses(selectedTile).map((item)=><li key={item}>{item}</li>)}</ul></div><div><small>CONTEXT TO CHECK</small><p>Season, rainfall, drought, fire history, cloud and atmospheric effects, sensor geometry and known site operations. Weather and second-sensor feeds are not yet connected.</p></div><div><small>UNKNOWN</small><p>Material identity, cause, quantity, ownership, safety and potential use remain unverified.</p></div></div>
                          <div className="verificationPlan"><small>GROUND-VERIFICATION PLAN</small><ol><li>Confirm imagery and contextual events.</li><li>Repeat this exact tile to establish persistence.</li><li>Inspect the site and record geolocated observations.</li><li>Collect representative samples under an approved plan.</li><li>Characterise composition, contaminants and safety in a laboratory.</li></ol></div>
                          <div className="observationTimeline"><small>EXACT-AREA TIMELINE</small>{scan.runs.map((run)=><span key={run.id}><b>RUN {run.run_number}</b><i>{observationDate(run.completed_at ?? run.requested_at)}</i><em>{run.status.replaceAll("_"," ")}</em></span>)}</div>
                          <label className="scientistNotebook"><span>Scientist notebook</span><textarea value={scientistNotes} onChange={(event)=>setScientistNotes(event.target.value)} maxLength={4000} placeholder="Record observations, alternative explanations, evidence reviewed and the reason for your decision…"/><small>{scientistNotes.length}/4000 · saved to this governed observation</small></label>
                          <div className="reviewActions"><button onClick={()=>saveScientificReview(scan,latest,selectedTile,"DRAFT_REVIEW")} disabled={reviewSaveState==="saving"}>Save investigation</button><button onClick={()=>saveScientificReview(scan,latest,selectedTile,"REVIEWED")} disabled={reviewSaveState==="saving" || !scientistNotes.trim()}>Mark scientist reviewed</button><button onClick={()=>saveScientificReview(scan,latest,selectedTile,"REJECTED")} disabled={reviewSaveState==="saving" || !scientistNotes.trim()}>Reject explanation</button><span>{reviewSaveState === "saved" ? "✓ Governed review saved" : reviewSaveState === "error" ? "Review could not be saved" : "No ingredient claim created"}</span></div>
                          <div className="evidenceBoundary"><b><HelpTerm label="Formulation eligibility"/></b><span>LOCKED · Spatial evidence cannot become an ingredient without material characterisation and governed approval.</span></div>
                        </section>}
                        <details><summary>Knowledge gaps</summary><ul>{latest.knowledge_gaps.map((gap)=><li key={gap}>{gap}</li>)}</ul></details>
                      </div>}
                      {latest?.status === "FAILED" && <div className="areaRunError"><b>Observation not completed</b><span>{latest.error_message}</span></div>}
                      <div className="areaInvestigationActions"><button onClick={() => runSavedScan(scan.id)} disabled={scan.status === "ARCHIVED" || runningAreaId === scan.id}>{runningAreaId === scan.id ? "Processing pixels…" : scan.runs.length ? "Run New Observation" : "Run Area Scan"}</button><button onClick={() => removeOrArchiveScan(scan.id)} disabled={scan.status === "ARCHIVED"}>{scan.status === "ARCHIVED" ? "Archived" : scan.runs.length ? "Archive" : "Delete Draft"}</button></div>
                    </div>
                  </article>;
                })}</div>
                <p className="areaInvestigationBoundary">Persistent area records are country-scoped. Spectral observations remain computed and unvalidated; only evidence-backed candidates may enter scientist review, and none are formulation eligible by default.</p>
              </section>
            )}
            </details>
            <div className="findingFilters" aria-label="Filter discoveries">{["All findings", "Wheatbelt", "Aquaculture", "Perth"].map((item) => <button className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div>
            <div className="findingsGrid">
              {visibleFindings.map((item) => {
                const isOpen = selectedFinding?.name === item.name;
                return (
                  <div className={`findingCard ${isOpen ? "isExpanded" : ""}`} role="article" key={item.name}>
                    <div className="findingSummary">
                      <div className="findingTop"><span>{item.region}</span><b>{item.name === "Red Hill landfill material system" ? "LIVE SPATIAL PILOT" : "REVIEW REQUIRED"}</b></div>
                      <h4>{item.name}</h4>
                      <p className="findingType">{item.type} · {item.evidence} evidence</p>
                      <p className="actualFind"><strong>What AAB found</strong>{item.find}</p>
                      <button className="passportButton" aria-expanded={isOpen} onClick={() => { setPassportView("overview"); setCandidateAction(null); setSpatialRun("idle"); setSpatialResult(null); setSpatialError(""); setSelectedFinding(isOpen ? null : item); }}>
                        {isOpen ? "Close Investigation" : "Investigate Candidate"} <span>{isOpen ? "↑" : "→"}</span>
                      </button>
                      <a href={item.url} target="_blank" rel="noreferrer">Supporting evidence · {item.source} ↗</a>
                    </div>
                    {isOpen && (
                      <div className="passportPanel inlinePassport" role="region" aria-label={`${item.name} investigation workspace`}>
                        <div className="passportHead"><div><p className="eyebrow">Candidate Investigation · AU/WA</p><h3>{item.name}</h3></div><button onClick={() => setSelectedFinding(null)} aria-label="Close investigation">×</button></div>
                        <div className="passportStatus" aria-label="Candidate status summary">
                          <span><small>Evidence</small><b>{item.evidence}</b></span><span><small>Spatial analysis</small><b>{item.name === "Red Hill landfill material system" ? "Baseline active" : item.name === "FOGO-derived organics" ? "Boundary ready" : "Not yet measured"}</b></span><span><small>Potential pathways</small><b>{item.pathways.length}</b></span><span><small>Knowledge gaps</small><b>{genomeProfiles[item.name].unknown.length + 3}</b></span><span><small>Formulation</small><b>Locked</b></span>
                        </div>
                        <div className={`candidateScanGate ${candidateSpatialProfiles[item.name].status.toLowerCase()}`}>
                          <div><small>SPATIAL STATUS · {candidateSpatialProfiles[item.name].status}</small><strong>{candidateSpatialProfiles[item.name].label}</strong><span>{candidateSpatialProfiles[item.name].note}</span></div>
                          <button onClick={() => { setPassportView(candidateSpatialProfiles[item.name].status==="UNRESOLVED"?"context":"spatial"); setCandidateAction(item.name); }}>{candidateSpatialProfiles[item.name].action}</button>
                        </div>
                        <div className="passportTabs" role="tablist">{([["overview","Overview"],["context","Context records"],["spatial","Spatial evidence"],["potential","Potential"],["gaps","Knowledge gaps"],["governance","Governance"]] as const).map(([id,label]) => <button role="tab" aria-selected={passportView===id} className={passportView===id?"active":""} onClick={()=>setPassportView(id)} key={id}>{label}</button>)}</div>
                        {passportView === "overview" && <><div className="passportFacts"><div><small>Detected physical find</small><p>{item.find}</p></div><div><small>Quantity status</small><p>{item.quantity}</p></div><div><small>Material identity</small><p>{item.name === "Grain crop residues" ? "Likely wheat straw/stubble/chaff; barley straw/stubble/chaff; canola stalk/pod/chaff; lupin stalk/pod; and oat straw/chaff. Crop sources documented; fractions not yet sampled." : item.identity}</p></div><div><small>Ingestion boundary</small><p>Quarantined Discovery Memory · Country-only</p></div></div><div className="genome"><div className="genomeOrb"><i/><i/><i/><span>RESOURCE<br/>GENOME</span></div><div className="genomeLanes"><div><b>DOCUMENTED</b>{genomeProfiles[item.name].known.map((v) => <span key={v}>{v}</span>)}</div><div><b>INFERRED</b>{genomeProfiles[item.name].inferred.map((v) => <span key={v}>{v}</span>)}</div><div><b>UNKNOWN</b>{genomeProfiles[item.name].unknown.map((v) => <span key={v}>{v}</span>)}</div></div></div></>}
                        {passportView === "context" && <CandidateEvidencePanel candidate={item.name}/>} 
                        {passportView === "spatial" && ((item.name === "Red Hill landfill material system" || item.name === "FOGO-derived organics") ? <div className="candidateSpatial liveCandidateSpatial"><div className="spatialPlaceholder"><i/><strong>{item.name === "FOGO-derived organics" ? "Landsdale premises boundary ready" : "Candidate boundary ready"}</strong><span>{item.name === "FOGO-derived organics" ? "The Landgate parcel for 15 Attwell Street is connected and cross-checked against the DWER Lot 79 premises record. Only this polygon will be measured." : "The exact Red Hill investigation envelope is connected. Run the scan here; AAB will return measured potential for scientist investigation, not a material or safety claim."}</span></div><div className="spatialRunControl"><button onClick={()=>runSpatialAnalysis(item.name)} disabled={spatialRun === "running"}>{spatialRun === "running" ? "Processing Landsat pixels…" : spatialRun === "done" ? "Run another candidate observation" : "Scan this candidate now"}</button><div><small>CANDIDATE-LOCAL COMPUTATION</small><strong>{spatialRun === "idle" && "Ready — no further activation required"}{spatialRun === "running" && "Reading qualified surface-reflectance pixels"}{spatialRun === "error" && spatialError}{spatialRun === "done" && spatialResult && `Computed from ${spatialResult.observation.clear_pixels_used} clear pixels`}</strong></div></div>{spatialRun === "done" && spatialResult && <div className="metricStrip compactMetrics">{[["NDVI",spatialResult.observation.metrics.mean_ndvi],["NDMI",spatialResult.observation.metrics.mean_ndmi],["NDWI",spatialResult.observation.metrics.mean_ndwi],["Bare soil",spatialResult.observation.metrics.mean_bare_soil_index]].map(([label,value])=><span key={String(label)}><small>{label}</small><b>{((metric:number|null|undefined)=>metric==null?"—":metric.toFixed(3))(value as number|null)}</b></span>)}</div>}<div className="spatialSteps"><span><b>01</b>Exact boundary</span><span><b>02</b>Qualified imagery</span><span><b>03</b>Measured potential</span><span><b>04</b>Scientist investigates</span></div></div> : item.name === "Grain crop residues" ? <div className="candidateSpatial liveCandidateSpatial regionalLiveScan"><div className="spatialPlaceholder"><i/><strong>Official Wheatbelt boundary connected</strong><span>Runs across the WA Government DPIRD Wheatbelt geometry. AAB measures regional spatial potential; scientists establish crop source, residue identity, cause and usefulness.</span></div><div className="spatialRunControl"><button onClick={runWheatbeltScan} disabled={regionalRun === "boundary" || regionalRun === "running"}>{regionalRun === "boundary" ? "Loading official boundary…" : regionalRun === "running" ? `Scanning tile ${Math.min(regionalProgress.completed + 1, regionalProgress.total)} of ${regionalProgress.total}…` : regionalRun === "done" ? "Run another Wheatbelt observation" : "Scan Wheatbelt now"}</button><div><small>LIVE REGIONAL COMPUTATION</small><strong>{regionalRun === "idle" && "Ready — official boundary loads at scan time"}{regionalRun === "boundary" && "Retrieving governed DPIRD geometry"}{regionalRun === "running" && `${regionalProgress.completed} of ${regionalProgress.total} evidence tiles completed`}{regionalRun === "error" && regionalError}{regionalRun === "done" && regionalResult && `${regionalResult.tile_summary.completed} of ${regionalResult.tile_summary.total} evidence tiles completed`}</strong></div></div>{regionalRun === "done" && regionalResult && <><div className="metricStrip compactMetrics">{[["NDVI",regionalResult.observation.metrics.mean_ndvi],["NDMI",regionalResult.observation.metrics.mean_ndmi],["NDWI",regionalResult.observation.metrics.mean_ndwi],["Bare soil",regionalResult.observation.metrics.mean_bare_soil_index]].map(([label,value])=><span key={String(label)}><small>{label}</small><b>{typeof value === "number" ? value.toFixed(3) : "—"}</b></span>)}</div><div className="regionalScanSummary"><span><small>CLEAR PIXELS</small><b>{regionalResult.observation.clear_pixels_used.toLocaleString()}</b></span><span><small>SCENES QUALIFIED</small><b>{regionalResult.scenes_qualified}</b></span><span><small>CLASSIFICATION</small><b>{regionalResult.change.classification}</b></span><span><small>STATUS</small><b>{regionalResult.evidence_status.replaceAll("_"," ")}</b></span></div><div className="regionalEvidenceHead"><div><small>WHEATBELT EVIDENCE MAP</small><strong>Select any measured tile to inspect its evidence</strong></div><span>Scroll or use +/− to zoom · drag to pan</span></div><ScientificMap tiles={regionalEvidenceTiles} selectedTileId={regionalSelectedTileId || regionalEvidenceTiles[0]?.tile_id || ""} onSelectTile={setRegionalSelectedTileId}/></>}{regionalProvenance && <p className="regionalProvenance"><b>{regionalProvenance.dataset}</b> · {regionalProvenance.publisher} · {regionalProvenance.licence}</p>}<div className="spatialSteps"><span><b>01</b>Official boundary</span><span><b>02</b>Qualified imagery</span><span><b>03</b>Regional potential</span><span><b>04</b>Scientist investigates</span></div></div> : <div className={`candidateSpatial spatialScopeExplanation ${candidateSpatialProfiles[item.name].status.toLowerCase()}`}><div><small>WHY THIS SCAN SCOPE?</small><strong>{candidateSpatialProfiles[item.name].label}</strong><p>{candidateSpatialProfiles[item.name].note}</p></div><div className="scopeDecision"><section><small>WHAT AAB KNOWS</small><p>{candidateSpatialProfiles[item.name].known ?? <>The supporting evidence identifies <b>{item.region}</b>, but does not yet prove one exact candidate polygon.</>}</p></section><section><small>WHAT AAB CAN DO NOW</small><p>{candidateSpatialProfiles[item.name].available ?? (candidateSpatialProfiles[item.name].status === "REGIONAL" ? `Run reconnaissance using the authoritative ${item.region} boundary once its governed geometry is connected.` : "Keep the candidate visible, show the missing location evidence and guide the scientist to resolve it.")}</p></section><section><small>WHY NOT AN EXACT CANDIDATE SCAN?</small><p>{candidateSpatialProfiles[item.name].boundaryReason ?? (candidateSpatialProfiles[item.name].status === "REGIONAL" ? "A regional signal must not be presented as though it came from one physical candidate site." : "Inventing a boundary would contaminate AAB’s evidence and could associate measurements with the wrong place.")}</p></section></div><div className="scopeRequirement"><small>NEXT REQUIRED SYSTEM INPUT</small><strong>{candidateSpatialProfiles[item.name].nextInput ?? (candidateSpatialProfiles[item.name].status === "REGIONAL" ? `Connect the authoritative ${item.region} boundary dataset` : "Resolve and verify the candidate’s location evidence")}</strong><span>When this input is connected, this panel will provide the real scan action.</span></div></div>)}
                        {passportView === "spatial" && (item.name === "Red Hill landfill material system" || item.name === "FOGO-derived organics") && spatialRun === "done" && candidateEvidenceTiles.length>0 && <div className="candidateSiteMap"><div className="regionalEvidenceHead"><div><small>{item.name === "FOGO-derived organics" ? "LANDSDALE GOVERNED EVIDENCE MAP" : "RED HILL GOVERNED EVIDENCE MAP"}</small><strong>Only the exact premises envelope is measured</strong></div><span>Surrounding roads and places are orientation context only</span></div><ScientificMap tiles={candidateEvidenceTiles} selectedTileId={candidateEvidenceTiles[0].tile_id} onSelectTile={()=>{}} scope="candidate"/></div>}
                        {passportView === "potential" && <DiscoveryFormulationRequest candidate={item.name} pathways={item.pathways} knowledgeGap={item.gap}/>}
                        {passportView === "gaps" && <div className="gapMap"><div className="gapMapHead"><div><small>NATIONAL KNOWLEDGE-GAP MAP</small><strong>{genomeProfiles[item.name].unknown.length + 3} blockers prevent progression</strong></div><span>0 CLOSED</span></div><div className="gapGrid">{genomeProfiles[item.name].unknown.map((gap,index)=><article key={gap}><b>{String(index+1).padStart(2,"0")}</b><div><small>MATERIAL EVIDENCE</small><strong>{gap}</strong><span>Measurement or sampling required</span></div></article>)}<article><b>R</b><div><small>RECOVERABILITY</small><strong>{item.quantity}</strong><span>Quantity and access must be resolved</span></div></article><article><b>S</b><div><small>SAFETY & ECOLOGY</small><strong>Review incomplete</strong><span>No progression until hazards are assessed</span></div></article><article><b>V</b><div><small>SCIENTIFIC VERIFICATION</small><strong>{item.gap}</strong><span>Evidence packet remains under review</span></div></article></div><div className="gapAction"><span>What closes the pathway?</span><strong>{potentialProfiles[item.name].condition}</strong></div></div>}
                        {passportView === "governance" && <div className="governancePanel"><section><small>ROUTED DOMAIN BRAINS</small><div>{item.brains.map((brain) => <span key={brain}>{brain}</span>)}</div></section><section><small>MANDATORY GATES</small><div>{["Evidence provenance","Material characterisation","Safety & ecology","Regulatory review","Scientist approval"].map((gate) => <span key={gate}>{gate}</span>)}</div></section><div className="formulationBoundary"><div><small>FORMULATION INTELLIGENCE BOUNDARY</small><strong>Visible for research only. This candidate cannot be selected as an ingredient until every required gate is passed.</strong></div><b>FAIL-CLOSED</b></div></div>}
                        <div className="sovereigntyLock"><b>COUNTRY SOVEREIGNTY LOCKED</b><span>Cross-country access disabled · Global AAB export not built</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="candidateNotice"><strong>Candidate evidence only.</strong> Discovery does not mean suitability, safety, availability or approval. Each record is held for provenance-led scientific and regulatory review.</p>
          </div>
          <div className="clusterSection"><div className="clusterIntro"><p className="eyebrow">Cross-domain pattern detection · WA only</p><h3>Four opportunity clusters detected</h3><p>AAB is connecting co-located resources, constraints and infrastructure into investigation hypotheses. These are not projects, recommendations or approved opportunities.</p></div><div className="clusterGrid">{opportunityClusters.map((cluster, index) => <article className="clusterCard" key={cluster.id}><div className="clusterVisual"><span className="clusterCore">{String(index + 1).padStart(2,"0")}</span>{cluster.links.map((link) => <i key={link}>{link}</i>)}</div><small>{cluster.region} · {cluster.confidence}</small><h4>{cluster.title}</h4><p>{cluster.potential}</p><b>{cluster.id} · SCIENTIST REVIEW REQUIRED</b></article>)}</div></div>
          <section className="statewideSystem" aria-labelledby="statewide-title"><div className="statewideHead"><div><p className="eyebrow">WA Statewide Discovery Intake <span className={`memoryLinkState ${memoryState}`}>{memoryState === "live" ? "LIVE SUPABASE MEMORY" : memoryState === "loading" ? "CONNECTING MEMORY" : memoryState === "unavailable" ? "MEMORY READ UNAVAILABLE" : "MEMORY READY"}</span></p><h3 id="statewide-title">Every candidate enters governed scientific memory</h3><p>Evidence and spatial observations route into the relevant Domain Brains. Formulation Intelligence can see the research pathway, but cannot use a material until verification and approval are complete.</p></div><div className="statewideCounts"><span><b>{liveMemory?.queue.length ?? 10}</b>Registered opportunities</span><span><b>{liveMemory ? liveMemory.queue.filter((item) => item.observation_status !== "NONE").length : 1}</b>Stored spatial baseline</span><span><b>{liveMemory?.formulation_eligible_count ?? 0}</b>Formulation eligible</span></div></div><div className="intakeFlow"><div><small>01 · REGISTER</small><strong>Opportunity Register</strong><span>Source · boundary · provenance</span></div><i>→</i><div><small>02 · OBSERVE</small><strong>Evidence + spatial scan</strong><span>Baseline · change · uncertainty</span></div><i>→</i><div><small>03 · LEARN</small><strong>Domain Brain</strong><span>Identity · mechanism · gaps</span></div><i>→</i><div className="lockedStage"><small>04 · GOVERN</small><strong>Ingredient approval gate</strong><span>Blocked until verified</span></div></div><div className="formulationBoundary"><div><small>FORMULATION INTELLIGENCE BOUNDARY</small><strong>Research candidates may inform investigation. Only approved ingredients can be selected for a formulation.</strong></div><b>FAIL-CLOSED</b></div><button className="queueToggle" onClick={() => setStatewideOpen((value) => !value)} aria-expanded={statewideOpen}>{statewideOpen ? "Hide statewide queue" : `View all ${liveMemory?.queue.length ?? 10} governed opportunities`} <span>→</span></button>{statewideOpen && <div className="statewideQueue" role="region" aria-label="Western Australia governed opportunity queue">{displayQueue.map((item,index)=><article key={item.name}><b>{String(index+1).padStart(2,"0")}</b><div><strong>{item.name}</strong><span>{item.region}</span></div><div><small>ROUTED BRAIN</small><span>{item.brain}</span></div><div><small>DISCOVERY STATE</small><span>{item.stage}</span></div><em>{item.eligibility}</em></article>)}</div>}<p className="statewideFoot">{liveMemory ? `${liveMemory.brain_routes} governed brain routes · ${liveMemory.stored_spatial_metrics} stored pixel metrics · ` : ""}Country-only memory · full provenance retained · rejected and unsafe findings remain as negative learning · no cross-country sharing</p></section>
          <div className="completionCard"><div><p className="eyebrow">Next governed step</p><h3>Build the team that will verify and expand it.</h3><p>Invite trusted scientific institutions to examine evidence, close knowledge gaps and support governed investigation.</p></div><button className="primaryAction" onClick={() => setInviteOpen(true)}>Invite Scientific Review Partners</button></div>
        </>
      )}

      {inviteOpen && (
        <div className="invitePreview" role="status">
          <div className="inviteHead"><div><p className="eyebrow">Next guided step</p><h3>Invite research partners</h3></div><span>Preview only</span></div>
          <div className="partnerGrid">
            {["University or research institution", "Government science agency", "Accredited laboratory", "Independent scientist or adviser"].map((partner) => <button disabled key={partner}><i>+</i>{partner}</button>)}
          </div>
          <p>Invitations remain locked until the Platform Owner identity, WA workspace and access rules are activated.</p>
        </div>
      )}
    </section>
  );
}
