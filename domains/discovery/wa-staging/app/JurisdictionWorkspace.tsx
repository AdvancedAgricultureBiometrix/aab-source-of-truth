"use client";

import { useState } from "react";
import JurisdictionScan from "./JurisdictionScan";
import ThailandPrivateDemo from "./ThailandPrivateDemo";

export default function JurisdictionWorkspace({ email }: { email: string }) {
  const [jurisdiction, setJurisdiction] = useState<"wa" | "th">("wa");

  return (
    <>
      <nav className="jurisdictionChooser" aria-label="Choose private jurisdiction workspace">
        <div>
          <small>PLATFORM OWNER · JURISDICTION WORKSPACES</small>
          <strong>Choose an isolated discovery environment</strong>
          <span>Outputs never cross jurisdiction or enter another jurisdiction’s scientific memory.</span>
        </div>
        <div className="jurisdictionTabs" role="tablist">
          <button role="tab" aria-selected={jurisdiction === "wa"} className={jurisdiction === "wa" ? "active" : ""} onClick={() => setJurisdiction("wa")}>
            <b>Western Australia</b><span>Governed staging workspace</span>
          </button>
          <button role="tab" aria-selected={jurisdiction === "th"} className={jurisdiction === "th" ? "active" : ""} onClick={() => setJurisdiction("th")}>
            <b>Thailand</b><span>Private owner demonstration</span>
          </button>
        </div>
      </nav>
      {jurisdiction === "wa" ? <JurisdictionScan /> : <ThailandPrivateDemo owner={email} />}
    </>
  );
}
