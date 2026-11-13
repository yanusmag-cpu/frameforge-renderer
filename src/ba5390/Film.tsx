import type {CSSProperties} from 'react';
import {AbsoluteFill,Audio,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {Actors} from './Rig';
import {AirSet,AirportSet,CabinSet,U} from './World';
import {BLOWOUT,TOUCHDOWN,actorsAt,cameraPose,craft,ease,impact,pose,shotAt,smooth,sub,toLocal,toWorld,type V3} from './story';
function Cam({eye,target,up,fov,roll}:{eye:V3;target:V3;up:V3;fov:number;roll:number}){const {camera}=useThree();camera.position.set(...eye);camera.up.set(...up);camera.lookAt(...target);if(roll)camera.rotateZ(roll);
 if('fov' in camera){camera.fov=fov;camera.near=.04;camera.far=12000;camera.updateProjectionMatrix();}camera.updateMatrixWorld();return null;}
const FONT='"DejaVu Sans","Liberation Sans",Arial,sans-serif';
const stroke=(px:number)=>`${px}px ${px}px 0 #000,-${px}px ${px}px 0 #000,${px}px -${px}px 0 #000,-${px}px -${px}px 0 #000,0 ${px*1.6}px ${px*3}px rgba(0,0,0,.7)`;
function Card({t,a,b,top,size,children,sub:subText,color='#fff',accent='#d4202b'}:{t:number;a:number;b:number;top:number;size:number;children:string;sub?:string;color?:string;accent?:string}){if(t<a||t>b)return null;
 const k=smooth(a,a+.2,t),out=1-smooth(b-.22,b,t),s=1.3-.3*ease(a,a+.18,t);
 const style:CSSProperties={position:'absolute',top:`${top}%`,left:0,width:'100%',textAlign:'center',fontFamily:FONT,fontWeight:900,letterSpacing:size*.02,fontSize:size,color,textShadow:stroke(Math.max(3,size*.06)),transform:`scale(${s})`,opacity:k*out,filter:`blur(${(1-k)*6}px)`,lineHeight:1.05,textTransform:'uppercase',padding:'0 40px',boxSizing:'border-box'};
 return <div style={style}>{children}{subText&&<div style={{fontSize:size*.42,letterSpacing:size*.04,marginTop:size*.18,color:'#ffd27a',textShadow:stroke(3)}}>{subText}</div>}<div style={{width:200*k,height:8,background:accent,margin:`${size*.18}px auto 0`,boxShadow:'0 3px 10px rgba(0,0,0,.6)'}}/></div>;}
function Radio({t,a,b}:{t:number;a:number;b:number}){if(t<a||t>b)return null;const k=smooth(a,a+.15,t)*(1-smooth(b-.2,b,t)),flick=.85+.15*Math.sin(t*40);
 return <div style={{position:'absolute',top:'60%',left:'8%',padding:'18px 30px',borderRadius:22,background:'rgba(10,14,20,.78)',border:'4px solid #ff3b30',fontFamily:FONT,fontWeight:900,fontSize:66,color:'#fff',opacity:k*flick,textShadow:stroke(3),transform:`rotate(-3deg) scale(${.9+.1*k})`}}>
  <div style={{fontSize:26,color:'#ffb3ad',letterSpacing:4}}>RADIO · SPEEDBIRD 5390</div>MAYDAY! MAYDAY!</div>;}
function Overlay({t}:{t:number}){const imp=impact(t),set=shotAt(t).set;
 const grain=`url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' seed='${Math.floor(t*30)%60}'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='.5'/></svg>")`;
 const flashW=(t>=8&&t<8.2?1-smooth(8,8.2,t):0)+(t>=BLOWOUT&&t<BLOWOUT+.25?1-smooth(BLOWOUT,BLOWOUT+.25,t):0)*.85+Math.min(.25,imp*.2);
 const fade=smooth(59.3,59.97,t);const tint=set==='cabin'?'rgba(255,200,140,.05)':t>=BLOWOUT&&t<43?'rgba(40,70,110,.08)':'rgba(255,190,120,.04)';
 return <AbsoluteFill style={{pointerEvents:'none'}}>
  <AbsoluteFill style={{background:tint}}/><AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 46%,transparent 55%,rgba(0,0,0,.5) 100%)'}}/>
  <AbsoluteFill style={{backgroundImage:grain,opacity:.06,mixBlendMode:'overlay'}}/>
  <Card t={t} a={.25} b={2.65} top={8} size={92} sub="AND SURVIVED">THE PILOT SUCKED OUT OF HIS PLANE</Card>
  <Card t={t} a={8.15} b={9.95} top={10} size={70} sub="BIRMINGHAM · 10 JUNE 1990 · 07:20">13 MINUTES EARLIER</Card>
  <Card t={t} a={10.3} b={12.85} top={8} size={66} sub="BAC ONE-ELEVEN · 81 PASSENGERS · 6 CREW">BRITISH AIRWAYS FLIGHT 5390</Card>
  <Card t={t} a={13.2} b={15.35} top={8} size={56} sub="FIRST OFFICER ALASTAIR ATCHISON (RIGHT)">CAPTAIN TIM LANCASTER</Card>
  <Card t={t} a={15.7} b={17.35} top={8} size={58} sub="BRINGING TEA TO THE FLIGHT DECK">STEWARD NIGEL OGDEN</Card>
  <Card t={t} a={18.95} b={19.95} top={9} size={72} sub="07:33 · CLIMBING">17,300 FEET</Card>
  <Card t={t} a={BLOWOUT+.05} b={21.25} top={12} size={150} color="#ffffff" accent="#ffffff">BANG!</Card>
  <Card t={t} a={26.55} b={27.75} top={8} size={60}>HE GRABS THE CAPTAIN'S BELT</Card>
  <Card t={t} a={30.2} b={32.35} top={8} size={60} sub="FREEZING WIND · NO OXYGEN">17,000 FEET UP</Card>
  <Radio t={t} a={32.7} b={34.9}/>
  <Card t={t} a={35.7} b={37.35} top={8} size={56} sub="JOHN HEWARD · SIMON ROGERS">THE CREW TAKE OVER</Card>
  <Card t={t} a={40.2} b={42.85} top={8} size={62} sub="AN EMERGENCY LANDING">DIVERTING TO SOUTHAMPTON</Card>
  <Card t={t} a={43.25} b={45.35} top={8} size={62} sub="THE CAPTAIN STILL OUTSIDE">RUNWAY 02</Card>
  <Card t={t} a={TOUCHDOWN+.1} b={49.9} top={9} size={66}>07:55 · TOUCHDOWN</Card>
  <Card t={t} a={53.4} b={55.9} top={9} size={110} sub="NO ONE ON BOARD DIED" accent="#2fbf5b">HE SURVIVED</Card>
  <Card t={t} a={56.15} b={57.95} top={8} size={56} sub="WERE THE WRONG SIZE">84 OF 90 WINDSCREEN BOLTS</Card>
  <Card t={t} a={58.0} b={59.75} top={8} size={56} sub="CAPTAIN LANCASTER FLEW AGAIN" accent="#2fbf5b">5 MONTHS LATER</Card>
  <AbsoluteFill style={{background:'#fff',opacity:Math.min(1,flashW)}}/><AbsoluteFill style={{background:'#000',opacity:fade}}/>
 </AbsoluteFill>;}
