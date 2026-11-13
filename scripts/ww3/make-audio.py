#!/usr/bin/env python3
"""WW3 long-form score + SFX bed (original synthesis, no samples). Event times come from src/ww3/vo.ts
(measured narration sentence starts), so every cue locks to the same timeline as the picture.
Writes public/ww3/bed.flac (music+SFX, no narration). --stems DIR also writes music.wav / sfx.wav."""
import json, os, re, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d

ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/ww3'
VO = (ROOT / 'src/ww3/vo.ts').read_text()
S = [float(x) for x in re.search(r'export const S = \[([^\]]+)\]', VO).group(1).split(',')]
SR, DUR = 48000, 398.0; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(1983)
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
    i = int(at * SR)
    if i >= N or len(sig) == 0: return
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), N - i); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[i:i + n, 0] += sig[:n] * gain * l * 1.41; bus[i:i + n, 1] += sig[:n] * gain * r * 1.41
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
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

E = lambda i, o=0.0: S[i] + o
# ================================================================ AMBIENCE beds (per scene; continuous between cuts)
def amb(a, b, sig_fn, g=1.0, pan=0.0): put(AMB, a, sig_fn(b - a), g, pan)
amb(0, E(1), lambda d: room(d, .05)); amb(0, E(1), lambda d: wind(d, .03))
amb(E(6) - .1, E(7), lambda d: hum(d, 60, .06) + room(d, .04))
amb(E(7) - .1, E(8), lambda d: siren(d, .22, per=5) + siren(d, .14, 380, 760, 6.3)); amb(E(7), E(8), lambda d: wind(d, .05))
amb(E(23) - .1, E(28), lambda d: crowd(d, .06) + room(d, .03))
amb(E(28), E(29), lambda d: wind(d, .05))
amb(E(34) - .1, E(35), lambda d: hum(d, 60, .06) + klaxon(d, .05))
amb(E(38) - .1, E(40), lambda d: hum(d, 60, .05))
amb(E(47) - .1, E(48), lambda d: wind(d, .05) + room(d, .03))
amb(E(52), E(58), lambda d: wind(d, .06))
amb(E(53), E(54), lambda d: crowd(d, .14)); amb(E(54), E(55), lambda d: lp(noise(d), 300) * .05)
amb(E(55), E(56), lambda d: siren(d, .2, 600, 1100, 1.2) + siren(d, .12, 700, 1300, .9))
amb(E(56), E(57), lambda d: hum(d, 60, .05))
amb(E(58) - .1, E(62), lambda d: room(d, .04) + fire(d, .025))
amb(E(68) - .1, E(70), lambda d: crowd(d, .16))
amb(E(76) - .1, E(77), lambda d: wind(d, .08))
amb(E(79), E(82), lambda d: geiger(d, 3, .12))
amb(E(89) - .1, E(90), lambda d: crowd(d, .12) + hum(d, 50, .04))
amb(E(90), E(91), lambda d: static(d, .12))
amb(E(91), E(92), lambda d: hum(d, 50, .08) + crowd(d, .06))
amb(E(92), E(93), lambda d: wind(d, .12) + geiger(d, 2, .08))
amb(E(93) - .1, E(96), lambda d: fire(d, .14) + wind(d, .06))
amb(E(101) - .1, E(102), lambda d: wind(d, .14))
amb(E(108), E(116), lambda d: wind(d, .07)); amb(E(109), E(111), lambda d: crowd(d, .1))
amb(E(114), E(115), lambda d: static(d, .09))
amb(E(125) - .1, E(126), lambda d: hum(d, 60, .06) + lp(noise(d), 1200) * .02)
amb(E(127) - .1, E(131), lambda d: hum(d, 50, .07))
amb(E(139) - .1, E(140), lambda d: room(d, .05))
amb(E(140) - .1, 395.15, lambda d: hum(d, 60, .05) + room(d, .03))

