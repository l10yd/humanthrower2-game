import {beforeAll,expect,it} from 'vitest';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {planCoordinatedRecovery} from '../../src/player/CoordinatedRecovery';
import {uprightVolume} from '../../src/player/ForcedRecovery';
import {box} from '../../src/slicing/ConvexClipper';
import {vec,identity} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('plans a whole second island as a co-translation rather than tunneling through it',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.1,.1,.1),{position:vec(0,2,0),rotation:identity},2,1,'a');
  const b=p.createPart(box(.04,.1,.1),{position:vec(.3,2,0),rotation:identity},3,2,'b');b.body.sleep();
  const c=p.createPart(box(.04,.1,.1),{position:vec(.3,2.2,0),rotation:identity},4,2,'c');
  p.createJoint({a:b.id,b:c.id,anchorA:vec(0,.1,0),anchorB:vec(0,-.1,0),axis:vec(1,0,0),limits:[[-.2,.2]],hinge:true});
  const before=p.world.takeSnapshot(),plan=planCoordinatedRecovery(p,a,[uprightVolume(new RAPIER.Ball(.5),vec(0,2,0))],vec(0,2,0));
  expect(plan).not.toBeNull();expect(plan!.parts.map(p=>p.id)).toEqual([a.id,b.id,c.id]);expect(p.world.takeSnapshot()).toEqual(before);
  const relative=c.body.translation().y-b.body.translation().y;
  for(const part of plan!.parts)part.body.setTranslation({x:part.body.translation().x+plan!.delta.x,y:part.body.translation().y+plan!.delta.y,z:part.body.translation().z+plan!.delta.z},true);
  expect(p.parts.size).toBe(3);expect(p.joints.size).toBe(1);expect(c.body.translation().y-b.body.translation().y).toBeCloseTo(relative);expect(b.body.mass()).toBeCloseTo(3);
 }finally{p.dispose();}
});
it('static barriers veto the route instead of being added as movable neighbors',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.05,.05,.05),{position:vec(0,2,0),rotation:identity},2,1,'a');
  p.world.createCollider(RAPIER.ColliderDesc.cuboid(.002,.3,.3).setTranslation(.3,2,0));
  const plan=planCoordinatedRecovery(p,a,[uprightVolume(new RAPIER.Ball(.5),vec(0,2,0))],vec(0,2,0));
  expect(plan).not.toBeNull();expect(plan!.delta.x).toBeLessThan(0);
 }finally{p.dispose();}
});
it('reports deterministic work exhaustion rather than returning an unchecked route',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.05,.05,.05),{position:vec(0,2,0),rotation:identity},2,1,'a'),work={narrowTests:0,candidates:0,closureRounds:0,exhausted:false};
  const before=p.world.takeSnapshot();expect(planCoordinatedRecovery(p,a,[uprightVolume(new RAPIER.Ball(.5),vec(0,2,0))],vec(0,2,0),work,0)).toBeNull();expect(work.exhausted).toBe(true);expect(p.world.takeSnapshot()).toEqual(before);
  expect(()=>planCoordinatedRecovery(p,a,[],vec(),work,-1)).toThrow('work limit');
 }finally{p.dispose();}
});
it('closes a swept chain of separate islands without losing any member or changing relative pose',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.06,.06,.06),{position:vec(0,2,0),rotation:identity},2,1,'a'),b=p.createPart(box(.04,.06,.06),{position:vec(.22,2,0),rotation:identity},3,2,'b'),c=p.createPart(box(.04,.06,.06),{position:vec(.42,2,0),rotation:identity},4,3,'c');
  const target=[uprightVolume(new RAPIER.Ball(.5),vec(0,2,0))],first=planCoordinatedRecovery(p,a,target,vec(0,2,0)),second=planCoordinatedRecovery(p,a,target,vec(0,2,0));
  expect(first?.parts.map(p=>p.id)).toEqual([a.id,b.id,c.id]);expect(second?.delta).toEqual(first?.delta);expect(second?.parts.map(p=>p.id)).toEqual(first?.parts.map(p=>p.id));
 }finally{p.dispose();}
});
it('an oversized connected island cannot be squeezed into the cup by candidate projection',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.1,.1,.1),{position:vec(-4.45,2,0),rotation:identity},2,1,'a'),b=p.createPart(box(.1,.1,.1),{position:vec(4.45,2,0),rotation:identity},3,1,'b');
  p.createJoint({a:a.id,b:b.id,anchorA:vec(4.45,0,0),anchorB:vec(-4.45,0,0),axis:vec(1,0,0),hinge:true,limits:[[-.2,.2]]});
  const before=p.world.takeSnapshot();expect(planCoordinatedRecovery(p,a,[uprightVolume(new RAPIER.Ball(.5),vec(-4.45,2,0))],vec(-4.45,2,0))).toBeNull();expect(p.world.takeSnapshot()).toEqual(before);
 }finally{p.dispose();}
});
it('never moves a mixed fixed/dynamic connected island or deletes it to solve clearance',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.1,.1,.1),{position:vec(0,2,0),rotation:identity},2,1,'a'),b=p.createPart(box(.1,.1,.1),{position:vec(.2,2,0),rotation:identity},3,1,'b');b.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
  p.createJoint({a:a.id,b:b.id,anchorA:vec(.1,0,0),anchorB:vec(-.1,0,0),axis:vec(1,0,0),limits:[[-.2,.2]],hinge:true});
  const before=p.world.takeSnapshot();expect(planCoordinatedRecovery(p,a,[uprightVolume(new RAPIER.Ball(.5),vec(0,2,0))],vec(0,2,0))).toBeNull();expect(p.world.takeSnapshot()).toEqual(before);
 }finally{p.dispose();}
});
