import {Triangle,Vector3} from 'three';
export interface SurfaceBoundOptions {tolerance?:number;maxCells?:number;maxDepth?:number}
/** Certify every point of a triangulated surface is within tolerance of the
 * target union. Distance to a closed set is 1-Lipschitz; distance to one convex
 * triangle is convex. Subdivision cells cover the complete source, not samples. */
export function certifySurfaceBound(source:Triangle[],target:Triangle[],options:SurfaceBoundOptions={}){
 const tolerance=options.tolerance??.04,maxCells=options.maxCells??200000,maxDepth=options.maxDepth??14,slack=1e-7;
 if(!Number.isFinite(tolerance)||tolerance<=slack||!Number.isInteger(maxCells)||maxCells<1||!Number.isInteger(maxDepth)||maxDepth<0||maxDepth>20||!source.length||!target.length)throw Error('Invalid surface certificate options');
 const finite=(p:Vector3)=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z);
 if([...source,...target].some(t=>![t.a,t.b,t.c].every(finite)))throw Error('Non-finite certificate surface');
 const scratch=new Vector3(),distance=(p:Vector3,t:Triangle)=>t.closestPointToPoint(p,scratch).distanceTo(p),pending=source.map(triangle=>({triangle,depth:0}));
 let cells=0,upperBound=0,maxObserved=0;
 while(pending.length){
  if(++cells>maxCells)throw Error(`Surface bound inconclusive: cell budget ${maxCells} exhausted`);
  const {triangle:t,depth}=pending.pop()!,center=t.getMidpoint(new Vector3());
  let nearest=Infinity,convexBound=Infinity;
  for(const other of target){
   nearest=Math.min(nearest,distance(center,other));
   convexBound=Math.min(convexBound,Math.max(distance(t.a,other),distance(t.b,other),distance(t.c,other)));
  }
  maxObserved=Math.max(maxObserved,nearest);
  if(nearest>tolerance+slack)throw Error(`Render/collider strict surface mismatch: ${nearest.toFixed(6)} m`);
  const radius=Math.max(center.distanceTo(t.a),center.distanceTo(t.b),center.distanceTo(t.c));
  const upper=Math.min(convexBound,nearest+radius)+slack;
  if(upper<=tolerance){upperBound=Math.max(upperBound,upper);continue;}
  if(depth>=maxDepth)throw Error(`Surface bound inconclusive: depth budget ${maxDepth} exhausted`);
  const ab=new Vector3().addVectors(t.a,t.b).multiplyScalar(.5),bc=new Vector3().addVectors(t.b,t.c).multiplyScalar(.5),ca=new Vector3().addVectors(t.c,t.a).multiplyScalar(.5);
  for(const triangle of [new Triangle(t.a,ab,ca),new Triangle(ab,t.b,bc),new Triangle(ca,bc,t.c),new Triangle(ab,bc,ca)])pending.push({triangle,depth:depth+1});
 }
 return {upperBound,maxObserved,cells,tolerance};
}
