#!/usr/bin/env python3
"""Lay the measured narration sentences on the 60 s timeline: sequential, with story-aware pauses (longer after the hook,
before reveals, before the ending) scaled so the last line ends ~2.4 s before the end card fades. Writes src/yw4/cues.ts."""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
timing = json.load(open(ROOT / sys.argv[1]))['films']
# relative pause weights AFTER each sentence (index = sentence number - 1)
W = {'peigneur': [1.6, 1.2, .9, .8, .6, 1.0, .8, .9, .9, 1.4, .5, 1.3],
     'molasses': [.8, 1.3, .7, .8, .9, .7, .8, 1.0, .5, .9, 1.2, 1.3],
     'sinkhole': [1.6, 1.0, .7, .8, .9, .9, 1.2, .8, 1.0, 1.0, 1.4]}
END, START, MIN_GAP = 57.6, .3, .18
cues = {}
for film, rows in timing.items():
    d = [r['dur'] for r in rows]; w = W[film][:len(d) - 1]
    free = END - START - sum(d); assert free > len(w) * MIN_GAP, (film, free)
    gaps = [MIN_GAP + (free - len(w) * MIN_GAP) * x / sum(w) for x in w]
    gaps = [min(g, 2.2) for g in gaps]                       # never a dead pause longer than ~2 s
    t = START; st = []
    for i, x in enumerate(d): st.append(round(t, 2)); t += x + (gaps[i] if i < len(gaps) else 0)
    cues[film] = st; print(film, 'speech', round(sum(d), 1), 'ends', round(t, 2), 'gaps', [round(g, 2) for g in gaps])
src = '// Narration start times (s) per sentence, measured from the generated narration (scripts/yw4/fit_cues.py writes this file).\nexport const CUES: Record<string, number[]> = {\n'
src += ''.join(f'  {k}: [{", ".join(str(x) for x in v)}],\n' for k, v in cues.items()) + '};\n'
(ROOT / 'src/yw4/cues.ts').write_text(src); json.dump(cues, open(ROOT / 'scripts/yw4/cues.json', 'w'), indent=1)
