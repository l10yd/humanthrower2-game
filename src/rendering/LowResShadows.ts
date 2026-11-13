import * as THREE from 'three';
export type ShadowSize=0|128|256|512;
/** One hard nearest-sampled shadow, in stable world/light coordinates. This is
 * actual occluder depth, not a blob or a screen-space darkening overlay. */
export const shadowFragment=`
 uniform float uShadowEnabled;uniform sampler2D uShadowMap;uniform mat4 uShadowMatrix;
 uniform float uShadowBias;uniform float uShadowStrength;
 float retroVisibility(vec3 world){
  if(uShadowEnabled<.5)return 1.0;
  vec4 projected=uShadowMatrix*vec4(world,1.0);vec3 p=projected.xyz/projected.w;
  if(any(lessThan(p,vec3(0.0)))||any(greaterThan(p,vec3(1.0))))return 1.0;
  float depth=unpackRGBAToDepth(texture2D(uShadowMap,p.xy));
  return p.z-uShadowBias>depth?1.0-uShadowStrength:1.0;
 }
`;
export class LowResShadows {
 readonly camera=new THREE.OrthographicCamera(-6.4,6.4,8.6,-8.6,.1,50);
 private scene=new THREE.Scene();private attached=new WeakSet<THREE.Material>();private proxies=new Map<THREE.Mesh,THREE.Mesh>();
 private depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,side:THREE.DoubleSide});
 private fallback=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
 target:THREE.WebGLRenderTarget|null=null;size:ShadowSize=256;private disposed=false;
 readonly uniforms={uShadowEnabled:{value:0},uShadowMap:{value:null as THREE.Texture|null},uShadowMatrix:{value:new THREE.Matrix4()},uShadowBias:{value:.0007},uShadowStrength:{value:.38}};
 submissionMs=0;drawCalls=0;triangles=0;passes=0;private casters=0;
 constructor(){
  this.scene.background=new THREE.Color(1,1,1);this.fallback.needsUpdate=true;this.uniforms.uShadowMap.value=this.fallback;
  const target=new THREE.Vector3(0,5.3,0),direction=new THREE.Vector3(-3,4.5,7).normalize();
  this.camera.position.copy(target).addScaledVector(direction,22);this.camera.lookAt(target);this.camera.updateMatrixWorld(true);
  const bias=new THREE.Matrix4().set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1);
  this.uniforms.uShadowMatrix.value.copy(bias).multiply(this.camera.projectionMatrix).multiply(this.camera.matrixWorldInverse);
 }
 configure(size:ShadowSize){
  if(![0,128,256,512].includes(size))return;
  this.size=size;
  if(this.target&&(size===0||this.target.width!==size)){this.target.dispose();this.target=null;this.uniforms.uShadowMap.value=this.fallback;}
  if(size===0){this.uniforms.uShadowEnabled.value=0;this.clearProxies();}
 }
 /** Add the same hard-depth visibility to the non-retro Lambert path. */
 attach(material:THREE.MeshLambertMaterial){
  if(this.attached.has(material))return;this.attached.add(material);
  material.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,this.uniforms);
   shader.vertexShader='varying vec3 vRetroShadowWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 retroLocal=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nretroLocal=instanceMatrix*retroLocal;\n#endif\nvRetroShadowWorld=(modelMatrix*retroLocal).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n#include <packing>\nvarying vec3 vRetroShadowWorld;\n'+shadowFragment);
   shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= retroVisibility(vRetroShadowWorld);\n#include <opaque_fragment>');
  };
  material.customProgramCacheKey=()=> 'HumanthrowerHardShadow-v1';
 }
 render(renderer:THREE.WebGLRenderer,source:THREE.Scene){
  this.submissionMs=this.drawCalls=this.triangles=0;
  if(this.disposed||this.size===0){this.uniforms.uShadowEnabled.value=0;return;}
  const start=performance.now();
  if(!this.target){this.target=new THREE.WebGLRenderTarget(this.size,this.size,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});this.target.texture.colorSpace=THREE.NoColorSpace;}
  source.updateMatrixWorld(true);const alive=new Set<THREE.Mesh>();let casters=0;
  source.traverseVisible(object=>{if(object instanceof THREE.Mesh&&object.castShadow){
   const instanced=object instanceof THREE.InstancedMesh;casters+=instanced?object.count:1;
   alive.add(object);let proxy=this.proxies.get(object);
   if(!proxy){proxy=instanced?new THREE.InstancedMesh(object.geometry,this.depth,object.instanceMatrix.count):new THREE.Mesh(object.geometry,this.depth);proxy.matrixAutoUpdate=false;this.proxies.set(object,proxy);this.scene.add(proxy);}
   if(instanced&&proxy instanceof THREE.InstancedMesh){proxy.instanceMatrix=object.instanceMatrix;proxy.count=object.count;proxy.frustumCulled=false;}
   proxy.geometry=object.geometry;proxy.matrix.copy(object.matrixWorld);proxy.matrixWorldNeedsUpdate=true;
  }});
  this.casters=casters;
  for(const [object,proxy]of this.proxies)if(!alive.has(object)){this.scene.remove(proxy);if(proxy instanceof THREE.InstancedMesh)proxy.dispose();this.proxies.delete(object);}
  const target=renderer.getRenderTarget(),color=renderer.outputColorSpace,autoClear=renderer.autoClear;
  try{
   renderer.outputColorSpace=THREE.LinearSRGBColorSpace;renderer.autoClear=true;renderer.setRenderTarget(this.target);renderer.render(this.scene,this.camera);
   this.drawCalls=renderer.info.render.calls;this.triangles=renderer.info.render.triangles;this.passes++;
   this.uniforms.uShadowMap.value=this.target.texture;this.uniforms.uShadowEnabled.value=1;
  }finally{renderer.setRenderTarget(target);renderer.outputColorSpace=color;renderer.autoClear=autoClear;}
  this.submissionMs=performance.now()-start;
 }
 private clearProxies(){for(const proxy of this.proxies.values())if(proxy instanceof THREE.InstancedMesh)proxy.dispose();this.scene.clear();this.proxies.clear();this.casters=0;}
 get snapshot(){return {size:this.size,allocatedSize:this.target?.width??0,casters:this.casters,groups:this.proxies.size,drawCalls:this.drawCalls,triangles:this.triangles,submissionMs:this.submissionMs,passes:this.passes};}
 dispose(){if(this.disposed)return;this.disposed=true;this.target?.dispose();this.target=null;this.clearProxies();this.depth.dispose();this.fallback.dispose();this.uniforms.uShadowEnabled.value=0;this.uniforms.uShadowMap.value=null;}
}
