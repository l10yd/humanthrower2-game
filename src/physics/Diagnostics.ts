import type { Quat, Vec3 } from '../slicing/Math';
import { dot, rotate, vec, sub } from '../slicing/Math';
export interface Matrix3 {m11:number;m12:number;m13:number;m22:number;m23:number;m33:number}
export interface BodySample {mass:number;position:Vec3;com:Vec3;rotation:Quat;velocity:Vec3;angular:Vec3;inertia:Matrix3;inertiaSource?:'effective'|'principal-fallback'}
/** World-space inertia from Rapier. Diagnostic only: never changes forces, poses or speeds. */
export function kineticEnergy(body:BodySample):number {
  const {angular:w,inertia:i}=body;
  const iw=vec(i.m11*w.x+i.m12*w.y+i.m13*w.z,i.m12*w.x+i.m22*w.y+i.m23*w.z,i.m13*w.x+i.m23*w.y+i.m33*w.z);
  return .5*body.mass*dot(body.velocity,body.velocity)+.5*dot(w,iw);
}
export function mechanicalEnergy(samples:Iterable<BodySample>,gravity=9.81):number {
  let total=0;for(const body of samples)total+=kineticEnergy(body)+body.mass*gravity*body.com.y;return total;
}
export function quaternionMultiply(a:Quat,b:Quat):Quat {
  return {x:a.w*b.x+a.x*b.w+a.y*b.z-a.z*b.y,y:a.w*b.y-a.x*b.z+a.y*b.w+a.z*b.x,
    z:a.w*b.z+a.x*b.y-a.y*b.x+a.z*b.w,w:a.w*b.w-a.x*b.x-a.y*b.y-a.z*b.z};
}
/** Projected twist coordinates in the joint's local frame, matching generic-axis limits;
 * these are not Euler angles and not an anatomical swing cone. */
export function relativeTwistAngles(a:Quat,b:Quat,frameA:Quat,frameB:Quat):number[] {
  const qa=quaternionMultiply(a,frameA),qb=quaternionMultiply(b,frameB);
  const relative=quaternionMultiply({x:-qa.x,y:-qa.y,z:-qa.z,w:qa.w},qb);
  return [relative.x,relative.y,relative.z].map(component=>{
    const angle=2*Math.atan2(component,relative.w);
    return Math.atan2(Math.sin(angle),Math.cos(angle));
  });
}
/** Read-only projected-twist differential. The three coordinates are coupled:
 * projecting relative angular velocity on the rest-frame axis is not generally
 * the derivative of 2*atan2(q_i,q_w) for a multi-axis rotation. */
export function relativeTwistMotion(a:Quat,b:Quat,frameA:Quat,frameB:Quat,angularA:Vec3,angularB:Vec3){
  const qa=quaternionMultiply(a,frameA),qb=quaternionMultiply(b,frameB);
  const relative=quaternionMultiply({x:-qa.x,y:-qa.y,z:-qa.z,w:qa.w},qb);
  const imaginary=[relative.x,relative.y,relative.z],w=relative.w,delta=sub(angularB,angularA);
  return imaginary.map((component,i)=>{
    const denominator=w*w+component*component;
    const basis=[0,0,0];basis[i]=1;
    const axis=rotate(vec(...basis as [number,number,number]),qa);
    if(denominator<1e-12)return {rate:null,axisRate:dot(delta,axis),jacobian:null,denominator};
    const crossed=i===0?[0,relative.z,-relative.y]:i===1?[-relative.z,0,relative.x]:[relative.y,-relative.x,0];
    const local=imaginary.map((q,j)=>(w*w*basis[j]+w*crossed[j]+component*q)/denominator);
    const jacobian=rotate(vec(...local as [number,number,number]),qa);
    return {rate:dot(jacobian,delta),axisRate:dot(delta,axis),jacobian,denominator};
  });
}
export function anchorDistance(a:BodySample,b:BodySample,anchorA:Vec3,anchorB:Vec3):number {
  const pa=rotate(anchorA,a.rotation),pb=rotate(anchorB,b.rotation);
  return Math.hypot(a.position.x+pa.x-b.position.x-pb.x,a.position.y+pa.y-b.position.y-pb.y,a.position.z+pa.z-b.position.z-pb.z);
}
