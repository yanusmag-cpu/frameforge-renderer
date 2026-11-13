// Chapter 2 — The World on Edge (0:24–1:06).
import { EXPR, expr } from '../ff2d/face.ts';
import { particles } from '../ff2d/fx.ts';
import { equirect, flatLand, fictionalWorld, globeLand, NUCLEAR_STATES, ortho } from '../ff2d/geo.ts';
import { clamp, hash, inOut, mix, outBack, outCubic, range, type V2 } from '../ff2d/motion.ts';
import { HERO, type Look, type Pose, STAND, stickman, walkPose } from '../ff2d/rig.ts';
import { glow, grade, H, lin, place, rad, txt, W } from '../ff2d/stage.ts';
import { badge, chapterTitle, COL, counter, kinetic } from '../ff2d/ui.ts';
import { newsFrame } from './kits/news.ts';
import { at, type Shot } from './shot.ts';
import { E, S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);

/** Clean documentary infographic backdrop (navy, faint grid, soft light). */
export function infoBg(t: number, tint = '#0b1424', accent = '#1d3b66') {
  let s = `<defs>${rad('ibg', [[0, accent], [1, tint]], .5, .45, .8)}</defs><rect width="${W}" height="${H}" fill="url(#ibg)"/>`;
  for (let x = 0; x <= W; x += 80) s += `<path d="M${x} 0V${H}" stroke="#fff" stroke-opacity=".035"/>`;
  for (let y = 0; y <= H; y += 80) s += `<path d="M0 ${y}H${W}" stroke="#fff" stroke-opacity=".035"/>`;
  return s + particles(t, { count: 30, col: '#9fc7ff', size: 1.6, fall: -6, drift: 4, a: .25, seed: 3 });
}
/** Real-data world map (equirectangular, Antarctica cropped). */
export function realMap(x: number, y: number, w: number, fill = '#1f3d5c', stroke = '#5fb7ff') {
  const pr = equirect(w, w / 2, x, y);
  return { svg: flatLand(pr, fill, stroke, 2), pr };
}

function fictionMap(t: number, lt: number, zoom: number, borderK: number, sanctionK: number) {
  const F = fictionalWorld(7), cx = 960, cy = 560, sx = 900 * zoom, sy = 560 * zoom;
  const P = (p: V2): V2 => [cx + p[0] * sx, cy + p[1] * sy];
  const path = (pts: V2[]) => 'M' + pts.map(p => P(p).map(n).join(' ')).join('L') + 'Z';
  let s = `<rect width="${W}" height="${H}" fill="#0d2238"/>`;
  for (let i = 0; i < 18; i++) s += `<path d="M0 ${n(60 * i + (lt * 6) % 60)} Q960 ${n(60 * i - 20)} 1920 ${n(60 * i + 10)}" stroke="#fff" stroke-opacity=".03" fill="none"/>`;
  s += `<path d="${path(F.blocA)}" fill="#3a6b8f" stroke="#0b1622" stroke-width="5"/><path d="${path(F.blocB)}" fill="#8f4a3a" stroke="#0b1622" stroke-width="5"/>`;
  for (const i of F.isles) s += `<path d="${path(i)}" fill="#55707f" stroke="#0b1622" stroke-width="4"/>`;
  s += txt(P([-.45, .02])[0], P([-.45, .02])[1], 'NATION A', 44 * zoom, { anchor: 'middle', fill: '#dff1ff', weight: 900, ls: 4, op: .9 });
  s += txt(P([.45, -.02])[0], P([.45, -.02])[1], 'NATION B', 44 * zoom, { anchor: 'middle', fill: '#ffe3dc', weight: 900, ls: 4, op: .9 });
  if (borderK > 0) {
    const b = F.border.map(P);
    s += `<path d="M${b.map(p => p.map(n).join(' ')).join('L')}" stroke="#ffcf3b" stroke-width="${n(8 * zoom)}" stroke-dasharray="${n(30 * zoom)} ${n(16 * zoom)}" fill="none" opacity="${n(borderK * (.6 + .4 * Math.sin(t * 8)))}"/>`;
    for (let i = 0; i < 6; i++) { const p = b[1 + i], sd = i % 2 ? 1 : -1, k = outBack(range(lt, 1.6 + i * .1, 1.9 + i * .1)); s += `<g transform="translate(${n(p[0] + sd * 60 * zoom)} ${n(p[1])}) scale(${n(k * zoom)})"><rect x="-22" y="-14" width="44" height="28" rx="6" fill="${sd < 0 ? '#3a6b8f' : '#8f4a3a'}" stroke="#fff" stroke-width="3"/><path d="M-8 0 h16" stroke="#fff" stroke-width="4"/></g>`; }
  }
  if (sanctionK > 0) for (let i = 0; i < 3; i++) {
    const y0 = cy - 140 * zoom + i * 140 * zoom, k = clamp(sanctionK * 3 - i * .4);
    const a: V2 = [cx - 280 * zoom, y0], b: V2 = [cx + 280 * zoom, y0];
    s += `<path d="M${n(a[0])} ${n(a[1])} Q${cx} ${n(y0 - 70 * zoom)} ${n(b[0])} ${n(b[1])}" stroke="#bfe6ff" stroke-width="${n(6 * zoom)}" fill="none" stroke-dasharray="${n(18 * zoom)} ${n(10 * zoom)}" opacity="${n(1 - k * .6)}"/>`;
    if (k > 0) s += `<g transform="translate(${cx} ${n(y0 - 36 * zoom)}) scale(${n(outBack(clamp(k)) * zoom)})"><circle r="38" fill="#d01c24" stroke="#fff" stroke-width="5"/><path d="M-16 -16 L16 16 M16 -16 L-16 16" stroke="#fff" stroke-width="8" stroke-linecap="round"/></g>`;
  }
  return s;
}

