import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {SHOTS,VO,EV,ground,shotAt,dist,type V3} from './story';
import {emuPoses,emuMover,emuPose,feet,summitY,SUMMIT} from './motion';
import {actorsAt,pose,hatFlight} from './cast';
import {cameraPose} from './camera';
const finite=(v:number[])=>v.every(Number.isFinite);
test('Emu War: shots tile exactly 40 s and the beats follow the measured narration',()=>{assert.equal(SHOTS[0].start,0);assert.equal(SHOTS[SHOTS.length-1].end,40);for(let i=1;i<SHOTS.length;i++)assert.equal(SHOTS[i].start,SHOTS[i-1].end);
 for(let f=0;f<1200;f++)assert.equal(SHOTS.filter(s=>f/30>=s.start&&f/30<s.end).length,1);assert.equal(shotAt(VO.lost).id,'E03');assert.equal(shotAt(VO.aim).id,'E10');assert.equal(shotAt(VO.jammed).id,'E15');assert.equal(shotAt(VO.wheat).id,'E21');assert.ok(VO.speechEnd<40);});
test('Emu War: every frame evaluates finitely and deterministically (chunk-safe)',()=>{for(let f=0;f<1200;f+=2){const t=f/30,c=cameraPose(t);assert.ok(finite(c.eye)&&finite(c.target),'camera '+t);assert.deepEqual(cameraPose(t),c);
 for(const e of emuPoses(t,c.eye)){assert.ok(finite(e.body)&&finite(e.head)&&finite(e.feet[0])&&finite(e.feet[1]),e.id+' @'+t);}
 for(const id of actorsAt(t)){const p=pose(id,t);for(const k of ['hip','head','lHand','rHand','lFoot','rFoot'] as const)assert.ok(finite(p[k]),`${id} ${k} @${t}`);}}});
test('Emu War: planted emu feet stay on the ground and do not slide',()=>{for(const [id,set,t0] of [['lens1','paddock',.3],['pad3','paddock',18],['chase4','chase',26],['dam10','dam',22.5]] as const){const m=emuMover(id,set).mover;
 for(let t=t0;t<t0+1;t+=1/30){const f=feet(m,t);for(const [k,p] of [[0,f.l],[1,f.r]] as const){if(!f.contact[k])continue;assert.ok(Math.abs(p[1]-ground(p[0],p[2]))<1e-6);const n=feet(m,t+1/30),q=k?n.r:n.l;if(n.contact[k])assert.ok(dist(p,q)<.02,`${id} foot ${k} slides ${dist(p,q).toFixed(3)} @${t.toFixed(2)}`);}}}});
test('Emu War: the gunner\'s hat lands on the overtaking emu exactly on "LOST"',()=>{const e=emuPose(emuMover('hatemu','paddock'),VO.lost,[0,1,0]);const h=hatFlight(VO.lost,e.head)!;assert.ok(dist(h.pos,[e.head[0],e.head[1]+.17,e.head[2]] as V3)<.01);assert.ok(EV.faceplant<VO.lost);});
test('Emu War: the victor stands on the summit',()=>{const v=emuPose(emuMover('victor','hill'),36,[0,0,0]);assert.ok(Math.abs(v.feet[0][1]-summitY())<1e-6&&dist([v.feet[0][0],0,v.feet[0][2]],[SUMMIT[0],0,SUMMIT[2]])<.5);});
