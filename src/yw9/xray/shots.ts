// YunoWorld v9 · "Shoe Shops X-RAYED Kids' Feet" (shoe-fitting fluoroscopes) — 60 s, 16 directed shots across three sets.
// Verified (frameforge-studio yw-v9/FACT_CHECK.md): shoe-fitting fluoroscopes were common in US/UK shoe shops from the 1920s
// to the 1950s; feet went in a slot at the bottom and up to three viewers looked through ports on top; between the feet
// and the X-ray tube there was often only a ~1 mm aluminium filter; customers, and especially staff, were repeatedly
// exposed; they gave no real fitting benefit (essentially sales gimmicks); Pennsylvania was the first state to ban them
// (1957); by about 1960, 34 states had banned them.
import { STAND, idle, type Pose } from '../../ff2d/rig.ts';
import { expr } from '../../ff2d/face.ts';
import { clamp, lerp, ss, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9, NodeOv } from '../engine9.ts';
import { captions, chip, wt } from '../ui9.ts';

export const FPS = 30, FRAMES = 1800;
const FILM = 'xray';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const KID: T7Look = { skin: '#f2cfb0', hair: '#c87a3a', hairStyle: 'short', nose: 'button', head: { w: 1.08, cheek: 1.1 }, top: '#3f7ab0', topKind: 'shirt', inner: '#f2ede2', pants: '#5a4a3a', boots: '#6a3a22', eyes: '#4a6a3a' };
const KID2: T7Look = { skin: '#c98d66', hair: '#1e1a16', hairStyle: 'curly', nose: 'round', head: { w: 1.05 }, top: '#e8c84a', topKind: 'dress', inner: '#f2ede2', pants: '#e8c84a', boots: '#2a1a12', skirt: true };
const MOM: T7Look = { skin: '#f0c8a8', hair: '#7a3a22', hairStyle: 'bun', nose: 'button', top: '#3f8a7a', topKind: 'dress', inner: '#f4efe4', pants: '#3f8a7a', boots: '#2a1a14', skirt: true, hat: 'bonnet', hatColor: '#f2e6d0' };
const CLERK: T7Look = { skin: '#e2b48e', hair: '#2a2018', hairStyle: 'swept', nose: 'long', top: '#f4f0e6', topKind: 'coat', inner: '#f4efe4', tie: '#2f4f6a', pants: '#3a3a42', boots: '#121010', glasses: true, beard: 'stache', beardColor: '#2a2018', eyes: '#3a4a5a' };
const SPEAK: T7Look = { skin: '#eab595', hair: '#d8d4cc', hairStyle: 'side', nose: 'hook', top: '#2a2a32', topKind: 'suit', inner: '#f4efe4', tie: '#8e2f2f', pants: '#2a2a32', boots: '#121010', glasses: true };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1400, seed: id.length * 7 + 1, rim: '#ffe0b0', rimSide: 1, ...o });
const kid = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}) => act(id, look, pos, p, face, t, { scale: .68, res: 1500, ...o });
const at = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const walk = (t: number, sp = 1) => { const p = t * 5.2 * sp; return { footA: [-.2 + Math.sin(p) * .22, -.08 + Math.max(0, Math.cos(p)) * .1] as [number, number], footB: [.2 - Math.sin(p) * .22, -.08 + Math.max(0, -Math.cos(p)) * .1] as [number, number] }; };

type Base = Partial<Frame9>;
const SHOP: Base = { set: 'shop', sun: { dir: [.2, .5, 1], color: '#fff2dc', i: 1.6, focus: [0, 1, 0], size: 7 }, hemi: { sky: '#f2e6d0', ground: '#8e4a3a', i: 1.15 }, fill: { color: '#ffe8cc', i: .5 }, bg: '#140c0a',
  beams: [-3, 2.4].map(x => ({ p: [x, 2.0, 3.9] as V3, dir: [-.05, -.4, -1] as V3, w: 2.0, h: 2.2, len: 6, c: [1, .93, .8] as [number, number, number], i: .55 })), dust: { box: [[-4.5, .3, -3.6], [4.5, 3, 3.6]], i: .5 },
  lights: [-3, 0, 3].map(x => ({ p: [x, 2.6, -.5] as V3, c: [1, .85, .6] as [number, number, number], i: 2.4, d: 6 })), fog: { color: '#4a3020', density: .02 },
  grade: { ao: .9, aoRadius: .4, aoTint: [.42, .34, .56], sat: 1.18, contrast: 1.07, lift: [.04, .03, .055], gain: [1.05, 1.0, .93], bloom: .3, bloomTh: 1.3, vignette: .28 } };
