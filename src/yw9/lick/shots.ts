// YunoWorld v9 · "The Ice Cream Glass That Made People Sick" (penny licks) — 8 directed shots, market + studio.
// Verified (Wikipedia "Penny lick"; Tyne & Wear Museums blog; Atlas Obscura; London Museum on Agnes Marshall; Londonist):
// Victorian street vendors sold a penny's worth of ice cream in a small thick-walled glass with a shallow depression;
// customers licked it clean and handed it back to be reused, often unwashed; the thick glass made the portion look bigger;
// penny licks were blamed for spreading disease (notably tuberculosis) and banned (London c.1899; wider bans later);
// Agnes Marshall's 1888 cookery book has a recipe for "cornets" — edible cones filled with cream or ices — one of the
// earliest published (we do NOT claim the cone was invented only to replace the penny lick).
import { expr } from '../../ff2d/face.ts';
import { lerp, ss, type V3, type ActorState, type Sprite } from '../../yw3/core.ts';
import type { T7Look } from '../../yw7/toon7.ts';
import { rig, ease } from '../../yw7/cam7.ts';
import type { Frame9 } from '../engine9.ts';
import { chip, wt } from '../ui9.ts';
import { pose, act, hsh, walk, dispatcher, bigTitle, type Shot } from '../common9.ts';

const FILM = 'lick';
const w = (word: string, n = 1, fb = 0) => wt(FILM, word, n, fb);
const VEND: T7Look = { skin: '#d9a47e', hair: '#2a1e16', hairStyle: 'swept', nose: 'long', head: { w: 1.0, h: 1.04, jaw: 1.08 }, top: '#f4f0e6', topKind: 'jacket', inner: '#f4efe4', tie: '#c43d33', pants: '#2a2a32', boots: '#121010', apron: '#f4f0e6', hat: 'flatcap', hatColor: '#3a3a42', beard: 'stache', beardColor: '#2a1e16', eyes: '#3a2a1e' };
const KID1: T7Look = { skin: '#f2cfb0', hair: '#c8843a', hairStyle: 'curly', nose: 'snub', head: { w: 1.1, cheek: 1.12 }, top: '#3f6a8a', topKind: 'jacket', inner: '#efe6d2', pants: '#5a4a3a', boots: '#3a2a1e', hat: 'flatcap', hatColor: '#4a3a2a', eyes: '#4a6a3a' };
const KID2: T7Look = { skin: '#e2b48e', hair: '#2a1a12', hairStyle: 'long', nose: 'button', head: { w: 1.08, cheek: 1.1 }, top: '#c43d33', topKind: 'dress', inner: '#f2e6d0', pants: '#c43d33', boots: '#2a1a14', skirt: true, eyes: '#3a2a1e' };
const DOC: T7Look = { skin: '#f0c8a8', hair: '#d8d4cc', hairStyle: 'mutton', nose: 'hook', head: { w: .95, h: 1.08 }, top: '#1e1e24', topKind: 'coat', inner: '#f4efe4', tie: '#1a1a1a', pants: '#2a2a32', boots: '#121010', hat: 'bowler', hatColor: '#1a1a1e', beard: 'chops', beardColor: '#d8d4cc', glasses: true };
const AGNES: T7Look = { skin: '#f4d2b8', hair: '#4a2a1a', hairStyle: 'bun', nose: 'button', head: { w: .98, h: 1.02, cheek: 1.05 }, top: '#5a2a5a', topKind: 'dress', trim: '#e8c84a', inner: '#f2e6d0', pants: '#5a2a5a', boots: '#2a1a14', skirt: true, eyes: '#4a3a5a' };
const CROWD: T7Look[] = [
  { skin: '#f0c8a8', hair: '#7a3a22', hairStyle: 'bun', nose: 'button', top: '#3a6a3a', topKind: 'dress', inner: '#f2e6d0', pants: '#3a6a3a', boots: '#2a1a14', skirt: true, hat: 'bonnet', hatColor: '#e8d8b8' },
  { skin: '#e2b48e', hair: '#1e1a16', hairStyle: 'short', nose: 'round', top: '#4a3a2a', topKind: 'coat', inner: '#e8e2d4', pants: '#2a2a32', boots: '#1e1814', hat: 'bowler', hatColor: '#24242a' },
  { skin: '#c98d66', hair: '#1e1a16', hairStyle: 'side', nose: 'long', top: '#7a5a2a', topKind: 'waistcoat', inner: '#efe6d2', pants: '#4a3a2a', boots: '#2a1e14', hat: 'flatcap', hatColor: '#5a4a3a' }];

