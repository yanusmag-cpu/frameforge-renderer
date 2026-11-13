// Chapter 9 — The Final Reveal (5:18–6:38): real history, carefully stated; callback ending.
import { expr } from "../ff2d/face.ts";
import { glitchBars, puff } from '../ff2d/fx.ts';
import { equirect, flatLand } from '../ff2d/geo.ts';
import { clamp, hash, inOut, mix, outBack, outCubic, range, type V2 } from '../ff2d/motion.ts';
import { type Look, type Pose, STAND, stickman } from '../ff2d/rig.ts';
import { glow, grade, H, lin, place, txt, W } from '../ff2d/stage.ts';
import { badge, chapterTitle, COL, kinetic, lowerThird } from '../ff2d/ui.ts';
import { radarScreen } from './ch1.ts';
import { infoBg } from './ch2.ts';
import { commandCenter } from './kits/command.ts';
import { bedroomShot, insertPhone } from './scenes/s01_bedroom.ts';
import { at, type Shot } from './shot.ts';
import { S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);
const SEPIA = (a = .45) => `<rect width="${W}" height="${H}" fill="#c9a86a" opacity="${a}" style="mix-blend-mode:multiply"/>`;
const PETROV: Look = { outfit: 'uniform', color: '#4c5a3c', pants: '#3a4430', shoe: '#2a2018', hat: 'officer', hair: '#3c4a2a' };
const dateTag = (t: number, t0: number, s: string) => { const k = outCubic(range(t, t0, t0 + .35)); return `<g transform="translate(${n(1830 + (1 - k) * 200)} 90)" opacity="${n(k)}"><rect x="-${s.length * 22 + 40}" y="-44" width="${s.length * 22 + 40}" height="64" rx="8" fill="#0b0f16" fill-opacity=".85"/>${txt(-20, 2, s, 34, { anchor: 'end', fill: '#ffcf3b' })}</g>`; };

function computerRoom1979(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#2a2620"/><rect y="820" width="${W}" height="260" fill="#3a3228"/>`;
  for (let i = 0; i < 4; i++) {
    const x = 120 + i * 260;
    s += `<rect x="${x}" y="200" width="220" height="560" fill="#b8b0a0" stroke="#111" stroke-width="6"/>`;
    for (const dy of [0, 240]) s += `<g transform="translate(${x + 110} ${330 + dy}) rotate(${n(t * (i % 2 ? -200 : 200))})"><circle r="80" fill="#3a3a3a" stroke="#111" stroke-width="5"/><circle r="20" fill="#b8b0a0"/>${[0, 120, 240].map(a => `<rect x="-6" y="-70" width="12" height="40" fill="#b8b0a0" transform="rotate(${a})"/>`).join('')}</g>`;
  }
  s += `<rect x="1220" y="220" width="560" height="400" rx="20" fill="#1a1a14" stroke="#111" stroke-width="10"/><rect x="1250" y="250" width="500" height="340" rx="40" fill="#0c1a0c"/>`;
  const show = range(t, S[125] + 2.6, S[125] + 2.8);
  if (show > 0) {
    s += txt(1500, 320, 'ATTACK WARNING', 40, { anchor: 'middle', fill: '#7dffb0', op: Math.sin(t * 8) > -.3 ? 1 : .4 });
    for (let i = 0; i < 14; i++) { const k = clamp((t - S[125] - 2.8 - i * .12) * 2); s += `<path d="M${1280 + hash(i) * 120} 560 Q1500 ${n(380 - hash(i + 3) * 80)} ${n(1600 + hash(i + 7) * 120)} 560" stroke="#7dffb0" stroke-width="3" fill="none" stroke-dasharray="${n(500 * k)} 600" opacity=".8"/>`; }
  } else s += txt(1500, 420, 'TRAINING TAPE LOADED', 30, { anchor: 'middle', fill: '#7dffb0', op: range(t, S[125] + 1.2, S[125] + 1.4) });
  const panic = range(t, S[125] + 3.2, S[125] + 3.6);
  const p: Pose = { ...STAND, turn: .45, lean: -.08 * panic, handA: [.5, -2.0], handB: [mix(.9, .3, panic), mix(-2.1, -3.5, panic)], bendB: 2, shapeB: panic > .3 ? 'open' : 'fist', headLift: panic * .05 };
  const r = stickman(p, { outfit: 'suit', color: '#6a5a40', pants: '#3a3228', tie: '#8a3a2a', glasses: true }, { id: 'n79', t, seed: 110, face: { ...expr('focused', 'terror', panic), gx: .8 } });
  s += place(r.svg, 1040, 1000, 160);
  return s + glow([1500, 420], 500, '#7dffb0', .2) + SEPIA(.3) + dateTag(t, S[125] + .2, '9 NOV 1979 · NORAD') + badge('history', 90, 80, 1) + grade({ vig: .65 });
}

