import {test,expect} from '@playwright/test';
test('upright controller pressure on a real tiny collider is mass-bounded without clamping prior velocity',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const r=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.restart();g.pause();const part=g.physics.createPart(box(.1,.05,.1),{position:{x:0,y:3,z:0},rotation:{x:0,y:0,z:0,w:1}},2.5e-6,99,'tiny');
  const original=part.body.applyImpulse,calls:number[]=[];part.body.applyImpulse=function(v,w){calls.push(-v.y);original.call(this,v,w);};
  // Script only the KCC collision report to isolate its supplied pressure; body/impulse are live WASM.
  g.player.controller.computeColliderMovement=()=>{};g.player.controller.computedMovement=()=>({x:0,y:0,z:0});g.player.controller.computedGrounded=()=>true;g.player.controller.numComputedCollisions=()=>1;
  g.player.controller.computedCollision=()=>({collider:part.collider,normal1:{x:0,y:1,z:0},witness1:{...part.body.worldCom()}} as any);
  part.body.setLinvel({x:0,y:-100,z:0},true);g.player.grounded=false;g.player.jump.vy=-24;g.player.update({axis:0,pressed:false,released:false,stomp:false},1,1/60);
  return {mass:part.body.mass(),total:calls.reduce((s,n)=>s+n,0),velocity:part.body.linvel().y,kept:g.physics.parts.has(part.id),dynamic:part.body.isDynamic(),version:g.recordProfile.rulesVersion};
 });
 expect(r.total/r.mass).toBeLessThanOrEqual(4+1e-5);expect(r.total).toBeGreaterThan(0);expect(r.velocity).toBeLessThanOrEqual(-100);expect(r.velocity).toBeGreaterThanOrEqual(-104.001);expect(r.kept).toBe(true);expect(r.dynamic).toBe(true);expect(r.version).toBe('3.2-mass-aware-support-pressure');
});
