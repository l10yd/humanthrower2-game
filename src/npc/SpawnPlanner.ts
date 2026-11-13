import { CONFIG, PLAYER_SCALE, type NpcType } from '../core/Config';
import { vertices } from '../slicing/ConvexClipper';
import { PhysicsManager, RAPIER } from '../physics/PhysicsManager';
import { RagdollFactory } from '../physics/RagdollFactory';
import { CollisionQuery, nearbyColliders, shapeBounds } from '../player/QueryBounds';
import { recoveryPathClear } from '../player/RecoverySweep';
import { axisAngle, identity, rotate, vec, type Vec3 } from '../slicing/Math';
import type {DropForm} from './LivingNpcs';
export interface DropPlan { x:number;type:NpcType;angle:number;fireAt:number;form?:DropForm;living?:boolean;motionSeed?:number }
/** Bounded event planning. No world changes, retries or queued catch-up spawns here. */
export type SpawnBlockReason='budget'|'envelope'|'route'|'overlap'|'pendingColumns'|'reserve';
export class SpawnPlanner {
  lastBlock:SpawnBlockReason|null=null;
  blocked:Record<SpawnBlockReason,number>={budget:0,envelope:0,route:0,overlap:0,pendingColumns:0,reserve:0};
  private reject(reason:SpawnBlockReason):null{this.lastBlock=reason;this.blocked[reason]++;return null;}
  private recent:number[]=[];
  constructor(private physics:PhysicsManager,private factory:RagdollFactory,private random:()=>number){}
  budgetAvailable():boolean {
    const parts=[...this.physics.parts.values()].filter(p=>p.owner==='npc');
    const awake=new Set(parts.filter(p=>!p.body.isSleeping()).map(p=>p.npcId));
    return parts.length+11<=CONFIG.physics.spawnReserve&&awake.size<CONFIG.physics.movingLimit;
  }
  plan(type:NpcType,angle:number,player:Vec3,now:number,delay:number,level:number,excluded:number[]=[]):DropPlan|null {
    this.lastBlock=null;
    if(!this.budgetAvailable())return this.reject('budget');
    const rotation=axisAngle(vec(0,0,1),angle),height=this.factory.entryHeight(type,rotation);
    const plan=this.factory.build(type,vec(0,height,0),rotation);
    const offsets=plan.parts.flatMap(p=>vertices(p.poly).map(v=>p.position.x+rotate(v,rotation).x));
    const minX=Math.min(...offsets),maxX=Math.max(...offsets);
    const candidates=Array.from({length:CONFIG.rows.columns},(_,i)=>i-(CONFIG.rows.columns-1)/2)
      .filter(x=>x+minX>=-CONFIG.arena.width/2+.005&&x+maxX<=CONFIG.arena.width/2-.005);
    if(!candidates.length)return this.reject('envelope');
    // Fisher-Yates with seeded source, then stable preference for unused columns.
    for(let i=candidates.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
    candidates.sort((a,b)=>Number(this.recent.includes(a))-Number(this.recent.includes(b)));
    const freeRoutes=this.safeRoutes(player);
    if(!freeRoutes.length)return this.reject('route');
    const eligible=candidates.filter(x=>this.factory.canSpawn(type,vec(x,height,0),rotation));
    if(!eligible.length)return this.reject('overlap');
    const safe=level<=2?eligible.filter(x=>Math.abs(x-player.x)>=1.3):eligible;
    const pool=(safe.length?safe:eligible).filter(x=>excluded.every(other=>Math.abs(x-other)>=2));
    if(!pool.length)return this.reject('pendingColumns');
    const x=pool.find(x=>freeRoutes.some(route=>x+maxX<route.x-.65||x+minX>route.x+.65));
    if(x===undefined)return this.reject('reserve');
    this.recent.push(x);if(this.recent.length>3)this.recent.shift();
    return {x,type,angle,fireAt:now+delay};
  }
  private safeRoutes(player:Vec3):Vec3[] {
    const routes:Vec3[]=[];
    const external=(c:RAPIER.Collider)=>c.isEnabled()&&!c.isSensor()&&this.physics.partForCollider(c)?.owner!=='player'&&c.parent()?.isKinematic()!==true;
    const capsule=new RAPIER.Capsule(CONFIG.player.halfHeight,CONFIG.player.radius),reserve=new RAPIER.Cuboid(CONFIG.player.radius+.17,.8*PLAYER_SCALE,.25*PLAYER_SCALE);
    const query=new CollisionQuery(this.physics,external);
    const down=[...this.physics.parts.values()].filter(p=>p.owner==='player');
    const sweep=(from:Vec3,to:Vec3)=>down.length?down.every(part=>{
      const position={...part.body.translation()},displacement=vec(to.x-from.x,to.y-from.y,0),rotation={...part.body.rotation()};
      return recoveryPathClear(this.physics,{shape:part.collider.shape,from:position,rotation,to:vec(position.x+displacement.x,position.y+displacement.y,position.z),toRotation:rotation},external,query);
    }):recoveryPathClear(this.physics,{shape:capsule,from,rotation:identity,to},external,query);
    for(const dx of [-1.3,1.3,0,-2,2]) {
      const x=player.x+dx;if(Math.abs(x)>CONFIG.arena.width/2-.65)continue;
      // Find the terrain surface from above the highest allowed jump, not from the
      // player's waist (which used to miss a perfectly reachable raised support).
      const ray=new RAPIER.Ray(vec(x,player.y+1.05*PLAYER_SCALE,0),vec(0,-1,0));
      const support=this.physics.world.castRayAndGetNormal(ray,2.35*PLAYER_SCALE,true,undefined,undefined,undefined,undefined,external);
      if(!support||support.normal.y<.66)continue;
      const groundY=ray.origin.y-support.timeOfImpact,center=vec(x,groundY+.815*PLAYER_SCALE,0);
      const landing=vec(x,groundY+CONFIG.player.halfHeight+CONFIG.player.radius+.015,0);
      if(landing.y-player.y>1.05*PLAYER_SCALE)continue;
      let free=true;
      for(const c of nearbyColliders(this.physics,shapeBounds(reserve,center,identity),external,query)){
        const contact=c.contactShape(reserve,center,identity,0);if(contact&&contact.distance<-.002){free=false;break;}
      }
      if(!free)continue;
      // Do not classify a supporting floor's tiny existing penetration as a blocked
      // horizontal route. Try the actual capsule path, then bounded autostep/jump arcs.
      let reachable=down.length?sweep(player,vec(x,player.y,0)):sweep(player,landing);
      for(const rise of [.18*PLAYER_SCALE,1.05*PLAYER_SCALE])if(!reachable&&!down.length){
        const high=vec(player.x,Math.max(player.y,landing.y)+rise,0),across=vec(x,high.y,0);
        if(high.y-player.y>1.05*PLAYER_SCALE+.002)continue;
        reachable=sweep(player,high)&&sweep(high,across)&&sweep(across,landing);
      }
      if(reachable)routes.push(center);
    }return routes;
  }
}