function chip1980(t: number, lt: number) {
  let s = infoBg(t, '#1a1408', '#3a2e14');
  const k = outBack(range(lt, .1, .5)), sp = Math.sin(clamp(range(t, S[126] + 2.6, S[126] + 2.9)) * Math.PI);
  s += `<g transform="translate(860 560) scale(${n(k * (1 + lt * .02))}) rotate(-8)"><rect x="-220" y="-160" width="440" height="320" rx="16" fill="#1a1a1e" stroke="#111" stroke-width="8"/>`;
  for (let i = 0; i < 10; i++) s += `<rect x="${-200 + i * 42}" y="-196" width="18" height="40" fill="#c9c9c9" stroke="#111" stroke-width="3"/><rect x="${-200 + i * 42}" y="156" width="18" height="40" fill="#c9c9c9" stroke="#111" stroke-width="3"/>`;
  s += `<circle cx="-160" cy="-100" r="14" fill="#3a3a40"/>` + txt(0, 20, '1980', 70, { anchor: 'middle', fill: '#5a5a62' }) + `</g>`;
  if (sp > 0) s += glow([860, 560], 260, '#ffcf3b', sp * .8);
  const tg = outBack(range(t, S[126] + 2.3, S[126] + 2.7));
  s += `<g transform="translate(1340 420) rotate(12) scale(${n(tg)})"><path d="M-30 -60 H200 V60 H-30 L-90 0Z" fill="#f4f1ea" stroke="#111" stroke-width="6"/><circle cx="-50" cy="0" r="12" fill="#111"/>${txt(85, 26, '46¢', 76, { anchor: 'middle', fill: '#111' })}</g>`;
  return s + txt(960, 980, 'A faulty computer chip triggers false attack warnings', 34, { anchor: 'middle', weight: 600, fill: '#e8dcc0', op: range(lt, .6, 1) }) + dateTag(t, S[126] + .2, '3 JUN 1980 · NORAD') + badge('history', 90, 80, 1) + grade({ vig: .55 });
}

