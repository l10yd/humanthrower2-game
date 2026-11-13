import { beforeAll, describe, expect, it } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { CONFIG } from '../../src/core/Config';
import { severJoint } from '../../src/slicing/Dismemberment';
import { identity, vec } from '../../src/slicing/Math';
import { box } from '../../src/slicing/ConvexClipper';
beforeAll(async()=>{await RAPIER.init();});
describe('NPC self collision and physical substeps',()=>{
 it('collides non-adjacent parts of a connected NPC, then the severed direct neighbors too',()=>{
  const p=new PhysicsManager();try{
   const parts=new RagdollFactory(p,2,2).spawn('normal',vec(0,4,0),identity,false)!;
   const head=parts.find(part=>part.limb==='head')!,chest=parts.find(part=>part.limb==='chest')!,shin=parts.find(part=>part.limb==='shin1')!;
   const filter=(a:typeof head,b:typeof head)=>p.hooks.filterContactPair(a.collider.handle,b.collider.handle,a.body.handle,b.body.handle);
   expect(p.connected(head.id,shin.id)).toBe(true);
   expect(filter(head,shin)).toBe(RAPIER.SolverFlags.COMPUTE_IMPULSE);expect(filter(head,chest)).toBeNull();
   const joint=[...p.joints.values()].find(j=>j.a===chest.id&&j.b===head.id)!;severJoint(p,joint.id);
   expect(filter(head,chest)).toBe(RAPIER.SolverFlags.COMPUTE_IMPULSE);expect(p.deferredContacts).toBe(0);
  }finally{p.dispose();}
 });
 it('sets finite NPC motor moments per axis on original and remapped joints',()=>{
  const p=new PhysicsManager();try{
   const raw=p.world.impulseJoints.raw,original=raw.jointSetMotorMaxForce.bind(raw),calls:{handle:number;axis:number;force:number}[]=[];
   raw.jointSetMotorMaxForce=(handle,axis,force)=>{calls.push({handle,axis,force});original(handle,axis,force);};
   new RagdollFactory(p).spawn('normal',vec(0,4,0),identity,false);
   expect(calls.length).toBe(22);for(const c of calls)expect(c.force).toBe(CONFIG.physics.jointMaxTorque);
   const j=[...p.joints.values()].find(j=>!j.hinge)!;const remapped=p.createJoint({...j});
   expect(calls.filter(c=>c.handle===remapped.handle).length).toBe(3);
   for(const c of calls.filter(c=>c.handle===remapped.handle))expect(Number.isFinite(c.force)&&c.force>0).toBe(true);
  }finally{p.dispose();}
 });
 it('keeps the connected player articulation filtered, but external NPC contacts enabled',()=>{
  const p=new PhysicsManager();try{
   const a=p.createPart(box(.1,.1,.1),{position:vec(0,3,0),rotation:identity},3,0,'arm',0,undefined,'player');
   const b=p.createPart(box(.1,.1,.1),{position:vec(.2,3,0),rotation:identity},3,0,'chest',0,undefined,'player');
   const npc=p.createPart(box(.1,.1,.1),{position:vec(0,4,0),rotation:identity},3,1,'npc');
   p.createJoint({a:a.id,b:b.id,anchorA:vec(.1,0,0),anchorB:vec(-.1,0,0),axis:vec(1,0,0),hinge:true,limits:[[-1,1]]});
   expect(p.hooks.filterContactPair(a.collider.handle,b.collider.handle,a.body.handle,b.body.handle)).toBeNull();
   expect(p.hooks.filterContactPair(a.collider.handle,npc.collider.handle,a.body.handle,npc.body.handle)).toBe(RAPIER.SolverFlags.COMPUTE_IMPULSE);
  }finally{p.dispose();}
 });
 it('interpolates kinematic targets over the full game tick, without double-speed first-substep movement',()=>{
  const p=new PhysicsManager();try{
   const body=p.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,3,0));
   body.setNextKinematicTranslation(vec(.1,3,0));const velocities:number[]=[];
   const step=p.world.step.bind(p.world);p.world.step=(...args)=>{step(...args);velocities.push(body.linvel().x);};
   p.step();expect(velocities.length).toBe(CONFIG.physics.solverSubsteps);
   for(const v of velocities)expect(v).toBeCloseTo(.1/CONFIG.dt,4);
   expect(body.translation().x).toBeCloseTo(.1,5);expect(p.time).toBeCloseTo(CONFIG.dt,10);expect(p.world.timestep).toBeCloseTo(CONFIG.dt,7);
  }finally{p.dispose();}
 });
 it('force integration across substeps keeps the external 60Hz clock and mass response',()=>{
  const p=new PhysicsManager();try{
   const part=p.createPart(box(.2,.2,.2),{position:vec(0,5,0),rotation:identity},10,1,'fixture');
   part.body.setGravityScale(0,true);part.body.setLinearDamping(0);part.body.addForce(vec(60,0,0),true);
   p.step();expect(part.body.linvel().x).toBeCloseTo(60/10*CONFIG.dt,4);expect(p.time).toBeCloseTo(CONFIG.dt,10);
  }finally{p.dispose();}
 });
});
