import {expect,it} from 'vitest';
import fixture from '../fixtures/jolt-comparison-rejection.json';
it('does not call low angular speed with altered tiny inertia an exact-physics pass',()=>{
 const baseline=fixture.runs.find(r=>!r.options?.preservePrincipal)!.cases[0];
 expect(baseline.velocityPass).toBe(true);expect(baseline.mapping.maxTensorRelative).toBeGreaterThan(1000);expect(baseline.strictPass).toBe(false);
 const detail=baseline.details![0];expect(detail.actualTensor[0][0]).toBeCloseTo(.4*detail.actualMass,14);
});
it('native principal preservation and geometry-exact tensor still fail the unchanged angular limit',()=>{
 const runs=fixture.runs.filter(r=>r.options?.preservePrincipal);expect(runs).toHaveLength(3);
 for(const run of runs){const thin=run.cases[0];expect(thin.mapping.maxTensorRelative).toBeLessThan(1e-6);expect(thin.maxAngular).toBeGreaterThan(35);expect(thin.strictPass).toBe(false);}
 expect(fixture.productionAdopted).toBe(false);
});
it('comparison preserves whole pile counts, numeric limits and mass but never promotes failed drift/velocity gates',()=>{
 for(const run of fixture.runs){const pile=run.cases[1];expect(pile.parts).toBe(220);expect(pile.mapping.maxMassRelative).toBeLessThan(1e-6);expect(pile.mapping.maxTensorRelative).toBeLessThan(1e-6);expect(pile.maxAngular).toBeGreaterThan(35);expect(pile.maxDrift).toBeGreaterThan(.1);expect(pile.strictPass).toBe(false);}
});
