import {useEffect,useRef} from 'react';
import {BufferAttribute,BufferGeometry,DoubleSide} from 'three';
import {actorPose,type Cast,type Action,type V3} from './motion';
const INK='#13171c',WHITE='#fffdf8';
const add=(a:V3,b:V3):V3=>a.map((v,i)=>v+b[i]) as V3;
const mul=(a:V3,n:number):V3=>a.map(v=>v*n) as V3;
type Basis={r:V3;u:V3;n:V3};
class Drawing{
 colors=new Map<string,number[]>();
 tri(c:string,a:V3,b:V3,d:V3){if(!this.colors.has(c))this.colors.set(c,[]);this.colors.get(c)!.push(...a,...b,...d);}
 polygon(c:string,p:V3[]){for(let j=1;j<p.length-1;j++)this.tri(c,p[0],p[j],p[j+1]);}
 at(p:V3,b:Basis,x:number,y:number,z=0):V3{return add(add(add(p,mul(b.r,x)),mul(b.u,y)),mul(b.n,z));}
 shape(c:string,p:V3,b:Basis,xy:number[][],z=0){this.polygon(c,xy.map(([x,y])=>this.at(p,b,x,y,z)));}
 disc(c:string,p:V3,b:Basis,rx:number,ry=rx,z=0,n=32){for(let j=0;j<n;j++){const a=j*Math.PI*2/n,v=(j+1)*Math.PI*2/n;this.tri(c,this.at(p,b,0,0,z),this.at(p,b,Math.cos(a)*rx,Math.sin(a)*ry,z),this.at(p,b,Math.cos(v)*rx,Math.sin(v)*ry,z));}}
 bone(c:string,a:V3,b:V3,w:number,z=0){const dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;const r:V3=[-dy/l*w/2,dx/l*w/2,0],v:V3=[0,0,z];this.polygon(c,[add(add(a,r),v),add(add(a,mul(r,-1)),v),add(add(b,mul(r,-1)),v),add(add(b,r),v)]);const base:Basis={r:[1,0,0],u:[0,1,0],n:[0,0,1]};this.disc(c,a,base,w/2,w/2,z,10);this.disc(c,b,base,w/2,w/2,z,10);}
 person(id:Cast,t:number,action:Action,elapsed:number,seated=false,mouth=0){
 const p=actorPose(id,t,action,elapsed,seated),b:Basis={r:action==='crawl'?[.2,-.98,0]:[1,0,0],u:action==='crawl'?[.98,.2,0]:[0,1,0],n:[0,0,1]},coat=id==='michael'?'#526a83':id==='jane'?'#454953':id==='narrator'?'#c32d3b':'#293f49';
 for(const [hip,knee,foot]of[[p.leftHip,p.leftLeg.joint,p.leftFoot],[p.rightHip,p.rightLeg.joint,p.rightFoot]] as [V3,V3,V3][]){this.bone(INK,hip,knee,.065);this.bone(INK,knee,foot,.06);this.disc(INK,foot,b,.12,.045,.008,16);}
 this.shape(INK,p.hip,b,[[-.21,-.04],[.21,-.04],[.25,.44],[.13,.56],[-.13,.56],[-.25,.44]],.009);
 this.shape(coat,p.hip,b,[[-.18,-.01],[.18,-.01],[.22,.42],[.11,.53],[-.11,.53],[-.22,.42]],.015);
 if(id==='jane'||id==='michael'){
 this.shape('#c3dae0',p.hip,b,[[-.11,.52],[0,.24],[.11,.52]],.02);
 this.bone(INK,this.at(p.hip,b,0,0,.025),this.at(p.hip,b,0,.25,.025),.012);
 for(let k=0;k<3;k++)this.disc('#c6c4b6',this.at(p.hip,b,.02,.1+k*.08,.03),b,.009);
 }else if(id==='narrator'){
 this.shape('#8a202d',p.hip,b,[[-.18,.48],[0,.32],[.18,.48],[.12,.36],[0,.25],[-.12,.36]],.02);
 for(const k of [-1,1])this.bone('#f7e6cc',this.at(p.hip,b,k*.055,.38,.025),this.at(p.hip,b,k*.06,.18,.025),.012);
 }
 for(const [start,arm]of[[p.leftShoulder,p.leftArm],[p.rightShoulder,p.rightArm]] as const){this.bone(INK,start,arm.joint,.055,.01);this.bone(INK,arm.joint,arm.end,.05,.015);this.bone(id==='jane'?'#c3dae0':coat,start,arm.joint,.035,.02);this.disc(INK,arm.end,b,.065,.065,.025,16);this.disc(WHITE,arm.end,b,.044,.044,.03,16);}
 this.bone(INK,p.shoulder,p.head,.045,.01);
 const face:Basis={r:[Math.cos(p.tilt),Math.sin(p.tilt),0],u:[-Math.sin(p.tilt),Math.cos(p.tilt),0],n:[0,0,1]};
 this.disc(INK,p.head,face,.326,.326,.03,48);this.disc(WHITE,p.head,face,.295,.295,.035,48);
 if(id==='michael'){
 this.shape(INK,p.head,face,[[-.30,.1],[-.24,.26],[-.1,.32],[.1,.32],[.25,.24],[.30,.1],[.21,.18],[-.21,.18]],.04);
 this.shape('#655241',p.head,face,[[-.28,.12],[-.22,.25],[-.1,.30],[.1,.30],[.23,.23],[.27,.14],[.20,.20],[-.21,.20]],.045);
 }else if(id==='jane'){
 this.shape(INK,p.head,face,[[-.32,.08],[-.34,.24],[-.24,.22],[-.28,.35],[-.12,.30],[-.03,.41],[.03,.33],[.20,.38],[.19,.28],[.33,.25],[.28,.09],[.20,.19],[.05,.23],[-.10,.18],[-.21,.12]],.045);
 this.shape('#d2a45c',p.head,face,[[-.29,.12],[-.31,.21],[-.21,.19],[-.24,.31],[-.10,.27],[-.02,.36],[.03,.29],[.16,.34],[.15,.26],[.29,.23],[.26,.14],[.19,.21],[.05,.25],[-.10,.21],[-.22,.16]],.05);
 this.shape('#e7bc75',p.head,face,[[-.30,.17],[-.12,.27],[.02,.38],[.17,.31],[.24,.22],[.01,.27],[-.08,.15]],.055);
 }
 const serious=id==='michael'||action==='alarm'||action==='think';
 for(const side of [-1,1]){this.disc(INK,this.at(p.head,face,side*.095+p.gaze,.035,.06),face,.022,.047*p.blink);const slope=serious?side*.025:-side*.012;this.bone(INK,this.at(p.head,face,side*.09-.05,.135+slope,.06),this.at(p.head,face,side*.09+.05,.135-slope,.06),.018);}
 for(let k=0;k<10;k++){const x=(k/10-.5)*.14,v=((k+1)/10-.5)*.14;const smile=(id==='jane'&&action!=='think'&&action!=='alarm')||action==='smile';this.bone(INK,this.at(p.head,face,x,-.13-(smile?Math.sin(k/10*Math.PI)*.035:0),.065),this.at(p.head,face,v,-.13-(smile?Math.sin((k+1)/10*Math.PI)*.035:0),.065),.014);}
 if(mouth>.08){this.disc(INK,this.at(p.head,face,0,-.13,.07),face,.055,.012+mouth*.045);this.disc('#b96e75',this.at(p.head,face,0,-.15,.075),face,.025,mouth*.013);}
 if(action==='card'||action==='reach'){const h=p.rightArm.end;this.shape(INK,h,b,[[-.09,-.06],[.12,-.06],[.12,.08],[-.09,.08]],.04);this.shape('#d6d8c4',h,b,[[-.08,-.05],[.11,-.05],[.11,.07],[-.08,.07]],.045);this.shape('#aa3539',h,b,[[-.07,.025],[.1,.025],[.1,.05],[-.07,.05]],.05);}
 }
}
type Pool={geometry:BufferGeometry;buffer:Float32Array;attribute:BufferAttribute};
export function Character({id,time,action='idle',elapsed=0,position=[0,0,0],yaw=0,seated=false,mouth=0}:{id:Cast;time:number;action?:Action;elapsed?:number;position?:V3;yaw?:number;seated?:boolean;mouth?:number}){
 const pools=useRef(new Map<string,Pool>()),d=new Drawing();d.person(id,time,action,elapsed,seated,mouth);
 for(const [color,vertices]of d.colors){let p=pools.current.get(color);if(!p||p.buffer.length<vertices.length){p?.geometry.dispose();const buffer=new Float32Array(3*2**Math.ceil(Math.log2(Math.max(2048,vertices.length/3)))),attribute=new BufferAttribute(buffer,3),geometry=new BufferGeometry();geometry.setAttribute('position',attribute);p={geometry,buffer,attribute};pools.current.set(color,p);}p.buffer.set(vertices);p.attribute.needsUpdate=true;p.geometry.setDrawRange(0,vertices.length/3);}
 useEffect(()=>{const p=pools.current;return()=>p.forEach(v=>v.geometry.dispose());},[]);
 const p=actorPose(id,time,action,elapsed,seated);
 return <group position={[position[0]+p.root,position[1],position[2]]} rotation={[0,yaw+(action==='turn'?.28*Math.sin(Math.min(elapsed,3)/3*Math.PI):0),0]}>{[...d.colors.keys()].map(c=><mesh key={c} geometry={pools.current.get(c)!.geometry} frustumCulled={false} castShadow><meshBasicMaterial color={c} side={DoubleSide} toneMapped={false}/></mesh>)}</group>;
}
