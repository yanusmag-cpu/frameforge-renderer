// YunoWorld v9 · "They Put PIGEONS Inside a Missile" — 60 s, 15 directed shots across six Blender sets.
// Verified (see frameforge-studio yw-v9/FACT_CHECK.md): B.F. Skinner's Project Pigeon; OSRD/NDRC skeptical but funded a
// $25,000 contract via General Mills in 1943; a lens in the nose projected the target onto a screen the trained pigeon
// pecked, and the pecks steered the bomb; one pigeon pecked 10,000 times in 45 minutes; three pigeons (majority vote);
// officials were amused rather than impressed, cancelled in 1944; revived by the Navy as Project ORCON 1948–1953.
import { STAND, idle, walkPose, type Pose } from '../../ff2d/rig.ts';
import { expr } from '../../ff2d/face.ts';
import { clamp, lerp, ss, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease, type Key } from '../../yw7/cam7.ts';
import type { Frame9, PropF, Beam } from '../engine9.ts';
import { pigeonSvg, type PigeonState } from '../pigeon9.ts';
import { captions, chip, wt } from '../ui9.ts';

export const FPS = 30, FRAMES = 1800;
const FILM = 'pigeon';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);

// ------------------------------------------------------------------ cast (original designs)
const SKINNER: T7Look = { skin: '#f1c9a5', hair: '#5a3d26', hairStyle: 'side', nose: 'long', head: { w: .9, h: 1.07, jaw: .95, chin: 1.05 }, top: '#7a6f60', topKind: 'suit', inner: '#f3efe4', tie: '#8a2f2a', pants: '#5d564c', boots: '#2a2018', glasses: true, eyes: '#4a5a7a' };
const GENERAL: T7Look = { skin: '#e9b391', hair: '#dcdcd8', hairStyle: 'short', nose: 'round', head: { w: 1.12, h: 1.0, jaw: 1.18, cheek: 1.12 }, top: '#62703f', topKind: 'jacket', trim: '#d9b44a', buttons: '#e2c25a', inner: '#c9b98c', tie: '#4a4030', pants: '#5a6739', boots: '#24190f', beard: 'stache', beardColor: '#efefea', build: 1.22, belly: 1.25, hat: 'driver', hatColor: '#55613a', eyes: '#3a4a5a' };
const OFF2: T7Look = { skin: '#f0caa8', hair: '#8a8a88', hairStyle: 'bald', nose: 'hook', head: { w: .95, h: 1.08, jaw: .9 }, top: '#2f3542', topKind: 'suit', inner: '#f2ede2', tie: '#2a4a6a', pants: '#2a2f3a', boots: '#121010', glasses: true, eyes: '#4a5a6a' };
const OFF3: T7Look = { skin: '#d9a47e', hair: '#bdb6aa', hairStyle: 'curly', nose: 'snub', head: { w: 1.05, jaw: 1.0, cheek: 1.08 }, top: '#4c3b30', topKind: 'suit', inner: '#efe6d2', tie: '#6a2a2a', pants: '#3c2f27', boots: '#141010', beard: 'chops', beardColor: '#bdb6aa', eyes: '#4a3a2a', build: 1.05 };
const NAVY: T7Look = { skin: '#eebd98', hair: '#2a2420', hairStyle: 'swept', nose: 'snub', head: { w: .95, jaw: 1.0 }, top: '#f2f0ea', topKind: 'coat', inner: '#2f4f6f', tie: '#1d2f4a', pants: '#2f3a4a', boots: '#141414', eyes: '#3a5a7a' };
const FR1: T7Look = { skin: '#f2cfb0', hair: '#7a3a22', hairStyle: 'bun', nose: 'button', head: { w: .92, jaw: .85, chin: .95 }, top: '#c94f4f', topKind: 'dress', inner: '#f2e6d0', trim: '#7a2a2a', pants: '#c94f4f', boots: '#3a2a22', skirt: true, eyes: '#3a6a5a' };
const FR2: T7Look = { skin: '#c98d66', hair: '#1e1a16', hairStyle: 'short', nose: 'round', head: { w: 1.02, jaw: 1.05 }, top: '#3f6f8f', topKind: 'jacket', inner: '#e8e2d4', pants: '#3a3a42', boots: '#1e1814', hat: 'flatcap', hatColor: '#4a4a52', eyes: '#3a2a1a' };
const FR3: T7Look = { skin: '#f0c8a8', hair: '#c8a050', hairStyle: 'curly', nose: 'snub', head: { w: 1.0, jaw: .95 }, top: '#8a6a3a', topKind: 'waistcoat', inner: '#f0ead8', pants: '#4a3a2a', boots: '#2a1e14', eyes: '#4a6a8a', build: .95 };
const TRAV: T7Look = { skin: '#e2b48e', hair: '#3a2a1e', hairStyle: 'short', nose: 'long', head: { w: .9, h: 1.05 }, top: '#3a3e4a', topKind: 'suit', inner: '#efe9dc', tie: '#a8342a', pants: '#2e3240', boots: '#141010', hat: 'bowler', hatColor: '#24242a', eyes: '#3a4a5a' };

