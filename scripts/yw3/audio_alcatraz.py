#!/usr/bin/env python3
"""YunoWorld — The Prisoners Who Escaped Using Fake Heads: original synthesized sound design + score + Kokoro narration."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from sfx_lib import *   # noqa: F401,F403
NARR = [0.3, 5.2, 11.4, 15.9, 20.6, 26.8, 29.6, 34.4, 37.0, 42.0, 47.5, 51.3, 55.6]
def step(g=.12): d = .18; return (lp(noise(d), 900) * env(d, .001, .03) + np.sin(2 * np.pi * 70 * T(d)) * env(d, .001, .04) * .5) * g
def scrape(d, g=.06): x = T(d); return bp(noise(d), 1500, 6000) * (.5 + .5 * np.sin(2 * np.pi * 7 * x)) ** 2 * gate(d, .02, .05) * g
def drill(d, g=.05): x = T(d); return (bp(saw(220, d), 300, 3000) * .4 + bp(noise(d), 2000, 7000) * .6) * (.8 + .2 * np.sin(2 * np.pi * 18 * x)) * gate(d, .1, .2) * g
def drip(g=.05): d = .25; x = T(d); return np.sin(2 * np.pi * np.cumsum(900 + 1400 * np.exp(-x * 40)) / SR) * env(d, .001, .04) * g
def pump(g=.06): d = .5; x = T(d); return bp(noise(d), 200, 1400) * np.sin(np.pi * x / d) ** 2 * g
def horn(d=2.2, g=.06): return lp(saw(98, d) + saw(98.6, d) + saw(147, d) * .5, 500) * gate(d, .4, .8) * g   # distant fog horn
# ambience: prison night hum, water, wind
put(AMB, 0, lp(noise(11.4), 160) * .05); put(AMB, 11.4, lp(noise(18.2), 160) * .04)
for at in (5.6, 13.0, 21.5, 27.8): put(SFX, at, drip(.04))
for k in range(5): put(SFX, .25 + k * .38, step(.1 + k * .01))
put(SFX, 2.1, A(clunk(.15), tick(.2)))           # flashlight click
put(SFX, 3.4, hit(.25))
put(AMB, 5.2, waves(3.4, .07)); put(AMB, 5.2, wind(3.4, .07)); put(SFX, 6.0, horn(2.4, .05))
put(SFX, 8.8, A(clunk(.2), creak(.8, .05)))
for at in (12.5, 13.0, 13.5): put(SFX, at, popfx(.06))
for k in range(9): put(SFX, 18.4 + k * .25, scrape(.18, .05))
for k in range(11): put(SFX, 20.7 + k * .26, scrape(.2, .05))
put(SFX, 23.4, drill(3.2, .05)); put(SFX, 26.0, crumble(.6, .12))
put(SFX, 27.4, whoosh(1.4, .05))
put(SFX, 29.7, A(scrape(1.2, .03), clunk(.12)))
for k in range(8): put(SFX, 31.7 + k * .34, clack(.08))
put(SFX, 34.2, A(clunk(.15), creak(.6, .05))); put(AMB, 34.4, wind(7.6, .1))
for k in range(8): put(SFX, 34.5 + k * .3, step(.07))
put(AMB, 37.0, waves(10.5, .1))
for k in range(9): put(SFX, 37.6 + k * .4, pump(.05))
put(SFX, 42.3, splash(1.0, .35)); put(SFX, 43.5, splash(1.0, .25)); put(AMB, 44.8, waves(2.7, .12)); put(SFX, 45.5, horn(2.2, .06))
put(AMB, 47.5, lp(noise(3.8), 200) * .05)
put(SFX, 48.7, tick(.2)); put(SFX, 49.2, A(thump(.3), clack(.15))); put(SFX, 49.6, klaxon(1.7, .07))
put(AMB, 51.3, waves(4.3, .09)); put(AMB, 51.3, wind(4.3, .05))
put(AMB, 55.6, waves(4.4, .08)); put(SFX, 56.0, horn(3.2, .05))
# score (original): low suspense pulse, tense strings for the escape, open fifths for the mystery
put(MUS, 0, drone(NOTE(38), 5.2, .05, 260)); put(MUS, 3.4, hit(.3))
put(MUS, 5.2, pad([NOTE(50), NOTE(53), NOTE(57)], 6.2, .035, 800))
for i, n in enumerate([62, 65, 64, 62, 60, 62]): put(MUS, 11.4 + i * .75, piano(NOTE(n), 1.8, .06))
for k in range(30): put(MUS, 15.9 + k * .37, pulse(NOTE(38), .16, .04 + (k % 4 == 0) * .02))
put(MUS, 20.6, string(NOTE(50), 9.0, .03)); put(MUS, 26.8, string(NOTE(53), 2.8, .03))
for k in range(20): put(MUS, 29.6 + k * .37, tom(55 if k % 4 else 48, .14 + k * .004))
put(MUS, 34.4, riser(2.6, .1, 150, 1200))
put(MUS, 37.0, pad([NOTE(46), NOTE(50), NOTE(53)], 5.0, .04, 900))
for k in range(10): put(MUS, 37.0 + k * .5, pulse(NOTE(34), .2, .04))
put(MUS, 42.0, drone(NOTE(38), 5.5, .06, 300)); put(MUS, 42.0, string(NOTE(62), 5.5, .025))
put(MUS, 47.5, pad([NOTE(50), NOTE(55), NOTE(58)], 3.8, .03, 1000)); put(MUS, 49.2, hit(.3))
put(MUS, 51.3, drone(NOTE(38), 8.7, .05, 280))
for i, n in enumerate([62, 69, 67, 62]): put(MUS, 51.6 + i * 1.0, piano(NOTE(n), 2.4, .07))
put(MUS, 55.6, pad([NOTE(50), NOTE(57), NOTE(64)], 4.4, .045, 1100))
for i, n in enumerate([74, 69, 67, 62]): put(MUS, 56.0 + i * .9, piano(NOTE(n), 2.4, .07))
VO = narration_fit('alcatraz', NARR)
mix = master(MUS, SFX, AMB, VO, ROOT / 'public/yw-alcatraz-sound-v2')
print('alcatraz bed', float(np.abs(mix).max()), lufs(mix))
