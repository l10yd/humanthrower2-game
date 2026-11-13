import { beforeAll,it,expect,vi } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { openRecoverySpace,recoveryEscapeAxis } from '../../src/player/RecoveryAssist';
import { box } from '../../src/slicing/ConvexClipper';
import { identity,vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('local recovery pressure pushes only nearby dynamic blockers, once per body, within one budget',()=>{
 const p=new PhysicsManager();try{
  const player=p.createPart(box(.2,.2,.2),{position:vec(0,2,0),rotation:identity},32,0,'chest',0,undefined,'player');
  const players=[player,p.createPart(box(.2,.2,.2),{position:vec(0,2.1,0),rotation:identity},16,0,'pelvis',0,undefined,'player')];
  const near=p.createPart(box(.2,.2,.2),{position:vec(.42,2,0),rotation:identity},20,1,'blocker'),far=p.createPart(box(.2,.2,.2),{position:vec(3,2,0),rotation:identity},20,2,'distant');
  const below=p.createPart(box(.2,.2,.2),{position:vec(0,1.58,0),rotation:identity},20,3,'support');
  const spies=[near,far,below].map(b=>vi.spyOn(b.body,'applyImpulse'));const ids=[...p.parts.keys()];
  const result=openRecoverySpace(p,players,1,CONFIG.dt);expect(result.parts).toEqual([near.id]);expect(result.impulse).toBeGreaterThan(0);expect(result.impulse).toBeLessThanOrEqual(CONFIG.recoveryAssist.pushForce*CONFIG.dt);
  expect(spies[0]).toHaveBeenCalledTimes(1);const force=spies[0].mock.calls[0][0];expect(force.x).toBeGreaterThan(0);expect(force.y).toBe(0);expect(spies[1]).not.toHaveBeenCalled();expect(spies[2]).not.toHaveBeenCalled();expect([...p.parts.keys()]).toEqual(ids);
 }finally{p.dispose();}
});
it('fast moving blockers and a static wall cannot receive a recovery shove into the wall',()=>{
 const p=new PhysicsManager();try{
  const player=p.createPart(box(.2,.2,.2),{position:vec(0,2,0),rotation:identity},32,0,'chest',0,undefined,'player');
  const near=p.createPart(box(.2,.2,.2),{position:vec(.42,2,0),rotation:identity},20,1,'blocker');const spy=vi.spyOn(near.body,'applyImpulse');
  near.body.setLinvel(vec(2,0,0),true);expect(openRecoverySpace(p,[player],1,CONFIG.dt).impulse).toBe(0);expect(spy).not.toHaveBeenCalled();near.body.setLinvel(vec(),true);
  p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,1,.5).setTranslation(.72,2,0));expect(openRecoverySpace(p,[player],1,CONFIG.dt).impulse).toBe(0);expect(spy).not.toHaveBeenCalled();
 }finally{p.dispose();}
});
it('automatic crawl reverses from a wall and stops in a fully closed static trap',()=>{
 const p=new PhysicsManager();try{
  const player=p.createPart(box(.2,.2,.2),{position:vec(0,2,0),rotation:identity},32,0,'pelvis',0,undefined,'player');
  p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,1,.5).setTranslation(.32,2,0));
  expect(recoveryEscapeAxis(p,[player],1)).toBe(-1);
  p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,1,.5).setTranslation(-.32,2,0));expect(recoveryEscapeAxis(p,[player],1)).toBe(0);
 }finally{p.dispose();}
});
