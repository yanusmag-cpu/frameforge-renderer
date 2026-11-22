// YunoWorld v9 · "Why Victorians Rode a Shed Into the Sea" (bathing machines) — 9 directed shots, beach + sea.
// Verified (Wikipedia "Bathing machine"; History Hit; Historic UK; Country Life; Martha Gunn biographies): bathing machines
// (18th c. – early 20th c.) were wheeled wooden huts drawn into the surf, often by a horse with a driver; bathers changed
// inside and stepped out on the sea side; Benjamin Beale of Margate (c.1750) added a canvas "modesty hood"; same-sex
// attendants called dippers helped bathers in and out — some pushed them under and pulled them out; Martha Gunn was
// Brighton's most famous dipper (decades of service, c.1750–1814); bathing was largely segregated and men often bathed
// naked; the machines faded once mixed bathing became acceptable; beach huts descend from them.
import { expr } from '../../ff2d/face.ts';
import { lerp, ss, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9, NodeOv } from '../engine9.ts';
import { chip, wt } from '../ui9.ts';
import { pose, act, at, hsh, walk, dispatcher, bigTitle, type Shot } from '../common9.ts';

const FILM = 'bath';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const LADY: T7Look = { skin: '#f4d2b8', hair: '#6a3a22', hairStyle: 'bun', nose: 'button', head: { w: 1.0, h: 1.02, cheek: 1.05 }, top: '#8a3a5a', topKind: 'dress', trim: '#f2e6d0', inner: '#f2e6d0', pants: '#8a3a5a', boots: '#2a1a14', skirt: true, hat: 'bonnet', hatColor: '#f2e6d0', eyes: '#4a6a8a' };
const BATHER: T7Look = { ...LADY, top: '#2f4f7a', topKind: 'dress', trim: '#f4f0e6', pants: '#2f4f7a', hat: 'bonnet', hatColor: '#f4f0e6', boots: '#2f4f7a' };
const DIPPER: T7Look = { skin: '#e2a888', hair: '#8a8a88', hairStyle: 'bun', nose: 'round', head: { w: 1.15, h: .98, jaw: 1.15, cheek: 1.15 }, top: '#3a3a3a', topKind: 'dress', inner: '#e8e2d4', pants: '#3a3a3a', boots: '#2a1a14', skirt: true, hat: 'bonnet', hatColor: '#2a2a2a', build: 1.35, belly: .7, eyes: '#4a4a5a' };
const DRIVER: T7Look = { skin: '#d9a47e', hair: '#5a3a22', hairStyle: 'short', nose: 'long', top: '#4a5a3a', topKind: 'jacket', inner: '#e8e2d0', pants: '#3a3a30', boots: '#1e1814', hat: 'flatcap', hatColor: '#3a3a30', sleeves: 'rolled', beard: 'chops', beardColor: '#5a3a22' };
const PROM: T7Look[] = [
  { skin: '#f0c8a8', hair: '#7a3a22', hairStyle: 'bun', nose: 'button', top: '#e8c84a', topKind: 'dress', inner: '#f2e6d0', pants: '#e8c84a', boots: '#2a1a14', skirt: true, hat: 'bonnet', hatColor: '#f4f0e6' },
  { skin: '#e2b48e', hair: '#1e1a16', hairStyle: 'side', nose: 'hook', top: '#2a2a32', topKind: 'suit', inner: '#f2ede2', tie: '#8e2f2f', pants: '#2a2a32', boots: '#121010', hat: 'boater', hatColor: '#e8d8a0', beard: 'stache', beardColor: '#1e1a16' },
  { skin: '#f2cfb0', hair: '#c8a050', hairStyle: 'long', nose: 'snub', top: '#7ab0a0', topKind: 'dress', inner: '#f2e6d0', pants: '#7ab0a0', boots: '#2a1a14', skirt: true }];

