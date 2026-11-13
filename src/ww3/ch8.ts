// Chapter 8 — The Aftermath (4:39–5:18): restrained, human, adapting.
import { EXPR, expr } from '../ff2d/face.ts';
import { particles, rays } from '../ff2d/fx.ts';
import { hash, inOut, mix, outBack, range } from '../ff2d/motion.ts';
import { HERO, type Look, type Pose, STAND, stickman, walkPose } from '../ff2d/rig.ts';
import { glow, grade, H, lin, place, txt, W } from '../ff2d/stage.ts';
import { chapterTitle, kinetic } from '../ff2d/ui.ts';
import { sootGlobe } from './ch7.ts';
import { cityScape } from './kits/city.ts';
import { at, type Shot } from './shot.ts';
import { S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);
const CIV = (i: number): Look => ({ outfit: 'jacket', color: ['#5a6a4a', '#4a5a7a', '#7a5a4a', '#6a4a6a', '#4a6a6a', '#7a6a3a'][i % 6], pants: '#2a2b30', hat: i % 5 === 2 ? 'cap' : i % 5 === 4 ? 'bun' : undefined, hair: '#5a4a3a' });

function dawnRidge(t: number, lt: number) {
  let s = cityScape(t, { sky: 'dawn', cam: { x: 960, y: 520, zoom: 1.05 + lt * .015 }, ruins: .7, haze: .3 });
  s += rays([1500, 420], t, '#ffd8a0', .08, 8, 1600, 1.4, Math.PI * .75);
  s += `<path d="M0 900 Q500 820 1100 880 T1920 860 V1080 H0Z" fill="#2a2420"/>`;
  const r = stickman({ ...STAND, back: 1, turn: .2, handA: [-.48, -1.64], handB: [.48, -1.64] }, { ...HERO, mask: false }, { id: 'dr', t, seed: 3, face: EXPR.sad });
  s += place(r.svg, 600, 880, 120);
  return s + chapterTitle(lt, 8, 'The Aftermath', 2.0) + kinetic(t, [[S[108] + .1, 'MONTHS'], [S[108] + .45, 'LATER']], 1500, 200, 60, { anchor: 'middle', hold: 1.2 }) + grade({ tint: '#c9b8a0', tintA: .2, vig: .55 });
}

function camp(t: number, lt: number) {
  let s = `<defs>${lin('cp', [[0, '#8a8e94'], [1, '#c9c2b4']])}</defs><rect width="${W}" height="${H}" fill="url(#cp)"/><rect y="640" width="${W}" height="440" fill="#7a6e5a"/>`;
  for (let row = 0; row < 3; row++) for (let i = 0; i < 10; i++) {
    const x = -60 + i * 220 + row * 90, y = 640 + row * 80, sc = .6 + row * .2;
    s += `<g transform="translate(${x} ${y}) scale(${sc})"><path d="M-110 60 L0 -70 L110 60Z" fill="${row % 2 ? '#d8d2c0' : '#c9c3b0'}" stroke="#111" stroke-width="6"/><path d="M0 -70 V60 M-30 60 L0 0 L30 60" stroke="#111" stroke-width="5" fill="#3a3530"/></g>`;
  }
  s += `<rect x="200" y="300" width="14" height="380" fill="#555"/><path d="M214 310 h180 v110 h-180Z" fill="#2f6fd1" stroke="#111" stroke-width="4"/>` + txt(304, 380, 'RELIEF', 34, { anchor: 'middle' });
  // aid station + queue that keeps growing (families arriving from the right)
  s += `<rect x="360" y="760" width="420" height="120" fill="#e9e4d8" stroke="#111" stroke-width="6"/><path d="M340 760 L800 760 L760 690 L380 690Z" fill="#2f6fd1" stroke="#111" stroke-width="6"/>` + txt(570, 740, 'FOOD & WATER', 30, { anchor: 'middle' });
  const queueN = 6 + Math.floor(range(t, S[110], S[110] + 3) * 7);
  for (let i = 0; i < 13; i++) {
    const arrive = i < queueN;
    const qx = 860 + i * 92, wx = 2100 + (i - 6) * 300 - lt * 160;
    const walking = !arrive || (i >= 6 && wx > qx);
    const x = arrive && !(i >= 6 && wx > qx) ? qx : Math.max(qx, wx);
    const p: Pose = walking ? walkPose(lt * 1.4 + i, -1, { step: .5 }) : { ...STAND, turn: -.6, handA: [-.45, -1.66], handB: [.4, -1.66], headTilt: Math.sin(t + i) * .05 };
    const kid = i % 4 === 3;
    const r = stickman(p, CIV(i), { id: 'cq' + i, t, seed: 90 + i, face: expr(i % 3 ? 'tired' : 'sad') });
    s += place(r.svg, x, 1000, kid ? 80 : 110);
  }
  return s + kinetic(t, [[S[110] + 2.6, 'TOO'], [S[110] + 2.85, 'MANY'], [S[110] + 3.1, 'CRISES']], 1300, 200, 56, { anchor: 'middle', hold: 1 }) + grade({ tint: '#d8d0c0', tintA: .2, vig: .5 });
}

