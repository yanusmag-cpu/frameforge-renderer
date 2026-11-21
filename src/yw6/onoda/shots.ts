// YunoWorld v6 · "The Soldier Who Kept Fighting for 29 Years" (Hiroo Onoda, Lubang Island, 1944–1974). 60 s, cut to the narration.
// Verified beats only: sent to Lubang in Dec 1944 with orders never to surrender; dismissed the 1945 leaflets as a trick;
// hid for decades (his group's raids killed about 30 islanders); Norio Suzuki (looking for "Lieutenant Onoda, a panda and the
// Abominable Snowman, in that order") found him in four days in Feb 1974; Onoda would only obey his commander; Major Taniguchi,
// by then a bookseller, was flown out and read him the order on 9 March 1974.
import { STAND, idle, walkPose, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr } from '../../ff2d/face.ts';
import { runPose, sitPose } from '../../ff2d/moves.ts';
import { lerp, ss, kk, type V3, type Cam, type ActorState, type Sprite } from '../../yw3/core.ts';
import { AIM, PORT, SALUTE, type FolkLook, type Prop } from '../folk.ts';
import { SET, hillY, type OFrame, type SetName } from './engine.ts';
import { CUES } from '../cues.ts';
import { captions, chip, card, GRADE, wt } from '../ui.ts';

export const FPS = 30, FRAMES = 1800;
const C = CUES.onoda; const F = 'onoda'; const w = (word: string, n = 1, fb = 0) => wt(F, word, n, fb);
// ---- cast (all original designs)
const ONODA_Y: FolkLook = { skin: '#f0c79a', hair: '#1c1712', hairStyle: 'crop', outfit: 'fatigues', top: '#6f7046', inner: '#5a5b38', pants: '#666a42', shoes: '#3a2a1c', belt: '#4a3420', hat: 'fieldcap', hatColor: '#6f7046', star: true };
const ONODA_O: FolkLook = { ...ONODA_Y, top: '#7d7a52', pants: '#76704c', patches: 1, beard: 'stubble', age: .5, flaps: true, hatColor: '#7a7650' };
const PVT1: FolkLook = { ...ONODA_Y, skin: '#e8b88c', top: '#66683f', hatColor: '#66683f', beard: 'stubble', build: 1.1 };
const PVT2: FolkLook = { ...ONODA_Y, skin: '#f2cca4', top: '#727448', hatColor: '#727448', flaps: true, height: .95 };
const PVT3: FolkLook = { ...ONODA_Y, skin: '#e2b086', top: '#6a6a44', hatColor: '#6a6a44', build: .92, beard: 'stache', beardColor: '#2a1a10' };
const MAJOR: FolkLook = { skin: '#eec39a', hair: '#1a1612', hairStyle: 'side', outfit: 'fatigues', top: '#5e6240', inner: '#4a4c32', pants: '#55583a', shoes: '#2a1c14', belt: '#3a2818', hat: 'officer', hatColor: '#5e6240', star: true, beard: 'stache', build: 1.12 };
const SUZUKI: FolkLook = { skin: '#f3cfa6', hair: '#20180f', hairStyle: 'messy', outfit: 'tee', top: '#e8e2d2', trim: '#d85a3a', pants: '#3f5e8a', shoes: '#7a4a2a', hat: 'headband', hatColor: '#d8352a', backpack: '#c07a2a' };
const TANI_O: FolkLook = { skin: '#eec39a', hair: '#a8a8a2', hairStyle: 'grey', outfit: 'suit', top: '#4a4e5a', inner: '#f0ece2', trim: '#7a2a2a', pants: '#3e424c', shoes: '#1c1a1a', glasses: true, age: .9, beard: 'stache', beardColor: '#b0b0aa', build: 1.05 };
// ---- helpers
const Wp = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
const cam = (s: SetName, pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos: Wp(s, pos), look: Wp(s, look), fov, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1, seed = 3): Pose => ({ ...STAND, ...idle(t, seed, amt), ...p });
const act = (id: string, look: FolkLook, s: SetName, pos: V3, p: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> & { a?: Prop; b?: Prop } = {}): ActorState =>
  ({ id, folk: look, look: { outfit: 'hoodie', color: '#000', pants: '#000' }, pose: p, face, pos: Wp(s, pos), t, res: 1100, seed: id.length * 7, propA: o.a, propB: o.b, ...o });
