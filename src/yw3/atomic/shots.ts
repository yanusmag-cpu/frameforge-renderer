// Film 1 — "The Man Who Survived Two Atomic Bombs" (60 s). Narration start times are measured from the Kokoro track.
import { STAND, idle, walkPose, type Look, type Pose } from '../../ff2d/rig.ts';
import { EXPR, expr, type ExprName } from '../../ff2d/face.ts';
import { fallPose, lyingPose, sitPose } from '../../ff2d/moves.ts';
import { clamp, lerp, ss, kk, rng, type V3, type Cam, type Sprite, type ActorState } from '../core.ts';
import { SET, type AFrame, type SetName } from './engine.ts';

export const FPS = 30, FRAMES = 1800;
export const NARR = [0.25, 5.75, 12.55, 16.4, 19.1, 24.4, 29.3, 33.6, 35.8, 41.8, 44.3, 51.2, 55.1];
const T_FLASH1 = 17.75, T_FLASH2 = 33.75;

const YAM: Look = { outfit: 'jacket', color: '#e8e3d3', pants: '#3a3d44', hairStyle: 'crop', hair: '#151515' };
const YAM_B: Look = { ...YAM, color: '#d9d0bd', bandage: true };
const YAM_OLD: Look = { outfit: 'suit', color: '#3b3f47', pants: '#2b2e33', hairStyle: 'sidepart', hair: '#d6d6d6', glasses: true, inner: '#ecebe6' };
const BOSS: Look = { outfit: 'suit', color: '#4a4d55', pants: '#2a2c30', glasses: true, hairStyle: 'slick', hair: '#222', tie: '#5a2222', inner: '#efefea' };

const W = (s: SetName, v: V3): V3 => [v[0] + SET[s][0], v[1] + SET[s][1], v[2] + SET[s][2]];
const cam = (s: SetName, pos: V3, look: V3, fov: number, o: Partial<Cam> = {}): Cam => ({ pos: W(s, pos), look: W(s, look), fov, ...o });
const F = (e: ExprName) => EXPR[e];
const actor = (id: string, look: Look, s: SetName, pos: V3, pose: Pose, face: ReturnType<typeof expr>, t: number, o: Partial<ActorState> = {}): ActorState =>
  ({ id, look, pose, face, pos: W(s, pos), t, res: 1024, ...o });
const pose = (p: Partial<Pose>, t = 0, amt = 1): Pose => ({ ...STAND, ...idle(t, 3, amt), ...p });

// ---------------- VFX helpers ----------------
function mushroom(c: V3, age: number, scale: number, out: Sprite[], seed = 1, glow = 1) {
  if (age < 0) return; const R = rng(seed * 991); const H = scale * (.35 + .65 * (1 - Math.exp(-age * .35))); const capR = scale * (.16 + .1 * (1 - Math.exp(-age * .3)));
  const hot = Math.exp(-age * .5) * glow;
  for (let i = 0; i < 46; i++) { const k = i / 46; const r = scale * (.035 + .02 * Math.sin(k * 9)); const a = R() * 6.28;
    out.push({ p: [c[0] + Math.cos(a) * r * R(), c[1] + H * k * .9, c[2] + Math.sin(a) * r * R()], s: scale * (.08 + .05 * R()) * (1 + k * .3), rot: R() * 6, c: [.62 + .2 * hot, .55 + .1 * hot, .5], a: .8, kind: 0, seed: R(), age: age * .05, glow: hot * (1 - k) * 1.2 }); }
  for (let i = 0; i < 70; i++) { const a = R() * 6.28, rr = capR * (.4 + .6 * Math.sqrt(R())); const y = H + (R() - .3) * capR * .7 - Math.abs(Math.cos(a)) * 0;
    out.push({ p: [c[0] + Math.cos(a) * rr, c[1] + y, c[2] + Math.sin(a) * rr], s: scale * (.09 + .06 * R()), rot: R() * 6, c: [.7 + .25 * hot, .6 + .12 * hot, .55], a: .9, kind: 0, seed: R(), age: age * .05, glow: hot * 1.5 }); }
  for (let i = 0; i < 26; i++) { const a = R() * 6.28, rr = capR * (1 + R() * .5) + age * scale * .01; out.push({ p: [c[0] + Math.cos(a) * rr * 1.6, c[1] + scale * .03 + R() * scale * .05, c[2] + Math.sin(a) * rr * 1.6], s: scale * (.1 + .06 * R()), rot: R() * 6, c: [.62, .56, .5], a: .6 * ss(0, 3, age), kind: 0, seed: R(), age: .2, glow: 0 }); }
}
function dust(c: V3, n: number, spread: V3, size: number, a: number, out: Sprite[], seed: number, age = 0, col: [number, number, number] = [.72, .62, .5]) {
  const R = rng(seed); for (let i = 0; i < n; i++) out.push({ p: [c[0] + (R() - .5) * spread[0], c[1] + R() * spread[1], c[2] + (R() - .5) * spread[2]], s: size * (.6 + R() * .8), rot: R() * 6, c: col, a: a * (.5 + R() * .5), kind: 0, seed: R(), age: age + R() * .2, glow: 0 });
}
function motes(c: V3, n: number, box: V3, t: number, out: Sprite[], seed: number, a = .5) {   // floating dust in light beams
  const R = rng(seed); for (let i = 0; i < n; i++) { const x = (R() - .5) * box[0] + Math.sin(t * .3 + i) * .2, y = R() * box[1] + ((t * .05 + R()) % 1) * .3, z = (R() - .5) * box[2];
    out.push({ p: [c[0] + x, c[1] + y, c[2] + z], s: .03, rot: 0, c: [1, .9, .7], a: a * (.4 + .6 * Math.abs(Math.sin(t + i))), kind: 2, seed: 0, age: 0 }); }
}

