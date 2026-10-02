"""Check the AGR provenance adoption matrix against the twelve AGR contracts.

Usage (from the repository root):
    python governance/tools/provenance-matrix/check_matrix.py

For every capability CAP-01 to CAP-12, the matrix record
(governance/workstream-b/AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md) holds three
tables: record kinds, citations and the six-gap matrix. The capability's contract
holds the same three tables in its amendment of 2026-10-02 on provenance and digests,
with the shared citation-class table. This check fails, naming what differs, if:
  - a capability is missing from the matrix or has no such amendment;
  - a table in the matrix does not appear, byte for byte, in the contract's amendment;
  - the contract's amendment has a table the matrix does not (other than the
    citation-class table).
Exit status 0 means every table agrees; 1 lists every difference.
"""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[3]
WB = ROOT / "governance" / "workstream-b"
MATRIX = WB / "AGR-PROVENANCE-ADOPTION-MATRIX-2026-10-02.md"
CAPS = [f"CAP-{n:02d}" for n in range(1, 13)]
AMENDMENT = re.compile(r"^## Amendment of 2026-10-02(?: \([a-z]+\))?: provenance and digests, under AAB-PLATFORM-05 and AAB-PLATFORM-10$")
CLASS_TABLE_HEADER = "| Citation class | Unresolved consequence |"


def read(path):
    return path.read_bytes().decode("utf-8").replace("\r\n", "\n")


def tables(lines):
    """Every Markdown table in the lines, as one string each."""
    out, cur = [], []
    for line in lines:
        if line.startswith("|"):
            cur.append(line)
        elif cur:
            out.append("\n".join(cur))
            cur = []
    if cur:
        out.append("\n".join(cur))
    return out


def section(lines, start_pred):
    """Lines from the first heading matching start_pred to the next heading of the same level."""
    for i, line in enumerate(lines):
        if start_pred(line):
            level = len(line) - len(line.lstrip("#"))
            end = next((j for j in range(i + 1, len(lines))
                        if lines[j].startswith("#") and len(lines[j]) - len(lines[j].lstrip("#")) <= level),
                       len(lines))
            return lines[i + 1:end]
    return None


def main():
    problems = []
    matrix_lines = read(MATRIX).split("\n")
    for cap in CAPS:
        m = section(matrix_lines, lambda l, c=cap: l == f"## {c}")
        if m is None:
            problems.append(f"{cap}: missing from the matrix")
            continue
        m_tables = tables(m)
        if len(m_tables) != 3:
            problems.append(f"{cap}: the matrix has {len(m_tables)} tables, not 3")
        files = list(WB.glob(f"{cap}-*CANONICAL-CONTRACT*.md"))
        if len(files) != 1:
            problems.append(f"{cap}: {len(files)} contract files found")
            continue
        a = section(read(files[0]).split("\n"), lambda l: bool(AMENDMENT.match(l)))
        if a is None:
            problems.append(f"{cap}: no amendment of 2026-10-02 on provenance and digests in {files[0].name}")
            continue
        a_tables = [t for t in tables(a) if not t.startswith(CLASS_TABLE_HEADER)]
        for n, t in enumerate(m_tables, 1):
            if t not in a_tables:
                problems.append(f"{cap}: matrix table {n} ({t.splitlines()[0][:60]}...) does not appear exactly in the contract")
        for t in a_tables:
            if t not in m_tables:
                problems.append(f"{cap}: the contract has a table the matrix does not ({t.splitlines()[0][:60]}...)")
    if problems:
        print("MATRIX CHECK FAILED")
        for p in problems:
            print(" -", p)
        return 1
    print(f"MATRIX CHECK PASSED: {len(CAPS)} capabilities, every table identical in the matrix and its contract")
    return 0


if __name__ == "__main__":
    sys.exit(main())
