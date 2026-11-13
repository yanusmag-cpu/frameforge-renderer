/** Locomotion (foot-planted gaits), the emu flocks, the truck and the Lewis gun. Pure functions of absolute time. */
import {CHASE,DAM,EV,OUTCROP,PADDOCK,REST,FARM,VO,add,clamp,cross,ground,hash,lerp,mix,noise,norm,pop,roadZ,scale,shotAt,smooth,sub,type SetId,type V3} from './story';

// ================================================================ gait: phase from integrated distance; feet planted exactly on the terrain
export interface Mover{key:string;t0:number;t1:number;at:(t:number)=>[number,number];phase0:number;hip:number;cycle:(v:number)=>number;stance:(v:number)=>number;lift:number;face0:[number,number];floor?:(x:number,z:number)=>number}
interface Samples{ph:Float64Array;v:Float64Array;n:number}
const DT=1/60;const SAMPLES=new Map<string,Samples>();
function samples(m:Mover):Samples{const hit=SAMPLES.get(m.key);if(hit)return hit;const n=Math.ceil((m.t1-m.t0)/DT)+2,ph=new Float64Array(n),v=new Float64Array(n);let prev=m.at(m.t0),acc=m.phase0;
 for(let i=0;i<n;i++){const t=m.t0+i*DT,p=m.at(t);const sp=i===0?Math.hypot(m.at(m.t0+DT)[0]-p[0],m.at(m.t0+DT)[1]-p[1])/DT:Math.hypot(p[0]-prev[0],p[1]-prev[1])/DT;if(i>0)acc+=sp/m.cycle(sp)*DT;ph[i]=acc;v[i]=sp;prev=p;}
 const s={ph,v,n};SAMPLES.set(m.key,s);return s;}
function sampleAt(arr:Float64Array,m:Mover,t:number){const f=clamp((t-m.t0)/DT,0,arr.length-1.001),i=Math.floor(f);return lerp(arr[i],arr[i+1],f-i);}
export const phaseAt=(m:Mover,t:number)=>sampleAt(samples(m).ph,m,t);
export const speedAt=(m:Mover,t:number)=>sampleAt(samples(m).v,m,t);
function timeAtPhase(m:Mover,target:number){const s=samples(m),ph=s.ph;
 if(target<=ph[0]){const v=Math.max(s.v[0],1e-3);return m.t0-(ph[0]-target)*m.cycle(v)/v;}
 if(target>=ph[s.n-1]){const v=s.v[s.n-1];return v<1e-3?m.t1:m.t1+(target-ph[s.n-1])*m.cycle(v)/v;}
 let lo=0,hi=s.n-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(ph[mid]<target)lo=mid;else hi=mid;}
 const u=(target-ph[lo])/Math.max(1e-9,ph[hi]-ph[lo]);return m.t0+(lo+u)*DT;}
export function headingAt(m:Mover,t:number):[number,number]{for(let k=0;k<40;k++){const a=m.at(t-.04-k*.05),b=m.at(t+.04-k*.05),dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(l>.004)return [dx/l,dz/l];}return m.face0;}
export interface Feet{l:V3;r:V3;bob:number;phase:number;speed:number;fwd:V3;right:V3;contact:[boolean,boolean]}
export function feet(m:Mover,t:number,width=1):Feet{const gr=m.floor??ground;const v=speedAt(m,t),P=phaseAt(m,t),[fx,fz]=headingAt(m,t),fwd:V3=[fx,0,fz],right:V3=[-fz,0,fx];const beta=m.stance(v);
 const plant=(c:number,side:number,off:number):V3=>{const tt=timeAtPhase(m,c-off),p=m.at(tt),[hx,hz]=headingAt(m,tt),vv=speedAt(m,clamp(tt,m.t0,m.t1)),reach=beta*m.cycle(vv)/2;
  const x=p[0]+hx*reach-hz*side*m.hip*width,z=p[1]+hz*reach+hx*side*m.hip*width;return [x,gr(x,z),z];};
 const p=m.at(t),stand=(side:number,fore:number):V3=>{const x=p[0]+fx*fore-fz*side*m.hip*width,z=p[1]+fz*fore+fx*side*m.hip*width;return [x,gr(x,z),z];};
 const w=smooth(.05,.5,v);const out:V3[]=[];const contact:[boolean,boolean]=[true,true];
 for(const [k,side] of [[0,-1],[1,1]] as const){const off=k*.5,q=P+off,n=Math.floor(q),u=q-n;let g:V3;
  if(u<beta)g=plant(n,side,off);else{const s=(u-beta)/(1-beta),A=plant(n,side,off),B=plant(n+1,side,off),e=s*s*(3-2*s);g=mix(A,B,e);g[1]+=m.lift*Math.sin(Math.PI*s)*clamp(.35+v*.12,0,1.2);contact[k]=false;}
  out.push(w<1?mix(stand(side,k?.04:-.04),g,w):g);if(w<.5)contact[k]=true;}
 const bob=w*(Math.cos(P*Math.PI*4)*.5+.5);return {l:out[0],r:out[1],bob,phase:P,speed:v,fwd,right,contact};}
