// YunoWorld v3 · Film 1 — "The Day an Entire Lake Disappeared" (Lake Peigneur, 20 Nov 1980). 60 s, cut to the narration cues.
import { STAND, idle, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { runPose } from '../../ff2d/moves.ts';
import { lerp, ss, kk, rng, type V3, type Cam, type Sprite, type ActorState } from '../../yw3/core.ts';
import { SET, SHORE, CANAL_A, type PFrame, type SetName } from './engine.ts';
import { CUES } from '../cues.ts';
import { card, chip, endCard } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.peigneur;                                   // narration start time of each sentence (s)
const HERO: Look = { outfit: 'hoodie', color: '#d8262b', pants: '#151515', hat: 'hardhat' };
const DRILLER: Look = { outfit: 'vest', color: '#f08a1c', pants: '#2b3a55', inner: '#3c6aa0', hat: 'hardhat', hiVis: true, beard: 'stubble' };
const MINER: Look = { outfit: 'jumpsuit', color: '#3a5f8a', pants: '#2c3e57', hat: 'hardhat', hiVis: true };
const W = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
const cam = (s: SetName, pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos: W(s, pos), look: W(s, look), fov, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: Look, s: SetName, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState => ({ id, look, pose: p, face, pos: W(s, pos), t, res: 1024, ...o });
const MORNING = { sky: { top: '#1f6fd0', hor: '#f7cf98', sun: [.55, .22, -.8] as V3 }, hemi: { sky: '#bfe0ff', ground: '#6f7a4a', i: 1.15 }, fog: { color: '#e9d2ad', density: .00028 } };
const SUN = (focus: V3, size: number, i = 3.4) => ({ dir: [.55, .32, -.8] as V3, color: '#ffe2b0', i, focus, size });
const VIVID = { sat: 1.2, contrast: 1.12, bloom: .22, bloomTh: 1.5, vignette: .26, exposure: .95 };
// deck point on the yawed rig (rig at the origin, deck top 2.4 m above the water when level)
const deck = (x: number, z: number, tilt = 0, yaw = .25): V3 => { const c = Math.cos(yaw), s = Math.sin(yaw); return [x * c + z * s, 2.4 + z * Math.sin(tilt) * .9 - x * Math.sin(tilt * .5) * .4, -x * s + z * c]; };
function spray(at: V3, n: number, k: number, seed: number, S: Sprite[], size = 3) { const R = rng(seed); for (let i = 0; i < n; i++) { const a = R() * 6.28, r = R() * size * 2;
  S.push({ p: [at[0] + Math.cos(a) * r, at[1] + R() * size * 1.5, at[2] + Math.sin(a) * r], s: size * (.4 + R() * .7), rot: R() * 6, c: [.95, .98, 1], a: .45 * k, kind: 3, seed: R(), age: R() * .5 }); } }

type S = { a: number; b: number; f: (t: number) => PFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => PFrame) => SH.push({ a, b, f });

// A — hook: on the rig deck the calm water starts to turn; the camera tilts down to the forming whirlpool
shot(0, C[1], t => { const sw = ss(.6, C[1], t); const look = ss(1.4, 2.6, t); const tilt = ss(3.2, C[1], t);
  const p = deck(15, -7.0); const cP: V3 = [lerp(p[0] - 2.6, p[0] - 1.0, tilt), lerp(4.4, 9.5, tilt), lerp(p[2] - 6.8, p[2] - 10, tilt)];
  const S: Sprite[] = []; if (sw > .5) spray([p[0] + 3, 0, p[2] - 18], 10, sw - .5, Math.floor(t * 8), S, 2.5);
  return { t, set: 'lake', ...MORNING, sun: SUN(p, 40), cam: cam('lake', cP, [lerp(p[0] + .8, p[0] + 2, tilt), lerp(3.9, -1.5, tilt), lerp(p[2], p[2] - 26, tilt)], lerp(38, 52, tilt), { roll: Math.sin(t * 1.3) * .006 }),
    lake: { swirl: sw * 2.2, r0: lerp(6, 18, sw), depth: lerp(0, 6, sw), foam: sw * .7, phase: Math.max(0, t - .6) * sw * 1.2 }, rig: { tilt: ss(3.6, C[1], t) * .03 }, sprites: S, shake: ss(3, C[1], t) * .05,
    actors: [act('hero', HERO, 'lake', p, pose({ turn: -.45, headTurn: .25 * look, headTilt: -.18 * look, handA: [-.85, -1.05], handB: [.9, -1.05], shapeA: 'hold', shapeB: 'hold', lean: .04 * look }, t, .5),
      look < .5 ? EXPR.curious : expr('confused', 'fear', ss(2.6, 3.6, t)), t, { rim: '#ffd59a', rimSide: 1 })],
    grade: { ...VIVID, fade: (1 - ss(0, .5, t)) * .5 } }; });
// B — the funnel beside the rig; the deck lurches, the hero runs for the walkway
shot(C[1], C[2], t => { const k = kk(t, C[1], C[2]); const run = (t - C[1]) * 4.4; const tl = .05 + k * .06;
  const p = deck(-6 + run, 6.8, tl); const S: Sprite[] = []; spray([8, 0, 22], 16, .8, Math.floor(t * 10), S, 3.5);
  return { t, set: 'lake', ...MORNING, sun: SUN([0, 0, 0], 90), cam: cam('lake', [lerp(-70, -48, k), lerp(46, 34, k), lerp(70, 60, k)], [6, -2, 10], 40, { roll: -.02 }),
    lake: { swirl: 3.2, r0: lerp(18, 26, k), depth: lerp(6, 12, k), foam: .9, phase: 4 + (t - C[1]) * 3 }, rig: { tilt: tl }, sprites: S, shake: .1,
    actors: [act('hero', HERO, 'lake', p, runPose(run, 1, { fear: 1 }), EXPR.terrified, t, { scale: 1.4 })], grade: { ...VIVID, whip: ss(C[2] - .25, C[2], t) * .8 } }; });
// C — SMASH CUT: flashback to the calm morning. Lake, island oaks, garden house, the rig on glassy water
shot(C[2], C[3], t => { const k = kk(t, C[2], C[3]);
  return { t, set: 'lake', ...MORNING, sun: SUN([-150, 0, -200], 520, 3.6), cam: cam('lake', [lerp(260, 210, k), lerp(70, 52, k), lerp(320, 270, k)], [-120, 4, -180], 42),
    lake: { swirl: 0, depth: 0, foam: 0 }, rig: {}, grade: { ...VIVID, flash: (1 - ss(C[2], C[2] + .18, t)) * .9, sat: 1.22 },
    overlay: card('LAKE PEIGNEUR', 'LOUISIANA · 20 NOVEMBER 1980', ss(C[2] + .3, C[2] + .8, t) * (1 - ss(C[3] - .4, C[3], t))) }; });
// D — the cutaway: a shallow lake sitting on top of a salt dome full of mine tunnels
shot(C[3], C[4], t => { const k = kk(t, C[3], C[4]);
  return { t, set: 'xsec', cam: cam('xsec', [lerp(70, 18, k), lerp(40, -92, k), lerp(150, 330, k)], [0, lerp(-12, -108, k), 0], lerp(40, 42, k)), xs: { drill: .02 },
    hemi: { sky: '#cfe6ff', ground: '#6b5236', i: 1.4 }, sun: SUN(W('xsec', [0, -80, 30]), 160, 2.6), bg: '#0f1a2a', grade: { ...VIVID, vignette: .35 },
    overlay: chip('LAKE · ONLY 10 FT DEEP', 540, 330, ss(C[3] + .4, C[3] + .8, t)) + chip('SALT MINE BELOW', 540, 1340, ss(C[3] + 1.6, C[3] + 2.0, t), '#ffd23f') }; });
// E — on the drill floor: the spinning pipe binds and stops; the driller's face says everything
shot(C[4], C[5] - .8, t => { const k = kk(t, C[4], C[5]); const stall = ss(C[4] + 1.5, C[4] + 2.4, t); const p = deck(-2, 5.4); const cp = deck(lerp(-7.5, -6.5, k), lerp(11.5, 10.5, k)), lk = deck(1, 3);
  return { t, set: 'lake', ...MORNING, sun: SUN(p, 20), cam: cam('lake', [cp[0], 4.4, cp[2]], [lk[0], 3.9, lk[2]], 40),
    lake: {}, rig: { drill: t * (1 - stall * .9) }, shake: stall * .03 * (1 - ss(C[4] + 2.4, C[4] + 3, t)),
    actors: [act('driller', DRILLER, 'lake', p, pose({ turn: .45, handA: [.75, -.95], handB: [.95, -1.05], shapeA: 'hold', shapeB: 'hold', lean: -.12 * stall, headLift: .06 * stall, headTurn: -.55 * stall }, t, .6, 8),
      expr('focused', 'shocked', stall), t, { rim: '#ffe2b0', rimSide: -1 })], grade: VIVID, overlay: chip('DRILL STUCK · ~1,200 FT DOWN', 540, 1260, ss(C[4] + 2.2, C[4] + 2.6, t)) }; });
// F — back in the cutaway: the bit is right inside a mine room
shot(C[5] - .8, C[6], t => { const k = kk(t, C[5] - .8, C[6]); const d = ss(C[5] - .8, C[5] + .6, t);
  return { t, set: 'xsec', cam: cam('xsec', [lerp(30, 10, k), lerp(-140, -160, k), lerp(300, 250, k)], [0, -160, 20], 36), xs: { drill: lerp(.72, 1, d), flood: ss(C[5] + .3, C[6], t) * .2 },
    hemi: { sky: '#cfe6ff', ground: '#6b5236', i: 1.4 }, sun: SUN(W('xsec', [0, -60, 30]), 120, 2.4), bg: '#0f1a2a', shake: ss(C[5] - .1, C[5] + .2, t) * (1 - ss(C[5] + .3, C[5] + .8, t)) * .2, grade: { ...VIVID, vignette: .38 },
    overlay: chip('IT PUNCHED INTO THE MINE', 540, 1240, ss(C[5], C[5] + .4, t), '#ff5a3c') }; });
// G — inside the mine: water floods the floor between the salt pillars; then the cutaway shows pillars melting
shot(C[6], C[6] + (C[7] - C[6]) * .55, t => { const k = kk(t, C[6], C[7]); const run = (t - C[6]) * 3.6; const S: Sprite[] = []; const R = rng(Math.floor(t * 14));
  for (let i = 0; i < 14; i++) S.push({ p: W('mine', [(R() - .5) * 26, .3 + R() * .5, -20 - R() * 70]), s: .8 + R(), rot: R() * 6, c: [.85, .95, 1], a: .35, kind: 3, seed: R(), age: R() });
  return { t, set: 'mine', cam: cam('mine', [lerp(-6, -4, k), 2.2, lerp(14, 8, k)], [2, 3, -40], 50), mineWater: .05 + ss(C[6], C[7], t) * .25, bg: '#111',
    hemi: { sky: '#fff1d6', ground: '#8a7f70', i: 1.1 }, lights: [{ p: W('mine', [0, 20, 0]), c: [1, .85, .6], i: 60, d: 40 }, { p: W('mine', [0, 20, -30]), c: [1, .85, .6], i: 60, d: 40 }, { p: W('mine', [0, 20, -60]), c: [1, .85, .6], i: 50, d: 40 }],
    sprites: S, actors: [act('m1', MINER, 'mine', [-2 + Math.sin(t) * .1, .2, -6 + run * .2], pose({ turn: -.2, headTurn: -.4, handA: [-.7, -1.6], shapeA: 'point' }, t, .5, 4), EXPR.shocked, t, { scale: 1, rim: '#ffd9a0' }),
      act('m2', { ...MINER, color: '#c4532c' }, 'mine', [3, .2, -12], pose({ turn: .3, handB: [.6, -.4] }, t, .5, 9), EXPR.worried, t, { rim: '#ffd9a0' })],
    grade: { ...VIVID, exposure: 1.05 } }; });
shot(C[6] + (C[7] - C[6]) * .55, C[7], t => { const k = kk(t, C[6], C[7]);
  return { t, set: 'xsec', cam: cam('xsec', [lerp(30, 10, k), -120, lerp(300, 280, k)], [0, -130, 20], 40), xs: { drill: 1, flood: .25 + k * .55, pillars: ss(C[6] + (C[7] - C[6]) * .6, C[7], t) },
    hemi: { sky: '#cfe6ff', ground: '#6b5236', i: 1.4 }, sun: SUN(W('xsec', [0, -60, 30]), 140, 2.4), bg: '#0f1a2a', grade: { ...VIVID, vignette: .36 },
    overlay: chip('SALT PILLARS DISSOLVING', 540, 1300, ss(C[6] + (C[7] - C[6]) * .62, C[6] + (C[7] - C[6]) * .62 + .4, t), '#4cc3e6') }; });
// H — the crater opens; the lake drains like a bathtub (high aerial)
shot(C[7], C[8], t => { const k = kk(t, C[7], C[8]); const S: Sprite[] = []; spray([0, 0, 0], 20, 1, Math.floor(t * 9), S, 7);
  return { t, set: 'lake', ...MORNING, sun: SUN([0, 0, 0], 300), cam: cam('lake', [lerp(-40, 40, k), lerp(330, 280, k), lerp(220, 170, k)], [0, -20, 0], 44, { roll: k * .08 }),
    lake: { swirl: 3.6, r0: lerp(26, 60, k), depth: lerp(12, 38, k), foam: 1, level: -k * 1.2, phase: 8 + (t - C[7]) * 3.6 }, rig: { tilt: .14, sink: k * 4 }, barges: k * .25, tug: k * .2, sprites: S, shake: .03, grade: VIVID }; });
// I — the whirlpool takes the rig, a tug, eleven barges and part of Jefferson Island (low, dramatic)
shot(C[8], C[9], t => { const k = kk(t, C[8], C[9]); const S: Sprite[] = []; spray([0, -14 * k, 0], 26, 1, Math.floor(t * 12), S, 6); spray([-60, 0, -60], 8, k, Math.floor(t * 7) + 99, S, 4);
  return { t, set: 'lake', ...MORNING, sun: SUN([0, 0, 0], 220), cam: cam('lake', [lerp(150, 120, k), lerp(9, 14, k), lerp(110, 90, k)], [0, lerp(8, -10, k), 0], 46, { roll: -.03 }),
    lake: { swirl: 4.2, r0: lerp(60, 85, k), depth: lerp(38, 55, k), foam: 1, level: -1.2 - k * 2.4, phase: 20 + (t - C[8]) * 4 }, rig: { tilt: lerp(.14, .8, k), sink: lerp(4, 60, k * k), yaw: .25 + k * 1.4 }, barges: lerp(.25, 1, k), tug: lerp(.2, 1, k),
    sprites: S, shake: .12, grade: VIVID, overlay: chip('RIG · TUG · 11 BARGES · PART OF AN ISLAND', 540, 1300, ss(C[8] + .4, C[8] + .8, t)) }; });
// J — a canal from the sea flows backwards: a 164-foot waterfall pours into the crater
shot(C[9], C[10], t => { const k = kk(t, C[9], C[10]); const S: Sprite[] = []; const fx = Math.cos(CANAL_A) * 140, fz = Math.sin(CANAL_A) * 140; spray([fx * .92, -28, fz * .92], 30, 1, Math.floor(t * 10), S, 6);
  return { t, set: 'lake', ...MORNING, sun: SUN([fx, -20, fz], 140), cam: cam('lake', [-fx * lerp(.95, .8, k), lerp(-4, -10, k), -fz * lerp(.95, .8, k)], [fx, lerp(-16, -22, k), fz], 46),
    rig: { gone: true }, barges: 1, tug: 1, lake: { swirl: 2.6, r0: 30, depth: 6, foam: 1, level: -28, phase: 40 + (t - C[9]) * 3 }, fall: ss(C[9], C[9] + .6, t), sprites: S, grade: VIVID, overlay: chip('WATERFALL · 164 FT', 540, 1250, ss(C[9] + .6, C[9] + 1, t), '#4cc3e6') }; });
// K — "here's the incredible part": on the shore, the hero turns from terror to disbelief to relief
shot(C[10], C[11], t => { const k = kk(t, C[10], C[11]); const p: V3 = SHORE;
  return { t, set: 'lake', ...MORNING, sun: SUN(p, 30), cam: cam('lake', [p[0] + lerp(3.4, 2.6, k), 3.9, p[2] + lerp(3.6, 2.8, k)], [p[0] - .8, 3.4, p[2] - 2], 38),
    rig: { gone: true }, barges: 1, tug: 1, lake: { swirl: 2.2, r0: 30, depth: 6, foam: .8, level: -28, phase: 50 + t }, fall: 1, actors: [act('hero', HERO, 'lake', p, pose({ turn: .35, headTurn: -.4, handA: [-.45, -.55], handB: [.4, -.95] }, t, .7), expr('terrified', 'amazed', k), t, { rim: '#ffd59a', rimSide: -1 })],
    grade: VIVID }; });
// L — everybody got out: rig crew on the bank, miners out of the shaft
shot(C[11], C[12], t => { const k = kk(t, C[11], C[12]); const crew: ActorState[] = []; for (let i = 0; i < 7; i++) crew.push(act('c' + i, i ? { ...DRILLER, color: ['#f08a1c', '#e2c23a', '#3c8fd8'][i % 3] } : HERO, 'lake', [SHORE[0] - 3.6 + i * 1.2, SHORE[1], SHORE[2] - 1 + (i % 2) * 1.1],
    pose({ turn: -.2 + (i % 3) * .2, handA: i % 2 ? [-.9, -1.9] : [-.6, -1], handB: [.7, -1.0 - (i % 3) * .4] }, t + i, .8, i + 2), i % 2 ? EXPR.relief : EXPR.exhausted, t, { rim: '#ffd59a' }));
  return { t, set: 'lake', ...MORNING, sun: SUN(SHORE, 40), cam: cam('lake', [SHORE[0] + lerp(-1.5, 1.5, k), 4.6, SHORE[2] - lerp(9.5, 8.5, k)], [SHORE[0], 3.4, SHORE[2]], 40),
    rig: { gone: true }, barges: 1, tug: 1, lake: { swirl: 2.2, r0: 30, depth: 6, foam: .7, level: -28, phase: 50 + t }, fall: 1, actors: crew,
    overlay: chip('7 RIG CREW · ESCAPED', 540, 1150, ss(C[11] + .3, C[11] + .6, t), '#5fd16f') + chip('55 MINERS · ESCAPED', 540, 1260, ss(C[11] + 1.8, C[11] + 2.1, t), '#5fd16f') }; });
// M — the lake refilled… with salt water from the Gulf. Golden-hour aerial, end card
shot(C[12], 60.01, t => { const k = kk(t, C[12], 60);
  return { t, set: 'lake', sky: { top: '#3a6fc0', hor: '#ffb070', sun: [.7, .12, -.6] }, hemi: { sky: '#ffd2a0', ground: '#5a5a40', i: 1.1 }, fog: { color: '#ffc890', density: .0006 }, sun: { dir: [.7, .2, -.6], color: '#ffb874', i: 3.2, focus: [-150, 0, -100], size: 500 },
    cam: cam('lake', [lerp(400, 300, k), lerp(140, 200, k), lerp(380, 300, k)], [-100, 0, -140], 42), lake: { level: 0, foam: 0 }, rig: { gone: true }, barges: 0, grade: { ...VIVID, fade: ss(59.2, 60, t) },
    overlay: endCard('NOBODY WAS KILLED', 'THE LAKE CAME BACK… AS SALT WATER', ss(C[12] + .5, C[12] + 1.2, t)) }; });

export function frameAt(n: number): PFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
