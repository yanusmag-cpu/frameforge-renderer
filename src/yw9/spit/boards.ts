// spit film: sets and props to load (its pictures are all modelled, so no painted boards are needed).
import type { SetSpec } from '../engine9.ts';
export const SPIT_SETS: SetSpec[] = [{ name: 'kitchen', glb: 'kitchen.glb' }];
export const SPIT_PROPS: { id: string; glb: string }[] = [{ id: 'mech', glb: 'mech.glb' }];
export const spitBoards: ((g: CanvasRenderingContext2D, tag: string) => void) | undefined = undefined;
