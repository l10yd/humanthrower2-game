import { beforeAll,it,expect } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { PlayerController } from '../../src/player/PlayerController';
import {clearRows} from '../../src/slicing/ClearTransaction';
import { box } from '../../src/slicing/ConvexClipper';
import { axisAngle,vec,identity } from '../../src/slicing/Math';
const idle={axis:0,pressed:false,released:false,stomp:false};
beforeAll(async()=>{await RAPIER.init();});
it('a won QTE remains blocked by an immovable closed roof, then rises within one second after removal',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);let now=0;
 const step=(pressed=false)=>{p.snapshot();c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);
  const roof=p.world.createCollider(RAPIER.ColliderDesc.cuboid(4.5,.1,1.2).setTranslation(0,2.1,0));
  for(let i=0;i<60;i++)step();for(let i=0;i<80&&!c.qte.ready;i++)step(true);
  expect(c.qte.ready).toBe(true);const ids=c.ragdoll.parts.map(b=>b.id);
  for(let i=0;i<120;i++){step();expect(c.collider.isEnabled()).toBe(false);expect(c.ragdoll.down).toBe(true);}
  expect(c.qte.progress).toBe(1);expect(c.ragdoll.parts.map(b=>b.id)).toEqual(ids);
  p.world.removeCollider(roof,true);
  for(let i=0;i<60&&c.ragdoll.down;i++)step();expect(c.ragdoll.down).toBe(false);expect(c.collider.isEnabled()).toBe(true);expect(c.qte.active).toBe(false);expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
});
it('a nonfatal row cut during won recovery preserves 100% and the original one-second deadline',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);let now=0;
 const step=(pressed=false)=>{c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);for(let i=0;i<30;i++)step();for(let i=0;i<30&&!c.qte.ready;i++)step(true);
  const filled=now;for(let i=0;i<12;i++)step();const head=c.ragdoll.parts.find(p=>p.limb==='head')!.id;
  c.prepareRowDeath(now);clearRows(p,[0],'solver',true);expect(c.resumeAfterCut(now)).toBe(true);
  expect(c.qte.ready).toBe(true);expect(c.qte.progress).toBe(1);expect(c.damage.mobility).toBe('LIMP');expect(c.ragdoll.parts.some(p=>p.id===head)).toBe(true);
  const tissue={...c.damage.tissue};for(let i=0;i<60&&c.ragdoll.down;i++)step();
  expect(c.ragdoll.down).toBe(false);expect(now-filled).toBeLessThanOrEqual(1+1e-6);expect(c.qte.escapes).toBe(1);expect(c.damage.tissue).toEqual(tissue);expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
});
it('completed QTE keeps its standing result without renewing knockdown protection',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);let now=0;
 const step=(pressed=false)=>{p.snapshot();c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);
  for(let i=0;i<30;i++)step();for(let i=0;i<30&&!c.qte.ready;i++)step(true);
  expect(c.qte.ready).toBe(true);
  for(let i=0;i<60&&c.ragdoll.down;i++){step();expect(c.protectedUntil).toBeGreaterThan(now);}
  expect(c.ragdoll.down).toBe(false);expect(c.qte.phase).toBe('STANDING');
  const completedAt=now,deadline=c.protectedUntil;
  expect(deadline).toBeCloseTo(completedAt+CONFIG.forcedRecovery.protection);
  for(let i=0;i<180;i++){step();expect(c.protectedUntil).toBe(deadline);}
  expect(now).toBeGreaterThan(deadline);expect(c.qte.progress).toBe(1);expect(c.qte.escapes).toBe(1);
  // An explicit saw grace may extend protection, but the old QTE must not renew it.
  c.protectedUntil=now+CONFIG.sawGuard.playerGrace;const sawDeadline=c.protectedUntil;
  for(let i=0;i<180;i++){step();expect(c.protectedUntil).toBe(sawDeadline);}
  c.knockDownFromAttack(100,15,now);step();
  expect(c.ragdoll.knockdowns).toBe(2);expect(c.qte.ready).toBe(false);expect(c.qte.escapes).toBe(1);
  expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
});
for(const fullNpc of [false,true])it(`successive falling ${fullNpc?'whole NPCs':'body parts'} knock down the player after each QTE protection expires`,()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),f=new RagdollFactory(p,2,2);let now=0;
 const step=(pressed=false)=>{p.snapshot();c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  for(let i=0;i<15;i++)step();
  for(let cycle=0;cycle<3;cycle++){
   // Roll the NPC's chest onto the capsule; lighter feet/arms must not be
   // the only contact in this >=minImpactMass knockdown fixture.
   const parts=fullNpc?f.spawn('normal',vec(c.current.x+.9,c.current.y+4,0),{x:-.5,y:.5,z:.5,w:.5},true,{velocity:vec(0,-12,0)})!:
    [p.createPart(box(.32,.2,.2),{position:vec(c.current.x,c.current.y+4,0),rotation:identity},22,cycle+1,'falling-chest')];
   expect(parts).not.toBeNull();
   for(let i=0;i<180&&!c.ragdoll.down;i++)step();
   expect(c.ragdoll.knockdowns).toBe(cycle+1);expect(c.ragdoll.parts).toHaveLength(11);expect(c.collider.isEnabled()).toBe(false);
   expect(c.lastImpact?.speed).toBeGreaterThanOrEqual(CONFIG.player.impactSpeed);
   for(let i=0;i<240&&!c.qte.active;i++)step();
   expect(c.qte.ready).toBe(false);
   for(let i=0;i<150&&!c.qte.ready;i++)step(true);expect(c.qte.ready).toBe(true);
   for(let i=0;i<60&&c.ragdoll.down;i++)step();
   expect(c.ragdoll.down).toBe(false);expect(c.qte.escapes).toBe(cycle+1);expect(c.collider.isEnabled()).toBe(true);
   // Remove only the test drop between cycles to guarantee an empty launch lane.
   for(const part of parts)p.removePart(part.id);
   for(let i=0;i<120;i++)step();
  }
  expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
},30000);
it('a subsequent airborne knockdown never inherits the previous won QTE',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);let now=0;
 const step=(pressed=false)=>{c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);for(let i=0;i<30;i++)step();for(let i=0;i<30&&!c.qte.ready;i++)step(true);for(let i=0;i<60&&c.ragdoll.down;i++)step();
  expect(c.qte.escapes).toBe(1);c.collider.setEnabled(false);c.ragdoll.knockDown(vec(0,7,0),vec(),now);
  step(true);expect(c.qte.effort).toBe(0);expect(c.qte.active).toBe(false);expect(c.ragdoll.qteProgress).toBe(0);expect(c.ragdoll.parts.every(p=>p.body.isDynamic())).toBe(true);
 }finally{c.dispose();p.dispose();}
});
it('won recovery clears a solid movable blocker without deleting it or ejecting it outside the arena',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);let now=0;
 const step=(pressed=false)=>{c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);for(let i=0;i<30;i++)step();
  const load=p.createPart(box(.65,.4,.55),{position:vec(0,2,0),rotation:identity},180,99,'heavy-blocker');
  // Fill effort through real presses while the weight physically settles onto the player.
  for(let i=0;i<150&&!c.qte.ready;i++)step(true);expect(c.qte.ready).toBe(true);let throwImpulse=0;
  for(let i=0;i<60&&c.ragdoll.down;i++){throwImpulse=Math.max(throwImpulse,c.ragdoll.spaceImpulse);step();}
  expect(throwImpulse).toBeGreaterThan(0);expect(c.ragdoll.down).toBe(false);expect(p.parts.has(load.id)).toBe(true);expect(load.body.mass()).toBeCloseTo(180);
  const position=load.body.translation();expect(Math.abs(position.x)).toBeLessThan(4);expect(Math.abs(position.z)).toBeLessThan(.7);expect(position.y).toBeGreaterThan(.35);
  const contact=c.collider.contactCollider(load.collider,0);expect(contact?.distance??0).toBeGreaterThanOrEqual(-.002);expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
});
it('ordinary standing never shoves a pile and post-recovery clearance expires',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);
 try{
  const debris=p.createPart(box(.2,.2,.2),{position:vec(.7,c.current.y,0),rotation:identity},20,1,'nearby');
  const x=debris.body.linvel().x;c.update(idle,0,CONFIG.dt);expect(c.recoverySpaceImpulse).toBe(0);expect(debris.body.linvel().x).toBe(x);
  c.recoverySpaceUntil=1;c.update(idle,2,CONFIG.dt);expect(c.recoverySpaceImpulse).toBe(0);
 }finally{c.dispose();p.dispose();}
});
for(const direction of [-1,1])it(`three actual NPCs overload QTE; removing one lets the player recover (${direction})`,()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),f=new RagdollFactory(p,2,2);let now=0;
 const step=(pressed=false)=>{p.snapshot();c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  for(let i=0;i<15;i++)step();const npcs=[];
  for(let n=0;n<3;n++)npcs.push(f.spawn('normal',vec(direction*(n===1?-.35:n===2?.4:0),5+n*3.5,0),axisAngle(vec(0,0,1),direction*(n===2?-1.25:1.4)))!);
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);for(let i=0;i<240;i++)step();
  const ids=c.ragdoll.parts.map(p=>p.id);
  for(let i=0;i<150;i++)step(true);
  expect(c.qte.overloaded).toBe(true);expect(c.qte.loadMass).toBeCloseTo(240,3);expect(c.qte.ready).toBe(false);expect(c.ragdoll.parts.map(p=>p.id)).toEqual(ids);
  for(const part of npcs[2])p.removePart(part.id);
  for(let i=0;i<150&&!c.qte.ready;i++)step(true);expect(c.qte.ready).toBe(true);
  for(let i=0;i<60&&c.ragdoll.down;i++)step();expect(c.ragdoll.down).toBe(false);expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
},30000);
for(const direction of [-1,1])for(const count of [1,2])it(`won QTE throws aside ${count} actual NPCs and stands in one second (${direction}), without further input`,()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),f=new RagdollFactory(p,2,2);let now=0;
 const step=(pressed=false)=>{p.snapshot();c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  for(let i=0;i<15;i++)step();
  const npcParts=[];
  for(let n=0;n<count;n++)npcParts.push(...f.spawn('normal',vec(direction*(n===1?-.35:n===2?.4:0),5+n*3.5,0),axisAngle(vec(0,0,1),direction*(n===2?-1.25:1.4)))!);
  // Keep this a recovery fixture regardless of whether a particular drop happens to miss the KCC.
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);
  for(let i=0;i<240;i++)step();expect(c.ragdoll.down).toBe(true);
  const ids=c.ragdoll.parts.map(b=>b.id),mass=npcParts.reduce((s,p)=>s+p.body.mass(),0),joints=p.joints.size;
  for(let i=0;i<150&&!c.qte.ready;i++)step(true);expect(c.qte.ready).toBe(true);
  const full=now;let thrown=0;
  for(let i=0;i<60&&c.ragdoll.down;i++){
   c.knockDownFromAttack(100,15,now);expect(c.qte.ready).toBe(true);
   step();thrown=Math.max(thrown,c.ragdoll.spaceImpulse);
   if(c.ragdoll.down)expect(c.ragdoll.parts.map(b=>b.id)).toEqual(ids);
  }
  expect(c.ragdoll.down).toBe(false);expect(now-full).toBeLessThanOrEqual(1+1e-6);expect(c.collider.isEnabled()).toBe(true);
  expect(c.qte.escapes).toBe(1);expect(c.qte.active).toBe(false);expect(npcParts.every(part=>p.parts.has(part.id))).toBe(true);
  expect(npcParts.reduce((s,p)=>s+p.body.mass(),0)).toBeCloseTo(mass);expect(p.joints.size).toBe(joints-10);expect(p.numericFaults).toBe(0);
  const position={...c.current},walkAxis=Math.abs(c.current.x)<3?direction:-Math.sign(c.current.x);
  for(let i=0;i<30;i++){c.update({...idle,axis:walkAxis},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);}
  expect(Math.abs(c.current.x-position.x)).toBeGreaterThan(.5);expect(c.state).toBe('ACTIVE');
 }finally{c.dispose();p.dispose();}
},30000);
