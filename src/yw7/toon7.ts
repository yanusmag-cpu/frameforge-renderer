// YunoWorld v7 character system ("Ink") — replaces the Folk/stickman looks for all new productions.
// Design goals (from the user's notes): no Play-Doh blobs, no round puppet joints, no stick limbs, no oversized empty heads.
// • Limbs are single continuous tapered silhouettes (shoulder→elbow→wrist, hip→knee→ankle) with a soft outer bend and an inner
//   crease — no circles at joints. Sleeves/trousers carry the costume colour, cuffs and hems.
// • Real cartoon hands: palm + four fingers + thumb, five poses (relaxed, open, fist, point, grip) built in hand space.
// • Heads are drawn per character (cranium + cheek + jaw + chin parameters), with ears, a shaped nose, almond eyes with iris,
//   lids and lash line, filled tapered brows, a filled mouth with lips/teeth/tongue, and squash-and-stretch on strong emotions.
// • Variable line weight (silhouette 0.05, interior 0.028), gradient cel shading from a top-left key and an optional rim light.
// Driven by the shared Pose/Face types so every move and expression preset works. Local space: feet at y=0, +y down, 1 u = 0.417 m.
import { type Face, EXPR } from '../ff2d/face.ts';
import { blink, clamp, ik2, mix, saccade, type V2 } from '../ff2d/motion.ts';
import { type Pose, type Joints, type Hand } from '../ff2d/rig.ts';

export type T7Prop = 'lamp' | 'cage' | 'detonator' | 'flag' | 'paper' | 'pick' | 'flaglamp' | 'telescope' | 'bucket' | 'shovel' | 'hammer' | 'rope';
export type T7Look = {
  skin: string; hair: string; eyes?: string;
  head?: { w?: number; h?: number; jaw?: number; chin?: number; cheek?: number };   // proportions ~1
  nose?: 'button' | 'long' | 'round' | 'hook' | 'snub';
  hairStyle: 'short' | 'side' | 'curly' | 'bun' | 'bald' | 'swept' | 'long' | 'mutton';
  build?: number; height?: number; belly?: number;
  top: string; topKind: 'jacket' | 'shirt' | 'waistcoat' | 'coat' | 'dress' | 'overalls' | 'suit';
  inner?: string; trim?: string; tie?: string; buttons?: string; apron?: string;
  pants: string; boots: string; belt?: string; sleeves?: 'long' | 'rolled';
  hat?: 'flatcap' | 'helmet' | 'bowler' | 'boater' | 'driver' | 'bonnet' | 'diver' | 'none'; hatColor?: string; lamp?: boolean;
  beard?: 'stache' | 'full' | 'stubble' | 'chops'; beardColor?: string; glasses?: boolean; soot?: number; age?: number;
  skirt?: boolean;
};
export type T7Opts = { id: string; t: number; seed?: number; face?: Face; noAuto?: boolean; propA?: T7Prop; propB?: T7Prop; rim?: string; rimSide?: number; squash?: number; propAngle?: number };

const INK = '#1d1410', LW = .05, LI = .028;
const n = (x: number) => +x.toFixed(3);
const P = (p: V2) => `${n(p[0])} ${n(p[1])}`;
const add = (a: V2, b: V2, k = 1): V2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const nrm = (a: V2): V2 => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
const perp = (a: V2): V2 => [-a[1], a[0]];
const lerp2 = (a: V2, b: V2, k: number): V2 => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
export const shade = (hex: string, k: number) => { const v = parseInt(hex.slice(1), 16); return '#' + [16, 8, 0].map(s => Math.round(clamp(((v >> s) & 255) * k, 0, 255)).toString(16).padStart(2, '0')).join(''); };
const tone = (hex: string, to: string, k: number) => { const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16); return '#' + [16, 8, 0].map(s => Math.round(mix((a >> s) & 255, (b >> s) & 255, k)).toString(16).padStart(2, '0')).join(''); };

