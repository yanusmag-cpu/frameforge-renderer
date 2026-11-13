// FrameForge 2D engine — documentary UI: fact badges, chapter titles, kinetic type, lower thirds, counters, CTA.
import { clamp, inOut, outBack, outCubic, range } from './motion.ts';
import { txt, W } from './stage.ts';

const n = (x: number) => +x.toFixed(2);
export const FONT = 'Inter, Arial, sans-serif';
export const COL = { fiction: '#f2a93b', real: '#2fd1c5', alert: '#ff3b30', ink: '#0d1118', paper: '#f4f1ea' };

/** "FICTIONAL SCENARIO" / "REAL DATA · source" pill. a = 0..1 reveal. */
export function badge(kind: 'fiction' | 'real' | 'history', x: number, y: number, a: number, source?: string) {
  if (a <= 0) return '';
  const label = kind === 'fiction' ? 'FICTIONAL SCENARIO' : kind === 'real' ? 'REAL DATA' : 'REAL HISTORY';
  const c = kind === 'fiction' ? COL.fiction : COL.real;
  const w = label.length * 15.5 + 52, k = outBack(clamp(a));
  let s = `<g transform="translate(${n(x)} ${n(y)}) scale(${n(k)})" opacity="${n(clamp(a * 2))}">`;
  s += `<rect x="0" y="-22" width="${n(w)}" height="44" rx="22" fill="#0b0f16" fill-opacity=".78" stroke="${c}" stroke-width="3"/>`;
  s += `<circle cx="22" cy="0" r="7" fill="${c}"/>` + txt(38, 8, label, 22, { fill: c, weight: 800, ls: 1.5 });
  if (source) s += txt(4, 48, source, 18, { fill: '#e8edf5', weight: 500, op: .85 });
  return s + '</g>';
}

/** Kinetic chapter title: number tick + title wipe, holds, exits. lt = seconds since chapter start. */
export function chapterTitle(lt: number, num: number, title: string, dur = 2.6, x = 96, y = 150) {
  if (lt < 0 || lt > dur + .5) return '';
  const inK = outCubic(range(lt, 0, .45)), out = inOut(range(lt, dur, dur + .45));
  const a = inK * (1 - out);
  const w = title.length * 44 + 60;
  let s = `<g opacity="${n(a)}" transform="translate(${n(x - out * 40)} ${y})">`;
  s += `<rect x="0" y="-62" width="${n(8)}" height="${n(120 * inK)}" fill="${COL.alert}"/>`;
  s += txt(30, -26, `CHAPTER ${num}`, 24, { fill: '#ffffff', weight: 700, ls: 6, op: .8 });
  s += `<clipPath id="ct${num}"><rect x="24" y="-10" width="${n(w * inK)}" height="80"/></clipPath>`;
  s += `<g clip-path="url(#ct${num})">${txt(28, 46, title.toUpperCase(), 56, { weight: 900, ls: 1 })}</g>`;
  return s + '</g>';
}

/** Word-by-word kinetic caption (key phrases only). words timed at [t, word]. */
export function kinetic(t: number, words: [number, string][], x: number, y: number, size: number, o: { fill?: string; anchor?: 'start' | 'middle'; hold?: number; accent?: string[] } = {}) {
  const end = (words[words.length - 1]?.[0] ?? 0) + (o.hold ?? 1.6);
  if (t < words[0][0] - .1 || t > end + .4) return '';
  const fade = 1 - range(t, end, end + .4);
  let s = '';
  const widths = words.map(([, w]) => w.length * size * .8 + size * .36);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = o.anchor === 'middle' ? x - total / 2 : x;
  words.forEach(([wt, w], i) => {
    const k = outBack(range(t, wt, wt + .22));
    const acc = o.accent?.includes(w);
    if (k > 0) s += `<g transform="translate(${n(cx)} ${n(y + (1 - k) * 30)})" opacity="${n(clamp(k) * fade)}">${txt(0, 0, w, size, { fill: acc ? COL.alert : o.fill ?? '#fff', weight: 900 })}</g>`;
    cx += widths[i];
  });
  return s;
}

