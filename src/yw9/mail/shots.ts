// YunoWorld v9 · "They Mailed a KID With Stamps on Her Coat" (US Parcel Post) — 60 s, 14 directed shots across five sets.
// Verified (frameforge-studio yw-v9/FACT_CHECK.md): parcel post began 1 Jan 1913; Jan 1913, Batavia, Ohio: a baby boy was
// carried by rural carrier to his grandmother's house about a mile away for 15 cents (insured for $50); 19 Feb 1914 May
// Pierstorff, nearly 5, travelled from Grangeville to her grandparents in Lewiston, Idaho (73 mi) with 53 cents of postage on
// her coat, in the mail car, in the care of the clerk, her mother's cousin Leonard Mochel; she was under the 50 lb limit;
// Postmaster General Albert Burleson then banned mailing people; in 1915 Edna Neff, 6, rode a mail train ~720 mi from
// Pensacola, Florida to Christiansburg, Virginia for 15 cents.
import { STAND, idle, type Pose } from '../../ff2d/rig.ts';
import { expr } from '../../ff2d/face.ts';
import { clamp, lerp, ss, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9 } from '../engine9.ts';
import { captions, chip, wt } from '../ui9.ts';

export const FPS = 30, FRAMES = 1800;
const FILM = 'mail';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const MAY: T7Look = { skin: '#f4d2b8', hair: '#8a5a30', hairStyle: 'long', nose: 'button', head: { w: 1.08, h: 1.0, cheek: 1.1 }, top: '#a8402e', topKind: 'coat', trim: '#e8dcc0', buttons: '#e8dcc0', inner: '#f2ead8', pants: '#5a3a2a', boots: '#2a1a12', skirt: true, hat: 'bonnet', hatColor: '#e8dcc0', eyes: '#4a6a8a' };
const MOM: T7Look = { skin: '#f0c8a8', hair: '#6a4024', hairStyle: 'bun', nose: 'button', top: '#3f5a6a', topKind: 'dress', inner: '#f2e6d0', pants: '#3f5a6a', boots: '#2a1a14', skirt: true, apron: '#efe6d2' };
const DAD: T7Look = { skin: '#e2b48e', hair: '#5a3a22', hairStyle: 'side', nose: 'long', top: '#5a4a32', topKind: 'overalls', inner: '#c8d4e0', pants: '#3a4a6a', boots: '#2a1e14', hat: 'flatcap', hatColor: '#4a3a2a', beard: 'stache', beardColor: '#5a3a22', sleeves: 'rolled' };
const CLERK: T7Look = { skin: '#f0c8a8', hair: '#3a2a1e', hairStyle: 'short', nose: 'round', top: '#2a3040', topKind: 'waistcoat', inner: '#f2ede2', tie: '#1a1a1a', pants: '#2a2a32', boots: '#121010', hat: 'driver', hatColor: '#2a3040', sleeves: 'rolled', beard: 'stache', beardColor: '#3a2a1e' };
const CARRIER: T7Look = { skin: '#e2b48e', hair: '#6a5038', hairStyle: 'short', nose: 'hook', top: '#4a5a6a', topKind: 'coat', buttons: '#c9a24a', inner: '#e8e2d4', pants: '#3a4450', boots: '#1e1814', hat: 'driver', hatColor: '#3a4450', beard: 'full', beardColor: '#6a5038' };
const BABY: T7Look = { skin: '#f6d8c0', hair: '#c8a070', hairStyle: 'bald', nose: 'button', head: { w: 1.2, h: 1.1, cheek: 1.2 }, top: '#e8c8a0', topKind: 'dress', inner: '#f2ece0', pants: '#e8c8a0', boots: '#e8c8a0', skirt: true };
const PMG: T7Look = { skin: '#eab595', hair: '#d8d4cc', hairStyle: 'swept', nose: 'long', head: { w: .95, h: 1.05, jaw: 1.05 }, top: '#1e1e24', topKind: 'suit', inner: '#f4efe4', tie: '#6a2a2a', pants: '#1e1e24', boots: '#121010', glasses: true, eyes: '#3a4a5a' };
const EDNA: T7Look = { ...MAY, hair: '#d0a050', hairStyle: 'curly', top: '#3f6a8a', hat: 'none' };
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, t7: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos, t, res: 1300, seed: id.length * 7 + 1, rim: '#ffe0b0', rimSide: 1, ...o });
const kid = (id: string, look: T7Look, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}) => act(id, look, pos, p, face, t, { scale: .6, res: 1500, ...o });
const at = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const hsh = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const walk = (t: number, sp = 1) => { const p = t * 5.2 * sp; return { footA: [-.2 + Math.sin(p) * .22, -.08 + Math.max(0, Math.cos(p)) * .1] as [number, number], footB: [.2 - Math.sin(p) * .22, -.08 + Math.max(0, -Math.cos(p)) * .1] as [number, number], crouch: Math.abs(Math.sin(p)) * .04 }; };

