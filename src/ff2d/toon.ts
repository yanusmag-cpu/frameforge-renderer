// YunoWorld "toon" cast — flat 2D cartoon people (skin, period costume, hats, noses, real eyes) driven by the same Pose /
// Face system as the FrameForge rig, so every move (walk, run, sit, point…) works unchanged. Local space as the rig:
// origin on the ground under the hips, +x right, +y DOWN, units = rig head diameters. Poses authored for the stickman are
// remapped onto each character's own proportions (leg length, torso length, girth).
import { type Face, EXPR } from './face.ts';
import { blink, clamp, ik2, mix, saccade, type V2 } from './motion.ts';
import { type Pose, type Joints } from './rig.ts';

export type Held = 'paper' | 'papers' | 'envelope' | 'cash' | 'newspaper' | 'pen' | 'cigar' | 'suitcase' | 'stamp' | 'cane' | 'hat' | 'blueprint' | 'coin' | 'glass' | 'wallet' | 'driptorch' | 'fusee' | 'radio';
export type ToonLook = {
  skin: string; hair: string; hairStyle: 'slick' | 'bald' | 'wavy' | 'crop' | 'bob' | 'side' | 'none';
  headW: number; headH: number; jaw: number;          // jaw 0 = narrow pointed chin … 1 = wide square / jowly
  headScale?: number;
  nose: 'straight' | 'bulb' | 'hook' | 'button' | 'long';
  stache?: 'pencil' | 'walrus' | 'handlebar' | 'brush'; beard?: 'goatee' | 'full' | 'chops'; facial?: string;
  glasses?: 'round' | 'monocle' | 'pince';
  leg: number; torso: number; shoulder: number; belly: number;
  coat: 'suit' | 'tails' | 'frock' | 'long' | 'livery' | 'dress' | 'cape' | 'apron' | 'nomex';
  adv?: boolean;                                       // Mystery-Adventure style: fingered hands, limb cel shading, medium head
  boots?: boolean; webgear?: string; braid?: boolean; freckles?: boolean; stubble?: string;
  jacket: string; trousers: string; vest?: string; shirt: string; tie?: { kind: 'bow' | 'long'; color: string };
  pin?: boolean; square?: string; chain?: boolean; buttons?: string; trim?: string;
  hat?: { kind: 'top' | 'bowler' | 'fedora' | 'kepi' | 'cloche' | 'boater' | 'cap' | 'beret' | 'helmet'; color: string; band?: string };
  shoes: string; spats?: boolean; gloves?: string; lips?: string; lashes?: boolean; earring?: string;
  stockings?: string;
};
export type ToonOpts = { id: string; t: number; seed?: number; face?: Face; noAuto?: boolean; heldA?: Held; heldB?: Held; hatOff?: number; light?: number; torchLit?: number; heldAng?: number };

const OUT = '#16120f', LW = .05;
const n = (x: number) => +x.toFixed(4);
const P = (p: V2) => `${n(p[0])} ${n(p[1])}`;
const add = (a: V2, b: V2, k = 1): V2 => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a: V2, b: V2): V2 => [a[0] - b[0], a[1] - b[1]];
const len = (a: V2) => Math.hypot(a[0], a[1]);
const nrm = (a: V2): V2 => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const perp = (a: V2): V2 => [-a[1], a[0]];
const lerp2 = (a: V2, b: V2, k: number): V2 => [mix(a[0], b[0], k), mix(a[1], b[1], k)];
export const shade = (hex: string, k: number) => {
  const v = parseInt(hex.slice(1), 16), c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map(x => Math.round(clamp(x * k, 0, 255)));
  return '#' + c.map(x => x.toString(16).padStart(2, '0')).join('');
};
const ol = (w = LW) => `stroke="${OUT}" stroke-width="${n(w)}" stroke-linejoin="round" stroke-linecap="round"`;

/** tapered limb outline through 3 points (rounded knee/elbow) */
function taper(a: V2, m: V2, b: V2, wa: number, wm: number, wb: number): string {
  const d1 = nrm(sub(m, a)), d2 = nrm(sub(b, m)), dm = nrm(add(d1, d2));
  const na = perp(d1), nb = perp(d2), nm = perp(dm[0] === 0 && dm[1] === 0 ? d1 : dm);
  const L = (p: V2, q: V2, w: number) => add(p, q, w / 2), R = (p: V2, q: V2, w: number) => add(p, q, -w / 2);
  return `M${P(L(a, na, wa))} Q${P(L(m, nm, wm * 1.04))} ${P(L(b, nb, wb))} A${n(wb / 2)} ${n(wb / 2)} 0 0 1 ${P(R(b, nb, wb))} Q${P(R(m, nm, wm * 1.04))} ${P(R(a, na, wa))} Z`;
}

/** Character presets for the 1925 Eiffel story */
export const CAST = {
  lustig: { skin: '#f0c9a4', hair: '#1c1714', hairStyle: 'slick', headW: .92, headH: 1.12, jaw: .25, nose: 'straight', stache: 'pencil',
    leg: 2.0, torso: 1.5, shoulder: .5, belly: 0, coat: 'suit', jacket: '#2b2f3a', trousers: '#2b2f3a', vest: '#3a3e4c', shirt: '#f6f2e8',
    tie: { kind: 'long', color: '#8e1d2c' }, pin: true, square: '#f6f2e8', shoes: '#191512', hat: { kind: 'fedora', color: '#24262d', band: '#121212' } },
  lustigGov: { skin: '#f0c9a4', hair: '#1c1714', hairStyle: 'slick', headW: .92, headH: 1.12, jaw: .25, nose: 'straight', stache: 'pencil',
    leg: 2.0, torso: 1.5, shoulder: .5, belly: 0, coat: 'tails', jacket: '#16171c', trousers: '#4b4c52', vest: '#d8d2c2', shirt: '#fbf8f0',
    tie: { kind: 'bow', color: '#121214' }, chain: true, square: '#fbf8f0', shoes: '#141210', spats: true, gloves: '#f4f0e6',
    hat: { kind: 'top', color: '#121216', band: '#2a2a30' }, trim: '#c8102e' },
  poisson: { skin: '#f2c3a2', hair: '#8c8579', hairStyle: 'side', headW: 1.08, headH: 1.06, jaw: .9, nose: 'bulb', stache: 'walrus', facial: '#8a8073',
    glasses: 'round', leg: 1.72, torso: 1.48, shoulder: .55, belly: .85, coat: 'suit', jacket: '#6b4a32', trousers: '#5e412c', vest: '#a8834f',
    shirt: '#f4efe2', tie: { kind: 'bow', color: '#2d4f7a' }, chain: true, shoes: '#3a2416', hat: { kind: 'bowler', color: '#2a1d14', band: '#140e0a' } },
  dealerA: { skin: '#e9c09a', hair: '#cfcac0', hairStyle: 'bald', headW: .86, headH: 1.18, jaw: .1, nose: 'long', beard: 'goatee', facial: '#d6d1c6',
    glasses: 'monocle', leg: 2.1, torso: 1.55, shoulder: .46, belly: .05, coat: 'frock', jacket: '#4d5560', trousers: '#3e434b', vest: '#6c7480',
    shirt: '#f3efe6', tie: { kind: 'long', color: '#3f5f3a' }, shoes: '#151210', hat: { kind: 'top', color: '#30333a', band: '#15161a' } },
  dealerB: { skin: '#d9a07a', hair: '#3b2a1e', hairStyle: 'bald', headW: 1.12, headH: 1.0, jaw: 1, nose: 'button', stache: 'walrus', facial: '#3b2a1e',
    leg: 1.65, torso: 1.4, shoulder: .6, belly: .6, coat: 'suit', jacket: '#3f5a3c', trousers: '#33472f', vest: '#7b6a3c', shirt: '#efe8d8',
    tie: { kind: 'long', color: '#7a2a1e' }, chain: true, shoes: '#2b1a10', hat: { kind: 'bowler', color: '#2c2a24' } },
  dealerC: { skin: '#c98b62', hair: '#151110', hairStyle: 'wavy', headW: .95, headH: 1.05, jaw: .55, nose: 'hook', stache: 'handlebar', facial: '#151110',
    leg: 1.9, torso: 1.5, shoulder: .52, belly: .2, coat: 'suit', jacket: '#5a2f3a', trousers: '#3a2b2e', vest: '#c4b28a', shirt: '#f2ece0',
    tie: { kind: 'bow', color: '#d8b35a' }, square: '#d8b35a', shoes: '#1a1210', hat: { kind: 'fedora', color: '#6a5a44', band: '#2a2018' } },
  dealerD: { skin: '#f3d0b0', hair: '#b8642e', hairStyle: 'crop', headW: .98, headH: 1.0, jaw: .6, nose: 'button', stache: 'brush', facial: '#b8642e',
    glasses: 'pince', leg: 1.85, torso: 1.45, shoulder: .5, belly: .3, coat: 'suit', jacket: '#7d7a6e', trousers: '#5f5d54', vest: '#4a4840',
    shirt: '#f4f0e6', tie: { kind: 'long', color: '#2a3d6a' }, pin: true, shoes: '#20160f', hat: { kind: 'boater', color: '#e6d39a', band: '#2a3d6a' } },
  dealerE: { skin: '#8d5a3c', hair: '#cfc9c0', hairStyle: 'crop', headW: 1.0, headH: 1.08, jaw: .7, nose: 'bulb', beard: 'full', facial: '#d9d4cb',
    leg: 1.9, torso: 1.5, shoulder: .54, belly: .4, coat: 'frock', jacket: '#23324a', trousers: '#2a2f38', vest: '#8a2a2a', shirt: '#f4f0e6',
    tie: { kind: 'bow', color: '#151515' }, chain: true, shoes: '#151210', hat: { kind: 'fedora', color: '#1f2633', band: '#0e1118' } },
  doorman: { skin: '#e8b996', hair: '#5a4030', hairStyle: 'crop', headW: .95, headH: 1.02, jaw: .6, nose: 'straight', stache: 'brush', facial: '#5a4030',
    leg: 1.95, torso: 1.5, shoulder: .55, belly: .1, coat: 'livery', jacket: '#6e1626', trousers: '#1d1c22', shirt: '#f6f2e8', buttons: '#e2b85a', trim: '#e2b85a',
    tie: { kind: 'bow', color: '#141414' }, gloves: '#f4f0e6', shoes: '#121010', hat: { kind: 'kepi', color: '#6e1626', band: '#e2b85a' } },
  vendor: { skin: '#eebd9a', hair: '#9a948c', hairStyle: 'bob', headW: .98, headH: 1.0, jaw: .55, nose: 'button', lips: '#b5525a',
    leg: 1.6, torso: 1.42, shoulder: .48, belly: .45, coat: 'apron', jacket: '#4b5e6e', trousers: '#2e2a28', shirt: '#e8dfcc', trim: '#d9cfb6',
    shoes: '#2a2018', stockings: '#3a332e', hat: { kind: 'beret', color: '#7a2e2e' }, earring: '#e2b85a' },
  lady: { skin: '#f6d4bd', hair: '#2b1d16', hairStyle: 'bob', headW: .9, headH: 1.04, jaw: .15, nose: 'button', lips: '#c0303e', lashes: true,
    leg: 1.95, torso: 1.4, shoulder: .42, belly: 0, coat: 'dress', jacket: '#2f7a78', trousers: '#2f7a78', shirt: '#2f7a78', trim: '#e9dcc0',
    shoes: '#2a1a14', stockings: '#e2c3a6', hat: { kind: 'cloche', color: '#d8c39a', band: '#2f7a78' }, earring: '#f0e6d0' },
  gendarme: { skin: '#e9bc98', hair: '#2a2018', hairStyle: 'crop', headW: .96, headH: 1.05, jaw: .7, nose: 'straight', stache: 'handlebar', facial: '#2a2018',
    leg: 2.0, torso: 1.5, shoulder: .56, belly: .1, coat: 'cape', jacket: '#1d2740', trousers: '#2a3352', shirt: '#1d2740', buttons: '#c9cdd4',
    trim: '#b8202a', shoes: '#0f0e0e', hat: { kind: 'kepi', color: '#1d2740', band: '#b8202a' } },
  porter: { skin: '#a8714c', hair: '#1a1410', hairStyle: 'crop', headW: .98, headH: 1.02, jaw: .7, nose: 'bulb', leg: 1.85, torso: 1.48, shoulder: .56, belly: .2,
    coat: 'livery', jacket: '#3d4a2e', trousers: '#2a2a24', shirt: '#efe7d6', buttons: '#c9a24a', trim: '#c9a24a', shoes: '#1a1410',
    hat: { kind: 'cap', color: '#b0262a', band: '#c9a24a' } },
  // ── YunoWorld Mystery-Adventure test cast: wildland firefighters ──
  ffMain: { adv: true, skin: '#e6b48e', hair: '#5a3a22', hairStyle: 'crop', headW: .98, headH: 1.12, jaw: .85, nose: 'straight', stubble: '#4a3020',
    leg: 2.25, torso: 1.65, shoulder: .64, belly: .05, coat: 'nomex', jacket: '#f2c230', trousers: '#2f3a2c', shirt: '#f2c230', webgear: '#4a4f36',
    gloves: '#b98a52', shoes: '#2a1c14', boots: true, hat: { kind: 'helmet', color: '#f3c21c', band: '#2a2a2a' } },
  ffSecond: { adv: true, skin: '#a8714c', hair: '#1a1210', hairStyle: 'crop', headW: .92, headH: 1.06, jaw: .35, nose: 'button', lashes: true, braid: true, freckles: true, lips: '#8a3a32',
    leg: 2.1, torso: 1.55, shoulder: .54, belly: 0, coat: 'nomex', jacket: '#efc02e', trousers: '#2a2f33', shirt: '#efc02e', webgear: '#3c4232',
    gloves: '#c99a5e', shoes: '#22160f', boots: true, hat: { kind: 'helmet', color: '#e9e4d6', band: '#1d2a4a' } },
} satisfies Record<string, ToonLook>;

