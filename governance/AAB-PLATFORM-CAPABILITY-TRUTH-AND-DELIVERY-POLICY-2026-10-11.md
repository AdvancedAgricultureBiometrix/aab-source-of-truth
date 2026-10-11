# AAB Capability Truth and Delivery Policy — Governance Decision Record — 2026-10-11

**Internal reference:** AAB-GOV-DEC-CAPABILITY-TRUTH-01
**Version:** 1
**Status:** GOVERNANCE DECISION RECORD — APPROVED by the Platform Owner, 2026-10-11
**Decided by:** the Platform Owner
**Roadmap decision:** 73
**Applies to:** every AAB capability, component, record and statement, in every domain and repository, and every person and AI system that builds, tests, documents or describes AAB.
**Supplements:** `governance/AAB-PLATFORM-PURPOSE-AND-VALUES-REVISION-2026-09-25.md` ("Five maturity states", "Permanent platform values"); `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md` ("State labels"); `governance/development/PARALLEL-DEVELOPMENT-PROTOCOL-2026-10-02.md` (AAB-GOV-DEC-PARALLEL-DEVELOPMENT-01); `governance/AAB-PLATFORM-OBSERVATION-AND-BRAIN-GOVERNANCE-2026-09-29.md` (AAB-GOV-DEC-OBSERVATION-BRAIN-01).
**Authority:** ESTABLISHES HOW A CLAIM ABOUT WHAT AAB CAN DO IS EVIDENCED, CLASSIFIED, CHALLENGED, RECORDED AND CLOSED. It changes no capability's state label, and no admission, Gate D, commissioning or activation status, contract, enum or gate. It grants no person or AI system any authority. It does not define reviewer independence or appoint a reviewer. It authorises no implementation.

## 1. The principle

**AAB must demonstrably do what it claims to do.** Progress is measured by demonstrated, technically and scientifically defensible capability, not by the volume of code, documents, architecture or tests. No AI-generated statement, architectural description, passing test count, earlier summary or earlier approval substitutes for demonstrated behaviour. Where a capability is missing, what is required to make it real is identified, implemented under governance, and verified before success is claimed.

## 2. Rules

1. **A claim needs evidence.** A statement that an AAB capability, or an aspect of one, works is supported by the evidence that section 3 requires. Without that evidence, it is described as a claim, never as a fact.
2. **Tests prove what they examine.** Passing tests establish only the behaviour those tests examine, in their environment, on their data.
3. **Simulation is not capability.** A simulation is never presented as operational, scientific or regulatory intelligence. Keyword matching, rule-checking and workflow automation are never presented as scientific reasoning.
4. **Aspects are assessed separately.** A capability is assessed aspect by aspect (for example its interface, rules, data, scientific method and security). One working aspect never makes a capability complete.
5. **The state labels stay the authority.** Each capability's state label (roadmap, "State labels") remains the single canonical record of its state. This policy adds evidence records beside the labels. It adds no maturity ladder, and changes no label, enum or status except through the governance process that owns it (section 4.2).
6. **AI review is not independent verification.** Agreement between AI systems is not validation. Cross-review under the parallel development protocol (rule 7 there) is a process control, not verification. No aspect is recorded as independently verified until the conditions of section 4.1 are met.
7. **Evidence is never silently replaced.** Superseded evidence, findings and classifications remain retrievable. A replacement is recorded with the old and new versions, their digests, and the reason. This is the standing rule against silent replacement of qualification evidence that `governance/workstream-b/CAP-34-TEST-HARNESS-REPRODUCIBILITY-AMENDMENT-2026-09-20.md` cites; this record makes it canonical.
8. **Evidence currency is dependency-aware.** Each evidence record names what the claim depends on: code paths, data, configuration, records and external services. A material change to a dependency requires re-verification before the claim is relied on. Where it is uncertain whether a change is material, the claim is flagged for review, never silently accepted. A change judged non-material is recorded with its reasoning (section 4).
9. **Anyone may challenge; only governance may reclassify.** Any person or AI system may submit evidence that challenges a classification. Contradictory evidence flags the claim `DISPUTED` as soon as it is recorded. Only the governance process of section 5 alters a canonical classification. A disputed claim is not used affirmatively until it is resolved.
10. **Acceptance criteria are fixed before the work.** They are recorded before implementation, falsifiable, and changed only by a recorded decision, never quietly to make a test pass.
11. **No unsupported public claim.** AAB makes no affirmative claim of operational or scientific capability, in any public, partner, investor or external material, without current supporting evidence. An unsupported statement is qualified, withheld, or referred for correction through authorised change control. Material outside this repository is corrected under that material's own change control.
12. **Failure is preserved.** Failed tests, contradictory findings, infeasible approaches and unresolved technical limitations are recorded and kept, with their evidence and the evidence that would be required to reopen a rejected approach (section 6). A failed verification is never deleted, hidden or recast as a success.
13. **A gap needs a path.** Every material gap has a gap record (section 6), with an actionable resolution path or an explicit statement of why resolution is not yet feasible. A delivery plan is never invented to fill the record.
14. **Smallest demonstrable outcome first.** New architecture needs a stated requirement and an observable outcome. Closing a demonstrated gap takes priority over speculative design. A component with no requirement, or one that duplicates another, is proposed for simplification or retirement by decision, never removed silently.
15. **Boundaries are unchanged.** Read-only, advisory-only, fail-closed and human scientific, governance and regulatory authority apply wherever they apply today. This policy relaxes none of them, and nothing in it is a waiver.

