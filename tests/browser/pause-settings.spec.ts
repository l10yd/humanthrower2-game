import {test,expect} from '@playwright/test';
test('pause window contains all settings, freezes simulation and blocks gameplay input',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#pause-menu')).toBeHidden();
 await page.locator('#start').click();await page.keyboard.down('e');await page.keyboard.press('Escape');await page.keyboard.up('e');
 await expect(page.locator('#pause-menu')).toBeVisible();expect(await page.evaluate(()=>window.humanthrower.state)).toBe('PAUSED');
 for(const id of ['mode','npc-mode','resolution','shadows','intensity','blood','volume','sound','retro','head-control-faults'])await expect(page.locator(`#pause-menu #${id}`)).toBeVisible();
 const frozen=await page.evaluate(()=>({time:window.humanthrower.now,bytes:Array.from(window.humanthrower.physics.world.takeSnapshot())}));
 await page.locator('#pause-heading').evaluate(el=>{el.setAttribute('tabindex','-1');(el as HTMLElement).focus();});
 await page.keyboard.press('a');await page.keyboard.press('Space');await page.keyboard.press('q');
 expect(await page.evaluate(()=>window.humanthrower.input.consume())).toMatchObject({axis:0,pressed:false,saw:false,effortPresses:0});
 await page.locator('#resolution').selectOption('480x270');await page.locator('#shadows').selectOption('128');await page.locator('#blood').selectOption('reduced');await page.locator('#volume').fill('0.6');await page.locator('#sound').click();await page.locator('#retro').click();
 expect(await page.evaluate(()=>({time:window.humanthrower.now,bytes:Array.from(window.humanthrower.physics.world.takeSnapshot())}))).toEqual(frozen);
 await page.keyboard.press('Escape');await expect(page.locator('#pause-menu')).toBeHidden();await expect.poll(()=>page.evaluate(()=>window.humanthrower.now)).toBeGreaterThan(frozen.time);
});
test('head control faults stay off by default, opt in persists and disable clears an active episode',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#settings').click();await expect(page.locator('#head-control-faults')).not.toBeChecked();
 await page.locator('#resume').click();await page.locator('#start').click();await page.locator('#pause').click();
 const inspect=()=>page.evaluate(()=>{const g=window.humanthrower;g.player.damage.parts.head=.1;const raw={axis:1,pressed:true,released:false,stomp:false};let inverted=false;for(let i=0;i<600;i++){g.player.controls(raw,i/60);inverted||=g.player.trauma.keyboardInverted||g.player.trauma.mouseInverted;}return {inverted,head:g.player.damage.parts.head};});
 expect(await inspect()).toEqual({inverted:false,head:.1});await page.locator('#head-control-faults').check();expect((await inspect()).inverted).toBe(true);
 await page.locator('#head-control-faults').uncheck();expect(await page.evaluate(()=>window.humanthrower.player.trauma.snapshot)).toEqual({keyboardInverted:false,mouseInverted:false,trips:0});
 await page.locator('#head-control-faults').check();await page.reload();await expect(page.locator('#start')).toBeEnabled();await page.locator('#settings').click();await expect(page.locator('#head-control-faults')).toBeChecked();
});
test('changing gameplay modes from pause restarts but stays paused; title settings can close without starting',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#settings').click();await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.humanthrower.state)).toBe('TITLE');
 await page.locator('#start').click();await page.locator('#pause').click();await page.locator('#npc-mode').selectOption('hunt');await expect(page.locator('#pause-menu')).toBeVisible();
 expect(await page.evaluate(()=>({state:window.humanthrower.state,time:window.humanthrower.now,mode:window.humanthrower.npcMode}))).toEqual({state:'PAUSED',time:0,mode:'hunt'});
 await page.locator('#mode').selectOption('technical');expect(await page.evaluate(()=>window.humanthrower.state)).toBe('PAUSED');
 await page.locator('#resume').click();await expect(page.locator('#pause-menu')).toBeHidden();await page.locator('#pause').click();await page.locator('#pause-title').click();expect(await page.evaluate(()=>window.humanthrower.state)).toBe('TITLE');
});
test('head-control profiles stay separate and mid-session changes mark assisted results',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await expect.poll(()=>page.evaluate(()=>window.humanthrower.now)).toBeGreaterThan(0);await page.locator('#pause').click();
 const before=await page.evaluate(()=>window.humanthrower.recordProfile);await page.locator('#head-control-faults').check();const after=await page.evaluate(()=>window.humanthrower.recordProfile);
 expect(after.arenaPreset).not.toBe(before.arenaPreset);expect(after.assisted).toBe(true);await page.locator('#head-control-faults').uncheck();expect(await page.evaluate(()=>window.humanthrower.recordProfile.assisted)).toBe(true);
 await page.locator('#pause-restart').click();expect(await page.evaluate(()=>window.humanthrower.recordProfile.assisted)).toBe(false);
});
for(const viewport of [{width:1280,height:900},{width:390,height:844},{width:844,height:390}])test(`settings window fits ${viewport.width}x${viewport.height} without resizing arena`,async({page})=>{
 await page.setViewportSize(viewport);await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();const stage=await page.locator('#stage').boundingBox();await page.locator('#pause').click();
 expect(await page.locator('#stage').boundingBox()).toEqual(stage);const bounds=await page.locator('#pause-menu').boundingBox();expect(bounds!.x).toBeGreaterThanOrEqual(0);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(viewport.width);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(viewport.height);
 await page.locator('#pause-heading').evaluate(el=>{el.setAttribute('tabindex','-1');(el as HTMLElement).focus();});await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement?.closest('#pause-menu')?.id)).toBe('pause-menu');
 await page.locator('#resume').click();await expect(page.locator('#pause-menu')).toBeHidden();
});
