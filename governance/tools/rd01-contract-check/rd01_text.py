"""The RD-01 platform amendment texts, derived mechanically from the approved draft.

The approved draft (revision 4) is committed verbatim at APPROVED_DRAFT. Its sections 1 and
1a to 1d hold the approved amendment texts for AAB-PLATFORM-07, 06, 08, 10 and 05 as block
quotes. `amendment_text(contract)` returns the exact section each contract must contain:
the block quote with its "> " markers removed, "[date]" set to the approval date, and only the
editorial adjustments declared in EDITS, each of which is disclosed in the approval record.
"""
from pathlib import Path

APPROVED_DRAFT = "governance/reviews/RD-01-AAB-PLATFORM-07-AMENDMENT-DRAFT-2026-10-03-r4.md"
APPROVED_SHA256 = "da9a41aac8feb6e41849d2c16fd5896cd1213b0bb466f13d11f722f13ca346b2"
APPROVAL_DATE = "2026-10-03"

# Where each contract's approved block sits in the draft: (first line of the block's section, the next section).
BLOCKS = {
    "AAB-PLATFORM-07": ("## 1. Proposed amendment text: AAB-PLATFORM-07", "### 1a. Consequential text: AAB-PLATFORM-06"),
    "AAB-PLATFORM-06": ("### 1a. Consequential text: AAB-PLATFORM-06", "### 1b. Consequential text: AAB-PLATFORM-08"),
    "AAB-PLATFORM-08": ("### 1b. Consequential text: AAB-PLATFORM-08", "### 1c. Consequential clarification: AAB-PLATFORM-10"),
    "AAB-PLATFORM-10": ("### 1c. Consequential clarification: AAB-PLATFORM-10", "### 1d. Consequential text: AAB-PLATFORM-05"),
    "AAB-PLATFORM-05": ("### 1d. Consequential text: AAB-PLATFORM-05", "### 1e. Invalidation, supersession, withdrawal, deletion, and the rest"),
}

RECORD_LINE = (
    "**Approved draft:** `" + APPROVED_DRAFT + "`, SHA-256 `" + APPROVED_SHA256 + "`; "
    "its approval and review history: `governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md`."
)
CONSEQUENTIAL_LINE = (
    "**Consequential to AAB-PLATFORM-07's amendment of " + APPROVAL_DATE + "** (finding RD-01 of the retrospective decision "
    "cross-review), and approved with it by the Platform Owner in review on " + APPROVAL_DATE + ". " + RECORD_LINE
)

# The declared editorial adjustments: (contract, kind, old, new). Nothing else differs from the approved text.
EDITS = [
    # E1: the draft's own section labels mean nothing inside a contract.
    ("AAB-PLATFORM-07", "replace",
     "which AAB-PLATFORM-05 and 08 carry (sections 1b and 1d).",
     "which AAB-PLATFORM-05 and 08 carry (their amendments of " + APPROVAL_DATE + ")."),
    # E2: the approved AAB-PLATFORM-05 text has no heading of its own.
    ("AAB-PLATFORM-05", "prepend",
     None,
     "## Amendment of " + APPROVAL_DATE + ": the admission basis on resolved citations, and the reliance-closure assessment\n\n"
     + CONSEQUENTIAL_LINE + "\n"),
    # E3: traceability, after the heading of each consequential amendment.
    ("AAB-PLATFORM-06", "after_heading", None, CONSEQUENTIAL_LINE),
    ("AAB-PLATFORM-08", "after_heading", None, CONSEQUENTIAL_LINE),
    ("AAB-PLATFORM-10", "after_heading", None, CONSEQUENTIAL_LINE),
    # E4: traceability, after AAB-PLATFORM-07's "Why" paragraph.
    ("AAB-PLATFORM-07", "after_paragraph",
     "**Why.** A member of a snapshot is an admitted record.",
     RECORD_LINE),
]


def block(draft_text, contract):
    start, end = BLOCKS[contract]
    i = draft_text.index(start)
    j = draft_text.index(end, i)
    lines = []
    for line in draft_text[i:j].split("\n"):
        if line.startswith("> "):
            lines.append(line[2:])
        elif line == ">":
            lines.append("")
    while lines and lines[-1] == "":
        lines.pop()
    return "\n".join(lines).replace("[date]", APPROVAL_DATE)


def amendment_text(draft_text, contract):
    text = block(draft_text, contract)
    for c, kind, old, new in EDITS:
        if c != contract:
            continue
        if kind == "replace":
            if text.count(old) != 1:
                raise ValueError(f"{contract}: edit target found {text.count(old)} times")
            text = text.replace(old, new)
        elif kind == "prepend":
            text = new + "\n" + text
        elif kind == "after_heading":
            head, rest = text.split("\n", 1)
            text = head + "\n\n" + new + "\n" + rest
        elif kind == "after_paragraph":
            k = text.index(old)
            e = text.index("\n\n", k)
            text = text[:e] + "\n\n" + new + text[e:]
    return text


def read_draft(repo_root):
    return (Path(repo_root) / APPROVED_DRAFT).read_bytes().decode("utf-8")
