export type V3=[number,number,number];
export const smooth=(a:number,b:number,t:number)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*u*(u*(u*6-15)+10);};
export const mix=(a:V3,b:V3,u:number):V3=>a.map((v,i)=>v+(b[i]-v)*u) as V3;
export function solveIK(start:V3,target:V3,a:number,b:number,pole:V3):{joint:V3;end:V3}{
 const delta=target.map((v,i)=>v-start[i]);const raw=Math.hypot(...delta);const d=Math.max(Math.abs(a-b)+.00001,Math.min(a+b-.00001,raw));const dir=raw<.0000001?[0,-1,0]:delta.map(v=>v/raw);
 const projection=pole.reduce((n,v,i)=>n+v*dir[i],0);let side=pole.map((v,i)=>v-projection*dir[i]);const len=Math.hypot(...side);side=len<.0001?(Math.abs(dir[2])>.9?[1,0,0]:[dir[1],-dir[0],0]):side.map(v=>v/len);
 const along=(a*a-b*b+d*d)/(2*d);const h=Math.sqrt(Math.max(0,a*a-along*along));
 return {joint:start.map((v,i)=>v+dir[i]*along+side[i]*h) as V3,end:start.map((v,i)=>v+dir[i]*d) as V3};
}
