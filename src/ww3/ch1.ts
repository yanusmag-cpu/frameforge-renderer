// Chapter 1 — The Hook (0:00–0:24). Every cut keyed to measured sentence starts S[i].
import { EXPR, expr } from '../ff2d/face.ts';
import { glitchBars, radar } from '../ff2d/fx.ts';
import { clamp, hash, inOut, outBack, outCubic, range, track } from '../ff2d/motion.ts';
import { HERO, STAND, stickman } from '../ff2d/rig.ts';
import { glow, grade, H, txt, W } from '../ff2d/stage.ts';
import { titleCard } from '../ff2d/ui.ts';
import { cityScape } from './kits/city.ts';
import { commandCenter } from './kits/command.ts';
import { tvInRoom } from './kits/news.ts';
import { bedroomShot, insertPhone } from './scenes/s01_bedroom.ts';
import { type Shot, at } from './shot.ts';
import { S } from './vo.ts';

const n = (x: number) => +x.toFixed(2);

/** Full-screen early-warning scope with HUD. */
export function radarScreen(t: number, lt: number, blips: [number, number, number][], alert: number, label = 'EARLY WARNING · NORTH SECTOR', err = 0) {
  let s = `<rect width="${W}" height="${H}" fill="#020806"/>`;
  s += `<g transform="translate(960 540) scale(${n(1.0 + lt * .03)}) translate(-960 -540)">` + radar(960, 540, 430, t, blips, '#39ff8a', alert) + '</g>';
  s += txt(90, 110, label, 30, { fill: '#39ff8a', weight: 800, ls: 4 }) + txt(90, 150, `UTC ${(22 + Math.floor(t / 60)).toString().padStart(2, '0')}:24:${String(Math.floor(t) % 60).padStart(2, '0')}`, 24, { fill: '#39ff8a', weight: 500, op: .7 });
  const tracks = blips.filter(b => t >= b[2]).length;
  s += txt(1830, 110, `TRACKS ${tracks}`, 34, { fill: alert > .5 ? '#ff4b3a' : '#39ff8a', weight: 900, anchor: 'end' });
  if (err > 0) s += `<g opacity="${n(err * (Math.sin(t * 22) > -.3 ? 1 : .2))}"><rect x="660" y="880" width="600" height="80" fill="#2a0606" stroke="#ff4b3a" stroke-width="4"/>${txt(960, 934, 'SENSOR FAULT?', 40, { fill: '#ff4b3a', anchor: 'middle', ls: 4 })}</g>`;
  if (alert > .5) s += `<rect width="${W}" height="${H}" fill="#ff1a1a" opacity="${n(.06 + .05 * Math.sin(t * 9))}"/>`;
  for (let y = 0; y < H; y += 5) s += `<rect y="${y}" width="${W}" height="2" fill="#000" opacity=".22"/>`;
  return s + grade({ vig: .8 });
}

/** Extreme close-up on the hero's eye with the red dot reflected. */
function eyeECU(t: number, lt: number) {
  const r = stickman({ ...STAND }, HERO, { id: 'ecu', t, seed: 3, face: { ...EXPR.terror, gx: .1, gy: -.05, sweat: 0, shock: 0 } });
  const sc = 2600 + lt * 160, hx = r.j.head[0] - .145, hy = r.j.head[1] - .03;
  let s = `<rect width="${W}" height="${H}" fill="#1a1e2a"/><g transform="translate(980 540) scale(${n(sc)}) translate(${n(-hx)} ${n(-hy)})">${r.svg}</g>`;
  s += `<circle cx="${n(980 + .1 * .5 * .45 * sc * .2)}" cy="526" r="${n(14 + 4 * Math.sin(t * 9))}" fill="#ff3b30"/>` + glow([980, 530], 500, '#ff2b2b', .45);
  return s + grade({ tint: '#7d8ac0', tintA: .45, vig: .85 });
}

