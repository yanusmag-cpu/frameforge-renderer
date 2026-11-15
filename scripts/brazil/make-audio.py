#!/usr/bin/env python3
"""Brazil heist (Fortaleza, 2005) — original score + synchronized SFX bed (pure synthesis, no samples, no narration).
Cue times are the film's shot timeline (src/brazil/shots.ts), itself keyed to the measured narration.
Writes public/brazil/bed.flac. --stems DIR also writes music.wav / sfx.wav for the private narration mix."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/brazil'
SR, DUR = 48000, 58.0; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(2005)
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

# ================================================================ MUSIC: quiet cinematic suspense (D minor), builds with the story
bpm = 100; beat = 60 / bpm
def music():
    # hook: confident pulse + bass + stab on the money reveal
    put(MUS, 0.0, drone(D2, 6.6, .07, 260)); put(MUS, 1.0, pad([D3, F3, A3], 5.4, .045, 1400, .4, 1.2))
    for i in range(int(6.2 / (beat / 2))): put(MUS, i * beat / 2, pulse(D2 if (i // 4) % 2 == 0 else F2, .16, .09 if i % 2 == 0 else .05))
    put(MUS, 1.02, hit2(.32)); put(MUS, 1.05, sparkle(.09))
    # 2005 street: light bossa-tinged groove (shaker + muted guitar-ish plucks), still restrained
    for i in range(int((15.0 - 6.85) / (beat / 4))):
        tt = 6.85 + i * beat / 4; put(MUS, tt, shaker(.035 if i % 2 else .05), pan=.3)
    for bar in range(5):
        b0 = 6.9 + bar * beat * 4
        for k, (n_, off) in enumerate([(D3, 0), (A3, 1.5), (F3, 2), (A3, 3), (E3, 3.5)]): put(MUS, b0 + off * beat, piano(n_ * 2, .6, .05), pan=-.2)
        put(MUS, b0, pulse(D2 if bar % 2 == 0 else Bb3 / 4, .25, .07))
    put(MUS, 6.85, pad([D3, F3, A3, C4], 8.2, .03, 1100, 1.0, 1.5))
    # underground: dark drone, ticking pulse, tension
    put(MUS, 15.0, drone(D2, 10.5, .09, 220)); put(MUS, 15.2, riser(1.2, .12, 120, 700))
    for i in range(int((22.6 - 17.4) / (beat / 2))): put(MUS, 17.4 + i * beat / 2, pulse(D2, .12, .05))
    put(MUS, 19.45, riser(2.2, .14, 200, 1600)); put(MUS, 20.3, hit2(.28))
    # months: suspended pad + clock pulses
    put(MUS, 22.7, pad([D3, G3, A3], 2.8, .04, 1200, .3, .6))
    # problem: low strings, uneasy
    put(MUS, 25.3, drone(D2 * .94, 9.0, .1, 240)); put(MUS, 27.85, pad([D3, F3, Bb3 / 2 * 2, E4], 4.3, .04, 900, .2, 1.5)); put(MUS, 26.86, hit(.25))
    put(MUS, 29.2, pad([D3, F3, A3, Bb3], 5.0, .045, 900, .5, 1.0)); put(MUS, 32.35, hit2(.3))
    for i in range(int((35.15 - 33.0) / (beat / 4))): put(MUS, 33.0 + i * beat / 4, pulse(D3, .08, .02 + .05 * i / 40))
    put(MUS, 34.1, riser(1.05, .18, 150, 2200)); put(MUS, 35.15, hit2(.45))
    # discovery: wonder (major lift) then heist drive
    put(MUS, 36.0, pad([D3, F3, A3], 1.6, .04, 1000, .3, .8)); put(MUS, 37.6, pad([Bb3 / 2 * 2, D4, F4, A4], 2.2, .05, 2200, .2, .8)); put(MUS, 37.62, sparkle(.12))
    put(MUS, 39.45, drone(D2, 5.2, .08, 300))
    for i in range(int((44.5 - 39.45) / (beat / 2))):
        tt = 39.45 + i * beat / 2; put(MUS, tt, pulse([D2, D2, F2, C3 / 2][i // 4 % 4], .14, .08 if i % 2 == 0 else .05)); put(MUS, tt + beat / 4, shaker(.03))
    put(MUS, 42.15, hit2(.42))
    # silence beats: alarms / guards — sparse
    put(MUS, 44.5, pad([D3, A3], 1.5, .03, 700, .1, .4))
    # Monday: tense pad build into the reveal
    put(MUS, 45.95, pad([D3, F3, A3], 1.7, .035, 1200, .3, .4)); put(MUS, 47.6, riser(1.75, .15, 180, 1500)); put(MUS, 49.4, hit2(.48)); put(MUS, 49.45, bell(NOTE(62), .1, 3))
    # payoff: grand, warm, then playful end sting
    put(MUS, 50.55, pad([D3, A3, D4, F4], 4.3, .055, 2000, .4, 1.0)); put(MUS, 50.55, drone(D2, 4.3, .08, 300))
    for k, n_ in enumerate([D4, F4, A4, D5]): put(MUS, 50.6 + k * .45, piano(n_, 1.8, .06))
    put(MUS, 52.6, pad([Bb3 / 2 * 2, D4, F4], 2.3, .04, 1600, .3, .6))
    for i in range(int((57.4 - 54.75) / (beat / 2))): put(MUS, 54.75 + i * beat / 2, pulse(D2 if i % 4 < 2 else A2, .14, .06))
    put(MUS, 54.75, pad([D3, F3, A3], 2.8, .035, 1400, .3, .8)); put(MUS, 57.0, piano(D4, 1.0, .07)); put(MUS, 57.0, piano(A4, 1.0, .05))

# ================================================================ SFX locked to the picture
def sfx():
    # 1–3 presenter
    put(SFX, 0.0, room(1.0, .04)); put(SFX, 1.0, whoosh(.9, .22)); put(SFX, 1.02, clunk(.35)); put(SFX, 1.25, creak(.6, .08), pan=-.5); put(SFX, 1.25, creak(.6, .08), pan=.5)
    for i in range(14): put(SFX, 1.05 + i * .085, cashf(.06), pan=rng.uniform(-.4, .4))
    put(SFX, 2.7, pop_(.12)); put(SFX, 4.1, whoosh(.3, .12)); put(SFX, 5.15, pop_(.14)); put(SFX, 5.62, whoosh(.25, .12)); put(SFX, 5.66, buzz(.25, .08)); put(SFX, 6.22, whoosh(.4, .28))
    # 4 rewind to 2005
    put(SFX, 6.4, rewind(.22, .6)); put(SFX, 6.85, stamp(.32)); put(AMB, 6.6, traffic(8.5, .09)); 
    for k in range(9): put(AMB, 6.8 + k * .9 + rng.uniform(0, .3), bird(.035), pan=rng.uniform(-.8, .8))
    put(SFX, 6.9, carpass(1.6, .2), pan=-.3)
    # crew footsteps (walkFront: one step per .62 m at 1.15 m/s)
    for k in range(int((9.5 - 8.05) / (.62 / 1.15))):
        for j in range(5): put(SFX, 8.05 + k * .62 / 1.15 + j * .07, step(.06), pan=rng.uniform(-.3, .3))
    put(SFX, 10.45, A(click(.2), click(.15)), pan=-.1); put(SFX, 10.62, thump(.12)); put(SFX, 11.05, whoosh(.9, .16)); put(SFX, 11.3, pop_(.12)); put(SFX, 11.55, pop_(.12))
    put(SFX, 12.1, whoosh(.25, .12)); put(SFX, 12.3, stamp(.3))
    put(AMB, 13.05, room(1.95, .05)); put(SFX, 13.25, cashf(.12)); put(SFX, 13.3, dirt(.08)); put(SFX, 14.1, pop_(.08))
    # 9 underground reveal
    put(SFX, 15.15, rumble(1.4, .35)); put(SFX, 15.2, whoosh(1.2, .25)); put(AMB, 15.6, room(7.0, .05) + hum(7.0, 50, .02))
    for k in range(6): put(SFX, 15.7 + k * .3, step(.05, False))  # ladder
    for h in swing_hits(16.2, 17.4, .9): put(SFX, h, pick(.12))
    # 10 digging
    for h in swing_hits(17.4, 19.4, .95): put(SFX, h, pick(.4)); put(SFX, h + .03, dirt(.2))
    for h in swing_hits(17.4, 19.4, 1.3, .4): put(SFX, h, dirt(.18), pan=-.3)
    put(SFX, 17.9, bp(noise(.5), 2000, 7000) * gate(.5, .05, .2) * .05, pan=-.2)  # "shh"
    # 11 bulbs switching on along 78 m
    for x in range(0, 19):
        bx = 4.4 + x * 4.0; k = (bx - 2) / 76.2; tt = 19.5 + (np.arccos(1 - 2 * k) / np.pi) * 1.05
        put(SFX, tt, click(.12), pan=-.6 + 1.2 * k)
    put(SFX, 20.3, stamp(.35))
    # 12 months time-lapse
    for k in range(4): put(SFX, 22.7 + k * .66, whoosh(.5, .1)); put(SFX, 22.7 + k * .66 + .55, flap(.15))
    for k in range(int(2.6 / .125)): put(SFX, 22.7 + k * .125, tick(.06))
    put(SFX, 23.4, carpass(1.4, .3), pan=-.2); put(SFX, 23.6, siren(.6, .05, 600, 900, .3))
    # 13–14 reached / clang / problem
    put(AMB, 25.35, room(3.9, .06))
    for h in swing_hits(25.35, 26.3, .85): put(SFX, h, pick(.4)); put(SFX, h + .03, dirt(.18))
    put(SFX, 26.86, metal(.55)); put(SFX, 26.86, A(*[np.pad(click(.2), (int(rng.uniform(0, .4) * SR), 0)) for _ in range(12)]))
    put(SFX, 27.85, sub(.35, 36, 2.0)); put(SFX, 28.2, hit(.18))
    # 15–16 the slab
    put(AMB, 29.2, hum(5.0, 50, .03)); put(SFX, 29.4, pop_(.1))
    for k in range(9): put(SFX, 30.35 + k * .1, tick(.12))
    put(SFX, 31.2, thump(.25)); put(SFX, 32.2, A(sine(110, 1.2) * gate(1.2, .3, .6) * .05)); put(SFX, 32.35, stamp(.45)); put(SFX, 32.4, metal(.12))
    # 17 break-through
    for k in range(10): put(SFX, 34.4 + k * .07, rubble(.3, .05))
    put(SFX, 34.3, rumble(.9, .25)); put(SFX, 35.15, crunch(1.6, .7)); put(SFX, 35.2, rubble(1.5, .35)); put(SFX, 35.15, hit(.35))
    # 18–19 emerge, lights, wonder
    put(SFX, 36.1, dirt(.12)); put(SFX, 36.6, step(.08, False)); put(SFX, 37.65, A(clunk(.25), np.pad(buzz(.25, .05), (int(.05 * SR), 0)))); put(AMB, 37.7, hum(1.8, 100, .02))
    put(SFX, 38.3, pop_(.1))
    # 20 weekend: rhythmic brick passing + fast clock
    for k in range(int((42.05 - 39.45) * 2.2)):
        tt = 39.45 + k / 2.2; put(SFX, tt + .1, cashf(.1), pan=-.2); put(SFX, tt + .35, thump(.1), pan=.2)
    for k in range(int(2.6 / .1)): put(SFX, 39.45 + k * .1, tick(.05))
    # 21 tonnes: carts and footsteps in the tunnel
    put(SFX, 42.05, rumble(2.5, .08)); put(SFX, 42.15, hit2(.4))
    put(SFX, 42.05, lp(noise(2.45), 250) * gate(2.45, .1, .3) * .35)
    for k in range(int(2.45 / .46)):
        for j in range(3): put(SFX, 42.05 + k * .46 + j * .15, step(.07), pan=-.3 + j * .3)
    # 22–23 no alarms / no guards
    put(AMB, 44.5, hum(.7, 120, .025)); put(SFX, 44.6, pop_(.06)); put(AMB, 45.2, hum(.75, 60, .03)); put(SFX, 45.2, snore(.12)); put(SFX, 45.3, pop_(.06))
    # 24 Monday morning
    put(AMB, 45.95, traffic(1.6, .07))
    for k in range(4): put(AMB, 46.0 + k * .4, bird(.04), pan=rng.uniform(-.7, .7))
    for k in range(int(1.6 / .5)):
        for j in range(3): put(SFX, 46.0 + k * .5 + j * .12, step(.07), pan=-.2 + j * .2)
    # 25–26 vault door, vanished
    put(SFX, 47.6, clunk(.4)); put(SFX, 47.75, creak(.9, .2)); put(SFX, 48.35, step(.08)); put(SFX, 48.65, step(.08))
    put(SFX, 49.35, whoosh(.2, .08)); put(SFX, 49.67, splash(.25)); put(SFX, 49.67, click(.25))
    for k in range(10): put(SFX, 49.4 + k * .07, tick(.07))
    # 27 history: sirens + tape
    put(AMB, 50.55, siren(2.0, .07, 600, 900, 1.1)); put(AMB, 50.55, traffic(2.0, .05)); put(SFX, 50.7, stamp(.25))
    for k, tt in enumerate((51.2, 51.4, 51.6)): put(SFX, tt, pop_(.1))
    # 28–29 feet / host end
    put(AMB, 52.6, traffic(5.4, .06))
    for k in range(int(5.4 / .45)): put(SFX, 52.6 + k * .45, step(.05), pan=rng.uniform(-.6, .6))
    put(SFX, 52.6, lp(noise(5.0), 240) * gate(5.0, .3, .5) * .25)
    put(SFX, 53.0, pop_(.12)); put(SFX, 53.35, pop_(.12))
    for k in range(int(1.1 / .4)): put(SFX, 54.8 + k * .4, step(.1))
    put(SFX, 56.85, thump(.32)); put(SFX, 57.15, thump(.28)); put(SFX, 56.9, rubble(.8, .06))

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
fade = np.minimum(1, t / .03) * (1 - np.clip((t - 57.4) / .6, 0, 1))
MUSm = MUS * fade[:, None]; SFXm = (SFX + AMB) * fade[:, None]
bed = norm_lufs(MUSm * .55 + SFXm, -20.0)
pk = np.max(np.abs(bed));
if pk > .89: bed *= .89 / pk
if '--stems' in sys.argv:
    d = Path(sys.argv[sys.argv.index('--stems') + 1]); d.mkdir(parents=True, exist_ok=True); write(d / 'music.wav', MUSm); write(d / 'sfx.wav', SFXm)
OUT.mkdir(parents=True, exist_ok=True); tmp = OUT / 'bed.wav'; write(tmp, bed)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'flac', str(OUT / 'bed.flac')], check=True); tmp.unlink()
print('bed written', OUT / 'bed.flac', 'peak', float(np.max(np.abs(bed))))
