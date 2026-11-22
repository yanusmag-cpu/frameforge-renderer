// YunoWorld v9 · "She Got Paid to Shoot Peas at Windows" (knocker-uppers) — 10 directed shots, street + bedroom.
// Verified (frameforge-studio yw-v9/FACT_CHECK.md, Wikipedia "Knocker-up" + "Mary Smith (knocker upper)", Atlas Obscura,
// Mental Floss, Snopes): before affordable alarm clocks, British industrial workers paid knocker-uppers a few pence a week
// to wake them by tapping windows with long poles/sticks; Mary Smith of Limehouse, East London (photographed by John
// Topham in 1931) used a pea shooter and dried peas; her daughter (Molly Moore) continued into WWII; knocker-uppers
// waited until the client showed himself; most worked through the night and slept by day, so needed no knocker-upper.
import { expr } from '../../ff2d/face.ts';
import { lerp, ss, type V3, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9 } from '../engine9.ts';
import { chip, wt } from '../ui9.ts';
import { pose, act, at, hsh, walk, dispatcher, bigTitle, type Shot } from '../common9.ts';

const FILM = 'knock';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const MARY: T7Look = { skin: '#f0c8a8', hair: '#8a8a88', hairStyle: 'bun', nose: 'round', head: { w: 1.05, h: .98, cheek: 1.1, jaw: 1.05 }, top: '#4a3a5a', topKind: 'coat', trim: '#7a2a3a', inner: '#e8dcc8', pants: '#2a2430', boots: '#1a1410', skirt: true, hat: 'bonnet', hatColor: '#2a2430', eyes: '#4a5a7a', build: 1.12, belly: .4, apron: '#d8ccb4' };
const MOLLY: T7Look = { ...MARY, hair: '#5a3a22', hat: 'none', top: '#3a5a4a', trim: '#c8a050', head: { w: .98, h: 1.0 }, build: 1.0, belly: 0, apron: undefined };
const SLEEPER: T7Look = { skin: '#eab595', hair: '#3a2a1e', hairStyle: 'curly', nose: 'long', head: { w: .96, h: 1.04, jaw: 1.06 }, top: '#e8e2d4', topKind: 'shirt', inner: '#f2ede2', pants: '#3a3a42', boots: '#2a1e14', beard: 'stache', beardColor: '#3a2a1e', eyes: '#3a5a4a' };
const WORKERS: T7Look[] = [
  { skin: '#e2b48e', hair: '#5a3a22', hairStyle: 'short', nose: 'round', top: '#4a4a3a', topKind: 'jacket', inner: '#d8d0c0', pants: '#3a3a3a', boots: '#1e1814', hat: 'flatcap', hatColor: '#3a3a3a' },
  { skin: '#f0c8a8', hair: '#2a1e16', hairStyle: 'side', nose: 'hook', top: '#3a4a5a', topKind: 'overalls', inner: '#c8d4e0', pants: '#3a4a6a', boots: '#2a1e14', hat: 'flatcap', hatColor: '#4a3a2a', beard: 'stache', beardColor: '#2a1e16' }];

type Base = Partial<Frame9>;
const DAWN_SKY = { top: '#26285e', mid: '#7a5a9a', bot: '#ffa878', sun: [.92, .12, .2] as V3, sunC: '#ffc890', clouds: .55, cloudC: '#c88aa0' };
const STREET: Base = { set: 'street', sky: DAWN_SKY, sun: { dir: [.92, .2, .25], color: '#ffb070', i: 1.7, focus: [0, 0, 0], size: 30 }, hemi: { sky: '#8a7ab8', ground: '#5a3a3a', i: .95 }, fill: { color: '#c8b8ff', i: .25 },
  fog: { color: '#a88aa8', density: .012 }, dust: { box: [[-8, .5, -5], [8, 6, 5]], i: .35 },
  lights: [-30, -18, -6, 6, 18].map(x => ({ p: [x, 3.6, -3.75] as V3, c: [1, .72, .4] as [number, number, number], i: 2.4, d: 9 })),
  grade: { ao: .8, aoRadius: .5, aoTint: [.42, .32, .62], sat: 1.22, contrast: 1.07, lift: [.045, .03, .075], gain: [1.06, .99, .94], bloom: .32, bloomTh: 1.25, vignette: .24 } };
