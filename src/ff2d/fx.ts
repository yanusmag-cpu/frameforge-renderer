// FrameForge 2D engine — reusable, deterministic VFX (SVG strings, world or screen space).
import { clamp, hash, mix, noise1, outCubic, range, type V2 } from './motion.ts';
import { H, rad, W } from './stage.ts';

const n = (x: number) => +x.toFixed(2);
let uid = 0;
const id = (p: string) => `${p}${(uid = (uid + 1) % 1e6)}`;

/** Soft puffy cloud blob from overlapping circles with gradient shading (smoke, dust, mushroom). */
export function puff(cx: number, cy: number, r: number, seed: number, col: string, shadow: string, a = 1, lobes = 7) {
  const g = id('pf');
  let s = `<defs>${rad(g, [[0, col], [.7, col], [1, shadow]], .42, .35, .7)}</defs><g opacity="${n(a)}">`;
  for (let i = 0; i < lobes; i++) {
    const ang = hash(seed + i) * Math.PI * 2, d = r * (.25 + hash(seed + i * 3) * .45), rr = r * (.45 + hash(seed + i * 7) * .4);
    s += `<circle cx="${n(cx + Math.cos(ang) * d)}" cy="${n(cy + Math.sin(ang) * d * .7)}" r="${n(rr)}" fill="url(#${g})"/>`;
  }
  return s + '</g>';
}

/** Rising smoke column (wind-sheared), age-based puffs; t absolute seconds. */
export function smokeColumn(base: V2, t: number, o: { h: number; w: number; wind: number; col?: string; dark?: string; a?: number; seed?: number; rate?: number }) {
  const N = 14, seed = o.seed ?? 1, rate = o.rate ?? .35;
  let s = '';
  for (let i = N - 1; i >= 0; i--) {
    const k = ((t * rate + i / N) % 1);
    const y = base[1] - k * o.h, x = base[0] + o.wind * k * k * o.h + noise1(k * 3 + i, seed) * o.w * .2;
    s += puff(x, y, o.w * (.3 + k * .9), seed * 31 + i, o.col ?? '#3b3a3d', o.dark ?? '#1d1c1f', (o.a ?? .9) * (1 - k) * clamp(k * 6), 6);
  }
  return s;
}

/** Nuclear fireball → mushroom cloud, stylised and non-graphic. lt = seconds since detonation. scale in px. */
export function mushroom(cx: number, ground: number, lt: number, sc: number, palette: 'night' | 'dusk' = 'night') {
  if (lt < 0) return '';
  const rise = outCubic(clamp(lt / 9)) * sc * 2.4, capR = sc * (.35 + outCubic(clamp(lt / 7)) * .55);
  const hot = Math.exp(-lt * .55);
  const capY = ground - rise - sc * .25;
  const stemC = palette === 'night' ? '#6b4a3c' : '#7d6a5c', capC = mix(0, 1, hot) > .5 ? '#ffd27a' : '#c48a5a';
  let s = '';
  // stem
  const sw = sc * (.1 + .08 * clamp(lt / 6));
  s += `<path d="M${n(cx - sw * 1.6)} ${n(ground)} C${n(cx - sw)} ${n(ground - rise * .5)} ${n(cx - sw * .8)} ${n(capY + capR * .5)} ${n(cx - sw * .5)} ${n(capY)} L${n(cx + sw * .5)} ${n(capY)} C${n(cx + sw * .8)} ${n(capY + capR * .5)} ${n(cx + sw)} ${n(ground - rise * .5)} ${n(cx + sw * 1.6)} ${n(ground)}Z" fill="${stemC}" opacity=".95"/>`;
  // ground skirt
  for (let i = 0; i < 5; i++) s += puff(cx + (i - 2) * sc * .32, ground - sc * .05, sc * (.2 + clamp(lt / 5) * .25), 900 + i, '#7a5a48', '#3c2c24', .9, 5);
  // cap: toroidal roll — ring of puffs + underside glow
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2 + lt * .25;
    const px = cx + Math.cos(a) * capR * .75, py = capY + Math.sin(a) * capR * .3;
    s += puff(px, py, capR * .55, 50 + i, capC, '#5a3a2c', 1, 6);
  }
  s += puff(cx, capY - capR * .25, capR * .7, 77, capC, '#6b4434', 1, 7);
  if (hot > .02) {
    const g = id('hot');
    s += `<defs>${rad(g, [[0, '#fff7d6', hot], [.4, '#ffb347', hot * .8], [1, '#ff5a1f', 0]])}</defs><ellipse cx="${n(cx)}" cy="${n(capY + capR * .1)}" rx="${n(capR * 1.3)}" ry="${n(capR)}" fill="url(#${g})" style="mix-blend-mode:screen"/>`;
  }
  return s;
}