/** Lower third: title + sub, slides in from left. */
export function lowerThird(lt: number, title: string, sub: string, dur: number, accent = COL.alert) {
  if (lt < 0 || lt > dur + .5) return '';
  const k = outCubic(range(lt, 0, .4)) * (1 - inOut(range(lt, dur, dur + .4)));
  const w = Math.max(title.length * 22, sub.length * 12) + 70;
  return `<g transform="translate(${n(-w + k * (w + 80))} 900)"><rect x="0" y="0" width="${n(w)}" height="96" fill="#0b0f16" fill-opacity=".86"/><rect x="0" y="0" width="10" height="96" fill="${accent}"/>` +
    txt(32, 44, title, 34, { weight: 900 }) + txt(32, 78, sub, 20, { weight: 500, fill: '#c9d2e0' }) + '</g>';
}

/** Rolling counter number with thousands separators. */
export function counter(t: number, t0: number, t1: number, to: number, x: number, y: number, size: number, o: { fill?: string; suffix?: string; prefix?: string; anchor?: string } = {}) {
  const v = Math.round(to * outCubic(range(t, t0, t1)));
  return txt(x, y, `${o.prefix ?? ''}${v.toLocaleString('en-US')}${o.suffix ?? ''}`, size, { fill: o.fill ?? '#fff', weight: 900, anchor: o.anchor ?? 'middle' });
}

/** Small subscribe CTA chip that the hero can "press". press = 0..1, state flips at 1. */
export function subscribeChip(lt: number, x: number, y: number, press: number, dur: number) {
  if (lt < 0 || lt > dur + .5) return '';
  const k = outBack(range(lt, 0, .35)) * (1 - inOut(range(lt, dur, dur + .4)));
  const done = press >= 1;
  const sq = 1 - .08 * Math.sin(clamp(press) * Math.PI);
  let s = `<g transform="translate(${n(x)} ${n(y)}) scale(${n(k * sq)})" opacity="${n(clamp(k * 1.5))}">`;
  s += `<rect x="-150" y="-36" width="300" height="72" rx="36" fill="${done ? '#2b2f38' : '#e62117'}" stroke="#111" stroke-width="4"/>`;
  s += `<path d="M-112 -14 h34 a6 6 0 0 1 6 6 v16 a6 6 0 0 1 -6 6 h-34 a6 6 0 0 1 -6 -6 v-16 a6 6 0 0 1 6 -6Z" fill="#fff"/><path d="M-99 -8 L-86 0 L-99 8Z" fill="${done ? '#2b2f38' : '#e62117'}"/>`;
  s += txt(18, 10, done ? 'SUBSCRIBED' : 'SUBSCRIBE', 26, { weight: 900, anchor: 'middle', ls: 1 });
  if (done) { const r = outBack(range(press, 1, 1.4)); s += `<g transform="translate(176 0) scale(${n(r)})"><circle r="26" fill="#f4f1ea" stroke="#111" stroke-width="4"/><path d="M-9 6 h18 l-3 -4 v-6 a6 6 0 0 0 -12 0 v6Z M-3 9 a3 3 0 0 0 6 0" fill="#111"/></g>`; }
  return s + '</g>';
}

/** Full-width title card (film title). */
export function titleCard(lt: number, dur: number) {
  if (lt < 0 || lt > dur) return '';
  const k = outCubic(range(lt, 0, .5)), z = 1 + lt * .02;
  let s = `<rect width="${W}" height="1080" fill="#05070b"/>`;
  s += `<g transform="translate(960 540) scale(${n(z)})" opacity="${n(k)}">`;
  s += txt(0, -40, 'WHAT IF', 54, { anchor: 'middle', weight: 700, ls: 18, fill: '#c9d2e0' });
  s += txt(0, 60, 'WORLD WAR III', 128, { anchor: 'middle', weight: 900, ls: 4 });
  s += txt(0, 136, 'HAPPENED?', 54, { anchor: 'middle', weight: 700, ls: 18, fill: COL.alert });
  s += `<rect x="${n(-360 * k)}" y="160" width="${n(720 * k)}" height="4" fill="${COL.alert}"/>`;
  return s + '</g>';
}
