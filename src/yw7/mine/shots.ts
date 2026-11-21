// YunoWorld v7 · Film 1 — "If this tiny bird fell over, every miner had to RUN." 60 s, phrase-synced, continuous camera.
// Facts: CO is colourless/odourless; J. S. Haldane identified CO as the killer after mine explosions (1890s) and proposed small
// animals as detectors; canaries react first because they breathe fast; mine-rescue teams carried resuscitator cages (door shut,
// oxygen valve opened to revive the bird); British pits phased canaries out in 1986.
import { STAND, idle, walkPose, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { lerp, ss, kk, type V3, type ActorState } from '../../yw3/core.ts';
import { UNIT } from '../../brazil/actor.ts';
import type { T7Look, T7Prop } from '../toon7.ts';
import { rig, breathe, orbitKeys, ease, type Key } from '../cam7.ts';
import { FACE_Z, type MineFrame, type BirdState } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.canary; const F = 'canary'; const w = (word: string, n = 1, fb = 0) => wt(F, word, n, fb);
// ---- cast (original designs)
const TOM: T7Look = { skin: '#e8b48a', hair: '#2a1e16', hairStyle: 'short', nose: 'long', head: { w: .95, jaw: 1.15, chin: 1.05 }, top: '#5a4a3a', topKind: 'jacket', inner: '#b8a888', pants: '#3a3430', boots: '#2a2018', belt: '#2a1e14', hat: 'helmet', hatColor: '#6a6a60', lamp: true, beard: 'stache', beardColor: '#2a1e16', soot: .6, eyes: '#3a5a7a', sleeves: 'rolled' };
const NED: T7Look = { skin: '#d8a07a', hair: '#8a8478', hairStyle: 'short', nose: 'round', head: { w: 1.08, cheek: 1.1, jaw: 1.1 }, top: '#4a4038', topKind: 'waistcoat', inner: '#9a8a70', pants: '#2e2a28', boots: '#1e1814', belt: '#1a140e', hat: 'helmet', hatColor: '#5a5a52', lamp: true, beard: 'full', beardColor: '#8a8478', soot: .9, build: 1.18, belly: 1, eyes: '#4a3a2a', sleeves: 'rolled' };
const SAM: T7Look = { skin: '#f0c8a0', hair: '#6a3a1a', hairStyle: 'curly', nose: 'snub', head: { w: .9, jaw: .9, chin: .95 }, top: '#4a5a6a', topKind: 'shirt', pants: '#33302c', boots: '#2a2018', belt: '#2a1e14', hat: 'helmet', hatColor: '#6a6a60', lamp: true, soot: .5, build: .9, height: .97, eyes: '#5a7a4a', sleeves: 'rolled' };
const HALDANE: T7Look = { skin: '#f0caa8', hair: '#3a2a1e', hairStyle: 'side', nose: 'hook', head: { w: .92, h: 1.05, jaw: .95 }, top: '#3a3430', topKind: 'suit', inner: '#f2ede0', tie: '#2a2a2a', pants: '#2e2a28', boots: '#141210', hat: 'bowler', hatColor: '#2a2420', beard: 'stache', beardColor: '#3a2a1e', eyes: '#4a5a6a', build: .95 };
const RESCUE1: T7Look = { skin: '#e0b088', hair: '#3a2a1a', hairStyle: 'short', nose: 'long', head: { jaw: 1.2, chin: 1.1 }, top: '#2e3a52', topKind: 'overalls', apron: '#2a344a', pants: '#2a344a', boots: '#141210', belt: '#6a5a3a', hat: 'helmet', hatColor: '#d8d0b8', lamp: true, beard: 'stubble', eyes: '#3a4a5a', build: 1.08 };
const RESCUE2: T7Look = { ...RESCUE1, skin: '#c8906a', head: { w: 1.02, jaw: .95 }, nose: 'round', beard: 'stache', beardColor: '#1a1410', build: .98 };
// ---- helpers
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
type Opt = Partial<ActorState> & { a?: T7Prop; b?: T7Prop };
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Opt = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1100, seed: id.length * 7 + 1, t7A: o.a, t7B: o.b, rim: '#ffb070', rimSide: -1, ...o });
/** walking toward / away from the camera (3/4 front): feet alternate, hips bob, arms swing */
function frontWalk(t: number, speed = 1.6, turn = .12, carryB?: [number, number]): Pose {
  const ph = t * speed * Math.PI; const s = Math.sin(ph), c = Math.cos(ph);
  return { ...STAND, turn, lean: .02, crouch: Math.abs(c) * -.05 + .03, hipX: s * .04, headTilt: s * .03, headTurn: 0, headLift: 0,
    footA: [-.2, -.08 - Math.max(0, s) * .18], footB: [.2, -.08 - Math.max(0, -s) * .18], handA: [-.55 - s * .08, -1.62 + Math.max(0, -s) * .1], handB: carryB ?? [.55 + s * .08, -1.62 + Math.max(0, s) * .1] };
}
function frontRun(t: number, speed = 3.2, fear = 1): Pose {
  const ph = t * speed * Math.PI; const s = Math.sin(ph);
  return { ...STAND, turn: .06, lean: .02, crouch: .1 + Math.abs(Math.cos(ph)) * -.08, hipX: s * .06, headTilt: s * .05, headTurn: 0, headLift: -.03,
    footA: [-.22, -.08 - Math.max(0, s) * .45], footB: [.22, -.08 - Math.max(0, -s) * .45], kneeUp: false,
    handA: [-.7 - fear * .2, -2.4 - s * .35 - fear * .3], handB: [.7 + fear * .2, -2.4 + s * .35 - fear * .3], shapeA: 'open', shapeB: 'open' };
}
/** world position of a rig hand for a character seen roughly from the front (camera looking along -z or +z) */
const handW = (pos: V3, h: [number, number], facingCam = 1): V3 => [pos[0] + h[0] * UNIT * facingCam, pos[1] - h[1] * UNIT, pos[2]];
const CAGE_HANG: V3 = [.9, 2.16, -6.2];           // cage on the cap beam (hook) — the film's central object
const MINE = { set: 'mine', hemi: { sky: '#5a6a9a', ground: '#1c1a22', i: .55 }, fog: { color: '#0c0e16', density: .05 }, bg: '#08080c' };
const GR = { sat: 1.04, contrast: 1.1, bloom: .3, bloomTh: 1.35, vignette: .3, exposure: 1.05, lift: [.02, .025, .055] as [number, number, number], gain: [1.03, .99, .95] as [number, number, number], grain: .03 };
const camLamp = (p: V3, i = 6): { p: V3; c: [number, number, number]; i: number; d: number } => ({ p, c: [1, .75, .45], i, d: 7 });
type S = { a: number; b: number; f: (t: number) => MineFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => MineFrame) => SH.push({ a, b, f });
const frame = (t: number, cam: ReturnType<typeof rig>, o: Partial<MineFrame>, aperture = 0): MineFrame =>
  ({ t, ...MINE, cam, grade: { ...GR, focus: cam.focusDist ?? 6, aperture }, ...o } as MineFrame);

