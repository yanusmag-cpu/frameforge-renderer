#!/usr/bin/env python3
"""Brazil heist PART 2 (the aftermath) — original score + synchronized SFX bed (pure synthesis, no samples, no narration).
v2: the narration MP3 runs in loop order ("The vault was protected…" first). The film is an edit of source shots
(src/brazil/shots.ts EDIT); every SFX cue written against a source shot is remapped onto the edit and trimmed at
its cut, new shots get their own cues, and the score follows the story beats in their real order.
Writes public/brazil/bed.flac. --stems DIR also writes music.wav / sfx.wav for the private narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/brazil2-sound'
SR, DUR = 48000, 57.4; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(2006)
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

# ================================================================ MUSIC — D minor tension; the opening continues Part 1's tunnel drone
bpm = 92; beat = 60 / bpm
def music2():
    put(MUS, 0.0, drone(D2 * .94, 3.9, .1, 240)); put(MUS, 0.0, pad([D3, F3, Bb3 / 2 * 2, E4], 3.8, .035, 900, .05, 1.0))
    for i in range(int((3.6 - .6) / (beat / 2))): put(MUS, .6 + i * beat / 2, pulse(D2, .12, .05))
    # Monday / police: cold pad, rising unease, sting on "discovered"
    put(MUS, 3.67, pad([D3, F3, A3], 5.2, .04, 1100, .6, 1.0)); put(MUS, 5.2, riser(2.4, .13, 150, 1300)); put(MUS, 7.63, hit2(.38))
    put(MUS, 8.83, drone(D2, 2.0, .09, 220)); put(MUS, 10.1, sub(.4, 34, 2.0))
    # getaway: low pulse drive, counter sting
    put(MUS, 10.74, drone(D2, 3.4, .07, 260))
    for i in range(int(3.3 / (beat / 2))): put(MUS, 10.74 + i * beat / 2, pulse([D2, D2, F2, C3 / 2][i // 4 % 4], .14, .08 if i % 2 == 0 else .05))
    put(MUS, 12.63, hit2(.38)); put(MUS, 12.66, sparkle(.09))
    # presenter: playful mistake sting
    put(MUS, 14.09, pad([D3, F3, A3], 2.6, .03, 1300, .2, .6)); put(MUS, 15.4, hit(.25)); put(MUS, 15.93, piano(NOTE(74), 1.0, .06)); put(MUS, 16.1, piano(NOTE(73), 1.2, .05))
    # too much cash: uneasy clock pulse
    put(MUS, 16.72, drone(D2 * .94, 2.7, .07, 220))
    for i in range(int(2.6 / beat)): put(MUS, 16.72 + i * beat, piano(NOTE(50), .6, .04))
    # investigation: purposeful procedural pulse
    put(MUS, 19.36, pad([D3, G3, A3], 6.1, .035, 1300, .4, .8))
    for i in range(int((25.45 - 19.4) / (beat / 2))):
        tt = 19.4 + i * beat / 2; put(MUS, tt, pulse([D2, D2, Bb3 / 4, C3 / 2][i // 4 % 4], .12, .07 if i % 2 == 0 else .04)); put(MUS, tt + beat / 4, shaker(.025))
    put(MUS, 23.03, hit2(.42)); put(MUS, 23.05, sparkle(.11)); put(MUS, 23.1, pad([Bb3 / 2 * 2, D4, F4, A4], 2.2, .045, 2200, .2, .8))
    # darker: the floor drops out
    put(MUS, 25.45, drone(D2 * .94, 2.3, .1, 200)); put(MUS, 26.86, hit(.32)); put(MUS, 25.8, riser(1.1, .08, 900, 150))
    # kidnapping & extortion: tense ostinato then sting
    put(MUS, 27.53, drone(D2, 4.6, .1, 240))
    for i in range(int((30.3 - 27.6) / (beat / 4))): put(MUS, 27.6 + i * beat / 4, pulse(D3 if i % 3 else NOTE(51), .07, .025 + .035 * i / 30))
    put(MUS, 30.34, hit2(.45)); put(MUS, 31.21, bell(NOTE(63), .09, 2.0))
    # roadside dawn: sombre, sparse, near-silence on "found dead"
    put(MUS, 32.04, pad([D3, F3, A3, C4], 3.0, .035, 900, .8, 1.2))
    for k, n_ in enumerate([A3, F3, D3]): put(MUS, 32.3 + k * .9, piano(n_, 1.8, .045))
    put(MUS, 35.02, bell(NOTE(50), .07, 2.5))
    # years / arrests: building march
    put(MUS, 35.54, drone(D2, 5.2, .07, 300))
    for i in range(int((40.69 - 35.6) / (beat / 2))):
        tt = 35.6 + i * beat / 2; put(MUS, tt, pulse([D2, F2, G3 / 4 * 2, A2][i // 4 % 4], .14, .05 + .04 * i / 30)); put(MUS, tt + beat / 4, shaker(.03))
    put(MUS, 38.41, hit2(.38)); put(MUS, 39.4, riser(1.3, .1, 200, 1500))
    # presenter: hush before the reveal (strategic near-silence)
    put(MUS, 40.69, pad([D3, A3], 2.0, .02, 800, .1, .5))
    # missing fortune: sad piano + pad, sting on "unaccounted"
    put(MUS, 42.78, pad([D3, F3, A3], 3.6, .035, 1000, .6, .8)); put(MUS, 42.8, drone(D2, 8.0, .07, 220))
    for k, n_ in enumerate([D4, A3, F3, E3, D3, A3, Bb3, A3]): put(MUS, 43.0 + k * beat * 1.5, piano(n_, 2.0, .045))
    put(MUS, 46.45, pad([Bb3 / 2 * 2, D4, F4], 2.0, .04, 1500, .3, .6)); put(MUS, 48.52, hit2(.32)); put(MUS, 49.45, bell(NOTE(62), .08, 2.6))
    # loop home: back into Part 1's tunnel drone (frame 0 continues it)
    put(MUS, 50.75, pad([D3, F3, A3, D4], 3.0, .04, 1600, .5, 1.0)); put(MUS, 52.4, riser(1.3, .1, 900, 160)); put(MUS, 53.6, drone(D2 * .94, 3.9, .1, 240))
    put(MUS, 53.6, pad([D3, F3, Bb3 / 2 * 2, E4], 3.8, .035, 900, .5, .4))
    for i in range(int((57.4 - 53.8) / (beat / 2))): put(MUS, 53.8 + i * beat / 2, pulse(D2, .12, .045))

# ================================================================ SFX locked to the picture
def sfx2():
    # 1 tunnel: crew drags the last bags away
    put(AMB, 0.0, room(3.67, .06) + hum(3.67, 50, .02))
    for k in range(int((3.67 - .6) / .4)):
        for j, who in enumerate((0, .35)):
            tt = .6 + who + k * .4
            if tt < 3.67: put(SFX, tt, dirt(.07 * (1 - k * .06)), pan=-.2 - k * .05)
    for k in range(5): put(SFX, .7 + k * .55, cashf(.05), pan=-.3)
    put(SFX, 3.0, drip(.05), pan=.4)
    # 2 Monday: vault door
    put(AMB, 3.67, hum(2.8, 100, .02)); put(SFX, 3.85, latch(.25)); put(SFX, 3.95, clunk(.45)); put(SFX, 4.0, creak(1.3, .1)); put(SFX, 5.15, thump(.25))
    put(SFX, 4.05, flap(.15)); put(SFX, 4.2, pop_(.1))
    for k in range(4): put(SFX, 5.4 + k * .38, step(.1), pan=-.2); put(SFX, 5.55 + k * .38, step(.08), pan=-.1)
    put(SFX, 5.55, click(.18))
    # 3 police at the hole
    for k in range(3): put(SFX, 6.5 + k * .37, step(.1))
    put(SFX, 7.25, drag(.4, .08)); put(SFX, 7.63, whoosh(.35, .1)); put(SFX, 7.9, radio(.8, .12), pan=-.3); put(SFX, 8.32, click(.2))
    # 4 the empty tunnel
    put(SFX, 8.85, whoosh(1.0, .2)); put(AMB, 8.9, room(1.84, .07))
    for k in range(3): put(SFX, 9.3 + k * .43, drip(.05), pan=rng.uniform(-.5, .5))
    put(SFX, 10.1, sub(.3, 30, 1.2))
    # 5 getaway at night
    put(AMB, 10.74, crickets(3.35, .035) + traffic(3.35, .04)); put(SFX, 11.5, thump(.22)); put(SFX, 11.62, doorshut(.3)); put(SFX, 11.85, latch(.12))
    put(SFX, 11.95, engine(2.1, .22, 32, 80, .3)); put(SFX, 12.0, carpass(2.0, .15))
    for k in range(16): put(SFX, 12.65 + k * .05, cashf(.04), pan=rng.uniform(-.5, .5))
    # 6 presenter
    put(AMB, 14.09, room(2.63, .04)); put(SFX, 14.1, whoosh(.5, .15)); put(SFX, 15.16, pop_(.12)); put(SFX, 15.4, whoosh(.25, .12)); put(SFX, 15.93, click(.12))
    # 7 the stash room
    put(AMB, 16.72, room(2.64, .05) + crickets(2.64, .02))
    for k in range(int(2.6 / .5)): put(SFX, 16.75 + k * .5, tick(.05))
    put(SFX, 17.0, cashf(.06)); put(SFX, 17.5, scrape(.25, .05), pan=.4); put(SFX, 18.2, carpass(1.8, .18), pan=.6); put(SFX, 18.4, heartbeat(.2)); put(SFX, 18.95, heartbeat(.18))
    # 8 police HQ
    put(AMB, 19.36, fan(2.18, .05) + room(2.18, .04)); put(SFX, 19.4, keys(1.4, .04), pan=.4); put(SFX, 19.75, click(.2)); put(SFX, 20.1, scrape(.35, .05))
    put(SFX, 19.5, ring(.9, .05), pan=.5); put(SFX, 21.0, whoosh(.4, .08))
    # 9 money under the floor
    put(AMB, 21.54, room(3.91, .05) + traffic(3.91, .02)); put(SFX, 21.56, drag(.55, .2)); put(SFX, 21.95, A(knock(.25), np.pad(knock(.2), (int(.18 * SR), 0))))
    put(SFX, 22.3, scrape(.5, .22)); put(SFX, 22.85, thump(.15)); put(SFX, 23.0, cashf(.12)); put(SFX, 24.3, radio(.9, .13), pan=-.3)
    for k in range(3): put(SFX, 24.45 + k * .4, step(.08), pan=-.5)
    # 10 darker
    put(AMB, 25.45, wind(2.08, .07)); put(SFX, 26.2, dog(.04), pan=.7); put(AMB, 26.6, crickets(.93, .03))
    # 11 kidnapping (heard, not seen) & extortion
    put(AMB, 27.53, crickets(4.5, .03) + wind(4.5, .04))
    for k in range(int(2.0 / .4)): put(SFX, 27.6 + k * .4, step(.09), pan=-.1)
    put(SFX, 28.4, engine(1.5, .18, 30, 26, .1), pan=-.6); put(SFX, 29.65, brake(.5, .08)); put(SFX, 30.2, latch(.18)); put(SFX, 30.3, whoosh(.3, .1))
    put(SFX, 30.6, doorshut(.35)); put(SFX, 30.75, engine(1.4, .25, 40, 95, .4), pan=.4); put(SFX, 31.2, A(flap(.2), np.pad(ring(.8, .06), (int(.15 * SR), 0))))
    # 12 roadside at dawn
    put(AMB, 32.04, wind(3.5, .06))
    for k in range(5): put(AMB, 32.3 + k * .7 + rng.uniform(0, .2), bird(.025), pan=rng.uniform(-.8, .8))
    put(SFX, 32.6, siren(1.6, .015, 500, 760, 1.6), pan=.8); put(SFX, 34.6, drag(.3, .05))
    # 13 the following years: calendar, arrests
    put(AMB, 35.54, traffic(3.41, .05))
    for k in range(4): put(SFX, 35.8 + k * .4, flap(.15))
    put(SFX, 36.0, siren(.5, .05, 600, 900, .3)); put(SFX, 36.3, radio(.7, .1), pan=-.4)
    for k in range(int(2.6 / .42)): put(SFX, 36.3 + k * .42, step(.08), pan=.3); put(SFX, 36.85 + k * .42, step(.07), pan=.4)
    put(SFX, 37.0, A(click(.1), click(.08))); put(SFX, 38.41, stamp(.4)); put(SFX, 38.8, doorshut(.2), pan=-.4)
    for i in range(9): put(SFX, 38.95 + i / 9.2 * 1.45, stamp(.22), pan=-.4 + i * .1)
    put(AMB, 38.95, fan(1.74, .04))
    # 14 presenter hush
    put(AMB, 40.69, room(2.09, .03)); put(SFX, 40.7, whoosh(.5, .12)); put(SFX, 41.1, pop_(.08))
    # 15 evidence room
    put(AMB, 42.78, hum(7.97, 100, .025) + room(7.97, .04)); put(SFX, 42.8, latch(.12))
    for k in range(int((44.6 - 42.85) / .4)): put(SFX, 42.9 + k * .4, step(.08), pan=-.2 + k * .05)
    put(SFX, 45.6, cashf(.12)); put(SFX, 45.7, thump(.08))
    for k in range(8): put(SFX, 46.4 + k * .075, tick(.06))
    for k in range(3): put(SFX, 48.5 + k * .15, pop_(.1))
    put(SFX, 49.45, stamp(.4))
    # 16 loop home
    put(AMB, 50.75, wind(2.9, .05)); put(SFX, 51.0, siren(1.8, .02, 500, 820, 1.8), pan=-.6); put(SFX, 52.5, whoosh(1.2, .18)); put(SFX, 53.55, rumble(1.0, .2))
    put(AMB, 53.6, room(3.8, .06) + hum(3.8, 50, .02)); put(SFX, 54.2, drip(.05), pan=.3); put(SFX, 55.6, sub(.25, 36, 1.6))
music2(); sfx2()
# ---------------------------------------------------------------- master bed: gentle, leaves room for the narration (mixed privately)
def norm_lufs(x, target):
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'a.wav'; write(p, x)
        out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        I = float([l for l in out.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    return x * 10 ** ((target - I) / 20)
def write(p, x):
    y = np.clip(x, -1, 1); w = wave.open(str(p), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
fade = np.minimum(1, t / .03) * (1 - np.clip((t - 57.15) / .25, 0, 1))  # short tail: the Short loops back into the tunnel
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

