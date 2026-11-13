import { test, expect } from '@playwright/test';
test('WASM/WebGL2, movement, pause, restart, retro shaders and clear',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
  await page.waitForTimeout(500);const initial=await page.evaluate(()=>window.humanthrower.debugSnapshot());
  await page.keyboard.down('KeyD');await page.waitForTimeout(600);await page.keyboard.up('KeyD');
  expect((await page.evaluate(()=>window.humanthrower.debugSnapshot())).player.x).toBeGreaterThan(initial.player.x+.5);
  await page.keyboard.down('Space');await page.waitForFunction(()=>window.humanthrower.player.current.y>.8,null,{timeout:10000});await page.keyboard.up('Space');
  await page.locator('#pause').click();const paused=await page.evaluate(()=>window.humanthrower.debugSnapshot());await page.waitForTimeout(400);
  expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(paused);await page.locator('#pause').click();
  await page.waitForFunction(()=>window.humanthrower.drops>=1,null,{timeout:25000});expect((await page.evaluate(()=>window.humanthrower.debugSnapshot())).parts).toBeGreaterThanOrEqual(5);
  await page.waitForTimeout(2500);await page.screenshot({path:'test-results/greybox-retro.png'});
  await expect(page.locator('#cut')).toBeDisabled();expect(errors).toEqual([]);
  await page.locator('#reset').click();const reset=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(reset.parts).toBe(0);expect(reset.joints).toBe(0);
  expect(reset.time).toBeLessThan(.3);await page.screenshot({path:'test-results/greybox.png'});
  for(let i=0;i<20;i++){await page.locator('#reset').click();const s=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(s.parts).toBe(0);expect(s.joints).toBe(0);}
  expect(errors).toEqual([]);
});