/** Footfall times inside a window (for dust and footstep sounds). */
export function footfalls(m:Mover,a:number,b:number):{t:number;side:number}[]{const out:{t:number;side:number}[]=[];const pa=phaseAt(m,Math.max(a,m.t0)),pb=phaseAt(m,Math.min(b,m.t1));
 for(const [k,side] of [[0,-1],[1,1]] as const){const off=k*.5;for(let c=Math.ceil(pa+off);c<=pb+off;c++){const t=timeAtPhase(m,c-off);if(t>=a&&t<=b&&speedAt(m,t)>.6)out.push({t,side});}}return out;}

// ================================================================ emus
export type Mood='run'|'walk'|'graze'|'alert'|'peer'|'chew'|'proud'|'smug';
export interface Emu{id:string;mover:Mover;s:number;tone:number;mood:(t:number,v:number)=>Mood;lookCam?:(t:number)=>number;beak?:(t:number)=>number;lid?:(t:number)=>number;brow?:(t:number)=>number;hat?:(t:number)=>boolean;stalk?:(t:number)=>boolean;turnHead?:(t:number)=>number}
export const strHash=(k:string)=>{let h=7;for(let i=0;i<k.length;i++)h=(h*31+k.charCodeAt(i))%100003;return hash(h*.913);};
const emuCycle=(v:number)=>clamp(.75+.36*v,.75,4.4),emuStance=(v:number)=>lerp(.62,.32,clamp(v/9));
const mk=(key:string,t0:number,t1:number,at:(t:number)=>[number,number],face0:[number,number]=[1,0],s=1):Mover=>({key,t0,t1,at,phase0:strHash(key),hip:.11*s,cycle:v=>emuCycle(v/s)*s,stance:v=>emuStance(v/s),lift:.22*s,face0});
const speedMood=(v:number):Mood=>v>4?'run':v>.45?'walk':'graze';
/** accelerating run: distance after τ seconds reaching speed v with time constant k */
const runDist=(tau:number,v:number,k=1.6)=>tau<=0?0:v*(tau-(1-Math.exp(-k*tau))/k);

function hookFlock():Emu[]{const P=PADDOCK,out:Emu[]=[];
 for(let i=0;i<46;i++){const h=i*3.17,x0=P[0]-34+52*hash(h),z0=P[2]-20+40*hash(h+.4),v=9+3.5*hash(h+.8),w=hash(h+.2)*6;
  out.push({id:'hook'+i,mover:mk('hook'+i,0,4.75,t=>[x0-v*t,z0+1.2*Math.sin(t*1.3+w)]),s:.95+.15*hash(h+.6),tone:hash(h+.9),mood:()=>'run'});}
 // overtakers race past the soldiers from behind
 for(let i=0;i<9;i++){const h=i*5.31+100,x0=P[0]+42+18*hash(h),z0=P[2]-7+14*hash(h+.3),v=12.5+2*hash(h+.5);
  out.push({id:'over'+i,mover:mk('over'+i,0,4.75,t=>[x0-v*t,z0+.6*Math.sin(t*2+i)]),s:1.02,tone:hash(h+.7),mood:()=>'run'});}
 // heroes for the lens-grazing opener
 out.push({id:'lens1',mover:mk('lens1',0,4.75,t=>[P[0]+5+(.55-t)*12.5,P[2]+3.1]),s:1.08,tone:.3,mood:()=>'run',beak:t=>t<1?.35:0});
 out.push({id:'lens2',mover:mk('lens2',0,4.75,t=>[P[0]+5+(.98-t)*11.5,P[2]+.65]),s:1.05,tone:.6,mood:()=>'run'});
 // the emu that receives the gunner's hat at "LOST"
 out.push({id:'hatemu',mover:mk('hatemu',0,4.75,t=>[P[0]+2.6-12*(t-VO.lost),P[2]+.75]),s:1.08,tone:.15,mood:t=>t>VO.lost+.1?'proud':'run',hat:t=>t>=VO.lost,lookCam:t=>t>VO.lost+.15?smooth(VO.lost+.15,VO.lost+.4,t):0,lid:t=>t>VO.lost+.25?.45:0});
 return out;}

