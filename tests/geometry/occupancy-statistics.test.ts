import {beforeAll,expect,it} from 'vitest';
import {PhysicsManager,RAPIER} from '../../src/physics/PhysicsManager';
import {OccupancyRaster} from '../../src/grid/OccupancyRaster';
import {box} from '../../src/slicing/ConvexClipper';
import {axisAngle,vec} from '../../src/slicing/Math';
beforeAll(async()=>{await RAPIER.init();});
it('single-pass row statistics exactly preserve gaps, column counts, stable ratios and qualifications',()=>{
 const p=new PhysicsManager();try{
  for(let i=0;i<24;i++){
   const part=p.createPart(box(.1+(i%4)*.11,.3,.12),{position:vec((i%9-4)*.95,.5+Math.floor(i/9)*1.1,0),rotation:axisAngle(vec(0,0,1),i*.17)},2,i,'part');
   if(i%3===0)part.body.sleep();else part.body.setLinvel(vec(i%2?2:.5,0,0),false);
  }
  const fast=new OccupancyRaster(),old=new OccupancyRaster();fast.singlePassStatistics=true;fast.footprintSpans=true;old.singlePassStatistics=false;old.footprintSpans=false;
  for(let i=0;i<4;i++){
   const part=[...p.parts.values()][i];part.body.setTranslation(vec(4-i*.1,1.3,0),false);
   expect(fast.rebuild(p.parts.values(),false)).toEqual(old.rebuild(p.parts.values(),false));expect(fast.map).toEqual(old.map);expect(fast.stable).toEqual(old.stable);expect(fast.criticalColumns()).toEqual(old.criticalColumns());
  }
  fast.footprintSpans=false;expect(fast.rebuild(p.parts.values())).toEqual(old.rebuild(p.parts.values()));
  fast.footprintSpans=true;expect(fast.rebuild(p.parts.values())).toEqual(old.rebuild(p.parts.values()));
 }finally{p.dispose();}
});
