// Independent reader for the isolated native per-substep observer. Does not
// change a solver setting or accept a local replay as a stable-world gate.
const finiteVector=(v,n=3)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.hypot(...a);
function qmul(a,b){return [a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];}
function rotate(q,v){const u=q.slice(0,3);return add(v,add(mul(cross(u,v),2*q[3]),mul(cross(u,cross(u,v)),2)));}
function prediction(row,side){
 const velocity=row[`velocity${side}`],q=row[`rotation${side}`];
 const raw=qmul([...mul(velocity.angular,row.dt*.5),1],q),length=norm(raw),rotation=mul(raw,1/length);
 return add(add(row[`center${side}`],mul(velocity.linear,row.dt)),rotate(rotation,row[`localAnchor${side}`]));
}
export function analyzeNativeSubsteps(trace){
 if(!trace||!Array.isArray(trace.rows)||trace.dropped!==0)throw Error('Missing or truncated native trace');
 const rows=trace.rows,geometries=rows.filter(r=>r.event==='solver-joint-geometry');
 if(!geometries.length)throw Error('Trace has no substep joint geometry');
 let maxPointVelocityError=0,maxPredictionError=0,maxIntegrationError=0;
 for(let i=0;i<rows.length;i++)if(rows[i].sequence!==i)throw Error('Trace sequence mismatch');
 const groups=new Map();
 for(const row of geometries){
  if(!row.phase||!Number.isFinite(row.dt)||row.dt<=0)throw Error('Missing substep context');
  for(const side of [1,2]){
   for(const key of ['center','localAnchor','arm','anchor','pointVelocity','predictedAnchor'])if(!finiteVector(row[`${key}${side}`]))throw Error(`Invalid ${key}`);
   if(!finiteVector(row[`rotation${side}`],4)||!finiteVector(row[`velocity${side}`]?.linear)||!finiteVector(row[`velocity${side}`]?.angular))throw Error('Invalid velocity/rotation');
   const pv=add(row[`velocity${side}`].linear,cross(row[`velocity${side}`].angular,row[`arm${side}`]));
   maxPointVelocityError=Math.max(maxPointVelocityError,norm(sub(pv,row[`pointVelocity${side}`])));
   maxPredictionError=Math.max(maxPredictionError,norm(sub(prediction(row,side),row[`predictedAnchor${side}`])));
  }
  const key=`${row.pipeline.pass}:${row.phase.substep}:${row.jointIndex}`,list=groups.get(key)??[];list.push(row);groups.set(key,list);
 }
 const substeps=[];
 for(const list of groups.values()){
  const first=list[0],bias=list.filter(r=>r.phase.pass==='bias'),relax=list.filter(r=>r.phase.pass==='relax');
  const last=stage=>bias.filter(r=>r.stage===stage).at(-1),joints=last('after-all-joints'),contacts=last('after-contacts'),before=last('before-pose-integration'),after=last('after-pose-integration');
  if(!joints||!contacts||!before||!after||!relax.some(r=>r.stage==='after-contacts'))throw Error('Incomplete bias/integration/relax sequence');
  for(const side of [1,2])maxIntegrationError=Math.max(maxIntegrationError,norm(sub(before[`predictedAnchor${side}`],after[`anchor${side}`])));
  const ownSolves=bias.filter(r=>r.stage==='after-one-joint'&&rows.slice(Math.max(0,r.sequence-3),r.sequence).some(prev=>prev.event==='joint-solve'&&prev.jointIndex===r.jointIndex));
  substeps.push({pipeline:first.pipeline.pass,substep:first.phase.substep,joint:first.jointIndex,dt:first.dt,before:first.distance,
   afterOwnJoint:ownSolves.at(-1)?.predictedDistance??null,afterAllJoints:joints.predictedDistance,afterContacts:contacts.predictedDistance,
   afterIntegration:after.distance,contactReintroducedDistance:contacts.predictedDistance-joints.predictedDistance,
   relativeSpeedAfterContacts:norm(sub(contacts.pointVelocity2,contacts.pointVelocity1)),
   relaxRelativeSpeed:norm(sub(relax.at(-1).pointVelocity2,relax.at(-1).pointVelocity1))});
 }
 if(maxPredictionError>2e-5||maxIntegrationError>2e-5||maxPointVelocityError>2e-4)throw Error('Independent native geometry equations do not match');
 return {geometryRows:geometries.length,substeps:substeps.sort((a,b)=>a.pipeline-b.pipeline||a.substep-b.substep||a.joint-b.joint),maxPointVelocityError,maxPredictionError,maxIntegrationError};
}
