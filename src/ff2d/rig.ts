// FrameForge 2D engine — articulated flat stickman (head 1 · body 1.6 · legs 1.6 units).
// Local space: origin on the ground under the hips, +x right, +y DOWN (SVG). All units = head diameter.
import { type Face, drawEmanata, drawFace, EXPR } from './face.ts';
import { blink, clamp, ik2, mix, saccade, type V2, walk } from './motion.ts';

export type Hand = 'fist' | 'open' | 'point' | 'hold';
export type Pose = {
  turn: number;        // -1 profile facing left … 0 front … +1 profile facing right
  back?: number;       // 1 = seen from behind
  lean: number;        // torso rotation (rad, + = clockwise on screen)
  crouch: number;      // hip drop (units)
  hipX: number;
  headTilt: number;    // rad
  headTurn: number;    // extra face turn relative to body
  headLift: number;    // units, + = up (anticipation / recoil)
  handA: V2; handB: V2; // targets for screen-left (A) and screen-right (B) hands, local coords
  bendA?: number; bendB?: number;
  footA: V2; footB: V2; kneeDir?: number;
  shapeA?: Hand; shapeB?: Hand;
  frontA?: number; frontB?: number; // 1 = draw that arm in front of torso
};
export type Look = {
  outfit: 'hoodie' | 'suit' | 'uniform' | 'lab' | 'jacket' | 'dress';
  color: string; pants: string; shoe?: string;
  hat?: 'helmet' | 'headset' | 'cap' | 'officer' | 'bun' | 'hood';
  glasses?: boolean; tie?: string; hair?: string; mask?: boolean;
};
export const HERO: Look = { outfit: 'hoodie', color: '#d8262b', pants: '#151515' };

export const STAND: Pose = { turn: 0, lean: 0, crouch: 0, hipX: 0, headTilt: 0, headTurn: 0, headLift: 0,
  handA: [-.5, -1.62], handB: [.5, -1.62], footA: [-.2, -.08], footB: [.2, -.08] };

const OUT = '#111', LW = .045;
const n = (x: number) => +x.toFixed(4);
const P = (p: V2) => `${n(p[0])} ${n(p[1])}`;
const add = (a: V2, b: V2, k = 1): V2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const shade = (hex: string, k: number) => {
  const v = parseInt(hex.slice(1), 16), c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(x => Math.round(clamp(x * k, 0, 255)));
  return `rgb(${c.join(',')})`;
};

