import { beforeAll,it,expect,vi } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { PhysicsManager,RAPIER } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { SawController } from '../../src/gameplay/SawController';
import { clearRows } from '../../src/slicing/ClearTransaction';
import { box,vertices } from '../../src/slicing/ConvexClipper';
import { identity,vec } from '../../src/slicing/Math';
const idle={axis:0,stomp:false,pressed:false,released:false};
beforeAll(async()=>{await RAPIER.init();});
it('QTE progressively straightens the same bodies without teleporting, and then hands off',()=>{
 const p=new PhysicsManager(),player=new PlayerController(p,true);try{
  player.collider.setEnabled(false);player.ragdoll.knockDown(player.current,vec(),0);
  let now=0;const step=(pressed=false)=>{player.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;player.afterStep(now);};
  for(let i=0;i<30;i++)step();
  const ids=player.ragdoll.parts.map(p=>p.id),start={...player.current};
  for(let i=0;i<30&&!player.qte.ready;i++)step(true);
  expect(player.ragdoll.down).toBe(true);expect(player.qte.progress).toBe(1);expect(player.ragdoll.poseProgress).toBeLessThan(1);
  expect(player.ragdoll.parts.map(p=>p.id)).toEqual(ids);expect(Math.abs(player.current.x-start.x)).toBeLessThan(.1);
  for(let i=0;i<60&&player.ragdoll.down;i++)step();
  expect(player.ragdoll.down).toBe(false);expect(player.qte.escapes).toBe(1);
 }finally{player.dispose();p.dispose();}
});
it('saw grace suppresses pressure QTE and slowing, keeps normal jump and restores pressure after expiry',()=>{
 const p=new PhysicsManager(),player=new PlayerController(p,true);try{
  let now=0;const step=(input=idle)=>{player.update(input,now,CONFIG.dt);p.step();now+=CONFIG.dt;player.afterStep(now);};
  for(let i=0;i<20;i++)step();
  // Isolate the pressure gate from collision resolution; the real swept saw
  // fixture below covers incoming geometry and the browser covers the HUD.
  vi.spyOn(player as unknown as {pressure():boolean},'pressure').mockReturnValue(true);
  step();expect(player.underPressure).toBe(true);expect(player.qte.active).toBe(false);
  player.protectedUntil=now+CONFIG.sawGuard.playerGrace;
  const y=player.current.y;
  for(let i=0;i<12;i++)step({...idle,axis:1,pressed:i===0});
  expect(player.qte.active).toBe(false);expect(player.qte.progress).toBe(0);expect(player.underPressure).toBe(false);
  expect(player.current.y).toBeGreaterThan(y+.8);expect(player.vx).toBeGreaterThan(CONFIG.player.pressureSpeed);
  expect(player.ragdoll.knockdowns).toBe(0);
  player.protectedUntil=now;step();expect(player.underPressure).toBe(true);expect(player.qte.active).toBe(false);
 }finally{player.dispose();p.dispose();}
});
it('saw grace does not hide the recovery QTE for a player already ragdolled',()=>{
 const p=new PhysicsManager(),player=new PlayerController(p,true);try{
  player.collider.setEnabled(false);player.ragdoll.knockDown(player.current,vec(),0);player.protectedUntil=5;
  for(let i=0;i<30;i++){player.update(idle,i*CONFIG.dt,CONFIG.dt);p.step();player.afterStep((i+1)*CONFIG.dt);}
  player.update({...idle,pressed:true},.5,CONFIG.dt);expect(player.qte.active).toBe(true);expect(player.qte.progress).toBeGreaterThan(.1);
 }finally{player.dispose();p.dispose();}
});
function guardFixture(){const p=new PhysicsManager(),player=new PlayerController(p,true),saw=new SawController(p,player,true);saw.arcadeGuardEnabled=true;saw.aim=vec(player.current.x,10,0);return {p,player,saw,dispose(){player.dispose();p.dispose();}};}
it('only running upward saw splits a falling torso while retaining downward momentum',()=>{
 const f=guardFixture();try{
  const target=f.p.createPart(box(.6,.3,.3),{position:vec(0,3.1,0),rotation:identity},60,1,'chest');target.body.setLinvel(vec(0,-8,0),true);
  f.saw.update({...idle,saw:false},CONFIG.dt);expect(f.p.parts.has(target.id)).toBe(true);expect(f.saw.guard.interceptions).toBe(0);
  f.saw.aim=vec(10,f.player.current.y,0);f.saw.update({...idle,saw:true},CONFIG.dt);expect(f.p.parts.has(target.id)).toBe(true);
  f.saw.aim=vec(0,10,0);f.saw.update({...idle,saw:true},CONFIG.dt);
  expect(f.saw.guard.interceptions).toBe(1);expect(f.p.parts.has(target.id)).toBe(false);expect(f.p.parts.size).toBe(2);
  for(const part of f.p.parts.values()){expect(part.body.linvel().x).toBeCloseTo(0);expect(part.body.linvel().y).toBeCloseTo(-8);}
  expect(f.player.protectedUntil).toBeGreaterThan(1.5);
  f.player.update(idle,0,CONFIG.dt);expect(f.player.lastImpact).toBeNull();expect(f.player.ragdoll.down).toBe(false);
  for(let i=0;i<100;i++){f.player.update(idle,i*CONFIG.dt,CONFIG.dt);f.p.step();f.player.afterStep((i+1)*CONFIG.dt);expect(f.player.qte.active).toBe(false);expect(f.player.underPressure).toBe(false);}
  expect(f.player.ragdoll.knockdowns).toBe(0);expect(f.p.numericFaults).toBe(0);
 }finally{f.dispose();}
});
it('upward guard does not reach through a roof or kick unrelated detached scraps',()=>{
 const f=guardFixture();try{
  const target=f.p.createPart(box(.6,.3,.3),{position:vec(0,3.1,0),rotation:identity},60,1,'chest');target.body.setLinvel(vec(0,-8,0),true);
  const scrap=f.p.createPart(box(.1,.1,.1),{position:vec(3,2,0),rotation:identity},2,1,'oldScrap');
  const roof=f.p.world.createCollider(RAPIER.ColliderDesc.cuboid(2,.1,1).setTranslation(0,2.3,0));
  f.saw.update({...idle,saw:true},CONFIG.dt);expect(f.saw.guard.interceptions).toBe(0);
  f.p.world.removeCollider(roof,true);f.saw.update({...idle,saw:true},CONFIG.dt);expect(f.saw.guard.interceptions).toBe(1);expect(scrap.body.linvel()).toEqual(vec());
 }finally{f.dispose();}
});
it('running upward blade intercepts whole ragdoll and preserves its significant parts',()=>{
 const f=guardFixture();try{
  const parts=new RagdollFactory(f.p,2,2).spawn('normal',vec(0,5,0),identity,false)!;parts.forEach(part=>part.body.setLinvel(vec(0,-12,0),true));
  for(let i=0;i<120&&!f.saw.guard.interceptions;i++){f.saw.update({...idle,saw:true},CONFIG.dt);f.player.update(idle,i*CONFIG.dt,CONFIG.dt);f.p.step();f.player.afterStep((i+1)*CONFIG.dt);}
  expect(f.saw.guard.interceptions).toBeGreaterThan(0);expect(f.p.parts.size).toBeGreaterThanOrEqual(11);expect(f.p.joints.size).toBeLessThan(10);expect(f.player.ragdoll.knockdowns).toBe(0);
 }finally{f.dispose();}
});
it('row death cuts player into real capped survivors with no intact duplicate visual',()=>{
 const p=new PhysicsManager(),player=new PlayerController(p);try{
  player.prepareRowDeath(0);const emptyNpcClear=clearRows(p,[1],'solver',true);expect(emptyNpcClear.removedVolumeByRow[1]).toBe(0);
  expect(player.ragdoll.dead).toBe(true);expect(player.collider.isEnabled()).toBe(false);
  const survivors=[...p.parts.values()].filter(part=>part.owner==='player');expect(survivors.length).toBeGreaterThan(0);expect(survivors.some(part=>part.poly.faces.some(face=>face.cap))).toBe(true);
  for(const part of survivors)for(const point of vertices(part.poly))expect(point.y+part.body.translation().y<=1.00001||point.y+part.body.translation().y>=1.99999).toBe(true);
  for(let i=0;i<40;i++)p.step();expect(p.numericFaults).toBe(0);
 }finally{player.dispose();p.dispose();}
});
