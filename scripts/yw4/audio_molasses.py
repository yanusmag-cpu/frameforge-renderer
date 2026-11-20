#!/usr/bin/env python3
"""Great Molasses Flood — original synthesized sound design + score + dry narration."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from audio_common import *   # noqa: F401,F403
C = CUES['molasses']; E = 60.0; T0 = C[5] + 1.3
# 1919 street at lunchtime: crowd, hooves, distant bell, harbour gulls-ish whistle
put(AMB, 0, crowd(C[2], .05)); put(AMB, C[2], crowd(T0 - C[2], .05)); put(AMB, 0, hooves(C[1], .05)); put(SFX, .6, bell(.12, 262))
for k in range(5): put(SFX, .1 + k * .45, step(.08))
# hook: metallic crack, then the wave's roar coming at us
put(SFX, 1.85, A(rivet(.35), clunk(.3), groan(.8, .08, 90))); put(SFX, 2.3, gloop(C[2] - 2.3, .25)); put(SFX, 2.6, rumble(C[2] - 2.6, .3)); put(SFX, 3.2, crowd(1.4, .1))
put(SFX, C[2] - .3, whoosh(.3, .15))
# the tank: creaks, leaks dripping, rivets popping like gunfire, the burst
put(SFX, C[3], groan(C[5] - C[3], .05, 45))
for k in range(8): put(SFX, C[4] + .3 + k * .5, drip(.05))
for k in range(int((T0 - C[5]) / .11)): put(SFX, C[5] + .1 + k * .11 + (k % 3) * .02, rivet(.18 + .02 * (k % 4)))
put(SFX, T0, A(boom(.25), sub(.9, 34, 2.4), crumble(2.0, .35), clunk(.5))); put(SFX, T0 + .1, gloop(C[8] - T0, .32))
# the wave through the streets: crushed wood, twisted steel, crowd screams kept low and distant
put(SFX, C[6], rumble(C[8] - C[6], .28)); put(SFX, C[6] + .5, crowd(2.5, .08))
for k in range(4): put(SFX, C[7] + .2 + k * .6, A(crumble(.8, .22), clunk(.3)))
put(SFX, C[7] + .4, A(groan(2.2, .15, 38), creak(2, .12)))
# thickening: slow viscous creaks, cold wind; sticky movements
put(SFX, C[8], gloop(C[10] - C[8], .12)); put(AMB, C[8], wind(E - C[8], .05))
put(SFX, C[9] + .3, A(creak(1.5, .06), gloop(2.5, .08)))
# rescue: splashy wading, voices, a whistle
for k in range(10): put(SFX, C[10] + .2 + k * .4, A(gloop(.35, .07)))
put(SFX, C[10] + .5, whistle(.6, .05)); put(AMB, C[10], crowd(C[11] - C[10], .04))
# dusk + harbour
put(AMB, C[11], waves(E - C[11], .05)); put(SFX, C[12] + 1, bell(.08, 196))
# score (original): bright ragtime-ish piano for 1919, then low strings, somber ending
for i, n in enumerate([67, 71, 74, 79, 76, 74, 71, 72, 74, 71]): put(MUS, .1 + i * .2, piano(NOTE(n), .5, .05))
put(MUS, 1.85, hit(.5)); put(MUS, 2.2, drone(NOTE(36), C[2] - 2.2, .06, 280))
for i, n in enumerate([60, 64, 67, 72, 67, 64, 65, 69, 72, 69, 67, 64]): put(MUS, C[2] + .1 + i * .3, piano(NOTE(n), .9, .05))
put(MUS, C[3], pad([NOTE(48), NOTE(51), NOTE(55)], T0 - C[3], .035, 800)); put(MUS, C[4], string(NOTE(60), T0 - C[4], .03))
for k in range(int((T0 - C[5]) / .25)): put(MUS, C[5] + k * .25, pulse(NOTE(36), .1, .04))
put(MUS, T0, hit(.5))
for k in range(int((C[8] - T0) / .36)): put(MUS, T0 + .2 + k * .36, tom(55 if k % 4 else 43, .18))
put(MUS, T0, brass([NOTE(36), NOTE(43)], C[8] - T0, .05)); put(MUS, C[7] - 1.2, riser(1.2, .08))
put(MUS, C[8], drone(NOTE(36), C[10] - C[8], .05, 250)); put(MUS, C[8], string(NOTE(55), C[10] - C[8], .03))
put(MUS, C[10], pad([NOTE(48), NOTE(55), NOTE(60)], C[11] - C[10], .04, 1100))
put(MUS, C[11], pad([NOTE(45), NOTE(52), NOTE(57)], E - C[11], .045, 900))
for i, n in enumerate([69, 64, 60, 57, 64, 69, 72, 69]): put(MUS, C[11] + .3 + i * .9, piano(NOTE(n), 2.6, .06))
mix = master(MUS, SFX, AMB, vo('molasses'), ROOT / 'public/yw4-molasses-sound')
print('molasses bed', float(np.abs(mix).max()), lufs(mix))
