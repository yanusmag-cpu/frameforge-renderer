"""Shared synth helpers for YunoWorld three shorts (original, generated sounds only)."""
import json, os, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/ehz-final-mix'
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
def write(p, x):
    y = np.clip(x, -1, 1); w = wave.open(str(p), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes()); w.close()
def lufs(x):
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / 'a.wav'; write(p, x if x.ndim == 2 else np.stack([x, x], 1))
        out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(p), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
        return float([l for l in out.splitlines() if l.strip().startswith('I:')][-1].split()[1])
def norm_lufs(x, target):
    return x * 10 ** ((target - lufs(x)) / 20)
def limit(x, ceiling):
    e = maximum_filter1d(np.abs(x).max(axis=1), int(SR * .006)); g = np.minimum(1, ceiling / np.maximum(e, 1e-9))
    g = -maximum_filter1d(-g, int(SR * .012)); g = uniform_filter1d(g, int(SR * .01)); return x * g[:, None]

def load_mono(p, sr=SR):
    w = wave.open(str(p)); fr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768; ch = w.getnchannels(); w.close()
    if ch == 2: a = a.reshape(-1, 2).mean(1)
    if fr != sr:
        from math import gcd; g = gcd(sr, fr); a = resample_poly(a, sr // g, fr // g)
    return a
def master(MUS, SFX, AMB, VO, out_dir, fade_in=.3, fade_out=(59.2, 60.0), duck_music=.78, duck_sfx=.5, target=-16.0, ceiling=.66):
    fade = np.minimum(1, t / fade_in) * (1 - np.clip((t - fade_out[0]) / (fade_out[1] - fade_out[0]), 0, 1))
    ve = uniform_filter1d(np.abs(VO).max(axis=1), int(SR * .03)); ve = maximum_filter1d(ve, int(SR * .4)); ve = uniform_filter1d(ve, int(SR * .15))
    ref = np.percentile(ve[ve > 1e-4], 50) if np.any(ve > 1e-4) else 1.0; vk = np.clip(ve / max(ref, 1e-6), 0, 1)
    bed = MUS * (fade * (1 - duck_music * vk))[:, None] + (SFX + AMB) * (fade * (1 - duck_sfx * vk))[:, None]
    bed = norm_lufs(bed, -20.5); mix = bed + VO * fade[:, None]
    for _ in range(6): mix = limit(norm_lufs(mix, target), ceiling)
    out_dir.mkdir(parents=True, exist_ok=True); tmp = out_dir / 'bed.wav'; write(tmp, mix)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'flac', str(out_dir / 'bed.flac')], check=True); tmp.unlink()
    return mix
def narration(film, starts, gain_lufs=-17.0):
    """Place the generated Kokoro sentences (public/yw-tts/<film>/sNN.wav) at the given start times."""
    VO = np.zeros((N, 2)); timing = json.load(open(ROOT / 'public/yw-tts/timing.json'))['films'][film]
    clips = [load_mono(ROOT / r['file']) for r in timing]; g = 10 ** ((gain_lufs - lufs(np.concatenate(clips))) / 20)
    for st, c in zip(starts, clips):
        i0 = int(st * SR); n = min(len(c), N - i0); VO[i0:i0 + n] += (c[:n] * g)[:, None]
    return VO

def _stretch(c, ratio):
    """Speed a clip up by `ratio` without changing pitch (ffmpeg atempo)."""
    with tempfile.TemporaryDirectory() as d:
        a, b = f'{d}/a.wav', f'{d}/b.wav'; write(a, np.stack([c, c], 1))
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', a, '-af', f'atempo={ratio:.4f}', '-ar', str(SR), b], check=True)
        return load_mono(b)
def narration_fit(film, starts, tts='public/yw-tts-male', gain_lufs=-17.0, gap=.12, max_push=.35, end=59.7):
    """Place each sentence at its cue; if it would run into the next line, push the next cue up to `max_push` s,
    then gently speed the clip (≤ 8 %) so nothing overlaps. Adds a light high-pass and a short room tail so the
    voice sits in the mix instead of sounding dry."""
    timing = json.load(open(ROOT / tts / 'timing.json'))['films'][film]
    clips = [load_mono(ROOT / r['file']) for r in timing]; st = list(starts); out = []
    for i, c in enumerate(clips):
        nxt = st[i + 1] if i + 1 < len(st) else end
        over = st[i] + len(c) / SR - (nxt - gap)
        if over > 0 and i + 1 < len(st): push = min(over, max_push); st[i + 1] += push; nxt += push; over -= push
        if over > 0: r = min(1.08, (len(c) / SR) / (nxt - gap - st[i])); c = _stretch(c, r); print(f'  {film} s{i+1:02d} tempo x{r:.3f}')
        out.append(c)
    g = 10 ** ((gain_lufs - lufs(np.concatenate(out))) / 20)
    tail = rng.standard_normal(int(.35 * SR)) * np.exp(-np.arange(int(.35 * SR)) / SR / .07) * .018
    VO = np.zeros((N, 2))
    for s0, c in zip(st, out):
        c = hp(c, 75); c = c + np.convolve(c, tail)[:len(c)]
        i0 = int(s0 * SR); n = min(len(c), N - i0); VO[i0:i0 + n] += (c[:n] * g)[:, None]
    print(f'  {film} cues', [round(x, 2) for x in st]); return VO
