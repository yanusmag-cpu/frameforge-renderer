// YunoWorld v9 · "The Dog That Powered a Kitchen" (turnspit dogs) — 9 directed shots in one Georgian kitchen + museum.
// Verified (Wikipedia "Turnspit dog"; NPR/The Kitchen Sisters with Jan Bondeson; Abergavenny Museum via People's
// Collection Wales; Mental Floss): a short-legged, long-bodied breed ran in a wall-mounted wheel linked by chain/belt to
// the roasting spit so the meat turned evenly; dogs were often worked in pairs/shifts; cheaper mechanical clock jacks
// (spring/weight-driven) replaced them; by about 1900 the breed had disappeared; "Whiskey", a taxidermied turnspit in the
// Abergavenny Museum (Wales), is the only known surviving example, displayed against a painted blue backdrop with flowers.
// Treatment: the dog is shown as a working animal, not abused; no cruelty depicted.
import { expr } from '../../ff2d/face.ts';
import { lerp, ss, type V3, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9, NodeOv } from '../engine9.ts';
import { chip, wt } from '../ui9.ts';
import { pose, act, at, hsh, dispatcher, bigTitle, type Shot } from '../common9.ts';
import { dogSvg, type DogState } from '../dog9.ts';
import { STAND } from '../../ff2d/rig.ts';
import type { ActorState } from '../../yw3/core.ts';
const DOGS = .324;
/** the turnspit as a cut-out (profile): in the wheel it runs toward +z, which reads screen-left from the +x side */
const dog = (pos: V3, st: DogState, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id: 'dog', look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: STAND, face: expr('neutral'), pos, t, svgOnly: dogSvg({ dir: -1, ...st }), scale: DOGS, res: 1100, contact: .5, ...o });
const IN_WHEEL: V3 = [2.95, 2.235, -2.75];

const FILM = 'spit';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const COOK: T7Look = { skin: '#f0c0a0', hair: '#8a3a22', hairStyle: 'bun', nose: 'round', head: { w: 1.1, h: .98, cheek: 1.15, jaw: 1.08 }, top: '#3f5a7a', topKind: 'dress', inner: '#f2ead8', pants: '#3f5a7a', boots: '#2a1a14', skirt: true, apron: '#f4f0e6', hat: 'bonnet', hatColor: '#f4f0e6', build: 1.2, belly: .5, sleeves: 'rolled' };
const BOY: T7Look = { skin: '#f2cfb0', hair: '#6a4024', hairStyle: 'curly', nose: 'snub', head: { w: 1.08, cheek: 1.1 }, top: '#7a6a4a', topKind: 'waistcoat', inner: '#efe6d2', pants: '#5a4a3a', boots: '#3a2a1e', sleeves: 'rolled' };

type Base = Partial<Frame9>;
const KIT: Base = { set: 'kitchen', sun: { dir: [-1, .55, .25], color: '#fff0d8', i: 1.3, focus: [0, 1, 0], size: 8 }, hemi: { sky: '#e8d8c0', ground: '#6a4a30', i: .9 }, fill: { color: '#ffd8b0', i: .35 }, bg: '#140c08',
  beams: [{ p: [-4.4, 2.0, 0], dir: [1, -.45, -.2], w: 1.4, h: 1.8, len: 6, c: [1, .92, .78], i: .5 }], dust: { box: [[-4, .4, -3.3], [4, 3.8, 3.3]], i: .55 },
  lights: [{ p: [0, .7, -2.6], c: [1, .55, .22], i: 9, d: 7 }, { p: [-1, 1.4, -2.2], c: [1, .62, .3], i: 4, d: 5 }, { p: [-3.0, 2.6, -2.6], c: [1, .8, .5], i: 1.6, d: 4 }], fog: { color: '#3a2216', density: .02 },
  grade: { ao: .85, aoRadius: .45, aoTint: [.42, .32, .55], sat: 1.2, contrast: 1.08, lift: [.045, .03, .05], gain: [1.07, .99, .9], bloom: .4, bloomTh: 1.15, vignette: .28 } };
