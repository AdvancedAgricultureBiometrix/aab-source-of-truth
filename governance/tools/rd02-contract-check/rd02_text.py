"""The RD-02 contract texts, derived mechanically from the approved draft.

The approved draft (revision 8) is committed verbatim at APPROVED_DRAFT. Its section 1 holds the
approved text of AAB-PLATFORM-11 and of the consequential amendments to AAB-PLATFORM-03, 05 and 08,
as block quotes; its section 2 holds the approved provisions P1 to P12, and its section 3 the
approved classification A7. `contract_text()` and `amendment_text(contract)` return the exact text
each contract must contain: the block quote with its "> " markers removed, and only the editorial
adjustments declared in EDITS, each applied an exact, checked number of times, and each disclosed in
the approval record.
"""
import re
from pathlib import Path

APPROVED_DRAFT = "governance/reviews/RD-02-AAB-PLATFORM-11-DRAFT-2026-10-03-r8.md"
APPROVED_DRAFT_SHA256 = "36b7eab6208155c46f0febd4022d1b4b584901eea867ccd045d157933c58e10e"
DECISION_SHEET = "governance/reviews/RD-02-AAB-PLATFORM-11-DECISION-SHEET-r8.md"
DECISION_SHEET_SHA256 = "cc365e3eb3d59c67fe59f2cdaa5f3b004d2b110bcd30d7332440f48adb622735"
DECIDED_RECORD = "governance/reviews/RD-02-DECISION-RECORD-2026-10-03.md"
DECIDED_RECORD_SHA256 = "dcf08444f997e7698838d24a0ec54ecc837b7e9b310da27601fe691783e63dce"
APPROVED_RECORD_REVISION_3_SHA256 = "4303ceeee4693050958db71c405953ebeabcc4e7105c9a958be0002269958314"
APPROVAL_RECORD = "governance/reviews/RD-02-AAB-PLATFORM-11-APPROVAL-RECORD-2026-10-03.md"
APPROVAL_DATE = "2026-10-03"
CONTRACT_PATH = "governance/AAB-PLATFORM-11-GOVERNED-AUTHORITY-GRANTS-CANONICAL-CONTRACT-2026-10-03.md"

INTERPRETATION = (
    "If a refounding attempt fails after its FOUNDING_CEREMONY_RECORD has been written, RECONSTITUTION_IN_PROGRESS "
    "remains in force. Every existing and replacement GRANT_AUTHORITY grant in that country remains fail-closed and "
    "unusable until a later valid refounding reaches RECONSTITUTION_COMPLETED. Failure does not restore prior authority, "
    "permit a fallback to legacy authority or give AAB power to resolve the condition."
)

LABEL = "[PROPOSED — PLATFORM OWNER DECISION REQUIRED]"
TRACE = (
    "**Approved draft:** `" + APPROVED_DRAFT + "`, SHA-256 `" + APPROVED_DRAFT_SHA256 + "`; decision sheet `"
    + DECISION_SHEET + "`, SHA-256 `" + DECISION_SHEET_SHA256 + "`; approval and review history: `" + APPROVAL_RECORD + "`."
)

# Where each block sits in the draft: (first line of the block, the line that ends it).
BLOCKS = {
    "AAB-PLATFORM-11": ("## 1. Proposed contract text: AAB-PLATFORM-11 Governed Authority Grants", "### 1a. Consequential text: AAB-PLATFORM-03"),
    "AAB-PLATFORM-03": ("### 1a. Consequential text: AAB-PLATFORM-03", "### 1b. Consequential text: AAB-PLATFORM-05"),
    "AAB-PLATFORM-05": ("### 1b. Consequential text: AAB-PLATFORM-05", "### 1c. Consequential text: AAB-PLATFORM-08"),
    "AAB-PLATFORM-08": ("### 1c. Consequential text: AAB-PLATFORM-08", "## 2. Proposals for decision"),
}
ANNEX_A = ("### P1. The founding sequence", "---\n\n## 3. Conflicts and ambiguities")
ANNEX_B = ("- **A7. CAP-07's composition access grant.**", "- **A8. ")

