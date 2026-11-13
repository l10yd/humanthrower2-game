import { beforeAll,describe,it,expect } from 'vitest';
import type { PhysicalImpact } from '../../src/physics/ImpactEffects';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { box } from '../../src/slicing/ConvexClipper';
import { identity,axisAngle,vec } from '../../src/slicing/Math';
import { CONFIG } from '../../src/core/Config';
beforeAll(async()=>{await RAPIER.init();});
describe('observational physical impact effects',()=>{
 it('emits a real descending ground impact, not prolonged static weight or geometry-only overlaps',()=>{
  const p=new PhysicsManager();try{
   p.createPart(box(.2,.2,.2),{position:vec(0,4,0),rotation:identity},22,1,'chest');const events=[];
   for(let i=0;i<180;i++){p.step();events.push(...p.impacts.events);}
   expect(events.length).toBeGreaterThan(0);expect(events.length).toBeLessThanOrEqual(3);
   const impact=events[0];expect(impact.speed).toBeGreaterThan(CONFIG.impactFx.minSpeed);expect(impact.impulse).toBeGreaterThan(CONFIG.impactFx.minImpulse);
   expect(impact.otherNpcId).toBeNull();expect(impact.normal.y).toBeGreaterThan(.8);expect(impact.point.y).toBeLessThan(.25);
   const count=p.impacts.total;for(let i=0;i<300;i++)p.step();expect(p.impacts.total).toBe(count);
  }finally{p.dispose();}
 });
 it('deduplicates eleven limbs and both solver substeps, with bounded events per second',()=>{
  const p=new PhysicsManager();try{
   const f=new RagdollFactory(p,2,2),events:PhysicalImpact[]=[];
   for(let n=0;n<5;n++){f.spawn('normal',vec((n%3-1)*2,7+n,0),axisAngle(vec(0,0,1),n%2?.8:-.8),false);}
   for(let i=0;i<480;i++){p.step();expect(p.impacts.events.length).toBeLessThanOrEqual(CONFIG.impactFx.maxPerTick);events.push(...p.impacts.events);}
   expect(events.length).toBeGreaterThan(0);
   for(let i=0;i<events.length;i++){
    expect(events.filter(e=>e.time>=events[i].time&&e.time<events[i].time+1-1e-5).length).toBeLessThanOrEqual(CONFIG.impactFx.maxPerSecond);
    const same=events.filter(e=>e.npcId===events[i].npcId&&e.time>events[i].time+1e-5);if(same[0])expect(same[0].time-events[i].time).toBeGreaterThanOrEqual(CONFIG.impactFx.npcCooldown-.02);
   }
  }finally{p.dispose();}
 });
 it('sampling/events do not alter physics trajectories, and disabled observer does not emit',()=>{
  const states=[];
  for(const enabled of [true,false]){
   const p=new PhysicsManager();p.impacts.enabled=enabled;try{
    const f=new RagdollFactory(p);f.spawn('normal',vec(0,5,0),axisAngle(vec(0,0,1),.8),false);
    for(let i=0;i<300;i++)p.step();
    states.push([...p.parts.values()].map(p=>({p:{...p.body.translation()},q:{...p.body.rotation()},v:{...p.body.linvel()},w:{...p.body.angvel()},mass:p.body.mass()})));
    if(!enabled)expect(p.impacts.total).toBe(0);
   }finally{p.dispose();}
  }
  expect(states[0]).toEqual(states[1]);
 });
 it('ignores tangential sliding and same-family collision impulses',()=>{
  const p=new PhysicsManager();try{
   const a=p.createPart(box(.2,.2,.2),{position:vec(0,.2,0),rotation:identity},22,1,'chest');a.body.setLinvel(vec(8,0,0),true);
   let floor:RAPIER.Collider|undefined;p.world.forEachCollider(c=>{if(!c.parent()&&c.translation().y<0)floor=c;});expect(floor).toBeDefined();
   p.impacts.sample(p);p.impacts.observe(p,a.collider.handle,floor!.handle,10000,1/120,0);
   p.impacts.finish(0);expect(p.impacts.events.length).toBe(0);
   const b=p.createPart(box(.2,.2,.2),{position:vec(0,.6,0),rotation:identity},5,1,'head');b.body.setLinvel(vec(0,-10,0),true);
   p.impacts.sample(p);p.impacts.observe(p,a.collider.handle,b.collider.handle,10000,1/120,0);p.impacts.finish(0);expect(p.impacts.events.length).toBe(0);
  }finally{p.dispose();}
 });
});