const LEADER_A: Look = { outfit: 'suit', color: '#22314a', pants: '#1c2638', tie: '#2f6fd1' };
const LEADER_B: Look = { outfit: 'suit', color: '#3a2222', pants: '#2a1a1a', tie: '#c8282d', glasses: true };

function meetingRoom(t: number, lt: number) {
  return `<g transform="translate(960 640) scale(${n(1.28 + lt * .03)}) translate(-960 -640)">${meetingInner(t, lt)}</g>` + glow([960, 200], 900, '#ffcf8a', .25, .6) + grade({ vig: .55 });
}
function meetingInner(t: number, lt: number) {
  // two leaders across a long table; anger, stand, turn and walk out; chairs spin empty.
  let s = `<defs>${lin('mrw', [[0, '#3a3226'], [1, '#231d16']])}</defs><rect width="${W}" height="${H}" fill="url(#mrw)"/>`;
  for (let x = 120; x < W; x += 260) s += `<rect x="${x}" y="60" width="150" height="520" fill="#4a3f30" stroke="#1a140d" stroke-width="4"/><rect x="${x + 10}" y="70" width="130" height="500" fill="#2e271d"/>`;
  s += `<rect x="760" y="80" width="400" height="260" fill="#1b2433" stroke="#c9a84a" stroke-width="10"/>` + txt(960, 230, 'SUMMIT', 54, { anchor: 'middle', fill: '#c9a84a', ls: 10 });
  s += `<rect y="760" width="${W}" height="320" fill="#2a1f19"/>`;
  const stand = (k0: number) => outBack(range(lt, k0, k0 + .45));
  const walkK = (k0: number) => range(lt, k0, k0 + 1.4);
  const actors: [number, number, Look, number][] = [[560, -1, LEADER_A, .55], [1360, 1, LEADER_B, .3]];
  let ppl = '', chairs = '';
  for (const [x0, side, L, d0] of actors) {
    const st = stand(d0), wk = walkK(d0 + .7), out = wk * 6;
    const dir = side; // walk away outward
    let p: Pose;
    if (wk <= 0) p = { ...STAND, turn: -.55 * side, crouch: mix(.5, 0, st), lean: -.12 * side * st, handA: side < 0 ? [-.4, -1.8] : [-.9 - .4 * st, -3.1 + .5 * (1 - st)], handB: side > 0 ? [.4, -1.8] : [.9 + .4 * st, -3.1 + .5 * (1 - st)], shapeA: side > 0 ? 'point' : 'fist', shapeB: side < 0 ? 'point' : 'fist', footA: [-.25, -.08], footB: [.25, -.08] };
    else p = walkPose(out, dir, { step: .6, turn: .85 });
    const face = wk <= 0 ? expr('angry', 'shout', range(lt, d0 - .2, d0 + .2) * (1 - range(lt, d0 + .6, d0 + .8))) : EXPR.angry;
    const r = stickman(p, L, { id: 'ld' + side, t, seed: 20 + side, face });
    ppl += place(r.svg, x0 + out * 115 * dir, 900, 115);
    const spin = Math.max(0, lt - d0) * 6 * Math.exp(-Math.max(0, lt - d0 - .3) * .8);
    chairs += `<g transform="translate(${x0} 840) scale(${n(Math.cos(spin) * .9 + .1)} 1)"><rect x="-80" y="-230" width="160" height="210" rx="20" fill="#5a1f22" stroke="#111" stroke-width="5"/></g><rect x="${x0 - 90}" y="830" width="180" height="26" rx="8" fill="#5a1f22" stroke="#111" stroke-width="5"/><path d="M${x0} 856V940 M${x0 - 60} 950H${x0 + 60}" stroke="#222" stroke-width="12"/>`;
  }
  s += chairs + ppl;
  s += `<path d="M300 780 L1620 780 L1700 860 L220 860Z" fill="#5a3e28" stroke="#111" stroke-width="6"/><rect x="220" y="860" width="1480" height="40" fill="#3e2a1b" stroke="#111" stroke-width="5"/>`;
  for (const [x, sd] of [[600, -1], [1320, 1]] as V2[]) s += `<rect x="${x - 50}" y="752" width="100" height="26" rx="3" fill="#f4f1ea" stroke="#111" stroke-width="3"/><rect x="${x + sd * 40}" y="${n(700 - Math.sin(lt * 4) * 2)}" width="8" height="70" fill="#999"/><rect x="${x + sd * 40 - 30}" y="690" width="70" height="44" fill="${sd < 0 ? '#3a6b8f' : '#8f4a3a'}" stroke="#111" stroke-width="3"/>`;
  return s;
}

