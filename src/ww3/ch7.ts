// Chapter 7 — The World Starts Changing: smoke, nuclear winter, food (3:48–4:39). Real research labelled with uncertainty.
import { expr } from '../ff2d/face.ts';
import { particles, puff, rays, smokeColumn } from '../ff2d/fx.ts';
import { globeLand, ortho } from '../ff2d/geo.ts';
import { clamp, hash, inOut, mix, outBack, outCubic, range } from '../ff2d/motion.ts';
import { HERO, type Look, type Pose, STAND, stickman } from '../ff2d/rig.ts';
import { glow, grade, H, lin, place, rad, txt, W } from '../ff2d/stage.ts';
import { badge, chapterTitle, COL, kinetic } from '../ff2d/ui.ts';
import { infoBg } from './ch2.ts';
import { cityScape } from './kits/city.ts';
import { at, type Shot } from './shot.ts';
import { S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);
export const SCI: Look = { outfit: 'lab', color: '#eef2f4', pants: '#3a3f4a', glasses: true };

function firestorm(t: number, lt: number) {
  let s = infoBg(t, '#140a06', '#3a1a0c');
  s += `<rect y="820" width="${W}" height="260" fill="#2a1a12"/>`;
  for (let i = 0; i < 9; i++) { const x = 560 + i * 90, h = 120 + hash(i) * 160; s += `<rect x="${x}" y="${n(820 - h)}" width="80" height="${n(h)}" fill="#1a0f0a"/>`; }
  s += glow([960, 760], 520, '#ff7a2b', .7 + .1 * Math.sin(t * 9)) + smokeColumn([960, 640], t, { h: 600, w: 300, wind: 0, a: .9, col: '#2a2420', dark: '#120e0c', rate: .4, seed: 3 });
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) {
    const y = 760 - k * 40, x0 = 960 + sd * (820 - ((lt * 260 + k * 120) % 300));
    s += `<path d="M${n(x0)} ${y} h${sd * -140}" stroke="#7fd3ff" stroke-width="10" stroke-linecap="round" opacity=".85"/><path d="M${n(x0 - sd * 140)} ${y} l${sd * 24} -16 M${n(x0 - sd * 140)} ${y} l${sd * 24} 16" stroke="#7fd3ff" stroke-width="10" stroke-linecap="round"/>`;
  }
  s += `<path d="M960 600 V160" stroke="#ffcf3b" stroke-width="14" stroke-dasharray="30 18" stroke-dashoffset="${n(-lt * 120)}"/><path d="M930 200 L960 150 L990 200" stroke="#ffcf3b" stroke-width="14" fill="none"/>`;
  s += txt(260, 700, 'AIR RUSHES IN', 40, { fill: '#7fd3ff', op: range(lt, .8, 1.1) }) + txt(1080, 220, 'HEAT LIFTS SMOKE', 40, { fill: '#ffcf3b', op: range(lt, 1.2, 1.5) });
  return s + kinetic(t, [[S[95] + 1.0, 'FIRESTORMS']], 960, 1010, 60, { anchor: 'middle', accent: ['FIRESTORMS'] }) + badge('real', 90, 80, 1, 'How a firestorm works (simplified)') + grade({ vig: .5 });
}

