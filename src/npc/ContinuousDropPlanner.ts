import { CONFIG } from '../core/Config';
import { RAPIER, type PhysicsManager } from '../physics/PhysicsManager';
import { RagdollFactory,type RagdollOptions } from '../physics/RagdollFactory';
import { axisAngle, vec } from '../slicing/Math';
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
  // Materialize wholly above the masked top. Overlap waits in the same column,
  // without allocating stacked invisible bodies or teleporting through a roof.
  const rotation=axisAngle(vec(0,0,1),spec.angle),y=this.factory.entryHeight(spec.type,rotation,options);
  const parts=this.factory.spawn(spec.type,vec(spec.x,y,0),rotation,true,{...options,velocity:options.velocity??vec(0,-CONFIG.entry.fallSpeed,0)});
  if(parts)this.physics.registerIncoming(parts);
  return parts;
 }
}
