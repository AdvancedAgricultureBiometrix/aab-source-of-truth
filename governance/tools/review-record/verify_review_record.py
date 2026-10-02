"""Verify the retrospective review record against its source report.
Usage (from the repository root):
  python verify_review_record.py
Exit 0 only if the report hashes as recorded and the record, with every
'> **Record:**' line and the blank line after it removed between the
markers, reproduces the report byte for byte."""
import hashlib, sys
REC = 'governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02.md'
REP = 'governance/reviews/AAB-RETROSPECTIVE-DECISION-CROSS-REVIEW-2026-10-02-REPORT.md'
WANT = 'd5427b42da993197d08cf78b5cf314aafc8450c2becbc18aed7d405f5b3719b1'
rep_b = open(REP, 'rb').read(); rec = open(REC, 'rb').read().decode('utf-8')
ok = True
h = hashlib.sha256(rep_b).hexdigest()
print('report sha256:', h, 'OK' if h == WANT else 'MISMATCH'); ok &= h == WANT
print('record cites hash:', 'OK' if WANT in rec else 'MISSING'); ok &= WANT in rec
B = '<!-- BEGIN SOURCE REPORT (verbatim, with Record annotations) -->\n\n'
E = '\n<!-- END SOURCE REPORT -->'
inner = rec[rec.index(B) + len(B):rec.index(E)]
L = inner.split('\n'); out = []; i = 0
while i < len(L):
    if L[i].startswith('> **Record:** '):
        if i + 1 >= len(L) or L[i + 1] != '':
            print('annotation not followed by a blank line at', i); ok = False
        i += 2; continue
    out.append(L[i]); i += 1
same = '\n'.join(out).encode('utf-8') == rep_b
print('record reproduces report byte for byte:', 'OK' if same else 'FAIL'); ok &= same
sys.exit(0 if ok else 1)