type Base = Partial<Frame9>;
const SKY = { top: '#4a86c8', mid: '#a6cbea', bot: '#f2dcb8', sun: [.5, .42, .6] as V3, sunC: '#fff0c8', clouds: .65 };
const FARM: Base = { set: 'farm', sky: SKY, sun: { dir: [.5, .42, .6], color: '#ffe0b0', i: 2.2, focus: [0, 0, 0], size: 22 }, hemi: { sky: '#a8ccee', ground: '#5f8a3c', i: .78 }, fill: { color: '#fff0dd', i: .12 },
  fog: { color: '#c6daee', density: .004 }, wind: .7, grade: { ao: .8, aoRadius: .55, aoTint: [.38, .42, .62], sat: 1.2, contrast: 1.06, lift: [.025, .025, .06], gain: [1.04, 1.0, .95], bloom: .2, bloomTh: 1.6, vignette: .22 } };
const LINE: Base = { ...FARM, set: 'line', sun: { dir: [.4, .38, .7], color: '#ffdcaa', i: 2.2, focus: [0, 0, 0], size: 40 }, fog: { color: '#c4d6ea', density: .0035 } };
const DUSK: Base = { ...LINE, sky: { top: '#3a4a8a', mid: '#d88a6a', bot: '#ffd08a', sun: [-.8, .12, -.4], sunC: '#ffc070', clouds: .5, cloudC: '#e8a080' }, sun: { dir: [-.8, .18, -.4], color: '#ffb070', i: 2.0, focus: [0, 0, 0], size: 60 },
  hemi: { sky: '#d8a0a0', ground: '#4a5a3a', i: .7 }, fog: { color: '#e8b090', density: .004 }, grade: { ...FARM.grade, gain: [1.08, .98, .9], lift: [.04, .025, .06], bloom: .3, bloomTh: 1.3 } };
const CAR: Base = { set: 'mailcar', sun: { dir: [.1, .5, -1], color: '#fff2dc', i: 1.2, focus: [0, 1.2, 0], size: 6 }, hemi: { sky: '#f2e2c8', ground: '#6a4426', i: 1.2 }, fill: { color: '#ffe2c0', i: .5 }, bg: '#1a120c',
  beams: [-4, 0, 4].map(x => ({ p: [x, 1.9, 1.35] as V3, dir: [.05, -.5, -1] as V3, w: .5, h: .4, len: 3, c: [1, .92, .78] as [number, number, number], i: .6 })), dust: { box: [[-6, .2, -1.3], [6, 2.5, 1.3]], i: .7 },
  lights: [-4, 0, 4].map(x => ({ p: [x, 2.1, 0] as V3, c: [1, .78, .48] as [number, number, number], i: 2.6, d: 5 })), fog: { color: '#5a3a24', density: .03 },
  grade: { ao: .9, aoRadius: .35, aoTint: [.42, .32, .52], sat: 1.15, contrast: 1.07, lift: [.04, .03, .055], gain: [1.06, 1.0, .92], bloom: .32, bloomTh: 1.25, vignette: .3, exposure: 1.05 } };
