import {RAPIER,type PhysicsManager} from '../physics/PhysicsManager';
import {CollisionQuery,translationBounds} from './QueryBounds';
import {add,dot,vec,type Vec3,type Quat} from '../slicing/Math';
/** Diagnostic only, NOT invoked by production recovery. Fixed-orientation island translation. Exact casts reject obstacles between
 * endpoints; initial overlaps may only exit along their separating normal.
 * This never treats a supporting face as permission to cross the whole solid. */
export function islandTranslationClear(physics:PhysicsManager,shape:RAPIER.Shape,from:Vec3,rotation:Quat,delta:Vec3,external:(c:RAPIER.Collider)=>boolean,query?:CollisionQuery):boolean {
 for(const c of (query??new CollisionQuery(physics,external)).nearby(translationBounds(shape,from,add(from,delta),rotation))){
  const start=c.contactShape(shape,from,rotation,.002);
  if(start){
   const separating=dot(start.normal1,delta);
   if(start.distance<0&&separating<-1e-7)return false;
   // For convex solids the initial contact normal is a supporting plane.
   // Translation outwards/tangent cannot deepen penetration past that plane;
   // GJK's initial-overlap TOI=0 must not veto shallow resting pile contacts.
   const convex=[RAPIER.ShapeType.Ball,RAPIER.ShapeType.Cuboid,RAPIER.ShapeType.Capsule,RAPIER.ShapeType.ConvexPolyhedron].includes(c.shape.type);
   if(convex&&separating>=0)continue;
  }
  const hit=c.castShape(vec(),shape,from,rotation,delta,0,1,false);
  if(hit&&hit.time_of_impact<1-1e-7)return false;
 }
 return true;
}
