import { beforeAll,expect,it,vi } from 'vitest';
import { WeaponSupplies } from '../../src/gameplay/WeaponSupplies';
import { CONFIG,randomSeed } from '../../src/core/Config';
import { ChaosDirector } from '../../src/gameplay/ChaosDirector';
import { WeaponInventory } from '../../src/gameplay/WeaponInventory';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { WeaponController } from '../../src/gameplay/WeaponController';
import { SawController } from '../../src/gameplay/SawController';
import { GoreSystem } from '../../src/gameplay/GoreSystem';
import { burstPlayer,DEATH_SECONDS } from '../../src/gameplay/DeathSequence';
import { SkyDrops } from '../../src/gameplay/SkyDrops';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { ContinuousDropPlanner } from '../../src/npc/ContinuousDropPlanner';
import { box,vertices } from '../../src/slicing/ConvexClipper';
import { identity,rotate,vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('inventory starts empty, wears out, refills and counts launcher ammunition',()=>{
 const i=new WeaponInventory();expect(i.kinds).toEqual([]);i.collect('axe');i.use('axe',30);expect(i.percent('axe')).toBe(70);i.collect('axe');expect(i.percent('axe')).toBe(100);
 expect(i.use('axe',100)).toBe(true);expect(i.kinds).toEqual([]);expect(i.broken).toBe(1);
 i.collect('launcher');for(let n=0;n<7;n++)expect(i.use('launcher',1)).toBe(false);expect(i.use('launcher',1)).toBe(true);
});
it('director warns for two seconds, never repeats consecutive events and is deterministic',()=>{
 const a=new ChaosDirector(randomSeed(42)),b=new ChaosDirector(randomSeed(42));const kinds:string[]=[];
 for(let t=0;t<180;t+=.1){const x=a.tick(t),y=b.tick(t);expect(x).toEqual(y);if(x.started){expect(t-x.started.warningAt).toBeGreaterThanOrEqual(2);kinds.push(x.started.kind);}}
 expect(kinds.length).toBeGreaterThan(5);for(let n=1;n<kinds.length;n++)expect(kinds[n]).not.toBe(kinds[n-1]);
});
it('limited weapons cannot be selected or activated before collecting; sustained use breaks them',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),w=new WeaponController(p,c,new SawController(p,c,true),true);
 try{w.select('rotor');w.toggle();w.update({axis:0,pressed:false,released:false,stomp:false,saw:true},CONFIG.dt);expect(w.enabled).toBe(false);expect(c.damage.headImmune).toBe(false);
 w.collect('rotor');w.inventory.stock.rotor=.01;w.update({axis:0,pressed:false,released:false,stomp:false,saw:true},CONFIG.dt);expect(w.lastBroken).toBe('rotor');expect(w.enabled).toBe(false);expect(c.flight).toBe(false);expect(c.damage.headImmune).toBe(false);
 }finally{c.dispose();p.dispose();}
});
it('zero-strength head bursts into debris, keeps remaining body and permanently disables recovery',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),g=new GoreSystem();
 try{c.damage.parts.head=0;burstPlayer(p,c,g,3);expect(DEATH_SECONDS).toBe(2);expect(c.ragdoll.dead).toBe(true);expect(c.collider.isEnabled()).toBe(false);
 expect([...p.parts.values()].filter(x=>x.limb==='head')).toHaveLength(4);expect([...p.parts.values()].filter(x=>x.limb==='head').every(x=>x.generation===1)).toBe(true);expect(g.emitted).toBeGreaterThan(0);
 for(let n=0;n<120;n++)p.step();expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
});
it('closed sixteen-row cup contains player flight, spawns below ceiling and removes escaped fragments',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),f=new RagdollFactory(p,2,2),d=new ContinuousDropPlanner(p,f,randomSeed(2));
 try{expect(CONFIG.arena.height).toBe(16);const plan=d.plan('normal',1,0,.9),parts=d.spawn(plan)!;expect(parts).not.toBeNull();
 for(const part of parts)for(const v of vertices(part.poly))expect(part.body.translation().y+rotate(v,part.body.rotation()).y).toBeLessThan(16);
 c.current=vec(-3,14,0);c.body.setTranslation(c.current,true);c.flight=true;
 for(let n=0;n<240;n++){c.update({axis:0,pressed:false,released:false,stomp:false},n*CONFIG.dt,CONFIG.dt);p.step();c.afterStep((n+1)*CONFIG.dt);}
 expect(c.current.y).toBeLessThan(15);expect(c.current.y).toBeGreaterThan(14);
 const escaped=p.createPart(box(.1,.1,.1),{position:vec(12,5,0),rotation:identity},1,900,'escaped');expect(p.cullOutsideArena()).toBeGreaterThan(0);expect(p.parts.has(escaped.id)).toBe(false);
 }finally{c.dispose();p.dispose();}
});
it('supplies start with a saw, cover all kinds and exclude weapons requiring missing arms',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);
 try{
  const a=new WeaponSupplies(randomSeed(17)),b=new WeaponSupplies(randomSeed(17));
  const first=Array.from({length:7},()=>a.next(c.damage));expect(first[0]).toBe('saw');expect(new Set(first).size).toBe(7);expect(first).toEqual(Array.from({length:7},()=>b.next(c.damage)));
  c.damage.retain('upperArm-1',0);c.damage.retain('upperArm1',0);
  for(let i=0;i<10;i++)expect(['rotor','svarlHead']).toContain(a.next(c.damage));
  c.damage.parts.head=0;expect(a.next(c.damage)).toBeNull();
 }finally{c.dispose();p.dispose();}
});
it('switching or collecting a launcher cannot reset the global shot cooldown',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),w=new WeaponController(p,c,new SawController(p,c,true),true);
 const attack={axis:0,pressed:false,released:false,stomp:false,saw:true};
 try{
  w.collect('launcher');w.update(attack,CONFIG.dt);expect(w.shots).toBe(1);
  w.collect('axe');w.select('launcher');w.update(attack,CONFIG.dt);expect(w.shots).toBe(1);
  w.collect('launcher');w.update(attack,CONFIG.dt);expect(w.shots).toBe(1);
  for(let i=0;i<50;i++)w.update(attack,CONFIG.dt);expect(w.shots).toBe(2);
 }finally{c.dispose();p.dispose();}
});
it('projectile impacts do not wear the unrelated melee weapon currently equipped',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),w=new WeaponController(p,c,new SawController(p,c,true),true);
 try{
  w.collect('axe');vi.spyOn(w,'tickProjectiles').mockImplementation(()=>{w.cuts=[{point:vec(),normal:vec(0,1,0),wounds:[],fragments:2,removedMass:1}];});
  w.update({axis:0,pressed:false,released:false,stomp:false,saw:true},CONFIG.dt);expect(w.inventory.stock.axe).toBeCloseTo(100-CONFIG.dt*1.5,6);
 }finally{c.dispose();p.dispose();}
});
it('sky drops still move during death without pickup, damage or knockdown',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),s=new SkyDrops();
 try{
  const item=s.spawn('weapon',0,'axe');item.position={...c.current};
  const hit=vi.spyOn(c.damage,'hit'),knock=vi.spyOn(c,'knockDownFromAttack');
  const saw=s.spawn('saw',0);saw.position=vec(0,c.current.y+.4,0);
  const outcome=s.update(p,c,CONFIG.dt,false);expect(outcome.collected).toEqual([]);expect(s.items.some(i=>i.id===item.id)).toBe(true);expect(hit).not.toHaveBeenCalled();expect(knock).not.toHaveBeenCalled();
 }finally{c.dispose();p.dispose();}
});
it('death preflights all chunks and rolls staged allocation back before removing the original',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),g=new GoreSystem();
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),0);c.damage.parts.head=0;
  const head=c.ragdoll.parts.find(x=>x.limb==='head')!,original=p.createPart.bind(p);let calls=0;
  vi.spyOn(p,'createPart').mockImplementation((...args)=>{if(++calls===2)throw Error('injected debris allocation');return original(...args);});
  expect(()=>burstPlayer(p,c,g,0)).toThrow('injected debris allocation');expect(p.parts.get(head.id)).toBe(head);expect(head.body.isValid()).toBe(true);expect(p.parts.size).toBe(11);
 }finally{c.dispose();p.dispose();}
});
it('a full physics world still finishes death with blood instead of allocating over budget',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),g=new GoreSystem();
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),0);
  while(p.parts.size<CONFIG.physics.hardLimit)p.createPart(box(.02,.02,.02),{position:vec(3,10,0),rotation:identity},.01,5000+p.parts.size,'budget');
  c.damage.parts.head=0;expect(()=>burstPlayer(p,c,g,0)).not.toThrow();expect(p.parts.size).toBeLessThanOrEqual(CONFIG.physics.hardLimit);expect(c.ragdoll.dead).toBe(true);expect(g.emitted).toBeGreaterThan(0);
 }finally{c.dispose();p.dispose();}
});
it('sky pickups are collected by proximity, bombs hit floor and escaped drops expire',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),s=new SkyDrops();
 try{const pickup=s.spawn('weapon',0,'axe');pickup.position={...c.current};expect(s.update(p,c,CONFIG.dt).collected).toEqual(['axe']);
 const bomb=s.spawn('bomb',3);bomb.position=vec(3,.6,0);bomb.velocity=vec(0,-20,0);let exploded=false;
 for(let n=0;n<5;n++)if(s.update(p,c,CONFIG.dt).bombs.length)exploded=true;expect(exploded).toBe(true);
 const scrap=s.spawn('scrap',30);s.update(p,c,CONFIG.dt);expect(s.items.find(i=>i.id===scrap.id)).toBeUndefined();
 }finally{c.dispose();p.dispose();}
});
