"""Tests for render_canonical_contracts.py block parsing.

Run: python -m unittest governance/tools/test_render_canonical_contracts.py

Each input here once made parse_blocks stop making progress (an endless loop)
or crash. Every case is run in a worker thread with a timeout, so a regression
fails the test instead of hanging it.
"""

import sys
import threading
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render_canonical_contracts as r  # noqa: E402

TIMEOUT_S = 5


def parse(text):
    """parse_blocks over the lines of text; fails if it does not finish in TIMEOUT_S."""
    out, report = {}, []

    def run():
        out["result"] = r.parse_blocks(text.split("\n"), 0, report)

    t = threading.Thread(target=run, daemon=True)
    t.start()
    t.join(TIMEOUT_S)
    if t.is_alive():
        raise AssertionError(f"parse_blocks did not finish within {TIMEOUT_S}s: {text[:60]!r}")
    blocks, _ = out["result"]
    return blocks, report


class NestedLists(unittest.TestCase):
    def test_nested_bullets_render_as_nested_lists(self):
        blocks, report = parse(
            "- **Organisations.** A conflict is\n"
            "  an exact match.\n"
            "  - The comparison is exact.\n"
            "  - A RETIRED party never conflicts.\n"
            "- **Persons.** Never checked.\n"
        )
        self.assertEqual(report, [])
        self.assertEqual(blocks, [("ul", [
            ("**Organisations.** A conflict is an exact match.",
             [("ul", ["The comparison is exact.", "A RETIRED party never conflicts."])]),
            "**Persons.** Never checked.",
        ])])
        html = r.block_html(*blocks[0], False, [], {})
        self.assertEqual(html.count("<ul>"), 2)
        self.assertIn("<li>The comparison is exact.</li>", html)
        self.assertLess(html.index("<ul><li>The comparison"), html.index("<li><strong>Persons."))

    def test_three_levels_and_mixed_kinds(self):
        blocks, report = parse("1. One\n   - a\n     - deep\n   - b\n2. Two\n")
        self.assertEqual(report, [])
        self.assertEqual(blocks, [("ol", [("One", [("ul", [("a", [("ul", ["deep"])]), "b"])]), "Two"])])

    def test_continuation_after_a_sublist_joins_the_parent_item(self):
        blocks, _ = parse("- parent\n  - child\n  more parent text\n")
        self.assertEqual(blocks, [("ul", [("parent more parent text", [("ul", ["child"])])])])

    def test_orphan_indented_item_is_a_list_not_a_hang(self):
        # the SCS-CAP-02 case: an indented item with no parent item above it
        blocks, _ = parse("Intro paragraph.\n\n  - indented item\n  - another\n")
        self.assertEqual(blocks, [("p", "Intro paragraph."), ("ul", ["indented item", "another"])])

    def test_flat_lists_are_unchanged(self):
        blocks, _ = parse("- a\n- b\n\n1. x\n2. y\n")
        self.assertEqual(blocks, [("ul", ["a", "b"]), ("ol", ["x", "y"])])


class AlwaysProgresses(unittest.TestCase):
    def test_h4_line_becomes_a_paragraph(self):
        blocks, _ = parse("#### Minor heading\ntext\n")
        self.assertEqual(blocks[0], ("p", "#### Minor heading text"))

    def test_unclosed_code_block_is_reported_not_a_crash(self):
        blocks, report = parse("```typescript\ninterface X {}\n")
        self.assertEqual(blocks, [("code", ("typescript", "interface X {}\n"))])
        self.assertEqual(report, ["code block at line 1 is not closed"])


class StatusBadges(unittest.TestCase):
    def test_each_confirmed_rule(self):
        self.assertEqual(r.status_badge("CANONICAL CONTRACT — NOT IMPLEMENTATION"), ("DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED", "design"))
        self.assertEqual(r.status_badge("PUBLIC-FACING OVERVIEW — NOT A CANONICAL CONTRACT"), ("PUBLIC_OVERVIEW", "overview"))
        self.assertEqual(r.status_badge("CANDIDATE — PROPOSED"), ("PROPOSED", "proposed"))

    def test_anything_else_is_unmapped(self):
        self.assertEqual(r.status_badge("GOVERNANCE DEFINITION"), ("UNMAPPED", "proposed"))


if __name__ == "__main__":
    unittest.main()
