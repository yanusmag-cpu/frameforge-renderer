// Shot list — "The War That Lasted Only 38 Minutes" (60 s, 1800 frames @ 30 fps).
import * as T from 'three';
import { clamp, ease, lerp, ss, type V3 } from './geo.ts';
import { EXPR, mixExpr, type BallState, type Expr } from './ball.ts';
import { SHIPS } from './world.ts';
import { shipMatrix, clockAt, T_OPEN, T_FLAG, T_CEASE, SHOTS, ZZ_UNITS } from './timeline.ts';
import type { Frame, Cam } from './engine.ts';
import { bubble, tag, arrow, title, plate, versus, clockBadge, pop } from './overlay.ts';
import { talk, speaking } from './voice.ts';

export const FPS = 30, FRAMES = 1800;
const k = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a)));
const mv = (a: V3, b: V3, kk: number): V3 => [lerp(a[0], b[0], kk), lerp(a[1], b[1], kk), lerp(a[2], b[2], kk)];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---- projection for overlays (matches the engine camera, without shake) ----
const pc = new T.PerspectiveCamera(40, 9 / 16, .05, 3000);
function proj(cam: Cam, p: V3): [number, number] {
  pc.position.set(...cam.pos); pc.up.set(...(cam.up ?? [0, 1, 0])); pc.lookAt(...cam.look); pc.fov = cam.fov; pc.updateProjectionMatrix(); pc.updateMatrixWorld();
  const v = new T.Vector3(...p).project(pc); return [(v.x * .5 + .5) * 1080, (.5 - v.y * .5) * 1920];
}

