// YunoWorld v9 · "Britain's Giant Concrete EARS" (the Denge sound mirrors) — 60 s, 14 directed shots across four sets.
// Verified (frameforge-studio yw-v9/FACT_CHECK.md): acoustic mirrors were developed in the 1920s–30s by Dr William Sansome
// Tucker's team to give early warning of aircraft crossing the Channel, before radar; at Denge near Dungeness, Kent stand a
// 20 ft dish (c.1928), a 30 ft dish (c.1930) and a 200 ft curved wall (c.1930); microphones sat at the focus; trials gave
// several minutes' extra warning, but faster aircraft shrank it; Chain Home radar made them obsolete by the late 1930s;
// the three mirrors still stand on an island in the gravel pits today.
import { STAND, idle, type Pose } from '../../ff2d/rig.ts';
import { expr } from '../../ff2d/face.ts';
import { clamp, lerp, ss, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9, PropF, NodeOv } from '../engine9.ts';
import { captions, chip, wt } from '../ui9.ts';

export const FPS = 30, FRAMES = 1800;
const FILM = 'ears';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const TUCK: T7Look = { skin: '#f0c8a8', hair: '#5a4434', hairStyle: 'side', nose: 'long', head: { w: .94, h: 1.06 }, top: '#4a4a3a', topKind: 'suit', inner: '#f2ede2', tie: '#6a2a2a', pants: '#3a3a30', boots: '#1a1410', beard: 'stache', beardColor: '#5a4434', glasses: true, eyes: '#4a5a6a' };
const OFFICER: T7Look = { skin: '#e2b48e', hair: '#7a5a3a', hairStyle: 'short', nose: 'round', head: { w: 1.02, jaw: 1.08 }, top: '#6a6a42', topKind: 'coat', buttons: '#c9a24a', belt: '#5a3a22', inner: '#e8e2d0', tie: '#5a5a3a', pants: '#5a5a3a', boots: '#2a1a12', hat: 'driver', hatColor: '#5a5a3a', beard: 'stache', beardColor: '#7a5a3a' };
const LISTEN: T7Look = { skin: '#f0c8a8', hair: '#3a2a1e', hairStyle: 'short', nose: 'snub', top: '#7a7048', topKind: 'jacket', inner: '#e8e2d0', pants: '#5a5a3a', boots: '#2a1a12', sleeves: 'rolled', eyes: '#3a5a4a' };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1400, seed: id.length * 7 + 1, rim: '#ffe0b0', rimSide: 1, ...o });
const at = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

type Base = Partial<Frame9>;
const SEA = { c1: '#2a5a6a', c2: '#6aa8b0' };
const DSKY = { top: '#5a8ac0', mid: '#b4cce0', bot: '#f0dcc0', sun: [.4, .35, -.8] as V3, sunC: '#fff0d0', clouds: .75, cloudC: '#e8eef4' };
const DENGE: Base = { set: 'denge', sky: DSKY, sea: SEA, sun: { dir: [.4, .38, -.8], color: '#ffe6c0', i: 2.1, focus: [0, 0, 25], size: 40 }, hemi: { sky: '#b0c8e0', ground: '#8a7f68', i: .8 }, fill: { color: '#fff0dd', i: .12 },
  fog: { color: '#d0dce6', density: .0045 }, wind: 1.0, grade: { ao: .85, aoRadius: .8, aoTint: [.38, .4, .6], sat: 1.12, contrast: 1.07, lift: [.025, .025, .055], gain: [1.04, 1.0, .95], bloom: .2, bloomTh: 1.6, vignette: .22 } };
const SUNSET: Base = { ...DENGE, sky: { top: '#3a4a86', mid: '#e0906a', bot: '#ffd08a', sun: [.1, .1, -1] as V3, sunC: '#ffb060', clouds: .6, cloudC: '#f0a080' }, sea: { c1: '#3a3a5a', c2: '#e8a070' },
  sun: { dir: [.1, .16, -1], color: '#ffb070', i: 2.0, focus: [0, 0, 30], size: 50 }, hemi: { sky: '#d8a0a0', ground: '#5a4a3a', i: .7 }, fog: { color: '#e8b898', density: .005 },
  grade: { ...DENGE.grade, gain: [1.08, .98, .9], lift: [.045, .025, .06], bloom: .3, bloomTh: 1.3 } };
