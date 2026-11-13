import {useEffect,useRef} from 'react';
import {BufferAttribute,BufferGeometry,Color,DoubleSide} from 'three';
import {add,cross,dist,hash,norm,scale,sub,OUTFIT,type Outfit,type Pose,type V3,HEAD_R,SHOULDER_W,HIP_W,UPPER_ARM,FOREARM,THIGH,SHIN,TORSO} from './story';
/** FrameForge stickman (flat, outlined, camera-facing) with two-bone IK, uniforms and wind-reactive cloth. */
const INK='#0b0e14',WHITE='#fffdf8',SHADE='#d6dbe3';
const LOOK:Record<Outfit,{body:string;dark:string;sleeve:string;sleeveTo:number;hair:string|null}>={
 captain:{body:'#f4f6f8',dark:'#c9d0d8',sleeve:'#f4f6f8',sleeveTo:.45,hair:'#2a2420'},officer:{body:'#f4f6f8',dark:'#c9d0d8',sleeve:'#f4f6f8',sleeveTo:.45,hair:'#5a3a22'},
 steward:{body:'#16224a',dark:'#0e1733',sleeve:'#16224a',sleeveTo:.95,hair:'#3a2a1c'},stewardess:{body:'#16224a',dark:'#0e1733',sleeve:'#16224a',sleeveTo:.95,hair:'#6b3d20'},
 hoodie:{body:'#d42a30',dark:'#a01d24',sleeve:'#d42a30',sleeveTo:.9,hair:null},passenger:{body:'#5b7aa6',dark:'#3f5a80',sleeve:'#5b7aa6',sleeveTo:.5,hair:'#3b2b20'},
 medic:{body:'#2f8a46',dark:'#1f6a33',sleeve:'#2f8a46',sleeveTo:.95,hair:null},fire:{body:'#1b2230',dark:'#10151e',sleeve:'#1b2230',sleeveTo:.95,hair:null}};
const PAX=['#5b7aa6','#a65b5b','#6b8f4e','#8a6aa8','#c08a3e','#4e8f8a','#777777','#b5577f'];
type Basis={r:V3;u:V3;n:V3};
export function solveIK(start:V3,target:V3,a:number,b:number,pole:V3){let d=dist(start,target);const dir=norm(sub(target,start));d=Math.min(Math.max(d,Math.abs(a-b)+1e-3),(a+b)*.999);
 const along=(a*a-b*b+d*d)/(2*d),h=Math.sqrt(Math.max(0,a*a-along*along));const pd=sub(pole,scale(dir,pole[0]*dir[0]+pole[1]*dir[1]+pole[2]*dir[2]));const pn=norm(Math.hypot(...pd)<1e-5?[0,0,1]:pd);
 return {joint:add(add(start,scale(dir,along)),scale(pn,h)),end:add(start,scale(dir,d))};}