// ---------------- light presets ----------------
const MORNING = { sun: { dir: [.45, .7, .55] as V3, color: '#fff1d8', i: 3.2 }, hemi: { sky: '#bcd4f0', ground: '#8f7a60', i: 1.1 }, sky: { top: '#4f86cf', hor: '#d8e4ee', sunDir: [.45, .7, .55] as V3 } };
const DUSTY = { sun: { dir: [.45, .5, .55] as V3, color: '#ffb47a', i: 1.6 }, hemi: { sky: '#a58a72', ground: '#5a4a3c', i: .9 }, sky: { top: '#7b6655', hor: '#b59576', haze: .8, sunDir: [.45, .5, .55] as V3 } };

type S = { a: number; b: number; f: (t: number) => AFrame };
const SH: S[] = []; const shot = (a: number, b: number, f: (t: number) => AFrame) => SH.push({ a, b, f });

// 0 — HOOK: a man on a street, an enormous flash fills the sky
shot(0, 5.6, t => {
  const k = kk(t, 0, 5.6); const fl = ss(.35, .55, t) * (1 - ss(.9, 3.2, t));
  const c = cam('street', [lerp(.6, .3, k), lerp(1.2, 1.45, k), lerp(6.5, 3.6, k)], [-.2, 2.2, -30], 42);
  const p = pose({ back: 1, turn: 0, handA: [-.62, -1.5], handB: [.62, -1.5] }, t, .4);
  const S: Sprite[] = []; mushroom([-420, 0, -2200], t - .45, 1500, S, 1, 1.4);
  return { t, set: 'street', cam: c, sun: { ...MORNING.sun, focus: W('street', [0, 0, 0]), size: 14 }, hemi: MORNING.hemi, sky: { ...MORNING.sky, flash: fl * 1.6 }, fog: { color: '#d8dde2', density: .008 },
    actors: [actor('yam', YAM, 'street', [0, 0, 0], p, F('neutral'), t, { tint: [1 + fl, 1 + fl, 1 + fl] })], sprites: S,
    grade: { flash: fl * .85, exposure: 1 + fl * .5, fade: clamp(1 - t / .35) * .6 }, overlay: titleCard(t), shake: fl * .05 };
});
function titleCard(t: number) {
  const k = ss(1.4, 2.0, t) * (1 - ss(5.0, 5.5, t)); if (k <= 0) return '';
  return `<div style="position:absolute;left:0;width:1080px;top:300px;text-align:center;opacity:${k};font-family:Inter;font-weight:900;color:#fff;font-size:76px;line-height:1.05;letter-spacing:-1px;-webkit-text-stroke:5px #111;paint-order:stroke fill;text-shadow:0 8px 24px rgba(0,0,0,.6)">THE MAN WHO<br>SURVIVED <span style="color:#ffd23f">TWO</span><br>ATOMIC BOMBS</div>`;
}
function caption(text: string, sub: string, t: number, a: number, b: number, top = 300) {
  const k = ss(a, a + .4, t) * (1 - ss(b - .4, b, t)); if (k <= 0) return '';
  return `<div style="position:absolute;left:50%;top:${top}px;transform:translate(-50%,0) scale(${.9 + .1 * k});opacity:${k};font-family:Inter;text-align:center;background:rgba(10,10,12,.62);border-left:8px solid #d8262b;padding:18px 34px;border-radius:8px">
    <div style="font-weight:900;font-size:50px;letter-spacing:4px;color:#fff">${text}</div>${sub ? `<div style="font-weight:700;font-size:30px;letter-spacing:3px;color:#ffd23f;margin-top:4px">${sub}</div>` : ''}</div>`;
}
// 1 — Hiroshima establishing aerial
shot(5.6, 9.2, t => { const k = kk(t, 5.6, 9.2); const c = cam('city', [lerp(-500, -380, k), lerp(260, 200, k), lerp(700, 520, k)], [-120, 0, -60], 46);
  return { t, set: 'city', cam: c, sun: { ...MORNING.sun, focus: W('city', [-200, 0, 100]), size: 700, shadow: true }, hemi: MORNING.hemi, sky: MORNING.sky, fog: { color: '#cbd6df', density: .0007 },
    overlay: caption('AUGUST 1945', 'HIROSHIMA, JAPAN', t, 5.8, 9.2) }; });