function barter(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#3a3028"/><rect y="560" width="${W}" height="520" fill="#6a4a30" stroke="#111" stroke-width="6"/>`;
  for (let i = 0; i < 14; i++) { const k = (lt * .4 + hash(i)) % 1; s += `<g transform="translate(${n(200 + hash(i * 3) * 600 + k * 900)} ${n(200 + Math.sin(k * 8 + i) * 80 - k * 160)}) rotate(${n(k * 400 + i * 30)})" opacity="${n(.8 * (1 - k))}"><rect x="-50" y="-24" width="100" height="48" fill="#8ab47a" stroke="#2a4a2a" stroke-width="3"/><circle r="12" fill="none" stroke="#2a4a2a" stroke-width="3"/></g>`; }
  s += `<g transform="translate(560 640)"><rect x="-80" y="-160" width="160" height="200" rx="14" fill="#c8282d" stroke="#111" stroke-width="7"/><rect x="-30" y="-200" width="60" height="44" fill="#c8282d" stroke="#111" stroke-width="6"/>${txt(0, -40, 'FUEL', 34, { anchor: 'middle' })}</g>`;
  for (let i = 0; i < 4; i++) s += `<g transform="translate(${880 + i * 70} 620)"><rect x="-26" y="-80" width="52" height="100" rx="6" fill="#2a2a2e" stroke="#111" stroke-width="5"/><rect x="-26" y="-80" width="52" height="30" fill="#e3b341"/></g>`;
  for (let i = 0; i < 3; i++) s += `<g transform="translate(${1300 + i * 120} 620)"><rect x="-50" y="-90" width="100" height="120" rx="10" fill="#b8bcc4" stroke="#111" stroke-width="6"/><rect x="-50" y="-60" width="100" height="56" fill="${['#c8282d', '#2f6fd1', '#3a8a5a'][i]}"/></g>`;
  // two hands trading across the table
  const k = inOut(range(lt, .6, 1.6));
  s += `<g transform="translate(${n(mix(1900, 1450, k))} ${n(mix(700, 500, k))})"><path d="M0 0 L600 300" stroke="#111" stroke-width="120" stroke-linecap="round"/><path d="M0 0 L600 300" stroke="#4a5a7a" stroke-width="98" stroke-linecap="round"/><circle r="78" fill="#fff" stroke="#111" stroke-width="9"/></g>`;
  s += `<g transform="translate(${n(mix(20, 560, k))} ${n(mix(700, 440, k))})"><path d="M0 0 L-600 300" stroke="#111" stroke-width="120" stroke-linecap="round"/><path d="M0 0 L-600 300" stroke="#d8262b" stroke-width="98" stroke-linecap="round"/><circle r="78" fill="#fff" stroke="#111" stroke-width="9"/></g>`;
  return s + kinetic(t, [[S[111] + .2, 'MONEY'], [S[111] + .55, 'MEANS'], [S[111] + .85, 'LITTLE']], 960, 160, 64, { anchor: 'middle', hold: 1.2 }) + glow([960, 400], 900, '#ffb35c', .2) + grade({ vig: .55 });
}

