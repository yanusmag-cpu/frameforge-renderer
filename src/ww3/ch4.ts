// Chapter 4 — The First Strikes (1:44–2:19). Distant witnesses, maps and systems — no injuries shown.
import { EXPR, expr } from '../ff2d/face.ts';
import { beacon, particles } from '../ff2d/fx.ts';
import { fictionalWorld } from '../ff2d/geo.ts';
import { clamp, hash, mix, outBack, outCubic, range, settle, type V2 } from '../ff2d/motion.ts';
import { HERO, type Pose, STAND, stickman } from '../ff2d/rig.ts';
import { glow, grade, H, lin, place, txt, W } from '../ff2d/stage.ts';
import { badge, chapterTitle, COL, kinetic } from '../ff2d/ui.ts';
import { cityScape } from './kits/city.ts';
import { at, type Shot } from './shot.ts';
import { S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);
const FLASH = S[48] + .05; // "A flash brighter than the sun"
const WAVE = S[50] + 1.0;  // "the pressure wave arrives"

function card1945(t: number, lt: number) {
  const k = outCubic(range(lt, 1.6, 2.4));
  let s = `<rect width="${W}" height="${H}" fill="#0c0b09"/>`;
  s += `<g opacity="${n(1 - k)}">${txt(960, 560, '1945', 260, { anchor: 'middle', fill: '#d8c9a8' })}${txt(960, 660, 'THE LAST TIME NUCLEAR WEAPONS WERE USED IN WAR', 34, { anchor: 'middle', weight: 700, fill: '#a8987a', ls: 2 })}</g>`;
  s += `<g opacity="${n(k)}" transform="translate(960 560) scale(${n(.9 + k * .1)})">${txt(0, 0, 'NOW', 260, { anchor: 'middle', fill: COL.alert })}${txt(0, 100, 'IN OUR SCENARIO', 34, { anchor: 'middle', weight: 700, fill: '#e8c8c8', ls: 6 })}</g>`;
  for (let i = 0; i < 6; i++) s += `<rect x="${n(hash(i + Math.floor(t * 12)) * W)}" y="0" width="2" height="${H}" fill="#fff" opacity=".07"/>`;
  return s + `<rect width="${W}" height="${H}" fill="#b49a6a" opacity="${n(.18 * (1 - k))}" style="mix-blend-mode:multiply"/>` + chapterTitle(lt, 4, 'The First Strikes', 2.2) + grade({ vig: .75 });
}

