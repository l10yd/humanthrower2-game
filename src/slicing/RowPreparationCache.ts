import type {ConvexPolyhedron} from './ConvexClipper';
import type {Part,Pose} from '../physics/PhysicsManager';
import {conjugate,rotate,vec} from './Math';
import {prepareRowCut,type PreparedCut} from './RowPreparation';
import type {CutPreparationLookup} from './ClearTransaction';
export interface RowWorkerJob {id:number;rows:number[];parts:{id:number;poly:ConvexPolyhedron;pose:Pose}[]}
export interface RowWorkerResult {id:number;cuts:{id:number;cut:PreparedCut}[];error?:string}
/** Worker code calls only pure geometry; no Rapier/DOM/time dependencies. */
export function prepareRowJob(job:RowWorkerJob):RowWorkerResult {
 return {id:job.id,cuts:job.parts.map(p=>({id:p.id,cut:prepareRowCut(p.poly,rotate(vec(0,1,0),conjugate(p.pose.rotation)),job.rows.map(r=>({lower:r-p.pose.position.y,upper:r+1-p.pose.position.y})),true)}))};
}
export function samePose(a:Pose,b:Pose){return a.position.x===b.position.x&&a.position.y===b.position.y&&a.position.z===b.position.z&&a.rotation.x===b.rotation.x&&a.rotation.y===b.rotation.y&&a.rotation.z===b.rotation.z&&a.rotation.w===b.rotation.w;}
/** Identity (geometry revision) + exact pose validation, never epsilon reuse.
 * Request IDs reject out-of-order answers; current world filters missing/new parts. */
export class RowPreparationCache implements CutPreparationLookup {
 private nextId=0;private pending:{job:RowWorkerJob;sources:Map<number,ConvexPolyhedron>}|null=null;
 private ready:{rows:number[];entries:Map<number,{poly:ConvexPolyhedron;pose:Pose;cut:PreparedCut}>}|null=null;
 hits=0;misses=0;stale=0;replies=0;
 request(parts:Iterable<Part>,rows:number[]):RowWorkerJob {
  const source=[...parts].filter(p=>p.owner==='npc'),job={id:++this.nextId,rows:[...rows],parts:source.map(p=>({id:p.id,poly:p.poly,pose:{position:{...p.body.translation()},rotation:{...p.body.rotation()}}}))};
  this.pending={job,sources:new Map(source.map(p=>[p.id,p.poly]))};return job;
 }
 accept(result:RowWorkerResult){
  const pending=this.pending;if(!pending||pending.job.id!==result.id){this.stale++;return;}
  this.pending=null;if(result.error)return;
  const cuts=new Map(result.cuts.map(p=>[p.id,p.cut]));
  this.ready={rows:pending.job.rows,entries:new Map(pending.job.parts.flatMap(p=>{const cut=cuts.get(p.id);return cut?[[p.id,{poly:pending.sources.get(p.id)!,pose:p.pose,cut}] as const]:[]}))};this.replies++;
 }
 get(source:Part,pose:Pose,rows:readonly number[]):PreparedCut|undefined {
  const ready=this.ready,entry=ready?.entries.get(source.id);
  if(!ready||ready.rows.length!==rows.length||ready.rows.some((r,i)=>r!==rows[i])||!entry||entry.poly!==source.poly||!samePose(entry.pose,pose)){this.misses++;return;}
  this.hits++;return entry.cut;
 }
 reset(){this.pending=this.ready=null;this.hits=this.misses=this.stale=this.replies=0;this.nextId++;}
 get busy(){return !!this.pending;}
 get snapshot(){return {hits:this.hits,misses:this.misses,stale:this.stale,replies:this.replies,pending:!!this.pending,preparedParts:this.ready?.entries.size??0};}
}
