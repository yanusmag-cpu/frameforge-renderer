/** Deterministic, absolute-time acting. IK uses the existing proven two-bone solver. */
import {solveIK,type V3,smooth,mix} from './ik';
export {solveIK,type V3,smooth,mix};
export type Cast='michael'|'jane'|'narrator'|'guard';
export type Action='idle'|'walk'|'study'|'point'|'think'|'sit'|'reach'|'card'|'crawl'|'alarm'|'turn'|'smile';
export function actorPose(id:Cast,t:number,action:Action,elapsed:number,seatedOverride=false){
 const seed={michael:.3,jane:1.7,narrator:2.9,guard:4.2}[id],walk=action==='walk',speed=.48;
 const root=walk?Math.min(elapsed,4)*speed:action==='crawl'?Math.min(elapsed,5)*.13:0;
 const foot=(side:number):V3=>{
  if(!walk)return [side*.14,.055,.02];
  const cycle=Math.min(elapsed,4)/.8+(side>0?.5:0),n=Math.floor(cycle),phase=cycle-n;
  const planted=(n-(side>0?.5:0))*.8*speed;
  const u=smooth(.58,1,phase),x=planted+.8*speed*u-root;
  return [x,.055+(phase>.58?Math.sin(Math.PI*(phase-.58)/.42)*.12:0),side*.09];
 };
 const seated=seatedOverride||action==='sit',hip:V3=[0,seated?.66:1.10+.015*Math.sin(t*2.1+seed),0],shoulder:V3=[.025*Math.sin(t*1.1+seed),hip[1]+.48,0];
 const head:V3=[shoulder[0],shoulder[1]+.41,0];
 const reach=smooth(.6,1.9,elapsed),release=1-smooth(4.7,5.8,elapsed);
 let right:V3=[.33,hip[1]-.02,.02];let left:V3=[-.33,hip[1]-.02,.02];
 if(walk){right=[.2+.19*Math.sin(elapsed*Math.PI*2/.8),hip[1],.07];left=[-.2-.19*Math.sin(elapsed*Math.PI*2/.8),hip[1],-.07];}
 if(action==='think'||action==='study')right=mix(right,[.09,head[1]-.19,.07],reach*release);
 if(action==='point'||action==='alarm')right=mix(right,[.73,shoulder[1]+.03,.06],reach*release);
 if(action==='reach'||action==='card')right=mix(right,[.55,1.13+.25*smooth(2,3.4,elapsed),.12],reach);
 if(seated){if(id==='michael'){right=[.48,1.12,.09];left=[-.16,.73,.07];}else{left=[-.48,1.12,.09];right=[.16,.73,.07];}}
 if(action==='smile')left=mix(left,[-.57,shoulder[1]-.02,.02],reach*release);
 let leftFoot=seated?[-.18,.06,.35] as V3:foot(-1),rightFoot=seated?[.18,.06,.35] as V3:foot(1);
 if(action==='crawl'){hip[0]=-.40;hip[1]=.57;shoulder[0]=.08;shoulder[1]=.66;head[0]=.43;head[1]=.87;const phase=elapsed%1,step=smooth(.6,1,phase);right=[.55+.16*step,.08+.12*Math.sin(step*Math.PI),.08];left=[.27-.16*step,.08,0];leftFoot=[-.9,.07,.1];rightFoot=[-.72-.13*Math.sin(elapsed*4),.07,-.1];}
 const rightShoulder:V3=[shoulder[0]+(action==='crawl'?.03:.2),shoulder[1],.02],leftShoulder:V3=[shoulder[0]-(action==='crawl'?.03:.2),shoulder[1],-.02];const leftHip:V3=[hip[0]-.11,hip[1],0],rightHip:V3=[hip[0]+.11,hip[1],0];
 return {root,hip,leftHip,rightHip,shoulder,head,leftFoot,rightFoot,rightShoulder,leftShoulder,rightArm:solveIK(rightShoulder,right,.42,.42,[.2,-1,.1]),leftArm:solveIK(leftShoulder,left,.42,.42,[-.2,-1,.1]),rightLeg:solveIK(rightHip,rightFoot,.54,.54,[0,.1,.4]),leftLeg:solveIK(leftHip,leftFoot,.54,.54,[0,.1,.4]),blink:1-.94*Math.exp(-((((t+seed)%4.7-3.6)/.055)**2)),gaze:.025*Math.sin(t*.8+seed),tilt:.025*Math.sin(t*.9+seed)+(action==='think'?.08*reach:0)};
}
