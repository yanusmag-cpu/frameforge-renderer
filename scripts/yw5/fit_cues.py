#!/usr/bin/env python3
"""Lay each film's measured narration lines on the 60 s timeline (story-weighted pauses, last line ends ~2.4 s before the end)
and write src/yw5/cues.ts plus src/yw5/words.ts (absolute per-word caption times from the Whisper word timestamps)."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
W = {'boxbrown': [1.4, .7, .7, .9, .6, 1.0, 1.3, .8, 1.0, .9, 1.1, .5, 1.2],
     'bridge': [1.2, .9, 1.0, 1.3, .7, .6, .9, 1.0, .9, 1.1, 1.3],
     'canary': [1.2, .8, .8, .7, 1.0, .6, .9, .9, 1.0, .8, .9, 1.3]}
END, START, MIN_GAP = 57.6, .3, .18
TEMPO = {'canary': 1.06, 'bridge': 1.03}   # gentle pitch-preserving speed-up so the longest script fits the 60 s format (applied in vo_chain.py)
ENDS = {'canary': 58.0, 'bridge': 58.0}
cues, words = {}, {}
for film in W:
    rows = json.load(open(ROOT / f'public/yw5-vo-{film}/timing.json'))['films'][film]
    tp = TEMPO.get(film, 1.0); d = [r['dur'] / tp for r in rows]; w = W[film][:len(d) - 1]
    free = ENDS.get(film, END) - START - sum(d); assert free > len(w) * MIN_GAP, (film, free)
    gaps = [min(MIN_GAP + (free - len(w) * MIN_GAP) * x / sum(w), 2.2) for x in w]
    t = START; st = []
    for i, x in enumerate(d): st.append(round(t, 2)); t += x + (gaps[i] if i < len(gaps) else 0)
    cues[film] = st; wl = []
    for r, s0 in zip(rows, st):
        for wd in r.get('words', []):
            a, b, txt = (wd['start'], wd['end'], wd['word']) if isinstance(wd, dict) else wd
            txt = txt.strip()
            if txt: wl.append([round(s0 + a / tp, 2), round(s0 + b / tp, 2), txt])
    words[film] = wl; print(film, 'speech', round(sum(d), 1), 'ends', round(t, 2), 'words', len(wl), 'gaps', [round(g, 2) for g in gaps])
src = '// Narration start times (s) per line, measured from the generated narration (scripts/yw5/fit_cues.py writes this file).\nexport const CUES: Record<string, number[]> = {\n'
src += ''.join(f'  {k}: [{", ".join(str(x) for x in v)}],\n' for k, v in cues.items()) + '};\n'
(ROOT / 'src/yw5/cues.ts').write_text(src); json.dump(cues, open(ROOT / 'scripts/yw5/cues.json', 'w'), indent=1); json.dump(TEMPO, open(ROOT / 'scripts/yw5/tempo.json', 'w'))
ws = '// Caption words [start, end, word] in film time (scripts/yw5/fit_cues.py writes this file).\nexport const WORDS: Record<string, [number, number, string][]> = {\n'
ws += ''.join(f'  {k}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in words.items()) + '};\n'
(ROOT / 'src/yw5/words.ts').write_text(ws)
