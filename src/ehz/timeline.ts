// Deterministic battle timeline (film seconds). Every shell has a firing gun, a flight and a visible landing.
import * as T3 from 'three';
import { rng, groundH, shoreX, ss, clamp, lerp, type V3 } from './geo.ts';

export const T_OPEN = 23.4, T_CEASE = 50.0, T_GLASGOW_HIT = 32.45, T_LIGHTHOUSE = 26.25, T_FLAG = 48.25;
export type Shot = { t: number; ship: string; gun: number; target: V3; tHit: number; kind: 'build' | 'water' | 'ship' | 'flag'; rad: number; zz?: boolean };

// shoreline target points (west faces / roofs of the palace complex)
const PAL = (r: () => number): V3 => { const z = -2.6 + r() * 7.2, y = .55 + r() * 1.35; return r() < .78 ? [4.0, y, z] : [4.6 + r() * 4.5, 1.9, z]; };
const HAR = (r: () => number): V3 => { const z = -13.5 + r() * 6.5, y = .5 + r() * 1.2; return r() < .8 ? [4.2, y, z] : [5 + r() * 4, 1.8, z]; };
const WON = (r: () => number): V3 => { const z = 7.6 + r() * 4.8, y = .5 + r() * 1.6; return [5.0, y, z]; };
const LH: V3 = [2.6, 2.2, 10];

const SHIP_POS: Record<string, V3> = { stgeorge: [-36, 0, -16], philomel: [-27, 0, 27], racoon: [-24, 0, 11], thrush: [-12, 0, -1], sparrow: [-13, 0, 8], glasgow: [-20, 0, -8] };
const dist = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const flight = (a: V3, b: V3) => .32 + dist(a, b) / 42;

export const SHOTS: Shot[] = (() => {
  const R = rng(1896); const out: Shot[] = [];
  const add = (t: number, ship: string, gun: number, target: V3, kind: Shot['kind'] = 'build', rad = .42, zz = false) => out.push({ t, ship, gun, target, tHit: t + flight(SHIP_POS[ship] ?? target, target), kind, rad, zz });
  // opening: Racoon, Thrush and Sparrow fire together
  add(T_OPEN, 'thrush', 2, [4.0, 1.25, .3]); add(T_OPEN + .05, 'sparrow', 1, [4.0, .95, 3.4]); add(T_OPEN + .1, 'racoon', 2, [4.0, 1.6, -1.8]); add(T_OPEN + .02, 'thrush', 1, [4.0, .7, 2.2]);
  add(24.3, 'sparrow', 2, [4.0, 1.5, 4.0]); add(24.6, 'thrush', 1, [4.2, 1.2, -10]); add(24.95, 'racoon', 1, [4.0, 1.75, .9]);
  add(25.35, 'sparrow', 1, [4.0, .65, -1.5]); add(25.7, 'thrush', 2, [4.0, 1.4, 1.9]);
  add(25.95, 'racoon', 2, [2.6, 1.6, 10]); add(T_LIGHTHOUSE - .52, 'sparrow', 2, LH, 'build', .45);    // the lighthouse
  add(26.6, 'thrush', 1, [4.0, 1.0, -.4]); add(27.0, 'sparrow', 1, [4.0, 1.7, 2.6]);
  // Zanzibar answers from the forecourt (black-powder guns fall short)
  out.push({ t: 29.0, ship: 'zzgun0', gun: 0, target: [-9.2, 0, -1.6], tHit: 29.55, kind: 'water', rad: .5, zz: true });
  out.push({ t: 29.45, ship: 'zzgun1', gun: 0, target: [-8.4, 0, .6], tHit: 29.98, kind: 'water', rad: .5, zz: true });
  out.push({ t: 29.95, ship: 'zzgun2', gun: 0, target: [-10.1, 0, 2.1], tHit: 30.5, kind: 'water', rad: .5, zz: true });
  add(29.25, 'thrush', 2, [4.0, .8, -1.2]); add(29.8, 'racoon', 1, [2.3, .4, 2.6], 'build', .5); add(30.3, 'sparrow', 2, [2.2, .35, -2.1], 'build', .5);
  // Glasgow fires on St George; St George replies and sinks her
  out.push({ t: 31.0, ship: 'glasgow', gun: 1, target: [-33.8, 0, -13.3], tHit: 31.42, kind: 'water', rad: .55, zz: true });
  out.push({ t: 31.55, ship: 'glasgow', gun: 2, target: [-34.0, 0, -18.6], tHit: 31.95, kind: 'water', rad: .55, zz: true });
  add(32.05, 'stgeorge', 2, [-19.6, .55, -8.6], 'ship', .5); add(32.12, 'stgeorge', 3, [-19.8, .45, -7.0], 'ship', .5); add(32.2, 'stgeorge', 4, [-20.3, .6, -7.9], 'ship', .5); add(32.6, 'stgeorge', 5, [-19.9, .4, -9.5], 'ship', .5);
  // sustained bombardment
  let t = 33.1;
  while (t < T_CEASE - .3) {
    const ships = ['thrush', 'sparrow', 'racoon', ...(t > 27 ? ['philomel'] : []), ...(t > 35 ? ['stgeorge'] : [])]; const sh = ships[(R() * ships.length) | 0];
    const k = R(); const tgt = k < .5 ? PAL(R) : k < .78 ? HAR(R) : WON(R);
    const miss = R() < .14; const gun = sh === 'stgeorge' ? 2 + ((R() * 4) | 0) : 1 + ((R() * 2) | 0);
    if (miss) { const z = tgt[2] + (R() - .5) * 3; add(t, sh, gun, [shoreX(z) - .6 - R() * 2.5, 0, z], 'water', .45); }
    else add(t, sh, gun, tgt);
    t += .32 + R() * .55;
  }
  add(T_FLAG - .5, 'thrush', 2, [6.4, 3.0, 1.0], 'flag', .25);
  add(T_FLAG - .9, 'sparrow', 1, [6.0, 2.0, 1.4]); add(T_FLAG + .4, 'racoon', 2, [4.0, 1.3, -.9]); add(49.1, 'thrush', 1, [4.0, .9, 3.6]); add(49.55, 'sparrow', 2, [4.2, 1.1, -11.2]);
  return out.sort((a, b) => a.t - b.t);
})();
export const IMPACTS = SHOTS.filter(s => s.kind === 'build' || s.kind === 'ship' || s.kind === 'flag');
export const SPLASHES = SHOTS.filter(s => s.kind === 'water');