function layers(t: number, lt: number) {
  let s = `<defs>${lin('atm2', [[0, '#05081a'], [.45, '#1a3a7a'], [1, '#7fb0d8']])}</defs><rect width="${W}" height="${H}" fill="url(#atm2)"/>`;
  s += `<path d="M0 520 H${W}" stroke="#fff" stroke-width="3" stroke-dasharray="20 14" opacity=".6"/>` + txt(60, 500, 'STRATOSPHERE', 34, { fill: '#cfe3ff' }) + txt(60, 600, 'WEATHER LAYER (RAIN)', 30, { fill: '#e8f2ff', op: .8 });
  for (let i = 0; i < 5; i++) s += puff(260 + i * 340, 720, 110, 20 + i, '#e8eef4', '#9aa8b8', .95, 6);
  for (let i = 0; i < 40; i++) { const x = 140 + (i * 47) % 1700, k = ((lt * 1.2 + hash(i)) % 1); s += `<path d="M${x} ${n(780 + k * 220)} l-6 18" stroke="#9fd0ff" stroke-width="3" opacity=".6"/>`; }
  s += `<rect y="1000" width="${W}" height="80" fill="#2a2018"/>` + smokeColumn([960, 1000], t, { h: 600, w: 180, wind: .1, a: .85, col: '#222', dark: '#0b0b0b', seed: 7 });
  // soot particles rising and spreading into the stratosphere above the rain
  const up = range(t, S[96] + 1, S[96] + 6);
  for (let i = 0; i < 160; i++) {
    const r = hash(i * 3.7), k = clamp(up * 1.3 - r * .3), y = mix(900, 160 + hash(i) * 300, outCubic(k)), x = 960 + (hash(i * 9) - .5) * mix(200, 1800, outCubic(k));
    if (k <= 0) continue;
    s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(5 + r * 6)}" fill="#151210" opacity=".85"/>`;
  }
  s += kinetic(t, [[S[96] + 2.2, 'MILLIONS'], [S[96] + 2.6, 'OF'], [S[96] + 2.8, 'TONNES'], [S[96] + 3.2, 'OF'], [S[96] + 3.4, 'SOOT']], 960, 120, 56, { anchor: 'middle', accent: ['SOOT'], hold: 2.5 });
  s += txt(1860, 900, 'rain washes out low smoke', 28, { anchor: 'end', fill: '#e8f2ff', op: range(t, S[96] + 6, S[96] + 6.4) }) + txt(1860, 460, '…but not soot above it', 30, { anchor: 'end', fill: '#ffcf3b', op: range(t, S[96] + 6.8, S[96] + 7.2) });
  return s + badge('real', 1340, 1030, 1, 'Robock, Toon et al. — nuclear-winter models') + grade({ vig: .45 });
}

export function sootGlobe(t: number, lt: number, veil: number, lights = 0) {
  let s = `<rect width="${W}" height="${H}" fill="#020409"/>`;
  for (let i = 0; i < 140; i++) s += `<circle cx="${n(hash(i) * W)}" cy="${n(hash(i + 60) * H)}" r="${n(.6 + hash(i + 2))}" fill="#fff" opacity=".5"/>`;
  const g = ortho([1100, 560], 400, 20 + t * 5, 25);
  s += `<defs>${rad('sg', [[0, '#2e6fb0'], [1, '#0b2a4a']], .35, .3, .8)}</defs><circle cx="1100" cy="560" r="400" fill="${lights ? '#06101e' : 'url(#sg)'}"/>` + globeLand(g, lights ? '#0f1d33' : '#3a7a52', lights ? '#16294a' : '#173a2a', 2);
  if (lights) for (let i = 0; i < 260; i++) { const p = g([-120 + hash(i * 3.3) * 260, -35 + hash(i * 7.1) * 95]); if (p[2] < .05 || hash(i * 11) > lights) continue; s += `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(1.5 + hash(i) * 2)}" fill="#ffcf7a" opacity="${n(p[2])}"/>`; }
  // soot veil bands spread from the northern mid-latitudes
  if (veil > 0) for (let b = 0; b < 7; b++) {
    const lat = 50 - b * 14, k = clamp(veil * 1.6 - b * .12);
    if (k <= 0) continue;
    const pts: string[] = [];
    for (let lon = -180; lon <= 180; lon += 6) { const p = g([lon, lat + Math.sin(lon * .05 + t) * 3]); if (p[2] > 0) pts.push(`${n(p[0])} ${n(p[1])}`); }
    if (pts.length > 2) s += `<path d="M${pts.join('L')}" stroke="#1a1410" stroke-width="${n(60 * k)}" fill="none" stroke-linecap="round" opacity="${n(.55 * k)}"/>`;
  }
  s += `<circle cx="1100" cy="560" r="400" fill="#140f0c" opacity="${n(veil * .45)}"/>`;
  // sunlight arrows from the left, blocked by the veil
  if (!lights) for (let i = 0; i < 5; i++) { const y = 300 + i * 120, len = mix(560, 260, veil); s += `<path d="M80 ${y} h${n(len)}" stroke="#ffd25a" stroke-width="10" stroke-linecap="round" opacity="${n(1 - veil * .5)}"/><path d="M${n(80 + len)} ${y - 18} l26 18 l-26 18" stroke="#ffd25a" stroke-width="10" fill="none" opacity="${n(1 - veil * .5)}"/>`; }
  return s;
}