# ================================================================ SFX (locked to picture events)
put(SFX, E(1) - .1, buzz(.6, .25), 1, .1); put(SFX, E(1) + .05, alert(4.4, .3), 1, .1)
for k in range(5): put(SFX, E(1) + .2 + k * .9, buzz(.35, .15), 1, .1)
put(SFX, E(4) + .42 + .3, hit(.25), 1, 0); put(SFX, E(4) + .42 + .3, whoosh(.5, .2), 1, 0)
put(SFX, 7.42, whoosh(.4, .15), 1, 0); put(SFX, 7.42 + .15, piano(NOTE(76), 1.2, .15) + piano(NOTE(81), 1.2, .12), 1, 0)  # news sting
for k in range(6): put(SFX, E(5) - .1 + k * (2 * np.pi / 1.6) / 4, beep(1700, .08, .1), 1, -.3)
for k, o in enumerate((.5, .75, .95, 1.1, 1.25)): put(SFX, E(5) + o, beep(1300 + 120 * k, .1, .18), 1, -.2 + k * .1)
put(SFX, E(6), klaxon(4.8, .1), 1, 0)
put(SFX, E(8), riser(1.1, .25), 1, 0)
put(SFX, E(9) + .35, beep(900, .08, .15), 1, 0); put(SFX, E(9) + .9, static(.5, .15), 1, 0)
put(SFX, E(9) + 1.15, hit(.9), 1, 0); put(SFX, E(10) - .05, rewind(.3, .9), 1, 0)
# ch2
put(SFX, E(13) + 1.4, riser(1.4, .1, 400, 900), 1, 0)
for i in range(9): put(SFX, E(13) + .5 + i * .14, beep(900 + i * 40, .06, .08), 1, -.6 + i * .15)
for i in range(20): put(SFX, E(14) + .9 + i * .03, tick(.15), 1, -.5 + i * .05)
put(SFX, E(15) + 4.0, stamp(.8), 1, 0)
put(SFX, E(17), clunk(.25), 1, 0); put(SFX, E(18) + .1, thump(.4), 1, -.3); put(SFX, E(18) + .35, thump(.35), 1, 0); put(SFX, E(18) + .6, thump(.35), 1, .3)
put(SFX, E(19) + .55, thump(.3), 1, .3); put(SFX, E(19) + .3, thump(.3), 1, -.3); put(SFX, E(19) + .5, crowd(1.2, .08), 1, 0)
put(SFX, E(20), lp(noise(2.0), 400) * gate(2.0, .3, .5) * .25, 1, 0); put(SFX, E(20) + .4, pad([NOTE(45)], 1.6, .1, 300), 1, 0)
put(SFX, E(21), roar(2.4, .3), 1, -.4)
put(SFX, E(22) + .55, whoosh(.3, .15), 1, 0); put(SFX, E(22) + 1.55, whoosh(.3, .18), 1, 0); put(SFX, E(22), crowd(2.2, .14), 1, 0)
put(SFX, E(27) - .1, whoosh(.3, .08), 1, 0)
# ch3
for i, o in enumerate((1.6,)): put(SFX, E(30) + o, beep(2000, .12, .2), 1, .3)
for o in (.3,): put(SFX, E(31) + o, beep(1500, .1, .2), 1, 0)
for o in (.2, .35, .5): put(SFX, E(32) + o, beep(1500, .1, .2), 1, .2)
put(SFX, E(33) + 1.5, hit(.5), 1, 0); put(SFX, E(33) + 1.5, klaxon(2.2, .12), 1, 0)
for k in range(3): put(SFX, E(35) - .1 + k * (E(36) - E(35)), whoosh(.35, .12), 1, -.3 + k * .3)
for k in range(int((E(40) - E(38)) * 2)): put(SFX, E(38) + k * .5, tick(.1), 1, .3)
for k in range(5): put(SFX, E(39) + k * .45, beep(480, .25, .12) + beep(620, .25, .08), 1, -.2)
put(SFX, E(40) - .3, thump(.6), 1, 0)
for k in range(5): put(SFX, E(41) + k * .12, beep(1100, .08, .05), 1, .4)
put(SFX, E(41), beep(900, .9, .1) * (np.sin(np.arange(int(.9 * SR)) / SR * 2 * np.pi * 12) > 0), 1, .5)
for k in range(int((E(44) - E(42)) * 2)): put(SFX, E(42) + k * .5, tick(.18), 1, 0)
put(SFX, E(44) + 1.05 + .55, clunk(.6), 1, 0); put(SFX, E(44) + 1.05 + .9, beep(800, .5, .15), 1, .2)
put(SFX, E(45) - .1 + .4, clunk(.5), 1, 0); put(SFX, E(45) + .8, roar(3.2, .55), 1, 0); put(SFX, E(45) + .8, sub(.5, 35, 2.5), 1, 0)
put(SFX, E(45) + 2.55 + .3, klaxon(2.4, .16), 1, 0); put(SFX, E(45) + 2.55 + .3, hit(.4), 1, 0)
# ch4 — flash is SILENT; the sound arrives later with the pressure wave
FL = E(48) + .05; WV = E(50) + 1.0
put(SFX, E(46) - .1, hit(.3), 1, 0)
put(SFX, FL, beep(7800, 3.2, .015) * np.linspace(1, 0, int(3.2 * SR)), 1, 0)  # faint tinnitus
put(SFX, WV - .05, rumble(5.5, .8), 1, 0); put(SFX, WV, hit(.9), 1, 0); put(SFX, WV + .25, glass(.45), 1, -.4); put(SFX, WV + .1, whoosh(2.5, .45), 1, .2)
for i in range(18): put(SFX, E(51) + (.2 if i % 3 == 0 else 1.1 if i % 3 == 1 else 2.2) + rng.random() * .5, lp(noise(.6), 200) * env(.6, .01, .2) * .35, 1, -.6 + rng.random() * 1.2)
for k in range(8): put(SFX, E(52) + 1.6 + k * .2, clunk(.35), 1, -.7 + k * .2)
for i in range(8): put(SFX, E(53) + .3 + i * .12, sum(flap(.18) for _ in range(1)), 1, -.4)
for i in range(8):
    for k in range(6): put(SFX, E(53) + .3 + i * .12 + k * .03, flap(.12), 1, -.4 + i * .1)
