// Chapter 3 — The First Mistake (1:06–1:44).
import { EXPR, expr } from '../ff2d/face.ts';
import { particles, puff, screenGlass } from '../ff2d/fx.ts';
import { fictionalWorld, globeLand, ortho } from '../ff2d/geo.ts';
import { clamp, hash, inOut, mix, outBack, outCubic, range, type V2 } from '../ff2d/motion.ts';
import { type Look, type Pose, STAND, stickman } from '../ff2d/rig.ts';
import { glow, grade, H, lin, place, rad, txt, W } from '../ff2d/stage.ts';
import { badge, chapterTitle, COL, kinetic } from '../ff2d/ui.ts';
import { infoBg } from './ch2.ts';
import { commandCenter } from './kits/command.ts';
import { at, type Shot } from './shot.ts';
import { S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);
export const LEADER: Look = { outfit: 'suit', color: '#22314a', pants: '#1c2638', tie: '#2f6fd1' };
const OPER: Look = { outfit: 'uniform', color: '#2f4a3a', pants: '#2a3326', shoe: '#2a2018', hat: 'headset' };

/** Night Earth from orbit with an early-warning satellite; flashes = times of detected heat blooms. */
export function orbit(t: number, lt: number, flashes: number[], o: { lon?: number; soot?: number; lights?: number } = {}) {
  let s = `<rect width="${W}" height="${H}" fill="#02040a"/>`;
  for (let i = 0; i < 160; i++) s += `<circle cx="${n(hash(i) * W)}" cy="${n(hash(i + 99) * H)}" r="${n(.6 + hash(i + 7) * 1.2)}" fill="#fff" opacity="${n(.3 + hash(i + 3) * .5)}"/>`;
  const R = 900, c: V2 = [760, 1500], g = ortho(c, R, (o.lon ?? 30) + lt * 1.2, 35);
  s += `<defs>${rad('atm', [[.9, '#3a7bd5', 0], [.97, '#5aa8ff', .55], [1, '#5aa8ff', 0]])}${rad('ngt', [[0, '#0c1830'], [1, '#050a16']], .4, .3, .8)}</defs>`;
  s += `<circle cx="${c[0]}" cy="${c[1]}" r="${R * 1.03}" fill="url(#atm)"/><circle cx="${c[0]}" cy="${c[1]}" r="${R}" fill="url(#ngt)"/>` + globeLand(g, '#0f1d33', '#16294a', 2);
  // city lights scattered on land (deterministic), dimmed by o.lights
  for (let i = 0; i < 220; i++) {
    const lon = -10 + hash(i * 3.3) * 140, lat = 10 + hash(i * 7.1) * 50, p = g([lon, lat]);
    if (p[2] < .05) continue;
    s += `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(1.5 + hash(i) * 2.5)}" fill="#ffcf7a" opacity="${n((o.lights ?? 1) * (.4 + hash(i + 1) * .6) * p[2])}"/>`;
  }
  for (const [k, ft] of flashes.entries()) {
    const d = t - ft; if (d < 0) continue;
    const p = g([60 + k * 4, 48 - k * 2]), a = Math.exp(-d * 1.4);
    s += glow([p[0], p[1]], 30 + d * 50, '#fff3c2', a) + `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(6 + d * 10)}" fill="none" stroke="#ff4b3a" stroke-width="3" opacity="${n(Math.min(1, d * 3) * .9)}"/>`;
  }
  if (o.soot) s += `<circle cx="${c[0]}" cy="${c[1]}" r="${R}" fill="#1a1612" opacity="${n(o.soot)}"/>`;
  // satellite (foreground, slow drift) with sensor cone
  const sx = 1360 + lt * 12, sy = 300 - lt * 4;
  s += `<path d="M${sx} ${sy} L${sx - 520} ${sy + 760} L${sx - 180} ${sy + 820}Z" fill="#9fdcff" opacity="${n(.06 + .03 * Math.sin(t * 3))}"/>`;
  s += `<g transform="translate(${n(sx)} ${n(sy)}) rotate(-18)"><rect x="-330" y="-34" width="230" height="68" fill="#1d3a6a" stroke="#c9d2e0" stroke-width="4"/><rect x="100" y="-34" width="230" height="68" fill="#1d3a6a" stroke="#c9d2e0" stroke-width="4"/>${Array.from({ length: 6 }, (_, i) => `<path d="M${-310 + i * 38} -34 V34 M${120 + i * 38} -34 V34" stroke="#c9d2e0" stroke-width="1.5" opacity=".6"/>`).join('')}<path d="M-100 0 H-60 M60 0 H100" stroke="#c9d2e0" stroke-width="6"/><rect x="-60" y="-70" width="120" height="140" rx="10" fill="#c9a84a" stroke="#111" stroke-width="5"/><rect x="-50" y="-60" width="100" height="120" fill="#e3c66a" opacity=".6"/><circle cx="0" cy="88" r="28" fill="#222" stroke="#c9d2e0" stroke-width="5"/><circle cx="0" cy="88" r="12" fill="#ff4b3a" opacity="${n(.5 + .5 * Math.sin(t * 6))}"/></g>`;
  return s + grade({ vig: .55 });
}

