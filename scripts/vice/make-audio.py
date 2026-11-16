#!/usr/bin/env python3
"""Why GTA 6 took 13 years — original synthwave score + synchronized SFX bed (pure synthesis, no samples, no narration).
Writes public/vice-sound/bed.flac. --stems DIR also writes music.wav / sfx.wav for the private narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/vice-sound'
SR, DUR = 48000, 61.1; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(2026)
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

# ================================================================ Vice instruments
def horn(d=.45, g=.12): x = T(d); return lp(np.sign(np.sin(2 * np.pi * 415 * x)) + np.sign(np.sin(2 * np.pi * 523 * x)), 2200) * gate(d, .01, .05) * g
def flipcard(g=.18): d = .18; x = T(d); return (bp(noise(d), 1200, 7000) * env(d, .0005, .02) + np.sin(2 * np.pi * 300 * x) * env(d, .001, .02) * .3) * g
def neonbuzz(d, g=.02): x = T(d); return bp(np.sign(np.sin(2 * np.pi * 120 * x)) * (.8 + .2 * np.sin(2 * np.pi * 3 * x)), 100, 2500) * gate(d, .1, .2) * g
def gull(g=.04): d = .6; x = T(d); f = 1800 + 700 * np.sin(np.pi * x / d) * np.exp(-x * 2); return bp(saw(1, d) * 0 + np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 + .5 * np.sin(2 * np.pi * 30 * x)), 900, 4000) * env(d, .03, .2) * g
def waves(d, g=.06): x = T(d); return lp(noise(d), 1100) * (.3 + .7 * np.clip(np.sin(2 * np.pi * .16 * x), 0, 1) ** 2) * gate(d, .6, .6) * g
def uiblip(f=1500, g=.08): return A(beep(f, .05, g), np.pad(beep(f * 1.5, .05, g * .8), (int(.05 * SR), 0)))
def errbuzz(g=.12): return A(lp(saw(180, .18), 1500) * gate(.18, .005, .03) * g, np.pad(lp(saw(180, .18), 1500) * gate(.18, .005, .03) * g, (int(.24 * SR), 0)))
def success(g=.1): return A(*[np.pad(bell(NOTE(m), g, 1.2), (int(k * .08 * SR), 0)) for k, m in enumerate((79, 83, 86, 91))])
def shimmer(d, g=.04): return A(*[np.pad(bell(NOTE(88 + (k * 5) % 12), g * .5, .9), (int(k * d / 10 * SR), 0)) for k in range(10)])
def cymbal(d=2.2, g=.12): x = T(d); return hp(noise(d), 5000) * (np.minimum(1, x / max(d - .05, .01)) ** 3) * g   # reverse swell into a hit
def kick(g=.5): return sub(g, 48, .45)
def snare(g=.25): d = .25; x = T(d); return (bp(noise(d), 1500, 8000) * env(d, .001, .07) + np.sin(2 * np.pi * 190 * x) * env(d, .001, .04) * .6) * g
def hat(g=.06): d = .06; return hp(noise(d), 7000) * env(d, .0005, .015) * g

# ---------------------------------------------------------------- music: 96 bpm synthwave, ducked under narration in the private mix
BPM = 96; BEAT = 60 / BPM; BAR = 4 * BEAT
PROG = [(45, (57, 60, 64)), (41, (57, 60, 65)), (48, (55, 60, 64)), (43, (55, 59, 62))]   # Am F C G
def bass_note(f, d, g=.16): return lp(saw(f, d, .003) + saw(f, d, -.004), 520) * env(d, .004, d * .6) * g
def arp(f, d, g=.05): return lp(saw(f, d) + saw(f * 2, d, .003) * .4, 2600) * env(d, .002, .09) * g
def music():
    sections = [(0, 2.6, 'hook'), (2.6, 8.4, 'build'), (8.4, 22.95, 'city'), (22.95, 29.8, 'turn'), (29.8, 46.1, 'studio'), (46.1, 53.3, 'delay'), (53.3, 61.1, 'end')]
    def sec(tt): return next((n for a, b, n in sections if a <= tt < b), 'end')
    k = 0; tb = .1
    while tb < 60.5:
        root, ch = PROG[k % 4]; s = sec(tb)
        if s in ('city', 'studio', 'end', 'build', 'delay'):
            put(MUS, tb, pad([NOTE(m) for m in ch], BAR + .4, .028 if s != 'end' else .035, 1500 if s == 'city' else 1000, .3, .5))
        if s in ('city', 'studio', 'end'):
            for b in range(8): put(MUS, tb + b * BEAT / 2, bass_note(NOTE(root - 12 + (12 if b % 4 == 3 else 0)), BEAT / 2 * .9))
            for b in range(16): put(MUS, tb + b * BEAT / 4, arp(NOTE(ch[b % 3] + 12 * (b // 8)), BEAT / 4), pan=.35 * np.sin(b))
            for b in range(4): put(MUS, tb + b * BEAT, kick(.22)); put(MUS, tb + b * BEAT + BEAT / 2, hat(.05), pan=.2)
            put(MUS, tb + BEAT, snare(.1)); put(MUS, tb + 3 * BEAT, snare(.1))
        if s == 'build':
            for b in range(8): put(MUS, tb + b * BEAT / 2, pulse(NOTE(root), .12, .08))
        if s == 'turn':
            put(MUS, tb, drone(NOTE(root - 12), BAR + .5, .05, 400))
            for b in range(4): put(MUS, tb + b * BEAT, pulse(NOTE(root + 12), .1, .04))
        if s == 'delay':
            for b in range(8): put(MUS, tb + b * BEAT / 2, bass_note(NOTE(root - 12), BEAT / 2 * .8, .1))
        tb += BAR; k += 1
    put(MUS, 0, piano(NOTE(69), 2.4, .1)); put(MUS, .4, piano(NOTE(76), 2.0, .07))
    put(MUS, 6.2, riser(2.2, .14)); put(MUS, 8.38, cymbal(.01, 0)); put(MUS, 8.4, hit2(.32))
    put(MUS, 27.4, riser(2.4, .1)); put(MUS, 29.8, hit(.22))
    put(MUS, 53.3, hit2(.25)); put(MUS, 58.9, riser(1.2, .08)); put(MUS, 60.1, pad([NOTE(m) for m in (57, 64, 69, 72)], 1.0, .05, 1800, .02, .6))

def sfx():
    # 1 hook — stage, GTA V case
    put(AMB, 0, room(8.4, .03) + neonbuzz(8.4, .012)); put(SFX, .05, whoosh(.5, .12)); put(SFX, .35, scrape(.25, .05)); put(SFX, 1.22, A(thump(.25), clack(.12)))
    # 2 calendar flips 2013 → 2026
    for k in range(14): put(SFX, 2.7 + (4.4 - 2.7) * k / 13.99, flipcard(.14 + .01 * k), pan=.2)
    put(SFX, 4.45, hit(.38)); put(SFX, 4.5, A(sub(.3, 40, 1.2)))
    # 3 VI case reveal + push into the cover
    put(SFX, 4.6, whoosh(.45, .22)); put(SFX, 4.78, sparkle(.1)); put(SFX, 5.6, whoosh(.3, .06)); put(SFX, 7.9, whoosh(.55, .2)); put(SFX, 8.3, sparkle(.08))
    # 4 rooftop — wind, distant city
    put(AMB, 8.4, wind(2.4, .05) + traffic(2.4, .05)); put(AMB, 8.8, gull(.03), pan=-.6); put(SFX, 8.45, step(.08)); put(SFX, 8.95, whoosh(.3, .04))
    # 5 aerial — city to beach
    put(AMB, 10.7, traffic(1.5, .06)); put(AMB, 10.7, wind(2.7, .04)); put(AMB, 11.8, waves(1.6, .09)); put(AMB, 12.2, gull(.04), pan=.5); put(AMB, 12.9, gull(.03), pan=-.4); put(SFX, 10.7, whoosh(.7, .1))
    # 6 swamp, highway
    put(SFX, 13.33, whoosh(.25, .07)); put(AMB, 13.35, crickets(.55, .04) + frogs(.55, .03)); put(SFX, 13.83, whoosh(.25, .07))
    put(AMB, 13.85, traffic(.7, .08)); put(SFX, 13.9, carpass(.9, .22), pan=-.5); put(SFX, 14.2, carpass(.8, .16), pan=.5)
    # 7 deco facade detail
    put(AMB, 14.55, traffic(2.2, .05) + wind(2.2, .03)); put(SFX, 14.55, whoosh(.4, .08)); put(SFX, 15.7, shimmer(1.0, .05)); put(AMB, 15.0, crowd(1.7, .04))
    # 8 street level — crowds, traffic, red light, reactions
    put(AMB, 16.72, crowd(6.25, .07) + traffic(6.25, .06)); put(SFX, 16.72, whoosh(.3, .07))
    for k in range(10): put(SFX, 16.8 + k * .42, step(.05), pan=-.1)
    for tt, pn in ((17.3, -.6), (18.1, .5), (18.9, -.3), (19.5, .6)): put(SFX, tt, carpass(1.6, .18), pan=pn)
    put(SFX, 20.0, beep(880, .08, .05)); put(SFX, 20.45, beep(660, .1, .05)); put(SFX, 20.55, brake(.8, .09), pan=.3); put(SFX, 20.75, brake(.6, .07), pan=-.3)
    put(SFX, 20.6, engine(2.3, .05, 34, 32))
    for k in range(8): put(SFX, 20.85 + k * .36, step(.05), pan=.1 * np.sin(k))
    put(SFX, 22.05, horn(.5, .1), pan=.4); put(SFX, 22.13, whoosh(.2, .05))
    # 9 "something most people don't realize"
    put(AMB, 22.95, muffle(crowd(2.6, .05) + traffic(2.6, .04)) if 'muffle' in globals() else crowd(2.6, .03)); put(SFX, 23.4, pop_(.08)); put(SFX, 24.0, whoosh(.3, .04))
    # 10 studio wide, timeline wall
    put(SFX, 25.55, whoosh(.45, .18)); put(AMB, 25.55, room(28.0, .05) + fan(28.0, .04) + hum(28.0, 60, .012)); put(AMB, 25.6, keys(20.0, .035), pan=-.3)
    put(SFX, 28.1, uiblip(1400, .06)); put(SFX, 28.55, A(thump(.18), uiblip(1800, .05))); put(SFX, 29.2, uiblip(1600, .05))
    # 11 RDR2 2018
    for k in range(10): put(SFX, 29.85 + k * .44, step(.06), pan=-.1)
    put(SFX, 32.35, whoosh(.3, .09)); put(SFX, 32.45, A(clack(.12), sparkle(.05))); put(SFX, 34.65, A(thump(.2), uiblip(1300, .06)))
    # 12 online updates
    put(SFX, 35.5, whoosh(.4, .1))
    for k in range(9): put(SFX, 36.0 + k * .23, uiblip(1200 + 90 * k, .045), pan=.3 * np.sin(k * 1.7))
    # 13 dev montage
    put(SFX, 38.1, whoosh(.3, .1)); put(SFX, 38.2, keys(2.8, .07), pan=.2)
    for k in range(5): put(SFX, 38.6 + k * .45, click(.06))
    put(SFX, 41.1, whoosh(.45, .12)); put(AMB, 41.1, traffic(2.85, .03) + crowd(2.85, .03)); put(SFX, 41.6, A(shimmer(.6, .07), whoosh(.35, .08))); put(SFX, 42.9, A(sparkle(.08), thump(.1)))
    put(SFX, 43.95, whoosh(.35, .1)); put(SFX, 44.99, errbuzz(.1)); put(SFX, 45.2, keys(.25, .08)); put(SFX, 45.46, success(.09))
    # 14 delay history
    put(SFX, 46.0, whoosh(.4, .1)); put(SFX, 46.4, uiblip(1300, .05))
    for tt in (47.2, 48.6): put(SFX, tt, A(errbuzz(.09), thump(.18)))
    put(SFX, 49.7, A(success(.1), thump(.16))); put(SFX, 50.6, uiblip(1900, .05)); put(SFX, 51.55, shimmer(1.6, .06))
    # 15 finale — three cases, the twist
    put(SFX, 53.3, whoosh(.5, .18)); put(AMB, 53.3, room(7.8, .03) + neonbuzz(7.8, .012))
    for k, tt in enumerate((53.6, 53.8, 54.0)): put(SFX, tt, A(clack(.08), uiblip(1100 + 220 * k, .04)), pan=(k - 1) * .5)
    put(SFX, 55.1, A(thump(.25), sub(.2, 44, 1.0))); put(SFX, 57.2, A(stamp(.25), whoosh(.25, .06))); put(SFX, 57.9, whoosh(.2, .05)); put(SFX, 59.2, A(stamp(.25)))
    put(SFX, 60.1, whoosh(1.0, .1))
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
fade = np.minimum(1, t / .03) * (1 - np.clip((t - 60.75) / .3, 0, 1))  # fades to silence: clean loop back to the opening
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


