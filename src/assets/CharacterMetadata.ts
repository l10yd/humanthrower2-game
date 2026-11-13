import { contains,validate,type ConvexPolyhedron } from '../slicing/ConvexClipper';
import { DEFAULT_GEOMETRY_LIMITS,geometryUsage } from '../slicing/GeometryBudget';
import { validateConnector,validateJointFrame,type ConnectorVolume } from '../physics/Connector';
import { add,rotate,sub,length,type Vec3,type Quat } from '../slicing/Math';
export const ASSET_LIMBS=['head','chest','pelvis','upperArm-1','forearm-1','upperArm1','forearm1','thigh-1','shin-1','thigh1','shin1'] as const;
export const ASSET_LINKS=[['chest','head'],['pelvis','chest'],['chest','upperArm-1'],['upperArm-1','forearm-1'],['chest','upperArm1'],['upperArm1','forearm1'],['pelvis','thigh-1'],['thigh-1','shin-1'],['pelvis','thigh1'],['thigh1','shin1']] as const;
export interface AssetPart {name:string;mass:number;position:Vec3;rotation:Quat;hull:ConvexPolyhedron}
export interface AssetJoint {a:string;b:string;anchorA:Vec3;anchorB:Vec3;frameA:Quat;frameB:Quat;hinge:boolean;limits:[number,number][];connector:ConnectorVolume}
export interface CharacterMetadata {schemaVersion:1;units:'meters';upAxis:'Y';parts:AssetPart[];joints:AssetJoint[]}
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid metadata object');return v as Record<string,unknown>;};
const vector=(v:unknown):Vec3=>{const x=object(v);for(const key of ['x','y','z'])if(typeof x[key]!=='number'||!Number.isFinite(x[key])||Math.abs(x[key] as number)>100)throw Error('Invalid metadata vector');return {x:x.x as number,y:x.y as number,z:x.z as number};};
const quaternion=(v:unknown):Quat=>{const x=object(v),xyz=vector(v);if(typeof x.w!=='number')throw Error('Invalid metadata quaternion');const q={...xyz,w:x.w};validateJointFrame(q);return q;};
function polyhedron(v:unknown):ConvexPolyhedron {
 const x=object(v);if(!Array.isArray(x.faces)||x.faces.length<4||x.faces.length>DEFAULT_GEOMETRY_LIMITS.partFaces)throw Error('Invalid asset faces');
 let corners=0;
 const faces=Array.from(x.faces,value=>{const f=object(value);if(!Array.isArray(f.vertices)||f.vertices.length<3||(corners+=f.vertices.length)>DEFAULT_GEOMETRY_LIMITS.partCorners)throw Error('Invalid asset face vertices');
  if(f.cap!==undefined&&typeof f.cap!=='boolean')throw Error('Invalid asset cap');if(f.surfaceId!==undefined&&(typeof f.surfaceId!=='string'||f.surfaceId.length>80))throw Error('Invalid asset surface label');
  const vertices=Array.from(f.vertices,vector);let uvs;
  if(f.uvs!==undefined){if(!Array.isArray(f.uvs)||f.uvs.length!==vertices.length)throw Error('Invalid asset UVs');uvs=Array.from(f.uvs,value=>{const uv=object(value);if(typeof uv.u!=='number'||typeof uv.v!=='number'||!Number.isFinite(uv.u)||!Number.isFinite(uv.v))throw Error('Invalid asset UVs');return {u:uv.u,v:uv.v};});}
  return {vertices,...(uvs?{uvs}:{}),...(f.cap!==undefined?{cap:f.cap as boolean}:{}),...(f.surfaceId!==undefined?{surfaceId:f.surfaceId as string}:{})};
 });
 const result={faces};geometryUsage(result);validate(result);return result;
}
/** Parse bounded JSON metadata before any Blender/GLB or Rapier allocation.
 * This validates metadata, not the GLB's actual mesh/texture contents. */
