import {test,expect} from '@playwright/test';
test('decode timeout releases waiting code, cleans geometry and closes a late ImageBitmap',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const THREE=await import('/tests/fixtures/Three.ts');
  // @ts-expect-error Vite module URL
  const {parseCharacterGlb}=await import('/src/assets/CharacterGlb.ts');
  // @ts-expect-error Vite fixture URL
  const {texturedCharacterGlbFixture}=await import('/tests/fixtures/CharacterGlbFixture.ts');
  const c=document.createElement('canvas');c.width=c.height=2;const blob=await new Promise<Blob>(r=>c.toBlob(b=>r(b!),'image/png')),png=new Uint8Array(await blob.arrayBuffer()),f=texturedCharacterGlbFixture(png);
  const bitmap=window.createImageBitmap,dispose=THREE.BufferGeometry.prototype.dispose;let release!:(b:ImageBitmap)=>void,disposed=0;
  window.createImageBitmap=(()=>new Promise<ImageBitmap>(resolve=>{release=resolve;})) as typeof createImageBitmap;
  THREE.BufferGeometry.prototype.dispose=function(){disposed++;dispose.call(this);};
  const start=performance.now();let message='';
  try{
   try{await parseCharacterGlb(f.bytes,f.metadata,{timeoutMs:80});}catch(e){message=String(e);}
   const elapsed=performance.now()-start,disposedOnTimeout=disposed;
   const late=await bitmap(blob);release(late);await new Promise(r=>setTimeout(r,30));
   return {message,elapsed,disposedOnTimeout,closed:late.width===0&&late.height===0,world:window.humanthrower.debugSnapshot()};
  }finally{window.createImageBitmap=bitmap;THREE.BufferGeometry.prototype.dispose=dispose;}
 });
 expect(result.message).toContain('timed out');expect(result.elapsed).toBeLessThan(1000);expect(result.disposedOnTimeout).toBeGreaterThanOrEqual(11);expect(result.closed).toBe(true);expect(result.world.parts).toBe(0);
});
test('default decode deadline starts playable greybox when browser bitmap decoding never settles',async({page})=>{
 await page.addInitScript(()=>{window.createImageBitmap=(()=>new Promise(()=>{})) as typeof createImageBitmap;});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled({timeout:12000});
 const state=await page.evaluate(()=>window.humanthrower.debugSnapshot());expect(state.character).toBeNull();expect(state.environment).toBeNull();
 await expect(page.locator('#error')).toContainText('greybox');await page.locator('#start').click();await expect.poll(()=>page.evaluate(()=>window.humanthrower.now)).toBeGreaterThan(.1);
});
