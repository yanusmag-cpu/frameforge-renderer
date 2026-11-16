#!/usr/bin/env python3
"""Lake Nyos (Cameroon, 1986) — original score + synchronized SFX bed (pure synthesis, no samples, no narration).
v2: the narration MP3 runs in loop order ("The vault was protected…" first). The film is an edit of source shots
(src/brazil/shots.ts EDIT); every SFX cue written against a source shot is remapped onto the edit and trimmed at
its cut, new shots get their own cues, and the score follows the story beats in their real order.
Writes public/brazil/bed.flac. --stems DIR also writes music.wav / sfx.wav for the private narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/nyos-sound'
SR, DUR = 48000, 42.4; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(1986)
MUS = np.zeros((N, 2)); SFX = np.zeros((N, 2)); AMB = np.zeros((N, 2))
def sos(kind, f, order=2): return butter(order, f, kind, fs=SR, output='sos')
def lp(x, f): return sosfilt(sos('low', f), x)
def hp(x, f): return sosfilt(sos('high', f), x)
def bp(x, a, b): return sosfilt(sos('band', [a, b]), x)
def sm(a, b, x): u = np.clip((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u)
def T(d): return np.arange(int(d * SR)) / SR
def env(d, a=.005, r=.2): x = T(d); return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / max(r, 1e-4))
def gate(d, a=.05, r=.3): x = T(d); return np.minimum(1, x / max(a, 1e-4)) * (1 - sm(d - r, d, x))
def saw(f, d, det=0.0): x = T(d); ph = np.cumsum(np.full(len(x), f * (1 + det))) / SR; return 2 * (ph % 1) - 1
def sine(f, d): return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(f, (int(d * SR),)).astype(float)) / SR)
def noise(d): return rng.standard_normal(int(d * SR))
def put(bus, at, sig, gain=1.0, pan=0.0):
    if REMAP and bus is not MUS:
        for nt, left in remap(at):
            k = int((left + .12) * SR); s2 = np.array(sig[:k], dtype=float)
            if len(s2) == k and k > 0: f = min(len(s2), int(.12 * SR)); s2[-f:] *= np.linspace(1, 0, f)
            _put(bus, nt, s2, gain, pan)
        return
    _put(bus, at, sig, gain, pan)
def _put(bus, at, sig, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or len(sig) == 0: return
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), N - i); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[i:i + n, 0] += sig[:n] * gain * l * 1.41; bus[i:i + n, 1] += sig[:n] * gain * r * 1.41
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
V1 = [('host-open', 0, 1), ('host-70m', 1, 4.1), ('host-gun', 4.1, 6.4), ('rewind-2005', 6.4, 8.05), ('crew', 8.05, 9.5), ('rent', 9.5, 11.05), ('near-bank', 11.05, 12.1),
      ('fake-front', 12.1, 13.05), ('grass', 13.05, 15.0), ('underneath', 15.0, 17.4), ('digging', 17.4, 19.4), ('eighty-metres', 19.4, 22.7), ('months', 22.7, 25.35),
      ('reached', 25.35, 27.85), ('problem', 27.85, 29.2), ('vault-slab', 29.2, 32.05), ('reinforced', 32.05, 34.2), ('break-through', 34.2, 36.0), ('emerge', 36.0, 37.55),
      ('unbelievable', 37.55, 38.45), ('unbelievable-face', 38.45, 39.45), ('weekend', 39.45, 42.05), ('tonnes', 42.05, 44.5), ('no-alarms', 44.5, 45.2), ('no-guards', 45.2, 45.95),
      ('monday', 45.95, 47.55), ('door-opens', 47.55, 48.9), ('vanished', 48.9, 50.55), ('history', 50.55, 52.6), ('feet', 52.6, 54.75), ('host-end', 54.75, 58.0)]
EDIT = [(0.00, 2.45, 'vault-slab', 29.0), (2.45, 3.95, 'reinforced', 32.05), (3.95, 6.30, 'break-through', 33.8), (6.30, 7.75, 'emerge', 36.0), (7.75, 8.75, 'unbelievable', 37.55),
        (8.75, 9.60, 'unbelievable-face', 38.45), (9.60, 12.05, 'weekend', 39.45), (12.05, 15.00, 'tonnes', 42.05), (15.00, 17.15, 'cctv-guard', 15.0), (17.15, 19.40, 'monday', 45.95),
        (19.40, 20.75, 'door-opens', 47.55), (20.75, 22.80, 'vanished', 48.26), (22.80, 25.45, 'history', 50.55), (25.45, 28.05, 'feet', 52.6), (28.05, 30.25, 'host-open', -1.2),
        (30.25, 32.40, 'host-70m', 1.0), (32.40, 34.45, 'host-gun', 3.8), (34.45, 36.05, 'rewind-2005', 6.4), (36.05, 39.55, 'gang-rent-bank', 36.05), (39.55, 40.50, 'fake-front', 12.1),
        (40.50, 41.95, 'grass', 13.05), (41.95, 43.45, 'underneath', 15.0), (43.45, 45.00, 'digging', 17.4), (45.00, 47.60, 'tunnel-track', 45.0), (47.60, 50.35, 'months', 22.7),
        (50.35, 52.45, 'reached', 25.21), (52.45, 56.00, 'problem-loop', 52.45)]
def remap(at):
    """source-shot time -> [(film time, seconds left before the cut)]"""
    nm = next((n for n, a, b in V1 if a <= at < b), None)
    if at < 0: nm = 'host-open'
    out = []
    for n0, n1, name, src in EDIT:
        if name == nm and src <= at < src + (n1 - n0): out.append((n0 + at - src, n1 - (n0 + at - src)))
    return out
REMAP = False
D2, F2, A2, C3, D3, E3, F3, G3, A3, Bb3, C4, D4, E4, F4, G4, A4, Bb4, C5, D5 = [NOTE(m) for m in (38, 41, 45, 48, 50, 52, 53, 55, 57, 58, 60, 62, 64, 65, 67, 69, 70, 72, 74)]

# ---------------------------------------------------------------- instruments
def piano(f, d=2.5, g=.25): x = T(d); s = sum(np.sin(2 * np.pi * f * k * x) * np.exp(-x * (1.2 + k * .9)) / k ** 1.2 for k in range(1, 7)); return s * env(d, .003, d) * g
def pad(fs, d, g=.1, cut=900, a=1.5, r=1.5): return sum(lp(saw(f, d, .004) + saw(f, d, -.005), cut) for f in fs) * gate(d, a, r) * g
def drone(f, d, g=.12, cut=300): x = T(d); return lp(saw(f, d, .002) + saw(f * 1.5, d, -.003) * .5 + np.sin(2 * np.pi * f * .5 * x), cut) * gate(d, 2, 2) * g
def pulse(f, d=.18, g=.2): return lp(saw(f, d), 600) * env(d, .004, .08) * g
def sub(g=.8, f=42, d=2.2): x = T(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-x * 9))) / SR) * env(d, .003, .7) * g
def hit(g=.7): d = 3.0; return (sub(1, 38, d) + lp(noise(d), 300) * env(d, .002, .4) * .6 + hp(noise(d), 3000) * env(d, .001, .3) * .25) * g
def riser(d, g=.3, f0=200, f1=1800): x = T(d); f = f0 * (f1 / f0) ** (x / d); return (bp(noise(d), 400, 6000) * .4 * (x / d) ** 2 + sine(f, d) * .15) * (x / d) ** 1.5 * g
def tick(g=.3): d = .05; return bp(noise(d), 2500, 8000) * env(d, .0005, .006) * g
def thump(g=.5): d = .4; x = T(d); return (np.sin(2 * np.pi * np.cumsum(60 * (1 + np.exp(-x * 30))) / SR) * env(d, .001, .1) + lp(noise(d), 500) * env(d, .001, .03)) * g
def whoosh(d=.6, g=.3): x = T(d); return bp(noise(d), 300, 5000) * np.sin(np.pi * x / d) ** 2 * g
def beep(f=1200, d=.12, g=.2): return sine(f, d) * gate(d, .005, .02) * g
def alert(d=3.0, g=.35):  # original phone alarm: 3-tone pulsing chirp
    x = T(d); seq = np.array([1180, 1480, 1760])[(np.floor(x * 9) % 3).astype(int)]
    return (np.sin(2 * np.pi * np.cumsum(seq) / SR) + .3 * np.sign(np.sin(2 * np.pi * np.cumsum(seq * .5) / SR))) * (np.sin(np.pi * (x * 9 % 1)) ** .3) * gate(d, .01, .05) * g
def buzz(d=.5, g=.25): x = T(d); return lp(np.sign(np.sin(2 * np.pi * 150 * x)) * (np.sin(2 * np.pi * 9 * x) > 0), 900) * gate(d, .01, .02) * g
def siren(d, g=.25, lo=420, hi=880, per=4.5): x = T(d); f = lo + (hi - lo) * (.5 - .5 * np.cos(2 * np.pi * x / per)); return lp(saw(1, d) * 0 + np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR), 3000) * gate(d, .8, 1.2) * g
def klaxon(d, g=.25): x = T(d); return lp(np.sign(np.sin(2 * np.pi * 330 * x)) * (np.sin(2 * np.pi * 1.6 * x) > 0), 1600) * gate(d, .05, .3) * g
def rumble(d, g=.6): x = T(d); return lp(noise(d), 120) * (1 - sm(0, d, x)) ** 1.5 * np.minimum(1, x / .05) * g * 3
def glass(g=.35): d = 1.2; x = T(d); return sum(np.sin(2 * np.pi * f * x) * np.exp(-x * k) for f, k in ((2400, 6), (3700, 9), (5200, 12), (6900, 16))) * .2 * g + hp(noise(d), 3000) * env(d, .001, .08) * g
def clunk(g=.5): d = .5; x = T(d); return (np.sin(2 * np.pi * 90 * x) * env(d, .001, .08) + bp(noise(d), 200, 2000) * env(d, .001, .03)) * g
def flap(g=.2): d = .05; return bp(noise(d), 1000, 6000) * env(d, .0005, .01) * g
def clack(g=.4): d = .25; x = T(d); return (bp(noise(d), 800, 5000) * env(d, .0005, .015) + np.sin(2 * np.pi * 900 * x) * env(d, .0005, .03) * .4) * g
def roar(d, g=.6): x = T(d); return (lp(noise(d), 700) * 1.4 + bp(noise(d), 60, 200) * 2) * gate(d, .3, 1.5) * g
def chime(g=.25): return piano(NOTE(84), 1.5, g) + piano(NOTE(91), 1.5, g * .6)
def geiger(d, rate=6, g=.25):
    s = np.zeros(int(d * SR))
    for k in np.cumsum(rng.exponential(1 / rate, int(d * rate * 2))):
        i = int(k * SR)
        if i < len(s) - 300: s[i:i + 300] += hp(noise(300 / SR), 3000) * np.exp(-np.arange(300) / 40)
    return s * g
def static(d, g=.15): return bp(noise(d), 800, 5000) * (.6 + .4 * np.abs(np.sin(np.arange(int(d * SR)) / SR * 13))) * gate(d, .05, .1) * g
def crowd(d, g=.12): x = T(d); return bp(noise(d), 250, 1600) * (.7 + .3 * np.sin(2 * np.pi * .37 * x) * np.sin(2 * np.pi * 1.3 * x)) * gate(d, .5, .5) * g
def wind(d, g=.12): x = T(d); return bp(noise(d), 150, 900) * (.6 + .4 * np.sin(2 * np.pi * .13 * x + np.sin(x))) * gate(d, 1, 1) * g
def fire(d, g=.15): s = lp(noise(d), 500) * .6; p = np.zeros_like(s); idx = rng.integers(0, len(s) - 200, int(d * 30)); [p.__setitem__(slice(i, i + 200), p[i:i + 200] + hp(noise(200 / SR), 2000) * np.exp(-np.arange(200) / 30)) for i in idx]; return (s + p) * gate(d, .5, .5) * g
def room(d, g=.05): return lp(noise(d), 400) * gate(d, .2, .2) * g
def hum(d, f=50, g=.05): x = T(d); return (np.sin(2 * np.pi * f * x) + .4 * np.sin(4 * np.pi * f * x)) * gate(d, .2, .2) * g
def rewind(g=.3, d=.8): x = T(d); f = 1500 * (1 + 3 * x / d); return bp(np.sin(2 * np.pi * np.cumsum(f * (1 + .3 * np.sin(2 * np.pi * 37 * x))) / SR) + noise(d) * .3, 500, 7000) * np.sin(np.pi * x / d) * g
def heartbeat(g=.5): return np.concatenate([thump(g), np.zeros(int(.05 * SR)), thump(g * .7)])
def A(*xs):
    m = max(len(x) for x in xs); o = np.zeros(m)
    for x in xs: o[:len(x)] += x
    return o
def stamp(g=.6): return A(thump(g), clack(g * .6))

# ---------------------------------------------------------------- extra instruments for this film
def shaker(g=.06): d = .09; return bp(noise(d), 4000, 11000) * env(d, .01, .03) * g
def step(g=.18, hard=True): d = .12; x = T(d); return (lp(noise(d), 900 if hard else 500) * env(d, .001, .02) + np.sin(2 * np.pi * 95 * x) * env(d, .001, .03) * .5) * g
def dirt(g=.3): d = .5; return (lp(noise(d), 1200) * env(d, .002, .07) + bp(noise(d), 1500, 6000) * env(d, .01, .15) * .3) * g
def pick(g=.5): d = .6; x = T(d); return (bp(noise(d), 300, 3000) * env(d, .0005, .03) + lp(noise(d), 400) * env(d, .001, .06) * 1.2 + sum(np.sin(2 * np.pi * f * x) * np.exp(-x * 30) for f in (1900, 2700)) * .08) * g
def metal(g=.6): d = 1.8; x = T(d); return (sum(np.sin(2 * np.pi * f * x) * np.exp(-x * k) for f, k in ((1210, 3), (2350, 4.5), (3430, 6), (4890, 8), (620, 2.5))) * .3 + hp(noise(d), 2500) * env(d, .0005, .02)) * g
def crunch(d=1.4, g=.8): return (lp(noise(d), 1800) * env(d, .002, .35) * 1.4 + bp(noise(d), 80, 300) * env(d, .002, .6) * 2) * g
def rubble(d=1.6, g=.3):
    s = np.zeros(int(d * SR))
    for k in rng.uniform(0, d * .9, 40):
        i = int(k * SR); seg = bp(noise(.06), 700, 5000) * env(.06, .0005, .01) * rng.uniform(.3, 1); s[i:i + len(seg)] += seg[:len(s) - i]
    return s * np.exp(-T(d) * 1.5) * g
def creak(d=1.2, g=.3): x = T(d); f = 120 + 40 * np.sin(2 * np.pi * 2.1 * x) + 30 * x; return bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (rng.random(len(x)) > .3), 300, 2500) * gate(d, .05, .2) * g
def bird(g=.08): d = .25; x = T(d); f = 3200 + 1200 * np.sin(2 * np.pi * 14 * x) * np.exp(-x * 4); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, .01, .07) * g
def traffic(d, g=.12): x = T(d); return (lp(noise(d), 350) * (.7 + .3 * np.sin(2 * np.pi * .21 * x)) + bp(noise(d), 600, 2500) * .2) * gate(d, .3, .3) * g
def carpass(d=2.0, g=.4): x = T(d); e = np.exp(-((x - d / 2) / (d / 5)) ** 2); return (lp(noise(d), 900) + lp(saw(55, d), 300) * .4) * e * g
def snore(g=.18): d = 1.6; x = T(d); e = np.sin(np.pi * np.clip(x / 1.1, 0, 1)) ** 2; return lp(saw(70, d) * (.6 + .4 * np.sin(2 * np.pi * 23 * x)), 700) * e * g
def splash(g=.4): d = .8; return (bp(noise(d), 800, 6000) * env(d, .002, .12) + lp(noise(d), 600) * env(d, .002, .05)) * g
def cashf(g=.25): d = .35; return bp(noise(d), 1500, 7000) * env(d, .005, .06) * (1 + np.sin(2 * np.pi * 60 * T(d))) * g
def bell(f, g=.12, d=2.0): x = T(d); return sum(np.sin(2 * np.pi * f * m * x) * np.exp(-x * (1.5 + m)) / m for m in (1, 2.76, 5.4)) * g
def sparkle(g=.1): return A(*[np.pad(bell(NOTE(84 + k), g * .5, .8), (int(k * .045 * SR), 0)) for k in (0, 4, 7, 12, 16)])
def click(g=.15): d = .04; return hp(noise(d), 2000) * env(d, .0005, .004) * g
def hit2(g=.7): return A(hit(g), np.pad(bell(NOTE(50), g * .25, 2.5), (0, 0)))
def pop_(g=.18): d = .12; x = T(d); return np.sin(2 * np.pi * np.cumsum(900 - 600 * x / d) / SR) * env(d, .002, .03) * g

def swing_hits(t0, t1, period, off=0.0):
    out = []; k = 0
    while True:
        h = (k + .73) * period - off
        if h > t1: break
        if h >= t0: out.append(h)
        k += 1
    return out


# ================================================================ Part 2 instruments
def crickets(d, g=.05):
    x = T(d); c = np.sin(2 * np.pi * 4300 * x) * (np.sin(2 * np.pi * 28 * x) > .3) * (np.sin(2 * np.pi * .9 * x + np.sin(x * 3)) > -.2)
    return bp(c, 3500, 5500) * gate(d, .5, .5) * g
def engine(d, g=.3, f0=38, f1=38, accel=0.0):
    x = T(d); f = f0 + (f1 - f0) * (x / d) ** 1.4; ph = np.cumsum(f) / SR
    return lp(np.sign(np.sin(2 * np.pi * ph)) * .5 + np.sin(4 * np.pi * ph) * .5 + lp(noise(d), 300) * (.4 + accel), 900) * gate(d, .2, .6) * g
def doorshut(g=.4): d = .5; x = T(d); return (lp(noise(d), 700) * env(d, .001, .04) * 1.4 + np.sin(2 * np.pi * 70 * x) * env(d, .001, .09)) * g
def latch(g=.3): return A(click(g), np.pad(click(g * .7), (int(.06 * SR), 0)))
def brake(d=.7, g=.12): x = T(d); return bp(np.sin(2 * np.pi * np.cumsum(2400 + 300 * np.sin(2 * np.pi * 7 * x)) / SR) + noise(d) * .2, 1800, 4000) * gate(d, .05, .2) * g
def radio(d=.9, g=.14): return A(static(d, g), np.pad(beep(1700, .06, g * .8), (0, 0)), np.pad(beep(1300, .06, g * .6), (int((d - .1) * SR), 0)))
def ring(d=1.2, g=.15): x = T(d); return (np.sin(2 * np.pi * 950 * x) + np.sin(2 * np.pi * 1150 * x)) * (np.sin(2 * np.pi * 20 * x) > 0) * (x % .6 < .4) * gate(d, .01, .05) * g
def fan(d, g=.05): x = T(d); return bp(noise(d), 200, 900) * (.75 + .25 * np.sin(2 * np.pi * 4.8 * x)) * gate(d, .3, .3) * g
def keys(d, g=.06):
    s = np.zeros(int(d * SR))
    for k in np.cumsum(rng.uniform(.08, .2, int(d * 9))):
        i = int(k * SR)
        if i < len(s) - 2400: s[i:i + 2400] += click(1)[:2400] if len(click(1)) >= 2400 else np.pad(click(1), (0, 2400 - len(click(1))))
    return s * g
def scrape(d=.6, g=.2): x = T(d); return bp(noise(d), 600, 3500) * (.6 + .4 * np.sin(2 * np.pi * 13 * x)) * gate(d, .03, .1) * g
def knock(g=.3): d = .2; x = T(d); return (np.sin(2 * np.pi * 180 * x) * env(d, .001, .04) + bp(noise(d), 300, 1500) * env(d, .001, .01)) * g
def drag(d=.6, g=.15): return lp(noise(d), 1400) * gate(d, .05, .15) * g
def drip(g=.06): d = .3; x = T(d); return np.sin(2 * np.pi * np.cumsum(1400 + 900 * np.exp(-x * 30)) / SR) * env(d, .001, .04) * g
def dog(g=.05): d = .35; x = T(d); return bp(saw(340 + 80 * np.exp(-x * 9)[0], d) * env(d, .01, .08), 300, 1800) * g


# ================================================================ Nyos instruments
def lap(d, g=.05):   # lake water lapping at the shore
    x = T(d); return bp(noise(d), 200, 1400) * (.35 + .65 * np.clip(np.sin(2 * np.pi * .55 * x) * np.sin(2 * np.pi * .23 * x + 1), 0, 1)) * gate(d, .4, .4) * g
def frogs(d, g=.03):
    x = T(d); return bp(np.sin(2 * np.pi * 520 * x) * (np.sin(2 * np.pi * 9 * x) > .4) * (np.sin(2 * np.pi * .7 * x + 2) > .1), 300, 900) * gate(d, .5, .5) * g
def bubbling(d, g=.08):
    s = np.zeros(int(d * SR))
    for k in np.cumsum(rng.uniform(.01, .06, int(d * 40))):
        i = int(k * SR)
        if i < len(s) - 4000: f = rng.uniform(300, 1400); xx = np.arange(4000) / SR; s[i:i + 4000] += np.sin(2 * np.pi * np.cumsum(f * (1 + xx * 8)) / SR) * np.exp(-xx * 60)
    return bp(s, 200, 2500) * gate(d, .2, .3) * g
def roar(d, g=.2): return lp(noise(d), 500) * gate(d, .6, .8) * g + bp(noise(d), 1500, 6000) * gate(d, .8, .8) * g * .25
def groan(d, f=42, g=.18): x = T(d); return lp(saw(f, d) * (1 + .3 * np.sin(2 * np.pi * .4 * x)), 220) * gate(d, .5, .8) * g
def hiss(d, g=.06): return bp(noise(d), 2500, 8000) * gate(d, .4, .6) * g
def crackle(d, g=.04):
    s = np.zeros(int(d * SR))
    for k in np.cumsum(rng.uniform(.03, .2, int(d * 12))):
        i = int(k * SR)
        if i < len(s) - 800: s[i:i + 800] += noise(800 / SR) * np.exp(-np.arange(800) / 120)
    return hp(s, 1500) * g
def muffle(x): return lp(x, 700)

# ================================================================ MUSIC — A minor, eerie and restrained; builds from the lake's release to the valley
A2_, C3_, E3_, A3_, C4_, E4_, G3_, F3_ = NOTE(45), NOTE(48), NOTE(52), NOTE(57), NOTE(60), NOTE(64), NOTE(55), NOTE(53)
def music3():
    put(MUS, 0.3, pad([A2_ * 2, E3_, C4_], 5.0, .03, 800, 1.5, 1.0)); put(MUS, 0.0, drone(A2_, 5.4, .05, 200))
    put(MUS, 4.75, hit(.22)); put(MUS, 4.78, bell(NOTE(69), .05, 2.5))
    put(MUS, 5.4, drone(A2_, 3.95, .08, 220))
    for k, n_ in enumerate([E4_, C4_, A3_, E4_, F3_ * 2]): put(MUS, 5.6 + k * .8, piano(n_, 1.6, .04))
    put(MUS, 8.4, riser(.9, .06, 300, 1200))
    # Cameroon 1986: the beautiful, open landscape (major-ish lift) — still uneasy underneath
    put(MUS, 9.3, pad([NOTE(53), NOTE(57), NOTE(60), NOTE(64)], 4.2, .045, 2200, .8, 1.0)); put(MUS, 9.3, drone(NOTE(41), 4.1, .05, 260))
    for k, n_ in enumerate([NOTE(72), NOTE(69), NOTE(65), NOTE(67)]): put(MUS, 9.6 + k * .9, piano(n_, 1.8, .04))
    put(MUS, 12.24, hit2(.28))
    # one night: pulse begins; the release
    put(MUS, 13.4, drone(A2_, 7.5, .09, 240)); bpm = 84; beat = 60 / bpm
    for i in range(int((20.8 - 13.6) / (beat / 2))): put(MUS, 13.6 + i * beat / 2, pulse(A2_, .12, .03 + .05 * min(1, i / 16)))
    put(MUS, 14.1, pad([A2_ * 2, C4_, E4_], 1.5, .035, 1200, .3, .6)); put(MUS, 15.0, riser(.6, .12, 200, 1600)); put(MUS, 15.53, hit2(.42)); put(MUS, 16.66, hit(.25))
    put(MUS, 18.37, pop_(.06)); put(MUS, 20.24, pop_(.06))
    # beneath the surface: cold, wide, glassy
    put(MUS, 20.85, pad([A2_ * 2, E3_, B3_ := NOTE(59), E4_], 3.9, .05, 1500, .5, 1.0)); put(MUS, 22.65, bell(NOTE(76), .05, 2.0)); put(MUS, 23.38, sub(.3, 36, 1.4))
    # down the valleys: relentless low ostinato, crescendo
    put(MUS, 24.7, drone(A2_, 4.3, .1, 260))
    for i in range(int((28.9 - 24.75) / (beat / 4))): put(MUS, 24.75 + i * beat / 4, pulse([A2_, A2_, C3_, A2_][i % 4], .07, .03 + .05 * i / 40))
    put(MUS, 27.6, riser(1.3, .1, 150, 900))
    # confusion → silence
    put(MUS, 28.95, drone(NOTE(44), 2.7, .08, 200)); put(MUS, 29.0, pad([NOTE(56), NOTE(59), NOTE(62)], 2.5, .03, 800, .3, 1.2))
    # by morning: sparse, grieving piano; near-silence around the number
    put(MUS, 32.2, pad([A2_ * 2, C4_, E4_], 3.6, .03, 900, 1.0, 1.4))
    for k, n_ in enumerate([E4_, D4_ := NOTE(62), C4_, A3_]): put(MUS, 32.4 + k * 1.0, piano(n_, 2.4, .045))
    put(MUS, 33.39, bell(NOTE(57), .06, 3.0))
    put(MUS, 35.85, riser(1.6, .07, 200, 1000)); put(MUS, 36.6, drone(A2_, 5.8, .07, 220))
    # peaceful again: the opening motif returns, cold and quiet; low swell on "beneath"
    put(MUS, 37.6, pad([A2_ * 2, E3_, C4_, E4_], 4.4, .035, 1300, .8, 1.5))
    for k, n_ in enumerate([E4_, C4_, A3_, E4_]): put(MUS, 37.8 + k * .85, piano(n_, 1.8, .035))
    put(MUS, 41.26, sub(.35, 33, 1.1)); put(MUS, 41.3, bell(NOTE(57), .04, 1.1))

# ================================================================ SFX locked to the picture
def sfx3():
    put(AMB, 0.0, room(2.4, .035)); put(SFX, 1.0, creak(.6, .06)); put(SFX, 1.6, creak(.4, .05))
    for k in range(3): put(SFX, 1.95 + k * .32, step(.06))
    put(SFX, 2.45, creak(.5, .08)); put(SFX, 2.88, knock(.12) if 'knock' in globals() else thump(.12)); put(AMB, 2.35, wind(1.55, .02))
    put(SFX, 3.95, creak(.45, .1)); put(SFX, 4.3, thump(.1))
    for k in range(3): put(SFX, 4.18 + k * .3, dirt(.06))
    put(AMB, 3.9, wind(1.5, .03))
    put(AMB, 5.4, wind(3.9, .045))
    for k in range(int(2.6 / .4)): put(SFX, 5.45 + k * .4, dirt(.05), pan=.1)
    put(SFX, 5.6, whoosh(.4, .05)); put(SFX, 7.06, whoosh(.3, .04)); put(SFX, 8.47, whoosh(.9, .06))
    put(AMB, 9.3, wind(4.1, .05))
    for k in range(6): put(AMB, 9.5 + k * .6 + rng.uniform(0, .3), bird(.03), pan=rng.uniform(-.8, .8))
    put(AMB, 13.4, crickets(7.4, .03) + frogs(7.4, .02) + lap(7.4, .04))
    put(SFX, 15.0, groan(2.6, 38, .22)); put(SFX, 15.3, bubbling(5.5, .09)); put(SFX, 15.5, roar(5.3, .18)); put(SFX, 15.53, sub(.4, 30, 1.6)); put(SFX, 16.2, hiss(4.6, .04))
    put(SFX, 18.37, tick(.08)); put(SFX, 20.24, tick(.08))
    put(SFX, 20.85, whoosh(.9, .15)); put(AMB, 21.2, muffle(room(3.5, .12)) + muffle(hum(3.5, 60, .03))); put(SFX, 21.3, bubbling(3.3, .12)); put(SFX, 22.0, groan(2.6, 34, .16))
    put(AMB, 24.7, crickets(2.8, .025)); put(AMB, 24.7, wind(4.25, .07)); put(SFX, 25.0, whoosh(2.0, .12)); put(SFX, 25.4, hiss(3.4, .035)); put(SFX, 26.5, rumble(1.6, .12))
    put(AMB, 28.95, wind(3.0, .035)); put(SFX, 29.0, crackle(1.4, .05)); put(SFX, 30.3, whoosh(.25, .05))
    for k in range(4): put(SFX, 30.2 + k * .55, heartbeat(.12 * (1 - k * .2)))
    put(AMB, 31.95, wind(3.9, .03)); put(SFX, 33.39, sub(.25, 36, 1.4))
    put(AMB, 35.85, wind(1.7, .06)); put(SFX, 36.0, whoosh(1.4, .09))
    put(AMB, 37.55, lap(3.7, .05) + wind(3.7, .03))
    for k in range(3): put(AMB, 37.9 + k * .9, bird(.02), pan=rng.uniform(-.7, .7))
    put(SFX, 41.15, whoosh(.5, .1)); put(SFX, 41.3, bubbling(1.0, .06)); put(AMB, 41.4, muffle(room(1.0, .1)))
def knock(g=.3): d = .2; x = T(d); return (np.sin(2 * np.pi * 180 * x) * env(d, .001, .04) + bp(noise(d), 300, 1500) * env(d, .001, .01)) * g
music3(); sfx3()
# ---------------------------------------------------------------- master bed: gentle, leaves room for the narration (mixed privately)
def norm_lufs(x, target):
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'a.wav'; write(p, x)
        out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        I = float([l for l in out.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    return x * 10 ** ((target - I) / 20)
def write(p, x):
    y = np.clip(x, -1, 1); w = wave.open(str(p), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
fade = np.minimum(1, t / .03) * (1 - np.clip((t - 42.1) / .3, 0, 1))  # fades to silence: the Short loops back to the dark hut
MUSm = MUS * fade[:, None]; SFXm = (SFX + AMB) * fade[:, None]
def limit(x, ceiling):
    e = maximum_filter1d(np.abs(x).max(axis=1), int(SR * .006)); g = np.minimum(1, ceiling / np.maximum(e, 1e-9))
    g = -maximum_filter1d(-g, int(SR * .012)); g = uniform_filter1d(g, int(SR * .01)); return x * g[:, None]
bed = MUSm * .55 + SFXm
for _ in range(6):  # loudness-normalise to -20 LUFS with a transparent peak limiter (impacts stay punchy, no clipping)
    bed = limit(norm_lufs(bed, -20.0), .7)
if '--stems' in sys.argv:
    d = Path(sys.argv[sys.argv.index('--stems') + 1]); d.mkdir(parents=True, exist_ok=True); write(d / 'music.wav', MUSm); write(d / 'sfx.wav', SFXm)
OUT.mkdir(parents=True, exist_ok=True); tmp = OUT / 'bed.wav'; write(tmp, bed)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'flac', str(OUT / 'bed.flac')], check=True); tmp.unlink()
print('bed written', OUT / 'bed.flac', 'peak', float(np.max(np.abs(bed))))