function restorePower(t: number) {
  let s = cityScape(t, { sky: 'night', cam: { x: 960, y: 560, zoom: 1.15 }, lit: .5, blackout: { t0: -10, dur: .01 }, restore: { t0: S[112] + 1.2, dur: 2.4 }, ruins: .3, stars: .7 });
  s += `<rect y="900" width="${W}" height="180" fill="#07090f"/><path d="M200 900 V520 M140 560 H260 M150 600 H250" stroke="#2a2e38" stroke-width="16"/><path d="M200 520 C700 640 1200 600 1900 560" stroke="#1a1d26" stroke-width="6" fill="none"/>`;
  const cheer = outBack(range(t, S[112] + 1.6, S[112] + 2.0)) * (1 - range(t, S[112] + 3.4, S[112] + 3.8));
  const p: Pose = { ...STAND, turn: .4, handA: [-.4, -1.7], handB: [.4 + cheer * .3, mix(-2.2, -3.8, cheer)], bendB: 2, shapeB: cheer > .3 ? 'fist' : 'hold' };
  const r = stickman(p, { outfit: 'uniform', color: '#e3b341', pants: '#2a3a5a', hat: 'helmet' }, { id: 'en', t, seed: 95, face: expr('focused', 'happy', cheer) });
  s += place(r.svg, 360, 1060, 150) + glow([440, 790], 120, '#fff1c4', .5);
  return s + kinetic(t, [[S[112] + 2.2, 'ONE'], [S[112] + 2.45, 'DISTRICT'], [S[112] + 2.85, 'AT'], [S[112] + 3.0, 'A'], [S[112] + 3.1, 'TIME']], 1200, 200, 52, { anchor: 'middle', hold: .6 }) + grade({ vig: .55 });
}

function farmer(t: number, lt: number) {
  let s = `<defs>${lin('fm', [[0, '#7a7e86'], [1, '#b8b2a2']])}</defs><rect width="${W}" height="${H}" fill="url(#fm)"/><circle cx="1550" cy="230" r="60" fill="#d8d0b8" opacity=".6"/>`;
  s += `<rect y="680" width="${W}" height="400" fill="#5a4a36"/>`;
  for (let r = 0; r < 6; r++) s += `<path d="M-100 ${720 + r * 60} Q960 ${700 + r * 62} 2020 ${720 + r * 60}" stroke="#4a3a28" stroke-width="10" fill="none"/>`;
  const plant = (i: number) => outBack(range(lt, .6 + i * .5, 1.2 + i * .5));
  for (let i = 0; i < 5; i++) { const k = plant(i); if (k > 0) s += `<g transform="translate(${1000 + i * 150} ${830 + (i % 2) * 20}) scale(${n(k)})"><path d="M0 0 V-40" stroke="#6a9a4a" stroke-width="6"/><path d="M0 -30 q-26 -10 -30 -30 q24 4 30 30 M0 -38 q24 -12 30 -32 q-24 6 -30 32" fill="#7ab45a" stroke="#2a4a1a" stroke-width="3"/></g>`; }
  const bend = .5 + .5 * Math.sin(lt * 3.4);
  const d = lt * .5;
  const p: Pose = { ...STAND, turn: .7, lean: .35 + bend * .25, crouch: .2, handA: [.6 + bend * .2, -1.1 + bend * .3], handB: [.9, -1.0 + bend * .2], bendA: 2, bendB: 2, footA: [-.1, -.08], footB: [.45, -.08] };
  const r = stickman(p, { outfit: 'jacket', color: '#6a7a4a', pants: '#3a3a2a', hat: 'cap', hair: '#8a6a3a' }, { id: 'fa', t, seed: 96, face: { ...expr('determined', 'tired', .3), gy: .8 } });
  s += place(r.svg, 900 + d * 120, 880, 160);
  return s + particles(t, { count: 40, col: '#e8e6e0', size: 2, fall: 30, drift: 20, a: .5 }) + grade({ tint: '#c8c4b8', tintA: .2, vig: .55 });
}