// 2 — the engineer on his street, tram passing
shot(9.2, 12.6, t => { const k = kk(t, 9.2, 12.6); const d = (t - 9.2) * 1.25; const z = -4 - d;
  const c = cam('street', [lerp(2.6, 2.2, k), 1.5, z + 3.2], [-.3, 1.4, z - 1], 38);
  const p = walkPose(d, -1, { turn: -.35 }); const f = expr('calm', 'focused', ss(10.5, 11.5, t));
  return { t, set: 'street', cam: c, tramZ: 20 - (t - 9.2) * 6, sun: { ...MORNING.sun, focus: W('street', [0, 0, z]), size: 12 }, hemi: MORNING.hemi, sky: MORNING.sky, fog: { color: '#d8dde2', density: .006 },
    actors: [actor('yam', YAM, 'street', [-.4, 0, z], p, f, t), actor('p1', { outfit: 'dress', color: '#4f5a6b', pants: '#333' }, 'street', [3.4, 0, z - 9], pose({ turn: .3 }, t), F('calm'), t), actor('p2', { outfit: 'vest', color: '#6b5a44', pants: '#2c2c2c', hat: 'cap' }, 'street', [-3.6, 0, z - 14], walkPose(t * 1.1, 1, { turn: .4 }), F('neutral'), t)] }; });
// 3 — walking toward the shipyard; he stops and looks up
shot(12.6, 16.4, t => { const walkEnd = 15.0; const d = Math.min(t, walkEnd) - 12.6; const z = -12 - d * 1.25; const stop = ss(walkEnd, 15.6, t);
  const c = cam('street', [lerp(.8, .5, kk(t, 12.6, 16.4)), .55, z + lerp(4.6, 3.4, kk(t, 12.6, 16.4))], [0, 2.4, -60], 40);
  const p: Pose = stop > 0 ? pose({ back: 1, headLift: .08 * stop, headTilt: -.1 * stop }, t, .3) : { ...walkPose(d * 1.25, -1, {}), back: 1, turn: 0 };
  return { t, set: 'street', cam: c, tramZ: 8 - (t - 9.2) * 6, sun: { ...MORNING.sun, focus: W('street', [0, 0, z]), size: 12 }, hemi: MORNING.hemi, sky: MORNING.sky, fog: { color: '#d8dde2', density: .006 },
    actors: [actor('yam', YAM, 'street', [0, 0, z], p, F('neutral'), t)], overlay: caption('6 AUGUST · 8:14 AM', '', t, 12.8, 16.2, 260) }; });
