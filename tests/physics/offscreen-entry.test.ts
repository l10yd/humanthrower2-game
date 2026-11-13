import {beforeAll,expect,it} from 'vitest';
import {CONFIG,randomSeed} from '../../src/core/Config';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {RagdollFactory} from '../../src/physics/RagdollFactory';
import {ContinuousDropPlanner} from '../../src/npc/ContinuousDropPlanner';
import {box,vertices} from '../../src/slicing/ConvexClipper';
import {axisAngle,identity,rotate,vec} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('all body variants spawn wholly hidden above top and enter progressively with unchanged coordinates',()=>{
 const types=['normal','small','wide','tall','short','heavy','light'] as const;
 for(const type of types){const p=new PhysicsManager(),f=new RagdollFactory(p,2,2),d=new ContinuousDropPlanner(p,f,randomSeed(42));try{
  const parts=d.spawn(d.plan(type,1.1,0,.9))!;expect(parts).not.toBeNull();
  const bounds=()=>parts.flatMap(part=>vertices(part.poly).map(v=>part.body.translation().y+rotate(v,part.body.rotation()).y));
  expect(Math.min(...bounds())).toBeGreaterThan(CONFIG.arena.height+1);expect(p.cullOutsideArena()).toBe(0);
  let partial=false;
  for(let n=0;n<100;n++){p.step();p.cullOutsideArena();const b=bounds();if(Math.min(...b)<16&&Math.max(...b)>16)partial=true;}
  expect(partial).toBe(true);expect(parts.every(part=>p.parts.has(part.id))).toBe(true);expect(Math.max(...bounds())).toBeLessThan(16);
 }finally{p.dispose();}}
});
it('only registered incoming bodies receive bounded offscreen grace; escaped/stalled bodies are culled',()=>{
 const p=new PhysicsManager();try{
  const ordinary=p.createPart(box(.1,.1,.1),{position:vec(0,18,0),rotation:identity},1,1,'escape');expect(p.cullOutsideArena()).toBe(1);expect(p.parts.has(ordinary.id)).toBe(false);
  const stalled=p.createPart(box(.1,.1,.1),{position:vec(0,18,0),rotation:identity},1,2,'incoming');p.registerIncoming([stalled]);stalled.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);expect(p.cullOutsideArena()).toBe(0);
  p.time=CONFIG.entry.timeout+.1;expect(p.cullOutsideArena()).toBe(1);
  const entered=p.createPart(box(.1,.1,.1),{position:vec(0,17,0),rotation:identity},1,3,'incoming');p.registerIncoming([entered]);entered.body.setTranslation(vec(0,15,0),true);p.cullOutsideArena();entered.body.setTranslation(vec(0,18,0),true);expect(p.cullOutsideArena()).toBe(1);
 }finally{p.dispose();}
});
it('player ragdoll cannot rise through NPC entry ceiling',()=>{
 const p=new PhysicsManager();try{
  const part=p.createPart(box(.2,.2,.2),{position:vec(0,15.5,0),rotation:identity},20,0,'chest',0,undefined,'player');part.body.setLinvel(vec(0,12,0),true);
  for(let i=0;i<30;i++)p.step();expect(part.body.worldCom().y).toBeLessThan(15.85);expect(p.numericFaults).toBe(0);
 }finally{p.dispose();}
});
