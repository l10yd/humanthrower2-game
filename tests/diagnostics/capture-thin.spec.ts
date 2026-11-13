import {test,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
test('capture a natural thin-fragment impulse before it grows into the late extreme peak',async({page})=>{
 test.setTimeout(180000);await page.goto('/');await page.waitForFunction(()=>!!window.humanthrower);
 const exact=process.env.HUMANTHROWER_THIN_EXACT==='1';
 const report=await page.evaluate(async exact=>{
  // @ts-expect-error Vite module URL
  const {runBalanceSession}=await import('/tests/fixtures/BalanceSession.ts');
  // @ts-expect-error Vite module URL
  const {vertices,massProperties}=await import('/src/slicing/ConvexClipper.ts');
  // @ts-expect-error Vite module URL
  const {exactMassProperties}=await import('/src/physics/ExactMass.ts');
  const g=window.humanthrower;
  const session=runBalanceSession(g,17,'saw',90,{setup:(g:any)=>{g.physics.diagnosticsEnabled=g.physics.diagnosticsReplayEnabled=true;g.physics.exactFragmentMassEnabled=exact;g.physics.diagnosticsAngularThreshold=1000;g.physics.diagnosticsSpeedThreshold=100;},afterTick:(g:any)=>!!g.physics.faultSnapshot});
  const fault=g.physics.faultSnapshot;if(!fault?.replayBefore)throw Error('No captured extreme impulse');
  const meta=[...g.physics.parts.values()].map(p=>({id:p.id,npcId:p.npcId,owner:p.owner,limb:p.limb,generation:p.generation,density:p.density,poly:p.poly,renderScale:p.renderScale,body:p.body.handle,collider:p.collider.handle,mass:p.body.mass(),principal:{...p.body.principalInertia()},principalFrame:{...p.body.principalInertiaLocalFrame()},com:{...p.body.localCom()},exact:exactMassProperties(p.poly,p.density)}));
  const incident=g.physics.parts.get(fault.partId)!;
  const points=vertices(incident.poly),size=Object.fromEntries(['x','y','z'].map(k=>[k,Math.max(...points.map((p:any)=>p[k]))-Math.min(...points.map((p:any)=>p[k]))]));
  return {session,manifest:{...fault,replayBefore:undefined,parts:meta,allJoints:[...g.physics.joints.values()],incidentSize:size,incidentVolume:massProperties(incident.poly).volume},bytes:Array.from(fault.replayBefore)};
 },exact);
 const prefix=exact?'exact-thin':'natural-thin';
 await mkdir('.pi/thin-replay',{recursive:true});await writeFile(resolve(`.pi/thin-replay/${prefix}.bin`),new Uint8Array(report.bytes));await writeFile(resolve(`.pi/thin-replay/${prefix}.json`),JSON.stringify(report.manifest));await writeFile(resolve(`.pi/thin-replay/${prefix}-session.json`),JSON.stringify(report.session,null,2));
 console.log(JSON.stringify({time:report.manifest.time,id:report.manifest.partId,limb:report.manifest.limb,angular:report.manifest.angular,speed:report.manifest.speed,size:report.manifest.incidentSize,volume:report.manifest.incidentVolume,parts:report.manifest.parts.length,joints:report.manifest.joints.length,before:report.manifest.before,after:report.manifest.after}));
 expect(report.manifest.angular>1000||report.manifest.speed>100).toBe(true);expect(report.manifest.parts.length).toBeGreaterThan(50);
});
