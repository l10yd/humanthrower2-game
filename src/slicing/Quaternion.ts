import { add, cross, dot, mul, normalize, type Quat, type Vec3 } from './Math';
/** Shortest-arc interpolation for recovery path samples (never written to physics). */
export function slerp(a:Quat,b:Quat,t:number):Quat {
  let cosine=a.x*b.x+a.y*b.y+a.z*b.z+a.w*b.w;
  let bx=b.x,by=b.y,bz=b.z,bw=b.w;
  if(cosine<0){cosine=-cosine;bx=-bx;by=-by;bz=-bz;bw=-bw;}
  let u=1-t,v=t;
  if(cosine<.9995){const angle=Math.acos(Math.min(1,cosine)),s=Math.sin(angle);u=Math.sin((1-t)*angle)/s;v=Math.sin(t*angle)/s;}
  const q={x:a.x*u+bx*v,y:a.y*u+by*v,z:a.z*u+bz*v,w:a.w*u+bw*v};
  const n=Math.hypot(q.x,q.y,q.z,q.w);return {x:q.x/n,y:q.y/n,z:q.z/n,w:q.w/n};
}
export function multiply(a:Quat,b:Quat):Quat {
  const av={x:a.x,y:a.y,z:a.z},bv={x:b.x,y:b.y,z:b.z};
  const v=add(add(mul(bv,a.w),mul(av,b.w)),cross(av,bv));return {...v,w:a.w*b.w-dot(av,bv)};
}
