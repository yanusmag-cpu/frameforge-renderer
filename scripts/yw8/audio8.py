#!/usr/bin/env python3
"""YunoWorld v8 sound — NARRATION + short, clean, original synthesized effects ONLY where a visible action happens
(footsteps while someone walks/runs, chirps when the bird chirps, metal impacts, clicks, chains, spade, cart, crank ratchet…).
No music, no ambience beds, no wind/rumble/hum/drones/room tone; silence between effects; no reverb on the voice.
Voice chain (dry, close, crisp): high-pass 80 Hz, low-mid cut, presence lift, air shelf, de-ess, gentle 2:1 compression.
Usage: audio8.py <film>  ->  public/yw8-<film>-sound/bed.flac"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'yw6'))
from audio_common import SR, N, T, noise, lp, hp, bp, env, gate, load_mono, lufs, write, ROOT, clack, chirp, limit, norm_lufs   # noqa: E402
film = sys.argv[1]; OLD = ('canary', 'detonator', 'galveston'); D = 'yw7' if film in OLD else 'yw8'
CUES = json.loads((ROOT / 'scripts/yw8/cues.json').read_text()); TEMPO = json.loads((ROOT / 'scripts/yw8/tempo.json').read_text()); C = CUES[film]
WORDS = {k: json.loads(v) for k, v in re.findall(r'  (\w+): (\[.*\]),\n', (ROOT / f'src/{D}/words.ts').read_text())}
def w(word, n=1, fb=0.0):
    c = 0
    for a, b, x in WORDS.get(film, []):
        if re.sub(r"[^a-z0-9']", '', x.lower()) == word:
            c += 1
            if c == n: return a
    return fb
ss = lambda a, b, t: float(np.clip((t - a) / (b - a), 0, 1))
SKIP = {'detonator': {12}}.get(film, set())
CHAIN = ('highpass=f=80:poles=2,equalizer=f=250:t=q:w=1.1:g=-2.5,equalizer=f=3200:t=q:w=1.1:g=2.0,highshelf=f=9000:g=1.5,'
         'deesser=i=0.35:m=0.5:f=0.5:s=o,acompressor=threshold=0.13:ratio=2.0:attack=8:release=140:knee=4')
VO = np.zeros(N); SFX = np.zeros(N)
rows = json.load(open(ROOT / f'public/yw8-vo-{film}/timing.json'))['films'][film]; out = ROOT / f'public/yw8-{film}-sound'; out.mkdir(parents=True, exist_ok=True)
for i, (r, st) in enumerate(zip(rows, C)):
    if i in SKIP: continue
    tp = TEMPO.get(film, 1.0); dst = out / 'line.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / r['file']), '-af', (f'atempo={tp},' if tp > 1.001 else '') + CHAIN, '-ar', str(SR), '-ac', '1', str(dst)], check=True)
    c = load_mono(dst); c *= 10 ** ((-18.5 - lufs(c)) / 20); n = len(c); fi = min(n, int(.004 * SR)); c[:fi] *= np.linspace(0, 1, fi); c[-fi:] *= np.linspace(1, 0, fi)
    i0 = int(st * SR); m = min(n, N - i0); VO[i0:i0 + m] += c[:m]
(out / 'line.wav').unlink(missing_ok=True)
R = np.random.default_rng(7)
def put(at, sig, g=1.0):
    i = int(at * SR); m = min(len(sig), N - i)
    if i >= 0 and m > 0: SFX[i:i + m] += sig[:m] * g
# ---------- effect synths (original, short, dry) ----------
def step(surface='gravel', g=.05):
    d = .14; x = T(d); k = R.uniform(.85, 1.15)
    body = lp(noise(d), 260 * k) * env(d, .002, .045) * 1.0
    if surface == 'gravel': top = bp(noise(d), 1800 * k, 6000) * env(d, .001, .05) * .7
    elif surface == 'stone': top = bp(noise(d), 2500 * k, 7000) * env(d, .0005, .02) * .6
    elif surface == 'wood': top = bp(noise(d), 600 * k, 2200) * env(d, .001, .03) * .8 + np.sin(2 * np.pi * 190 * k * x) * np.exp(-x * 60) * .5
    elif surface == 'sand': top = bp(noise(d), 900 * k, 3500) * env(d, .004, .06) * .35
    else: top = bp(noise(d), 1200 * k, 4000) * env(d, .002, .05) * .4                 # grass/earth
    return (body + top) * g
def steps(t0, t1, every, surface='gravel', g=.05, jitter=.03):
    t = t0
    while t < t1: put(t + R.uniform(-jitter, jitter), step(surface, g)); t += every
def thud(g=.25, f=110): d = .3; x = T(d); return (lp(noise(d), 500) * env(d, .001, .07) + np.sin(2 * np.pi * f * x) * np.exp(-x * 14) * .8) * g
def clang(g=.3, f=310):
    d = 1.1; x = T(d); s = sum(np.sin(2 * np.pi * f * r * x + p) * np.exp(-x * (3 + r * 2)) * a for r, a, p in ((1, 1, 0), (2.76, .5, 1), (5.4, .3, 2), (8.9, .15, 3)))
    return (s * .5 + hp(noise(d), 2000) * env(d, .0005, .02) * .6) * g
def click(g=.12, f=3000): d = .05; return (bp(noise(d), f * .6, f * 1.8) * env(d, .0003, .008) + np.sin(2 * np.pi * f * T(d)) * env(d, .0003, .01) * .3) * g
def chain(d=1.5, g=.06):
    o = np.zeros(int(d * SR)); t = 0
    while t < d - .05: c = click(1, R.uniform(2200, 4200)) * R.uniform(.4, 1); i = int(t * SR); o[i:i + len(c)] += c[:len(o) - i]; t += R.uniform(.04, .11)
    return o * gate(d, .05, .2) * g
def scrape(g=.07): d = .45; return bp(noise(d), 700, 3200) * gate(d, .03, .25) * (1 + .5 * np.sin(2 * np.pi * 23 * T(d))) * g
def rattle(d=1.6, g=.05): o = lp(noise(d), 900) * (.6 + .4 * np.sin(2 * np.pi * 9 * T(d)) ** 2) * gate(d, .08, .3); return o * g
def coin(g=.06): d = .5; x = T(d); return sum(np.sin(2 * np.pi * f * x) * np.exp(-x * 9) for f in (3900, 5200, 6800)) / 3 * g
def crack(g=.5): d = .45; x = T(d); return (hp(noise(d), 900) * env(d, .0003, .03) + lp(noise(d), 300) * env(d, .002, .12) * .9 + np.sin(2 * np.pi * 70 * x) * np.exp(-x * 18) * .8) * g
def stone_crack(g=.25): d = .25; return (bp(noise(d), 1500, 6000) * env(d, .0005, .03) + lp(noise(d), 400) * env(d, .001, .06) * .5) * g
def blub(g=.08):
    d = .35; x = T(d); f = 300 + 900 * x / d; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, .005, .08) * g
def hiss(d=.6, g=.06): return hp(noise(d), 3000) * gate(d, .04, .2) * (1 - .5 * T(d) / d) * g
def squeal(d=1.4, g=.045):
    x = T(d); f = 2600 + 250 * np.sin(2 * np.pi * 3.1 * x) - 500 * x / d; s = np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return s * gate(d, .06, .5) * (1 - .6 * x / d) * g
def thunder(g=.3): d = 1.6; x = T(d); return (hp(noise(d), 1500) * env(d, .001, .05) * .6 + lp(noise(d), 260) * np.exp(-x * 2.6) * (1 - np.exp(-x * 40))) * g
def snap(g=.25): d = .3; return (bp(noise(d), 800, 5000) * env(d, .0005, .04) + lp(noise(d), 400) * env(d, .001, .1) * .6) * g
def flap(g=.12): d = .18; return bp(noise(d), 300, 2500) * env(d, .002, .05) * g
def ting(g=.08): d = 1.2; x = T(d); return sum(np.sin(2 * np.pi * f * x) * np.exp(-x * (2.5 + k)) for k, f in enumerate((2093, 3136, 4186, 5274))) / 4 * g
def whoomp(g=.18): d = .6; x = T(d); return (lp(noise(d), 600) * gate(d, .03, .4) * .8 + bp(noise(d), 1200, 5000) * env(d, .01, .2) * .3) * g
def splash(g=.15): d = .8; return (bp(noise(d), 400, 6000) * gate(d, .01, .5)) * g
def whistle(d=.9, g=.05): x = T(d); return (np.sin(2 * np.pi * 880 * x) * .6 + np.sin(2 * np.pi * 1320 * x) * .3 + bp(noise(d), 700, 2000) * .25) * gate(d, .06, .2) * g
def ratchet(t0, t1, every=.12, g=.07):
    t = t0
    while t < t1: put(t, click(g, 2600)); t += every
# ---------- per-film events (times follow the shot code) ----------
if film == 'canary':
    run = C[1] - .1; steps(run, run + 2.5, .17, 'gravel', .055)                         # three men run up the tunnel
    steps(C[2], C[6], .67, 'gravel', .045)                                              # Tom walks with the cage
    steps(C[7], C[8], .46, 'gravel', .04)                                               # Haldane walks in
    put(w('over', 1, 1.2) + .15, thud(.16, 140)); put(C[6] + .5, chirp(.05, 3400)); put(C[6] + .75, chirp(.04, 3700))
    drop = C[12] + .25; put(drop + .28, thud(.22, 150))
    steps(C[14] + .1, C[14] + 2.5, .16, 'gravel', .06)                                  # run for the shaft
    steps(C[15], C[18], .7, 'gravel', .045); steps(C[15] + .3, C[18], .7, 'gravel', .04)  # rescue team walks in
    put(C[18] + .5, clack(.2)); put(C[18] + 1.3, hiss(.6, .055))
    for k, dt in enumerate((1.05, 1.22, 1.5)): put(C[19] + dt, chirp(.05, 3300 + k * 250))
elif film == 'detonator':
    put(1.3, click(.14, 2400)); put(1.42, click(.1, 2900))                              # lead straps clipped over the rail
    steps(C[8], C[8] + 2.0, .5, 'gravel', .045); put(C[9] - .9, click(.12, 2500))        # fogman walks, clips the second
    tb = w('bang', 1, C[12]); V = 9
    for k in range(6): put(tb - 1.5 + k * .25, click(.08, 1700))                       # wheel beats over the rail joints
    for i, x in enumerate((-20, -16, -12)): put(tb + (x + 20) / V, crack(.55 if i == 0 else .4))
    put(C[14] + .1, squeal(min(2.2, (C[15] - C[14]) * .8), .042)); put(C[14] + (C[15] - C[14]) * .85, hiss(.7, .05))
elif film == 'galveston':
    put(1.0, flap(.1)); put(2.3, flap(.08))                                             # the flag cracks in the wind
    steps(C[5] + .2, C[6] - .3, .45, 'wood', .02); put(C[5] + .2, chain(C[6] - C[5] - .5, .035))   # halyard pulley as flags go up
    steps(C[6], C[7] + 1.6, .5, 'wood', .04); steps(C[6] + .25, C[7] + 1.6, .52, 'wood', .035)        # strolling on the plank walks
    for tt, g in ((C[9] + 1.6, .28), (C[10] + .6, .24), (C[12] + .4, .3)): put(tt, thunder(g))
    steps(C[10], C[10] + 2.0, .2, 'wood', .05)                                          # people run for shelter
    put(C[12] + 1.2, snap(.24))
elif film == 'mortsafe':
    steps(C[2] - .8, C[2] + .1, .45, 'grass', .05); put(w('out', 1, C[2] + 1), rattle(.35, .08))      # creeps up… lantern rattles on the recoil
    steps(C[4], C[5] + .3, .46, 'stone', .045)                                          # the anatomist on the cobbles
    steps(C[6], C[7], .5, 'grass', .04); steps(C[6] + .2, C[7], .5, 'grass', .035)
    t = C[7] + .2
    while t < C[8]: put(t, scrape(.07)); t += 1.14                                       # spade bites
    put(C[8], rattle(min(2.0, C[9] - C[8]), .045)); put(C[8] + 1.6, coin(.05)); put(C[8] + 1.75, coin(.04))
    drop0, land = C[11] + .2, C[12] - .25; put(drop0, chain(land - drop0, .05)); put(land, clang(.32, 180)); put(land + .02, thud(.25, 80))
    put(C[14] + 1.0, clang(.08, 420)); steps(C[14] + 1.8, C[15], .5, 'grass', .04)
    put(C[15], chain(2.2, .05)); cw = w('day', 1, C[16] + 1.5); put(cw, coin(.06)); put(cw + .12, coin(.045))
    steps(C[17], C[17] + 1.5, .5, 'stone', .03)
elif film == 'antikythera':
    put(.3, bp(noise(.5), 200, 1200) * gate(.5, .05, .3) * .04)                         # sand stirs as the lump is lifted
    cr = w('gears', 1, C[1] + .8); put(cr - .1, stone_crack(.22)); put(cr, blub(.06)); put(cr + .15, blub(.05))
    put(C[5] + 1.0, stone_crack(.08)); put(C[9] + .4, click(.08, 1800))                 # crust gives way; scanner starts
    ratchet(C[11], C[14], .14, .05)                                                     # the crank turns the gear train
    put(C[14] + .3, ting(.05)); ratchet(C[14] + .5, C[16], .2, .035)
elif film == 'fresnel':
    put(C[4] + .6, splash(.12)); put(C[4] + 1.2, thunder(.26))                         # sea breaks over the brig; lightning
    put(w('rings', 1, C[7] + .8), ting(.07))                                            # the thick lens becomes rings
    put(C[11] + .05, whoomp(.15))                                                       # the lamp flares inside the lens
    put(C[12] + 1.1, click(.1, 2200)); put(C[12] + 1.2, whoomp(.14))                    # keeper lights the first lamp
    steps(C[12], C[12] + 1.0, .5, 'stone', .03)
mix = VO + SFX; fade = np.minimum(1, np.arange(N) / SR / .05) * (1 - np.clip((np.arange(N) / SR - 59.5) / .5, 0, 1)); mix *= fade
mix = np.stack([mix, mix], 1)
CEIL = {'galveston': .6}.get(film, .74)
for _ in range(6): mix = limit(norm_lufs(mix, -14.0), CEIL)
write(out / 'bed.wav', mix); subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out / 'bed.wav'), '-c:a', 'flac', str(out / 'bed.flac')], check=True); (out / 'bed.wav').unlink()
print(film, 'lufs', round(lufs(mix), 2), 'peak', round(float(np.abs(mix).max()), 3))