function climateCharts(t: number) {
  let s = infoBg(t);
  const charts: [number, string, string][] = [[S[98], 'SUMMER TEMPERATURE', '#ff8a5a'], [S[99], 'RAINFALL', '#7fd3ff'], [S[100], 'GROWING SEASON', '#8ad35a']];
  charts.forEach(([t0, label, c], i) => {
    const k = outCubic(range(t, t0 - .1, t0 + .3)), x = 120 + i * 580;
    if (k <= 0) return;
    s += `<g transform="translate(${x} ${n(220 + (1 - k) * 60)})" opacity="${n(k)}"><rect width="520" height="560" rx="20" fill="#0b1626" stroke="${c}" stroke-width="4"/>${txt(260, 70, label, 32, { anchor: 'middle', fill: c })}`;
    const dk = outCubic(range(t, t0 + .2, t0 + 1.2));
    if (i < 2) { let d = 'M40 300'; for (let u = 0; u <= 1; u += .05) d += ` L${n(40 + u * 440)} ${n(300 + Math.sin(u * 12) * 14 + (u > .4 ? (u - .4) * dk * 340 * (i === 0 ? 1 : .6) : 0) * (i === 1 ? Math.sin(u * 20) : 1))}`; s += `<path d="${d}" stroke="${c}" stroke-width="8" fill="none"/>`; }
    else s += `<rect x="60" y="250" width="${n(400 * (1 - .45 * dk))}" height="90" rx="12" fill="${c}"/><rect x="60" y="250" width="400" height="90" rx="12" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="12 8"/>`;
    s += txt(260, 500, i === 0 ? 'COLDER' : i === 1 ? 'DISRUPTED' : 'SHORTER', 44, { anchor: 'middle', op: dk }) + `</g>`;
  });
  return s + txt(960, 900, 'Model illustration — severity depends on how much smoke reaches the stratosphere', 28, { anchor: 'middle', weight: 600, fill: '#c9d2e0' }) + grade({ vig: .45 });
}

function winterField(t: number, lt: number) {
  let s = `<defs>${lin('wf', [[0, '#5a5e66'], [1, '#8a8a84']])}</defs><rect width="${W}" height="${H}" fill="url(#wf)"/>`;
  s += `<circle cx="1400" cy="230" r="70" fill="#c9c6b8" opacity=".55"/>` + rays([1400, 230], t, '#d8d4c4', .05, 6, 900, 1.2, Math.PI * .6);
  s += `<rect y="720" width="${W}" height="360" fill="#6a6450"/>`;
  for (let i = 0; i < 120; i++) { const x = (i * 37) % W + hash(i) * 20, y = 740 + hash(i * 3) * 320, sw = Math.sin(t * 1.5 + i) * 6; s += `<path d="M${n(x)} ${n(y)} q${n(sw)} -40 ${n(sw * 1.5)} -70" stroke="#8a7a4a" stroke-width="4" fill="none"/><ellipse cx="${n(x + sw * 1.5)}" cy="${n(y - 74)}" rx="5" ry="12" fill="#9a8a5a"/><circle cx="${n(x + sw * 1.5)}" cy="${n(y - 86)}" r="4" fill="#dcd8d0"/>`; }
  const p: Pose = { ...STAND, turn: .3, headTilt: -.25, headLift: .02, handA: [-.3, -1.7], handB: [.35, -2.5], bendB: 2, shapeB: 'open' };
  const r = stickman(p, { ...HERO, hat: 'hood' }, { id: 'wf', t, seed: 3, face: { ...expr('worried', 'sad', .4), gx: .6, gy: -.8 } });
  s += place(r.svg, 760, 1000, 170);
  return s + particles(t, { count: 140, col: '#e8e6e0', size: 3, fall: 70, drift: 20, a: .85, seed: 4 }) + kinetic(t, [[S[101] + .5, 'NUCLEAR'], [S[101] + .9, 'WINTER']], 960, 160, 84, { anchor: 'middle', hold: 1 }) + grade({ tint: '#b8bcc4', tintA: .3, vig: .6 });
}