function farmFlock():Emu[]{const out:Emu[]=[];const cx=-152,cz=-24;
 for(let i=0;i<150;i++){const h=i*2.71+300,x0=cx-85+170*hash(h),z0=cz-55+110*hash(h+.31),dir=hash(h+.6)*Math.PI*2,sp=.25+.5*hash(h+.8);
  out.push({id:'farm'+i,mover:mk('farm'+i,4.6,11.3,t=>{const q=t-4.6;return [x0+Math.cos(dir+.3*Math.sin(q*.4+i))*sp*q,z0+Math.sin(dir+.3*Math.sin(q*.4+i))*sp*q];},[Math.cos(dir),Math.sin(dir)]),s:.92+.18*hash(h+.2),tone:hash(h+.5),
   mood:t=>(Math.sin(t*1.7+i*1.3)>.1?'graze':'walk')});}
 // E05 heads pop up out of the wheat (camera at the field's east edge looking west)
 const pops:[number,number,number][]=[[-58.5,-4.5,0],[-61,-1.2,1],[-57.2,-.6,2],[-63.5,-6.2,3],[-60,-8.3,4]];
 for(const [x,z,k] of pops)out.push({id:'pop'+k,mover:mk('pop'+k,4.6,11.3,()=>[x,z],[1,.1]),s:1.05,tone:k/5,mood:t=>t<EV.popHeads[k]?'graze':'alert',lookCam:t=>smooth(EV.popHeads[k]+.1,EV.popHeads[k]+.35,t),beak:t=>k===2&&t>7.7?.6*Math.abs(Math.sin(t*14)):0,brow:t=>k%2&&t>EV.popHeads[k]?.6:0});
 // E06 the horde pours over the north fence into the crop
 for(let i=0;i<260;i++){const h=i*1.93+900,x0=-236+170*hash(h),z0=-97-14*hash(h+.4),v=3.8+2.4*hash(h+.7);
  out.push({id:'horde'+i,mover:mk('horde'+i,4.6,11.3,t=>[x0+.8*Math.sin(t+i),z0+v*(t-8.6)]),s:.95+.15*hash(h+.3),tone:hash(h+.6),mood:(t,v)=>speedMood(v)});}
 // E07 the wheat thief chewing in front of the farmer
 out.push({id:'thief',mover:mk('thief',4.6,11.3,()=>[-71.5,9.6],[-.2,1]),s:1.1,tone:.4,mood:t=>t<EV.gulp+.25?'chew':'smug',beak:t=>t<EV.gulp?.45*Math.abs(Math.sin(t*9)):0,lookCam:t=>smooth(EV.gulp+.2,EV.gulp+.45,t),lid:t=>t>EV.gulp+.3?.5:0});
 return out;}

