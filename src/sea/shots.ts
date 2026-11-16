// "What if humans evolved underwater?" — 60.0 s / 1800 frames. Narration part 1 at +0.4 s, part 2 at +28.56 s (1.0 s breath
// between them for the dive into the deep). Every visual beat waits for the words that describe it.
import type { V3, Light } from '../brazil/engine.ts';
import type { ActorState } from '../brazil/actor.ts';
import type { Look, Pose } from '../ff2d/rig.ts';
import type { Frame6 } from './engine6.ts';
import { pose, P, F, camPath, add3, inOut, mix, type CamKey } from '../brazil/anim.ts';
import { swimPose, fallPose } from '../ff2d/moves.ts';
import { clamp, smooth, noise1 } from '../ff2d/motion.ts';
import { svg, pop } from '../brazil/overlay.ts';

export const FPS = 30, DURATION = 60, FRAMES = 1800;
let ENG: { H: (x: number, z: number) => number } | null = null; export const bindEngine = (e: typeof ENG) => { ENG = e; };
const H = (x: number, z: number) => ENG ? ENG.H(x, z) : -12;
const k01 = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const cp = (t: number, t0: number, t1: number, keys: CamKey[], e = inOut) => camPath(t, t0, t1, keys, e);
const HERO: Look = { outfit: 'hoodie', color: '#d8262b', pants: '#151515' };
const ANCESTOR: Look = { outfit: 'jacket', color: '#3a6ea5', pants: '#3a3a40', hairStyle: 'crop', hair: '#2a1d14' };
const FOLK: Look[] = [{ outfit: 'hoodie', color: '#2bb6a0', pants: '#1d2a30', hairStyle: 'bun', hair: '#1a1410' }, { outfit: 'hoodie', color: '#f2a03a', pants: '#2a2a30', hairStyle: 'crop', hair: '#3a2416' },
  { outfit: 'hoodie', color: '#7a6cff', pants: '#202030', hairStyle: 'curlyTop', hair: '#111' }, { outfit: 'hoodie', color: '#e8e2d0', pants: '#2a3a4a', hairStyle: 'fringe', hair: '#6b4a2b' }];

// adaptations drawn on the 2D rig: swim fins on the feet, webbing on the hands
function fins(p: Pose, col = '#22b8c9'): string {
  const f = (q: [number, number], s: number) => `<path d="M${q[0] - .13} ${q[1]} L${q[0] + .13} ${q[1]} L${q[0] + .26 * s} ${q[1] + .62} Q${q[0]} ${q[1] + .7} ${q[0] - .26 * s} ${q[1] + .62} Z" fill="${col}" stroke="#111" stroke-width=".04"/>` +
    `<path d="M${q[0]} ${q[1] + .05} L${q[0]} ${q[1] + .6} M${q[0] - .1} ${q[1] + .05} L${q[0] - .18} ${q[1] + .58} M${q[0] + .1} ${q[1] + .05} L${q[0] + .18} ${q[1] + .58}" stroke="#0d6f7a" stroke-width=".025"/>`;
  const w = (q: [number, number]) => `<path d="M${q[0] - .16} ${q[1] - .02} Q${q[0]} ${q[1] - .26} ${q[0] + .16} ${q[1] - .02}" fill="${col}" stroke="#111" stroke-width=".03" opacity=".9"/>`;
  return f(p.footA, 1) + f(p.footB, 1) + w(p.handA) + w(p.handB);
}
type ActIn = Partial<ActorState> & { pose: Pose; pos: V3; t: number };
const hero = (o: ActIn): ActorState => ({ id: 'hero', look: HERO, seed: 1, res: 1536, face: F('happy'), extra: fins(o.pose), shadow: false, contact: 0, ...o });
const folk = (i: number, o: ActIn): ActorState => ({ id: 'folk' + i, look: FOLK[i % 4], seed: 10 + i, res: 768, face: F('happy'), extra: fins(o.pose, ['#2bd1c4', '#f2c23a', '#9a8cff', '#5ad1ff'][i % 4]), shadow: false, contact: 0, ...o });
/** a horizontal swimmer: roll lays the cut-out along the screen; dir +1 = heading screen-right */
const swimmer = (t: number, dir: number, o: { stroke?: number; kick?: number; speed?: number } = {}) => ({ pose: swimPose(t, o), roll: -dir * Math.PI / 2 });
const wob = (t: number, s: number, a = .1): V3 => [noise1(t * .7, s) * a, noise1(t * .6, s + 3) * a, noise1(t * .5, s + 7) * a];

// ---------------------------------------------------------------------------------------------- light identities by depth
type L3 = [string, string, number];
const SURF = (focus: V3): Light => ({ sky: ['#3f86d8', '#a9cfe8'], sun: { dir: [-.35, .8, -.45], color: '#fff3dc', int: 3.4, focus, size: 60 }, hemi: ['#bfe2ff', '#2a5a60', .8] as L3, amb: ['#ffffff', .08], fog: ['#cfe3ee', .0015], env: .9, sunGlow: 1.2 });
const SHALLOW = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#3f86d8', '#cfe6f2'], sun: { dir: [-.3, .85, -.4], color: '#e8fbff', int: 2.6, focus, size: 40 }, hemi: ['#8ef0ff', '#1d5a5a', 1.0] as L3, amb: ['#7fdcff', .12],
  fog: ['#1c93a8', .021], env: .8, sunGlow: 0, ...o });