function studyCard(t: number, lt: number) {
  let s = infoBg(t, '#0c100a', '#1e2a14');
  const k = outBack(range(lt, 0, .4));
  s += `<g transform="translate(960 400) scale(${n(k)})"><rect x="-520" y="-240" width="1040" height="480" rx="20" fill="#f4f1ea" stroke="#111" stroke-width="8"/>${txt(-470, -150, 'NATURE FOOD · 2022', 34, { fill: '#5a6a3a' })}${txt(-470, -80, 'Global food insecurity and famine', 44, { fill: '#111' })}${txt(-470, -26, 'from reduced crop, marine fishery and', 44, { fill: '#111' })}${txt(-470, 28, 'livestock production due to climate', 44, { fill: '#111' })}${txt(-470, 82, 'disruption from nuclear war soot injection', 44, { fill: '#111' })}${txt(-470, 170, 'Xia, Robock et al.', 34, { fill: '#5a5a5a', weight: 700 })}</g>`;
  for (let i = 0; i < 14; i++) { const x = 180 + i * 120, w = outCubic(range(lt, .8 + i * .05, 1.4 + i * .05)); s += `<g transform="translate(${x} 900) scale(${n(w)})"><path d="M0 40 V-30" stroke="#c9b84a" stroke-width="6"/><ellipse cx="0" cy="-40" rx="12" ry="24" fill="#d9c45a" stroke="#111" stroke-width="3"/></g>`; }
  return s + badge('real', 90, 80, 1, 'Peer-reviewed model study') + grade({ vig: .45 });
}

/** People field: 80 icons (≈100 million each); `greyN` turn grey by time. */
function peopleField(t: number, t0: number, greyN: number, headline: string, sub: string) {
  let s = infoBg(t, '#120c0c', '#2e1a1a');
  for (let i = 0; i < 80; i++) {
    const x = 240 + (i % 20) * 72, y = 300 + Math.floor(i / 20) * 120, g = t > t0 + .8 + i * .025 && i < greyN;
    s += `<g transform="translate(${x} ${y})"><circle cy="-30" r="16" fill="${g ? '#4a4a4e' : '#f4f1ea'}" stroke="#111" stroke-width="3"/><path d="M-18 40 V0 Q-18 -10 0 -10 Q18 -10 18 0 V40Z" fill="${g ? '#3a3a3e' : COL.alert}" stroke="#111" stroke-width="3"/></g>`;
  }
  s += txt(960, 860, headline, 72, { anchor: 'middle', fill: '#ffb3ad', op: range(t, t0 + 1.2, t0 + 1.6) }) + txt(960, 920, sub, 32, { anchor: 'middle', weight: 600, fill: '#e0c9c9', op: range(t, t0 + 1.4, t0 + 1.8) });
  return s + txt(1700, 230, '1 icon ≈ 100 million people', 24, { anchor: 'end', fill: '#c9d2e0', weight: 600 }) + badge('real', 90, 80, 1, 'Xia et al., Nature Food (2022) — model estimates') + grade({ vig: .5 });
}

function debate(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#e9ecef"/><rect x="460" y="100" width="1000" height="560" rx="10" fill="#fff" stroke="#111" stroke-width="7"/>`;
  const bars: [string, number, number, string][] = [['HIGH-SMOKE MODELS', .35, .95, COL.alert], ['LOW-SMOKE MODELS', .05, .45, '#2f6fd1']];
  bars.forEach(([l, a, b, c], i) => { const k = outCubic(range(lt, .3 + i * .6, .9 + i * .6)); s += txt(520, 230 + i * 170, l, 30, { fill: '#333' }) + `<rect x="${n(520 + a * 880)}" y="${250 + i * 170}" width="${n((b - a) * 880 * k)}" height="60" rx="10" fill="${c}" opacity=".8"/>`; });
  s += `<path d="M520 610 H1400" stroke="#333" stroke-width="4"/>` + txt(520, 645, 'smaller effect', 24, { fill: '#555' }) + txt(1400, 645, 'larger effect', 24, { anchor: 'end', fill: '#555' });
  const unc = outBack(range(t, S[106], S[106] + .3));
  if (unc > 0) s += `<g transform="translate(960 380) scale(${n(unc)}) rotate(-6)"><rect x="-300" y="-70" width="600" height="140" rx="12" fill="#fff" stroke="#111" stroke-width="8"/>${txt(0, 30, 'UNCERTAIN', 90, { anchor: 'middle', fill: '#111' })}</g>`;
  const a = stickman({ ...STAND, turn: .45, handB: [1.1, -3.0 + Math.sin(t * 3) * .15], shapeB: 'point', handA: [-.3, -1.7] }, SCI, { id: 'sa', t, seed: 81, face: expr('focused', 'determined', .5) });
  const b = stickman({ ...STAND, turn: -.45, handA: [-.9, -2.6], shapeA: 'open', handB: [.3, -2.4 + Math.sin(t * 2.5) * .1], bendB: 2 }, { ...SCI, glasses: false, hat: 'bun', hair: '#4a3a2a' }, { id: 'sb', t, seed: 82, face: expr('curious', 'confused', .4) });
  s += place(a.svg, 260, 1040, 150) + place(b.svg, 1660, 1040, 150);
  return s + badge('real', 90, 80, 1, 'e.g. Reisner et al. 2018 (Los Alamos) vs Robock et al.') + grade({ vig: .3 });
}