function ocean(t: number, lt: number) {
  let s = `<defs>${lin('osk', [[0, '#7fa6c9'], [1, '#d7e3ea']])}${lin('osea', [[0, '#2c5a7a'], [1, '#12324a']])}</defs><rect width="${W}" height="420" fill="url(#osk)"/><rect y="420" width="${W}" height="660" fill="url(#osea)"/>`;
  for (let i = 0; i < 40; i++) { const y = 430 + (i * i * .4) % 640, x = (hash(i) * W + lt * (20 + i)) % W; s += `<path d="M${n(x)} ${n(y)} q20 -6 40 0" stroke="#cfe6f5" stroke-width="${n(1 + y / 400)}" fill="none" opacity=".35"/>`; }
  // three warships turn: heading angle eases from 0 to 25°; wakes trace the arc
  for (let k = 0; k < 3; k++) {
    const turn = inOut(range(lt, .2 + k * .15, 1.4 + k * .15)) * 22, x = 380 + k * 520 + lt * 40, y = 560 + k * 140, sc = .7 + k * .25;
    let wake = '';
    for (let j = 1; j < 14; j++) { const ang = (turn * (1 - j / 14)) * Math.PI / 180; wake += `${j === 1 ? 'M' : 'L'}${n(x - Math.cos(ang) * j * 40 * sc)} ${n(y + Math.sin(ang) * j * 18 * sc)}`; }
    s += `<path d="${wake}" stroke="#e8f4fb" stroke-width="${n(14 * sc)}" fill="none" opacity=".55" stroke-linecap="round"/>`;
    s += `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(-turn)}) scale(${n(sc)})"><path d="M-170 0 L150 0 L190 -24 L-160 -24Z" fill="#59636f" stroke="#111" stroke-width="5"/><path d="M-160 0 L170 0 L150 18 L-150 18Z" fill="#3b434d" stroke="#111" stroke-width="5"/><rect x="-60" y="-70" width="90" height="46" fill="#6b7581" stroke="#111" stroke-width="5"/><rect x="-30" y="-110" width="30" height="40" fill="#6b7581" stroke="#111" stroke-width="5"/><path d="M-15 -110 V-150" stroke="#111" stroke-width="5"/><path d="M60 -24 h50" stroke="#111" stroke-width="10"/></g>`;
  }
  return s + grade({ tint: '#c8d4e2', tintA: .2, vig: .45 });
}

