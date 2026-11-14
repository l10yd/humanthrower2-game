import {beforeAll,expect,it} from 'vitest';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {islandTranslationClear} from '../../src/player/IslandTranslation';
import {box} from '../../src/slicing/ConvexClipper';
import {identity,vec} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('rejects a thin dynamic obstacle between free endpoints without moving it',()=>{
 const p=new PhysicsManager();try{
  const obstacle=p.createPart(box(.002,.2,.2),{position:vec(.5,2,0),rotation:identity},1,2,'obstacle');obstacle.body.sleep();const before=p.world.takeSnapshot();
  expect(islandTranslationClear(p,new RAPIER.Ball(.01),vec(0,2,0),identity,vec(1,0,0),()=>true)).toBe(false);expect(p.world.takeSnapshot()).toEqual(before);
 }finally{p.dispose();}
});
it('initial overlap can exit away but cannot authorize tunneling to the opposite side',()=>{
 const p=new PhysicsManager();try{
  p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,.5,.5).setTranslation(0,2,0));
  expect(islandTranslationClear(p,new RAPIER.Ball(.1),vec(-.195,2,0),identity,vec(.5,0,0),()=>true)).toBe(false);
  expect(islandTranslationClear(p,new RAPIER.Ball(.1),vec(-.195,2,0),identity,vec(-.2,0,0),()=>true)).toBe(true);
 }finally{p.dispose();}
});
it('diagnostic rejects a fixed route across a barrier instead of treating endpoint clearance as path safety',()=>{
 const p=new PhysicsManager();try{
  p.world.createCollider(RAPIER.ColliderDesc.cuboid(.002,.3,.3).setTranslation(.3,2,0));
  expect(islandTranslationClear(p,new RAPIER.Cuboid(.02,.02,.02),vec(0,2,0),identity,vec(.6,0,0),()=>true)).toBe(false);
  expect(islandTranslationClear(p,new RAPIER.Cuboid(.02,.02,.02),vec(0,2,0),identity,vec(-.6,0,0),()=>true)).toBe(true);
 }finally{p.dispose();}
});
