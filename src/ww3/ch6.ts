// Chapter 6 — The Second Disaster: fallout (3:06–3:48). Real guidance labelled; scenario labelled.
import { expr } from '../ff2d/face.ts';
import { particles, puff } from '../ff2d/fx.ts';
import { fictionalWorld } from '../ff2d/geo.ts';
import { hash, inOut, mix, outBack, outCubic, range, type V2 } from '../ff2d/motion.ts';
import { HERO, type Look, type Pose, STAND, stickman, walkPose } from '../ff2d/rig.ts';
import { glow, grade, H, lin, place, txt, W } from '../ff2d/stage.ts';
import { badge, chapterTitle, COL, kinetic } from '../ff2d/ui.ts';
import { infoBg } from './ch2.ts';
import { cityScape } from './kits/city.ts';
import { at, type Shot } from './shot.ts';
import { S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);

function windowAsh(t: number, lt: number) {
  let s = `<defs>${lin('wa', [[0, '#26262a'], [1, '#18181c']])}</defs><rect width="${W}" height="${H}" fill="url(#wa)"/>`;
  s += `<svg x="520" y="120" width="1100" height="700" viewBox="0 0 1920 1080">${cityScape(t, { sky: 'ash', cam: { x: 960, y: 600, zoom: 1.2 }, ruins: .2, smoke: .5, haze: .25, ash: 1 })}</svg>`;
  s += `<path d="M520 120 H1620 V820 H520Z M1070 120 V820 M520 470 H1620" fill="none" stroke="#d6d6d0" stroke-width="22"/><rect x="480" y="820" width="1180" height="36" fill="#cfcfc8" stroke="#111" stroke-width="5"/>`;
  s += `<rect x="300" y="80" width="200" height="900" fill="#4a4a54" stroke="#111" stroke-width="6"/><rect x="1640" y="80" width="200" height="900" fill="#4a4a54" stroke="#111" stroke-width="6"/>`;
  const touch = inOut(range(lt, 1.0, 1.8));
  const p: Pose = { ...STAND, back: 1, lean: -.03, handA: [-.45, -1.65], handB: [mix(.5, .62, touch), mix(-1.65, -3.0, touch)], shapeB: 'open', bendB: 2, headTilt: -.05 };
  const r = stickman(p, HERO, { id: 'wh', t, seed: 3, face: expr('fear') });
  s += place(r.svg, 980, 1200, 190);
  return s + chapterTitle(lt, 6, 'The Second Disaster', 2.2) + grade({ tint: '#b8b0a0', tintA: .25, vig: .6 });
}

