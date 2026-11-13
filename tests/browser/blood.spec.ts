import { test,expect } from '@playwright/test';
test('body blood follows physical parts, clips on repeated slicing, and full/reduced/off persists without changing physics',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#blood')).toHaveValue('full');
 await page.locator('#start').click();await page.locator('#pause').click();
 const fixture=await page.evaluate(async()=>{
  // @ts-expect-error browser Vite fixture URL
  const {box}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.scheduler.next=g.scheduler.nextBurst=1e9;
  const part=g.physics.createPart(box(.4,.4,.25),{position:{x:.8,y:2,z:0},rotation:{x:0,y:0,z:0,w:1}},22,1,'chest');
  // A real incoming visual droplet, no direct insertion of a body decal.
  g.gore.drops.push({position:{x:.6,y:2,z:1},velocity:{x:0,y:0,z:-100},life:1,size:.04});g.gore.update(g.physics,.01);
  g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  return {id:part.id,bodyStains:g.gore.snapshot.bodyStains,decals:g.renderer.bloodBodyDecals};
 });
 expect(fixture.bodyStains).toBe(1);expect(fixture.decals).toBe(1);
 const transformed=await page.evaluate(async id=>{
  // @ts-expect-error browser Vite fixture URL
  const {splitPart}=await import('/src/slicing/Dismemberment.ts');
  const g=window.humanthrower,part=g.physics.parts.get(id)!;
  part.body.setTranslation({x:1.2,y:2.2,z:0},true);part.body.setRotation({x:0,y:0,z:Math.sin(.3),w:Math.cos(.3)},true);
  part.previous=part.current={position:{...part.body.translation()},rotation:{...part.body.rotation()}};
  g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  const decal=g.renderer.scene.getObjectByName('BloodBodyDecals')!.children[0];
  const pose={x:decal.position.x,y:decal.position.y,qz:decal.quaternion.z};
  const cut=splitPart(g.physics,id,{...part.body.translation()},{x:Math.cos(.6),y:Math.sin(.6),z:0})!;g.gore.cut(cut,g.physics);
  g.gore.drops=[];g.gore.wounds=[];
  g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  const state=[...g.physics.parts.values()].map(p=>({id:p.id,poly:p.poly,pose:{...p.body.translation()},v:{...p.body.linvel()},mass:p.body.mass()}));
  return {pose,decals:g.renderer.bloodBodyDecals,sourceStains:g.gore.stains.filter(s=>s.partId===id).length,state};
 },fixture.id);
 expect(transformed.pose.x).toBeCloseTo(1.2,4);expect(transformed.pose.qz).toBeCloseTo(Math.sin(.3),5);
 expect(transformed.decals).toBe(1);expect(transformed.sourceStains).toBe(0);
 await page.screenshot({path:'test-results/blood-body-stain.png'});
 await page.locator('#blood').selectOption('off');
 const off=await page.evaluate(()=>{
  const g=window.humanthrower;g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore);
  const state=[...g.physics.parts.values()].map(p=>({id:p.id,poly:p.poly,pose:{...p.body.translation()},v:{...p.body.linvel()},mass:p.body.mass()}));
  const meshes=g.renderer.scene.children.filter(o=>o.userData.poly);
  return {state,gore:g.gore.snapshot,decals:g.renderer.bloodBodyDecals,redCaps:meshes.some(o=>{
    const geometry=(o as unknown as {geometry:{getAttribute(name:string):{array:ArrayLike<number>}}}).geometry;return Array.from(geometry.getAttribute('cut').array).some(v=>v>0);
  })};
 });
 expect(off.state).toEqual(transformed.state);expect(off.gore.drops).toBe(0);expect(off.gore.stains).toBe(0);expect(off.decals).toBe(0);expect(off.redCaps).toBe(false);
 await page.locator('#blood').selectOption('reduced');await page.reload();await expect(page.locator('#start')).toBeEnabled();await expect(page.locator('#blood')).toHaveValue('reduced');
 expect(await page.evaluate(()=>window.humanthrower.gore.mode)).toBe('reduced');expect(errors).toEqual([]);
});
