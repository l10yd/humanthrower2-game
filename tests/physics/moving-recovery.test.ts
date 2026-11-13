import { beforeAll,it,expect } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { box } from '../../src/slicing/ConvexClipper';
import { identity,vec,sub,length } from '../../src/slicing/Math';
const idle={axis:0,pressed:false,released:false,stomp:false};
beforeAll(async()=>{await RAPIER.init();});
for(const direction of [-1,1])it(`recovery on a moving dynamic support ${direction} returns to normal walking without deleting the support`,()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);let now=0;
 try{
  const support=p.createPart(box(2.8,.16,.8),{position:vec(0,.17,0),rotation:identity},180,1,'moving-support');support.collider.setFriction(.01);support.collider.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
  const center=vec(0,.34+CONFIG.player.height/2+.015,0);c.current={...center};c.previous={...center};c.body.setTranslation(center,true);c.body.setNextKinematicTranslation(center);p.world.propagateModifiedBodyPositionsToColliders();
  const step=(pressed=false)=>{p.snapshot();c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
  for(let i=0;i<20;i++)step();c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);
  let moved=0,maxHandoffDistance=0,lastDynamic=vec();
  for(let i=0;i<600&&c.ragdoll.down;i++){
   if(i%20===0)support.body.applyImpulse(vec(direction*20,0,0),true);
   lastDynamic={...c.ragdoll.center};step(i%4===0);moved=Math.max(moved,Math.abs(support.body.translation().x));
   if(!c.ragdoll.down)maxHandoffDistance=length(sub(c.current,lastDynamic));
  }
  console.log(JSON.stringify({direction,moved,time:now,handoff:maxHandoffDistance,position:c.current,state:c.state}));
  expect(moved).toBeGreaterThan(.05);expect(c.ragdoll.down).toBe(false);expect(c.collider.isEnabled()).toBe(true);expect(c.qte.active).toBe(false);expect(c.state).toBe('ACTIVE');expect(maxHandoffDistance).toBeLessThan(.25);
  const x=c.current.x;
  for(let i=0;i<30;i++){p.snapshot();c.update({...idle,axis:direction},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);}
  expect(direction*(c.current.x-x)).toBeGreaterThan(.5);expect(Math.abs(c.vx)).toBeGreaterThan(3);expect(p.parts.has(support.id)).toBe(true);expect(support.body.isDynamic()).toBe(true);expect(p.numericFaults).toBe(0);expect(p.maxSpeed).toBeLessThan(25);expect(p.maxAngularSpeed).toBeLessThan(35);
 }finally{c.dispose();p.dispose();}
});
