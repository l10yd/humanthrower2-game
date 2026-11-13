import {test,expect} from '@playwright/test';

test('Blender shaft loads, preserves world and lights warnings without shader errors in every preset',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.pause();const before=JSON.stringify({bodies:g.physics.world.bodies.len(),colliders:g.physics.world.colliders.len(),parts:g.physics.parts.size,joints:g.physics.joints.size});
  g.detector.arm(3,g.now);let lit=0;const reports=[];
  for(const resolution of ['320x240','426x240','480x270'] as const)for(const retro of [true,false]){
   g.renderer.configure({resolution,intensity:.75});g.renderer.retro=retro;
   g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore,g.weapons);
   g.renderer.scene.traverse(o=>{if(o.name.startsWith('RowLamp-3-')&&(o as any).material.color.getHexString()!=='463c24')lit++;});
   reports.push({resolution,retro,error:g.renderer.renderer.getContext().getError(),calls:g.renderer.renderer.info.render.calls});
  }
  const after=JSON.stringify({bodies:g.physics.world.bodies.len(),colliders:g.physics.world.colliders.len(),parts:g.physics.parts.size,joints:g.physics.joints.size});
  const shaft=g.renderer.shaft!.snapshot;g.restart();return {unchanged:before===after,shaft,reports,lit,restart:!!g.renderer.shaft};
 });
 expect(result.unchanged).toBe(true);expect(result.shaft).toMatchObject({name:'industrial-shaft',parts:11,triangles:648,physics:'visual-only'});expect(result.reports.every(r=>r.error===0)).toBe(true);expect(result.lit).toBe(12);expect(result.restart).toBe(true);expect(errors).toEqual([]);
});

test('shaft failure keeps character and playable greybox; environment-only opt out works',async({page})=>{
 await page.route('**/shaft.glb',route=>route.fulfill({status:404,body:'missing'}));await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 expect(await page.evaluate(()=>({shaft:window.humanthrower.debugSnapshot().environment,character:!!window.humanthrower.renderer.character}))).toEqual({shaft:null,character:true});
 await page.locator('#start').click();expect(await page.evaluate(()=>window.humanthrower.state)).toBe('RUNNING');
 await page.unroute('**/shaft.glb');await page.goto('/?environment=off');await expect(page.locator('#start')).toBeEnabled();expect(await page.evaluate(()=>window.humanthrower.renderer.shaft)).toBe(null);
});

test('environment visibility and local lighting do not change a seeded ragdoll trajectory',async({browser})=>{
 const run=async(url:string)=>{const page=await browser.newPage();await page.goto(url);await expect(page.locator('#start')).toBeEnabled();
  const poses=await page.evaluate(()=>{const g=window.humanthrower;g.factory.spawn('normal',{x:0,y:4,z:0},{x:0,y:0,z:0,w:1},false);const states=[];
   for(let i=0;i<80;i++){g.physics.snapshot();g.physics.step();if(i%10===0){g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],i/60,1,g.saw,g.gore,g.weapons);states.push([...g.physics.parts.values()].map(p=>[p.body.translation(),p.body.rotation(),p.body.linvel(),p.body.angvel(),p.body.mass()]));}}return states;
  });await page.close();return poses;
 };expect(await run('/')).toEqual(await run('/?environment=off'));
});

test('player and warned row produce measurable visible pixels at 426x240',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();
 const result=await page.evaluate(()=>{
  const g=window.humanthrower;g.pause();g.saw.enabled=false;g.renderer.configure({resolution:'426x240',intensity:.75});
  const r=g.renderer;const read=()=>{r.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore,g.weapons);const data=new Uint8Array(426*240*4);r.renderer.readRenderTargetPixels(r.target,0,0,426,240,data);return data;};
  const normal=read();const saved=g.player.ragdoll.dead;g.player.ragdoll.dead=true;const without=read();g.player.ragdoll.dead=saved;
  let playerPixels=0,delta=0;for(let i=0;i<normal.length;i+=4){const d=Math.abs(normal[i]-without[i])+Math.abs(normal[i+1]-without[i+1])+Math.abs(normal[i+2]-without[i+2]);if(d>6){playerPixels++;delta+=d;}}
  g.detector.arm(3,g.now);const warning=read();let warningPixels=0;for(let i=0;i<warning.length;i+=4)if(warning[i]>normal[i]+8)warningPixels++;
  return {playerPixels,delta,warningPixels};
 });
 expect(result.playerPixels).toBeGreaterThan(100);expect(result.delta).toBeGreaterThan(3000);expect(result.warningPixels).toBeGreaterThan(1000);
});
