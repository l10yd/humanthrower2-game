import { beforeAll, describe, expect, it } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { SqueezeProbe } from '../../src/player/SqueezeProbe';
import { box } from '../../src/slicing/ConvexClipper';
import { identity, vec, axisAngle } from '../../src/slicing/Math';
import { recoveryPathClear } from '../../src/player/RecoverySweep';
beforeAll(async()=>{await RAPIER.init();});
describe('physical squeeze vs inactivity',()=>{
 it('idle and a wall with a free exit are never trapped',()=>{
  const p=new PhysicsManager(),player=new PlayerController(p);try{
   const probe=new SqueezeProbe(p,player);p.step();expect(probe.measure(0).trapped).toBe(false);
   p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,.7,.6).setTranslation(-.37,.7,0));p.step();
   const result=probe.measure(1);expect(result.right).toBe(true);expect(result.trapped).toBe(false);expect(probe.pressureSeconds(20)).toBe(0);
  }finally{player.dispose();p.dispose();}
 });
 it('requires a stable overhead NPC and physically blocked left/right/up, then bounded assistance',()=>{
  const p=new PhysicsManager(),player=new PlayerController(p);try{
   for(const x of [-.62,.62])p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,1.3,.6).setTranslation(x,1.3,0));
   const roof=p.createPart(box(.7,.1,.5),{position:vec(0,2.42,0),rotation:identity},22,1,'chest');roof.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
   p.step();const probe=new SqueezeProbe(p,player);const result=probe.measure(0);
   expect(result).toMatchObject({trapped:true,left:false,right:false,up:false,loaded:true});
   probe.measure(1.6);expect(probe.assist(1.6)).toBe(true);expect(probe.assist(2)).toBe(false);
   p.removePart(roof.id);p.step();expect(probe.measure(2).trapped).toBe(false);
  }finally{player.dispose();p.dispose();}
 });
 it('translational crawl keeps the limb rotation instead of falsely requiring upright motion',()=>{
  const p=new PhysicsManager();try{
   const rotation=axisAngle(vec(0,0,1),Math.PI/2);p.world.createCollider(RAPIER.ColliderDesc.cuboid(1,.05,.5).setTranslation(0,.4,0));p.step();
   const shape=new RAPIER.Cuboid(.04,.3,.04);
   expect(recoveryPathClear(p,{shape,from:vec(0,.2,0),rotation,to:vec(.25,.2,0),toRotation:rotation},()=>true)).toBe(true);
  }finally{p.dispose();}
 });
});
