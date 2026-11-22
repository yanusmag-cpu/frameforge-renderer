#!/usr/bin/env python3
"""Write src/yw9/words9.ts from each v9 narration's Whisper word stamps (public/yw9-vo-<film>/words.json)."""
import json, glob
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
films = {}


def syl(word):
    import re as _re
    w = _re.sub(r"[^a-z]", "", word.lower()) or "x"; n = len(_re.findall(r"[aeiouy]+", w)); return max(1, n - (1 if w.endswith('e') and n > 1 else 0)) + (2 if _re.search(r"\d", word) else 0)


def repair(name, W):
    """If Whisper dropped words inside a passage (its words are checked take by take, so the audio is right), re-place
    that passage's scripted words over its voiced regions by syllable weight (energy-based forced alignment)."""
    import numpy as np, wave
    base = ROOT / f'public/yw9-vo-{name}'; pj = base / 'passages.json'
    if not pj.exists() or not (base / 'vo.wav').exists(): return W
    P = json.load(open(pj)); spans = P['spans']; texts = P['passages']
    wv = wave.open(str(base / 'vo.wav')); sr = wv.getframerate(); ch = wv.getnchannels(); y = np.frombuffer(wv.readframes(wv.getnframes()), '<i2').astype(float) / 32768; wv.close()
    y = y if ch == 1 else y.reshape(-1, ch).mean(1)
    out = []
    cuts = [-1e9] + [(spans[i][1] + spans[i + 1][0]) / 2 for i in range(len(spans) - 1)] + [1e9]
    for i, ((a, b), text) in enumerate(zip(spans, texts)):
        got = [w for w in W if cuts[i] <= w['s'] < cuts[i + 1]]; want = text.split()
        if len(got) >= len(want) * .92: out += got; continue
        hop = int(sr * .01); e = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(int(a * sr), int(b * sr), hop)])
        on = e > max(e.max() * .06, 1e-4); tt = a + np.arange(len(e)) * .01
        voiced = tt[on]; cum = np.arange(1, len(voiced) + 1)
        wt = np.array([syl(x) for x in want], float); edges = np.concatenate([[0], np.cumsum(wt)]) / wt.sum() * len(voiced)
        for i, x in enumerate(want):
            i0 = int(min(len(voiced) - 1, edges[i])); i1 = int(min(len(voiced) - 1, max(i0, edges[i + 1] - 1)))
            out.append({'w': x, 's': float(voiced[i0]), 'e': float(voiced[i1]) + .01})
        print(f'  {name}: realigned passage {a:.1f}-{b:.1f}s ({len(got)} -> {len(want)} words)')
    return out


for f in sorted(glob.glob(str(ROOT / 'public/yw9-vo-*/words.json'))):
    name = Path(f).parent.name.replace('yw9-vo-', ''); W = json.load(open(f))
    W = repair(name, W)
    out = []
    for w in W:
        if not w['w'].strip(): continue
        t = w['w'].strip()
        if out and (t[0] in ',-.' and len(t) > 1 and t[1:2].isalnum() or t[0] == '%'):   # Whisper splits "25,000" / "X-ray" / "20-foot": glue back
            out[-1][2] += t; out[-1][1] = round(w['e'], 2); continue
        out.append([round(w['s'], 2), round(w['e'], 2), t])
    films[name] = out
lines = ['// Caption words [start, end, word] in film time (scripts/yw9/fit9.py writes this file from the narration\'s Whisper word stamps).',
         'export const WORDS: Record<string, [number, number, string][]> = {']
for k, v in films.items(): lines.append(f'  {k}: {json.dumps(v, ensure_ascii=False)},')
lines.append('};')
NEW = {'knock', 'pigcam', 'bath', 'spit', 'lick'}   # films whose length follows their narration (others are 60 s)
import math
lines.append('/** frames per film: narration end + 1.2 s, for the films that are cut to their narration */')
lines.append('export const DUR9: Record<string, number> = {' + ', '.join(f"{k}: {math.ceil((v[-1][1] + 1.2) * 30)}" for k, v in films.items() if k in NEW and v) + '};')
(ROOT / 'src/yw9/words9.ts').write_text('\n'.join(lines) + '\n'); print('words9.ts', {k: len(v) for k, v in films.items()})