function runway(t: number, lt: number) {
  let s = `<defs>${lin('rsk', [[0, '#9cb6cf'], [1, '#e6dccb']])}</defs><rect width="${W}" height="${H}" fill="url(#rsk)"/>`;
  s += `<path d="M0 640 L1920 600 L1920 1080 L0 1080Z" fill="#7d8a6a"/><path d="M0 760 L1920 700 L1920 860 L0 980Z" fill="#3f4247"/>`;
  for (let i = 0; i < 14; i++) s += `<path d="M${n(i * 150 - (lt * 200) % 150)} ${n(870 - i * 3.5)} h80" stroke="#f4f1ea" stroke-width="8"/>`;
  s += `<rect x="1500" y="470" width="300" height="150" fill="#9aa1a8" stroke="#111" stroke-width="5"/><path d="M1490 470 Q1650 380 1810 470Z" fill="#8a9097" stroke="#111" stroke-width="5"/>`;
  for (let k = 0; k < 3; k++) {
    const t0 = .1 + k * .55, u = Math.max(0, lt - t0);
    const x = 200 + u * u * 420 + k * 120, y = 800 - k * 25 - Math.max(0, u - .9) ** 2 * 260, rot = -Math.min(14, Math.max(0, u - .9) * 18);
    s += `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(rot)}) scale(${n(.9 - k * .15)})"><path d="M-150 -10 L120 -18 Q170 -16 180 0 Q170 12 120 10 L-150 8Z" fill="#7d8792" stroke="#111" stroke-width="5"/><path d="M-20 -6 L-90 -70 L-50 -70 L40 -8Z M-20 6 L-80 52 L-40 52 L40 8Z" fill="#6b7480" stroke="#111" stroke-width="5"/><path d="M-150 -8 L-180 -60 L-140 -60 L-110 -10Z" fill="#6b7480" stroke="#111" stroke-width="5"/><path d="M110 -14 q30 -10 50 2" fill="#3c4a5a"/>`;
    if (u > 0) s += `<ellipse cx="-170" cy="0" rx="${n(30 + 20 * Math.sin(t * 40))}" ry="9" fill="#ffb347" opacity=".9"/>`;
    s += `</g>`;
  }
  return s + grade({ vig: .4 });
}

function tradingFloor(t: number, lt: number, d1: number, d2: number) {
  let s = `<rect width="${W}" height="${H}" fill="#0a1220"/>`;
  s += `<rect x="260" y="70" width="1400" height="520" rx="10" fill="#050b14" stroke="#24354f" stroke-width="8"/>`;
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const u = i / 120;
    const tu = u * 3.2; // timeline in seconds across the chart
    if (tu > lt + .4) break;
    let v = .32 + Math.sin(u * 30) * .015 + Math.sin(u * 71) * .008;
    v += .18 * outCubic(range(tu, d1, d1 + .35)) + .26 * outCubic(range(tu, d2, d2 + .35));
    pts.push(`${n(300 + u * 1320)} ${n(110 + v * 440)}`);
  }
  s += `<path d="M${pts.join('L')}" stroke="#ff4b4b" stroke-width="7" fill="none" stroke-linejoin="round"/>`;
  const drop = outCubic(range(lt, d1, d1 + .3)) * 3.1 + outCubic(range(lt, d2, d2 + .3)) * 4.6;
  s += txt(320, 150, 'GLOBAL INDEX', 34, { fill: '#9fb4d0', weight: 800, ls: 4 }) + txt(1620, 160, `▼ ${drop.toFixed(1)}%`, 64, { anchor: 'end', fill: '#ff4b4b', weight: 900 });
  // traders: front row, back view at monitors, reacting at each dip
  for (let i = 0; i < 4; i++) {
    const x = 330 + i * 420, react = Math.max(outBack(range(lt, d1 + i * .06, d1 + .3 + i * .06)) * (1 - range(lt, d1 + .6, d1 + 1)), outBack(range(lt, d2 + i * .05, d2 + .3 + i * .05)));
    const p: Pose = { ...STAND, back: 1, crouch: .3, lean: -.05 * react, handA: [-.3 - .1 * react, mix(-2.25, -3.45, react)], handB: [.3 + .1 * react, mix(-2.25, -3.45, react)], shapeA: 'open', shapeB: 'open', headLift: react * .05 };
    const r = stickman(p, { outfit: 'suit', color: ['#2a3550', '#3a3a3a', '#2a4a3a', '#4a2a2a'][i], pants: '#1a1a1a' }, { id: 'tr' + i, t, seed: 30 + i, face: EXPR.neutral });
    s += place(r.svg, x, 1080, 120);
    s += `<rect x="${x - 120}" y="840" width="240" height="140" rx="6" fill="#0b0f14" stroke="#111" stroke-width="5"/><rect x="${x - 108}" y="852" width="216" height="116" fill="#1a0c10"/><path d="M${x - 100} 900 l40 -10 l30 30 l40 -20 l40 40 l40 10" stroke="#ff4b4b" stroke-width="4" fill="none"/>`;
  }
  s += `<rect y="980" width="${W}" height="100" fill="#141c28" stroke="#111" stroke-width="5"/>`;
  return s + glow([960, 330], 900, '#ff2b3b', .18 + .12 * Math.max(range(lt, d1, d1 + .2) * (1 - range(lt, d1 + .6, d1 + 1)), range(lt, d2, d2 + .2)), .55) + grade({ vig: .55 });
}

