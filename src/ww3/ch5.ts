// Chapter 5 — The System Fails (2:19–3:06). Infographic-led: one failure triggers another.
import { expr } from "../ff2d/face.ts";
import { screenGlass } from '../ff2d/fx.ts';
import { equirect, flatLand, globeLand, LAND, ortho } from '../ff2d/geo.ts';
import { clamp, hash, inOut, mix, outBack, outCubic, range, type V2 } from '../ff2d/motion.ts';
import { HERO, type Pose, STAND, stickman } from '../ff2d/rig.ts';
import { glow, grade, H, lin, place, txt, W } from '../ff2d/stage.ts';
import { badge, chapterTitle, COL, kinetic, subscribeChip } from '../ff2d/ui.ts';
import { infoBg } from './ch2.ts';
import { at, type Shot } from './shot.ts';
import { S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);

/** Candle-lit kitchen after the power fails. mode: 'dead' (looks at phone, then to camera) | 'cta' (taps subscribe). */
function kitchen(t: number, lt: number, mode: 'dead' | 'cta') {
  const fl = .85 + .15 * Math.sin(t * 17) * Math.sin(t * 5.3);
  let s = `<defs>${lin('kw', [[0, '#1d1a22'], [1, '#100e14']])}</defs><rect width="${W}" height="${H}" fill="url(#kw)"/>`;
  s += `<rect x="1180" y="140" width="420" height="380" fill="#0a0d18" stroke="#2a2a34" stroke-width="14"/><path d="M1390 140 V520 M1180 330 H1600" stroke="#2a2a34" stroke-width="10"/>`;
  for (let i = 0; i < 12; i++) { const y = 360 + hash(i) * 110; s += `<rect x="${1190 + i * 34}" y="${n(y)}" width="30" height="${n(512 - y)}" fill="#121624"/>`; }
  s += `<path d="M1390 140 V520 M1180 330 H1600" stroke="#2a2a34" stroke-width="10"/>`;
  s += `<rect x="120" y="180" width="300" height="660" rx="16" fill="#2a2a30" stroke="#111" stroke-width="7"/><path d="M120 420 H420 M380 260 V380 M380 460 V640" stroke="#111" stroke-width="7"/>`;
  s += `<rect x="460" y="300" width="560" height="180" fill="#2a221c" stroke="#111" stroke-width="6"/><path d="M740 300 V480" stroke="#111" stroke-width="5"/>`;
  s += `<rect y="840" width="${W}" height="240" fill="#1a1514"/><rect x="560" y="700" width="900" height="40" rx="6" fill="#4a3324" stroke="#111" stroke-width="6"/><path d="M620 740 V880 M1400 740 V880" stroke="#3a2618" stroke-width="22"/>`;
  // candle on the table
  s += `<rect x="1180" y="620" width="40" height="80" fill="#efe6cf" stroke="#111" stroke-width="4"/><path d="M1200 ${n(560 + Math.sin(t * 13) * 3)} q16 30 0 58 q-16 -28 0 -58Z" fill="#ffcf5a" stroke="#ff8a3b" stroke-width="3"/>`;
  // hero standing behind the table with a dead phone
  const toCam = mode === 'dead' ? outBack(range(t, S[59] - .15, S[59] + .35)) : 1;
  const tap = mode === 'cta' ? range(t, S[61] + .05, S[61] + .45) : 0;
  const reachK = mode === 'cta' ? inOut(range(t, S[61] - .35, S[61] + .05)) * (1 - range(t, S[61] + .7, S[61] + 1.1)) : 0;
  const p: Pose = { ...STAND, turn: mix(.35, 0, toCam), headTurn: mix(.1, 0, toCam), lean: .02,
    handA: [mix(.15, -.45, toCam), mix(-2.35, -1.7, toCam)], handB: reachK > 0 ? [mix(.45, 2.25, reachK), mix(-2.4, -2.95, reachK)] : [mix(.45, .5, toCam), mix(-2.4, -1.7, toCam)],
    shapeA: toCam < .5 ? 'hold' : 'fist', shapeB: reachK > .3 ? 'point' : 'fist', bendA: 2, bendB: reachK > 0 ? -1 : 2, frontB: 1 };
  const face = mode === 'dead' ? (toCam < .2 ? { ...expr('worried', 'confused', range(lt, .4, 1)), gx: .2, gy: .7 } : { ...expr('worried', 'determined', .2), gx: 0, gy: 0 }) : { ...expr('determined', 'smug', range(t, S[61] + .5, S[61] + 1)), gx: reachK > .2 ? .9 : 0 };
  const r = stickman(p, HERO, { id: 'kh', t, seed: 3, face });
  s += place(r.svg, 860, 900, 160);
  s += `<rect x="560" y="700" width="900" height="40" rx="6" fill="#4a3324" stroke="#111" stroke-width="6"/><path d="M620 740 V880 M1400 740 V880" stroke="#3a2618" stroke-width="22"/>`;
  if (toCam < .5) { const h = r.j.handA; s += `<rect x="${n(860 + h[0] * 160 - 18)}" y="${n(900 + h[1] * 160 - 64)}" width="36" height="64" rx="6" fill="#1d1f26" stroke="#111" stroke-width="3"/>` + txt(860 + h[0] * 160, 900 + h[1] * 160 - 74, 'NO SIGNAL', 18, { anchor: 'middle', fill: '#ff8a7a', weight: 800 }); }
  const cam = mode === 'dead' ? 1.0 + lt * .03 + toCam * .12 : 1.12;
  let out = `<g transform="translate(900 560) scale(${n(cam)}) translate(-900 -560)">${s}${glow([1200, 580], 520 * fl, '#ffb35c', .55 * fl)}${glow([1200, 590], 120, '#fff1c4', .5)}</g>`;
  out += `<rect width="${W}" height="${H}" fill="#6d5a7a" opacity=".35" style="mix-blend-mode:multiply"/>`;
  if (mode === 'cta') out += subscribeChip(t - S[60] + .2, 1560, 540, tap > 0 ? 1 + (t - S[61] - .45) : tap, S[61] + 1.6 - S[60]);
  if (mode === 'dead') out += chapterTitle(lt, 5, 'The System Fails', 2.2);
  return out + grade({ vig: .7 });
}

