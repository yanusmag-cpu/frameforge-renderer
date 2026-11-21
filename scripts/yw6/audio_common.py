"""Shared bits for the YunoWorld v6 sound beds: cue table, dry narration placement, extra original synth sounds."""
import json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'yw3'))
from sfx_lib import *   # noqa: F401,F403,E402
from sfx_lib import SR, N, ROOT, T, noise, lp, hp, bp, env, gate, load_mono, lufs   # noqa: E402
CUES = json.load(open(ROOT / 'scripts/yw6/cues.json'))
def vo(film, gain_lufs=-17.0):
    """Clean, dry, centred narration at the cue times (no reverb, no stretching)."""
    VO = np.zeros((N, 2)); files = sorted((ROOT / 'public/yw6-vo-clean' / film).glob('s*.wav')); clips = [load_mono(f) for f in files]
    g = 10 ** ((gain_lufs - lufs(np.concatenate(clips))) / 20)
    for st, c in zip(CUES[film], clips): i0 = int(st * SR); n = min(len(c), N - i0); VO[i0:i0 + n] += (c[:n] * g)[:, None]
    return VO
def crickets(d, g=.03):
    x = T(d); ch = (np.sin(2 * np.pi * 4300 * x) * (np.sin(2 * np.pi * 28 * x) > .2)) * (np.sin(2 * np.pi * .9 * x + 1) > .1)
    return bp(ch + noise(d) * .05, 3600, 5200) * g
def step(g=.1, f=90):
    d = .2; return (lp(noise(d), 1100) * env(d, .001, .04) + np.sin(2 * np.pi * f * T(d)) * env(d, .001, .05) * .5) * g
def drip(g=.05):
    d = .3; x = T(d); return np.sin(2 * np.pi * np.cumsum(700 + 1500 * np.exp(-x * 35)) / SR) * env(d, .001, .05) * g
def groan(d, g=.08, f=55):
    x = T(d); fm = f * (1 + .25 * np.sin(2 * np.pi * .7 * x) + .08 * np.sin(2 * np.pi * 3.1 * x)); ph = np.cumsum(fm) / SR
    return lp(np.sin(2 * np.pi * ph) + .5 * np.sin(4 * np.pi * ph) + .3 * np.sign(np.sin(6 * np.pi * ph)), 900) * gate(d, .3, .5) * g
def rivet(g=.2):
    d = .12; return (hp(noise(d), 1800) * env(d, .0005, .025) + np.sin(2 * np.pi * 2400 * T(d)) * env(d, .0005, .03) * .4) * g
def gloop(d, g=.12):
    """Thick, slow liquid: low rolling roar with sticky sub-bubbles."""
    x = T(d); base = lp(noise(d), 260) * (.7 + .3 * np.sin(2 * np.pi * .8 * x)); bub = np.zeros_like(x); R = np.random.default_rng(3)
    for t0 in R.uniform(0, d, int(d * 9)): i = int(t0 * SR); n = min(int(.18 * SR), len(x) - i); tt = np.arange(n) / SR; bub[i:i + n] += np.sin(2 * np.pi * (90 + 160 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 14) * .5
    return (base + lp(bub, 700)) * gate(d, .3, .6) * g
def hooves(d, g=.06, rate=2.6):
    out = np.zeros(int(d * SR))
    for k in range(int(d * rate * 2)): t0 = k / (rate * 2) + (.05 if k % 2 else 0); i = int(t0 * SR); c = step(1, 140 + (k % 4) * 15)[:len(out) - i] if i < len(out) else []; out[i:i + len(c)] += c
    return out * g
def tv(d, g=.02):
    return bp(noise(d), 300, 2400) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 3.3 * T(d)))) * g
# ---- yw5 additions (all original synthesis)
def chuff(d, g=.08, rate=3.2):
    """Steam locomotive: rhythmic exhaust bursts over a rail rumble with joint clicks."""
    x = T(d); bursts = bp(noise(d), 300, 3000) * (np.sin(2 * np.pi * rate * x) > .55) * (.6 + .4 * np.sin(2 * np.pi * rate / 2 * x) ** 2)
    out = lp(bursts, 2500) + lp(noise(d), 140) * .6
    for k in range(int(d * 1.6)): i = int((k / 1.6 + .2) * SR); c = clack(.5)[:max(0, len(out) - i)]; out[i:i + len(c)] += c * .35
    return out * gate(d, .4, .6) * g
