import {useEffect,useMemo} from 'react';
import {AdditiveBlending,Color,DoubleSide,InstancedBufferAttribute,InstancedBufferGeometry,PlaneGeometry,ShaderMaterial,Vector3} from 'three';
import {NOISE,TAIL} from './Atmos';
import {add,dist,hash,norm,scale,type V3,type Sky} from './story';

/** A deterministic dust puff: born at tb at o, drifting with v (drag k), growing from r0 to r1 over life. */
export interface Puff{tb:number;o:V3;v:V3;life:number;r0:number;r1:number;a:number;c:string;k?:number;rise?:number}
const MAX=6000;
/** Volumetric-looking dust: sorted, noise-eroded, sun-lit billboards with forward scattering toward the sun. */
export function Dust({time,puffs,sky,eye}:{time:number;puffs:Puff[];sky:Sky;eye:V3}){
 const geo=useMemo(()=>{const g=new InstancedBufferGeometry();const qd=new PlaneGeometry(2,2);g.index=qd.index;g.setAttribute('position',qd.getAttribute('position'));
  for(const [n,s] of [['aO',3],['aR',1],['aA',1],['aS',1],['aC',3]] as const)g.setAttribute(n,new InstancedBufferAttribute(new Float32Array(MAX*s),s));g.instanceCount=0;return g;},[]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 const mat=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,fog:false,uniforms:{uSD:{value:new Vector3()},uSun:{value:new Color()},uAmb:{value:new Color()},uHaze:{value:new Color()},uHD:{value:0}},
  vertexShader:`attribute vec3 aO,aC;attribute float aR,aA,aS;varying vec2 vUv;varying float vA,vS,vD;varying vec3 vC,vRt,vUp,vBk,vW;
void main(){vec3 rt=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]),up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]),bk=vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]);
float c=cos(aS*6.28),s=sin(aS*6.28);vec2 p=vec2(c*position.x-s*position.y,s*position.x+c*position.y);vec3 w=aO+(rt*p.x+up*p.y)*aR;vUv=position.xy;vA=aA;vS=aS;vC=aC;vRt=rt;vUp=up;vBk=bk;vW=w;vD=length(cameraPosition-aO);
gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
  fragmentShader:`uniform vec3 uSD,uSun,uAmb,uHaze;uniform float uHD;varying vec2 vUv;varying float vA,vS,vD;varying vec3 vC,vRt,vUp,vBk,vW;${NOISE}
void main(){float r=length(vUv);if(r>1.)discard;float e=fbm(vUv*1.6+vS*41.);float e2=vnoise(vUv*4.5+vS*13.);float edge=r+(e-.5)*.8+(e2-.5)*.25;float a=smoothstep(1.,.25,edge);if(a<.01)discard;
vec3 n=normalize(vRt*vUv.x+vUp*vUv.y+vBk*sqrt(max(0.,1.-r*r)));vec3 L=normalize(uSD);float lit=.55+.45*smoothstep(-.6,.9,dot(n,L));vec3 v=normalize(cameraPosition-vW);float fwd=pow(max(0.,dot(-v,L)),4.);
vec3 col=vC*(uAmb*.55+uSun*lit*.75)+uSun*fwd*.9*(1.-a*.5);float f=1.-exp(-vD*uHD);col=mix(col,uHaze,f);gl_FragColor=vec4(col,a*vA*smoothstep(.2,1.5,vD));${TAIL}}`}),[]);
 const u=mat.uniforms;u.uSD.value.set(...norm(sky.sunDir));(u.uSun.value as Color).set(sky.sun);(u.uAmb.value as Color).set(sky.ambient);(u.uHaze.value as Color).set(sky.haze);u.uHD.value=sky.hazeD;
 const live:{p:V3;r:number;a:number;s:number;c:Color;d:number}[]=[];const tmp=new Map<string,Color>();
 for(let i=0;i<puffs.length;i++){const f=puffs[i],age=time-f.tb;if(age<0||age>f.life)continue;const k=f.k??1.6,dr=(1-Math.exp(-k*age))/k;const u2=age/f.life;
  const p=add(add(f.o,scale(f.v,dr)),[0,(f.rise??.25)*age,0]);const r=f.r0+(f.r1-f.r0)*(1-Math.pow(1-u2,2.2));const a=f.a*Math.min(1,age*10)*Math.pow(1-u2,1.4);if(a<.005)continue;
  let c=tmp.get(f.c);if(!c){c=new Color(f.c);tmp.set(f.c,c);}live.push({p,r,a,s:hash(i*.37+f.tb),c,d:dist(p,eye)});}
 live.sort((a,b)=>b.d-a.d);const n=Math.min(MAX,live.length);
 const O=geo.getAttribute('aO') as InstancedBufferAttribute,R=geo.getAttribute('aR') as InstancedBufferAttribute,A=geo.getAttribute('aA') as InstancedBufferAttribute,Sd=geo.getAttribute('aS') as InstancedBufferAttribute,C=geo.getAttribute('aC') as InstancedBufferAttribute;
 const OA=O.array as Float32Array,RA=R.array as Float32Array,AA=A.array as Float32Array,SA=Sd.array as Float32Array,CA=C.array as Float32Array;
 for(let i=0;i<n;i++){const l=live[live.length-n+i];OA.set(l.p,i*3);RA[i]=l.r;AA[i]=l.a;SA[i]=l.s;CA[i*3]=l.c.r;CA[i*3+1]=l.c.g;CA[i*3+2]=l.c.b;}
 O.needsUpdate=R.needsUpdate=A.needsUpdate=Sd.needsUpdate=C.needsUpdate=true;geo.instanceCount=n;
 return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={8}/>;}

/** Star-shaped muzzle flash billboard (additive). */
export function Flash({pos,k,seed}:{pos:V3;k:number;seed:number}){const mat=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,fog:false,uniforms:{uK:{value:1},uS:{value:0}},
 vertexShader:`varying vec2 vU;void main(){vU=uv*2.-1.;vec4 mv=modelViewMatrix*vec4(0.,0.,0.,1.);mv.xy+=position.xy;gl_Position=projectionMatrix*mv;}`,
 fragmentShader:`uniform float uK,uS;varying vec2 vU;void main(){float r=length(vU),a=atan(vU.y,vU.x)+uS;float star=pow(abs(cos(a*3.)),12.)*exp(-r*2.2)+exp(-r*r*14.);vec3 c=mix(vec3(1.,.55,.15),vec3(1.,.95,.75),exp(-r*5.));gl_FragColor=vec4(c*star*uK*1.6,1.);${TAIL}}`}),[]);
 mat.uniforms.uK.value=k;mat.uniforms.uS.value=seed*3.1;if(k<=0)return null;return <mesh position={pos} material={mat} frustumCulled={false} renderOrder={9}><planeGeometry args={[.9,.9]}/></mesh>;}
