import { test, expect } from '@playwright/test';
test('three actual warned cuts end the run, freeze result, store record and restart without reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#settings').click();await page.locator('#mode').selectOption('technical');
 await page.evaluate(()=>{window.humanthrower.scheduler.next=1e9;window.humanthrower.scheduler.nextBurst=1e9;});
 await page.evaluate(()=>{
  const g=window.humanthrower,step=()=>{(g as unknown as {fixedUpdate():void}).fixedUpdate();};
  for(let event=0;event<3;event++){g.detector.arm(1,g.now);for(let i=0;i<125&&g.state==='RUNNING';i++)step();}
 });
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.state)).toBe('GAME_OVER');
 await expect(page.locator('#overlay h1')).toHaveText('СТОЙКОСТЬ ИСЧЕРПАНА');
 const result=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(result.health).toBe(0);expect(result.result?.lossReason).toBe('RESILIENCE');
 await page.waitForTimeout(200);expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(result);
 expect(await page.evaluate(()=>window.humanthrower.records.list(window.humanthrower.recordProfile).length)).toBe(1);
 await page.locator('#title').click();await expect(page.locator('#overlay h1')).toHaveText('HUMANTHROWER');
 await page.locator('#start').click();expect(await page.evaluate(()=>window.humanthrower.health)).toBe(3);expect(await page.evaluate(()=>window.humanthrower.result)).toBeNull();
 await page.reload();await expect(page.locator('#start')).toBeEnabled();await page.locator('#settings').click();await page.locator('#mode').selectOption('technical');
 expect(await page.evaluate(()=>window.humanthrower.records.list(window.humanthrower.recordProfile)[0]?.lossReason)).toBe('RESILIENCE');
 expect(errors).toEqual([]);
});
test('stable upper geometry, not a flying NPC, produces overflow result',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#settings').click();await page.locator('#mode').selectOption('technical');
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL.
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  // @ts-expect-error Vite fixture URL.
  const {CONFIG}=await import('/src/core/Config.ts');
  const g=window.humanthrower,part=g.physics.createPart(box(3,.7,.2),{position:{x:-1.5,y:(CONFIG.arena.critical+CONFIG.arena.height)/2,z:0},rotation:{x:0,y:0,z:0,w:1}},72,1,'overflowFixture');
  part.body.setBodyType(1,true); // RAPIER.RigidBodyType.Fixed, so this is a stable fixture load.
  for(let i=0;i<230&&g.state==='RUNNING';i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  return g.debugSnapshot();
 });
 expect(result.state).toBe('GAME_OVER');expect(result.result?.lossReason).toBe('OVERFLOW');
 await expect(page.locator('#overlay h1')).toHaveText('КАМЕРА ПЕРЕПОЛНЕНА');
});
test('a genuine supported closed trap produces squeeze, not a blocked get-up alone',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#settings').click();await page.locator('#mode').selectOption('technical');
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL.
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  // @ts-expect-error Vite fixture URL.
  const {RAPIER}=await import('/src/physics/PhysicsManager.ts');
  const g=window.humanthrower;
  for(const x of [-.62,.62])g.physics.world.createCollider(RAPIER.ColliderDesc.cuboid(.1,1.3,.6).setTranslation(x,1.3,0));
  const roof=g.physics.createPart(box(.7,.1,.5),{position:{x:0,y:2.42,z:0},rotation:{x:0,y:0,z:0,w:1}},22,1,'trapFixture');roof.body.setBodyType(RAPIER.RigidBodyType.Fixed,true);
  for(let i=0;i<400&&g.state==='RUNNING';i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  return g.debugSnapshot();
 });
 expect(result.state).toBe('GAME_OVER');expect(result.result?.lossReason).toBe('SQUEEZE');expect(result.health).toBe(3);
});
