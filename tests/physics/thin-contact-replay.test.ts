import {beforeAll,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {exactMassProperties} from '../../src/physics/ExactMass';
import {principalInertiaTensor} from '../../src/physics/InertiaTensor';
import {vec,rotate} from '../../src/slicing/Math';
const manifest=JSON.parse(readFileSync(new URL('../fixtures/thin-contact-impact.json',import.meta.url),'utf8')),bytes=new Uint8Array(readFileSync(new URL('../fixtures/thin-contact-impact.bin',import.meta.url)));
beforeAll(async()=>{await RAPIER.init();});
function replay(variant:'baseline'|'exact'|'static-contact-off'){
 const world=RAPIER.World.restoreSnapshot(bytes),queue=new RAPIER.EventQueue(true),incident=manifest.parts.find((p:any)=>p.id===manifest.partId);
 try{
  if(variant==='exact'){const m=exactMassProperties(incident.poly,incident.density);world.getCollider(incident.collider).setMassProperties(m.mass,m.center,m.principal,m.frame);world.getRigidBody(incident.body).recomputeMassPropertiesFromColliders();}
  const byCollider=new Map<number,any>(manifest.world.map((p:any)=>[p.colliderHandle,p])),key=(a:number,b:number)=>`${Math.min(a,b)}:${Math.max(a,b)}`,excluded=new Set([...manifest.neighborPairs,...manifest.deferredPairs].map((j:any)=>key(j.a,j.b)));
  world.timestep=manifest.replayTimestep;
  world.step(queue,{filterContactPair:(a,b)=>{const pa=byCollider.get(a),pb=byCollider.get(b);
   if(variant==='static-contact-off'&&(pa?.id===manifest.partId&&!pb||pb?.id===manifest.partId&&!pa))return null;
   if(pa&&pb&&(excluded.has(key(pa.id,pb.id))||(!manifest.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component))return null;
   return RAPIER.SolverFlags.COMPUTE_IMPULSE;
  },filterIntersectionPair:()=>true});
  return manifest.world.map((p:any)=>{const b=world.getRigidBody(p.bodyHandle);return {id:p.id,position:{...b.translation()},rotation:{...b.rotation()},velocity:{...b.linvel()},angular:{...b.angvel()}};});
 }finally{queue.free();world.free();}
}
it('natural 102-part thin contact peak replays every body exactly on the pinned engine',()=>{
 expect(manifest.parts).toHaveLength(102);expect(manifest.joints).toHaveLength(0);
 const states=replay('baseline');for(const p of manifest.world){const actual=states.find((s:any)=>s.id===p.id);expect(actual.position).toEqual(p.after.position);expect(actual.rotation).toEqual(p.after.rotation);expect(actual.velocity).toEqual(p.after.velocity);expect(actual.angular).toEqual(p.after.angular);}
 const w=states.find((s:any)=>s.id===manifest.partId).angular;expect(Math.hypot(w.x,w.y,w.z)).toBeCloseTo(1465.401849679397,7);
});
it('automatic tiny inertia eigenframe is inconsistent with the captured long axis and exact tensor',()=>{
 const p=manifest.parts.find((p:any)=>p.id===manifest.partId),m=exactMassProperties(p.poly,p.density),auto=principalInertiaTensor(p.principal,p.principalFrame);
 const exactAxis=rotate(vec(1,0,0),m.frame),autoAxis=rotate(vec(1,0,0),p.principalFrame);
 expect(Math.abs(exactAxis.y)).toBeGreaterThan(.999);expect(Math.abs(autoAxis.x)).toBe(1);
 expect(auto.m11/m.tensor[0][0]).toBeLessThan(.001);expect(auto.m22/m.tensor[1][1]).toBeGreaterThan(1000);expect(p.mass).toBeCloseTo(m.mass,10);
});
it('native automatic eigenframe error depends on absolute inertia scale, not geometry or mass ratios',()=>{
 const source=manifest.parts.find((p:any)=>p.id===manifest.partId),errors=[];
 for(const factor of [1,1e6]){
  const p=new PhysicsManager();try{
   const part=p.createPart(source.poly,{position:vec(0,3,0),rotation:{x:0,y:0,z:0,w:1}},0,1,'diagnostic',1,source.density*factor);
   const principal={...part.body.principalInertia()},frame={...part.body.principalInertiaLocalFrame()};
   const tensor=principalInertiaTensor(vec(principal.x/factor,principal.y/factor,principal.z/factor),frame),exact=exactMassProperties(source.poly,source.density);
   const normalizer=Math.max(exact.principal.x,exact.principal.y,exact.principal.z),target={m11:exact.tensor[0][0],m12:exact.tensor[0][1],m13:exact.tensor[0][2],m22:exact.tensor[1][1],m23:exact.tensor[1][2],m33:exact.tensor[2][2]};
   errors.push(Math.max(...Object.keys(target).map(k=>Math.abs(tensor[k as keyof typeof tensor]-target[k as keyof typeof target])/normalizer)));
   expect(part.body.mass()/factor).toBeCloseTo(source.mass,10);
  }finally{p.dispose();}
 }
 expect(errors[0]).toBeGreaterThan(.9);expect(errors[1]).toBeLessThan(.001);
 // Mass scaling exists only in isolated test worlds and is NEVER a runtime remedy.
});
it('exact tensor reduces this local impulse but still fails stability; static contact is causal, not a runtime exemption',()=>{
 const baseline=replay('baseline'),exact=replay('exact'),contactOff=replay('static-contact-off'),peak=(states:typeof baseline)=>{const w=states.find((s:any)=>s.id===manifest.partId).angular;return Math.hypot(w.x,w.y,w.z);};
 expect(peak(exact)).toBeCloseTo(89.60866572762332,6);expect(peak(exact)).toBeGreaterThan(35);expect(peak(contactOff)).toBeLessThan(3);expect(replay('baseline')).toEqual(baseline);
});
