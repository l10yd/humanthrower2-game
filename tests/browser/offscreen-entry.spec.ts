import {test,expect} from '@playwright/test';
test('incoming corpse is masked until its geometry physically crosses the top',async({page})=>{
 await page.goto('/?art=off');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.restart(42);g.pause();g.renderer.configure({shadowSize:0});g.warning=null;
  const image=()=>{g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);const gl=g.renderer.renderer.getContext();const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;};
  const before=image();
  const planner=(g as unknown as {continuous:{spawn(spec:{type:'normal';angle:number;x:number;fireAt:number}):import('../../src/physics/PhysicsManager').Part[]}}).continuous;
  const parts=planner.spawn({type:'normal',angle:1.1,x:0,fireAt:0});const hidden=image();const hiddenDiff=Array.from(before).reduce((n,v,i)=>n+Number(v!==hidden[i]),0);
  let moved=0;
  for(let n=0;n<50;n++){g.physics.step();g.physics.cullOutsideArena();moved++;if(parts.some(p=>p.body.worldCom().y<16))break;}
  const visible=image();const visibleDiff=Array.from(before).reduce((n,v,i)=>n+Number(v!==visible[i]),0);
  return {hiddenDiff,visibleDiff,moved,retained:parts.every(p=>g.physics.parts.has(p.id)),centers:parts.map(p=>p.body.worldCom().y)};
 });
 expect(result.hiddenDiff).toBe(0);expect(result.visibleDiff).toBeGreaterThan(0);expect(result.moved).toBeGreaterThan(1);expect(result.retained).toBe(true);
});