const OHIO: Base = { ...FARM, set: 'ohio', sky: { ...SKY, sun: [-.5, .5, .5] as V3 }, sun: { dir: [-.5, .5, .5], color: '#ffe6bc', i: 2.2, focus: [0, 0, -3], size: 26 } };
const OFF: Base = { set: 'office', sun: { dir: [.15, .5, 1], color: '#fff0d8', i: 1.6, focus: [0, 1, -1], size: 6 }, hemi: { sky: '#e8dcc8', ground: '#5a3018', i: 1.1 }, fill: { color: '#ffe2c0', i: .45 }, bg: '#140c08',
  beams: [{ p: [0, 2.4, -3.4], dir: [0, -.45, 1], w: 1.6, h: 1.5, len: 6, c: [1, .92, .78], i: .65 }], dust: { box: [[-3, .3, -3.3], [3, 3.2, 3]], i: .5 },
  lights: [{ p: [.9, 1.2, -1.5], c: [1, .78, .45], i: 3.0, d: 4 }], fog: { color: '#3a2618', density: .02 },
  grade: { ao: .9, aoRadius: .4, aoTint: [.4, .32, .55], sat: 1.12, contrast: 1.08, lift: [.035, .025, .055], gain: [1.05, 1.0, .93], bloom: .28, bloomTh: 1.3, vignette: .3 } };

const TRAIN_Y = .43;
/** steam puffs from the locomotive chimney (train prop at x0) */
function steam(t: number, x0: number, n = 26, back = 1): Sprite[] {
  const S: Sprite[] = [];
  for (let i = 0; i < n; i++) { const a = (t * .9 + hsh(i)) % 1; S.push({ p: [x0 + 10.4 - a * 9 * back, TRAIN_Y + 3.7 + a * 4 + hsh(i + 2) * .5, (hsh(i + 3) - .5) * 1.5 * a], s: .7 + a * 3.2, rot: hsh(i) * 6 + t * .5, c: [.96, .95, .94], a: .7 * (1 - a), kind: 0, seed: hsh(i + 9), age: a }); }
  return S;
}

