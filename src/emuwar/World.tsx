import {useEffect,useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {BufferAttribute,BufferGeometry,Color,DirectionalLight,DoubleSide,InstancedBufferAttribute,InstancedBufferGeometry,InstancedMesh,Matrix4,MeshStandardMaterial,PlaneGeometry,Quaternion,ShaderMaterial,Vector3,type Material} from 'three';
import {DAM,DAM_R,EV,FARM,OUTCROP,PADDOCK,REST,add,clamp,dist,ground,hash,inField,norm,roadZ,scale,shotAt,smooth,type SetId,type Sky,type V3} from './story';
import {emuMover,emuPose,feet,footfalls,gunAt,truckAt,truckToWorld,type EmuPose,type GunState,type Mover,type TruckState} from './motion';
import {hatFlight} from './cast';
import {NOISE,TAIL,Cumulus,Ranges,SkyDome,SunGlare} from './Atmos';
import {headMatrix,useParts,type Part} from './Emus';
import {Dust,Flash,type Puff} from './Fx';

// ---------------------------------------------------------------- terrain: CPU-displaced height field (exactly the ground() the feet use)
const CENTRE:Record<SetId,[number,number]>={paddock:[110,-12],farm:[-120,-40],road:[-10,50],dam:[330,-40],chase:[520,0],rest:[742,20],hill:[790,-14]};
const TERRAIN_MAT=new MeshStandardMaterial({roughness:.96,metalness:0,color:'#ffffff'});
TERRAIN_MAT.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vWP;${NOISE}
float roadZ(float x){return 58.+7.*sin(x*.009)+3.*sin(x*.023+1.);}
vec3 soil(vec2 p){float n=fbm(p*.08),n2=vnoise(p*1.7),peb=step(.82,vnoise(p*6.3));vec3 red=mix(vec3(.55,.23,.11),vec3(.72,.34,.17),n);red*=.88+.2*n2;red=mix(red,vec3(.35,.17,.09),peb*.5);
 float grass=smoothstep(.45,.62,fbm(p*.045+7.))*(.6+.4*vnoise(p*.9));vec3 dry=mix(vec3(.62,.52,.3),vec3(.48,.45,.25),vnoise(p*.3));red=mix(red,dry,grass*.8);
 float rz=abs(p.y-roadZ(p.x));float road=smoothstep(4.2,2.4,rz);float rut=smoothstep(.35,.1,abs(rz-.85));red=mix(red,vec3(.74,.42,.24)*(.92+.12*n2),road);red=mix(red,vec3(.5,.26,.14),road*rut*.6);
 float fld=step(-260.,p.x)*step(p.x,-48.)*step(-96.,p.y)*step(p.y,38.);vec3 wheat=mix(vec3(.82,.64,.3),vec3(.95,.78,.4),fbm(p*.06))*(.9+.15*sin(p.x*1.4+fbm(p*.1)*4.));red=mix(red,wheat,fld);
 float dd=length(p-vec2(${DAM[0].toFixed(1)},${DAM[2].toFixed(1)}));red=mix(red,vec3(.32,.2,.13),smoothstep(${(DAM_R+3).toFixed(1)},${(DAM_R-.5).toFixed(1)},dd));return red;}`)
  .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=pow(soil(vWP.xz),vec3(1.9));');};
TERRAIN_MAT.customProgramCacheKey=()=>'emuwar-terrain';
function Terrain({set}:{set:SetId}){const [cx,cz]=CENTRE[set];
 const geo=useMemo(()=>{const S=640,N=400,g=new PlaneGeometry(S,S,N,N).rotateX(-Math.PI/2);const p=g.getAttribute('position') as BufferAttribute;for(let i=0;i<p.count;i++){const x=p.getX(i)+cx,z=p.getZ(i)+cz;p.setXYZ(i,x,ground(x,z),z);}g.computeVertexNormals();return g;},[cx,cz]);
 const far=useMemo(()=>new PlaneGeometry(12000,12000,4,4).rotateX(-Math.PI/2),[]);
 useEffect(()=>()=>geo.dispose(),[geo]);useEffect(()=>()=>far.dispose(),[far]);
 return <><mesh geometry={geo} material={TERRAIN_MAT} receiveShadow/><mesh geometry={far} material={TERRAIN_MAT} position={[cx,-.6,cz]} receiveShadow/></>;}

// ---------------------------------------------------------------- wheat: dense instanced stalk cards that sway in travelling gusts
function Wheat({time,eye,sky}:{time:number;eye:V3;sky:Sky}){const MAXW=26000;
 const geo=useMemo(()=>{const g=new InstancedBufferGeometry();const a=new PlaneGeometry(.5,1.1,1,4).translate(0,.55,0),b=a.clone().rotateY(Math.PI/2);
  const pos=[...Array.from(a.getAttribute('position').array),...Array.from(b.getAttribute('position').array)],uv=[...Array.from(a.getAttribute('uv').array),...Array.from(b.getAttribute('uv').array)];
  const ia=Array.from(a.index!.array),ib=Array.from(b.index!.array).map(i=>i+a.getAttribute('position').count);
  g.setAttribute('position',new BufferAttribute(new Float32Array(pos),3));g.setAttribute('uv',new BufferAttribute(new Float32Array(uv),2));g.setIndex([...ia,...ib]);
  g.setAttribute('aP',new InstancedBufferAttribute(new Float32Array(MAXW*4),4));g.instanceCount=0;return g;},[]);
 useEffect(()=>()=>geo.dispose(),[geo]);
 const mat=useMemo(()=>new ShaderMaterial({side:DoubleSide,transparent:false,uniforms:{uTime:{value:0},uSD:{value:new Vector3()},uSun:{value:new Color()},uAmb:{value:new Color()},uHaze:{value:new Color()},uHD:{value:0}},
  vertexShader:`attribute vec4 aP;uniform float uTime;varying vec2 vUv;varying float vS,vD;varying vec3 vW;${NOISE}
void main(){vUv=uv;vS=aP.w;float c=cos(aP.w*6.28),s=sin(aP.w*6.28);vec3 p=position;p.xz=mat2(c,-s,s,c)*p.xz;p.y*=.85+.3*fract(aP.w*7.3);
vec2 wp=aP.xz;float gust=fbm(wp*.05-vec2(uTime*.55,uTime*.18));float bend=(.12+.55*gust)*uv.y*uv.y+.04*sin(uTime*3.+aP.w*20.)*uv.y;p.x+=bend*.9;p.z+=bend*.35;p.y-=bend*bend*.25;
vec3 w=vec3(aP.x,aP.y,aP.z)+p;vW=w;vD=length(cameraPosition-w);gl_Position=projectionMatrix*viewMatrix*vec4(w,1.);}`,
  fragmentShader:`uniform vec3 uSD,uSun,uAmb,uHaze;uniform float uHD;varying vec2 vUv;varying float vS,vD;varying vec3 vW;${NOISE}
void main(){float x=vUv.x*5.;float stalk=fract(x+vS*3.);float cx=abs(stalk-.5);float i=floor(x+vS*3.);float h=.6+.4*fract(sin(i*12.9+vS*7.)*43.7);float y=vUv.y;
float stem=step(cx,.05)*step(y,h*.82);float head=smoothstep(.2,.14,length(vec2(cx*2.2,(y-h*.9)/(.16))));float awn=step(abs(cx-.5*(y-h*.95)*1.2),.025)*step(h*.92,y)*step(y,h*1.05);float a=max(stem,max(head,awn));if(a<.5)discard;
vec3 gold=mix(vec3(.78,.58,.26),vec3(.96,.8,.45),y*.8+.2*fbm(vW.xz*.4));gold=mix(gold,vec3(.55,.48,.25),stem*(1.-head)*.4);gold=pow(gold,vec3(2.2));vec3 L=normalize(uSD);vec3 v=normalize(cameraPosition-vW);float trans=pow(max(0.,dot(-v,L)),3.)*y;
vec3 col=gold*(uAmb*.5+uSun*(.45+.55*y))+uSun*gold*trans*.9;col*=.55+.45*smoothstep(0.,.7,y);float f=1.-exp(-vD*uHD);col=mix(col,uHaze,f);gl_FragColor=vec4(col,1.);${TAIL}}`}),[]);
 const u=mat.uniforms;u.uTime.value=time;u.uSD.value.set(...norm(sky.sunDir));(u.uSun.value as Color).set(sky.sun);(u.uAmb.value as Color).set(sky.ambient);(u.uHaze.value as Color).set(sky.haze);u.uHD.value=sky.hazeD;
 const A=geo.getAttribute('aP') as InstancedBufferAttribute,arr=A.array as Float32Array;let n=0;const R=34,STEP=.42,cx=Math.round(eye[0]/STEP)*STEP,cz=Math.round(eye[2]/STEP)*STEP;
 for(let gx=-R;gx<=R;gx+=STEP)for(let gz=-R;gz<=R;gz+=STEP){if(n>=MAXW)break;if(gx*gx+gz*gz>R*R)continue;const ix=Math.round((cx+gx)/STEP),iz=Math.round((cz+gz)/STEP);const h=hash(ix*91.3+iz*17.7);
  const x=ix*STEP+(h-.5)*STEP*.9,z=iz*STEP+(hash(h*31.1)-.5)*STEP*.9;if(!inField(x,z))continue;arr[n*4]=x;arr[n*4+1]=ground(x,z)-.03;arr[n*4+2]=z;arr[n*4+3]=h;n++;}
 A.needsUpdate=true;geo.instanceCount=n;return n>0?<mesh geometry={geo} material={mat} frustumCulled={false}/>:null;}

// ---------------------------------------------------------------- instanced Blender props
function Instances({part,mats}:{part:Part|undefined;mats:Matrix4[]}){const meshes=useMemo(()=>part?part.meshes.map(p=>{const im=new InstancedMesh(p.geometry,p.material as Material,Math.max(1,mats.length));im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;return im;}):[],[part,mats.length]);
 useEffect(()=>()=>meshes.forEach(m=>m.dispose()),[meshes]);meshes.forEach(im=>{mats.forEach((m,i)=>im.setMatrixAt(i,m));im.count=mats.length;im.instanceMatrix.needsUpdate=true;});
 return <>{meshes.map((m,i)=><primitive key={i} object={m}/>)}</>;}
const QY=new Vector3(0,1,0);
const mat4=(x:number,z:number,yaw=0,s=1,dy=0)=>new Matrix4().compose(new Vector3(x,ground(x,z)+dy,z),new Quaternion().setFromAxisAngle(QY,yaw),new Vector3(s,s,s));
function Clone({part,pos,rot=[0,0,0],s=1}:{part:Part|undefined;pos:V3;rot?:[number,number,number]|[number,number,number,string];s?:number|V3}){const o=useMemo(()=>part?part.node.clone(true):null,[part]);if(!o)return null;
 o.position.set(...pos);o.rotation.set(rot[0],rot[1],rot[2],(rot[3]??'XYZ') as 'XYZ');if(typeof s==='number')o.scale.setScalar(s);else o.scale.set(...s);return <primitive object={o}/>;}

/** fixed scenery placements */
const GUMS:[number,number,string,number,number][]=[[-162,-140,'GumA',.3,1],[-139,-118,'GumB',2.1,.9],[-196,-104,'GumC',1,1.1],[-40,-120,'GumB',4,1],[-30,70,'GumA',5,1.05],[30,30,'GumC',2,.95],[60,-60,'GumA',1.2,1],[175,-48,'GumB',.4,1.1],[160,35,'GumC',3.3,1],[85,-38,'GumB',2.7,.9],
 [300,-75,'GumA',2.5,1],[362,-12,'GumC',.8,1.05],[300,5,'GumB',1.9,.95],[470,-40,'GumA',.2,1],[560,40,'GumC',1.4,1],[650,-45,'GumB',3,1],[742,26,'GumA',.9,1.15],[700,60,'GumC',2.2,1],[770,-70,'GumB',5.2,1],[860,10,'GumA',1.7,.9],[-100,60,'GumC',.5,1],[-240,-60,'GumA',2,1],[105,8,'GumB',5,1]];
const CLEAR:[number,number,number][]=[[REST[0]+1,REST[2]+3,11],[PADDOCK[0]-30,PADDOCK[2]+2,9],[PADDOCK[0]+3,PADDOCK[2]+2,7],[DAM[0]+1.8,DAM[2]+21,7],[-69.5,12.8,5]];
function scatter(eye:V3,set:SetId){const out:{t:Record<string,Matrix4[]>}={t:{TussockA:[],TussockB:[],Rock0:[],Rock1:[],Rock2:[],GrassTree:[],FencePost:[]}};const C=6,R=110,cx=Math.round(eye[0]/C),cz=Math.round(eye[2]/C);
 for(let i=-R/C;i<=R/C;i++)for(let j=-R/C;j<=R/C;j++){const gx=(cx+i)*C,gz=(cz+j)*C;const h=hash(gx*.731+gz*1.913);const x=gx+(hash(h*7.1)-.5)*C,z=gz+(hash(h*3.7)-.5)*C;
  if(CLEAR.some(([cx,cz,r])=>(x-cx)**2+(z-cz)**2<r*r)||inField(x,z)||Math.abs(z-roadZ(x))<5||dist([x,0,z],[DAM[0],0,DAM[2]])<DAM_R+3||dist([x,0,z],[OUTCROP[0],0,OUTCROP[2]])<6)continue;
  const d2=(x-eye[0])**2+(z-eye[2])**2;if(d2>R*R)continue;const yaw=h*40,s=.7+.7*hash(h*5.3);
  if(h<.38)out.t[h<.2?'TussockA':'TussockB'].push(mat4(x,z,yaw,s));else if(h<.45)out.t['Rock'+Math.floor(hash(h*9)*3)].push(mat4(x,z,yaw,.22+.35*hash(h*2.2),-.04));else if(h<.475&&set!=='farm')out.t.GrassTree.push(mat4(x,z,yaw,.8+.5*hash(h*4)));}
 for(let x=-260;x<=-48;x+=3.2)if(Math.abs(x-eye[0])<260)out.t.FencePost.push(mat4(x,-97,x,1));for(let z=-96;z<=38;z+=3.2)if(Math.abs(z-eye[2])<260&&Math.abs(z-10)>2)out.t.FencePost.push(mat4(-47,z,z,1));
 return out.t;}
function FenceWires(){const geo=useMemo(()=>{const pts:number[]=[];const run=(a:[number,number],b:[number,number],n:number)=>{for(let i=0;i<n;i++){const p=a[0]+(b[0]-a[0])*i/n,q=a[1]+(b[1]-a[1])*i/n,p2=a[0]+(b[0]-a[0])*(i+1)/n,q2=a[1]+(b[1]-a[1])*(i+1)/n;
  for(const h of [.45,.8,1.12])pts.push(p,ground(p,q)+h,q,p2,ground(p2,q2)+h-.02,q2);}};run([-260,-97],[-48,-97],70);run([-47,-96],[-47,8],34);run([-47,12],[-47,38],9);const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(pts),3));return g;},[]);
 useEffect(()=>()=>geo.dispose(),[geo]);return <lineSegments geometry={geo}><lineBasicMaterial color="#4a4038" transparent opacity={.7}/></lineSegments>;}

// ---------------------------------------------------------------- dam water
function Water({time,sky}:{time:number;sky:Sky}){const y=useMemo(()=>{let a=0;for(let i=0;i<12;i++){const t=i/12*Math.PI*2;a+=ground(DAM[0]+Math.cos(t)*(DAM_R+1),DAM[2]+Math.sin(t)*(DAM_R+1));}return a/12-.22;},[]);
 const mat=useMemo(()=>new ShaderMaterial({transparent:true,uniforms:{uTime:{value:0},uSky:{value:new Color()},uSun:{value:new Color()},uSD:{value:new Vector3()},uDeep:{value:new Color('#3d4a3a')}},
  vertexShader:`varying vec3 vW;void main(){vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`,
  fragmentShader:`uniform float uTime;uniform vec3 uSky,uSun,uSD,uDeep;varying vec3 vW;${NOISE}
void main(){vec2 p=vW.xz;float e=.3;float h=fbm(p*.6+uTime*.15),hx=fbm((p+vec2(e,0.))*.6+uTime*.15),hz=fbm((p+vec2(0.,e))*.6+uTime*.15);vec3 n=normalize(vec3((h-hx)*.6,1.,(h-hz)*.6));vec3 v=normalize(cameraPosition-vW);
float fr=pow(1.-max(0.,dot(n,v)),3.);vec3 r=reflect(-v,n);float sp=pow(max(0.,dot(r,normalize(uSD))),180.);vec3 col=mix(uDeep,uSky*.9,.25+.7*fr)+uSun*sp*3.;float d=length(p-vec2(${DAM[0].toFixed(1)},${DAM[2].toFixed(1)}));
gl_FragColor=vec4(col,smoothstep(${(DAM_R+.6).toFixed(1)},${(DAM_R-1).toFixed(1)},d)*.95);${TAIL}}`}),[]);
 mat.uniforms.uTime.value=time;(mat.uniforms.uSky.value as Color).set(sky.horizon);(mat.uniforms.uSun.value as Color).set(sky.sun);mat.uniforms.uSD.value.set(...norm(sky.sunDir));
 return <mesh position={[DAM[0],y,DAM[2]]} rotation={[-Math.PI/2,0,0]} material={mat}><circleGeometry args={[DAM_R+1,64]}/></mesh>;}

// ---------------------------------------------------------------- truck + gun rigs driven by the motion functions
function Truck({tr,parts}:{tr:TruckState;parts:Map<string,Part>}){if(!tr.visible)return null;const body=truckToWorld(tr,[0,.42,0]);
 const wheels:[string,number,number][]=[['WheelFL',1.45,-.82],['WheelFR',1.45,.82],['WheelRL',-1.85,-.82],['WheelRR',-1.85,.82]];
 return <group><group position={body} rotation={[tr.roll,tr.yaw,tr.pitch,'YZX']}><Clone part={parts.get('TruckBody')} pos={[0,0,0]}/>{tr.canopy&&<Clone part={parts.get('TruckCanopy')} pos={[0,0,0]}/>}<Clone part={parts.get('TruckSteering')} pos={[.25,1.13,-.42]} rot={[tr.steer*3,0,0]}/></group>
  {wheels.map(([n,x,z])=>{const w=truckToWorld(tr,[x,.42,z]);const gy=ground(w[0],w[2])+.42+tr.air;return <Clone key={n} part={parts.get(n)} pos={[w[0],Math.max(gy,w[1]-.12),w[2]]} rot={[0,tr.yaw,-tr.spin,'YZX']}/>;})}</group>;}
function Gun({g,parts,t}:{g:GunState;parts:Map<string,Part>;t:number}){if(!g.visible)return null;const pan=parts.get('Pan');
 const muzzle=(()=>{const c=Math.cos(g.yaw),s=Math.sin(g.yaw),cp=Math.cos(g.pitch),sp=Math.sin(g.pitch);const x=.92*cp,y=.07+.92*sp;return [g.pos[0]+x*c,g.pos[1]+y,g.pos[2]-x*s] as V3;})();
 return <group><group position={g.pos} rotation={[g.roll,g.yaw,g.pitch,'YZX']}><Clone part={parts.get('Lewis')} pos={[0,0,0]}/>{g.panOnGun&&pan&&<Clone part={pan} pos={[pan.pivot.x,pan.pivot.y,pan.pivot.z]} rot={[0,g.pan,0]}/>}
  <Clone part={parts.get('Bolt')} pos={[-.06-g.bolt,.06,.04]}/>{g.tripod&&<Clone part={parts.get('Tripod')} pos={[0,0,0]} s={[1+(1-g.tripodScale)*.6,g.tripodScale,1+(1-g.tripodScale)*.6]}/>}</group>
  {g.spring&&<Clone part={parts.get('Spring')} pos={g.spring.pos} rot={[g.spring.rot,g.spring.rot*.7,0]} s={1.4}/>}
  {g.casings.map((c,i)=><Clone key={i} part={parts.get('Casing')} pos={c.pos} rot={c.rot}/>)}<Flash pos={muzzle} k={g.flash} seed={Math.floor(t*30)}/></group>;}

// ---------------------------------------------------------------- dust sources
export function dustPuffs(t:number,eye:V3,tr:TruckState,emuIds:{id:string;mover:Mover;s:number}[]):Puff[]{const out:Puff[]=[];const set=shotAt(t).set;
 const col=set==='farm'?'#c79a5e':'#c0683c';
 for(const e of emuIds){const p=e.mover.at(t);if((p[0]-eye[0])**2+(p[1]-eye[2])**2>85*85)continue;
  for(const f of footfalls(e.mover,t-1.6,t)){const ft=feet(e.mover,f.t),v=ft.speed;if(v<2.5)continue;const foot=f.side<0?ft.l:ft.r;const k=Math.min(1,v/11)*e.s;
   for(let j=0;j<2;j++){const h=hash(f.t*13.7+j+e.s);out.push({tb:f.t+j*.03,o:add(foot,[0,.12,0]),v:add(scale(ft.fwd,-v*.35*(.6+.4*h)),[(h-.5)*1.4,.6+1.2*h,(hash(h*9)-.5)*1.4]),life:1.3+.6*h,r0:.18*k,r1:(.9+.8*h)*k*1.15,a:.32*k,c:j?col:'#b9724a',k:1.4});}}}
 if(tr.visible&&tr.speed>1){for(let i=0;i<34;i++){const tb=Math.floor(t*17)/17-i/17;for(const [x,z] of [[-1.85,-.82],[-1.85,.82],[1.45,-.82]] as [number,number][]){const h=hash(tb*7.3+x+z);const st=truckAt(tb);if(!st.visible)continue;const w=truckToWorld(st,[x-.3,.1,z]);
   out.push({tb,o:w,v:[(h-.5)*2-Math.cos(st.yaw)*st.speed*.3,.8+h,(hash(h*3)-.5)*2+Math.sin(st.yaw)*st.speed*.3],life:2.4,r0:.4,r1:2.4+1.2*h,a:.3,c:'#c4744a',k:1.1,rise:.35});}}}
 const burst=(at:number,o:V3,n:number,size:number,a=.45)=>{if(t<at||t>at+3)return;for(let i=0;i<n;i++){const h=hash(at*3.3+i*1.7);const ang=h*Math.PI*2;out.push({tb:at+.02*i/n,o,v:[Math.cos(ang)*(2+3*hash(h*5)),.6+2*hash(h*7),Math.sin(ang)*(2+3*hash(h*5))],life:1.8+h,r0:.3*size,r1:(1.4+h)*size,a,c:col,k:2.2});}};
 const P=PADDOCK;burst(EV.faceplant,[P[0]+1.4,ground(P[0]+1.4,P[2]+.15)+.1,P[2]+.15],26,1);burst(EV.truckStop,truckToWorld(truckAt(EV.truckStop+.01),[-1,0,0]),18,1.3,.3);
 for(const h of EV.hop)burst(h+.33,[-8.6+((h*7)%3),ground(-8,roadZ(-8)-2)+.05,roadZ(-8)-2.2],8,.6,.35);burst(EV.tripodClank,add(gunAt(EV.tripodClank).pos,[0,-.6,0]),10,.5,.35);
 if(set==='chase'){burst(EV.land,truckToWorld(truckAt(EV.land),[0,0,0]),36,1.6,.4);}
 if(set==='rest'&&tr.visible){for(let i=0;i<40;i++){const tb=t-i*.06;const h=hash(i*3.1+Math.floor(t*16));out.push({tb,o:truckToWorld(tr,[2.0,1.5,0]),v:[.4*(h-.5),1.2+h*.6,.4*(hash(h*4)-.5)],life:2.4,r0:.15,r1:1.0,a:.18,c:'#f4f1ea',k:.6,rise:.2});}}
 return out;}

// ---------------------------------------------------------------- the world for the current shot
export function WorldSet({time,eye,sky,poses}:{time:number;eye:V3;sky:Sky;poses:EmuPose[]}){const {camera}=useThree();const shot=shotAt(time),set=shot.set;
 const farm=useParts('farm.glb'),nature=useParts('nature.glb'),truck=useParts('truck.glb'),gun=useParts('gun.glb'),kit=useParts('kit.glb');
 const sun=useMemo(()=>{const l=new DirectionalLight('#fff',1);l.shadow.mapSize.set(2048,2048);l.shadow.bias=-.0003;l.shadow.normalBias=.03;l.castShadow=true;return l;},[]);
 const look=new Vector3();camera.getWorldDirection(look);const focus:V3=add(eye,scale([look.x,look.y,look.z],Math.min(24,Math.max(6,eye[1]*1.4))));focus[1]=ground(focus[0],focus[2]);
 const d=norm(sky.sunDir);sun.color.set(sky.sun);sun.intensity=set==='hill'?2.6:3.1;sun.position.set(...add(focus,scale(d,90)));sun.target.position.set(...focus);sun.target.updateMatrixWorld();
 const big=['E04','E06','E11','E20'].includes(shot.id);const S=big?70:26;const sc=sun.shadow.camera;sc.left=-S;sc.right=S;sc.top=S;sc.bottom=-S;sc.near=1;sc.far=260;sc.updateProjectionMatrix();
 const tr=truckAt(time),g=gunAt(time);
 const placements=useMemo(()=>scatter([Math.round(eye[0]/24)*24,0,Math.round(eye[2]/24)*24],set),[Math.round(eye[0]/24),Math.round(eye[2]/24),set]);
 const gums=GUMS.filter(([x,z])=>dist([x,0,z],eye)<420);
 const mill=farm?.get('WindmillRotor');const hatemu=poses.find(p=>p.hat),victor=poses.find(p=>p.stalk);
 const hm=new Matrix4(),hat=new Matrix4(),stalk=new Matrix4();if(hatemu){headMatrix(hatemu,hm);hat.copy(hm).multiply(new Matrix4().compose(new Vector3(-.005,.075,0),new Quaternion().setFromAxisAngle(new Vector3(0,0,1),.25),new Vector3(.46,.46,.46)));}
 if(victor){headMatrix(victor,hm);stalk.copy(hm).multiply(new Matrix4().compose(new Vector3(.155,-.012,.005),new Quaternion().setFromUnitVectors(new Vector3(0,1,0),new Vector3(.55,-.3,.78).normalize()),new Vector3(.7,.36,.7)));}
 const flying=time<4.2&&set==='paddock'?hatFlight(time,emuPose(emuMover('hatemu','paddock'),Math.min(time,4.09),eye).head):null;
 const DAMG:V3=[DAM[0]+1.8,0,DAM[2]+21.2];
 return <>
  <fogExp2 attach="fog" args={[sky.haze,sky.hazeD*.55]}/><color attach="background" args={[sky.horizon]}/>
  <hemisphereLight args={[sky.ambient,sky.ground,set==='hill'?1.1:1.7]}/><ambientLight color={sky.sun} intensity={set==='hill'?.25:.35}/><primitive object={sun}/><primitive object={sun.target}/>
  <SkyDome time={time} sky={sky}/><SunGlare sky={sky} strength={set==='hill'?1.4:.6}/><Cumulus time={time} sky={sky} seed={set==='hill'?5:2} count={set==='hill'?22:34} base={set==='hill'?950:750}/><Ranges sky={sky}/>
  <Terrain set={set}/>{set==='farm'&&<Wheat time={time} eye={eye} sky={sky}/>}
  {nature&&<>{Object.entries(placements).map(([k,m])=><Instances key={k} part={(k==='FencePost'?farm:nature)?.get(k)} mats={m}/>)}
   {gums.map(([x,z,k,yaw,s],i)=><Clone key={i} part={nature.get(k)} pos={[x,ground(x,z)-.05,z]} rot={[0,yaw,0]} s={s}/>)}
   <Clone part={nature.get('DeadTree')} pos={[PADDOCK[0]+38,ground(PADDOCK[0]+38,PADDOCK[2]+22),PADDOCK[2]+22]} rot={[0,1.2,0]}/><Clone part={nature.get('DeadTree')} pos={[520,ground(520,-30),-30]} rot={[0,2.2,0]} s={1.2}/>
   {(set==='hill'||set==='rest')&&<Clone part={nature.get('Outcrop')} pos={[OUTCROP[0],ground(OUTCROP[0],OUTCROP[2]),OUTCROP[2]]} rot={[0,.4,0]}/>}
   {set==='dam'&&<Clone part={nature.get('DamWall')} pos={[DAM[0],ground(DAM[0]-17,DAM[2])-.15,DAM[2]]} rot={[0,Math.PI,0]}/>}
   {victor&&<primitive object={(()=>{const o=nature.get('Wheat')!.node.clone(true);o.matrixAutoUpdate=false;o.matrix.copy(stalk);return o;})()}/>}</>}
  {farm&&(set==='farm'||set==='road')&&<><Clone part={farm.get('House')} pos={[FARM.house[0],ground(FARM.house[0],FARM.house[2])-.1,FARM.house[2]]}/><Clone part={farm.get('Shed')} pos={[FARM.shed[0],ground(FARM.shed[0],FARM.shed[2])-.1,FARM.shed[2]]} rot={[0,.15,0]}/>
   <Clone part={farm.get('Tank')} pos={[FARM.tank[0],ground(FARM.tank[0],FARM.tank[2]),FARM.tank[2]]}/><Clone part={farm.get('WindmillTower')} pos={[FARM.mill[0],ground(FARM.mill[0],FARM.mill[2]),FARM.mill[2]]} rot={[0,-.6,0]}/>
   {mill&&<group position={[FARM.mill[0],ground(FARM.mill[0],FARM.mill[2]),FARM.mill[2]]} rotation={[0,-.6,0]}><Clone part={mill} pos={[mill.pivot.x,mill.pivot.y,mill.pivot.z]} rot={[time*2.4,0,0]}/></group>}
   <Clone part={farm.get('Trough')} pos={[FARM.mill[0]+3,ground(FARM.mill[0]+3,FARM.mill[2]+2),FARM.mill[2]+2]} rot={[0,.3,0]}/><Clone part={farm.get('Gate')} pos={[-47,ground(-47,10),10]} rot={[0,Math.PI/2,0]}/>
   {[[-176,-112,.2],[-174,-110.5,.3],[-178,-110,1.4]].map(([x,z,r],i)=><Clone key={i} part={farm.get('Bale')} pos={[x,ground(x,z),z]} rot={[0,r,0]}/>)}<FenceWires/></>}
  {set==='dam'&&<Water time={time} sky={sky}/>}
  {set==='dam'&&kit&&[-.9,-.1,.7,1.5,2.3].map((x,i)=><Clone key={i} part={kit.get('Sandbag')} pos={[DAMG[0]+x-.6,ground(DAMG[0]+x-.6,DAMG[2]-.75)+(i%2)*.02,DAMG[2]-.75]} rot={[0,.1*i,0]}/>)}
  {set==='rest'&&kit&&<><Clone part={kit.get('AmmoBoxOpen')} pos={[REST[0]+.6,ground(REST[0]+.6,REST[2]+2.9),REST[2]+2.9]} rot={[0,.5,0]}/><Clone part={kit.get('AmmoBox')} pos={[REST[0]+2.3,ground(REST[0]+2.3,REST[2]+2.5),REST[2]+2.5]} rot={[0,-.3,0]}/>
   <Clone part={kit.get('AmmoBoxOpen')} pos={[REST[0]-1.8,ground(REST[0]-1.8,REST[2]+2.4),REST[2]+2.4]} rot={[0,2.4,0]}/><Clone part={kit.get('Canteen')} pos={[REST[0]-.2,ground(REST[0]-.2,REST[2]+2.1),REST[2]+2.1]} rot={[0,0,1.4]}/>
   {gun&&shot.id==='E18'&&<RestPan gun={gun} t={time}/>}</>}
  {kit&&hatemu&&<primitive object={(()=>{const o=kit.get('Hat')!.node.clone(true);o.matrixAutoUpdate=false;o.matrix.copy(hat);return o;})()}/>}
  {kit&&flying&&<Clone part={kit.get('Hat')} pos={flying.pos} rot={[flying.spin*.4,flying.spin,flying.spin*.2]} s={.95}/>}
  {truck&&<Truck tr={tr} parts={truck}/>}{gun&&<Gun g={g} parts={gun} t={time}/>}
  <Dust time={time} puffs={dustPuffs(time,eye,tr,poses.map(p=>({id:p.id,mover:emuMover(p.id,set).mover,s:p.s})))} sky={sky} eye={eye}/></>;}
/** E18: the empty pan magazine in the gunner's hands and the single cartridge case that drops out. */
function RestPan({gun,t}:{gun:Map<string,Part>;t:number}){const o:V3=[REST[0]+1.2,0,REST[2]+2.2];const gy=ground(o[0],o[2]);const shake=t>29.75&&t<30.2?.06*Math.sin(t*40):0;
 const pan:V3=[o[0]-.13,gy+.55+.65+shake,o[2]+.4];const drop=t-EV.casing;const cy=drop<0?pan[1]-.03:Math.max(gy+.01,pan[1]-.03-4.9*drop*drop);const bounce=drop>.4?.06*Math.abs(Math.sin((drop-.4)*14))*Math.exp(-(drop-.4)*5):0;
 return <><Clone part={gun.get('Pan')} pos={pan} rot={[Math.PI*smooth(29.4,29.7,t),0,.2]}/>{t>EV.casing-.4&&<Clone part={gun.get('Casing')} pos={[pan[0]+.02,cy+bounce,pan[2]+.02]} rot={[0,1,drop>0?drop*12:0]} s={1.3}/>}</>;}
export {clamp};
