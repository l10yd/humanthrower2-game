import { describe, expect, it } from 'vitest';
import { kineticEnergy, mechanicalEnergy, quaternionMultiply, relativeTwistAngles, relativeTwistMotion, type BodySample } from '../../src/physics/Diagnostics';
import { axisAngle, identity, vec } from '../../src/slicing/Math';
const body:BodySample={mass:2,position:vec(),com:vec(),rotation:identity,velocity:vec(3,0,0),angular:vec(0,0,2),inertia:{m11:1,m12:0,m13:0,m22:1,m23:0,m33:3}};
describe('read-only numerical diagnostics',()=>{
 it('computes linear + rotational kinetic energy using world inertia',()=>{expect(kineticEnergy(body)).toBe(15);expect(kineticEnergy({...body,velocity:vec(),angular:vec()})).toBe(0);});
 it('uses the true center of mass for potential energy, not the reference origin',()=>{
  expect(mechanicalEnergy([{...body,position:vec(0,20,0),com:vec(0,3,0)}])).toBeCloseTo(15+2*9.81*3);
 });
 it('projected twist differential matches finite differences for coupled rotations and moving frames',()=>{
  const a=quaternionMultiply(axisAngle(vec(0,1,0),.7),axisAngle(vec(0,0,1),-.4)),b=quaternionMultiply(axisAngle(vec(1,0,0),.8),axisAngle(vec(0,1,0),1.1));
  const frameA=axisAngle(vec(1,0,0),.3),frameB=axisAngle(vec(0,0,1),-.6),wa=vec(.7,-1.2,.4),wb=vec(-.8,.3,1.1),dt=1e-6;
  const evolve=(q:typeof a,w:typeof wa,t:number)=>{const speed=Math.hypot(w.x,w.y,w.z);return quaternionMultiply(axisAngle(vec(w.x/speed,w.y/speed,w.z/speed),speed*t),q);};
  const before=relativeTwistAngles(evolve(a,wa,-dt),evolve(b,wb,-dt),frameA,frameB),after=relativeTwistAngles(evolve(a,wa,dt),evolve(b,wb,dt),frameA,frameB);
  const motion=relativeTwistMotion(a,b,frameA,frameB,wa,wb);
  for(let i=0;i<3;i++)expect(motion[i].rate).toBeCloseTo(Math.atan2(Math.sin(after[i]-before[i]),Math.cos(after[i]-before[i]))/(2*dt),6);
  expect(motion.some(m=>Math.abs(m.rate!-m.axisRate)>.1)).toBe(true);
 });
 it('pure-axis motion has unit twist Jacobian and the antipodal singularity is explicit',()=>{
  const motion=relativeTwistMotion(identity,axisAngle(vec(0,1,0),.8),identity,identity,vec(),vec(0,2,0));expect(motion[1].rate).toBeCloseTo(2);expect(motion[1].axisRate).toBeCloseTo(2);
  const singular=relativeTwistMotion(identity,axisAngle(vec(1,0,0),Math.PI),identity,identity,vec(),vec(0,2,0));expect(singular[1].rate).toBeNull();expect(singular[1].jacobian).toBeNull();
 });
 it('relative twist is world-rotation invariant and wraps at the full circle',()=>{const a=axisAngle(vec(0,0,1),.8),b=axisAngle(vec(0,0,1),1.4);const angles=relativeTwistAngles(a,b,identity,identity);expect(angles[2]).toBeCloseTo(.6);expect(angles[0]).toBeCloseTo(0);expect(relativeTwistAngles(identity,axisAngle(vec(1,0,0),3.8),identity,identity)[0]).toBeCloseTo(3.8-Math.PI*2);});
});
