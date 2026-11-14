import { CONFIG, PLAYER_SCALE } from '../core/Config';
import { HeadTrauma } from './HeadTrauma';
import { openRecoverySpace } from './RecoveryAssist';
import { landingShares,supportImpulseCapacity } from './SupportPressure';
import { legPose, type LegGeometry } from './LegPose';
import { EscapeQte } from './EscapeQte';
import { RAPIER, PhysicsManager, type Part } from '../physics/PhysicsManager';
import { type BodyPart } from './PlayerDamage';
import { pointVelocity,add,length,sub,vec } from '../slicing/Math';
import { PlayerRagdoll, type Impact } from './PlayerRagdoll';
import type { InputFrame } from './Input';
export class JumpTimeline {
  bufferUntil=-Infinity;lastGrounded=-Infinity;vy=0;
  update(input:InputFrame,now:number,grounded:boolean) {
    if(input.pressed)this.bufferUntil=now+CONFIG.player.buffer;
    if(grounded)this.lastGrounded=now;
    let jumped=false;
    if(now<=this.bufferUntil&&(grounded||now-this.lastGrounded<=CONFIG.player.coyote)) {
      this.vy=CONFIG.player.jumpSpeed;this.bufferUntil=-Infinity;this.lastGrounded=-Infinity;jumped=true;
    }
    if(input.released&&this.vy>0)this.vy*=.45;return jumped;
  }
}
export class PlayerController {
  trauma=new HeadTrauma();
  flight=false;simulationTime=0;private nextRecoveryImpact=0;
  qte=new EscapeQte();protectedUntil=-Infinity;recoverySpaceUntil=-Infinity;recoverySpaceImpulse=0;
  body:RAPIER.RigidBody;collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController;
  ragdoll:PlayerRagdoll;underPressure=false;
  jump=new JumpTimeline();grounded=false;vx=0;lastLanding=-Infinity;private supportVelocity=vec();previous=vec(0,CONFIG.player.height/2+.015,0);current={...this.previous};
  constructor(private physics:PhysicsManager,public arcadeEscapeEnabled=false,headControlFaults=false) {
    this.trauma.configure(headControlFaults);
    this.ragdoll=new PlayerRagdoll(physics);this.ragdoll.arcadeRecoveryRequired=arcadeEscapeEnabled;
    this.body=physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(this.current.x,this.current.y,0));
    this.collider=physics.world.createCollider(RAPIER.ColliderDesc.capsule(CONFIG.player.halfHeight,CONFIG.player.radius),this.body);
    this.controller=physics.world.createCharacterController(.01);this.controller.setApplyImpulsesToDynamicBodies(false);
    this.controller.enableAutostep(.18*PLAYER_SCALE,.12*PLAYER_SCALE,true);this.controller.setMaxSlopeClimbAngle(48*Math.PI/180);
    this.controller.setMinSlopeSlideAngle(48*Math.PI/180);this.controller.enableSnapToGround(.08*PLAYER_SCALE);
  }
  private pressure():boolean {
    const probe=vec(this.current.x,this.current.y+.18*PLAYER_SCALE,0);let pressure=false;
    this.physics.world.collidersWithAabbIntersectingAabb(probe,vec(.32*PLAYER_SCALE,.48*PLAYER_SCALE,.32*PLAYER_SCALE),collider=>{
      const p=this.physics.partForCollider(collider);if(!p||p.owner!=='npc')return true;
      const contact=collider.contactShape(new RAPIER.Capsule(.25*PLAYER_SCALE,.23*PLAYER_SCALE),probe,{x:0,y:0,z:0,w:1},.02);
      if(contact&&contact.normal1.y<-.3)pressure=true;return true;
    });return pressure;
  }
  lastImpact:Impact|null=null;
  controls(input:InputFrame,now:number){
    if(this.arcadeEscapeEnabled){this.trauma.update(now,this.damage.parts.head);return this.trauma.input(input);}return input;
  }
  update(input:InputFrame,now:number,dt:number) {
    this.simulationTime=now;this.lastImpact=null;this.recoverySpaceImpulse=0;
    this.previous={...this.current};
    if(!this.ragdoll.down&&now<this.recoverySpaceUntil)this.recoverySpaceImpulse=openRecoverySpace(this.physics,[{body:this.body,collider:this.collider}],input.axis,dt).impulse;
    // Saw grace means normal upright control, not a brief pressure/QTE episode.
    // A player already down must still be able to finish the real get-up QTE.
    const protectedStanding=!this.ragdoll.down&&now<this.protectedUntil;
    const pressure=!this.ragdoll.down&&!protectedStanding&&this.pressure();
    if(this.arcadeEscapeEnabled){
      if(this.ragdoll.down&&this.qte.phase==='STANDING')this.qte.reset();
      const landed=this.ragdoll.refreshRecoveryContact();
      const needsHelp=this.ragdoll.down&&(landed||this.qte.ready)&&!this.ragdoll.dead&&(this.damage.mobility!=='CRAWL'||!this.ragdoll.locomotionReady);
      if(needsHelp)this.ragdoll.refreshLoad(now);
      this.qte.update(input,needsHelp,dt,this.ragdoll.gameplayLoadMass,now);
      // complete() keeps 100% for the standing result; only an ongoing
      // recovery may renew immunity, otherwise the post-rise grace never ends.
      if(this.ragdoll.down&&this.qte.active&&this.qte.ready)this.protectedUntil=Math.max(this.protectedUntil,now+CONFIG.dt*2);
      this.ragdoll.qteProgress=this.qte.effort;
    }
    if(this.arcadeEscapeEnabled&&this.trauma.takeTrip()&&!this.ragdoll.down&&now>=this.protectedUntil&&this.grounded){
      this.collider.setEnabled(false);this.ragdoll.knockDown(this.current,vec(this.vx*.3,-.3,0),now);this.grounded=false;this.jump=new JumpTimeline();
    }
    if(this.ragdoll.down){
      this.lastImpact=now>=this.protectedUntil?this.ragdoll.findDownImpact(dt):null;
      if(this.lastImpact?.limb==='head'&&this.damage.headImmune)this.lastImpact=null;
      if(this.lastImpact&&this.lastImpact.part.body.mass()>=CONFIG.escapeQte.minImpactMass&&now>=this.nextRecoveryImpact&&this.qte.effort>0){
        this.qte.interrupt(this.lastImpact.part.body.mass(),this.lastImpact.speed,now);this.ragdoll.interruptRise(this.qte.effort,now);this.nextRecoveryImpact=now+CONFIG.escapeQte.impactCooldown;
      }
      this.ragdoll.update(input,now,dt);if(this.qte.active&&this.ragdoll.blocked)this.qte.blocked();return;
    }
    this.ragdoll.update(input,now,dt);
    let impact=now>=this.protectedUntil?this.ragdoll.findImpact(this.collider,vec(this.vx,this.jump.vy,0),dt):null;
    if(impact){
      const point=impact.point;
      const nearest=this.ragdoll.visualParts.reduce((best,p)=>length(sub(add(this.current,p.position),point))<length(sub(add(this.current,best.position),point))?p:best);
      impact.limb=nearest.name as BodyPart;
      if(impact.limb==='head'&&this.damage.headImmune)impact=null;
    }
    if(impact&&(!this.arcadeEscapeEnabled||impact.part.body.mass()>=CONFIG.escapeQte.minImpactMass)){
      this.lastImpact=impact;
      this.collider.setEnabled(false);
      this.ragdoll.knockDown({...this.body.translation()},vec(this.vx,this.jump.vy,0),now);
      this.grounded=false;this.jump=new JumpTimeline();this.supportVelocity=vec();return;
    }else if(impact)this.lastImpact=impact;
    const wasGrounded=this.grounded;
    this.underPressure=pressure;
    // Arcade: allow a jump attempt under load; the capsule sweep still blocks
    // solid ceilings, rather than silently discarding the player's input.
    const jumped=this.jump.update(input,now,this.grounded);
    if(jumped)this.jump.vy*=this.damage.jumpFactor;
    const speed=(this.underPressure?CONFIG.player.pressureSpeed:this.ragdoll.slow?CONFIG.player.recoverSpeed:CONFIG.player.speed)*this.damage.speedFactor;
    const target=input.axis*speed,rate=this.grounded?(input.axis?CONFIG.player.acceleration:CONFIG.player.brake):CONFIG.player.airAcceleration;
    this.vx+=Math.max(-rate*dt,Math.min(rate*dt,target-this.vx));
    const isStomp=input.stomp&&this.jump.vy<0;
    if(this.flight){this.jump.vy+=Math.max(-60*dt,Math.min(60*dt,4.4-this.jump.vy));}
    else this.jump.vy=Math.max(isStomp?-26:-24,this.jump.vy-(isStomp?56:CONFIG.player.gravity)*dt);
    if(jumped||this.jump.vy>0)this.controller.disableSnapToGround();else this.controller.enableSnapToGround(.08*PLAYER_SCALE);
    const pos=this.body.translation();
    const carry=this.grounded&&!jumped?this.supportVelocity:vec();
    // During saw grace a jump can push the cut dynamic bodies out of the way.
    // Keep the actual sweep/wall contacts; do not ghost through ceilings or debris.
    this.controller.setCharacterMass(CONFIG.player.mass);
    this.controller.setApplyImpulsesToDynamicBodies(protectedStanding&&this.jump.vy>0);
    this.controller.computeColliderMovement(this.collider,vec((this.vx+carry.x)*dt,(this.jump.vy+carry.y)*dt,-pos.z));
    const movement=this.controller.computedMovement();this.grounded=this.controller.computedGrounded()&&this.jump.vy<=0;
    const supports=new Map<number,{part:Part;weight:number;point:ReturnType<typeof vec>}>();
    let horizontalBudget=160*dt;
    for(let i=0;i<this.controller.numComputedCollisions();i++) {
      const hit=this.controller.computedCollision(i);if(!hit?.collider)continue;const part=this.physics.partForCollider(hit.collider);
      if(part&&hit.normal1.y>.66&&this.jump.vy<=0){part.body.wakeUp();supports.set(part.id,{part,weight:hit.normal1.y,point:hit.witness1});}
      else if(part&&Math.abs(hit.normal1.x)>.5&&input.axis&&horizontalBudget>0){
        const vx=part.body.linvel().x,remaining=Math.max(0,4-input.axis*vx);
        const impulse=Math.min(8,horizontalBudget,remaining*part.body.mass());
        part.body.applyImpulse(vec(input.axis*impulse,0,0),true);horizontalBudget-=impulse;
      }
    }
    // Rapier snap-to-ground may report grounded without a computed collision. Probe the
    // actual capsule below its swept destination so a sleeping dynamic support still
    // receives weight/landing pressure; never treat a nearby side body as ground.
    if(this.grounded&&supports.size===0) {
      const probe=vec(pos.x+movement.x,pos.y+movement.y-.04*PLAYER_SCALE,0);
      this.physics.world.intersectionsWithShape(probe,this.body.rotation(),this.collider.shape,c=>{
        const part=this.physics.partForCollider(c);if(!part||part.owner!=='npc')return true;
        const contact=c.contactShape(this.collider.shape,probe,this.body.rotation(),.02);
        if(contact&&contact.normal1.y>.66)supports.set(part.id,{part,weight:contact.normal1.y,point:contact.point1});
        return true;
      });
      for(const {part}of supports.values())part.body.wakeUp();
    }
    const supportList=[...supports.values()].slice(0,CONFIG.playerContact.maxSupports),weight=supportList.reduce((s,p)=>s+p.weight,0)||1;
    const pointVelocities=supportList.map(s=>pointVelocity(s.part.body.linvel(),s.part.body.angvel(),s.point,s.part.body.worldCom()));
    this.supportVelocity=vec();
    for(const [i,support] of supportList.entries()) {
      const v=pointVelocities[i];
      const speed=Math.hypot(v.x,v.y,v.z),factor=Math.min(1,2/(speed||1))*support.weight/weight;
      this.supportVelocity.x+=v.x*factor;this.supportVelocity.y+=v.y*factor;
    }
    const landing=this.grounded&&!wasGrounded&&now-this.lastLanding>=CONFIG.playerContact.landingCooldown;
    const impulses=landing?landingShares(supportList.map((s,i)=>({weight:s.weight,velocityY:pointVelocities[i].y})),this.jump.vy+carry.y,CONFIG.player.mass,isStomp):supportList.map(()=>0);
    for(const [i,support] of supportList.entries()) {
      const share=support.weight/weight,requestedWeight=Math.min(CONFIG.playerContact.weightImpulse,CONFIG.player.mass*9.81*dt)*share;
      const capacity=supportImpulseCapacity(support.part);
      const weightImpulse=Math.min(requestedWeight,capacity),landingImpulse=Math.min(impulses[i],Math.max(0,capacity-weightImpulse));
      support.part.body.applyImpulse(vec(0,-weightImpulse,0),true);
      if(landingImpulse>0)support.part.body.applyImpulse(vec(0,-landingImpulse,0),true);
    }
    if(this.grounded&&!wasGrounded)this.lastLanding=now;
    if(this.grounded)this.jump.vy=0;
    this.current=vec(pos.x+movement.x,pos.y+movement.y,0);this.body.setNextKinematicTranslation(this.current);
  }
  knockDownFromAttack(mass:number,speed:number,now:number){
    if(mass<CONFIG.escapeQte.minImpactMass||now<this.protectedUntil||this.qte.ready&&this.ragdoll.down||now<this.nextRecoveryImpact||this.ragdoll.dead)return;
    if(!this.ragdoll.down){this.collider.setEnabled(false);this.ragdoll.knockDown(this.current,vec(this.vx,-Math.min(6,speed),0),now);this.grounded=false;}
    this.qte.interrupt(mass,speed,now);this.ragdoll.interruptRise(this.qte.effort,now);this.nextRecoveryImpact=now+CONFIG.escapeQte.impactCooldown;
  }
  private wonCutDeadline:number|null=null;
  resumeAfterCut(now:number){
    const wonDeadline=this.wonCutDeadline;this.wonCutDeadline=null;
    this.ragdoll.syncDamage();
    const preserveWin=wonDeadline!==null&&this.damage.alive;
    if(preserveWin){this.qte.active=true;this.qte.effort=this.qte.progress=1;this.qte.phase='RISING';this.ragdoll.continueWonRecovery(wonDeadline-now);}
    else this.qte.reset();
    const injured=this.damage.injured;
    this.ragdoll.qteProgress=preserveWin||injured?1:0;
    this.protectedUntil=now+CONFIG.escapeQte.protection;
    const resumed=this.damage.alive;if(resumed)this.ragdoll.state=this.damage.mobility==='CRAWL'?'CRAWLING':'GETTING_UP';
    return resumed;
  }
  prepareRowDeath(now:number){
    this.wonCutDeadline=this.qte.ready&&this.ragdoll.down?this.ragdoll.recoveryDeadline??now+CONFIG.forcedRecovery.duration:null;
    this.collider.setEnabled(false);this.qte.reset();this.ragdoll.prepareDeath(this.current,vec(this.vx,this.jump.vy,0),now);
  }
  afterStep(now:number) {
    if(!this.ragdoll.down)return;
    this.current=this.ragdoll.center;
    if(this.damage.mobility==='CRAWL'&&this.ragdoll.locomotionReady&&this.qte.active&&this.qte.effort>=1){
      this.qte.complete(now);this.protectedUntil=Math.max(this.protectedUntil,now+CONFIG.escapeQte.protection);
    }
    const target=this.ragdoll.afterStep(now);if(!target)return;
    // The won QTE has already straightened the same bodies and cleared debris;
    // ordinary recovery still requires the existing collision-safe alignment.
    const assisted=this.qte.effort>=1;
    if(assisted){if(this.qte.active)this.qte.complete(now);this.protectedUntil=now+CONFIG.forcedRecovery.protection;this.recoverySpaceUntil=now+CONFIG.forcedRecovery.protection;}
    else this.qte.reset();
    this.ragdoll.finishRecovery(now);if(this.arcadeEscapeEnabled||assisted)this.ragdoll.state='ACTIVE';
    const geometry=this.ragdoll.standingGeometry();this.collider.setShape(geometry.shape);this.collider.setTranslationWrtParent(vec(0,geometry.offset,0));
    this.body.setTranslation(target.center,true);this.body.setNextKinematicTranslation(target.center);
    this.collider.setEnabled(true);this.physics.world.propagateModifiedBodyPositionsToColliders();
    this.current={...target.center};this.previous={...target.center};this.underPressure=false;this.vx=0;const bufferUntil=this.jump.bufferUntil;this.jump=new JumpTimeline();this.jump.bufferUntil=bufferUntil;this.grounded=true;this.supportVelocity=vec();
  }
  footPose(side:number,stride:number){
    const sy=CONFIG.player.height/1.765,shin=this.ragdoll.standingParts.find(p=>p.name===`shin${side}`)!,thigh=this.ragdoll.standingParts.find(p=>p.name===`thigh${side}`)!;
    const part=this.damage.has(shin.name)?shin:thigh;
    const bottom=Math.min(...part.poly.faces.flatMap(f=>f.vertices.map(v=>v.y)))+part.position.y;
    const geometry:LegGeometry={upper:.425*sy,lower:this.damage.has(shin.name)?Math.max(.06,(-.36-.0225)*sy-bottom):.06,bottom};
    return legPose(this.physics,this.current,side,stride,this.grounded,geometry);
  }
  get damage(){return this.ragdoll.damage;}
  get state(){return this.ragdoll.state;}
  dispose(){this.ragdoll.dispose();this.physics.world.removeCharacterController(this.controller);this.physics.world.removeRigidBody(this.body);}
}
