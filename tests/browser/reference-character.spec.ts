import type { Part } from '../../src/physics/PhysicsManager';
import type { CutResult } from '../../src/slicing/Dismemberment';
import { test,expect } from '@playwright/test';

test('actual Blender character loads, animates, follows ragdoll and clips with surviving physics parts',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 expect(await page.evaluate(()=>window.humanthrower.debugSnapshot().character)).toMatchObject({name:'reference-worker',parts:11,triangles:676});
 await page.locator('#start').click();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {vec,identity,cross,sub,dot,normalize}=await import('/src/slicing/Math.ts');
  // @ts-expect-error Vite module URL
  const {splitPart,bitePart}=await import('/src/slicing/Dismemberment.ts');
  // @ts-expect-error Vite module URL
  const {clearRows}=await import('/src/slicing/ClearTransaction.ts');
  // @ts-expect-error Vite module URL
  const {clip,contains,vertices,validate}=await import('/src/slicing/ConvexClipper.ts');
  const g=window.humanthrower;g.pause();const character=g.renderer.character!;
  const before=g.player.current.x;
  const input={axis:1,pressed:false,released:false,stomp:false,saw:false,thrust:false};
  for(let i=0;i<24;i++){g.physics.snapshot();g.player.update(input,g.now,1/60);g.physics.step();g.now+=1/60;g.player.afterStep(g.now);}
  const moved=g.player.current.x-before;
  const npc=g.factory.spawn('normal',vec(-2,5,0),identity,false)!;const chest=npc.find(p=>p.limb==='chest')!;
  const original=character.surface(chest.limb,chest.renderScale!,chest.poly)!;validate(original);
  const cut=splitPart(g.physics,chest.id,chest.body.translation(),vec(0,1,0)) as CutResult;
  const survivors=cut.replacement!.survivorIds.map(id=>g.physics.parts.get(id)!);
  let caps=0,violations=0;for(const p of survivors){const surface=character.surface(p.limb,p.renderScale!,p.poly)!;validate(surface);caps+=surface.faces.filter(f=>f.cap).length;
   for(const f of p.poly.faces.filter(f=>f.cap)){const n=normalize(cross(sub(f.vertices[1],f.vertices[0]),sub(f.vertices[2],f.vertices[0])));for(const v of vertices(surface))if(dot(n,sub(v,f.vertices[0]))>1e-6)violations++;}
  }
  const mass=g.physics.parts.size,bite=bitePart(g.physics,npc.find(p=>p.limb==='forearm1')!.id,vec(0,1,0),.15) as CutResult|null;
  const bitten=bite?.replacement!.survivorIds.map(id=>g.physics.parts.get(id)!);const biteScale=bitten?.every(p=>!!p.renderScale);
  const rowNpc=g.factory.spawn('normal',vec(2,1.2,0),identity,false)!;clearRows(g.physics,[1],'solver');
  const rowScale=[...g.physics.parts.values()].filter(p=>p.npcId===rowNpc[0].npcId).every(p=>!!p.renderScale);
  g.player.collider.setEnabled(false);g.player.ragdoll.knockDown(g.player.current,vec(),g.now);g.physics.snapshot();g.physics.step();g.player.afterStep(g.now);
  g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore,g.weapons);
  const report={moved,caps,violations,splitScale:survivors.every(p=>!!p.renderScale),biteScale,rowScale,playerDown:g.player.ragdoll.down,playerVisual:g.renderer.playerVisualParts,numeric:g.physics.numericFaults,glError:g.renderer.renderer.getContext().getError(),mass};
  for(const retro of [false,true]){g.renderer.retro=retro;g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore,g.weapons);}
  g.restart();return {...report,restartCharacter:g.renderer.character?.snapshot.name};
 });
 expect(result.moved).toBeGreaterThan(.2);expect(result.caps).toBe(2);expect(result.violations).toBe(0);expect(result.splitScale).toBe(true);expect(result.biteScale).toBe(true);expect(result.rowScale).toBe(true);expect(result.playerDown).toBe(true);expect(result.playerVisual).toBe(11);expect(result.numeric).toBe(0);expect(result.glError).toBe(0);expect(result.restartCharacter).toBe('reference-worker');expect(errors).toEqual([]);
});

test('art and greybox execute identical seeded physical trajectory',async({browser})=>{
 const trajectory=async(art:boolean)=>{
  const page=await browser.newPage();await page.goto(art?'/':'/?art=off');await expect(page.locator('#start')).toBeEnabled();
  const result=await page.evaluate(async()=>{
   // @ts-expect-error Vite module URL
   const {vec,identity}=await import('/src/slicing/Math.ts');
   const g=window.humanthrower;g.factory.spawn('normal',vec(0,4,0),identity,false);
   const snapshots=[];for(let i=0;i<120;i++){g.physics.snapshot();g.physics.step();if(i%20===0)snapshots.push([...g.physics.parts.values()].map(p=>[p.id,p.body.translation(),p.body.rotation(),p.body.mass(),p.body.linvel(),p.body.angvel()]));}
   return {art:!!g.renderer.character,snapshots};
  });await page.close();return result;
 };
 const art=await trajectory(true),grey=await trajectory(false);expect(art.art).toBe(true);expect(grey.art).toBe(false);expect(art.snapshots).toEqual(grey.snapshots);
});

test('missing art file falls back to playable greybox instead of breaking startup',async({page})=>{
 await page.route('**/worker.glb',route=>route.fulfill({status:404,body:'missing'}));await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 expect(await page.evaluate(()=>window.humanthrower.debugSnapshot().character)).toBe(null);await expect(page.locator('#error')).toContainText('greybox');
 await page.locator('#start').click();expect(await page.evaluate(()=>window.humanthrower.state)).toBe('RUNNING');
});
