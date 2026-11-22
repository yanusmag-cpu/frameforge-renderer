// YunoWorld v9 · "The Pigeon That Became a Flying Camera" (Julius Neubronner) — 9 directed shots, town/shop/studio.
// Verified (Deutsches Technikmuseum via Google Arts & Culture; Wikipedia "Pigeon photography" & "Julius Neubronner";
// Public Domain Review; Atlas Obscura): Neubronner, apothecary in Kronberg im Taunus, used carrier pigeons to deliver
// prescriptions/medicines (from 1903); in 1907 he built miniature cameras worn on a breast harness; a pneumatic timer — a
// rubber ball inflated through a hose before the flight — fired the shutter as the air escaped; the patent office first
// rejected the idea as impossible, then granted the patent (Dec 1908) after he supplied authenticated photographs; at the
// 1909 Dresden International Photographic Exhibition visitors watched the pigeons arrive and the photos were developed
// and sold as postcards; some photos show the pigeon's wingtips.
import { expr } from '../../ff2d/face.ts';
import { STAND } from '../../ff2d/rig.ts';
import { lerp, ss, clamp, type V3, type ActorState } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9, NodeOv } from '../engine9.ts';
import { chip, wt } from '../ui9.ts';
import { pigeonSvg, type PigeonState } from '../pigeon9.ts';
import { pose, act, at, hsh, dispatcher, bigTitle, type Shot } from '../common9.ts';

const FILM = 'pigcam';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const JN: T7Look = { skin: '#f0c8a8', hair: '#c8c4bc', hairStyle: 'side', nose: 'long', head: { w: .98, h: 1.06, jaw: 1.04 }, top: '#3a3a44', topKind: 'suit', inner: '#f4efe4', tie: '#2a2a32', pants: '#3a3a44', boots: '#121010', beard: 'full', beardColor: '#c8c4bc', glasses: true, eyes: '#4a6a8a' };
const CLERK: T7Look = { skin: '#eab595', hair: '#2a2018', hairStyle: 'swept', nose: 'hook', head: { w: .92, h: 1.1, jaw: 1.1 }, top: '#1e2a3a', topKind: 'suit', inner: '#f4efe4', tie: '#6a2a2a', pants: '#1e2a3a', boots: '#121010', beard: 'stache', beardColor: '#2a2018', glasses: true };
const CROWD: T7Look[] = [
  { skin: '#f0c8a8', hair: '#7a3a22', hairStyle: 'bun', nose: 'button', top: '#6a2a3a', topKind: 'dress', inner: '#f2e6d0', pants: '#6a2a3a', boots: '#2a1a14', skirt: true, hat: 'bonnet', hatColor: '#e8d8b8' },
  { skin: '#e2b48e', hair: '#1e1a16', hairStyle: 'short', nose: 'round', top: '#2f4a6a', topKind: 'coat', inner: '#e8e2d4', pants: '#2a2a32', boots: '#1e1814', hat: 'bowler', hatColor: '#24242a', beard: 'stache', beardColor: '#1e1a16' },
  { skin: '#f2cfb0', hair: '#c8a050', hairStyle: 'curly', nose: 'snub', top: '#3f6a4a', topKind: 'jacket', inner: '#f0ead8', pants: '#4a3a2a', boots: '#2a1e14', hat: 'boater', hatColor: '#e8d8a0' },
  { skin: '#d9a47e', hair: '#5a3a22', hairStyle: 'long', nose: 'button', top: '#5a4a8a', topKind: 'dress', inner: '#f2e6d0', pants: '#5a4a8a', boots: '#2a1a14', skirt: true }];
const PG = .172;
const bird = (id: string, pos: V3, s: PigeonState, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: STAND, face: expr('neutral'), pos, t, svgOnly: pigeonSvg({ id, t, ...s }), scale: PG, res: 1100, contact: .5, ...o });
const flapK = (t: number, rate = 7) => Math.sin(t * rate * 6.283) * .5 + .5;