for k in range(6): put(SFX, E(54) + .4 + k * .6, beep(420 + k * 30, .35, .08), 1, -.6 + k * .2)
for k in range(int((E(57) - E(56)) / .6)): put(SFX, E(56) + k * .6, beep(800, .3, .07) + beep(1000, .3, .05), 1, (k % 3 - 1) * .5)
for k in range(int((E(58) - E(57)) * 2)): put(SFX, E(57) + k * .5, tick(.2), 1, 0)
# ch5
put(SFX, E(61) + .05, chime(.2), 1, .5); put(SFX, E(61) + .25, beep(1760, .08, .12), 1, .5)
put(SFX, E(62) + 1.9, stamp(.7), 1, 0); put(SFX, E(62) + .8, whoosh(.8, .15), 1, 0)
put(SFX, E(63) + .2, beep(400, .35, .15), 1, 0)
put(SFX, E(64) + .8, beep(1500, .06, .12), 1, 0); put(SFX, E(64) + 1.0, beep(350, .5, .16), 1, 0)
put(SFX, E(65), static(3.2, .06), 1, 0)
TILES = [E(66, .5), E(66, 1.2), E(67, .6), E(67, 1.8), E(70, .2), E(70, .8), E(71, .7), E(71, 1.4), E(71, 2.5)] + [E(72, 1.2 + i * .24) for i in range(10)]
for i, at in enumerate(TILES): put(SFX, at + .4, clack(.45), 1, -.6 + (i % 7) * .2)
put(SFX, E(69) + .2, thump(.3), 1, 0)
# ch6
put(SFX, E(77), rumble(3, .35), 1, 0); put(SFX, E(78), wind(4.5, .1), 1, .3)
for k, at in enumerate((E(83), E(84), E(85))): put(SFX, at, A(thump(.4), beep(660, .12, .1)), 1, -.4 + k * .4)
put(SFX, E(82), beep(853, 1.0, .06) + beep(960, 1.0, .06), 1, 0)
for at in (E(86, .3), E(87, 1.8), E(87, 3.4), E(87, 4.8)): put(SFX, at, whoosh(.3, .12), 1, 0)
put(SFX, E(91) + .2, beep(1000, .15, .08), 1, .4)
# ch7
put(SFX, E(95), roar(3, .25), 1, 0)
put(SFX, E(103), heartbeat(.45), 1, 0); put(SFX, E(103) + 1.2, heartbeat(.4), 1, 0); put(SFX, E(103) + 2.4, heartbeat(.35), 1, 0)
put(SFX, E(106), stamp(.5), 1, 0)
put(SFX, E(107) + 1.8, glass(.25), 1, 0)
# ch8
put(SFX, E(112) + 1.2, clunk(.4), 1, 0); put(SFX, E(112) + 1.3, hum(3, 60, .1), 1, 0)
put(SFX, E(114) + 2.8, beep(1200, .6, .1) * np.sin(np.arange(int(.6 * SR)) / SR * 2 * np.pi * 6), 1, .3)
put(SFX, E(117) + .4, lp(noise(1.2), 2000) * gate(1.2, .1, .3) * .08, 1, 0)
# ch9
put(SFX, E(122) - .1, rewind(.35, 1.0), 1, 0)
put(SFX, E(124) + .3, thump(.4), 1, 0)
put(SFX, E(125), lp(noise(6.5), 1500) * .03, 1, 0)
put(SFX, E(125) + 2.7, klaxon(1.6, .12), 1, 0)
put(SFX, E(126) + 2.6, glass(.15), 1, 0); put(SFX, E(126) + 2.4, clack(.4), 1, 0)
put(SFX, E(127) + 3.6, klaxon(3.2, .15), 1, 0)
for o in (.05, .2, .35, .5): put(SFX, E(128) + o, beep(1500, .1, .16), 1, 0)
put(SFX, E(130) + 3.4, clunk(.25), 1, 0); put(SFX, E(130) + 4.0, stamp(.5), 1, 0)
put(SFX, E(131), hit(.4), 1, 0); put(SFX, E(132) + 3.2, beep(500, .3, .1), 1, 0)
put(SFX, E(135) + .3, roar(2.2, .15), 1, 0); put(SFX, E(135) + 3.6, clunk(.4), 1, 0)
put(SFX, E(136), alert(1.6, .12), 1, 0)
for i in range(5): put(SFX, E(137) + .2 + i * .2, thump(.2), 1, -.6 + i * .3)
for k in range(int((E(139) - E(138)) * 1)): put(SFX, E(138) + k * 1.0, tick(.35), 1, 0)
put(SFX, E(140) + 1, beep(1700, .08, .1), 1, -.3)
put(SFX, 395.15 + .3, buzz(.35, .3), 1, 0); put(SFX, 395.15 + .3, alert(.85, .35), 1, 0)  # the final alert, cut dead at the black

