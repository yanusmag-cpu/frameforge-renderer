import {useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {AdditiveBlending,BackSide,BufferAttribute,BufferGeometry,Color,DoubleSide,InstancedBufferAttribute,InstancedBufferGeometry,PlaneGeometry,ShaderMaterial,SphereGeometry,Vector3} from 'three';
import {hash,norm,type Sky} from './story';
export const NOISE=`
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vnoise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*vnoise3(p);p=p*2.1+3.1;a*=.5;}return v;}
`;
export const TAIL=`
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;
/** Gradient sky with a hot sun disc, glow and drifting cirrus. Follows the camera. */
export function SkyDome({time,sky}:{time:number;sky:Sky}){const {camera}=useThree();
 const mat=useMemo(()=>new ShaderMaterial({side:BackSide,depthWrite:false,fog:false,uniforms:{uTime:{value:0},uZ:{value:new Color()},uH:{value:new Color()},uSun:{value:new Color()},uSD:{value:new Vector3()},uHaze:{value:new Color()}},
  vertexShader:`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.99999;}`,
  fragmentShader:`uniform float uTime;uniform vec3 uZ,uH,uSun,uSD,uHaze;varying vec3 vD;${NOISE}
void main(){vec3 d=normalize(vD);float y=d.y;vec3 col=mix(uH,uZ,pow(smoothstep(-.02,.8,y),.65));col=mix(col,uHaze,smoothstep(.1,-.08,y));
float s=max(0.,dot(d,normalize(uSD)));col+=uSun*(pow(s,6.)*.32+pow(s,60.)*.7)+vec3(1.,.95,.85)*smoothstep(.9993,.9997,s)*5.;
vec2 uv=d.xz/(abs(y)+.15);float ci=fbm(uv*vec2(1.1,5.)+vec2(uTime*.008,0.));col=mix(col,mix(vec3(1.),uSun,.5)*mix(.95,1.25,s),smoothstep(.58,.86,ci)*smoothstep(.05,.4,y)*.45);
gl_FragColor=vec4(col,1.);${TAIL}}`}),[]);
 const u=mat.uniforms;u.uTime.value=time;(u.uZ.value as Color).set(sky.zenith);(u.uH.value as Color).set(sky.horizon);(u.uSun.value as Color).set(sky.sun);(u.uHaze.value as Color).set(sky.haze);u.uSD.value.set(...norm(sky.sunDir));
 const geo=useMemo(()=>new SphereGeometry(5000,48,24),[]);return <mesh geometry={geo} material={mat} position={camera.position.toArray()} frustumCulled={false} renderOrder={-20}/>;}

// ---------------------------------------------------------------- cumulus from lit, noise-eroded billboard puffs (sorted back-to-front)
const TILE=3400;
interface Puff{p:[number,number,number];r:number;seed:number}
function buildPuffs(seed:number,base:number,count:number):Puff[]{const out:Puff[]=[];
 for(let c=0;c<count;c++){const cx=hash(seed+c*1.31)*TILE,cz=hash(seed+c*2.77)*TILE,big=hash(seed+c*3.1);const b=base+hash(seed+c*.7)*120,H=80+big*260,W=90+big*220,n=8+Math.floor(big*12);
  for(let i=0;i<n;i++){const h=seed*1000+c*37+i,a=hash(h)*Math.PI*2,rr=Math.sqrt(hash(h+.3)),up=Math.pow(hash(h+.6),1.2);const r=(34+hash(h+.9)*60)*(1-.45*up)*(.7+big*.6);
   out.push({p:[cx+Math.cos(a)*rr*W*(1-.5*up),b+up*H,cz+Math.sin(a)*rr*W*.7*(1-.5*up)],r,seed:hash(h+.11)});}}
 return out;}
export function Cumulus({time,sky,base=650,seed=1,count=40}:{time:number;sky:Sky;base?:number;seed?:number;count?:number}){const {camera}=useThree();
 const puffs=useMemo(()=>buildPuffs(seed,base,count),[seed,base,count]);const N=puffs.length;
 const geo=useMemo(()=>{const g=new InstancedBufferGeometry();const q=new PlaneGeometry(2,2);g.index=q.index;g.setAttribute('position',q.getAttribute('position'));g.setAttribute('aO',new InstancedBufferAttribute(new Float32Array(N*3),3));g.setAttribute('aR',new InstancedBufferAttribute(new Float32Array(N),1));g.setAttribute('aS',new InstancedBufferAttribute(new Float32Array(N),1));g.instanceCount=N;return g;},[N]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 const mat=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,fog:false,uniforms:{uTime:{value:0},uSD:{value:new Vector3()},uLit:{value:new Color()},uShade:{value:new Color()},uHaze:{value:new Color()},uSun:{value:new Color()}},
  vertexShader:`attribute vec3 aO;attribute float aR,aS;varying vec2 vUv;varying float vS,vD;varying vec3 vW,vRt,vUp,vBk;
