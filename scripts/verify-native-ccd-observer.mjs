import {readFile,writeFile} from 'node:fs/promises';
import original from '@dimforge/rapier3d-compat';
import observed from '../.pi/native-build/joint-geometry-package/rapier.mjs';
await original.init();await observed.init();
const run=(R,enabled)=>{
 const w=new R.World({x:0,y:0,z:0});
 try{
  w.integrationParameters.maxCcdSubsteps=4;w.timestep=.05;
  w.createCollider(R.ColliderDesc.cuboid(3,.1,3).setTranslation(0,-.1,0));
  const b=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,1,0).setLinvel(0,-100,0).setCcdEnabled(true));
  w.createCollider(R.ColliderDesc.cuboid(.1,.1,.1),b);
  if(R===observed){const bits=new DataView(new ArrayBuffer(8));bits.setFloat64(0,b.handle,true);R.rowTraceConfigure(bits.getUint32(0,true),bits.getUint32(4,true),enabled?100000:0);}
  w.step();return {state:{position:{...b.translation()},rotation:{...b.rotation()},velocity:{...b.linvel()},angular:{...b.angvel()}},snapshot:w.takeSnapshot(),trace:R===observed?JSON.parse(R.rowTraceTake()):null};
 }finally{w.free();}
};
const a=run(original,false),off=run(observed,false),on=run(observed,true);
const summary={exactPublished:JSON.stringify(a.state)===JSON.stringify(on.state),observerSnapshotExact:Buffer.from(off.snapshot).equals(Buffer.from(on.snapshot)),clamps:on.trace.rows.filter(r=>r.event==='ccd-body-clamp'),dropped:on.trace.dropped};
await writeFile('.pi/native-build/ccd-trace-positive.json',JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
if(!summary.exactPublished||!summary.observerSnapshotExact||!summary.clamps.length||summary.dropped)process.exitCode=1;
