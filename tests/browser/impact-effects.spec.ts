import { test,expect } from '@playwright/test';
test('real descending impact triggers one bounded thud/blood event, mute leaves physics unchanged, restart clears counters',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const first=await page.evaluate(async()=>{
  // @ts-expect-error browser fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.pause();g.start();g.scheduler.next=g.scheduler.nextBurst=1e9;
  const p=g.physics.createPart(box(.25,.25,.2),{position:{x:2,y:4,z:0},rotation:{x:0,y:0,z:0,w:1}},22,1,'chest');p.body.setLinvel({x:0,y:-8,z:0},true);
  for(let i=0;i<120;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  const snapshot=g.debugSnapshot();g.pause();return snapshot;
 });
 expect(first.contactImpacts.total).toBeGreaterThan(0);expect(first.contactImpacts.total).toBeLessThan(5);expect(first.audio.impactSounds).toBeGreaterThan(0);expect(first.gore.emitted).toBeGreaterThan(0);expect(first.numericFaults).toBe(0);
 expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.voices)).toBe(0);
 await page.locator('#sound').click();
 const muted=await page.evaluate(async()=>{
  // @ts-expect-error browser fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.start();const sounds=g.audio.impactSounds;
  const p=g.physics.createPart(box(.25,.25,.2),{position:{x:-2,y:4,z:0},rotation:{x:0,y:0,z:0,w:1}},22,2,'chest');p.body.setLinvel({x:0,y:-8,z:0},true);
  for(let i=0;i<120;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();const snapshot=g.debugSnapshot();g.pause();return {sounds,snapshot};
 });
 expect(muted.snapshot.contactImpacts.total).toBeGreaterThan(first.contactImpacts.total);expect(muted.snapshot.audio.impactSounds).toBe(muted.sounds);expect(muted.snapshot.audio.voices).toBe(0);
 await page.locator('#reset').click();const reset=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(reset.contactImpacts.total).toBe(0);expect(reset.audio.impactSounds).toBe(0);expect(reset.gore.emitted).toBe(0);expect(errors).toEqual([]);
});
