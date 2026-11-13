import {test,expect} from '@playwright/test';

test('real occluder depth darkens receiver in retro and Lambert; off, movement, removal and jitter states are correct',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const THREE=await import('/tests/fixtures/Three.ts');
  // @ts-expect-error Vite module URL
  const {LowResShadows}=await import('/src/rendering/LowResShadows.ts');
  // @ts-expect-error Vite module URL
  const {surfaceVertex,surfaceFragment}=await import('/src/rendering/RetroRenderer.ts');
  const renderer=new THREE.WebGLRenderer({canvas:document.createElement('canvas'),antialias:false});renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const shadows=new LowResShadows(),scene=new THREE.Scene(),target=new THREE.WebGLRenderTarget(128,128),camera=new THREE.OrthographicCamera(-3,3,3,-3,.1,50);camera.position.set(0,5.3,18);camera.lookAt(0,5.3,0);
  const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;
  const uniforms={...shadows.uniforms,uResolution:{value:new THREE.Vector2(128,128)},uTime:{value:0},uColor:{value:new THREE.Color('white')},uTexture:{value:texture},uTextureSize:{value:new THREE.Vector2(1,1)},uSnapPixels:{value:0},uJitterPixels:{value:0},uAffineStrength:{value:0},uWobbleTexels:{value:0},uLightingLevels:{value:0},uFogRange:{value:new THREE.Vector2(100,200)},uLocalLighting:{value:0}};
  const retro=new THREE.ShaderMaterial({vertexShader:surfaceVertex,fragmentShader:surfaceFragment,vertexColors:true,uniforms});
  const plain=new THREE.MeshLambertMaterial({color:'white'});shadows.attach(plain);scene.add(new THREE.HemisphereLight('white','white',2));
  const g=new THREE.PlaneGeometry(6,6);g.setAttribute('color',new THREE.Float32BufferAttribute(new Array(g.attributes.position.count*3).fill(1),3));g.setAttribute('cut',new THREE.Float32BufferAttribute(new Array(g.attributes.position.count).fill(0),1));
  const receiver=new THREE.Mesh(g,retro);receiver.position.set(0,5.3,-1.2);scene.add(receiver);
  const caster=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.3,.5),new THREE.MeshBasicMaterial());caster.position.set(0,5.3,0);caster.castShadow=true;scene.add(caster);
  const read=()=>{shadows.render(renderer,scene);const visible=caster.visible;caster.visible=false;renderer.setRenderTarget(target);renderer.render(scene,camera);caster.visible=visible;const pixels=new Uint8Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,pixels);return pixels;};
  const cases=[];
  for(const material of [retro,plain])for(const size of [128,256,512] as const){
   receiver.material=material;shadows.configure(0);const off=read();shadows.configure(size);const on=read();
   let darker=0,lit=0;for(let i=0;i<off.length;i+=4){if(off[i]-on[i]>10)darker++;else if(Math.abs(off[i]-on[i])<=1)lit++;}
   cases.push({retro:material===retro,size,darker,lit});
  }
  receiver.material=retro;shadows.configure(256);uniforms.uJitterPixels.value=.3;uniforms.uTime.value=0;read();const firstDepth=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(shadows.target!,0,0,256,256,firstDepth);
  uniforms.uTime.value=7.2;read();const laterDepth=new Uint8Array(firstDepth.length);renderer.readRenderTargetPixels(shadows.target!,0,0,256,256,laterDepth);
  const stableDepth=firstDepth.every((v,i)=>v===laterDepth[i]);uniforms.uJitterPixels.value=0;const beforeMove=read();caster.position.x=1.5;const moved=read();
  let movementPixels=0;for(let i=0;i<moved.length;i++)if(moved[i]!==beforeMove[i])movementPixels++;
  scene.remove(caster);const removed=read();const casters=shadows.snapshot.casters;shadows.configure(0);const offAgain=read();
  const noGhost=removed.every((v,i)=>v===offAgain[i]);const glError=renderer.getContext().getError();
  shadows.dispose();g.dispose();caster.geometry.dispose();caster.material.dispose();retro.dispose();plain.dispose();texture.dispose();target.dispose();renderer.dispose();
  return {cases,stableDepth,movementPixels,noGhost,casters,glError};
 });
 for(const c of result.cases){expect(c.darker,JSON.stringify(c)).toBeGreaterThan(250);expect(c.lit).toBeGreaterThan(10000);}
 expect(result.stableDepth).toBe(true);expect(result.movementPixels).toBeGreaterThan(100);expect(result.noGhost).toBe(true);expect(result.casters).toBe(0);expect(result.glError).toBe(0);expect(errors).toEqual([]);
});

