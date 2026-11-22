// knock film: sets and props to load (its pictures are all modelled, so no painted boards are needed).
import type { SetSpec } from '../engine9.ts';
export const KNOCK_SETS: SetSpec[] = [{ name: 'street', glb: 'street.glb' }, { name: 'bedroom', glb: 'bedroom.glb' }];
export const KNOCK_PROPS: { id: string; glb: string }[] = [];
export const knockBoards: ((g: CanvasRenderingContext2D, tag: string) => void) | undefined = undefined;
