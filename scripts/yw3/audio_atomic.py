#!/usr/bin/env python3
"""YunoWorld — The Man Who Survived Two Atomic Bombs: original synthesized sound design + score + Kokoro narration."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from sfx_lib import *   # noqa: F401,F403  (shared generated-sound helpers; nothing sampled)
NARR = [0.25, 5.75, 12.55, 16.4, 19.1, 24.4, 29.3, 33.6, 35.8, 41.8, 44.3, 51.2, 55.1]
def cicadas(d, g=.03): x = T(d); return bp(noise(d), 4200, 7500) * (.5 + .5 * np.sin(2 * np.pi * 38 * x)) * (.6 + .4 * np.sin(2 * np.pi * .4 * x)) * gate(d, .8, .8) * g
def steps(t0, t1, every=.5, g=.07, soft=1.0):
    k = t0
    while k < t1: put(SFX, k, (lp(noise(.12), 900 * soft) * env(.12, .002, .03) + bp(noise(.12), 1500, 4000) * env(.12, .001, .01) * .3) * g); k += every
def chuff(d, rate=3.2, g=.12):
    o = np.zeros(int(d * SR)); k = 0.0
    while k < d - .3: s = bp(noise(.3), 300, 3000) * env(.3, .005, .09); i = int(k * SR); o[i:i + len(s)] += s[:len(o) - i]; k += 1 / rate
    return o * g
def railclack(d, every=.55, g=.08):
    o = np.zeros(int(d * SR)); k = 0.0
    while k < d - .2: for_ = [0, .12]; [o.__setitem__(slice(int((k + q) * SR), int((k + q) * SR) + int(.1 * SR)), o[int((k + q) * SR):int((k + q) * SR) + int(.1 * SR)] + (bp(noise(.1), 400, 3000) * env(.1, .001, .02))[:len(o[int((k + q) * SR):int((k + q) * SR) + int(.1 * SR)])]) for q in for_]; k += every
    return o * g
def steamwhistle(d=1.4, g=.12): x = T(d); return (sine(NOTE(74), d) + sine(NOTE(78), d) * .7 + sine(NOTE(81), d) * .5) * gate(d, .08, .3) * (1 + .03 * np.sin(x * 30)) * g + bp(noise(d), 1500, 4000) * gate(d, .05, .3) * g * .3
def ring(d, f=3800, g=.012): return sine(f, d) * gate(d, .1, .8) * g
def plane(d, g=.05): x = T(d); return lp(saw(68, d, .01) + saw(71, d, -.01), 400) * gate(d, .8, .5) * (.7 + .3 * np.sin(x * 2)) * g

# ---------------- ambience ----------------
put(AMB, 0, wind(60, .03))
put(AMB, 5.6, crowd(3.6, .05)); put(AMB, 5.6, cicadas(3.6, .02))
put(AMB, 9.2, cicadas(8.55, .035)); put(AMB, 9.2, crowd(8.55, .04))
put(SFX, 9.2, (lp(noise(3.4), 160) * gate(3.4, .5, 1.2) * .35)); put(SFX, 9.6, chime(.07)); put(SFX, 10.0, chime(.05))   # tram rumble + bell
steps(9.4, 15.0, .5, .06); put(SFX, 16.4, plane(1.6, .06))
# 1 — the first bomb
put(SFX, .45, A(sub(.9, 34, 3.0), rumble(3.0, .5), riser(.4, .2, 3000, 300) * 0)); put(SFX, .1, whoosh(.5, .15))
put(SFX, 17.75, A(sine(5200, .35) * env(.35, .001, .2) * .05, sub(.6, 30, 1.5)))           # the flash: a pressure drop, no bang yet
put(SFX, 19.3, roar(1.2, .5) * np.linspace(.1, 1.4, int(1.2 * SR)))                        # the wave rushing down the street
put(SFX, 20.25, A(hit(1.0), crumble(2.0, .6, 90), glass(.25), rumble(2.6, .7)))
put(SFX, 20.6, crumble(1.4, .3, 40)); put(SFX, 21.9, ring(2.5)); put(AMB, 21.9, lp(noise(2.5), 300) * gate(2.5, .4, .6) * .06); put(SFX, 22.2, crackle(2.2, 10, .03))
# 2 — the journey home
put(SFX, 24.4, chuff(2.8, 3.4, .14)); put(SFX, 24.6, railclack(2.6, .45, .07)); put(SFX, 25.2, steamwhistle(1.3, .1))
put(AMB, 27.2, lp(railclack(2.1, .5, .12), 1200)); put(AMB, 27.2, lp(noise(2.1), 250) * .08); put(SFX, 27.6, creak(1.0, .05))
# 3 — Nagasaki office
put(AMB, 29.3, lp(noise(4.45), 900) * .015); put(AMB, 29.3, cicadas(4.45, .02))
put(SFX, 33.75, A(sine(5200, .4) * env(.4, .001, .25) * .05, sub(.7, 30, 1.6)))
put(SFX, 34.6, A(glass(.7), hit(.9), crumble(1.6, .5, 80), rumble(2.4, .6)))
put(SFX, 36.0, roar(5.8, .35)); put(SFX, 36.0, rumble(5.8, .45))
put(SFX, 41.8, crumble(2.0, .12, 15)); put(SFX, 41.8, ring(2.4, 3400, .01))
# 4 — the river, years later
put(AMB, 44.3, waves(15.7, .03)); put(AMB, 44.3, bp(noise(15.7), 3500, 6500) * (np.sin(2 * np.pi * 6 * T(15.7)) > .6) * .01)   # crickets

# ---------------- score (original) ----------------
Am = [NOTE(57), NOTE(60), NOTE(64)]; F_ = [NOTE(53), NOTE(57), NOTE(60)]; C_ = [NOTE(48), NOTE(55), NOTE(64)]; G_ = [NOTE(55), NOTE(59), NOTE(62)]
put(MUS, 0, drone(NOTE(33), 5.4, .1, 220))
for i, (n, at) in enumerate([(69, 5.7), (72, 6.6), (76, 7.5), (74, 8.4), (72, 9.6), (69, 10.5), (67, 11.4), (69, 12.6), (72, 13.5), (71, 14.4), (69, 15.3)]): put(MUS, at, piano(NOTE(n), 2.2, .12))
put(MUS, 5.6, pad(Am, 6.2, .035, 700)); put(MUS, 11.8, pad(F_, 4.8, .035, 700)); put(MUS, 16.2, pad([NOTE(52), NOTE(56), NOTE(59)], 1.6, .04, 600))
put(MUS, 22.3, string(NOTE(57), 3.0, .05)); put(MUS, 22.3, string(NOTE(60), 3.0, .04)); put(MUS, 25.3, string(NOTE(53), 4.0, .05)); put(MUS, 25.3, string(NOTE(57), 4.0, .04))
for k in range(8): put(MUS, 29.4 + k * .55, pulse(NOTE(45), .2, .06 + k * .01))
put(MUS, 31.6, riser(2.1, .18, 200, 2000))
put(MUS, 36.2, drone(NOTE(31), 7.6, .1, 200))
for i, (n, at, d) in enumerate([(69, 44.5, 2.5), (72, 46.0, 2.5), (71, 47.5, 2.5), (67, 49.0, 3.0), (69, 51.4, 2.5), (72, 52.9, 2.2), (76, 54.4, 2.6), (74, 55.4, 2.0), (72, 56.6, 3.0)]): put(MUS, at, piano(NOTE(n), d, .13))
put(MUS, 44.3, pad(Am, 6.8, .04, 800)); put(MUS, 51.0, pad(F_, 4.2, .04, 800)); put(MUS, 55.1, pad(C_, 2.4, .045, 900)); put(MUS, 57.4, pad(G_ + [NOTE(67)], 2.6, .045, 900))

VO = narration_fit('atomic', NARR)
mix = master(MUS, SFX, AMB, VO, ROOT / 'public/yw-atomic-sound-v2')
print('atomic bed', float(np.abs(mix).max()), lufs(mix))
