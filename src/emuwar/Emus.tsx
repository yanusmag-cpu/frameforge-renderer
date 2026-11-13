import {useEffect,useMemo,useState} from 'react';
import {cancelRender,continueRender,delayRender,staticFile} from 'remotion';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Color,ConeGeometry,CylinderGeometry,DoubleSide,InstancedMesh,Matrix4,Mesh,MeshStandardMaterial,Quaternion,Vector3,type BufferGeometry,type Material,type Object3D} from 'three';
import {add,clamp,cross,dist,dot,ground,lerp,norm,scale,sub,type V3} from './story';
import {EMU,type EmuPose} from './motion';
import {solveIK} from './Rig';
import {NOISE} from './Atmos';

// ---------------------------------------------------------------- GLB loading: every 'KEEP …' node becomes a named part (meshes + pivot)
export interface Part{meshes:{geometry:BufferGeometry;material:Material}[];pivot:Vector3;node:Object3D}
const cache=new Map<string,Promise<Map<string,Part>>>();
export const U={uTime:{value:0},uRim:{value:new Color('#ffd9a8')},uWind:{value:1}};
function patchFeathers(m:MeshStandardMaterial){if(m.userData.patched)return;m.userData.patched=true;m.side=DoubleSide;const feather=m.name.startsWith('Emu feather')||m.name==='Emu hair';const fur=feather||m.name==='Emu down';
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime,uWind;varying vec3 vWP;varying vec3 vLP;')
   .replace('#include <begin_vertex>',`#include <begin_vertex>\nvLP=position;${feather?`#ifdef USE_INSTANCING
 float sd=fract(sin(dot(instanceMatrix[3].xz,vec2(12.9898,78.233)))*43758.5);
#else
 float sd=0.;
#endif
 float hang=clamp(-position.y*2.2,0.,1.);transformed.x+=sin(uTime*13.+sd*6.28+position.z*9.)*.012*hang*uWind;transformed.z+=cos(uTime*11.+sd*5.+position.x*7.)*.009*hang*uWind;transformed.y+=sin(uTime*17.+sd*3.)*.006*hang*uWind;`:''}`)
   .replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>\nuniform float uTime;uniform vec3 uRim;varying vec3 vWP;varying vec3 vLP;${NOISE}`)
   .replace('#include <color_fragment>',`#include <color_fragment>\n${fur?'float st=vnoise(vLP.xz*vec2(38.,90.)+vLP.y*14.);diffuseColor.rgb*=mix(.72,1.18,st)*mix(.85,1.08,smoothstep(-.4,.3,vLP.y));':'diffuseColor.rgb*=mix(.92,1.06,vnoise(vWP.xz*9.));'}`)
   .replace('#include <opaque_fragment>',`${fur?'outgoingLight+=uRim*pow(1.-clamp(dot(normal,normalize(vViewPosition)),0.,1.),2.6)*.42;':''}\n#include <opaque_fragment>`);};
 m.customProgramCacheKey=()=>'emuwar-'+(feather?'feather':fur?'fur':'plain');m.needsUpdate=true;}
function load(file:string){if(!cache.has(file))cache.set(file,new GLTFLoader().loadAsync(staticFile('emuwar/'+file)).then(g=>{const parts=new Map<string,Part>();
 g.scene.updateMatrixWorld(true);
 g.scene.traverse(o=>{if(!o.name.startsWith('KEEP'))return;const meshes:{geometry:BufferGeometry;material:Material}[]=[];
  const take=(m:Mesh)=>{const mats=Array.isArray(m.material)?m.material:[m.material];for(const mt of mats){if(mt instanceof MeshStandardMaterial){patchFeathers(mt);}meshes.push({geometry:m.geometry,material:mt});}m.castShadow=true;m.receiveShadow=true;};
  if(o instanceof Mesh)take(o);else o.children.forEach(c=>{if(c instanceof Mesh)take(c);});
  parts.set(o.name.replace(/^KEEP[ _]/,''),{meshes,pivot:o.position.clone(),node:o});});
 return parts;}));return cache.get(file)!;}
export function useParts(file:string){const [p,set]=useState<Map<string,Part>|null>(null),[handle]=useState(()=>delayRender('Emu War asset '+file,{timeoutInMilliseconds:180000}));
 useEffect(()=>{let alive=true;load(file).then(s=>{if(alive)set(s);continueRender(handle);}).catch(e=>cancelRender(e));return()=>{alive=false;};},[file,handle]);return p;}

