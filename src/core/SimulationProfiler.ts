export interface TimingSummary {count:number;mean:number;p50:number;p95:number;p99:number;max:number}
export function summarizeTimings(values:readonly number[]):TimingSummary {
 const sorted=[...values].sort((a,b)=>a-b),n=sorted.length;
 const percentile=(p:number)=>sorted[Math.min(n-1,Math.floor(n*p))]??0;
 return {count:n,mean:n?sorted.reduce((s,n)=>s+n,0)/n:0,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max:sorted.at(-1)??0};
}
/** Opt-in, bounded CPU diagnostics. Labels may be nested; never sum their p95s.
 * No clocks, samples or sorting on the normal disabled path. */
export class SimulationProfiler {
 enabled=false;
 private current=new Map<string,number>();private samples=new Map<string,number[]>();
 private tickStarted=0;
 constructor(readonly capacity=600){if(!Number.isInteger(capacity)||capacity<1)throw Error('Invalid profiler capacity');}
 begin(){if(!this.enabled)return;this.current.clear();this.tickStarted=performance.now();}
 measure<T>(label:string,work:()=>T):T {
  if(!this.enabled)return work();const start=performance.now();
  try{return work();}finally{this.current.set(label,(this.current.get(label)??0)+performance.now()-start);}
 }
 end(){
  if(!this.enabled)return;
  this.current.set('fixedTotal',performance.now()-this.tickStarted);
  // Missing labels have no sample: occupancy percentiles describe actual calls,
  // not 60Hz ticks padded with zeros. Multiple calls in a tick are accumulated.
  for(const [label,value]of this.current){
   let values=this.samples.get(label);if(!values)this.samples.set(label,values=[]);
   if(values.length===this.capacity)values.shift();values.push(value);
  }
 }
 reset(){this.current.clear();this.samples.clear();}
 get snapshot(){return {enabled:this.enabled,capacity:this.capacity,timings:Object.fromEntries([...this.samples].map(([label,values])=>[label,summarizeTimings(values)]))};}
}
