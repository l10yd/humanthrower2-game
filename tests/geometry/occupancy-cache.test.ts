import { CONFIG } from '../../src/core/Config';
import { beforeAll, describe, expect, it } from 'vitest';
import { OccupancyRaster } from '../../src/grid/OccupancyRaster';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { box,subtractSlabs } from '../../src/slicing/ConvexClipper';
import { identity, vec, axisAngle } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
describe('bounded physical occupancy / footprint cache',()=>{
 it('excludes geometry beyond the physical front/back walls',()=>{
  const p=new PhysicsManager();try{const r=new OccupancyRaster();
   p.createPart(box(4,.45,.1),{position:vec(0,.5,2),rotation:identity},10,1,'outside');
   expect(r.rebuild(p.parts.values()).every(row=>row.mean===0)).toBe(true);
  }finally{p.dispose();}
 });
 it('clips a tilted hull at depth BEFORE projecting, not its original full silhouette',()=>{
  const p=new PhysicsManager();try{const r=new OccupancyRaster();
   const part=p.createPart(box(1,.4,.1),{position:vec(0,.5,1.7),rotation:axisAngle(vec(0,1,0),Math.PI/4)},10,1,'tilted');
   const clipped=r.rebuild(p.parts.values())[0].mean;
   part.body.setTranslation(vec(0,.5,0),true);const contained=r.rebuild(p.parts.values())[0].mean;
   expect(clipped).toBeGreaterThan(0);expect(clipped).toBeLessThan(contained*.5);
  }finally{p.dispose();}
 });
 it('cached and full maps match after motion, sleep, overlap and deletion',()=>{
  const p=new PhysicsManager();try{const r=new OccupancyRaster();
   const a=p.createPart(box(.7,.4,.1),{position:vec(0,.5,0),rotation:identity},10,1,'a');
   p.createPart(box(.7,.4,.1),{position:vec(0,.5,0),rotation:identity},10,2,'b');
   for(let i=0;i<5;i++){
    a.body.setTranslation(vec(i*.1,.5,0),true);a.body.setLinvel(vec(i,0,0),true);r.rebuild(p.parts.values());
    const cached=[...r.map],stable=[...r.stable];r.rebuild(p.parts.values(),false);
    expect([...r.map]).toEqual(cached);expect([...r.stable]).toEqual(stable);
   }
   r.rebuild(p.parts.values());expect(r.cacheHits).toBeGreaterThan(0);
   p.removePart(a.id);r.rebuild(p.parts.values());expect(r.cacheSize).toBe(1);expect(r.rows[0].mean).toBeGreaterThan(0);
  }finally{p.dispose();}
 });
 it('fast half-space rejection exactly matches original clipping for rotated cut hulls and boundaries',()=>{
  const p=new PhysicsManager();try{
   const fast=new OccupancyRaster(),reference=new OccupancyRaster();reference.fastClipping=false;reference.sharedCornerTransforms=false;reference.geometryReads=false;reference.singlePassStatistics=false;reference.footprintSpans=false;
   for(let i=0;i<40;i++){
    const original=box(.12+(i%5)*.13,.08+(i%7)*.19,.05+(i%3)*.2);
    const pieces=i%2?subtractSlabs(original,vec(0,1,0),[{lower:-.003,upper:.017}]):[original];
    for(const poly of pieces)p.createPart(poly,{position:vec((i%9-4)*1.09,-.05+Math.floor(i/9)*3.99,(i%5-2)*.66),rotation:axisAngle(vec(.6,.8,0),i*.37)},10,i+1,'cut');
   }
   fast.rebuild(p.parts.values(),false);reference.rebuild(p.parts.values(),false);
   expect(fast.map).toEqual(reference.map);expect(fast.stable).toEqual(reference.stable);expect(fast.overflow).toEqual(reference.overflow);expect(fast.rows).toEqual(reference.rows);expect(fast.criticalColumns()).toEqual(reference.criticalColumns());
  }finally{p.dispose();}
 });
 it('overflow uses stricter stable geometry and rejects a fast high-flying body',()=>{
  const p=new PhysicsManager();try{const r=new OccupancyRaster();
   const a=p.createPart(box(4.5,.75,.2),{position:vec(0,CONFIG.arena.critical+.75,0),rotation:identity},72,1,'fixture');
   a.body.setLinvel(vec(0,-3,0),true);r.rebuild(p.parts.values());expect(r.criticalColumns().every(v=>v===0)).toBe(true);
   a.body.sleep();r.rebuild(p.parts.values());expect(r.criticalColumns().every(v=>v>.99)).toBe(true);
  }finally{p.dispose();}
 });
});
