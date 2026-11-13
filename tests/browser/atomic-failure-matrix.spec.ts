import {test,expect} from '@playwright/test';
test('row, saw and bite failures leave live WASM originals and gameplay bookkeeping intact, then retry succeeds',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const results=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {clearRows}=await import('/src/slicing/ClearTransaction.ts');
  // @ts-expect-error Vite module URL
  const {splitPart,bitePart}=await import('/src/slicing/Dismemberment.ts');
  const g=window.humanthrower,reports=[];
  for(const kind of ['row','split','bite'])for(const method of ['createPart','createJoint'] as const){
   g.restart();g.pause();g.scheduler.next=g.scheduler.nextBurst=1e9;
   const parts=g.factory.spawn('normal',{x:0,y:2,z:0},{x:0,y:0,z:0,w:1},false)!,chest=parts.find(p=>p.limb==='chest')!;
   for(const p of parts)p.body.sleep();
   const snapshot=()=>JSON.stringify({usage:g.physics.geometryUsage,sequence:g.physics.clearSequence,deferred:g.physics.deferredContacts,bodies:g.physics.world.bodies.len(),colliders:g.physics.world.colliders.len(),joints:g.physics.world.impulseJoints.len(),parts:[...g.physics.parts.values()].map(p=>({id:p.id,poly:p.poly,position:{...p.body.translation()},rotation:{...p.body.rotation()},velocity:{...p.body.linvel()},mass:p.body.mass(),sleep:p.body.isSleeping()})),links:[...g.physics.joints.values()],score:g.score,rows:g.detector.rows,result:g.result});
   const before=snapshot(),original=g.physics[method];let calls=0,message='';
   const action=()=>kind==='row'?clearRows(g.physics,[1],'solver'):kind==='split'?splitPart(g.physics,chest.id,chest.body.translation(),{x:0,y:1,z:0}):bitePart(g.physics,chest.id,{x:1,y:0,z:0},.2);
   (g.physics as any)[method]=(...args:unknown[])=>{if(++calls===1)throw Error('browser injected fault');return Reflect.apply(original,g.physics,args);};
   try{action();}catch(e){message=String(e);}finally{g.physics[method]=original as never;}
   const unchanged=snapshot()===before,retry=action();reports.push({kind,method,message,unchanged,retry:!!retry});
  }
  return reports;
 });
 expect(results).toHaveLength(6);for(const r of results){expect(r.message,JSON.stringify(r)).toContain('browser injected fault');expect(r.unchanged,JSON.stringify(r)).toBe(true);expect(r.retry).toBe(true);}
});