const NIGHT: Base = { ...SHOP, sun: { dir: [.2, .5, 1], color: '#8aa0d8', i: .5, focus: [0, 1, 0], size: 7 }, hemi: { sky: '#4a5a8a', ground: '#2a1a18', i: .6 }, fill: { color: '#8affb0', i: .15 }, beams: [], dust: undefined,
  lights: [{ p: [.8, 1.6, -.6], c: [.5, 1, .6], i: 3.0, d: 4 }], fog: { color: '#101820', density: .04 }, grade: { ...SHOP.grade, sat: 1.25, lift: [.02, .035, .06], gain: [.96, 1.04, 1.0], bloom: .5, bloomTh: 1.0, vignette: .4 } };
const STREET: Base = { set: 'street', sky: { top: '#3f78c2', mid: '#9fc5e8', bot: '#f6d4a4', sun: [.55, .42, .7] as V3, sunC: '#ffe6c0', clouds: .5 }, sun: { dir: [.55, .42, .7], color: '#ffd7a0', i: 2.2, focus: [0, 0, -6], size: 20 },
  hemi: { sky: '#a9c6ec', ground: '#7a6a58', i: .8 }, fog: { color: '#cdd6e6', density: .006 }, grade: { ao: .85, aoRadius: .5, aoTint: [.36, .36, .6], sat: 1.22, contrast: 1.07, lift: [.025, .025, .06], gain: [1.04, 1.0, .94], bloom: .2, bloomTh: 1.55, vignette: .22 } };
const XR: Base = { set: 'none', sky: { top: '#06140e', mid: '#0a2418', bot: '#103a24', clouds: 0, sun: [.4, .8, .5], sunC: '#000000' }, sun: { dir: [.4, .8, .6], color: '#e0f0e8', i: 1.6, focus: [0, .6, 0], size: 3 },
  hemi: { sky: '#a8e0c0', ground: '#2a3a30', i: 1.3 }, fill: { color: '#c0ffd8', i: .6 }, fog: { color: '#06140e', density: .05 }, lights: [{ p: [0, .25, .5], c: [.5, 1, .7], i: 3.0, d: 2 }, { p: [.8, 1.5, 1.2], c: [1, .9, .8], i: 2.4, d: 4 }],
  grade: { ao: .7, aoRadius: .2, aoTint: [.2, .4, .4], sat: 1.15, contrast: 1.1, lift: [.02, .04, .04], gain: [.98, 1.04, 1.0], bloom: .45, bloomTh: 1.05, vignette: .34 } };
const POV: Base = { ...XR, lights: [], fog: undefined, grade: { ...XR.grade, bloom: .35, bloomTh: 1.2 } };
const STATE: Base = { set: 'state', sun: { dir: [.2, .7, .6], color: '#fff0dc', i: 1.4, focus: [0, 1, -2], size: 12 }, hemi: { sky: '#f2e6d0', ground: '#3a4f7a', i: 1.1 }, fill: { color: '#ffe8cc', i: .45 }, bg: '#140c0a',
  lights: [-5, 0, 5].map(x => ({ p: [x, 6.6, 1] as V3, c: [1, .86, .6] as [number, number, number], i: 4, d: 12 })), fog: { color: '#3a2a20', density: .015 },
  grade: { ao: .85, aoRadius: .5, aoTint: [.38, .32, .56], sat: 1.12, contrast: 1.08, lift: [.035, .025, .055], gain: [1.05, 1.0, .93], bloom: .3, bloomTh: 1.3, vignette: .3 } };

