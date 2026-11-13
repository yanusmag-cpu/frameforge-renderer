"""Original 60 s score + SFX for the Claude BA5390 film (no narration — CapCut voiceover is added later).
All sounds are synthesised here; cue times match src/ba5390/story.ts. Output: public/ba5390/mix.wav (48 kHz stereo),
mastered to -16 LUFS / <= -1.5 dBTP for the FrameForge assembly gate."""
from pathlib import Path
import numpy as np, wave, json, subprocess, tempfile, os
from scipy.signal import butter, sosfilt, fftconvolve, resample_poly
from scipy.ndimage import maximum_filter1d, uniform_filter1d
ROOT = Path(__file__).resolve().parents[2]; OUT = ROOT / 'public/ba5390'; OUT.mkdir(parents=True, exist_ok=True)
SR = 48000; N = SR * 60; t = np.arange(N) / SR; rng = np.random.default_rng(10061990)
L = np.zeros(N); R = np.zeros(N)
BLOWOUT, SUCKED, GRAB, DOOR, HANDOVER, TOUCHDOWN, NOSEDOWN, STOP = 20.05, 21.45, 26.45, 28.0, 35.6, 48.4, 49.0, 52.3
def sm(a, b, x):
    u = np.clip((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u)
def win(a, b, f=.2): return sm(a, a + f, t) * (1 - sm(b - f, b, t))
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'highpass', fs=SR, output='sos'), x)
noise = rng.standard_normal(N)
def put(sig, g=1., pan=0.):
    global L, R
    L += sig * g * np.sqrt((1 - pan) / 2) * 1.41; R += sig * g * np.sqrt((1 + pan) / 2) * 1.41
def ev(at, dur):
    i = int(at * SR); n = min(int(dur * SR), N - i); return i, n, np.arange(n) / SR
def place(at, s, g=1., pan=0.):
    i = int(at * SR); n = min(len(s), N - i); z = np.zeros(N); z[i:i + n] = s[:n]; put(z, g, pan)
def boom(at, g=1., f0=50, dur=2.2, pan=0.):
    i, n, a = ev(at, dur); s = np.sin(2 * np.pi * (f0 * a + 20 * (1 - np.exp(-a * 7)))) * np.exp(-a * 2.4) + lp(rng.standard_normal(n), 400) * np.exp(-a * 5) * .9; place(at, s, g, pan)
def clank(at, g=1., f=420, pan=0.):
    i, n, a = ev(at, 1.2); s = sum(np.sin(2 * np.pi * f * k * a + k) * np.exp(-a * (4 + 2 * k)) / k for k in (1, 2.76, 5.4, 8.93)); place(at, s * .5, g, pan)
def click(at, g=1., f=3000):
    i, n, a = ev(at, .05); place(at, hp(rng.standard_normal(n), f) * np.exp(-a * 160), g)
def whoosh(at, dur, g=1., rev=False):
    i, n, a = ev(at, dur); e = sm(0, dur, a) ** 2 if rev else np.exp(-a * 5 / dur) * sm(0, .03, a); place(at, bp(rng.standard_normal(n), 300, 6000) * e, g)
def note(at, f, dur, g=1., pan=0., bright=.4):
    i, n, a = ev(at, dur); s = sum(np.sin(2 * np.pi * f * k * a) * np.exp(-a * (1.1 + k * 1.1)) / k ** (2 - bright) for k in range(1, 6)) * sm(0, .006, a); place(at, s, g, pan)
def pad(a0, a1, freqs, g=1., fade=1., cutoff=1500):
    env = win(a0, a1, fade); s = np.zeros(N)
    for j, f in enumerate(freqs):
        for d in (-.004, 0, .0047): s += (2 * ((f * (1 + d) * t + j / 7) % 1) - 1) * .3 + np.sin(2 * np.pi * f * (1 + d) * t + j) * .5
    put(lp(s * env, cutoff) / len(freqs), g * .5)
