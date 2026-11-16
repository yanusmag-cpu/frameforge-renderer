// Brazil heist PART 2 — the aftermath. 57.4 s timeline keyed to the word timestamps of the Part 2 narration (production/brazil-heist-2/timing.json).
// Frame 0 is Part 1's final frame; the last frame lands back on it (seamless loop).
import type { V3, Light, PropState } from '../brazil/engine.ts';
import type { Frame2 } from './engine2.ts';
import type { ActorState } from '../brazil/actor.ts';
import { CAST, pose, P, F, gesture, talk, camPath, drift, add3, inOut, mix, outBack, type PoseIn } from '../brazil/anim.ts';
import { walkPose, type Pose, type Look } from '../ff2d/rig.ts';
import { type V2 } from '../ff2d/motion.ts';
import { svg, pop, money, chip, stamp, calendar, projector } from '../brazil/overlay.ts';
import { frameAt as frameAt1, FRAMES as FRAMES1, DAY, GOLD, NIGHT, TUNNEL, VAULT, STUDIO, LAMPS, TF, VF, HOST_Z, palletShow, torchSvg, bag, sweat, k01 } from '../brazil/shots.ts';
import { MOUTH } from './mouth.ts';

export const FPS = 30, DURATION = 57.4, FRAMES = Math.round(DURATION * FPS);
let AUDIO_T = 0;
const mouth = () => { const i = Math.round(AUDIO_T * FPS); return i >= 0 && i < MOUTH.length ? +MOUTH[i] / 9 : 0; };
const END1 = () => frameAt1(FRAMES1 - 1) as Frame2;     // Part 1's last frame (= our first and last composition)

// ---------------------------------------------------------------------------------------------- Part 2 cast (Part 1 crew keep their exact looks)
const DET: Look = { outfit: 'suit', color: '#7a6a55', pants: '#3d362d', tie: '#8a2b2b', hairStyle: 'crop', hair: '#2a211b', beard: 'moustache', beardColor: '#2a211b' };
const AGENT: Look = { outfit: 'vest', color: '#1f2226', inner: '#e9e6df', pants: '#2b2e33', shoe: '#151515', hat: 'cap', hair: '#1f2226', badge: true };
const AGENT2: Look = { ...AGENT, hat: undefined, hairStyle: 'crop', hair: '#3a2a1e', glasses: true };
const COP: Look = CAST.cop, COP_BARE: Look = { ...CAST.cop, hat: undefined, hairStyle: 'crop', hair: '#1e1a16' };

// ---------------------------------------------------------------------------------------------- helpers
type Shot = { t0: number; t1: number; name: string; f: (t: number) => Frame2 };
const S: Shot[] = [];
const shot = (name: string, t0: number, t1: number, f: Shot['f']) => S.push({ name, t0, t1, f });
const O = 'stroke="#111" stroke-width=".045" stroke-linejoin="round"';
const torch = (h: V2, ang: number) => torchSvg(h, ang);
const cuffs = (c: V2) => `<g transform="translate(${c[0]} ${c[1]})"><circle cx="-.08" r=".07" fill="none" stroke="#111" stroke-width=".06"/><circle cx="-.08" r=".07" fill="none" stroke="#c9ced6" stroke-width=".03"/><circle cx=".08" r=".07" fill="none" stroke="#111" stroke-width=".06"/><circle cx=".08" r=".07" fill="none" stroke="#c9ced6" stroke-width=".03"/></g>`;
const radio = (c: V2) => `<g transform="translate(${c[0]} ${c[1]})"><rect x="-.07" y="-.16" width=".14" height=".3" rx=".03" fill="#2a2d31" ${O}/><path d="M.03 -.16 v-.16" stroke="#111" stroke-width=".05" stroke-linecap="round"/><rect x="-.045" y="-.1" width=".09" height=".07" fill="#7fd1a0"/></g>`;
const capSvg = (c: V2, rot = 0) => `<g transform="translate(${c[0]} ${c[1]}) rotate(${rot})"><path d="M-.32 .02 Q-.3 -.26 0 -.27 Q.3 -.26 .32 .02Z" fill="#1e2a40" ${O}/><path d="M-.36 .02 H.42" stroke="#111" stroke-width=".09" stroke-linecap="round"/><circle cy="-.13" r=".05" fill="#e3b341"/></g>`;
const tileSvg = (c: V2, rot = 0) => `<g transform="translate(${c[0]} ${c[1]}) rotate(${rot})"><rect x="-.34" y="-.05" width=".68" height=".1" rx=".02" fill="#a9adb2" ${O}/></g>`;
const brickSvg = (c: V2, rot = 0) => `<g transform="translate(${c[0]} ${c[1]}) rotate(${rot})"><rect x="-.3" y="-.18" width=".6" height=".36" rx=".04" fill="#8fbd7c" ${O}/><rect x="-.05" y="-.18" width=".1" height=".36" fill="#efe6cf" ${O}/></g>`;
const phoneSvg = (c: V2) => `<g transform="translate(${c[0]} ${c[1]})"><rect x="-.06" y="-.14" width=".12" height=".26" rx=".03" fill="#222" ${O}/><rect x="-.04" y="-.1" width=".08" height=".1" fill="#9ccfe8"/></g>`;
/** linear blend of two light rigs (sky/sun/hemi/fog colours and intensities) */
function mixLight(a: Light, b: Light, k: number): Light {
  const c = (x: string, y: string) => { const p = (s: string) => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = p(x), B = p(y); return '#' + A.map((v, i) => Math.round(mix(v, B[i], k)).toString(16).padStart(2, '0')).join(''); };
  return { sky: [c(a.sky[0], b.sky[0]), c(a.sky[1], b.sky[1])], sun: { ...a.sun, dir: a.sun.dir.map((v, i) => mix(v, b.sun.dir[i], k)) as V3, color: c(a.sun.color, b.sun.color), int: mix(a.sun.int, b.sun.int, k) },
    hemi: [c(a.hemi[0], b.hemi[0]), c(a.hemi[1], b.hemi[1]), mix(a.hemi[2], b.hemi[2], k)], amb: [c(a.amb[0], b.amb[0]), mix(a.amb[1], b.amb[1], k)], fog: [c(a.fog[0], b.fog[0]), mix(a.fog[1], b.fog[1], k)],
    env: mix(a.env, b.env, k), sunGlow: mix(a.sunGlow ?? 0, b.sunGlow ?? 0, k), stars: mix(a.stars ?? 0, b.stars ?? 0, k),
    points: (k < .5 ? a.points : b.points)?.map((p, i) => ({ ...p, int: p.int * (k < .5 ? 1 - k * 2 : (k - .5) * 2) + 0 * i })) };
}
const blendCam = (a: Frame2['cam'], b: Frame2['cam'], k: number) => ({ pos: [mix(a.pos[0], b.pos[0], k), mix(a.pos[1], b.pos[1], k), mix(a.pos[2], b.pos[2], k)] as V3, look: [mix(a.look[0], b.look[0], k), mix(a.look[1], b.look[1], k), mix(a.look[2], b.look[2], k)] as V3, fov: mix(a.fov, b.fov, k) });
/** kneel / crouch-down pose with a hand reaching toward the floor */
const kneel = (t: number, seed: number, dir: number, k: number, o: PoseIn = {}): Pose => P(pose(t, seed, { turn: .7 * dir }), pose(t, seed, { turn: .75 * dir, crouch: 1.05, lean: .38 * dir, footA: [-.55 * dir, -.08], footB: [.35 * dir, -.08], kneeDir: dir, headTilt: .25 * dir, arms: [[.25 * dir, -1.1], [.75 * dir, -.35]], shapeB: 'open', ...o }), k);
const indoor = (pts: Light['points'], o: Partial<Light> = {}): Light => ({ sky: ['#1b2433', '#38465c'], sun: { dir: [.4, .8, .3], color: '#fff3dc', int: 0, shadow: 0 }, hemi: ['#ffe7c8', '#4a3a2a', .45], amb: ['#ffffff', .08], fog: ['#20242b', .004], env: .6, sunGlow: 0, points: pts, ...o });

