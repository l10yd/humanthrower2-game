import { beforeAll, expect, it } from 'vitest';
import { randomSeed, type NpcType } from '../../src/core/Config';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { RagdollFactory } from '../../src/physics/RagdollFactory';
import { severJoint, splitPart } from '../../src/slicing/Dismemberment';
import { massProperties, validate } from '../../src/slicing/ConvexClipper';
import { add, axisAngle, rotate, vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
for(const seed of [17,42,123])it(`settled pile ${seed}: repeated severing/splits retain kg and every significant survivor, with no indefinite contact grace`,()=>{
 const p=new PhysicsManager(),f=new RagdollFactory(p,2,2),random=randomSeed(seed);let cuts=0,removed=0,removedVolume=0,spawnMass=0,spawnVolume=0,fragments=0;
 try{
  for(let i=0;i<8;i++){
   const type:NpcType=i%3===0?'heavy':'normal';
   const parts=f.spawn(type,vec((i%3-1)*1.3,7+(i%2),0),axisAngle(vec(0,0,1),(random()-.5)*2.6));
   expect(parts).not.toBeNull();
   for(const part of parts!){spawnMass+=part.body.mass();spawnVolume+=massProperties(part.poly).volume;}
   for(let k=0;k<150;k++)p.step();
  }
  for(let i=0;i<300;i++)p.step();const before={v:p.maxSpeed,w:p.maxAngularSpeed};
  p.maxSpeed=0;p.maxAngularSpeed=0;
  for(let i=0;i<90;i++){
   if(i%3===0){
    const target=[...p.parts.values()].filter(part=>part.limb==='chest'||part.limb==='pelvis').sort((a,b)=>a.body.worldCom().y-b.body.worldCom().y)[Math.floor(random()*4)];
    if(target){
     const point=add(target.body.translation(),rotate(massProperties(target.poly).center,target.body.rotation()));
     const volume=massProperties(target.poly).volume;
     const result=splitPart(p,target.id,point,rotate(vec(0,1,0),target.body.rotation()));
     if(result){cuts++;fragments++;removed+=result.removedMass;removedVolume+=result.removedMass/target.density;expect(p.parts.has(target.id)).toBe(false);expect(result.removedMass/target.density).toBeLessThan(volume);}
    }
   }else{
    const joint=[...p.joints.values()][Math.floor(random()*p.joints.size)];if(joint&&severJoint(p,joint.id))cuts++;
   }
   for(let k=0;k<30;k++)p.step();
  }
  for(let k=0;k<600;k++)p.step();
  console.log(JSON.stringify({seed,cuts,parts:p.parts.size,joints:p.joints.size,before,v:p.maxSpeed,w:p.maxAngularSpeed,nan:p.numericFaults,deferred:p.deferredContacts}));
  expect(cuts).toBeGreaterThanOrEqual(60);expect(fragments).toBeGreaterThan(3);
  expect(p.parts.size).toBe(88+fragments);expect(p.numericFaults).toBe(0);expect(p.deferredContacts).toBe(0);
  expect(p.maxSpeed).toBeLessThan(25);expect(p.maxAngularSpeed).toBeLessThan(35);
  expect([...p.parts.values()].reduce((sum,b)=>sum+b.body.mass(),removed)).toBeCloseTo(spawnMass,2);
  expect([...p.parts.values()].reduce((sum,b)=>sum+massProperties(b.poly).volume,removedVolume)).toBeCloseTo(spawnVolume,5);
  for(const part of p.parts.values())validate(part.poly);
 }finally{p.dispose();}
},60000);