// ---- characters ----
const Z_HOME: V3 = [2.95, .42, 1.0];
const exprAt = (t: number, keys: [number, string][], blend = .18): Expr => {
  let i = 0; while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
  const cur = EXPR[keys[i][1]]; if (i === 0 && t < keys[0][0]) return cur; const prev = i > 0 ? EXPR[keys[i - 1][1]] : cur; return mixExpr(prev, cur, clamp((t - keys[i][0]) / blend));
};
const Z_EXPR: [number, string][] = [[0, 'proud'], [3.85, 'angry'], [4.7, 'defiant'], [8.0, 'nervous'], [9.6, 'nervous'], [15.6, 'defiant'], [16.0, 'angry'], [18.8, 'serious'], [23.6, 'surprised'], [24.2, 'shocked'], [28.6, 'angry'], [32.8, 'nervous'], [33.6, 'frightened'], [44.6, 'shocked'], [46.3, 'exhausted'], [50.6, 'exhausted'], [51.6, 'defeated']];
const B_EXPR: [number, string][] = [[0, 'serious'], [1.75, 'angry'], [2.85, 'threatening'], [3.9, 'serious'], [6.0, 'serious'], [6.5, 'confident'], [8.0, 'serious'], [9.6, 'threatening'], [10.6, 'smug'], [14, 'confident'], [22.2, 'threatening'], [23.2, 'serious'], [54, 'smug'], [57.4, 'victorious'], [58.5, 'smug']];
function zBall(t: number, o: Partial<BallState> = {}): BallState {
  const soot = ss(24.3, 30, t) * .3 + ss(36, 47, t) * .45; const sit = ss(50.8, 52.2, t);
  const pitch = -.08 * (1 - ss(18, 24, t)) + sit * .12 - talk('zz', t) * .05; let squash = -sit * .16, yaw = -Math.PI / 2, y = 0;
  // shouting pulses
  const v = talk('zz', t); squash += v * .075; y += v * .025;
  // jumps at blasts
  if (t > 27.0 && t < 28.0) { const j = (t - 27.05) / .55; if (j > 0 && j < 1) { y += Math.sin(j * Math.PI) * .32; squash += j < .15 ? -.2 * (1 - j / .15) : .12 * Math.sin(j * Math.PI); } }
  if (t > 23.75 && t < 24.4) { const j = (t - 23.75) / .5; y += Math.max(0, Math.sin(clamp(j) * Math.PI)) * .16; }
  if (t > 15.6 && t < 17.2) yaw += Math.sin((t - 15.85) * 11) * .26 * ss(15.85, 16.0, t) * (1 - ss(16.6, 16.9, t));
  const roll = ss(8.2, 8.6, t) * (1 - ss(9.5, 9.8, t)) * .16;   // puzzled head tilt on 'And what happens at nine?'
  if (t > 44.6 && t < 46) squash += Math.sin((t - 44.6) * 25) * .05 * (1 - ss(45, 46, t));
  const tremble = t > 33 && t < 50 ? .6 : 0;
  return { id: 'zz', kind: 'zz', pos: [Z_HOME[0], Z_HOME[1] + y, Z_HOME[2]], r: .28, yaw, pitch, roll, squash, expr: exprAt(t, Z_EXPR), soot, sweat: ss(27, 27.4, t) * (1 - ss(29, 30, t)) + ss(44.8, 45.2, t) * (1 - ss(49, 50, t)), tremble: tremble * Math.sin(t * 30),
    hatTilt: ss(27, 27.6, t) * .18 + ss(44, 46, t) * .1, hatOff: [0, -ss(51, 52.2, t) * .05, 0], ...o };
}
const SG = SHIPS.find(s => s.id === 'stgeorge')!;
function bWorld(t: number): V3 { const m = shipMatrix('stgeorge', SG.pos, SG.yaw, t); const p = new T.Vector3(.3, SG.fb + .605, -2.7).applyMatrix4(m); return [p.x, p.y, p.z]; }
function bBall(t: number, o: Partial<BallState> = {}): BallState {
  const v = talk('gb', t); const squash = v * .07;
  const watchK = Math.max(ss(5.9, 6.3, t) * (1 - ss(7.9, 8.3, t)), ss(13.7, 14.0, t) * (1 - ss(15.5, 15.7, t)));   // 'You have until nine.'
  return { id: 'gb', kind: 'gb', pos: bWorld(t), r: .28, yaw: Math.PI / 2 + SG.yaw, pitch: -.05 - v * .05, squash, expr: exprAt(t, B_EXPR),
    arm: watchK > 0 ? { k: watchK, hand: [1.1, .95, .95] } : undefined, watch: watchK > 0 ? { time: clockAt(t), k: watchK } : undefined, ...o };
}
const head = (b: BallState): V3 => [b.pos[0], b.pos[1] + b.r * 2.05, b.pos[2]];

// ---- camera helpers ----
const orbit = (c: V3, az: number, el: number, R: number): V3 => [c[0] + Math.cos(el) * Math.cos(az) * R, c[1] + Math.sin(el) * R, c[2] + Math.cos(el) * Math.sin(az) * R];
function zClose(t: number, a: number, b: number, d0: number, d1: number, az = Math.PI * .9, el = .1, fov0 = 30, fov1 = 26, up = .3): Cam {
  const kk = k(t, a, b); const c: V3 = [Z_HOME[0], Z_HOME[1] + .3, Z_HOME[2]]; return { pos: orbit(c, az, el, lerp(d0, d1, kk)), look: add(c, [0, up * lerp(d0, d1, kk) / 2.6, 0]), fov: lerp(fov0, fov1, kk) };
}
function bClose(t: number, a: number, b: number, d0: number, d1: number, az = .45, el = .08, fov0 = 30, fov1 = 26): Cam {
  const kk = k(t, a, b); const c = add(bWorld(t), [0, .3, 0]); return { pos: orbit(c, az, el, lerp(d0, d1, kk)), look: add(c, [0, .3 * lerp(d0, d1, kk) / 2.6, 0]), fov: lerp(fov0, fov1, kk) };
}
const MAP = (cx: number, cz: number, h: number, fov = 46): Cam => ({ pos: [cx, h, cz + .001], look: [cx, 0, cz], fov, up: [0, 0, -1] });

