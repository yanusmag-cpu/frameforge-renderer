// YunoWorld v9 · "Why They Shot a Block of ICE in Front of Admirals" — 60 s, 13 directed shots across six Blender sets.
// Verified (frameforge-studio yw-v9/FACT_CHECK.md): pykrete = ice with ~14% sawdust/wood pulp; at the 1943 Quebec Conference
// a pistol shot shattered plain ice and ricocheted off pykrete (accounts differ on who was nearly hit, so no one is named);
// U-boats in the mid-Atlantic air gap beyond aircraft range; Geoffrey Pyke proposed an ice aircraft carrier (Habbakuk);
// as the story goes a block was put in Churchill's bath and barely melted; designs ~2,000 ft long with ~40 ft walls;
// damage could be repaired by freezing seawater; a ~1,000-ton test model on Patricia Lake (Jasper) was kept frozen by a
// small (one-horsepower) motor; the project was cancelled and the remains lie on the lake bed.
import { STAND, idle, walkPose, type Pose } from '../../ff2d/rig.ts';
import { expr } from '../../ff2d/face.ts';
import { clamp, lerp, ss, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9, NodeOv } from '../engine9.ts';
import { captions, chip, wt } from '../ui9.ts';

export const FPS = 30, FRAMES = 1800;
const FILM = 'ice';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const NAVYC = '#1f2c48';
const OFFICER: T7Look = { skin: '#efc19c', hair: '#3a2a1e', hairStyle: 'short', nose: 'long', head: { w: .92, h: 1.06, jaw: 1.05 }, top: NAVYC, topKind: 'jacket', trim: '#d9b44a', buttons: '#e2c25a', inner: '#f2ede2', tie: '#111', pants: NAVYC, boots: '#111', hat: 'driver', hatColor: NAVYC, beard: 'stache', beardColor: '#3a2a1e', eyes: '#3a4a5a' };
const ADM1: T7Look = { skin: '#eab595', hair: '#e8e8e4', hairStyle: 'short', nose: 'round', head: { w: 1.12, jaw: 1.15, cheek: 1.15 }, top: NAVYC, topKind: 'jacket', trim: '#e2c25a', buttons: '#e2c25a', inner: '#f2ede2', tie: '#111', pants: NAVYC, boots: '#111', beard: 'full', beardColor: '#f0f0ec', build: 1.2, belly: 1.25, hat: 'driver', hatColor: NAVYC, eyes: '#4a5a6a' };
const ADM2: T7Look = { skin: '#f0caa8', hair: '#9a9a96', hairStyle: 'swept', nose: 'hook', head: { w: .9, h: 1.1, jaw: .9 }, top: NAVYC, topKind: 'jacket', trim: '#e2c25a', buttons: '#e2c25a', inner: '#f2ede2', tie: '#111', pants: NAVYC, boots: '#111', glasses: true, eyes: '#4a5a6a' };
const PYKE: T7Look = { skin: '#f0c8a8', hair: '#2a2018', hairStyle: 'curly', nose: 'long', head: { w: .9, h: 1.1, jaw: .92 }, top: '#7a6048', topKind: 'suit', inner: '#efe6d2', tie: '#5a2a2a', pants: '#5a4838', boots: '#2a2018', glasses: true, beard: 'stubble', beardColor: '#2a2018', eyes: '#3a4a3a' };
const SIL: T7Look = { skin: '#1e1e24', hair: '#1e1e24', hairStyle: 'bald', nose: 'round', head: { w: 1.15, jaw: 1.2, cheek: 1.2 }, top: '#1e1e24', topKind: 'coat', pants: '#1e1e24', boots: '#1e1e24', build: 1.25, belly: 1.35 };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1300, seed: id.length * 7 + 1, rim: '#ffe0b8', rimSide: 1, ...o });
const at = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