export function BA5390Film({audio=true}:{audio?:boolean}){const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig(),t=Math.min(frame/fps,59.999);
 const s=shotAt(t),c=cameraPose(t),k=craft(t);U.uTime.value=t;
 const eye=c.frame==='plane'?toWorld(k,c.eye):c.eye,target=c.frame==='plane'?toWorld(k,c.target):c.target,up=c.frame==='plane'?sub(toWorld(k,[0,1,0]),k.pos):[0,1,0] as V3;
 const pixelScale=height/(2*Math.tan(c.fov*Math.PI/360));const ctx={time:t,pixelScale,eye};
 const poses=actorsAt(t).map(id=>pose(id,t)),local=poses.filter(p=>p.frame==='plane'),world=poses.filter(p=>p.frame==='world');
 const kids=local.length>0?<Actors poses={local} eye={toLocal(k,eye)} time={t}/>:null;const interior=c.frame==='plane'&&Math.abs(c.eye[0])<3.2&&Math.abs(c.eye[2])<1.4&&c.eye[1]<1.6;
 return <AbsoluteFill style={{background:'#000'}}>{audio&&<Audio src={staticFile('ba5390/mix.wav')}/>}
  <ThreeCanvas width={width} height={height} shadows camera={{fov:50,near:.04,far:12000,position:[0,1,4]}} gl={{antialias:true,preserveDrawingBuffer:true}}>
   <Cam eye={eye} target={target} up={up} fov={c.fov} roll={c.roll}/>
   {s.set==='air'&&<AirSet {...ctx} interior={interior}>{kids}</AirSet>}
   {s.set==='cabin'&&<CabinSet {...ctx}>{kids}</CabinSet>}
   {s.set==='airport'&&<AirportSet {...ctx}>{kids}</AirportSet>}
   {world.length>0&&<Actors poses={world} eye={eye} time={t}/>}
  </ThreeCanvas><div style={{position:'absolute',left:0,top:0,width:1080,height:1920,transform:`scale(${width/1080})`,transformOrigin:'0 0'}}><Overlay t={t}/></div></AbsoluteFill>;}
