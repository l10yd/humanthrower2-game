import { test,expect } from '@playwright/test';
test('natural arcade session: movement, jumping and held saw keep drops/cuts finite through defeat',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart();g.pause();g.state='RUNNING';g.saw.enabled=true;let tick=0;
  g.input.consume=()=>{
   const base=g.saw.pose().base;
   const target=[...g.physics.parts.values()].filter(p=>p.owner==='npc').sort((a,b)=>Math.hypot(a.body.worldCom().x-base.x,a.body.worldCom().y-base.y)-Math.hypot(b.body.worldCom().x-base.x,b.body.worldCom().y-base.y))[0];
   g.saw.aim=target?{...target.body.worldCom()}:null;
   return {axis:g.player.current.x>2.7?-1:g.player.current.x<-2.7?1:Math.floor(tick/180)%2?1:-1,pressed:tick%45===0,released:tick%45===20,stomp:false,saw:true,effortPresses:tick%6===0?1:0};
  };
  for(tick=0;tick<3600&&(g.state==='RUNNING'||g.state==='DYING');tick++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  return g.debugSnapshot();
 });
 console.log(JSON.stringify({arcadePlay:result}));
 expect(result.state).not.toBe('ERROR');expect(result.numericFaults).toBe(0);expect(result.drops).toBeGreaterThan(5);expect(result.saw.cuts).toBeGreaterThan(0);
 expect(result.parts).toBeLessThanOrEqual(720);expect(result.pendingDrops).toBeLessThanOrEqual(6);
 await page.screenshot({path:'test-results/arcade-natural-play.png'});
});
