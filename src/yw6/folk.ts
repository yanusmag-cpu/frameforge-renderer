// YunoWorld Folk — the v6 character system (replaces the thin stickman for all new videos).
// Original design: rounded squircle heads with real skin tones, ears and a button nose; a bean-shaped costumed torso;
// full tapered limbs (2-bone IK elbows/knees), mitten hands with thumbs, chunky shoes; bold dark-brown outline,
// one cel shadow away from the key light and an optional warm rim. Driven by the shared Pose / Face system, so every
// existing move (walk, run, sit, point, fall…) and all 37 expression presets work unchanged.
// Local space: origin on the ground under the hips, +x right, +y DOWN, 1 unit = 0.417 m (same as the Actor cut-out).
import { type Face, EXPR } from '../ff2d/face.ts';
import { blink, clamp, ik2, mix, saccade, type V2 } from '../ff2d/motion.ts';
import { type Pose, type Joints, type Hand } from '../ff2d/rig.ts';

export type Prop = 'rifle' | 'leaflet' | 'paper' | 'needle' | 'camera' | 'bananas' | 'book' | 'photo' | 'rag' | 'cup';
export type FolkLook = {
  skin: string; hair: string; hairStyle: 'crop' | 'side' | 'messy' | 'bun' | 'bald' | 'long' | 'grey';
  brow?: string; build?: number; height?: number;               // build: girth 0.85..1.3 · height: 0.9..1.08
  outfit: 'fatigues' | 'shirt' | 'suit' | 'tee' | 'robe' | 'vest';
  top: string; inner?: string; pants: string; shoes: string; belt?: string; trim?: string;
  patches?: number;                                              // 0..1 worn / patched clothing
  hat?: 'fieldcap' | 'headband' | 'fedora' | 'officer' | 'straw' | 'none'; hatColor?: string; flaps?: boolean;
  beard?: 'stache' | 'stubble' | 'full' | 'goatee'; beardColor?: string;
  glasses?: boolean; backpack?: string; star?: boolean; sling?: boolean; age?: number;   // age 0..1 adds lines
};
export type FolkOpts = { id: string; t: number; seed?: number; face?: Face; noAuto?: boolean; heldA?: Prop; heldB?: Prop; rim?: string; rimSide?: number; propAng?: number; leafletText?: string };

