import { beforeAll, describe, expect, it } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { shapeBounds, sweptBounds,translationBounds, CollisionQuery, overlaps } from '../../src/player/QueryBounds';
import { axisAngle, rotate, vec, add, identity } from '../../src/slicing/Math';
import { slerp } from '../../src/slicing/Quaternion';
beforeAll(async()=>{await RAPIER.init();});
describe('conservative query bounds',()=>{
 it('rotation matrix bounds match all eight transformed corners for offset hulls',()=>{
  const points=[-.2,.4].flatMap(x=>[-.1,.8].flatMap(y=>[-.3,.2].map(z=>vec(x,y,z))));
  const shape=new RAPIER.ConvexPolyhedron(new Float32Array(points.flatMap(p=>[p.x,p.y,p.z])));
  for(const angle of [-2,-.3,0,1,2.8]){
   const rotation=axisAngle(vec(.6,.8,0),angle),position=vec(2,3,4),bounds=shapeBounds(shape,position,rotation)!;
   const transformed=points.map(p=>add(position,rotate(p,rotation)));
   for(const k of ['x','y','z'] as const){expect(bounds.min[k]).toBeCloseTo(Math.min(...transformed.map(p=>p[k])),6);expect(bounds.max[k]).toBeCloseTo(Math.max(...transformed.map(p=>p[k])),6);}
  }
 });
 it('swept bounds contain an offset rotating hull at intermediate poses',()=>{
  const shape=new RAPIER.Cuboid(.2,.8,.1),from=vec(-1,2,0),to=vec(1,3,0),bounds=sweptBounds(shape,from,to)!;
  for(let i=0;i<=20;i++){
   const t=i/20,rotation=slerp(identity,axisAngle(vec(0,0,1),2.8),t),pose=vec(-1+2*t,2+t,0),actual=shapeBounds(shape,pose,rotation)!;
   for(const k of ['x','y','z'] as const){expect(actual.min[k]).toBeGreaterThanOrEqual(bounds.min[k]);expect(actual.max[k]).toBeLessThanOrEqual(bounds.max[k]);}
  }
 });
 it('translation bounds enclose every fixed-orientation pose without a rotation sphere',()=>{
  const shape=new RAPIER.Cuboid(.03,.6,.04),rotation=axisAngle(vec(0,0,1),Math.PI/2),from=vec(-1,2,0),to=vec(1,2.2,0),bounds=translationBounds(shape,from,to,rotation)!;
  for(let i=0;i<=20;i++){
   const pose=vec(-1+i/10,2+i/100,0),actual=shapeBounds(shape,pose,rotation)!;
   for(const key of ['x','y','z'] as const){expect(actual.min[key]).toBeGreaterThanOrEqual(bounds.min[key]);expect(actual.max[key]).toBeLessThanOrEqual(bounds.max[key]);}
  }
  expect(bounds.max.z-bounds.min.z).toBeLessThan(.13);
 });
 it('spatial queries preserve linear-scan membership and registry order at cell boundaries',()=>{
  const p=new PhysicsManager();try{
   const created:RAPIER.Collider[]=[];
   for(let i=0;i<120;i++)created.push(p.world.createCollider(RAPIER.ColliderDesc.cuboid(.12+(i%3)*.2,.2,.15).setTranslation((i%12-6)*.83,1+Math.floor(i/12)*.71,(i%5-2)*.3)));
   // Oversized entries take a conservative fallback path, not an enormous grid.
   created.push(p.world.createCollider(RAPIER.ColliderDesc.cuboid(40,40,40).setTranslation(0,40,0)));
   const all:RAPIER.Collider[]=[];p.world.forEachCollider(c=>all.push(c));const query=new CollisionQuery(p,()=>true);
   for(let i=0;i<80;i++){
    const bounds=shapeBounds(new RAPIER.Cuboid(.2,.3,.1),vec((i%10-5)*.99,.5+(i%8)*.93,(i%3-1)*.5),identity)!;
    const expected=all.filter(c=>{const b=shapeBounds(c.shape,c.translation(),c.rotation());return !b||overlaps(bounds,b);}).map(c=>c.handle);
    expect(query.nearby(bounds).map(c=>c.handle)).toEqual(expected);
   }
   expect(query.nearby(null).map(c=>c.handle)).toEqual(all.map(c=>c.handle));
  }finally{p.dispose();}
 });
 it('a short local query does not scan hundreds of distant entries',()=>{
  const p=new PhysicsManager();try{
   for(let i=0;i<500;i++)p.world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(50+i,3,0));
   const near=p.world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(-1.01,3,0));
   const query=new CollisionQuery(p,()=>true),bounds=shapeBounds(new RAPIER.Ball(.1),vec(-.8,3,0),identity)!;
   expect(query.nearby(bounds)).toContain(near);expect(query.candidateChecks).toBeLessThan(10);
  }finally{p.dispose();}
 });
 it('extreme finite coordinates fall back without an unbounded grid loop',()=>{
  const p=new PhysicsManager();try{
   p.world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(1e20,3,0));
   const query=new CollisionQuery(p,()=>true);
   expect(()=>query.nearby({min:vec(1e20,2,-1),max:vec(1e20,4,1)})).not.toThrow();
  }finally{p.dispose();}
 });
 it('a new decision barrier observes additions, removals and moved colliders before world.step',()=>{
  const p=new PhysicsManager();try{
   const external=(c:RAPIER.Collider)=>c.isEnabled(),bounds=shapeBounds(new RAPIER.Ball(.1),vec(0,2,0),identity)!;
   const collider=p.world.createCollider(RAPIER.ColliderDesc.ball(.1).setTranslation(100,2,0));
   expect(new CollisionQuery(p,external).nearby(bounds)).not.toContain(collider);
   collider.setTranslation(vec(0,2,0));expect(new CollisionQuery(p,external).nearby(bounds)).toContain(collider);
   p.world.removeCollider(collider,true);expect(new CollisionQuery(p,external).nearby(bounds)).not.toContain(collider);
  }finally{p.dispose();}
 });
});
