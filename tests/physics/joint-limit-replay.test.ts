import { beforeAll,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { RAPIER } from '../../src/physics/PhysicsManager';
import manifest from '../fixtures/joint-limit-impact.json';
import { relativeTwistMotion } from '../../src/physics/Diagnostics';
import { length,sub } from '../../src/slicing/Math';
const bytes=new Uint8Array(readFileSync(new URL('../fixtures/joint-limit-impact.bin',import.meta.url)));
beforeAll(async()=>{await RAPIER.init();});
type Variant='baseline'|'motors-off'|'incident-limits-off'|'impact-pair-off'|'self-contact-off'|'shoulder-x-off'|'shoulder-y-off'|'shoulder-z-off'|'elbow-limit-off';
/** Counterfactuals are isolated test worlds, NEVER runtime settings or acceptance. */
function replay(variant:Variant){
 const world=RAPIER.World.restoreSnapshot(bytes),queue=new RAPIER.EventQueue(true);
 try{
  world.timestep=manifest.replayTimestep;
  const incident=manifest.world.find(p=>p.id===manifest.partId)!;
  world.impulseJoints.forEach(j=>{
   const axes=j.type()===RAPIER.JointType.Revolute?[3]:[3,4,5];
   if(variant==='motors-off')for(const axis of axes)world.impulseJoints.raw.jointConfigureMotorVelocity(j.handle,axis,0,0);
   const shoulder=manifest.joints.find(j=>j.b===manifest.partId&&!j.hinge)!;
   if(variant.startsWith('shoulder-')&&j.body1().handle===manifest.world.find(p=>p.id===shoulder.a)!.bodyHandle&&j.body2().handle===incident.bodyHandle){
    const axis=variant==='shoulder-x-off'?3:variant==='shoulder-y-off'?4:5;world.impulseJoints.raw.jointSetLimits(j.handle,axis,-Math.PI,Math.PI);
   }
   if(variant==='elbow-limit-off'&&j.type()===RAPIER.JointType.Revolute&&j.body1().handle===incident.bodyHandle)world.impulseJoints.raw.jointSetLimits(j.handle,3,-Math.PI,Math.PI);
   if(variant==='incident-limits-off'&&(j.body1().handle===incident.bodyHandle||j.body2().handle===incident.bodyHandle))
    for(const axis of axes)world.impulseJoints.raw.jointSetLimits(j.handle,axis,-Math.PI,Math.PI);
  });
  const byCollider=new Map(manifest.world.map(p=>[p.colliderHandle,p])),key=(a:number,b:number)=>`${Math.min(a,b)}:${Math.max(a,b)}`;
  const excluded=new Set([...manifest.neighborPairs,...manifest.deferredPairs].map(j=>key(j.a,j.b)));
  world.step(queue,{filterContactPair:(a,b)=>{
   const pa=byCollider.get(a),pb=byCollider.get(b);
   if(pa&&pb&&variant==='impact-pair-off'&&key(pa.id,pb.id)===key(manifest.impactPair.partA,manifest.impactPair.partB))return null;
   if(pa&&pb&&variant==='self-contact-off'&&pa.npcId===pb.npcId)return null;
   if(pa&&pb&&(excluded.has(key(pa.id,pb.id))||(!manifest.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component))return null;
   return RAPIER.SolverFlags.COMPUTE_IMPULSE;
  },filterIntersectionPair:()=>true});
  return manifest.world.map(p=>{const b=world.getRigidBody(p.bodyHandle);return {id:p.id,position:{...b.translation()},rotation:{...b.rotation()},velocity:{...b.linvel()},angular:{...b.angvel()}};});
 }finally{queue.free();world.free();}
}
it('pinned current shoulder-limit/contact peak reproduces every body on Rapier 0.21.0',()=>{
 expect(RAPIER.version()).toBe(manifest.rapierVersion);expect(manifest.world).toHaveLength(110);
 const actual=replay('baseline');
 for(const p of manifest.world){const b=actual.find(b=>b.id===p.id)!;expect(b.position).toEqual(p.after.position);expect(b.rotation).toEqual(p.after.rotation);expect(b.velocity).toEqual(p.after.velocity);expect(b.angular).toEqual(p.after.angular);}
 expect(length(actual.find(b=>b.id===manifest.partId)!.angular)).toBeCloseTo(82.8236998809527,8);
});
it('the active shoulder Y limit is coupled to other angular coordinates at this peak',()=>{
 const shoulder=manifest.joints.find(j=>j.b===manifest.partId&&!j.hinge)!,stateA=manifest.world.find(p=>p.id===shoulder.a)!.after,stateB=manifest.world.find(p=>p.id===shoulder.b)!.after;
 const rates=relativeTwistMotion(stateA.rotation,stateB.rotation,shoulder.frameA,shoulder.frameB,stateA.angular,stateB.angular);
 expect(rates[1].rate).toBeCloseTo(92.37359204536867,5);
 expect(rates[1].axisRate).toBeCloseTo(72.72555359803341,5);
 expect(Math.abs(rates[1].rate!-rates[1].axisRate)).toBeGreaterThan(15);
 // This diagnostic demonstrates coordinate coupling, not the exact native
 // solver row / accumulated impulse. A native Jacobian fix still needs proof.
 expect(rates[1].denominator).toBeGreaterThan(.8);
});
it('only shoulder Y limit removal suppresses this local peak; contact exemptions do not fix the world',()=>{
 const run=(variant:Variant)=>{const states=replay(variant);return {local:length(states.find(b=>b.id===manifest.partId)!.angular),world:Math.max(...states.map(b=>length(b.angular)))};};
 const baseline=run('baseline'),y=run('shoulder-y-off');
 expect(y.local).toBeLessThan(10);
 for(const variant of ['shoulder-x-off','shoulder-z-off','elbow-limit-off'] as Variant[])expect(run(variant).local).toBe(baseline.local);
 const pairOff=run('impact-pair-off'),selfOff=run('self-contact-off');
 expect(pairOff.local).toBeCloseTo(34.358180363213044,5);expect(pairOff.world).toBeGreaterThan(35);
 expect(selfOff.local).toBeCloseTo(27.493043247319324,5);expect(selfOff.world).toBeGreaterThan(baseline.world);
});
it('current peak is not removed by disabling motors; incident limits explain this local impulse',()=>{
 const baseline=replay('baseline'),motors=replay('motors-off'),limits=replay('incident-limits-off');
 const peak=(b:ReturnType<typeof replay>)=>length(b.find(b=>b.id===manifest.partId)!.angular);
 expect(peak(baseline)).toBeGreaterThan(35);expect(peak(motors)).toBeGreaterThan(35);expect(Math.abs(peak(motors)-peak(baseline))).toBeLessThan(2);
 expect(peak(limits)).toBeLessThan(10);expect(peak(limits)).toBeLessThan(peak(baseline)*.15);
 expect(length(sub(baseline.find(b=>b.id===manifest.partId)!.angular,manifest.before.angular))).toBeGreaterThan(50);
 // No edits to shared fixture bytes; a fresh baseline after counterfactuals is exact.
 expect(replay('baseline')).toEqual(baseline);
});