// ============================================================================================== 1. CONTINUING FROM PART 1 — the crew drags the last bags away (0 – 3.67)
//
shot('p2-open', 0, 3.67, (t) => {
  const E = END1(); const tilt = inOut(k01(t, .45, 2.3));
  const target = camPath(t, .45, 3.67, [{ p: [78.25, -5.0, 1.02], l: [71.0, -5.25, .95], f: 46 }, { p: [78.1, -5.02, 1.0], l: [70.5, -5.3, .95], f: 44 }], x => x);
  const cam = blendCam(E.cam, { pos: target.pos, look: target.look, fov: target.fov }, tilt);
  const walk = (id: 'bira' | 'marcos', x0: number, z: number, seed: number, lag: number) => {
    const d = Math.max(0, t - .6 - lag) * 1.05; const w = walkPose(d / .4167, -1, { step: 1.0, carryB: [-.62, -2.25] });
    const p = { ...w, handA: [-.45, -2.25] as V2, frontA: 1, frontB: 1, shapeA: 'hold', shapeB: 'hold' } as Pose;
    return { id, look: CAST[id], pose: d > 0 ? p : pose(t, seed, { turn: -.5, headTilt: -.2, arms: [[-.5, -1.7], [.4, -2.2]] }), face: d > 0 ? F('focused', 'determined', k01(t, 1.6, 2.4)) : F('worried'), pos: [x0 - d, TF, z] as V3, t, seed, res: 1536,
      extra: d > 0 ? bag([-.56, -2.05], 0, 1.05) : '', tint: [1, .9, .74] } as ActorState;
  };
  return { ...E, t, cam, actors: [walk('bira', 76.5, 1.12, 33, 0), walk('marcos', 77.3, .72, 31, .35)], bulbs: 79,
    overlay: svg(chip('PART 2', 70, 170, 46, t, .9, 3.3)), grade: { ...(E.grade ?? {}), exposure: mix(.78, .86, tilt), vignette: .5 } };
});

// ============================================================================================== 2. MONDAY — the vault door opens (3.67 – 6.44)
shot('p2-monday', 3.67, 6.44, (t) => {
  const c = camPath(t, 3.67, 6.44, [{ p: [81.2, -1.7, .55], l: [72.6, -2.0, -1.3], f: 44 }, { p: [80.5, -1.72, .35], l: [72.6, -1.95, -1.3], f: 40 }], x => x);
  const o = inOut(k01(t, 3.9, 5.2)); const enter = k01(t, 5.3, 6.44);
  const cops: ActorState[] = [0, 1].map(i => {
    const d = Math.max(0, enter * 1.9 - i * .5); const w = walkPose(d / .4167, 1, { step: 1.1 }); w.handB = [.62, -2.6]; w.shapeB = 'hold';
    return { id: 'cop' + i, look: i ? AGENT : COP, pose: w, face: F('focused', 'suspicious', k01(t, 5.8, 6.3)), pos: [71.4 + d, VF, -1.5 + i * .55] as V3, t, seed: 70 + i, res: 1024, extra: torch([.62, -2.6], -.1), tint: [.85, .9, 1] } as ActorState;
  }).filter(() => enter > .02);
  return { t, cam: c, light: VAULT(o, [{ pos: [70, -1.4, -1.4], color: '#fff2d8', int: 32 * o, dist: 10, shadow: true }]), cut: null, vaultWall: true, show: { ...palletShow(0), 'Floor plug': false }, bulbs: 0,
    xform: { 'Vault door': { rot: [0, o * 1.75, 0] } }, actors: cops,
    beam: enter > 0 ? { at: [72.0 + enter * 1.6, -1.55, -1.4], dir: [2.4, -.8, 1.0], k: .4 * k01(t, 5.5, 5.8) } : undefined,
    fx: [{ kind: 'motes', box: [[72, -2.9, -2.5], [77, -.8, .4]], n: 90 * o | 0, seed: 17, color: '#fff2d8', size: .03, t, alpha: .5 }],
    overlay: svg(t > 4.0 ? `<g transform="translate(540 360) scale(${outBack(k01(t, 4.0, 4.35), 1.8) * (1 - k01(t, 6.05, 6.35))}) translate(-540 -360)">${calendar(540, 360, 'MON', 'AUGUST 8, 2005', 0)}</g>` : ''),
    grade: { gain: [1.0, 1.0, 1.04], vignette: .5 } };
});

