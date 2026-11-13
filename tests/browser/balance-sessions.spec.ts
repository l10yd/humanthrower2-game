import {test,expect} from '@playwright/test';
test('session seed is reproducible, affects natural drop plans, persists across restart and validates before mutation',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const r=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {runBalanceSession}=await import('/tests/fixtures/BalanceSession.ts');
  const g=window.humanthrower,a=runBalanceSession(g,17,'idle',4),b=runBalanceSession(g,17,'idle',4),c=runBalanceSession(g,42,'idle',4);
  const positions=(r:typeof a)=>({dropTimes:r.dropTimes,parts:r.final.parts,forms:r.final.spawnForms,player:r.final.player,samples:r.samples});
  g.restart();g.pause();const persisted=g.seed,previous=g.debugSnapshot();let errors=0;
  for(const seed of [-1,NaN,1.5,0x100000000])try{g.restart(seed);}catch{errors++;}
  return {same:JSON.stringify(positions(a))===JSON.stringify(positions(b)),different:JSON.stringify(positions(a))!==JSON.stringify(positions(c)),persisted,invalidUnchanged:JSON.stringify(g.debugSnapshot())===JSON.stringify(previous),errors};
 });
 expect(r).toEqual({same:true,different:true,persisted:42,invalidUnchanged:true,errors:4});
});
test('natural saw seed93 completes won QTE deadlines; a lethal row may abort a later recovery',async({page},testInfo)=>{
 test.setTimeout(90000);await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const r=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {runBalanceSession}=await import('/tests/fixtures/BalanceSession.ts');
  return runBalanceSession(window.humanthrower,93,'saw',31);
 });
 await testInfo.attach('natural-qte.json',{body:JSON.stringify(r,null,2),contentType:'application/json'});
 expect(r.error).toBeNull();expect(r.numericFaults).toBe(0);expect(r.rows).toBeGreaterThan(0);expect(r.recoveries.length).toBeGreaterThan(0);expect(r.abortedRecoveries.every((a:{cause:string})=>a.cause==='defeat')).toBe(true);
 for(const recovery of r.recoveries)expect(recovery.seconds).toBeLessThanOrEqual(1+1/60);
});
