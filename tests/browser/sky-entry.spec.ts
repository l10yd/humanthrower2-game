import {test,expect} from '@playwright/test';
for(const kind of ['weapon','medkit','bomb','saw','scrap'] as const)test(`${kind} enters from above and bomb warning lasts until impact`,async({page})=>{
 await page.goto('/?art=off');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(kind=>{
  const g=window.humanthrower;g.restart(42);g.pause();g.renderer.configure({shadowSize:0});g.warning=null;
  const image=()=>{
   const r=g.renderer;r.skyDrops=g.sky.items;r.chaosWarning=null;r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);
   // The bomb lane is deliberate warning UI, not leaked object geometry. Remove
   // only that layer when comparing masked sky objects to the empty scene.
   const lane=r.scene.getObjectByName('ChaosHazardLane')!,shown=lane.visible;lane.visible=false;r.renderer.setRenderTarget(r.target);r.renderer.render(r.scene,r.camera);r.renderer.setRenderTarget(null);lane.visible=shown;
   const pixels=new Uint8Array(r.target.width*r.target.height*4);r.renderer.readRenderTargetPixels(r.target,0,0,r.target.width,r.target.height,pixels);return pixels;
  };
  const before=image(),item=g.sky.spawn(kind,3,'axe'),hidden=image();const hiddenDiff=Array.from(before).reduce((n,v,i)=>n+Number(v!==hidden[i]),0);
  for(let n=0;n<35;n++)g.sky.update(g.physics,g.player,1/60,false);
  const visible=image(),visibleDiff=Array.from(before).reduce((n,v,i)=>n+Number(v!==visible[i]),0),laneBefore=g.renderer.scene.getObjectByName('ChaosHazardLane')!.visible;
  if(kind==='bomb'){item.position={x:3,y:.5,z:0};item.velocity={x:0,y:-20,z:0};for(let n=0;n<5;n++)g.sky.update(g.physics,g.player,1/60,false);image();}
  return {hiddenDiff,visibleDiff,entered:item.entered,laneBefore,laneAfter:g.renderer.scene.getObjectByName('ChaosHazardLane')!.visible};
 },kind);
 expect(result.hiddenDiff).toBe(0);expect(result.visibleDiff).toBeGreaterThan(0);expect(result.entered).toBe(true);if(kind==='bomb'){expect(result.laneBefore).toBe(true);expect(result.laneAfter).toBe(false);}
});
