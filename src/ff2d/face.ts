// FrameForge 2D engine — reusable facial expression system (flat FrameForge stickman style).
import { blend, clamp, mix } from './motion.ts';

export type Face = {
  eyeOpen: number;   // 1 normal, 0 closed, 1.35 wide
  eyeWhite: number;  // 0 solid black ovals (default style), 1 white eyes with small pupils (terror / disbelief)
  pupil: number;     // pupil size when eyeWhite
  gx: number; gy: number; // gaze -1..1
  lidTop: number;    // 0..1 flat top lid cut (anger / tiredness)
  lidLow: number;    // 0..1 lower lid push (smile squint)
  happyEyes: number; // 0..1 ^^ closed-smile eyes
  browY: number;     // -1 low .. 1 raised
  browAng: number;   // -1 angry (inner down) .. 1 worried (inner up)
  browCurve: number;
  mOpen: number;     // 0..1
  mWide: number;     // ~1
  smile: number;     // -1 frown .. 1 smile
  mO: number;        // 0..1 round "O"
  teeth: number;     // 0..1 upper teeth band; >0.85 gritted
  tongue: number;
  sweat: number; tears: number; shock: number; vein: number; blush: number; question: number;
};

const N: Face = { eyeOpen: 1, eyeWhite: 0, pupil: .5, gx: 0, gy: 0, lidTop: 0, lidLow: 0, happyEyes: 0, browY: 0, browAng: 0, browCurve: .25,
  mOpen: 0, mWide: 1, smile: .15, mO: 0, teeth: 0, tongue: .6, sweat: 0, tears: 0, shock: 0, vein: 0, blush: 0, question: 0 };
const f = (o: Partial<Face>): Face => ({ ...N, ...o });

export const EXPR = {
  neutral: N,
  calm: f({ smile: .3, browY: .05 }),
  happy: f({ smile: 1, mOpen: .45, teeth: .35, browY: .25, lidLow: .25 }),
  laugh: f({ smile: 1, mOpen: .8, teeth: .35, happyEyes: 1, browY: .4 }),
  curious: f({ browY: .55, browAng: .15, smile: 0, mO: .6, mOpen: .12, eyeOpen: 1.08 }),
  confused: f({ browY: .25, browAng: .55, smile: -.35, mWide: .7, question: 1 }),
  worried: f({ browAng: .9, browY: .25, smile: -.55, mOpen: .18, mWide: .85, sweat: .7 }),
  fear: f({ eyeWhite: 1, pupil: .38, eyeOpen: 1.3, browAng: 1, browY: .75, smile: -.7, mOpen: .55, teeth: .45, sweat: 1 }),
  shocked: f({ eyeOpen: 1.32, browY: 1, browAng: .2, smile: -.15, mO: 1, mOpen: .85, shock: 1 }),
  terror: f({ eyeWhite: 1, pupil: .3, eyeOpen: 1.38, browY: 1, browAng: .9, mOpen: 1, smile: -.5, mWide: 1.15, teeth: .3, sweat: 1, shock: 1 }),
  angry: f({ browAng: -1, browY: -.45, lidTop: .38, smile: -.65, mOpen: .2, mWide: .9 }),
  furious: f({ browAng: -1, browY: -.6, lidTop: .45, smile: -.5, mOpen: .55, mWide: 1.25, teeth: 1, vein: 1 }),
  shout: f({ browAng: -.8, browY: -.25, lidTop: .3, smile: -.3, mOpen: 1, mWide: 1.1, teeth: .4 }),
  sad: f({ browAng: 1, browY: .1, lidTop: .3, smile: -.8, gy: .45 }),
  crying: f({ browAng: 1, browY: .3, happyEyes: .9, smile: -.9, mOpen: .5, mWide: 1.1, tears: 1 }),
  tired: f({ lidTop: .55, browY: -.15, browAng: .3, smile: -.25, gy: .3 }),
  determined: f({ browAng: -.55, browY: -.25, lidTop: .2, smile: -.15, mWide: .8 }),
  relief: f({ eyeOpen: .25, browAng: .55, browY: .15, smile: .45, mOpen: .12, mO: .4 }),
  smug: f({ lidTop: .45, browAng: -.3, smile: .7, mWide: .9 }),
  focused: f({ lidTop: .25, browAng: -.35, browY: -.15, smile: 0, mWide: .6 }),
} satisfies Record<string, Face>;
export type ExprName = keyof typeof EXPR;
export const expr = (a: ExprName | Face, b?: ExprName | Face, k = 0): Face => {
  const A = typeof a === 'string' ? EXPR[a] : a; if (!b) return A;
  return blend(A, typeof b === 'string' ? EXPR[b] : b, k);
};

const n = (x: number) => +x.toFixed(4);
const OUT = '#111';

/**
 * Draw the face in head-local units (head radius 0.5, centre 0,0). turn: -1 (profile left) … 0 (front) … 1 (profile right).
 * lid = extra blink closure (0..1) from the blink scheduler.
 */