const OUT = '#1b140f', LW = .075;
const n = (x: number) => +x.toFixed(3);
const P = (p: V2) => `${n(p[0])} ${n(p[1])}`;
const add = (a: V2, b: V2, k = 1): V2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: V2) => Math.hypot(a[0], a[1]);
const nrm = (a: V2): V2 => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const perp = (a: V2): V2 => [-a[1], a[0]];
export const shade = (hex: string, k: number) => {
  const v = parseInt(hex.slice(1), 16), c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(x => Math.round(clamp(x * k, 0, 255)));
  return '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
};
const tint = (hex: string, to: string, k: number) => {
  const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(mix((a >> s) & 255, (b >> s) & 255, k)));
  return '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
};
/** outlined tapered limb through joints: dark pass, colour pass, inner shade stripe */
function limb(pts: V2[], w0: number, w1: number, col: string, side = 1): string {
  let o = '', c = '', s = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const w = i === 0 ? w0 : w1, a = pts[i], b = pts[i + 1], d = perp(nrm(sub(b, a)));
    o += `<path d="M${P(a)}L${P(b)}" stroke="${OUT}" stroke-width="${n(w + LW * 2)}" stroke-linecap="round"/>`;
    c += `<path d="M${P(a)}L${P(b)}" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round"/>`;
    s += `<path d="M${P(add(a, d, w * .26 * side))}L${P(add(b, d, w * .26 * side))}" stroke="${shade(col, .8)}" stroke-width="${n(w * .36)}" stroke-linecap="round" opacity=".85"/>`;
  }
  return o + c + s;
}
function handSvg(at: V2, dir: number, shape: Hand, side: number, skin: string): string {
  const r = .155, cd = Math.cos(dir), sd = Math.sin(dir), q = (x: number, y: number): V2 => [at[0] + x * cd - y * sd * side, at[1] + x * sd + y * cd * side];
  const o = `stroke="${OUT}" stroke-width="${LW * .85}"`;
  const fing = (x0: number, y0: number, x1: number, y1: number, w = .085) => `<path d="M${P(q(x0, y0))}L${P(q(x1, y1))}" stroke="${OUT}" stroke-width="${n(w + LW * 1.7)}" stroke-linecap="round"/><path d="M${P(q(x0, y0))}L${P(q(x1, y1))}" stroke="${skin}" stroke-width="${w}" stroke-linecap="round"/>`;
  if (shape === 'open') return fing(.05, -.08, .25, -.13) + fing(.07, 0, .29, .0) + fing(.05, .08, .25, .12) + `<circle cx="${n(at[0])}" cy="${n(at[1])}" r="${r}" fill="${skin}" ${o}/>` + fing(-.02, -.12, .1, -.26, .08);
  let g = `<circle cx="${n(at[0])}" cy="${n(at[1])}" r="${r}" fill="${skin}" ${o}/>`;
  if (shape === 'point') g = fing(.05, -.02, .32, -.03) + g;
  if (shape === 'thumb') g += fing(-.02, -.05, -.05, -.3, .08);
  else g += fing(.0, -.1, .1, -.17, .075);                                         // thumb over the fist
  if (shape === 'fist' || shape === 'hold') g += `<path d="M${P(q(.06, -.03))}Q${P(q(.12, .02))} ${P(q(.07, .08))}" stroke="${OUT}" stroke-width="${LW * .5}" fill="none"/>`;
  return g;
}
function shoe(at: V2, facing: number, col: string): string {
  const f = clamp(facing, -1, 1), cx = at[0] + f * .1, rx = .2 + .07 * Math.abs(f);
  return `<ellipse cx="${n(cx)}" cy="${n(at[1] - .08)}" rx="${n(rx)}" ry=".13" fill="${col}" stroke="${OUT}" stroke-width="${LW}"/><path d="M${n(cx - rx * .85)} ${n(at[1] - .02)}H${n(cx + rx * .85)}" stroke="${shade(col, .6)}" stroke-width=".04"/>`;
}
/** 2D props held in a hand (drawn in rig space), dir = forearm direction */
function propSvg(p: Prop, at: V2, dir: number, other?: V2): string {
  const cd = Math.cos(dir), sd = Math.sin(dir); const s = `stroke="${OUT}" stroke-width="${LW * .7}"`;
  const R = (x: number, y: number): V2 => [at[0] + x * cd - y * sd, at[1] + x * sd + y * cd];
  const poly = (pts: [number, number][], fill: string) => `<path d="M${pts.map(([x, y]) => P(R(x, y))).join('L')}Z" fill="${fill}" ${s} stroke-linejoin="round"/>`;
  switch (p) {
    case 'rifle': {                                   // bolt-action rifle along the line hand → other hand (or forearm)
      const a = at, d = other ? nrm(sub(other, at)) : [cd, sd] as V2; const ang = Math.atan2(d[1], d[0]); const c2 = Math.cos(ang), s2 = Math.sin(ang);
      const Q = (x: number, y: number): V2 => [a[0] + x * c2 - y * s2, a[1] + x * s2 + y * c2]; const pl = (pts: [number, number][], fill: string) => `<path d="M${pts.map(([x, y]) => P(Q(x, y))).join('L')}Z" fill="${fill}" ${s} stroke-linejoin="round"/>`;
      return pl([[-.95, -.06], [-.25, -.1], [.3, -.09], [.4, .03], [-.25, .08], [-.8, .26], [-1.02, .2]], '#7a4a26') + pl([[.1, -.12], [1.95, -.09], [1.95, -.02], [.1, -.03]], '#3a3c40')
        + pl([[.3, -.1], [1.4, -.08], [1.4, .01], [.3, .03]], '#8a5a30') + `<circle cx="${n(Q(.2, -.12)[0])}" cy="${n(Q(.2, -.12)[1])}" r=".04" fill="#55575c" ${s}/>`;
    }
    case 'leaflet': case 'paper': case 'photo': {
      const fill = p === 'photo' ? '#f4f0e6' : '#f3ecd6'; let g = poly([[.0, -.32], [.42, -.34], [.44, .14], [.02, .16]], fill);
      if (p === 'photo') g += poly([[.05, -.27], [.38, -.28], [.39, .06], [.06, .07]], '#6d8a5a');
      else for (let i = 0; i < 4; i++) g += `<path d="M${P(R(.06, -.24 + i * .09))}L${P(R(.36 - (i % 2) * .08, -.25 + i * .09))}" stroke="#4a3a2a" stroke-width=".03"/>`;
      return g;
    }
    case 'needle': return `<path d="M${P(R(0, 0))}L${P(R(.3, -.18))}" stroke="#c9ccd2" stroke-width=".03"/><path d="M${P(R(.3, -.18))}Q${P(R(.5, .1))} ${P(R(.2, .45))}" stroke="#d8c060" stroke-width=".025" fill="none"/>`;
    case 'rag': return poly([[0, -.1], [.25, -.16], [.3, .12], [.08, .2], [-.05, .1]], '#c8bca0');
    case 'camera': return poly([[-.05, -.2], [.4, -.2], [.4, .12], [-.05, .12]], '#2c2c30') + `<circle cx="${n(R(.18, -.04)[0])}" cy="${n(R(.18, -.04)[1])}" r=".1" fill="#5a6a80" ${s}/>` + poly([[.28, -.26], [.38, -.26], [.38, -.2], [.28, -.2]], '#c0c0c8');
    case 'bananas': return [0, 1, 2].map(i => `<path d="M${P(R(0, -.05 + i * .06))}Q${P(R(.25, -.25 + i * .05))} ${P(R(.45, -.05 + i * .07))}" stroke="${OUT}" stroke-width=".13" fill="none" stroke-linecap="round"/><path d="M${P(R(0, -.05 + i * .06))}Q${P(R(.25, -.25 + i * .05))} ${P(R(.45, -.05 + i * .07))}" stroke="#f2cf3a" stroke-width=".08" fill="none" stroke-linecap="round"/>`).join('');
    case 'book': return poly([[-.05, -.25], [.35, -.25], [.35, .2], [-.05, .2]], '#7a2a2a') + poly([[-.02, -.22], [.32, -.22], [.32, .17], [-.02, .17]], '#f1e6c8') + poly([[.14, -.25], [.16, -.25], [.16, .2], [.14, .2]], '#5a1a1a');
    case 'cup': return poly([[0, -.15], [.18, -.15], [.16, .1], [.02, .1]], '#d8d2c4');
  }
}

