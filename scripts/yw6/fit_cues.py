#!/usr/bin/env python3
"""Lay the measured Onoda narration on the 60 s timeline (story-weighted pauses; gentle pitch-preserving tempo only if the
speech is too long) and write src/yw6/cues.ts + src/yw6/words.ts (absolute per-word caption times)."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
W = {'onoda': [1.3, .8, 1.0, .7, 1.1, .45, 1.2, .8, 1.1, .8, .9, .9, 1.3]}
START, END, MIN_GAP = .3, 57.6, .2
cues, words, tempo = {}, {}, {}
FIX = {'Hiru': 'Hiroo', 'Lt.': 'Lieutenant', '9,': 'ninth,', 'traveler': 'traveller', 'II': 'Two'}   # captions follow the script spelling, not Whisper's
for film in W:
    rows = json.load(open(ROOT / f'public/yw6-vo-{film}/timing.json'))['films'][film]
    raw = sum(r['dur'] for r in rows); tp = round(max(1.0, raw / 52.5), 3); tempo[film] = tp
    d = [r['dur'] / tp for r in rows]; w = W[film][:len(d) - 1]
    free = END - START - sum(d); assert free > len(w) * MIN_GAP, (film, free)
    gaps = [min(MIN_GAP + (free - len(w) * MIN_GAP) * x / sum(w), 1.4) for x in w]
    t = START; st = []
    for i, x in enumerate(d): st.append(round(t, 2)); t += x + (gaps[i] if i < len(gaps) else 0)
    cues[film] = st; wl = []
    for r, s0 in zip(rows, st):
        for a, b, txt in r.get('words', []):
            txt = FIX.get(txt.strip(), txt.strip())
            if txt: wl.append([round(s0 + a / tp, 2), round(s0 + b / tp, 2), txt.strip()])
    words[film] = wl; print(film, 'speech', round(raw, 1), 'tempo', tp, 'ends', round(t, 2), 'gaps', [round(g, 2) for g in gaps])
(ROOT / 'src/yw6/cues.ts').write_text('// Narration start times (s) per line (scripts/yw6/fit_cues.py writes this file).\nexport const CUES: Record<string, number[]> = {\n' + ''.join(f'  {k}: [{", ".join(str(x) for x in v)}],\n' for k, v in cues.items()) + '};\n')
(ROOT / 'src/yw6/words.ts').write_text('// Caption words [start, end, word] in film time (scripts/yw6/fit_cues.py writes this file).\nexport const WORDS: Record<string, [number, number, string][]> = {\n' + ''.join(f'  {k}: {json.dumps(v, ensure_ascii=False)},\n' for k, v in words.items()) + '};\n')
json.dump(cues, open(ROOT / 'scripts/yw6/cues.json', 'w'), indent=1); json.dump(tempo, open(ROOT / 'scripts/yw6/tempo.json', 'w'))