export const GUN_PADDOCK:V3=[PADDOCK[0]-30,0,PADDOCK[2]+2];
function paddockFlock():Emu[]{const out:Emu[]=[];const C:V3=[PADDOCK[0]+6,0,PADDOCK[2]];
 for(let i=0;i<170;i++){const h=i*2.37+2000,r=4+20*Math.sqrt(hash(h)),a0=hash(h+.2)*Math.PI*2,x0=C[0]+Math.cos(a0)*r,z0=C[2]+Math.sin(a0)*r*.8;
  const away=Math.atan2(z0-GUN_PADDOCK[2],x0-GUN_PADDOCK[0]),dirA=away+(hash(h+.5)-.5)*Math.PI*1.9,v=10.5+3*hash(h+.7),zz=hash(h+.9)*6,st=EV.scatter+.25*hash(h+.33);
  const pos=(t:number):[number,number]=>{const g=.3*Math.sin(t*.35+i);const bx=x0+g,bz=z0+.3*Math.cos(t*.3+i);if(t<st)return [bx,bz];const d=runDist(t-st,v),side=1.4*Math.sin((t-st)*3.1+zz)*smooth(0,.6,t-st);
   return [bx+Math.cos(dirA)*d-Math.sin(dirA)*side,bz+Math.sin(dirA)*d+Math.cos(dirA)*side];};
  out.push({id:'pad'+i,mover:mk('pad'+i,15.0,21.7,pos,[Math.cos(a0+1.6),Math.sin(a0+1.6)]),s:.93+.17*hash(h+.15),tone:hash(h+.45),mood:(t,v)=>t<VO.aim?(Math.sin(t*1.9+i)>-.2?'graze':'walk'):v>2?'run':'alert',lookCam:t=>t>=VO.aim&&t<EV.scatter?1:0});}
 // zig-zaggers that cross right in front of the gun (E12)
 for(let i=0;i<10;i++){const h=i*4.1+3000,zs=GUN_PADDOCK[2]+(i%2?1:-1)*(9+5*hash(h)),x0=GUN_PADDOCK[0]+7+16*hash(h+.3),t0=19.0+.12*i;
  out.push({id:'zig'+i,mover:mk('zig'+i,15.0,21.7,t=>{const u=t-t0;return [x0+2.2*Math.sin(u*4.2+i),zs-(i%2?1:-1)*runDist(u,12)];},[0,i%2?-1:1]),s:1,tone:hash(h+.6),mood:()=>'run'});}
 // the peeker: arrives beside the soldiers and stares (E13)
 out.push({id:'peeker',mover:mk('peeker',15.0,21.7,t=>{const st=add(GUN_PADDOCK,[1.25,0,1.15]);const from:V3=[GUN_PADDOCK[0]+24,0,GUN_PADDOCK[2]+6];const u=smooth(18.6,20.6,t);return [lerp(from[0],st[0],u),lerp(from[2],st[2],u)];},[-1,0]),
  s:1.08,tone:.55,mood:t=>t<20.6?'run':'peer',lookCam:t=>smooth(20.85,21.0,t),lid:t=>Math.abs(t-EV.blink)<.07?1:0,brow:()=>.4});
 return out;}

function damFlock():Emu[]{const out:Emu[]=[];
 for(let i=0;i<220;i++){const h=i*2.03+4000,x0=DAM[0]-34+68*hash(h),z0=DAM[2]-70-45*hash(h+.4),v=1.2+.9*hash(h+.2);const shoreZ=DAM[2]-Math.sqrt(Math.max(0,19.5**2-(x0-DAM[0])**2))-1.2-6*hash(h+.6);
  const flee=Math.PI*(1.1+.8*hash(h+.8)),st=EV.jam+.15+.3*hash(h+.5),vr=10+3*hash(h+.1);
  const pos=(t:number):[number,number]=>{const z=Math.min(shoreZ,z0+v*(t-21.4)),zx:[number,number]=[x0+.4*Math.sin(t*.7+i),z];if(t<st)return zx;const d=runDist(t-st,vr);return [zx[0]+Math.cos(flee)*d,zx[1]+Math.sin(flee)*d];};
  out.push({id:'dam'+i,mover:mk('dam'+i,21.4,25.5,pos,[0,1]),s:.94+.16*hash(h+.3),tone:hash(h+.7),mood:(t,v)=>v>3?'run':v>.4?'walk':(Math.sin(t*2+i)>0?'graze':'alert')});}
 return out;}

