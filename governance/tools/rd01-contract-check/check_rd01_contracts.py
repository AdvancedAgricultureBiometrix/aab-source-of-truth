"""Check the RD-01 contract resolution (Stage 1) against the approved draft.

Run from the repository root:  python governance/tools/rd01-contract-check/check_rd01_contracts.py

It checks contract TEXT only:
  1. the approved draft is committed byte for byte (its SHA-256);
  2. each platform amendment (AAB-PLATFORM-05, 06, 07, 08, 10) is present, once, and equals the
     approved text exactly, with only the editorial adjustments declared in rd01_text.EDITS;
  3. the normative identifiers and counts are stated: the ninth change kind, nine change kinds,
     eleven review triggers, the always-a-trigger rule, the AdmissionBasis shape, the six
     refusal codes, the reliance-closure assessment;
  4. every AGR contract, CAP-01 to CAP-12, has its adoption amendment, once, with the required
     elements, its count corrected where it had one, and its Amended line extended;
  5. the status wording `CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN` appears where
     required, and nothing marks RD-01 or an adoption's gap closed;
  7. the INCOMPLETE-closure rule, in every adoption (EVIDENCE REQUIRED; the row's notification
     unsatisfied; no completeness claim; reliance by completeness-requiring decisions barred;
     propagation not delayed; the other recipients still told; per-operation basis proof); the
     CAP-12 egress sentence; and, for CAP-01, CAP-04 and CAP-06 to CAP-12, that the role named for
     the capability's own records is the role its contract says resolves its held records;
  8. which holder is notified, in every adoption: the exact text, immediately after the recipient
     table, with each element (the specifically assigned or recorded, still-authorised actor;
     governors by scoped grant; never every holder, and no broadcast; an unresolved recipient is
     EVIDENCE REQUIRED; no guessed recipient or disclosure; propagation not delayed; the decider
     condition);
  6. notification, in every adoption (the reviewed Stage 1 adjustment): the timing rule, as exact
     text; the delivery wording; every recipient class mapped to a role or to "no role defined";
     the governor named for every stop-at-once edge; the audit role "no role defined" (CAP-30 is
     named only); "never conditions propagation"; every role named is defined in the contract it
     is attributed to, at the base; and no adoption still says "How quickly is not set".

It does NOT prove that anything is implemented, built or behaves as the contracts say. Contract
verification is not implementation proof: RD-01 stays open until Stage 2's tests pass.
Exit status 0 when every check passes, 1 otherwise.
"""
import glob
import hashlib
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import rd01_text as R  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
STATUS = "CONTRACT-RESOLVED — IMPLEMENTATION AND VERIFICATION OPEN"
D = R.APPROVAL_DATE
fails = []
passes = 0


def check(cond, msg):
    global passes
    if cond:
        passes += 1
    else:
        fails.append(msg)


def text(p):
    return Path(p).read_bytes().decode("utf-8")


def one(pattern):
    g = [p.replace("\\", "/") for p in glob.glob(pattern)]
    if len(g) != 1:
        fails.append(f"{pattern}: {len(g)} files")
        return None
    return g[0]


def section(t, heading):
    """The section that starts with `heading` and runs to the next level-2 heading."""
    i = t.find(heading + "\n")
    if i < 0:
        return None
    j = t.find("\n## ", i + len(heading))
    return t[i:] if j < 0 else t[i:j]


# 1. the approved draft
draft_bytes = Path(R.APPROVED_DRAFT).read_bytes() if Path(R.APPROVED_DRAFT).exists() else b""
check(hashlib.sha256(draft_bytes).hexdigest() == R.APPROVED_SHA256,
      f"approved draft {R.APPROVED_DRAFT}: SHA-256 is not {R.APPROVED_SHA256}")
draft = draft_bytes.decode("utf-8")
record = text("governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md") if Path("governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md").exists() else ""
check(R.APPROVED_SHA256 in record and STATUS in record, "approval record missing, or without the SHA-256 or the status")

# 2. platform amendments equal the approved text
NUM = {"AAB-PLATFORM-05": "05", "AAB-PLATFORM-06": "06", "AAB-PLATFORM-07": "07", "AAB-PLATFORM-08": "08", "AAB-PLATFORM-10": "10"}
platform = {}
for c, n in NUM.items():
    p = one(f"governance/AAB-PLATFORM-{n}-*CANONICAL-CONTRACT*.md")
    if not p:
        continue
    t = text(p)
    platform[c] = t
    expected = R.amendment_text(draft, c)
    heading = expected.split("\n", 1)[0]
    check(t.count(heading + "\n") == 1, f"{c}: amendment heading present {t.count(heading + chr(10))} times")
    got = section(t, heading)
    check(got is not None and got.rstrip("\n") == expected.rstrip("\n"),
          f"{c}: amendment section differs from the approved text with its declared adjustments")

