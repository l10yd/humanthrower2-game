import { test,expect } from '@playwright/test';
test('a second falling NPC causes a fresh QTE after the first get-up protection expires',async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module fixture URL
  const {CONFIG}=await import('/src/core/Config.ts');
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;
  const samples:{cycle:number;knockdowns:number;ready:boolean;speed:number|null}[]=[];
  // Isolate collision/QTE/HUD from survival damage and automatic row scheduling.
  const step=(pressed=false)=>{g.physics.snapshot();g.player.update({axis:0,pressed,released:false,stomp:false},g.now,CONFIG.dt);g.physics.step();g.now+=CONFIG.dt;g.player.afterStep(g.now);};
  try{
   for(let i=0;i<15;i++)step();
   for(let cycle=1;cycle<=2;cycle++){
    const npc=g.factory.spawn('normal',{x:g.player.current.x+.9,y:g.player.current.y+4,z:0},{x:-.5,y:.5,z:.5,w:.5},true,{velocity:{x:0,y:-12,z:0}});
    if(!npc)throw Error('fixture spawn failed');
    for(let i=0;i<180&&!g.player.ragdoll.down;i++)step();
    samples.push({cycle,knockdowns:g.player.ragdoll.knockdowns,ready:g.player.qte.ready,speed:g.player.lastImpact?.speed??null});
    if(!g.player.ragdoll.down)throw Error(`NPC ${cycle} did not knock down the player`);
    for(let i=0;i<240&&!g.player.qte.active;i++)step();
    if(cycle===2)break;
    for(let i=0;i<150&&!g.player.qte.ready;i++)step(true);
    if(!g.player.qte.ready)throw Error('QTE not won');
    for(let i=0;i<60&&g.player.ragdoll.down;i++)step();
    if(g.player.ragdoll.down)throw Error('first recovery did not complete');
    const deadline=g.player.protectedUntil;
    for(const part of npc)g.physics.removePart(part.id);
    for(let i=0;i<120;i++){step();if(g.player.protectedUntil!==deadline)throw Error('standing QTE renewed protection');}
   }
   return {samples,snapshot:g.debugSnapshot(),time:g.now,protection:CONFIG.forcedRecovery.protection};
  }finally{g.pause();}
 });
 await testInfo.attach('qte-repeat-knockdown.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 expect(result.samples.map(s=>s.knockdowns)).toEqual([1,2]);
 for(const sample of result.samples)expect(sample.speed).toBeGreaterThanOrEqual(5);
 expect(result.snapshot.playerParts).toBe(11);expect(result.snapshot.qte.escapes).toBe(1);expect(result.snapshot.qte.ready).toBe(false);
 expect(result.snapshot.qte.active).toBe(true);expect(result.snapshot.qte.progress).toBeLessThan(1);expect(result.snapshot.protectedUntil).toBeLessThan(result.time);
 expect(result.snapshot.numericFaults).toBe(0);expect(errors).toEqual([]);
 await expect(page.locator('#get-up-qte')).toBeVisible();await expect(page.locator('#qte-percent')).not.toHaveText('100%');
});
for(const direction of [-1,1])test(`won QTE escapes two real NPCs in one second (${direction}) and resumes walking`,async({page},testInfo)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const result=await page.evaluate(async direction=>{
  // @ts-expect-error Vite module fixture URL
  const {CONFIG}=await import('/src/core/Config.ts');
  const g=window.humanthrower;g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;
  const idle={axis:0,pressed:false,released:false,stomp:false},step=(pressed=false)=>{g.physics.snapshot();g.player.update({...idle,pressed},g.now,CONFIG.dt);g.physics.step();g.now+=CONFIG.dt;g.player.afterStep(g.now);};
  for(let i=0;i<15;i++)step();const npcIds:number[]=[];
  for(let n=0;n<2;n++){
   const angle=direction*(n===2?-1.25:1.4),npc=g.factory.spawn('normal',{x:direction*(n===1?-.35:n===2?.4:0),y:5+n*3.5,z:0},{x:0,y:0,z:Math.sin(angle/2),w:Math.cos(angle/2)});
   if(!npc)throw Error('fixture spawn failed');npcIds.push(...npc.map(b=>b.id));
  }
  g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,{x:0,y:0,z:0},g.now);
  for(let i=0;i<240;i++)step();
  for(let tap=0;tap<150&&!g.player.qte.ready;tap++)step(true);
  if(!g.player.qte.ready)throw Error('fixture QTE not won');
  const full=g.now,ragdollIds=g.player.ragdoll.parts.map(b=>b.id);let autoFrames=0,maxPush=0,sameParts=true;
  for(let i=0;i<60&&g.player.ragdoll.down;i++){
   g.player.knockDownFromAttack(100,20,g.now);
   step();autoFrames+=Number(g.player.ragdoll.escapeAxis!==0);maxPush=Math.max(maxPush,g.player.ragdoll.spaceImpulse);
   if(g.player.ragdoll.down)sameParts&&=JSON.stringify(g.player.ragdoll.parts.map(b=>b.id))===JSON.stringify(ragdollIds);
  }
  const recoverySeconds=g.now-full,position={...g.player.current},axis=Math.abs(position.x)<3?Math.sign(position.x)||direction:-Math.sign(position.x);
  for(let i=0;i<30;i++){g.physics.snapshot();g.player.update({...idle,axis},g.now,CONFIG.dt);g.physics.step();g.now+=CONFIG.dt;g.player.afterStep(g.now);}
  return {snapshot:g.debugSnapshot(),autoFrames,maxPush,recoverySeconds,sameParts,npcPreserved:npcIds.every(id=>g.physics.parts.has(id)),walkDistance:Math.abs(g.player.current.x-position.x),limit:CONFIG.recoveryAssist.pushForce*CONFIG.dt};
 },direction);
 await testInfo.attach('qte-escape.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 expect(result.snapshot.playerParts).toBe(0);expect(result.snapshot.playerState).toBe('ACTIVE');expect(result.snapshot.qte.active).toBe(false);expect(result.snapshot.qte.escapes).toBe(1);expect(result.snapshot.grounded).toBe(true);expect(result.recoverySeconds).toBeLessThanOrEqual(1+1e-6);expect(result.sameParts).toBe(true);expect(result.npcPreserved).toBe(true);expect(result.walkDistance).toBeGreaterThan(.5);expect(result.snapshot.numericFaults).toBe(0);expect(errors).toEqual([]);
 await expect(page.locator('#get-up-qte')).toBeHidden();await page.screenshot({path:`test-results/qte-auto-escape-${direction}.png`});
});
