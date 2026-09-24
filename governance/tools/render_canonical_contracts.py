"""Render AAB canonical contract markdown into HTML using governance/canonical-contract-template.html.

Usage (from anywhere):
    python governance/tools/render_canonical_contracts.py              # every *CANONICAL-CONTRACT*.md under governance/
    python governance/tools/render_canonical_contracts.py <file.md>…   # only the named contracts

Writes <file>.html next to each source (LF line endings, UTF-8) and prints a JSON
report per file. Anything unexpected is listed under "report" — an empty list means
every prose line and every TypeScript identifier, value and comment of the source
was found in the output. Exit status is 1 if any report is non-empty.
See governance/tools/README.md.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read_lf(path):
    """Read UTF-8 text with line endings normalised to LF (working-tree files may be CRLF on Windows)."""
    return path.read_bytes().decode("utf-8").replace("\r\n", "\n")


TEMPLATE = read_lf(ROOT / "governance" / "canonical-contract-template.html")

# ── inline markdown ────────────────────────────────────────────────────


def inline(text):
    # code spans become opaque placeholders first, so **`CODE`** still bolds correctly
    codes = []

    def stash(m):
        codes.append(f"<code>{html.escape(m.group(1), quote=False)}</code>")
        return f"\x00{len(codes) - 1}\x00"

    e = html.escape(re.sub(r"`([^`]+)`", stash, text), quote=False)
    e = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", e)
    e = re.sub(r"(?<![*\w])\*(?!\s)([^*]+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", e)
    return re.sub(r"\x00(\d+)\x00", lambda m: codes[int(m.group(1))], e)


def wbr(name):
    if len(name) < 22:
        return html.escape(name)
    return "<wbr>".join(html.escape(p) for p in re.split(r"(?<=[a-z0-9])(?=[A-Z])", name))


def wbr_text(s):
    """Escape and allow line breaks at camelCase humps and after < ( , in long signatures."""
    e = html.escape(s)
    e = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", "<wbr>", e)
    return re.sub(r"(&lt;|\(|, )", r"\1<wbr>", e)


# ── TypeScript → structured definitions ────────────────────────────────

TOK = re.compile(r'\s*(?://(?P<c>[^\n]*)|(?P<s>"[^"\n]*")|(?P<n>-?\d+(?:\.\d+)?)|(?P<i>[A-Za-z_$][\w$]*)|(?P<p>[{}()<>\[\]:;|?,=&.]))')
PRIMS = {"string", "number", "boolean", "void", "unknown", "any", "null", "undefined", "never", "object"}


class ParseError(Exception):
    pass


def tokenize(src):
    toks, pos = [], 0
    src = src.rstrip()
    while pos < len(src):
        m = TOK.match(src, pos)
        if not m or m.end() == pos:
            if src[pos:].strip() == "":
                break
            raise ParseError(f"unexpected character {src[pos:pos+20]!r}")
        kind = m.lastgroup
        toks.append((kind, m.group(kind)))
        pos = m.end()
    return toks


class P:
    def __init__(self, toks):
        self.t, self.i = toks, 0

    def peek(self, k=0):
        j = self.i + k
        return self.t[j] if j < len(self.t) else (None, None)

    def take(self, val=None):
        tok = self.peek()
        if tok[0] is None or (val is not None and tok[1] != val):
            raise ParseError(f"expected {val!r}, got {tok[1]!r}")
        self.i += 1
        return tok

    def comments(self):
        out = []
        while self.peek()[0] == "c":
            out.append(self.take()[1].strip())
        return out

    def is_(self, val):
        return self.peek()[1] == val and self.peek()[0] == "p"

    # type := ('|')? alt ('|' alt)*
    def type_(self):
        notes = self.comments()
        if self.is_("|"):
            self.take()
        alts = [self.alt()]
        while True:
            notes += self.comments()
            if self.is_("|"):
                self.take()
                notes += self.comments()
                alts.append(self.alt())
            else:
                break
        node = alts[0] if len(alts) == 1 else {"k": "union", "alts": alts}
        if notes:
            node = dict(node, notes=notes)
        return node

    def alt(self):
        kind, val = self.peek()
        if kind == "s":
            self.take()
            node = {"k": "lit", "v": val}
        elif kind == "n":
            self.take()
            node = {"k": "lit", "v": val}
        elif kind == "p" and val == "{":
            node = {"k": "obj", "members": self.members()}
        elif kind == "p" and val == "(":
            self.take()
            node = self.type_()
            self.take(")")
        elif kind == "i":
            self.take()
            name = val
            while self.is_("."):
                self.take()
                name += "." + self.take()[1]
            if name in ("true", "false"):
                node = {"k": "lit", "v": name}
            elif self.is_("<"):
                self.take()
                args = [self.type_()]
                while self.is_(","):
                    self.take()
                    args.append(self.type_())
                self.take(">")
                node = {"k": "array", "of": args[0]} if name in ("Array", "ReadonlyArray") and len(args) == 1 else {"k": "gen", "name": name, "args": args}
            else:
                node = {"k": "ref", "name": name}
            # indexed access type, e.g. Cap05EvidenceRecord["stance"]
            while self.is_("[") and self.peek(1)[0] == "s" and self.peek(2)[1] == "]":
                self.take()
                key = self.take()[1]
                self.take()
                node = {"k": "ref", "name": f"{type_text(node)}[{key}]"}
        else:
            raise ParseError(f"unexpected token {val!r} in type")
        while self.is_("[") and self.peek(1)[1] == "]":
            self.take()
            self.take()
            node = {"k": "array", "of": node, "suffix": True}
        return node

    def members(self):
        self.take("{")
        items = []
        while True:
            c = self.comments()
            if c:
                items.append({"k": "comment", "text": c})
            if self.is_("}"):
                self.take()
                return items
            kind, name = self.take()
            if kind not in ("i", "s"):
                raise ParseError(f"bad member name {name!r}")
            if self.is_("("):
                items.append(self.method(name))
                continue
            opt = False
            if self.is_("?"):
                self.take()
                opt = True
            self.take(":")
            t = self.type_()
            if self.is_(";") or self.is_(","):
                self.take()
            items.append({"k": "field", "name": name, "opt": opt, "type": t})

    def method(self, name):
        self.take("(")
        params = []
        while not self.is_(")"):
            self.comments()
            pname = self.take()[1]
            popt = False
            if self.is_("?"):
                self.take()
                popt = True
            self.take(":")
            params.append((pname, popt, self.type_()))
            if self.is_(","):
                self.take()
        self.take(")")
        self.take(":")
        ret = self.type_()
        if self.is_(";"):
            self.take()
        return {"k": "method", "name": name, "params": params, "ret": ret}

    def decls(self):
        out = []
        while self.peek()[0] is not None:
            lead = self.comments()
            if self.peek()[0] is None:
                if lead:
                    out.append({"k": "loose-comment", "text": lead})
                break
            if self.is_("{"):
                raise ParseError("EXAMPLE_VALUE")
            if self.peek()[0] == "i" and self.peek(1)[1] in (":", "?") and self.peek()[1] not in ("interface", "type", "export"):
                # a bare run of fields quoted from a larger interface
                items = [{"k": "comment", "text": lead}] if lead else []
                while self.peek()[0] is not None:
                    c = self.comments()
                    if c:
                        items.append({"k": "comment", "text": c})
                    if self.peek()[0] is None:
                        break
                    fname = self.take()[1]
                    opt = self.is_("?") and bool(self.take())
                    self.take(":")
                    t = self.type_()
                    if self.is_(";"):
                        self.take()
                    items.append({"k": "field", "name": fname, "opt": opt, "type": t})
                out.append({"k": "fragment", "name": "Field excerpt", "members": items})
                break
            kw = self.take()[1]
            if kw == "export":
                kw = self.take()[1]
            name = self.take()[1]
            if kw == "interface":
                ext = []
                if self.peek()[1] == "extends":
                    self.take()
                    ext.append(type_text(self.alt()))
                    while self.is_(","):
                        self.take()
                        ext.append(type_text(self.alt()))
                out.append({"k": "interface", "name": name, "extends": ext, "members": self.members(), "lead": lead})
            elif kw == "type":
                self.take("=")
                t = self.type_()
                if self.is_(";"):
                    self.take()
                out.append({"k": "type", "name": name, "type": t, "lead": lead})
            else:
                raise ParseError(f"unsupported declaration {kw!r}")
        return out


def type_text(t):
    k = t["k"]
    if k == "lit":
        return t["v"]
    if k == "ref":
        return t["name"]
    if k == "array":
        inner = type_text(t["of"])
        return f"{inner}[]" if t.get("suffix") else f"Array<{inner}>"
    if k == "gen":
        return f"{t['name']}<{', '.join(type_text(a) for a in t['args'])}>"
    if k == "union":
        return " | ".join(type_text(a) for a in t["alts"])
    if k == "obj":
        return "{ … }"
    return "?"


def type_html(t):
    k = t["k"]
    if k == "lit":
        return f'<span class="lit">{html.escape(t["v"])}</span>'
    if k == "ref":
        cls = "" if t["name"] in PRIMS else ' class="tref"'
        return f"<span{cls}>{html.escape(t['name'])}</span>"
    if k == "array":
        inner = type_html(t["of"])
        return f"{inner}[]" if t.get("suffix") else f"Array&lt;{inner}&gt;"
    if k == "gen":
        return f'<span class="tref">{html.escape(t["name"])}</span>&lt;{", ".join(type_html(a) for a in t["args"])}&gt;'
    if k == "union":
        return " | ".join(type_html(a) for a in t["alts"])
    return html.escape(type_text(t))


def is_lit_union(t):
    return t["k"] == "union" and all(a["k"] == "lit" for a in t["alts"])


def enum_html(t, note):
    items = "".join(f"<li>{html.escape(a['v'])}</li>" for a in t["alts"])
    lbl = f'<span class="enum-note">{note}</span>' if note else ""
    return f'{lbl}<ul class="enum">{items}</ul>'


def notes_html(t):
    return "".join(f'<div class="grp">{"<br>".join(inline(x) for x in t["notes"])}</div>') if t.get("notes") else ""


def member_rows(items):
    rows = []
    for it in items:
        if it["k"] == "comment":
            rows.append(f'<div class="grp">{"<br>".join(inline(x) for x in it["text"])}</div>')
        elif it["k"] == "method":
            params = ", ".join(f"{n}{'?' if o else ''}: {type_text(pt)}" for n, o, pt in it["params"])
            ret = it["ret"]
            ret_obj = ret["args"][0] if ret["k"] == "gen" and len(ret["args"]) == 1 and ret["args"][0]["k"] == "obj" else (ret if ret["k"] == "obj" else None)
            nest = f'<div class="nest" style="grid-column:1 / -1">{member_rows(ret_obj["members"])}</div>' if ret_obj else ""
            rows.append(
                f'<div class="f"><span class="m-sig">{wbr_text(it["name"])}<span class="p">({wbr_text(params)})</span></span>'
                f'<span class="m-ret">{wbr_text(type_text(ret))}</span>{nest}</div>'
            )
        else:
            rows.append(field_row(it["name"], it["opt"], it["type"]))
    return "".join(rows)


def field_row(name, opt, t):
    fn = f'<span class="fn">{wbr(name)}{"<span class=opt>optional</span>" if opt else ""}</span>'
    pre = notes_html(t)
    obj = t if t["k"] == "obj" else (t["of"] if t["k"] == "array" and t["of"]["k"] == "obj" else None)
    if obj is not None:
        label = '<span class="enum-note" style="margin:2px 0 0">Array of objects</span>' if obj is not t else ""
        return f'{pre}<div class="f has-nest">{fn}{label}<div class="nest">{member_rows(obj["members"])}</div></div>'
    if t["k"] == "lit" and t["v"] in ("true", "false"):
        return f'{pre}<div class="f flag">{fn}<span class="ft"><span class="fixed">{t["v"]}</span></span></div>'
    if is_lit_union(t):
        return f'{pre}<div class="f">{fn}<span class="ft">{enum_html(t, "One of")}</span></div>'
    if t["k"] == "array" and is_lit_union(t["of"]):
        return f'{pre}<div class="f">{fn}<span class="ft">{enum_html(t["of"], "Array of")}</span></div>'
    return f'{pre}<div class="f">{fn}<span class="ft">{type_html(t)}</span></div>'


def count_rows(items):
    n = 0
    for it in items:
        n += 1
        t = it.get("type")
        if t and t["k"] == "obj":
            n += count_rows(t["members"])
        if t and t["k"] == "union":
            n += len(t["alts"]) // 4
    return n


def render_ts(src):
    decls = P(tokenize(src)).decls()
    cards = []
    for d in decls:
        if d["k"] == "loose-comment":
            cards.append(f'<div class="grp" style="border:0;padding-left:0">{"<br>".join(inline(x) for x in d["text"])}</div>')
            continue
        lead = "".join(f'<div class="grp">{"<br>".join(inline(x) for x in d["lead"])}</div>') if d.get("lead") else ""
        if d["k"] == "fragment":
            cards.append(
                f'<div class="def{" short" if count_rows(d["members"]) <= 14 else ""}"><div class="def-head"><span class="dn">Field excerpt</span>'
                f'<span class="dk">Fields</span></div>{member_rows(d["members"])}</div>'
            )
            continue
        if d["k"] == "interface":
            is_provider = any(m["k"] == "method" for m in d["members"])
            kind = "Provider interface" if is_provider else "Interface"
            ext = f' <span class="extends">extends {", ".join(map(html.escape, d["extends"]))}</span>' if d["extends"] else ""
            rows = member_rows(d["members"])
            short = " short" if count_rows(d["members"]) <= 14 else ""
            cls = f"def{short}{' provider' if is_provider else ''}"
        else:
            t = d["type"]
            kind = "Type"
            ext = ""
            if is_lit_union(t):
                rows = notes_html(t) + f'<div class="f"><span class="fn">= one of</span><span class="ft">{enum_html(t, "")}</span></div>'
            elif t["k"] == "obj":
                rows = member_rows(t["members"])
            else:
                rows = notes_html(t) + f'<div class="f"><span class="fn">=</span><span class="ft">{type_html(t)}</span></div>'
            cls = "def short"
        cards.append(
            f'<div class="{cls}"><div class="def-head"><span class="dn">{html.escape(d["name"])}{ext}</span>'
            f'<span class="dk">{kind}</span></div>{lead}{rows}</div>'
        )
    return '<div style="display:grid;gap:10px">' + "".join(cards) + "</div>" if len(cards) > 1 else cards[0]


def ts_tokens(src):
    """Every identifier, literal and comment word in a TS block — used to prove nothing was dropped."""
    words = set()
    for kind, val in tokenize(src):
        if kind in ("i", "s", "n"):
            words.add(val)
        elif kind == "c":
            words.update(w for w in re.findall(r"[\w'’\-]+", val) if len(w) > 2)
    return words


# ── markdown body → clauses ────────────────────────────────────────────


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


BLOCK_START = re.compile(r"^(-\s|\d+\.\s|```|#|>|\|)")


def parse_blocks(lines, i, report):
    """Yield (kind, payload) until next ## heading."""
    n = len(lines)
    blocks = []
    while i < n:
        s = lines[i].strip()
        if s.startswith("## "):
            break
        if not s:
            i += 1
            continue
        if s.startswith("### "):
            blocks.append(("h3", s[4:]))
            i += 1
        elif s.startswith("```"):
            lang = s[3:].strip()
            j = i + 1
            while not lines[j].strip().startswith("```"):
                j += 1
            blocks.append(("code", (lang, "\n".join(lines[i + 1:j]))))
            i = j + 1
        elif s.startswith(">"):
            paras, cur = [], []
            while i < n and lines[i].strip().startswith(">"):
                t = lines[i].strip()[1:].strip()
                if t:
                    cur.append(t)
                elif cur:
                    paras.append(" ".join(cur))
                    cur = []
                i += 1
            if cur:
                paras.append(" ".join(cur))
            blocks.append(("quote", paras))
        elif s.startswith("|"):
            rows = []
            while i < n and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            blocks.append(("table", rows))
        elif re.match(r"^(-|\d+\.)\s", s):
            ordered = not s.startswith("-")
            items = []
            while i < n:
                raw = lines[i]
                m = re.match(r"^(-|\d+\.)\s+(.*)", raw)
                if m and (m.group(1) == "-") == (not ordered):
                    items.append(m.group(2))
                elif raw.startswith(("  ", "\t")) and raw.strip() and items and not re.match(r"^\s+(-|\d+\.)\s", raw):
                    items[-1] += " " + raw.strip()
                elif m:
                    break
                else:
                    break
                i += 1
            if re.match(r"^\s+(-|\d+\.)\s", lines[i] if i < n else ""):
                report.append(f"nested list at line {i+1} rendered flat")
            blocks.append(("ol" if ordered else "ul", items))
        else:
            buf = []
            while i < n and lines[i].strip() and not BLOCK_START.match(lines[i].strip()):
                buf.append(lines[i].strip())
                i += 1
            blocks.append(("p", " ".join(buf)))
    return blocks, i


def block_html(kind, payload, boundary, report, stats):
    if kind == "p":
        return f"<p>{inline(payload)}</p>"
    if kind in ("ul", "ol"):
        body = f"<{kind}>" + "".join(f"<li>{inline(x)}</li>" for x in payload) + f"</{kind}>"
        return f'<div class="boundary">{body}</div>' if boundary else body
    if kind == "quote":
        lbl = '<span class="lbl">Governing rule</span>' if stats.get("_rule_label") else ""
        return '<blockquote class="rule-callout">' + lbl + "".join(f"<p>{inline(p)}</p>" for p in payload) + "</blockquote>"
    if kind == "table":
        head, rest = payload[0], [r for r in payload[1:] if not all(re.match(r"^:?-+:?$", c) for c in r)]
        if any(len(r) != len(head) for r in rest):
            report.append("table with uneven column counts")
        return ('<table class="grid"><thead><tr>' + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in rest) + "</tbody></table>")
    if kind == "code":
        lang, src = payload
        if lang == "mermaid":
            stats["mermaid"] += 1
            return f'<figure class="diagram"><pre class="mermaid">{html.escape(src, quote=False)}</pre><figcaption>Diagram</figcaption></figure>'
        if lang == "typescript":
            stats["ts"] += 1
            try:
                out = render_ts(src)
                stats["ts_structured"] += 1
                out_text = html.unescape(re.sub(r"<[^>]+>", "", out))
                missing = [w for w in ts_tokens(src) if w not in out_text and w not in ("Array", "interface", "type", "extends", "export")]
                if missing:
                    report.append(f"TS block {stats['ts']}: {len(missing)} source tokens not found in output: {sorted(missing)[:8]}")
                return out
            except ParseError as e:
                if str(e) == "EXAMPLE_VALUE":
                    stats["ts_examples"] = stats.get("ts_examples", 0) + 1
                    label = "Example value (TypeScript)"
                else:
                    report.append(f"TS block {stats['ts']} kept verbatim (could not structure: {e})")
                    label = "TypeScript"
        else:
            label = {"json": "JSON example", "": "Structure"}.get(lang, lang)
        return f'<div class="verbatim-block"><span class="lbl">{html.escape(label)}</span><pre>{html.escape(src, quote=False)}</pre></div>'
    raise ValueError(kind)