// ============================================================================================== 3. POLICE FIND THE HOLE (6.44 – 8.83)
shot('p2-police', 6.44, 8.83, (t) => {
  const c = camPath(t, 6.44, 8.83, [{ p: [81.0, -1.95, 1.15], l: [77.4, -2.6, .3], f: 46 }, { p: [80.7, -2.1, 1.1], l: [77.5, -2.75, .4], f: 42 }], x => x);
  const walkIn = k01(t, 6.44, 7.25), kn = inOut(k01(t, 7.15, 7.75)); const beamK = k01(t, 8.05, 8.3);
  const p1 = walkIn < 1 ? walkPose(walkIn * 1.1 / .4167, 1, { step: 1.0 }) : kneel(t, 70, 1, kn, { arms: [[.25, -1.15], [.95, -.95]], shapeB: 'hold' });
  const surprise = k01(t, 7.62, 7.9);
  const face1 = { ...F('curious', 'shocked', surprise), gx: .4, gy: .7 * kn };
  const r2 = gesture(t, 7.85, .35);
  return { t, cam: c, light: VAULT(1, [{ pos: [70, -1.4, -1.4], color: '#fff2d8', int: 26, dist: 9 }, { pos: [78.1, -3.6, .85], color: '#ffb468', int: 2 * beamK, dist: 4 }]), cut: null, vaultWall: true, show: { ...palletShow(0), 'Floor plug': false }, bulbs: 0,
    xform: { 'Vault door': { rot: [0, 1.75, 0] } },
    actors: [{ id: 'cop0', look: COP, pose: p1, face: face1, pos: [mix(75.9, 77.25, walkIn), VF, .85], t, seed: 70, res: 1536, extra: torch(walkIn < 1 ? [.62, -2.5] : [.95, -.95], walkIn < 1 ? -.1 : .55), tint: [.92, .94, 1] },
      { id: 'cop1', look: AGENT, pose: P(pose(t, 71, { turn: .55 }), pose(t, 71, { turn: .45, headTilt: .15, arms: [[-.4, -1.7], [.35, -3.55]], shapeB: 'hold' }), r2), face: { ...F('suspicious', 'shocked', k01(t, 8.2, 8.5)), gy: .5 }, pos: [76.0, VF, -.35], t, seed: 71, res: 1024,
        extra: r2 > .2 ? radio([.35, -3.62]) : '', tint: [.9, .92, 1] }],
    beam: { at: [77.6, -2.55, .85], dir: [.7, -2.6, 0], k: beamK },
    fx: [{ kind: 'motes', box: [[77.5, -4.5, .4], [78.6, -2.6, 1.3]], n: 60, seed: 21, color: '#ffe8c0', size: .025, t, alpha: .6 * beamK }],
    overlay: svg(chip('POLICE ARRIVE', 70, 170, 44, t, 6.75, 8.6)), grade: { gain: [1.0, 1.0, 1.04], vignette: .45 } };
});

// ============================================================================================== 4. THE TUNNEL IS EMPTY (8.83 – 10.74)
shot('p2-gone', 8.83, 10.74, (t) => {
  const c = t < 9.75 ? camPath(t, 8.83, 9.75, [{ p: [78.1, -2.3, .86], l: [78.12, -5.4, .9], f: 52 }, { p: [78.12, -4.1, .9], l: [77.4, -5.6, .9], f: 50 }, { p: [78.2, -5.0, 1.0], l: [72.0, -5.25, .95], f: 46 }], inOut)
    : camPath(t, 9.75, 10.74, [{ p: [78.2, -5.0, 1.0], l: [72.0, -5.25, .95], f: 46 }, { p: [77.4, -5.02, .98], l: [68.0, -5.3, .95], f: 44 }], x => 1 - (1 - x) ** 2);
  const sweep = Math.sin((t - 9.6) * 1.6) * .35;
  const props: PropState[] = [
    { name: 'Shovel', pos: [74.2, TF + .03, .62], rot: [Math.PI / 2, .3, 0] }, { name: 'Bucket', pos: [75.6, TF, 1.2], rot: [0, 0, Math.PI / 2 - .2] },
    { name: 'Pickaxe', pos: [71.8, TF + .02, .8], rot: [Math.PI / 2, -.8, 0] }, { name: 'Work lamp', pos: [73.0, -4.25, .95] }];
  return { t, cam: { ...c, pos: add3(c.pos, drift(t, .01)) }, light: TUNNEL(72, 3, { int: 1.6, maxX: 79, extra: [{ pos: [78.1, -3.0, .86], color: '#fff3dc', int: t < 9.5 ? 5 : 12, dist: 16, shadow: true }] }), cut: null, tunnelWall: true, bulbs: 79, props, show: { ...palletShow(0), 'Floor plug': false },
    beam: { at: [78.1, -3.05, .86], dir: [-7.5, -2.1 + sweep * .3, sweep], k: 1 },
    fx: [{ kind: 'motes', box: [[66, -5.8, .45], [78.5, -4.2, 1.45]], n: 220, seed: 22, color: '#ffe0b0', size: .025, t, alpha: .55 }],
    overlay: svg(pop('ALREADY GONE', 540, 1560, 84, t, 10.05, { color: '#ffd34d' })), grade: { exposure: 1.0, gain: [1.05, .98, .9], vignette: .55 } };
});

// ============================================================================================== 5. THE GETAWAY (10.74 – 14.09)
shot('p2-escape', 10.74, 14.09, (t) => {
  const drive = Math.max(0, t - 12.05); const carX = 2.9 + drive * drive * 2.2 + drive * 1.5;
  const c = camPath(t, 10.74, 14.09, [{ p: [-5.4, 1.7, 8.6], l: [.4, 1.0, 2.4], f: 42 }, { p: [-4.6, 1.8, 8.8], l: [2.4, .9, 2.8], f: 40 }, { p: [-2.5, 2.0, 9.4], l: [12, .9, 3.4], f: 40 }], x => x);
  const load = k01(t, 10.8, 11.55); const tiago = load < 1 ? walkPose(load * 1.4 / .4167, 1, { step: 1.0, carryB: [.6, -2.3] }) : pose(t, 34, { turn: .7, lean: .2, arms: [[.45, -2.05], [.85, -2.0]], shapeA: 'open', shapeB: 'open' });
  const away = k01(t, 11.75, 12.4);
  const actors: ActorState[] = [{ id: 'tiago', look: CAST.tiago, pose: away > 0 ? walkPose(away * 1.4 / .4167, -1, { step: 1.0 }) : tiago, face: F('nervous'), pos: [away > 0 ? .3 - away * 1.4 : mix(-1.1, .3, load), .15, 2.15], t, seed: 34, res: 1024, extra: load < 1 ? bag([.6, -2.1], 0, 1.05) : '', tint: [.8, .82, 1] }];
  const v = 7e7 * (1 - (1 - k01(t, 12.55, 13.6)) ** 3);
  return { t, cam: c, light: NIGHT([0, 0, 4], LAMPS), cut: null, sign: 1, show: { 'Parked car A': true }, xform: { 'Parked car A': { pos: [carX - 20, 0, -.2] } }, actors,
    fx: [{ kind: 'puff', at: [carX - 1.9, .3, 3.2], t: Math.max(0, drive), n: drive > 0 ? 14 : 0, seed: 23, spread: .4, rise: .3, size: .35, color: '#9aa4b8', alpha: .25, dur: 1.6 }],
    overlay: svg(t > 12.55 ? money(v, 540, 380, 132, 1) + pop('NEARLY', 540, 250, 56, t, 12.2, { color: '#fff', weight: 800 }) : ''), grade: { gain: [.95, .98, 1.08], bloom: .5 } };
});