const H = (x: number, z: number): V3 => [x, hillY(x, z), z];
// ---- looks of the day
const DAY = { set: 'jungle' as const, sky: { top: '#5a8ad8', hor: '#f8e0b0', sun: [.3, .6, -.7] as V3 }, hemi: { sky: '#a8c4ff', ground: '#4a5a32', i: .95 }, fog: { color: '#9ab8a0', density: .016 }, shafts: .09, fire: .6 };
const DSUN = (focus: V3, size = 14, i = 3.3) => ({ dir: [.35, .8, -.45] as V3, color: '#ffd9a0', i, focus: Wp('jungle', focus), size });
const DUSK = { set: 'jungle' as const, sky: { top: '#3a3a8a', hor: '#ff9a5a', sun: [-.6, .12, -.6] as V3 }, hemi: { sky: '#8a7ad0', ground: '#3a2a2a', i: .8 }, fog: { color: '#b07a6a', density: .02 }, shafts: .12, fire: .9 };
const NIGHT = { set: 'jungle' as const, sky: { top: '#141a46', hor: '#2e3270', sun: [.2, .5, -.8] as V3, night: 1 }, hemi: { sky: '#4a5ab0', ground: '#161626', i: .5 }, fog: { color: '#161a36', density: .045 }, shafts: 0, fire: 1, night: 1 };
const NSUN = (focus: V3) => ({ dir: [.2, .9, -.4] as V3, color: '#8aa0ff', i: .6, focus: Wp('jungle', focus), size: 12 });
const HILL = { set: 'hill' as const, sky: { top: '#3a78d8', hor: '#d8ecff', sun: [.5, .35, -.8] as V3 }, hemi: { sky: '#bcd8ff', ground: '#5a7a4a', i: 1.05 }, fog: { color: '#cfe2f2', density: .0035 } };
const HSUN = (focus: V3, size = 16) => ({ dir: [.45, .7, -.55] as V3, color: '#fff0d0', i: 3.1, focus: Wp('hill', focus), size });
const FIRE_RIM = '#ffb070', SUN_RIM = '#ffe2a8';
const NT: [number, number, number] = [.78, .78, .98];   // moonlit tint on the flat characters
type S = { a: number; b: number; f: (t: number) => OFrame }; const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => OFrame) => SH.push({ a, b, f });
const shakeHead = (t: number, a: number, b: number) => Math.sin((t - a) * 14) * .35 * ss(a, a + .15, t) * (1 - ss(b - .2, b, t));

// 1 — HOOK: tight on a hard-eyed soldier in a ragged WWII uniform, rifle up… pull back: a jungle hideout. It's 1974.
shot(0, C[1], t => { const k = kk(t, 0, C[1]); const pos: V3 = [.3, 0, 2.4];
  return { t, ...DAY, sun: DSUN([0, 0, 0]), cam: cam('jungle', [lerp(1.2, 3.6, k), lerp(3.55, 2.2, k), lerp(3.6, 9.2, k)], [lerp(.1, -.6, k), lerp(3.45, 1.6, k), lerp(2.4, 0, k)], lerp(34, 46, k)),
    actors: [act('onoda', ONODA_O, 'jungle', pos, pose({ ...AIM(-1), headTurn: Math.sin(t * 1.6) * .12 }, t, .4), expr('suspicious', 'determined', ss(1.5, 2.5, t)), t, { a: 'rifle', rim: SUN_RIM, rimSide: 1 })],
    grade: { ...GRADE, fade: (1 - ss(0, .35, t)) * .6, focus: 1 - k, aperture: .4 * (1 - k) },
    overlay: card('1974', 'DEEP IN THE JUNGLE', ss(.5, .8, t) * (1 - ss(C[1] - 1.9, C[1] - 1.6, t)), 230) + chip('WORLD WAR II ENDED IN 1945', 260, ss(C[1] - 1.7, C[1] - 1.4, t), '#ff8a5a') + captions(F, t) }; });