/** Expanding shock ring on the ground plane (ellipse) + dust wall. */
export function shockRing(c: V2, lt: number, speed: number, flat = .18, col = '#f3d9b0') {
  if (lt < 0) return '';
  const r = lt * speed, a = Math.exp(-lt * .6);
  return `<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(r)}" ry="${n(r * flat)}" fill="none" stroke="${col}" stroke-width="${n(6 + lt * 8)}" opacity="${n(a * .8)}"/>` +
    `<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(r * .97)}" ry="${n(r * flat * .97)}" fill="none" stroke="#fff" stroke-width="3" opacity="${n(a)}"/>`;
}

/** Drifting particles (ash, dust, snow-ash, embers). Screen-space, wraps. */
export function particles(t: number, o: { count: number; col: string; size: number; fall: number; drift: number; seed?: number; a?: number; glow?: boolean; area?: [number, number, number, number] }) {
  const [x0, y0, w, h] = o.area ?? [0, 0, W, H];
  let s = '';
  for (let i = 0; i < o.count; i++) {
    const r = hash(i * 1.37 + (o.seed ?? 0));
    const sp = .6 + hash(i * 2.1) * .8;
    const y = y0 + ((hash(i * 5.3) * h + t * o.fall * sp) % h);
    const x = x0 + ((hash(i * 7.7) * w + t * o.drift * sp + Math.sin(t * 1.3 + i) * 12) % w + w) % w;
    const sz = o.size * (.5 + r);
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(sz)}" fill="${o.col}" opacity="${n((o.a ?? .8) * (.4 + r * .6))}"${o.glow ? ' style="mix-blend-mode:screen"' : ''}/>`;
  }
  return s;
}

/** Radar sweep (phosphor) with blips: blips = [angle(rad), dist(0..1), appearTime] */
export function radar(cx: number, cy: number, R: number, t: number, blips: [number, number, number][], tint = '#39ff8a', alert = 0) {
  const g = id('rd');
  const ang = (t * 1.6) % (Math.PI * 2);
  let s = `<defs>${rad(g, [[0, '#0b2a1a'], [1, '#03100a']])}</defs><circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${g})" stroke="#0f3d26" stroke-width="6"/>`;
  for (let k = 1; k <= 4; k++) s += `<circle cx="${cx}" cy="${cy}" r="${n(R * k / 4)}" fill="none" stroke="${tint}" stroke-opacity=".22" stroke-width="2"/>`;
  s += `<path d="M${cx - R} ${cy}H${cx + R}M${cx} ${cy - R}V${cy + R}" stroke="${tint}" stroke-opacity=".18" stroke-width="2"/>`;
  // sweep wedge with trailing fade
  for (let k = 0; k < 18; k++) {
    const a0 = ang - k * .045, a1 = a0 - .045;
    s += `<path d="M${cx} ${cy} L${n(cx + Math.cos(a0) * R)} ${n(cy + Math.sin(a0) * R)} A${R} ${R} 0 0 0 ${n(cx + Math.cos(a1) * R)} ${n(cy + Math.sin(a1) * R)}Z" fill="${tint}" opacity="${n(.32 * (1 - k / 18) ** 2)}"/>`;
  }
  s += `<path d="M${cx} ${cy} L${n(cx + Math.cos(ang) * R)} ${n(cy + Math.sin(ang) * R)}" stroke="${tint}" stroke-width="3"/>`;
  for (const [ba, bd, bt] of blips) {
    if (t < bt) continue;
    const since = ((ang - ba) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) / 1.6;
    const fade = Math.max(.35, 1 - since * .35), pop = outCubic(range(t, bt, bt + .25));
    const x = cx + Math.cos(ba) * bd * R, y = cy + Math.sin(ba) * bd * R;
    const c = alert > .5 ? '#ff3b30' : tint;
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(10 * pop)}" fill="${c}" opacity="${n(fade)}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(10 + ((t - bt) * 40) % 40)}" fill="none" stroke="${c}" stroke-width="2" opacity="${n(.6 * (1 - ((t - bt) * 40 % 40) / 40))}"/>`;
  }
  return s;
}

