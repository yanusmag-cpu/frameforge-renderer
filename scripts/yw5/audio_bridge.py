#!/usr/bin/env python3
"""Why Soldiers Break Step — original synthesized SFX + score + dry narration. Footsteps lock to the on-screen march (1.9 steps/s)."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from audio_common import *   # noqa: F401,F403
C = CUES['bridge']; E = 60.0; STEP = 1.9
def march(a, b, g=.11, synced=True, n=8):
    """Column footfalls: synced = one heavy tramp per beat; out of step = scattered softer steps."""
    R = np.random.default_rng(int(a * 10))
    for k in range(int((b - a) * STEP)):
        t0 = a + k / STEP
        if synced: put(SFX, t0, A(step(g, 80), thump(g * .5)))
        else:
            for j in range(n): put(SFX, t0 + R.uniform(0, 1 / STEP), step(g * .35, 90 + R.uniform(0, 40)), pan=R.uniform(-.4, .4))
river_all = river(E, .05); put(AMB, 0, river_all); put(AMB, 0, wind(E, .02))
# hook: tramp, tramp… the deck answers with creaks that grow with the bounce
march(0, C[1], .1); put(SFX, 1.2, creak(1.5, .05)); put(SFX, 2.8, A(creak(1.8, .09), chain(1.8, .05)))
march(C[1], C[2], .12)
for k in range(int((C[2] - C[1]) * STEP)): put(SFX, C[1] + k / STEP + .25, creak(.45, .05 + .01 * (k % 3)))
put(SFX, C[1], chain(C[2] - C[1], .07))
# establishing: wide, distant tramp, mill ambience
march(C[2], C[3], .05); put(AMB, C[2], lp(noise(C[3] - C[2]), 160) * .03); put(SFX, C[2] + 1, chain(C[3] - C[2] - 1, .04))
# the crack: bolt snaps, chains whip, deck drops, splash, shouts (crowd), debris
T1 = wt('bridge', 'crack', 1, C[3] + .9) - .08; march(C[3], T1, .12)
put(SFX, T1, A(clack(.5), glass(.08), rivet(.3))); put(SFX, T1 + .12, chain(1.2, .18)); put(SFX, T1 + .2, A(groan(1.2, .14, 45), creak(1.2, .14)))
put(SFX, T1 + .6, A(rumble(1.8, .3), crumble(1.6, .2))); put(SFX, T1 + 1.1, A(splash(.4, 1.4), splash(.6, 1.0))); put(SFX, T1 + 1.4, crowd(C[4] - T1 - 1.2, .07))
# how? — swimmers, water churn
put(SFX, C[4], A(bp(noise(C[5] - C[4]), 300, 2500) * .05 * gate(C[5] - C[4], .2, .6)))
for k in range(8): put(SFX, C[4] + .3 + k * .35, splash(1.5, .3))
# swing demo: creaky rope, random pushes (thuds out of time) → on-beat pushes (regular thuds), swing whoosh grows
put(AMB, C[5], lp(noise(C[8] - C[5]), 200) * .01)
for k in range(4): put(SFX, C[5] + .4 + k * .55, creak(.5, .04))
R = np.random.default_rng(2)
for k in range(5): put(SFX, C[6] + .3 + k * R.uniform(.4, .9), thump(.12))
mid = C[6] + (C[7] - C[6]) * .45
for k in range(int((C[7] - mid) / 1.2)): put(SFX, mid + k * 1.2, A(thump(.18), whoosh(.9, .05 + .02 * k)))
# seventy men, one beat: heavy synced tramp with the deck answering
march(C[7], C[8], .14)
for k in range(int((C[8] - C[7]) * STEP)): put(SFX, C[7] + k / STEP + .2, A(creak(.4, .07), chain(.3, .05)))
# the bolt close-up: strain, crack
put(SFX, C[8] + .3, groan(1.6, .06, 70)); put(SFX, C[8] + 1.8, A(clack(.4), rivet(.25))); put(SFX, C[8] + 3, creak(1.2, .05))
# on the bank: calm water, murmur
put(SFX, C[9], crowd(C[10] - C[9], .03))
# the order: officer's call (synth bark avoided — music hit), then out-of-step crossing
march(C[10], C[11], .12, synced=False); put(MUS, wt('bridge', 'break', 2, C[10] + 3), hit(.18))
march(C[11], E, .1, synced=False)
# score (original): martial snare pattern that tightens, a fall, swing-demo music box, firm resolution
for k in range(int(C[3] * STEP / 1)): t0 = k / STEP; put(MUS, t0, snare(.05 if k % 2 else .08))
put(MUS, 0, drone(NOTE(43), C[3] + .4, .04, 280)); put(MUS, C[1], brass([NOTE(55), NOTE(62)], C[3] - C[1], .03))
put(MUS, T1, hit(.4)); put(MUS, T1 + .3, drone(NOTE(31), C[5] - T1, .05, 200))
for i, n in enumerate([79, 83, 86, 83, 79, 83, 86, 91]): put(MUS, C[5] + .2 + i * .55, piano(NOTE(n), 1.4, .04))
put(MUS, C[6], pad([NOTE(55), NOTE(59), NOTE(62)], C[7] - C[6], .03, 1000)); put(MUS, mid, riser(C[7] - mid, .05, 150, 1500))
for k in range(int((C[8] - C[7]) * STEP)): put(MUS, C[7] + k / STEP, tom(50, .14))
put(MUS, C[8], pad([NOTE(43), NOTE(46), NOTE(50)], C[10] - C[8], .035, 700)); put(MUS, C[9], string(NOTE(55), C[10] - C[9], .025))
put(MUS, C[10], pad([NOTE(55), NOTE(59), NOTE(62), NOTE(67)], E - C[10], .045, 1500))
for i, n in enumerate([67, 71, 74, 79, 74, 71, 74, 79]): put(MUS, C[10] + .4 + i * .8, piano(NOTE(n), 2.0, .05))
put(MUS, C[11], string(NOTE(67), E - C[11], .03))
mix = master(MUS, SFX, AMB, vo('bridge'), ROOT / 'public/yw5-bridge-sound')
print('bridge bed', float(np.abs(mix).max()), lufs(mix))