function bunker1983(t: number, lt: number, mode: 'alarm' | 'think') {
  const launches = [S[127] + 3.6, S[128] + .05, S[128] + .2, S[128] + .35, S[128] + .5];
  const firstOn = t > launches[0];
  let s = commandCenter(t, { theme: 'sepia', alert: firstOn ? 1 : 0, noOfficer: true, cam: { x: 960, y: 560, zoom: mode === 'alarm' ? 1.0 + lt * .03 : 1.25 },
    tracks: launches.map((l, i) => ({ from: [-.45 + i * .03, -.05 + i * .02] as V2, to: [.45, 0] as V2, t0: l, dur: 6 })), blips: launches.map((l, i) => [-2.6 + i * .08, .6, l] as [number, number, number]),
    rightText: ['OKO SATELLITE', `LAUNCHES ${launches.filter(l => t > l).length}`, 'RELIABILITY: HIGHEST', firstOn ? 'START!' : 'NOMINAL'], mapLabel: 'SERPUKHOV-15 · EARLY WARNING' });
  // Petrov stands at the commander's post in the foreground
  const think = mode === 'think' ? 1 : 0;
  const phone = mode === 'think' ? inOut(range(t, S[130] + 3.4, S[130] + 3.9)) : 0;
  const p: Pose = { ...STAND, turn: -.25, lean: .03, handA: think ? [mix(-.05, -.45, phone), mix(-3.05, -3.3, phone)] : [-.35, -1.7], bendA: 2, shapeA: think && phone > .5 ? 'hold' : 'fist', handB: [.35, -1.72], headTilt: think ? .1 * (1 - phone) : 0 };
  const face = mode === 'alarm' ? { ...expr('focused', 'shocked', range(t, launches[0], launches[0] + .4)), gx: -.5, gy: -.3 } : phone > .5 ? expr('determined') : { ...expr('focused', 'confused', .35), gx: .6, gy: -.5 };
  const r = stickman(p, PETROV, { id: 'pv', t, seed: 120, face });
  s += place(r.svg, mode === 'alarm' ? 1450 : 1180, 1170, mode === 'alarm' ? 170 : 230);
  if (phone > .5) { const h = r.j.handA, cx = (mode === 'alarm' ? 1450 : 1180) + h[0] * 230, cy = 1170 + h[1] * 230; s += `<path d="M${n(cx)} ${n(cy - 60)} q-30 60 0 120" stroke="#111" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M${n(cx)} ${n(cy - 60)} q-30 60 0 120" stroke="#3a3428" stroke-width="20" fill="none" stroke-linecap="round"/>`; }
  if (mode === 'think') {
    const bub = outBack(range(t, S[130] + .5, S[130] + .9)) * (1 - range(t, S[130] + 3.2, S[130] + 3.5));
    if (bub > 0) s += `<g transform="translate(560 300) scale(${n(bub)})"><rect x="-380" y="-130" width="760" height="260" rx="40" fill="#f4f1ea" stroke="#111" stroke-width="7"/><circle cx="330" cy="170" r="22" fill="#f4f1ea" stroke="#111" stroke-width="6"/><circle cx="380" cy="215" r="12" fill="#f4f1ea" stroke="#111" stroke-width="5"/>${txt(0, -40, 'Only FIVE missiles?', 48, { anchor: 'middle', fill: '#111' })}${txt(0, 40, 'A real first strike would', 36, { anchor: 'middle', fill: '#333', weight: 700 })}${txt(0, 90, 'be far bigger.', 36, { anchor: 'middle', fill: '#333', weight: 700 })}</g>`;
    const rep = outBack(range(t, S[130] + 4.0, S[130] + 4.3));
    if (rep > 0) s += `<g transform="translate(560 300) scale(${n(rep)}) rotate(-4)"><rect x="-360" y="-70" width="720" height="140" rx="10" fill="#0b0f16" stroke="#ffcf3b" stroke-width="7"/>${txt(0, 22, 'REPORT: SYSTEM FALSE ALARM', 46, { anchor: 'middle', fill: '#ffcf3b' })}</g>`;
  }
  s += SEPIA(.22);
  if (mode === 'alarm') s += dateTag(t, S[127] + .4, '26 SEP 1983 · USSR') + kinetic(t, [[S[128], 'THEN'], [S[128] + .15, 'FOUR'], [S[128] + .35, 'MORE']], 700, 1010, 56, { anchor: 'middle', accent: ['FOUR'], hold: .8 });
  if (mode === 'think') s += lowerThird(t - S[129], 'STANISLAV PETROV', 'Duty officer, Soviet early-warning centre (illustration)', 2.6);
  return s + badge('history', 90, 80, 1);
}

function cloudGlint(t: number, lt: number) {
  let s = `<defs>${lin('cg', [[0, '#05070f'], [1, '#1a2a4a']])}</defs><rect width="${W}" height="${H}" fill="url(#cg)"/>`;
  s += `<path d="M0 1080 Q960 700 1920 1080Z" fill="#1d3a5a"/>`;
  for (let i = 0; i < 5; i++) s += puff(560 + i * 170, 820 - i * 6, 80, 30 + i, '#e8eef4', '#8a9ab0', .95, 6);
  s += `<circle cx="160" cy="260" r="80" fill="#ffd25a"/>` + glow([160, 260], 220, '#ffd25a', .5);
  const k = range(lt, .3, 1.0);
  s += `<path d="M160 260 L${n(mix(160, 820, k))} ${n(mix(260, 790, k))}" stroke="#ffd25a" stroke-width="7" stroke-dasharray="18 12"/>`;
  const k2 = range(lt, 1.0, 1.7);
  s += `<path d="M820 790 L${n(mix(820, 1560, k2))} ${n(mix(790, 220, k2))}" stroke="#ffd25a" stroke-width="7" stroke-dasharray="18 12"/>` + glow([820, 790], 120, '#fff6d0', .4 + .4 * Math.sin(t * 14) * k);
  s += `<g transform="translate(1600 190) rotate(-24)"><rect x="-120" y="-24" width="80" height="48" fill="#1d3a6a" stroke="#c9d2e0" stroke-width="3"/><rect x="40" y="-24" width="80" height="48" fill="#1d3a6a" stroke="#c9d2e0" stroke-width="3"/><rect x="-40" y="-40" width="80" height="80" rx="8" fill="#c9a84a" stroke="#111" stroke-width="4"/></g>`;
  const mis = range(t, S[132] + 3.2, S[132] + 3.5);
  if (mis > 0) s += `<g transform="translate(1300 520) scale(${n(outBack(mis))})"><rect x="-300" y="-56" width="600" height="112" rx="12" fill="#0b0f16" stroke="${COL.alert}" stroke-width="6"/>${txt(0, 18, '"ROCKET ENGINES"', 52, { anchor: 'middle', fill: COL.alert })}</g>`;
  const right = outBack(range(t, S[131] - .05, S[131] + .25), 2.4) * (1 - range(t, S[132] - .1, S[132]));
  if (right > 0) s = `<rect width="${W}" height="${H}" fill="#0b0f16"/><g transform="translate(960 540) scale(${n(right)}) rotate(-6)"><rect x="-460" y="-110" width="920" height="220" rx="16" fill="none" stroke="#4bd38a" stroke-width="14"/>${txt(0, 42, 'HE WAS RIGHT', 120, { anchor: 'middle', fill: '#4bd38a' })}</g>`;
  return s + badge('history', 90, 80, 1, right > 0 ? undefined : 'Sunlight glinting off high clouds fooled the satellite') + grade({ vig: .55 });
}

