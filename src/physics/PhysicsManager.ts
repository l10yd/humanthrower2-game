import RAPIER from '@dimforge/rapier3d-compat';
import { addGeometry,assertWorldGeometry,DEFAULT_GEOMETRY_LIMITS,emptyGeometry,geometryUsage,type GeometryLimits } from '../slicing/GeometryBudget';
import { validateConnector,validateJointFrame,type ConnectorVolume } from './Connector';
import { CONFIG } from '../core/Config';
import { massProperties, validate, vertices, type ConvexPolyhedron } from '../slicing/ConvexClipper';
import { add, rotate, identity, vec, type Vec3, type Quat } from '../slicing/Math';
import { slerp } from '../slicing/Quaternion';
import { exactMassProperties } from './ExactMass';
import { planSeparation } from './Separation';
import { ContactLoadWindow } from '../player/ContactLoad';
import { ImpactEffects } from './ImpactEffects';
import { principalInertiaTensor } from './InertiaTensor';
import { quaternionMultiply,anchorDistance, mechanicalEnergy, relativeTwistAngles, relativeTwistMotion, type BodySample } from './Diagnostics';
export { RAPIER };
export interface Pose { position: Vec3; rotation: Quat }
export interface Part {
  id: number; npcId: number; owner: 'npc' | 'player'; limb: string; generation: number; density: number;
  poly: ConvexPolyhedron; body: RAPIER.RigidBody; collider: RAPIER.Collider;
  /** Optional render-only authoring scale; never used by the solver. */
  /** Gameplay/HUD kg per solver kg; does not change physical mass or inertia. */
  gameplayMassScale?:number;
  renderScale?:Vec3;
  previous: Pose; current: Pose;
}
export interface Joint {
  id: number; a: number; b: number; anchorA: Vec3; anchorB: Vec3;
  axis: Vec3; limits: [number,number][]; hinge: boolean; handle: number;
  connector?:ConnectorVolume;frameA?:Quat;frameB?:Quat;
}
export class PhysicsManager {
  private ceilingHandle:number|null=null;
  private incoming=new Map<number,{expires:number;entered:boolean}>();
  isPlayerCeiling(collider:RAPIER.Collider){return collider.handle===this.ceilingHandle;}
  registerIncoming(parts:readonly Part[]){for(const part of parts)this.incoming.set(part.id,{expires:this.time+CONFIG.entry.timeout,entered:false});}
  inheritIncoming(sourceId:number,parts:readonly Part[]){const entry=this.incoming.get(sourceId);if(entry)for(const part of parts)this.incoming.set(part.id,{...entry});}
  impacts=new ImpactEffects();contactLoad=new ContactLoadWindow();contactLoadDiagnosticsEnabled=false;
  world = new RAPIER.World({x:0,y:-9.81,z:0});
  private eventQueue=new RAPIER.EventQueue(true);
  parts = new Map<number,Part>(); joints = new Map<number,Joint>();
  private geometryById=new Map<number,ReturnType<typeof geometryUsage>>();private usedGeometry=emptyGeometry();
  readonly geometryLimits:GeometryLimits={...DEFAULT_GEOMETRY_LIMITS};
  get geometryUsage(){return {...this.usedGeometry};}
  /** Preflight final post-transaction geometry, excluding replaced sources. */
  checkGeometryBudget(removedIds:readonly number[],added:readonly ConvexPolyhedron[]){
    let usage={...this.usedGeometry};for(const id of new Set(removedIds)){const old=this.geometryById.get(id);if(old)usage=addGeometry(usage,old,-1);}
    for(const poly of added)usage=addGeometry(usage,geometryUsage(poly,this.geometryLimits));assertWorldGeometry(usage,this.geometryLimits);return usage;
  }
  private colliderParts=new Map<number,Part>(); private nextId=1; private nextJoint=1;
  private components=new Map<number,number>(); private componentsDirty=true;
  // NPC parts collide before AND after a cut. Player articulation keeps its
  // existing connected-component filter to preserve supported recovery motors.
  npcSelfContactsEnabled=true;
  private neighborPairs=new Set<string>();
  private detachedPairs=new Map<string,{a:number;b:number;expires:number;natural?:boolean}>();
  // Developer-only investigation flags; neither serializes nor applies projected
  // correction during ordinary play until post-clear dynamics acceptance passes.
  exactFragmentMassEnabled=false;
  separationReplayEnabled=false;separationProjectionEnabled=false;separationMs=0;
  time=0;pairSeparations=0;clearSequence=0;separationFault:unknown=null;
  get deferredContacts(){return this.detachedPairs.size;}
  private pairKey(a:number,b:number){return `${Math.min(a,b)}:${Math.max(a,b)}`;}
  diagnosticsEnabled=false;diagnosticsReplayEnabled=false;
  /** Capture thresholds only; never affect the solver or acceptance limits. */
  diagnosticsAngularThreshold=35;diagnosticsSpeedThreshold=25;
  faultSnapshot:ReturnType<PhysicsManager['captureFault']>|null=null;
  peakAngularFault:ReturnType<PhysicsManager['captureFault']>|null=null;
  peakSpeedFault:ReturnType<PhysicsManager['captureFault']>|null=null;
  peakEnergyFault:ReturnType<PhysicsManager['captureFault']>|null=null;
  maxMechanicalEnergyIncrease=0;
  private diagnosticsBefore=new Map<number,BodySample>();
  private diagnosticsWorldBefore:Uint8Array|null=null;
  solverSubsteps:number=CONFIG.physics.solverSubsteps;
  maxSpeed=0; maxAngularSpeed=0; maxAngularLimb=''; stepMs=0; numericFaults=0;
  readonly hooks: RAPIER.PhysicsHooks = {
    filterContactPair: (a,b) => {
      const pa=this.colliderParts.get(a),pb=this.colliderParts.get(b);
      // Non-adjacent NPC parts collide even while connected. Direct joint
      // neighbors and the player's articulation retain their tested filtering.
      if(pa&&pb&&(this.detachedPairs.has(this.pairKey(pa.id,pb.id))||this.sameFamilyContactFiltered(pa,pb)))return null;
      return RAPIER.SolverFlags.COMPUTE_IMPULSE;
    }, filterIntersectionPair: () => true,
  };
  constructor(closedCeiling=true,arenaHeight:number=CONFIG.arena.height) {
    this.world.timestep=CONFIG.dt; this.world.integrationParameters.numSolverIterations=CONFIG.physics.solverIterations;
    this.world.integrationParameters.numInternalPgsIterations=1;
    this.world.integrationParameters.maxCcdSubsteps=4;
    const {width,depth,wall}=CONFIG.arena,height=arenaHeight;
    this.staticBox({x:0,y:-wall/2,z:0},{x:width/2+wall,y:wall/2,z:depth/2+wall},0.95);
    for(const sign of [-1,1]) {
      this.staticBox({x:sign*(width/2+wall/2),y:height/2+1.5,z:0},{x:wall/2,y:height/2+1.5,z:depth/2+wall},0.65);
      this.staticBox({x:0,y:height/2+1.5,z:sign*(depth/2+wall/2)},{x:width/2,y:height/2+1.5,z:wall/2},0.65);
    }
    if(closedCeiling){
      const ceiling=this.world.createCollider(RAPIER.ColliderDesc.cuboid(width/2+wall,wall/2,depth/2+wall).setTranslation(0,height+wall/2,0).setFriction(.65).setCollisionGroups(0x00020002));
      this.ceilingHandle=ceiling.handle;
    }
  }
  private staticBox(p:Vec3,h:Vec3,friction:number) {
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(h.x,h.y,h.z).setTranslation(p.x,p.y,p.z)
      .setFriction(friction).setRestitution(0));
  }
  prepareCollider(poly:ConvexPolyhedron,density:number):RAPIER.ColliderDesc {
    geometryUsage(poly,this.geometryLimits);
    validate(poly);const ps=vertices(poly);
    const coords=new Float32Array(ps.flatMap(p=>[p.x,p.y,p.z]));
    let desc=RAPIER.ColliderDesc.convexHull(coords);
    // ColliderDesc defers hull construction until intoRaw/createCollider; non-null desc
    // does NOT mean QuickHull accepted the vertices. Validate that allocation now.
    const raw=desc?.shape.intoRaw();if(raw)raw.free();else desc=null;
    // A long micron-thin survivor is meaningful geometry, not numerical dust. QuickHull
    // can reject it despite a valid closed convex topology: feed that topology directly.
    if(!desc){
      const indices:number[]=[];
      for(const face of poly.faces){const ids=face.vertices.map(v=>ps.findIndex(p=>Math.hypot(p.x-v.x,p.y-v.y,p.z-v.z)<1e-9));
        for(let i=1;i<ids.length-1;i++)indices.push(ids[0],ids[i],ids[i+1]);
      }
      desc=RAPIER.ColliderDesc.convexMesh(coords,new Uint32Array(indices));
      const mesh=desc?.shape.intoRaw();if(mesh)mesh.free();else desc=null;
    }
    if(!desc)throw Error('Rapier rejected closed convex geometry');
    return desc.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(300).setDensity(density).setFriction(CONFIG.physics.friction).setRestitution(0)
      .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Min).setActiveHooks(RAPIER.ActiveHooks.FILTER_CONTACT_PAIRS);
  }
  createPart(poly:ConvexPolyhedron,pose:Pose,mass:number,npcId:number,limb:string,generation=0,density?:number,owner:Part['owner']='npc',staged=false):Part {
    // Staging is reserved for preflighted replacement transactions.
    const geometry=geometryUsage(poly,this.geometryLimits);
    if(!staged){this.checkGeometryBudget([],[poly]);if(this.parts.size+1>CONFIG.physics.hardLimit)throw Error('Body budget exceeded');}
    const rho=density??mass/massProperties(poly).volume;const desc=this.prepareCollider(poly,rho);
    // Bit 2 belongs to the player-only ceiling. NPCs enter from overhead while
    // upright/player ragdoll colliders keep full ceiling collisions.
    if(owner==='npc')desc.setCollisionGroups(0xfffdfffd);
    if(this.exactFragmentMassEnabled&&generation>0){const m=exactMassProperties(poly,rho);desc.setMassProperties(m.mass,m.center,m.principal,m.frame);}
    const body=this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pose.position.x,pose.position.y,pose.position.z)
      .setRotation(pose.rotation).setLinearDamping(owner==='npc'?CONFIG.physics.npcLinearDamping:CONFIG.physics.linearDamping).setAngularDamping(owner==='npc'?CONFIG.physics.npcAngularDamping:CONFIG.physics.angularDamping)
      .setCcdEnabled(true).setSoftCcdPrediction(owner==='npc'?.5:0).setAdditionalSolverIterations(owner==='player'?10:2));
    let collider:RAPIER.Collider;
    try {collider=this.world.createCollider(desc,body);}catch(error){this.world.removeRigidBody(body);throw error;}
    const part:Part={id:this.nextId++,npcId,owner,limb,generation,density:rho,poly,body,collider,previous:pose,current:pose};
    this.parts.set(part.id,part);this.geometryById.set(part.id,geometry);this.usedGeometry=addGeometry(this.usedGeometry,geometry);this.colliderParts.set(collider.handle,part);this.componentsDirty=true;return part;
  }
  createJoint(data:Omit<Joint,'id'|'handle'>):Joint {
    const a=this.parts.get(data.a)!,b=this.parts.get(data.b)!;
    if(data.connector)validateConnector(data.connector,data.anchorA,data.anchorB);
    if(data.frameA)validateJointFrame(data.frameA);if(data.frameB)validateJointFrame(data.frameB);
    const desc=data.hinge ? RAPIER.JointData.revolute(data.anchorA,data.anchorB,data.axis)
      : RAPIER.JointData.generic(data.anchorA,data.anchorB,data.axis,
        RAPIER.JointAxesMask.LinX|RAPIER.JointAxesMask.LinY|RAPIER.JointAxesMask.LinZ);
    const joint=this.world.createImpulseJoint(desc,a.body,b.body,true);
    try {
    joint.setContactsEnabled(false);
    if(data.frameA)joint.setFrameX1(data.frameA);if(data.frameB)joint.setFrameX2(data.frameB);
    if(data.hinge) (joint as RAPIER.RevoluteImpulseJoint).setLimits(...data.limits[0]);
    else {
      // Pinned Rapier 0.21: high-level GenericImpulseJoint omits limits, but its PUBLIC
      // WASM joint set exposes jointSetLimits. This is the small tested adapter from TDD §4.4.
      const raw=this.world.impulseJoints.raw;
      const axes=[RAPIER.JointAxis.AngX,RAPIER.JointAxis.AngY,RAPIER.JointAxis.AngZ];
      data.limits.forEach(([min,max],i)=> {
        raw.jointSetLimits(joint.handle,axes[i] as unknown as Parameters<typeof raw.jointSetLimits>[1],min,max);
        if(!raw.jointLimitsEnabled(joint.handle,axes[i] as unknown as Parameters<typeof raw.jointLimitsEnabled>[1])) throw Error('Generic joint angular limits unavailable');
      });
    }
    if(a.owner==='npc'&&b.owner==='npc'){
      const raw=this.world.impulseJoints.raw;
      for(const axis of data.hinge?[3]:[3,4,5]){
        // Use the named model: raw value 1 is FORCE-based, not acceleration-based.
        // Finite torque per axis, zero restoring stiffness, no artificial pose spring.
        raw.jointConfigureMotorModel(joint.handle,axis,RAPIER.MotorModel.ForceBased as unknown as Parameters<typeof raw.jointConfigureMotorModel>[2]);
        raw.jointConfigureMotorVelocity(joint.handle,axis,0,CONFIG.physics.jointDamping);
        raw.jointSetMotorMaxForce(joint.handle,axis,CONFIG.physics.jointMaxTorque);
      }
    }
    }catch(error){this.world.removeImpulseJoint(joint,true);throw error;}
    const result={...data,id:this.nextJoint++,handle:joint.handle}; this.joints.set(result.id,result);this.neighborPairs.add(this.pairKey(result.a,result.b));this.componentsDirty=true;return result;
  }
  removeJoint(id:number) {const j=this.joints.get(id);if(j) { const joint=this.world.getImpulseJoint(j.handle);if(joint)this.world.removeImpulseJoint(joint,true);this.joints.delete(id);this.neighborPairs.delete(this.pairKey(j.a,j.b));this.componentsDirty=true;}}
  removePart(id:number) {this.incoming.delete(id);const p=this.parts.get(id);if(!p)return;
    for(const j of [...this.joints.values()]) if(j.a===id||j.b===id) this.removeJoint(j.id);
    const geometry=this.geometryById.get(id);if(geometry)this.usedGeometry=addGeometry(this.usedGeometry,geometry,-1);this.geometryById.delete(id);
    this.colliderParts.delete(p.collider.handle);this.world.removeRigidBody(p.body);this.parts.delete(id);this.componentsDirty=true;
    for(const [key,pair]of this.detachedPairs)if(pair.a===id||pair.b===id)this.detachedPairs.delete(key);
  }
  private sameFamilyContactFiltered(a:Part,b:Part){
    return a.npcId===b.npcId&&(!this.npcSelfContactsEnabled||a.owner==='player'||b.owner==='player'?this.connected(a.id,b.id):this.neighborPairs.has(this.pairKey(a.id,b.id)));
  }
  partForCollider(collider:RAPIER.Collider):Part|undefined{return this.colliderParts.get(collider.handle);}
  connected(a:number,b:number):boolean {
    if(this.componentsDirty) {
      this.components.clear();const adjacency=new Map<number,number[]>();
      for(const j of this.joints.values()) {
        adjacency.set(j.a,[...(adjacency.get(j.a)??[]),j.b]);adjacency.set(j.b,[...(adjacency.get(j.b)??[]),j.a]);
      }
      for(const id of this.parts.keys())if(!this.components.has(id)) {
        const todo=[id];this.components.set(id,id);
        while(todo.length)for(const next of adjacency.get(todo.pop()!)??[])if(!this.components.has(next)) {this.components.set(next,id);todo.push(next);}
      }
      this.componentsDirty=false;
    }
    return this.components.has(a)&&this.components.get(a)===this.components.get(b);
  }
  deferDetachedContacts(npcIds:Set<number>,natural=false):void {
    // With NPC self contact active, this cut does not enable any previously
    // unfiltered non-neighbor pairs. Direct neighbors use normal solver contact
    // recovery after severing, not indefinite family-wide collision exemptions.
    if(natural&&this.npcSelfContactsEnabled)return;
    const families=new Map<number,Part[]>();
    for(const part of this.parts.values())if(npcIds.has(part.npcId))families.set(part.npcId,[...(families.get(part.npcId)??[]),part]);
    for(const family of families.values())for(let i=0;i<family.length;i++)for(let k=i+1;k<family.length;k++) {
      const a=family[i],b=family[k];if(this.connected(a.id,b.id))continue;
      const contact=a.collider.contactCollider(b.collider,.01);
      if(contact&&contact.distance<.01)this.detachedPairs.set(this.pairKey(a.id,b.id),{a:a.id,b:b.id,expires:this.time+.15,natural});
    }
  }
  private reenableDetachedContacts():void {
    const corrections=new Map<number,number>();
    for(const [key,pair]of this.detachedPairs) {
      const a=this.parts.get(pair.a),b=this.parts.get(pair.b);
      if(!a||!b||this.connected(a.id,b.id)){this.detachedPairs.delete(key);continue;}
      const contact=a.collider.contactCollider(b.collider,.011);
      if(!contact||contact.distance>=.01){this.detachedPairs.delete(key);continue;}
      // A saw must not trigger the old technical-row projection/forced-pause path.
      // Touching cut faces can contact immediately; only legacy self-penetrations
      // wait for natural separation. Collisions with all external bodies stay on.
      if(pair.natural){if(contact.distance>=-.002)this.detachedPairs.delete(key);continue;}
      if(this.time<pair.expires)continue;
      const depth=.022-contact.distance;
      const groupA=[...this.parts.values()].filter(p=>this.connected(p.id,a.id)),groupB=[...this.parts.values()].filter(p=>this.connected(p.id,b.id));
      const caps=[groupA,groupB].map(group=>Math.max(0,Math.min(...group.map(p=>.015-(corrections.get(p.id)??0)))));
      // Several former-neighbor pairs can share one island. Once its total 1.5cm
      // correction budget is spent, continue its geometric recovery next fixed step.
      if(caps[0]+caps[1]<1e-5)continue;
      const {poses,attempts}=planSeparation(this,a,b,[groupA,groupB],caps,{...contact.normal1},depth,this.separationProjectionEnabled);
      if(!poses&&caps.some(cap=>cap<1e-5))continue;
      if(!poses){
        this.separationFault={time:this.time,pair:{a:a.id,b:b.id},distance:contact.distance,normal:{...contact.normal1},attempts,
          replay:this.separationReplayEnabled?{bytes:Array.from(this.world.takeSnapshot()),
            parts:[...this.parts.values()].map(p=>({id:p.id,npcId:p.npcId,owner:p.owner,limb:p.limb,generation:p.generation,density:p.density,poly:p.poly,body:p.body.handle,collider:p.collider.handle})),
            joints:[...this.joints.values()],pairs:[...this.detachedPairs.values()]}:null,
          parts:[...groupA,...groupB].map(p=>({id:p.id,limb:p.limb,poly:p.poly,position:{...p.body.translation()},rotation:{...p.body.rotation()}}))};
        throw Error('Невозможно безопасно разделить фрагменты — техническая пауза, без импульса разлёта.');
      }
      for(const {part,position}of poses){
        const old={...part.body.translation()};corrections.set(part.id,(corrections.get(part.id)??0)+Math.hypot(position.x-old.x,position.y-old.y,position.z-old.z));
        part.body.setTranslation(position,true);part.previous={position,rotation:{...part.body.rotation()}};
      }
      this.world.propagateModifiedBodyPositionsToColliders();this.pairSeparations++;
      const remaining=a.collider.contactCollider(b.collider,.011);
      if(!remaining||remaining.distance>=.01)this.detachedPairs.delete(key);
    }
  }
  /** Emergency cleanup for escaped fragments; ordinary contacts enforce the closed arena. */
  cullOutsideArena(){
    let removed=0;
    for(const part of [...this.parts.values()]){
      const p=part.body.worldCom(),entry=this.incoming.get(part.id);
      if(entry&&p.y<=CONFIG.arena.height)entry.entered=true;
      const hiddenEntry=entry&&!entry.entered&&this.time<=entry.expires&&p.y<=CONFIG.arena.height+CONFIG.entry.height;
      if(entry&&(entry.entered||this.time>entry.expires))this.incoming.delete(part.id);
      if(Math.abs(p.x)>CONFIG.arena.width/2+CONFIG.arena.wall||p.y<-.35||p.y>CONFIG.arena.height+.35&&!hiddenEntry||Math.abs(p.z)>CONFIG.arena.depth/2+CONFIG.arena.wall){this.removePart(part.id);removed++;}
    }
    return removed;
  }
  snapshot() {for(const p of this.parts.values())p.previous=p.current;}
  step() {
    this.impacts.begin();this.contactLoad.reset();
    const separationStart=performance.now();
    try{this.reenableDetachedContacts();}finally{this.separationMs=performance.now()-separationStart;}
    const start=performance.now();
    const kinematics:{body:RAPIER.RigidBody;from:Vec3;to:Vec3;rotation:Quat;target:Quat}[]=[];
    if(this.solverSubsteps>1)this.world.forEachRigidBody(body=>{
      if(body.bodyType()===RAPIER.RigidBodyType.KinematicPositionBased)kinematics.push({body,from:{...body.translation()},to:{...body.nextTranslation()},rotation:{...body.rotation()},target:{...body.nextRotation()}});
    });
    let substepSpeed=0,substepAngular=0,substepLimb='';
    this.world.timestep=CONFIG.dt/this.solverSubsteps;
    try{
      for(let i=0;i<this.solverSubsteps;i++){
        const t=(i+1)/this.solverSubsteps;
        for(const k of kinematics){k.body.setNextKinematicTranslation(vec(k.from.x+(k.to.x-k.from.x)*t,k.from.y+(k.to.y-k.from.y)*t,k.from.z+(k.to.z-k.from.z)*t));k.body.setNextKinematicRotation(slerp(k.rotation,k.target,t));}
        if(this.diagnosticsEnabled){
          this.diagnosticsBefore.clear();for(const p of this.parts.values())this.diagnosticsBefore.set(p.id,this.sample(p));
          // Capture AFTER assigning this substep's dt and kinematic target. Replay
          // now advances exactly the offending solver step, not the whole game tick.
          this.diagnosticsWorldBefore=this.diagnosticsReplayEnabled?this.world.takeSnapshot():null;
        }
        this.impacts.sample(this);
        this.world.step(this.eventQueue,this.hooks);
        if(this.contactLoadDiagnosticsEnabled)this.contactLoad.sample(this,[...this.parts.values()].filter(p=>p.owner==='player'),CONFIG.dt/this.solverSubsteps);
        this.eventQueue.drainContactForceEvents(event=>{
          this.impacts.observe(this,event.collider1(),event.collider2(),event.totalForceMagnitude(),CONFIG.dt/this.solverSubsteps,this.time+(i+1)*CONFIG.dt/this.solverSubsteps);
        });
        let fastest:Part|undefined,spinning:Part|undefined,stepSpeed=0,stepAngular=0;
        // Watch every internal step, not only the last: otherwise substepping
        // could hide a short-lived explosion from the existing acceptance gate.
        for(const p of this.parts.values()){
          const v={...p.body.linvel()},w={...p.body.angvel()},speed=Math.hypot(v.x,v.y,v.z),angular=Math.hypot(w.x,w.y,w.z);
          if(speed>stepSpeed){stepSpeed=speed;fastest=p;}if(angular>stepAngular){stepAngular=angular;spinning=p;}
          substepSpeed=Math.max(substepSpeed,speed);
          if(angular>substepAngular){substepAngular=angular;substepLimb=p.limb;}
          if(!Number.isFinite(speed+angular))this.numericFaults++;
        }
        if(this.diagnosticsEnabled){
          const after=new Map([...this.parts.values()].map(p=>[p.id,this.sample(p)]));
          const energyBefore=mechanicalEnergy(this.diagnosticsBefore.values()),energyAfter=mechanicalEnergy(after.values());
          const energyDelta=energyAfter-energyBefore;
          const capture=(part:Part)=>this.captureFault(part,after,energyBefore,energyAfter,i);
          if(energyDelta>this.maxMechanicalEnergyIncrease&&spinning)this.peakEnergyFault=capture(spinning);
          this.maxMechanicalEnergyIncrease=Math.max(this.maxMechanicalEnergyIncrease,energyDelta);
          if(!this.faultSnapshot&&(stepSpeed>this.diagnosticsSpeedThreshold||stepAngular>this.diagnosticsAngularThreshold))this.faultSnapshot=capture(stepAngular>this.diagnosticsAngularThreshold?spinning!:fastest!);
          if(stepAngular>this.diagnosticsAngularThreshold&&stepAngular>(this.peakAngularFault?.angular??0))this.peakAngularFault=capture(spinning!);
          if(stepSpeed>this.diagnosticsSpeedThreshold&&stepSpeed>(this.peakSpeedFault?.speed??0))this.peakSpeedFault=capture(fastest!);
        }
      }
    }finally{this.world.timestep=CONFIG.dt;}
    this.impacts.finish(this.time);
    this.stepMs=performance.now()-start;this.time+=CONFIG.dt;
    for(const p of this.parts.values()) {
      p.current={position:{...p.body.translation()},rotation:{...p.body.rotation()}};
      const position=p.current.position;if(!Number.isFinite(position.x+position.y+position.z))this.numericFaults++;
    }
    this.maxSpeed=Math.max(this.maxSpeed,substepSpeed);
    if(substepAngular>this.maxAngularSpeed)this.maxAngularLimb=substepLimb;
    this.maxAngularSpeed=Math.max(this.maxAngularSpeed,substepAngular);
  }
  private sample(p:Part):BodySample {
    const i=p.body.effectiveAngularInertia();
    // Rapier matrix getters may share a WASM scratch buffer. Copy all components before
    // another getter (translation/rotation/velocity) reuses that buffer.
    let inertiaSource:'effective'|'principal-fallback'='effective';
    let inertia={m11:i.m11,m12:i.m12,m13:i.m13,m22:i.m22,m23:i.m23,m33:i.m33};
    if(!Object.values(inertia).every(Number.isFinite)){
      inertiaSource='principal-fallback';
      const principal={...p.body.principalInertia()},frame={...p.body.principalInertiaLocalFrame()},rotation={...p.body.rotation()};
      inertia=principalInertiaTensor(principal,quaternionMultiply(rotation,frame));
    }
    return {mass:p.body.mass(),position:{...p.body.translation()},com:{...p.body.worldCom()},rotation:{...p.body.rotation()},velocity:{...p.body.linvel()},angular:{...p.body.angvel()},inertia,inertiaSource};
  }
  private captureFault(part:Part,after:Map<number,BodySample>,energyBefore:number,energyAfter:number,substepIndex:number){
    const state=after.get(part.id)!;
    const contacts:{otherId:number|'static';distance:number;normal:Vec3;point1:Vec3;point2:Vec3;filtered:boolean}[]=[];
    // Direct shape distance is geometry, NOT proof that a pair was solved. Include ignored
    // overlaps but label them so self-intersections cannot be mistaken for solver impulses.
    this.world.forEachCollider(c=>{
      if(c.handle===part.collider.handle)return;const contact=part.collider.contactCollider(c,.05);if(!contact)return;
      const other=this.partForCollider(c);
      const filtered=!!other&&(this.detachedPairs.has(this.pairKey(part.id,other.id))||this.sameFamilyContactFiltered(part,other));
      contacts.push({otherId:other?.id??'static',distance:contact.distance,normal:{...contact.normal1},point1:{...contact.point1},point2:{...contact.point2},filtered});
    });
    const solverContacts:{partId:number;otherId:number|'static';flipped:boolean;normal:Vec3;friction:number;restitution:number;
      contacts:{distance:number;impulse:number;tangentX:number;tangentY:number}[];solver:{point:Vec3|null;distance:number}[]}[]=[];
    const seen=new Set<string>();
    for(const member of this.parts.values())if(this.connected(part.id,member.id))this.world.contactPairsWith(member.collider,c=>{
      const key=`${Math.min(member.collider.handle,c.handle)}:${Math.max(member.collider.handle,c.handle)}`;
      if(seen.has(key))return;seen.add(key);
      this.world.contactPair(member.collider,c,(manifold,flipped)=>{
      // TempContactManifold is recycled at callback exit. Keep only copied JS data.
      solverContacts.push({partId:member.id,otherId:this.partForCollider(c)?.id??'static',flipped,normal:{...manifold.normal()},friction:manifold.friction(),restitution:manifold.restitution(),
        contacts:Array.from({length:manifold.numContacts()},(_,i)=>({distance:manifold.contactDist(i),impulse:manifold.contactImpulse(i),tangentX:manifold.contactTangentImpulseX(i),tangentY:manifold.contactTangentImpulseY(i)})),
        solver:Array.from({length:manifold.numSolverContacts()},(_,i)=>{const point=manifold.solverContactPoint(i);return {point:point?{...point}:null,distance:manifold.solverContactDist(i)};})});
    });});
    const joints=[...this.joints.values()].filter(j=>j.a===part.id||j.b===part.id).map(j=>{
      const joint=this.world.getImpulseJoint(j.handle),frameA={...joint.frameX1()},frameB={...joint.frameX2()};
      const sample=(samples:Map<number,BodySample>)=>{
        const a=samples.get(j.a)!,b=samples.get(j.b)!,angles=relativeTwistAngles(a.rotation,b.rotation,frameA,frameB);
        return {angles,twistMotion:relativeTwistMotion(a.rotation,b.rotation,frameA,frameB,a.angular,b.angular),anchorDrift:anchorDistance(a,b,j.anchorA,j.anchorB),limitExcess:j.limits.map(([min,max],i)=>Math.max(0,min-angles[i],angles[i]-max))};
      };
      return {id:j.id,a:j.a,b:j.b,hinge:j.hinge,limits:j.limits.map(l=>[...l]),frameA,frameB,anchorA:{...j.anchorA},anchorB:{...j.anchorB},before:sample(this.diagnosticsBefore),after:sample(after)};
    });
    const world=[...after].map(([id,sample])=>{
      const p=this.parts.get(id)!;this.connected(id,id);
      return {id,npcId:p.npcId,owner:p.owner,limb:p.limb,bodyHandle:p.body.handle,colliderHandle:p.collider.handle,component:this.components.get(id)!,before:this.diagnosticsBefore.get(id)!,after:sample};
    });
    return {time:this.time+(substepIndex+1)*CONFIG.dt/this.solverSubsteps,fixedTime:this.time,substepIndex,replayTimestep:CONFIG.dt/this.solverSubsteps,solverSubsteps:this.solverSubsteps,npcSelfContactsEnabled:this.npcSelfContactsEnabled,partId:part.id,limb:part.limb,npcId:part.npcId,
      speed:Math.hypot(state.velocity.x,state.velocity.y,state.velocity.z),angular:Math.hypot(state.angular.x,state.angular.y,state.angular.z),
      before:this.diagnosticsBefore.get(part.id)!,after:state,energyBefore,energyAfter,energyDelta:energyAfter-energyBefore,contacts,solverContacts,joints,world,
      replayBefore:this.diagnosticsWorldBefore,deferredPairs:[...this.detachedPairs.values()].map(pair=>({a:pair.a,b:pair.b})),neighborPairs:[...this.joints.values()].map(j=>({a:j.a,b:j.b}))};
  }
  anchorDrifts():number[] {return [...this.joints.values()].map(j=>{
    const a=this.parts.get(j.a)!,b=this.parts.get(j.b)!;
    const pa=add(a.body.translation(),rotate(j.anchorA,a.body.rotation())),pb=add(b.body.translation(),rotate(j.anchorB,b.body.rotation()));
    return Math.hypot(pa.x-pb.x,pa.y-pb.y,pa.z-pb.z);
  });}
  dispose(){this.contactLoad.reset();this.impacts.reset();this.eventQueue.free();this.world.free();this.parts.clear();this.geometryById.clear();this.usedGeometry=emptyGeometry();this.joints.clear();this.colliderParts.clear();this.detachedPairs.clear();this.neighborPairs.clear();this.components.clear();
    this.diagnosticsBefore.clear();this.diagnosticsWorldBefore=null;this.faultSnapshot=null;this.peakAngularFault=null;this.peakSpeedFault=null;this.peakEnergyFault=null;this.separationFault=null;}
}
export const initialPose=(position:Vec3,rotation:Quat=identity):Pose=>({position,rotation});