type Base = Partial<Frame9>;
const SKY = { top: '#3a7ac8', mid: '#a8cce8', bot: '#f8e0b8', sun: [.6, .5, .4] as V3, sunC: '#fff0c8', clouds: .5 };
const MARKET: Base = { set: 'market', sky: SKY, sun: { dir: [.6, .55, .45], color: '#ffe0b0', i: 2.2, focus: [0, 0, 0], size: 22 }, hemi: { sky: '#b0cce8', ground: '#8a6a50', i: .8 }, fill: { color: '#fff0dd', i: .15 },
  fog: { color: '#d8d0d8', density: .008 }, dust: { box: [[-8, .4, -4], [8, 5, 4]], i: .3 },
  grade: { ao: .85, aoRadius: .5, aoTint: [.4, .34, .58], sat: 1.25, contrast: 1.07, lift: [.03, .025, .05], gain: [1.06, 1.0, .93], bloom: .22, bloomTh: 1.5, vignette: .22 } };
const STUDIO: Base = { set: 'none', sky: { top: '#2a1a2a', mid: '#5a2a3a', bot: '#c8805a', clouds: 0, sun: [.4, .8, .5], sunC: '#000000' }, sun: { dir: [.5, .8, .5], color: '#fff4e0', i: 2.4, focus: [0, .3, 0], size: 2 },
  hemi: { sky: '#f8e0e8', ground: '#5a3a40', i: 1.5 }, fill: { color: '#ffe0c0', i: .8 }, fog: { color: '#2a1a2a', density: .02 }, lights: [{ p: [.8, .9, .9], c: [1, .9, .75], i: 3.0, d: 3 }, { p: [-.8, .3, -.6], c: [.6, .85, 1], i: 2.4, d: 3 }],
  grade: { ao: .5, aoRadius: .12, aoTint: [.34, .3, .55], sat: 1.2, contrast: 1.08, lift: [.03, .025, .06], gain: [1.04, 1.0, .97], bloom: .35, bloomTh: 1.2, vignette: .3 } };
const MICRO: Base = { ...STUDIO, sky: { top: '#0e2a2a', mid: '#1a4a4a', bot: '#3a6a5a', clouds: 0, sun: [.4, .8, .5], sunC: '#000000' }, grade: { ...STUDIO.grade, sat: 1.3, gain: [.95, 1.05, 1.0], bloom: .5, bloomTh: 1.0, vignette: .45 } };

const BAR: V3 = [1.5, 0, -.7];      // the barrow in the street
const GLASS_REAL = .2;              // glass prop at real size (the hero model is built at 5x)
const held = (p: V3, s = GLASS_REAL, id = 'glass') => ({ id, pos: p, scale: s });
const germs = (t: number, n: number, a: number, spread = .5, y = .35): Sprite[] => { const S: Sprite[] = []; for (let i = 0; i < n; i++) { const r = hsh(i) * spread; const g = hsh(i + 7) * 6.28 + t * (.3 + hsh(i + 3) * .4);
  S.push({ p: [Math.cos(g) * r, y + Math.sin(t * 1.5 + i) * .02 + hsh(i + 2) * .06, Math.sin(g) * r], s: .025 + hsh(i + 4) * .03, rot: t + i, c: i % 3 === 0 ? [.6, 1.4, .5] : i % 3 === 1 ? [1.2, .5, 1.3] : [.5, 1.1, 1.4], a: a * (.6 + .4 * Math.sin(t * 3 + i)), kind: 2, seed: hsh(i), age: 0 }); } return S; };

