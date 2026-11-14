import {GeometryRead,clip,massProperties,subtractSlabs,vertices,type ConvexPolyhedron,type Interval} from './ConvexClipper';
import {dot,mul,type Vec3} from './Math';
/** Pure preparation shared by synchronous transactions and the geometry Worker. */
export function belowFragmentScale(poly:ConvexPolyhedron):boolean {
 if(massProperties(poly).volume>=1e-6)return false;
 const points=vertices(poly),size=Math.hypot(...(['x','y','z'] as const).map(k=>Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]))));
 return size<.015;
}
export interface PreparedCut {survivors:ConvexPolyhedron[];removed:number;byInterval:number[];skipped:boolean}
export function prepareRowCut(poly:ConvexPolyhedron,n:Vec3,local:Interval[],score:boolean,read:GeometryRead|null=new GeometryRead()):PreparedCut {
 let min=Infinity,max=-Infinity;
 for(const face of poly.faces)for(const point of face.vertices){const y=dot(n,point);min=Math.min(min,y);max=Math.max(max,y);}
 if(local.every(i=>max<i.lower-1e-9||min>i.upper+1e-9)&&!belowFragmentScale(poly))return {survivors:[],removed:0,byInterval:[],skipped:true};
 const survivors=subtractSlabs(poly,n,local,read??undefined).filter(p=>!belowFragmentScale(p));
 const removed=massProperties(poly).volume-survivors.reduce((v,p)=>v+massProperties(p).volume,0);
 const byInterval=removed>=1e-12&&score?local.map(i=>{
  const below=clip(poly,n,i.upper,read??undefined),slab=below&&clip(below,mul(n,-1),-i.lower,read??undefined);
  return slab?massProperties(slab).volume:0;
 }):[];
 return {survivors,removed,byInterval,skipped:false};
}