const MID = (focus: V3, o: Partial<Light> = {}): Light => ({ sky: ['#3f86d8', '#cfe6f2'], sun: { dir: [-.2, .9, -.3], color: '#bff2ff', int: 1.4, focus, size: 40 }, hemi: ['#4fb8d0', '#0a2a3a', .8] as L3, amb: ['#3a9ac0', .1],
  fog: ['#0b5470', .03], env: .6, sunGlow: 0, ...o });
const DEEP = (focus: V3, k = 1, o: Partial<Light> = {}): Light => ({ sky: ['#3f86d8', '#cfe6f2'], sun: { dir: [-.2, .9, -.3], color: '#7fb8d8', int: .35 * (1 - k * .8), focus, size: 30, shadow: 0 }, hemi: ['#1d4a6a', '#02060c', .55 - k * .3] as L3, amb: ['#1a3a5a', .08],
  fog: [k > .5 ? '#020b18' : '#05213a', .035 + k * .01], env: .3, sunGlow: 0, ...o });

// ---------------------------------------------------------------------------------------------- overlays
const sub = (s: string, t: number, t0: number, out = 99, y = 1530, size = 56, color = '#fff') => pop(s, 540, y, size, t, t0, { color, out });
const title = (s: string, t: number, t0: number, out = 99, y = 320, size = 74, color = '#7ff3ff') => pop(s, 540, y, size, t, t0, { color, out });
function gauge(t: number, t0: number, depth: number, atm: number, vol: number, out: number) {
  const k = k01(t, t0, t0 + .3) * (1 - k01(t, out, out + .3)); if (k <= 0) return '';
  const r = 70 * Math.sqrt(vol);
  return `<g opacity="${k}" filter="url(#sh)" transform="translate(70 1200)"><rect width="420" height="320" rx="26" fill="#03141f" opacity=".82" stroke="#7ff3ff" stroke-opacity=".5" stroke-width="3"/>
    <text x="30" y="70" font-size="34" font-weight="700" fill="#7ff3ff">DEPTH</text><text x="30" y="150" font-size="86" font-weight="900" fill="#fff">${Math.round(depth)} m</text>
    <text x="30" y="220" font-size="34" font-weight="700" fill="#7ff3ff">PRESSURE</text><text x="30" y="290" font-size="64" font-weight="900" fill="#ffd34d">${atm.toFixed(atm < 10 ? 1 : 0)} atm</text></g>
    <g opacity="${k}" filter="url(#sh)" transform="translate(800 1360)"><circle r="${r}" fill="#bff6ff" fill-opacity=".35" stroke="#fff" stroke-width="4"/><circle cx="${-r * .35}" cy="${-r * .35}" r="${r * .18}" fill="#fff" opacity=".8"/>
    <text y="${120}" text-anchor="middle" font-size="30" font-weight="900" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">AIR VOLUME ×${vol < .99 ? '1/' + Math.round(1 / vol) : '1'}</text></g>`;
}
function readout(t: number, t0: number, label: string, value: string, color: string, out: number, y = 1260) {
  const k = k01(t, t0, t0 + .3) * (1 - k01(t, out, out + .3)); if (k <= 0) return '';
  return `<g opacity="${k}" filter="url(#sh)" transform="translate(540 ${y})"><rect x="-260" y="-70" width="520" height="150" rx="26" fill="#03141f" opacity=".8" stroke="${color}" stroke-opacity=".6" stroke-width="3"/>
    <text y="-20" text-anchor="middle" font-size="32" font-weight="700" fill="${color}">${label}</text><text y="56" text-anchor="middle" font-size="72" font-weight="900" fill="#fff">${value}</text></g>`;
}
function generations(t: number, t0: number, out: number) {
  const k = k01(t, t0, t0 + .3) * (1 - k01(t, out, out + .3)); if (k <= 0) return ''; let g = '';
  ['GEN 1', 'GEN 500', 'GEN 5,000'].forEach((s, i) => { const a = k01(t, t0 + i * .3, t0 + i * .3 + .3); const x = 220 + i * 320; const fin = .2 + i * .35;
    g += `<g opacity="${a}" transform="translate(${x} 1300)"><circle cy="-120" r="34" fill="#fff" stroke="#111" stroke-width="5"/><rect x="-30" y="-86" width="60" height="90" rx="14" fill="#d8262b" stroke="#111" stroke-width="5"/>
      <path d="M-14 4 L-18 70 M14 4 L18 70" stroke="#111" stroke-width="8" stroke-linecap="round"/><path d="M-30 70 L-6 70 L${-18 - fin * 22} ${70 + fin * 70} Z M6 70 L30 70 L${18 + fin * 22} ${70 + fin * 70} Z" fill="#22b8c9" stroke="#111" stroke-width="4"/>
      <text y="210" text-anchor="middle" font-size="34" font-weight="900" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${s}</text></g>`;
    if (i < 2) g += `<path d="M${x + 90} 1260 h120" stroke="#7ff3ff" stroke-width="8" stroke-linecap="round" opacity="${a}"/><path d="M${x + 200} 1245 l16 15 -16 15" stroke="#7ff3ff" stroke-width="8" fill="none" opacity="${a}"/>`; });
  return `<g opacity="${k}" filter="url(#sh)">${g}</g>`;
}
const cross = (x: number, y: number, s: number, t: number, t0: number) => t < t0 ? '' : `<g opacity="${k01(t, t0, t0 + .2)}" filter="url(#sh)"><path d="M${x - s} ${y - s} L${x + s} ${y + s} M${x + s} ${y - s} L${x - s} ${y + s}" stroke="#ff4a3a" stroke-width="${s * .28}" stroke-linecap="round"/></g>`;

