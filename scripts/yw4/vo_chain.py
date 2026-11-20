#!/usr/bin/env python3
"""Studio chain for the YunoWorld narration: dry, close-mic, centred. Per sentence: high-pass 75 Hz, gentle low-mid cut,
light presence lift, de-esser, 2.2:1 compressor (no pumping), then every sentence matched to -19 LUFS so delivery stays even.
No reverb, no widening. Writes public/yw4-vo-clean/<film>/sNN.wav and a full clean narration track per film (48 kHz mono)."""
import json, subprocess, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'yw3'))
from sfx_lib import SR, load_mono, lufs, write, ROOT   # noqa: E402
CHAIN = ('highpass=f=75:poles=2,equalizer=f=230:t=q:w=1.1:g=-2.0,equalizer=f=3400:t=q:w=1.2:g=1.8,'
         'deesser=i=0.3:m=0.5:f=0.5:s=o,acompressor=threshold=0.125:ratio=2.2:attack=8:release=140:knee=4')
timing = json.load(open(ROOT / 'public/yw4-vo/timing.json'))['films']
cues = json.load(open(ROOT / 'scripts/yw4/cues.json'))
out = ROOT / 'public/yw4-vo-clean'
for film, rows in timing.items():
    (out / film).mkdir(parents=True, exist_ok=True); track = np.zeros(int(60 * SR))
    for r, st in zip(rows, cues[film]):
        src = ROOT / r['file']; dst = out / film / Path(r['file']).name
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src), '-af', CHAIN, '-ar', str(SR), '-ac', '1', str(dst)], check=True)
        c = load_mono(dst); c *= 10 ** ((-19 - lufs(c)) / 20); write(dst, np.stack([c, c], 1))
        i0 = int(st * SR); n = min(len(c), len(track) - i0); track[i0:i0 + n] += c[:n]
    pk = np.abs(track).max(); track *= min(1, .89 / pk)
    tmp = out / f'{film}_narration.wav'; write(tmp, np.stack([track, track], 1))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-ac', '1', str(out / f'YunoWorld_{film}_narration.wav')], check=True); tmp.unlink()
    print(film, 'clean narration', round(len(rows)), 'lines')