type Base = Partial<Frame9>;
const HALL: Base = { set: 'hall', sun: { dir: [.15, .55, -1], color: '#fff0d8', i: 2.0, focus: [0, 1, -1], size: 9 }, hemi: { sky: '#f0e4cc', ground: '#7a4a2a', i: 1.3 }, fill: { color: '#ffe6c8', i: .5 }, bg: '#201810',
  fog: { color: '#d8c4a0', density: .01 }, beams: [2.5, 7.0, 11.5].map(u => ({ p: [-7 + u, 2.7, -4.8] as V3, dir: [-.05, -.42, 1] as V3, w: 1.4, h: 2.9, len: 9, c: [1, .93, .8] as [number, number, number], i: .7 })),
  dust: { box: [[-6, .3, -4.8], [6, 5, 3]], i: .6 },
  lights: [{ p: [0, 3.95, -2.5], c: [1, .8, .55], i: 3.2, d: 9 }, { p: [0, 3.95, 2.5], c: [1, .8, .55], i: 3.2, d: 9 }],
  grade: { ao: .85, aoRadius: .45, aoTint: [.44, .36, .6], sat: 1.15, contrast: 1.06, lift: [.035, .028, .06], gain: [1.05, 1.0, .94], bloom: .3, bloomTh: 1.35, vignette: .24, exposure: 1.05 } };
const SEA = (sky: Partial<Frame9>['sky']) => ({ sky, sun: { dir: [.5, .35, -.8] as V3, color: '#ffe8c8', i: 2.0, focus: [0, 0, 0] as V3, size: 120 }, hemi: { sky: '#a8c8e6', ground: '#3a5a6a', i: .8 }, fog: { color: '#bccfe0', density: .0011 } });
const ATL: Base = { set: 'atlantic', ...SEA({ top: '#4a6f98', mid: '#a6bdd2', bot: '#e8d8c0', sun: [.5, .35, -.8], sunC: '#fff0d0', clouds: .8, cloudC: '#eef2f6' }), sea: { c1: '#173f58', c2: '#3a8496' },
  grade: { ao: .4, aoRadius: 2, aoTint: [.36, .42, .6], sat: 1.1, contrast: 1.07, lift: [.02, .03, .06], gain: [1.02, 1.0, .97], bloom: .2, bloomTh: 1.6, vignette: .22 } };
const CARR: Base = { set: 'carrier', ...SEA({ top: '#3474c2', mid: '#8fc0ea', bot: '#f2dcb8', sun: [.5, .4, -.7], sunC: '#fff0c8', clouds: .55 }), sea: { c1: '#14587a', c2: '#3fb0bc' },
  grade: { ao: .5, aoRadius: 3, aoTint: [.36, .42, .62], sat: 1.18, contrast: 1.06, lift: [.02, .025, .055], gain: [1.03, 1.0, .96], bloom: .22, bloomTh: 1.5, vignette: .2 } };
const STUDY: Base = { set: 'study', sun: { dir: [.2, .6, -1], color: '#dfe8f2', i: 1.6, focus: [0, 1, -1], size: 6 }, hemi: { sky: '#c8d8d0', ground: '#6a4428', i: 1.25 }, fill: { color: '#ffe2bc', i: .45 }, bg: '#1a1410',
  lights: [{ p: [1.45, 1.2, -1.85], c: [1, .82, .5], i: 2.4, d: 4 }, { p: [0, 3.0, 0], c: [1, .86, .66], i: 1.8, d: 7 }], fog: { color: '#4a4a3a', density: .012 },
  beams: [{ p: [1.4, 1.85, -2.85], dir: [-.2, -.5, 1], w: 1.2, h: 1.5, len: 4.5, c: [.85, .9, 1], i: .6 }], dust: { box: [[-3, .3, -3], [3, 3, 3]], i: .6 },
  grade: { ao: .9, aoRadius: .4, aoTint: [.4, .36, .58], sat: 1.12, contrast: 1.06, lift: [.035, .03, .06], gain: [1.05, 1.0, .93], bloom: .3, bloomTh: 1.3, vignette: .28, exposure: 1.06 } };