// ============================================================================================== 6. PRESENTER (14.09 – 16.72)
const studioHost = (t: number, ov: string, cam?: { pos: V3; look: V3; fov: number }, hostPose?: Pose, face?: ReturnType<typeof F>): Frame2 => ({
  t, cam: cam!, light: STUDIO(1, [78, 0, 4]), cut: 12.6, show: { 'Studio L': true, 'Studio R': true, 'Studio floor': true, 'Hook cash': true },
  xform: { 'Studio L': { pos: [-5.8, 0, 1.5] }, 'Studio R': { pos: [5.8, 0, 1.5] }, 'Studio floor': { pos: [0, 0, 1.5] } },
  actors: [{ id: 'host', look: CAST.host, pose: hostPose!, face: talk(face!, mouth()), pos: [78, .08, HOST_Z], t, seed: 3, res: 2048, rim: '#ff7058', rimSide: 1, tint: [1, 1, 1], lean: .2, shadow: true }],
  grade: { bloom: .4, lift: [.02, .01, .03], gain: [1.04, 1.0, .96] },
  fx: [{ kind: 'motes', box: [[74, .2, 2], [82, 4.5, 6]], n: 90, seed: 1, color: '#ffd38a', size: .05, t, alpha: .5 }], overlay: ov });
shot('p2-mistake', 14.09, 16.72, (t) => {
  const c = camPath(t, 14.09, 16.72, [{ p: [78, 1.52, 10.9], l: [78, 1.45, HOST_Z], f: 30 }, { p: [78, 1.5, 10.15], l: [78, 1.47, HOST_Z], f: 28 }], x => x);
  const base = pose(t, 3, { turn: 0, arms: [[-.24, -2.15], [.24, -2.12]], shapeA: 'fist', shapeB: 'fist' });
  const one = pose(t, 3, { turn: -.05, headTilt: .08, arms: [[-.45, -1.75], [.75, -3.55]], shapeA: 'fist', shapeB: 'point' });
  const wide = pose(t, 3, { turn: 0, lean: .03, headLift: .04, arms: [[-1.12, -2.72], [1.12, -2.7]], shapeA: 'open', shapeB: 'open' });
  const lean = pose(t, 3, { turn: .1, lean: .1, headTilt: -.12, arms: [[-.4, -1.75], [.55, -2.45]], shapeA: 'fist', shapeB: 'point' });
  let p = P(base, one, gesture(t, 14.95, .35)); p = P(p, wide, gesture(t, 15.35, .3)); p = P(p, lean, gesture(t, 15.9, .35));
  const face = t < 15.3 ? F('smug') : t < 15.9 ? F('surprise', 'shocked', k01(t, 15.4, 15.7)) : F('slySmile', 'smirk', k01(t, 16.0, 16.4));
  return studioHost(t, svg(pop('ONE MASSIVE MISTAKE', 540, 1570, 78, t, 15.4, { color: '#ffd34d' })), c, p, face);
});

// ============================================================================================== 7. TOO MUCH CASH (16.72 – 19.36)
const stashProps = (n: number): PropState[] => {
  const o: PropState[] = []; let k = 0;
  for (let i = 0; i < 6 && k < n; i++) for (let j = 0; j < 4 && k < n; j++) for (let h = 0; h < 3 && k < n; h++, k++) o.push({ name: 'Cash brick', pos: [201.2 + i * .52, .15 + h * .31, -4.6 + j * .34 + (i % 2) * .05], rot: [0, (i * j % 3) * .05, 0] });
  for (let i = 0; i < 5 && k < n; i++, k++) o.push({ name: 'Cash brick', pos: [201.6 + i * .55, .68, -5.2], rot: [0, .2 * i, 0] });     // on the sofa
  for (let i = 0; i < 4 && k < n; i++, k++) o.push({ name: 'Cash brick', pos: [201.75 + (i % 2) * .5, .58 + Math.floor(i / 2) * .31, -3.6], rot: [0, .1, 0] }); // coffee table
  return o;
};
shot('p2-toomuch', 16.72, 19.36, (t) => {
  const c = camPath(t, 16.72, 19.36, [{ p: [201.0, 1.75, -5.55], l: [206.4, 1.0, -.6], f: 50 }, { p: [201.5, 1.55, -5.2], l: [206.4, 1.1, -.6], f: 46 }], x => x);
  const turn = inOut(k01(t, 17.9, 18.4)); const sweep = k01(t, 18.3, 19.3);
  const peek = pose(t, 33, { back: 1, turn: .2, headTurn: .3, arms: [[.25, -2.9], [.6, -3.0]], shapeA: 'open', shapeB: 'open' });
  const look = pose(t, 33, { turn: -.55, lean: -.05, headTilt: .1, arms: [[-.5, -1.9], [.55, -2.9]], shapeA: 'fist', shapeB: 'open' });
  const head: V3 = [mix(212, 199, sweep), 1.2, 4];
  return { t, cam: c, light: indoor([{ pos: [204.5, 2.6, -3.0], color: '#ffc27a', int: 9, dist: 8, shadow: true }, { pos: [206.8, 2.6, 1.8], color: '#9fb6ff', int: 10, dist: 8 }, { pos: head, color: '#fff4d8', int: 30 * Math.sin(sweep * Math.PI), dist: 14 }],
      { sky: ['#050b1d', '#18294a'] }), cut: null, props: stashProps(36),
    actors: [{ id: 'bira', look: CAST.bira, pose: P(peek, look, turn), face: turn < .5 ? F('nervous') : { ...F('nervous', 'fear', k01(t, 18.6, 19.0)), gx: -.4 }, pos: [206.6, .15, -.75], t, seed: 33, res: 1536, extra: sweat(.35, -4.3, turn), tint: [1, .9, .8] }],
    fx: [{ kind: 'motes', box: [[201, .3, -5.6], [208, 2.6, -.4]], n: 70, seed: 24, color: '#ffd9a0', size: .025, t, alpha: .4 }],
    overlay: svg(pop('3.5 TONNES OF CASH', 540, 300, 62, t, 17.6, { color: '#ffd34d' }) + pop('HARD TO HIDE', 540, 380, 48, t, 18.4, { color: '#fff', weight: 800 })), grade: { gain: [1.04, .98, .94], vignette: .5 } };
});