/** Draw a toon character. Returns SVG (local coords) and joints in the same space. */
export function toon(p: Pose, L: ToonLook, o: ToonOpts): { svg: string; j: Joints } {
  const t = o.t, seed = o.seed ?? 1, id = o.id;
  const back = (p.back ?? 0) > .5;
  const at = Math.abs(p.turn), sgn = Math.sign(p.turn) || 1;
  const H = L.leg + L.torso, sy = H / 3.05, sx = 1 + L.belly * .12 + (L.shoulder - .5) * .4;
  const M = (v: V2): V2 => [v[0] * sx, v[1] * sy];
  const breath = o.noAuto ? 0 : Math.sin(t * 2 * Math.PI / 3.8 + seed) * .014;
  const hip: V2 = [p.hipX * sx, -L.leg + p.crouch * sy];
  const u: V2 = [Math.sin(p.lean), -Math.cos(p.lean)], r: V2 = [Math.cos(p.lean), Math.sin(p.lean)];
  const T = L.torso + breath;
  const at2 = (a: number, b: number): V2 => add(add(hip, r, a), u, b);
  const sq = 1 - .3 * at;                                        // horizontal squash when turned
  const sw = L.shoulder * sq, ww = (L.shoulder * .78 + L.belly * .42) * sq, hw = (L.shoulder * .82 + L.belly * .18) * sq;
  const c0 = p.turn * .14;                                       // front centre line shift
  const chest = at2(0, T);
  const neckTop = add(chest, u, .2);
  const hs = (L.headScale ?? (L.adv ? .93 : 1)) * .96;
  const head = add(add(neckTop, u, L.headH * .5 * hs * .92 + p.headLift), r, p.turn * .05);
  const shoulder = (side: number): V2 => at2(side * sw * .86 - p.turn * .05 * (side === sgn ? 0 : 1), T - .1);
  const far = (side: number) => side === -sgn && at > .12;
  const skin = L.skin, skinD = shade(skin, .8);
  const J = L.jacket, Jd = shade(J, .72), Jl = shade(J, 1.18);

  // ---- arms ----------------------------------------------------------------------------------------------------------
  const armLen = H * .205;
  const arm = (side: number) => {
    const s = shoulder(side), tgt0 = M(side < 0 ? p.handA : p.handB);
    const tgt: V2 = [tgt0[0], tgt0[1]];
    const pref = (side < 0 ? p.bendA : p.bendB) ?? 1;
    const s1 = ik2(s, tgt, armLen, armLen * .96, 1), s2 = ik2(s, tgt, armLen, armLen * .96, -1);
    const outer = (s1.mid[0] - s[0]) * side >= (s2.mid[0] - s[0]) * side ? s1 : s2, inner = outer === s1 ? s2 : s1;
    const lower = s1.mid[1] >= s2.mid[1] ? s1 : s2;
    const { mid, end } = pref === 2 ? lower : pref === 3 ? (lower === s1 ? s2 : s1) : pref >= 0 ? outer : inner;
    const dir = Math.atan2(end[1] - mid[1], end[0] - mid[0]);
    const dv: V2 = [Math.cos(dir), Math.sin(dir)];
    const wrist = add(end, dv, -.17);
    const sleeveCol = far(side) ? Jd : J;
    let svg = `<path d="${taper(s, mid, wrist, L.adv ? .38 : .3, L.adv ? .33 : .26, L.adv ? .28 : .23)}" fill="${sleeveCol}" ${ol()}/>`;
    if (L.adv) svg += `<path d="${taper(add(s, perp(nrm(sub(mid, s))), .06 * side), add(mid, perp(dv), .055 * side), add(wrist, perp(dv), .05 * side), .12, .1, .09)}" fill="${Jd}" opacity=".55"/>`;
    // sleeve crease + cuff
    svg += `<path d="M${P(add(mid, perp(dv), -.06))} q${n(dv[0] * .06)} ${n(dv[1] * .06)} ${n(-perp(dv)[0] * .08)} ${n(-perp(dv)[1] * .08)}" stroke="${Jd}" stroke-width=".03" fill="none"/>`;
    const cuffA = add(wrist, dv, -.02), cuffB = add(wrist, dv, .05);
    if (L.coat === 'nomex') svg += `<path d="M${P(cuffA)}L${P(cuffB)}" stroke="${OUT}" stroke-width=".27" stroke-linecap="round"/><path d="M${P(cuffA)}L${P(cuffB)}" stroke="${Jd}" stroke-width=".19" stroke-linecap="round"/>`;
    else if (L.coat !== 'dress' && L.coat !== 'apron') svg += `<path d="M${P(cuffA)}L${P(cuffB)}" stroke="${OUT}" stroke-width=".24" stroke-linecap="round"/><path d="M${P(cuffA)}L${P(cuffB)}" stroke="${L.coat === 'livery' || L.coat === 'cape' ? (L.trim ?? L.shirt) : L.shirt}" stroke-width=".15" stroke-linecap="round"/>`;
    const held = side < 0 ? o.heldA : o.heldB;
    svg += heldItem(held, end, dir, side, o);
    svg += L.adv ? handAdv(end, dir, (side < 0 ? p.shapeA : p.shapeB) ?? 'fist', side, L.gloves ?? skin, !!held) : handSvg(end, dir, (side < 0 ? p.shapeA : p.shapeB) ?? 'fist', side, L.gloves ?? skin, !!held);
    return { svg, end };
  };
  const A = arm(-1), B = arm(1);

  // ---- legs ----------------------------------------------------------------------------------------------------------
  const thigh = L.leg * .52, shin = L.leg * .5;
  const legPts = (side: number) => {
    const hj = at2(side * .2 * (1 - .5 * at) * (1 + L.belly * .3), .08);
    const tg = M(side < 0 ? p.footA : p.footB); const tgt: V2 = [tg[0], tg[1]];
    const kd = p.kneeDir ?? (at > .2 ? sgn : side);
    const k1 = ik2(hj, tgt, thigh, shin, 1), k2 = ik2(hj, tgt, thigh, shin, -1);
    const pick = p.kneeUp ? (k1.mid[1] < k2.mid[1] ? k1 : k2) : (k1.mid[0] - hj[0]) * kd >= (k2.mid[0] - hj[0]) * kd ? k1 : k2;
    const w = at > .2 || p.kneeDir !== undefined || p.kneeUp ? 1 : .35;
    const m2: V2 = [mix((hj[0] + pick.end[0]) / 2, pick.mid[0], w), mix((hj[1] + pick.end[1]) / 2, pick.mid[1], w)];
    return { hj, m2, end: pick.end };
  };
  const leg = (side: number) => {
    const { hj, m2, end } = legPts(side);
    const dress = L.coat === 'dress' || L.coat === 'apron';
    const col = dress ? (L.stockings ?? skin) : far(side) ? shade(L.trousers, .8) : L.trousers;
    const ank = add(end, [0, -.06]);
    let s = `<path d="${taper(hj, m2, ank, dress ? .2 : .36, dress ? .17 : .3, dress ? .13 : .27)}" fill="${col}" ${ol()}/>`;
    if (L.adv && !dress) { const dd = nrm(sub(ank, m2)); s += `<path d="${taper(add(hj, perp(nrm(sub(m2, hj))), -.08), add(m2, perp(dd), -.07), add(ank, perp(dd), -.06), .13, .11, .1)}" fill="${shade(col, .7)}" opacity=".6"/>`;
      if (L.coat === 'nomex') { const q = lerp2(hj, m2, .55); s += `<path d="M${n(q[0] - .12)} ${n(q[1] - .12)} h.24 v.26 q-.12 .04 -.24 0z" fill="${shade(col, 1.12)}" ${ol(.02)}/>`; } }
    if (!dress && !back) s += `<path d="M${P(lerp2(hj, m2, .25))} L${P(lerp2(m2, ank, .85))}" stroke="${shade(col, .78)}" stroke-width=".022" fill="none"/>`;
    s += shoeSvg(end, at > .2 ? p.turn : side * .3, L, dress);
    return s;
  };

  // ---- torso / costume -----------------------------------------------------------------------------------------------
  const front = !back;
  const belly = L.belly;
  const bx = (k: number) => (belly * .32 * (1 - at) + belly * .38 * at) * k;    // belly bulge amount
  const torsoPath = () => {
    const sh = (s: number) => P(at2(s * sw, T - .06)), wa = (s: number) => P(at2(s * ww + (at > .2 && s === sgn ? bx(1) * sgn * sgn : 0), T * .42));
    const hp = (s: number) => P(at2(s * hw * 1.02 + (at > .2 && s === sgn ? bx(.6) : 0), -.32));
    return `M${sh(-1)} Q${P(at2(0, T + .1))} ${sh(1)} C${P(at2(sw * 1.08, T * .8))} ${wa(1)} ${wa(1)} C${P(at2(ww * 1.06 + (at > .2 && sgn > 0 ? bx(1.1) : 0), T * .12))} ${hp(1)} ${hp(1)}` +
      ` Q${P(at2(0, -.38))} ${hp(-1)} C${hp(-1)} ${P(at2(-ww * 1.06 - (at > .2 && sgn < 0 ? bx(1.1) : 0), T * .12))} ${wa(-1)} C${wa(-1)} ${P(at2(-sw * 1.08, T * .8))} ${sh(-1)} Z`;
  };
  const tp = torsoPath();
  let torso = '';
  const dress = L.coat === 'dress' || L.coat === 'apron';
  // tails / skirts behind the legs
  let behindLegs = '';
  if (L.coat === 'tails') {
    for (const sd of [-1, 1]) {
      const top = at2(sd * hw * .7 - p.turn * .2, T * .3), bot = add(at2(sd * hw * .55 - p.turn * .35, -1.2), [-p.turn * .1, 0]);
      behindLegs += `<path d="M${P(top)} L${P(at2(sd * .05 - p.turn * .2, T * .25))} L${P(add(bot, [sd * -.12, 0]))} Q${P(add(bot, [sd * .05, .1]))} ${P(add(bot, [sd * .18, -.05]))} Z" fill="${Jd}" ${ol()}/>`;
    }
  }
  if (dress) {
    const fl = (side: number) => {
      const { end } = legPts(side); const swg = clamp((end[0] - hip[0]) * .35, -.35, .35);
      return [swg];
    };
    const sa = fl(-1)[0], sb = fl(1)[0];
    const hemY = hip[1] + L.leg * .62;
    const sk = `M${P(at2(-hw * 1.05, .05))} L${P(at2(hw * 1.05, .05))} L${n(hip[0] + hw * 1.45 + sb)} ${n(hemY)} Q${n(hip[0] + (sa + sb) / 2)} ${n(hemY + .08)} ${n(hip[0] - hw * 1.45 + sa)} ${n(hemY)} Z`;
    torso += `<path d="${sk}" fill="${L.coat === 'apron' ? shade(J, .9) : J}" ${ol()}/>`;
    torso += `<path d="M${n(hip[0] - hw * 1.3 + sa * .9)} ${n(hemY - .14)} Q${n(hip[0])} ${n(hemY - .08)} ${n(hip[0] + hw * 1.3 + sb * .9)} ${n(hemY - .14)}" stroke="${L.trim ?? Jl}" stroke-width=".07" fill="none"/>`;
    for (const k of [-.45, 0, .45]) torso += `<path d="M${n(hip[0] + k * hw)} ${n(hip[1] + .2)} L${n(hip[0] + k * hw * 1.5 + (sa + sb) * .3)} ${n(hemY - .05)}" stroke="${shade(J, .8)}" stroke-width=".025"/>`;
  }
  // frock / long coat skirt over the thighs
  if (L.coat === 'frock' || L.coat === 'long' || L.coat === 'cape') {
    const depth = L.coat === 'cape' ? .55 : L.coat === 'frock' ? .95 : 1.25;
    const fl = (side: number) => {
      const ft = M(side < 0 ? p.footA : p.footB); const swg = clamp((ft[0] - hip[0]) * .3, -.32, .32);
      const t0 = at2(side * hw * 1.0, -.1), t1 = at2(side * .02 + c0, -.1), b1: V2 = [hip[0] + c0 + side * .03 + swg * .6, hip[1] + depth], b0: V2 = [hip[0] + side * hw * 1.22 + swg, hip[1] + depth - .05];
      return `<path d="M${P(t0)} L${P(t1)} L${P(b1)} Q${P([(b1[0] + b0[0]) / 2, b1[1] + .05])} ${P(b0)} Z" fill="${side * (p.turn || 1) > 0 ? Jd : J}" ${ol()}/>`;
    };
    if (L.coat !== 'cape') torso += fl(-1) + fl(1);
  }
  torso += `<clipPath id="${id}t"><path d="${tp}"/></clipPath><path d="${tp}" fill="${J}"/><g clip-path="url(#${id}t)">`;
  // cel shade away from the key light
  torso += `<path d="M${P(at2(sw * .35, T + .3))} L${P(at2(sw * 1.6, T + .3))} L${P(at2(sw * 1.6, -.5))} L${P(at2(sw * .5, -.5))}Z" fill="${Jd}" opacity=".55"/>`;
  if (L.pin) for (let k = -4; k <= 4; k++) torso += `<path d="M${P(at2(k * .13, T + .2))} L${P(at2(k * .13 + bx(.05), -.4))}" stroke="${Jl}" stroke-width=".012" opacity=".7"/>`;
  if (L.coat === 'nomex') {
    const c = c0, G = L.webgear ?? '#3a3f2c';
    if (front) {
      torso += `<path d="M${P(at2(c, T - .05))} L${P(at2(c + bx(.05), -.25))}" stroke="${Jd}" stroke-width=".03"/>`;
      for (const k of [.35, .75, 1.15]) { const b = at2(c + .04, T - k); torso += `<circle cx="${n(b[0])}" cy="${n(b[1])}" r=".028" fill="${shade(J, .55)}"/>`; }
      for (const sd of [-1, 1]) { if (sd === -sgn && at > .6) continue; const q = at2(c + sd * sw * .52, T - .42); torso += `<path d="M${n(q[0] - .15)} ${n(q[1] - .12)} h.3 v.3 q-.15 .05 -.3 0z" fill="${Jl}" ${ol(.02)}/><path d="M${n(q[0] - .16)} ${n(q[1] - .14)} h.32 l-.02 .1 h-.28z" fill="${Jd}" ${ol(.02)}/>`; }
      // web gear: shoulder straps, chest strap, radio
      for (const sd of [-1, 1]) torso += `<path d="M${P(at2(c + sd * sw * .62, T + .05))} L${P(at2(c + sd * sw * .55, -.25))}" stroke="${OUT}" stroke-width=".15"/><path d="M${P(at2(c + sd * sw * .62, T + .05))} L${P(at2(c + sd * sw * .55, -.25))}" stroke="${G}" stroke-width=".1"/>`;
      torso += `<path d="M${P(at2(c - sw * .6, T * .48))} L${P(at2(c + sw * .6, T * .48))}" stroke="${OUT}" stroke-width=".12"/><path d="M${P(at2(c - sw * .6, T * .48))} L${P(at2(c + sw * .6, T * .48))}" stroke="${G}" stroke-width=".07"/>`;
      const rq = at2(c - sw * .55, T - .55); torso += `<path d="M${n(rq[0] - .08)} ${n(rq[1] - .2)} h.16 v.36 h-.16z" fill="#262626" ${ol(.02)}/><path d="M${n(rq[0] + .04)} ${n(rq[1] - .2)} v-.24" stroke="${OUT}" stroke-width=".035"/><circle cx="${n(rq[0])}" cy="${n(rq[1] - .1)}" r=".025" fill="#e04a2a"/>`;
    } else {   // fire shelter pack on the back
      const pk = `M${P(at2(-sw * .85, T - .05))} L${P(at2(sw * .85, T - .05))} L${P(at2(sw * .8, -.15))} Q${P(at2(0, -.3))} ${P(at2(-sw * .8, -.15))}Z`;
      torso += `<path d="${pk}" fill="${shade(G, 1.25)}" ${ol(.03)}/><path d="M${P(at2(-sw * .75, T * .35))} L${P(at2(sw * .75, T * .35))}" stroke="${G}" stroke-width=".07"/><path d="M${P(at2(-sw * .5, T * .62))} h${n(sw)} v.25 h${n(-sw)}z" fill="#d8c08a" ${ol(.02)}/>`;
    }
    torso += `<path d="M${P(at2(-ww * 1.1, .02))} L${P(at2(ww * 1.1, .02))}" stroke="${OUT}" stroke-width=".13"/><path d="M${P(at2(-ww * 1.1, .02))} L${P(at2(ww * 1.1, .02))}" stroke="#2a2420" stroke-width=".08"/>`;
    if (front) { const b = at2(c, .02); torso += `<rect x="${n(b[0] - .07)}" y="${n(b[1] - .06)}" width=".14" height=".12" fill="#9aa0a6" ${ol(.015)}/>`; }
  } else if (front && !dress && L.coat !== 'cape') {
    const c = c0, dep = L.coat === 'livery' ? .12 : L.coat === 'tails' ? T * .62 : T * .52;
    const vY = T - dep;
    // shirt + vest in the V
    torso += `<path d="M${P(at2(c - .26, T + .05))} L${P(at2(c, vY - .55))} L${P(at2(c + .26, T + .05))}Z" fill="${L.vest ?? L.shirt}"/>`;
    torso += `<path d="M${P(at2(c - .11, T + .05))} L${P(at2(c, T - .55))} L${P(at2(c + .11, T + .05))}Z" fill="${L.shirt}"/>`;
    if (L.vest) for (const k of [.18, .4, .62]) { const b = at2(c, vY + .2 - k * .9 + .45); if (b[1] > at2(0, vY - .5)[1] - 2) torso += `<circle cx="${n(b[0])}" cy="${n(b[1])}" r=".028" fill="${shade(L.vest, .55)}"/>`; }
    if (L.chain && L.vest) torso += `<path d="M${P(at2(c - .2, vY - .1))} Q${P(at2(c - .02, vY - .28))} ${P(at2(c + .2, vY - .08))}" stroke="#d9b45a" stroke-width=".028" fill="none"/>`;
    if (L.tie?.kind === 'long') torso += `<path d="M${P(at2(c - .045, T - .02))} L${P(at2(c + .045, T - .02))} L${P(at2(c + .06, T - .6))} L${P(at2(c, T - .7))} L${P(at2(c - .06, T - .6))}Z" fill="${L.tie.color}" ${ol(.02)}/>`;
    // lapels
    if (L.coat === 'livery') {
      for (const k of [.25, .55, .85, 1.15]) for (const sd of [-1, 1]) { const b = at2(c + sd * .16, T - k); torso += `<circle cx="${n(b[0])}" cy="${n(b[1])}" r=".035" fill="${L.buttons ?? '#d9b45a'}" ${ol(.012)}/>`; }
      torso += `<path d="M${P(at2(c, T))} L${P(at2(c, -.3))}" stroke="${Jd}" stroke-width=".03"/>`;
      torso += `<path d="M${P(at2(-ww * 1.1, .02))} L${P(at2(ww * 1.1, .02))}" stroke="${L.trim ?? '#d9b45a'}" stroke-width=".06"/>`;
    } else {
      for (const sd of [-1, 1]) {
        if (sd === -sgn && at > .65) continue;
        const a1 = at2(c + sd * .27, T + .02), a2 = at2(c + sd * .03, vY - .5), a3 = at2(c + sd * .26, vY + .2), a4 = at2(c + sd * .4, T - .25), a5 = at2(c + sd * .33, T - .12);
        torso += `<path d="M${P(a1)} L${P(a2)} L${P(a3)} L${P(a4)} L${P(a5)} Z" fill="${Jl}" ${ol(.022)}/>`;
      }
      // buttons
      const nb = L.coat === 'tails' ? 1 : 2;
      for (let k = 0; k < nb; k++) { const b = at2(c + .05 + bx(.1), vY - .62 - k * .3); torso += `<circle cx="${n(b[0])}" cy="${n(b[1])}" r=".035" fill="${shade(J, .45)}"/>`; }
      if (L.coat !== 'tails') torso += `<path d="M${P(at2(c + .03, vY - .5))} Q${P(at2(c + .06 + bx(.3), T * .2))} ${P(at2(c - .05, -.3))}" stroke="${OUT}" stroke-width=".022" fill="none"/>`;
      if (L.square && at < .8) { const q = at2(c - sgn * .0 - .3 * (1 - at * .5) * (p.turn >= 0 ? 1 : -1), T - .42); torso += `<path d="M${n(q[0] - .1)} ${n(q[1])} l.04 -.09 l.04 .05 l.04 -.07 l.04 .06 l.03 .05 Z" fill="${L.square}" ${ol(.015)}/><path d="M${n(q[0] - .12)} ${n(q[1])} h.24" stroke="${Jd}" stroke-width=".03"/>`; }
      // pocket flaps
      for (const sd of [-1, 1]) { if (sd === -sgn && at > .5) continue; const q = at2(c + sd * (ww * .62), .18); torso += `<path d="M${n(q[0] - .13)} ${n(q[1])} h.26" stroke="${Jd}" stroke-width=".035"/>`; }
    }
    if (L.trim && L.coat === 'tails') { const q = at2(c - .3 * (p.turn >= 0 ? 1 : -1), T - .3); torso += `<path d="M${n(q[0] - .05)} ${n(q[1] - .03)} h.1 v.06 h-.1z" fill="${L.trim}"/>`; }  // red ribbon (Légion d'honneur rosette)
  }
  if (dress && front) {
    torso += `<path d="M${P(at2(-ww * 1.2, .05))} L${P(at2(ww * 1.2, .05))}" stroke="${L.trim ?? Jl}" stroke-width=".09"/>`;
    torso += `<path d="M${P(at2(c0 - .18, T + .03))} Q${P(at2(c0, T - .3))} ${P(at2(c0 + .18, T + .03))}" stroke="${L.trim ?? Jl}" stroke-width=".05" fill="none"/>`;
    if (L.coat === 'apron') torso += `<path d="M${P(at2(c0 - .3, T * .55))} L${P(at2(c0 + .3, T * .55))} L${P(at2(c0 + .36, -.9))} L${P(at2(c0 - .36, -.9))}Z" fill="${L.trim}" ${ol(.02)}/>`;
  }
  if (back) torso += `<path d="M${P(at2(0, T))} L${P(at2(0, -.35))}" stroke="${Jd}" stroke-width=".025"/>`;
  torso += `</g><path d="${tp}" fill="none" ${ol()}/>`;
  if (L.coat === 'cape') {
    const cp = `M${P(at2(-sw * 1.15, T + .05))} Q${P(at2(0, T + .15))} ${P(at2(sw * 1.15, T + .05))} L${P(at2(sw * 1.45, T * .3))} Q${P(at2(0, T * .22))} ${P(at2(-sw * 1.45, T * .3))} Z`;
    torso += `<path d="${cp}" fill="${shade(J, .92)}" ${ol()}/>`;
    if (front) for (const k of [.2, .5, .8]) { const b = at2(c0, T - k); torso += `<circle cx="${n(b[0])}" cy="${n(b[1])}" r=".03" fill="${L.buttons}"/>`; }
  }
  // neck + collar
  const nk0 = add(chest, u, -.02), nk1 = add(neckTop, u, .1);
  let collar = `<path d="M${P(nk0)}L${P(nk1)}" stroke="${OUT}" stroke-width="${n(.3 + LW * 2)}" stroke-linecap="butt"/><path d="M${P(nk0)}L${P(nk1)}" stroke="${skinD}" stroke-width=".3"/>`;
  if (back && !dress) {
    const cc = at2(0, T + .02); collar += `<path d="M${n(cc[0] - .2)} ${n(cc[1] - .04)} Q${n(cc[0])} ${n(cc[1] + .03)} ${n(cc[0] + .2)} ${n(cc[1] - .04)} L${n(cc[0] + .2)} ${n(cc[1] - .14)} Q${n(cc[0])} ${n(cc[1] - .08)} ${n(cc[0] - .2)} ${n(cc[1] - .14)}Z" fill="${L.coat === 'cape' ? J : L.shirt}" ${ol(.025)}/>`;
  } else if (!dress && L.coat !== 'cape') {
    const cc = at2(c0 * .6, T + .06);
    collar += `<path d="M${n(cc[0] - .2)} ${n(cc[1] - .09)} L${n(cc[0] - .02)} ${n(cc[1] + .1)} L${n(cc[0] + .02)} ${n(cc[1] + .1)} L${n(cc[0] + .2)} ${n(cc[1] - .09)} L${n(cc[0] + .17)} ${n(cc[1] + .02)} L${n(cc[0])} ${n(cc[1] + .16)} L${n(cc[0] - .17)} ${n(cc[1] + .02)}Z" fill="${L.coat === 'livery' ? (L.trim ?? L.shirt) : L.shirt}" ${ol(.025)}/>`;
    if (front && L.tie?.kind === 'bow') collar += `<g transform="translate(${P(add(cc, [0, .13]))})"><path d="M-.17 -.08 L0 0 L-.17 .08Z M.17 -.08 L0 0 L.17 .08Z" fill="${L.tie.color}" ${ol(.022)}/><circle r=".045" fill="${L.tie.color}" ${ol(.02)}/></g>`;
  } else if (L.coat === 'cape') {
    const cc = at2(c0 * .6, T + .08); collar += `<path d="M${n(cc[0] - .24)} ${n(cc[1] - .02)} Q${n(cc[0])} ${n(cc[1] + .16)} ${n(cc[0] + .24)} ${n(cc[1] - .02)} L${n(cc[0] + .22)} ${n(cc[1] - .14)} Q${n(cc[0])} ${n(cc[1] - .04)} ${n(cc[0] - .22)} ${n(cc[1] - .14)}Z" fill="${J}" ${ol(.025)}/><path d="M${n(cc[0] - .14)} ${n(cc[1] - .05)} h.06 M${n(cc[0] + .08)} ${n(cc[1] - .05)} h.06" stroke="${L.trim}" stroke-width=".04"/>`;
  }

  // ---- head ----------------------------------------------------------------------------------------------------------
  const face = o.face ?? EXPR.neutral;
  const lid = o.noAuto || face.happyEyes > .5 ? 0 : blink(t, seed);
  const sac = o.noAuto ? [0, 0] : saccade(t, seed, .1);
  const F: Face = { ...face, gx: clamp(face.gx + sac[0], -1.2, 1.2), gy: face.gy + sac[1] };
  const fturn = clamp(p.turn + p.headTurn, -1, 1);
  const hrot = n((p.headTilt + p.lean * .5) * 57.3);
  const hd = `<g transform="translate(${P(head)}) rotate(${hrot}) scale(${n(hs)})">${headSvg(L, F, fturn, lid, back, id, o.hatOff ?? 0)}</g>`;

  // ---- assemble ------------------------------------------------------------------------------------------------------
  const legs = [-1, 1].sort(sd => (far(sd) ? -1 : 1)).map(leg);
  const frontA = (p.frontA ?? (far(-1) ? 0 : 1)) > .5, frontB = (p.frontB ?? (far(1) ? 0 : 1)) > .5;
  const behind = (frontA ? '' : A.svg) + (frontB ? '' : B.svg);
  const before = (frontA ? A.svg : '') + (frontB ? B.svg : '');
  const svg = back ? before + behindLegs + legs.join('') + torso + collar + hd + behind
    : behind + behindLegs + legs.join('') + torso + collar + hd + before;
  return { svg, j: { head, chest, hip, handA: A.end, handB: B.end, headR: .5 * hs } };
}