// ---- overlay helpers ----
const win = (id: string): [number, number] => { const v = speaking(id); return [v.t0, v.t0 + v.dur + .35]; };
const say = (t: number, a: number, b: number, text: string, cam: Cam, who: BallState, cy = 430) => { const [sx, sy] = proj(cam, head(who)); return bubble(text, 540, cy, sx, sy - 30, pop(t, a, b), who.kind); };
function shipTags(t: number, cam: Cam, kIn: number, which = ['stgeorge', 'philomel', 'racoon', 'thrush', 'sparrow', 'glasgow']) {
  let o = ''; for (const s of SHIPS) { if (!which.includes(s.id)) continue; const m = shipMatrix(s.id, s.pos, s.yaw, t); const p = new T.Vector3(0, s.fb + .4, 0).applyMatrix4(m); const [x, y] = proj(cam, [p.x, p.y, p.z]);
    const name = s.id === 'glasgow' ? 'GLASGOW (ROYAL YACHT)' : s.name; const side = s.id === 'glasgow' ? 'zz' : 'gb'; const dx = s.id === 'philomel' ? 60 : s.id === 'glasgow' ? 40 : s.id === 'stgeorge' ? 70 : -30;
    const dy = s.id === 'sparrow' ? 70 : s.id === 'thrush' ? -64 : s.id === 'racoon' ? 62 : -66; const d = SHIPS.indexOf(s) * .12; o += tag(name, x, y, side, clamp((kIn - d) * 3), dx, dy, 26); }
  return o;
}
const placeTag = (t: string, cam: Cam, p: V3, kk: number, dx: number, dy: number, side: 'place' | 'zz' | 'water' = 'place', size = 26) => { const [x, y] = proj(cam, p); return tag(t, x, y, side, kk, dx, dy, size); };

type Shot = { a: number; b: number; f: (t: number) => Frame };
const S: Shot[] = [];
const shot = (a: number, b: number, f: (t: number) => Frame) => S.push({ a, b, f });

// ===================== SCENE 1 — THE HOOK (0–6) =====================
shot(0, 1.75, t => { const kk = k(t, 0, 1.75); const cam: Cam = { pos: mv([-1.1, .66, 3.0], [.6, .8, 2.0], kk), look: mv([3.8, 1.35, .7], [2.95, .95, 1.0], kk), fov: lerp(46, 34, kk) };
  return { t, cam, balls: [zBall(t)], sun: { focus: [3, .5, 1], size: 9 }, grade: { fade: clamp(1 - t / .4) * .65 } }; });
shot(1.75, 3.8, t => { const cam = bClose(t, 1.75, 3.8, 2.9, 2.5, .5, .1, 34, 32); const b = bBall(t);
  return { t, cam, balls: [b], sun: { focus: b.pos, size: 8 }, overlay: say(t, ...win('D1'), 'LEAVE THE PALACE.\nFINAL WARNING!', cam, b, 470) }; });
shot(3.8, 6.0, t => { const cam = zClose(t, 3.8, 6.0, 2.9, 2.2, Math.PI * .88, .09, 34, 32); const z = zBall(t);
  return { t, cam, balls: [z], sun: { focus: Z_HOME, size: 8 }, overlay: say(t, ...win('D2'), "YOU'RE NOT TELLING\nME WHAT TO DO!", cam, z, 460) }; });

// ===================== SCENE 2 — THE THREAT (6–14) =====================
shot(6.0, 8.0, t => { const cam = bClose(t, 6.0, 8.0, 3.0, 2.7, .62, .12, 36, 34); const b = bBall(t);
  return { t, cam, balls: [b], sun: { focus: b.pos, size: 8 }, overlay: say(t, ...win('D3'), 'YOU HAVE\nUNTIL NINE.', cam, b, 440) }; });
