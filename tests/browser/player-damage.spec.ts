import { test,expect } from '@playwright/test';
test('damage map persists lost lower legs, continues play and centers the QTE panel',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;g.state='RUNNING';
  g.detector.arm(0,g.now);g.detector.rows[0].fireAt=g.now;(g as unknown as {fixedUpdate():void}).fixedUpdate();
  for(let i=0;i<90;i++){g.player.update({axis:1,pressed:i%30===0,released:false,stomp:false},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);}
  g.pause();g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  return g.debugSnapshot();
 });
 expect(result.state).toBe('PAUSED');expect(result.result).toBeNull();expect(result.damage.alive).toBe(true);expect(result.damage.mobility).toBe('LIMP');
 await expect(page.locator('#mobility-mode')).toHaveText('Хромота');await expect(page.locator('[data-limb="shin-1"]')).toHaveAttribute('data-hurt','true');
 // Recovery already finished above. Start a fresh grounded knockdown to inspect the visible panel.
 await page.evaluate(()=>{const g=window.humanthrower;g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},g.now);for(let i=0;i<150&&!g.player.qte.active;i++){g.player.update({axis:0,pressed:false,released:false,stomp:false},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);}g.player.update({axis:0,pressed:false,released:false,stomp:false},g.now,1/60);});
 await expect(page.locator('#get-up-qte')).toBeVisible();
 const centers=await page.evaluate(()=>{const stage=document.querySelector('#stage')!.getBoundingClientRect(),panel=document.querySelector('#get-up-qte')!.getBoundingClientRect();return {stage:stage.y+stage.height/2,panel:panel.y+panel.height/2};});
 expect(Math.abs(centers.panel-centers.stage)).toBeLessThan(2);
 await page.screenshot({path:'test-results/player-damage-map.png'});
 await page.locator('#reset').click();expect(await page.evaluate(()=>window.humanthrower.player.damage.mobility)).toBe('WALK');
});
