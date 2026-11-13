import { test,expect } from '@playwright/test';
test('authored connector cut removes only the joint and preserves untouched endpoints in Chromium',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {PhysicsManager}=await import('/src/physics/PhysicsManager.ts');
  // @ts-expect-error Vite fixture URL
  const {box,vertices}=await import('/src/slicing/ConvexClipper.ts');
  // @ts-expect-error Vite fixture URL
  const {clearRows}=await import('/src/slicing/ClearTransaction.ts');
  const p=new PhysicsManager();try{
   const shifted=(y:number)=>{const poly=box(.05,1,.05);for(const v of vertices(poly))v.y+=y;return poly;};
   const a=p.createPart(box(.2,.2,.2),{position:{x:0,y:.4,z:0},rotation:{x:0,y:0,z:0,w:1}},5,1,'lower'),b=p.createPart(box(.2,.2,.2),{position:{x:0,y:2.6,z:0},rotation:{x:0,y:0,z:0,w:1}},5,1,'upper');
   const j=p.createJoint({a:a.id,b:b.id,anchorA:{x:0,y:1.1,z:0},anchorB:{x:0,y:-1.1,z:0},axis:{x:1,y:0,z:0},hinge:true,limits:[[-1,1]],connector:{a:shifted(.9),b:shifted(-.9)}});
   const before=[{...a.body.translation()},{...b.body.translation()}],mass=a.body.mass()+b.body.mass(),cut=clearRows(p,[1],'solver');
   return {jointRemoved:!p.joints.has(j.id),parts:p.parts.size,mass:a.body.mass()+b.body.mass(),originalMass:mass,cut,unchanged:JSON.stringify(before)===JSON.stringify([{...a.body.translation()},{...b.body.translation()}])};
  }finally{p.dispose();}
 });
 expect(result.jointRemoved).toBe(true);expect(result.parts).toBe(2);expect(result.mass).toBe(result.originalMass);expect(result.cut.removedVolume).toBe(0);expect(result.cut.fragments).toBe(0);expect(result.unchanged).toBe(true);
});
