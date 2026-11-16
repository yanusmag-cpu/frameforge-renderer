#!/usr/bin/env python3
"""What if humans evolved underwater — original score + synchronized SFX bed (pure synthesis, no samples, no narration).
Writes public/sea-sound/bed.flac. --stems DIR also writes music.wav / sfx.wav for the private narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/sea-sound'
SR, DUR = 48000, 60.0; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(1859)
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
REMAP = False
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


# ================================================================ ambience instruments
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



# ================================================================ ocean instruments
def uw_amb(d, g=.1, cut=500):   # muffled underwater bed: low rumble + slow swell
    x = T(d); return lp(noise(d), cut) * (.7 + .3 * np.sin(2 * np.pi * .11 * x)) * gate(d, .8, .8) * g
def surf_waves(d, g=.1): x = T(d); return A(lp(noise(d), 1200) * (.35 + .65 * np.clip(np.sin(2 * np.pi * .14 * x), 0, 1) ** 2), hp(noise(d), 4000) * .15) * gate(d, .3, .3) * g
def plunge(g=.5): d = 1.4; x = T(d); return A(bp(noise(d), 300, 5000) * env(d, .002, .12) * 1.2, lp(noise(d), 400) * env(d, .05, .5) * .8, sine(120 + 400 * np.exp(-x * 6), d) * env(d, .002, .3) * .2) * g
def bloop(g=.08, f=600): d = .12; x = T(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 2 * x / d)) / SR) * env(d, .002, .04) * g
def bubbles(d, g=.06, rate=12):
    out = np.zeros(int(d * SR)); r = np.random.default_rng(int(d * 1000) + rate)
    for _ in range(int(d * rate)):
        s = bloop(r.uniform(.4, 1) * g, r.uniform(350, 1400)); i = r.integers(0, max(1, len(out) - len(s))); out[i:i + len(s)] += s
    return out
def stroke(g=.08): d = .5; x = T(d); return lp(noise(d), 700) * np.sin(np.pi * x / d) ** 2 * g
def whale_song(d=3.0, g=.12, f0=180):
    x = T(d); f = f0 * (1 + .5 * np.sin(np.pi * x / d) + .08 * np.sin(2 * np.pi * 3 * x)); return lp(np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR), 1200) * gate(d, .6, 1) * g
def blow(g=.4): d = 1.6; return A(bp(noise(d), 400, 4000) * env(d, .02, .4), lp(noise(d), 600) * env(d, .01, .3) * .5) * g
def sonar(g=.08, f=1400): d = 1.6; x = T(d); return np.sin(2 * np.pi * f * x) * np.exp(-x * 3) * g
def hull_creak(d=1.4, g=.12): return creak(d, g)
def motor(d, g=.08): x = T(d); return lp(saw(55, d) + .5 * saw(110, d, .003), 500) * (.8 + .2 * np.sin(2 * np.pi * 7 * x)) * gate(d, .4, .4) * g
def heart(g=.3): return heartbeat(g)
def deep_tone(d, g=.08, f=55): return drone(f, d, g, 180)

# ---------------------------------------------------------------- score: airy, wondering (D Lydian) → descending into the dark → light at the shore
def strings(fs, d, g=.05, cut=1400): return pad(fs, d, g, cut, .8, 1.0)
def music():
    put(MUS, 0, strings([NOTE(62), NOTE(69), NOTE(74)], 4.5, .03, 1800))
    for at, m in ((1.3, 74), (1.8, 76), (2.3, 78), (2.8, 81), (4.0, 78), (4.6, 76), (5.2, 74), (6.2, 81), (6.8, 80), (7.4, 78), (8.0, 74)): put(MUS, at, bell(NOTE(m), .06, 2.2))
    put(MUS, 1.3, strings([NOTE(50), NOTE(57), NOTE(64), NOTE(68)], 7.6, .045, 1600)); put(MUS, 8.9, strings([NOTE(52), NOTE(59), NOTE(64)], 4.4, .045, 1300))
    for k in range(12): put(MUS, 13.2 + k * .48, pulse(NOTE(50 + (0, 7, 12, 7)[k % 4]), .3, .07))       # selection montage
    put(MUS, 13.2, strings([NOTE(50), NOTE(57), NOTE(62)], 5.9, .045)); put(MUS, 19.0, strings([NOTE(55), NOTE(62), NOTE(67)], 5.0, .045, 1100))
    put(MUS, 24.0, strings([NOTE(50), NOTE(57), NOTE(64), NOTE(69)], 4.6, .05, 1800))
    for at, m in ((24.2, 74), (24.9, 78), (25.6, 81), (26.4, 86), (27.2, 81)): put(MUS, at, bell(NOTE(m), .05, 2))
    put(MUS, 28.6, deep_tone(9.5, .1, 43)); put(MUS, 28.6, strings([NOTE(38), NOTE(45), NOTE(50)], 9.4, .05, 600))     # the descent
    for k in range(7): put(MUS, 31.17 + k * .62, bell(NOTE(62 - k * 2), .04, 1.2))
    put(MUS, 38.0, strings([NOTE(41), NOTE(48), NOTE(53)], 5.6, .045, 700)); put(MUS, 43.6, deep_tone(5.0, .12, 36)); put(MUS, 43.6, strings([NOTE(37), NOTE(44)], 5.0, .045, 400))
    put(MUS, 48.5, riser(3.8, .08, 200, 1400)); put(MUS, 48.6, strings([NOTE(50), NOTE(57), NOTE(62)], 5.0, .045, 1200))
    put(MUS, 52.39, A(strings([NOTE(62), NOTE(69), NOTE(74), NOTE(78)], 7.0, .06, 2200), sparkle(.06)))
    for at, m in ((52.5, 74), (53.1, 78), (53.7, 81), (54.6, 86), (55.9, 85), (57.0, 81)): put(MUS, at, bell(NOTE(m), .06, 2.4))

def sfx():
    # 1 hook: waves, the plunge, reef
    put(AMB, 0, surf_waves(1.4, .12)); put(SFX, 1.15, plunge(.45)); put(SFX, 1.3, bubbles(1.4, .07, 30)); put(AMB, 1.3, uw_amb(27.3, .09))
    put(SFX, 2.4, A(stroke(.07), whoosh(.6, .05)), pan=-.4); put(SFX, 3.0, bubbles(.8, .04, 14), pan=.3)
    # 2 city: hum of habitation, swimmers
    put(AMB, 3.95, hum(4.95, 60, .012)); put(SFX, 4.3, bubbles(4.4, .03, 6))
    for k in range(6): put(SFX, 4.2 + k * .75, stroke(.05), pan=float(np.sin(k)) * .3)
    put(SFX, 7.9, A(bell(NOTE(86), .05, 1.2)))
    # 3 ancestor floundering at the surface
    put(SFX, 9.2, bubbles(3.2, .07, 24)); put(SFX, 9.5, splash(.12)); put(SFX, 10.6, splash(.1)); put(SFX, 11.9, A(click(.1), bloop(.06, 300)))
    for k in range(3): put(SFX, 10.3 + k * .8, stroke(.06), pan=.4)
    # 4 selection vignettes
    put(SFX, 14.89, whoosh(.9, .07)); put(SFX, 16.4, heart(.18)); put(SFX, 17.2, heart(.15)); put(SFX, 17.95, A(whoosh(.8, .1), bubbles(1.0, .08, 30)))
    # 5 gills / whale
    put(SFX, 19.2, bubbles(2.0, .03, 5)); put(SFX, 21.05, A(click(.1), thump(.08))); put(SFX, 22.0, whale_song(2.4, .12, 170)); put(SFX, 23.4, blow(.25)); put(SFX, 23.6, bubbles(1.2, .06, 30))
    # 6 homes & group dive
    put(SFX, 25.0, A(knock(.05), drip(.05))); put(SFX, 25.7, plunge(.18)); put(SFX, 26.1, plunge(.15)); put(SFX, 26.4, bubbles(2.0, .06, 20))
    # 7-8 the deep: muffled darker bed, sonar pings at each 10 m, pressure creaks
    put(AMB, 28.6, uw_amb(31.4, .11, 260)); put(SFX, 30.2, A(stroke(.08), bubbles(.8, .05, 18)))
    for k, at in enumerate((31.5, 32.4, 33.3, 34.1, 34.6, 35.0)): put(SFX, at, sonar(.05, 1500 - k * 90))
    put(SFX, 35.2, hull_creak(1.2, .08)); put(SFX, 36.2, A(thump(.12), sub(.15, 40, 1.2)))
    # 9 habitat + submersible
    put(SFX, 38.0, motor(5.6, .09)); put(SFX, 39.7, A(beep(1600, .08, .04), np.pad(beep(1900, .08, .04), (int(.12 * SR), 0)))); put(SFX, 41.0, hull_creak(1.4, .1)); put(SFX, 42.9, A(sub(.2, 36, 1.2), creak(.8, .06)))
    # 10 deeper, colder, the shadow
    put(SFX, 44.3, deep_tone(4.2, .06, 30)); put(SFX, 45.35, A(*[np.pad(bell(NOTE(96 - k), .02, .6), (int(k * .1 * SR), 0)) for k in range(4)])); put(SFX, 46.6, whale_song(3.0, .15, 110)); put(SFX, 46.7, rumble(2.0, .12))
    # 11-12 up into the light, the shore
    put(SFX, 48.6, A(bubbles(3.0, .05, 12), whoosh(1.5, .05))); put(AMB, 51.0, surf_waves(3.0, .05)); put(SFX, 53.9, plunge(.2)); put(AMB, 53.9, surf_waves(6.1, .13)); put(SFX, 54.2, A(*[np.pad(bird(.05), (int(k * .5 * SR), 0)) for k in range(3)]), pan=-.4)
    put(SFX, 58.7, plunge(.25)); put(SFX, 58.9, bubbles(1.0, .07, 25))

music(); sfx()
# ---------------------------------------------------------------- master bed: gentle, leaves room for the narration (mixed privately)
def norm_lufs(x, target):
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'a.wav'; write(p, x)
        out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        I = float([l for l in out.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    return x * 10 ** ((target - I) / 20)
def write(p, x):
    y = np.clip(x, -1, 1); w = wave.open(str(p), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
fade = np.minimum(1, t / .03) * (1 - np.clip((t - 59.6) / .4, 0, 1))  # fades to silence: clean loop back to the opening
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