/** gradient id cache per actor: base → shade toward the cool shadow, angled from the key light */
function grad(defs: string[], id: string, col: string, ang = 35, k = .78) {
  const gid = `${id}g${defs.length}`; const r = ang * Math.PI / 180;
  defs.push(`<linearGradient id="${gid}" x1="${n(.5 - Math.cos(r) * .5)}" y1="${n(.5 - Math.sin(r) * .5)}" x2="${n(.5 + Math.cos(r) * .5)}" y2="${n(.5 + Math.sin(r) * .5)}"><stop offset="0" stop-color="${tone(col, '#fff4dc', .06)}"/><stop offset=".55" stop-color="${col}"/><stop offset="1" stop-color="${tone(shade(col, k), '#2a2350', .18)}"/></linearGradient>`);
  return `url(#${gid})`;
}
/** continuous tapered limb through a bent joint: one closed silhouette, outline only along the sides (no caps, no joint circles) */
function limbPath(a: V2, m: V2, b: V2, wa: number, wm: number, wb: number) {
  const d1 = nrm(sub(m, a)), d2 = nrm(sub(b, m)); const n1 = perp(d1), n2 = perp(d2);
  let nb = add(n1, n2); if (Math.hypot(nb[0], nb[1]) < .2) nb = n1; nb = nrm(nb);
  const dot = clamp(n1[0] * nb[0] + n1[1] * nb[1], .6, 1);
  const cross = d1[0] * d2[1] - d1[1] * d2[0]; const bend = clamp(1 - (d1[0] * d2[0] + d1[1] * d2[1]), 0, 2);
  const side = (s: number) => {
    const A = add(a, n1, s * wa / 2), B = add(b, n2, s * wb / 2); const outer = s * cross <= 0;
    const M = add(m, nb, s * (outer ? wm * (1 + bend * .12) : wm * (1 - bend * .3)) / 2 / dot);
    if (outer) { const mid: V2 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; const C = add(M, sub(M, mid), .55); return { d: `Q${P(C)} ${P(B)}`, A, B, M, outer }; }
    const c1 = lerp2(A, M, .5), c2 = lerp2(M, B, .5); return { d: `L${P(c1)} Q${P(M)} ${P(c2)} L${P(B)}`, A, B, M, outer };
  };
  const p = side(1), q = side(-1);
  const rev = (sd: typeof p) => sd.outer ? `Q${P(add(sd.M, sub(sd.M, [(sd.A[0] + sd.B[0]) / 2, (sd.A[1] + sd.B[1]) / 2]), .55))} ${P(sd.A)}` : `L${P(lerp2(sd.B, sd.M, .5))} Q${P(sd.M)} ${P(lerp2(sd.M, sd.A, .5))} L${P(sd.A)}`;
  const fill = `M${P(p.A)} ${p.d} L${P(q.B)} ${rev(q)} Z`;
  const side1 = `M${P(p.A)} ${p.d}`, side2 = `M${P(q.A)} ${q.d}`;
  const inner = p.outer ? q : p; const crease = bend > .3 ? `M${P(inner.M)} l${n((d2[0] - d1[0]) * .06)} ${n((d2[1] - d1[1]) * .06)}` : '';
  return { fill, side1, side2, crease, dirEnd: Math.atan2(d2[1], d2[0]) };
}
/** cartoon hand in hand space (x = along the forearm, y = across; s mirrors) */
function hand7(at: V2, dir: number, shape: Hand | 'grip' | 'relaxed', s: number, skin: string, defs: string[], id: string) {
  const c = Math.cos(dir), sn = Math.sin(dir); const T = (x: number, y: number): V2 => [at[0] + x * c - y * s * sn, at[1] + x * sn + y * s * c];
  const fill = grad(defs, id, skin, 30, .84); const st = `stroke="${INK}" stroke-width="${LW * .85}" stroke-linejoin="round"`;
  const finger = (x0: number, y0: number, ang: number, len: number, w: number, curl = 0) => {
    const a = ang * Math.PI / 180; const mid: V2 = [x0 + Math.cos(a) * len * .55, y0 + Math.sin(a) * len * .55]; const a2 = a + curl;
    const tip: V2 = [mid[0] + Math.cos(a2) * len * .45, mid[1] + Math.sin(a2) * len * .45];
    const nA: V2 = [-Math.sin(a), Math.cos(a)], nB: V2 = [-Math.sin(a2), Math.cos(a2)];
    const pts = [[x0 + nA[0] * w / 2, y0 + nA[1] * w / 2], [mid[0] + nA[0] * w * .46, mid[1] + nA[1] * w * .46], [tip[0] + nB[0] * w * .38, tip[1] + nB[1] * w * .38]] as V2[];
    const ptsB = [[x0 - nA[0] * w / 2, y0 - nA[1] * w / 2], [mid[0] - nA[0] * w * .46, mid[1] - nA[1] * w * .46], [tip[0] - nB[0] * w * .38, tip[1] - nB[1] * w * .38]] as V2[];
    const tipC: V2 = [tip[0] + Math.cos(a2) * w * .45, tip[1] + Math.sin(a2) * w * .45];
    return `<path d="M${P(T(...pts[0]))} Q${P(T(...pts[1]))} ${P(T(...pts[2]))} Q${P(T(...tipC))} ${P(T(...ptsB[2]))} Q${P(T(...ptsB[1]))} ${P(T(...ptsB[0]))}Z" fill="${fill}" ${st}/>`;
  };
  const palm = (w: number, l: number) => `<path d="M${P(T(-.1, -w * .5))} C${P(T(l * .5, -w * .62))} ${P(T(l, -w * .6))} ${P(T(l, -w * .1))} L${P(T(l, w * .2))} C${P(T(l, w * .58))} ${P(T(l * .4, w * .6))} ${P(T(-.1, w * .48))}Z" fill="${fill}" ${st}/>`;
  const thumb = (ang: number, len = .15, curl = .4) => finger(.06, -.09, ang, len, .085, curl);
  switch (shape) {
    case 'open': return finger(.14, -.09, -24, .2, .085) + finger(.16, -.03, -8, .22, .088) + finger(.16, .04, 8, .21, .085) + finger(.14, .1, 24, .17, .078) + palm(.26, .18) + thumb(-72, .16, .2);
    case 'point': return palm(.26, .17) + `<path d="M${P(T(.16, -.04))} Q${P(T(.24, .12))} ${P(T(.13, .13))}" fill="none" stroke="${INK}" stroke-width="${LI}"/>` + finger(.14, -.07, -4, .28, .085) + thumb(-55, .14, .9);
    case 'fist': return palm(.27, .18) + [-.07, 0, .07].map(y => `<path d="M${P(T(.14, y - .02))} q${n(.06 * c)} ${n(.06 * sn)} 0 .0" stroke="${INK}" stroke-width="${LI}"/>`).join('') + `<path d="M${P(T(.17, -.1))} Q${P(T(.23, 0))} ${P(T(.17, .1))}" fill="none" stroke="${INK}" stroke-width="${LI}"/>` + thumb(-20, .12, 1.0);
    case 'thumb': return palm(.24, .16) + `<path d="M${P(T(.17, -.1))} Q${P(T(.23, 0))} ${P(T(.17, .1))}" fill="none" stroke="${INK}" stroke-width="${LI}"/>` + finger(.02, -.1, -100, .18, .085);
    case 'grip': case 'hold': return palm(.26, .17) + finger(.14, -.07, 55, .15, .088, 1.2) + finger(.16, .01, 64, .15, .088, 1.2) + finger(.14, .09, 72, .13, .082, 1.2) + thumb(-30, .15, .8);
    default: { const blk = `<path d="M${P(T(-.08, -.13))} C${P(T(.12, -.17))} ${P(T(.3, -.12))} ${P(T(.33, .0))} C${P(T(.35, .1))} ${P(T(.26, .17))} ${P(T(.12, .15))} C${P(T(.0, .15))} ${P(T(-.08, .12))} ${P(T(-.08, .12))}Z" fill="${fill}" ${st}/>`;
      return blk + `<path d="M${P(T(.17, -.05))} L${P(T(.31, -.03))} M${P(T(.17, .04))} L${P(T(.29, .07))}" stroke="${INK}" stroke-width="${LI * .8}" stroke-linecap="round"/>` + thumb(-62, .15, .35); }
  }
}
function boot(at: V2, facing: number, col: string, defs: string[], id: string) {
  const f = clamp(facing, -1, 1), front = Math.abs(f) < .35; const d = Math.sign(f) || 1; const x = at[0], y = at[1];
  const fill = grad(defs, id, col, 20, .7);
  if (front) return `<path d="M${n(x - .17)} ${n(y - .3)} L${n(x + .17)} ${n(y - .3)} Q${n(x + .24)} ${n(y - .05)} ${n(x + .2)} ${n(y)} L${n(x - .2)} ${n(y)} Q${n(x - .24)} ${n(y - .05)} ${n(x - .17)} ${n(y - .3)}Z" fill="${fill}" stroke="${INK}" stroke-width="${LW}"/><path d="M${n(x - .2)} ${n(y - .05)}H${n(x + .2)}" stroke="${shade(col, .5)}" stroke-width=".035"/>`;
  return `<path d="M${n(x - d * .14)} ${n(y - .34)} L${n(x + d * .1)} ${n(y - .34)} Q${n(x + d * .14)} ${n(y - .17)} ${n(x + d * .3)} ${n(y - .14)} Q${n(x + d * .4)} ${n(y - .11)} ${n(x + d * .38)} ${n(y)} L${n(x - d * .18)} ${n(y)} Q${n(x - d * .2)} ${n(y - .2)} ${n(x - d * .14)} ${n(y - .34)}Z" fill="${fill}" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/><path d="M${n(x - d * .18)} ${n(y - .045)}H${n(x + d * .39)}" stroke="${shade(col, .45)}" stroke-width=".04"/><path d="M${n(x + d * .02)} ${n(y - .3)} l${n(d * .06)} .05 m${n(-d * .06)} .05 l${n(d * .06)} .05" stroke="${shade(col, .55)}" stroke-width=".022" fill="none"/>`;
}
/** handheld props, local to the hand (dir = forearm direction) */
function prop7(p: T7Prop, at: V2, dir: number, t: number, other?: V2): string {
  const c = Math.cos(dir), s = Math.sin(dir); const R = (x: number, y: number): V2 => [at[0] + x * c - y * s, at[1] + x * s + y * c]; const st = `stroke="${INK}" stroke-width="${LI * 1.4}" stroke-linejoin="round"`;
  const poly = (pts: [number, number][], fill: string) => `<path d="M${pts.map(([x, y]) => P(R(x, y))).join('L')}Z" fill="${fill}" ${st}/>`;
  switch (p) {
    case 'lamp': { const sw = Math.sin(t * 2.2) * .12; const o: V2 = [at[0], at[1] + .05]; const X = (x: number, y: number): V2 => [o[0] + x * Math.cos(sw) - y * Math.sin(sw), o[1] + x * Math.sin(sw) + y * Math.cos(sw)];
      const pl = (pts: [number, number][], f: string) => `<path d="M${pts.map(([x, y]) => P(X(x, y))).join('L')}Z" fill="${f}" ${st}/>`;
      return `<path d="M${P(X(0, -.02))} L${P(X(0, .12))}" stroke="${INK}" stroke-width=".025"/>` + pl([[-.09, .12], [.09, .12], [.12, .2], [-.12, .2]], '#b88a3a') + pl([[-.1, .2], [.1, .2], [.1, .5], [-.1, .5]], '#ffd98a')
        + `<path d="M${P(X(-.1, .2))} L${P(X(-.1, .5))} M${P(X(0, .2))} L${P(X(0, .5))} M${P(X(.1, .2))} L${P(X(.1, .5))}" stroke="#7a5a2a" stroke-width=".02"/>` + pl([[-.13, .5], [.13, .5], [.13, .6], [-.13, .6]], '#a8782e'); }
    case 'detonator': return poly([[.05, -.09], [.25, -.09], [.25, .03], [.05, .03]], '#c8a23a') + poly([[.0, -.02], [.3, -.02], [.3, .01], [.0, .01]], '#7a7a80');
    case 'flaglamp': return poly([[-.02, -.05], [.12, -.05], [.12, .24], [-.02, .24]], '#3a3a3a') + `<circle cx="${n(R(.05, .3)[0])}" cy="${n(R(.05, .3)[1])}" r=".09" fill="#ff4a2a" ${st}/>`;
    case 'paper': return poly([[0, -.3], [.38, -.32], [.4, .16], [.02, .18]], '#f2ead6') + [0, 1, 2, 3].map(i => `<path d="M${P(R(.06, -.22 + i * .09))}L${P(R(.33, -.23 + i * .09))}" stroke="#5a4a3a" stroke-width=".02"/>`).join('');
    case 'pick': return `<path d="M${P(R(-.5, 0))} L${P(R(.9, 0))}" stroke="${INK}" stroke-width=".11" stroke-linecap="round"/><path d="M${P(R(-.5, 0))} L${P(R(.9, 0))}" stroke="#8a5a2e" stroke-width=".07" stroke-linecap="round"/>` + poly([[.82, -.5], [.9, -.08], [.98, -.08], [1.0, .4], [.9, .1], [.84, .1]], '#6a6e74');
    case 'shovel': return `<path d="M${P(R(-.4, 0))} L${P(R(1.0, 0))}" stroke="${INK}" stroke-width=".1" stroke-linecap="round"/><path d="M${P(R(-.4, 0))} L${P(R(1.0, 0))}" stroke="#8a5a2e" stroke-width=".06" stroke-linecap="round"/>` + poly([[.95, -.16], [1.35, -.18], [1.42, 0], [1.35, .18], [.95, .16]], '#7a7e84');
    case 'hammer': return `<path d="M${P(R(-.1, 0))} L${P(R(.6, 0))}" stroke="${INK}" stroke-width=".09" stroke-linecap="round"/><path d="M${P(R(-.1, 0))} L${P(R(.6, 0))}" stroke="#8a5a2e" stroke-width=".05"/>` + poly([[.55, -.16], [.7, -.16], [.7, .16], [.55, .16]], '#5a5e64');
    case 'rope': { const o = other ?? R(0, .6); return `<path d="M${P(at)} Q${P([(at[0] + o[0]) / 2 + .1, (at[1] + o[1]) / 2])} ${P(o)}" stroke="#c8b88a" stroke-width=".04" fill="none"/>`; }
    case 'telescope': return poly([[-.2, -.06], [.7, -.09], [.7, .09], [-.2, .06]], '#a8783a');
    case 'bucket': return poly([[-.15, .1], [.15, .1], [.12, .4], [-.12, .4]], '#7a7e84');
    case 'flag': case 'cage': return '';
  }
}