const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** turn/back for a 2D cut-out facing world yaw `yaw` (0 = +z) seen from the camera */
const facing = (p: V3, yaw: number, cam: V3) => { const a = Math.atan2(cam[0] - p[0], cam[2] - p[2]); const r = wrap(yaw - a); return { turn: clamp(Math.sin(r) * 1.15, -1, 1), back: Math.cos(r) < -.35 ? 1 : 0 }; };
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1300, seed: id.length * 7 + 1, rim: '#ffd8a8', rimSide: 1, ...o });
const PG = .172;   // pigeon cut-out scale for a 33 cm bird
const bird = (id: string, pos: V3, s: PigeonState, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: STAND, face: expr('neutral'), pos, t, svgOnly: pigeonSvg({ id, t, ...s }), scale: PG, res: 1100, contact: .5, ...o });
const blinkAt = (t: number, seed: number) => { const p = (t + seed * 1.7) % 3.3; return p < .12 ? Math.sin(p / .12 * Math.PI) : 0; };
const peckCycle = (t: number, rate: number, amp = 1) => { const p = (t * rate) % 1; return amp * (p < .35 ? ease.out(p / .35) : 1 - ease.inOut((p - .35) / .65)); };
const at = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const XC: V3 = [0, 1.3, 0];   // cone position in the x-ray studio
const bay = (i: number, dx = .5): V3 => { const a = Math.PI / 2 + i * 2.094; return [XC[0] + dx, XC[1] + Math.cos(a) * .2 - .055, XC[2] + Math.sin(a) * .2]; };
const PB = PG * .6;

// ------------------------------------------------------------------ set lighting presets (coloured shadows, never black)
type Base = Partial<Frame9>;
const LAB_BEAMS: Beam[] = [2.7, 0, -2.7].map(z => ({ p: [-5.85, 2.25, z] as V3, dir: [1, -.52, -.12] as V3, w: 1.3, h: 2.2, len: 8.5, c: [1, .78, .5] as [number, number, number], i: 1 }));
const LAB: Base = { set: 'lab', sun: { dir: [-.85, .5, .12], color: '#ffcf96', i: 3.4, focus: [0, 1, 0], size: 8 }, hemi: { sky: '#a6b4dc', ground: '#6b4b32', i: .75 }, fill: { color: '#ffe1c0', i: .25 },
  fog: { color: '#cfae86', density: .014 }, bg: '#2a2018', beams: LAB_BEAMS, dust: { box: [[-5.8, .2, -4], [2.5, 3.8, 4]], i: .9 },
  lights: [{ p: [-1.6, 2.75, -.4], c: [1, .78, .5], i: 2.2, d: 6 }, { p: [1.6, 2.75, -.4], c: [1, .78, .5], i: 2.2, d: 6 }, { p: [0, 2.75, 2.2], c: [1, .78, .5], i: 1.8, d: 6 }, { p: [1.3, 1.25, -.75], c: [1, .85, .6], i: 1.2, d: 3 }],
  grade: { ao: .9, aoRadius: .45, aoTint: [.42, .34, .58], sat: 1.18, contrast: 1.07, lift: [.03, .022, .06], gain: [1.05, 1.0, .93], bloom: .3, bloomTh: 1.3, vignette: .26 } };
const WAR: Base = { set: 'war', sun: { dir: [.22, .55, -1], color: '#e9f1ff', i: 2.3, focus: [0, 1, .4], size: 7 }, hemi: { sky: '#9cc4c6', ground: '#5a3424', i: .8 }, fill: { color: '#ffe2c2', i: .3 }, bg: '#1a1a1a',
  fog: { color: '#30474a', density: .01 }, beams: [1.6, 9.4].map(u => ({ p: [-5.5 + u, 2.1, -3.85] as V3, dir: [-.12, -.45, 1] as V3, w: 1.3, h: 1.9, len: 6, c: [.85, .92, 1] as [number, number, number], i: .8 })),
  dust: { box: [[-5, .3, -3.8], [5, 3.4, 3]], i: .5 },
  lights: [-1.4, 0, 1.4].map(x => ({ p: [x + .05, 1.12, .15] as V3, c: [1, .8, .52] as [number, number, number], i: 1.6, d: 3.2 })).concat([{ p: [0, 3.3, .4], c: [1, .88, .7], i: 1.4, d: 8 }]),
  grade: { ao: .9, aoRadius: .4, aoTint: [.3, .38, .5], sat: 1.14, contrast: 1.08, lift: [.02, .03, .05], gain: [1.03, 1.0, .96], bloom: .3, bloomTh: 1.25, vignette: .3 } };
const OUTSKY = { top: '#3b78c4', mid: '#93c2ea', bot: '#f6ddb6', sun: [-.6, .38, -.6] as V3, sunC: '#fff0c8', clouds: .55 };
const RANGE: Base = { set: 'range', sky: OUTSKY, sun: { dir: [-.6, .42, -.6], color: '#ffdcaa', i: 3.6, focus: [0, 0, 0], size: 28 }, hemi: { sky: '#a4cdf2', ground: '#58793a', i: .95 }, fill: { color: '#fff0dd', i: .15 },
  fog: { color: '#c9dcec', density: .0065 }, grade: { ao: .7, aoRadius: .6, aoTint: [.38, .42, .62], sat: 1.2, contrast: 1.06, lift: [.02, .025, .055], gain: [1.04, 1.0, .95], bloom: .22, bloomTh: 1.5, vignette: .22 } };
const COAST: Base = { set: 'coast', sky: { ...OUTSKY, sun: [.35, .45, -.8] }, sea: { c1: '#17617f', c2: '#4ec0c6' }, sun: { dir: [.35, .45, -.8], color: '#ffe2b4', i: 3.4, focus: [20, 0, -40], size: 60 },
  hemi: { sky: '#a4cdf2', ground: '#4f7a3a', i: .95 }, fog: { color: '#cfe2ef', density: .0035 }, grade: { ao: .5, aoRadius: 1.2, aoTint: [.38, .42, .62], sat: 1.2, contrast: 1.05, lift: [.02, .025, .055], gain: [1.04, 1.0, .96], bloom: .25, bloomTh: 1.4, vignette: .2 } };
