import { vertices,type ConvexPolyhedron } from '../slicing/ConvexClipper';
import { add,cross,dot,length,normalize,rotate,sub,type Quat,type Vec3 } from '../slicing/Math';
/** Full convex SAT: face normals plus all edge-cross-edge axes. Handles complete
 * containment/coincident hulls, where pairwise GJK contact can return zero. */
export function convexOverlapDepth(a:ConvexPolyhedron,pa:Vec3,qa:Quat,b:ConvexPolyhedron,pb:Vec3,qb:Quat):number {
 const world=(poly:ConvexPolyhedron,p:Vec3,q:Quat)=>({points:vertices(poly).map(v=>add(p,rotate(v,q))),normals:poly.faces.map(f=>rotate(normalize(cross(sub(f.vertices[1],f.vertices[0]),sub(f.vertices[2],f.vertices[0]))),q)),edges:poly.faces.flatMap(f=>f.vertices.map((v,i)=>rotate(sub(f.vertices[(i+1)%f.vertices.length],v),q)))});
 const aa=world(a,pa,qa),bb=world(b,pb,qb),axes:Vec3[]=[];
 const unique=(list:readonly Vec3[])=>{const result:Vec3[]=[];for(const v of list){if(length(v)<1e-10)continue;const axis=normalize(v);if(!result.some(r=>Math.abs(dot(r,axis))>1-1e-10))result.push(axis);}return result;};
 const addAxis=(axis:Vec3)=>{if(length(axis)>1e-10){axis=normalize(axis);if(!axes.some(r=>Math.abs(dot(r,axis))>1-1e-10))axes.push(axis);}};
 for(const axis of [...aa.normals,...bb.normals])addAxis(axis);
 for(const ea of unique(aa.edges))for(const eb of unique(bb.edges))addAxis(cross(ea,eb));
 let depth=Infinity;
 for(const axis of axes){const av=aa.points.map(p=>dot(axis,p)),bv=bb.points.map(p=>dot(axis,p)),loA=Math.min(...av),hiA=Math.max(...av),loB=Math.min(...bv),hiB=Math.max(...bv);
  const overlap=Math.min(hiA-loB,hiB-loA);if(overlap<=0)return 0;depth=Math.min(depth,overlap);
 }
 return depth;
}
