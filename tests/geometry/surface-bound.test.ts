import {it,expect} from 'vitest';
import {Triangle,Vector3} from 'three';
import {certifySurfaceBound} from '../../src/assets/SurfaceBound';
const v=(x:number,y:number,z=0)=>new Vector3(x,y,z);
it('certifies whole coplanar and parallel-offset surfaces, not just sampled vertices',()=>{
 const a=new Triangle(v(0,0),v(1,0),v(0,1)),b=new Triangle(v(0,0,.02),v(1,0,.02),v(0,1,.02));
 expect(certifySurfaceBound([a],[a]).upperBound).toBeLessThan(1e-6);expect(certifySurfaceBound([a],[b]).upperBound).toBeLessThan(.021);
});
it('certifies a differently triangulated quad in both directions by bounded subdivision',()=>{
 const a=[new Triangle(v(0,0),v(1,0),v(1,1)),new Triangle(v(0,0),v(1,1),v(0,1))],b=[new Triangle(v(0,0),v(1,0),v(0,1)),new Triangle(v(1,0),v(1,1),v(0,1))];
 for(const [from,to]of [[a,b],[b,a]]){const c=certifySurfaceBound(from,to);expect(c.upperBound).toBeLessThanOrEqual(.04);expect(c.cells).toBeGreaterThan(2);}
});
it('rejects holes between old vertex/edge/centroid samples',()=>{
 const a=new Triangle(v(0,0),v(1,0),v(0,1));
 // Tiny patches around all seven legacy samples, leaving unsampled large holes.
 const centers=[a.a,a.b,a.c,v(1/3,1/3),v(.5,0),v(.5,.5),v(0,.5)],target=centers.map(p=>new Triangle(p.clone().add(v(-.002,-.002)),p.clone().add(v(.002,-.002)),p.clone().add(v(0,.002))));
 expect(()=>certifySurfaceBound([a],target)).toThrow(/strict surface mismatch/);
});
it('fails closed on budget exhaustion and rejects invalid inputs',()=>{
 const a=new Triangle(v(0,0),v(1,0),v(0,1)),b=[new Triangle(v(0,0),v(1,0),v(.5,.5)),new Triangle(v(0,0),v(.5,.5),v(0,1))];
 expect(()=>certifySurfaceBound([a],b,{maxDepth:0})).toThrow(/inconclusive/);
 expect(()=>certifySurfaceBound([a],b,{maxCells:1})).toThrow(/inconclusive/);
 expect(()=>certifySurfaceBound([],b)).toThrow(/options/);expect(()=>certifySurfaceBound([a],b,{tolerance:NaN})).toThrow(/options/);
});