/** Cross-section diagram: ground burst → debris drawn up → plume drifts downwind → falls. */
function plumeDiagram(t: number, lt: number, phase: 'up' | 'drift') {
  let s = `<defs>${lin('pds', [[0, '#7f97ad'], [1, '#c9d2d6']])}</defs><rect width="${W}" height="${H}" fill="url(#pds)"/><rect y="860" width="${W}" height="220" fill="#6a5a46"/><path d="M0 860 H${W}" stroke="#3a2f22" stroke-width="6"/>`;
  for (let i = 0; i < 9; i++) s += `<path d="M${-100 + i * 260} ${n(860 - 30 - hash(i) * 60)} h${n(70 + hash(i + 1) * 60)} v${n(30 + hash(i) * 60)} h-${n(70 + hash(i + 1) * 60)}Z" fill="#4a4036"/>`;
  const cx = 420, drift = phase === 'drift' ? inOut(range(lt, .2, 4)) * 1000 : 0;
  // stem + cap
  if (phase === 'up') {
    const up = outCubic(range(lt, 0, 2.5));
    for (let i = 0; i < 12; i++) { const k = ((lt * .6 + i / 12) % 1); s += `<circle cx="${n(cx + Math.sin(i * 7) * 40 * (1 - k))}" cy="${n(860 - k * 520 * up)}" r="${n(7 + hash(i) * 6)}" fill="#5a4a36" stroke="#2a2018" stroke-width="2"/>`; }
    for (let i = 0; i < 4; i++) s += `<path d="M${cx + (i - 1.5) * 120} 830 Q${cx + (i - 1.5) * 50} 700 ${cx} ${n(520)}" stroke="#ffcf3b" stroke-width="6" fill="none" stroke-dasharray="14 10" marker-end="url(#ar)" opacity="${n(up)}"/>`;
    s += puff(cx, 860 - 520 * up, 160 * up + 40, 5, '#9a8a78', '#5a4a3a', .95, 8) + `<rect x="${cx - 40}" y="${n(860 - 520 * up)}" width="80" height="${n(520 * up)}" fill="#8a7a68" opacity=".7"/>`;
    s += `<g transform="translate(860 300)" opacity="${n(range(lt, 1, 1.4))}"><rect x="-10" y="-50" width="470" height="90" rx="12" fill="#0b0f16" fill-opacity=".8"/>${txt(20, 12, 'DIRT & DEBRIS PULLED UP', 34, {})}</g>`;
  } else {
    const ccx = cx + drift;
    s += puff(ccx, 300, 200, 5, '#9a8a78', '#5a4a3a', .95, 8) + puff(ccx - 160, 330, 140, 9, '#a39482', '#5a4a3a', .7 * (1 - range(lt, 1, 3)), 7);
    // falling radioactive particles under the drifting cloud
    for (let i = 0; i < 70; i++) {
      const k = ((lt * .5 + hash(i)) % 1), x = ccx - 200 + hash(i * 3) * 400 - k * 100, y = 380 + k * 480;
      if (x < cx + 100) continue;
      s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(4 + hash(i + 5) * 3)}" fill="#c9d65a" opacity="${n(.85 * (1 - k * .3))}"/>`;
    }
    const fz = range(lt, 1.5, 4.5);
    s += `<rect x="${cx + 300}" y="850" width="${n(1100 * fz)}" height="20" fill="#c9d65a" opacity=".55"/>`;
    for (let i = 0; i < 4; i++) s += `<path d="M${200 + i * 360} 140 h180" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".8"/><path d="M${360 + i * 360} 124 l24 16 l-24 16" stroke="#fff" stroke-width="8" fill="none" opacity=".8"/>`;
    s += txt(1700, 120, 'WIND', 40, { anchor: 'end' }) + txt(cx + 300 + 550 * fz, 940, 'FALLOUT · MILES DOWNWIND', 34, { anchor: 'middle', fill: '#1a1a10', op: fz });
  }
  s += `<circle cx="${cx}" cy="860" r="${n(30 + Math.sin(t * 6) * 4)}" fill="#ffcf8a" opacity=".6"/>`;
  return s + `<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8Z" fill="#ffcf3b"/></marker></defs>` + badge('real', 90, 80, 1, 'How fallout forms (simplified diagram)') + grade({ vig: .4 });
}

function footprint(t: number) {
  const F = fictionalWorld(7), P = (p: V2): V2 => [960 + p[0] * 1500, 560 + p[1] * 960];
  let s = `<rect width="${W}" height="${H}" fill="#24384a"/><path d="M${F.blocA.map(p => P([p[0] + .32, p[1]]).map(n).join(' ')).join('L')}Z" fill="#3e5a46" stroke="#1a2a20" stroke-width="5"/>`;
  const src = P([-.12, -.05]), k = outCubic(range(t, S[78], S[81] + 1.5));
  s += `<defs><radialGradient id="fp" cx=".1" cy=".5" r=".9"><stop offset="0" stop-color="#e0d23a" stop-opacity=".85"/><stop offset=".6" stop-color="#c9d65a" stop-opacity=".45"/><stop offset="1" stop-color="#c9d65a" stop-opacity="0"/></radialGradient></defs>`;
  s += `<ellipse cx="${n(src[0] + 520 * k)}" cy="${n(src[1] + 60 * k)}" rx="${n(80 + 560 * k)}" ry="${n(50 + 130 * k)}" transform="rotate(8 ${n(src[0])} ${n(src[1])})" fill="url(#fp)"/>`;
  s += `<circle cx="${n(src[0])}" cy="${n(src[1])}" r="18" fill="${COL.alert}" stroke="#fff" stroke-width="4"/>` + txt(src[0], src[1] - 30, 'STRIKE', 26, { anchor: 'middle' });
  const town = P([.32, .05]), hk = outBack(range(t, S[81] + .2, S[81] + .6));
  s += `<g transform="translate(${n(town[0])} ${n(town[1])}) scale(${n(.6 + hk * .4)})"><path d="M-40 20 V-10 L-20 -30 L0 -10 V-30 H30 V20Z" fill="#f4f1ea" stroke="#111" stroke-width="5"/></g>`;
  if (hk > 0) s += `<g transform="translate(${n(town[0])} ${n(town[1] + 80)}) scale(${n(hk)})"><rect x="-170" y="-34" width="340" height="62" rx="10" fill="#0b0f16"/>${txt(0, 12, 'NEVER HIT', 38, { anchor: 'middle', fill: '#ffcf3b' })}</g>`;
  const icon = (x: number, t0: number, label: string, glyph: string) => { const a = outBack(range(t, t0, t0 + .3)); return a > 0 ? `<g transform="translate(${x} 170) scale(${n(a)})"><circle r="72" fill="#0b0f16" fill-opacity=".85" stroke="#fff" stroke-width="5"/>${glyph}<path d="M-50 -50 L50 50" stroke="${COL.alert}" stroke-width="12" stroke-linecap="round"/>${txt(0, 120, label, 28, { anchor: 'middle' })}</g>` : ''; };
  s += icon(1460, S[79], 'NO SMELL', `<path d="M-6 -36 Q-26 10 -20 20 Q0 28 20 18" stroke="#fff" stroke-width="8" fill="none"/>`);
  s += icon(1720, S[80], 'OFTEN INVISIBLE', `<path d="M-44 0 Q0 -40 44 0 Q0 40 -44 0Z" stroke="#fff" stroke-width="7" fill="none"/><circle r="14" fill="#fff"/>`);
  return s + badge('fiction', 90, 80, 1) + grade({ vig: .45 });
}

