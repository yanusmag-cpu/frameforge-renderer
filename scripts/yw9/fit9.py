#!/usr/bin/env python3
"""Write src/yw9/words9.ts from each v9 narration's Whisper word stamps (public/yw9-vo-<film>/words.json)."""
import json, glob
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
films = {}
for f in sorted(glob.glob(str(ROOT / 'public/yw9-vo-*/words.json'))):
    name = Path(f).parent.name.replace('yw9-vo-', ''); W = json.load(open(f))
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
(ROOT / 'src/yw9/words9.ts').write_text('\n'.join(lines) + '\n'); print('words9.ts', {k: len(v) for k, v in films.items()})