// ============================================================================================== 8. TRACKING THE SUSPECTS (19.36 – 21.54)
const hqLight = (o: Partial<Light> = {}): Light => indoor([{ pos: [410.5, 2.3, -3.8], color: '#fff1d6', int: 22, dist: 12, shadow: true }, { pos: [406, 3.0, -3.5], color: '#e8f0ff', int: 9, dist: 9 }, { pos: [403.5, 1.3, -4.1], color: '#ffd38a', int: 3, dist: 3 }], { hemi: ['#f4f0e6', '#5a4a3a', .55], ...o });
shot('p2-tracking', 19.36, 21.54, (t) => {
  const c = camPath(t, 19.36, 21.54, [{ p: [407.6, 1.65, -2.4], l: [405.6, 1.8, -7], f: 46 }, { p: [407, 1.7, -3.6], l: [405.4, 1.8, -7], f: 42 }], x => x);
  const pin = gesture(t, 19.6, .4), point = gesture(t, 20.1, .35), turn = gesture(t, 20.95, .35);
  let p = pose(t, 90, { back: 1, turn: -.15, arms: [[-.35, -1.8], [.3, -1.85]] });
  p = P(p, pose(t, 90, { back: 1, turn: -.2, arms: [[-.35, -1.8], [.55, -3.65]], shapeB: 'hold' }), pin * (1 - point));
  p = P(p, pose(t, 90, { turn: -.45, headTurn: -.2, arms: [[-.35, -1.8], [-1.1, -3.4]], shapeA: 'fist', shapeB: 'point' }), point);
  p = P(p, pose(t, 90, { turn: .55, arms: [[-.4, -1.75], [.6, -2.6]], shapeB: 'point' }), turn);
  const face = turn > .3 ? F('determined', 'confident', turn) : point > .3 ? F('focused', 'suspicious', point) : F('focused');
  return { t, cam: c, light: hqLight(), cut: null, board: k01(t, 19.7, 21.3), xform: { 'Ceiling fan': { rot: [0, t * 3.2, 0] } },
    actors: [{ id: 'det', look: DET, pose: p, face, pos: [405.4, 0, -6.15], t, seed: 90, res: 1536, tint: [1, .97, .92] },
      { id: 'ag2', look: AGENT2, pose: pose(t, 91, { turn: -.4, crouch: .35, headTilt: .1, arms: [[-.6, -2.0], [-.55, -3.3]], shapeB: 'hold' }), face: talk(F('focused'), (Math.sin(t * 9) * .5 + .5) * .5), pos: [408.6, 0, -2.75], t, seed: 91, res: 1024, extra: phoneSvg([-.5, -3.38]) }],
    fx: [{ kind: 'motes', box: [[404, .5, -6], [412, 3, -1]], n: 90, seed: 25, color: '#fff2d0', size: .02, t, alpha: .5 }],
    overlay: svg(chip('POLÍCIA FEDERAL · FORTALEZA', 70, 170, 38, t, 19.5)), grade: { gain: [1.04, 1.0, .95] } };
});

// ============================================================================================== 9. MONEY UNDER THE FLOOR (21.54 – 25.45)
shot('p2-stash', 21.54, 25.45, (t) => {
  const c = camPath(t, 21.54, 25.45, [{ p: [207.0, 2.15, -.9], l: [204.6, .3, -2.9], f: 46 }, { p: [206.6, 1.95, -1.35], l: [204.7, .2, -2.95], f: 42 }, { p: [206.2, 1.6, -1.7], l: [204.7, .5, -3.0], f: 42 }], inOut);
  const rug = inOut(k01(t, 21.55, 22.1)); const kn = inOut(k01(t, 21.9, 22.3)); const lift = inOut(k01(t, 22.25, 22.85)); const glow = k01(t, 22.7, 23.3);
  const stand = inOut(k01(t, 23.85, 24.35)); const call = gesture(t, 24.3, .35);
  let p = kneel(t, 90, 1, kn, { arms: [[.4, -1.2], [1.0, -.25]], shapeB: 'hold' });
  if (lift > 0) p = P(p, kneel(t, 90, 1, 1, { arms: [[.7, -1.3], [.95, -1.55]], shapeA: 'hold', shapeB: 'hold', headTilt: .4 }), lift);
  if (glow > 0) p = P(p, kneel(t, 90, 1, 1, { arms: [[-.5, -1.6], [.8, -1.4]], shapeA: 'open', shapeB: 'open', headTilt: .3, lean: .15 }), glow);
  p = P(p, pose(t, 90, { turn: -.35, headTurn: -.4, arms: [[-.9, -3.3], [.45, -1.9]], shapeA: 'open', shapeB: 'fist' }), stand);
  p = P(p, pose(t, 90, { turn: -.4, headTurn: -.45, arms: [[-.5, -1.8], [-.35, -3.55]], shapeB: 'hold' }), call * stand);
  const face = glow > .3 ? (stand > .4 ? talk(F('happy', 'amused', .5), Math.abs(Math.sin(t * 11)) * .6) : { ...F('shocked', 'realization', k01(t, 23.3, 23.8)), gy: .8 * (1 - stand) }) : { ...F('curious', 'suspicious', k01(t, 21.6, 22.0)), gy: .8 };
  const extra = (lift > 0 && lift < 1 ? tileSvg([.95, -1.5], 20) : '') + (call > .2 ? radio([-.35, -3.62]) : '');
  const ag = walkPose(Math.min(1, k01(t, 24.4, 25.45)) * 1.6 / .4167, 1, { step: 1.05 });
  return { t, cam: c, light: indoor([{ pos: [206.8, 2.0, .6], color: '#fff3dc', int: 18, dist: 10, shadow: true }, { pos: [204.5, 2.7, -3], color: '#ffe2b0', int: 5, dist: 7 }, { pos: [204.7, .1, -2.9], color: '#ffcf70', int: 4.5 * glow, dist: 2.6 }], { hemi: ['#fff0dc', '#5a4a3a', .6] }),
    cut: null, xform: { Rug: { pos: [-1.9 * rug, 0, .35 * rug], rot: [0, .25 * rug, 0] }, 'Stash tiles': { pos: [-1.2 * lift, .02 + .25 * Math.sin(lift * Math.PI), .6 * lift], rot: [0, 0, 0] } },
    actors: [{ id: 'det', look: DET, pose: p, face, pos: [203.55, .15, -2.85], t, seed: 90, res: 1536, extra, tint: [1, .97, .92] },
      ...(t > 24.4 ? [{ id: 'ag1', look: AGENT, pose: ag, face: F('surprise'), pos: [201.0 + Math.min(1, k01(t, 24.4, 25.45)) * 1.6, .15, -1.4] as V3, t, seed: 92, res: 1024 } as ActorState] : [])],
    fx: [{ kind: 'motes', box: [[203.9, .1, -3.6], [205.5, 1.6, -2.2]], n: 80 * glow | 0, seed: 26, color: '#ffe4a0', size: .03, t, alpha: .8 },
      ...(lift > 0 ? [{ kind: 'puff' as const, at: [204.7, .17, -2.9] as V3, t: t - 22.3, n: 16, seed: 27, spread: .5, rise: .25, size: .25, color: '#c8b9a0', alpha: .35, dur: 1.4 }] : [])],
    overlay: svg(pop('MILLIONS', 540, 300, 104, t, 23.05, { color: '#ffd34d' }) + pop('UNDER THE FLOOR', 540, 390, 56, t, 23.8, { color: '#fff', weight: 800 })), grade: { gain: [1.05, 1.0, .94], bloom: .45 } };
});

