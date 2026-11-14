import {beforeAll,expect,it} from 'vitest';
import {CONFIG,randomSeed} from '../../src/core/Config';
import {AcidSystem} from '../../src/gameplay/AcidSystem';
import {ChaosDirector} from '../../src/gameplay/ChaosDirector';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {PlayerController} from '../../src/player/PlayerController';
import {box} from '../../src/slicing/ConvexClipper';
import {identity,vec} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('automatic acid is eligible only for a large pile, remains seeded and warns before rising',()=>{
 const low=new ChaosDirector(()=>.999),high=new ChaosDirector(()=>.999);low.nextWeapon=high.nextWeapon=1e9;
 low.tick(9,CONFIG.acid.minimumParts-1);high.tick(9,CONFIG.acid.minimumParts);
 expect(low.current?.kind).not.toBe('acid');expect(high.current?.kind).toBe('acid');expect(high.current?.started).toBe(false);
 expect(AcidSystem.height(high.current,10)).toBe(0);high.tick(11,100);expect(high.events).toBe(1);
 expect(AcidSystem.height(high.current,13)).toBe(CONFIG.acid.maxHeight);expect(AcidSystem.height(high.current,19)).toBe(0);
 const a=new ChaosDirector(randomSeed(42)),b=new ChaosDirector(randomSeed(42));for(let t=0;t<100;t+=.1)expect(a.tick(t,150)).toEqual(b.tick(t,150));
});
it('yellow pool dissolves exposed sleeping debris, preserves high objects and wakes surviving connected support',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),a=new AcidSystem(),d=new ChaosDirector(()=>0);d.schedule('acid',0,0);d.tick(2,100);
 try{
  c.current=vec(3,6,0);c.body.setTranslation(c.current,true);
  const low=p.createPart(box(.2,.2,.2),{position:vec(0,.25,0),rotation:identity},5,1,'low');
  const high=p.createPart(box(.2,.2,.2),{position:vec(0,4,0),rotation:identity},5,1,'high');
  p.createJoint({a:low.id,b:high.id,anchorA:vec(),anchorB:vec(),axis:vec(1,0,0),limits:[[-.1,.1]],hinge:true});low.body.sleep();high.body.sleep();
  for(let t=2;t<6;t+=1/60)a.update(p,c,d.active,t);
  expect(p.parts.has(low.id)).toBe(false);expect(p.parts.has(high.id)).toBe(true);expect(high.body.isSleeping()).toBe(false);expect(p.joints.size).toBe(0);expect(a.dissolved).toBe(1);expect(a.removedMass).toBeCloseTo(5);
  expect(c.damage.alive).toBe(true);a.reset();expect(a.snapshot).toEqual({level:0,dissolved:0,removedMass:0,exposed:0});
 }finally{c.dispose();p.dispose();}
});
it('acid damages submerged player anatomy and cannot delete the live player articulation',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),a=new AcidSystem(),d=new ChaosDirector(()=>0);d.schedule('acid',0,0);d.tick(2,100);
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(vec(0,.4,0),vec(),0);const ids=c.ragdoll.parts.map(p=>p.id);
  for(let t=4;t<8;t+=1/60)a.update(p,c,d.active,t);
  expect(c.damage.parts.chest).toBeLessThan(1);expect(ids.every(id=>p.parts.has(id))).toBe(true);
  const before=c.damage.snapshot;a.update(p,c,d.active,8,false);expect(c.damage.snapshot).toEqual(before);
 }finally{c.dispose();p.dispose();}
});