type Shot = { t0: number; t1: number; f: (t: number, k: number) => Partial<Frame9> };
function timeline(): Shot[] {
  const T = { coat: w('coat', 1, 4.0), mailed: w('mailed', 1, 5.5), her: w('her', 2, 7.4), its: w("it's", 1, 11.3), year: w('year', 1, 14.2), rules: w('rules', 1, 19.6), very: w('very', 1, 22.6),
    sounds: w('sounds', 1, 27.7), may: w('may', 1, 29.5), letters: w('letters', 1, 32.3), guess: w('guess', 1, 35.1), clerk: w('clerk', 1, 37.0), see: w('see', 1, 39.0), under: w('under', 1, 43.5),
    stamped: w('stamped', 1, 44.7), addressed: w('addressed', 1, 45.6), so: w('so', 1, 46.6), when: w('when', 1, 49.5), banned: w('banned', 1, 51.6), but: w('but', 1, 53.0), postage: w('postage', 1, 58.0), just: w('just', 2, 59.0) };
  const mayP: V3 = [0, 0, .9];
  return [
    // S1 — crane down off the prairie sky, past the windmill, onto a little girl at the porch steps; push in on her coat
    { t0: 0, t1: T.coat, f: (t) => {
      const c = rig([{ t: 0, pos: [-6, 9, 14], look: [-2, 3, -4], fov: 46 }, { t: 2.0, pos: [-1.2, 1.6, 5.2], look: [0, .8, .6], fov: 40 }, { t: T.coat, pos: [-.15, .82, 2.2], look: [0, .68, .9], fov: 30 }], t, { easing: ease.inOut });
      return { ...FARM, cam: c, setNodes: { blades: { rot: [t * 2.2, 0, 0] } }, props: [{ id: 'tag', pos: [0, .7, 1.0], scale: .72 }],
        actors: [kid('may', MAY, mayP, pose({ turn: .05, handA: [-.5, -1.5], handB: [.45, -1.55], headTilt: Math.sin(t * 1.2) * .05 }, t, .4), expr('happy', 'curious', ss(2, 3, t)), t)],
        overlay: chip('53¢ OF STAMPS', 210, ss(T.coat - 2.2, T.coat - 1.7, t)) };
    } },
    // S2 — "...she's about to be mailed. Like a package!": she's stacked among parcels on the depot platform, shrugging
    { t0: T.coat, t1: T.her, f: (t, k) => {
      const c = rig([{ t: T.coat, pos: [-5.9, 1.7, 7.6], look: [-7.5, 1.35, 4.6], fov: 40 }, { t: T.her, pos: [-6.6, 1.55, 6.6], look: [-7.5, 1.4, 4.6], fov: 34 }], t);
      return { ...LINE, cam: c, props: [{ id: 'tag', pos: [-7.5, 1.58, 4.75], scale: .72 }],
        actors: [kid('may', MAY, [-7.5, 1.0, 4.65], pose({ turn: -.15, handA: [-.9, -2.0], handB: [.9, -2.0], shapeA: 'open', shapeB: 'open', headTilt: .12 * Math.sin(k * 6) }, t, .4), expr('confused', 'amused', ss(.5, .9, k)), t)],
        overlay: chip('📦 LIKE A PACKAGE!', 210, ss(T.mailed - .1, T.mailed + .3, t), '#ff9a4a') };
    } },
    // S3 — "Her parents are sending her to her grandparents, 73 miles away": parents wave from the porch; rise into a drone shot
    { t0: T.her, t1: T.its, f: (t) => {
      const u = at(t, T.her, T.its); const c = rig([{ t: T.her, pos: [2.2, 1.4, 4.5], look: [0, 1.3, -1.4], fov: 38 }, { t: T.its, pos: [8, 26, 26], look: [-6, 0, -30], fov: 50 }], t, { easing: ease.inOut });
      const wv = Math.sin(t * 9) * .4;
      return { ...FARM, cam: c, setNodes: { blades: { rot: [t * 2.2, 0, 0] } },
        actors: [act('mom', MOM, [-1.1, .55, -1.5], pose({ turn: .1, handB: [.8 + wv * .2, -3.0], shapeB: 'open' }, t, .4), expr('sad', 'happy', .4), t), act('dad', DAD, [1.0, .55, -1.6], pose({ turn: -.1, handA: [-.75, -3.1 + wv * .1], shapeA: 'open' }, t, .4, 5), expr('happy'), t),
          kid('may', MAY, [lerp(.2, .6, u), 0, lerp(3.0, 7.5, u)], pose({ turn: .1, back: 1, ...walk(t, .8) }, t, .3), expr('happy'), t)],
        overlay: chip('GRANDPARENTS: 73 MILES →', 210, ss(T.her + 1.2, T.her + 1.6, t)) };
    } },
    // S4 — "It's 1914 in Idaho": low by the rails, the mail train steams into Grangeville depot (foreground sleepers rush by)
    { t0: T.its, t1: T.year, f: (t) => {
      const x = lerp(60, 8, ease.out(at(t, T.its, T.year + 1))); const c = rig([{ t: T.its, pos: [-9, .9, -3.4], look: [12, 1.6, 0], fov: 44 }, { t: T.year, pos: [-7, 1.6, -4.6], look: [6, 2.0, 0], fov: 40 }], t);
      return { ...LINE, cam: c, props: [{ id: 'train', pos: [x, TRAIN_Y, 0] }], sprites: steam(t, x),
        overlay: chip('IDAHO • FEBRUARY 1914', 210, ss(T.its + .2, T.its + .6, t)) };
    } },
    // S5 — "A year earlier, America started parcel post... and people noticed something": dolly down the mail car past the
    // sorting cases while the clerk sorts; he stops and raises an eyebrow
    { t0: T.year, t1: T.rules, f: (t, k) => {
      const c = rig([{ t: T.year, pos: [3.5, 1.6, .55], look: [-3, 1.5, -1.0], fov: 42 }, { t: T.rules, pos: [-.6, 1.55, .5], look: [-3.0, 1.55, -1.1], fov: 36 }], t);
      const sort = Math.sin(t * 7) * .5 + .5; const stop = ss(.62, .78, k);
      return { ...CAR, cam: c, actors: [act('clerk', CLERK, [-3.0, 0, -.45], pose({ turn: lerp(-.85, -.2, stop), handA: [-.7 - sort * .15 * (1 - stop), -2.3], shapeA: 'hold', headTilt: stop * .12 }, t, .4), expr('focused', 'curious', stop), t, { res: 1500 })],
        overlay: chip(t < T.year + 2.6 ? '1913 • PARCEL POST BEGINS' : 'PEOPLE NOTICED…', 210, ss(T.year + .2, T.year + .6, t)) };
    } },
    // S6 — "The rules never actually said you couldn't mail a person!": over the desk, a hand-written rule list; push in
    { t0: T.rules, t1: T.very, f: (t) => {
      const c = rig([{ t: T.rules, pos: [.2, 2.0, .2], look: [0, .8, -1.3], fov: 40 }, { t: T.very, pos: [.1, 1.4, -.5], look: [0, .8, -1.25], fov: 32 }], t);
      const r = (i: number) => ss(T.rules + .25 + i * .35, T.rules + .5 + i * .35, t);
      const rows = [['✓ PARCELS', '#7dff9a'], ['✓ EGGS', '#7dff9a'], ['✓ LIVE BEES', '#7dff9a'], ['PEOPLE? …NOT MENTIONED', '#ffd23f']].map(([a, col], i) => `<div style="opacity:${r(i)};transform:translateX(${(1 - r(i)) * -40}px);color:${col}">${a}</div>`).join('');
      return { ...OFF, cam: c, overlay: `<div style="position:absolute;left:150px;top:300px;font-family:Inter;font-weight:900;font-size:56px;line-height:1.35;-webkit-text-stroke:7px #1a120c;paint-order:stroke fill;text-shadow:0 8px 24px rgba(0,0,0,.5)">${rows}</div>` };
    } },
    // S7 — "The very first baby was carried by a mailman to his grandma's house, for 15 cents": side-tracking down an Ohio lane
    // behind the picket fences, the carrier cradling the baby
    { t0: T.very, t1: T.sounds, f: (t) => {
      const u = at(t, T.very, T.sounds); const x = lerp(-12, -1, u); const c = { pos: [x + 1.2, 1.35, 5.2] as V3, look: [x + .4, 1.2, 0] as V3, fov: 38 };
      const wk = walk(t, .7);
      return { ...OHIO, cam: c, actors: [act('carrier', CARRIER, [x, 0, .4], pose({ turn: .7, ...wk, handA: [-.15, -2.15], handB: [.35, -2.05], shapeA: 'hold', shapeB: 'hold', headTilt: .15 }, t, .3), expr('happy', 'calm', .3), t),
        act('baby', BABY, [x + .12, .98, .5], pose({ turn: .5, crouch: .4, kneeUp: true, handB: [.4, -1.6 + Math.sin(t * 6) * .1] }, t, .2), expr('happy', 'laugh', Math.sin(t * 2) * .5 + .5), t, { scale: .32, res: 900 })],
        overlay: chip('OHIO • 1913 • 15¢', 210, ss(T.very + .3, T.very + .7, t)) };
    } },
    // S8 — "It sounds like a joke. It wasn't.": May sits on a mail sack in the car and gives us a dead-serious look
    { t0: T.sounds, t1: T.may, f: (t, k) => {
      const c = rig([{ t: T.sounds, pos: [-1.2, 1.05, -.7], look: [.4, .7, .25], fov: 38 }, { t: T.may, pos: [-.5, .95, -.3], look: [.4, .75, .25], fov: 30 }], t);
      return { ...CAR, cam: c, props: [{ id: 'tag', pos: [.4, .62, .33], scale: .72 }],
        actors: [kid('may', MAY, [.4, .2, .25], pose({ turn: -.2, crouch: .5, kneeUp: true, handA: [-.4, -1.4], handB: [.4, -1.4] }, t, .3), k < .45 ? expr('amused', 'laugh', .4) : expr('determined', 'confident', .5), t)] };
    } },
    // S9 — "May rode in the mail car of a train...": tracking alongside the train through the hills, parallax trees, steam
    { t0: T.may, t1: T.letters, f: (t) => {
      const x = lerp(-60, -20, at(t, T.may, T.letters)); const c = { pos: [x - 1, 3.2 + Math.sin(t * .6) * .2, 12] as V3, look: [x - 2, 2.2, 0] as V3, fov: 42 };
      return { ...LINE, cam: c, props: [{ id: 'train', pos: [x, TRAIN_Y, 0] }], sprites: steam(t, x, 30, 1.6), overlay: chip('IN THE MAIL CAR', 210, ss(T.may + .4, T.may + .8, t)) };
    } },
    // S10 — "...right next to the letters and parcels, through the hills": inside, May peeks out of the window between sacks
    { t0: T.letters, t1: T.guess, f: (t) => {
      const c = rig([{ t: T.letters, pos: [-.4, 1.4, .3], look: [2.6, 1.1, .9], fov: 40 }, { t: T.guess, pos: [.6, 1.3, .2], look: [2.6, 1.15, .9], fov: 34 }], t);
      return { ...CAR, cam: c, actors: [kid('may', MAY, [2.6, .45, .95], pose({ turn: .55, back: .3, crouch: .4, kneeUp: true, handB: [.6, -2.2], shapeB: 'open', headTilt: -.1 }, t, .3), expr('excited', 'amazed', .5), t)] };
    } },
    // S11 — "And guess who was looking after her? The mail clerk on board was her relative.": the clerk turns, they wave
    { t0: T.guess, t1: T.see, f: (t) => {
      const c = rig([{ t: T.guess, pos: [.2, 1.5, 1.1], look: [-1.2, 1.25, -.2], fov: 40 }, { t: T.see, pos: [-.1, 1.4, .9], look: [-1.0, 1.25, -.2], fov: 34 }], t);
      const turn = ss(T.clerk - .4, T.clerk + .1, t); const wv = Math.sin(t * 9) * .3 * turn;
      return { ...CAR, cam: c, actors: [act('clerk', CLERK, [-1.6, 0, -.55], pose({ turn: lerp(-.8, .2, turn), handB: [.7 + wv, -2.9 * turn - 1.6 * (1 - turn)], shapeB: 'open' }, t, .4), expr('focused', 'happy', turn), t, { res: 1500 }),
        kid('may', MAY, [-.4, 0, .1], pose({ turn: -.4, handA: [-.7, -2.4 * turn - 1.5 * (1 - turn)], shapeA: 'open' }, t, .3), expr('curious', 'laugh', turn), t)],
        overlay: chip(t < T.clerk ? 'GUESS WHO?' : 'HER MOTHER\'S COUSIN!', 210, ss(T.guess + .2, T.guess + .5, t), t < T.clerk ? '#ffd23f' : '#7dff9a') };
    } },
    // S12 — "To the post office, she was just a very heavy parcel... under the weight limit, stamped, and addressed. So,
    // legally, she was mail.": May on the depot platform scale; the needle swings; the checklist ticks; orbit
    { t0: T.see, t1: T.when, f: (t, k) => {
      const a = lerp(-.55, .5, ease.inOut(k)); const sp: V3 = [-6, 1.0, 3.4]; const c = { pos: [sp[0] + Math.sin(a) * 2.6, 1.9 + k * .2, sp[2] + Math.cos(a) * 2.6] as V3, look: [sp[0], 1.55, sp[2]] as V3, fov: 40 };
      const wgt = ss(T.under - 1.2, T.under, t); const needle = -wgt * 2.2 + Math.sin(t * 7) * .06 * (1 - ss(T.under, T.under + 1, t));
      const tk = (tt: number) => ss(tt, tt + .25, t); const rows = [['UNDER 50 LB', T.under], ['STAMPED', T.stamped], ['ADDRESSED', T.addressed]];
      const card = `<div style="position:absolute;left:120px;top:300px;font-family:Inter;font-weight:900;font-size:54px;line-height:1.4;-webkit-text-stroke:7px #1a120c;paint-order:stroke fill">${rows.map(([s_, tt]) => `<div style="opacity:${tk(tt as number)};color:#fff">${s_} <span style="color:#7dff9a">✓</span></div>`).join('')}</div>`;
      const ms = ss(T.so, T.so + .5, t);
      return { ...LINE, cam: c, props: [{ id: 'scale', pos: sp, nodes: { needle: { rot: [0, 0, needle] } } }, { id: 'tag', pos: [sp[0], sp[1] + .78, sp[2] + .12], scale: .72 }],
        actors: [kid('may', MAY, [sp[0], sp[1] + .21, sp[2] + .05], pose({ turn: .0, handA: [-.45, -1.5], handB: [.45, -1.5], headTilt: Math.sin(t * 2) * .05 }, t, .3), expr('curious', 'happy', ms), t)],
        overlay: ms > .01 ? card + chip('= LEGALLY MAIL ✉', 1080, ms, '#7dff9a') : card };
    } },
    // S13 — "When the Postmaster General heard about it, he banned mailing people.": he reads, frowns, and BANG — a red stamp
    { t0: T.when, t1: T.but, f: (t) => {
      const c = rig([{ t: T.when, pos: [1.6, 1.6, 1.4], look: [0, 1.25, -1.6], fov: 40 }, { t: T.banned, pos: [.5, 1.45, .2], look: [0, 1.3, -1.8], fov: 34 }, { t: T.but, pos: [.4, 1.4, 0], look: [0, 1.3, -1.8], fov: 32 }], t);
      const bang = ss(T.banned - .1, T.banned + .05, t); const shake = bang > 0 && t < T.banned + .3 ? Math.sin(t * 90) * .02 : 0;
      c.pos = [c.pos[0] + shake, c.pos[1], c.pos[2]];
      return { ...OFF, cam: c, actors: [act('pmg', PMG, [0, 0, -2.0], pose({ turn: .05, crouch: .45, kneeUp: true, handA: [-.6, -2.1], shapeA: 'hold', handB: [.7, -2.4 + bang * .9], shapeB: 'fist' }, t, .3), t < T.banned - .6 ? expr('thinking', 'annoyed', ss(T.when + 1, T.banned - .6, t)) : expr('angry', 'determined', .5), t, { res: 1600 })],
        overlay: chip('POSTMASTER GENERAL • 1914', 210, ss(T.when + .2, T.when + .5, t)) + (bang > .01 ? `<div style="position:absolute;left:540px;top:820px;transform:translate(-50%,-50%) rotate(-12deg) scale(${1.6 - .6 * bang});opacity:${bang};font-family:Inter;font-weight:900;font-size:110px;color:#e8302a;border:12px solid #e8302a;border-radius:18px;padding:6px 36px;letter-spacing:4px;text-shadow:0 6px 20px rgba(0,0,0,.35)">BANNED</div>` : '') };
    } },
    // S14 — "But the next year another little girl still rode a mail train 720 miles. Her postage? Just 15 cents.": dusk; a
    // little girl at the coach window as the train runs into the sunset; crane up and away; the price lands
    { t0: T.but, t1: 60, f: (t) => {
      const x = lerp(-30, 40, at(t, T.but, 60)); const c = rig([{ t: T.but, pos: [x + 6, 2.6, 6.5], look: [x - 4, 2.4, 0], fov: 40 }, { t: T.postage, pos: [x - 6, 3.4, 9], look: [x - 6, 2.6, 0], fov: 40 }, { t: 60, pos: [x - 30, 16, 30], look: [x + 4, 2, 0], fov: 46 }], t, { easing: ease.inOut });
      const big = ss(T.just + .05, T.just + .35, t);
      return { ...DUSK, cam: c, props: [{ id: 'train', pos: [x, TRAIN_Y, 0] }], sprites: steam(t, x, 30, 1.6),
        actors: [kid('edna', EDNA, [x - 17.5 + 2.0, TRAIN_Y + 1.15, 1.2], pose({ turn: .2, handB: [.7, -2.6 + Math.sin(t * 8) * .2], shapeB: 'open' }, t, .3), expr('happy', 'excited', .5), t, { scale: .55 })],
        overlay: (t < T.postage ? chip('1915 • 720 MILES', 210, ss(T.but + .6, T.but + 1.0, t)) : '') + (big > .01 ? `<div style="position:absolute;left:0;width:1080px;top:${600 - 30 * big}px;text-align:center;opacity:${big};font-family:Inter;font-weight:900;font-size:220px;line-height:1;color:#ffd23f;-webkit-text-stroke:12px #1a120c;paint-order:stroke fill;text-shadow:0 10px 40px rgba(0,0,0,.45)">15¢</div>` : '') };
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