/** Draw one character. Returns SVG (local coords) and joints. */
export function toon7(p: Pose, L: T7Look, o: T7Opts): { svg: string; j: Joints } {
  const t = o.t, seed = o.seed ?? 1, id = o.id, H = L.height ?? 1, G = L.build ?? 1, defs: string[] = [];
  const back = (p.back ?? 0) > .5, at = Math.abs(p.turn), sg = Math.sign(p.turn) || 1;
  const breath = o.noAuto ? 0 : Math.sin(t * 2 * Math.PI / 3.8 + seed) * .016;
  const hip: V2 = [p.hipX, -1.72 * H + p.crouch];
  const u: V2 = [Math.sin(p.lean), -Math.cos(p.lean)], r: V2 = [Math.cos(p.lean), Math.sin(p.lean)];
  const TL = 1.38 * H + breath, sw = .52 * G * (1 - .28 * at), hw = .46 * G * (1 - .22 * at) + (L.belly ?? 0) * .08;
  const at2 = (a: number, b: number): V2 => add(add(hip, r, a), u, b);
  const chest = at2(0, TL), neck = at2(p.turn * .04, TL + .1);
  const headC = add(add(neck, u, .62 + p.headLift), r, p.turn * .08);
  const skin = L.skin, top = L.top;
  // ---------- arms
  const shoulder = (side: number): V2 => at2(side * sw * .86 - p.turn * .1 * (side === sg ? .3 : 1), TL - .14);
  const arm = (side: number) => {
    const s = shoulder(side), tgt = side < 0 ? p.handA : p.handB, pref = (side < 0 ? p.bendA : p.bendB) ?? 1;
    const k1 = ik2(s, tgt, .74, .7, 1), k2 = ik2(s, tgt, .74, .7, -1);
    const outer = (k1.mid[0] - s[0]) * side >= (k2.mid[0] - s[0]) * side ? k1 : k2, inner = outer === k1 ? k2 : k1, lower = k1.mid[1] >= k2.mid[1] ? k1 : k2;
    const { mid, end } = pref === 2 ? lower : pref === 3 ? (lower === k1 ? k2 : k1) : pref >= 0 ? outer : inner;
    const dir = Math.atan2(end[1] - mid[1], end[0] - mid[0]); const wrist = add(end, [Math.cos(dir), Math.sin(dir)], -.12);
    const sl = L.sleeves === 'rolled'; const lp = limbPath(s, mid, wrist, .34 * G, .27 * G, .21 * G);
    let svg = '';
    if (sl) { const cut = lerp2(mid, wrist, .25); const lp2 = limbPath(s, mid, cut, .34 * G, .28 * G, .27 * G); const fa = limbPath(lerp2(mid, wrist, .1), lerp2(mid, wrist, .55), wrist, .22 * G, .2 * G, .18 * G);
      svg += `<path d="${fa.fill}" fill="${grad(defs, id, skin, 30, .82)}"/><path d="${fa.side1}" fill="none" stroke="${INK}" stroke-width="${LW}"/><path d="${fa.side2}" fill="none" stroke="${INK}" stroke-width="${LW}"/>`
        + `<path d="${lp2.fill}" fill="${grad(defs, id, top, 35)}"/><path d="${lp2.side1}" fill="none" stroke="${INK}" stroke-width="${LW}"/><path d="${lp2.side2}" fill="none" stroke="${INK}" stroke-width="${LW}"/>`
        + `<path d="M${P(add(cut, perp(nrm(sub(wrist, mid))), .16 * G))} L${P(add(cut, perp(nrm(sub(wrist, mid))), -.16 * G))}" stroke="${shade(top, .7)}" stroke-width=".09" stroke-linecap="round"/>`; }
    else svg += `<path d="${lp.fill}" fill="${grad(defs, id, top, 35)}"/><path d="${lp.side1}" fill="none" stroke="${INK}" stroke-width="${LW}"/><path d="${lp.side2}" fill="none" stroke="${INK}" stroke-width="${LW}"/>${lp.crease ? `<path d="${lp.crease}" stroke="${INK}" stroke-width="${LI}" fill="none"/>` : ''}`
      + `<path d="M${P(add(wrist, [Math.cos(dir), Math.sin(dir)], -.07))} l${n(-Math.sin(dir) * .12)} ${n(Math.cos(dir) * .12)} M${P(add(wrist, [Math.cos(dir), Math.sin(dir)], -.07))} l${n(Math.sin(dir) * .12)} ${n(-Math.cos(dir) * .12)}" stroke="${shade(top, .6)}" stroke-width="${LI}"/>`;
    const prop = side < 0 ? o.propA : o.propB; const shape = (side < 0 ? p.shapeA : p.shapeB) ?? 'relaxed';
    const hshape = prop ? 'grip' : shape === 'hold' ? 'grip' : shape;
    const hnd = hand7(end, dir, hshape as Hand, side * (back ? -1 : 1) * (Math.cos(dir) < 0 ? -1 : 1), skin, defs, id);
    return { svg, hand: hnd, end, dir, prop };
  };
  const A = arm(-1), B = arm(1);
  // ---------- legs
  const leg = (side: number) => {
    const hj = at2(side * hw * .5 * (1 - .4 * at), .1), tgt = side < 0 ? p.footA : p.footB;
    const kd = p.kneeDir ?? (at > .2 ? sg : side * .15);
    const k1 = ik2(hj, add(tgt, [0, -.17]), .82 * H, .76 * H, 1), k2 = ik2(hj, add(tgt, [0, -.17]), .82 * H, .76 * H, -1);
    const pick = p.kneeUp ? (k1.mid[1] < k2.mid[1] ? k1 : k2) : (k1.mid[0] - hj[0]) * kd >= (k2.mid[0] - hj[0]) * kd ? k1 : k2;
    const lp = limbPath(hj, pick.mid, pick.end, .46 * G, .34 * G, .3 * G);
    let svg = `<path d="${lp.fill}" fill="${grad(defs, id, L.pants, 25, .72)}"/><path d="${lp.side1}" fill="none" stroke="${INK}" stroke-width="${LW}"/><path d="${lp.side2}" fill="none" stroke="${INK}" stroke-width="${LW}"/>${lp.crease ? `<path d="${lp.crease}" stroke="${INK}" stroke-width="${LI}" fill="none"/>` : ''}`;
    svg += `<path d="M${P(lerp2(hj, pick.mid, .55))} q${n(side * .05)} .12 .0 .22" stroke="${shade(L.pants, .62)}" stroke-width="${LI}" fill="none"/>`;
    return svg + boot(add(pick.end, [0, .17]), at > .2 ? p.turn : side * .2, L.boots, defs, id);
  };
  // ---------- torso
  const tp = (a: number, b: number) => P(at2(a, b));
  const hem = L.topKind === 'coat' || L.topKind === 'dress' ? -.55 : L.skirt ? -.9 : -.08;
  const torsoPath = `M${tp(-hw * 1.02, hem)} C${tp(-hw * 1.08, TL * .3)} ${tp(-sw * .82, TL * .55)} ${tp(-sw * .92, TL * .86)} Q${tp(-sw * .95, TL + .02)} ${tp(-sw * .55, TL + .04)} L${tp(sw * .55, TL + .04)} Q${tp(sw * .95, TL + .02)} ${tp(sw * .92, TL * .86)} C${tp(sw * .82, TL * .55)} ${tp(hw * 1.08, TL * .3)} ${tp(hw * 1.02, hem)} Q${tp(0, hem - .08)} ${tp(-hw * 1.02, hem)}Z`;
  let torso = `<clipPath id="${id}t"><path d="${torsoPath}"/></clipPath><path d="${torsoPath}" fill="${grad(defs, id, top, 30, .74)}"/><g clip-path="url(#${id}t)">`;
  const ln = (a: [number, number], b: [number, number], col = shade(top, .55), w = LI) => `<path d="M${tp(...a)}L${tp(...b)}" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round"/>`;
  const cx = p.turn * sw * .32;
  if (!back) {
    const inner = L.inner ?? '#efe8d8';
    if (L.topKind === 'overalls') { torso += `<path d="M${tp(cx - .28, TL * .55)} L${tp(cx + .28, TL * .55)} L${tp(hw * 1.1, -.2)} L${tp(-hw * 1.1, -.2)}Z" fill="${L.apron ?? '#3a4a6a'}" stroke="${INK}" stroke-width="${LI}"/>` + ln([cx - .25, TL * .55], [cx - .3, TL + .05], L.apron ?? '#3a4a6a', .08) + ln([cx + .25, TL * .55], [cx + .3, TL + .05], L.apron ?? '#3a4a6a', .08); }
    if (['jacket', 'coat', 'suit', 'waistcoat'].includes(L.topKind)) {
      torso += `<path d="M${tp(cx - .26, TL + .06)} L${tp(cx, TL * .45)} L${tp(cx + .26, TL + .06)}Z" fill="${inner}"/>`;
      if (L.tie) torso += `<path d="M${tp(cx - .05, TL - .02)} L${tp(cx + .05, TL - .02)} L${tp(cx + .07, TL * .55)} L${tp(cx, TL * .48)} L${tp(cx - .07, TL * .55)}Z" fill="${L.tie}" stroke="${INK}" stroke-width="${LI * .7}"/>`;
      torso += `<path d="M${tp(cx - .3, TL + .06)} Q${tp(cx - .26, TL * .78)} ${tp(cx - .02, TL * .42)} L${tp(cx - .02, hem)}" fill="none" stroke="${INK}" stroke-width="${LI * 1.2}"/><path d="M${tp(cx + .3, TL + .06)} Q${tp(cx + .26, TL * .78)} ${tp(cx + .02, TL * .42)}" fill="none" stroke="${INK}" stroke-width="${LI * 1.2}"/>`;
      torso += `<path d="M${tp(cx - .3, TL + .05)} L${tp(cx - .14, TL * .7)} L${tp(cx - .2, TL * .68)}" fill="${shade(top, .85)}" stroke="${INK}" stroke-width="${LI}"/><path d="M${tp(cx + .3, TL + .05)} L${tp(cx + .14, TL * .7)} L${tp(cx + .2, TL * .68)}" fill="${shade(top, .85)}" stroke="${INK}" stroke-width="${LI}"/>`;
      for (let i = 0; i < 3; i++) { const q = at2(cx + .06, TL * .36 - i * .26); torso += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r=".035" fill="${L.buttons ?? shade(top, .45)}"/>`; }
      if (L.topKind === 'waistcoat') torso += `<path d="M${tp(-hw * 1.2, TL * .95)} L${tp(-sw * .55, TL * .95)} L${tp(-hw * .9, -.1)} L${tp(-hw * 1.2, -.1)}Z M${tp(hw * 1.2, TL * .95)} L${tp(sw * .55, TL * .95)} L${tp(hw * .9, -.1)} L${tp(hw * 1.2, -.1)}Z" fill="${L.inner ?? '#d8d0c0'}" opacity=".9"/>`;
      for (const sx of [-1, 1]) torso += `<path d="M${tp(cx + sx * hw * .55 - .14, TL * .22)} h.28" stroke="${shade(top, .55)}" stroke-width="${LI}"/>`;
    } else if (L.topKind === 'shirt') {
      torso += `<path d="M${tp(cx - .18, TL + .05)} L${tp(cx, TL * .78)} L${tp(cx + .18, TL + .05)}" fill="${skin}" stroke="${INK}" stroke-width="${LI}"/>` + ln([cx, TL * .78], [cx, -.1]);
      for (let i = 0; i < 3; i++) { const q = at2(cx + .045, TL * .62 - i * .3); torso += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r=".028" fill="${shade(top, .55)}"/>`; }
    } else if (L.topKind === 'dress') {
      torso += `<path d="M${tp(cx - .2, TL + .05)} Q${tp(cx, TL * .85)} ${tp(cx + .2, TL + .05)}" fill="${L.inner ?? '#f4eee2'}" stroke="${INK}" stroke-width="${LI}"/>` + `<path d="M${tp(-hw * 1.2, TL * .42)} Q${tp(0, TL * .38)} ${tp(hw * 1.2, TL * .42)}" stroke="${L.trim ?? shade(top, .6)}" stroke-width=".06" fill="none"/>`;
      for (let i = -2; i <= 2; i++) torso += ln([cx + i * hw * .35, TL * .35], [cx + i * hw * .45, hem + .05], shade(top, .7), LI * .8);
    }
    if (L.apron && L.topKind !== 'overalls') torso += `<path d="M${tp(cx - hw * .7, TL * .45)} L${tp(cx + hw * .7, TL * .45)} L${tp(cx + hw * .9, hem - .02)} L${tp(cx - hw * .9, hem - .02)}Z" fill="${L.apron}" stroke="${INK}" stroke-width="${LI}"/>`;
    if (L.belt) torso += `<path d="M${tp(-hw * 1.3, .12)} L${tp(hw * 1.3, .12)} L${tp(hw * 1.3, .28)} L${tp(-hw * 1.3, .28)}Z" fill="${L.belt}"/><rect x="${n(at2(cx - .08, .28)[0])}" y="${n(at2(cx - .08, .28)[1])}" width=".16" height=".16" fill="none" stroke="#c8a85a" stroke-width=".035"/>`;
    if ((L.soot ?? 0) > 0) torso += `<g opacity="${n(L.soot! * .55)}">${[[-.2, .6], [.25, .35], [.1, .9], [-.3, .2]].map(([a, b]) => `<ellipse cx="${n(at2(a, b)[0])}" cy="${n(at2(a, b)[1])}" rx=".12" ry=".07" fill="#2a2420"/>`).join('')}</g>`;
  }
  torso += ln([-hw * .7, TL * .12], [-hw * .55, TL * .3], shade(top, .68), LI * .8) + ln([hw * .62, TL * .1], [hw * .5, TL * .26], shade(top, .68), LI * .8);
  if (o.rim) torso += `<path d="M${tp(sw * (o.rimSide ?? -1) * .9, TL * .85)} C${tp(sw * (o.rimSide ?? -1) * .82, TL * .55)} ${tp(hw * (o.rimSide ?? -1) * 1.06, TL * .3)} ${tp(hw * (o.rimSide ?? -1) * 1.0, hem + .05)}" stroke="${o.rim}" stroke-width=".07" fill="none" opacity=".8"/>`;
  torso += `</g><path d="${torsoPath}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>`;
  // ---------- neck
  const nb = at2(p.turn * .04, TL - .05), nt = add(neck, u, .35);
  const neckSvg = `<path d="M${P(add(nb, r, -.15))} L${P(add(nt, r, -.13))} L${P(add(nt, r, .13))} L${P(add(nb, r, .15))}Z" fill="${shade(skin, .86)}" stroke="${INK}" stroke-width="${LW}"/>` + (L.topKind !== 'dress' ? `<path d="M${P(add(nb, r, -.24))} Q${P(add(nb, u, .12))} ${P(add(nb, r, .24))}" fill="${L.inner ?? '#efe8d8'}" stroke="${INK}" stroke-width="${LI * 1.2}"/>` : '');
  // ---------- head
  const ht = clamp(p.turn + p.headTurn, -1, 1), ha = Math.abs(ht), hs = Math.sign(ht) || 1;
  const Fc = { ...(o.face ?? EXPR.neutral) };
  const sq = (o.squash ?? 0) + Fc.shock * .07 + Fc.mOpen * .04 - (Fc.happyEyes > .5 ? .03 : 0);   // squash & stretch
  const hd = L.head ?? {}; const W = .64 * (hd.w ?? 1) * (1 - sq * .5), Hh = .7 * (hd.h ?? 1) * (1 + sq), J = (hd.jaw ?? 1), CH = hd.chin ?? 1, CK = hd.cheek ?? 1;
  const sh = ht * W * .28;                       // jaw shift toward the facing side
  const headPath = `M${n(-W)} ${n(-.05)} C${n(-W)} ${n(-Hh * .95)} ${n(-W * .45)} ${n(-Hh * 1.12)} ${n(0)} ${n(-Hh * 1.12)} C${n(W * .45)} ${n(-Hh * 1.12)} ${n(W)} ${n(-Hh * .95)} ${n(W)} ${n(-.05)} C${n(W * CK)} ${n(Hh * .35)} ${n(W * .62 * J + sh)} ${n(Hh * .72)} ${n(W * .28 * J + sh * 1.2)} ${n(Hh * .86 * CH)} Q${n(sh * 1.3)} ${n(Hh * .98 * CH)} ${n(-W * .28 * J + sh * 1.2)} ${n(Hh * .86 * CH)} C${n(-W * .62 * J + sh)} ${n(Hh * .72)} ${n(-W * CK)} ${n(Hh * .35)} ${n(-W)} ${n(-.05)}Z`;
  let hg = '';
  for (const side of [-1, 1]) { if (ha > .45 && side === hs) continue; const ex = side * W * .98 - ht * .32 * W; const ec = shade(skin, .92);
    hg += `<path d="M${n(ex)} -.12 Q${n(ex + side * .16)} -.15 ${n(ex + side * .15)} .06 Q${n(ex + side * .12)} .22 ${n(ex)} .16Z" fill="${ec}" stroke="${INK}" stroke-width="${LW}"/><path d="M${n(ex + side * .04)} -.06 Q${n(ex + side * .1)} .02 ${n(ex + side * .04)} .1" stroke="${shade(skin, .62)}" stroke-width="${LI}" fill="none"/>`; }
  hg += `<clipPath id="${id}h"><path d="${headPath}"/></clipPath><path d="${headPath}" fill="${grad(defs, id, skin, 40, .82)}"/><g clip-path="url(#${id}h)">`;
  if (o.rim) hg += `<path d="M${n((o.rimSide ?? -1) * W * .97)} -.6 Q${n((o.rimSide ?? -1) * W * 1.04)} .05 ${n((o.rimSide ?? -1) * W * .55)} .62" stroke="${o.rim}" stroke-width=".08" fill="none" opacity=".85"/>`;
  if (L.beard === 'stubble' && !back) hg += `<path d="M${n(-W * .9 + sh)} .18 Q${n(sh)} ${n(Hh * 1.15)} ${n(W * .9 + sh)} .18 L${n(W)} 1 L${n(-W)} 1Z" fill="${L.beardColor ?? L.hair}" opacity=".2"/>`;
  if ((L.soot ?? 0) > 0 && !back) hg += `<ellipse cx="${n(-W * .45 + sh)}" cy=".3" rx=".14" ry=".07" fill="#2a2420" opacity="${n(L.soot! * .45)}"/><ellipse cx="${n(W * .5)}" cy="-.35" rx=".1" ry=".05" fill="#2a2420" opacity="${n(L.soot! * .35)}"/>`;
  hg += `</g><path d="${headPath}" fill="none" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/>`;
  if (!back) {
    const bl = o.noAuto ? 0 : blink(t, seed); const sc = o.noAuto ? [0, 0] as V2 : saccade(t, seed, .25);
    const fx = ht * W * .5, ey = -.08 - sq * .1, es = .27 * (1 - .4 * ha) * (hd.w ?? 1), eo = clamp(Fc.eyeOpen * (1 - bl), 0, 1.45); const iris = L.eyes ?? '#5a3a22';
    let f = '';
    for (const side of [-1, 1]) {
      const far = ha > .2 && side === -hs; const sz = far ? 1 - ha * .38 : 1; const ex = fx + side * es * (far ? .82 : 1);
      const erx = .17 * sz, ery = .15 * Math.max(eo, .05) * (1 + Fc.eyeWhite * .25);
      const lift = Fc.browAng * .03 * -side * 0;
      if (Fc.happyEyes > .5) { f += `<path d="M${n(ex - erx)} ${n(ey + .03)} Q${n(ex)} ${n(ey - .12)} ${n(ex + erx)} ${n(ey + .03)}" stroke="${INK}" stroke-width=".055" fill="none" stroke-linecap="round"/>`; }
      else if (eo < .12) { f += `<path d="M${n(ex - erx)} ${n(ey)} Q${n(ex)} ${n(ey + .045)} ${n(ex + erx)} ${n(ey)}" stroke="${INK}" stroke-width=".05" fill="none" stroke-linecap="round"/>`; }
      else {
        const almond = `M${n(ex - erx)} ${n(ey + lift)} Q${n(ex - erx * .2)} ${n(ey - ery * 1.25)} ${n(ex + erx)} ${n(ey - ery * .15)} Q${n(ex + erx * .25)} ${n(ey + ery * 1.15)} ${n(ex - erx)} ${n(ey + lift)}Z`;
        const ir = Fc.eyeWhite > .5 ? .045 + Fc.pupil * .02 : .088 * sz; const gx = clamp(Fc.gx + sc[0] + ht * .45, -1, 1) * erx * .45, gy = clamp(Fc.gy + sc[1], -1, 1) * ery * .35;
        f += `<clipPath id="${id}e${side}"><path d="${almond}"/></clipPath><path d="${almond}" fill="#fffaf0"/><g clip-path="url(#${id}e${side})">`;
        f += `<circle cx="${n(ex + gx)}" cy="${n(ey + gy + .005)}" r="${n(ir)}" fill="${Fc.eyeWhite > .5 ? '#2a1a12' : iris}"/><circle cx="${n(ex + gx)}" cy="${n(ey + gy + .005)}" r="${n(ir * .55)}" fill="#120c08"/><circle cx="${n(ex + gx - ir * .35)}" cy="${n(ey + gy - ir * .35)}" r="${n(ir * .28)}" fill="#fff"/>`;
        const lt = clamp(Fc.lidTop), ang = Fc.browAng * side * -.22;
        f += `<path d="M${n(ex - erx - .03)} ${n(ey - ery * 1.6)} L${n(ex + erx + .03)} ${n(ey - ery * 1.6)} L${n(ex + erx + .03)} ${n(ey - ery * 1.2 + lt * ery * 1.4 - ang * .08)} L${n(ex - erx - .03)} ${n(ey - ery * 1.2 + lt * ery * 1.4 + ang * .08)}Z" fill="${shade(skin, .9)}" opacity="${lt > .02 ? 1 : 0}"/>`;
        if (Fc.lidLow > .02) f += `<path d="M${n(ex - erx - .03)} ${n(ey + ery * 1.3)} L${n(ex + erx + .03)} ${n(ey + ery * 1.3)} L${n(ex + erx)} ${n(ey + ery * (1 - Fc.lidLow * 1.2))} Q${n(ex)} ${n(ey + ery * (1 - Fc.lidLow * 1.8))} ${n(ex - erx)} ${n(ey + ery * (1 - Fc.lidLow * 1.2))}Z" fill="${shade(skin, .95)}"/>`;
        f += `</g>`;
        // lash line (thick upper lid with a little wing) + thin lower lid
        const ly = lt > .02 ? ey - ery * 1.2 + lt * ery * 1.4 : ey - ery * .95;
        f += `<path d="M${n(ex - erx - .01)} ${n(ey + .005)} Q${n(ex - erx * .3)} ${n(ly - .02 + ang * .06)} ${n(ex + erx + .02)} ${n(ly + ery * .55 - ang * .06)} l${n(side * .03 + .02)} -.02" stroke="${INK}" stroke-width=".045" fill="none" stroke-linecap="round"/>`;
        f += `<path d="M${n(ex - erx * .7)} ${n(ey + ery * .95)} Q${n(ex + erx * .2)} ${n(ey + ery * 1.15)} ${n(ex + erx * .8)} ${n(ey + ery * .4)}" stroke="${INK}" stroke-width="${LI * .7}" fill="none" opacity=".6"/>`;
      }
      // brows: filled tapered shapes
      const one = (Fc.browOne ?? 0) * side > 0 ? (Fc.browOne ?? 0) * side * .1 : 0;
      const by = ey - .2 - Fc.browY * .085 - one + sq * .05, inn = Fc.browAng * .065, bc = Fc.browCurve * .04;
      const ix = ex - side * .11 * sz, ox = ex + side * .17 * sz, bcol = shade(L.hair === '#e8e4dc' ? '#9a948a' : L.hair, .85);
      f += `<path d="M${n(ix)} ${n(by - inn + .025)} Q${n(ex)} ${n(by - bc - .05)} ${n(ox)} ${n(by + inn * .3 - .005)} Q${n(ex)} ${n(by - bc + .01)} ${n(ix)} ${n(by - inn - .03)}Z" fill="${bcol}" stroke="${bcol}" stroke-width=".02" stroke-linejoin="round"/>`;
    }
    if (L.glasses) f += [-1, 1].map(sd => `<circle cx="${n(fx + sd * es)}" cy="${n(ey)}" r=".18" fill="#cfe6ff" fill-opacity=".15" stroke="${INK}" stroke-width=".035"/>`).join('') + `<path d="M${n(fx - es + .18)} ${n(ey - .02)} Q${n(fx)} ${n(ey - .07)} ${n(fx + es - .18)} ${n(ey - .02)}" stroke="${INK}" stroke-width=".03" fill="none"/>`;
    // nose
    const nx = fx + ht * .16, ny = .12 + sq * .02; const ns = L.nose ?? 'button'; const nc = shade(skin, .62);
    if (ha > .35) { const d = hs; f += `<path d="M${n(nx - d * .02)} ${n(ny - .17)} Q${n(nx + d * (ns === 'long' || ns === 'hook' ? .22 : .14))} ${n(ny + .02)} ${n(nx + d * .02)} ${n(ny + .07)}" fill="${shade(skin, .97)}" stroke="${INK}" stroke-width="${LI * 1.3}"/>`; }
    else if (ns === 'round') f += `<path d="M${n(nx - .09)} ${n(ny + .02)} Q${n(nx)} ${n(ny + .11)} ${n(nx + .09)} ${n(ny + .02)}" stroke="${INK}" stroke-width="${LI * 1.2}" fill="none"/><ellipse cx="${n(nx)}" cy="${n(ny - .01)}" rx=".08" ry=".06" fill="${shade(skin, .9)}"/>`;
    else f += `<path d="M${n(nx - .015)} ${n(ny - (ns === 'long' ? .2 : .12))} Q${n(nx + .06)} ${n(ny + .01)} ${n(nx + .01)} ${n(ny + .05)} M${n(nx - .07)} ${n(ny + .045)} q.035 .025 .07 0" stroke="${nc}" stroke-width="${LI * 1.3}" fill="none" stroke-linecap="round"/>`;
    f += `<ellipse cx="${n(fx - es - .08)}" cy="${n(.17)}" rx=".11" ry=".055" fill="#ff7a62" opacity="${n(.12 + Fc.blush * .45)}"/><ellipse cx="${n(fx + es + .08)}" cy="${n(.17)}" rx=".11" ry=".055" fill="#ff7a62" opacity="${n(.12 + Fc.blush * .45)}"/>`;
    if (L.beard === 'stache' || L.beard === 'full' || L.beard === 'chops') { const bc2 = L.beardColor ?? L.hair; if (L.beard !== 'stache') f += `<path d="M${n(-W * .92 + sh * .5)} 0 Q${n(-W * .8)} ${n(Hh * .9)} ${n(sh)} ${n(Hh * 1.02 * CH)} Q${n(W * .8)} ${n(Hh * .9)} ${n(W * .92 + sh * .5)} 0 L${n(W * .62)} .32 Q${n(sh)} .55 ${n(-W * .62)} .32Z" fill="${bc2}" stroke="${INK}" stroke-width="${LI}" opacity="${L.beard === 'chops' ? .95 : 1}"/>`;
      f += `<path d="M${n(nx - .22)} ${n(ny + .16)} Q${n(nx - .1)} ${n(ny + .05)} ${n(nx)} ${n(ny + .11)} Q${n(nx + .1)} ${n(ny + .05)} ${n(nx + .22)} ${n(ny + .16)} Q${n(nx)} ${n(ny + .2)} ${n(nx - .22)} ${n(ny + .16)}Z" fill="${bc2}" stroke="${INK}" stroke-width="${LI}"/>`; }
    // mouth
    const mx = fx + ht * .08, my = .34 + sq * .06, mw = .17 * Fc.mWide * (1 - .3 * ha), sm = Fc.smile, smk = Fc.smirk ?? 0, mo = clamp(Fc.mOpen);
    const cL = my - sm * .055 + smk * .04, cR = my - sm * .055 - smk * .04;
    if (Fc.mO > .5) { const a = .055 + .04 * mo, b = .07 + .07 * mo; f += `<ellipse cx="${n(mx)}" cy="${n(my + .02)}" rx="${n(a)}" ry="${n(b)}" fill="#5a1c1c" stroke="${INK}" stroke-width="${LI * 1.4}"/><ellipse cx="${n(mx)}" cy="${n(my + .02 + b * .5)}" rx="${n(a * .6)}" ry="${n(b * .32)}" fill="#d85a5a"/>`; }
    else if (mo > .08) {
      const d = .04 + mo * .22; const path = `M${n(mx - mw)} ${n(cL)} Q${n(mx)} ${n(my + sm * .05 - .02)} ${n(mx + mw)} ${n(cR)} Q${n(mx + mw * .2)} ${n(my + d + sm * .05)} ${n(mx - mw)} ${n(cL)}Z`;
      f += `<clipPath id="${id}m"><path d="${path}"/></clipPath><path d="${path}" fill="#5a1c1c"/><g clip-path="url(#${id}m)"><ellipse cx="${n(mx)}" cy="${n(my + d)}" rx="${n(mw * .7)}" ry="${n(d * .45)}" fill="#d85a5a"/>`;
      if (Fc.teeth > .05) f += Fc.teeth > .85 ? `<rect x="${n(mx - mw)}" y="${n(my - .2)}" width="${n(mw * 2)}" height=".5" fill="#fffaf0"/><path d="M${n(mx - mw)} ${n(my + d * .45)}H${n(mx + mw)}" stroke="#bdb6aa" stroke-width=".018"/>${[-1, 0, 1].map(i => `<path d="M${n(mx + i * mw * .45)} ${n(my - .2)}V${n(my + .3)}" stroke="#cfc8bc" stroke-width=".014"/>`).join('')}`
        : `<rect x="${n(mx - mw)}" y="${n(my - .2)}" width="${n(mw * 2)}" height="${n(.2 + Fc.teeth * .05)}" fill="#fffaf0"/>`;
      f += `</g><path d="${path}" fill="none" stroke="${INK}" stroke-width="${LI * 1.4}" stroke-linejoin="round"/>`;
    } else f += `<path d="M${n(mx - mw)} ${n(cL)} Q${n(mx)} ${n(my + sm * .07)} ${n(mx + mw)} ${n(cR)}" stroke="${INK}" stroke-width="${LI * 1.5}" fill="none" stroke-linecap="round"/><path d="M${n(mx - mw * .35)} ${n(my + .08)} q${n(mw * .35)} .03 ${n(mw * .7)} 0" stroke="${shade(skin, .7)}" stroke-width="${LI * .8}" fill="none"/>`;
    if (Fc.sweat > .2) f += `<path d="M${n(W * .72 * -hs)} -.45 q-.06 .13 0 .17 q.06 -.04 0 -.17Z" fill="#a8dcff" stroke="${INK}" stroke-width=".02" opacity="${n(Fc.sweat)}"/>`;
    if (Fc.tears > .2) for (const sd of [-1, 1]) f += `<path d="M${n(fx + sd * es)} ${n(ey + .1)} q${n(sd * .03)} .2 0 .32" stroke="#7ac8ff" stroke-width=".05" opacity="${n(Fc.tears)}" fill="none" stroke-linecap="round"/>`;
    if (Fc.shock > .2) f += [-1, 0, 1].map(i => `<path d="M${n(i * .45)} ${n(-Hh * 1.2 - Math.abs(i) * -.06)} l${n(i * .07)} -.2" stroke="${INK}" stroke-width=".045" opacity="${n(Fc.shock)}" stroke-linecap="round"/>`).join('');
    if (Fc.vein > .2) f += `<path d="M${n(W * .45)} -.55 l.07 .07 m-.07 0 l.07 -.07" stroke="#c83030" stroke-width=".045" opacity="${n(Fc.vein)}"/>`;
    if (Fc.question > .2) f += `<text x="${n(W * .95)}" y="${n(-Hh * 1.1)}" font-family="Inter,Arial" font-weight="900" font-size=".5" fill="#fff" stroke="${INK}" stroke-width=".035" paint-order="stroke" opacity="${n(Fc.question)}">?</text>`;
    hg += f;
  }
  // ---------- hair (over the head) and hat
  const hc = L.hair, hairD = shade(hc, .72); const X = -ht * .1;
  const hairPaths: Record<string, string> = {
    short: `M${-W * 1.02} -.05 C${-W * 1.06} ${-Hh * .9} ${-W * .5} ${-Hh * 1.24} ${.05} ${-Hh * 1.2} C${W * .6} ${-Hh * 1.22} ${W * 1.06} ${-Hh * .9} ${W * 1.02} -.08 L${W * .9} -.3 Q${W * .7} ${-Hh * .55} ${W * .2} ${-Hh * .62} L${0} ${-Hh * .52} L${-W * .25} ${-Hh * .64} Q${-W * .75} ${-Hh * .6} ${-W * .9} -.25Z`,
    side: `M${-W * 1.03} 0 C${-W * 1.08} ${-Hh * .95} ${-W * .4} ${-Hh * 1.28} ${.12} ${-Hh * 1.22} C${W * .75} ${-Hh * 1.18} ${W * 1.06} ${-Hh * .85} ${W * 1.02} -.06 L${W * .92} -.32 C${W * .6} ${-Hh * .72} ${-W * .05} ${-Hh * .9} ${-W * .4} ${-Hh * .55} L${-W * .9} -.15Z`,
    swept: `M${-W * 1.03} -.02 C${-W * 1.1} ${-Hh * 1.05} ${-W * .2} ${-Hh * 1.42} ${W * .55} ${-Hh * 1.18} C${W * 1.0} ${-Hh * 1.0} ${W * 1.06} ${-Hh * .6} ${W * 1.02} -.06 L${W * .9} -.3 C${W * .55} ${-Hh * .9} ${-W * .4} ${-Hh * .85} ${-W * .9} -.2Z`,
    curly: Array.from({ length: 11 }, (_, i) => { const a = Math.PI * (1.05 + i * .09), rr = .2; const cx2 = Math.cos(a) * W * .98, cy2 = Math.sin(a) * Hh * 1.02 - .02; return `M${n(cx2 - rr)} ${n(cy2)} a${rr} ${rr} 0 1 1 ${n(rr * 2)} 0 a${rr} ${rr} 0 1 1 ${n(-rr * 2)} 0Z`; }).join(' '),
    bun: `M${-W * 1.02} 0 C${-W * 1.06} ${-Hh * .95} ${-W * .45} ${-Hh * 1.22} 0 ${-Hh * 1.2} C${W * .45} ${-Hh * 1.22} ${W * 1.06} ${-Hh * .95} ${W * 1.02} 0 L${W * .88} -.3 Q0 ${-Hh * .78} ${-W * .88} -.3Z M-.22 ${-Hh * 1.25} a.24 .2 0 1 1 .48 0 a.24 .2 0 1 1 -.48 0Z`,
    long: `M${-W * 1.08} ${Hh * .8} C${-W * 1.2} ${-Hh * .9} ${-W * .45} ${-Hh * 1.26} 0 ${-Hh * 1.22} C${W * .45} ${-Hh * 1.26} ${W * 1.2} ${-Hh * .9} ${W * 1.08} ${Hh * .8} L${W * .82} ${Hh * .3} L${W * .85} -.2 Q0 ${-Hh * .72} ${-W * .85} -.2 L${-W * .82} ${Hh * .3}Z`,
    mutton: `M${-W * 1.02} .25 L${-W * 1.03} -.1 C${-W * 1.05} ${-Hh * .7} ${-W * .7} ${-Hh * .85} ${-W * .45} ${-Hh * .8} L${-W * .7} -.25 L${-W * .82} .25Z M${W * 1.02} .25 L${W * 1.03} -.1 C${W * 1.05} ${-Hh * .7} ${W * .7} ${-Hh * .85} ${W * .45} ${-Hh * .8} L${W * .7} -.25 L${W * .82} .25Z`,
  };
  const hp2 = hairPaths[L.hairStyle] ?? '';
  const covered = L.hat === 'diver' || L.hat === 'helmet' || L.hat === 'bowler' || L.hat === 'driver' || L.hat === 'flatcap' || L.hat === 'boater' || L.hat === 'bonnet';
  if (hp2 && (!covered || L.hairStyle === 'long' || L.hairStyle === 'mutton' || L.hairStyle === 'bun')) hg += `<path d="${hp2}" fill="${grad(defs, id, hc, 60, .72)}" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round" transform="translate(${n(X)} 0)"/><path d="M${n(-W * .5 + X)} ${n(-Hh * .98)} q.25 -.1 .5 -.02 M${n(-W * .2 + X)} ${n(-Hh * .86)} q.2 -.07 .38 0" stroke="${tone(hc, '#ffffff', .35)}" stroke-width=".025" fill="none" opacity=".7"/>`;
  else if (hp2 && covered) hg += `<path d="M${-W * 1.0} -.12 L${-W * .94} .2 L${-W * .82} -.12Z M${W * 1.0} -.12 L${W * .94} .2 L${W * .82} -.12Z" fill="${hairD}"/>`;
  const hcol = L.hatColor ?? '#4a4038'; const hgr = grad(defs, id, hcol, 50, .7);
  switch (L.hat) {
    case 'flatcap': hg += `<path d="M${-W * 1.05} ${-Hh * .55} C${-W * 1.08} ${-Hh * 1.2} ${W * .5} ${-Hh * 1.35} ${W * 1.12} ${-Hh * .75} Q${W * 1.45 + ht * .3} ${-Hh * .6} ${W * 1.25 + ht * .25} ${-Hh * .48} Q${W * .2} ${-Hh * .55} ${-W * 1.05} ${-Hh * .55}Z" fill="${hgr}" stroke="${INK}" stroke-width="${LW}" stroke-linejoin="round"/><path d="M${-W * .6} ${-Hh * 1.05} Q${W * .2} ${-Hh * 1.2} ${W * .9} ${-Hh * .85}" stroke="${shade(hcol, .6)}" stroke-width="${LI}" fill="none"/>`; break;
    case 'helmet': hg += `<path d="M${-W * 1.2} ${-Hh * .5} Q${-W * 1.15} ${-Hh * 1.45} 0 ${-Hh * 1.42} Q${W * 1.15} ${-Hh * 1.45} ${W * 1.2} ${-Hh * .5} Q0 ${-Hh * .62} ${-W * 1.2} ${-Hh * .5}Z" fill="${hgr}" stroke="${INK}" stroke-width="${LW}"/><path d="M${-W * 1.3} ${-Hh * .52} Q0 ${-Hh * .7} ${W * 1.3} ${-Hh * .52}" stroke="${INK}" stroke-width=".08" fill="none"/><path d="M${-W * 1.3} ${-Hh * .52} Q0 ${-Hh * .7} ${W * 1.3} ${-Hh * .52}" stroke="${shade(hcol, .75)}" stroke-width=".045" fill="none"/>`
      + (L.lamp ? `<path d="M${n(ht * .3 - .11)} ${n(-Hh * 1.12)} h.22 v.18 h-.22Z" fill="#b8b2a4" stroke="${INK}" stroke-width="${LI}"/><circle cx="${n(ht * .3)}" cy="${n(-Hh * 1.03)}" r=".07" fill="#fff2c0" stroke="${INK}" stroke-width="${LI}"/>` : ''); break;
    case 'bowler': hg += `<path d="M${-W * 1.18} ${-Hh * .66} Q0 ${-Hh * .82} ${W * 1.18} ${-Hh * .66} Q0 ${-Hh * .5} ${-W * 1.18} ${-Hh * .66}Z" fill="${shade(hcol, .85)}" stroke="${INK}" stroke-width="${LW}"/><path d="M${-W * .78} ${-Hh * .7} C${-W * .8} ${-Hh * 1.55} ${W * .8} ${-Hh * 1.55} ${W * .78} ${-Hh * .7}Z" fill="${hgr}" stroke="${INK}" stroke-width="${LW}"/><path d="M${-W * .78} ${-Hh * .78} Q0 ${-Hh * .86} ${W * .78} ${-Hh * .78}" stroke="#1a1612" stroke-width=".07" fill="none"/>`; break;
    case 'boater': hg += `<path d="M${-W * 1.4} ${-Hh * .7} Q0 ${-Hh * .86} ${W * 1.4} ${-Hh * .7} Q0 ${-Hh * .58} ${-W * 1.4} ${-Hh * .7}Z" fill="${hgr}" stroke="${INK}" stroke-width="${LW}"/><path d="M${-W * .75} ${-Hh * .74} L${-W * .72} ${-Hh * 1.22} Q0 ${-Hh * 1.3} ${W * .72} ${-Hh * 1.22} L${W * .75} ${-Hh * .74}Z" fill="${hgr}" stroke="${INK}" stroke-width="${LW}"/><path d="M${-W * .74} ${-Hh * .84} L${W * .74} ${-Hh * .84}" stroke="#2a3a6a" stroke-width=".09"/>`; break;
    case 'driver': hg += `<path d="M${-W * 1.02} ${-Hh * .55} L${-W * .95} ${-Hh * 1.15} Q0 ${-Hh * 1.3} ${W * .95} ${-Hh * 1.15} L${W * 1.02} ${-Hh * .55}Z" fill="${hgr}" stroke="${INK}" stroke-width="${LW}"/><path d="M${n(-W * .3 + ht * .3)} ${-Hh * .55} Q${n(ht * .4)} ${-Hh * .35} ${n(W * .9 + ht * .4)} ${-Hh * .52}Z" fill="#1a1a1a" stroke="${INK}" stroke-width="${LI}"/>`; break;
    case 'diver': { const R0 = Math.max(W, Hh) * 1.5, Rw = Math.max(W, Hh) * 1.02, cy = -Hh * .12; const cg = grad(defs, id, hcol, 35, .62);
      hg += `<path d="M${n(-R0)} ${n(cy)} a${n(R0)} ${n(R0)} 0 1 0 ${n(R0 * 2)} 0 a${n(R0)} ${n(R0)} 0 1 0 ${n(-R0 * 2)} 0Z M${n(-Rw)} ${n(cy)} a${n(Rw)} ${n(Rw)} 0 1 0 ${n(Rw * 2)} 0 a${n(Rw)} ${n(Rw)} 0 1 0 ${n(-Rw * 2)} 0Z" fill="${cg}" fill-rule="evenodd" stroke="${INK}" stroke-width="${LW}"/>`
        + `<circle cx="0" cy="${n(cy)}" r="${n(Rw)}" fill="#bfe6f0" opacity=".16"/><circle cx="0" cy="${n(cy)}" r="${n(Rw * 1.06)}" fill="none" stroke="#e2b25a" stroke-width=".11"/><circle cx="0" cy="${n(cy)}" r="${n(Rw * 1.06)}" fill="none" stroke="${INK}" stroke-width="${LI}"/>`
        + `<path d="M${n(-Rw * .55)} ${n(cy - Rw * .6)} Q${n(-Rw * .1)} ${n(cy - Rw * .9)} ${n(Rw * .35)} ${n(cy - Rw * .78)}" stroke="#ffffff" stroke-width=".07" fill="none" opacity=".65"/>`
        + [0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k / 8 * Math.PI * 2 + .2; return `<circle cx="${n(Math.cos(a) * Rw * 1.17)}" cy="${n(cy + Math.sin(a) * Rw * 1.17)}" r=".045" fill="#7a4a24" stroke="${INK}" stroke-width=".015"/>`; }).join('')
        + `<path d="M${n(-R0 * .55)} ${n(cy - R0 * .72)} Q0 ${n(cy - R0 * .98)} ${n(R0 * .55)} ${n(cy - R0 * .72)}" stroke="${tone(hcol, '#ffffff', .45)}" stroke-width=".09" fill="none" opacity=".6"/>`; break; }
    case 'bonnet': hg += `<path d="M${-W * 1.15} .1 C${-W * 1.25} ${-Hh * 1.2} ${W * 1.25} ${-Hh * 1.2} ${W * 1.15} .1 L${W * .95} .05 C${W} ${-Hh * .9} ${-W} ${-Hh * .9} ${-W * .95} .05Z" fill="${hgr}" stroke="${INK}" stroke-width="${LW}"/><path d="M${-W * .9} .1 q-.05 .3 .1 .5" stroke="${shade(hcol, .7)}" stroke-width=".05" fill="none"/>`; break;
  }
  const sx = 1 - sq * .35, sy = 1 + sq;
  const headG = `<g transform="translate(${n(headC[0])} ${n(headC[1])}) rotate(${n((p.headTilt + p.lean * .4) * 57.3)}) scale(${n(sx)} ${n(sy)})">${hg}</g>`;
  // ---------- props
  const pA = A.prop ? prop7(A.prop, A.end, A.dir, t, B.end) : '', pB = B.prop ? prop7(B.prop, B.end, B.dir, t, A.end) : '';
  const farSide = at > .15 ? -sg : 0;
  const frontA = (p.frontA ?? (farSide === -1 ? 0 : 1)) > .5 && !back, frontB = (p.frontB ?? (farSide === 1 ? 0 : 1)) > .5 && !back;
  let body = '';
  if (!frontA) body += A.svg + A.hand + pA; if (!frontB) body += B.svg + B.hand + pB;
  body += leg(-1) + leg(1) + torso + neckSvg + headG;
  if (frontA) body += A.svg + pA + A.hand; if (frontB) body += B.svg + pB + B.hand;
  return { svg: `<defs>${defs.join('')}</defs>${body}`, j: { head: headC, chest, hip, handA: A.end, handB: B.end, headR: .75 } };
}