function marketCrash(t: number, lt: number) {
  let s = infoBg(t, '#14080a', '#3a1218');
  const pts: string[] = [];
  for (let i = 0; i <= 100; i++) {
    const u = i / 100, tu = u * 2.4; if (tu > lt + .2) break;
    const v = .25 + Math.sin(u * 40) * .01 + outCubic(range(tu, .8, 1.4)) * .6;
    pts.push(`${n(200 + u * 1500)} ${n(160 + v * 640)}`);
  }
  s += `<path d="M${pts.join('L')}" stroke="${COL.alert}" stroke-width="10" fill="none" stroke-linejoin="round"/>`;
  s += txt(210, 140, 'WORLD MARKETS', 40, { fill: '#e8c8c8', ls: 4 });
  const st = outBack(range(t, S[62] + 1.9, S[62] + 2.2), 2.5);
  if (st > 0) s += `<g transform="translate(1180 520) rotate(-8) scale(${n(st)})"><rect x="-420" y="-90" width="840" height="180" rx="12" fill="#14080a" fill-opacity=".85" stroke="${COL.alert}" stroke-width="12"/>${txt(0, 34, 'TRADING HALTED', 96, { anchor: 'middle', fill: COL.alert, ls: 4 })}</g>`;
  return s + grade({ vig: .5 });
}

