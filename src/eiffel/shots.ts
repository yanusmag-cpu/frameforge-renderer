// "The Man Who Sold the Eiffel Tower Twice" — 60.0 s / 1800 frames. Paris, May 1925. 1 unit = 1 m.
// Narration: part 1 placed at +0.30 s (28.95 s), part 2 at +29.80 s (28.00 s) → speech ends 57.80 s. Every beat below is keyed to the
// word timestamps of the supplied recordings (see production/eiffel/TIMING.md); no visual runs ahead of the words.
import type { V3, Light } from '../brazil/engine.ts';
import type { ActorState } from '../brazil/actor.ts';
import type { Pose } from '../ff2d/rig.ts';
import type { Frame8 } from './engine8.ts';
import { pose, P, F, camPath, add3, lerp3, inOut, mix, gesture, type CamKey } from '../brazil/anim.ts';
import { STAND, walkPose, HERO } from '../ff2d/rig.ts';
import { clamp, smooth, noise1, outCubic, inCubic } from '../ff2d/motion.ts';
import { UNIT } from '../brazil/actor.ts';
import { svg, projector, type Proj } from '../brazil/overlay.ts';
import { CAST, type ToonLook, type Held } from '../ff2d/toon.ts';
import type { Face } from '../ff2d/face.ts';

export const FPS = 30, DURATION = 60, FRAMES = 1800;
const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const kk = (t: number, a: number, b: number) => inOut(k01(t, a, b));
const cp = (t: number, t0: number, t1: number, keys: CamKey[], e = inOut) => camPath(t, t0, t1, keys, e);
const HX = 1000, SX = -1000;
type Cam = { pos: V3; look: V3; fov: number; roll?: number };
const hand = (c: Cam, t: number, a: number): Cam => ({ ...c, pos: add3(c.pos, [noise1(t * .9, 1) * a, noise1(t * .8, 2) * a * .6, noise1(t * .7, 3) * a * .5]), look: add3(c.look, [noise1(t * .6, 4) * a, noise1(t * .7, 5) * a * .5, 0]) });
const jolt = (c: Cam, t: number, t0: number, a: number): Cam => { const x = t - t0; if (x < 0 || x > .5) return c; const e = Math.exp(-x * 9) * a; return { ...c, pos: add3(c.pos, [noise1(t * 40, 7) * e, noise1(t * 43, 8) * e, 0]) }; };

// ---------------------------------------------------------------------------------------------------------------- cast
const L = {
  ...CAST,
  dealerF: { ...CAST.dealerA, jacket: '#5b4636', trousers: '#4a3a2e', vest: '#c9b37a', glasses: undefined, beard: 'full', facial: '#8a8073', hairStyle: 'side', hair: '#8a8073', skin: '#e8b48c', hat: { kind: 'bowler', color: '#3a2a1e' } },
  dealerG: { ...CAST.dealerB, jacket: '#2f3e57', trousers: '#262f40', vest: '#a33a2a', beard: undefined, stache: 'handlebar', facial: '#d8d0c4', hair: '#d8d0c4', skin: '#f0c8a6', hat: { kind: 'top', color: '#1c1c22' } },
} as Record<string, ToonLook>;
const sy = (l: ToonLook) => (l.leg + l.torso) / 3.05, sxF = (l: ToonLook) => 1 + l.belly * .12 + (l.shoulder - .5) * .4;
/** convert a point given in metres relative to the feet (x right on screen, y up) to stick-pose space for look l */
const H = (l: ToonLook, x: number, y: number): [number, number] => [x / UNIT / sxF(l), -y / UNIT / sy(l)];
type Act = { id: string; who: keyof typeof L | string; pose: Pose; pos: V3; t: number; face?: Face; heldA?: Held; heldB?: Held; hatOff?: number; res?: number; tint?: [number, number, number]; flip?: boolean; seed?: number; contact?: number; lean?: number };
const actor = (a: Act): ActorState => ({ id: a.id, look: HERO, toon: L[a.who as string], pose: a.pose, pos: a.pos, t: a.t, face: a.face ?? F('neutral'), heldA: a.heldA, heldB: a.heldB, hatOff: a.hatOff,
  res: a.res ?? 1400, tint: a.tint, flip: a.flip, seed: a.seed ?? (a.id.length * 7), contact: a.contact ?? .8, lean: a.lean ?? .25 });
/** seated on a chair (seat .48 m): hip held at seat height for any body; dir = side the knees point to */
function seated(l: ToonLook, t: number, seed: number, dir: number, o: Partial<Pose> = {}): Pose {
  const s = sy(l); const id = Math.sin(t * .9 + seed * 2) * .02;
  return { ...STAND, turn: .45 * dir, lean: -.04 * dir + id, crouch: (l.leg - .48 / UNIT) / s, hipX: 0, headTilt: Math.sin(t * .63 + seed) * .03, headTurn: 0, headLift: 0,
    footA: [dir * .55 - .1, -.06], footB: [dir * .55 + .14, -.06], kneeDir: dir, kneeUp: true, bendA: 2, bendB: 2,
    handA: H(l, dir * .18 - .12, .8), handB: H(l, dir * .3 + .1, .8), shapeA: 'hold', shapeB: 'hold', ...o };
}
const walk = (l: ToonLook, dist: number, dir: number, o: { turn?: number; carryB?: [number, number] } = {}) => {
  const p = walkPose(dist / (UNIT * sy(l)), dir, { step: .55, turn: o.turn, carryB: o.carryB });
  const sw = (p.handA[0] + .08 * dir) * 2.2; return { ...p, handA: [-.08 * dir + sw - .12, p.handA[1] - Math.abs(sw) * .25] as [number, number], handB: o.carryB ?? [.08 * dir - sw + .12, p.handB[1] - Math.abs(sw) * .25] as [number, number] };
};
/** walking straight toward (+1) or away (-1) from camera with planted feet */
function walkFront(l: ToonLook, dist: number, away = false): Pose {
  const ph = dist / (UNIT * sy(l) * .6) * Math.PI; const s = Math.sin(ph), c = Math.cos(ph);
  return { ...STAND, turn: 0, back: away ? 1 : 0, hipX: c * .05, lean: c * .02, crouch: Math.abs(s) * -.03 + .02, headTilt: 0, headTurn: 0, headLift: 0,
    footA: [-.19, -.08 - Math.max(0, s) * .22], footB: [.19, -.08 - Math.max(0, -s) * .22], handA: [-.5 - s * .08, -1.66 + Math.max(0, s) * .1], handB: [.5 - s * .08, -1.66 + Math.max(0, -s) * .1] };
}
const talkF = (f: Face, t: number, amt: number) => ({ ...f, mOpen: Math.max(f.mOpen, amt * (.35 + .35 * Math.abs(Math.sin(t * 13.1) * Math.sin(t * 7.3)))) });

// ---------------------------------------------------------------------------------------------------------------- light
const AM = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#7ea3cc', '#f4cf9b'], sun: { dir: [.42, .36, .83], color: '#ffd29a', int: 4.4, focus, size: 34 },
  hemi: ['#b9cde6', '#8a6a4c', .7], amb: ['#ffe6c4', .12], fog: ['#e7d2b6', .00085], env: .8, sunGlow: .9, ...o });
const DUSK = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#5a6fa6', '#f6a865'], sun: { dir: [.3, .16, .95], color: '#ffb46a', int: 4.0, focus, size: 60 },
  hemi: ['#8f9ccc', '#7a5a46', .62], amb: ['#ffc8a0', .12], fog: ['#e9b993', .0011], env: .7, sunGlow: 1.2, ...o });
const ROOM = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#9fc0e2', '#f6deb6'], sun: { dir: [.3, .5, -.81], color: '#ffd9a8', int: 3.4, focus, size: 9 },
  hemi: ['#f3dfc0', '#6e4a30', .62], amb: ['#ffe2c0', .16], fog: ['#f0dcbc', .004], env: .8, sunGlow: .5,
  points: [{ pos: [HX - 2.6, 3.75, 0], color: '#ffc27a', int: 9, dist: 9 }, { pos: [HX + 2.6, 3.75, 0], color: '#ffc27a', int: 9, dist: 9 }, { pos: [HX, 1.2, 4.6], color: '#ffb070', int: 2, dist: 5 }], ...o });
const HALL = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#a8c4e0', '#f6deb6'], sun: { dir: [-.5, .5, -.1], color: '#ffd9a8', int: 0, focus, size: 10, shadow: 0 },
  hemi: ['#f0d6b0', '#5a3424', .55], amb: ['#ffd9b0', .14], fog: ['#3a2418', .012], env: .7, sunGlow: 0,
  points: [10.5, 17, 23.5, 30, 36.5, 43].map(x => ({ pos: [HX + x, 3.4, 0] as V3, color: '#ffc072', int: 7, dist: 8 })), ...o });
