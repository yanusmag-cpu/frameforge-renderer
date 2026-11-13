// Shot timeline primitives. Shots are keyed to measured narration times; a shot lasts until the next shot's start.
import { S } from './vo.ts';
export type Shot = { a: number; r: (t: number, lt: number, d: number) => string; tr?: 'cut' | 'white' | 'black' | 'flash' };
/** cut point for sentence i: visuals land 3 frames before the word. */
export const at = (i: number) => S[i] - .1;