/** Returns SVG markup (local coords) plus joints for the Actor cut-out. */
export function folk(p: Pose, L: FolkLook, o: FolkOpts): { svg: string; j: Joints } {
  const t = o.t, seed = o.seed ?? 1, id = o.id, H = L.height ?? 1, G = L.build ?? 1;
  const back = (p.back ?? 0) > .5, at = Math.abs(p.turn), sgn = Math.sign(p.turn) || 1;
  const breath = o.noAuto ? 0 : Math.sin(t * 2 * Math.PI / 3.6 + seed) * .014;
  const hip: V2 = [p.hipX, -1.55 * H + p.crouch];
  const u: V2 = [Math.sin(p.lean), -Math.cos(p.lean)], r: V2 = [Math.cos(p.lean), Math.sin(p.lean)];
  const TL = 1.18 * H + breath, hw = .56 * G * (1 - .2 * at);
  const at2 = (a: number, b: number): V2 => add(add(hip, r, a), u, b);
  const chest = at2(0, TL);
  const neck = at2(p.turn * .03, TL + .08);
  const head = add(add(neck, u, .9 + p.headLift), r, p.turn * .06);
  const rx = .8, ry = .74;
  const skin = L.skin, top = L.top;
  const rim = o.rim, rimSide = o.rimSide ?? -1;
  // ---- arms
  const shoulder = (side: number): V2 => add(at2(side * hw * .8, TL - .16), r, -p.turn * .06 * (side === sgn ? 0 : 1));
  const arm = (side: number) => {
    const s = shoulder(side), tgt = side < 0 ? p.handA : p.handB;
    const pref = (side < 0 ? p.bendA : p.bendB) ?? 1;
    const s1 = ik2(s, tgt, .55, .53, 1), s2 = ik2(s, tgt, .55, .53, -1);
    const outer = (s1.mid[0] - s[0]) * side >= (s2.mid[0] - s[0]) * side ? s1 : s2, inner = outer === s1 ? s2 : s1;
    const lower = s1.mid[1] >= s2.mid[1] ? s1 : s2;
    const { mid, end } = pref === 2 ? lower : pref === 3 ? (lower === s1 ? s2 : s1) : pref >= 0 ? outer : inner;
    const dir = Math.atan2(end[1] - mid[1], end[0] - mid[0]);
    const wrist = add(end, [Math.cos(dir), Math.sin(dir)], -.13);
    const sleeve = L.outfit === 'tee' ? [s, add(s, nrm(sub(mid, s)), .32)] : [s, mid, wrist];
    let svg = limb(sleeve, .3 * G, .25 * G, top, side * (back ? -1 : 1));
    if (L.outfit === 'tee') svg = limb([s, mid, wrist], .22, .19, skin) + svg;
    else svg += `<path d="M${P(add(wrist, [Math.cos(dir), Math.sin(dir)], -.04))}L${P(add(wrist, [Math.cos(dir), Math.sin(dir)], .02))}" stroke="${L.trim ?? shade(top, .75)}" stroke-width="${n(.27 * G)}" stroke-linecap="butt"/>`;
    const shape = (side < 0 ? p.shapeA : p.shapeB) ?? 'fist';
    const held = side < 0 ? o.heldA : o.heldB;
    const hs = handSvg(end, dir, held ? 'hold' : shape, side, skin);
    return { svg, hand: hs, end, dir, held };
  };
  const A = arm(-1), B = arm(1);
  // ---- legs
  const leg = (side: number) => {
    const hj = at2(side * .27 * G * (1 - .45 * at), .06);
    const tgt = side < 0 ? p.footA : p.footB;
    const kd = p.kneeDir ?? (at > .2 ? sgn : side);
    const k1 = ik2(hj, tgt, .82 * H, .78 * H, 1), k2 = ik2(hj, tgt, .82 * H, .78 * H, -1);
    const pick = p.kneeUp ? (k1.mid[1] < k2.mid[1] ? k1 : k2) : (k1.mid[0] - hj[0]) * kd >= (k2.mid[0] - hj[0]) * kd ? k1 : k2;
    const w = at > .2 || p.kneeDir !== undefined ? 1 : .4;
    const m2: V2 = [mix((hj[0] + pick.end[0]) / 2, pick.mid[0], w), mix((hj[1] + pick.end[1]) / 2, pick.mid[1], w)];
    let svg = limb([hj, m2, add(pick.end, [0, -.12])], .36 * G, .3 * G, L.pants, side);
    if ((L.patches ?? 0) > .3 && side > 0) svg += `<rect x="${n(m2[0] - .1)}" y="${n(m2[1] - .08)}" width=".2" height=".18" fill="${tint(L.pants, '#c8b890', .35)}" stroke="${OUT}" stroke-width=".03" stroke-dasharray=".04 .03" transform="rotate(8 ${n(m2[0])} ${n(m2[1])})"/>`;
    return svg + shoe(pick.end, at > .2 ? p.turn : side * .3, L.shoes);
  };
  // ---- torso (bean) with costume
  const tp = (a: number, b: number) => P(at2(a, b));
  const torsoPath = `M${tp(-hw * .96, -.14)} C${tp(-hw * 1.1, .4)} ${tp(-hw * 1.04, TL * .82)} ${tp(-hw * .8, TL)} Q${tp(0, TL + .14)} ${tp(hw * .8, TL)} C${tp(hw * 1.04, TL * .82)} ${tp(hw * 1.1, .4)} ${tp(hw * .96, -.14)} Q${tp(0, -.26)} ${tp(-hw * .96, -.14)}Z`;
  const key = back ? 1 : -1;  // key light from screen-left
  let torso = `<clipPath id="${id}t"><path d="${torsoPath}"/></clipPath><path d="${torsoPath}" fill="${top}"/><g clip-path="url(#${id}t)">`;
  const ln = (a: [number, number], b: [number, number], col = shade(top, .62), w = LW * .55) => `<path d="M${tp(...a)}L${tp(...b)}" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round"/>`;
  if (!back) {
    const cx = p.turn * hw * .35;
    if (L.outfit === 'fatigues') {
      torso += `<path d="M${tp(cx - .26, TL + .1)} L${tp(cx, TL - .32)} L${tp(cx + .26, TL + .1)}Z" fill="${L.inner ?? shade(top, .7)}"/>` + ln([cx - .26, TL + .05], [cx, TL - .32], OUT, LW * .6) + ln([cx, TL - .32], [cx + .26, TL + .05], OUT, LW * .6);
      for (const sx of [-1, 1]) { const px = cx + sx * hw * .45; torso += `<rect x="0" y="0" width="0" height="0"/><path d="M${tp(px - .18, TL - .42)} L${tp(px + .18, TL - .42)} L${tp(px + .17, TL - .78)} Q${tp(px, TL - .84)} ${tp(px - .17, TL - .78)}Z" fill="${shade(top, .93)}" stroke="${shade(top, .58)}" stroke-width="${LW * .5}"/>` + ln([px - .18, TL - .46], [px + .18, TL - .46], shade(top, .58)); }
      for (let i = 0; i < 3; i++) torso += `<circle cx="${n(at2(cx, TL - .45 - i * .26)[0])}" cy="${n(at2(cx, TL - .45 - i * .26)[1])}" r=".045" fill="${shade(top, .55)}"/>`;
    } else if (L.outfit === 'suit') {
      torso += `<path d="M${tp(cx - .3, TL + .1)} L${tp(cx, TL - .55)} L${tp(cx + .3, TL + .1)}Z" fill="${L.inner ?? '#efe9dc'}"/><path d="M${tp(cx - .05, TL - .02)} L${tp(cx + .05, TL - .02)} L${tp(cx + .07, TL - .5)} L${tp(cx, TL - .58)} L${tp(cx - .07, TL - .5)}Z" fill="${L.trim ?? '#7a2a2a'}"/>`
        + ln([cx - .3, TL + .05], [cx - .02, TL - .6], OUT, LW * .6) + ln([cx + .3, TL + .05], [cx + .02, TL - .6], OUT, LW * .6) + ln([cx, TL - .6], [cx, -.1], shade(top, .6));
      for (let i = 0; i < 2; i++) torso += `<circle cx="${n(at2(cx + .07, TL - .72 - i * .24)[0])}" cy="${n(at2(cx + .07, TL - .72 - i * .24)[1])}" r=".04" fill="${shade(top, .5)}"/>`;
    } else if (L.outfit === 'tee') {
      torso += `<path d="M${tp(cx - .22, TL + .06)} Q${tp(cx, TL - .16)} ${tp(cx + .22, TL + .06)}" stroke="${shade(top, .6)}" stroke-width="${LW * .7}" fill="none"/>`;
      if (L.trim) torso += `<path d="M${tp(-hw * 1.1, TL * .45)} L${tp(hw * 1.1, TL * .45)} L${tp(hw * 1.1, TL * .58)} L${tp(-hw * 1.1, TL * .58)}Z" fill="${L.trim}"/>`;
    } else if (L.outfit === 'shirt' || L.outfit === 'vest') {
      torso += `<path d="M${tp(cx - .2, TL + .08)} L${tp(cx, TL - .25)} L${tp(cx + .2, TL + .08)}Z" fill="${L.inner ?? skin}"/>` + ln([cx, TL - .25], [cx, -.1]);
      for (let i = 0; i < 3; i++) torso += `<circle cx="${n(at2(cx + .05, TL - .42 - i * .27)[0])}" cy="${n(at2(cx + .05, TL - .42 - i * .27)[1])}" r=".035" fill="${shade(top, .55)}"/>`;
    } else if (L.outfit === 'robe') {
      torso += `<path d="M${tp(cx - .35, TL + .1)} L${tp(cx + .25, TL * .35)}" stroke="${L.trim ?? shade(top, .6)}" stroke-width=".14"/>`;
    }
    if (L.belt) torso += `<path d="M${tp(-hw * 1.2, .14)} L${tp(hw * 1.2, .14)} L${tp(hw * 1.2, .32)} L${tp(-hw * 1.2, .32)}Z" fill="${L.belt}"/><rect x="${n(at2(cx - .1, .32)[0])}" y="${n(at2(cx - .1, .32)[1])}" width=".2" height=".2" fill="#b89a4a" stroke="${OUT}" stroke-width=".03"/>`;
    if ((L.patches ?? 0) > 0) { const k = L.patches!; torso += `<path d="M${tp(-hw * .7, .7)} l.26 -.04 l.03 .26 l-.27 .04Z" fill="${tint(top, '#d0c090', .35 * k)}" stroke="${shade(top, .5)}" stroke-width=".03" stroke-dasharray=".05 .03" opacity="${n(clamp(k * 1.5))}"/>`
      + `<path d="M${tp(hw * .2, .35)} l.18 .02 l-.02 .2 l-.18 -.02Z" fill="${tint(top, '#8a9060', .4 * k)}" stroke="${shade(top, .5)}" stroke-width=".03" stroke-dasharray=".05 .03" opacity="${n(clamp(k * 1.5 - .4))}"/>`; }
  }
  // folds + cel shadow + rim
  torso += ln([-hw * .62, .05], [-hw * .5, .38], shade(top, .7), .035) + ln([hw * .55, .02], [hw * .42, .3], shade(top, .7), .035);
  torso += `<path d="M${tp(hw * .3 * -key, -.4)} Q${tp(hw * .55 * -key, TL * .6)} ${tp(hw * .25 * -key, TL + .3)} L${tp(hw * 1.3 * -key, TL + .3)} L${tp(hw * 1.3 * -key, -.4)}Z" fill="#1a1440" opacity=".2"/>`;
  if (rim) torso += `<path d="M${tp(hw * rimSide * .98, -.1)} Q${tp(hw * rimSide * 1.08, TL * .5)} ${tp(hw * rimSide * .82, TL)}" stroke="${rim}" stroke-width=".09" fill="none" opacity=".75"/>`;
  torso += `</g><path d="${torsoPath}" fill="none" stroke="${OUT}" stroke-width="${LW}"/>`;
  if (L.backpack && !back) torso = `<path d="M${tp(-hw * .9 * sgn - .2 * sgn, TL - .05)} l${n(-.35 * sgn)} .1 l0 1.0 l${n(.45 * sgn)} .1Z" fill="${L.backpack}" stroke="${OUT}" stroke-width="${LW}"/>` + torso
    + `<path d="M${tp(-hw * .55, TL + .02)} Q${tp(-hw * .75, TL * .5)} ${tp(-hw * .7, .1)}" stroke="${shade(L.backpack, .7)}" stroke-width=".1" fill="none"/><path d="M${tp(hw * .55, TL + .02)} Q${tp(hw * .75, TL * .5)} ${tp(hw * .7, .1)}" stroke="${shade(L.backpack, .7)}" stroke-width=".1" fill="none"/>`;
  if (back && L.backpack) torso += `<path d="M${tp(-hw * .7, TL - .1)} L${tp(hw * .7, TL - .1)} L${tp(hw * .66, .2)} L${tp(-hw * .66, .2)}Z" fill="${L.backpack}" stroke="${OUT}" stroke-width="${LW}"/>`;
  const sling = L.sling ? `<path d="M${tp(-hw * .9, -.2)} L${tp(hw * .7, TL + .55)}" stroke="${OUT}" stroke-width=".2" stroke-linecap="round"/><path d="M${tp(-hw * .9, -.2)} L${tp(hw * .7, TL + .55)}" stroke="#6a4424" stroke-width=".12" stroke-linecap="round"/><path d="M${tp(hw * .55, TL + .45)} L${tp(hw * .95, TL + 1.2)}" stroke="${OUT}" stroke-width=".13" stroke-linecap="round"/><path d="M${tp(hw * .55, TL + .45)} L${tp(hw * .95, TL + 1.2)}" stroke="#3a3c40" stroke-width=".07" stroke-linecap="round"/>` : '';
  // ---- head
  const hc = head, k = .62, tilt = p.headTilt;
  const sq = (cx: number, cy: number, a: number, b: number) => `M${n(cx - a)} ${n(cy)} C${n(cx - a)} ${n(cy - b * k)} ${n(cx - a * k)} ${n(cy - b)} ${n(cx)} ${n(cy - b)} C${n(cx + a * k)} ${n(cy - b)} ${n(cx + a)} ${n(cy - b * k)} ${n(cx + a)} ${n(cy)} C${n(cx + a)} ${n(cy + b * .72)} ${n(cx + a * .62)} ${n(cy + b)} ${n(cx)} ${n(cy + b)} C${n(cx - a * .62)} ${n(cy + b)} ${n(cx - a)} ${n(cy + b * .72)} ${n(cx - a)} ${n(cy)}Z`;
  const hp = sq(0, 0, rx, ry); const ht = p.turn + p.headTurn; const ha = Math.abs(ht), hs = Math.sign(ht) || 1;
  let hg = '';
  // ears (behind the head)
  for (const side of [-1, 1]) { if (ha > .45 && side === hs) continue; const ex = side * rx * .97 - ht * .3 * rx; hg += `<ellipse cx="${n(ex)}" cy=".08" rx=".17" ry=".2" fill="${skin}" stroke="${OUT}" stroke-width="${LW}"/><path d="M${n(ex - side * .02)} .0 q${n(side * .06)} .08 0 .16" stroke="${shade(skin, .7)}" stroke-width=".04" fill="none"/>`; }
  // neck
  const neckSvg = `<path d="M${P(at2(p.turn * .03, TL - .05))}L${P(add(neck, u, .3))}" stroke="${OUT}" stroke-width="${n(.36 + LW * 2)}"/><path d="M${P(at2(p.turn * .03, TL - .05))}L${P(add(neck, u, .3))}" stroke="${shade(skin, .9)}" stroke-width=".36"/>`;
  hg += `<clipPath id="${id}h"><path d="${hp}"/></clipPath><path d="${hp}" fill="${skin}"/><g clip-path="url(#${id}h)">`;
  hg += `<ellipse cx="${n(-key * -rx * .9)}" cy=".25" rx="${n(rx * .75)}" ry="${n(ry * 1.2)}" fill="#3a1a50" opacity=".14"/>`;
  if (rim) hg += `<path d="M${n(rimSide * rx * .95)} -.5 Q${n(rimSide * rx * 1.06)} .1 ${n(rimSide * rx * .7)} .6" stroke="${rim}" stroke-width=".1" fill="none" opacity=".8"/>`;
  if ((L.age ?? 0) > .3 && !back) hg += `<path d="M${n(ht * .3 - .22)} -.42 q.22 -.05 .44 0" stroke="${shade(skin, .72)}" stroke-width=".03" fill="none"/><path d="M${n(ht * .3 + .38)} .05 q.06 .08 .02 .18" stroke="${shade(skin, .72)}" stroke-width=".03" fill="none"/>`;
  if (L.beard === 'stubble' && !back) hg += `<path d="M${n(-rx * .8 + ht * .2)} .2 Q0 ${n(ry * 1.25)} ${n(rx * .8 + ht * .2)} .2 L${n(rx)} 1 L${n(-rx)} 1Z" fill="${L.beardColor ?? L.hair}" opacity=".22"/>`;
  if (L.beard === 'full' && !back) hg += `<path d="M${n(-rx * .85 + ht * .2)} .1 Q${n(-rx * .5)} ${n(ry * 1.3)} ${n(ht * .3)} ${n(ry * 1.05)} Q${n(rx * .5)} ${n(ry * 1.3)} ${n(rx * .85 + ht * .2)} .1 L${n(rx)} 1 L${n(-rx)} 1Z" fill="${L.beardColor ?? L.hair}"/>`;
  hg += `</g><path d="${hp}" fill="none" stroke="${OUT}" stroke-width="${LW}"/>`;
  // face
  if (!back) {
    const F = { ...(o.face ?? EXPR.neutral) }; const bl = o.noAuto ? 0 : blink(t, seed);
    const sc = o.noAuto ? [0, 0] as V2 : saccade(t, seed, .25);
    const fx = ht * rx * .42, es = .3 * (1 - .42 * ha), eo = clamp(F.eyeOpen * (1 - bl), 0, 1.5);
    let f = '';
    for (const side of [-1, 1]) {
      const far = ha > .2 && side === -hs; const sz = far ? 1 - ha * .4 : 1; const ex = fx + side * es * (far ? .8 : 1), ey = -.02;
      const erx = .175 * sz, ery = .215 * Math.max(eo, .06);
      if (F.happyEyes > .5) { f += `<path d="M${n(ex - erx)} ${n(ey + .04)} Q${n(ex)} ${n(ey - .14)} ${n(ex + erx)} ${n(ey + .04)}" stroke="${OUT}" stroke-width=".07" fill="none" stroke-linecap="round"/>`; continue; }
      if (eo < .12) { f += `<path d="M${n(ex - erx)} ${n(ey)} Q${n(ex)} ${n(ey + .05)} ${n(ex + erx)} ${n(ey)}" stroke="${OUT}" stroke-width=".06" fill="none" stroke-linecap="round"/>`; continue; }
      const pr = F.eyeWhite > .5 ? .045 + F.pupil * .03 : .1 * sz; const gx = clamp(F.gx + sc[0] + ht * .4, -1, 1) * erx * .45, gy = clamp(F.gy + sc[1], -1, 1) * ery * .4;
      f += `<clipPath id="${id}e${side}"><ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(erx)}" ry="${n(ery)}"/></clipPath><ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(erx)}" ry="${n(ery)}" fill="#fffdf6"/>`;
      f += `<g clip-path="url(#${id}e${side})"><circle cx="${n(ex + gx)}" cy="${n(ey + gy + .02)}" r="${n(pr)}" fill="#1d1712"/><circle cx="${n(ex + gx - pr * .35)}" cy="${n(ey + gy - pr * .3)}" r="${n(pr * .32)}" fill="#fff"/>`;
      const lt = clamp(F.lidTop), ang = F.browAng * side * -.25;
      if (lt > .02) f += `<path d="M${n(ex - erx - .02)} ${n(ey - ery - .02)} L${n(ex + erx + .02)} ${n(ey - ery - .02)} L${n(ex + erx + .02)} ${n(ey - ery + lt * ery * 1.6 - ang * .1)} L${n(ex - erx - .02)} ${n(ey - ery + lt * ery * 1.6 + ang * .1)}Z" fill="${skin}"/><path d="M${n(ex - erx)} ${n(ey - ery + lt * ery * 1.6 + ang * .1)} L${n(ex + erx)} ${n(ey - ery + lt * ery * 1.6 - ang * .1)}" stroke="${OUT}" stroke-width=".05"/>`;
      if (F.lidLow > .02) f += `<path d="M${n(ex - erx - .02)} ${n(ey + ery + .02)} L${n(ex + erx + .02)} ${n(ey + ery + .02)} L${n(ex + erx)} ${n(ey + ery - F.lidLow * ery)} Q${n(ex)} ${n(ey + ery - F.lidLow * ery * 1.6)} ${n(ex - erx)} ${n(ey + ery - F.lidLow * ery)}Z" fill="${skin}"/>`;
      f += `</g><ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(erx)}" ry="${n(ery)}" fill="none" stroke="${OUT}" stroke-width=".05"/>`;
      // brows
      const one = (F.browOne ?? 0) * side > 0 ? (F.browOne ?? 0) * side * .12 : 0;
      const by = ey - ery - .1 - F.browY * .09 - one, bi = F.browAng * .07, bc = F.browCurve * .05;
      const ix = ex - side * .13 * sz, ox = ex + side * .14 * sz;
      f += `<path d="M${n(ix)} ${n(by - bi)} Q${n(ex)} ${n(by - bc - .02)} ${n(ox)} ${n(by + bi * .3)}" stroke="${L.brow ?? shade(L.hair, .8)}" stroke-width=".1" fill="none" stroke-linecap="round"/>`;
    }
    if (L.glasses) f += `<circle cx="${n(fx - es)}" cy="-.02" r=".22" fill="#bfe0ff" fill-opacity=".18" stroke="${OUT}" stroke-width=".045"/><circle cx="${n(fx + es)}" cy="-.02" r=".22" fill="#bfe0ff" fill-opacity=".18" stroke="${OUT}" stroke-width=".045"/><path d="M${n(fx - es + .22)} -.04 Q${n(fx)} -.1 ${n(fx + es - .22)} -.04" stroke="${OUT}" stroke-width=".04" fill="none"/>`;
    // nose
    const nx = fx + ht * .14; f += `<ellipse cx="${n(nx)}" cy=".16" rx="${n(.07 + ha * .03)}" ry=".06" fill="${shade(skin, .86)}" stroke="${shade(skin, .55)}" stroke-width=".035"/>`;
    // cheeks
    f += `<ellipse cx="${n(fx - es - .1)}" cy=".27" rx=".12" ry=".06" fill="#ff7a6a" opacity="${n(.16 + F.blush * .45)}"/><ellipse cx="${n(fx + es + .1)}" cy=".27" rx=".12" ry=".06" fill="#ff7a6a" opacity="${n(.16 + F.blush * .45)}"/>`;
    if (L.beard === 'stache') f += `<path d="M${n(nx - .2)} .3 Q${n(nx - .1)} .2 ${n(nx)} .26 Q${n(nx + .1)} .2 ${n(nx + .2)} .3 Q${n(nx)} .34 ${n(nx - .2)} .3Z" fill="${L.beardColor ?? L.hair}" stroke="${OUT}" stroke-width=".03"/>`;
    // mouth
    const mx = fx + ht * .08, my = .4, mw = .2 * F.mWide * (1 - .3 * ha), sm = F.smile, smk = (F.smirk ?? 0);
    const mo = clamp(F.mOpen), cL = my - sm * .07 + smk * .05, cR = my - sm * .07 - smk * .05;
    if (F.mO > .5) { const a = .07 + .05 * mo, b = .09 + .08 * mo; f += `<ellipse cx="${n(mx)}" cy="${n(my + .02)}" rx="${n(a)}" ry="${n(b)}" fill="#6a2222" stroke="${OUT}" stroke-width=".05"/><ellipse cx="${n(mx)}" cy="${n(my + .02 + b * .5)}" rx="${n(a * .6)}" ry="${n(b * .35)}" fill="#e46a6a"/>`; }
    else if (mo > .08) {
      const d = .05 + mo * .26, bot = `Q${n(mx)} ${n(my + d + sm * .05)} ${n(mx - mw)} ${n(cL)}`; const path = `M${n(mx - mw)} ${n(cL)} Q${n(mx)} ${n(my + sm * .06 - .02)} ${n(mx + mw)} ${n(cR)} ${bot}Z`;
      f += `<clipPath id="${id}m"><path d="${path}"/></clipPath><path d="${path}" fill="#6a2222"/><g clip-path="url(#${id}m)">`;
      f += `<ellipse cx="${n(mx)}" cy="${n(my + d)}" rx="${n(mw * .7)}" ry="${n(d * .45)}" fill="#e46a6a"/>`;
      if (F.teeth > .05) f += F.teeth > .85 ? `<rect x="${n(mx - mw)}" y="${n(my - .2)}" width="${n(mw * 2)}" height=".5" fill="#fff"/>${[-2, -1, 0, 1, 2].map(i => `<path d="M${n(mx + i * mw * .35)} ${n(my - .2)}V${n(my + .3)}" stroke="#bdb6aa" stroke-width=".02"/>`).join('')}<path d="M${n(mx - mw)} ${n(my + d * .5)}H${n(mx + mw)}" stroke="#bdb6aa" stroke-width=".025"/>`
        : `<rect x="${n(mx - mw)}" y="${n(my - .2)}" width="${n(mw * 2)}" height="${n(.2 + F.teeth * .06)}" fill="#fff"/>`;
      f += `</g><path d="${path}" fill="none" stroke="${OUT}" stroke-width=".05" stroke-linejoin="round"/>`;
    } else f += `<path d="M${n(mx - mw)} ${n(cL)} Q${n(mx)} ${n(my + sm * .1)} ${n(mx + mw)} ${n(cR)}" stroke="${OUT}" stroke-width=".055" fill="none" stroke-linecap="round"/>`;
    if (L.beard === 'goatee') f += `<path d="M${n(mx - .08)} ${n(my + .14)} Q${n(mx)} ${n(my + .36)} ${n(mx + .08)} ${n(my + .14)}Z" fill="${L.beardColor ?? L.hair}" stroke="${OUT}" stroke-width=".03"/>`;
    // emotion extras
    if (F.sweat > .2) f += `<path d="M${n(rx * .7 * -hs)} -.5 q-.07 .14 0 .18 q.07 -.04 0 -.18Z" fill="#9fd8ff" stroke="${OUT}" stroke-width=".03" opacity="${n(F.sweat)}"/>`;
    if (F.tears > .2) for (const side of [-1, 1]) f += `<path d="M${n(fx + side * es)} .12 q${n(side * .03)} .2 0 .34" stroke="#7ac8ff" stroke-width=".06" opacity="${n(F.tears)}" fill="none"/>`;
    if (F.shock > .2) f += [-1, 0, 1].map(i => `<path d="M${n(i * .45)} ${n(-ry - .12 - Math.abs(i) * -.05)} l${n(i * .08)} -.2" stroke="${OUT}" stroke-width=".05" opacity="${n(F.shock)}" stroke-linecap="round"/>`).join('');
    if (F.vein > .2) f += `<path d="M${n(rx * .45)} -.55 l.08 .08 m-.08 0 l.08 -.08" stroke="#d83030" stroke-width=".05" opacity="${n(F.vein)}"/>`;
    if (F.question > .2) f += `<text x="${n(rx * .9)}" y="${n(-ry - .1)}" font-family="Inter,Arial" font-weight="900" font-size=".55" fill="#fff" stroke="${OUT}" stroke-width=".04" opacity="${n(F.question)}">?</text>`;
    hg += f;
  }
  // hair & hat (on top)
  const hairC = L.hair, hairD = shade(hairC, .7);
  const hairPath = (() => {
    switch (L.hairStyle) {
      case 'crop': return `M${-rx * .98} -.08 C${-rx} -.6 ${-rx * .5} ${-ry - .08} 0 ${-ry - .06} C${rx * .5} ${-ry - .08} ${rx} -.6 ${rx * .98} -.08 L${rx * .82} -.18 Q${rx * .5} -.42 ${ht * .3} -.42 Q${-rx * .5} -.44 ${-rx * .82} -.18Z`;
      case 'side': return `M${-rx * .99} 0 C${-rx * 1.02} -.65 ${-rx * .4} ${-ry - .12} .1 ${-ry - .08} C${rx * .7} ${-ry - .06} ${rx * 1.02} -.55 ${rx * .99} -.05 L${rx * .85} -.25 C${rx * .3} -.5 ${-rx * .1} -.62 ${-rx * .35} -.36 L${-rx * .8} -.12Z`;
      case 'messy': return `M${-rx * .99} .0 L${-rx * 1.1} -.35 L${-rx * .85} -.45 L${-rx * .9} -.75 L${-rx * .5} -.72 L${-rx * .4} ${-ry - .2} L${-rx * .05} ${-ry - .05} L${rx * .25} ${-ry - .22} L${rx * .45} ${-ry - .02} L${rx * .85} -.78 L${rx * .8} -.5 L${rx * 1.1} -.35 L${rx * .99} 0 L${rx * .8} -.22 L${rx * .5} -.35 L${rx * .3} -.25 L${0} -.4 L${-rx * .3} -.26 L${-rx * .55} -.38 L${-rx * .8} -.15Z`;
      case 'bun': return `M${-rx * .98} -.05 C${-rx} -.65 ${-rx * .45} ${-ry - .06} 0 ${-ry - .04} C${rx * .45} ${-ry - .06} ${rx} -.65 ${rx * .98} -.05 L${rx * .8} -.3 Q0 -.52 ${-rx * .8} -.3Z M-.22 ${-ry - .05} a.22 .2 0 1 1 .44 0 a.22 .2 0 1 1 -.44 0Z`;
      case 'long': return `M${-rx * 1.05} .55 C${-rx * 1.1} -.7 ${-rx * .4} ${-ry - .12} 0 ${-ry - .1} C${rx * .4} ${-ry - .12} ${rx * 1.1} -.7 ${rx * 1.05} .55 L${rx * .82} .3 L${rx * .8} -.2 Q0 -.5 ${-rx * .8} -.2 L${-rx * .82} .3Z`;
      case 'grey': return `M${-rx * .99} .1 C${-rx * 1.01} -.5 ${-rx * .6} -.62 ${-rx * .35} -.6 L${-rx * .55} -.2 L${-rx * .82} .05Z M${rx * .99} .1 C${rx * 1.01} -.5 ${rx * .6} -.62 ${rx * .35} -.6 L${rx * .55} -.2 L${rx * .82} .05Z`;
      default: return '';
    }
  })();
  if (hairPath && !(L.hat === 'fieldcap' || L.hat === 'officer' || L.hat === 'fedora') || L.hairStyle === 'long' || L.hairStyle === 'messy') {
    if (hairPath) hg += `<path d="${hairPath}" fill="${hairC}" stroke="${OUT}" stroke-width="${LW}" stroke-linejoin="round" transform="translate(${n(-ht * .12)} 0)"/><path d="M${n(-rx * .4)} ${n(-ry + .1)} q.25 -.08 .5 .02" stroke="${shade(hairC, 1.6)}" stroke-width=".04" fill="none" opacity=".6"/>`;
  } else if (hairPath) hg += `<path d="M${-rx * .98} -.05 L${-rx * .9} .25 L${-rx * .78} -.05Z M${rx * .98} -.05 L${rx * .9} .25 L${rx * .78} -.05Z" fill="${hairD}"/>`;
  const hc2 = L.hatColor ?? '#6a6a3a';
  switch (L.hat) {
    case 'fieldcap': hg += (L.flaps ? `<path d="M${-rx * 1.02} -.2 L${-rx * 1.08} .55 L${-rx * .7} .5 L${-rx * .75} -.1Z M${rx * 1.02} -.2 L${rx * 1.08} .55 L${rx * .7} .5 L${rx * .75} -.1Z" fill="${shade(hc2, 1.05)}" stroke="${OUT}" stroke-width="${LW * .8}"/>` : '')
      + `<path d="M${-rx * 1.0} -.22 C${-rx * 1.0} -.78 ${-rx * .5} ${-ry - .2} 0 ${-ry - .2} C${rx * .5} ${-ry - .2} ${rx} -.78 ${rx} -.22 Q0 -.34 ${-rx} -.22Z" fill="${hc2}" stroke="${OUT}" stroke-width="${LW}"/>`
      + `<path d="M${n(-.42 + ht * .3)} -.24 Q${n(ht * .5)} -.08 ${n(.42 + ht * .3 + ht * .25)} -.24 Q${n(ht * .4)} -.3 ${n(-.42 + ht * .3)} -.24Z" fill="${shade(hc2, .6)}" stroke="${OUT}" stroke-width="${LW * .8}"/>`
      + `<path d="M${-rx * .98} -.34 Q0 -.48 ${rx * .98} -.34" stroke="${shade(hc2, .7)}" stroke-width=".05" fill="none"/>` + (L.star ? `<path transform="translate(${n(ht * .35)} -.58) scale(.12)" d="M0 -1 L.29 -.4 L.95 -.31 L.48 .15 L.59 .81 L0 .5 L-.59 .81 L-.48 .15 L-.95 -.31 L-.29 -.4Z" fill="#f2c43a" stroke="${OUT}" stroke-width=".25"/>` : ''); break;
    case 'headband': hg += `<path d="M${-rx * .99} -.36 Q0 -.5 ${rx * .99} -.36 L${rx * .97} -.22 Q0 -.36 ${-rx * .97} -.22Z" fill="${hc2}" stroke="${OUT}" stroke-width="${LW * .8}"/><path d="M${-rx * .98} -.3 l-.25 .12 l.02 .2 Z" fill="${hc2}" stroke="${OUT}" stroke-width="${LW * .6}"/>`; break;
    case 'fedora': hg += `<path d="M${-rx * 1.25} -.42 Q0 -.62 ${rx * 1.25} -.42 Q0 -.3 ${-rx * 1.25} -.42Z" fill="${shade(hc2, .9)}" stroke="${OUT}" stroke-width="${LW}"/><path d="M${-rx * .72} -.46 C${-rx * .74} -1.0 ${-rx * .3} ${-ry - .38} 0 ${-ry - .22} C${rx * .3} ${-ry - .38} ${rx * .74} -1.0 ${rx * .72} -.46Z" fill="${hc2}" stroke="${OUT}" stroke-width="${LW}"/><path d="M${-rx * .72} -.52 Q0 -.62 ${rx * .72} -.52 L${rx * .73} -.62 Q0 -.72 ${-rx * .73} -.62Z" fill="#2a2420"/>`; break;
    case 'officer': hg += `<path d="M${-rx * .95} -.35 L${-rx * 1.05} -.9 Q0 -1.18 ${rx * 1.05} -.9 L${rx * .95} -.35Z" fill="${hc2}" stroke="${OUT}" stroke-width="${LW}"/><path d="M${-rx * .95} -.42 Q0 -.52 ${rx * .95} -.42" stroke="#9a2a2a" stroke-width=".12" fill="none"/><path d="M${n(-.45 + ht * .3)} -.33 Q${n(ht * .4)} -.12 ${n(.5 + ht * .4)} -.33Z" fill="#1a1a1a" stroke="${OUT}" stroke-width="${LW * .7}"/>` + (L.star ? `<path transform="translate(${n(ht * .3)} -.7) scale(.11)" d="M0 -1 L.29 -.4 L.95 -.31 L.48 .15 L.59 .81 L0 .5 L-.59 .81 L-.48 .15 L-.95 -.31 L-.29 -.4Z" fill="#f2c43a" stroke="${OUT}" stroke-width=".25"/>` : ''); break;
    case 'straw': hg += `<path d="M${-rx * 1.5} -.32 Q0 -.6 ${rx * 1.5} -.32 Q0 -.18 ${-rx * 1.5} -.32Z M${-rx * .7} -.38 Q0 ${-ry - .5} ${rx * .7} -.38Z" fill="${L.hatColor ?? '#d8b860'}" stroke="${OUT}" stroke-width="${LW}"/>`; break;
  }
  const headG = `<g transform="translate(${n(hc[0])} ${n(hc[1])}) rotate(${n((tilt + p.lean * .5) * 57.3)})">${hg}</g>`;
  // ---- props
  const pA = A.held ? propSvg(A.held, A.end, A.dir, A.held === 'rifle' ? B.end : undefined) : '';
  const pB = B.held ? propSvg(B.held, B.end, B.dir, B.held === 'rifle' ? A.end : undefined) : '';
  // ---- order
  const farSide = at > .15 ? -sgn : 0;
  const frontA = (p.frontA ?? (farSide === -1 ? 0 : 1)) > .5 && !back, frontB = (p.frontB ?? (farSide === 1 ? 0 : 1)) > .5 && !back;
  const legs = leg(-1) + leg(1);
  let svg = sling;
  if (!frontA) svg += A.svg + pA + A.hand; if (!frontB) svg += B.svg + pB + B.hand;
  svg += legs + torso + neckSvg + headG;
  if (frontA) svg += A.svg + (A.held === 'rifle' ? '' : '') + A.hand; if (frontB) svg += B.svg + B.hand;
  if (frontA && A.held) svg += pA + A.hand; if (frontB && B.held) svg += pB + B.hand;
  return { svg, j: { head: hc, chest, hip, handA: A.end, handB: B.end, headR: .8 } };
}

/** handy poses for the new rig (rig-unit hand targets relative to the feet) */
export const AIM = (dir: number): Partial<Pose> => ({ turn: .75 * dir, handA: dir > 0 ? [.15, -2.25] : [-1.15, -2.42], handB: dir > 0 ? [1.15, -2.42] : [-.15, -2.25], shapeA: 'hold', shapeB: 'hold', lean: .04 * dir, headTilt: .05 * dir, frontA: 1, frontB: 1 });
export const PORT = (dir: number): Partial<Pose> => ({ turn: .55 * dir, handA: [-.25 * dir - .1, -1.75], handB: [.45 * dir, -2.55], shapeA: 'hold', shapeB: 'hold', frontA: 1, frontB: 1 });
export const SALUTE = (dir: number): Partial<Pose> => (dir > 0 ? { turn: .5, handB: [.35, -3.45], shapeB: 'open', bendB: 1, handA: [-.48, -1.55] } : { turn: -.5, handA: [-.35, -3.45], shapeA: 'open', bendA: 1, handB: [.48, -1.55] });
