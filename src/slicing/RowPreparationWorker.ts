import type {Part} from '../physics/PhysicsManager';
import type {Row} from '../grid/RowDetector';
import {RowPreparationCache} from './RowPreparationCache';
import {packRowJob,unpackRowResult,type PackedRowResult} from './RowWorkerCodec';
/** Bounded optional preflight. Commit never waits for a Worker or trusts stale
 * poses. No worker replies influence the clear time, gameplay clocks or RNG. */
export class RowPreparationWorker {
 readonly cache=new RowPreparationCache();private worker:Worker|null=null;private nextRequest=0;private requestedAt=0;
 constructor(readonly enabled=false){}
 unavailable=false;error:string|null=null;
 update(parts:Iterable<Part>,rows:Row[],now:number){
  if(!this.enabled)return;
  // Simulation-time watchdog only disables this optimization; the transaction
  // still recomputes synchronously at its original deadline on every machine.
  if(this.cache.busy&&now-this.requestedAt>.5){this.fail('Geometry Worker did not answer within preparation window');return;}
  const armed=rows.filter(r=>r.state==='ARMED');if(!armed.length||this.unavailable||this.cache.busy||now<this.nextRequest)return;
  const first=Math.min(...armed.map(r=>r.fireAt));
  // Prepare the exact group of rows due in the same fixed tick, during warning.
  const indices=armed.filter(r=>Math.abs(r.fireAt-first)<1e-8).map(r=>r.index).sort((a,b)=>a-b);
  if(now<first-.4)return;
  try{
   if(!this.worker){
    this.worker=new Worker(new URL('./RowPreparation.worker.ts',import.meta.url),{type:'module'});
    this.worker.onmessage=(e:MessageEvent<PackedRowResult>)=>{try{if(e.data.error)this.fail(e.data.error);else this.cache.accept(unpackRowResult(e.data));}catch(error){this.fail(String(error));}};
    this.worker.onerror=e=>{e.preventDefault();this.fail(e.message);};
   }
   const message=packRowJob(this.cache.request(parts,indices));this.worker.postMessage(message,[message.corners.buffer,message.poses.buffer]);this.nextRequest=now+.2;this.requestedAt=now;
  }catch(error){this.fail(String(error));}
 }
 private fail(message:string){this.error=message;this.unavailable=true;this.worker?.terminate();this.worker=null;this.cache.reset();}
 reset(){this.worker?.terminate();this.worker=null;this.cache.reset();this.nextRequest=this.requestedAt=0;this.unavailable=false;this.error=null;}
 get snapshot(){return {...this.cache.snapshot,enabled:this.enabled,unavailable:this.unavailable,error:this.error};}
 dispose(){this.reset();this.unavailable=true;}
}
