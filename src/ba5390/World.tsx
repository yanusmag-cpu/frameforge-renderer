import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {cancelRender,continueRender,delayRender,staticFile} from 'remotion';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {DirectionalLight,DoubleSide,Mesh,MeshStandardMaterial,Object3D,Vector3,type Group,type Material} from 'three';
import {BLOWOUT,DECK,DOOR,NOSEDOWN,STOP,TOUCHDOWN,WINDOW,add,craft,hash,mix,norm,runway,scale,shotAt,smooth,sub,windscreenGone,type V3} from './story';
import {CloudDeck,Cumulus,GROUND_DAY,Landscape,MORNING,NOISE,SUNRISE,SkyDome,type AtmosLook} from './Atmos';
import {Particles,Rain,type Emitter,type Glow} from './Fx';
export const U={uTime:{value:0},uGrime:{value:.35}};
function patch(m:Material){if(!(m instanceof MeshStandardMaterial)||m.userData.patched)return;m.userData.patched=true;m.side=DoubleSide;
 if(m.name==='Cockpit glass'){m.transparent=true;m.opacity=.3;m.depthWrite=false;m.metalness=.6;m.roughness=.05;m.color.set('#3a4c5c');m.envMapIntensity=1;return;}
 if(m.transparent||m.opacity<1)return;
 m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,U);
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>','#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 vWP;uniform float uTime,uGrime;${NOISE}`)
   .replace('#include <color_fragment>','#include <color_fragment>\nfloat gN=fbm3(vWP*3.1);diffuseColor.rgb*=mix(1.-uGrime*.28,1.+uGrime*.05,gN);');};
 m.customProgramCacheKey=()=>'claude-ba5390-weathered';m.needsUpdate=true;}
const cache=new Map<string,Promise<Group>>();
function load(file:string){if(!cache.has(file))cache.set(file,new GLTFLoader().loadAsync(staticFile('ba5390/'+file)).then(g=>{g.scene.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;(Array.isArray(o.material)?o.material:[o.material]).forEach(patch);}});return g.scene;}));return cache.get(file)!;}
export function useModel(file:string){const [g,set]=useState<Group|null>(null),[handle]=useState(()=>delayRender('Claude BA5390 asset '+file,{timeoutInMilliseconds:120000}));
 useEffect(()=>{let alive=true;load(file).then(s=>{if(alive)set(s);continueRender(handle);}).catch(e=>cancelRender(e));return()=>{alive=false;};},[file,handle]);
 return useMemo(()=>g?.clone(true)??null,[g]);}
export function Model({file,...props}:{file:string;position?:V3;rotation?:V3;scale?:number}){const g=useModel(file);return g?<primitive object={g} {...props}/>:null;}
function node(g:Group|null,name:string):Object3D|null{if(!g)return null;const o=g.getObjectByName(name)??g.getObjectByName(name.replace(/ /g,'_'))??null;if(o&&!o.userData.rest){o.userData.rest={p:o.position.clone(),r:o.rotation.clone()};
 if(o instanceof Mesh&&name.includes('indscreen')){o.geometry.computeBoundingBox();const c=new Vector3();o.geometry.boundingBox!.getCenter(c);o.geometry.translate(-c.x,-c.y,-c.z);o.position.add(c);o.userData.rest.p=o.position.clone();}}return o;}
function forMaterials(g:Group|null,name:string,fn:(m:MeshStandardMaterial)=>void){g?.traverse(o=>{if(o instanceof Mesh)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{if(m instanceof MeshStandardMaterial&&m.name===name)fn(m);});});}
export interface Ctx{time:number;pixelScale:number;eye:V3}