/** IR detection console screen: dots appear at given times. */
function irScreen(t: number, lt: number, dots: number[], big?: number) {
  let s = `<rect width="${W}" height="${H}" fill="#030a07"/><rect x="120" y="90" width="1680" height="900" rx="18" fill="#05140d" stroke="#1d4a33" stroke-width="8"/>`;
  for (let i = 0; i < 20; i++) s += `<path d="M${120 + i * 84} 90V990" stroke="#39ff8a" stroke-opacity=".06"/>`;
  for (let i = 0; i < 11; i++) s += `<path d="M120 ${90 + i * 82}H1800" stroke="#39ff8a" stroke-opacity=".06"/>`;
  const F = fictionalWorld(7), P = (p: V2): V2 => [960 + p[0] * 900, 560 + p[1] * 600];
  s += `<path d="M${F.blocB.map(p => P(p).map(n).join(' ')).join('L')}Z" fill="#0d2a1c" stroke="#39ff8a" stroke-width="3" opacity=".8"/>`;
  s += txt(160, 150, 'IR EARLY WARNING · SENSOR 2', 32, { fill: '#39ff8a', weight: 800, ls: 3 });
  const shown = dots.filter(d => t >= d).length;
  s += txt(1760, 150, `EVENTS ${shown}`, 40, { anchor: 'end', fill: shown > 1 ? '#ff4b3a' : '#39ff8a', weight: 900 });
  dots.forEach((d, i) => {
    if (t < d) return;
    const p = P([.25 + hash(i * 3) * .4, -.18 + hash(i * 5) * .4]), k = outBack(range(t, d, d + .3), 2.5), age = t - d;
    s += `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(22 * k)}" fill="#ff4b3a"/>` + glow(p, 80, '#ff3b30', .5 * Math.exp(-age)) + `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(22 + (age * 60) % 60)}" fill="none" stroke="#ff4b3a" stroke-width="3" opacity="${n(1 - ((age * 60) % 60) / 60)}"/>` + txt(p[0] + 34, p[1] - 20, `0${i + 1}`, 26, { fill: '#ff8a7a', weight: 800 });
  });
  if (big !== undefined && t > big) {
    const k = outBack(range(t, big, big + .3), 2), bl = Math.sin(t * 10) > -.3 ? 1 : .35;
    s += `<g transform="translate(960 560) scale(${n(k)})" opacity="${n(bl)}"><rect x="-560" y="-110" width="1120" height="220" fill="#2a0606" stroke="#ff3b30" stroke-width="10"/>${txt(0, 36, 'MISSILE LAUNCH', 100, { anchor: 'middle', fill: '#ff3b30', ls: 4 })}</g>`;
    s += `<rect width="${W}" height="${H}" fill="#ff1a1a" opacity="${n(.06 + .05 * Math.sin(t * 9))}"/>`;
  }
  return s + screenGlass(120, 90, 1680, 900, t, .25) + grade({ vig: .7 });
}

