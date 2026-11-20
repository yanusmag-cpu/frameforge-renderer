#!/usr/bin/env python3
"""Seffner sinkhole — original synthesized sound design + score + dry narration. Respectful: no screams, no impact sounds on a person."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from audio_common import *   # noqa: F401,F403
C = CUES['sinkhole']; E = 60.0; END_A = C[1] - .35
# cold open: bedroom at night — AC hum, crickets outside, lamp; rumble, rattle, cracks, collapse, CUT TO BLACK (hard silence)
put(AMB, 0, lp(noise(END_A), 120) * .02 + np.sin(2 * np.pi * 60 * T(END_A)) * .004); put(AMB, 0, crickets(END_A, .02))
put(SFX, 1.3, rumble(END_A - 1.3, .25)); put(SFX, 1.6, A(*[clack(.06)])); put(SFX, 2.0, crackle(1.4, 45, .08)); put(SFX, 2.4, A(clack(.12), tick(.15)))
put(SFX, 3.5, A(crumble(END_A - 3.5, .4), sub(.9, 30, END_A - 3.4), clunk(.4)))
# exterior: night crickets, distant road
put(AMB, END_A + .4, crickets(C[2] - END_A, .035)); put(AMB, END_A + .4, lp(noise(C[2] - END_A), 300) * .015)
# hallway: TV murmur, footsteps; the crash; dust settling
put(AMB, C[2], tv(C[3] - C[2], .015)); put(AMB, C[2], crickets(C[3] - C[2], .012))
for k in range(4): put(SFX, C[2] + .1 + k * .42, step(.07))
put(SFX, C[2] + 1.7, A(crumble(1.6, .45), sub(.7, 32, 1.4), clunk(.3))); put(SFX, C[2] + 2.4, crackle(2.0, 20, .04))
for k in range(int((C[3] + (C[4] - C[3]) * .5 - C[3]) / .2)): put(SFX, C[3] + k * .2, step(.12))
put(SFX, C[3] + (C[4] - C[3]) * .5, A(lp(noise(1.2), 400) * .05))
put(SFX, C[4], A(crumble(2.0, .12), lp(noise(C[6] - C[4]), 220) * .03))
for k in range(int((C[6] - C[5]) / .38)): put(SFX, C[5] + .1 + k * .38, A(lp(noise(.18), 900) * env(.18, .005, .12) * .12))
put(SFX, C[6] + .2, A(crumble(1.4, .3), rumble(1.5, .15))); put(SFX, C[6] + .5, static(.6, .04)); put(SFX, C[6] + 1.6, A(step(.12), step(.1)))
# how the ground vanishes: deep tone, rain, drips; the collapse
put(SFX, C[7], whoosh(1.0, .08)); put(AMB, C[8], A(bp(noise(C[10] - C[8]), 1500, 6000) * .025))
for k in range(18): put(SFX, C[8] + .2 + k * .28, drip(.04))
put(SFX, C[9] + 1.4, A(rumble(2.2, .3), crumble(2.0, .3), sub(.7, 30, 2.0)))
# rescue: sirens far, radio, idling engines — then quiet
put(SFX, C[10], siren(C[11] - C[10], .05)); put(AMB, C[10], engine(C[11] - C[10], .04, 2.2)); put(SFX, C[10] + 1.5, static(.5, .03))
put(AMB, C[11], crickets(E - C[11], .02)); put(AMB, C[11], wind(E - C[11], .03))
# score (original): music box lullaby for the hook, then low suspense, simple somber piano at the end
for i, n in enumerate([76, 79, 83, 79, 76, 74]): put(MUS, .2 + i * .28, piano(NOTE(n), 1.2, .035))
put(MUS, 1.3, drone(NOTE(33), END_A - 1.3, .06, 220))
put(MUS, END_A + .5, pad([NOTE(45), NOTE(48), NOTE(52)], C[2] - END_A - .5, .03, 700))
put(MUS, C[2], drone(NOTE(33), C[4] - C[2], .04, 240)); put(MUS, C[2] + 1.7, hit(.35))
for k in range(int((C[7] - C[4]) / .55)): put(MUS, C[4] + k * .55, pulse(NOTE(33), .2, .035))
put(MUS, C[4], string(NOTE(57), C[7] - C[4], .025))
put(MUS, C[7], pad([NOTE(45), NOTE(52), NOTE(57)], C[10] - C[7], .03, 900)); put(MUS, C[9] + 1.2, hit(.3))
put(MUS, C[10], pad([NOTE(45), NOTE(48), NOTE(52), NOTE(57)], E - C[10], .04, 800))
for i, n in enumerate([69, 64, 60, 64, 72, 71, 69, 64]): put(MUS, C[10] + .3 + i * 1.1, piano(NOTE(n), 2.8, .055))
mix = master(MUS, SFX, AMB, vo('sinkhole'), ROOT / 'public/yw4-sinkhole-sound')
print('sinkhole bed', float(np.abs(mix).max()), lufs(mix))