export const CH1: Shot[] = [
  { a: 0, r: (t, lt) => bedroomShot(t, { kind: 'wide', lt: lt + .4, clock: '10:24' }) },
  // "Your phone starts screaming." → alert lines land on their words
  { a: at(1) - .15, r: (t, lt) => insertPhone(lt, [.3, S[2] - at(1) + .15, S[2] - at(1) + .75, S[3] - at(1) + .15, S[3] - at(1) + .55, S[4] - at(1) + .1], S[4] - at(1) - .25) },
  // "This is not a drill." — the words land on his face
  { a: S[4] + .42, r: (t, lt) => bedroomShot(t, { kind: 'react', lt, shockAt: .3 }) },
  // "The TV cuts to breaking news."
  { a: 7.42, r: (t, lt) => tvInRoom(t, { lt, zoom: 1.32 + lt * .06, headline: 'MISSILE LAUNCHES REPORTED', sub: 'Emergency alerts issued across the region', ticker: 'SEEK SHELTER IMMEDIATELY • OFFICIALS URGE CALM • MORE TO FOLLOW •', breakingAt: .15, face: expr('worried') }) + grade({ vig: .7 }) },
  // "Somewhere, a radar screen fills with red."
  { a: at(5), r: (t, lt) => radarScreen(t, lt, [[-.8, .55, S[5] + .5], [-.6, .7, S[5] + .75], [-.95, .4, S[5] + .95], [-.7, .35, S[5] + 1.1], [-1.1, .62, S[5] + 1.25]], t > S[5] + .9 ? 1 : 0) },
  // "...someone has minutes to decide whether those dots are real."
  { a: at(6), r: (t, lt, d) => {
    const k = inOut(range(lt, 1.6, d));
    return commandCenter(t, { theme: 'teal', alert: 1, standUp: outBack(range(lt, .3, .8)), blips: [[-.8, .55, 0], [-.6, .7, 0], [-.95, .4, 0], [-.7, .35, 0], [-1.1, .62, 0]],
      tracks: [{ from: [.45, -.05], to: [-.4, .05], t0: S[6] - .5, dur: 6 }, { from: [.55, .1], to: [-.5, -.1], t0: S[6], dur: 6 }], rightText: ['TRACKS    5', 'CONFIDENCE  ??', 'IMPACT  T-12:40', 'ASSESS NOW!'],
      officer: { face: { ...expr('focused', 'fear', range(lt, 2.2, 3.4)), gx: -.6, gy: -.35 }, pose: { headTilt: -.05, handA: [-.02, -3.02], bendA: 2, handB: [.35, -1.75], shapeA: 'fist' } },
      cam: { x: track(k, [[0, 960], [1, 1000]]), y: track(k, [[0, 520], [1, 560]]), zoom: track(k, [[0, 1.0], [1, 1.9]]) } });
  } },
  // "Because if they get it wrong, tonight is the night World War Three begins."
  { a: at(7), r: (t, lt) => cityScape(t, { sky: 'night', cam: { x: 960, y: 690 - lt * 18, zoom: 1.3 + lt * .02 }, lit: .2 + lt * .08, sirens: 1, searchlights: 1, stars: .6, poles: true }) + grade({ tint: '#8a90c8', tintA: .25, vig: .6 }) },
  // "And the scariest part?"
  { a: at(8), r: (t, lt) => eyeECU(t, lt) },
  // "It could all start with a mistake."
  { a: at(9), r: (t, lt) => radarScreen(t, lt, [[-.8, .5, 0]], 0, 'EARLY WARNING · SINGLE TRACK', clamp((lt - .45) * 3)) + glitchBars(t, range(lt, .9, 1.2)) },
  // title, then "Let's rewind." tape-rewind streaks
  { a: S[9] + 1.15, r: (t, lt) => {
    const rw = range(t, S[10] - .05, S[11] - .1);
    let s = titleCard(lt, 9) + glitchBars(t, 1 - range(lt, 0, .35));
    if (rw > 0) for (let i = 0; i < 26; i++) { const y = hash(i * 3.1) * H, x = W - ((rw * 3000 + hash(i) * 2400) % (W + 600)); s += `<rect x="${n(x)}" y="${n(y)}" width="${n(240 + hash(i + 7) * 400)}" height="${n(2 + hash(i + 2) * 5)}" fill="#fff" opacity="${n(.5 * rw)}"/>`; }
    if (rw > 0) s += txt(1780, 120, '◀◀ REW', 40, { anchor: 'end', weight: 900, op: Math.sin(t * 10) > 0 ? 1 : .3 }) + `<rect width="${W}" height="${H}" fill="#fff" opacity="${n(outCubic(range(rw, .7, 1)) * .9)}"/>`;
    return s;
  } },
];
