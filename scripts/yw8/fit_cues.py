#!/usr/bin/env python3
"""Lay the measured v7 narration on the 60 s timeline. The script's own dramatic pauses are kept (scaled to fill the film);
a gentle pitch-preserving tempo is used only if the speech would not fit. Captions use the SCRIPT spelling (caps = emphasis),
with times transferred from the recogniser's word timings. Writes src/yw7|yw8/{cues,words}.ts and scripts/yw8/{cues,tempo}.json (v8 narration)."""
import json, re, sys
from difflib import SequenceMatcher
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
START, END = .35, 57.7
# lines spoken by a sound effect instead of the voice (the take is not used): film -> {line index: seconds}
SFX_LINES = {'detonator': {12: .5}}
OLD = ('canary', 'detonator', 'galveston'); NEW = ('mortsafe', 'antikythera', 'fresnel')
films = [f for f in OLD + NEW if (ROOT / f'public/yw8-vo-{f}/timing.json').exists()]
def load(d):
    c = {k: json.loads(v) for k, v in re.findall(r'  (\w+): (\[.*\]),\n', (ROOT / f'src/{d}/cues.ts').read_text())}
    w = {k: json.loads(v) for k, v in re.findall(r'  (\w+): (\[.*\]),\n', (ROOT / f'src/{d}/words.ts').read_text())}
    return c, w
C7, W7 = load('yw7'); C8, W8 = load('yw8'); cues = {**C7, **C8}; words = {**W7, **W8}
tempo = json.loads((ROOT / 'scripts/yw8/tempo.json').read_text()) if (ROOT / 'scripts/yw8/tempo.json').exists() else {}
norm = lambda s: re.sub(r"[^a-z0-9']", '', s.lower())
def tokens(text): return [re.sub(r'^[^\w]+|[.,:;…]+$', '', w).replace('...', '') for w in text.split() if re.sub(r'[^\w]', '', w)]
def transfer(script, heard, dur):
    """Map script tokens onto recogniser word times; unmatched tokens are spread over the gaps."""
    st = tokens(script); hw = [w for w in heard if norm(w[2])]; out = [None] * len(st)
    sm = SequenceMatcher(a=[norm(x) for x in st], b=[norm(w[2]) for w in hw], autojunk=False)
    for tag, a0, a1, b0, b1 in sm.get_opcodes():
        if tag == 'equal':
            for k in range(a1 - a0): out[a0 + k] = [hw[b0 + k][0], hw[b0 + k][1]]
        elif tag == 'replace' and b1 > b0:
            t0, t1 = hw[b0][0], hw[b1 - 1][1]; n = a1 - a0
            for k in range(n): out[a0 + k] = [t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n]
    for i in range(len(out)):                       # fill holes between known neighbours
        if out[i] is None:
            p = next((out[j][1] for j in range(i - 1, -1, -1) if out[j]), 0.0); q = next((out[j][0] for j in range(i + 1, len(out)) if out[j]), dur)
            run = [j for j in range(i, len(out)) if out[j] is None]; run = run[:next((k for k in range(1, len(run)) if run[k] != run[k - 1] + 1), len(run))]
            for k, j in enumerate(run): out[j] = [p + (q - p) * k / len(run), p + (q - p) * (k + 1) / len(run)]
    return [[a, b, w] for (a, b), w in zip(out, st)]
script = json.loads((ROOT / 'scripts/yw-tts8/scripts.json').read_text())['films']
for film in films:
    rows = json.load(open(ROOT / f'public/yw8-vo-{film}/timing.json'))['films'][film]; lines = script[film]; assert len(rows) == len(lines), film
    sk = SFX_LINES.get(film, {})
    d_raw = [sk.get(i, r['dur']) for i, r in enumerate(rows)]; p = [l[2] for l in lines][:-1]
    S = sum(x for i, x in enumerate(d_raw) if i not in sk); win = END - START
    tp = round(min(1.08, max(1.0, S / (win - sum(d_raw[i] for i in sk) - sum(p) * .8))), 3); tempo[film] = tp
    d = [x if i in sk else x / tp for i, x in enumerate(d_raw)]; free = win - sum(d); k = free / sum(p)
    lo, hi = 0.0, 20.0                                   # water-fill: scale pauses, but no single pause longer than 0.85 s
    for _ in range(60):
        k = (lo + hi) / 2; tot = sum(max(.15, min(x * k, .85)) for x in p)
        lo, hi = (k, hi) if tot < free else (lo, k)
    gaps = [max(.15, min(x * k, .85)) for x in p]
    t = START; st = []
    for i, x in enumerate(d): st.append(round(t, 2)); t += x + (gaps[i] if i < len(gaps) else 0)
    cues[film] = st; wl = []
    for i, (r, s0) in enumerate(zip(rows, st)):
        if i in sk: wl.append([s0, round(s0 + d[i] + .3, 2), lines[i][0].rstrip('.') + '!']); continue
        for a, b, txt in transfer(lines[i][0], r.get('words', []), r['dur']): wl.append([round(s0 + a / tp, 2), round(s0 + b / tp, 2), txt])
    words[film] = wl
    print(film, 'speech', round(S, 1), 'tempo', tp, 'ends', round(t, 2), 'pause scale', round(k, 2), 'mismatch', [i for i, r in enumerate(rows) if r['wer'] > 0 and i not in sk])
for d, fl in (('yw7', OLD), ('yw8', NEW)):
    (ROOT / f'src/{d}/cues.ts').write_text('// Narration start times (s) per line (scripts/yw8/fit_cues.py writes this file).\nexport const CUES: Record<string, number[]> = {\n' + ''.join(f'  {k}: [{", ".join(str(x) for x in cues[k])}],\n' for k in fl if k in cues) + '};\n')
    (ROOT / f'src/{d}/words.ts').write_text('// Caption words [start, end, word] in film time (scripts/yw8/fit_cues.py writes this file).\nexport const WORDS: Record<string, [number, number, string][]> = {\n' + ''.join(f'  {k}: {json.dumps(words.get(k, []), ensure_ascii=False)},\n' for k in fl) + '};\n')
json.dump(cues, open(ROOT / 'scripts/yw8/cues.json', 'w'), indent=1); json.dump(tempo, open(ROOT / 'scripts/yw8/tempo.json', 'w'))