function limb(pts: V2[], w: number, col: string, outline = true): string {
  const d = `M${P(pts[0])}` + pts.slice(1).map(p => `L${P(p)}`).join('');
  return (outline ? `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="${n(w + LW * 2)}" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
    `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}
function hand(at: V2, dir: number, shape: Hand, side: number): string {
  const r = .105, rot = dir * 180 / Math.PI;
  let g = `<circle r="${r}" fill="#fff" stroke="${OUT}" stroke-width="${LW}"/>`;
  if (shape === 'open') g = `<ellipse cx=".02" rx=".125" ry=".1" fill="#fff" stroke="${OUT}" stroke-width="${LW}"/><ellipse cx="-.03" cy="${n(-.085 * side)}" rx=".045" ry=".06" transform="rotate(${-35 * side} -.03 ${n(-.085 * side)})" fill="#fff" stroke="${OUT}" stroke-width="${LW}"/><path d="M.03 ${n(-.07 * side)} q.04 0 .06 ${n(.03 * side)}" stroke="${OUT}" stroke-width="${n(LW * .6)}" fill="none"/>`;
  if (shape === 'point') g += `<path d="M.05 ${n(-.03 * side)} h.17" stroke="${OUT}" stroke-width=".085" stroke-linecap="round"/><path d="M.05 ${n(-.03 * side)} h.17" stroke="#fff" stroke-width=".045" stroke-linecap="round"/>`;
  if (shape === 'hold') g = `<circle r="${r}" fill="#fff" stroke="${OUT}" stroke-width="${LW}"/><path d="M-.02 ${n(-.06 * side)} q.07 .02 .07 ${n(.08 * side)}" stroke="${OUT}" stroke-width="${n(LW * .6)}" fill="none"/>`;
  return `<g transform="translate(${P(at)}) rotate(${n(rot)})">${g}</g>`;
}
function shoe(ankle: V2, facing: number, col: string): string {
  const at = Math.abs(facing), len = mix(.3, .42, at), h = .17, toe = facing * .13;
  const x0 = ankle[0] + toe - len / 2, y = ankle[1] + .035;
  return `<path d="M${n(x0)} ${n(y + h * .5)} Q${n(x0)} ${n(y - h * .45)} ${n(x0 + len * .5)} ${n(y - h * .5)} Q${n(x0 + len)} ${n(y - h * .45)} ${n(x0 + len)} ${n(y + h * .5)} Z" fill="${col}" stroke="${OUT}" stroke-width="${LW}" stroke-linejoin="round"/>` +
    `<path d="M${n(x0 + .03)} ${n(y + h * .3)} H${n(x0 + len - .03)}" stroke="#9aa3ad" stroke-width=".025"/>`;
}

export type Joints = { head: V2; chest: V2; hip: V2; handA: V2; handB: V2; headR: number };
export type DrawOpts = { id: string; t: number; seed?: number; face?: Face; lighting?: { rim?: string; rimSide?: number } ; noAuto?: boolean };

/** Returns SVG markup (local coords) plus world-ready joints. */
export function stickman(p: Pose, L: Look, o: DrawOpts): { svg: string; j: Joints } {
  const t = o.t, seed = o.seed ?? 1;
  const back = (p.back ?? 0) > .5;
  const at = Math.abs(p.turn), sgn = Math.sign(p.turn) || 1;
  const breath = o.noAuto ? 0 : Math.sin(t * 2 * Math.PI / 3.8 + seed) * .012;
  const hip: V2 = [p.hipX, -1.6 + p.crouch];
  const u: V2 = [Math.sin(p.lean), -Math.cos(p.lean)], r: V2 = [Math.cos(p.lean), Math.sin(p.lean)];
  const TL = 1.45 + breath;
  const chest = add(hip, u, TL);
  const hw = .44 * (1 - .28 * at);
  const at2 = (a: number, b: number): V2 => add(add(hip, r, a), u, b);
  const head = add(add(chest, u, .53 + p.headLift), r, p.turn * .04);
  const shoulder = (side: number): V2 => add(at2(side * hw * .78, TL - .14), r, -p.turn * .05 * (side === sgn ? 0 : 1));
  const far = (side: number) => side === -sgn && at > .12;

  // ---- arms
  const arm = (side: number) => {
    const s = shoulder(side), tgt = side < 0 ? p.handA : p.handB;
    const pref = (side < 0 ? p.bendA : p.bendB) ?? 1; // +1 elbow outward (default), -1 inward, 2 down, 3 up
    const s1 = ik2(s, tgt, .62, .6, 1), s2 = ik2(s, tgt, .62, .6, -1);
    const outer = (s1.mid[0] - s[0]) * side >= (s2.mid[0] - s[0]) * side ? s1 : s2, inner = outer === s1 ? s2 : s1;
    const lower = s1.mid[1] >= s2.mid[1] ? s1 : s2;
    const { mid, end } = pref === 2 ? lower : pref === 3 ? (lower === s1 ? s2 : s1) : pref >= 0 ? outer : inner;
    const dir = Math.atan2(end[1] - mid[1], end[0] - mid[0]);
    const col = L.outfit === 'hoodie' || L.outfit === 'jacket' ? L.color : L.outfit === 'suit' ? L.color : L.color;
    const wrist = add(end, [Math.cos(dir), Math.sin(dir)], -.1);
    const svg = limb([s, mid, wrist], .19, col) +
      `<path d="M${P(add(wrist, [Math.cos(dir), Math.sin(dir)], -.07))}L${P(wrist)}" stroke="${shade(col, .72)}" stroke-width=".17" stroke-linecap="butt"/>` +
      hand(end, dir, (side < 0 ? p.shapeA : p.shapeB) ?? 'fist', side);
    return { svg, end };
  };
  const A = arm(-1), B = arm(1);

  // ---- legs
  const leg = (side: number) => {
    const hj = at2(side * .17 * (1 - .5 * at), .04);
    const tgt = side < 0 ? p.footA : p.footB;
    const kd = p.kneeDir ?? (at > .2 ? sgn : side);
    const k1 = ik2(hj, tgt, .8, .77, 1), k2 = ik2(hj, tgt, .8, .77, -1);
    const pick = (k1.mid[0] - hj[0]) * kd >= (k2.mid[0] - hj[0]) * kd ? k1 : k2;
    const { end } = pick;
    // front view: knees stay nearly straight/slightly outward instead of kinking
    const w = at > .2 || p.kneeDir !== undefined ? 1 : .35;
    const m2: V2 = [mix((hj[0] + end[0]) / 2, pick.mid[0], w), mix((hj[1] + end[1]) / 2, pick.mid[1], w)];
    return limb([hj, m2, end], .16, L.pants, L.pants !== '#151515') + shoe(end, at > .2 ? p.turn : side * .25, L.shoe ?? '#fff');
  };

  // ---- torso
  const id = o.id;
  const torsoPath = (() => {
    const pts = (a: number, b: number) => P(at2(a, b));
    return `M${pts(-hw * .98, 0)} L${pts(hw * .98, 0)} C${pts(hw * .92, .55)} ${pts(hw * 1.02, 1.0)} ${pts(hw, TL - .2)} Q${pts(hw * .98, TL)} ${pts(hw * .62, TL)} L${pts(-hw * .62, TL)} Q${pts(-hw * .98, TL)} ${pts(-hw, TL - .2)} C${pts(-hw * 1.02, 1.0)} ${pts(-hw * .92, .55)} ${pts(-hw * .98, 0)} Z`;
  })();
  const bodyCol = L.color;
  let torso = `<clipPath id="${id}t"><path d="${torsoPath}"/></clipPath><path d="${torsoPath}" fill="${bodyCol}"/>`;
  torso += `<g clip-path="url(#${id}t)">`;
  // cel shade on the side away from the key light (key from upper-left)
  torso += `<path d="M${P(at2(hw * .38, -.1))} L${P(at2(hw * 1.2, -.1))} L${P(at2(hw * 1.2, TL + .1))} L${P(at2(hw * .55, TL + .1))}Z" fill="${shade(bodyCol, .78)}"/>`;
  if (L.outfit === 'hoodie') {
    torso += `<path d="M${P(at2(-hw, .14))}L${P(at2(hw, .14))}" stroke="${shade(bodyCol, .7)}" stroke-width=".05"/>`;
    if (!back && at < .75) {
      const pw = hw * .55, pc = p.turn * .12;
      torso += `<path d="M${P(at2(pc - pw, .2))} L${P(at2(pc - pw * .7, .55))} L${P(at2(pc + pw * .7, .55))} L${P(at2(pc + pw, .2))}" fill="none" stroke="${shade(bodyCol, .62)}" stroke-width=".03" stroke-linejoin="round"/>`;
    }
  } else if (L.outfit === 'suit' || L.outfit === 'lab') {
    if (!back) {
      const c = p.turn * .1;
      torso += `<path d="M${P(at2(c - .17, TL))} L${P(at2(c, TL - .55))} L${P(at2(c + .17, TL))}Z" fill="#f4f4f2"/>`;
      if (L.tie) torso += `<path d="M${P(at2(c - .035, TL - .05))} L${P(at2(c + .035, TL - .05))} L${P(at2(c + .045, TL - .48))} L${P(at2(c, TL - .56))} L${P(at2(c - .045, TL - .48))}Z" fill="${L.tie}" stroke="${OUT}" stroke-width=".018"/>`;
      torso += `<path d="M${P(at2(c, TL - .55))} L${P(at2(c, .05))}" stroke="${shade(bodyCol, .6)}" stroke-width=".025"/>`;
    }
  } else if (L.outfit === 'uniform') {
    torso += `<rect x="-1" y="-1" width="0" height="0"/><path d="M${P(at2(-hw, .28))}L${P(at2(hw, .28))}" stroke="#2c2a1e" stroke-width=".09"/><path d="M${P(at2(-hw * .55, TL - .25))}h.16v.13h-.16z" fill="${shade(bodyCol, .75)}" stroke="${OUT}" stroke-width=".015"/>`;
  }
  torso += `</g><path d="${torsoPath}" fill="none" stroke="${OUT}" stroke-width="${LW}" stroke-linejoin="round"/>`;

  // hood / collar
  let collar = '';
  if (L.outfit === 'hoodie' && L.hat !== 'hood') {
    if (back) {
      collar = `<path d="M${P(at2(-hw * .72, TL + .05))} Q${P(at2(-hw * .78, TL - .5))} ${P(at2(0, TL - .56))} Q${P(at2(hw * .78, TL - .5))} ${P(at2(hw * .72, TL + .05))}Z" fill="${shade(bodyCol, .88)}" stroke="${OUT}" stroke-width="${LW}" stroke-linejoin="round"/>` +
        `<path d="M${P(at2(0, TL - .1))} L${P(at2(0, TL - .5))}" stroke="${shade(bodyCol, .7)}" stroke-width=".025"/>`;
    } else {
      const c = at2(p.turn * -.05, TL + .02);
      collar = `<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(hw * .9)}" ry=".2" fill="${shade(bodyCol, .92)}" stroke="${OUT}" stroke-width="${LW}" transform="rotate(${n(p.lean * 57.3)} ${n(c[0])} ${n(c[1])})"/>`;
      if (at < .7) for (const sd of [-1, 1]) {
        const top = at2(p.turn * .16 + sd * .07, TL - .08), bot = at2(p.turn * .16 + sd * .085, TL - .42 + sd * .03);
        collar += `<path d="M${P(top)}L${P(bot)}" stroke="${OUT}" stroke-width=".05" stroke-linecap="round"/><path d="M${P(top)}L${P(bot)}" stroke="#fff" stroke-width=".022" stroke-linecap="round"/><circle cx="${n(bot[0])}" cy="${n(bot[1])}" r=".028" fill="#fff" stroke="${OUT}" stroke-width=".018"/>`;
      }
    }
  } else if (L.outfit !== 'hoodie') {
    const c = at2(0, TL); collar = `<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx=".16" ry=".07" fill="${L.outfit === 'uniform' ? shade(bodyCol, .85) : '#f4f4f2'}" stroke="${OUT}" stroke-width=".03"/>`;
  }

  // ---- head + face
  const face = o.face ?? EXPR.neutral;
  const lid = o.noAuto || face.happyEyes > .5 ? 0 : blink(t, seed) * (face.eyeWhite > .6 ? .4 : 1);
  const sac = o.noAuto ? [0, 0] : saccade(t, seed, .12);
  const F: Face = { ...face, gx: clamp(face.gx + sac[0], -1.2, 1.2), gy: face.gy + sac[1] };
  const fturn = clamp(p.turn + p.headTurn, -1, 1);
  const hrot = n((p.headTilt + p.lean * .6) * 57.3);
  let hd = `<g transform="translate(${P(head)}) rotate(${hrot})">`;
  if (L.hat === 'hood') hd += `<path d="M-.62 .42 Q-.68 -.62 0 -.66 Q.68 -.62 .62 .42 Z" fill="${shade(bodyCol, .92)}" stroke="${OUT}" stroke-width="${LW}"/>`;
  if (L.hat === 'bun') hd += `<circle cx="${n(-fturn * .1)}" cy="-.56" r=".17" fill="${L.hair ?? '#d9d5cc'}" stroke="${OUT}" stroke-width="${LW}"/>`;
  hd += `<circle r=".5" fill="#fff" stroke="${OUT}" stroke-width="${LW}"/>`;
  if (!back) hd += drawFace(F, fturn, lid, id, LW);
  if (L.mask && !back) hd += `<path d="M${n(fturn * .3 - .3)} .02 Q${n(fturn * .3)} -.04 ${n(fturn * .3 + .3)} .02 L${n(fturn * .3 + .24)} .3 Q${n(fturn * .3)} .4 ${n(fturn * .3 - .24)} .3Z" fill="#e9eef2" stroke="${OUT}" stroke-width="${LW * .8}"/><path d="M${n(fturn * .3 - .2)} .12 H${n(fturn * .3 + .2)} M${n(fturn * .3 - .18)} .22 H${n(fturn * .3 + .18)}" stroke="#b8c2cc" stroke-width=".02"/>`;
  hd += hat(L, fturn, back);
  if (!back) hd += drawEmanata(F, fturn, LW);
  hd += '</g>';

  // ---- assemble with depth ordering
  const legs = [-1, 1].sort(sd => (far(sd) ? -1 : 1)).map(leg);
  const frontA = (p.frontA ?? (far(-1) ? 0 : 1)) > .5, frontB = (p.frontB ?? (far(1) ? 0 : 1)) > .5;
  const behind = (frontA ? '' : A.svg) + (frontB ? '' : B.svg);
  const before = back ? '' : (frontA ? A.svg : '') + (frontB ? B.svg : '');
  const backArms = back ? (frontA ? A.svg : '') + (frontB ? B.svg : '') : '';
  const svg = (back ? backArms + legs.join('') + torso + collar + hd + behind
    : behind + legs.join('') + torso + collar + hd + before);
  return { svg, j: { head, chest, hip, handA: A.end, handB: B.end, headR: .5 } };
}

function hat(L: Look, turn: number, back: boolean): string {
  const o = `stroke="${OUT}" stroke-width="${LW}"`;
  switch (L.hat) {
    case 'helmet': return `<path d="M-.56 -.02 Q-.6 -.68 0 -.7 Q.6 -.68 .56 -.02 Z" fill="#5d6b3a" ${o}/><path d="M-.62 -.02 H.62" ${o} stroke-linecap="round"/><path d="M-.3 -.45 q.1 -.08 .2 0 M.12 -.52 q.1 -.06 .18 .02" stroke="#46522c" stroke-width=".05" fill="none"/>`;
    case 'cap': return `<path d="M-.5 -.12 Q-.5 -.62 0 -.6 Q.5 -.62 .5 -.12 Z" fill="${L.hair ?? '#222'}" ${o}/><path d="M${turn >= 0 ? '.3' : '-.3'} -.14 h${turn >= 0 ? '.42' : '-.42'}" ${o} stroke-width=".09" stroke-linecap="round"/>`;
    case 'officer': return `<path d="M-.5 -.3 L-.62 -.62 Q0 -.85 .62 -.62 L.5 -.3 Z" fill="${L.hair ?? '#3c4a2a'}" ${o}/><path d="M-.52 -.27 H.52" stroke="#111" stroke-width=".1" stroke-linecap="round"/><circle cy="-.55" r=".07" fill="#e3b341" stroke="#111" stroke-width=".02"/>`;
    case 'headset': {
      if (back) return `<path d="M-.5 0 Q-.52 -.64 0 -.64 Q.52 -.64 .5 0" fill="none" stroke="#222" stroke-width=".07"/>` + [-1, 1].map(sd => `<rect x="${n(sd * .5 - .07)}" y="-.15" width=".14" height=".26" rx=".06" fill="#333" ${o}/>`).join('');
      const ex = turn * .1 - .47 * (1 - Math.abs(turn) * .3);
      return `<path d="M-.47 -.05 Q-.5 -.62 0 -.62 Q.5 -.62 .47 -.05" fill="none" stroke="#222" stroke-width=".07"/><rect x="${n(ex - .08)}" y="-.17" width=".16" height=".26" rx=".06" fill="#333" ${o}/>` + `<path d="M${n(ex)} .07 Q${n(ex + .05)} .3 ${n(turn * .3 - .02)} .27" fill="none" stroke="#222" stroke-width=".03"/><circle cx="${n(turn * .3 - .02)}" cy=".27" r=".035" fill="#222"/>`;
    }
    default: break;
  }
  return L.glasses && !back ? `<g fill="none" stroke="#111" stroke-width=".035"><rect x="${n(turn * .3 - .3)}" y="-.13" width=".22" height=".17" rx=".05"/><rect x="${n(turn * .3 + .08)}" y="-.13" width=".22" height=".17" rx=".05"/><path d="M${n(turn * .3 - .08)} -.06 h.16"/></g>` : '';
}

/** Convenience: standing breathing idle with slight weight shift (secondary motion). */
export function idle(t: number, seed = 1, amt = 1): Partial<Pose> {
  const s = Math.sin(t * .9 + seed * 2) * amt;
  return { hipX: s * .025, lean: s * .012, headTilt: Math.sin(t * .63 + seed) * .03 * amt };
}

/** Foot-planted walk pose. dist = units travelled (body x = start + dist*dir). Feet never slide while planted. */
export function walkPose(dist: number, dir: number, o: { step?: number; carryB?: V2; turn?: number } = {}): Pose {
  const w = walk(dist, o.step ?? .55);
  const f = (ft: { x: number; lift: number }): V2 => [(ft.x - dist) * dir, -.08 - ft.lift];
  const sw = w.swing * .26;
  const handA: V2 = [-.08 * dir - sw * dir, -1.66 + Math.abs(sw) * .12];
  const handB: V2 = o.carryB ?? [.08 * dir + sw * dir, -1.66 + Math.abs(sw) * .12];
  return { ...STAND, turn: (o.turn ?? .78) * dir, lean: .05 * dir, crouch: -w.bob + .03, hipX: 0, headTilt: 0, headTurn: 0, headLift: 0,
    footA: f(w.L), footB: f(w.R), handA, handB, kneeDir: dir, bendA: -1, bendB: -1 };
}
