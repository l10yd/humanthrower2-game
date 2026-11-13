import {readFile,writeFile} from 'node:fs/promises';
import original from '@dimforge/rapier3d-compat';
import rebuilt from '../.pi/native-build/baseline-package/rapier.mjs';
await original.init();await rebuilt.init();
const reports=[];
for(const stem of ['joint-limit-impact','thin-contact-impact']){
 const manifest=JSON.parse(await readFile(`tests/fixtures/${stem}.json`,'utf8')),bytes=new Uint8Array(await readFile(`tests/fixtures/${stem}.bin`));
 const replay=R=>{const world=R.World.restoreSnapshot(bytes);if(!world)throw Error('Snapshot restore returned null');const queue=new R.EventQueue(true);
  try{world.timestep=manifest.replayTimestep;const lookup=new Map(manifest.world.map(p=>[p.colliderHandle,p])),key=(a,b)=>`${Math.min(a,b)}:${Math.max(a,b)}`,excluded=new Set([...manifest.neighborPairs,...manifest.deferredPairs].map(p=>key(p.a,p.b)));
   world.step(queue,{filterContactPair:(a,b)=>{const pa=lookup.get(a),pb=lookup.get(b);if(pa&&pb&&(excluded.has(key(pa.id,pb.id))||(!manifest.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component))return null;return R.SolverFlags.COMPUTE_IMPULSE;},filterIntersectionPair:()=>true});
   return manifest.world.map(p=>{const b=world.getRigidBody(p.bodyHandle);return {id:p.id,position:{...b.translation()},rotation:{...b.rotation()},velocity:{...b.linvel()},angular:{...b.angvel()}};});
  }finally{queue.free();world.free();}
 };
 try{
  const a=replay(original),b=replay(rebuilt),differences={position:0,rotation:0,velocity:0,angular:0},values={position:0,rotation:0,velocity:0,angular:0};let exact=true;
  a.forEach((old,i)=>{for(const field of Object.keys(differences))for(const k of Object.keys(old[field])){const delta=Math.abs(old[field][k]-b[i][field][k]);values[field]=Math.max(values[field],delta);differences[field]+=Number(delta!==0);exact&&=delta===0;}});
  const target=b.find(p=>p.id===manifest.partId),peak=Math.hypot(...Object.values(target.angular));reports.push({stem,parts:a.length,originalVersion:original.version(),rebuiltVersion:rebuilt.version(),exact,differences,maxAbsoluteError:values,rebuiltIncidentAngular:peak});
 }catch(e){reports.push({stem,error:String(e)});}
}
await writeFile('.pi/native-build/baseline-replay-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
if(reports.some(r=>r.error||!r.exact))process.exitCode=1;
