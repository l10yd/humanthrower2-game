import {test,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
test('isolated native package: three natural saw sessions retain real input and physics criteria',async({page})=>{
 test.setTimeout(240000);const output=resolve(process.env.HUMANTHROWER_NATIVE_REPORT??'.pi/native-build/native-natural.json');
 await page.goto('/');await page.waitForFunction(()=>!!window.humanthrower);const runs=[];
 for(const seed of [17,42,93]){
  const report=await page.evaluate(async seed=>{
   // @ts-expect-error Vite module URL
   const {runBalanceSession}=await import('/tests/fixtures/BalanceSession.ts');
   // @ts-expect-error Vite module URL
   const {RecordStore}=await import('/src/gameplay/RecordStore.ts');
   const g=window.humanthrower;g.records=new RecordStore(null);return runBalanceSession(g,seed,'saw',45);
  },seed);
  runs.push(report);await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({complete:false,runs},null,2));
  console.log(JSON.stringify({seed,seconds:report.durationSeconds,speed:report.maxSpeed,angular:report.maxAngularSpeed,rows:report.rows,cuts:report.weaponCuts,error:report.error}));
 }
 await writeFile(output,JSON.stringify({complete:true,package:process.env.HUMANTHROWER_NATIVE_PACKAGE,runs},null,2));
 for(const r of runs){expect(r.error).toBeNull();expect(r.numericFaults).toBe(0);}
 // Recording an unstable run is a successful diagnostic, not a passed velocity gate.
});