const STATION = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#b8c8d6', '#efe2c8'], sun: { dir: [-.35, .82, .45], color: '#ffe0b0', int: 3.2, focus, size: 26 },
  hemi: ['#d8dde2', '#5a4a3a', .7], amb: ['#ffe8cc', .14], fog: ['#cfc2ac', .006], env: .7, sunGlow: .4, ...o });
const GRADE = { exposure: 1.02, bloom: .34, bloomTh: 1.25, sat: 1.1, contrast: 1.08, lift: [.0, .006, .02] as [number, number, number], gain: [1.05, 1.0, .93] as [number, number, number], vignette: .38, grain: .03 };
const WARM_TINT: [number, number, number] = [1.0, .93, .82], ROOM_TINT: [number, number, number] = [.97, .9, .82], HALL_TINT: [number, number, number] = [.92, .8, .68], ST_TINT: [number, number, number] = [.93, .9, .86];

// ---------------------------------------------------------------------------------------------------------------- overlay
function lowerThird(name: string, sub: string, t: number, t0: number, t1: number, y = 1310) {
  const k = kk(t, t0, t0 + .45) * (1 - kk(t, t1 - .35, t1)); if (k <= 0) return '';
  return `<g opacity="${k}" transform="translate(${(1 - k) * -40} 0)" filter="url(#sh)"><rect x="70" y="${y - 70}" width="${8}" height="122" fill="#d9b25a"/>
    <text x="102" y="${y}" font-family="Georgia, serif" font-size="66" font-weight="700" fill="#fff6e2" letter-spacing="2">${name}</text>
    <text x="104" y="${y + 46}" font-family="Georgia, serif" font-style="italic" font-size="38" fill="#f0d9a8">${sub}</text></g>`;
}
function dateCard(text: string, t: number, t0: number, t1: number) {
  const k = kk(t, t0, t0 + .5) * (1 - kk(t, t1 - .4, t1)); if (k <= 0) return '';
  return `<g opacity="${k}" filter="url(#sh)"><text x="540" y="300" text-anchor="middle" font-family="Georgia, serif" font-size="58" letter-spacing="${10 + 8 * (1 - k)}" fill="#fff6e2">${text}</text>
    <rect x="${540 - 160 * k}" y="326" width="${320 * k}" height="4" fill="#d9b25a"/></g>`;
}
/** cartoon hand + sleeve drawn in screen space onto a projected world point (for tabletop inserts) */
function ovHand(pr: Proj, p: V3, from: [number, number], sleeve: string, cuff = '#f6f2e8', skin = '#f0c9a4', shape: 'grip' | 'flat' = 'grip') {
  const [x, y, z] = pr(p); if (z <= 0) return ''; const ang = Math.atan2(y - from[1], x - from[0]); const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const w = 74, cx = x - dx * 70, cy = y - dy * 70;
  const sl = `M${from[0] + nx * w} ${from[1] + ny * w} L${cx + nx * w * .85} ${cy + ny * w * .85} L${cx - nx * w * .85} ${cy - ny * w * .85} L${from[0] - nx * w} ${from[1] - ny * w}Z`;
  const cf = `M${cx + nx * w * .8} ${cy + ny * w * .8} L${cx + nx * w * .8 + dx * 26} ${cy + ny * w * .8 + dy * 26} L${cx - nx * w * .8 + dx * 26} ${cy - ny * w * .8 + dy * 26} L${cx - nx * w * .8} ${cy - ny * w * .8}Z`;
  const hx = x - dx * 18, hy = y - dy * 18;
  const palm = shape === 'grip' ? `<ellipse cx="${hx}" cy="${hy}" rx="62" ry="52" transform="rotate(${ang * 57.3} ${hx} ${hy})" fill="${skin}" stroke="#16120f" stroke-width="8"/>
    <path d="M${hx + nx * 40 + dx * 20} ${hy + ny * 40 + dy * 20} q${dx * 30} ${dy * 30} ${dx * 40 - nx * 30} ${dy * 40 - ny * 30}" stroke="#16120f" stroke-width="7" fill="none"/>`
    : `<ellipse cx="${hx}" cy="${hy}" rx="70" ry="48" transform="rotate(${ang * 57.3} ${hx} ${hy})" fill="${skin}" stroke="#16120f" stroke-width="8"/>`;
  return `<path d="${sl}" fill="${sleeve}" stroke="#16120f" stroke-width="8" stroke-linejoin="round"/><path d="${cf}" fill="${cuff}" stroke="#16120f" stroke-width="7"/>${palm}`;
}
const fadeBlack = (k: number) => k > 0 ? `<rect width="1080" height="1920" fill="#000" opacity="${clamp(k)}"/>` : '';
const flashW = (k: number) => k > 0 ? `<rect width="1080" height="1920" fill="#fff4dc" opacity="${clamp(k)}"/>` : '';

// ---------------------------------------------------------------------------------------------------------------- shots
type Shot = { t0: number; t1: number; f: (t: number) => Frame8 };
const base = (t: number, cam: Cam, light: Light, o: Partial<Frame8> = {}): Frame8 => ({ t, cam, light, grade: { ...GRADE, ...(o.grade ?? {}) }, ...o, });
// street positions
const LZ = 15.2;   // Lustig's opening mark in the avenue
const KIOSK: V3 = [-11.6, 0, 52];
const DOOR_C = -73;   // Crillon entrance z
const POL: V3 = [13.75, .15, -37.5];
// hotel seats
const SEAT = { A: [HX - 2.4, 0, 1.25] as V3, B: [HX, 0, 1.25] as V3, Poi: [HX + 2.4, 0, 1.25] as V3, E: [HX - 2.4, 0, -1.25] as V3, C: [HX, 0, -1.25] as V3, head: [HX + 4.55, 0, 0] as V3, G: [HX + 2.4, 0, -1.25] as V3 };

function dealersAt(t: number, mood: (id: string) => Face, lean = 0, skip: string[] = [], over: Record<string, Partial<Pose>> = {}, held: Record<string, Held | undefined> = {}): ActorState[] {
  const list: [string, string, V3, number][] = [['dA', 'dealerA', SEAT.A, 1], ['dB', 'dealerB', SEAT.B, 1], ['poi', 'poisson', SEAT.Poi, 1], ['dE', 'dealerE', SEAT.E, -1], ['dC', 'dealerC', SEAT.C, -1]];
  return list.filter(x => !skip.includes(x[0])).map(([id, who, p, d], i) => actor({ id, who, t, pos: p, pose: seated(L[who], t, i + 3, d, { lean: lean * d * .3, ...(over[id] ?? {}) }), face: mood(id), heldA: held[id], res: 1100, tint: ROOM_TINT }));
}