/** Burning sites that ignite with building hits. */
export const FIRES: { at: V3; t0: number; size: number }[] = IMPACTS.filter((s, i) => s.kind === 'build' && (i % 2 === 0 || s.target[1] > 1.6)).map((s, i) => ({ at: [s.target[0] + .25, Math.max(s.target[1] - .25, .45), s.target[2]] as V3, t0: s.tHit + .4, size: .55 + (i % 3) * .2 }))
  .concat([{ at: [-20, .5, -8], t0: 32.7, size: .9 }, { at: [-19.6, .55, -7.3], t0: 33.0, size: .7 }]);

// ---- soldiers -----------------------------------------------------------------------------------------
export type Unit = { home: V3; yaw0: number; group: number; path: V3[]; delay: number; crew?: number };
const PATH_N: V3[] = [[3.0, 0, -3.8], [10.6, 0, -3.8], [12.4, 0, -4.6], [16, 0, -4.8], [24, 0, -4.3]];
const PATH_S: V3[] = [[3.2, 0, 6.0], [10.8, 0, 6.0], [12.6, 0, 5.6], [16, 0, 5.2], [24, 0, 4.6]];
export const ZZ_UNITS: Unit[] = (() => {
  const R = rng(77); const u: Unit[] = [];
  // firing line behind the seawall, and two ranks in front of the palace (the steps stay clear for the Sultan's ball)
  for (let z = -2.9; z < 5.1; z += .45) { if ([-2, -.4, 2.6].some(c => Math.abs(z - c) < .3)) continue; u.push({ home: [.68, 0, z], yaw0: -Math.PI / 2, group: z < 1 ? 0 : 1, path: z < 1 ? PATH_N : PATH_S, delay: .5 + R() * .4 }); }
  for (const x of [2.55, 2.95]) for (let z = -2.9; z < 4.7; z += .42) { if (x > 2.3 && z > -.15 && z < 2.15) continue; u.push({ home: [x + (R() - .5) * .04, 0, z], yaw0: -Math.PI / 2, group: z < 1 ? 0 : 1, path: z < 1 ? PATH_N : PATH_S, delay: (3.6 - x) * .4 + R() * .4 }); }
  // gun crews (two per cannon)
  for (const [gz, gi] of [[-2.0, 0], [-.4, 1], [2.6, 2], [6.9, 3]] as const) for (const dz of [-.32, .32]) u.push({ home: [1.4, 0, gz + dz], yaw0: -Math.PI / 2, group: gz < 1 ? 0 : 1, path: gz < 1 ? PATH_N : PATH_S, delay: .2 + R() * .4, crew: gi });
  // harem garrison
  for (let i = 0; i < 3; i++) for (let j = 0; j < 7; j++) u.push({ home: [2.4 + i * .4, 0, -13 + j * .55], yaw0: -Math.PI / 2, group: 2, path: [[3.6, 0, -6.2], [10.2, 0, -6.2], [12.4, 0, -5.4], [24, 0, -5]], delay: 1.2 + i * .4 + j * .1 + R() * .3 });
  // pier
  for (let j = 0; j < 6; j++) u.push({ home: [-.4 - j * .5, .22, -4.8], yaw0: -Math.PI / 2, group: 3, path: [[2.6, 0, -4.0], ...PATH_N], delay: .1 + j * .15 });
  return u;
})();
export const GB_UNITS: Unit[] = (() => {
  const u: Unit[] = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) u.push({ home: [2.6 + j * .42, 0, 25.6 + i * .42], yaw0: Math.PI, group: 9, path: [[3.0, 0, 18], [3.0, 0, 15]], delay: i * .2 + j * .1 });
  return u;
})();
const T_RETREAT = [35.6, 36.6, 35.2, 34.8];
const along = (pts: V3[], d: number): [V3, number] => {
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const l = Math.hypot(b[0] - a[0], b[2] - a[2]); if (d <= l) { const k = d / l; return [[lerp(a[0], b[0], k), 0, lerp(a[2], b[2], k)], Math.atan2(b[0] - a[0], b[2] - a[2])]; } d -= l; }
  const a = pts[pts.length - 2], b = pts[pts.length - 1]; return [b, Math.atan2(b[0] - a[0], b[2] - a[2])];
};
/** State of every soldier at film time t. */
export function soldiers(t: number) {
  const zz = ZZ_UNITS.map((u, i) => {
    let pos: V3 = [...u.home]; let yaw = u.yaw0, hop = 0, scared = 0, vis = true;
    const alert = ss(20.6, 21.6, t); hop += Math.max(0, Math.sin((t - 21 - (i % 7) * .03) * 9)) * .12 * (t > 21 && t < 21.4 ? 1 : 0) * alert;
    // idle bob
    hop += Math.max(0, Math.sin(t * 3.2 + i * 1.7)) * .05 * (1 - ss(22, 23, t));
    // flinch from nearby impacts
    for (const s of IMPACTS) { const age = t - s.tHit; if (age < 0 || age > 1.2) continue; const d = Math.hypot(s.target[0] - u.home[0], s.target[2] - u.home[2]); if (d > 3.2) continue; const k = (1 - d / 3.2);
      hop += Math.max(0, Math.sin(age * 7)) * Math.exp(-age * 3) * .5 * k; scared = Math.max(scared, k * 1.4 * Math.exp(-age * .6)); }
    if (t > T_OPEN) scared = Math.max(scared, .35 * ss(T_OPEN, 30, t));
    const tr = T_RETREAT[Math.min(u.group, 3)] + u.delay;
    if (t > tr) {
      scared = 1; const turn = ss(tr, tr + .35, t);
      const start: V3 = [...u.home]; const first = u.path[0]; const d0 = Math.hypot(first[0] - start[0], first[2] - start[2]);
      const travel = Math.max(0, t - tr - .3) * 1.75; let p: V3, yy: number;
      if (travel < d0) { const k = travel / d0; p = [lerp(start[0], first[0], k), 0, lerp(start[2], first[2], k)]; yy = Math.atan2(first[0] - start[0], first[2] - start[2]); }
      else [p, yy] = along(u.path, travel - d0);
      // keep a lane offset so units do not overlap while moving in column
      const lane = ((i * 7) % 5 - 2) * .14; p = [p[0] + Math.cos(yy) * lane, 0, p[2] - Math.sin(yy) * lane];
      pos = p; yaw = lerpAngle(u.yaw0, yy, turn); hop = Math.abs(Math.sin((t - tr) * 11 + i)) * .1 * turn;
      if (p[0] > 13.2) vis = false;
    } else yaw = u.yaw0 + Math.sin(t * .7 + i) * .15 * (1 - alert) + (scared > .6 ? Math.sin(t * 13 + i) * .2 : 0);
    pos[1] = (u.home[1] > 0 && t < tr + .9 ? u.home[1] : groundH(pos[0], pos[2]));
    return { pos, yaw, hop, scared: clamp(scared), vis, crew: u.crew };
  });
  const gb = GB_UNITS.map((u, i) => {
    let pos: V3 = [...u.home]; let yaw = u.yaw0; const go = t - 51.2 - u.delay; let hop = Math.max(0, Math.sin(t * 2.6 + i)) * .03;
    if (go > 0) { const [p, yy] = along([u.home, [u.home[0], 0, 21], [u.home[0] - .3, 0, 17.5]], go * 1.1); pos = p; yaw = yy; hop = Math.abs(Math.sin(go * 9 + i)) * .08; }
    pos[1] = groundH(pos[0], pos[2]); return { pos, yaw, hop, scared: 0, vis: true };
  });
  return { zz, gb };
}
const lerpAngle = (a: number, b: number, k: number) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

