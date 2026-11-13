import {it,expect,beforeAll} from 'vitest';
import part from '../fixtures/thin-contact-part.json';
import {PhysicsManager,RAPIER,type Part} from '../../src/physics/PhysicsManager';
import {principalInertiaTensor} from '../../src/physics/InertiaTensor';
import {kineticEnergy} from '../../src/physics/Diagnostics';
import {axisAngle,vec,identity} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('principal tensor reconstruction is finite for tiny eigenvalues and rotates full inertia',()=>{
 const i=principalInertiaTensor(vec(1,2,3),axisAngle(vec(0,0,1),Math.PI/2));expect(i.m11).toBeCloseTo(2);expect(i.m22).toBeCloseTo(1);expect(i.m33).toBeCloseTo(3);
 const tiny=principalInertiaTensor(vec(3e-15,4e-11,4e-11),identity);expect(Object.values(tiny).every(Number.isFinite)).toBe(true);expect(tiny.m11).toBe(3e-15);
});
it('read-only diagnostic sample survives native effective-inertia inversion NaN on the retained tiny part',()=>{
 const p=new PhysicsManager();try{
  const b=p.createPart(part.poly,{position:vec(0,2,0),rotation:identity},0,1,'thin',1,part.density);b.body.setAngvel(vec(1,2,3),true);
  const before=p.world.takeSnapshot(),sample=(p as unknown as {sample(b:Part):Parameters<typeof kineticEnergy>[0]}).sample(b);
  expect(Object.values(sample.inertia).every(Number.isFinite)).toBe(true);expect(Number.isFinite(kineticEnergy(sample))).toBe(true);expect(p.world.takeSnapshot()).toEqual(before);
 }finally{p.dispose();}
});
