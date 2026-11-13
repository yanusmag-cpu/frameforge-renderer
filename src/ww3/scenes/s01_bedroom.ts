// WW3 · Chapter 1 hook — bedroom at night, phone alert, reaction (shots 1.1–1.3).
import { EXPR, expr } from '../../ff2d/face.ts';
import { blend, clamp, hash, inOut, mix, outBack, outCubic, range, settle, track, type V2 } from '../../ff2d/motion.ts';
import { HERO, type Pose, STAND, stickman } from '../../ff2d/rig.ts';
import { type Cam, glow, grade, H, layer, lin, place, rad, txt, W } from '../../ff2d/stage.ts';

const U = 150;                       // px per head unit in world
const HX = 880, HO = 975;            // hero origin (ground point under hips, chair-seated)
const DESK = 640, FLOOR = 900;
const PHONE: V2 = [985, DESK - 6];

const n = (x: number) => +x.toFixed(2);

function skyline(seed: number, y0: number, h: number, col: string, x0: number, x1: number, t: number, lit: number) {
  let s = '', x = x0, i = 0;
  while (x < x1) {
    const w = 26 + hash(i * 3 + seed) * 46, bh = h * (.35 + hash(i * 7 + seed) * .65);
    s += `<rect x="${n(x)}" y="${n(y0 - bh)}" width="${n(w)}" height="${n(bh + 40)}" fill="${col}"/>`;
    for (let wy = y0 - bh + 8; wy < y0 - 6; wy += 11) for (let wx = x + 5; wx < x + w - 6; wx += 9) {
      const r = hash(wx * .13 + wy * .71 + seed);
      if (r < lit) {
        const flick = hash(Math.floor(t * .5 + r * 9) + wx) > .04 ? 1 : .2;
        s += `<rect x="${n(wx)}" y="${n(wy)}" width="4" height="5" fill="${r < lit * .35 ? '#ffe2a6' : '#f7c56a'}" opacity="${n((.55 + r) * flick)}"/>`;
      }
    }
    if (hash(i + seed * 3) > .8) {
      const on = (Math.sin(t * 3.2 + i) > .2) ? 1 : .15;
      s += `<circle cx="${n(x + w / 2)}" cy="${n(y0 - bh - 4)}" r="2.5" fill="#ff4b3a" opacity="${on}"/>`;
    }
    x += w + 2 + hash(i * 11 + seed) * 6; i++;
  }
  return s;
}

