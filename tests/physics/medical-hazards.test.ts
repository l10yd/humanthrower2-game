import {beforeAll,expect,it} from 'vitest';
import {CONFIG,randomSeed} from '../../src/core/Config';
import {PlayerDamage} from '../../src/player/PlayerDamage';
import {PlayerSurvival} from '../../src/gameplay/PlayerSurvival';
import {ChaosDirector} from '../../src/gameplay/ChaosDirector';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {PlayerController} from '../../src/player/PlayerController';
import {hazardDamage,hazardLimb,bombPlayer} from '../../src/gameplay/HazardDamage';
import {SkyDrops} from '../../src/gameplay/SkyDrops';
import {vec} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('medkit heals retained tissue only, never resurrects or regrows a severed limb',()=>{
 const d=new PlayerDamage(),s=new PlayerSurvival(d);d.parts.head=.3;d.parts.chest=.8;d.retain('forearm-1',0);d.retain('shin1',.4);d.parts.shin1=.15;s.air=1;
 expect(s.medkit()).toBe(true);expect(d.parts.head).toBeCloseTo(.55);expect(d.parts.chest).toBe(1);expect(d.parts['forearm-1']).toBe(0);expect(d.tissue['forearm-1']).toBe(0);expect(d.parts.shin1).toBeCloseTo(.4);expect(s.air).toBe(3);
 d.parts.head=0;const before=d.snapshot;expect(s.medkit()).toBe(false);expect(d.snapshot).toEqual(before);
});
it('medical schedule uses simulation time without altering seeded event/weapon draws',()=>{
 const a=new ChaosDirector(randomSeed(17)),b=new ChaosDirector(randomSeed(17));b.nextMedkit=1e9;let count=0;
 for(let i=0;i<600;i++){const now=i*.1,x=a.tick(now),y=b.tick(now);expect(x.supply).toBe(y.supply);expect(x.started).toEqual(y.started);if(x.medkit)count++;}
 expect(count).toBe(2);expect(a.medicalSupplies).toBe(2);expect(a.nextMedkit).toBe(62);
});
it('hazards honor head immunity and recovery grace, exact prone limbs map correctly',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);
 try{
 c.damage.headImmune=true;expect(hazardDamage(c,'head',12,30,0)).toBe(0);expect(c.ragdoll.down).toBe(false);
 c.protectedUntil=1;expect(hazardDamage(c,'chest',12,30,.5)).toBe(0);c.protectedUntil=-Infinity;
 c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),0);const arm=c.ragdoll.parts.find(x=>x.limb==='forearm1')!;
 expect(hazardLimb(p,c,arm.body.worldCom(),arm.collider)).toBe('forearm1');
 expect(hazardDamage(c,'forearm1',8,30,2)).toBeGreaterThan(0);expect(c.damage.parts.chest).toBe(1);
 }finally{c.dispose();p.dispose();}
});
it('bombs damage collider surfaces within range, but solid walls block blast damage',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);
 try{
 const point=vec(2,c.current.y,0);p.world.createCollider(RAPIER.ColliderDesc.cuboid(.12,3,1.1).setTranslation(1,3,0));p.world.propagateModifiedBodyPositionsToColliders();
 expect(bombPlayer(p,c,point,1)).toBe(0);expect(c.damage.parts.chest).toBe(1);
 expect(bombPlayer(p,c,vec(-1,c.current.y,0),1)).toBeGreaterThan(0);expect(c.ragdoll.down).toBe(true);
 }finally{c.dispose();p.dispose();}
});
it('a swept circular saw hitting the head respects head protection and reports anatomy',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),s=new SkyDrops();
 try{
  const head=c.ragdoll.visualParts.find(x=>x.name==='head')!,point=vec(c.current.x+head.position.x,c.current.y+head.position.y+.2,0);
  const item=s.spawn('saw',0);item.position=point;item.velocity=vec(0,-10,0);c.damage.headImmune=true;
  s.update(p,c,CONFIG.dt,true,0);expect(c.damage.parts.head).toBe(1);expect(c.damage.parts.chest).toBe(1);
  const other=s.spawn('saw',0);other.position=point;other.velocity=vec(0,-10,0);c.damage.headImmune=false;
  s.update(p,c,CONFIG.dt,true,1);expect(c.damage.parts.head).toBeLessThan(1);expect(c.damage.parts.chest).toBe(1);
 }finally{c.dispose();p.dispose();}
});
it('medical pickups are consumable once, do not freeze on the player, and cannot be collected during death',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),s=new SkyDrops();
 try{
 const m=s.spawn('medkit',0);m.position={...c.current};expect(s.update(p,c,CONFIG.dt).medkits).toBe(1);expect(s.medkits).toBe(1);expect(s.update(p,c,CONFIG.dt).medkits).toBe(0);
 const dead=s.spawn('medkit',0);dead.position={...c.current};expect(s.update(p,c,CONFIG.dt,false).medkits).toBe(0);expect(s.items).toHaveLength(1);
 }finally{c.dispose();p.dispose();}
});
