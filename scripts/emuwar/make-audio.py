"""The Great Emu War — original procedural score and sound design, locked to the film's event times.
Writes public/emuwar/mix.wav (48 kHz stereo, -16 LUFS, music + SFX, no narration).
With --stems DIR it also writes music.wav and sfx.wav (unmastered) so narration can be mixed elsewhere with ducking.
Event times mirror src/emuwar/story.ts (VO / EV / shot cuts)."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/emuwar'
SR, DUR = 48000, 40.0; N = int(SR * DUR); t = np.arange(N) / SR; rng = np.random.default_rng(1932)
MUS = np.zeros((N, 2)); SFX = np.zeros((N, 2))
VO = dict(lost=4.09, aim=16.53, jammed=24.66, wheat=36.65)
EV = dict(stumble1=1.05, trip=3.42, faceplant=3.72, gulp=10.45, truckStop=12.15, hop=[12.35, 12.6, 12.85], clank=13.62, thumbs=14.35, scatter=17.15, swings=[19.15, 19.55, 19.95],
          whip=20.95, blink=21.25, burst=23.62, yank=24.95, spring=25.12, bump=28.82, land=29.05, casing=30.25, stand=33.45, stalk=36.35, turn=37.55, smug=37.85, stamp=38.15, fade=39.35)
def sos(kind, f, order=2): return butter(order, f, kind, fs=SR, output='sos')
def lp(x, f): return sosfilt(sos('low', f), x)
def hp(x, f): return sosfilt(sos('high', f), x)
def bp(x, a, b): return sosfilt(sos('band', [a, b]), x)
def sm(a, b, x): u = np.clip((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u)
def win(a, b, f=.05): return sm(a - f, a, t) * (1 - sm(b, b + f, t))
def put(bus, at, sig, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N or len(sig) == 0: return
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), N - i); l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[i:i + n, 0] += sig[:n] * gain * l * 1.41; bus[i:i + n, 1] += sig[:n] * gain * r * 1.41
def T(d): return np.arange(int(d * SR)) / SR
def env(d, a=.005, r=.2): x = T(d); return np.minimum(1, x / max(a, 1e-4)) * np.exp(-x / max(r, 1e-4))
def saw(f, d, det=0.0): x = T(d); ph = np.cumsum(np.full(len(x), f * (1 + det))) / SR; return 2 * (ph % 1) - 1
def noise(d): return rng.standard_normal(int(d * SR))
# ================================================================ instruments
def tuba(f, d, g=.5): x = T(d); s = lp(saw(f, d) * .6 + np.sin(2 * np.pi * f * x) * .8, 520); return s * env(d, .015, d * .55) * g
def brass(fs, d, g=.25, cut=1800, a=.03):
    s = sum(lp(saw(f, d, 0.003 * k) + saw(f, d, -0.004 * k), cut) for k, f in enumerate(fs)); x = T(d)
    vib = 1 + .004 * np.sin(2 * np.pi * 5.5 * x); return s * np.minimum(1, x / a) * np.exp(-x / (d * 1.3)) * (1 - sm(d - .06, d, x)) * g * vib
def snare(g=.4, d=.18): n = bp(noise(d), 1500, 7000) * env(d, .001, .05); x = T(d); return (n + np.sin(2 * np.pi * 190 * x) * env(d, .001, .03) * .6) * g
def kick(g=.6): d = .35; x = T(d); f = 52 + 90 * np.exp(-x * 30); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, .002, .12) * g
def timp(f, g=.6, d=1.6): x = T(d); ff = f * (1 + .06 * np.exp(-x * 12)); return (np.sin(2 * np.pi * np.cumsum(ff) / SR) + .3 * lp(noise(d), 400) * np.exp(-x * 20)) * env(d, .003, .5) * g
def cymbal(g=.25, d=2.5): return hp(noise(d), 4500) * env(d, .002, .7) * g
def pluck(f, d=.5, g=.35, bright=.55):
    n = int(SR / f); buf = rng.uniform(-1, 1, n); out = np.empty(int(d * SR))
    for i in range(len(out)):
        j = i % n; out[i] = buf[j]; buf[j] = .996 * (bright * buf[j] + (1 - bright) * buf[(j + 1) % n])
    return out * env(d, .001, d * .5) * g
def whistle(f, d, g=.18): x = T(d); v = 1 + .012 * np.sin(2 * np.pi * 6 * x) * sm(.1, .3, x); s = np.sin(2 * np.pi * np.cumsum(np.full(len(x), f) * v) / SR) + .08 * bp(noise(d), f * .8, f * 1.5); return s * np.minimum(1, x / .04) * (1 - sm(d - .08, d, x)) * g
def glock(f, g=.25): d = 1.2; x = T(d); return (np.sin(2 * np.pi * f * x) + .4 * np.sin(2 * np.pi * f * 2.76 * x)) * env(d, .001, .35) * g
def pad(fs, d, g=.12, cut=900, a=.6): x = T(d); s = sum(lp(saw(f, d, .005) + saw(f, d, -.006), cut) for f in fs); return s * np.minimum(1, x / a) * (1 - sm(d - .5, d, x)) * g
def wahwah(f0, steps, g=.35):
    out = []
    for k in range(steps):
        last = k == steps - 1; d = 1.2 if last else .45; x = T(d); f = f0 * 2 ** (-k / 12) * (1 - .06 * x * last) * (1 + .02 * np.sin(2 * np.pi * 6 * x) * last)
        sq = np.tanh(3 * np.sin(2 * np.pi * np.cumsum(f) / SR)); w = np.sin(np.pi * np.clip(x / min(d, .45), 0, 1))
        out.append((lp(sq, 500) * (1 - w) + lp(sq, 1600) * w) * env(d, .03, d) * g)
    return np.concatenate(out)
# ================================================================ sound effects
def thud(g=.6, f=70, d=.35, n=.25): x = T(d); return (np.sin(2 * np.pi * np.cumsum(f * (1 + .8 * np.exp(-x * 25))) / SR) * env(d, .002, .09) + lp(noise(d), 900) * env(d, .001, .04) * n) * g
def scuff(g=.3, d=.25): return bp(noise(d), 300, 3000) * env(d, .01, .08) * g
def whoosh(d=.35, g=.3, up=True):
    x = T(d); n = noise(d); lo, hi = bp(n, 300, 1200), bp(n, 1800, 7000); w = x / d if up else 1 - x / d
    return (lo * (1 - w) + hi * w) * np.sin(np.pi * x / d) ** 2 * g
def boing(f0=900, d=.7, g=.3): x = T(d); f = f0 * (1 + .5 * np.sin(2 * np.pi * 14 * x) * np.exp(-x * 4)) * np.exp(-x * 1.2); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, .002, .3) * g
def clank(g=.5, d=.9): x = T(d); s = sum(np.sin(2 * np.pi * f * x) * np.exp(-x * k) for f, k in ((523, 6), (1187, 9), (2310, 14), (3420, 18))); return (s * .35 + hp(noise(d), 2000) * env(d, .001, .02)) * env(d, .001, .4) * g
def ping(g=.35, f=4200, d=1.6): x = T(d); return (np.sin(2 * np.pi * f * x) + .5 * np.sin(2 * np.pi * f * 1.52 * x) + .3 * np.sin(2 * np.pi * f * 2.31 * x)) * env(d, .0005, .45) * g
def click(g=.5): d = .06; return hp(noise(d), 2500) * env(d, .0005, .008) * g
def shot(g=.5): d = .5; x = T(d); return (lp(noise(d), 2500) * env(d, .0005, .05) + np.sin(2 * np.pi * 60 * x) * env(d, .001, .07) * 1.2 + bp(noise(d), 300, 1200) * env(d, .002, .15) * .5) * g
def emu_boom(g=.5, n=3, gap=.22, f=62):
    out = np.zeros(int((n * gap + .6) * SR))
    for k in range(n): x = T(.5); s = (np.sin(2 * np.pi * f * x) + .4 * np.sin(2 * np.pi * f * 2 * x)) * env(.5, .03, .14) * (1 - .15 * k); i = int(k * gap * SR); out[i:i + len(s)] += s
    return lp(out, 400) * g
def emu_grunt(g=.35, f=180, d=.28): x = T(d); ff = f * (1 - .35 * x / d); s = lp(np.sign(np.sin(2 * np.pi * np.cumsum(ff) / SR)) * .5 + bp(noise(d), 150, 900) * .6, 1200); return s * np.sin(np.pi * x / d) * g
def gulp(g=.4): d = .35; x = T(d); f = 520 * np.exp(-x * 5) + 90; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * x / d) ** .5 * env(d, .01, .2) * g
def scratch(g=.3): d = .35; x = T(d); f = 900 + 700 * np.sin(2 * np.pi * 9 * x); return bp(noise(d) * .4 + np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)), 300, 4000) * np.sin(np.pi * x / d) * g
def rewind(g=.25): d = .45; x = T(d); f = 2000 * (1 + 2 * x / d); return bp(np.sin(2 * np.pi * np.cumsum(f * (1 + .3 * np.sin(2 * np.pi * 37 * x))) / SR) + noise(d) * .3, 500, 7000) * np.sin(np.pi * x / d) * g
def engine(d, rpm, g=.3, rough=.4):
    x = T(d); r = np.interp(x, np.linspace(0, d, len(rpm)), rpm); fire = r / 60 * 2; ph = np.cumsum(fire) / SR
    s = sum(np.sin(2 * np.pi * ph * k) / k for k in (1, 2, 3, 4, 6)) + rough * lp(noise(d), 600) * (1 + np.sin(2 * np.pi * ph))
    return lp(s, 1400) * g
def rumble(a, b, g, f1=60, f2=500):
    d = b - a + .6; x = T(d); return bp(noise(d), f1, f2) * sm(0, .3, x) * (1 - sm(b - a, d, x)) * (.8 + .2 * np.sin(2 * np.pi * 7 * x)) * g

# ---- ambience: wind gusts all film, wheat rustle on the farm
wind = lp(noise(DUR), 700) * (.5 + .5 * lp(np.abs(noise(DUR)), 1.2) * 8).clip(0, 1.5); put(SFX, 0, wind * .05)
put(SFX, 0, hp(bp(noise(DUR), 2500, 9000), 2500) * win(4.75, 11.2, .2) * (.6 + .4 * np.sin(2 * np.pi * .4 * t)) * .05, 1, .3)
put(SFX, 4.8, np.sin(2 * np.pi * 420 * T(1.6) * (1 + .02 * np.sin(2 * np.pi * 1.3 * T(1.6)))) * env(1.6, .3, .8) * .02, .5, -.4)   # windmill creak
# ---- stampedes: low rumble beds + close footfalls
for a, b, g in ((0, 4.7, .5), (8.1, 9.7, .3), (17.1, 21.55, .55), (24.75, 25.4, .35), (25.4, 29.2, .45)): put(SFX, max(0, a - .3), rumble(max(0, a - .3), b, g))
for k in range(26):
    at = .1 + k * .17 + rng.random() * .05; put(SFX, at, thud(.25 + .35 * np.exp(-((at - .55) / .25) ** 2) + .3 * np.exp(-((at - .98) / .2) ** 2), 75 + rng.random() * 20), 1, float(np.clip((at - .7) * 1.5, -.8, .8)))
for k in range(40): at = 17.2 + k * .1 + rng.random() * .06; put(SFX, at, thud(.18, 85 + rng.random() * 30), 1, float(rng.uniform(-.8, .8)))
for k in range(9): put(SFX, .25 + k * .3, scuff(.18), 1, .4)   # soldier boots
put(SFX, EV['stumble1'], scuff(.4, .4), 1, .2); put(SFX, EV['trip'], whoosh(.3, .25), 1, 0); put(SFX, EV['faceplant'], thud(.95, 55, .6, .6), 1, 0); put(SFX, EV['faceplant'] + .02, scuff(.5, .6), 1, 0)
put(SFX, EV['faceplant'] + .05, whoosh(.36, .2), 1, -.3); put(SFX, VO['lost'], boing(380, .5, .22), 1, -.2); put(SFX, VO['lost'] + .1, emu_grunt(.3, 210), 1, -.3)
put(SFX, .3, emu_boom(.45), 1, .3); put(SFX, 2.0, emu_grunt(.25), 1, -.5)
put(SFX, 1.58, whoosh(.3, .3), 1, .5); put(SFX, 4.62, rewind(.3), 1, 0); put(SFX, 4.6, scratch(.32), 1, 0)
for k, at in enumerate([6.95, 7.2, 7.42, 7.62, 7.8]): put(SFX, at, emu_grunt(.22, 200 + 40 * k, .18), 1, -.4 + .2 * k)
put(SFX, 8.15, emu_boom(.35, 4, .2, 58), 1, 0); put(SFX, EV['gulp'], gulp(.45), 1, -.2); put(SFX, 10.5, whoosh(.25, .3, False), 1, .4)
# ---- truck arrival, brake squeal, hops, tripod clank, thumbs-up glint
put(SFX, 10.4, engine(2.0, [1700, 1600, 900, 650], .22) * env(2.0, .3, 3), 1, -.2); put(SFX, 12.3, engine(1.4, [650, 640], .12) * env(1.4, .05, .5), 1, -.2)
put(SFX, 11.85, bp(np.sin(2 * np.pi * 2300 * T(.35) * (1 + .03 * np.sin(2 * np.pi * 30 * T(.35)))), 1500, 4000) * env(.35, .02, .2) * .12, 1, -.2)
for k, at in enumerate(EV['hop']): put(SFX, at + .32, thud(.4, 90, .3, .4), 1, -.3 + .3 * k)
put(SFX, EV['clank'], clank(.4), 1, .1); put(SFX, EV['thumbs'], glock(2093, .2), 1, .3); put(SFX, EV['thumbs'] + .08, glock(3136, .12), 1, .35)
# ---- the aim: silence, a single boop chorus, the scatter
put(SFX, VO['aim'], emu_grunt(.35, 240, .2), 1, -.2); put(SFX, VO['aim'] + .04, emu_grunt(.3, 280, .2), 1, .3); put(SFX, VO['aim'] + .07, emu_grunt(.25, 320, .2), 1, 0)
put(SFX, EV['scatter'], thud(.8, 45, .7, .5), 1, 0)
for at in EV['swings'] + [EV['whip']]: put(SFX, at, whoosh(.22, .32), 1, .5 if at % .4 > .2 else -.5)
put(SFX, EV['blink'], click(.35), 1, .2); put(SFX, EV['blink'] + .07, click(.25), 1, .2)
# ---- ambush whispers, the burst, the jam
put(SFX, 21.7, bp(noise(.8), 2500, 6000) * env(.8, .1, .4) * .05, 1, -.2)
for k in range(int((VO['jammed'] - EV['burst']) / .1)):
    at = EV['burst'] + k * .1; put(SFX, at, shot(.5), 1, .1); put(SFX, at + .35, ping(.05, 5200 + rng.random() * 800, .4), 1, .5)
put(SFX, VO['jammed'], click(.9), 1, .1); put(SFX, VO['jammed'] + .06, clank(.25, .4), 1, .1); put(SFX, EV['yank'], bp(noise(.15), 800, 5000) * env(.15, .005, .05) * .4, 1, .1); put(SFX, EV['spring'], boing(1100, .9, .35), 1, .3)
put(SFX, 24.85, emu_boom(.3, 3, .18), 1, -.3)
# ---- truck chase
put(SFX, 25.3, engine(4.0, [2600, 2800, 2700, 3000], .26, .6) * env(4.0, .1, 6), 1, -.1)
for k in range(30): put(SFX, 25.4 + k * .13 + rng.random() * .05, clank(.06 + .04 * rng.random(), .25), 1, float(rng.uniform(-.4, .4)))
put(SFX, EV['bump'], thud(.7, 60, .4, .5), 1, 0); put(SFX, EV['bump'] + .02, clank(.35, .6), 1, -.2); put(SFX, EV['land'], thud(1.0, 48, .8, .7), 1, 0); put(SFX, EV['land'] + .02, clank(.5, 1.0), 1, .2)
put(SFX, 28.2, emu_grunt(.3, 170, .35), 1, .4)
# ---- aftermath: casing ping, steam, distant truck
put(SFX, EV['casing'] + .38, ping(.32, 4400, 2.0), 1, .1); put(SFX, EV['casing'] + .62, ping(.14, 4600, 1.0), 1, .1); put(SFX, EV['casing'] + .8, ping(.06, 4700, .6), 1, .1)
put(SFX, 31.6, hp(noise(2.6), 3000) * env(2.6, .2, 4) * .06, 1, .5)
put(SFX, 34.2, engine(3.0, [1900, 1900], .07, .5) * env(3.0, .1, 1.5), 1, -.2)
put(SFX, EV['stalk'], emu_grunt(.2, 260, .2), 1, 0); put(SFX, EV['smug'], click(.3), 1, 0); put(SFX, EV['stamp'], thud(1.0, 42, 1.0, .5), 1, 0); put(SFX, EV['stamp'] + .05, emu_boom(.55, 3, .25, 56), 1, 0)

# ================================================================ score (F major, 120 bpm)
F2, C3, F3, A3, C4, D4, E4, F4, G4, A4, Bb3, Bb2, C5, D5, G3, E3 = 87.31, 130.81, 174.61, 220, 261.63, 293.66, 329.63, 349.23, 392, 440, 233.08, 116.54, 523.25, 587.33, 196, 164.81
B = .5
# HOOK 0–4.6: frantic chase — snare roll, oom-pah, brass stabs
for k in range(9): put(MUS, k * B, tuba([F2, C3, F2, C3, Bb2, F2, C3, F2, C3][k], .3, .5), 1, -.1); put(MUS, k * B + .25, brass([A3, C4, F4], .18, .1, 2200), 1, .1)
for k in range(int(3.9 / .06)): put(MUS, k * .06, snare(.06 + .1 * k / 65, .1), 1, .2)
for k, f in enumerate([F4, G4, A4, C5, A4, F4]): put(MUS, .5 + k * .5, brass([f, f / 2], .32, .12, 2600), 1, 0)
put(MUS, VO['lost'] - .02, wahwah(466.16, 4, .3), 1, 0); put(MUS, VO['lost'], cymbal(.18, .5), 1, .3); put(MUS, VO['lost'], timp(F2 * 2, .5), 1, 0)
# FARM 5.0–11.2: sunny outback folk march — banjo plucks, tuba, penny whistle
for k in range(int((11.1 - 5.0) / (B / 2))):
    at = 5.0 + k * B / 2; ch = [F3, A3, C4] if (k // 8) % 2 == 0 else [Bb3, D4, F4]; put(MUS, at, pluck(ch[k % 3] * (2 if k % 2 else 1), .4, .16), 1, (-1) ** k * .3)
for k in range(int((11.1 - 5.0) / B)): put(MUS, 5.0 + k * B, tuba([F2, C3][k % 2] if (k // 4) % 2 == 0 else [Bb2, F2][k % 2], .35, .32), 1, -.1)
for at, f, d in [(5.0, C5, .45), (5.5, A4, .45), (6.0, F4, .9), (7.0, G4, .45), (7.5, A4, .45), (8.0, C5, .9), (9.0, D5, .45), (9.5, C5, .45), (10.0, A4, .9)]: put(MUS, at, whistle(f, d, .12), 1, .2)
put(MUS, 8.1, timp(F2 * 2, .4), 1, 0); put(MUS, 8.1, cymbal(.12, 1.5), 1, -.3); put(MUS, 10.42, brass([E4, Bb3], .5, .14, 1200), 1, 0)
# ARMY 11.2–15.1: pompous military fanfare with snare
for k in range(int((15.0 - 11.2) / B)): put(MUS, 11.2 + k * B, snare(.18 if k % 2 else .1), 1, .2); put(MUS, 11.2 + k * B, tuba([F2, C3][k % 2], .4, .4), 1, -.1)
for at, ch, d in [(11.2, [F3, A3, C4], .45), (11.7, [F3, A3, C4], .2), (12.0, [F3, C4, F4], .9), (13.0, [Bb3, D4, F4], .45), (13.5, [C4, E4, G4], .45), (14.0, [F3, A3, C4, F4], .95)]: put(MUS, at, brass(ch, d, .16, 2400), 1, 0)
put(MUS, 13.0, timp(F2 * 2, .55), 1, 0); put(MUS, 14.0, cymbal(.2, 1.8), 1, .2)
# AIM 15.1–17.1: tension drone that cuts to silence on "aim"
put(MUS, 15.1, pad([F2, C3, F3 * 1.0595], 1.45, .1, 500), 1, 0)
for k in range(5): put(MUS, 15.1 + k * .28, pluck(F3 * 1.0595 if k % 2 else F3, .25, .14), 1, .2)
# SCATTER 17.1–21.6: chaotic galop
for k in range(int((21.5 - 17.15) / .25)): put(MUS, 17.15 + k * .25, tuba([F2, C3, F2, G3 / 2][k % 4], .2, .4), 1, -.1); put(MUS, 17.15 + k * .25 + .125, snare(.14, .1), 1, .2)
for k in range(int((21.4 - 17.2) / .125)): put(MUS, 17.2 + k * .125, pluck([F4, A4, C5, A4, G4, E4, C4, E4][k % 8], .2, .11, .7), 1, (-1) ** k * .4)
put(MUS, 17.15, timp(F2 * 2, .7), 1, 0); put(MUS, 17.15, cymbal(.22, 2), 1, 0)
# AMBUSH 21.6–23.6: hushed pulses
for k in range(8): put(MUS, 21.6 + k * .25, pluck(F2 * 2, .25, .1, .4), 1, -.2)
put(MUS, 21.6, pad([F2, Bb2, F3], 1.95, .08, 400), 1, 0)
# (music silent through the burst; the jam lands on a dead stop)
put(MUS, VO['jammed'] + .3, brass([E3, Bb3], .7, .1, 900), 1, 0)
# CHASE 25.4–29.2: galloping comedy chase
for k in range(int((29.0 - 25.4) / .25)): put(MUS, 25.4 + k * .25, tuba([F2, C3, A3 / 2, C3][k % 4], .2, .42), 1, -.1); put(MUS, 25.4 + k * .25 + .125, snare(.13, .1), 1, .2)
for k, f in enumerate([C5, A4, F4, A4, C5, D5, C5, A4, G4, A4, Bb3 * 2, A4, G4, F4]): put(MUS, 25.45 + k * .25, brass([f], .22, .09, 3000), 1, .1)
put(MUS, EV['bump'], cymbal(.2, 1.0), 1, 0)
# SAD 29.3–34.2: deflated trombone
put(MUS, 29.3, pad([F2, A3 / 2, C3], 4.9, .06, 500, 1.0), 1, 0)
put(MUS, 30.7, wahwah(392, 4, .2), 1, 0)
for at, f, d in [(32.2, A4 / 2, .9), (33.1, G4 / 2, .9), (34.0, F4 / 2, .4)]: put(MUS, at, whistle(f, d, .07), 1, -.2)
# VICTORY 34.2–40: ironic heroic anthem for the emus, final hit on the stamp
put(MUS, 34.2, cymbal(.08, 3.5) * np.linspace(0, 1, int(3.5 * SR)) ** 2, 1, 0)
for at, ch, d in [(34.3, [F3, A3, C4], 1.0), (35.3, [Bb3, D4, F4], 1.0), (36.3, [C4, E4, G4], 1.0), (37.3, [F3, A3, C4, F4], .8)]: put(MUS, at, brass(ch, d, .14, 2000, .25), 1, 0)
for k in range(int(3.8 / B)): put(MUS, 34.3 + k * B, timp(F2 * 2 if k % 2 == 0 else C3 * 2, .3, .8), 1, 0)
for at, f, d in [(34.3, C5, .9), (35.3, D5, .9), (36.3, E4 * 2, .9), (37.3, F4 * 2, .7)]: put(MUS, at, whistle(f, d, .1), 1, .2)
put(MUS, EV['stamp'], brass([F2 * 2, F3, A3, C4, F4], 1.8, .22, 2600, .01), 1, 0); put(MUS, EV['stamp'], timp(F2 * 2, .8, 2.2), 1, 0); put(MUS, EV['stamp'], cymbal(.3, 3.0), 1, 0)

# ================================================================ master
ir_n = int(SR * 1.1); irt = np.arange(ir_n) / SR; ir = rng.standard_normal(ir_n) * np.exp(-irt * 5); ir[0] = 6; ir /= np.abs(ir).sum() / 8
def verb(x, wet): return np.stack([x[:, 0] + fftconvolve(x[:, 0], ir)[:N] * wet, x[:, 1] + fftconvolve(x[:, 1], np.roll(ir, 37))[:N] * wet], -1)
fade = (1 - sm(EV['fade'] + .2, 40, t))[:, None]
music = verb(MUS, .35) * fade; sfx = verb(SFX, .18) * fade
music[:, 0] = hp(music[:, 0], 35); music[:, 1] = hp(music[:, 1], 35); sfx[:, 0] = hp(sfx[:, 0], 28); sfx[:, 1] = hp(sfx[:, 1], 28)
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
x = music * .9 + sfx; x /= np.abs(x).max(); ceiling = 10 ** (-2.4 / 20); gain = 1.0
for it in range(10):
    y = limit(x * gain, ceiling); I, TP = measure(y)
    if abs(I + 15.95) < .15: break
    gain *= 10 ** ((-15.95 - I) / 20)
OUT.mkdir(parents=True, exist_ok=True); write(OUT / 'mix.wav', y)
print(json.dumps({'integratedLUFS': I, 'truePeak': TP, 'iterations': it + 1, 'seconds': DUR}))
