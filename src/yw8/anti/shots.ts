// YunoWorld v8 · "Divers pulled this lump of bronze from a shipwreck… and inside? GEARS!" — the Antikythera mechanism. 60 s.
// Verified: in 1900 Greek sponge divers sheltering from a storm off Antikythera found a 1st-century-BC wreck (statues, pottery,
// bronzes); among the finds were corroded lumps; in 1902 archaeologist Valerios Stais noticed a gear wheel in one; X-ray
// imaging (Price, later 2005 CT scans) revealed a hand-cranked astronomical calculator showing sun and moon positions, lunar
// phases and predicting eclipses; about 30 gears survive; nothing comparable is known for over a thousand years.
import { STAND, idle, walkPose, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { lerp, ss, type V3, type ActorState } from '../../yw3/core.ts';
import type { T7Look, T7Prop } from '../../yw7/toon7.ts';
import { rig, ease, type Key } from '../../yw7/cam7.ts';
import { ROOM, SCAN, TERR, type AntiFrame } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.antikythera; const F = 'antikythera'; const w = (word: string, n = 1, fb = 0) => wt(F, word, n, fb);
const ARCH: T7Look = { skin: '#d8a880', hair: '#2a1e16', hairStyle: 'side', nose: 'long', head: { w: .92, h: 1.06, jaw: 1.0 }, top: '#3a3430', topKind: 'suit', inner: '#f2ede2', tie: '#6a2a2a', pants: '#2e2a26', boots: '#141010', beard: 'stache', beardColor: '#2a1e16', glasses: true, eyes: '#3a2a1a' };
const DIVER: T7Look = { skin: '#d8a078', hair: '#2a1a10', hairStyle: 'short', nose: 'round', head: { w: 1.0, jaw: 1.05 }, top: '#7e7868', topKind: 'overalls', inner: '#5a5448', pants: '#7e7868', boots: '#4a4a50', belt: '#55555a', hat: 'diver', hatColor: '#c47c44', beard: 'stache', beardColor: '#2a1a10', eyes: '#3a2a1a', build: 1.12 };
const DIVER2: T7Look = { ...DIVER, skin: '#c48a62', beard: 'stubble', nose: 'long', head: { w: .94, jaw: 1.1 } };
const ASTRO: T7Look = { skin: '#c88e66', hair: '#d8d4cc', hairStyle: 'curly', nose: 'long', head: { w: .98, jaw: 1.05 }, top: '#e8e0cc', topKind: 'dress', inner: '#c8a060', trim: '#8a5a2a', pants: '#e8e0cc', boots: '#6a4a2a', skirt: true, beard: 'full', beardColor: '#e0dcd4', eyes: '#3a2a1a', age: .65 };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
type Opt = Partial<ActorState> & { a?: T7Prop; b?: T7Prop };
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Opt = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1100, seed: id.length * 7 + 3, t7A: o.a, t7B: o.b, rim: '#ffe0b0', rimSide: 1, ...o });
const GR = { sat: 1.05, contrast: 1.08, bloom: .32, bloomTh: 1.15, vignette: .3, exposure: 1.02, lift: [.02, .03, .05] as [number, number, number], gain: [1.03, 1, .97] as [number, number, number], grain: .03 };
const SEA = { set: 'sea', sun: { dir: [.15, 1, .25] as V3, color: '#a8f0ff', i: 3.0, focus: [0, 0, -1] as V3, size: 14 }, hemi: { sky: '#4a9ab8', ground: '#1e4248', i: 1.5 }, fog: { color: '#0e4a62', density: .065 }, bg: '#0e4a62', motes: 1, boat: true };
const RM = { set: 'room', sun: { dir: [-.85, .55, .3] as V3, color: '#fff0d8', i: 3.2, focus: ROOM, size: 6 }, hemi: { sky: '#d8c8a8', ground: '#6a5038', i: .75 }, fog: { color: '#2a2018', density: .01 } };
const SC = { set: 'scan', hemi: { sky: '#203040', ground: '#080a10', i: .5 }, bg: '#06080c', fog: { color: '#06080c', density: .05 } };
const TE = (dusk = .65) => ({ set: 'terr', sun: { dir: [.45, .35, .85] as V3, color: '#ffc890', i: 2.6, focus: TERR, size: 5 }, hemi: { sky: '#c8a8a0', ground: '#6a5a48', i: .85 }, sky: { dusk, sunAz: 2.8, sunEl: .12, moonAz: -2.9, moonEl: .35 } });
type S = { a: number; b: number; f: (t: number) => AntiFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => AntiFrame) => SH.push({ a, b, f });
const frame = (t: number, cam: ReturnType<typeof rig>, o: Partial<AntiFrame>, ap = 0, base: object = SEA): AntiFrame => ({ t, ...base, cam: { near: .01, ...cam }, grade: { ...GR, focus: cam.focusDist ?? 6, aperture: ap }, ...o } as AntiFrame);
const LUMP: V3 = [.9, .14, -.9];

