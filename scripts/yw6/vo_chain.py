#!/usr/bin/env python3
"""Dry, close-mic studio chain for the YunoWorld v6 narration (no reverb, no widening): high-pass, low-mid cut, light presence,
de-esser, gentle 2.2:1 compression, each line matched to -19 LUFS. Writes public/yw6-vo-clean/<film>/sNN.wav and a full track."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'yw3'))
from sfx_lib import SR, load_mono, lufs, write, ROOT   # noqa: E402
CHAIN = ('highpass=f=75:poles=2,equalizer=f=230:t=q:w=1.1:g=-2.0,equalizer=f=3400:t=q:w=1.2:g=1.8,'
         'deesser=i=0.3:m=0.5:f=0.5:s=o,acompressor=threshold=0.125:ratio=2.2:attack=8:release=140:knee=4')
cues = json.load(open(ROOT / 'scripts/yw6/cues.json')); TEMPO = json.load(open(ROOT / 'scripts/yw6/tempo.json')); out = ROOT / 'public/yw6-vo-clean'
NAMES = {'onoda': 'Soldier_Who_Never_Surrendered'}
for film in cues:
    rows = json.load(open(ROOT / f'public/yw6-vo-{film}/timing.json'))['films'][film]
    (out / film).mkdir(parents=True, exist_ok=True); track = np.zeros(int(60 * SR))
    for r, st in zip(rows, cues[film]):
        src = ROOT / r['file']; dst = out / film / Path(r['file']).name
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-af', (f'atempo={TEMPO[film]},' if TEMPO.get(film, 1) > 1.001 else '') + CHAIN, '-ar', str(SR), '-ac', '1', str(dst)], check=True)
        c = load_mono(dst); c *= 10 ** ((-19 - lufs(c)) / 20); write(dst, np.stack([c, c], 1))
        i0 = int(st * SR); n = min(len(c), len(track) - i0); track[i0:i0 + n] += c[:n]
    track *= min(1, .89 / np.abs(track).max()); tmp = out / f'{film}_tmp.wav'; write(tmp, np.stack([track, track], 1))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-ac', '1', str(out / f'YunoWorld_{NAMES[film]}_narration.wav')], check=True); tmp.unlink()
    print(film, len(rows), 'lines')
