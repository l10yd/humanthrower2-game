import {test,expect} from '@playwright/test';
for(const width of [1280,640])test(`tutorial is nonblocking, stays inside stage and leaves HUD fixed at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#tutorial-hint')).toBeHidden();
 await page.locator('#start').click();await expect(page.locator('#tutorial-hint')).toBeVisible();await expect(page.locator('#tutorial-heading')).toHaveText('Двигайся и прыгай');
 await page.locator('#pause').click();const frozen=await page.evaluate(()=>window.humanthrower.debugSnapshot().tutorial),stage=await page.locator('#stage').boundingBox(),footer=await page.locator('footer').boundingBox(),panel=await page.locator('#tutorial-hint').boundingBox();
 expect(panel!.x).toBeGreaterThanOrEqual(stage!.x);expect(panel!.x+panel!.width).toBeLessThanOrEqual(stage!.x+stage!.width+1);expect(panel!.y+panel!.height).toBeLessThanOrEqual(stage!.y+stage!.height+1);
 await page.waitForTimeout(150);expect(await page.evaluate(()=>window.humanthrower.debugSnapshot().tutorial)).toEqual(frozen);
 await page.evaluate(()=>window.humanthrower.pauseMenu.close()); // Tutorial hit-testing, separately from settings overlay.
 const passThrough=await page.evaluate(()=>{const text=document.querySelector('#tutorial-text')!,r=text.getBoundingClientRect();return !document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#tutorial-hint');});expect(passThrough).toBe(true);
 await page.locator('#tutorial-dismiss').click();await expect(page.locator('#tutorial-hint')).toBeHidden();expect(await page.locator('#stage').boundingBox()).toEqual(stage);expect(await page.locator('footer').boundingBox()).toEqual(footer);
 await page.reload();await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await expect.poll(()=>page.evaluate(()=>window.humanthrower.now)).toBeGreaterThan(.1);await expect(page.locator('#tutorial-hint')).toBeHidden();
 await page.locator('#tutorial-replay').click();await expect(page.locator('#tutorial-hint')).toBeVisible();await expect(page.locator('#tutorial-heading')).toHaveText('Двигайся и прыгай');
});
test('real grounded QTE and row warnings replace basic guidance; dying and technical screens hide it',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 await page.evaluate(()=>{const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},g.now);g.state='RUNNING';for(let i=0;i<35;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();g.pause();});
 await expect(page.locator('#tutorial-hint')).toHaveAttribute('data-lesson','QTE');await expect(page.locator('#tutorial-text')).toContainText('Удержание не считается');
 await page.evaluate(()=>{const g=window.humanthrower;g.input.consume=()=>({axis:0,pressed:true,released:false,stomp:false});g.state='RUNNING';for(let i=0;i<30&&!g.player.qte.ready;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();g.pause();});
 await expect(page.locator('#tutorial-hint')).toHaveAttribute('data-lesson','WON');
 await page.evaluate(()=>{const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;g.detector.arm(7,g.now);g.state='RUNNING';(g as unknown as {fixedUpdate():void}).fixedUpdate();g.pause();});
 await expect(page.locator('#tutorial-hint')).toHaveAttribute('data-lesson','ROW');await expect(page.locator('#tutorial-text')).toContainText('выше или ниже');
 await page.evaluate(()=>{window.humanthrower.state='DYING';});await expect(page.locator('#tutorial-hint')).toBeHidden();
 await page.locator('#settings').click();await page.locator('#mode').selectOption('technical');if(await page.locator('#resume').isVisible())await page.locator('#resume').click();await expect.poll(()=>page.evaluate(()=>window.humanthrower.now)).toBeGreaterThan(.1);await expect(page.locator('#tutorial-hint')).toBeHidden();
});
test('enabled and dismissed tutorial produce identical seeded gameplay/physics trajectories',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const states=await page.evaluate(()=>{
  const g=window.humanthrower;
  const run=(enabled:boolean)=>{g.restart();g.pause();if(enabled)g.tutorial.replay();else g.tutorial.dismiss();g.state='RUNNING';
   g.input.consume=()=>({axis:Math.floor(g.now*2)%2?1:-1,pressed:Math.floor(g.now*60)%45===0,released:false,stomp:false,saw:false});
   const samples=[];for(let i=0;i<240&&g.state==='RUNNING';i++){(g as unknown as {fixedUpdate():void}).fixedUpdate();if(i%30===0)samples.push({time:g.now,score:g.score,health:g.health,drops:g.drops,warning:g.warnings.map(w=>({...w})),player:{...g.player.current},qte:g.player.qte.snapshot,rows:g.detector.rows.map(r=>({...r})),parts:[...g.physics.parts.values()].map(p=>({id:p.id,poly:p.poly,position:{...p.body.translation()},rotation:{...p.body.rotation()},velocity:{...p.body.linvel()},angular:{...p.body.angvel()},mass:p.body.mass()}))});}g.pause();return samples;};
  return {on:run(true),off:run(false)};
 });
 expect(states.on).toHaveLength(8);expect(states.on).toEqual(states.off);
});
test('blocked storage keeps tutorial and game usable with session-local dismissal',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('denied');}});});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await expect(page.locator('#tutorial-hint')).toBeVisible();
 await page.locator('#tutorial-dismiss').click();await page.locator('#reset').click();await expect(page.locator('#tutorial-hint')).toBeHidden();await expect.poll(()=>page.evaluate(()=>window.humanthrower.now)).toBeGreaterThan(.1);
});
