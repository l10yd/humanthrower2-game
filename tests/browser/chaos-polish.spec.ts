import { test,expect } from '@playwright/test';
const start=async(page:import('@playwright/test').Page)=>{await page.goto('/?art=off');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();};
test('first supply is a saw and bomb warning marks exactly its fixed column',async({page})=>{
 await start(page);
 const before=await page.evaluate(()=>{const g=window.humanthrower;g.pause();g.state='RUNNING';g.scheduler.next=1e9;g.chaos.nextEvent=1e9;g.now=1;(g as unknown as {fixedUpdate():void}).fixedUpdate();const weapon=g.sky.items[0]?.weapon;g.chaos.schedule('bomb',g.now,2.75);g.pause();return {weapon};});
 expect(before.weapon).toBe('saw');
 await page.evaluate(()=>window.humanthrower.togglePause());await expect(page.locator('#chaos-banner')).toContainText('БОМБА С НЕБА');
 const lane=await page.evaluate(()=>{const m=window.humanthrower.renderer.scene.getObjectByName('ChaosHazardLane')!;return {visible:m.visible,x:m.position.x};});expect(lane).toEqual({visible:true,x:2.75});
 await page.locator('#pause').click();await expect(page.locator('#chaos-banner')).toBeHidden();
});
test('death animates projectiles without new input, exact result clock and restart clears death presentation',async({page})=>{
 await start(page);
 const report=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart();g.pause();g.state='RUNNING';g.scheduler.next=g.chaos.nextWeapon=g.chaos.nextEvent=1e9;
  const step=()=>(g as unknown as {fixedUpdate():void}).fixedUpdate();g.player.damage.parts.head=0;
  g.weapons.grenades.push({position:{x:3,y:6,z:0},previous:{x:3,y:6,z:0},velocity:{x:0,y:-1,z:0},life:2});step();
  const before=g.visualTime;for(let n=0;n<30;n++)step();const during={clock:g.visualTime,grenadeY:g.weapons.grenades[0]?.position.y};g.pause();const paused=g.visualTime;
  for(let n=0;n<60;n++)step();const afterPause=g.visualTime;g.togglePause();for(let n=0;n<90;n++)step();
  return {before,during,paused,afterPause,result:g.result,state:g.state};
 });
 expect(report.during.clock-report.before).toBeCloseTo(.5,6);expect(report.during.grenadeY).toBeLessThan(6);expect(report.afterPause).toBe(report.paused);
 expect(report.state).toBe('GAME_OVER');expect(report.result?.durationSeconds).toBe(0);
 await page.locator('#start').click();const nextSeed=await page.evaluate(()=>window.humanthrower.seed);await page.locator('#pause').click();await expect(page.locator('#app')).toHaveAttribute('data-dying','false');expect(nextSeed).not.toBe(20261111);
 await expect.poll(()=>page.locator('#scene').evaluate(e=>getComputedStyle(e).filter)).toBe('none');
});
test('four natural bot sessions end cleanly with bounded objects and no invented physics stability claim',async({page},testInfo)=>{
 test.setTimeout(180000);await start(page);
 const reports=await page.evaluate(()=>{
  const g=window.humanthrower,reports=[];
  for(const seed of [17,42,93,20261111]){
   g.restart(seed);g.pause();g.state='RUNNING';const original=g.input.consume.bind(g.input);let frame=0,maxParts=0,maxPending=0,error:string|null=null;
   g.input.consume=()=>({axis:g.player.current.x>2.8?-1:g.player.current.x<-2.8?1:Math.floor(g.now/3)%2?1:-1,stomp:false,saw:true,pressed:frame%12===0,released:frame%12===1,effortPresses:frame%6===0?1:0,jumpPresses:frame%12===0?1:0});
   try{for(;frame<3600&&(g.state==='RUNNING'||g.state==='DYING');frame++){(g as unknown as {fixedUpdate():void}).fixedUpdate();maxParts=Math.max(maxParts,g.physics.parts.size);maxPending=Math.max(maxPending,g.warnings.length);}}catch(e){error=String(e);}finally{g.input.consume=original;}
   const s=g.debugSnapshot();reports.push({seed,error,state:s.state,time:s.time,reason:s.result?.lossReason,rows:s.rows,drops:s.drops,events:s.chaos.events,collected:s.sky.collected,medical:s.medicalUsed,broken:s.weapons.broken,maxParts,maxPending,numeric:s.numericFaults,maxSpeed:s.maxSpeed,maxAngular:s.maxAngularSpeed});g.pause();
  }return reports;
 });
 console.log(JSON.stringify({sessions:reports}));await testInfo.attach('chaos-sessions.json',{body:JSON.stringify(reports,null,2),contentType:'application/json'});
 for(const r of reports){expect(r.error).toBeNull();expect(['RUNNING','GAME_OVER']).toContain(r.state);expect(r.numeric).toBe(0);expect(r.maxParts).toBeLessThanOrEqual(720);expect(r.maxPending).toBeLessThanOrEqual(6);expect(r.collected).toBeGreaterThan(0);}
 expect(reports.some(r=>r.events>0)).toBe(true);expect(reports.some(r=>r.rows>0)).toBe(true);
});