function debateHistory(t: number, lt: number) {
  let s = infoBg(t, '#14100a', '#2e2614');
  for (let i = 0; i < 6; i++) s += `<g transform="translate(${260 + i * 110} ${n(760 - (i % 2) * 20)}) rotate(${(i - 3) * 2})"><rect x="-44" y="-240" width="88" height="260" fill="${['#6a3a2a', '#2a4a6a', '#4a6a3a', '#6a5a2a', '#3a2a5a', '#5a2a3a'][i]}" stroke="#111" stroke-width="5"/></g>`;
  const checks = outBack(range(t, S[133] + 3.0, S[133] + 3.4));
  if (checks > 0) s += `<g transform="translate(1340 380) scale(${n(checks)})"><rect x="-340" y="-70" width="680" height="140" rx="12" fill="#0b0f16" stroke="#7fd3ff" stroke-width="5"/>${txt(0, 18, 'OTHER CHECKS EXISTED TOO', 44, { anchor: 'middle', fill: '#7fd3ff' })}</g>`;
  const q = range(t, S[134], S[134] + .4);
  if (q > 0) {
    const r = stickman({ ...STAND, turn: -.2, handA: [-.6, -2.2], handB: [.6, -2.2], shapeA: 'open', shapeB: 'open', headTilt: .08 }, { ...PETROV, hat: undefined, outfit: 'jacket', color: '#5a5a62' }, { id: 'pv2', t, seed: 121, face: expr('calm', 'smug', .3) });
    s += `<g opacity="${n(q)}">${place(r.svg, 1340, 1040, 150)}<rect x="560" y="600" width="1300" height="110" rx="14" fill="#f4f1ea"/>${txt(1210, 670, '"…in the right place at the right time."', 44, { anchor: 'middle', fill: '#111' })}</g>`;
  }
  return s + txt(260, 200, 'HISTORIANS DEBATE', 56, { fill: '#e8dcc0' }) + txt(260, 250, 'How close did 1983 really come?', 34, { fill: '#c9b89a', weight: 600 }) + badge('history', 90, 80, 1, 'Petrov later downplayed his own role') + grade({ vig: .55 });
}

function rocket1995(t: number, lt: number) {
  const pr = equirect(2600, 1300, 960 - (16 + 180) / 360 * 2600, 640 - (90 - 69) / 180 * 1300);
  let s = `<rect width="${W}" height="${H}" fill="#08121e"/>` + flatLand(pr, '#1f3d5c', '#5fb7ff', 2);
  const a = pr([16, 69]), b = pr([30, 85]), c: V2 = [(a[0] + b[0]) / 2, a[1] - 420];
  const k = range(lt, .3, 2.6);
  let d = `M${n(a[0])} ${n(a[1])}`;
  for (let u = 0; u <= k; u += .02) d += ` L${n((1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0])} ${n((1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1])}`;
  s += `<path d="${d}" stroke="#ffcf3b" stroke-width="6" fill="none"/>` + txt(a[0], a[1] + 50, 'NORWAY', 34, { anchor: 'middle' }) + txt(a[0] + 40, c[1] + 60, 'science rocket (aurora research)', 26, { fill: '#ffcf3b', weight: 700 });
  const bk = outBack(range(t, S[135] + 3.6, S[135] + 4.0));
  if (bk > 0) s += `<g transform="translate(1500 760) scale(${n(bk)})"><rect x="-180" y="-110" width="360" height="220" rx="16" fill="#1a1a1e" stroke="#111" stroke-width="7"/><rect x="-60" y="-140" width="120" height="40" rx="10" fill="none" stroke="#1a1a1e" stroke-width="14"/><rect x="-140" y="-70" width="280" height="140" fill="#2a2a30"/><rect x="-100" y="-40" width="80" height="40" fill="${COL.alert}"/>${txt(0, 150, 'NUCLEAR BRIEFCASE ACTIVATED', 30, { anchor: 'middle', fill: '#ff9a8a' })}</g>`;
  return s + dateTag(t, S[135] + .2, '25 JAN 1995 · RUSSIA') + badge('history', 90, 80, 1) + grade({ vig: .5 });
}

