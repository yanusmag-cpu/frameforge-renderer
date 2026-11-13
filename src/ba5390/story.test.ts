import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {SHOTS,shotAt,cameraPose,actorsAt,pose,craft,toWorld,toLocal,dist,TOUCHDOWN,runway} from './story';
const finite=(v:number[])=>v.every(Number.isFinite);
test('Claude BA5390: 26 shots tile exactly 60 s',()=>{assert.equal(SHOTS[0].start,0);assert.equal(SHOTS[SHOTS.length-1].end,60);for(let i=1;i<SHOTS.length;i++)assert.equal(SHOTS[i].start,SHOTS[i-1].end);for(let f=0;f<1800;f++)assert.equal(SHOTS.filter(s=>f/30>=s.start&&f/30<s.end).length,1);assert.throws(()=>shotAt(60));});
test('Claude BA5390: every frame evaluates finitely and identically (chunk-safe)',()=>{for(let f=0;f<1800;f++){const t=f/30,c=cameraPose(t);assert.ok(finite(c.eye)&&finite(c.target));assert.deepEqual(cameraPose(t),c);assert.ok(finite(craft(t).pos));for(const id of actorsAt(t)){const p=pose(id,t);for(const k of ['hip','head','lHand','rHand','lFoot','rFoot'] as const)assert.ok(finite(p[k]),`${id} ${k} @${t}`);}}});
test('Claude BA5390: aircraft frame round-trips and the jet touches down on the runway',()=>{for(const t of [1,15,33,41,46]){const c=craft(t),p:[number,number,number]=[1.6,1,-.4];assert.ok(dist(toLocal(c,toWorld(c,p)),p)<1e-6);}const r=runway(TOUCHDOWN);assert.ok(Math.abs(r.pos[1]-3.7)<.05&&Math.abs(r.pos[0]-300)<1);});
test('Claude BA5390: the crew keep hold of the captain from the grab to the landing',()=>{for(let t=26.5;t<35.4;t+=.5){const o=pose('ogden',t),c=pose('lancaster',t);assert.ok(dist(o.lHand,[1.38,.62,-.48])<.05);assert.equal(c.frame,'plane');}});
