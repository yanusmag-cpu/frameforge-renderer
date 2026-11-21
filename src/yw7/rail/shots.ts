// YunoWorld v7 · Film 2 — "They used to put EXPLOSIVES on train tracks… to STOP trains from crashing." 60 s.
// Facts: railway detonators (fog signals) are coin-sized, strapped to the railhead with two lead straps; a wheel sets them off
// with a loud bang; used when fog hid the signals — fogmen placed them at signals showing danger; usually in twos/threes;
// invented c.1841 by Edward Alfred Cowper; still carried by trains as an emergency warning.
import { STAND, idle, walkPose, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { lerp, ss, kk, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look, T7Prop } from '../toon7.ts';
import { rig, breathe, orbitKeys, ease, type Key } from '../cam7.ts';
import { RAIL_Z, type RailFrame, type Det } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.detonator; const F = 'detonator'; const w = (word: string, n = 1, fb = 0) => wt(F, word, n, fb);
const FOGMAN: T7Look = { skin: '#f2c8a2', hair: '#6a4a2a', hairStyle: 'side', nose: 'round', head: { w: 1.05, cheek: 1.08, jaw: .9 }, top: '#3a4a6a', topKind: 'coat', inner: '#d8ccb0', pants: '#2e3440', boots: '#1e1a18', hat: 'flatcap', hatColor: '#5a5048', beard: 'chops', beardColor: '#6a4a2a', build: 1.12, belly: 1, eyes: '#4a6a8a' };
const DRIVER: T7Look = { skin: '#e8b890', hair: '#4a3a2a', hairStyle: 'short', nose: 'hook', head: { w: .92, h: 1.06, jaw: 1.1, chin: 1.1 }, top: '#2e3e5e', topKind: 'jacket', inner: '#c8c0b0', pants: '#2e3e5e', boots: '#141210', hat: 'driver', hatColor: '#2a2a32', beard: 'stache', beardColor: '#3a2a1a', soot: .3, eyes: '#3a4a3a' };
const FIREMAN: T7Look = { skin: '#d8a078', hair: '#2a1a10', hairStyle: 'short', nose: 'snub', head: { w: .96, jaw: .95 }, top: '#7a6a5a', topKind: 'shirt', pants: '#3a3430', boots: '#1e1814', hat: 'flatcap', hatColor: '#3a3430', soot: .7, build: .95, sleeves: 'rolled', belt: '#2a1e14' };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
type Opt = Partial<ActorState> & { a?: T7Prop; b?: T7Prop };
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Opt = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1100, seed: id.length * 5 + 2, t7A: o.a, t7B: o.b, rim: '#fff0d8', rimSide: 1, ...o });
const crouchPose = (t: number, reach = 1, dir = -1): Pose => pose({ turn: .75 * dir, crouch: 1.05, lean: .35 * dir, footA: [-.45, -.08], footB: [.35, -.08], kneeUp: true, handB: [lerp(.3, 1.0, reach) * -dir, lerp(-1.6, -.75, reach)], handA: [.2 * -dir, -1.5], shapeB: 'point', frontB: 1, headTilt: .15 * dir }, t, .2);
const FOG = (k: number, col = '#aab4be') => ({ fog: { color: col, density: k }, bg: col });
const BASE = { set: 'rail', hemi: { sky: '#c8d2dc', ground: '#5a6a4a', i: 1.0 }, sun: { dir: [-.6, .45, .55] as V3, color: '#ffe6c4', i: 1.5, focus: [0, 0, 0] as V3, size: 16 } };
const GR = { sat: 1.03, contrast: 1.08, bloom: .32, bloomTh: 1.2, vignette: .28, exposure: 1.0, lift: [.03, .035, .05] as [number, number, number], gain: [1.03, 1, .97] as [number, number, number], grain: .03 };
const DX = [-20, -16, -12];                                    // three detonators, spaced along the near rail
const breath = (p: V3, t: number, n = 4): Sprite[] => Array.from({ length: n }, (_, i) => { const a = ((t * .6 + i / n) % 1); return { p: [p[0] + a * .35, p[1] + a * .15, p[2] + .1], s: .12 + a * .35, rot: i, c: [.95, .96, 1], a: .28 * (1 - a) * (Math.sin(t * 2.2) > -.2 ? 1 : 0), kind: 0, seed: i, age: a }; });
type S = { a: number; b: number; f: (t: number) => RailFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => RailFrame) => SH.push({ a, b, f });
const frame = (t: number, cam: ReturnType<typeof rig>, o: Partial<RailFrame>, ap = 0, fogK = .045): RailFrame =>
  ({ t, ...BASE, ...FOG(fogK), cam, grade: { ...GR, focus: cam.focusDist ?? 6, aperture: ap }, ...o } as RailFrame);