function handSvg(at: V2, dir: number, shape: string, side: number, col: string, holding: boolean): string {
  const rot = n(dir * 180 / Math.PI), d = shade(col, .78), o = ol(.035);
  let g = '';
  if (shape === 'open') {
    g = `<path d="M-.05 -.1 Q.12 -.13 .26 -.1 Q.3 -.07 .26 -.05 L.12 -.05 L.29 -.02 Q.32 .01 .28 .03 L.12 .03 L.27 .06 Q.29 .09 .25 .1 L.1 .1 Q.02 .14 -.05 .1 Z" fill="${col}" ${o}/>` +
      `<path d="M.02 ${n(-.08 * side)} Q.09 ${n(-.2 * side)} .16 ${n(-.19 * side)} Q.18 ${n(-.15 * side)} .1 ${n(-.06 * side)}" fill="${col}" ${o}/>`;
  } else if (shape === 'point') {
    g = `<path d="M-.06 -.09 Q.08 -.12 .14 -.07 L.34 -.06 Q.37 -.03 .34 -.01 L.14 0 Q.15 .1 .02 .11 Q-.08 .1 -.06 -.09Z" fill="${col}" ${o}/><path d="M.04 .02 q.05 .02 .09 0 M.03 .06 q.05 .02 .09 0" stroke="${d}" stroke-width=".02" fill="none"/>`;
  } else {
    // fist / hold: rounded mitten with knuckle lines and thumb
    g = `<path d="M-.07 -.1 Q.1 -.14 .16 -.06 Q.2 .02 .14 .09 Q.04 .14 -.07 .1 Z" fill="${col}" ${o}/>` +
      `<path d="M.1 -.07 q.03 .03 .02 .06 M.12 .0 q.03 .03 .01 .05" stroke="${d}" stroke-width=".018" fill="none"/>` +
      (holding || shape === 'hold' ? `<path d="M.0 ${n(-.07 * side)} Q.13 ${n(-.12 * side)} .14 ${n(-.02 * side)}" fill="${col}" ${o}/>` : `<path d="M-.01 ${n(-.06 * side)} q.1 ${n(.02 * side)} .09 ${n(.08 * side)}" stroke="${OUT}" stroke-width=".025" fill="none"/>`);
  }
  return `<g transform="translate(${P(at)}) rotate(${rot})">${g}</g>`;
}