# ---------------------------------------------------------------- engines + air
spey = (np.sin(2 * np.pi * 52 * t) + .5 * np.sin(2 * np.pi * 104.5 * t)) * .5 + bp(noise, 900, 1500) * .5 + np.sin(2 * np.pi * (1720 + 8 * np.sin(t * .7)) * t) * .05
hush = bp(np.roll(noise, 3333), 150, 2500)
cruise_in = win(10, 20.05, .1) + win(15.5, 17.5, .05) * 0
put(lp(spey, 700) * (win(10, 15.5, .1) + win(17.5, 20.05, .05)) * .55 + hush * (win(10, 15.5) + win(17.5, 19.9, .05)) * .12, .7)
put(lp(spey, 400) * win(15.5, 17.5, .05) * .45 + lp(hush, 900) * win(15.5, 17.5, .05) * .2, .7)
put(spey * win(8, 10, .1) * .7 + bp(noise, 200, 3000) * win(8, 10, .1) * .15, .7)
put(spey * (win(40, 48.4, .2)) * .6, .6)
# cabin chatter (babble of formant-filtered noise, unintelligible)
bab = np.zeros(N)
for k in range(8):
    f1 = 450 + 260 * k % 700; m = (np.sin(2 * np.pi * (2.3 + k * .37) * t + k) > .2) * (.5 + .5 * np.sin(2 * np.pi * (5 + k) * t))
    bab += bp(np.roll(noise, 777 * k), f1, f1 + 500) * m
put(bab * win(15.5, 17.5, .1) * .12)
for at in (15.9, 16.6, 17.1): clank(at, .08, 1800, .3)
# ---------------------------------------------------------------- the emergency wind (exterior louder/brighter than interior)
roar_lo = lp(noise, 500) * 1.4; roar_hi = bp(np.roll(noise, 999), 600, 7000)
flap = bp(np.roll(noise, 4242), 300, 2500) * (np.abs(np.sin(2 * np.pi * 13 * t + 2 * np.sin(t * 3))) ** 3)
emerg = win(0, 8.05, .02) + win(BLOWOUT, 43.4, .03) * (1 - .45 * sm(38.7, 40.5, t)) + win(43, 48.6, .2) * .6
def shot_env(intervals):
    e = np.zeros(N)
    for a, b in intervals: e += win(a, b, .03)
    return e
ext = shot_env([(0, 2.7), (6.6, 8), (BLOWOUT, 21.3), (23.6, 25.8), (37.5, 43), (45.5, 48)])
put((roar_lo * (1 + .3 * ext) + roar_hi * (.35 + .6 * ext) + flap * (.5 + .4 * (1 - ext))) * emerg, .5)
# warning horn (intermittent), papers
horn = np.sign(np.sin(2 * np.pi * 380 * t)) * .5 + np.sin(2 * np.pi * 760 * t) * .3
hornEnv = (np.sin(2 * np.pi * 1.6 * t) > .1) * (win(0, 8, .02) + win(BLOWOUT + .4, 47.8, .05))
put(lp(horn, 2500) * hornEnv * .06)
put(hp(np.roll(noise, 1717), 2500) * (np.abs(np.sin(2 * np.pi * 21 * t)) ** 6) * (win(0, 8, .05) + win(BLOWOUT, 31, .1)) * .25)
heart = np.zeros(N)
for k in range(int(8 / .45)):
    for off, gg in ((0, 1), (.15, .6)):
        i, n, a = ev(k * .45 + off, .25); heart[i:i + n] += np.sin(2 * np.pi * 50 * a) * np.exp(-a * 18) * gg
