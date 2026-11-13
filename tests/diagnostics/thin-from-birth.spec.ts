import {test,expect} from '@playwright/test';
import {resolve,dirname} from 'node:path';
import {writeFile,mkdir} from 'node:fs/promises';
test('compare exact fragment properties from birth over three natural saw trajectories',async({page})=>{
 test.setTimeout(300000);await page.goto('/');await page.waitForFunction(()=>!!window.humanthrower);
 const output=resolve(process.env.HUMANTHROWER_THIN_OUTPUT??'.pi/thin-replay/from-birth.json');
 const runs=[];
 for(const seed of [17,42,93])for(const exact of [false,true]){
  const report=await page.evaluate(async({seed,exact})=>{
   // @ts-expect-error Vite module URL
   const {runBalanceSession}=await import('/tests/fixtures/BalanceSession.ts');
   // @ts-expect-error Vite module URL
   const {RecordStore}=await import('/src/gameplay/RecordStore.ts');
   const g=window.humanthrower;g.records=new RecordStore(null);
   const result=runBalanceSession(g,seed,'saw',45,{setup:(g:any)=>{g.physics.exactFragmentMassEnabled=exact;}});
   return {exact,...result};
  },{seed,exact});
  runs.push(report);await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({complete:false,runs},null,2));
  console.log(JSON.stringify({seed,exact,seconds:report.durationSeconds,status:report.status,speed:report.maxSpeed,angular:report.maxAngularSpeed,rows:report.rows,cuts:report.weaponCuts,error:report.error}));
 }
 await writeFile(output,JSON.stringify({complete:true,profile:'isolated diagnostic worlds; exact OFF in production; no acceptance claim',runs},null,2));
 expect(runs).toHaveLength(6);for(const r of runs){expect(r.error).toBeNull();expect(r.numericFaults).toBe(0);}
});