# 3. normative identifiers and counts
p07 = section(platform.get("AAB-PLATFORM-07", ""), f"## Amendment of {D}: an admission invalidated after a snapshot") or ""
for needle in ["`MEMBER_ADMISSION_INVALIDATED`", "**nine change kinds**", "**eleven platform review triggers**",
               "is a trigger in every adoption, and no adoption may declare it otherwise",
               "interface AdmissionBasis {", "basisAt: string;", "validityAtBasis", "reliedAdmissionRoles",
               "`SNAPSHOT_MEMBER_ADMISSION_INVALIDATED`", "`RELIED_ADMISSION_INVALIDATED`", "`CITED_ADMISSION_INVALIDATED`",
               "`ADMISSION_BASIS_UNDETERMINED`", "`ADMISSION_BASIS_DUPLICATE`", "`RELIANCE_CLOSURE_ASSESSMENT`",
               "A closure grants no authority", "**Human reassessment is mandatory.**",
               "decision 10 now reads \"in nine platform change kinds\""]:
    check(needle in p07, f"AAB-PLATFORM-07 amendment lacks {needle!r}")
p08 = section(platform.get("AAB-PLATFORM-08", ""), f"## Amendment of {D}: nine change kinds, one always a trigger") or ""
for needle in ["***\"the nine change kinds\"***", "**eleven platform triggers**", "except `MEMBER_ADMISSION_INVALIDATED`, which is a trigger in every adoption",
               "**`decisionDigest` is the decision's `recordDigest`**", "every human decision relied on must be `VALID`"]:
    check(needle in p08, f"AAB-PLATFORM-08 amendment lacks {needle!r}")
p10 = section(platform.get("AAB-PLATFORM-10", ""), f"## Amendment of {D}: a human decision's digest is a `recordDigest`") or ""
check("**No new digest type.** There are still seven types." in p10, "AAB-PLATFORM-10 amendment lacks the seven-types statement")
p05 = section(platform.get("AAB-PLATFORM-05", ""), f"## Amendment of {D}: the admission basis on resolved citations, and the reliance-closure assessment") or ""
check("`resolved` gains `admissionBasis`" in p05 and "`RELIANCE_CLOSURE_ASSESSMENT`" in p05, "AAB-PLATFORM-05 amendment lacks its two points")
check(re.search(r"^\*\*Amended:\*\*.*; and " + D + r" \(the admission basis on resolved citations", platform.get("AAB-PLATFORM-05", ""), re.M) is not None,
      "AAB-PLATFORM-05 Amended line not extended")

# 4a. notification: the reviewed Stage 1 adjustment (approval record, section 6)
TIMING = ("**When.** The notification record is written in the same transaction as the reliance-closure assessment that names the affected item. "
          "A later assessment that names further items writes their notifications in its own transaction. How quickly a person is told "
          "therefore follows the closure assessment, written promptly after the invalidating resolution by a registered service in its own "
          "transaction (AAB-PLATFORM-07, amendment of " + D + ", point 11). A missing or late assessment, or a missing notification record, "
          "is a governance defect: it grants no authority, restores no reliance and suppresses no propagation. Notification never conditions propagation.")
DELIVERY = ("**Delivery.** Delivery joins CAP-10's open item on notification delivery. When delivery is defined, its receipt or failure is recorded, "
            "and failure never prevents a hold, stale state or refusal.")
CLASSES = ["The holder of the role accountable for the invalidated record",
           "The holder of the role accountable for each affected output or activity",
           "For a stop-at-once edge, the governing role of the capability whose evidence is affected",
           "Where the closure is `INCOMPLETE`, an audit or governance role",
           "The original decider of each affected decision, only while still authorised, and permitted to receive the information"]
GOVERNORS = {"02": ["ACQUISITION_GOVERNOR"], "08": ["SAFETY_GOVERNOR", "REGULATORY_GOVERNOR", "TRANSFER_GOVERNOR"],
             "10": ["SAFETY_GOVERNOR"], "11": ["REGULATORY_GOVERNOR"], "12": ["TRANSFER_GOVERNOR"]}
