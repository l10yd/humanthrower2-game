import {test,expect} from '@playwright/test';

test('both reference variants validate, render as NPCs and keep their model after slicing',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled({timeout:15000});
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {splitPart}=await import('/src/slicing/Dismemberment.ts');
  // @ts-expect-error Vite module URL
  const {validate}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower,r=g.renderer,base=r.character!;const names=[],cuts=[];
  for(let i=0;i<3;i++){
   const parts=g.factory.spawn('normal',{x:(i-1)*2.2,y:3,z:0},{x:0,y:0,z:0,w:1},false)!;
   const chest=parts.find(p=>p.limb==='chest')!,model=base.modelFor(chest.npcId);names.push(model.name);
   const cut=splitPart(g.physics,chest.id,chest.body.translation(),{x:0,y:1,z:0});
   for(const id of cut.replacement.survivorIds){const p=g.physics.parts.get(id)!;const survivorModel=base.modelFor(p.npcId);validate(survivorModel.surface(p.limb,p.renderScale!,p.poly));cuts.push(survivorModel.name===model.name);}
  }
  for(const retro of [true,false]){r.retro=retro;r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);}
  const variants=base.snapshot.variants,textureCount=new Set([base.texture,...base.variants.map(v=>v.texture)]).size;
  g.restart();return {names,cuts,variants,textureCount,player:base.modelFor(0,'player').name,restart:r.character!.snapshot.variants.length,error:r.renderer.getContext().getError()};
 });
 expect(result.names).toEqual(['reference-scout','reference-bruiser','reference-worker']);expect(result.cuts.every(Boolean)).toBe(true);expect(result.variants).toEqual([{name:'reference-scout',triangles:676,parts:11},{name:'reference-bruiser',triangles:660,parts:11}]);expect(result.textureCount).toBe(3);expect(result.player).toBe('reference-worker');expect(result.restart).toBe(2);expect(result.error).toBe(0);expect(errors).toEqual([]);
});

test('optional model failure keeps remaining variants and a playable session',async({page})=>{
 await page.route('**/scout.glb',route=>route.fulfill({status:404,body:'missing'}));await page.goto('/');await expect(page.locator('#start')).toBeEnabled({timeout:15000});
 expect(await page.evaluate(()=>window.humanthrower.renderer.character!.snapshot.variants.map(v=>v.name))).toEqual(['reference-bruiser']);await page.locator('#start').click();expect(await page.evaluate(()=>window.humanthrower.state)).toBe('RUNNING');
});

test('extra models do not change the seeded physical trajectory',async({browser})=>{
 const run=async(url:string)=>{const page=await browser.newPage();await page.goto(url);await expect(page.locator('#start')).toBeEnabled({timeout:15000});
  const result=await page.evaluate(()=>{const g=window.humanthrower;for(let i=0;i<3;i++)g.factory.spawn('normal',{x:(i-1)*2.2,y:4,z:0},{x:0,y:0,z:0,w:1},false);const states=[];
   for(let i=0;i<60;i++){g.physics.snapshot();g.physics.step();if(i%10===0){g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],i/60,1,g.saw,g.gore,g.weapons);states.push([...g.physics.parts.values()].map(p=>[p.id,p.body.translation(),p.body.rotation(),p.body.mass(),p.body.linvel(),p.body.angvel()]));}}return states;
  });await page.close();return result;
 };expect(await run('/')).toEqual(await run('/?variants=off'));
});