def steamwhistle(d=1.4, g=.05):
    x = T(d); return sum(np.sin(2 * np.pi * f * x) for f in (523, 659, 784)) * (bp(noise(d), 400, 3000) * .3 + 1) * gate(d, .08, .4) * g
def horn(d=1.6, g=.07):
    x = T(d); return lp(saw(110, d) + saw(165, d, .003) * .6, 900) * gate(d, .1, .5) * g
def paddle(d, g=.06, rate=1.4):
    x = T(d); return lp(noise(d), 900) * (.4 + .6 * np.abs(np.sin(np.pi * rate * x)) ** 4) * gate(d, .3, .6) * g
def coin(g=.1, f=3100):
    d = .6; x = T(d); return sum(np.sin(2 * np.pi * f * k * x) * np.exp(-x * (8 + 5 * k)) for k in (1, 1.53, 2.31)) * g
def heartbeat(d, g=.18, bpm=62):
    out = np.zeros(int(d * SR))
    for k in range(int(d * bpm / 60)):
        for dt, a in ((0, 1), (.22, .7)): i = int((k * 60 / bpm + dt) * SR); c = (thump(1) * a)[:max(0, len(out) - i)]; out[i:i + len(c)] += c
    return lp(out, 160) * g
def pry(d=1.0, g=.14):
    """Nail being levered out of wood: rising squeal + splinter crackle."""
    x = T(d); f = 600 + 900 * (x / d) ** 2; sq = bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 500, 3000) * .3
    return (sq * gate(d, .1, .2) + crackle(d, 40, .4)) * g
def chain(d, g=.08, rate=4):
    out = np.zeros(int(d * SR)); R = np.random.default_rng(5)
    for t0 in R.uniform(0, d, int(d * rate)): i = int(t0 * SR); c = (clack(1) * R.uniform(.3, 1))[:max(0, len(out) - i)]; out[i:i + len(c)] += c
    return hp(out, 900) * g
def river(d, g=.08):
    x = T(d); return (lp(noise(d), 700) * (.7 + .3 * np.sin(2 * np.pi * .23 * x)) + bp(noise(d), 1500, 5000) * .15) * g
def hiss(d, g=.08):
    return hp(noise(d), 2500) * gate(d, .05, .3) * g
def clink(g=.12):
    d = .4; x = T(d); return (sum(np.sin(2 * np.pi * f * x) * np.exp(-x * k) for f, k in ((1900, 22), (2950, 30), (4200, 40))) + hp(noise(d), 3000) * env(d, .0005, .01)) * g
def chirp(g=.05, f0=3200):
    d = .09; x = T(d); f = f0 + 1400 * np.sin(np.pi * x / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / d) * g
def song(d, g=.05, rate=7):
    """Canary-style trill bursts (original synthesis, not a recording)."""
    out = np.zeros(int(d * SR)); R = np.random.default_rng(11); t0 = 0.0
    while t0 < d - .1:
        n = R.integers(3, 8); f0 = R.uniform(2600, 4200)
        for k in range(n):
            i = int((t0 + k / rate * .6) * SR); c = chirp(1, f0 + k * 90)[:max(0, len(out) - i)]; out[i:i + len(c)] += c
        t0 += n / rate * .6 + R.uniform(.2, .5)
    return out * g
def airflow(d, g=.04):
    x = T(d); return bp(noise(d), 200, 1400) * (.75 + .25 * np.sin(2 * np.pi * .09 * x)) * g
import re as _re
_WT = {k: json.loads(v) for k, v in _re.findall(r'  (\w+): (\[.*\]),\n', (ROOT / 'src/yw6/words.ts').read_text())}
def wt(film, word, n=1, fallback=0.0):
    """Start of the n-th spoken occurrence of a word (same rule as src/yw5/ui.ts wt)."""
    c = 0
    for a, b, w in _WT.get(film, []):
        if _re.sub(r"[^a-z0-9']", '', w.lower()) == word:
            c += 1
            if c == n: return a
    return fallback