function guidance(t: number) {
  let s = infoBg(t, '#0e1410', '#1e3a2a');
  s += `<rect x="0" y="70" width="${W}" height="110" fill="#c8282d"/>` + txt(960, 145, 'EMERGENCY BROADCAST · OFFICIAL INSTRUCTION', 48, { anchor: 'middle', ls: 3 });
  const mg = 1 - range(t, S[83] - .3, S[83] - .05);
  if (mg > 0) s += `<g transform="translate(960 560) scale(${n(outBack(range(t, S[82], S[82] + .3)) * mg)})"><path d="M-160 -50 L40 -150 V150 L-160 50Z" fill="#f4f1ea" stroke="#111" stroke-width="10"/><rect x="-220" y="-60" width="70" height="120" rx="12" fill="#c8282d" stroke="#111" stroke-width="8"/>${[1, 2, 3].map(i => `<path d="M${60 + i * 40} ${-60 - i * 20} Q${110 + i * 50} 0 ${60 + i * 40} ${60 + i * 20}" stroke="#f4f1ea" stroke-width="10" fill="none" opacity="${n(.5 + .5 * Math.sin(t * 8 - i))}"/>`).join('')}</g>`;
  const items: [number, string, string][] = [[S[83], 'GET INSIDE', '<path d="M-60 40 V-10 L0 -60 L60 -10 V40Z" fill="none" stroke="#fff" stroke-width="10"/><rect x="-18" y="0" width="36" height="40" fill="#fff"/>'], [S[84], 'STAY INSIDE', '<rect x="-56" y="-50" width="112" height="100" rx="8" fill="none" stroke="#fff" stroke-width="10"/><path d="M-20 0 h40 M0 -20 v40" stroke="#fff" stroke-width="10"/>'], [S[85], 'STAY TUNED', '<rect x="-60" y="-34" width="120" height="76" rx="12" fill="none" stroke="#fff" stroke-width="10"/><path d="M-30 -34 L20 -70" stroke="#fff" stroke-width="8"/><circle cx="26" cy="4" r="18" fill="#fff"/>']];
  items.forEach(([t0, label, g], i) => { const k = outBack(range(t, t0 - .05, t0 + .25)); if (k <= 0) return; s += `<g transform="translate(${400 + i * 560} 560) scale(${n(k)})"><circle r="170" fill="#16301f" stroke="#4bd38a" stroke-width="8"/><g transform="scale(1.6)">${g}</g>${txt(0, 260, label, 54, { anchor: 'middle' })}</g>`; });
  return s + badge('real', 90, 950, 1, 'Standard nuclear-emergency advice (e.g. FEMA / Ready.gov)') + grade({ vig: .45 });
}