function room(t: number, alert: number) {
  let s = `<defs>${lin('wall', [[0, '#2c3a5c'], [.7, '#232f4b'], [1, '#1c263d']])}${lin('floor', [[0, '#3b2d2b'], [1, '#241b1b']])}
${lin('sky', [[0, '#0b1430'], [.65, '#1f2f5e'], [1, '#41528a']])}${lin('deskTop', [[0, '#8a5d3d'], [1, '#6e4a31']])}
${lin('desk', [[0, '#5d3e2a'], [1, '#3e291d']])}${lin('duvet', [[0, '#5b6f9c'], [1, '#3f4f77']])}${lin('curt', [[0, '#2f3f6a'], [.5, '#3c4f82'], [1, '#2a3860']], 0, 0, 1, 0)}</defs>`;
  // wall + subtle panel seams
  s += `<rect x="-400" y="-200" width="2800" height="${FLOOR + 200}" fill="url(#wall)"/>`;
  for (let x = -300; x < 2400; x += 240) s += `<path d="M${x} -200V${FLOOR}" stroke="#1a2338" stroke-width="2" opacity=".35"/>`;
  // window (behind desk)
  const wx0 = 1060, wx1 = 1560, wy0 = 110, wy1 = 560;
  s += `<rect x="${wx0}" y="${wy0}" width="${wx1 - wx0}" height="${wy1 - wy0}" fill="url(#sky)"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${n(wx0 + hash(i) * 500)}" cy="${n(wy0 + hash(i + 50) * 220)}" r="${n(.8 + hash(i + 9) * 1.3)}" fill="#fff" opacity="${n(.35 + .4 * Math.sin(t * 2 + i))}"/>`;
  s += `<circle cx="1455" cy="185" r="34" fill="#f4f1de"/><circle cx="1470" cy="176" r="31" fill="#1a2852"/>`;
  s += glow([1455, 185], 120, '#cfe0ff', .25);
  s += skyline(4, 470, 150, '#1b2647', wx0 - 20, wx1 + 20, t, .22);
  s += skyline(9, 560, 120, '#121a33', wx0 - 20, wx1 + 20, t, .3);
  if (alert > 0) s += `<rect x="${wx0}" y="${wy0}" width="${wx1 - wx0}" height="${wy1 - wy0}" fill="#ff2d2d" opacity="${n(alert * .06)}"/>`;
  s += `<path d="M${wx0} ${wy0}H${wx1}V${wy1}H${wx0}Z M${(wx0 + wx1) / 2} ${wy0}V${wy1} M${wx0} ${(wy0 + wy1) / 2 - 20}H${wx1}" fill="none" stroke="#c9d1e3" stroke-width="16"/>`;
  s += `<rect x="${wx0 - 28}" y="${wy1}" width="${wx1 - wx0 + 56}" height="20" rx="4" fill="#d6dcea"/>`;
  s += `<path d="M${wx0} ${wy0}H${wx1}V${wy1}H${wx0}Z" fill="none" stroke="#111" stroke-width="5"/>`;
  // curtains with folds
  for (const [cx, w] of [[wx0 - 70, 110], [wx1 - 40, 110]]) {
    s += `<path d="M${cx} 70 H${cx + w} L${cx + w + 6} ${FLOOR - 60} Q${cx + w / 2} ${FLOOR - 40} ${cx - 6} ${FLOOR - 60}Z" fill="url(#curt)" stroke="#111" stroke-width="4"/>`;
    for (let k = 1; k < 4; k++) s += `<path d="M${cx + k * w / 4} 80 V${FLOOR - 70}" stroke="#25335a" stroke-width="5" opacity=".7"/>`;
  }
  s += `<rect x="${wx0 - 110}" y="58" width="${wx1 - wx0 + 220}" height="14" rx="7" fill="#3a3a44" stroke="#111" stroke-width="3"/>`;
  // poster (mountain) + shelf with books
  s += `<rect x="150" y="190" width="250" height="180" fill="#1b2338" stroke="#d9d4c7" stroke-width="12"/><path d="M162 360 L230 270 L268 315 L310 250 L388 360Z" fill="#6b7fae"/><path d="M296 268 L310 250 L324 270 L314 266 L306 274Z" fill="#eef"/><circle cx="350" cy="230" r="14" fill="#f2e6b8"/>`;
  s += `<rect x="520" y="270" width="270" height="14" fill="#6e4a31" stroke="#111" stroke-width="3"/>`;
  [[530, 60, '#c0392b'], [556, 72, '#2e86c1'], [582, 54, '#e5b53a'], [606, 66, '#3c8d5a'], [660, 40, '#d8d2c4']].forEach(([x, h, c]) => s += `<rect x="${x}" y="${270 - (h as number)}" width="22" height="${h}" fill="${c}" stroke="#111" stroke-width="3"/>`);
  s += `<path d="M700 270 q10 -40 34 -46 q4 22 -10 46Z" fill="#4c8d55" stroke="#111" stroke-width="3"/><rect x="706" y="250" width="36" height="20" fill="#b9714a" stroke="#111" stroke-width="3"/>`;
  // floor
  s += `<rect x="-400" y="${FLOOR}" width="2800" height="400" fill="url(#floor)"/><rect x="-400" y="${FLOOR - 14}" width="2800" height="16" fill="#d6dcea" opacity=".85"/>`;
  for (let x = -380; x < 2400; x += 170) s += `<path d="M${x} ${FLOOR}L${x - 140} ${H + 200}" stroke="#2a201f" stroke-width="3"/>`;
  s += `<path d="M300 ${FLOOR + 30} L1250 ${FLOOR + 30} L1330 ${FLOOR + 120} L220 ${FLOOR + 120}Z" fill="#46384f" stroke="#111" stroke-width="4"/><path d="M330 ${FLOOR + 50} L1230 ${FLOOR + 50} L1290 ${FLOOR + 102} L270 ${FLOOR + 102}Z" fill="none" stroke="#6a5577" stroke-width="5"/>`;
  // bed (left, background)
  s += `<path d="M-120 ${FLOOR} V560 Q-120 500 -60 500 H340 Q400 500 400 560 V${FLOOR}Z" fill="#5d3e2a" stroke="#111" stroke-width="5"/><path d="M-90 560 Q-90 530 -60 530 H340 Q370 530 370 560 V660 H-90Z" fill="#4c3222"/>`;
  s += `<rect x="-120" y="${FLOOR - 40}" width="580" height="40" fill="#4a3122" stroke="#111" stroke-width="5"/>`;
  s += `<rect x="-120" y="670" width="560" height="${FLOOR - 670}" rx="14" fill="url(#duvet)" stroke="#111" stroke-width="5"/><path d="M-100 700 Q160 680 420 712" stroke="#6f84b6" stroke-width="6" fill="none"/>`;
  s += `<rect x="20" y="600" width="230" height="86" rx="38" fill="#e8e5dc" stroke="#111" stroke-width="5"/><path d="M60 640 q60 14 140 0" stroke="#c9c5ba" stroke-width="5" fill="none"/>`;
  s += `<path d="M180 ${FLOOR - 40} q80 -60 120 -150 q40 60 120 70" fill="none" stroke="#33426a" stroke-width="6" opacity=".7"/>`;
  return s;
}