const BED: Base = { set: 'bedroom', sun: { dir: [-.2, .35, 1], color: '#ffb890', i: .9, focus: [0, 1, 0], size: 5 }, hemi: { sky: '#9a8ac8', ground: '#5a3a28', i: .95 }, fill: { color: '#c8b0ff', i: .35 }, bg: '#120c14',
  beams: [{ p: [-.6, 1.6, 2.0], dir: [.1, -.35, -1], w: 1.0, h: 1.3, len: 3.5, c: [1, .8, .65], i: .7 }], dust: { box: [[-2, .3, -2], [2, 2.5, 2]], i: .55 },
  lights: [{ p: [1.6, 1.15, -1.45], c: [1, .7, .38], i: 1.6, d: 3 }], fog: { color: '#2a1e28', density: .03 },
  grade: { ao: .85, aoRadius: .35, aoTint: [.42, .32, .6], sat: 1.15, contrast: 1.08, lift: [.045, .03, .07], gain: [1.05, 1.0, .95], bloom: .3, bloomTh: 1.25, vignette: .3 } };
const NOON: Base = { ...BED, sun: { dir: [-.2, .6, 1], color: '#fff4dc', i: 2.0, focus: [0, 1, 0], size: 5 }, hemi: { sky: '#f2e8d8', ground: '#7a5030', i: 1.2 }, beams: [{ p: [-.6, 1.6, 2.0], dir: [.15, -.5, -1], w: 1.0, h: 1.3, len: 3.5, c: [1, .96, .85], i: .8 }],
  lights: [], fog: { color: '#e8d8c0', density: .01 }, grade: { ...BED.grade, gain: [1.04, 1.02, .96], lift: [.03, .03, .04] } };

const WIN: V3 = [-4.2, 4.68, -5.0];          // the hero bedroom window (upper floor, north terrace)
const MP: V3 = [-3.6, 0, -2.6];               // Mary's spot in the road below it
const MOUTH: V3 = [MP[0], 1.62, MP[2]];
/** a pea in flight from her pea shooter to the window glass (parabola), plus the tiny burst when it hits */
function pea(t: number, t0: number, dur = .55, seed = 0): Sprite[] {
  const u = (t - t0) / dur; if (u < 0 || u > 1.35) return [];
  if (u <= 1) {
    const p: V3 = [lerp(MOUTH[0], WIN[0] + (hsh(seed) - .5) * .5, u), lerp(MOUTH[1], WIN[1] + (hsh(seed + 1) - .5) * .4, u) + Math.sin(u * Math.PI) * .5, lerp(MOUTH[2], WIN[2] + .12, u)];
    return [{ p, s: .07, rot: 0, c: [.55, 1.1, .35], a: 1, kind: 2, seed: .1, age: 0 }];
  }
  const k = (u - 1) / .35; return [{ p: [WIN[0], WIN[1], WIN[2] + .14], s: .12 + k * .3, rot: 0, c: [1.4, 1.3, 1.0], a: 1 - k, kind: 2, seed: .2, age: 0 }];
}
const shooter = (t: number, aim = 1, f = expr('determined')) => act('mary', MARY, MP, pose({ turn: -.25, back: .55, headLift: .55 * aim, handA: [-.15, -3.55 * aim - 1.6 * (1 - aim)], handB: [.1, -3.7 * aim - 1.6 * (1 - aim)], shapeA: 'grip', shapeB: 'grip', lean: -.08 }, t, .3), f, t, { res: 1500 });

