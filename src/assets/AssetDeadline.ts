export const ASSET_DECODE_TIMEOUT_MS=5000;
export class AssetTimeoutError extends Error {
 constructor(milliseconds:number){super(`Asset decode timed out after ${milliseconds} ms`);this.name='AssetTimeoutError';}
}
/** Bounds waiting, not CPU execution. Browser codecs cannot be forcibly canceled;
 * callers must retain ownership of resources returned after the deadline. */
export class AssetDeadline {
 expired=false;private started:number|null=null;
 constructor(readonly milliseconds=ASSET_DECODE_TIMEOUT_MS){if(!Number.isFinite(milliseconds)||milliseconds<1||milliseconds>60000)throw Error('Invalid asset decode timeout');}
 async run<T>(operation:Promise<T>):Promise<T>{
  this.started??=performance.now();
  const remaining=Math.max(0,this.milliseconds-(performance.now()-this.started));
  let timer:ReturnType<typeof setTimeout>|undefined;
  const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{this.expired=true;reject(new AssetTimeoutError(this.milliseconds));},remaining);});
  try{return await Promise.race([operation,timeout]);}finally{clearTimeout(timer);}
 }
}