function atm(t: number) {
  let s = `<rect width="${W}" height="${H}" fill="#14161c"/><rect x="460" y="80" width="1000" height="1000" rx="30" fill="#3a3f4a" stroke="#111" stroke-width="10"/>`;
  s += `<rect x="560" y="180" width="800" height="460" rx="12" fill="#0b1626" stroke="#111" stroke-width="8"/>`;
  const sus = range(t, S[63] + .2, S[63] + .3);
  s += txt(960, 300, sus > 0 ? 'SERVICE UNAVAILABLE' : 'PLEASE WAIT…', 52, { anchor: 'middle', fill: sus > 0 ? '#ff6b5b' : '#7fd3ff' });
  if (sus > 0) s += txt(960, 390, 'Withdrawals temporarily suspended', 34, { anchor: 'middle', weight: 600, fill: '#c9d2e0' }) + `<circle cx="960" cy="520" r="60" fill="none" stroke="#ff6b5b" stroke-width="10"/><path d="M920 480 L1000 560 M1000 480 L920 560" stroke="#ff6b5b" stroke-width="10"/>`;
  s += screenGlass(560, 180, 800, 460, t, .2) + `<rect x="680" y="720" width="560" height="40" rx="8" fill="#111"/><rect x="760" y="820" width="400" height="200" rx="10" fill="#2a2e36" stroke="#111" stroke-width="6"/>`;
  return s + glow([960, 400], 700, sus > 0 ? '#ff3b30' : '#3a8dff', .25) + grade({ vig: .6 });
}

function cardDeclined(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#1c1a18"/><rect y="760" width="${W}" height="320" fill="#5a4030"/>`;
  s += `<g transform="translate(960 560) rotate(-6)"><rect x="-220" y="-380" width="440" height="700" rx="40" fill="#2a2e36" stroke="#111" stroke-width="10"/><rect x="-180" y="-330" width="360" height="300" rx="14" fill="#0b1018"/>`;
  const dec = range(t, S[64] + 1.0, S[64] + 1.05);
  s += txt(0, -200, dec > 0 ? 'DECLINED' : 'PROCESSING', 54, { anchor: 'middle', fill: dec > 0 ? '#ff4b3a' : '#7fd3ff' }) + txt(0, -130, dec > 0 ? 'NETWORK OFFLINE' : '· · ·', 30, { anchor: 'middle', weight: 700, fill: '#c9d2e0' });
  for (let i = 0; i < 12; i++) s += `<rect x="${-150 + (i % 3) * 110}" y="${30 + Math.floor(i / 3) * 70}" width="90" height="54" rx="10" fill="#3a3f4a" stroke="#111" stroke-width="4"/>`;
  s += `</g>`;
  // card held by a mitten hand, enters, taps
  const k = outCubic(range(lt, .1, .6)), tapK = Math.sin(clamp(range(lt, .7, 1.0)) * Math.PI);
  s += `<g transform="translate(${n(1500 - k * 420)} ${n(380 + tapK * 40)}) rotate(-20)"><rect x="-150" y="-95" width="300" height="190" rx="18" fill="#2f6fd1" stroke="#111" stroke-width="7"/><rect x="-120" y="-50" width="70" height="50" rx="8" fill="#e3c66a"/><path d="M60 40 h70" stroke="#fff" stroke-width="10"/><circle cx="170" cy="40" r="70" fill="#fff" stroke="#111" stroke-width="8"/><path d="M230 80 L600 300" stroke="#111" stroke-width="110" stroke-linecap="round"/><path d="M230 80 L600 300" stroke="#d8262b" stroke-width="88" stroke-linecap="round"/></g>`;
  return s + glow([960, 360], 600, dec > 0 ? '#ff3b30' : '#3a8dff', .2) + grade({ vig: .6 });
}

