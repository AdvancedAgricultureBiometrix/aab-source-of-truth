# AAB Platform Governance — Governed Field Observations and Automated Brain Boundaries

**Document:** AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29  
**Internal reference:** AAB-GOV-DEC-OBSERVATION-BRAIN-01  
**Status:** APPROVED — reviewed and approved in governance session 2026-09-29  
**Type:** Platform-wide governance architecture  
**Applies to:** CAP-04, CAP-05, CAP-08, CAP-35 (candidate), CAP-36 (proposed), and future AAB brain capabilities  
**Supplements:** governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md

---

## 1. Purpose

This document establishes:

1. how farmer, community and trial observations enter AAB; and
2. what AAB brains may do automatically versus what requires human scientific or governance authority.

It supplements the existing principle in `governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md` that AAB brains must never manufacture facts or silently resolve contradictions. This document corrects and extends that principle.

---

## 2. Two observation classes

### 2.1 Farmer or community field observation

A farmer, worker or other authorised contributor may submit a simple observation consisting of:

- Photograph or permitted media
- Date and time
- Controlled location information
- Short description
- Optional crop, property or environmental context

The submission enters AAB as an **UNVERIFIED FIELD OBSERVATION**.

It is not automatically scientific evidence, an accepted fact, canonical memory, a diagnosis or a recommendation.

### 2.2 Controlled trial observation

An authorised agronomist, scientist or trial professional records observations within a governed trial created by an approved institution.

The observation is bound to:

- Trial and protocol
- Plot, treatment and control
- Observer identity and authority
- Time and location
- Measurement method and units
- Instrument or collection method
- Environmental conditions
- Protocol deviations
- Provenance, corrections and review state

A controlled trial observation remains subject to scientific review and evidence-admission requirements.

---

## 3. Canonical observation chain

The governed pathway for farmer and community observations is:

```
farmer/community upload
        ↓
governed intake
        ↓
quarantine and provenance checks
        ↓
qualified human triage
        ↓
automated brain analysis
        ↓
scientist review
        ↓
possible evidence admission
        ↓
possible later learning or memory promotion
```

For controlled trials, the pathway begins within the governed CAP-08 trial context, but scientific admission, brain analysis and learning promotion remain separately controlled.

Note: automated file validation, malware scanning, metadata extraction and privacy checks may occur during intake. That is not scientific brain reasoning. Scientific brain analysis begins only after the observation passes the required intake and human-triage gates.

---

## 4. Capability responsibilities

### CAP-36 — Governed Observation and Field Evidence

*CAP-36 Governed Observation and Field Evidence is proposed. It is not canonical until the ten-point identity checklist is completed. This document records its intended responsibility pending that process.*

Owns:
- Simple field-observation capture
- Contributor authority and permission
- Location and privacy handling
- Media integrity
- Provenance
- Quarantine
- Triage state
- Withdrawal and retention status where applicable

### CAP-35 — Evidence Watch

*CAP-35 Evidence Watch is a named candidate. It has no canonical contract. This document records its intended responsibility pending that contract.*

Owns:
- Monitoring eligible observation streams
- Detecting new or changed evidence
- Identifying patterns, anomalies and reassessment needs
- Producing governed machine-generated signals

It does not admit evidence or approve scientific conclusions.

### CAP-04 — Evidence and Memory Admission

Owns:
- Scientific admissibility
- Provenance sufficiency
- Evidence classification
- Admission into governed scientific memory
- Rejection, correction, supersession and withdrawal handling

An uploaded photograph cannot bypass CAP-04.

### CAP-05 — Evidence Reasoning

Owns:
- Contradiction detection
- Evidence-gap identification
- Relationship and mechanism analysis
- Candidate explanations
- Confidence and uncertainty representation

It does not manufacture missing facts or silently resolve contradictions.

### CAP-08 — Controlled Trials and Outcomes

Owns:
- Trial creation
- Protocol and treatment structure
- Authorised trial observers
- Trial measurements and observations
- Outcomes
- Deviations
- Trial-specific review and approval states

CAP-08 must not absorb the general farmer/community upload pathway. It must reference the shared observation, evidence and brain-governance boundaries established in this document.

---

## 5. Corrected brain boundary

AAB brains are **permitted to operate automatically**.

They **may**:

- Process eligible evidence
- Compare observations
- Detect patterns and anomalies
- Maintain temporary computational state, separately from governed scientific records
- Generate signals
- Form candidate hypotheses
- Identify contradictions and knowledge gaps
- Propose reassessment
- Suggest possible investigations

All automated outputs must be:

- Clearly labelled as machine-generated
- Linked to their source evidence
- Versioned
- Timestamped
- Explainable to the level required by the capability
- Reproducible where technically possible
- Accompanied by uncertainty and limitations
- Subject to rejection, correction or supersession
- Separated from accepted scientific conclusions and canonical memory

AAB brains **must not** automatically:

- Manufacture facts
- Conceal or silently resolve contradictions
- Convert observations into accepted evidence
- Promote hypotheses into scientific conclusions
- Approve trials or treatments
- Create operational authority
- Promote outputs into canonical learning or memory
- Bypass scientist, institution, country or governance authority
- Use quarantined observations for training or persistent learning without explicit authorisation

---

## 6. Internal machine state versus governed scientific state

A brain may automatically change its internal working state while reasoning.

That state must not be confused with governed scientific truth.

Any persistent belief, confidence or reasoning state must be:

- Versioned rather than silently overwritten
- Traceable to evidence and prior state
- Identified as machine state
- Reversible or supersedable
- Prevented from acquiring authoritative status without the required human decision

---

## 7. Consent, authority and privacy

Contributor consent does not by itself establish scientific admissibility.

AAB must separately establish:

- Authority to submit the observation
- Permission to photograph the location
- Permitted research and retention purposes
- Appropriate geolocation precision and visibility
- Treatment of people, vehicles and neighbouring properties in media
- Commercial and property confidentiality
- Permitted institutional access
- Withdrawal and deletion limitations
- Whether the observation may be used for model improvement or learning

Transformation, feature extraction or embedding generation does not remove these protections.

---

## 8. Fail-closed requirements

A field observation must remain quarantined when:

- Contributor authority is unresolved
- Consent or permitted use is unclear
- Provenance is incomplete
- Location handling is unsafe
- Sensitive content has not been reviewed
- Scientific context is insufficient
- Required evidence is missing

Missing evidence must produce:

**EVIDENCE REQUIRED**

It must never be treated as likely compliant or scientifically accepted.

---

## 9. Authority statement

Automated reasoning does not confer scientific authority.

AAB may think automatically. Its outputs acquire governed status only through the applicable evidence, scientific, institutional, country and governance decisions.

**Automate reasoning, govern its outputs.**

---

*This document was approved in governance session 2026-09-29. Every capability contract and brain implementation should cite it. It is a platform rule, not a domain workstream document, and is held in `governance/`.*