// 4 — he sees a lone bomber and two small parachutes
shot(16.4, 17.75, t => { const k = kk(t, 16.4, 17.75); const z = -15;
  const S: Sprite[] = []; const bx = lerp(-60, 40, (t - 16.4) / 1.4);
  S.push({ p: W('street', [bx, 330, -480]), s: 6, rot: 0, c: [1.4, 1.4, 1.5], a: .9, kind: 2, seed: .1, age: 0 });
  for (const dx of [-14, 8]) S.push({ p: W('street', [bx - 50 + dx, 290 - (t - 16.4) * 6, -470]), s: 4, rot: 0, c: [1.2, 1.2, 1.2], a: .7, kind: 2, seed: .2, age: 0 });
  const c = cam('street', [.9, 1.35, z + 1.6], [-.1, 1.75 + k * .15, z], 30);
  return { t, set: 'street', cam: c, sun: { ...MORNING.sun, focus: W('street', [0, 0, z]), size: 8 }, hemi: MORNING.hemi, sky: MORNING.sky, fog: { color: '#d8dde2', density: .006 }, sprites: S,
    actors: [actor('yam', YAM, 'street', [0, 0, z], pose({ turn: .35, headLift: .1, headTilt: -.25, handB: [.55, -1.9] }, t, .2), expr('curious', 'realization', ss(17.0, 17.6, t)), t)] }; });
// 5 — 8:15. The flash.
shot(17.75, 19.3, t => { const z = -15; const fl = 1 - ss(17.85, 19.1, t);
  const c = cam('street', [.75, 1.45, z + 1.25], [-.05, 1.85, z], 28);
  return { t, set: 'street', cam: c, sun: { dir: [-.2, .4, -.9], color: '#ffffff', i: 3 + fl * 30, focus: W('street', [0, 0, z]), size: 8 }, hemi: { sky: '#fff', ground: '#ccc', i: 1 + fl * 4 }, sky: { ...MORNING.sky, flash: fl * 3 },
    actors: [actor('yam', YAM, 'street', [0, 0, z], pose({ turn: .2, headLift: .05, handA: [-.3, -2.3], handB: [.35, -2.25], shapeA: 'open', shapeB: 'open', lean: -.08 }, t, .1), F('shocked'), t, { tint: [1 + fl * 2, 1 + fl * 2, 1 + fl * 1.8] })],
    grade: { flash: fl * .9, exposure: 1 + fl, sat: 1 - fl * .6 }, shake: .02 + fl * .04 }; });
// 6 — the blast wave: dust wall down the street, he is thrown down
shot(19.3, 21.9, t => { const z = -15; const front = lerp(-90, 12, ss(19.3, 20.4, t)); const hit = ss(20.15, 20.35, t);
  const S: Sprite[] = []; dust(W('street', [0, 0, front]), 140, [12, 9, 6], 2.6, .9, S, 3, 0); dust(W('street', [0, 0, front - 8]), 90, [12, 14, 14], 3.4, .8, S, 4, .2);
  const R = rng(5); for (let i = 0; i < 40; i++) { const zz = front + R() * 10; S.push({ p: W('street', [(R() - .5) * 10, 2 + R() * 6 + Math.sin(t * 9 + i) * .3, zz]), s: .3, rot: t * 9 + i, c: [.25, .26, .3], a: .95, kind: 0, seed: R(), age: 0 }); }
  const c = cam('street', [2.4, 1.0, z + 5.2], [-.2, 1.2, z - 4], 46);
  const fp = fallPose(Math.max(0, t - 20.2), 1);
  const p = hit > 0 ? { ...fp, lean: fp.lean } : pose({ turn: .6, lean: -.2, handA: [-.4, -2.1], handB: [.6, -1.9], shapeA: 'open', shapeB: 'open' }, t, .1);
  const roll = hit > 0 ? -lerp(0, 1.45, ss(20.2, 20.75, t)) : 0;
  return { t, set: 'street', ruin: t > 20.5 ? 1 : 0, cam: c, sun: { ...DUSTY.sun, focus: W('street', [0, 0, z]), size: 14 }, hemi: { sky: '#d8c8b0', ground: '#7a6a58', i: 1.1 }, sky: { ...MORNING.sky, haze: ss(20, 21.5, t) * .7 }, fog: { color: '#a8977f', density: .012 + ss(20, 20.6, t) * .05 }, sprites: S,
    actors: [actor('yam', YAM, 'street', [hit * 1.2, 0, z + hit * 2.2], p, hit > 0 ? F('terror') : F('fear'), t, { roll })], shake: .05 + hit * .12 * (1 - ss(20.6, 21.6, t)), grade: { flash: (1 - ss(19.3, 19.7, t)) * .3 } }; });