function desk(t: number, alert: number, phoneHeld: boolean, clockText = '10:24') {
  let s = '';
  s += `<rect x="955" y="${DESK}" width="820" height="28" rx="4" fill="url(#deskTop)" stroke="#111" stroke-width="5"/>`;
  s += `<rect x="1380" y="${DESK + 28}" width="370" height="${FLOOR - DESK - 28}" fill="url(#desk)" stroke="#111" stroke-width="5"/>`;
  for (const y of [DESK + 100, DESK + 175]) s += `<path d="M1380 ${y}H1750" stroke="#111" stroke-width="4"/><rect x="1545" y="${y - 50}" width="40" height="8" rx="4" fill="#c9b18c"/>`;
  s += `<rect x="975" y="${DESK + 28}" width="22" height="${FLOOR - DESK - 28}" fill="#4a3122" stroke="#111" stroke-width="4"/>`;
  // laptop: base + open screen facing the hero (seen from 3/4 behind-side)
  s += `<path d="M1030 ${DESK - 4} L1250 ${DESK - 4} L1262 ${DESK - 14} L1046 ${DESK - 14}Z" fill="#a7adb8" stroke="#111" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<path d="M1250 ${DESK - 10} L1205 ${DESK - 190} L1222 ${DESK - 194} L1266 ${DESK - 14}Z" fill="#7d8492" stroke="#111" stroke-width="4" stroke-linejoin="round"/>`;
  s += `<path d="M1246 ${DESK - 16} L1203 ${DESK - 186}" stroke="#bfe3ff" stroke-width="5" opacity="${n(.9 - alert * .3)}"/>`;
  // mug + lamp
  s += `<rect x="1460" y="${DESK - 62}" width="48" height="58" rx="8" fill="#e9e4d8" stroke="#111" stroke-width="4"/><path d="M1508 ${DESK - 48} q24 4 0 30" fill="none" stroke="#111" stroke-width="6"/>`;
  for (let i = 0; i < 3; i++) { const y = DESK - 80 - ((t * 22 + i * 18) % 54); s += `<path d="M${1478 + i * 7} ${y} q8 -10 0 -20" stroke="#fff" stroke-width="3" fill="none" opacity="${n(.25 * (1 - ((t * 22 + i * 18) % 54) / 54))}"/>`; }
    // articulated desk lamp: weighted base, two arms, shade aimed at the desk
  s += `<ellipse cx="1650" cy="${DESK - 6}" rx="46" ry="10" fill="#2f3440" stroke="#111" stroke-width="4"/>`;
  s += `<path d="M1650 ${DESK - 10} L1690 ${DESK - 150} L1610 ${DESK - 230}" fill="none" stroke="#111" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/><path d="M1650 ${DESK - 10} L1690 ${DESK - 150} L1610 ${DESK - 230}" fill="none" stroke="#3a404d" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<circle cx="1690" cy="${DESK - 150}" r="9" fill="#555" stroke="#111" stroke-width="3"/>`;
  s += `<g transform="translate(1610 ${DESK - 230}) rotate(38)"><path d="M-14 -10 L14 -10 L48 62 L-48 62Z" fill="#e0b04a" stroke="#111" stroke-width="5" stroke-linejoin="round"/><ellipse cy="62" rx="48" ry="11" fill="#fff4cf" stroke="#111" stroke-width="4"/></g>`;
  // bedside digital clock (callback anchor: 10:24 PM)
  s += `<rect x="1300" y="${DESK - 58}" width="118" height="54" rx="10" fill="#1a1d24" stroke="#111" stroke-width="4"/><text x="1359" y="${DESK - 20}" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="30" fill="#ff5a4a" text-anchor="middle">${clockText}</text>`;
  if (!phoneHeld) s += phoneSide(PHONE, alert, t, 0);
  return s;
}
/** phone lying on desk seen from the side/front at room scale */
function phoneSide(p: V2, alert: number, t: number, rot: number) {
  const buzz = alert > 0 ? Math.sin(t * 90) * 2.2 * (Math.sin(t * 9) > 0 ? 1 : 0) : 0;
  return `<g transform="translate(${n(p[0] + buzz)} ${n(p[1])}) rotate(${n(rot)})"><rect x="-38" y="-9" width="76" height="12" rx="5" fill="#1d1f26" stroke="#111" stroke-width="3"/><rect x="-33" y="-10" width="66" height="4" rx="2" fill="${alert > 0 ? '#ff3b30' : '#2b3a55'}"/></g>`;
}
/** phone held up, seen from the back with the alert glow wrapping its edges */
function phoneHeld(p: V2, rot: number, alert: number) {
  return `<g transform="translate(${n(p[0])} ${n(p[1])}) rotate(${n(rot)})"><rect x="-24" y="-44" width="48" height="88" rx="9" fill="#23262e" stroke="#111" stroke-width="4"/><circle cx="-9" cy="-30" r="6" fill="#111" stroke="#555" stroke-width="2"/><rect x="-27" y="-47" width="54" height="94" rx="11" fill="none" stroke="#ff3b30" stroke-width="2" opacity="${n(alert * .9)}"/></g>`;
}