BASE = "a60c639"
AUDIT_RULE = ("Until an authorised audit or governance role is defined, the notification this row requires is unsatisfied, and the closure's completeness is EVIDENCE REQUIRED. "
              "The closure may not be represented as complete, and no assurance or commissioning decision that requires a complete closure may rely on it. "
              "This does not delay the invalidation, holds, refusals or other propagation, and the other recipients are still told. "
              "Every operation remains bound by AAB-PLATFORM-07's requirement to prove its own complete reliance basis (amendment of " + D + ", point 9).")
AUDIT_ELEMENTS = [("EVIDENCE REQUIRED", "the closure's completeness is EVIDENCE REQUIRED"),
                  ("the row's notification unsatisfied", "the notification this row requires is unsatisfied"),
                  ("no completeness claim", "The closure may not be represented as complete"),
                  ("reliance by completeness-requiring decisions barred", "no assurance or commissioning decision that requires a complete closure may rely on it"),
                  ("propagation not delayed", "This does not delay the invalidation, holds, refusals or other propagation"),
                  ("the other recipients still told", "the other recipients are still told"),
                  ("per-operation basis proof", "prove its own complete reliance basis (amendment of " + D + ", point 9)")]
HOLDER = ('**Which holder is notified.** For the first two rows, "the holder of the role" means the current actor specifically assigned or recorded as accountable '
          'for the affected record, output or activity, while still authorised and permitted to receive the information. For the governing role of a stop-at-once edge, '
          'it means the holders of that role whose scoped authority grant (AAB-PLATFORM-03) covers the affected item. It never means every actor who holds the role, and '
          "the platform never broadcasts a notification to a role population. If a recipient cannot be resolved with certainty, that recipient's notification is EVIDENCE "
          'REQUIRED: no recipient is guessed, and no protected information is disclosed. This does not delay the invalidation, holds, refusals or other propagation. The '
          'original decider is notified only while still authorised and permitted to receive the information.')
HOLDER_ELEMENTS = [
    ("the accountable actor: specifically assigned or recorded, still authorised", "the current actor specifically assigned or recorded as accountable for the affected record, output or activity, while still authorised and permitted to receive the information"),
    ("governors by scoped grant", "the holders of that role whose scoped authority grant (AAB-PLATFORM-03) covers the affected item"),
    ("never every holder", "It never means every actor who holds the role"),
    ("no broadcast", "the platform never broadcasts a notification to a role population"),
    ("an unresolved recipient is EVIDENCE REQUIRED", "If a recipient cannot be resolved with certainty, that recipient's notification is EVIDENCE REQUIRED"),
    ("no guessed recipient, no disclosure", "no recipient is guessed, and no protected information is disclosed"),
    ("propagation not delayed", "This does not delay the invalidation, holds, refusals or other propagation. The original decider"),
    ("the decider condition kept", "original decider is notified only while still authorised and permitted to receive the information."),
]
CAP12_EGRESS = ("The notification cites the invalidating resolution and the closure assessment, and reveals nothing the recipient may not see. "
                "A notification to a recipient outside the country environment, such as a manufacturer abroad, is an egress: it is subject to CAP-12's "
                "egress authorisation and the sovereign data boundary, as point 8's exemption requires (AAB-PLATFORM-07, amendment of " + D + ").")
# The role each contract says resolves its held records, with the contract's own words (at the base).
HELD_RESOLVER = {
    "01": ("DISCOVERY_REVIEWER", "| `DISCOVERY_REVIEWER` | Resolve held records;"),
    "04": ("MEMORY_REVIEWER", "- **A `MEMORY_REVIEWER` resolves it** with a human decision (AAB-PLATFORM-08) of the kind `MEMORY_HELD_RESOLUTION`"),
    "06": ("INGREDIENT_REVIEWER", "| `INGREDIENT_REVIEWER` | Resolve held records;"),
    "07": ("FORMULATION_REVIEWER", "| `FORMULATION_REVIEWER` | Resolve held records;"),
    "08": ("TRIAL_REVIEWER", "| `CAP08_HELD_RESOLUTION` | A held record | `TRIAL_REVIEWER`, never its submitter |"),
    "09": ("LEARNING_REVIEWER", "| `LEARNING_REVIEWER` | Resolve held records;"),
    "10": ("SAFETY_GOVERNOR", "**Held records** are decided by a `SAFETY_GOVERNOR`, never the submitter (`CAP10_HELD_RESOLUTION`"),
    "11": ("REGULATORY_GOVERNOR", "Held records are decided by a `REGULATORY_GOVERNOR`, never the submitter (`CAP11_HELD_RESOLUTION`)."),
    "12": ("TRANSFER_GOVERNOR", "| `TRANSFER_GOVERNOR` | Review qualifications; approve the country's transfer policy; give the second commercial approval; authorise sensitive and cross-border transfers and egress; release holds; resolve held records |"),
}


