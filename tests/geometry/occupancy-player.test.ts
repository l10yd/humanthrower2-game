import { beforeAll, describe, expect, it } from 'vitest';
import { CONFIG } from '../../src/core/Config';
import { OccupancyRaster } from '../../src/grid/OccupancyRaster';
import { RowDetector } from '../../src/grid/RowDetector';
import { JumpTimeline } from '../../src/player/PlayerController';
import { PhysicsManager, RAPIER } from '../../src/physics/PhysicsManager';
import { box } from '../../src/slicing/ConvexClipper';
import { axisAngle, identity, vec } from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
describe('occupancy and warning',()=>{
  it('unions projected convex hulls, not AABBs or players/statics',()=>{
    const p=new PhysicsManager();try{const raster=new OccupancyRaster();
      expect(raster.rebuild(p.parts.values()).every(r=>r.mean===0)).toBe(true);
      const pose={position:vec(0,.5,0),rotation:axisAngle(vec(0,0,1),Math.PI/4)};
      p.createPart(box(1,.06,.1),pose,3,1,'arm');const coverage=raster.rebuild(p.parts.values())[0].mean;
      expect(coverage).toBeLessThan(.1);p.createPart(box(1,.06,.1),pose,3,2,'arm');expect(raster.rebuild(p.parts.values())[0].mean).toBe(coverage);
    }finally{p.dispose();}
  });
  it('requires confirmation, then warning remains armed despite an empty row',()=>{
    const p=new PhysicsManager();try{const raster=new OccupancyRaster(),detector=new RowDetector();
      p.createPart(box(4.5,.5,.1),{position:vec(0,.5,0),rotation:identity},72,1,'fixture');
      const coverage=raster.rebuild(p.parts.values());expect(coverage[0].qualifies).toBe(true);
      detector.measure(coverage,0);expect(detector.rows[0].state).toBe('CANDIDATE');detector.measure(coverage,.36);
      expect(detector.rows[0].state).toBe('ARMED');detector.measure(raster.rebuild([]),.5);
      expect(detector.due(1.5)).toEqual([]);expect(detector.due(1.52)).toEqual([0]);
    }finally{p.dispose();}
  });
});
describe('jump input timelines',()=>{
  const idle={axis:0,stomp:false,pressed:false,released:false};
  it('coyote requires an input and consumes it only once',()=>{const jump=new JumpTimeline();jump.update(idle,0,true);
    expect(jump.update(idle,.1,false)).toBe(false);expect(jump.update({...idle,pressed:true},.11,false)).toBe(true);
    expect(jump.update(idle,.12,false)).toBe(false);});
  it('buffers in air and cuts upward speed on release',()=>{const jump=new JumpTimeline();
    expect(jump.update({...idle,pressed:true},0,false)).toBe(false);expect(jump.update(idle,.13,true)).toBe(true);
    jump.update({...idle,released:true},.14,false);expect(jump.vy).toBeCloseTo(CONFIG.player.jumpSpeed*.45);
  });
  it('expires buffer after the arcade input window',()=>{const jump=new JumpTimeline();jump.update({...idle,pressed:true},0,false);expect(jump.update(idle,CONFIG.player.buffer+.01,true)).toBe(false);});
});