// ---------------------------------------------------------------- the aircraft (exterior + flight deck + optional cabin) in its own frame
export function Aircraft({time,interior,cabin,children}:{time:number;interior:boolean;cabin?:boolean;children?:ReactNode}){
 const plane=useModel('plane.glb'),deck=useModel('cockpit.glb'),cab=useModel('cabin.glb');const c=craft(time),gone=windscreenGone(time),set=shotAt(time).set;
 // left windscreen: intact, flying away (B11) or gone
 for(const [g,nm] of [[plane,'KEEP Windscreen L'],[deck,'KEEP Inner windscreen L']] as const){const n=node(g,nm);if(!n)continue;const rest=n.userData.rest;const a=time-BLOWOUT;
  if(!gone){n.visible=true;n.position.copy(rest.p);n.rotation.copy(rest.r);const creak=time>18.8&&time<BLOWOUT?.004*Math.sin(time*60)*smooth(18.8,20,time):0;n.position.y+=creak;}
  else if(nm.startsWith('KEEP W')&&a>=0&&a<1.4&&set==='air'){n.visible=true;n.position.set(rest.p.x-a*a*14,rest.p.y+a*7-a*a*2,rest.p.z-a*3.5);n.rotation.set(rest.r.x+a*7,rest.r.y+a*3,rest.r.z+a*5);}else n.visible=false;}
 const yokeA=time<8||time>=DOOR?.18*smooth(DOOR-.4,DOOR,time<8?DOOR:time)+.05*Math.sin(time*7):time>=BLOWOUT?.05*Math.sin(time*7):.02*Math.sin(time*.9);
 for(const nm of ['KEEP Yoke L','KEEP Yoke R']){const n=node(deck,nm);if(n){n.rotation.copy(n.userData.rest.r);n.rotation.z=n.userData.rest.r.z-yokeA;}}
 const doorA=time<8||time>=DOOR?-1.65*smooth(DOOR,DOOR+.35,time<8?DOOR+1:time):time>=17.3?1.45*smooth(17.3,17.6,time):0;
 {const n=node(deck,'KEEP FD door');if(n){n.rotation.copy(n.userData.rest.r);n.rotation.y=n.userData.rest.r.y+doorA;}}
 const gearK=set==='airport'?(time<43.4?0:smooth(43.4,44.6,time)):0;
 for(const nm of ['KEEP Main gear L','KEEP Main gear R','KEEP Nose gear']){const n=node(plane,nm);if(n){n.visible=gearK>0;n.rotation.copy(n.userData.rest.r);n.rotation.x=n.userData.rest.r.x+(1-gearK)*(nm.includes('Nose')?0:(nm.endsWith('L')?-1.4:1.4));if(nm.includes('Nose'))n.rotation.z=n.userData.rest.r.z+(1-gearK)*1.4;}}
 const warn=time>=BLOWOUT&&time<TOUCHDOWN+3||time<8?(Math.sin(time*12)>0?1:.15):0;forMaterials(deck,'Annunciator red',m=>{m.emissiveIntensity=5+warn*14;});
 forMaterials(plane,'Landing light',m=>{m.emissiveIntensity=set==='airport'&&time<STOP?30:4;});
 return <group position={c.pos} rotation={[c.roll,c.yaw,c.pitch,'YZX']}>{plane&&<primitive object={plane}/>}{interior&&deck&&<primitive object={deck}/>}{cabin&&cab&&<primitive object={cab}/>}
  {interior&&<><pointLight position={[.4,.9,0]} color="#ffe2b8" intensity={1.2} distance={3} decay={2}/><pointLight position={[1.0,.2,0]} color="#ffb070" intensity={.6} distance={1.6} decay={2}/>{warn>0&&<pointLight position={[1.0,.35,-.5]} color="#ff2a1a" intensity={2.5*warn} distance={2} decay={2}/>}</>}
  {cabin&&[-3,-6,-9,-12].map(x=><pointLight key={x} position={[x,1.2,0]} color="#fff0d8" intensity={2.4} distance={5} decay={1.8}/>)}
  {children}</group>;}

