// YunoWorld v9 · "This Robot Beat Napoleon at Chess" (the Mechanical Turk) — 60 s, 11 directed shots across five sets.
// Verified (frameforge-studio yw-v9/FACT_CHECK.md): built by Wolfgang von Kempelen in 1770; toured Europe and America for more
// than eighty years; legend says Napoleon (1809) made illegal moves and the Turk swept the pieces off the board; before games
// the showman opened the doors and shone a candle through to show "only machinery"; a hidden chess master sat on a sliding
// seat, followed the game by magnets under the board and moved the arm with levers; it usually won; destroyed in the
// Chinese Museum fire, Philadelphia, 1854; Silas Weir Mitchell, son of the last owner, published the secret in 1857;
// Amazon's crowd-work service, where people do tasks computers can't, is named Mechanical Turk after it.
import { STAND, idle, type Pose } from '../../ff2d/rig.ts';
import { expr } from '../../ff2d/face.ts';
import { clamp, lerp, ss, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9, NodeOv } from '../engine9.ts';
import { captions, chip, wt } from '../ui9.ts';

export const FPS = 30, FRAMES = 1800;
const FILM = 'turk';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const NAP: T7Look = { skin: '#f0c8a8', hair: '#2a2018', hairStyle: 'side', nose: 'long', head: { w: .95, h: 1.0, jaw: 1.0 }, top: '#26345a', topKind: 'coat', trim: '#d4a640', buttons: '#e2c25a', inner: '#f2ede2', pants: '#efe9dc', boots: '#121010', hat: 'bicorne', hatColor: '#1a1a22', eyes: '#4a5a7a', height: .92 };
const SHOW: T7Look = { skin: '#eab595', hair: '#3a2a1e', hairStyle: 'swept', nose: 'hook', head: { w: .92, h: 1.06 }, top: '#1a1a20', topKind: 'suit', inner: '#f4efe4', tie: '#a8302a', pants: '#24242a', boots: '#121010', beard: 'stache', beardColor: '#3a2a1e', eyes: '#3a4a5a' };
const SKEP: T7Look = { skin: '#e2b48e', hair: '#8a6a4a', hairStyle: 'mutton', nose: 'round', head: { w: 1.05, jaw: 1.1 }, top: '#4a3a5a', topKind: 'coat', inner: '#efe6d2', tie: '#2a2a2a', pants: '#3a3040', boots: '#1a1410', hat: 'bowler', hatColor: '#2a2420', beard: 'chops', beardColor: '#8a6a4a', eyes: '#4a3a2a' };
const MASTER: T7Look = { skin: '#f0c8a8', hair: '#5a4030', hairStyle: 'short', nose: 'snub', head: { w: .95 }, top: '#5a4a3a', topKind: 'waistcoat', inner: '#efe6d2', pants: '#3a3028', boots: '#1a1410', eyes: '#3a5a4a', beard: 'stubble', beardColor: '#5a4030' };
const SON: T7Look = { skin: '#f2cfb0', hair: '#4a3020', hairStyle: 'side', nose: 'long', head: { w: .9, h: 1.05 }, top: '#2a2a32', topKind: 'suit', inner: '#f2ede2', tie: '#1a1a1a', pants: '#2a2a32', boots: '#121010', eyes: '#4a5a6a' };
const AUD: T7Look[] = [
  { skin: '#f0c8a8', hair: '#7a3a22', hairStyle: 'bun', nose: 'button', top: '#6a2a3a', topKind: 'dress', inner: '#f2e6d0', pants: '#6a2a3a', boots: '#2a1a14', skirt: true, hat: 'bonnet', hatColor: '#d8c8a8' },
  { skin: '#c98d66', hair: '#1e1a16', hairStyle: 'short', nose: 'round', top: '#2f4a6a', topKind: 'coat', inner: '#e8e2d4', pants: '#2a2a32', boots: '#1e1814', hat: 'bowler', hatColor: '#24242a' },
  { skin: '#f0c8a8', hair: '#c8a050', hairStyle: 'curly', nose: 'snub', top: '#5a6a3a', topKind: 'jacket', inner: '#f0ead8', pants: '#4a3a2a', boots: '#2a1e14' },
  { skin: '#e2b48e', hair: '#d8d8d4', hairStyle: 'bald', nose: 'hook', top: '#3a3a3a', topKind: 'suit', inner: '#f2ede2', tie: '#6a2a2a', pants: '#2a2a2a', boots: '#121010', beard: 'full', beardColor: '#e8e8e4', glasses: true },
  { skin: '#f2cfb0', hair: '#2a1a12', hairStyle: 'long', nose: 'button', top: '#3a5a5a', topKind: 'dress', inner: '#f2e6d0', pants: '#3a5a5a', boots: '#2a1a14', skirt: true },
  { skin: '#d9a47e', hair: '#5a3a22', hairStyle: 'side', nose: 'long', top: '#7a5a2a', topKind: 'waistcoat', inner: '#efe6d2', pants: '#4a3a2a', boots: '#2a1e14', hat: 'flatcap', hatColor: '#5a4a3a' }];
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1300, seed: id.length * 7 + 1, rim: '#ffd8a8', rimSide: 1, ...o });
const at = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

