import { beforeAll, expect, it } from 'vitest';
import fixture from '../fixtures/separation-chaos.json';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { exactMassProperties } from '../../src/physics/ExactMass';
import { axisAngle, identity, vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('compares exact mass with auto inertia for retained thin strips on floor impacts',()=>{
 for(const id of [195,212])for(const exact of [false,true]){
  const p=new PhysicsManager();p.exactFragmentMassEnabled=exact;
  try{
   const source=fixture.parts.find(p=>p.id===id)!;
   const part=p.createPart(source.poly,{position:vec(0,1,0),rotation:axisAngle(vec(1,2,3),.7)},0,1,'thin',1,source.density);
   const expected=exactMassProperties(source.poly,source.density),principal={...part.body.principalInertia()};
   for(let i=0;i<240;i++)p.step();
   console.log(JSON.stringify({id,exact,principal,expected:expected.principal,mass:part.body.mass(),volume:expected.volume,peak:p.maxAngularSpeed,speed:p.maxSpeed}));
   expect(p.numericFaults).toBe(0);
  }finally{p.dispose();}
 }
});
