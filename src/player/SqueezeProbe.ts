import { CONFIG, PLAYER_SCALE } from '../core/Config';
import { PhysicsManager, RAPIER, type Part } from '../physics/PhysicsManager';
import type { PlayerController } from './PlayerController';
import { recoveryPathClear } from './RecoverySweep';
import { CollisionQuery, nearbyColliders, shapeBounds } from './QueryBounds';
import { vertices } from '../slicing/ConvexClipper';
import { add, identity, rotate, vec, type Vec3 } from '../slicing/Math';
export interface SqueezeSnapshot { trapped:boolean;left:boolean;right:boolean;up:boolean;loaded:boolean;blockers:number[] }
/** Conservative physical test: idle and a blocked get-up are NOT evidence of entrapment. */
export class SqueezeProbe {
  private since:number|null=null;private lastAssist=-Infinity;
  snapshot:SqueezeSnapshot={trapped:false,left:true,right:true,up:true,loaded:false,blockers:[]};
  constructor(private physics:PhysicsManager,private player:PlayerController){}
  private external=(c:RAPIER.Collider)=>c.isEnabled()&&!c.isSensor()&&c.handle!==this.player.collider.handle&&this.physics.partForCollider(c)?.owner!=='player';
  measure(now:number):SqueezeSnapshot {
    const down=this.player.ragdoll.down,parts=this.player.ragdoll.parts;
    const query=new CollisionQuery(this.physics,this.external);
    const sweep=(displacement:Vec3)=>down?parts.every(part=>recoveryPathClear(this.physics,{
      shape:part.collider.shape,from:part.body.translation(),rotation:part.body.rotation(),to:add(part.body.translation(),displacement),
      // Crawl is a pure translation, not a get-up rotation.
      toRotation:part.body.rotation(),
    },this.external,query)):recoveryPathClear(this.physics,{
      shape:this.player.collider.shape,from:this.player.current,rotation:identity,to:add(this.player.current,displacement),
    },this.external,query);
    const left=sweep(vec(-.25,0,0)),right=sweep(vec(.25,0,0)),up=sweep(vec(0,.3,0));
    const blockers=new Set<number>();
    const loadedAt=(shape:RAPIER.Shape,position:Vec3,rotation:ReturnType<RAPIER.RigidBody['rotation']>)=>{
      this.physics.world.collidersWithAabbIntersectingAabb(position,vec(.8*PLAYER_SCALE,.8*PLAYER_SCALE,.7*PLAYER_SCALE),c=>{
        const p=this.physics.partForCollider(c);if(!p||p.owner!=='npc')return true;
        const v={...p.body.linvel()},w={...p.body.angvel()};
        if(!p.body.isSleeping()&&(Math.hypot(v.x,v.y,v.z)>=.25||Math.hypot(w.x,w.y,w.z)>=.5))return true;
        const contact=c.contactShape(shape,position,rotation,.04);
        if(contact&&contact.normal1.y<-.3&&contact.point1.y>=position.y-.1)blockers.add(p.id);
        return true;
      });
    };
    if(down)for(const part of parts)loadedAt(part.collider.shape,part.body.translation(),part.body.rotation());
    else loadedAt(this.player.collider.shape,this.player.current,identity);
    const loaded=blockers.size>0;
    const trapped=loaded&&!left&&!right&&!up&&(!down||this.player.ragdoll.recoveryTarget()===null);
    this.snapshot={trapped,left,right,up,loaded,blockers:[...blockers]};
    if(trapped)this.since??=now;else this.since=null;
    return this.snapshot;
  }
  breathingBlocked():boolean {
    const query=new CollisionQuery(this.physics,this.external);
    const parts=this.player.ragdoll.parts.filter(p=>p.limb==='head'||p.limb==='chest');
    if(!parts.length)return this.snapshot.trapped;
    let covered=0;
    for(const part of parts){
      const position={...part.body.translation()},rotation={...part.body.rotation()};
      const bounds=shapeBounds(part.collider.shape,position,rotation);if(bounds){bounds.max.y+=.08;bounds.min.y-=.08;}
      let loaded=false;
      for(const c of nearbyColliders(this.physics,bounds,this.external,query)){
        const npc=this.physics.partForCollider(c);if(!npc||npc.owner!=='npc')continue;
        const v={...npc.body.linvel()};if(!npc.body.isSleeping()&&Math.hypot(v.x,v.y,v.z)>1)continue;
        const contact=c.contactCollider(part.collider,.06);
        if(contact&&contact.normal1.y<-.25&&contact.point1.y>=position.y-.1){loaded=true;break;}
      }
      if(loaded)covered++;
    }
    return this.snapshot.trapped||covered===2;
  }
  pressureSeconds(now:number){return this.since===null?0:Math.max(0,now-this.since);}
  /** At most 12 Ns every three seconds; horizontal only, no forced displacement/get-up. */
  assist(now:number):boolean {
    if(this.pressureSeconds(now)<1.5||now-this.lastAssist<3)return false;
    const blockers=this.snapshot.blockers.map(id=>this.physics.parts.get(id)).filter((p):p is Part=>!!p).slice(0,3);
    if(!blockers.length)return false;
    const impulse=12/blockers.length;
    for(const p of blockers){
      const points=vertices(p.poly).map(v=>add(p.body.translation(),rotate(v,p.body.rotation())));
      const min=Math.min(...points.map(v=>v.x)),max=Math.max(...points.map(v=>v.x));
      const direction=p.body.translation().x<this.player.current.x?-1:1;
      if(direction<0&&min<=-CONFIG.arena.width/2+.04||direction>0&&max>=CONFIG.arena.width/2-.04)continue;
      p.body.applyImpulse(vec(direction*impulse,0,0),true);
    }
    this.lastAssist=now;return true;
  }
}