const CHAN: Base = { set: 'none', sky: { top: '#4a6a9a', mid: '#9ab4cc', bot: '#d8dce0', sun: [-.3, .3, -.9] as V3, sunC: '#fff0d8', clouds: .9, cloudC: '#d8dce4' }, sea: { c1: '#24485a', c2: '#5a8a98' },
  sun: { dir: [-.3, .35, -.9], color: '#fff0dc', i: 2.0, focus: [0, 0, 0], size: 60 }, hemi: { sky: '#a8bcd0', ground: '#3a4a52', i: .9 }, fog: { color: '#b8c8d4', density: .006 },
  grade: { ao: .5, aoRadius: 1.0, aoTint: [.38, .42, .62], sat: 1.05, contrast: 1.08, lift: [.025, .03, .06], gain: [1.0, 1.0, 1.0], bloom: .2, bloomTh: 1.6, vignette: .26 } };
const LAB: Base = { set: 'lab', sun: { dir: [-1, .5, .1], color: '#fff0d8', i: 1.6, focus: [0, 1.2, 0], size: 6 }, hemi: { sky: '#e8dcc8', ground: '#5a3820', i: 1.1 }, fill: { color: '#ffe2c0', i: .45 }, bg: '#140c08',
  beams: [{ p: [3.9, 2.0, .2], dir: [-1, -.45, -.1], w: 1.4, h: 1.4, len: 6, c: [1, .92, .78], i: .6 }], dust: { box: [[-3.5, .3, -3], [3.8, 3.2, 3]], i: .55 },
  lights: [{ p: [2.9, 1.3, -1.9], c: [1, .78, .45], i: 3.0, d: 4 }, { p: [2.6, 1.05, -1.9], c: [1, .6, .35], i: 1.2, d: 1.5 }], fog: { color: '#3a2618', density: .02 },
  grade: { ao: .9, aoRadius: .4, aoTint: [.4, .32, .55], sat: 1.12, contrast: 1.08, lift: [.035, .025, .055], gain: [1.05, 1.0, .93], bloom: .3, bloomTh: 1.3, vignette: .3 } };
const HUT: Base = { set: 'hut', sun: { dir: [0, .3, 1], color: '#eef2f4', i: 1.0, focus: [0, 1, 0], size: 4 }, hemi: { sky: '#c8ccd0', ground: '#5a5650', i: 1.0 }, fill: { color: '#ffe0b8', i: .4 }, bg: '#101214',
  beams: [{ p: [0, 1.75, -1.6], dir: [0, -.35, 1], w: 1.5, h: .25, len: 3, c: [.92, .96, 1], i: .7 }], dust: { box: [[-2, .3, -1.6], [2, 2.5, 1.6]], i: .6 },
  lights: [{ p: [1.4, 2.0, -1.2], c: [1, .76, .45], i: 2.6, d: 4 }], fog: { color: '#2a2a2c', density: .03 },
  grade: { ao: .9, aoRadius: .35, aoTint: [.36, .34, .56], sat: 1.08, contrast: 1.1, lift: [.035, .03, .06], gain: [1.04, 1.0, .95], bloom: .3, bloomTh: 1.25, vignette: .34 } };
const RADAR: Base = { set: 'radar', sky: { top: '#1e2a5a', mid: '#7a5a8a', bot: '#f0905a', sun: [-.9, .06, -.3] as V3, sunC: '#ff9a50', clouds: .45, cloudC: '#c07a7a' }, sun: { dir: [-.9, .12, -.3], color: '#ff9a60', i: 1.8, focus: [0, 0, 0], size: 90 },
  hemi: { sky: '#8a7aa8', ground: '#3a4a30', i: .7 }, fog: { color: '#9a7a8a', density: .004 }, grade: { ao: .6, aoRadius: 1.0, aoTint: [.3, .3, .6], sat: 1.12, contrast: 1.08, lift: [.035, .025, .07], gain: [1.06, .98, .92], bloom: .4, bloomTh: 1.15, vignette: .3 } };

