import {beforeAll,it,expect} from 'vitest';
import {CONFIG,NPC_DISPLAY_MASSES,NPC_TYPES,type NpcType} from '../../src/core/Config';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {RagdollFactory} from '../../src/physics/RagdollFactory';
import {gameplayMass} from '../../src/player/GameplayMass';
import {pileLoad} from '../../src/player/PileLoad';
import {PlayerController} from '../../src/player/PlayerController';
import {bitePart,splitPart} from '../../src/slicing/Dismemberment';
import {clearRows} from '../../src/slicing/ClearTransaction';
import {box} from '../../src/slicing/ConvexClipper';
import {identity,vec} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('NPC gameplay kilograms are human-scale but physical masses and state are unchanged',()=>{
 for(const type of Object.keys(NPC_TYPES) as NpcType[]){
  const p=new PhysicsManager(),f=new RagdollFactory(p,2,2);try{
   const parts=f.spawn(type,vec(0,5,0),identity,false)!,before=p.world.takeSnapshot();
   expect(parts.reduce((s,b)=>s+b.body.mass(),0)).toBeCloseTo(NPC_TYPES[type].mass*2,3);
   expect(parts.reduce((s,b)=>s+gameplayMass(b),0)).toBeCloseTo(NPC_DISPLAY_MASSES[type],3);
   expect(p.world.takeSnapshot()).toEqual(before);
  }finally{p.dispose();}
 }
});
it('gameplay labels never change a falling NPC trajectory or native snapshot',()=>{
 const a=new PhysicsManager(),b=new PhysicsManager();try{
  new RagdollFactory(a,2,2).spawn('heavy',vec(0,7,0),identity,false);
  const original=new RagdollFactory(b,2,2).spawn('heavy',vec(0,7,0),identity,false)!;for(const part of original)delete part.gameplayMassScale;
  for(let i=0;i<120;i++){a.step();b.step();if(i%20===0)expect(a.world.takeSnapshot()).toEqual(b.world.takeSnapshot());}
 }finally{a.dispose();b.dispose();}
});
it('gameplay mass scale survives saw, bite and rows proportionally to retained physical mass',()=>{
 for(const mode of ['split','bite','rows']){
  const p=new PhysicsManager(),f=new RagdollFactory(p,2,2);try{
   const parts=f.spawn('normal',vec(0,5,0),identity,false)!,target=parts.find(p=>p.limb==='chest')!,scale=target.gameplayMassScale;
   if(mode==='split')expect(splitPart(p,target.id,{...target.body.worldCom()},vec(1,0,0))).not.toBeNull();
   if(mode==='bite')expect(bitePart(p,target.id,vec(1,0,0),.15)).not.toBeNull();
   if(mode==='rows')clearRows(p,[5],'solver');
   const survivors=[...p.parts.values()];expect(survivors.every(p=>p.gameplayMassScale===scale)).toBe(true);
   expect(survivors.reduce((s,p)=>s+gameplayMass(p),0)).toBeCloseTo(survivors.reduce((s,p)=>s+p.body.mass(),0)*scale!,4);
   expect(survivors.reduce((s,p)=>s+gameplayMass(p),0)).toBeLessThan(80);
  }finally{p.dispose();}
 }
});
it('same support graph provides separate solver and gameplay loads without double counting',()=>{
 const p=new PhysicsManager();try{
  const support=p.createPart(box(1,.15,.5),{position:vec(0,.15,0),rotation:identity},64,0,'player-support',0,undefined,'player');
  const upper=p.createPart(box(.4,.2,.3),{position:vec(0,.52,0),rotation:identity},144,1,'upper');upper.gameplayMassScale=80/144;
  for(let i=0;i<240;i++)p.step();
  expect(pileLoad(p,[support])).toBeCloseTo(144);expect(pileLoad(p,[support],gameplayMass)).toBeCloseTo(80);
 }finally{p.dispose();}
});
it('200 gameplay kg blocks QTE until the physical overhead load is removed',()=>{
 const p=new PhysicsManager(),c=new PlayerController(p,true);let now=0;const idle={axis:0,pressed:false,released:false,stomp:false};
 const step=(pressed=false)=>{c.update({...idle,pressed},now,CONFIG.dt);p.step();now+=CONFIG.dt;c.afterStep(now);};
 try{
  c.collider.setEnabled(false);c.ragdoll.knockDown(c.current,vec(),now);for(let i=0;i<90;i++)step();
  const load=p.createPart(box(2,.2,.7),{position:vec(0,.85,0),rotation:identity},360,1,'pile');load.gameplayMassScale=200/360;
  for(let i=0;i<180;i++)step();
  expect(c.ragdoll.gameplayLoadMass).toBeCloseTo(200);expect(c.ragdoll.loadMass).toBeCloseTo(360);
  for(let i=0;i<240;i++)step(true);
  expect(c.qte.overloaded).toBe(true);expect(c.qte.ready).toBe(false);expect(c.ragdoll.down).toBe(true);
  p.removePart(load.id);for(let i=0;i<150&&!c.qte.ready;i++)step(true);for(let i=0;i<60&&c.ragdoll.down;i++)step();
  expect(c.ragdoll.down).toBe(false);expect(c.qte.escapes).toBe(1);expect(p.numericFaults).toBe(0);
 }finally{c.dispose();p.dispose();}
});
