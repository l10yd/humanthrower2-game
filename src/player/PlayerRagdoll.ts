import { CONFIG, PLAYER_SCALE } from '../core/Config';
import { PhysicsManager, RAPIER, type Part } from '../physics/PhysicsManager';
import { PlayerDamage } from './PlayerDamage';
import { massProperties, type ConvexPolyhedron } from '../slicing/ConvexClipper';
import { slerp,multiply } from '../slicing/Quaternion';
import { RagdollFactory } from '../physics/RagdollFactory';
import { add, conjugate, identity, length, mul, normalize, pointVelocity, rotate, sub, vec, type Vec3 } from '../slicing/Math';
import { ejectRecoveryDebris,uprightVolume } from './ForcedRecovery';
import { openRecoverySpace,recoveryEscapeAxis } from './RecoveryAssist';
import { loadEffort, pileLoads } from './PileLoad';
import { recoveryPathClear } from './RecoverySweep';
import { CollisionQuery, nearbyColliders, shapeBounds } from './QueryBounds';
import type { InputFrame } from './Input';
export type PlayerState='ACTIVE'|'RAGDOLL'|'CRAWLING'|'GETTING_UP'|'RECOVERING';
export interface Impact { part:Part; velocity:Vec3; point:Vec3; speed:number;limb?:keyof PlayerDamage['parts'] }
export interface RecoveryTarget { center:Vec3; root:Vec3; parts:ReturnType<RagdollFactory['build']>['parts'] }
/** Dynamic lifecycle; a won arcade QTE explicitly drives the same articulation
 * through a one-second kinematic straightening reward before the KCC handoff. */
