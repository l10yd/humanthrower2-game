import { cross,dot,normalize,vec,type Vec3 } from './Math';
import type { Face } from './ConvexClipper';
/** Per-face corners retain UV seams; physics still welds positions only. */
export interface SurfaceUv {u:number;v:number}
export function validateFaceUvs(face:Face){
 if(!face.uvs)return;
 if(face.uvs.length!==face.vertices.length)throw Error('Invalid face UV attributes');
 for(let i=0;i<face.uvs.length;i++){const p=face.uvs[i];if(!p||!Number.isFinite(p.u)||!Number.isFinite(p.v))throw Error('Invalid face UV attributes');}
}
export function legacyUv(point:Vec3):SurfaceUv {return {u:point.x*3+.5,v:point.y*3+.5};}
/** Body-local projection independent of cap centroid, so another cut cannot
 * slide the remaining cap texture. Opposite normals share one texture basis. */
export function planarCapUvs(points:readonly Vec3[],normal:Vec3):SurfaceUv[] {
 let n=normalize(normal);
 const dominant=Math.abs(n.x)>=Math.abs(n.y)&&Math.abs(n.x)>=Math.abs(n.z)?n.x:Math.abs(n.y)>=Math.abs(n.z)?n.y:n.z;
 if(dominant<0)n=vec(-n.x,-n.y,-n.z);
 const u=normalize(cross(Math.abs(n.x)<.9?vec(1,0,0):vec(0,1,0),n)),v=cross(n,u);
 return points.map(p=>({u:dot(p,u)*3+.5,v:dot(p,v)*3+.5}));
}
