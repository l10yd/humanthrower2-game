import { CONFIG,randomSeed } from '../core/Config';
import { type Part,type PhysicsManager } from '../physics/PhysicsManager';
import { add,mul,pointVelocity,rotate,vec } from '../slicing/Math';
interface FreshDrop {ids:number[];born:number;phase:number;frequency:number;strength:number}
/** Short-lived motion of every fresh demo drop, independent of the limited
 * ground AI population. Joint strokes stop on landing; dead drops stay passive. */
export class FreshDropMotion {
 private drops:FreshDrop[]=[];strokes=0;
 constructor(private physics:PhysicsManager){}
 register(parts:Part[],now:number,seed:number){
  if(!parts.length)return;const random=randomSeed(seed),spin=vec((random()-.5)*1.6,(random()-.5)*1.2,(random()-.5)*3.4);
  const mass=parts.reduce((s,p)=>s+p.body.mass(),0),center=mul(parts.reduce((s,p)=>add(s,mul(p.body.worldCom(),p.body.mass())),vec()),1/mass);
  const velocity=vec((random()-.5)*1.1,-.8-random()*1.8,0);
  for(const p of parts){p.body.setLinvel(pointVelocity(velocity,spin,p.body.worldCom(),center),true);p.body.setAngvel(spin,true);}
  this.drops.push({ids:parts.map(p=>p.id),born:now,phase:random()*Math.PI*2,frequency:3+random()*5,strength:.7+random()*.6});
 }
 private passive(ids:Set<number>){const raw=this.physics.world.impulseJoints.raw;for(const j of this.physics.joints.values())if(ids.has(j.a)&&ids.has(j.b))for(const axis of j.hinge?[3]:[3,4,5]){raw.jointConfigureMotorVelocity(j.handle,axis,0,CONFIG.physics.jointDamping);raw.jointSetMotorMaxForce(j.handle,axis,CONFIG.physics.jointMaxTorque);}}
 update(now:number){
  this.drops=this.drops.filter(drop=>{
   const parts=drop.ids.map(id=>this.physics.parts.get(id)).filter((p):p is Part=>!!p),ids=new Set(parts.map(p=>p.id));let landed=false;
   for(const p of parts){p.body.resetTorques(false);}
   for(const p of parts)this.physics.world.contactPairsWith(p.collider,c=>{if(ids.has(this.physics.partForCollider(c)?.id??-1))return;const contact=p.collider.contactCollider(c,.02);if(contact&&contact.distance<=.02)landed=true;});
   if(!parts.length||landed||now-drop.born>5){this.passive(ids);return false;}
   const raw=this.physics.world.impulseJoints.raw;
   for(const j of this.physics.joints.values()){
    if(!ids.has(j.a)||!ids.has(j.b))continue;const p=this.physics.parts.get(j.b)!,parent=this.physics.parts.get(j.a)!;
    if(!/upperArm|forearm|thigh|shin/.test(p.limb))continue;
    const phase=drop.phase+(now-drop.born)*drop.frequency+(p.limb.endsWith('-1')?Math.PI:0)+(p.limb.startsWith('shin')?1.2:0);
    for(const [i,axis] of (j.hinge?[3]:[3,4,5]).entries()){
     const [min,max]=j.limits[i]??[-.3,.3],target=(min+max)/2+(max-min)*.38*Math.sin(phase+i*1.6);
     raw.jointConfigureMotorPosition(j.handle,axis,target,14,2);raw.jointSetMotorMaxForce(j.handle,axis,12*drop.strength);
    }
    // Equal/opposite muscular torque, scaled by the limb mass and length.
    // This bends joints without manufacturing net whole-body lift in free fall.
    const scale=p.renderScale?.y??1,torque=rotate(vec(Math.sin(phase)*p.body.mass()*scale*scale*1.8*drop.strength,0,0),parent.body.rotation());
    p.body.addTorque(torque,true);parent.body.addTorque(mul(torque,-1),true);this.strokes++;
   }
   return true;
  });
 }
 get snapshot(){return {active:this.drops.length,strokes:this.strokes};}
}