/** Mystery-Adventure hands: palm + four fingers + thumb in the forearm frame (x along the forearm), gauntlet cuff for gloves */
function handAdv(at: V2, dir: number, shape: string, side: number, col: string, holding: boolean): string {
  const rot = n(dir * 180 / Math.PI), d = shade(col, .8), o = ol(.032), sd = side;
  const fing = (x: number, y: number, a: number, len: number, w = .058) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(a)})"><rect x="0" y="${n(-w / 2)}" width="${n(len)}" height="${n(w)}" rx="${n(w / 2)}" fill="${col}" ${o}/></g>`;
  let g = `<path d="M-.2 -.1 L-.06 -.12 L-.06 .12 L-.2 .1Z" fill="${shade(col, .9)}" ${o}/>`;   // cuff / wrist
  const palm = `<path d="M-.07 -.11 Q.08 -.13 .12 -.09 L.13 .09 Q.08 .13 -.07 .11 Q-.1 0 -.07 -.11Z" fill="${col}" ${o}/>`;
  const thumbOut = fing(-.01, -.09 * sd, -60 * sd, .15, .062), thumbIn = fing(.0, -.06 * sd, -15 * sd, .12, .06);
  if (shape === 'open') g += thumbOut + palm + [-.075, -.025, .025, .075].map((y, i) => fing(.1, y, (y * 140) + (i - 1.5) * 3, [.16, .19, .18, .14][i])).join('');
  else if (shape === 'point') g += palm + fing(.1, -.055 * sd, -4 * sd, .2) + [0, .045, .085].map(y => `<path d="M.11 ${n(y * sd - .015)} q.07 0 .06 .04 q-.01 .03 -.06 .02" fill="${col}" ${o}/>`).join('') + thumbIn;
  else if (shape === 'thumb') g += palm + [-.06, -.02, .02, .06].map(y => `<path d="M.11 ${n(y - .02)} q.07 0 .06 .04 q-.01 .03 -.06 .02" fill="${col}" ${o}/>`).join('') + fing(.0, -.08 * sd, -95 * sd, .17, .066);
  else if (shape === 'hold' || holding) g += palm + [-.065, -.022, .022, .065].map(y => `<path d="M.08 ${n(y - .024)} q.11 -.01 .1 .045 q-.04 .025 -.1 .006" fill="${col}" ${o}/>`).join('') + thumbIn;
  else g += palm + [-.07, -.025, .02, .065].map(y => `<path d="M.1 ${n(y - .022)} q.08 0 .07 .045 q-.02 .02 -.07 .005" fill="${col}" ${o}/>`).join('') + `<path d="M.0 ${n(-.07 * sd)} q.1 ${n(.02 * sd)} .1 ${n(.06 * sd)}" fill="none" stroke="${OUT}" stroke-width=".03"/><path d="M.02 ${n(-.08 * sd)} q.09 ${n(.02 * sd)} .09 ${n(.06 * sd)}" fill="none" stroke="${d}" stroke-width=".035"/>`;
  return `<g transform="translate(${P(at)}) rotate(${rot}) scale(1.45)">${g}</g>`;
}