def contract_text_at_base(num):
    import subprocess
    p = one(f"governance/workstream-b/CAP-{num}-*CANONICAL-CONTRACT*.md")
    r = subprocess.run(["git", "show", f"{BASE}:{p}"], capture_output=True)
    return r.stdout.decode("utf-8") if r.returncode == 0 else ""


def check_notification(n, s, t):
    check(s.count(TIMING) == 1, f"CAP-{n}: timing rule absent, or not the exact text")
    check(s.count(DELIVERY) == 1, f"CAP-{n}: delivery wording absent, or not the exact text")
    check("Notification never conditions propagation." in s, f"CAP-{n}: 'never conditions propagation' missing")
    check("The notification cites the invalidating resolution and the closure assessment, and reveals nothing the recipient may not see." in s,
          f"CAP-{n}: notification content rule missing")
    rows = {}
    for c in CLASSES:
        m = re.search(r"^\| " + re.escape(c) + r" \| (.+) \|$", s, re.M)
        check(m is not None, f"CAP-{n}: recipient class missing: {c[:60]}")
        rows[c] = m.group(1) if m else ""
        cell = rows[c]
        check(re.search(r"`[A-Z]+(_[A-Z]+)+`", cell) or "No role defined" in cell or "None of CAP-" in cell or "decider named on the decision" in cell,
              f"CAP-{n}: recipient class has neither a role nor 'no role defined': {c[:60]}")
    audit = rows[CLASSES[3]]
    check("No role defined" in audit and "CAP-30" in audit and "open item" in audit, f"CAP-{n}: audit role not stated as 'no role defined' and an open item")
    check(AUDIT_RULE in audit, f"CAP-{n}: the INCOMPLETE-closure rule is absent, or not the exact text")
    for element, needle in AUDIT_ELEMENTS:
        check(needle in audit, f"CAP-{n}: INCOMPLETE-closure rule lacks: {element}")
    check(s.count(HOLDER) == 1, f"CAP-{n}: the 'which holder is notified' rule is absent, or not the exact text")
    for element, needle in HOLDER_ELEMENTS:
        check(needle in s, f"CAP-{n}: 'which holder is notified' lacks: {element}")
    check("| The decider named on the decision |\n\n**Which holder is notified.**" in s,
          f"CAP-{n}: 'which holder is notified' is not immediately after the recipient table")
    if n == "12":
        check(s.count(CAP12_EGRESS) == 1, "CAP-12: the egress sentence for a recipient abroad is absent, or not the exact text")
    if n in HELD_RESOLVER:
        role, quote = HELD_RESOLVER[n]
        check(f"`{role}`, for a CAP-{n} record" in rows[CLASSES[0]] or f"`{role}` (CAP-{n}), for a CAP-{n} record" in rows[CLASSES[0]],
              f"CAP-{n}: first recipient row does not name {role} for a CAP-{n} record")
        check(quote in contract_text_at_base(n), f"CAP-{n}: the contract text showing {role} resolves held records was not found at the base")
    gov = rows[CLASSES[2]]
    edges = re.search(r"\| Path \| Edge \| Consequence \|\n\|---\|---\|---\|\n((?:\|.*\|\n?)+)", s)
    stops = edges is not None and "**Stop at once" in edges.group(1)
    if stops:
        for g in GOVERNORS.get(n, []):
            check(f"`{g}`" in gov, f"CAP-{n}: stop-at-once edge without its governor {g}")
        check(n in GOVERNORS, f"CAP-{n}: a stop-at-once edge in a capability with no governor mapping")
    else:
        check(f"None of CAP-{n}'s edges stops at once" in gov, f"CAP-{n}: governor row must say no edge stops at once")
    # invent no role: every role named is defined in the contract it is attributed to (at the base, before this change)
    own = contract_text_at_base(n)
    table = "\n".join(rows.values())
    for role, cap in re.findall(r"`([A-Z]+(?:_[A-Z]+)+)`(?: \((CAP-\d\d)\))?", table):
        if role in ("INCOMPLETE",) or role.endswith(("_REVIEW", "_ASSESSMENT", "_ACTIVATION", "_AUTHORISATION", "_APPROVAL", "_DETERMINATION")):
            continue  # decision kinds named as outputs, not roles
        src = contract_text_at_base(cap[4:]) if cap else own
        check(f"`{role}`" in src, f"CAP-{n}: role {role} is not defined in {cap or f'CAP-{n}'}")