// ============================================================================================== 10. THINGS GET DARKER (25.45 – 27.53)
shot('p2-darker', 25.45, 27.53, (t) => {
  const c = camPath(t, 25.45, 27.53, [{ p: [204.5, 1.5, 6.6], l: [205.2, 1.7, 0], f: 40 }, { p: [204.8, 2.8, 10.3], l: [205.2, 2.0, 0], f: 46 }], x => x);
  const k = inOut(k01(t, 25.8, 27.2));
  const day = DAY([205, 0, 2], 25), night: Light = { ...NIGHT([205, 0, 2]), hemi: ['#4a62a0', '#1a1410', .75], points: [{ pos: [204.5, 3.6, 4.2], color: '#9fb6ff', int: 30, dist: 14 }, { pos: [218.4, 7.2, 1.9], color: '#ffb46a', int: 120, dist: 26 }, { pos: [206.8, 1.6, -.5], color: '#ffc27a', int: 14, dist: 7 }, { pos: [196, 7.2, 1.9], color: '#ffb46a', int: 90, dist: 24 }] };
  return { t, cam: c, light: mixLight(day, night, k), cut: null, siren: 0, overlay: svg(pop('MUCH DARKER', 540, 1560, 84, t, 26.85, { color: '#ff5a48' })), grade: { exposure: mix(1, 1.05, k), sat: mix(1.05, .82, k), vignette: mix(.32, .55, k), gain: [mix(1.02, .92, k), mix(1, .96, k), mix(.96, 1.1, k)] } };
});

// ============================================================================================== 11. KIDNAPPINGS & EXTORTION (27.53 – 32.04) — shown without violence: a car pulls up, then only his cap is left
shot('p2-kidnap', 27.53, 32.04, (t) => {
  const walkD = Math.min(t - 27.53, 2.0) * 1.15; const stop = k01(t, 29.4, 29.7);
  const bx = 24 + walkD;
  const carIn = 1 - (1 - k01(t, 28.4, 29.9)) ** 2; const carOut = Math.max(0, t - 30.75);
  const carX = mix(6, bx + 1.2, carIn) + carOut * carOut * 3 + carOut * 2;
  const c = camPath(t, 27.53, 32.04, [{ p: [20.5, 1.35, 9.4], l: [25.5, 1.1, 1.2], f: 40 }, { p: [22.5, 1.5, 9.6], l: [27.5, 1.3, 1.6], f: 40 }, { p: [24.0, 3.2, 10.2], l: [28.0, 1.0, 2.0], f: 42 }], x => x);
  const gone = t > 30.55;
  const look = gesture(t, 28.2, .4) * (1 - k01(t, 28.9, 29.2));
  let p = walkD < 2.3 && stop < 1 ? walkPose(walkD / .4167, 1, { step: 1.05 }) : pose(t, 33, { turn: .6 });
  if (stop > 0) p = P(p, pose(t, 33, { turn: .2, lean: -.12, headLift: .08, arms: [[-.9, -2.6], [.8, -2.7]], shapeA: 'open', shapeB: 'open' }), stop);
  const face = stop > 0 ? F('shocked', 'terror', k01(t, 29.8, 30.3)) : { ...F('nervous'), gx: -.8 * look };
  const ov = (t > 31.15 ? `<g transform="translate(540 1450) rotate(${-4 + Math.sin(t * 2) * .5}) scale(${outBack(k01(t, 31.15, 31.45), 1.8)})" filter="url(#sh)">
      <rect x="-330" y="-150" width="660" height="300" rx="10" fill="#f3efe4" stroke="#111" stroke-width="5"/>
      ${'PAGUE R$'.split('').map((ch, i) => `<g transform="translate(${-270 + i * 76} ${-20 + (i % 2) * 14}) rotate(${(i * 37 % 9) - 4})"><rect x="-32" y="-52" width="64" height="74" fill="${['#e5322d', '#1d3a6b', '#f2c230', '#222', '#3b8a4a'][i % 5]}"/><text y="10" text-anchor="middle" font-size="58" font-weight="900" fill="#fff">${ch === ' ' ? '' : ch}</text></g>`).join('')}
      <text y="110" text-anchor="middle" font-size="40" font-weight="800" fill="#333">???</text></g>` : '')
    + pop('KIDNAPPINGS', 540, 300, 88, t, 30.3, { color: '#ff5a48' }) + pop('& EXTORTION', 540, 390, 64, t, 31.2, { color: '#fff' });
  return { t, cam: c, light: NIGHT([28, 0, 3], [[16, 7.2, .5], [30, 7.2, .5]]), cut: null, sign: 1,
    show: { 'Dark car': true }, xform: { 'Dark car': { pos: [carX - 541, 0, 4.4 + .3], rot: [0, -.25, 0] } },
    actors: gone ? [] : [{ id: 'bira', look: CAST.bira, pose: p, face, pos: [bx, .15, 1.0], t, seed: 33, res: 1536, tint: [.8, .84, 1] }],
    props: gone ? [{ name: 'Newspaper', pos: [bx + .2, .16, 1.1], rot: [0, .6, 0] }] : [],
    fx: carOut > 0 ? [{ kind: 'puff', at: [carX - 2, .3, 4.7], t: carOut, n: 16, seed: 28, spread: .4, rise: .3, size: .4, color: '#8a94a8', alpha: .3, dur: 1.6 }] : [],
    overlay: svg(ov), grade: { exposure: .9, sat: .82, gain: [.92, .96, 1.1], vignette: .6 } };
});

