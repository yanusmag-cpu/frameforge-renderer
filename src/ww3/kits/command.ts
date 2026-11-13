// Military command centre kit: screen wall, consoles, seated operators, standing officer. Themes: teal (side A), amber (side B), sepia (1983).
import { EXPR, expr, type Face } from '../../ff2d/face.ts';
import { beacon, radar, screenGlass } from '../../ff2d/fx.ts';
import { fictionalWorld } from '../../ff2d/geo.ts';
import { clamp, hash, mix, outBack, range, type V2 } from '../../ff2d/motion.ts';
import { type Look, type Pose, STAND, stickman } from '../../ff2d/rig.ts';
import { type Cam, glow, grade, layer, lin, place, txt } from '../../ff2d/stage.ts';

export type Theme = 'teal' | 'amber' | 'sepia';
const TH = {
  teal: { wall: ['#0f2230', '#08131c'], screen: '#0a2a3a', ink: '#3be0ff', glow: '#3bc8ff', uni: '#2f4a3a' },
  amber: { wall: ['#2a1d12', '#130d08'], screen: '#2a1a08', ink: '#ffb347', glow: '#ff9a3b', uni: '#4a4a32' },
  sepia: { wall: ['#2b261f', '#15120e'], screen: '#13221a', ink: '#7dffb0', glow: '#7dffb0', uni: '#4c5a3c' },
};
const n = (x: number) => +x.toFixed(2);
export type Track = { from: V2; to: V2; t0: number; dur: number };

/** Map content for the big screen (fictional world in scenario chapters). */
export function scenarioMap(x: number, y: number, w: number, h: number, t: number, ink: string, tracks: Track[], alert: number) {
  const W2 = fictionalWorld(7), P = (p: V2): V2 => [x + w / 2 + p[0] * w * .5, y + h / 2 + p[1] * h * .9];
  const path = (pts: V2[]) => 'M' + pts.map(p => P(p).map(n).join(' ')).join('L') + 'Z';
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#04121b"/>`;
  for (let gx = 0; gx <= 12; gx++) s += `<path d="M${n(x + gx * w / 12)} ${y}V${y + h}" stroke="${ink}" stroke-opacity=".08"/>`;
  for (let gy = 0; gy <= 6; gy++) s += `<path d="M${x} ${n(y + gy * h / 6)}H${x + w}" stroke="${ink}" stroke-opacity=".08"/>`;
  s += `<path d="${path(W2.blocA)}" fill="${ink}" fill-opacity=".14" stroke="${ink}" stroke-width="2.5"/><path d="${path(W2.blocB)}" fill="${alert > .5 ? '#ff3b30' : ink}" fill-opacity="${alert > .5 ? .16 : .1}" stroke="${alert > .5 ? '#ff6b5b' : ink}" stroke-width="2.5"/>`;
  for (const i of W2.isles) s += `<path d="${path(i)}" fill="${ink}" fill-opacity=".1" stroke="${ink}" stroke-width="1.5"/>`;
  for (const tr of tracks) {
    const k = clamp((t - tr.t0) / tr.dur);
    if (k <= 0) continue;
    const a = P(tr.from), b = P(tr.to), c: V2 = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - h * .32];
    const q = (u: number): V2 => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];
    let d = `M${n(a[0])} ${n(a[1])}`;
    for (let u = .05; u <= k + 1e-6; u += .05) { const p = q(Math.min(u, k)); d += `L${n(p[0])} ${n(p[1])}`; }
    const hd = q(k);
    s += `<path d="${d}" fill="none" stroke="#ff3b30" stroke-width="4" stroke-dasharray="14 8"/><circle cx="${n(hd[0])}" cy="${n(hd[1])}" r="9" fill="#ff3b30"/><circle cx="${n(a[0])}" cy="${n(a[1])}" r="${n(8 + (t * 30 % 18))}" fill="none" stroke="#ff3b30" stroke-width="2" opacity="${n(1 - (t * 30 % 18) / 18)}"/>`;
  }
  return s;
}