type Base = Partial<Frame9>;
const PAL: Base = { set: 'palace', sun: { dir: [.2, .55, -1], color: '#fff0d6', i: 2.0, focus: [0, 1, 0], size: 8 }, hemi: { sky: '#f4dcc0', ground: '#6a2a2a', i: 1.3 }, fill: { color: '#ffe2c0', i: .5 }, bg: '#200c10',
  fog: { color: '#c89a80', density: .01 }, beams: [2.4, 6.5, 10.6].map(u => ({ p: [-6.5 + u, 2.4, -4.8] as V3, dir: [-.05, -.45, 1] as V3, w: 1.3, h: 2.7, len: 8, c: [1, .9, .75] as [number, number, number], i: .7 })), dust: { box: [[-6, .3, -4.8], [6, 5, 3]], i: .6 },
  lights: [{ p: [-3.2, 3.9, -.5], c: [1, .8, .55], i: 3.0, d: 9 }, { p: [3.2, 3.9, -.5], c: [1, .8, .55], i: 3.0, d: 9 }],
  grade: { ao: .85, aoRadius: .45, aoTint: [.46, .34, .56], sat: 1.16, contrast: 1.07, lift: [.04, .025, .05], gain: [1.05, 1.0, .94], bloom: .32, bloomTh: 1.3, vignette: .26, exposure: 1.05 } };
const THEA: Base = { set: 'theatre', sun: { dir: [.1, .9, .4], color: '#ffe8c8', i: 1.0, focus: [0, 1, -3], size: 8, shadow: true }, hemi: { sky: '#c8a8a0', ground: '#3a2028', i: 1.0 }, fill: { color: '#ffd8b0', i: .4 }, bg: '#120808',
  fog: { color: '#3a2228', density: .02 }, lights: [{ p: [0, 1.4, -1.6], c: [1, .82, .55], i: 4.5, d: 7 }, { p: [-3, 5, -2], c: [1, .9, .75], i: 3.5, d: 9 }, { p: [3, 5, -2], c: [1, .9, .75], i: 3.5, d: 9 }, { p: [-6.5, 2.7, 2.5], c: [1, .78, .5], i: 1.6, d: 6 }, { p: [6.5, 2.7, 2.5], c: [1, .78, .5], i: 1.6, d: 6 }],
  grade: { ao: .85, aoRadius: .45, aoTint: [.44, .3, .5], sat: 1.15, contrast: 1.08, lift: [.04, .02, .045], gain: [1.05, 1.0, .93], bloom: .35, bloomTh: 1.25, vignette: .3, exposure: 1.08 } };
const MUS: Base = { set: 'museum', sky: { top: '#0b1430', mid: '#1c2a4a', bot: '#5a2a30', clouds: .35, cloudC: '#3a3a52', sun: [.2, .6, -.8], sunC: '#000000' }, sun: { dir: [.3, .7, .6], color: '#8aa0d8', i: .7, focus: [0, 0, -6], size: 30 },
  hemi: { sky: '#3a4a7a', ground: '#2a1a14', i: .7 }, fog: { color: '#2a2030', density: .012 },
  grade: { ao: .7, aoRadius: .6, aoTint: [.3, .3, .55], sat: 1.2, contrast: 1.1, lift: [.03, .03, .07], gain: [1.05, 1.0, .95], bloom: .45, bloomTh: 1.1, vignette: .32, exposure: 1.1 } };
