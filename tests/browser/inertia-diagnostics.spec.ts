import {test,expect} from '@playwright/test';
test('captured tiny fragment reports finite diagnostic inertia without touching its physics state',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const r=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const {default:part}=await import('/tests/fixtures/thin-contact-part.json');
  const g=window.humanthrower,b=g.physics.createPart(part.poly,{position:{x:0,y:2,z:0},rotation:{x:-0.8543012738227844,y:-0.17114967107772827,z:-0.4827794134616852,w:-0.08832300454378128}},0,99,'thin',1,part.density);
  const before=g.physics.world.takeSnapshot(),sample=(g.physics as unknown as {sample(p:typeof b):{inertia:Record<string,number>;inertiaSource:string}}).sample(b);
  return {finite:Object.values(sample.inertia).every(Number.isFinite),source:sample.inertiaSource,unchanged:before.every((v,i)=>v===g.physics.world.takeSnapshot()[i]),mass:b.body.mass()};
 });
 expect(r.finite).toBe(true);expect(r.source).toBe('principal-fallback');expect(r.unchanged).toBe(true);expect(r.mass).toBeGreaterThan(0);
});