# ================================================================ SCORE
B = 60 / 96  # tension tempo
put(MUS, 0, piano(D4, 1.6, .12) + piano(A4, 1.6, .08), 1, -.2)
put(MUS, E(1), hit(.5), 1, 0); put(MUS, E(1), drone(D2, E(9) + 1.15 - E(1), .14), 1, 0)
for k in range(int((E(9) + 1.15 - E(5)) / (B / 2))): put(MUS, E(5) + k * B / 2, pulse(D2 * 2 if k % 4 else D2, .2, .22), 1, 0)
put(MUS, E(7), pad([D3, F3, A3], E(9) + 1.15 - E(7), .07, 700, .6, .4), 1, 0)
put(MUS, E(9) + 1.15, drone(D2, 1.9, .1, 200), 1, 0)
# ch2 suspense ostinato (D minor), drops out on "Until one night"
oz = [D4, F4, A4, F4, E4, F4, A4, C5]
for k in range(int((E(28) - E(11)) / (B / 2))): put(MUS, E(11) + k * B / 2, piano(oz[k % 8] / 2, .9, .07), 1, .2 * np.sin(k))
for i, ch in enumerate(([D3, F3, A3], [Bb3 / 2, D3, F3], [C3, E3, G3], [A2, E3, A3])):
    seg = (E(28) - E(11)) / 4; put(MUS, E(11) + i * seg, pad(ch, seg + .5, .05, 600), 1, 0)