// 2 — Dec 1944: a young lieutenant arrives on Lubang (ridge over the sea; the transport plane banks away)
shot(C[1], C[2], t => { const k = kk(t, C[1], C[2]); const p = H(-1, 9.5);
  return { t, ...HILL, sun: HSUN([0, 12, 6]), plane: { pos: Wp('hill', [lerp(-40, 60, k), 42, -80]), yaw: Math.PI / 2, bank: -.15 },
    cam: cam('hill', [lerp(3.2, 1.2, k), p[1] + lerp(.9, 2.4, k), lerp(16, 19.5, k)], [lerp(-1.5, -2, k), p[1] + lerp(2.2, 1.4, k), -20], lerp(44, 56, k)),
    actors: [act('onoda', ONODA_Y, 'hill', p, pose({ turn: -.25, back: 0, headTurn: -.3, handA: [-.5, -1.55], handB: [.5, -1.55] }, t, .5), EXPR.determined, t, { rim: SUN_RIM })],
    grade: { ...GRADE, sat: 1.14 }, overlay: chip('DECEMBER 1944', 260, ss(C[1] + .3, C[1] + .6, t)) + chip('LUBANG ISLAND · PHILIPPINES', 370, ss(C[1] + 1.6, C[1] + 1.9, t), '#5fd1ff') + captions(F, t) }; });
// 3 — the orders: "hold out… never surrender" (major points; the lieutenant snaps a salute)
shot(C[2], C[3], t => { const k = kk(t, C[2], C[3]); const NV = w('never', 1, C[2] + 1.6); const sal = ss(C[2] + .5, C[2] + .8, t); const pt = ss(NV - .3, NV, t);
  const pm = H(-3.1, 12), po = H(-.6, 12.4);
  return { t, ...HILL, sun: HSUN([-2, 12, 12], 10), cam: cam('hill', [lerp(-1.7, -1.9, k), pm[1] + 1.9, lerp(18.6, 17.4, k)], [-1.85, pm[1] + 1.75, 12.2], lerp(42, 36, k)),
    actors: [act('major', MAJOR, 'hill', pm, pose({ turn: .55, lean: -.03 + pt * .06, handB: pt > .1 ? [lerp(.6, 1.35, pt), lerp(-1.7, -2.9, pt)] : [.45, -1.55], shapeB: 'point', handA: [-.3, -1.9], shapeA: 'fist', frontB: 1 }, t, .4), pt > .3 ? EXPR.shout : EXPR.determined, t, { rim: SUN_RIM }),
      act('onoda', ONODA_Y, 'hill', po, pose({ ...(sal > .3 ? SALUTE(-1) : { turn: -.5 }), lean: -.02 }, t, .3), EXPR.determined, t, { rim: SUN_RIM })],
    grade: GRADE, overlay: card('NEVER', 'SURRENDER', pt, 330) + captions(F, t) }; });
// 4 — 1945: leaflets flutter down through the canopy (plane overhead) — "the war is over. Come out."
shot(C[3], C[4], t => { const k = kk(t, C[3], C[4]); const lt = t - C[3]; const look = ss(C[3] + .3, C[3] + 1.0, t); const grab = ss(C[4] - 1.6, C[4] - 1.1, t);
  const men: ActorState[] = [
    act('onoda', ONODA_Y, 'jungle', [0, 0, 2.2], pose({ turn: -.2, headLift: .1 * look, headTilt: -.12 * look, handB: grab > .2 ? [lerp(.5, .55, grab), lerp(-1.6, -2.6, grab)] : [.5, -1.55], frontB: 1 }, t, .3), look > .4 ? EXPR.surprise : EXPR.neutral, t, { b: grab > .5 ? 'leaflet' : undefined, rim: SUN_RIM }),
    act('p1', PVT1, 'jungle', [-1.6, 0, 1.4], pose({ turn: .3, headLift: .1 * look, handA: [-.6, -2.6 * look - 1.55 * (1 - look)], shapeA: 'point' }, t, .4, 5), EXPR.amazed, t),
    act('p2', PVT2, 'jungle', [1.7, 0, 1.2], pose({ turn: -.4, headLift: .08 * look }, t, .4, 7), EXPR.curious, t),
    act('p3', PVT3, 'jungle', [-3.0, 0, .4], pose({ turn: .5, headLift: .06 * look }, t, .4, 9), EXPR.confused, t)];
  return { t, ...DAY, sun: DSUN([0, 0, 1]), plane: { pos: Wp('jungle', [lerp(-60, 40, ss(C[3], C[3] + 3, t)), 46, -20]), yaw: Math.PI / 2 },
    leaflets: { t: lt + .6, center: Wp('jungle', [0, 14, 1.5]), spread: 9 },
    cam: k < .45 ? cam('jungle', [.4, .6, 6.8], [lerp(-.5, -.2, k / .45), lerp(9, 6, k / .45), -2], 54) : cam('jungle', [lerp(1.2, .9, k), 1.9, lerp(7.6, 6.4, k)], [0, 2.1, 1.6], 44),
    actors: men, grade: GRADE, overlay: chip('LATE 1945', 260, ss(C[3] + .2, C[3] + .5, t)) + chip('"THE WAR IS OVER. COME OUT."', 370, ss(w('war', 2, C[3] + 2.4) - .1, w('war', 2, C[3] + 2.4) + .2, t), '#ffffff') + captions(F, t) }; });