export function drawFace(F: Face, turn: number, lid: number, id: string, lw: number): string {
  const s: string[] = [];
  const at = Math.abs(turn), sx = Math.sign(turn) || 1;
  const cx = turn * .3, squash = 1 - at * .45;
  const eyeY = -.03 + F.gy * .02;
  const open = clamp(F.eyeOpen * (1 - lid), 0, 1.5);
  const eyes: [number, number][] = [[-1, 1], [1, 1]];
  for (const [side] of eyes) {
    const far = side === -sx && at > .05;
    if (far && at > .82) continue;
    const scale = far ? 1 - at * .35 : 1 + at * .06;
    const ex = cx + side * .145 * squash + F.gx * .035, ey = eyeY;
    const rx = .082 * scale * (1 - at * .25), ry = .135 * open;
    // brows
    const by = ey - .2 - F.browY * .07 + (F.lidTop * .03);
    const tilt = F.browAng * .38 * side; // inner end = towards face centre
    const bl = .085 * scale;
    const bx0 = ex - bl, bx1 = ex + bl;
    const iy = (x: number) => by + (x - ex) * Math.tan(tilt);
    const bAlpha = clamp((Math.abs(F.browAng) + Math.max(0, F.browY - .15) + Math.max(0, -F.browY) + F.lidTop - .3) * 3);
    if (bAlpha > .02) s.push(`<path opacity="${n(bAlpha)}" d="M${n(bx0)} ${n(iy(bx0))} Q${n(ex)} ${n(by - F.browCurve * .05)} ${n(bx1)} ${n(iy(bx1))}" fill="none" stroke="${OUT}" stroke-width="${n(lw * 1.25)}" stroke-linecap="round"/>`);
    if (F.happyEyes > .5 || open < .1) {
      const up = F.happyEyes > .5 ? -1 : .35;
      s.push(`<path d="M${n(ex - rx * 1.25)} ${n(ey + .02)} Q${n(ex)} ${n(ey + up * .085)} ${n(ex + rx * 1.25)} ${n(ey + .02)}" fill="none" stroke="${OUT}" stroke-width="${n(lw)}" stroke-linecap="round"/>`);
      continue;
    }
    const clip = `${id}e${side}`;
    // lid cut follows brow tilt (anger/tired), lower lid lifts for smile squint
    const cutY = ey - ry + F.lidTop * ry * 1.25, lowY = ey + ry - F.lidLow * ry * .9;
    s.push(`<clipPath id="${clip}"><path d="M${n(ex - .2)} ${n(cutY - Math.tan(tilt) * .2)} L${n(ex + .2)} ${n(cutY + Math.tan(tilt) * .2)} L${n(ex + .2)} ${n(lowY)} Q${n(ex)} ${n(lowY - F.lidLow * .05)} ${n(ex - .2)} ${n(lowY)}Z"/></clipPath>`);
    const w = F.eyeWhite;
    if (w > .02) {
      const wrx = mix(rx, .1 * scale * (1 - at * .2), w), wry = mix(ry, .13 * open, w);
      const pr = mix(rx, .045 * F.pupil * 2 * scale, w);
      s.push(`<g clip-path="url(#${clip})"><ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(wrx)}" ry="${n(wry)}" fill="#fff" stroke="${OUT}" stroke-width="${n(lw * .8)}"/>` +
        `<circle cx="${n(ex + F.gx * wrx * .45)}" cy="${n(ey + F.gy * wry * .35)}" r="${n(pr)}" fill="${OUT}"/>` +
        `<circle cx="${n(ex + F.gx * wrx * .45 - pr * .35)}" cy="${n(ey + F.gy * wry * .35 - pr * .4)}" r="${n(pr * .3)}" fill="#fff"/></g>`);
    } else {
      s.push(`<g clip-path="url(#${clip})"><ellipse cx="${n(ex)}" cy="${n(ey)}" rx="${n(rx)}" ry="${n(ry)}" fill="${OUT}"/>` +
        `<ellipse cx="${n(ex - rx * .32)}" cy="${n(ey - ry * .42)}" rx="${n(rx * .32)}" ry="${n(rx * .36)}" fill="#fff"/></g>`);
    }
    if (F.lidTop > .05) s.push(`<path d="M${n(ex - rx * 1.3)} ${n(cutY - Math.tan(tilt) * rx * 1.3)} L${n(ex + rx * 1.3)} ${n(cutY + Math.tan(tilt) * rx * 1.3)}" stroke="${OUT}" stroke-width="${n(lw * .9)}" stroke-linecap="round"/>`);
    if (F.tears > .05) s.push(`<path d="M${n(ex)} ${n(ey + ry * .7)} q${n(-.02)} ${n(.12 * F.tears)} 0 ${n(.26 * F.tears)} q.025 -.1 0 ${n(-.26 * F.tears)}" fill="#7cc4f2" stroke="#2b6ea3" stroke-width="${n(lw * .45)}"/>`);
  }
  // mouth
  const mx = cx + turn * .04, my = .2;
  const w0 = .145 * F.mWide * (1 - at * .4);
  const w = mix(w0, .055 + F.mOpen * .02, F.mO);
  const cy = my - F.smile * .055;
  const op = F.mOpen;
  if (op < .06) {
    s.push(`<path d="M${n(mx - w)} ${n(cy)} Q${n(mx)} ${n(my + F.smile * .07)} ${n(mx + w)} ${n(cy)}" fill="none" stroke="${OUT}" stroke-width="${n(lw)}" stroke-linecap="round"/>`);
  } else {
    const up = my - op * .03 - F.mO * op * .07 + Math.max(0, F.smile) * .015;
    const lo = my + op * .2 + F.smile * .06 + F.mO * op * .03;
    const path = `M${n(mx - w)} ${n(cy)} Q${n(mx)} ${n(up)} ${n(mx + w)} ${n(cy)} Q${n(mx)} ${n(lo)} ${n(mx - w)} ${n(cy)}Z`;
    const mc = `${id}m`;
    s.push(`<clipPath id="${mc}"><path d="${path}"/></clipPath><path d="${path}" fill="#7a1418"/>`);
    s.push(`<g clip-path="url(#${mc})">`);
    if (F.tongue > .05 && F.teeth < .85) s.push(`<ellipse cx="${n(mx + w * .1)}" cy="${n(lo + .01)}" rx="${n(w * .75)}" ry="${n(.05 + op * .04)}" fill="#e2585f"/>`);
    if (F.teeth > .85) {
      s.push(`<rect x="${n(mx - w)}" y="${n(up - .05)}" width="${n(w * 2)}" height="${n(lo - up + .1)}" fill="#fff"/><path d="M${n(mx - w)} ${n((up + lo) / 2)}H${n(mx + w)}${[-.5, 0, .5].map(k => `M${n(mx + k * w)} ${n(up)}V${n(lo)}`).join('')}" stroke="${OUT}" stroke-width="${n(lw * .5)}"/>`);
    } else if (F.teeth > .02) s.push(`<rect x="${n(mx - w)}" y="${n(up - .05)}" width="${n(w * 2)}" height="${n(.05 + F.teeth * .045)}" fill="#fff"/>`);
    s.push(`</g><path d="${path}" fill="none" stroke="${OUT}" stroke-width="${n(lw)}" stroke-linejoin="round"/>`);
  }
  // emanata / extras (placed on the open side of the head)
  if (F.blush > .02) for (const side of [-1, 1]) s.push(`<ellipse cx="${n(cx + side * .27 * squash)}" cy=".13" rx=".06" ry=".03" fill="#f08a8a" opacity="${n(F.blush * .7)}"/>`);
  if (F.sweat > .05) {
    const k = F.sweat, x = .37 * -sx + .05, y = -.26;
    s.push(`<path d="M${n(x)} ${n(y - .09 * k)} C${n(x + .05 * k)} ${n(y)} ${n(x + .045 * k)} ${n(y + .06 * k)} ${n(x)} ${n(y + .06 * k)} C${n(x - .045 * k)} ${n(y + .06 * k)} ${n(x - .05 * k)} ${n(y)} ${n(x)} ${n(y - .09 * k)}Z" fill="#9fd8f7" stroke="#1d5f8f" stroke-width="${n(lw * .55)}"/>`);
  }
  if (F.vein > .05) { const x = -.25 * sx, y = -.33, k = .055 * F.vein; s.push(`<path d="M${n(x - k)} ${n(y - k * .3)}l${n(k * .7)} ${n(k * .3)}M${n(x + k)} ${n(y - k * .3)}l${n(-k * .7)} ${n(k * .3)}M${n(x - k)} ${n(y + k * .9)}l${n(k * .7)} ${n(-k * .3)}M${n(x + k)} ${n(y + k * .9)}l${n(-k * .7)} ${n(-k * .3)}" stroke="#d2232a" stroke-width="${n(lw * .7)}" stroke-linecap="round"/>`); }
  return s.join('');
}

/** emanata drawn outside the head (shock lines, question mark) in head-local units */
export function drawEmanata(F: Face, turn: number, lw: number): string {
  const s: string[] = [];
  const sx = -(Math.sign(turn) || 1);
  if (F.shock > .05) {
    const k = F.shock;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + sx * (.35 + i * .32), r0 = .62, r1 = .62 + .16 * k;
      s.push(`<path d="M${n(Math.cos(a) * r0)} ${n(Math.sin(a) * r0)}L${n(Math.cos(a) * r1)} ${n(Math.sin(a) * r1)}" stroke="${OUT}" stroke-width="${n(lw * 1.1)}" stroke-linecap="round" opacity="${n(clamp(k * 1.5))}"/>`);
    }
  }
  if (F.question > .05) s.push(`<text x="${n(.5 * sx + .02)}" y="-.5" font-family="Inter,Arial,sans-serif" font-weight="900" font-size=".42" fill="${OUT}" text-anchor="middle" opacity="${n(F.question)}">?</text>`);
  return s.join('');
}
