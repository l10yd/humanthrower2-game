import { test,expect } from '@playwright/test';

test('profiling is opt-in, bounded and resets without changing paused simulation',async({page},info)=>{
 await page.goto('/?profile');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart(17);g.pause();g.state='RUNNING';g.scheduler.next=g.chaos.nextEvent=g.chaos.nextWeapon=g.chaos.nextMedkit=1e9;
  for(let i=0;i<120;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  g.pause();const samples=g.profiler.snapshot;const time=g.now;
  for(let i=0;i<3;i++)(g as unknown as {fixedUpdate():void}).fixedUpdate();
  const unchanged=g.now===time;g.restart(17);g.pause();
  return {samples,unchanged,reset:g.profiler.snapshot};
 });
 expect(result.samples.enabled).toBe(true);expect(result.samples.timings.physics.count).toBe(120);
 expect(result.samples.timings.occupancy.count).toBeLessThan(25);expect(result.unchanged).toBe(true);expect(result.reset.timings).toEqual({});
 await info.attach('simulation-profile.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();expect(await page.evaluate(()=>window.humanthrower.profiler.snapshot.enabled)).toBe(false);
});

test('a won QTE with 300 distant sleeping fragments keeps local recovery work bounded',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?profile');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {CONFIG}=await import('/src/core/Config.ts');
  // @ts-expect-error Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.restart(17);g.pause();const idle={axis:0,pressed:false,released:false,stomp:false};
  const step=(pressed=false)=>{g.physics.snapshot();g.player.update({...idle,pressed},g.now,CONFIG.dt);g.physics.step();g.now+=CONFIG.dt;g.player.afterStep(g.now);};
  for(let i=0;i<15;i++)step();
  for(let n=0;n<2;n++)g.factory.spawn('normal',{x:n?-.35:0,y:5+n*3.5,z:0},{x:0,y:0,z:Math.sin(.7),w:Math.cos(.7)});
  g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},g.now);
  for(let i=0;i<240;i++)step();
  const distant=[];for(let i=0;i<300;i++){
   const part=g.physics.createPart(box(.02,.02,.02),{position:{x:(i%10-4.5)*.4,y:12+Math.floor(i/10)*.1,z:0},rotation:{x:0,y:0,z:0,w:1}},1,1000+i,'fragment');part.body.sleep();distant.push(part);
  }
  const poses=distant.map(p=>({...p.body.translation()}));const partsBefore=g.physics.parts.size;
  for(let i=0;i<150&&!g.player.qte.ready;i++)step(true);
  if(!g.player.qte.ready)throw Error('Fixture did not win QTE');
  const timings:number[]=[],work:typeof g.physics.recoveryQueries[]=[];
  for(let i=0;i<60&&g.player.ragdoll.down;i++){
   const start=performance.now();g.player.update(idle,g.now,CONFIG.dt);timings.push(performance.now()-start);work.push({...g.physics.recoveryQueries});
   g.physics.step();g.now+=CONFIG.dt;g.player.afterStep(g.now);
  }
  const sorted=[...timings].sort((a,b)=>a-b);
  return {recovered:!g.player.ragdoll.down,partsBefore,partsAfter:g.physics.parts.size,queries:work,timing:{p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1)},distantUntouched:distant.every((p,i)=>p.body.isSleeping()&&JSON.stringify(p.body.translation())===JSON.stringify(poses[i])),faults:g.physics.numericFaults};
 });
 expect(result.recovered).toBe(true);expect(result.partsAfter).toBe(result.partsBefore-11);expect(result.distantUntouched).toBe(true);expect(result.faults).toBe(0);expect(errors).toEqual([]);
 expect(Math.max(...result.queries.map(q=>q.candidateParts))).toBeLessThanOrEqual(22);
 // Machine-independent work bound. Timing is reported, not asserted as real-GPU/FPS acceptance.
 await info.attach('recovery-large-world.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});console.log(JSON.stringify({largeWorldRecovery:result.timing}));
});
