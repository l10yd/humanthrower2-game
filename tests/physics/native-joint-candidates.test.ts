import {it,expect} from 'vitest';
import fixture from '../fixtures/native-joint-candidates.json';
import {relativeTwistMotion} from '../../src/physics/Diagnostics';
import {dot,vec} from '../../src/slicing/Math';
// @ts-expect-error Pure JS diagnostic module is deliberately outside runtime.
import {checkRowEquation} from '../../scripts/native-row-analysis.mjs';
const pre=(name:string,pass=1)=>fixture.cases.find(c=>c.name===name)!.rows.find(r=>r.event==='joint-pre-orthogonalization'&&r.axis===4&&r.pipeline.pass===pass)!;
const post=(name:string,pass=1)=>fixture.cases.find(c=>c.name===name)!.rows.find(r=>r.event==='joint-post-orthogonalization'&&r.axis===4&&r.pipeline.pass===pass)!;
it('native projected-twist Jacobian matches the independent coordinate derivative, not the plain axis',()=>{
 const i=fixture.input,motion=relativeTwistMotion(i.rotationA,i.rotationB,i.frameA,i.frameB,i.angularA,i.angularB)[1],gradient=pre('twist-jacobian').angularJacobian1;
 expect(gradient[0]).toBeCloseTo(motion.jacobian!.x,6);expect(gradient[1]).toBeCloseTo(motion.jacobian!.y,6);expect(gradient[2]).toBeCloseTo(motion.jacobian!.z,6);
 const plain=pre('baseline').angularJacobian1,delta=vec(i.angularB.x-i.angularA.x,i.angularB.y-i.angularA.y,i.angularB.z-i.angularA.z);
 expect(Math.abs(dot(vec(...gradient as [number,number,number]),delta)-dot(vec(...plain as [number,number,number]),delta))).toBeGreaterThan(10);
 expect(pre('twist-jacobian').rhs).toBe(pre('baseline').rhs); // Same angular limit/bias, changed gradient only.
});
it('orthogonalization couples the nominal angular bias to short CCD linear correction',()=>{
 expect(pre('baseline',2).rhs).toBe(-3);expect(post('baseline',2).rhs).toBeGreaterThan(100);
 expect(pre('twist-jacobian',2).rhs).toBe(-3);expect(post('twist-jacobian',2).rhs).toBeGreaterThan(400);
 expect(pre('linear-bias',2).rhs).toBe(-3);expect(Math.abs(post('linear-bias',2).rhs)).toBeLessThan(3);
});
it('a local shoulder improvement cannot conceal another body above the unchanged angular gate',()=>{
 const candidate=fixture.cases.find(c=>c.name==='linear-bias')!;
 expect(candidate.localAngular).toBeLessThan(35);expect(candidate.worldAngular).toBeGreaterThan(35);expect(candidate.standardStressAngular).toBeGreaterThan(35);
});
it('both native candidates are rejected by standard stress and natural sessions',()=>{
 for(const c of fixture.cases.filter(c=>c.name!=='baseline')){
  expect(c.standardStressAngular).toBeGreaterThan(35);
  for(const r of c.natural!){expect(r.error).toBeNull();expect(r.numericFaults).toBe(0);expect(r.maxAngularSpeed).toBeGreaterThan(35);}
 }
});
it('captured native joint impulses still obey their measured Jacobians and solver equations',()=>{
 for(const c of fixture.cases)for(const row of c.rows){const equation=checkRowEquation(row);if(!equation)continue;expect(equation.finite).toBe(true);expect(equation.velocityRelativeError).toBeLessThan(.002);}
});