CITATIONS = """
**Citation forms used in this contract** (`path:line`, at `main` `8eb12c0`):
- P03 = `governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md`
- P05 = `governance/AAB-PLATFORM-05-GOVERNED-PROVENANCE-CANONICAL-CONTRACT-2026-09-27.md`
- P07 = `governance/AAB-PLATFORM-07-FROZEN-EVALUATION-SNAPSHOTS-CANONICAL-CONTRACT-2026-09-28.md`
- P08 = `governance/AAB-PLATFORM-08-ATTRIBUTABLE-HUMAN-REVIEW-WITH-CURRENCY-CANONICAL-CONTRACT-2026-09-28.md`
- P09 = `governance/AAB-PLATFORM-09-GOVERNED-PUBLIC-KEY-REGISTRY-CANONICAL-CONTRACT-2026-09-28.md`
- PLAT10 = `governance/AAB-PLATFORM-10-CANONICAL-SERIALISATION-AND-CRYPTOGRAPHIC-DIGESTS-CANONICAL-CONTRACT-2026-10-02.md`
- SEP = `governance/AAB-PLATFORM-DOMAIN-SEPARATION-DECISION-2026-09-25.md`
- RM = `governance/AAB-PLATFORM-ROADMAP-2026-09-27.md`
- ST = `governance/AAB-STOCK-TAKE-2026-09-28.md`
- CAP-nn = `governance/workstream-b/CAP-nn-…-CANONICAL-CONTRACT-….md`
- D1 to D8, and I1 to I6: the RD-02 decision record (`""" + DECIDED_RECORD + """`)
- P1 to P12: Annex A of this contract
"""

DISCLOSED = """## Disclosed consequences

- **A failed refounding.** Approved interpretation of the approved draft (revision 8), recorded in the approval record; it is not text that revision 8 contains:

  > """ + INTERPRETATION + """
- **A small country's grant authority can be frozen by a challenge** until its own governance reconstitutes it (Annex A, P12; §10.5). AAB never resolves it (I6).

"""

# The declared editorial adjustments, in the order applied: (id, block, old, new, expected count).
# "~" in id marks a regular-expression edit. Nothing else differs from the approved text.
EDITS = [
    # E1: the approval date.
    ("E1", "*", "[date]", APPROVAL_DATE, None),
    # E2: the PROPOSED labels, resolved as decided (decision sheet revision 8, all 61 items approved).
    ("E2a~", "*", r"(?m)^\*\[PROPOSED — PLATFORM OWNER DECISION REQUIRED\]\*\n\n?", "", None),
    ("E2b", "*", " *" + LABEL + "*", "", None),
    ("E2c", "*", "*" + LABEL + "* ", "", None),
    ("E2d~", "AAB-PLATFORM-11", r"(?m)^\*\*Every name and field in this section is \[PROPOSED — PLATFORM OWNER DECISION REQUIRED\]\.\*\*\n\n", "", 1),
    ("E2e", "*", " **Every point is " + LABEL + ".**", "", None),
    ("E2f", "*", " (PROPOSED)", "", None),
    ("E2g", "ANNEX_A", " — PROPOSED — PLATFORM OWNER DECISION REQUIRED", "", 12),
    # E3: references to the review process, which mean nothing inside a contract.
    ("E3a", "AAB-PLATFORM-11", "(§4.4; review item 14)", "(§4.4)", 1),
    ("E3b", "AAB-PLATFORM-11", "**Independence** (review item 3):", "**Independence:**", 1),
    ("E3c", "AAB-PLATFORM-11", "**Existing grant authority** (review item 2).", "**Existing grant authority.**", 1),
    ("E3d", "AAB-PLATFORM-11", " (A13)", "", 1),
    ("E3e~", "ANNEX_A", r"(?m)^\*\((?:Revision 2's review item 2, settled by revision 3's review item 2|Revision 2's review items? [^)]*|Review item 12)\.\)\*\n\n", "", None),
    ("E3f", "ANNEX_A", "*(Revision 3's review item 3.)* ", "", 1),
    ("E3g~", "ANNEX_A", r" \(review items? \d+\)", "", None),
    ("E3h", "ANNEX_A", "Rejected: it creates the appointment relationship that revision 2 had to except from §4.7.",
     "Rejected: it would create an appointment relationship that §4.7 forbids.", 1),
    ("E3i", "ANNEX_A", "**Option rejected:** revision 2's class-based split (refusal for some grants, protective suspension for others). It was inconsistent with §5.1.",
     "**Option rejected:** a class-based split (refusal for some grants, protective suspension for others), inconsistent with §5.1.", 1),
    # E4: references to the draft's own sections, read as the contracts they became.
    ("E4a", "AAB-PLATFORM-11", "section 1a", "AAB-PLATFORM-03, amendment of " + APPROVAL_DATE, None),
    ("E4b", "AAB-PLATFORM-11", "section 1c", "AAB-PLATFORM-08, amendment of " + APPROVAL_DATE, None),
    ("E4c", "AMENDMENTS", "AAB-PLATFORM-11, P", "AAB-PLATFORM-11, Annex A, P", None),
    ("E4d", "ANNEX_A", "(section 1a, point 2)", "(AAB-PLATFORM-03, amendment of " + APPROVAL_DATE + ", point 2)", 1),
    # E5: traceability.
    ("E5a", "AAB-PLATFORM-11", "\n**Depends on**", "\n" + TRACE + "\n**Depends on**", 1),
    ("E5b", "AMENDMENTS", "(finding RD-02), approved with it.", "(finding RD-02), approved with it by the Platform Owner on " + APPROVAL_DATE + ". " + TRACE, 1),
    # E6: the dependencies and the draft's citation short forms, in a first section of their own (the
    # renderer shows nothing between the header fields and the first section).
    ("E6a", "AAB-PLATFORM-11", "\n**Depends on**:\n", "\n\n## Dependencies and citation forms\n\n**Depends on:**\n", 1),
    ("E6b", "AAB-PLATFORM-11", "\n## 1. Invariants", CITATIONS + "\n## 1. Invariants", 1),
    # E7: the approved interpretation, added to the contract's disclosed consequences.
    ("E7", "AAB-PLATFORM-11", "## What this contract does not establish", DISCLOSED + "## What this contract does not establish", 1),
]


