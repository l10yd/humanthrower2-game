import { describe, expect, it } from 'vitest';
import { DropScheduler } from '../../src/npc/DropScheduler';
import { CONFIG } from '../../src/core/Config';
describe('chaos event schedule',()=>{
  it('schedules every half second, warns .9s ahead and accelerates short bursts',()=>{
    const s=new DropScheduler();expect(s.tick(2.99,0,()=>0)).toBeNull();
    expect(s.tick(3,0,()=>1)).toEqual({at:3,delay:.9,double:false});
    expect(s.tick(3.49,0,()=>1)).toBeNull();expect(s.tick(3.5,0,()=>1)).not.toBeNull();
    expect(s.tick(12,0,()=>0)?.double).toBe(true);expect(s.burst).toBe(true);expect(s.next).toBeCloseTo(12.2);
    expect(s.tick(16,0,()=>0)?.double).toBe(false);expect(s.next).toBe(16.5);
  });
 it('clock quantization does not progressively turn half-second drops into .517s',()=>{
  const s=new DropScheduler();s.nextBurst=1e9;const times:number[]=[];
  for(let i=0;i<600;i++){const now=i/60;if(s.tick(now,0,()=>1))times.push(now);}
  expect(times.length).toBe(14);for(let i=1;i<times.length;i++)expect(times[i]-times[i-1]).toBeCloseTo(.5,10);
 });
 it('bounds pending drops and has no catch-up flood',()=>{
    const s=new DropScheduler();expect(s.tick(12,CONFIG.spawn.maxPending,()=>0)).toBeNull();
    expect(s.tick(12,0,()=>0)).toBeNull();expect(s.tick(100,0,()=>1)).not.toBeNull();expect(s.tick(100,0,()=>1)).toBeNull();
  });
});
