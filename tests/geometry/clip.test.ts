import { describe, it, expect } from 'vitest';
import { box, clip, EPSILON, massProperties, subtractSlabs, validate } from '../../src/slicing/ConvexClipper';
import { axisAngle, dot, mul, normalize, rotate, vec, pointVelocity } from '../../src/slicing/Math';
describe('closed convex slicing',()=>{
  it('caps a cube and preserves signed volume',()=>{const p=box(1,1,1);validate(p);expect(massProperties(p).volume).toBeCloseTo(8);
    const result=clip(p,vec(0,1,0),0)!;validate(result);expect(massProperties(result).volume).toBeCloseTo(4);
    expect(massProperties(result).center.y).toBeCloseTo(-.5);});
  it('preserves tilted prism geometry through repeated cuts',()=>{const original=box(.5,2,.3),n=rotate(vec(0,1,0),axisAngle(vec(0,0,1),.7));
    const intervals=Array.from({length:10},(_,i)=>({lower:-1.7+i*.34,upper:-1.65+i*.34}));
    const kept=subtractSlabs(original,n,intervals);kept.forEach(validate);let removed=0;
    for(const i of intervals) {const low=clip(original,n,i.upper);const slab=low&&clip(low,vec(-n.x,-n.y,-n.z),-i.lower);if(slab)removed+=massProperties(slab).volume;}
    expect(kept.reduce((v,p)=>v+massProperties(p).volume,removed)).toBeCloseTo(massProperties(original).volume,6);
    expect(subtractSlabs(original,n,[...intervals].reverse()).reduce((v,p)=>v+massProperties(p).volume,0))
      .toBeCloseTo(kept.reduce((v,p)=>v+massProperties(p).volume,0),8);});
  it('grazing a boundary retains the cube',()=>{expect(clip(box(1,1,1),vec(0,1,0),1)).not.toBeNull();expect(clip(box(1,1,1),vec(0,1,0),-1)).toBeNull();});
  it('snaps near-boundary vertices onto a planar cap rather than making a concave repeated cut',()=>{
    const original=box(.5,.3,.2),n=normalize(vec(.2,.9,.35)),d=dot(n,vec(-.5,.3,-.2))-EPSILON*.5;
    const kept=clip(original,n,d)!;validate(kept);
    for(const face of kept.faces.filter(f=>f.cap))for(const p of face.vertices)expect(dot(n,p)-d).toBeCloseTo(0,10);
    const twice=clip(kept,mul(n,-1),-d+.01)!;validate(twice);
    expect(massProperties(twice).volume).toBeGreaterThan(0);
  });
  it('preserves velocity field with a shifted COM',()=>{const v=vec(2,-1,3),w=vec(.4,.7,-.2),old=vec(0,0,0),newCom=vec(.1,.5,0),point=vec(.3,.8,.2);
    const newV=pointVelocity(v,w,newCom,old);const a=pointVelocity(v,w,point,old),b=pointVelocity(newV,w,point,newCom);
    expect(a.x).toBeCloseTo(b.x,12);expect(a.y).toBeCloseTo(b.y,12);expect(a.z).toBeCloseTo(b.z,12);});
});
