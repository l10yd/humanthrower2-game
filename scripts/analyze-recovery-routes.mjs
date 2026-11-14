// Restore one captured current recovery world and inspect initial-contact
// separating directions. Does not step, move, sleep or delete any body.
import R from '@dimforge/rapier3d-compat';
import {readFile,writeFile} from 'node:fs/promises';
const file=process.argv[2];if(!file)throw Error('Explicit recovery capture required');
await R.init();const capture=JSON.parse(await readFile(file,'utf8')).captured,w=R.World.restoreSnapshot(new Uint8Array(capture.bytes));
const members=capture.parts.filter(p=>capture.members.includes(p.id)),ids=new Set(members.map(p=>p.collider));
try{
 const planes=[];
 for(const p of members){const c=w.getCollider(p.collider);w.forEachCollider(other=>{
  if(ids.has(other.handle)||capture.parts.find(p=>p.collider===other.handle)?.owner==='player'||!other.isEnabled()||other.isSensor())return;
  const hit=other.contactCollider(c,.002);if(hit){planes.push({part:p.id,other:capture.parts.find(p=>p.collider===other.handle)?.id??'static',distance:hit.distance,normal:{...hit.normal1}});}
 });}
 const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
 const target=capture.delta;let delta={...target};const history=[];
 for(let pass=0;pass<100;pass++){
  let worst=0;for(const p of planes){const violation=Math.max(0,-dot(p.normal,delta));worst=Math.max(worst,violation);delta={x:delta.x+p.normal.x*violation,y:delta.y+p.normal.y*violation,z:delta.z+p.normal.z*violation};}
  if(pass%10===0)history.push({pass,worst,delta:{...delta}});
 }
 const report={scope:'Initial separating-plane diagnostic only; no destination/path/geometry safety proof',target,planes,history,delta};
 console.log(JSON.stringify(report,null,2));if(process.argv[3])await writeFile(process.argv[3],JSON.stringify(report,null,2));
}finally{w.free();}
