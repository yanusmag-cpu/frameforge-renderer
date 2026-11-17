#!/usr/bin/env python3
"""The Firefighter Who Started Another Fire — SFX only (no music, no voice) + synchronized SFX bed (pure synthesis, no samples, no narration).
Writes public/fire-sound/bed.flac. --stems DIR also writes music.wav / sfx.wav for the private narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/fire-sound'
SR, DUR = 48000, 30.0; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(5)
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



# ================================================================ macro-world instruments (everything is huge and slow, or tiny and fast)
def room_tone(d, g=.04): x = T(d); return A(lp(noise(d), 180) * (.8 + .2 * np.sin(2 * np.pi * .07 * x)), hum(d, 50, .15)) * gate(d, .5, .5) * g
def fiber_rustle(d=.5, g=.06): return bp(noise(d), 1800, 9000) * (.5 + .5 * np.abs(np.sin(np.pi * T(d) / d * 3))) * gate(d, .02, .2) * g
def micro_step(g=.05): d = .07; return bp(noise(d), 2500, 9000) * env(d, .001, .015) * g
def ant_steps(d, g=.03, rate=18):
    out = np.zeros(int(d * SR))
    for k in range(int(d * rate)): s = micro_step(g * (.6 + .4 * (k % 3 == 0))); i = int(k / rate * SR); out[i:i + len(s)] += s[:max(0, len(out) - i)]
    return out
def chitter(g=.05): d = .5; x = T(d); return bp(np.sign(np.sin(2 * np.pi * 1900 * x)) * (np.sin(2 * np.pi * 40 * x) > 0), 1500, 6000) * gate(d, .01, .2) * g
def giant_step(g=.8): d = 3.0; x = T(d); return A(sub(g, 28, d), lp(noise(d), 160) * np.exp(-x * 1.6) * g * 1.4, bp(noise(d), 200, 1500) * env(d, .002, .3) * g * .5)
def creak_floor(d=1.6, g=.15): return creak(d, g)
def spider_step(g=.08): d = .18; x = T(d); return A(bp(noise(d), 600, 4000) * env(d, .001, .03), np.sin(2 * np.pi * 180 * x) * env(d, .001, .02) * .5) * g
def hiss(d=1.0, g=.15): return bp(noise(d), 2500, 9000) * gate(d, .1, .4) * g
def vac_motor(d, g=.3, rise=1.0):
    x = T(d); f = 95 + 45 * np.minimum(1, x / max(rise, .01)); ph = np.cumsum(f) / SR
    whine = np.sin(2 * np.pi * ph * 9) * .25 + np.sin(2 * np.pi * ph * 18) * .1
    return A(lp(np.sign(np.sin(2 * np.pi * ph)) * .5 + whine, 2500), bp(noise(d), 300, 5000) * .9) * np.minimum(1, x / max(rise, .01)) * g
def airflow(d, g=.2): x = T(d); return A(bp(noise(d), 200, 2500), hp(noise(d), 5000) * .4) * (.8 + .2 * np.sin(2 * np.pi * 3.1 * x)) * gate(d, .3, .2) * g
def drip_drop(g=.1): return drip(g)
def wobble(g=.1): d = .9; x = T(d); return np.sin(2 * np.pi * (300 + 60 * np.sin(2 * np.pi * 9 * x) * np.exp(-x * 4)) * x) * env(d, .003, .25) * g
def ruler_tick(g=.08): return A(click(g), bloop(g * .5, 2400)) if 'bloop' in globals() else click(g)
def strain(d=1.4, g=.08): x = T(d); return bp(saw(140 + 30 * x / d, d), 300, 1500) * gate(d, .1, .2) * (.7 + .3 * np.sin(2 * np.pi * 9 * x)) * g

# ---------------------------------------------------------------- score: playful pizzicato wonder → tension → chase
def pluck(f, g=.12): d = .5; x = T(d); return sum(np.sin(2 * np.pi * f * k * x) * np.exp(-x * (8 + k * 3)) / k for k in range(1, 5)) * g
# ---------------------------------------------------------------- forest-fire sound design (original synthesis, effects only)
def roar(d, g=.2, cut=380):   # body of a large fire: low turbulent rumble with slow surges
    x = T(d); n = lp(noise(d), cut) * (1 + .35 * np.sin(2 * np.pi * .23 * x) + .2 * np.sin(2 * np.pi * .61 * x + 1))
    return A(n, bp(noise(d), 300, 1400) * .35 * (.6 + .4 * np.sin(2 * np.pi * .4 * x + 2))) * g
def crackle(d, rate=18, g=.12, bright=6000):   # random snaps and pops (burning twigs, needles)
    o = np.zeros(int(d * SR)); k = int(d * rate)
    for _ in range(k):
        i = int(rng.uniform(0, d - .05) * SR); L = int(SR * rng.uniform(.003, .02)); s = rng.standard_normal(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(.3, 1)
        o[i:i + L] += s
    return bp(o, 900, bright) * g
def wind(d, g=.08): x = T(d); return bp(noise(d), 200, 1800) * (.55 + .45 * np.sin(2 * np.pi * .09 * x) * np.sin(2 * np.pi * .23 * x + .5)) * gate(d, .8, .8) * g
def leaves(d, g=.04): x = T(d); return bp(noise(d), 2500, 9000) * (.4 + .6 * np.maximum(0, np.sin(2 * np.pi * .13 * x))) * gate(d, .6, .6) * g
def step_dirt(g=.1): d = .16; x = T(d); return (bp(noise(d), 400, 3500) * env(d, .002, .03) + lp(noise(d), 180) * env(d, .002, .04) * .7) * g
def cloth(d=.3, g=.05): return bp(noise(d), 500, 4000) * gate(d, .05, .15) * g
def clank(g=.12): d = .5; x = T(d); return (sum(np.sin(2 * np.pi * f * x) * np.exp(-x * k) for f, k in ((1200, 14), (2730, 20), (4100, 26))) * .3 + np.pad(click(1), (0, int(.5 * SR) - len(click(1)))) * .2) * g
def slosh(d=.6, g=.08): x = T(d); return lp(noise(d), 900) * (.5 + .5 * np.sin(2 * np.pi * 5 * x)) * gate(d, .05, .2) * g
def fusee(d=1.2, g=.12): x = T(d); return A(bp(noise(d), 2500, 12000) * gate(d, .02, .3) * (.8 + .2 * np.sin(2 * np.pi * 30 * x)), clack(.6)) * g
def whump(g=.25): d = .6; x = T(d); return A(lp(noise(d), 260) * env(d, .01, .18), np.sin(2 * np.pi * (70 + 40 * np.exp(-x * 8)) * x) * env(d, .005, .2) * .6) * g
def drop_hiss(g=.05): d = .35; return bp(noise(d), 2000, 8000) * env(d, .005, .12) * g
def sub(g=.3, f=48): d = 1.6; x = T(d); return np.sin(2 * np.pi * f * x) * np.exp(-x * 2.2) * g
def engine_idle(d, g=.03): x = T(d); return lp(saw(34, d) + noise(d) * .3, 220) * gate(d, .4, .4) * g
def music(): pass   # this test is effects only

def sfx():
    # constant bed: wind through the canopy, leaves, distant engine idle on the safe side
    put(AMB, 0, wind(30.0, .085)); put(AMB, 0, leaves(30.0, .035), pan=.2); put(AMB, 4.2, engine_idle(25.8, .025), pan=.4)
    # the wildfire: distant roar that grows as the front approaches, crackle near it; lies down after the fronts meet (~19.5–23 s)
    r = roar(30.0, 1.0); k = np.interp(t[:len(r)], [0, 5, 10, 15, 19.4, 22.5, 25, 30], [.10, .13, .17, .26, .32, .16, .10, .08]); put(AMB, 0, r * k)
    put(AMB, 0, crackle(30.0, 24, .06) * np.interp(t[:int(30 * SR)], [0, 15, 19.5, 23, 30], [.6, .9, 1.0, .4, .25]), pan=-.15)
    put(SFX, .15, sub(.18, 42))                                        # opening: low swell as the camera moves toward the fire
    # scene 1–2: crew, footsteps on mineral soil, gear
    put(SFX, 5.1, cloth(.4, .05)); put(SFX, 6.35, A(cloth(.5, .06), step_dirt(.08))); put(SFX, 6.8, step_dirt(.07))
    put(SFX, 7.35, A(clank(.12), slosh(.7, .07))); put(SFX, 7.95, clank(.08))                    # lifts the drip torch, flips the spout
    put(SFX, 8.35, cloth(.3, .05)); put(SFX, 8.55, fusee(1.1, .1)); put(SFX, 9.05, A(whump(.12), drop_hiss(.06)))   # fusee strike → wick catches
    # scene 3: drips ignite the fuel as he walks the line; burnout builds
    for i, at in enumerate(np.arange(10.7, 15.0, .55)): put(SFX, at, step_dirt(.08), pan=-.1 - i * .03)
    for at in np.arange(10.75, 15.0, .32): put(SFX, at + rng.uniform(0, .1), A(drop_hiss(.04), whump(.05 + rng.uniform(0, .04))), pan=rng.uniform(-.4, .2))
    put(SFX, 10.75, A(whump(.28), sub(.14, 55)))                                           # first ignition: small whump + subtle impact
    put(SFX, 11.9, A(cloth(.25, .05), sub(.12, 60)))                                        # her surprise beat
    b = crackle(19.0, 30, .08, 7000) * np.interp(np.arange(int(19 * SR)) / SR, [0, 2, 6, 9, 12.5, 19], [.2, .6, 1.0, 1.0, .25, .05]); put(SFX, 11.0, b, pan=.15)
    put(SFX, 11.0, roar(12.0, .07, 600) * gate(12.0, 1.5, 3.0))                             # the burnout's own lighter roar
    # scene 4: overhead — wind up top
    put(SFX, 15.0, wind(5.0, .05), pan=-.3)
    # scene 5: the fronts meet — heavy surge, then it lies down (no sudden silence)
    put(SFX, 19.3, A(sub(.2, 38), roar(2.5, .12, 300) * gate(2.5, .4, 1.6)))
    put(SFX, 22.3, crackle(3.0, 40, .05)); put(SFX, 23.0, A(*[np.pad(crackle(.4, 60, .06), (int(k * .6 * SR), 0)) for k in range(4)]))
    # scene 6: she understands — gear rattle, footsteps; aerial wind
    put(SFX, 25.45, cloth(.35, .05)); put(SFX, 26.05, A(cloth(.3, .06), clank(.04))); put(SFX, 26.5, step_dirt(.06)); put(SFX, 26.9, step_dirt(.05))
    put(SFX, 26.6, wind(3.4, .06), pan=.3)

music(); sfx()
def norm_lufs(x, target):
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'a.wav'; write(p, x)
        out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        I = float([l for l in out.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    return x * 10 ** ((target - I) / 20)
def write(p, x):
    y = np.clip(x, -1, 1); w = wave.open(str(p), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
fade = np.minimum(1, t / .4) * (1 - np.clip((t - 29.3) / .7, 0, 1))
SFXm = (SFX + AMB) * fade[:, None]
def limit(x, ceiling):
    e = maximum_filter1d(np.abs(x).max(axis=1), int(SR * .006)); g = np.minimum(1, ceiling / np.maximum(e, 1e-9))
    g = -maximum_filter1d(-g, int(SR * .012)); g = uniform_filter1d(g, int(SR * .01)); return x * g[:, None]
bed = SFXm
for _ in range(6): bed = limit(norm_lufs(bed, -18.0), .6)   # restrained: effects only, never harsh
if '--stems' in sys.argv:
    d = Path(sys.argv[sys.argv.index('--stems') + 1]); d.mkdir(parents=True, exist_ok=True); write(d / 'sfx.wav', SFXm)
OUT.mkdir(parents=True, exist_ok=True); tmp = OUT / 'bed.wav'; write(tmp, bed)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'flac', str(OUT / 'bed.flac')], check=True); tmp.unlink()
print('bed written', OUT / 'bed.flac', 'peak', float(np.max(np.abs(bed))))
