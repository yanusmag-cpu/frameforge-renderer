// News kit: broadcast screen content (anchor, BREAKING banner, ticker) usable full-frame or inside any TV.
import { EXPR, type Face } from '../../ff2d/face.ts';
import { clamp, inOut, outBack, outCubic, range } from '../../ff2d/motion.ts';
import { type Pose, STAND, stickman } from '../../ff2d/rig.ts';
import { glow, lin, place, rad, txt } from '../../ff2d/stage.ts';
import { scenarioMap } from './command.ts';

const n = (x: number) => +x.toFixed(2);
export type NewsOpts = { lt: number; headline: string; sub?: string; ticker?: string; face?: Face; breakingAt?: number; mood?: 'calm' | 'alert'; chart?: 'down' | 'updown' };

/** Broadcast frame in 1920x1080 space. */
export function newsFrame(t: number, o: NewsOpts): string {
  const alert = o.mood !== 'calm';
  let s = `<defs>${lin('nbg', [[0, alert ? '#2a0d14' : '#0d2140'], [1, alert ? '#120509' : '#081329']])}${rad('nsp', [[0, alert ? '#ff3b4a' : '#3a8dff', .5], [1, '#000', 0]])}</defs>`;
  s += `<rect width="1920" height="1080" fill="url(#nbg)"/><ellipse cx="1300" cy="420" rx="760" ry="520" fill="url(#nsp)"/>`;
  // studio backdrop: big screen with map / chart behind the anchor
  s += `<rect x="980" y="120" width="820" height="520" rx="10" fill="#050a14" stroke="#2a3a5a" stroke-width="6"/>`;
  if (o.chart) {
    const k = clamp(o.lt / 2.2), pts: string[] = [];
    for (let i = 0; i <= 40 * k; i++) {
      const u = i / 40; let v = .35 + Math.sin(u * 9) * .04;
      v += o.chart === 'down' ? u * u * .45 : Math.sin(u * Math.PI * 2) * .2;
      pts.push(`${n(1010 + u * 760)} ${n(160 + v * 420)}`);
    }
    s += `<path d="M${pts.join('L')}" fill="none" stroke="${o.chart === 'down' ? '#ff4b4b' : '#4bd38a'}" stroke-width="7" stroke-linejoin="round"/>`;
  } else s += scenarioMap(990, 130, 800, 500, t, alert ? '#ff8a7a' : '#7fb8ff', alert ? [{ from: [.45, .05], to: [-.45, 0], t0: t - o.lt + .4, dur: 2.5 }] : [], alert ? 1 : 0);
  // anchor at desk
  const p: Pose = { ...STAND, turn: -.12, lean: .04 + Math.sin(t * 1.3) * .015, handA: [-.55, -2.1], handB: [.5, -2.05 + Math.max(0, Math.sin(t * 3)) * .1], shapeA: 'open', shapeB: 'fist' };
  const r = stickman(p, { outfit: 'suit', color: '#1f2633', pants: '#1f2633', tie: alert ? '#c8282d' : '#2f6fd1' }, { id: 'anc', t, seed: 9, face: o.face ?? EXPR.focused });
  s += place(r.svg, 560, 1420, 250);
  s += `<path d="M180 760 L1000 760 L1060 1080 L120 1080Z" fill="#1a2234" stroke="#0a0f18" stroke-width="6"/><rect x="180" y="752" width="820" height="16" fill="#3a4a6a"/>`;
  // BREAKING banner (wipes in) + headline + ticker
  const b = o.breakingAt ?? 0, k = outCubic(range(o.lt, b, b + .35));
  s += `<g transform="translate(0 ${n((1 - k) * 260)})">`;
  s += `<rect x="0" y="808" width="1920" height="150" fill="#f4f1ea"/><rect x="0" y="808" width="${n(420 * outBack(range(o.lt, b + .1, b + .45)))}" height="150" fill="#d01c24"/>`;
  s += txt(40, 902, alert ? 'BREAKING' : 'LIVE', 64, { weight: 900, op: clamp((o.lt - b - .2) / .2) });
  s += txt(460, 880, o.headline, 56, { fill: '#10141c', weight: 900 });
  if (o.sub) s += txt(462, 932, o.sub, 32, { fill: '#3a4250', weight: 600 });
  s += `<rect x="0" y="958" width="1920" height="70" fill="#10141c"/>`;
  const tick = o.ticker ?? '';
  s += `<g>${txt(1920 - ((o.lt * 220) % (tick.length * 22 + 1920)), 1006, tick, 32, { weight: 700, fill: '#ffd25a' })}</g>`;
  s += '</g>';
  if (alert) s += `<rect width="1920" height="1080" fill="#ff2b2b" opacity="${n(.05 + .05 * Math.sin(t * 7))}"/>`;
  return s;
}

/** A physical TV set showing newsFrame, in a dark living room (wall-mounted). */
export function tvInRoom(t: number, o: NewsOpts & { zoom: number }): string {
  const z = o.zoom;
  let s = `<defs>${lin('lrw', [[0, '#1b2236'], [1, '#0f1424']])}</defs><g transform="translate(960 540) scale(${n(z)}) translate(-960 -540)">`;
  s += `<rect x="-400" y="-300" width="2800" height="1700" fill="url(#lrw)"/>`;
  s += `<rect x="-400" y="860" width="2800" height="600" fill="#1a1416"/><rect x="380" y="820" width="1160" height="90" rx="10" fill="#3a2a22" stroke="#111" stroke-width="6"/>`;
  s += `<rect x="1580" y="560" width="120" height="300" rx="14" fill="#2a3b2e" stroke="#111" stroke-width="5"/><path d="M1640 560 q-60 -120 -20 -230 q40 90 80 0 q30 120 -60 230Z" fill="#3f6d48" stroke="#111" stroke-width="5"/>`;
  s += `<rect x="440" y="230" width="1040" height="600" rx="16" fill="#0b0d12" stroke="#111" stroke-width="8"/>`;
  s += `<svg x="462" y="252" width="996" height="556" viewBox="0 0 1920 1080" preserveAspectRatio="none">${newsFrame(t, o)}</svg>`;
  s += `<rect x="462" y="252" width="996" height="556" fill="#fff" opacity=".04"/>`;
  s += glow([960, 560], 900, o.mood === 'calm' ? '#5a8dff' : '#ff2b3b', .35 + .08 * Math.sin(t * 7), .7);
  s += `</g>`;
  return s;
}
export const tvIn = (t: number, a: number, b: number) => inOut(range(t, a, b));
