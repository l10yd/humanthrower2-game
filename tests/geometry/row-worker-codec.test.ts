import {expect,it,vi} from 'vitest';
import {RowPreparationWorker} from '../../src/slicing/RowPreparationWorker';
import type {Row} from '../../src/grid/RowDetector';
it('stuck Worker is bounded and falls back without waiting at commit',()=>{
 let terminated=0;
 vi.stubGlobal('Worker',class {postMessage(){}terminate(){terminated++;}});
 const service=new RowPreparationWorker(true),rows:Row[]=[{index:1,state:'ARMED',since:0,fireAt:1}];
 try{service.update([],rows,.7);expect(service.cache.busy).toBe(true);service.update([],rows,1.21);expect(service.unavailable).toBe(true);expect(terminated).toBe(1);expect(service.cache.busy).toBe(false);}
 finally{service.dispose();vi.unstubAllGlobals();}
});
import {box,clip} from '../../src/slicing/ConvexClipper';
import {packRowJob,unpackRowJob,packRowResult,unpackRowResult} from '../../src/slicing/RowWorkerCodec';
import {prepareRowJob} from '../../src/slicing/RowPreparationCache';
import {vec,identity} from '../../src/slicing/Math';
it('float64 transfer preserves arbitrary corners, UVs, caps, rows and quaternion inputs exactly',()=>{
 const poly=clip(box(.23,.72,.19),vec(1,.2,.3),.13)!;
 const job={id:5,rows:[1,3],parts:[{id:7,poly,pose:{position:vec(.000000012345,1.45678912345,0),rotation:{...identity,z:.12345678912345}}}]};
 const packed=packRowJob(job),received=structuredClone(packed,{transfer:[packed.corners.buffer,packed.poses.buffer]});
 expect(packed.corners.byteLength).toBe(0);expect(unpackRowJob(received)).toEqual(job);
 const result=prepareRowJob(job),encoded=packRowResult(result),decoded=structuredClone(encoded,{transfer:[encoded.corners.buffer]});
 expect(unpackRowResult(decoded)).toEqual(result);
});