/** Balcony witness shot: hero at the railing, city below, distant light → flash → (later) pressure wave. */
function balcony(t: number) {
  const pre = range(t, S[47] + 1.0, FLASH); // horizon begins to glow ("begins with a light")
  const fl = t >= FLASH ? Math.exp(-(t - FLASH) * 1.4) : 0;
  const wave = t >= WAVE ? 1 : 0, wk = range(t, WAVE, WAVE + .5);
  const shakeAmp = wave ? Math.exp(-(t - WAVE) * 2.2) : 0;
  let s = cityScape(t, { sky: 'night', cam: { x: 1000, y: 600, zoom: 1.15, shake: shakeAmp * .9 }, lit: .3, stars: .5, flash: { t0: FLASH, x: 1500 }, cloud: { t0: FLASH, x: 1500, sc: 120 }, shock: { t0: WAVE - 1.1, x: 1500 } });
  if (pre > 0 && t < FLASH) s += glow([1500, 560], 700, '#ffd8a0', .35 * pre * pre);
  // foreground balcony: rail + glass door frame + plant
  const jx = shakeAmp * Math.sin(t * 60) * 10;
  let fg = `<g transform="translate(${n(jx)} 0)"><rect x="-20" y="0" width="300" height="${H}" fill="#151821" stroke="#111" stroke-width="6"/><rect x="40" y="60" width="200" height="900" fill="#1d2433" stroke="#111" stroke-width="6"/>`;
  if (wk > 0) fg += `<path d="M140 300 l40 60 l-30 50 l50 80 M140 300 l-50 40 l20 70 M180 360 l60 -30" stroke="#cfd6e6" stroke-width="3" fill="none" opacity="${n(wk)}"/>`;
  fg += `<rect x="0" y="860" width="${W}" height="30" fill="#2a2f3a" stroke="#111" stroke-width="5"/>`;
  for (let x = 300; x < W; x += 70) fg += `<rect x="${x}" y="890" width="12" height="200" fill="#2a2f3a" stroke="#111" stroke-width="3"/>`;
  fg += `<rect y="1000" width="${W}" height="80" fill="#121620"/></g>`;
  // hero: three-quarter back view at the rail, then shields eyes, then braces
  const shield = outBack(range(t, FLASH - .05, FLASH + .25)) * (1 - range(t, FLASH + 2.0, FLASH + 2.8));
  const brace = wave ? settle(t - WAVE, 1.4, 3.5) : 0;
  const p: Pose = { ...STAND, turn: .55, lean: -.15 * shield + .12 * brace, crouch: .1 * brace,
    handA: [mix(.25, .55, brace), mix(-2.35, -2.4, brace)], handB: shield > .05 ? [mix(.6, .25, shield), mix(-2.35, -3.75, shield)] : [.75, -2.35], bendB: shield > .05 ? 2 : -1, bendA: -1,
    shapeB: shield > .3 ? 'open' : 'hold', headTurn: .3, headTilt: -.04, footA: [-.2, -.08], footB: [.25, -.08] };
  const face = t < FLASH - .1 ? { ...expr('curious', 'worried', pre), gx: .9, gy: -.1 } : t < WAVE ? { ...expr('shocked', 'terror', range(t, FLASH + .4, FLASH + 1.2)), gx: .9, gy: -.1 } : { ...expr('terror', 'fear', range(t, WAVE + .6, WAVE + 1.5)), gx: .5 };
  const r = stickman(p, HERO, { id: 'bh', t, seed: 3, face });
  fg += `<g transform="translate(${n(jx * 1.2)} 0)">${place(r.svg, 520, 1170, 165)}</g>`;
  s += fg;
  // flash relight: everything washes warm-white then settles to ember underlight
  s += `<rect width="${W}" height="${H}" fill="#fff6dc" opacity="${n(fl * .95)}"/>`;
  if (t > FLASH) s += `<rect width="${W}" height="${H}" fill="#ff8a3b" opacity="${n(.16 * (1 - fl))}" style="mix-blend-mode:screen"/>`;
  if (wave) s += particles(t, { count: 80, col: '#c9b8a0', size: 3, fall: 60, drift: -260, a: .6 * clamp((t - WAVE) * 2) });
  return s + grade({ tint: '#8a90c8', tintA: .2 * (1 - fl), vig: .55 });
}

/** "Then silence." Wide: cloud rising beyond the sleeping-dark city. */
function silence(t: number, lt: number) {
  return cityScape(t, { sky: 'night', cam: { x: 1300, y: 520 - lt * 10, zoom: 1.05 + lt * .02 }, lit: .25, cloud: { t0: FLASH, x: 1500, sc: 150 }, stars: .3 }) + glow([1500, 400], 900, '#ff8a3b', .25) + grade({ vig: .6 });
}

function strikeMap(t: number) {
  const F = fictionalWorld(7), P = (p: V2): V2 => [960 + p[0] * 1000, 580 + p[1] * 640];
  let s = `<rect width="${W}" height="${H}" fill="#08121e"/><path d="M${F.blocA.map(p => P(p).map(n).join(' ')).join('L')}Z" fill="#24384a" stroke="#4a6a8a" stroke-width="4"/><path d="M${F.blocB.map(p => P(p).map(n).join(' ')).join('L')}Z" fill="#3a2a2a" stroke="#8a5a4a" stroke-width="4"/>`;
  const marks: [number, number, 'base' | 'cmd' | 'city', number][] = [];
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1, kind = (['base', 'cmd', 'city'] as const)[i % 3];
    marks.push([side * (.18 + hash(i * 3) * .5), -.22 + hash(i * 7) * .45, kind, S[51] + (kind === 'base' ? .2 : kind === 'cmd' ? 1.1 : 2.2) + hash(i) * .5]);
  }
  for (const [x, y, kind, t0] of marks) {
    const p = P([x, y]), d = t - t0; if (d < 0) continue;
    const k = outBack(range(d, 0, .25)), ring = (d * 80) % 120;
    s += glow(p, 70, '#ff7a3b', .5 * Math.exp(-d * .6)) + `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(ring)}" fill="none" stroke="#ffb347" stroke-width="3" opacity="${n(1 - ring / 120)}"/>`;
    const g = kind === 'base' ? `<path d="M0 -16 L16 12 L-16 12Z"/>` : kind === 'cmd' ? `<rect x="-13" y="-13" width="26" height="26"/>` : `<circle r="14"/>`;
    s += `<g transform="translate(${n(p[0])} ${n(p[1])}) scale(${n(k)})" fill="${COL.alert}" stroke="#fff" stroke-width="3">${g}</g>`;
  }
  const leg: [string, string, number][] = [['MILITARY BASES', 'base', S[51] + .1], ['COMMAND CENTRES', 'cmd', S[51] + 1.0], ['MAJOR CITIES', 'city', S[51] + 2.1]];
  leg.forEach(([l, kind, t0], i) => { const k = outCubic(range(t, t0, t0 + .3)); s += `<g transform="translate(${n(90 - (1 - k) * 60)} ${880 + i * 56})" opacity="${n(k)}"><g fill="${COL.alert}" stroke="#fff" stroke-width="3">${kind === 'base' ? '<path d="M0 -14 L14 10 L-14 10Z"/>' : kind === 'cmd' ? '<rect x="-11" y="-11" width="22" height="22"/>' : '<circle r="12"/>'}</g>${txt(30, 10, l, 30, { weight: 800 })}</g>`; });
  return s + badge('fiction', 90, 80, 1) + grade({ vig: .5 });
}

