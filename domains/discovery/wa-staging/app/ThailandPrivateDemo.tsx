"use client";

import { useState } from "react";

const provinces = ["Chiang Mai", "Chiang Rai", "Mae Hong Son", "Bangkok", "Khon Kaen", "Nakhon Ratchasima", "Chon Buri", "Songkhla"];
const evidence = [
  ["Ground monitoring", "PM2.5 · PM10 · NO₂ · O₃", "Official station connector required"],
  ["Atmospheric satellite", "Aerosol · NO₂ · smoke transport", "Observation connector required"],
  ["Fire context", "Thermal anomalies · burn timing", "Corroboration only — not automatic cause"],
  ["Weather context", "Wind · rain · boundary-layer conditions", "Required before transport attribution"],
];

export default function ThailandPrivateDemo({ owner }: { owner: string }) {
  const [layer, setLayer] = useState<"potential" | "change" | "air">("air");
  const [region, setRegion] = useState("Whole Thailand");
  const [running, setRunning] = useState(false);

  return <section className="thailandDemo" aria-labelledby="thailand-title">
    <header className="thailandHead">
      <div><p className="eyebrow">DEMO-TH-PRIVATE · OWNER ONLY</p><h2 id="thailand-title">Thailand Discovery &amp; Change Intelligence</h2><p>Private, computed and unvalidated demonstration outputs. Nothing is written to the WA brain, a Thailand brain, an ingredient registry or formulation intelligence.</p></div>
      <span><b>ISOLATED</b>{owner}</span>
    </header>
    <div className="thailandBoundary"><b>AAB finds potential and patterns.</b><span>Thai scientists and authorities establish identity, cause, exposure, health significance and action.</span></div>
    <div className="thailandLayers" role="tablist">
      <button className={layer === "potential" ? "active" : ""} onClick={() => setLayer("potential")}><b>Potential discovery</b><span>Investigation leads</span></button>
      <button className={layer === "change" ? "active" : ""} onClick={() => setLayer("change")}><b>Environmental change</b><span>Comparable history</span></button>
      <button className={layer === "air" ? "active" : ""} onClick={() => setLayer("air")}><b>Air quality intelligence</b><span>Pollution patterns</span></button>
    </div>
    <div className="thailandScope">
      <div><small>GOVERNED SCAN SCOPE</small><h3>{layer === "air" ? "Air-pollution evidence intake" : layer === "change" ? "Environmental change scan" : "Potential discovery scan"}</h3><p>Choose an authoritative area. Freehand boundaries are excluded from the normal demonstration workflow.</p></div>
      <label>Area<select value={region} onChange={event => setRegion(event.target.value)}><option>Whole Thailand</option>{provinces.map(name => <option key={name}>{name}</option>)}</select></label>
      <button className="primaryAction" onClick={() => setRunning(true)}>{running ? "Evidence connections required" : `Prepare ${region} scan`}</button>
    </div>
    {layer === "air" && <>
      <div className="airEvidenceGrid">{evidence.map(([title, measures, state]) => <article key={title}><small>{title}</small><strong>{measures}</strong><span>{state}</span></article>)}</div>
      <div className="airOutput">
        <div className="airMapPlaceholder"><span>TH</span><i/><b>{region}</b><small>Air-quality map awaits governed live evidence feeds</small></div>
        <div><small>OUTPUT CONTRACT</small><h3>What AAB may report</h3><ul><li>Measured or modelled pollutant concentration, with source type shown.</li><li>Daily, seasonal and multi-year patterns.</li><li>Recurring hotspots and possible transport pathways.</li><li>Possible contributors with supporting and contradictory evidence.</li><li>Monitoring gaps and “no verified explanation found” where appropriate.</li></ul><h3>What AAB must not claim</h3><p>Satellite signals alone do not establish ground-level exposure, a pollution source, health impact or responsibility.</p></div>
      </div>
    </>}
    {layer !== "air" && <div className="privateLayerPlaceholder"><b>{layer === "change" ? "Environmental Change Layer" : "Potential Discovery Layer"}</b><span>Architecture registered for a separate Thailand output. Evidence connectors and authoritative boundaries must be validated before findings are displayed.</span></div>}
    <footer className="thailandMemoryLock"><b>PRIVATE DEMONSTRATION MEMORY</b><span>Presentation output only · no WA memory · no cross-country learning · no operational scientific claim</span></footer>
  </section>;
}