// 7 — aftermath in Hiroshima: ruins, haze, the cloud over the city; he gets up
shot(21.9, 24.4, t => { const z = -12.8; const k = kk(t, 21.9, 24.4); const S: Sprite[] = []; mushroom([-420, 0, -2200], t - T_FLASH1, 1500, S, 1, .8); dust(W('street', [0, 0, z - 4]), 60, [14, 3, 20], 3.2, .35, S, 7, .5);
  const c = cam('street', [lerp(3.2, 2.6, k), lerp(.7, 1.0, k), z + 4.4], [-.4, 2.6, z - 12], 44);
  const p = { ...lyingPose(ss(22.6, 24.0, t)) };
  return { t, set: 'street', ruin: 1, cam: c, sun: { ...DUSTY.sun, focus: W('street', [0, 0, z]), size: 14 }, hemi: DUSTY.hemi, sky: DUSTY.sky, fog: { color: '#9a8470', density: .022 }, sprites: S,
    actors: [actor('yam', YAM, 'street', [1.2, 0, z], p, expr('shocked', 'tired', ss(22.8, 23.8, t)), t, { tint: [.85, .75, .68] })] }; });
// 8 — next day: steam train across the countryside
shot(24.4, 27.2, t => { const k = kk(t, 24.4, 27.2); const tz = 140 - (t - 24.4) * 16; const S: Sprite[] = []; const R = rng(9);
  for (let i = 0; i < 40; i++) { const a = ((t * 1.5 + i * .13) % 3.5); S.push({ p: W('train', [WX(R), 6.4 + a * 2.2, tz - 3 + a * 10]), s: 1.4 + a * 1.6, rot: R() * 6, c: [.9, .9, .92], a: .7 * (1 - a / 3.5), kind: 0, seed: R(), age: a * .1 }); }
  const c = cam('train', [lerp(-26, -18, k), lerp(7, 5, k), tz - 30], [0, 3, tz + 6], 40);
  return { t, set: 'train', trainZ: tz, cam: c, sun: { dir: [-.7, .35, .3], color: '#ffd7a0', i: 3, focus: W('train', [0, 0, tz]), size: 40 }, hemi: { sky: '#d2c7b8', ground: '#6a6a50', i: 1 }, sky: { top: '#7a9ac4', hor: '#ead7b8', sunDir: [-.7, .35, .3] }, fog: { color: '#e2d6c2', density: .004 }, sprites: S,
    overlay: caption('7 AUGUST 1945', 'HEADING HOME TO NAGASAKI', t, 24.6, 27.1, 260) }; });
function WX(R: () => number) { return (R() - .5) * .8; }
// 9 — inside the carriage: bandaged and exhausted
shot(27.2, 29.3, t => { const k = kk(t, 27.2, 29.3);
  const c = cam('carriage', [lerp(-.35, -.2, k), 1.5, lerp(-3.6, -3.1, k)], [.8, 1.05, -1.4], 40);
  const p = sitPose(-1, 0, { headTilt: .12 + Math.sin(t * 2) * .01, lean: .05 }) as Pose;
  return { t, set: 'carriage', scroll: t * .08, cam: c, sun: { dir: [1, .35, .1], color: '#ffe0b0', i: 3, focus: W('carriage', [0, 1, 0]), size: 6 }, hemi: { sky: '#e9d8b8', ground: '#6a5236', i: 1.7 }, fill: { color: '#ffe6c4', i: 1.1 }, lights: [{ p: W('carriage', [1.2, 1.6, -1.3]), c: [1, .85, .65], i: 3, d: 5 }], sky: { top: '#d8c6a0', hor: '#efe2c4' },
    actors: [actor('yam', YAM_B, 'carriage', [.8, .32, -1.4], p, expr('tired', 'sad', .4), t, { tint: [1.05, .98, .9] })] }; });