const MUSEUM: Base = { set: 'none', sky: { top: '#1a2030', mid: '#2a3248', bot: '#4a3a3a', clouds: 0, sun: [.4, .8, .5], sunC: '#000000' }, sun: { dir: [.3, .9, .5], color: '#fff4e0', i: 2.0, focus: [0, 1.2, 6], size: 2 },
  hemi: { sky: '#d8dcf0', ground: '#4a3a30', i: 1.3 }, fill: { color: '#ffe8cc', i: .7 }, lights: [{ p: [0, 2.2, 6.8], c: [1, .92, .8], i: 3, d: 3 }], fog: { color: '#1a2030', density: .05 },
  grade: { ao: .6, aoRadius: .2, aoTint: [.34, .32, .55], sat: 1.12, contrast: 1.08, lift: [.03, .03, .06], gain: [1.03, 1.0, .97], bloom: .3, bloomTh: 1.3, vignette: .38 } };

const WC: V3 = [2.95, 2.75, -2.75]; const SPIT: V3 = [0, 1.15, -2.3];
/** the whole mechanism, mathematically coupled: dog steps -> wheel angle -> chain travel -> spit angle */
function mech(th: number, o: { dog?: number; dogPos?: V3; jack?: number; case?: boolean; dogScale?: number } = {}): { id: string; pos: V3; nodes: Record<string, NodeOv> } {
  const Rw = .14, Rs = .16; const chainS = th * Rw; const spit = chainS / Rs; const n: Record<string, NodeOv> = {};
  n.wheel = { rot: [-th, 0, 0] }; n.spit = { rot: [-spit - (o.jack ?? 0), 0, 0] };
  for (const side of ['a', 'b']) for (let k = 0; k < 22; k++) { const sp = 1 / 22; const sh = ((chainS / 1.66 + (side === 'a' ? 0 : .5)) % sp) * (side === 'a' ? 1 : -1); n[`chain${side}-l${k}`] = { pos: [0, -sh * 1.6, sh * .45] }; }
  const g = o.dog ?? 0;
  n.dog = { vis: false }; for (let k = 0; k < 4; k++) n[`dleg${k}`] = { vis: false }; void g;
  n.jackfan = { rot: [0, (o.jack ?? 0) * 9, 0], vis: true }; n.case = { vis: !!o.case };
  if (o.case) { n.wheel = { vis: false }; n.spit = { vis: false }; n.jack = { vis: false }; n.jackfan = { vis: false }; n.chaina = { vis: false }; n.chainb = { vis: false }; }
  return { id: 'mech', pos: [0, 0, 0], nodes: n };
}
const fire = (t: number, n = 40): Sprite[] => { const S: Sprite[] = []; for (let i = 0; i < n; i++) { const a = (t * (1.1 + hsh(i) * .6) + hsh(i + 5)) % 1; S.push({ p: [-.8 + hsh(i + 1) * 1.6 + Math.sin(t * 3 + i) * .05, .3 + a * .7, -2.95 + hsh(i + 2) * .4], s: .16 + (1 - a) * .14, rot: hsh(i) * 6 + t, c: a < .35 ? [2.2, 1.0, .25] : [1.7, .45, .12], a: .85 * (1 - a), kind: 0, seed: hsh(i + 9), age: a }); } return S; };
const RATE = 2.4;   // wheel rad/s while the dog trots

