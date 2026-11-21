#!/usr/bin/env python3
"""The Man Who Mailed Himself — original synthesized SFX + score + dry narration, events locked to the shot timing."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from audio_common import *   # noqa: F401,F403
C = CUES['boxbrown']; E = 60.0
# freight-depot ambience under the depot shots; quiet room tone in the studio/inside shots
for a, b in ((0, C[1]), (C[3], C[8]), (C[9], C[10])): put(AMB, a, A(crowd(b - a, .025), lp(noise(b - a), 300) * .02))
for a, b in ((C[1], C[3]), (C[8], C[9])): put(AMB, a, lp(noise(b - a), 180) * .012)
# hook: footsteps, a crate jolts twice, the porter stops… smash cut
for k in range(6): put(SFX, .1 + k * .42, step(.08, 95 + (k % 2) * 10))
put(SFX, .62, A(clunk(.3), creak(.5, .06))); put(SFX, 1.12, A(clunk(.35), creak(.6, .07))); put(SFX, 2.62, clunk(.25)); put(SFX, 3.0, creak(.8, .05))
put(SFX, C[1] - .3, whoosh(.3, .25)); put(SFX, C[1], thump(.4))
# 3 ft vs 5 ft 8: measuring ticks, he folds himself in (cloth, wood creak)
for k in range(4): put(SFX, C[1] + .5 + k * .25, tick(.18))
put(SFX, C[2] - 1.0, A(bp(noise(.8), 500, 3000) * .05, creak(.8, .06)))
# inside: water slosh, breathing through the holes
put(SFX, C[2] + .4, lp(noise(.6), 600) * .05); put(AMB, C[2], heartbeat(C[3] - C[2], .1))
# label: stamp
put(SFX, C[3] + .3, A(thump(.3), clack(.2)))
# upside down: lifted, swung, thud
put(SFX, C[4] + .2, whoosh(1.0, .2)); put(SFX, C[4] + 1.3, A(clunk(.6), thump(.4), creak(.7, .08)))
# an hour and a half on his head: slow heartbeat, strain tones, the cart rolling outside
put(AMB, C[5], heartbeat(C[6] - C[5], .16, 58)); put(SFX, C[5], lp(noise(C[6] - C[5]), 160) * .04); put(SFX, C[5] + 1, creak(C[6] - C[5] - 2, .04))
# tipped on its side, two men sit on it
put(SFX, C[6] - 2.1, clunk(.35)); put(SFX, C[6] + .2, A(creak(.9, .1), clunk(.5))); SAT = wt('boxbrown', 'sat', 1, C[6] + 1.8); put(SFX, SAT - .2, A(thump(.25), creak(.5, .06))); put(SFX, SAT + .1, thump(.22))
# why? — silence, held breath
# Richmond: wagon leaving (hooves, wheels)
put(SFX, C[8] + .4, A(hooves(C[9] - C[8] - .4, .05, 2.2), lp(noise(C[9] - C[8] - .4), 220) * .04))
# $86: coins counted onto the desk
for k in range(7): put(SFX, C[9] + .6 + k * .22, coin(.07, 2900 + 160 * (k % 3)))
# the journey: wagon · train · steamboat · ferry
J0, J1 = C[10], C[11]; L = lambda f: J0 + (J1 - J0) * f
put(SFX, L(0), hooves(L(.08) - L(0) + .3, .05)); put(SFX, L(.08), chuff(L(.34) - L(.08), .07)); put(SFX, L(.1), steamwhistle(1.0, .03))
put(SFX, L(.34), A(paddle(L(.64) - L(.34), .06), river(L(.64) - L(.34), .04))); put(SFX, L(.36), horn(1.4, .05))
put(SFX, L(.64), chuff(L(.94) - L(.64), .06)); put(SFX, L(.74), waves(L(.94) - L(.74), .05)); put(SFX, L(.94), hooves(J1 - L(.94), .05))
# Philadelphia: knocking, pry the lid, nails squeal, lid lifts
put(AMB, C[11], lp(noise(E - C[11]), 220) * .012); put(SFX, C[11] + .2, A(clack(.25), step(.1)))
put(SFX, C[11] + .6, pry(C[12] - C[11] - .5, .12)); put(SFX, C[12] + .2, A(creak(.6, .1), clunk(.3)))
put(SFX, C[12] + .8, A(bp(noise(1.2), 300, 2500) * .04, creak(1.4, .04)))
# score (original): respectful — low pulse of suspense, warm piano for Henry, a lifted resolution
put(MUS, 0, drone(NOTE(41), C[1], .04, 300))
for k in range(int(C[1] / .5)): put(MUS, .5 + k * .5, pulse(NOTE(53 + (k % 4 == 3) * 3), .14, .03))
put(MUS, C[1], pad([NOTE(53), NOTE(56), NOTE(60)], C[4] - C[1], .03, 900))
for k in range(int((C[4] - C[1]) / .6)): put(MUS, C[1] + .3 + k * .6, pulse(NOTE(41), .16, .03))
put(MUS, C[4], A(drone(NOTE(36), C[7] - C[4], .05, 240))); put(MUS, C[5], string(NOTE(60), C[7] - C[5], .025))
put(MUS, C[7] - .2, hit(.2))
put(MUS, C[8], pad([NOTE(49), NOTE(53), NOTE(56)], C[10] - C[8], .035, 800))
for i, n in enumerate([65, 63, 61, 60, 58]): put(MUS, C[8] + .5 + i * 1.1, piano(NOTE(n), 2.4, .05))
put(MUS, C[10], pad([NOTE(53), NOTE(57), NOTE(60)], C[11] - C[10], .035, 1200))
for k in range(int((C[11] - C[10]) / .4)): put(MUS, C[10] + k * .4, pulse(NOTE(53 + [0, 4, 7, 12][k % 4]), .14, .03))
put(MUS, C[11], drone(NOTE(41), C[12] - C[11], .04, 300)); put(MUS, C[12] - 1.4, riser(1.4, .06, 150, 1400))
put(MUS, C[12], pad([NOTE(53), NOTE(57), NOTE(60), NOTE(65)], E - C[12], .05, 1800))
for i, n in enumerate([72, 77, 81, 84, 81, 77, 81, 72]): put(MUS, C[12] + .3 + i * .7, piano(NOTE(n), 2.2, .06))
put(MUS, C[12] + .4, string(NOTE(65), E - C[12] - .4, .03))
mix = master(MUS, SFX, AMB, vo('boxbrown'), ROOT / 'public/yw5-boxbrown-sound')
print('boxbrown bed', float(np.abs(mix).max()), lufs(mix))
