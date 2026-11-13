import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { SpawnPlanner } from '../../src/npc/SpawnPlanner';
import { randomSeed } from '../../src/core/Config';
import { box, vertices } from '../../src/slicing/ConvexClipper';
import { NPC_TYPES } from '../../src/core/Config';
import { identity } from '../../src/slicing/Math';
import type { NpcType } from '../../src/core/Config';
import { vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
describe('bounded spawn planning and allocation',()=>{
 it('chooses a fixed warned column with an actual escape reserve and no early targeting',()=>{
  const p=new PhysicsManager();try{
   const f=new RagdollFactory(p),s=new SpawnPlanner(p,f,randomSeed(17));p.step();
   const plan=s.plan('normal',1.2,vec(0,.59,0),0,1.4,1);
   expect(plan).not.toBeNull();expect(Math.abs(plan!.x)).toBeGreaterThanOrEqual(1.3);expect(plan!.fireAt).toBe(1.4);
   expect(f.canSpawn(plan!.type,vec(plan!.x,12.5,0),{x:0,y:0,z:Math.sin(.6),w:Math.cos(.6)})).toBe(true);
   expect(p.parts.size).toBe(0);
  }finally{p.dispose();}
 });
 it('doubles all NPC hulls and joint plan positions but never the player, with safe spawn placement',()=>{
  const p=new PhysicsManager();try{
   const base=new RagdollFactory(p),large=new RagdollFactory(p,2);p.step();
   for(const type of Object.keys(NPC_TYPES) as NpcType[]){
    const a=base.build(type,vec(),identity),b=large.build(type,vec(),identity);
    a.parts.forEach((part,i)=>{expect(b.parts[i].position.y).toBeCloseTo(part.position.y*2);
      const av=vertices(part.poly),bv=vertices(b.parts[i].poly);av.forEach((v,j)=>expect(bv[j]).toEqual(vec(v.x*2,v.y*2,v.z*2)));
    });
   }
   const options={owner:'player' as const,height:1.15,width:.56,mass:32};
   expect(large.build('normal',vec(),identity,options)).toEqual(base.build('normal',vec(),identity,options));
   const planner=new SpawnPlanner(p,large,randomSeed(17)),plan=planner.plan('normal',1.2,vec(0,.59,0),0,.9,1);
   expect(plan).not.toBeNull();expect(large.canSpawn('normal',vec(plan!.x,12.5,0),{x:0,y:0,z:Math.sin(.6),w:Math.cos(.6)})).toBe(true);
  }finally{p.dispose();}
 });
 it('blocked escape postpones instead of spawning through the pile',()=>{
  const p=new PhysicsManager();try{
   const f=new RagdollFactory(p),s=new SpawnPlanner(p,f,randomSeed(17));
   p.world.createCollider(RAPIER.ColliderDesc.cuboid(4.5,.1,.5).setTranslation(0,1.1,0));p.step();
   expect(s.plan('normal',1.2,vec(0,.59,0),0,1,1)).toBeNull();expect(p.parts.size).toBe(0);
  }finally{p.dispose();}
 });
 it('accepts a tiny supporting-floor penetration but not a genuinely closed corridor',()=>{
  const p=new PhysicsManager();try{
   const f=new RagdollFactory(p),s=new SpawnPlanner(p,f,randomSeed(17));p.step();
   expect(s.plan('normal',1.2,vec(0,.57,0),0,.9,1)).not.toBeNull();
   for(const x of [-.38,.38])p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,1,.5).setTranslation(x,1,0));p.step();
   expect(s.plan('normal',1.2,vec(0,.59,0),0,.9,1)).toBeNull();expect(s.lastBlock).toBe('route');
  }finally{p.dispose();}
 });
 it('finds a supported route over a low obstacle but rejects a solid tall wall',()=>{
  const p=new PhysicsManager();try{
   const f=new RagdollFactory(p),s=new SpawnPlanner(p,f,randomSeed(17));
   const obstacle=p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,.12,.6).setTranslation(.65,.12,0));p.step();
   const routes=(s as unknown as {safeRoutes(player:ReturnType<typeof vec>):ReturnType<typeof vec>[]}).safeRoutes(vec(0,1.165,0));
   expect(routes.some(r=>r.x>=1.3)).toBe(true);
   p.world.removeCollider(obstacle,true);p.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,1.5,.6).setTranslation(.65,1.5,0));p.step();
   const closed=(s as unknown as {safeRoutes(player:ReturnType<typeof vec>):ReturnType<typeof vec>[]}).safeRoutes(vec(0,1.165,0));
   expect(closed.some(r=>r.x>=1.3)).toBe(false);
  }finally{p.dispose();}
 });
 it('greybox box query shapes match their actual convex hull contact distances for every type',()=>{
  const p=new PhysicsManager();try{
   const f=new RagdollFactory(p,2),obstacle=p.world.createCollider(RAPIER.ColliderDesc.cuboid(.4,.4,.4).setTranslation(.3,3,0));
   for(const type of Object.keys(NPC_TYPES) as NpcType[])for(const angle of [0,.8,1.4]){
    const rotation={x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)};
    for(const part of f.build(type,vec(0,3,0),rotation).parts){
     const convex=p.prepareCollider(part.poly,1).shape,a=obstacle.contactShape(convex,part.position,rotation,2),b=obstacle.contactShape(part.queryShape,part.position,rotation,2);
     expect(!!a).toBe(!!b);if(a&&b)expect(b.distance).toBeCloseTo(a.distance,4);
    }
   }
  }finally{p.dispose();}
 });
 it('targeted doubled drops clamp their warned X to a real wall-safe hull envelope',()=>{
  const p=new PhysicsManager();try{
   const f=new RagdollFactory(p,2),rotation={x:0,y:0,z:Math.sin(.7),w:Math.cos(.7)};
   const x=f.fitSpawnX('normal',4.1,rotation)!;expect(x).toBeLessThan(4.1);
   expect(f.canSpawn('normal',vec(x,12.5,0),rotation)).toBe(true);
   expect(f.canSpawn('normal',vec(4.1,12.5,0),rotation)).toBe(false);
  }finally{p.dispose();}
 });
 it('failed ragdoll creation rolls back all parts and joints',()=>{
  const p=new PhysicsManager();try{
   const f=new RagdollFactory(p),create=p.createPart.bind(p);let calls=0;
   vi.spyOn(p,'createPart').mockImplementation((...args)=>{if(++calls===4)throw Error('injected spawn failure');return create(...args);});
   expect(()=>f.spawn('normal',vec(0,12.5,0),{x:0,y:0,z:0,w:1})).toThrow('injected spawn failure');
   expect(p.parts.size).toBe(0);expect(p.joints.size).toBe(0);expect(p.world.bodies.len()).toBe(0);
  }finally{p.dispose();}
 });
});
