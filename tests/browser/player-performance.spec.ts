import { test, expect } from '@playwright/test';
test('player get-up updates are profiled without simulation or renderer timing contamination',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart();g.pause();g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},0);
  const times:number[]=[];let rise=0;
  for(let i=0;i<300&&g.player.ragdoll.down;i++){
    g.physics.snapshot();g.player.update({axis:0,stomp:false,pressed:false,released:false,effortPresses:i%6===0?1:0},g.now,1/60);
    times.push(g.player.ragdoll.queryMs);if(g.player.state==='GETTING_UP')rise++;
    g.physics.step();g.now+=1/60;g.player.afterStep(g.now);
  }
  times.sort((a,b)=>a-b);return {p95:times[Math.floor(times.length*.95)],max:Math.max(...times),rise,recovered:!g.player.ragdoll.down};
 });
 expect(result.recovered).toBe(true);expect(result.rise).toBeGreaterThan(0);console.log(JSON.stringify({getUpProfile:result}));
});