// 5 — "an enemy trick": he studies it, narrows his eyes… and feeds it to the fire
shot(C[4], C[5], t => { const k = kk(t, C[4], C[5]); const toss = ss(C[5] - 1.3, C[5] - .7, t); const burn = ss(C[5] - .75, C[5] - .3, t);
  const S: Sprite[] = []; if (burn > 0 && burn < 1) for (let i = 0; i < 6; i++) S.push({ p: Wp('jungle', [1.2 + (i - 3) * .06, .6 + i * .08, 1.6]), s: .5, rot: i, c: [1.8, 1.1, .5], a: 1 - burn, kind: 1, seed: i, age: burn });
  return { t, ...DAY, fire: .6 + burn * .9, sun: DSUN([0, 0, 2]), cam: cam('jungle', [lerp(-1.3, -1.0, k), 3.0, lerp(5.2, 4.6, k)], [lerp(.1, .5, toss), 2.6 - toss * .8, 2.0], lerp(36, 40, toss)),
    actors: [act('onoda', ONODA_Y, 'jungle', [0, 0, 2.2], pose({ turn: .35, handB: toss < .5 ? [.45, -2.55] : [lerp(.6, 1.3, toss), lerp(-2.2, -1.5, toss)], shapeB: toss > .7 ? 'open' : 'hold', headTilt: .08 }, t, .3),
      toss > .3 ? EXPR.smug : expr('suspicious', 'angry', ss(C[4] + .6, C[4] + 1.4, t)), t, { b: toss < .6 ? 'leaflet' : undefined, rim: FIRE_RIM, rimSide: 1 })], sprites: S,
    grade: GRADE, overlay: card('A TRICK?', '', ss(C[4] + .3, C[4] + .6, t) * (1 - ss(C[5] - .6, C[5] - .3, t)), 300) + captions(F, t) }; });
// 6 — so he stayed: patching his uniform · cleaning his rifle · raiding farms for food (three beats, word-cut)
shot(C[5], C[6], t => { const t1 = w('cleaning', 1, C[5] + 2), t2 = w('raiding', 1, C[5] + 3.6);
  if (t < t1) { const k = kk(t, C[5], t1); return { t, ...DUSK, sun: undefined, lights: [], cam: cam('jungle', [lerp(-.2, .1, k), 1.55, lerp(4.6, 4.1, k)], [.5, 1.3, 1.6], 38),
    actors: [act('onoda', ONODA_O, 'jungle', [.1, .45, 1.2], { ...sitPose(1, .1), handA: [.35, -1.35], handB: [.75 + Math.sin(t * 6) * .12, -1.55 + Math.cos(t * 6) * .1], shapeA: 'hold', frontA: 1, frontB: 1 } as Pose, EXPR.focused, t, { b: 'needle', a: 'rag', rim: FIRE_RIM, rimSide: 1 })],
    grade: GRADE, overlay: chip('PATCHING', 260, ss(C[5] + .2, C[5] + .5, t)) + captions(F, t) }; }
  if (t < t2) { const k = kk(t, t1, t2); return { t, ...DUSK, cam: cam('jungle', [lerp(2.4, 2.2, k), 1.4, 4.4], [.6, 1.2, 1.5], 36),
    actors: [act('onoda', ONODA_O, 'jungle', [.3, .45, 1.2], { ...sitPose(1, 0), handA: [.6 + Math.sin(t * 7) * .25, -1.6], handB: [1.6, -1.75], shapeA: 'hold', shapeB: 'hold', frontA: 1, frontB: 1 } as Pose, EXPR.focused, t, { b: 'rifle', a: 'rag', rim: FIRE_RIM, rimSide: 1 })],
    grade: GRADE, overlay: chip('CLEANING', 260, ss(t1, t1 + .3, t)) + captions(F, t) }; }
  const k = kk(t, t2, C[6]); const x = lerp(5.5, 1.8, k);
  return { t, ...NIGHT, sun: NSUN([x, 0, 3]), cam: cam('jungle', [lerp(7.5, 5.2, k), 1.0, 8.6], [x, 1.3, 3.2], 44),
    actors: [act('onoda', ONODA_O, 'jungle', [x, 0, 3.2], { ...walkPose((t - t2) * 2.4, -1), handB: [.55, -2.1], shapeB: 'hold', frontB: 1, crouch: .18, lean: -.12 } as Pose, EXPR.suspicious, t, { b: 'bananas', tint: NT, rim: FIRE_RIM, rimSide: -1 })],
    grade: { ...GRADE, exposure: .95 }, overlay: chip('RAIDING FARMS', 260, ss(t2, t2 + .3, t), '#ff8a5a') + captions(F, t) }; });
