// bath film: sets and props to load (its pictures are all modelled, so no painted boards are needed).
import type { SetSpec } from '../engine9.ts';
export const BATH_SETS: SetSpec[] = [{ name: 'beach', glb: 'beach.glb' }];
export const BATH_PROPS: { id: string; glb: string }[] = [{ id: 'machine', glb: 'machine.glb' }];
export const bathBoards: ((g: CanvasRenderingContext2D, tag: string) => void) | undefined = undefined;