function departures(t: number) {
  let s = `<defs>${lin('apw', [[0, '#1d2433'], [1, '#0e121b']])}</defs><rect width="${W}" height="${H}" fill="url(#apw)"/>`;
  s += `<rect x="120" y="90" width="1680" height="640" rx="14" fill="#0a0c10" stroke="#2a303c" stroke-width="10"/>` + txt(170, 160, 'DEPARTURES', 48, { fill: '#ffcf3b', ls: 6 });
  const rows = ['LONDON', 'TOKYO', 'NEW YORK', 'DUBAI', 'SYDNEY', 'PARIS', 'SINGAPORE', 'TORONTO'];
  rows.forEach((c, i) => {
    const y = 230 + i * 60, flipT = S[53] + .3 + i * .12, flipping = t > flipT && t < flipT + .3, done = t >= flipT + .3;
    s += `<rect x="160" y="${y - 38}" width="1600" height="52" fill="#121519"/>` + txt(180, y, `FF${100 + i * 37}`, 34, { fill: '#e8e8e8', weight: 700, font: 'Inter, monospace' }) + txt(420, y, c, 34, { fill: '#e8e8e8', weight: 700 });
    const status = done ? 'GROUNDED' : 'ON TIME';
    if (flipping) s += `<rect x="1360" y="${y - 38}" width="380" height="${n(52 * Math.abs(Math.cos((t - flipT) * 20)))}" fill="#2a2f38"/>`;
    else s += txt(1380, y, status, 34, { fill: done ? '#ff4b3a' : '#4bd38a', weight: 900 });
  });
  // crowd silhouettes looking up at the board
  for (let i = 0; i < 12; i++) {
    const r = stickman({ ...STAND, back: 1, headTilt: (hash(i) - .5) * .2, handA: [-.5, -1.62], handB: i % 3 === 0 && t > S[53] + 1 ? [.25, -3.4] : [.5, -1.62], bendB: 2 }, { outfit: 'jacket', color: ['#3f6d48', '#2a3550', '#6a4a8a', '#8a6a3a'][i % 4], pants: '#26272e', hat: i % 4 === 2 ? 'cap' : undefined }, { id: 'cr' + i, t, seed: 50 + i, face: EXPR.neutral });
    s += place(r.svg, 60 + i * 165 + hash(i) * 60, i % 2 ? 1300 : 1230, i % 2 ? 150 : 118 + hash(i + 3) * 14);
  }
  return s + kinetic(t, [[S[53] + 1.4, 'ALL'], [S[53] + 1.6, 'FLIGHTS'], [S[53] + 1.85, 'GROUNDED']], 960, 800, 60, { anchor: 'middle', accent: ['GROUNDED'] }) + glow([960, 400], 900, '#ffcf3b', .08) + grade({ vig: .5 });
}