// 10 — Nagasaki, 9 August: he describes the bomb to his boss
shot(29.3, 33.75, t => { const k = kk(t, 29.3, 33.75); const talk = Math.abs(Math.sin(t * 9)) * .5;
  const c = cam('office', [lerp(3.2, 2.6, k), 1.55, lerp(3.4, 2.8, k)], [-.3, 1.35, -1.0], 40);
  const yp = pose({ turn: -.4, handB: [.85 + Math.sin(t * 3) * .2, -2.2 - Math.sin(t * 2.3) * .2], shapeB: 'open', handA: [-.5, -1.7] }, t, .7);
  const bp = pose({ turn: .45, handA: [-.3, -1.9], handB: [.25, -1.85], lean: -.04 }, t, .5);
  return { t, set: 'office', glass: 1, cam: c, sun: { dir: [.2, .55, -1], color: '#fff3dd', i: 2.6, focus: W('office', [0, 0, 0]), size: 6 }, hemi: { sky: '#e6dccb', ground: '#6a5a46', i: 1.1 }, sky: MORNING.sky, fog: { color: '#dfe4e8', density: .001 },
    actors: [actor('yam', YAM_B, 'office', [.6, 0, -.4], yp, { ...expr('worried', 'shout', .3), mOpen: talk }, t), actor('boss', BOSS, 'office', [-1.2, 0, -1.6], bp, expr('suspicious', 'confused', ss(31.5, 32.5, t)), t)],
    overlay: caption('9 AUGUST 1945', 'NAGASAKI', t, 29.4, 32.0, 260) }; });
// 11 — the room fills with white light; glass bursts; he drops to the floor
shot(33.75, 36.0, t => { const fl = ss(33.75, 33.95, t) * (1 - ss(34.2, 35.4, t)); const burst = ss(34.55, 34.7, t);
  const S: Sprite[] = []; if (burst > 0) { const R = rng(31); for (let i = 0; i < 90; i++) { const a = (t - 34.6); S.push({ p: W('office', [(R() - .5) * 9, 1.2 + R() * 1.6 - a * a * 2, -3.9 + a * (3 + R() * 6)]), s: .12, rot: R() * 6 + t * 5, c: [1.4, 1.5, 1.6], a: .9 * (1 - ss(34.6, 35.8, t)), kind: 2, seed: R(), age: 0 }); }
    dust(W('office', [0, 1.2, -1]), 40, [9, 2, 6], 1.8, .35 * ss(34.6, 35.5, t), S, 33, .3, [.8, .75, .68]); }
  const c = cam('office', [1.9, 1.4, 1.6], [.2, 1.5, -1.6], 36);
  const down = ss(34.6, 35.1, t);
  const yp: Pose = down > 0 ? { ...STAND, crouch: .9 * down, lean: -.5 * down, handA: [-.5, -1.0 + down * .4], handB: [.5, -1.0 + down * .4], headTilt: .3 * down, footA: [-.45, -.08], footB: [.35, -.08], kneeUp: true } : pose({ turn: -.7, headTurn: -.3 }, t, .2);
  return { t, set: 'office', glass: burst > 0 ? 0 : 1, cam: c, sun: { dir: [.2, .4, -1], color: '#ffffff', i: 2.6 + fl * 40, focus: W('office', [0, 0, 0]), size: 6 }, hemi: { sky: '#fff', ground: '#999', i: 1 + fl * 4 }, sky: { ...MORNING.sky, flash: fl * 3 }, sprites: S,
    actors: [actor('yam', YAM_B, 'office', [.6, 0, -.4], yp, down > .5 ? F('terror') : F('shocked'), t, { tint: [1 + fl * 2, 1 + fl * 2, 1 + fl * 1.8] }), actor('boss', BOSS, 'office', [-1.2, 0, -1.6], { ...STAND, crouch: .8 * down, lean: .5 * down, handA: [-.4, -1.3], handB: [.4, -1.3], kneeUp: true }, F('terror'), t)],
    grade: { flash: fl * .8, exposure: 1 + fl * .8 }, shake: .02 + burst * .1 * (1 - ss(35, 36, t)) }; });