/** Three-question triptych: missile? glitch? sunlight? */
function triptych(t: number) {
  let s = infoBg(t, '#06101c', '#123050');
  const panels: [number, string][] = [[S[35], 'A REAL MISSILE?'], [S[36], 'A SOFTWARE GLITCH?'], [S[37], 'SUNLIGHT OFF CLOUDS?']];
  panels.forEach(([pt, label], i) => {
    const k = outCubic(range(t, pt - .1, pt + .25)), x = 120 + i * 580;
    s += `<g transform="translate(${x} ${n(160 + (1 - k) * 80)})" opacity="${n(k)}"><rect width="520" height="660" rx="22" fill="#0b1626" stroke="${i === 0 ? COL.alert : '#7fd3ff'}" stroke-width="5"/>`;
    if (i === 0) { const y = 470 - (t - pt) * 60; s += `<path d="M260 ${n(y - 200)} q24 30 24 70 v140 h-48 v-140 q0 -40 24 -70Z" fill="#c9d2e0" stroke="#111" stroke-width="5"/><path d="M236 ${n(y + 10)} l-30 40 h30Z M284 ${n(y + 10)} l30 40 h-30Z" fill="#8a96a8" stroke="#111" stroke-width="4"/>` + puff(260, y + 80, 60, 3, '#ffcf8a', '#ff7a3b', .9, 5); }
    if (i === 1) { s += `<rect x="90" y="160" width="340" height="230" rx="10" fill="#111" stroke="#7fd3ff" stroke-width="4"/>`; for (let r = 0; r < 6; r++) s += `<rect x="${110 + ((t * 300 + r * 70) % 40)}" y="${190 + r * 32}" width="${n(120 + hash(r + Math.floor(t * 8)) * 160)}" height="14" fill="${hash(r + Math.floor(t * 6)) > .7 ? '#ff4b3a' : '#7fd3ff'}"/>`; s += `<path d="M150 470 L230 420 L250 520 L330 450 L370 540" stroke="#ff4b3a" stroke-width="10" fill="none"/>`; }
    if (i === 2) { s += `<circle cx="400" cy="140" r="60" fill="#ffd25a"/>` + glow([400, 140], 160, '#ffd25a', .4); for (let c = 0; c < 3; c++) s += puff(150 + c * 110, 330 + c * 10, 70, 10 + c, '#f4f1ea', '#b8c4d4', 1, 6); s += `<path d="M400 140 L260 330 L120 560" stroke="#ffd25a" stroke-width="5" stroke-dasharray="16 10"/><rect x="80" y="540" width="80" height="40" fill="#c9a84a" stroke="#111" stroke-width="4"/>` + glow([270, 325], 70, '#fff3c2', .7 + .3 * Math.sin(t * 12)); }
    s += txt(260, 625, label, 34, { anchor: 'middle', weight: 900, fill: i === 0 ? '#ffb3ad' : '#dff1ff' }) + `</g>`;
  });
  return s + kinetic(t, [[S[35] - .4, 'IS'], [S[35] - .3, 'IT'], [S[35] - .2, 'REAL?']], 960, 950, 44, { anchor: 'middle', hold: 3.5 }) + grade({ vig: .45 });
}

