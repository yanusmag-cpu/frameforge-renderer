// "What if you were the size of an ant?" — 60.0 s / 1800 frames, bedroom at ×350 (1 unit = 1 m for a 5 mm person).
// Narration part 1 at +0.3 s, part 2 at +29.73 s (0.8 s held on the spider cliffhanger). Visuals never run ahead of the words.
import type { V3, Light } from '../brazil/engine.ts';
import type { ActorState } from '../brazil/actor.ts';
import type { Pose } from '../ff2d/rig.ts';
import type { Frame7 } from './engine7.ts';
import type { CreatureState } from '../dino/creatures.ts';
import { pose, P, F, camPath, add3, inOut, mix, gesture, type CamKey } from '../brazil/anim.ts';
import { walkPose } from '../ff2d/rig.ts';
import { runPose, runBob, jumpPose, sitPose, lyingPose, stumblePose, climbPose, fallPose, hidePose } from '../ff2d/moves.ts';
import { clamp, smooth, noise1 } from '../ff2d/motion.ts';
import { UNIT } from '../brazil/actor.ts';
import { svg, pop, projector, pin } from '../brazil/overlay.ts';

export const FPS = 30, DURATION = 60, FRAMES = 1800;
const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const cp = (t: number, t0: number, t1: number, keys: CamKey[], e = inOut) => camPath(t, t0, t1, keys, e);
const HERO = { outfit: 'hoodie' as const, color: '#d8262b', pants: '#151515' };
const hero = (o: Partial<ActorState> & { pose: Pose; pos: V3; t: number }): ActorState => ({ id: 'hero', look: HERO, seed: 1, res: 1536, face: F('curious'), ...o });
const shake = (c: { pos: V3; look: V3; fov: number }, t: number, a: number) => a <= 0 ? c : { ...c, pos: add3(c.pos, [noise1(t * 21, 1) * a, noise1(t * 23, 2) * a, noise1(t * 19, 3) * a]), look: add3(c.look, [noise1(t * 17, 4) * a * .5, noise1(t * 18, 5) * a * .5, 0]) };
const sdir = (cam: { pos: V3; look: V3 }, a: V3, b: V3) => { const fx = cam.look[0] - cam.pos[0], fz = cam.look[2] - cam.pos[2]; return Math.sign((b[0] - a[0]) * fz - (b[2] - a[2]) * fx) || 1; };
// places (units = metres at the hero's scale)
const A: V3 = [0, 0, 0], DROP: V3 = [25, 0, -10], SHOE: V3 = [60, 0, 40], LEG: V3 = [25, 0, 245], CRUMB: V3 = [128, 0, 64];
// light: warm sunbeam through the window (behind -z), soft room bounce
type L3 = [string, string, number];
const ROOM = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#f6e3c4', '#f6e3c4'], sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.2, focus, size: 60 }, hemi: ['#ffe8cc', '#7a5a40', .55] as L3, amb: ['#ffe2c0', .1],
  fog: ['#e9d2b2', .0016], env: .9, sunGlow: 0, ...o });
const UNDER = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#2a2018', '#2a2018'], sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 3.6, focus, size: 80 }, hemi: ['#6a5040', '#1a120c', .32] as L3, amb: ['#b08a60', .05],
  fog: ['#1c140e', .006], env: .4, sunGlow: 0, points: [{ pos: add3(focus, [0, 12, -30]), color: '#ffcf96', int: 900, dist: 70 }], ...o });
