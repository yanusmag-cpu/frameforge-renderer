import {useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {AdditiveBlending,BufferAttribute,BufferGeometry,Color,ConeGeometry,DoubleSide,PlaneGeometry,Quaternion,ShaderMaterial,Vector3} from 'three';
import {add,hash,norm,scale,sub,type V3} from './story';
import {NOISE} from './Atmos';
const TAIL=`
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;
export type Kind=0|1|2|3|4; // soft, bubble, foam, mote, glow
export interface Emitter{seed:number;count:number;start:number;end:number;life:number;origin:(t:number)=>V3;dir:V3;spread:number;speed:number;speedVar?:number;grav:V3;drag?:number;size:number;grow?:number;color:string;alpha:number;kind:Kind;wobble?:number;box?:V3}
export interface Glow{pos:V3;size:number;color:string;alpha:number}
export interface Field{centre:V3;box:V3;count:number;size:number;color:string;alpha:number;drift:V3;seed:number}
const MAX=9000;
function randUnit(i:number):V3{const u=hash(i)*2-1,a=hash(i+.37)*Math.PI*2,r=Math.sqrt(1-u*u);return [r*Math.cos(a),u,r*Math.sin(a)];}
/** Deterministic CPU-evaluated particles (pure function of absolute time), drawn as one Points batch. */
export function Particles({time,emitters,glows=[],fields=[],fog,fogD,torch,pixelScale}:{time:number;emitters:Emitter[];glows?:Glow[];fields?:Field[];fog:string;fogD:number;torch:{pos:V3;dir:V3;k:number}|null;pixelScale:number}){
 const {camera}=useThree();
 const geo=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(MAX*3),3));g.setAttribute('aSize',new BufferAttribute(new Float32Array(MAX),1));g.setAttribute('aAlpha',new BufferAttribute(new Float32Array(MAX),1));g.setAttribute('aColor',new BufferAttribute(new Float32Array(MAX*3),3));g.setAttribute('aKind',new BufferAttribute(new Float32Array(MAX),1));return g;},[]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 const mat=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uScale:{value:1},uFog:{value:new Color()},uFogD:{value:0},uTP:{value:new Vector3()},uTD:{value:new Vector3(0,1,0)},uTK:{value:0}},
  vertexShader:`attribute float aSize,aAlpha,aKind;attribute vec3 aColor;uniform float uScale,uTK;uniform vec3 uTP,uTD;varying float vA,vK,vF,vL;varying vec3 vC;
void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale/max(.05,-mv.z),0.,512.);vA=aAlpha;vK=aKind;vC=aColor;vF=length(mv.xyz);
vec3 d=position-uTP;float L=length(d);vL=uTK*smoothstep(.86,.97,dot(d/max(L,1e-3),uTD))*exp(-L*.22);}`,
  fragmentShader:`uniform vec3 uFog;uniform float uFogD;varying float vA,vK,vF,vL;varying vec3 vC;