/** Operator close-up at console: loading bar stalls, phone busy, slams desk. */
function operatorCU(t: number, lt: number) {
  let s = `<defs>${lin('ocb', [[0, '#0f2230'], [1, '#08131c']])}</defs><rect width="${W}" height="${H}" fill="url(#ocb)"/>`;
  // monitor on the right
  s += `<rect x="1080" y="140" width="720" height="470" rx="12" fill="#0b0f14" stroke="#111" stroke-width="8"/><rect x="1100" y="160" width="680" height="430" fill="#062030"/>`;
  s += txt(1130, 220, 'RADAR CONFIRMATION', 36, { fill: '#3be0ff', weight: 800 });
  const prog = Math.min(.37, lt * .3) + (Math.sin(t * 2) > .95 ? .002 : 0);
  s += `<rect x="1130" y="300" width="620" height="44" rx="8" fill="#0b1a24" stroke="#3be0ff" stroke-width="4"/><rect x="1136" y="306" width="${n(608 * prog)}" height="32" rx="5" fill="#3be0ff"/>` + txt(1130, 400, lt > 1.2 ? 'DATA DELAYED…' : 'WAITING FOR DATA', 32, { fill: lt > 1.2 ? '#ffb347' : '#3be0ff', weight: 700, op: Math.sin(t * 5) > -.2 ? 1 : .4 }) + screenGlass(1100, 160, 680, 430, t, .2);
  const ring = t > S[39] - .1, lift = outBack(range(t, S[39] - .1, S[39] + .3)), slam = range(t, S[40] - .35, S[40] - .2);
  const handset: V2 = lift > 0 && slam <= 0 ? [mix(860, 432, lift), mix(740, 430, lift)] : [860, 740];
  const p: Pose = { ...STAND, turn: .35, crouch: .35, lean: -.04 + slam * .1, headTurn: lift > .5 && slam <= 0 ? -.2 : .3,
    handA: lift > 0 && slam <= 0 ? [(handset[0] - 520) / 190 + .05, (handset[1] - 1080) / 190 + .1] : [1.05, -1.72 - Math.max(0, Math.sin(t * 12)) * .04 * (lift > 0 ? 0 : 1)],
    handB: slam > 0 ? [1.45, mix(-2.7, -1.72, outCubic(slam * 4))] : [1.45, -1.72 - Math.max(0, Math.sin(t * 12 + 2)) * .04], bendA: 2, bendB: 2, shapeA: lift > 0 && slam <= 0 ? 'hold' : 'fist', frontA: 0 };
  const face = slam > 0 ? expr('furious') : lift > .5 ? expr('worried', 'angry', range(t, S[39] + .6, S[39] + 1)) : { ...expr('focused', 'worried', range(lt, 1, 1.5)), gx: .8, gy: -.2 };
  const r = stickman(p, OPER, { id: 'opc', t, seed: 12, face });
  s += place(r.svg, 520, 1080, 190) + `<rect y="760" width="${W}" height="320" fill="#1a2430" stroke="#111" stroke-width="6"/>`;
  s += `<rect x="790" y="${slam > .2 ? 742 : 740}" width="150" height="40" rx="12" fill="#23262e" stroke="#111" stroke-width="5"/>`;
  if (lift > 0 && slam <= 0) s += `<g transform="translate(${n(handset[0])} ${n(handset[1])}) rotate(${n(mix(-90, 0, lift))})"><path d="M0 -70 q-28 70 0 140" stroke="#111" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M0 -70 q-28 70 0 140" stroke="#3a3f4a" stroke-width="20" fill="none" stroke-linecap="round"/></g>`;
  if (ring) for (let i = 0; i < 3; i++) s += `<circle cx="${960 + i * 40}" cy="700" r="12" fill="${Math.sin(t * 12 + i) > 0 ? '#ff3b30' : '#3a1010'}" stroke="#111" stroke-width="3"/>`;
  if (lift > .5 && slam <= 0) s += kinetic(t, [[S[39] + .2, 'LINES'], [S[39] + .55, 'JAMMED']], 560, 200, 56, { anchor: 'middle', hold: .5, accent: ['JAMMED'] });
  if (slam > 0) s += `<rect width="${W}" height="${H}" fill="#fff" opacity="${n(.15 * (1 - range(t, S[40] - .2, S[40] - .05)))}"/>`;
  return s + glow([1440, 380], 700, '#3bc8ff', .22) + grade({ tint: '#8fa6c4', tintA: .3, vig: .6 });
}