// 7 — for a war that no longer existed: years scratched into a tree; the others gone; his raids cost lives (sober, no violence shown)
shot(C[6], C[7], t => { const k = kk(t, C[6], C[7]); const yr = Math.round(lerp(1946, 1973, ss(C[6] + .2, C[7] - .6, t))); const marks = Math.round(lerp(1, 28, ss(C[6] + .2, C[7] - .6, t)));
  return { t, ...DAY, fog: { color: '#8a9aa0', density: .022 }, fire: 0, sun: DSUN([3.6, 1.5, -2.6], 8, 2.4), tally: marks,
    cam: cam('jungle', [lerp(5.2, 4.4, k), 1.85, lerp(2.8, 1.1, k)], [3.5, 1.65, -2.6], lerp(44, 36, k)),
    actors: [act('onoda', ONODA_O, 'jungle', [2.3, 0, -1.6], pose({ turn: .55, handB: [1.05, -2.6], shapeB: 'fist', frontB: 1, headTilt: -.06 }, t, .3), EXPR.tired, t, { rim: SUN_RIM })],
    grade: { ...GRADE, sat: lerp(1.1, .82, k), contrast: 1.06 }, overlay: card(String(yr), '', 1, 220) + chip('ABOUT 30 ISLANDERS WERE KILLED', 400, ss(w('lives', 1, C[6] + 4) - .4, w('lives', 1, C[6] + 4), t), '#ff8a5a') + captions(F, t) }; });
// 8 — 1974: a young Japanese traveller hikes in with a backpack and a camera
shot(C[7], C[8], t => { const k = kk(t, C[7], C[8]); const x = lerp(9, 4.6, k);
  return { t, ...DAY, fire: 0, sun: DSUN([x, 0, 6], 12), cam: cam('jungle', [lerp(2, 2.5, k), 1.6, 11.4], [x - .6, 1.7, 6], 42),
    actors: [act('suzuki', SUZUKI, 'jungle', [x, 0, 6], { ...walkPose((t - C[7]) * 2.2, -1), handB: [.55, -2.05], frontB: 1 } as Pose, expr('curious', 'excited', ss(C[8] - 1.4, C[8] - .8, t)), t, { b: 'camera', rim: SUN_RIM })],
    grade: GRADE, overlay: chip('FEBRUARY 1974', 260, ss(C[7] + .2, C[7] + .5, t)) + chip('NORIO SUZUKI, 24', 370, ss(C[7] + 1.3, C[7] + 1.6, t), '#5fd1ff') + captions(F, t) }; });
