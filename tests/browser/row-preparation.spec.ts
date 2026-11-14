import {test,expect} from '@playwright/test';
test('real geometry Worker preflights a warning, reuses only exact current poses and never delays commit',async({page})=>{
 await page.goto('/?art=off&geometry-worker');await expect(page.locator('#start')).toBeEnabled();
 await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.pause();g.detector.arm(1,g.now);
  for(let i=0;i<40;i++){const p=g.physics.createPart(box(.02,.7,.02),{position:{x:(i%10-4.5)*.5,y:1.5,z:0},rotation:{x:0,y:0,z:0,w:1}},1,i+1,'fragment');p.body.sleep();}
  g.rowPreparation.update(g.physics.parts.values(),g.detector.rows,g.detector.rows[1].fireAt-.2);
 });
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.rowPreparation.snapshot.replies)).toBeGreaterThan(0);
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture
  const {clearRows}=await import('/src/slicing/ClearTransaction.ts');
  const g=window.humanthrower,source=[...g.physics.parts.values()][0];source.body.setTranslation({x:0,y:3,z:0},false);
  const clear=clearRows(g.physics,[1],'solver',false,[],g.rowPreparation.cache),cache=g.rowPreparation.snapshot;
  g.restart();g.pause();return {clear,cache,reset:g.rowPreparation.snapshot,parts:g.physics.parts.size};
 });
 expect(result.cache.hits).toBe(39);expect(result.cache.misses).toBe(1);expect(result.clear.rows).toEqual([1]);expect(result.reset.preparedParts).toBe(0);expect(result.parts).toBe(0);
});
test('unavailable Worker uses synchronous slicing at the same deadline',async({page})=>{
 await page.addInitScript(()=>{window.Worker=class {constructor(){throw Error('blocked Worker');}} as unknown as typeof Worker;});
 await page.goto('/?art=off&geometry-worker');await expect(page.locator('#start')).toBeEnabled();
 const report=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.restart();g.pause();g.state='RUNNING';g.scheduler.next=g.chaos.nextEvent=g.chaos.nextWeapon=1e9;
  g.physics.createPart(box(.02,.7,.02),{position:{x:3,y:1.5,z:0},rotation:{x:0,y:0,z:0,w:1}},1,1,'fragment');g.detector.arm(1,g.now);
  const deadline=g.detector.rows[1].fireAt;for(let i=0;i<72;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();g.pause();
  return {unavailable:g.rowPreparation.snapshot.unavailable,sequence:g.physics.clearSequence,now:g.now,deadline};
 });
 expect(report.unavailable).toBe(true);expect(report.sequence).toBe(1);expect(report.now).toBeGreaterThanOrEqual(report.deadline);expect(report.now-report.deadline).toBeLessThan(.06);
});
