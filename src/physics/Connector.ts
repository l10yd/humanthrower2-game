import { contains,validate,vertices,type ConvexPolyhedron,type Interval } from '../slicing/ConvexClipper';
import { conjugate,dot,rotate,vec,type Quat,type Vec3 } from '../slicing/Math';
import type { Joint,Part } from './PhysicsManager';
/** Authored attachment tissue in each endpoint's body-local reference frame.
 * Metadata only: never adds mass, colliders or new invisible joints. */
export interface ConnectorVolume {a:ConvexPolyhedron;b:ConvexPolyhedron}
/** Scale authoring-space tissue once, before spawn. Source metadata is immutable. */
export function scaleConnector(connector:ConnectorVolume,scale:Vec3):ConnectorVolume {
 const scaled=(poly:ConvexPolyhedron)=>({faces:poly.faces.map(f=>({...f,vertices:f.vertices.map(v=>vec(v.x*scale.x,v.y*scale.y,v.z*scale.z))}))});
 return {a:scaled(connector.a),b:scaled(connector.b)};
}
export function validateConnector(connector:ConnectorVolume,anchorA:Vec3,anchorB:Vec3){
 for(const [poly,anchor]of [[connector.a,anchorA],[connector.b,anchorB]] as const){
  validate(poly);if(!contains(poly,anchor,.001))throw Error('Connector volume does not contain its attachment anchor');
 }
}
/** Projection extrema are exact for convex volumes and infinite cutting slabs.
 * Tangency alone does not sever; any positive thickness inside the removed band does. */
export function connectorIntersectsSlabs(joint:Pick<Joint,'connector'>,a:Part,b:Part,normal:Vec3,intervals:readonly Interval[]){
 if(!joint.connector)return false;
 return ([['a',a],['b',b]] as const).some(([side,part])=>{
  const localNormal=rotate(normal,conjugate(part.body.rotation())),offset=dot(normal,part.body.translation());
  const values=vertices(joint.connector![side]).map(v=>dot(localNormal,v)+offset),low=Math.min(...values),high=Math.max(...values);
  return intervals.some(i=>Math.min(high,i.upper)-Math.max(low,i.lower)>1e-9);
 });
}
/** Runtime schema validation, including finite, normalized authored joint frames. */
export function validateJointFrame(frame:Quat){
 if(!Number.isFinite(frame.x+frame.y+frame.z+frame.w)||Math.abs(Math.hypot(frame.x,frame.y,frame.z,frame.w)-1)>1e-4)throw Error('Invalid authored joint frame');
}