const STREET: Base = { set: 'street', sky: { top: '#4a7fc2', mid: '#a5c8e8', bot: '#f8d6a6', sun: [.55, .42, .7], sunC: '#ffe6c0', clouds: .45 }, sun: { dir: [.55, .42, .7], color: '#ffd7a0', i: 3.3, focus: [4, 0, 4], size: 16 },
  hemi: { sky: '#a9c6ec', ground: '#7a6a58', i: .9 }, fog: { color: '#d8dcea', density: .008 }, grade: { ao: .85, aoRadius: .5, aoTint: [.36, .36, .6], sat: 1.2, contrast: 1.07, lift: [.025, .025, .06], gain: [1.05, 1.0, .94], bloom: .22, bloomTh: 1.45, vignette: .22 } };
const NAVYL: Base = { set: 'navy', sun: { dir: [.25, .6, -1], color: '#eef6ff', i: 2.6, focus: [0, 1, 0], size: 8 }, hemi: { sky: '#dce8ee', ground: '#7d8686', i: 1.0 }, fill: { color: '#f4f8ff', i: .3 }, bg: '#1a1d20',
  fog: { color: '#b9c8cc', density: .01 }, beams: [2, 6, 10].map(u => ({ p: [-6 + u, 2.0, -4.35] as V3, dir: [-.1, -.5, 1] as V3, w: 1.3, h: 1.9, len: 6.5, c: [.9, .96, 1] as [number, number, number], i: .6 })),
  lights: [{ p: [-2, 3.6, 0], c: [.95, 1, 1], i: 2.2, d: 8 }, { p: [2, 3.6, 0], c: [.95, 1, 1], i: 2.2, d: 8 }, { p: [-4.6, 1.8, 2.3], c: [1, .7, .4], i: 0, d: 3 }],
  grade: { ao: .85, aoRadius: .4, aoTint: [.32, .4, .52], sat: 1.12, contrast: 1.06, lift: [.02, .03, .05], gain: [1.02, 1.0, .98], bloom: .28, bloomTh: 1.3, vignette: .26 } };

// cone placements
const CONE_LAB: V3 = [-.95, 1.56, -.3]; const CONE_ROT_LAB: V3 = [Math.PI / 2, 0, 0];   // hatch faces the camera side (+z)
const coneWorld = (base: V3, local: V3): V3 => [base[0] + local[0], base[1] - local[2], base[2] + local[1]];  // for CONE_ROT_LAB
const HATCH = coneWorld(CONE_LAB, [.6, .47, 0]);

type Shot = { t0: number; t1: number; f: (t: number, k: number) => Partial<Frame9> };
// (k = 0..1 progress through the shot)
const ov: string[] = [];