function highway(t: number, lt: number) {
  let s = `<defs>${lin('hws', [[0, '#0a0f1e'], [1, '#2a2440']])}</defs><rect width="${W}" height="${H}" fill="url(#hws)"/>`;
  s += `<path d="M0 520 L1920 470 L1920 1080 L0 1080Z" fill="#0b0d14"/>`;
  // bridge deck with three lanes of near-stationary traffic receding to a vanishing point
  for (let lane = 0; lane < 4; lane++) for (let i = 0; i < 40; i++) {
    const z = i / 40, crawl = (lt * (lane === 3 ? .02 : .006)) % (1 / 40);
    const zz = z + crawl, x = mix(-200 + lane * 260, 900 + lane * 40, zz), y = mix(1080 - lane * 20, 520, zz), sc = mix(1.6, .12, zz);
    const tail = lane < 2;
    s += `<rect x="${n(x - 60 * sc)}" y="${n(y - 30 * sc)}" width="${n(120 * sc)}" height="${n(46 * sc)}" rx="${n(10 * sc)}" fill="#1c2030"/>`;
    s += `<circle cx="${n(x - 44 * sc)}" cy="${n(y - 6 * sc)}" r="${n(7 * sc + 1)}" fill="${tail ? '#ff2b2b' : '#fff1c4'}"/><circle cx="${n(x + 44 * sc)}" cy="${n(y - 6 * sc)}" r="${n(7 * sc + 1)}" fill="${tail ? '#ff2b2b' : '#fff1c4'}"/>`;
    if (i % 3 === 0) s += glow([x, y], 60 * sc + 6, tail ? '#ff2b2b' : '#fff1c4', .35);
  }
  s += `<g transform="translate(1500 300)"><rect x="-210" y="-70" width="420" height="140" rx="10" fill="#1b5e3a" stroke="#f4f1ea" stroke-width="6"/>${txt(0, -10, 'EVACUATION', 46, { anchor: 'middle' })}${txt(0, 46, 'ROUTE →', 46, { anchor: 'middle' })}</g><path d="M1500 370 V600" stroke="#555" stroke-width="16"/>`;
  return s + kinetic(t, [[S[54] + .9, 'MILLIONS'], [S[54] + 1.4, 'TRY'], [S[54] + 1.6, 'TO'], [S[54] + 1.75, 'LEAVE']], 960, 180, 56, { anchor: 'middle' }) + grade({ vig: .6 });
}

function crews(t: number, lt: number) {
  let s = `<defs>${lin('crs', [[0, '#0b1020'], [1, '#1d2236']])}</defs><rect width="${W}" height="${H}" fill="url(#crs)"/>`;
  const off = (lt * 900) % 600;
  for (let x = -600; x < 2600; x += 300) s += `<rect x="${n(x - off * .4)}" y="${n(300 + hash(x) * 120)}" width="260" height="600" fill="#141a2c"/>`;
  s += `<rect y="760" width="${W}" height="320" fill="#151821"/>`;
  for (let x = -600; x < 2600; x += 240) s += `<rect x="${n(x - off)}" y="900" width="120" height="14" fill="#f4f1ea" opacity=".7"/>`;
  for (let i = 0; i < 6; i++) s += `<path d="M${n(-200 + i * 380 - off * 1.4)} 780 h180" stroke="#cfe3ff" stroke-width="3" opacity=".25"/>`;
  // fire engine + ambulance (camera tracks with them)
  const bob = Math.sin(t * 18) * 3;
  s += `<g transform="translate(560 ${n(800 + bob)})"><rect x="-300" y="-150" width="560" height="150" rx="16" fill="#c8282d" stroke="#111" stroke-width="7"/><rect x="160" y="-200" width="160" height="200" rx="16" fill="#c8282d" stroke="#111" stroke-width="7"/><rect x="190" y="-180" width="100" height="70" fill="#9fd0ff" stroke="#111" stroke-width="5"/><path d="M-280 -170 H140" stroke="#ccc" stroke-width="14"/>${[-200, 30, 230].map(x => `<circle cx="${x}" cy="0" r="48" fill="#1a1a1a" stroke="#111" stroke-width="6"/><circle cx="${x}" cy="0" r="18" fill="#888"/>`).join('')}</g>`;
  s += `<g transform="translate(1340 ${n(800 - bob)})"><rect x="-240" y="-200" width="420" height="200" rx="18" fill="#f4f1ea" stroke="#111" stroke-width="7"/><rect x="180" y="-150" width="120" height="150" rx="16" fill="#f4f1ea" stroke="#111" stroke-width="7"/><path d="M-60 -130 h60 v-40 h40 v40 h60 v40 h-60 v40 h-40 v-40 h-60Z" fill="#c8282d"/><rect x="-240" y="-60" width="540" height="20" fill="#c8282d"/>${[-150, 210].map(x => `<circle cx="${x}" cy="0" r="46" fill="#1a1a1a" stroke="#111" stroke-width="6"/><circle cx="${x}" cy="0" r="17" fill="#888"/>`).join('')}</g>`;
  s += beacon([560, 590], t, '#ff2b2b', 420, 9) + beacon([1340, 590], t + .3, '#2b6bff', 420, 9) + beacon([800, 620], t + .6, '#ff2b2b', 300, 9);
  return s + grade({ vig: .55 });
}

