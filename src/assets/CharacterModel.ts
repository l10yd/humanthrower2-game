import { certifySurfaceBound } from './SurfaceBound';
import { Vector3,Quaternion,Matrix4,Mesh,SkinnedMesh,Triangle,Texture,type Object3D } from 'three';
import { validateCharacterRestPose } from './CharacterRestPose';
const pointTriangleDistance=(point:Vector3,tri:Triangle,scratch:Vector3)=>tri.closestPointToPoint(point,scratch).distanceTo(point);
/** Validate a decoded GLTF scene against metadata. No scene/world mutation or
 * physics allocation; must precede accepting the model into a game asset cache. */
export function validateCharacterModel(root:Object3D,input:unknown,options:{strictSurface?:boolean}={}){
 const metadata=validateCharacterRestPose(input),expected=new Map(metadata.parts.map(p=>[p.name,p])),meshes:Mesh[]=[],seen=new Set<string>();
 root.updateMatrixWorld(true);
 root.traverse(o=>{if(o instanceof Mesh){if(o instanceof SkinnedMesh||Object.keys(o.geometry.morphAttributes).length)throw Error('Rigid character parts cannot use skinning or morph targets');meshes.push(o);}});
 if(meshes.length!==11)throw Error('Decoded character must have 11 rigid meshes');
  if(!Number.isFinite(root.matrixWorld.determinant())||Math.abs(root.matrixWorld.determinant())<1e-12)throw Error('Invalid decoded root transform');
 const inverseRoot=new Matrix4().copy(root.matrixWorld).invert(),position=new Vector3(),rotation=new Quaternion(),scale=new Vector3(),recomposed=new Matrix4();
 let triangles=0,maxSurfaceError=0,surfaceUpperBound=0,surfaceCells=0;const textureSet=new Set<Texture>();
 for(const mesh of meshes)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])for(const value of Object.values(material))if(value instanceof Texture)textureSet.add(value);
 if(textureSet.size>12)throw Error('Character texture count exceeded');
 for(const texture of textureSet){const image=texture.image as {width?:unknown;height?:unknown}|null;if(!image||typeof image.width!=='number'||typeof image.height!=='number'||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.width>128||image.height>128)throw Error('Unsupported character texture dimensions');}
 for(const mesh of meshes){
  const part=expected.get(mesh.name);if(!part||seen.has(mesh.name))throw Error('Unknown or duplicate decoded mesh name');seen.add(mesh.name);
  const matrix=new Matrix4().multiplyMatrices(inverseRoot,mesh.matrixWorld);matrix.decompose(position,rotation,scale);recomposed.compose(position,rotation,scale);
  if(scale.distanceTo(new Vector3(1,1,1))>1e-4||matrix.elements.some((n,i)=>!Number.isFinite(n)||Math.abs(n-recomposed.elements[i])>1e-4))throw Error(`Unapplied scale or shear: ${mesh.name}`);
  const relativeDot=rotation.dot(new Quaternion(part.rotation.x,part.rotation.y,part.rotation.z,part.rotation.w));
  if(position.distanceTo(new Vector3(part.position.x,part.position.y,part.position.z))>.001||2*Math.acos(Math.min(1,Math.abs(relativeDot)))>.01)throw Error(`Mesh transform differs from metadata: ${mesh.name}`);
  const g=mesh.geometry,points=g.getAttribute('position'),uv=g.getAttribute('uv'),normal=g.getAttribute('normal'),index=g.index;
  if(!points||points.itemSize!==3||points.count>2550||!uv||uv.itemSize!==2||uv.count!==points.count||!normal||normal.itemSize!==3||normal.count!==points.count)throw Error(`Missing or excessive decoded surface attributes: ${mesh.name}`);
  const count=index?index.count:points.count;if(count%3!==0||count>2550)throw Error('Invalid decoded triangle indices');triangles+=count/3;if(triangles>850)throw Error('Decoded character exceeds 850 triangles');
  const decoded=Array.from({length:points.count},(_,i)=>{
   const p=new Vector3(points.getX(i),points.getY(i),points.getZ(i));
   if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z)||!Number.isFinite(uv.getX(i))||!Number.isFinite(uv.getY(i))||!Number.isFinite(normal.getX(i))||!Number.isFinite(normal.getY(i))||!Number.isFinite(normal.getZ(i))||Math.abs(Math.hypot(normal.getX(i),normal.getY(i),normal.getZ(i))-1)>.01)throw Error('Invalid decoded surface attribute');return p;
  });
  const renderTriangles:Triangle[]=[];
  for(let i=0;i<count;i+=3){const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);if(ids.some(n=>!Number.isInteger(n)||n<0||n>=decoded.length))throw Error('Invalid decoded triangle index');const tri=new Triangle(...ids.map(n=>decoded[n]) as [Vector3,Vector3,Vector3]);if(tri.getArea()<1e-12)throw Error('Degenerate decoded triangle');renderTriangles.push(tri);}
  const hullTriangles=part.hull.faces.flatMap(f=>Array.from({length:f.vertices.length-2},(_,i)=>new Triangle(...[f.vertices[0],f.vertices[i+1],f.vertices[i+2]].map(p=>new Vector3(p.x,p.y,p.z)) as [Vector3,Vector3,Vector3])));
  const scratch=new Vector3(),samples=(tris:Triangle[])=>tris.flatMap(t=>[t.a,t.b,t.c,t.getMidpoint(new Vector3()),new Vector3().addVectors(t.a,t.b).multiplyScalar(.5),new Vector3().addVectors(t.b,t.c).multiplyScalar(.5),new Vector3().addVectors(t.c,t.a).multiplyScalar(.5)]);
  for(const [from,to]of [[renderTriangles,hullTriangles],[hullTriangles,renderTriangles]] as const)for(const sample of samples(from)){
   const error=Math.min(...to.map(t=>pointTriangleDistance(sample,t,scratch)));maxSurfaceError=Math.max(maxSurfaceError,error);if(error>.04+1e-6)throw Error(`Render/collider surface mismatch: ${mesh.name}`);
  }
  if(options.strictSurface)for(const [from,to]of [[renderTriangles,hullTriangles],[hullTriangles,renderTriangles]] as const){
   const certificate=certifySurfaceBound(from,to);surfaceUpperBound=Math.max(surfaceUpperBound,certificate.upperBound);surfaceCells+=certificate.cells;
  }
 }
 return {metadata,triangles,maxSurfaceError,parts:meshes.length,...(options.strictSurface?{surfaceUpperBound,surfaceCells}: {})};
}
