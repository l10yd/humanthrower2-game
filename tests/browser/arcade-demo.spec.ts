import { test,expect } from '@playwright/test';
test('default demo clears bottom row, injures legs but keeps player alive',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite browser fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.state='RUNNING';g.scheduler.next=g.scheduler.nextBurst=1e9;
  const block=g.physics.createPart(box(4.5,.5,.1),{position:{x:0,y:.5,z:.9},rotation:{x:0,y:0,z:0,w:1}},72,1,'rowFixture');block.body.setBodyType(1,true);
  const limb=g.physics.createPart(box(.15,.15,.15),{position:{x:2,y:2.5,z:0},rotation:{x:0,y:0,z:0,w:1}},5,2,'forearm1');limb.body.setBodyType(1,true);
  for(let i=0;i<150&&(g.state==='RUNNING'||g.state==='DYING');i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  return {snapshot:g.debugSnapshot(),limbKept:g.physics.parts.has(limb.id),blockKept:g.physics.parts.has(block.id),records:g.records.list(g.recordProfile)};
 });
 expect(result.snapshot.mode).toBe('demo');expect(result.snapshot.state).toBe('RUNNING');expect(result.snapshot.damage.alive).toBe(true);expect(result.snapshot.damage.mobility).toBe('LIMP');
 expect(result.snapshot.rows).toBe(1);expect(result.snapshot.health).toBe(100);expect(result.blockKept).toBe(false);expect(result.limbKept).toBe(true);
 expect(result.records).toHaveLength(0);await expect(page.locator('#body-map')).toContainText('Л. голень');
 await page.locator('#reset').click();expect(await page.evaluate(()=>window.humanthrower.health)).toBe(100);
});
test('jumping above the warned row survives, saw/model are doubled and off-row limbs persist',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite browser fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.state='RUNNING';g.scheduler.next=g.scheduler.nextBurst=1e9;
  const pose={rotation:{x:0,y:0,z:0,w:1}};
  const support=g.physics.createPart(box(.8,.1,.5),{...pose,position:{x:0,y:2.5,z:0}},80,2,'safeSupport');support.body.setBodyType(1,true);
  g.player.body.setTranslation({x:0,y:3.78,z:0},true);g.player.current=g.player.previous={x:0,y:3.78,z:0};
  const block=g.physics.createPart(box(4.5,.5,.1),{...pose,position:{x:0,y:.5,z:0}},72,1,'rowFixture');block.body.setBodyType(1,true);
  for(let i=0;i<150;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  return {snapshot:g.debugSnapshot(),supportKept:g.physics.parts.has(support.id),reach:g.saw.pose().tip.x-g.saw.pose().base.x};
 });
 expect(result.snapshot.state).toBe('RUNNING');expect(result.snapshot.rows).toBe(1);expect(result.snapshot.health).toBe(100);expect(result.supportKept).toBe(true);
 expect(result.snapshot.playerVisualParts).toBe(11);expect(result.reach).toBeCloseTo(2.1);expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/arcade-demo-rows.png'});
});