export class PlayerRagdoll {
  locomotionReady=false;private fullPoseSince=-Infinity;
  recoveryContact=false;effortPulse=0;
  damage=new PlayerDamage();qteProgress=0;poseProgress=0;
  private riseOrigin=new Map<number,{position:Vec3;rotation:ReturnType<Part['body']['rotation']>}>();
  private forcedStarted=-Infinity;private forcedDuration:number=CONFIG.forcedRecovery.duration;private forcedTarget:RecoveryTarget|null=null;
  get recoveryDeadline(){return this.forcedTarget?this.forcedStarted+this.forcedDuration:null;}
  continueWonRecovery(remaining:number){this.forcedDuration=Math.max(CONFIG.dt,remaining);}
  private forcedOrigin=new Map<number,{position:Vec3;rotation:ReturnType<Part['body']['rotation']>}>();
  private assistedRoot:Vec3|null=null;private lastEscapeAxis=1;
  dead=false;
  state:PlayerState='ACTIVE';parts:Part[]=[];knockdowns=0;blocked=false;
  target:RecoveryTarget|null=null;escapeAxis=0;spaceImpulse=0;struggle=0;queryMs=0;loadMass=0;gameplayLoadMass=0;pressRate=0;requiredPressRate=2;mobility=1;
  private presses:number[]=[];private nextLoad=0;
  private hitAt=-Infinity;private clearSince=-Infinity;private crawlPhase=0;
  private playerJoints:ReturnType<PhysicsManager['createJoint']>[]=[];private motorMode='';
  private riseStarted=-Infinity;private recoveryUntil=0;private alignedSince=-Infinity;
  private factory:RagdollFactory;
  constructor(private physics:PhysicsManager){this.factory=new RagdollFactory(physics);}
  get down(){return this.parts.length>0;}
  get slow(){return this.state==='RECOVERING';}
  private options={height:CONFIG.player.height,width:CONFIG.player.ragdollWidth,mass:CONFIG.player.mass,owner:'player' as const};
  private recoveryShapes=new Map<string,RAPIER.Shape>();
  private visualPlan:ReturnType<RagdollFactory['build']>['parts']|null=null;
  get visualParts(){return this.visualPlan??=this.factory.build('normal',this.rootFromCenter(vec()),identity,this.options).parts;}
  private retainedPolys=new Map<string,ConvexPolyhedron>();
  get standingParts(){return this.visualParts.map(p=>({...p,poly:this.retainedPolys.get(p.name)??p.poly}));}
  /** Capsule and visuals share the retained feet/stumps, without restoring cut tissue. */
  standingGeometry(){
    let bottom=-CONFIG.player.height/2;
    if(this.damage.injured){
      bottom=Infinity;
      for(const p of this.standingParts)if(this.damage.has(p.name))for(const f of p.poly.faces)for(const v of f.vertices)bottom=Math.min(bottom,p.position.y+v.y);
    }
    const top=CONFIG.player.height/2,offset=(top+bottom)/2;
    return {bottom,offset,shape:new RAPIER.Capsule(Math.max(0,(top-bottom)/2-CONFIG.player.radius),CONFIG.player.radius)};
  }
  private shapeFor(limb:string):RAPIER.Shape {
    const retained=this.retainedPolys.get(limb);
    if(retained)return new RAPIER.ConvexPolyhedron(new Float32Array(retained.faces.flatMap(f=>f.vertices.flatMap(v=>[v.x,v.y,v.z]))));
    if(!this.recoveryShapes.size)for(const p of this.factory.build('normal',vec(),identity,this.options).parts)
      this.recoveryShapes.set(p.name,p.queryShape);
    return this.recoveryShapes.get(limb)!;
  }
  rootFromCenter(center:Vec3):Vec3 {return add(center,vec(0,-.0225*CONFIG.player.height/1.765,0));}
  findImpact(capsule:RAPIER.Collider,playerVelocity:Vec3,dt:number):Impact|null {
    let impact:Impact|null=null;
    // Query exact shapes with both relative velocities, before the kinematic capsule can
    // absorb the collision. Angular point velocity refines the closing-speed threshold.
    const center=capsule.translation();
    this.physics.world.collidersWithAabbIntersectingAabb(add(center,vec(0,.35*PLAYER_SCALE,0)),vec(.8*PLAYER_SCALE,1.1*PLAYER_SCALE,.7*PLAYER_SCALE),other=>{
      const part=this.physics.partForCollider(other);if(!part||part.owner!=='npc')return true;
      const contact=other.contactCollider(capsule,.025);
      const cast=contact?null:other.castCollider(part.body.linvel(),capsule,playerVelocity,.015,dt,true);
      if(!contact&&!cast)return true;
      const point=contact?.point1??add(other.translation(),rotate(cast!.witness1,other.rotation()));
      const normal=contact?.normal1??rotate(cast!.normal1,other.rotation());
      const velocity=pointVelocity(part.body.linvel(),part.body.angvel(),point,part.body.worldCom());
      const speed=playerVelocity.y-velocity.y;
      if(velocity.y<-1&&normal.y<-.3&&point.y>center.y-.05*PLAYER_SCALE&&speed>=CONFIG.player.impactSpeed&&(!impact||speed>impact.speed))impact={part,velocity,point,speed};
      return true;
    });return impact;
  }
  findDownImpact(dt:number):Impact|null {
    if(!this.down)return null;
    let best:Impact|null=null;
    for(const part of this.parts){
      const found=this.findImpact(part.collider,{...part.body.linvel()},dt);
      if(found)found.limb=part.limb as keyof PlayerDamage['parts'];
      if(found&&(!best||found.speed>best.speed))best=found;
    }return best;
  }
  knockDown(center:Vec3,velocity:Vec3,now:number):void {
    if(this.down)return;
    const parts=this.factory.spawn('normal',this.rootFromCenter(center),identity,false,{...this.options,velocity,retainedPolys:this.retainedPolys,missingLimbs:Object.keys(this.damage.parts).filter(l=>!this.damage.has(l))});
    if(!parts)throw Error('Failed to build player ragdoll');
    this.forcedDuration=CONFIG.forcedRecovery.duration;
    this.parts=parts;this.lastEscapeAxis=-Math.sign(center.x)||1;this.locomotionReady=false;this.fullPoseSince=-Infinity;this.riseOrigin.clear();this.assistedRoot=null;this.qteProgress=0;this.poseProgress=0;this.hitAt=now;this.clearSince=-Infinity;this.alignedSince=-Infinity;this.struggle=0;this.pressRate=0;this.loadMass=0;this.gameplayLoadMass=0;this.nextLoad=now;this.presses=[];this.crawlPhase=0;this.motorMode='';
    const ids=new Set(parts.map(p=>p.id));this.playerJoints=[...this.physics.joints.values()].filter(j=>ids.has(j.a)&&ids.has(j.b));
    this.state='RAGDOLL';this.knockdowns++;this.target=null;this.blocked=false;
    // Keep the pelvis on the gameplay depth plane; limbs remain 3D dynamic.
    this.pelvis.body.setEnabledTranslations(true,true,false,true);
    for(const p of parts){p.body.setAngularDamping(3.5);p.collider.setFriction(.2);p.collider.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);}
  }
  get pelvis():Part{return this.parts.find(p=>p.limb==='pelvis')??this.parts.find(p=>p.limb==='chest')??this.parts[0];}
  get center():Vec3 {return this.down?{...this.pelvis.body.translation()}:vec();}
  refreshRecoveryContact(){this.recoveryContact=this.down&&this.supported();return this.recoveryContact;}
  interruptRise(progress:number,now:number){this.qteProgress=progress;this.poseProgress=Math.min(this.poseProgress,progress);this.target=null;this.assistedRoot=null;this.riseOrigin.clear();this.locomotionReady=false;this.fullPoseSince=-Infinity;this.state='RAGDOLL';this.hitAt=now;this.poseMotors(false);}
  private external=(collider:RAPIER.Collider)=>collider.isEnabled()&&!collider.isSensor()&&this.physics.partForCollider(collider)?.owner!=='player';
  private query:CollisionQuery|undefined;
  private free(shape:RAPIER.Shape,position:Vec3,staticOnly=false,query?:CollisionQuery):boolean {
    let free=true;
    const external=staticOnly?(c:RAPIER.Collider)=>this.external(c)&&!c.parent()?.isDynamic():this.external;
    // Direct contact queries deliberately avoid stale broad-phase caches after structural edits.
    for(const c of nearbyColliders(this.physics,shapeBounds(shape,position,identity),external,query??(staticOnly?undefined:this.query))){
      const contact=c.contactShape(shape,position,identity,0);
      if(contact&&contact.distance<-.002){free=false;break;}
    }return free;
  }
  recoveryTarget(staticOnly=false):RecoveryTarget|null {
    if(!this.down||this.damage.mobility==='CRAWL')return null;
    const external=staticOnly?(c:RAPIER.Collider)=>this.external(c)&&!c.parent()?.isDynamic():this.external;
    const query=!staticOnly&&this.query?this.query:new CollisionQuery(this.physics,external);
    const pelvis=this.pelvis.body.translation(),geometry=this.standingGeometry();
    // Sample both feet as well as the root. A body crossing just one foot must
    // become a real support or be avoided, not trap the rise servo forever.
    const offsets=(this.qteProgress>=1?[0,-.16,.16,-.32,.32,-.55,.55,-.8,.8,-1.1,1.1,-1.5,1.5,-2,2]:this.qteProgress>0?[0,-.16,.16,-.32,.32,-.55,.55]:[0]).filter(dx=>Math.abs(dx)<=CONFIG.recoveryAssist.searchRadius);
    for(const dx of offsets){
      const x=Math.max(-CONFIG.arena.width/2+CONFIG.player.radius+.025,Math.min(CONFIG.arena.width/2-CONFIG.player.radius-.025,pelvis.x+dx));
      let groundY=-Infinity;
      for(const foot of [0,-.115*CONFIG.player.ragdollWidth,.115*CONFIG.player.ragdollWidth]){
        const ray=new RAPIER.Ray(vec(x+foot,pelvis.y+.1,0),vec(0,-1,0));
        const ground=this.physics.world.castRayAndGetNormal(ray,staticOnly?CONFIG.arena.height:1.6*PLAYER_SCALE,true,undefined,undefined,undefined,undefined,external);
        if(ground&&ground.normal.y>.66)groundY=Math.max(groundY,ray.origin.y-ground.timeOfImpact);
      }
      if(!Number.isFinite(groundY))continue;
      if(this.state!=='GETTING_UP'&&this.qteProgress<=0&&pelvis.y-groundY>.42*PLAYER_SCALE
        &&!(Math.abs(this.pelvis.body.rotation().w)>.94&&this.supported()))continue;
      const center=vec(x,groundY-geometry.bottom+.015,0),root=this.rootFromCenter(center);
      if(!this.free(geometry.shape,add(center,vec(0,geometry.offset,0)),staticOnly,query))continue;
      const plan=this.factory.build('normal',root,identity,this.options);
      if(!plan.parts.every(p=>!this.damage.has(p.name)||this.free(this.shapeFor(p.name),p.position,staticOnly,query)))continue;
      return {center,root,parts:plan.parts};
    }
    return null;
  }
  private pathClear(target:RecoveryTarget):boolean {
    return this.parts.every(part=>{
      const from=part.body.translation(),rotation=part.body.rotation(),to=target.parts.find(p=>p.name===part.limb)!.position;
      if(recoveryPathClear(this.physics,{shape:part.collider.shape,from,rotation,to},this.external,this.query))return true;
      // Folded limbs near a depth wall may need room above the floor to rotate.
      // Accept a verified upward-first route; the actual rise remains force-driven
      // with all contacts enabled, not a pose write along the planned path.
      const lifted=add(from,vec(0,.35*PLAYER_SCALE,0));
      return recoveryPathClear(this.physics,{shape:part.collider.shape,from,rotation,to:lifted,toRotation:rotation},this.external,this.query)
        &&recoveryPathClear(this.physics,{shape:part.collider.shape,from:lifted,rotation,to},this.external,this.query);
    });
  }
  private supported():boolean {
    let supported=false;
    for(const part of this.parts)this.physics.world.contactPairsWith(part.collider,other=>{
      if(supported||!this.external(other))return;
      const contact=other.contactCollider(part.collider,.02);
      if(contact&&contact.normal1.y>.3&&contact.distance<=.02)supported=true;
    });return supported;
  }
  syncDamage(){
    const survivors=[...this.physics.parts.values()].filter(p=>p.owner==='player');
    const pelvis=survivors.filter(p=>p.limb==='pelvis').sort((a,b)=>massProperties(b.poly).volume-massProperties(a.poly).volume)[0];
    const chest=survivors.filter(p=>p.limb==='chest').sort((a,b)=>massProperties(b.poly).volume-massProperties(a.poly).volume)[0];
    const root=pelvis??chest;
    this.parts=root?survivors.filter(p=>this.physics.connected(root.id,p.id)):[];
    for(const limb of Object.keys(this.damage.parts) as (keyof PlayerDamage['parts'])[]){
      const template=this.visualParts.find(p=>p.name===limb)!;
      const volume=this.parts.filter(p=>p.limb===limb).reduce((s,p)=>s+massProperties(p.poly).volume,0);
      this.damage.retain(limb,volume/massProperties(template.poly).volume);
    }
    for(const limb of Object.keys(this.damage.parts)){
      const retained=this.parts.filter(p=>p.limb===limb).sort((a,b)=>massProperties(b.poly).volume-massProperties(a.poly).volume)[0];
      if(retained)this.retainedPolys.set(limb,retained.poly);else this.retainedPolys.delete(limb);
    }
    this.playerJoints=[...this.physics.joints.values()].filter(j=>this.parts.some(p=>p.id===j.a)&&this.parts.some(p=>p.id===j.b));
    this.forcedStarted=-Infinity;this.forcedTarget=null;this.forcedOrigin.clear();
    for(const part of survivors)if(part.body.isKinematic())part.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);
    this.locomotionReady=false;this.fullPoseSince=-Infinity;
    this.riseOrigin.clear();this.assistedRoot=null;this.target=null;this.motorMode='';this.dead=!this.damage.alive;
  }
  refreshLoad(now:number){
    const load=pileLoads(this.physics,this.parts);
    this.loadMass=load.solver;this.gameplayLoadMass=load.gameplay;this.nextLoad=now+.1;
  }
  update(input:InputFrame,now:number,dt:number) {
    this.escapeAxis=0;this.spaceImpulse=0;this.effortPulse*=Math.exp(-dt*12);
    this.refreshRecoveryContact();
    const start=performance.now();try{
      if(this.down)this.query=new CollisionQuery(this.physics,this.external);
      this.updateDown(input,now,dt);
    }finally{this.query=undefined;this.queryMs=performance.now()-start;}
  }
  private updateDown(input:InputFrame,now:number,dt:number) {
    if(this.dead)return;
    if(!this.down){if(this.state==='RECOVERING'&&now>=this.recoveryUntil)this.state='ACTIVE';return;}
    const presses=Math.max(0,Math.min(12,input.effortPresses??(input.pressed?1:0)));
    if(now>=this.nextLoad)this.refreshLoad(now);
    this.presses=this.presses.filter(t=>now-t<1);
    for(let i=0;i<presses;i++)this.presses.push(now);
    if(this.presses.length>60)this.presses=this.presses.slice(-60);
    this.pressRate=this.presses.length;
    const effort=loadEffort(this.loadMass,this.pressRate,CONFIG.player.escapeLoadScale);this.requiredPressRate=effort.requiredRate;this.mobility=effort.mobility;
    this.struggle=Math.min(1,this.struggle*Math.exp(-CONFIG.player.struggleDecay*dt)+presses*CONFIG.player.strugglePerPress);
    for(const p of this.parts){p.body.resetForces(false);p.body.resetTorques(false);}
    if(presses&&this.recoveryContact){this.effortPulse=1;const pulseAxis=vec(0,0,this.lastEscapeAxis);for(const p of this.parts)if(p.limb==='chest'||p.limb.startsWith('forearm'))p.body.applyTorqueImpulse(mul(pulseAxis,Math.min(presses,3)*.5),true);}
    if(this.damage.mobility==='CRAWL'){
      if(this.arcadeRecoveryRequired&&!this.recoveryContact){this.state='RAGDOLL';return;}
      if(this.qteProgress>=1){this.locomotionReady=true;this.escapeAxis=input.axis;this.spaceImpulse=openRecoverySpace(this.physics,this.parts,input.axis,dt).impulse;}
      this.poseProgress=Math.min(this.qteProgress,this.poseProgress+dt*CONFIG.escapeQte.poseRate);
      this.poseMotors(false,!!input.axis);
      this.state='CRAWLING';this.target=null;
      if(input.axis&&this.supported())for(const p of this.parts)p.body.addForce(vec(input.axis*CONFIG.escapeQte.crawlAssistForce*p.body.mass()/CONFIG.player.mass,0,0),true);
      return;
    }
    if(this.arcadeRecoveryRequired&&this.qteProgress>=1){this.forcedRise(now,dt);return;}
    if(this.qteProgress<=0&&this.damage.mobility!=='WALK'){this.qteProgress=1;}
    if(now-this.hitAt<CONFIG.player.stunTime){this.state='RAGDOLL';return;}
    if(!this.recoveryContact&&this.arcadeRecoveryRequired){this.state='RAGDOLL';this.target=null;return;}
    if(this.qteProgress>0&&this.assistedRise(input,now,dt))return;
    if(this.qteProgress===0&&this.arcadeRecoveryRequired){this.state='CRAWLING';this.poseMotors(false);return;}
    if((this.qteProgress>0||this.locomotionReady)&&this.assistedRise(input,now,dt))return;
    if(now-this.hitAt<CONFIG.player.stunTime){this.state='RAGDOLL';return;}
    // During a rise the target is fixed: validate it once rather than rebuilding a second
    // identical plan and doing the same 11-part rotational sweep twice every 60 Hz tick.
    if(this.state==='GETTING_UP'&&this.target){
      const target=this.target;
      const supportRay=new RAPIER.Ray(vec(target.center.x,target.center.y-CONFIG.player.halfHeight-CONFIG.player.radius+.1,0),vec(0,-1,0));
      const support=this.physics.world.castRayAndGetNormal(supportRay,.25,true,undefined,undefined,undefined,undefined,this.external);
      const geometry=this.standingGeometry();
      const valid=!!support&&support.normal.y>.66&&this.free(geometry.shape,add(target.center,vec(0,geometry.offset,0)))&&target.parts.every(p=>!this.damage.has(p.name)||this.free(this.shapeFor(p.name),p.position));
      if(valid&&this.pathClear(target)){this.blocked=false;this.applyGetUp(target);return;}
      this.state='CRAWLING';this.target=null;this.clearSince=-Infinity;this.alignedSince=-Infinity;this.blocked=true;
    }
    const candidate=this.recoveryTarget();this.blocked=!candidate;
    if(!candidate){this.clearSince=-Infinity;this.alignedSince=-Infinity;this.state='CRAWLING';this.target=null;}
    else {
      if(this.clearSince===-Infinity)this.clearSince=now;
      if(now-this.hitAt>=CONFIG.player.getUpDelay&&now-this.clearSince>=.1&&this.pathClear(candidate)){
        this.state='GETTING_UP';this.riseStarted=now;this.target=candidate;this.applyGetUp(candidate);return;
      }
      this.target=candidate;
    }
    this.state='CRAWLING';
    const supported=this.supported();
    // A prone limb can be pressed against a side wall even when the upright
    // destination fits. Reposition with supported traction before attempting the
    // rotational sweep; never teleport, lift through a roof or pull in mid-air.
    const edge=Math.abs(this.pelvis.body.translation().x)>CONFIG.arena.width/2-CONFIG.player.radius-.5;
    const axis=input.axis||(!this.blocked&&edge?-Math.sign(this.pelvis.body.translation().x):0);
    this.crawlPhase+=dt*(axis?6+4*this.struggle:2);
    this.poseMotors(false,!!axis&&supported);
    // Alternating limited joint motors supply a physical arm/leg stroke; no animation poses
    // are written into bodies. Net horizontal traction still requires an actual support.
    if(axis&&supported) {
      const mass=this.parts.reduce((s,p)=>s+p.body.mass(),0);
      const vx=this.parts.reduce((s,p)=>s+p.body.linvel().x*p.body.mass(),0)/mass;
      const speed=(CONFIG.player.crawlSpeed+(CONFIG.player.crawlActiveSpeed-CONFIG.player.crawlSpeed)*this.struggle)*this.mobility;
      const cap=(CONFIG.player.crawlForce+(CONFIG.player.crawlActiveForce-CONFIG.player.crawlForce)*this.struggle)*this.mobility;
      const force=Math.max(-cap,Math.min(cap,(axis*speed-vx)*mass*24));
      for(const p of this.parts)p.body.addForce(vec(force*p.body.mass()/mass,0,0),true);
    }
  }
  private forcedRise(now:number,dt:number){
    if(!this.forcedTarget){
      const candidate=this.recoveryTarget(true);
      if(!candidate){this.state='CRAWLING';this.blocked=true;return;}
      this.forcedTarget=candidate;this.forcedStarted=now;
      for(const p of this.parts){this.forcedOrigin.set(p.id,{position:{...p.body.translation()},rotation:{...p.body.rotation()}});p.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,true);}
      this.poseMotors(false);
    }
    const target=this.forcedTarget,t=Math.min(1,(now+dt-this.forcedStarted)/this.forcedDuration),smooth=t*t*(3-2*t);
    this.poseProgress=t;this.state='GETTING_UP';this.blocked=false;this.target=target;
    const poses=this.parts.map(p=>{const from=this.forcedOrigin.get(p.id)!,to=target.parts.find(v=>v.name===p.limb)!;return {p,position:add(mul(from.position,1-smooth),mul(to.position,smooth)),rotation:slerp(from.rotation,identity,smooth)};});
    const geometry=this.standingGeometry();
    this.spaceImpulse=ejectRecoveryDebris(this.physics,[...poses.map(v=>({shape:v.p.collider.shape,position:v.position,rotation:v.rotation})),uprightVolume(geometry.shape,add(target.center,vec(0,geometry.offset,0)))],target.center);
    for(const pose of poses){pose.p.body.setNextKinematicTranslation(pose.position);pose.p.body.setNextKinematicRotation(pose.rotation);}
  }
  arcadeRecoveryRequired=false;
  private assistedRise(input:InputFrame,now:number,dt:number):boolean {
    this.spaceImpulse=openRecoverySpace(this.physics,this.parts,input.axis||this.lastEscapeAxis,dt).impulse;
    if(!this.supported()){
      this.state='CRAWLING';this.target=null;this.assistedRoot=null;this.riseOrigin.clear();this.locomotionReady=false;return true;
    }
    // Match the standing height to the actual retained foot/stump geometry,
    // not the original full-height capsule (which suspended amputees in mid-air).
    if(this.poseProgress>=.999&&this.assistedRoot){
      this.spaceImpulse=openRecoverySpace(this.physics,this.parts,input.axis||this.escapeAxis,dt).impulse;
      const clearTarget=this.recoveryTarget();
      if(clearTarget&&Math.abs(clearTarget.center.x-this.center.x)<.6){this.assistedRoot={...clearTarget.root};}
      else {
        // A completed QTE supplies its own supported escape stroke: no further
        // held key is required to get out of the exact same blocked pose.
        this.state='CRAWLING';this.blocked=true;this.target=null;this.locomotionReady=false;this.fullPoseSince=-Infinity;
        const preferred=input.axis||(clearTarget?Math.sign(clearTarget.center.x-this.center.x):-Math.sign(this.center.x));
        const choice=(input.axis||clearTarget)?preferred:this.lastEscapeAxis;
        const axis=recoveryEscapeAxis(this.physics,this.parts,choice);this.lastEscapeAxis=axis||this.lastEscapeAxis;this.escapeAxis=axis;
        this.crawlPhase+=dt*8;this.poseMotors(false,!!axis);
        if(axis){
          const mass=this.parts.reduce((s,p)=>s+p.body.mass(),0),vx=this.parts.reduce((s,p)=>s+p.body.linvel().x*p.body.mass(),0)/mass;
          const desired=axis*CONFIG.recoveryAssist.moveSpeed*this.damage.speedFactor;
          const force=Math.max(-CONFIG.escapeQte.crawlAssistForce,Math.min(CONFIG.escapeQte.crawlAssistForce,(desired-vx)*mass*18));
          for(const p of this.parts)p.body.addForce(vec(force*p.body.mass()/mass,0,0),true);
        }
        return true;
      }
    }
    const upright=this.factory.build('normal',vec(),identity,this.options);
    let bottom=Infinity;
    for(const part of this.parts){
      const position=upright.parts.find(p=>p.name===part.limb)!.position;
      for(const face of part.poly.faces)for(const v of face.vertices)bottom=Math.min(bottom,position.y+v.y);
    }
    const rootHeight=-bottom+.02;
    const standHeight=rootHeight+.0225*CONFIG.player.height/1.765;
    if(!this.assistedRoot){
      const ray=new RAPIER.Ray(add(this.center,vec(0,.1,0)),vec(0,-1,0));
      const hit=this.physics.world.castRayAndGetNormal(ray,3,true,undefined,undefined,undefined,undefined,this.external);
      if(!hit)return false;
      this.assistedRoot=this.rootFromCenter(vec(this.center.x,ray.origin.y-hit.timeOfImpact+standHeight+.025,0));
      for(const p of this.parts)this.riseOrigin.set(p.id,{position:{...p.body.translation()},rotation:{...p.body.rotation()}});
      this.riseStarted=now;
    }
    {
      const dx=input.axis*CONFIG.player.crawlActiveSpeed*(this.damage.injured?this.damage.speedFactor:1)*dt;
      this.assistedRoot.x=Math.max(-CONFIG.arena.width/2+.5,Math.min(CONFIG.arena.width/2-.5,this.assistedRoot.x+dx));
      const groundRay=new RAPIER.Ray(vec(this.assistedRoot.x,this.center.y+.4,0),vec(0,-1,0));
      const ground=this.physics.world.castRayAndGetNormal(groundRay,3,true,undefined,undefined,undefined,undefined,this.external);
      if(ground&&ground.normal.y>.45){
        const targetY=this.rootFromCenter(vec(0,groundRay.origin.y-ground.timeOfImpact+standHeight+.025,0)).y;
        this.assistedRoot.y+=Math.max(-dt,Math.min(dt,targetY-this.assistedRoot.y));
      }
    }
    this.poseProgress=this.locomotionReady?1:Math.min(this.qteProgress,this.poseProgress+dt*CONFIG.escapeQte.poseRate*(1+this.effortPulse));
    if(this.poseProgress>=.999){
      if(this.fullPoseSince===-Infinity)this.fullPoseSince=now;
      const torso=this.parts.filter(p=>p.limb==='pelvis'||p.limb==='chest');
      const upright=torso.every(p=>Math.abs(p.body.rotation().w)>.94&&length(p.body.linvel())<1.2);
      if(upright||now-this.fullPoseSince>=CONFIG.escapeQte.settleTimeout)this.locomotionReady=true;
    }
    const hop=this.damage.mobility==='HOP'&&input.axis ? .06*(1-Math.cos(now*9)) : 0;
    const plan=this.factory.build('normal',add(this.assistedRoot,vec(0,hop,0)),identity,this.options);
    const center=add(this.assistedRoot,vec(0,.0225*CONFIG.player.height/1.765,0));
    this.target={center,root:this.assistedRoot,parts:plan.parts};
    const uprightTorso=this.parts.filter(p=>p.limb==='pelvis'||p.limb==='chest').every(p=>Math.abs(p.body.rotation().w)>.9);
    this.state='GETTING_UP';this.blocked=!uprightTorso;
    const t=this.poseProgress;
    for(const p of this.parts){
      const from=this.riseOrigin.get(p.id)!;const target=plan.parts.find(v=>v.name===p.limb)!;
      const desired=add(mul(from.position,1-t),mul(target.position,t));
      const desiredVelocity=mul(sub(desired,p.body.translation()),this.qteProgress>=1?9:5),speed=length(desiredVelocity);
      const limited=mul(desiredVelocity,Math.min(1,CONFIG.escapeQte.maxRiseSpeed/(speed||1)));
      // After the lift reward, only legs/root with a real support may carry
      // weight. No whole-body anti-gravity servo keeping a blocked torso afloat.
      const carriesWeight=p.limb==='pelvis'||p.limb.startsWith('thigh')||p.limb.startsWith('shin');
      const gravityAssist=!this.locomotionReady||carriesWeight?9.81:0;
      let force=mul(add(mul(sub(limited,p.body.linvel()),18),vec(0,gravityAssist,0)),p.body.mass());
      const cap=CONFIG.escapeQte.riseForce*p.body.mass()/CONFIG.player.mass;
      if(length(force)>cap)force=mul(normalize(force),cap);p.body.addForce(force,true);
      const desiredQ=slerp(from.rotation,identity,t),error=multiply(desiredQ,conjugate(p.body.rotation()));
      const sign=error.w<0?-1:1,axis=vec(error.x*sign,error.y*sign,error.z*sign);
      const angle=2*Math.atan2(length(axis),Math.abs(error.w));
      let torque=sub(mul(normalize(axis),angle*35),mul(p.body.angvel(),.8));
      if(length(torque)>CONFIG.escapeQte.riseTorque)torque=mul(normalize(torque),CONFIG.escapeQte.riseTorque);
      p.body.addTorque(torque,true);
    }
    this.poseMotors(false);return true;
  }
  private poseMotors(enabled:boolean,crawling=false):void {
    const raw=this.physics.world.impulseJoints.raw,mode=enabled?'rise':crawling?'crawl':'off';
    for(const joint of this.playerJoints) {
      const limb=this.parts.find(p=>p.id===joint.b)?.limb;if(!limb)continue;
      const phase=this.crawlPhase+(limb.endsWith('-1')?Math.PI:0);
      for(const axis of joint.hinge?[3]:[3,4,5]) {
        if(mode!==this.motorMode)raw.jointConfigureMotorModel(joint.handle,axis,1);
        let target=0;
        if(crawling&&axis===3){
          const wave=.5+.5*Math.sin(phase);
          target=limb.includes('forearm')?.25+.8*wave:limb.includes('shin')?-.25-.8*wave:limb.includes('upperArm')?.3*Math.sin(phase):limb.includes('thigh')?.25*Math.sin(phase):0;
        }
        if(mode!==this.motorMode||crawling){
          raw.jointConfigureMotorPosition(joint.handle,axis,target,enabled?32:20,enabled?4:2.4);
          raw.jointSetMotorMaxForce(joint.handle,axis,enabled?CONFIG.player.getUpTorque:crawling?CONFIG.player.crawlTorque*(1+this.struggle):0);
        }
      }
    }this.motorMode=mode;
  }
  private applyGetUp(target:RecoveryTarget) {
    this.poseMotors(true);
    const forces=this.parts.map(p=>{
      const destination=target.parts.find(t=>t.name===p.limb)!.position;
      const boost=1+CONFIG.player.struggleRiseBoost*this.struggle;
      const acceleration=add(sub(mul(sub(destination,p.body.translation()),CONFIG.player.getUpSpring*boost),mul(p.body.linvel(),CONFIG.player.getUpDamping*Math.sqrt(boost))),vec(0,9.81,0));
      return {p,force:mul(acceleration,p.body.mass())};
    });
    const total=forces.reduce((s,f)=>s+length(f.force),0),scale=Math.min(1,CONFIG.player.getUpForce*this.mobility/(total||1));
    for(const {p,force}of forces) {
      p.body.addForce(mul(force,scale),true);
      const q=conjugate(p.body.rotation()),sign=q.w<0?-1:1,axis=vec(q.x*sign,q.y*sign,q.z*sign);
      const angle=2*Math.atan2(length(axis),Math.abs(q.w));
      let torque=sub(mul(normalize(axis),angle*24),mul(p.body.angvel(),1));
      if(length(torque)>CONFIG.player.getUpTorque)torque=mul(normalize(torque),CONFIG.player.getUpTorque);
      p.body.addTorque(torque,true);
    }
  }
  afterStep(now:number):RecoveryTarget|null {
    if(this.dead)return null;
    if(this.forcedTarget&&now-this.forcedStarted>=this.forcedDuration-1e-6){
      const geometry=this.standingGeometry();
      this.spaceImpulse+=ejectRecoveryDebris(this.physics,[uprightVolume(geometry.shape,add(this.forcedTarget.center,vec(0,geometry.offset,0)))],this.forcedTarget.center);
      return this.forcedTarget;
    }
    if(this.arcadeRecoveryRequired&&this.qteProgress<=0)return null;
    if(this.damage.mobility==='CRAWL')return null;
    if(this.qteProgress>0&&this.poseProgress<.999)return null;
    if((this.state!=='GETTING_UP'&&!this.locomotionReady)||!this.target||now-this.riseStarted<CONFIG.player.getUpDuration/(1+CONFIG.player.struggleRiseBoost*this.struggle))return null;
    // Handoff only after every physical part reached the standing pose, with a clear full
    // capsule and low speed. This prevents replacing a prone body by a tall blocking capsule.
    const candidate=this.recoveryTarget();if(!candidate){this.alignedSince=-Infinity;return null;}
    const assisted=this.qteProgress>=1&&this.poseProgress>=.999;
    const aligned=this.parts.filter(p=>!assisted||p.limb==='pelvis'||p.limb==='chest').every(p=>{
      const target=candidate.parts.find(t=>t.name===p.limb)!;
      const q=p.body.rotation();return length(sub(p.body.translation(),target.position))<(assisted?.25:.085)*PLAYER_SCALE&&Math.abs(q.w)>(assisted?.9:.94)&&length(p.body.linvel())<(assisted?2.5:1.2);
    });
    // The handoff capsule has to sweep out of the current pose safely too.
    const geometry=this.standingGeometry();
    const clear= !assisted||recoveryPathClear(this.physics,{shape:geometry.shape,from:add(this.center,vec(0,geometry.offset,0)),rotation:identity,to:add(candidate.center,vec(0,geometry.offset,0))},this.external);
    if(!aligned||!clear){this.alignedSince=-Infinity;return null;}
    if(this.alignedSince===-Infinity)this.alignedSince=now;
    return now-this.alignedSince>=.075?candidate:null;
  }
  prepareDeath(center:Vec3,velocity:Vec3,now:number){if(!this.down&&!this.dead)this.knockDown(center,velocity,now);for(const p of this.parts)if(p.body.isKinematic())p.body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);this.forcedStarted=-Infinity;this.forcedTarget=null;this.forcedOrigin.clear();this.dead=true;this.poseMotors(false);}
  finishRecovery(now:number){this.removeParts();this.state='RECOVERING';this.recoveryUntil=now+CONFIG.player.recoverTime;this.target=null;this.blocked=false;this.escapeAxis=0;this.spaceImpulse=0;}
  private removeParts(){this.forcedDuration=CONFIG.forcedRecovery.duration;this.forcedStarted=-Infinity;this.forcedTarget=null;this.forcedOrigin.clear();for(const p of this.parts)this.physics.removePart(p.id);this.parts=[];this.playerJoints=[];this.motorMode='';this.struggle=0;this.loadMass=0;this.gameplayLoadMass=0;this.pressRate=0;this.presses=[];this.mobility=1;this.locomotionReady=false;this.fullPoseSince=-Infinity;this.qteProgress=0;this.poseProgress=0;this.riseOrigin.clear();this.assistedRoot=null;}
  dispose(){this.removeParts();}
}
