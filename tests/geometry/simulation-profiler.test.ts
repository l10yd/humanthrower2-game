import { describe,expect,it,vi } from 'vitest';
import { SimulationProfiler,summarizeTimings } from '../../src/core/SimulationProfiler';
describe('opt-in simulation CPU profiling',()=>{
 it('returns work results and does not read clocks or retain disabled samples',()=>{
  const clock=vi.spyOn(performance,'now'),p=new SimulationProfiler();
  try{p.begin();expect(p.measure('physics',()=>42)).toBe(42);p.end();expect(clock).not.toHaveBeenCalled();expect(p.snapshot.timings).toEqual({});}finally{clock.mockRestore();}
 });
 it('bounds samples, accumulates repeated labels and records failures without swallowing them',()=>{
  let time=0;const clock=vi.spyOn(performance,'now').mockImplementation(()=>time),p=new SimulationProfiler(2);p.enabled=true;
  try{
   for(let n=0;n<3;n++){p.begin();p.measure('solver',()=>{time+=1;});p.measure('solver',()=>{time+=2;});p.end();}
   expect(p.snapshot.timings.solver).toEqual({count:2,mean:3,p50:3,p95:3,p99:3,max:3});
   p.begin();expect(()=>p.measure('failed',()=>{time+=4;throw Error('original');})).toThrow('original');p.end();expect(p.snapshot.timings.failed.max).toBe(4);
   p.reset();expect(p.snapshot.timings).toEqual({});
  }finally{clock.mockRestore();}
 });
 it('reports actual invocation percentiles, including empty samples',()=>{
  expect(summarizeTimings([])).toEqual({count:0,mean:0,p50:0,p95:0,p99:0,max:0});
  expect(summarizeTimings([5,1,3]).mean).toBe(3);expect(()=>new SimulationProfiler(0)).toThrow();
 });
});