export function validateCharacterMetadata(value:unknown):CharacterMetadata {
 const source=object(value);if(source.schemaVersion!==1||source.units!=='meters'||source.upAxis!=='Y')throw Error('Unsupported character metadata schema or coordinates');
 if(!Array.isArray(source.parts)||source.parts.length!==11||!Array.isArray(source.joints)||source.joints.length!==10)throw Error('Character requires 11 parts and 10 joints');
 const names=new Set<string>();
 const parts:AssetPart[]=Array.from(source.parts,value=>{const p=object(value);if(typeof p.name!=='string'||!(ASSET_LIMBS as readonly string[]).includes(p.name)||names.has(p.name))throw Error('Invalid or duplicate asset limb');names.add(p.name);
  if(typeof p.mass!=='number'||!Number.isFinite(p.mass)||p.mass<=0||p.mass>72)throw Error('Invalid part mass');
  const hull=polyhedron(p.hull);if(hull.faces.some(f=>!f.uvs))throw Error('Character surfaces require authored UVs');
  return {name:p.name,mass:p.mass,position:vector(p.position),rotation:quaternion(p.rotation),hull};
 });
 const mass=parts.reduce((s,p)=>s+p.mass,0);if(Math.abs(mass-72)>.1)throw Error('Normal character mass must equal 72 kg');
 const byName=new Map(parts.map(p=>[p.name,p])),links=new Set<string>();
 const joints:AssetJoint[]=Array.from(source.joints,value=>{const j=object(value),key=`${j.a}:${j.b}`;
  if(typeof j.a!=='string'||typeof j.b!=='string'||!ASSET_LINKS.some(([a,b])=>a===j.a&&b===j.b)||links.has(key))throw Error('Invalid or duplicate anatomical link');links.add(key);
  const a=byName.get(j.a)!,b=byName.get(j.b)!,anchorA=vector(j.anchorA),anchorB=vector(j.anchorB),frameA=quaternion(j.frameA),frameB=quaternion(j.frameB);
  const expected=j.b.startsWith('forearm')||j.b.startsWith('shin');if(typeof j.hinge!=='boolean'||j.hinge!==expected)throw Error('Invalid anatomical joint type');
  if(!Array.isArray(j.limits)||j.limits.length!==(expected?1:3))throw Error('Invalid joint limits');
  const limits=Array.from(j.limits,v=>{if(!Array.isArray(v)||v.length!==2||typeof v[0]!=='number'||typeof v[1]!=='number'||!Number.isFinite(v[0])||!Number.isFinite(v[1])||Math.abs(v[0])>Math.PI||Math.abs(v[1])>Math.PI||v[0]>=v[1])throw Error('Invalid joint range');return [v[0],v[1]] as [number,number];});
  if(!contains(a.hull,anchorA,.001)||!contains(b.hull,anchorB,.001))throw Error('Attachment anchor lies outside physical hull');
  if(length(sub(add(a.position,rotate(anchorA,a.rotation)),add(b.position,rotate(anchorB,b.rotation))))>.001)throw Error('Rest attachment anchors do not coincide');
  const tissue=object(j.connector),connector={a:polyhedron(tissue.a),b:polyhedron(tissue.b)};validateConnector(connector,anchorA,anchorB);
  for(const [poly,part]of [[connector.a,a],[connector.b,b]] as const)for(const f of poly.faces)for(const v of f.vertices)if(!contains(part.hull,v,.001))throw Error('Connector tissue lies outside physical hull');
  if(Math.max(a.mass,b.mass)/Math.min(a.mass,b.mass)>10)throw Error('Adjacent asset mass ratio exceeds 10:1');
  return {a:j.a,b:j.b,anchorA,anchorB,frameA,frameB,hinge:expected,limits,connector};
 });
 const triangles=parts.reduce((s,p)=>s+geometryUsage(p.hull).triangles,0);if(triangles>850)throw Error('Normal character exceeds 850 triangles');
 return {schemaVersion:1,units:'meters',upAxis:'Y',parts,joints};
}