# 4. the twelve adoptions
COUNTS = {"01": "all eleven", "05": "all eleven declared", "06": "all eleven", "07": "all eleven", "08": "all eleven",
          "09": "all eleven", "10": "all eleven", "11": "all eleven", "12": "all eleven"}
REVIEWS = {"01", "05", "06", "07", "08", "09", "10", "11", "12"}
heading = f"## Amendment of {D}: invalidated admissions, under AAB-PLATFORM-07"
for n in [f"{i:02d}" for i in range(1, 13)]:
    p = one(f"governance/workstream-b/CAP-{n}-*CANONICAL-CONTRACT*.md")
    if not p:
        continue
    t = text(p)
    check(t.count(heading + "\n") == 1, f"CAP-{n}: adoption heading present {t.count(heading + chr(10))} times")
    s = section(t, heading) or ""
    check(R.APPROVED_SHA256 in s, f"CAP-{n}: adoption does not cite the approved draft's SHA-256")
    check(re.search(r"\*\*\d+\. The admission basis\*\*", s) is not None and "legacy, fail-closed mapping" in s, f"CAP-{n}: admission basis or legacy rule missing")
    check(re.search(r"\| Path \| Edge \| Consequence \|\n\|---\|---\|---\|\n(\| (A|B1|B2|C) \|.*\|\n?)+", s) is not None,
          f"CAP-{n}: no reliance-edge classification table")
    check("| Path | What restores reliance |" in s and "Human reassessment is mandatory" in s, f"CAP-{n}: restoration by path missing")
    check(re.search(r"\*\*\d+\. Who is told\.\*\*", s) is not None, f"CAP-{n}: who is told missing")
    check_notification(n, s, t)
    check(f"**`{STATUS}`**" in s, f"CAP-{n}: status wording missing")
    check(not re.search(r"\b(is|now) `?CLOSED`?", s.replace("never `CLOSED`", "")), f"CAP-{n}: adoption claims something CLOSED")
    if n in REVIEWS:
        check("`MEMBER_ADMISSION_INVALIDATED` is a trigger for every" in s and "never declared otherwise" in s,
              f"CAP-{n}: mandatory trigger not declared")
    if n in COUNTS:
        check(f"now reads \"{COUNTS[n]}" in s, f"CAP-{n}: count not corrected to {COUNTS[n]!r}")
    check(re.search(r"^\*\*Amended:\*\*.*; and " + D + r" \(invalidated admissions, under AAB-PLATFORM-07\)", t, re.M) is not None,
          f"CAP-{n}: Amended line not extended")
    if n == "10":
        check("now reads **the nine change kinds**" in s, "CAP-10: \"the eight change kinds\" not corrected to nine")

for p in glob.glob("governance/workstream-b/CAP-*CANONICAL-CONTRACT*.md") + ["governance/reviews/RD-01-AMENDMENT-APPROVAL-RECORD-2026-10-03.md"]:
    check("How quickly is not set" not in text(p), f"{p}: still says 'How quickly is not set'")
check("reviewed Stage 1 adjustment" in record and "no role defined" in record and "anchored to the closure assessment" in record,
      "approval record does not record the reviewed Stage 1 adjustment")
for needle in ["No audit or governance role is defined in any contract, so none is named.",
               "**EVIDENCE REQUIRED**", "**This is a mandatory condition, not a deferred convenience.**",
               "No assurance or commissioning decision that requires a complete closure may rely on it.",
               "**Which holder is notified: settled before commit, not left to Stage 2.**",
               "**Recipient selection is now governed and fail-closed.**",
               "the delivery of notifications, and their channels",
               "**CAP-12: notifying a recipient abroad is an egress.**", "**No correction was needed:**"]:
    check(needle in record, f"approval record lacks {needle!r}")

# 5. status wording in the records, nothing closed
for path in ["governance/AAB-PLATFORM-ROADMAP-2026-09-27.md", "governance/AAB-STOCK-TAKE-2026-09-28.md"]:
    t = text(path)
    lines = [l for l in t.split("\n") if f"**RD-01: `{STATUS}`**" in l]
    check(len(lines) == 1, f"{path}: RD-01 status line present {len(lines)} times")
    check(not re.search(r"RD-01[^\n]{0,80}`CLOSED`", t), f"{path}: RD-01 marked CLOSED")

for f in fails:
    print("FAIL", f)
print(f"RD-01 contract check: {passes} checks passed, {len(fails)} failed.")
print("This verifies contract TEXT only. It is not implementation proof: RD-01 remains "
      f"`{STATUS}` until Stage 2's implementation and tests pass.")
sys.exit(1 if fails else 0)
