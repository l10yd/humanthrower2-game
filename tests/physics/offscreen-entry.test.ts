import {beforeAll,expect,it} from 'vitest';
import {CONFIG,randomSeed} from '../../src/core/Config';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {RagdollFactory} from '../../src/physics/RagdollFactory';
import {ContinuousDropPlanner} from '../../src/npc/ContinuousDropPlanner';
import {box,vertices} from '../../src/slicing/ConvexClipper';
import {SkyDrops,type SkyKind} from '../../src/gameplay/SkyDrops';
import {PlayerController} from '../../src/player/PlayerController';
import {splitPart} from '../../src/slicing/Dismemberment';
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
it('sky supplies and hazards enter from above instead of landing or exploding on the player ceiling',()=>{
 for(const kind of ['weapon','medkit','bomb','saw','scrap'] as SkyKind[]){
  const p=new PhysicsManager(),c=new PlayerController(p,true),s=new SkyDrops();try{
   const item=s.spawn(kind,3,'axe');expect(item.position.y).toBeGreaterThan(17);expect(item.entered).toBe(false);
   let entered=false,bomb=false;
   for(let n=0;n<150;n++){
    const result=s.update(p,c,CONFIG.dt,false,n*CONFIG.dt);if(result.bombs.length){bomb=true;expect(result.bombs[0].y).toBeLessThan(1);}
    if(item.position.y<=16)entered=true;
    if(n<10){expect(result.bombs).toHaveLength(0);expect(item.landed).toBe(false);}
   }
   expect(entered).toBe(true);if(kind==='bomb')expect(bomb).toBe(true);
   expect(c.damage.parts.head).toBe(1);expect(c.damage.parts.chest).toBe(1);
  }finally{c.dispose();p.dispose();}
 }
});
it('sky entry grace expires, does not permit upward escape after entry, and never picks up above screen',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true),s=new SkyDrops();try{
  c.current=vec(0,15.8,0);const overhead=s.spawn('weapon',0,'axe');overhead.position.y=16.5;
  expect(s.update(p,c,CONFIG.dt).collected).toEqual([]);
  const stalled=s.spawn('medkit',3);stalled.landed=true;stalled.entryRemaining=0;expect(s.update(p,c,CONFIG.dt).medkits).toBe(0);expect(s.items.some(i=>i.id===stalled.id)).toBe(false);
  const escape=s.spawn('saw',3);escape.entered=true;expect(s.update(p,c,CONFIG.dt).bombs).toHaveLength(0);expect(s.items.some(i=>i.id===escape.id)).toBe(false);
  const invalid=s.spawn('scrap',3);invalid.position.y=NaN;s.update(p,c,CONFIG.dt);expect(s.items.some(i=>i.id===invalid.id)).toBe(false);
 }finally{c.dispose();p.dispose();}
});
it('cut fragments inherit only the remaining incoming grace instead of disappearing above the screen',()=>{
 const p=new PhysicsManager();try{
  const part=p.createPart(box(.4,.4,.3),{position:vec(0,18,0),rotation:identity},10,1,'chest');p.registerIncoming([part]);
  const result=splitPart(p,part.id,vec(0,18,0),vec(1,0,0))!;expect(result).not.toBeNull();expect(p.cullOutsideArena()).toBe(0);
  const ids=result.replacement!.survivorIds;expect(ids.every(id=>p.parts.has(id))).toBe(true);p.time=CONFIG.entry.timeout+.1;p.cullOutsideArena();expect(ids.every(id=>!p.parts.has(id))).toBe(true);
 }finally{p.dispose();}
});
it('player ragdoll cannot rise through NPC entry ceiling',()=>{
 const p=new PhysicsManager();try{
  const part=p.createPart(box(.2,.2,.2),{position:vec(0,15.5,0),rotation:identity},20,0,'chest',0,undefined,'player');part.body.setLinvel(vec(0,12,0),true);
  for(let i=0;i<30;i++)p.step();expect(part.body.worldCom().y).toBeLessThan(15.85);expect(p.numericFaults).toBe(0);
 }finally{p.dispose();}
});
