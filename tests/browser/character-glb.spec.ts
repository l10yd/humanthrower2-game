import { test,expect } from '@playwright/test';
test('self-contained synthetic GLB decodes and validates against its rest-pose metadata',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {parseCharacterGlb}=await import('/src/assets/CharacterGlb.ts');
  // @ts-expect-error Vite test fixture URL
  const {characterGlbFixture}=await import('/tests/fixtures/CharacterGlbFixture.ts');
  const f=characterGlbFixture(),before=JSON.stringify(window.humanthrower.debugSnapshot());
  const parsed=await parseCharacterGlb(f.bytes,f.metadata),report={parts:parsed.validation.parts,triangles:parsed.validation.triangles,surfaceError:parsed.validation.maxSurfaceError,children:parsed.scene.children.length};
  parsed.dispose();parsed.dispose();return {...report,disposedChildren:parsed.scene.children.length,worldUnchanged:JSON.stringify(window.humanthrower.debugSnapshot())===before};
 });
 expect(result.parts).toBe(11);expect(result.children).toBe(11);expect(result.triangles).toBe(132);expect(result.surfaceError).toBeLessThan(1e-6);expect(result.disposedChildren).toBe(0);expect(result.worldUnchanged).toBe(true);expect(errors).toEqual([]);
});
test('embedded textures decode once, close on disposal, and oversized headers never reach the decoder',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {parseCharacterGlb}=await import('/src/assets/CharacterGlb.ts');
  // @ts-expect-error Vite test fixture URL
  const {texturedCharacterGlbFixture}=await import('/tests/fixtures/CharacterGlbFixture.ts');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;canvas.getContext('2d')!.fillRect(0,0,2,2);
  const blob=await new Promise<Blob>(resolve=>canvas.toBlob(b=>resolve(b!),'image/png')),png=new Uint8Array(await blob.arrayBuffer());
  const original=window.createImageBitmap.bind(window),images:ImageBitmap[]=[];let decodes=0;
  window.createImageBitmap=(async(...args:Parameters<typeof createImageBitmap>)=>{decodes++;const b=await Reflect.apply(original,window,args);images.push(b);return b;}) as typeof createImageBitmap;
  try{
   const f=texturedCharacterGlbFixture(png),asset=await parseCharacterGlb(f.bytes,f.metadata),count=asset.scene.children.length;asset.dispose();asset.dispose();
   const oversized=png.slice();new DataView(oversized.buffer).setUint32(16,4096);let message='';try{const huge=texturedCharacterGlbFixture(oversized);await parseCharacterGlb(huge.bytes,huge.metadata);}catch(e){message=String(e);}
   return {count,decodes,closed:images.every(b=>b.width===0&&b.height===0),message};
  }finally{window.createImageBitmap=original;}
 });
 expect(result.count).toBe(11);expect(result.decodes).toBe(1);expect(result.closed).toBe(true);expect(result.message).toContain('dimensions');
});
test('texture decode failure rejects the asset and cleans already-created primitive geometries',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const THREE=await import('/tests/fixtures/Three.ts');
  // @ts-expect-error Vite module URL
  const {parseCharacterGlb}=await import('/src/assets/CharacterGlb.ts');
  // @ts-expect-error Vite test fixture URL
  const {texturedCharacterGlbFixture}=await import('/tests/fixtures/CharacterGlbFixture.ts');
  const c=document.createElement('canvas');c.width=c.height=2;const blob=await new Promise<Blob>(r=>c.toBlob(b=>r(b!),'image/png')),png=new Uint8Array(await blob.arrayBuffer());
  const dispose=THREE.BufferGeometry.prototype.dispose,bitmap=window.createImageBitmap;let disposed=0,message='';
  THREE.BufferGeometry.prototype.dispose=function(){disposed++;dispose.call(this);};
  window.createImageBitmap=(async()=>{await Promise.resolve();throw Error('fixture decoder rejected');}) as typeof createImageBitmap;
  try{const f=texturedCharacterGlbFixture(png);const baseline=disposed;try{await parseCharacterGlb(f.bytes,f.metadata);}catch(e){message=String(e);}return {disposed:disposed-baseline,message};}
  finally{THREE.BufferGeometry.prototype.dispose=dispose;window.createImageBitmap=bitmap;}
 });
 expect(result.message).toContain('fixture decoder rejected');expect(result.disposed).toBeGreaterThanOrEqual(11);
});
test('caller mutation after parse starts cannot replace the inspected image bytes',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {parseCharacterGlb}=await import('/src/assets/CharacterGlb.ts');
  // @ts-expect-error Vite test fixture URL
  const {characterGlbFixture}=await import('/tests/fixtures/CharacterGlbFixture.ts');
  const f=characterGlbFixture(),pending=parseCharacterGlb(f.bytes,f.metadata);new Uint8Array(f.bytes).fill(0);const asset=await pending;const count=asset.validation.parts;asset.dispose();return count;
 });
 expect(result).toBe(11);
});
test('a corrupt small PNG rejects instead of silently accepting a missing material texture',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const message=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {parseCharacterGlb}=await import('/src/assets/CharacterGlb.ts');
  // @ts-expect-error Vite test fixture URL
  const {texturedCharacterGlbFixture}=await import('/tests/fixtures/CharacterGlbFixture.ts');
  const c=document.createElement('canvas');c.width=c.height=2;const blob=await new Promise<Blob>(r=>c.toBlob(b=>r(b!),'image/png')),png=new Uint8Array(await blob.arrayBuffer());
  const view=new DataView(png.buffer);let at=8;while(at<png.length){const size=view.getUint32(at),type=String.fromCharCode(...png.subarray(at+4,at+8));if(type==='IDAT'){png.fill(0,at+8,at+8+size);break;}at+=size+12;}
  const f=texturedCharacterGlbFixture(png);try{const asset=await parseCharacterGlb(f.bytes,f.metadata);asset.dispose();return '';}catch(e){return String(e);}
 });
 expect(message).not.toBe('');
});
test('external GLB resource references are rejected without a network request',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();const requests:string[]=[];page.on('request',r=>{if(r.url().includes('blocked-asset.invalid'))requests.push(r.url());});
 const message=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {parseCharacterGlb}=await import('/src/assets/CharacterGlb.ts');
  // @ts-expect-error Vite test fixture URL
  const {characterGlbFixture,encodeGlb}=await import('/tests/fixtures/CharacterGlbFixture.ts');
  const f=characterGlbFixture();try{await parseCharacterGlb(encodeGlb({...f.document,images:[{uri:'https://blocked-asset.invalid/private.png'}]},f.bin),f.metadata);}catch(e){return String(e);}return '';
 });
 expect(message).toContain('external resources');expect(requests).toEqual([]);
});