function tint(hex:string,k:number,frost:number){const c=new Color(hex);c.setRGB(Math.min(1,c.r*k*(1-frost*.18)),Math.min(1,c.g*k*(1-frost*.05)),Math.min(1,c.b*k*(1+frost*.12)+frost*.02));return '#'+c.getHexString();}
class Paper{
 tris=new Map<string,number[]>();eye:V3;k=1;frost=0;
 constructor(eye:V3){this.eye=eye;}
 tri(c:string,a:V3,b:V3,d:V3){const key=tint(c,this.k,this.frost);let arr=this.tris.get(key);if(!arr){arr=[];this.tris.set(key,arr);}arr.push(...a,...b,...d);}
 poly(c:string,p:V3[]){for(let i=1;i<p.length-1;i++)this.tri(c,p[0],p[i],p[i+1]);}
 basis(at:V3,up:V3=[0,1,0]):Basis{const n=norm(sub(this.eye,at));let r=cross(up,n);if(Math.hypot(...r)<1e-4)r=cross([0,0,1],n);r=norm(r);return {r,u:norm(cross(n,r)),n};}
 at(p:V3,b:Basis,x:number,y:number,z=0):V3{return [p[0]+b.r[0]*x+b.u[0]*y+b.n[0]*z,p[1]+b.r[1]*x+b.u[1]*y+b.n[1]*z,p[2]+b.r[2]*x+b.u[2]*y+b.n[2]*z];}
 shape(c:string,p:V3,b:Basis,pts:[number,number][],z=0){this.poly(c,pts.map(([x,y])=>this.at(p,b,x,y,z)));}
 ellipse(c:string,p:V3,b:Basis,rx:number,ry=rx,z=0,seg=24,x0=0,y0=0){const ctr=this.at(p,b,x0,y0,z);for(let j=0;j<seg;j++){const a=j/seg*Math.PI*2,d=(j+1)/seg*Math.PI*2;this.tri(c,ctr,this.at(p,b,x0+Math.cos(a)*rx,y0+Math.sin(a)*ry,z),this.at(p,b,x0+Math.cos(d)*rx,y0+Math.sin(d)*ry,z));}}
 arc(c:string,p:V3,b:Basis,cx:number,cy:number,r:number,a0:number,a1:number,w:number,z=0,seg=10){for(let j=0;j<seg;j++){const a=a0+(a1-a0)*j/seg,d=a0+(a1-a0)*(j+1)/seg;this.seg(c,this.at(p,b,cx+Math.cos(a)*r,cy+Math.sin(a)*r,z),this.at(p,b,cx+Math.cos(d)*r,cy+Math.sin(d)*r,z),w,0,true);}}
 seg(c:string,a:V3,d:V3,w:number,layer=0,cap=true){const v=sub(d,a),n=norm(sub(this.eye,a));const r=scale(norm(cross(v,n)),w/2),o=scale(n,layer);const aa=add(a,o),dd=add(d,o);
  this.poly(c,[add(aa,r),sub(aa,r),sub(dd,r),add(dd,r)]);if(cap){const b=this.basis(aa);this.ellipse(c,aa,b,w/2,w/2,0,8);this.ellipse(c,dd,b,w/2,w/2,0,8);}}
 limb(a:V3,j:V3,e:V3,w:number,sleeve?:string,sleeveTo=1,layer=0,thick=1.6){const K=sleeve?thick+.35:1;this.seg(INK,a,j,w*(sleeve&&sleeveTo>0?K:1),layer);this.seg(INK,j,e,w*.92*(sleeve&&sleeveTo>.5?K*.95:1),layer);if(sleeve){const L1=Math.min(1,sleeveTo*2),L2=Math.max(0,sleeveTo*2-1);this.seg(sleeve,a,add(a,scale(sub(j,a),L1)),w*thick,layer+.004);if(L2>0)this.seg(sleeve,j,add(j,scale(sub(e,j),L2)),w*thick*.92,layer+.004);}}
 /** Simple black mitten hand; fist = round, open = palm + fingers. */
 hand(p:V3,s:number,fist:boolean,dir:V3){const b=this.basis(p);this.ellipse(INK,p,b,.052*s,.052*s,.024,14);
  if(!fist){const d=norm(dir);for(let i=-1;i<=1;i++){const off=scale(cross(d,b.n),i*.028*s);this.seg(INK,add(p,off),add(add(p,off),scale(d,.07*s)),.022*s,.024);}this.seg(INK,p,add(p,scale(norm(add(cross(b.n,d),scale(d,.5))),.06*s)),.02*s,.024);}}
 tie(top:V3,down:V3,wind:V3,s:number,time:number,layer:number){const k=Math.min(1,Math.hypot(...wind)/2.2),pts:V3[]=[top];let p=top;
  for(let i=0;i<5;i++){const w=Math.sin(time*(23+i*4)+i*1.3)*k*.35,dir=norm(add(add(scale(down,1-k*.85),scale(norm(wind.some(v=>v!==0)?wind:[0,-1,0]),k)),scale(cross(down,norm(sub(this.eye,p))),w)));p=add(p,scale(dir,.065*s));pts.push(p);}
  for(let i=0;i<pts.length-1;i++)this.seg('#0f1b3d',pts[i],pts[i+1],(.035+i*.008)*s,layer);this.ellipse('#0f1b3d',top,this.basis(top),.025*s,.025*s,layer+.001,10);}
 actor(p:Pose,time:number){const s=p.scale,o=OUTFIT[p.id],L=LOOK[o];this.k=Math.max(.05,p.light);this.frost=p.frost;
  const body=o==='passenger'?PAX[(p.id.charCodeAt(1)||0)%PAX.length]:L.body;
  const shoulder=add(p.hip,scale(p.up,TORSO*s)),bb=this.basis(shoulder,p.up),right=bb.r,down=scale(p.up,-1),fwd=norm(cross(right,p.up));
  const ls=add(shoulder,scale(right,-SHOULDER_W*s)),rs=add(shoulder,scale(right,SHOULDER_W*s)),lh=add(p.hip,scale(right,-HIP_W*s)),rh=add(p.hip,scale(right,HIP_W*s));
  if(o==='hoodie'){this.ellipse(INK,this.at(shoulder,bb,0,.08*s,-.01),bb,.215*s,.15*s,0,18);this.ellipse('#a01d24',this.at(shoulder,bb,0,.08*s,-.008),bb,.19*s,.125*s,0,18);}
  if(o==='stewardess'){const hb=this.basis(p.head,p.up);this.ellipse(INK,this.at(p.head,hb,0,.02*s,-.012),hb,(HEAD_R+.05)*s,(HEAD_R+.04)*s,0,28);this.ellipse(L.hair!,this.at(p.head,hb,0,.02*s,-.011),hb,(HEAD_R+.03)*s,(HEAD_R+.02)*s,0,28);}
  // legs: thin black sticks, black shoes; trousers darken the upper leg for uniforms
  for(const [hip,foot] of [[lh,p.lFoot],[rh,p.rFoot]] as const){const pole=add(scale(fwd,p.kneeBias*.8),[0,0,0]);const ik=solveIK(hip,foot,THIGH*s,SHIN*s,pole);
   this.limb(hip,ik.joint,ik.end,.07*s,o==='hoodie'||o==='passenger'?undefined:o==='medic'?'#24352c':o==='fire'?'#27303f':'#1c2440',1,0,1.15);
   const fb=this.basis(ik.end);this.ellipse(INK,ik.end,fb,.1*s,.055*s,.012,16,p.facing*.04*s,-.01*s);if(o==='fire'||o==='medic')this.seg('#e8d24a',this.at(ik.end,fb,-.06*s,.05*s,.016),this.at(ik.end,fb,.06*s,.05*s,.016),.015*s,0,false);}
  // torso: tapered, with uniform details
  const len=TORSO*s,tb=this.basis(p.hip,p.up),wB=.17*s,wS=.215*s;
  this.shape(INK,p.hip,tb,[[-wB-.03*s,-.07*s],[wB+.03*s,-.07*s],[wS+.035*s,len*.82],[wS*.82,len+.06*s],[-wS*.82,len+.06*s],[-wS-.035*s,len*.82]],.003);
  this.shape(body,p.hip,tb,[[-wB,-.04*s],[wB,-.04*s],[wS,len*.8],[wS*.8,len+.03*s],[-wS*.8,len+.03*s],[-wS,len*.8]],.006);
  this.shape(o==='passenger'?'#'+new Color(body).multiplyScalar(.72).getHexString():L.dark,p.hip,tb,[[wB*.45,-.04*s],[wB,-.04*s],[wS,len*.8],[wS*.8,len+.03*s],[wS*.55,len*.8]],.0065);
  const T=(x:number,y:number,z=.009)=>this.at(p.hip,tb,x*s,y*s,z);
  if(o==='captain'||o==='officer'){this.shape(INK,p.hip,tb,[[-wB,-.02*s],[wB,-.02*s],[wB,.04*s],[-wB,.04*s]],.008);this.ellipse('#c9a227',T(0,.01),tb,.025*s,.02*s,0,10);
   this.shape('#e7ebef',p.hip,tb,[[-.06*s,len+.03*s],[0,len-.06*s],[.06*s,len+.03*s]],.009);
   const stripes=o==='captain'?4:3;for(const sd of [-1,1]){const e=sd>0?rs:ls;const eb=this.basis(e,p.up);this.shape(INK,e,eb,[[-.075*s,-.02*s],[.075*s,-.02*s],[.075*s,.035*s],[-.075*s,.035*s]],.012);for(let i=0;i<stripes;i++)this.seg('#e2b53b',this.at(e,eb,-.06*s+i*.04*s/stripes*3,.0,.014),this.at(e,eb,-.06*s+i*.04*s/stripes*3,.025*s,.014),.008*s,0,false);}
   this.tie(T(0,.57,.012),down,p.wind,s,time,.013);}
  if(o==='steward'||o==='stewardess'){this.shape('#f4f6f8',p.hip,tb,[[-.065*s,len+.03*s],[0,len*.6],[.065*s,len+.03*s]],.009);for(const x of [-.03,.03])this.ellipse('#c9a227',T(x*0+(x<0?-.02:.02),.18-(x<0?0:.08)),tb,.012*s,.012*s,0,8);
   if(o==='steward')this.tie(T(0,.56,.012),down,p.wind,s,time,.013);else{this.ellipse('#d4202b',T(0,.58,.012),tb,.07*s,.035*s,0,12);this.seg('#d4202b',T(-.02,.57,.013),T(-.06-.04*Math.sin(time*20)*Math.min(1,Math.hypot(...p.wind)),.45,.013),.03*s);}}
  if(o==='hoodie'){this.shape('#a01d24',p.hip,tb,[[-.12*s,.06*s],[.12*s,.06*s],[.1*s,.22*s],[-.1*s,.22*s]],.009);this.seg(WHITE,T(-.05,.56,.012),T(-.07,.36,.012),.014*s);this.seg(WHITE,T(.05,.56,.012),T(.07,.38,.012),.014*s);}
  if(o==='medic'||o==='fire'){for(const y of [.12,.3])this.shape('#e8e85a',p.hip,tb,[[-wB*1.02,y*s],[wB*1.02,y*s],[wB*1.05,(y+.05)*s],[-wB*1.05,(y+.05)*s]],.009);if(o==='medic'){this.ellipse('#e8e85a',T(0,.45),tb,.05*s,.05*s,0,6);this.ellipse('#1f6a33',T(0,.45,.0095),tb,.03*s,.03*s,0,6);}}
  if(o==='passenger')this.shape('#f2efe8',p.hip,tb,[[-.05*s,len+.03*s],[0,len-.05*s],[.05*s,len+.03*s]],.009);
  // arms (in front of torso)
  for(const [sh,hand,side,fist] of [[ls,p.lHand,-1,p.fist.l],[rs,p.rHand,1,p.fist.r]] as const){const pole=add(scale(down,.6*p.elbowBias),scale(right,side*.55));const ik=solveIK(sh,hand,UPPER_ARM*s,FOREARM*s,pole);
   this.limb(sh,ik.joint,ik.end,.068*s,o==='hoodie'||o==='passenger'?body:L.sleeve,L.sleeveTo,.014,1.5);if(o==='steward'||o==='stewardess')this.seg('#e2b53b',add(ik.joint,scale(sub(ik.end,ik.joint),.82)),add(ik.joint,scale(sub(ik.end,ik.joint),.86)),.13*s,.02,false);
   this.hand(ik.end,s,fist,norm(sub(ik.end,ik.joint)));}
  if(p.tray){const c=scale(add(p.lHand,p.rHand),.5),b=this.basis(c,[0,1,0]);this.shape(INK,c,b,[[-.2*s,-.01*s],[.2*s,-.01*s],[.2*s,.03*s],[-.2*s,.03*s]],.03);this.shape('#b9bcc0',c,b,[[-.19*s,0],[.19*s,0],[.19*s,.02*s],[-.19*s,.02*s]],.032);
   for(const x of [-.1,.08]){this.shape(INK,c,b,[[(x-.045)*s,.02*s],[(x+.045)*s,.02*s],[(x+.04)*s,.11*s],[(x-.04)*s,.11*s]],.034);this.shape(WHITE,c,b,[[(x-.035)*s,.03*s],[(x+.035)*s,.03*s],[(x+.03)*s,.1*s],[(x-.03)*s,.1*s]],.036);}}
  // head
  this.seg(INK,shoulder,p.head,.06*s,.001);const fb=this.basis(p.head,p.up),c=Math.cos(p.tilt),sn=Math.sin(p.tilt);const f:Basis={r:add(scale(fb.r,c),scale(fb.u,sn)),u:sub(scale(fb.u,c),scale(fb.r,sn)),n:fb.n};
  const R=HEAD_R*s,lk=p.look*s,lu=p.lookUp*s;
  this.ellipse(INK,p.head,f,R+.02*s,R+.02*s,.02,36);this.ellipse(WHITE,p.head,f,R,R,.023,36);
  this.shape(SHADE,p.head,f,Array.from({length:13},(_,i)=>{const a=-Math.PI/2+Math.PI*i/12;return [Math.cos(a)*R,Math.sin(a)*R] as [number,number];}).concat(Array.from({length:13},(_,i)=>{const a=Math.PI/2-Math.PI*i/12;return [Math.cos(a)*R*.55+R*.32,Math.sin(a)*R*.97] as [number,number];})),.0235);
  if(p.frost>0)for(let i=0;i<7;i++)this.ellipse('#dff3ff',p.head,f,.012*s,.012*s,.03,6,(hash(i)-.5)*R*1.6,(hash(i+.5)-.5)*R*1.6);
  // hair / caps / helmets
  if(L.hair&&o!=='stewardess'&&!p.cap){const wild=p.hairWild;for(let i=0;i<7;i++){const a=Math.PI*(.2+.6*i/6),root:[number,number]=[Math.cos(a)*R*.95,Math.sin(a)*R*.95];const wv=norm(add(p.wind.some(v=>v!==0)?p.wind:[0,1,0],[0,0,0]));
   const tipW=add(this.at(p.head,f,root[0],root[1],.026),scale(wv,(.06+.06*wild)*s*(1+.4*Math.sin(time*30+i))));const tipS=this.at(p.head,f,root[0]*1.15,root[1]*1.15,.026);this.seg(L.hair!,this.at(p.head,f,root[0],root[1],.026),wild>0?add(scale(tipW,wild),scale(tipS,1-wild)):tipS,.05*s,.0);}
   this.arc(L.hair!,p.head,f,0,0,R*.93,Math.PI*.15,Math.PI*.85,.07*s,.026,10);}
  if(o==='stewardess'){this.arc(L.hair!,p.head,f,0,0,R*.95,Math.PI*.1,Math.PI*.9,.09*s,.026,12);this.ellipse(INK,p.head,f,.09*s,.08*s,.02,14,-R*.75,R*.6);this.ellipse(L.hair!,p.head,f,.075*s,.065*s,.0205,14,-R*.75,R*.6);}
  if(p.cap){this.shape(INK,p.head,f,[[-R*1.12,R*.55],[R*1.12,R*.55],[R*1.0,R*1.08],[-R*1.0,R*1.08]],.04);this.shape('#141b33',p.head,f,[[-R*1.08,R*.6],[R*1.08,R*.6],[R*.96,R*1.03],[-R*.96,R*1.03]],.041);
   this.shape('#d8b23a',p.head,f,[[-R*1.06,R*.6],[R*1.06,R*.6],[R*1.04,R*.66],[-R*1.04,R*.66]],.042);this.shape(INK,p.head,f,[[-R*.95,R*.48],[R*.95,R*.48],[R*.8,R*.6],[-R*.8,R*.6]],.042);this.ellipse('#e7c24b',p.head,f,.04*s,.03*s,.043,10,0,R*.8);}
  if(o==='fire'){this.ellipse(INK,p.head,f,R*1.12,R*.75,.04,24,0,R*.45);this.ellipse('#f2c418',p.head,f,R*1.05,R*.68,.041,24,0,R*.48);this.shape('#f2c418',p.head,f,[[-R*1.3,R*.25],[R*1.3,R*.25],[R*1.2,R*.38],[-R*1.2,R*.38]],.042);}
  if(o==='medic'){this.arc('#1f6a33',p.head,f,0,0,R*.95,Math.PI*.15,Math.PI*.85,.08*s,.026,10);}
  if(p.headset){this.arc(INK,p.head,f,0,0,R*1.06,Math.PI*.05,Math.PI*.95,.03*s,.045,14);for(const sd of [-1,1]){this.ellipse(INK,p.head,f,.06*s,.08*s,.046,14,sd*R*1.02,0);this.ellipse('#3b4048',p.head,f,.045*s,.065*s,.047,14,sd*R*1.02,0);}this.seg(INK,this.at(p.head,f,R*1.0,-.02*s,.048),this.at(p.head,f,R*.35,-.17*s,.048),.016*s,0);this.ellipse(INK,p.head,f,.022*s,.022*s,.049,10,R*.33,-.17*s);}
  this.eyes(p,f,lk,lu,s,.03);this.mouth(p,f,lk,lu,s,time);
  if(['afraid','shocked','strain','scream','exhausted'].includes(p.emotion)){this.ellipse('#7ec8ec',p.head,f,.018*s,.03*s,.05,10,R*.72,R*.35);}
 }
 eyes(p:Pose,f:Basis,lk:number,lu:number,s:number,z:number){const e=p.emotion,wide=['afraid','shocked','scream'].includes(e);
  for(const side of [-1,1]){const x=side*.095*s+lk,y=.04*s+lu;
   if(e==='strain'){this.seg(INK,this.at(p.head,f,x-.04*s*side,y+.03*s,z),this.at(p.head,f,x+.035*s*side,y,z),.022*s);this.seg(INK,this.at(p.head,f,x+.035*s*side,y,z),this.at(p.head,f,x-.04*s*side,y-.03*s,z),.022*s);continue;}
   if(e==='relieved'||e==='smile'){this.arc(INK,p.head,f,x,y-.01*s,.038*s,.3,Math.PI-.3,.02*s,z,6);if(e==='relieved')this.seg('#59b8e6',this.at(p.head,f,x+side*.02*s,y-.03*s,z+.004),this.at(p.head,f,x+side*.03*s,y-.13*s,z+.004),.018*s);continue;}
   if(wide){this.ellipse(INK,p.head,f,.058*s,.072*s*p.blink,z,18,x,y);this.ellipse(WHITE,p.head,f,.045*s,.058*s*p.blink,z+.002,18,x,y);this.ellipse(INK,p.head,f,.022*s,.028*s*p.blink,z+.004,12,x+lk*.2,y+lu*.2);}
   else{const h=e==='exhausted'||e==='weak'?.018:.04;this.ellipse(INK,p.head,f,.024*s,h*s*p.blink,z,12,x,y);if(e==='exhausted'||e==='weak')this.seg(INK,this.at(p.head,f,x-.04*s,y+.022*s,z+.002),this.at(p.head,f,x+.04*s,y+.022*s,z+.002),.014*s);}
   const brow=['determined','focused','strain','shout'].includes(e)?side*.035:['afraid','exhausted','weak','scream'].includes(e)?-side*.03:0,by=wide?.13:.11;
   this.seg(INK,this.at(p.head,f,x-.045*s,(by+brow+(e==='shocked'?.03:0))*s+lu,z+.003),this.at(p.head,f,x+.045*s,(by-brow+(e==='shocked'?.03:0))*s+lu,z+.003),.016*s);}}
 mouth(p:Pose,f:Basis,lk:number,lu:number,s:number,time:number){const e=p.emotion,z=.03,x=lk*.7,y=-.12*s+lu*.6;
  if(e==='scream'||e==='shocked'||e==='afraid'||e==='shout'){const o=e==='scream'?1.3:e==='shout'?.8+.5*p.mouthOpen:1;this.ellipse(INK,p.head,f,.065*s*o,.075*s*o*(1+.08*Math.sin(time*25)),z,18,x,y);this.ellipse('#c4505a',p.head,f,.045*s*o,.025*s*o,z+.003,12,x,y-.035*s*o);return;}
  if(e==='strain'){this.shape(INK,p.head,f,[[x-.09*s,y+.035*s],[x+.09*s,y+.035*s],[x+.08*s,y-.045*s],[x-.08*s,y-.045*s]],z);this.shape(WHITE,p.head,f,[[x-.075*s,y+.022*s],[x+.075*s,y+.022*s],[x+.068*s,y-.032*s],[x-.068*s,y-.032*s]],z+.002);
   this.seg(INK,this.at(p.head,f,x-.075*s,y-.005*s,z+.004),this.at(p.head,f,x+.075*s,y-.005*s,z+.004),.008*s,0,false);for(const k of [-.04,0,.04])this.seg(INK,this.at(p.head,f,x+k*s,y+.02*s,z+.004),this.at(p.head,f,x+k*s,y-.03*s,z+.004),.006*s,0,false);return;}
  if(e==='smile'||e==='relieved'){this.arc(INK,p.head,f,x,y+.06*s,.075*s,-Math.PI+.5,-.5,.018*s,z,8);return;}
  const curve=e==='exhausted'||e==='weak'?-.02:e==='determined'||e==='focused'?0:.006;for(let j=0;j<5;j++){const a=j/5,b=(j+1)/5,yy=(q:number)=>y+curve*s*(1-(q*2-1)**2);this.seg(INK,this.at(p.head,f,x+(-.06+a*.12)*s,yy(a),z),this.at(p.head,f,x+(-.06+b*.12)*s,yy(b),z),.016*s);}}
}
type Pool={geometry:BufferGeometry;buffer:Float32Array;attribute:BufferAttribute};
export function Actors({poses,eye,time}:{poses:Pose[];eye:V3;time:number}){const pool=useRef(new Map<string,Pool>()),paper=new Paper(eye);
 const ordered=[...poses].sort((a,b)=>dist(b.hip,eye)-dist(a.hip,eye));for(const p of ordered)if(p.light>0)paper.actor(p,time);
 for(const [c,v] of paper.tris){let p=pool.current.get(c);if(!p||p.buffer.length<v.length){p?.geometry.dispose();const n=3*2**Math.ceil(Math.log2(Math.max(8192,v.length/3)));const buffer=new Float32Array(n),attribute=new BufferAttribute(buffer,3),geometry=new BufferGeometry();geometry.setAttribute('position',attribute);p={geometry,buffer,attribute};pool.current.set(c,p);}
  p.buffer.set(v);p.attribute.clearUpdateRanges();p.attribute.addUpdateRange(0,v.length);p.attribute.needsUpdate=true;p.geometry.setDrawRange(0,v.length/3);}
 useEffect(()=>{const all=pool.current;return()=>all.forEach(p=>p.geometry.dispose());},[]);
 return <group>{[...paper.tris.keys()].map(c=><mesh key={c} geometry={pool.current.get(c)!.geometry} frustumCulled={false} castShadow renderOrder={1}><meshBasicMaterial color={c} side={DoubleSide} toneMapped={false}/></mesh>)}</group>;}
