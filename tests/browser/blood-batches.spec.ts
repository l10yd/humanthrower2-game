import {test,expect} from '@playwright/test';
test('batched clipped body stains match unbatched pixels and reduce submission calls',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture module
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.start();g.pause();g.gore.drops=[];g.gore.stains=[];
  for(let i=0;i<8;i++){
   const p=g.physics.createPart(box(.45,.5,.2),{position:{x:(i%4-1.5)*1.4,y:3+Math.floor(i/4)*2,z:0},rotation:{x:0,y:0,z:Math.sin(i*.03),w:Math.cos(i*.03)}},10,i+1,'chest');
   p.previous=p.current={position:{...p.body.translation()},rotation:{...p.body.rotation()}};
   for(let j=0;j<8;j++)g.gore.stains.push({position:{x:(j%4-1.5)*.18,y:(Math.floor(j/4)-.5)*.3,z:.2},normal:{x:0,y:0,z:1},size:.15,angle:j*.2,age:j*4,partId:p.id});
  }
  const r=g.renderer,decals=(r as unknown as {bodyDecals:{batching:boolean;snapshot:unknown}}).bodyDecals;
  const draw=()=>{r.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore,g.weapons);const pixels=new Uint8Array(320*240*4);r.renderer.readRenderTargetPixels(r.target,0,0,320,240,pixels);return {pixels,calls:r.renderStats.totalCalls,snapshot:decals.snapshot};};
  decals.batching=false;draw();const before=draw();decals.batching=true;draw();const after=draw();
  let maxDifference=0,differentPixels=0;for(let i=0;i<before.pixels.length;i++){const d=Math.abs(before.pixels[i]-after.pixels[i]);maxDifference=Math.max(maxDifference,d);if(d>1)differentPixels++;}
  return {before:{calls:before.calls},after:{calls:after.calls,snapshot:after.snapshot},maxDifference,differentPixels,stains:r.bloodBodyDecals,glError:r.renderer.getContext().getError()};
 });
 expect(result.stains).toBe(64);expect(result.before.calls-result.after.calls).toBe(63);expect(result.maxDifference).toBeLessThanOrEqual(1);expect(result.differentPixels).toBe(0);expect(result.glError).toBe(0);expect(errors).toEqual([]);
 await info.attach('blood-batch-comparison.json',{body:JSON.stringify(result,null,2),contentType:'application/json'});
});