function heldItem(h: Held | undefined, at: V2, dir: number, side: number, op?: ToonOpts): string {
  if (!h) return '';
  const o = ol(.025), rot = n(dir * 180 / Math.PI);
  const g = (s: string, upright = false) => `<g transform="translate(${P(at)}) rotate(${upright ? 0 : rot})">${s}</g>`;
  switch (h) {
    case 'paper': return g(`<g transform="rotate(${-rot + side * 8})"><path d="M-.05 -.42 h.36 v.48 h-.36z" fill="#f4ecd6" ${o}/><path d="M0 -.34 h.22 M0 -.28 h.26 M0 -.22 h.2 M0 -.16 h.24 M0 -.1 h.18" stroke="#6a5f50" stroke-width=".018"/><circle cx=".22" cy="-.02" r=".04" fill="#a3242c"/></g>`, false);
    case 'papers': return g(`<g transform="rotate(${-rot + side * 6})"><path d="M-.02 -.46 h.4 v.52 h-.4z" fill="#e8dcc0" ${o}/><path d="M-.07 -.42 h.4 v.52 h-.4z" fill="#f6efdc" ${o}/><path d="M-.02 -.32 h.26 M-.02 -.26 h.3 M-.02 -.2 h.22" stroke="#6a5f50" stroke-width=".018"/><text x=".13" y="-.36" font-size=".05" font-family="Georgia,serif" text-anchor="middle" fill="#2a2a4a">RÉPUBLIQUE FRANÇAISE</text></g>`);
    case 'envelope': return g(`<g transform="rotate(${-rot + side * 10})"><path d="M-.04 -.2 h.42 v.27 h-.42z" fill="#e9dcbc" ${o}/><path d="M-.04 -.2 L.17 -.04 L.38 -.2" fill="none" ${o}/><circle cx=".17" cy="-.05" r=".035" fill="#a3242c"/></g>`);
    case 'cash': return g(`<g transform="rotate(${-rot + side * 12})"><path d="M-.04 -.16 h.42 v.22 h-.42z" fill="#b9c79a" ${o}/><path d="M-.01 -.13 h.42 v.22 h-.42z" fill="#cfdcae" ${o}/><ellipse cx=".2" cy="-.02" rx=".06" ry=".07" fill="none" stroke="#5c6e42" stroke-width=".018"/><path d="M.02 -.1 v.16 M.38 -.1 v.16" stroke="#5c6e42" stroke-width=".015"/></g>`);
    case 'wallet': return g(`<path d="M-.02 -.12 h.3 v.2 h-.3z" fill="#5a3320" ${o}/><path d="M.0 -.16 h.26 v.06 h-.26z" fill="#cfdcae" ${o}/>`);
    case 'newspaper': return g(`<g transform="rotate(${-rot + side * 4})"><path d="M-.5 -.95 h1.0 v1.1 h-1.0z" fill="#ece6d4" ${o}/><path d="M0 -.95 v1.1" stroke="#b9b09a" stroke-width=".02"/><text x="-.25" y="-.82" font-size=".085" font-family="Georgia,serif" font-weight="700" text-anchor="middle" fill="#1d1a16">LE MATIN</text>` +
      `<path d="M-.45 -.74 h.4 M-.45 -.66 h.4" stroke="#3a3530" stroke-width=".03"/><rect x="-.43" y="-.58" width=".36" height=".3" fill="#cfc6b0"/><path d="M-.25 -.3 l-.07 -.24 l.07 -.04 l.07 .04z" fill="#6a6152"/>${[-.2, -.12, -.04, .04, .12, .2, .28, .36, .44, .52, .6, .68, .76, .84, .92].map(k => `<path d="M.05 ${n(-.85 + k * .9)} h.4" stroke="#8a8270" stroke-width=".016"/>`).join('')}</g>`, true);
    case 'pen': return g(`<path d="M-.02 -.02 L.34 -.06 L.38 -.04 L.34 -.02 Z" fill="#141414" ${o}/><path d="M.34 -.06 L.42 -.045 L.34 -.02" fill="#d9b45a"/>`);
    case 'cigar': return g(`<path d="M.05 -.03 h.3 v.06 h-.3z" fill="#6b3f22" ${o}/><circle cx=".36" cy="0" r=".035" fill="#ff8a3d"/>`);
    case 'suitcase': return g(`<path d="M-.42 .15 h.84 v.62 h-.84z" fill="#7a4a2a" ${o}/><path d="M-.12 .15 q0 -.15 .12 -.15 q.12 0 .12 .15" fill="none" stroke="${OUT}" stroke-width=".05"/><path d="M-.42 .38 h.84" stroke="#4a2a16" stroke-width=".04"/><rect x="-.3" y=".14" width=".08" height=".1" fill="#d9b45a"/><rect x=".22" y=".14" width=".08" height=".1" fill="#d9b45a"/>`, true);
    case 'stamp': return g(`<path d="M-.06 -.38 h.12 v.22 h-.12z" fill="#5a3320" ${o}/><path d="M-.14 -.16 h.28 v.08 h-.28z" fill="#2a2a2a" ${o}/><ellipse cy="-.46" rx=".09" ry=".07" fill="#6b3f22" ${o}/>`, true);
    case 'cane': return g(`<path d="M0 0 L0 1.9" stroke="${OUT}" stroke-width=".09"/><path d="M0 0 L0 1.9" stroke="#2a1a10" stroke-width=".05"/><circle r=".06" fill="#d9b45a" ${o}/>`, true);
    case 'hat': return '';
    case 'blueprint': return g(`<g transform="rotate(${-rot})"><path d="M-.6 -.5 h1.2 v.75 h-1.2z" fill="#26476e" ${o}/><path d="M0 -.42 L-.16 .17 M0 -.42 L.16 .17 M-.12 0 h.24 M-.07 -.2 h.14" stroke="#cfe0f2" stroke-width=".02"/><path d="M-.3 -.3 L.3 .1 M.3 -.3 L-.3 .1" stroke="#e04a3a" stroke-width=".04" opacity=".9"/></g>`, true);
    case 'coin': return g(`<circle cx=".1" r=".07" fill="#d9b45a" ${o}/>`);
    case 'driptorch': {   // red fuel canister + loop handle, angled spout with wick (flame when lit)
      const lit = op?.torchLit ?? 0, ang = op?.heldAng ?? 0, fk = Math.sin((op?.t ?? 0) * 31) * .04, fl = lit > 0 ? `<g transform="translate(.8 .56) scale(${n(lit)})">${[[.16, .52, '#e5401c'], [.12, .4, '#ff8a2a'], [.07, .26, '#ffe27a']].map(([w, h, c]) => `<path d="M0 .04 C${n(-(w as number) * 1.2)} 0 ${n(-(w as number))} ${n(-(h as number) * .55)} ${n(fk)} ${n(-(h as number) - fk)} C${n(w as number)} ${n(-(h as number) * .55)} ${n((w as number) * 1.2)} 0 0 .04Z" fill="${c}" opacity=".92"/>`).join('')}</g>` : '';
      return g(`<g transform="rotate(${n(-rot + ang)})"><path d="M-.12 .05 L.42 .05 L.4 .72 L-.1 .72Z" fill="#c8272a" ${o}/><path d="M-.1 .2 H.4 M-.1 .58 H.4" stroke="#8a1a1c" stroke-width=".03"/><path d="M.0 .05 Q.15 -.22 .3 .05" fill="none" stroke="${OUT}" stroke-width=".07"/><path d="M.0 .05 Q.15 -.22 .3 .05" fill="none" stroke="#9aa0a6" stroke-width=".035"/>` +
        `<path d="M.38 .2 L.72 .52 L.8 .56" fill="none" stroke="${OUT}" stroke-width=".085" stroke-linecap="round"/><path d="M.38 .2 L.72 .52 L.8 .56" fill="none" stroke="#b8bec4" stroke-width=".045" stroke-linecap="round"/><circle cx=".78" cy=".55" r=".035" fill="#3a2a1a"/><path d="M.08 .32 h.14 l-.07 .13z" fill="#ffd25a" stroke="#1a1a1a" stroke-width=".015"/>${fl}</g>`, true);
    }
    case 'fusee': return g(`<path d="M-.02 -.02 L.38 -.08 L.39 .0 L-.01 .06Z" fill="#d6262a" ${o}/><circle cx=".4" cy="-.04" r="${n(.05 + .02 * Math.sin((op?.t ?? 0) * 40))}" fill="#ffb0a0"/><circle cx=".4" cy="-.04" r=".03" fill="#fff"/>`);
    case 'radio': return g(`<path d="M-.05 -.25 h.16 v.34 h-.16z" fill="#2a2a2a" ${o}/><path d="M.08 -.25 v-.18" stroke="${OUT}" stroke-width=".035"/>`, true);
    case 'glass': return g(`<path d="M.02 -.3 h.16 l-.02 .25 h-.12z" fill="rgba(240,220,160,.75)" ${o}/>`, true);
  }
  return '';
}

function shoeSvg(ank: V2, facing: number, L: ToonLook, dress: boolean): string {
  const at = Math.abs(facing), lenS = mix(.34, .52, at), h = dress ? .13 : .18, toe = facing * .17;
  const x0 = ank[0] + toe - lenS / 2, y = ank[1] + .02;
  const col = L.shoes;
  if (L.boots) {   // laced leather fire boots: tall shaft, lug sole
    const top = y - .62, bw = .17;
    return `<path d="M${n(ank[0] - bw)} ${n(top)} L${n(ank[0] + bw)} ${n(top)} L${n(ank[0] + bw + facing * .05)} ${n(y - h * .3)} L${n(x0 + lenS + .05)} ${n(y - h * .2)} Q${n(x0 + lenS + .1)} ${n(y + h * .2)} ${n(x0 + lenS + .04)} ${n(y + h * .6)} L${n(x0 - .04)} ${n(y + h * .6)} Q${n(x0 - .07)} ${n(y)} ${n(ank[0] - bw)} ${n(y - h * .4)}Z" fill="${col}" ${ol(.045)}/>` +
      `<path d="M${n(x0 - .04)} ${n(y + h * .45)} H${n(x0 + lenS + .04)}" stroke="#111" stroke-width=".09"/>` + [0, 1, 2, 3].map(k => `<path d="M${n(ank[0] - bw * .55)} ${n(top + .08 + k * .1)} L${n(ank[0] + bw * .55)} ${n(top + .13 + k * .1)}" stroke="${shade(col, 1.6)}" stroke-width=".022"/>`).join('') +
      `<path d="M${n(ank[0] - bw)} ${n(top)} L${n(ank[0] + bw)} ${n(top)}" stroke="${shade(col, .6)}" stroke-width=".05"/><ellipse cx="${n(x0 + lenS * (facing >= 0 ? .78 : .22))}" cy="${n(y - h * .05)}" rx=".06" ry=".025" fill="#fff" opacity=".35"/>`;
  }
  let s = `<path d="M${n(x0)} ${n(y + h * .55)} Q${n(x0 - .02)} ${n(y - h * .3)} ${n(x0 + lenS * .45)} ${n(y - h * .5)} Q${n(x0 + lenS + .03)} ${n(y - h * .3)} ${n(x0 + lenS)} ${n(y + h * .55)} Z" fill="${col}" ${ol(.04)}/>`;
  s += `<path d="M${n(x0 + .02)} ${n(y + h * .45)} H${n(x0 + lenS - .02)}" stroke="${shade(col, .5)}" stroke-width=".04"/>`;
  s += `<ellipse cx="${n(x0 + lenS * (facing >= 0 ? .7 : .3))}" cy="${n(y - h * .15)}" rx=".05" ry=".022" fill="#fff" opacity=".45"/>`;
  if (L.spats) s += `<path d="M${n(ank[0] - .15)} ${n(y - h * .1)} Q${n(ank[0])} ${n(y - h * .9)} ${n(ank[0] + .15 + toe * .3)} ${n(y - h * .1)} L${n(ank[0] + .13)} ${n(y - .3)} L${n(ank[0] - .13)} ${n(y - .3)}Z" fill="#ece6d6" ${ol(.03)}/>`;
  return s;
}