function timeline(): Shot[] {
  // narration anchors (word stamps; fallbacks are the planned times)
  const T = {
    no: w('no', 1, 3.2), wants: w('wants', 1, 5.7), war: w('world', 1, 8.9), so: w('so', 1, 12.4), officials: w('officials', 1, 16.6),
    trick: w("here's", 1, 21.9), pecks: w('pecks', 1, 26.4), drifts: w('drifts', 1, 28.6), one: w('one', 1, 33.3), but: w('but', 2, 37.3),
    see: w('see', 1, 41.0), amused: w('amused', 1, 47.0), after: w('after', 1, 51.0), ran: w('kept', 1, 54.4), end: 59.0 };
  return [
    // S1 — hook: low dolly behind Skinner's shoulder, orbit to his hands lowering the sock-jacketed pigeon into the hatch
    { t0: 0, t1: T.no, f: (t, _k) => {
      const keys: Key[] = [{ t: 0, pos: [-.9, 1.25, 2.4], look: [-.35, 1.55, .1], fov: 44 }, { t: 1.4, pos: [.4, 1.55, 1.75], look: [-.35, 1.6, .2], fov: 40 }, { t: T.no, pos: [.55, 1.7, .95], look: [-.35, 1.62, .2], fov: 36 }];
      const c = rig(keys, t); const sp: V3 = [-.32, 0, .62]; const fc = facing(sp, Math.PI, c.pos);
      const lower = ss(.6, 2.6, t);
      return { ...LAB, cam: c, props: [cone(t, { hatch: 1 })],
        actors: [act('skinner', SKINNER, sp, pose({ ...fc, lean: .12, handA: [-.3, -3.55 - .2 * (1 - lower)], handB: [.3, -3.55 - .2 * (1 - lower)], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1, headTilt: .15 }, t, .3),
          expr('focused', 'happy', .3), t, { rim: '#ffcf96', rimSide: -1 }),
          bird('p1', [HATCH[0], HATCH[1] + .05 + .12 * (1 - lower), HATCH[2] + .2 - .12 * lower], { sock: true, mood: 'keen', blink: blinkAt(t, 1), gx: .6, dir: -1, peck: 0 }, t, { contact: 0, res: 1300 })],
        grade: { ...LAB.grade, aperture: 1.2, focus: 1.1 } };
    } },
    // S2 — close-up: the pigeon's face in the hatch, Skinner grinning behind it (push-in)
    { t0: T.no, t1: T.wants, f: (t, k) => {
      const c = rig([{ t: T.no, pos: [-.85, 1.72, 1.25], look: [-.12, 1.6, .32], fov: 32 }, { t: T.wants, pos: [-.7, 1.68, .98], look: [-.12, 1.6, .32], fov: 30 }], t);
      return { ...LAB, cam: c, props: [cone(t, { hatch: 1 })],
        actors: [act('skinner', SKINNER, [.25, 0, .58], pose({ turn: -.55, lean: -.12, handA: [-.4, -2.3], handB: [.4, -2.3], shapeA: 'open', shapeB: 'open', headTilt: -.1 }, t, .4), expr('happy', 'excited', .4 + .3 * Math.sin(t * 3)), t, { res: 1600 }),
          bird('p1', [HATCH[0], HATCH[1] - .05, HATCH[2] + .1], { sock: true, mood: k > .5 ? 'surprised' : 'keen', blink: blinkAt(t, 2), gx: -.2 + .6 * k, gy: .2, dir: 1, bob: Math.sin(t * 7) * .5 }, t, { contact: 0, res: 1500 })],
        grade: { ...LAB.grade, aperture: 2.2, focus: .45 } };
    } },
    // S3 — "He wants the pigeon to FLY it!": hatch snaps shut, fast pull-back + crane up reveals the sunlit workshop
    { t0: T.wants, t1: T.war, f: (t, _k) => {
      const c = rig([{ t: T.wants, pos: [.2, 1.7, .9], look: [-.35, 1.55, -.1], fov: 34 }, { t: T.wants + .9, pos: [1.8, 2.3, 3.2], look: [-.2, 1.4, -.6], fov: 40 }, { t: T.war, pos: [3.4, 3.4, 5.4], look: [-.6, 1.2, -1.2], fov: 44 }], t, { easing: ease.out });
      const shut = ss(T.wants + .1, T.wants + .35, t);
      return { ...LAB, cam: c, props: [cone(t, { hatch: 1 - shut })],
        actors: [act('skinner', SKINNER, [.55, 0, .7], pose({ turn: -.6, handB: [1.0, -3.6 - Math.sin(t * 6) * .1], shapeB: 'point', handA: [-.4, -2.0], headLift: .1 }, t, .5), expr('excited', 'laugh', .3), t)] };
    } },
    // S4 — WWII: bombs miss. Low angle from the grass as a bomb whistles past, crane up reveals the scattered craters
    { t0: T.war, t1: T.so, f: (t, _k) => {
      const c = rig([{ t: T.war, pos: [-6, .55, 11], look: [0, 3.2, -2], fov: 46 }, { t: T.war + 1.6, pos: [-5, 1.4, 12], look: [6, 1.2, -6], fov: 44 }, { t: T.so, pos: [-14, 15, 26], look: [0, 0, 0], fov: 42 }], t);
      const bt = t - T.war; const bx = lerp(-30, 10.5, clamp(bt / 1.5)), by = lerp(26, 0, ease.in(clamp(bt / 1.5))), bz = lerp(-30, -8.8, clamp(bt / 1.5));
      const S: Sprite[] = []; const R = (n: number) => Math.abs(Math.sin(n * 91.7)) % 1;
      if (bt > 1.5) for (let i = 0; i < 24; i++) { const a = bt - 1.5; const ang = R(i) * 6.28; S.push({ p: [11 + Math.cos(ang) * (.4 + a * 1.4 * R(i + 3)), .3 + a * (2.5 * R(i + 7)) - a * a * .9, -9 + Math.sin(ang) * (.4 + a * 1.4 * R(i + 5))], s: 1.2 + a * .9, rot: R(i) * 6, c: [.62, .5, .38], a: .85 * clamp(1 - a / 2.6), kind: 0, seed: R(i), age: a }); }
      return { ...RANGE, cam: c, props: bt < 1.6 ? [{ id: 'glider', pos: [bx, by, bz], rot: [0, -.48, -.6], scale: .8 }] : [], sprites: S, shake: bt > 1.5 && bt < 1.9 ? .04 : 0 };
    } },
    // S5 — "So a psychologist named B.F. Skinner shows up with a plan, and a box full of pigeons": tracking shot along the
    // committee table as he carries the box in; officials turn
    { t0: T.so, t1: T.officials, f: (t, k) => {
      const wk = at(t, T.so, T.officials - 1.0); const sx = lerp(3.6, .6, ease.inOut(wk)); const sp: V3 = [sx, 0, 2.15];
      const c = rig([{ t: T.so, pos: [5.0, 1.55, 4.6], look: [3.2, 1.3, 1.6], fov: 40 }, { t: T.officials, pos: [1.6, 1.6, 4.4], look: [.2, 1.1, .6], fov: 38 }], t);
      const walking = wk < 1; const p = walking ? walkPose((t - T.so) * 1.6, -1, { turn: -1 }) as Pose : pose({ turn: -.4 }, t);
      const box: V3 = walking ? [sx - .42, 1.1, 2.3] : [lerp(sx - .42, .2, ss(T.officials - 1.0, T.officials - .4, t)), lerp(1.1, .82, ss(T.officials - 1.0, T.officials - .4, t)), lerp(2.3, .6, ss(T.officials - 1.0, T.officials - .4, t))];
      return { ...WAR, cam: c, hideNodes: { cheque: true },
        props: [], extraNodes: { pbox: { pos: [box[0] - 2.9, box[1] - .25, box[2] - 2.6] } },
        actors: [act('skinner', SKINNER, sp, { ...p, handA: [-.9, -2.7], handB: [-.3, -2.7], shapeA: 'grip', shapeB: 'grip', frontA: 1, frontB: 1 }, expr('confident', 'happy', .4), t),
          act('gen', GENERAL, [-1.1, 0, -.75], pose({ turn: .55, crouch: .55, kneeUp: true, handA: [-.3, -1.7], handB: [.5, -1.8] }, t, .3), expr('suspicious', 'smug', k), t, { seed: 4 }),
          act('off2', OFF2, [.0, 0, -.75], pose({ turn: .7, crouch: .55, kneeUp: true, handA: [-.3, -1.7], handB: [.4, -1.8] }, t, .3), expr('curious', 'amused', k), t, { seed: 5 }),
          act('off3', OFF3, [1.1, 0, -.75], pose({ turn: .8, crouch: .55, kneeUp: true }, t, .3), expr('confused', 'amused', k), t, { seed: 6 }),
          ...[0, 1].map(i => bird(`pb${i}`, [box[0] - .1 + i * .18, box[1] + .22, box[2] + .05], { mood: i ? 'keen' : 'confused', blink: blinkAt(t, i + 4), bob: Math.sin(t * 8 + i) * .6, gx: -.5 }, t, { contact: 0, scale: PG * .9 }))],
        overlay: chip('B.F. SKINNER • PSYCHOLOGIST', 210, ss(T.so + .5, T.so + .9, t) * (1 - ss(T.officials - .4, T.officials, t))) };
    } },
    // S6 — mocker close-up: the general roars with laughter (wide lens, face fills the frame), then the contract slides
    // across the felt (object-tracking shot) to Skinner: $25,000
    { t0: T.officials, t1: T.trick, f: (t, _k) => {
      const sl = at(t, T.officials + 2.0, T.trick - .6);
      const c = t < T.officials + 2.0 ? rig([{ t: T.officials, pos: [-1.0, 1.42, .35], look: [-1.08, 1.32, -.75], fov: 34 }, { t: T.officials + 2.0, pos: [-1.05, 1.36, -.05], look: [-1.08, 1.3, -.75], fov: 32 }], t)
        : rig([{ t: T.officials + 2.0, pos: [-1.6, 1.2, .9], look: [-1.3, .8, .1], fov: 36 }, { t: T.trick, pos: [.4, 1.25, 1.6], look: [.2, .8, .7], fov: 34 }], t);
      const ch: V3 = [lerp(0, 2.7, ease.inOut(sl)), 0, lerp(0, .8, ease.inOut(sl))];
      const laugh = Math.sin(t * 16) * .5 + .5;
      return { ...WAR, cam: c, extraNodes: { pbox: { pos: [.2 - 2.9, .82 - .25, .6 - 2.6] }, cheque: { pos: ch } },
        actors: [act('gen', GENERAL, [-1.1, 0, -.75], pose({ turn: .25, crouch: .55, kneeUp: true, lean: -.1 + laugh * .06, headLift: laugh * .08, handA: [-.7, -2.0], handB: [.6, -1.85 - laugh * .1], shapeB: 'open' }, t, .2), expr('laugh', 'amused', .2 * laugh), t, { res: 1800, squash: laugh * .08 }),
          act('off2', OFF2, [.0, 0, -.75], pose({ turn: .2, crouch: .55, kneeUp: true }, t, .3), expr('amused', 'laugh', laugh * .6), t, { seed: 5 }),
          act('off3', OFF3, [1.1, 0, -.75], pose({ turn: -.2, crouch: .55, kneeUp: true, handB: [.4, -2.2], shapeB: 'point' }, t, .3), expr('laugh', 'amused', .5), t, { seed: 6 }),
          act('skinner', SKINNER, [1.6, 0, 1.35], pose({ turn: -.3, crouch: .55, kneeUp: true, handA: [-.5, -1.85], shapeA: 'open' }, t, .3), expr('calm', 'happy', sl), t)],
        overlay: chip('$25,000 • 1943', 230, ss(T.trick - 1.2, T.trick - .9, t)) };
    } },
    // S7 — "Here's the trick": x-ray cutaway. Orbit around the cone as the full shell dissolves to the cutaway; the
    // lens light travels inside to the screen
    { t0: T.trick, t1: T.pecks, f: (t, _k) => {
      const C = XC;
      const c = rig([{ t: T.trick, pos: [3.2, 1.9, 2.6], look: [1.0, 1.3, 0], fov: 38 }, { t: (T.trick + T.pecks) / 2, pos: [2.2, 2.0, 1.6], look: [.8, 1.3, 0], fov: 36 }, { t: T.pecks, pos: [1.2, 1.55, .85], look: [.85, 1.32, .12], fov: 34 }], t);
      const xr = ss(T.trick + .3, T.trick + 1.4, t);
      const lb = ss(T.trick + 1.2, T.trick + 2.6, t);
      const beams: Beam[] = [0, 1, 2].map(i => { const a = Math.PI / 2 + i * 2.094; return { p: [C[0] + 2.0, C[1] + Math.cos(a) * .12, C[2] + Math.sin(a) * .12] as V3, dir: [-1, Math.cos(a) * .3, Math.sin(a) * .3] as V3, w: .1, h: .1, len: 1.1 * lb, c: [.75, .95, 1] as [number, number, number], i: 6 * lb }; });
      return { ...XRAY, cam: c, beams, screen: { dx: .08 * Math.sin(t), dy: 0, t, zoom: 1.2 },
        props: [{ id: 'cone', pos: C, nodes: { shell: { op: 1 - xr, vis: xr < .99 }, cut: { vis: xr > .01 }, hatch: { vis: xr < .5 } } }],
        actors: [0, 1, 2].map(i => bird(`b${i}`, bay(i), { sock: true, mood: (['keen', 'sleepy', 'confused'] as const)[i], dir: 1, blink: blinkAt(t, i), peck: i === 0 ? peckCycle(t, 1.3) * .3 : 0 }, t, { contact: 0, scale: PB, shadow: false })),
        overlay: chip('LENS → SCREEN', 210, ss(T.trick + 1.4, T.trick + 1.8, t) * (1 - ss(T.pecks - .3, T.pecks, t)), '#7fd3ff') };
    } },
    // S8 — close-up inside the bay: the pigeon pecks right at the ship on the glowing screen
    { t0: T.pecks, t1: T.drifts, f: (t, _k) => {
      const C = XC; const c = rig([{ t: T.pecks, pos: [.5, 1.42, .72], look: [.78, 1.3, .2], fov: 32 }, { t: T.drifts, pos: [.6, 1.4, .6], look: [.82, 1.3, .2], fov: 28 }], t);
      const pk = peckCycle(t, 2.2);
      return { ...XRAY, cam: c, screen: { dx: 0, dy: 0, t, zoom: 1.3, pecks: Math.floor((t - T.pecks) * 2.2) },
        props: [{ id: 'cone', pos: C, nodes: { shell: { vis: false }, hatch: { vis: false } } }],
        actors: [bird('b0', bay(0, .52), { sock: true, mood: 'keen', dir: 1, peck: pk, blink: blinkAt(t, 3), gx: .8 }, t, { contact: 0, scale: PB, res: 1500, shadow: false })],
        grade: { ...XRAY.grade, aperture: 2.4, focus: .5 } };
    } },
    // S9 — "If the bomb drifts...": chase cam behind the glide bomb over the coast; it drifts, the fins kick, it corrects
    { t0: T.drifts, t1: T.one, f: (t, _k) => {
      const u = at(t, T.drifts, T.one); const drift = Math.sin(clamp(u * 1.6) * Math.PI) * 9 * (1 - ss(.55, 1, u));
      const P: V3 = [lerp(-70, 22, u), lerp(70, 26, u), lerp(60, -42, u) + drift];
      const fin = Math.sin(clamp((u - .25) * 3) * Math.PI) * .45;
      const c = { pos: [P[0] - 8.5, P[1] + 7.5, P[2] + 9.5 + drift * .2] as V3, look: [P[0] + 5, P[1] - 2.4, P[2] - 5.5] as V3, fov: 40 };
      return { ...COAST, cam: c, props: [{ id: 'glider', pos: P, rot: [drift * .02, .84 + drift * .015, -.31 + fin * .4], nodes: { g_fin0: { rot: [0, 0, fin] }, g_fin1: { rot: [fin, 0, 0] } } }],
        overlay: u < .5 ? chip('DRIFTING OFF TARGET', 210, ss(.1, .2, u) * (1 - ss(.42, .5, u)), '#ff7a59') : chip('PECK… PECK… BACK ON TARGET', 210, ss(.55, .62, u), '#7dff9a') };
    } },
    // S10 — "One pigeon pecked TEN THOUSAND times in forty-five minutes!": hyper-pecking close-up with a counter
    { t0: T.one, t1: T.but, f: (t, k) => {
      const C = XC; const c = rig([{ t: T.one, pos: [.25, 1.4, .72], look: [.6, 1.27, .2], fov: 34 }, { t: T.but, pos: [.42, 1.36, .55], look: [.62, 1.27, .2], fov: 26 }], t);
      const rate = lerp(2.5, 7, k); const pk = peckCycle(t, rate); const n = Math.round(ease.in(k) * 10000);
      return { ...XRAY, cam: c, screen: { dx: 0, dy: 0, t, zoom: 1.3, pecks: 30, lock: .8 }, shake: .002 * k,
        props: [{ id: 'cone', pos: C, nodes: { shell: { vis: false }, hatch: { vis: false } } }],
        actors: [bird('b0', bay(0, .52), { sock: true, mood: k > .6 ? 'surprised' : 'keen', dir: 1, peck: pk, blink: 0, gx: .8, squash: pk * .15 }, t, { contact: 0, scale: PB, res: 1600, shadow: false })],
        overlay: `<div style="position:absolute;left:0;width:1080px;top:250px;text-align:center;font-family:Inter;font-weight:900;color:#fff;-webkit-text-stroke:8px #121212;paint-order:stroke fill;text-shadow:0 8px 24px rgba(0,0,0,.5)">
          <div style="font-size:150px;color:#ffd23f">${n.toLocaleString('en-US')}</div><div style="font-size:52px;letter-spacing:3px">PECKS • 45 MINUTES</div></div>` };
    } },
    // S11 — "But what if a pigeon gets confused? Easy. Put in three!": orbit reveals all three bays: keen, sleepy, confused
    { t0: T.but, t1: T.see, f: (t, _k) => {
      const C = XC; const c = rig([{ t: T.but, pos: [2.6, 1.3, .5], look: [.5, 1.3, 0], fov: 36 }, { t: T.see, pos: [1.6, 1.4, -2.0], look: [.5, 1.3, 0], fov: 34 }], t);
      const three = ss(T.but + 1.4, T.but + 1.8, t);
      return { ...XRAY, cam: c, screen: { dx: .05, dy: 0, t, zoom: 1.2 },
        props: [{ id: 'cone', pos: C, nodes: { shell: { vis: false }, hatch: { vis: false } } }],
        actors: [0, 1, 2].map(i => { const show = i === 2 ? 1 : three; return bird(`b${i}`, bay(i), { sock: true, mood: (['keen', 'sleepy', 'confused'] as const)[i], dir: 1, blink: blinkAt(t, i + 1), peck: i === 0 ? peckCycle(t, 1.5) * .4 : 0, tilt: i === 2 ? Math.sin(t * 2) * .2 : 0 }, t, { contact: 0, scale: PB * Math.max(.001, show), shadow: false }); }),
        overlay: chip(three > .5 ? '3 PIGEONS • MAJORITY RULES' : 'CONFUSED?', 210, 1, three > .5 ? '#ffd23f' : '#ff7a59') };
    } },
    // S12 — "You see, it's like asking three friends for directions": crane down from the rooftops to the crossroads;
    // two friends point left, one right; the traveller follows the two
    { t0: T.see, t1: T.amused, f: (t, _k) => {
      const c = rig([{ t: T.see, pos: [12, 11, 16], look: [4.5, 1.2, 4.5], fov: 42 }, { t: T.see + 2.2, pos: [8.6, 1.9, 9.6], look: [4.4, 1.5, 4.4], fov: 38 }, { t: T.amused, pos: [2.0, 1.7, 9.0], look: [-1.5, 1.4, 4.6], fov: 40 }], t);
      const pt = ss(T.see + 1.4, T.see + 2.2, t); const go = at(t, T.see + 3.4, T.amused);
      const tp: V3 = [lerp(4.6, -2.5, ease.inOut(go)), .15, lerp(5.4, 4.8, go)];
      return { ...STREET, cam: c,
        actors: [act('fr1', FR1, [5.6, .15, 5.6], pose({ turn: -.6, handA: [-1.45, -3.3 - pt * .2], shapeA: pt > .5 ? 'point' : 'open' }, t, .4), expr('happy', 'confident', pt), t),
          act('fr2', FR2, [6.4, .15, 5.0], pose({ turn: -.7, handA: [-1.5, -3.25], shapeA: pt > .5 ? 'point' : 'open' }, t, .4), expr('confident', 'smug', pt), t, { seed: 9 }),
          act('fr3', FR3, [6.9, .15, 6.3], pose({ turn: .6, handB: [1.5, -3.3], shapeB: pt > .5 ? 'point' : 'open', headTilt: .1 }, t, .4), expr('confused', 'thinking', pt), t, { seed: 11 }),
          act('trav', TRAV, tp, go > 0 && go < 1 ? walkPose((t - T.see - 3.4) * 1.5, -1, { turn: -1 }) as Pose : pose({ turn: -.2 }, t), expr('curious', 'happy', go), t, { seed: 13 })],
        overlay: chip('2 OUT OF 3 WINS', 230, ss(T.see + 3.4, T.see + 3.8, t)) };
    } },
    // S13 — "amused, not impressed... cancelled": low angle on the chuckling committee, red CANCELLED stamp slams down
    { t0: T.amused, t1: T.after, f: (t, _k) => {
      const c = rig([{ t: T.amused, pos: [0, .95, 2.6], look: [0, 1.25, -.6], fov: 40 }, { t: T.after, pos: [0, 1.0, 1.7], look: [0, 1.3, -.6], fov: 36 }], t);
      const st = ss(w('cancelled', 1, T.after - 1.2) - .05, w('cancelled', 1, T.after - 1.2) + .12, t);
      const ch = Math.sin(t * 9) * .5 + .5;
      return { ...WAR, cam: c, shake: st > 0 && st < 1 ? .03 : 0, extraNodes: { pbox: { pos: [.2 - 2.9, .82 - .25, .6 - 2.6] } },
        actors: [act('gen', GENERAL, [-1.1, 0, -.75], pose({ turn: .15, crouch: .55, kneeUp: true, headLift: ch * .05 }, t, .2), expr('amused', 'smug', ch * .5), t),
          act('off2', OFF2, [.0, 0, -.75], pose({ turn: 0, crouch: .55, kneeUp: true }, t, .3), expr('smirk', 'amused', ch), t, { seed: 5 }),
          act('off3', OFF3, [1.1, 0, -.75], pose({ turn: -.15, crouch: .55, kneeUp: true, handB: [.5, -2.6], shapeB: 'fist' }, t, .3), expr('amused', 'laugh', ch * .5), t, { seed: 6 })],
        overlay: st > .001 ? `<div style="position:absolute;left:540px;top:640px;transform:translate(-50%,-50%) rotate(-12deg) scale(${lerp(2.2, 1, ease.out(st))});opacity:${st};font-family:Inter;font-weight:900;font-size:120px;color:#e23a2e;border:14px solid #e23a2e;border-radius:18px;padding:10px 40px;letter-spacing:6px;background:rgba(255,240,230,.12);text-shadow:0 0 2px #e23a2e">CANCELLED</div>
          ${chip('1944', 950, st, '#e23a2e')}` : '' };
    } },
    // S14 — "But after the war, the Navy brought the pigeons BACK!": dolly through the 1948 Navy lab past the racks to the
    // bench where pigeons peck again
    { t0: T.after, t1: T.ran, f: (t, k) => {
      const c = rig([{ t: T.after, pos: [-5.0, 1.7, 4.0], look: [-3.0, 1.3, -1.5], fov: 44 }, { t: T.ran, pos: [.2, 1.6, 2.0], look: [1.4, 1.4, -.2], fov: 38 }], t);
      const cp: V3 = [.15, 1.56, -.2];
      return { ...NAVYL, cam: c, props: [{ id: 'cone', pos: cp, rot: [Math.PI / 2, 0, 0], nodes: { hatch: { pos: [0, .14, .1], rot: [.8, 0, 0] } } }],
        actors: [act('navy', NAVY, [2.3, 0, .7], pose({ turn: -.7, handA: [-.8, -2.4], shapeA: 'open' }, t, .4), expr('happy', 'excited', k), t),
          bird('nb', [1.05, .92, .3], { mood: 'happy', dir: 1, blink: blinkAt(t, 6), bob: Math.sin(t * 6) * .6, flap: ss(T.after + 1.0, T.after + 1.4, t) * (1 - ss(T.after + 1.8, T.after + 2.2, t)) }, t, { contact: .4 })],
        overlay: chip('PROJECT ORCON • 1948', 210, ss(T.after + .4, T.after + .8, t), '#7fd3ff') };
    } },
    // S15 — "It ran until 1953, when electronics finally got as good as a pigeon": the electronic console rolls in, tubes
    // glow; the pigeon turns to camera, smug. Final push-in (loops back to the hook)
    { t0: T.ran, t1: 60, f: (t, _k) => {
      const ar = ss(T.ran + .2, T.ran + 1.6, t);
      const c = rig([{ t: T.ran, pos: [-1.6, 1.5, 3.6], look: [-3.8, 1.3, 1.2], fov: 40 }, { t: T.ran + 2.4, pos: [.35, 1.3, 1.5], look: [1.05, 1.05, .3], fov: 36 }, { t: 60, pos: [.8, 1.12, .82], look: [1.08, 1.05, .3], fov: 30 }], t);
      const cp: V3 = [.15, 1.56, -.2];
      const L = NAVYL.lights!.map((l, i) => i === 2 ? { ...l, i: 2.5 * ar } : l);
      return { ...NAVYL, lights: L, cam: c, props: [{ id: 'cone', pos: cp, rot: [Math.PI / 2, 0, 0] }],
        extraNodes: { console: { pos: [lerp(-2.5, 0, ease.out(ar)), 0, 0], glow: 4 * ar } },
        actors: [bird('nb', [1.05, .92, .3], { mood: t > T.ran + 2.2 ? 'smug' : 'confused', dir: t > T.ran + 2.2 ? -1 : 1, blink: blinkAt(t, 7), gx: t > T.ran + 2.2 ? .1 : -.9, tilt: t > T.ran + 2.2 ? -.15 : 0 }, t, { contact: .4, res: 1600 }),
          act('navy', NAVY, [-3.4, 0, 2.4], pose({ turn: .8, handA: [-.6, -2.6], handB: [.7, -2.6], shapeA: 'grip', shapeB: 'grip', frontB: 1 }, t, .4), expr('determined', 'happy', .4), t)],
        overlay: chip('1953 • ELECTRONICS TAKE OVER', 210, ss(T.ran + .4, T.ran + .8, t) * (1 - ss(T.ran + 2.6, T.ran + 3.0, t)), '#ffb066'),
        grade: { ...NAVYL.grade, aperture: t > T.ran + 2.4 ? 1.6 : 0, focus: .6 } };
    } },
  ];
}
// x-ray look: dark studio backdrop with a cool rim so the cutaway pops; the cone sits on the lab bench colours
const XRAY: Base = { set: 'none', sky: { top: '#0b1222', mid: '#16233c', bot: '#2b2440', clouds: 0, sun: [.4, .8, .5], sunC: '#000000' }, bg: '#101826', sun: { dir: [.4, .8, .5], color: '#ffe9cc', i: 2.4, focus: [1, 1.3, 0], size: 4 }, hemi: { sky: '#6f8fc8', ground: '#2a2030', i: .9 }, fill: { color: '#9fd0ff', i: .5 },
  lights: [{ p: [1.2, 1.9, .9], c: [1, .85, .65], i: 2.5, d: 4 }, { p: [-.6, 1.0, -1.2], c: [.45, .7, 1], i: 3.0, d: 4 }, { p: [.9, 1.35, 0], c: [.6, .9, 1], i: 1.2, d: 1.5 }],
  fog: { color: '#101826', density: .05 }, grade: { ao: .9, aoRadius: .2, aoTint: [.3, .34, .55], sat: 1.15, contrast: 1.1, lift: [.02, .03, .07], gain: [1.03, 1.0, .97], bloom: .45, bloomTh: 1.1, vignette: .34 } };
