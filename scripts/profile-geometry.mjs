// Offline geometry/allocation diagnostic; identical cloned inputs per repetition.
// No dev server, no rendering, no reference FPS claim.
import {register} from 'node:module';register('./asset-typescript-loader.mjs',import.meta.url);
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const {PhysicsManager,RAPIER}=await import('../src/physics/PhysicsManager.ts');
const {OccupancyRaster}=await import('../src/grid/OccupancyRaster.ts');
const {prepareRowCut}=await import('../src/slicing/RowPreparation.ts');
const {clearRows}=await import('../src/slicing/ClearTransaction.ts');
const {box}=await import('../src/slicing/ConvexClipper.ts');
const {conjugate,rotate,vec,axisAngle,identity}=await import('../src/slicing/Math.ts');
await RAPIER.init();
const output=resolve(process.argv[2]??'test-results/geometry-profile.json');
const fixture=JSON.parse(await readFile('tests/fixtures/thin-contact-impact.json','utf8'));
const states=new Map(fixture.world.map(p=>[p.id,p.before]));
const physics=new PhysicsManager(),raster=new OccupancyRaster();
const time=fn=>{const samples=[];for(let i=0;i<3;i++)fn();for(let i=0;i<20;i++){const start=performance.now();fn();samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);return {mean:samples.reduce((s,n)=>s+n,0)/samples.length,p95:samples[Math.floor(samples.length*.95)],samples};};
const clearWorkload=(shared)=>{
 const times=[],signatures=[],work=[];for(let run=0;run<13;run++){
  const p=new PhysicsManager();p.shareAllocationGeometry=shared;
  try{
   for(let i=0;i<32;i++){
    const part=p.createPart(box(.05,1.1,.06),{position:vec((i%8-3.5)*.4,1.5,0),rotation:axisAngle(vec(0,0,1),i*.013)},3,i,'stress');part.body.sleep();
   }
   const initial={...p.allocationQueries};
   const start=performance.now(),result=clearRows(p,[1],'solver');if(run>=3)times.push(performance.now()-start);
   work.push({fragments:result.fragments,reads:p.allocationQueries.reads-initial.reads,welds:p.allocationQueries.welds-initial.welds});
   const signature=JSON.stringify({result,parts:[...p.parts.values()].map(part=>({poly:part.poly,mass:part.body.mass(),com:part.body.localCom(),principal:part.body.principalInertia(),frame:part.body.principalInertiaLocalFrame(),v:part.body.linvel(),w:part.body.angvel()}))});signatures.push(signature);
  }finally{p.dispose();}
 }
 times.sort((a,b)=>a-b);return {mean:times.reduce((s,n)=>s+n,0)/times.length,p95:times[Math.floor(times.length*.95)],samples:times,work:work[0],signature:signatures[0],consistent:signatures.every(s=>s===signatures[0])};
};
try{
 for(const source of fixture.parts){const state=states.get(source.id);physics.createPart(source.poly,{position:state.position,rotation:state.rotation},0,source.npcId,source.limb,source.generation,source.density,source.owner);}
 const polys=fixture.parts.filter(p=>p.owner==='npc');
 physics.shareAllocationGeometry=false;const collidersBefore=time(()=>{for(const p of polys)physics.prepareCollider(p.poly,p.density);});
 physics.shareAllocationGeometry=true;const colliders=time(()=>{for(const p of polys)physics.prepareCollider(p.poly,p.density);});
 const cuts=time(()=>{for(const p of polys){const s=states.get(p.id),n=rotate(vec(0,1,0),conjugate(s.rotation));prepareRowCut(p.poly,n,[{lower:1-s.position.y,upper:2-s.position.y}],true);}});
 raster.singlePassStatistics=false;raster.footprintSpans=false;const occupancyBefore=time(()=>raster.rebuild(physics.parts.values(),false));
 raster.singlePassStatistics=true;raster.footprintSpans=true;const occupancy=time(()=>raster.rebuild(physics.parts.values(),false));
 const clearBefore=clearWorkload(false),clearAfter=clearWorkload(true);if(!clearBefore.consistent||!clearAfter.consistent||clearBefore.signature!==clearAfter.signature)throw Error('Allocation scope changed clear result/geometry/native state');
 delete clearBefore.signature;delete clearAfter.signature;
 await mkdir(dirname(output),{recursive:true});const report={method:'Collider/occupancy:20 invocation samples after3warmups on reconstructed102world geometry, without original joints/contacts/velocities. Clear:10 samples after3warmups,32 sleeping rotated boxes freshly allocated for every repeat; exact result/geometry/native signatures checked. CPU diagnostic, not physics or FPS acceptance',parts:physics.parts.size,clearBefore,clearAfter,collidersBefore,colliders,cuts,occupancyBefore,occupancy};await writeFile(output,JSON.stringify(report,null,2));console.log(JSON.stringify({parts:report.parts,clearBefore:clearBefore.mean,clearAfter:clearAfter.mean,collidersBefore:collidersBefore.mean,colliders:colliders.mean,cuts:cuts.mean,occupancyBefore:occupancyBefore.mean,occupancy:occupancy.mean,output}));
}finally{physics.dispose();}
