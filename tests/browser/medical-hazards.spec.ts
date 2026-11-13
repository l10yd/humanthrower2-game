import {test,expect} from '@playwright/test';
test('medkit heals existing tissue and air in game, then freezes with pause and resets',async({page})=>{
 await page.goto('/?art=off');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart();g.pause();g.state='RUNNING';g.scheduler.next=g.chaos.nextEvent=g.chaos.nextWeapon=g.chaos.nextMedkit=1e9;
  g.player.damage.parts.head=.3;g.player.damage.retain('forearm-1',0);g.survival.air=1;
  const item=g.sky.spawn('medkit',g.player.current.x);item.position={...g.player.current};(g as unknown as {fixedUpdate():void}).fixedUpdate();
  const healed={head:g.player.damage.parts.head,arm:g.player.damage.parts['forearm-1'],air:g.survival.air,used:g.medicalUsed};
  g.chaos.nextMedkit=g.now;const step=()=>(g as unknown as {fixedUpdate():void}).fixedUpdate();step();const count=g.sky.items.length;g.pause();for(let n=0;n<120;n++)step();const paused=g.sky.items.length;g.restart();g.pause();return {healed,count,paused,reset:g.medicalUsed};
 });
 expect(result.healed).toEqual({head:.55,arm:0,air:3,used:1});expect(result.paused).toBe(result.count);expect(result.reset).toBe(0);
});
test('normal HUD hides diagnostics, warns at low health and debug URL restores tools',async({page})=>{
 await page.goto('/?art=off');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 await page.evaluate(()=>{const g=window.humanthrower;g.pause();g.player.damage.parts.head=.2;});
 await expect(page.locator('#stats')).toContainText('ОЧКОВ');await expect(page.locator('#stats')).not.toContainText('физика');await expect(page.locator('#stats')).toHaveAttribute('data-danger','true');await expect(page.locator('#impact')).toBeHidden();
 await page.goto('/?art=off&debug');await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#impact')).toBeVisible();await expect(page.locator('#stats')).toContainText('физика');
});
test('medical sky visuals show cross and survive renderer restart without errors',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 await page.evaluate(()=>{const g=window.humanthrower;g.pause();g.sky.spawn('medkit',3).position.y=8;});
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.renderer.scene.getObjectByName('Sky-medkit-1')?.children.length)).toBeGreaterThanOrEqual(4);
 await page.evaluate(()=>{window.humanthrower.restart();window.humanthrower.pause();});expect(errors).toEqual([]);
});
