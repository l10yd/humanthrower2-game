import {it,expect} from 'vitest';
import fixture from '../fixtures/native-joint-block-equivalence.json';
// @ts-expect-error Plain JS offline read-only analysis, never imported by game.
import {analyzeJointBlocks} from '../../scripts/native-joint-block-analysis.mjs';
const report=()=>analyzeJointBlocks(fixture.trace);
it('native block row transformation preserves Jacobians, RHS and residuals on both CCD intervals',()=>{
 const r=report();expect(r.blocks).toBe(8);
 expect(r.maxJacobianError).toBeLessThan(1e-4);expect(r.maxRhsError).toBeLessThan(1e-4);expect(r.maxInverseMassError).toBeLessThan(1e-4);expect(r.maxResidualTransformError).toBeLessThan(1e-4);
 expect(fixture.observer.exactToPublished).toBe(true);expect(fixture.observer.observerSnapshotExact).toBe(true);expect(fixture.observer.dropped).toBe(0);
});
it('the original locked rows are satisfied after the local block solve, not merely transformed rows',()=>{
 for(const block of report().results)for(const pass of block.passes){
  expect(pass.maxLockedResidual).toBeLessThan(.002);expect(pass.maxTransformedLockedResidual).toBeLessThan(.002);
 }
});
it('large transformed angular bias is explained by the locked linear rows, not an incorrect Gram-Schmidt operation',()=>{
 const block=report().results.find((r:{jointIndex:number;pipelinePass:number;substep:number})=>r.jointIndex===42&&r.pipelinePass===2&&r.substep===0)!;
 expect(block.originalRhs.find((r:{axis:number;kind:string})=>r.kind==='limit'&&r.axis===4).rhs).toBe(-3);
 expect(block.transformedRhs.find((r:{axis:number;kind:string})=>r.kind==='limit'&&r.axis===4).rhs).toBeGreaterThan(100);
 expect(Math.abs(block.originalRhs[0].rhs)).toBeGreaterThan(130);expect(block.rhsError).toBeLessThan(1e-4);
});
it('shoulder anchor drift occurs before CCD clamping and is corrected by the short remainder',()=>{
 const first=fixture.geometry.filter(r=>r.pipeline.pass===1&&r.jointHandle[0]===42);
 const before=first.find(r=>r.stage==='before-solve')!,afterSolve=first.find(r=>r.stage==='after-solve-before-ccd')!,afterCcd=first.find(r=>r.stage==='after-ccd')!;
 expect(before.anchorDistance).toBeLessThan(.003);expect(afterSolve.nextAnchorDistance).toBeGreaterThan(.011);
 expect(afterCcd.nextFrame1).toEqual(afterSolve.nextFrame1);expect(afterCcd.nextFrame2).toEqual(afterSolve.nextFrame2);
 const second=fixture.geometry.find(r=>r.pipeline.pass===2&&r.jointHandle[0]===42&&r.stage==='after-advance')!;
 expect(second.anchorDistance).toBeLessThan(1e-5);
});
it('CCD observer has a positive control: real fast-body impact produces a recorded clamp',()=>{
 expect(fixture.positiveCcd.exactPublished).toBe(true);expect(fixture.positiveCcd.observerSnapshotExact).toBe(true);
 expect(fixture.positiveCcd.clamps).toHaveLength(1);expect(fixture.positiveCcd.clamps[0].fraction).toBeGreaterThan(0);expect(fixture.positiveCcd.clamps[0].fraction).toBeLessThan(1);
});
it('corrupt or incomplete transformed blocks cannot silently pass',()=>{
 const corrupted=structuredClone(fixture.trace),row=corrupted.rows.find(r=>r.event==='joint-block-after')!;row.rhs+=1;
 expect(analyzeJointBlocks(corrupted).maxRhsError).toBeGreaterThan(1e-4);
 const missing=structuredClone(fixture.trace);missing.rows.splice(missing.rows.findIndex(r=>r.event==='joint-block-after'),1);
 expect(()=>analyzeJointBlocks(missing)).toThrow(/Incomplete/);
});
