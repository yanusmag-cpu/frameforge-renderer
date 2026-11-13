import type {CSSProperties,ReactNode} from 'react';
import {AbsoluteFill,useCurrentFrame,useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {ACESFilmicToneMapping} from 'three';
import {Actors} from './Rig';
import {WorldSet} from './World';
import {EmuLayer} from './Emus';
import {cameraPose,impact} from './camera';
import {actorsAt,pose} from './cast';
import {emuPoses} from './motion';
import {EV,SKY,VO,ease,shotAt,smooth,type V3} from './story';
function Cam({eye,target,up,fov,roll,exposure}:{eye:V3;target:V3;up:V3;fov:number;roll:number;exposure:number}){const {camera,gl}=useThree();camera.position.set(...eye);camera.up.set(...up);camera.lookAt(...target);if(roll)camera.rotateZ(roll);
 if('fov' in camera){camera.fov=fov;camera.near=.05;camera.far=14000;camera.updateProjectionMatrix();}camera.updateMatrixWorld();gl.toneMapping=ACESFilmicToneMapping;gl.toneMappingExposure=exposure;return null;}
const FONT='"DejaVu Sans","Liberation Sans",Arial,sans-serif';
const stroke=(px:number)=>`${px}px ${px}px 0 #000,-${px}px ${px}px 0 #000,${px}px -${px}px 0 #000,-${px}px -${px}px 0 #000,0 ${px}px 0 #000,0 -${px}px 0 #000,${px}px 0 0 #000,-${px}px 0 0 #000,0 ${px*2}px ${px*4}px rgba(0,0,0,.65)`;
function Card({t,a,b,top,size,children,sub,color='#fff',accent='#d9472b',tilt=0}:{t:number;a:number;b:number;top:number;size:number;children:ReactNode;sub?:string;color?:string;accent?:string;tilt?:number}){if(t<a||t>b)return null;
 const k=smooth(a,a+.16,t),out=1-smooth(b-.18,b,t),u=t-a,s=1+.35*Math.exp(-u*9)*Math.cos(u*22);
 const style:CSSProperties={position:'absolute',top:`${top}%`,left:0,width:'100%',textAlign:'center',fontFamily:FONT,fontWeight:900,letterSpacing:size*.02,fontSize:size,color,textShadow:stroke(Math.max(3,size*.055)),transform:`scale(${s}) rotate(${tilt}deg)`,opacity:k*out,lineHeight:1.02,textTransform:'uppercase',padding:'0 50px',boxSizing:'border-box'};
 return <div style={style}>{children}{sub&&<div style={{fontSize:size*.36,letterSpacing:size*.03,marginTop:size*.16,color:'#ffd27a',textShadow:stroke(3)}}>{sub}</div>}<div style={{width:220*k,height:9,background:accent,margin:`${size*.16}px auto 0`,boxShadow:'0 3px 10px rgba(0,0,0,.6)'}}/></div>;}
function Stamp({t}:{t:number}){if(t<EV.stamp)return null;const u=t-EV.stamp,s=1+1.4*Math.exp(-u*14),o=Math.min(1,u*14)*(1-smooth(EV.fade,40,t));
 return <div style={{position:'absolute',top:'63%',left:'50%',transform:`translate(-50%,-50%) rotate(-8deg) scale(${s})`,opacity:o,border:'10px solid #d23a26',borderRadius:24,padding:'14px 34px',fontFamily:FONT,fontWeight:900,fontSize:104,color:'#fff',background:'rgba(160,30,20,.55)',textShadow:stroke(5),whiteSpace:'nowrap',boxShadow:'0 10px 40px rgba(0,0,0,.5)'}}>
  EMUS 1 <span style={{color:'#ffd27a'}}>·</span> ARMY 0</div>;}
function Overlay({t}:{t:number}){const imp=impact(t),shot=shotAt(t);
 const grain=`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' seed='${Math.floor(t*30)%60}'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.5'/></svg>")`;
 const rw=t>=4.6&&t<5.05?Math.sin(Math.PI*(t-4.6)/.45):0;const flash=Math.min(.3,imp*.18)+(t>=EV.land&&t<EV.land+.12?.35:0);
 const tint=shot.look==='sunset'?'rgba(255,120,60,.07)':shot.look==='gold'?'rgba(255,190,110,.06)':'rgba(255,200,140,.035)';
 return <AbsoluteFill style={{pointerEvents:'none'}}>
  <AbsoluteFill style={{background:tint,mixBlendMode:'soft-light'}}/><AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 45%,transparent 52%,rgba(20,8,0,.55) 100%)'}}/>
  <AbsoluteFill style={{backgroundImage:grain,opacity:.07,mixBlendMode:'overlay'}}/>
  {flash>0&&<AbsoluteFill style={{background:'#fff7ea',opacity:flash}}/>}
  {rw>0&&<AbsoluteFill style={{background:`repeating-linear-gradient(0deg,rgba(255,255,255,${.12*rw}) 0 3px,transparent 3px 9px)`,mixBlendMode:'screen'}}>
   <div style={{position:'absolute',top:'44%',width:'100%',textAlign:'center',fontFamily:FONT,fontWeight:900,fontSize:150,color:'#fff',opacity:rw,textShadow:stroke(6),letterSpacing:12}}>◀◀</div></AbsoluteFill>}
  <Card t={t} a={.15} b={3.25} top={7} size={76} sub="A TRUE STORY">THE ARMY VS. THE EMUS</Card>
  <Card t={t} a={VO.lost-.02} b={4.66} top={22} size={150} color="#ff4b2b" accent="#ffd27a" tilt={-5}>…AND LOST!</Card>
  <Card t={t} a={4.95} b={6.55} top={9} size={150} sub="CAMPION · WESTERN AUSTRALIA">1932</Card>
  <Card t={t} a={8.2} b={9.68} top={8} size={110} sub="DESTROYING THE WHEAT CROP">20,000 EMUS</Card>
  <Card t={t} a={13.05} b={15.05} top={7} size={84} sub="2 LEWIS GUNS · 10,000 ROUNDS">3 SOLDIERS</Card>
  <Card t={t} a={EV.jam} b={25.35} top={12} size={136} color="#ff4b2b" accent="#ffd27a" tilt={4}>JAMMED!</Card>
  <Card t={t} a={29.4} b={31.55} top={9} size={86} sub="TWO DEPLOYMENTS · NOV–DEC 1932">9,860 ROUNDS</Card>
  <Card t={t} a={31.85} b={34.15} top={9} size={96} sub="CONFIRMED KILLS · OUT OF ~20,000">986 EMUS</Card>
  <Stamp t={t}/>
  <AbsoluteFill style={{background:'#000',opacity:smooth(EV.fade,39.97,t)}}/></AbsoluteFill>;}
