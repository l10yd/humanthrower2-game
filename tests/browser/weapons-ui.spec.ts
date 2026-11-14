import { test,expect } from '@playwright/test';
import type {Page} from '@playwright/test';
async function grantToolbox(page:Page){
 await page.evaluate(()=>{const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextEvent=g.chaos.nextWeapon=1e9;for(const kind of ['saw','axe','sword','launcher','svarl','rotor','svarlHead'] as const)g.weapons.collect(kind);g.weapons.select('saw');});
 await expect(page.locator('#weapon')).toBeEnabled();
}
for(const width of [1280,640])test(`HUD remains fixed at ${width}px when status and weapon labels change`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 await grantToolbox(page);
 const before=await page.locator('#stage').boundingBox(),footer=await page.locator('footer').boundingBox(),button=await page.locator('#next-weapon').boundingBox();
 await page.evaluate(()=>{
  document.querySelector('#player-status')!.textContent='ПРИЖАТ — жми ПРОБЕЛ для выхода '.repeat(20);document.querySelector('#hint')!.textContent='Длинная меняющаяся подсказка '.repeat(30);document.querySelector('#stats')!.textContent='Статистика физики и боя '.repeat(60);
 });
 for(const kind of ['axe','sword','launcher','svarl','saw']){
  await page.locator('#weapon').selectOption(kind);
  expect(await page.locator('#stage').boundingBox()).toEqual(before);expect(await page.locator('footer').boundingBox()).toEqual(footer);expect(await page.locator('#next-weapon').boundingBox()).toEqual(button);
 }
});
test('Q and next-weapon button cycle selection, no cycling in menu',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.keyboard.press('q');await expect(page.locator('#weapon')).toHaveValue('');await page.locator('#start').click();await grantToolbox(page);
 for(const kind of ['axe','sword','launcher','svarl','rotor','svarlHead','saw']){await page.keyboard.press('q');await expect(page.locator('#weapon')).toHaveValue(kind);}
 await page.locator('#next-weapon').click();await expect(page.locator('#weapon')).toHaveValue('axe');await page.locator('#pause').click();
 const selected=await page.evaluate(()=>window.humanthrower.weapons.snapshot);expect(selected.active).toBe(false);
});
test('mouse chop and thrust have independent sources, context menu is prevented, blur releases both',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower,c=document.querySelector<HTMLCanvasElement>('#scene')!;g.pauseMenu.close();c.setPointerCapture=()=>{};
  const send=(type:string,button:number,buttons:number)=>c.dispatchEvent(new PointerEvent(type,{pointerId:2,button,buttons,bubbles:true,cancelable:true}));
  send('pointerdown',0,1);const chop=g.input.consume();send('pointermove',2,3);const both=g.input.consume();send('pointermove',0,2);const thrust=g.input.consume();
  const suppressed=!c.dispatchEvent(new MouseEvent('contextmenu',{cancelable:true}));window.dispatchEvent(new Event('blur'));const cleared=g.input.consume();
  return {chop,both,thrust,suppressed,cleared};
 });
 expect(result.chop).toMatchObject({saw:true,thrust:false,effortPresses:0});expect(result.both).toMatchObject({saw:true,thrust:true});expect(result.thrust).toMatchObject({saw:false,thrust:true});expect(result.suppressed).toBe(true);expect(result.cleared).toMatchObject({saw:false,thrust:false});
});
test('weapon visual meshes render and Svarl mouth is enlarged',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();await grantToolbox(page);
 for(const kind of ['axe','sword','launcher','svarl']){
  await page.locator('#weapon').selectOption(kind);await page.waitForTimeout(80);
  const visual=await page.evaluate(kind=>{const o=window.humanthrower.renderer.scene.getObjectByName(`Weapon-${kind}`)!;return {visible:o.visible,scale:o.scale.x};},kind);
  expect(visual.visible).toBe(true);if(kind==='svarl')expect(visual.scale).toBe(1.8);
 }
 await page.screenshot({path:'test-results/weapons-ui.png'});
});
