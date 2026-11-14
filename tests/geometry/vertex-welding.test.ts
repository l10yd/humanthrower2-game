import {expect,it} from 'vitest';
import {vertices,box,clip,massProperties,type ConvexPolyhedron} from '../../src/slicing/ConvexClipper';
import {vec,length,sub,add,mul,dot,cross} from '../../src/slicing/Math';
const reference=(poly:ConvexPolyhedron)=>{const result:ReturnType<typeof vec>[]=[];for(const f of poly.faces)for(const p of f.vertices)if(!result.some(v=>length(sub(v,p))<1e-9))result.push(p);return result;};
it('welding retains exact first-match coordinates and rejects cell-based false merges',()=>{
 const points=[vec(),vec(.999e-9,0,0),vec(1.001e-9,0,0),vec(-.5e-9,0,0),vec(0,.999e-9,.999e-9),vec(1e10,0,0),vec(Infinity,0,0),vec(NaN,0,0)];
 const poly={faces:[{vertices:points},{vertices:points.map(p=>({...p}))}]};expect(vertices(poly)).toEqual(reference(poly));
});
it('scalar tetrahedron moments are bit-exact to original vector arithmetic',()=>{
 const referenceMass=(poly:ConvexPolyhedron)=>{let volume=0,moment=vec();for(const f of poly.faces)for(let i=1;i<f.vertices.length-1;i++){const a=f.vertices[0],b=f.vertices[i],c=f.vertices[i+1],v=dot(a,cross(b,c))/6;volume+=v;moment=add(moment,mul(add(add(a,b),c),v/4));}return {volume,center:Math.abs(volume)>1e-12?mul(moment,1/volume):vec()};};
 let poly=box(.312,.537,.221);for(let i=0;i<8;i++){poly=clip(poly,vec(Math.cos(i),Math.sin(i),.7),.35)!;expect(massProperties(poly)).toEqual(referenceMass(poly));}
 expect(massProperties(box(.00001,.03,.00002))).toEqual(referenceMass(box(.00001,.03,.00002)));
});
it('reports diagnostic timing for representative repeatedly clipped hulls',()=>{
 let poly=box(.3,.5,.2);for(let i=0;i<8;i++)poly=clip(poly,vec(Math.cos(i),Math.sin(i),.7),.35)!;
 expect(vertices(poly)).toEqual(reference(poly));const n=5000;
 let start=performance.now();for(let i=0;i<n;i++)reference(poly);const before=performance.now()-start;
 start=performance.now();for(let i=0;i<n;i++)vertices(poly);console.log({corners:poly.faces.reduce((s,f)=>s+f.vertices.length,0),before,after:performance.now()-start});
});
