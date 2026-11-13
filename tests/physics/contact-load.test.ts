import { beforeAll,it,expect,vi } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { contactLoad } from '../../src/player/ContactLoad';
import { pileLoad } from '../../src/player/PileLoad';
import { box } from '../../src/slicing/ConvexClipper';
import { identity,vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('sleeping contacts are reported unavailable rather than replaying an old impulse as load',()=>{
 const p=new PhysicsManager();try{
  p.contactLoadDiagnosticsEnabled=true;
  const player=p.createPart(box(1.1,.1,.4),{position:vec(0,.6,0),rotation:identity},32,0,'support',0,undefined,'player');player.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
  const beam=p.createPart(box(.95,.12,.3),{position:vec(0,.86,0),rotation:identity},72,1,'beam');
  for(let i=0;i<360;i++)p.step();expect(beam.body.isSleeping()).toBe(true);
  const load=contactLoad(p,[player],CONFIG.dt);expect(load.downwardImpulse).toBe(0);expect(load.equivalentMass).toBe(0);expect(load.stalePairs).toBeGreaterThan(0);expect(p.contactLoad.snapshot.complete).toBe(false);
  beam.body.wakeUp();p.step();expect(p.contactLoad.snapshot.complete).toBe(true);expect(p.contactLoad.snapshot.equivalentMass).toBeGreaterThan(65);
 }finally{p.dispose();}
});
it('one NPC supported by two player parts contributes its reaction once across both contacts',()=>{
 const p=new PhysicsManager();try{
  p.contactLoadDiagnosticsEnabled=true;
  const players=[-.7,.7].map(x=>{const b=p.createPart(box(.25,.1,.4),{position:vec(x,.6,0),rotation:identity},16,0,'support',0,undefined,'player');b.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);return b;});
  const beam=p.createPart(box(.95,.12,.3),{position:vec(0,.86,0),rotation:identity},72,1,'beam');
  for(let i=0;i<240;i++)p.step();beam.body.wakeUp();p.step();
  expect(p.contactLoad.snapshot.equivalentMass).toBeCloseTo(72,0);
  const left=contactLoad(p,[players[0]],CONFIG.dt/2),right=contactLoad(p,[players[1]],CONFIG.dt/2),both=contactLoad(p,players,CONFIG.dt/2);
  expect(left.downwardImpulse+right.downwardImpulse).toBeCloseTo(both.downwardImpulse,8);expect(left.equivalentMass).toBeGreaterThan(20);expect(right.equivalentMass).toBeGreaterThan(20);
 }finally{p.dispose();}
});
it('upward NPC support is kept separate from downward burden, regardless of collider creation order',()=>{
 for(const playerFirst of [false,true]){
  const p=new PhysicsManager();try{
   const makePlayer=()=>p.createPart(box(.3,.12,.3),{position:vec(0,.84,0),rotation:identity},32,0,'pelvis',0,undefined,'player');
   const makeSupport=()=>{const b=p.createPart(box(.6,.1,.4),{position:vec(0,.6,0),rotation:identity},72,1,'support');b.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);return b;};
   let player;if(playerFirst){player=makePlayer();makeSupport();}else{makeSupport();player=makePlayer();}
   for(let i=0;i<40;i++){player.body.wakeUp();p.step();}
   const load=contactLoad(p,[player],CONFIG.dt/2);expect(load.downwardImpulse).toBe(0);expect(load.upwardImpulse).toBeGreaterThan(0);expect(load.equivalentMass).toBe(0);
  }finally{p.dispose();}
 }
});
it('duplicate player references and cut-away stale parts cannot double count or access freed WASM handles',()=>{
 const p=new PhysicsManager();try{
  const player=p.createPart(box(.6,.1,.4),{position:vec(0,.6,0),rotation:identity},32,0,'support',0,undefined,'player');player.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
  const beam=p.createPart(box(.4,.12,.3),{position:vec(0,.86,0),rotation:identity},72,1,'beam');for(let i=0;i<40;i++)p.step();beam.body.wakeUp();p.step();
  const once=contactLoad(p,[player],CONFIG.dt),twice=contactLoad(p,[player,player],CONFIG.dt);expect(once.downwardImpulse).toBeGreaterThan(0);expect(twice).toEqual(once);
  p.removePart(player.id);expect(()=>contactLoad(p,[player],CONFIG.dt)).not.toThrow();expect(contactLoad(p,[player],CONFIG.dt).downwardImpulse).toBe(0);
 }finally{p.dispose();}
});
it('disabled/sensor player colliders provide no physical load; invalid timesteps are rejected',()=>{
 const p=new PhysicsManager();try{
  const player=p.createPart(box(.6,.1,.4),{position:vec(0,.6,0),rotation:identity},32,0,'support',0,undefined,'player');player.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
  p.createPart(box(.4,.12,.3),{position:vec(0,.86,0),rotation:identity},72,1,'beam');for(let i=0;i<40;i++)p.step();
  player.collider.setEnabled(false);expect(contactLoad(p,[player],CONFIG.dt).downwardImpulse).toBe(0);
  player.collider.setEnabled(true);player.collider.setSensor(true);expect(contactLoad(p,[player],CONFIG.dt).downwardImpulse).toBe(0);
  for(const dt of [0,-1,NaN,Infinity])expect(()=>contactLoad(p,[player],dt)).toThrow();
 }finally{p.dispose();}
});
it('the optional substep observer leaves poses, velocities and sleep exactly unchanged and is off by default',()=>{
 const p=new PhysicsManager(),control=new PhysicsManager();try{
  expect(p.contactLoadDiagnosticsEnabled).toBe(false);p.contactLoadDiagnosticsEnabled=true;
  for(const world of [p,control]){
   const player=world.createPart(box(.6,.1,.4),{position:vec(0,.6,0),rotation:identity},32,0,'support',0,undefined,'player');player.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
   world.createPart(box(.4,.12,.3),{position:vec(0,2,0),rotation:identity},72,1,'beam');
  }
  const offSample=vi.spyOn(control.contactLoad,'sample');
  for(let i=0;i<360;i++){
   p.step();control.step();
   for(const [id,part]of p.parts){const b=control.parts.get(id)!;expect(part.body.translation()).toEqual(b.body.translation());expect(part.body.rotation()).toEqual(b.body.rotation());expect(part.body.linvel()).toEqual(b.body.linvel());expect(part.body.angvel()).toEqual(b.body.angvel());expect(part.body.isSleeping()).toBe(b.body.isSleeping());}
  }
  expect(offSample).not.toHaveBeenCalled();p.dispose();expect(p.contactLoad.snapshot.duration).toBe(0);
 }finally{control.dispose();if(p.parts.size)p.dispose();}
});
for(const substeps of [1,2])for(const shared of [false,true])it(`load shared with static support=${shared}, substeps=${substeps}: observes reaction without changing mass-based gameplay`,()=>{
 const p=new PhysicsManager();try{
  p.solverSubsteps=substeps;p.contactLoadDiagnosticsEnabled=true;
  const player=p.createPart(box(shared?.25:1.1,.1,.4),{position:vec(shared?-.7:0,.6,0),rotation:identity},32,0,'support',0,undefined,'player');player.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
  if(shared)p.world.createCollider(RAPIER.ColliderDesc.cuboid(.25,.1,.4).setTranslation(.7,.6,0));
  const beam=p.createPart(box(.95,.12,.3),{position:vec(0,.86,0),rotation:identity},72,1,'beam');
  // Keep this controlled bridge awake so contact impulses are fresh. No
  // force/pose change; the measurement's sleep case is tested separately.
  beam.body.setLinearDamping(.12);
  let sum=0,samples=0;
  for(let i=0;i<360;i++){if(i>=240)beam.body.wakeUp();p.step();if(i>=240){const load=p.contactLoad.snapshot;if(load.solvedContacts){sum+=load.equivalentMass;samples++;expect(load.duration).toBeCloseTo(CONFIG.dt,10);expect(load.complete).toBe(true);}}}
  console.log(JSON.stringify({shared,substeps,measured:sum/(samples||1),samples,estimated:pileLoad(p,[player]),beam:beam.body.translation()}));
  expect(p.numericFaults).toBe(0);expect(samples).toBeGreaterThan(10);
  if(shared){expect(sum/samples).toBeGreaterThan(20);expect(sum/samples).toBeLessThan(55);}else {expect(sum/samples).toBeGreaterThan(65);expect(sum/samples).toBeLessThan(80);}
 }finally{p.dispose();}
});