export function truckChaseX(t:number){return CHASE.x0+CHASE.v*(t-CHASE.t0);}
function chaseFlock():Emu[]{const out:Emu[]=[];
 for(let i=0;i<34;i++){const h=i*3.3+5000,lead=-6+22*hash(h),z0=(hash(h+.4)-.5)*26,v=CHASE.v+1.6+2.4*hash(h+.6);
  out.push({id:'chase'+i,mover:mk('chase'+i,25.3,29.3,t=>[CHASE.x0+lead+v*(t-CHASE.t0),z0+1.5*Math.sin(t*1.3+i)]),s:.98+.12*hash(h+.2),tone:hash(h+.5),mood:()=>'run'});}
 out.push({id:'smugrunner',mover:mk('smugrunner',25.3,29.3,t=>[CHASE.x0+7+(CHASE.v+2.2)*(t-CHASE.t0),-2.3]),s:1.08,tone:.25,mood:()=>'run',turnHead:t=>smooth(28.05,28.3,t)*(1-smooth(28.85,29.1,t)),lid:t=>t>28.25&&t<28.9?.5:0,lookCam:t=>smooth(28.05,28.3,t)*(1-smooth(28.85,29.1,t))});
 return out;}

export const SUMMIT:V3=[OUTCROP[0],0,OUTCROP[2]];export const summitY=()=>ground(OUTCROP[0],OUTCROP[2])+3.66;
function hillFlock():Emu[]{const out:Emu[]=[];
 out.push({id:'victor',mover:{...mk('victor',34.1,40.1,()=>[SUMMIT[0],SUMMIT[2]],[-1,.15],1.12),floor:()=>summitY()},s:1.12,tone:.35,mood:t=>t<EV.turn?'proud':'smug',stalk:t=>t>=EV.stalk,lookCam:t=>smooth(EV.turn,EV.turn+.35,t),
  lid:t=>t<EV.smug?0:t<EV.smug+.12?1:.52,brow:t=>t>EV.smug?-.5:0,beak:()=>0});
 for(let i=0;i<14;i++){const h=i*2.9+6000,x0=OUTCROP[0]-70-90*hash(h),z0=OUTCROP[2]-40+80*hash(h+.3);out.push({id:'far'+i,mover:mk('far'+i,34.1,40.1,t=>[x0+.3*t,z0],[1,0]),s:1,tone:hash(h+.5),mood:t=>Math.sin(t+i)>0?'graze':'alert'});}
 return out;}

const FLOCKS=new Map<string,Emu[]>();
function flock(set:SetId):Emu[]{const key=set;let f=FLOCKS.get(key);if(!f){f=set==='paddock'?[...hookFlock(),...paddockFlock()]:set==='farm'?farmFlock():set==='dam'?damFlock():set==='chase'?chaseFlock():set==='hill'?hillFlock():[];FLOCKS.set(key,f);}return f;}
export function emusAt(t:number):Emu[]{const s=shotAt(t);return flock(s.set).filter(e=>t>=e.mover.t0&&t<=e.mover.t1&&(s.set!=='paddock'||(t<4.75?!e.id.startsWith('pad')&&!e.id.startsWith('zig')&&e.id!=='peeker':!e.id.startsWith('hook')&&!e.id.startsWith('over')&&!e.id.startsWith('lens')&&e.id!=='hatemu')));}