/** Head in head-local units (radius ~.5, y down), features follow the face turn. */
function headSvg(L: ToonLook, F: Face, turn: number, lid: number, back: boolean, id: string, hatOff: number): string {
  const at = Math.abs(turn), sx = Math.sign(turn) || 1;
  const w = L.headW * .5, h = L.headH * .5, jaw = L.jaw;
  const skin = L.skin, skD = shade(skin, .82);
  const o = ol();
  // skull + jaw outline (chin shifts toward the facing side)
  const chinX = turn * .12, jw = w * mix(.55, .95, jaw);
  const shape = `M${n(-w)} ${n(-h * .1)} Q${n(-w)} ${n(-h)} 0 ${n(-h)} Q${n(w)} ${n(-h)} ${n(w)} ${n(-h * .1)} Q${n(w * 1.02)} ${n(h * .45)} ${n(jw + chinX * .5)} ${n(h * .78)} Q${n(chinX + jw * .4)} ${n(h * 1.02)} ${n(chinX)} ${n(h * 1.0)} Q${n(chinX - jw * .4)} ${n(h * 1.02)} ${n(-jw + chinX * .5)} ${n(h * .78)} Q${n(-w * 1.02)} ${n(h * .45)} ${n(-w)} ${n(-h * .1)}Z`;
  let s = '';
  // ears (near side when turned, both when frontal)
  const ear = (side: number) => { const ex = side * w * (1 - at * .35) - turn * .18 * (side === sx ? 1 : 0); return `<path d="M${n(ex)} ${n(-h * .18)} q${n(side * .14)} ${n(-.04)} ${n(side * .12)} .14 q${n(-side * .02)} .1 ${n(-side * .12)} .07" fill="${skin}" ${ol(.035)}/><path d="M${n(ex + side * .03)} ${n(-h * .1)} q${n(side * .05)} .01 .0 .08" stroke="${skD}" stroke-width=".02" fill="none"/>`; };
  if (!back) { if (at < .6) { s += ear(-1) + ear(1); } else s += ear(-sx); } else s += ear(-1) + ear(1);
  s += `<clipPath id="${id}h"><path d="${shape}"/></clipPath><path d="${shape}" fill="${skin}"/>`;
  s += `<g clip-path="url(#${id}h)"><path d="M${n(w * .3)} ${n(-h * 1.2)} Q${n(w * 1.4)} 0 ${n(w * .2)} ${n(h * 1.3)} L${n(w * 1.5)} ${n(h * 1.3)} L${n(w * 1.5)} ${n(-h * 1.2)}Z" fill="${skD}" opacity=".45"/>`;
  if (L.beard === 'chops') for (const sd of [-1, 1]) s += `<path d="M${n(sd * w * 1.1)} ${n(-h * .2)} L${n(sd * w * .72)} ${n(-h * .2)} Q${n(sd * w * .55)} ${n(h * .35)} ${n(sd * w * .42 + chinX * .4)} ${n(h * .62)} Q${n(sd * w * .7)} ${n(h * .78)} ${n(sd * w * 1.1)} ${n(h * .6)}Z" fill="${L.facial ?? L.hair}"/>`;
  if (L.beard === 'full') s += `<path d="M${n(-w * 1.1)} ${n(-h * .1)} L${n(-w * .7)} ${n(-h * .05)} Q${n(-w * .55)} ${n(h * .6)} ${n(chinX)} ${n(h * (L.beard === 'full' ? .55 : .9))} Q${n(w * .55)} ${n(h * .6)} ${n(w * .7)} ${n(-h * .05)} L${n(w * 1.1)} ${n(-h * .1)} L${n(w * 1.1)} ${n(h * 1.2)} L${n(-w * 1.1)} ${n(h * 1.2)}Z" fill="${L.facial ?? L.hair}" opacity="${L.beard === 'full' ? 1 : .95}"/>`;
  if (L.stubble && !back) s += `<path d="M${n(-w * 1.1)} ${n(h * .25)} Q${n(-w * .6)} ${n(h * .2)} ${n(chinX)} ${n(h * .32)} Q${n(w * .6)} ${n(h * .2)} ${n(w * 1.1)} ${n(h * .25)} L${n(w * 1.1)} ${n(h * 1.2)} L${n(-w * 1.1)} ${n(h * 1.2)}Z" fill="${L.stubble}" opacity=".22"/>`;
  s += `</g><path d="${shape}" fill="none" ${o}/>`;
  if (L.freckles && !back) for (const sd of [-1, 1]) for (let i = 0; i < 4; i++) s += `<circle cx="${n(turn * w * .55 + sd * (.22 + (i % 2) * .08) * (1 - Math.abs(turn) * .45))}" cy="${n(h * (.18 + Math.floor(i / 2) * .07))}" r=".016" fill="${shade(L.skin, .62)}"/>`;
  if (L.beard === 'goatee' && !back) s += `<path d="M${n(chinX - .07)} ${n(h * .82)} Q${n(chinX)} ${n(h * 1.25)} ${n(chinX + .07)} ${n(h * .82)}Z" fill="${L.facial ?? L.hair}" ${ol(.03)}/>`;
  if (!back) {
    s += faceSvg(L, F, turn, lid, id, w, h);
  }
  if (L.braid && (back || Math.abs(turn) > .25)) { const bxp = back ? 0 : -sx * w * .82; for (let i = 0; i < 6; i++) s += `<ellipse cx="${n(bxp + Math.sin(i * 1.3) * .015)}" cy="${n(h * (.45 + i * .17))}" rx="${n(.085 - i * .006)}" ry=".1" fill="${L.hair}" ${ol(.025)}/>`; s += `<circle cx="${n(bxp)}" cy="${n(h * 1.5)}" r=".045" fill="#c8272a" ${ol(.02)}/>`; }
  s += hairSvg(L, turn, back, w, h);
  s += hatSvg(L, turn, back, w, h, hatOff);
  if (L.earring && !back && at < .7) s += [-1, 1].map(sd => `<circle cx="${n(sd * w * .98)}" cy="${n(h * .12)}" r=".035" fill="${L.earring}" ${ol(.015)}/>`).join('');
  return s;
}

function faceSvg(L: ToonLook, F: Face, turn: number, lid: number, id: string, w: number, h: number): string {
  const s: string[] = [];
  const at = Math.abs(turn), sx = Math.sign(turn) || 1;
  const cx = turn * w * .55, squash = 1 - at * .45;
  const eyeY = -h * .08 + F.gy * .015;
  const open = clamp(F.eyeOpen * (1 - lid), 0, 1.5);
  for (const side of [-1, 1]) {
    const farS = side === -sx && at > .05;
    if (farS && at > .8) continue;
    const scale = farS ? 1 - at * .4 : 1 + at * .05;
    const ex = cx + side * .16 * squash, ey = eyeY;
    const es = L.adv ? 1.32 : 1; const rx = .085 * es * scale * (1 - at * .2), ry = (.1 * Math.min(1.25, open) + .005) * es;
    // brows: always drawn, thick
    const one = (F.browOne ?? 0) * (side > 0 ? 1 : -.35);
    const by = ey - .16 * (L.adv ? 1.25 : 1) - (F.browY + one) * .065 + F.lidTop * .02;
    const tilt = F.browAng * .4 * side;
    const bl = .1 * scale;
    const iy = (x: number) => by + (x - ex) * Math.tan(tilt);
    const browCol = L.facial ?? (L.hairStyle === 'bald' ? shade(L.skin, .55) : L.hair);
    s.push(`<path d="M${n(ex - bl)} ${n(iy(ex - bl))} Q${n(ex)} ${n(by - .04)} ${n(ex + bl)} ${n(iy(ex + bl))}" fill="none" stroke="${shade(browCol, .7)}" stroke-width=".055" stroke-linecap="round"/>`);
    if (F.happyEyes > .5 || open < .12) {
      const up = F.happyEyes > .5 ? -1 : .4;
      s.push(`<path d="M${n(ex - rx * 1.2)} ${n(ey + .01)} Q${n(ex)} ${n(ey + up * .07)} ${n(ex + rx * 1.2)} ${n(ey + .01)}" fill="none" ${ol(.04)}/>`);
      continue;
    }
    const clip = `${id}e${side}`;
    const cutY = ey - ry + F.lidTop * ry * 1.1, lowY = ey + ry - F.lidLow * ry * .8;
    s.push(`<clipPath id="${clip}"><path d="M${n(ex - .2)} ${n(cutY - Math.tan(tilt) * .2)} L${n(ex + .2)} ${n(cutY + Math.tan(tilt) * .2)} L${n(ex + .2)} ${n(lowY)} Q${n(ex)} ${n(lowY + .01)} ${n(ex - .2)} ${n(lowY)}Z"/></clipPath>`);
    const pr = (F.eyeWhite > .5 ? .028 + F.pupil * .02 : .045) * scale * es;
    const gx = clamp(F.gx, -1, 1) * rx * .45 + turn * rx * .35, gy = F.gy * ry * .3;
    s.push(`<g clip-path="url(#${clip})"><ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(rx)}" ry="${n(ry)}" fill="#fffdf6"/>` +
      `<circle cx="${n(ex + gx)}" cy="${n(ey + gy)}" r="${n(pr * 1.35)}" fill="#5a3b26"/><circle cx="${n(ex + gx)}" cy="${n(ey + gy)}" r="${n(pr * .8)}" fill="${OUT}"/>` +
      `<circle cx="${n(ex + gx - pr * .5)}" cy="${n(ey + gy - pr * .55)}" r="${n(pr * .38)}" fill="#fff"/>` +
      `<path d="M${n(ex - .2)} ${n(cutY - Math.tan(tilt) * .2 - .1)} L${n(ex + .2)} ${n(cutY + Math.tan(tilt) * .2 - .1)} L${n(ex + .2)} ${n(cutY + Math.tan(tilt) * .2 + .012)} L${n(ex - .2)} ${n(cutY - Math.tan(tilt) * .2 + .012)}Z" fill="${shade(L.skin, .85)}"/></g>`);
    s.push(`<ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(rx)}" ry="${n(ry)}" fill="none" stroke="${OUT}" stroke-width=".022"/>`);
    // heavy upper lid line
    s.push(`<path d="M${n(ex - rx * 1.15)} ${n(Math.max(cutY, ey - ry) + .01)} Q${n(ex)} ${n(Math.max(cutY, ey - ry) - .035)} ${n(ex + rx * 1.15)} ${n(Math.max(cutY, ey - ry) + .01)}" fill="none" ${ol(.042)}/>`);
    if (L.lashes) s.push(`<path d="M${n(ex + side * rx * 1.1)} ${n(ey - ry * .7)} l${n(side * .05)} -.04" ${ol(.025)}/>`);
    if (F.tears > .05) s.push(`<path d="M${n(ex)} ${n(ey + ry * .8)} q-.02 ${n(.12 * F.tears)} 0 ${n(.24 * F.tears)} q.025 -.1 0 ${n(-.24 * F.tears)}" fill="#8fcff5" stroke="#2b6ea3" stroke-width=".02"/>`);
    if (L.glasses === 'round' || L.glasses === 'pince') s.push(`<circle cx="${n(ex)}" cy="${n(ey)}" r="${n(.13 * scale * (L.glasses === 'pince' ? .85 : 1))}" fill="rgba(220,235,245,.18)" stroke="${L.glasses === 'pince' ? '#c9a24a' : '#2a2018'}" stroke-width=".03"/>`);
    if (L.glasses === 'monocle' && side === 1 && !farS) s.push(`<circle cx="${n(ex)}" cy="${n(ey)}" r=".13" fill="rgba(220,235,245,.22)" stroke="#c9a24a" stroke-width=".03"/><path d="M${n(ex + .1)} ${n(ey + .1)} q.15 .3 .05 .7" stroke="#c9a24a" stroke-width=".012" fill="none"/>`);
  }
  if (L.glasses === 'round' || L.glasses === 'pince') { const e = (sd: number) => cx + sd * .16 * squash; s.push(`<path d="M${n(e(-1) + .12)} ${n(eyeY - .02)} Q${n(cx)} ${n(eyeY - .06)} ${n(e(1) - .12)} ${n(eyeY - .02)}" stroke="${L.glasses === 'pince' ? '#c9a24a' : '#2a2018'}" stroke-width=".025" fill="none"/>`); }
  // nose (profile-aware)
  const nx = cx + turn * .12, ny = h * .2;
  const nd = shade(L.skin, .7);
  switch (L.nose) {
    case 'bulb': s.push(`<ellipse cx="${n(nx + turn * .05)}" cy="${n(ny)}" rx=".085" ry=".075" fill="${shade(L.skin, 1.02)}" ${ol(.03)}/><ellipse cx="${n(nx + turn * .05 - .02)}" cy="${n(ny - .02)}" rx=".025" ry=".018" fill="#fff" opacity=".5"/>`); break;
    case 'button': s.push(`<path d="M${n(nx - .04)} ${n(ny + .02)} q${n(.04 + turn * .05)} .05 .08 0" ${ol(.03)} fill="none"/>`); break;
    case 'hook': s.push(`<path d="M${n(nx - turn * .02)} ${n(ny - .17)} Q${n(nx + turn * .14 + sx * .03)} ${n(ny - .02)} ${n(nx + turn * .08)} ${n(ny + .05)} Q${n(nx)} ${n(ny + .05)} ${n(nx - sx * .04)} ${n(ny + .02)}" fill="${L.skin}" ${ol(.03)}/>`); break;
    case 'long': s.push(`<path d="M${n(nx - turn * .03)} ${n(ny - .2)} L${n(nx + turn * .14 + sx * .02)} ${n(ny + .04)} Q${n(nx + turn * .05)} ${n(ny + .07)} ${n(nx - sx * .03)} ${n(ny + .03)}" fill="${L.skin}" ${ol(.03)}/>`); break;
    default: s.push(`<path d="M${n(nx - turn * .02)} ${n(ny - .15)} L${n(nx + turn * .09 + sx * .015)} ${n(ny + .03)} Q${n(nx + turn * .03)} ${n(ny + .06)} ${n(nx - sx * .035)} ${n(ny + .03)}" fill="none" ${ol(.032)}/>`);
  }
  if (at < .9) s.push(`<path d="M${n(nx + .06)} ${n(ny + .06)} q.02 -.01 .03 -.03" stroke="${nd}" stroke-width=".02" fill="none" opacity=".7"/>`);
  // cheeks
  if (F.blush > .02 || L.lips) for (const side of [-1, 1]) s.push(`<ellipse cx="${n(cx + side * .28 * squash)}" cy="${n(h * .3)}" rx=".07" ry=".035" fill="#e88a7a" opacity="${n(Math.max(F.blush * .7, L.lips ? .35 : 0))}"/>`);
  // mouth
  const mx = cx + turn * .06, my = h * (L.stache === 'walrus' ? .66 : .55);
  const w0 = .13 * F.mWide * (1 - at * .4);
  const mw = mix(w0, .05 + F.mOpen * .02, F.mO);
  const cy = my - F.smile * .045;
  const sk = F.smirk ?? 0, cyL = cy + sk * .03, cyR = cy - sk * .045;
  const op = F.mOpen;
  const lipC = L.lips ?? OUT;
  if (op < .06) {
    s.push(`<path d="M${n(mx - mw)} ${n(cyL)} Q${n(mx + sk * .02)} ${n(my + F.smile * .06)} ${n(mx + mw)} ${n(cyR)}" fill="none" stroke="${L.lips ? lipC : OUT}" stroke-width="${L.lips ? .05 : .035}" stroke-linecap="round"/>`);
    if (F.smile > .3 || Math.abs(sk) > .3) for (const sd of [-1, 1]) { if (sk && Math.sign(sk) !== sd && Math.abs(sk) > .3) continue; const ex2 = mx + sd * mw, ey2 = sd < 0 ? cyL : cyR; s.push(`<path d="M${n(ex2 - sd * .015)} ${n(ey2 - .03)} q${n(sd * .03)} .02 ${n(sd * .015)} .05" fill="none" stroke="${OUT}" stroke-width=".02" stroke-linecap="round"/>`); }
  } else {
    const up = my - op * .02 - F.mO * op * .06 + Math.max(0, F.smile) * .012;
    const lo = my + op * .16 + F.smile * .05 + F.mO * op * .025;
    const path = `M${n(mx - mw)} ${n(cyL)} Q${n(mx)} ${n(up)} ${n(mx + mw)} ${n(cyR)} Q${n(mx)} ${n(lo)} ${n(mx - mw)} ${n(cyL)}Z`;
    s.push(`<clipPath id="${id}m"><path d="${path}"/></clipPath><path d="${path}" fill="#6e1a1c"/><g clip-path="url(#${id}m)">`);
    if (F.teeth < .85) s.push(`<ellipse cx="${n(mx + mw * .1)}" cy="${n(lo + .01)}" rx="${n(mw * .7)}" ry="${n(.04 + op * .035)}" fill="#d9555c"/>`);
    if (F.teeth > .02) s.push(`<rect x="${n(mx - mw)}" y="${n(up - .05)}" width="${n(mw * 2)}" height="${n(.05 + Math.min(F.teeth, .85) * .05)}" fill="#fffdf4"/>`);
    s.push(`</g><path d="${path}" fill="none" stroke="${L.lips ?? OUT}" stroke-width="${L.lips ? .045 : .035}" stroke-linejoin="round"/>`);
  }
  // moustache over the mouth
  const mc = L.facial ?? L.hair, mo = ol(.028);
  const sw = .2 * (1 - at * .35);
  switch (L.stache) {
    case 'pencil': s.push(`<path d="M${n(mx - sw * .75)} ${n(my - .05)} Q${n(mx - sw * .3)} ${n(my - .1)} ${n(mx)} ${n(my - .075)} Q${n(mx + sw * .3)} ${n(my - .1)} ${n(mx + sw * .75)} ${n(my - .05)}" stroke="${mc}" stroke-width=".035" fill="none" stroke-linecap="round"/>`); break;
    case 'walrus': s.push(`<path d="M${n(mx - sw * 1.05)} ${n(my - .02)} Q${n(mx - sw)} ${n(my - .14)} ${n(mx)} ${n(my - .11)} Q${n(mx + sw)} ${n(my - .14)} ${n(mx + sw * 1.05)} ${n(my - .02)} Q${n(mx + sw * .5)} ${n(my - .06)} ${n(mx)} ${n(my - .06)} Q${n(mx - sw * .5)} ${n(my - .06)} ${n(mx - sw * 1.05)} ${n(my - .02)}Z" fill="${mc}" ${mo}/>`); break;
    case 'handlebar': s.push(`<path d="M${n(mx)} ${n(my - .1)} Q${n(mx - sw * .8)} ${n(my - .12)} ${n(mx - sw * 1.1)} ${n(my - .06)} Q${n(mx - sw * 1.4)} ${n(my - .12)} ${n(mx - sw * 1.25)} ${n(my - .17)} Q${n(mx - sw * 1.2)} ${n(my - .02)} ${n(mx - sw * .5)} ${n(my - .04)} Q${n(mx)} ${n(my - .05)} ${n(mx + sw * .5)} ${n(my - .04)} Q${n(mx + sw * 1.2)} ${n(my - .02)} ${n(mx + sw * 1.25)} ${n(my - .17)} Q${n(mx + sw * 1.4)} ${n(my - .12)} ${n(mx + sw * 1.1)} ${n(my - .06)} Q${n(mx + sw * .8)} ${n(my - .12)} ${n(mx)} ${n(my - .1)}Z" fill="${mc}" ${mo}/>`); break;
    case 'brush': s.push(`<path d="M${n(mx - sw * .55)} ${n(my - .03)} Q${n(mx - sw * .55)} ${n(my - .13)} ${n(mx)} ${n(my - .12)} Q${n(mx + sw * .55)} ${n(my - .13)} ${n(mx + sw * .55)} ${n(my - .03)}Z" fill="${mc}" ${mo}/>`); break;
  }
  // emanata
  if (F.sweat > .05) { const k = F.sweat, x = -sx * w * .85, y = -h * .45; s.push(`<path d="M${n(x)} ${n(y - .09 * k)} C${n(x + .05 * k)} ${n(y)} ${n(x + .045 * k)} ${n(y + .06 * k)} ${n(x)} ${n(y + .06 * k)} C${n(x - .045 * k)} ${n(y + .06 * k)} ${n(x - .05 * k)} ${n(y)} ${n(x)} ${n(y - .09 * k)}Z" fill="#a8dcf7" stroke="#1d5f8f" stroke-width=".025"/>`); }
  if (F.shock > .05) for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 - sx * (.4 + i * .32), r0 = h * 1.25, r1 = r0 + .17 * F.shock; s.push(`<path d="M${n(Math.cos(a) * r0)} ${n(Math.sin(a) * r0)}L${n(Math.cos(a) * r1)} ${n(Math.sin(a) * r1)}" ${ol(.05)} opacity="${n(clamp(F.shock * 1.5))}"/>`); }
  return s.join('');
}

