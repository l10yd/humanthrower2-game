import { test,expect } from '@playwright/test';
test('aim change starts a new cut plane and its in-world progress cue hides on pause',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const report=await page.evaluate(async()=>{
  // @ts-expect-error browser Vite URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;
  const base=g.saw.pose().base;
  g.physics.createPart(box(.35,.4,.22),{position:{x:.75,y:base.y,z:0},rotation:{x:0,y:0,z:0,w:1}},22,1,'chest');
  g.saw.enabled=true;const input={axis:0,stomp:false,pressed:false,released:false,saw:true};
  for(let i=0;i<10;i++)g.saw.update(input,1/60);const before=g.saw.progress;
  g.saw.aim={x:base.x+1,y:base.y+.6,z:0};g.saw.update(input,1/60);const reset=g.saw.progress;
  g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  const visible=g.renderer.scene.getObjectByName('SawCutProgress')!.visible;
  g.pause();g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  return {before,reset,cuts:g.saw.cuts,visible,paused:g.renderer.scene.getObjectByName('SawCutProgress')!.visible};
 });
 expect(report.before).toBeGreaterThan(.8);expect(report.reset).toBeLessThan(.1);expect(report.cuts).toBe(0);expect(report.visible).toBe(true);expect(report.paused).toBe(false);expect(errors).toEqual([]);
});
