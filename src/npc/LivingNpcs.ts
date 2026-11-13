import {CONFIG,type NpcType} from '../core/Config';
import {RAPIER,type PhysicsManager,type Part,type Joint} from '../physics/PhysicsManager';
import {RagdollFactory,type RagdollOptions} from '../physics/RagdollFactory';
import {clip,massProperties} from '../slicing/ConvexClipper';
import {vec,sub,conjugate,normalize,length,mul,type Vec3} from '../slicing/Math';
export type NpcActivityMode='twitch'|'hunt';
export type NpcPhase='FALLING'|'TWITCHING'|'PINNED'|'RISING'|'HUNTING'|'JUMPING'|'DEAD';
export interface LivingNpc {id:number;phase:NpcPhase;nextJump:number;supportSince:number;born:number;volumes:Map<string,number>;pinnedUntil:number;loadMass:number}
/** Only the connected vital component is alive. Detached limbs never receive
 * AI forces; death disables active motors without deleting physical remains. */
export class LivingNpcs {
 readonly agents=new Map<number,LivingNpc>();attacks=0;airStrokes=0;
 constructor(private physics:PhysicsManager,readonly mode:NpcActivityMode='twitch'){}
 register(parts:Part[],now:number){if(!parts.length||[...this.agents.values()].filter(a=>a.phase!=='DEAD').length>=CONFIG.npcActivity.maxActive)return;
  const names=new Set(parts.map(p=>p.limb));if(!['head','chest','pelvis'].every(n=>names.has(n)))return;
  this.agents.set(parts[0].npcId,{id:parts[0].npcId,phase:'FALLING',nextJump:now+2,supportSince:-Infinity,born:now,pinnedUntil:-Infinity,loadMass:0,volumes:new Map(parts.map(p=>[p.limb,massProperties(p.poly).volume]))});
 }
 private component(agent:LivingNpc){
  const all=[...this.physics.parts.values()].filter(p=>p.npcId===agent.id&&p.owner==='npc');
  const chest=all.filter(p=>p.limb==='chest').sort((a,b)=>b.body.mass()-a.body.mass())[0];if(!chest)return [];
  const connected=all.filter(p=>this.physics.connected(chest.id,p.id));
  for(const limb of ['head','chest','pelvis']){const tissue=connected.filter(p=>p.limb===limb).reduce((s,p)=>s+massProperties(p.poly).volume,0);if(tissue<(agent.volumes.get(limb)??Infinity)*.5)return [];}
  return connected;
 }
  private resetDrive(agent:LivingNpc,parts:Part[]){
    const ids=new Set(parts.map(p=>p.id)),raw=this.physics.world.impulseJoints.raw;
    for(const p of this.physics.parts.values())if(p.npcId===agent.id){p.body.resetForces(false);p.body.resetTorques(false);}
    for(const j of this.physics.joints.values()){const a=this.physics.parts.get(j.a);if(a?.npcId!==agent.id||ids.has(j.a)&&ids.has(j.b))continue;
      for(const axis of j.hinge?[3]:[3,4,5]){raw.jointConfigureMotorVelocity(j.handle,axis,0,CONFIG.physics.jointDamping);raw.jointSetMotorMaxForce(j.handle,axis,CONFIG.physics.jointMaxTorque);}
    }
  }
  private supported(parts:Part[]){
  let support=false;for(const p of parts)this.physics.world.contactPairsWith(p.collider,c=>{
   const other=this.physics.partForCollider(c);if(other?.npcId===p.npcId)return;
   const hit=p.collider.contactCollider(c,.025);if(hit&&hit.distance<=.025&&hit.normal1.y<-.3)support=true;
  });return support;
 }
  private overheadMass(parts:Part[]){
    const visited=new Set(parts.map(p=>p.id));let mass=0;
    for(const p of parts)this.physics.world.contactPairsWith(p.collider,c=>{
      const other=this.physics.partForCollider(c);if(other&&visited.has(other.id))return;
      const hit=p.collider.contactCollider(c,.025);if(!hit||hit.distance>.025||hit.normal1.y<.3)return;
      if(!other){mass=Infinity;return;}
      // Detached limbs can pin their former owner; moving impacts briefly suppress flailing too.
      for(const upper of this.physics.parts.values())if(!visited.has(upper.id)&&this.physics.connected(other.id,upper.id)){visited.add(upper.id);mass+=upper.body.mass();}
    });return mass;
  }
  private passive(joints:Joint[]){
    const raw=this.physics.world.impulseJoints.raw;
    for(const j of joints)for(const axis of j.hinge?[3]:[3,4,5]){raw.jointConfigureMotorVelocity(j.handle,axis,0,CONFIG.physics.jointDamping);raw.jointSetMotorMaxForce(j.handle,axis,CONFIG.physics.jointMaxTorque);}
  }
 update(now:number,dt:number,player:Vec3){
  for(const agent of this.agents.values()){
   if(agent.phase==='DEAD')continue;const parts=this.component(agent);this.resetDrive(agent,parts);
   const joints=[...this.physics.joints.values()].filter(j=>parts.some(p=>p.id===j.a)&&parts.some(p=>p.id===j.b));
   if(!parts.length){agent.phase='DEAD';continue;}
   const pelvis=parts.find(p=>p.limb==='pelvis')!,contact=this.supported(parts),raw=this.physics.world.impulseJoints.raw;
   if(this.mode==='twitch'){
    agent.loadMass=this.overheadMass(parts);if(agent.loadMass>=CONFIG.npcActivity.pinnedMass)agent.pinnedUntil=now+.25;
    agent.phase=now<agent.pinnedUntil?'PINNED':contact?'TWITCHING':'FALLING';
    this.passive(joints);if(agent.phase==='PINNED')continue;
    const direction=Math.sign(player.x-pelvis.body.translation().x)||1;
    for(const j of joints){
     const limb=this.physics.parts.get(j.b)!.limb;if(!/upperArm|forearm|thigh|shin/.test(limb))continue;
     const wave=Math.sin(now*5+agent.id+(limb.endsWith('-1')?Math.PI:0));
     for(const [i,axis] of (j.hinge?[3]:[3,4,5]).entries()){
      const limits=j.limits[i]??[-.3,.3],target=Math.max(limits[0]+.02,Math.min(limits[1]-.02,direction*CONFIG.npcActivity.twitchAmplitude*(.65+.35*wave)));
      raw.jointConfigureMotorPosition(j.handle,axis,target,8,1.5);raw.jointSetMotorMaxForce(j.handle,axis,CONFIG.npcActivity.twitchTorque);
     }
    }
    if(!contact)this.airStrokes++;continue;
   }
   if(!contact){agent.supportSince=-Infinity;agent.phase=agent.phase==='JUMPING'?'JUMPING':'FALLING';}
   else{if(agent.supportSince===-Infinity)agent.supportSince=now;agent.phase=now-agent.supportSince<.7?'RISING':'HUNTING';}
   const phase=now*9+agent.id;
   for(const j of joints){const b=this.physics.parts.get(j.b)!;
    for(const [i,axis] of (j.hinge?[3]:[3,4,5]).entries()){
     const limits=j.limits[i]??[-.3,.3],wave=agent.phase==='FALLING'||agent.phase==='JUMPING'?Math.sin(phase+(b.limb.endsWith('-1')?Math.PI:0))*.6:Math.sin(phase)*.15;
     const target=Math.max(limits[0]+.02,Math.min(limits[1]-.02,wave));raw.jointConfigureMotorPosition(j.handle,axis,target,24,3);raw.jointSetMotorMaxForce(j.handle,axis,contact?22:10);
    }
   }
   if(!contact){this.airStrokes++;continue;}
   // Ground-driven recovery PD. Existing ragdoll joints and collisions remain;
   // active force budgets scale with mass, never write poses or disable limits.
   const ray=new RAPIER.Ray(vec(pelvis.body.translation().x,pelvis.body.translation().y+.2,0),vec(0,-1,0));
   const ground=this.physics.world.castRay(ray,4,true,undefined,undefined,undefined,undefined,c=>this.physics.partForCollider(c)?.npcId!==agent.id);
   if(!ground)continue;const scale=pelvis.renderScale??vec(1,1,1),root=vec(pelvis.body.translation().x,ray.origin.y-ground.timeOfImpact+.87*scale.y,0);
   const plan=new RagdollFactory(this.physics).build('normal',root,{x:0,y:0,z:0,w:1},{width:scale.x,height:1.765*scale.y});
   for(const p of parts){const target=plan.parts.find(t=>t.name===p.limb);if(!target)continue;
    const delta=sub(target.position,p.body.translation()),v=p.body.linvel();let force=mul(vec(delta.x*25-v.x*6,delta.y*40-v.y*8+9.81,-p.body.translation().z*20-v.z*5),p.body.mass());
    const cap=p.body.mass()*42;if(length(force)>cap)force=mul(normalize(force),cap);p.body.addForce(force,true);
    const q=conjugate(p.body.rotation()),sign=q.w<0?-1:1;let torque=vec(q.x*sign*35-p.body.angvel().x,q.y*sign*35-p.body.angvel().y,q.z*sign*35-p.body.angvel().z);if(length(torque)>30)torque=mul(normalize(torque),30);p.body.addTorque(torque,true);
   }
   const dx=player.x-pelvis.body.translation().x;
   if(agent.phase==='HUNTING')for(const p of parts)p.body.addForce(vec(Math.sign(dx)*p.body.mass()*8,0,0),true);
   if(agent.phase==='HUNTING'&&now>=agent.nextJump&&Math.abs(dx)<4){
    for(const p of parts)p.body.applyImpulse(vec(Math.sign(dx)*p.body.mass()*2.7,p.body.mass()*5.2,0),true);agent.nextJump=now+2.5;agent.phase='JUMPING';this.attacks++;
   }
  }
 }
 get snapshot(){return {mode:this.mode,living:[...this.agents.values()].filter(a=>a.phase!=='DEAD').length,dead:[...this.agents.values()].filter(a=>a.phase==='DEAD').length,attacks:this.attacks,airStrokes:this.airStrokes,phases:[...this.agents.values()].map(a=>({id:a.id,phase:a.phase,loadMass:Number.isFinite(a.loadMass)?a.loadMass:null}))};}
}
export const DROP_FORMS=['whole','missing-arm','missing-leg','upper-half','lower-half','left-half'] as const;
export type DropForm=typeof DROP_FORMS[number];
export function dropOptions(factory:RagdollFactory,type:NpcType,form:DropForm):RagdollOptions{
 if(form==='whole')return {};
 const missing=form==='missing-arm'?['upperArm1','forearm1']:form==='missing-leg'?['thigh-1','shin-1']:form==='upper-half'?['thigh-1','shin-1','thigh1','shin1']:form==='lower-half'?['head','chest','upperArm-1','upperArm1','forearm-1','forearm1']:['upperArm1','forearm1','thigh1','shin1'];
 if(form!=='upper-half'&&form!=='lower-half'&&form!=='left-half')return {missingLimbs:missing};
 const plan=factory.build(type,vec(),{x:0,y:0,z:0,w:1}),retained=new Map();
 for(const p of plan.parts){if(missing.includes(p.name))continue;if(form==='left-half'&&['head','chest','pelvis'].includes(p.name)){const half=clip(p.poly,vec(1,0,0),0);if(half)retained.set(p.name,half);}else if(p.name==='pelvis'&&form==='upper-half'){const half=clip(p.poly,vec(0,-1,0),0);if(half)retained.set(p.name,half);}else if(p.name==='pelvis'&&form==='lower-half'){const half=clip(p.poly,vec(0,1,0),0);if(half)retained.set(p.name,half);}}
 return {missingLimbs:missing,retainedPolys:retained};
}
