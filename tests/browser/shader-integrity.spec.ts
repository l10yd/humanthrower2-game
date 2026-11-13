import { test,expect } from '@playwright/test';

test('production vertex jitter keeps duplicated UV-seam vertices closed at every visual tick',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const THREE=await import('/tests/fixtures/Three.ts');
  // @ts-expect-error Production shader module served by Vite
  const {surfaceVertex,surfaceFragment}=await import('/src/rendering/RetroRenderer.ts');
  const renderer=new THREE.WebGLRenderer({canvas:document.createElement('canvas'),antialias:false});renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const target=new THREE.WebGLRenderTarget(128,128);renderer.setRenderTarget(target);
  const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);texture.needsUpdate=true;
  const uniforms={uResolution:{value:new THREE.Vector2(128,128)},uTime:{value:0},uColor:{value:new THREE.Color(1,1,1)},uTexture:{value:texture},uSnapPixels:{value:.75},uJitterPixels:{value:.12},uAffineStrength:{value:.6},uWobbleTexels:{value:0},uTextureSize:{value:new THREE.Vector2(1,1)},uLightingLevels:{value:8},uFogRange:{value:new THREE.Vector2(100,200)}};
  const material=new THREE.ShaderMaterial({vertexShader:surfaceVertex,fragmentShader:surfaceFragment,vertexColors:true,uniforms,side:THREE.DoubleSide});
  const indexed=new THREE.PlaneGeometry(3,3,2,2);indexed.setAttribute('color',new THREE.Float32BufferAttribute(new Array(indexed.attributes.position.count*3).fill(1),3));indexed.setAttribute('cut',new THREE.Float32BufferAttribute(new Array(indexed.attributes.position.count).fill(0),1));
  const seam=indexed.toNonIndexed();
  // Every triangle has different UVs. Shared positions are duplicated, not welded.
  const uv=seam.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(i%3)/2,Math.floor(i/3)%2);uv.needsUpdate=true;
  const mesh=new THREE.Mesh(indexed,material);mesh.rotation.set(.2,.65,.11);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0,0,0);scene.add(mesh);
  const camera=new THREE.PerspectiveCamera(55,1,.1,30);camera.position.z=4;camera.lookAt(0,0,0);
  const read=()=>{renderer.render(scene,camera);const bytes=new Uint8Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,bytes);return bytes;};
  let differences=0,visible=0,animated=0;let previous:Uint8Array|null=null;
  for(const tick of [0,.09,.1,.2,.7,1.3,2.1,3.8]){
   uniforms.uTime.value=tick;mesh.geometry=indexed;const welded=read();mesh.geometry=seam;const split=read();
   for(let i=0;i<split.length;i++){differences+=Number(split[i]!==welded[i]);if(previous)animated+=Number(previous[i]!==welded[i]);}
   if(tick===0)for(let i=0;i<welded.length;i+=4)visible+=Number(welded[i]>0);previous=welded;
  }
  uniforms.uSnapPixels.value=0;uniforms.uJitterPixels.value=0;mesh.geometry=indexed;uniforms.uTime.value=0;const off=read();uniforms.uTime.value=4.2;const offLater=read();
  const offDifferences=off.reduce((sum,n,i)=>sum+Number(n!==offLater[i]),0),glError=renderer.getContext().getError();
  indexed.dispose();seam.dispose();material.dispose();texture.dispose();target.dispose();renderer.dispose();
  return {differences,visible,animated,offDifferences,glError};
 });
 expect(result.visible).toBeGreaterThan(1000);expect(result.animated).toBeGreaterThan(0);expect(result.differences).toBe(0);expect(result.offDifferences).toBe(0);expect(result.glError).toBe(0);expect(errors).toEqual([]);
});

test('production composite applies sRGB conversion exactly once and pixel-anchored Bayer quantization',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite fixture URL
  const THREE=await import('/tests/fixtures/Three.ts');
  // @ts-expect-error Production shader module served by Vite
  const {compositeFragment}=await import('/src/rendering/RetroRenderer.ts');
  const width=256,height=16,source=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4;source[i]=source[i+1]=source[i+2]=x;source[i+3]=255;}
  const texture=new THREE.DataTexture(source,width,height);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.needsUpdate=true;
  const renderer=new THREE.WebGLRenderer({canvas:document.createElement('canvas'),antialias:false});renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const target=new THREE.WebGLRenderTarget(width,height);renderer.setRenderTarget(target);
  const uniforms={uScene:{value:texture},uResolution:{value:new THREE.Vector2(width,height)},uTime:{value:0},uIntensity:{value:0},uColorLevels:{value:24},uDither:{value:0},uGrain:{value:0},uVignette:{value:0},uChromatic:{value:0}};
  const material=new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:compositeFragment,uniforms,depthTest:false,depthWrite:false});
  const geometry=new THREE.PlaneGeometry(2,2),scene=new THREE.Scene();scene.add(new THREE.Mesh(geometry,material));const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const read=()=>{renderer.render(scene,camera);const bytes=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,bytes);return bytes;};
  const gamma=(linear:number)=>linear<.0031308?12.92*linear:1.055*Math.pow(linear,1/2.4)-.055;
  const bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  let maxError=0,changed=0,periodErrors=0;const off=read();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)maxError=Math.max(maxError,Math.abs(off[(y*width+x)*4]-Math.round(gamma(x/255)*255)));
  uniforms.uIntensity.value=1;const quantized=read();uniforms.uDither.value=1;const dithered=read();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4,c=gamma(x/255),levels=23;
   const expected=Math.round(Math.floor(Math.min(1,Math.max(0,c+(bayer[(x%4)+(y%4)*4]/16-.5)/levels))*levels+.5)/levels*255);
   const expectedOff=Math.round(Math.floor(c*levels+.5)/levels*255);
   maxError=Math.max(maxError,Math.abs(dithered[i]-expected),Math.abs(quantized[i]-expectedOff));changed+=Number(dithered[i]!==quantized[i]);
   if(y>=4)periodErrors+=Number(dithered[i]!==dithered[((y-4)*width+x)*4]);
  }
  const glError=renderer.getContext().getError();geometry.dispose();material.dispose();texture.dispose();target.dispose();renderer.dispose();
  return {maxError,changed,periodErrors,midpoint:off[128*4],glError};
 });
 expect(result.maxError).toBeLessThanOrEqual(1);expect(result.midpoint).toBeGreaterThan(185);expect(result.midpoint).toBeLessThan(190);expect(result.changed).toBeGreaterThan(500);expect(result.periodErrors).toBe(0);expect(result.glError).toBe(0);expect(errors).toEqual([]);
});