const ONLY_PLANE: Record<string, NodeOv> = { wave: { vis: false } };
const ONLY_WAVES: Record<string, NodeOv> = { bomber: { vis: false } };
/** a formation of bombers (the props model) heading toward the camera's side of the Channel along -x→+x */
function formation(t: number, x0: number, sp: number, z0: number, y0: number): PropF[] {
  return [0, 1, 2, 3, 4].map(i => ({ id: 'props', pos: [x0 + t * sp - Math.abs(i - 2) * 6, y0 + Math.sin(t * 1.3 + i) * .4 + (i % 2) * 1.5, z0 + (i - 2) * 7] as V3, rot: [Math.sin(t + i) * .05, 0, 0] as V3, scale: 1.2, nodes: ONLY_PLANE }));
}
/** incoming wavefronts heading for the 200 ft wall (+z), then a glow converging on the microphone */
function waves(t: number, u: number): { props: PropF[]; sprites: Sprite[] } {
  const props: PropF[] = [0, 1].map(i => ({ id: 'props', pos: [0, -2.6, -10 + ((u * 2 + i * .5) % 1) * 46] as V3, scale: 2.6, nodes: ONLY_WAVES }));
  const S: Sprite[] = [];
  for (let i = 0; i < 24; i++) { const a = (t * .7 + hsh(i)) % 1; const sx = (hsh(i + 1) - .5) * 50; S.push({ p: [lerp(sx, 0, a), 3.2 + (1 - a) * 3 * hsh(i + 2), lerp(41, 31, a)], s: .25 + a * .35, rot: 0, c: [1.6, 1.3, .6], a: a * .9, kind: 2, seed: .2, age: 0 }); }
  S.push({ p: [0, 3.25, 31], s: 1.6 + Math.sin(t * 8) * .3, rot: 0, c: [1.8, 1.4, .6], a: .8, kind: 2, seed: .5, age: 0 });
  return { props, sprites: S };
}

