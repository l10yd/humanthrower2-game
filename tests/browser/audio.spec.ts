import { test,expect } from '@playwright/test';
test('audio unlocks on gesture, tracks saw contact, mutes immediately, pauses and closes cleanly',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.initialized)).toBe(false);
 await page.locator('#start').click();await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.initialized)).toBe(true);
 await page.evaluate(async()=>{
  // @ts-expect-error browser Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextEvent=g.chaos.nextWeapon=1e9;g.weapons.collect('saw');
  const part=g.physics.createPart(box(.3,.3,.22),{position:{x:.75,y:g.saw.pose().base.y,z:0},rotation:{x:0,y:0,z:0,w:1}},22,1,'chest');part.body.setGravityScale(0,true);
 });
 await page.keyboard.down('e');
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.cutting)).toBe(true);
 const during=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(during.gore.emitted).toBeGreaterThan(0);
 await page.keyboard.up('e');await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(false);
 await page.keyboard.down('e');await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(true);
 const signal=await page.evaluate(async()=>{
  const audio=window.humanthrower.audio as unknown as {context:AudioContext;master:GainNode},analyser=audio.context.createAnalyser();
  analyser.fftSize=2048;audio.master.connect(analyser);await new Promise(resolve=>setTimeout(resolve,120));
  const samples=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(samples);analyser.disconnect();audio.master.disconnect(analyser);
  return Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);
 });expect(signal).toBeGreaterThan(.0001);
 await page.locator('#pause').click();await page.locator('#sound').click();expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(false);
 const muted=await page.evaluate(()=>{const audio=window.humanthrower.audio as unknown as {master:GainNode};return audio.master.gain.value;});expect(muted).toBe(0);
 await page.keyboard.up('e');await page.locator('#sound').click();await page.locator('#resume').click();await page.keyboard.down('e');
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(true);
 await page.locator('#pause').click();await page.keyboard.up('e');const paused=await page.evaluate(()=>window.humanthrower.audio.snapshot);
 expect(paused.active).toBe(false);expect(paused.voices).toBe(0);
 await page.locator('#volume').fill('0.6');await page.locator('#reset').click();expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.volume)).toBe(.6);
 expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(false);
 await page.locator('#settings').click();await page.locator('#sound').click();await page.reload();await expect(page.locator('#start')).toBeEnabled();
 expect(await page.evaluate(()=>window.humanthrower.audio.settings)).toEqual({enabled:false,volume:.6});
 await page.locator('#start').click();expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.initialized)).toBe(false);
 await page.locator('#pause').click();await page.locator('#sound').click();await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.initialized)).toBe(true);
 const closed=await page.evaluate(async()=>{const g=window.humanthrower,ctx=(g.audio as unknown as {context:AudioContext}).context;g.dispose();await new Promise(resolve=>setTimeout(resolve,25));return {state:ctx.state,snapshot:g.audio.snapshot};});
 expect(closed.state).toBe('closed');expect(closed.snapshot.initialized).toBe(false);expect(closed.snapshot.disposed).toBe(true);expect(errors).toEqual([]);
});
test('blade sound cannot continue after blur, death or WebGL loss',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 await page.evaluate(()=>{const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=g.chaos.nextEvent=g.chaos.nextWeapon=1e9;g.weapons.collect('saw');});
 await page.keyboard.down('e');await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(true);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(false);await page.keyboard.up('e');
 await page.keyboard.down('e');await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(true);
 await page.evaluate(()=>{(window.humanthrower as unknown as {finish(reason:string):void}).finish('IMPACT');});
 expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(false);expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.voices)).toBe(0);await page.keyboard.up('e');
 await page.locator('#reset').click();await page.evaluate(()=>window.humanthrower.weapons.collect('saw'));await page.keyboard.down('e');await expect.poll(()=>page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(true);
 await page.evaluate(()=>window.humanthrower.renderer.renderer.getContext().getExtension('WEBGL_lose_context')!.loseContext());
 await expect.poll(()=>page.evaluate(()=>window.humanthrower.state)).toBe('PAUSED');expect(await page.evaluate(()=>window.humanthrower.audio.snapshot.active)).toBe(false);
});
