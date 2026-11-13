import { beforeAll,expect,it } from 'vitest';
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
it('sky pickups are collected by proximity, bombs hit floor and escaped drops expire',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),s=new SkyDrops();
 try{const pickup=s.spawn('weapon',0,'axe');pickup.position={...c.current};expect(s.update(p,c,CONFIG.dt).collected).toEqual(['axe']);
 const bomb=s.spawn('bomb',3);bomb.position=vec(3,.6,0);bomb.velocity=vec(0,-20,0);let exploded=false;
 for(let n=0;n<5;n++)if(s.update(p,c,CONFIG.dt).bombs.length)exploded=true;expect(exploded).toBe(true);
 const scrap=s.spawn('scrap',30);s.update(p,c,CONFIG.dt);expect(s.items.find(i=>i.id===scrap.id)).toBeUndefined();
 }finally{c.dispose();p.dispose();}
});
