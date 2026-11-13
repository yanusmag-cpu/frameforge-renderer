import {useEffect,useRef} from 'react';
import {BufferAttribute,BufferGeometry,Color,DoubleSide} from 'three';
import {add,cross,dist,dot,hash,norm,scale,sub,type V3} from './story';
import {FOREARM,HEAD_R,HIP_W,OUTFIT,SHIN,SHOULDER_W,THIGH,TORSO,UPPER_ARM,shoulderOf,type Outfit,type Pose} from './cast';
/** FrameForge stickman: flat white round head with a thick black outline, thin black limbs, black hands, expressive face.
 * Drawn as camera-facing paper layers with two-bone IK; 1932 Australian uniforms; back view when facing away. */
const INK='#0b0e14',WHITE='#fffdf8',SHADE='#dcdfe4';
const LOOK:Record<Outfit,{body:string;dark:string;sleeve:string;belt:string;leg:string|null;boot:string;hat:string;hatDark:string}>={
 major:{body:'#7f6c45',dark:'#64552f',sleeve:'#7f6c45',belt:'#5a361c',leg:'#5f5233',boot:'#3f2716',hat:'#6e5333',hatDark:'#4f3b24'},
 soldier:{body:'#8a7b4c',dark:'#6c5f37',sleeve:'#8a7b4c',belt:'#b9a36a',leg:'#6a5c3a',boot:'#4a2f1b',hat:'#7a5b3a',hatDark:'#56402a'},
 farmer:{body:'#5d7ea6',dark:'#456184',sleeve:'#5d7ea6',belt:'#6b4428',leg:null,boot:'#3a2618',hat:'#d8b66b',hatDark:'#b08d48'}};
type Basis={r:V3;u:V3;n:V3};
export function solveIK(start:V3,target:V3,a:number,b:number,pole:V3){let d=dist(start,target);const dir=norm(sub(target,start));d=Math.min(Math.max(d,Math.abs(a-b)+1e-3),(a+b)*.999);
 const along=(a*a-b*b+d*d)/(2*d),h=Math.sqrt(Math.max(0,a*a-along*along));const pd=sub(pole,scale(dir,dot(pole,dir)));const pn=norm(Math.hypot(...pd)<1e-5?[0,0,1]:pd);
 return {joint:add(add(start,scale(dir,along)),scale(pn,h)),end:add(start,scale(dir,d))};}
