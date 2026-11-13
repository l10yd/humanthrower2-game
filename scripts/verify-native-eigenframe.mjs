import {readFile,writeFile} from 'node:fs/promises';
import original from '@dimforge/rapier3d-compat';
import baseline from '../.pi/native-build/baseline-package/rapier.mjs';
import patched from '../.pi/native-build/eigenframe-package/rapier.mjs';
import narrow from '../.pi/native-build/eigenframe-narrow-package/rapier.mjs';
const part=JSON.parse(await readFile('tests/fixtures/thin-contact-part.json','utf8'));
const reports=[];
for(const [name,R]of [['published',original],['baseline',baseline],['eigenframe',patched],['narrow',narrow]]){
 await R.init();const w=new R.World({x:0,y:-9.81,z:0});
 try{
  const body=w.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,2,0));
  w.createCollider(R.ColliderDesc.convexHull(new Float32Array(part.poly.faces.flatMap(f=>f.vertices.flatMap(v=>[v.x,v.y,v.z])))).setDensity(part.density),body);
  const principal={...body.principalInertia()},frame={...body.principalInertiaLocalFrame()};
  const rotate=(a,q)=>{const t={x:2*(q.y*a.z-q.z*a.y),y:2*(q.z*a.x-q.x*a.z),z:2*(q.x*a.y-q.y*a.x)};return {x:a.x+q.w*t.x+q.y*t.z-q.z*t.y,y:a.y+q.w*t.y+q.z*t.x-q.x*t.z,z:a.z+q.w*t.z+q.x*t.y-q.y*t.x};};
  const axes=[{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}].map(a=>rotate(a,frame)),keys=['x','y','z'],e=[principal.x,principal.y,principal.z];
  const tensor=keys.map(a=>keys.map(b=>axes.reduce((sum,axis,i)=>sum+e[i]*axis[a]*axis[b],0))),scale=Math.max(...Object.values(part.exact.principal));
  const error=Math.max(...tensor.flat().map((value,i)=>Math.abs(value-part.exact.tensor.flat()[i])/scale));
  reports.push({name,mass:body.mass(),principal,frame,tensor,normalizedTensorError:error});
 }finally{w.free();}
}
await writeFile('.pi/native-build/eigenframe-comparison.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports.map(({tensor,...r})=>r),null,2));
if(reports[2].normalizedTensorError>.001||reports[3].normalizedTensorError>.001)process.exitCode=1;