// 12 — reveal: the cloud over the Urakami valley
shot(36.0, 41.8, t => { const k = kk(t, 36.0, 41.8); const S: Sprite[] = []; mushroom(W('office', [-200, -6, -1500]), t - T_FLASH2, 1300, S, 2, 1.3);
  const c = cam('office', [lerp(-2, -1, k), lerp(14, 22, k), lerp(140, 60, k)], [-120, 280 + k * 120, -1400], 44);
  return { t, set: 'office', cam: c, sun: { ...MORNING.sun, i: 2.4, focus: W('office', [0, 0, -200]), size: 400 }, hemi: { sky: '#c8bcae', ground: '#6b5d4c', i: 1 }, sky: { top: '#5f7ea8', hor: '#d7cdbd', haze: .25 }, fog: { color: '#cfc5b6', density: .0012 }, sprites: S,
    overlay: caption('11:02 AM', 'NAGASAKI', t, 36.3, 39.6, 1480), shake: .02 * (1 - k) }; });
// 13 — and once again, he survives: dust, light shafts, he rises from under the desk
shot(41.8, 44.3, t => { const k = kk(t, 41.8, 44.3); const S: Sprite[] = []; dust(W('office', [0, .2, 0]), 60, [10, 3, 8], 2.0, .3, S, 41, .6, [.75, .7, .62]); motes(W('office', [.5, 0, -1]), 160, [6, 3, 4], t, S, 42, .6);
  const c = cam('office', [lerp(2.6, 2.1, k), lerp(1.3, 1.45, k), 2.4], [.4, 1.05, -1.0], 40);
  const up = ss(42.3, 43.8, t); const yp: Pose = { ...STAND, crouch: .9 * (1 - up), lean: -.3 * (1 - up), handA: [-.5, -1.2 + up * -.4], handB: [.5, -1.2 + up * -.4], headTilt: .2 - up * .2, kneeUp: up < .6, footA: [-.4, -.08], footB: [.4, -.08] };
  return { t, set: 'office', ruin: 1, glass: 0, cam: c, sun: { dir: [.3, .5, -1], color: '#ffe8c8', i: 3.4, focus: W('office', [0, 0, 0]), size: 6 }, hemi: { sky: '#c8b8a2', ground: '#6a5a48', i: 1.4 }, fill: { color: '#e8d6bc', i: .8 }, sky: { top: '#8a7a6a', hor: '#c9b49c', haze: .6 }, fog: { color: '#b0a08e', density: .025 }, sprites: S,
    actors: [actor('yam', YAM_B, 'office', [.6, 0, -.4], yp, expr('shocked', 'relief', ss(43.0, 44.0, t)), t, { tint: [.9, .85, .8] })] }; });
// 14 — decades later: recognition (river of lanterns at dusk)
shot(44.3, 51.2, t => { const k = kk(t, 44.3, 51.2); const S: Sprite[] = []; const R = rng(51); for (let i = 0; i < 70; i++) S.push({ p: W('river', [((i * 37) % 200) - 100 + t * (.4 + (i % 5) * .08) - Math.floor(((i * 37) % 200 - 100 + t * (.4 + (i % 5) * .08) + 100) / 200) * 200, .45, ((i * 53) % 40) - 18]), s: .9, rot: 0, c: [1.4, .8, .35], a: .5, kind: 2, seed: R(), age: 0 });
  const c = cam('river', [lerp(-4.5, -2.6, k), 1.6, lerp(27, 25, k)], [-.3, 1.35, 20.5], 40);
  return { t, set: 'river', lanternT: t, cam: c, sun: { dir: [-.6, .15, -.6], color: '#ff9a5a', i: 1.2, focus: W('river', [0, 0, 20]), size: 10 }, hemi: { sky: '#5a5f88', ground: '#3a3036', i: 1.1 }, fill: { color: '#ffb47a', i: .5 }, sky: { top: '#1f2a52', hor: '#e08a5a', sunDir: [-.6, .05, -.6] }, fog: { color: '#3a3550', density: .01 }, sprites: S,
    lights: [{ p: W('river', [0, 1, 17]), c: [1, .6, .3], i: 3, d: 8 }],
    actors: [actor('old', YAM_OLD, 'river', [0, .3, 21], pose({ turn: -.25, handA: [-.35, -1.75], handB: [.35, -1.75], headTilt: .06 }, t, .4), expr('calm', 'sad', .3), t, { tint: [.95, .82, .78] })],
    overlay: stamp(t) }; });
