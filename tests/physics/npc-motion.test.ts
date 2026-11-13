import {beforeAll,it,expect} from 'vitest';
import {CONFIG} from '../../src/core/Config';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {RagdollFactory} from '../../src/physics/RagdollFactory';
import {FreshDropMotion} from '../../src/npc/FreshDropMotion';
import {LivingNpcs} from '../../src/npc/LivingNpcs';
import {box} from '../../src/slicing/ConvexClipper';
import {vec,identity} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('fresh whole and incomplete drops visibly articulate in free fall with seeded spin and unchanged anatomical masses',()=>{
 for(const missingLimbs of [[],['upperArm1','forearm1'],['thigh1','shin1']]){
  const p=new PhysicsManager(),f=new RagdollFactory(p,2,2),motion=new FreshDropMotion(p);try{
   const parts=f.spawn('normal',vec(0,10,0),identity,false,{missingLimbs})!,masses=parts.map(p=>p.body.mass()),ids=parts.map(p=>p.id);
   motion.register(parts,0,813);expect(parts.some(p=>Math.abs(p.body.angvel().z)>.1)).toBe(true);
   for(let i=0;i<25;i++){motion.update(i/60);p.step();}
   const chest=parts.find(p=>p.limb==='chest')!.body.rotation(),arms=parts.filter(p=>p.limb.startsWith('forearm'));
   expect(arms.some(p=>Math.abs(chest.x-p.body.rotation().x)+Math.abs(chest.y-p.body.rotation().y)+Math.abs(chest.z-p.body.rotation().z)>.08)).toBe(true);
   expect(motion.snapshot.strokes).toBeGreaterThan(0);expect(parts.map(p=>p.id)).toEqual(ids);expect(parts.map(p=>p.body.mass())).toEqual(masses);expect(p.joints.size).toBe(parts.length-1);expect(p.numericFaults).toBe(0);
   expect(parts.find(p=>p.limb==='chest')!.body.mass()).toBeGreaterThan(parts.find(p=>p.limb==='head')!.body.mass()*4);
  }finally{p.dispose();}
 }
});
it('different fresh drop seeds change starting velocities while repeats are deterministic',()=>{
 const sample=(seed:number)=>{const p=new PhysicsManager();try{const parts=new RagdollFactory(p).spawn('normal',vec(0,8,0),identity,false)!;new FreshDropMotion(p).register(parts,0,seed);return parts.map(p=>({v:{...p.body.linvel()},w:{...p.body.angvel()}}));}finally{p.dispose();}};
 expect(sample(14)).toEqual(sample(14));expect(sample(15)).not.toEqual(sample(14));
});
it('fresh air strokes finish on contact and do not keep dead resting piles awake',()=>{
 const p=new PhysicsManager(),motion=new FreshDropMotion(p);try{
  const parts=new RagdollFactory(p).spawn('normal',vec(0,2,0),identity,false)!;motion.register(parts,0,55);
  for(let i=0;i<180;i++){motion.update(i/60);p.step();}
  expect(motion.snapshot.active).toBe(0);const strokes=motion.strokes;
  for(let i=180;i<210;i++){motion.update(i/60);p.step();}expect(motion.strokes).toBe(strokes);
 }finally{p.dispose();}
});
it('default twitch mode never hunts or jumps, a light overhead load freezes it and removal restores twitching',()=>{
 const p=new PhysicsManager(),ai=new LivingNpcs(p);try{
  const parts=new RagdollFactory(p).spawn('normal',vec(0,.92,0),identity,false)!;ai.register(parts,0);
  for(let i=0;i<45;i++){ai.update(i/60,CONFIG.dt,vec(2,1,0));p.step();}
  expect(ai.mode).toBe('twitch');expect(ai.attacks).toBe(0);expect(ai.snapshot.phases[0].phase).toBe('TWITCHING');
  const head=parts.find(p=>p.limb==='head')!,position=head.body.translation(),load=p.createPart(box(.3,.18,.3),{position:vec(position.x,position.y+.35,position.z),rotation:identity},10,99,'load');
  let maxLoad=0;for(let i=45;i<100;i++){ai.update(i/60,CONFIG.dt,vec(2,1,0));maxLoad=Math.max(maxLoad,ai.agents.get(parts[0].npcId)!.loadMass);p.step();}
  expect(ai.snapshot.phases[0].phase).toBe('PINNED');expect(maxLoad).toBeGreaterThanOrEqual(8);
  p.removePart(load.id);for(let i=100;i<140;i++){ai.update(i/60,CONFIG.dt,vec(2,1,0));p.step();}
  expect(ai.snapshot.phases[0].phase).toBe('TWITCHING');expect(ai.attacks).toBe(0);
 }finally{p.dispose();}
});
it('explicit hunt mode retains ground rising, pursuit and jumping behavior',()=>{
 const p=new PhysicsManager(),ai=new LivingNpcs(p,'hunt');try{
  const parts=new RagdollFactory(p).spawn('normal',vec(0,.92,0),identity,false)!;ai.register(parts,0);
  for(let i=0;i<180;i++){ai.update(i/60,CONFIG.dt,vec(2,1,0));p.step();}
  expect(ai.snapshot.mode).toBe('hunt');expect(ai.attacks).toBeGreaterThan(0);expect(p.numericFaults).toBe(0);
 }finally{p.dispose();}
});