const det = (i: number, burst = -1): Det => ({ x: DX[i], z: RAIL_Z, burst });
// locomotive timing: front bogie wheel (loco.x + 3.8) reaches DX[0] exactly on "BANG"
const BANG = () => w('bang', 1, C[12]) ; const V = 9;
const locoX = (t: number) => { const tb = BANG(); return DX[0] - 3.8 + V * (t - tb); };

// 1 — HOOK: rail-level macro in fog: a gloved hand presses a little disc onto the railhead… far down the line, two lamps appear.
shot(0, C[2], t => {
  const place = ss(.2, 1.4, t); const lamps = ss(C[1] - .3, C[2], t);
  const keys: Key[] = [{ t: 0, pos: [DX[0] + .55, .5, RAIL_Z + .5], look: [DX[0], .4, RAIL_Z], fov: 32, focus: [DX[0] + .25, .6, RAIL_Z + 1] }, { t: C[1], pos: [DX[0] + .9, .62, RAIL_Z + .75], look: [DX[0] - 1, .5, RAIL_Z], fov: 36 },
    { t: C[2], pos: [DX[0] + 1.6, .9, RAIL_Z + 1.4], look: [DX[0] - 20, 1.4, RAIL_Z - .3], fov: 40, focus: [DX[0] - 30, 1.5, 0] }];
  const cam = rig(keys, t);
  return frame(t, cam, { dets: [det(0)], loco: lamps > 0 ? { x: lerp(-130, -95, lamps), speed: 1, steam: .8 } : undefined,
    actors: [act('fog', FOGMAN, [DX[0] + .25, 0, RAIL_Z + 1.05], crouchPose(t, 1 - place * .4, -1), EXPR.concentrating, t)], overlay: captions(F, t) }, .45, .055);
});
// 2 — product shot: orbit the detonator… a coin beside it… the two lead straps bent under the railhead
shot(C[2], C[5], t => {
  const ok = orbitKeys(C[2], C[4], [DX[0], .42, RAIL_Z], .42, .9, -.6, .55, .5, .42, 28); const keys: Key[] = [...ok, { t: C[5], pos: [DX[0] + .05, .3, RAIL_Z + .32], look: [DX[0], .37, RAIL_Z], fov: 26 }];
  const cam = rig(keys, t);
  return frame(t, cam, { dets: [det(0)], coin: t > C[3] - .1, extra: [{ p: [DX[0] + .5, 1.2, RAIL_Z + .8], c: [1, .95, .85], i: 3, d: 4 }], overlay: chip('RAILWAY DETONATOR', 260, ss(C[2] + .3, C[2] + .6, t)) + chip('COIN-SIZED', 370, ss(C[3], C[3] + .3, t), '#ffd23f') + chip('TWO LEAD STRAPS', 370, ss(C[4] + .2, C[4] + .5, t) * 1, '#cfd6ff') + captions(F, t) }, .6, .05);
});
// 3 — fog: crane up into the murk (signal a ghost)… in the cab, the driver squints… the red lamp drowns in fog
shot(C[5], C[8], t => {
  if (t < C[6]) { const cam = rig([{ t: C[5], pos: [-14, .6, 2.4], look: [-6, 1.2, 0], fov: 40 }, { t: C[6], pos: [-24, 7.5, 9], look: [2, 3, -1], fov: 48 }], t);
    return frame(t, cam, { dets: [det(0)], arm: 0, lampCol: 'red', overlay: chip('FOG', 260, ss(C[5] + .4, C[5] + .7, t), '#cfd6ff') + captions(F, t) }, 0, .06); }
  if (t < C[7]) { const lx = lerp(-80, -72, kk(t, C[6], C[7])); const dp: V3 = [lx - 2.5, 1.6, .55];
    const cam = rig([{ t: C[6], pos: [lx - 4.3, 3.3, .95], look: [lx + 6, 3.0, .3], fov: 46 }, { t: C[7], pos: [lx - 4.0, 3.25, 1.05], look: [lx + 8, 3.0, .2], fov: 42 }], t);
    return frame(t, breathe(cam, t, .6), { loco: { x: lx, speed: 1 }, arm: 0, actors: [act('drv', DRIVER, dp, pose({ turn: .8, lean: .12, headLift: .04, handA: [.4, -2.2], handB: [.9, -2.3], frontA: 1, frontB: 1 }, t, .2), EXPR.suspicious, t, { rim: '#ffd9a0', rimSide: -1 }),
      act('fir', FIREMAN, [lx - 3.3, 1.6, -.4], pose({ turn: .5 }, t, .4), EXPR.concentrating, t)], overlay: captions(F, t) }, 0, .07); }
  const k = kk(t, C[7], C[8]); const sp: V3 = [6.05, 6.25, -2.0]; const g = t > w('green', 1, C[7] + .8);
  const cam = rig([{ t: C[7], pos: [sp[0] - 1.2, sp[1] - .6, sp[2] + 3.6], look: [sp[0], sp[1] - .1, sp[2]], fov: 34 }, { t: C[8], pos: [sp[0] + 2.5, sp[1] - 2.5, sp[2] + 13], look: sp, fov: 38 }], t);
  return frame(t, cam, { arm: g ? 1 : 0, lampCol: g ? 'green' : 'red', overlay: captions(F, t) }, 0, lerp(.05, .2, ss(.35, 1, k)));
});
// 4 — the fogman walks out with his lamp, kneels, clips a detonator… hours by the brazier… overhead: three of them along the rail
shot(C[8], C[11], t => {
  if (t < C[9]) { const k = kk(t, C[8], C[9]); const kneel = ss(.62, .78, k); const x = lerp(-8, DX[1] + .3, ss(0, .62, k)); const pos: V3 = [x, 0, RAIL_Z + 1.05];
    const cam = rig([{ t: C[8], pos: [-4, 1.4, 6.5], look: [-8, 1.2, 1], fov: 40 }, { t: C[9], pos: [DX[1] + 2.6, 1.0, 3.6], look: [DX[1], .7, RAIL_Z], fov: 38 }], t);
    return frame(t, cam, { dets: [det(0), ...(kneel > .9 ? [det(1)] : [])], actors: [act('fog', FOGMAN, pos, kneel > .05 ? crouchPose(t, kneel, -1) : { ...walkPose((t - C[8]) * 1.3, -1, { turn: .7 }), handB: [-.8, -2.3], shapeB: 'grip', frontB: 1 } as Pose, EXPR.concentrating, t, { b: kneel > .05 ? undefined : 'flaglamp' })], overlay: captions(F, t) }, .4, .05); }
  if (t < C[10]) { const bp: V3 = [-7.2, 0, -3.4]; const fp: V3 = [-6.4, 0, -3.0]; const cam = rig(orbitKeys(C[9], C[10], bp, 3.2, .3, 1.1, 1.6, 1.9, 1.2, 40), t);
    return frame(t, cam, { brazier: 1, sprites: breath([fp[0] - .25, 1.65, fp[2]], t), actors: [act('fog', FOGMAN, fp, pose({ turn: -.6, crouch: .1, handA: [-.75, -2.05], handB: [-.45, -2.15], shapeA: 'open', shapeB: 'open', frontA: 1, frontB: 1, headTilt: -.06 }, t, .25), EXPR.tired, t, { rim: '#ffb070', rimSide: -1 })],
      overlay: chip('FOR HOURS', 260, ss(C[9] + .3, C[9] + .6, t)) + captions(F, t) }, .3, .06); }
  const cam = rig([{ t: C[10], pos: [-12, 9, 3.6], look: [-16.5, .4, .2], fov: 46, roll: 0 }, { t: C[11], pos: [-13, 11, 1.6], look: [-16.5, .4, .3], fov: 48 }], t);
  return frame(t, cam, { dets: [det(0), det(1), det(2)], overlay: chip('2 OR 3 · SPACED APART', 260, ss(C[10] + .2, C[10] + .5, t), '#ffd23f') + captions(F, t) }, 0, .035);
});
// 5 — rail-level: the great driving wheel rolls in… BANG (flash, smoke, sparks)… BANG… BANG. In the cab, the driver jolts.
shot(C[11], C[14], t => {
  const tb = BANG(); const lx = locoX(t); const bursts = DX.map(x => tb + (x - DX[0]) / V);
  const ds = DX.map((x, i) => ({ x, z: RAIL_Z, burst: t >= bursts[i] ? t - bursts[i] : -1 }));
  const shake = bursts.reduce((s, b) => s + (t > b && t < b + .25 ? .04 * (1 - (t - b) / .25) : 0), 0);
  if (t < C[13]) { const cam = rig([{ t: C[11], pos: [DX[0] + 1.3, .42, RAIL_Z + .55], look: [DX[0] - 3, .7, RAIL_Z], fov: 40, focus: [DX[0], .42, RAIL_Z] }, { t: C[13], pos: [DX[0] + 2.8, .9, RAIL_Z + 2.6], look: [DX[0] - 1, 1.2, 0], fov: 46 }], t);
    return frame(t, cam, { loco: { x: lx, speed: 1.2 }, dets: ds, shake, grade: { ...GR, focus: cam.focusDist ?? 6, aperture: .4, flash: ds.reduce((s, d) => s + (d.burst! >= 0 && d.burst! < .12 ? .5 : 0), 0) },
      overlay: card('BANG!', '', ss(tb, tb + .08, t) * (1 - ss(tb + .7, tb + 1.0, t)), 360) + captions(F, t) } as Partial<RailFrame>, .4, .05); }
  const jolt = Math.max(0, 1 - Math.abs(t - (C[13] + .1)) * 4); const cx = lx - 2.5;
  const cam = rig([{ t: C[13], pos: [lx - 1.95, 2.95, .1], look: [cx, 2.85, .55], fov: 50 }, { t: C[14], pos: [lx - 2.0, 2.95, .2], look: [cx, 2.9, .55], fov: 46 }], t);
  return frame(t, breathe(cam, t, 1), { loco: { x: lx, speed: 1.2 }, dets: ds, shake: shake * .5,
    actors: [act('drv', DRIVER, [cx, 1.6, .55], pose({ turn: .2, headLift: jolt * .2, lean: -.1 * jolt, handA: [-.3, -2.6 - jolt * .4], handB: [.8, -2.4], shapeA: 'open', frontA: 1, frontB: 1, headTurn: -.2 }, t, .3), t > C[13] + .05 ? EXPR.shocked : EXPR.concentrating, t, { squash: jolt * .14, rim: '#ffd9a0', rimSide: -1 })],
    overlay: chip('IMPOSSIBLE TO MISS', 260, ss(C[13] + .3, C[13] + .6, t), '#ff8a5a') + captions(F, t) }, 0, .05);
});
// 6 — DANGER: he hauls the brake; wheels spark and steam billows; the train drags to a stop below the red signal (tracking, then crane)
shot(C[14], C[15], t => {
  const d0 = locoX(C[14]); const dur = C[15] - C[14]; const k = kk(t, C[14], C[15]); const stopX = -1.5;
  const x = d0 + (stopX - d0) * (1 - (1 - Math.min(1, k / .85)) ** 2); const brake = ss(0, .1, k) * (1 - ss(.8, .9, k));
  const pull = ss(C[14] + .2, C[14] + .7, t); const cx = x - 2.5;
  if (k < .32) { const cam = rig([{ t: C[14], pos: [x - 1.95, 2.95, -.3], look: [cx, 2.75, .45], fov: 50 }, { t: C[14] + dur * .32, pos: [x - 2.0, 2.9, -.4], look: [cx, 2.6, .45], fov: 48 }], t);
    return frame(t, cam, { loco: { x, speed: 1 - k, brake }, actors: [act('drv', DRIVER, [cx, 1.6, .55], pose({ turn: .2, lean: -.25 * pull, handA: [lerp(-.8, -.2, pull), lerp(-2.6, -2.2, pull)], handB: [lerp(-.6, 0, pull), lerp(-2.4, -2.0, pull)], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1 }, t, .2), EXPR.determined, t, { rim: '#ffd9a0', rimSide: 1 })],
      overlay: card('DANGER', 'AHEAD', ss(C[14], C[14] + .2, t), 300) + captions(F, t) }, 0, .05); }
  const cam = rig([{ t: C[14] + dur * .32, pos: [x + 2, .8, 5.8], look: [x, 1.6, 0], fov: 44 }, { t: C[15], pos: [stopX + 13, 4.2, 9.5], look: [3, 3.2, -1.5], fov: 46 }], t);
  return frame(t, cam, { loco: { x, speed: 1 - k, brake, steam: 1 }, arm: 0, lampCol: 'red', shake: brake * .006, overlay: chip('SLOW DOWN… OR STOP', 260, ss(.4, .5, k), '#ff5a4a') + captions(F, t) }, 0, .045);
});
// 7 — Edward Cowper, c.1841 · still carried today: push in on the fogman's tin of signals by the brazier
shot(C[15], C[17], t => {
  const cam = rig([{ t: C[15], pos: [-7.7, 1.15, -2.9], look: [-8.4, .8, -3.8], fov: 34 }, { t: C[17], pos: [-8.05, .98, -3.35], look: [-8.4, .8, -3.8], fov: 28 }], t);
  return frame(t, cam, { tin: true, brazier: 1, overlay: chip('INVENTED c.1841', 260, ss(C[15] + .3, C[15] + .6, t), '#ffd23f') + chip('EDWARD COWPER', 370, ss(C[15] + .8, C[15] + 1.1, t)) + chip('STILL CARRIED TODAY', 480, ss(C[16] + .2, C[16] + .5, t), '#5fd16f') + captions(F, t) }, .6, .05);
});
// 8 — "Not an attack." smoke drifts off the rail… "A WARNING…" crane up: the train stands safe at the signal; the arm drops to clear
shot(C[17], 60.01, t => {
  const clear = ss(C[18] + 2.2, C[18] + 3.0, t);
  const keys: Key[] = [{ t: C[17], pos: [DX[0] + .9, .5, RAIL_Z + .9], look: [DX[0], .55, RAIL_Z], fov: 34 }, { t: C[18] + .4, pos: [DX[0] + 4, 2.2, 6], look: [-2, 2.2, 0], fov: 42 }, { t: 60, pos: [14, 6.5, 14], look: [2, 3.2, -1], fov: 46 }];
  const cam = rig(keys, t, { easing: ease.inOut5 });
  return frame(t, cam, { loco: { x: -1.5, speed: 0, steam: .7 }, dets: DX.map(x => ({ x, z: RAIL_Z, burst: 1.6 + (t - C[17]) * .6 })), arm: clear, lampCol: clear > .5 ? 'green' : 'red',
    actors: [act('fog', FOGMAN, [4.2, 0, 2.4], pose({ turn: -.6, handB: [-.3, -3.1 + Math.sin(t * 5) * .15], shapeB: 'grip', frontB: 1 }, t, .3), EXPR.happy, t, { b: 'flaglamp' })],
    grade: { ...GR, fade: ss(59.3, 60, t) * .9 }, overlay: card('NOT AN ATTACK', 'A WARNING', ss(C[18] + 1.2, C[18] + 1.6, t), 300) + captions(F, t) } as Partial<RailFrame>, 0, .045);
});

export function frameAt(n: number): RailFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
