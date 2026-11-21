// YunoWorld v7 · Film 3 — "This flag warned a whole city that disaster was coming." Galveston, 7–8 September 1900. 60 s.
// Verified: on 7 Sept Weather Bureau chief Isaac Cline, watching growing swells, flew the warning flags atop the Weather Bureau
// office (Levy Building); the storm flag was red with a black square; the island was low (highest point under ~9 ft); winds over
// 130 mph and a surge over 15 ft on 8 Sept; at least 6,000 deaths — the deadliest US natural disaster; survivors built a seawall
// and raised the grade of the city; the seawall still protects Galveston. (The flag was torn apart and the staff later destroyed.)
import { STAND, idle, walkPose, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { lerp, ss, kk, type V3, type ActorState } from '../../yw3/core.ts';
import type { T7Look, T7Prop } from '../toon7.ts';
import { rig, orbitKeys, ease, type Key } from '../cam7.ts';
import { STAFF_TOP, type GalvFrame } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.galveston; const F = 'galveston'; const w = (word: string, n = 1, fb = 0) => wt(F, word, n, fb);
const CLINE: T7Look = { skin: '#f0caa8', hair: '#3a2a1e', hairStyle: 'side', nose: 'hook', head: { w: .9, h: 1.05, jaw: .95 }, top: '#2e2e36', topKind: 'suit', inner: '#f4efe4', tie: '#2a2a2a', pants: '#2a2a30', boots: '#141210', hat: 'bowler', hatColor: '#2a2420', beard: 'stache', beardColor: '#3a2a1e', eyes: '#4a6a3a', build: .95 };
const CLERK: T7Look = { skin: '#e8b890', hair: '#5a3a1e', hairStyle: 'short', nose: 'snub', head: { w: .96, jaw: 1.0 }, top: '#e8e2d4', topKind: 'waistcoat', inner: '#5a4a3a', pants: '#3a3430', boots: '#1e1814', sleeves: 'rolled', eyes: '#3a4a6a', build: .92 };
const LADY: T7Look = { skin: '#c88a62', hair: '#1a1210', hairStyle: 'bun', nose: 'snub', head: { w: .92, jaw: .85, chin: .95 }, top: '#7a5a8a', topKind: 'dress', inner: '#f4eee2', trim: '#4a3a5a', pants: '#7a5a8a', boots: '#2a1a14', hat: 'boater', hatColor: '#e8d8a8', skirt: true, build: .95, eyes: '#3a2a1a' };
const LADY2: T7Look = { ...LADY, skin: '#f2d0b0', hair: '#8a5a2a', top: '#3a6a5a', pants: '#3a6a5a', trim: '#2a4a3a', hat: 'bonnet', hatColor: '#f0e8d8', eyes: '#4a6a8a', head: { w: .95, jaw: .9 } };
const GENT: T7Look = { skin: '#d8a078', hair: '#2a1a10', hairStyle: 'short', nose: 'long', head: { w: 1.0, jaw: 1.1 }, top: '#6a5a42', topKind: 'jacket', inner: '#f0eadc', tie: '#8a2a2a', pants: '#4a4030', boots: '#2a1a14', hat: 'boater', hatColor: '#e8d8a8', beard: 'stache', beardColor: '#2a1a10', eyes: '#3a2a1a' };
const BUILDER: T7Look = { skin: '#b07850', hair: '#1a1210', hairStyle: 'short', nose: 'round', head: { w: 1.02, jaw: 1.15 }, top: '#7a8aa0', topKind: 'shirt', pants: '#3a3a4a', boots: '#2a1e14', hat: 'flatcap', hatColor: '#4a4038', sleeves: 'rolled', build: 1.1, eyes: '#2a1a10' };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
type Opt = Partial<ActorState> & { a?: T7Prop; b?: T7Prop };
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Opt = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1100, seed: id.length * 3 + 5, t7A: o.a, t7B: o.b, rim: '#fff2d8', rimSide: 1, ...o });
const SUN = (focus: V3, i = 3.0, size = 22) => ({ dir: [-.45, .62, .5] as V3, color: '#fff0d8', i, focus, size });
const CALM = { set: 'galv', hemi: { sky: '#bcd8ff', ground: '#9a8a6a', i: 1.0 }, fog: { color: '#cfe0ee', density: .006 } };
const STORM = (s: number) => ({ set: 'galv', storm: s, hemi: { sky: s > .5 ? '#6a7484' : '#a8c0e0', ground: '#5a5040', i: lerp(1.0, .6, s) }, fog: { color: s > .5 ? '#4a5058' : '#b8c8d8', density: lerp(.006, .025, s) } });
const GR = { sat: 1.08, contrast: 1.07, bloom: .26, bloomTh: 1.3, vignette: .26, exposure: 1.0, lift: [.03, .03, .05] as [number, number, number], gain: [1.03, 1, .97] as [number, number, number], grain: .03 };
type S = { a: number; b: number; f: (t: number) => GalvFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => GalvFrame) => SH.push({ a, b, f });
const frame = (t: number, cam: ReturnType<typeof rig>, o: Partial<GalvFrame>, ap = 0): GalvFrame => ({ t, ...CALM, cam, grade: { ...GR, focus: cam.focusDist ?? 6, aperture: ap }, ...o } as GalvFrame);
const ST = STAFF_TOP; const FL: V3 = [ST[0] + .9, 21.6, ST[2]];   // where the storm flag flies

