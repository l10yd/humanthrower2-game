import { test, expect } from '@playwright/test';
test('collected saw, mouse aim and held E cut a physical torso; pause and restart clear effects',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const target=await page.evaluate(async()=>{
  // @ts-expect-error browser Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextEvent=g.chaos.nextWeapon=1e9;g.weapons.collect('saw');
  const part=g.physics.createPart(box(.3,.32,.22),{position:{x:.85,y:g.saw.pose().base.y,z:0},rotation:{x:0,y:0,z:0,w:1}},22,1,'chest');
  part.body.setGravityScale(0,true);
  const r=g.renderer.renderer.domElement.getBoundingClientRect();
  const point=g.renderer.camera.position.clone().set(.9,g.saw.pose().base.y,0).project(g.renderer.camera);
  return {x:r.left+(point.x+1)*r.width/2,y:r.top+(1-point.y)*r.height/2};
 });
 await expect(page.locator('#saw-mode')).toHaveAttribute('aria-pressed','true');
 await page.mouse.move(target.x,target.y);await page.keyboard.down('e');
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.saw.cuts)).toBeGreaterThan(0);await page.keyboard.up('e');
 const state=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(state.parts).toBeGreaterThanOrEqual(2);expect(state.gore.emitted).toBeGreaterThan(60);expect(state.numericFaults).toBe(0);
 await page.locator('#pause').click();const frozen=await page.evaluate(()=>window.humanthrower.debugSnapshot());await page.waitForTimeout(200);
 expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(frozen);
 await page.locator('#resolution').selectOption('480x270');await page.screenshot({path:'test-results/saw-gore.png'});
 await page.locator('#reset').click();const reset=await page.evaluate(()=>window.humanthrower.debugSnapshot());
 expect(reset.saw.enabled).toBe(false);expect(reset.weapons.inventory).toEqual({});expect(reset.saw.cuts).toBe(0);expect(reset.gore.emitted).toBe(0);expect(reset.parts).toBe(0);
 expect(errors).toEqual([]);
});
test('held pointer blade works without E and release cancels; seven enlarged NPC masses are exposed',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 await page.evaluate(()=>{const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextEvent=g.chaos.nextWeapon=1e9;g.weapons.collect('saw');});
 await expect(page.locator('#saw-mode')).toHaveAttribute('aria-pressed','true');const rect=await page.locator('#scene').boundingBox();
 await page.mouse.move(rect!.x+rect!.width*.6,rect!.y+rect!.height*.8);await page.mouse.down();
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.saw.active)).toBe(true);await page.mouse.up();
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.saw.active)).toBe(false);
 const mass=await page.evaluate(()=>{const g=window.humanthrower;g.factory.spawn('normal',{x:0,y:5,z:0},{x:0,y:0,z:0,w:1},false);return g.debugSnapshot().npcMass;});
 expect(mass).toBeCloseTo(144,1);
});
