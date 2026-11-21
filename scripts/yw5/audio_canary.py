#!/usr/bin/env python3
"""Why Miners Carried Oxygen for Birds — original synthesized SFX + score + dry narration, locked to the shot timing."""
import sys; from pathlib import Path; sys.path.insert(0, str(Path(__file__).parent))
from audio_common import *   # noqa: F401,F403
C = CUES['canary']; E = 60.0
mine = [(0, C[5]), (C[7], E)]
for a, b in mine:
    put(AMB, a, A(airflow(b - a, .035), lp(noise(b - a), 90) * .04))
    R = np.random.default_rng(int(a)); [put(AMB, a + t0, drip(.03), pan=R.uniform(-.6, .6)) for t0 in R.uniform(0, b - a, int((b - a) * .8))]
    [put(AMB, a + t0, clink(.025), pan=R.uniform(-.7, .7)) for t0 in R.uniform(0, b - a, int((b - a) * .3))]   # distant picks
def walk(a, b, g=.07, rate=1.65, n=2):
    for j in range(n):
        for k in range(int((b - a) * rate)): put(SFX, a + k / rate + j * .23, step(g, 85 + j * 12), pan=(j - .5) * .3)
# hook: boots on the roadway, lamp creak, a little bird chirps; push-in on the tank (tiny hiss)
walk(0, C[1]); put(SFX, .4, song(2.0, .03)); put(SFX, 1.2, creak(.5, .03)); put(SFX, C[1] - 1.1, A(hiss(.5, .03), clink(.08)))
# the cage, part by part: metal tap, glass tap, little door squeak, cylinder clank
d = C[2] - C[1]
for i, s in enumerate([clink(.1), A(glass(.05)), creak(.35, .05), A(clunk(.2), clink(.1))]): put(SFX, C[1] + d * (.05 + i * .22), s)
# why? — the bird hops and chirps
put(SFX, C[2] + .4, chirp(.05)); put(SFX, C[2] + (C[3] - C[2]) * .55, song(C[3] - C[2] - .8, .045))
# no smell, no colour, no taste — walking deeper
walk(C[3], C[4], .06, n=3)
# carbon monoxide: the x-ray view — a low tonal swell, the men keep working (picks)
put(SFX, C[4] + .2, A(lp(noise(C[5] - C[4]), 400) * .03 * gate(C[5] - C[4], 1.2, .6)))
for k in range(5): put(SFX, C[4] + .8 + k * .9, clink(.09))
# Wales 1896: evening pithead — wind, winding engine, a distant colliery bell
put(AMB, C[5], A(wind(C[7] - C[5], .05), engine(C[7] - C[5], .04, 1.2))); put(SFX, C[5] + .5, bell(.05, 392)); walk(C[5], C[5] + 2.6, .05, 1.4, 1)
put(SFX, C[6] + .5, A(creak(.4, .04), chirp(.04)))
# fast breathing: quick tiny breaths and thin chirps
for k in range(int((C[8] - C[7]) * 4)): put(SFX, C[7] + k * .25, bp(noise(.12), 2000, 6000) * env(.12, .02, .05) * .03)
# the bird wobbles… drops — a thump on the cage floor — boots running
T1 = wt('canary', 'dropped', 1, C[8] + 1.6) + .05
put(SFX, C[8] + .3, chirp(.03, 2600)); put(SFX, T1, A(clunk(.12), thump(.08))); put(SFX, T1 + .35, whoosh(.3, .15))
for k in range(int((C[9] - T1 - .35) * 4)): put(SFX, T1 + .4 + k * .25, step(.11, 95 + (k % 3) * 8), pan=((k % 3) - 1) * .3)
# rescue teams: heavier boots, equipment clank, shaft-bottom hum
walk(C[9], C[10], .08, 1.5, 3); put(SFX, C[9], chain(C[10] - C[9], .03)); put(AMB, C[9], lp(noise(C[10] - C[9]), 200) * .03)
# shut the door, open the valve: latch click, valve squeak, oxygen hiss
SHUT, VALVE = wt('canary', 'shut', 1, C[10] + 1.4), wt('canary', 'valve', 1, C[10] + 3); put(SFX, SHUT + .3, A(clack(.25), clink(.08))); put(SFX, VALVE, creak(.4, .05)); put(SFX, VALVE + .3, hiss(C[11] - VALVE + 1.2, .07))
# oxygen floods in… the bird revives and sings
d = C[12] - C[11]; put(SFX, C[11], hiss(d * .5, .05)); put(SFX, C[11] + d * .55, chirp(.03)); put(SFX, C[11] + d * .7, song(C[12] - C[11] - d * .7, .05))
# until 1986: walking on, the bird singing all the way
walk(C[12], E - .4); put(SFX, C[12], song(E - C[12] - .6, .04))
# score (original): dark low drone, tense pulse with the gas, music-box lift on the revival, warm close
put(MUS, 0, drone(NOTE(40), C[2], .04, 260)); put(MUS, C[1] - .4, A(hit(.15)))
put(MUS, C[2], pad([NOTE(64), NOTE(67), NOTE(71)], C[3] - C[2], .025, 1200))
put(MUS, C[3], pad([NOTE(40), NOTE(43), NOTE(47)], C[5] - C[3], .035, 600)); put(MUS, C[4], drone(NOTE(28), C[5] - C[4], .05, 200))
for k in range(int((C[5] - C[4]) / .5)): put(MUS, C[4] + k * .5, pulse(NOTE(40 + (k % 4 == 3)), .15, .03))
put(MUS, C[5], pad([NOTE(52), NOTE(55), NOTE(59)], C[7] - C[5], .035, 1000))
for i, n in enumerate([64, 67, 71, 76]): put(MUS, C[6] + .2 + i * .5, piano(NOTE(n), 1.8, .05))
put(MUS, C[7], drone(NOTE(40), C[9] - C[7], .04, 260))
for k in range(int((C[9] - C[7]) / .4)): put(MUS, C[7] + k * .4, pulse(NOTE(52 + (k % 2) * 3), .13, .03 + .002 * k))
put(MUS, T1 - .1, hit(.3)); put(MUS, C[9], A(string(NOTE(52), C[11] - C[9], .03))); put(MUS, C[10], riser(C[11] - C[10], .05, 120, 1400))
put(MUS, C[11], pad([NOTE(64), NOTE(68), NOTE(71), NOTE(76)], E - C[11], .045, 1600))
for i, n in enumerate([76, 80, 83, 88, 83, 80, 83, 88, 92]): put(MUS, C[11] + .5 + i * .6, piano(NOTE(n), 1.8, .05))
put(MUS, C[12], string(NOTE(64), E - C[12], .03))
mix = master(MUS, SFX, AMB, vo('canary'), ROOT / 'public/yw5-canary-sound')
print('canary bed', float(np.abs(mix).max()), lufs(mix))