// 1 — HOOK: on the seabed a diver's lead glove lifts a crusty lump into the light … it cracks open: GEARS. The diver jerks back.
shot(0, C[2], t => {
  const lift = ss(.2, C[1] - .3, t); const crack = ss(w('gears', 1, C[1] + .8) - .15, w('gears', 1, C[1] + .8) + .25, t);
  const lp: V3 = [lerp(LUMP[0], .55, lift), lerp(LUMP[1], 1.35, lift), lerp(LUMP[2], -.65, lift)];
  const keys: Key[] = [{ t: 0, pos: [.3, .45, .9], look: [LUMP[0], .35, LUMP[2]], fov: 42, focus: LUMP }, { t: C[1], pos: [.15, 1.3, 1.0], look: [.6, 1.25, -.9], fov: 40, focus: [.55, 1.35, -.65] }, { t: C[2], pos: [-.35, 1.55, 1.7], look: [.65, 1.4, -1.1], fov: 42, focus: [.8, 1.5, -1.3] }];
  const cam = rig(keys, t);
  return frame(t, cam, { lump: { pos: lp, split: crack, glow: crack, rot: [0, t * .3, 0] }, actors: [act('d1', DIVER, [1.0, 0, -1.6], pose({ turn: -.3, crouch: lerp(.7, 0, lift), lean: lerp(.35, -.12 * crack, lift), handA: [-.45, lerp(-1.2, -2.7, lift) - crack * .3], handB: [-.1, lerp(-1.2, -2.6, lift) - crack * .3], shapeA: crack > .3 ? 'open' : 'grip', shapeB: crack > .3 ? 'open' : 'grip', frontA: 1, frontB: 1, headLift: crack * .1 }, t, .2), crack > .3 ? EXPR.shocked : EXPR.focused, t, { squash: crack * .1, rim: '#bff0ff' })], shake: crack * (1 - ss(C[1] + 1.4, C[2], t)) * .012,
    extra: [{ p: [lp[0], lp[1] + .25, lp[2] + .3], c: [.6, .95, 1], i: 3 + crack * 5, d: 3 }], overlay: card('GEARS?!', '', crack * (1 - ss(C[2] - .3, C[2], t)), 300) + captions(F, t) }, .45);
});
// 2 — 1900: from under the surface a boat's hull, divers descending … the wreck: statues, pottery, bronze … lumps nobody cared about.
shot(C[2], C[5], t => {
  if (t < C[3]) { const k = ss(C[2], C[3], t); const keys: Key[] = [{ t: C[2], pos: [6, 4, 8], look: [3, 12, -6], fov: 50 }, { t: C[3], pos: [5, 2.2, 6], look: [0, 2, -2], fov: 48 }]; const cam = rig(keys, t);
    return frame(t, cam, { fog: { color: '#0e4a62', density: .045 }, actors: [act('d1', DIVER, [1.5, lerp(9, .1, k), -2], pose({ turn: .3, handA: [-.7, -3.3], handB: [.6, -2.4], frontA: 1, frontB: 1, footA: [-.3, -.3], footB: [.2, -.1] }, t, .6), EXPR.focused, t, { rim: '#bff0ff' }), act('d2', DIVER2, [-1.2, lerp(11, 2.4, k), -3.5], pose({ turn: -.4, handA: [-.6, -3.5], frontA: 1 }, t, .6), EXPR.curious, t, { rim: '#bff0ff' })],
      overlay: chip('1900 · ANTIKYTHERA, GREECE', 260, ss(C[2] + .3, C[2] + .6, t)) + chip('SPONGE DIVERS', 370, ss(C[2] + 1, C[2] + 1.3, t), '#5fd1ff') + captions(F, t) }, 0); }
  if (t < C[4]) { const keys: Key[] = [{ t: C[3], pos: [-4.6, 1.2, -.6], look: [-2.8, .6, -3], fov: 44 }, { t: C[4], pos: [-1.4, 1.0, 1.4], look: [1.6, .4, -1.4], fov: 46 }]; const cam = rig(keys, t);
    return frame(t, cam, { actors: [act('d2', DIVER2, [lerp(-1.4, 0, ss(C[3], C[4], t)), 0, -3.8], walkPose((t - C[3]) * .7, 1, { turn: .55 }) as Pose, EXPR.curious, t, { rim: '#bff0ff' })], overlay: chip('STATUES', 260, ss(C[3] + .1, C[3] + .3, t), '#ffd23f') + chip('POTTERY', 340, ss(C[3] + .7, C[3] + .9, t), '#ffd23f') + chip('BRONZE', 420, ss(C[3] + 1.3, C[3] + 1.5, t), '#ffd23f') + captions(F, t) }, .2); }
  const k = ss(C[4], C[5], t); const keys: Key[] = [{ t: C[4], pos: [2.4, .3, .8], look: [1, .15, -1.6], fov: 44 }, { t: C[5], pos: [.4, .45, .9], look: [1.4, .3, -1.6], fov: 40 }]; const cam = rig(keys, t);
  return frame(t, cam, { actors: [act('d1', DIVER, [lerp(-.5, 2.8, k), 0, -2.6], walkPose((t - C[4]) * .8, 1, { turn: .6 }) as Pose, EXPR.calm, t, { rim: '#bff0ff' })], overlay: chip('“JUST ROCKS”', 260, ss(C[4] + .4, C[4] + .7, t), '#9aa4b0') + captions(F, t) }, .3);
});
// 3 — 1902, the museum storeroom: an archaeologist leans over a split lump … a gear wheel with hand-cut teeth … over 2,000 years old!
shot(C[5], C[9], t => {
  const LP: V3 = [ROOM[0], .97, 0];
  if (t < C[6]) { const keys: Key[] = [{ t: C[5], pos: [ROOM[0] - 2.4, 1.6, 2.6], look: [ROOM[0], 1.2, 0], fov: 46 }, { t: C[6], pos: [ROOM[0] + .9, 1.55, 1.4], look: [ROOM[0] - .1, 1.25, 0], fov: 40 }]; const cam = rig(keys, t);
    return frame(t, cam, { lump: { pos: LP, split: ss(C[5] + 1, C[6], t) * .7 }, actors: [act('arch', ARCH, [ROOM[0] - .5, 0, .75], pose({ turn: .35, lean: .25, handA: [-.5, -2.4], shapeA: 'point', frontA: 1, handB: [.2, -3.1], shapeB: 'hold', frontB: 1, headTilt: .1 }, t, .3), EXPR.curious, t)],
      overlay: chip('1902 · ATHENS MUSEUM', 260, ss(C[5] + .2, C[5] + .5, t)) + captions(F, t) }, .25, RM); }
  if (t < C[7]) { const keys: Key[] = [{ t: C[6], pos: [ROOM[0] + .22, 1.3, .32], look: [ROOM[0], 1.0, 0], fov: 34, focus: [ROOM[0], 1.0, 0] }, { t: C[7], pos: [ROOM[0] + .1, 1.22, .2], look: [ROOM[0], 1.0, 0], fov: 28, focus: [ROOM[0], 1.0, 0] }]; const cam = rig(keys, t);
    return frame(t, cam, { lump: { pos: LP, split: 1, glow: .6 }, overlay: chip('HAND-CUT TEETH', 260, ss(C[6] + 1.2, C[6] + 1.5, t), '#ffd23f') + captions(F, t) }, .7, RM); }
  if (t < C[8]) { const yrs = w('thousand', 1, C[7] + 1.5); const keys: Key[] = [{ t: C[7], pos: [ROOM[0] - .2, 1.7, 1.6], look: [ROOM[0] - .4, 1.6, .75], fov: 36 }, { t: C[8], pos: [ROOM[0] - .3, 1.68, 1.35], look: [ROOM[0] - .45, 1.62, .75], fov: 30 }]; const cam = rig(keys, t); const sh = ss(yrs - .2, yrs + .1, t);
    return frame(t, cam, { lump: { pos: LP, split: 1 }, actors: [act('arch', ARCH, [ROOM[0] - .45, 0, .75], pose({ turn: .1, lean: -.12 * sh, handA: [-.6, -3.3 + sh * -.3], handB: [.6, -3.3], shapeA: 'open', shapeB: 'open', frontA: 1, frontB: 1, headLift: .06 * sh }, t, .3), sh > .3 ? EXPR.shocked : EXPR.amazed, t, { squash: sh * .1 })],
      overlay: card('2,000+ YEARS OLD', 'c. 1st CENTURY BC', ss(yrs - .1, yrs + .2, t), 300) + captions(F, t) }, .3, RM); }
  const keys: Key[] = [{ t: C[8], pos: [ROOM[0] + .55, 1.25, .5], look: LP, fov: 36 }, { t: C[9], pos: [ROOM[0] - .4, 1.3, .55], look: LP, fov: 36 }]; const cam = rig(keys, t);
  return frame(t, cam, { lump: { pos: LP, split: 1, rot: [0, .3, 0] }, overlay: card('THE ANTIKYTHERA', 'MECHANISM', ss(C[8] + .3, C[8] + .6, t), 300) + captions(F, t) }, .35, RM);
});
// 4 — X-ray: the fragment in the scanner ring; its crust fades and gears glow inside.
shot(C[9], C[10], t => {
  const xr = ss(C[9] + .4, C[10] - .5, t); const LP: V3 = [SCAN[0], 1.05, 0];
  const keys: Key[] = [{ t: C[9], pos: [SCAN[0] + 2.2, 1.6, 2.4], look: [SCAN[0], 1.3, 0], fov: 46 }, { t: C[10], pos: [SCAN[0] + .3, 1.15, .32], look: LP, fov: 34, focus: LP }]; const cam = rig(keys, t);
  return frame(t, cam, { lump: { pos: LP, split: .15, xray: xr, scale: 1.4, rot: [0, t * .4, 0] }, extra: [{ p: [SCAN[0], 2, 1], c: [.4, .8, 1], i: 6, d: 6 }], grade: { ...GR, bloom: .55, focus: cam.focusDist ?? 2, aperture: .2 }, overlay: chip('X-RAY SCANS', 260, ss(C[9] + .3, C[9] + .6, t), '#5fd1ff') + captions(F, t) } as Partial<AntiFrame>, .2, SC);
});
// 5 — the reconstruction at dusk: a hand-cranked model of the sky … sun and moon pointers … moon phases … ECLIPSE overhead.
shot(C[10], C[14], t => {
  const MP: V3 = [TERR[0], 1.07, TERR[2] + .03]; const crank = Math.max(0, t - C[11]) * .45;
  const astro = (face = EXPR.happy, hp: Partial<Pose> = {}) => act('astro', ASTRO, [TERR[0] + .55, 0, .25], pose({ turn: -.45, lean: .12, handA: [-.75, -2.55 + Math.sin(t * 5) * .08], shapeA: 'grip', frontA: 1, ...hp }, t, .3), face, t);
  if (t < C[11]) { const keys: Key[] = [{ t: C[10], pos: [TERR[0] + 2.6, 3.2, 5.2], look: [TERR[0], 1.3, 0], fov: 48 }, { t: C[11], pos: [TERR[0] + .9, 1.5, 1.4], look: MP, fov: 40 }]; const cam = rig(keys, t);
    return frame(t, cam, { ...TE(.7), mech: { show: true, crank: 0 }, actors: [astro(EXPR.calm)], overlay: chip('RECONSTRUCTION', 260, ss(C[10] + .3, C[10] + .6, t), '#5fd1ff') + captions(F, t) }, 0, {}); }
  if (t < C[12]) { const keys: Key[] = [{ t: C[11], pos: [TERR[0] + .3, 1.15, .45], look: MP, fov: 34, focus: MP }, { t: C[12], pos: [TERR[0] + .1, 1.1, .3], look: MP, fov: 30, focus: MP }]; const cam = rig(keys, t);
    return frame(t, cam, { ...TE(.7), mech: { show: true, crank }, actors: [astro()], overlay: chip('☉ SUN', 260, ss(C[11] + .8, C[11] + 1.1, t), '#ffd23f') + chip('☾ MOON', 340, ss(C[11] + 1.4, C[11] + 1.7, t), '#cfd6ff') + captions(F, t) }, .5, {}); }
  if (t < C[13]) { const PH: V3 = [TERR[0], 1.12, TERR[2] + .06]; const keys: Key[] = [{ t: C[12], pos: [TERR[0] + .1, 1.13, .17], look: PH, fov: 30, focus: PH }, { t: C[13], pos: [TERR[0] - .05, 1.12, .14], look: PH, fov: 26, focus: PH }]; const cam = rig(keys, t);
    return frame(t, cam, { ...TE(.7), mech: { show: true, crank: crank * 1.6 }, overlay: chip('MOON PHASES', 260, ss(C[12] + .3, C[12] + .6, t), '#cfd6ff') + captions(F, t) }, .6, {}); }
  const e = ss(C[13] + .3, C[14] - .3, t); const keys: Key[] = [{ t: C[13], pos: [TERR[0] + 1.6, 1.2, 2.2], look: [TERR[0], 1.6, 0], fov: 46 }, { t: C[14], pos: [TERR[0] + 2.4, .9, 3.2], look: [TERR[0] - 6, 8, -40], fov: 54 }]; const cam = rig(keys, t);
  const sk = { dusk: .45, sunAz: -.08 + 0, sunEl: .32, moonAz: lerp(-.25, -.08, e), moonEl: lerp(.2, .32, e), eclipse: ss(.85, 1, e) };
  return frame(t, cam, { ...TE(.5), sky: sk, sun: { dir: [-.15, .4, -.9] as V3, color: '#ffd8a0', i: lerp(2.6, .8, sk.eclipse), focus: TERR, size: 5 }, mech: { show: true, crank: crank * 1.6 }, actors: [astro(sk.eclipse > .5 ? EXPR.excited : EXPR.amazed, { turn: -.1, handB: [.5, -4.0], shapeB: 'point', frontB: 1, headLift: .15 })],
    overlay: card('ECLIPSES', 'PREDICTED', ss(w('eclipses', 1, C[13] + 1) - .05, w('eclipses', 1, C[13] + 1) + .25, t), 300) + captions(F, t) }, 0, {});
});
// 6 — exploded gear train, ~30 gears … centuries ahead … an ancient Greek COMPUTER. End card.
shot(C[14], 60.01, t => {
  const MP: V3 = [TERR[0], 1.07, TERR[2] + .03]; const ex = ss(C[14], C[14] + 1.6, t) * (1 - ss(C[16] - .2, C[16] + .8, t)); const crank = (t - C[14]) * .5;
  if (t < C[16]) { const keys: Key[] = [{ t: C[14], pos: [TERR[0] + .45, 1.2, .6], look: [MP[0], MP[1] + .03, MP[2] + .12], fov: 38 }, { t: C[15], pos: [TERR[0] - .5, 1.25, .75], look: [MP[0], MP[1] + .03, MP[2] + .15], fov: 38 }, { t: C[16], pos: [TERR[0] - .6, 1.5, 1.8], look: MP, fov: 44 }];
    const cam = rig(keys, t); return frame(t, cam, { ...TE(.75), mech: { show: true, crank, explode: ex }, overlay: chip('≈ 30 GEARS SURVIVE', 260, ss(C[14] + .5, C[14] + .8, t) * (1 - ss(C[15], C[15] + .3, t)), '#ffd23f') + chip('NOTHING LIKE IT FOR 1,000+ YEARS', 260, ss(C[15] + .5, C[15] + .8, t), '#ff8a5a') + captions(F, t) }, .3, {}); }
  const keys: Key[] = [{ t: C[16], pos: [TERR[0] - .6, 1.5, 1.8], look: MP, fov: 44 }, { t: 60, pos: [TERR[0] + 1.4, 1.35, 1.2], look: [MP[0], MP[1] + .05, MP[2]], fov: 34 }]; const cam = rig(keys, t, { easing: ease.inOut5 });
  return frame(t, cam, { ...TE(.85), mech: { show: true, crank: crank * .5, explode: ex }, grade: { ...GR, fade: ss(59.3, 60, t) * .9, focus: cam.focusDist ?? 2, aperture: .2 },
    overlay: card('AN ANCIENT COMPUTER', 'ANTIKYTHERA · c. 100 BC', ss(C[16] + 1.2, C[16] + 1.6, t), 300) + captions(F, t) } as Partial<AntiFrame>, .2, {});
});

export function frameAt(n: number): AntiFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