## 3. Evidence

An evidence record for a claim states each of the following separately:

| Field | What it records |
|---|---|
| Source location | The repository, the exact commit, and the entry point exercised |
| Dependencies | The code paths, data, configuration, records and external services the claim relies on |
| Dataset origin | Where the data came from: its source, custodian, collection context and date range, or "generated", with the generator |
| Data nature | `OBSERVED` (collected from the world), `SYNTHETIC` (constructed), `DERIVED` (computed from other data; its inputs' nature stated) or `MIXED` (the parts stated). **Age is recorded separately:** historical data is observed data from the past, and is not assumed to differ from real-world data |
| Lawful-use restrictions | Licence, consent, confidentiality, personal-data and sovereignty conditions, and the purposes permitted. "Unknown" is recorded as unknown |
| Test environment | Where it ran: local, continuous integration, rehearsal or other, with versions. A live or production environment only where separately authorised |
| Verification method | For example an automated test, a reproducible re-run, code inspection, a manual walkthrough, or expert scientific review |
| Verifier | Who verified it: the AI system by name, the automated CI run by identifier, or the human by name and role, with independence stated only as section 4.1 allows |
| Cases | The positive, negative and boundary cases covered, and the cases not covered |
| Result and limitations | What was observed, what failed, and what remains unsupported |

## 4. Evidence classification of an aspect

Each assessed aspect carries one evidence class and one currency state.

| Evidence class | Meaning |
|---|---|
| `DESIGN_ONLY` | Requirements or a contract exist; nothing executable performs the aspect |
| `SIMULATION` | Synthetic or simplified behaviour that does not perform the intended real capability |
| `PARTIALLY_IMPLEMENTED` | Real code performs some of the aspect; essential parts are missing |
| `IMPLEMENTED_UNVERIFIED` | Code exists; the testing done is insufficient to show the aspect |
| `TESTED_LIMITED` | Behaviour reproduced within stated boundaries, by stated tests, on stated data |
| `INDEPENDENTLY_VERIFIED` | Verified under section 4.1 for the stated aspect and scope only |

| Currency state | Meaning |
|---|---|
| `CURRENT` | No material change to a declared dependency since verification, or each change recorded as non-material, with reasoning |
| `REVERIFICATION_REQUIRED` | A declared dependency changed materially. The claim is not relied on until re-verified |
| `IMPACT_UNDER_REVIEW` | A change whose effect on the claim is uncertain. The claim is flagged, and not relied on affirmatively until reviewed |

Separately from the currency state, a claim may carry the flag `DISPUTED` (rule 9).

### 4.1 Independent verification

No aspect is classified `INDEPENDENTLY_VERIFIED` until all of these are established under the applicable governance decisions:
- the reviewer's independence, by criteria decided (open decisions 8 and 19 of the stock-take);
- the reviewer's qualifications for the aspect;
- the scope of the verification;
- the reviewer's signed findings, recorded in the repository.

Independent verification of an aspect is not admission, Gate D qualification, commissioning or activation, and never implies them.

### 4.2 Relation to existing vocabularies (advisory)

The table below is **advisory only**. An evidence class never promotes or demotes a capability's state label, CAP-20 status, CAP-34 fidelity, admission status, or any other canonical state. Each of those changes only through the process that owns it.

| Evidence class | Usually consistent with (roadmap label) | Other existing vocabularies |
|---|---|---|
| `DESIGN_ONLY` | `named only`, `designed` | CAP-20 `NOT_IMPLEMENTED`; CAP-34 `CONCEPT_PREVIEW_NOT_IMPLEMENTED`, `NOT_YET_REPRESENTED`; System Definition "architecturally present" |
| `SIMULATION` | (a simulation never raises a label) | CAP-34 `REAL_LOGIC_SYNTHETIC_REFERENCE_DATA`, `PARTIAL_REAL_LOGIC_LIMITATIONS_SHOWN` |
| `PARTIALLY_IMPLEMENTED`, `IMPLEMENTED_UNVERIFIED` | `implemented` | CAP-20 `IMPLEMENTED_NOT_YET_PROVEN`; System Definition "implemented and connected" |
| `TESTED_LIMITED` | consistent with `behaviourally proven` for the operations tested | CAP-20 `IMPLEMENTED_AND_PROVEN`; System Definition "populated with controlled evidence" and "successfully rehearsal-tested", by data nature and environment |
| `INDEPENDENTLY_VERIFIED` | none; an input to the admission authority | — |

**Inconsistency is a finding, not a correction.** Where an evidence class and a canonical state appear inconsistent, the inconsistency is reported to the owning process. It is not corrected by this policy.

## 5. Changing a classification

1. **Submitting:** anyone, human or AI, may submit evidence for or against a classification, by a change proposed in the repository or a finding reported to the Platform Owner.
2. **Flagging:** evidence that contradicts a recorded claim is recorded with the flag `DISPUTED` as soon as it is received. Flagging is not reclassification. The flag is an immediate warning against relying on the challenged claim; it gives no authority to change any canonical record outside the governance process.
3. **Deciding:** only the authorised governance process alters a canonical classification. That process is a reviewed change merged under the pull request rule on the Platform Owner's instruction. Where the claim bears on admission, Gate D, commissioning or activation, it is that authority's process.
4. **Recording the outcome:** a resolved dispute is recorded with its evidence and outcome. The superseded classification remains retrievable (rule 7).

## 6. Gap records and failed verification

**A gap record states:**
- A. the intended capability;
- B. the observed implementation;
- C. the gap analysis (missing algorithms, methods, data, infrastructure, integrations, controls, tests, expertise and other dependencies);
- D. the delivery requirements, sequence and dependencies;
- E. acceptance criteria: observable, falsifiable, fixed before the work;
- F. the independent verification needed;
- G. the limitations that will remain;
- H. feasibility, indicative effort and skills, with estimates marked as estimates and measured facts as facts.

Where no credible solution is yet identified, it says so.

**A failure record** keeps a failed test, a contradictory finding, an infeasible approach or an unresolved limitation. It states what was attempted, the evidence, the result, and the evidence or change that would be required to reopen it.

## 7. Scientific capability

Scientific intelligence is assessed separately from regulatory rule-checking, keyword matching and workflow automation, against these assessment objectives:
- interpreting evidence and experimental context;
- preserving provenance, methods, units and uncertainty;
- distinguishing genuine contradictions from differences in conditions;
- identifying missing evidence without unsupported conclusions;
- producing reproducible, traceable assessments;
- supporting investigation without assuming decision authority;
- demonstrating utility against suitable independent reference cases.

These are objectives, not claims that the capabilities exist. Scientific validation requires appropriately qualified domain experts and suitable datasets usable lawfully under section 3.

## 8. Where evidence is recorded

Until a capability reality register is established by a separately approved change, an evidence record, gap record or failure record is kept in the pull request, proof record or governance record that makes or relies on the claim, with the fields of section 3.

## 9. What this record does not do

- It admits, qualifies, commissions or activates nothing.
- It changes no state label, status, contract, enum or gate.
- It does not establish the capability reality register, automated checks or any capability.
- It does not define reviewer independence or appoint a reviewer; open decisions 8 and 19 remain open.
- It does not claim that any capability described in section 7 exists.