function radioRoom(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#0e1216"/><rect x="1000" y="160" width="760" height="420" rx="12" fill="#1a1f26" stroke="#111" stroke-width="8"/>`;
  ['CALLING… NO REPLY', 'CALLING… NO REPLY', 'CALLING… '].forEach((l, i) => { if (lt > .3 + i * .6) s += txt(1040, 240 + i * 60, l, 34, { fill: i === 2 ? '#e3c66a' : '#7a8a9a', font: 'Inter, monospace', weight: 700 }); });
  const sig = range(t, S[114] + 2.8, S[114] + 3.1);
  let w = 'M1040 480';
  for (let i = 0; i < 80; i++) w += ` L${1040 + i * 8.5} ${n(480 + Math.sin(i * .8 + t * 25) * (6 + sig * 60 * Math.exp(-Math.abs(i - 40) * .08)))}`;
  s += `<path d="${w}" stroke="${sig > 0 ? '#4bd38a' : '#3a4a5a'}" stroke-width="4" fill="none"/>` + (sig > 0 ? txt(1400, 420, 'SIGNAL', 40, { anchor: 'middle', fill: '#4bd38a', op: Math.sin(t * 10) > -.2 ? 1 : .4 }) : '');
  s += `<rect y="760" width="${W}" height="320" fill="#2a2018"/><g transform="translate(900 700)"><path d="M0 60 V-60" stroke="#555" stroke-width="12"/><rect x="-26" y="-130" width="52" height="90" rx="26" fill="#333" stroke="#111" stroke-width="5"/></g>`;
  const p: Pose = { ...STAND, turn: .45, crouch: .4, lean: .1 + sig * .1, handA: [.9, -2.0], handB: [.5, -3.2], bendA: 2, bendB: 2, shapeB: 'open', headTilt: .1 };
  const r = stickman(p, { outfit: 'jacket', color: '#3a4a6a', pants: '#26272e', hat: 'headset', glasses: true }, { id: 'ro', t, seed: 97, face: sig > 0 ? expr('shocked', 'relief', range(t, S[114] + 3.2, S[114] + 3.6)) : { ...expr('tired', 'focused', .5), gx: .7 } });
  s += place(r.svg, 620, 1040, 160);
  return s + glow([1380, 380], 600, sig > 0 ? '#4bd38a' : '#3a5a7a', .25) + glow([300, 500], 400, '#ffb35c', .2) + grade({ vig: .65 });
}