/** Insert (1.2): top-down desk, phone screen erupts with an emergency alert. lt = local time from shot start. */
export function insertPhone(lt: number, lineT: number[] = [.55, .67, .79, .91, 1.03, 1.15], pick = 99) {
  const on = range(lt, .25, .32);
  const vib = lt > .25 ? Math.sin(lt * 95) * 3.5 * (Math.sin(lt * 10) > -.2 ? 1 : 0) : 0;
  const zoom = mix(1.06, 1.0, outBack(range(lt, 0, .35))) + lt * .025;
  let s = `<defs>${lin('wood', [[0, '#7a5236'], [1, '#5f3f29']], 0, 0, 1, 1)}${rad('red', [[0, '#ff2b2b', .75], [.5, '#ff2b2b', .25], [1, '#ff2b2b', 0]])}</defs>`;
  s += `<g transform="translate(${W / 2} ${H / 2}) scale(${n(zoom)}) rotate(-6) translate(${-W / 2} ${-H / 2})">`;
  s += `<rect x="-200" y="-200" width="${W + 400}" height="${H + 400}" fill="url(#wood)"/>`;
  for (let i = 0; i < 26; i++) s += `<path d="M-200 ${i * 55 - 120} C400 ${i * 55 - 90 + hash(i) * 40} 1200 ${i * 55 - 150} ${W + 200} ${i * 55 - 110}" stroke="#4f3322" stroke-width="${n(1.5 + hash(i + 3) * 3)}" fill="none" opacity=".45"/>`;
  // laptop corner + mug in frame edges
  s += `<rect x="1390" y="-60" width="760" height="520" rx="26" fill="#a7adb8" stroke="#111" stroke-width="7"/><rect x="1440" y="40" width="600" height="300" rx="12" fill="#5d636e"/>`;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) s += `<rect x="${1460 + c * 64}" y="${60 + r * 66}" width="54" height="54" rx="8" fill="#2c2f36"/>`;
  s += `<circle cx="300" cy="880" r="150" fill="#e9e4d8" stroke="#111" stroke-width="7"/><circle cx="300" cy="880" r="112" fill="#3a2418"/>`;
  // phone
  const up = inOut(range(lt, pick + .15, pick + .75));
  s += `<g transform="translate(${n(W / 2 - 40 + vib * (1 - up) - up * 60)} ${n(H / 2 + 20 - up * 40)}) rotate(${n(8 + vib * .3 - up * 10)}) scale(${n(1 + up * .22)})">`;
  s += `<rect x="-215" y="-410" width="430" height="820" rx="58" fill="#15171c" stroke="#111" stroke-width="8"/>`;
  const sc = on > 0 ? '#c4161c' : '#0e1424';
  s += `<rect x="-192" y="-386" width="384" height="772" rx="42" fill="${sc}"/>`;
  if (on <= 0) s += txt(0, -230, '10:24', 96, { anchor: 'middle', weight: 300, fill: '#dfe6f5' });
  else {
    const pulse = .5 + .5 * Math.sin(lt * 14);
    s += `<rect x="-192" y="-386" width="384" height="772" rx="42" fill="#ff4d4d" opacity="${n(pulse * .18)}"/>`;
    s += txt(-150, -320, '10:24 PM', 26, { weight: 700, fill: '#ffd9d9' });
    const pop = outBack(range(lt, .3, .6));
    s += `<g transform="translate(0 -170) scale(${n(pop)})"><path d="M0 -78 L72 50 H-72Z" fill="none" stroke="#fff" stroke-width="12" stroke-linejoin="round"/><rect x="-6" y="-32" width="12" height="46" rx="6" fill="#fff"/><circle cy="32" r="8" fill="#fff"/></g>`;
    const lines: [string, number, number][] = [['EMERGENCY ALERT', 40, -30], ['BALLISTIC MISSILE', 34, 50], ['THREAT INBOUND.', 34, 92], ['SEEK IMMEDIATE', 34, 160], ['SHELTER.', 34, 202], ['THIS IS NOT A DRILL.', 31, 270]];
    lines.forEach(([l, sz, y], i) => { const a = clamp((lt - lineT[i]) / .14); s += txt(0, y, l, sz, { anchor: 'middle', op: a, ls: i === 0 ? 2 : 0 }); });
  }
  s += `<rect x="-60" y="-372" width="120" height="26" rx="13" fill="#000"/>`;
  // hero's mitten hands grip the phone edges as it is lifted
  const hk = outCubic(range(lt, pick - .3, pick + .15));
  if (hk > 0) for (const sd of [-1, 1]) s += `<g transform="translate(${n(sd * (255 + (1 - hk) * 500))} ${n(160 + (1 - hk) * 300)})"><path d="M${sd * 60} 120 L${sd * 260} 520" stroke="#111" stroke-width="118" stroke-linecap="round"/><path d="M${sd * 60} 120 L${sd * 260} 520" stroke="#d8262b" stroke-width="96" stroke-linecap="round"/><circle r="72" fill="#fff" stroke="#111" stroke-width="9"/></g>`;
  s += '</g>';
  s += glow([W / 2 - 40, H / 2 + 20], 900, '#ff2b2b', on * (.35 + .1 * Math.sin(lt * 14)));
  s += '</g>';
  s += grade({ tint: '#9aa6d0', tintA: on > 0 ? .25 : .55, vig: .55 });
  return s;
}