shot(8.0, 9.6, t => { const cam = zClose(t, 8.0, 9.6, 2.6, 2.3, Math.PI * .93, .07, 34, 33); const z = zBall(t);
  return { t, cam, balls: [z], sun: { focus: Z_HOME, size: 8 }, overlay: say(t, ...win('D4'), 'AND WHAT HAPPENS\nAT NINE?', cam, z, 440) }; });
function mapReveal(t: number): Frame {   // output time 9.6–18.4 (world time = output time)
  const b = bBall(t);
  let cam: Cam;
  const P2: V3 = [-46, 15, -32], L2: V3 = [-16, 0, 3];
  if (t < 11.2) cam = bClose(t, 9.6, 11.2, 2.7, 2.35, .5, .1, 34, 33);
  else if (t < 12.8) { const kk = k(t, 11.2, 12.8); const e = bClose(11.2, 9.6, 11.2, 2.7, 2.35, .5, .1, 34, 33); cam = { pos: mv(e.pos, P2, kk), look: mv(e.look, L2, Math.min(1, kk * 1.4)), fov: lerp(33, 46, kk) }; }
  else if (t < 14.4) { const kk = k(t, 12.8, 14.4); const m = MAP(-13, 6, 96, 50);
    cam = { pos: mv(P2, m.pos, kk), look: mv(L2, m.look, kk), fov: lerp(46, 50, kk), up: (() => { const u = new T.Vector3(0, 1, 0).lerp(new T.Vector3(0, 0, -1), kk).normalize(); return u.toArray() as V3; })() }; }
  else { const kk = k(t, 14.4, 18.4); const m0 = MAP(-13, 6, 96, 50), m1 = MAP(-12, 5, 88, 50); cam = { pos: mv(m0.pos, m1.pos, kk), look: mv(m0.look, m1.look, kk), fov: 50, up: [0, 0, -1] }; }
  const mapK = ss(13.9, 14.7, t);
  let ov = say(t, ...win('D5'), "YOU'LL FIND OUT.", { ...cam }, b, 420);
  ov += plate('ZANZIBAR', '27 AUGUST 1896', 300, ss(12.3, 12.8, t));
  if (mapK > 0) ov += shipTags(t, cam, mapK) + placeTag("SULTAN'S PALACE", cam, [6.5, 2, 1], clamp((mapK - .3) * 2.5), 20, -78, 'zz', 26) + placeTag('HARBOUR', cam, [-26, 0, 3], clamp((mapK - .2) * 2), 0, 0, 'water', 34);
  ov += versus(ss(14.75, 15.15, t), 1440, ss(16.35, 16.75, t));   // on 'Five British warships… against one royal yacht'
  return { t, cam, balls: [b], sun: { focus: t < 11.2 ? b.pos : [-12, 0, 6], size: t < 11.2 ? 9 : 52 }, mapMode: t > 14.0, miniScale: 1 + ss(13.8, 14.9, t) * .9, overlay: ov, shakeK: 0 };
}

// ===================== SCENE 3 — THE COUNTDOWN (14–23) =====================
shot(14.0, 15.6, t => { const b = bBall(t); const q = new T.Quaternion().setFromEuler(new T.Euler(0, b.yaw, 0)); const r = b.r;
  const hand = new T.Vector3(1.1 * r, .95 * r, .95 * r); const wp = hand.clone().add(new T.Vector3(0, -.45 * r, .12 * r)).applyQuaternion(q).add(new T.Vector3(...b.pos)); const fwd = new T.Vector3(0, 0, 1).applyQuaternion(q);
  const kk = k(t, 14, 15.6); const cam: Cam = { pos: wp.clone().addScaledVector(fwd, lerp(.62, .46, kk)).add(new T.Vector3(0, .03, 0)).toArray() as V3, look: wp.toArray() as V3, fov: 34 };
  return { t, cam, balls: [b], sun: { focus: b.pos, size: 6 }, grade: { aperture: .9, focus: lerp(.62, .46, kk) }, overlay: plate('ULTIMATUM', 'LEAVE THE PALACE BY 9:00 AM', 1560, pop(t, 14.2, 15.5)) }; });
