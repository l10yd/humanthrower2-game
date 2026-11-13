import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import baseline from '@dimforge/rapier3d-compat';
import {summarizeTrace} from './native-row-analysis.mjs';
// Measurement, NOT a velocity acceptance test. Requires explicit isolated input/output.
const packagePath=process.env.HUMANTHROWER_CANDIDATE_PACKAGE,outputPath=process.env.HUMANTHROWER_CANDIDATE_OUTPUT;
if(!packagePath||!outputPath)throw Error('Set HUMANTHROWER_CANDIDATE_PACKAGE and HUMANTHROWER_CANDIDATE_OUTPUT');
const {default:candidate}=await import(pathToFileURL(resolve(packagePath)).href),output=resolve(outputPath);
await baseline.init();await candidate.init();await mkdir(output,{recursive:true});
const exactPart=JSON.parse(await readFile('tests/fixtures/thin-contact-part.json','utf8')),reports=[];
for(const [stem,variant] of [['joint-limit-impact','baseline'],['thin-contact-impact','baseline'],['thin-contact-impact','exact']]){
 const manifest=JSON.parse(await readFile(`tests/fixtures/${stem}.json`,'utf8')),bytes=new Uint8Array(await readFile(`tests/fixtures/${stem}.bin`));
 const replay=(R,capacity)=>{
  const w=R.World.restoreSnapshot(bytes),q=new R.EventQueue(true);if(!w)throw Error('Failed snapshot restoration');
  try{
   const target=manifest.world.find(p=>p.id===manifest.partId);
   if(variant==='exact'){
    const p=manifest.parts.find(p=>p.id===manifest.partId),m=exactPart.exact;
    w.getCollider(p.collider).setMassProperties(m.mass,m.center,m.principal,m.frame);w.getRigidBody(p.body).recomputeMassPropertiesFromColliders();
   }
   if(R===candidate){const bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,target.bodyHandle,true);R.rowTraceConfigure(bits.getUint32(0,true),bits.getUint32(4,true),capacity);}
   const lookup=new Map(manifest.world.map(p=>[p.colliderHandle,p])),key=(a,b)=>`${Math.min(a,b)}:${Math.max(a,b)}`,excluded=new Set([...manifest.neighborPairs,...manifest.deferredPairs].map(p=>key(p.a,p.b)));
   w.timestep=manifest.replayTimestep;
   w.step(q,{filterContactPair:(a,b)=>{const pa=lookup.get(a),pb=lookup.get(b);if(pa&&pb&&(excluded.has(key(pa.id,pb.id))||(!manifest.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component))return null;return R.SolverFlags.COMPUTE_IMPULSE;},filterIntersectionPair:()=>true});
   const states=manifest.world.map(p=>{const b=w.getRigidBody(p.bodyHandle);return {id:p.id,position:{...b.translation()},rotation:{...b.rotation()},velocity:{...b.linvel()},angular:{...b.angvel()}};});
   return {states,snapshot:w.takeSnapshot(),trace:R===candidate?JSON.parse(R.rowTraceTake()):null};
  }finally{q.free();w.free();}
 };
 const a=replay(baseline,0),off=replay(candidate,0),on=replay(candidate,100000),bounded=replay(candidate,1);
 const exact=(a,b)=>JSON.stringify(a.states)===JSON.stringify(b.states),peak=result=>Math.hypot(...Object.values(result.states.find(p=>p.id===manifest.partId).angular));
 const worldPeak=result=>Math.max(...result.states.map(p=>Math.hypot(...Object.values(p.angular))));
 const analysis=summarizeTrace(on.trace),summary={stem,variant,parts:on.states.length,baselineAngular:peak(a),candidateAngular:peak(on),baselineWorldAngular:worldPeak(a),candidateWorldAngular:worldPeak(on),statesIdenticalToBaseline:exact(a,on),
  observerStatesExact:exact(off,on),observerSnapshotExact:Buffer.from(off.snapshot).equals(Buffer.from(on.snapshot)),boundedObserverExact:exact(off,bounded),boundedRows:bounded.trace.rows.length,boundedDropped:bounded.trace.dropped,
  candidateFinite:on.states.every(s=>['position','rotation','velocity','angular'].every(f=>Object.values(s[f]).every(Number.isFinite))),analysis};
 await writeFile(resolve(output,`${stem}-${variant}.json`),JSON.stringify({summary,trace:on.trace,states:on.states},null,2));reports.push(summary);
}
await writeFile(resolve(output,'summary.json'),JSON.stringify({package:resolve(packagePath),scope:'one-step measurement only',reports},null,2));
console.log(JSON.stringify(reports.map(({analysis,...s})=>({...s,equations:analysis.equations,caps:analysis.caps.length})),null,2));
if(reports.some(s=>!s.observerStatesExact||!s.observerSnapshotExact||!s.boundedObserverExact||s.boundedRows!==1||s.boundedDropped<1||!s.candidateFinite||!s.analysis.equations.finite||s.analysis.equations.maxVelocityRelativeError>.002||s.analysis.dropped))process.exitCode=1;