test('shadow UI reallocates one target, preserves intensity independence and releases resources on dispose',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 await page.locator('#shadows').selectOption('128');expect(await page.evaluate(()=>window.humanthrower.renderer.settings.shadowSize)).toBe(128);
 await page.locator('#shadows').selectOption('0');expect(await page.evaluate(()=>window.humanthrower.renderer.shadows.target)).toBe(null);
 await page.locator('#shadows').selectOption('256');
 await page.evaluate(()=>{const g=window.humanthrower;g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore,g.weapons);});
 const result=await page.evaluate(()=>{
  const g=window.humanthrower,r=g.renderer,depth=g.physics.world.takeSnapshot();let disposed=0;
  const initial=r.shadows.target!;initial.addEventListener('dispose',()=>disposed++);
  for(const size of [128,512,256] as const){r.configure({shadowSize:size,intensity:0});r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);}
  const zeroIntensityShadow=r.shadows.snapshot.allocatedSize;
  r.configure({shadowSize:0});r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);const off=r.shadows.snapshot;
  r.configure({shadowSize:256});r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);
  const target=r.shadows.target!;let finalDisposed=0;target.addEventListener('dispose',()=>finalDisposed++);const textures=r.renderer.info.memory.textures;
  const worldEqual=depth.every((v,i)=>v===g.physics.world.takeSnapshot()[i]);g.dispose();r.shadows.dispose();return {disposed,zeroIntensityShadow,off,worldEqual,finalDisposed,textures};
 });
 expect(result.disposed).toBe(1);expect(result.zeroIntensityShadow).toBe(256);expect(result.off.allocatedSize).toBe(0);expect(result.off.drawCalls).toBe(0);expect(result.worldEqual).toBe(true);expect(result.finalDisposed).toBe(1);
});

test('saw clipping updates the depth silhouette; removed limbs leave no shadow proxies',async({page})=>{
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const {splitPart}=await import('/src/slicing/Dismemberment.ts');
  const g=window.humanthrower,r=g.renderer;
  const parts=g.factory.spawn('normal',{x:0,y:5,z:0},{x:0,y:0,z:0,w:1},false)!;
  const render=()=>r.render(g.physics.parts.values(),g.player,g.detector.rows,[],0,1,g.saw,g.gore,g.weapons);
  const read=()=>{render();const bytes=new Uint8Array(256*256*4);r.renderer.readRenderTargetPixels(r.shadows.target!,0,0,256,256,bytes);return bytes;};
  const before=read(),count=r.shadows.snapshot.casters,chest=parts.find(p=>p.limb==='chest')!;
  const split=splitPart(g.physics,chest.id,chest.body.translation(),{x:0,y:1,z:0});const after=read();
  let pixels=0;for(let i=0;i<before.length;i++)pixels+=Number(before[i]!==after[i]);
  const splitCount=r.shadows.snapshot.casters;
  for(const p of [...g.physics.parts.values()])if(p.owner==='npc')g.physics.removePart(p.id);read();
  return {count,splitCount,afterRemove:r.shadows.snapshot.casters,pixels,split:!!split};
 });
 expect(result.split).toBe(true);expect(result.pixels).toBeGreaterThan(0);expect(result.splitCount).toBe(result.count+1);expect(result.afterRemove).toBe(result.count-11);
});

test('shadow quality never changes a seeded rendered physical trajectory',async({browser})=>{
 const run=async(size:0|256)=>{const page=await browser.newPage();await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
  const states=await page.evaluate(size=>{const g=window.humanthrower;g.renderer.configure({shadowSize:size});g.factory.spawn('normal',{x:0,y:4,z:0},{x:0,y:0,z:0,w:1},false);const states=[];
   for(let i=0;i<100;i++){g.physics.snapshot();g.physics.step();if(i%10===0){g.renderer.render(g.physics.parts.values(),g.player,g.detector.rows,[],i/60,1,g.saw,g.gore,g.weapons);states.push([...g.physics.parts.values()].map(p=>[p.body.translation(),p.body.rotation(),p.body.linvel(),p.body.angvel(),p.body.mass()]));}}return states;
  },size);await page.close();return states;
 };expect(await run(0)).toEqual(await run(256));
});

test('shadow target recovers after actual WebGL context loss without advancing paused physics',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();await page.locator('#start').click();await page.locator('#pause').click();
 const frozen=await page.evaluate(()=>window.humanthrower.now);
 await page.evaluate(()=>{const gl=window.humanthrower.renderer.renderer.getContext(),ext=gl.getExtension('WEBGL_lose_context');if(!ext)throw Error('No context loss fixture support');(window as any).__restoreShadow=()=>ext.restoreContext();ext.loseContext();});
 await expect(page.locator('#error')).toContainText('WebGL потерян');
 await page.evaluate(()=>{(window as any).__restoreShadow();delete (window as any).__restoreShadow;});
 await expect(page.locator('#hint')).toContainText('Графика восстановлена');
 const result=await page.evaluate(()=>{const g=window.humanthrower,r=g.renderer;r.render(g.physics.parts.values(),g.player,g.detector.rows,[],g.now,1,g.saw,g.gore,g.weapons);const pixels=new Uint8Array(256*256*4);r.renderer.readRenderTargetPixels(r.shadows.target!,0,0,256,256,pixels);return {time:g.now,occupied:pixels.some(v=>v<254),size:r.shadows.snapshot.allocatedSize,error:r.renderer.getContext().getError()};});
 expect(result.time).toBe(frozen);expect(result.occupied).toBe(true);expect(result.size).toBe(256);expect(result.error).toBe(0);expect(errors).toEqual([]);
});
