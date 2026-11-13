import { planarCapUvs,validateFaceUvs,type SurfaceUv } from './SurfaceAttributes';
import { add, cross, dot, length, mul, normalize, sub, vec, type Vec3 } from './Math';
export interface Face { vertices: Vec3[]; cap?: boolean;uvs?:SurfaceUv[];surfaceId?:string }
export interface ConvexPolyhedron { faces: Face[] }
export interface Interval { lower: number; upper: number }
export const EPSILON = 1e-5;
const TOPOLOGY_EPSILON=1e-9;
export function box(hx: number, hy: number, hz: number): ConvexPolyhedron {
  const p = [vec(-hx,-hy,-hz),vec(hx,-hy,-hz),vec(hx,hy,-hz),vec(-hx,hy,-hz),
    vec(-hx,-hy,hz),vec(hx,-hy,hz),vec(hx,hy,hz),vec(-hx,hy,hz)];
  return { faces: [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[0,1,5,4],[3,7,6,2]].map(f => ({ vertices: f.map(i => p[i]) })) };
}
export function vertices(poly: ConvexPolyhedron): Vec3[] {
  const result: Vec3[] = []; for (const f of poly.faces) for (const p of f.vertices)
    if (!result.some(v => length(sub(v,p)) < TOPOLOGY_EPSILON)) result.push(p); return result;
}
export function massProperties(poly: ConvexPolyhedron): { volume: number; center: Vec3 } {
  let volume = 0, moment = vec();
  for (const f of poly.faces) for (let i=1; i<f.vertices.length-1; i++) {
    const a=f.vertices[0], b=f.vertices[i], c=f.vertices[i+1];
    const v=dot(a,cross(b,c))/6; volume+=v; moment=add(moment,mul(add(add(a,b),c),v/4));
  }
  return { volume, center: Math.abs(volume)>1e-12 ? mul(moment,1/volume) : vec() };
}
function cleanRing(ring: Vec3[]): Vec3[] {
  const out: Vec3[] = [];
  for (const p of ring) if (!out.length || length(sub(p,out[out.length-1]))>TOPOLOGY_EPSILON) out.push(p);
  if (out.length>1 && length(sub(out[0],out[out.length-1]))<TOPOLOGY_EPSILON) out.pop();
  let changed=true;
  while(changed && out.length>3) { changed=false; for(let i=0;i<out.length;i++) {
    const a=sub(out[i],out[(i+out.length-1)%out.length]), b=sub(out[(i+1)%out.length],out[i]);
    // Only remove numerically collinear points. The broad clipping tolerance
    // erased thin-strip corners on one face but not its neighbor, opening seams.
    if(length(cross(a,b)) < 1e-10*(length(a)+length(b))) {out.splice(i,1);changed=true;break;}
  }} return out;
}
/** Closed convex half-space intersection n·p <= d, with an outward-facing cap. */
export function clip(poly: ConvexPolyhedron, n: Vec3, d: number): ConvexPolyhedron | null {
  for(const face of poly.faces)validateFaceUvs(face);
  const points = vertices(poly), distances=points.map(p=>dot(n,p)-d);
  if (distances.every(v=>v<=TOPOLOGY_EPSILON)) return poly;
  if (distances.every(v=>v>=-TOPOLOGY_EPSILON)) return null;
  const faces: Face[]=[], ring: Vec3[]=[];
  // Only snap floating-point noise. Moving a near-plane corner by geometric
  // EPSILON bends the old side faces and makes repeated thin cuts non-convex.
  // Real crossings intersect the edge exactly, preserving both face planes.
  const snapped=new Map<Vec3,Vec3>();
  const onBoundary=(p:Vec3)=>{
    const cached=snapped.get(p);if(cached)return cached;
    const distance=dot(n,p)-d;
    const result=Math.abs(distance)<TOPOLOGY_EPSILON?sub(p,mul(n,distance/dot(n,n))):p;
    snapped.set(p,result);return result;
  };
  const onPlane=(p:Vec3)=> { if(!ring.some(v=>length(sub(v,p))<TOPOLOGY_EPSILON)) ring.push(p); };
  for(const face of poly.faces) {
    const output:Vec3[]=[],attributes=new Map<Vec3,SurfaceUv>();
    for(let i=0;i<face.vertices.length;i++) {
      const a=onBoundary(face.vertices[i]), b=onBoundary(face.vertices[(i+1)%face.vertices.length]);
      const da=dot(n,a)-d, db=dot(n,b)-d, insideA=da<=TOPOLOGY_EPSILON, insideB=db<=TOPOLOGY_EPSILON;
      if(insideA) { output.push(a);if(face.uvs)attributes.set(a,{...face.uvs[i]}); if(Math.abs(da)<TOPOLOGY_EPSILON) onPlane(a); }
      if(insideA!==insideB) {
        const t=da/(da-db),p=add(a,mul(sub(b,a),t));output.push(p);onPlane(p);
        if(face.uvs){const ua=face.uvs[i],ub=face.uvs[(i+1)%face.vertices.length];attributes.set(p,{u:ua.u+(ub.u-ua.u)*t,v:ua.v+(ub.v-ua.v)*t});}
      }
    }
    const clean=cleanRing(output); if(clean.length>=3) faces.push({ ...face,vertices:clean,...(face.uvs?{uvs:clean.map(p=>attributes.get(p)!)}:{}) });
  }
  if(ring.length>=3) {
    const center=mul(ring.reduce((a,b)=>add(a,b),vec()),1/ring.length);
    const u=normalize(cross(Math.abs(n.x)<0.9?vec(1,0,0):vec(0,1,0),n)), v=cross(normalize(n),u);
    ring.sort((a,b)=>Math.atan2(dot(sub(a,center),v),dot(sub(a,center),u))-Math.atan2(dot(sub(b,center),v),dot(sub(b,center),u)));
    const clean=cleanRing(ring); if(clean.length>=3) faces.push({ vertices:clean,cap:true,uvs:planarCapUvs(clean,n),surfaceId:'cut' });
  }
  const result={faces}; return massProperties(result).volume>1e-12?result:null;
}
export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted=intervals.map(i=>({...i})).sort((a,b)=>a.lower-b.lower), result:Interval[]=[];
  for(const i of sorted) { if(!Number.isFinite(i.lower)||!Number.isFinite(i.upper)||i.lower>=i.upper) throw Error('Invalid slicing interval');
    const last=result.at(-1); if(last && i.lower<=last.upper+EPSILON) last.upper=Math.max(last.upper,i.upper);else result.push(i);
  } return result;
}
/** Intervals are expressed along n in the current body's reference frame. */
export function subtractSlabs(poly: ConvexPolyhedron, n: Vec3, intervals: Interval[]): ConvexPolyhedron[] {
  const kept:ConvexPolyhedron[]=[];let remaining:ConvexPolyhedron|null=poly;
  for(const i of mergeIntervals(intervals)) {
    if(!remaining) break; const lower=clip(remaining,n,i.lower); if(lower) kept.push(lower);
    remaining=clip(remaining,mul(n,-1),-i.upper);
  } if(remaining) kept.push(remaining);return kept;
}
export function contains(poly: ConvexPolyhedron, p: Vec3, tolerance=0.001): boolean {
  return poly.faces.every(f=> { const normal=normalize(cross(sub(f.vertices[1],f.vertices[0]),sub(f.vertices[2],f.vertices[0])));
    return dot(normal,sub(p,f.vertices[0]))<=tolerance; });
}
export function validate(poly: ConvexPolyhedron): void {
  for(const face of poly.faces)validateFaceUvs(face);
  const ps=vertices(poly); if(ps.some(p=>!Number.isFinite(p.x+p.y+p.z))) throw Error('Non-finite hull');
  if(massProperties(poly).volume<=1e-12) throw Error('Non-positive hull volume');
  if(ps.some(p=>!contains(poly,p,EPSILON*4))) throw Error('Non-convex hull');
  const edges=new Map<string,number>(); const index=(p:Vec3)=>ps.findIndex(v=>length(sub(v,p))<TOPOLOGY_EPSILON);
  for(const f of poly.faces) for(let i=0;i<f.vertices.length;i++) {
    const a=index(f.vertices[i]),b=index(f.vertices[(i+1)%f.vertices.length]);const key=`${Math.min(a,b)}:${Math.max(a,b)}`;
    edges.set(key,(edges.get(key)??0)+1);
  } if([...edges.values()].some(n=>n!==2)) throw Error('Open/non-manifold hull');
}