// ---------------------------------------------------------------- paper storm, cups and decompression fog (aircraft frame)
const PAPER_START:V3[]=Array.from({length:16},(_,i)=>[-.2+hash(i)*1.2,-.2+hash(i+.3)*.5,-.9+hash(i+.6)*1.8]);
export function Debris({time}:{time:number}){const items=PAPER_START.map((st,i)=>{let a:number,cycle=0;
 if(time<8){const P=1.3;cycle=Math.floor((time+hash(i)*P)/P);a=((time+hash(i)*P)%P)/P*1.6;}else a=time-BLOWOUT-hash(i)*.5;
 if(a<0)return {p:st,r:[-Math.PI/2,0,hash(i)*3] as V3,vis:true,i};const s0=time<8?add(st,[hash(i+cycle)*.3,0,hash(i+cycle*2)*.4]):st;const tau=.45+hash(i+1)*.35;
 if(a<tau){const u=a/tau;const p=add(mix(s0,WINDOW,u*u),[0,.25*Math.sin(u*Math.PI)*hash(i+2),.2*Math.sin(u*9+i)]);return {p,r:[a*14+i,a*9,a*11] as V3,vis:true,i};}
 const b=a-tau;return {p:add(WINDOW,[-b*28,b*4+.3*Math.sin(b*12+i),-b*3-hash(i+4)]),r:[b*20,b*13,i] as V3,vis:b<1.2,i};});
 const cups=time>=BLOWOUT&&time<BLOWOUT+1.4?[0,1].map(k=>{const a=time-BLOWOUT-.15*k;return a<0?null:{p:mix([-.15+.1*k,.12,-.1+.15*k],WINDOW,Math.min(1,a*a*3)) as V3,r:[a*12,a*7,0] as V3,k};}).filter((x):x is {p:V3;r:V3;k:number}=>!!x):[];
 return <group>{items.filter(q=>q.vis).map(q=><mesh key={q.i} position={q.p} rotation={q.r} castShadow><planeGeometry args={[.21,.297]}/><meshStandardMaterial color={q.i%4===0?'#f2e3b5':'#f7f7f2'} side={DoubleSide} roughness={.8} emissive="#ffffff" emissiveIntensity={.05}/></mesh>)}
  {cups.map(q=><mesh key={'c'+q.k} position={q.p} rotation={q.r}><cylinderGeometry args={[.04,.032,.09,14]}/><meshStandardMaterial color="#ffffff"/></mesh>)}</group>;}
export function cockpitEmitters(time:number):Emitter[]{const e:Emitter[]=[];const toWin=(o:V3)=>norm(sub(WINDOW,o));
 if(time>=BLOWOUT-.05&&time<BLOWOUT+2.5)e.push({seed:1,count:260,start:BLOWOUT,end:BLOWOUT+.35,life:1.3,origin:t=>[-.6+hash(t*91)*1.8,-.4+hash(t*37)*1.2,-.8+hash(t*53)*1.6],dir:[1,.3,-.4],spread:.5,speed:3,grav:[0,0,0],drag:.6,size:.55,grow:2.5,color:'#eef3f6',alpha:.45,kind:0});
 const windy=time<8||time>=BLOWOUT&&time<52;if(windy)e.push({seed:2,count:240,start:time-.6,end:time,life:.6,origin:t=>{const o:V3=[-.8+hash(t*71)*1.8,-.5+hash(t*13)*1.3,-.8+hash(t*29)*1.6];return o;},dir:toWin([.2,.2,0]),spread:.35,speed:7,grav:[0,0,0],size:.02,color:'#ffffff',alpha:.55,kind:0});
 if(windy)e.push({seed:3,count:60,start:time-1.2,end:time,life:1.2,origin:()=>add(WINDOW,[.05,.05,-.05]),dir:[-1,.25,-.25],spread:.25,speed:18,grav:[0,0,0],size:.08,grow:3,color:'#f4f8fb',alpha:.35,kind:0});
 return e;}

export function exteriorEmitters(time:number):Emitter[]{const e:Emitter[]=[];
 if(time>=BLOWOUT-.02&&time<BLOWOUT+2)e.push({seed:21,count:220,start:BLOWOUT,end:BLOWOUT+.3,life:1.4,origin:()=>add(WINDOW,[0,.05,-.1]),dir:[.1,.8,-.6],spread:.7,speed:9,grav:[-14,0,0],drag:.4,size:.35,grow:3,color:'#f2f6f9',alpha:.6,kind:0});
 e.push({seed:22,count:90,start:time-.8,end:time,life:.8,origin:()=>add(WINDOW,[-.1,.15,-.1]),dir:[-1,.15,-.2],spread:.3,speed:22,grav:[0,0,0],size:.12,grow:2,color:'#ffffff',alpha:.35,kind:0});return e;}
