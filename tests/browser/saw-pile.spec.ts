import { test, expect } from '@playwright/test';
test('held aimed saw cuts a real settled pile, preserves survivors and runs twenty seconds with live contacts',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const report=await page.evaluate(async()=>{
  // @ts-expect-error browser Vite fixture URL
  const {axisAngle,vec}=await import('/src/slicing/Math.ts');
  // @ts-expect-error browser Vite fixture URL
  const {massProperties}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;
  // Disable only automatic allocations for this loaded-pile fixture. Every NPC is
  // dropped through the real solver; no forced overlap, frozen pile or fake cut API.
  g.scheduler.next=g.scheduler.nextBurst=1e9;
  const position={x:-2.2,y:.59,z:0};g.player.body.setTranslation(position,true);g.player.body.setNextKinematicTranslation(position);g.player.current={...position};g.player.previous={...position};
  let spawnMass=0;
  for(let i=0;i<6;i++){
   const parts=g.factory.spawn(i%3===0?'heavy':'normal',vec((i%3-1)*.9,6,0),axisAngle(vec(0,0,1),(i%2?1:-1)*1.3),false)!;
   for(const part of parts)spawnMass+=part.body.mass();
   for(let k=0;k<150;k++)g.physics.step();
  }
  for(let i=0;i<180;i++)g.physics.step();
  g.physics.maxSpeed=g.physics.maxAngularSpeed=0;g.saw.enabled=true;let removed=0,maxParts=g.physics.parts.size,maxWounds=0;const goreTimes:number[]=[];
  const original=g.input.consume.bind(g.input);g.input.consume=()=>({axis:0,stomp:false,pressed:false,released:false,saw:true});
  // Aim at the actual part surfaces nearest the player's hand every fixed tick.
  try{for(let i=0;i<1200&&g.state==='PAUSED';i++){
   const pose=g.saw.pose();
   const targets=[...g.physics.parts.values()].filter(p=>p.owner==='npc').map(p=>({p,point:{...p.body.worldCom()}})).sort((a,b)=>Math.hypot(a.point.x-pose.base.x,a.point.y-pose.base.y)-Math.hypot(b.point.x-pose.base.x,b.point.y-pose.base.y));
   if(targets[0])g.saw.aim={x:targets[0].point.x,y:targets[0].point.y,z:0};
   const cutMass=()=>{const event=g.saw.lastCut;if(event){removed+=event.removedMass;g.gore.cut(event,g.physics);}for(const guard of g.saw.guard.cuts)if(guard!==event){removed+=guard.removedMass;g.gore.cut(guard,g.physics);}};
   const input=g.input.consume();g.saw.update(input,1/60);g.gore.sawContact(g.saw.contact,1/60);cutMass();
   g.physics.step();g.gore.update(g.physics,1/60);goreTimes.push(g.gore.updateMs);g.player.afterStep(g.now);g.now+=1/60;
   maxParts=Math.max(maxParts,g.physics.parts.size);maxWounds=Math.max(maxWounds,g.gore.wounds.length);
  }}finally{g.input.consume=original;g.saw.cancel();}
  const mass=[...g.physics.parts.values()].filter(p=>p.owner==='npc').reduce((sum,p)=>sum+massProperties(p.poly).volume*p.density,0);
  goreTimes.sort((a,b)=>a-b);
  return {snapshot:g.debugSnapshot(),spawnMass,mass,removed,maxParts,maxWounds,goreP95:goreTimes[Math.floor(goreTimes.length*.95)],goreMax:goreTimes.at(-1)};
 });
 console.log(JSON.stringify({sawPile:report}));await testInfo.attach('saw-pile.json',{body:JSON.stringify(report,null,2),contentType:'application/json'});
 expect(report.snapshot.saw.cuts).toBeGreaterThan(0);expect(report.maxParts).toBeGreaterThanOrEqual(66);
 expect(report.mass+report.removed).toBeCloseTo(report.spawnMass,2);expect(report.maxWounds).toBeGreaterThan(0);
 expect(report.snapshot.numericFaults).toBe(0);expect(report.snapshot.deferredContacts).toBe(0);expect(report.snapshot.time).toBeGreaterThanOrEqual(19.99);
 expect(report.snapshot.maxSpeed).toBeLessThan(25);expect(report.snapshot.maxAngularSpeed).toBeLessThan(35);
 await page.locator('#resolution').selectOption('480x270');await page.screenshot({path:'test-results/saw-pile.png'});expect(errors).toEqual([]);
});