function hawaii2018(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#0e1a24"/>`;
  s += `<g transform="translate(700 560) rotate(-5)"><rect x="-230" y="-440" width="460" height="880" rx="60" fill="#15171c" stroke="#111" stroke-width="9"/><rect x="-206" y="-414" width="412" height="828" rx="44" fill="#c4161c"/>`;
  s += txt(0, -260, 'EMERGENCY ALERT', 40, { anchor: 'middle' }) + txt(0, -170, 'BALLISTIC MISSILE', 32, { anchor: 'middle' }) + txt(0, -126, 'THREAT INBOUND', 32, { anchor: 'middle' }) + txt(0, -40, 'THIS IS NOT A DRILL.', 28, { anchor: 'middle' }) + `</g>`;
  const k = range(t, S[136] + 2.2, S[136] + 4.6), mins = Math.round(k * 38);
  s += `<g transform="translate(1380 540)"><circle r="240" fill="#0b0f16" stroke="#f4f1ea" stroke-width="10"/><path d="M0 0 L${n(Math.sin(k * 38 / 60 * Math.PI * 2) * 200)} ${n(-Math.cos(k * 38 / 60 * Math.PI * 2) * 200)}" stroke="${COL.alert}" stroke-width="12" stroke-linecap="round"/><path d="M0 0 A220 220 0 0 1 ${n(Math.sin(k * 38 / 60 * Math.PI * 2) * 220)} ${n(-Math.cos(k * 38 / 60 * Math.PI * 2) * 220)} L0 0Z" fill="${COL.alert}" opacity=".25"/>${txt(0, 340, `${mins} MINUTES`, 64, { anchor: 'middle', fill: '#fff' })}${txt(0, 400, 'until it was cancelled', 30, { anchor: 'middle', weight: 600, fill: '#c9d2e0' })}</g>`;
  return s + dateTag(t, S[136] + .2, '13 JAN 2018 · HAWAII') + badge('history', 90, 80, 1) + grade({ vig: .55 });
}

function nearMissTimeline(t: number, lt: number) {
  let s = infoBg(t);
  const ev: [string, string][] = [['1979', 'Training tape'], ['1980', '46¢ chip'], ['1983', 'Sunlight on clouds'], ['1995', 'Science rocket'], ['2018', 'Hawaii alert']];
  s += `<path d="M160 560 H${n(160 + 1600 * outCubic(range(lt, 0, 1)))}" stroke="#f4f1ea" stroke-width="6"/>`;
  ev.forEach(([y, l], i) => { const k = outBack(range(lt, .2 + i * .2, .5 + i * .2)), x = 260 + i * 350; s += `<g transform="translate(${x} 560) scale(${n(k)})"><circle r="24" fill="${COL.alert}" stroke="#fff" stroke-width="5"/>${txt(0, -60, y, 54, { anchor: 'middle' })}${txt(0, 80, l, 28, { anchor: 'middle', weight: 700, fill: '#c9d2e0' })}</g>`; });
  return s + kinetic(t, [[S[137] + .5, 'THE'], [S[137] + .65, 'WORLD'], [S[137] + .9, 'GOT'], [S[137] + 1.1, 'LUCKY']], 960, 860, 72, { anchor: 'middle', accent: ['LUCKY'], hold: .5 }) + badge('history', 90, 80, 1) + grade({ vig: .5 });
}