const SC: V3 = [.8, 0, -1.0];          // the fluoroscope in the shop
const KIDON: V3 = [SC[0], .1, SC[2] + .42];
const ring = (k = 1) => `<div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 46%, rgba(0,0,0,0) 0, rgba(0,0,0,0) ${300 * k}px, rgba(4,8,6,.96) ${330 * k}px)"></div>`;
const scopeN = (o: { cut?: number; glow?: number; beam?: number; filt?: number } = {}): Record<string, NodeOv> => ({
  case: { op: o.cut ?? 1 }, hood: { vis: true }, tube: { glow: o.glow ?? 0 }, beam: { vis: (o.beam ?? 0) > .01, op: o.beam ?? 0 }, filter: { glow: o.filt ?? 0 }, foot: { vis: (o.cut ?? 1) < .99 } });
function rays(t: number, n: number, a: number): Sprite[] {
  const S: Sprite[] = []; for (let i = 0; i < n; i++) { const u = (t * 1.2 + hsh(i)) % 1; S.push({ p: [(hsh(i + 1) - .5) * .4, .16 + u * 1.0, .12 + (hsh(i + 2) - .5) * .3], s: .03 + u * .03, rot: 0, c: [.6, 1.6, .9], a: a * (1 - u), kind: 2, seed: .2, age: 0 }); }
  return S;
}