/** Daytime/night street with café, TV shop window; hero walks with coffee, scrolls, stops, shrugs. */
export function street(t: number, lt: number, mode: 'walk' | 'shop' | 'night') {
  const night = mode === 'night';
  let s = `<defs>${lin('stsky' + mode, night ? [[0, '#0a1024'], [1, '#1d2747']] : [[0, '#8fc0e8'], [1, '#e7eef2']])}</defs>`;
  const camX = mode === 'walk' ? 760 + lt * 115 * .62 * 2.2 : 1400;
  const cam = (p: number) => `translate(${n(-(camX - 960) * p)} 0)`;
  // far skyline
  s += `<rect width="${W}" height="${H}" fill="url(#stsky${mode})"/><g transform="${cam(.3)}">`;
  for (let i = 0; i < 26; i++) { const x = -400 + i * 150, h = 140 + hash(i) * 220; s += `<rect x="${x}" y="${n(560 - h)}" width="140" height="${n(h)}" fill="${night ? '#141b33' : '#b6c4d1'}"/>`; }
  s += `</g><g transform="${cam(1)}">`;
  // shopfronts
  const shops: [number, string, string][] = [[0, '#c96a4a', 'CAFÉ'], [560, '#4a6fa5', 'BOOKS'], [1120, '#3c3c46', 'ELECTRONICS'], [1680, '#6a8a4a', 'MARKET'], [2240, '#a54a6a', 'BAKERY'], [2800, '#4a8a8a', 'PHARMACY'], [3360, '#8a6a4a', 'HARDWARE']];
  for (const [x, c, name] of shops) {
    s += `<rect x="${x}" y="300" width="520" height="560" fill="${night ? '#20202c' : c}" stroke="#111" stroke-width="6"/><rect x="${x + 20}" y="330" width="480" height="80" fill="#1a1a1f" stroke="#111" stroke-width="4"/>` + txt(x + 260, 386, name, 46, { anchor: 'middle', fill: night ? '#555' : '#f4f1ea', weight: 900, ls: 4 });
    s += `<rect x="${x + 40}" y="450" width="300" height="300" fill="${night ? '#0d1220' : '#cfe3f0'}" stroke="#111" stroke-width="6"/><rect x="${x + 370}" y="470" width="110" height="390" fill="#2a2a30" stroke="#111" stroke-width="6"/>`;
    if (name === 'ELECTRONICS') s += `<svg x="${x + 52}" y="470" width="276" height="160" viewBox="0 0 1920 1080" preserveAspectRatio="none">${newsFrame(t, { lt: lt + 3, headline: night ? 'TENSIONS SOAR' : 'TENSIONS EASE?', mood: night ? 'alert' : 'calm', chart: 'updown', breakingAt: 0 })}</svg><rect x="${x + 52}" y="640" width="276" height="96" fill="#111"/>`;
    if (name === 'CAFÉ' && !night) s += `<path d="M${x - 10} 430 L${x + 530} 430 L${x + 560} 470 L${x - 40} 470Z" fill="#f4f1ea" stroke="#111" stroke-width="5"/>${Array.from({ length: 9 }, (_, i) => `<rect x="${x - 30 + i * 66}" y="430" width="33" height="40" fill="#c0392b"/>`).join('')}`;
  }
  for (let x = 0; x < 3600; x += 600) s += `<rect x="${x + 480}" y="420" width="12" height="440" fill="#333"/><circle cx="${x + 486}" cy="410" r="20" fill="${night ? '#ffd78a' : '#ddd'}" stroke="#111" stroke-width="4"/>` + (night ? glow([x + 486, 420], 260, '#ffc86b', .35) : '');
  s += `<rect x="-600" y="860" width="4800" height="80" fill="${night ? '#2a2c34' : '#b9b4aa'}"/><rect x="-600" y="940" width="4800" height="200" fill="${night ? '#14151a' : '#4a4d55'}"/>`;
  for (let x = -600; x < 4200; x += 160) s += `<path d="M${x} 860 V940" stroke="${night ? '#1d1e24' : '#a29c90'}" stroke-width="3"/>`;
  // hero
  if (mode !== 'night') {
    let p: Pose, hx: number, face;
    if (mode === 'walk') {
      const dist = lt * .62 * 2.2;
      const scroll = range(t, S[25] - .2, S[25] + .3);
      p = walkPose(dist, 1, { carryB: scroll > 0 ? [mix(.12, .45, scroll), mix(-1.66, -2.75, scroll)] : undefined, turn: .7 });
      if (scroll > 0) p.handA = [mix(p.handA[0], .3, scroll), mix(p.handA[1], -2.6, scroll)];
      if (scroll > 0) { p.bendA = 2; p.bendB = 2; p.frontA = 1; }
      hx = 760 + dist * 115;
      face = scroll > 0 ? { ...EXPR.calm, gx: .5, gy: .7 } : { ...expr('calm', 'happy', .4), gx: .4 };
    } else {
      // stop at the TV shop, watch, shrug (anticipation → up → settle), turn and go
      const shrug = outBack(range(t, S[27] - .1, S[27] + .3)) * (1 - range(t, S[27] + .9, S[27] + 1.3));
      p = { ...STAND, turn: -.45, handA: [-.62 - shrug * .25, -1.62 - shrug * .9], handB: [.62 + shrug * .25, -1.62 - shrug * .9], shapeA: shrug > .1 ? 'open' : 'fist', shapeB: shrug > .1 ? 'open' : 'fist', headTilt: shrug * .12, headLift: shrug * .05 };
      p.handB = [p.handB[0], p.handB[1]];
      hx = 1590; face = shrug > .2 ? expr('smug', 'confused', .3) : { ...expr('curious'), gx: -.6, gy: -.3 };
    }
    const r = stickman(p, HERO, { id: 'sh', t, seed: 3, face });
    s += place(r.svg, hx, 900, 115);
    const cup = mode === 'walk' && range(t, S[25] - .2, S[25] + .3) <= 0 ? r.j.handB : null;
    if (cup) s += `<g transform="translate(${n(hx + cup[0] * 115)} ${n(900 + cup[1] * 115 - 26)})"><path d="M-16 -22 L16 -22 L12 22 L-12 22Z" fill="#f4f1ea" stroke="#111" stroke-width="4"/><rect x="-18" y="-30" width="36" height="10" rx="3" fill="#6b3d2a" stroke="#111" stroke-width="3"/><rect x="-14" y="-4" width="28" height="12" fill="#c96a4a"/></g>`;
    if (mode === 'walk' && range(t, S[25] - .2, S[25] + .3) > 0) { const ph = r.j.handB; s += `<rect x="${n(hx + ph[0] * 115 - 14)}" y="${n(900 + ph[1] * 115 - 50)}" width="28" height="50" rx="5" fill="#1d1f26" stroke="#111" stroke-width="3"/><rect x="${n(hx + ph[0] * 115 - 10)}" y="${n(900 + ph[1] * 115 - 46)}" width="20" height="40" fill="#7fb8ff"/>`; }
    // passers-by
    for (let k = 0; k < 3; k++) {
      const dir = k % 2 ? -1 : 1, d = lt * .5 * 2 + k * 3, x0 = [300, 2600, 1100][k];
      const pp = walkPose(d, dir, { step: .5 });
      const rr = stickman(pp, { outfit: k === 1 ? 'suit' : 'jacket', color: ['#3f6d48', '#2a3550', '#c9a24a'][k], pants: '#26272e', hat: k === 2 ? 'cap' : undefined }, { id: 'pb' + k, t, seed: 40 + k, face: EXPR.calm });
      s += place(rr.svg, x0 + d * 100 * dir, 990, 100);
    }
  }
  s += `</g>`;
  return s + (night ? grade({ tint: '#8a90c8', tintA: .35, vig: .65 }) : grade({ vig: .35 }));
}

