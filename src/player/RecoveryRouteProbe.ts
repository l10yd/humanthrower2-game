import type {PhysicsManager,Part} from '../physics/PhysicsManager';
import {RAPIER} from '../physics/PhysicsManager';
import {CollisionQuery,translationBounds} from './QueryBounds';
import {add,dot,vec,type Vec3} from '../slicing/Math';
export interface RouteBlocker {part:number;other:number|'static';startDistance:number|null;separating:number|null;toi:number|null}
/** Read-only diagnostic of a proposed whole-island translation; no poses/forces
 * or contact masks changed. Reports why the previous path veto rejected routes. */
export function probeIslandTranslation(physics:PhysicsManager,members:readonly Part[],delta:Vec3){
 const ids=new Set(members.map(p=>p.collider.handle));
 const external=(c:RAPIER.Collider)=>c.isEnabled()&&!c.isSensor()&&!ids.has(c.handle)&&physics.partForCollider(c)?.owner!=='player';
 const query=new CollisionQuery(physics,external),blockers:RouteBlocker[]=[];
 for(const p of members){
  const shape=p.collider.shape,from={...p.body.translation()},rotation={...p.body.rotation()};
  for(const c of query.nearby(translationBounds(shape,from,add(from,delta),rotation))){
   const start=c.contactShape(shape,from,rotation,.002),separating=start?dot(start.normal1,delta):null;
   const convex=[RAPIER.ShapeType.Ball,RAPIER.ShapeType.Cuboid,RAPIER.ShapeType.Capsule,RAPIER.ShapeType.ConvexPolyhedron].includes(c.shape.type);
   if(start&&convex&&separating!==null&&separating>=0)continue;
   const hit=c.castShape(vec(),shape,from,rotation,delta,0,1,false);
   if(start&&start.distance<0&&separating!==null&&separating< -1e-7||hit&&hit.time_of_impact<1-1e-7)
    blockers.push({part:p.id,other:physics.partForCollider(c)?.id??'static',startDistance:start?.distance??null,separating,toi:hit?.time_of_impact??null});
  }
 }
 return {delta:{...delta},members:members.map(p=>p.id),blockers};
}