const S: Shot[] = [
  // 1 ─ 0.00–4.30  "This man sold the Eiffel Tower. The problem: he didn't own it."
  { t0: 0, t1: 4.3, f: t => {
    const z = mix(12.4, LZ, outCubic(k01(t, 0, 1.75))); const walking = t < 1.6;
    const pres = gesture(t, 1.15, .55);               // presenting sweep on "Eiffel Tower" (1.28)
    const shrug = gesture(t, 3.62, .4) * (1 - kk(t, 4.15, 4.3));   // "own it" (3.78)
    let pz: Pose = walking ? walkFront(L.lustig, z - 12.4) : pose(t, 2, { turn: .1 });
    if (!walking) pz = P(pz, pose(t, 2, { turn: .35, headTurn: -.3, arms: [H(L.lustig, -.18, .95), H(L.lustig, .62, 1.55)], shapeB: 'open', bendB: -1 }), pres * (1 - kk(t, 2.3, 2.7)));
    if (t > 2.3) pz = P(pz, pose(t, 2, { turn: .05, headTilt: -.12 * shrug, arms: [H(L.lustig, -.5, 1.05), H(L.lustig, .5, 1.05)], shapeA: 'open', shapeB: 'open', crouch: .04 * shrug }), Math.max(kk(t, 2.3, 2.6) * .2, shrug));
    const face = t < 2.3 ? F('confident', 'slySmile', k01(t, 1.2, 1.9)) : t < 3.5 ? F('smirk', 'suspicious', .3) : F('amused', 'smirk', .2);
    const c1 = cp(t, 0, 2.3, [{ p: [1.3, .45, 23.5], l: [0, 3.2, 0], f: 50 }, { p: [1.15, .85, 21.6], l: [0, 5.0, 0], f: 50 }]);
    const c2 = cp(t, 2.3, 4.3, [{ p: [.95, 1.0, 20.2], l: [0, 5.6, 0], f: 46 }, { p: [.85, 1.02, 19.6], l: [0, 5.5, 0], f: 45 }]);
    const cam = t < 2.3 ? c1 : c2;
    return base(t, hand(cam, t, .02), AM([0, 0, 10]), {
      actors: [actor({ id: 'lus', who: 'lustig', t, pos: [.42, 0, z], pose: pz, face, res: 1800, tint: WARM_TINT })],
      fx: [{ kind: 'motes', box: [[-6, 0, 5], [6, 5, 25]], n: 90, seed: 1, color: '#ffe2b0', size: .05, t, alpha: .3 }],
      grade: { focus: Math.hypot(cam.pos[2] - z, cam.pos[1] - 1.4), aperture: t < 2.3 ? 0 : .12, fade: 1 - k01(t, 0, .6) },
    });
  } },
  // 2 ─ 4.30–7.30  "In 1925, a con artist named Victor Lustig"
  { t0: 4.3, t1: 7.3, f: t => {
    const d = (t - 4.3) * 1.25; const z = 64.2 - d; const dirS = 1;   // walking -z, toward screen-right for a camera looking -x
    const tip = gesture(t, 5.55, .45) * (1 - kk(t, 6.3, 6.7));
    let pz = walk(L.lustig, d, dirS);
    if (tip > 0) pz = { ...pz, handA: H(L.lustig, -.05, 1.85) as [number, number], bendA: 3, shapeA: 'hold' };
    const lz = 58.5 + (t - 4.3) * 2.5;
    const ladyP = walk(L.lady, (t - 4.3) * 1.15, -1);
    const cam: Cam = { pos: [-6.4, 1.55, z + 1.6], look: [-11.6, 1.45, z - .6], fov: 40 };
    return base(t, hand(cam, t, .015), AM([-11, 0, z]), {
      actors: [actor({ id: 'lus', who: 'lustig', t, pos: [-11.4, .15, z], pose: pz, face: F('confident', 'slySmile', tip), hatOff: tip * .6, tint: WARM_TINT, res: 1500 }),
        actor({ id: 'lady', who: 'lady', t, pos: [-12.65, .15, lz], pose: ladyP, face: F('calm', 'surprise', tip * .5), tint: WARM_TINT, res: 1000 })],
      overlay: svg(dateCard('PARIS · 1925', t, 4.55, 6.3) + lowerThird('Victor Lustig', 'con artist', t, 6.55, 7.3)),
      grade: { focus: 5, aperture: .35 },
    });
  } },
  // 3 ─ 7.30–10.78 "read that Paris was struggling with the tower's expensive upkeep."
  { t0: 7.3, t1: 10.78, f: t => {
    const vendor = actor({ id: 'ven', who: 'vendor', t, pos: [-10.15, .15, 53.4], pose: pose(t, 5, { turn: -.55, arms: t < 7.95 ? [H(L.vendor, -mix(.25, .5, k01(t, 7.5, 7.9)), mix(.95, 1.2, k01(t, 7.5, 7.9))), H(L.vendor, .25, .95)] : [H(L.vendor, -.25, .95), H(L.vendor, .25, .95)], shapeA: 'hold', bendA: 2 }), face: F('happy', 'calm', .3), heldA: t < 7.95 ? 'newspaper' : undefined, tint: WARM_TINT, res: 1100 });
    if (t < 8.55) {   // buying the paper
      const buy = gesture(t, 7.45, .45), take = gesture(t, 7.9, .4);
      const pz = pose(t, 2, { turn: .55, arms: [H(L.lustig, -.32, 1.0 + .2 * take), H(L.lustig, .45 + .1 * buy, 1.05 + .25 * buy)], shapeA: 'hold', shapeB: 'hold', bendB: -1 });
      const cam = cp(t, 7.3, 8.55, [{ p: [-7.2, 1.55, 58.0], l: [-10.6, 1.35, 54.1], f: 44 }, { p: [-7.6, 1.6, 57.5], l: [-10.6, 1.4, 54.2], f: 42 }]);
      return base(t, hand(cam, t, .012), AM(KIOSK), {
        actors: [actor({ id: 'lus', who: 'lustig', t, pos: [-11.05, .15, 54.9], pose: pz, face: F('calm', 'curious', take), heldB: t < 7.75 ? 'coin' : undefined, heldA: take > .5 ? 'newspaper' : undefined, tint: WARM_TINT, res: 1500 }), vendor],
        grade: { focus: 4.6, aperture: .4 },
      });
    }
    if (t < 9.95) {   // insert: the front page
      const cam = cp(t, 8.55, 9.95, [{ p: [-11.2, 1.92, 55.62], l: [-11.25, 1.18, 55.05], f: 34 }, { p: [-11.24, 1.78, 55.48], l: [-11.27, 1.16, 55.06], f: 30 }]);
      return base(t, cam, AM([-11, 0, 55]), { props: [{ name: 'Newspaper', pos: [-11.12, 1.18, 55.05], rot: [.95, .04, 0] }],
        grade: { focus: .75, aperture: .9 } });
    }
    // lowers the paper: the idea lands
    const low = kk(t, 10.0, 10.45);
    const pz = pose(t, 2, { turn: .05, arms: [H(L.lustig, -.28, mix(1.62, 1.12, low)), H(L.lustig, .3, mix(1.62, 1.12, low))], shapeA: 'hold', shapeB: 'hold' });
    const cam = cp(t, 9.95, 10.78, [{ p: [-11.15, 1.62, 58.2], l: [-11.35, 1.62, 55.4], f: 34 }, { p: [-11.18, 1.64, 57.85], l: [-11.35, 1.63, 55.4], f: 32 }]);
    return base(t, cam, AM([-11, 0, 55]), {
      actors: [actor({ id: 'lus', who: 'lustig', t, pos: [-11.35, .15, 55.4], pose: pz, face: F('curious', 'slySmile', k01(t, 10.25, 10.6)), heldA: 'newspaper', res: 1800, tint: WARM_TINT })],
      grade: { focus: 2.5, aperture: .7 },
    });
  } },
  // 4 ─ 10.78–12.79 "He dressed like a government official,"
  { t0: 10.78, t1: 12.79, f: t => {
    const lap = gesture(t, 10.9, .4) * (1 - kk(t, 11.4, 11.6)); const hat = kk(t, 11.55, 12.15);
    const hatOffK = t < 11.55 ? 1 : 1 - hat; const hatY = 1.86 + hatOffK * .32;   // brim height follows the lifted hat
    const pz = pose(t, 4, { turn: 0, headTilt: -.05 * hat, arms: t > 11.35 && t < 12.3 ? [H(L.lustigGov, -.28, 1.15), H(L.lustigGov, .25, t < 11.55 ? mix(1.1, hatY + .2, k01(t, 11.35, 11.55)) : hatY + .2)] : [H(L.lustigGov, -.16, mix(1.0, 1.42, lap)), H(L.lustigGov, .16, mix(1.0, 1.42, lap))], shapeA: 'hold', shapeB: 'hold', bendA: -1, bendB: 3 });
    const cam = cp(t, 10.78, 12.79, [{ p: [HX - 6.75, 1.6, -2.62], l: [HX - 4.0, 1.5, -2.72], f: 40 }, { p: [HX - 6.62, 1.58, -2.68], l: [HX - 4.0, 1.55, -2.72], f: 34 }]);
    return base(t, cam, ROOM([HX - 5, 0, -2.7]), {
      hideMats: ['mirror'], shafts: { k: .45, set: 'hotel' },
      actors: [actor({ id: 'lusG', who: 'lustigGov', t, pos: [HX - 5.15, 0, -2.72], pose: pz, face: t < 12.2 ? F('focused', 'smug', hat) : F('confident', 'slySmile', k01(t, 12.2, 12.5)), hatOff: hatOffK, res: 1800, tint: ROOM_TINT, flip: true })],
      fx: [{ kind: 'motes', box: [[HX - 6, 0, -4.8], [HX - 2, 3.6, -1]], n: 140, seed: 3, color: '#ffe0a8', size: .025, t, alpha: .5 }],
      grade: { focus: 1.6, aperture: .9 },
    });
  } },
  // 5 ─ 12.79–14.14 "forged official letters,"  (the ministry stamp lands on "official" 13.26)
  { t0: 12.79, t1: 14.14, f: t => {
    const D: V3 = [HX - 4.6, .845, 4.1];
    const hit = 13.28, x = t - hit; const sy0 = x < 0 ? mix(.16, .0, inCubic(k01(t, 12.95, hit))) : x < .25 ? 0 : mix(0, .28, outCubic(k01(t, hit + .25, hit + .6)));
    const stampP: V3 = [D[0] + .02, D[1] + sy0 + .001, D[2] + .03];
    const cam0 = cp(t, 12.79, 14.14, [{ p: [HX - 4.52, 1.38, 3.58], l: [HX - 4.6, .84, 4.08], f: 40 }, { p: [HX - 4.56, 1.26, 3.66], l: [HX - 4.6, .84, 4.1], f: 38 }]);
    const cam = jolt(cam0, t, hit, .008);
    const pr = projector(cam.pos, cam.look, cam.fov);
    return base(t, cam, ROOM(D), {
      props: [{ name: t < hit ? 'Letter0' : 'Letter', pos: D, rot: [0, Math.PI + .06, 0] }, { name: 'Stamp', pos: stampP, rot: [0, .2, 0] }, { name: 'InkPad', pos: [D[0] + .24, D[1], D[2] - .06] },
        { name: 'Pen', pos: [D[0] - .2, D[1], D[2] + .02], rot: [0, .9, 0] }, { name: 'Inkwell', pos: [D[0] - .22, D[1], D[2] - .14] }, { name: 'Envelope', pos: [D[0] + .22, D[1], D[2] + .14], rot: [0, -.2, 0] }],
      fx: x > 0 ? [{ kind: 'puff', at: [D[0], D[1] + .005, D[2]], t: x, n: 26, seed: 5, spread: .09, rise: .02, size: .02, color: '#e8dcc4', alpha: .5, dur: .8 }] : [],
      overlay: svg(ovHand(pr, add3(stampP, [0, .155, 0]), [1150, 200], '#16171c', '#fbf8f0', '#f4f0e6')),
      shafts: { k: .6, set: 'hotel' }, grade: { focus: .62, aperture: 1.0 },
    });
  } },
  // 6 ─ 14.14–16.94 "and summoned scrap metal dealers to a hotel."
  { t0: 14.14, t1: 16.94, f: t => {
    const carZ = DOOR_C + 7.5 + 24 * Math.pow(1 - k01(t, 14.14, 15.0), 2);
    const out = (t0: number, i: number) => { const d = Math.max(0, t - t0) * 1.15; const from: V3 = [-10.0, .15, DOOR_C + 3.4 + i * .9]; const to: V3 = [-13.2, .5, DOOR_C - .2 + i * .5]; const len = Math.hypot(to[0] - from[0], to[2] - from[2]); const k = Math.min(1, d / len); return { p: lerp3(from, to, k), d: Math.min(d, len), moving: d < len && t > t0 }; };   // walk 1.15 m/s
    const a = out(14.6, 0), b = out(15.0, 1);
    const pd = (t - 14.14) * 1.0; const pz0 = DOOR_C - 3.8 + pd; const pp: V3 = [-12.0, .15, Math.min(DOOR_C - .6, pz0)];
    const cam = cp(t, 14.14, 16.94, [{ p: [-.5, 7.2, DOOR_C + 1.2], l: [-13.6, 5.3, DOOR_C + .5], f: 44 }, { p: [-1.0, 2.0, DOOR_C + 1.5], l: [-12.5, 1.55, DOOR_C + .5], f: 52 }], inOut);
    const acts: ActorState[] = [
      actor({ id: 'door', who: 'doorman', t, pos: [-12.0, .3, DOOR_C - 2.2], pose: pose(t, 6, { turn: .35, arms: [H(L.doorman, -.35, 1.0), t > 15.3 ? H(L.doorman, .45, 1.75) : H(L.doorman, .3, 1.0)], shapeB: 'open' }), face: F('calm', 'happy', k01(t, 15.3, 15.8)), tint: WARM_TINT, res: 1100 }),
      actor({ id: 'poi', who: 'poisson', t, pos: pp, pose: pz0 < DOOR_C - .6 ? walk(L.poisson, pd, 1, { carryB: H(L.poisson, .25, 1.15) }) : pose(t, 7, { turn: -.6, arms: [H(L.poisson, -.3, 1.0), H(L.poisson, .25, 1.2)] }), face: F('excited', 'curious', .3), heldB: 'envelope', tint: WARM_TINT, res: 1200 }),
    ];
    if (t > 14.6) acts.push(actor({ id: 'dA', who: 'dealerA', t, pos: a.p, pose: a.moving ? walk(L.dealerA, a.d, -1) : pose(t, 8, { turn: -.6 }), face: F('curious', 'calm', .3), heldA: 'envelope', tint: WARM_TINT, res: 1200 }));
    if (t > 15.0) acts.push(actor({ id: 'dB', who: 'dealerB', t, pos: b.p, pose: b.moving ? walk(L.dealerB, b.d, -1) : pose(t, 9, { turn: -.6 }), face: F('suspicious', 'curious', .5), heldB: 'envelope', tint: WARM_TINT, res: 1200 }));
    return base(t, hand(cam, t, .02), AM([-11, 0, DOOR_C]), { actors: acts, props: [{ name: 'CarA', pos: [-6.6, 0, carZ], rot: [0, Math.PI, 0] }],
      fx: t > 14.9 && t < 15.6 ? [{ kind: 'puff', at: [-6.6, .3, carZ + 2.0], t: t - 14.9, n: 20, seed: 4, spread: .5, rise: .3, size: .25, color: '#d8ccb8', alpha: .3, dur: 1.2 }] : [],
      grade: { focus: 8, aperture: .25 } });
  } },
  // 7 ─ 16.94–19.18 "There, he announced a secret plan."
  { t0: 16.94, t1: 19.18, f: t => {
    const sec = gesture(t, 18.15, .35);
    const lpz = P(pose(t, 3, { turn: -.1, arms: [H(L.lustigGov, -.45, 1.0), H(L.lustigGov, .45, 1.0)], shapeA: 'open', shapeB: 'open', lean: .05 }), pose(t, 3, { turn: -.15, lean: .14, headLift: -.05, arms: [H(L.lustigGov, -.3, .95), H(L.lustigGov, .05, 1.55)], shapeB: 'point', bendB: -1 }), sec);
    const cam = cp(t, 16.94, 19.18, [{ p: [HX - 6.1, 2.75, -3.9], l: [HX + 2.2, .9, .4], f: 46 }, { p: [HX - 4.4, 2.2, -3.1], l: [HX + 2.8, 1.1, .2], f: 42 }]);
    return base(t, cam, ROOM([HX, 0, 0]), { shafts: { k: .3, set: 'hotel' },
      actors: [actor({ id: 'lusG', who: 'lustigGov', t, pos: SEAT.head, pose: lpz, face: talkF(t < 18.15 ? F('confident') : F('slySmile', 'suspicious', .4), t, t < 18.1 ? .5 : 0), hatOff: 1, res: 1500, tint: ROOM_TINT }),
        ...dealersAt(t, id => id === 'poi' ? F('excited', 'curious', .4) : F('curious', 'suspicious', id === 'dB' ? .6 : .2), sec * .6)],
      fx: [{ kind: 'motes', box: [[HX - 6, 0, -4.8], [HX + 6, 4, 4]], n: 160, seed: 7, color: '#ffe0a8', size: .03, t, alpha: .4 }],
      grade: { focus: 7.5, aperture: .3 } });
  } },
  // 8 ─ 19.18–21.38 "The Eiffel Tower was about to be demolished"
  { t0: 19.18, t1: 21.38, f: t => {
    const B: V3 = [HX + 1.6, .787, 0]; const un = outCubic(k01(t, 19.3, 19.95));
    const topple = t - 20.74; const ang = topple < 0 ? 0 : Math.min(Math.PI / 2, 9 * topple * topple) - (topple > .34 ? Math.sin((topple - .34) * 22) * Math.exp(-(topple - .34) * 8) * .08 : 0);
    const MT: V3 = [HX + 1.86, .788, -.12];
    const cam0 = cp(t, 19.18, 21.38, [{ p: [HX + 1.6, 2.15, 1.25], l: [HX + 1.62, .78, -.05], f: 42 }, { p: [HX + 1.7, 1.55, .92], l: [HX + 1.8, .78, -.05], f: 40 }]);
    const cam = jolt(cam0, t, 21.05, .02);
    const pr = projector(cam.pos, cam.look, cam.fov);
    return base(t, cam, ROOM(B), {
      props: [{ name: 'Blueprint', pos: B, rot: [0, 0, 0], scale: [mix(.06, 1, un), 1, 1] }, { name: 'ModelTower', pos: MT, rot: [0, 0, -ang] }, { name: 'Glass', pos: [HX + .5, .787, .45] }, { name: 'Ashtray', pos: [HX + .7, .787, -.5] }],
      fx: topple > .3 && topple < 1.4 ? [{ kind: 'puff', at: [MT[0] + .25, .8, MT[2]], t: topple - .3, n: 30, seed: 9, spread: .18, rise: .05, size: .04, color: '#efe2c8', alpha: .45, dur: 1 }] : [],
      overlay: svg((t < 20.0 ? ovHand(pr, [mix(B[0] - .05, B[0] + .42, un), .79, .05], [1150, 1300], '#16171c', '#fbf8f0', '#f4f0e6', 'flat') + ovHand(pr, [B[0] - .42, .79, .02], [-80, 1350], '#16171c', '#fbf8f0', '#f4f0e6', 'flat') : '') +
        (t > 20.45 && t < 21.0 ? ovHand(pr, [MT[0] - .03, .79 + .35 - ang * .1, MT[2]], [-80, 520], '#16171c', '#fbf8f0', '#f4f0e6', 'flat') : '')),
      shafts: { k: .5, set: 'hotel' }, grade: { focus: Math.hypot(cam.pos[1] - .8, cam.pos[2]) * 1.02, aperture: .9 } });
  } },
  // 9 ─ 21.38–23.74 "and its iron was going to the highest bidder."
  { t0: 21.38, t1: 23.74, f: t => {
    const b1 = gesture(t, 22.1, .3), b2 = gesture(t, 22.62, .3), b3 = gesture(t, 23.1, .3);
    const point = t < 22.6 ? -1 : t < 23.1 ? 1 : -1;
    const lpz = pose(t, 3, { turn: .2, back: 1, arms: [H(L.lustigGov, -.35, 1.0), H(L.lustigGov, .25 + point * .35, 1.55)], shapeB: 'point', bendB: -1, headTurn: point * .3 });
    const cam = cp(t, 21.38, 23.74, [{ p: [HX + 6.85, 3.35, .75], l: [HX - .5, .7, 0], f: 44 }, { p: [HX + 6.7, 3.25, .7], l: [HX - .5, .75, 0], f: 42 }]);
    const raise = (k: number, l: ToonLook, dir: number) => ({ handB: H(l, dir * .22, mix(.8, 1.75, k)) as [number, number], shapeB: (k > .5 ? 'open' : 'hold') as 'open' | 'hold', bendB: 2 });
    return base(t, hand(cam, t, .01), ROOM([HX, 0, 0]), { shafts: { k: .5, set: 'hotel' },
      props: [{ name: 'Blueprint', pos: [HX + 1.6, .787, 0] }, { name: 'ModelTower', pos: [HX + 1.86, .788, -.12], rot: [0, 0, -Math.PI / 2] }],
      actors: [actor({ id: 'lusG', who: 'lustigGov', t, pos: SEAT.head, pose: lpz, face: talkF(F('confident', 'slySmile', .5), t, .5), hatOff: 1, tint: ROOM_TINT }),
        ...dealersAt(t, id => id === 'dA' ? F('excited', 'determined', b1) : id === 'dE' ? F('excited', 'determined', b2) : id === 'dB' ? F('excited', 'happy', b3) : F('curious', 'excited', .3), .3, [],
          { dA: raise(b1, L.dealerA, 1), dE: raise(b2, L.dealerE, -1), dB: raise(b3, L.dealerB, 1) })],
      grade: { focus: 6.4, aperture: .45 } });
  } },
  // 10 ─ 23.74–25.33 "The dealers were stunned,"
  { t0: 23.74, t1: 25.33, f: t => {
    const first = t < 24.55;
    const cam = first ? cp(t, 23.74, 24.55, [{ p: [HX - .15, 1.52, -1.75], l: [HX - .02, 1.3, 1.25], f: 30 }, { p: [HX - .05, 1.5, -1.6], l: [HX, 1.3, 1.25], f: 28 }])
      : cp(t, 24.55, 25.33, [{ p: [HX - 2.55, 1.52, -1.75], l: [HX - 2.4, 1.32, 1.25], f: 30 }, { p: [HX - 2.45, 1.5, -1.6], l: [HX - 2.4, 1.32, 1.25], f: 28 }]);
    const sh = first ? k01(t, 23.95, 24.15) : k01(t, 24.6, 24.75);
    const cig = first ? Math.max(0, t - 24.25) : 0; const mono = !first ? Math.max(0, t - 24.8) : 0;
    const acts = dealersAt(t, () => F('curious', 'shocked', sh), -.2 * sh, ['dE', 'dC'], { dB: { headLift: .12 * sh }, dA: { headLift: .12 * sh } }, first && cig === 0 ? { dB: 'cigar' } : {});
    const ovs = first && cig > 0 ? (() => { const pr = projector(cam.pos, cam.look, cam.fov); const [x, y] = pr([HX + .12, 1.18 - 4.9 * cig * cig, 1.18]); return `<g transform="translate(${x} ${y}) rotate(${cig * 400})"><rect x="-38" y="-9" width="76" height="18" rx="6" fill="#6b3f22" stroke="#16120f" stroke-width="5"/><circle cx="38" r="9" fill="#ff8a3d"/></g>`; })() : '';
    const ovm = mono > 0 ? (() => { const pr = projector(cam.pos, cam.look, cam.fov); const [x, y] = pr([HX - 2.33 + mono * .25, 1.62 + 1.6 * mono - 6 * mono * mono, 1.18]); return `<g transform="translate(${x} ${y}) rotate(${mono * 700})"><circle r="30" fill="rgba(220,235,245,.4)" stroke="#c9a24a" stroke-width="7"/></g>`; })() : '';
    return base(t, jolt(cam, t, first ? 23.95 : 24.6, .01), ROOM([HX, 0, 0]), { actors: acts.map(a => ({ ...a, res: 1800 })), overlay: svg(ovs + ovm), grade: { focus: 3.1, aperture: .8 } });
  } },
  // 11 ─ 25.33–29.80 "but one man, Andre Poisson, believed every word and made an offer."
  { t0: 25.33, t1: 29.8, f: t => {
    const nod = t > 27.2 && t < 28.1 ? Math.sin((t - 27.2) * 14) * .12 * (1 - k01(t, 27.8, 28.1)) : 0;
    const write = t > 28.3 && t < 29.0 ? Math.sin((t - 28.3) * 30) * .04 : 0; const slide = kk(t, 28.95, 29.6);
    const pzo: Partial<Pose> = t < 28.3 ? { headTilt: nod, headLift: .04 * nod } : t < 29.0 ? { handB: H(L.poisson, .32 + write, .82), shapeB: 'hold', headTilt: .12 } : { handB: H(L.poisson, mix(.35, .95, slide), .81), shapeB: 'open', bendB: -1 };
    const cam = cp(t, 25.33, 29.8, [{ p: [HX + 2.15, 1.4, -1.9], l: [HX + 2.4, 1.32, 1.25], f: 34 }, { p: [HX + 2.35, 1.38, -1.15], l: [HX + 2.42, 1.33, 1.25], f: 30 }, { p: [HX + 2.5, 1.55, -1.5], l: [HX + 2.6, 1.1, .9], f: 40 }], t => inOut(t));
    const face = t < 26.0 ? F('curious', 'excited', k01(t, 25.6, 26.0)) : t < 28.3 ? F('excited', 'happy', .3) : F('determined', 'excited', .4);
    return base(t, hand(cam, t, .008), ROOM([HX + 2, 0, 0]), { shafts: { k: .5, set: 'hotel' },
      props: [{ name: 'Cheque', pos: [mix(HX + 2.45, HX + 3.75, slide), .788, mix(.62, .15, slide)], rot: [0, .2 - slide * .3, 0] }, { name: 'Pen', pos: [HX + 2.25, .788, .5], rot: [0, .6, 0], hidden: t > 28.3 && t < 29.0 }, { name: 'Glass', pos: [HX + 1.65, .787, .55] }],
      actors: [...dealersAt(t, id => id === 'poi' ? face : F('suspicious', 'curious', .5), 0, ['dE', 'dC'], { poi: pzo }, { poi: t > 28.3 && t < 29.0 ? 'pen' : undefined }).map(a => ({ ...a, res: a.id === 'poi' ? 2000 : 1100 })),
        actor({ id: 'lusG', who: 'lustigGov', t, pos: SEAT.head, pose: pose(t, 3, { turn: -.45, arms: [H(L.lustigGov, -.35, 1.0), H(L.lustigGov, .3, 1.0)], shapeA: 'hold', shapeB: 'hold' }), face: F('calm', 'slySmile', k01(t, 29.0, 29.5)), hatOff: 1, tint: ROOM_TINT, res: 1500 })],
      overlay: svg(lowerThird('André Poisson', 'scrap-metal dealer', t, 26.1, 28.1)),
      grade: { focus: Math.hypot(cam.pos[2] - 1.25, cam.pos[0] - HX - 2.4), aperture: .7 } });
  } },
  // 12 ─ 29.80–32.10 "Lustig didn't just take the payment."
  { t0: 29.8, t1: 32.1, f: t => {
    const pick = gesture(t, 30.0, .4), tuck = kk(t, 30.55, 30.9), fing = gesture(t, 31.15, .3);
    const arms: [[number, number], [number, number]] = fing > 0 ? [H(L.lustigGov, -.35, 1.0), H(L.lustigGov, .28, mix(1.2, 1.78, fing))] : tuck > 0 ? [H(L.lustigGov, -.35, 1.0), H(L.lustigGov, mix(.3, -.1, tuck), mix(1.05, 1.38, tuck))] : [H(L.lustigGov, -.35, 1.0), H(L.lustigGov, mix(.45, .3, pick), mix(.82, 1.05, pick))];
    const cam = cp(t, 29.8, 32.1, [{ p: [HX + 2.5, 1.55, -1.45], l: [HX + 4.55, 1.5, 0], f: 36 }, { p: [HX + 3.0, 1.6, -1.05], l: [HX + 4.55, 1.62, 0], f: 32 }]);
    return base(t, hand(cam, t, .008), ROOM([HX + 4, 0, 0]), { shafts: { k: .5, set: 'hotel' },
      props: [{ name: 'Cheque', pos: [HX + 3.75, .788, .15], hidden: pick > .3 }],
      actors: [actor({ id: 'lusG', who: 'lustigGov', t, pos: SEAT.head, pose: pose(t, 3, { turn: -.35, arms, shapeB: fing > 0 ? 'point' : 'hold', bendB: -1 }), face: fing > .3 ? F('slySmile', 'smirk', .5) : F('calm', 'smug', pick), heldB: pick > .3 && tuck < .9 ? 'paper' : undefined, hatOff: 1, tint: ROOM_TINT, res: 2000 })],
      grade: { focus: 2.4, aperture: .8 } });
  } },
  // 13 ─ 32.10–36.00 "He hinted that a little extra cash would help seal the deal. Poisson paid,"
  { t0: 32.1, t1: 36.0, f: t => {
    const lean = kk(t, 32.15, 32.6) * (1 - kk(t, 34.0, 34.4)); const rub = t > 33.15 && t < 33.95 ? Math.sin((t - 33.15) * 22) * .04 : 0;
    const wal = gesture(t, 33.95, .35), give = kk(t, 34.25, 34.6), shake = t > 34.65 ? Math.sin((t - 34.65) * 16) * .05 * (1 - k01(t, 35.3, 35.7)) : 0;
    const LP: V3 = [HX + 26.2, 0, .3], PP: V3 = [HX + 27.45, 0, .25];
    const lus = pose(t, 3, { turn: .55, lean: .14 * lean, headTilt: .1 * lean, arms: t < 34.6 ? [H(L.lustig, -.25, 1.0), H(L.lustig, .32, 1.35 + rub)] : [H(L.lustig, -.25, 1.0), H(L.lustig, .55, 1.08 + shake)], shapeB: t < 33.15 ? 'hold' : t < 34.6 ? 'hold' : 'open', bendB: -1 });
    const poi = pose(t, 7, { turn: -.55, lean: -.05 * lean, arms: t < 34.6 ? [H(L.poisson, -mix(.2, .55, give), mix(1.0, 1.15, wal)), H(L.poisson, .25, 1.0)] : [H(L.poisson, -.6, 1.08 + shake), H(L.poisson, .25, 1.0)], shapeA: t > 34.6 ? 'open' : 'hold', bendA: -1 });
    const cam = cp(t, 32.1, 36.0, [{ p: [HX + 23.0, 1.6, -1.4], l: [HX + 26.85, 1.35, .3], f: 44 }, { p: [HX + 23.5, 1.58, -1.38], l: [HX + 26.85, 1.38, .3], f: 41 }]);
    return base(t, hand(cam, t, .01), HALL([HX + 26, 0, 0]), {   // two-shot
      actors: [actor({ id: 'lus', who: 'lustig', t, pos: LP, pose: lus, face: t < 33.1 ? talkF(F('slySmile', 'suspicious', .3), t, .25) : t < 34.6 ? F('smirk', 'slySmile', .5) : F('happy', 'slySmile', .5), heldB: give > .5 && t < 34.65 ? 'cash' : undefined, hatOff: 1, tint: HALL_TINT, res: 1700 }),
        actor({ id: 'poi', who: 'poisson', t, pos: PP, pose: poi, face: t < 33.3 ? F('curious') : t < 33.9 ? F('surprise', 'curious', .4) : t < 34.6 ? F('determined', 'curious', .3) : F('excited', 'happy', .5), heldA: wal > .3 && give < .5 ? 'cash' : undefined, hatOff: 1, tint: HALL_TINT, res: 1700 }),
        actor({ id: 'bell', who: 'porter', t, pos: [HX + 38, 0, -.9], pose: pose(t, 11, { turn: -.5 }), face: F('calm'), tint: HALL_TINT, res: 700 })],
      grade: { focus: 3.2, aperture: .3, exposure: 1.06 } });
  } },
  // 14 ─ 36.00–39.32 "thinking he just bought a scrap-metal prize in Paris."
  { t0: 36.0, t1: 39.32, f: t => {
    const proud = gesture(t, 36.95, .5), frame = gesture(t, 38.15, .4), turn = kk(t, 38.5, 38.95);
    const PP: V3 = [2.0, 0, -293.5];
    const arms: [[number, number], [number, number]] = frame > 0 ? [H(L.poisson, -.3, 1.55), H(L.poisson, .3, 1.6)] : [H(L.poisson, mix(-.3, -.75, proud), mix(1.0, 1.5, proud)), H(L.poisson, mix(.3, .75, proud), mix(1.0, 1.5, proud))];
    const pz = pose(t, 7, { turn: mix(0, .5, turn), back: turn < .5 ? 1 : 0, arms, shapeA: frame > 0 ? 'point' : 'open', shapeB: frame > 0 ? 'point' : 'open', lean: -.05 * proud });
    const cam = cp(t, 36.0, 39.32, [{ p: [2.6, .75, -288.6], l: [0, 64, -460], f: 58 }, { p: [2.4, .8, -289.0], l: [0, 70, -460], f: 56 }]);
    return base(t, hand(cam, t, .02), AM([0, 0, -300], { sun: { dir: [.42, .3, .85], color: '#ffc985', int: 4.4, focus: [0, 0, -300], size: 40 } }), {
      actors: [actor({ id: 'poi', who: 'poisson', t, pos: PP, pose: pz, face: F('excited', 'happy', frame), res: 1700, tint: WARM_TINT })],
      fx: [{ kind: 'motes', box: [[-8, 0, -296], [10, 6, -282]], n: 70, seed: 12, color: '#ffe2b0', size: .06, t, alpha: .35 }],
      grade: { focus: 6, aperture: .3 } });
  } },
  // 15 ─ 39.32–40.68 "Then Lustig vanished."
  { t0: 39.32, t1: 40.68, f: t => {
    const d = (t - 39.32) * 2.1; const LP: V3 = [HX + 11.5 + d, 0, .15];
    const tro = mix(1.25, -1.6, k01(t, 39.85, 40.55)); const gone = t > 40.25;
    const cam = cp(t, 39.32, 40.68, [{ p: [HX + 8.2, 1.62, .1], l: [HX + 20, 1.45, .1], f: 40 }, { p: [HX + 9.6, 1.6, .1], l: [HX + 20, 1.45, .1], f: 40 }]);
    const acts: ActorState[] = [actor({ id: 'port', who: 'porter', t, pos: [HX + 16.2, 0, tro + .55], pose: walk(L.porter, (t - 39.85) * 2.4, -1, { carryB: H(L.porter, .45, 1.0) }), face: F('calm'), tint: HALL_TINT, res: 1100 })];
    if (!gone) acts.push(actor({ id: 'lus', who: 'lustig', t, pos: LP, pose: walkFront(L.lustig, d, true), face: F('smirk'), heldB: 'suitcase', tint: HALL_TINT, res: 1100 }));
    return base(t, cam, HALL([HX + 16, 0, 0]), { actors: acts, props: [{ name: 'Trolley', pos: [HX + 16.2, 0, tro], rot: [0, Math.PI / 2, 0] }],
      fx: t > 40.25 ? [{ kind: 'puff', at: [HX + 13.9, .9, .1], t: t - 40.25, n: 24, seed: 2, spread: .4, rise: .5, size: .2, color: '#e6d4b8', alpha: .25, dur: .8 }] : [],
      shafts: { k: .8, set: 'corridor' }, grade: { focus: 6, aperture: .3, exposure: 1.06 } });
  } },
  // 16 ─ 40.68–43.03 "When Poisson realized the papers were fake,"
  { t0: 40.68, t1: 43.03, f: t => {
    const sus = k01(t, 41.3, 41.9), shock = k01(t, 42.5, 42.7);
    const cam0 = cp(t, 40.68, 42.5, [{ p: [HX + .05, 1.45, -4.55], l: [HX, 1.38, -3.6], f: 40 }, { p: [HX + .03, 1.45, -4.45], l: [HX, 1.4, -3.6], f: 36 }]);
    const cam: Cam = t < 42.5 ? cam0 : { pos: [HX + .03, 1.45, mix(-4.45, -4.75, outCubic(k01(t, 42.5, 43.0)))], look: [HX, 1.42, -3.6], fov: mix(36, 24, outCubic(k01(t, 42.5, 43.0))) };
    const pz = pose(t, 7, { turn: 0, headTilt: -.06 * sus, arms: [H(L.poisson, -.22, mix(1.25, 1.35, sus)), H(L.poisson, .22, mix(1.25, 1.35, sus))], shapeA: 'hold', shapeB: 'hold', headLift: .1 * shock });
    return base(t, cam, ROOM([HX, 0, -3.6], { sun: { dir: [.15, .45, -.88], color: '#ffd9a8', int: 3.6, focus: [HX, 0, -3.6], size: 6 } }), {
      actors: [actor({ id: 'poi', who: 'poisson', t, pos: [HX, 0, -3.6], pose: pz, face: t < 41.3 ? F('happy', 'calm', .4) : t < 42.5 ? F('curious', 'worried', sus) : F('shocked', 'terrified', shock * .6), heldA: 'papers', hatOff: 1, res: 2000, tint: [1.02, .95, .86] })],
      shafts: { k: 1, set: 'hotel' }, grade: { focus: .9, aperture: 1.0, flash: t > 42.5 ? .25 * (1 - k01(t, 42.5, 42.8)) : 0 } });
  } },
  // 17 ─ 43.03–45.32 "he was too embarrassed to report the scam."
  { t0: 43.03, t1: 45.32, f: t => {
    const d = Math.min(3.9, (t - 43.03) * 1.6); const at = d >= 3.9;
    const knock = gesture(t, 43.75, .3), freeze = k01(t, 44.0, 44.2), away = k01(t, 44.6, 45.32);
    const PP: V3 = away > 0 ? [12.6 - away * .9, .15, -37.0 + away * 1.6] : [mix(10.4, 12.6, d / 3.9), .15, mix(-33.6, -37.0, d / 3.9)];
    let pz: Pose = !at ? walk(L.poisson, d, 1) : pose(t, 7, { turn: .7, arms: [H(L.poisson, -.2, 1.0), H(L.poisson, .5, mix(1.0, 1.65, knock))], shapeB: 'fist', bendB: -1, headTurn: freeze > 0 && away === 0 ? Math.sin((t - 44.2) * 6) * .6 : 0 });
    if (away > 0) pz = { ...walk(L.poisson, away * 2.0, -1), handA: H(L.poisson, -.05, 1.82) as [number, number], bendA: 3 };
    const cam = cp(t, 43.03, 45.32, [{ p: [3.4, 1.7, -31.0], l: [12.6, 2.1, -37.2], f: 42 }, { p: [4.6, 1.65, -32.4], l: [12.6, 2.05, -37.4], f: 38 }]);
    return base(t, hand(cam, t, .015), AM(POL), {
      actors: [actor({ id: 'poi', who: 'poisson', t, pos: PP, pose: pz, face: away > 0 ? F('sad', 'worried', .4) : freeze > 0 ? { ...F('worried', 'shocked', .3), blush: freeze, sweat: freeze } : F('determined'), hatOff: 0, res: 1500, tint: WARM_TINT }),
        actor({ id: 'pass', who: 'lady', t, pos: [mix(9.6, 11.0, k01(t, 43.0, 45.3)), .15, mix(-44, -40, k01(t, 43.0, 45.3))], pose: walk(L.lady, (t - 43) * 1.1, 1), face: F('suspicious', 'calm', .5), tint: WARM_TINT, res: 900 })],
      grade: { focus: 10, aperture: .3 } });
  } },
  // 18 ─ 45.32–46.52 "But here's the twist."
  { t0: 45.32, t1: 46.52, f: t => {
    const clear = kk(t, 45.6, 46.3); const step = k01(t, 45.75, 46.2);
    const LP: V3 = [SX - mix(-.1, .6, step), mix(1.35, .9, Math.min(1, step * 1.6)), 3.2];
    const cam = cp(t, 45.32, 46.52, [{ p: [SX - 2.4, 1.35, 9.6], l: [SX - .4, 1.9, 3.0], f: 40 }, { p: [SX - 2.2, 1.4, 8.6], l: [SX - .4, 2.0, 3.0], f: 38 }]);
    return base(t, cam, STATION([SX, 0, 0]), { clockMin: 11 * 60 + 25, shafts: { k: .9, set: 'station' },
      actors: [actor({ id: 'lus', who: 'lustig', t, pos: LP, pose: step < 1 ? pose(t, 2, { turn: -.5, crouch: .1 * Math.sin(step * Math.PI), arms: [H(L.lustig, -.35, 1.0), H(L.lustig, .35, 1.0)] }) : pose(t, 2, { turn: -.3 }), face: F('smirk', 'slySmile', step), heldB: 'suitcase', tint: ST_TINT, res: 1500 })],
      fx: [{ kind: 'puff', at: [SX - .8, 1.0, 4.5], t: t - 44.6, n: 90, seed: 31, spread: 2.6, rise: 2.4, size: 1.3, color: '#f2ece2', alpha: .75 * (1 - clear * .85), dur: 6 }],
      overlay: svg(flashW(.35 * (1 - k01(t, 45.32, 45.55)))), grade: { focus: 6.5, aperture: .35, whip: 1 - k01(t, 45.32, 45.5) } });
  } },
  // 19 ─ 46.52–50.28 "Lustig returned to Paris and tried to sell the Eiffel Tower again."
  { t0: 46.52, t1: 50.28, f: t => {
    if (t < 47.95) {
      const d = (t - 46.4) * 1.3; const tip = gesture(t, 47.45, .4) * (1 - kk(t, 47.8, 47.95));
      const cam = cp(t, 46.52, 47.95, [{ p: [SX - 1.0, 2.25, -3.2], l: [SX - .9, 1.9, 3.5], f: 42 }, { p: [SX - 1.0, 2.15, -2.2], l: [SX - .9, 1.9, 3.0], f: 40 }]);
      const pz = walkFront(L.lustig, d); if (tip > 0) { pz.handA = H(L.lustig, -.05, 1.9); pz.bendA = 3; }
      return base(t, hand(cam, t, .01), STATION([SX, 0, 0]), { clockMin: 11 * 60 + 26, shafts: { k: .9, set: 'station' },
        actors: [actor({ id: 'lus', who: 'lustig', t, pos: [SX - .9, .9, 2.9 - d], pose: pz, face: F('confident', 'slySmile', tip), hatOff: tip * .6, heldB: 'suitcase', tint: ST_TINT, res: 1500 }),
          actor({ id: 'port', who: 'porter', t, pos: [SX - 4.5, .9, -1.2], pose: pose(t, 11, { turn: .3 }), face: F('calm'), tint: ST_TINT, res: 900 })],
        fx: [{ kind: 'puff', at: [SX + .2, 4.4, -12], t: t - 44.0, n: 40, seed: 33, spread: 3, rise: 4, size: 1.6, color: '#efe8de', alpha: .45, dur: 7 }],
        grade: { focus: 4.5, aperture: .3 } });
    }
    // déjà vu: new dealers, same blueprint
    const un = outCubic(k01(t, 48.1, 48.7)); const gest = gesture(t, 49.3, .45);
    const cam = cp(t, 47.95, 50.28, [{ p: [HX - 5.6, 2.6, .8], l: [HX + 3, 1.1, -.2], f: 46 }, { p: [HX - 4.9, 2.4, .7], l: [HX + 3, 1.15, -.2], f: 43 }]);
    const lpz = gest > 0 ? pose(t, 3, { turn: -.25, headTurn: -.4, arms: [H(L.lustigGov, -.75, 1.6), H(L.lustigGov, .35, 1.0)], shapeA: 'open', bendA: -1 }) : pose(t, 3, { turn: -.1, lean: .15, arms: [H(L.lustigGov, -.35, .82), H(L.lustigGov, .35, .82)], shapeA: 'open', shapeB: 'open', bendA: 2, bendB: 2 });
    return base(t, cam, ROOM([HX, 0, 0]), { shafts: { k: .8, set: 'hotel' },
      props: [{ name: 'Blueprint', pos: [HX + 2.4, .787, 0], scale: [mix(.06, 1, un), 1, 1] }],
      actors: [actor({ id: 'lusG', who: 'lustigGov', t, pos: SEAT.head, pose: lpz, face: talkF(F('confident', 'slySmile', .4), t, .45), hatOff: 1, tint: ROOM_TINT }),
        actor({ id: 'dD', who: 'dealerD', t, pos: SEAT.Poi, pose: seated(L.dealerD, t, 4, 1), face: F('suspicious', 'curious', .3), tint: ROOM_TINT, res: 1100 }),
        actor({ id: 'dF', who: 'dealerF', t, pos: SEAT.B, pose: seated(L.dealerF, t, 5, 1), face: F('curious', 'excited', .4), tint: ROOM_TINT, res: 1100 }),
        actor({ id: 'dG', who: 'dealerG', t, pos: SEAT.G, pose: seated(L.dealerG, t, 6, -1), face: F('curious'), tint: ROOM_TINT, res: 1100 })],
      grade: { focus: 4.5, aperture: .3 } });
  } },
  // 20 ─ 50.28–53.00 "This time his trick failed, and he fled France."
  { t0: 50.28, t1: 53.0, f: t => {
    if (t < 52.1) {
      const up = kk(t, 50.3, 50.6), pt = gesture(t, 50.85, .3), cop = k01(t, 51.05, 51.6), run = Math.max(0, t - 51.75);
      const cam = cp(t, 50.28, 52.1, [{ p: [HX - 5.8, 1.6, 3.4], l: [HX + 4.2, 1.35, -.4], f: 40 }, { p: [HX - 5.4, 1.55, 3.2], l: [HX + 4.4, 1.4, -.3], f: 38 }]);
      const dD = up < 1 ? seated(L.dealerD, t, 4, 1, { crouch: mix((L.dealerD.leg - .48 / UNIT) / sy(L.dealerD), 0, up) }) : pose(t, 4, { turn: .55, arms: [H(L.dealerD, -.3, 1.0), H(L.dealerD, mix(.3, .8, pt), mix(1.0, 1.55, pt))], shapeB: 'point', bendB: -1, lean: .06 });
      const LP: V3 = run > 0 ? [HX + 4.55 - run * 4.2, 0, -run * 1.6] : SEAT.head;
      const lpz = run > 0 ? walkPose(run * 4.2 / (UNIT * sy(L.lustigGov)), -1, { step: .8 }) : pose(t, 3, { turn: -.2, headTurn: cop > .2 ? .7 : 0, arms: [H(L.lustigGov, -.45, mix(1.0, 1.5, cop)), H(L.lustigGov, .45, mix(1.0, 1.5, cop))], shapeA: 'open', shapeB: 'open' });
      const gend = actor({ id: 'gen', who: 'gendarme', t, pos: [mix(HX + 7.6, HX + 6.3, cop), 0, .05], pose: pose(t, 13, { turn: -.4, arms: [H(L.gendarme, -.4, 1.1), H(L.gendarme, .12, 1.55)], shapeB: 'hold', bendB: -1 }), face: F('angry', 'shout', .5), tint: ROOM_TINT, res: 1300 });
      return base(t, jolt(hand(cam, t, .01), t, 51.1, .02), ROOM([HX, 0, 0]), { shafts: { k: .8, set: 'hotel' },
        props: [{ name: 'Blueprint', pos: [HX + 2.4, .787, 0] }],
        actors: [actor({ id: 'lusG', who: 'lustigGov', t, pos: LP, pose: lpz, face: cop > .2 ? F('shocked', 'terrified', .4) : F('confident', 'worried', pt), hatOff: 1, tint: ROOM_TINT, res: 1400 }),
          actor({ id: 'dD', who: 'dealerD', t, pos: SEAT.Poi, pose: dD, face: F('suspicious', 'angry', pt), tint: ROOM_TINT, res: 1300 }),
          actor({ id: 'dF', who: 'dealerF', t, pos: SEAT.B, pose: seated(L.dealerF, t, 5, 1), face: F('curious', 'shocked', cop), tint: ROOM_TINT, res: 1100 }),
          actor({ id: 'dG', who: 'dealerG', t, pos: SEAT.G, pose: seated(L.dealerG, t, 6, -1), face: F('surprise', 'shocked', cop), tint: ROOM_TINT, res: 1100 }), ...(cop > 0 ? [gend] : [])],
        grade: { focus: 8, aperture: .25 } });
    }
    // the train pulls out: Lustig waves from the carriage door
    const go = t - 52.1, dz = -.9 * go * go - .6 * go;
    const cam = cp(t, 52.1, 53.0, [{ p: [SX - 3.6, 1.8, 14], l: [SX + 1.4, 2.4, -2], f: 40 }, { p: [SX - 3.4, 1.85, 13.2], l: [SX + 1.4, 2.5, -4], f: 40 }]);
    const wave = Math.sin(go * 14) * .25;
    return base(t, hand(cam, t, .015), STATION([SX, 0, 0]), { clockMin: 11 * 60 + 40, shafts: { k: .9, set: 'station' }, xform: { Train: { pos: [0, 0, dz] } },
      actors: [actor({ id: 'lus', who: 'lustig', t, pos: [SX + .5, 1.15, 2.55 + dz], pose: pose(t, 2, { turn: -.6, arms: [H(L.lustig, -.3, 1.0), H(L.lustig, -.45 + wave, 1.95)], shapeB: 'open', bendB: -1 }), face: F('laugh', 'slySmile', .3), hatOff: .9, tint: ST_TINT, res: 1300 })],
      fx: [{ kind: 'puff', at: [SX + 2, 4.6, -26.6 + dz], t: go + 1.2, n: 60, seed: 41, spread: 2.5, rise: 5, size: 1.8, color: '#f0eadf', alpha: .55, dur: 6 }, { kind: 'puff', at: [SX + .3, .7, -22 + dz], t: go + .8, n: 40, seed: 42, spread: 3, rise: 1, size: 1.2, color: '#f6f1ea', alpha: .5, dur: 4 }],
      grade: { focus: 12, aperture: .2 } });
  } },
  // 21 ─ 53.00–54.76 "The tower never moved an inch,"
  { t0: 53.0, t1: 54.76, f: t => {
    const cam = cp(t, 53.0, 54.76, [{ p: [-30, 2.2, -228], l: [0, 120, -460], f: 50 }, { p: [-27, 9, -236], l: [0, 135, -460], f: 48 }], smooth);
    return base(t, cam, DUSK([0, 0, -300]), { fx: [{ kind: 'motes', box: [[-40, 0, -250], [-15, 12, -220]], n: 80, seed: 51, color: '#ffd9a0', size: .08, t, alpha: .3 }],
      overlay: svg(fadeBlack(.0)), grade: { exposure: 1.0, gain: [1.08, .98, .9] } });
  } },
  // 22 ─ 54.76–57.35 "but one man had made a fortune selling what wasn't his."
  { t0: 54.76, t1: 57.35, f: t => {
    const go = t - 52.1, dz = -.9 * Math.min(go, 2.6) ** 2 - .6 * go;   // the train keeps rolling (continuity with shot 20)
    const winZ = -8.5 + 1.6 + 2 * 2.3 + .7 + dz;
    const W: V3 = [SX + 1.05, 1.42, winZ];
    const count = t > 55.3 && t < 56.3 ? Math.sin((t - 55.3) * 26) * .04 : 0; const look = k01(t, 56.2, 56.6); const tip = gesture(t, 56.85, .4);
    const pz = seated(L.lustig, t, 2, -1, { turn: mix(-.5, -.12, look), handA: H(L.lustig, -.3, 1.08 + count), handB: tip > 0 ? H(L.lustig, -.05, 1.92) : H(L.lustig, -.04, 1.06 - count), shapeA: 'hold', shapeB: 'hold', bendB: tip > 0 ? 3 : 2 });
    const cam: Cam = { pos: [SX - 1.55 + kk(t, 54.76, 57.35) * .35, 2.78, winZ + .12], look: [SX + 1.2, 2.72, winZ], fov: mix(34, 30, kk(t, 54.76, 57.35)) };
    return base(t, cam, STATION([SX, 0, winZ], { amb: ['#ffe8cc', .3] }), { clockMin: 11 * 60 + 41, xform: { Train: { pos: [0, 0, dz] } },
      actors: [actor({ id: 'lus', who: 'lustig', t, pos: W, pose: pz, face: t < 56.2 ? F('happy', 'slySmile', .4) : F('slySmile', 'smirk', tip), heldA: 'cash', heldB: tip > 0 ? undefined : 'cash', hatOff: tip > 0 ? Math.sin(Math.min(1, tip) * Math.PI) * .7 : 0, res: 1800, tint: [1.0, .94, .86] })],
      grade: { focus: Math.hypot(cam.pos[0] - W[0], cam.pos[2] - winZ), aperture: .4, exposure: 1.06 } });
  } },
  // 23 ─ 57.35–60.00 bookend: the avenue at dusk, the tower that never moved
  { t0: 57.35, t1: 60.0, f: t => {
    const cam = cp(t, 57.35, 60.0, [{ p: [.8, 1.6, 30], l: [0, 60, -460], f: 46 }, { p: [.6, 1.65, 26.5], l: [0, 62, -460], f: 44 }], smooth);
    return base(t, cam, DUSK([0, 0, 10], { sun: { dir: [.35, .12, .93], color: '#ff9e5a', int: 3.4, focus: [0, 0, 10], size: 40 } }), {
      fx: [{ kind: 'motes', box: [[-6, 0, 10], [6, 6, 28]], n: 60, seed: 61, color: '#ffcf90', size: .05, t, alpha: .3 }],
      overlay: svg(fadeBlack(k01(t, 59.2, 60.0))), grade: { gain: [1.08, .97, .9], vignette: .45 } });
  } },
];

export function frameAt(frame: number): Frame8 {
  const t = Math.min(frame, FRAMES - 1) / FPS; const s = S.find(x => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
  const Fr = s.f(t); Fr.t = t; return Fr;
}
export const SHOTS = S.map(s => [s.t0, s.t1]);
