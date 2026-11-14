import { RAPIER, type PhysicsManager } from '../physics/PhysicsManager';
import { vec, type Quat, type Vec3 } from '../slicing/Math';
export interface Bounds {min:Vec3;max:Vec3}
const localBounds=new WeakMap<RAPIER.Shape,Bounds>();
/** Conservative bounds for query shapes. Unknown shapes are never culled. */
function local(shape:RAPIER.Shape):Bounds|null {
  const cached=localBounds.get(shape);if(cached)return cached;
  let half:Vec3|null=null;
  if(shape instanceof RAPIER.Ball)half=vec(shape.radius,shape.radius,shape.radius);
  else if(shape instanceof RAPIER.Capsule)half=vec(shape.radius,shape.halfHeight+shape.radius,shape.radius);
  else if(shape instanceof RAPIER.Cuboid)half=shape.halfExtents;
  let bounds:Bounds;
  if(half)bounds={min:vec(-half.x,-half.y,-half.z),max:{...half}};
  else if(shape instanceof RAPIER.ConvexPolyhedron){
    bounds={min:vec(Infinity,Infinity,Infinity),max:vec(-Infinity,-Infinity,-Infinity)};
    for(let i=0;i<shape.vertices.length;i+=3)for(const [j,key]of ['x','y','z'].entries()){
      bounds.min[key as keyof Vec3]=Math.min(bounds.min[key as keyof Vec3],shape.vertices[i+j]);
      bounds.max[key as keyof Vec3]=Math.max(bounds.max[key as keyof Vec3],shape.vertices[i+j]);
    }
  }else return null;
  localBounds.set(shape,bounds);return bounds;
}
export function shapeBounds(shape:RAPIER.Shape,position:Vec3,rotation:Quat):Bounds|null {
  const bounds=local(shape);if(!bounds)return null;
  const cx=(bounds.min.x+bounds.max.x)*.5,cy=(bounds.min.y+bounds.max.y)*.5,cz=(bounds.min.z+bounds.max.z)*.5;
  const hx=(bounds.max.x-bounds.min.x)*.5,hy=(bounds.max.y-bounds.min.y)*.5,hz=(bounds.max.z-bounds.min.z)*.5;
  const {x,y,z,w}=rotation;
  // Absolute rotation matrix times half extents gives exactly the rotated box AABB,
  // without allocating/rotating eight corners for every collider and every query.
  const m00=1-2*(y*y+z*z),m01=2*(x*y-z*w),m02=2*(x*z+y*w);
  const m10=2*(x*y+z*w),m11=1-2*(x*x+z*z),m12=2*(y*z-x*w);
  const m20=2*(x*z-y*w),m21=2*(y*z+x*w),m22=1-2*(x*x+y*y);
  const px=position.x+m00*cx+m01*cy+m02*cz,py=position.y+m10*cx+m11*cy+m12*cz,pz=position.z+m20*cx+m21*cy+m22*cz;
  const ex=Math.abs(m00)*hx+Math.abs(m01)*hy+Math.abs(m02)*hz,ey=Math.abs(m10)*hx+Math.abs(m11)*hy+Math.abs(m12)*hz,ez=Math.abs(m20)*hx+Math.abs(m21)*hy+Math.abs(m22)*hz;
  return {min:vec(px-ex,py-ey,pz-ez),max:vec(px+ex,py+ey,pz+ez)};
}
/** Bounding sphere swept along the root segment contains every intermediate orientation. */
export function sweptBounds(shape:RAPIER.Shape,from:Vec3,to:Vec3):Bounds|null {
  const b=local(shape);if(!b)return null;
  const r=Math.hypot(Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),Math.max(Math.abs(b.min.y),Math.abs(b.max.y)),Math.max(Math.abs(b.min.z),Math.abs(b.max.z)))+.02;
  return {min:vec(Math.min(from.x,to.x)-r,Math.min(from.y,to.y)-r,Math.min(from.z,to.z)-r),max:vec(Math.max(from.x,to.x)+r,Math.max(from.y,to.y)+r,Math.max(from.z,to.z)+r)};
}
/** Exact union of endpoint AABBs for a fixed-orientation translation. */
export function translationBounds(shape:RAPIER.Shape,from:Vec3,to:Vec3,rotation:Quat):Bounds|null {
  const a=shapeBounds(shape,from,rotation),b=shapeBounds(shape,to,rotation);if(!a||!b)return null;
  return {min:vec(Math.min(a.min.x,b.min.x)-.02,Math.min(a.min.y,b.min.y)-.02,Math.min(a.min.z,b.min.z)-.02),max:vec(Math.max(a.max.x,b.max.x)+.02,Math.max(a.max.y,b.max.y)+.02,Math.max(a.max.z,b.max.z)+.02)};
}
export function overlaps(a:Bounds,b:Bounds,padding=.02):boolean {
  return a.min.x<=b.max.x+padding&&a.max.x>=b.min.x-padding&&a.min.y<=b.max.y+padding&&a.max.y>=b.min.y-padding&&a.min.z<=b.max.z+padding&&a.max.z>=b.min.z-padding;
}
/** One read-only decision barrier: never retain across world edits or a physics step.
 * A uniform grid accelerates repeated local queries (particles/recovery). Large or
 * unknown bounds remain conservative fallbacks. Results retain registry order. */