// ============================================================================================== 12. ROADSIDE AT DAWN (32.04 – 35.54)  (no body shown)
shot('p2-found', 32.04, 35.54, (t) => {
  const c = camPath(t, 32.04, 35.54, [{ p: [533.5, 1.5, 9.0], l: [541, .8, 0], f: 40 }, { p: [535.5, 1.35, 7.0], l: [541, .9, 0], f: 36 }], x => x);
  const capOff = inOut(k01(t, 34.55, 35.1));
  const c1 = P(pose(t, 72, { turn: .5, arms: [[-.4, -1.7], [.4, -1.7]] }), pose(t, 72, { turn: .45, headTilt: .28, arms: [[-.2, -2.3], [.25, -2.35]], shapeA: 'hold', shapeB: 'hold' }), capOff);
  return { t, cam: { ...c, pos: add3(c.pos, drift(t, .01)) }, light: { ...GOLD([541, 0, 0], 30), fog: ['#e9c3a0', .02], sun: { dir: [-.9, .22, .4], color: '#ffb46e', int: 3.2, focus: [541, 0, 0], size: 30 } }, cut: null,
    show: { 'Dark car': true, 'Car door open': true, Tape: true }, siren: .5,
    actors: [{ id: 'cop0', look: capOff > .3 ? COP_BARE : COP, pose: c1, face: F('concern', 'sad', capOff), pos: [538.8, 0, 3.4], t, seed: 72, res: 1536, extra: capOff > .3 ? capSvg([0, -2.42]) : '' },
      { id: 'cop1', look: COP, pose: pose(t, 73, { turn: -.6, headTilt: .15, arms: [[-.45, -1.7], [.3, -1.75]] }), face: F('sad'), pos: [543.6, 0, 3.0], t, seed: 73, res: 1024 }],
    fx: [{ kind: 'motes', box: [[534, .2, -3], [548, 3, 6]], n: 120, seed: 29, color: '#ffe0b0', size: .04, t, alpha: .4 }],
    overlay: svg(pop('KIDNAPPED', 540, 300, 84, t, 33.65, { color: '#fff' }) + pop('LATER FOUND DEAD', 540, 390, 60, t, 34.75, { color: '#ffb46e', weight: 800 })), grade: { sat: .85, gain: [1.06, .98, .9], vignette: .55 } };
});

// ============================================================================================== 13. ARRESTS (35.54 – 38.95)
shot('p2-arrests', 35.54, 38.95, (t) => {
  const c = camPath(t, 35.54, 38.95, [{ p: [605.6, 1.45, 9.6], l: [609.9, 1.3, 3.2], f: 40 }, { p: [606.2, 1.9, 10.2], l: [609.5, 1.2, 3.3], f: 42 }], x => x);
  const pair = (id: string, look: Look, aid: string, x0: number, z: number, lag: number, seed: number): ActorState[] => {
    const d = Math.max(0, t - 36.3 - lag) * 1.0; const w = walkPose(d / .4167, -1, { step: .95 }); const sus = { ...w, handA: [-.06, -1.6] as V2, handB: [.06, -1.6] as V2, headTilt: .25, frontA: 1, frontB: 1 } as Pose;
    const ag = walkPose(d / .4167, -1, { step: .95 }); ag.handA = [-.55, -2.0]; ag.shapeA = 'hold';
    return [{ id, look, pose: sus, face: F('sad', 'disappointment', .5), pos: [x0 - d, z < 4 ? .15 : 0, z], t, seed, res: 1024, extra: cuffs([0, -1.6]) },
      { id: aid, look: AGENT, pose: ag, face: F('determined'), pos: [x0 - d + .75, z + .3 < 4 ? .15 : 0, z + .3], t, seed: seed + 1, res: 1024 }];
  };
  const yr = Math.min(2008, 2005 + Math.floor(k01(t, 35.8, 37.4) * 3.99));
  return { t, cam: c, light: DAY([608, 0, 0], 30, { sun: { dir: [-.6, .75, .55], color: '#fff0d6', int: 3.0, focus: [608, 0, 0], size: 30 } }), cut: null, siren: 1,
    actors: [...pair('sus1', CAST.tiago, 'agA', 611.8, 3.65, 0, 100), ...pair('sus2', CAST.claudio, 'agB', 613.6, 4.3, .55, 102)],
    overlay: svg(`<g transform="translate(540 620) scale(${outBack(k01(t, 35.6, 35.95), 1.8)})" ><g transform="translate(-540 -620)">${calendar(540, 620, String(yr), 'THE FOLLOWING YEARS', (k01(t, 35.8, 37.4) * 3.99) % 1)}</g></g>`) + svg(pop('DOZENS ARRESTED', 540, 1560, 84, t, 38.35, { color: '#ffd34d' })),
    fx: [], grade: { gain: [1.03, 1.0, .96] } };
});
shot('p2-board', 38.95, 40.69, (t) => {
  const c = camPath(t, 38.95, 40.69, [{ p: [406, 1.8, -4.2], l: [406, 1.8, -7], f: 46 }, { p: [406, 1.8, -4.9], l: [406, 1.8, -7], f: 44 }], x => x);
  return { t, cam: c, light: hqLight(), cut: null, board: 1 + k01(t, 38.95, 40.4) * 9.2, xform: { 'Ceiling fan': { rot: [0, t * 3.2, 0] } }, grade: { gain: [1.04, 1.0, .95] } };
});

// ============================================================================================== 14. PRESENTER (40.69 – 42.78)
shot('p2-unbelievable', 40.69, 42.78, (t) => {
  const c = camPath(t, 40.69, 42.78, [{ p: [77.2, 1.4, 11.2], l: [78, 1.5, HOST_Z], f: 32 }, { p: [77.6, 1.45, 10.2], l: [78, 1.55, HOST_Z], f: 28 }], x => x);
  const lean = gesture(t, 41.1, .4);
  const p = P(pose(t, 3, { turn: 0, arms: [[-.24, -2.15], [.24, -2.12]], shapeA: 'fist', shapeB: 'fist' }), pose(t, 3, { turn: -.12, lean: -.12, headTilt: -.12, arms: [[-.9, -3.3], [.35, -3.75]], shapeA: 'open', shapeB: 'open' }), lean);
  return studioHost(t, '', c, p, t < 41.3 ? F('curious') : F('slySmile', 'surprise', k01(t, 42.0, 42.5)));
});