function timeline(): Shot[] {
  const T = { handed: w('handed', 1, 3.2), without: w('without', 1, 6.4), this: w('this', 2, 7.4), penny: w('penny', 2, 10.0), here: w("here's", 1, 14.2), lens: w('lens', 1, 19.4), see: w('see', 1, 21.6), wipe: w('wipe', 1, 24.6),
    doctors: w('doctors', 1, 27.6), banned: w('banned', 1, 32.4), but: w('but', 1, 33.6), agnes: w('agnes', 1, 37.0), edible: w('edible', 1, 39.6), one: w('one', 2, 42.0) };
  const END = Math.max(T.one + 2.4, 40);
  const vendor = (t: number, f = expr('happy', 'smug', .4), hb: [number, number] = [.7, -2.2]) => act('vend', VEND, [BAR[0] + .1, 0, BAR[2] - .75], pose({ turn: -.3, handB: hb, shapeB: 'hold', handA: [-.6, -2.0], shapeA: 'hold' }, t, .3), f, t, { res: 1500 });
  return [
    // S1 — the kid licks the glass spotless, hands it back; the vendor slaps in another scoop for the next kid — unwashed
    { t0: 0, t1: T.this, f: (t) => {
      const back = ss(T.handed - .2, T.handed + .4, t); const next = ss(T.handed + 1.0, T.handed + 1.6, t);
      const c = rig([{ t: 0, pos: [-.6, 1.35, 3.5], look: [1.1, 1.2, .3], fov: 42 }, { t: T.handed, pos: [-.3, 1.4, 3.3], look: [1.4, 1.2, .1], fov: 40 }, { t: T.this, pos: [.3, 1.45, 3.1], look: [1.8, 1.25, .2], fov: 38 }], t, { easing: ease.inOut });
      const gp: V3 = back < 1 ? [lerp(.62, 1.55, back), lerp(1.05, 1.3, back), lerp(1.1, -1.25, back)] : [lerp(1.55, 2.25, next), lerp(1.3, 1.12, next), lerp(-1.25, .9, next)];
      return { ...MARKET, cam: c, props: [{ id: 'barrow', pos: BAR }, held(gp)],
        actors: [act('k1', KID1, [.55, 0, 1.3], pose({ turn: .35, handB: back < .3 ? [.15, -2.65] : [.7, -2.2], shapeB: 'hold', headTilt: back < .3 ? .2 : 0 }, t, .3), back < .3 ? expr('happy', 'laugh', .6) : expr('happy'), t, { res: 1500 }),
          vendor(t), act('k2', KID2, [2.45, 0, 1.2], pose({ turn: -.4, handA: [-.7, -2.3 * next - 1.6 * (1 - next)], shapeA: 'open' }, t, .3), expr('excited'), t, { res: 1500 })],
        overlay: chip(t < T.without - .1 ? 'LICKED CLEAN → HANDED BACK' : '🤢 NOT WASHED!', 210, ss(.6, 1.0, t), t < T.without - .1 ? '#ffd23f' : '#7dff9a') };
    } },
    // S2 — "This is a penny lick. In Victorian London, one penny bought you a lick of ice cream": crane along the
    // market — stalls, striped canopies, brick shopfronts, shoppers — to the barrow
    { t0: T.this, t1: T.here, f: (t) => {
      const c = rig([{ t: T.this, pos: [-14, 5.2, 3.2], look: [-4, 1.2, -1.5], fov: 46 }, { t: T.here, pos: [-1.2, 1.7, 3.6], look: [1.4, 1.2, .2], fov: 40 }], t, { easing: ease.inOut });
      const A: ActorState[] = []; for (let i = 0; i < 9; i++) A.push(act(`p${i}`, CROWD[i % 3], [-16 + i * 2.2 + hsh(i) * .6, 0, i % 2 ? -1.2 : 2.6 + hsh(i + 2)], pose({ turn: i % 2 ? .7 : -.7, ...walk(t + i, .6) }, t, .3, i), expr(i % 3 ? 'happy' : 'curious'), t, { seed: i + 30, res: 800 }));
      return { ...MARKET, cam: c, props: [{ id: 'barrow', pos: BAR }], actors: [...A, vendor(t, expr('excited', 'happy', .5), [.8, -3.0])], overlay: chip(t < T.penny ? 'THE PENNY LICK' : '1 PENNY = 1 LICK', 210, ss(T.this + .2, T.this + .6, t)) };
    } },
    // S3 — "And here's the trick. The glass is mostly solid! Those thick walls bend the light like a lens, so a tiny scoop
    // looks huge": macro orbit of the hero glass; then the camera sinks through the rim and the scoop swells in the lens
    { t0: T.here, t1: T.see, f: (t, k) => {
      const a = lerp(-.8, .5, ease.inOut(Math.min(1, k * 1.4))); const thru = ss(T.lens - .3, T.see, t);
      const c = { pos: [Math.sin(a) * lerp(1.1, .3, thru), lerp(.55, .42, thru), Math.cos(a) * lerp(1.1, .3, thru)] as V3, look: [0, .33, 0] as V3, fov: lerp(34, 26, thru) };
      return { ...STUDIO, cam: c, props: [{ id: 'glass', pos: [0, 0, 0], scale: 1 + thru * .4 }], overlay: chip(t < T.lens - .3 ? 'MOSTLY SOLID GLASS 🔍' : 'TINY SCOOP… LOOKS HUGE', 210, ss(T.here + .2, T.here + .6, t), '#7fd3ff') };
    } },
    // S4 — "You see, every lick left a little bit of you behind. A quick wipe, maybe, then straight to the next mouth":
    // a stylised microscopic view of the glass rim — glowing germs swarm, a rag swipes, they're still there
    { t0: T.see, t1: T.doctors, f: (t) => {
      const c = rig([{ t: T.see, pos: [.5, .62, .6], look: [0, .36, 0], fov: 34 }, { t: T.doctors, pos: [.25, .48, .35], look: [0, .36, 0], fov: 30 }], t, { easing: ease.inOut });
      const wipe = ss(T.wipe - .1, T.wipe + .5, t); const after = wipe > .99 ? .75 : 1;
      return { ...MICRO, cam: c, props: [{ id: 'glass', pos: [0, 0, 0] }], sprites: germs(t, 40, ss(T.see + .2, T.see + .8, t) * after, .17, .34),
        overlay: chip(t < T.wipe - .1 ? '🦠 A LITTLE BIT OF YOU…' : 'QUICK WIPE… STILL THERE', 210, 1, '#7dff9a') + (wipe > .01 && wipe < .99 ? `<div style="position:absolute;left:${-400 + 1500 * wipe}px;top:820px;width:420px;height:220px;border-radius:40px;background:#d8c8a8;opacity:.9;transform:rotate(-12deg)"></div>` : '') };
    } },
    // S5 — "Doctors blamed them for spreading diseases like tuberculosis, and they were banned": a doctor holds a penny
    // lick up to the light, frowns; BANNED stamp
    { t0: T.doctors, t1: T.but, f: (t) => {
      const c = rig([{ t: T.doctors, pos: [-2.6, 1.6, 2.2], look: [-3.6, 1.55, .4], fov: 36 }, { t: T.but, pos: [-3.0, 1.6, 1.6], look: [-3.6, 1.6, .4], fov: 30 }], t);
      const bang = ss(T.banned - .05, T.banned + .1, t);
      return { ...MARKET, cam: c, props: [held([-3.32, 1.72, .62])], actors: [act('doc', DOC, [-3.6, 0, .4], pose({ turn: .25, handB: [.45, -3.25], shapeB: 'hold', headLift: .2 }, t, .3), expr('suspicious', 'disappointment', ss(T.doctors + 1, T.banned, t)), t, { res: 1700 })],
        overlay: chip('BLAMED: TUBERCULOSIS', 210, ss(T.doctors + .4, T.doctors + .8, t), '#ff7a59') + (bang > .01 ? `<div style="position:absolute;left:540px;top:860px;transform:translate(-50%,-50%) rotate(-12deg) scale(${1.6 - .6 * bang});opacity:${bang};font-family:Inter;font-weight:900;font-size:110px;color:#e8302a;border:12px solid #e8302a;border-radius:18px;padding:6px 36px;letter-spacing:4px">BANNED</div>` : '') };
    } },
    // S6 — "But the answer was already in a London cookbook. In 1888, Agnes Marshall published a recipe for cornets":
    // Agnes at her bench presents the cone; the open recipe page floats beside her
    { t0: T.but, t1: T.edible, f: (t) => {
      const c = rig([{ t: T.but, pos: [.6, 1.55, 2.4], look: [-.2, 1.4, .2], fov: 38 }, { t: T.edible, pos: [.3, 1.5, 1.7], look: [-.2, 1.45, .2], fov: 32 }], t, { easing: ease.inOut });
      const page = ss(T.agnes + .3, T.agnes + .7, t);
      return { ...STUDIO, sky: { ...STUDIO.sky!, top: '#3a2a3a', bot: '#e8b080' }, cam: c, props: [{ id: 'cone', pos: [.15, 1.25, .55], scale: 1.0 }],
        actors: [act('agnes', AGNES, [-.25, 0, .2], pose({ turn: .2, handB: [.65, -2.5], shapeB: 'hold' }, t, .3), expr('confident', 'happy', .5), t, { res: 1700 })],
        overlay: chip('AGNES MARSHALL • 1888', 210, ss(T.agnes - .1, T.agnes + .3, t)) + (page > .01 ? `<div style="position:absolute;left:600px;top:${360 + 40 * (1 - page)}px;opacity:${page};width:390px;padding:28px 30px;background:#f4ecd8;transform:rotate(4deg);box-shadow:0 14px 30px rgba(0,0,0,.35);font-family:Georgia,serif;color:#3a2a1e"><div style="font-size:40px;font-style:italic;font-weight:700;text-align:center">Cornets with Cream</div><div style="height:3px;background:#8a6a46;margin:14px 0"></div><div style="font-size:24px;line-height:1.35">almonds, flour, sugar, egg… baked, rolled into cones, and filled with any cream or ice.</div></div>` : '') };
    } },
    // S7 — "...edible cones you fill with ice cream. One of the earliest ever written down!": back in the market the girl
    // gets a cone instead; macro push on the scoop; title
    { t0: T.edible, t1: END, f: (t) => {
      const c = rig([{ t: T.edible, pos: [.9, 1.45, 3.6], look: [2.2, 1.25, 1.0], fov: 40 }, { t: END, pos: [1.4, 1.4, 3.0], look: [2.35, 1.3, 1.1], fov: 36 }], t, { easing: ease.inOut });
      const tt = ss(T.one + .3, T.one + .7, t);
      return { ...MARKET, cam: c, props: [{ id: 'barrow', pos: BAR }, { id: 'cone', pos: [2.08, 1.08, 1.4], scale: 1.0 }],
        actors: [act('k2', KID2, [2.45, 0, 1.2], pose({ turn: -.3, handA: [-.75, -2.25], shapeA: 'hold' }, t, .3), expr('excited', 'laugh', .6), t, { res: 1600 }), vendor(t, expr('happy'))],
        overlay: chip('🍦 THE EDIBLE CONE', 210, ss(T.edible + .2, T.edible + .6, t), '#ffd23f') + bigTitle('ONE OF THE FIRST', 'CONE RECIPES', tt) };
    } },
  ];
}
export const frameAt = dispatcher(FILM, timeline());