// 9 — "Lieutenant Onoda, a panda, and the Abominable Snowman. In that order." (three wishes pop up, counted on fingers)
const ICON = (kind: number, x: number, y: number, k: number) => { if (k <= .01) return ''; const s = .6 + .4 * Math.min(1, k * 1.4) - .1 * Math.max(0, k - .7); const O = 'stroke="#1b140f" stroke-width="7"';
  const body = kind === 0 ? `<circle r="70" fill="#f0c79a" ${O}/><path d="M-72 -10 C-72 -70 -40 -86 0 -86 C40 -86 72 -70 72 -10 Q0 -26 -72 -10Z" fill="#6f7046" ${O}/><path d="M-12 -62 l12 -10 l12 10 l-4 14 h-16Z" fill="#f2c43a"/><circle cx="-24" cy="10" r="9" fill="#1b140f"/><circle cx="24" cy="10" r="9" fill="#1b140f"/><path d="M-20 40 q20 -10 40 0" ${O} fill="none"/>`
    : kind === 1 ? `<circle cx="-56" cy="-56" r="30" fill="#222" ${O}/><circle cx="56" cy="-56" r="30" fill="#222" ${O}/><circle r="74" fill="#fff" ${O}/><ellipse cx="-28" cy="0" rx="20" ry="26" fill="#222" transform="rotate(-30 -28 0)"/><ellipse cx="28" cy="0" rx="20" ry="26" fill="#222" transform="rotate(30 28 0)"/><circle cx="-26" cy="-2" r="6" fill="#fff"/><circle cx="26" cy="-2" r="6" fill="#fff"/><ellipse cy="30" rx="13" ry="9" fill="#222"/>`
    : `<path d="M-70 60 C-90 -10 -70 -90 0 -92 C70 -90 90 -10 70 60 C40 80 -40 80 -70 60Z" fill="#eef3f8" ${O}/><path d="M-40 -30 Q0 -50 40 -30 L36 20 Q0 34 -36 20Z" fill="#9ab0c8"/><circle cx="-16" cy="-10" r="8" fill="#1b140f"/><circle cx="16" cy="-10" r="8" fill="#1b140f"/><path d="M-14 12 q14 8 28 0" ${O} fill="none"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s.toFixed(3)})" opacity="${Math.min(1, k * 3).toFixed(2)}" filter="drop-shadow(0 8px 14px rgba(0,0,0,.4))"><circle r="104" fill="#fff8e6" stroke="#1b140f" stroke-width="8"/>${body}</g><text x="${x + 70}" y="${y + 100}" font-family="Inter" font-weight="900" font-size="64" fill="#ffd23f" stroke="#1b140f" stroke-width="10" paint-order="stroke">${kind + 1}</text>`; };
shot(C[8], C[9], t => { const k = kk(t, C[8], C[9]); const a1 = w('onoda', 2, C[8] + .5), a2 = w('panda', 1, C[8] + 1.4), a3 = w('abominable', 1, C[8] + 2.2), io = w('order', 1, C[9] - 1);
  const n = t > a3 ? 3 : t > a2 ? 2 : t > a1 ? 1 : 0; const fingers: [number, number][] = [[-.2, -2.3], [-.15, -2.55], [-.1, -2.75]];
  return { t, ...DAY, fire: 0, sun: DSUN([4.6, 0, 6], 10), cam: cam('jungle', [lerp(4.9, 4.7, k), 2.15, lerp(10.4, 9.6, k)], [4.6, 2.3, 6], 40),
    actors: [act('suzuki', SUZUKI, 'jungle', [4.6, 0, 6], pose({ turn: -.1, handB: n ? fingers[n - 1] : [.5, -1.6], shapeB: n ? 'point' : 'fist', handA: [-.55, -1.7], frontB: 1, headTilt: Math.sin(t * 3) * .04 }, t, .5), t > io ? EXPR.smug : EXPR.excited, t, { rim: SUN_RIM })],
    grade: GRADE, overlay: ICON(0, 260, 420, ss(a1 - .05, a1 + .25, t)) + ICON(1, 540, 330, ss(a2 - .05, a2 + .25, t)) + ICON(2, 820, 420, ss(a3 - .05, a3 + .25, t)) + captions(F, t) }; });
