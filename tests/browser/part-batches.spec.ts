import {test,expect} from '@playwright/test';

test('batching preserves textured pixels, shadow depth, caps, blood and physical state across modes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/?variants=off');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const report=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {splitPart}=await import('/src/slicing/Dismemberment.ts');
  const g=window.humanthrower,r=g.renderer;g.pause();g.saw.enabled=false;r.configure({resolution:'426x240',intensity:0});
  for(let i=0;i<9;i++)g.factory.spawn('normal',{x:(i%3-1)*2.1,y:3+Math.floor(i/3)*2.1,z:0},{x:0,y:0,z:Math.sin(i*.08),w:Math.cos(i*.08)},false,{velocity:{x:0,y:0,z:0}});
  g.physics.snapshot();const physics=g.physics.world.takeSnapshot(),rows=[];
  const draw=()=>r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);
  const read=()=>{draw();const pixels=new Uint8Array(426*240*4),depth=new Uint8Array(256*256*4);r.renderer.readRenderTargetPixels(r.target,0,0,426,240,pixels);r.renderer.readRenderTargetPixels(r.shadows.target!,0,0,256,256,depth);return {pixels,depth};};
  for(const intensity of [0,.75]){
   r.configure({intensity});r.retro=true;r.batches.enabled=false;const off=read(),offStats={...r.renderStats};r.batches.enabled=true;const on=read();
   let changed=0,max=0,depthChanged=0,depthMax=0;for(let i=0;i<on.pixels.length;i++){const d=Math.abs(on.pixels[i]-off.pixels[i]);if(d)changed++;max=Math.max(max,d);}for(let i=0;i<on.depth.length;i+=4){if([0,1,2,3].some(j=>on.depth[i+j]!==off.depth[i+j]))depthChanged++;const unpack=(a:Uint8Array)=>a[i]/256+a[i+1]/65536+a[i+2]/16777216+a[i+3]/4278190080;depthMax=Math.max(depthMax,Math.abs(unpack(on.depth)-unpack(off.depth)));}
   rows.push({intensity,changed,max,depthChanged,depthMax,offCalls:offStats.totalCalls,onCalls:r.renderStats.totalCalls,trianglesEqual:offStats.sceneTriangles===r.renderStats.sceneTriangles&&offStats.shadowTriangles===r.renderStats.shadowTriangles});
  }
  const unchanged=physics.every((v,i)=>v===g.physics.world.takeSnapshot()[i]);
  const chest=[...g.physics.parts.values()].find(p=>p.limb==='chest')!;const result=splitPart(g.physics,chest.id,chest.body.translation(),{x:0,y:1,z:0});if(result)g.gore.cut(result,g.physics);
  for(const blood of ['full','off'] as const){g.gore.configure(blood);for(const retro of [true,false]){r.retro=retro;draw();}}
  const afterCut={...r.batches.snapshot};const identities=[...g.physics.parts.keys()];g.restart();draw();const afterRestart={...r.batches.snapshot};
  return {rows,unchanged,afterCut,afterRestart,identities:identities.length,error:r.renderer.getContext().getError()};
 });
 console.log(JSON.stringify({batchPixels:report}));
 for(const row of report.rows){expect(row.trianglesEqual).toBe(true);expect(row.onCalls).toBeLessThan(row.offCalls);expect(row.max).toBeLessThanOrEqual(1);expect(row.depthMax).toBeLessThan(1e-6);}
 expect(report.unchanged).toBe(true);expect(report.afterCut.instances).toBeGreaterThan(20);expect(report.afterRestart.instances).toBe(0);expect(report.error).toBe(0);expect(errors).toEqual([]);
});

test('20 NPC plus 120 sleeping parts meet draw-call fixture budget without changing represented geometry',async({page})=>{
 await page.goto('/?variants=off');await expect(page.locator('#start')).toBeEnabled();const result=await page.evaluate(()=>{
  const g=window.humanthrower,r=g.renderer;
  for(let i=0;i<20;i++)g.factory.spawn('normal',{x:(i%5-2)*1.55,y:1+Math.floor(i/5)*2.8,z:0},{x:0,y:0,z:0,w:1},false,{velocity:{x:0,y:0,z:0}});
  const source=[...g.physics.parts.values()][0];for(let i=0;i<120;i++){const p=g.physics.createPart(source.poly,{position:{x:(i%10-4.5)*.75,y:.3+Math.floor(i/10)*.75,z:-.45},rotation:{x:0,y:0,z:0,w:1}},1,1000+i,'head');p.body.sleep();}
  const draw=()=>r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);
  r.batches.enabled=false;draw();const old={...r.renderStats};r.batches.enabled=true;draw();const batched={...r.renderStats};
  const current=r.batches.snapshot,parts=g.physics.parts.size,sleeping=[...g.physics.parts.values()].filter(p=>p.body.isSleeping()).length;
  g.dispose();return {old,batched,current,parts,sleeping,groupsAfterDispose:r.batches.snapshot.groups};
 });
 expect(result.parts).toBe(340);expect(result.sleeping).toBe(120);expect(result.batched.totalCalls).toBeLessThan(180);expect(result.old.totalCalls).toBeGreaterThan(700);expect(result.batched.sceneTriangles).toBe(result.old.sceneTriangles);expect(result.batched.shadowTriangles).toBe(result.old.shadowTriangles);expect(result.current.instances).toBeGreaterThan(300);expect(result.groupsAfterDispose).toBe(0);
});
