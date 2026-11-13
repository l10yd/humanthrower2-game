import { beforeAll, describe, expect, it } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { CONFIG, NPC_TYPES } from '../../src/core/Config';
import { severJoint, splitPart } from '../../src/slicing/Dismemberment';
import { box, massProperties } from '../../src/slicing/ConvexClipper';
import { axisAngle, identity, pointVelocity, rotate, vec } from '../../src/slicing/Math';
import { SawController } from '../../src/gameplay/SawController';
import { PlayerController } from '../../src/player/PlayerController';
import { GoreSystem } from '../../src/gameplay/GoreSystem';
beforeAll(async()=>{await RAPIER.init();});
describe('saw dismemberment',()=>{
 it('severs all ten neck/limb/waist connectors, preserves every body and kg',()=>{
  const p=new PhysicsManager();try{
   const parts=new RagdollFactory(p,2,2).spawn('normal',vec(0,5,0),identity,false)!;
   const mass=parts.reduce((sum,b)=>sum+b.body.mass(),0);
   for(const j of [...p.joints.values()])expect(severJoint(p,j.id)?.wounds.length).toBe(2);
   expect(p.joints.size).toBe(0);expect(p.parts.size).toBe(11);
   expect(parts.reduce((sum,b)=>sum+b.body.mass(),0)).toBeCloseTo(mass,4);
   for(const part of parts){expect(part.poly.faces.some(f=>f.cap)).toBe(true);expect(p.connected(part.id,part.id)).toBe(true);}
   for(let i=0;i<240;i++)p.step();expect(p.numericFaults).toBe(0);
  }finally{p.dispose();}
 });
 it('splits a rotated moving torso into two capped physical halves retaining its velocity field',()=>{
  const p=new PhysicsManager();try{
   const rotation=axisAngle(vec(0,0,1),.6),old=p.createPart(box(.4,.5,.2),{position:vec(0,4,0),rotation},22,1,'chest');
   const v=vec(1,-2,.4),w=vec(.2,.3,.4);old.body.setLinvel(v,true);old.body.setAngvel(w,true);
   const com={...old.body.worldCom()},volume=massProperties(old.poly).volume,rho=old.density;
   const result=splitPart(p,old.id,vec(0,4,0),rotate(vec(0,1,0),rotation))!;
   expect(result.fragments).toBe(2);expect(p.parts.has(old.id)).toBe(false);expect(p.parts.size).toBe(2);
   expect(result.removedMass).toBeCloseTo(rho*.8*.4*CONFIG.saw.kerf,3);
   for(const part of p.parts.values()){
    expect(part.poly.faces.some(f=>f.cap)).toBe(true);expect(part.density).toBe(rho);
    expect(part.body.mass()).toBeCloseTo(massProperties(part.poly).volume*rho,3);
    const expected=pointVelocity(v,w,part.body.worldCom(),com),actual={...part.body.linvel()};
    expect(actual.x).toBeCloseTo(expected.x,5);expect(actual.y).toBeCloseTo(expected.y,5);
   }
   expect([...p.parts.values()].reduce((sum,b)=>sum+massProperties(b.poly).volume,0)).toBeLessThan(volume);
   for(let i=0;i<120;i++)p.step();expect(p.numericFaults).toBe(0);
  }finally{p.dispose();}
 });
 it('keeps neck, shoulders and waist attached to the correct torso halves until severed',()=>{
  const p=new PhysicsManager();try{
   const parts=new RagdollFactory(p).spawn('normal',vec(0,4,0),identity,false)!;
   const chest=parts.find(b=>b.limb==='chest')!,point={...chest.body.translation()};
   expect(splitPart(p,chest.id,point,vec(0,1,0))).not.toBeNull();expect(p.parts.size).toBe(12);expect(p.joints.size).toBe(10);
   const halves=[...p.parts.values()].filter(b=>b.limb==='chest');expect(p.connected(halves[0].id,halves[1].id)).toBe(false);
   for(const j of [...p.joints.values()])severJoint(p,j.id);expect(p.joints.size).toBe(0);expect(p.parts.size).toBe(12);
  }finally{p.dispose();}
 });
 it('rolls back staged bodies/joints if the second fragment allocation fails',()=>{
  const p=new PhysicsManager();try{
   const old=p.createPart(box(.4,.4,.2),{position:vec(0,3,0),rotation:identity},22,1,'chest');
   const create=p.createPart.bind(p);let calls=0;
   p.createPart=(...args)=>{if(++calls===2)throw Error('fixture allocation');return create(...args);};
   expect(()=>splitPart(p,old.id,vec(0,3,0),vec(0,1,0))).toThrow('fixture allocation');
   expect(p.parts.size).toBe(1);expect(p.parts.get(old.id)).toBe(old);
  }finally{p.dispose();}
 });
 it('never cuts the player or creates tiny repeated slivers',()=>{
  const p=new PhysicsManager();try{
   const player=p.createPart(box(.3,.3,.2),{position:vec(0,3,0),rotation:identity},32,0,'chest',0,undefined,'player');
   expect(splitPart(p,player.id,vec(0,3,0),vec(0,1,0))).toBeNull();
   const npc=p.createPart(box(.3,.3,.2),{position:vec(0,3,0),rotation:identity},22,1,'chest');
   expect(splitPart(p,npc.id,vec(0,3.29,0),vec(0,1,0))).toBeNull();expect(p.parts.size).toBe(2);
  }finally{p.dispose();}
 });
 it('requires enabled held blade contact and accumulates cut time, not key repeat',()=>{
  const p=new PhysicsManager(),player=new PlayerController(p);try{
   const saw=new SawController(p,player),pose=saw.pose();
   p.createPart(box(.25,.25,.2),{position:vec(.7,pose.base.y,0),rotation:identity},22,1,'chest');
   const input={axis:0,stomp:false,pressed:false,released:false,saw:true};
   for(let i=0;i<60;i++)saw.update(input,CONFIG.dt);expect(saw.cuts).toBe(0);
   saw.toggle();for(let i=0;i<10;i++)saw.update(input,CONFIG.dt);expect(saw.cuts).toBe(0);
   saw.update({...input,saw:false},CONFIG.dt);expect(saw.progress).toBe(0);
   for(let i=0;i<24;i++)saw.update(input,CONFIG.dt);expect(saw.cuts).toBe(1);expect(p.parts.size).toBe(2);
  }finally{player.dispose();p.dispose();}
 });
 it('does not cut through an intervening solid wall even when the body is inside blade reach',()=>{
  const p=new PhysicsManager(),player=new PlayerController(p);try{
   const saw=new SawController(p,player),pose=saw.pose();saw.toggle();
   const npc=p.createPart(box(.2,.25,.2),{position:vec(.9,pose.base.y,0),rotation:identity},22,1,'chest');
   const wall=p.world.createCollider(RAPIER.ColliderDesc.cuboid(.03,.5,.6).setTranslation(.5,pose.base.y,0));
   const input={axis:0,stomp:false,pressed:false,released:false,saw:true};
   for(let i=0;i<60;i++)saw.update(input,CONFIG.dt);expect(saw.cuts).toBe(0);expect(p.parts.has(npc.id)).toBe(true);
   p.world.removeCollider(wall,true);for(let i=0;i<24;i++)saw.update(input,CONFIG.dt);expect(saw.cuts).toBe(1);
  }finally{player.dispose();p.dispose();}
 });
 it('resets progress on a sharply changed cut plane but tolerates small aim jitter',()=>{
  const p=new PhysicsManager(),player=new PlayerController(p);try{
   const saw=new SawController(p,player),base=saw.pose().base;saw.toggle();
   p.createPart(box(.35,.4,.22),{position:vec(.75,base.y,0),rotation:identity},22,1,'chest');
   const input={axis:0,stomp:false,pressed:false,released:false,saw:true};
   for(let i=0;i<10;i++)saw.update(input,CONFIG.dt);expect(saw.progress).toBeGreaterThan(.8);
   saw.aim=vec(base.x+1,base.y+.6,0);saw.update(input,CONFIG.dt);
   expect(saw.cuts).toBe(0);expect(saw.progress).toBeLessThan(.1);
   for(let i=0;i<4;i++){saw.aim=vec(base.x+1,base.y+.60+i*.002,0);saw.update(input,CONFIG.dt);}
   expect(saw.progress).toBeGreaterThan(.15);expect(saw.cuttingPoint).not.toBeNull();
   saw.cancel();expect(saw.cuttingPoint).toBeNull();expect(saw.progress).toBe(0);
  }finally{player.dispose();p.dispose();}
 });
 it('locks the cut to the moving part local frame and preserves density on completion',()=>{
  const p=new PhysicsManager(),player=new PlayerController(p);try{
   const saw=new SawController(p,player),base=saw.pose().base;saw.toggle();
   const part=p.createPart(box(.3,.3,.2),{position:vec(.75,base.y,0),rotation:identity},22,1,'chest'),density=part.density;
   const input={axis:0,stomp:false,pressed:false,released:false,saw:true};
   for(let i=0;i<10;i++)saw.update(input,CONFIG.dt);
   part.body.setTranslation(vec(.85,base.y+.01,0),true);p.world.propagateModifiedBodyPositionsToColliders();
   saw.update(input,CONFIG.dt);expect(saw.progress).toBeGreaterThan(.4);
   for(let i=0;i<14;i++)saw.update(input,CONFIG.dt);expect(saw.cuts).toBe(1);
   for(const fragment of p.parts.values())expect(fragment.density).toBe(density);
  }finally{player.dispose();p.dispose();}
 });
 it('remaps existing bleeding wounds to the right survivor after a repeated cut and preserves remaining life',()=>{
  const p=new PhysicsManager();try{
   const old=p.createPart(box(.4,.5,.25),{position:vec(0,3,0),rotation:identity},22,1,'chest');
   const gore=new GoreSystem(),first=splitPart(p,old.id,vec(0,3,0),vec(0,1,0))!;gore.cut(first,p);gore.update(p,.5);
   const lower=p.parts.get(first.replacement!.survivorIds[0])!;
   const wound=gore.wounds.find(w=>w.partId===lower.id)!;wound.point.x=-.2;
   const remaining=wound.life,second=splitPart(p,lower.id,vec(0,2.8,0),vec(1,0,0))!;
   gore.cut(second,p);
   const remapped=gore.wounds.filter(w=>second.replacement!.survivorIds.includes(w.partId)&&w.life===remaining);
   expect(remapped.length).toBe(1);expect(remapped[0].point.x).toBe(-.2);expect(gore.wounds.some(w=>w.partId===lower.id)).toBe(false);
   expect(gore.wounds.length).toBe(4);
  }finally{p.dispose();}
 });
 it('drops an old wound consumed by the new kerf without resetting unrelated wound timers',()=>{
  const p=new PhysicsManager();try{
   const old=p.createPart(box(.4,.5,.25),{position:vec(0,3,0),rotation:identity},22,1,'chest');
   const gore=new GoreSystem(),first=splitPart(p,old.id,vec(0,3,0),vec(0,1,0))!;gore.cut(first,p);gore.update(p,.5);
   const lower=p.parts.get(first.replacement!.survivorIds[0])!,upper=first.replacement!.survivorIds[1];
   const upperWound=gore.wounds.find(w=>w.partId===upper)!,remaining=upperWound.life;
   // Original cap centroid x=0 lies inside a new x-oriented kerf.
   const second=splitPart(p,lower.id,vec(0,2.8,0),vec(1,0,0))!;gore.cut(second,p);
   expect(gore.wounds.length).toBe(3);expect(gore.wounds.find(w=>w.partId===upper)!.life).toBe(remaining);
   expect(gore.wounds.filter(w=>second.replacement!.survivorIds.includes(w.partId)).every(w=>w.life===CONFIG.gore.woundSeconds)).toBe(true);
  }finally{p.dispose();}
 });
 it('sprays blood only during valid saw contact, before severing, with bounded rate and no physics mutation',()=>{
  const p=new PhysicsManager(),player=new PlayerController(p);try{
   const saw=new SawController(p,player),gore=new GoreSystem(),base=saw.pose().base;saw.toggle();
   const part=p.createPart(box(.3,.3,.2),{position:vec(.75,base.y,0),rotation:identity},22,1,'chest');
   const input={axis:0,stomp:false,pressed:false,released:false,saw:true},mass=part.body.mass(),count=p.parts.size;
   for(let i=0;i<10;i++){saw.update(input,CONFIG.dt);gore.sawContact(saw.contact,CONFIG.dt);}
   expect(saw.cuts).toBe(0);expect(gore.emitted).toBeGreaterThan(0);expect(gore.wounds.length).toBe(0);
   expect(p.parts.size).toBe(count);expect(part.body.mass()).toBe(mass);
   saw.cancel();const emitted=gore.emitted;for(let i=0;i<30;i++)gore.sawContact(saw.contact,CONFIG.dt);expect(gore.emitted).toBe(emitted);
   const other=new GoreSystem();for(let i=0;i<20;i++)other.sawContact({point:base,normal:vec(0,1,0),partId:part.id,progress:.2},1/120);
   expect(other.emitted).toBe(emitted);
  }finally{player.dispose();p.dispose();}
 });
 it('bleeds from surviving wounds and bounds visual pools even under repeated cuts',()=>{
  const p=new PhysicsManager();try{
   const old=p.createPart(box(.3,.3,.2),{position:vec(0,1,0),rotation:identity},22,1,'chest');
   const result=splitPart(p,old.id,vec(0,1,0),vec(0,1,0))!,gore=new GoreSystem();
   for(let i=0;i<200;i++)gore.cut(result);
   expect(gore.drops.length).toBeLessThanOrEqual(CONFIG.gore.maxDrops);expect(gore.wounds.length).toBeLessThanOrEqual(CONFIG.gore.maxWounds);
   for(let i=0;i<600;i++)gore.update(p,CONFIG.dt);
   expect(gore.stains.length).toBeGreaterThan(0);expect(gore.stains.length).toBeLessThanOrEqual(CONFIG.gore.maxStains);expect(gore.wounds.length).toBe(0);
   gore.reset();expect(gore.snapshot).toEqual({mode:'full',drops:0,stains:0,bodyStains:0,wounds:0,emitted:0});
  }finally{p.dispose();}
 });
 it('all seven enlarged game NPCs have double mass, not volume-scaled eightfold; player stays 32kg',()=>{
  const p=new PhysicsManager();try{
   const factory=new RagdollFactory(p,CONFIG.spawn.npcScale,CONFIG.spawn.npcMassMultiplier);
   for(const type of Object.keys(NPC_TYPES) as (keyof typeof NPC_TYPES)[]){
    const parts=factory.spawn(type,vec(0,4,0),identity,false)!;
    expect(parts.reduce((sum,b)=>sum+b.body.mass(),0)).toBeCloseTo(NPC_TYPES[type].mass*2,2);
    for(const part of parts)p.removePart(part.id);
   }
   const player=factory.spawn('normal',vec(0,4,0),identity,false,{owner:'player',mass:32})!;
   expect(player.reduce((sum,b)=>sum+b.body.mass(),0)).toBeCloseTo(32,2);
  }finally{p.dispose();}
 });
});