type Shot = { t0: number; t1: number; f: (t: number, k: number) => Partial<Frame9> };
function timeline(): Shot[] {
  const T = { and: w('and', 1, 4.2), wig: w('wiggling', 1, 5.8), this: w('this', 2, 7.7), from: w('from', 1, 10.0), youd: w("you'd", 1, 14.7), look: w('look', 1, 17.2), and2: w('and', 2, 18.7), kids: w('kids', 1, 21.5), parents: w('parents', 1, 25.8),
    but: w('but', 1, 28.2), between: w('between', 1, 29.9), tube: w('tube', 1, 31.1), thin: w('thin', 1, 31.8), one: w('one', 2, 33.6), you: w('you', 1, 35.2), sun: w('sunbathing', 1, 36.2), staff: w('and', 4, 40.0), worst: w('worst', 1, 44.5),
    in: w('in', 3, 47.5), penn: w('pennsylvania', 1, 49.1), ban: w('ban', 1, 50.7), by: w('by', 1, 51.5), s34: w('34', 1, 53.0), so: w('so', 2, 54.2), fired: w('fired', 1, 58.8) };
  const kidOn = (t: number, look = 0, o: Partial<ActorState> = {}) => kid('kid', KID, KIDON, pose({ turn: 0, back: .15, lean: .25 + look * .2, headTilt: .35 + look * .1, handA: [-.45, -1.9], handB: [.45, -1.9], shapeA: 'grip', shapeB: 'grip' }, t, .3), expr('amazed', 'laugh', Math.sin(t * 2) * .5 + .5), t, o);
  const mom = (t: number, p: V3 = [SC[0] - 1.0, 0, SC[2] + .4], f = expr('curious')) => act('mom', MOM, p, pose({ turn: .6, lean: .15, handB: [.6, -2.0], shapeB: 'hold' }, t, .4), f, t);
  const clerk = (t: number, p: V3 = [SC[0] + .95, 0, SC[2] + .2], f = expr('confident', 'happy', .5), hb: [number, number] = [-.6, -2.2]) => act('clerk', CLERK, p, pose({ turn: -.6, handA: hb, shapeA: 'point' }, t, .4), f, t);
  return [
    // S1 — through the shop window past the display shoes, dolly in on a boy standing on the X-ray cabinet
    { t0: 0, t1: T.and, f: (t) => {
      const c = rig([{ t: 0, pos: [-2.0, 1.4, 5.5], look: [.4, 1.0, -1], fov: 44 }, { t: T.and, pos: [-.2, 1.35, 1.6], look: [.8, 1.1, -.9], fov: 36 }], t, { easing: ease.inOut });
      return { ...SHOP, cam: c, props: [{ id: 'scope', pos: SC, nodes: scopeN() }], actors: [kidOn(t), mom(t), clerk(t)], overlay: chip('SHOE SHOP • 1950s', 210, ss(.5, .9, t)) };
    } },
    // S2 — "staring down at his own wiggling toe bones!": the view down the viewer
    { t0: T.and, t1: T.this, f: (t) => {
      const z = 1.25 - at(t, T.and, T.this) * .2;
      return { ...POV, cam: { pos: [0, 0, z], look: [0, 0, 0], fov: 46 }, props: [{ id: 'viewer', pos: [0, 0, 0] }], screen: { dx: t * 1.6, dy: 0, t, zoom: 1, lock: 1 }, overlay: ring() + chip('HIS OWN TOE BONES!', 210, ss(T.wig, T.wig + .3, t), '#7dff9a') };
    } },
    // S3 — "This was completely normal.": a sunny 1950s main street, cars, the shoe shop's sign; a family walks in
    { t0: T.this, t1: T.from, f: (t) => {
      const u = at(t, T.this, T.from); const c = rig([{ t: T.this, pos: [6, 1.4, 4], look: [0, 2.6, -9], fov: 44 }, { t: T.from, pos: [3.2, 1.6, -2], look: [0, 2.8, -9.2], fov: 40 }], t);
      return { ...STREET, cam: c, actors: [act('mom', MOM, [lerp(3, .6, u), .15, -6.6], pose({ turn: -.6, ...walk(t, .8) }, t, .3), expr('happy'), t), kid('k2', KID2, [lerp(2.2, -.1, u), .15, -6.3], pose({ turn: -.6, ...walk(t, 1.1) }, t, .3), expr('excited'), t)],
        overlay: chip('COMPLETELY NORMAL', 210, ss(T.this + .6, T.this + 1, t)) };
    } },
    // S4 — "From the 1920s to the 1950s, lots of shoe shops had one of these.": slow orbit of the walnut cabinet, rim-lit
    { t0: T.from, t1: T.youd, f: (t, k) => {
      const a = lerp(-.9, .6, ease.inOut(k)); const c = { pos: [SC[0] + Math.sin(a) * 2.0, 1.15, SC[2] + Math.cos(a) * 2.0] as V3, look: [SC[0], .8, SC[2]] as V3, fov: 38 };
      return { ...SHOP, cam: c, props: [{ id: 'scope', pos: SC, nodes: scopeN() }], overlay: chip('1920s → 1950s', 210, ss(T.from + .2, T.from + .6, t)) };
    } },
    // S5 — "You'd slide your feet into the slot at the bottom": floor-level close-up, the boy's shoes slide in
    { t0: T.youd, t1: T.look, f: (t) => {
      const c = rig([{ t: T.youd, pos: [SC[0] - .55, .35, SC[2] + 1.3], look: [SC[0], .35, SC[2] + .2], fov: 36 }, { t: T.look, pos: [SC[0] - .25, .32, SC[2] + .95], look: [SC[0], .36, SC[2] + .25], fov: 32 }], t);
      const slide = ss(T.youd + .3, T.youd + 1.2, t);
      return { ...SHOP, cam: c, props: [{ id: 'scope', pos: SC, nodes: scopeN() }], actors: [kid('kid', KID, [SC[0], .1, SC[2] + .8 - slide * .38], pose({ turn: 0, back: .2, ...walk(t * (1 - slide), .6) }, t, .2), expr('excited'), t)],
        overlay: chip('① FEET IN THE SLOT', 210, ss(T.youd + .2, T.youd + .5, t)) };
    } },
    // S6 — "look through the viewer on top": high angle down over the hoods as he bends to look
    { t0: T.look, t1: T.and2, f: (t) => {
      const c = rig([{ t: T.look, pos: [SC[0] + .9, 2.4, SC[2] + 1.2], look: [SC[0], 1.4, SC[2]], fov: 38 }, { t: T.and2, pos: [SC[0] + .6, 2.1, SC[2] + .9], look: [SC[0], 1.45, SC[2]], fov: 34 }], t);
      return { ...SHOP, cam: c, props: [{ id: 'scope', pos: SC, nodes: scopeN() }], actors: [kidOn(t, ss(T.look, T.look + .6, t))], overlay: chip('② LOOK IN THE VIEWER', 210, ss(T.look + .1, T.look + .4, t)) };
    } },
    // S7 — "and watch your bones move inside your new shoes": the view again, now with the shoe outline and a wiggle dance
    { t0: T.and2, t1: T.kids, f: (t) => ({ ...POV, cam: { pos: [Math.sin(t * .7) * .05, 0, 1.15], look: [0, 0, 0], fov: 46 }, props: [{ id: 'viewer', pos: [0, 0, 0] }], screen: { dx: t * 2.4, dy: 0, t, zoom: 1.05, lock: 1 },
      overlay: ring() + chip('③ WATCH YOUR BONES MOVE', 210, ss(T.and2 + .2, T.and2 + .5, t), '#7dff9a') }) },
    // S8 — "Kids loved it. They'd beg to go shoe shopping just to see their skeletons.": a girl drags her mum to the window
    { t0: T.kids, t1: T.parents, f: (t) => {
      const u = at(t, T.kids, T.parents); const c = rig([{ t: T.kids, pos: [-2.5, 1.2, -4.0], look: [1, 1.4, -8.6], fov: 42 }, { t: T.parents, pos: [-1.2, 1.1, -5.0], look: [1, 1.4, -8.6], fov: 36 }], t);
      return { ...STREET, cam: c, actors: [kid('k2', KID2, [lerp(-1.5, .6, u), .15, -7.6], pose({ turn: .6, lean: -.25, handB: [.9, -2.3], shapeB: 'point', handA: [-.8, -2.0], shapeA: 'grip', ...walk(t, 1.4) }, t, .3), expr('excited', 'laugh', .6), t),
        act('mom', MOM, [lerp(-2.6, -.4, u), .15, -7.4], pose({ turn: .6, lean: .2, handB: [.8, -2.0], shapeB: 'grip', ...walk(t, .9) }, t, .3), expr('amused', 'tired', .3), t)],
        overlay: chip('KIDS BEGGED TO GO!', 210, ss(T.kids + .5, T.kids + .9, t)) };
    } },
    // S9 — "Parents trusted it because it looked so scientific!": mum and the white-coated clerk peer into the side hoods
    { t0: T.parents, t1: T.but, f: (t) => {
      const c = rig([{ t: T.parents, pos: [SC[0] - .2, 1.6, SC[2] + 2.2], look: [SC[0], 1.4, SC[2]], fov: 38 }, { t: T.but, pos: [SC[0] - .1, 1.55, SC[2] + 1.5], look: [SC[0], 1.45, SC[2]], fov: 34 }], t);
      return { ...SHOP, cam: c, props: [{ id: 'scope', pos: SC, nodes: scopeN() }], actors: [kidOn(t), mom(t, [SC[0] - .6, 0, SC[2] - .15], expr('amazed', 'happy', .4)), clerk(t, [SC[0] + .6, 0, SC[2] - .15], expr('smug', 'confident', .5), [-.4, -2.6])],
        overlay: chip('🔬 SO SCIENTIFIC!', 210, ss(T.parents + .8, T.parents + 1.2, t)) };
    } },
    // S10 — "But here's the problem. Between your feet and the X-ray tube was a thin sheet of aluminium. About 1 mm.": the
    // cabinet ghosts away; the tube glows under the feet; push in on the thin filter as it lights up
    { t0: T.but, t1: T.you, f: (t) => {
      const c = rig([{ t: T.but, pos: [1.6, 1.0, 1.8], look: [0, .6, 0], fov: 40 }, { t: T.between, pos: [.9, .55, 1.2], look: [0, .3, .1], fov: 36 }, { t: T.you, pos: [.45, .32, .62], look: [0, .22, .12], fov: 30 }], t, { easing: ease.inOut });
      const cut = 1 - .85 * ss(T.but + .3, T.but + 1.2, t); const glow = ss(T.tube - .3, T.tube, t); const fl = ss(T.thin - .2, T.thin + .1, t);
      return { ...XR, cam: c, props: [{ id: 'scope', pos: [0, 0, 0], nodes: scopeN({ cut, glow: glow * 2, filt: fl * (1.2 + .4 * Math.sin(t * 8)) }) }], sprites: rays(t, 20, glow * .6),
        overlay: chip(t < T.tube ? 'HERE\'S THE PROBLEM…' : t < T.thin ? '☢ X-RAY TUBE' : t < T.one ? 'A THIN SHEET OF ALUMINIUM' : 'ABOUT 1 MM THICK', 210, ss(T.but + .2, T.but + .5, t), t < T.tube ? '#ff7a59' : '#7dff9a') };
    } },
    // S11 — "like sunbathing your feet in radiation every time you tried on shoes": the beam floods up through the feet
    { t0: T.you, t1: T.staff, f: (t, k) => {
      const a = lerp(.8, -.2, k); const c = { pos: [Math.sin(a) * 1.5, .7, Math.cos(a) * 1.5] as V3, look: [0, .5, .1] as V3, fov: 38 };
      return { ...XR, cam: c, props: [{ id: 'scope', pos: [0, 0, 0], nodes: scopeN({ cut: .15, glow: 2.2, beam: .5 + .2 * Math.sin(t * 6), filt: .6 }) }], sprites: rays(t, 50, .9),
        overlay: chip('☀️ SUNBATHING IN RADIATION', 210, ss(T.sun - .1, T.sun + .3, t), '#ffd23f') };
    } },
    // S12 — "And the staff were exposed again and again, all day long.": time-lapse — the clerk stays, customers flick by
    { t0: T.staff, t1: T.worst, f: (t) => {
      const c = rig([{ t: T.staff, pos: [SC[0] + 2.4, 1.5, SC[2] + 2.6], look: [SC[0] + .3, 1.1, SC[2]], fov: 40 }, { t: T.worst, pos: [SC[0] + 1.8, 1.4, SC[2] + 2.0], look: [SC[0] + .3, 1.15, SC[2]], fov: 36 }], t);
      const n = Math.floor((t - T.staff) * 3); const who = [KID, KID2, { ...KID, hair: '#2a1a12', top: '#8e2f2f' }, { ...KID2, top: '#7ab0a0' }][n % 4];
      const S = rays(t, 18, .5).map(s => ({ ...s, p: [s.p[0] + SC[0], s.p[1], s.p[2] + SC[2]] as V3 }));
      return { ...SHOP, cam: c, sprites: S, grade: { ...SHOP.grade, sat: 1.05 }, props: [{ id: 'scope', pos: SC, nodes: scopeN({ cut: .7, glow: 1.6, beam: .35 }) }],
        actors: [kid(`c${n}`, who, KIDON, pose({ turn: 0, back: .15, lean: .25, headTilt: .35 }, t, .3), expr('amazed'), t, { seed: n }), clerk(t, [SC[0] + .7, 0, SC[2] + .25], expr('tired', 'neutral', .5))],
        overlay: chip('🕘 ALL DAY LONG', 210, ss(T.staff + .4, T.staff + .8, t), '#ff9a4a') };
    } },
    // S13 — "Worst of all? It didn't even help shoes fit better.": the clerk does the old thumb-on-the-toe test; the boy shrugs
    { t0: T.worst, t1: T.in, f: (t) => {
      const c = rig([{ t: T.worst, pos: [-2.6, 1.0, 2.2], look: [-2.2, .6, .5], fov: 38 }, { t: T.in, pos: [-2.4, .9, 1.7], look: [-2.2, .6, .5], fov: 32 }], t);
      const sh = ss(T.worst + 1.4, T.worst + 1.8, t);
      return { ...SHOP, cam: c, actors: [kid('kid', KID, [-2.2, .45, 1.1], pose({ turn: .1, crouch: .5, kneeUp: true, handA: [-.9 * sh - .4, -1.8 - sh * .5], handB: [.9 * sh + .4, -1.8 - sh * .5], shapeA: 'open', shapeB: 'open' }, t, .3), expr('confused', 'amused', sh), t),
        act('clerk', CLERK, [-2.0, 0, .45], pose({ turn: -.4, crouch: 1.2, kneeUp: true, lean: .35, handA: [-.5, -.8], shapeA: 'thumb' }, t, .3), expr('focused'), t)],
        overlay: chip('BETTER FIT? ✗ NOPE', 210, ss(T.worst + 1.2, T.worst + 1.6, t), '#ff5a4a') };
    } },
    // S14 — "In 1957, Pennsylvania became the first state to ban them.": the state chamber; the gavel falls on "ban"
    { t0: T.in, t1: T.by, f: (t) => {
      const c = rig([{ t: T.in, pos: [0, 2.6, 6], look: [0, 1.8, -6], fov: 44 }, { t: T.by, pos: [0, 2.1, -2.0], look: [0, 2.2, -6.6], fov: 38 }], t, { easing: ease.inOut });
      const gv = ss(T.ban - .25, T.ban, t) * (1 - ss(T.ban + .1, T.ban + .4, t));
      return { ...STATE, cam: c, actors: [act('spk', SPEAK, [0, 1.4, -6.6], pose({ turn: 0, handB: [.7, -3.0 + gv * 1.2], shapeB: 'fist' }, t, .4), expr('determined'), t, { res: 1400 })],
        overlay: chip('1957 • PENNSYLVANIA BANS THEM', 210, ss(T.penn - .2, T.penn + .2, t), '#ff7a59') + (gv > .5 ? chip('BANG!', 1000, 1, '#ffd23f') : '') };
    } },
    // S15 — "By 1960, 34 states had.": crane up and back over the rows; a big counter ticks up to 34
    { t0: T.by, t1: T.so, f: (t) => {
      const c = rig([{ t: T.by, pos: [0, 2.4, -1], look: [0, 1.4, -5], fov: 44 }, { t: T.so, pos: [0, 7.0, 7.0], look: [0, .8, -3], fov: 48 }], t, { easing: ease.inOut });
      const n = Math.round(34 * ss(T.by + .3, T.s34 + .3, t));
      return { ...STATE, cam: c, overlay: `<div style="position:absolute;left:0;width:1080px;top:420px;text-align:center;font-family:Inter;font-weight:900;color:#fff;-webkit-text-stroke:10px #1a120c;paint-order:stroke fill;text-shadow:0 10px 40px rgba(0,0,0,.45)"><div style="font-size:200px;line-height:1;color:#ffd23f">${n}</div><div style="font-size:60px">STATES BY 1960</div></div>` };
    } },
    // S16 — "So that magic machine in the shoe shop? It was an advertisement that fired X-rays at your feet.": night, the
    // empty shop; the cabinet glows green; slow push in; the last words land on the title
    { t0: T.so, t1: 60, f: (t) => {
      const c = rig([{ t: T.so, pos: [-2.4, 1.3, 3.2], look: [SC[0], .9, SC[2]], fov: 42 }, { t: 60, pos: [SC[0] - .4, 1.0, SC[2] + 1.4], look: [SC[0], .8, SC[2]], fov: 36 }], t, { easing: ease.inOut });
      const fire = ss(T.fired - .1, T.fired + .2, t); const tt = ss(T.fired + .6, T.fired + 1.0, t);
      return { ...NIGHT, cam: c, props: [{ id: 'scope', pos: SC, nodes: scopeN({ cut: 1 - .5 * fire, glow: 1 + 2 * fire, beam: .4 * fire }) }], screen: { dx: t, dy: 0, t, zoom: 1, lock: 1 },
        overlay: tt > .001 ? `<div style="position:absolute;left:0;width:1080px;top:${520 - 30 * tt}px;text-align:center;opacity:${tt};font-family:Inter;font-weight:900;font-size:92px;line-height:1.05;color:#fff;-webkit-text-stroke:8px #06140e;paint-order:stroke fill;text-shadow:0 0 40px rgba(90,255,150,.6)">AN AD THAT<br><span style="color:#7dff9a">X-RAYED YOU</span></div>` : chip('MAGIC? NO — MARKETING', 210, ss(T.so + .8, T.so + 1.2, t), '#7dff9a') };
    } },
  ];
}
const SHOTS = timeline();
export function frameAt(frame: number): Frame9 {
  const t = frame / FPS; let s = SHOTS[0];
  for (const sh of SHOTS) if (t >= sh.t0 - 1e-6) s = sh;
  const k = clamp((t - s.t0) / Math.max(.001, s.t1 - s.t0));
  const F = s.f(t, k) as Frame9;
  return { ...F, t, overlay: (F.overlay ?? '') + captions(FILM, t) } as Frame9;
}
