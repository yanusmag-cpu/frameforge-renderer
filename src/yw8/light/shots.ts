// YunoWorld v8 · "This giant glass beehive could save a ship… twenty miles away." — the Fresnel lighthouse lens. 60 s.
// Verified: before Fresnel's lens (1822) lighthouse lights (lamps + reflectors) lost much of their light and were typically seen
// only ~8–12 miles; Augustin-Jean Fresnel (1788–1827) replaced a thick, heavy lens with concentric rings (dioptric panels) plus
// prisms (catadioptric rings) that redirect escaping light into one beam; the first was lit at Cordouan lighthouse, France,
// on 25 July 1823 and was visible to the horizon, 20+ miles; Fresnel lenses spread worldwide and many still operate today.
import { STAND, idle, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { lerp, ss, type V3, type ActorState } from '../../yw3/core.ts';
import type { T7Look, T7Prop } from '../../yw7/toon7.ts';
import { rig, orbitKeys, ease, type Key } from '../../yw7/cam7.ts';
import { LENS, STUDY, type LightFrame } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.fresnel; const F = 'fresnel'; const w = (word: string, n = 1, fb = 0) => wt(F, word, n, fb);
const FRESNEL: T7Look = { skin: '#f2d2b8', hair: '#4a3020', hairStyle: 'curly', nose: 'long', head: { w: .86, h: 1.08, jaw: .9, chin: 1.0 }, top: '#2a3048', topKind: 'coat', inner: '#f2ede2', tie: '#f2ede2', pants: '#e0d8c4', boots: '#1a1410', eyes: '#5a4a3a', build: .85 };
const KEEPER: T7Look = { skin: '#e0aa82', hair: '#5a5048', hairStyle: 'short', nose: 'round', head: { w: 1.05, jaw: 1.1, cheek: 1.05 }, top: '#1e2a44', topKind: 'jacket', inner: '#d8ccb0', pants: '#1e2a44', boots: '#1a1612', hat: 'driver', hatColor: '#1e2a44', beard: 'full', beardColor: '#6a6058', eyes: '#3a4a6a', build: 1.08 };
const SAILOR: T7Look = { skin: '#d49870', hair: '#2a1a10', hairStyle: 'curly', nose: 'snub', head: { w: 1.0, jaw: 1.0 }, top: '#2a3a5a', topKind: 'coat', inner: '#e8e0d0', pants: '#2a2a34', boots: '#1a1410', hat: 'flatcap', hatColor: '#1a1e2a', beard: 'stubble', eyes: '#3a2a1a' };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
type Opt = Partial<ActorState> & { a?: T7Prop; b?: T7Prop };
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Opt = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1100, seed: id.length * 9 + 3, t7A: o.a, t7B: o.b, rim: '#ffd8a0', rimSide: 1, ...o });
const GR = { sat: 1.05, contrast: 1.08, bloom: .38, bloomTh: 1.05, vignette: .3, exposure: 1.0, lift: [.02, .025, .05] as [number, number, number], gain: [1.03, 1, .97] as [number, number, number], grain: .03 };
const NIGHT = { set: 'coast', night: 1, sun: { dir: [-.5, .5, -.4] as V3, color: '#8aa0d0', i: .9, focus: [0, 12, 0] as V3, size: 30 }, hemi: { sky: '#2a3450', ground: '#101218', i: .65 }, fog: { color: '#141a26', density: .004 } };
const STUDYL = { set: 'study', night: 1, lens: 'none' as const, beam: 0, lamp: 0, hemi: { sky: '#3a3040', ground: '#1a1410', i: .35 }, fog: { color: '#0e0c0a', density: .02 } };
type S = { a: number; b: number; f: (t: number) => LightFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => LightFrame) => SH.push({ a, b, f });
const frame = (t: number, cam: ReturnType<typeof rig>, o: Partial<LightFrame>, ap = 0, base: object = NIGHT): LightFrame => ({ t, ...base, cam: { near: .02, ...cam }, grade: { ...GR, focus: cam.focusDist ?? 6, aperture: ap }, ...o } as LightFrame);
const L0 = LENS;

