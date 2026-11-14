import type {ConvexPolyhedron,Face} from './ConvexClipper';
import type {RowWorkerJob,RowWorkerResult} from './RowPreparationCache';
/** Float64 transferable geometry preserves the exact JS clipping inputs (not a
 * float32 render snapshot). Face/cap/UV/surface metadata travels separately. */
interface PackedPoly {faces:{start:number;count:number;cap?:boolean;hasUv:boolean;surfaceId?:string}[]}
function packPolys(polys:ConvexPolyhedron[]){
 const values:number[]=[],geometry:PackedPoly[]=polys.map(poly=>({faces:poly.faces.map(face=>{
  const start=values.length/5;face.vertices.forEach((p,i)=>values.push(p.x,p.y,p.z,face.uvs?.[i].u??0,face.uvs?.[i].v??0));
  return {start,count:face.vertices.length,cap:face.cap,hasUv:!!face.uvs,surfaceId:face.surfaceId};
 })}));return {geometry,corners:Float64Array.from(values)};
}
function unpackPoly(packed:PackedPoly,corners:Float64Array):ConvexPolyhedron {
 return {faces:packed.faces.map(f=>{
  const vertices=Array.from({length:f.count},(_,i)=>{const j=(f.start+i)*5;return {x:corners[j],y:corners[j+1],z:corners[j+2]};});
  const face:Face={vertices};if(f.cap!==undefined)face.cap=f.cap;if(f.surfaceId!==undefined)face.surfaceId=f.surfaceId;
  if(f.hasUv)face.uvs=Array.from({length:f.count},(_,i)=>{const j=(f.start+i)*5;return {u:corners[j+3],v:corners[j+4]};});return face;
 })};
}
export function packRowJob(job:RowWorkerJob){
 const packed=packPolys(job.parts.map(p=>p.poly)),poses=Float64Array.from(job.parts.flatMap(p=>[p.pose.position.x,p.pose.position.y,p.pose.position.z,p.pose.rotation.x,p.pose.rotation.y,p.pose.rotation.z,p.pose.rotation.w]));
 return {id:job.id,rows:job.rows,ids:job.parts.map(p=>p.id),poses,...packed};
}
export type PackedRowJob=ReturnType<typeof packRowJob>;
export function unpackRowJob(job:PackedRowJob):RowWorkerJob {
 return {id:job.id,rows:job.rows,parts:job.ids.map((id,i)=>{const j=i*7;return {id,poly:unpackPoly(job.geometry[i],job.corners),pose:{position:{x:job.poses[j],y:job.poses[j+1],z:job.poses[j+2]},rotation:{x:job.poses[j+3],y:job.poses[j+4],z:job.poses[j+5],w:job.poses[j+6]}}};})};
}
export function packRowResult(result:RowWorkerResult){
 let offset=0;const cuts=result.cuts.map(({id,cut})=>{const start=offset;offset+=cut.survivors.length;return {id,start,count:cut.survivors.length,removed:cut.removed,byInterval:cut.byInterval,skipped:cut.skipped};});
 return {id:result.id,cuts,error:result.error,...packPolys(result.cuts.flatMap(p=>p.cut.survivors))};
}
export type PackedRowResult=ReturnType<typeof packRowResult>;
export function unpackRowResult(result:PackedRowResult):RowWorkerResult {
 return {id:result.id,error:result.error,cuts:result.cuts.map(c=>({id:c.id,cut:{removed:c.removed,byInterval:c.byInterval,skipped:c.skipped,survivors:Array.from({length:c.count},(_,i)=>unpackPoly(result.geometry[c.start+i],result.corners))}}))};
}