function netGlobe(t: number) {
  const g = ortho([960, 560], 360, 10 + t * 4, 20);
  let s = infoBg(t) + `<circle cx="960" cy="560" r="360" fill="#0f2c48"/>` + globeLand(g, '#1f4a6a', '#0b2236', 2);
  const hubs: V2[] = [[-74, 40], [0, 51], [139, 35], [103, 1], [-46, -23], [28, -26], [77, 19], [151, -33], [-122, 37], [55, 25]];
  let k = 0;
  for (let i = 0; i < hubs.length; i++) for (let j = i + 1; j < hubs.length; j += 3) {
    const a = g(hubs[i]), b = g(hubs[j]); k++;
    if (a[2] < 0 || b[2] < 0) continue;
    const dead = t > S[65] + .4 + hash(k) * 2.2;
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 80;
    s += `<path d="M${n(a[0])} ${n(a[1])} Q${n(mx)} ${n(my)} ${n(b[0])} ${n(b[1])}" stroke="${dead ? '#ff4b3a' : '#7fd3ff'}" stroke-width="3" fill="none" opacity="${dead ? .25 : .8}" stroke-dasharray="${dead ? '6 10' : '0'}"/>`;
    if (!dead) { const u = (t * .5 + hash(k)) % 1; s += `<circle cx="${n((1 - u) ** 2 * a[0] + 2 * (1 - u) * u * mx + u * u * b[0])}" cy="${n((1 - u) ** 2 * a[1] + 2 * (1 - u) * u * my + u * u * b[1])}" r="5" fill="#fff"/>`; }
  }
  s += `<g transform="translate(1560 860) rotate(${n(t * 300)})"><circle r="40" fill="none" stroke="#7fd3ff" stroke-width="8" stroke-dasharray="60 200"/></g>` + txt(1560, 950, 'CONNECTING…', 28, { anchor: 'middle', fill: '#7fd3ff' });
  return s + grade({ vig: .5 });
}

/** Domino chain: each tile has an icon + label; falls at its time; camera tracks. */
type Tile = { label: string; icon: string; t: number };
const ICON: Record<string, string> = {
  ship: '<path d="M-40 10 L40 10 L28 30 L-28 30Z M-20 -10 h30 v20 h-30Z M0 -30 v20" fill="#fff" stroke="#111" stroke-width="4"/>',
  port: '<path d="M-30 30 V-30 H30 M10 -30 V0 M-30 -10 H20" stroke="#fff" stroke-width="7" fill="none"/>',
  factory: '<path d="M-40 30 V-5 L-15 10 V-5 L10 10 V-30 H30 V30Z" fill="#fff" stroke="#111" stroke-width="4"/>',
  fuel: '<rect x="-24" y="-30" width="40" height="60" rx="6" fill="#fff" stroke="#111" stroke-width="4"/><path d="M16 -14 h14 v34" stroke="#fff" stroke-width="6" fill="none"/>',
  truck: '<rect x="-40" y="-20" width="50" height="34" fill="#fff" stroke="#111" stroke-width="4"/><path d="M10 -6 h20 l10 12 v8 h-30Z" fill="#fff" stroke="#111" stroke-width="4"/><circle cx="-24" cy="20" r="8" fill="#111"/><circle cx="24" cy="20" r="8" fill="#111"/>',
  food: '<circle r="26" fill="#fff" stroke="#111" stroke-width="4"/><path d="M-10 -26 q10 -14 22 -6" stroke="#fff" stroke-width="6" fill="none"/>',
  med: '<rect x="-30" y="-30" width="60" height="60" rx="10" fill="#fff" stroke="#111" stroke-width="4"/><path d="M0 -18 V18 M-18 0 H18" stroke="#c8282d" stroke-width="9"/>',
  hospital: '<rect x="-34" y="-30" width="68" height="60" fill="#fff" stroke="#111" stroke-width="4"/><path d="M0 -20 V8 M-14 -6 H14" stroke="#c8282d" stroke-width="8"/>',
  shop: '<path d="M-36 -8 L36 -8 L30 30 L-30 30Z M-24 -8 L-14 -30 M24 -8 L14 -30" fill="#fff" stroke="#111" stroke-width="4"/>',
};
function dominoes(t: number, tiles: Tile[], camFrom: number, camTo: number, k: number, zoom = 1) {
  const gap = 260, base = 820;
  let s = `<defs>${lin('dbg', [[0, '#101826'], [1, '#070b12']])}</defs><rect width="${W}" height="${H}" fill="url(#dbg)"/>`;
  const camX = mix(camFrom, camTo, k);
  s += `<g transform="translate(960 560) scale(${zoom}) translate(${n(-camX)} -560)">`;
  s += `<rect x="-2000" y="${base}" width="${tiles.length * gap + 4000}" height="400" fill="#0b1018"/><path d="M-2000 ${base} H${tiles.length * gap + 2000}" stroke="#2a3446" stroke-width="4"/>`;
  tiles.forEach((tl, i) => {
    const x = i * gap, fall = clamp((t - tl.t) / .42), ang = 72 * (fall * fall) + (fall >= 1 ? Math.sin(Math.min(1, (t - tl.t - .42) * 3) * Math.PI) * 3 * Math.exp(-(t - tl.t - .42) * 4) : 0);
    const hot = fall > 0;
    s += `<g transform="translate(${x + 50} ${base}) rotate(${n(ang)})"><rect x="-100" y="-380" width="100" height="380" rx="14" fill="${hot ? '#3a1a1c' : '#e9eef5'}" stroke="#111" stroke-width="7"/><g transform="translate(-50 -250) scale(1.1)">${hot ? ICON[tl.icon].replace(/#fff/g, '#ff8a7a') : ICON[tl.icon].replace(/#fff/g, '#2a3446')}</g></g>`;
    s += txt(x, base + 70, tl.label, 32, { anchor: 'middle', fill: hot ? '#ff8a7a' : '#c9d2e0', weight: 900, op: .95 });
    if (hot && t - tl.t < .7) s += glow([x + 50, base - 40], 120, '#ff3b30', .5 * (1 - (t - tl.t) / .7));
  });
  return s + '</g>' + grade({ vig: .55 });
}