export class CollisionQuery {
  private entries:{collider:RAPIER.Collider;bounds:Bounds|null}[]=[];
  private cells=new Map<string,number[]>();private fallback:number[]=[];private readonly useGrid:boolean;
  private readonly cellSize=1;private readonly maxCells=512;
  candidateChecks=0;
  constructor(physics:PhysicsManager,external:(c:RAPIER.Collider)=>boolean){
    physics.world.forEachCollider(c=>{
      if(external(c))this.entries.push({collider:c,bounds:shapeBounds(c.shape,c.translation(),c.rotation())});
    });
    // A few recovery queries do not amortize grid construction; particles do.
    this.useGrid=this.entries.length>=32;
    if(!this.useGrid)return;
    this.entries.forEach(({bounds},index)=>{
      const range=bounds&&this.range(bounds,0);
      if(!range){this.fallback.push(index);return;}
      for(let x=range.x0;x<=range.x1;x++)for(let y=range.y0;y<=range.y1;y++)for(let z=range.z0;z<=range.z1;z++){
        const key=`${x}:${y}:${z}`;let list=this.cells.get(key);if(!list)this.cells.set(key,list=[]);list.push(index);
      }
    });
  }
  private range(b:Bounds,padding:number){
    const x0=Math.floor((b.min.x-padding)/this.cellSize),x1=Math.floor((b.max.x+padding)/this.cellSize);
    const y0=Math.floor((b.min.y-padding)/this.cellSize),y1=Math.floor((b.max.y+padding)/this.cellSize);
    const z0=Math.floor((b.min.z-padding)/this.cellSize),z1=Math.floor((b.max.z+padding)/this.cellSize);
    const n=(x1-x0+1)*(y1-y0+1)*(z1-z0+1);
    return [x0,x1,y0,y1,z0,z1].every(Number.isSafeInteger)&&Number.isFinite(n)&&n>0&&n<=this.maxCells?{x0,x1,y0,y1,z0,z1}:null;
  }
  nearby(bounds:Bounds|null):RAPIER.Collider[]{
    const range=this.useGrid&&bounds?this.range(bounds,.02):null;
    if(!range){this.candidateChecks+=this.entries.length;return this.entries.filter(e=>!bounds||!e.bounds||overlaps(bounds,e.bounds)).map(e=>e.collider);}
    const indices=new Set(this.fallback);
    for(let x=range.x0;x<=range.x1;x++)for(let y=range.y0;y<=range.y1;y++)for(let z=range.z0;z<=range.z1;z++)
      for(const index of this.cells.get(`${x}:${y}:${z}`)??[])indices.add(index);
    const result:RAPIER.Collider[]=[];
    for(const index of [...indices].sort((a,b)=>a-b)){
      this.candidateChecks++;const e=this.entries[index];if(!e.bounds||overlaps(bounds!,e.bounds))result.push(e.collider);
    }
    return result;
  }
}
export function nearbyColliders(physics:PhysicsManager,bounds:Bounds|null,external:(c:RAPIER.Collider)=>boolean,query?:CollisionQuery):RAPIER.Collider[] {
  return (query??new CollisionQuery(physics,external)).nearby(bounds);
}