// 1 — HOOK. Extreme close on the canary… it sways and drops off its perch. The camera recoils back down the roadway as the men run at us.
shot(0, C[2], t => {
  const fall = w('over', 1, 1.2); const st: BirdState = t < fall - .45 ? 'perch' : t < fall ? 'sway' : t < fall + .35 ? 'fall' : 'down';
  const run = C[1] - .1; const cg = CAGE_HANG;
  const keys: Key[] = [{ t: 0, pos: [cg[0] - .28, cg[1] + .22, cg[2] + .55], look: [cg[0], cg[1] + .2, cg[2]], fov: 30 }, { t: fall + .3, pos: [cg[0] - .18, cg[1] + .2, cg[2] + .42], look: [cg[0], cg[1] + .16, cg[2]], fov: 28 },
    { t: run + .5, pos: [.2, 1.85, cg[2] + 2.2], look: [0, 1.5, -9], fov: 44 }, { t: C[2], pos: [0, 1.25, cg[2] + 6.8], look: [0, 1.25, -4], fov: 48 }];
  const cam = rig(keys, t); const rk = ss(run, run + 2.2, t);
  const men = [act('tom', TOM, [lerp(-.5, -.3, rk), 0, lerp(-10, -1.4, rk)], rk > 0 ? frontRun(t - run) : pose({ turn: -.6, handB: [.9, -2.3], frontB: 1 }, t, .5), rk > .05 ? EXPR.terror : EXPR.focused, t, { b: rk > 0 ? undefined : 'pick' }),
    act('ned', NED, [lerp(.6, .5, rk), 0, lerp(-11.4, -2.6, ss(run + .3, run + 2.6, t))], ss(run + .3, run + 2.6, t) > 0 ? frontRun(t - run - .2, 2.8) : pose({ turn: .5 }, t, .5), t > run + .3 ? EXPR.panic : EXPR.calm, t),
    act('sam', SAM, [lerp(-.2, 0, rk), 0, lerp(-12.6, -3.8, ss(run + .5, run + 2.8, t))], ss(run + .5, run + 2.8, t) > 0 ? frontRun(t - run - .4, 3.4) : pose({ turn: -.3 }, t, .5), t > run + .4 ? EXPR.scared : EXPR.neutral, t)];
  return frame(t, cam, { cage: { pos: cg, swing: st === 'perch' ? .02 : .06 }, bird: { state: st }, actors: men, extra: [camLamp([cg[0] - .6, cg[1] + .6, cg[2] + 1.2], 1.5)],
    shake: t > fall + .3 && t < fall + .5 ? .02 : 0, overlay: chip('UNDERGROUND', 260, ss(.4, .7, t) * (1 - ss(fall, fall + .3, t))) + captions(F, t) }, t < run ? .7 : 0);
});
// 2 — one long take: low on Tom's boots, tracking backward as he walks deeper… rise to his face… slide past his shoulder… the cage
shot(C[2], C[6], t => {
  const d = t - C[2]; const z = lerp(4.5, -3.5, kk(t, C[2], C[6])); const pos: V3 = [.15, 0, z]; const hb: [number, number] = [.62, -1.95];
  const cagePos = handW(pos, hb); cagePos[1] -= .47; cagePos[2] += .05;
  const keys: Key[] = [{ t: C[2], pos: [-.9, .55, z - 2.8], look: [.15, .75, z], fov: 46 }, { t: C[3] + .2, pos: [.0, .95, z - 2.2], look: [.15, .9, z], fov: 42 },
    { t: C[4] + .2, pos: [-.2, 1.62, z - 1.9], look: [.15, 1.55, z], fov: 38 }, { t: C[5] - .2, pos: [-.6, 1.7, z + .9], look: [cagePos[0], cagePos[1] + .2, cagePos[2] - .4], fov: 40 },
    { t: C[6], pos: [cagePos[0] - .45, cagePos[1] + .3, cagePos[2] + .75], look: [cagePos[0], cagePos[1] + .2, cagePos[2]], fov: 32 }];
  const cam = rig(keys.map(k => ({ ...k, pos: [k.pos[0], k.pos[1], k.t >= C[5] - .3 ? k.pos[2] : k.pos[2]] as V3 })), t);
  const fz = (k: Key) => k; void fz;
  return frame(t, cam, { cage: { pos: cagePos, swing: .05 }, bird: { state: 'perch' }, actors: [act('tom', TOM, pos, frontWalk(d, 1.5, .1, hb), expr('calm', 'happy', ss(C[4], C[5], t)), t, { rim: '#ffcf8a' })],
    extra: [camLamp([0, 2.3, z - 1.5], 5)], overlay: chip('CARBON MONOXIDE', 260, ss(C[3], C[3] + .3, t), '#ff6a4a') + chip('NO COLOUR · NO SMELL', 370, ss(C[4], C[4] + .3, t), '#cfd6ff') + captions(F, t) }, .55);
});
// 3 — "So miners carried a canary." orbit the cage on its hook as the bird sings… then the scientist in a wrecked roadway
shot(C[6], C[9], t => {
  if (t < C[7]) { const cam = rig(orbitKeys(C[6], C[7], CAGE_HANG, .7, -.6, .5, CAGE_HANG[1] + .1, CAGE_HANG[1] + .25, CAGE_HANG[1] + .2, 34), t, { easing: ease.inOut });
    return frame(t, cam, { cage: { pos: CAGE_HANG, swing: .02 }, bird: { state: 'chirp' }, extra: [camLamp([CAGE_HANG[0] - .8, CAGE_HANG[1] + .7, CAGE_HANG[2] + 1.0], 1.5)], overlay: captions(F, t) }, .6); }
  // Haldane (wrecked section near the face: lamps dimmed, timbers down)
  const z0 = -36; const hx = lerp(-.4, .2, kk(t, C[7], C[9])); const pos: V3 = [hx, 0, z0]; const lift = ss(C[8], C[8] + .6, t); const hb: [number, number] = [lerp(.55, .45, lift), lerp(-1.7, -2.75, lift)];
  const cagePos = handW(pos, hb); cagePos[1] -= .47;
  const keys: Key[] = [{ t: C[7], pos: [1.4, 1.2, z0 + 4.2], look: [hx, 1.2, z0], fov: 46 }, { t: C[8], pos: [.9, 1.45, z0 + 2.6], look: [hx, 1.4, z0], fov: 40 }, { t: C[9], pos: [.55, 1.75, z0 + 1.5], look: [cagePos[0] - .2, cagePos[1] + .1, z0], fov: 36 }];
  const cam = rig(keys, t);
  return frame(t, cam, { lampsOn: .45, cage: lift > .05 ? { pos: cagePos, swing: .03 } : undefined, bird: { state: 'perch' },
    actors: [act('hal', HALDANE, pos, lift < .05 ? { ...walkPose((t - C[7]) * 1.2, 1, { turn: .55 }), handA: [-.6, -2.2], shapeA: 'grip' } as Pose : pose({ turn: .4, handB: hb, frontB: 1, headTurn: .15 }, t, .3), lift > .3 ? EXPR.happy : EXPR.concentrating, t, { a: lift < .05 ? 'lamp' : undefined, rim: '#ffd9a0' })],
    extra: [camLamp([hx + 1.2, 1.9, z0 + 1.2], 9)], overlay: chip('JOHN SCOTT HALDANE', 260, ss(C[7] + .2, C[7] + .5, t), '#ffd23f') + chip('SCIENTIST · 1890s', 370, ss(C[7] + .8, C[7] + 1.1, t)) + captions(F, t) }, .5);
});
// 4 — macro on the panting bird… then over-the-shoulder at the coal face: each man glances at the cage between swings
const FACE_CAGE: V3 = [1.15, 2.05, FACE_Z + 2.3];
shot(C[9], C[11], t => {
  if (t < C[10]) { const k = kk(t, C[9], C[10]); const cam = rig([{ t: C[9], pos: [FACE_CAGE[0] - .45, FACE_CAGE[1] + .24, FACE_CAGE[2] + .4], look: [FACE_CAGE[0], FACE_CAGE[1] + .2, FACE_CAGE[2]], fov: 26 }, { t: C[10], pos: [FACE_CAGE[0] - .3, FACE_CAGE[1] + .23, FACE_CAGE[2] + .3], look: [FACE_CAGE[0], FACE_CAGE[1] + .2, FACE_CAGE[2]], fov: 24 }], t); void k;
    return frame(t, cam, { cage: { pos: FACE_CAGE, swing: .015 }, bird: { state: 'pant' }, extra: [camLamp([FACE_CAGE[0] - .8, FACE_CAGE[1] + .7, FACE_CAGE[2] + .9], 1.5)], overlay: chip('BREATHES FAST', 260, ss(C[9] + .4, C[9] + .7, t), '#ffd23f') + captions(F, t) }, .7); }
  const sw = (ph: number) => { const a = Math.sin(t * 2.4 + ph); return a; };
  const miner = (id: string, L: T7Look, x: number, ph: number, look: number) => { const s = sw(ph); const g = ss(look - .2, look, t) * (1 - ss(look + .9, look + 1.2, t));
    return act(id, L, [x, 0, FACE_Z + 1.3], pose({ turn: -.55 + g * .9, handA: [-.9 - s * .35, -2.4 - s * .6], handB: [-.35 - s * .2, -2.2 - s * .45], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1, lean: -.08 - s * .06, headTurn: g * .6 }, t, .2), g > .3 ? EXPR.concern : EXPR.focused, t, { a: 'pick' }); };
  const keys: Key[] = [{ t: C[10], pos: [1.5, 1.7, FACE_Z + 3.4], look: [-1.2, 1.5, FACE_Z + .8], fov: 44 }, { t: C[11], pos: [-.2, 1.75, FACE_Z + 3.6], look: [FACE_CAGE[0] - .4, 1.7, FACE_CAGE[2] - .3], fov: 42 }];
  const cam = breathe(rig(keys, t), t, .5);
  return frame(t, cam, { cage: { pos: FACE_CAGE, swing: .015 }, bird: { state: 'perch' }, actors: [miner('ned', NED, -1.1, 0, C[10] + .4), miner('tom', TOM, .2, 1.7, C[10] + 1.3)], extra: [camLamp([0, 2.4, FACE_Z + 2.6], 7)], overlay: captions(F, t) }, .35);
});
// 5 — THE ALARM, one continuous move: push to the swaying bird… it drops… swing to Tom's face (shock)… "Get out. NOW." — men run at the lens
shot(C[11], C[15], t => {
  const drop = C[12] + .25; const st: BirdState = t < C[11] + .3 ? 'pant' : t < drop ? 'sway' : t < drop + .3 ? 'fall' : 'down';
  const tomPos: V3 = [.2, 0, FACE_Z + 1.3]; const runT = C[14] + .1; const r = ss(runT, runT + 2.4, t);
  const keys: Key[] = [{ t: C[11], pos: [FACE_CAGE[0] - .7, FACE_CAGE[1] + .3, FACE_CAGE[2] + 1.0], look: [FACE_CAGE[0], FACE_CAGE[1] + .2, FACE_CAGE[2]], fov: 34 },
    { t: drop + .2, pos: [FACE_CAGE[0] - .4, FACE_CAGE[1] + .22, FACE_CAGE[2] + .5], look: [FACE_CAGE[0], FACE_CAGE[1] + .12, FACE_CAGE[2]], fov: 28 },
    { t: C[13] + .4, pos: [.75, 1.72, FACE_Z + 2.6], look: [tomPos[0], 1.62, tomPos[2]], fov: 30 },
    { t: runT + .1, pos: [.6, 1.6, FACE_Z + 3.2], look: [tomPos[0], 1.5, tomPos[2]], fov: 34 }, { t: C[15], pos: [.1, 1.1, FACE_Z + 13], look: [0, 1.3, FACE_Z + 4], fov: 46 }];
  const cam = rig(keys, t, { easing: (k: number) => k });
  const fz = (o: number) => FACE_Z + 1.3 + r * 9.5 - o;
  const men = [act('tom', TOM, [lerp(.2, -.3, r), 0, fz(0)], r > 0 ? frontRun(t - runT, 3.2) : pose({ turn: t > C[13] ? .1 : -.55, headTurn: t > C[13] ? .3 : 0, handA: t > C[14] ? [-.9, -3.2] : [-.6, -2.2], shapeA: t > C[14] ? 'open' : 'grip', frontA: 1 }, t, .2), t > C[13] ? (t > C[14] ? EXPR.shout : EXPR.shocked) : EXPR.focused, t, { a: r > 0 || t > C[14] ? undefined : 'pick', squash: t > C[13] && t < C[13] + .25 ? .12 * Math.sin((t - C[13]) / .25 * Math.PI) : 0 }),
    act('ned', NED, [lerp(-1.1, .5, r), 0, fz(.8)], r > 0 ? frontRun(t - runT - .3, 2.8) : pose({ turn: -.5 }, t, .3), t > C[14] ? EXPR.panic : EXPR.neutral, t)];
  return frame(t, cam, { cage: { pos: FACE_CAGE, swing: st === 'sway' ? .05 : .02 }, bird: { state: st, k: ss(C[11], drop, t) }, actors: men, extra: [camLamp([0, 2.4, FACE_Z + 2.6], 7)],
    shake: t > drop && t < drop + .15 ? .015 : r > 0 ? .006 : 0, overlay: card('GET OUT', 'NOW!', ss(C[14], C[14] + .2, t) * (1 - ss(C[15] - .3, C[15], t)), 300) + captions(F, t) }, t < C[13] ? .6 : .2);
});
// 6 — "the part almost nobody knows": darkness… two cap-lamps approach: a rescue team carrying the OXYGEN cage (low tracking shot)
shot(C[15], C[18], t => {
  const k = kk(t, C[15], C[18]); const z = lerp(-8, -17, k); const p1: V3 = [-.45, 0, z], p2: V3 = [.5, 0, z + 1.1]; const hb: [number, number] = [.55, -2.0];
  const bp = handW(p1, hb); bp[1] -= .48; bp[2] += .08;
  const keys: Key[] = [{ t: C[15], pos: [.2, .55, z - 5.2], look: [0, 1.2, z], fov: 44 }, { t: C[16] + .2, pos: [.1, .9, z - 2.6], look: [bp[0], bp[1] + .3, bp[2]], fov: 36 }, { t: C[17], pos: [.3, 1.0, z - 1.4], look: [bp[0], bp[1] + .25, bp[2]], fov: 30 }, { t: C[18], pos: [.9, .6, z - 3.4], look: [0, 1.4, z], fov: 44 }];
  const cam = rig(keys, t);
  return frame(t, cam, { lampsOn: .15, dust: .9, box: { pos: bp, rotY: -.3, door: 1, valve: 0, o2: 0 }, bird: { state: 'down', inBox: true },
    actors: [act('r1', RESCUE1, p1, frontWalk(t - C[15], 1.4, .1, hb), EXPR.determined, t, { rim: '#ffe2b0' }), act('r2', RESCUE2, p2, frontWalk(t - C[15] + .4, 1.4, -.1), EXPR.concentrating, t, { a: 'lamp', rim: '#ffe2b0' })],
    extra: [camLamp([p1[0], 2.05, z - .2], 6), camLamp([p2[0], 2.05, z + .9], 5), camLamp([bp[0] + .5, bp[1] + .6, bp[2] - 1.1], 1.6 * ss(C[16] - .5, C[16], t))], overlay: chip('OXYGEN', 260, ss(C[16] + .3, C[16] + .6, t), '#5fd1ff') + chip('RESCUE TEAMS', 370, ss(C[17], C[17] + .3, t), '#ffd23f') + captions(F, t) }, .5);
});
// 7 — shut the little door… open the valve… oxygen floods in… the bird comes back (orbit from the box to the rescuer's relief)
const BOX: V3 = [-.2, 1.03, -18.6];
shot(C[18], C[20], t => {
  const shut = ss(C[18] + .1, C[18] + .6, t), valve = ss(C[18] + 1.3, C[18] + 1.9, t), o2 = ss(C[18] + 1.7, C[18] + 2.4, t), rev = ss(C[19] + .2, C[19] + 1.4, t);
  const st: BirdState = rev < .3 ? 'down' : rev < .9 ? 'pant' : 'revive';
  const keys: Key[] = [{ t: C[18], pos: [BOX[0] + .55, BOX[1] + .3, BOX[2] + .7], look: [BOX[0] + .05, BOX[1] + .14, BOX[2]], fov: 32 }, { t: C[18] + 1.4, pos: [BOX[0] + .55, BOX[1] + .8, BOX[2] + .8], look: [BOX[0] - .1, BOX[1] + .38, BOX[2]], fov: 30 },
    { t: C[19] + .6, pos: [BOX[0] - .25, BOX[1] + .22, BOX[2] + .55], look: [BOX[0], BOX[1] + .16, BOX[2]], fov: 28 }, { t: C[20], pos: [BOX[0] - .9, BOX[1] + .6, BOX[2] + 1.6], look: [BOX[0] + .35, BOX[1] + .45, BOX[2] - .4], fov: 38 }];
  const cam = rig(keys, t);
  return frame(t, cam, { lampsOn: .2, box: { pos: BOX, rotY: -.2, door: 1 - shut, valve, o2: o2 * (1 - rev * .9) }, bird: { state: st, inBox: true },
    actors: t > C[19] + .5 ? [act('r1', RESCUE1, [BOX[0] + .55, 0, BOX[2] - .5], pose({ turn: -.4, handA: [-.6, -2.3], shapeA: 'open', frontA: 1, lean: .06 }, t, .3), st === 'revive' ? EXPR.relief : EXPR.concern, t, { rim: '#ffe2b0' })] : [],
    extra: [camLamp([BOX[0] + 1.2, BOX[1] + 1.0, BOX[2] + 1.4], 2.2), { p: [BOX[0], BOX[1] + .2, BOX[2] + .3], c: [.5, .85, 1], i: .5 * o2, d: 1 }],
    overlay: chip('SHUT THE DOOR', 260, shut * (1 - valve), '#ffd23f') + chip('OPEN THE VALVE', 260, valve * (1 - rev), '#5fd1ff') + chip('REVIVED', 260, ss(.85, .95, rev), '#5fd16f') + captions(F, t) }, .7);
});
// 8 — until 1986: the bird sings on its hook while the men work; crane back and up the roadway past the lamps. End card.
shot(C[20], 60.01, t => {
  const k = kk(t, C[20], 60);
  const keys: Key[] = [{ t: C[20], pos: [CAGE_HANG[0] - .5, CAGE_HANG[1] + .2, CAGE_HANG[2] + .6], look: [CAGE_HANG[0], CAGE_HANG[1] + .2, CAGE_HANG[2]], fov: 32 },
    { t: C[21] + .5, pos: [.2, 2.25, CAGE_HANG[2] + 3.2], look: [CAGE_HANG[0] - .3, 1.8, CAGE_HANG[2] - 1], fov: 40 }, { t: 60, pos: [0, 2.55, CAGE_HANG[2] + 9], look: [0, 1.6, CAGE_HANG[2] - 3], fov: 46 }];
  const cam = rig(keys, t);
  const sw = (ph: number) => Math.sin(t * 2.4 + ph);
  return frame(t, cam, { cage: { pos: CAGE_HANG, swing: .02 }, bird: { state: 'chirp' },
    actors: [act('tom', TOM, [-.5, 0, CAGE_HANG[2] - 2.2], pose({ turn: -.5, handA: [-.9 - sw(0) * .3, -2.4 - sw(0) * .5], handB: [-.35, -2.2 - sw(0) * .4], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1, headTurn: .4 * ss(C[21], C[21] + .4, t) }, t, .3), EXPR.happy, t, { a: 'pick' }),
      act('sam', SAM, [.6, 0, CAGE_HANG[2] - 3.4], pose({ turn: .3, headLift: .05 }, t, .4), EXPR.calm, t)],
    grade: { ...GR, fade: ss(59.3, 60, t) * .9 }, overlay: chip('BRITISH MINES · UNTIL 1986', 260, ss(C[20] + .3, C[20] + .6, t), '#ffd23f') + card('THE CANARY', 'THE MINER\'S EARLY WARNING', ss(C[21] + 2.6, C[21] + 3.1, t), 300) + captions(F, t) } as Partial<MineFrame>, .4);
  void k;
});

export function frameAt(n: number): MineFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
