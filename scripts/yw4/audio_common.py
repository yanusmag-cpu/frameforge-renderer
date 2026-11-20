"""Shared bits for the YunoWorld v3 sound beds: cue table, dry narration placement, extra original synth sounds."""
import json, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'yw3'))
from sfx_lib import *   # noqa: F401,F403,E402
from sfx_lib import SR, N, ROOT, T, noise, lp, hp, bp, env, gate, load_mono, lufs   # noqa: E402
CUES = json.load(open(ROOT / 'scripts/yw4/cues.json'))
def vo(film, gain_lufs=-17.0):
    """Clean, dry, centred narration at the cue times (no reverb, no stretching)."""
    VO = np.zeros((N, 2)); files = sorted((ROOT / 'public/yw4-vo-clean' / film).glob('s*.wav')); clips = [load_mono(f) for f in files]
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