put(MUS, E(16), drone(D2, E(28) - E(16), .06), 1, 0)
put(MUS, E(28), piano(D3, 3.0, .15), 1, 0)
# ch3 escalating pulse + ticking; silence just before the launch; launch hit
for k in range(int((E(44) - E(29)) / (B / 2))):
    at = E(29) + k * B / 2; inten = (at - E(29)) / (E(44) - E(29))
    put(MUS, at, pulse(D2 if k % 2 == 0 else A2 / 2, .18, .14 + inten * .14), 1, 0)
put(MUS, E(29), drone(D2, E(44) - E(29), .1), 1, 0)
put(MUS, E(42), riser(E(44) - E(42), .22, 150, 1200), 1, 0)
put(MUS, E(45) + .8, hit(.9), 1, 0); put(MUS, E(45) + .8, pad([D3, A3, D4, F4], 4.5, .1, 1500, .2, 1.5), 1, 0)
# ch4 — elegy; NO music between flash and wave
put(MUS, E(46), drone(D2, FL - E(46) - .1, .1), 1, 0); put(MUS, E(47), pad([D3, F3, A3], FL - E(47) - .05, .05, 500), 1, 0)
put(MUS, WV + 1.5, pad([D3, F3, A3, D4], E(58) - WV - 1.5, .07, 700, 3, 2), 1, 0)
for k, f in enumerate([A4, G4, F4, E4, D4, E4, F4, A4, G4, F4, E4, D4]): put(MUS, E(51) + k * 1.6, piano(f / 2, 2.5, .08), 1, -.2)
# ch5 driving systems pulse (faster), CTA lighter, dominoes build
B5 = 60 / 120
put(MUS, E(58), pad([D3, F3, Bb3 / 2 * 2], E(60) - E(58), .05, 500), 1, 0)
put(MUS, E(60), piano(F4, 1.2, .1) + piano(A4, 1.2, .08) + piano(D5, 1.2, .06), 1, .3)
for k in range(int((E(76) - E(62)) / (B5 / 2))):
    at = E(62) + k * B5 / 2; put(MUS, at, pulse([D2, D2 * 2, F2, D2 * 2][k % 4], .14, .14), 1, 0); put(MUS, at + B5 / 4, tick(.05), 1, .3)
for i, ch in enumerate(([D3, F3, A3], [Bb3 / 2, D3, F3], [G3 / 2, Bb3 / 2, D3], [A2, E3, A3])):
    seg = (E(76) - E(62)) / 4; put(MUS, E(62) + i * seg, pad(ch, seg + .5, .06, 800), 1, 0)
put(MUS, E(72), riser(E(73) - E(72), .2), 1, 0); put(MUS, E(73), hit(.5), 1, 0)
# ch6 eerie
put(MUS, E(76), drone(D2 * 1.0, E(93) - E(76), .09, 250), 1, 0)
for k in range(int((E(93) - E(76)) / 2.4)): put(MUS, E(76) + k * 2.4 + .3, piano([D5, A4, Bb4, A4, F4, E4][k % 6], 3.2, .05), 1, .4 * np.sin(k))
put(MUS, E(76), pad([D3, E3 * 1.0, A3], E(93) - E(76), .04, 400, 3, 3), 1, 0)
# ch7 vast slow strings
for i, ch in enumerate(([D3, A3, D4, F4], [Bb3 / 2, F3, Bb3, D4], [F3, C4, F4, A4], [C3, G3, C4, E4], [D3, A3, D4, F4], [Bb3 / 2, F3, D4, F4])):
    seg = (E(108) - E(93)) / 6; put(MUS, E(93) + i * seg, pad(ch, seg + 1, .06, 1100, 2.5, 2), 1, 0)