shot(15.6, 17.2, t => { const cam = zClose(t, 15.6, 17.2, 2.1, 1.8, Math.PI * .9, .06, 30, 30); const z = zBall(t);
  return { t, cam, balls: [z], sun: { focus: Z_HOME, size: 8 }, overlay: say(t, ...win('D6'), "I'M NOT\nLEAVING!", cam, z, 420) }; });
shot(17.2, 18.8, t => { const kk = k(t, 17.2, 18.8); const s = SHIPS.find(x => x.id === 'thrush')!; const m = shipMatrix('thrush', s.pos, s.yaw, t);
  const L = (v: V3): V3 => new T.Vector3(...v).applyMatrix4(m).toArray() as V3;
  const cam: Cam = { pos: L([lerp(-.32, -.22, kk), s.fb + .36, lerp(1.25, 1.15, kk)]), look: L([3.0, s.fb + .2, .65]), fov: 40 };
  return { t, cam, sailors: true, sun: { focus: L([0, 0, 0]), size: 7 } }; });
shot(18.8, 20.0, t => { const kk = k(t, 18.8, 20.0); const cam: Cam = { pos: mv([3.6, 1.45, -4.3], [3.4, 1.35, -3.9], kk), look: [-5, -.3, 1.4], fov: 42 };
  return { t, cam, sun: { focus: [1, 0, 0], size: 10 } }; });
shot(20.0, 21.2, t => { const kk = k(t, 20.0, 21.2); const cam: Cam = { pos: mv([-14.2, .16, -3.4], [-14.6, .18, -3.9], kk), look: [-20.5, .55, -8.2], fov: 36 };
  return { t, cam, sun: { focus: [-20, 0, -8], size: 9 } }; });
shot(21.2, 22.25, t => { const kk = k(t, 21.2, 22.25); const cam: Cam = { pos: mv([4.9, 2.75, 10.9], [5.6, 2.95, 10.45], kk), look: [7.14, 3.02, 10.0], fov: 32 };
  return { t, cam, sun: { focus: [7, 2, 10], size: 6 } }; });
shot(22.25, 23.0, t => { const cam = bClose(t, 22.25, 23.0, 1.5, 1.25, .5, .03, 26, 24); const b = bBall(t);
  return { t, cam, balls: [b], sun: { focus: b.pos, size: 6 }, grade: { contrast: 1.12 } }; });

// ===================== SCENE 4 — THE FIRST ATTACK (23–34) =====================
shot(23.0, 25.0, t => { const kk = k(t, 23.0, 25.0); const cam: Cam = { pos: mv([-6.4, .34, 13.4], [-6.9, .38, 12.8], kk), look: [-12.6, .95, 3.2], fov: 40 };
  return { t, cam, sun: { focus: [-12.5, 0, 4], size: 12 }, shakeK: 1.4 }; });
shot(25.0, 27.0, t => { const kk = k(t, 25.0, 27.0); const cam: Cam = { pos: mv([-4.4, 1.9, 22.6], [-3.9, 1.8, 21.8], kk), look: [3.3, 1.45, 4.6], fov: 38 };
  return { t, cam, sun: { focus: [3, 0, 5], size: 12 }, balls: [zBall(t)], shakeK: .8 }; });
shot(27.0, 28.6, t => { const cam = zClose(t, 27.0, 28.6, 2.7, 2.5, Math.PI * .84, .16, 36, 35); const z = zBall(t);
  return { t, cam, balls: [z], sun: { focus: Z_HOME, size: 8 }, overlay: say(t, ...win('D7'), 'WHAT?!', cam, z, 430) }; });
