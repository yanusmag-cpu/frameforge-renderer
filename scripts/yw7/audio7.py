#!/usr/bin/env python3
"""YunoWorld v7 sound: NARRATION ONLY + a handful of very short, clean, original synthesized effects on visible events.
No music, no ambience beds, no wind/rumble/hum/room tone, no reverb on the voice.
Voice chain (dry, close): high-pass, low-mid cut, light presence, de-esser, gentle 2:1 compression; each line levelled.
Usage: audio7.py <film>   -> public/yw7-<film>-sound/bed.flac (+ narration-only wav for reference)"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'yw6'))
from audio_common import SR, N, T, noise, lp, hp, bp, env, gate, load_mono, lufs, write, ROOT, thump, clack, chirp, creak, hiss, clink, limit, norm_lufs   # noqa: E402
import re
film = sys.argv[1]
CUES = json.loads((ROOT / 'scripts/yw7/cues.json').read_text()); TEMPO = json.loads((ROOT / 'scripts/yw7/tempo.json').read_text()); C = CUES[film]
WORDS = {k: json.loads(v) for k, v in re.findall(r'  (\w+): (\[.*\]),\n', (ROOT / 'src/yw7/words.ts').read_text())}
def w(word, n=1, fb=0.0):
    c = 0
    for a, b, x in WORDS.get(film, []):
        if re.sub(r"[^a-z0-9']", '', x.lower()) == word:
            c += 1
            if c == n: return a
    return fb
SKIP = {'detonator': {12}}.get(film, set())
CHAIN = ('highpass=f=80:poles=2,equalizer=f=240:t=q:w=1.1:g=-2.5,equalizer=f=3300:t=q:w=1.2:g=1.6,'
         'deesser=i=0.35:m=0.5:f=0.5:s=o,acompressor=threshold=0.13:ratio=2.0:attack=10:release=150:knee=4')
VO = np.zeros(N); SFX = np.zeros(N)
rows = json.load(open(ROOT / f'public/yw7-vo-{film}/timing.json'))['films'][film]; tmpd = ROOT / f'public/yw7-{film}-sound'; tmpd.mkdir(parents=True, exist_ok=True)
for i, (r, st) in enumerate(zip(rows, C)):
    if i in SKIP: continue
    tp = TEMPO.get(film, 1.0); dst = tmpd / 'line.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / r['file']), '-af', (f'atempo={tp},' if tp > 1.001 else '') + CHAIN, '-ar', str(SR), '-ac', '1', str(dst)], check=True)
    c = load_mono(dst); c *= 10 ** ((-18.5 - lufs(c)) / 20); n = len(c); fi = min(n, int(.004 * SR)); c[:fi] *= np.linspace(0, 1, fi); c[-fi:] *= np.linspace(1, 0, fi)
    i0 = int(st * SR); m = min(n, N - i0); VO[i0:i0 + m] += c[:m]
(tmpd / 'line.wav').unlink(missing_ok=True)
def put(at, sig, g=1.0):
    i = int(at * SR); m = min(len(sig), N - i)
    if m > 0: SFX[i:i + m] += sig[:m] * g
# ---- short, clean, original effects
def tap(g=.2, f=1800): d = .09; return (bp(noise(d), f * .6, f * 2) * env(d, .0005, .02) + np.sin(2 * np.pi * f * T(d)) * env(d, .0005, .025) * .4) * g
def feather_thud(g=.25): d = .22; return (lp(noise(d), 700) * env(d, .001, .05) + np.sin(2 * np.pi * 140 * T(d)) * env(d, .001, .06) * .6) * g
def valve(d=.55, g=.07): return hp(noise(d), 3000) * gate(d, .04, .18) * (1 - .5 * T(d) / d) * g
def crack(g=.5):
    d = .45; x = T(d); return (hp(noise(d), 900) * env(d, .0003, .03) * 1.0 + lp(noise(d), 300) * env(d, .002, .12) * .9 + np.sin(2 * np.pi * 70 * x) * np.exp(-x * 18) * .8) * g
def squeal(d=1.4, g=.05):
    x = T(d); f = 2600 + 250 * np.sin(2 * np.pi * 3.1 * x) - 500 * x / d; s = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return s * gate(d, .06, .5) * (1 - .6 * x / d) * g
def thunder(g=.35):
    d = 1.6; x = T(d); return (hp(noise(d), 1500) * env(d, .001, .05) * .6 + lp(noise(d), 260) * np.exp(-x * 2.6) * (1 - np.exp(-x * 40))) * g
def snap(g=.3): d = .3; return (bp(noise(d), 800, 5000) * env(d, .0005, .04) + lp(noise(d), 400) * env(d, .001, .1) * .6) * g
def pulley(d, g=.05):
    out = np.zeros(int(d * SR))
    for k in range(int(d * 4.5)): i = int(k / 4.5 * SR); c = tap(1, 2400 + 200 * (k % 2))[:max(0, len(out) - i)]; out[i:i + len(c)] += c
    return out * g
if film == 'canary':
    put(w('over', 1, 1.2) + .15, feather_thud(.22))                       # hook: the bird drops off its perch
    drop = C[12] + .25; put(drop + .28, feather_thud(.3))                   # the alarm: the bird hits the cage floor
    put(C[18] + .5, clack(.22)); put(C[18] + 1.3, valve(.6, .06))           # door shut, valve opened (oxygen hiss)
    for k, dt in enumerate((1.05, 1.22, 1.5)): put(C[19] + dt, chirp(.05, 3300 + k * 250))   # the bird is revived
elif film == 'detonator':
    tb = w('bang', 1, C[12]); V = 9
    for i, x in enumerate((-20, -16, -12)): put(tb + (x + 20) / V, crack(.55 if i == 0 else .4))
    put(C[14] + .1, squeal(min(2.2, (C[15] - C[14]) * .8), .045)); put(C[14] + (C[15] - C[14]) * .85, valve(.7, .05))
elif film == 'galveston':
    put(C[5] + .2, pulley(C[6] - C[5] - .5))                                 # flags run up the staff
    for tt, g in ((C[9] + 1.6, .3), (C[10] + .6, .26), (C[12] + .4, .32)): put(tt, thunder(g))
    put(C[12] + 1.2, snap(.25))                                              # the flagstaff breaks
mix = VO + SFX; fade = np.minimum(1, np.arange(N) / SR / .05) * (1 - np.clip((np.arange(N) / SR - 59.5) / .5, 0, 1)); mix *= fade
mix = np.stack([mix, mix], 1)
for _ in range(6): mix = limit(norm_lufs(mix, -14.0), .74)
write(tmpd / 'bed.wav', mix); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmpd / 'bed.wav'), '-c:a', 'flac', str(tmpd / 'bed.flac')], check=True); (tmpd / 'bed.wav').unlink()
print(film, 'lufs', round(lufs(mix), 2), 'peak', round(float(np.abs(mix).max()), 3), 'sfx events placed')
