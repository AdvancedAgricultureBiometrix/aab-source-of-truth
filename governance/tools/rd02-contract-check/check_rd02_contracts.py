"""Check the RD-02 Stage 1 contract text against the approved draft.

Usage (from the repository root):
    python governance/tools/rd02-contract-check/check_rd02_contracts.py

It proves that:
  1. the approved draft, the decision sheet and the decided record are the approved files, by SHA-256;
  2. AAB-PLATFORM-11 is, byte for byte, its derivation from the approved draft (rd02_text.py);
  3. each consequential amendment in AAB-PLATFORM-03, 05 and 08 is, byte for byte, its derivation;
  4. each of those three contracts, with its amendment (and, for AAB-PLATFORM-05, its Amended: extension)
     removed, is byte-identical to its text at main 8eb12c0 (by SHA-256);
  5. every declared edit was applied exactly the checked number of times, and no PROPOSED label remains;
  6. the approval record carries every hash and both approval statements; its Stage 1 quotation equals the
     committed statement file (by SHA-256 and text), and the contract's interpretation is that statement's;
  7. the roadmap and the stock-take each carry the RD-02 status line exactly once, and never mark RD-02 closed.

This verifies contract TEXT only. It is not implementation proof.
"""
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(Path(__file__).resolve().parent))
import rd02_text as R  # noqa: E402

STATUS = "CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN"
AMENDED = {
    "AAB-PLATFORM-03": ("governance/AAB-PLATFORM-03-ACTOR-REFERENCE-CANONICAL-CONTRACT-2026-09-27.md",
                        "a987c015ff6cb187560432ba710461117b11834047c8f143fc81e4245062b2cd"),
    "AAB-PLATFORM-05": ("governance/AAB-PLATFORM-05-GOVERNED-PROVENANCE-CANONICAL-CONTRACT-2026-09-27.md",
                        "4055bb7aa37cc50a88f0ef6963c9027f23d572e3c1c7bf1896a3be3fa96c9632"),
    "AAB-PLATFORM-08": ("governance/AAB-PLATFORM-08-ATTRIBUTABLE-HUMAN-REVIEW-WITH-CURRENCY-CANONICAL-CONTRACT-2026-09-28.md",
                        "efff21a0b46e9f61819796659a2ffb0b0e55c8df53107429c9371d2a545c0121"),
}
P05_AMENDED_EXTENSION = "; and 2026-10-03 (service registration and its record kinds, with AAB-PLATFORM-11)"
# The number of times each declared edit applies: any change to the derivation changes these.
EXPECTED_COUNTS = {
    ("E1", "AAB-PLATFORM-11"): 1, ("E1", "AAB-PLATFORM-03"): 1, ("E1", "AAB-PLATFORM-05"): 1, ("E1", "AAB-PLATFORM-08"): 1, ("E1", "ANNEX_A"): 0,
    ("E2a~", "AAB-PLATFORM-11"): 3, ("E2b", "AAB-PLATFORM-11"): 28, ("E2b", "AAB-PLATFORM-03"): 3, ("E2c", "AAB-PLATFORM-11"): 5,
    ("E2d~", "AAB-PLATFORM-11"): 1, ("E2e", "AAB-PLATFORM-05"): 1, ("E2e", "AAB-PLATFORM-08"): 1, ("E2f", "AAB-PLATFORM-11"): 9,
    ("E2g", "ANNEX_A"): 12, ("E3a", "AAB-PLATFORM-11"): 1, ("E3b", "AAB-PLATFORM-11"): 1, ("E3c", "AAB-PLATFORM-11"): 1,
    ("E3d", "AAB-PLATFORM-11"): 1, ("E3e~", "ANNEX_A"): 1, ("E3f", "ANNEX_A"): 1, ("E3g~", "ANNEX_A"): 3, ("E3h", "ANNEX_A"): 1,
    ("E3i", "ANNEX_A"): 1, ("E4a", "AAB-PLATFORM-11"): 1, ("E4b", "AAB-PLATFORM-11"): 1, ("E4c", "AAB-PLATFORM-08"): 4,
    ("E4d", "ANNEX_A"): 1, ("E5a", "AAB-PLATFORM-11"): 1, ("E5b", "AAB-PLATFORM-03"): 1, ("E5b", "AAB-PLATFORM-05"): 1,
    ("E5b", "AAB-PLATFORM-08"): 1, ("E6a", "AAB-PLATFORM-11"): 1, ("E6b", "AAB-PLATFORM-11"): 1, ("E7", "AAB-PLATFORM-11"): 1,
    ("E8", "ANNEX_B"): 1,
}
APPROVAL_STATEMENTS = [
    "I explicitly approve RD-02 Decision Record revision 3, SHA-256 4303ceeee4693050958db71c405953ebeabcc4e7105c9a958be0002269958314, including (1) the refined I6 wording, and (2) the reinstatement rule. The record may be marked DECIDED with the approval date. This authorises drafting AAB-PLATFORM-11 revision 1 and its consequential amendments for review only, not committing contract text, implementation, extraction, system changes or closing RD-02.",
]
# The Platform Owner's Stage 1 approval statement, committed byte for byte.
STAGE1_STATEMENT = "governance/reviews/RD-02-STAGE1-APPROVAL-STATEMENT-2026-10-03.md"
STAGE1_STATEMENT_SHA256 = "771e201a66c429b94cfed5594a96f9338d97521384d69cc3254d07bef4667181"
STAGE1_HEADING = "**Stage 1** (Platform Owner, 2026-10-03). Source: `" + STAGE1_STATEMENT + "`, SHA-256 `" + STAGE1_STATEMENT_SHA256 + "`:"
INTERPRETATION_LEAD = "I also explicitly approve the following interpretation: "

