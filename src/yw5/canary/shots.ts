// YunoWorld v4 · Film 3 — "Why Miners Carried Oxygen Tanks for Birds". 60 s, cut to the narration.
// Facts kept general (no invented rescue incident): CO after explosions/fires, Haldane's 1896 Tylorstown work, canaries' fast breathing,
// the rescue-party resuscitator cage (shut the door, open the valve), UK phase-out in 1986.
import { STAND, idle, walkPose, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { runPose } from '../../ff2d/moves.ts';
import { UNIT } from '../../brazil/actor.ts';
import { lerp, ss, kk, type V3, type Cam, type ActorState, type Sprite, type Light } from '../../yw3/core.ts';
import { SET, type KFrame, type SetName, type BirdState } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, GRADE, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.canary; const F = 'canary';
const MINER: Look = { outfit: 'jacket', color: '#3d4452', inner: '#bfb6a4', pants: '#2a2622', hat: 'cap', hair: '#22201e' };
const MINER2: Look = { outfit: 'vest', color: '#5a4632', inner: '#c8bca4', pants: '#2c2a2a', hat: 'cap', hair: '#3a2a1a', beard: 'stubble' };
const MINER3: Look = { outfit: 'jacket', color: '#4a3a3a', inner: '#bfb6a4', pants: '#26262a', hat: 'cap', hair: '#1a1a1a', beard: 'moustache', beardColor: '#2a1a10' };
const RESCUE: Look = { outfit: 'jumpsuit', color: '#2f4a6a', pants: '#24364e', hat: 'brimmed', hair: '#3a2a1a' };
const HALDANE: Look = { outfit: 'suit', color: '#3a3430', inner: '#efe8da', pants: '#2a2622', hat: 'brimmed', hair: '#2a2420', beard: 'moustache', beardColor: '#4a3a2a', tie: '#7a2a2a' };
const W = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
const cam = (s: SetName, pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos: W(s, pos), look: W(s, look), fov, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: Look, s: SetName, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState => ({ id, look, pose: p, face, pos: W(s, pos), t, res: 1024, ...o });
/** world point of a rig-space hand for a camera looking along -z (screen right = +x) */
const hand = (p: V3, h: [number, number]): V3 => [p[0] + h[0] * UNIT, p[1] - h[1] * UNIT, p[2] + .06];
const MINE = { set: 'mine' as const, hemi: { sky: '#7a74c0', ground: '#2a2234', i: .6 }, fill: { color: '#6a78d0', i: .25 }, fog: { color: '#17142a', density: .07 }, bg: '#0e0c18' };
const DIM = (focus: V3) => ({ dir: [.4, .8, .45] as V3, color: '#ffb877', i: .9, focus: W('mine', focus), size: 7 });
const DUSK = { set: 'pithead' as const, sky: { top: '#33408a', hor: '#ff9a62', sun: [-.75, .08, -.6] as V3 }, hemi: { sky: '#a8a8ff', ground: '#4a5a3a', i: .9 }, fog: { color: '#d89a88', density: .006 } };
const CAGE = 1.5;                                    // carried cage scale (cartoon readable)
const CAGE_TOP = .37 * CAGE;
type Carry = { cage: NonNullable<KFrame['cage']>; lamp: Light; glow: Sprite };
/** A miner walking along the roadway with the cage in his leading hand and a lamp in the other. */
function carrier(id: string, look: Look, x: number, z: number, t: number, dir: number, o: { door?: number; valve?: number; o2?: number; plain?: boolean; walk?: boolean; face?: ReturnType<typeof expr> } = {}): { a: ActorState } & Carry {
  const p: V3 = [x, 0, z]; const hc: [number, number] = [dir * .82, -2.2], hl: [number, number] = [-dir * .62, -1.55];
  const base = o.walk === false ? pose({ turn: dir * .6 }, t, .4) : walkPose(t * 1.5 * 1.1, dir);
  const ps = { ...base, [dir < 0 ? 'handA' : 'handB']: hc, [dir < 0 ? 'shapeA' : 'shapeB']: 'hold', [dir < 0 ? 'handB' : 'handA']: hl, [dir < 0 ? 'shapeB' : 'shapeA']: 'hold' } as Pose;
  const hp = hand(p, hc), lp = hand(p, hl); const sway = Math.sin(t * 3.4) * .015;
  return { a: act(id, look, 'mine', p, ps, o.face ?? EXPR.focused, t, { rim: '#ffcf8a' }),
    cage: { pos: W('mine', [hp[0] + sway, hp[1] - CAGE_TOP, hp[2] + .02]), scale: CAGE, carried: true, door: o.door ?? 0, valve: o.valve, o2: o.o2, plain: o.plain },
    lamp: { p: W('mine', [lp[0], lp[1] - .12, lp[2] + .1]), c: [1, .74, .42], i: 5, d: 6 }, glow: { p: W('mine', [lp[0], lp[1] - .14, lp[2] + .12]), s: .5, rot: 0, c: [1.6, 1.1, .6], a: .8, kind: 2, seed: 1, age: 0 } }; }
const walker = (id: string, look: Look, x: number, z: number, t: number, dir: number, face = EXPR.neutral, seed = 1) => act(id, look, 'mine', [x, 0, z], { ...walkPose(t * 1.65 + seed, dir), handB: dir < 0 ? [.4, -1.3] : [.62, -1.55], shapeB: 'hold' } as Pose, face, t, { rim: '#ffcf8a' });
type S = { a: number; b: number; f: (t: number) => KFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => KFrame) => SH.push({ a, b, f });
const STILL = (x: number): V3 => [x, 1.33, 0];        // cage resting on a coal tub (tub tops at y 1.33, x = -10 … -17.2)

// 1 — HOOK: deep underground, a miner carries a tiny bird… push in: an oxygen tank on its cage
shot(0, C[1], t => { const x = 1.5 - t * 1.0; const m = carrier('m', MINER, x, -.2, t, -1); const push = ss(2.4, C[1], t);
  const mate = walker('m2', MINER2, x + 1.9, -.6, t, -1, EXPR.neutral, 2); const cp = m.cage.pos;
  const far: V3 = [x - .2, 1.35, 3.6], near: V3 = [cp[0] - .1, cp[1] + .38, cp[2] + 1.25];
  return { t, ...MINE, sun: DIM([x, 1, 0]), cam: cam('mine', [lerp(far[0], near[0], push), lerp(far[1], near[1], push), lerp(far[2], near[2], push)], [lerp(x - .4, cp[0], push), lerp(1.2, cp[1] + .3, push), lerp(-.4, cp[2], push)], lerp(42, 34, push)),
    actors: [m.a, mate], cage: m.cage, bird: { state: 'perch' }, lights: [m.lamp], sprites: [m.glow], grade: { ...GRADE, fade: (1 - ss(0, .4, t)) * .5, focus: push * 1.3, aperture: push * .5 },
    overlay: chip('OXYGEN?!', 260, ss(C[1] - 1.1, C[1] - .8, t), '#5fd1ff') + captions(F, t) }; });
// 2 — the cage, part by part: metal box · glass window · little round door · oxygen cylinder on top
shot(C[1], C[2], t => { const k = kk(t, C[1], C[2]); const d = C[2] - C[1]; const q = (i: number) => ss(C[1] + d * (.05 + i * .22), C[1] + d * (.05 + i * .22) + .25, t); const P = STILL(-10);
  const tilt = ss(C[1] + d * .68, C[2], t);
  return { t, ...MINE, sun: DIM([-10, 1.5, 0]), cam: cam('mine', [lerp(-9.35, -9.6, k), lerp(1.62, 1.95, tilt), lerp(.95, .82, k)], [-10 + .02, lerp(1.5, 1.82, tilt), 0], 30), cage: { pos: W('mine', P), door: .25 + q(2) * .4, rotY: lerp(-.45, -.2, k) },
    bird: { state: 'perch' }, lights: [{ p: W('mine', [-9.2, 2.2, 1.2]), c: [1, .78, .5], i: 2.2, d: 5 }, { p: W('mine', [-10.8, 1.9, -1.4]), c: [.45, .55, 1], i: 2.2, d: 4 }],
    grade: { ...GRADE, focus: 1.1, aperture: .55 }, overlay: chip('METAL BOX', 260, q(0) * (1 - q(1))) + chip('GLASS WINDOW', 260, q(1) * (1 - q(2)), '#9fe0ff') + chip('ROUND DOOR', 260, q(2) * (1 - q(3)), '#ffd23f') + chip('OXYGEN CYLINDER', 260, q(3), '#5fd1ff') + captions(F, t) }; });
// 3 — "why would a bird need its own oxygen?" — the canary, nose to the glass, cocks its head
shot(C[2], C[3], t => { const k = kk(t, C[2], C[3]); const P = STILL(-10);
  return { t, ...MINE, sun: DIM([-10, 1.5, 0]), cam: cam('mine', [-10.02 + Math.sin(t * .8) * .02, 1.53, lerp(.62, .5, k)], [-10.02, 1.52, 0], 30), cage: { pos: W('mine', P), door: .25 },
    bird: { state: k > .55 ? 'sing' : 'perch' }, lights: [{ p: W('mine', [-9.5, 2, 1]), c: [1, .78, .5], i: 2.2, d: 5 }], grade: { ...GRADE, focus: .55, aperture: .6 },
    overlay: card('WHY?', '', ss(C[2] + .25, C[2] + .5, t), 330) + captions(F, t) }; });
// 4 — the deadliest danger: no smell · no colour · no taste (the crew walks deeper; the air looks perfectly clear)
shot(C[3], C[4], t => { const k = kk(t, C[3], C[4]); const d = C[4] - C[3]; const q = (i: number) => ss(C[3] + d * (.25 + i * .22), C[3] + d * (.25 + i * .22) + .2, t); const x = -2 - (t - C[3]) * 1.1;
  const m = carrier('m', MINER, x, -.3, t, -1);
  return { t, ...MINE, sun: DIM([x, 1, 0]), cam: cam('mine', [lerp(2.4, 1.6, k), 1.75, 1.3], [x - 8, 1.25, -.4], 50), actors: [m.a, walker('m2', MINER2, x + 1.6, .5, t, -1, EXPR.neutral, 2), walker('m3', MINER3, x + 3.1, -.7, t, -1, EXPR.calm, 4)],
    cage: m.cage, bird: { state: 'perch' }, lights: [m.lamp], sprites: [m.glow], grade: GRADE,
    overlay: chip('NO SMELL', 260, q(0), '#e0e0e0') + chip('NO COLOUR', 370, q(1), '#e0e0e0') + chip('NO TASTE', 480, q(2), '#e0e0e0') + captions(F, t) }; });
// 5 — carbon monoxide: the "x-ray" view floods the roadway red… and the men don't notice
shot(C[4], C[5], t => { const k = kk(t, C[4], C[5]); const co = ss(C[4] + .2, C[4] + 1.8, t); const x = -4.5 - (t - C[4]) * .6;
  const men = [walker('m2', MINER2, x + .8, -.4, t, -1, EXPR.neutral, 2), walker('m3', MINER3, x + 2.4, .2, t, -1, EXPR.calm, 4), act('m', MINER, 'mine', [x - .9, 0, -.6], pose({ turn: .5, handB: [.6, -1.6], shapeB: 'hold', lean: .05 }, t, .6), EXPR.calm, t, { rim: '#ffcf8a' })];
  return { t, ...MINE, sun: DIM([x, 1, 0]), cam: cam('mine', [x + lerp(1.0, .6, k), 1.35, 4.2], [x + .7, 1.15, -.5], 54), actors: men, co, lights: [{ p: W('mine', [x - .5, 1.5, .6]), c: [1, .74, .42], i: 4, d: 6 }],
    grade: { ...GRADE, sat: lerp(1.16, .9, co), gain: [1.04 + co * .1, 1 - co * .05, .95 - co * .05] }, overlay: chip('CARBON MONOXIDE', 260, ss(C[4] + .1, C[4] + .4, t), '#ff5a4a') + chip('CO', 370, ss(C[4] + .9, C[4] + 1.2, t), '#ff5a4a') + captions(F, t) }; });
// 6 — Wales, 1896: a pithead at dusk; scientist John Haldane arrives after the explosion
shot(C[5], C[6], t => { const k = kk(t, C[5], C[6]); const hx = lerp(9, 4.6, ss(C[5], C[5] + 2.6, t)); const walking = t < C[5] + 2.6;
  const R = Math.floor(t * 12); const S: Sprite[] = []; for (let i = 0; i < 18; i++) { const a = ((t * .25 + i / 18) % 1); S.push({ p: W('pithead', [32 + a * 10, 34 + a * 16, -66 + a * 4]), s: 4 + a * 10, rot: i, c: [.55, .5, .55], a: .5 * (1 - a), kind: 3, seed: i + R * 0, age: a }); }
  return { t, ...DUSK, sun: { dir: [-.7, .25, -.6], color: '#ffb07a', i: 2.6, focus: W('pithead', [3, 0, 16]), size: 26 },
    cam: cam('pithead', [lerp(8, 7, k), 1.6, lerp(24.5, 23.5, k)], [3, 4.2, 0], 44), actors: [act('h', HALDANE, 'pithead', [hx, 0, 18], walking ? walkPose(t * 1.4, -1) : pose({ turn: -.4, headLift: .05 }, t, .5), EXPR.focused, t, { rim: '#ffb07a' }),
      act('w1', MINER3, 'pithead', [-1.6, 0, 16.5], pose({ turn: .5, handA: [-.3, -1.2] }, t, .4), EXPR.sad, t, { rim: '#ffb07a' })], sprites: S,
    grade: { ...GRADE, sat: 1.08 }, overlay: chip('WALES · 1896', 260, ss(C[5] + .2, C[5] + .5, t)) + chip('JOHN HALDANE', 370, ss(C[5] + 1.8, C[5] + 2.1, t), '#ffd23f') + captions(F, t) }; });
// 7 — his idea: send a small animal first (Haldane lifts a plain bird cage at the pit mouth)
shot(C[6], C[7], t => { const k = kk(t, C[6], C[7]); const lift = ss(C[6] + .4, C[6] + 1.2, t); const hp: V3 = [4.6, 0, 18]; const hc: [number, number] = [-.9, lerp(-1.7, -2.9, lift)]; const h = hand(hp, hc);
  return { t, ...DUSK, sun: { dir: [-.7, .25, -.6], color: '#ffb07a', i: 2.6, focus: W('pithead', [4, 1, 18]), size: 8 }, cam: cam('pithead', [lerp(5.6, 5.2, k), 1.45, lerp(21.6, 21.0, k)], [4.2, 1.25, 18], 36),
    actors: [act('h', HALDANE, 'pithead', hp, pose({ turn: -.35, handA: hc, shapeA: 'hold', handB: [.5, -1.9], shapeB: 'point', headTurn: -.2 }, t, .4), lift > .5 ? EXPR.realization : EXPR.thinking, t, { rim: '#ffb07a' })],
    cage: { pos: W('pithead', [h[0], h[1] - CAGE_TOP, h[2] + .03]), scale: CAGE, plain: true, door: 0 }, bird: { state: 'perch' }, grade: GRADE,
    overlay: card('IDEA:', 'SEND A BIRD FIRST', ss(C[6] + 1, C[6] + 1.3, t), 300) + captions(F, t) }; });
// 8 — "you see": a canary breathes fast, so the gas reaches it long before a person
shot(C[7], C[8], t => { const k = kk(t, C[7], C[8]); const P = STILL(-12.4); const co = .55 + .2 * k;
  return { t, ...MINE, sun: DIM([-12.4, 1.5, 0]), co, cam: cam('mine', [lerp(-12.0, -12.15, k), 1.6, lerp(1.05, .8, k)], [-12.42, 1.52, 0], 30), cage: { pos: W('mine', P), door: .25 }, bird: { state: 'pant' },
    lights: [{ p: W('mine', [-11.6, 2, 1]), c: [1, .74, .45], i: 2.2, d: 5 }], grade: { ...GRADE, focus: .9, aperture: .5, gain: [1.1, .97, .92] },
    overlay: chip('FAST BREATHING', 260, ss(C[7] + 1, C[7] + 1.3, t), '#ffd23f') + chip('FEELS THE GAS FIRST', 370, ss(C[7] + 2.4, C[7] + 2.7, t), '#ff5a4a') + captions(F, t) }; });
// 9 — the bird wobbles… drops from its perch… everyone gets out
shot(C[8], C[9], t => { const T1 = wt('canary', 'dropped', 1, C[8] + 1.6) + .05; const wob = ss(wt('canary', 'wobbled', 1, C[8] + .8) - .2, T1, t); const P = STILL(-12.4); const run = t > T1 + .35;
  const st: BirdState = t < T1 ? 'wobble' : 'down';
  if (!run) return { t, ...MINE, sun: DIM([-12.4, 1.5, 0]), co: .8, cam: cam('mine', [-12.15, 1.55, .78], [-12.42, 1.48, 0], 30), cage: { pos: W('mine', P), door: .25 }, bird: { state: st, k: wob },
    lights: [{ p: W('mine', [-11.6, 2, 1]), c: [1, .74, .45], i: 2.2, d: 5 }], shake: t > T1 && t < T1 + .2 ? .05 : 0, grade: { ...GRADE, focus: .8, aperture: .5, gain: [1.1, .97, .92] }, overlay: captions(F, t) };
  const r = t - T1 - .35; const x = -6 + r * 3.6; const hb = hand([x, 0, -.3], [.8, -1.7]);
  const men = [act('m', MINER, 'mine', [x, 0, -.3], { ...runPose(r * 4, 1, { fear: 1 }), handB: [.8, -1.7], shapeB: 'hold' }, EXPR.terrified, t, { rim: '#ffcf8a' }), act('m2', MINER2, 'mine', [x - 1.4, 0, .4], runPose(r * 4 + 1, 1, { fear: 1 }), EXPR.shocked, t, { rim: '#ffcf8a' }),
    act('m3', MINER3, 'mine', [x - 2.7, 0, -.6], runPose(r * 4 + 2, 1, { fear: 1 }), EXPR.fear, t, { rim: '#ffcf8a' })];
  return { t, ...MINE, sun: DIM([x, 1, 0]), co: .8, cam: cam('mine', [x + 2.6, 1.3, 3], [x, 1.1, -.4], 46), actors: men, cage: { pos: W('mine', [hb[0], hb[1] - CAGE_TOP, hb[2] + .02]), scale: CAGE, carried: true, door: .25 }, bird: { state: 'down' },
    lights: [{ p: W('mine', [x - .3, 1.2, .4]), c: [1, .74, .42], i: 4, d: 6 }], shake: .04, grade: { ...GRADE, whip: (1 - ss(T1 + .35, T1 + .55, t)) * .6 },
    overlay: card('GET OUT!', '', ss(T1 + .4, T1 + .6, t) * (1 - ss(C[9] - .3, C[9], t)), 330) + captions(F, t) }; });
// 10 — rescue teams had a better cage (silhouettes against the shaft light, carrying the resuscitator)
shot(C[9], C[10], t => { const k = kk(t, C[9], C[10]); const x = 7.4 - (t - C[9]) * 1.0; const m = carrier('r1', RESCUE, x, -.2, t, -1, { face: EXPR.determined });
  return { t, ...MINE, fog: { color: '#2a2440', density: .05 }, sun: { dir: [-.9, .25, .2], color: '#ffd9a0', i: 2.6, focus: W('mine', [x, 1, 0]), size: 8 }, cam: cam('mine', [x - lerp(3.4, 2.6, k), 1.25, 2.6], [x + .2, 1.2, -.4], 44),
    actors: [m.a, walker('r2', RESCUE, x + 1.5, .5, t, -1, EXPR.determined, 2), walker('r3', RESCUE, x + 2.9, -.7, t, -1, EXPR.focused, 5)], cage: m.cage, bird: { state: 'perch' }, lights: [m.lamp, { p: W('mine', [8.4, 1.8, 0]), c: [1, .85, .6], i: 8, d: 12 }], sprites: [m.glow],
    grade: { ...GRADE, bloom: .3 }, overlay: chip('RESCUE TEAMS', 260, ss(C[9] + .3, C[9] + .6, t), '#5fd1ff') + captions(F, t) }; });
// 11 — bird down: shut the little door… open the valve
shot(C[10], C[11], t => { const SHUT = wt('canary', 'shut', 1, C[10] + 1.4), VALVE = wt('canary', 'valve', 1, C[10] + 3); const shut = ss(SHUT - .1, SHUT + .4, t); const valve = ss(VALVE - .2, VALVE + .4, t); const P = STILL(-14.8);
  const up = ss(SHUT + .6, VALVE - .4, t);
  return { t, ...MINE, sun: DIM([-14.8, 1.5, 0]), co: .5, cam: cam('mine', [lerp(-14.38, -14.62, up), lerp(1.55, 1.86, up), lerp(.72, .62, up)], [lerp(-14.66, -14.9, up), lerp(1.5, 1.7, up), lerp(-.05, -.03, up)], 30),
    cage: { pos: W('mine', P), door: 1 - shut, valve }, bird: { state: 'down' }, lights: [{ p: W('mine', [-14.2, 2.1, 1]), c: [1, .78, .5], i: 2.2, d: 5 }], grade: { ...GRADE, focus: .75, aperture: .5 },
    overlay: chip('SHUT THE DOOR', 260, shut * (1 - up), '#ffd23f') + chip('OPEN THE VALVE', 260, valve, '#5fd1ff') + captions(F, t) }; });
// 12 — oxygen floods in… and the canary comes back (pull back to the relieved rescuer)
shot(C[11], C[12], t => { const d = C[12] - C[11]; const o2 = ss(C[11], C[11] + .6, t); const rev = ss(C[11] + d * .3, C[11] + d * .7, t); const back = ss(C[11] + d * .62, C[12], t); const P = STILL(-14.8);
  const st: BirdState = rev < .2 ? 'down' : rev < .75 ? 'wobble' : rev < .98 ? 'perch' : 'sing';
  return { t, ...MINE, sun: DIM([-14.8, 1.5, 0]), co: .5 * (1 - o2), cam: cam('mine', [lerp(-14.75, -14.9, back), lerp(1.55, 1.5, back), lerp(.72, 3.2, back)], [lerp(-14.8, -15.1, back), lerp(1.5, 1.2, back), lerp(0, .4, back)], lerp(30, 48, back)),
    actors: back > .02 ? [act('r1', RESCUE, 'mine', [-15.5, 0, 1.05], pose({ turn: .6, lean: .15, handB: [.7, -2.1], shapeB: 'open' }, t, .4), st === 'sing' ? EXPR.relief : EXPR.worried, t, { rim: '#ffcf8a' })] : [],
    cage: { pos: W('mine', P), door: 0, valve: 1, o2: o2 * (1 - rev * .5) }, bird: { state: st, k: 1 - rev }, lights: [{ p: W('mine', [-14.2, 2.1, 1]), c: [1, .78, .5], i: 2.2, d: 5 }],
    grade: { ...GRADE, focus: .75 * (1 - back), aperture: .5 * (1 - back) }, overlay: chip('OXYGEN', 260, o2 * (1 - rev), '#5fd1ff') + chip('REVIVED!', 260, ss(.75, .85, rev), '#5fd16f') + captions(F, t) }; });
// 13 — until 1986 (the crew walks on with the bird singing; loops back to the opening walk)
shot(C[12], 60.01, t => { const k = kk(t, C[12], 60); const x = 3.4 - (t - C[12]) * 1.0; const m = carrier('m', MINER, x, -.2, t, -1);
  return { t, ...MINE, sun: DIM([x, 1, 0]), cam: cam('mine', [lerp(x + 2.6, x + .9, k), lerp(1.6, 1.4, k), lerp(4.2, 3.6, k)], [x - .3, 1.2, -.4], lerp(44, 42, k)),
    actors: [m.a, walker('m2', MINER2, x + 1.9, -.6, t, -1, EXPR.happy, 2), walker('m3', MINER3, x + 3.4, .4, t, -1, EXPR.calm, 4)], cage: m.cage, bird: { state: 'sing' }, lights: [m.lamp], sprites: [m.glow],
    grade: { ...GRADE, fade: ss(59.4, 60, t) * .5 }, overlay: card('UNTIL 1986', 'BRITISH MINES', ss(C[12] + 1.2, C[12] + 1.6, t) * (1 - ss(58.6, 59.2, t)), 300) + captions(F, t) }; });

export function frameAt(n: number): KFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
