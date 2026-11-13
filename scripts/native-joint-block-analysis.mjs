// Read-only reconstruction of the native modified Gram-Schmidt joint rows.
// No Rapier imports, mutations or changes to solver parameters.
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const scale=(a,k)=>a.map(x=>x*k);
const maxAbs=a=>Math.max(0,...a.map(Math.abs));
const jac=r=>[...r.linearJacobian,...r.angularJacobian1,...r.angularJacobian2];
const impulseJac=r=>[
 ...r.linearJacobian.map((x,i)=>x*(r.inverseMass1[i]+r.inverseMass2[i])),
 ...r.inverseInertiaJacobian1,...r.inverseInertiaJacobian2];
const inner=(a,b)=>dot(jac(a),impulseJac(b));
const rowId=r=>`${r.kind}:${r.axis}`;
const blockKey=r=>`${r.island}:${r.pipeline.pass}:${r.phase.group}:${r.phase.substep}:${r.jointIndex}`;
const grouping=(rows,event)=>{
 const result=new Map();
 for(const r of rows.filter(r=>r.event===event)){const key=blockKey(r);if(!result.has(key))result.set(key,[]);result.get(key).push(r);}
 return result;
};
const velocityResidual=(r,v1,v2,rhs)=>dot(r.linearJacobian,sub(v2.linear,v1.linear))+dot(r.angularJacobian2,v2.angular)-dot(r.angularJacobian1,v1.angular)+rhs;
export function reconstructJointBlock(before,after){
 if(!before.length||before.length!==after.length)throw Error('Incomplete joint assembly block');
 before=before.toSorted((a,b)=>a.ordinal-b.ordinal);after=after.toSorted((a,b)=>a.ordinal-b.ordinal);
 if(before.some((r,i)=>rowId(r)!==rowId(after[i])))throw Error('Mismatched native row identities');
 const size=before.length,work=before.map(r=>structuredClone(r)),transform=before.map((_,i)=>Array.from({length:size},(_,j)=>Number(i===j)));
 const fields=['linearJacobian','angularJacobian1','angularJacobian2','inverseInertiaJacobian1','inverseInertiaJacobian2'];
 const diagonal=[];
 for(let j=0;j<size;j++){
  const c=work[j],k=inner(c,c);diagonal.push(k);
  // Same condition as native: only unlimited locked rows are eliminated.
  if(c.bounds[0]!==-3.4028234663852886e38||c.bounds[1]!==3.4028234663852886e38)continue;
  for(let i=j+1;i<size;i++){
   const coefficient=k===0?0:inner(work[i],c)/k;
   for(const f of fields)work[i][f]=sub(work[i][f],scale(c[f],coefficient));
   work[i].rhs-=c.rhs*coefficient;work[i].rhsWithoutBias-=c.rhsWithoutBias*coefficient;
   transform[i]=sub(transform[i],scale(transform[j],coefficient));
  }
 }
 const denominator=Math.max(1,...before.flatMap(jac).map(Math.abs));
 const jacobianError=Math.max(...work.map((r,i)=>maxAbs(sub(jac(r),jac(after[i])))/denominator));
 const rhsError=Math.max(...work.map((r,i)=>Math.abs(r.rhs-after[i].rhs)/Math.max(1,Math.abs(r.rhs),Math.abs(after[i].rhs))));
 const inverseMassError=Math.max(...after.map((r,i)=>Math.abs(r.effectiveMass-1/(diagonal[i]*(1+r.cfmCoefficient)))/Math.max(1,Math.abs(r.effectiveMass))));
 const offDiagonal=Math.max(0,...work.flatMap((a,i)=>work.slice(i+1).filter(b=>a.kind==='dof'&&b.kind==='dof').map(b=>Math.abs(inner(a,b))/Math.sqrt(Math.abs(inner(a,a)*inner(b,b))))));
 return {before,after,transform,jacobianError,rhsError,inverseMassError,lockedNormalizedCrossTerm:offDiagonal};
}
export function analyzeJointBlocks(trace){
 const assemblyBefore=grouping(trace.rows,'joint-block-before'),assemblyAfter=grouping(trace.rows,'joint-block-after');
 const solveAfter=grouping(trace.rows,'joint-block-solve-after');
 // Every internal substep has a biased and relaxed solve at identical geometry.
 // Keep individual passes separated rather than interleaving row ordinals.
 const results=[];
 for(const [key,before] of assemblyBefore){
  const after=assemblyAfter.get(key);if(!after)throw Error(`Missing transformed block ${key}`);
  const reconstruction=reconstructJointBlock(before,after),solves=solveAfter.get(key)??[];
  const passResults=[];
  for(const pass of ['bias','relax']){
   const passRows=solves.filter(r=>r.phase.pass===pass).filter(r=>before.some(b=>rowId(b)===rowId(r)));
   if(passRows.length!==before.length)throw Error(`Incomplete ${pass} solve block ${key}`);
   const maxOrdinal=Math.max(...passRows.map(r=>r.ordinal));
   const endRow=passRows.find(r=>r.ordinal===maxOrdinal);
   const v1=endRow.velocity1,v2=endRow.velocity2;
   const originalResidual=before.toSorted((a,b)=>a.ordinal-b.ordinal).map(r=>velocityResidual(r,v1,v2,pass==='relax'?r.rhsWithoutBias:r.rhs));
   const transformedResidual=after.toSorted((a,b)=>a.ordinal-b.ordinal).map(r=>velocityResidual(r,v1,v2,pass==='relax'?r.rhsWithoutBias:r.rhs));
   const predictedResidual=reconstruction.transform.map(t=>dot(t,originalResidual));
   const residualError=Math.max(...predictedResidual.map((v,i)=>Math.abs(v-transformedResidual[i])/Math.max(1,Math.abs(v),Math.abs(transformedResidual[i]))));
   const locked=before.map((r,i)=>r.kind==='dof'?Math.abs(originalResidual[i]):0);
   const transformedLocked=after.map((r,i)=>r.kind==='dof'?Math.abs(transformedResidual[i]):0);
   passResults.push({pass,originalResidual,transformedResidual,residualError,maxLockedResidual:maxAbs(locked),maxTransformedLockedResidual:maxAbs(transformedLocked)});
  }
  results.push({key,pipelinePass:before[0].pipeline.pass,substep:before[0].phase.substep,jointIndex:before[0].jointIndex,
   transform:reconstruction.transform,jacobianError:reconstruction.jacobianError,rhsError:reconstruction.rhsError,inverseMassError:reconstruction.inverseMassError,lockedNormalizedCrossTerm:reconstruction.lockedNormalizedCrossTerm,
   originalRhs:before.map(r=>({kind:r.kind,axis:r.axis,rhs:r.rhs})),transformedRhs:after.map(r=>({kind:r.kind,axis:r.axis,rhs:r.rhs})),passes:passResults});
 }
 return {blocks:results.length,maxJacobianError:Math.max(0,...results.map(r=>r.jacobianError)),maxRhsError:Math.max(0,...results.map(r=>r.rhsError)),maxInverseMassError:Math.max(0,...results.map(r=>r.inverseMassError)),
 maxResidualTransformError:Math.max(0,...results.flatMap(r=>r.passes.map(p=>p.residualError))),results};
}
