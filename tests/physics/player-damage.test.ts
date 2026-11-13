import { beforeAll,it,expect } from 'vitest';
import { PlayerDamage } from '../../src/player/PlayerDamage';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { clearRows } from '../../src/slicing/ClearTransaction';
import { legPose } from '../../src/player/LegPose';
import { massProperties } from '../../src/slicing/ConvexClipper';
import { CONFIG } from '../../src/core/Config';
import { axisAngle,add,sub,rotate,vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('damage map distinguishes intact, shortened, one and zero legs; vital cuts kill',()=>{
 const damage=new PlayerDamage();expect(damage.mobility).toBe('WALK');damage.retain('shin-1',.4);expect(damage.mobility).toBe('LIMP');expect(damage.alive).toBe(true);
 damage.retain('thigh-1',0);expect(damage.mobility).toBe('HOP');damage.retain('thigh1',0);expect(damage.mobility).toBe('CRAWL');expect(damage.alive).toBe(true);
 damage.parts.chest=0;expect(damage.alive).toBe(false);
});
it('bottom row removes lower legs but player remains alive and original damage never regenerates',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);try{
  c.prepareRowDeath(0);clearRows(p,[0],'solver',true);expect(c.resumeAfterCut(0)).toBe(true);expect(c.damage.mobility).toBe('LIMP');expect(c.damage.parts['shin-1']).toBeLessThan(.5);
  const tissue={...c.damage.tissue},polys=c.ragdoll.parts.map(part=>({limb:part.limb,volume:massProperties(part.poly).volume}));
  for(let i=0;i<120;i++){c.update({axis:1,pressed:false,released:false,stomp:false},i/60,1/60);p.step();c.afterStep((i+1)/60);}
  expect(c.damage.alive).toBe(true);expect(c.ragdoll.down).toBe(false);expect(c.collider.isEnabled()).toBe(true);expect(c.damage.tissue).toEqual(tissue);expect(p.numericFaults).toBe(0);
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),2);
  for(const part of c.ragdoll.parts)expect(massProperties(part.poly).volume).toBeCloseTo(polys.find(p=>p.limb===part.limb)!.volume,8);
 }finally{c.dispose();p.dispose();}
});
it('severing both legs leads to supported crawl, not resurrection of legs or a tall capsule',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),0);
  for(const j of [...p.joints.values()])if(p.parts.get(j.b)?.limb.startsWith('thigh'))p.removeJoint(j.id);
  c.resumeAfterCut(0);expect(c.damage.mobility).toBe('CRAWL');
  let x=0;for(let i=0;i<240;i++){c.update({axis:1,pressed:false,released:false,stomp:false},i/60,1/60);p.step();c.afterStep((i+1)/60);if(i===100)x=c.current.x;}
  expect(c.current.x).toBeGreaterThan(x);expect(c.collider.isEnabled()).toBe(false);expect(c.ragdoll.parts.every(p=>!p.limb.startsWith('thigh')&&!p.limb.startsWith('shin'))).toBe(true);
 }finally{c.dispose();p.dispose();}
});
it('prone QTE progresses through actual jointed poses on each press without changing part IDs',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),0);
  const origin=c.ragdoll.rootFromCenter(c.current),rotation=axisAngle(vec(0,0,1),Math.PI/2);
  for(const part of c.ragdoll.parts){part.body.setTranslation(add(vec(0,.6,0),rotate(sub(part.body.translation(),origin),rotation)),true);part.body.setRotation(rotation,true);}
  const roof=p.world.createCollider(RAPIER.ColliderDesc.cuboid(2,.1,.8).setTranslation(0,1.05,0));
  let now=0;const step=(pressed=false)=>{c.update({axis:0,pressed,released:false,stomp:false},now,1/60);p.step();now+=1/60;c.afterStep(now);};
  for(let i=0;i<100;i++)step();p.world.removeCollider(roof,true);
  const ids=c.ragdoll.parts.map(part=>part.id),startHead=c.ragdoll.parts.find(p=>p.limb==='head')!.body.translation().y;
  for(let i=0;i<30;i++){c.update({axis:0,pressed:false,released:false,stomp:false},(2+i)/60,1/60);p.step();c.afterStep((3+i)/60);}
  step(true);for(let i=0;i<4;i++)step();expect(c.ragdoll.poseProgress).toBeGreaterThan(0);expect(c.ragdoll.parts.map(part=>part.id)).toEqual(ids);
  expect(c.ragdoll.parts.find(p=>p.limb==='head')!.body.translation().y).toBeGreaterThan(startHead);
  for(let i=0;i<600&&c.ragdoll.down;i++)step(i%4===0);expect(c.ragdoll.down).toBe(false);expect(c.qte.escapes).toBe(1);
 }finally{c.dispose();p.dispose();}
});
it('QTE completes for damaged legs and stops GETTING_UP instead of hanging at 100%',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);try{
  c.prepareRowDeath(0);clearRows(p,[0],'solver',true);c.resumeAfterCut(0);
  for(let i=0;i<360;i++){c.update({axis:0,pressed:i%4===0,released:false,stomp:false},i/60,1/60);p.step();c.afterStep((i+1)/60);}
  expect(c.qte.escapes).toBe(1);expect(c.qte.active).toBe(false);expect(c.ragdoll.down).toBe(false);expect(c.collider.isEnabled()).toBe(true);expect(c.state).toBe('ACTIVE');
  const feet=c.ragdoll.standingParts.filter(p=>p.name.startsWith('thigh')||p.name.startsWith('shin'));
  const lowest=Math.min(...feet.flatMap(p=>p.poly.faces.flatMap(f=>f.vertices.map(v=>v.y+p.position.y+c.current.y))));
  expect(lowest).toBeLessThan(.12);
  expect(c.damage.alive).toBe(true);expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
});
it('independent foot support bends the knee on a higher ledge',()=>{
 const p=new PhysicsManager();try{
  p.world.createCollider(RAPIER.ColliderDesc.cuboid(.11,.15,.5).setTranslation(.14,.15,0));p.step();
  const center=vec(0,CONFIG.player.height/2+.015,0),left=legPose(p,center,-1,0,true),right=legPose(p,center,1,0,true);
  expect(right.foot.y-left.foot.y).toBeGreaterThan(.2);expect(Math.abs(right.shinAngle-right.thighAngle)).toBeGreaterThan(.1);
 }finally{p.dispose();}
});