class Paper{
 tris=new Map<string,number[]>();eye:V3;
 constructor(eye:V3){this.eye=eye;}
 tri(c:string,a:V3,b:V3,d:V3){let arr=this.tris.get(c);if(!arr){arr=[];this.tris.set(c,arr);}arr.push(...a,...b,...d);}
 poly(c:string,p:V3[]){for(let i=1;i<p.length-1;i++)this.tri(c,p[0],p[i],p[i+1]);}
 basis(at:V3,up:V3=[0,1,0]):Basis{const n=norm(sub(this.eye,at));let r=cross(up,n);if(Math.hypot(...r)<1e-4)r=cross([0,0,1],n);r=norm(r);return {r,u:norm(cross(n,r)),n};}
 at(p:V3,b:Basis,x:number,y:number,z=0):V3{return [p[0]+b.r[0]*x+b.u[0]*y+b.n[0]*z,p[1]+b.r[1]*x+b.u[1]*y+b.n[1]*z,p[2]+b.r[2]*x+b.u[2]*y+b.n[2]*z];}
 shape(c:string,p:V3,b:Basis,pts:[number,number][],z=0){this.poly(c,pts.map(([x,y])=>this.at(p,b,x,y,z)));}
 ellipse(c:string,p:V3,b:Basis,rx:number,ry=rx,z=0,seg=24,x0=0,y0=0){const ctr=this.at(p,b,x0,y0,z);for(let j=0;j<seg;j++){const a=j/seg*Math.PI*2,d=(j+1)/seg*Math.PI*2;this.tri(c,ctr,this.at(p,b,x0+Math.cos(a)*rx,y0+Math.sin(a)*ry,z),this.at(p,b,x0+Math.cos(d)*rx,y0+Math.sin(d)*ry,z));}}
 arc(c:string,p:V3,b:Basis,cx:number,cy:number,r:number,a0:number,a1:number,w:number,z=0,seg=10){for(let j=0;j<seg;j++){const a=a0+(a1-a0)*j/seg,d=a0+(a1-a0)*(j+1)/seg;this.seg(c,this.at(p,b,cx+Math.cos(a)*r,cy+Math.sin(a)*r,z),this.at(p,b,cx+Math.cos(d)*r,cy+Math.sin(d)*r,z),w,0,true);}}
 seg(c:string,a:V3,d:V3,w:number,layer=0,cap=true){const v=sub(d,a),n=norm(sub(this.eye,a));const r=scale(norm(cross(v,n)),w/2),o=scale(n,layer);const aa=add(a,o),dd=add(d,o);
  this.poly(c,[add(aa,r),sub(aa,r),sub(dd,r),add(dd,r)]);if(cap){const b=this.basis(aa);this.ellipse(c,aa,b,w/2,w/2,0,8);this.ellipse(c,dd,b,w/2,w/2,0,8);}}
 limb(a:V3,j:V3,e:V3,w:number,sleeve:string|null,upperOnly=false,layer=0,thick=1.7){this.seg(INK,a,j,w,layer);this.seg(INK,j,e,w*.92,layer);
  if(sleeve){this.seg(INK,a,j,w*(thick+.45),layer+.001);this.seg(sleeve,a,j,w*thick,layer+.004);if(!upperOnly){this.seg(INK,j,add(j,scale(sub(e,j),.8)),w*(thick+.4),layer+.001);this.seg(sleeve,j,add(j,scale(sub(e,j),.8)),w*thick*.92,layer+.004);}}}
 hand(p:V3,s:number,dir:V3,kind:'fist'|'open'|'thumb'|'point',layer=.03){const b=this.basis(p);this.ellipse(INK,p,b,.055*s,.055*s,layer,14);const d=norm(dir);
  if(kind==='open'){for(let i=-1;i<=1;i++){const off=scale(norm(cross(d,b.n)),i*.03*s);this.seg(INK,add(p,off),add(add(p,off),scale(d,.075*s)),.024*s,layer);}this.seg(INK,p,add(p,scale(norm(add(cross(b.n,d),scale(d,.5))),.065*s)),.022*s,layer);}
  if(kind==='thumb')this.seg(INK,p,add(p,[0,.11*s,0]),.032*s,layer);
  if(kind==='point')this.seg(INK,p,add(p,scale(d,.13*s)),.026*s,layer);}
 slouch(p:V3,f:Basis,R:number,L:typeof LOOK['soldier'],z:number,back:boolean,side:number){
  this.shape(INK,p,f,[[-R*.78,R*.5],[R*.78,R*.5],[R*.62,R*1.32],[R*.2,R*1.45],[-R*.2,R*1.45],[-R*.62,R*1.32]],z);this.shape(L.hat,p,f,[[-R*.72,R*.55],[R*.72,R*.55],[R*.57,R*1.27],[R*.18,R*1.39],[-R*.18,R*1.39],[-R*.57,R*1.27]],z+.001);
  this.shape(L.hatDark,p,f,[[-R*.74,R*.55],[R*.74,R*.55],[R*.72,R*.72],[-R*.72,R*.72]],z+.002);this.shape(L.hatDark,p,f,[[-R*.05,R*1.0],[R*.05,R*1.0],[R*.03,R*1.42],[-R*.03,R*1.42]],z+.002);
  this.ellipse(INK,p,f,R*1.62,R*.24,z+.003,30,0,R*.55);this.ellipse(L.hat,p,f,R*1.56,R*.19,z+.004,30,0,R*.55);
  // the left brim pinned up against the crown, with the rising-sun badge
  const sx=side*R;this.shape(INK,p,f,[[sx*.55,R*.5],[sx*1.62,R*.56],[sx*1.0,R*1.42],[sx*.55,R*1.25]],z+.005);this.shape(L.hat,p,f,[[sx*.6,R*.56],[sx*1.5,R*.6],[sx*.98,R*1.33],[sx*.6,R*1.2]],z+.006);
  if(!back){this.ellipse('#d3a63e',p,f,R*.16,R*.11,z+.007,12,sx*.9,R*.95);for(let i=0;i<7;i++){const a=Math.PI*(.1+.8*i/6);this.seg('#d3a63e',this.at(p,f,sx*.9,R*.95,z+.007),this.at(p,f,sx*.9+Math.cos(a)*R*.28,R*.95+Math.sin(a)*R*.24,z+.007),R*.035,0,false);}}}
 straw(p:V3,f:Basis,R:number,z:number){this.shape(INK,p,f,[[-R*.7,R*.55],[R*.7,R*.55],[R*.6,R*1.2],[-R*.6,R*1.2]],z);this.shape('#d8b66b',p,f,[[-R*.64,R*.6],[R*.64,R*.6],[R*.55,R*1.15],[-R*.55,R*1.15]],z+.001);
  this.shape('#8a2f24',p,f,[[-R*.66,R*.6],[R*.66,R*.6],[R*.64,R*.74],[-R*.64,R*.74]],z+.002);this.ellipse(INK,p,f,R*1.9,R*.26,z+.003,30,0,R*.58);this.ellipse('#d8b66b',p,f,R*1.84,R*.2,z+.004,30,0,R*.58);this.ellipse('#c09a52',p,f,R*1.84,R*.07,z+.005,30,0,R*.5);}
 actor(p:Pose,time:number){const s=p.scale,o=OUTFIT[p.id],L=LOOK[o];
  const shoulder=shoulderOf(p),bb=this.basis(shoulder,p.up),right=bb.r,down=scale(p.up,-1),fwd=norm(cross(right,p.up));
  const toCam=norm(sub(this.eye,p.head)),back=dot(p.face,toCam)< -.3;const side=dot(cross([0,1,0],p.face),toCam)>0?-1:1;
  const ls=add(shoulder,scale(right,-SHOULDER_W*s)),rs=add(shoulder,scale(right,SHOULDER_W*s)),lh=add(p.hip,scale(right,-HIP_W*s)),rh=add(p.hip,scale(right,HIP_W*s));
  // legs: thin black sticks; uniform puttees on the shins; boots
  for(const [hip,foot] of [[lh,p.lFoot],[rh,p.rFoot]] as const){const ik=solveIK(hip,foot,THIGH*s,SHIN*s,scale(fwd,p.kneeBias*.8));
   this.seg(INK,hip,ik.joint,.072*s,0);this.seg(INK,ik.joint,ik.end,.068*s,0);
   if(L.leg){this.seg(INK,hip,ik.joint,.16*s,.0005);this.seg(L.leg,hip,ik.joint,.13*s,.001);this.seg(INK,add(ik.joint,scale(sub(ik.end,ik.joint),.35)),add(ik.joint,scale(sub(ik.end,ik.joint),.92)),.12*s,.0005);
    this.seg(L.dark,add(ik.joint,scale(sub(ik.end,ik.joint),.38)),add(ik.joint,scale(sub(ik.end,ik.joint),.9)),.095*s,.001);for(let i=0;i<4;i++){const a=add(ik.joint,scale(sub(ik.end,ik.joint),.42+i*.12));this.seg(L.leg,add(a,scale(right,-.04*s)),add(add(a,scale(right,.04*s)),scale(down,-.03*s)),.012*s,.0015,false);}}
   const fb=this.basis(ik.end);this.ellipse(INK,ik.end,fb,.11*s,.06*s,.012,16,.03*s*(back?-1:1),-.012*s);this.ellipse(L.boot,ik.end,fb,.09*s,.042*s,.013,16,.03*s*(back?-1:1),-.008*s);}
  // torso: tunic with collar, pockets, buttons, belt / Sam Browne / braces
  const len=TORSO*s*(1-.12*p.squash),tb=this.basis(p.hip,p.up),wB=.17*s*(1+.18*p.squash),wS=.22*s*(1+.12*p.squash);
  this.shape(INK,p.hip,tb,[[-wB-.035*s,-.09*s],[wB+.035*s,-.09*s],[wS+.04*s,len*.82],[wS*.82,len+.07*s],[-wS*.82,len+.07*s],[-wS-.04*s,len*.82]],.003);
  this.shape(L.body,p.hip,tb,[[-wB,-.06*s],[wB,-.06*s],[wS,len*.8],[wS*.8,len+.035*s],[-wS*.8,len+.035*s],[-wS,len*.8]],.006);
  this.shape(L.dark,p.hip,tb,[[wB*.45,-.06*s],[wB,-.06*s],[wS,len*.8],[wS*.8,len+.035*s],[wS*.55,len*.8]],.0065);
  const T=(x:number,y:number,z=.009)=>this.at(p.hip,tb,x*s,y*s,z);
  if(!back&&o!=='farmer'){for(const x of [-.1,.1]){this.shape(L.dark,p.hip,tb,[[x*s-.055*s,.34*s],[x*s+.055*s,.34*s],[x*s+.055*s,.44*s],[x*s-.055*s,.44*s]],.008);this.seg(INK,T(x-.055,.44),T(x+.055,.44),.008*s,0,false);this.ellipse('#c9a64a',T(x,.42),tb,.01*s,.01*s,0,8);}
   for(const y of [.06,.2,.34,.48])this.ellipse('#c9a64a',T(0,y),tb,.012*s,.012*s,0,8);this.shape(L.dark,p.hip,tb,[[-.08*s,len+.03*s],[0,len-.04*s],[.08*s,len+.03*s]],.0085);}
  this.shape(L.belt,p.hip,tb,[[-wB*1.04,-.03*s],[wB*1.04,-.03*s],[wB*1.06,.04*s],[-wB*1.06,.04*s]],.0095);this.ellipse('#c9a64a',T(0,.005,.0097),tb,.025*s,.02*s,0,10);
  if(o==='major'){this.seg(L.belt,T(-.12,.02,.0098),T(.15,len/s-.02,.0098),.04*s,0,false);for(const sd of [-1,1]){const e=sd>0?rs:ls,eb=this.basis(e,p.up);this.ellipse('#d4b24a',e,eb,.022*s,.022*s,.02,8,-.03*s,.02*s);this.ellipse('#d4b24a',e,eb,.022*s,.022*s,.02,8,.03*s,.02*s);}}
  if(o==='soldier'){this.seg(L.belt,T(-.14,.0,.0098),T(.13,len/s-.04,.0098),.035*s,0,false);this.seg(L.belt,T(.14,.0,.0098),T(-.13,len/s-.04,.0098),.035*s,0,false);for(const x of [-.13,.13])this.shape(L.belt,p.hip,tb,[[x*s-.05*s,-.03*s],[x*s+.05*s,-.03*s],[x*s+.05*s,.08*s],[x*s-.05*s,.08*s]],.0099);}
  if(o==='farmer'){for(const x of [-.09,.09])this.seg(L.belt,T(x,-.02,.0098),T(x*1.2,len/s,.0098),.03*s,0,false);this.shape('#f0e6d0',p.hip,tb,[[-.06*s,len+.03*s],[0,len-.05*s],[.06*s,len+.03*s]],.009);}
  // arms
  const handKind=(sd:'l'|'r'):'fist'|'open'|'thumb'|'point'=>p.point===sd?'point':p.thumb&&sd==='r'?'thumb':(sd==='l'?p.fist.l:p.fist.r)?'fist':'open';
  for(const [sh,hand,sd] of [[ls,p.lHand,'l'],[rs,p.rHand,'r']] as const){const sideK=sd==='l'?-1:1;const ik=solveIK(sh,hand,UPPER_ARM*s,FOREARM*s,add(scale(down,.6*p.elbowBias),scale(right,sideK*.55)));
   this.limb(sh,ik.joint,ik.end,.066*s,L.sleeve,o==='farmer',.014,1.65);this.hand(ik.end,s,norm(sub(ik.end,ik.joint)),handKind(sd),.032);}
  // head
  this.seg(INK,shoulder,p.head,.065*s,.001);const fb=this.basis(p.head,p.up),c=Math.cos(p.tilt),sn=Math.sin(p.tilt);const f:Basis={r:add(scale(fb.r,c),scale(fb.u,sn)),u:sub(scale(fb.u,c),scale(fb.r,sn)),n:fb.n};
  const R=HEAD_R*s,sq=p.squash,rx=R*(1+.14*sq),ry=R*(1-.12*sq);
  this.ellipse(INK,p.head,f,rx+.026*s,ry+.026*s,.02,40);this.ellipse(WHITE,p.head,f,rx,ry,.023,40);
  this.shape(SHADE,p.head,f,Array.from({length:13},(_,i)=>{const a=-Math.PI/2+Math.PI*i/12;return [Math.cos(a)*rx,Math.sin(a)*ry] as [number,number];}).concat(Array.from({length:13},(_,i)=>{const a=Math.PI/2-Math.PI*i/12;return [Math.cos(a)*rx*.55+rx*.32,Math.sin(a)*ry*.97] as [number,number];})),.0235);
  if(!back){this.eyes(p,f,s,.03);this.mouth(p,f,s,time);if(o==='major'){for(const sd of [-1,1])this.shape(INK,p.head,f,[[0,-.085*s+p.lookUp*s],[sd*.13*s+p.look*s,-.1*s+p.lookUp*s],[sd*.1*s+p.look*s,-.06*s+p.lookUp*s],[0,-.055*s+p.lookUp*s]].map(([x,y])=>[x+p.look*s*.7,y]) as [number,number][],.036);}}
  else this.arc(INK,p.head,f,0,-ry*.2,ry*.5,Math.PI*1.2,Math.PI*1.8,.012*s,.03,6);
  if(p.binoculars&&!back){for(const sd of [-1,1]){this.ellipse(INK,p.head,f,.075*s,.075*s,.05,16,sd*.1*s+p.look*s,.04*s+p.lookUp*s);this.ellipse('#3b3f45',p.head,f,.055*s,.055*s,.052,16,sd*.1*s+p.look*s,.04*s+p.lookUp*s);this.ellipse('#9bb7cf',p.head,f,.03*s,.03*s,.054,12,sd*.1*s+p.look*s-.01*s,.05*s+p.lookUp*s);}}
  if(p.hat){if(o==='farmer')this.straw(p.head,f,R,.04);else this.slouch(p.head,f,R,L,.04,back,side);}
  if(p.sweat>0){const k=p.sweat;for(const [x,y,ph] of [[.8,.55,0],[-.85,.25,1.7]] as const){const dy=((time*1.3+ph)%1)*.12*s;this.ellipse('#7ec8ec',p.head,f,.022*s*k,.034*s*k,.06,10,x*R,y*R-dy);this.ellipse(WHITE,p.head,f,.007*s*k,.01*s*k,.061,6,x*R-.006*s,y*R-dy+.01*s);}}
 }
 eyes(p:Pose,f:Basis,s:number,z:number){const e=p.emotion,wide=['afraid','shocked','scream'].includes(e),lk=p.look*s,lu=p.lookUp*s;
  for(const side of [-1,1]){const x=side*.1*s+lk,y=.045*s+lu;
   if(e==='strain'||(e==='angry'&&p.blink<.5)){this.seg(INK,this.at(p.head,f,x-.04*s*side,y+.03*s,z),this.at(p.head,f,x+.035*s*side,y,z),.024*s);this.seg(INK,this.at(p.head,f,x+.035*s*side,y,z),this.at(p.head,f,x-.04*s*side,y-.03*s,z),.024*s);continue;}
   if(e==='smile'||e==='grin'){this.arc(INK,p.head,f,x,y-.012*s,.04*s,.3,Math.PI-.3,.022*s,z,6);continue;}
   if(wide){this.ellipse(INK,p.head,f,.062*s,.078*s*p.blink,z,18,x,y);this.ellipse(WHITE,p.head,f,.048*s,.063*s*p.blink,z+.002,18,x,y);this.ellipse(INK,p.head,f,.022*s,.028*s*p.blink,z+.004,12,x+lk*.2,y+lu*.2);}
   else{const h=e==='exhausted'||e==='sad'?.02:.042;this.ellipse(INK,p.head,f,.026*s,h*s*p.blink,z,12,x,y);if(e==='exhausted')this.seg(INK,this.at(p.head,f,x-.045*s,y+.024*s,z+.002),this.at(p.head,f,x+.045*s,y+.024*s,z+.002),.015*s);}
   const brow=['determined','focused','strain','shout','angry'].includes(e)?side*.04:['afraid','exhausted','sad','scream','whisper'].includes(e)?-side*.035:0,by=wide?.14:.12;
   this.seg(INK,this.at(p.head,f,x-.05*s,(by+brow+(e==='shocked'?.035:0))*s+lu,z+.003),this.at(p.head,f,x+.05*s,(by-brow+(e==='shocked'?.035:0))*s+lu,z+.003),.02*s);}}
 mouth(p:Pose,f:Basis,s:number,time:number){const e=p.emotion,z=.03,x=p.look*s*.7,y=-.13*s+p.lookUp*s*.6;
  if(e==='scream'||e==='shocked'||e==='afraid'||e==='shout'){const o=(e==='scream'?1.35:e==='shout'?.75+.5*p.mouthOpen:e==='afraid'?.7:1)*(.7+.3*Math.max(p.mouthOpen,.5));
   this.ellipse(INK,p.head,f,.066*s*o,.078*s*o*(1+.08*Math.sin(time*25)),z,18,x,y);this.ellipse('#c4505a',p.head,f,.046*s*o,.026*s*o,z+.003,12,x,y-.035*s*o);return;}
  if(e==='strain'||e==='grin'){const wd=e==='grin'?.1:.09;this.shape(INK,p.head,f,[[x-wd*s,y+.04*s],[x+wd*s,y+.04*s],[x+wd*.8*s,y-.05*s],[x-wd*.8*s,y-.05*s]],z);this.shape(WHITE,p.head,f,[[x-(wd-.015)*s,y+.027*s],[x+(wd-.015)*s,y+.027*s],[x+(wd*.8-.012)*s,y-.037*s],[x-(wd*.8-.012)*s,y-.037*s]],z+.002);
   this.seg(INK,this.at(p.head,f,x-(wd-.015)*s,y-.005*s,z+.004),this.at(p.head,f,x+(wd-.015)*s,y-.005*s,z+.004),.008*s,0,false);return;}
  if(e==='smile'){this.arc(INK,p.head,f,x,y+.06*s,.075*s,-Math.PI+.5,-.5,.02*s,z,8);return;}
  if(e==='whisper'){this.ellipse(INK,p.head,f,.022*s,.02*s,z,10,x,y);return;}
  const curve=e==='exhausted'||e==='sad'||e==='angry'?-.025:e==='determined'||e==='focused'?0:.006;for(let j=0;j<5;j++){const a=j/5,b=(j+1)/5,yy=(q:number)=>y+curve*s*(1-(q*2-1)**2);this.seg(INK,this.at(p.head,f,x+(-.065+a*.13)*s,yy(a),z),this.at(p.head,f,x+(-.065+b*.13)*s,yy(b),z),.018*s);}}
}
type Pool={geometry:BufferGeometry;buffer:Float32Array;attribute:BufferAttribute};
export function Actors({poses,eye,time,tint}:{poses:Pose[];eye:V3;time:number;tint:string}){const pool=useRef(new Map<string,Pool>()),paper=new Paper(eye);
 const ordered=[...poses].sort((a,b)=>dist(b.hip,eye)-dist(a.hip,eye));for(const p of ordered)paper.actor(p,time);
 for(const [c,v] of paper.tris){let p=pool.current.get(c);if(!p||p.buffer.length<v.length){p?.geometry.dispose();const n=3*2**Math.ceil(Math.log2(Math.max(8192,v.length/3)));const buffer=new Float32Array(n),attribute=new BufferAttribute(buffer,3),geometry=new BufferGeometry();geometry.setAttribute('position',attribute);p={geometry,buffer,attribute};pool.current.set(c,p);}
  p.buffer.set(v);p.attribute.clearUpdateRanges();p.attribute.addUpdateRange(0,v.length);p.attribute.needsUpdate=true;p.geometry.setDrawRange(0,v.length/3);}
 useEffect(()=>{const all=pool.current;return()=>all.forEach(p=>p.geometry.dispose());},[]);
 const k=new Color(tint);
 return <group>{[...paper.tris.keys()].map(c=>{const col=new Color(c).multiply(k);return <mesh key={c} geometry={pool.current.get(c)!.geometry} frustumCulled={false} renderOrder={1}><meshBasicMaterial color={col} side={DoubleSide} toneMapped={false} fog={false}/></mesh>;})}</group>;}
export {hash};