def unquote(text):
    lines = []
    for line in text.split("\n"):
        if line.startswith("> "):
            lines.append(line[2:])
        elif line == ">":
            lines.append("")
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines)


def _slice(draft_text, start, end):
    i = draft_text.index(start)
    j = draft_text.index(end, i)
    return draft_text[i:j]


def _apply(text, block, counts):
    for eid, target, old, new, expected in EDITS:
        applies = (target == "*" or target == block
                   or (target == "AMENDMENTS" and block in ("AAB-PLATFORM-03", "AAB-PLATFORM-05", "AAB-PLATFORM-08")))
        if not applies:
            continue
        if eid.endswith("~"):
            n = len(re.findall(old, text))
            text = re.sub(old, new, text)
        else:
            n = text.count(old)
            text = text.replace(old, new)
        if expected is not None and n != expected:
            raise ValueError(f"{block}: edit {eid} applied {n} times, expected {expected}")
        counts[(eid, block)] = n
    return text


def annex_text(draft_text, counts):
    a = _slice(draft_text, *ANNEX_A).rstrip("\n")
    a = _apply(a, "ANNEX_A", counts)
    b = _slice(draft_text, *ANNEX_B).rstrip("\n")
    b = b.replace("- **A7. CAP-07's composition access grant.** *PROPOSED — PLATFORM OWNER DECISION REQUIRED (review item 8):*\n", "", 1)
    b = "\n".join(line[2:] if line.startswith("  ") else line for line in b.split("\n"))
    counts[("E8", "ANNEX_B")] = 1
    return ("## Annex A. Approved provisions P1 to P12\n\n"
            "Approved with this contract (decision sheet revision 8). References to P1 to P12 in this contract are to this annex.\n\n"
            + a + "\n\n"
            "## Annex B. CAP-07's composition access grant\n\n" + b)


def contract_text(draft_text, counts=None):
    counts = {} if counts is None else counts
    text = _apply(unquote(_slice(draft_text, *BLOCKS["AAB-PLATFORM-11"])), "AAB-PLATFORM-11", counts)
    # E8: the approved provisions P1 to P12 and the approved classification A7, as annexes.
    return text + "\n\n" + annex_text(draft_text, counts)


def amendment_text(draft_text, contract, counts=None):
    counts = {} if counts is None else counts
    return _apply(unquote(_slice(draft_text, *BLOCKS[contract])), contract, counts)


def read_draft(repo_root):
    return (Path(repo_root) / APPROVED_DRAFT).read_bytes().decode("utf-8")