type Base = Partial<Frame9>;
const GOLD = { top: '#3f7ac8', mid: '#9fc8ec', bot: '#ffd8a0', sun: [-.7, .32, -.5] as V3, sunC: '#fff0c0', clouds: .55 };
const TOWN: Base = { set: 'town', sky: GOLD, sun: { dir: [-.7, .4, -.5], color: '#ffd8a0', i: 2.2, focus: [0, 0, 0], size: 40 }, hemi: { sky: '#a8c8ec', ground: '#6a7a4a', i: .8 }, fill: { color: '#fff0dd', i: .12 },
  fog: { color: '#d8dcec', density: .0035 }, wind: .8, grade: { ao: .8, aoRadius: .6, aoTint: [.4, .38, .62], sat: 1.22, contrast: 1.06, lift: [.025, .025, .055], gain: [1.05, 1.0, .94], bloom: .22, bloomTh: 1.5, vignette: .22 } };
const SHOP: Base = { set: 'shop', sun: { dir: [.1, .5, 1], color: '#ffe8c0', i: 1.6, focus: [0, 1, 0], size: 6 }, hemi: { sky: '#f2e8d8', ground: '#3f5a4a', i: 1.1 }, fill: { color: '#ffe8cc', i: .45 }, bg: '#140e0a',
  beams: [{ p: [-1.5, 1.8, 2.5], dir: [.1, -.45, -1], w: 1.6, h: 2.0, len: 5, c: [1, .92, .75], i: .65 }], dust: { box: [[-2.8, .3, -2.4], [2.8, 3, 2.4]], i: .6 },
  lights: [{ p: [0, 2.4, 0], c: [1, .8, .5], i: 2.2, d: 5 }], fog: { color: '#3a2a1a', density: .02 },
  grade: { ao: .85, aoRadius: .4, aoTint: [.4, .34, .55], sat: 1.15, contrast: 1.07, lift: [.035, .03, .05], gain: [1.05, 1.0, .93], bloom: .3, bloomTh: 1.3, vignette: .28 } };
const STUDIO: Base = { set: 'none', sky: { top: '#16243a', mid: '#2a4a6a', bot: '#c88a5a', clouds: 0, sun: [.4, .8, .5], sunC: '#000000' }, sun: { dir: [.4, .8, .6], color: '#fff0dc', i: 2.2, focus: [0, .5, 0], size: 2 },
  hemi: { sky: '#c8dcf8', ground: '#5a4a48', i: 1.5 }, fill: { color: '#ffe0c0', i: .9 }, fog: { color: '#16243a', density: .02 }, lights: [{ p: [.6, 1.2, 1.0], c: [1, .85, .6], i: 3.2, d: 3 }, { p: [-1, .4, -.8], c: [.5, .8, 1], i: 2.0, d: 3 }],
  grade: { ao: .6, aoRadius: .15, aoTint: [.32, .3, .55], sat: 1.15, contrast: 1.08, lift: [.03, .03, .07], gain: [1.03, 1.0, .97], bloom: .3, bloomTh: 1.3, vignette: .3 } };
const PHOTO: Base = { ...TOWN, grade: { ...TOWN.grade, sat: .18, contrast: 1.15, gain: [1.12, 1.0, .8], lift: [.06, .045, .02], vignette: .55, bloom: .1 } };

const camN = (ball = 1, shut = 0): Record<string, NodeOv> => ({ ball: { scale: .35 + .65 * ball }, shutter: { pos: [0, 0, 0], rot: [shut * 1.4, 0, 0] } });
/** the pigeon with the camera on its chest (prop at the bird's breast, a touch larger than life so it reads) */
const rigged = (id: string, pos: V3, s: PigeonState, t: number, o: Partial<ActorState> = {}, camScale = 1.1, ball = 1): { a: ActorState; p: { id: string; pos: V3; scale: number; nodes: Record<string, NodeOv> } } =>
  ({ a: bird(id, pos, s, t, o), p: { id: 'camera', pos: [pos[0] + .02, pos[1] + .12, pos[2] + .07], scale: camScale, nodes: camN(ball) } });

