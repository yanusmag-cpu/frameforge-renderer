#!/usr/bin/env python3
"""Lake Peigneur — original synthesized sound design + score + dry narration. Events follow the shot timing (cues)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from audio_common import *   # noqa: F401,F403
C = CUES['peigneur']; E = 60.0
# ambience: open lake (birds-ish chirps from bright noise, lapping water), wind
put(AMB, 0, waves(C[2], .05)); put(AMB, C[2], waves(C[3] - C[2], .04)); put(AMB, C[2], A(*[lp(chime(.03), 3000)]))
put(AMB, 0, wind(E, .03))
# hook: water starts turning → swirl roar builds; rig creaks; deck lurch
put(SFX, .8, roar(C[1] - .6, .05)); put(SFX, 2.2, groan(2.5, .06, 48)); put(SFX, 3.6, A(clunk(.2), creak(1.2, .08))); put(SFX, 3.8, rumble(C[1] - 3.6, .25))
for k in range(9): put(SFX, C[1] + .1 + k * .24, step(.09))
put(SFX, C[1], roar(C[2] - C[1], .14)); put(SFX, C[1] + .4, splash(.5, 1.2)); put(SFX, C[2] - .25, whoosh(.3, .2))
# flashback: calm; birds; drill motor hum
put(AMB, C[2], lp(noise(C[4] - C[2]), 200) * .02)
put(SFX, C[4], engine(C[5] - .8 - C[4], .07, 5.2)); put(SFX, C[4] + 1.6, A(groan(1.4, .1, 70), clunk(.35))); put(SFX, C[4] + 2.3, thump(.4))
put(SFX, C[5] - .1, A(sub(.6, 38, 1.6), crumble(1.2, .25)))
# water rushing into the mine, salt crumbling
put(SFX, C[5] + .3, A(lp(noise(C[7] - C[5]), 900) * .12))
for k in range(6): put(SFX, C[6] + .4 + k * .45, crumble(.6, .12))
put(AMB, C[6], A(bp(noise(C[6] + (C[7] - C[6]) * .55 - C[6]), 300, 3000) * .05))
# the crater, the whirlpool swallowing the rig, barges, trees; rig tears & falls
put(SFX, C[7], roar(C[9] - C[7], .22)); put(SFX, C[7], rumble(C[9] - C[7], .3)); put(SFX, C[8] + .5, A(groan(2.5, .14, 40), creak(2, .12)))
for k in range(5): put(SFX, C[8] + .8 + k * .7, A(clunk(.25), splash(.4, .8)))
put(SFX, C[9] - 1.2, A(crumble(1.6, .3), sub(.5, 36, 2)))
# the waterfall
put(SFX, C[9], A(lp(noise(C[12] - C[9]), 1800) * .14, bp(noise(C[12] - C[9]), 2000, 7000) * .05))
# relief + crowd murmur on the bank
put(AMB, C[11], crowd(C[12] - C[11], .05))
# score (original): D minor ostinato building to the whirlpool, open D major for the escape, calm resolution
put(MUS, 0, drone(NOTE(38), C[1], .05, 300)); put(MUS, C[1] - .3, hit(.4))
for k in range(int((C[1] - 0) / .45)): put(MUS, .9 + k * .45, pulse(NOTE(50 + (k % 4 == 3) * 3), .14, .035))
put(MUS, C[2], pad([NOTE(62), NOTE(66), NOTE(69)], C[3] - C[2], .04, 1400))                       # bright flashback
for i, n in enumerate([74, 76, 78, 81, 78, 76]): put(MUS, C[2] + .4 + i * .6, piano(NOTE(n), 1.6, .05))
put(MUS, C[3], pad([NOTE(50), NOTE(53), NOTE(57)], C[5] - C[3], .035, 900))
for k in range(int((C[7] - C[5]) / .38)): put(MUS, C[5] + k * .38, pulse(NOTE(38 + (k % 8 == 7) * 5), .16, .045))
put(MUS, C[5] + .6, string(NOTE(62), C[7] - C[5], .03))
for k in range(int((C[10] - C[7]) / .375)): put(MUS, C[7] + k * .375, tom(55 if k % 4 else 45, .18 + .002 * k))
put(MUS, C[7], string(NOTE(57), C[10] - C[7], .035)); put(MUS, C[8], brass([NOTE(50), NOTE(57)], C[10] - C[8], .05)); put(MUS, C[9] - 1.6, riser(1.6, .1, 120, 1600))
put(MUS, C[10], hit(.3)); put(MUS, C[10], drone(NOTE(38), C[11] - C[10], .04, 260))
put(MUS, C[11], pad([NOTE(62), NOTE(66), NOTE(69), NOTE(74)], E - C[11], .05, 1600))
for i, n in enumerate([74, 78, 81, 86, 81, 78, 81, 74]): put(MUS, C[11] + .2 + i * .7, piano(NOTE(n), 2.2, .06))
put(MUS, C[12], string(NOTE(62), E - C[12], .03))
mix = master(MUS, SFX, AMB, vo('peigneur'), ROOT / 'public/yw4-peigneur-sound')
print('peigneur bed', float(np.abs(mix).max()), lufs(mix))