void main(){vec3 rt=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]),up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]),bk=vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]);
vec3 w=aO+(rt*position.x+up*position.y)*aR;vUv=position.xy;vS=aS;vW=w;vRt=rt;vUp=up;vBk=bk;vD=length(cameraPosition-aO);gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
  fragmentShader:`uniform float uTime;uniform vec3 uSD,uLit,uShade,uHaze,uSun;varying vec2 vUv;varying float vS,vD;varying vec3 vW,vRt,vUp,vBk;${NOISE}
void main(){float r=length(vUv);if(r>1.)discard;float e=fbm(vUv*1.7+vS*31.+vec2(uTime*.01,0.));float e2=vnoise(vUv*5.+vS*17.);float edge=r+(e-.5)*.75+(e2-.5)*.18;float a=smoothstep(1.,.45,edge);if(a<.01)discard;
vec3 n=normalize(vRt*vUv.x+vUp*vUv.y+vBk*sqrt(max(0.,1.-r*r))+vec3(0.,.25,0.));vec3 L=normalize(uSD);float d=dot(n,L);float lit=smoothstep(-.55,.85,d)*(.75+.25*e);
float bottom=smoothstep(-.9,.35,n.y);vec3 col=mix(uShade,uLit,clamp(lit*bottom+.12,0.,1.));vec3 v=normalize(cameraPosition-vW);float back=pow(max(0.,dot(-v,L)),5.);col+=uSun*back*smoothstep(.5,1.,edge)*1.6;
float f=1.-exp(-vD*.00022);col=mix(col,uHaze,f*.75);gl_FragColor=vec4(col,a*(1.-f*.4));${TAIL}}`}),[]);
 const u=mat.uniforms;u.uTime.value=time;u.uSD.value.set(...norm(sky.sunDir));(u.uLit.value as Color).set(sky.cloudLit);(u.uShade.value as Color).set(sky.cloudShade);(u.uHaze.value as Color).set(sky.horizon);(u.uSun.value as Color).set(sky.sun);
 const c=camera.position,O=geo.getAttribute('aO') as InstancedBufferAttribute,R=geo.getAttribute('aR') as InstancedBufferAttribute,Sd=geo.getAttribute('aS') as InstancedBufferAttribute;
 const placed=puffs.map(pf=>{const x=c.x+((((pf.p[0]-c.x+TILE/2)%TILE)+TILE)%TILE)-TILE/2,z=c.z+((((pf.p[2]-c.z+TILE/2)%TILE)+TILE)%TILE)-TILE/2;return {x,y:pf.p[1],z,r:pf.r,s:pf.seed,d:(x-c.x)**2+(pf.p[1]-c.y)**2+(z-c.z)**2};}).sort((a,b)=>b.d-a.d);
 const OA=O.array as Float32Array,RA=R.array as Float32Array,SA=Sd.array as Float32Array;placed.forEach((q,i)=>{OA[i*3]=q.x;OA[i*3+1]=q.y;OA[i*3+2]=q.z;RA[i]=q.r;SA[i]=q.s;});O.needsUpdate=R.needsUpdate=Sd.needsUpdate=true;
 return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-10}/>;}

/** Ring of distant ranges (flat-topped mesas and rolling hills) dissolving into haze. */
export function Ranges({sky}:{sky:Sky}){const {camera}=useThree();
 const geo=useMemo(()=>{const n=360,g=new BufferGeometry(),p=new Float32Array((n+1)*2*3),idx:number[]=[];for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,R=2600;
  const h=40+90*Math.max(0,Math.sin(a*3.1+1)*Math.sin(a*7.3)+.3)+60*Math.pow(Math.max(0,Math.sin(a*1.7+2.2)),6)*2+25*hash(Math.floor(i/3));p.set([Math.cos(a)*R,-30,Math.sin(a)*R,Math.cos(a)*R,h,Math.sin(a)*R],i*6);if(i<n)idx.push(i*2,i*2+2,i*2+1,i*2+1,i*2+2,i*2+3);}
  g.setAttribute('position',new BufferAttribute(p,3));g.setIndex(idx);return g;},[]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 const mat=useMemo(()=>new ShaderMaterial({fog:false,depthWrite:false,uniforms:{uA:{value:new Color()},uB:{value:new Color()}},vertexShader:`varying float vY;void main(){vY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.99998;}`,
  fragmentShader:`uniform vec3 uA,uB;varying float vY;void main(){vec3 c=mix(uB,uA,smoothstep(-30.,200.,vY));gl_FragColor=vec4(c,1.);${TAIL}}`}),[]);
 const a=new Color(sky.horizon).lerp(new Color(sky.zenith),.25).lerp(new Color('#8a6a6a'),.25),b=new Color(sky.haze).lerp(new Color(sky.ground),.35);(mat.uniforms.uA.value as Color).copy(a);(mat.uniforms.uB.value as Color).copy(b);
 return <mesh geometry={geo} material={mat} position={[camera.position.x,0,camera.position.z]} frustumCulled={false} renderOrder={-15}/>;}

/** Soft additive glare billboard at the sun (in front of the sky, behind everything else). */
export function SunGlare({sky,strength=1}:{sky:Sky;strength?:number}){const {camera}=useThree();
 const mat=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,fog:false,uniforms:{uC:{value:new Color()},uK:{value:1}},vertexShader:`varying vec2 vU;void main(){vU=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform vec3 uC;uniform float uK;varying vec2 vU;void main(){float r=length(vU);float g=exp(-r*r*7.)*.9+exp(-r*3.)*.25;float rays=pow(abs(sin(atan(vU.y,vU.x)*9.)),18.)*exp(-r*4.)*.25;gl_FragColor=vec4(uC*(g+rays)*uK,1.);${TAIL}}`}),[]);
 const d=norm(sky.sunDir),p:[number,number,number]=[camera.position.x+d[0]*3000,camera.position.y+d[1]*3000,camera.position.z+d[2]*3000];(mat.uniforms.uC.value as Color).set(sky.sun);mat.uniforms.uK.value=strength;
 return <mesh position={p} quaternion={camera.quaternion} material={mat} frustumCulled={false} renderOrder={-12}><planeGeometry args={[1400,1400]}/></mesh>;}
