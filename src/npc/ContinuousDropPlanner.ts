import { CONFIG } from '../core/Config';
import { RAPIER, type PhysicsManager } from '../physics/PhysicsManager';
import { RagdollFactory,type RagdollOptions } from '../physics/RagdollFactory';
import { axisAngle, rotate, vec } from '../slicing/Math';
import { vertices } from '../slicing/ConvexClipper';
import type { DropPlan } from './SpawnPlanner';
/** Demo policy: no safe-route or awake-budget waits. Geometry and total-body cap remain. */
export class ContinuousDropPlanner {
 constructor(private physics:PhysicsManager,private factory:RagdollFactory,private random:()=>number){}
 plan(type:DropPlan['type'],angle:number,now:number,delay:number):DropPlan {
  const rotation=axisAngle(vec(0,0,1),angle),bounds=this.factory.horizontalEnvelope(type,rotation);
  const min=-CONFIG.arena.width/2+.02-bounds.min,max=CONFIG.arena.width/2-.02-bounds.max;
  if(min>max)throw Error('NPC does not fit in the arena');
  return {x:min+(max-min)*this.random(),type,angle,fireAt:now+delay};
 }
 spawn(spec:DropPlan,options:RagdollOptions={}){
  // Keep the warned x fixed. If the overhead entry is occupied, place the whole hull
  // above that geometry, rather than postponing indefinitely or overlapping a body.
  const rotation=axisAngle(vec(0,0,1),spec.angle);
  // Spawn fully inside the closed ceiling. Occupied entry waits for space; never
  // stack invisible bodies above the arena or teleport them through the roof.
  const plan=this.factory.build(spec.type,vec(),rotation,options);
  const top=Math.max(...plan.parts.flatMap(p=>vertices(p.poly).map(v=>p.position.y+rotate(v,rotation).y)));
  const y=CONFIG.arena.height-top-.08;
  return this.factory.spawn(spec.type,vec(spec.x,y,0),rotation,true,options);
 }
}