function sevenTen(t: number) {
  let s = infoBg(t);
  s += txt(960, 150, 'THE 7–10 RULE OF THUMB', 60, { anchor: 'middle' }) + txt(960, 210, 'Every 7× longer, radiation drops roughly 10×', 34, { anchor: 'middle', weight: 600, fill: '#c9d2e0', op: range(t, S[87] + 1.5, S[87] + 2) });
  const bars: [string, number, number][] = [['1 HOUR', 1, S[86] + .3], ['7 HOURS', .1, S[87] + 1.8], ['2 DAYS', .01, S[87] + 3.4], ['2 WEEKS', .001, S[87] + 4.8]];
  bars.forEach(([lab, v, t0], i) => {
    const k = outCubic(range(t, t0, t0 + .5)), x = 380 + i * 360, h = Math.max(6, 560 * Math.pow(v, .5)) * k;
    s += `<rect x="${x - 110}" y="${n(880 - h)}" width="220" height="${n(h)}" rx="10" fill="${i === 0 ? COL.alert : '#e0d23a'}" opacity="${n(.4 + k * .6)}"/>` + txt(x, 940, lab, 36, { anchor: 'middle', op: k }) + txt(x, 860 - h, i === 0 ? '100%' : `${(v * 100).toFixed(v < .01 ? 1 : 0)}%`, 40, { anchor: 'middle', fill: '#fff', op: k });
    if (i > 0 && k > 0) s += `<path d="M${x - 300} 300 q120 -50 240 0" stroke="#7fd3ff" stroke-width="5" fill="none" opacity="${n(k)}"/>` + txt(x - 180, 290, '×7', 30, { anchor: 'middle', fill: '#7fd3ff', op: k });
  });
  const shelterK = range(t, S[88], S[88] + .4);
  if (shelterK > 0) s += `<rect x="200" y="880" width="${n(760 * shelterK)}" height="16" fill="#4bd38a"/>` + txt(220, 1000, 'FIRST 24–48 HOURS IN SHELTER MATTER MOST', 34, { fill: '#4bd38a', op: shelterK });
  return s + badge('real', 90, 80, 1, 'Approximate decay of fallout (illustrative scale)') + grade({ vig: .45 });
}

function subwayShelter(t: number, lt: number) {
  let s = `<defs>${lin('sbw', [[0, '#2a2e2a'], [1, '#141614']])}</defs><rect width="${W}" height="${H}" fill="url(#sbw)"/>`;
  for (let i = 0; i < 8; i++) s += `<rect x="${i * 260}" y="0" width="240" height="560" fill="#3a403a" stroke="#1a1c1a" stroke-width="6"/><rect x="${i * 260 + 20}" y="20" width="200" height="40" fill="${Math.sin(t * 13 + i * 9) > -.9 ? '#e8f4e0' : '#555'}" opacity=".7"/>`;
  s += `<rect x="560" y="140" width="800" height="120" rx="10" fill="#e3c63a" stroke="#111" stroke-width="7"/>` + txt(960, 222, 'CIVIL DEFENCE SHELTER', 58, { anchor: 'middle', fill: '#111' });
  s += `<rect y="760" width="${W}" height="320" fill="#5a5a50"/><rect y="740" width="${W}" height="30" fill="#e3c63a"/>`;
  const people: [number, number, string, string][] = [];
  for (let i = 0; i < 16; i++) people.push([60 + i * 120 + hash(i) * 40, i % 2 ? 1010 : 930, ['#3f6d48', '#2a3550', '#6a4a8a', '#8a6a3a', '#a54a4a', '#4a8a8a'][i % 6], ['tired', 'worried', 'sad', 'fear'][i % 4]]);
  people.sort((a, b) => a[1] - b[1]);
  for (const [x, y, c, f] of people) {
    const sitting = y < 1000;
    const p: Pose = sitting ? { ...STAND, turn: (hash(x) - .5) * 1.4, crouch: .75, lean: .1, footA: [-.6, -.08], footB: [.6, -.08], handA: [-.4, -1.4], handB: [.4, -1.4], kneeDir: 1, headTilt: (hash(x + 1) - .5) * .3 } : { ...STAND, turn: (hash(x) - .5), handA: [-.5, -1.62], handB: [.5, -1.62] };
    const r = stickman(p, { outfit: 'jacket', color: c, pants: '#26272e', hat: hash(x + 3) > .7 ? 'bun' : undefined, hair: '#6a5a4a' }, { id: 'ss' + Math.round(x), t, seed: x, face: { ...expr(f as 'tired'), gx: (hash(x + 2) - .5) * 1.4 } });
    s += place(r.svg, x + (lt * 8 * (hash(x) - .5)), y, sitting ? 100 : 108);
  }
  return s + `<rect width="${W}" height="${H}" fill="#9aa890" opacity=".25" style="mix-blend-mode:multiply"/>` + badge('fiction', 90, 80, 1) + grade({ vig: .55 });
}