function forcesMap(t: number, lt: number) {
  const F = fictionalWorld(7), P = (p: V2): V2 => [960 + p[0] * 1000, 560 + p[1] * 640];
  let s = `<rect width="${W}" height="${H}" fill="#0d2238"/><path d="M${F.blocA.map(p => P(p).map(n).join(' ')).join('L')}Z" fill="#3a6b8f" stroke="#0b1622" stroke-width="5"/><path d="M${F.blocB.map(p => P(p).map(n).join(' ')).join('L')}Z" fill="#8f4a3a" stroke="#0b1622" stroke-width="5"/>`;
  for (let i = 0; i < 7; i++) {
    const k = inOut(range(lt, .2 + i * .08, 1.6 + i * .08)), a: V2 = P([.6 + hash(i) * .2, -.2 + i * .07]), b: V2 = P([.1 + hash(i + 3) * .06, -.2 + i * .07]);
    const x = mix(a[0], b[0], k), y = mix(a[1], b[1], k);
    s += `<path d="M${n(a[0])} ${n(a[1])} L${n(x)} ${n(y)}" stroke="#ffcf3b" stroke-width="5" stroke-dasharray="12 8" opacity=".7"/><g transform="translate(${n(x)} ${n(y)})"><rect x="-26" y="-18" width="52" height="36" rx="5" fill="#8f4a3a" stroke="#fff" stroke-width="3"/><path d="M-14 -8 L14 8 M14 -8 L-14 8" stroke="#fff" stroke-width="3"/></g>`;
  }
  s += `<g transform="translate(1500 160)"><rect x="-150" y="-46" width="300" height="80" rx="10" fill="#ffcf3b"/>${txt(0, 14, 'YESTERDAY', 44, { anchor: 'middle', fill: '#111' })}</g>`;
  return s + badge('fiction', 90, 80, 1) + grade({ vig: .5 });
}

function leaderWoken(t: number, lt: number) {
  return `<g transform="translate(860 700) scale(${n(1.45 + lt * .04)}) translate(-860 -700)">${leaderInner(t, lt)}</g>` + grade({ vig: .6 });
}
function leaderInner(t: number, lt: number) {
  let s = `<defs>${lin('lbw', [[0, '#141a2c'], [1, '#0a0e18']])}</defs><rect width="${W}" height="${H}" fill="url(#lbw)"/>`;
  const lamp = range(lt, 1.0, 1.06);
  s += `<rect x="1300" y="160" width="360" height="400" fill="#0d1428" stroke="#2a3350" stroke-width="12"/><circle cx="1560" cy="250" r="30" fill="#e8e6d8" opacity=".8"/>`;
  s += `<rect x="200" y="560" width="1100" height="80" rx="20" fill="#3a2a22" stroke="#111" stroke-width="6"/><rect x="180" y="640" width="1140" height="300" rx="10" fill="#2a3150" stroke="#111" stroke-width="6"/>`;
  s += `<rect x="1360" y="700" width="220" height="240" fill="#3a2a22" stroke="#111" stroke-width="6"/><path d="M1430 700 L1400 580 L1520 580 L1490 700Z" fill="${lamp > 0 ? '#ffe7a8' : '#5a5040'}" stroke="#111" stroke-width="5"/>`;
  const ring = Math.sin(t * 30) * (lt < 1.2 ? 4 : 0);
  s += `<g transform="translate(${n(1440 + ring)} 690)"><rect x="-50" y="-26" width="100" height="30" rx="8" fill="#b81c24" stroke="#111" stroke-width="5"/><rect x="-36" y="-44" width="72" height="22" rx="8" fill="#d0262e" stroke="#111" stroke-width="5"/></g>`;
  const sit = outBack(range(lt, .35, 1.0)), reach = inOut(range(lt, 1.2, 1.9));
  const p: Pose = { ...STAND, turn: .55, lean: mix(-1.3, .1, sit), crouch: .7, hipX: 0, headTilt: mix(-.3, 0, sit),
    handA: [mix(-1.2, .6, sit), mix(-1.2, -1.9, sit)], handB: [mix(.2, 2.9, reach), mix(-1.0, -2.3, sit) + reach * .45], shapeB: reach > .5 ? 'hold' : 'open', bendB: 2, footA: [1.2, -1.3], footB: [1.6, -1.3] };
  const face = sit < .3 ? { ...EXPR.tired, eyeOpen: .1 } : expr('tired', 'shocked', range(lt, .7, 1.1));
  const r = stickman(p, { ...LEADER, outfit: 'jacket', color: '#3a4a6a' }, { id: 'lw', t, seed: 22, face });
  s += place(r.svg, 520, 900, 125);
  s += `<path d="M180 760 Q600 700 1320 740 L1320 940 L180 940Z" fill="#3a4470" stroke="#111" stroke-width="6"/>`;
  if (lamp > 0) s += glow([1460, 640], 700, '#ffcf8a', .45);
  return s + `<rect x="-400" y="-400" width="2800" height="2000" fill="#7d86b8" opacity="${lamp > 0 ? .2 : .45}" style="mix-blend-mode:multiply"/>`;
}

