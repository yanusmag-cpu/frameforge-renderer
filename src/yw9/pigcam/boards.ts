// pigcam film: sets and props to load (its pictures are all modelled, so no painted boards are needed).
import type { SetSpec } from '../engine9.ts';
export const PIGCAM_SETS: SetSpec[] = [{ name: 'town', glb: 'town.glb', grass: 'town-grass.json' }, { name: 'shop', glb: 'shop.glb' }];
export const PIGCAM_PROPS: { id: string; glb: string }[] = [{ id: 'camera', glb: 'camera.glb' }];
export const pigcamBoards: ((g: CanvasRenderingContext2D, tag: string) => void) | undefined = undefined;