const sub = (s: string, t: number, t0: number, out = 99, y = 330, size = 62, color = '#fff') => pop(s, 540, y, size, t, t0, { color, out });
function ruler(t: number, t0: number, out: number) {
  const k = k01(t, t0, t0 + .4) * (1 - k01(t, out, out + .3)); if (k <= 0) return ''; let ticks = '';
  for (let i = 0; i <= 10; i++) ticks += `<path d="M${240 + i * 60} 1300 v${i % 5 === 0 ? -50 : -28}" stroke="#2a1a0a" stroke-width="5"/>`;
  return `<g opacity="${k}" filter="url(#sh)"><rect x="210" y="1220" width="660" height="110" rx="10" fill="#f4d58a" stroke="#2a1a0a" stroke-width="5"/>${ticks}<text x="540" y="1400" text-anchor="middle" font-size="48" font-weight="900" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">5 MILLIMETRES TALL</text>
    <rect x="240" y="1245" width="${300 * k01(t, t0 + .2, t0 + .9)}" height="20" fill="#d8262b"/></g>`;
}
const antIcon = (x: number, y: number, s: number) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="-40" cy="0" rx="34" ry="24" fill="#2a1410"/><ellipse cx="6" cy="-4" rx="22" ry="16" fill="#8a2a12"/><circle cx="42" cy="-10" r="18" fill="#2a1410"/><path d="M-10 6 l-24 34 M2 8 l0 38 M14 6 l22 34 M-10 -12 l-26 -30 M14 -14 l20 -28 M50 -24 q12 -30 34 -30" stroke="#2a1410" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
function danger(t: number, t0: number, out: number) {
  const k = k01(t, t0, t0 + .3) * (1 - k01(t, out, out + .3)); if (k <= 0) return '';
  const lion = `<g transform="translate(330 1300)"><circle r="78" fill="#c88a2a"/><circle r="52" fill="#e8b45a"/><circle cx="-18" cy="-10" r="7" fill="#2a1a0a"/><circle cx="18" cy="-10" r="7" fill="#2a1a0a"/><path d="M-12 18 q12 12 24 0" stroke="#2a1a0a" stroke-width="5" fill="none"/></g>`;
  const shark = `<g transform="translate(750 1300)"><path d="M-110 10 Q-20 -60 90 -6 L130 -40 L120 10 L130 52 L90 22 Q-20 70 -110 10Z" fill="#7a8a9a"/><path d="M-10 -36 L10 -92 L30 -30Z" fill="#7a8a9a"/><circle cx="-70" cy="0" r="7" fill="#111"/></g>`;
  const x = (cx: number, t1: number) => t < t1 ? '' : `<path d="M${cx - 90} 1210 L${cx + 90} 1390 M${cx + 90} 1210 L${cx - 90} 1390" stroke="#ff3a2a" stroke-width="22" stroke-linecap="round" opacity="${k01(t, t1, t1 + .15)}"/>`;
  return `<g opacity="${k}" filter="url(#sh)">${lion}${shark}${x(330, 18.43)}${x(750, 18.88)}</g>`;
}
function forces(t: number, t0: number, out: number) {
  const k = k01(t, t0, t0 + .3) * (1 - k01(t, out, out + .3)); if (k <= 0) return ''; const air = k01(t, 34.98, 35.4);
  return `<g opacity="${k}" filter="url(#sh)"><path d="M300 1150 v${120}" stroke="#ffd34d" stroke-width="16"/><path d="M276 1260 l24 40 24 -40z" fill="#ffd34d"/><text x="300" y="1360" text-anchor="middle" font-size="36" font-weight="900" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">TINY WEIGHT</text>
    <g opacity="${air}"><path d="M780 1340 v${-200 * air}" stroke="#7ff3ff" stroke-width="30"/><path d="M742 ${1150 - 200 * air + 200} l38 -60 38 60z" fill="#7ff3ff" transform="translate(0 ${-0})"/><text x="780" y="1400" text-anchor="middle" font-size="36" font-weight="900" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">AIR RESISTANCE</text></g></g>`;
}
function cells(t: number, t0: number, out: number) {
  const k = k01(t, t0, t0 + .4) * (1 - k01(t, out, out + .3)); if (k <= 0) return ''; let c = '';
  for (let i = 0; i < 6; i++) c += `<circle cx="${280 + (i % 3) * 120}" cy="${1250 + Math.floor(i / 3) * 120}" r="52" fill="#ff9aa8" stroke="#fff" stroke-width="5"/><circle cx="${280 + (i % 3) * 120}" cy="${1250 + Math.floor(i / 3) * 120}" r="16" fill="#a83a52"/>`;
  return `<g opacity="${k}" filter="url(#sh)">${c}<text x="780" y="1290" text-anchor="middle" font-size="40" font-weight="900" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">CELLS DON'T</text><text x="780" y="1345" text-anchor="middle" font-size="40" font-weight="900" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">SHRINK WITH YOU</text></g>`;
}
const blackOpen = (t: number) => { const k = .86 * (1 - k01(t, .15, .95)); return k <= 0 ? '' : `<rect width="1080" height="${960 * k}" fill="#000"/><rect y="${1920 - 960 * k}" width="1080" height="${960 * k}" fill="#000"/>`; };

type Shot = { t0: number; t1: number; f: (t: number) => Frame7 };
const S: Shot[] = []; const shot = (t0: number, t1: number, f: Shot['f']) => S.push({ t0, t1, f });
const ANT0 = (t: number, o: Partial<CreatureState>): CreatureState => ({ id: 'ant', kind: 'ant', pos: [0, 0, 0], yaw: 0, t, ...o });
const SPI = (t: number, o: Partial<CreatureState>): CreatureState => ({ id: 'spider', kind: 'spider', pos: [0, 0, 0], yaw: 0, t, ...o });