function choice(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#06080d"/>`;
  const L = outCubic(range(t, S[42] - .1, S[42] + .3)), R = outCubic(range(t, S[43] - .1, S[43] + .3));
  s += `<rect x="0" y="0" width="${n(700 * L)}" height="${H}" fill="#0b1e2e"/><rect x="${n(W - 700 * R)}" y="0" width="${n(700 * R)}" height="${H}" fill="#2e0b0b"/>`;
  if (L > .5) s += txt(350, 220, 'WAIT', 96, { anchor: 'middle', fill: '#7fd3ff', op: L }) + txt(350, 300, 'and risk losing your missiles', 30, { anchor: 'middle', weight: 600, fill: '#c9d2e0' }) + (() => { const k = ((t - S[42]) * .5) % 1; const ax = -260 + k * 260, ay = -260 + k * k * 380; return `<g transform="translate(350 600)"><path d="M-160 120 H160" stroke="#7fd3ff" stroke-width="6"/><rect x="-60" y="60" width="120" height="60" fill="#1d3a5a" stroke="#7fd3ff" stroke-width="5"/><path d="M-30 60 q30 -40 60 0" fill="#c9d2e0" stroke="#111" stroke-width="4"/><path d="M-260 -260 Q-120 -300 0 110" stroke="#ff3b30" stroke-width="4" stroke-dasharray="12 8" fill="none"/><circle cx="${n(ax)}" cy="${n(ay)}" r="12" fill="#ff3b30"/>${glow([0, 100], 160, '#ff3b30', .35 * (Math.sin(t * 5) * .5 + .5))}</g>`; })();
  if (R > .5) s += txt(W - 350, 220, 'LAUNCH', 96, { anchor: 'middle', fill: '#ff6b5b', op: R }) + txt(W - 350, 300, 'and risk war over a computer error', 30, { anchor: 'middle', weight: 600, fill: '#e0c9c9' }) + `<g transform="translate(${W - 350} 560)"><path d="M0 -120 q30 40 30 90 v130 h-60 v-130 q0 -50 30 -90Z" fill="#c9d2e0" stroke="#111" stroke-width="5"/>${puff(0, 130, 70, 5, '#ffcf8a', '#ff7a3b', .9)}</g>`;
  // leader in the middle, eyes darting between the options, sweating
  const look = Math.sin((t - S[42]) * 3.4) * (R > .5 ? 1 : .2);
  const p: Pose = { ...STAND, turn: look * .15, headTurn: look * .25, handA: [-.06, -1.95], handB: [.08, -1.9], shapeA: 'fist', shapeB: 'fist', headTilt: -look * .04 };
  const r = stickman(p, LEADER, { id: 'lc', t, seed: 23, face: { ...expr('worried', 'fear', range(lt, 2, 4)), gx: look * 1.1, sweat: 1 } });
  s += place(r.svg, 960, 1260, 260);
  const left = Math.max(0, 7 * 60 - lt * 18), mm = Math.floor(left / 60), ss = Math.floor(left % 60);
  s += `<rect x="760" y="60" width="400" height="120" rx="14" fill="#140808" stroke="#ff3b30" stroke-width="5"/>` + txt(960, 150, `0${mm}:${String(ss).padStart(2, '0')}`, 84, { anchor: 'middle', fill: '#ff3b30' });
  return s + glow([960, 540], 700, '#ff3b30', .08 + .04 * Math.sin(t * 6)) + grade({ vig: .6 });
}

