// Isolated causal convergence experiment. Changes replay parameters only; does
// not modify production config, geometry, velocities, CCD or constraints.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import original from '@dimforge/rapier3d-compat';
const output=resolve(process.env.HUMANTHROWER_CONVERGENCE_OUTPUT??'.pi/native-build/mvp4-convergence');
const {default:observer}=await import(pathToFileURL(resolve('.pi/native-build/substep-sequence-package/rapier.mjs')).href);
await original.init();await observer.init();await mkdir(output,{recursive:true});const reports=[];
for(const stem of ['joint-limit-impact','thin-contact-impact']){
 const manifest=JSON.parse(await readFile(`tests/fixtures/${stem}.json`,'utf8')),bytes=new Uint8Array(await readFile(`tests/fixtures/${stem}.bin`));
 for(const pgs of [1,2,4,8,16]){
  const replay=(R,capacity)=>{
   const w=R.World.restoreSnapshot(bytes),queue=new R.EventQueue(true);if(!w)throw Error('Snapshot restore failed');
   try{
    w.integrationParameters.numInternalPgsIterations=pgs;w.timestep=manifest.replayTimestep;
    if(R===observer){const target=manifest.world.find(p=>p.id===manifest.partId),bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,target.bodyHandle,true);R.rowTraceConfigure(bits.getUint32(0,true),bits.getUint32(4,true),capacity);}
    const lookup=new Map(manifest.world.map(p=>[p.colliderHandle,p])),key=(a,b)=>`${Math.min(a,b)}:${Math.max(a,b)}`,excluded=new Set([...manifest.neighborPairs,...manifest.deferredPairs].map(p=>key(p.a,p.b)));
    w.step(queue,{filterContactPair:(a,b)=>{const pa=lookup.get(a),pb=lookup.get(b);if(pa&&pb&&(excluded.has(key(pa.id,pb.id))||(!manifest.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component))return null;return R.SolverFlags.COMPUTE_IMPULSE;},filterIntersectionPair:()=>true});
    const states=manifest.world.map(p=>{const b=w.getRigidBody(p.bodyHandle);return {id:p.id,position:{...b.translation()},rotation:{...b.rotation()},velocity:{...b.linvel()},angular:{...b.angvel()}};});
    return {states,snapshot:w.takeSnapshot(),trace:R===observer?JSON.parse(R.rowTraceTake()):null};
   }finally{queue.free();w.free();}
  };
  const a=replay(original,0),b=replay(observer,0),c=replay(observer,100000);
  if(JSON.stringify(a.states)!==JSON.stringify(b.states)||JSON.stringify(b.states)!==JSON.stringify(c.states)||!Buffer.from(b.snapshot).equals(Buffer.from(c.snapshot)))throw Error('Observer not equivalent');
  const gs=c.trace.rows.filter(r=>r.event==='solver-joint-geometry'),phases=[];
  for(const pipeline of [1,2])for(const substep of [0,9]){
   const rows=gs.filter(r=>r.pipeline.pass===pipeline&&r.phase?.substep===substep&&r.jointIndex===42&&r.phase.pass==='bias');
   const joints=rows.filter(r=>r.stage==='after-all-joints').at(-1),contacts=rows.filter(r=>r.stage==='after-contacts').at(-1);
   if(joints&&contacts)phases.push({pipeline,substep,afterJoints:joints.predictedDistance,afterContacts:contacts.predictedDistance,relativeSpeed:Math.hypot(...contacts.pointVelocity2.map((v,i)=>v-contacts.pointVelocity1[i]))});
  }
  const incident=c.states.find(s=>s.id===manifest.partId),summary={stem,pgs,incidentAngular:Math.hypot(...Object.values(incident.angular)),worldAngular:Math.max(...c.states.map(s=>Math.hypot(...Object.values(s.angular)))),worldSpeed:Math.max(...c.states.map(s=>Math.hypot(...Object.values(s.velocity)))),phases,dropped:c.trace.dropped};
  reports.push(summary);await writeFile(resolve(output,`${stem}-pgs${pgs}.json`),JSON.stringify({summary,trace:c.trace},null,2));console.log(JSON.stringify(summary));
 }
}
await writeFile(resolve(output,'summary.json'),JSON.stringify({scope:'one-step causal parameter experiment, NOT gameplay fix/acceptance',reports},null,2));
