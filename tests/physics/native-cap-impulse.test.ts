import {describe,it,expect} from 'vitest';
import fixture from '../fixtures/native-cap-impulse-causal.json';
// @ts-expect-error Plain-JS read-only diagnostic, deliberately outside runtime.
import {capImpulseDiscontinuities,checkRowEquation,summarizeTrace} from '../../scripts/native-row-analysis.mjs';
const norm=(v:number[])=>Math.hypot(...v);
describe('native angular cap / stored impulse causal evidence (not runtime acceptance)',()=>{
 for(const variant of ['baseline','exact'])it(`${variant}: capped velocity and unchanged impulses produce opposite relax kick`,()=>{
  const captured=fixture.cases.find(c=>c.name==='published-equivalent'&&c.variant===variant)!;
  const discontinuity=capImpulseDiscontinuities(captured.trace)[0];
  expect(discontinuity.removedMagnitude).toBeGreaterThan(variant==='exact'?3000:1000);
  expect(discontinuity.releaseAlignment).toBeLessThan(-.9999);
  expect(discontinuity.zeroLimitNonzeroReleases.map((r:{event:string})=>r.event)).toEqual(['contact-twist-solve','contact-tangent-solve']);
  for(const row of captured.trace.rows){const equation=checkRowEquation(row);if(!equation)continue;expect(equation.finite).toBe(true);expect(equation.velocityRelativeError).toBeLessThan(.002);}
  expect(captured.angular).toBeGreaterThan(35);
 });
 for(const variant of ['baseline','exact'])it(`${variant}: pose-only cap keeps solver accounting consistent locally, but is not a production fix`,()=>{
  const captured=fixture.cases.find(c=>c.name==='pose-cap-rejected'&&c.variant===variant)!;
  expect(capImpulseDiscontinuities(captured.trace)).toEqual([]);
  const integration=captured.trace.rows.find(r=>r.event==='body-pose-integration-velocity')!;
  expect(norm(integration.angular!)).toBeLessThanOrEqual(integration.maxAngularVelocity!+1e-4);
  expect(captured.angular).toBeLessThan(3); // Local one-step measurement only.
  const equations=summarizeTrace(captured.trace).equations;expect(equations.finite).toBe(true);expect(equations.maxVelocityRelativeError).toBeLessThan(.002);
 });
 it('longer natural worlds refute promoting the locally successful pose-only cap',()=>{
  const original=fixture.natural.find(r=>r.name==='baseline')!,candidate=fixture.natural.find(r=>r.name==='pose-cap-rejected')!;
  expect(original.complete).toBe(true);expect(candidate.complete).toBe(true);
  for(const run of candidate.runs){expect(run.error).toBeNull();expect(run.numericFaults).toBe(0);}
  // Finite/diagnostic success does not mean passing 25m/s and 35rad/s.
  for(const seed of [42,93]){
   const old=original.runs.find(r=>r.seed===seed)!,next=candidate.runs.find(r=>r.seed===seed)!;
   expect(next.maxSpeed).toBeGreaterThan(25);expect(next.maxAngularSpeed).toBeGreaterThan(35);
   expect(next.maxAngularSpeed).toBeGreaterThan(old.maxAngularSpeed*100);
  }
 });
 it('a tampered row fails the read-only impulse equation check',()=>{
  const captured=fixture.cases[0].trace.rows.find(r=>r.event==='contact-twist-solve')!,row=structuredClone(captured);
  row.after2!.angular[0]+=100;
  expect(checkRowEquation(row).velocityRelativeError).toBeGreaterThan(.002);
 });
});
