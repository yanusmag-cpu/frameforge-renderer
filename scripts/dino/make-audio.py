#!/usr/bin/env python3
"""What if you were raised by dinosaurs — original score + synchronized SFX bed (pure synthesis, no samples, no narration).
Writes public/dino-sound/bed.flac. --stems DIR also writes music.wav / sfx.wav for the private narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/dino-sound'
SR, DUR = 48000, 60.0; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(66)
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


# ================================================================ creature + nature instruments
def formant(src, fs, q=6): return sum(bp(src, f * (1 - 1 / q), f * (1 + 1 / q)) * g for f, g in fs)
def raptor_call(d=.7, g=.25, f0=380):   # bird-like hooting chirp with a throaty edge
    x = T(d); f = f0 * (1 + .35 * np.sin(np.pi * x / d)) * (1 + .04 * np.sin(2 * np.pi * 28 * x)); s = saw(1, d) * 0 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    return formant(lp(s, 3000), [(f0 * 2, 1), (f0 * 4.5, .5)]) * gate(d, .03, .25) * g
def chirp(g=.12, f0=1600): d = .16; x = T(d); f = f0 * (1 + .6 * np.sin(np.pi * x / d)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, .005, .05) * g
def sniff(g=.18): d = .35; return A(bp(noise(.12), 1200, 5000) * env(.12, .02, .05) * g, np.pad(bp(noise(.12), 1200, 5000) * env(.12, .02, .05) * g * .8, (int(.17 * SR), 0)))
def breath_big(d=1.8, g=.12): x = T(d); return bp(noise(d), 150, 1200) * np.sin(np.pi * x / d) ** 2 * g
def rex_roar(d=2.4, g=.6):
    x = T(d); f = 70 + 30 * np.sin(np.pi * x / d); s = lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 900) + lp(noise(d), 500) * 1.2
    return formant(s, [(220, 1), (520, .7), (90, 1.2)], 3) * gate(d, .25, .8) * g
def sauro_call(d=2.6, g=.3): x = T(d); f = 55 + 25 * np.sin(np.pi * x / d) ** 2; return lp(saw(1, d) * 0 + np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR), 400) * gate(d, .5, 1) * g
def screech(g=.1): d = .8; x = T(d); f = 1800 - 900 * x / d; return bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 900, 4500) * gate(d, .05, .4) * g
def heavy_step(g=.5): return A(sub(g, 34, 1.2), lp(noise(.5), 200) * env(.5, .002, .15) * g * .8)
def leaves(d, g=.05): x = T(d); return bp(noise(d), 1500, 7000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * .4 * x + np.sin(2 * np.pi * .13 * x) * 2))) * gate(d, .3, .3) * g
def rain(d, g=.1): return A(hp(noise(d), 2500) * .7, lp(noise(d), 900) * .5) * gate(d, .2, .3) * g
def thunder(g=.6, d=3.5): x = T(d); return A(lp(noise(d), 160) * np.exp(-x * 1.2) * 1.5, bp(noise(d), 200, 2000) * env(d, .002, .15) * .8) * g
def ast_roar(d, g=.3): x = T(d); return (lp(noise(d), 400) * 1.2 + bp(noise(d), 600, 2400) * (x / d) ** 2) * (x / d) ** 1.4 * g
def boom(g=.9): d = 6; x = T(d); return A(sub(g * 1.2, 26, d), lp(noise(d), 120) * np.exp(-x * .5) * g * 1.4, bp(noise(d), 100, 600) * np.exp(-x * .9) * g * .6)
def flutter(g=.08): d = .6; x = T(d); return bp(noise(d), 600, 3500) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 14 * x))) * gate(d, .02, .2) * g
def stream(d, g=.06): x = T(d); return A(bp(noise(d), 400, 3000) * (.7 + .3 * np.sin(2 * np.pi * 1.7 * x)), hp(noise(d), 4000) * .3) * gate(d, .2, .3) * g
def falls(d, g=.08): return A(lp(noise(d), 700), bp(noise(d), 700, 3000) * .5) * gate(d, .4, .4) * g
def insects(d, g=.03): x = T(d); return bp(noise(d), 5000, 9000) * (.4 + .6 * (np.sin(2 * np.pi * 18 * x) > .3)) * gate(d, .5, .5) * g

# ---------------------------------------------------------------- score: warm A-minor theme → tension → elegy → a little light at the end
def strings(fs, d, g=.06, cut=1400): return pad(fs, d, g, cut, .6, .8)
def music():
    th = [(.3, 69, .9), (1.2, 72, .9), (2.1, 76, 1.6), (4.2, 74, .9), (5.1, 72, .9), (6.0, 69, 2.0)]       # theme (piano)
    for at, m, d in th: put(MUS, at, piano(NOTE(m), d + 1.2, .11))
    put(MUS, 0, strings([NOTE(57), NOTE(64), NOTE(69)], 8.4, .045)); put(MUS, 8.2, strings([NOTE(53), NOTE(60), NOTE(65)], 4.2, .05)); put(MUS, 12.2, strings([NOTE(60), NOTE(64), NOTE(67)], 5.6, .05))
    for at, m in ((12.3, 72), (13.2, 76), (14.1, 79), (15.0, 81), (15.8, 79), (16.6, 76)): put(MUS, at, piano(NOTE(m), 1.6, .09))
    for k in range(9): put(MUS, 17.7 + k * .45, pulse(NOTE(45 + (k % 2) * 7), .3, .09))                          # learning montage drive
    put(MUS, 20.7, drone(NOTE(38), 1.2, .08, 400))
    put(MUS, 21.8, strings([NOTE(57), NOTE(60), NOTE(64)], 3.0, .05, 1100)); put(MUS, 24.2, strings([NOTE(53), NOTE(57), NOTE(62)], 5.3, .055, 900))
    put(MUS, 23.4, riser(6.6, .12, 120, 900)); put(MUS, 26.5, drone(NOTE(33), 3.6, .1, 260))
    put(MUS, 30.1, hit(.5)); put(MUS, 30.4, drone(NOTE(33), 9.0, .12, 220))
    for k in range(10): put(MUS, 32.3 + k * .6, pulse(NOTE(33), .5, .1))                                       # dread pulse under the destruction
    put(MUS, 39.6, strings([NOTE(45), NOTE(52), NOTE(57)], 4.9, .05, 700))
    for k in range(13): put(MUS, 44.3 + k * .32, pulse(NOTE(45 if k % 4 < 2 else 48), .25, .11))             # escape
    put(MUS, 44.3, riser(3.6, .1, 150, 1200))
    for at, m, d in ((48.6, 64, 1.4), (50.0, 62, 1.2), (51.2, 60, 1.6), (52.8, 59, 1.1), (53.8, 57, 2.4)):    # elegy (theme inverted, slower)
        put(MUS, at, piano(NOTE(m), d + 1.4, .1))
    put(MUS, 48.5, strings([NOTE(45), NOTE(52), NOTE(60)], 6.0, .055, 800))
    put(MUS, 54.4, strings([NOTE(53), NOTE(57), NOTE(60)], 2.4, .05, 1000)); put(MUS, 56.6, strings([NOTE(60), NOTE(64), NOTE(67), NOTE(72)], 3.4, .06, 1800))
    for at, m in ((56.8, 72), (57.5, 76), (58.0, 79), (58.6, 84)): put(MUS, at, piano(NOTE(m), 1.6, .1))   # birds survived: rising, hopeful
    put(MUS, 57.9, sparkle(.07))

def sfx():
    # 1 hook: dawn valley, distant sauropod calls, pterosaur screech, waterfall
    put(AMB, 0, wind(4.2, .05)); put(AMB, 0, falls(4.2, .05), pan=-.4); put(SFX, .9, sauro_call(2.8, .18), pan=-.3); put(SFX, 2.6, screech(.06), pan=.5); put(SFX, 3.6, whoosh(.6, .08))
    # 2-5 forest clearing: insects, leaves, stream far; hatchlings, mother
    put(AMB, 4.15, insects(8.0, .025)); put(AMB, 4.15, leaves(8.0, .04)); put(AMB, 4.15, room(8.0, .02))
    put(SFX, 4.4, A(bp(noise(.4), 300, 1200) * env(.4, .05, .1) * .08)); put(SFX, 5.0, drag(.6, .06))                      # stirs, sits up
    for k, tt in enumerate((5.75, 6.05, 6.3, 6.6, 6.85)): put(SFX, tt, chirp(.07, 1500 + k * 220), pan=(k % 3 - 1) * .5)  # hatchlings
    for k in range(6): put(SFX, 5.7 + k * .22, step(.03, False), pan=.3)
    for k in range(4): put(SFX, 7.2 + k * .38, A(step(.12, False), lp(noise(.2), 300) * env(.2, .002, .05) * .1), pan=-.3)   # mother steps out of the ferns
    put(SFX, 7.15, leaves(.8, .1), pan=-.4); put(SFX, 7.8, raptor_call(.6, .1, 330), pan=-.2)
    put(SFX, 8.3, sniff(.2)); put(SFX, 8.75, sniff(.16)); put(SFX, 9.3, A(breath_big(1.2, .1)))
    put(SFX, 10.4, A(flutter(.12), drag(.8, .08))); put(SFX, 10.9, raptor_call(.9, .08, 280)); put(SFX, 11.2, chirp(.06, 2000), pan=.4)
    # 6-8 walking together, feathers, bird
    put(AMB, 12.1, leaves(5.6, .05)); put(AMB, 12.1, insects(5.6, .02))
    for k in range(6): put(SFX, 12.15 + k * .42, step(.07, False))
    for k in range(4): put(SFX, 12.4 + k * .55, step(.1, False), pan=-.2)
    put(SFX, 14.95, A(flutter(.16), whoosh(.5, .06))); put(SFX, 15.8, flutter(.08), pan=.4)
    for tt in (16.3, 16.75, 17.1): put(SFX, tt, bird(.08), pan=.3)
    put(SFX, 16.6, raptor_call(.5, .06, 420))
    # 9 log run → 10 hide → 11 footprints → 12 storm
    for k in range(7): put(SFX, 17.68 + k * .19, A(step(.1), knock(.04)))
    put(SFX, 18.62, A(dirt(.15), thump(.15))); put(SFX, 18.7, rex_roar(1.6, .35), pan=-.4)
    for tt in (18.75, 19.15): put(SFX, tt, heavy_step(.35))
    for k in range(4): put(SFX, 19.3 + k * .42, A(step(.08, False), splash(.03))); put(AMB, 19.25, stream(1.5, .07))
    put(AMB, 20.7, rain(1.15, .14)); put(SFX, 20.92, thunder(.45)); put(SFX, 21.36, thunder(.35, 2.5)); put(SFX, 20.8, flutter(.08))
    # 13 overlook: calm evening, then the tremor
    put(AMB, 21.8, wind(4.8, .05)); put(AMB, 21.8, insects(1.5, .02))
    put(SFX, 22.3, A(rumble(1.6, .5), sub(.35, 30, 1.8))); put(SFX, 22.35, rubble(1.2, .12)); put(SFX, 22.4, A(*[np.pad(bird(.06), (int(k * .12 * SR), 0)) for k in range(6)]), pan=-.5); put(SFX, 22.45, flutter(.1), pan=-.4)
    put(SFX, 22.6, raptor_call(.5, .08, 450))
    # 14-15 the asteroid: a growing high-altitude roar, wind
    put(SFX, 23.3, ast_roar(6.75, .22)); put(AMB, 26.6, wind(2.8, .06)); put(SFX, 27.6, chirp(.05, 1300), pan=-.3)
    # 16 impact: flash, then the deep boom rolls in; 17 heat/flames/dust; 18 ash wind
    put(SFX, 30.05, A(hp(noise(.5), 1500) * env(.5, .001, .2) * .15)); put(SFX, 30.6, boom(.9)); put(SFX, 31.2, rumble(4.0, .5))
    put(AMB, 32.3, fire(7.3, .1)); put(SFX, 32.32, whoosh(1.2, .1)); put(SFX, 32.73, fire(1.5, .15)); put(SFX, 33.4, A(rumble(2.5, .35), wind(2.5, .12)))
    put(AMB, 35.2, wind(9.1, .12)); put(AMB, 35.2, leaves(9.1, .08)); put(SFX, 36.0, A(flutter(.12), drag(.6, .06))); put(SFX, 36.6, raptor_call(1.0, .07, 260))
    put(SFX, 40.0, sauro_call(3.2, .14), pan=.4); put(SFX, 41.6, whoosh(1.0, .05))
    # 20 escape: running, ejecta strikes, the knock-down
    put(AMB, 44.3, A(fire(4.15, .14), wind(4.15, .12)))
    for k in range(16): put(SFX, 44.35 + k * .25, step(.09))
    for k in range(10): put(SFX, 44.4 + k * .4, heavy_step(.12))
    for tt in (44.6, 45.4, 46.1, 46.9, 47.55): put(SFX, tt - .9, whoosh(.9, .1)); put(SFX, tt, A(crunch(1.0, .35), sub(.3, 40, 1.0)), pan=float(np.sin(tt)) * .5)
    put(SFX, 47.93, A(hit(.55), crunch(1.2, .5))); put(SFX, 48.1, A(drag(.5, .1), thump(.2)))
    put(SFX, 45.9, raptor_call(.6, .1, 500)); put(SFX, 48.2, raptor_call(.7, .1, 420))
    # 21-22 grey world, the hug
    put(AMB, 48.45, wind(6.0, .06)); put(SFX, 49.2, chirp(.04, 1100)); put(SFX, 49.9, chirp(.04, 1000)); put(SFX, 52.5, A(flutter(.1), breath_big(1.5, .1))); put(SFX, 53.3, raptor_call(1.0, .05, 300))
    # 23-24 the twist: a little bird, wings into the light
    put(AMB, 54.4, wind(5.6, .04)); put(SFX, 54.65, flutter(.07)); put(SFX, 55.2, bird(.09)); put(SFX, 55.7, bird(.07)); put(SFX, 56.7, flutter(.1))
    for k in range(6): put(SFX, 57.0 + k * .32, flap(.05))
    put(SFX, 58.0, bird(.1)); put(SFX, 58.9, bird(.07))

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