/** CRT/screen treatment over a rect: scanlines + glass highlight. */
export function screenGlass(x: number, y: number, w: number, h: number, t: number, a = .25) {
  let s = `<g opacity="${a}">`;
  for (let yy = y; yy < y + h; yy += 6) s += `<rect x="${n(x)}" y="${n(yy)}" width="${n(w)}" height="2" fill="#000"/>`;
  s += `</g><rect x="${n(x)}" y="${n(y + ((t * 120) % h))}" width="${n(w)}" height="14" fill="#fff" opacity=".04"/>`;
  return s + `<path d="M${n(x)} ${n(y)} L${n(x + w * .45)} ${n(y)} L${n(x)} ${n(y + h * .6)}Z" fill="#fff" opacity=".05"/>`;
}

/** Digital glitch slices (transition accent). k 0..1 intensity. Wraps already-rendered content via duplicates. */
export function glitchBars(t: number, k: number) {
  if (k <= 0) return '';
  let s = '';
  for (let i = 0; i < 9; i++) {
    const r = hash(Math.floor(t * 30) * 13 + i);
    if (r > k) continue;
    const y = hash(i * 7 + Math.floor(t * 30)) * H, h = 6 + r * 40;
    s += `<rect x="0" y="${n(y)}" width="${W}" height="${n(h)}" fill="${i % 2 ? '#ff2b4a' : '#29e3ff'}" opacity="${n(.18 * k)}" style="mix-blend-mode:screen"/>`;
  }
  return s;
}

/** Light shafts from a point (god rays). */
export function rays(src: V2, t: number, col: string, a: number, count = 7, len = 1400, spread = .9, dir = Math.PI / 2) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const ang = dir + (i / (count - 1) - .5) * spread + Math.sin(t * .3 + i) * .02;
    const w = .025 + hash(i * 3.3) * .04;
    const p1: V2 = [src[0] + Math.cos(ang - w) * len, src[1] + Math.sin(ang - w) * len], p2: V2 = [src[0] + Math.cos(ang + w) * len, src[1] + Math.sin(ang + w) * len];
    s += `<path d="M${n(src[0])} ${n(src[1])} L${n(p1[0])} ${n(p1[1])} L${n(p2[0])} ${n(p2[1])}Z" fill="${col}" opacity="${n(a * (.4 + hash(i) * .6) * (.8 + .2 * Math.sin(t + i)))}" style="mix-blend-mode:screen"/>`;
  }
  return s;
}

/** Rotating emergency beacon light pool. */
export function beacon(p: V2, t: number, col: string, r: number, speed = 4) {
  const a = Math.max(0, Math.cos(t * speed)) ** 3;
  const g = id('bc');
  return `<defs>${rad(g, [[0, col, .65 * a], [1, col, 0]])}</defs><circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(r)}" fill="url(#${g})" style="mix-blend-mode:screen"/>`;
}
