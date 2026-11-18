#!/usr/bin/env python3
"""Empire History Z — The War That Lasted Only 38 Minutes: original synthesized SFX + score (no samples, no voice).
Writes public/ehz-sound/bed.flac. --stems DIR also writes music.wav / sfx.wav for the narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/ehz-sound'
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
CUES = json.load(open(Path(__file__).with_name('cues.json')))
def A(*xs):
    n = max(len(x) for x in xs); o = np.zeros(n)
    for x in xs: o[:len(x)] += x
    return o
def echo(x, taps=((.32, .35), (.71, .2), (1.3, .1)), cut=1200):
    o = np.pad(x, (0, int(1.5 * SR)))
    for d, g in taps: k = int(d * SR); o[k:k + len(x)] += lp(x, cut) * g
    return o
def cannon(dist, big=False, powder=False):
    d = 2.6; x = T(d); f0 = 75 if big else 85
    body = np.sin(2 * np.pi * np.cumsum(f0 * .5 * (1 + 1.6 * np.exp(-x * 14))) / SR) * env(d, .001, .32 if powder else .22)
    crack = hp(noise(d), 1500) * env(d, .0005, .018) * (.9 if not powder else .6)
    blast = lp(noise(d), 1400 if powder else 2400) * env(d, .001, .09 if not powder else .2)
    tail = lp(noise(d), 600) * env(d, .02, .7) * .35
    s = body * 1.1 + crack + blast * .9 + tail
    cut = 9000 / (1 + dist * .06); s = lp(s, max(900, cut))
    return echo(s, cut=900) * (1.6 / (1 + dist * .07))
def crumble(d=1.4, g=.3, rate=55):
    o = np.zeros(int(d * SR)); n = int(rate * d)
    for _ in range(n):
        at = int(rng.uniform(0, d) ** 1.6 / d ** .6 * SR); L = int(rng.uniform(.004, .03) * SR); f = rng.uniform(600, 4000)
        g2 = bp(noise(L / SR), f * .6, min(f * 1.6, 20000)) * env(L / SR, .0005, L / SR / 3) * rng.uniform(.3, 1)
        if at + len(g2) < len(o): o[at:at + len(g2)] += g2
    return o * g
def boom(dist, ship=False):
    d = 3.2; x = T(d)
    b = np.sin(2 * np.pi * np.cumsum(48 * (1 + 2 * np.exp(-x * 10))) / SR) * env(d, .001, .5) * 1.2
    s = A(b, hp(noise(d), 1200) * env(d, .0005, .03), lp(noise(d), 900) * env(d, .002, .35), crumble(1.6, .45 if not ship else .3), lp(noise(d), 160) * env(d, .03, 1.1) * 1.4)
    if ship: s = A(s, bp(noise(1.0), 300, 1500) * env(1.0, .002, .25) * .5)
    s = lp(s, max(1000, 11000 / (1 + dist * .05)))
    return echo(s, cut=700) * (1.8 / (1 + dist * .06))
def splash(dist, big=1.0):
    d = 2.2; x = T(d)
    s = A(lp(noise(d), 300) * env(d, .002, .08) * 1.2, bp(noise(d), 400, 5000) * env(d, .01, .35) * .9, hp(noise(d), 3000) * (sm(.3, .6, x) * (1 - sm(.6, 2.0, x))) * .35)
    return lp(s, max(1200, 12000 / (1 + dist * .05))) * big * (1.4 / (1 + dist * .07))
def whistle(d=.55, g=.06): x = T(d); f = 2200 - 1300 * (x / d); return np.sin(2 * np.pi * np.cumsum(f) / SR) * (x / d) ** 2 * g
def bell(g=.6, f=196):
    d = 5.0; x = T(d); s = sum(np.sin(2 * np.pi * f * r * x) * np.exp(-x * k) * a for r, k, a in ((1, .6, 1), (2.0, .9, .6), (2.4, 1.4, .5), (3.0, 1.8, .35), (4.2, 2.6, .25), (5.4, 3.5, .15), (.5, .4, .5)))
    return (s + hp(noise(d), 2000) * env(d, .0005, .01) * .3) * g * .4
def ticktock(g=.2, hi=True): d = .06; return bp(noise(d), 2500 if hi else 1500, 9000 if hi else 6000) * env(d, .0004, .008) * g + np.sin(2 * np.pi * (3200 if hi else 2400) * T(d)) * env(d, .0004, .004) * g * .4
def popfx(g=.12): d = .12; x = T(d); return np.sin(2 * np.pi * np.cumsum(700 - 3000 * x) / SR) * env(d, .002, .03) * g
def boing(g=.12, d=.35): x = T(d); return np.sin(2 * np.pi * np.cumsum(180 + 260 * np.sin(x / d * np.pi) * np.exp(-x * 4)) / SR) * env(d, .004, .12) * g
def ratchet(d, rate=14, g=.1):
    o = np.zeros(int(d * SR))
    for k in range(int(d * rate)): i = int(k / rate * SR); c = clack(g * rng.uniform(.6, 1)); m = min(len(c), len(o) - i); o[i:i + m] += c[:m]
    return o
def creak(d=1.2, g=.12): x = T(d); f = 90 + 40 * np.sin(x * 3) + 20 * np.sin(x * 11); return bp(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * (.5 + .5 * np.sin(x * 23)), 200, 1800) * gate(d, .1, .3) * g
def bubbles(d, g=.08):
    o = np.zeros(int(d * SR))
    for _ in range(int(d * 18)):
        i = int(rng.uniform(0, d - .1) * SR); L = .05; xx = T(L); f = rng.uniform(250, 900); s = np.sin(2 * np.pi * np.cumsum(f * (1 + 2 * xx / L)) / SR) * env(L, .002, .015) * rng.uniform(.4, 1)
        o[i:i + len(s)] += s
    return o * g
def crackle(d, rate=30, g=.06):
    o = np.zeros(int(d * SR))
    for _ in range(int(d * rate)):
        i = int(rng.uniform(0, d) * SR); L = int(rng.uniform(.002, .012) * SR); s = hp(noise(L / SR), 1000) * env(L / SR, .0003, L / SR / 4) * rng.uniform(.2, 1)
        if i + len(s) < len(o): o[i:i + len(s)] += s
    return A(o, lp(noise(d), 500) * .25) * g
def waves(d, g=.1): x = T(d); sw = .55 + .45 * np.sin(2 * np.pi * .11 * x) * np.sin(2 * np.pi * .043 * x + 1); return A(lp(noise(d), 450) * sw, hp(noise(d), 2500) * sw ** 3 * .25) * g
def engine(d, g=.12, rate=3.1): x = T(d); return (lp(noise(d), 220) * (.4 + .6 * (np.sin(2 * np.pi * rate * x) > .2)) + lp(saw(48, d), 160) * .3) * gate(d, .6, .8) * g

# ------------------------------------------------------------------- score (original)
BEAT = 60 / 96
def tom(f=55, g=.5): d = 1.4; x = T(d); return (np.sin(2 * np.pi * np.cumsum(f * (1 + .9 * np.exp(-x * 18))) / SR) * env(d, .002, .32) + lp(noise(d), 400) * env(d, .001, .05) * .5) * g
def snare(g=.15): d = .4; return (bp(noise(d), 1200, 7000) * env(d, .001, .09) + np.sin(2 * np.pi * 190 * T(d)) * env(d, .001, .04) * .6) * g
def brass(fs, d, g=.1):
    x = T(d); e = np.exp(-x * 5); s = sum(saw(f, d, .003) + saw(f, d, -.004) for f in fs)
    return (lp(s, 3200) * e + lp(s, 750) * (1 - e)) * gate(d, .02, .25) * g
def string(f, d, g=.1): x = T(d); vib = 1 + .006 * np.sin(2 * np.pi * 5.2 * x) * sm(.2, .8, x); return lp(saw(1, d) * 0 + (2 * ((np.cumsum(f * vib) / SR) % 1) - 1), 1400) * gate(d, .25, .5) * g
D2, A2, D3, F3, A3, C3, Bb2 = NOTE(38), NOTE(45), NOTE(50), NOTE(53), NOTE(57), NOTE(48), NOTE(46)
def music():
    put(MUS, 0.0, drone(D2, 22.6, .1, 260))
    put(MUS, 0.0, tom(44, .5)); [put(MUS, c, tom(48, .3)) for c in (1.75, 3.7, 6.0, 8.0)]
    t0 = 1.75; n = 0
    while t0 < 22.4:   # low string ostinato, rising intensity
        g = .05 + .07 * min(1, t0 / 22); f = [D3, D3, F3, D3, A3 / 2 * 2 if n % 8 > 5 else D3][n % 5]
        put(MUS, t0, pulse(f / 2, .2, g * 1.4)); t0 += BEAT / 2; n += 1
    put(MUS, 9.6, string(A2, 2.0, .06)); put(MUS, 11.0, riser(1.4, .2, 150, 1200)); put(MUS, 12.45, brass([D3, F3, A3], 1.4, .09)); put(MUS, 12.45, tom(42, .7))
    put(MUS, 14.0, pad([D3, F3, A3], 8.5, .045, 700, 1.0, .4))
    for k in range(14):   # heartbeat under the countdown
        tt = 14.2 + k * .62
        if tt < 22.4: put(MUS, tt, thump(.18 + k * .012)); put(MUS, tt + .17, thump(.12 + k * .008))
    put(MUS, 19.2, riser(3.2, .28, 120, 2400))
    # silence 22.5 – 23.35, then battle
    bars = [[D3, F3, A3], [Bb2, D3, F3], [C3, NOTE(52), NOTE(55)], [A2, NOTE(49), NOTE(52)]]
    tt = T_OPEN = 23.4; b = 0
    while tt < 49.9:
        sec = 1 if 34 <= tt < 40 else 0
        for i, (dt, f, g) in enumerate([(0, 46, .55), (BEAT * 1.5, 52, .35), (BEAT * 2, 46, .45), (BEAT * 3, 58, .3), (BEAT * 3.5, 52, .3)]):
            put(MUS, tt + dt, tom(f, g * (.7 if sec else 1)))
        put(MUS, tt + BEAT, snare(.12)); put(MUS, tt + BEAT * 3, snare(.14))
        if b % 2 == 0: put(MUS, tt, brass(bars[(b // 2) % 4], BEAT * 1.6, .07 if not sec else .05))
        for i in range(8): put(MUS, tt + i * BEAT / 2, pulse(bars[(b // 2) % 4][0] / 2, .16, .07))
        tt += BEAT * 4; b += 1
    # lament after the guns stop
    for i, (f, d) in enumerate([(D3, .9), (C3, .6), (Bb2, .7), (A2, 1.3)]): put(MUS, 51.2 + sum(x[1] for x in [(D3, .9), (C3, .6), (Bb2, .7), (A2, 1.3)][:i]), string(f * 2, d + .3, .08))
    put(MUS, 51.0, drone(D2, 3.4, .05, 200))
    put(MUS, 54.3, riser(1.45, .25, 200, 3000)); put(MUS, 55.75, tom(40, .9)); put(MUS, 55.75, brass([D3, NOTE(54), A3, NOTE(62)], 4.2, .1))
    put(MUS, 55.75, pad([D2, A2, D3, NOTE(54)], 4.25, .06, 1200, .05, 1.6))

# ------------------------------------------------------------------- sfx
def sfx():
    put(AMB, 0, waves(60, .09)); put(AMB, 0, wind(60, .05), pan=.2)
    put(AMB, 26, crackle(34, 26, .05) * np.linspace(.2, 1, int(34 * SR)))
    # ticking clock under the confrontation, louder in the countdown
    for s in range(60):
        tt = s * 1.0 + .5
        if tt < 14: put(SFX, tt, ticktock(.05, s % 2 == 0))
        elif tt < 22.4: put(SFX, tt, ticktock(.14 if not 14 <= tt < 15.6 else .24, s % 2 == 0))
    put(SFX, 22.0, bell(.75)); put(SFX, 22.25, popfx(0))
    # speech bubbles
    for b in (1.85, 3.8, 6.15, 8.1, 9.75, 15.75, 27.3): put(SFX, b, popfx(.1))
    # ball motion
    put(SFX, .25, boing(.05)); put(SFX, 23.78, boing(.09)); put(SFX, 27.05, boing(.12, .5)); put(SFX, 15.65, whoosh(1.2, .06)); put(SFX, 51.0, boing(.05, .6))
    # cut whooshes + map reveal
    for c in (11.0, 34.0, 40.0): put(SFX, c - .2, whoosh(.6, .1))
    put(SFX, 11.0, whoosh(1.5, .16)); put(SFX, 12.4, whoosh(1.6, .12))
    put(SFX, 10.8, engine(3.6, .14)); put(SFX, 17.2, engine(1.6, .06))
    # guns readied (Thrush close-up)
    put(SFX, 16.6, ratchet(1.5, 12, .06)); put(SFX, 17.9, clunk(.25)); put(SFX, 18.3, clack(.2)); put(SFX, 18.9, ratchet(.8, 9, .04))
    # battle cues from the render timeline
    for e in CUES:
        if e['t'] > 50.5: continue
        g = .75 if e['map'] else 1.0; dist = max(1.5, e['dist'])
        if e['kind'] == 'fire': put(SFX, e['t'], cannon(dist, e['ship'] == 'stgeorge') * g, pan=float(np.clip(-.3 + rng.uniform(-.2, .2), -1, 1)))
        elif e['kind'] == 'zzfire': put(SFX, e['t'], cannon(dist, powder=True) * g, pan=.1)
        elif e['kind'] == 'impact':
            if dist < 14 and not e['map']: put(SFX, e['t'] - .55, whistle(.55, .05))
            put(SFX, e['t'], boom(dist, e['target'][0] < -10) * g, pan=float(np.clip(rng.uniform(-.3, .3), -1, 1)))
        else: put(SFX, e['t'], splash(dist) * g)
    # set pieces
    put(SFX, 26.3, A(creak(1.0, .18), rumble(1.6, .25))); put(SFX, 27.35, A(boom(4), crumble(1.8, .5)) * .7)
    put(SFX, 32.8, A(creak(2.4, .14), bubbles(3.2, .07), hp(noise(3.0), 2000) * gate(3.0, .3, 1.5) * .05))
    put(SFX, 48.25, A(clack(.5), hp(noise(.3), 2500) * env(.3, .0005, .05) * .4)); put(SFX, 48.3, creak(.9, .1)); put(SFX, 49.3, clunk(.35))
    # silence after the last gun: ringing, then quiet fire
    put(SFX, 50.1, np.sin(2 * np.pi * 3600 * T(1.6)) * gate(1.6, .2, 1.2) * .012)
    # final reveal
    put(SFX, 54.3, ratchet(1.45, 30, .05)); put(SFX, 55.75, bell(.55, 147)); put(SFX, 56.9, whoosh(.5, .08)); put(SFX, 57.1, popfx(.08))

music(); sfx()
def norm_lufs(x, target):
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'a.wav'; write(p, x)
        out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        I = float([l for l in out.splitlines() if l.strip().startswith('I:')][-1].split()[1])
    return x * 10 ** ((target - I) / 20)
def write(p, x):
    y = np.clip(x, -1, 1); w = wave.open(str(p), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
def limit(x, ceiling):
    e = maximum_filter1d(np.abs(x).max(axis=1), int(SR * .006)); g = np.minimum(1, ceiling / np.maximum(e, 1e-9))
    g = -maximum_filter1d(-g, int(SR * .012)); g = uniform_filter1d(g, int(SR * .01)); return x * g[:, None]
fade = np.minimum(1, t / .3) * (1 - np.clip((t - 59.2) / .8, 0, 1))
# music sits under the effects; dip it during the silence after the war
duck = 1 - .85 * (sm(49.9, 50.2, t) * (1 - sm(51.0, 51.3, t)))
mg = 2.6 * (1 - sm(22.3, 22.6, t)) + 1.0 * sm(22.3, 22.6, t) * (1 - sm(50.8, 51.2, t)) + 2.2 * sm(50.8, 51.2, t)
MUSm = MUS * (duck * fade * mg)[:, None] * .8; SFXm = (SFX + AMB * (1.8 - .8 * sm(22, 24, t))[:, None]) * fade[:, None]
bed = MUSm + SFXm
for _ in range(6): bed = limit(norm_lufs(bed, -16.0), .85)
if '--stems' in sys.argv:
    d = Path(sys.argv[sys.argv.index('--stems') + 1]); d.mkdir(parents=True, exist_ok=True); write(d / 'sfx.wav', SFXm); write(d / 'music.wav', MUSm)
OUT.mkdir(parents=True, exist_ok=True); tmp = OUT / 'bed.wav'; write(tmp, bed)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'flac', str(OUT / 'bed.flac')], check=True); tmp.unlink()
print('bed written', OUT / 'bed.flac', 'peak', float(np.max(np.abs(bed))))