// 10 — four days later, at his flag-draped tent… Onoda steps out of the dark. Flash! But he still won't quit.
shot(C[9], C[10], t => { const k = kk(t, C[9], C[10]); const ap = ss(C[9] + .2, C[9] + 1.2, t); const FL = w('found', 1, C[9] + .4) + .9; const flash = Math.max(0, 1 - Math.abs(t - FL) * 6); const no = w('still', 1, C[9] + 2.6);
  const ox = lerp(3.6, 4.6, ap); const shake = t > no ? shakeHead(t, no, C[10]) : 0;
  return { t, ...NIGHT, tent: 1, fire: 1, sun: NSUN([5.5, 0, 4]), props: { flash }, cam: cam('jungle', [lerp(5.9, 5.6, k), 1.75, lerp(9.8, 9.2, k)], [5.2, 1.7, 4.6], 46),
    actors: [act('onoda', ONODA_O, 'jungle', [ox, 0, 4.3], t < no ? pose({ ...PORT(1), headTurn: 0 }, t, .3) : pose({ turn: .35, handA: [.35, -2.3], handB: [-.3, -2.35], frontA: 1, frontB: 1, headTurn: shake }, t, .3), t < no ? EXPR.suspicious : EXPR.determined, t, { a: t < no ? 'rifle' : undefined, tint: NT, rim: FIRE_RIM, rimSide: 1 }),
      act('suzuki', SUZUKI, 'jungle', [6.4, 0, 5.2], pose(t < FL - .5 ? { turn: -.5, handA: [-.45, -2.3], handB: [.2, -2.3], frontA: 1, frontB: 1, lean: .15 } : { turn: -.6, handA: [-.35, -2.55], handB: [.15, -2.5], frontA: 1, frontB: 1 }, t, .3), t < FL - .5 ? EXPR.terrified : t < no ? EXPR.amazed : EXPR.disappointment, t, { a: t > FL - .6 && t < no + .5 ? 'camera' : undefined, tint: NT, rim: FIRE_RIM, rimSide: -1 })],
    grade: { ...GRADE, flash: flash * .5 }, overlay: chip('FOUND HIM IN 4 DAYS', 260, ss(FL - .2, FL + .1, t), '#5fd16f') + chip('STILL WOULD NOT SURRENDER', 370, ss(no, no + .3, t), '#ff8a5a') + captions(F, t) }; });
// 11 — "only on an order from his commanding officer"
shot(C[10], C[11], t => { const k = kk(t, C[10], C[11]); const pt = ss(w('order', 2, C[10] + .8) - .2, w('order', 2, C[10] + .8) + .1, t);
  return { t, ...NIGHT, tent: 1, fire: 1, sun: NSUN([4.6, 0, 4]), cam: cam('jungle', [lerp(5.2, 4.9, k), 3.0, lerp(7.2, 6.6, k)], [4.5, 2.95, 4.3], 34),
    actors: [act('onoda', ONODA_O, 'jungle', [4.6, 0, 4.3], pose({ turn: .25, handB: pt > .1 ? [lerp(.6, 1.25, pt), lerp(-1.7, -2.6, pt)] : [.5, -1.55], shapeB: 'point', frontB: 1, lean: .03 * pt }, t, .3), pt > .3 ? EXPR.shout : EXPR.determined, t, { tint: NT, rim: FIRE_RIM, rimSide: 1 })],
    grade: GRADE, overlay: card('ORDERS ONLY', 'FROM MY COMMANDER', ss(C[10] + 1.2, C[10] + 1.5, t), 300) + captions(F, t) }; });
// 12 — Japan: his old major, now a bookseller… then the flight back to the island
shot(C[11], C[12], t => { const FL = w('flew', 1, C[11] + 3); const k = kk(t, C[11], FL);
  if (t < FL) { const look = ss(C[11] + .9, C[11] + 1.5, t);
    return { t, set: 'shop', hemi: { sky: '#c8b0ff', ground: '#4a3020', i: .55 }, sun: { dir: [.1, .3, 1], color: '#a8c8ff', i: 1.1, focus: Wp('shop', [0, 1, 0]), size: 8 }, fog: { color: '#2a2030', density: .012 }, bg: '#1a1410',
      cam: cam('shop', [lerp(2.6, 1.8, k), 1.75, lerp(5.2, 4.4, k)], [.3, 1.75, .8], 42),
      actors: [act('tani', TANI_O, 'shop', [1.6, 0, 1.75], pose({ turn: -.35 + look * .1, handA: [-.35, -2.05], handB: [.35, -2.05], frontA: 1, frontB: 1, headTilt: .05 * (1 - look) }, t, .3), look > .5 ? EXPR.surprise : EXPR.calm, t, { a: 'book', rim: '#ffd9a0', rimSide: -1 }),
        act('suzuki', SUZUKI, 'shop', [-.6, 0, 2.3], pose({ turn: .5, handB: [.7, -2.4], shapeB: 'hold', frontB: 1 }, t, .3), EXPR.excited, t, { b: 'photo' })],
      grade: { ...GRADE, sat: 1.1 }, overlay: chip('JAPAN', 260, ss(C[11] + .1, C[11] + .4, t)) + chip('MAJOR TANIGUCHI · BOOKSELLER', 370, ss(C[11] + 1.0, C[11] + 1.3, t), '#ffd23f') + captions(F, t) }; }
  const k2 = kk(t, FL, C[12]);
  return { t, ...HILL, sun: HSUN([0, 30, -40], 30), plane: { pos: Wp('hill', [lerp(-30, 25, k2), 36, -30]), yaw: Math.PI / 2 + .1, bank: .12 }, cam: cam('hill', [lerp(-34, 18, k2), 37.5, -14], [lerp(-30, 24, k2), 36, -30], 40),
    grade: GRADE, overlay: chip('BACK TO LUBANG', 260, ss(FL, FL + .3, t), '#5fd1ff') + captions(F, t) }; });