function shelves(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#e8ecef"/><rect y="880" width="${W}" height="200" fill="#c9cdd1"/>`;
  const empty = range(t, S[69] + .3, S[69] + 1.8);
  for (let row = 0; row < 3; row++) for (let sh = 0; sh < 4; sh++) {
    const x0 = 120 + row * 590, y = 200 + sh * 170;
    s += `<rect x="${x0}" y="${y + 120}" width="520" height="16" fill="#8a9097" stroke="#111" stroke-width="3"/>`;
    for (let i = 0; i < 9; i++) {
      const gone = hash(row * 40 + sh * 9 + i) < empty * 1.1 - .05;
      if (gone) continue;
      const c = ['#d03a3a', '#e3a02a', '#3a8a5a', '#2f6fd1', '#8a3ad0', '#f4f1ea'][(row + sh + i) % 6];
      s += `<rect x="${x0 + 10 + i * 56}" y="${y + 40 + (i % 2) * 10}" width="46" height="${80 - (i % 2) * 10}" rx="6" fill="${c}" stroke="#111" stroke-width="3"/>`;
    }
  }
  // stock-days counter
  const d = Math.max(0, 3 - Math.floor(range(t, S[68] + 1.0, S[68] + 3.6) * 3));
  s += `<g transform="translate(1600 110)"><rect x="-200" y="-60" width="400" height="120" rx="16" fill="#0b0f16"/>${txt(0, 22, `${d} DAYS LEFT`, 52, { anchor: 'middle', fill: d < 2 ? COL.alert : '#ffcf3b' })}</g>`;
  // shoppers grabbing
  for (let k = 0; k < 5; k++) {
    const dist = (lt * 1.6 + k * 2.3) % 14, dir = k % 2 ? -1 : 1, x0 = dir > 0 ? -200 : 2100;
    const p: Pose = { ...STAND, turn: .8 * dir, handB: [dir * .5, -2.6 + Math.sin(t * 8 + k) * .2], bendB: 2, handA: [dir * .1, -1.7] };
    const r = stickman(p, { outfit: 'jacket', color: ['#3f6d48', '#2a3550', '#6a4a8a', '#8a6a3a', HERO.color][k], pants: '#26272e' }, { id: 'sp' + k, t, seed: 60 + k, face: expr('worried') });
    s += place(r.svg, x0 + dist * 160 * dir, 1060, 130);
  }
  return s + kinetic(t, [[S[69] + .1, 'TRUCKS'], [S[69] + .4, 'STOP']], 960, 120, 64, { anchor: 'middle', accent: ['STOP'], hold: 1.2 }) + grade({ tint: '#d8dce6', tintA: .15 + empty * .3, vig: .35 });
}