function timeline(): Shot[] {
  const T = { fly: w('fly', 1, 4.6), julius: w('julius', 1, 5.7), medicine: w('medicine', 1, 11.0), built: w('built', 1, 12.3), see: w('see', 1, 15.2), leaked: w('leaked', 1, 19.4), click: w('click', 1, 23.4),
    high: w('high', 1, 25.2), patent: w('patent', 1, 27.2), photos: w('photos', 1, 30.0), dresden: w('dresden', 1, 33.4), postcards: w('postcards', 1, 38.0), wingtips: w('wingtips', 1, 41.6) };
  const END = Math.max(T.wingtips + 2.0, 38);
  const HAND: V3 = [-.35, 1.18, 3.2];
  return [
    // S1 — in the square: he buckles the camera on the pigeon in his hands (push in on the camera), then lets it go
    { t0: 0, t1: T.julius, f: (t) => {
      const go = ss(T.fly - .1, T.fly + .3, t); const up = Math.max(0, t - T.fly);
      const bp: V3 = [HAND[0] + up * .4, HAND[1] + up * up * 1.6 + up * 1.2, HAND[2] - up * .6];
      const c = t < T.fly ? rig([{ t: 0, pos: [.9, 1.45, 5.2], look: [-.2, 1.25, 3.1], fov: 40 }, { t: T.fly, pos: [.45, 1.4, 4.45], look: [-.3, 1.3, 3.2], fov: 36 }], t, { easing: ease.inOut })
        : { pos: [.45, 1.4 + up * .5, 4.45] as V3, look: bp, fov: 38 };
      const R = rigged('pg', bp, { mood: go > .5 ? 'happy' : 'confused', flap: go > 0 ? flapK(t) : 0, gx: -.4, t }, t, { contact: go > 0 ? 0 : .5, shadow: go < .5 });
      return { ...TOWN, cam: c, props: [R.p], actors: [act('jn', JN, [0, 0, 3.0], pose({ turn: -.25, handA: [-.45, -2.15 + go * -1.2], handB: [-.1, -2.1 + go * -1.0], shapeA: go > .5 ? 'open' : 'hold', shapeB: go > .5 ? 'open' : 'hold', headTilt: .12 }, t, .3), go > .5 ? expr('excited', 'happy', .6) : expr('focused', 'smirk', .3), t, { res: 1700 }), R.a],
        overlay: chip('📷 + 🐦', 210, ss(.6, 1.0, t)) };
    } },
    // S2 — "Julius Neubronner was a pharmacist... his pigeons already delivered his medicine": the apothecary; a pigeon
    // lands on the sill with a tiny parcel; he beams
    { t0: T.julius, t1: T.built, f: (t) => {
      const c = rig([{ t: T.julius, pos: [-1.6, 1.6, 1.8], look: [0, 1.25, -.6], fov: 42 }, { t: T.built, pos: [-.8, 1.45, 1.1], look: [-.3, 1.25, -.4], fov: 36 }], t);
      const land = ss(T.medicine - .8, T.medicine - .1, t);
      return { ...SHOP, cam: c, actors: [act('jn', JN, [0, 0, -1.2], pose({ turn: .2, handB: [.7, -2.2], shapeB: 'hold' }, t, .3), expr('happy'), t, { res: 1500 }),
        bird('pg', [lerp(-1.6, -1.0, land), lerp(2.4, 1.05, land), lerp(2.9, -.55, land)], { mood: 'keen', flap: land < 1 ? flapK(t) : 0, t }, t, { contact: land > .95 ? .5 : 0 })],
        overlay: chip(t < T.medicine - .8 ? 'KRONBERG, GERMANY • APOTHECARY' : '🐦💊 PIGEON DELIVERIES', 210, ss(T.julius + .2, T.julius + .6, t)) };
    } },
    // S3 — "So he built a camera small enough for a bird to wear": macro orbit of the hero camera on a dark bench
    { t0: T.built, t1: T.see, f: (t, k) => {
      const a = lerp(-.9, .7, ease.inOut(k)); const c = { pos: [Math.sin(a) * .8, .42 + k * .15, Math.cos(a) * .8] as V3, look: [0, .21, 0] as V3, fov: 34 };
      return { ...STUDIO, cam: c, props: [{ id: 'camera', pos: [0, 0, 0], scale: 3.0, nodes: camN() }], overlay: chip('TWIN LENSES • BREAST HARNESS', 210, ss(T.built + .4, T.built + .8, t), '#7fd3ff') };
    } },
    // S4 — "You see, a tiny rubber ball was pumped full of air before take-off. As it slowly leaked, it worked like a
    // timer, and when it went flat, CLICK! The shutter fired": the ball swells, shrinks, the shutter flips, flash
    { t0: T.see, t1: T.high, f: (t) => {
      const inf = ss(T.see + .6, T.see + 1.6, t); const leak = at(t, T.leaked - .2, T.click); const ball = inf * (1 - leak * .92);
      const shut = ss(T.click - .05, T.click + .05, t) * (1 - ss(T.click + .25, T.click + .4, t));
      const c = rig([{ t: T.see, pos: [-.7, .75, -.75], look: [0, .29, -.15], fov: 32 }, { t: T.click - .6, pos: [-.6, .55, .55], look: [0, .22, 0], fov: 32 }, { t: T.high, pos: [.08, .25, .8], look: [0, .14, .09], fov: 30 }], t, { easing: ease.inOut });
      const pct = Math.round(ball * 100);
      return { ...STUDIO, cam: c, props: [{ id: 'camera', pos: [0, 0, 0], scale: 3.0, nodes: { ball: { scale: .3 + .7 * ball }, shutter: { rot: [shut * 1.4, 0, 0] } } }], grade: { ...STUDIO.grade, flash: shut * .55 },
        overlay: chip(t < T.leaked - .2 ? '① PUMP THE BALL FULL OF AIR' : t < T.click ? `② AIR LEAKS OUT… ${pct}%` : '③ FLAT → CLICK! 📸', 210, 1, t < T.click ? '#ffd23f' : '#7dff9a') };
    } },
    // S5 — "...high above the rooftops": the signature tracking shot, chasing the pigeon over the town at roof height
    { t0: T.high, t1: T.patent, f: (t) => {
      const u = at(t, T.high, T.patent); const bp: V3 = [lerp(-30, 18, u), 14 + Math.sin(u * 3) * 1.2, lerp(30, -14, u)];
      const c = { pos: [bp[0] - 1.6, bp[1] + .55, bp[2] + 1.9] as V3, look: [bp[0] + 1.5, bp[1] - 1.8, bp[2] - 2.2] as V3, fov: 44 };
      const R = rigged('pg', bp, { mood: 'keen', flap: flapK(t, 5), gx: .4, t }, t, { contact: 0, shadow: false }, 1.4, .25);
      return { ...TOWN, cam: c, props: [R.p], actors: [R.a], overlay: chip('HIGH ABOVE KRONBERG', 210, ss(T.high + .2, T.high + .6, t)) };
    } },
    // S6 — "The patent office said it was impossible. So he sent them the photos, and got his patent.": a clerk scoffs,
    // the photographs slap down, his face drops; APPROVED
    { t0: T.patent, t1: T.dresden, f: (t) => {
      const c = rig([{ t: T.patent, pos: [.5, 1.6, 1.6], look: [0, 1.45, 0], fov: 36 }, { t: T.dresden, pos: [.2, 1.6, .9], look: [0, 1.55, 0], fov: 30 }], t);
      const ph = ss(T.photos - .1, T.photos + .2, t); const ok = ss(T.photos + 1.0, T.photos + 1.3, t);
      const photos = ph > .01 ? `<div style="position:absolute;left:${150 + 40 * (1 - ph)}px;top:${1400 + 300 * (1 - ph)}px;transform:rotate(-8deg);opacity:${ph};width:330px;height:230px;background:linear-gradient(160deg,#d8c8a0,#8a7a5a);border:14px solid #f4ecd8;box-shadow:0 12px 30px rgba(0,0,0,.4)"></div><div style="position:absolute;left:${560 - 40 * (1 - ph)}px;top:${1420 + 300 * (1 - ph)}px;transform:rotate(6deg);opacity:${ph};width:330px;height:230px;background:linear-gradient(200deg,#c8b890,#6a5a40);border:14px solid #f4ecd8;box-shadow:0 12px 30px rgba(0,0,0,.4)"></div>` : '';
      return { ...STUDIO, cam: c, actors: [act('clerk', CLERK, [0, 0, 0], pose({ turn: .05, handA: [-.7, -2.4 + ph * .4], handB: [.8, -2.6], shapeB: ph < .5 ? 'point' : 'open' }, t, .3), ph < .5 ? expr('smug', 'laugh', .5) : ok < .5 ? expr('shocked') : expr('disappointment', 'confused', .4), t, { res: 1800 })],
        overlay: photos + (ph < .5 ? chip('"IMPOSSIBLE!"', 210, ss(T.patent + .2, T.patent + .5, t), '#ff7a59') : chip('✓ PATENT GRANTED • 1908', 210, ok, '#7dff9a')) };
    } },
    // S7 — "At a big exhibition in Dresden, crowds watched the pigeons land": the crowd in the square looks up as birds
    // flutter down onto the loft board
    { t0: T.dresden, t1: T.postcards, f: (t) => {
      const c = rig([{ t: T.dresden, pos: [4.5, 1.5, 4.5], look: [8, 3.6, -4], fov: 44 }, { t: T.postcards, pos: [6.0, 2.6, 2.4], look: [8, 4.6, -3.6], fov: 38 }], t, { easing: ease.inOut });
      const A: ActorState[] = [];
      for (let i = 0; i < 7; i++) A.push(act(`c${i}`, CROWD[i % 4], [5.6 + (i % 4) * 1.0 + hsh(i) * .4, 0, -.4 - Math.floor(i / 4) * 1.1], pose({ turn: .3, back: .7, headLift: .6, handB: i % 3 === 0 ? [.7, -3.0] : [.5, -1.62], shapeB: 'point' }, t, .3, i), expr('amazed'), t, { seed: i + 10, res: 900 }));
      for (let i = 0; i < 3; i++) { const u = clamp((t - T.dresden - .4 - i * .7) / 1.6); A.push(bird(`b${i}`, [lerp(4 + i * 3, 7.4 + i * .6, u), lerp(10, 4.66, u), lerp(4, -3.55, u)], { mood: 'happy', flap: u < 1 ? flapK(t + i) : 0, t }, t, { contact: 0 })); }
      return { ...TOWN, cam: c, actors: A, overlay: chip('DRESDEN EXHIBITION • 1909', 210, ss(T.dresden + .2, T.dresden + .6, t)) };
    } },
    // S8 — "...their aerial photos were turned into postcards on the spot. Some even show the pigeon's own wingtips!":
    // we become the photograph: a sepia bird's-eye view straight down over the rooftops, framed as a postcard, the
    // pigeon's wingtips poking into the corners; title lands
    { t0: T.postcards, t1: END, f: (t, k) => {
      const c = { pos: [4 + k * 3, 42 - k * 4, 8 - k * 2] as V3, look: [4 + k * 3, 0, -2 - k * 2] as V3, fov: 46 };
      const wt2 = ss(T.wingtips - .2, T.wingtips + .2, t); const tt = ss(T.wingtips + .7, T.wingtips + 1.1, t);
      const wing = (side: number) => `<svg style="position:absolute;${side < 0 ? 'left' : 'right'}:40px;top:420px;opacity:${.25 + .75 * wt2}" width="300" height="820" viewBox="0 0 300 820"><path d="M${side < 0 ? '0 0 C 220 120 260 420 120 820 L 0 820 Z' : '300 0 C 80 120 40 420 180 820 L 300 820 Z'}" fill="#2a2018" opacity=".8"/></svg>`;
      return { ...PHOTO, cam: c, overlay: `<div style="position:absolute;left:40px;top:300px;width:1000px;height:1260px;border:26px solid #f4ecd8;box-shadow:0 0 0 4px #c8b890 inset"></div>` + wing(-1) + wing(1) +
        chip(t < T.wingtips - .2 ? '📮 SOLD AS POSTCARDS' : 'THE PIGEON\'S OWN WINGTIPS!', 210, 1, '#ffd23f') + bigTitle('PIGEON', 'PHOTOGRAPHERS', tt) };
    } },
  ];
}
export const frameAt = dispatcher(FILM, timeline());