export type BedMode = { kind: 'wide' | 'react' | 'calm'; lt: number; alert?: number; clock?: string; cam?: Cam; shockAt?: number };

function typingPose(t: number, k = 1): Pose {
  const tp = (sft: number) => Math.max(0, Math.sin(t * 13 + sft)) * .05 * k;
  return { ...STAND, turn: .42, lean: .1, crouch: 0, hipX: 0, headTilt: .05, headTurn: .25, headLift: 0,
    handA: [1.0, -2.3 - tp(0)], handB: [1.32, -2.28 - tp(2.1)], bendA: -1, bendB: -1, shapeA: 'fist', shapeB: 'fist',
    footA: [.78, -.56], footB: [1.02, -.55], kneeDir: 1, frontA: 0, frontB: 1 };
}

/** Bedroom shot. t = absolute film time (drives idle/blinks); m.lt = time since shot start. */
export function bedroomShot(t: number, m: BedMode): string {
  const lt = m.lt;
  let pose: Pose, face, cam: Cam, held = false, alert = m.alert ?? 0;
  if (m.kind === 'react') {
    // already holding the phone (picked up in the insert); reads, then the words land.
    const sa = m.shockAt ?? .45;
    const antic = range(lt, sa - .12, sa) - range(lt, sa, sa + .08);
    const shock = settle(Math.max(0, lt - sa), 1.6, 4.5);
    const recoil = outBack(range(lt, sa, sa + .35), 2.2) * (1 - range(lt, sa + 1.2, sa + 2));
    const tremble = lt > sa + .2 ? Math.sin(t * 37) * .012 : 0;
    const handB: V2 = [.8, -2.72 - recoil * .1 + tremble];
    pose = { ...typingPose(t, 0), turn: .2, headTurn: .25, lean: -.05 - recoil * .12, handB, handA: [handB[0] - .2, handB[1] + .28],
      shapeB: 'hold', bendB: 2, bendA: 2, frontA: 1, headLift: recoil * .08 - antic * .05 };
    face = blend(expr('worried'), { ...EXPR.terror, gx: .3, gy: .1 }, clamp(shock));
    face = { ...face, gx: .7, gy: .25 + shock * -.15, sweat: range(lt, sa + .4, sa + .8) };
    cam = m.cam ?? { x: 950 - lt * 6, y: 475, zoom: track(lt, [[0, 1.95], [sa, 2.0], [sa + .25, 2.14, outBack], [3, 2.2]]) };
    held = true; alert = 1;
  } else {
    pose = typingPose(t);
    face = { ...expr('calm', 'happy', clamp(Math.sin(t * .8) * .4 + .1)), gx: .8, gy: .35 };
    cam = m.cam ?? { x: mix(1010, 1000, inOut(lt / 3)), y: mix(530, 515, inOut(lt / 3)), zoom: mix(1.0, 1.06, inOut(lt / 3)) };
  }
  const alertPulse = alert ? .65 + .35 * Math.sin(t * 14) : 0;
  const hero = stickman(pose, HERO, { id: 'h', t, seed: 3, face });
  const chair = `<path d="M${HX - 105} ${HO - 1.6 * U - 250} q-12 120 6 250 h40 q-18 -125 -4 -250Z" fill="#2c3038" stroke="#111" stroke-width="5"/><rect x="${HX - 110}" y="${HO - 1.6 * U - 4}" width="230" height="30" rx="12" fill="#2c3038" stroke="#111" stroke-width="5"/><path d="M${HX} ${HO - 1.6 * U + 26}V${FLOOR - 30}M${HX - 90} ${FLOOR - 18}H${HX + 90}" stroke="#2c3038" stroke-width="16"/>` +
    [-90, 0, 90].map(d => `<circle cx="${HX + d}" cy="${FLOOR - 8}" r="10" fill="#111"/>`).join('');
  const hp: V2 = [HX + hero.j.handB[0] * U, HO + hero.j.handB[1] * U - 30];
  const world = room(t, alert ? alertPulse : 0) + chair + place(hero.svg, HX, HO, U) + desk(t, alert ? alertPulse : 0, held, m.clock) + (held ? phoneHeld(hp, -8, alertPulse) : '');
  const lp: V2 = held ? hp : PHONE;
  const lights = glow([1200, DESK - 110], 360, '#8fc6ff', .26 * (1 - (alert ? .5 : 0))) + glow([1359, DESK - 30], 60, '#ff5a4a', .35) + glow([1565, DESK - 165], 160, '#fff1c4', .45) + glow([1520, DESK - 40], 520, '#ffb35c', .3, .8) + glow([1500, DESK + 10], 360, '#ffb35c', .22, .35) +
    (alert ? glow(lp, 620, '#ff2b2b', .5 * alertPulse) + glow(lp, 180, '#ff6b5b', .45 * alertPulse) : '');
  return layer(cam, 1, t, world) + grade({ tint: '#8794c4', tintA: .5 }) + layer(cam, 1, t, lights) + grade({ vig: .6 });
}
