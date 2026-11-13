// Pure read-only analysis of isolated native row captures. Never imports Rapier.
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const norm=a=>Math.hypot(...a);
const clamp=(x,lo,hi)=>Math.min(hi,Math.max(lo,x));
const scale=(a,s)=>a.map(x=>x*s);
const add=(a,b)=>a.map((x,i)=>x+b[i]);
const finite=a=>a.every(Number.isFinite);
const relativeError=(actual,expected)=>Math.max(...actual.map((x,i)=>Math.abs(x-expected[i])/Math.max(1,Math.abs(x),Math.abs(expected[i]))));
const keys=(r)=>`${r.island}:${r.pipeline?.pass}:${r.phase?.group}:${r.phase?.substep}`;
export function checkRowEquation(row){
 if(!['contact-normal-solve','contact-twist-solve','contact-tangent-solve','joint-solve'].includes(row.event))return null;
 const before1=row.before1.angular,before2=row.before2.angular,actual1=row.after1.angular,actual2=row.after2.angular;
 let predictedImpulse,expected1,expected2;
 if(row.event==='contact-tangent-solve'){
  const [k11,k22,k12]=row.massMatrix;
  const dvel=row.directions.map((dir,i)=>dot(dir,sub(row.before1.linear,row.before2.linear))+dot(row.angularJacobian1[i],before1)+dot(row.angularJacobian2[i],before2)+row.rhs[i]);
  const determinant=k11*k22-k12*k12;
  const raw=sub(row.impulse,[(k22*dvel[0]-k12*dvel[1])/determinant,(k11*dvel[1]-k12*dvel[0])/determinant]);
  predictedImpulse=scale(raw,Math.min(1,row.limit/(norm(raw)||1)));
  const delta=sub(row.newImpulse,row.impulse);
  expected1=add(before1,add(scale(row.inverseInertiaJacobian1[0],delta[0]),scale(row.inverseInertiaJacobian1[1],delta[1])));
  expected2=add(before2,add(scale(row.inverseInertiaJacobian2[0],delta[0]),scale(row.inverseInertiaJacobian2[1],delta[1])));
 }else{
  if(row.event==='contact-twist-solve'){
   const dvel=dot(row.direction,sub(before1,before2))+row.rhs;
   predictedImpulse=clamp(row.impulse-row.effectiveMass*dvel,-row.limit,row.limit);
  }else if(row.event==='contact-normal-solve'){
   const dvel=dot(row.direction,sub(row.before1.linear,row.before2.linear))+dot(row.angularJacobian1,before1)+dot(row.angularJacobian2,before2)+row.rhs;
   predictedImpulse=row.cfmFactor*Math.max(0,row.impulse-row.effectiveMass*dvel);
  }else{
   const dvel=dot(row.linearJacobian,sub(row.before2.linear,row.before1.linear))+dot(row.angularJacobian2,before2)-dot(row.angularJacobian1,before1)+row.rhs;
   const [lo,hi]=row.bounds;
   predictedImpulse=clamp(row.impulse+row.effectiveMass*(dvel-row.cfmGain*row.impulse),lo??-Infinity,hi??Infinity);
  }
  const delta=row.newImpulse-row.impulse,sign=row.event==='contact-normal-solve'?1:-1;
  expected1=add(before1,scale(row.inverseInertiaJacobian1,delta));
  expected2=add(before2,scale(row.inverseInertiaJacobian2,delta*sign));
 }
 const actualImpulse=Array.isArray(row.newImpulse)?row.newImpulse:[row.newImpulse],prediction=Array.isArray(predictedImpulse)?predictedImpulse:[predictedImpulse];
 return {sequence:row.sequence,event:row.event,finite:finite([...expected1,...expected2,...prediction,...actual1,...actual2,...actualImpulse]),
  impulseRelativeError:relativeError(actualImpulse,prediction),velocityRelativeError:Math.max(relativeError(actual1,expected1),relativeError(actual2,expected2))};
}
export function capImpulseDiscontinuities(trace){
 const caps=trace.rows.filter(r=>r.event==='body-after-native-cap');
 return caps.flatMap(cap=>{
  const before=trace.rows.find(r=>r.event==='body-before-integrate'&&keys(r)===keys(cap)&&r.slot===cap.slot);
  if(!before)throw Error('Missing pre-integration velocity in native trace');
  const removedAngular=sub(before.angular,cap.angular);
  if(norm(removedAngular)<=1e-5)return [];
  const releases=trace.rows.filter(r=>keys(r)===keys(cap)&&r.phase?.pass==='relax'&&r.sequence>cap.sequence&&['contact-normal-solve','contact-twist-solve','contact-tangent-solve'].includes(r.event)&&(r.slot1===cap.slot||r.slot2===cap.slot));
  const released=[0,0,0];
  for(const row of releases){
   const side=row.slot1===cap.slot?1:2;
   const delta=sub(row[`after${side}`].angular,row[`before${side}`].angular);
   for(let i=0;i<3;i++)released[i]+=delta[i];
  }
  return [{slot:cap.slot,sequence:cap.sequence,pipelinePass:cap.pipeline?.pass,substep:cap.phase?.substep,removedAngular,removedMagnitude:norm(removedAngular),
   releaseRows:releases.length,releasedAngular:released,releasedMagnitude:norm(released),
   zeroLimitNonzeroReleases:releases.filter(r=>r.limit===0&&(Array.isArray(r.impulse)?norm(r.impulse):Math.abs(r.impulse))>0).map(r=>({sequence:r.sequence,event:r.event,impulse:r.impulse,newImpulse:r.newImpulse})),
   // Directional agreement only, not a complete force balance: warm-start,
   // other rows, gyro and damping can act outside this observation window.
   releaseAlignment:norm(released)>0?dot(removedAngular,released)/(norm(removedAngular)*norm(released)):null}];
 });
}
export function summarizeTrace(trace){
 const equations=trace.rows.map(checkRowEquation).filter(Boolean);
 const peakDeltaByEvent={};
 for(const r of trace.rows){
  if(!r.before1||!r.after1||!r.before2||!r.after2)continue;
  const delta=Math.max(norm(sub(r.after1.angular,r.before1.angular)),norm(sub(r.after2.angular,r.before2.angular)));
  if(!peakDeltaByEvent[r.event]||delta>peakDeltaByEvent[r.event].delta){peakDeltaByEvent[r.event]={delta,sequence:r.sequence,pass:r.phase?.pass,pipelinePass:r.pipeline?.pass,impulse:r.impulse,newImpulse:r.newImpulse,limit:r.limit??null};}
 }
 const beforeCaps=new Map(trace.rows.filter(r=>r.event==='body-before-integrate').map(r=>[`${keys(r)}:${r.slot}`,r]));
 const caps=trace.rows.filter(r=>r.event==='body-after-native-cap').map(r=>{
  const before=beforeCaps.get(`${keys(r)}:${r.slot}`);if(!before)throw Error('Missing pre-integration velocity in native trace');
  return {sequence:r.sequence,pass:r.pipeline?.pass,substep:r.phase?.substep,before:norm(before.angular),after:norm(r.angular),cap:r.maxAngularVelocity,changed:relativeError(before.angular,r.angular)>1e-7};
 });
 const groups=trace.rows.filter(r=>r.event==='solver-group').map(r=>({pipelinePass:r.pipeline?.pass,group:r.group,dt:r.dt,baseDt:r.baseDt,substeps:r.substeps,pgs:r.pgsIterations,relax:r.relaxIterations}));
 return {rowCount:trace.rows.length,dropped:trace.dropped,groups,peakDeltaByEvent,caps,
  equations:{count:equations.length,finite:equations.every(e=>e.finite),maxImpulseRelativeError:Math.max(0,...equations.map(e=>e.impulseRelativeError)),maxVelocityRelativeError:Math.max(0,...equations.map(e=>e.velocityRelativeError)),worstVelocity:equations.toSorted((a,b)=>b.velocityRelativeError-a.velocityRelativeError)[0]??null}};
}