put(MUS, E(93), drone(D2, E(108) - E(93), .08), 1, 0)
put(MUS, E(101), hit(.4), 1, 0)
# ch8 melancholic piano, small lift
mel = [A4, F4, D4, E4, F4, E4, D4, C4, D4, F4, A4, G4, F4, E4, D4, D4]
for k, f in enumerate(mel): put(MUS, E(108) + .5 + k * 2.3, piano(f, 3.0, .1) + piano(f / 2, 3.0, .05), 1, -.2)
put(MUS, E(108), pad([D3, F3, A3], E(115) - E(108), .045, 600, 3, 2), 1, 0)
put(MUS, E(115), pad([F3, A3, C4, F4], E(122) - E(115), .055, 900, 1.5, 2), 1, 0)
# ch9 archival hum → ostinato build → quiet ending
put(MUS, E(122), drone(D2, E(138) - E(122), .07), 1, 0)
for k in range(int((E(137) - E(125)) / (B / 2))): put(MUS, E(125) + k * B / 2, piano(oz[k % 8] / 2, .8, .05 + .05 * k / ((E(137) - E(125)) / (B / 2))), 1, .2 * np.sin(k))
put(MUS, E(131), pad([D3, F3, A3, D4], 4, .06, 900, .3, 2), 1, 0)
put(MUS, E(137), riser(E(138) - E(137), .2), 1, 0); put(MUS, E(138), hit(.6), 1, 0)
put(MUS, E(138), pad([D3, A3, D4], E(139) - E(138), .05, 500, .5, 1.5), 1, 0)
put(MUS, E(139), piano(D4, 3, .1) + piano(A4, 3, .07), 1, 0)
put(MUS, E(140), drone(D2, 395.15 - E(140), .08, 220), 1, 0)
for k, f in enumerate([D4, F4, E4, D4]): put(MUS, E(141) + k * 1.4, piano(f, 2.2, .07), 1, 0)

# ================================================================ master (bed only; narration is mixed privately)
ir_n = int(SR * 1.6); irt = np.arange(ir_n) / SR; ir = rng.standard_normal(ir_n) * np.exp(-irt * 3.5); ir[0] = 6; ir /= np.abs(ir).sum() / 8
def verb(x, wet): return np.stack([x[:, 0] + fftconvolve(x[:, 0], ir)[:N] * wet, x[:, 1] + fftconvolve(x[:, 1], np.roll(ir, 41))[:N] * wet], -1)
cut = np.where(t >= 396.15, 0.0, 1.0)[:, None]
music = verb(MUS, .4) * cut; sfx = (verb(SFX, .15) + AMB) * cut
for x in (music, sfx): x[:, 0] = hp(x[:, 0], 30); x[:, 1] = hp(x[:, 1], 30)
def limit(x, ceiling):
    up = resample_poly(np.abs(x), 4, 1, axis=0).max(axis=1)[::4][:len(x)]
    e = maximum_filter1d(up, int(SR * .008)); g = np.minimum(1, ceiling / np.maximum(e, 1e-9))
    g = np.minimum(g, uniform_filter1d(g, int(SR * .004))); g = -maximum_filter1d(-g, int(SR * .006)); g = uniform_filter1d(g, int(SR * .006)); return x * g[:, None]
def write(path, x):
    with wave.open(str(path), 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.round(np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
def measure(x):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: path = f.name
    write(path, x); out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.unlink(path); j = json.JSONDecoder().raw_decode(out[out.rfind('{'):])[0]; return float(j['input_i']), float(j['input_tp'])
if '--stems' in sys.argv:
    d = Path(sys.argv[sys.argv.index('--stems') + 1]); d.mkdir(parents=True, exist_ok=True); pk = max(np.abs(music).max(), np.abs(sfx).max()) * 1.05
    write(d / 'music.wav', music / pk); write(d / 'sfx.wav', sfx / pk); print('stems written to', d)
x = music * .85 + sfx; x /= np.abs(x).max(); ceiling = 10 ** (-3.0 / 20); gain = 1.0; TARGET = -20.0
for it in range(10):
    y = limit(x * gain, ceiling); I, TP = measure(y)
    if abs(I - TARGET) < .2: break
    gain *= 10 ** ((TARGET - I) / 20)
OUT.mkdir(parents=True, exist_ok=True); write(OUT / 'bed.wav', y)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(OUT / 'bed.wav'), '-c:a', 'flac', '-compression_level', '8', str(OUT / 'bed.flac')], check=True); (OUT / 'bed.wav').unlink()
print(json.dumps({'integratedLUFS': I, 'truePeak': TP, 'iterations': it + 1, 'seconds': DUR}))