function timeline(): Shot[] {
  const T = { paying: w('paying', 1, 5.4), before: w('before', 1, 7.2), human: w('human', 1, 10.4), mary: w('mary', 1, 14.3), see: w('see', 1, 17.3), pea2: w('pea', 2, 20.4), until: w('until', 1, 23.6),
    customers: w('customers', 1, 27.0), whole: w('whole', 1, 29.6), daughter: w('daughter', 1, 32.6), who: w('who', 1, 38.0), nobody: w('nobody', 1, 39.6), most: w('most', 1, 40.6), slept: w('slept', 1, 43.4) };
  const END = Math.max(T.slept + 2.4, 40);
  return [
    // S1 — over her shoulder in the dawn street: she puffs, the pea arcs up and the camera rides it to the window
    { t0: 0, t1: T.paying - .3, f: (t) => {
      const tp = .9; const u = at(t, tp, tp + .55);
      const c = t < tp ? rig([{ t: 0, pos: [-2.4, 1.2, 0.2], look: [-4.0, 3.2, -4.8], fov: 46 }, { t: tp, pos: [-2.8, 1.45, -.6], look: [-4.1, 3.6, -4.9], fov: 44 }], t)
        : { pos: [lerp(-2.8, -3.9, ease.inOut(u)), lerp(1.45, 4.3, ease.inOut(u)), lerp(-.6, -3.6, ease.inOut(u))] as V3, look: [WIN[0], WIN[1], WIN[2]] as V3, fov: lerp(44, 34, u) };
      const S = [...pea(t, tp, .55, 1), ...pea(t, 2.4, .5, 2), ...pea(t, 3.6, .5, 3)];
      return { ...STREET, cam: c, sprites: S, actors: [shooter(t, ss(.2, .6, t))], overlay: chip('4 A.M. • EAST LONDON', 210, ss(.4, .8, t), '#ff9a5a') };
    } },
    // S2 — "...and he's PAYING her!": inside — the sleeper bolts upright; the window rattles
    { t0: T.paying - .3, t1: T.before, f: (t, k) => {
      const c = rig([{ t: T.paying - .3, pos: [.9, 1.35, .9], look: [-.4, .75, -1.4], fov: 40 }, { t: T.before, pos: [.55, 1.15, .2], look: [-.35, .85, -1.5], fov: 34 }], t);
      const up = ss(.08, .3, k);
      return { ...BED, cam: c, actors: [act('sl', SLEEPER, [-.3, lerp(.05, .32, up), -1.55], pose({ turn: .1, crouch: 1.0, kneeUp: true, handA: [-.7, -2.2 - up], handB: [.7, -2.2 - up], shapeA: 'open', shapeB: 'open' }, t, .2), up < .5 ? expr('tired') : expr('shocked', 'angry', ss(.6, 1, k)), t, { res: 1700 })],
        overlay: chip('💸 HE PAYS HER', 210, ss(.35, .5, k), '#7dff9a') };
    } },
    // S3 — "Before cheap alarm clocks, British workers hired a knocker-upper": crane up the terrace at dawn
    { t0: T.before, t1: T.human, f: (t) => {
      const c = rig([{ t: T.before, pos: [8, 1.6, 1.5], look: [-6, 4.5, -5], fov: 46 }, { t: T.human, pos: [10, 9, 6], look: [-10, 3, -4], fov: 46 }], t, { easing: ease.inOut });
      const S: Sprite[] = []; for (let i = 0; i < 6; i++) { const tt = T.before + .5 + i * .45; if (t > tt) S.push({ p: [-24 + i * 5.6 + 1.4, 4.68, -4.85], s: .9, rot: 0, c: [1.4, .9, .4], a: .55 * ss(tt, tt + .3, t), kind: 2, seed: .3, age: 0 }); }
      return { ...STREET, cam: c, sprites: S, actors: [act('w1', WORKERS[0], [6, 0, -3.8], pose({ turn: -.6, ...walk(t, .8) }, t, .3), expr('tired'), t), act('w2', WORKERS[1], [4.4, 0, 3.9], pose({ turn: -.5, ...walk(t + .3, .8) }, t, .3, 5), expr('tired', 'neutral', .4), t)],
        overlay: chip('⏰ NO CHEAP ALARM CLOCKS', 210, ss(T.before + .3, T.before + .7, t), '#ff7a59') };
    } },
    // S4 — "A human alarm clock, walking the dark streets with a long pole, or in Mary Smith's case, a pea shooter":
    // low tracking shot beside her as she walks the cobbles, lamps sliding past in the foreground
    { t0: T.human, t1: T.see, f: (t) => {
      const u = at(t, T.human, T.see); const x = lerp(-16, -6, u); const c = { pos: [x + 2.0, .9, 2.4] as V3, look: [x - .2, 1.4, -2.0] as V3, fov: 40 };
      return { ...STREET, cam: c, actors: [act('mary', MARY, [x, 0, -2.4], pose({ turn: -.75, ...walk(t, .75), handB: [.5, -2.6], shapeB: 'grip' }, t, .3), expr('confident', 'smug', ss(T.mary, T.mary + .5, t)), t, { res: 1500 })],
        overlay: chip(t < T.mary ? 'THE KNOCKER-UPPER' : 'MARY SMITH • PEA SHOOTER', 210, ss(T.human + .2, T.human + .6, t)) };
    } },
    // S5 — "You see, it worked like a snooze button you can't switch off. Pea after pea rattles the glass": inside at
    // the window, the panes ping again and again; he burrows under the quilt, then gives up
    { t0: T.see, t1: T.until, f: (t, k) => {
      const c = rig([{ t: T.see, pos: [.6, 1.55, -.2], look: [-.6, 1.4, 2.0], fov: 42 }, { t: T.until, pos: [.2, 1.2, .6], look: [-.35, .9, -1.4], fov: 38 }], t, { easing: ease.inOut });
      const S: Sprite[] = []; for (let i = 0; i < 14; i++) { const tt = T.see + .3 + i * .42; const a = ss(tt, tt + .05, t) * (1 - ss(tt + .1, tt + .35, t)); if (a > 0) S.push({ p: [-.6 + (hsh(i) - .5) * .7, 1.6 + (hsh(i + 3) - .5) * .9, 1.92], s: .18, rot: 0, c: [1.5, 1.4, 1.1], a, kind: 2, seed: .2, age: 0 }); }
      const hide = ss(.25, .4, k) * (1 - ss(.75, .9, k));
      return { ...BED, cam: c, sprites: S, actors: [act('sl', SLEEPER, [-.3, lerp(.05, -.25, hide), -1.55], pose({ turn: .1, crouch: 1.0, kneeUp: true, handA: [-.6, -2.6], handB: [.6, -2.6], shapeA: 'open', shapeB: 'open' }, t, .2), k < .8 ? expr('annoyed', 'tired', .5) : expr('exhausted'), t, { res: 1600 })],
        overlay: chip('TAP! TAP! TAP!', 210, ss(T.see + .4, T.see + .7, t), '#ffd23f') };
    } },
    // S6 — "...and she doesn't move on until somebody comes to the window": he throws up the sash; she nods and moves on
    { t0: T.until, t1: T.customers, f: (t, k) => {
      const c = rig([{ t: T.until, pos: [-2.6, 1.5, 1.4], look: [-4.0, 3.6, -5], fov: 40 }, { t: T.customers, pos: [-3.0, 2.0, .6], look: [-4.1, 3.9, -5], fov: 36 }], t);
      const show = ss(.25, .4, k);
      return { ...STREET, cam: c, actors: [shooter(t, 1 - ss(.45, .6, k), expr('confident', 'happy', ss(.5, .7, k))),
        act('sl', SLEEPER, [WIN[0], lerp(2.7, 3.45, show), WIN[2] + .25], pose({ turn: .15, handB: [.8, -3.1], shapeB: 'fist', handA: [-.6, -2.2] }, t, .2), expr('angry', 'tired', .5), t, { res: 1300, scale: .95, shadow: false })],
        overlay: chip('✓ CUSTOMER AWAKE', 210, ss(.45, .6, k), '#7dff9a') };
    } },
    // S7 — "Her customers paid a few pence a week, and she woke whole streets... before sunrise": crane up high over the
    // terraces as window after window lights up down the street
    { t0: T.customers, t1: T.daughter, f: (t) => {
      const c = rig([{ t: T.customers, pos: [-12, 6, 6], look: [0, 2, -4], fov: 46 }, { t: T.daughter, pos: [-22, 20, 12], look: [6, 1, -3], fov: 48 }], t, { easing: ease.inOut });
      const S: Sprite[] = []; for (let i = 0; i < 22; i++) { const tt = T.whole - .4 + i * .18; const side = i % 2 ? 1 : -1; S.push({ p: [-36 + (i >> 1) * 5.6 + 1.4, 4.68, side * 4.85], s: .9, rot: 0, c: [1.5, .95, .45], a: .7 * ss(tt, tt + .25, t), kind: 2, seed: .3, age: 0 }); }
      return { ...STREET, cam: c, sprites: S, sun: { ...STREET.sun!, i: 1.7 + ss(T.whole, T.daughter, t) * .6 },
        overlay: chip(t < T.whole ? 'A FEW PENCE A WEEK' : 'WHOLE STREETS • BEFORE SUNRISE', 210, 1) };
    } },
    // S8 — "Her daughter Molly took over, and kept going into the Second World War": a younger woman, same pea shooter
    { t0: T.daughter, t1: T.who, f: (t) => {
      const c = rig([{ t: T.daughter, pos: [-2.0, 1.1, -.4], look: [-3.6, 1.7, -2.6], fov: 38 }, { t: T.who, pos: [-2.6, 1.3, -1.0], look: [-3.6, 2.2, -2.8], fov: 34 }], t);
      return { ...STREET, cam: c, sky: { ...DAWN_SKY, top: '#1a1a44', mid: '#4a3a6a' }, sprites: pea(t, T.daughter + 1.6, .55, 7),
        actors: [act('molly', MOLLY, MP, pose({ turn: -.3, back: .4, headLift: .5, handA: [-.15, -3.55], handB: [.1, -3.7], shapeA: 'grip', shapeB: 'grip' }, t, .3), expr('determined'), t, { res: 1500 })],
        overlay: chip('HER DAUGHTER • INTO WW2', 210, ss(T.daughter + .3, T.daughter + .7, t), '#7fd3ff') };
    } },
    // S9 — "So who woke up the knocker-upper? Usually NOBODY!": she freezes mid-aim and looks straight at us
    { t0: T.who, t1: T.most, f: (t) => {
      const c = rig([{ t: T.who, pos: [-3.0, 1.55, -.9], look: [-3.6, 1.55, -2.6], fov: 34 }, { t: T.most, pos: [-3.2, 1.55, -1.5], look: [-3.6, 1.55, -2.6], fov: 30 }], t);
      const nb = ss(T.nobody - .1, T.nobody + .2, t);
      return { ...STREET, cam: c, actors: [act('mary', MARY, MP, pose({ turn: .1, handB: [.6, -2.4], shapeB: 'grip', headTilt: -.15 + nb * .2 }, t, .3), nb < .5 ? expr('confused') : expr('smug', 'laugh', nb), t, { res: 1800 })],
        overlay: chip('WHO WOKE HER UP? 🤔', 210, ss(T.who, T.who + .3, t)) };
    } },
    // S10 — "Most of them stayed up all night working, then slept through the day": broad daylight; she snoozes in the
    // chair, pea shooter in her lap, while sunshine floods in; title lands
    { t0: T.most, t1: END, f: (t) => {
      const c = rig([{ t: T.most, pos: [-1.2, 1.4, 1.6], look: [1.3, .8, .4], fov: 40 }, { t: END, pos: [.0, 1.1, 1.3], look: [1.35, .85, .55], fov: 32 }], t, { easing: ease.inOut });
      const tt = ss(T.slept + .3, T.slept + .7, t);
      return { ...NOON, cam: c, actors: [act('mary', MARY, [1.35, .1, .55], pose({ turn: -.3, crouch: .55, kneeUp: true, headTilt: .35 + Math.sin(t * 1.6) * .04, handA: [-.3, -1.7], handB: [.3, -1.7] }, t, .2), expr('tired'), t, { res: 1600 })],
        overlay: (t < T.slept ? chip('NIGHT SHIFT → SLEEP ALL DAY', 210, ss(T.most + .3, T.most + .7, t), '#ffd23f') : '') + `<div style="position:absolute;left:640px;top:${640 - 20 * Math.sin(t * 2)}px;font-family:Inter;font-weight:900;font-size:90px;color:#fff;-webkit-text-stroke:7px #141018;paint-order:stroke fill;opacity:.9">Zzz</div>` + bigTitle('WHO WOKE THEM?', 'NOBODY.', tt) };
    } },
  ];
}
export const frameAt = dispatcher(FILM, timeline());
