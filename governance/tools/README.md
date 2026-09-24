# Canonical contract HTML rendering

Every AAB canonical contract is written in markdown, the authoritative source, and rendered to a print-ready A4 HTML document saved beside it with the same name and a `.html` extension.

| File | Role |
|---|---|
| `governance/canonical-contract-template.html` | The template. It is the single source of the document design (header band, status badge, details table, contents, clause numbering, field tables, footer). The renderer reads its CSS and layout, so a design change made here reaches every contract on the next render. |
| `governance/tools/render_canonical_contracts.py` | The renderer. It needs only the Python 3 standard library. |

## Render

```bash
python governance/tools/render_canonical_contracts.py
```

With no arguments it renders every `*CANONICAL-CONTRACT*.md` under `governance/`. Pass one or more paths to render only those files. Output is UTF-8 with LF line endings on every platform.

Re-render after any change to a contract's markdown or to the template. Never edit a generated `.html` by hand; each one says so in its first line.

## What the renderer reads from a contract

- **H1**: `# <REF> — <Title> — <Kind> — <YYYY-MM-DD>` (the form `# <REF> <Title> — <Kind> — <date>` is also accepted).
- **Header fields**: the `**Key:** value` lines directly under the H1, up to the first blank line. `Status` fills the Status row and decides the badge. Every other field (Domain, Scope, Authority, Resolves, Depends on, and bold notes) is shown word for word.
- **Body**: `##` sections become numbered sections (01, 02…). Each paragraph, list, table, quote or code block gets a clause number (`3.2`). A `###` sub-heading takes the next number in its section, and the blocks under it are numbered `3.4.1`, `3.4.2`…
- **TypeScript blocks**: `interface` and `type` declarations become field tables:
  - field names are in monospace;
  - enumerated values appear as a list;
  - nested objects are indented;
  - `// comments` become captions;
  - literal `true`/`false` boundary flags are highlighted;
  - provider methods show their parameters and return type.
- **Lists**: `-` and `1.` lists can nest. An item indented under another item becomes a sub-list inside it, at any depth. An indented line that is not an item continues the item above it. A blank line ends the list.
- **Other blocks**: a block that is an example value (`{ … }`) stays verbatim, labelled *Example value*. `json` and plain blocks stay verbatim. `mermaid` blocks are drawn as diagrams in the browser.

## Status badge rule

| Source `**Status:**` says | Badge |
|---|---|
| a contract that is not implemented (contains `CONTRACT` and `NOT IMPLEMENT…`) | `DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED` |
| `PROPOSED` and nothing stronger | `PROPOSED` |
| anything else | `UNMAPPED`, and the file is flagged |

The renderer never assigns `ADMITTED`. Admission needs its own governed decision, and the rule must be extended on purpose when the first contract is admitted. The version shows as *Not stated in source* unless the contract records one; no version is ever made up.

## Checks run on every render

The JSON report lists anything unexpected for each file, and the exit status is 1 if any report is non-empty. On each render the renderer checks that:

- every prose line of the source appears in the output text;
- every identifier, literal value and comment word in each TypeScript block appears in the output;
- no `{{PLACEHOLDER}}` is left unfilled;
- every code block is closed;
- the status maps to a badge by the rule above;
- any TypeScript block that cannot be parsed stays as verbatim code and is **reported, never guessed**. That is how the missing `Array<` in SCS-CAP-06 was found and then fixed in the source.

## Tests

```bash
python -m unittest governance/tools/test_render_canonical_contracts.py
```

The tests cover block parsing: nested lists, and inputs that once made the renderer loop forever or crash (nested and orphan indented list items, `####` lines, unclosed code blocks). Each case runs with a timeout, so a regression fails instead of hanging. After any change to the renderer, also re-render every contract and confirm that `git status` shows no `.html` changes unless a change was intended.

## Printing to PDF

Open the `.html` in Chrome or Edge while online (fonts and the diagram library load from public CDNs). Print → Save as PDF, paper A4, margins Default, and turn **off** "Headers and footers". Page 1 is the cover (header, details, contents). Every page carries `<REF> · Page n of N` on the left and "Adaptive Agricultural Brain — Governed Scientific Intelligence Infrastructure" on the right.

## Adding a new contract

1. Write the markdown in the usual contract form (H1, header fields, `##` sections). Include `CANONICAL-CONTRACT` in the file name.
2. Run the renderer and read the report. Resolve anything it lists in the markdown, not in the HTML.
3. Commit the `.md` and the `.html` together.
