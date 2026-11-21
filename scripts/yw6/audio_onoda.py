#!/usr/bin/env python3
"""Onoda short — original synthesized ambience, SFX and score + dry narration; events locked to shots / spoken words."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from audio_common import *   # noqa: F401,F403
C = CUES['onoda']; E = 60.0; F = 'onoda'
w = lambda word, n=1, fb=0.0: wt(F, word, n, fb)
PENT = [62, 65, 67, 69, 72, 74, 77, 79, 81]          # D minor pentatonic (original melodies)
def koto(f, g=.06, d=1.6):
    x = T(d); bend = 1 + .012 * np.exp(-x * 18); s = sum(np.sin(2 * np.pi * f * k * np.cumsum(bend) / SR) * np.exp(-x * (3 + k * 2.2)) / k for k in (1, 2, 3, 4))
    return (s + bp(noise(d), 1500, 6000) * env(d, .001, .01) * .3) * g
def flute(f, d, g=.035):
    x = T(d); vib = 1 + .008 * np.sin(2 * np.pi * 5 * x) * sm(.3, 1, x); s = np.sin(2 * np.pi * f * np.cumsum(vib) / SR) + .25 * np.sin(4 * np.pi * f * np.cumsum(vib) / SR)
    return (s + bp(noise(d), f, f * 3) * .25) * gate(d, .25, .5) * g
def birds(d, g=.03, rate=1.2):
    out = np.zeros(int(d * SR)); R = np.random.default_rng(int(d * 7))
    for t0 in R.uniform(0, d, int(d * rate)): i = int(t0 * SR); f0 = R.uniform(2200, 4200); c = chirp(1, f0)[:max(0, len(out) - i)]; out[i:i + len(c)] += c * R.uniform(.4, 1)
    return out * g
def insects(d, g=.012):
    x = T(d); return bp(noise(d), 5500, 8500) * (.6 + .4 * np.sin(2 * np.pi * 23 * x) ** 2) * (.7 + .3 * np.sin(2 * np.pi * .2 * x)) * g
def rustle(d=.5, g=.06): return bp(noise(d), 900, 6000) * gate(d, .05, .25) * (.6 + .4 * np.abs(np.sin(np.linspace(0, 20, int(d * SR))))) * g
def leafsteps(a, b, rate=1.9, g=.05):
    for k in range(int((b - a) * rate)): put(SFX, a + k / rate, A(step(g * .8, 110), rustle(.18, g * .6)))
def paper(g=.05, d=.35): return hp(noise(d), 1800) * (np.random.default_rng(3).random(int(d * SR)) > .7) * gate(d, .01, .1) * g
def shutter(g=.12): return A(clack(g), tick(g * .8))
def scratch(g=.05): d = .22; return bp(noise(d), 2500, 7000) * gate(d, .01, .08) * g
# ---------- ambience by set
day = [(0, C[1]), (C[3], C[5]), (C[7], C[9])]; dusk = [(C[5], w('raiding', 1, C[5] + 3.6)), (C[12], E)]; night = [(w('raiding', 1, C[5] + 3.6), C[6]), (C[9], C[11])]
for a, b in day: put(AMB, a, A(birds(b - a, .03), insects(b - a, .01), wind(b - a, .015)))
for a, b in dusk: put(AMB, a, A(birds(b - a, .018, .6), insects(b - a, .016), wind(b - a, .012)))
for a, b in night: put(AMB, a, A(crickets(b - a, .03), insects(b - a, .02)))
put(AMB, C[6], A(wind(C[7] - C[6], .02), insects(C[7] - C[6], .008)))
put(AMB, C[1], A(wind(C[3] - C[1], .03), waves(C[3] - C[1], .03)))
FL = w('flew', 1, C[11] + 3)
put(AMB, C[11], A(lp(noise(FL - C[11]), 250) * .015)); [put(SFX, C[11] + .2 + k, tick(.03)) for k in range(int(FL - C[11]))]
put(AMB, FL, A(wind(C[12] - FL, .04)))
# ---------- SFX
put(SFX, .4, rustle(.6, .05)); put(SFX, 1.4, A(clack(.12), clink(.05)))                                     # rifle readied
put(SFX, C[1], engine(C[2] - C[1], .04, 9)); put(SFX, C[2] + .55, A(thump(.18), step(.08)))                  # transport plane; salute stamp
put(SFX, C[3], engine(3.6, .07, 11)); put(SFX, C[3] + 1.2, whoosh(1.6, .06))                                 # aircraft overhead
for k in range(14): put(SFX, C[3] + .8 + k * .22, paper(.035), pan=(k % 5 - 2) * .2)                          # leaflets fluttering
put(SFX, C[4] - 1.3, paper(.06, .3)); put(SFX, C[4] + .3, paper(.05, .5)); put(SFX, C[5] - 1.2, A(crackle(.6, 50, .08))); put(SFX, C[5] - .75, A(whoosh(.5, .12), crackle(1.2, 60, .1)))
put(SFX, C[2] - .5, crackle(C[6] - C[2] + .5, 18, .015))                                                    # camp fire bed
t1, t2 = w('cleaning', 1, C[5] + 2), w('raiding', 1, C[5] + 3.6)
for k in range(5): put(SFX, C[5] + .3 + k * .32, bp(noise(.12), 3000, 8000) * gate(.12, .01, .05) * .03)    # needle through cloth
for k in range(5): put(SFX, t1 + .2 + k * .28, A(clink(.05), clack(.04)))                                     # rifle cleaning
leafsteps(t2, C[6], 2.4, .045)
for k in range(int((C[7] - C[6] - .8) / .25)): put(SFX, C[6] + .2 + k * .25, scratch(.04))                    # tally scratches
leafsteps(C[7], C[8], 2.2, .05)
for a in (w('onoda', 2, C[8] + .5), w('panda', 1, C[8] + 1.4), w('abominable', 1, C[8] + 2.2)): put(SFX, a, A(popfx(.1), boing(.05)))
put(SFX, C[9] + .2, rustle(1.0, .09)); FLASH = w('found', 1, C[9] + .4) + .9; put(SFX, FLASH, A(shutter(.15), riser(.4, .02, 2000, 6000)))
put(SFX, C[9], crackle(C[11] - C[9], 20, .02))
put(SFX, C[11] + .6, paper(.05, .4)); put(SFX, FL, engine(C[12] - FL, .08, 10))
put(SFX, C[12] + .2, paper(.07, .6)); put(SFX, C[12] + 1.5, A(thump(.15), step(.06)))
put(SFX, C[13] + 1.8, A(clunk(.12), rustle(.4, .04)))
# ---------- score (original): koto-like plucks, breathy flute, low drum; suspense → release
put(MUS, 0, drone(NOTE(38), C[1], .03, 260)); [put(MUS, .2 + k * .55, koto(NOTE(PENT[[0, 2, 1, 3][k % 4]]), .045)) for k in range(int(C[1] / .55))]
put(MUS, C[1] - .25, hit(.12))
put(MUS, C[1], pad([NOTE(50), NOTE(57), NOTE(62)], C[3] - C[1], .03, 1200)); put(MUS, C[1] + .4, flute(NOTE(74), 3.2, .03)); put(MUS, w('never', 1, C[2] + 1.6), A(tom(45, .25), hit(.1)))
for k in range(int((C[5] - C[3]) / .5)): put(MUS, C[3] + k * .5, koto(NOTE(PENT[(k * 3) % 6 + 1]), .04))
put(MUS, C[4], tom(50, .18))
put(MUS, C[5], pad([NOTE(50), NOTE(53), NOTE(57)], C[7] - C[5], .03, 800)); [put(MUS, C[5] + k * 1.0, tom(48, .1)) for k in range(int(C[6] - C[5]))]
put(MUS, C[6], flute(NOTE(69), C[7] - C[6] - .3, .03))
put(MUS, C[7], pad([NOTE(55), NOTE(62), NOTE(67)], C[9] - C[7], .03, 1600)); [put(MUS, C[7] + k * .4, koto(NOTE(PENT[[4, 6, 5, 7, 6, 4][k % 6]]), .04)) for k in range(int((C[9] - C[7]) / .4))]
put(MUS, C[9], drone(NOTE(38), C[11] - C[9], .035, 240)); [put(MUS, C[9] + k * .75, tom(44 + (k % 2) * 6, .12)) for k in range(int((C[11] - C[9]) / .75))]
put(MUS, C[11], pad([NOTE(53), NOTE(57), NOTE(60)], C[12] - C[11], .03, 1200)); put(MUS, FL - 1, riser(1, .04, 150, 1400))
put(MUS, C[12], pad([NOTE(50), NOTE(57), NOTE(62), NOTE(65)], C[13] - C[12], .035, 1400)); put(MUS, C[12] + .3, flute(NOTE(74), C[13] - C[12], .03))
put(MUS, C[13], pad([NOTE(50), NOTE(57), NOTE(62), NOTE(66)], E - C[13], .05, 1800))
for i, n in enumerate([74, 77, 79, 81, 79, 77, 74, 72, 74]): put(MUS, C[13] + .4 + i * .62, koto(NOTE(n), .06, 2.2))
put(MUS, C[13] + 2, flute(NOTE(74), E - C[13] - 2.4, .03))
mix = master(MUS, SFX, AMB, vo('onoda'), ROOT / 'public/yw6-onoda-sound', target=-14.0, ceiling=.85)
print('onoda bed', float(np.abs(mix).max()), lufs(mix))
