import { test, expect } from '@playwright/test';
test('doubled NPC pile: profiled player updates and squeeze queries retain real collisions',async({page},testInfo)=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const report=await page.evaluate(()=>{
  const g=window.humanthrower;
  g.mode='technical';g.restart();g.pause();
  let beforeDrops=0;
  // Accumulate the same real physical pile as the chaos run; do not use forced overlaps.
  g.state='RUNNING';
  for(let i=0;i<600;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  beforeDrops=g.drops;g.dropOnPlayer();g.scheduler.next=1e9;g.scheduler.nextBurst=1e9;
  // Cover the down-player query workload explicitly. A new mass/contact tuning can
  // make the targeted drop land on the pile rather than on the capsule; relying on
  // that accidental trajectory left this performance test with zero samples.
  g.player.collider.setEnabled(false);g.player.ragdoll.knockDown({...g.player.current},{x:0,y:0,z:0},g.now);
  const player:number[]=[],squeeze:number[]=[],physics:number[]=[];let downSteps=0;
  const originalInput=g.input.consume.bind(g.input),originalMeasure=g.squeeze.measure.bind(g.squeeze);
  g.input.consume=()=>({axis:g.now<12.8?0:Math.floor((g.now-12.8)/6)%2===0?1:-1,stomp:false,pressed:false,released:false,effortPresses:Math.floor(g.now*60)%6===0?1:0});
  g.squeeze.measure=(now:number)=>{const start=performance.now();const result=originalMeasure(now);if(g.player.ragdoll.down)squeeze.push(performance.now()-start);return result;};
  try{
   for(let i=0;i<1200&&g.state==='RUNNING';i++){
    (g as unknown as {fixedUpdate():void}).fixedUpdate();physics.push(g.physics.stepMs);
    if(g.player.ragdoll.down){downSteps++;player.push(g.playerUpdateMs);}
   }
  }finally{g.input.consume=originalInput;g.squeeze.measure=originalMeasure;}
  const stats=(values:number[])=>{values.sort((a,b)=>a-b);return {count:values.length,p95:values[Math.floor(values.length*.95)]??0,max:values.at(-1)??0};};
  return {snapshot:g.debugSnapshot(),beforeDrops,downSteps,timing:{player:stats(player),squeeze:stats(squeeze),physics:stats(physics)}};
 });
 console.log(JSON.stringify({playerPile:report}));await testInfo.attach('player-pile.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
 expect(report.beforeDrops).toBeGreaterThanOrEqual(4);expect(report.downSteps).toBeGreaterThan(0);expect(report.snapshot.numericFaults).toBe(0);expect(report.snapshot.state).not.toBe('ERROR');
 expect(report.timing.squeeze.count).toBeGreaterThan(0);await page.screenshot({path:'test-results/player-pile.png'});
});