function keyTurn(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#120a08"/><rect x="360" y="200" width="1200" height="760" rx="30" fill="#2a2620" stroke="#111" stroke-width="10"/>`;
  s += `<rect x="460" y="300" width="1000" height="140" rx="10" fill="#1a1612" stroke="#111" stroke-width="6"/>` + txt(960, 395, 'LAUNCH AUTHORISATION', 54, { anchor: 'middle', fill: '#ffcf3b', ls: 4 });
  const k = outBack(range(lt, .55, .9), 2.5) * 90;
  s += `<circle cx="960" cy="680" r="150" fill="#3a352c" stroke="#111" stroke-width="8"/>` + txt(790, 560, 'SAFE', 34, { anchor: 'middle', fill: '#c9d2e0' }) + txt(1130, 560, 'ARM', 34, { anchor: 'middle', fill: '#ff6b5b' });
  s += `<g transform="translate(960 680) rotate(${n(-45 + k)})"><rect x="-26" y="-110" width="52" height="220" rx="12" fill="#c9a84a" stroke="#111" stroke-width="6"/><circle r="30" fill="#8a7330" stroke="#111" stroke-width="5"/></g>`;
  const hx = 960 + Math.sin((-45 + k) * Math.PI / 180) * 70, hy = 680 - Math.cos((-45 + k) * Math.PI / 180) * 70;
  const hand = `<path d="M${n(hx + 40)} ${n(hy + 40)} L1500 1250" stroke="#111" stroke-width="124" stroke-linecap="round"/><path d="M${n(hx + 40)} ${n(hy + 40)} L1500 1250" stroke="#22314a" stroke-width="100" stroke-linecap="round"/><circle cx="${n(hx)}" cy="${n(hy)}" r="80" fill="#fff" stroke="#111" stroke-width="10"/>`;
  s += hand;
  const lit = range(lt, .9, .95);
  s += `<circle cx="1350" cy="680" r="40" fill="${lit > 0 ? '#ff3b30' : '#3a1010'}" stroke="#111" stroke-width="6"/>` + glow([1350, 680], 260, '#ff3b30', lit * .6);
  return s + grade({ vig: .65 });
}

/** Silo launch: doors part, missile rises on a column of fire and smoke; night. */
export function siloLaunch(t: number, lt: number, count = 1) {
  let s = `<defs>${lin('sls', [[0, '#05070f'], [1, '#1c2440']])}</defs><rect width="${W}" height="${H}" fill="url(#sls)"/><path d="M0 760 L1920 740 L1920 1080 L0 1080Z" fill="#1a1f1a"/>`;
  for (let k = 0; k < count; k++) {
    const x = [960, 520, 1420][k], dl = lt - k * .35, sc = [1, .55, .55][k];
    const doors = outCubic(range(dl, 0, .5)), rise = Math.max(0, dl - .6), y = 780 - rise * rise * 260 * sc;
    s += `<rect x="${x - 120 * sc}" y="${780 - 20 * sc}" width="${240 * sc}" height="${40 * sc}" fill="#2a2e2a" stroke="#111" stroke-width="5"/><rect x="${n(x - 120 * sc - doors * 120 * sc)}" y="${780 - 30 * sc}" width="${120 * sc}" height="${20 * sc}" fill="#4a504a" stroke="#111" stroke-width="4"/><rect x="${n(x + doors * 120 * sc)}" y="${780 - 30 * sc}" width="${120 * sc}" height="${20 * sc}" fill="#4a504a" stroke="#111" stroke-width="4"/>`;
    if (rise > 0) {
      for (let i = 0; i < 8; i++) s += puff(x + (hash(i + k) - .5) * 300 * sc * rise, 780 - i * 25 * sc, (80 + rise * 90) * sc, 60 + i + k * 9, '#c9c2b8', '#5a5650', .8, 6);
      s += `<path d="M${x - 20 * sc} ${n(y + 220 * sc)} L${x} ${n(Math.min(780, y + 900 * sc))} L${x + 20 * sc} ${n(y + 220 * sc)}Z" fill="#ffcf8a" opacity=".9"/>` + glow([x, y + 260 * sc], 300 * sc, '#ffb347', .8);
      s += `<g transform="translate(${x} ${n(y)}) scale(${sc})"><path d="M0 -40 q30 40 30 100 v160 h-60 v-160 q0 -60 30 -100Z" fill="#d9dde3" stroke="#111" stroke-width="6"/><path d="M-30 180 l-34 44 h34Z M30 180 l34 44 h-34Z" fill="#8a96a8" stroke="#111" stroke-width="5"/><rect x="-30" y="60" width="60" height="16" fill="#c8282d"/></g>`;
    }
  }
  s += glow([960, 760], 900, '#ff9a3b', .25 * range(lt, .6, 1.2));
  return s + particles(t, { count: 40, col: '#ffcf8a', size: 2, fall: -120, drift: 20, a: .5 * range(lt, .7, 1.2), glow: true }) + grade({ vig: .55 });
}