void main(){vec2 q=gl_PointCoord*2.-1.;float r=length(q);if(r>1.)discard;float a;vec3 c=vC;
if(vK<.5){a=smoothstep(1.,.2,r);}
else if(vK<1.5){float rim=smoothstep(.62,.9,r)*smoothstep(1.,.92,r);float hl=smoothstep(.32,.0,length(q-vec2(-.35,.38)));a=rim*.9+hl+.12*smoothstep(1.,.0,r);c=mix(c,vec3(1.),hl);}
else if(vK<2.5){a=smoothstep(1.,.35,r)*(.75+.25*sin(q.x*9.+q.y*7.));}
else if(vK<3.5){a=smoothstep(1.,.1,r);}
else{a=pow(smoothstep(1.,0.,r),2.2);}
c+=vec3(1.,.95,.82)*vL*2.;a=clamp(a*vA*(1.+vL*3.),0.,1.);float f=1.-exp(-pow(vF*uFogD,2.));c=mix(c,uFog,f*(vK>3.5?.4:1.));a*=1.-f*.6;gl_FragColor=vec4(c,a);${TAIL}}`}),[]);
 const pos=geo.getAttribute('position') as BufferAttribute,size=geo.getAttribute('aSize') as BufferAttribute,alpha=geo.getAttribute('aAlpha') as BufferAttribute,color=geo.getAttribute('aColor') as BufferAttribute,kind=geo.getAttribute('aKind') as BufferAttribute;
 const P=pos.array as Float32Array,S=size.array as Float32Array,A=alpha.array as Float32Array,C=color.array as Float32Array,K=kind.array as Float32Array;let n=0;const tmp=new Color();
 const put=(p:V3,s:number,a:number,c:Color,k:number)=>{if(n>=MAX||a<=.002)return;P[n*3]=p[0];P[n*3+1]=p[1];P[n*3+2]=p[2];S[n]=s;A[n]=a;C[n*3]=c.r;C[n*3+1]=c.g;C[n*3+2]=c.b;K[n]=k;n++;};
 for(const e of emitters){tmp.set(e.color);const drag=e.drag??0;for(let i=0;i<e.count;i++){const h=e.seed*1000+i,birth=e.start+(i+hash(h))/e.count*(e.end-e.start),age=time-birth;if(age<0||age>e.life)continue;
  const o=e.origin(birth),r=randUnit(h+.5),v=scale(norm(add(e.dir,scale(r,e.spread))),e.speed*(1+(e.speedVar??.4)*(hash(h+.9)-.5)));
  const f=drag>1e-4?(1-Math.exp(-drag*age))/drag:age,gk=drag>1e-4?(age-f)/drag:age*age/2;let p=add(add(o,scale(v,f)),scale(e.grav,gk));
  if(e.wobble){p=add(p,[Math.sin(age*8+hash(h+2)*6)*e.wobble,0,Math.cos(age*7+hash(h+3)*6)*e.wobble]);}
  const life=age/e.life,fade=Math.min(1,age*8)*(1-life*life);put(p,e.size*(1+(e.grow??0)*life)*(.6+.8*hash(h+4)),e.alpha*fade,tmp,e.kind);}}
 const cam=camera.position;
 for(const f of fields){tmp.set(f.color);for(let i=0;i<f.count;i++){const h=f.seed*997+i;const b:V3=[hash(h)*f.box[0],hash(h+.1)*f.box[1],hash(h+.2)*f.box[2]];
  const p:V3=[0,0,0];for(let k=0;k<3;k++){const c=k===0?cam.x:k===1?cam.y:cam.z,base=b[k]+f.drift[k]*time+Math.sin(time*.5+h)*.05,m=((base-c+f.box[k]/2)%f.box[k]+f.box[k])%f.box[k];p[k]=c+m-f.box[k]/2;}
  if(f.centre[1]!==0&&p[1]>f.centre[1])continue;put(p,f.size*(.5+hash(h+.3)),f.alpha*(.4+.6*hash(h+.4)),tmp,3);}}
 for(const g of glows){tmp.set(g.color);put(g.pos,g.size,g.alpha,tmp,4);}
 pos.needsUpdate=size.needsUpdate=alpha.needsUpdate=color.needsUpdate=kind.needsUpdate=true;geo.setDrawRange(0,n);
 const u=mat.uniforms;u.uScale.value=pixelScale;(u.uFog.value as Color).set(fog);u.uFogD.value=fogD;if(torch){u.uTP.value.set(...torch.pos);u.uTD.value.set(...norm(torch.dir));u.uTK.value=torch.k;}else u.uTK.value=0;
 return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={8}/>;}

// ---------------------------------------------------------------- rain streaks around the camera
export function Rain({time,count=2600,wind=[6,0,2] as V3,alpha=.38,fall=-26,color='#b9c7d6',box=[46,34,46] as V3,length=.55}:{time:number;count?:number;wind?:V3;alpha?:number;fall?:number;color?:string;box?:V3;length?:number}){const {camera}=useThree();
 const geo=useMemo(()=>{const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(count*6),3));return g;},[count]);useEffect(()=>()=>geo.dispose(),[geo]);
 const a=(geo.getAttribute('position') as BufferAttribute),P=a.array as Float32Array,c=camera.position,v:V3=[wind[0],fall,wind[2]],l=norm(v);
 for(let i=0;i<count;i++){const p:V3=[0,0,0];for(let k=0;k<3;k++){const cc=k===0?c.x:k===1?c.y:c.z;const base=hash(i*3+k)*box[k]+v[k]*(time+hash(i+.7)*3);p[k]=cc+(((base-cc)%box[k])+box[k])%box[k]-box[k]/2;}
  const L=length*(1+.7*hash(i+.2));P.set([...p,...add(p,scale(l,-L))],i*6);}
 a.needsUpdate=true;return <lineSegments geometry={geo} frustumCulled={false} renderOrder={9}><lineBasicMaterial color={color} transparent opacity={alpha} depthWrite={false} fog/></lineSegments>;}

// ---------------------------------------------------------------- volumetric torch / lamp beam
export function Beam({pos,dir,length=7,radius=1.6,intensity=1,color='#fff1cf',time}:{pos:V3;dir:V3;length?:number;radius?:number;intensity?:number;color?:string;time:number}){
 const geo=useMemo(()=>new ConeGeometry(1,1,40,12,true).translate(0,-.5,0),[]);
 const mat=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,side:DoubleSide,uniforms:{uI:{value:1},uC:{value:new Color()},uTime:{value:0}},
  vertexShader:`varying vec3 vN;varying vec3 vV;varying float vY;varying vec3 vW;void main(){vY=-position.y;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vV=normalize(-mv.xyz);vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform float uI,uTime;uniform vec3 uC;varying vec3 vN;varying vec3 vV;varying float vY;varying vec3 vW;${NOISE}
void main(){float edge=pow(abs(dot(normalize(vN),normalize(vV))),1.6);float along=pow(1.-clamp(vY,0.,1.),1.8)*smoothstep(0.,.04,vY);float dust=.7+.6*fbm3(vW*2.5+vec3(0.,uTime*.2,uTime*.1));gl_FragColor=vec4(uC*edge*along*dust*uI*.55,1.);${TAIL}}`}),[]);
 mat.uniforms.uI.value=intensity;(mat.uniforms.uC.value as Color).set(color);mat.uniforms.uTime.value=time;
 const q=new Quaternion().setFromUnitVectors(new Vector3(0,-1,0),new Vector3(...norm(dir)));
 return <mesh geometry={geo} material={mat} position={pos} quaternion={q} scale={[radius,length,radius]} renderOrder={7} frustumCulled={false}/>;}

// ---------------------------------------------------------------- sun / moon shafts under water
const RAY_VS=`varying vec2 vU;varying vec3 vW;void main(){vU=uv;vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`;
const RAY_FS=`uniform float uI,uTime,uS;uniform vec3 uC;varying vec2 vU;varying vec3 vW;${NOISE}
void main(){float x=vU.x;float side=smoothstep(0.,.35,x)*smoothstep(1.,.65,x);float stripes=.5+.5*sin(x*18.+uS*7.+uTime*.6)*fbm(vec2(x*6.+uS,uTime*.15));float fall=pow(vU.y,1.6);float d=length(cameraPosition-vW);float near=smoothstep(.5,3.,d);gl_FragColor=vec4(uC*side*stripes*fall*uI*.16*near,1.);${TAIL}}`;
export function GodRays({time,count=9,centre,spread=26,top=0,bottom=-30,intensity=1,color='#9fe3ef',seed=3}:{time:number;count?:number;centre:V3;spread?:number;top?:number;bottom?:number;intensity?:number;color?:string;seed?:number}){const {camera}=useThree();
 const geo=useMemo(()=>new PlaneGeometry(1,1).translate(0,-.5,0),[]);
 const mats=useMemo(()=>Array.from({length:count},(_,i)=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,side:DoubleSide,uniforms:{uI:{value:1},uC:{value:new Color()},uTime:{value:0},uS:{value:i*1.37}},vertexShader:RAY_VS,fragmentShader:RAY_FS})),[count]);
 useEffect(()=>()=>mats.forEach(m=>m.dispose()),[mats]);
 return <group>{mats.map((m,i)=>{(m.uniforms.uC.value as Color).set(color);m.uniforms.uI.value=intensity;m.uniforms.uTime.value=time;
  const x=centre[0]+(hash(seed+i)-.5)*spread+Math.sin(time*.2+i)*.8,z=centre[2]+(hash(seed+i+.5)-.5)*spread,w=2+hash(seed+i+.2)*4.5;const yaw=Math.atan2(camera.position.x-x,camera.position.z-z);
  return <mesh key={i} geometry={geo} material={m} position={[x,top,z]} rotation={[0,yaw,.12*Math.sin(i*1.7)]} scale={[w,top-bottom,1]} renderOrder={6} frustumCulled={false}/>;})}</group>;}

// ---------------------------------------------------------------- lightning bolt ribbon
export function Bolt({time,at,origin,seed,k}:{time:number;at:number;origin:V3;seed:number;k:number}){const {camera}=useThree();const a=time-at;
 const geo=useMemo(()=>new BufferGeometry(),[]);useEffect(()=>()=>geo.dispose(),[geo]);
 if(a<0||a>.42)return null;const vis=(a<.08?1:a<.16?.35:a<.24?.9:Math.max(0,1-(a-.24)*5))*k;const pts:V3[][]=[];let p=origin;const main:V3[]=[p];
 for(let i=0;i<22;i++){p=add(p,[(hash(seed*31+i)-.5)*14,-9-hash(seed+i*.3)*5,(hash(seed*17+i)-.5)*8]);main.push(p);if(i%5===2){const br:V3[]=[p];let q=p;for(let j=0;j<6;j++){q=add(q,[(hash(seed+i*7+j)-.2)*10,-6,(hash(seed+i*3+j)-.5)*6]);br.push(q);}pts.push(br);}}pts.unshift(main);
 const cam:V3=[camera.position.x,camera.position.y,camera.position.z];const verts:number[]=[];
 pts.forEach((line,li)=>{const w=li===0?2.2:.9;for(let i=0;i<line.length-1;i++){const A=line[i],B=line[i+1],n=norm(sub(cam,A)),r=scale(norm([ (B[1]-A[1])*n[2]-(B[2]-A[2])*n[1],(B[2]-A[2])*n[0]-(B[0]-A[0])*n[2],(B[0]-A[0])*n[1]-(B[1]-A[1])*n[0]]),w/2);
  const a1=add(A,r),a2=sub(A,r),b1=add(B,r),b2=sub(B,r);verts.push(...a1,...a2,...b2,...a1,...b2,...b1);}});
 geo.setAttribute('position',new BufferAttribute(new Float32Array(verts),3));
 return <mesh geometry={geo} frustumCulled={false} renderOrder={-5}><meshBasicMaterial color="#eef4ff" transparent opacity={vis} depthWrite={false} fog={false} toneMapped={false} side={DoubleSide} blending={AdditiveBlending}/></mesh>;}