function hairSvg(L: ToonLook, turn: number, back: boolean, w: number, h: number): string {
  const col = L.hair, dk = shade(col, .65), lt = shade(col, 1.6), o = ol(.04), k = turn * .2;
  const hatOn = !!L.hat;
  if (back && L.hairStyle !== 'slick' && L.hairStyle !== 'none') return `<path d="M${n(-w * 1.02)} ${n(h * .55)} Q${n(-w * 1.1)} ${n(-h * 1.1)} 0 ${n(-h * 1.08)} Q${n(w * 1.1)} ${n(-h * 1.1)} ${n(w * 1.02)} ${n(h * .55)} Q0 ${n(h * .9)} ${n(-w * 1.02)} ${n(h * .55)}Z" fill="${L.hairStyle === 'bald' || L.hairStyle === 'side' ? shade(L.skin, .92) : col}" ${o}/>` + (L.hairStyle === 'bald' || L.hairStyle === 'side' ? `<path d="M${n(-w * 1.0)} ${n(h * .15)} Q${n(-w * .9)} ${n(h * .75)} 0 ${n(h * .88)} Q${n(w * .9)} ${n(h * .75)} ${n(w * 1.0)} ${n(h * .15)} Q0 ${n(h * .5)} ${n(-w * 1.0)} ${n(h * .15)}Z" fill="${col}"/>` : '');
  switch (L.hairStyle) {
    case 'slick': {
      if (back) return `<path d="M${n(-w * 1.02)} ${n(h * .6)} Q${n(-w * 1.1)} ${n(-h * 1.1)} 0 ${n(-h * 1.08)} Q${n(w * 1.1)} ${n(-h * 1.1)} ${n(w * 1.02)} ${n(h * .6)} Q0 ${n(h * .95)} ${n(-w * 1.02)} ${n(h * .6)}Z" fill="${col}" ${o}/><path d="M${n(-w * .3)} ${n(-h * .2)} Q0 ${n(h * .2)} ${n(w * .25)} ${n(h * .6)}" stroke="${lt}" stroke-width=".03" fill="none" opacity=".5"/>`;
      return `<path d="M${n(-w * 1.0)} ${n(-h * .34)} Q${n(-w * 1.08)} ${n(-h * 1.08)} ${n(k)} ${n(-h * 1.1)} Q${n(w * 1.1)} ${n(-h * 1.05)} ${n(w * 1.0)} ${n(-h * .34)} Q${n(w * .95)} ${n(-h * .55)} ${n(w * .4 + k)} ${n(-h * .66)} L${n(-w * .25 + k)} ${n(-h * .7)} Q${n(-w * .85)} ${n(-h * .6)} ${n(-w * 1.0)} ${n(-h * .34)}Z" fill="${col}" ${o}/>` +
        `<path d="M${n(-w * .3 + k)} ${n(-h * .72)} Q${n(-w * .3 + k)} ${n(-h * 1.0)} ${n(w * .3 + k)} ${n(-h * 1.0)} M${n(-w * .6 + k * .5)} ${n(-h * .55)} Q${n(-w * .55 + k)} ${n(-h * .95)} ${n(k)} ${n(-h * 1.06)}" stroke="${lt}" stroke-width=".03" fill="none" opacity=".7"/>` +
        `<path d="M${n(-w * .25 + k)} ${n(-h * .7)} L${n(-w * .28 + k)} ${n(-h * 1.02)}" stroke="${dk}" stroke-width=".02"/>`;
    }
    case 'side': case 'bald': {
      const tufts = [-1, 1].filter(sd => !(sd === (Math.sign(turn) || 1) * -1 && Math.abs(turn) > .7)).map(sd => `<path d="M${n(sd * w * 1.02)} ${n(h * .1)} Q${n(sd * w * 1.12)} ${n(-h * .45)} ${n(sd * w * .75)} ${n(-h * .7)} Q${n(sd * w * .8)} ${n(-h * .3)} ${n(sd * w * .8)} ${n(h * .12)}Z" fill="${col}" ${o}/>`).join('');
      const sweep = L.hairStyle === 'side' && !hatOn ? `<path d="M${n(-w * .7 + k)} ${n(-h * .78)} Q${n(k)} ${n(-h * 1.08)} ${n(w * .75 + k)} ${n(-h * .7)}" stroke="${col}" stroke-width=".04" fill="none" stroke-linecap="round"/><path d="M${n(-w * .5 + k)} ${n(-h * .86)} Q${n(k)} ${n(-h * 1.04)} ${n(w * .55 + k)} ${n(-h * .8)}" stroke="${col}" stroke-width=".03" fill="none"/>` : '';
      const shine = `<ellipse cx="${n(-w * .3 + k)}" cy="${n(-h * .75)}" rx=".1" ry=".05" fill="#fff" opacity=".35"/>`;
      return tufts + sweep + (L.hairStyle === 'bald' && !hatOn ? shine : '');
    }
    case 'wavy': return `<path d="M${n(-w * 1.04)} ${n(-h * .0)} Q${n(-w * 1.15)} ${n(-h * 1.1)} ${n(k)} ${n(-h * 1.12)} Q${n(w * 1.15)} ${n(-h * 1.1)} ${n(w * 1.04)} ${n(-h * .0)} Q${n(w * .9)} ${n(-h * .55)} ${n(w * .5 + k)} ${n(-h * .55)} Q${n(w * .2 + k)} ${n(-h * .75)} ${n(-w * .1 + k)} ${n(-h * .58)} Q${n(-w * .45 + k)} ${n(-h * .75)} ${n(-w * .75)} ${n(-h * .5)} Q${n(-w * .95)} ${n(-h * .4)} ${n(-w * 1.04)} 0Z" fill="${col}" ${o}/>`;
    case 'crop': return `<path d="M${n(-w * 1.02)} ${n(-h * .05)} Q${n(-w * 1.06)} ${n(-h * 1.04)} ${n(k)} ${n(-h * 1.06)} Q${n(w * 1.06)} ${n(-h * 1.04)} ${n(w * 1.02)} ${n(-h * .05)} Q${n(w * .9)} ${n(-h * .62)} ${n(k)} ${n(-h * .7)} Q${n(-w * .9)} ${n(-h * .62)} ${n(-w * 1.02)} ${n(-h * .05)}Z" fill="${col}" ${o}/>`;
    case 'bob': return `<path d="M${n(-w * 1.12)} ${n(h * .5)} Q${n(-w * 1.25)} ${n(-h * 1.1)} ${n(k)} ${n(-h * 1.1)} Q${n(w * 1.25)} ${n(-h * 1.1)} ${n(w * 1.12)} ${n(h * .5)} L${n(w * .82)} ${n(h * .45)} Q${n(w * .9)} ${n(-h * .4)} ${n(w * .1 + k)} ${n(-h * .6)} Q${n(-w * .5 + k)} ${n(-h * .35)} ${n(-w * .82)} ${n(-h * .2)} L${n(-w * .82)} ${n(h * .45)}Z" fill="${col}" ${o}/>`;
  }
  return '';
}