put(heart, .35)
# ---------------------------------------------------------------- event cues
whoosh(7.6, .4, .5, rev=True); boom(8.0, .55, 70, 1.5); whoosh(8.0, 1.2, .35)   # flashback hit
click(14.25, .5); click(13.75, .35, 2000)
click(17.47, .6, 1500); clank(17.5, .2, 900)  # door
i, n, a = ev(18.8, 1.25); cr = np.sin(2 * np.pi * (60 + 25 * np.sin(a * 3)) * a) * sm(0, 1.2, a) * .6 + bp(rng.standard_normal(n), 2000, 5000) * (rng.random(n) > .997) * 3; place(18.8, cr, .45)
for k in range(10): click(19.0 + k * .09, .25 + k * .03, 4000)  # bolts ticking before failure
# BANG + decompression
i, n, a = ev(BLOWOUT, 3.0); bang = (rng.standard_normal(n) * np.exp(-a * 9) * 2.2 + np.sin(2 * np.pi * 42 * a) * np.exp(-a * 3) * 1.6 + hp(rng.standard_normal(n), 3000) * np.exp(-a * 1.5) * .8)
place(BLOWOUT, bang, 1.0); boom(BLOWOUT, 1.2, 38, 3.2)
i, n, a = ev(BLOWOUT + .05, 1.6); place(BLOWOUT + .05, hp(rng.standard_normal(n), 1200) * np.exp(-a * 2.5) * 1.2, .6)   # fog hiss
boom(SUCKED, .8, 60, 1.2, -.3); clank(SUCKED + .05, .25, 700, -.3)
boom(GRAB, .45, 80, .8); i, n, a = ev(GRAB, .35); place(GRAB, bp(rng.standard_normal(n), 400, 1800) * np.exp(-a * 10) * 1.5, .5)  # cloth grab
boom(DOOR, 1.0, 55, 1.6, .2); clank(DOOR + .02, .6, 260, .2); clank(DOOR + .05, .4, 610, .3)
boom(HANDOVER, .3, 90, .6)
# MAYDAY radio: click, squelch, garbled band-limited voice-like noise (unintelligible on purpose)
click(32.65, .8, 1500); i, n, a = ev(32.7, 2.15)
v = bp(rng.standard_normal(n), 400, 2600) * (.4 + .6 * (np.sin(2 * np.pi * 6 * a) > -.2)) * (.6 + .4 * np.sin(2 * np.pi * 3.1 * a)); v = np.tanh(v * 2) * .5 + hp(rng.standard_normal(n), 3000) * .15
place(32.7, v * sm(0, .05, a) * (1 - sm(2.0, 2.15, a)), .35); click(34.86, .7, 1500)
# cloud break, gear, flyover, touchdown, reverse, braking
whoosh(38.6, 1.6, .3)
i, n, a = ev(43.4, 1.2); place(43.4, np.sin(2 * np.pi * (300 + 200 * a) * a) * .3 * sm(0, .2, a) + lp(rng.standard_normal(n), 300) * .3, .35); boom(44.6, .6, 70, .8)
i, n, a = ev(45.5, 2.5); dop = np.exp(-((a - 1.3) / .55) ** 2); place(45.5, (lp(rng.standard_normal(n), 900) * 2 + np.sin(2 * np.pi * (1500 - 500 * np.tanh((a - 1.3) * 3)) * a) * .3) * dop, .8)
for k, at in enumerate((TOUCHDOWN, TOUCHDOWN + .09)):
    i, n, a = ev(at, .35); place(at, np.sin(2 * np.pi * (2400 - 1800 * a) * a) * np.exp(-a * 9) * .7 + bp(rng.standard_normal(n), 800, 4000) * np.exp(-a * 12), .55, (-1) ** k * .3)
boom(TOUCHDOWN, .8, 45, 1.2); boom(NOSEDOWN, .5, 60, .8)
put(bp(np.roll(noise, 8080), 80, 1600) * win(TOUCHDOWN + .3, STOP + .2, .3) * (1 - sm(TOUCHDOWN, STOP, t)) * 1.3 + lp(spey, 900) * win(TOUCHDOWN + .4, 51.2, .4) * .9, .5)
# sirens (UK two-tone) approaching
sir = np.sin(2 * np.pi * np.cumsum(np.where((t * 1.1) % 1 < .5, 905, 685)) / SR)
put(bp(sir, 500, 2500) * win(49.6, 57.5, .6) * (.35 + .65 * sm(50, 53.5, t)) * .14, .8, -.3)
put(lp(np.roll(noise, 5050), 250) * win(50, 54.6, .5) * .25)   # trucks
# morning birds + breeze at the end
for k in range(14):
    at = 54 + k * .38 + rng.random() * .2; i, n, a = ev(at, .18); place(at, np.sin(2 * np.pi * (3200 + 900 * np.sin(a * 60)) * a) * np.exp(-a * 18), .04, rng.uniform(-.7, .7))