function unevenWorld(t: number) {
  const pr = equirect(1600, 800, 160, 140);
  let s = infoBg(t) + flatLand(pr, '#1f3d5c', '#4a7aa8', 1.5);
  let i = 0;
  for (const [k, poly] of Object.entries(LAND)) {
    if (k === 'antarctica') continue;
    const severity = hash(i * 7.3), start = S[73] + hash(i * 3.1) * 1.4, kk = range(t, start, start + 1.4) * (.35 + severity * .65) * (t > S[75] ? 1 : .85);
    const flick = t > S[73] && t < S[74] && hash(Math.floor(t * 8) + i) > .7 ? .3 : 0;
    s += `<path d="M${poly.map(p => pr(p).map(n).join(' ')).join('L')}Z" fill="${COL.alert}" opacity="${n(clamp(kk * .7 + flick))}"/>`;
    i++;
  }
  s += kinetic(t, [[S[73], 'NOT'], [S[73] + .2, 'EVERYWHERE'], [S[73] + .6, 'AT'], [S[73] + .75, 'ONCE']], 960, 1000, 48, { anchor: 'middle', hold: .2 });
  s += kinetic(t, [[S[74], 'NOT'], [S[74] + .2, 'EQUALLY']], 960, 1000, 48, { anchor: 'middle', hold: .3 });
  s += kinetic(t, [[S[75] + .4, 'NOWHERE'], [S[75] + .8, 'UNTOUCHED']], 960, 1000, 56, { anchor: 'middle', accent: ['UNTOUCHED'], hold: 1 });
  return s + badge('fiction', 90, 80, 1) + grade({ vig: .5 });
}

const T1: Tile[] = [{ label: 'SHIPPING', icon: 'ship', t: S[66] + .5 }, { label: 'PORTS', icon: 'port', t: S[66] + 1.2 }, { label: 'PARTS', icon: 'factory', t: S[67] + .6 }, { label: 'FACTORIES', icon: 'factory', t: S[67] + 1.8 }];
const T2: Tile[] = [{ label: 'FUEL', icon: 'fuel', t: S[70] + .2 }, { label: 'TRUCKS', icon: 'truck', t: S[70] + .8 }, { label: 'FOOD', icon: 'food', t: S[71] + .7 }, { label: 'MEDICINE', icon: 'med', t: S[71] + 1.4 }, { label: 'HOSPITALS', icon: 'hospital', t: S[71] + 2.5 }];
const T3: Tile[] = [...T2, ...Array.from({ length: 10 }, (_, i) => ({ label: ['WATER', 'POWER', 'BANKS', 'SCHOOLS', 'POLICE', 'TRANSIT', 'FARMS', 'PHONES', 'HEATING', 'SHOPS'][i], icon: ['med', 'fuel', 'shop', 'hospital', 'truck', 'truck', 'food', 'port', 'fuel', 'shop'][i], t: S[72] + 1.2 + i * .24 }))];

export const CH5: Shot[] = [
  { a: at(58), tr: 'black', r: (t, lt) => kitchen(t, lt, 'dead') },
  { a: at(60), r: (t, lt) => kitchen(t, lt, 'cta') },
  { a: at(62), r: (t, lt) => marketCrash(t, lt) },
  { a: at(63), r: t => atm(t) },
  { a: at(64), r: (t, lt) => cardDeclined(t, lt) },
  { a: at(65), r: t => netGlobe(t) },
  { a: at(66), r: (t, lt, d) => dominoes(t, T1, 100, 700, inOut(lt / d)) },
  { a: at(68), r: (t, lt) => shelves(t, lt) },
  { a: at(70), r: (t, lt) => dominoes(t, S[72] - .1 > t ? T2 : T3, 200, 900, inOut(range(lt, 0, S[72] - S[70]))) },
  { a: at(72) + .6, r: (t, lt) => dominoes(t, T3, 1300, 2600, inOut(range(lt, 0, 3)), mix(.85, .45, inOut(range(lt, 0, 2.5)))) + kinetic(t, [[S[72] + 2.3, 'LIKE'], [S[72] + 2.5, 'DOMINOES']], 960, 160, 64, { anchor: 'middle', accent: ['DOMINOES'] }) },
  { a: at(73), r: t => unevenWorld(t) },
];
