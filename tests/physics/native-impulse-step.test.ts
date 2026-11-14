import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
// @ts-expect-error pure research JS module
import {feasibleImpulseScale,applyFeasibleStep} from '../../scripts/impulse-step-analysis.mjs';
const fixture=JSON.parse(await readFile('tests/fixtures/native-impulse-step-candidate.json','utf8'));
it('uses one common impulse coefficient for both bodies and permits ordinary unsaturated steps',()=>{
 expect(feasibleImpulseScale([0,0,0],[0,0,0],[1,2,3],[-1,-2,-3],100)).toBe(1);
 const scale=feasibleImpulseScale([0,0,0],[0,0,0],[0,0,200],[0,0,-100],100);
 expect(scale).toBeCloseTo(.499995);expect(Math.hypot(200*scale)).toBeLessThan(100);expect(Math.hypot(100*scale)).toBeLessThan(100);
 expect(feasibleImpulseScale([0,0,120],[0,0,0],[0,0,-20],[0,0,0],100)).toBe(1);
 expect(feasibleImpulseScale([0,0,120],[0,0,0],[0,0,20],[0,0,0],100)).toBe(0);
 expect(()=>feasibleImpulseScale([NaN,0,0],[0,0,0],[0,0,0],[0,0,0],100)).toThrow();
});
it('an unconstrained float32 lane is returned unchanged, including when re-association would lose digits',()=>{
 const before=[1e8,1e8,1e8],proposed=[1,2,3];expect(applyFeasibleStep(before,proposed,1)).toBe(proposed);
 expect(Math.fround(before[0]+Math.fround(proposed[0]-before[0]))).not.toBe(proposed[0]);
});
it('pins elimination of the local rotation-cap discontinuity without declaring world stability',()=>{
 const caps=(rows:any[])=>rows.filter(r=>r.event==='body-after-native-cap').map(r=>{
  const before=rows.find(s=>s.event==='body-before-integrate'&&s.phase.substep===r.phase.substep);
  return Math.hypot(...before.angular.map((v:number,i:number)=>v-r.angular[i]));
 });
 expect(Math.max(...caps(fixture.baselineRows))).toBeGreaterThan(1000);expect(Math.max(...caps(fixture.candidateRows))).toBe(0);
 const thin=fixture.reports.find((r:any)=>r.stem==='thin-contact-impact'&&r.variant==='baseline');
 expect(thin.candidateAngular).toBeLessThan(35);expect(thin.observerSnapshotExact).toBe(true);
 const joint=fixture.reports.find((r:any)=>r.stem==='joint-limit-impact');expect(joint.candidateWorldAngular).toBeGreaterThan(35);
 expect(fixture.worldGate.candidateAngular).toBeGreaterThan(fixture.worldGate.baselineAngular);expect(fixture.worldGate.candidateSpeed).toBeGreaterThan(25);expect(fixture.worldGate.productionAdopted).toBe(false);
});
