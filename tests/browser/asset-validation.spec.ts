import { test,expect } from '@playwright/test';
test('geometry preflight refuses an oversized spawn in the browser without changing the world',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {PhysicsManager}=await import('/src/physics/PhysicsManager.ts');
  // @ts-expect-error Vite fixture URL
  const {RagdollFactory}=await import('/src/physics/RagdollFactory.ts');
  const p=new PhysicsManager();try{
   p.geometryLimits.worldVertices=80;let message='';try{new RagdollFactory(p).spawn('normal',{x:0,y:5,z:0},{x:0,y:0,z:0,w:1},false);}catch(e){message=String(e);}
   return {message,parts:p.parts.size,joints:p.joints.size,geometry:p.geometryUsage};
  }finally{p.dispose();}
 });
 expect(result.message).toContain('World geometry budget');expect(result.parts).toBe(0);expect(result.joints).toBe(0);expect(result.geometry.vertices).toBe(0);
});
test('asset metadata parser validates in the browser without importing local filesystem code',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {validateCharacterMetadata}=await import('/src/assets/CharacterMetadata.ts');
  // @ts-expect-error Vite test-only synthetic fixture
  const {metadataFixture}=await import('/tests/fixtures/CharacterMetadataFixture.ts');
  const source=metadataFixture(),validated=validateCharacterMetadata(source);source.joints[0].frameA.w=2;let message='';try{validateCharacterMetadata(source);}catch(e){message=String(e);}
  return {limbs:validated.parts.length,joints:validated.joints.length,mass:validated.parts.reduce((s:number,b:{mass:number})=>s+b.mass,0),message};
 });
 expect(result.limbs).toBe(11);expect(result.joints).toBe(10);expect(result.mass).toBe(72);expect(result.message).toContain('frame');
});
