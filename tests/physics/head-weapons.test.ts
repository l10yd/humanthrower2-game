import {beforeAll,it,expect,vi} from 'vitest';
import {CONFIG} from '../../src/core/Config';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {PlayerController} from '../../src/player/PlayerController';
import {PlayerSurvival} from '../../src/gameplay/PlayerSurvival';
import {SawController} from '../../src/gameplay/SawController';
import {WeaponController} from '../../src/gameplay/WeaponController';
import {GoreSystem} from '../../src/gameplay/GoreSystem';
import {clearRows} from '../../src/slicing/ClearTransaction';
import {playerIntersectsRows} from '../../src/player/RowHazard';
import {box} from '../../src/slicing/ConvexClipper';
import {identity,vec} from '../../src/slicing/Math';
const idle={axis:0,pressed:false,released:false,stomp:false},attack={...idle,saw:true};
beforeAll(async()=>{await RAPIER.init();});
function fixture(){const p=new PhysicsManager(),c=new PlayerController(p,true),w=new WeaponController(p,c,new SawController(p,c,true));return {p,c,w,dispose(){w.cancel();c.dispose();p.dispose();}};}
for(const kind of ['rotor','svarlHead'] as const)it(`${kind} protects only the head while held, without healing or leaking through cancel/release`,()=>{
 const f=fixture();try{
  f.c.damage.parts.head=.7;const tissue={...f.c.damage.tissue};f.w.select(kind);f.w.update(idle,CONFIG.dt);expect(f.c.damage.headImmune).toBe(false);
  f.w.update(attack,CONFIG.dt);expect(f.c.damage.headImmune).toBe(true);expect(f.c.damage.hit('head',100,100)).toBe(0);f.c.damage.retain('head',0);
  expect(f.c.damage.parts.head).toBe(.7);expect(f.c.damage.tissue).toEqual(tissue);expect(f.c.damage.hit('chest',8,22)).toBeGreaterThan(0);
  f.w.update(idle,CONFIG.dt);expect(f.c.damage.headImmune).toBe(false);expect(f.c.damage.hit('head',6,22)).toBeGreaterThan(0);
  f.w.update(attack,CONFIG.dt);f.w.cancel();expect(f.c.damage.headImmune).toBe(false);
  f.w.update(attack,CONFIG.dt);f.w.select('saw');expect(f.c.damage.headImmune).toBe(false);
  f.w.select(kind);f.w.update(attack,CONFIG.dt);f.w.toggle();expect(f.c.damage.headImmune).toBe(false);
 }finally{f.dispose();}
});
it('immune head hits consume neither survival cooldown nor knockdown and do not freeze movement',()=>{
 const f=fixture();try{
  f.w.select('rotor');f.w.update(attack,CONFIG.dt);
  const source=f.p.createPart(box(.1,.1,.1),{position:vec(3,3,0),rotation:identity},22,1,'impact');
  const impact={part:source,point:vec(0,2.3,0),velocity:vec(0,-8,0),speed:8,limb:'head' as const},s=new PlayerSurvival(f.c.damage);
  expect(s.impact(impact,1)).toBe(false);expect(s.hits).toBe(0);expect(s.impact({...impact,limb:'chest'},1)).toBe(true);
  const spy=vi.spyOn(f.c.ragdoll,'findImpact').mockReturnValue(impact);
  const x=f.c.current.x;f.c.update({...idle,axis:1},1,CONFIG.dt);f.p.step();f.c.afterStep(1+CONFIG.dt);
  expect(f.c.ragdoll.down).toBe(false);expect(f.c.lastImpact).toBeNull();expect(f.c.current.x).toBeGreaterThan(x);
  f.w.update(idle,CONFIG.dt);f.c.update(idle,2,CONFIG.dt);expect(f.c.ragdoll.down).toBe(true);spy.mockRestore();
 }finally{f.dispose();}
});
it('Svarl head consumes every overlapping NPC in one tick, without remnants or new bodies, leaving blood only',()=>{
 const f=fixture();try{
  f.w.select('svarlHead');const y=f.c.current.y+CONFIG.player.height*.42;
  const a=f.p.createPart(box(.6,.4,.4),{position:vec(.35,y,0),rotation:identity},100,1,'meal'),b=f.p.createPart(box(.15,.15,.15),{position:vec(-.6,y,0),rotation:identity},4,2,'second');b.body.sleep();
  const neighbor=f.p.createPart(box(.1,.1,.1),{position:vec(2,y,0),rotation:identity},5,1,'outside');
  f.p.createJoint({a:a.id,b:neighbor.id,anchorA:vec(.6,0,0),anchorB:vec(-1.05,0,0),axis:vec(1,0,0),hinge:true,limits:[[-1,1]]});
  const gore=new GoreSystem(),mass=a.body.mass()+b.body.mass(),handles=[a.collider.handle,b.collider.handle],create=vi.spyOn(f.p,'createPart');
  gore.wounds.push({partId:a.id,point:vec(),normal:vec(0,1,0),life:1,next:0});
  f.w.update(attack,CONFIG.dt);expect(f.w.bites).toBe(2);expect(f.w.eatenMass).toBeCloseTo(mass);expect(create).not.toHaveBeenCalled();
  expect(f.p.parts.size).toBe(1);expect(f.p.parts.has(neighbor.id)).toBe(true);expect(f.p.joints.size).toBe(0);
  for(const handle of handles)expect(f.p.world.colliders.contains(handle)).toBe(false);
  for(const cut of f.w.cuts){expect(cut.fragments).toBe(0);expect(cut.wounds).toEqual([]);expect(cut.replacement?.survivorIds).toEqual([]);gore.cut(cut,f.p);}
  expect(gore.emitted).toBeGreaterThan(0);expect(gore.wounds).toEqual([]);
  const next=f.p.createPart(box(.2,.2,.2),{position:vec(0,y,0),rotation:identity},10,3,'next-tick');f.w.update(attack,CONFIG.dt);expect(f.p.parts.has(next.id)).toBe(false);
 }finally{f.dispose();}
});
it('Svarl head catches fast swept food but ignores nearby noncrossing bodies, walls and inactive use',()=>{
 const f=fixture();try{
  f.w.select('svarlHead');const y=f.c.current.y+CONFIG.player.height*.42;
  const fast=f.p.createPart(box(.1,.1,.1),{position:vec(0,y+2,0),rotation:identity},5,1,'fast');fast.body.setLinvel(vec(0,-240,0),true);
  const nearby=f.p.createPart(box(.1,.1,.1),{position:vec(1.4,y,0),rotation:identity},5,2,'not-crossing');
  const behind=f.p.createPart(box(.1,.1,.1),{position:vec(.8,y,0),rotation:identity},5,3,'behind');f.p.world.createCollider(RAPIER.ColliderDesc.cuboid(.05,.7,.9).setTranslation(.5,y,0));
  f.w.update(idle,CONFIG.dt);expect(f.p.parts.size).toBe(3);f.w.update(attack,CONFIG.dt);
  expect(f.p.parts.has(fast.id)).toBe(false);expect(f.p.parts.has(nearby.id)).toBe(true);expect(f.p.parts.has(behind.id)).toBe(true);
 }finally{f.dispose();}
});
it('standing head-only rows exclude protected head but not chest geometry',()=>{
 const f=fixture();try{
  f.c.current=vec(0,2.15,0);f.w.select('rotor');f.w.update(attack,CONFIG.dt);
  expect(playerIntersectsRows(f.c,[3])).toBe(false);expect(playerIntersectsRows(f.c,[2])).toBe(true);
  f.w.update(idle,CONFIG.dt);expect(playerIntersectsRows(f.c,[3])).toBe(true);
 }finally{f.dispose();}
});
for(const kind of ['rotor','svarlHead'] as const)it(`${kind} preserves head tissue across head-only rows but never protects the chest`,()=>{
 const f=fixture();try{
  f.c.collider.setEnabled(false);f.c.ragdoll.knockDown(vec(0,2.15,0),vec(),0);f.w.select(kind);f.w.update(attack,CONFIG.dt);
  const head=f.c.ragdoll.parts.find(p=>p.limb==='head')!,poly=head.poly;
  expect(playerIntersectsRows(f.c,[3])).toBe(false);expect(playerIntersectsRows(f.c,[2])).toBe(true);
  clearRows(f.p,[3],'solver',true,['head']);f.c.ragdoll.syncDamage();
  expect(f.p.parts.get(head.id)?.poly).toBe(poly);expect(f.c.damage.tissue.head).toBe(1);
  f.w.update(idle,CONFIG.dt);expect(playerIntersectsRows(f.c,[3])).toBe(true);
  clearRows(f.p,[3],'solver',true);f.c.ragdoll.syncDamage();expect(f.c.damage.tissue.head).toBeLessThan(1);
 }finally{f.dispose();}
});
