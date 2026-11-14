import {prepareRowJob} from './RowPreparationCache';
import {unpackRowJob,packRowResult,type PackedRowJob} from './RowWorkerCodec';
const worker=self as unknown as {onmessage:((e:MessageEvent<PackedRowJob>)=>void)|null;postMessage:(message:unknown,transfer:Transferable[])=>void};
worker.onmessage=e=>{try{const result=packRowResult(prepareRowJob(unpackRowJob(e.data)));worker.postMessage(result,[result.corners.buffer]);}catch(error){const result=packRowResult({id:e.data.id,cuts:[],error:String(error)});worker.postMessage(result,[result.corners.buffer]);}};