const BATH: Base = { set: 'bath', sun: { dir: [.3, .65, -1], color: '#f4f6ff', i: 1.9, focus: [0, 1, -1], size: 5 }, hemi: { sky: '#e8f0f4', ground: '#7a8a88', i: 1.35 }, fill: { color: '#fff2e0', i: .45 }, bg: '#202428',
  lights: [{ p: [0, 2.9, 0], c: [1, .9, .76], i: 2.2, d: 6 }, { p: [3.2, 1.6, -.3], c: [1, .75, .45], i: 2.5, d: 3 }], fog: { color: '#e6ecee', density: .008 },
  beams: [{ p: [-1.3, 2.0, -1.85], dir: [.2, -.55, 1], w: 1.0, h: 1.4, len: 3.5, c: [1, .97, .92], i: .8 }],
  grade: { ao: .8, aoRadius: .35, aoTint: [.4, .44, .6], sat: 1.1, contrast: 1.04, lift: [.04, .04, .06], gain: [1.03, 1.0, .97], bloom: .4, bloomTh: 1.2, vignette: .24, exposure: 1.06 } };
const LAKE: Base = { set: 'lake', sky: { top: '#2f6fc0', mid: '#8fc2ea', bot: '#e8f0f4', sun: [-.4, .55, -.5], sunC: '#fff4dc', clouds: .45 }, sea: { c1: '#13707c', c2: '#4fd0c6' },
  sun: { dir: [-.4, .55, -.5], color: '#fff0d8', i: 2.1, focus: [8, 0, 18], size: 40 }, hemi: { sky: '#a8d0f0', ground: '#3f6a3a', i: .8 }, fog: { color: '#c8dcec', density: .0022 },
  grade: { ao: .6, aoRadius: 1, aoTint: [.36, .42, .62], sat: 1.2, contrast: 1.06, lift: [.02, .025, .055], gain: [1.03, 1.0, .96], bloom: .22, bloomTh: 1.5, vignette: .2 } };
const STUDIO: Base = { set: 'none', sky: { top: '#16223c', mid: '#24365a', bot: '#3a2f52', clouds: 0, sun: [.4, .8, .5], sunC: '#000000' }, sun: { dir: [.4, .8, .5], color: '#fff0dc', i: 2.4, focus: [0, 0, 0], size: 4 },
  hemi: { sky: '#a8c4f0', ground: '#4a3a58', i: 1.3 }, fill: { color: '#d8ecff', i: .8 }, fog: { color: '#1a2540', density: .03 },
  grade: { ao: .6, aoRadius: .2, aoTint: [.3, .34, .55], sat: 1.15, contrast: 1.08, lift: [.02, .03, .07], gain: [1.03, 1.0, .97], bloom: .3, bloomTh: 1.3, vignette: .3 } };

const BLOCKS_HALL: V3 = [0, .92, -2.3]; const BB: V3 = [.45, 1.17, -2.3];
const OFF_POS: V3 = [-2.3, 0, .2]; const ADM1_POS: V3 = [3.12, 0, -1.0], ADM2_POS: V3 = [3.12, 0, .05];
/** blocks prop nodes: plain ice block A shatters at tS (14 shards fly), pykrete block B stays */
function blockNodes(t: number, tS: number, o: Record<string, NodeOv> = {}): Record<string, NodeOv> {
  const n: Record<string, NodeOv> = { ...o }; const a = t - tS;
  n.iceA = { vis: a < 0 };
  for (let i = 0; i < 14; i++) {
    if (a < 0) { n[`shards-k${i}`] = { vis: false }; continue; }
    const d: V3 = [hsh(i) - .5, hsh(i + 9) * .8 + .2, hsh(i + 19) - .5]; const sp = 2.2 + hsh(i + 29) * 2; const tt = Math.min(a, 1.6);
    const y = Math.max(-1.15, d[1] * sp * tt - 4.9 * tt * tt);
    n[`shards-k${i}`] = { pos: [d[0] * sp * tt, y, d[2] * sp * tt], rot: [tt * 7 * hsh(i + 3), tt * 9 * hsh(i + 5), 0] };
  }
  return n;
}
const muzzle = (p: V3, k: number): Sprite[] => k <= 0 || k >= 1 ? [] : [{ p, s: .35 * (1 - k * .6), rot: k * 3, c: [1.8, 1.3, .7], a: 1 - k, kind: 2, seed: .3, age: 0 }, { p: [p[0] + .05, p[1], p[2]], s: .2, rot: 0, c: [1, .8, .5], a: (1 - k) * .8, kind: 0, seed: .6, age: k }];
const tracer = (a: V3, b: V3, k: number): Sprite[] => { if (k <= 0 || k >= 1) return []; const S: Sprite[] = []; for (let i = 0; i < 8; i++) { const kk = Math.max(0, k - i * .025); S.push({ p: [lerp(a[0], b[0], kk), lerp(a[1], b[1], kk), lerp(a[2], b[2], kk)], s: .09 - i * .008, rot: 0, c: [1.6, 1.2, .7], a: .9 - i * .1, kind: 2, seed: .2, age: 0 }); } return S; };