/** Full articulated pose for one emu. */
export interface EmuPose{id:string;s:number;tone:number;body:V3;fwd:V3;up:V3;right:V3;feet:[V3,V3];neck:V3[];head:V3;headFwd:V3;headUp:V3;beak:number;lid:number;brow:number;gaze:V3|null;hat:boolean;stalk:boolean;speed:number;phase:number;contact:[boolean,boolean]}
export const EMU={hipY:-.12,hipX:-.04,neckBase:[.36,.2,0] as V3,stand:1.0,thigh:.42,tarsus:.48};
function bez(a:V3,b:V3,c:V3,u:number):V3{const v=1-u;return [a[0]*v*v+2*b[0]*u*v+c[0]*u*u,a[1]*v*v+2*b[1]*u*v+c[1]*u*u,a[2]*v*v+2*b[2]*u*v+c[2]*u*u];}
export function emuPose(e:Emu,t:number,eye:V3):EmuPose{const m=e.mover,s=e.s,f=feet(m,t,1),v=f.speed,mood=e.mood(t,v);const p=m.at(t);const gy=(m.floor??ground)(p[0],p[1]);
 const run=clamp(v/(9*s)),lean=.06+.2*run;const fwdH=f.fwd;const fwd=norm(add(scale(fwdH,Math.cos(lean)),[0,-Math.sin(lean),0]));const right=f.right;const up=norm(cross(right,fwd));
 const crouch=mood==='graze'?.05:0;const bodyY=gy+(EMU.stand-.1*run-crouch)*s-(.05+.06*run)*s*f.bob+.02*s*Math.sin(t*2.1+e.tone*9)*(1-run);
 const body:V3=[p[0],bodyY,p[1]];const B=(l:V3):V3=>add(body,add(add(scale(fwd,l[0]*s),scale(up,l[1]*s)),scale(right,l[2]*s)));
 const base=B(EMU.neckBase);const look=e.lookCam?e.lookCam(t):0;const toCam=norm(sub(eye,base));
 // head target in the horizontal heading frame
 const ph=f.phase*Math.PI*4;let hf=.42,hu=.8,side=0,peck=0;
 if(mood==='run'){hf=.62+.04*Math.sin(ph);hu=.64+.06*f.bob;}
 else if(mood==='walk'){hf=.46+.06*Math.sin(ph*.5);hu=.78;}
 else if(mood==='graze'){const cyc=(t*1.3+e.tone*7)%3;peck=cyc<1.6?Math.abs(Math.sin(cyc*Math.PI/1.6*3))*.08:0;hf=.62;hu=-.62+peck-(EMU.stand-1)*0;}
 else if(mood==='alert'||mood==='peer'){hf=.3;hu=.95;side=.03*Math.sin(t*3+e.tone*5);}
 else if(mood==='chew'){hf=.5;hu=.6+.03*Math.sin(t*9);}
 else if(mood==='proud'||mood==='smug'){hf=.22;hu=1.0;}
 const tH=e.turnHead?e.turnHead(t):0;const hRight=add(scale(right,Math.cos(tH*2.4)),scale(fwdH,-Math.sin(tH*2.4)));const hFwd0=add(scale(fwdH,Math.cos(tH*2.4)),scale(right,Math.sin(tH*2.4)));
 let head=add(add(add([body[0],gy+(EMU.stand)*s,body[2]],scale(hFwd0,hf*s)),[0,hu*s,0]),scale(hRight,side*s));
 if(mood==='graze')head[1]=Math.max(head[1],(m.floor??ground)(head[0],head[2])+.12*s+peck*s);
 if(look>0&&(mood==='peer'||mood==='alert'||mood==='proud'||mood==='smug')){const lean2=scale(norm([toCam[0],0,toCam[2]]),.12*s*look);head=add(head,lean2);}
 const ctrl=add(base,[0,(hu>.3?.32:.05)*s,0]);const neck:V3[]=[];for(let i=0;i<=6;i++)neck.push(bez(base,ctrl,head,i/6));
 let headFwd=norm(add(scale(hFwd0,1),[0,mood==='graze'?-1.2:mood==='run'?-.15:-.05,0]));if(look>0)headFwd=norm(mix(headFwd,toCam,look*.85));
 const headUp=norm(cross(cross(headFwd,[0,1,0]),headFwd));
 const beak=e.beak?e.beak(t):mood==='run'?.12+.1*Math.max(0,Math.sin(ph*.5)):0;const lid=e.lid?e.lid(t):(((t+e.tone*4)%3.4)<.12?1:0);
 return {id:e.id,s,tone:e.tone,body,fwd,up,right,feet:[f.l,f.r],neck,head,headFwd,headUp,beak,lid,brow:e.brow?e.brow(t):0,gaze:look>.5?eye:null,hat:e.hat?e.hat(t):false,stalk:e.stalk?e.stalk(t):false,speed:v,phase:f.phase,contact:f.contact};}
export function emuPoses(t:number,eye:V3){return emusAt(t).map(e=>emuPose(e,t,eye));}
export function emuMover(id:string,set:SetId){return flock(set).find(e=>e.id===id)!;}

