import { test, expect } from '@playwright/test';
test('three internal resolutions preserve aspect; intensity zero does not change physics or low-res target',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const defaults=await page.evaluate(()=>({retro:window.humanthrower.renderer.retro,resolution:window.humanthrower.renderer.settings.resolution,visual:window.humanthrower.renderer.playerVisualParts}));
 expect(defaults).toEqual({retro:true,resolution:'320x240',visual:11});await expect(page.locator('#retro')).toHaveText('PS1 spike: вкл.');
 const frozen=await page.evaluate(()=>window.humanthrower.debugSnapshot());
 for(const [name,w,h]of [['320x240',320,240],['426x240',426,240],['480x270',480,270]] as const){
  await page.locator('#resolution').selectOption(name);await page.waitForTimeout(50);
  const dimensions=await page.evaluate(()=>{
   const g=window.humanthrower,rect=document.querySelector('canvas')!.getBoundingClientRect();
   return {width:g.renderer.target.width,height:g.renderer.target.height,aspect:rect.width/rect.height};
  });
  expect(dimensions.width).toBe(w);expect(dimensions.height).toBe(h);expect(dimensions.aspect).toBeCloseTo(w/h,2);
  expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(frozen);
 }
 await page.evaluate(()=>{const input=document.querySelector<HTMLInputElement>('#intensity')!;input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(await page.evaluate(()=>window.humanthrower.renderer.settings.intensity)).toBe(0);
 expect(await page.evaluate(()=>window.humanthrower.renderer.target.width)).toBe(480);
 expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(frozen);
});
