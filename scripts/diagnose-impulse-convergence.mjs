// Bounded archived impulse-step + global convergence diagnostic. No source patch
// and no production parameter adoption. Explicit isolated package is required.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import publicRapier from '@dimforge/rapier3d-compat';
const path=process.env.HUMANTHROWER_CANDIDATE_PACKAGE,outputPath=process.env.HUMANTHROWER_CANDIDATE_OUTPUT;
if(!path||!outputPath)throw Error('Explicit archived candidate package and output required');
const {default:candidate}=await import(pathToFileURL(resolve(path)).href),output=resolve(outputPath);
await publicRapier.init();await candidate.init();await mkdir(output,{recursive:true});const reports=[];
for(const stem of ['joint-limit-impact','thin-contact-impact']){
 const manifest=JSON.parse(await readFile(`tests/fixtures/${stem}.json`,'utf8')),bytes=new Uint8Array(await readFile(`tests/fixtures/${stem}.bin`));
 for(const pgs of [1,4,8,16]){
  const run=(R,trace)=>{
   const world=R.World.restoreSnapshot(bytes),queue=new R.EventQueue(true);
   try{
    world.integrationParameters.numInternalPgsIterations=pgs;world.timestep=manifest.replayTimestep;
    if(R===candidate){const part=manifest.world.find(p=>p.id===manifest.partId),bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,part.bodyHandle,true);R.rowTraceConfigure(bits.getUint32(0,true),bits.getUint32(4,true),trace?100000:0);}
    const lookup=new Map(manifest.world.map(p=>[p.colliderHandle,p])),key=(a,b)=>`${Math.min(a,b)}:${Math.max(a,b)}`,excluded=new Set([...manifest.neighborPairs,...manifest.deferredPairs].map(p=>key(p.a,p.b)));
    world.step(queue,{filterContactPair:(a,b)=>{const pa=lookup.get(a),pb=lookup.get(b);if(pa&&pb&&(excluded.has(key(pa.id,pb.id))||(!manifest.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component))return null;return R.SolverFlags.COMPUTE_IMPULSE;},filterIntersectionPair:()=>true});
    const states=manifest.world.map(p=>{const b=world.getRigidBody(p.bodyHandle);return {id:p.id,position:{...b.translation()},rotation:{...b.rotation()},velocity:{...b.linvel()},angular:{...b.angvel()}};});
    return {states,snapshot:world.takeSnapshot(),trace:R===candidate&&trace?JSON.parse(R.rowTraceTake()):null};
   }finally{queue.free();world.free();}
  };
  const baseline=run(publicRapier,false),off=run(candidate,false),on=run(candidate,true);
  if(JSON.stringify(off.states)!==JSON.stringify(on.states)||!Buffer.from(off.snapshot).equals(Buffer.from(on.snapshot))||on.trace.dropped)throw Error('Observer altered state or truncated');
  const summary=result=>({incidentAngular:Math.hypot(...Object.values(result.states.find(p=>p.id===manifest.partId).angular)),worldAngular:Math.max(...result.states.map(p=>Math.hypot(...Object.values(p.angular)))),worldSpeed:Math.max(...result.states.map(p=>Math.hypot(...Object.values(p.velocity))))});
  const report={stem,pgs,baseline:summary(baseline),candidate:summary(on),observerExact:true};
  report.strictOneStepPass=report.candidate.worldAngular<35&&report.candidate.worldSpeed<25;
  reports.push(report);console.log(JSON.stringify(report));
 }
}
await writeFile(resolve(output,'summary.json'),JSON.stringify({scope:'Bounded archived impulse-step + convergence replay, NOT full world/production acceptance',package:resolve(path),reports},null,2));