function radioRumours(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#1a1612"/><rect y="760" width="${W}" height="320" fill="#2a2018"/>`;
  s += `<g transform="translate(1180 620)"><rect x="-260" y="-150" width="520" height="290" rx="30" fill="#5a3e2a" stroke="#111" stroke-width="8"/><circle cx="-120" cy="0" r="90" fill="#2a1e14" stroke="#111" stroke-width="6"/>${Array.from({ length: 6 }, (_, i) => `<path d="M-190 ${-60 + i * 24} h140" stroke="#5a3e2a" stroke-width="6"/>`).join('')}<rect x="20" y="-100" width="200" height="80" rx="8" fill="#e3c66a" stroke="#111" stroke-width="5"/><path d="M${n(40 + (Math.sin(t * .7) * .5 + .5) * 160)} -96 v72" stroke="#c8282d" stroke-width="5"/><circle cx="80" cy="60" r="30" fill="#2a1e14" stroke="#111" stroke-width="5"/><circle cx="170" cy="60" r="30" fill="#2a1e14" stroke="#111" stroke-width="5"/><path d="M180 -150 L260 -300" stroke="#888" stroke-width="8"/></g>`;
  let wave = 'M1000 250';
  for (let i = 0; i < 60; i++) wave += ` L${1000 + i * 8} ${n(250 + Math.sin(i * .9 + t * 20) * 40 * (hash(i + Math.floor(t * 15)) > .3 ? 1 : .1))}`;
  s += `<path d="${wave}" stroke="#e3c66a" stroke-width="4" fill="none"/>`;
  ['THEY SAY THE NORTH IS SAFE…', '…NO, THE BRIDGE IS CLOSED…', 'WATER IS CONTAMINATED?'].forEach((q, i) => { const k = range(lt, .2 + i * .35, .45 + i * .35); if (k > 0) s += `<g opacity="${n(k * (1 - range(lt, 1.6, 2)))}"><rect x="${960 + i * 120}" y="${360 + i * 80}" width="${q.length * 18 + 40}" height="56" rx="28" fill="#f4f1ea" stroke="#111" stroke-width="4"/>${txt(980 + i * 120, 398 + i * 80, q, 26, { fill: '#111', weight: 800 })}</g>`; });
  const p: Pose = { ...STAND, turn: .5, lean: .22, crouch: .5, headTilt: .15, handA: [1.0, -2.0], handB: [1.4, -2.05], bendA: 2, bendB: 2 };
  const r = stickman(p, HERO, { id: 'rh', t, seed: 3, face: { ...expr('focused', 'confused', range(lt, .6, 1.2)), gx: .7 } });
  s += place(r.svg, 640, 1020, 170);
  return s + glow([1180, 600], 600, '#ffb35c', .3) + grade({ vig: .6 });
}