// 1 — HOOK: low under the rooftop flagstaff, the red flag cracks in the wind against a blue sky with a bruise of cloud far out at sea…
shot(0, C[3], t => {
  const keys: Key[] = [{ t: 0, pos: [ST[0] + 2.4, 18.6, ST[2] + 3.2], look: [FL[0], FL[1] - .2, FL[2]], fov: 42 }, { t: C[1] + .3, pos: [ST[0] + 3.4, 19.9, ST[2] + 4.6], look: [FL[0], FL[1] - .5, FL[2]], fov: 34 },
    { t: C[2] + .4, pos: [ST[0] + 3.4, 20.8, ST[2] + 4.5], look: [ST[0] + 4, 19, ST[2] - 12], fov: 40 }, { t: C[3], pos: [ST[0] + 10, 24, ST[2] + 12], look: [0, 6, -70], fov: 46 }];
  const cam = rig(keys, t);
  return frame(t, cam, { storm: .12, sun: SUN([ST[0], 18, ST[2]], 3, 30), flags: { up: 1 }, wind: .45,
    overlay: chip('RED · BLACK SQUARE', 260, ss(C[1] + .2, C[1] + .5, t), '#ff5a4a') + chip('STORM WARNING', 370, ss(C[2] + .2, C[2] + .5, t), '#ffd23f') + captions(F, t) }, 0);
});
// 2 — Galveston, 7 Sept 1900: Isaac Cline on the beach studying the swells… then on the roof, the flags run up the staff
shot(C[3], C[6], t => {
  if (t < C[5]) { const keys: Key[] = [{ t: C[3], pos: [-4, 30, -30], look: [4, 0, -130], fov: 50 }, { t: C[4], pos: [-2.2, 2.6, -134], look: [2.8, 1.3, -150], fov: 44, focus: [1.2, 1.6, -141.5] }, { t: C[5], pos: [-.8, 2.0, -137.2], look: [3.4, 1.5, -146], fov: 38, focus: [1.2, 1.6, -141.5] }];
    const cam = rig(keys, t); const look = ss(C[4] + .2, C[4] + 1, t);
    return frame(t, cam, { storm: .1, sea: .55, sun: SUN([0, 0, -140], 3.2, 26), actors: [act('cline', CLINE, [1.2, 0, -141.5], pose({ turn: lerp(.35, .8, look), headTurn: -.2 * look, handB: [.5, -2.9], shapeB: 'grip', frontB: 1, headLift: .04 }, t, .3), EXPR.concentrating, t, { b: 'telescope' })],
      overlay: chip('GALVESTON, TEXAS', 260, ss(C[3] + .2, C[3] + .5, t)) + chip('7 SEPTEMBER 1900', 370, ss(C[3] + .9, C[3] + 1.2, t), '#ffd23f') + chip('ISAAC CLINE · WEATHER BUREAU', 260, ss(C[4] + .4, C[4] + .7, t) * (1 - ss(C[5] - .3, C[5], t)), '#5fd1ff') + captions(F, t) }, .3); }
  const pull = ss(C[5] + .2, C[6] - .3, t); const yank = Math.sin((t - C[5]) * 7) * .5 + .5;
  const keys: Key[] = [{ t: C[5], pos: [ST[0] - 3.2, 19.7, ST[2] + 4.4], look: [ST[0] + .4, 19.3, ST[2]], fov: 44 }, { t: C[6], pos: [ST[0] - 4.8, 19.3, ST[2] + 6.2], look: [ST[0] + .6, 20.9, ST[2]], fov: 50 }];
  const cam = rig(keys, t);
  return frame(t, cam, { storm: .12, sun: SUN([ST[0], 18, ST[2]], 3.0, 10), flags: { up: pull }, wind: .4,
    actors: [act('clerk', CLERK, [ST[0] + .45, 18, ST[2] + .35], pose({ turn: -.5, handA: [-.3, lerp(-3.1, -2.5, yank)], handB: [-.25, lerp(-2.5, -2.0, 1 - yank)], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1, lean: -.06 }, t, .2), EXPR.determined, t, { a: 'rope' })],
    overlay: chip('WARNING FLAGS UP', 260, ss(C[5] + .6, C[5] + .9, t), '#ff5a4a') + captions(F, t) }, 0);
});
// 3 — "But the sky was calm." a long tracking shot down the busy street: shops open, people strolling… to the beach crowd watching the waves… then the flatness
shot(C[6], C[9], t => {
  const k = kk(t, C[6], C[8]); const people = (z0: number) => [
    act('l1', LADY, [-3.6, .18, z0 - 4 + (t - C[6]) * .9], { ...walkPose((t - C[6]) * 1.1, 1, { turn: .55 }) } as Pose, EXPR.happy, t),
    act('g1', GENT, [3.4, .18, z0 - 10 - (t - C[6]) * 1.0], { ...walkPose((t - C[6]) * 1.15, -1, { turn: .45 }) } as Pose, EXPR.calm, t),
    act('l2', LADY2, [-1.2, 0, z0 - 16], pose({ turn: .3, handB: [.6, -2.1], frontB: 1 }, t, .5), EXPR.happy, t)];
  if (t < C[7] + 1.6) { const keys: Key[] = [{ t: C[6], pos: [0, 2.4, 6], look: [0, 6, -40], fov: 46 }, { t: C[7], pos: [-1.2, 1.7, -8], look: [-3, 1.6, -24], fov: 44 }, { t: C[7] + 1.6, pos: [1.2, 1.7, -22], look: [2, 1.4, -40], fov: 44 }];
    const cam = rig(keys, t); return frame(t, cam, { storm: .05, sun: SUN([0, 0, -20], 3.2, 30), flags: { up: 1 }, actors: people(-12), overlay: chip('SKY: CALM', 260, ss(C[6] + .2, C[6] + .5, t), '#5fd1ff') + captions(F, t) }, 0); }
  if (t < C[8]) { const keys: Key[] = [{ t: C[7] + 1.6, pos: [4, 1.6, -134], look: [8, 1.2, -170], fov: 44 }, { t: C[8], pos: [1, 1.5, -136.5], look: [6, 1.0, -170], fov: 40 }]; const cam = rig(keys, t);
    return frame(t, cam, { storm: .15, sea: .7, sun: SUN([4, 0, -142], 3.2, 22), actors: [act('l1', LADY, [3, 0, -141], pose({ back: 1, turn: .1, handA: [-.6, -3.1], shapeA: 'point' }, t, .4), EXPR.amazed, t), act('g1', GENT, [5.3, 0, -141.5], pose({ back: 1, turn: -.1 }, t, .4), EXPR.calm, t), act('l2', LADY2, [7.4, 0, -140.6], pose({ back: 1, turn: .2 }, t, .4), EXPR.happy, t)], overlay: captions(F, t) }, .25); }
  const keys: Key[] = [{ t: C[8], pos: [-26, 2.6, -160], look: [4, 2.5, -100], fov: 48 }, { t: C[9], pos: [-34, 3.2, -164], look: [4, 2.5, -96], fov: 50 }]; const cam = rig(keys, t);
  return frame(t, cam, { storm: .2, sea: .8, sun: SUN([0, 0, -135], 3.0, 30), overlay: chip('HIGHEST POINT: UNDER 9 FT', 260, ss(C[8] + .5, C[8] + .8, t), '#ffd23f')  + captions(F, t) }, 0);
});
// 4 — the next day: the same street goes black, the wind tears at awnings and flag, then the sea climbs the street (no casualties shown)
shot(C[9], C[13], t => {
  const s = ss(C[9], C[9] + 2.2, t); const lt = (tt: number) => Math.max(0, 1 - Math.abs(t - tt) * 9); const light = lt(C[9] + 1.6) + lt(C[10] + .6) * .8 + lt(C[12] + .4);
  if (t < C[11]) { const keys: Key[] = [{ t: C[9], pos: [0, 2.2, 4], look: [0, 7, -40], fov: 48 }, { t: C[10], pos: [.6, 2.6, -2], look: [ST[0] + 1, 19, ST[2]], fov: 44 }, { t: C[11], pos: [ST[0] + 6, 16, ST[2] + 8], look: [FL[0], FL[1] - .5, FL[2]], fov: 36 }];
    const cam = rig(keys, t); const run = ss(C[10], C[10] + 2, t);
    return frame(t, cam, { ...STORM(s), sun: SUN([0, 0, -10], lerp(3, .6, s), 30), flags: { up: 1, torn: ss(C[10] + .5, C[11], t) * .8 }, wind: lerp(.3, 1.6, s), lightning: light,
      actors: s > .5 ? [act('g1', GENT, [-2 + run * 4, 0, -14 + run * 10], runPose2(t), EXPR.scared, t, { rim: '#c8d4ff' }), act('l1', LADY, [1 + run * 3, 0, -18 + run * 10], runPose2(t + .3), EXPR.panic, t, { rim: '#c8d4ff' })] : [],
      overlay: chip('8 SEPTEMBER', 260, ss(C[9] + .2, C[9] + .5, t)) + chip('130+ MPH WINDS', 370, ss(C[10] + .3, C[10] + .6, t), '#ff8a5a') + captions(F, t) }, 0); }
  const sg = ss(C[11], C[12] + 1.5, t) * 4.6 - .2;   // surge climbs the street (to the second floor)
  if (t < C[12]) { const keys: Key[] = [{ t: C[11], pos: [2.5, 1.0, -6], look: [-6, 1.6, -16], fov: 46 }, { t: C[12], pos: [2.8, 5.4, -5], look: [-6, 3.2, -20], fov: 48 }]; const cam = rig(keys, t);
    return frame(t, cam, { ...STORM(1), sun: SUN([0, 0, -10], .5, 30), surge: sg, flags: { up: 1, torn: .9 }, wind: 1.6, lightning: light, overlay: chip('STORM SURGE · 15+ FT', 260, ss(C[11] + .3, C[11] + .6, t), '#5fd1ff') + `<div style="position:absolute;left:0;right:0;top:${lerp(1500, 760, ss(C[11], C[12], t))}px;height:5px;background:#5fd1ff;opacity:.75"></div>` + captions(F, t) }, 0); }
  const keys: Key[] = [{ t: C[12], pos: [-14, 30, 30], look: [0, 0, -50], fov: 52 }, { t: C[13], pos: [-30, 46, 50], look: [0, 0, -60], fov: 56 }]; const cam = rig(keys, t);
  return frame(t, cam, { ...STORM(1), fog: { color: '#4a5058', density: .007 }, sun: SUN([0, 0, -30], .5, 60), surge: 4.4, staffBroken: t > C[12] + 1.2, flags: { up: 1, torn: 1 }, wind: 1.8, lightning: light, overlay: captions(F, t) }, 0);
});
function runPose2(t: number): Pose { const ph = t * 3.2 * Math.PI; const s = Math.sin(ph); return { ...STAND, turn: .4, lean: .15, crouch: .1, hipX: 0, headTilt: 0, headTurn: 0, headLift: 0, footA: [-.4 + s * .5, -.08 - Math.max(0, s) * .4], footB: [.4 - s * .5, -.08 - Math.max(0, -s) * .4], handA: [-.5, -3.0], handB: [.3, -3.1], shapeA: 'open', shapeB: 'open', frontA: 1, frontB: 1 }; }
// 5 — after: a still, grey-gold dawn over the water; the broken flagstaff, a torn rag of red. Respectful hold, slow push. (no bodies, no wreckage close-ups)
shot(C[13], C[15], t => {
  const keys: Key[] = [{ t: C[13], pos: [ST[0] + 2.6, 21.2, ST[2] + 5.5], look: [ST[0] + 1.5, 18.5, ST[2] - 6], fov: 44 }, { t: C[15], pos: [ST[0] + 3.4, 20.6, ST[2] + 3.0], look: [2, 3, -80], fov: 46 }];
  const cam = rig(keys, t, { easing: ease.inOut5 });
  return frame(t, cam, { set: 'galv', storm: .35, dawn: 1, hemi: { sky: '#d8c0b0', ground: '#6a5a4a', i: .8 }, fog: { color: '#c8b4a4', density: .005 }, sun: { dir: [.7, .2, -.4], color: '#ffc890', i: 1.8, focus: [ST[0], 18, ST[2]], size: 14 }, surge: .25, staffBroken: true, flags: { up: 1, torn: 1 }, wind: .15,
    grade: { ...GR, sat: .85, focus: cam.focusDist ?? 6, aperture: .3 }, overlay: card('AT LEAST 6,000', 'LIVES LOST', ss(C[13] + .5, C[13] + 1.0, t) * (1 - ss(C[14] - .3, C[14], t)), 300) + chip('DEADLIEST NATURAL DISASTER IN U.S. HISTORY', 300, ss(C[14] + .2, C[14] + .5, t), '#cfd6ff') + captions(F, t) } as Partial<GalvFrame>, .3);
});
// 6 — the payoff: a crane along the new seawall as builders work… a house rises on jacks… today the wall still holds back the Gulf. End card.
shot(C[15], 60.01, t => {
  const rs = ss(w('raised', 1, C[15] + 2) - .3, w('raised', 1, C[15] + 2) + 1.5, t);
  if (t < C[16]) { const keys: Key[] = [{ t: C[15], pos: [-1.5, 6.2, -141], look: [4, 5.6, -133.5], fov: 46 }, { t: C[15] + 2, pos: [1, 7.5, -142], look: [-2, 3.5, -122], fov: 46 }, { t: C[16], pos: [7, 6.5, -128], look: [-2, 3.8, -118], fov: 44 }];
    const cam = rig(keys, t);
    return frame(t, cam, { storm: .05, sea: .4, seawall: 1, raise: rs, sun: SUN([4, 0, -130], 3.0, 40),
      actors: [act('b1', BUILDER, [2, 5.2, -133.5], pose({ turn: .6, handA: [.4, -2.6], handB: [1.1, -2.2], shapeA: 'grip', frontA: 1, frontB: 1, lean: .1 + Math.sin(t * 3) * .05 }, t, .3), EXPR.determined, t, { a: 'shovel' }),
        act('b2', { ...BUILDER, skin: '#e0b088', top: '#a08a6a', hat: 'flatcap', hatColor: '#6a5a48' }, [6.4, 5.2, -133.2], pose({ turn: -.5, handA: [-1.0, -2.6 + Math.sin(t * 4) * .3], shapeA: 'grip', frontA: 1 }, t, .3), EXPR.focused, t, { a: 'hammer' })],
      overlay: chip('THE SEAWALL', 260, ss(C[15] + .3, C[15] + .6, t), '#ffd23f') + chip('THE WHOLE CITY RAISED', 370, ss(w('raised', 1, C[15] + 2), w('raised', 1, C[15] + 2) + .3, t), '#5fd16f') + captions(F, t) }, 0); }
  const keys: Key[] = [{ t: C[16], pos: [-14, 2.6, -150], look: [2, 4, -118], fov: 46 }, { t: 60, pos: [-30, 12, -160], look: [0, 4, -112], fov: 50 }];
  const cam = rig(keys, t);
  return frame(t, cam, { storm: .05, sea: .9, seawall: 1, sun: { dir: [.8, .25, -.3] as V3, color: '#ffc890', i: 2.6, focus: [0, 0, -132], size: 40 }, hemi: { sky: '#e8c8b0', ground: '#7a6a52', i: .9 },
    grade: { ...GR, fade: ss(59.3, 60, t) * .9 }, overlay: card('STILL STANDING', 'GALVESTON SEAWALL · 1904–TODAY', ss(C[16] + 1.2, C[16] + 1.6, t), 300) + captions(F, t) } as Partial<GalvFrame>, 0);
});

export function frameAt(n: number): GalvFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
void orbitKeys;