function hatSvg(L: ToonLook, turn: number, back: boolean, w: number, h: number, off: number): string {
  if (!L.hat || off >= 1) return '';
  const H = L.hat, c = H.color, d = shade(c, .7), lt = shade(c, 1.35), o = ol(), k = turn * .08;
  const lift = off * .28, tilt = off * -14;
  const y0 = -h * .55 - lift;
  let s = '';
  switch (H.kind) {
    case 'top':
      s = `<path d="M${n(-w * .82 + k)} ${n(y0)} L${n(-w * .78 + k)} ${n(y0 - .82)} Q${n(k)} ${n(y0 - .88)} ${n(w * .78 + k)} ${n(y0 - .82)} L${n(w * .82 + k)} ${n(y0)}Z" fill="${c}" ${o}/>` +
        `<path d="M${n(-w * .82 + k)} ${n(y0 - .14)} L${n(w * .82 + k)} ${n(y0 - .14)} L${n(w * .82 + k)} ${n(y0 - .02)} L${n(-w * .82 + k)} ${n(y0 - .02)}Z" fill="${H.band ?? d}"/>` +
        `<path d="M${n(-w * .4 + k)} ${n(y0 - .75)} L${n(-w * .45 + k)} ${n(y0 - .2)}" stroke="${lt}" stroke-width=".05" opacity=".6"/>` +
        `<path d="M${n(-w * 1.25)} ${n(y0 + .04)} Q${n(k)} ${n(y0 + .16)} ${n(w * 1.25)} ${n(y0 + .04)} Q${n(w * 1.2)} ${n(y0 - .06)} ${n(w * .8)} ${n(y0 - .02)} L${n(-w * .8)} ${n(y0 - .02)} Q${n(-w * 1.2)} ${n(y0 - .06)} ${n(-w * 1.25)} ${n(y0 + .04)}Z" fill="${c}" ${o}/>`;
      break;
    case 'bowler':
      s = `<path d="M${n(-w * .9 + k)} ${n(y0 + .02)} Q${n(-w * .95 + k)} ${n(y0 - .62)} ${n(k)} ${n(y0 - .64)} Q${n(w * .95 + k)} ${n(y0 - .62)} ${n(w * .9 + k)} ${n(y0 + .02)}Z" fill="${c}" ${o}/>` +
        `<path d="M${n(-w * .9 + k)} ${n(y0 - .1)} H${n(w * .9 + k)}" stroke="${H.band ?? d}" stroke-width=".1"/><path d="M${n(-w * .45 + k)} ${n(y0 - .5)} Q${n(-w * .1 + k)} ${n(y0 - .6)} ${n(w * .1 + k)} ${n(y0 - .55)}" stroke="${lt}" stroke-width=".04" fill="none" opacity=".6"/>` +
        `<path d="M${n(-w * 1.2)} ${n(y0 - .02)} Q${n(k)} ${n(y0 + .14)} ${n(w * 1.2)} ${n(y0 - .02)} Q${n(w * 1.25)} ${n(y0 - .1)} ${n(w * 1.12)} ${n(y0 - .08)} Q${n(k)} ${n(y0 + .02)} ${n(-w * 1.12)} ${n(y0 - .08)} Q${n(-w * 1.25)} ${n(y0 - .1)} ${n(-w * 1.2)} ${n(y0 - .02)}Z" fill="${c}" ${o}/>`;
      break;
    case 'fedora':
      s = `<path d="M${n(-w * .88 + k)} ${n(y0 + .02)} L${n(-w * .82 + k)} ${n(y0 - .48)} Q${n(-w * .3 + k)} ${n(y0 - .66)} ${n(k)} ${n(y0 - .5)} Q${n(w * .3 + k)} ${n(y0 - .66)} ${n(w * .82 + k)} ${n(y0 - .48)} L${n(w * .88 + k)} ${n(y0 + .02)}Z" fill="${c}" ${o}/>` +
        `<path d="M${n(k)} ${n(y0 - .5)} L${n(k)} ${n(y0 - .25)}" stroke="${d}" stroke-width=".03"/>` +
        `<path d="M${n(-w * .88 + k)} ${n(y0 - .12)} H${n(w * .88 + k)}" stroke="${H.band ?? d}" stroke-width=".12"/>` +
        `<path d="M${n(-w * 1.35)} ${n(y0 + .1)} Q${n(-w * .6)} ${n(y0 - .06)} ${n(k)} ${n(y0 - .02)} Q${n(w * .6)} ${n(y0 - .06)} ${n(w * 1.35)} ${n(y0 + .1)} Q${n(w * 1.3)} ${n(y0 + .02)} ${n(w * .9)} ${n(y0 + .0)} Q${n(k)} ${n(y0 + .12)} ${n(-w * .9)} ${n(y0)} Q${n(-w * 1.3)} ${n(y0 + .02)} ${n(-w * 1.35)} ${n(y0 + .1)}Z" fill="${shade(c, .9)}" ${o}/>`;
      break;
    case 'kepi':
      s = `<path d="M${n(-w * .8 + k)} ${n(y0 + .02)} L${n(-w * .7 + k)} ${n(y0 - .5)} Q${n(k)} ${n(y0 - .55)} ${n(w * .7 + k)} ${n(y0 - .5)} L${n(w * .8 + k)} ${n(y0 + .02)}Z" fill="${c}" ${o}/>` +
        `<path d="M${n(-w * .78 + k)} ${n(y0 - .08)} H${n(w * .78 + k)}" stroke="${H.band ?? d}" stroke-width=".1"/><circle cx="${n(k * 2)}" cy="${n(y0 - .3)}" r=".05" fill="#e2b85a" ${ol(.015)}/>` +
        (back ? '' : `<path d="M${n(-w * .5 + k * 3)} ${n(y0 + .02)} Q${n(k * 4)} ${n(y0 + .2)} ${n(w * .55 + k * 3)} ${n(y0 + .02)}Z" fill="${OUT}"/>`);
      break;
    case 'cloche':
      s = `<path d="M${n(-w * 1.12)} ${n(-h * .05 - lift)} Q${n(-w * 1.2)} ${n(y0 - .55)} ${n(k)} ${n(y0 - .58)} Q${n(w * 1.2)} ${n(y0 - .55)} ${n(w * 1.12)} ${n(-h * .05 - lift)} Q${n(w * .8)} ${n(y0 + .1)} ${n(k)} ${n(y0 + .08)} Q${n(-w * .8)} ${n(y0 + .1)} ${n(-w * 1.12)} ${n(-h * .05 - lift)}Z" fill="${c}" ${o}/>` +
        `<path d="M${n(-w * 1.0)} ${n(y0 - .02)} Q${n(k)} ${n(y0 + .06)} ${n(w * 1.0)} ${n(y0 - .02)}" stroke="${H.band ?? d}" stroke-width=".09" fill="none"/><circle cx="${n(w * .7)}" cy="${n(y0 - .06)}" r=".07" fill="${H.band ?? d}" ${ol(.02)}/>`;
      break;
    case 'boater':
      s = `<path d="M${n(-w * .82 + k)} ${n(y0 + .02)} L${n(-w * .8 + k)} ${n(y0 - .32)} H${n(w * .8 + k)} L${n(w * .82 + k)} ${n(y0 + .02)}Z" fill="${c}" ${o}/><path d="M${n(-w * .82 + k)} ${n(y0 - .1)} H${n(w * .82 + k)}" stroke="${H.band ?? d}" stroke-width=".11"/>` +
        `<path d="M${n(-w * 1.3)} ${n(y0 + .02)} H${n(w * 1.3)}" ${ol(.13)}/><path d="M${n(-w * 1.3)} ${n(y0 + .02)} H${n(w * 1.3)}" stroke="${c}" stroke-width=".06"/>`;
      break;
    case 'cap':
      s = `<path d="M${n(-w * .85 + k)} ${n(y0 + .04)} L${n(-w * .8 + k)} ${n(y0 - .32)} H${n(w * .8 + k)} L${n(w * .85 + k)} ${n(y0 + .04)}Z" fill="${c}" ${o}/><path d="M${n(-w * .82 + k)} ${n(y0 - .06)} H${n(w * .82 + k)}" stroke="${H.band ?? d}" stroke-width=".06"/>` +
        (back ? '' : `<path d="M${n(-w * .55 + k * 3)} ${n(y0 + .04)} Q${n(k * 4)} ${n(y0 + .18)} ${n(w * .6 + k * 3)} ${n(y0 + .04)}Z" fill="${OUT}"/>`);
      break;
    case 'helmet': {   // wildland hard hat: dome, ridge, full brim, goggles on the front
      const d2 = shade(c, .78), yb = y0 + .1;
      s = `<path d="M${n(-w * 1.02 + k)} ${n(yb)} Q${n(-w * 1.05 + k)} ${n(yb - .78)} ${n(k * 1.5)} ${n(yb - .82)} Q${n(w * 1.05 + k)} ${n(yb - .78)} ${n(w * 1.02 + k)} ${n(yb)}Z" fill="${c}" ${o}/>` +
        `<path d="M${n(k * 1.5 - .06)} ${n(yb - .8)} Q${n(k * 2)} ${n(yb - .4)} ${n(k * 2 - .05)} ${n(yb - .04)} L${n(k * 2 + .07)} ${n(yb - .04)} Q${n(k * 2.1)} ${n(yb - .4)} ${n(k * 1.5 + .06)} ${n(yb - .8)}Z" fill="${d2}"/>` +
        `<path d="M${n(-w * .55 + k)} ${n(yb - .6)} Q${n(-w * .2 + k)} ${n(yb - .74)} ${n(w * .05 + k)} ${n(yb - .7)}" stroke="#fff" stroke-width=".05" fill="none" opacity=".45"/>` +
        `<path d="M${n(-w * 1.42)} ${n(yb + .03)} Q${n(k)} ${n(yb + .2)} ${n(w * 1.42)} ${n(yb + .03)} Q${n(w * 1.45)} ${n(yb - .06)} ${n(w * 1.25)} ${n(yb - .07)} Q${n(k)} ${n(yb + .05)} ${n(-w * 1.25)} ${n(yb - .07)} Q${n(-w * 1.45)} ${n(yb - .06)} ${n(-w * 1.42)} ${n(yb + .03)}Z" fill="${d2}" ${o}/>` +
        `<path d="M${n(-w * 1.0 + k)} ${n(yb - .2)} Q${n(k)} ${n(yb - .14)} ${n(w * 1.0 + k)} ${n(yb - .2)}" stroke="${OUT}" stroke-width=".08" fill="none"/><path d="M${n(-w * 1.0 + k)} ${n(yb - .2)} Q${n(k)} ${n(yb - .14)} ${n(w * 1.0 + k)} ${n(yb - .2)}" stroke="${H.band ?? '#2a2a2a'}" stroke-width=".05" fill="none"/>` +
        (back ? '' : [-1, 1].map(sd => `<rect x="${n(k * 2.6 + sd * .2 - .15)}" y="${n(yb - .32)}" width=".3" height=".2" rx=".08" fill="#9fc6d8" ${ol(.03)}/><rect x="${n(k * 2.6 + sd * .2 - .1)}" y="${n(yb - .29)}" width=".1" height=".05" rx=".02" fill="#fff" opacity=".7"/>`).join('') + `<circle cx="${n(k * 2.6)}" cy="${n(yb - .5)}" r=".07" fill="#c8272a" ${ol(.02)}/>`);
      break;
    }
    case 'beret':
      s = `<path d="M${n(-w * 1.05)} ${n(y0 + .06)} Q${n(-w * 1.3)} ${n(y0 - .4)} ${n(k + .1)} ${n(y0 - .42)} Q${n(w * 1.3)} ${n(y0 - .35)} ${n(w * 1.0)} ${n(y0 + .06)} Q${n(k)} ${n(y0 + .12)} ${n(-w * 1.05)} ${n(y0 + .06)}Z" fill="${c}" ${o}/><path d="M${n(k + .1)} ${n(y0 - .42)} l.02 -.08" ${ol(.05)}/>`;
      break;
  }
  return off > 0 ? `<g transform="rotate(${n(tilt)} 0 ${n(y0)})">${s}</g>` : s;
}
