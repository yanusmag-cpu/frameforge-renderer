/** Stickman acting: the Major, the Sergeant, the Gunner and the farmer. Authored key poses with anticipation,
 * overshoot, squash, weight shifts and foot-planted locomotion; positions are world-space. */
import {DAM,EV,PADDOCK,REST,VO,add,clamp,cross,ease,ground,hash,lerp,mix,noise,norm,pop,roadZ,scale,shotAt,smooth,sub,type V3} from './story';
import {FARMER_SPOT,GUN_PADDOCK,feet,gunAt,truckAt,truckToWorld,type Mover} from './motion';

export type ActorId='major'|'sarge'|'gunner'|'farmer';
export type Outfit='major'|'soldier'|'farmer';
export const OUTFIT:Record<ActorId,Outfit>={major:'major',sarge:'soldier',gunner:'soldier',farmer:'farmer'};
export type Emotion='neutral'|'smile'|'grin'|'focused'|'afraid'|'shocked'|'scream'|'strain'|'determined'|'exhausted'|'shout'|'angry'|'sad'|'whisper';
export interface Pose{id:ActorId;hip:V3;up:V3;head:V3;lHand:V3;rHand:V3;lFoot:V3;rFoot:V3;face:V3;elbowBias:number;kneeBias:number;emotion:Emotion;look:number;lookUp:number;blink:number;tilt:number;scale:number;
 hat:boolean;fist:{l:boolean;r:boolean};mouthOpen:number;sweat:number;squash:number;thumb:boolean;point:'l'|'r'|null;binoculars:boolean}
export const S=1,TORSO=.58,NECK=.3,UPPER_ARM=.33,FOREARM=.32,THIGH=.43,SHIN=.43,SHOULDER_W=.17,HIP_W=.09,HEAD_R=.27;
const blinkAt=(t:number,seed:number)=>{const p=2.6+hash(seed)*1.7,u=((t+hash(seed+3)*5)%p)/p;return u>.955?.1:1;};
export const shoulderOf=(p:Pose):V3=>add(p.hip,scale(p.up,TORSO*p.scale*(1-.12*p.squash)));
function withHead(p:Pose,nod:V3=[0,0,0]){p.head=add(shoulderOf(p),scale(norm(add(p.up,nod)),NECK*p.scale));return p;}
function base(id:ActorId,t:number,hip:V3,face:V3,up:V3=[0,1,0]):Pose{const u=norm(up),f=norm([face[0],0,face[2]]),r=norm(cross(f,[0,1,0]));
 return withHead({id,hip,up:u,head:[0,0,0],lHand:add(add(hip,scale(r,-.24)),[0,.02,0]),rHand:add(add(hip,scale(r,.24)),[0,.02,0]),lFoot:add(add(hip,scale(r,-.1)),[0,-.84,0]),rFoot:add(add(hip,scale(r,.1)),[0,-.84,0]),face:f,elbowBias:1,kneeBias:1,
  emotion:'neutral',look:0,lookUp:0,blink:blinkAt(t,id.length*13+id.charCodeAt(0)),tilt:0,scale:S,hat:true,fist:{l:true,r:true},mouthOpen:0,sweat:0,squash:0,thumb:false,point:null,binoculars:false});}
const frame=(face:V3)=>{const f=norm([face[0],0,face[2]]);return {f,r:norm(cross(f,[0,1,0])),u:[0,1,0] as V3};};
/** point in a character's local frame (x right, y up, z forward) */
const at=(o:V3,face:V3,x:number,y:number,z:number):V3=>{const {f,r}=frame(face);return add(o,add(add(scale(r,x),[0,y,0]),scale(f,z)));};
const gY=(x:number,z:number)=>ground(x,z);

// ---------------------------------------------------------------- locomotion for people
const mover=(key:string,t0:number,t1:number,p:(t:number)=>[number,number],face0:[number,number]):Mover=>({key,t0,t1,at:p,phase0:hash(key.length*3.1),hip:.1,cycle:v=>clamp(.95+.3*v,.95,2.7),stance:v=>lerp(.6,.36,clamp(v/5)),lift:.17,face0});
function run(id:ActorId,m:Mover,t:number,o:{flail?:number;lean?:number}={}):Pose{const f=feet(m,t),p=m.at(t),v=f.speed,k=clamp(v/5.5);const lean=(o.lean??1)*(.05+.32*k);
 const hip:V3=[p[0],gY(p[0],p[1])+.86-.07*k-.06*f.bob*k,p[1]];const up=norm(add([0,1,0],scale(f.fwd,Math.tan(lean))));const P=base(id,t,hip,f.fwd,up);P.lFoot=f.l;P.rFoot=f.r;
 const sh=shoulderOf(P),ph=f.phase*Math.PI*2,sw=Math.sin(ph)*(.15+.32*k),fl=o.flail??0;
 for(const [side,key,s] of [[-1,'lHand',1],[1,'rHand',-1]] as const){const swing=sw*s;P[key]=add(add(add(sh,scale(f.right,side*(.22+.08*k+fl*.2))),scale(f.fwd,swing+.05)),[0,-.42+.22*Math.abs(swing)*k+fl*(.45+.25*Math.sin(t*17+side)),0]);}
 P.elbowBias=-1;P.kneeBias=1;P.emotion=k>.5?'determined':'neutral';return withHead(P,scale(f.fwd,.12*k));}
function stand(id:ActorId,t:number,o:V3,face:V3,em:Emotion='neutral',breath=1):Pose{const y=gY(o[0],o[2])+.86-.008*breath*Math.sin(t*2.4+id.length);const P=base(id,t,[o[0],y,o[2]],face);
 const {r}=frame(face);P.lFoot=[o[0]-r[0]*.12,gY(o[0],o[2]),o[2]-r[2]*.12];P.rFoot=[o[0]+r[0]*.12,gY(o[0],o[2]),o[2]+r[2]*.12];P.lHand=at(P.hip,face,-.27,-.05,.03);P.rHand=at(P.hip,face,.27,-.05,.03);P.emotion=em;return withHead(P);}
function sitGround(id:ActorId,t:number,o:V3,face:V3,slump:number,em:Emotion):Pose{const y=gY(o[0],o[2])+.18;const back=norm(add(scale(norm(face),-.45-slump*.25),[0,1,0]));const P=base(id,t,[o[0],y,o[2]],face,back);
 P.lFoot=at([o[0],gY(o[0],o[2])+.05,o[2]],face,-.18,0,.75);P.rFoot=at([o[0],gY(o[0],o[2])+.05,o[2]],face,.2,0,.8);P.kneeBias=1;P.lHand=at(P.hip,face,-.35,-.1,.1);P.rHand=at(P.hip,face,.35,-.12,.15);P.fist={l:false,r:false};P.emotion=em;
 return withHead(P,[0,-.25*slump,0]);}
function prone(id:ActorId,t:number,o:V3,face:V3,em:Emotion):Pose{const f=frame(face).f;const y=gY(o[0],o[2])+.17;const P=base(id,t,[o[0],y,o[2]],face,norm(add(f,[0,.32,0])));
 P.lFoot=at(o,face,-.14,gY(o[0],o[2])-o[1]+.04,-.85);P.rFoot=at(o,face,.14,gY(o[0],o[2])-o[1]+.04,-.82);P.lFoot[1]=gY(P.lFoot[0],P.lFoot[2])+.05;P.rFoot[1]=gY(P.rFoot[0],P.rFoot[2])+.05;P.kneeBias=-1;P.emotion=em;return withHead(P,[0,.55,0]);}
/** hands on the Lewis gun grips (world) */
function gunGrips():{rear:V3;front:V3;bolt:V3}|null{const g=gunAt(TIME);if(!g.visible)return null;const c=Math.cos(g.yaw),s=Math.sin(g.yaw),cp=Math.cos(g.pitch),sp=Math.sin(g.pitch),cr=Math.cos(g.roll),sr=Math.sin(g.roll);
 const W=(l:V3):V3=>{let [x,y,z]=l;[y,z]=[y*cr-z*sr,y*sr+z*cr];[x,y]=[x*cp-y*sp,x*sp+y*cp];return [g.pos[0]+x*c+z*s,g.pos[1]+y,g.pos[2]-x*s+z*c];};
 return {rear:W([-.22,-.06,.0]),front:W([-.02,.02,-.07]),bolt:W([-.06-g.bolt,.06,.06])};}
let TIME=0;

// ---------------------------------------------------------------- the hook chase (paddock, 0–4.7 s)
const P=PADDOCK;
const HOOK={sarge:mover('h-sarge',0,4.8,t=>[P[0]+13-5.8*t,P[2]+1.5],[-1,0]),major:mover('h-major',0,4.8,t=>[P[0]+17.5-5.4*t,P[2]-1.3],[-1,0]),
 gunner:mover('h-gunner',0,4.8,t=>{const x=t<EV.trip?P[0]+21-5.6*t:P[0]+21-5.6*EV.trip-1.1*smooth(EV.trip,EV.faceplant+.3,t);return [x,P[2]+.15];},[-1,0])};
function hook(id:ActorId,t:number):Pose{
 if(id==='sarge'){const p=run('sarge',HOOK.sarge,t,{flail:t>EV.stumble1-.15&&t<EV.stumble1+.5?smooth(EV.stumble1-.15,EV.stumble1,t)*(1-smooth(EV.stumble1+.25,EV.stumble1+.5,t)):0});
  const st=smooth(EV.stumble1-.1,EV.stumble1+.08,t)*(1-smooth(EV.stumble1+.2,EV.stumble1+.55,t));p.up=norm(add(p.up,[-.55*st,0,.1*st]));p.hip[1]-=.12*st;p.emotion=st>.2?'shocked':'determined';p.mouthOpen=st;return withHead(p,[-.2*st,0,0]);}
 if(id==='major'){const p=run('major',HOOK.major,t);p.emotion='shout';p.mouthOpen=.5+.5*Math.abs(Math.sin(t*7));const sh=shoulderOf(p);p.rHand=add(sh,[-.45,.38+.08*Math.sin(t*14),.05]);p.point='r';p.fist.r=false;return withHead(p);}
 // gunner: runs, trips (anticipation hop), face-plants, slides, legs kick
 if(t<EV.trip){const p=run('gunner',HOOK.gunner,t,{flail:.2});p.emotion=t>EV.trip-.25?'afraid':'determined';return p;}
 const g=HOOK.gunner.at(t),gy=gY(g[0],g[1]);const fall=smooth(EV.trip,EV.faceplant,t),slam=t>EV.faceplant?pop(EV.faceplant,.12,t):0;
 const tilt=lerp(.05,1.45,ease(EV.trip,EV.faceplant,t));const up=norm([-Math.sin(tilt),Math.cos(tilt),0]);
 const hip:V3=[g[0],lerp(gy+.84,gy+.2,fall)+(t<EV.faceplant?.18*Math.sin(clamp((t-EV.trip)/(EV.faceplant-EV.trip))*Math.PI):0),g[1]];const p=base('gunner',t,hip,[1,0,.25],up);p.face=[1,0,.25];
 p.squash=t>EV.faceplant?.35*Math.exp(-(t-EV.faceplant)*6):0;
 const kick=t>EV.faceplant+.35?Math.sin((t-EV.faceplant)*11):0;p.lFoot=add(hip,[.55+.2*fall,lerp(-.8,.25+.18*Math.max(0,kick),fall),-.12]);p.rFoot=add(hip,[.6+.2*fall,lerp(-.75,.3+.18*Math.max(0,-kick),fall),.12]);p.kneeBias=-1;
 const sh=shoulderOf(p);p.lHand=add(sh,[-.2-.3*fall,lerp(.2,-.15,fall)+.1*slam,-.35]);p.rHand=add(sh,[-.25-.3*fall,lerp(.3,-.18,fall),.35]);p.fist={l:false,r:false};
 p.emotion=t<EV.faceplant?'scream':'shocked';p.mouthOpen=1;p.hat=t<EV.faceplant;p.lookUp=t>EV.faceplant+.2?.08:0;return withHead(p,[-.3*fall,.6*fall,0]);}
export function hatFlight(t:number,headAtLand:V3):{pos:V3;spin:number}|null{if(t<EV.faceplant||t>VO.lost)return null;const g=HOOK.gunner.at(EV.faceplant),start:V3=[g[0]-.6,gY(g[0],g[1])+.35,g[1]];
 const u=(t-EV.faceplant)/(VO.lost-EV.faceplant);const p=mix(start,add(headAtLand,[0,.17,0]),u);p[1]+=2.2*Math.sin(u*Math.PI);return {pos:p,spin:u*9};}

// ---------------------------------------------------------------- road (truck arrival + hero line-up)
const LINE={major:[-7.0,0,0] as V3,sarge:[-8.3,0,.3] as V3,gunner:[-6.0,0,.25] as V3};
const lineSpot=(id:'major'|'sarge'|'gunner'):V3=>{const b=LINE[id];const x=b[0],z=roadZ(x)-3.4+b[2];return [x,gY(x,z),z];};
const NORTH:V3=[0,0,-1];
function road(id:ActorId,t:number):Pose{const tr=truckAt(t);
 const seat:Record<string,V3>={sarge:[-.25,1.23,-.42],major:[-.25,1.23,.42],gunner:[-1.6,1.35,0]};const hopT:Record<string,number>={gunner:EV.hop[0],major:EV.hop[1],sarge:EV.hop[2]};
 const h=hopT[id];const inTruck=t<h;
 if(inTruck){const s=truckToWorld(tr,seat[id]);const p=base(id,t,s,[1,0,0]);
  if(id==='gunner'){p.hip=truckToWorld(tr,[-1.6,1.86+.03*Math.sin(t*19),-.4]);p.lFoot=truckToWorld(tr,[-1.55,1.0,-.55]);p.rFoot=truckToWorld(tr,[-1.7,1.0,-.25]);p.rHand=truckToWorld(tr,[-1.3,2.45,-.9]);p.lHand=truckToWorld(tr,[-1.2,1.9,-.15]);p.emotion='grin';p.elbowBias=-1;}
  else{p.lFoot=truckToWorld(tr,[.35,.72,seat[id][2]-.1]);p.rFoot=truckToWorld(tr,[.35,.72,seat[id][2]+.1]);p.lHand=truckToWorld(tr,[.2,1.5,seat[id][2]-.15]);p.rHand=truckToWorld(tr,[.2,1.5,seat[id][2]+.15]);p.kneeBias=1;p.emotion=id==='major'?'determined':'focused';
   if(id==='major'){p.rHand=truckToWorld(tr,[.3,1.9+.05*Math.sin(t*9),.95]);p.point='r';p.fist.r=false;}}
  return withHead(p);}
 // hop: arc from the truck side to the ground beside it, squash on landing, then walk to the line-up mark
 const from=truckToWorld(tr,id==='gunner'?[-1.6,1.9,-1.1]:[-.1,1.1,-1.0]),land=add(truckToWorld(tr,id==='gunner'?[-1.7,0,-1.9]:[-.1,0,-1.7]),[0,0,0]);land[1]=gY(land[0],land[2])+.86;
 const dur=.32,u=clamp((t-h)/dur),spot=lineSpot(id as 'major'|'sarge'|'gunner');
 if(u<1){const pos=mix(from,land,u);pos[1]+=.55*Math.sin(u*Math.PI)*(id==='gunner'?.6:1);const p=base(id,t,pos,NORTH);p.lFoot=add(pos,[-.1,-.6+.2*u,.15]);p.rFoot=add(pos,[.1,-.7+.2*u,-.1]);p.lHand=add(pos,[-.35,.55,0]);p.rHand=add(pos,[.35,.6,0]);p.fist={l:false,r:false};p.emotion='grin';return withHead(p);}
 const after=t-h-dur;const sq=Math.exp(-after*9)*Math.cos(after*14)*.35;
 const walkU=smooth(h+dur+.15,13.0,t);const w=mix(land,[spot[0],spot[1]+.86,spot[2]],walkU);
 if(t<13.0){const p=stand(id,t,[w[0],0,w[2]],NORTH,'grin');p.squash=Math.max(0,sq);p.hip[1]-=.15*Math.max(0,sq);const ph=walkU*Math.PI*4;p.lFoot=add(p.lFoot,[0,.08*Math.max(0,Math.sin(ph)),0]);p.rFoot=add(p.rFoot,[0,.08*Math.max(0,-Math.sin(ph)),0]);return withHead(p);}
 // line-up (13.0–15.1)
 if(id==='major'){const p=stand('major',t,spot,NORTH,'shout');const ant=smooth(13.05,13.2,t),pt=pop(13.2,.25,t);const sh=shoulderOf(p);
  p.rHand=mix(add(sh,[.1,-.35,.15]),add(sh,[-.62,.22,-.25]),ant<1?ant*-.15:pt);p.rHand=t<13.2?add(sh,[.25,-.3+.1*ant,.05]):add(sh,[-.55*pt-.05,.22*pt,-.3*pt]);p.point='r';p.fist.r=false;
  p.lHand=at(p.hip,NORTH,-.25,.0,.02);p.up=norm([.04*pt,1,-.06*pt]);p.mouthOpen=.4+.5*Math.abs(Math.sin(t*8));p.emotion=t<13.2?'determined':'shout';return withHead(p,[-.08*pt,.05,0]);}
 if(id==='sarge'){const g=gunAt(t);const p=stand('sarge',t,spot,[.35,0,-1],'strain');const carry=1-smooth(13.3,EV.tripodClank,t);const gp=g.visible?g.pos:add(spot,[.6,1.2,0]);
  p.lHand=add(gp,[-.25,.05+.1*carry,0]);p.rHand=add(gp,[.15,.05+.1*carry,-.05]);p.up=norm([.3*(1-carry),1,-.2*(1-carry)]);p.hip[1]-=.18*(1-carry);p.emotion=t<EV.tripodClank+.1?'strain':'smile';return withHead(p);}
 const p=stand('gunner',t,spot,NORTH,'grin');const kneel=smooth(13.5,13.8,t);p.hip[1]-=.38*kneel;p.rFoot=add(p.rFoot,[0,0,.3*kneel]);p.kneeBias=1;
 const th=pop(EV.thumbs,.2,t);const sh=shoulderOf(p);p.rHand=t>EV.thumbs-.1?add(sh,[.22,.12+.15*th,-.18]):at(p.hip,NORTH,.27,-.05,.03);p.thumb=t>EV.thumbs-.05;p.emotion=t>EV.thumbs?'grin':'smile';
 p.blink=t>EV.thumbs+.15&&t<EV.thumbs+.3?.1:p.blink;return withHead(p,[0,0,0]);}

// ---------------------------------------------------------------- paddock: aim, heads up, scatter, swing, shocked faces
const EAST:V3=[1,0,0];
function paddock(id:ActorId,t:number):Pose{const G=GUN_PADDOCK;const flinch=pop(VO.aim,.25,t)*(t<EV.scatter+.4?1:0);
 if(id==='gunner'){const g=gunGrips();const o=add(G,[-.72,0,.05]);const p=stand('gunner',t,o,EAST,'focused');p.hip[1]-=.4;p.kneeBias=1;p.lFoot=at([o[0],gY(o[0],o[2]),o[2]],EAST,-.15,0,-.35);p.rFoot=at([o[0],gY(o[0],o[2]),o[2]],EAST,.18,0,.15);
  const gy=gunAt(t).yaw;p.face=[Math.cos(gy),0,-Math.sin(gy)];
  if(g){p.rHand=g.rear;p.lHand=g.front;}p.up=norm([.25+.1*Math.sin(t*30)*(t>EV.swings[0]&&t<20.3?1:0),1,0]);p.hip[1]+=.05*flinch;
  p.emotion=t<VO.aim?'focused':t<EV.scatter?'shocked':t<20.3?'strain':'afraid';p.sweat=t>EV.scatter?1:0;return withHead(p,[.15,0,0]);}
 if(id==='major'){const o=add(G,[-.9,0,-1.5]);const p=stand('major',t,o,EAST,'focused');const sh=shoulderOf(p);
  if(t<VO.aim+.2){p.binoculars=true;p.lHand=add(p.head,[.18,-.02,-.08]);p.rHand=add(p.head,[.18,-.02,.08]);p.emotion='focused';}
  else if(t<20.3){const dir=Math.floor((t-17)*2.4)%3;const tgt:V3[]=[[-.1,.3,-.6],[.55,.25,.1],[-.2,.3,.55]];p.rHand=add(sh,tgt[dir<0?0:dir]);p.point='r';p.fist.r=false;p.emotion='shout';p.mouthOpen=.6+.4*Math.abs(Math.sin(t*9));p.lHand=add(sh,[-.2,-.3,-.1]);}
  else{p.emotion='shocked';p.lHand=add(sh,[-.12,.05,.25]);p.rHand=add(sh,[.12,.05,.25]);p.fist={l:false,r:false};p.mouthOpen=1;p.hip[1]-=.04*pop(20.3,.2,t);}
  p.hip[1]+=.06*flinch;return withHead(p,[0,.04*flinch,0]);}
 if(id==='sarge'){const o=add(G,[-1.0,0,1.45]);const p=stand('sarge',t,o,EAST,'focused');p.hip[1]-=t<20.3?.3:0;p.kneeBias=1;const sh=shoulderOf(p);
  p.lHand=add(sh,[.2,-.25,-.1]);p.rHand=add(sh,[.25,-.3,.05]);if(t>=20.3){p.emotion='scream';p.mouthOpen=1;p.lHand=add(sh,[-.05,.42,-.1]);p.rHand=add(sh,[.05,.45,.1]);p.fist={l:false,r:false};p.sweat=1;}
  else p.emotion=t<VO.aim?'focused':'afraid';p.hip[1]+=.07*flinch;return withHead(p);}
 return stand(id,t,[0,0,0],EAST);}

// ---------------------------------------------------------------- dam ambush
function dam(id:ActorId,t:number):Pose{const G:V3=[DAM[0]+1.8,0,DAM[2]+21.2];const N:V3=[0,0,-1];
 if(id==='gunner'){const o=add(G,[0,0,.95]);const p=prone('gunner',t,o,N,'focused');const g=gunGrips();if(g){p.rHand=g.rear;p.lHand=t>EV.yank-.25&&t<EV.yank+.5?g.bolt:g.front;}
  const firing=t>=EV.burst&&t<EV.jam;if(firing){p.hip=add(p.hip,[.01*Math.sin(t*90),0,.015*Math.sin(t*77)]);}
  p.emotion=t<EV.burst?'whisper':firing?'strain':t<EV.yank?'shocked':'angry';p.mouthOpen=t>=EV.jam&&t<EV.jam+.4?1:0;
  const flinch=t>EV.spring?pop(EV.spring+.15,.2,t)*(1-smooth(EV.spring+.6,EV.spring+.9,t)):0;p.hip[1]+=.06*flinch;return withHead(p,[0,.55-.25*flinch,0]);}
 if(id==='major'){const o=add(G,[-1.35,0,1.25]);const p=prone('major',t,o,N,'whisper');const sh=shoulderOf(p);
  if(t<22.7){p.lHand=add(p.head,[0,-.08,.12]);p.lHand[1]=p.head[1]-.05;p.rHand=add(sh,[.15,-.1,-.25]);p.emotion='whisper';p.fist.l=false;}
  else if(t<EV.jam+.2){p.binoculars=true;p.lHand=add(p.head,[-.08,-.03,-.16]);p.rHand=add(p.head,[.08,-.03,-.16]);p.emotion='focused';}
  else{const fp=smooth(EV.jam+.4,EV.jam+.65,t);p.rHand=mix(add(sh,[.1,-.1,-.3]),add(p.head,[0,.0,-.12]),fp);p.lHand=add(sh,[-.15,-.1,-.3]);p.fist.r=false;p.emotion=fp>.5?'sad':'shocked';}
  return p;}
 if(id==='sarge'){const o=add(G,[1.45,0,1.3]);const p=prone('sarge',t,o,N,'focused');const sh=shoulderOf(p);p.lHand=add(sh,[-.1,-.12,-.3]);p.rHand=add(sh,[.12,-.12,-.32]);p.emotion=t<EV.jam?'focused':'shocked';p.mouthOpen=t>EV.jam?.7:0;return p;}
 return stand(id,t,[0,0,0],N);}

// ---------------------------------------------------------------- truck chase (riders in the truck frame)
function chase(id:ActorId,t:number):Pose{const tr=truckAt(t);const air=tr.air,jolt=.05*Math.sin(t*26+id.length)+.04*Math.sin(t*17);
 if(id==='sarge'){const p=base('sarge',t,truckToWorld(tr,[-.25,1.23+jolt+air*.35,-.42]),[1,0,0]);p.lFoot=truckToWorld(tr,[.35,.72,-.5]);p.rFoot=truckToWorld(tr,[.35,.72,-.32]);
  p.lHand=truckToWorld(tr,[.27,1.55+.1*Math.sin(t*6),-.6]);p.rHand=truckToWorld(tr,[.27,1.55-.1*Math.sin(t*6),-.24]);p.kneeBias=1;p.emotion=air>.1?'scream':'strain';p.mouthOpen=air>.1?1:0;p.hat=!(t>EV.bump&&t<EV.land+.1);return withHead(p,[0,.1*air,0]);}
 if(id==='major'){const lean=.35;const p=base('major',t,truckToWorld(tr,[-.2,1.3+jolt+air*.4,.55]),[1,0,0],norm([.2,1,lean]));p.lFoot=truckToWorld(tr,[.35,.72,.35]);p.rFoot=truckToWorld(tr,[.35,.72,.55]);
  p.rHand=truckToWorld(tr,[.9,2.15+.1*Math.sin(t*11),1.3]);p.point='r';p.fist.r=false;p.lHand=truckToWorld(tr,[.3,1.5,.2]);p.kneeBias=1;p.emotion='shout';p.mouthOpen=.6+.4*Math.abs(Math.sin(t*10));return withHead(p);}
 const g=gunGrips();const p=base('gunner',t,truckToWorld(tr,[-2.15,1.85+jolt*1.8+air*.6+.08*Math.abs(Math.sin(t*9)),.0]),[1,0,0],norm([.1*Math.sin(t*8),1,.2*Math.sin(t*6.3)]));
 p.lFoot=truckToWorld(tr,[-2.0,1.0+Math.max(0,air*.4+.1*Math.sin(t*9)),-.25]);p.rFoot=truckToWorld(tr,[-2.3,1.0+Math.max(0,air*.4-.1*Math.sin(t*9)),.25]);if(g){p.rHand=g.rear;p.lHand=g.front;}
 p.emotion=air>.1?'scream':'strain';p.mouthOpen=air>.1?1:.3;p.hat=!(t>EV.bump&&t<EV.land+.25);return withHead(p,[0,.05+.15*air,0]);}

// ---------------------------------------------------------------- aftermath under the gum tree
function rest(id:ActorId,t:number):Pose{const W:V3=[0,0,1];
 if(shotAt(t).id==='E18'&&id==='gunner'){const o:V3=[REST[0]+1.2,0,REST[2]+2.2];const p=base('gunner',t,[o[0],gY(o[0],o[2])+.55,o[2]],[-.3,0,1]);p.lFoot=at([o[0],gY(o[0],o[2]),o[2]],[-.3,0,1],-.15,0,.55);p.rFoot=at([o[0],gY(o[0],o[2]),o[2]],[-.3,0,1],.18,0,.5);p.kneeBias=1;
  const shake=t>29.75&&t<30.2?.06*Math.sin(t*40):0;const pan=at(p.hip,[-.3,0,1],0,.62+shake,.42);p.lHand=add(pan,[-.13,0,0]);p.rHand=add(pan,[.13,0,0]);p.fist={l:true,r:true};
  p.emotion=t<30.25?'sad':'exhausted';p.lookUp=-.06;return withHead(p,[0,-.1,.12]);}
 const spot:Record<string,V3>={major:[REST[0]-.9,0,REST[2]+1.1],sarge:[REST[0]+.5,0,REST[2]+1.3],gunner:[REST[0]+1.6,0,REST[2]+.7]};const o=spot[id];const face:V3=id==='gunner'?[.6,0,1]:[0,0,1];
 const up=smooth(EV.standUp,EV.standUp+.45,t)*(id==='major'?1:smooth(33.85,34.2,t));
 if(up<.02){const p=sitGround(id,t,o,face,id==='sarge'?1:.6,'exhausted');p.blink=id==='sarge'?.1:p.blink;p.mouthOpen=id==='sarge'?.3+.2*Math.sin(t*2):0;return p;}
 const p=stand(id,t,o,W,'sad');p.hip[1]-=.5*(1-up);if(id==='major'&&t>33.6){const sh=shoulderOf(p);const w=Math.sin((t-33.6)*7);p.rHand=add(sh,[.35+.15*w,.3,-.1]);p.fist.r=false;p.emotion='sad';}return withHead(p,[0,-.12,0]);}

// ---------------------------------------------------------------- farmer
function farmer(t:number):Pose{const face:V3=[-.95,0,-.3];const p=stand('farmer',t,FARMER_SPOT,face,'neutral');const g=t-EV.gulp;const sh=shoulderOf(p);
 if(g<.05){p.lHand=at(p.hip,face,-.25,.05,-.02);p.rHand=at(p.hip,face,.25,.05,-.02);p.emotion=t<10.1?'neutral':'shocked';p.fist={l:true,r:true};}
 else{const a=pop(EV.gulp+.05,.25,t);p.lHand=add(sh,[.05,.45*a,-.2]);p.rHand=add(sh,[-.12,.48*a,.2]);p.lHand=mix(at(p.hip,face,-.25,.05,0),add(p.head,[.18,.1,-.18]),a);p.rHand=mix(at(p.hip,face,.25,.05,0),add(p.head,[-.18,.1,.18]),a);
  p.fist={l:false,r:false};p.emotion='scream';p.mouthOpen=1;p.hip[1]-=.08*a;p.squash=.2*Math.exp(-g*5);}
 return withHead(p,[0,.05,0]);}

export function actorsAt(t:number):ActorId[]{const s=shotAt(t);
 if(s.set==='paddock')return ['major','sarge','gunner'];if(s.set==='road'||s.set==='dam'||s.set==='chase'||s.set==='rest')return ['major','sarge','gunner'];
 if(s.id==='E07'||s.id==='E04')return ['farmer'];if(s.id==='E20')return ['major','sarge','gunner'];return [];}
export function pose(id:ActorId,t:number):Pose{TIME=t;const s=shotAt(t);
 if(id==='farmer')return farmer(t);
 if(s.set==='paddock')return t<4.75?hook(id,t):paddock(id,t);
 if(s.set==='road')return road(id,t);if(s.set==='dam')return dam(id,t);if(s.set==='chase')return chase(id,t);if(s.set==='rest')return rest(id,t);
 // E20: riding away in the truck, tiny in the distance
 const tr=truckAt(t);const seats:Record<string,V3>={sarge:[-.25,1.23,-.42],major:[-.25,1.23,.42],gunner:[-2.0,1.4,0]};const p=base(id,t,truckToWorld(tr,seats[id]),[-1,0,0]);
 p.lFoot=truckToWorld(tr,[.3,.72,seats[id][2]-.1]);p.rFoot=truckToWorld(tr,[.3,.72,seats[id][2]+.1]);p.kneeBias=1;p.emotion='sad';return withHead(p,[0,-.2,0]);}
export {noise,sub};