def convert(md_path):
    report = []
    stats = {"mermaid": 0, "ts": 0, "ts_structured": 0}
    lines = read_lf(md_path).split("\n")
    h1 = lines[0].lstrip("#").strip()
    parts = [p.strip() for p in h1.split(" — ")]
    m = re.match(r"^((?:[A-Z]+-)*[A-Z]+-\d+)\s*(.*)$", parts[0])
    if len(parts) == 4 and m and not m.group(2):
        ref, title, kind, date = parts
    elif len(parts) == 3 and m and m.group(2):
        ref, title, kind, date = m.group(1), m.group(2), parts[1], parts[2]
    else:
        raise SystemExit(f"{md_path.name}: unrecognised H1 {h1!r}")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        report.append(f"date {date!r} is not ISO")

    # header fields
    i = 1
    while not lines[i].strip():
        i += 1
    meta = []
    while lines[i].strip():
        s = lines[i].strip()
        mk = re.match(r"^\*\*([^*]+?):\*\*\s*(.*)$", s)
        if mk:
            meta.append([mk.group(1), mk.group(2)])
        elif s.startswith("**"):
            meta.append(["Note", s])
        else:
            meta[-1][1] += " " + s
        i += 1
    meta_d = {k: v for k, v in meta}
    status = meta_d.get("Status", "")
    if not status:
        report.append("no **Status:** field")
    # badge rule (confirmed): not-implemented design contracts → DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED;
    # PROPOSED only when the source says PROPOSED and nothing stronger; nothing is ADMITTED here.
    su = status.upper()
    if "NOT IMPLEMENT" in su and "CONTRACT" in su:
        badge, bcls = "DESIGN_CONTRACT_COMPLETE_NOT_IMPLEMENTED", "design"
    elif "PROPOSED" in su:
        badge, bcls = "PROPOSED", "proposed"
    else:
        badge, bcls = "UNMAPPED", "proposed"
        report.append(f"status {status!r} does not match a confirmed badge rule")

    # body
    sections, toc = [], []
    while i < len(lines):
        s = lines[i].strip()
        if not s:
            i += 1
            continue
        if not s.startswith("## "):
            report.append(f"content before first section at line {i+1}")
            blocks, i = parse_blocks(lines, i, report)
            continue
        heading = s[3:]
        blocks, i = parse_blocks(lines, i + 1, report)
        sections.append((heading, blocks))

    body = []
    for sn, (heading, blocks) in enumerate(sections, 1):
        sid = slug(heading)
        toc.append(f'<li><span class="n">{sn:02d}</span><a href="#{sid}">{inline(heading)}</a></li>')
        boundary = heading.lower().startswith("what this document does not establish")
        stats["_rule_label"] = heading.lower().startswith("the governing")
        # one counter per section: plain clauses are n.c; a ### sub-heading takes the next
        # number n.c and the clauses under it are n.c.k — so numbers never collide
        counter, sub, subclause = 0, 0, 0
        chunks = []  # list of html strings; headings kept with following block
        pending_heads = [f'<h2 class="sec-h"><span class="n">{sn:02d}</span>{inline(heading)}</h2>']
        for bkind, payload in blocks:
            if bkind == "h3":
                counter += 1
                sub, subclause = counter, 0
                pending_heads.append(f'<h3 class="sub-h"><span class="n">{sn}.{sub}</span>{inline(payload)}</h3>')
                continue
            if sub:
                subclause += 1
                num = f"{sn}.{sub}.{subclause}"
            else:
                counter += 1
                num = f"{sn}.{counter}"
            inner = block_html(bkind, payload, boundary, report, stats)
            cl = f'<div class="clause"><span class="cn">{num}</span><div class="cb">{inner}</div></div>'
            if pending_heads:
                # keep heading + first block together only when that block is short;
                # a long definition may start under its heading and continue overleaf
                long_block = 'class="def"' in inner or 'class="def provider"' in inner
                if long_block:
                    chunks.append('<div class="head-keep head-only">' + "".join(pending_heads) + "</div>" + cl)
                else:
                    chunks.append('<div class="head-keep">' + "".join(pending_heads) + cl + "</div>")
                pending_heads = []
            else:
                chunks.append(cl)
        if pending_heads:
            chunks.append('<div class="head-keep">' + "".join(pending_heads) + "</div>")
            report.append(f"section {sn:02d} ends with a heading and no content")
        body.append(f'<section class="sec" id="{sid}">' + "".join(chunks) + "</section>")

    # fill template
    out = TEMPLATE
    out = re.sub(r"^<!doctype html>\s*<!--.*?-->", lambda _: (
        "<!doctype html>\n<!-- Generated from " + md_path.relative_to(ROOT).as_posix()
        + " using governance/canonical-contract-template.html. Do not edit by hand; edit the markdown source and re-render. -->"),
        out, count=1, flags=re.S)
    meta_rows = "".join(
        f'<dt>{html.escape(k)}</dt><dd class="verbatim">{inline(v)}</dd>' for k, v in meta if k != "Status")
    out = re.sub(r"<!-- META_ROWS:START.*?<!-- META_ROWS:END -->", lambda _: meta_rows, out, flags=re.S)
    out = re.sub(r"<!-- TOC:START -->.*?<!-- TOC:END -->", lambda _: "".join(toc), out, flags=re.S)
    out = re.sub(r"<!-- BODY:START.*?<!-- BODY:END -->", lambda _: "\n".join(body), out, flags=re.S)
    out = re.sub(r"\.badge:not\(\.design\).*?/\* template preview only \*/\n", "", out)
    values = {
        "REF": html.escape(ref), "TITLE": html.escape(title), "KIND": html.escape(kind), "DATE": html.escape(date),
        "VERSION": '<span class="unstated">Not stated in source</span>', "BADGE": badge, "BADGE_CLASS": bcls,
        "STATUS": inline(status), "SOURCE": html.escape(md_path.relative_to(ROOT).as_posix()),
    }
    for k, v in values.items():
        out = out.replace(f'<mark class="ph">{{{{{k}}}}}</mark>', v)
    # plain tokens (title element, class attribute, @page footer) take text only
    for k, v in values.items():
        out = out.replace(f"{{{{{k}}}}}", re.sub(r"<[^>]+>", "", v))
    left = re.findall(r"\{\{[A-Z_]+\}\}", out)
    if left:
        report.append(f"unfilled placeholders: {sorted(set(left))}")

    # text fidelity: every prose line of the source must appear in the output text
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", re.sub(r"<style>.*?</style>|<script.*?</script>", "", out, flags=re.S))))
    in_code = False
    missing = 0
    for ln, raw in enumerate(lines, 1):
        s = raw.strip()
        if s.startswith("```"):
            in_code = not in_code
            continue
        if in_code or not s or ln == 1 or re.match(r"^\|?[\s:|-]+\|?$", s):
            continue
        s = re.sub(r"^(#+|>|-|\d+\.)\s*", "", s)
        s = re.sub(r"^\*\*([^*]+?):\*\*\s*", "", s) if ln < 15 else s
        cells = [c.strip() for c in s.strip("|").split("|")] if raw.strip().startswith("|") else [s]
        for c in cells:
            plain = re.sub(r"\s+", " ", c.replace("**", "").replace("`", ""))
            plain = re.sub(r"(?<![*\w])\*(?!\s)([^*]+?)(?<!\s)\*(?![*\w])", r"\1", plain)
            if plain and plain not in text:
                missing += 1
                report.append(f"line {ln} text not found in output: {plain[:60]!r}")
    stats.pop("_rule_label", None)
    dest = md_path.with_suffix(".html")
    dest.write_bytes(out.encode("utf-8"))  # bytes, so Windows never converts LF to CRLF
    return {"file": md_path.name, "ref": ref, "title": title, "kind": kind, "date": date, "badge": badge, "sections": len(sections), **stats,
            "meta_fields": [k for k, _ in meta], "report": report}


if __name__ == "__main__":
    targets = [Path(p).resolve() for p in sys.argv[1:]] or sorted((ROOT / "governance").rglob("*CANONICAL-CONTRACT*.md"))
    results = [convert(p) for p in targets]
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(results, indent=1, ensure_ascii=False))
    sys.exit(1 if any(r["report"] for r in results) else 0)