/** Montage: adapt (carry water) → share water → basement class → smaller darker world. */
function adapt(t: number, lt: number) {
  const beat = t < S[117] - .1 ? 0 : t < S[118] - .1 ? 1 : t < S[119] - .1 ? 2 : 3;
  let s = '';
  if (beat <= 1) {
    s = `<defs>${lin('ad', [[0, '#9aa2a8'], [1, '#d0c8b8']])}</defs><rect width="${W}" height="${H}" fill="url(#ad)"/><rect y="820" width="${W}" height="260" fill="#8a7e6a"/>`;
    s += `<rect x="1300" y="560" width="200" height="260" fill="#5a6a7a" stroke="#111" stroke-width="6"/><circle cx="1400" cy="640" r="40" fill="#2f6fd1" stroke="#111" stroke-width="5"/>${txt(1400, 780, 'WATER', 28, { anchor: 'middle' })}`;
    if (beat === 0) {
      const d = (t - S[116] + .3) * 1.6, p = walkPose(d, 1, { step: .5, carryB: [.55, -1.5] });
      const r = stickman(p, HERO, { id: 'aw', t, seed: 3, face: expr('determined') });
      s += place(r.svg, 500 + d * 120, 960, 160) + `<g transform="translate(${n(500 + d * 120 + 100)} 760)"><rect x="-30" y="-10" width="60" height="70" rx="8" fill="#2f6fd1" stroke="#111" stroke-width="5"/></g>`;
    } else {
      const pour = inOut(range(lt, (S[117] - .1) - (t - lt) + .2, (S[117] - .1) - (t - lt) + .9));
      const a = stickman({ ...STAND, turn: .5, handA: [.6, -2.4], handB: [1.0, -2.6], bendA: 2, bendB: 2 }, HERO, { id: 'sa1', t, seed: 3, face: expr('calm', 'happy', .4) });
      const b = stickman({ ...STAND, turn: -.5, handA: [-.8, -2.0], handB: [-.5, -2.0], bendA: 2, bendB: 2 }, CIV(3), { id: 'sb1', t, seed: 98, face: expr('relief') });
      s += place(a.svg, 780, 960, 160) + place(b.svg, 1180, 960, 160) + `<g transform="translate(960 560) rotate(${n(-pour * 50)})"><rect x="-40" y="-20" width="80" height="90" rx="10" fill="#2f6fd1" stroke="#111" stroke-width="5"/></g><rect x="1040" y="620" width="70" height="80" rx="8" fill="#d8d2c0" stroke="#111" stroke-width="5"/>`;
      if (pour > .4) for (let i = 0; i < 6; i++) s += `<circle cx="${n(1000 + i * 8)}" cy="${n(580 + ((t * 300 + i * 15) % 60))}" r="6" fill="#7fc4ff"/>`;
    }
    s += grade({ vig: .45 });
  } else if (beat === 2) {
    s = `<rect width="${W}" height="${H}" fill="#2a2420"/><rect x="560" y="160" width="800" height="420" fill="#1e2a22" stroke="#6a4a30" stroke-width="16"/>` + txt(620, 260, 'A B C', 60, { fill: '#e8e6e0', font: 'Inter, sans-serif', weight: 700 }) + txt(620, 360, '2 + 3 = 5', 60, { fill: '#e8e6e0', weight: 700 });
    s += `<path d="M960 0 V60" stroke="#555" stroke-width="4"/><rect x="935" y="60" width="50" height="70" rx="10" fill="#e3b341" stroke="#111" stroke-width="5"/>` + glow([960, 120], 700, '#ffb35c', .45);
    const tch = stickman({ ...STAND, turn: -.3, handB: [1.0, -3.2 + Math.sin(t * 2) * .1], shapeB: 'point', handA: [-.3, -1.7] }, { outfit: 'jacket', color: '#7a4a6a', pants: '#2a2b30', hat: 'bun', hair: '#3a2a1a', glasses: true }, { id: 'tc', t, seed: 99, face: expr('happy') });
    s += place(tch.svg, 1480, 1000, 160);
    for (let i = 0; i < 5; i++) { const k = stickman({ ...STAND, back: 1, crouch: .5, handA: [-.4, -1.5], handB: [.4, i === 2 ? -3.3 : -1.5], bendB: 2 }, CIV(i), { id: 'kd' + i, t, seed: 100 + i, face: EXPR.calm }); s += place(k.svg, 520 + i * 200, 1110, 95); }
    s += grade({ vig: .6 });
  } else {
    s = cityScape(t, { sky: 'night', cam: { x: 960, y: 600, zoom: 1.1 }, lit: .06, ruins: .4, stars: 1 }) + grade({ vig: .65 });
  }
  return s + kinetic(t, [[S[116] + .05, 'THEY'], [S[116] + .25, 'ADAPT']], 960, 150, 70, { anchor: 'middle', hold: .5 });
}

export const CH8: Shot[] = [
  { a: at(108), tr: 'black', r: (t, lt) => dawnRidge(t, lt) },
  { a: at(109), r: (t, lt) => camp(t, lt) },
  { a: at(111), r: (t, lt) => barter(t, lt) },
  { a: at(112), r: t => restorePower(t) },
  { a: at(113), r: (t, lt) => farmer(t, lt) },
  { a: at(114), r: (t, lt) => radioRoom(t, lt) },
  { a: at(115), r: (t, lt) => cityScape(t, { sky: 'dawn', cam: { x: 960, y: 560, zoom: 1.1 + lt * .03 }, ruins: .5, haze: .2 }) + rays([1500, 420], t, '#ffe0b0', .12, 8, 1600, 1.4, Math.PI * .75) + kinetic(t, [[S[115] + .3, 'SOMETHING'], [S[115] + .8, 'REMARKABLE']], 960, 540, 72, { anchor: 'middle', hold: .5 }) + grade({ vig: .5 }) },
  { a: at(116), r: (t, lt) => adapt(t, lt) },
  { a: at(120), r: (t, lt) => sootGlobe(t, lt, .15, mix(.35, .15, inOut(range(lt, 0, 5)))) + kinetic(t, [[S[121] + 2.4, 'GENERATIONS']], 380, 540, 64, { anchor: 'middle', hold: 1 }) + grade({ vig: .55 }) },
];