shot(28.6, 30.6, t => { const kk = k(t, 28.6, 30.6); const cam: Cam = { pos: mv([3.4, 1.55, 4.3], [3.2, 1.5, 4.1], kk), look: [-9, -.1, 1.0], fov: 40 };
  return { t, cam, sun: { focus: [-2, 0, 1], size: 10 }, shakeK: .7 }; });
shot(30.6, 34.0, t => { const kk = k(t, 30.6, 34.0); const cam: Cam = { pos: mv([-13.3, .5, -3.3], [-13.9, .62, -4.3], kk), look: mv([-22.5, .75, -9.3], [-21.5, .55, -8.6], kk), fov: lerp(38, 34, kk) };
  return { t, cam, sun: { focus: [-21, 0, -9], size: 12 }, shakeK: 1 }; });

// ===================== SCENE 5 — THE BATTLE ESCALATES (34–45) =====================
const PATHS_SCREEN = (cam: Cam) => [
  [[2.2, 0, -.5], [3.0, 0, -3.8], [10.6, 0, -3.8], [12.4, 0, -4.6]], [[2.2, 0, 3.2], [3.2, 0, 6.0], [10.8, 0, 6.0], [12.6, 0, 5.6]], [[3.0, 0, -10], [3.6, 0, -6.2], [10.2, 0, -6.2], [12.4, 0, -5.4]],
].map(p => p.map(v => proj(cam, v as V3)));
shot(34.0, 40.0, t => { const kk = k(t, 34.0, 40.0); const m0 = MAP(-13, 6, 96, 50), m1 = MAP(-1.5, 1.5, 44, 46); const cam: Cam = { pos: mv(m0.pos, m1.pos, kk), look: mv(m0.look, m1.look, kk), fov: 46, up: [0, 0, -1] };
  let ov = shipTags(t, cam, 1 - ss(35.2, 36, t), ['stgeorge', 'philomel', 'racoon', 'thrush', 'sparrow']) + clockBadge(clockAt(t), 1);
  ov += placeTag('PALACE', cam, [7, 2, 1], ss(35.6, 36.2, t), -10, -60, 'zz', 26) + placeTag('HAREM', cam, [7, 2, -10], ss(35.8, 36.4, t), -10, -60, 'zz', 26) + placeTag('GLASGOW SUNK', cam, [-20, 0, -8], ss(34.2, 34.8, t) * (1 - ss(36.5, 37.2, t)), 0, -70, 'zz', 26);
  const ar = PATHS_SCREEN(cam); const ak = (t - 36.0) / 2.6; ar.forEach((p, i) => { ov += arrow(p as [number, number][], '#ff3b30', ak - i * .2, 13); });
  ov += placeTag('DEFENDERS FALL BACK', cam, [9, 0, 1], ss(37.4, 38.0, t), 30, 300, 'zz', 28);
  return { t, cam, mapMode: true, miniScale: 1.9, sun: { focus: m1.look, size: lerp(52, 26, kk) }, overlay: ov, shakeK: .15 }; });
shot(40.0, 45.0, t => { const kk = k(t, 40.0, 45.0); const cam: Cam = { pos: mv([-4.5, 6.6, -9.4], [2.6, 7.0, -10.6], kk), look: mv([5.6, .3, -3.8], [12.0, .3, -3.6], kk), fov: 40 };
  return { t, cam, miniScale: 1.25, sun: { focus: [7, 0, -4], size: 14 }, shakeK: .4, overlay: clockBadge(clockAt(t), 1) }; });

// ===================== SCENE 6 — THE COLLAPSE (45–54) =====================
shot(45.0, 47.5, t => { const cam = zClose(t, 45.0, 47.5, 2.6, 2.1, Math.PI * .84, .1, 34, 32); return { t, cam, balls: [zBall(t)], sun: { focus: Z_HOME, size: 9 }, shakeK: .5 }; });
shot(47.5, 50.0, t => { const kk = k(t, 47.5, 50.0); const cam: Cam = { pos: mv([1.0, 1.6, 9.4], [1.4, 1.7, 9.0], kk), look: mv([6.3, 3.5, 1.1], [6.1, 3.15, 1.1], kk), fov: lerp(30, 32, kk) };
  return { t, cam, sun: { focus: [6, 2, 1], size: 8 }, shakeK: .5 }; });
