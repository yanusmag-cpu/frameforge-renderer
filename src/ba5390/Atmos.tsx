import {useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {BackSide,Color,DoubleSide,InstancedBufferAttribute,InstancedBufferGeometry,PlaneGeometry,ShaderMaterial,SphereGeometry,Vector3} from 'three';
import {hash,norm,type V3} from './story';
export const NOISE=`
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vnoise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
float fbm3o(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*vnoise(p);p=p*2.07+vec2(5.1,1.3);a*=.5;}return v;}
float h31(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*vnoise3(p);p=p*2.1+3.1;a*=.5;}return v;}
`;
export const TAIL=`
#include <tonemapping_fragment>
#include <colorspace_fragment>
`;
export interface AtmosLook{zenith:string;horizon:string;sun:string;sunDir:V3;haze:string;hazeD:number;cloudLit:string;cloudShade:string}
export const MORNING:AtmosLook={zenith:'#1f5fbf',horizon:'#bcd6ec',sun:'#fff1d6',sunDir:[.42,.36,-.83],haze:'#a9c7e2',hazeD:.0003,cloudLit:'#fffaf2',cloudShade:'#8d9db4'};
export const SUNRISE:AtmosLook={zenith:'#3a5f9c',horizon:'#ffc59a',sun:'#ffd29a',sunDir:[.75,.12,-.65],haze:'#e9b99a',hazeD:.0005,cloudLit:'#ffe2c2',cloudShade:'#8a7d93'};
export const GROUND_DAY:AtmosLook={zenith:'#3c78c8',horizon:'#d5e4ee',sun:'#fff3dc',sunDir:[.43,.5,.75],haze:'#c4d6e4',hazeD:.00033,cloudLit:'#ffffff',cloudShade:'#9aa8bd'};

export function SkyDome({time,look}:{time:number;look:AtmosLook}){const {camera}=useThree();
 const mat=useMemo(()=>new ShaderMaterial({side:BackSide,depthWrite:false,fog:false,uniforms:{uTime:{value:0},uZ:{value:new Color()},uH:{value:new Color()},uSun:{value:new Color()},uSD:{value:new Vector3()}},
  vertexShader:`varying vec3 vD;void main(){vD=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.99999;}`,
  fragmentShader:`uniform float uTime;uniform vec3 uZ,uH,uSun,uSD;varying vec3 vD;${NOISE}
void main(){vec3 d=normalize(vD);float y=d.y;vec3 col=mix(uH,uZ,pow(smoothstep(-.02,.75,y),.7));col=mix(col,uH*1.05,smoothstep(.12,-.15,y));
float s=max(0.,dot(d,normalize(uSD)));col+=uSun*(pow(s,8.)*.25+pow(s,90.)*.8)+vec3(1.)*smoothstep(.9994,.9998,s)*4.;
vec2 uv=d.xz/(abs(y)+.12);float ci=fbm(uv*vec2(1.2,6.)+vec2(uTime*.01,0.));float cirrus=smoothstep(.55,.85,ci)*smoothstep(.04,.35,y)*.55;col=mix(col,vec3(1.)*mix(.9,1.15,s),cirrus);
gl_FragColor=vec4(col,1.);${TAIL}}`}),[]);
 const u=mat.uniforms;u.uTime.value=time;(u.uZ.value as Color).set(look.zenith);(u.uH.value as Color).set(look.horizon);(u.uSun.value as Color).set(look.sun);u.uSD.value.set(...norm(look.sunDir));
 const geo=useMemo(()=>new SphereGeometry(4000,48,24),[]);return <mesh geometry={geo} material={mat} position={camera.position.toArray()} frustumCulled={false} renderOrder={-20}/>;}

// ---------------------------------------------------------------- cumulus built from lit, noise-eroded billboard puffs (sorted back-to-front)
const TILE=2600;
interface Puff{p:V3;r:number;seed:number}
function buildPuffs(seed:number,deckTop:number,count:number):Puff[]{const out:Puff[]=[];
 for(let c=0;c<count;c++){const cx=hash(seed+c*1.31)*TILE,cz=hash(seed+c*2.77)*TILE,big=hash(seed+c*3.1);const base=deckTop-20+hash(seed+c*.7)*30,H=60+big*190,W=70+big*160,n=8+Math.floor(big*12);
  for(let i=0;i<n;i++){const h=seed*1000+c*37+i,a=hash(h)*Math.PI*2,rr=Math.sqrt(hash(h+.3)),up=Math.pow(hash(h+.6),1.2);const r=(26+hash(h+.9)*46)*(1-.45*up)*(.7+big*.6);
   out.push({p:[cx+Math.cos(a)*rr*W*(1-.5*up),base+up*H,cz+Math.sin(a)*rr*W*.7*(1-.5*up)],r,seed:hash(h+.11)});}}
 return out;}
export function Cumulus({time,look,deckTop,seed=1,count=70,density=1}:{time:number;look:AtmosLook;deckTop:number;seed?:number;count?:number;density?:number}){const {camera}=useThree();
 const puffs=useMemo(()=>buildPuffs(seed,deckTop,count),[seed,deckTop,count]);const N=puffs.length;
 const geo=useMemo(()=>{const g=new InstancedBufferGeometry();const q=new PlaneGeometry(2,2);g.index=q.index;g.setAttribute('position',q.getAttribute('position'));g.setAttribute('aO',new InstancedBufferAttribute(new Float32Array(N*3),3));g.setAttribute('aR',new InstancedBufferAttribute(new Float32Array(N),1));g.setAttribute('aS',new InstancedBufferAttribute(new Float32Array(N),1));g.instanceCount=N;return g;},[N]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 const mat=useMemo(()=>new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,uniforms:{uTime:{value:0},uSD:{value:new Vector3()},uLit:{value:new Color()},uShade:{value:new Color()},uHaze:{value:new Color()},uHD:{value:0},uDen:{value:1},uSun:{value:new Color()}},
  vertexShader:`attribute vec3 aO;attribute float aR,aS;varying vec2 vUv;varying float vS,vR,vD;varying vec3 vW;varying vec3 vRt;varying vec3 vUp;varying vec3 vBk;
void main(){vec3 rt=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]),up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]),bk=vec3(viewMatrix[0][2],viewMatrix[1][2],viewMatrix[2][2]);
vec3 w=aO+(rt*position.x+up*position.y)*aR;vUv=position.xy;vS=aS;vR=aR;vW=w;vRt=rt;vUp=up;vBk=bk;vD=length(cameraPosition-aO);gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
  fragmentShader:`uniform float uTime,uHD,uDen;uniform vec3 uSD,uLit,uShade,uHaze,uSun;varying vec2 vUv;varying float vS,vR,vD;varying vec3 vW;varying vec3 vRt;varying vec3 vUp;varying vec3 vBk;${NOISE}
void main(){float r=length(vUv);if(r>1.)discard;float e=fbm(vUv*1.7+vS*31.+vec2(uTime*.015,0.));float e2=vnoise(vUv*5.+vS*17.);float edge=r+(e-.5)*.75+(e2-.5)*.18;float a=smoothstep(1.,.45,edge);if(a<.01)discard;
vec3 n=normalize(vRt*vUv.x+vUp*vUv.y+vBk*sqrt(max(0.,1.-r*r))+vec3(0.,.25,0.));vec3 L=normalize(uSD);float d=dot(n,L);float lit=smoothstep(-.55,.85,d)*(.75+.25*e);
float bottom=smoothstep(-.9,.35,dot(n,vec3(0.,1.,0.)));vec3 col=mix(uShade,uLit,clamp(lit*bottom+.12,0.,1.));
vec3 v=normalize(cameraPosition-vW);float back=pow(max(0.,dot(-v,L)),6.);col+=uSun*back*smoothstep(.55,1.,edge)*1.4;col+=uSun*pow(max(0.,d),3.)*.15;
float near=smoothstep(3.,vR*.9,vD);float f=1.-exp(-pow(vD*uHD,2.));col=mix(col,uHaze,f);gl_FragColor=vec4(col,a*near*uDen*(1.-f*.35));${TAIL}}`}),[]);
 const u=mat.uniforms;u.uTime.value=time;u.uSD.value.set(...norm(look.sunDir));(u.uLit.value as Color).set(look.cloudLit);(u.uShade.value as Color).set(look.cloudShade);(u.uHaze.value as Color).set(look.haze);(u.uSun.value as Color).set(look.sun);u.uHD.value=look.hazeD;u.uDen.value=density;
 const c=camera.position,O=geo.getAttribute('aO') as InstancedBufferAttribute,R=geo.getAttribute('aR') as InstancedBufferAttribute,Sd=geo.getAttribute('aS') as InstancedBufferAttribute;
 const placed=puffs.map(pf=>{const x=c.x+((((pf.p[0]-c.x+TILE/2)%TILE)+TILE)%TILE)-TILE/2,z=c.z+((((pf.p[2]-c.z+TILE/2)%TILE)+TILE)%TILE)-TILE/2;return {x,y:pf.p[1],z,r:pf.r,s:pf.seed,d:(x-c.x)**2+(pf.p[1]-c.y)**2+(z-c.z)**2};}).sort((a,b)=>b.d-a.d);
 const OA=O.array as Float32Array,RA=R.array as Float32Array,SA=Sd.array as Float32Array;placed.forEach((q,i)=>{OA[i*3]=q.x;OA[i*3+1]=q.y;OA[i*3+2]=q.z;RA[i]=q.r;SA[i]=q.s;});O.needsUpdate=R.needsUpdate=Sd.needsUpdate=true;
 return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={6}/>;}

// ---------------------------------------------------------------- the cloud deck below: lumpy, sun-shaded, hazy toward the horizon
export function CloudDeck({time,look,y}:{time:number;look:AtmosLook;y:number}){const {camera}=useThree();
 const geo=useMemo(()=>new PlaneGeometry(9000,9000,180,180).rotateX(-Math.PI/2),[]);
 const mat=useMemo(()=>new ShaderMaterial({side:DoubleSide,transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uSD:{value:new Vector3()},uLit:{value:new Color()},uShade:{value:new Color()},uHaze:{value:new Color()},uHD:{value:0},uSun:{value:new Color()}},
  vertexShader:`uniform float uTime;varying vec3 vW;varying float vH;${NOISE}
void main(){vec3 w=(modelMatrix*vec4(position,1.)).xyz;float h=fbm3o(w.xz*.0028+vec2(uTime*.002,0.));float h2=fbm3o(w.xz*.011);vH=h*.7+h2*.3;w.y+=(vH-.5)*70.;vW=w;gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
  fragmentShader:`uniform float uTime,uHD;uniform vec3 uSD,uLit,uShade,uHaze,uSun;varying vec3 vW;varying float vH;${NOISE}
void main(){vec2 p=vW.xz;float e=.9;float h0=fbm(p*.011),hx=fbm((p+vec2(e,0.))*.011),hz=fbm((p+vec2(0.,e))*.011);vec3 n=normalize(vec3((h0-hx)*90.,1.,(h0-hz)*90.));float big=fbm(p*.0028);vec3 nb=normalize(vec3(-(fbm((p+vec2(9.,0.))*.0028)-big)*120.,1.,-(fbm((p+vec2(0.,9.))*.0028)-big)*120.));n=normalize(n+nb);
bool below=cameraPosition.y<vW.y;float d=dot(n,normalize(uSD));float lit=smoothstep(-.2,.9,d);float cav=smoothstep(.25,.75,vH);vec3 col=below?mix(uShade*.75,uShade,vH):mix(uShade,uLit,lit*.75+cav*.35);
float puff=smoothstep(.45,.75,fbm(p*.04+uTime*.01));col=mix(col,uLit*1.03,puff*.25*(below?0.:1.));
float dist=length(cameraPosition-vW);float f=1.-exp(-pow(dist*uHD,2.));col=mix(col,uHaze,f);float a=below?.96:smoothstep(.0,.12,vH+.1);gl_FragColor=vec4(col,a);${TAIL}}`}),[]);
 const u=mat.uniforms;u.uTime.value=time;u.uSD.value.set(...norm(look.sunDir));(u.uLit.value as Color).set(look.cloudLit);(u.uShade.value as Color).set(look.cloudShade);(u.uHaze.value as Color).set(look.haze);(u.uSun.value as Color).set(look.sun);u.uHD.value=look.hazeD;
 const cell=50,x=Math.round(camera.position.x/cell)*cell,z=Math.round(camera.position.z/cell)*cell;
 return <mesh geometry={geo} material={mat} position={[x,y,z]} frustumCulled={false} renderOrder={5}/>;}

// ---------------------------------------------------------------- English patchwork landscape (fields, hedgerows, lanes, towns, Southampton Water)
export function Landscape({time,look,y,airport=false}:{time:number;look:AtmosLook;y:number;airport?:boolean}){const {camera}=useThree();
 const geo=useMemo(()=>new PlaneGeometry(60000,60000,8,8).rotateX(-Math.PI/2),[]);
 const mat=useMemo(()=>new ShaderMaterial({uniforms:{uTime:{value:0},uSD:{value:new Vector3()},uHaze:{value:new Color()},uHD:{value:0},uAir:{value:0}},
  vertexShader:`varying vec3 vW;void main(){vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`,
  fragmentShader:`uniform float uTime,uHD,uAir;uniform vec3 uSD,uHaze;varying vec3 vW;${NOISE}
vec3 voro(vec2 p){vec2 i=floor(p),f=fract(p);float d1=8.,d2=8.;vec2 id=vec2(0.);for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(x,y);vec2 o=vec2(h21(i+g),h21(i+g+17.3));vec2 r=g+o-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=i+g;}else if(d<d2)d2=d;}return vec3(sqrt(d2)-sqrt(d1),id);}
void main(){vec2 p=vW.xz;vec3 v=voro(p/95.);float c=h21(v.yz);vec3 col=c<.3?vec3(.24,.42,.12):c<.55?vec3(.33,.5,.16):c<.66?vec3(.72,.66,.16):c<.8?vec3(.45,.36,.2):c<.9?vec3(.2,.34,.12):vec3(.4,.52,.22);
col*=.82+.32*vnoise(p*.06+c*9.);col*=1.+.09*sin((p.x*cos(c*6.)+p.y*sin(c*6.))*.55)*step(.3,c);
float hedge=smoothstep(.0,.035,v.x);col=mix(vec3(.07,.16,.05),col,hedge);float tree=step(.82,h21(floor(p/7.)))*(1.-hedge);col=mix(col,vec3(.06,.15,.05),tree*.8);
float wood=smoothstep(.6,.66,fbm(p*.0013+3.));col=mix(col,vec3(.08,.2,.07)*(.75+.5*vnoise(p*.25)),wood);
float town=smoothstep(.7,.78,fbm(p*.0006+11.));vec3 roofs=mix(vec3(.55,.32,.26),vec3(.5,.5,.52),vnoise(floor(p/14.)));col=mix(col,roofs*(.8+.3*h21(floor(p/12.))),town*step(.3,fract(p.x/14.))*step(.3,fract(p.y/14.)));
float lane=abs(fbm(p*.0009)-.5);col=mix(col,vec3(.42,.42,.4),smoothstep(.006,.002,lane));
float water=smoothstep(.02,.0,abs(p.y+3800.+600.*sin(p.x*.0004))-500.-200.*fbm(p*.001));col=mix(col,vec3(.12,.25,.35)+vec3(.15)*pow(max(0.,dot(reflect(normalize(vW-cameraPosition),vec3(0.,1.,0.)),normalize(uSD))),20.),water);
if(uAir>.5){float d=max(abs(p.y)-140.,max(-p.x-700.,p.x-2400.));float g=1.-smoothstep(0.,120.,d);vec3 grass=vec3(.33,.52,.2)*(.9+.12*step(.5,fract(p.x/18.)));col=mix(col,grass,g);}
float sh=smoothstep(.5,.75,fbm(p*.0012+vec2(uTime*.02,0.)));col*=1.-sh*.35;col*=.75+.35*max(0.,normalize(uSD).y);
float dist=length(cameraPosition-vW);float f=1.-exp(-pow(dist*uHD,2.));col=mix(col,uHaze,f);gl_FragColor=vec4(col,1.);${TAIL}}`}),[]);
 const u=mat.uniforms;u.uTime.value=time;u.uSD.value.set(...norm(look.sunDir));(u.uHaze.value as Color).set(look.haze);u.uHD.value=look.hazeD;u.uAir.value=airport?1:0;
 return <mesh geometry={geo} material={mat} position={[airport?900:camera.position.x,y,airport?0:camera.position.z]} frustumCulled={false} receiveShadow renderOrder={-5}/>;}