const ROOM: Base = { set: 'room', sun: { dir: [.2, .6, -1], color: '#8aa0d8', i: .6, focus: [0, 1, -1], size: 5 }, hemi: { sky: '#6a7a9a', ground: '#4a2a18', i: .8 }, fill: { color: '#ffc890', i: .3 }, bg: '#0c0806',
  lights: [{ p: [.55, 1.0, -1.75], c: [1, .72, .38], i: 4.5, d: 5 }], fog: { color: '#2a1a10', density: .03 },
  grade: { ao: .85, aoRadius: .4, aoTint: [.36, .3, .55], sat: 1.15, contrast: 1.1, lift: [.035, .025, .06], gain: [1.06, 1.0, .9], bloom: .4, bloomTh: 1.1, vignette: .36, exposure: 1.12 } };
const OFF: Base = { set: 'office', sun: { dir: [.2, .8, .3], color: '#cfe0ff', i: .6, focus: [0, 1, 0], size: 9 }, hemi: { sky: '#9fb8e0', ground: '#2a2f3a', i: .9 }, fill: { color: '#cfe4ff', i: .4 }, bg: '#0a0e16',
  lights: [{ p: [0, 1.9, -4.3], c: [.45, .7, 1], i: 5, d: 9 }, ...[-4.5, -1.5, 1.5, 4.5].map(x => ({ p: [x, 2.7, 1.2] as V3, c: [.95, .97, 1] as [number, number, number], i: 1.6, d: 5 }))], fog: { color: '#101826', density: .02 },
  grade: { ao: .8, aoRadius: .4, aoTint: [.3, .36, .6], sat: 1.12, contrast: 1.08, lift: [.02, .03, .07], gain: [1.0, 1.0, 1.04], bloom: .4, bloomTh: 1.15, vignette: .3, exposure: 1.08 } };
const STUDIO: Base = { set: 'none', sky: { top: '#1a1430', mid: '#2a2048', bot: '#4a2a3a', clouds: 0, sun: [.4, .8, .5], sunC: '#000000' }, sun: { dir: [.4, .8, .6], color: '#fff0dc', i: 2.2, focus: [0, .6, 0], size: 3 },
  hemi: { sky: '#c8b4f0', ground: '#4a3a48', i: 1.2 }, fill: { color: '#ffe0c0', i: .7 }, fog: { color: '#1a1430', density: .03 }, lights: [{ p: [.8, 1.6, 1.2], c: [1, .85, .6], i: 2.5, d: 4 }],
  grade: { ao: .7, aoRadius: .2, aoTint: [.34, .3, .55], sat: 1.15, contrast: 1.08, lift: [.03, .02, .07], gain: [1.03, 1.0, .97], bloom: .3, bloomTh: 1.3, vignette: .3 } };

const TP: V3 = [0, 0, .2];            // the Turk in the palace
const TS: V3 = [0, .9, -4.0];         // the Turk on the theatre stage
/** door swings (hinged at each door's left edge), gear spin, head turn, arm, pieces */
function turkNodes(o: { doors?: number[]; gears?: number; head?: number; arm?: number; sweep?: number; t?: number; cab?: number; seat?: number; move?: number }): Record<string, NodeOv> {
  const n: Record<string, NodeOv> = {}; const dw = .38;
  (o.doors ?? [0, 0, 0]).forEach((d, i) => { const th = d * 1.9; n[`door${i}`] = { rot: [0, -th, 0], pos: [dw / 2 * (Math.cos(th) - 1), 0, dw / 2 * Math.sin(th)] }; });
  for (let k = 0; k < 5; k++) n[`gear${k}`] = { rot: [0, 0, (o.gears ?? 0) * (k % 2 ? -1 : 1) * (1 + k * .2)] };
  n.head = { rot: [0, o.head ?? 0, 0] };
  n.arm = { rot: [0, (o.arm ?? 0) - (o.sweep ?? 0) * 1.3, (o.sweep ?? 0) * .2] };
  const sw = o.sweep ?? 0;
  for (let i = 0; i < 16; i++) { if (sw <= 0) break; const a = clamp(sw * 1.4 - hsh(i) * .4); const tt = a * .9; n[`pieces-p${i}`] = { pos: [(hsh(i + 3) - .3) * 1.2 * tt, 1.6 * tt - 3 * tt * tt, (hsh(i + 7) * .8 + .4) * 1.4 * tt], rot: [tt * 8 * hsh(i), tt * 5, tt * 6 * hsh(i + 1)] }; }
  if (o.move) n['pieces-p0'] = { pos: [.05 * o.move, .04 * Math.sin(o.move * Math.PI), .05 * o.move] };
  if (o.cab !== undefined) { n.cab = { op: o.cab }; n.cabtop = { op: o.cab }; }
  if (o.seat !== undefined) n.seat = { pos: [o.seat, 0, 0] };
  return n;
}

