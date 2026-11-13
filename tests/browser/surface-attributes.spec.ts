import { test,expect } from '@playwright/test';
import type { ConvexPolyhedron } from '../../src/slicing/ConvexClipper';
test('retained textured surface pixels stay fixed after a cut; cap has two-dimensional UVs',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('#start')).toBeEnabled();
 const result=await page.evaluate(async()=>{
  // @ts-expect-error Vite module URL
  const THREE=await import('/tests/fixtures/Three.ts');
  // @ts-expect-error Vite production geometry module
  const {geometry}=await import('/src/rendering/RetroRenderer.ts');
  // @ts-expect-error Vite clipper module
  const {box,clip}=await import('/src/slicing/ConvexClipper.ts');
  const source:ConvexPolyhedron=box(1,1,.5);source.faces=source.faces.map((f,i)=>({...f,surfaceId:`side${i}`,uvs:f.vertices.map(v=>({u:(v.x+1)/2,v:(v.y+1)/2}))}));
  const clipped:ConvexPolyhedron=clip(source,{x:1,y:0,z:0},0)!;
  const bytes=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const i=(y*16+x)*4;bytes[i]=x*16;bytes[i+1]=y*16;bytes[i+2]=(x+y)%2?240:30;bytes[i+3]=255;}
  const texture=new THREE.DataTexture(bytes,16,16);texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.needsUpdate=true;
  const material=new THREE.MeshBasicMaterial({map:texture}),a=geometry(source),b=geometry(clipped),renderer=new THREE.WebGLRenderer({canvas:document.createElement('canvas'),antialias:false});renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const target=new THREE.WebGLRenderTarget(128,128);renderer.setRenderTarget(target);const camera=new THREE.OrthographicCamera(-1.25,1.25,1.25,-1.25,.1,10);camera.position.z=4;camera.lookAt(0,0,0);
  const scene=new THREE.Scene();scene.background=new THREE.Color(0,0,0);const mesh=new THREE.Mesh(a,material);scene.add(mesh);
  const read=()=>{renderer.render(scene,camera);const data=new Uint8Array(128*128*4);renderer.readRenderTargetPixels(target,0,0,128,128,data);return data;};
  const before=read();mesh.geometry=b;const after=read();let retainedMismatch=0,retainedVisible=0,removedVisible=0;
  for(let y=20;y<108;y++)for(let x=18;x<58;x++){const i=(y*128+x)*4;retainedVisible+=Number(after[i]+after[i+1]+after[i+2]>0);for(let c=0;c<3;c++)retainedMismatch+=Number(before[i+c]!==after[i+c]);}
  for(let y=20;y<108;y++)for(let x=70;x<110;x++){const i=(y*128+x)*4;removedVisible+=Number(after[i]+after[i+1]+after[i+2]>0);}
  const cap=clipped.faces.at(-1)!,capU=cap.uvs!.map(v=>v.u),capV=cap.uvs!.map(v=>v.v),uvCount=b.getAttribute('uv').count,positions=b.getAttribute('position').count,glError=renderer.getContext().getError();
  a.dispose();b.dispose();texture.dispose();material.dispose();target.dispose();renderer.dispose();
  return {retainedMismatch,retainedVisible,removedVisible,capUSpan:Math.max(...capU)-Math.min(...capU),capVSpan:Math.max(...capV)-Math.min(...capV),uvCount,positions,glError};
 });
 expect(result.retainedVisible).toBeGreaterThan(3000);expect(result.retainedMismatch).toBe(0);expect(result.removedVisible).toBe(0);expect(result.capUSpan).toBeGreaterThan(1);expect(result.capVSpan).toBeGreaterThan(1);expect(result.uvCount).toBe(result.positions);expect(result.glError).toBe(0);expect(errors).toEqual([]);
});
