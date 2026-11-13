import { beforeAll, expect, it } from 'vitest';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { ContinuousDropPlanner } from '../../src/npc/ContinuousDropPlanner';
import { identity,vec } from '../../src/slicing/Math';
import { box } from '../../src/slicing/ConvexClipper';
import { pileLoad } from '../../src/player/PileLoad';
beforeAll(async()=>{await RAPIER.init();});
it('continuous demo ignores a blocked escape corridor but never materializes inside another body',()=>{
 const p=new PhysicsManager();try{
  const planner=new ContinuousDropPlanner(p,new RagdollFactory(p,2),()=>.5);
  p.world.createCollider(RAPIER.ColliderDesc.cuboid(4.5,.1,.5).setTranslation(0,1.1,0));p.step();
  const spec=planner.plan('normal',1.4,0,.9),first=planner.spawn(spec)!;expect(first.length).toBe(11);
  const second=planner.spawn(spec);expect(second).toBeNull();
  expect(p.parts.size).toBe(11);
  for(let n=0;n<180;n++)p.step();
  expect(planner.spawn(spec)).not.toBeNull();
 }finally{p.dispose();}
});
it('one full 11-part NPC contributes its total mass once despite multiple support contacts',()=>{
 const p=new PhysicsManager();try{
  const player=p.createPart(box(2,.1,.6),{position:vec(0,.1,0),rotation:identity},32,0,'support',0,undefined,'player');
  player.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
  new RagdollFactory(p).spawn('normal',vec(0,1.2,0),identity);
  for(let i=0;i<240;i++)p.step();expect(pileLoad(p,[player])).toBeCloseTo(72,0);
 }finally{p.dispose();}
});
it('support graph sums loaded mass once and excludes bodies merely suspended above the player',()=>{
 const p=new PhysicsManager();try{
  const player=p.createPart(box(.4,.1,.4),{position:vec(0,.1,0),rotation:identity},32,0,'chest',0,undefined,'player');
  for(let i=0;i<3;i++)p.createPart(box(.3,.1,.3),{position:vec(0,.3+i*.2,0),rotation:identity},72,i+1,'chest');
  p.createPart(box(.3,.1,.3),{position:vec(2,2,0),rotation:identity},120,99,'distant');
  for(let i=0;i<180;i++)p.step();expect(pileLoad(p,[player])).toBeCloseTo(216,0);
 }finally{p.dispose();}
});