type Shot = { t0: number; t1: number; f: (t: number) => Frame6 };
const S: Shot[] = []; const shot = (t0: number, t1: number, f: Shot['f']) => S.push({ t0, t1, f });
const reefLife = (t: number, c: V3, seed = 0) => [{ kind: 'FishYellow' as const, center: add3(c, [3, 2.5, -2]), n: 40, r: 5, t, speed: .3, seed }, { kind: 'FishBlue' as const, center: add3(c, [-4, 4, 2]), n: 50, r: 6, t, speed: -.25, seed: seed + 1 }, { kind: 'FishOrange' as const, center: add3(c, [1, 1.5, 4]), n: 24, r: 3, t, speed: .45, seed: seed + 2 }];

// 1. HOOK (0 – 3.95): above the waves → plunge under → the reef and a finned swimmer shoots past

shot(0, 3.95, t => {
  const dive = smooth(k01(t, .9, 1.7)); const below = t > 1.3;
  const cam = cp(t, 0, 3.95, [{ p: [-40, 2.2, 66], l: [-40, .4, 20], f: 50 }, { p: [-40, .3, 58], l: [-40, -2, 30], f: 52 }, { p: [-40, -5, 50], l: [-41, -8.5, 30], f: 52 }, { p: [-40.5, -6.5, 46], l: [-42, -9, 30], f: 50 }]);
  const hx = mix(-50, -32, k01(t, 2.3, 3.95)); const sw = swimmer(t, 1, { speed: 1.6 });
  return { t, cam: { ...cam, pos: add3(cam.pos, wob(t, 1, .05)) }, light: below ? SHALLOW([-40, -10, 30]) : SURF([-40, 0, 30]), cut: null, caust: 1.3, current: .6, snow: below ? .6 : 0,
    rays: below ? { k: 1.2, at: [-40, 0, 30], spread: 30 } : undefined, schools: reefLife(t, [-40, -10, 30]),
    bubbles: [{ at: [-40, -1.2, 55], t: (t - 1.3) * 2, n: dive > .3 && t < 2.6 ? 80 : 0, spread: 2.5, rate: 1.5 }],
    props: [{ name: 'Turtle', pos: [-36 + t * .8, -6, 36], rot: [0, 1.4, 0], scale: 1.3 }, { name: 'Manta', pos: [-50 + t * 1.2, -4.5, 22], rot: [0, 1.3, 0], scale: 1.6 }],
    actors: t > 2.2 ? [hero({ ...sw, pos: [hx, -7.4, 42], t, face: F('excited') })] : [],
    overlay: svg(title('WHAT IF HUMANS', t, .35, 3.5, 300, 82, '#fff') + title('EVOLVED UNDERWATER?', t, 1.7, 3.5, 390, 72) + (t > .9 && t < 1.45 ? `<rect width="1080" height="1920" fill="#e8fbff" opacity="${(1 - Math.abs(t - 1.25) / .25) * .6}"/>` : '')),
    grade: { bloom: .5, sat: 1.15, gain: below ? [.92, 1.02, 1.06] : [1, 1, 1], vignette: .4 } };
});
// 2. THROUGH THE OCEANIC CITY (3.95 – 8.9): track the descendant past domes and glass tunnels full of people
shot(3.95, 8.9, t => {
  const path = (k: number): V3 => [mix(38, -6, k), -5.5 - Math.sin(k * 3) * 1.2, mix(-8, -30, k)]; const k = k01(t, 3.95, 8.9); const hp = path(k);
  const cam = { pos: add3(hp, [-1.5 + k * 2, 1.2, 7.5]), look: add3(hp, [-2.5, -.6, -4]), fov: 50 };
  const sw = swimmer(t, -1, { speed: 1.4 });
  const folks = [0, 1, 2, 3].map(i => { const fk = (k * 1.4 + i * .23) % 1; const a: V3 = [mix(-3.2, 8, fk), H(0, -40) + 14 * .95 - 1.2, mix(-27, -33, fk)]; return folk(i, { ...swimmer(t + i, 1, { speed: 1 }), pos: [a[0] + i * 1.5, -9.5 + (i % 2) * .8, -27.5 - i * .6], t, res: 512 }); });
  return { t, cam, light: SHALLOW(hp), cut: null, caust: 1.1, current: .5, snow: .5, rays: { k: 1, at: [10, 0, -25], spread: 40 },
    schools: [{ kind: 'FishBlue', center: [10, -4, -18], n: 60, r: 7, t, speed: .35 }, { kind: 'FishYellow', center: [-4, -8, -26], n: 30, r: 4, t, speed: -.4 }],
    actors: [hero({ ...sw, pos: hp, t, face: F('happy', 'excited', .5) }), ...folks],
    bubbles: [{ at: add3(hp, [-.6, .4, 0]), t: t * 2, n: 20, spread: .4 }],
    overlay: svg(sub('YOUR RED-HOODIE DESCENDANT', t, 4.6, 6.4, 330, 50, '#ffd34d') + sub('AN OCEANIC CITY', t, 6.6, 7.8, 330, 66, '#7ff3ff') + generations(t, 7.9, 8.85)),
    grade: { bloom: .55, sat: 1.12, gain: [.92, 1.02, 1.08] } };
});
// 3. ALTERNATE HISTORY — NOT OVERNIGHT (8.9 – 13.25): a land-born ancestor flounders at the surface, the descendant glides by
const HOMES: V3 = [52, 0, 30];
shot(8.9, 13.25, t => {
  const anc: V3 = [48, -1.7, 26]; const panic = Math.sin(t * 7);
  const cam = cp(t, 8.9, 13.25, [{ p: [50, -6.5, 34], l: [48.5, -1.8, 26], f: 52 }, { p: [50.5, -7.2, 35], l: [48.5, -2, 26], f: 50 }]);
  const gk = k01(t, 10.3, 12.6); const gp: V3 = [mix(41, 57, gk), -5.2, 28];
  return { t, cam, light: SHALLOW(anc), cut: null, caust: 1.3, current: .5, snow: .5, rays: { k: 1.1, at: anc, spread: 20 }, surface: { calm: .3 },
    actors: [{ id: 'anc', look: ANCESTOR, seed: 3, res: 1024, pose: P(fallPose(t), swimPose(t * 1.6, { stroke: .6 }), .5 + .5 * panic), face: t < 11.9 ? F('worried', 'terrified', k01(t, 10.8, 11.6)) : F('exhausted'), pos: anc, t, shadow: false, contact: 0 },
      hero({ ...swimmer(t, 1, { speed: 1.2 }), pos: gp, t, face: F('curious') })],
    bubbles: [{ at: add3(anc, [0, 1.2, 0]), t: t * 3, n: 60, spread: .6, rate: 2 }],
    overlay: svg(title('ALTERNATE HISTORY', t, 9.4, 99, 320, 70, '#ffd34d') + sub('NOT OVERNIGHT', t, 11.9, 99, 410, 64) + cross(780, 395, 34, t, 12.35)),
    grade: { bloom: .5, sat: 1.1, gain: [.94, 1.02, 1.06] } };
});
// 4a. NATURAL SELECTION → STREAMLINED BODIES (13.25 – 15.85)
shot(13.25, 15.85, t => {
  const hp: V3 = [mix(-8, 8, k01(t, 13.25, 15.85)), -7, 14]; const cam = { pos: add3(hp, [0, .3, 6]), look: add3(hp, [0, 0, 0]), fov: 46 };
  const flow = t > 14.85 ? [0, 1, 2, 3, 4].map(i => { const y = 700 + i * 70, s = ((t * 900 + i * 230) % 1300) - 200; return `<path d="M${s} ${y} q160 ${-30 - i * 6} 320 0" stroke="#bff6ff" stroke-width="7" fill="none" opacity=".75" stroke-linecap="round"/>`; }).join('') : '';
  return { t, cam, light: SHALLOW(hp), cut: null, caust: 1.2, current: .5, snow: .6, rays: { k: 1, at: hp, spread: 24 }, schools: reefLife(t, [0, -10, 12], 5),
    actors: [hero({ ...swimmer(t, 1, { speed: .9, stroke: .2, kick: 1.2 }), pos: add3(hp, [-1, 0, 0]), t, face: F('determined', 'happy', .3) })],
    overlay: svg(title('NATURAL SELECTION', t, 13.28, 99, 320, 70, '#7ff3ff') + sub('STREAMLINED BODIES', t, 14.89, 99, 410, 56, '#fff') + `<g filter="url(#sh)">${flow}</g>`),
    grade: { bloom: .5, sat: 1.12, gain: [.92, 1.02, 1.08] } };
});
// 4b. BETTER DIVING REFLEXES (15.85 – 17.95): a steep dive, the heart slows
shot(15.85, 17.95, t => {
  const k = k01(t, 15.85, 17.95); const hp: V3 = [6, mix(-4, -10, k), 20]; const cam = { pos: add3(hp, [1.8, 1.4, 4.8]), look: add3(hp, [0, -.6, 0]), fov: 48 };
  const bpm = Math.round(mix(78, 44, k01(t, 16.4, 17.7)));
  return { t, cam, light: SHALLOW(hp), cut: null, caust: 1.1, current: .5, snow: .6, rays: { k: .9, at: hp, spread: 20 },
    actors: [hero({ pose: swimPose(t, { speed: 1.2 }), roll: Math.PI * .85, pos: hp, t, face: F('determined') })],
    bubbles: [{ at: add3(hp, [0, .6, 0]), t: t * 2, n: 30, spread: .3 }],
    overlay: svg(sub('BETTER DIVING REFLEXES', t, 16.38, 99, 320, 58, '#7ff3ff') + readout(t, 16.5, 'HEART RATE', `${bpm} bpm ♥`, '#ff6a7a', 99, 1350)),
    grade: { bloom: .5, sat: 1.1, gain: [.9, 1.0, 1.08] } };
});
// 4c. STRONG SWIMMING MUSCLES (17.95 – 19.05): sprint burst
shot(17.95, 19.05, t => {
  const k = k01(t, 17.95, 19.05); const hp: V3 = [mix(-6, 9, inOut(k)), -6.5, 6]; const cam = { pos: add3(hp, [-2.4 + k * 2, .5, 5]), look: add3(hp, [1.2, 0, 0]), fov: 50 };
  return { t, cam, light: SHALLOW(hp), cut: null, caust: 1.2, current: .5, snow: .7, schools: reefLife(t, [0, -10, 4], 9),
    actors: [hero({ ...swimmer(t, 1, { speed: 3, kick: 1.6, stroke: .8 }), pos: hp, t, face: F('determined', 'excited', .4) })],
    bubbles: [{ at: add3(hp, [-1.6, 0, 0]), t: t * 4, n: 90, spread: 1.2, rate: 3 }],
    overlay: svg(sub('STRONG SWIMMING MUSCLES', t, 17.99, 99, 320, 58, '#ffd34d')), grade: { bloom: .5, sat: 1.12, gain: [.92, 1.02, 1.08], whip: k > .8 ? (k - .8) * 2 : 0 } };
});
// 5a. DON'T ASSUME FISH GILLS (19.05 – 21.95)
shot(19.05, 21.95, t => {
  const hp: V3 = [-20, -7, -8]; const cam = cp(t, 19.05, 21.95, [{ p: add3(hp, [.6, .4, 4.2]), l: add3(hp, [-.6, .6, 0]), f: 44 }, { p: add3(hp, [.4, .5, 3.6]), l: add3(hp, [-.4, .7, 0]), f: 42 }]);
  const shake = Math.sin(t * 9) * .25 * k01(t, 20.7, 21.0) * (1 - k01(t, 21.5, 21.8));
  return { t, cam, light: SHALLOW(hp), cut: null, caust: 1.2, current: .5, snow: .6, rays: { k: .8, at: hp, spread: 16 },
    schools: [{ kind: 'FishOrange', center: add3(hp, [-1.2, .8, -1.5]), n: 26, r: 1.6, t, speed: .6 }],
    actors: [hero({ pose: { ...pose(t, 1, { turn: -.3, headTurn: shake, arms: [[-.8, -2.1], [.6, -1.7]], shapeA: 'point' }) }, pos: hp, t, face: F('suspicious', 'thinking', .3) })],
    bubbles: [{ at: add3(hp, [0, 1.6, 0]), t: t, n: 12, spread: .2 }],
    overlay: svg(sub('FISH BREATHE WITH GILLS', t, 19.6, 99, 320, 52, '#7ff3ff') + sub('NO HUMAN GILLS', t, 20.75, 99, 410, 64, '#fff') + cross(870, 395, 32, t, 21.05)),
    grade: { bloom: .5, sat: 1.1, gain: [.92, 1.02, 1.08], aperture: .4, focus: 4 } };
});
// 5b. MAMMALS LIKE WHALES STILL BREATHE AIR (21.95 – 24.05): a whale rises past us to the surface
shot(21.95, 24.05, t => {
  const k = k01(t, 21.95, 24.05); const wp: V3 = [6, mix(-16, -2.6, inOut(k)), mix(24, 6, k)];
  const cam = cp(t, 21.95, 24.05, [{ p: [-8, -12, 34], l: [6, -10, 18], f: 54 }, { p: [-9, -11, 33], l: [5, -3, 10], f: 56 }]);
  return { t, cam, light: SHALLOW(wp), cut: null, caust: 1.1, current: .4, snow: .5, rays: { k: 1.2, at: [6, 0, 12], spread: 30 },
    props: [{ name: 'Whale', pos: wp, rot: [-.35 * (1 - k), Math.PI, 0], scale: 1.2 }],
    bubbles: [{ at: add3(wp, [0, 1.6, -5]), t: t * 2, n: k > .85 ? 120 : 30, spread: 2.5, rate: 2 }],
    actors: [hero({ ...swimmer(t, -1, { speed: 1 }), pos: [-3, -9, 24], t, face: F('amazed') })],
    overlay: svg(sub('WHALES ARE MAMMALS', t, 22.3, 99, 320, 60, '#7ff3ff') + sub('THEY STILL BREATHE AIR', t, 23.6, 99, 410, 56)), grade: { bloom: .55, sat: 1.08, gain: [.92, 1.02, 1.08] } };
});
// 6. HOMES NEAR THE SURFACE, DIVING FOR FOOD TOGETHER (24.05 – 28.56)
shot(24.05, 28.56, t => {
  const k = k01(t, 26.2, 28.5);
  const cam = cp(t, 24.05, 28.56, [{ p: [52, -13, 52], l: [52, -1, 26], f: 58 }, { p: [52, -12.5, 50], l: [54, -5, 26], f: 56 }, { p: [53, -11, 46], l: [56, -10, 24], f: 52 }]);
  const divers = [0, 1, 2, 3].map(i => { const sx = HOMES[0] - 6 + i * 4, sz = 26 + (i % 2) * 6; const d = smooth(k01(t, 25.6 + i * .25, 28.4)); const pos: V3 = [sx + d * 2, mix(-.9, -9.5 - i * .6, d), sz];
    return folk(i, { pose: swimPose(t + i, { speed: 1.2 }), roll: d > .05 ? Math.PI * .8 : 0, pos, t, res: 640 }); });
  const hp: V3 = [HOMES[0] + 2, mix(-1, -9, smooth(k01(t, 26.1, 28.3))), 33];
  return { t, cam, light: SHALLOW(HOMES), cut: null, caust: 1.4, current: .5, snow: .5, rays: { k: 1.3, at: HOMES, spread: 30 },
    schools: [{ kind: 'FishYellow', center: [56, -10 - k, 26], n: 70, r: 5, t, speed: .3 }, { kind: 'FishBlue', center: [48, -9, 30], n: 50, r: 4, t, speed: -.35 }],
    actors: [hero({ pose: swimPose(t, { speed: 1.2 }), roll: t > 26.2 ? Math.PI * .8 : 0, pos: hp, t, face: F('happy') }), ...divers],
    bubbles: divers.map(d => ({ at: d.pos, t: t * 2, n: 14, spread: .3 })),
    overlay: svg(sub('HOMES NEAR THE SURFACE', t, 25.08, 26.2, 330, 58, '#ffd34d') + sub('DIVE FOR FOOD TOGETHER', t, 26.32, 99, 330, 56, '#7ff3ff')), grade: { bloom: .55, sat: 1.12, gain: [.92, 1.03, 1.08] } };
});
// 7. NOW IMAGINE EXPLORING THE DEEP (28.56 – 31.05): on the lip of the drop-off, the blue falls away
const EDGE: V3 = [10, -13, 70];
shot(28.56, 31.05, t => {
  const kick = smooth(k01(t, 30.2, 31.05)); const hp: V3 = add3(EDGE, [0, 1.4 - kick * 3, kick * 4]);
  const cam = cp(t, 28.56, 31.05, [{ p: add3(EDGE, [.4, 2.9, -6]), l: add3(EDGE, [0, -4, 22]), f: 52 }, { p: add3(EDGE, [.3, 3.2, -4.8]), l: add3(EDGE, [0, -9, 22]), f: 54 }]);
  return { t, cam, light: MID(EDGE), cut: null, caust: .7, current: .4, snow: .8, rays: { k: .9, at: EDGE, spread: 30, len: 60 },
    props: [{ name: 'Manta', pos: [-20 - t * .5, -30, 100], rot: [0, -1.4, 0], scale: 2.4 }],
    actors: [hero({ pose: P(pose(t, 1, { back: 1, headLift: .1, arms: [[-.9, -2.2], [.9, -2.2]], shapeA: 'open', shapeB: 'open' }), swimPose(t), kick), roll: kick * Math.PI * .8, pos: hp, t, face: F('curious', 'amazed', .4) })],
    overlay: svg(title('THE DEEP OCEAN', t, 30.03, 99, 320, 76)), grade: { bloom: .45, sat: 1.0, gain: [.88, 1.0, 1.1], vignette: .5 } };
});
// 8. EVERY 10 m ADDS ~1 ATMOSPHERE … AT 100 m ABOUT 11 (31.05 – 37.95): descent down the wall with a live gauge
shot(31.05, 37.95, t => {
  const k = k01(t, 31.05, 37.95); const hp: V3 = [10 + Math.sin(t * .6) * .6, mix(-16, -96, inOut(k)), mix(78, 112, k)];
  const cam = { pos: add3(hp, [3.6, 1.6, -1.4]), look: add3(hp, [0, -.8, 1.5]), fov: 52 };
  const dd = 10 * k01(t, 31.17, 33.68) + 90 * k01(t, 34.0, 35.0); const atm = 1 + dd / 10;
  const deepK = k01(hp[1], -30, -100);
  return { t, cam, light: deepK < .5 ? MID(hp) : DEEP(hp, (deepK - .5) * 1.2), cut: null, caust: .3 * (1 - deepK), current: .3, snow: 1, plankton: deepK * .3,
    rays: { k: .9 * (1 - deepK), at: [10, 0, 90], spread: 30, len: 80 },
    actors: [hero({ pose: swimPose(t, { speed: 1.1 }), roll: Math.PI * .85, pos: hp, t, face: t < 34.5 ? F('determined') : F('worried', 'determined', .4), tint: [1 - deepK * .5, 1 - deepK * .4, 1 - deepK * .2] })],
    bubbles: [{ at: add3(hp, [0, .8, 0]), t: t * 2, n: 24, spread: .3 }],
    overlay: svg(gauge(t, 31.1, dd, atm, 1 / atm, 37.9) + sub('+1 ATMOSPHERE EVERY 10 m', t, 31.5, 34.3, 320, 50, '#7ff3ff') + sub('100 m ≈ 11 ATMOSPHERES', t, 34.48, 99, 320, 56, '#ffd34d')),
    grade: { bloom: .5, sat: .95, gain: [.85, .98, 1.1], vignette: .55 } };
});
// 9. CLEVER TECHNOLOGY … AIR-FILLED LUNGS (37.95 – 43.65): the deep habitat, a submersible arrives
const HAB: V3 = [22, -112, 190];
shot(37.95, 43.65, t => {
  const k = k01(t, 37.95, 43.65); const subp: V3 = [mix(-4, 12, inOut(k)), -103 + Math.sin(t) * .3, mix(176, 184, k)];
  const cam = cp(t, 37.95, 43.65, [{ p: [0, -101, 166], l: [18, -106, 190], f: 50 }, { p: [4, -102, 168], l: [16, -106, 188], f: 48 }]);
  const lung = 1 - .55 * k01(t, 42.9, 43.5);
  return { t, cam, light: DEEP(HAB, .7, { points: [{ pos: [22, -105, 186], color: '#ffd7a0', int: 60, dist: 26, shadow: true }, { pos: add3(subp, [0, -.5, 2.5]), color: '#cfeeff', int: 40, dist: 20 }, { pos: [22, -101, 190], color: '#ff4a3a', int: 8 * (Math.sin(t * 4) > 0 ? 1 : .1), dist: 10 }] }), cut: null, caust: 0, current: .2, snow: 1, plankton: .4,
    show: { Submersible: true }, xform: { Submersible: { pos: subp, rot: [0, 1.25, 0], scale: 1.2 } },
    actors: [hero({ ...swimmer(t, 1, { speed: .8 }), pos: [mix(2, 10, k), -104.5, 179], t, face: F('amazed', 'curious', .5), tint: [.75, .82, .95] })],
    overlay: svg(sub('CLEVER TECHNOLOGY', t, 39.76, 99, 320, 62, '#7ff3ff') + (t > 42.6 ? `<g filter="url(#sh)" opacity="${k01(t, 42.6, 42.9)}" transform="translate(540 1330)"><path d="M-20 -90 v60 M20 -90 v60" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
      <ellipse cx="-70" cy="20" rx="${60 * lung}" ry="${90 * lung}" fill="#ff8a9a" stroke="#fff" stroke-width="6"/><ellipse cx="70" cy="20" rx="${60 * lung}" ry="${90 * lung}" fill="#ff8a9a" stroke="#fff" stroke-width="6"/>
      <text y="170" text-anchor="middle" font-size="40" font-weight="900" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke">AIR-FILLED LUNGS SQUEEZE</text></g>` : '')),
    grade: { bloom: .45, sat: 1.0, gain: [.9, .98, 1.1], vignette: .55 } };
});
// 10. DAYLIGHT FADES, COLDER, HUGE SHADOWS (43.65 – 48.55): jellyfish glow; a whale passes overhead as a silhouette
shot(43.65, 48.55, t => {
  const k = k01(t, 43.65, 48.55); const hp: V3 = [-6, -128 - k * 4, 230];
  const cam = cp(t, 43.65, 48.55, [{ p: add3(hp, [2.5, -1, 6]), l: add3(hp, [-1, 1.5, -2]), f: 54 }, { p: add3(hp, [2, -1.6, 5]), l: add3(hp, [-1, 5, -4]), f: 58 }]);
  const temp = Math.round(mix(22, 6, k01(t, 45.3, 46.8)));
  const jellies = [0, 1, 2, 3, 4, 5].map(i => ({ name: 'Jelly', pos: add3(hp, [-4 + i * 1.9 + Math.sin(t * .4 + i) * .5, 1 + (i % 3) * 1.4 + Math.sin(t * .8 + i) * .3, -3 - (i % 2) * 3]) as V3, rot: [0, i, 0] as V3, scale: .8 + (i % 3) * .3 }));
  const wk = k01(t, 46.5, 48.55);
  return { t, cam, light: DEEP(hp, .9 + k * .1, { points: [{ pos: add3(hp, [-1, 2, -3]), color: '#9a7aff', int: 12, dist: 14 }] }), cut: null, caust: 0, current: .2, snow: .9, plankton: .8,
    props: [...jellies, { name: 'Whale', pos: add3(hp, [mix(-40, 30, wk), 14, -6]), rot: [0, Math.PI / 2, 0], scale: 2.2 }],
    actors: [hero({ ...swimmer(t, -1, { speed: .7, stroke: .7 }), pos: hp, t, face: t < 46.6 ? F('curious') : F('terrified', 'amazed', .3), tint: [.55, .6, .85] })],
    overlay: svg(sub('THE DAYLIGHT FADES', t, 44.32, 45.3, 320, 58, '#7ff3ff') + readout(t, 45.35, 'WATER TEMPERATURE', `${temp} °C`, '#7fbfff', 46.6) + sub('HUGE SHADOWS DRIFT PAST', t, 46.72, 99, 320, 52, '#fff')),
    grade: { bloom: .8, sat: 1.05, gain: [.85, .9, 1.15], vignette: .6 } };
});
// 11. TOWARD THE LIGHT — A BEACH ABOVE THE WAVES (48.55 – 53.95): rising in the shallows of an unknown island
const ISL: V3 = [0, 0, -200];
shot(48.55, 53.95, t => {
  const k = k01(t, 48.55, 53.95); const hp: V3 = [2, mix(-9, -2.2, inOut(k)), mix(-170, -188, k)];
  const cam = cp(t, 48.55, 53.95, [{ p: add3(hp, [2.5, -2.5, 6]), l: add3(hp, [-1, 3, -10]), f: 54 }, { p: add3(hp, [1.6, -1.2, 4.2]), l: add3(hp, [-.5, 3.5, -14]), f: 56 }]);
  return { t, cam, light: SHALLOW(hp, { fog: ['#2aa8b8', .016] }), cut: null, caust: 1.6, current: .6, snow: .4, rays: { k: 1.5, at: hp, spread: 22 }, schools: [{ kind: 'FishYellow', center: add3(hp, [-3, 1, -4]), n: 30, r: 3, t, speed: .4 }],
    actors: [hero({ pose: P(swimPose(t), pose(t, 1, { back: 1, headLift: .15, arms: [[-.5, -2.2], [.95, -3.8]], shapeB: 'open' }), k01(t, 51.4, 52.4)), roll: (1 - k01(t, 51.4, 52.4)) * Math.PI * .5, pos: hp, t, face: F('amazed') })],
    bubbles: [{ at: add3(hp, [0, 1, 0]), t: t * 2, n: 16, spread: .3 }],
    overlay: svg(sub('SOMETHING NOBODY HAS EVER TOUCHED', t, 50.06, 52.2, 320, 44, '#fff') + title('A BEACH ABOVE THE WAVES', t, 52.39, 99, 320, 66, '#ffd34d')), grade: { bloom: .6, sat: 1.15, gain: [.95, 1.03, 1.06] } };
});
// 12. COULD THEIR BODIES SURVIVE A WORLD WITHOUT WATER? (53.95 – 60.0): breaking the surface at the shore — then back under (loop)
shot(53.95, 60, t => {
  const hp: V3 = [2, -1.15, -191]; const reach = smooth(k01(t, 54.6, 55.6)); const back = smooth(k01(t, 58.6, 59.9));
  const cam = cp(t, 53.95, 58.6, [{ p: [4.2, .35, -184], l: [1, 1.2, -200], f: 50 }, { p: [3.6, .3, -186], l: [0, 1.6, -202], f: 46 }]);
  const cam2 = { pos: add3(cam.pos, [0, -back * 2.4, back * 2]), look: add3(cam.look, [0, -back * 9, 0]), fov: cam.fov };
  return { t, cam: t < 58.6 ? cam : cam2, light: t < 58.9 ? SURF(ISL) : SHALLOW(hp), cut: null, caust: 1.4, current: .5, surface: { calm: .6 },
    actors: [hero({ pose: pose(t, 1, { back: 1, headLift: .1, arms: [[-.5, -1.9], [mix(.5, 1.25, reach), mix(-1.9, -3.1, reach)]], shapeB: 'open' }), pos: hp, t, face: F('curious', 'amazed', reach) })],
    overlay: svg(sub('A WORLD WITHOUT WATER?', t, 55.25, 58.4, 330, 64, '#fff') + pop('?', 540, 620, 220, t, 55.9, { color: '#ffd34d', out: 58.4 })),
    grade: { bloom: .55, sat: 1.12, gain: [1.02, 1.0, .98], vignette: .4 } };
});

export const SHOTS = S;
export function frameAt(frame: number): Frame6 {
  const t = Math.min(frame, FRAMES - 1) / FPS; const s = S.find(x => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
  const Fr = s.f(t); Fr.t = t; return Fr;
}