function stamp(t: number) { const k = ss(46.5, 47.2, t); if (k <= 0) return ''; const s = 1.4 - .4 * Math.min(1, k * 1.3);
  return `<div style="position:absolute;left:50%;top:330px;transform:translate(-50%,0) rotate(-6deg) scale(${s});opacity:${Math.min(1, k * 1.5)};font-family:Inter;text-align:center;border:7px solid #d8262b;border-radius:14px;padding:18px 30px;color:#d8262b;background:rgba(255,248,236,.86)">
  <div style="font-weight:900;font-size:46px;letter-spacing:4px">OFFICIALLY RECOGNISED</div><div style="font-weight:700;font-size:32px;letter-spacing:2px;color:#2a2a2a">2009 · SURVIVOR OF BOTH BOMBINGS</div></div>`; }
// 15 — he lived to ninety-three
shot(51.2, 55.1, t => { const k = kk(t, 51.2, 55.1); const c = cam('river', [lerp(1.6, 1.2, k), 1.55, lerp(23.6, 22.8, k)], [-.1, 1.5, 21], 32);
  return { t, set: 'river', lanternT: t, cam: c, sun: { dir: [-.6, .15, -.6], color: '#ff9a5a', i: 1.1, focus: W('river', [0, 0, 20]), size: 8 }, hemi: { sky: '#5a5f88', ground: '#3a3036', i: 1.1 }, fill: { color: '#ffb47a', i: .5 }, sky: { top: '#1a2348', hor: '#c97a50', sunDir: [-.6, .05, -.6] }, fog: { color: '#3a3550', density: .012 },
    lights: [{ p: W('river', [0, 1, 18.5]), c: [1, .6, .3], i: 4, d: 6 }],
    actors: [actor('old', YAM_OLD, 'river', [0, .3, 21], pose({ turn: -.6, headTilt: .1, handA: [-.3, -1.8], handB: [.25, -1.9], shapeB: 'open' }, t, .3), expr('sad', 'calm', ss(53, 54.5, t)), t, { tint: [.95, .82, .78] })],
    overlay: caption('1916 – 2010', 'LIVED TO 93 · CAMPAIGNED FOR PEACE', t, 52.0, 55.0, 300) }; });
// 16 — final line + name
shot(55.1, 60.01, t => { const k = kk(t, 55.1, 60); const c = cam('river', [lerp(-2, -4, k), lerp(1.8, 4.2, k), lerp(27, 32, k)], [0, 1, 16], 44);
  return { t, set: 'river', lanternT: t, cam: c, sun: { dir: [-.6, .15, -.6], color: '#ff9a5a', i: 1, focus: W('river', [0, 0, 20]), size: 12 }, hemi: { sky: '#5a5f88', ground: '#3a3036', i: 1.1 }, fill: { color: '#ffb47a', i: .5 }, sky: { top: '#141c3c', hor: '#b86a48', sunDir: [-.6, .05, -.6] }, fog: { color: '#3a3550', density: .01 },
    lights: [{ p: W('river', [0, 1, 17]), c: [1, .6, .3], i: 3, d: 8 }],
    actors: [actor('old', YAM_OLD, 'river', [0, .3, 21], pose({ turn: -.25, handA: [-.35, -1.75], handB: [.35, -1.75] }, t, .3), F('calm'), t, { tint: [.95, .82, .78] })],
    grade: { fade: ss(59.4, 60, t) }, overlay: nameCard(t) }; });
function nameCard(t: number) { const k = ss(55.4, 56.2, t); if (k <= 0) return '';
  return `<div style="position:absolute;left:0;width:1080px;top:330px;text-align:center;opacity:${k};font-family:Inter;color:#fff;text-shadow:0 6px 20px rgba(0,0,0,.7)">
  <div style="font-weight:900;font-size:84px;letter-spacing:-1px;line-height:1">TSUTOMU<br>YAMAGUCHI</div><div style="width:220px;height:6px;background:#d8262b;margin:22px auto"></div>
  <div style="font-weight:700;font-size:36px;letter-spacing:3px;color:#ffd23f">HIROSHIMA · NAGASAKI</div><div style="font-weight:700;font-size:30px;letter-spacing:2px;margin-top:8px">SURVIVED BOTH ATOMIC BOMBS</div></div>`; }

export function frameAt(n: number): AFrame { const t = n / FPS; const s = SH.find(x => t >= x.a && t < x.b) ?? SH[SH.length - 1]; return s.f(t); }