// ============================================================================================== 15. THE MISSING FORTUNE (42.78 – 50.75)
shot('p2-evidence', 42.78, 50.75, (t) => {
  const c = camPath(t, 42.78, 50.75, [{ p: [437.5, 1.6, -.5], l: [432.4, 1.0, -2.3], f: 50 }, { p: [436.4, 1.5, -.6], l: [433.4, 1.0, -2.6], f: 40 }, { p: [437.6, 2.6, -.4], l: [432.6, .4, -1.7], f: 54 }, { p: [437.7, 2.75, -.35], l: [432.6, .35, -1.55], f: 56 }], inOut);
  const wk = k01(t, 42.85, 44.6); const lift = gesture(t, 45.55, .4) * (1 - k01(t, 47.0, 47.5)); const slump = inOut(k01(t, 48.6, 49.3));
  let p = wk < 1 ? walkPose(wk * 2.2 / .4167, 1, { step: 1.05 }) : pose(t, 90, { turn: .35, headTilt: .2, arms: [[-.4, -1.75], [.35, -1.8]] });
  if (wk >= 1) p = P(p, pose(t, 90, { turn: .3, arms: [[-.4, -1.75], [.55, -2.9]], shapeB: 'hold', headTilt: -.05 }), lift);
  p = P(p, pose(t, 90, { turn: .45, headTilt: .35, lean: .06, arms: [[-.2, -1.6], [.25, -1.55]], shapeA: 'fist', shapeB: 'fist' }), slump);
  const face = slump > .2 ? F('disappointment') : lift > .3 ? F('thinking') : F('focused');
  const pr = projector(c.pos, c.look, c.fov);
  const q = [0, 1, 2].map(i => { const s = pr([431.2 + i * 1.4, .9, -.9]); return s[2] < 1 ? pop('?', s[0], s[1], 120, t, 48.5 + i * .15, { color: '#ffd34d' }) : ''; }).join('');
  const bar = (k: number) => k <= 0 ? '' : `<g opacity="${k}" filter="url(#sh)"><rect x="110" y="1430" width="860" height="70" rx="12" fill="#1b1d22" stroke="#fff" stroke-width="5"/><rect x="116" y="1436" width="${(848 * .22) * inOut(k01(t, 46.4, 47.0))}" height="58" rx="9" fill="#ffd34d"/>
      <text x="120" y="1410" font-size="40" font-weight="800" fill="#ffd34d">RECOVERED</text><text x="965" y="1410" font-size="40" font-weight="800" fill="#fff" text-anchor="end">STILL MISSING</text></g>`;
  return { t, cam: c, light: indoor([{ pos: [432, 2.9, -3], color: '#eef4ff', int: 10, dist: 9, shadow: true }, { pos: [436, 2.9, -3], color: '#eef4ff', int: 9, dist: 9 }, { pos: [434, 1.5, .5], color: '#ffe9c8', int: 6, dist: 7 }], { hemi: ['#e9f0ff', '#4a4a50', .5] }),
    cut: null, props: [{ name: 'Evidence box', pos: [437.2, 0, -4.6], rot: [0, .3, 0] }, { name: 'Evidence box', pos: [437.3, .32, -4.55], rot: [0, -.2, 0] }],
    actors: [{ id: 'det', look: DET, pose: p, face, pos: [mix(430.6, 433, wk), 0, -1.75], t, seed: 90, res: 1536, extra: lift > .3 ? brickSvg([.55, -3.05], -8) : '', tint: [.96, .98, 1] }],
    overlay: svg(chip('EVIDENCE ROOM', 70, 170, 40, t, 42.95, 45.4) + bar(k01(t, 46.3, 46.6)) + q + stamp('UNACCOUNTED FOR', 540, 330, 76, t, 49.45, '#ff5a48', -4)),
    grade: { gain: [.98, 1.0, 1.04], vignette: .45 } };
});

// ============================================================================================== 16. LOOP HOME (50.75 – 57.4) — bank at dusk → down into the earth → the tunnel → up into the concrete (= frame 0)
shot('p2-loop', 50.75, 57.4, (t) => {
  const E = END1();
  if (t < 53.6) {   // exterior → cutaway section of the street, bank and tunnel
    const k = k01(t, 50.75, 53.6);
    const c = camPath(t, 50.75, 53.6, [{ p: [97, 3.2, 20], l: [70, -.5, 0], f: 40 }, { p: [86, .2, 14], l: [74, -3.2, 0], f: 40 }, { p: [80.2, -3.9, 7.6], l: [77.0, -4.8, .8], f: 42 }, { p: [78.7, -4.9, 2.4], l: [75.0, -5.0, .9], f: 44 }], inOut);
    const cops: ActorState[] = [0, 1].map(i => ({ id: 'cop' + i, look: COP, pose: pose(t, 70 + i, { turn: i ? -.6 : .4 }), face: F('thinking'), pos: [72 + i * 4.5, .15, 1.0 + i * .4] as V3, t, seed: 70 + i, res: 512 }));
    return { t, cam: c, light: { ...mixLight(GOLD([60, -2, 0], 50), { ...NIGHT([70, 0, 0], LAMPS) }, k * .6), points: [{ pos: [74, 1.4, 5.2], color: '#3060ff', int: 30 * (Math.sin(t * 20) > 0 ? 1 : .1), dist: 10 }, { pos: [74, 1.4, 4.8], color: '#ff2020', int: 30 * (Math.sin(t * 20) > 0 ? .1 : 1), dist: 10 }, { pos: [77, -4.9, 1.3], color: '#ffb260', int: 4 * k, dist: 6 }] },
      cut: 1.52, bulbs: 79, show: { 'Police car': true, ...palletShow(0), 'Floor plug': false }, xform: { 'Police car': { pos: [104, 0, 0] } }, actors: cops,
      overlay: svg(pop('ONLY THE BEGINNING', 540, 1560, 76, t, 53.3, { color: '#ffd34d', out: 55.8 })), grade: { gain: [1.04, 1.0, .94], bloom: .45, exposure: mix(1, .85, k) } };
  }
  // inside the tunnel: glide to the vault end and tilt up into the concrete — converging exactly on Part 1's final (= our first) frame
  const k = inOut(k01(t, 53.6, 56.95));
  const start = { pos: [78.45, -4.92, 1.42] as V3, look: [74.6, -5.0, .9] as V3, fov: 44 };
  const mid = { pos: [78.6, -5.05, 1.1] as V3, look: [74.5, -5.0, .92] as V3, fov: 44 };
  const cam = k < .55 ? blendCam(start, mid, inOut(k / .55)) : blendCam(mid, E.cam, inOut((k - .55) / .45));
  return { ...E, t, cam, overlay: svg(pop('ONLY THE BEGINNING', 540, 1560, 76, t, 53.3, { color: '#ffd34d', out: 55.8 })), grade: { ...(E.grade ?? {}), exposure: mix(.86, .78, k) } };
});

export const SHOTS = S;
export function frameAt(frame: number): Frame2 {
  const t = Math.min(frame, FRAMES - 1) / FPS; AUDIO_T = t;
  if (frame >= FRAMES - 2) { const E = END1(); return { ...E, t }; }        // the last frames are exactly Part 1's final frame = our frame 0
  const s = S.find(x => t >= x.t0 && t < x.t1) ?? S[S.length - 1];
  return s.f(t);
}
