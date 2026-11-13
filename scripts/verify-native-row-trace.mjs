import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import original from '@dimforge/rapier3d-compat';
import {summarizeTrace} from './native-row-analysis.mjs';
// Explicit diagnostic-only package. Does not replace the game dependency.
const {default:traced}=await import(pathToFileURL(resolve(process.env.HUMANTHROWER_TRACE_PACKAGE??'.pi/native-build/row-trace-controls-package/rapier.mjs')).href);
const output=resolve(process.env.HUMANTHROWER_TRACE_OUTPUT??'.pi/native-build/row-trace-controls-analysis');
await mkdir(output,{recursive:true});await original.init();await traced.init();
const exactPart=JSON.parse(await readFile('tests/fixtures/thin-contact-part.json','utf8'));
const reports=[];
const variants=process.env.HUMANTHROWER_TRACE_COUNTERFACTUALS==='1'?[
 ['joint-limit-impact','baseline'],['joint-limit-impact','cap-off'],['joint-limit-impact','ccd-off'],
 ...['baseline','exact','cap-off','exact-cap-off','warmstart-off','exact-warmstart-off','cap-off-warmstart-off','exact-cap-off-warmstart-off'].map(v=>['thin-contact-impact',v])
]:[['joint-limit-impact','baseline'],['thin-contact-impact','baseline'],['thin-contact-impact','exact']];
for(const [stem,variant] of variants){
 const manifest=JSON.parse(await readFile(`tests/fixtures/${stem}.json`,'utf8')),bytes=new Uint8Array(await readFile(`tests/fixtures/${stem}.bin`));
 const replay=(R,capacity)=>{const world=R.World.restoreSnapshot(bytes);if(!world)throw Error('snapshot restore failed');const queue=new R.EventQueue(true);
  try{
   if(variant.startsWith('exact')){
    const incident=manifest.parts.find(p=>p.id===manifest.partId),m=exactPart.exact;
    world.getCollider(incident.collider).setMassProperties(m.mass,m.center,m.principal,m.frame);
    world.getRigidBody(incident.body).recomputeMassPropertiesFromColliders();
   }
   const target=manifest.world.find(p=>p.id===manifest.partId),bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,target.bodyHandle,true);
   if(variant.includes('cap-off'))world.bodies.raw.rbDiagnosticAllowFastRotation(target.bodyHandle,true);
   if(variant.includes('warmstart-off'))world.integrationParameters.raw.diagnosticWarmstartCoefficient(0);
   if(variant==='ccd-off')world.integrationParameters.maxCcdSubsteps=0;
   if(R===traced)R.rowTraceConfigure(bits.getUint32(0,true),bits.getUint32(4,true),capacity);
   world.timestep=manifest.replayTimestep;
   const lookup=new Map(manifest.world.map(p=>[p.colliderHandle,p])),key=(a,b)=>`${Math.min(a,b)}:${Math.max(a,b)}`,excluded=new Set([...manifest.neighborPairs,...manifest.deferredPairs].map(p=>key(p.a,p.b)));
   world.step(queue,{filterContactPair:(a,b)=>{const pa=lookup.get(a),pb=lookup.get(b);if(pa&&pb&&(excluded.has(key(pa.id,pb.id))||(!manifest.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component))return null;return R.SolverFlags.COMPUTE_IMPULSE;},filterIntersectionPair:()=>true});
   const states=manifest.world.map(p=>{const b=world.getRigidBody(p.bodyHandle);return {id:p.id,position:{...b.translation()},rotation:{...b.rotation()},velocity:{...b.linvel()},angular:{...b.angvel()}};});
   return {states,trace:R===traced?JSON.parse(R.rowTraceTake()):null,snapshot:world.takeSnapshot()};
  }finally{queue.free();world.free();}
 };
 const hasPublishedControls=variant==='baseline'||variant==='exact'||variant==='ccd-off';
 const baseline=hasPublishedControls?replay(original,0):null,off=replay(traced,0),on=replay(traced,100_000),tiny=replay(traced,1);
 const exact=(a,b)=>JSON.stringify(a.states)===JSON.stringify(b.states),bytesEqual=(a,b)=>Buffer.from(a.snapshot).equals(Buffer.from(b.snapshot));
 const rows=on.trace.rows,target=on.states.find(p=>p.id===manifest.partId);
 const summary={stem,variant,parts:off.states.length,exactToPublished:baseline?exact(baseline,off):null,observerStatesExact:exact(off,on),observerSnapshotExact:bytesEqual(off,on),boundedObserverExact:exact(off,tiny),boundedRows:tiny.trace.rows.length,boundedDropped:tiny.trace.dropped,dropped:on.trace.dropped,rowCount:rows.length,events:{},incidentAngular:Math.hypot(...Object.values(target.angular))};
 for(const row of rows)summary.events[row.event]=(summary.events[row.event]??0)+1;
 const analysis=summarizeTrace(on.trace);
 if(!analysis.equations.finite||analysis.equations.maxVelocityRelativeError>.002)throw Error(`row equation validation failed: ${JSON.stringify(analysis.equations)}`);
 await writeFile(resolve(output,`${stem}-${variant}.json`),JSON.stringify({summary,analysis,trace:on.trace},null,2));reports.push({...summary,analysis});
}
await writeFile(resolve(output,'summary.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({analysis,...r})=>({...r,equations:analysis.equations,peakDeltaByEvent:analysis.peakDeltaByEvent})),null,2));
if(reports.some(r=>r.exactToPublished===false||!r.observerStatesExact||!r.observerSnapshotExact||!r.boundedObserverExact||r.boundedRows!==1||r.boundedDropped<1||r.dropped||!r.rowCount))process.exitCode=1;
