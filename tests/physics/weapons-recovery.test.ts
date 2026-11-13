import { beforeAll,it,expect } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { SawController } from '../../src/gameplay/SawController';
import { WeaponController } from '../../src/gameplay/WeaponController';
import { GoreSystem } from '../../src/gameplay/GoreSystem';
import { box } from '../../src/slicing/ConvexClipper';
import { bitePart } from '../../src/slicing/Dismemberment';
import { identity,vec } from '../../src/slicing/Math';
const idle={axis:0,pressed:false,released:false,stomp:false},attack={...idle,saw:true};
beforeAll(async()=>{await RAPIER.init();});
function fixture(){const physics=new PhysicsManager(),player=new PlayerController(physics,true),saw=new SawController(physics,player,true),weapons=new WeaponController(physics,player,saw);return {physics,player,weapons,dispose(){player.dispose();physics.dispose();}};}
it('a body crossing one foot at get-up returns to a real grounded walking controller',()=>{
 const f=fixture();try{
  f.player.collider.setEnabled(false);f.player.ragdoll.knockDown(f.player.current,vec(),0);
  const obstacle=f.physics.createPart(box(.17,.12,.4),{position:vec(.16,.14,0),rotation:identity},10,1,'foot-obstacle');obstacle.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
  let now=0;for(let i=0;i<600&&f.player.ragdoll.down;i++){
   f.player.update({...idle,pressed:i%4===0},now,CONFIG.dt);f.physics.step();now+=CONFIG.dt;f.player.afterStep(now);
   if(f.player.ragdoll.down)expect(f.player.state).not.toBe('ACTIVE');
  }
  expect(f.player.ragdoll.down).toBe(false);expect(f.player.collider.isEnabled()).toBe(true);expect(f.player.qte.active).toBe(false);
  const x=f.player.current.x;
  for(let i=0;i<30;i++){f.player.update({...idle,axis:-1},now,CONFIG.dt);f.physics.step();now+=CONFIG.dt;f.player.afterStep(now);}
  expect(f.player.grounded).toBe(true);expect(f.player.current.x).toBeLessThan(x-.5);expect(f.player.vx).toBeLessThan(-3);expect(f.physics.numericFaults).toBe(0);
 }finally{f.dispose();}
});
for(const kind of ['axe','sword'] as const)it(`${kind} cuts nearby NPC tissue, never the player`,()=>{
 const f=fixture();try{
  f.weapons.select(kind);f.physics.createPart(box(.25,.3,.2),{position:vec(1.3,f.player.current.y+.16,0),rotation:identity},12,1,'target');
  f.weapons.update(attack,CONFIG.dt);expect(f.weapons.strikes).toBe(1);expect(f.weapons.cuts.length).toBeGreaterThan(0);expect(f.player.damage.alive).toBe(true);
  const count=f.physics.parts.size;f.weapons.update(attack,CONFIG.dt);expect(f.physics.parts.size).toBe(count);
 }finally{f.dispose();}
});
it('Svarl removes bitten mass immediately, leaving only the uneaten survivor and valid joints',()=>{
 const f=fixture();try{
  f.weapons.select('svarl');const part=f.physics.createPart(box(.5,.2,.2),{position:vec(.9,f.player.current.y+.16,0),rotation:identity},20,1,'meal');
  const neighbor=f.physics.createPart(box(.15,.15,.15),{position:vec(1.55,f.player.current.y+.16,0),rotation:identity},5,1,'neighbor');
  f.physics.createJoint({a:part.id,b:neighbor.id,anchorA:vec(.5,0,0),anchorB:vec(-.15,0,0),axis:vec(1,0,0),limits:[[-1,1]],hinge:true});
  const gore=new GoreSystem();gore.wounds.push({partId:part.id,point:vec(-.4,0,0),normal:vec(-1,0,0),life:4,next:0});
  f.weapons.update(attack,CONFIG.dt);expect(f.weapons.bites).toBe(1);expect(f.weapons.eatenMass).toBeGreaterThan(0);expect(f.physics.parts.has(part.id)).toBe(false);
  expect(f.physics.parts.size).toBe(2);gore.cut(f.weapons.cuts[0],f.physics);expect(gore.wounds.some(w=>w.partId===part.id)).toBe(false);
  const survivor=f.weapons.cuts[0].replacement!.survivorIds[0];const oldCollider=f.physics.parts.get(survivor)!.collider.handle;
  const final=bitePart(f.physics,survivor,vec(1,0,0),10)!;expect(final.replacement!.survivorIds).toEqual([]);expect(f.physics.parts.size).toBe(1);expect(f.physics.joints.size).toBe(0);expect(f.physics.world.colliders.contains(oldCollider)).toBe(false);
 }finally{f.dispose();}
});
it('grenades hit swept NPC geometry, explode, cut and leave no projectiles behind',()=>{
 const f=fixture();try{
  f.weapons.select('launcher');f.physics.createPart(box(.3,.3,.3),{position:vec(1.5,f.player.current.y+.16,0),rotation:identity},20,1,'blast-target');
  f.weapons.update(attack,CONFIG.dt);expect(f.weapons.shots).toBe(1);
  let cuts=0;for(let i=0;i<180;i++){f.weapons.update(idle,CONFIG.dt);cuts+=f.weapons.cuts.length;f.physics.step();}
  expect(cuts).toBeGreaterThan(0);expect(f.weapons.grenades).toHaveLength(0);expect(f.weapons.blasts).toHaveLength(0);expect(f.physics.numericFaults).toBe(0);
 }finally{f.dispose();}
});
it('walls block melee, biting and grenade trajectories; selecting weapons cancels actions',()=>{
 const f=fixture();try{
  f.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(.07,1,.9).setTranslation(.65,1.2,0));f.physics.createPart(box(.2,.2,.2),{position:vec(1.05,f.player.current.y+.16,0),rotation:identity},10,1,'behind-wall');
  for(const kind of ['axe','sword','svarl','launcher']){f.weapons.select(kind);f.weapons.update(attack,CONFIG.dt);expect(f.weapons.cuts).toHaveLength(0);}
  for(let i=0;i<20;i++)f.weapons.update(idle,CONFIG.dt);
  expect(f.weapons.strikes).toBe(0);expect(f.weapons.bites).toBe(0);expect(f.weapons.grenades).toHaveLength(0);
  f.weapons.select('sword');expect(f.weapons.active).toBe(false);expect(f.weapons.saw.active).toBe(false);
 }finally{f.dispose();}
});
for(const kind of ['axe','sword'] as const)for(const mode of ['chop','thrust'] as const)it(`${kind} ${mode} hits sleeping, lying bodies and wakes them`,()=>{
 const f=fixture();try{
  f.weapons.select(kind);f.weapons.saw.aim=vec(1.3,.22,0);
  const part=f.physics.createPart(box(.5,.16,.25),{position:vec(1.3,.18,0),rotation:identity},12,1,'sleeping-limb');part.body.sleep();
  f.weapons.update({...idle,saw:mode==='chop',thrust:mode==='thrust'},CONFIG.dt);
  expect(f.weapons.strikes).toBe(1);expect(f.weapons.attackMode).toBe(mode);expect(f.weapons.cuts.length).toBeGreaterThan(0);
  expect([...f.physics.parts.values()].every(p=>!p.body.isSleeping())).toBe(true);
 }finally{f.dispose();}
});
it('Svarl eats a sleeping body on the floor and cycle wraps around',()=>{
 const f=fixture();try{
  f.weapons.select('svarl');f.weapons.saw.aim=vec(1.2,.22,0);const part=f.physics.createPart(box(.4,.16,.3),{position:vec(1.2,.18,0),rotation:identity},12,1,'sleeping-meal');part.body.sleep();
  f.weapons.update(attack,CONFIG.dt);expect(f.weapons.bites).toBe(1);expect(f.weapons.eatenMass).toBeGreaterThan(0);f.weapons.cycle();expect(f.weapons.selected).toBe('rotor');f.weapons.cycle();expect(f.weapons.selected).toBe('svarlHead');f.weapons.cycle();expect(f.weapons.selected).toBe('saw');expect(f.weapons.active).toBe(false);
 }finally{f.dispose();}
});
it('multiple simultaneous grenade explosions never reuse removed collider handles',()=>{
 const f=fixture();try{
  f.physics.createPart(box(.3,.3,.3),{position:vec(1.5,1.4,0),rotation:identity},20,1,'double-blast-target');
  for(let i=0;i<2;i++)f.weapons.grenades.push({position:vec(1.1,1.4,0),previous:vec(1.1,1.4,0),velocity:vec(15,0,0),life:1});
  expect(()=>{for(let i=0;i<10;i++){f.weapons.update(idle,CONFIG.dt);f.physics.step();}}).not.toThrow();expect(f.weapons.grenades).toHaveLength(0);expect(f.physics.numericFaults).toBe(0);
 }finally{f.dispose();}
});
it('weapons cannot fire without retained hands',()=>{
 const f=fixture();try{
  f.player.damage.retain('forearm-1',0);f.player.damage.retain('forearm1',0);f.weapons.select('launcher');f.weapons.update(attack,CONFIG.dt);
  expect(f.weapons.unavailable).toBe(true);expect(f.weapons.shots).toBe(0);
 }finally{f.dispose();}
});