function cone(_t: number, o: { hatch: number }): PropF {
  return { id: 'cone', pos: CONE_LAB, rot: CONE_ROT_LAB, nodes: { cut: { vis: false }, hatch: { pos: [0, .13 * o.hatch, .12 * o.hatch], rot: [.85 * o.hatch, 0, 0] } } };
}

const SHOTS = timeline();
export function frameAt(frame: number): Frame9 {
  const t = frame / FPS; let s = SHOTS[0];
  for (const sh of SHOTS) if (t >= sh.t0 - 1e-6) s = sh;
  const k = clamp((t - s.t0) / Math.max(.001, s.t1 - s.t0));
  const F = s.f(t, k) as Frame9 & { extraNodes?: Record<string, unknown> };
  // set-level animated nodes (pbox / cheque / console / sign arms) travel through hideNodes + extraNodes
  const nodes: Record<string, unknown> = {}; for (const [n, h] of Object.entries(F.hideNodes ?? {})) nodes[n] = { vis: !h }; Object.assign(nodes, F.extraNodes ?? {});
  // transition dips between sets (2-frame white flash on cuts that jump in time/place)
  const cut = SHOTS.some(sh => Math.abs(t - sh.t0) < .5 / FPS && sh.t0 > 0);
  const cap = captions(FILM, t);
  return { ...F, t, setNodes: nodes, overlay: (F.overlay ?? '') + cap, grade: { ...(F.grade ?? {}), flash: cut ? .0 : 0 } } as Frame9;
}
void ov; void lerp;
