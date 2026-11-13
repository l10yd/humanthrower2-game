import { test, expect } from '@playwright/test';
test('default chaos schedule produces twice-sized safe drops without numerical faults',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;
  for(let i=0;i<480&&g.state==='RUNNING';i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  return {snapshot:g.debugSnapshot(),normal:g.factory.build('normal',{x:0,y:0,z:0},{x:0,y:0,z:0,w:1}),bodyCount:g.physics.parts.size};
 });
 expect(result.snapshot.state).not.toBe('ERROR');expect(result.snapshot.drops).toBeGreaterThanOrEqual(4);
 expect(result.snapshot.numericFaults).toBe(0);expect(result.snapshot.pendingDrops).toBeLessThanOrEqual(6);expect(result.bodyCount).toBeLessThanOrEqual(611);
 const head=result.normal.parts.find(p=>p.name==='head')!;
 expect(Math.max(...head.poly.faces.flatMap(f=>f.vertices.map(v=>v.x)))).toBeCloseTo(.23);
 expect(errors).toEqual([]);console.log(JSON.stringify({chaos:result.snapshot}));
 await page.screenshot({path:'test-results/chaos-default.png'});
});
