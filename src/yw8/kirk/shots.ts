// YunoWorld v8 · "Why would anyone lock a GRAVE inside an iron cage?" — the mortsafe. 60 s.
// Verified: mortsafes (iron cages) protected graves in Scotland in the early 1800s from resurrectionists who dug up fresh
// bodies to sell to anatomy schools (before 1832 the main legal supply was executed criminals); mortsafes were very heavy
// (around a ton), stayed on for about six weeks until the body was useless for dissection, then were lifted (with tackle) and
// reused, often rented out (fees by the day); the Anatomy Act 1832 gave schools a legal supply and the trade died away;
// some mortsafes survive in Scottish churchyards (e.g. Greyfriars, Edinburgh; Aberdeenshire).
import { STAND, idle, walkPose, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { lerp, ss, type V3, type ActorState } from '../../yw3/core.ts';
import type { T7Look, T7Prop } from '../../yw7/toon7.ts';
import { rig, ease, type Key } from '../../yw7/cam7.ts';
import { GRAVE, SCHOOL, type KirkFrame } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.mortsafe; const F = 'mortsafe'; const w = (word: string, n = 1, fb = 0) => wt(F, word, n, fb);
const SN1: T7Look = { skin: '#e2b48e', hair: '#2a1e16', hairStyle: 'short', nose: 'hook', head: { w: .88, h: 1.08, jaw: 1.1, chin: 1.15 }, top: '#3a3a34', topKind: 'coat', inner: '#6a5a4a', pants: '#2a2824', boots: '#1a1612', hat: 'flatcap', hatColor: '#2a2622', beard: 'stubble', beardColor: '#2a1e16', eyes: '#4a5a3a', build: .92 };
const SN2: T7Look = { skin: '#d49a72', hair: '#6a3a1e', hairStyle: 'curly', nose: 'round', head: { w: 1.08, jaw: 1.0, cheek: 1.1 }, top: '#4a3e30', topKind: 'jacket', inner: '#a8987a', pants: '#36302a', boots: '#1e1814', hat: 'bowler', hatColor: '#2a2420', beard: 'chops', beardColor: '#6a3a1e', eyes: '#3a2a1a', build: 1.12, belly: 1 };
const DOC: T7Look = { skin: '#f0caa8', hair: '#8a8a88', hairStyle: 'swept', nose: 'long', head: { w: .9, h: 1.05, jaw: .95 }, top: '#22222a', topKind: 'suit', inner: '#f2ede2', tie: '#1a1a1a', pants: '#26262c', boots: '#121010', glasses: true, beard: 'chops', beardColor: '#9a9a98', eyes: '#4a5a7a', age: .6 };
const WIDOW: T7Look = { skin: '#f0c8a8', hair: '#3a2a20', hairStyle: 'bun', nose: 'snub', head: { w: .92, jaw: .85, chin: .95 }, top: '#1e1e24', topKind: 'dress', inner: '#2a2a30', trim: '#3a3a44', pants: '#1e1e24', boots: '#141010', hat: 'bonnet', hatColor: '#1a1a20', skirt: true, eyes: '#4a6a8a' };
const SON: T7Look = { skin: '#f0c8a8', hair: '#3a2a20', hairStyle: 'side', nose: 'snub', head: { w: .95, jaw: .95 }, top: '#2a2a30', topKind: 'jacket', inner: '#e8e2d4', pants: '#2a2a30', boots: '#141010', eyes: '#4a6a8a', build: .95 };
const SEXTON: T7Look = { skin: '#d8a888', hair: '#c8c8c4', hairStyle: 'short', nose: 'round', head: { w: 1.04, jaw: 1.05, cheek: 1.08 }, top: '#5a4a38', topKind: 'waistcoat', inner: '#d8ccb0', pants: '#3a342c', boots: '#2a1e14', hat: 'flatcap', hatColor: '#4a4034', beard: 'full', beardColor: '#d8d8d4', sleeves: 'rolled', eyes: '#3a4a5a', age: .7, build: 1.05 };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
type Opt = Partial<ActorState> & { a?: T7Prop; b?: T7Prop };
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Opt = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1100, seed: id.length * 7 + 1, t7A: o.a, t7B: o.b, rim: '#ffd0a0', rimSide: 1, ...o });
const walk = (t: number, t0: number, sp: number, turn: number) => walkPose((t - t0) * sp, 1, { turn }) as Pose;
const dig = (t: number): Pose => { const s = Math.sin(t * 5.5); return pose({ turn: .6, lean: .25 + s * .12, crouch: .25 + s * .1, handA: [.35, -2.6 + s * .35], handB: [.55, -1.9 + s * .3], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1 }, t, .2); };
const NIGHT = { set: 'kirk', night: 1, sun: { dir: [-.45, .55, -.6] as V3, color: '#9fb4e8', i: .85, focus: GRAVE, size: 22 }, hemi: { sky: '#34405e', ground: '#141820', i: .55 }, fog: { color: '#1a2030', density: .03 } };
const DAY = { set: 'kirk', night: 0, sun: { dir: [.5, .65, .45] as V3, color: '#f2ece2', i: 2.1, focus: GRAVE, size: 22 }, hemi: { sky: '#b4c2d6', ground: '#5a5a48', i: 1.0 }, fog: { color: '#b8c2cc', density: .012 }, mist: 0, moon: 0, windows: 0 };
const GR = { sat: 1.04, contrast: 1.09, bloom: .3, bloomTh: 1.2, vignette: .3, exposure: 1.02, lift: [.025, .03, .055] as [number, number, number], gain: [1.03, 1, .96] as [number, number, number], grain: .03 };
type S = { a: number; b: number; f: (t: number) => KirkFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => KirkFrame) => SH.push({ a, b, f });
const frame = (t: number, cam: ReturnType<typeof rig>, o: Partial<KirkFrame>, ap = 0, base: object = NIGHT): KirkFrame => ({ t, ...base, cam, grade: { ...GR, focus: cam.focusDist ?? 6, aperture: ap }, ...o } as KirkFrame);
const LAN = (p: V3, on = 1) => ({ p, on });