type Base = Partial<Frame9>;
const SKY = { top: '#2f7ad0', mid: '#8ec8f0', bot: '#f2f0e4', sun: [.5, .55, .55] as V3, sunC: '#fff6d8', clouds: .45 };
const BEACH: Base = { set: 'beach', sky: SKY, sea: { c1: '#1a7a9a', c2: '#46d0c8' }, sun: { dir: [.5, .55, .55], color: '#fff0d0', i: 2.3, focus: [0, 0, 0], size: 24 }, hemi: { sky: '#a8d4f4', ground: '#e8d2a0', i: .8 },
  fill: { color: '#fff4e0', i: .15 }, fog: { color: '#d8ecf4', density: .0035 }, grade: { ao: .75, aoRadius: .6, aoTint: [.38, .42, .62], sat: 1.24, contrast: 1.06, lift: [.025, .03, .055], gain: [1.04, 1.0, .95], bloom: .22, bloomTh: 1.5, vignette: .2 } };

const HALF = Math.PI / 2;
/** the machine + horse prop rolling seaward (toward -z); u = 0 on the sand at z=8, 1 in the surf at z=-10 */
function machineAt(u: number, t: number, o: { hood?: number; horse?: boolean; flag?: number; yaw?: number; cut?: number } = {}) {
  const z = lerp(8, -10, u); const y = Math.max(-.55, Math.min(.2, z * .045));
  const g = t * 6.5 * (o.horse === false ? 0 : 1); const n: Record<string, NodeOv> = {};
  for (let k = 0; k < 4; k++) n[`leg${k}`] = { rot: [0, 0, Math.sin(g + (k % 2 ? Math.PI : 0) + (k > 1 ? Math.PI / 2 : 0)) * .45] };
  n.horse = { vis: o.horse !== false, pos: [0, Math.abs(Math.sin(g)) * .05, 0] };
  n.hood = { vis: (o.hood ?? 0) > .01, scale: .2 + .8 * (o.hood ?? 0) };
  n.flag = { pos: [0, (o.flag ?? 0) * .5 - .5, 0] };
  if (o.cut !== undefined) { n.mach = { op: o.cut }; }
  return { id: 'machine', pos: [0, y, z] as V3, rot: [0, o.yaw ?? HALF, Math.sin(t * 3) * .015] as V3, nodes: n };
}
const splash = (t: number, p: V3, n = 18, a = 1): Sprite[] => { const S: Sprite[] = []; for (let i = 0; i < n; i++) { const u = (t * 1.6 + hsh(i)) % 1; S.push({ p: [p[0] + (hsh(i + 1) - .5) * 2.4, p[1] + u * 1.0 * hsh(i + 2) + .1, p[2] + (hsh(i + 3) - .5) * 1.6], s: .12 + u * .25, rot: 0, c: [1.3, 1.4, 1.45], a: a * (1 - u), kind: 0, seed: hsh(i), age: u }); } return S; };