put(lp(np.roll(noise, 6060), 600) * win(54, 60, .8) * .2)
# ---------------------------------------------------------------- score
D, F, A, C, G, Bb, E = 73.42, 87.31, 110.0, 130.81, 98.0, 116.54, 82.41
pad(0, 8.1, [D / 2, D, A, F * 2], .55, .3, 900); pad(8, 10, [D, A, D * 2, F * 2 * 1.0], .45, .3, 2200)
pad(10, 20.0, [D, F, A, C * 2], .35, .8, 1300); pad(18.6, 20.0, [D, Bb / 2 * 2, E * 2], .3, .3, 900)
pad(20.1, 30, [D / 2, D, A], .55, .3, 800); pad(30, 40, [D / 2, Bb / 2, F, D * 2], .55, .6, 900); pad(40, 48.4, [D, F, A, C * 2], .5, .6, 1200)
pad(48.4, 53.4, [F, A, C * 2], .45, .6, 1600); pad(53.3, 60, [D, F * 1.0595 ** 1, A, D * 2, F * 2 * 1.0595], .7, .9, 2400)
for k in range(int(8 / .25)): note(k * .25, [D * 2, D * 2, A, F * 2][k % 4], .3, .18, (-1) ** k * .3, .6)
for k in range(int(10 / .25)): note(20.1 + k * .25, [D * 2, D * 2, A, Bb][k % 4], .3, .2 + .05 * (k > 20), (-1) ** k * .3, .6)
for k in range(int(8 / .3)): note(30 + k * .3, [D * 2, F * 2, A * 2, F * 2][k % 4], .35, .14, (-1) ** k * .2, .5)
for k, (at, f) in enumerate([(10.4, 293.7), (11.6, 349.2), (12.8, 440), (14.0, 392), (15.6, 349.2), (16.8, 293.7)]): note(at, f, 2.4, .12, .2 * (-1) ** k, .3)
for k, (at, f) in enumerate([(53.4, 370), (54.2, 440), (55.0, 587.3), (56.0, 554.4), (56.8, 587.3), (57.8, 740), (58.6, 587.3)]): note(at, f, 3, .2, .25 * (-1) ** k, .35)
for f in (146.8, 220, 293.7, 370): note(53.35, f, 4.5, .14)
# ---------------------------------------------------------------- master
ir_n = int(SR * 1.2); irt = np.arange(ir_n) / SR; ir = rng.standard_normal(ir_n) * np.exp(-irt * 4); ir[0] = 6; ir /= np.abs(ir).sum() / 8
mL = hp(L * .82 + fftconvolve(L, ir)[:N] * .3, 28); mR = hp(R * .82 + fftconvolve(R, np.roll(ir, 41))[:N] * .3, 28)
fade = 1 - sm(59.25, 60, t); mL *= fade; mR *= fade
def limit(x, ceiling):
    up = resample_poly(np.abs(x), 4, 1, axis=0).max(axis=1)[::4][:len(x)]
    env = maximum_filter1d(up, int(SR * .008)); g = np.minimum(1, ceiling / np.maximum(env, 1e-9))
    g = np.minimum(g, uniform_filter1d(g, int(SR * .004))); g = -maximum_filter1d(-g, int(SR * .006)); g = uniform_filter1d(g, int(SR * .006)); return x * g[:, None]
def measure(x):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: path = f.name
    with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.round(np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    os.unlink(path); j = json.JSONDecoder().raw_decode(out[out.rfind('{'):])[0]; return float(j['input_i']), float(j['input_tp'])
x = np.stack([mL, mR], -1); x /= np.abs(x).max(); ceiling = 10 ** (-3.0 / 20); gain = 1.0
for it in range(8):
    y = limit(x * gain, ceiling); I, TP = measure(y)
    if abs(I + 15.9) < .2: break
    gain *= 10 ** ((-15.9 - I) / 20)
with wave.open(str(OUT / 'mix.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(np.round(y * 32767).astype('<i2').tobytes())
print(json.dumps({'integratedLUFS': I, 'truePeak': TP, 'iterations': it + 1}))
