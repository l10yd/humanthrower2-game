import {beforeAll,expect,it} from 'vitest';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {probeIslandTranslation} from '../../src/player/RecoveryRouteProbe';
import {box} from '../../src/slicing/ConvexClipper';
import {vec,identity} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('route probe reports a dynamic barrier between free endpoints without changing world state',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.02,.02,.02),{position:vec(0,2,0),rotation:identity},2,1,'a'),b=p.createPart(box(.002,.3,.3),{position:vec(.3,2,0),rotation:identity},3,2,'b');b.body.sleep();
  const before=p.world.takeSnapshot(),probe=probeIslandTranslation(p,[a],vec(.7,0,0));
  expect(probe.blockers.some(v=>v.part===a.id&&v.other===b.id&&v.startDistance===null&&v.toi!==null&&v.toi>0&&v.toi<1)).toBe(true);expect(p.world.takeSnapshot()).toEqual(before);
 }finally{p.dispose();}
});
it('probe excludes group members and sensors while retaining fixed barriers',()=>{
 const p=new PhysicsManager();try{
  const a=p.createPart(box(.02,.02,.02),{position:vec(0,2,0),rotation:identity},2,1,'a'),b=p.createPart(box(.02,.02,.02),{position:vec(.3,2,0),rotation:identity},3,2,'b');b.collider.setSensor(true);
  const wall=p.world.createCollider(RAPIER.ColliderDesc.cuboid(.002,.3,.3).setTranslation(.5,2,0));
  const result=probeIslandTranslation(p,[a],vec(.7,0,0));expect(result.blockers.every(v=>v.other!==b.id)).toBe(true);expect(result.blockers.some(v=>v.other==='static')).toBe(true);
  p.world.removeCollider(wall,true);expect(probeIslandTranslation(p,[a,b],vec(.7,0,0)).blockers).toEqual([]);
 }finally{p.dispose();}
});
