# AAB WA Staging — Post Version 66 Handover

## Status

- Sites project: `aab-wa-staging`
- User-facing staging URL: `https://wa-test.aab.ag`
- Preserved Sites checkpoint: version 66
- Checkpoint source commit: `a0b5adfd2ec1a5bb39391f2e9b6dd09fc6b1a1af`
- Canonical repository target: `AdvancedAgricultureBiometrix/aab-source-of-truth`
- Canonical target directory: `domains/discovery/wa-staging/`
- Supabase change required for this handover: **No**
- Approval state: source preserved; current FOGO experience is **not design-approved**

## Non-negotiable publication rules

- Preserve every validated version; never overwrite history.
- Publish through a dedicated branch and draft PR only.
- Never commit credentials, environment secrets, personal data, database files or raw logs.
- Supabase is the live database. Airtable is not used by this application.
- Do not create a Supabase migration unless the redesign genuinely requires one and it has explicit approval.
- No change without a WHY. No trial without an OUTCOME.
- Scientist remains the sole execution authority.

## Why work stopped

The previous chat began drifting between three different concerns:

1. governed spatial/environmental evidence;
2. product and market discovery;
3. scientist-owned formulation investigation requests.

FOGO-derived organics was incorrectly kept inside the same primary spatial experience used for Grain Crop Residues and Red Hill. Version 66 removed the compact Time Travel row from candidate-local maps, but that did not solve the architectural problem. Version 66 must therefore be treated as a preserved checkpoint, not an approved endpoint.

## Candidate-class distinction

### Spatial/environmental candidates

Grain Crop Residues and Red Hill may retain their governed spatial workflows where those workflows serve the evidence:

- authoritative boundaries;
- Landsat mosaics;
- QA-screened pixels;
- environmental records;
- forensic history;
- rainfall, temperature, frost, fire and flood when authoritative sources are connected;
- factual observations only, with user interpretation preserved.

### Product/material candidates

FOGO-derived organics and similar product/material candidates require a different primary experience. Their main journey must not be dominated by satellite imagery, pixel indexes, maps or Time Travel.

Premises location may remain as supporting provenance, but not as the centre of the investigation.

## Required FOGO/product discovery journey

### 1. Material and source

- authoritative source;
- published capacity clearly separated from actual throughput;
- composition and contamination;
- processing status;
- seasonal and dependable availability;
- provenance and unresolved evidence.

### 2. Current use and adoption

- who currently uses the material;
- which processors, businesses or industries use it;
- how usage is changing;
- current markets and competing uses;
- farming businesses or production systems where investigation could be relevant;
- clearly identify when authoritative usage/adoption data is not connected;
- never infer individual users from satellite imagery.

### 3. Farming contexts to investigate

- broadacre;
- horticulture;
- nurseries;
- rehabilitation;
- other evidence-supported contexts.

These are investigation contexts, not suitability or benefit claims.

### 4. Scientist-led future investigation

- one discovered primary candidate;
- one or many possible research interfaces;
- scientist selects investigation prompts;
- scientist supplies farming/production context;
- scientist supplies mandatory scientific WHY;
- scientist may supply expected measured outcomes;
- AAB provides governed prompts, not a completed formulation.

## Possible research interfaces currently shown

- Recovered glass-derived silica
- GS-Gel Polymer Base (AAB™)
- Polymer Crosslinker (AAB-XCL)
- Matrix Stabiliser Polymer (Xanthan-type)
- UE-CM Chelation Matrix
- AminoBoost™ L-Amino Complex
- Osmolyte + Betaine Extract
- Seaweed Bioactive Extract (Ascophyllum-type)

Recovered glass-derived silica is not an organic ingredient. Every interface must remain `INVESTIGATE_COMPATIBILITY_ONLY`.

## Portable request workflow

The current Potential tab can prepare and download a JSON Formulation Investigation Request. This local-download boundary must be preserved.

- Nothing is sent to AAB from Discovery.
- Nothing is persisted to Supabase from this action.
- No formulation is created.
- No trial is created or assigned.
- No inclusion rates are generated.
- The user saves each request to their own computer.
- A future Formulation Request page will accept typed requests or one-file-at-a-time uploads.
- Every uploaded file must be validated and displayed for scientist review before submission.

Required JSON separation:

```json
{
  "primary_candidate": {
    "name": "FOGO-derived organics",
    "role": "DISCOVERED_PRIMARY_CANDIDATE"
  },
  "selected_research_interfaces": [
    {
      "name": "Recovered glass-derived silica",
      "role": "INVESTIGATE_COMPATIBILITY_ONLY"
    }
  ]
}
```

One or many research interfaces are permitted. At least one is required by the current request builder.

Required generated sentence:

> Build an experimental formulation investigation using [primary candidate] as the primary candidate and investigate compatibility with [selected interfaces] in the stated farming or production context.

Required status:

`SCIENTIST-INITIATED · EXPERIMENTAL / UNVERIFIED`

Required governance flags:

- `formulation_created = false`
- `trial_created = false`
- `submitted_to_aab = false`
- `ingredient_inclusion_rates_present = false`
- `scientist_review_required = true`

## Language boundaries

Permitted:

- “AAB suggests investigating…”
- “possible research interface”
- “compatibility question”
- “evidence required”

Not permitted:

- “AAB recommends using…”
- “this material will improve…”
- “this combination is suitable…”

## Immediate next task

1. Read this handover before editing.
2. Inspect the preserved version 66 source; do not reconstruct from screenshots.
3. Redesign only the FOGO/product-material candidate journey around product and market discovery.
4. Remove the Grain/Red Hill-style spatial investigation as FOGO’s primary experience.
5. Keep premises location only as supporting provenance.
6. Preserve Grain Crop Residues and Red Hill workflows unless a separate approved task changes them.
7. Preserve and validate the local JSON request download.
8. Test one primary candidate with multiple selected research interfaces.
9. Increase typography throughout the FOGO experience to a readable desktop minimum.
10. Validate with controlled browser data and a new-window validation report.
11. Update this handover after the redesign.
12. Publish only through a dedicated branch and draft PR.

## Validation state at handover

- Sites build and artifact validation passed for version 66.
- Request preparation and download were manually tested.
- A downloaded request exposed and then corrected the primary-candidate versus research-interface ambiguity.
- No Supabase migration or data write was made for this feature.
- The next chat must validate the redesigned FOGO flow end to end before describing it as complete.