// 13 — 9 March 1974, golden dusk: the major reads the order aloud; Onoda stands to attention
shot(C[12], C[13], t => { const k = kk(t, C[12], C[13]); const sal = ss(C[12] + 1.4, C[12] + 1.8, t);
  return { t, ...DUSK, fire: .3, sun: { dir: [-.7, .25, -.5], color: '#ffb070', i: 3.2, focus: Wp('jungle', [1.5, 0, 2.5]), size: 10 },
    cam: cam('jungle', [lerp(-1.0, 1.2, k), 2.2, lerp(8.4, 8.8, k)], [1.2, 2.1, 2.6], 42),
    actors: [act('tani', TANI_O, 'jungle', [-.2, 0, 2.8], pose({ turn: .45, handA: [-.1, -2.35], handB: [.55, -2.3], frontA: 1, frontB: 1, headTilt: .06 }, t, .3), EXPR.focused, t, { b: 'paper', rim: '#ffb070', rimSide: -1 }),
      act('onoda', ONODA_O, 'jungle', [2.4, 0, 2.5], pose(sal > .3 ? SALUTE(-1) : { turn: -.5 }, t, .2), expr('determined', 'concern', ss(C[13] - 1.5, C[13], t)), t, { rim: '#ffb070', rimSide: -1 }),
      act('suzuki', SUZUKI, 'jungle', [-2.4, 0, 1.4], pose({ turn: .5 }, t, .4), EXPR.calm, t)],
    grade: GRADE, overlay: chip('9 MARCH 1974', 260, ss(C[12] + .2, C[12] + .5, t), '#ffd23f') + captions(F, t) }; });
// 14 — after twenty-nine years… he lowers the rifle (tears), and the camera rises into the sunset canopy
shot(C[13], 60.01, t => { const k = kk(t, C[13], 60); const low = ss(C[13] + 1.2, C[13] + 2.4, t); const up = ss(C[13] + 3.6, 60, t);
  return { t, ...DUSK, fire: .3, sun: { dir: [-.7, .25, -.5], color: '#ffb070', i: 3.2, focus: Wp('jungle', [2, 0, 2.5]), size: 10 },
    cam: cam('jungle', [lerp(3.2, 3.6, k), lerp(3.3, 12, up), lerp(5.6, 9, up)], [2.4, lerp(3.2, 8, up), 2.5], lerp(36, 52, up)),
    actors: [act('onoda', ONODA_O, 'jungle', [2.4, 0, 2.5], pose(low < .5 ? { ...PORT(-1) } : { turn: -.3, handA: [-.6, -1.4], handB: [.3, -1.5], headTilt: -.1, lean: -.05 }, t, .3), low > .5 ? EXPR.crying : EXPR.concern, t, { a: low < .5 ? 'rifle' : undefined, rim: '#ffb070', rimSide: -1 })],
    grade: { ...GRADE, fade: ss(59.2, 60, t) }, overlay: card('HIROO ONODA', '29 YEARS AFTER THE WAR', ss(C[13] + 3.2, C[13] + 3.6, t), 280) + captions(F, t) }; });

export function frameAt(n: number): OFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }
