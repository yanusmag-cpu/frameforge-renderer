/** Claude BA5390 production — absolute 60-second timeline, aircraft motion, choreography and cameras.
 * Pure functions of absolute time so the six independent chunks are seamless. Aircraft frame: x nose, y up, z starboard. */
export type V3=[number,number,number];
export const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=(a:number,b:number,t:number)=>{const u=clamp((t-a)/(b-a));return u*u*u*(u*(u*6-15)+10);};
export const ease=(a:number,b:number,t:number)=>{const u=clamp((t-a)/(b-a));return u*u*(3-2*u);};
export const mix=(a:V3,b:V3,u:number):V3=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u,a[2]+(b[2]-a[2])*u];
export const add=(a:V3,b:V3):V3=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const sub=(a:V3,b:V3):V3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const scale=(a:V3,k:number):V3=>[a[0]*k,a[1]*k,a[2]*k];
export const dot=(a:V3,b:V3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a:V3,b:V3):V3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const len=(a:V3)=>Math.hypot(a[0],a[1],a[2]);
export const norm=(a:V3):V3=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
export const dist=(a:V3,b:V3)=>len(sub(a,b));
export const hash=(i:number)=>{const v=Math.sin(i*127.1+311.7)*43758.5453;return v-Math.floor(v);};
export const noise=(x:number)=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return (hash(i)*(1-u)+hash(i+1)*u)*2-1;};

export type SetId='air'|'cabin'|'airport';
export type Frame='plane'|'world';
export const SHOTS=[
 {id:'B01',start:0,end:2.7,set:'air',label:'Hook: captain bent back over the nose outside the aircraft'},
 {id:'B02',start:2.7,end:4.9,set:'air',label:'Inside: steward clings to the captain\'s legs, papers whirl'},
 {id:'B03',start:4.9,end:6.6,set:'air',label:'First officer fights the controls'},
 {id:'B04',start:6.6,end:8,set:'air',label:'Wide: the jet dives through cloud'},
 {id:'B05',start:8,end:10,set:'air',label:'Flashback: climbing out of Birmingham into sunrise'},
 {id:'B06',start:10,end:13,set:'air',label:'Tracking along the BAC One-Eleven above the clouds'},
 {id:'B07',start:13,end:15.5,set:'air',label:'The pilots: Lancaster and Atchison at work'},
 {id:'B08',start:15.5,end:17.5,set:'cabin',label:'Calm cabin; Nigel Ogden brings tea'},
 {id:'B09',start:17.5,end:18.8,set:'air',label:'Ogden enters the flight deck'},
 {id:'B10',start:18.8,end:20,set:'air',label:'Macro: the windscreen bolts creak'},
 {id:'B11',start:20,end:21.3,set:'air',label:'BANG — the left windscreen blows out'},
 {id:'B12',start:21.3,end:23.6,set:'air',label:'Decompression: the captain is sucked out of his seat'},
 {id:'B13',start:23.6,end:25.8,set:'air',label:'Outside: he folds back over the fuselage'},
 {id:'B14',start:25.8,end:27.8,set:'air',label:'Ogden lunges and grabs his belt'},
 {id:'B15',start:27.8,end:30,set:'air',label:'Door slams onto the console; nose drops'},
 {id:'B16',start:30,end:32.5,set:'air',label:'Ogden holds on: freezing, straining'},
 {id:'B17',start:32.5,end:35,set:'air',label:'Atchison: MAYDAY'},
 {id:'B18',start:35,end:37.5,set:'air',label:'Heward and Rogers take over the grip'},
 {id:'B19',start:37.5,end:40,set:'air',label:'Outside, descending through the cloud deck'},
 {id:'B20',start:40,end:43,set:'air',label:'Below the clouds: diverting to Southampton'},
 {id:'B21',start:43,end:45.5,set:'airport',label:'Over Atchison\'s shoulder: runway 02 ahead, gear down'},
 {id:'B22',start:45.5,end:48,set:'airport',label:'Low angle: the jet passes over the threshold'},
 {id:'B23',start:48,end:50,set:'airport',label:'Touchdown: tyre smoke'},
 {id:'B24',start:50,end:52.5,set:'airport',label:'Rolling out; fire and ambulance crews race in'},
 {id:'B25',start:52.5,end:56,set:'airport',label:'Rescuers reach the captain — he is alive'},
 {id:'B26',start:56,end:60,set:'airport',label:'Final: the facts'}
] as const satisfies readonly {id:string;start:number;end:number;set:SetId;label:string}[];
export type Shot=typeof SHOTS[number];
export function shotAt(t:number):Shot{if(!Number.isFinite(t)||t<0||t>=60)throw new RangeError('BA5390 time must be in [0,60)');return SHOTS.find(s=>t>=s.start&&t<s.end)!;}
export const BLOWOUT=20.05, SUCKED=21.45, GRAB=26.45, DOOR=28.0, HANDOVER=35.6, TOUCHDOWN=48.4, NOSEDOWN=49.0, STOP=52.3;

// ---------------------------------------------------------------- aircraft state
export interface Craft{pos:V3;yaw:number;pitch:number;roll:number}
const V=70;
export function airY(t:number){if(t<28.4)return -18+1.1*Math.max(0,t-10);const a=t-28.4;return -18+1.1*18.4-22*a-2*a*a;}
export const DECK={top:-330,base:-470,ground:-1500};
export function craft(t:number):Craft{const s=shotAt(t);
 if(s.set==='airport'){const r=runway(t);return {pos:r.pos,yaw:0,pitch:r.pitch,roll:r.roll};}
 if(t<8){return {pos:[9000+V*t,-305-6*t,600],yaw:.02*Math.sin(t*.7),pitch:-.11+.02*Math.sin(t*2.3),roll:.06*Math.sin(t*1.1)+.02*Math.sin(t*4.7)};}
 if(t<10){const a=t-8;return {pos:[-4000+V*a,DECK.top-40+16*a,-2500],yaw:0,pitch:.16,roll:.03*Math.sin(t)};}
 const shake=t>BLOWOUT?.012*Math.sin(t*17)*Math.exp(-(t-BLOWOUT)*.15):0;
 const pitch=t<DOOR-.3?.045:-.12*smooth(DOOR-.3,DOOR+1.2,t)+.06*smooth(33,38,t);
 return {pos:[V*t,airY(t),0],yaw:0,pitch:pitch+shake,roll:.025*Math.sin(t*.8)+(t>BLOWOUT?.05*Math.sin(t*1.9):0)};}
export function runway(t:number){const a=t-TOUCHDOWN;let x:number,y:number,pitch:number;
 if(a<0){x=300+75*a;y=3.7+(300-x)*.0524*(1-smooth(-1.4,0,a)*.75)+.0;pitch=.035+.06*smooth(-1.3,0,a);y=Math.max(3.7,y);}
 else{const tt=Math.min(a,STOP-TOUCHDOWN);x=300+75*tt-75/(2*(STOP-TOUCHDOWN))*tt*tt;y=3.7;pitch=.095*(1-smooth(0,NOSEDOWN-TOUCHDOWN,a));}
 const bump=a>0&&a<.6?.06*Math.sin(a*30)*Math.exp(-a*6):0;return {pos:[x,y+bump,0] as V3,pitch,roll:a<0?.02*Math.sin(t*1.7):0};}
/** local aircraft-frame point -> world (rotation order: roll(x) then pitch(z) then yaw(y)). */
export function toWorld(c:Craft,v:V3):V3{const [x,y,z]=v;const cr=Math.cos(c.roll),sr=Math.sin(c.roll);const y1=y*cr-z*sr,z1=y*sr+z*cr,x1=x;
 const cp=Math.cos(c.pitch),sp=Math.sin(c.pitch);const x2=x1*cp-y1*sp,y2=x1*sp+y1*cp;const cy=Math.cos(c.yaw),sy=Math.sin(c.yaw);const x3=x2*cy+z1*sy,z3=-x2*sy+z1*cy;return [x3+c.pos[0],y2+c.pos[1],z3+c.pos[2]];}
export function toLocal(c:Craft,w:V3):V3{let [x,y,z]=sub(w,c.pos);const cy=Math.cos(-c.yaw),sy=Math.sin(-c.yaw);[x,z]=[x*cy+z*sy,-x*sy+z*cy];const cp=Math.cos(-c.pitch),sp=Math.sin(-c.pitch);[x,y]=[x*cp-y*sp,x*sp+y*cp];const cr=Math.cos(-c.roll),sr=Math.sin(-c.roll);[y,z]=[y*cr-z*sr,y*sr+z*cr];return [x,y,z];}
export const windscreenGone=(t:number)=>t>=BLOWOUT&&shotAt(t).set==='air'||t<8||shotAt(t).set==='airport';
export const gearDown=(t:number)=>t>=43.4||t<0;

// ---------------------------------------------------------------- characters
export type ActorId='lancaster'|'atchison'|'ogden'|'heward'|'rogers'|'gibbins'|'hoodie'|'p1'|'p2'|'p3'|'p4'|'p5'|'p6'|'p7'|'p8'|'medic1'|'medic2'|'fire1'|'fire2';
export type Outfit='captain'|'officer'|'steward'|'stewardess'|'hoodie'|'passenger'|'medic'|'fire';
export const OUTFIT:Record<ActorId,Outfit>={lancaster:'captain',atchison:'officer',ogden:'steward',heward:'steward',rogers:'steward',gibbins:'stewardess',hoodie:'hoodie',p1:'passenger',p2:'passenger',p3:'passenger',p4:'passenger',p5:'passenger',p6:'passenger',p7:'passenger',p8:'passenger',medic1:'medic',medic2:'medic',fire1:'fire',fire2:'fire'};
export type Emotion='neutral'|'smile'|'focused'|'afraid'|'shocked'|'scream'|'strain'|'determined'|'relieved'|'exhausted'|'shout'|'weak';
export interface Pose{id:ActorId;frame:Frame;hip:V3;up:V3;head:V3;lHand:V3;rHand:V3;lFoot:V3;rFoot:V3;elbowBias:number;kneeBias:number;facing:number;emotion:Emotion;look:number;lookUp:number;blink:number;tilt:number;scale:number;light:number;wind:V3;cap:boolean;headset:boolean;frost:number;fist:{l:boolean;r:boolean};tray:boolean;mouthOpen:number;hairWild:number}
export const S=.85,TORSO=.6,NECK=.31,UPPER_ARM=.34,FOREARM=.33,THIGH=.42,SHIN=.42,SHOULDER_W=.17,HIP_W=.09,HEAD_R=.26;
function blinkAt(t:number,seed:number){const p=2.4+hash(seed)*1.8,u=((t+hash(seed+3)*5)%p)/p;return u>.955?.12:1;}
const shoulderOf=(p:Pose):V3=>add(p.hip,scale(p.up,TORSO*p.scale));
function withHead(p:Pose,nod:V3=[0,0,0]){p.head=add(shoulderOf(p),scale(norm(add(p.up,nod)),NECK*p.scale));return p;}
function base(id:ActorId,frame:Frame,t:number,hip:V3,up:V3):Pose{const u=norm(up);return withHead({id,frame,hip,up:u,head:[0,0,0],lHand:add(hip,[0,.1,-.2]),rHand:add(hip,[0,.1,.2]),lFoot:add(hip,[0,-.7,-.08]),rFoot:add(hip,[0,-.7,.08]),elbowBias:1,kneeBias:1,facing:1,emotion:'neutral',look:0,lookUp:0,blink:blinkAt(t,id.length*13+id.charCodeAt(0)),tilt:0,scale:S,light:1,wind:[0,0,0],cap:false,headset:false,frost:0,fist:{l:false,r:false},tray:false,mouthOpen:0,hairWild:0});}
const W=(t:number,amp=1):V3=>[2.2*amp,(.5+.4*noise(t*7))*amp,(-.9+.4*noise(t*5+3))*amp]; // airflow toward the open left windscreen (plane frame)

// --- fixed blocking (aircraft frame) ---
export const SEAT_L:V3=[.38,-.25,-.5], SEAT_R:V3=[.38,-.25,.5];
export const YOKE={L:[.79,-.06,-.45] as V3,R:[.79,-.06,.45] as V3};
export const WINDOW:V3=[1.64,.98,-.4];
const PEDAL=(z:number,d:number):V3=>[.95,-.75,z+d];
export function capOutside(t:number):Pose{ // bent backward over the nose, waist in the window frame
 const fl=(k:number)=>Math.sin(t*k)*.5+Math.sin(t*k*2.3+1)*.25;
 const p=base('lancaster','plane',t,[1.62,1.04,-.42],[-.7+.04*fl(5),.62,-.3]);p.wind=[-3,0,0];
 const sh=shoulderOf(p);p.lHand=add(sh,[-.36+.12*fl(6),.22+.22*fl(4.3),-.3+.14*fl(3)]);p.rHand=add(sh,[-.34+.12*fl(5.2),.28+.2*fl(3.7),.24+.12*fl(4)]);
 p.lFoot=[1.18,.36,-.5];p.rFoot=[1.22,.4,-.33];p.kneeBias=-1;p.emotion=t<GRAB+2?'scream':'weak';p.hairWild=1;p.lookUp=.06;p.light=1.15;p.frost=clamp((t-24)/12);
 return withHead(p,[.42,.45,.1]);}

export function actorsAt(t:number):ActorId[]{const s=shotAt(t).id;
 if(['B01','B04','B13','B19','B20','B22','B23','B24'].includes(s))return ['lancaster'];
 if(['B02','B03','B14','B15','B16','B17'].includes(s))return ['lancaster','atchison','ogden'];
 if(s==='B18')return ['lancaster','atchison','ogden','heward','rogers'];
 if(['B07','B10'].includes(s))return ['lancaster','atchison'];
 if(s==='B09'||s==='B11'||s==='B12')return ['lancaster','atchison','ogden'];
 if(s==='B08')return ['ogden','gibbins','hoodie','p1','p2','p3','p4','p5','p6','p7','p8'];
 if(s==='B21')return ['atchison','rogers','lancaster'];
 if(s==='B25'||s==='B26')return ['lancaster','atchison','ogden','medic1','medic2','fire1','fire2'];
 return [];}

export function pose(id:ActorId,t:number):Pose{const s=shotAt(t).id;
 // ---------- captain
 if(id==='lancaster'){
  if(s==='B21')return capOutside(t);
  if(t<8||['B13','B14','B15','B16','B17','B18','B19','B20','B22','B23','B24'].includes(s)||(s==='B12'&&t>SUCKED+.75))return capOutside(t);
  if(s==='B12'){const u=smooth(SUCKED-.15,SUCKED+.7,t),ant=smooth(20.05,SUCKED-.15,t);const seat=add(SEAT_L,[-.04*ant,.06*ant,0]);
   const p=base('lancaster','plane',t,mix(seat,[1.6,1.0,-.42],u),mix([.12-.3*ant,1,0],[-.7,.62,-.3],u));p.wind=W(t,1.4);
   const sh=shoulderOf(p);p.lHand=add(sh,mix([.25,.25,-.2],[.4,.45,-.1],u));p.rHand=add(sh,mix([.3,.15,.2],[.35,.5,.2],u));p.lFoot=mix(PEDAL(-.5,-.12),[1.18,.36,-.5],u);p.rFoot=mix(PEDAL(-.5,.12),[1.22,.4,-.33],u);
   p.emotion='shocked';p.hairWild=1;p.cap=t<SUCKED-.25;return withHead(p,[0,.1*u,0]);}
  if(s==='B25'||s==='B26'){const p=base('lancaster','world',t,[448.5,.92,-6.6],[-1,.18,0]);p.lHand=[448.2,1.0,-6.3];p.rHand=t<54.3?[448.4,1.0,-6.9]:mix([448.4,1.0,-6.9],[448.45,1.5,-7.0],smooth(54.3,54.7,t));p.fist.r=t>54.5;
   p.lFoot=[449.4,.95,-6.5];p.rFoot=[449.4,.95,-6.75];p.emotion=t<53.6?'weak':'relieved';p.blink=t<53.4?.18:p.blink;p.look=.1;p.frost=.6;p.hairWild=.5;return withHead(p,[0,.3,0]);}
  // seated, normal flight (B07, B09, B10, B11)
  const p=base('lancaster','plane',t,SEAT_L,[.12,1,0]);p.cap=true;p.lFoot=PEDAL(-.5,-.12);p.rFoot=PEDAL(-.5,.12);
  const reach=s==='B07'&&t>13.6&&t<14.6?smooth(13.6,13.9,t)*(1-smooth(14.3,14.6,t)):0;
  p.lHand=YOKE.L.map((v,i)=>v+[0,0,-.17][i]) as V3;p.rHand=mix([.78,-.05,-.28],[.86,.34,-.22],reach);p.fist.l=true;
  if(s==='B09'||s==='B10'){p.rHand=[.55,.1,-.15];p.look=-.12;p.emotion='smile';}
  if(s==='B11'){p.emotion='shocked';p.hairWild=.6;}
  p.lookUp=reach*.15;p.emotion=s==='B07'?'focused':p.emotion;return withHead(p);}
 // ---------- first officer
 if(id==='atchison'){
  if(s==='B21'){const p=base('atchison','plane',t,SEAT_R,[.16,1,0]);p.headset=true;p.lHand=add(YOKE.R,[0,0,-.17]);p.rHand=t>43.4&&t<44.2?mix(add(YOKE.R,[0,0,.17]),[.95,.0,.12],smooth(43.4,43.6,t)*(1-smooth(43.9,44.2,t))):add(YOKE.R,[0,0,.17]);p.fist={l:true,r:true};
   p.lFoot=PEDAL(.5,-.12);p.rFoot=PEDAL(.5,.12);p.emotion='determined';p.wind=W(t,.6);p.frost=.3;return withHead(p,[.05,0,0]);}
  if(s==='B25'||s==='B26'){const p=base('atchison','world',t,[446,.83,-8.4],[0,1,0]);p.headset=false;p.cap=true;p.lHand=[445.95,1.0,-8.25];p.rHand=s==='B26'?[446.3,1.2,-8.0]:[446.05,.98,-8.6];p.lFoot=[446,.05,-8.3];p.rFoot=[446.05,.05,-8.55];p.emotion='relieved';p.look=-.1;return withHead(p);}
  const p=base('atchison','plane',t,SEAT_R,[.14,1,0]);p.cap=true;p.headset=true;p.lFoot=PEDAL(.5,-.12);p.rFoot=PEDAL(.5,.12);
  const em=t>=BLOWOUT||t<8;const fight=em?.06*Math.sin(t*9)+.04*Math.sin(t*14):0;
  p.lHand=add(YOKE.R,[-fight,fight*.5,-.17]);p.rHand=add(YOKE.R,[-fight,fight*.5,.17]);p.fist={l:true,r:true};
  if(s==='B07'){p.rHand=t>14.2?mix(add(YOKE.R,[0,0,.17]),[1.0,.12,.35],smooth(14.2,14.5,t)):add(YOKE.R,[0,0,.17]);p.emotion='smile';p.look=-.15;p.fist.r=t<14.2;}
  if(s==='B17'){p.rHand=t>32.7?[.62,.25,.62]:p.rHand;p.emotion='shout';p.mouthOpen=.6+.4*Math.abs(Math.sin(t*9));}
  if(em&&s!=='B17'){p.emotion=t<BLOWOUT+1?'shocked':'strain';p.up=norm([.05-fight,1,0]);p.wind=W(t,.6);p.hairWild=.4;}
  if(s==='B09'||s==='B10'||s==='B11'){p.emotion=s==='B11'?'shocked':'neutral';p.look=-.1;}
  return withHead(p);}
 // ---------- stewards in the flight deck
 if(id==='ogden'){
  if(s==='B25'||s==='B26')return ogdenGround(t);
  if(s==='B08'){const w=smooth(15.5,17.5,t),x=-7.4+3.6*w,ph=t*6.2;const hip:V3=[x,-.2+.02*Math.abs(Math.sin(ph)),-.27];const p=base('ogden','plane',t,hip,[.03,1,0]);
   p.lFoot=[x+.12*Math.sin(ph),-.95+Math.max(0,.07*Math.cos(ph)),-.35];p.rFoot=[x-.12*Math.sin(ph),-.95+Math.max(0,-.07*Math.cos(ph)),-.19];p.lHand=[x+.3,.05,-.4];p.rHand=[x+.3,.05,-.14];p.tray=true;p.emotion='smile';p.look=.1;return withHead(p);}
  if(s==='B09'){const w=smooth(17.5,18.7,t),x=-1.85+1.3*w,ph=t*6.2;const p=base('ogden','plane',t,[x,-.2+.02*Math.abs(Math.sin(ph)),-.05],[.04,1,0]);p.lFoot=[x+.1*Math.sin(ph),-.9,-.12];p.rFoot=[x-.1*Math.sin(ph),-.9,.02];
   p.lHand=[x+.3,.05,-.2];p.rHand=[x+.3,.05,.08];p.tray=true;p.emotion='smile';p.look=.15;return withHead(p);}
  if(s==='B10'||s==='B11'||s==='B12'){const p=base('ogden','plane',t,[-.45,-.2,-.05],[.04,1,0]);p.lFoot=[-.4,-.9,-.12];p.rFoot=[-.5,-.9,.02];const jolt=smooth(BLOWOUT,BLOWOUT+.3,t);
   p.lHand=[-.15,.05+.3*jolt,-.2];p.rHand=[-.15,.05+.25*jolt,.08];p.tray=t<BLOWOUT+.25;p.up=norm([.04+.35*jolt,1,-.15*jolt]);p.emotion=t<BLOWOUT?'smile':'shocked';p.wind=W(t,1);p.hairWild=jolt;return withHead(p);}
  const lunge=smooth(25.9,GRAB,t);const hold:V3=s==='B14'&&t<GRAB?mix([-.2,.2,-.1],[1.38,.62,-.42],lunge):[1.38,.62,-.42];
  if(s==='B18'&&t>HANDOVER+.4){const back=smooth(HANDOVER+.4,HANDOVER+1.4,t);const p=base('ogden','plane',t,mix([.6,-.18,-.25],[-.6,-.3,-.25],back),[.1,1,.05]);p.lHand=add(p.hip,[.15,.2,-.3]);p.rHand=add(p.hip,[.2,.15,.2]);p.lFoot=add(p.hip,[-.05,-.7,-.1]);p.rFoot=add(p.hip,[.08,-.7,.1]);p.emotion='exhausted';p.frost=.8;p.wind=W(t,.8);p.hairWild=.8;return withHead(p,[0,-.2,0]);}
  const hip:V3=s==='B14'?mix([-.2,-.2,-.1],[.68,-.15,-.27],lunge):[.68,-.15,-.27];const strain=.02*Math.sin(t*11);
  const p=base('ogden','plane',t,add(hip,[strain,0,0]),s==='B14'?mix([.04,1,0],[.65,.72,-.12],lunge):[.65,.72,-.12]);p.lHand=add(hold,[0,0,-.06]);p.rHand=add(hold,[-.05,-.03,.07]);p.fist={l:true,r:true};
  p.lFoot=[.2,-.9,-.4];p.rFoot=[.05,-.9,-.05];p.kneeBias=1;p.emotion=s==='B14'&&t<GRAB?'shocked':'strain';p.wind=W(t,1);p.hairWild=1;p.frost=clamp((t-27)/8);return withHead(p,[0,.25,0]);}
 if(id==='heward'||id==='rogers'){const r=id==='rogers';
  if(s==='B21'){const p=base('rogers','plane',t,[.62,-.17,-.3],[.62,.74,-.12]);p.lHand=[1.36,.6,-.48];p.rHand=[1.3,.58,-.36];p.fist={l:true,r:true};p.lFoot=[.25,-.9,-.4];p.rFoot=[.1,-.9,-.1];p.emotion='strain';p.wind=W(t,.8);p.frost=.6;p.hairWild=1;return withHead(p,[0,.2,0]);}
  const arrive=smooth(35,HANDOVER+.3,t);const hip:V3=r?mix([-1.5,-.2,-.2],[.62,-.17,-.32],arrive):mix([-1.6,-.2,.15],[-.15,-.2,.05],arrive);
  const p=base(id,'plane',t,hip,r?mix([.05,1,0],[.62,.74,-.12],arrive):[.15,1,0]);const ph=t*6;p.lFoot=add(hip,[.1*Math.sin(ph)*(1-arrive),-.72,-.08]);p.rFoot=add(hip,[-.1*Math.sin(ph)*(1-arrive),-.72,.08]);
  p.lHand=r?mix(add(hip,[.3,.2,-.2]),[1.36,.6,-.48],smooth(HANDOVER,HANDOVER+.5,t)):add(hip,[.45,.35,-.25]);p.rHand=r?mix(add(hip,[.3,.2,.2]),[1.3,.58,-.36],smooth(HANDOVER,HANDOVER+.5,t)):[.15,.15,-.3];p.fist={l:true,r:true};
  p.emotion=r?'determined':'afraid';p.wind=W(t,.9);p.hairWild=.8;return withHead(p,[0,.15,0]);}
 // ---------- cabin
 if(id==='gibbins'){const p=base('gibbins','plane',t,[-2.15,-.2,-.25],[0,1,0]);p.lHand=[-1.85,.05,-.1];p.rHand=[-1.85,.12+.04*Math.sin(t*2),.05];p.lFoot=[-2.15,-.95,-.32];p.rFoot=[-2.15,-.95,-.18];p.emotion='smile';p.look=-.1;return withHead(p);}
 if(id==='hoodie'||id.startsWith('p')){const seats:Record<string,[number,number]>={hoodie:[2,-1.25],p1:[0,-1.25],p2:[0,-.75],p3:[1,1.22],p4:[1,.72],p5:[2,.22],p6:[3,-.75],p7:[3,1.22],p8:[4,.72]};const [row,z]=seats[id];const x=-2.3-row*.82+.04;
  const p=base(id,'plane',t,[x,-.42,z],[-.12,1,0]);p.lHand=[x+.3,-.25,z-.15];p.rHand=[x+.3,-.25,z+.15];p.lFoot=[x+.5,-.95,z-.08];p.rFoot=[x+.5,-.95,z+.08];p.kneeBias=1;
  p.emotion=hash(row*7+z)>.5?'smile':'neutral';p.look=id==='hoodie'?-.2:.06*Math.sin(t*.7+row);if(id==='hoodie'){p.lookUp=.04;p.emotion='smile';}return withHead(p,id==='hoodie'?[0,0,-.2]:[0,0,0]);}
 // ---------- ground crews
 const crew:Record<string,{hip:V3;up:V3;h:[V3,V3];f:[V3,V3]}>={
  medic1:{hip:[448.2,.52,-7.25],up:[.0,1,.25],h:[[448.4,.95,-6.9],[448.7,.98,-6.85]],f:[[448,.05,-7.4],[448.5,.3,-7.6]]},
  medic2:{hip:[449.7,.55,-6.2],up:[-.3,1,0],h:[[449.3,1.0,-6.5],[449.3,.98,-6.75]],f:[[450,.05,-6.1],[450.1,.3,-6.4]]},
  fire1:{hip:[447.1,.83,-5.2],up:[0,1,0],h:[[447.4,1.0,-5.6],[446.9,.6,-5.2]],f:[[447.05,.05,-5.15],[447.15,.05,-5.3]]},
  fire2:{hip:[450.8,.83,-8.3],up:[0,1,0],h:[[450.5,.9,-8.0],[451,.6,-8.3]],f:[[450.75,.05,-8.25],[450.85,.05,-8.4]]}};
 const c=crew[id];const p=base(id,'world',t,c.hip,c.up);p.lHand=c.h[0];p.rHand=c.h[1];p.lFoot=c.f[0];p.rFoot=c.f[1];p.emotion=t>54?'relieved':'focused';p.kneeBias=1;
 return withHead(p,[0,.1,0]);}
export function ogdenGround(t:number):Pose{const p=base('ogden','world',t,[450.2,.83,-5.6],[-.05,1,0]);p.lHand=[449.9,1.05,-5.9];p.rHand=[450,1.1,-5.45];p.lFoot=[450.15,.05,-5.55];p.rFoot=[450.25,.05,-5.7];p.emotion=t>54.4?'relieved':'exhausted';p.frost=.4;p.look=-.1;return withHead(p,[0,-.05,0]);}

// ---------------------------------------------------------------- cameras
export interface CameraPose{eye:V3;target:V3;fov:number;roll:number;frame:Frame}
export function impact(t:number){let v=0;for(const [at,k,d] of [[BLOWOUT,1,1.4],[SUCKED,.8,1],[GRAB,.5,.6],[DOOR,.7,.8],[TOUCHDOWN,.6,.9],[NOSEDOWN,.3,.5],[HANDOVER,.3,.4]] as [number,number,number][]){const a=t-at;if(a>=0&&a<d)v=Math.max(v,k*Math.exp(-a*4));}return v;}
function windShake(t:number){return t<8||(t>=BLOWOUT&&t<43.4)?1:t>=43&&t<48.4?.35:0;}
export function cameraPose(t:number):CameraPose{const s=shotAt(t),u=smooth(s.start,s.end,t);
 let c:CameraPose={eye:[0,1,4],target:[0,1,0],fov:50,roll:0,frame:'plane'};
 switch(s.id){
 case'B01':c={eye:mix([4.4,1.75,-2.75],[3.7,1.85,-2.35],u),target:mix([1.15,1.5,-.6],[1.15,1.55,-.6],u),fov:50-4*u,roll:-.1,frame:'plane'};break;
 case'B02':c={eye:mix([-.62,1.0,.12],[-.5,.98,.1],u),target:[1.35,.62,-.38],fov:64,roll:.04,frame:'plane'};break;
 case'B03':c={eye:mix([1.18,.64,.02],[1.14,.62,.08],u),target:[.49,.48,.5],fov:52,roll:-.05,frame:'plane'};break;
 case'B04':c={eye:[-22+6*u,9-3*u,-46],target:[-4,0,0],fov:44,roll:.04,frame:'plane'};break;
 case'B05':c={eye:mix([-48,-14,-30],[-38,-8,-26],u),target:[-6,1,0],fov:46,roll:.1,frame:'plane'};break;
 case'B06':c={eye:mix([-30,4.2,-9],[-2,2.6,-6.5],ease(10,13,t)),target:mix([-14,.8,0],[1.5,.6,0],ease(10,13,t)),fov:42,roll:0,frame:'plane'};break;
 case'B07':c={eye:mix([-1.15,.78,.05],[-.95,.72,0],u),target:[1.3,.35,0],fov:58,roll:0,frame:'plane'};break;
 case'B08':c={eye:mix([-2.55,.45,-.27],[-2.75,.42,-.3],u),target:[-8,.05,-.2],fov:56,roll:0,frame:'plane'};break;
 case'B09':c={eye:mix([-2.45,.62,.05],[-2.3,.6,.05],u),target:[.9,.35,0],fov:52,roll:0,frame:'plane'};break;
 case'B10':c={eye:mix([3.4,1.45,-1.75],[2.9,1.32,-1.45],u),target:[1.62,.95,-.42],fov:42,roll:-.08,frame:'plane'};break;
 case'B11':c={eye:mix([3.4,1.15,-2.0],[3.9,1.3,-2.4],ease(BLOWOUT,21.3,t)),target:[1.6,1.0,-.45],fov:48,roll:-.06,frame:'plane'};break;
 case'B12':c={eye:[-.6,1.0,.12],target:mix([.6,.35,-.45],[1.4,.85,-.42],smooth(SUCKED-.1,SUCKED+.6,t)),fov:64,roll:.04,frame:'plane'};break;
 case'B13':c={eye:mix([3.4,2.5,-2.3],[3.0,2.2,-2.6],u),target:[1.25,1.25,-.5],fov:50,roll:-.1,frame:'plane'};break;
 case'B14':c={eye:mix([-.2,.85,.4],[-.1,.82,.35],u),target:[1.15,.5,-.42],fov:60,roll:.06,frame:'plane'};break;
 case'B15':c={eye:[-.65,1.02,.15],target:[.95,.3,-.15],fov:66,roll:.03,frame:'plane'};break;
 case'B16':c={eye:mix([.72,.98,.58],[.7,.95,.52],u),target:[1.08,.45,-.36],fov:50,roll:-.05,frame:'plane'};break;
 case'B17':c={eye:mix([1.05,.45,.9],[1.0,.44,.82],u),target:[.42,.48,.5],fov:46,roll:.04,frame:'plane'};break;
 case'B18':c={eye:[-.7,1.02,.18],target:[.85,.3,-.35],fov:66,roll:.02,frame:'plane'};break;
 case'B19':c={eye:mix([2.6,2.0,-3.4],[2.3,1.9,-3.1],u),target:[1.2,1.22,-.5],fov:48,roll:-.06,frame:'plane'};break;
 case'B20':c={eye:[-34+8*u,14-4*u,-52],target:[0,-8,0],fov:50,roll:.03,frame:'plane'};break;
 case'B21':{const p=runway(t).pos;c={eye:add(p,mix([46,-5.5,-16],[30,-4.5,-12],u)),target:add(p,[1.5,.8,-.4]),fov:46,roll:0,frame:'world'};break;}
 case'B22':c={eye:[235,1.3,-24],target:add(runway(t).pos,[0,-.5,0]),fov:48,roll:0,frame:'world'};break;
 case'B23':{const p=runway(t).pos;c={eye:add(p,[-9-6*u,-2.3,-27]),target:add(p,[-7,-2.4,0]),fov:44,roll:0,frame:'world'};break;}
 case'B24':{const q=mix([760,0,62],[458,0,-13.5],smooth(50,53.6,t));c={eye:add(q,[17,5.5,6]),target:add(q,[-30,1.5,-7]),fov:52,roll:0,frame:'world'};break;}
 case'B25':c={eye:mix([452.5,1.55,-11.0],[451.2,1.35,-9.6],ease(52.5,55.5,t)),target:[448.8,1.0,-6.8],fov:46,roll:0,frame:'world'};break;
 case'B26':c={eye:mix([459,2.0,-16],[475,26,-62],ease(56,59.6,t)),target:mix([463,1.6,-6],[455,4,0],ease(56,59.6,t)),fov:46,roll:0,frame:'world'};break;
 }
 const k=windShake(t),imp=impact(t),amp=k*(c.frame==='plane'&&s.set==='air'?.018:.06)+imp*.05;
 c.eye=add(c.eye,[noise(t*11)*amp,noise(t*13+4)*amp,noise(t*12+8)*amp*.7]);c.roll+=noise(t*9+2)*amp*.6;
 return c;}
export const CREW_FACTS={date:'10 June 1990',from:'Birmingham',to:'Málaga',alt:'17,300 ft',pax:81,crew:6,bolts:'84 of 90'};
