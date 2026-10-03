import { headers } from "next/headers";
import JurisdictionWorkspace from "./JurisdictionWorkspace";

const readiness = [
  { label: "WA clean-room database", value: "Ready", tone: "ready" },
  { label: "Jurisdiction", value: "Western Australia", tone: "ready" },
  { label: "Platform Owner identity", value: "Awaiting bootstrap", tone: "hold" },
  { label: "WA resource discovery", value: "Not started", tone: "idle" },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="mark">AAB</span><span>Western Australia</span></div>
        <div className="stage">STAGING · GOVERNED</div>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">WA governed discovery workspace</p>
          <h1>Jurisdiction Discovery &amp; Intelligence</h1>
          <p className="lede">Discover, map, investigate and monitor Western Australia’s potential resources through governed country-scoped scientific intelligence.</p>
        </div>
        <aside className="identity"><span className="dot" /><div><small>Authenticated viewer</small><strong>{email ?? "Protected access"}</strong></div></aside>
      </section>
      <section className="statusGrid" aria-label="Activation status">
        {readiness.map((item) => <article className="statusCard" key={item.label}><span className={`signal ${item.tone}`} /><div><small>{item.label}</small><strong>{item.value}</strong></div></article>)}
      </section>
      <JurisdictionWorkspace email={email ?? "Protected Platform Owner"} />
      <section className="mainGrid">
        <article className="panel activation">
          <p className="eyebrow">Activation sequence</p><h2>Controlled WA launch</h2>
          <ol>
            <li className="done"><span>1</span><div><strong>Clean-room baseline</strong><small>Canonical schema, RLS and authority tests passed</small></div></li>
            <li className="current"><span>2</span><div><strong>Platform Owner bootstrap</strong><small>One-time identity binding and role verification</small></div></li>
            <li><span>3</span><div><strong>Activate Australia / WA workspace</strong><small>Country AU · workspace AAB Western Australia</small></div></li>
            <li><span>4</span><div><strong>Governed resource scan</strong><small>Evidence capture first; no autonomous approvals</small></div></li>
          </ol>
        </article>
        <article className="panel guardrail">
          <p className="eyebrow">Authority boundary</p><h2>Human decision required</h2>
          <p>AAB may discover, classify and recommend. It cannot approve participation, provision a jurisdiction, change roles or promote a resource candidate without authorised human review.</p>
          <div className="rule"><span>Discovery</span><strong>Advisory</strong></div>
          <div className="rule"><span>Scientific assessment</span><strong>Scientist review</strong></div>
          <div className="rule"><span>Approval & activation</span><strong>Platform Owner</strong></div>
        </article>
      </section>
      <footer>Temporary WA clean-room · Live AAB remains untouched</footer>
    </main>
  );
}