export function EmuWarFilm(){const frame=useCurrentFrame(),{width,height}=useVideoConfig();const t=frame/30;const shot=shotAt(t),sky=SKY[shot.look];const c=cameraPose(t);
 const emus=emuPoses(t,c.eye);const people=actorsAt(t).map(id=>pose(id,t));const rw=t>=4.6&&t<5.05?Math.sin(Math.PI*(t-4.6)/.45):0;const flash=shot.id==='E04'?1-ease(4.7,5.3,t):0;
 const tint=shot.look==='sunset'?(shot.id==='E20'?'#7d6460':'#f0d2bd'):shot.look==='gold'?'#fff0dc':'#fffaf2';
 const filter=[c.blur>0?`blur(${(c.blur*9*width/1080).toFixed(2)}px)`:'',rw>0?`sepia(${.8*rw}) contrast(${1+.3*rw}) saturate(${1-.4*rw})`:'',flash>0?`sepia(${.5*flash})`:''].filter(Boolean).join(' ')||'none';
 return <AbsoluteFill style={{background:'#000'}}>
  <AbsoluteFill style={{filter}}><ThreeCanvas width={width} height={height} shadows gl={{antialias:true,powerPreference:'high-performance'}} camera={{fov:c.fov,near:.05,far:14000}}>
   <Cam eye={c.eye} target={c.target} up={c.up??[0,1,0]} fov={c.fov} roll={c.roll} exposure={sky.exposure}/>
   <WorldSet time={t} eye={c.eye} sky={sky} poses={emus}/>
   <EmuLayer poses={emus} eye={c.eye} time={t} rim={sky.sun}/>
   <Actors poses={people} eye={c.eye} time={t} tint={tint}/>
  </ThreeCanvas></AbsoluteFill>
  <Overlay t={t}/></AbsoluteFill>;}