function timeline(): Shot[] {
  const T = { every: w('every', 1, 3.2), in: w('in', 2, 5.6), somebody: w('somebody', 1, 9.6), so: w('so', 1, 12.6), see: w('see', 1, 14.6), turns: w('turns', 1, 19.4), chain: w('chain', 2, 20.6), roast: w('roast', 1, 24.0),
    there: w('there', 1, 26.2), kitchens: w('kitchens', 2, 31.4), then: w('then', 1, 34.6), only: w('only', 1, 41.0), whiskey: w('whiskey', 1, 44.4) };
  const END = Math.max(T.whiskey + 3.0, 42);
  return [
    // S1 — eye level with the wheel: a little dog trots and the treads roll past; then the camera rides the chain down
    // to the roast turning over the fire (one continuous move)
    { t0: 0, t1: T.in, f: (t) => {
      const th = t * RATE; const u = at(t, T.every - .3, T.in);
      const e = ease.inOut(u); const c = { pos: [lerp(4.25, 1.3, e), lerp(2.55, 1.5, e), lerp(-2.6, .3, e)] as V3, look: [lerp(2.95, .2, e), lerp(2.5, 1.15, e), lerp(-2.75, -2.3, e)] as V3, fov: lerp(46, 42, u) };
      return { ...KIT, cam: c, props: [mech(th)], sprites: fire(t), actors: [dog(IN_WHEEL, { mode: 'run', run: t * 11, mood: 'keen' }, t, { shadow: false, contact: 0 })], overlay: chip('🐕 → 🍖', 210, ss(.4, .8, t)) };
    } },
    // S2 — "In old British kitchens, meat roasted on a long iron spit in front of the fire, and somebody had to turn it
    // for hours": crane down from the beams; a kitchen boy grinds the crank by hand, sweating, the cook bastes
    { t0: T.in, t1: T.so, f: (t) => {
      const c = rig([{ t: T.in, pos: [0, 3.6, 3.2], look: [0, 1.0, -2.2], fov: 48 }, { t: T.so, pos: [.4, 1.7, 2.2], look: [.6, 1.2, -1.8], fov: 44 }], t, { easing: ease.inOut });
      const hand = t * 1.2; const tired = ss(T.somebody, T.so, t);
      return { ...KIT, cam: c, props: [mech(0, { jack: hand })], sprites: fire(t),
        actors: [act('boy', BOY, [1.3, 0, -1.4], pose({ turn: -.7, crouch: .25, handA: [-.75 + Math.cos(hand * 3) * .12, -2.1 + Math.sin(hand * 3) * .12], shapeA: 'grip', lean: .15 + tired * .1, headTilt: tired * .25 }, t, .3), tired < .5 ? expr('determined') : expr('exhausted'), t, { res: 1400 }),
          act('cook', COOK, [-.9, 0, -.9], pose({ turn: .6, handB: [.8, -2.3], shapeB: 'hold' }, t, .4), expr('focused', 'smirk', .3), t)],
        overlay: chip(t < T.somebody ? 'IRON SPIT • OPEN FIRE' : '😩 TURNING FOR HOURS', 210, ss(T.in + .3, T.in + .7, t)) };
    } },
    // S3 — "So they used a dog.": the boy grins; the dog hops up into the wheel and the treads start to roll
    { t0: T.so, t1: T.see, f: (t) => {
      const c = rig([{ t: T.so, pos: [3.6, 1.8, .3], look: [2.9, 1.9, -2.6], fov: 46 }, { t: T.see, pos: [3.7, 2.35, -.6], look: [2.95, 2.35, -2.75], fov: 42 }], t);
      const hop = ss(T.so + .1, T.so + .7, t); const run = ss(T.so + .7, T.so + 1.0, t);
      const dp: V3 = [2.95, lerp(1.0, 2.235, hop) + Math.sin(hop * Math.PI) * .35, lerp(-1.9, -2.75, hop)];
      return { ...KIT, cam: c, props: [mech((t - T.so - .7) * RATE * run)], sprites: fire(t),
        actors: [dog(dp, { mode: run > .5 ? 'run' : 'stand', run: t * 11, mood: 'happy' }, t, { shadow: false, contact: 0 }), act('boy', BOY, [3.2, 0, -1.3], pose({ turn: -.5, handB: [.8, -3.0], shapeB: 'thumb' }, t, .3), expr('happy', 'laugh', .5), t, { res: 1300 })],
        overlay: chip('SO… THEY USED A DOG 🐶', 210, ss(T.so + .1, T.so + .4, t), '#ffd23f') };
    } },
    // S4 — "You see, it's like a hamster wheel hooked to a bike chain. The dog walks, the wheel turns, and a chain carries
    // that motion down to a pulley on the spit": the walls fade to a clean cutaway; glowing pulses run wheel → chain →
    // spit, each part lighting up on its word
    { t0: T.see, t1: T.there, f: (t) => {
      const th = t * RATE; const c = rig([{ t: T.see, pos: [4.1, 2.3, .9], look: [1.6, 1.9, -2.5], fov: 44 }, { t: T.chain, pos: [3.8, 1.9, .5], look: [2.4, 1.9, -2.5], fov: 40 }, { t: T.there, pos: [2.2, 1.5, .9], look: [.6, 1.3, -2.3], fov: 40 }], t, { easing: ease.inOut });
      const S: Sprite[] = [...fire(t, 14)]; const pulse = (t * .9) % 1; const glow = ss(T.chain - .2, T.chain + .2, t);
      for (let i = 0; i < 5; i++) { const u = (pulse + i / 5) % 1; S.push({ p: [2.57, lerp(WC[1], SPIT[1], u), lerp(WC[2] + .14, SPIT[2] + .16, u)], s: .1, rot: 0, c: [1.6, 1.4, .5], a: glow * .9, kind: 2, seed: .2, age: 0 }); }
      const lab = t < T.turns ? '① DOG WALKS' : t < T.chain ? '② WHEEL TURNS' : t < T.roast ? '③ CHAIN CARRIES IT DOWN' : '④ PULLEY SPINS THE SPIT';
      return { ...KIT, cam: c, props: [mech(th)], sprites: S, actors: [dog(IN_WHEEL, { mode: 'run', run: t * 11 }, t, { shadow: false, contact: 0 })], overlay: chip(lab, 210, ss(T.see + .2, T.see + .5, t), '#7fd3ff') };
    } },
    // S5 — "There was even a special breed for the job, short legs and a long body, called the turnspit dog": portrait
    // of the dog in its wheel, then it hops out for a rest by the hearth ("kitchens often kept two, so they could take turns")
    { t0: T.there, t1: T.then, f: (t) => {
      const out = ss(T.kitchens + .2, T.kitchens + 1.2, t);
      const c = out < .05 ? rig([{ t: T.there, pos: [3.7, 2.5, -1.3], look: [2.95, 2.35, -2.75], fov: 40 }, { t: T.kitchens, pos: [3.55, 2.45, -1.55], look: [2.95, 2.35, -2.75], fov: 36 }], t) : { pos: [3.4, 1.0, .4] as V3, look: [1.6, .3, -1.6] as V3, fov: 42 };
      const A = out < .05 ? [dog(IN_WHEEL, { mode: 'run', run: t * 11, mood: 'keen' }, t, { shadow: false, contact: 0 })] : [dog([1.4, 0, -1.6], { mode: 'rest', mood: 'sleepy' }, t, { contact: .5 }), dog([2.95, 2.235, -2.75], { mode: 'run', run: t * 11, mood: 'keen' }, t, { id: 'dog2', shadow: false, contact: 0 })];
      return { ...KIT, cam: c, props: [mech((t - T.there) * RATE)], sprites: fire(t), actors: A,
        overlay: chip(t < T.kitchens ? 'THE TURNSPIT DOG' : '2 DOGS • TAKING TURNS', 210, ss(T.there + .4, T.there + .8, t), '#ffd23f') };
    } },
    // S6 — "Then cheap clockwork roasting jacks came along, and by around 1900 the breed had disappeared": the new
    // clockwork jack whirs (fly-fan spinning, weight sinking), the spit turns with no dog; the wheel stands still
    { t0: T.then, t1: T.only, f: (t) => {
      const j = (t - T.then) * 1.6; const c = rig([{ t: T.then, pos: [-3.5, 2.2, -.5], look: [-2.55, 1.9, -2.3], fov: 38 }, { t: T.only, pos: [-.4, 1.9, .8], look: [-1.0, 1.4, -2.3], fov: 42 }], t, { easing: ease.inOut });
      const m = mech(0, { jack: j }); m.nodes['jack-weight'] = { pos: [0, -(t - T.then) * .03, 0] };
      return { ...KIT, cam: c, props: [m], sprites: fire(t), actors: [dog([-1.4, 0, -.9], { mode: 'rest', mood: 'happy' }, t, { contact: .5 })], overlay: chip(t < T.then + 2.6 ? '⚙️ CLOCKWORK ROASTING JACK' : 'BY ~1900: NO MORE TURNSPITS', 210, ss(T.then + .2, T.then + .6, t), t < T.then + 2.6 ? '#7fd3ff' : '#ff9a4a') };
    } },
    // S7 — "Only one is known to survive, a stuffed turnspit named Whiskey, in a museum in Wales": a quiet museum
    // case, blue backdrop and flowers; slow push in; the name lands
    { t0: T.only, t1: END, f: (t) => {
      const c = rig([{ t: T.only, pos: [.9, 1.5, 8.6], look: [0, 1.15, 6.0], fov: 40 }, { t: END, pos: [.25, 1.3, 7.15], look: [0, 1.2, 6.0], fov: 34 }], t, { easing: ease.inOut });
      const tt = ss(T.whiskey + .2, T.whiskey + .6, t);
      return { ...MUSEUM, cam: c, props: [mech(0, { case: true })], actors: [dog([0, .9, 6.0], { mode: 'stand', mood: 'happy' }, t, { contact: .4, shadow: false })],
        overlay: chip('ABERGAVENNY MUSEUM, WALES', 210, ss(T.only + .4, T.only + .8, t), '#7fd3ff') + bigTitle('WHISKEY', 'THE LAST TURNSPIT', tt) };
    } },
  ];
}
export const frameAt = dispatcher(FILM, timeline());
