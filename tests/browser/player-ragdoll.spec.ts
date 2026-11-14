import { test, expect } from '@playwright/test';
test('targeted NPC drop, stable visual IDs, pause and won QTE recovery',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/?debug');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
  await page.evaluate(()=>{const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextEvent=g.chaos.nextWeapon=1e9;});
  const visualIds=await page.evaluate(()=>{
    const r=window.humanthrower.renderer as unknown as {playerMeshes:Map<string,{uuid:string}>};
    return [...r.playerMeshes.values()].map(m=>m.uuid);
  });
  await page.locator('#impact').click();
  await expect.poll(()=>page.evaluate(()=>window.humanthrower.player.ragdoll.down),{timeout:25000}).toBe(true);
  const hit=await page.evaluate(()=>window.humanthrower.debugSnapshot());
  expect(hit.knockdowns).toBeGreaterThan(0);expect(hit.playerParts).toBe(11);expect(hit.playerVisualParts).toBe(11);
  expect(await page.evaluate(()=>[...(window.humanthrower.renderer as unknown as {playerMeshes:Map<string,{uuid:string}>}).playerMeshes.values()].map(m=>m.uuid))).toEqual(visualIds);
  await page.locator('#pause').click();const paused=await page.evaluate(()=>window.humanthrower.debugSnapshot());
  await page.waitForTimeout(500);expect(await page.evaluate(()=>window.humanthrower.debugSnapshot())).toEqual(paused);
  await page.screenshot({path:'test-results/player-ragdoll.png'});
  const moved=await page.evaluate(()=>{
    const g=window.humanthrower,step=(pressed=false,axis=0)=>{g.player.update({axis,pressed,released:false,stomp:false},g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);};
    for(let i=0;i<120;i++)step();for(let i=0;i<150&&!g.player.qte.ready;i++)step(true);
    if(!g.player.qte.ready)throw Error('QTE not filled');for(let i=0;i<60&&g.player.ragdoll.down;i++)step();
    const x=g.player.current.x,axis=x>2?-1:1;for(let i=0;i<30;i++)step(false,axis);
    return {snapshot:g.debugSnapshot(),distance:Math.abs(g.player.current.x-x)};
  });
  expect(moved.snapshot.qte.escapes).toBe(1);expect(moved.snapshot.playerParts).toBe(0);expect(moved.distance).toBeGreaterThan(.3);expect(moved.snapshot.numericFaults).toBe(0);
  await page.screenshot({path:'test-results/player-escape.png'});
  await page.locator('#reset').click();const reset=await page.evaluate(()=>window.humanthrower.debugSnapshot());
  expect(reset.playerState).toBe('ACTIVE');expect(reset.playerParts).toBe(0);expect(reset.parts).toBe(0);expect(reset.joints).toBe(0);expect(errors).toEqual([]);
});
