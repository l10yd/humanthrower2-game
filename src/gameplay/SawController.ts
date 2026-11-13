import { SawGuard } from './SawGuard';
import { CONFIG, PLAYER_SCALE } from '../core/Config';
import { PhysicsManager, RAPIER } from '../physics/PhysicsManager';
import { CollisionQuery, shapeBounds } from '../player/QueryBounds';
import type { PlayerController } from '../player/PlayerController';
import type { InputFrame } from '../player/Input';
import { prepareSawSplit, severJoint, splitPart, type CutResult } from '../slicing/Dismemberment';
import { add, axisAngle, conjugate, dot, mul, rotate, sub, vec, type Vec3 } from '../slicing/Math';

export interface SawContact {point:Vec3;normal:Vec3;partId:number;progress:number}
export class SawController {
  enabled=false;active=false;facing=1;aim:Vec3|null=null;progress=0;cuts=0;lastCut:CutResult|null=null;
  contact:SawContact|null=null;
  private target='';private cooldown=0;
  private cutPlane:{partId:number;normal:Vec3;point:Vec3;worldPoint:Vec3}|null=null;
  guard:SawGuard;arcadeGuardEnabled=false;
  constructor(private physics:PhysicsManager,private player:PlayerController,enabled=false){this.enabled=enabled;this.guard=new SawGuard(physics,player);}
  toggle(){this.enabled=!this.enabled;this.cancel();}
  private resetProgress(){this.progress=0;this.target='';this.cutPlane=null;this.contact=null;}
  cancel(){this.active=false;this.resetProgress();}
  get cuttingPoint(){return this.cutPlane?.worldPoint??null;}
  pose(){
    const hand=this.player.ragdoll.down&&!this.player.ragdoll.dead?this.player.ragdoll.parts.find(p=>p.limb===`forearm${this.facing}`):null;
    const base=hand?{...hand.body.worldCom()}:add(this.player.current,vec(this.facing*.2*PLAYER_SCALE,.08*PLAYER_SCALE,0));
    const aim=this.player.arcadeEscapeEnabled?this.player.trauma.aim(this.aim,base):this.aim;
    const offset=aim?sub(aim,base):vec(this.facing,0,0);
    const angle=Math.atan2(offset.y,offset.x),direction=vec(Math.cos(angle),Math.sin(angle),0);
    return {base,direction,normal:vec(-direction.y,direction.x,0),tip:add(base,mul(direction,CONFIG.saw.reach)),angle};
  }
  update(input:InputFrame,dt:number):CutResult|null {
    this.lastCut=null;this.guard.cuts=[];this.contact=null;this.cooldown=Math.max(0,this.cooldown-dt);
    if(input.axis)this.facing=Math.sign(input.axis);
    this.active=this.enabled&&!!input.saw;
    if(!this.active){this.resetProgress();return null;}
    const pose=this.pose(),{base,direction,normal}=pose;
    this.guard.cuts=[];
    if(this.arcadeGuardEnabled&&this.guard.update(this.active,pose,dt)){
      this.cuts+=this.guard.cuts.length;this.lastCut=this.guard.cuts[0];this.resetProgress();this.cooldown=CONFIG.saw.cooldown;return null;
    }
    this.physics.world.propagateModifiedBodyPositionsToColliders();
    // Query only the real nearby blade footprint, and reject targets behind
    // solid walls rather than accepting any center inside the nominal reach.
    const center=add(base,mul(direction,CONFIG.saw.reach/2));
    const blade=new RAPIER.Cuboid(CONFIG.saw.reach/2,CONFIG.saw.halfWidth,CONFIG.saw.halfDepth);
    const rotation=axisAngle(vec(0,0,1),pose.angle);
    const query=new CollisionQuery(this.physics,c=>c.isEnabled()&&!c.isSensor()&&this.physics.partForCollider(c)?.owner!=='player'&&c.handle!==this.player.collider.handle);
    const nearby=query.nearby(shapeBounds(blade,center,rotation));
    const ray=new RAPIER.Ray(base,direction);
    let obstruction:number=CONFIG.saw.reach;
    for(const c of nearby)if(!this.physics.partForCollider(c)){const t=c.castRay(ray,CONFIG.saw.reach,true);if(t>=0&&Number.isFinite(t))obstruction=Math.min(obstruction,t);}
    const along=(p:Vec3)=>dot(sub(p,base),direction);
    const inBlade=(p:Vec3)=>along(p)>=.06*PLAYER_SCALE&&along(p)<=obstruction&&Math.abs(dot(sub(p,base),normal))<=.12*PLAYER_SCALE&&Math.abs(p.z-base.z)<=CONFIG.saw.halfDepth;
    let candidate:{key:string;id:number;joint:boolean;point:Vec3;score:number}|null=null;
    // Joints are accessible individually: neck, shoulders, elbows, waist, hips, knees.
    for(const joint of this.physics.joints.values()){
      const a=this.physics.parts.get(joint.a)!,b=this.physics.parts.get(joint.b)!;
      if(a.owner!=='npc'||b.owner!=='npc')continue;
      const pa=add(a.body.translation(),rotate(joint.anchorA,a.body.rotation()));
      const pb=add(b.body.translation(),rotate(joint.anchorB,b.body.rotation())),point=mul(add(pa,pb),.5);
      if(!inBlade(point))continue;
      const score=along(point)-.18*PLAYER_SCALE;
      if(!candidate||score<candidate.score)candidate={key:`j${joint.id}`,id:joint.id,joint:true,point,score};
    }
    for(const c of nearby){
      const part=this.physics.partForCollider(c);if(!part||part.owner!=='npc')continue;
      const contact=part.collider.contactShape(blade,center,rotation,0);if(!contact||contact.distance>0)continue;
      const com={...part.body.worldCom()},t=Math.max(.06*PLAYER_SCALE,Math.min(CONFIG.saw.reach,along(com)));
      if(t>obstruction)continue;
      const point=add(base,mul(direction,t));
      if(!prepareSawSplit(part,point,normal))continue;
      const score=t;if(!candidate||score<candidate.score)candidate={key:`p${part.id}`,id:part.id,joint:false,point,score};
    }
    if(!candidate){this.resetProgress();return null;}
    if(candidate.key!==this.target){this.resetProgress();this.target=candidate.key;}
    if(this.cooldown>0)return null;
    let cutPoint=candidate.point,cutNormal=normal;
    if(!candidate.joint){
      const part=this.physics.parts.get(candidate.id)!,rotation={...part.body.rotation()},inverse=conjugate(rotation);
      const localNormal=rotate(normal,inverse),localPoint=rotate(sub(candidate.point,part.body.translation()),inverse);
      const plane=this.cutPlane;
      // Progress belongs to one body-local cut, not just one part ID. A sharp
      // aim change cannot finish a different plane using an almost-complete timer.
      if(!plane||dot(plane.normal,localNormal)<Math.cos(CONFIG.saw.planeAngleTolerance)||Math.abs(dot(plane.normal,sub(localPoint,plane.point)))>CONFIG.saw.planeOffsetTolerance){
        this.progress=0;this.cutPlane={partId:part.id,normal:localNormal,point:localPoint,worldPoint:candidate.point};
      }
      const locked=this.cutPlane!;
      cutNormal=rotate(locked.normal,rotation);cutPoint=add(part.body.translation(),rotate(locked.point,rotation));locked.worldPoint=cutPoint;
      if(!prepareSawSplit(part,cutPoint,cutNormal)){this.resetProgress();return null;}
    }else this.cutPlane=null;
    this.progress+=dt/CONFIG.saw.cutSeconds;
    this.contact={point:cutPoint,normal:cutNormal,partId:candidate.joint?this.physics.joints.get(candidate.id)!.a:candidate.id,progress:this.progress};
    if(this.progress<1)return null;
    const result=candidate.joint?severJoint(this.physics,candidate.id):splitPart(this.physics,candidate.id,cutPoint,cutNormal);
    this.resetProgress();this.cooldown=CONFIG.saw.cooldown;
    if(result){this.cuts++;this.lastCut=result;}return result;
  }
  get snapshot(){return {enabled:this.enabled,active:this.active,cutting:this.contact!==null,cuts:this.cuts,progress:this.progress,interceptions:this.guard.interceptions,target:this.target};}
}
