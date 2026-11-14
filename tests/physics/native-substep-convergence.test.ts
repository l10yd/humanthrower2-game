import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
// @ts-expect-error independent JS diagnostic module
import {analyzeNativeSubsteps} from '../../scripts/native-substep-analysis.mjs';
const fixture=JSON.parse(await readFile('tests/fixtures/native-substep-convergence.json','utf8'));
it('independently verifies point velocity, quaternion pose integration and retained CCD substeps',()=>{
 const r=analyzeNativeSubsteps(fixture.trace);expect(r).toEqual(fixture.expected);
 expect(r.maxPointVelocityError).toBeLessThan(2e-4);expect(r.maxPredictionError).toBeLessThan(2e-5);expect(r.maxIntegrationError).toBe(0);
 expect(fixture.baseline.exactToPublished).toBe(true);expect(fixture.baseline.observerSnapshotExact).toBe(true);
});
it('pins contact-after-joint drift and short remainder amplification without calling it an orthogonalization bug',()=>{
 const r=analyzeNativeSubsteps(fixture.trace),first=r.substeps.find((s:any)=>s.pipeline===1&&s.joint===42),second=r.substeps.find((s:any)=>s.pipeline===2&&s.joint===42);
 expect(first.afterAllJoints).toBeLessThan(.0015);expect(first.afterContacts).toBeGreaterThan(.0034);expect(first.contactReintroducedDistance).toBeGreaterThan(.0019);
 expect(second.relativeSpeedAfterContacts).toBeGreaterThan(117);expect(first.dt/second.dt).toBeGreaterThan(9);
 expect(fixture.baseline.incidentAngular).toBeGreaterThan(35);
});
it('fails closed on missing events, truncated trace or tampered pose/velocity',()=>{
 for(const mutation of [(r:any)=>{r.trace.dropped=1;},(r:any)=>{r.trace.rows.pop();},(r:any)=>{r.trace.rows[0].pointVelocity1[0]+=1;},(r:any)=>{r.trace.rows[0].predictedAnchor1[0]+=1;}]){
  const r=structuredClone(fixture);mutation(r);expect(()=>analyzeNativeSubsteps(r.trace)).toThrow();
 }
});
