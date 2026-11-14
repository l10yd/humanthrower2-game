// CPU-engine comparison: output is measurement, not a passed production gate.
import {register} from 'node:module';register('./asset-typescript-loader.mjs',import.meta.url);
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {createJoltWorld} from './jolt-comparison-adapter.mjs';
const packagePath=process.env.HUMANTHROWER_JOLT_PACKAGE,outputPath=process.env.HUMANTHROWER_ENGINE_OUTPUT;
if(!packagePath||!outputPath)throw Error('Set explicit isolated Jolt package and output path');
const packageSha256=createHash('sha256').update(await readFile(packagePath)).digest('hex');
if(packageSha256!=='34b3660f914ea23d196ae0b7e0014bab08e2a241f4a6bb9c3701a3a8bed11635')throw Error('Unrecognized Jolt1.1.1compat binary; explicit provenance review required');
const {default:init}=await import(pathToFileURL(resolve(packagePath)).href),J=await init();
const {RAPIER,PhysicsManager}=await import('../src/physics/PhysicsManager.ts');
const {RagdollFactory}=await import('../src/physics/RagdollFactory.ts');
const {exactMassProperties}=await import('../src/physics/ExactMass.ts');
const {vertices}=await import('../src/slicing/ConvexClipper.ts');
const {axisAngle,add,rotate,vec}=await import('../src/slicing/Math.ts');
await RAPIER.init();
const preservePrincipal=process.env.HUMANTHROWER_JOLT_PRINCIPAL==='1',velocitySteps=Number(process.env.HUMANTHROWER_JOLT_ITERATIONS??8);
if(![8,16].includes(velocitySteps))throw Error('Bounded Jolt iterations must be8or16');
const exactThin=process.env.HUMANTHROWER_JOLT_EXACT_THIN==='1';
const options={preservePrincipal,velocitySteps};
const output=resolve(outputPath),report={options:{...options,exactThin},scope:'Isolated Jolt SixDOF pyramid comparison. Same numeric limits, shapes/masses/native tensor, two1/120 steps per tick. Not identical Rapier solver coordinates/warmstart/CCD algorithm. Not production acceptance.',packageSha256,productionAdopted:false,cases:[]};
await mkdir(dirname(output),{recursive:true});
const sampleVelocity=b=>{const v=b.GetLinearVelocity(),speed=v.Length(),w=b.GetAngularVelocity();return {speed,angular:w.Length()};};
const arena=w=>{w.box(vec(4.85,.175,1.55),vec(0,-.175,0),.95);for(const s of [-1,1]){w.box(vec(.175,7,1.55),vec(s*4.675,7,0));w.box(vec(4.5,7,.175),vec(0,7,s*1.375));}};
const mappingStats=rows=>({bodies:rows.length,maxMassRelative:Math.max(0,...rows.map(r=>Math.abs(r.actualMass-r.mass)/r.mass)),maxTensorRelative:Math.max(0,...rows.map(r=>{const scale=Math.max(...r.suppliedTensor.flat().map(Math.abs));return Math.max(...r.actualTensor.flat().map((v,i)=>Math.abs(v-r.suppliedTensor.flat()[i])))/scale;})),maxComDifference:Math.max(0,...rows.map(r=>Math.hypot(r.shapeCom.x-r.sourceCom.x,r.shapeCom.y-r.sourceCom.y,r.shapeCom.z-r.sourceCom.z))),zeroInertiaAxes:rows.filter(r=>r.actualTensor.some((row,i)=>row[i]===0)).length});
const sourcePart=p=>({id:p.id,pose:{position:{...p.body.translation()},rotation:{...p.body.rotation()}},mass:p.body.mass(),com:{...p.body.localCom()},principal:{...p.body.principalInertia()},frame:{...p.body.principalInertiaLocalFrame()},velocity:{...p.body.linvel()},angular:{...p.body.angvel()},friction:p.collider.friction(),linearDamping:p.body.linearDamping(),angularDamping:p.body.angularDamping()});
async function thin(){
 const fixture=JSON.parse(await readFile('tests/fixtures/thin-contact-impact.json','utf8')),meta=JSON.parse(await readFile('tests/fixtures/thin-contact-part.json','utf8')),saved=fixture.world.find(p=>p.id===fixture.partId),snapshot=RAPIER.World.restoreSnapshot(new Uint8Array(await readFile('tests/fixtures/thin-contact-impact.bin')));
 const w=createJoltWorld(J,options);try{
  arena(w);const source=snapshot.getRigidBody(saved.bodyHandle),part={id:meta.id,pose:{position:saved.before.position,rotation:saved.before.rotation},mass:source.mass(),principal:{...source.principalInertia()},frame:{...source.principalInertiaLocalFrame()},com:{...source.localCom()},velocity:saved.before.velocity,angular:saved.before.angular,friction:.8,linearDamping:source.linearDamping(),angularDamping:source.angularDamping()};
  if(exactThin){const volume=exactMassProperties(meta.poly,1).volume,exact=exactMassProperties(meta.poly,part.mass/volume);part.principal=exact.principal;part.frame=exact.frame;part.tensor=exact.tensor;}
  const body=w.sourceBody(part,vertices(meta.poly));let maxSpeed=0,maxAngular=0,numeric=0,first=null;
  for(let i=0;i<120;i++){w.world.Step(1/120,1);const {speed,angular}=sampleVelocity(body);if(!first)first={speed,angular};maxSpeed=Math.max(maxSpeed,speed);maxAngular=Math.max(maxAngular,angular);if(!Number.isFinite(speed+angular))numeric++;}
  const r={name:`isolated captured thin ${exactThin?'geometry-exact tensor':'native supplied tensor'} against same floor (no imported pile/manifolds)`,maxSpeed,maxAngular,numeric,first,mapping:mappingStats(w.mapping),details:w.mapping};r.velocityPass=maxSpeed<25&&maxAngular<35&&!numeric;r.strictPass=r.velocityPass&&r.mapping.maxTensorRelative<.001&&r.mapping.maxMassRelative<.001;report.cases.push(r);console.log(JSON.stringify(r));
 }catch(error){const r={name:'thin shape/mass capability',error:String(error),strictPass:false};report.cases.push(r);console.log(JSON.stringify(r));}finally{snapshot.free();w.dispose();}
}
async function pile(){
 const source=new PhysicsManager(false,11),factory=new RagdollFactory(source),w=createJoltWorld(J,options),filter=w.groupFilter(11),dynamic=[],anchors=[],timings=[];
 let maxSpeed=0,maxAngular=0,maxDrift=0,numeric=0;
 const step=()=>{const start=performance.now();for(let sub=0;sub<2;sub++){
  w.world.Step(1/120,1);
  for(const b of dynamic){const {speed,angular}=sampleVelocity(b);maxSpeed=Math.max(maxSpeed,speed);maxAngular=Math.max(maxAngular,angular);if(!Number.isFinite(speed+angular))numeric++;}
  for(const pair of anchors){const pa=w.read(pair.a.GetPosition()),pb=w.read(pair.b.GetPosition()),qa=w.readQ(pair.a.GetRotation()),qb=w.readQ(pair.b.GetRotation()),a=add(pa,rotate(pair.aa,qa)),b=add(pb,rotate(pair.bb,qb));maxDrift=Math.max(maxDrift,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));}
 }timings.push(performance.now()-start);};
 try{
  arena(w);
  for(let n=0;n<20;n++){
   const parts=factory.spawn('normal',vec((n%5-2)*1.5,12.5,0),axisAngle(vec(0,0,1),n%2?.8:-.8),false);
   const map=new Map();for(let i=0;i<parts.length;i++){const p=parts[i],body=w.sourceBody(sourcePart(p),vertices(p.poly),filter,n+1,i);map.set(p.id,body);dynamic.push(body);}
   const ids=new Set(parts.map(p=>p.id));
   for(const data of source.joints.values())if(ids.has(data.a)&&ids.has(data.b)){
    const ai=parts.findIndex(p=>p.id===data.a),bj=parts.findIndex(p=>p.id===data.b);filter.DisableCollision(ai,bj);
    const a=map.get(data.a),b=map.get(data.b),aa=parts[ai].body.localCom(),bb=parts[bj].body.localCom();w.joint(data,a,b,aa,bb);anchors.push({a,b,aa:data.anchorA,bb:data.anchorB});
   }
   for(const p of parts)source.removePart(p.id);
   for(let i=0;i<160;i++)step();
  }
  for(let i=0;i<600;i++)step();const calm=dynamic.filter(b=>!b.IsActive()||sampleVelocity(b).speed<.08).length/dynamic.length;timings.sort((a,b)=>a-b);
  const r={name:'20 sequential drops; numeric limits preserved via SixDOF pyramid',parts:dynamic.length,maxSpeed,maxAngular,maxDrift,calm,numeric,stepP95:timings[Math.floor(timings.length*.95)],mapping:mappingStats(w.mapping),strictPass:maxSpeed<25&&maxAngular<35&&maxDrift<.1&&calm>=.9&&!numeric};r.mappingPass=r.mapping.maxMassRelative<1e-6&&r.mapping.maxTensorRelative<1e-6;r.strictPass=r.strictPass&&r.mappingPass;report.cases.push(r);console.log(JSON.stringify(r));
 }catch(error){const r={name:'20drop adapter',error:String(error),strictPass:false};report.cases.push(r);console.log(JSON.stringify(r));}finally{source.dispose();w.dispose();}
}
await thin();await writeFile(output,JSON.stringify(report,null,2));await pile();await writeFile(output,JSON.stringify(report,null,2));
console.log(`Engine comparison written: ${output}`);