passed = 0
failed = []


def check(ok, message):
    global passed
    if ok:
        passed += 1
    else:
        failed.append(message)


def raw(path):
    return (ROOT / path).read_bytes()


def sha(data):
    return hashlib.sha256(data).hexdigest()


# 1. the approved files
for path, digest in [(R.APPROVED_DRAFT, R.APPROVED_DRAFT_SHA256), (R.DECISION_SHEET, R.DECISION_SHEET_SHA256),
                     (R.DECIDED_RECORD, R.DECIDED_RECORD_SHA256)]:
    check(sha(raw(path)) == digest, f"{path}: SHA-256 is not the approved {digest}")
    check(b"\r" not in raw(path), f"{path}: contains carriage returns")
decided = raw(R.DECIDED_RECORD).decode("utf-8")
for needle in ["Revision 3, DECIDED", "**`DECIDED`, 2026-10-03.**", "approved by the Platform Owner, 2026-10-03"]:
    check(needle in decided, f"decided record lacks {needle!r}")

draft = R.read_draft(ROOT)
counts = {}

# 2. AAB-PLATFORM-11
contract = R.contract_text(draft, counts) + "\n"
check(raw(R.CONTRACT_PATH).decode("utf-8") == contract, f"{R.CONTRACT_PATH}: not equal to its derivation from the approved draft")
check(b"\r" not in raw(R.CONTRACT_PATH), f"{R.CONTRACT_PATH}: contains carriage returns")
check((ROOT / R.CONTRACT_PATH).with_suffix(".html").exists(), "AAB-PLATFORM-11 has no rendering")

# 3 and 4. the consequential amendments, and nothing else changed
for name, (path, base_digest) in AMENDED.items():
    text = raw(path).decode("utf-8")
    section = R.amendment_text(draft, name, counts)
    check(text.count(section + "\n") == 1, f"{path}: the {name} amendment does not appear exactly once, as derived")
    restored = text.replace("\n" + section + "\n", "", 1)
    if name == "AAB-PLATFORM-05":
        check(restored.count(P05_AMENDED_EXTENSION) == 1, f"{path}: Amended: extension missing")
        restored = restored.replace(P05_AMENDED_EXTENSION, "", 1)
    check(sha(restored.encode("utf-8")) == base_digest, f"{path}: changes beyond its amendment (base 8eb12c0 {base_digest})")
    check(b"\r" not in raw(path), f"{path}: contains carriage returns")