function dispatch(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#0b1018"/><rect x="900" y="120" width="900" height="560" rx="12" fill="#06090f" stroke="#2a3446" stroke-width="8"/>`;
  s += txt(950, 200, 'CALLS WAITING', 44, { fill: '#ff6b5b' }) + txt(1750, 200, String(Math.floor(380 + lt * lt * 640 + lt * 300)), 64, { anchor: 'end', fill: '#ff4b3a' });
  for (let i = 0; i < 6; i++) s += `<rect x="950" y="${250 + i * 66}" width="800" height="50" fill="${Math.sin(t * 9 + i) > 0 ? '#3a0f0f' : '#1a0a0a'}"/>` + txt(970, 285 + i * 66, `LINE ${String(i + 1).padStart(2, '0')}  · HOLDING`, 28, { fill: '#ff9a8a', weight: 700 });
  s += txt(950, 660, 'UNITS AVAILABLE: 0', 34, { fill: '#ffcf3b' });
  const p: Pose = { ...STAND, turn: .35, crouch: .35, lean: .08, handA: [.6, -1.8], handB: [-.05, -3.55], bendB: 2, shapeB: 'open', headTilt: .12 };
  const r = stickman(p, { outfit: 'hoodie', color: '#2f6fd1', pants: '#151515', hat: 'headset' }, { id: 'dp', t, seed: 31, face: { ...expr('tired', 'worried', .5), gx: .7, gy: -.2, sweat: 1 } });
  s += place(r.svg, 520, 1180, 180) + `<rect y="830" width="${W}" height="260" fill="#1a2230" stroke="#111" stroke-width="6"/>`;
  return s + glow([1350, 400], 800, '#ff3b30', .15) + grade({ vig: .6 });
}

function firstHour(t: number, lt: number) {
  let s = cityScape(t, { sky: 'dusk', cam: { x: 960, y: 560, zoom: 1.1 }, lit: .08, fires: [{ x: 300, y: 760, s: .8 }, { x: 1250, y: 740, s: 1.1 }, { x: 1700, y: 770, s: .7 }], haze: .2 });
  const k = clamp(lt / 1.8);
  s += `<g transform="translate(960 470)"><circle r="190" fill="#0b0f16" fill-opacity=".8" stroke="#f4f1ea" stroke-width="8"/>`;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s += `<path d="M${n(Math.sin(a) * 160)} ${n(-Math.cos(a) * 160)} L${n(Math.sin(a) * 175)} ${n(-Math.cos(a) * 175)}" stroke="#f4f1ea" stroke-width="6"/>`; }
  s += `<path d="M0 0 A170 170 0 ${k > .5 ? 1 : 0} 1 ${n(Math.sin(k * Math.PI * 2) * 170)} ${n(-Math.cos(k * Math.PI * 2) * 170)} L0 0Z" fill="${COL.alert}" opacity=".35"/>`;
  s += `<path d="M0 0 L${n(Math.sin(k * Math.PI * 2) * 150)} ${n(-Math.cos(k * Math.PI * 2) * 150)}" stroke="#ff4b3a" stroke-width="8" stroke-linecap="round"/><circle r="12" fill="#f4f1ea"/></g>`;
  return s + kinetic(t, [[S[57] + .6, 'THE'], [S[57] + .8, 'FIRST'], [S[57] + 1.1, 'HOUR']], 960, 790, 72, { anchor: 'middle', accent: ['HOUR'] }) + grade({ vig: .55 });
}

export const CH4: Shot[] = [
  { a: at(46), tr: 'black', r: (t, lt) => card1945(t, lt) },
  { a: at(47), r: t => balcony(t) },
  { a: at(49), r: (t, lt) => silence(t, lt) },
  { a: at(50), r: t => balcony(t) },
  { a: at(51), r: t => strikeMap(t) },
  { a: at(52), r: (t, lt) => cityScape(t, { sky: 'night', cam: { x: 960, y: 640 - lt * 20, zoom: 1.2 }, lit: .55, blackout: { t0: S[52] + 1.6, dur: 1.6 }, stars: .8 }) + kinetic(t, [[S[52] + 1.7, 'REGIONS'], [S[52] + 2.1, 'GO'], [S[52] + 2.3, 'DARK']], 960, 180, 64, { anchor: 'middle', hold: .6 }) + grade({ vig: .55 }) },
  { a: at(53), r: t => departures(t) },
  { a: at(54), r: (t, lt) => highway(t, lt) },
  { a: at(55), r: (t, lt) => crews(t, lt) },
  { a: at(56), r: (t, lt) => dispatch(t, lt) },
  { a: at(57), r: (t, lt) => firstHour(t, lt) },
];
