import {test,expect} from '@playwright/test';
test('default fresh drops articulate in the air; pursuit is separate and restarting clears both populations',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#npc-mode')).toHaveValue('twitch');await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;g.warnings=[{x:0,type:'normal',angle:1.1,fireAt:g.now,motionSeed:91,living:true}];g.state='RUNNING';
  for(let i=0;i<18;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();g.pause();
  const parts=[...g.physics.parts.values()].filter(p=>p.owner==='npc'),chest=parts.find(p=>p.limb==='chest')!.body.rotation();
  const articulated=parts.filter(p=>p.limb.startsWith('forearm')).some(p=>Math.abs(p.body.rotation().x-chest.x)+Math.abs(p.body.rotation().y-chest.y)>.05);
  return {snapshot:g.debugSnapshot(),articulated};
 });
 expect(result.snapshot.freshDrops.strokes).toBeGreaterThan(0);expect(result.snapshot.freshDrops.active).toBe(1);expect(result.articulated).toBe(true);expect(result.snapshot.living.attacks).toBe(0);expect(result.snapshot.living.mode).toBe('twitch');
 await page.locator('#npc-mode').selectOption('hunt');
 let state=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(state.living.mode).toBe('hunt');expect(state.living.living).toBe(0);expect(state.freshDrops.active).toBe(0);
 await page.locator('#npc-mode').selectOption('twitch');state=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(state.living.mode).toBe('twitch');expect(state.living.attacks).toBe(0);expect(errors).toEqual([]);
});