# 5. declared edits, and no label left
check(counts == EXPECTED_COUNTS or all(counts.get(k) == v for k, v in EXPECTED_COUNTS.items()),
      f"declared edit counts differ: {[(k, counts.get(k), v) for k, v in EXPECTED_COUNTS.items() if counts.get(k) != v]}")
for k, v in counts.items():
    if k not in EXPECTED_COUNTS:
        check(v == 0, f"edit {k} applied {v} times but is not in EXPECTED_COUNTS")
derived_all = contract + "".join(R.amendment_text(draft, n) for n in AMENDED)
check(not re.search(r"PROPOSED(?!_NOT_ADMITTED)", derived_all), "a PROPOSED label remains in contract text")
check("review item" not in derived_all, "a review-process reference remains in contract text")
check("[date]" not in derived_all, "a [date] placeholder remains")
check(R.INTERPRETATION in contract, "the approved interpretation is not in AAB-PLATFORM-11")

# 6. the approval record
record = raw(R.APPROVAL_RECORD).decode("utf-8")
for digest in [R.APPROVED_DRAFT_SHA256, R.DECISION_SHEET_SHA256, R.DECIDED_RECORD_SHA256, R.APPROVED_RECORD_REVISION_3_SHA256]:
    check(digest in record, f"approval record lacks {digest}")
for statement in APPROVAL_STATEMENTS:
    check(statement in record, f"approval record lacks the exact statement {statement[:60]!r}")
# The Stage 1 quotation equals the statement file, ignoring only the blockquote markers the record adds.
stmt_raw = raw(STAGE1_STATEMENT)
check(sha(stmt_raw) == STAGE1_STATEMENT_SHA256, f"{STAGE1_STATEMENT}: SHA-256 is not {STAGE1_STATEMENT_SHA256}")
check(b"\r" not in stmt_raw, f"{STAGE1_STATEMENT}: contains carriage returns")
stmt = stmt_raw.decode("utf-8")
check(record.count(STAGE1_HEADING) == 1, "approval record does not cite the Stage 1 statement's file and SHA-256 beside its quotation")
if STAGE1_HEADING in record:
    after = record[record.index(STAGE1_HEADING) + len(STAGE1_HEADING):].lstrip("\n").split("\n")
    quote = []
    for line in after:
        if line.startswith("> "):
            quote.append(line[2:])
        elif line == ">":
            quote.append("")
        else:
            break
    check("\n".join(quote) + "\n" == stmt, "the Stage 1 quotation in the approval record does not equal the statement file")
# The interpretation in the contract is the statement's, with only its backticks and its opening lower-case letter set aside.
if INTERPRETATION_LEAD in stmt:
    approved = stmt.split(INTERPRETATION_LEAD, 1)[1].split("\n", 1)[0].replace("`", "")
    check(approved[:1].upper() + approved[1:] == R.INTERPRETATION, "the contract's interpretation differs from the Stage 1 statement's")
else:
    check(False, "the Stage 1 statement carries no interpretation")
check("interpretation of revision 8, not text revision 8 contains" in record, "approval record does not identify the interpretation as such")
check(f"`{STATUS}`" in record, "approval record lacks the status")

# 7. the records
for path in ["governance/AAB-PLATFORM-ROADMAP-2026-09-27.md", "governance/AAB-STOCK-TAKE-2026-09-28.md"]:
    t = raw(path).decode("utf-8")
    check(t.count(f"**RD-02: `{STATUS}`**") == 1, f"{path}: RD-02 status line present {t.count(f'**RD-02: `{STATUS}`**')} times")
    check(not re.search(r"RD-02[^\n]{0,80}`CLOSED`", t), f"{path}: RD-02 marked CLOSED")

sys.stdout.reconfigure(encoding="utf-8")
print(f"RD-02 contract check: {passed} checks passed, {len(failed)} failed.")
for m in failed:
    print("FAIL", m)
print(f"This verifies contract TEXT only. It is not implementation proof: RD-02 remains `{STATUS}` until its implementation and tests pass.")
sys.exit(1 if failed else 0)
