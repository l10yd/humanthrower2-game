import { test, expect } from '@playwright/test';
test('perspective affine shader differs from perspective UV and off-state compiles',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // Exercise exactly the production surface GLSL with a perspective fixture, not an orthographic screenshot.
  // @ts-expect-error Vite browser URL (not a Node filesystem module).
  const THREE=await import('/tests/fixtures/Three.ts');
  // @ts-expect-error Vite serves this TypeScript module to the browser.
  const {surfaceVertex,surfaceFragment}=await import('/src/rendering/RetroRenderer.ts');
  const canvas=document.createElement('canvas');const renderer=new THREE.WebGLRenderer({canvas,antialias:false});renderer.setSize(128,128);
  renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const bytes=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4,v=((x+y)%2)*255;bytes[i]=bytes[i+1]=bytes[i+2]=v;bytes[i+3]=255;}
  const texture=new THREE.DataTexture(bytes,16,16);texture.needsUpdate=true;texture.magFilter=texture.minFilter=THREE.NearestFilter;
  const uniforms={uResolution:{value:new THREE.Vector2(128,128)},uTime:{value:0},uColor:{value:new THREE.Color(1,1,1)},uTexture:{value:texture},uSnapPixels:{value:0},uJitterPixels:{value:0},uAffineStrength:{value:0},uWobbleTexels:{value:0},uTextureSize:{value:new THREE.Vector2(16,16)},uLightingLevels:{value:0},uFogRange:{value:new THREE.Vector2(100,200)}};
  const material=new THREE.ShaderMaterial({vertexShader:surfaceVertex,fragmentShader:surfaceFragment,vertexColors:true,uniforms,side:THREE.DoubleSide});
  const g=new THREE.PlaneGeometry(3,3);g.setAttribute('color',new THREE.Float32BufferAttribute(new Array(g.attributes.position.count*3).fill(1),3));
  const mesh=new THREE.Mesh(g,material);mesh.rotation.y=1.05;
  const scene=new THREE.Scene();scene.add(mesh);const camera=new THREE.PerspectiveCamera(55,1,.1,30);camera.position.z=4;camera.lookAt(0,0,0);
  const target=new THREE.WebGLRenderTarget(128,128);renderer.setRenderTarget(target);
  const read=()=>{renderer.render(scene,camera);const data=new Uint8Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,data);return data;};
  const perspective=read();uniforms.uAffineStrength.value=1;const affine=read();let changed=0,visible=0;
  for(let i=0;i<affine.length;i+=4){if(perspective[i]>0||affine[i]>0)visible++;if(Math.abs(perspective[i]-affine[i])>20)changed++;}
  uniforms.uSnapPixels.value=.75;uniforms.uJitterPixels.value=.12;uniforms.uWobbleTexels.value=.12;uniforms.uLightingLevels.value=8;read();
  const glError=renderer.getContext().getError();target.dispose();texture.dispose();g.dispose();material.dispose();renderer.dispose();
  return {changed,visible,glError};
 });
 expect(result.visible).toBeGreaterThan(1000);expect(result.changed).toBeGreaterThan(500);expect(result.glError).toBe(0);expect(errors).toEqual([]);
});
