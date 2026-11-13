import {test,expect} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
// Opt-in diagnostic. Run on a fresh server; normal browser suite does not run it.
test('ten paired natural balance sessions produce an explicitly censored report',async({page})=>{
 test.skip(process.env.HUMANTHROWER_BALANCE_10!=='1','Opt-in balance measurement');test.setTimeout(420000);
 const output=resolve(process.env.HUMANTHROWER_BALANCE_OUTPUT??'.pi/balance-10-sessions-fixed.json');
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const cases=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  return (await import('/tests/fixtures/BalanceSession.ts')).BALANCE_CASES;
 });
 const sessions=[];for(const c of cases){
  const result=await page.evaluate(async c=>{
   // @ts-expect-error Vite module URL
   const {runBalanceSession}=await import('/tests/fixtures/BalanceSession.ts');return runBalanceSession(window.humanthrower,c.seed,c.policy,90);
  },c);
  sessions.push(result);await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({complete:false,sessions},null,2));
  console.log(JSON.stringify({balance:c,status:result.status,seconds:result.durationSeconds,loss:result.lossReason,rows:result.rows,cuts:result.weaponCuts,escapes:result.escapes,recoveries:result.recoveries,maxAngular:result.maxAngularSpeed}));
 }
 const report={schemaVersion:1,complete:true,profile:'five seeds, paired idle/saw diagnostic bots; NOT human balance or reference FPS acceptance',maximumSimulatedSeconds:90,sessions,
  limitations:['Exact-world-position aiming.','Runs reaching90s are right-censored.','Existing angular/thin physics instability invalidates final balance conclusions.','No balance rules or physics thresholds changed.']};
 await writeFile(output,JSON.stringify(report,null,2));
 expect(sessions).toHaveLength(10);for(const r of sessions){expect(r.error).toBeNull();expect(r.numericFaults).toBe(0);for(const recovery of r.recoveries)expect(recovery.seconds).toBeLessThanOrEqual(1+1/60);}
});