// 1 — HOOK: orbit the glowing glass beehive inside the lantern room … out through the glass, the beam reaches a ship far away … "How?" — rush into the rings.
shot(0, C[2], t => {
  if (t < C[1]) { const keys: Key[] = [...orbitKeys(0, C[1] * .55, L0, 2.0, .6, 1.9, L0[1] + .2, L0[1] + .5, L0[1], 46, 4), { t: C[1], pos: [L0[0] + 8, L0[1] + 4, L0[2] + 14], look: [-20, 2, 140], fov: 50 }];
    const cam = rig(keys, t); return frame(t, cam, { lensRot: t * .3, ship: { x: -24, z: 150, rot: 1.3 }, overlay: chip('20 MILES', 260, ss(w('miles', 1, C[1] - .6) - .1, w('miles', 1, C[1] - .6) + .2, t), '#ffd23f') + captions(F, t) }, 0); }
  const keys: Key[] = [{ t: C[1], pos: [L0[0] + 2.2, L0[1] + .3, L0[2] + .6], look: L0, fov: 44 }, { t: C[2], pos: [L0[0] + 1.15, L0[1] + .05, L0[2] + .3], look: L0, fov: 34 }]; const cam = rig(keys, t, { easing: ease.out });
  return frame(t, cam, { lensRot: t * .3, overlay: card('HOW?', '', ss(C[1], C[1] + .15, t) * (1 - ss(C[2] - .3, C[2], t)), 320) + captions(F, t) }, 0);
});
// 2 — c.1820: the old lamp and polished reflectors — weak light spills everywhere … a storm, a brig pitching toward the reef; the light seen too late.
shot(C[2], C[5], t => {
  if (t < C[3]) { const keys: Key[] = [{ t: C[2], pos: [26, 9, 34], look: [0, 22, 0], fov: 46 }, { t: C[3], pos: [16, 20, 22], look: [0, 29, 0], fov: 42 }]; const cam = rig(keys, t);
    return frame(t, cam, { lens: 'old', lamp: .55, beam: 0, overlay: chip('c. 1820', 260, ss(C[2] + .2, C[2] + .5, t)) + chip('RANGE: ~8–12 MILES', 370, ss(C[2] + 1, C[2] + 1.3, t), '#ff8a5a') + captions(F, t) }, 0); }
  if (t < C[4]) { const keys: Key[] = [{ t: C[3], pos: [L0[0] + 1.3, L0[1] + .35, L0[2] + .7], look: L0, fov: 46 }, { t: C[4], pos: [L0[0] - .9, L0[1] + .6, L0[2] + 1.2], look: L0, fov: 46 }]; const cam = rig(keys, t);
    return frame(t, cam, { lens: 'old', lamp: .8, beam: 0, overlay: chip('LIGHT WASTED', 260, ss(C[3] + .5, C[3] + .8, t), '#ff8a5a') + captions(F, t) }, 0); }
  const k = ss(C[4], C[5], t); const sp = { x: lerp(-30, -18, k), z: lerp(70, 52, k), rot: 2.3, roll: .12 };
  const keys: Key[] = [{ t: C[4], pos: [-40, 2.2, 92], look: [-22, 3, 58], fov: 44 }, { t: C[5], pos: [-33, 2.8, 82], look: [-6, 14, 10], fov: 46 }]; const cam = rig(keys, t);
  return frame(t, cam, { lens: 'old', lamp: .5, beam: 0, storm: .85, ship: { ...sp, lantern: 1 }, fog: { color: '#141a26', density: .01 }, shake: .004, extra: [{ p: [-30, 60, 40], c: [.8, .85, 1], i: 400 * Math.max(0, 1 - Math.abs(t - (C[4] + 1.2)) * 8), d: 300 }],
    actors: [act('sail', SAILOR, [sp.x + .4, 1.6 + Math.sin(t * .9) * .4, sp.z + .2], pose({ turn: .6, lean: .15, handA: [-1.0, -3.4], shapeA: 'point', frontA: 1, headLift: .1 }, t, .4), EXPR.terrified, t, { rim: '#c8d4ff', squash: .05 })],
    overlay: chip('TOO LATE', 260, ss(C[4] + .8, C[4] + 1.1, t), '#ff5a4a') + captions(F, t) }, 0);
});
// 3 — Fresnel's study by candlelight … the idea … a thick heavy lens … CUT INTO RINGS … same curve, a fraction of the glass.
shot(C[5], C[9], t => {
  const LP: V3 = [STUDY[0], 1.16, 0]; const fr = (face = EXPR.thinking, p: Partial<Pose> = {}) => act('fres', FRESNEL, [STUDY[0] - .35, 0, .75], pose({ turn: .35, lean: .08, handA: [-.4, -3.2], shapeA: 'point', frontA: 1, ...p }, t, .3), face, t);
  if (t < C[6]) { const idea = ss(C[5] + 1.6, C[5] + 2.0, t); const keys: Key[] = [{ t: C[5], pos: [STUDY[0] + 1.4, 1.7, 2.6], look: [STUDY[0] - .2, 1.3, .3], fov: 44 }, { t: C[6], pos: [STUDY[0] + .5, 1.65, 2.0], look: [STUDY[0] - .3, 1.5, .7], fov: 38 }]; const cam = rig(keys, t);
    return frame(t, cam, { ...STUDYL, candle: 1, actors: [fr(idea > .5 ? EXPR.excited : EXPR.thinking, idea > .5 ? { handA: [-.2, -4.1], shapeA: 'point', headLift: .08 } : { handA: [-.25, -3.1], shapeA: 'fist' })], overlay: chip('AUGUSTIN FRESNEL', 260, ss(C[5] + .4, C[5] + .7, t), '#5fd1ff') + chip('FRENCH PHYSICIST', 370, ss(C[5] + .9, C[5] + 1.2, t), '#ffd23f') + captions(F, t) }, .25, {}); }
  if (t < C[7]) { const keys: Key[] = [{ t: C[6], pos: [STUDY[0] + 1.3, 1.45, .9], look: [STUDY[0] - .1, 1.2, .2], fov: 40 }, { t: C[7], pos: [STUDY[0] + 1.1, 1.3, .45], look: LP, fov: 38 }]; const cam = rig(keys, t);
    return frame(t, cam, { ...STUDYL, candle: 1, morph: 0, actors: [fr(EXPR.annoyed, { turn: .5, handA: [-.6, -2.8], shapeA: 'open', headTilt: -.1 })], overlay: chip('TOO THICK · TOO HEAVY', 260, ss(C[6] + .5, C[6] + .8, t), '#ff8a5a') + captions(F, t) }, .3, {}); }
  const cut = ss(w('rings', 1, C[7] + .8) - .2, w('rings', 1, C[7] + .8) + .4, t);
  const keys: Key[] = [{ t: C[7], pos: [STUDY[0] + 1.0, 1.25, .35], look: LP, fov: 36 }, { t: C[8], pos: [STUDY[0] + .95, 1.22, .12], look: LP, fov: 32 }, { t: C[9], pos: [STUDY[0] + .9, 1.3, -.4], look: LP, fov: 34 }]; const cam = rig(keys, t);
  return frame(t, cam, { ...STUDYL, candle: 1, morph: cut, actors: t < C[8] ? [fr(cut > .5 ? EXPR.excited : EXPR.determined, { handA: [-.1, -3.9], shapeA: 'point', headLift: .1 * cut })] : [], shake: Math.max(0, 1 - Math.abs(t - w('rings', 1, C[7] + .8)) * 5) * .006,
    overlay: card('RINGS!', '', cut * (1 - ss(C[8] - .2, C[8], t)), 300) + chip('SAME CURVE · LESS GLASS', 260, ss(C[8] + .3, C[8] + .6, t), '#5fd16f') + captions(F, t) }, .35, {});
});
// 4 — rays: each ring bends the light … prisms catch the escaping light … squeezed into ONE beam (the lamp ignites in the tower).
shot(C[9], C[12], t => {
  const LP: V3 = [STUDY[0] + .2, 1.16, 0];
  if (t < C[11]) { const par = ss(C[10], C[11] - .3, t); const keys: Key[] = [{ t: C[9], pos: [STUDY[0] + .1, 1.75, 1.6], look: LP, fov: 40 }, { t: C[11], pos: [STUDY[0] + .5, 1.6, 1.45], look: [STUDY[0] + .35, 1.16, 0], fov: 40 }]; const cam = rig(keys, t);
    return frame(t, cam, { ...STUDYL, candle: 1, morph: 1, rays: ss(C[9], C[9] + .6, t), raysPar: lerp(.3, 1, par), overlay: chip('RINGS BEND THE LIGHT', 260, ss(C[9] + .3, C[9] + .6, t) * (1 - ss(C[10], C[10] + .3, t)), '#ffd23f') + chip('PRISMS CATCH THE REST', 260, ss(C[10] + .3, C[10] + .6, t), '#5fd1ff') + captions(F, t) }, .2, {}); }
  const on = ss(C[11], C[11] + .5, t); const bm = ss(C[11] + .3, C[11] + 1.2, t);
  const keys: Key[] = [{ t: C[11], pos: [L0[0] + 1.4, L0[1] + .1, L0[2] + .5], look: L0, fov: 44 }, { t: C[12], pos: [L0[0] + 7, L0[1] + 1.5, L0[2] + 10], look: [-30, 20, 120], fov: 48 }]; const cam = rig(keys, t, { easing: ease.inOut5 });
  return frame(t, cam, { lamp: on, beam: bm, lensRot: 1.2 + (t - C[11]) * .25, overlay: card('ONE BEAM', '', ss(w('beam', 1, C[11] + 1.5) - .05, w('beam', 1, C[11] + 1.5) + .2, t) * (1 - ss(C[12] - .3, C[12], t)), 300) + captions(F, t) }, 0);
});
// 5 — 1823: a keeper lights the first lens … the beam sweeps 20+ miles to a ship — the sailor sees it … worldwide … still shining.
shot(C[12], C[16], t => {
  if (t < C[13]) { const lit = ss(C[12] + 1.2, C[12] + 1.8, t); const keys: Key[] = [{ t: C[12], pos: [L0[0] + 1.3, L0[1] + .5, L0[2] + 3.2], look: [L0[0] + .7, L0[1] - .1, L0[2] + .7], fov: 48 }, { t: C[13], pos: [L0[0] + 1.6, L0[1] + .6, L0[2] - 1.0], look: L0, fov: 44 }]; const cam = rig(keys, t);
    return frame(t, cam, { lamp: lit, beam: lit * .8, lensRot: .4, actors: [act('keep', KEEPER, [L0[0] + 1.15, 30.5, L0[2] + 1.0], pose({ turn: -.6, lean: .1, handA: [-.7, -3.2], shapeA: 'hold', frontA: 1, headLift: .05 }, t, .3), lit > .5 ? EXPR.amazed : EXPR.concentrating, t)],
      overlay: chip('25 JULY 1823', 260, ss(C[12] + .3, C[12] + .6, t)) + chip('CORDOUAN LIGHTHOUSE, FRANCE', 370, ss(C[12] + .9, C[12] + 1.2, t), '#5fd1ff') + captions(F, t) }, .2); }
  if (t < C[14]) { const k = ss(C[13], C[14], t); const sp = { x: -30, z: 220, rot: 1.6 };
    const keys: Key[] = [{ t: C[13], pos: [10, 40, 40], look: [-20, 2, 180], fov: 50 }, { t: C[13] + (C[14] - C[13]) * .6, pos: [-24, 6, 236], look: [0, 25, 0], fov: 44 }, { t: C[14], pos: [-26.5, 3.6, 222.5], look: [0, 30, 0], fov: 40 }]; const cam = rig(keys, t);
    const saw = ss(C[13] + 1.8, C[13] + 2.3, t);
    return frame(t, cam, { ship: { ...sp, lantern: 1 }, lensRot: 2.6 + k * 1.2, actors: [act('sail', SAILOR, [sp.x + .3, 1.8 + Math.sin(t * .9) * .3, sp.z - .2], pose({ turn: -.3, handA: [-.9, -3.6], shapeA: saw > .5 ? 'point' : 'open', frontA: 1, headLift: .1 }, t, .4), saw > .5 ? EXPR.relief : EXPR.worried, t, { rim: '#ffe0a0' })],
      overlay: card('20+ MILES', 'TO THE HORIZON', ss(C[13] + .5, C[13] + .8, t) * (1 - ss(C[14] - .3, C[14], t)), 300) + captions(F, t) }, 0); }
  if (t < C[15]) { const keys: Key[] = [...orbitKeys(C[14], C[15], [0, 20, 0], 55, -.6, .8, 34, 26, 22, 48, 3)]; const cam = rig(keys, t);
    return frame(t, cam, { lensRot: t * .3, overlay: chip('ADOPTED WORLDWIDE', 260, ss(C[14] + .3, C[14] + .6, t), '#5fd16f') + captions(F, t) }, 0); }
  const keys: Key[] = [{ t: C[15], pos: [L0[0] + 1.5, L0[1] + .4, L0[2] + .9], look: L0, fov: 44 }, { t: C[16], pos: [L0[0] - .6, L0[1] + .2, L0[2] + 1.5], look: L0, fov: 40 }]; const cam = rig(keys, t);
  return frame(t, cam, { night: 0, lamp: .4, beam: 0, sun: { dir: [.6, .5, .5] as V3, color: '#fff2e0', i: 2.4, focus: L0, size: 6 }, hemi: { sky: '#b8c8e0', ground: '#6a6a60', i: 1.0 }, fog: { color: '#c8d4e0', density: .002 }, lensRot: t * .15, overlay: chip('STILL SHINING TODAY', 260, ss(C[15] + .3, C[15] + .6, t), '#ffd23f') + captions(F, t) }, 0);
});
// 6 — finale: the beam sweeps over a passing ship; a ring of glass that turned a flame into a lifeline. End card.
shot(C[16], 60.01, t => {
  const keys: Key[] = [{ t: C[16], pos: [-50, 3, 70], look: [0, 22, 0], fov: 44 }, { t: 60, pos: [-62, 10, 96], look: [0, 24, 0], fov: 46 }]; const cam = rig(keys, t);
  return frame(t, cam, { ship: { x: lerp(-30, -20, (t - C[16]) / (60 - C[16])), z: 46, rot: 2.6, lantern: 1 }, lensRot: t * .3, storm: .15, grade: { ...GR, fade: ss(59.3, 60, t) * .9, focus: 60, aperture: 0 },
    overlay: card('THE FRESNEL LENS', 'FIRST LIT 1823', ss(C[16] + 1.5, C[16] + 1.9, t), 300) + captions(F, t) } as Partial<LightFrame>, 0);
});

export function frameAt(n: number): LightFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