function testTube(t: number, lt: number) {
  let s = `<defs>${lin('tt', [[0, '#141a24'], [1, '#05070b']])}</defs><rect width="${W}" height="${H}" fill="url(#tt)"/><rect x="200" y="760" width="1520" height="40" fill="#3a3f4a" stroke="#111" stroke-width="5"/>`;
  const lift = 1 - inOut(range(lt, .6, 1.8));
  const y = 520 - lift * 120;
  const g = ortho([960, y + 140], 90, t * 30, 20);
  s += `<g><rect x="860" y="${n(y - 220)}" width="200" height="460" rx="100" fill="#cfe7ff" fill-opacity=".12" stroke="#cfe7ff" stroke-width="8"/><rect x="845" y="${n(y - 240)}" width="230" height="40" rx="10" fill="#8a96a8" stroke="#111" stroke-width="5"/>`;
  s += `<circle cx="960" cy="${n(y + 140)}" r="90" fill="#2e6fb0"/>${globeLand(g, '#3a7a52', '#173a2a', 1.5)}</g>`;
  s += `<g transform="translate(1300 650) rotate(4)"><rect x="-180" y="-46" width="360" height="92" rx="8" fill="#f4f1ea" stroke="#111" stroke-width="5"/>${txt(0, 18, 'DO NOT TEST', 48, { anchor: 'middle', fill: COL.alert })}</g>`;
  return s + glow([960, y + 140], 300, '#3a8dff', .3) + grade({ vig: .7 });
}

export const CH7: Shot[] = [
  { a: at(93), tr: 'black', r: (t, lt) => cityScape(t, { sky: 'dusk', cam: { x: 960, y: 560, zoom: 1.1 + lt * .02 }, lit: .05, fires: [{ x: 250, y: 760, s: 1 }, { x: 900, y: 740, s: 1.3 }, { x: 1600, y: 770, s: 1 }], ruins: .3 }) + chapterTitle(lt, 7, 'The World Starts Changing', 2.4) + grade({ vig: .55 }) },
  { a: at(94), r: (t, lt) => cityScape(t, { sky: 'dusk', cam: { x: 960, y: 420 - lt * 40, zoom: 1.3 }, lit: 0, smoke: 1.2, fires: [{ x: 700, y: 780, s: 1.2 }, { x: 1300, y: 760, s: 1.4 }], haze: .25 }) + kinetic(t, [[S[94] + .3, 'THE'], [S[94] + .5, 'SMOKE']], 960, 540, 110, { anchor: 'middle', accent: ['SMOKE'], hold: .4 }) + grade({ vig: .6 }) },
  { a: at(95), r: (t, lt) => firestorm(t, lt) },
  { a: at(96), r: (t, lt) => layers(t, lt) },
  { a: at(97), r: (t, lt) => sootGlobe(t, lt, inOut(range(lt, .3, 4))) + txt(1100, 1030, `WEEK ${Math.min(8, 1 + Math.floor(range(lt, .3, 4) * 7))}`, 40, { anchor: 'middle', fill: '#c9d2e0' }) + kinetic(t, [[S[97] + 2.6, 'LESS'], [S[97] + 2.9, 'SUNLIGHT']], 380, 160, 54, { anchor: 'middle', hold: 1.5 }) + grade({ vig: .5 }) },
  { a: at(98), r: t => climateCharts(t) },
  { a: at(101), r: (t, lt) => winterField(t, lt) },
  { a: at(102), r: (t, lt) => studyCard(t, lt) },
  { a: at(103), r: t => peopleField(t, S[103], 50, 'MORE THAN 5 BILLION', 'could die from famine — worst case: war between the two largest nuclear powers') },
  { a: at(104), r: t => peopleField(t, S[104] - .6, 20, 'OVER 2 BILLION', 'at risk — even in a smaller regional war') },
  { a: at(105), r: (t, lt) => debate(t, lt) },
  { a: at(107), r: (t, lt) => testTube(t, lt) },
];
