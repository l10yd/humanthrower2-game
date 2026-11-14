import {test,expect} from '@playwright/test';
test('armed rows show shape-coded warning, frozen countdown and simulation-time audio pulses',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.state='RUNNING';g.audio.setRunning(true);g.scheduler.next=g.chaos.nextEvent=g.chaos.nextWeapon=g.chaos.nextMedkit=1e9;g.detector.arm(5,g.now);
  for(let i=0;i<4;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();g.pause();
  return {sounds:g.audio.snapshot.warningSounds,now:g.now,fireAt:g.detector.rows[5].fireAt};
 });
 await expect(page.locator('#row-warning')).toBeVisible();await expect(page.locator('#row-warning')).toContainText('6-й ряд');
 const text=await page.locator('#row-warning').textContent();await page.waitForTimeout(150);expect(await page.locator('#row-warning').textContent()).toBe(text);
 expect(result.sounds).toBeGreaterThan(0);expect(result.fireAt-result.now).toBeGreaterThan(1);
 const visuals=await page.evaluate(()=>{
  const r=window.humanthrower.renderer as unknown as {bands:{visible:boolean;material:{map:unknown}}[];bandBorders:{visible:boolean}[]};
  return {band:r.bands[5].visible,border:r.bandBorders[5].visible,hatch:!!r.bands[5].material.map,sounds:window.humanthrower.audio.snapshot.warningSounds};
 });
 expect(visuals).toMatchObject({band:true,border:true,hatch:true,sounds:result.sounds});
 await page.evaluate(()=>{const g=window.humanthrower;g.detector.committed([5],g.now);});await expect(page.locator('#row-warning')).toBeHidden();
});