// ---------------------------------------------------------------- AIR (cruise / blow-out / descent)
function Sun({look,target,size,shadow}:{look:AtmosLook;target:V3;size:number;shadow:boolean}){const light=useMemo(()=>{const l=new DirectionalLight('#fff',1);l.shadow.mapSize.set(2048,2048);l.shadow.bias=-.0004;l.shadow.normalBias=.02;return l;},[]);
 const d=norm(look.sunDir);light.color.set(look.sun);light.intensity=3.2;light.position.set(...add(target,scale(d,60)));light.target.position.set(...target);light.target.updateMatrixWorld();light.castShadow=shadow;
 const cam=light.shadow.camera;cam.left=-size;cam.right=size;cam.top=size;cam.bottom=-size;cam.near=1;cam.far=200;cam.updateProjectionMatrix();return <><primitive object={light}/><primitive object={light.target}/></>;}
export function AirSet({time,pixelScale,eye,children,interior}:Ctx&{children?:ReactNode;interior:boolean}){const id=shotAt(time).id;const look=id==='B05'?SUNRISE:MORNING;const c=craft(time);
 const inCloud=eye[1]<DECK.top+15&&eye[1]>DECK.base-10;const fogC=inCloud?'#d6dde4':look.haze,fogD=inCloud?.012:look.hazeD;const near:V3=c.pos;
 const exterior=!interior;const e=interior&&(time<8||time>=BLOWOUT)?cockpitEmitters(time):[];
 return <><fogExp2 attach="fog" args={[fogC,fogD]}/><color attach="background" args={[look.horizon]}/>
  <hemisphereLight args={['#bcd6f2','#e9eef3',interior?.7:1.1]}/><Sun look={look} target={interior?add(c.pos,[0,0,0]):near} size={interior?3:22} shadow/>
  <SkyDome time={time} look={look}/>
  <CloudDeck time={time} look={look} y={DECK.top-60}/>
  <Cumulus time={time} look={look} deckTop={id==='B05'?DECK.top-30:DECK.top} seed={id==='B05'?7:1} count={id==='B05'?55:75}/>
  {(id==='B19'||id==='B20')&&<Cumulus time={time} look={look} deckTop={DECK.base+40} seed={3} count={45} density={.9}/>}
  {eye[1]<DECK.top&&<Landscape time={time} look={look} y={DECK.ground}/>}
  <Aircraft time={time} interior={interior||Math.hypot(eye[0]-c.pos[0],eye[1]-c.pos[1],eye[2]-c.pos[2])<16}>{children}{(interior||id==='B11'||id==='B13'||id==='B01')&&<Debris time={time}/>}
   {e.length>0&&<Particles time={time} emitters={e} fog={fogC} fogD={0} torch={null} pixelScale={pixelScale}/>}{exterior&&(id==='B11'||id==='B13'||id==='B01'||id==='B19')&&<Particles time={time} emitters={exteriorEmitters(time)} fog={fogC} fogD={0} torch={null} pixelScale={pixelScale}/>}</Aircraft>
  {exterior&&(time<8||time>=BLOWOUT)&&<Rain time={time} count={500} wind={[-1,0,0]} fall={0} alpha={.22} color="#ffffff" box={[70,30,50]} length={4}/>}
  {exterior&&time>=10&&time<BLOWOUT&&<Rain time={time} count={260} wind={[-1,0,0]} fall={0} alpha={.12} color="#ffffff" box={[90,40,60]} length={3}/>}</>;}

// ---------------------------------------------------------------- CABIN
export function CabinSet({time,children}:Ctx&{children?:ReactNode}){return <><color attach="background" args={['#cfe0ee']}/><fogExp2 attach="fog" args={['#e8e4dc',.012]}/>
 <hemisphereLight args={['#fff6ea','#8a8070',.9]}/><Aircraft time={time} interior={false} cabin>{children}</Aircraft></>;}

// ---------------------------------------------------------------- SOUTHAMPTON
function vehiclePath(kind:'t1'|'t2'|'amb',t:number){const P:{[k:string]:[V3,V3,number,number]}={t1:[[760,0,62],[458,0,-13.5],50,53.6],t2:[[700,0,40],[432,0,-9.5],50.4,54.2],amb:[[820,0,90],[442.5,0,-11.8],50.8,54.6]};const [a,b,s,e]=P[kind];
 const u=smooth(s,e,t),p=mix(a,b,u),d=sub(b,a);const yaw=Math.atan2(-d[2],d[0]);return {p,yaw};}