export const CH2: Shot[] = [
  { a: at(11), tr: 'white', r: (t, lt) => {
    const g = ortho([960, 600], 380, -20 + t * 6, 18);
    let s = infoBg(t) + glow([960, 600], 600, '#3a8dff', .25) + `<circle cx="960" cy="600" r="380" fill="#123a5e"/>` + globeLand(g, '#2f6b52', '#0b2236', 2) + `<circle cx="960" cy="600" r="380" fill="none" stroke="#7fd3ff" stroke-width="3" opacity=".5"/>`;
    s += badge('fiction', 250, 330, range(t, S[11] + 1.6, S[11] + 2.0)) + badge('real', 1340, 330, range(t, S[12] + .9, S[12] + 1.3), 'Science & history in this video are real') ;
    return s + chapterTitle(lt, 2, 'The World on Edge', 2.4) + grade({ vig: .5 });
  } },
  { a: at(13), r: (t, lt) => {
    const { svg, pr } = realMap(160, 160, 1600); let s = infoBg(t) + svg;
    NUCLEAR_STATES.forEach((c, i) => { const p = pr(c.at), k = outBack(range(t, S[13] + .5 + i * .14, S[13] + .8 + i * .14)); s += `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(16 * k)}" fill="${COL.alert}" stroke="#fff" stroke-width="3"/><circle cx="${n(p[0])}" cy="${n(p[1])}" r="${n(16 + (t * 30 + i * 9) % 40)}" fill="none" stroke="${COL.alert}" stroke-width="2" opacity="${n(k * (1 - ((t * 30 + i * 9) % 40) / 40))}"/>` + txt(p[0], p[1] - 26, c.name, 20, { anchor: 'middle', weight: 800, op: k }); });
    s += `<rect x="560" y="880" width="800" height="150" rx="16" fill="#0b0f16" fill-opacity=".8"/>` + counter(t, S[13] + 1.4, S[13] + 2.8, 12000, 960, 980, 92, { prefix: '~' }) + txt(960, 1018, 'NUCLEAR WARHEADS', 24, { anchor: 'middle', weight: 700, fill: '#c9d2e0', ls: 6 });
    return s + badge('real', 90, 80, range(lt, 0, .3), 'Federation of American Scientists, 2026 estimate') + grade({ vig: .45 });
  } },
  { a: at(14), r: (t, lt) => {
    let s = infoBg(t, '#14090c', '#3a1420');
    const cols = 24, rows = 5; // 120 icons ≈ 100 warheads each
    for (let i = 0; i < cols * rows; i++) {
      const x = 270 + (i % cols) * 58, y = 300 + Math.floor(i / cols) * 92, k = outBack(range(lt, i * .006, i * .006 + .3));
      const hot = i < 20 && t > S[14] + .9 + i * .03;
      s += `<g transform="translate(${x} ${y}) scale(${n(k)})"><path d="M0 -34 Q12 -20 12 0 L12 26 L-12 26 L-12 0 Q-12 -20 0 -34Z" fill="${hot ? COL.alert : '#5a6476'}" stroke="#111" stroke-width="3"/><path d="M-12 26 L-18 36 L18 36 L12 26Z" fill="${hot ? '#a01818' : '#3d4452'}"/></g>`;
      if (hot) s += glow([x, y], 40, '#ff3b30', .3 + .2 * Math.sin(t * 6 + i));
    }
    s += kinetic(t, [[S[14] + .2, '≈2,000'], [S[14] + .7, 'ON'], [S[14] + .85, 'HIGH'], [S[14] + 1.05, 'ALERT']], 960, 860, 76, { anchor: 'middle', accent: ['≈2,000'] });
    s += txt(960, 940, 'Ready to launch within minutes', 34, { anchor: 'middle', weight: 600, fill: '#e8c8c8', op: range(t, S[14] + 3, S[14] + 3.4) });
    return s + badge('real', 90, 80, 1, 'FAS 2026: ~2,100 warheads on high operational alert') + grade({ vig: .5 });
  } },
  { a: at(15), r: (t, lt) => {
    let s = infoBg(t, '#12100a', '#2e2614');
    const curl = range(lt, 4.0, 4.4), stamp = outBack(range(t, E[15] - .7, E[15] - .45), 2.6);
    s += `<g transform="translate(960 560) rotate(${n(-3 + lt * .6)}) scale(${n(.95 + lt * .015)})"><rect x="-360" y="-420" width="720" height="840" fill="#efe6cf" stroke="#111" stroke-width="6"/>`;
    s += txt(0, -330, 'TREATY ON MEASURES FOR THE FURTHER', 22, { anchor: 'middle', fill: '#3a3226', weight: 700 }) + txt(0, -296, 'REDUCTION AND LIMITATION OF STRATEGIC', 22, { anchor: 'middle', fill: '#3a3226', weight: 700 }) + txt(0, -262, 'OFFENSIVE ARMS', 22, { anchor: 'middle', fill: '#3a3226', weight: 700 }) + txt(0, -200, '"NEW START"', 46, { anchor: 'middle', fill: '#111', weight: 900 });
    for (let i = 0; i < 12; i++) s += `<rect x="-300" y="${-140 + i * 34}" width="${n(560 - hash(i) * 160)}" height="10" rx="5" fill="#b8ac90"/>`;
    s += `<path d="M-280 330 q40 -30 80 0 t80 0" stroke="#1a2a6a" stroke-width="4" fill="none"/><path d="M80 330 q30 -40 70 -5 t90 -5" stroke="#6a1a1a" stroke-width="4" fill="none"/>` + txt(-200, 380, '2010', 22, { anchor: 'middle', fill: '#3a3226' }) + txt(160, 380, '2010', 22, { anchor: 'middle', fill: '#3a3226' });
    if (stamp > 0) s += `<g transform="translate(20 40) rotate(-14) scale(${n(stamp)})" opacity=".92"><rect x="-260" y="-70" width="520" height="140" rx="10" fill="none" stroke="#c8282d" stroke-width="12"/>${txt(0, 30, 'EXPIRED', 96, { anchor: 'middle', fill: '#c8282d', weight: 900, ls: 8 })}${txt(0, 62, 'FEB 2026', 26, { anchor: 'middle', fill: '#c8282d', weight: 800 })}</g>`;
    s += `</g>`;
    return s + badge('real', 90, 80, 1, 'New START (US–Russia) expired 5 Feb 2026') + `<rect width="${W}" height="${H}" fill="#000" opacity="${n(curl * .0)}"/>` + grade({ vig: .55 });
  } },
  { a: at(16), r: (t, lt) => fictionMap(t, lt, mix(.95, 1.25, inOut(range(lt, 0, 3.6))), range(t, S[17] - .1, S[17] + .3), range(t, S[18], S[18] + .7)) + badge('fiction', 90, 80, range(lt, .1, .4)) + kinetic(t, [[S[17], 'BORDER'], [S[17] + .3, 'DISPUTE']], 960, 1010, 60, { anchor: 'middle', hold: .7 }) + kinetic(t, [[S[18] + .1, 'SANCTIONS']], 960, 1010, 60, { anchor: 'middle', hold: .6, accent: ['SANCTIONS'] }) + grade({ vig: .5 }) },
  { a: at(19), r: (t, lt) => meetingRoom(t, lt) },
  { a: at(20), r: (t, lt) => ocean(t, lt) + kinetic(t, [[S[20] + .1, 'WARSHIPS'], [S[20] + .5, 'CHANGE'], [S[20] + .8, 'COURSE']], 960, 160, 56, { anchor: 'middle', hold: .4 }) },
  { a: at(21), r: (t, lt) => runway(t, lt) },
  { a: at(22), r: (t, lt) => tradingFloor(t, lt, .55, 1.55) },
  { a: at(23), r: (t, lt) => street(t, lt + .3, 'walk') + badge('fiction', 90, 80, 1 - range(lt, 2, 2.3)) },
  { a: at(26), r: (t, lt) => street(t, lt, 'shop') },
  { a: at(28), tr: 'black', r: (t, lt) => street(t, lt, 'night') + kinetic(t, [[S[28] + .5, 'UNTIL'], [S[28] + .8, 'ONE'], [S[28] + 1.0, 'NIGHT...']], 960, 200, 64, { anchor: 'middle', hold: .5 }) },
];