export type CmdOpts = {
  theme: Theme; alert: number; cam: Cam; tracks?: Track[]; blips?: [number, number, number][];
  officer?: { pose?: Partial<Pose>; face: Face; x?: number }; standUp?: number; // 0..1 operator 2 rises
  rightText?: string[]; mapLabel?: string; flashScreens?: number; noOfficer?: boolean;
};

export function commandCenter(t: number, o: CmdOpts): string {
  const T = TH[o.theme], A = o.alert;
  let s = `<defs>${lin('cw' + o.theme, [[0, T.wall[0]], [1, T.wall[1]]])}${lin('cf' + o.theme, [[0, '#0b1117'], [1, '#05080b']])}</defs>`;
  s += `<rect x="-600" y="-300" width="3100" height="1060" fill="url(#cw${o.theme})"/>`;
  // ceiling light strips
  for (let i = 0; i < 6; i++) s += `<rect x="${-200 + i * 420}" y="20" width="260" height="10" rx="5" fill="${A > .5 ? '#ff6b5b' : '#cfefff'}" opacity="${n(A > .5 ? .35 + .25 * Math.sin(t * 6) : .5)}"/>`;
  // structural ribs
  for (const x of [80, 1840]) s += `<rect x="${x - 26}" y="40" width="52" height="720" fill="#0a1218" stroke="#111" stroke-width="4"/>`;
  // screen wall
  const scr = (x: number, y: number, w: number, h: number, body: string) =>
    `<rect x="${x - 12}" y="${y - 12}" width="${w + 24}" height="${h + 24}" rx="8" fill="#0b0f14" stroke="#111" stroke-width="5"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${body}${screenGlass(x, y, w, h, t, .2)}</svg>`;
  s += scr(560, 110, 800, 430, scenarioMap(560, 110, 800, 430, t, T.ink, o.tracks ?? [], A) + (o.mapLabel ? txt(580, 146, o.mapLabel, 22, { fill: A > .5 ? '#ff6b5b' : T.ink, weight: 800, ls: 2 }) : ''));
  s += scr(150, 150, 360, 360, `<rect x="150" y="150" width="360" height="360" fill="${T.screen}"/>` + radar(330, 330, 160, t, o.blips ?? [], T.ink, A));
  const lines = o.rightText ?? ['SECTOR 4  NOMINAL', 'SAT LINK  OK', 'TRACKS    0'];
  s += scr(1410, 150, 360, 360, `<rect x="1410" y="150" width="360" height="360" fill="${T.screen}"/>` + lines.map((l, i) => txt(1432, 196 + i * 40, l, 24, { fill: l.includes('!') || (A > .5 && i === lines.length - 1) ? '#ff5a4a' : T.ink, weight: 700, font: 'Inter, monospace' })).join('') +
    Array.from({ length: 14 }, (_, i) => `<rect x="${1432 + i * 23}" y="${n(470 - (8 + 60 * Math.abs(Math.sin(t * 2 + i * .7))))}" width="14" height="${n(8 + 60 * Math.abs(Math.sin(t * 2 + i * .7)))}" fill="${T.ink}" opacity=".5"/>`).join(''));
  if (A > .5) s += `<rect x="560" y="110" width="800" height="430" fill="#ff2b2b" opacity="${n(.08 + .06 * Math.sin(t * 8))}"/>` + txt(960, 168, 'LAUNCH DETECTED', 34, { anchor: 'middle', fill: '#ff5a4a', weight: 900, ls: 4, op: Math.sin(t * 8) > 0 ? 1 : .35 });
  if (o.flashScreens) s += `<rect x="140" y="100" width="1640" height="450" fill="#ff2b2b" opacity="${n(o.flashScreens * .5)}"/>`;
  // floor with screen reflections
  s += `<rect x="-600" y="760" width="3100" height="600" fill="url(#cf${o.theme})"/>`;
  s += `<rect x="560" y="770" width="800" height="200" fill="${A > .5 ? '#ff3b30' : T.glow}" opacity=".06"/>`;
  // operators (back view, seated) behind the console run
  const ops: [number, number][] = [[360, 0], [700, 1], [1220, 2], [1560, 3]];
  let ppl = '';
  for (const [x, i] of ops) {
    const stand = i === 1 ? clamp(o.standUp ?? 0) : 0;
    const look: Look = { outfit: 'uniform', color: T.uni, pants: '#2a3326', shoe: '#2a2018', hat: 'headset' };
    const lean = Math.sin(t * .7 + i) * .02 + (A > .5 ? .06 : 0);
    const p: Pose = { ...STAND, back: 1, lean, crouch: mix(.35, 0, stand), hipX: 0, headTilt: Math.sin(t * .5 + i * 2) * .04 + (A > .5 ? (hash(i) - .5) * .2 : 0),
      handA: [-.45, mix(-2.35, -1.65, stand)], handB: [.45, mix(-2.35, -1.65, stand) + (A > .5 && i === 2 ? -.6 - .1 * Math.sin(t * 9) : 0)] };
    const r = stickman(p, look, { id: 'op' + i, t, seed: 11 + i, face: EXPR.neutral });
    ppl += place(r.svg, x, 1000 - stand * 60, 105);
  }
  s += ppl;
  // console desk (hides legs), monitors and keyboards
  s += `<path d="M120 700 L1800 700 L1840 790 L80 790Z" fill="#1a2430" stroke="#111" stroke-width="5"/><rect x="80" y="790" width="1760" height="420" fill="#121a22" stroke="#111" stroke-width="5"/><path d="M80 860 H1840" stroke="#0a0f14" stroke-width="6"/>`;
  for (let i = 0; i < 9; i++) {
    const x = 170 + i * 190, on = A > .5 && (i % 3 === 1);
    s += `<rect x="${x}" y="640" width="120" height="70" rx="6" fill="#0b0f14" stroke="#111" stroke-width="4"/><rect x="${x + 8}" y="648" width="104" height="54" fill="${on ? '#5a1010' : T.screen}"/>`;
    s += `<rect x="${x + 14}" y="${n(660 + (t * 20 + i * 7) % 30)}" width="${50 + hash(i) * 40}" height="4" fill="${on ? '#ff5a4a' : T.ink}" opacity=".7"/>`;
    for (let k = 0; k < 4; k++) s += `<circle cx="${x + 20 + k * 26}" cy="745" r="6" fill="${hash(i * 4 + k + Math.floor(t * 2)) > .5 ? (A > .5 ? '#ff3b30' : T.ink) : '#22303c'}"/>`;
  }
  // standing officer (faces the room, 3/4) — the decision maker
  if (!o.noOfficer) {
    const of = o.officer ?? { face: expr('focused') };
    const ox = of.x ?? 1000;
    const look: Look = { outfit: 'uniform', color: T.uni, pants: '#2a3326', shoe: '#2a2018', hat: 'officer', hair: '#2c3a24' };
    const p: Pose = { ...STAND, turn: -.35, lean: .05, handA: [-.35, -1.75], handB: [.3, -1.72], ...of.pose } as Pose;
    const r = stickman(p, look, { id: 'off', t, seed: 5, face: of.face });
    s += place(r.svg, ox, 1060, 128);
    s += `<path d="M${ox - 230} 1060 L${ox + 230} 1060 L${ox + 260} 1110 L${ox - 260} 1110Z" fill="#0d1319"/>`;
  }
  // lights (world space)
  let L = glow([960, 330], 700, A > .5 ? '#ff2b2b' : T.glow, .2, .55) + glow([330, 330], 300, T.glow, .18) + glow([1590, 330], 300, T.glow, .15);
  if (A > .5) L += beacon([120, 60], t, '#ff2b2b', 520, 5) + beacon([1800, 60], t + .6, '#ff2b2b', 520, 5);
  return layer(o.cam, 1, t, s) + grade({ tint: o.theme === 'sepia' ? '#c7b48a' : '#8fa6c4', tintA: .35 }) + layer(o.cam, 1, t, L) + grade({ vig: .65 });
}

/** pop-in helper for screen dots counts */
export const pop = (t: number, at: number) => outBack(range(t, at, at + .25));