export function AirportSet({time,pixelScale,children}:Ctx&{children?:ReactNode}){const id=shotAt(time).id;const look=GROUND_DAY;const r=runway(time);
 const cock=id==='B21';const flash=(k:number)=>Math.sin(time*14+k*2)>0?1:0;
 const emit:Emitter[]=[];const glows:Glow[]=[];
 if(time>=TOUCHDOWN-.05)for(const side of [-1,1]){const gear=(t:number):V3=>{const rr=runway(t);return add(rr.pos,[-12.6,-3.6,side*2.25]);};
  emit.push({seed:10+side,count:160,start:TOUCHDOWN,end:TOUCHDOWN+.45,life:2.6,origin:gear,dir:[-.6,.5,side*.3],spread:.6,speed:5,grav:[0,.4,0],drag:1.2,size:1.1,grow:4,color:'#d9d9d6',alpha:.6,kind:0});}
 if(time>=NOSEDOWN)emit.push({seed:13,count:50,start:NOSEDOWN,end:NOSEDOWN+.25,life:1.8,origin:t=>add(runway(t).pos,[1.9,-3.4,0]),dir:[-.5,.5,0],spread:.6,speed:3,grav:[0,.3,0],drag:1.2,size:.7,grow:3,color:'#d9d9d6',alpha:.5,kind:0});
 const veh=(['t1','t2','amb'] as const).map(k=>({k,...vehiclePath(k,time)}));
 if(time>50)veh.forEach((v,i)=>{for(const sd of [-1,1])glows.push({pos:add(v.p,[v.k==='amb'?1.9:4.2,v.k==='amb'?2.15:3.4,sd*.8]),size:1.2,color:'#3a6bff',alpha:.9*flash(i+sd)});});
 return <><fogExp2 attach="fog" args={[look.haze,look.hazeD]}/><color attach="background" args={[look.horizon]}/>
  <hemisphereLight args={['#c7dcf2','#6f8a52',1.0]}/><Sun look={look} target={cock?add(r.pos,[1,0,0]):id==='B25'||id==='B26'?[449,1,-7]:add(r.pos,[-8,0,0])} size={cock?3:id==='B25'?8:id==='B26'?30:30} shadow/>
  <SkyDome time={time} look={look}/><Cumulus time={time} look={look} deckTop={1100} seed={5} count={40} density={.85}/>
  <Landscape time={time} look={look} y={-.06} airport/><Model file="airport.glb"/>
  <Aircraft time={time} interior={cock||id==='B25'||id==='B26'}>{children}{cock&&<Debris time={time}/>}{cock&&<Particles time={time} emitters={cockpitEmitters(time)} fog={look.haze} fogD={0} torch={null} pixelScale={pixelScale}/>}</Aircraft>
  {time>=50&&veh.map(v=><group key={v.k} position={v.p} rotation={[0,v.yaw,0]}><Model file={v.k==='amb'?'ambulance.glb':'firetender.glb'}/></group>)}
  {time>=52.5&&<><group position={[449.3,0,-6.8]}><mesh position={[0,.62,0]} castShadow receiveShadow><boxGeometry args={[2.0,.1,.62]}/><meshStandardMaterial color="#3d4f8f"/></mesh><mesh position={[.25,.71,0]} castShadow><boxGeometry args={[1.2,.07,.66]}/><meshStandardMaterial color="#9da3aa" roughness={.9}/></mesh>
    {[-.9,.9].map(x=>[-.28,.28].map(z=><mesh key={x+'_'+z} position={[x,.3,z]}><cylinderGeometry args={[.02,.02,.6,6]}/><meshStandardMaterial color="#c8c8c8" metalness={.8}/></mesh>))}</group>
   <group position={[454,0,-3.5]} rotation={[0,-.15,0]}><Model file="stairs.glb"/></group></>}
  {time>50&&veh.map((v,i)=><pointLight key={v.k} position={add(v.p,[3,4,0])} color="#3a6bff" intensity={40*flash(i)} distance={18} decay={1.6}/>)}
  <Particles time={time} emitters={emit} glows={glows} fog={look.haze} fogD={look.hazeD} torch={null} pixelScale={pixelScale}/></>;}