// ---------------------------------------------------------------- instanced part batches
class Batch{meshes:InstancedMesh[];n=0;cap:number;colored:boolean;
 constructor(part:{geometry:BufferGeometry;material:Material}[],cap:number,colored:boolean,shadow=true){this.cap=cap;this.colored=colored;this.meshes=part.map(p=>{const im=new InstancedMesh(p.geometry,p.material,cap);im.count=0;im.frustumCulled=false;im.castShadow=shadow;im.receiveShadow=true;if(colored)im.setColorAt(0,new Color(1,1,1));return im;});}
 begin(){this.n=0;}
 push(m:Matrix4,c?:Color){if(this.n>=this.cap)return;for(const im of this.meshes){im.setMatrixAt(this.n,m);if(this.colored&&c)im.setColorAt(this.n,c);}this.n++;}
 end(){for(const im of this.meshes){im.count=this.n;im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true;}}}
const vX=new Vector3(),vY=new Vector3(),vZ=new Vector3(),vS=new Vector3(),q=new Quaternion();
/** matrix whose local x≈xh and y=y exactly (orthonormalised), scaled and placed */
function mY(out:Matrix4,pos:V3,y:V3,xh:V3,s:[number,number,number]){vY.set(...y).normalize();vX.set(...xh);vZ.crossVectors(vX,vY);if(vZ.lengthSq()<1e-8)vZ.set(0,0,1);vZ.normalize();vX.crossVectors(vY,vZ).normalize();out.makeBasis(vX,vY,vZ);out.scale(vS.set(...s));out.setPosition(pos[0],pos[1],pos[2]);return out;}
/** matrix whose local x=x exactly and y≈yh */
function mX(out:Matrix4,pos:V3,x:V3,yh:V3,s:[number,number,number]){vX.set(...x).normalize();vY.set(...yh);vZ.crossVectors(vX,vY);if(vZ.lengthSq()<1e-8)vZ.set(0,0,1);vZ.normalize();vY.crossVectors(vZ,vX).normalize();out.makeBasis(vX,vY,vZ);out.scale(vS.set(...s));out.setPosition(pos[0],pos[1],pos[2]);return out;}
const M0=new Matrix4(),M1=new Matrix4(),M2=new Matrix4(),HM=new Matrix4(),IH=new Matrix4(),tmpV=new Vector3();
const EYE=(side:number):V3=>[.042,.036,side*.049];const D0=(side:number):V3=>norm([.72,.1,side*.69]);
const tone=(t:number,c:Color)=>c.setRGB(lerp(.82,1.14,t)*(1+.05*Math.sin(t*20)),lerp(.82,1.1,t),lerp(.84,1.06,t));

