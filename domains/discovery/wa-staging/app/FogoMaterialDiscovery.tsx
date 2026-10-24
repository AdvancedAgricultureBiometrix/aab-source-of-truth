"use client";

import DiscoveryFormulationRequest from "./DiscoveryFormulationRequest";

const sourceRecords = [
  {
    label: "Authoritative source",
    value: "Source-separated food organics and garden organics (FOGO)",
    detail: "Waste Authority WA documents the FOGO system context. Candidate evidence remains source-linked and unresolved fields stay explicit.",
    status: "DOCUMENTED",
    href: "https://www.wasteauthority.wa.gov.au/publications/view/fogo-resources",
  },
  {
    label: "Regulated receival",
    value: "30,000 t/year approved receival",
    detail: "DWER works approval W6947/2024/1 records a proposed receival quantity. This is an approval/capacity fact, not actual annual throughput.",
    status: "DOCUMENTED",
    href: "https://der.wa.gov.au/images/documents/our-work/licences-and-works-approvals/Decisions_/W6947/W6947_20250110_DR.pdf",
  },
  {
    label: "Published project capacity",
    value: "Up to 50,000 t/year",
    detail: "The WA Government announced capacity for a fully enclosed Landsdale FOGO transfer facility. Published capacity must not be presented as measured throughput.",
    status: "DOCUMENTED",
    href: "https://www.wa.gov.au/government/media-statements/Cook%20Labor%20Government/-FOGO-facility-expansions-go-ahead-thanks-to-WasteSorted-funding-20250429",
  },
  {
    label: "Actual throughput",
    value: "Not connected",
    detail: "A dated authoritative record of tonnes actually received or processed is still required.",
    status: "EVIDENCE REQUIRED",
  },
  {
    label: "Composition + contamination",
    value: "Not characterised",
    detail: "Representative audits, sampling methods and measured fractions are required before material behaviour can be investigated responsibly.",
    status: "EVIDENCE REQUIRED",
  },
  {
    label: "Processing + dependable availability",
    value: "Not established",
    detail: "Processing state, seasonal variability, dependable availability, water demand and energy demand remain unresolved.",
    status: "EVIDENCE REQUIRED",
  },
] as const;

const adoptionQuestions = [
  ["Verified current users", "No authoritative user/adoption dataset is connected. AAB must not infer individual users from satellite imagery or premises proximity."],
  ["Processors + industries", "Connect processor records, government reporting, procurement evidence, market studies or other attributable sources."],
  ["Current markets + competing uses", "Map verified end markets and competing uses separately from possible future farming investigations."],
  ["Change in adoption", "Use dated evidence to show whether use is increasing, stable or declining. Do not convert capacity announcements into adoption claims."],
] as const;

const farmingContexts = [
  ["Broadacre", "Investigate measurable questions in defined crop, soil, climate and operating conditions."],
  ["Horticulture", "Investigate characterised material fractions under controlled horticultural comparisons."],
  ["Nurseries", "Investigate physical, chemical and biological compatibility only after contamination and stability evidence is available."],
  ["Rehabilitation", "Investigate defined rehabilitation contexts with explicit safety, environmental and regulatory exclusions."],
] as const;

export default function FogoMaterialDiscovery() {
  const knowledgeGap = "Actual throughput, composition, contamination, stability, processing state, dependable availability and verified adoption remain unresolved.";

  return (
    <section className="fogoMaterialDiscovery" aria-label="FOGO material and product discovery journey">
      <header className="fogoMaterialHero">
        <div>
          <small>PRODUCT / MATERIAL DISCOVERY · FOGO-DERIVED ORGANICS</small>
          <h4>Discover the material before investigating what it could become</h4>
          <p>This journey separates source facts, current use, farming investigation contexts and scientist-selected research interfaces. Premises location is supporting provenance only; it is not the centre of this investigation.</p>
        </div>
        <span>SCIENTIST REVIEW ONLY</span>
      </header>

      <div className="fogoJourneyRail" aria-label="FOGO discovery stages">
        <span><b>01</b>Material + source</span>
        <span><b>02</b>Usage + users</span>
        <span><b>03</b>Farming applications</span>
        <span><b>04</b>Research interfaces</span>
      </div>

      <section className="fogoDiscoverySection">
        <div className="fogoSectionHead">
          <div><small>01 · MATERIAL + SOURCE</small><h5>What is actually known about the candidate?</h5></div>
          <span>CAPACITY ≠ THROUGHPUT</span>
        </div>
        <div className="fogoSourceGrid">
          {sourceRecords.map((record) => (
            <article key={record.label} className={record.status === "DOCUMENTED" ? "documented" : "required"}>
              <div><small>{record.label}</small><em>{record.status}</em></div>
              <strong>{record.value}</strong>
              <p>{record.detail}</p>
              {"href" in record && record.href ? <a href={record.href} target="_blank" rel="noreferrer">Open authoritative source ↗</a> : null}
            </article>
          ))}
        </div>
        <aside className="fogoProvenanceOnly">
          <div><small>SUPPORTING PREMISES PROVENANCE</small><strong>Landsdale Resource Recovery Park · 15 Attwell Street · Lot 79 on Diagram 57260</strong></div>
          <p>The connected premises boundary supports source traceability only. Satellite pixels are not used here to identify users, determine adoption, infer composition or establish farming suitability.</p>
        </aside>
      </section>

      <section className="fogoDiscoverySection">
        <div className="fogoSectionHead">
          <div><small>02 · CURRENT USE + ADOPTION</small><h5>Who uses it, for what, and how is that changing?</h5></div>
          <span>NO USER INFERENCE</span>
        </div>
        <div className="fogoAdoptionGrid">
          {adoptionQuestions.map(([title, detail]) => <article key={title}><strong>{title}</strong><p>{detail}</p><em>EVIDENCE TO CONNECT</em></article>)}
        </div>
        <div className="fogoEvidenceBoundary"><b>ADOPTION EVIDENCE BOUNDARY</b><span>When authoritative usage or adoption data is not connected, AAB says so. It does not fill the gap with imagery, assumptions or marketing language.</span></div>
      </section>

      <section className="fogoDiscoverySection">
        <div className="fogoSectionHead">
          <div><small>03 · FARMING CONTEXTS TO INVESTIGATE</small><h5>Where could a controlled scientific question be relevant?</h5></div>
          <span>INVESTIGATION · NOT SUITABILITY</span>
        </div>
        <div className="fogoContextGrid">
          {farmingContexts.map(([title, detail]) => <article key={title}><b>{title}</b><p>{detail}</p><span>INVESTIGATE ONLY</span></article>)}
        </div>
        <p className="fogoContextBoundary">These are research contexts. They are not claims that FOGO-derived organics are safe, suitable, effective or beneficial in any farming system.</p>
      </section>

      <section className="fogoDiscoverySection fogoResearchStage">
        <div className="fogoSectionHead">
          <div><small>04 · SCIENTIST-LED FUTURE INVESTIGATION</small><h5>Select the research question — not a formulation</h5></div>
          <span>FORMULATION LOCKED</span>
        </div>
        <div className="fogoResearchBoundary">
          <b>PRIMARY CANDIDATE</b><span>FOGO-derived organics</span><i>+</i><b>POSSIBLE RESEARCH INTERFACES</b><span>Scientist selects one or many compatibility questions below</span>
        </div>
        <DiscoveryFormulationRequest candidate="FOGO-derived organics" pathways={["Broadacre", "Horticulture", "Nurseries", "Rehabilitation"]} knowledgeGap={knowledgeGap} />
      </section>
    </section>
  );
}