type Shot = { t0: number; t1: number; f: (t: number, k: number) => Partial<Frame9> };
function timeline(): Shot[] {
  const T = { they: w('they', 1, 4.2), listen: w('listen', 1, 7.1), planes: w('planes', 1, 8.1), back: w('back', 1, 9.1), radar: w('radar', 1, 13.6), so: w('so', 1, 15.2), tucker: w('tucker', 1, 16.5), if: w('if', 1, 17.9), hear: w('hear', 1, 19.9),
    it: w('it', 1, 20.6), but: w('but', 2, 23.9), a20: w('20', 1, 26.6), a30: w('30', 1, 28.0), and: w('and', 2, 28.7), f200: w('200', 1, 31.0), you: w('you', 2, 32.5), gathers: w('gathers', 1, 36.3), where: w('where', 1, 39.2),
    a: w('listener', 1, 40.7) - .2, before: w('before', 1, 42.8), in: w('in', 2, 44.4), warning: w('warning', 1, 46.7), butp: w('but', 3, 47.2), shorter: w('shorter', 1, 50.6), then: w('then', 2, 51.3), silent: w('silent', 1, 53.5), yet: w('yet', 1, 54.1), dung: w('dungeness', 1, 55.3) };
  return [
    // S1 — dawn drone over the Channel toward the shingle: three huge concrete shapes stare out to sea; crane down
    { t0: 0, t1: T.they, f: (t) => {
      const c = rig([{ t: 0, pos: [-40, 40, -80], look: [-4, 3, 25], fov: 44 }, { t: T.they, pos: [-12, 8, -10], look: [-6, 4, 22], fov: 40 }], t, { easing: ease.inOut });
      return { ...DENGE, cam: c, overlay: chip('DENGE • KENT COAST', 210, ss(.6, 1.0, t)) };
    } },
    // S2 — "They look like alien satellite dishes. But they were built to LISTEN. For enemy planes!": low orbit of the 30 ft
    // dish, looking up into the bowl; a bomber silhouette crosses the sky on "planes"
    { t0: T.they, t1: T.back, f: (t, k) => {
      const a = lerp(-.7, .3, ease.inOut(k)); const c = { pos: [4 + Math.sin(a) * 11, 1.2, 19.9 - Math.cos(a) * 11] as V3, look: [4, 5.6, 19.9] as V3, fov: 44 };
      const pl = at(t, T.listen + .2, T.back + .6);
      return { ...DENGE, cam: c, props: pl > 0 ? [{ id: 'props', pos: [lerp(-60, 60, pl), 30, 50], scale: 1.4, nodes: ONLY_PLANE }] : [],
        overlay: chip(t < T.listen - .1 ? '👽 ALIEN DISHES?' : 'BUILT TO LISTEN', 210, ss(T.they + .3, T.they + .7, t), t < T.listen - .1 ? '#c98fff' : '#ffd23f') };
    } },
    // S3 — "Back in the 1920s, Britain was worried about bombers coming across the Channel, and radar didn't exist yet": a
    // formation skims low over a grey Channel straight past the lens
    { t0: T.back, t1: T.so, f: (t) => {
      const c = rig([{ t: T.back, pos: [30, 2.4, 8], look: [-10, 8, 0], fov: 44 }, { t: T.so, pos: [36, 1.6, 10], look: [8, 9, 0], fov: 40 }], t);
      return { ...CHAN, cam: c, props: formation(t - T.back, -70, 14, 0, 9), overlay: chip(t < T.radar ? 'THE 1920s' : 'NO RADAR YET', 210, ss(T.back + .3, T.back + .7, t), t < T.radar ? '#ffd23f' : '#ff7a59') };
    } },
    // S4 — "So a scientist named William Tucker had an idea.": the lab; he turns from the chalkboard as the idea lands
    { t0: T.so, t1: T.if, f: (t) => {
      const c = rig([{ t: T.so, pos: [1.8, 1.55, 1.8], look: [-.6, 1.5, -2.6], fov: 40 }, { t: T.if, pos: [.6, 1.5, .6], look: [-.6, 1.55, -2.6], fov: 34 }], t);
      const idea = ss(T.tucker + .3, T.tucker + .7, t);
      return { ...LAB, cam: c, screen: { dx: 0, dy: 0, t, lock: 0 }, actors: [act('tuck', TUCK, [-.4, 0, -1.9], pose({ turn: lerp(-.85, .1, idea), handB: [.6, -2.5 - idea * .7], shapeB: idea > .5 ? 'point' : 'hold' }, t, .4), expr('thinking', 'realization', idea), t)],
        overlay: chip('DR WILLIAM S. TUCKER', 210, ss(T.tucker - .3, T.tucker, t)) };
    } },
    // S5 — "If you can't see the planes coming... HEAR them!": close-up, he cups a hand behind his ear and grins
    { t0: T.if, t1: T.it, f: (t) => {
      const c = rig([{ t: T.if, pos: [.1, 1.62, -.3], look: [-.35, 1.55, -1.9], fov: 34 }, { t: T.it, pos: [-.05, 1.62, -.75], look: [-.38, 1.57, -1.9], fov: 28 }], t);
      const cup = ss(T.hear - .35, T.hear, t);
      return { ...LAB, cam: c, screen: { dx: 0, dy: 0, t, lock: cup }, actors: [act('tuck', TUCK, [-.4, 0, -1.9], pose({ turn: .15, handA: [-.62 + cup * .1, -1.62 - cup * 1.8], shapeA: cup > .5 ? 'open' : 'fist', headTilt: -.15 * cup }, t, .4), expr('curious', 'excited', cup), t, { res: 1800 })],
        overlay: chip('👂 HEAR THEM!', 210, cup, '#7dff9a') };
    } },
    // S6 — "It sounds ridiculous, right? Listening for planes with a wall?": an army officer stares up at the 200 ft wall
    { t0: T.it, t1: T.but, f: (t) => {
      const c = rig([{ t: T.it, pos: [-3.2, 1.4, 27.5], look: [-1.0, 3.0, 38], fov: 44 }, { t: T.but, pos: [-2.4, 1.2, 28.8], look: [-.8, 3.6, 38], fov: 40 }], t);
      return { ...DENGE, cam: c, actors: [act('off', OFFICER, [-1.2, .9, 31.0], pose({ turn: .1, back: .4, handA: [-.9, -1.9], handB: [.9, -1.9], shapeA: 'open', shapeB: 'open', headLift: .3 }, t, .4), expr('suspicious', 'amused', Math.sin(t * 2) * .5 + .5), t)],
        overlay: chip('…WITH A WALL?', 210, ss(T.it + 1.2, T.it + 1.6, t), '#ff9a4a') };
    } },
    // S7 — "But they kept building them bigger. A 20-foot dish. A 30-foot dish.": low lateral dolly across the shingle, the
    // gorse sliding through foreground, from the small dish to the big one
    { t0: T.but, t1: T.and, f: (t) => {
      const u = ease.inOut(at(t, T.but, T.and)); const x = lerp(-30, 10, u); const c = { pos: [x, 1.6, 4] as V3, look: [x + 3, 3.6, 20] as V3, fov: 42 };
      return { ...DENGE, cam: c, overlay: chip('20 FT', 210, ss(T.a20, T.a20 + .25, t) * (1 - ss(T.a30 - .2, T.a30, t))) + chip('30 FT', 210, ss(T.a30, T.a30 + .25, t)) };
    } },
    // S8 — "And then a giant curved wall... 200 feet long!": crane up from the forecourt, the wall unrolling across frame
    { t0: T.and, t1: T.you, f: (t) => {
      const c = rig([{ t: T.and, pos: [0, 1.4, 25], look: [0, 4, 43], fov: 50 }, { t: T.you, pos: [0, 18, 14], look: [0, 2, 40], fov: 52 }], t, { easing: ease.inOut });
      return { ...DENGE, cam: c, overlay: chip('200 FT LONG!', 210, ss(T.f200, T.f200 + .3, t), '#7dff9a') };
    } },
    // S9 — "the curved concrete works like cupping your hand behind your ear. It gathers faint sound and focuses it onto one
    // spot, where a microphone sat": overhead, glowing wavefronts roll in, the wall gathers them into one bright point
    { t0: T.you, t1: T.a, f: (t, k) => {
      const c = rig([{ t: T.you, pos: [0, 40, 18], look: [0, 0, 34], fov: 46 }, { t: T.where, pos: [6, 14, 22], look: [0, 3, 33], fov: 42 }, { t: T.a, pos: [2.2, 4.0, 27.5], look: [0, 3.2, 31], fov: 36 }], t, { easing: ease.inOut });
      const W = waves(t, k);
      return { ...DENGE, cam: c, props: ss(T.gathers - .5, T.gathers, t) > 0 ? W.props : [], sprites: W.sprites.map(s => ({ ...s, a: s.a * ss(T.gathers, T.gathers + .8, t) })),
        overlay: chip(t < T.gathers ? '🖐 LIKE A CUPPED HAND' : t < T.where ? 'FOCUSES THE SOUND' : '🎙 MICROPHONE HERE', 210, 1) };
    } },
    // S10 — "A listener could hear engines over the sea long before anyone could see them": in the chamber, a soldier with
    // the stethoscope tubes presses closer; the dial needles twitch; the slot window shows nothing but empty sky
    { t0: T.a, t1: T.in, f: (t) => {
      const c = rig([{ t: T.a, pos: [1.6, 1.4, .6], look: [-.1, 1.3, -1.3], fov: 40 }, { t: T.in, pos: [.8, 1.35, 0], look: [-.2, 1.3, -1.4], fov: 34 }], t);
      const lo = .4 + .3 * Math.sin(t * 5); const nd: Record<string, NodeOv> = {}; for (let i = 0; i < 3; i++) nd[`needle${i}`] = { rot: [0, 0, -.6 + lo * (1 + i * .3) + Math.sin(t * 17 + i) * .08] };
      return { ...HUT, cam: c, setNodes: nd, actors: [act('ls', LISTEN, [-.1, 0, -.6], pose({ turn: -.55, crouch: .5, kneeUp: true, lean: .25, handA: [-.35, -2.6], shapeA: 'hold', headTilt: .18 }, t, .3), expr('concentrating', 'focused', .5), t, { res: 1700 })],
        overlay: chip(t < T.before ? '🔊 ENGINES OVER THE SEA' : '…BEFORE ANYONE SEES THEM', 210, ss(T.a + .4, T.a + .7, t)) };
    } },
    // S11 — "In tests, that meant several extra minutes of warning.": the clock and the logbook; warning bar fills
    { t0: T.in, t1: T.butp, f: (t) => {
      const c = rig([{ t: T.in, pos: [1.3, 1.9, -.4], look: [2.0, 1.7, .4], fov: 36 }, { t: T.butp, pos: [.4, 1.3, -.7], look: [.0, 1.0, -1.1], fov: 34 }], t, { easing: ease.inOut });
      const fill = ss(T.in + .5, T.warning, t);
      return { ...HUT, cam: c, actors: [act('ls', LISTEN, [-.1, 0, -.6], pose({ turn: -.55, crouch: .5, kneeUp: true, lean: .25, handB: [.5, -2.0], shapeB: 'hold' }, t, .3), expr('determined'), t, { res: 1500 })],
        overlay: `<div style="position:absolute;left:190px;top:240px;width:700px;font-family:Inter;font-weight:900;font-size:44px;color:#fff;-webkit-text-stroke:6px #121212;paint-order:stroke fill">WARNING TIME<div style="margin-top:14px;height:44px;border-radius:22px;background:rgba(0,0,0,.45);border:4px solid #fff"><div style="height:100%;width:${fill * 100}%;border-radius:18px;background:#7dff9a"></div></div><div style="margin-top:10px;color:#7dff9a">+ SEVERAL MINUTES</div></div>` };
    } },
    // S12 — "But planes kept getting faster, and the warning kept getting shorter.": a fast formation tears past; the bar drains
    { t0: T.butp, t1: T.then, f: (t) => {
      const c = rig([{ t: T.butp, pos: [10, 3, 14], look: [-6, 8, 0], fov: 46 }, { t: T.then, pos: [14, 3.5, 16], look: [12, 9, 0], fov: 46 }], t);
      const drain = 1 - ss(T.butp + 1.4, T.shorter + .2, t);
      return { ...CHAN, cam: c, props: formation(t - T.butp, -90, 42, 0, 8), grade: { ...CHAN.grade, whip: .15 },
        overlay: `<div style="position:absolute;left:190px;top:240px;width:700px;font-family:Inter;font-weight:900;font-size:44px;color:#fff;-webkit-text-stroke:6px #121212;paint-order:stroke fill">WARNING TIME<div style="margin-top:14px;height:44px;border-radius:22px;background:rgba(0,0,0,.45);border:4px solid #fff"><div style="height:100%;width:${drain * 100}%;border-radius:18px;background:${drain > .4 ? '#ffd23f' : '#ff5a4a'}"></div></div><div style="margin-top:10px;color:#ff9a4a">FASTER PLANES ⚡</div></div>` };
    } },
    // S13 — "Then radar arrived, and the ears went silent.": dusk, crane up a Chain Home mast, red lamps blinking
    { t0: T.then, t1: T.yet, f: (t) => {
      const c = rig([{ t: T.then, pos: [-30, 2, -40], look: [-15, 40, 0], fov: 46 }, { t: T.yet, pos: [-50, 28, -70], look: [0, 30, 0], fov: 46 }], t, { easing: ease.inOut });
      return { ...RADAR, cam: c, overlay: chip('RADAR ARRIVES', 210, ss(T.then + .4, T.then + .8, t), '#7fd3ff') };
    } },
    // S14 — "Yet they're still standing at Dungeness today, listening to nothing at all.": sunset; slow pull back from the
    // mirrors across the still lakes; the dishes keep staring out to sea
    { t0: T.yet, t1: 60, f: (t) => {
      const c = rig([{ t: T.yet, pos: [-6, 2.5, 12], look: [-2, 4, 30], fov: 42 }, { t: 60, pos: [-34, 12, -16], look: [-4, 3, 26], fov: 44 }], t, { easing: ease.inOut });
      return { ...SUNSET, cam: c, overlay: chip('DUNGENESS • TODAY', 210, ss(T.dung - .2, T.dung + .2, t)) };
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