type Shot = { t0: number; t1: number; f: (t: number, k: number) => Partial<Frame9> };
function timeline(): Shot[] {
  const T = { legend: w('legend', 1, 3.2), sweeps: w('sweeps', 1, 5.6), this: w('this', 1, 8.6), built: w('built', 1, 12.6), for: w('amazed', 1, 14.4), people: w('people', 2, 19.2), so: w('so', 1, 21.0),
    nothing: w('nothing', 1, 25.4), then: w('then', 1, 27.0), usually: w('usually', 1, 30.6), see: w('see', 1, 32.2), hidden: w('hidden', 1, 35.6), as: w('as', 2, 38.4), magnets: w('magnets', 1, 40.6),
    in: w('1854', 1, w('in', 3, 45.0) - .1), few: w('later', 1, 48.0), today: w('today', 1, 52.0), name: w('name', 1, 57.0) };
  const napPos: V3 = [0, 0, 1.3];
  return [
    // S1 — over Napoleon's shoulder: a machine waits across the board; push in on its glass eyes
    { t0: 0, t1: T.legend, f: (t) => {
      const c = rig([{ t: 0, pos: [.5, 1.55, 2.6], look: [0, 1.4, -.1], fov: 40 }, { t: T.legend, pos: [.28, 1.55, 1.75], look: [0, 1.8, -.15], fov: 34 }], t);
      return { ...PAL, cam: c, props: [{ id: 'turk', pos: TP, nodes: turkNodes({ head: Math.sin(t * .8) * .15 }) }],
        actors: [act('nap', NAP, napPos, pose({ turn: 0, back: 1, crouch: .55, kneeUp: true }, t, .3), expr('confident'), t, { res: 1400 })],
        overlay: chip('SCHÖNBRUNN PALACE • 1809', 210, ss(.4, .8, t)) };
    } },
    // S2 — "Legend says he cheats... the machine SWEEPS every piece off the board!": low on the board, the arm sweeps and the
    // pieces fly at the lens; whip round to Napoleon's face
    { t0: T.legend, t1: T.this, f: (t) => {
      const sw = at(t, T.sweeps - .15, T.sweeps + .55); const tW = T.sweeps + .6;
      const c = t < tW ? rig([{ t: T.legend, pos: [.15, 1.18, 1.15], look: [0, .98, .2], fov: 42 }, { t: tW, pos: [.08, 1.1, .95], look: [0, 1.0, .2], fov: 44 }], t)
        : rig([{ t: tW, pos: [.5, 1.45, -.05], look: [0, 1.3, 1.3], fov: 40 }, { t: T.this, pos: [.3, 1.38, .3], look: [0, 1.35, 1.3], fov: 34 }], t, { easing: ease.out });
      const cheat = ss(T.legend + .6, T.legend + 1.2, t);
      return { ...PAL, cam: c, props: [{ id: 'turk', pos: TP, nodes: turkNodes({ sweep: sw, head: -.2 * sw }) }], grade: { ...PAL.grade, whip: t > tW && t < tW + .25 ? .45 : 0, whipDir: [1, 0] },
        actors: [act('nap', NAP, napPos, pose({ turn: -.1, crouch: .55, kneeUp: true, handB: [.7, -2.4 - cheat * .3], shapeB: 'point', lean: sw * -.2 }, t, .3), t > tW ? expr('shocked', 'angry', ss(tW + .4, T.this, t)) : expr('smug', 'smirk', cheat), t, { res: 1700 })] };
    } },
    // S3 — "This is the Turk...": slow orbit round the automaton in the gilded hall; BUILT 1770
    { t0: T.this, t1: T.for, f: (t, k) => {
      const a = lerp(.7, -.7, ease.inOut(k)); const c = { pos: [Math.sin(a) * 2.6, 1.5, .2 + Math.cos(a) * 2.6] as V3, look: [0, 1.15, .1] as V3, fov: 40 };
      return { ...PAL, cam: c, props: [{ id: 'turk', pos: TP, nodes: turkNodes({ head: Math.sin(t * .9) * .25, gears: t * 1.5 }) }],
        overlay: chip('THE TURK • BUILT 1770', 210, ss(T.built - .2, T.built + .2, t)) };
    } },
    // S4 — "for more than eighty years it amazed people": dolly up the aisle of a packed exhibition hall to the lit stage
    { t0: T.for, t1: T.people, f: (t) => {
      const c = rig([{ t: T.for, pos: [0, 2.3, 7.5], look: [0, 1.5, -4], fov: 42 }, { t: T.people, pos: [0, 1.9, 3.6], look: [0, 1.6, -4], fov: 38 }], t);
      const A: ActorState[] = []; let i = 0;
      for (let r = 0; r < 4; r++) for (const s of [-1, 1]) for (const dx of [-1.2, .4]) { A.push(act(`a${i}`, AUD[i % 6], [s * 2.8 + dx, 0, 1.2 + r * 1.3 + .05], pose({ turn: 0, back: 1, crouch: .55, kneeUp: true, headTilt: Math.sin(t * 2 + i) * .05 }, t, .3, i), expr('amazed'), t, { seed: i + 20, res: 900 })); i++; }
      return { ...THEA, cam: c, actors: A, props: [{ id: 'turk', pos: TS, nodes: turkNodes({ head: Math.sin(t) * .3, gears: t * 2 }) }],
        overlay: chip('80+ YEARS • EUROPE → AMERICA', 210, ss(T.for + .5, T.for + .9, t)) };
    } },
    // S5 — mocker: a sceptic in the stalls scoffs and points ("it had to be a trick")
    { t0: T.people, t1: T.so, f: (t) => {
      const c = rig([{ t: T.people, pos: [-1.4, 1.3, 3.0], look: [-3.2, 1.15, 1.2], fov: 38 }, { t: T.so, pos: [-1.8, 1.28, 2.55], look: [-3.2, 1.15, 1.2], fov: 34 }], t);
      return { ...THEA, cam: c, actors: [act('skep', SKEP, [-3.2, 0, 1.25], pose({ turn: .55, crouch: .55, kneeUp: true, handB: [1.3, -3.2], shapeB: 'point', headTilt: -.1 }, t, .3), expr('smug', 'suspicious', Math.sin(t * 3) * .5 + .5), t, { res: 1700 }),
        act('aud1', AUD[0], [-2.2, 0, 1.25], pose({ turn: -.6, crouch: .55, kneeUp: true }, t, .3), expr('curious'), t, { seed: 31 })], overlay: chip('"IT\'S A TRICK!"', 210, ss(T.people + .3, T.people + .6, t), '#ff7a59') };
    } },
    // S6 — the showman opens every door and passes a candle through: "Nothing in there but gears!"
    { t0: T.so, t1: T.then, f: (t) => {
      const c = rig([{ t: T.so, pos: [1.3, 1.75, -1.9], look: [0, 1.35, -3.9], fov: 38 }, { t: T.then, pos: [.8, 1.5, -2.55], look: [0, 1.32, -3.8], fov: 34 }], t);
      const d = [0, 1, 2].map(i => ss(T.so + .6 + i * .45, T.so + 1.0 + i * .45, t)); const cx = lerp(-.55, .45, at(t, T.so + 1.8, T.nothing + .4));
      const cp: V3 = [cx, 1.44, -3.55];
      return { ...THEA, cam: c, lights: [...THEA.lights!, { p: [cp[0], cp[1] + .2, cp[2] + .05], c: [1, .75, .4], i: 2.5 * ss(T.so + 1.4, T.so + 1.8, t), d: 1.4 }],
        props: [{ id: 'turk', pos: TS, nodes: turkNodes({ doors: d, gears: t * 2.5 }) }, { id: 'candle', pos: [cp[0], cp[1] - .2, cp[2]], vis: t > T.so + 1.4 }],
        actors: [act('show', SHOW, [cx + .55, .9, -3.1], pose({ turn: -.6, handA: [-1.25, -2.65], shapeA: 'hold', handB: [.4, -2.2] }, t, .4), expr('confident', 'happy', .5), t)],
        overlay: chip('NOTHING BUT GEARS…', 210, ss(T.nothing - .1, T.nothing + .3, t)) };
    } },
    // S7 — wound with a key: the head turns to us, the arm lifts, moves a piece... and it usually won
    { t0: T.then, t1: T.see, f: (t, k) => {
      const c = rig([{ t: T.then, pos: [.75, 2.05, -2.6], look: [0, 1.95, -4.15], fov: 36 }, { t: T.see, pos: [.4, 1.95, -3.05], look: [0, 1.85, -4.15], fov: 32 }], t);
      const hd = ss(.25, .5, k) * .6 - ss(.7, .9, k) * .6;
      return { ...THEA, cam: c, props: [{ id: 'turk', pos: TS, nodes: turkNodes({ doors: [1, 1, 1].map(v => v * (1 - ss(0, .2, k))), head: hd, arm: -ss(.5, .7, k) * .5, move: ss(.6, .8, k), gears: t * 3 }) }],
        overlay: chip('IT USUALLY WON', 210, ss(T.usually - .1, T.usually + .3, t), '#7dff9a') };
    } },
    // S8 — "You see... a magic box with a false bottom": x-ray. The cabinet turns translucent: a real chess master inside,
    // sliding on his seat as each door opens; magnets glow under the board, levers move the arm
    { t0: T.see, t1: T.in, f: (t, k) => {
      const a = lerp(.9, .35, k); const c = { pos: [Math.sin(a) * 2.1, 1.0, Math.cos(a) * 2.1] as V3, look: [0, .62, 0] as V3, fov: 38 };
      const xr = ss(0, .12, k); const seat = lerp(-.2, .32, ss(T.as - T.see, T.as - T.see + 1.2, t - T.see));
      const doors = [0, 1, 2].map(i => ss(T.as + i * .35, T.as + .35 + i * .35, t) * (1 - ss(T.magnets - .4, T.magnets, t)));
      const S: Sprite[] = []; const mg = ss(T.magnets, T.magnets + .3, t);
      for (let i = 0; i < 6; i++) S.push({ p: [-.15 + (i % 3) * .15, .85, -.1 + Math.floor(i / 3) * .2], s: .12, rot: 0, c: [.5, .8, 1.6], a: mg * (.6 + .4 * Math.sin(t * 9 + i)), kind: 2, seed: .3, age: 0 });
      return { ...STUDIO, cam: c, sprites: S, props: [{ id: 'turk', pos: [0, 0, 0], nodes: turkNodes({ cab: 1 - xr * .78, seat: seat + .2, doors, arm: -mg * .5 * Math.sin(t * 3), gears: t * 2 }) }],
        actors: [act('master', MASTER, [seat, .2, -.05], pose({ turn: .5, crouch: 1.6, kneeUp: true, lean: .3, handB: [.6, -2.0], shapeB: 'grip', headTilt: .2 }, t, .3), expr('concentrating', 'focused', .5), t, { scale: .62, res: 1200, shadow: false })],
        overlay: chip(t < T.as ? 'A REAL CHESS MASTER INSIDE' : t < T.magnets ? 'ON A SLIDING SEAT' : 'MAGNETS + LEVERS', 210, 1, t < T.magnets ? '#ffd23f' : '#7fd3ff') };
    } },
    // S9 — "In 1854 the Turk burned in a museum fire": night street, the museum ablaze; crane down to the cobbles
    { t0: T.in, t1: T.few, f: (t, k) => {
      const c = rig([{ t: T.in, pos: [6, 22, 22], look: [0, 6, -12], fov: 44 }, { t: T.few, pos: [4, 2.2, 6], look: [0, 6.5, -12], fov: 42 }], t);
      const S: Sprite[] = [];
      for (let i = 0; i < 70; i++) { const a = (t * (.35 + hsh(i) * .3) + hsh(i + 5)) % 1; const x = -9 + hsh(i + 1) * 18; S.push({ p: [x + Math.sin(t + i) * .4, 6 + a * 12 + hsh(i + 2) * 3, -10 - hsh(i + 3) * 4], s: 2.2 + a * 3, rot: hsh(i) * 6 + t, c: a < .4 ? [1.8, .9, .3] : [.35, .3, .3], a: (a < .4 ? .9 : .5) * (1 - a), kind: a < .4 ? 2 : 0, seed: hsh(i + 9), age: a }); }
      for (let i = 0; i < 30; i++) { const a = (t * .8 + hsh(i + 40)) % 1; S.push({ p: [-8 + hsh(i + 41) * 16, 8 + a * 10, -9], s: .08, rot: 0, c: [2, 1.2, .5], a: 1 - a, kind: 2, seed: .1, age: 0 }); }
      const fl = .85 + .15 * Math.sin(t * 13) * Math.sin(t * 7.3);
      return { ...MUS, cam: c, sprites: S, lights: [{ p: [0, 7, -8], c: [1, .55, .2], i: 14 * fl, d: 30 }, { p: [-6, 4, -8], c: [1, .5, .2], i: 8 * fl, d: 18 }, { p: [6, 4, -8], c: [1, .5, .2], i: 8 * fl, d: 18 }],
        overlay: chip('PHILADELPHIA • 1854', 210, ss(.1, .2, k), '#ff9a4a') };
    } },
    // S10 — "A few years later, the owner's son finally revealed the secret": lamplight, a young man writing it all down
    { t0: T.few, t1: T.today, f: (t) => {
      const c = rig([{ t: T.few, pos: [1.2, 1.5, .6], look: [0, 1.1, -1.5], fov: 40 }, { t: T.today, pos: [.55, 1.35, -.45], look: [0, 1.15, -1.5], fov: 34 }], t);
      const wr = Math.sin(t * 9) * .5 + .5;
      return { ...ROOM, cam: c, actors: [act('son', SON, [0, 0, -1.0], pose({ turn: -.15, back: 0, crouch: .55, kneeUp: true, lean: .2, handB: [.5 + wr * .1, -2.1], shapeB: 'hold', headTilt: .15 }, t, .3), expr('concentrating', 'happy', ss(T.today - 1.2, T.today - .6, t)), t, { res: 1600, rim: '#ffc890', rimSide: 1 })],
        overlay: chip('1857 • THE SECRET REVEALED', 210, ss(T.few + .4, T.few + .8, t)) };
    } },
    // S11 — "And today, Amazon runs a service where hidden humans do the work computers can't. Its name? Mechanical Turk."
    // Dolly between rows of people at screens toward the glowing "AI" wall; the last word lands on the title
    { t0: T.today, t1: 60, f: (t) => {
      const c = rig([{ t: T.today, pos: [0, 1.6, 4.6], look: [0, 1.5, -4.5], fov: 42 }, { t: T.name, pos: [0, 1.55, 1.4], look: [0, 1.75, -4.5], fov: 40 }, { t: 60, pos: [0, 1.75, -1.2], look: [0, 1.9, -4.8], fov: 38 }], t);
      const A: ActorState[] = []; let i = 0;
      for (let r = 0; r < 3; r++) for (let cI = 0; cI < 4; cI++) { const x = -4.5 + cI * 3, z = -1.0 + r * 2.2; A.push(act(`w${i}`, AUD[(i + 2) % 6], [x, 0, z + .6], pose({ turn: 0, back: 1, crouch: .55, kneeUp: true, handA: [-.4, -2.0], handB: [.4, -2.0], headTilt: Math.sin(t * 3 + i) * .04 }, t, .3, i), expr('focused'), t, { seed: i + 50, res: 800 })); i++; }
      const tt = ss(T.name + .6, T.name + 1.0, t);
      return { ...OFF, cam: c, actors: A,
        overlay: tt > .001 ? `<div style="position:absolute;left:0;width:1080px;top:${560 - 30 * tt}px;text-align:center;opacity:${tt};font-family:Inter;font-weight:900;font-size:96px;line-height:1;color:#fff;-webkit-text-stroke:8px #0a0e16;paint-order:stroke fill;text-shadow:0 0 40px rgba(90,176,255,.6)">MECHANICAL<br><span style="color:#ffd23f">TURK</span></div>` : chip('HIDDEN HUMANS • AI TASKS', 210, ss(T.today + 1.4, T.today + 1.8, t), '#7fd3ff') };
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
