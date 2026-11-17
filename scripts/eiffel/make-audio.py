#!/usr/bin/env python3
"""The Man Who Sold the Eiffel Tower Twice — original score + synchronized SFX bed (pure synthesis, no samples, no narration).
Writes public/eiffel-sound/bed.flac. --stems DIR also writes music.wav / sfx.wav for the private narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/eiffel-sound'
SR, DUR = 48000, 60.0; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(5)
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
# ---------------------------------------------------------------- 1925 Paris instruments (original synthesis)
def accordion(f, d, g=.08, trem=6.0):   # musette: two detuned reeds + gentle bellows tremolo
    x = T(d); s = saw(f, d, .0035) + saw(f, d, -.0035) * .9 + saw(f * 2, d, .002) * .25
    return lp(s, 2600) * (.82 + .18 * np.sin(2 * np.pi * trem * x)) * gate(d, .04, .08) * g
def pizz(f, g=.18): d = .45; x = T(d); return (sum(np.sin(2 * np.pi * f * k * x) * np.exp(-x * (14 + k * 6)) / k for k in range(1, 6)) + lp(noise(d), 500) * env(d, .001, .01) * .3) * g
def strings(fs, d, g=.05, cut=1800, a=.6, r=.8): return sum(lp(saw(f, d, .003) + saw(f, d, -.004) + saw(f, d, .0015), cut) * (1 + .03 * np.sin(2 * np.pi * 5.5 * T(d))) for f in fs) * gate(d, a, r) * g
def clarinet(f, d, g=.07): x = T(d); s = sum(np.sin(2 * np.pi * f * k * x) / k for k in (1, 3, 5, 7)) * (1 + .02 * np.sin(2 * np.pi * 5 * x)); return lp(s, 2200) * gate(d, .05, .12) * g
def snap(g=.05): d = .06; return bp(noise(d), 1500, 6000) * env(d, .0005, .008) * g
def whistle(d=.9, g=.22): x = T(d); f = 2900 + 120 * (np.sin(2 * np.pi * 34 * x) > 0); return bp(np.sin(2 * np.pi * np.cumsum(f) / SR) + noise(d) * .15, 2000, 5000) * gate(d, .02, .1) * g
def paper(d=.4, g=.12): x = T(d); return bp(noise(d), 1200, 9000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 9 * x))) * gate(d, .01, .12) * g
def coin(g=.15): d = .6; x = T(d); return sum(np.sin(2 * np.pi * f * x) * np.exp(-x * k) for f, k in ((3800, 9), (5100, 12), (6900, 16))) * .3 * g + np.pad(click(g), (0, int(.6 * SR) - len(click(g))))
def stamp_hit(g=.5): return A(thump(g * .8), clack(g * .7), lp(noise(.2), 900) * env(.2, .001, .03) * g * .5)
def cobble(g=.12): d = .14; x = T(d); return (bp(noise(d), 700, 4000) * env(d, .001, .02) + np.sin(2 * np.pi * 150 * x) * env(d, .001, .02) * .4) * g
def heel(g=.1): d = .12; x = T(d); return (bp(noise(d), 1500, 6000) * env(d, .0005, .012) + np.sin(2 * np.pi * 320 * x) * env(d, .001, .015) * .5) * g
def footsteps(t0, n, dt, kind=cobble, g=.1, pan=0.0):
    for k in range(n): put(SFX, t0 + k * dt + rng.uniform(-.015, .015), kind(g * rng.uniform(.8, 1.1)), pan=pan)
def oldcar(d, g=.2): x = T(d); f = 22 + 8 * np.minimum(1, x / 1.2); return lp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .6 + noise(d) * .3, 450) * gate(d, .2, .5) * g
def horn(g=.15): d = .5; x = T(d); return lp(saw(370, d) + saw(440, d) * .7, 1800) * gate(d, .02, .1) * (1 + .4 * np.sin(2 * np.pi * 30 * x)) * g
def chuff(g=.2): d = .45; x = T(d); return (bp(noise(d), 300, 2500) * env(d, .005, .12) + lp(noise(d), 200) * env(d, .005, .2) * .8) * g
def steam(d, g=.15): return bp(noise(d), 1500, 9000) * gate(d, .05, .5) * g
def clatter(d, g=.12, rate=2.4):
    o = np.zeros(int(d * SR))
    for k in range(int(d * rate)):
        for j, dl in enumerate((0, .09)):
            i = int((k / rate + dl) * SR); s = clack(g * (1 if j else .8)); n = min(len(s), len(o) - i)
            if n > 0: o[i:i + n] += s[:n]
    return o
def city(d, g=.06): x = T(d); return A(lp(noise(d), 500) * (.8 + .2 * np.sin(2 * np.pi * .11 * x)), bp(noise(d), 900, 2500) * .25) * gate(d, .6, .6) * g
def murmur(d, g=.05): x = T(d); return bp(noise(d), 200, 1100) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 2.3 * x) * np.sin(2 * np.pi * .7 * x))) * gate(d, .5, .5) * g
def chair(g=.1): d = .5; x = T(d); return A(bp(noise(d), 300, 2000) * env(d, .01, .12), creak(.4, g * .6)) * g
def cloth(d=.3, g=.06): return bp(noise(d), 500, 4000) * gate(d, .05, .15) * g
def bells_church(d, g=.04): return A(*[np.pad(bell(NOTE(m), g, 3.0), (int(k * 1.1 * SR), 0)) for k, m in enumerate((67, 64, 60, 55)[:max(1, int(d / 1.1))])])
def sting(g=.4, root=50): return A(hit(g * .7), strings([NOTE(root), NOTE(root + 3), NOTE(root + 6)], 1.4, g * .05, 2500, .01, 1.2))

BEAT = 60 / 132   # waltz at 132 bpm (3/4)
def waltz(t0, t1, chords, g=1.0, mel=None, acc=True):
    """oom-pah-pah: pizz bass on 1, accordion chord stabs on 2 and 3; chords = list of (root midi, [chord midis]) per bar"""
    n = int((t1 - t0) / (3 * BEAT))
    for b in range(n):
        r, ch = chords[b % len(chords)]; at = t0 + b * 3 * BEAT
        put(MUS, at, pizz(NOTE(r), .2 * g), pan=-.2)
        if acc:
            for k in (1, 2): put(MUS, at + k * BEAT, sum(accordion(NOTE(m), BEAT * .55, .028 * g) for m in ch), pan=.15)
        else:
            for k in (1, 2): put(MUS, at + k * BEAT, sum(piano(NOTE(m), .8, .05 * g) for m in ch), pan=.15)
    if mel:
        for (beat, m, dur) in mel:
            at = t0 + beat * BEAT
            if at < t1: put(MUS, at, accordion(NOTE(m), dur * BEAT, .06 * g, 6.5), pan=-.05)

Dm = (50, [62, 65, 69]); A7 = (45, [61, 64, 67]); Gm = (43, [62, 67, 70]); Bb = (46, [62, 65, 70]); F = (41, [60, 65, 69]); C7 = (48, [64, 67, 70]); E7 = (52, [62, 64, 68])
D = (50, [62, 66, 69]); G = (43, [62, 67, 71]); A_ = (45, [61, 64, 69])
def music():
    # 0–10.8 the caper: sly musette waltz in D minor
    mel1 = [(0, 69, 1), (1, 70, 1), (2, 69, 1), (3, 74, 2), (5, 73, 1), (6, 70, 1), (7, 69, 1), (8, 67, 1), (9, 69, 3), (12, 65, 1), (13, 67, 1), (14, 69, 1), (15, 74, 2), (17, 76, 1),
            (18, 77, 1), (19, 76, 1), (20, 74, 1), (21, 73, 3)]
    put(MUS, 0.0, strings([NOTE(50), NOTE(57)], 1.5, .03, 1200, .6, .8))
    waltz(1.0, 10.8, [Dm, Dm, A7, Dm, Gm, Dm, A7, A7], 1.0, mel1)
    put(MUS, 1.28, bell(NOTE(81), .06, 2.0)); put(MUS, 3.75, A(pizz(NOTE(57), .2), np.pad(pizz(NOTE(50), .2), (int(.18 * SR), 0))))   # "own it" shrug
    # 10.8–16.9 the forgery: lighter, staccato, clarinet answers
    waltz(10.8, 16.95, [Dm, Bb, Gm, A7], .9)
    for i, (b, m) in enumerate(((0, 74), (1.5, 77), (3, 76), (4.5, 74), (6, 73), (7.5, 74), (9, 81), (10.5, 79))): put(MUS, 10.8 + b * BEAT, clarinet(NOTE(m), BEAT * 1.2, .06))
    put(MUS, 13.28, A(pizz(NOTE(38), .35)))
    # 16.9–29.8 the pitch: tension builds (strings swell under the waltz)
    waltz(16.95, 29.8, [Dm, Gm, E7, A7], .85, [(0, 74, 3), (3, 73, 3), (6, 71, 3), (9, 69, 3), (12, 70, 2), (14, 69, 1), (15, 68, 3), (18, 69, 3), (21, 74, 3)])
    put(MUS, 16.95, strings([NOTE(50), NOTE(57), NOTE(62)], 6.0, .028, 1300, 1.5, 1.0)); put(MUS, 22.9, strings([NOTE(52), NOTE(59), NOTE(64), NOTE(68)], 6.9, .03, 1700, 1.0, 1.0))
    put(MUS, 18.25, A(*[np.pad(pizz(NOTE(74 - k), .08), (int(k * .09 * SR), 0)) for k in range(4)]))      # "secret"
    put(MUS, 20.74, sting(.45, 38)); put(MUS, 23.95, A(hit(.25))); put(MUS, 24.6, A(hit(.18)))            # demolished / stunned
    put(MUS, 25.3, riser(3.0, .05, 150, 900)); put(MUS, 28.82, A(bell(NOTE(86), .07, 1.5), pizz(NOTE(62), .2)))   # the offer
    # 29.8–36 the bribe: sly, sparse, plucked
    for k in range(13): put(MUS, 29.9 + k * BEAT, pizz(NOTE((50, 57, 53, 57)[k % 4]), .14))
    for (b, m) in ((1, 69), (2.5, 68), (4, 69), (7, 74), (9, 72), (10.5, 70)): put(MUS, 29.9 + b * BEAT, clarinet(NOTE(m), BEAT * 1.3, .055))
    waltz(35.9, 39.3, [F, C7], .9, [(0, 72, 2), (2, 74, 1), (3, 76, 3), (6, 77, 2), (8, 76, 1)])               # Poisson's dream (major)
    put(MUS, 35.9, strings([NOTE(53), NOTE(60), NOTE(65), NOTE(69)], 3.6, .03, 2200, .8, 1.0)); put(MUS, 38.24, sparkle(.07))
    # 39.3 vanish: descending pizz + whoosh; 40.7–45.3 the realisation (dark, slow)
    for k in range(6): put(MUS, 39.4 + k * .11, pizz(NOTE(74 - k * 3), .14))
    put(MUS, 40.7, strings([NOTE(50), NOTE(53), NOTE(57)], 4.6, .035, 900, 1.2, 1.2)); put(MUS, 42.53, sting(.5, 41))
    for (at, m) in ((43.1, 65), (43.9, 64), (44.6, 62)): put(MUS, at, clarinet(NOTE(m), .7, .05))
    # 45.3 the twist: hit + reprise of the caper
    put(MUS, 45.32, A(hit(.55), riser(.3, .1, 400, 2000)))
    waltz(46.0, 50.28, [Dm, Dm, A7, Dm], .95, [(0, 69, 1), (1, 70, 1), (2, 69, 1), (3, 74, 2), (5, 73, 1), (6, 70, 1), (7, 69, 1), (8, 67, 1)])
    # 50.3–53 it fails: alarm stabs, fast chase
    put(MUS, 50.97, sting(.45, 47)); put(MUS, 51.44, A(hit(.3)))
    for k in range(10): put(MUS, 51.75 + k * .125, pizz(NOTE((62, 65, 69, 74)[k % 4]), .15))
    # 53–54.8 the tower: majestic major chord
    put(MUS, 53.0, strings([NOTE(50), NOTE(57), NOTE(62), NOTE(66), NOTE(69)], 2.2, .045, 2600, .4, 1.0)); put(MUS, 53.0, bell(NOTE(74), .07, 2.5))
    # 54.8–60 finale: the caper waltz, resolving on a sly final pizz
    waltz(54.8, 59.3, [Dm, Gm, A7, Dm], .9, [(0, 74, 2), (2, 76, 1), (3, 77, 2), (5, 76, 1), (6, 74, 2), (8, 73, 1), (9, 74, 3)])
    put(MUS, 57.1, bell(NOTE(81), .06, 1.5)); put(MUS, 59.2, A(pizz(NOTE(38), .3), pizz(NOTE(50), .2)))

def sfx():
    put(AMB, 0, city(36.0, .05)); put(AMB, 0, bells_church(4, .025), pan=-.5)
    # 1 the avenue
    footsteps(.25, 4, .42, cobble, .09); put(SFX, 1.3, cloth(.35, .05)); put(SFX, 3.7, cloth(.3, .05))
    # 2 the walk + lady
    footsteps(4.35, 7, .44, heel, .08, -.1); footsteps(4.5, 6, .46, heel, .05, .3); put(SFX, 5.55, cloth(.3, .04))
    # 3 kiosk
    put(SFX, 7.55, coin(.15)); put(SFX, 7.95, paper(.5, .12)); put(SFX, 8.55, A(paper(.4, .1), whoosh(.3, .04))); put(SFX, 10.0, paper(.5, .1))
    # 4 mirror, 5 stamp
    put(AMB, 10.78, room(6.2, .03)); put(SFX, 10.95, cloth(.5, .06)); put(SFX, 11.6, cloth(.4, .05)); put(SFX, 12.15, A(cloth(.2, .05), snap(.04)))
    put(SFX, 12.8, whoosh(.4, .04)); put(SFX, 13.28, stamp_hit(.55)); put(SFX, 13.7, paper(.3, .06))
    # 6 the Crillon
    put(SFX, 14.14, A(whoosh(.5, .06), city(2.8, .04))); put(SFX, 14.2, oldcar(1.4, .18)); put(SFX, 14.95, brake(.5, .06)); put(SFX, 15.2, latch(.12))
    footsteps(15.15, 5, .44, heel, .07, -.2); footsteps(15.55, 4, .44, heel, .06, -.1); footsteps(14.2, 6, .42, heel, .06, .2); put(SFX, 16.6, doorshut(.12))
    # 7–11 the meeting room
    put(AMB, 16.94, murmur(5.8, .035)); put(AMB, 16.94, room(12.9, .03)); put(SFX, 17.1, chair(.08)); put(SFX, 18.25, A(cloth(.2, .04)))
    put(SFX, 19.3, paper(.65, .14)); put(SFX, 20.74, A(whoosh(.35, .05))); put(SFX, 21.08, A(thump(.25), clunk(.2), metal(.06)))
    put(SFX, 22.1, cloth(.2, .05)); put(SFX, 22.62, cloth(.2, .05)); put(SFX, 23.1, cloth(.2, .05))
    put(SFX, 23.95, whoosh(.3, .05)); put(SFX, 24.6, A(whoosh(.3, .05))); put(SFX, 24.55, thump(.06)); put(SFX, 25.0, glass(.06))
    put(SFX, 28.35, A(*[np.pad(scrape(.12, .04), (int(k * .14 * SR), 0)) for k in range(4)])); put(SFX, 29.0, paper(.6, .08))
    # 12–13 the bribe
    put(SFX, 30.0, paper(.3, .08)); put(SFX, 30.6, cloth(.3, .05)); put(AMB, 32.1, room(3.9, .025)); put(SFX, 33.2, A(*[np.pad(paper(.12, .03), (int(k * .18 * SR), 0)) for k in range(4)]))
    put(SFX, 33.95, cloth(.3, .05)); put(SFX, 34.3, A(paper(.4, .1), cashf(.06))); put(SFX, 34.7, A(clack(.08), cloth(.3, .04)))
    # 14 Champ de Mars
    put(AMB, 35.9, A(city(3.4, .04), *[np.pad(bird(.03), (int(k * .8 * SR), 0)) for k in range(3)]), pan=.3); put(SFX, 37.0, cloth(.4, .05))
    # 15 vanish
    footsteps(39.35, 3, .3, heel, .07); put(SFX, 39.85, A(drag(.7, .06), creak(.6, .05))); put(SFX, 40.25, whoosh(.5, .1))
    # 16 realisation, 17 police door
    put(AMB, 40.68, room(2.4, .03)); put(SFX, 41.0, paper(.5, .07)); put(SFX, 42.5, A(whoosh(.4, .08)))
    put(AMB, 43.0, city(2.3, .05)); footsteps(43.05, 5, .42, cobble, .08, .2); put(SFX, 44.6, cloth(.3, .05)); footsteps(44.7, 2, .4, cobble, .07, .1)
    # 18–19 the station
    put(AMB, 45.32, A(steam(1.4, .1), murmur(2.6, .04))); put(SFX, 45.32, whoosh(.5, .1)); put(SFX, 45.9, heel(.1)); footsteps(46.55, 4, .38, heel, .08)
    put(SFX, 47.45, cloth(.25, .04)); put(AMB, 47.95, room(2.3, .03)); put(SFX, 48.1, paper(.6, .12))
    # 20 it fails
    put(SFX, 50.3, A(chair(.12), scrape(.3, .06))); put(SFX, 50.9, cloth(.2, .05)); put(SFX, 51.05, A(doorshut(.25))); put(SFX, 51.15, whistle(.9, .18))
    footsteps(51.8, 4, .14, heel, .09); put(SFX, 52.1, A(chuff(.25), steam(.9, .1))); put(SFX, 52.4, chuff(.22)); put(SFX, 52.7, chuff(.2))
    # 21 the tower, 22 the train
    put(AMB, 53.0, A(city(1.8, .04), np.pad(bird(.03), (int(.6 * SR), 0)))); put(SFX, 53.0, whoosh(.6, .05))
    put(AMB, 54.76, A(clatter(5.24, .05, 2.2), lp(noise(5.24), 220) * gate(5.24, .3, 1.5) * .06)); put(SFX, 55.3, A(*[np.pad(paper(.1, .03), (int(k * .2 * SR), 0)) for k in range(5)]))
    put(SFX, 56.95, cloth(.25, .04)); put(SFX, 57.3, A(chuff(.12), steam(1.5, .05)))

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
fade = np.minimum(1, t / .03) * (1 - np.clip((t - 59.85) / .15, 0, 1))  # fades to silence: clean loop back to the opening
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