function timeline(): Shot[] {
  const T = { somebody: w('somebody', 1, 3.6), this: w('this', 1, 5.6), back: w('back', 1, 8.0), changed: w('changed', 1, 14.0), once: w('once', 1, 17.5), canvas: w('canvas', 1, 23.4), and: w('and', 3, 27.0),
    dippers: w('dippers', 1, 31.0), brighton: w("brighton's", 1, 31.7), twist: w('twist', 1, 40.6), men: w('men', 1, 44.0), when: w('when', 2, 46.4), huts: w('huts', 1, 52.4) };
  const END = Math.max(T.huts + 2.0, 46);
  return [
    // S1 — sweeping tracking shot alongside the horse as the shed rolls into the surf; then a face at the window
    { t0: 0, t1: T.this, f: (t) => {
      const u = at(t, 0, T.this + 1); const M = machineAt(u, t); const z = M.pos[2];
      const c = t < T.somebody ? { pos: [lerp(7, 5.5, u), 1.6, z + lerp(2, -3, u)] as V3, look: [0, 1.6, z - 2.5] as V3, fov: 44 }
        : rig([{ t: T.somebody, pos: [2.8, 1.9, z + 3.8], look: [0, 1.9, z + 1.2], fov: 36 }, { t: T.this, pos: [2.0, 1.95, z + 3.0], look: [0, 1.95, z + 1.2], fov: 30 }], t);
      return { ...BEACH, cam: c, props: [M], sprites: splash(t, [0, .1, z - 3.8], 14, ss(.2, .45, u)),
        actors: [act('drv', DRIVER, [1.0, .0, z - 3.0], pose({ turn: -.6, ...walk(t, .9), handB: [.6, -2.4], shapeB: 'grip' }, t, .3), expr('focused'), t),
          ...(t > T.somebody - .2 ? [act('lady', LADY, [0, .95, z + 1.3], pose({ turn: .5, handB: [.8, -3.0 + Math.sin(t * 8) * .2], shapeB: 'open' }, t, .2), expr('excited', 'happy', .5), t, { res: 1500 })] : [])],
        overlay: chip('🐴 → 🌊', 210, ss(.5, .9, t)) };
    } },
    // S2 — "This is a bathing machine": crane up over the resort — rows of striped machines, the pier, the hotels
    { t0: T.this, t1: T.back, f: (t) => {
      const c = rig([{ t: T.this, pos: [-14, 2.2, 6], look: [-10, 2.6, 28], fov: 46 }, { t: T.back, pos: [-22, 14, -10], look: [-8, 2, 26], fov: 48 }], t, { easing: ease.inOut });
      const A: ActorState[] = []; for (let i = 0; i < 9; i++) A.push(act(`p${i}`, PROM[i % 3], [-30 + i * 4.5 + hsh(i) * 2, 3.1, 50 + hsh(i + 2) * 3], pose({ turn: i % 2 ? .7 : -.7, ...walk(t + i, .6) }, t, .3, i), expr('happy'), t, { seed: i + 30, res: 700 }));
      return { ...BEACH, cam: c, actors: A, overlay: chip('THE BATHING MACHINE', 210, ss(T.this + .2, T.this + .6, t)) };
    } },
    // S3 — "...you climbed in fully dressed on the beach, and changed while the horse hauled you out": she climbs the
    // steps in her full dress, then a cutaway (the walls ghost) shows her inside in her bathing dress, bumping along
    { t0: T.back, t1: T.once, f: (t) => {
      const cut = ss(T.changed - .3, T.changed + .2, t); const u = at(t, T.changed - .2, T.once + 1) * .6;
      const M = machineAt(u, t, { cut: 1 - cut * .78 }); const z = M.pos[2];
      const climb = ss(T.back + .4, T.changed - .6, t);
      const c = cut < .5 ? rig([{ t: T.back, pos: [-4.4, 1.5, 10 + 4], look: [0, 1.3, 9], fov: 40 }, { t: T.changed, pos: [-3.6, 1.8, 12.4], look: [0, 1.6, 9], fov: 36 }], t)
        : { pos: [-3.4, 2.6, z + 1.2] as V3, look: [0, 1.9, z] as V3, fov: 40 };
      const ladyPos: V3 = cut < .5 ? [lerp(.0, .0, climb), climb * 1.0, z + 1.9 - climb * .9] : [0, 1.1, z + .1];
      return { ...BEACH, cam: c, props: [M], actors: [act('lady', cut < .5 ? LADY : BATHER, ladyPos, pose({ turn: cut < .5 ? .1 : -.4, back: cut < .5 ? .9 : 0, ...(cut < .5 ? walk(t, .5) : {}) }, t, .3), cut < .5 ? expr('determined') : expr('nervous', 'happy', .4), t, { res: 1500 }),
        ...(cut < .5 ? [act('p0', PROM[1], [-3.2, 0, 7.5], pose({ turn: .6, handB: [.6, -3.0], shapeB: 'open' }, t, .3), expr('shocked'), t, { seed: 40 })] : [])],
        overlay: chip(cut < .5 ? '😱 BEING SEEN = SHOCKING' : 'CHANGE INSIDE • WHILE IT ROLLS', 210, ss(T.back + .3, T.back + .7, t), cut < .5 ? '#ff7a59' : '#7fd3ff') };
    } },
    // S4 — "Once the water was deep enough, the door opened on the sea side... Some even had a canvas hood": from the
    // sea, looking back at the beach: the door opens, she steps down; the hood unfolds over her like a tent
    { t0: T.once, t1: T.and, f: (t) => {
      const M = machineAt(1, t, { horse: false, yaw: -HALF, hood: ss(T.canvas, T.canvas + 1.0, t) }); const z = M.pos[2];
      const c = rig([{ t: T.once, pos: [.6, 1.0, z - 7], look: [0, 1.6, z], fov: 42 }, { t: T.and, pos: [1.6, 1.3, z - 4.4], look: [0, 1.4, z - .6], fov: 38 }], t, { easing: ease.inOut });
      const out = ss(T.once + 1.4, T.once + 2.4, t);
      return { ...BEACH, cam: c, props: [M], sprites: splash(t, [0, 0, z - 1.6], 10, out * .6),
        actors: [act('lady', BATHER, [0, lerp(1.0, -.55, out), z - 1.1 - out * .7], pose({ turn: .1, back: 0, ...walk(t, .4 * (1 - out)) }, t, .3), expr('happy', 'excited', out), t, { res: 1500 })],
        overlay: chip(t < T.canvas ? 'DOOR ON THE SEA SIDE 🙈' : 'MODESTY HOOD ⛺', 210, ss(T.once + .4, T.once + .8, t)) };
    } },
    // S5 — "And if you couldn't swim? ... dippers waited in the water to dunk you under, then pull you back out": the
    // dipper grabs her, DUNK, splash, up she comes spluttering
    { t0: T.and, t1: T.brighton, f: (t) => {
      const z = -13.2; const c = rig([{ t: T.and, pos: [4.6, 1.3, z + 3.0], look: [.9, .55, z - .6], fov: 40 }, { t: T.brighton, pos: [3.6, 1.0, z + 2.1], look: [.8, .55, z - .6], fov: 34 }], t);
      const dk = ss(T.dippers + 1.0, T.dippers + 1.3, t) * (1 - ss(T.dippers + 2.0, T.dippers + 2.4, t));
      const sp = dk > .2 || (t > T.dippers + 2.0 && t < T.dippers + 2.8) ? 1 : 0;
      return { ...BEACH, cam: c, props: [machineAt(1, t, { horse: false, yaw: -HALF, hood: 1 })], sprites: splash(t, [.4, -.3, z - .5], 22, sp),
        actors: [act('dip', DIPPER, [1.1, -.85, z - .7], pose({ turn: -.5, handA: [-.9, -2.2 + dk * .8], handB: [-.6, -2.0 + dk * .8], shapeA: 'grip', shapeB: 'grip' }, t, .3), expr('determined', 'smirk', .5), t, { res: 1500 }),
          act('lady', BATHER, [.1, lerp(-.75, -1.65, dk), z - .4], pose({ turn: .3, handA: [-.9, -3.0], handB: [.9, -3.0], shapeA: 'open', shapeB: 'open' }, t, .3), t < T.dippers + 1 ? expr('nervous') : expr('shocked', 'laugh', ss(T.dippers + 2.4, T.brighton, t)), t, { res: 1500 })],
        overlay: chip(t < T.dippers ? "CAN'T SWIM?" : 'THE DIPPER: DUNK! 💦', 210, ss(T.and + .2, T.and + .5, t), '#7fd3ff') };
    } },
    // S6 — "Brighton's most famous dipper, Martha Gunn, did it for decades": a proud close-up in the surf
    { t0: T.brighton, t1: T.twist, f: (t) => {
      const z = -13.2; const c = rig([{ t: T.brighton, pos: [3.0, .8, z + 1.2], look: [1.1, .55, z - .7], fov: 34 }, { t: T.twist, pos: [2.5, .75, z + .6], look: [1.1, .6, z - .7], fov: 30 }], t);
      return { ...BEACH, cam: c, props: [machineAt(1, t, { horse: false, yaw: -HALF, hood: 1 })],
        actors: [act('dip', DIPPER, [1.1, -.85, z - .7], pose({ turn: -.2, handA: [-.7, -1.6], handB: [.7, -1.6], shapeA: 'fist', shapeB: 'fist' }, t, .3), expr('confident', 'smug', .6), t, { res: 1800 })],
        overlay: chip('MARTHA GUNN • BRIGHTON', 210, ss(T.brighton + .3, T.brighton + .7, t), '#ffd23f') };
    } },
    // S7 — "And the twist? All that modesty was mostly for women. Men often swam completely naked.": whip-pan down the
    // beach to the GENTLEMEN end: a heap of clothes on the sand, a head bobbing far out; two ladies turn away aghast
    { t0: T.twist, t1: T.when, f: (t) => {
      const c = rig([{ t: T.twist, pos: [-30, 1.4, 4], look: [-46, 1.0, -8], fov: 42 }, { t: T.when, pos: [-33, 1.2, 2], look: [-48, .6, -12], fov: 34 }], t);
      const S: Sprite[] = [...splash(t, [-50, -.2, -16], 8, .6)];
      return { ...BEACH, cam: c, sprites: S, grade: { ...BEACH.grade, whip: t < T.twist + .25 ? .45 * (1 - (t - T.twist) / .25) : 0, whipDir: [1, 0] },
        actors: [act('l1', PROM[0], [-33.6, 0, 1.0], pose({ turn: .8, handA: [-.3, -3.3], shapeA: 'open' }, t, .3), expr('shocked'), t, { seed: 50 }), act('l2', PROM[2], [-32.7, 0, .4], pose({ turn: .7, handB: [.3, -3.4], shapeB: 'open', headTurn: .4 }, t, .3, 6), expr('terrified', 'amused', .2), t, { seed: 51 }),
          act('m1', PROM[1], [-50, -1.3, -16], pose({ turn: 0, handA: [-.6, -3.2], shapeA: 'open' }, t, .3), expr('happy'), t, { seed: 52, scale: .9, shadow: false })],
        overlay: chip(t < T.men ? 'THE TWIST…' : '🙈 MEN: OFTEN NOTHING AT ALL', 210, ss(T.twist + .2, T.twist + .5, t), '#ff9a4a') };
    } },
    // S8 — "When mixed bathing finally became normal, the machines rolled away, and their cousins still line the beach
    // today as beach huts": the machine rolls up out of the sea and into a row; the wheels fade; pull back to the huts
    { t0: T.when, t1: END, f: (t, k) => {
      const c = rig([{ t: T.when, pos: [-12, 2.0, 18], look: [-20, 2, 30], fov: 44 }, { t: END, pos: [6, 7, 8], look: [-20, 2, 30], fov: 46 }], t, { easing: ease.inOut });
      const tt = ss(T.huts + .4, T.huts + .8, t);
      return { ...BEACH, cam: c, sky: { ...SKY, bot: '#ffe0b0', sun: [.4, .3, .7] }, sun: { ...BEACH.sun!, color: '#ffd8a0', dir: [.4, .32, .7] },
        actors: [act('a', PROM[0], [-14, 0, 24], pose({ turn: .4, ...walk(t, .6) }, t, .3), expr('happy'), t, { seed: 60 }), act('b', PROM[1], [-13, 0, 24.6], pose({ turn: .4, ...walk(t + .4, .6) }, t, .3), expr('happy'), t, { seed: 61 })],
        overlay: chip(k < .4 ? 'MIXED BATHING 👫' : '', 210, ss(T.when + .3, T.when + .7, t), '#7dff9a') + bigTitle('BATHING MACHINES →', 'BEACH HUTS', tt) };
    } },
  ];
}
export const frameAt = dispatcher(FILM, timeline());