export const CH3: Shot[] = [
  { a: at(29) - .15, tr: 'black', r: (t, lt) => orbit(t, lt, [S[30] + 1.6]) + kinetic(t, [[S[29], '2:13'], [S[29] + .45, 'AM']], 1600, 200, 84, { anchor: 'middle', hold: 1.2 }) + chapterTitle(lt, 3, 'The First Mistake', 2.0, 96, 150) },
  { a: at(31), r: (t, lt) => irScreen(t, lt, [S[30] + 1.6, S[31] + .3, S[32] + .2, S[32] + .35, S[32] + .5]) },
  { a: at(33), r: (t, lt) => irScreen(t, lt, [0, 0, 0, 0, 0], S[33] + 1.5) },
  { a: at(34), r: (t, lt) => commandCenter(t, { theme: 'teal', alert: 1, standUp: 0, blips: [[-.8, .55, 0], [-.6, .7, 0], [-.95, .4, 0], [-.7, .35, 0], [-1.1, .62, 0]], rightText: ['TRACKS    5', 'VERIFY…', 'IMPACT  T-11:52', 'MINUTES LEFT!'],
    officer: { face: { ...expr('focused'), gx: -.4, gy: .4 }, pose: { handA: [-.1, -2.2], handB: [.35, -2.25], bendA: 2, bendB: 2, headTilt: .15 } }, cam: { x: 960, y: 560, zoom: 1.15 + lt * .04 } }) },
  { a: at(35), r: t => triptych(t) },
  { a: at(38), r: (t, lt) => operatorCU(t, lt) },
  { a: at(40) - .05, r: (t, lt) => forcesMap(t, lt) },
  { a: at(41), r: (t, lt) => leaderWoken(t, lt) },
  { a: at(42), r: (t, lt) => choice(t, lt) },
  { a: at(44), r: (t, lt) => {
    // "In our story, they don't wait." — close on the leader: breath, a small nod.
    let s = `<rect width="${W}" height="${H}" fill="#0b0d14"/>`;
    const nod = Math.sin(clamp(range(lt, .6, 1.1)) * Math.PI) * .12;
    const r = stickman({ ...STAND, turn: -.1, headTilt: nod, handA: [-.4, -1.7], handB: [.4, -1.7] }, LEADER, { id: 'ln', t, seed: 23, face: { ...expr('fear', 'determined', range(lt, .3, .8)), gy: .3 * nod / .12 } });
    s += `<g transform="translate(960 600) scale(${n(1 + lt * .05)}) translate(-960 -600)">${place(r.svg, 960, 1700, 360)}</g>`;
    return s + glow([1300, 300], 800, '#ff3b30', .18) + grade({ vig: .7 });
  } },
  { a: S[44] + 1.05, r: (t, lt) => keyTurn(t, lt) },
  { a: at(45), r: (t, lt) => siloLaunch(t, lt + .4, 3) },
  // "...the other side's satellites see something very real." — mirror room, amber, floods red
  { a: S[45] + 2.55, r: (t, lt) => commandCenter(t, { theme: 'amber', alert: range(lt, .3, .32), flashScreens: .3 * range(lt, .3, .5) * (1 - range(lt, .5, 1.2)), standUp: outBack(range(lt, .8, 1.6)), blips: [[.5, .6, .4], [.7, .4, .5], [.3, .5, .6]],
    tracks: [{ from: [-.45, .05], to: [.45, 0], t0: t - lt + .4, dur: 4 }], rightText: ['SECTOR 9  NOMINAL', 'TRACKS    3', 'CONFIRMED!'], mapLabel: 'NATION B · NATIONAL WARNING CENTRE',
    officer: { face: expr('focused', 'terror', range(lt, .5, 1.1)), pose: { handA: [-.25, -3.0], bendA: 2 } }, cam: { x: 960, y: 520, zoom: 1.0 + lt * .08 } }) },
];
