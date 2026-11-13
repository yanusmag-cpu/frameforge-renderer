/** Cinematography: one authored camera per shot, purposeful shake, whip pans (with blur amount) and push-ins. */
import {CHASE,DAM,EV,FARM,OUTCROP,PADDOCK,REST,SKY,VO,add,clamp,ease,ground,lerp,mix,noise,norm,roadZ,scale,shotAt,smooth,sub,type V3} from './story';
import {GUN_PADDOCK,FARMER_SPOT,SUMMIT,emuMover,emuPose,gunAt,summitY,truckAt,truckChaseX} from './motion';

export interface CameraPose{eye:V3;target:V3;fov:number;roll:number;up?:V3;blur:number;blurDir:number}
const g=(x:number,z:number,y=0):V3=>[x,ground(x,z)+y,z];
/** impacts that shake the camera: [time, strength, decay seconds] */
const IMPACTS:[number,number,number][]=[[EV.faceplant,1,.5],[VO.lost,.5,.35],[EV.truckStop,.4,.4],[EV.tripodClank,.5,.3],[VO.aim,.35,.3],[EV.scatter,.6,.8],[EV.jam,.7,.4],[EV.spring,.4,.3],[EV.bump,1,.6],[EV.land,1.2,.6],[EV.stamp,.8,.5]];
export function impact(t:number){let v=0;for(const [a,k,d] of IMPACTS){const u=t-a;if(u>=0&&u<d*3)v=Math.max(v,k*Math.exp(-u/d*2.2));}return v;}
/** whip pan: returns 0..1 progress and a blur amount peaking mid-whip */
const whip=(a:number,d:number,t:number)=>{const u=smooth(a,a+d,t);return {u,blur:t>a&&t<a+d?Math.sin(Math.PI*(t-a)/d):0};};
export function cameraPose(t:number):CameraPose{const s=shotAt(t),P=PADDOCK;let c:CameraPose={eye:[0,2,5],target:[0,1,0],fov:45,roll:0,blur:0,blurDir:0};let shake=0;
 switch(s.id){
 case'E01':{const back=smooth(.7,1.6,t);c={eye:g(P[0]+5-2.2*back,P[2]+2.0,.3+.1*back),target:g(P[0]+14,P[2]+1.4,1.0),fov:64,roll:-.04,blur:0,blurDir:0};
  const near=Math.max(0,1-Math.abs(t-.55)*4)+Math.max(0,1-Math.abs(t-.98)*4);shake=.35+.6*near;break;}
 case'E02':{const w=whip(1.6,.2,t);const k=ease(1.7,3.3,t);const look=mix(g(P[0]+14,P[2]+1.4,1),g(P[0]-14-4*k,P[2],.6),w.u);
  c={eye:mix(g(P[0]+9,P[2]+5,1.3),g(P[0]+19,P[2]+13,8.5),k),target:look,fov:lerp(58,50,k),roll:.03*(1-k),blur:w.blur,blurDir:1};shake=.25;break;}
 case'E03':{const k=ease(3.3,4.7,t);c={eye:mix(g(P[0]+1.0,P[2]+6.8,.95),g(P[0]+.7,P[2]+5.4,.8),k),target:mix(g(P[0]+1.3,P[2]+.2,.7),g(P[0]+.8,P[2]+.4,.75),k),fov:52,roll:0,blur:0,blurDir:0};shake=.15;break;}
 case'E04':{const k=ease(4.7,6.6,t);c={eye:mix([-38,34,46],[-62,25,24],k),target:mix([-140,2,-100],[-150,4,-124],k),fov:48,roll:.02,blur:0,blurDir:0};break;}
 case'E05':{const k=ease(6.6,8.1,t);c={eye:g(-55.0+.4*k,-3.4,.88),target:g(-61,-4.4,1.05+.25*k),fov:50,roll:0,blur:0,blurDir:0};break;}
 case'E06':{const k=ease(8.1,9.7,t);c={eye:mix(g(-118,-52,7),g(-121,-56,11),k),target:mix(g(-152,-96,.5),g(-156,-104,.5),k),fov:54,roll:0,blur:0,blurDir:0};shake=.05;break;}
 case'E07':{const f=FARMER_SPOT;const w=whip(10.5,.22,t);const ots={eye:g(f[0]+1.5,f[2]+1.2,1.6),target:g(-71.6,9.4,1.25)};const front={eye:g(f[0]-2.4,f[2]-.5,1.5),target:g(f[0],f[2],1.45)};
  c={eye:mix(ots.eye,front.eye,w.u),target:mix(ots.target,front.target,w.u),fov:lerp(44,40,w.u),roll:0,blur:w.blur,blurDir:-1};if(t>10.72)shake=.2*Math.exp(-(t-10.72)*3);break;}
 case'E08':{const tr=truckAt(t);const x=Math.min(tr.pos[0],-10);c={eye:g(x+1.8,roadZ(x)-8.8,1.45),target:g(x-.6,roadZ(x)-1.2,1.25),fov:48,roll:0,blur:0,blurDir:0};shake=.08;break;}
 case'E09':{const k=ease(13.0,15.1,t);const z=roadZ(-7.1)-3.4;c={eye:mix(g(-7.0,z-6.6,.42),g(-7.05,z-4.1,.55),k),target:g(-7.1,z,1.28),fov:lerp(46,40,k),roll:0,blur:0,blurDir:0};break;}
 case'E10':{const G=GUN_PADDOCK,k=ease(15.1,17.1,t);const gy=ground(G[0],G[2]);c={eye:mix([G[0]-3.9,gy+1.6,G[2]+.42],[G[0]-3.4,gy+1.5,G[2]+.38],k),target:[G[0]+34,gy+.4,G[2]-.6],fov:38,roll:0,blur:0,blurDir:0};if(t>VO.aim)shake=.1;break;}
 case'E11':{const k=ease(17.1,19.0,t);const C=g(P[0]+6,P[2],0);c={eye:add(C,[-6,48+14*k,0]),target:C,fov:52,roll:0,up:[1,0,-.15*k],blur:0,blurDir:0};shake=.12;break;}
 case'E12':{const G=GUN_PADDOCK;const gy=gunAt(t).yaw;const dir:V3=[Math.cos(gy),0,-Math.sin(gy)];c={eye:g(G[0]-2.5,G[2]+1.35,1.15),target:add(g(G[0]+1,G[2],.6),scale(dir,8)),fov:58,roll:0,blur:0,blurDir:0};
  for(const sw of EV.swings){const w=whip(sw,.18,t);if(w.blur>0){c.blur=w.blur*.8;c.blurDir=1;}}shake=.2;break;}
 case'E13':{const G=GUN_PADDOCK;const w=whip(EV.whip,.17,t);const pk=emuPose(emuMover('peeker','paddock'),t,g(G[0],G[2],1.6));
  const majorShot={eye:g(G[0]+.75,G[2]-1.35,1.58),target:g(G[0]-.9,G[2]-1.5,1.52)};const peekShot={eye:g(G[0]-.25,G[2]-.15,1.62),target:pk.head};
  c={eye:mix(majorShot.eye,peekShot.eye,w.u),target:mix(majorShot.target,peekShot.target,w.u),fov:lerp(40,36,w.u),roll:0,blur:w.blur,blurDir:1};shake=.06;break;}
 case'E14':{const G:V3=[DAM[0]+1.8,0,DAM[2]+21.2];const k=ease(21.6,23.5,t);c={eye:mix(g(G[0]-.9,G[2]+5.6,2.4),g(G[0]-.7,G[2]+4.7,2.1),k),target:g(G[0]+.3,G[2]-9,.2),fov:46,roll:0,blur:0,blurDir:0};break;}
 case'E15':{const G:V3=[DAM[0]+1.8,0,DAM[2]+21.2];const push=smooth(EV.jam,EV.jam+.35,t);c={eye:mix(g(G[0]+2.3,G[2]-1.4,.95),g(G[0]+1.5,G[2]-.3,.8),push),target:mix(g(G[0]-.1,G[2]+.45,.45),g(G[0]-.05,G[2]+.95,.5),push),fov:lerp(42,36,push),roll:0,blur:0,blurDir:0};
  if(t>=EV.burst&&t<EV.jam)shake=.45;break;}
 case'E16':{const x=truckChaseX(t);const k=ease(25.4,27.7,t);c={eye:g(x-4.2+2.2*k,-9.5,1.6),target:g(x-1.2,-1,1.4),fov:50,roll:0,blur:0,blurDir:0};shake=.55;break;}
 case'E17':{const ex=truckChaseX(27.7)+22+12.9*(t-27.7);c={eye:g(ex,-3.4,1.2),target:g(ex-15,-1.6,1.3),fov:46,roll:0,blur:0,blurDir:0};shake=.4;break;}
 case'E18':{const o:V3=[REST[0]+1.2,0,REST[2]+2.2];const k=ease(29.2,31.6,t);c={eye:mix(g(o[0]-1.5,o[2]+3.6,1.25),g(o[0]-1.1,o[2]+2.9,1.15),k),target:g(o[0]-.1,o[2]+.3,.85-.12*smooth(30.2,30.5,t)),fov:42,roll:0,blur:0,blurDir:0};break;}
 case'E19':{const k=ease(31.6,34.2,t);c={eye:mix(g(REST[0]+2.2,REST[2]+9.5,1.75),g(REST[0]+1.8,REST[2]+7.4,1.6),k),target:g(REST[0]+.9,REST[2]+.6,1.0),fov:48,roll:0,blur:0,blurDir:0};break;}
 case'E20':case'E21':case'E22':{const sd=SKY.sunset.sunDir,sx=sd[0]/Math.hypot(sd[0],sd[2]),sz=sd[2]/Math.hypot(sd[0],sd[2]);const top:V3=[SUMMIT[0],summitY(),SUMMIT[2]];
  if(s.id==='E20'){const k=ease(34.2,35.7,t);c={eye:add(g(OUTCROP[0]-sx*30+6,OUTCROP[2]-sz*30+4,0),[0,5.5-1.2*k,0]),target:add(top,[sx*5,.4,sz*5]),fov:lerp(36,32,k),roll:0,blur:0,blurDir:0};}
  else if(s.id==='E21'){const k=ease(35.7,37.4,t);const d=lerp(10,5.8,k);c={eye:add(top,[-sx*d+1.2,-1.6+.5*k,-sz*d+1.0]),target:add(top,[0,1.75,0]),fov:lerp(40,36,k),roll:-.02,blur:0,blurDir:0};}
  else{const vic=emuPose(emuMover('victor','hill'),t,add(top,[-1.2,2.0,1.45]));const k=smooth(37.4,38.1,t);const st=pop2(EV.stamp,t);c={eye:add(top,[-1.0+.2*k,2.05,1.2-.2*k]),target:add(vic.head,[0,-.08,0]),fov:lerp(30,26,k)-2*st,roll:0,blur:0,blurDir:0};}
  break;}
 }
 const imp=impact(t),amp=shake*.035+imp*.06;c.eye=add(c.eye,[noise(t*13)*amp,noise(t*15+4)*amp,noise(t*14+8)*amp*.7]);c.target=add(c.target,[noise(t*11+2)*amp*.5,noise(t*12+6)*amp*.5,0]);c.roll+=noise(t*9+2)*amp*.5;
 return c;}
const pop2=(a:number,t:number)=>{const u=t-a;return u<0?0:Math.exp(-u*6)*Math.cos(u*20);};
export {clamp,norm,sub,FARM,CHASE};
