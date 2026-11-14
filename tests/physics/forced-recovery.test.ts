import { beforeAll, describe, expect, it } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { CONFIG } from '../../src/core/Config';
import { ejectRecoveryDebris, uprightVolume } from '../../src/player/ForcedRecovery';
import { box } from '../../src/slicing/ConvexClipper';
import { identity, vec } from '../../src/slicing/Math';
import { shapeBounds } from '../../src/player/QueryBounds';

beforeAll(async()=>{await RAPIER.init();});
describe('bounded arcade recovery queries',()=>{
 it('rejects distant debris before narrow phase, including sleeping parts',()=>{
  const p=new PhysicsManager();try{
   for(let i=0;i<500;i++){
    const part=p.createPart(box(.08,.08,.08),{position:vec((i%10-4.5)*.7,5+Math.floor(i/10)*.1,0),rotation:identity},1,i+1,'fragment');
    part.body.sleep();
   }
   const before=p.world.takeSnapshot();
   const impulse=ejectRecoveryDebris(p,[uprightVolume(new RAPIER.Capsule(.67,.48),vec(0,1.2,0))],vec(0,1.2,0));
   expect(impulse).toBe(0);expect(p.world.takeSnapshot()).toEqual(before);
   expect(p.recoveryQueries.narrowTests).toBe(0);expect(p.recoveryQueries.candidateParts).toBe(0);
   expect(p.recoveryQueries.scannedParts).toBe(500);
  }finally{p.dispose();}
 });
 it('moves an entire jointed island without changing mass, joints or relative pose',()=>{
  const p=new PhysicsManager();try{
   const a=p.createPart(box(.2,.2,.2),{position:vec(0,1.2,0),rotation:identity},3,1,'a');
   const b=p.createPart(box(.2,.2,.2),{position:vec(.4,1.2,0),rotation:identity},4,1,'b');
   p.createJoint({a:a.id,b:b.id,anchorA:vec(.2,0,0),anchorB:vec(-.2,0,0),axis:vec(1,0,0),limits:[[-.2,.2]],hinge:true});
   const impulse=ejectRecoveryDebris(p,[uprightVolume(new RAPIER.Ball(.5),vec(0,1.2,0))],vec(0,1.2,0));
   expect(impulse).toBeCloseTo(7*CONFIG.forcedRecovery.ejectSpeed);
   expect(p.parts.size).toBe(2);expect(p.joints.size).toBe(1);
   expect(a.body.mass()+b.body.mass()).toBeCloseTo(7);
   expect(b.body.translation().x-a.body.translation().x).toBeCloseTo(.4);
   expect(a.collider.contactShape(new RAPIER.Ball(.5),vec(0,1.2,0),identity,0)?.distance??1).toBeGreaterThanOrEqual(CONFIG.forcedRecovery.clearance-1e-5);
  }finally{p.dispose();}
 });
 it('never translates only the dynamic subset of an island attached to fixed or kinematic tissue',()=>{
  for(const type of [RAPIER.RigidBodyType.Fixed,RAPIER.RigidBodyType.KinematicPositionBased]){
   const p=new PhysicsManager();try{
    const a=p.createPart(box(.1,.1,.1),{position:vec(0,2,0),rotation:identity},2,1,'dynamic');
    const b=p.createPart(box(.1,.1,.1),{position:vec(.2,2,0),rotation:identity},3,1,'anchor');b.body.setBodyType(type,true);
    p.createJoint({a:a.id,b:b.id,anchorA:vec(.1,0,0),anchorB:vec(-.1,0,0),axis:vec(1,0,0),hinge:true,limits:[[-.2,.2]]});
    const before=p.world.takeSnapshot();
    expect(ejectRecoveryDebris(p,[uprightVolume(new RAPIER.Ball(.5),vec(0,2,0))],vec(0,2,0))).toBe(0);
    expect(p.world.takeSnapshot()).toEqual(before);expect(p.parts.size).toBe(2);expect(p.joints.size).toBe(1);expect(p.recoveryQueries.blockedIslands).toBe(1);
   }finally{p.dispose();}
  }
 });
 it('rejects an occupied first destination and leaves sleeping neighbors untouched',()=>{
  const p=new PhysicsManager();try{
   const a=p.createPart(box(.2,.2,.2),{position:vec(0,1.2,0),rotation:identity},3,1,'a');
   const obstacle=p.createPart(box(.2,.2,.2),{position:vec(1,1.2,0),rotation:identity},4,2,'neighbor');obstacle.body.sleep();
   const before={...obstacle.body.translation()};
   const impulse=ejectRecoveryDebris(p,[uprightVolume(new RAPIER.Ball(.5),vec(0,1.2,0))],vec(0,1.2,0));
   expect(impulse).toBeGreaterThan(0);
   expect(a.collider.contactCollider(obstacle.collider,0)?.distance??1).toBeGreaterThanOrEqual(-.002);
   expect(obstacle.body.translation()).toEqual(before);expect(obstacle.body.isSleeping()).toBe(true);
   expect(a.body.linvel().x).toBe(-CONFIG.forcedRecovery.ejectSpeed);
  }finally{p.dispose();}
 });
 it('does not place successive translated islands inside one another',()=>{
  const p=new PhysicsManager();try{
   const a=p.createPart(box(.2,.2,.2),{position:vec(0,1.2,0),rotation:identity},3,1,'a');
   const b=p.createPart(box(.2,.2,.2),{position:vec(0,1.2,0),rotation:identity},4,3,'b');
   ejectRecoveryDebris(p,[uprightVolume(new RAPIER.Ball(.5),vec(0,1.2,0))],vec(0,1.2,0));
   expect(p.recoveryQueries.movedIslands).toBe(2);
   expect(a.collider.contactCollider(b.collider,0)?.distance??1).toBeGreaterThanOrEqual(-.002);
  }finally{p.dispose();}
 });
 it('reports no destination instead of overlapping a dynamic enclosure',()=>{
  const p=new PhysicsManager();try{
   const a=p.createPart(box(.2,.2,.2),{position:vec(0,1.2,0),rotation:identity},3,1,'a');
   const shell=p.createPart(box(4.49,7.99,1.19),{position:vec(0,8,0),rotation:identity},4,2,'enclosure');shell.body.sleep();
   const before={...a.body.translation()};
   expect(ejectRecoveryDebris(p,[uprightVolume(new RAPIER.Ball(.5),vec(0,1.2,0))],vec(0,1.2,0))).toBe(0);
   expect(p.recoveryQueries.blockedIslands).toBe(2);expect(a.body.translation()).toEqual(before);expect(shell.body.isSleeping()).toBe(true);
  }finally{p.dispose();}
 });
 it('never searches above the cup when the recovery corridor fills it',()=>{
  const p=new PhysicsManager();try{
   const part=p.createPart(box(.3,.3,.3),{position:vec(0,CONFIG.arena.height-.4,0),rotation:identity},3,1,'top-blocker');
   const before={...part.body.translation()};
   const impulse=ejectRecoveryDebris(p,[uprightVolume(new RAPIER.Cuboid(CONFIG.arena.width/2,CONFIG.arena.height/2,CONFIG.arena.depth/2),vec(0,CONFIG.arena.height/2,0))],vec(0,CONFIG.arena.height-.4,0));
   expect(impulse).toBe(0);expect(part.body.translation()).toEqual(before);
   expect(shapeBounds(part.collider.shape,part.body.translation(),part.body.rotation())!.max.y).toBeLessThan(CONFIG.arena.height);
  }finally{p.dispose();}
 });
});
