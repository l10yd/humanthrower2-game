import { test, expect } from '@playwright/test';
test('36 seconds of physical chaos cover two bursts and bounded pending drops',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const report=await page.evaluate(()=>{
  const g=window.humanthrower;
  g.mode='technical';g.restart();g.pause();g.state='RUNNING';
  const samples:{time:number;drops:number;parts:number;pending:number;burst:boolean;state:string;playerState:string;x:number;y:number;blocked:number}[]=[];
  const total:number[]=[],player:number[]=[],physics:number[]=[],measure:number[]=[],planner:number[]=[];
  const originalInput=g.input.consume.bind(g.input),originalMeasure=g.squeeze.measure.bind(g.squeeze);
  const originalPlan=(g as unknown as {planner:{plan(...args:unknown[]):unknown}}).planner.plan.bind((g as unknown as {planner:{plan(...args:unknown[]):unknown}}).planner);
  g.input.consume=()=>({axis:g.now<10.001?0:g.player.current.x>3?-1:g.player.current.x<-3?1:Math.floor((g.now-10)/6)%2===0?1:-1,stomp:false,pressed:false,released:false,effortPresses:Math.floor(g.now*60)%6===0?1:0});
  g.squeeze.measure=(now:number)=>{const start=performance.now();const result=originalMeasure(now);measure.push(performance.now()-start);return result;};
  const planOwner=(g as unknown as {planner:{plan(...args:unknown[]):unknown}}).planner;
  planOwner.plan=(...args:unknown[])=>{const start=performance.now();const result=originalPlan(...args);planner.push(performance.now()-start);return result;};
  const failures:unknown[]=[];
  let maxPending=0,burstSteps=0,downSteps=0;
  try {
   for(let i=0;i<2160&&g.state==='RUNNING';i++){
    if(g.now>34.5)g.physics.diagnosticsEnabled=true;
    const start=performance.now();try{(g as unknown as {fixedUpdate():void}).fixedUpdate();}catch(error){failures.push({time:g.now,cause:String(error),separation:g.physics.separationFault});break;}total.push(performance.now()-start);
    physics.push(g.physics.stepMs);if(g.player.ragdoll.down){player.push(g.playerUpdateMs);downSteps++;}
    maxPending=Math.max(maxPending,g.warnings.length);if(g.scheduler.burst)burstSteps++;
    if(i%120===119)samples.push({time:g.now,drops:g.drops,parts:g.physics.parts.size,pending:g.warnings.length,burst:g.scheduler.burst,state:g.state,playerState:g.player.state,x:g.player.current.x,y:g.player.current.y,blocked:g.spawnBlocked});
   }
  }finally{g.input.consume=originalInput;g.squeeze.measure=originalMeasure;planOwner.plan=originalPlan;}
  const stats=(values:number[])=>{values.sort((a,b)=>a-b);return {count:values.length,p95:values[Math.floor(values.length*.95)]??0,max:values.at(-1)??0};};
  const peak=g.physics.peakAngularFault;
  return {peak:peak?{time:peak.time,limb:peak.limb,partId:peak.partId,before:peak.before,after:peak.after,joints:peak.joints,energyDelta:peak.energyDelta,contacts:peak.contacts}:null,failures,snapshot:g.debugSnapshot(),maxPending,burstSteps,downSteps,samples,timing:{total:stats(total),player:stats(player),physics:stats(physics),squeeze:stats(measure),planner:stats(planner)}};
 });
 console.log(JSON.stringify({longChaos:{...report,failures:report.failures.length}}));await testInfo.attach('chaos-long.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
 expect(report.failures.length).toBe(0);expect(report.snapshot.state).not.toBe('ERROR');expect(report.snapshot.numericFaults).toBe(0);expect(report.snapshot.maxSpeed).toBeLessThan(25);expect(report.snapshot.maxAngularSpeed).toBeLessThan(35);expect(report.maxPending).toBeLessThanOrEqual(6);
 expect(report.burstSteps).toBeGreaterThan(450);expect(report.snapshot.time).toBeGreaterThanOrEqual(35.99);expect(errors).toEqual([]);
 await page.screenshot({path:'test-results/chaos-long.png'});
});
