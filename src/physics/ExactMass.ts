import type { ConvexPolyhedron } from '../slicing/ConvexClipper';
import { vertices } from '../slicing/ConvexClipper';
import { add, cross, dot, mul, sub, vec, type Quat, type Vec3 } from '../slicing/Math';
export interface ExactMass {mass:number;volume:number;center:Vec3;principal:Vec3;frame:Quat;tensor:number[][]}
/** Double-precision tetrahedral moments around a nearby reference, never an inertia multiplier. */
export function exactMassProperties(poly:ConvexPolyhedron,density:number):ExactMass {
 const points=vertices(poly),reference=mul(points.reduce(add,vec()),1/points.length);
 let volume=0;const first=[0,0,0],second=Array.from({length:3},()=>[0,0,0]);
 for(const face of poly.faces)for(let i=1;i<face.vertices.length-1;i++){
  const vs=[face.vertices[0],face.vertices[i],face.vertices[i+1]].map(p=>sub(p,reference));
  const v=dot(vs[0],cross(vs[1],vs[2]))/6;volume+=v;
  const coords=vs.map(p=>[p.x,p.y,p.z]),sum=[0,1,2].map(k=>coords.reduce((s,p)=>s+p[k],0));
  for(let a=0;a<3;a++){
   first[a]+=v*sum[a]/4;
   for(let b=0;b<3;b++)second[a][b]+=v*(sum[a]*sum[b]+coords.reduce((s,p)=>s+p[a]*p[b],0))/20;
  }
 }
 if(!(volume>0)||!(density>0)||!Number.isFinite(volume*density))throw Error('Invalid exact mass properties');
 const center=first.map(x=>x/volume),cov=second.map((row,a)=>row.map((x,b)=>density*(x-volume*center[a]*center[b])));
 const trace=cov[0][0]+cov[1][1]+cov[2][2];
 const tensor=cov.map((row,a)=>row.map((x,b)=>(a===b?trace:0)-x));
 const matrix=tensor.map(row=>[...row]),basis=[[1,0,0],[0,1,0],[0,0,1]];
 for(let sweep=0;sweep<32;sweep++){
  let a=0,b=1;for(const [i,j]of [[0,2],[1,2]])if(Math.abs(matrix[i][j])>Math.abs(matrix[a][b])){a=i;b=j;}
  if(Math.abs(matrix[a][b])<=Math.max(...matrix.map((row,i)=>Math.abs(row[i])))*1e-15)break;
  const angle=.5*Math.atan2(2*matrix[a][b],matrix[b][b]-matrix[a][a]),c=Math.cos(angle),s=Math.sin(angle);
  const aa=matrix[a][a],bb=matrix[b][b],ab=matrix[a][b];
  matrix[a][a]=c*c*aa-2*c*s*ab+s*s*bb;matrix[b][b]=s*s*aa+2*c*s*ab+c*c*bb;matrix[a][b]=matrix[b][a]=0;
  for(let k=0;k<3;k++){
   if(k!==a&&k!==b){const ka=matrix[k][a],kb=matrix[k][b];matrix[k][a]=matrix[a][k]=c*ka-s*kb;matrix[k][b]=matrix[b][k]=s*ka+c*kb;}
   const ka=basis[k][a],kb=basis[k][b];basis[k][a]=c*ka-s*kb;basis[k][b]=s*ka+c*kb;
  }
 }
 const principal=vec(matrix[0][0],matrix[1][1],matrix[2][2]);
 if(![principal.x,principal.y,principal.z].every(x=>Number.isFinite(x)&&x>0))throw Error('Non-positive physical inertia');
 // Jacobi rotations retain a right-handed orthonormal basis.
 const m=basis,t=m[0][0]+m[1][1]+m[2][2];let frame:Quat;
 if(t>0){const s=2*Math.sqrt(1+t);frame={w:s/4,x:(m[2][1]-m[1][2])/s,y:(m[0][2]-m[2][0])/s,z:(m[1][0]-m[0][1])/s};}
 else{
  const i=m[1][1]>m[0][0]?(m[2][2]>m[1][1]?2:1):(m[2][2]>m[0][0]?2:0),j=(i+1)%3,k=(i+2)%3;
  const s=2*Math.sqrt(1+m[i][i]-m[j][j]-m[k][k]),q=[0,0,0];q[i]=s/4;q[j]=(m[j][i]+m[i][j])/s;q[k]=(m[k][i]+m[i][k])/s;
  frame={x:q[0],y:q[1],z:q[2],w:(m[k][j]-m[j][k])/s};
 }
 return {mass:volume*density,volume,center:add(reference,vec(...center as [number,number,number])),principal,frame,tensor};
}