shot(50.0, 51.0, t => { const kk = k(t, 50.0, 51.0); const cam: Cam = { pos: mv([-21, 5.6, 13], [-20.2, 5.4, 12.4], kk), look: [2, 1.2, 0], fov: 40 };
  return { t, cam, sun: { focus: [-8, 0, 2], size: 22 }, shakeK: 0 }; });
shot(51.0, 54.0, t => { const cam = zClose(t, 51.0, 54.0, 3.2, 2.3, Math.PI * .88, .12, 32, 30); return { t, cam, balls: [zBall(t)], sun: { focus: Z_HOME, size: 8 }, shakeK: 0, grade: { sat: .95 } }; });

// ===================== SCENE 7 — THE FINAL REVEAL (54–60) =====================
shot(54.0, 56.6, t => { const kk = k(t, 54.0, 56.6); const cam: Cam = { pos: mv([6.2, 3.03, 10.2], [5.7, 2.98, 10.4], kk), look: [7.14, 3.05, 10.0], fov: 32 };
  const clk = 9 * 60 + 2 + 38 * ease(clamp((t - 54.3) / 1.4));
  return { t, cam, clock: clk, sun: { focus: [7, 2, 10], size: 6 }, shakeK: 0, overlay: title('38 MINUTES', 1230, 150, pop(t, 55.95, 99, .3)) }; });
shot(56.6, 60.01, t => { const kk = k(t, 56.6, 60); const cam: Cam = { pos: mv([-.7, .84, .58], [-.4, .82, .55], kk), look: mv([2.75, .66, .55], [2.75, .63, .55], kk), fov: 44 };
  const b: BallState = { ...bBall(t), pos: [2.55, .3, .1], yaw: -Math.PI / 2 - .45, arm: { k: 1, hand: [1.1, .95, .95] }, watch: { time: 9 * 60 + 40, k: 1 }, squash: Math.sin(t * 3) * .02 };
  const z = zBall(t, { yaw: -Math.PI / 2 + .45 });
  return { t, cam, balls: [b, z], sun: { focus: [2.7, .3, .3], size: 8 }, shakeK: 0, grade: { sat: 1.05 },
    overlay: title('38 MINUTES', 330, 118, 1) + title('THE SHORTEST', 520, 84, pop(t, 56.9, 99, .3), '#ffd76a') + title('RECORDED WAR', 620, 84, pop(t, 57.1, 99, .3), '#ffd76a') }; });

/** Edit decision list (output seconds → story seconds). Built around the measured narration: the map reveal is
 *  extended so N1 plays in full, and quiet countdown cutaways / the retreat shot are trimmed to keep 60.0 s. */
export const EDL: [number, number, number][] = [[0, 9.6, 0], [18.4, 22.8, 4.4], [22.8, 23.6, 4.0], [23.6, 24.3, 3.6], [24.3, 45.0, 3.1], [45.0, 60.01, 0]];
export const storyAt = (u: number) => { for (const [a, b, off] of EDL) if (u >= a && u < b) return u - off; return u; };
export function frameAt(n: number): Frame {
  const u = n / FPS; if (u >= 9.6 && u < 18.4) return mapReveal(u);
  const t = storyAt(u); const s = S.find(x => t >= x.a && t < x.b) ?? S[S.length - 1]; const F = s.f(t);
  F.hideMinis = F.hideMinis ?? false; return F;
}
export const _debug = { SHOTS, ZZ_UNITS, T_OPEN, T_FLAG, T_CEASE };