type Shot = { t0: number; t1: number; f: (t: number, k: number) => Partial<Frame9> };
function timeline(): Shot[] {
  const T = { fires: w('fires', 1, 2.0), shatters: w('shatters', 1, 3.6), then: w('then', 1, 4.3), fires2: w('fires', 2, 5.0), bounces: w('bounces', 1, 6.6), because: w('because', 1, 9.0),
    war: w('world', 1, 12.0), so: w('so', 1, 17.0), everyone: w('everyone', 1, 21.6), story: w('story', 1, 24.0), plan: w('plan', 2, 29.0), ship: w('ship', 1, 30.6), forty: w('forty', 1, 33.2),
    see: w('see', 1, 35.4), torpedo: w('torpedo', 1, 42.0), actually: w('actually', 1, 47.6), tiny: w('tiny', 1, 52.0), then2: w('then', 3, 53.2), remains: w('remains', 1, 55.6) };
  return [
    // S1 — hook: low dolly along the floor past the officer to the two blocks; BANG, the plain ice block shatters (slow-mo)
    { t0: 0, t1: T.then, f: (t) => {
      const c = rig([{ t: 0, pos: [-3.8, .55, 2.4], look: [-.2, 1.1, -2.3], fov: 44 }, { t: T.fires, pos: [-2.6, .95, 1.1], look: [-.2, 1.15, -2.3], fov: 40 }, { t: T.then, pos: [-1.2, 1.25, -.55], look: [-.1, 1.15, -2.3], fov: 36 }], t);
      const draw = ss(.3, .9, t); const recoil = Math.exp(-Math.max(0, t - T.fires) * 8) * (t > T.fires ? 1 : 0);
      return { ...HALL, cam: c, props: [{ id: 'blocks', pos: BLOCKS_HALL, nodes: blockNodes(t, T.shatters - .15) }], sprites: muzzle([-1.85, 1.42, -.2], at(t, T.fires, T.fires + .25)),
        actors: [act('off', OFFICER, OFF_POS, pose({ turn: .9, handB: [lerp(.5, 1.75, draw), lerp(-1.7, -3.35, draw) - recoil * .25], shapeB: 'point', handA: [-.3, -1.9], lean: -recoil * .05 }, t, .3), expr('determined', 'focused', .5), t),
          act('adm1', ADM1, ADM1_POS, pose({ turn: -.8, crouch: .55, kneeUp: true }, t, .3), expr('suspicious', 'smug', .4), t, { seed: 5 }),
          act('adm2', ADM2, ADM2_POS, pose({ turn: -.8, crouch: .55, kneeUp: true }, t, .3), expr('curious', 'calm', .3), t, { seed: 7 })],
        grade: { ...HALL.grade, aperture: t > T.shatters - .3 ? .8 : 0, focus: 1.9 }, overlay: chip('QUEBEC • 1943', 210, ss(.4, .8, t) * (1 - ss(T.fires - .3, T.fires, t))) };
    } },
    // S2 — second shot: the bullet BOUNCES off the other block and zips past the admirals — whip-pan, they dive
    { t0: T.then, t1: T.because, f: (t) => {
      const tB = T.bounces - .2; const zip = at(t, tB, tB + .35);
      const c = t < tB ? rig([{ t: T.then, pos: [-.9, 1.3, -.4], look: [.45, 1.17, -2.3], fov: 34 }, { t: tB, pos: [-.4, 1.25, -1.0], look: [.45, 1.17, -2.3], fov: 30 }], t)
        : rig([{ t: tB, pos: [.2, 1.3, -1.2], look: [1.6, 1.2, -1.6], fov: 36 }, { t: tB + .45, pos: [1.3, 1.35, .1], look: [3.12, 1.15, -.5], fov: 40 }, { t: T.because, pos: [1.6, 1.25, .5], look: [3.12, 1.05, -.5], fov: 38 }], t, { easing: ease.out });
      const duck = ss(tB + .25, tB + .55, t);
      return { ...HALL, cam: c, props: [{ id: 'blocks', pos: BLOCKS_HALL, nodes: blockNodes(t, T.shatters - .15) }],
        sprites: [...muzzle([-1.85, 1.42, -.2], at(t, T.fires2, T.fires2 + .25)), ...tracer([-1.85, 1.42, -.2], BB, at(t, T.fires2 + .05, tB)), ...tracer(BB, [4.4, 1.45, -.4], zip),
          ...(t > tB && t < tB + .2 ? [{ p: BB, s: .4, rot: 0, c: [1.8, 1.4, .8] as [number, number, number], a: 1 - (t - tB) / .2, kind: 2, seed: .4, age: 0 }] : [])],
        grade: { ...HALL.grade, whip: t > tB && t < tB + .35 ? .5 * (1 - zip) : 0, whipDir: [1, 0] },
        actors: [act('off', OFFICER, OFF_POS, pose({ turn: .9, handB: [1.75, -3.35], shapeB: 'point' }, t, .3), expr('determined', 'shocked', duck), t),
          act('adm1', ADM1, ADM1_POS, pose({ turn: -.8, crouch: .55 + duck * .9, kneeUp: true, lean: -duck * .4, handA: [-.6, -3.8 + duck], handB: [.4, -4.0 + duck], shapeA: 'open', shapeB: 'open' }, t, .2), expr('shocked', 'terrified', duck), t, { seed: 5, res: 1600 }),
          act('adm2', ADM2, ADM2_POS, pose({ turn: -.8, crouch: .55 + duck * .8, kneeUp: true, lean: duck * .35, headLift: -duck * .2 }, t, .2), expr('surprise', 'scared', duck), t, { seed: 7, res: 1600 })] };
    } },
    // S3 — "Because that's not normal ice. It's frozen with sawdust": push into the untouched block — fibres in the ice
    { t0: T.because, t1: T.war, f: (t) => {
      const c = rig([{ t: T.because, pos: [1.5, 1.6, -.9], look: BB, fov: 34 }, { t: T.war, pos: [1.05, 1.4, -1.45], look: BB, fov: 30 }], t);
      return { ...HALL, cam: c, props: [{ id: 'blocks', pos: BLOCKS_HALL, nodes: blockNodes(t, -10, { iceA: { vis: false } }) }],
        grade: { ...HALL.grade, aperture: .5, focus: 1.1 }, overlay: chip('ICE + SAWDUST', 210, ss(T.because + 1.2, T.because + 1.6, t), '#d9b44a') };
    } },
    // S4 — WWII Atlantic: convoy in a grey swell, a U-boat surfaces; a patrol plane reaches its limit and turns back
    { t0: T.war, t1: T.so, f: (t, k) => {
      const c = rig([{ t: T.war, pos: [140, 50, 160], look: [-20, 0, -20], fov: 40 }, { t: T.so, pos: [60, 22, 120], look: [-30, 4, -10], fov: 38 }], t);
      const rise = ss(.15, .6, k); const u = k;
      const turn = ss(.45, .85, u); const px = lerp(-260, -70, ss(0, .6, u)) + turn * 30; const pz = lerp(160, 60, ss(0, .6, u)) + turn * -60;
      return { ...ATL, cam: c, props: [{ id: 'uboat', pos: [40, lerp(-4, -.6, rise), 50], rot: [0, 2.2, 0] }, { id: 'plane', pos: [px, 60, pz], rot: [-.2 * turn, -.6 + turn * 2.6, turn * .5], scale: 1.6 }],
        overlay: chip('THE MID-ATLANTIC AIR GAP', 210, ss(.35, .45, k), '#ff7a59') };
    } },
    // S5 — "So an inventor named Geoffrey Pyke has a wild idea": push-in on Pyke leaping up from his chaotic desk, plan aloft
    { t0: T.so, t1: T.everyone, f: (t, k) => {
      const c = rig([{ t: T.so, pos: [-.4, 1.2, 1.9], look: [.5, 1.3, -1.2], fov: 42 }, { t: T.everyone, pos: [.25, 1.55, .35], look: [.55, 1.55, -.9], fov: 36 }], t);
      const up = ss(T.so + 1.6, T.so + 2.1, t);
      return { ...STUDY, cam: c,
        actors: [act('pyke', PYKE, [.6, 0, -.75], pose({ turn: -.1, crouch: .5 * (1 - up), kneeUp: up < .5, handB: [.8, -2.4 - up * 2.0], shapeB: 'grip', handA: [-.7, -2.6 - up * .8], shapeA: 'open', headLift: up * .15 }, t, .4), expr('thinking', 'excited', up), t, { t7B: up > .4 ? 'paper' : undefined, squash: up * (1 - k) * .06 })],
        overlay: chip('GEOFFREY PYKE • INVENTOR', 210, ss(T.so + .4, T.so + .8, t)) };
    } },
    // S6 — mocker: the admirals scoff ("ice will just crack and melt")
    { t0: T.everyone, t1: T.story, f: (t) => {
      const c = rig([{ t: T.everyone, pos: [1.7, 1.4, -.35], look: [3.12, 1.3, -.5], fov: 40 }, { t: T.story, pos: [2.0, 1.38, -.45], look: [3.12, 1.3, -.5], fov: 36 }], t);
      const ch = Math.sin(t * 10) * .5 + .5;
      return { ...HALL, cam: c,
        actors: [act('adm1', ADM1, ADM1_POS, pose({ turn: -.5, crouch: .55, kneeUp: true, handB: [.6, -2.4], shapeB: 'point', headTilt: -.1 }, t, .3), expr('smug', 'laugh', ch * .4), t, { seed: 5, res: 1700 }),
          act('adm2', ADM2, ADM2_POS, pose({ turn: -.6, crouch: .55, kneeUp: true }, t, .3), expr('smirk', 'amused', ch), t, { seed: 7, res: 1700 })] };
    } },
    // S7 — Churchill's bath (as the story goes): steam, a block bobbing in the tub; a cigar silhouette behind frosted glass
    { t0: T.story, t1: T.plan, f: (t) => {
      const c = rig([{ t: T.story, pos: [1.5, 1.6, 1.3], look: [-.6, .85, -.9], fov: 42 }, { t: T.plan, pos: [.4, 1.3, .2], look: [-.6, .8, -.9], fov: 36 }], t);
      const bob = Math.sin(t * 2.2) * .015; const S: Sprite[] = [];
      for (let i = 0; i < 14; i++) { const a = (t * .25 + i / 14) % 1; S.push({ p: [-.6 + (hsh(i) - .5) * 1.2, .8 + a * 1.4, -.9 + (hsh(i + 4) - .5) * .5], s: .5 + a * .8, rot: hsh(i) * 6 + t * .2, c: [1, 1, 1], a: .1 * Math.sin(a * Math.PI), kind: 0, seed: hsh(i + 7), age: a }); }
      for (let i = 0; i < 5; i++) { const a = (t * .3 + i / 5) % 1; S.push({ p: [3.05 + a * .2, 1.75 + a * .6, -.45], s: .2 + a * .4, rot: a * 3, c: [.85, .85, .85], a: .25 * (1 - a), kind: 0, seed: .3, age: a }); }
      return { ...BATH, cam: c, sprites: S,
        props: [{ id: 'blocks', pos: [-1.05, .5 + bob, -.9], rot: [0, .3, Math.sin(t * 1.7) * .03], nodes: { iceA: { vis: false }, tray: { vis: false }, ...Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`shards-k${i}`, { vis: false }])) } }],
        actors: [act('sil', SIL, [3.0, 0, -.3], pose({ turn: 0, back: 1, handB: [.6, -3.6], shapeB: 'hold' }, t, .3), expr('calm'), t, { tint: [.25, .25, .28], rim: undefined, shadow: false })],
        overlay: chip('AS THE STORY GOES…', 210, ss(T.story + .2, T.story + .6, t), '#9fd8ff') };
    } },
    // S8 — "Then the plan got BIGGER": from the waterline, crane up the sheer ice wall to reveal the 2,000-ft carrier
    { t0: T.plan, t1: T.see, f: (t) => {
      const c = rig([{ t: T.plan, pos: [-380, 5, 110], look: [-300, 30, 30], fov: 42 }, { t: T.ship + .6, pos: [-420, 60, 210], look: [-150, 35, 0], fov: 44 }, { t: T.see, pos: [-330, 230, 420], look: [0, 30, 0], fov: 44 }], t);
      return { ...CARR, cam: c, overlay: chip('2,000 FT LONG', 210, ss(T.ship + .3, T.ship + .7, t)) + chip('40 FT THICK WALLS', 290, ss(T.forty, T.forty + .4, t), '#9fd8ff') };
    } },
    // S9 — "You see, the sawdust works like steel bars inside concrete": x-ray orbit of a pykrete chunk; a crack shoots in
    // and stops dead at the fibres
    { t0: T.see, t1: T.torpedo, f: (_t, k) => {
      const a = lerp(.6, 2.2, k); const c = { pos: [Math.sin(a) * 4.6, 1.6, Math.cos(a) * 4.6] as V3, look: [0, 0, 0] as V3, fov: 38 };
      const grow = Math.min(5.2, ss(.35, .55, k) * 8);
      const nodes: Record<string, NodeOv> = {}; for (let i = 0; i < 8; i++) nodes[`crack-${i}`] = { vis: i < grow };
      return { ...STUDIO, cam: c, props: [{ id: 'macro', pos: [0, 0, 0], nodes: { ...nodes, shell: { op: .18 } } }],
        overlay: chip(k < .55 ? 'WOOD FIBRES = STEEL BARS' : 'CRACK STOPPED!', 210, 1, k < .55 ? '#d9b44a' : '#7dff9a') };
    } },
    // S10 — "Torpedo hole? Just pump in seawater and let it freeze!": hull close-up: a hole, seawater pours in, frost seals it
    { t0: T.torpedo, t1: T.actually, f: (t, k) => {
      const c = rig([{ t: T.torpedo, pos: [-40, 9, 95], look: [-10, 8, 46], fov: 40 }, { t: T.actually, pos: [-28, 10, 78], look: [-10, 8, 46], fov: 34 }], t);
      const hole: V3 = [-10, 8, 46.5]; const fr = ss(.45, .9, k); const S: Sprite[] = [];
      S.push({ p: hole, s: 3.2, rot: 0, c: [.05, .08, .1], a: .95 * (1 - fr), kind: 0, seed: .2, age: 0 });
      for (let i = 0; i < 18; i++) { const a = (t * .9 + i / 18) % 1; if (k < .2 || k > .7) continue; S.push({ p: [hole[0] + (hsh(i) - .5) * 2, hole[1] + 4 - a * 4, hole[2] + .5 + a * .3], s: .9, rot: hsh(i) * 6, c: [.7, .9, 1], a: .5 * (1 - a), kind: 0, seed: hsh(i), age: a }); }
      for (let i = 0; i < 26; i++) { const r = hsh(i + 50) * 2.2 * fr; const ang = hsh(i + 60) * 6.28; S.push({ p: [hole[0] + Math.cos(ang) * r, hole[1] + Math.sin(ang) * r, hole[2] + .3], s: .9 * fr + .2, rot: ang, c: [1.15, 1.2, 1.25], a: .85 * fr, kind: 0, seed: hsh(i + 70), age: .5 }); }
      return { ...CARR, cam: c, sprites: S, overlay: chip(k < .45 ? 'TORPEDO HOLE?' : 'PUMP • FREEZE • FIXED', 210, 1, k < .45 ? '#ff7a59' : '#9fd8ff') };
    } },
    // S11 — "They actually built a test model on a lake in the Canadian Rockies, kept frozen by a tiny motor": aerial glide over
    // the turquoise lake and pine forest down to the timber-clad model and its motor hut
    { t0: T.actually, t1: T.then2, f: (t) => {
      const c = rig([{ t: T.actually, pos: [-140, 90, 170], look: [8, 0, 18], fov: 44 }, { t: T.tiny - .4, pos: [-20, 16, 56], look: [8, 2, 22], fov: 40 }, { t: T.then2, pos: [2, 6, 44], look: [8, 2, 34], fov: 38 }], t);
      return { ...LAKE, cam: c, overlay: chip('PATRICIA LAKE, CANADA • 1943', 210, ss(T.actually + .5, T.actually + .9, t) * (1 - ss(T.tiny - .6, T.tiny - .3, t)), '#7fd3ff') + chip('KEPT FROZEN BY A 1-HP MOTOR', 210, ss(T.tiny - .2, T.tiny + .2, t)) };
    } },
    // S12 — "Then the project was cancelled": orbit as the stamp lands over the lake
    { t0: T.then2, t1: T.remains, f: (t, k) => {
      const a = lerp(-.4, .4, k); const c = { pos: [8 + Math.sin(a) * 34, 14, 18 + Math.cos(a) * 34] as V3, look: [8, 2, 18] as V3, fov: 40 };
      const st = ss(w('cancelled', 1, w('canceled', 1, T.then2 + .8)) - .05, w('cancelled', 1, w('canceled', 1, T.then2 + .8)) + .12, t);
      return { ...LAKE, cam: c, overlay: st > .001 ? `<div style="position:absolute;left:540px;top:640px;transform:translate(-50%,-50%) rotate(-12deg) scale(${lerp(2.2, 1, ease.out(st))});opacity:${st};font-family:Inter;font-weight:900;font-size:120px;color:#e23a2e;border:14px solid #e23a2e;border-radius:18px;padding:10px 40px;letter-spacing:6px;background:rgba(255,240,230,.12)">CANCELLED</div>` : '' };
    } },
    // S13 — "...and its remains are still sitting at the bottom of that lake": the camera dives through the surface to the
    // timbers on the lake bed (loops back to the ice hook)
    { t0: T.remains, t1: 60, f: (t, k) => {
      const c = rig([{ t: T.remains, pos: [16, 3.5, 34], look: [9, -2, 20], fov: 42 }, { t: T.remains + 1.4, pos: [14, -1.5, 30], look: [8.5, -5, 19], fov: 42 }, { t: 60, pos: [11, -4.2, 24], look: [8, -5.6, 18], fov: 38 }], t);
      const under = c.pos[1] < 0;
      return { ...LAKE, cam: c, hideNodes: { model: true }, ...(under ? { fog: { color: '#1d7a7a', density: .06 }, sky: { top: '#3fa8a8', mid: '#2a8a8a', bot: '#0f4a50', clouds: 0, sun: [0, 1, 0] as V3, sunC: '#000000' }, hemi: { sky: '#7ad8d0', ground: '#0f3a3a', i: 1.1 }, sun: { dir: [0, 1, .1] as V3, color: '#a8f0e8', i: 1.6, focus: [8, -6, 18] as V3, size: 20 } } : {}),
        sprites: under ? Array.from({ length: 30 }, (_, i) => ({ p: [8 + (hsh(i) - .5) * 14, -6 + ((t * .3 + hsh(i + 3) * 6) % 6), 22 + (hsh(i + 5) - .5) * 14] as V3, s: .12, rot: 0, c: [.9, 1, 1] as [number, number, number], a: .5, kind: 2, seed: hsh(i), age: 0 })) : [],
        overlay: chip('STILL ON THE LAKE BED TODAY', 210, ss(.45, .6, k), '#7fd3ff'), grade: { ...LAKE.grade, ...(under ? { sat: 1.1, lift: [.02, .06, .07] as [number, number, number] } : {}) } };
    } },
  ];
}
const SHOTS = timeline();
export function frameAt(frame: number): Frame9 {
  const t = frame / FPS; let s = SHOTS[0];
  for (const sh of SHOTS) if (t >= sh.t0 - 1e-6) s = sh;
  const k = clamp((t - s.t0) / Math.max(.001, s.t1 - s.t0));
  const F = s.f(t, k) as Frame9;
  const nodes: Record<string, unknown> = {}; for (const [n, h] of Object.entries(F.hideNodes ?? {})) nodes[n] = { vis: !h };
  return { ...F, t, setNodes: nodes, overlay: (F.overlay ?? '') + captions(FILM, t) } as Frame9;
}
void walkPose; void lerp;
