import {expect,it} from 'vitest';
import fixture from '../fixtures/recovery-route-barrier.json';
it('distinguishes initial contact-direction conflicts from later swept obstacles at the captured recovery barrier',()=>{
 const blockers=fixture.captured.probe.blockers;
 expect(blockers.some(b=>b.startDistance!==null&&b.startDistance<0&&b.separating!==null&&b.separating<0&&b.toi===0)).toBe(true);
 expect(blockers.some(b=>b.startDistance===null&&b.toi!==null&&b.toi>0&&b.toi<1)).toBe(true);
 expect(fixture.captured.members).toHaveLength(7);expect(fixture.captured.unchanged).toBe(true);
});
it('reports bounded coordinated search as exhausted, not a proof that no route exists or a safe unchecked plan',()=>{
 expect(fixture.captured.work.exhausted).toBe(true);expect(fixture.captured.work.narrowTests).toBeLessThanOrEqual(2000);expect(fixture.captured.work.narrowTests).toBeGreaterThan(1900);expect(fixture.captured.plan).toBeNull();expect(fixture.productionAdopted).toBe(false);
 const initial=fixture.projectionHistory[0].delta,last=fixture.projectionHistory.at(-1)!.delta;
 expect(Math.hypot(last.x,last.y,last.z)).toBeLessThan(Math.hypot(initial.x,initial.y,initial.z)*1e-5);
});
