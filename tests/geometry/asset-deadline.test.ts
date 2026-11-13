import {it,expect,vi} from 'vitest';
import {AssetDeadline,AssetTimeoutError} from '../../src/assets/AssetDeadline';
it('deadline returns successful results and clears the watchdog',async()=>{
 vi.useFakeTimers();try{const d=new AssetDeadline(100);expect(await d.run(Promise.resolve(42))).toBe(42);expect(d.expired).toBe(false);expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}
});
it('deadline rejects never-settling decoding without waiting on cleanup',async()=>{
 vi.useFakeTimers();try{const d=new AssetDeadline(100),pending=d.run(new Promise(()=>{}));const assertion=expect(pending).rejects.toBeInstanceOf(AssetTimeoutError);await vi.advanceTimersByTimeAsync(100);await assertion;expect(d.expired).toBe(true);expect(vi.getTimerCount()).toBe(0);}finally{vi.useRealTimers();}
});
it('successive decoding stages share one timeout budget',async()=>{
 vi.useFakeTimers();try{const d=new AssetDeadline(100);await d.run(Promise.resolve());await vi.advanceTimersByTimeAsync(70);const pending=d.run(new Promise(()=>{})),assertion=expect(pending).rejects.toBeInstanceOf(AssetTimeoutError);await vi.advanceTimersByTimeAsync(30);await assertion;expect(d.expired).toBe(true);}finally{vi.useRealTimers();}
});
it('decoder errors preserve their original reason and invalid timeout values fail early',async()=>{
 const d=new AssetDeadline(100);await expect(d.run(Promise.reject(Error('codec')))).rejects.toThrow('codec');expect(d.expired).toBe(false);
 for(const timeout of [0,-1,Infinity,NaN,60001])expect(()=>new AssetDeadline(timeout)).toThrow('timeout');
});