/** Glasgow sinking pose: y offset, roll, pitch. */
export const glasgowPose = (t: number) => { const k = ss(32.8, 35.6, t); return { y: -.62 * k, roll: .3 * ss(32.6, 34.2, t) - .08 * k, pitch: -.06 * k, list: k }; };
export const lighthouseFall = (t: number) => ss(T_LIGHTHOUSE + .05, T_LIGHTHOUSE + 1.25, t) ** 1.6;
export const flagFall = (t: number) => ss(T_FLAG, T_FLAG + 1.1, t) ** 1.7;
export { SHIP_POS };

// ---- ship motion at anchor + clock -----------------------------------------------------------------
/** Racoon, Thrush and Sparrow steam into their firing berths during the map reveal. */
export const APPROACH: Record<string, V3> = { thrush: [-8, 0, -6], sparrow: [-9, 0, -5], racoon: [-10, 0, 4] };
export const approachK = (t: number) => ss(10.8, 14.2, t);
export function shipPose(id: string, t: number) {
  const ph = id.length * 1.37; let y = Math.sin(t * .9 + ph) * .025, roll = Math.sin(t * .7 + ph) * .012, pitch = Math.sin(t * .55 + ph * 2) * .006;
  const ap = APPROACH[id]; const off: V3 = ap ? [ap[0] * (1 - approachK(t)), 0, ap[2] * (1 - approachK(t))] : [0, 0, 0];
  if (id === 'glasgow') { const g = glasgowPose(t); y += g.y; roll += g.roll; pitch += g.pitch; }
  return { y, roll, pitch, off };
}
export function shipMatrix(id: string, base: V3, yaw: number, t: number) {
  const p = shipPose(id, t); return new T3.Matrix4().compose(new T3.Vector3(base[0] + p.off[0], base[1] + p.y, base[2] + p.off[2]), new T3.Quaternion().setFromEuler(new T3.Euler(p.pitch, yaw, p.roll, 'YXZ')), new T3.Vector3(1, 1, 1));
}
/** Minutes after midnight shown by clocks at film time t. */
export function clockAt(t: number) {
  if (t < 14) return 8 * 60 + 47 + t / 14 * 10;
  if (t < 22) return 8 * 60 + 57 + (t - 14) / 8 * 3;
  if (t < T_OPEN) return 9 * 60 + (t - 22) / (T_OPEN - 22) * 2;
  return 9 * 60 + 2 + Math.min(38, (t - T_OPEN) / (T_CEASE - T_OPEN) * 38) + Math.max(0, t - T_CEASE) * .1;
}