function doomsday(t: number, lt: number) {
  let s = `<rect width="${W}" height="${H}" fill="#07080b"/>`;
  const z = 1 + lt * .04;
  s += `<g transform="translate(960 520) scale(${n(z)})"><circle r="330" fill="none" stroke="#f4f1ea" stroke-width="6" opacity=".2"/>`;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s += `<circle cx="${n(Math.sin(a) * 300)}" cy="${n(-Math.cos(a) * 300)}" r="${i === 0 ? 14 : 8}" fill="#f4f1ea"/>`; }
  const sec = -.16; // minute hand just before midnight
  s += `<path d="M0 0 L${n(Math.sin(sec) * 280)} ${n(-Math.cos(sec) * 280)}" stroke="${COL.alert}" stroke-width="14" stroke-linecap="round"/><path d="M0 0 L0 -200" stroke="#f4f1ea" stroke-width="18" stroke-linecap="round"/><circle r="18" fill="#f4f1ea"/></g>`;
  s += txt(960, 960, '85 SECONDS TO MIDNIGHT', 72, { anchor: 'middle', op: range(t, S[138] + 2.2, S[138] + 2.6) }) + txt(960, 1020, 'The closest it has ever been', 32, { anchor: 'middle', weight: 600, fill: '#c9d2e0', op: range(t, S[138] + 3.4, S[138] + 3.8) });
  return s + badge('real', 90, 80, 1, 'Bulletin of the Atomic Scientists, January 2026') + grade({ vig: .6 });
}

function lastWatch(t: number, lt: number) {
  // One operator, quiet room, single blip — leans in to check again.
  const lean = inOut(range(t, S[141] + 2.0, S[141] + 3.4));
  let s = commandCenter(t, { theme: 'teal', alert: 0, noOfficer: true, blips: [[-.8, .5, S[140] + 1]], rightText: ['SECTOR 4  NOMINAL', 'TRACKS    1', 'VERIFY'], cam: { x: mix(960, 760, inOut(range(lt, 0, 6))), y: mix(540, 560, inOut(range(lt, 0, 6))), zoom: mix(1.1, 1.7, inOut(range(lt, 0, 7))) } });
  const p: Pose = { ...STAND, turn: .35, crouch: .35, lean: .08 + lean * .25, handA: [.6, -1.95], handB: [.95, -2.0], bendA: 2, bendB: 2, headLift: lean * .03 };
  const r = stickman(p, { outfit: 'uniform', color: '#2f4a3a', pants: '#2a3326', hat: 'headset' }, { id: 'lw', t, seed: 130, face: { ...expr('focused', 'curious', lean), gx: .8, gy: -.4 } });
  return s + `<g opacity="${n(range(lt, 0, .4))}">${place(r.svg, 520, 1200, 210)}</g>` + `<rect y="${n(1000)}" width="${W}" height="80" fill="#0b1117"/>`;
}

export const CH9: Shot[] = [
  { a: at(122), tr: 'white', r: (t, lt) => radarScreen(t, lt, [[-.8, .5, 0]], 0, 'EARLY WARNING · SINGLE TRACK') + glitchBars(t, 1 - range(lt, 0, .4)) + chapterTitle(lt, 9, 'The Final Reveal', 2.6) + badge(t < S[124] + .3 ? 'fiction' : 'history', 1400, 1000, t < S[124] + .3 ? 1 : outBack(range(t, S[124] + .3, S[124] + .6))) },
  { a: at(125), r: (t, lt) => computerRoom1979(t, lt) },
  { a: at(126), r: (t, lt) => chip1980(t, lt) },
  { a: at(127), r: (t, lt) => bunker1983(t, lt, 'alarm') },
  { a: at(129), r: (t, lt) => bunker1983(t, lt, 'think') },
  { a: at(131), r: (t, lt) => cloudGlint(t, lt) },
  { a: at(133), r: (t, lt) => debateHistory(t, lt) },
  { a: at(135), r: (t, lt) => rocket1995(t, lt) },
  { a: at(136), r: (t, lt) => hawaii2018(t, lt) },
  { a: at(137), r: (t, lt) => nearMissTimeline(t, lt) },
  { a: at(138), r: (t, lt) => doomsday(t, lt) },
  // callback: the same quiet room as the opening, a minute earlier
  { a: at(139), tr: 'black', r: (t, lt) => bedroomShot(t, { kind: 'wide', lt, clock: '10:23' }) },
  { a: at(140), r: (t, lt) => lastWatch(t, lt) },
  // after the final word: the phone lights up — cut to black before it can be read
  { a: 395.15, r: (t, lt) => insertPhone(lt + .05, [9, 9, 9, 9, 9, 9]) },
  { a: 396.15, r: () => `<rect width="${W}" height="${H}" fill="#000"/>` },
];