// 1 — HOOK: low, slow push between moonlit headstones onto an iron cage over a grave… orbit the bars… a body snatcher creeps up — and recoils.
shot(0, C[3], t => {
  const keys: Key[] = [{ t: 0, pos: [-2.6, .6, 5.6], look: [0, .6, 0], fov: 44 }, { t: C[1], pos: [-1.6, .8, 3.2], look: [0, .7, 0], fov: 38, focus: [0, .7, 1.15] },
    { t: C[2], pos: [1.3, 1.0, 2.6], look: [0, .75, 0], fov: 36, focus: [0, .7, 1.1] }, { t: C[3], pos: [3.6, 1.6, 4.6], look: [1.3, 1.1, .8], fov: 42 }];
  const cam = rig(keys, t); const come = ss(C[2] - .8, C[2] + .2, t); const shock = ss(w('out', 1, C[2] + 1) - .1, w('out', 1, C[2] + 1) + .15, t);
  const p: V3 = [lerp(3.6, 1.7, come) + shock * .25, 0, lerp(3.2, 1.6, come)];
  return frame(t, cam, { cage: {}, lanterns: [LAN([p[0] - .35, .9, p[2] + .1])], shake: shock * (1 - ss(C[2] + 1.6, C[2] + 2.2, t)) * .02,
    actors: come > .01 ? [act('sn1', SN1, p, shock > .3 ? pose({ turn: -.6, lean: -.18, handA: [-.9, -3.4], handB: [.6, -3.2], shapeA: 'open', shapeB: 'open', frontA: 1, frontB: 1, headLift: .08 }, t, .3) : walk(t, 0, 1.2, -.6), shock > .3 ? EXPR.shocked : EXPR.suspicious, t, { b: 'lamp', squash: shock * .1 })] : [],
    overlay: captions(F, t) }, .35);
});
// 2 — "Scotland, the early 1800s": crane over the kirkyard by day … the anatomy school … only executed criminals were legal.
shot(C[3], C[6], t => {
  if (t < C[4]) { const keys: Key[] = [{ t: C[3], pos: [8, 3, 18], look: [-3, 4, -10], fov: 50 }, { t: C[4], pos: [14, 14, 22], look: [-4, 4, -14], fov: 52 }]; const cam = rig(keys, t);
    return frame(t, cam, { cage: { show: false }, mound: 1, overlay: chip('SCOTLAND', 260, ss(C[3] + .2, C[3] + .5, t)) + chip('EARLY 1800s', 370, ss(C[3] + .7, C[3] + 1, t), '#5fd1ff') + captions(F, t) }, 0, DAY); }
  const S0 = SCHOOL; const keys: Key[] = [{ t: C[4], pos: [S0[0] - 7, 1.6, 12], look: [S0[0], 4, -2], fov: 50 }, { t: C[5], pos: [S0[0] - 2, 1.7, 5.5], look: [S0[0], 3.2, -2], fov: 46 }, { t: C[6], pos: [S0[0] + 1.6, 1.8, 4.6], look: [S0[0] + .1, 1.6, 1.2], fov: 42 }];
  const cam = rig(keys, t); const arrive = ss(C[4], C[5] + .3, t); const dp: V3 = [S0[0] + lerp(-4, .2, arrive), 0, lerp(6, 1.2, arrive)];
  return frame(t, cam, { cage: { show: false }, actors: [act('doc', DOC, dp, arrive < .95 ? walk(t, C[4], 1.1, .5) : pose({ turn: .2, handA: [-.8, -2.9], shapeA: 'point', frontA: 1, headTilt: -.08, browOne: 1 } as Partial<Pose>, t, .4), t > C[5] ? EXPR.annoyed : EXPR.concentrating, t)],
    overlay: chip('MEDICAL SCHOOLS', 260, ss(C[4] + .3, C[4] + .6, t) * (1 - ss(C[5], C[5] + .3, t)), '#5fd1ff') + chip('LEGAL SUPPLY: EXECUTED CRIMINALS', 260, ss(C[5] + .4, C[5] + .7, t), '#ff8a5a') + captions(F, t) }, .3, { ...DAY, sun: { ...DAY.sun, focus: S0 } });
});
// 3 — night: two men climb the dyke with a lantern and spade, track low along the stones, dig… the cart at the anatomy school… "resurrection men".
shot(C[6], C[10], t => {
  if (t < C[7]) { const k = ss(C[6], C[7], t); const keys: Key[] = [{ t: C[6], pos: [-6, .5, 18], look: [-3, 1.1, 22], fov: 46 }, { t: C[7], pos: [-2.5, .7, 9], look: [-1.5, 1.0, 6], fov: 44 }]; const cam = rig(keys, t);
    const p1: V3 = [lerp(-3.2, -1.6, k), 0, lerp(22, 7, k)], p2: V3 = [lerp(-2.6, -.6, k), 0, lerp(23.5, 8.4, k)];
    return frame(t, cam, { cage: { show: false }, mound: 1, lanterns: [LAN([p1[0] - .35, .9, p1[2]])], actors: [act('sn1', SN1, p1, { ...walk(t, C[6], 1.0, -.35), crouch: .25 } as Pose, EXPR.nervous, t, { b: 'lamp' }), act('sn2', SN2, p2, { ...walk(t + .3, C[6], 1.0, -.35), crouch: .2 } as Pose, EXPR.suspicious, t, { a: 'shovel' })], overlay: captions(F, t) }, .2); }
  if (t < C[8]) { const keys: Key[] = [{ t: C[7], pos: [-2.6, 1.1, 2.9], look: [.3, .7, -.4], fov: 44 }, { t: C[8], pos: [2.6, 1.3, 2.6], look: [.2, .7, -.4], fov: 44 }]; const cam = rig(keys, t); const d = ss(C[7], C[8] + .5, t);
    return frame(t, cam, { cage: { show: false }, mound: 1 - d * .6, dig: d, lanterns: [LAN([-.9, 0, .6])], actors: [act('sn2', SN2, [.75, 0, -.4], dig(t), EXPR.concentrating, t, { a: 'shovel' }), act('sn1', SN1, [-1.2, 0, .2], pose({ turn: .5, headTurn: -.4, crouch: .3, handA: [-.4, -2.4], frontA: 1 }, t, .5), EXPR.nervous, t)], overlay: captions(F, t) }, .25); }
  const S0 = SCHOOL; const roll = ss(C[8], C[9], t);
  const keys: Key[] = [{ t: C[8], pos: [S0[0] - 9, 1.2, 9], look: [S0[0] - 3, 1.1, 3], fov: 46 }, { t: C[9], pos: [S0[0] - 3.8, 1.6, 8.2], look: [S0[0] - 2.4, 1.35, 3.3], fov: 42 }, { t: C[10], pos: [S0[0] - 2.9, 1.65, 6.6], look: [S0[0] - 2.6, 1.45, 3.3], fov: 36, focus: [S0[0] - 2.6, 1.5, 3.3] }];
  const cam = rig(keys, t); const cx = S0[0] - 8 + roll * 5.5; const grin = ss(C[9], C[9] + .6, t);
  return frame(t, cam, { cage: { show: false }, cart: { x: cx, sack: true }, lanterns: [LAN([S0[0] - 2.8, 1.0, 3.6])], windows: 1, actors: [
    act('sn1', SN1, [cx - 2.1, 0, 3.2], roll < .98 ? walk(t, C[8], 1.1, .5) : pose({ turn: .3, handA: [-.6, -2.9], shapeA: 'open', frontA: 1 }, t, .4), grin > .3 ? EXPR.smirk : EXPR.determined, t, { b: 'lamp' }),
    act('sn2', SN2, [S0[0] - 1.6, 0, 3.4], pose({ turn: -.4, handB: [.7, -2.6], shapeB: 'open', frontB: 1 }, t, .4), grin > .3 ? EXPR.happy : EXPR.suspicious, t),
    act('doc', DOC, [S0[0] - .2, .5, 1.9], pose({ turn: -.5, handA: [-.8, -2.6], shapeA: 'hold', frontA: 1, headTilt: .06 }, t, .4), EXPR.suspicious, t)],
    overlay: chip('SOLD TO ANATOMISTS', 260, ss(C[8] + .3, C[8] + .6, t) * (1 - ss(C[9], C[9] + .3, t)), '#ff8a5a') + chip('“RESURRECTION MEN”', 260, ss(C[9] + .5, C[9] + .8, t), '#ffd23f') + captions(F, t) }, .3);
});
// 4 — day: a widow and her son at a fresh grave (fear) … the sexton lowers a heavy iron cage on sheerlegs — CLANG … "around a TON".
shot(C[10], C[13], t => {
  if (t < C[11]) { const keys: Key[] = [{ t: C[10], pos: [3.2, 1.6, 3.6], look: [0, 1.2, 0], fov: 44 }, { t: C[11], pos: [-1.6, 1.5, 3.8], look: [.2, 1.25, .4], fov: 40 }]; const cam = rig(keys, t);
    return frame(t, cam, { cage: { show: false }, mound: 1, actors: [act('wid', WIDOW, [-.9, 0, 1.6], pose({ turn: .3, handA: [-.3, -2.9], handB: [.3, -2.9], frontA: 1, frontB: 1, headTilt: .1 }, t, .3), EXPR.scared, t), act('son', SON, [.6, 0, 1.9], pose({ turn: -.3, headTurn: .2, handB: [.5, -2.7], frontB: 1 }, t, .4), EXPR.nervous, t)], overlay: captions(F, t) }, .25, DAY); }
  const drop = ss(C[11] + .2, C[12] - .25, t); const land = w('ton', 1, C[12] + 1); const thud = Math.max(0, 1 - Math.abs(t - (C[12] - .25)) * 6);
  const keys: Key[] = [{ t: C[11], pos: [4.6, 2.2, 4.2], look: [0, 1.6, 0], fov: 48 }, { t: C[12], pos: [3.4, 1.1, 3.0], look: [0, 1.0, 0], fov: 44 }, { t: C[13], pos: [1.8, .25, 2.6], look: [0, 1.0, 0], fov: 40 }];
  const cam = rig(keys, t); const pull = Math.sin(t * 6) * .5 + .5;
  return frame(t, cam, { cage: { lift: lerp(1.6, 0, drop) }, tackle: true, mound: 1, shake: thud * .03, actors: [
    act('sex', SEXTON, [-1.6, 0, 1.4], drop < .98 ? pose({ turn: .45, lean: -.08, handA: [-.1, lerp(-3.6, -3.0, pull)], handB: [.05, lerp(-3.0, -2.5, pull)], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1 }, t, .2) : pose({ turn: .3, handA: [-.6, -2.4], frontA: 1 }, t, .4), drop < .98 ? EXPR.determined : EXPR.relief, t),
    act('son', SON, [1.9, 0, 1.6], pose({ turn: -.5, lean: .1, handA: [-.7, -2.2], handB: [-.2, -2.4], shapeA: 'grip', frontA: 1 }, t, .4), t > land ? EXPR.surprise : EXPR.concentrating, t, { squash: Math.max(0, 1 - Math.abs(t - land) * 3) * .12 })],
    overlay: chip('IRON MORTSAFE', 260, ss(C[11] + .4, C[11] + .7, t) * (1 - ss(C[12], C[12] + .3, t)), '#5fd1ff') + card('≈ 1 TON', 'OF IRON', ss(land, land + .12, t) * (1 - ss(C[13] - .3, C[13], t)), 320) + captions(F, t) }, 0, DAY);
});
// 5 — six weeks in a time-lapse of days and nights … the snatchers find the cage and give up … lifted off, moved on … rented by the day.
shot(C[13], C[17], t => {
  if (t < C[14]) { const k = ss(C[13], C[14], t); const cyc = .5 - .5 * Math.cos(k * Math.PI * 12); const keys: Key[] = [{ t: C[13], pos: [6, 3.2, 7], look: [0, .8, 0], fov: 46 }, { t: C[14], pos: [-5, 3.6, 7.4], look: [0, .8, 0], fov: 46 }];
    const cam = rig(keys, t, { easing: (x: number) => x }); const week = Math.min(6, 1 + Math.floor(k * 6));
    return frame(t, cam, { night: cyc, mist: cyc * .6, moon: cyc, windows: cyc * .8, cage: {}, mound: 1 - k * .2, sun: { dir: [Math.cos(k * 40), .6, Math.sin(k * 40)] as V3, color: cyc > .5 ? '#9fb4e8' : '#f2ece2', i: lerp(2.0, .8, cyc), focus: GRAVE, size: 22 },
      hemi: { sky: cyc > .5 ? '#34405e' : '#b4c2d6', ground: '#3a3a30', i: lerp(1.0, .55, cyc) }, fog: { color: cyc > .5 ? '#1a2030' : '#b8c2cc', density: lerp(.012, .03, cyc) }, overlay: card(`WEEK ${week}`, 'OF 6', ss(C[13] + .2, C[13] + .5, t), 300) + captions(F, t) }, 0, DAY); }
  if (t < C[15]) { const keys: Key[] = [{ t: C[14], pos: [-2.8, 1.2, 3.6], look: [.6, 1.0, .4], fov: 42 }, { t: C[15], pos: [-3.4, 1.4, 5], look: [1.2, 1.0, 2.2], fov: 44 }]; const cam = rig(keys, t); const give = ss(C[14] + 1.0, C[14] + 1.6, t), leave = ss(C[14] + 1.8, C[15], t);
    return frame(t, cam, { cage: {}, lanterns: [LAN([1.3, .9, 1.5 + leave * 2])], actors: [act('sn1', SN1, [1.4 + leave * .5, 0, 1.4 + leave * 2.6], leave > .02 ? walk(t, C[14], 1.1, -.7) : pose({ turn: -.3, handA: [-.7, -2.4], shapeA: 'fist', frontA: 1, lean: .08 }, t, .4), give > .3 ? EXPR.angry : EXPR.suspicious, t, { b: 'lamp' }),
      act('sn2', SN2, [2.4 + leave * .5, 0, .8 + leave * 2.6], leave > .02 ? walk(t + .4, C[14], 1.1, -.7) : pose({ turn: -.5, headTilt: .1, handA: [-.3, -3.4], shapeA: 'open', frontA: 1 }, t, .4), give > .3 ? EXPR.confused : EXPR.surprise, t, { a: 'shovel' })], overlay: chip('NO USE TO A SURGEON', 260, ss(C[14] + .4, C[14] + .7, t), '#ff8a5a') + captions(F, t) }, .25); }
  if (t < C[16]) { const up = ss(C[15], C[15] + 2.2, t); const keys: Key[] = [{ t: C[15], pos: [3.8, .6, 3.4], look: [0, 1.0, 0], fov: 46 }, { t: C[16], pos: [5.2, 4.6, 5.4], look: [0, 1.8, 0], fov: 50 }]; const cam = rig(keys, t); const pull = Math.sin(t * 6) * .5 + .5;
    return frame(t, cam, { cage: { lift: up * 1.7 }, tackle: true, mound: .8, actors: [act('sex', SEXTON, [-1.6, 0, 1.4], pose({ turn: .45, lean: -.1, handA: [-.1, lerp(-3.6, -3.0, pull)], handB: [.05, lerp(-3.0, -2.5, pull)], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1 }, t, .2), EXPR.determined, t)], overlay: chip('ON TO THE NEXT GRAVE', 260, ss(C[15] + .6, C[15] + .9, t), '#5fd16f') + captions(F, t) }, 0, DAY); }
  const keys: Key[] = [{ t: C[16], pos: [-2.4, 1.7, 3.2], look: [-1.0, 1.55, .6], fov: 38 }, { t: C[17], pos: [-.6, 1.6, 2.6], look: [-.8, 1.5, .4], fov: 34 }]; const cam = rig(keys, t); const coin = ss(w('day', 1, C[16] + 1.5) - .2, w('day', 1, C[16] + 1.5) + .2, t);
  return frame(t, cam, { cage: { lift: 1.7 }, tackle: true, mound: .8, actors: [act('sex', SEXTON, [-1.0, 0, .5], pose({ turn: .1, handA: [-.4, lerp(-2.4, -2.9, coin)], shapeA: 'hold', frontA: 1, handB: [.35, -2.6], shapeB: 'point', frontB: 1, headTilt: -.05 }, t, .3), EXPR.happy, t, { a: 'paper' })],
    overlay: chip('RENTED OUT', 260, ss(C[16] + .2, C[16] + .5, t), '#ffd23f') + chip('PAID BY THE DAY', 370, ss(coin - .1, coin + .2, t), '#5fd16f') + captions(F, t) }, .3, DAY);
});
// 6 — 1832: the Anatomy Act … the trade dies (an abandoned spade, a lantern going out) … today: a rusted cage still stands. End card.
shot(C[17], 60.01, t => {
  if (t < C[18]) { const S0 = SCHOOL; const keys: Key[] = [{ t: C[17], pos: [S0[0] + 6, 2.2, 11], look: [S0[0], 5, -2], fov: 50 }, { t: C[18], pos: [S0[0] + 1.5, 1.6, 5.2], look: [S0[0], 1.8, 1.2], fov: 42 }]; const cam = rig(keys, t);
    return frame(t, cam, { cage: { show: false }, actors: [act('doc', DOC, [S0[0], .5, 1.6], pose({ turn: -.1, handA: [-.6, -3.0], shapeA: 'hold', frontA: 1, headLift: .05 }, t, .4), EXPR.relief, t, { a: 'paper' })], overlay: card('ANATOMY ACT', '1832', ss(C[17] + .5, C[17] + .9, t), 300) + captions(F, t) }, .2, { ...DAY, sun: { ...DAY.sun, focus: S0 } }); }
  if (t < C[19]) { const keys: Key[] = [{ t: C[18], pos: [1.8, .4, 2.2], look: [.4, .5, 0], fov: 40 }, { t: C[19], pos: [2.4, .9, 3.2], look: [0, .6, 0], fov: 44 }]; const cam = rig(keys, t, { easing: ease.inOut5 });
    return frame(t, cam, { cage: {}, mound: 1, spade: { p: [.75, .55, .9], rot: [0, .4, .35] }, lanterns: [LAN([.4, 0, 1.1], 1 - ss(C[18] + .5, C[18] + 1.6, t) * .85)], hemi: { sky: '#46527a', ground: '#1a1e28', i: .8 }, overlay: captions(F, t) }, .3); }
  const keys: Key[] = [{ t: C[19], pos: [2.6, .7, 3.4], look: [0, .7, 0], fov: 40 }, { t: 60, pos: [7, 6, 10], look: [-1, 1.6, -4], fov: 50 }]; const cam = rig(keys, t);
  return frame(t, cam, { ...DAY, cage: {}, mound: 0, grade: { ...GR, sat: 1.0, fade: ss(59.3, 60, t) * .9, focus: cam.focusDist ?? 6, aperture: 0 }, overlay: chip('STILL STANDING TODAY', 260, ss(C[19] + .5, C[19] + .8, t) * (1 - ss(57.6, 57.9, t)), '#5fd16f') + card('THE MORTSAFE', 'SCOTLAND · c.1810–1832', ss(58, 58.4, t), 300) + captions(F, t) }, 0, DAY);
});

export function frameAt(n: number): KirkFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
