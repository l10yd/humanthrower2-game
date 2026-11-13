import { beforeAll,expect,it } from 'vitest';
import { CONFIG,randomSeed } from '../../src/core/Config';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { PlayerController } from '../../src/player/PlayerController';
import { playerIntersectsRows } from '../../src/player/RowHazard';
import { clearRows } from '../../src/slicing/ClearTransaction';
import { box,massProperties,vertices } from '../../src/slicing/ConvexClipper';
import { add,axisAngle,identity,rotate,vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('row hazard includes the full capsule and detached-position limbs, not just center',()=>{
 const p=new PhysicsManager(),player=new PlayerController(p);try{
  player.current=vec(0,2.1,0);expect(playerIntersectsRows(player,[0])).toBe(true);
  player.current=vec(0,2.15,0);expect(playerIntersectsRows(player,[0])).toBe(false);
  player.collider.setEnabled(false);player.ragdoll.knockDown(vec(0,4,0),vec(),0);
  expect(playerIntersectsRows(player,[0])).toBe(false);
  player.ragdoll.parts.find(part=>part.limb==='forearm1')!.body.setTranslation(vec(0,.8,0),true);
  expect(playerIntersectsRows(player,[0])).toBe(true);
 }finally{player.dispose();p.dispose();}
});
it('row clipping keeps detached limbs outside the row and both halves across it',()=>{
 const p=new PhysicsManager();try{
  const arm=p.createPart(box(.15,.15,.15),{position:vec(1,2.5,0),rotation:identity},5,1,'forearm1');
  const leg=p.createPart(box(.2,1.5,.2),{position:vec(0,2,0),rotation:identity},20,1,'shin1');
  const original=massProperties(leg.poly).volume;
  const result=clearRows(p,[1],'solver');
  expect(p.parts.get(arm.id)).toBe(arm);expect(p.parts.has(leg.id)).toBe(false);
  expect(p.parts.size).toBe(3);expect(result.removedVolume).toBeCloseTo(original/3);
  expect([...p.parts.values()].filter(part=>part.limb==='shin1')).toHaveLength(2);
 }finally{p.dispose();}
});
for(const seed of [17,42,123])it(`arcade pile ${seed}: repeated row cuts retain all significant survivors without legacy pause`,()=>{
 const p=new PhysicsManager(),factory=new RagdollFactory(p,2,2),random=randomSeed(seed);let initial=0,removed=0;
 try{
  for(let i=0;i<8;i++){
   const parts=factory.spawn('normal',vec((i%3-1)*1.3,7,0),axisAngle(vec(0,0,1),(random()-.5)*2.6))!;
   expect(parts).not.toBeNull();initial+=parts.reduce((s,part)=>s+massProperties(part.poly).volume,0);
   for(let tick=0;tick<150;tick++)p.step();
  }
  for(let tick=0;tick<300;tick++)p.step();
  for(let cut=0;cut<5;cut++){
   const result=clearRows(p,[cut%2],'solver');removed+=result.removedVolume;
   for(const part of p.parts.values())for(const point of vertices(part.poly)){
    const y=add(part.body.translation(),rotate(point,part.body.rotation())).y;
    // Rapier float quaternions plus the clipper's 1e-5 plane snapping tolerance.
    expect(y<=cut%2+4e-5||y>=cut%2+1-4e-5).toBe(true);
   }
   expect([...p.parts.values()].reduce((s,part)=>s+massProperties(part.poly).volume,removed)).toBeCloseTo(initial,4);
   for(let tick=0;tick<180;tick++)p.step();
  }
  expect(p.numericFaults).toBe(0);expect(p.separationFault).toBeNull();expect(p.deferredContacts).toBe(0);
  expect(p.parts.size).toBeLessThanOrEqual(CONFIG.physics.hardLimit);
 }finally{p.dispose();}
},30000);
