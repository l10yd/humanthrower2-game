import { test,expect } from '@playwright/test';
test('visible QTE counts space taps, does not count hold/repeat, progressively rises; inventory stays empty until pickup',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;
  g.pauseMenu.close(); // Isolate QTE edge handling with simulation manually paused.
  g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},g.now);
  for(let i=0;i<30;i++){g.player.update({axis:0,stomp:false,pressed:false,released:false},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);}
  g.player.update({axis:0,stomp:false,pressed:false,released:false},g.now,1/60);
 });
 await expect(page.locator('#get-up-qte')).toBeVisible();await expect(page.locator('#get-up-qte')).toContainText('ВСТАТЬ');
 await expect(page.locator('#qte-remaining')).toContainText('УПИРАЕТСЯ');
 const step=()=>page.evaluate(()=>{const g=window.humanthrower;g.player.update(g.input.consume(),g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);});
 await page.keyboard.down('Space');await step();const first=await page.evaluate(()=>window.humanthrower.player.qte.progress);expect(first).toBeGreaterThan(.1);
 await page.keyboard.down('Space');await step();expect(await page.evaluate(()=>window.humanthrower.player.qte.progress)).toBeLessThanOrEqual(first);await page.keyboard.up('Space');
 for(let i=0;i<12&&!await page.evaluate(()=>window.humanthrower.player.qte.ready);i++){await page.keyboard.press('Space');await step();}
 await expect(page.locator('#qte-percent')).toHaveText('100%');await expect(page.locator('#qte-remaining')).toContainText('ПОДЪЁМ ЗА 1 СЕКУНДУ');await page.screenshot({path:'test-results/qte-get-up.png'});
 expect(await page.evaluate(()=>window.humanthrower.player.ragdoll.down)).toBe(true);
 expect(await page.evaluate(()=>window.humanthrower.player.ragdoll.poseProgress)).toBeLessThan(1);
 await page.evaluate(()=>{const g=window.humanthrower;for(let i=0;i<60&&g.player.ragdoll.down;i++){g.player.update({axis:0,pressed:false,released:false,stomp:false},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);}});
 expect(await page.evaluate(()=>window.humanthrower.player.qte.escapes)).toBe(1);
 await expect(page.locator('#get-up-qte')).toBeHidden();await expect(page.locator('#saw-mode')).toHaveAttribute('aria-pressed','false');
 await page.locator('#reset').click();expect(await page.evaluate(()=>window.humanthrower.player.qte.escapes)).toBe(0);await expect(page.locator('#saw-mode')).toHaveAttribute('aria-pressed','false');
});
test('only held running upward saw intercepts descending NPC; paused/equipped-only does not',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;g.weapons.collect('saw');g.saw.aim={x:0,y:10,z:0};
  const part=g.physics.createPart(box(.6,.3,.3),{position:{x:0,y:3.1,z:0},rotation:{x:0,y:0,z:0,w:1}},60,1,'chest');part.body.setLinvel({x:0,y:-8,z:0},true);
  const input={axis:0,pressed:false,released:false,stomp:false};g.saw.update({...input,saw:false},1/60);const idle=g.saw.guard.interceptions;
  g.saw.update({...input,saw:true},1/60);g.player.update(input,g.now,1/60);
  for(const cut of g.saw.guard.cuts)g.gore.cut(cut,g.physics);
  g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  return {idle,snapshot:g.debugSnapshot(),velocities:[...g.physics.parts.values()].map(p=>{const v=p.body.linvel();return [v.x,v.y,v.z];})};
 });
 expect(result.idle).toBe(0);expect(result.snapshot.saw.interceptions).toBe(1);expect(result.snapshot.playerState).toBe('ACTIVE');expect(result.snapshot.parts).toBe(2);
 for(const v of result.velocities){expect(v[0]).toBeCloseTo(0);expect(v[1]).toBeCloseTo(-8);}await page.screenshot({path:'test-results/saw-upward-guard.png'});
});
test('player physically clipped on lethal row, DYING shows fragments first then result freezes',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const cut=await page.evaluate(()=>{
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;g.state='RUNNING';g.detector.arm(1,g.now);g.detector.rows[1].fireAt=g.now;
  (g as unknown as {fixedUpdate():void}).fixedUpdate();
  g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  return {snapshot:g.debugSnapshot(),dead:g.player.ragdoll.dead,parts:[...g.physics.parts.values()].filter(p=>p.owner==='player').map(p=>({cap:p.poly.faces.some(f=>f.cap),position:{...p.body.translation()}}))};
 });
 expect(cut.snapshot.state).toBe('DYING');expect(cut.snapshot.result).toBeNull();expect(cut.dead).toBe(true);expect(cut.parts.some(p=>p.cap)).toBe(true);await expect(page.locator('#overlay')).toBeHidden();
 await page.locator('#pause').click();expect(await page.evaluate(()=>window.humanthrower.state)).toBe('PAUSED');
 const paused=await page.evaluate(()=>window.humanthrower.debugSnapshot());await page.waitForTimeout(150);expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(paused);
 await page.screenshot({path:'test-results/player-row-death.png'});await page.locator('#pause').click();
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.state)).toBe('GAME_OVER');
 const frozen=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(frozen.result?.lossReason).toBe('ROW_CLEAR');await page.waitForTimeout(100);expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(frozen);
});