function hospital(t: number) {
  let s = `<defs>${lin('hs', [[0, '#3a3e48'], [1, '#6a6e72']])}</defs><rect width="${W}" height="${H}" fill="url(#hs)"/>`;
  s += `<rect x="300" y="120" width="1400" height="660" fill="#c9cdd1" stroke="#111" stroke-width="7"/><rect x="700" y="420" width="600" height="360" fill="#2a3a4a" stroke="#111" stroke-width="7"/>` + txt(1000, 260, 'EMERGENCY', 84, { anchor: 'middle', fill: '#c8282d' });
  for (let i = 0; i < 4; i++) s += `<rect x="${360 + i * 340}" y="300" width="220" height="80" fill="${Math.sin(t * 3 + i) > -.6 ? '#e8f0f4' : '#4a5058'}" stroke="#111" stroke-width="5"/>`;
  s += `<path d="M1560 780 L1700 600 L1840 780Z" fill="#e8e8d8" stroke="#111" stroke-width="6"/><path d="M1650 690 h100 M1700 640 v100" stroke="#c8282d" stroke-width="16"/>`;
  s += `<rect y="780" width="${W}" height="300" fill="#4a4a4e"/><rect x="80" y="660" width="180" height="120" fill="#5a6a3a" stroke="#111" stroke-width="5"/>` + glow([170, 650], 200, '#fff1c4', .4 + .1 * Math.sin(t * 40));
  for (let i = 0; i < 10; i++) {
    const r = stickman({ ...STAND, turn: .7, lean: .05, crouch: i % 3 === 0 ? .2 : 0, handA: [.1, -1.65], handB: [.3, -1.7] }, { outfit: 'jacket', color: ['#3f6d48', '#2a3550', '#6a4a8a', '#8a6a3a', '#a54a4a'][i % 5], pants: '#26272e' }, { id: 'hq' + i, t, seed: 70 + i, face: expr(i % 2 ? 'tired' : 'worried') });
    s += place(r.svg, 160 + i * 66, 960 + (i % 2) * 20, 100);
  }
  const np: Pose = { ...STAND, turn: -.3, lean: .1, handA: [-.6, -2.2], handB: [.3, -3.4], bendB: 2, shapeB: 'open', headTilt: .1 };
  const nr = stickman(np, { outfit: 'lab', color: '#7fb8c9', pants: '#5a8a9a', hat: 'bun', hair: '#3a2a1a' }, { id: 'nu', t, seed: 77, face: { ...expr('tired'), sweat: 1 } });
  s += place(nr.svg, 1300, 1000, 140) + `<g transform="translate(1180 820)"><rect x="-60" y="-60" width="120" height="120" fill="#f4f1ea" stroke="#111" stroke-width="5"/><path d="M-40 -40 h80 M-40 -15 h60 M-40 10 h70" stroke="#999" stroke-width="5"/>${txt(0, 48, 'EMPTY', 24, { anchor: 'middle', fill: '#c8282d' })}</g>`;
  return s + kinetic(t, [[S[91] + .7, 'STAFF'], [S[91] + 1.0, 'POWER'], [S[91] + 1.4, 'SUPPLIES']], 960, 90, 52, { anchor: 'middle', accent: ['SUPPLIES'] }) + grade({ tint: '#b8b8c0', tintA: .3, vig: .55 });
}

function greyStreet(t: number, lt: number) {
  let s = cityScape(t, { sky: 'grey', cam: { x: 960, y: 560, zoom: 1.15 }, ruins: .55, smoke: .5, haze: .35, ash: .8 });
  s += `<rect y="900" width="${W}" height="180" fill="#5a5a58"/>`;
  for (let i = 0; i < 3; i++) s += `<g transform="translate(${300 + i * 620} 900)"><rect x="-130" y="-70" width="260" height="70" rx="14" fill="#6a6e72" stroke="#111" stroke-width="5"/><path d="M-90 -70 L-60 -110 H60 L90 -70Z" fill="#5a5e62" stroke="#111" stroke-width="5"/><path d="M-120 -72 H120 M-60 -112 H60" stroke="#d9d4c9" stroke-width="10"/><circle cx="-80" cy="0" r="24" fill="#222"/><circle cx="80" cy="0" r="24" fill="#222"/></g>`;
  const d = lt * 1.1, p = walkPose(d, 1, { step: .5, turn: .6 });
  p.headTurn = Math.sin(lt * 1.2) * .3;
  const L: Look = { ...HERO, mask: true };
  const r = stickman(p, L, { id: 'gs', t, seed: 3, face: { ...expr('sad', 'fear', .3), gx: Math.sin(lt * 1.2) * .8 } });
  s += place(r.svg, 520 + d * 120, 1010, 170);
  return s + particles(t, { count: 70, col: '#e8e4dc', size: 3, fall: 50, drift: 15, a: .8, seed: 9 }) + grade({ tint: '#a8a49a', tintA: .35, vig: .6 });
}

export const CH6: Shot[] = [
  { a: at(76), tr: 'black', r: (t, lt) => windowAsh(t, lt) },
  { a: at(77), r: (t, lt) => plumeDiagram(t, lt, 'up') },
  { a: at(78), r: (t, lt) => plumeDiagram(t, lt, 'drift') },
  { a: at(79), r: t => footprint(t) },
  { a: at(82), r: t => guidance(t) },
  { a: at(86), r: t => sevenTen(t) },
  { a: at(89), r: (t, lt) => subwayShelter(t, lt) },
  { a: at(90), r: (t, lt) => radioRumours(t, lt) },
  { a: at(91), r: t => hospital(t) },
  { a: at(92), r: (t, lt) => greyStreet(t, lt) },
];
