import { GeometryRead,vertices,type ConvexPolyhedron } from './ConvexClipper';
export interface GeometryUsage {vertices:number;triangles:number;faces:number;corners:number}
export interface GeometryLimits {partVertices:number;partTriangles:number;partFaces:number;partCorners:number;worldVertices:number;worldTriangles:number}
/** Technical ceilings, not visual simplification targets. Exceeding a budget
 * rejects a prepared allocation; significant geometry is never silently removed. */
export const DEFAULT_GEOMETRY_LIMITS:Readonly<GeometryLimits>={partVertices:256,partTriangles:512,partFaces:128,partCorners:1024,worldVertices:100000,worldTriangles:180000};
export const emptyGeometry=():GeometryUsage=>({vertices:0,triangles:0,faces:0,corners:0});
export function addGeometry(a:GeometryUsage,b:GeometryUsage,sign=1):GeometryUsage{return {vertices:a.vertices+sign*b.vertices,triangles:a.triangles+sign*b.triangles,faces:a.faces+sign*b.faces,corners:a.corners+sign*b.corners};}
export function geometryUsage(poly:ConvexPolyhedron,limits:Readonly<GeometryLimits>=DEFAULT_GEOMETRY_LIMITS,read?:GeometryRead):GeometryUsage {
 // Cheap bounded checks precede the positional weld, which is quadratic for a hull.
 if(!poly||!Array.isArray(poly.faces)||poly.faces.length>limits.partFaces)throw Error('Part face budget exceeded');
 let corners=0,triangles=0;
 for(const f of poly.faces){if(!f||!Array.isArray(f.vertices)||f.vertices.length<3)throw Error('Invalid polygon face');corners+=f.vertices.length;triangles+=f.vertices.length-2;if(corners>limits.partCorners||triangles>limits.partTriangles)throw Error('Part geometry budget exceeded');}
 const count=(read?read.vertices(poly):vertices(poly)).length;if(count>limits.partVertices)throw Error('Part vertex budget exceeded');
 return {vertices:count,triangles,faces:poly.faces.length,corners};
}
export function assertWorldGeometry(usage:GeometryUsage,limits:Readonly<GeometryLimits>){
 if(usage.vertices>limits.worldVertices||usage.triangles>limits.worldTriangles)throw Error('World geometry budget exceeded: allocation refused without deletion');
}