// ================================================================ the truck
export interface TruckState{visible:boolean;pos:V3;yaw:number;pitch:number;roll:number;spin:number;steer:number;canopy:boolean;air:number;steam:number;speed:number}
function truckPath(t:number):{x:number;z:number;yaw:number;v:number;s:number}|null{const set=shotAt(t).set;
 if(set==='road'){const u=clamp((t-10.55)/1.6);const x=t<10.55?-17.2-9*(10.55-t):-10-7.2*(1-u)*(1-u);const v=t<10.55?9:9*(1-u);return {x,z:roadZ(x)-.9,yaw:Math.atan2(-(roadZ(x+1)-roadZ(x-1))/2,1),v,s:x};}
 if(set==='chase'){const x=truckChaseX(t),z=1.4*Math.sin(t*.9)-1;return {x,z,yaw:-Math.atan2(1.4*.9*Math.cos(t*.9),CHASE.v),v:CHASE.v,s:x};}
 if(set==='rest'){return {x:REST[0]+8,z:REST[2]-6,yaw:.5,v:0,s:0};}
 if(set==='hill'){const d=11+8.5*(t-34.2),sx=-.92/Math.hypot(.92,.36),sz=.36/Math.hypot(.92,.36);const x=OUTCROP[0]-4+sx*d+2.5*sz,z=OUTCROP[2]+9+sz*d-2.5*sx;return {x,z,yaw:Math.atan2(-sz,sx),v:8.5,s:d};}
 return null;}
const WB={f:1.45,r:-1.85,w:.82};
export function truckAt(t:number):TruckState{const p=truckPath(t);if(!p)return {visible:false,pos:[0,0,0],yaw:0,pitch:0,roll:0,spin:0,steer:0,canopy:true,air:0,steam:0,speed:0};
 const c=Math.cos(p.yaw),s=Math.sin(p.yaw);const at=(lx:number,lz:number)=>{const x=p.x+lx*c+lz*s,z=p.z-lx*s+lz*c;return ground(x,z);};
 // low-passed wheel contacts give the sprung body its suspension motion
 const k=(lx:number,lz:number)=>{let a=0,w=0;for(let i=0;i<5;i++){const d=i*.18*Math.min(1,p.v/6),wt=Math.exp(-i*.7);a+=at(lx-d,lz)*wt;w+=wt;}return a/w;};
 const fl=k(WB.f,-WB.w),fr=k(WB.f,WB.w),rl=k(WB.r,-WB.w),rr=k(WB.r,WB.w);const fy=(fl+fr)/2,ry=(rl+rr)/2;let y=(fy+ry)/2,pitch=Math.atan2(fy-ry,WB.f-WB.r),roll=Math.atan2((fl+rl)/2-(fr+rr)/2,2*WB.w);
 let air=0;const set=shotAt(t).set;
 if(set==='chase'){const a=t-EV.bump;if(a>0&&a<.24)air=Math.sin(a/.24*Math.PI)*.75;const after=t-EV.land;if(after>0)y-=.12*Math.exp(-after*5)*Math.cos(after*18);pitch+=a>0&&a<.24?.12*Math.sin(a/.24*Math.PI):0;
  y+=.035*Math.sin(t*23)+.025*Math.sin(t*31+1);roll+=.03*Math.sin(t*7.3);pitch+=.02*Math.sin(t*9.1);}
 if(set==='road'){const a=t-EV.truckStop;if(a>0)pitch-=.045*Math.exp(-a*3.5)*Math.cos(a*9);y+=.01*Math.sin(t*20)*(p.v/9);}
 if(set==='rest'||set==='road'&&t>EV.truckStop)y+=.004*Math.sin(t*31);
 return {visible:true,pos:[p.x,y+air,p.z],yaw:p.yaw,pitch,roll,spin:p.s/.53,steer:set==='chase'?.12*Math.sin(t*1.7):0,canopy:set!=='chase',air,steam:set==='rest'?1:0,speed:p.v};}
/** truck-local → world (local x forward, y up, z right) */
export function truckToWorld(tr:TruckState,l:V3):V3{const cp=Math.cos(tr.pitch),sp=Math.sin(tr.pitch),cr=Math.cos(tr.roll),sr=Math.sin(tr.roll);let [x,y,z]=l;
 [y,z]=[y*cr-z*sr,y*sr+z*cr];[x,y]=[x*cp-y*sp,x*sp+y*cp];const c=Math.cos(tr.yaw),s=Math.sin(tr.yaw);return [tr.pos[0]+x*c+z*s,tr.pos[1]+y,tr.pos[2]-x*s+z*c];}

