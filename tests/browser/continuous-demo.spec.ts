import { test,expect } from '@playwright/test';
test('continuous demo keeps dropping without a safe route until death, then freezes and restarts',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const report=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart();g.pause();g.state='RUNNING';
  const drops:number[]=[],times:number[]=[];let last=0;
  for(let i=0;i<2400&&(g.state==='RUNNING'||g.state==='DYING');i++){
   (g as unknown as {fixedUpdate():void}).fixedUpdate();
   if(g.drops!==last){times.push(g.now);drops.push(g.drops);last=g.drops;}
  }
  return {snapshot:g.debugSnapshot(),times,drops,budget:g.spawnCommitBlocks.budget};
 });
 console.log(JSON.stringify({continuousDemo:report}));
 expect(report.snapshot.mode).toBe('demo');expect(report.snapshot.state).toBe('GAME_OVER');
 expect(['ROW_CLEAR','IMPACT','SUFFOCATION','OVERFLOW']).toContain(report.snapshot.result?.lossReason);
  // The closed ceiling is a real entry constraint: a warned column may wait
  // for the previous body. It must never allocate overlapping invisible drops.
  expect(report.snapshot.spawnBlockReasons.route).toBe(0);expect(report.snapshot.spawnBlockReasons.budget).toBe(0);
  expect(report.snapshot.spawnBlocked).toBe(report.budget+report.snapshot.spawnCommitBlocks.overlap);
 expect(report.drops.length).toBeGreaterThan(5);
 expect(report.times[0]).toBeCloseTo(1.5,1);
 for(let i=1;i<report.times.length;i++)expect(report.times[i]).toBeGreaterThanOrEqual(report.times[i-1]);
 expect(report.snapshot.pendingDrops).toBeLessThanOrEqual(6);
 const frozen=await page.evaluate(()=>window.humanthrower.debugSnapshot());await page.waitForTimeout(100);
 expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(frozen);
 await page.screenshot({path:'test-results/continuous-demo-result.png'});await page.locator('#reset').click();
 expect(await page.evaluate(()=>({health:window.humanthrower.health,air:window.humanthrower.survival.air,hits:window.humanthrower.survival.hits}))).toEqual({health:100,air:5,hits:0});
});
