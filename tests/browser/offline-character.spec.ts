import {test,expect} from '@playwright/test';
test('offline surface certificate covers all three actual character assets without mutating the live game',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const report=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {validateOfflineCharacter}=await import('/src/assets/OfflineCharacter.ts');
  const before=JSON.stringify(window.humanthrower.debugSnapshot()),reports=[];
  for(const [folder,stem]of [['reference-worker','worker'],['reference-scout','scout'],['reference-bruiser','bruiser']]){
   const base=`/assets/${folder}/${stem}`,[bytes,metadata]=await Promise.all([fetch(`${base}.glb`).then(r=>r.arrayBuffer()),fetch(`${base}.metadata.json`).then(r=>r.json())]);
   reports.push(validateOfflineCharacter(bytes,metadata));
  }
  return {reports,unchanged:JSON.stringify(window.humanthrower.debugSnapshot())===before};
 });
 expect(report.unchanged).toBe(true);for(const r of report.reports){expect(r.surfaceUpperBound).toBeLessThanOrEqual(.04);expect(r.surfaceCells).toBeGreaterThan(0);expect(r.parts).toBe(11);expect(r.connectors).toBe(10);}
});