// ================================================================ the Lewis gun
export interface GunState{visible:boolean;pos:V3;yaw:number;pitch:number;roll:number;tripod:boolean;tripodScale:number;pan:number;bolt:number;flash:number;panOnGun:boolean;spring:{pos:V3;rot:number}|null;casings:{pos:V3;rot:V3}[]}
const BURST=[EV.burst,EV.jam];
export function gunAt(t:number):GunState{const set=shotAt(t).set;const none:GunState={visible:false,pos:[0,0,0],yaw:0,pitch:0,roll:0,tripod:true,tripodScale:1,pan:0,bolt:0,flash:0,panOnGun:true,spring:null,casings:[]};
 if(set==='road'){const x=-7.3,z=roadZ(-7.3)-4.2;const g=ground(x,z)+.64;const drop=smooth(13.3,EV.tripodClank,t);const y=t<13.3?g+.55:lerp(g+.55,g,drop)+(t>EV.tripodClank?.03*Math.exp(-(t-EV.tripodClank)*9)*Math.cos((t-EV.tripodClank)*30):0);
  return t<12.9?none:{...none,visible:true,pos:[x+.3*(1-drop),y,z],yaw:Math.PI/2-.35,pitch:.05,tripod:t>=13.3};}
 if(set==='paddock'&&t>=15.0){const G=GUN_PADDOCK,y=ground(G[0],G[2])+.64;let yaw=0;
  if(t>=EV.swings[0]&&t<20.3){const sw=EV.swings;yaw=t<sw[1]?lerp(0,.55,smooth(sw[0],sw[0]+.18,t)):t<sw[2]?lerp(.55,-.6,smooth(sw[1],sw[1]+.18,t)):lerp(-.6,.35,smooth(sw[2],sw[2]+.18,t));}
  return {...none,visible:true,pos:[G[0],y,G[2]],yaw,pitch:-.02+(t>=VO.aim&&t<EV.scatter?.0:0)};}
 if(set==='dam'){const G:V3=[DAM[0]+1.8,0,DAM[2]+21.2],y=ground(G[0],G[2])+.36;const firing=t>=BURST[0]&&t<BURST[1];const rec=firing?.012*Math.sin(t*90):0;
  const casings:{pos:V3;rot:V3}[]=[];for(let i=0;i<10;i++){const born=BURST[0]+i*.1;const a=t-born;if(a<0||a>1.2||born>BURST[1])continue;casings.push({pos:[G[0]-.1+.15*a,y+.06+1.6*a-4.9*a*a,G[2]+.15+.9*a*(1+hash(i)*.4)],rot:[a*20,a*13+i,a*7]});}
  const yank=smooth(EV.yank-.05,EV.yank+.08,t)*(1-smooth(EV.yank+.3,EV.yank+.5,t));const sp=t-EV.spring;
  return {...none,visible:true,pos:[G[0]+rec,y,G[2]+rec*.3],yaw:Math.PI/2-.03+.02*noise(t*7),pitch:.03,tripodScale:.55,pan:firing?(t-BURST[0])*9:(BURST[1]-BURST[0])*9,bolt:yank*.11,flash:firing&&(Math.floor(t*20)%2===0)?1:0,
   spring:sp>0&&sp<1.4?{pos:[G[0]-.06+.3*sp,y+.12+2.2*sp-4.9*sp*sp,G[2]+.07+.4*sp],rot:sp*14}:null,casings};}
 if(set==='chase'){const tr=truckAt(t);const mount=truckToWorld(tr,[-1.55,1.62,0]);return {...none,visible:true,pos:mount,yaw:tr.yaw+.15*Math.sin(t*5.3),pitch:tr.pitch+.55+.25*Math.sin(t*7.7)+(t>EV.bump&&t<EV.land+.3?.4:0),roll:tr.roll,tripod:false};}
 if(set==='rest'){const p:V3=[REST[0]+2.2,0,REST[2]+1.8];return {...none,visible:true,pos:[p[0],ground(p[0],p[2])+.08,p[2]],yaw:2.2,pitch:0,roll:1.35,tripod:false,panOnGun:false};}
 return none;}
export const FARMER_SPOT:V3=[-69.5,0,12.8];
export {FARM};
