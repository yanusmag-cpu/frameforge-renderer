#!/usr/bin/env python3
"""YunoWorld — The Man Who Jumped From the Stratosphere: original synthesized sound design + score + Kokoro narration."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from sfx_lib import *   # noqa: F401,F403
NARR = [0.2, 4.65, 8.5, 13.3, 19.1, 22.3, 25.6, 27.3, 33.2, 36.3, 38.95, 41.3, 46.3, 49.4, 55.0]
def breath(at, g=.05):   # helmet breathing: filtered noise in / out
    for k, (d, f) in enumerate([(.9, (500, 2500)), (1.1, (300, 1800))]): put(SFX, at + k * 1.0, bp(noise(d), *f) * gate(d, .25, .4) * g)
def hum(d, g=.02): x = T(d); return (sine(120, d) * .5 + sine(240, d) * .2 + lp(noise(d), 400) * .5) * gate(d, .3, .3) * g
def rwind(d, g=.2, cut=1200): return lp(noise(d), cut) * gate(d, .4, .6) * g
def flap(d, rate=14, g=.1): x = T(d); return bp(noise(d), 150, 1500) * (.5 + .5 * np.sign(np.sin(2 * np.pi * rate * x))) * gate(d, .05, .3) * g
# ambience
put(AMB, 4.6, wind(3.9, .06)); put(AMB, 4.6, lp(noise(3.9), 120) * gate(3.9, .3, .6) * .3)                       # launch: ground wind + low rumble
put(SFX, 5.3, A(creak(1.2, .05), clunk(.15)))
put(AMB, 8.5, rwind(4.8, .05, 600)); put(AMB, 8.5, hum(10.6, .04)); put(AMB, 0, hum(4.6, .03)); put(AMB, 19.1, hum(6.9, .04))   # capsule systems
for at in (9.0, 14.0, 20.0, 23.2): put(SFX, at, beep(1400, .1, .05))
breath(.6, .04); breath(19.6, .05); breath(23.0, .06)
put(SFX, 22.4, A(clunk(.3), creak(.9, .06))); put(SFX, 23.4, clack(.15)); put(SFX, 24.0, clack(.12)); put(SFX, 24.6, clack(.1))
# the jump: near silence, then rising wind as the air thickens
put(SFX, 26.0, whoosh(1.0, .12)); put(AMB, 26.2, rwind(7.0, .05, 500) * np.linspace(.2, 1, int(7.0 * SR)))
put(AMB, 33.2, rwind(5.8, .16, 900)); put(SFX, 33.2, flap(5.7, 9, .05) * np.linspace(.3, 1.4, int(5.7 * SR)))
for k in range(9): put(SFX, 33.5 + k * .6, whoosh(.5, .06 + k * .01))
put(AMB, 38.95, rwind(2.35, .12, 800)); put(AMB, 41.3, rwind(3.3, .2, 1500))
put(SFX, 44.6, A(flap(.6, 30, .2), whoosh(.5, .3), clunk(.4))); put(AMB, 45.2, rwind(2.0, .06, 700)); put(SFX, 45.3, flap(2.8, 6, .03))
put(SFX, 47.9, A(thump(.5), lp(noise(.4), 800) * env(.4, .002, .1) * .4)); put(SFX, 48.1, clack(.1)); put(SFX, 48.4, clack(.1)); put(SFX, 48.65, thump(.35))
put(AMB, 46.3, wind(13.7, .05)); put(SFX, 48.9, crowd(3.5, .04))
# score (original)
put(MUS, 0, pad([NOTE(50), NOTE(57), NOTE(62)], 4.6, .04, 900)); put(MUS, 0, drone(NOTE(38), 4.6, .06, 250))
for i, n in enumerate([74, 76, 78, 81, 79, 78, 76, 74]): put(MUS, 4.6 + i * .55, piano(NOTE(n), 1.6, .08))
for k in range(28): put(MUS, 8.5 + k * .5, pulse(NOTE(38), .18, .04 + k * .002))
put(MUS, 8.5, pad([NOTE(50), NOTE(54), NOTE(57)], 5.2, .04, 1000)); put(MUS, 13.3, pad([NOTE(47), NOTE(54), NOTE(59)], 6.0, .04, 1100)); put(MUS, 19.1, pad([NOTE(52), NOTE(59), NOTE(64)], 3.4, .05, 1300))
put(MUS, 22.3, riser(3.6, .16, 150, 1500))
put(MUS, 27.3, drone(NOTE(38), 11.6, .07, 300))
for k in range(26): put(MUS, 27.3 + k * .44, tom(52 if k % 4 else 46, .18 + k * .008))
put(MUS, 33.2, string(NOTE(62), 5.7, .04)); put(MUS, 33.2, string(NOTE(63), 5.7, .03))
put(MUS, 41.3, pad([NOTE(50), NOTE(57), NOTE(62), NOTE(66)], 5.0, .045, 1200)); put(MUS, 44.6, hit(.35))
for i, (n, at) in enumerate([(74, 46.4), (78, 47.0), (81, 47.6), (86, 48.6)]): put(MUS, at, piano(NOTE(n), 2.4, .1))
put(MUS, 48.6, brass([NOTE(50), NOTE(54), NOTE(57), NOTE(62)], 4.0, .07)); put(MUS, 49.4, pad([NOTE(50), NOTE(54), NOTE(57)], 5.6, .045, 1400)); put(MUS, 55.0, pad([NOTE(55), NOTE(59), NOTE(62), NOTE(66)], 5.0, .05, 1500))
for i, n in enumerate([74, 78, 81, 79, 78, 74]): put(MUS, 55.2 + i * .7, piano(NOTE(n), 2.0, .09))
VO = narration_fit('strato', NARR)
mix = master(MUS, SFX, AMB, VO, ROOT / 'public/yw-strato-sound-v2')
print('strato bed', float(np.abs(mix).max()), lufs(mix))