export interface EmuAttach{id:string;head:Matrix4;hat:boolean;stalk:boolean}
export function EmuLayer({poses,eye,time,hiDist=9,nearDist=26}:{poses:EmuPose[];eye:V3;time:number;hiDist?:number;nearDist?:number}){const parts=useParts('emu.glb');
 const batches=useMemo(()=>{if(!parts)return null;const p=(n:string)=>parts.get(n)!.meshes;const simpleTarsus=new CylinderGeometry(.03,.024,.48,6).translate(0,-.24,0),simpleFoot=new ConeGeometry(.05,.17,5).rotateZ(-Math.PI/2).translate(.07,-.015,0);
  const legMat=p('EmuTarsus')[0].material,footMat=p('EmuFoot')[0].material;const N=420;
  return {bodyHi:new Batch(p('EmuBodyHi'),24,true),bodyLo:new Batch(p('EmuBodyLo'),N,true),neck:new Batch(p('EmuNeck'),N*6,true),head:new Batch(p('EmuHead'),N,true),jaw:new Batch(p('EmuJaw'),N,false),
   eye:new Batch(p('EmuEye'),120,false,false),iris:new Batch(p('EmuIris'),120,false,false),lid:new Batch(p('EmuLid'),120,true,false),brow:new Batch(p('EmuBrow'),120,false,false),
   thigh:new Batch(p('EmuThigh'),N*2,true),tarsus:new Batch(p('EmuTarsus'),120,false),foot:new Batch(p('EmuFoot'),120,false),tarsusLo:new Batch([{geometry:simpleTarsus,material:legMat}],N*2,false),footLo:new Batch([{geometry:simpleFoot,material:footMat}],N*2,false)};},[parts]);
 useEffect(()=>()=>{if(batches)Object.values(batches).forEach(b=>b.meshes.forEach(m=>m.dispose()));},[batches]);
 U.uTime.value=time;
 if(!batches)return null;const B=batches;Object.values(B).forEach(b=>b.begin());const col=new Color(),white=new Color(1,1,1),lidC=new Color();
 for(const e of poses){const d=dist(eye,e.body);const near=d<nearDist,hi=d<hiDist,s=e.s;tone(e.tone,col);
  const fh=norm([e.fwd[0],0,e.fwd[2]]);
  (hi?B.bodyHi:B.bodyLo).push(mX(M0,e.body,e.fwd,e.up,[s,s,s]),col);
  for(let i=0;i<6;i++){const a=e.neck[i],b=e.neck[i+1],L=Math.max(.01,dist(a,b)),r=s*lerp(1.3,.86,i/5);B.neck.push(mY(M0,a,sub(b,a),fh,[r,L/.1,r]),col);}
  mX(HM,e.head,e.headFwd,e.headUp,[s,s,s]);B.head.push(HM,col);
  M1.makeRotationZ(-(.06+e.beak*.62));M2.makeTranslation(.05,-.006,0).multiply(M1);B.jaw.push(M0.copy(HM).multiply(M2));
  if(near){IH.copy(HM).invert();lidC.setRGB(lerp(.9,1.05,e.tone),lerp(.95,1.05,e.tone),1);
   for(const side of [-1,1]){const el=EYE(side),d0=D0(side);M1.makeTranslation(...el);const E=M0.copy(HM).multiply(M1);B.eye.push(E);
    let dir=d0;if(e.gaze){tmpV.set(...e.gaze).applyMatrix4(IH);const g=norm(sub([tmpV.x,tmpV.y,tmpV.z],el));const k=dot(g,d0);dir=k>.15?g:norm(add(g,scale(d0,.6)));}
    q.setFromUnitVectors(new Vector3(1,0,0),new Vector3(...dir));M2.makeRotationFromQuaternion(q);B.iris.push(M1.copy(E).multiply(M2));
    const open=norm(add([0,.4,0],scale(d0,-.95))),pole=norm(add(scale(open,1-e.lid),scale(add(d0,[0,.25,0]),e.lid)));q.setFromUnitVectors(new Vector3(0,1,0),new Vector3(...pole));M2.makeRotationFromQuaternion(q).scale(vS.set(1.07,1.07,1.07));B.lid.push(M1.copy(E).multiply(M2),lidC);
    const X=norm(cross([0,1,0],d0)),a=e.brow*.5*side,Xr=add(scale(X,Math.cos(a)),scale([0,1,0],Math.sin(a))),Yr=add(scale(X,-Math.sin(a)),scale([0,1,0],Math.cos(a)));
    mX(M2,add(add(el,[0,.034+.01*e.brow,0]),scale(d0,.012)),Xr,Yr,[1,1,1]);B.brow.push(M1.copy(HM).multiply(M2));}}
  // legs: two-bone IK from the hips to planted feet; the ankle bends backwards like a real emu's
  const BP=(l:V3):V3=>add(e.body,add(add(scale(e.fwd,l[0]*s),scale(e.up,l[1]*s)),scale(e.right,l[2]*s)));
  for(const [k,side] of [[0,-1],[1,1]] as const){const hip=BP([EMU.hipX,EMU.hipY,side*.11]),foot=e.feet[k],ank=add(foot,[0,.03*s,0]);const ik=solveIK(hip,ank,EMU.thigh*s,EMU.tarsus*s,add(scale(fh,-1),[0,-.15,0]));
   B.thigh.push(mY(M0,hip,sub(hip,ik.joint),fh,[s,dist(hip,ik.joint)/.42,s]),col);
   (near?B.tarsus:B.tarsusLo).push(mY(M0,ik.joint,sub(ik.joint,ik.end),fh,[s,dist(ik.joint,ik.end)/.48,s]));
   const lift=clamp((foot[1]-ground(foot[0],foot[2]))/(.18*s));const pitch=-1.0*lift;const fx=add(scale(fh,Math.cos(pitch)),[0,Math.sin(pitch),0]);
   (near?B.foot:B.footLo).push(mX(M0,add(ik.end,[0,-.004*s,0]),fx,[0,1,0],[s,s,s]));}
  void white;}
 Object.values(B).forEach(b=>b.end());
 return <group>{Object.values(B).flatMap((b,i)=>b.meshes.map((m,j)=><primitive key={i+'-'+j} object={m}/>))}</group>;}
/** World matrix of an emu's head (for hats and wheat stalks). */
export function headMatrix(e:EmuPose,out=new Matrix4()){return mX(out,e.head,e.headFwd,e.headUp,[e.s,e.s,e.s]);}
export {mX,mY};
