import {expect,it} from 'vitest';
import fixture from '../fixtures/impulse-convergence-rejection.json';
it('does not mistake the local joint replay convergence for world-safe production physics',()=>{
 const local=fixture.reports.find(r=>r.stem==='joint-limit-impact'&&r.pgs===4)!;
 expect(local.observerExact).toBe(true);expect(local.candidate.worldAngular).toBeLessThan(35);
 expect(fixture.worldGate.maxAngularSpeed).toBeGreaterThan(35);expect(fixture.worldGate.kccSeedsFailed).toEqual([17,42]);
 expect(fixture.worldGate.productionAdopted).toBe(false);
});
it('retains both velocity gates across the thin world, not just its improved incident body',()=>{
 const thin=fixture.reports.filter(r=>r.stem==='thin-contact-impact');expect(thin).toHaveLength(4);
 for(const r of thin){expect(r.observerExact).toBe(true);expect(r.candidate.incidentAngular).toBeLessThan(35);expect(r.candidate.worldSpeed).toBeGreaterThan(25);expect(r.strictOneStepPass).toBe(false);}
});
