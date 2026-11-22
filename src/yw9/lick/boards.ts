// lick film: sets and props to load (its pictures are all modelled, so no painted boards are needed).
import type { SetSpec } from '../engine9.ts';
export const LICK_SETS: SetSpec[] = [{ name: 'market', glb: 'market.glb' }];
export const LICK_PROPS: { id: string; glb: string }[] = [{ id: 'barrow', glb: 'barrow.glb' }, { id: 'glass', glb: 'glass.glb' }, { id: 'cone', glb: 'cone.glb' }];
export const lickBoards: ((g: CanvasRenderingContext2D, tag: string) => void) | undefined = undefined;
