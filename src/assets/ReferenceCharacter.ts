import { Mesh,Texture,type BufferGeometry } from 'three';
import { parseCharacterGlb } from './CharacterGlb';
import { clip,validate,type ConvexPolyhedron } from '../slicing/ConvexClipper';
import { cross,dot,normalize,sub,vec,type Vec3 } from '../slicing/Math';
const HALF:Record<string,Vec3>={head:vec(.115,.145,.105),chest:vec(.235,.18,.125),pelvis:vec(.19,.095,.13)};
for(const s of [-1,1])Object.assign(HALF,{[`upperArm${s}`]:vec(.07,.16,.075),[`forearm${s}`]:vec(.065,.16,.07),[`thigh${s}`]:vec(.09,.21,.10),[`shin${s}`]:vec(.07,.25,.11)});
/** Render-only shells reconstructed from the validated Blender GLB, not colliders. */
export function meshSurface(g:BufferGeometry):ConvexPolyhedron {
 const p=g.getAttribute('position'),uv=g.getAttribute('uv'),index=g.index,count=index?.count??p.count;
 const faces=Array.from({length:count/3},(_,i)=>{const ids=[0,1,2].map(j=>index?.getX(i*3+j)??i*3+j);
  return {vertices:ids.map(n=>vec(p.getX(n),p.getY(n),p.getZ(n))),uvs:ids.map(n=>({u:uv.getX(n),v:uv.getY(n)})),surfaceId:'worker-atlas'};});
 const groups=new Map<string,typeof faces>();
 for(const f of faces){const n=normalize(cross(sub(f.vertices[1],f.vertices[0]),sub(f.vertices[2],f.vertices[0]))),d=dot(n,f.vertices[0]);
  const key=[n.x,n.y,n.z,d].map(v=>Math.round(v*10000)).join(':');const group=groups.get(key)??[];group.push(f);groups.set(key,group);
 }
 const key=(v:Vec3)=>[v.x,v.y,v.z].map(n=>Math.round(n*1e7)).join(':');
 const merged=[];
 for(const group of groups.values()){
  const edges=new Map<string,{a:Vec3;b:Vec3;uv:{u:number;v:number}}>();
  for(const f of group)for(let i=0;i<3;i++){const a=f.vertices[i],b=f.vertices[(i+1)%3],k=[key(a),key(b)].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,{a,b,uv:f.uvs[i]});}
  const boundary=[...edges.values()],ring=[],uvs=[];let edge=boundary.shift();
  while(edge){ring.push(edge.a);uvs.push(edge.uv);const next=boundary.findIndex(e=>key(e.a)===key(edge!.b));edge=next<0?undefined:boundary.splice(next,1)[0];}
  if(boundary.length||ring.length<3)throw Error('Invalid coplanar Blender surface boundary');
  merged.push({vertices:ring,uvs,surfaceId:'worker-atlas'});
 }
 const poly={faces:merged};validate(poly);return poly;
}
export function scaleSurface(poly:ConvexPolyhedron,scale:Vec3):ConvexPolyhedron {
 return {faces:poly.faces.map(f=>({...f,vertices:f.vertices.map(v=>vec(v.x*scale.x,v.y*scale.y,v.z*scale.z)),uvs:f.uvs?.map(uv=>({...uv}))}))};
}
/** Apply actual surviving cut planes in the original body-local frame. Does not
 * change physics topology, COM, velocities, joints or occupancy. */
export function clipCharacterSurface(shell:ConvexPolyhedron,physical:ConvexPolyhedron):ConvexPolyhedron|null {
 let result:ConvexPolyhedron|null=shell;
 for(const face of physical.faces)if(face.cap&&result){const n=normalize(cross(sub(face.vertices[1],face.vertices[0]),sub(face.vertices[2],face.vertices[0])));result=clip(result,n,dot(n,face.vertices[0]));}
 return result;
}
export class ReferenceCharacter {
 readonly shells=new Map<string,ConvexPolyhedron>();readonly texture:Texture;private scaled=new Map<string,ConvexPolyhedron>();
 readonly variants:ReferenceCharacter[]=[];
 constructor(private asset:Awaited<ReturnType<typeof parseCharacterGlb>>,readonly name='reference-worker'){
  let texture:Texture|undefined;
  asset.scene.traverse(o=>{if(o instanceof Mesh){this.shells.set(o.name,meshSurface(o.geometry));const m=Array.isArray(o.material)?o.material[0]:o.material;const map=(m as {map?:Texture}).map;if(map)texture=map;}});
  if(!texture)throw Error('Reference character requires its embedded atlas');this.texture=texture;
 }
 surface(limb:string,scale:Vec3,physical:ConvexPolyhedron){
  const source=this.shells.get(limb);if(!source||!HALF[limb])return physical;
  const key=`${limb}:${scale.x}:${scale.y}:${scale.z}`;let shell=this.scaled.get(key);
  if(!shell){shell=scaleSurface(source,scale);this.scaled.set(key,shell);}
  // A significant physical sliver can lie outside an inset bevelled shell.
  // Keep it visible as a hull fallback, never hide a retained physics fragment.
  return clipCharacterSurface(shell,physical)??physical;
 }
 modelFor(npcId:number,owner:'npc'|'player'='npc'):ReferenceCharacter{if(owner==='player'||!this.variants.length)return this;const index=npcId%(this.variants.length+1);return index===0?this:this.variants[index-1];}
 get snapshot(){return {name:this.name,variants:this.variants.map(v=>({name:v.name,triangles:v.asset.validation.triangles,parts:v.shells.size})),parts:this.shells.size,triangles:this.asset.validation.triangles,maxSurfaceError:this.asset.validation.maxSurfaceError,texture:[128,128],physics:'unchanged-greybox-colliders'};}
 dispose(){for(const v of this.variants)v.dispose();this.variants.length=0;this.scaled.clear();this.shells.clear();this.asset.dispose();}
}
export async function loadReferenceCharacter(folder='reference-worker',stem='worker'){
 const base=`${import.meta.env.BASE_URL}assets/${folder}/`,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
 try{
  const [model,metadata]=await Promise.all([fetch(`${base}${stem}.glb`,{signal:controller.signal}),fetch(`${base}${stem}.metadata.json`,{signal:controller.signal})]);
  if(!model.ok||!metadata.ok)throw Error('Reference character files unavailable');
  const [bytes,data]=await Promise.all([model.arrayBuffer(),metadata.json()]);const asset=await parseCharacterGlb(bytes,data);
  try{return new ReferenceCharacter(asset,folder);}catch(e){asset.dispose();throw e;}
 }finally{clearTimeout(timer);}
}
