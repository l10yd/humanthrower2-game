import { describe, expect, it } from 'vitest';
import { exactMassProperties } from '../../src/physics/ExactMass';
import { box, vertices } from '../../src/slicing/ConvexClipper';
import { add, axisAngle, rotate, vec } from '../../src/slicing/Math';
import fixture from '../fixtures/separation-chaos.json';
describe('double-precision physical moments',()=>{
 it('matches analytic cuboid inertia and mass',()=>{
  const m=exactMassProperties(box(.2,.3,.4),100),mass=100*.4*.6*.8;
  expect(m.mass).toBeCloseTo(mass,12);for(const x of Object.values(m.center))expect(x).toBeCloseTo(0,12);
  const expected=[mass*(.6**2+.8**2)/12,mass*(.4**2+.8**2)/12,mass*(.4**2+.6**2)/12];
  m.tensor.forEach((row,i)=>row.forEach((x,j)=>expect(x).toBeCloseTo(i===j?expected[i]:0,12)));
 });
 it('is translation-invariant for micron-thin captured geometry',()=>{
  const poly=fixture.parts.find(p=>p.id===212)!.poly,m=exactMassProperties(poly,31.518886330982223);
  const shifted={faces:poly.faces.map(f=>({...f,vertices:f.vertices.map(p=>add(p,vec(10,-20,30)))}))};
  const translated=exactMassProperties(shifted,31.518886330982223);
  expect(translated.mass/m.mass).toBeCloseTo(1,9);
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)expect(translated.tensor[i][j]).toBeCloseTo(m.tensor[i][j],16);
 });
 it('reconstructs the tensor from rotated principal axes',()=>{
  const poly=box(.2,.3,.4),rotation=axisAngle(vec(1,2,3),.7);for(const p of vertices(poly)){const q=rotate(p,rotation);Object.assign(p,q);}
  const m=exactMassProperties(poly,100),axes=[vec(1,0,0),vec(0,1,0),vec(0,0,1)].map(v=>rotate(v,m.frame)),e=[m.principal.x,m.principal.y,m.principal.z];
  const keys=['x','y','z'] as const;
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)expect(axes.reduce((sum,v,i)=>sum+v[keys[a]]*e[i]*v[keys[b]],0)).toBeCloseTo(m.tensor[a][b],10);
 });
});
