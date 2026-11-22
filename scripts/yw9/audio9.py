#!/usr/bin/env python3
"""YunoWorld v9 sound: NARRATION (Blaze, one continuous take per passage, dry) + short original synthesized effects ONLY on
visible actions. No music, no ambience, no wind/room tone, no loops; silence between effects; no reverb/echo on the voice.
Usage: audio9.py <film>  ->  public/yw9-<film>-sound/bed.flac"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'yw6'))
from audio_common import SR, N, T, noise, lp, hp, bp, env, gate, load_mono, lufs, write, ROOT, clack, chirp, limit, norm_lufs   # noqa: E402
film = sys.argv[1]
WORDS = json.load(open(ROOT / f'public/yw9-vo-{film}/words.json'))
def w(word, n=1, fb=0.0):
    c = 0
    for x in WORDS:
        if re.sub(r"[^a-z0-9']", '', x['w'].lower()) == word:
            c += 1
            if c == n: return x['s']
    return fb
ss = lambda a, b, t: float(np.clip((t - a) / (b - a), 0, 1))
CHAIN = ('highpass=f=80:poles=2,equalizer=f=250:t=q:w=1.1:g=-2.5,equalizer=f=3200:t=q:w=1.1:g=2.0,highshelf=f=9000:g=1.5,'
         'deesser=i=0.35:m=0.5:f=0.5:s=o,acompressor=threshold=0.13:ratio=2.0:attack=8:release=140:knee=4')
out = ROOT / f'public/yw9-{film}-sound'; out.mkdir(parents=True, exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / f'public/yw9-vo-{film}/vo.wav'), '-af', CHAIN, '-ar', str(SR), '-ac', '1', str(out / 'vo.wav')], check=True)
v = load_mono(out / 'vo.wav'); v *= 10 ** ((-18.5 - lufs(v)) / 20); VO = np.zeros(N); VO[:min(N, len(v))] = v[:N]; (out / 'vo.wav').unlink()
SFX = np.zeros(N); R = np.random.default_rng(9)
def put(at, sig, g=1.0):
    i = int(at * SR); m = min(len(sig), N - i)
    if i >= 0 and m > 0: SFX[i:i + m] += sig[:m] * g
def step(surface='wood', g=.05):
    d = .14; x = T(d); k = R.uniform(.85, 1.15); body = lp(noise(d), 260 * k) * env(d, .002, .045)
    if surface == 'stone': top = bp(noise(d), 2500 * k, 7000) * env(d, .0005, .02) * .6
    elif surface == 'wood': top = bp(noise(d), 600 * k, 2200) * env(d, .001, .03) * .8 + np.sin(2 * np.pi * 190 * k * x) * np.exp(-x * 60) * .5
    else: top = bp(noise(d), 1200 * k, 4000) * env(d, .002, .05) * .4
    return (body + top) * g
def steps(t0, t1, every, surface='wood', g=.05):
    t = t0
    while t < t1: put(t + R.uniform(-.02, .02), step(surface, g)); t += every
def thud(g=.25, f=110): d = .3; x = T(d); return (lp(noise(d), 500) * env(d, .001, .07) + np.sin(2 * np.pi * f * x) * np.exp(-x * 14) * .8) * g
def clang(g=.3, f=310):
    d = .9; x = T(d); s = sum(np.sin(2 * np.pi * f * r * x + p) * np.exp(-x * (4 + r * 2.5)) * a for r, a, p in ((1, 1, 0), (2.76, .5, 1), (5.4, .3, 2)))
    return (s * .5 + hp(noise(d), 2000) * env(d, .0005, .02) * .6) * g
def click(g=.12, f=3000): d = .05; return (bp(noise(d), f * .6, f * 1.8) * env(d, .0003, .008) + np.sin(2 * np.pi * f * T(d)) * env(d, .0003, .01) * .3) * g
def flap(g=.12): d = .18; return bp(noise(d), 300, 2500) * env(d, .002, .05) * g
def flutter(t0, n=5, g=.09):
    for i in range(n): put(t0 + i * .07 + R.uniform(-.01, .01), flap(g * R.uniform(.7, 1)))
def coo(g=.05, f=430):
    d = .55; x = T(d); fm = f * (1 + .06 * np.sin(2 * np.pi * 7 * x)) * (1 - .12 * x / d); s = np.sin(2 * np.pi * np.cumsum(fm) / SR)
    return lp(s * gate(d, .05, .25) * (.6 + .4 * np.sin(np.pi * x / d)), 1400) * g
def peck(g=.07): d = .04; x = T(d); return (bp(noise(d), 1800, 6500) * env(d, .0002, .006) + np.sin(2 * np.pi * 2400 * x) * np.exp(-x * 400) * .4) * g
def servo(g=.04): d = .22; x = T(d); f = 900 + 500 * x / d; return np.sin(2 * np.pi * np.cumsum(f) / SR) * gate(d, .02, .08) * .5 * g
def whistle_fall(d=1.5, g=.05):
    x = T(d); f = 1400 - 700 * (x / d) ** 1.4; s = np.sin(2 * np.pi * np.cumsum(f) / SR) * .6 + bp(noise(d), 600, 2400) * .3
    return s * gate(d, .3, .03) * (.4 + .6 * x / d) * g
def boom(g=.4): d = 1.4; x = T(d); return (lp(noise(d), 180) * np.exp(-x * 3.2) * (1 - np.exp(-x * 60)) + hp(noise(d), 1200) * env(d, .001, .05) * .5 + np.sin(2 * np.pi * 48 * x) * np.exp(-x * 5) * .7) * g
def stamp(g=.35): d = .35; x = T(d); return (lp(noise(d), 700) * env(d, .0008, .06) + np.sin(2 * np.pi * 95 * x) * np.exp(-x * 22) * .9 + hp(noise(d), 2500) * env(d, .0003, .01) * .5) * g
def paper(d=.8, g=.035): return bp(noise(d), 1500, 7000) * gate(d, .05, .3) * (1 + .4 * np.sin(2 * np.pi * 13 * T(d))) * g
def roll(d=1.4, g=.045): x = T(d); return lp(noise(d), 260) * (.7 + .3 * np.sin(2 * np.pi * 11 * x)) * gate(d, .15, .3) * g
def peaks(fn, t0, t1):
    ts = np.arange(t0, t1, 1 / 600); v = np.array([fn(t) for t in ts]); out_ = []
    for i in range(1, len(v) - 1):
        if v[i] > v[i - 1] and v[i] >= v[i + 1] and v[i] > .5: out_.append(ts[i])
    return out_
def peck_cycle(t, rate, amp=1.0):
    p = (t * rate) % 1
    return amp * (1 - (1 - p / .35) ** 3 if p < .35 else 1 - ((lambda k: k * k * (3 - 2 * k))((p - .35) / .65)))
if film == 'pigeon':
    A = dict(no=w('no', 1, 3.2), wants=w('wants', 1, 5.7), war=w('world', 1, 8.9), so=w('so', 1, 12.4), officials=w('officials', 1, 16.6), trick=w("here's", 1, 21.9),
             pecks=w('pecks', 1, 26.4), drifts=w('drifts', 1, 28.6), one=w('one', 1, 33.3), but=w('but', 2, 37.3), see=w('see', 1, 41.0), amused=w('amused', 1, 47.0),
             after=w('after', 1, 51.0), ran=w('kept', 1, 54.4), cancelled=w('cancelled', 1, 0) or w('canceled', 1, 49.5))
    flutter(.35, 4, .07); put(1.1, coo(.035))                                              # the pigeon wriggles in Skinner's hands
    put(A['wants'] + .3, clang(.16, 520)); put(A['wants'] + .32, click(.12, 1800))        # hatch snaps shut
    put(A['war'], whistle_fall(1.5, .05)); put(A['war'] + 1.5, boom(.34))                 # bomb whistles down and misses
    wk1 = A['officials'] - 1.0; steps(A['so'], wk1, 1 / 1.6 / 2, 'wood', .045)          # Skinner walks in carrying the box
    put(A['officials'] - .45, thud(.14, 150)); put(A['officials'] - .2, coo(.04, 470))    # box set on the table; a coo from inside
    put(A['officials'] + 2.1, paper(min(1.4, A['trick'] - A['officials'] - 2.6), .035))     # contract slides across the felt
    for tt in peaks(lambda t: peck_cycle(t, 1.3) * .3 / .3, A['trick'] + .2, A['pecks']): put(tt, peck(.035))
    for tt in peaks(lambda t: peck_cycle(t, 2.2), A['pecks'], A['drifts']): put(tt, peck(.07))
    u0 = A['drifts']; du = A['one'] - A['drifts']; put(u0 + du * .3, servo(.05)); put(u0 + du * .55, servo(.05)); put(u0 + du * .75, servo(.04))   # fins kick
    one, but = A['one'], A['but']
    for tt in peaks(lambda t: peck_cycle(t, 2.5 + 4.5 * min(1, max(0, (t - one) / (but - one)))), one, but): put(tt, peck(.065))
    put(A['but'] + .5, coo(.04, 380))                                                       # the confused pigeon
    steps(A['see'] + 3.4, A['amused'], .36, 'stone', .045)                                   # the traveller walks off
    put(A['cancelled'], stamp(.34))
    fl = A['after'] + 1.0; flutter(fl, 6, .09); put(A['after'] + .6, coo(.045, 450))          # Navy pigeon flaps
    put(A['ran'] + .2, roll(1.4, .05)); put(A['ran'] + 1.6, clack(.12)); put(A['ran'] + 2.4, coo(.035, 520))   # console rolls in, docks
mix = VO + SFX; fade = np.minimum(1, np.arange(N) / SR / .05) * (1 - np.clip((np.arange(N) / SR - 59.5) / .5, 0, 1)); mix *= fade
mix = np.stack([mix, mix], 1)
for _ in range(6): mix = limit(norm_lufs(mix, -14.0), .74)
write(out / 'bed.wav', mix); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'bed.wav'), '-c:a', 'flac', str(out / 'bed.flac')], check=True); (out / 'bed.wav').unlink()
print(film, 'lufs', round(lufs(mix), 2), 'peak', round(float(np.abs(mix).max()), 3))