// 1. WAKE AMONG GIANT FIBRES (0 – 4.3): eyes open, sit up, the scale sinks in
shot(0, 4.3, t => {
  const sit = smooth(k01(t, .95, 1.6)); const stand = smooth(k01(t, 2.4, 3.0));
  const cam = cp(t, 0, 4.3, [{ p: [1.6, 1.0, 3.2], l: [0, .5, 0], f: 46 }, { p: [2.0, 1.4, 4.2], l: [0, .8, 0], f: 46 }, { p: [3.4, 4.6, 8], l: [0, 1.4, 0], f: 50 }], x => inOut(x));
  const pz = stand > 0 ? P(sitPose(-1, 0), pose(t, 1, { headTurn: Math.sin(t * 2) * .5, arms: [[-.8, -2.2], [.8, -2.3]], shapeA: 'open', shapeB: 'open' }), stand) : sit > .5 ? sitPose(-1, 0, { headTurn: -.2 }) : lyingPose(sit * 2);
  return { t, cam, light: ROOM(A, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.2, focus: A, size: 12 } }), cut: null, motes: .8, rays: { k: .8, at: [0, 0, -10], spread: 40 },
    actors: [hero({ pose: pz, roll: sit < .5 ? Math.PI / 2 : 0, pos: sit < .5 ? [0, .25, 0] : A, t, face: t < 1 ? F('tired') : t < 2.2 ? F('confused') : F('shocked', 'terrified', .3), res: 2048 })],
    overlay: svg(blackOpen(t) + ruler(t, 1.5, 3.8) + (t > 3.9 ? `<g filter="url(#sh)" opacity="${k01(t, 3.9, 4.1)}">${antIcon(540, 1150, 1.6)}<text x="540" y="1290" text-anchor="middle" font-size="54" font-weight="900" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke">≈ AN ANT</text></g>` : '')),
    grade: { bloom: .45, gain: [1.06, 1.0, .92], vignette: .45, aperture: .8, focus: Math.hypot(cam.pos[0], cam.pos[1] - 1, cam.pos[2]) } };
});
// 2. YOUR BEDROOM BECOMES A WILDERNESS (4.3 – 6.7): crane up — sofa mountains, the bed cliff, the window sun
shot(4.3, 6.7, t => {
  const cam = cp(t, 4.3, 6.7, [{ p: [3.4, 4.6, 8], l: [0, 1.4, 0], f: 50 }, { p: [-30, 40, 120], l: [60, 60, -300], f: 58 }, { p: [-60, 120, 260], l: [80, 90, -400], f: 62 }]);
  return { t, cam, light: ROOM([0, 0, 0], { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.2, focus: [100, 0, 0], size: 500 } }), cut: null, motes: .6, rays: { k: 1.2, at: [-100, 0, -300], spread: 400, len: 1200 },
    actors: [hero({ pose: pose(t, 1, { headLift: .15, back: 1, arms: [[-.6, -1.9], [.6, -1.9]] }), pos: A, t, face: F('amazed') })],
    overlay: svg(sub('YOUR BEDROOM', t, 4.64, 99, 300, 66, '#ffd34d') + sub('BECOMES A WILDERNESS', t, 6.1, 99, 390, 58)), grade: { bloom: .55, gain: [1.08, 1.0, .9], vignette: .4 } };
});
// 3. CARPET FIBRES TOWER ABOVE YOU (6.7 – 8.65): worm's-eye between the strands as he walks
shot(6.7, 8.65, t => {
  const d = (t - 6.7) * 1.4; const hp: V3 = [mix(2, 16, k01(t, 6.7, 8.65)), 0, mix(1, -6, k01(t, 6.7, 8.65))];
  const cam = { pos: add3(hp, [-2.6, .35, 3.4]), look: add3(hp, [1.2, 2.6, -2]), fov: 58 };
  return { t, cam, light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.2, focus: hp, size: 14 } }), cut: null, motes: 1, rays: { k: 1, at: add3(hp, [0, 0, -8]), spread: 20, len: 60 },
    actors: [hero({ pose: walkPose(d / UNIT, sdir(cam, [2, 0, 1], [16, 0, -6])), pos: hp, t, face: F('amazed', 'curious', .4) })],
    overlay: svg(sub('CARPET FIBRES TOWER ABOVE YOU', t, 6.78, 99, 330, 50)), grade: { bloom: .55, gain: [1.08, 1.0, .9], vignette: .45, aperture: .8, focus: 4 } };
});
// 4. A DROPLET LIKE A GIANT GLASS DOME (8.65 – 11.75)
shot(8.65, 11.75, t => {
  const hp: V3 = [mix(18, 22.4, smooth(k01(t, 8.65, 10.2))), 0, mix(-6, -9.2, smooth(k01(t, 8.65, 10.2)))]; const reach = gesture(t, 10.45, .5);
  const cam = cp(t, 8.65, 11.75, [{ p: [17, 1.5, -2.5], l: [24.5, 1.1, -10], f: 48 }, { p: [19, 1.3, -4.6], l: [24.5, 1.0, -10.2], f: 44 }]);
  const wob = Math.max(0, Math.sin((t - 10.8) * 18)) * Math.exp(-(t - 10.8) * 3) * (t > 10.8 ? 1 : 0);
  return { t, cam, light: ROOM(DROP, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.2, focus: DROP, size: 12 } }), cut: null, motes: .9, rays: { k: .9, at: add3(DROP, [0, 0, -8]), spread: 16, len: 50 },
    props: [{ name: 'Droplet', pos: add3(DROP, [0, 0, 0]), scale: [1.6 * (1 + wob * .05), 1.2 * (1 - wob * .06), 1.6 * (1 + wob * .05)] }, { name: 'Crumb', pos: [29, 0, -4], scale: .5 }],
    actors: [hero({ pose: t < 10.2 ? walkPose((t - 8.65) * 1.5 / UNIT, 1) : P(pose(t, 1, { turn: .7 }), pose(t, 1, { turn: .7, arms: [[-.5, -1.7], [1.1, -2.3]], shapeB: 'open' }), reach), pos: hp, t, face: F('amazed', 'happy', reach) })],
    overlay: svg(sub('A DROPLET OF WATER…', t, 8.77, 10.4) + sub('…LIKE A GIANT GLASS DOME', t, 10.52, 99, 330, 54, '#9fe8ff')), grade: { bloom: .6, gain: [1.06, 1.0, .92], aperture: .8, focus: 5 } };
});
// 5. FACE TO FACE WITH A WOOD ANT (11.75 – 16.65)
shot(11.75, 16.65, t => {
  const hp: V3 = [22.4, 0, -9.2]; const walkK = smooth(k01(t, 11.8, 14.4)); const ap: V3 = [mix(33, 24.6, walkK), 0, mix(-15, -9.6, walkK)];
  const rear = smooth(k01(t, 15.3, 15.8)) * (1 - smooth(k01(t, 16.3, 16.6)));
  const turn = smooth(k01(t, 13.2, 13.7)); const face = t > 15.3;
  const cam = t < 15.2 ? cp(t, 11.75, 15.2, [{ p: [20.4, 1.2, -4.8], l: [28, .8, -12], f: 46 }, { p: [21.5, 1.0, -5.2], l: [25, .9, -10.5], f: 42 }]) : cp(t, 15.2, 16.65, [{ p: [23.5, .9, -6.6], l: [23.6, .95, -9.4], f: 40 }, { p: [23.5, .85, -7.0], l: [23.6, .95, -9.4], f: 36 }]);
  return { t, cam: shake(cam, t, rear * .015), light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.0, focus: hp, size: 12 } }), cut: null, motes: .8,
    props: [{ name: 'Droplet', pos: DROP, scale: [1.6, 1.2, 1.6] }],
    bugs: [ANT0(t, { pos: ap, yaw: Math.atan2(hp[0] - ap[0], hp[2] - ap[2]), gait: walkK < 1 ? { phase: t * 2.2, stride: .5 } : undefined, rear, jaw: rear * .9 + Math.max(0, Math.sin(t * 9)) * .1, head: [-.1, Math.sin(t * 2) * .2, 0] })],
    actors: [hero({ pose: face ? P(pose(t, 1, { turn: .6 }), { ...hidePose(1), crouch: .45, handA: [.45, -2.1], handB: [.95, -2.35], shapeA: 'fist', shapeB: 'fist', kneeUp: false }, rear) : P(pose(t, 1, { turn: -.3 }), pose(t, 1, { turn: .7, lean: -.1, arms: [[-.6, -2.4], [.7, -2.5]], shapeA: 'open', shapeB: 'open' }), turn),
      pos: hp, t, face: t < 13.3 ? F('happy') : t < 15.3 ? F('shocked') : F('determined', 'terrified', .2) })],
    overlay: svg(sub('A WOOD ANT ≈ 5 mm', t, 11.88, 15.2, 330, 60, '#ffd34d') + sub('FACE TO FACE', t, 15.4, 99, 330, 70, '#ff7a5a')), grade: { bloom: .45, gain: [1.06, 1.0, .92], vignette: .5, aperture: .7, focus: 3 } };
});
// 6. NOT A LION OR A SHARK — IT'S YOUR OWN HOME (16.65 – 20.5): the ant wanders off; the room looms; a giant shadow
shot(16.65, 20.5, t => {
  const hp: V3 = [22.4, 0, -9.2]; const ap = add3([24.6, 0, -9.6], [(t - 16.65) * 1.6, 0, -(t - 16.65) * .6]);
  const tilt = smooth(k01(t, 19.5, 20.4)); const shadow = k01(t, 19.8, 20.5);
  const cam = cp(t, 16.65, 20.5, [{ p: [19, 1.6, -3.5], l: [23, 1.1, -10], f: 46 }, { p: [18.5, 1.4, -3.0], l: [23, 1.2, -10], f: 46 }]);
  const up: V3 = [52, 150, 34]; const cam2 = { ...cam, look: [mix(cam.look[0], up[0], tilt), mix(cam.look[1], up[1], tilt), mix(cam.look[2], up[2], tilt)] as V3, fov: cam.fov + tilt * 14 };
  return { t, cam: cam2, light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.0 * (1 - shadow * .6), focus: hp, size: 14 } }), cut: null, motes: .8,
    props: [{ name: 'Droplet', pos: DROP, scale: [1.6, 1.2, 1.6] }, { name: 'Shoe', pos: [SHOE[0] - 6, 170 - shadow * 30, SHOE[2] - 4], rot: [.3, -.6, 0] }],
    bugs: [ANT0(t, { pos: ap, yaw: 1.95, gait: { phase: t * 2.2, stride: .5 } })],
    actors: [hero({ pose: pose(t, 1, { turn: .4, headLift: tilt * .2, arms: [[-.45, -1.6], [.5, -1.7]] }), pos: hp, t, face: t < 19.6 ? F('relief') : F('worried', 'shocked', shadow) })],
    overlay: svg(sub('NOT A LION OR A SHARK', t, 18.0, 19.6) + danger(t, 18.2, 19.7) + sub('IT’S YOUR OWN HOME', t, 19.76, 99, 330, 66, '#ff7a5a')), grade: { bloom: .45, gain: [1.04, .98, .92], vignette: .5 + shadow * .2 } };
});
// 7. A SHOE CRASHES DOWN LIKE A FALLING BUILDING (20.5 – 23.45)
const SHOE_HIT = 21.6;
shot(20.5, 23.45, t => {
  const hp: V3 = [40, 0, 26]; const fall = k01(t, 20.6, SHOE_HIT); const sy = mix(260, 0, fall * fall); const it = t - SHOE_HIT;
  const cam = cp(t, 20.5, 23.45, [{ p: [36, 1.0, 20], l: [55, 30, 42], f: 60 }, { p: [35, 1.2, 19], l: [50, 8, 40], f: 58 }]);
  const kb = k01(t, SHOE_HIT + .05, SHOE_HIT + 1.3);
  return { t, cam: shake(cam, t, it > 0 && it < 1.2 ? .35 * (1 - it / 1.2) : fall * .03), light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 3.6, focus: SHOE, size: 90 } }), cut: null, motes: .5,
    props: [{ name: 'Shoe', pos: [SHOE[0], sy, SHOE[2]], rot: [it < 0 ? .25 * (1 - fall) : 0, -.6, 0] }], stomp: it > 0 ? { at: SHOE, t: it } : undefined,
    actors: [hero({ pose: it < 0 ? pose(t, 1, { turn: .5, headLift: .2, arms: [[-.9, -3.0], [.9, -3.1]], shapeA: 'open', shapeB: 'open' }) : stumblePose(kb, -1), pos: add3(hp, [-kb * 2, 0, -kb * 1.5]), t, face: it < 0 ? F('terrified') : F('shocked', 'determined', k01(t, 22.6, 23.2)) })],
    overlay: svg(sub('A SHOE CRASHES DOWN', t, 20.88, 22.1, 330, 62, '#ff7a5a') + sub('LIKE A FALLING BUILDING', t, 22.22, 99, 330, 56) + (it > 0 && it < .25 ? `<rect width="1080" height="1920" fill="#fff" opacity="${(1 - it * 4) * .35}"/>` : '')),
    grade: { bloom: .5, gain: [1.06, 1.0, .92], vignette: .5 } };
});
// 8. SPRINT BENEATH THE SOFA (23.45 – 25.35)
shot(23.45, 25.35, t => {
  const p0: V3 = [38, 0, 24], p1: V3 = [60, 0, 236]; const k = k01(t, 23.45, 25.35); const hp: V3 = [mix(p0[0], p1[0], k), 0, mix(p0[2], p1[2], k)]; const dist = (t - 23.45) * 9;
  const cam = { pos: add3(hp, [-5, 2.2, -11]), look: add3(hp, [2, 4, 18]), fov: 56 };
  return { t, cam: shake(cam, t, .05), light: k < .75 ? ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 3.8, focus: hp, size: 40 } }) : UNDER(hp), cut: null, motes: .5,
    props: [{ name: 'Shoe', pos: [SHOE[0], mix(0, 220, smooth(k01(t, 23.6, 25.3))), SHOE[2]], rot: [.2, -.6, 0] }],
    actors: [hero({ pose: runPose(dist / UNIT, sdir(cam, p0, p1), { fear: .3 }), pos: add3(hp, [0, runBob(dist / UNIT) * UNIT, 0]), t, face: F('terrified', 'determined', .4) })],
    fx: [{ kind: 'puff', at: hp, t: (t * 3) % 1, n: 4, seed: Math.floor(t * 3), spread: .5, rise: .2, size: .4, color: '#d8c8b0', alpha: .4 }],
    overlay: svg(sub('YOU SPRINT…', t, 23.67, 24.6) + sub('…BENEATH A SOFA', t, 24.67, 99, 330, 62, '#ffd34d')), grade: { bloom: .45, gain: [1.04, .98, .92], vignette: .55, whip: k > .9 ? (k - .9) * 3 : 0 } };
});
// 9. A SPIDER CRAWLS OUT OF THE SHADOWS — NOWHERE ELSE TO HIDE (25.35 – 29.73)
shot(25.35, 29.73, t => {
  const hp: V3 = [mix(62, 60, k01(t, 25.4, 29)), 0, mix(240, 236, k01(t, 26.2, 29))]; const emerge = smooth(k01(t, 25.4, 27.2)); const sp: V3 = [mix(72, 66, emerge), 0, mix(290, 256, emerge)];
  const rear = smooth(k01(t, 27.6, 28.4)); const turn = k01(t, 29.0, 29.6);
  const cam = cp(t, 25.35, 29.73, [{ p: add3(hp, [-6, 1.2, -6]), l: add3(hp, [4, 2, 14]), f: 52 }, { p: add3(hp, [-5, .9, -7]), l: add3(hp, [3, 2.6, 12]), f: 50 }]);
  return { t, cam: shake(cam, t, .012 + rear * .03), light: UNDER(hp), cut: null, motes: .2,
    bugs: [SPI(t, { pos: sp, yaw: Math.atan2(hp[0] - sp[0], hp[2] - sp[2]), gait: emerge < 1 ? { phase: t * 1.4, stride: 1 } : undefined, rear, jaw: rear, crouch: .2 * (1 - rear) })],
    actors: [hero({ pose: turn > 0 ? P(hidePose(-1), runPose(1, -1, { fear: 1 }), turn) : P(pose(t, 1, { turn: .4, lean: .1 }), hidePose(1), k01(t, 26.4, 27.0)), pos: hp, t, face: t < 26.3 ? F('worried') : F('terrified'), tint: [.75, .68, .6] })],
    overlay: svg(sub('ONE SPIDER…', t, 25.4, 26.9, 330, 64, '#ff7a5a') + sub('NOWHERE ELSE TO HIDE', t, 27.65, 99, 330, 58)), grade: { bloom: .5, gain: [1.0, .94, .88], vignette: .65, sat: .9 } };
});
// 10. AT THIS SCALE PHYSICS CHANGES THE RULES (29.73 – 33.45): up the sofa leg, the spider reaching below — then he slips
shot(29.73, 33.45, t => {
  const climbY = mix(.5, 33, smooth(k01(t, 29.8, 33.0))); const hp: V3 = [LEG[0], climbY, LEG[2] - 7.4];
  const sp: V3 = [30, 0, 252]; const cam = { pos: [LEG[0] - 3, climbY + 3.5, LEG[2] - 18], look: [LEG[0], climbY + .5, LEG[2] - 6], fov: 52 } as { pos: V3; look: V3; fov: number };
  return { t, cam: shake(cam, t, .02), light: UNDER([LEG[0], 15, LEG[2]], { points: [{ pos: [LEG[0] - 10, 20, LEG[2] - 40], color: '#ffcf96', int: 1600, dist: 90 }] }), cut: null, motes: .2,
    bugs: [SPI(t, { pos: sp, yaw: Math.PI, rear: .8 + .2 * Math.sin(t * 3), jaw: .6 })],
    actors: [hero({ pose: climbPose(climbY / UNIT), pos: hp, t, face: F('terrified', 'determined', .5), tint: [.85, .78, .7] })],
    overlay: svg(sub('AT THIS SCALE…', t, 30.16, 31.1) + sub('PHYSICS CHANGES THE RULES', t, 31.12, 99, 330, 56, '#7ff3ff')), grade: { bloom: .45, gain: [1.0, .95, .9], vignette: .6 } };
});
// 11. HANDLE FALLS BETTER — AIR RESISTANCE vs WEIGHT (33.45 – 37.55): a slow, fluttering fall, a soft landing
shot(33.45, 37.55, t => {
  const k = k01(t, 33.45, 37.35); const y = mix(33, 0, k); const hp: V3 = [LEG[0] - 2 - k * 4, y, LEG[2] - 9 - k * 6];
  const land = k01(t, 37.3, 37.55); const cam = { pos: add3(hp, [-6, 1.5 - k * .5, -9]), look: add3(hp, [0, .8, 0]), fov: 50 };
  return { t, cam, light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 2.4, focus: hp, size: 40 }, hemi: ['#ffe8cc', '#5a4030', .45] }), cut: null, motes: .6,
    actors: [hero({ pose: land > 0 ? jumpPose(.8 + land * .2, 1).pose : fallPose(t, 1), pos: hp, t, face: t < 34.8 ? F('terrified') : F('amazed', 'relief', k01(t, 36.4, 37.3)) })],
    fx: land > 0 ? [{ kind: 'puff', at: [hp[0], .2, hp[2]], t: t - 37.3, n: 10, seed: 3, spread: .8, rise: .3, size: .6, color: '#d8c8b0', alpha: .4 }] : [],
    overlay: svg(sub('TINY ANIMALS HANDLE FALLS BETTER', t, 33.44, 99, 330, 46, '#ffd34d') + forces(t, 34.0, 37.5)), grade: { bloom: .45, gain: [1.04, .98, .92] } };
});
// 12. NO COMIC-BOOK STRENGTH — BODIES DON'T SIMPLY SHRINK (37.55 – 43.65)
shot(37.55, 43.65, t => {
  const hp: V3 = [36, 0, 214]; const strain = k01(t, 38.0, 39.6) * (1 - k01(t, 39.6, 39.9)); const give = k01(t, 39.6, 40.2);
  const cam = cp(t, 37.55, 43.65, [{ p: add3(hp, [-1.2, 1.2, -4.2]), l: add3(hp, [.6, .9, 0]), f: 44 }, { p: add3(hp, [-1.0, 1.1, -3.8]), l: add3(hp, [.4, 1.0, 0]), f: 42 }]);
  const lift = strain * .08 * Math.abs(Math.sin(t * 20));
  return { t, cam, light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 2.8, focus: hp, size: 20 }, hemi: ['#ffe8cc', '#5a4030', .5] }), cut: null, motes: .5,
    props: [{ name: 'Sugar', pos: add3(hp, [1.3, lift, 0]), rot: [0, .4, 0], scale: 1.6 }],
    actors: [hero({ pose: give < 1 ? P({ ...hidePose(1), handA: [.75, -1.4], handB: [1.1, -1.5], shapeA: 'fist', shapeB: 'fist', kneeUp: false, crouch: .7 }, sitPose(1, 0, { lean: -.2 }), give) : sitPose(1, 0, { handA: [.3, -2.6], handB: [.55, -2.4], shapeA: 'open', shapeB: 'open', headLift: -.05 }),
      pos: hp, t, face: give < .5 ? F('determined', 'exhausted', strain) : t < 40.5 ? F('exhausted') : F('confused', 'concern', k01(t, 41, 42)) })],
    overlay: svg(sub('NO COMIC-BOOK STRENGTH', t, 38.81, 39.85, 330, 56, '#ff7a5a') + cells(t, 40.0, 43.5) + sub('BODIES CAN’T SIMPLY SHRINK', t, 40.85, 99, 330, 52, '#fff')), grade: { bloom: .45, gain: [1.04, .98, .92], aperture: .7, focus: 4 } };
});
// 13. SCIENCE FICTION WITH REAL-SIZE COMPARISONS (43.65 – 46.75)
shot(43.65, 46.75, t => {
  const hp: V3 = [120, 0, 58]; const cam = cp(t, 43.65, 46.75, [{ p: [112, 5, 46], l: [126, 1.0, 64], f: 50 }, { p: [110, 6, 44], l: [126, 1.2, 64], f: 52 }]);
  const pr = projector(cam.pos, cam.look, cam.fov);
  return { t, cam, light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.0, focus: hp, size: 24 } }), cut: null, motes: .7,
    props: [{ name: 'Droplet', pos: [124, 0, 52], scale: [1.4, 1.05, 1.4] }],
    actors: [hero({ pose: pose(t, 1, { turn: .5, arms: [[-.5, -1.7], [.6, -1.8]] }), pos: hp, t, face: F('curious') })],
    overlay: svg(sub('SCIENCE FICTION', t, 44.14, 99, 290, 62, '#7ff3ff') + sub('WITH REAL-SIZE COMPARISONS', t, 44.95, 99, 370, 48) +
      pin(pr, add3(hp, [0, 2.1, 0]), 'YOU: 5 mm', t, 45.0) + pin(pr, add3(CRUMB, [0, 3, 0]), 'CRUMB: 6 mm', t, 45.3, '#c8862a') + pin(pr, [124, 1.6, 52], 'DROPLET: 4 mm', t, 45.6, '#2a8ac8') + pin(pr, [118, 3.6, 72], 'FIBRE: 1 cm', t, 45.9, '#5a8a3a')),
    grade: { bloom: .5, gain: [1.06, 1.0, .92] } };
});
// 14. CLIMB OVER A CRUMB — SPOT THE BEDROOM DOOR (46.75 – 50.4)
shot(46.75, 50.4, t => {
  const ck = smooth(k01(t, 46.95, 48.3)); const topY = 3.4; const hp: V3 = [mix(124.5, 128, ck), mix(0, topY, ck), 64];
  const onTop = t > 48.3; const point = gesture(t, 49.3, .5);
  const cam = t < 48.4 ? { pos: [122.4, 2.4, 59.4] as V3, look: [127.4, 2.2, 64] as V3, fov: 50 } : cp(t, 48.4, 50.4, [{ p: [124.6, 4.7, 66.4], l: [300, 90, 0], f: 50 }, { p: [125, 5.0, 66.8], l: [700, 300, -142], f: 38 }]);
  return { t, cam, light: ROOM(CRUMB, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.0, focus: CRUMB, size: 24 }, fog: ['#e9d2b2', t > 48.4 ? .00045 : .0016] }), cut: null, motes: .7, rays: { k: .8, at: [300, 0, 300], spread: 300, len: 1200 },
    actors: [hero({ pose: !onTop ? climbPose(ck * 6) : P(pose(t, 1, { back: 1, headLift: .1 }), pose(t, 1, { back: 1, arms: [[-.5, -1.7], [1.1, -3.4]], shapeB: 'point' }), point), pos: hp, t, face: onTop ? F('excited') : F('determined') })],
    overlay: svg(sub('CLIMB OVER A CRUMB', t, 46.96, 49.0, 330, 56) + sub('THE BEDROOM DOOR!', t, 49.14, 99, 330, 66, '#ffd34d')), grade: { bloom: .6, gain: [1.08, 1.0, .9] } };
});
// 15. FREEDOM (50.4 – 51.55): jump down and run toward the light
shot(50.4, 51.55, t => {
  const jk = k01(t, 50.4, 50.95); const jp = jumpPose(jk, 1, { height: 1.2 }); const d = Math.max(0, t - 50.9) * 8;
  const hp: V3 = t < 50.95 ? [mix(128, 131, jk), mix(3.4, 0, jk) + jp.y * UNIT, 64.5] : [131 + d * .85, 0, 64.5 + d * .5];
  const cam = { pos: add3(hp, [-4, 1.6, 3]), look: add3(hp, [2, 1.2, 0]), fov: 52 };
  return { t, cam, light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.0, focus: hp, size: 24 } }), cut: null, motes: .7,
    actors: [hero({ pose: t < 50.95 ? jp.pose : runPose(d / UNIT, 1), pos: add3(hp, [0, t < 50.95 ? 0 : runBob(d / UNIT) * UNIT, 0]), t, face: F('excited') })],
    overlay: svg(pop('FREEDOM!', 540, 330, 96, t, 50.45, { color: '#ffd34d' })), grade: { bloom: .6, gain: [1.08, 1.0, .9] } };
});
// 16. A ROAR FILLS THE AIR — IT'S NOT A MONSTER (51.55 – 53.95)
shot(51.55, 53.95, t => {
  const hp: V3 = [139, 0, 69]; const rum = k01(t, 51.57, 52.0); const turn = smooth(k01(t, 52.0, 52.5));
  const cam = cp(t, 51.55, 53.95, [{ p: add3(hp, [-2.6, 1.0, 3.4]), l: add3(hp, [0, 1.1, 0]), f: 44 }, { p: add3(hp, [-2.3, .9, 3.1]), l: add3(hp, [0, 1.1, 0]), f: 40 }]);
  return { t, cam: shake(cam, t, rum * .04), light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 4.0, focus: hp, size: 20 } }), cut: null, motes: 1.2, suck: { at: [235, 0, 72], k: rum * .25, t },
    actors: [hero({ pose: P(runPose(.5, 1), pose(t, 1, { turn: -.5, headLift: .1, arms: [[-.9, -2.9], [.9, -2.8]], shapeA: 'open', shapeB: 'open' }), turn), pos: hp, t, face: t < 53.2 ? F('shocked') : F('suspicious', 'shocked', .4) })],
    overlay: svg(sub('A ROAR FILLS THE AIR', t, 51.57, 53.1, 330, 60, '#ff7a5a') + sub('IT’S NOT A MONSTER…', t, 53.26, 99, 330, 56)), grade: { bloom: .5, gain: [1.06, 1.0, .92], vignette: .5 } };
});
// 17. THE VACUUM CLEANER (53.95 – 57.1): reveal — it's coming, and you're in its path
const vacX = (t: number) => mix(330, 175, smooth(k01(t, 53.95, 60)));
shot(53.95, 57.1, t => {
  const hp: V3 = [139, 0, 69]; const vx = vacX(t); const flee = t > 56.44; const d = Math.max(0, t - 56.44) * 7;
  const hpos: V3 = flee ? [hp[0] - d, 0, hp[2] - d * .3] : hp;
  const cam = cp(t, 53.95, 57.1, [{ p: [131, 2.3, 67.4], l: [vx, 14, 72], f: 54 }, { p: [129, 2.1, 66.8], l: [vx - 10, 8, 72], f: 56 }]);
  return { t, cam: shake(cam, t, .06), light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 3.8, focus: [vx - 30, 0, 72], size: 90 } }), cut: null, motes: 1.5, brush: t * 6,
    props: [{ name: 'Vacuum', pos: [vx, 0, 72], rot: [0, 0, 0] }], suck: { at: [vx - 26, 0, 72], k: .6 + .4 * k01(t, 54.5, 56.5), t },
    actors: [hero({ pose: flee ? runPose(d / UNIT, sdir(cam, hp, [hp[0] - 10, 0, hp[2] - 3]), { fear: .6 }) : pose(t, 1, { turn: .7, lean: -.1, arms: [[-1.0, -2.6], [.9, -2.9]], shapeA: 'open', shapeB: 'open' }), pos: add3(hpos, [0, flee ? runBob(d / UNIT) * UNIT : 0, 0]), t, face: F('terrified') })],
    overlay: svg(sub('THE VACUUM CLEANER', t, 54.47, 56.3, 330, 66, '#ff7a5a') + sub('…AND YOU’RE IN ITS PATH', t, 56.44, 99, 330, 56, '#fff')), grade: { bloom: .5, gain: [1.06, 1.0, .92], vignette: .5 } };
});
// 18. RUN! (57.1 – 60.0): low tracking chase, fibres and crumbs torn toward the nozzle — which swallows the camera (loops to the opening's black)
shot(57.1, 60, t => {
  const d = (t - 56.44) * 7; const hp: V3 = [139 - d, 0, 69 - d * .3]; const vx = vacX(t) - (t - 57.1) * 18;
  const cam = { pos: add3(hp, [-9, 1.6, -2.5]), look: add3(hp, [2, 2.2, .6]), fov: 56 };
  const engulf = k01(t, 59.2, 59.95);
  return { t, cam: shake(cam, t, .08 + engulf * .1), light: ROOM(hp, { sun: { dir: [-.12, .5, -.86], color: '#ffd9a6', int: 3.6, focus: hp, size: 60 } }), cut: null, motes: 1.5, brush: t * 6,
    props: [{ name: 'Vacuum', pos: [vx, 0, 72], rot: [0, 0, 0] }], suck: { at: [vx - 26, 0, 72], k: 1, t },
    actors: [hero({ pose: runPose(d / UNIT, -1, { fear: .5, lean: .3 }), pos: add3(hp, [0, runBob(d / UNIT) * UNIT, 0]), t, face: F('terrified', 'determined', .3) })],
    overlay: svg(engulf > 0 ? `<rect width="1080" height="1920" fill="#000" opacity="${engulf * .88}"/>` : ''), grade: { bloom: .5, gain: [1.06, 1.0, .92], vignette: .55 + engulf * .3, whip: .15 } };
});

export const SHOTS = S;
export function frameAt(frame: number): Frame7 {
  const t = Math.min(frame, FRAMES - 1) / FPS; const s = S.find(x => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
  const Fr = s.f(t); Fr.t = t; return Fr;
}
