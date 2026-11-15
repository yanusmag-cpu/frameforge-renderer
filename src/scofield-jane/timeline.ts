import raw from './shots.json';
import type {Action,Cast} from './motion';
export type Shot={id:string;start:number;end:number;environment:string;focus:Cast|'both';action:Action;camera:string};
export const SHOTS=raw as Shot[];
export const FPS=30,FRAMES=12487;
export function shotAt(frame:number){if(!Number.isFinite(frame)||frame<0||frame>=FRAMES)throw new RangeError('Frame outside film');return SHOTS.find(s=>frame>=s.start&&frame<s.end)!;}
export function chunks(){return Array.from({length:Math.ceil(FRAMES/300)},(_,index)=>({index,start:index*300,end:Math.min(FRAMES,(index+1)*300)-1,frames:Math.min(300,FRAMES-index*300)}));}
