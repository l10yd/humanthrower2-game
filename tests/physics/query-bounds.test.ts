import { beforeAll, describe, expect, it } from 'vitest';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { shapeBounds, sweptBounds, CollisionQuery } from '../../src/player/QueryBounds';
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
