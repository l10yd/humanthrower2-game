import { beforeAll,it,expect,vi } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import {supportImpulseCapacity} from '../../src/player/SupportPressure';
import { PhysicsManager,RAPIER,type Part } from '../../src/physics/PhysicsManager';
import { PlayerController } from '../../src/player/PlayerController';
import { box } from '../../src/slicing/ConvexClipper';
import { identity,vec } from '../../src/slicing/Math';
const idle={axis:0,stomp:false,pressed:false,released:false};
beforeAll(async()=>{await RAPIER.init();});
it('per-tick COM pressure capacity is based on actual part mass, without deleting or accelerating microfragments arbitrarily',()=>{
 const p=new PhysicsManager();try{
  const small=p.createPart(box(.01,.01,.01),{position:vec(0,3,0),rotation:identity},2.5e-6,1,'micro');
  expect(supportImpulseCapacity(small)).toBeCloseTo(small.body.mass()*4,12);expect(p.parts.has(small.id)).toBe(true);
 }finally{p.dispose();}
});

/** Only KCC's collision report is scripted here: impulses go to actual dynamic
 * Rapier bodies. Real sweep/grounding is covered by kcc-support/kcc-pile tests. */
function fixture(count=2){
 const p=new PhysicsManager(),player=new PlayerController(p),parts:Part[]=[];
 for(let i=0;i<count;i++)parts.push(p.createPart(box(.2,.1,.3),{position:vec((i-(count-1)/2)*.3,.1,0),rotation:identity},50,i+1,'support'));
 const impulses=parts.map(part=>vi.spyOn(part.body,'applyImpulse'));
 vi.spyOn(player.controller,'computeColliderMovement').mockImplementation(()=>{});vi.spyOn(player.controller,'computedMovement').mockReturnValue(vec());
 vi.spyOn(player.controller,'computedGrounded').mockReturnValue(true);vi.spyOn(player.controller,'numComputedCollisions').mockReturnValue(count);
 vi.spyOn(player.controller,'computedCollision').mockImplementation(i=>({collider:parts[i].collider,normal1:vec(0,1,0),witness1:{...parts[i].body.worldCom()}} as RAPIER.CharacterCollision));
 const totals=()=>impulses.map(spy=>spy.mock.calls.reduce((sum,[impulse])=>sum-Math.min(0,impulse.y),0));
 return {p,player,parts,impulses,totals,dispose(){player.dispose();p.dispose();vi.restoreAllMocks();}};
}
it('standing weight and landing share a mass-aware input budget on a microscopic support',()=>{
 const f=fixture(1);try{
  const part=f.parts[0];part.collider.setMass(2.5e-6);part.body.recomputeMassPropertiesFromColliders();
  f.player.jump.vy=-24;f.player.grounded=false;f.player.update(idle,1,CONFIG.dt);
  const capacity=supportImpulseCapacity(part),total=f.totals()[0];
  expect(total).toBeGreaterThan(0);expect(total).toBeLessThanOrEqual(capacity+1e-12);expect(total/part.body.mass()).toBeLessThanOrEqual(4+1e-6);
  expect(Math.abs(part.body.linvel().y)).toBeLessThanOrEqual(4+1e-6);expect(part.body.isDynamic()).toBe(true);
 }finally{f.dispose();}
});
it('pressure limits only newly applied impulses and never clamps an existing fast support velocity',()=>{
 const f=fixture(1);try{
  const part=f.parts[0];part.collider.setMass(2.5e-6);part.body.recomputeMassPropertiesFromColliders();part.body.setLinvel(vec(0,-100,0),true);
  f.player.grounded=true;f.player.update(idle,1,CONFIG.dt);
  expect(part.body.linvel().y).toBeLessThanOrEqual(-100);expect(part.body.linvel().y).toBeGreaterThanOrEqual(-104.001);
  expect(f.totals()[0]).toBeLessThanOrEqual(supportImpulseCapacity(part)+1e-12);
 }finally{f.dispose();}
});
it('multiple supports share one capped landing budget, not one full cap each',()=>{
 const f=fixture(3);try{
  f.player.jump.vy=-24;f.player.grounded=false;f.player.update(idle,1,CONFIG.dt);
  const total=f.totals().reduce((s,n)=>s+n,0),weight=CONFIG.player.mass*9.81*CONFIG.dt;
  expect(total-weight).toBeLessThanOrEqual(16+1e-6);expect(total-weight).toBeGreaterThan(15.9);
 }finally{f.dispose();}
});
it('stomp shares one capped landing budget among supports and does not repeat it next tick',()=>{
 const f=fixture(3);try{
  f.player.jump.vy=-26;f.player.grounded=false;f.player.update({...idle,stomp:true},1,CONFIG.dt);
  const weight=CONFIG.player.mass*9.81*CONFIG.dt,total=f.totals().reduce((s,n)=>s+n,0);
  expect(total-weight).toBeLessThanOrEqual(32+1e-6);
  f.impulses.forEach(spy=>spy.mockClear());f.player.update({...idle,stomp:true},1+CONFIG.dt,CONFIG.dt);
  expect(f.totals().reduce((s,n)=>s+n,0)).toBeCloseTo(weight,5);
 }finally{f.dispose();}
});
it('a descending support does not receive an impact for the player merely falling alongside it',()=>{
 const f=fixture(1);try{
  f.parts[0].body.setLinvel(vec(0,-8,0),true);f.player.jump.vy=-2;f.player.grounded=false;f.player.update(idle,1,CONFIG.dt);
  expect(f.totals()[0]).toBeCloseTo(CONFIG.player.mass*9.81*CONFIG.dt,5);
 }finally{f.dispose();}
});
it('one support cannot receive the full stomp budget intended for several bodies',()=>{
 const f=fixture(1);try{
  f.player.jump.vy=-26;f.player.update({...idle,stomp:true},1,CONFIG.dt);
  expect(f.totals()[0]-CONFIG.player.mass*9.81*CONFIG.dt).toBeLessThanOrEqual(16+1e-6);
 }finally{f.dispose();}
});
it('stationary supports split standing weight without manufacturing a landing event or duplicate impulses',()=>{
 const f=fixture(3);try{
  f.player.grounded=true;f.player.update(idle,1,CONFIG.dt);
  const weight=CONFIG.player.mass*9.81*CONFIG.dt;for(const n of f.totals())expect(n).toBeCloseTo(weight/3,5);
  f.impulses.forEach(spy=>spy.mockClear());
  vi.mocked(f.player.controller.numComputedCollisions).mockReturnValue(3);vi.mocked(f.player.controller.computedCollision).mockImplementation(()=>({collider:f.parts[0].collider,normal1:vec(0,1,0),witness1:{...f.parts[0].body.worldCom()}} as RAPIER.CharacterCollision));
  f.player.update(idle,1+CONFIG.dt,CONFIG.dt);expect(f.totals()[0]).toBeCloseTo(weight,5);expect(f.totals().slice(1)).toEqual([0,0]);
 }finally{f.dispose();}
});
it('angular point velocity, not just COM speed, participates in landing pressure',()=>{
 const f=fixture(1);try{
  const witness=vec(.5,.1,0);f.parts[0].body.setAngvel(vec(0,0,-8),true);
  vi.mocked(f.player.controller.computedCollision).mockReturnValue({collider:f.parts[0].collider,normal1:vec(0,1,0),witness1:witness} as RAPIER.CharacterCollision);
  f.player.jump.vy=-2;f.player.update(idle,1,CONFIG.dt);expect(f.totals()[0]).toBeCloseTo(CONFIG.player.mass*9.81*CONFIG.dt,5);
 }finally{f.dispose();}
});
it('horizontal pressure shares one fixed-step budget across side contacts',()=>{
 const f=fixture(3);try{
  vi.mocked(f.player.controller.computedGrounded).mockReturnValue(false);
  vi.mocked(f.player.controller.computedCollision).mockImplementation(i=>({collider:f.parts[i].collider,normal1:vec(-1,0,0),witness1:{...f.parts[i].body.worldCom()}} as RAPIER.CharacterCollision));
  f.player.update({...idle,axis:1},1,CONFIG.dt);
  const total=f.impulses.reduce((sum,spy)=>sum+spy.mock.calls.reduce((s,[v])=>s+Math.abs(v.x),0),0);expect(total).toBeLessThanOrEqual(160*CONFIG.dt+1e-6);expect(f.totals()).toEqual([0,0,0]);
 }finally{f.dispose();}
});
it('an actual swept landing on dynamic debris obeys the total and per-body limits',()=>{
 const p=new PhysicsManager(),player=new PlayerController(p);
 try{
  const parts=[-.25,.25].map((x,i)=>p.createPart(box(.24,.1,.5),{position:vec(x,.1,0),rotation:identity},80,i+1,'debris'));
  for(let i=0;i<20;i++)p.step();
  const spies=parts.map(b=>vi.spyOn(b.body,'applyImpulse'));
  const center=vec(0,1.65,0);player.current={...center};player.previous={...center};player.body.setTranslation(center,true);player.body.setNextKinematicTranslation(center);player.jump.vy=-24;p.world.propagateModifiedBodyPositionsToColliders();
  // Real KCC sweep, not the scripted collision reports used above.
  for(let i=0;i<3&&!player.grounded;i++){player.update(idle,1+i*CONFIG.dt,CONFIG.dt);p.step();player.afterStep(1+(i+1)*CONFIG.dt);}
  expect(player.grounded).toBe(true);
  const landingCalls=spies.map(spy=>spy.mock.calls.filter((_,i)=>i%2===1));
  const total=landingCalls.reduce((s,calls)=>s+calls.reduce((n,[v])=>n-v.y,0),0);
  expect(total).toBeGreaterThan(0);expect(total).toBeLessThanOrEqual(CONFIG.playerContact.landingTotal+1e-6);
  expect(landingCalls.flat().every(([v])=>-v.y<=CONFIG.playerContact.landingPerBody+1e-6)).toBe(true);
  expect(p.numericFaults).toBe(0);
 }finally{player.dispose();p.dispose();vi.restoreAllMocks();}
});
it('airborne side contact transfers neither standing weight nor landing pressure',()=>{
 const f=fixture(2);try{
  vi.mocked(f.player.controller.computedGrounded).mockReturnValue(false);
  vi.mocked(f.player.controller.computedCollision).mockImplementation(i=>({collider:f.parts[i].collider,normal1:vec(1,0,0),witness1:{...f.parts[i].body.worldCom()}} as RAPIER.CharacterCollision));
  f.player.jump.vy=-2;f.player.update(idle,1,CONFIG.dt);expect(f.totals()).toEqual([0,0]);
 }finally{f.dispose();}
});
