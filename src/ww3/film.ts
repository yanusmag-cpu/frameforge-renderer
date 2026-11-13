// WW3 film assembly: dispatch absolute film time T to the active shot; transitions; global finishing.
import { clamp, range } from '../ff2d/motion.ts';
import { grain, H, svgDoc, W } from '../ff2d/stage.ts';
import { CH1 } from './ch1.ts';
import { CH2 } from './ch2.ts';
import { CH3 } from './ch3.ts';
import { CH4 } from './ch4.ts';
import { CH5 } from './ch5.ts';
import { CH6 } from './ch6.ts';
import { CH7 } from './ch7.ts';
import { CH8 } from './ch8.ts';
import { CH9 } from './ch9.ts';
import type { Shot } from './shot.ts';
import { FILM_SECONDS } from './vo.ts';

export const SHOTS: Shot[] = [...CH1, ...CH2, ...CH3, ...CH4, ...CH5, ...CH6, ...CH7, ...CH8, ...CH9].sort((a, b) => a.a - b.a);

export function filmFrame(T: number): string {
  let i = SHOTS.length - 1;
  while (i > 0 && SHOTS[i].a > T) i--;
  const sh = SHOTS[i], end = i + 1 < SHOTS.length ? SHOTS[i + 1].a : FILM_SECONDS;
  let body = sh.r(T, T - sh.a, end - sh.a);
  // transition into this shot
  const into = T - sh.a;
  if (sh.tr === 'white' && into < .5) body += `<rect width="${W}" height="${H}" fill="#fff" opacity="${(1 - clamp(into / .5)).toFixed(3)}"/>`;
  if (sh.tr === 'black' && into < .45) body += `<rect width="${W}" height="${H}" fill="#000" opacity="${(1 - clamp(into / .45)).toFixed(3)}"/>`;
  if (sh.tr === 'flash' && into < .25) body += `<rect width="${W}" height="${H}" fill="#fff" opacity="${(1 - range(into, 0, .25)).toFixed(3)}"/>`;
  return svgDoc(body + grain(T, .035));
}
