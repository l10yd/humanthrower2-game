import { canCarryWeapon } from './WeaponSupplies';
import { WeaponInventory } from './WeaponInventory';
import { CONFIG } from '../core/Config';
import { PhysicsManager, RAPIER } from '../physics/PhysicsManager';
import { CollisionQuery, overlaps, shapeBounds, sweptBounds } from '../player/QueryBounds';
import type { PlayerController } from '../player/PlayerController';
import type { InputFrame } from '../player/Input';
import { SawController } from './SawController';
import { bitePart, consumePart, severJoint, splitPart, type CutResult } from '../slicing/Dismemberment';
import { add, axisAngle, dot, length, mul, normalize, rotate, sub, vec, type Vec3 } from '../slicing/Math';
export const WEAPONS={saw:'Пила',axe:'Топор',sword:'Меч',launcher:'Гранатомёт',svarl:'Рука Сварла',rotor:'Лопасти вертолёта',svarlHead:'Голова Сварла'} as const;
export type WeaponKind=keyof typeof WEAPONS;
export interface Grenade {position:Vec3;previous:Vec3;velocity:Vec3;life:number}
export interface Blast {position:Vec3;life:number}
/** Bounded weapon actions reuse the same atomic dismemberment path as the saw. */
export class WeaponController {
  selected:WeaponKind='saw';active=false;cuts:CutResult[]=[];grenades:Grenade[]=[];blasts:Blast[]=[];
  shots=0;strikes=0;thrusts=0;bites=0;eatenMass=0;swing=0;attackMode:'chop'|'thrust'='chop';unavailable=false;
  rotorAngle=0;headTarget:number|null=null;rotorCuts=0;
  private cooldown=0;
  inventory=new WeaponInventory();lastBroken:WeaponKind|null=null;
  constructor(private physics:PhysicsManager,private player:PlayerController,public saw:SawController,public limited=false){if(limited)this.saw.enabled=false;}
  get enabled(){return this.saw.enabled&&(!this.limited||this.inventory.has(this.selected));}
  collect(kind:WeaponKind){this.inventory.collect(kind);this.select(kind);this.saw.enabled=true;}
  select(kind:string){if(!Object.hasOwn(WEAPONS,kind)||this.limited&&!this.inventory.has(kind as WeaponKind))return;this.cancel();this.selected=kind as WeaponKind;}
  cycle(){const kinds=this.limited?this.inventory.kinds:Object.keys(WEAPONS) as WeaponKind[];if(kinds.length)this.select(kinds[(kinds.indexOf(this.selected)+1)%kinds.length]);}
  toggle(){if(this.limited&&!this.inventory.has(this.selected))return;this.saw.toggle();this.cancel();}
  cancel(){this.player.flight=false;this.player.damage.headImmune=false;this.headTarget=null;this.saw.cancel();this.active=false;this.swing=0;}
  /** Refreshed before row cuts too: release/equip changes cannot leave immunity stale. */
  refreshHeadProtection(held:boolean){
    this.player.damage.headImmune=held&&this.enabled&&(this.selected==='rotor'||this.selected==='svarlHead')&&this.player.damage.has('head')&&this.player.damage.alive&&!this.player.ragdoll.dead;
  }
  pose(){return this.saw.pose();}
  private query(){return new CollisionQuery(this.physics,c=>c.isEnabled()&&!c.isSensor()&&c.handle!==this.player.collider.handle&&this.physics.partForCollider(c)?.owner!=='player');}
  tickProjectiles(dt:number){this.cuts=[];this.physics.world.propagateModifiedBodyPositionsToColliders();this.blastsTick(dt);this.moveGrenades(dt);}
  update(input:InputFrame,dt:number){
    const shots=this.shots;this.lastBroken=null;this.tickProjectiles(dt);const projectileCuts=this.cuts.length;this.performUpdate(input,dt);
    if(!this.limited||!this.active)return;
    const continuous=['saw','svarl','rotor','svarlHead'].includes(this.selected);
    const wear=this.selected==='launcher'?this.shots-shots:dt*(continuous?4:1.5)+(this.cuts.length-projectileCuts)*2;
    if(this.inventory.use(this.selected,wear)){
      this.lastBroken=this.selected;this.cancel();
      const next=this.inventory.kinds.find(kind=>canCarryWeapon(this.player.damage,kind));if(next){this.select(next);this.saw.enabled=true;}else this.saw.enabled=false;
    }
  }
  private performUpdate(input:InputFrame,dt:number){
    this.cooldown=Math.max(0,this.cooldown-dt);this.swing=Math.max(0,this.swing-dt/.3);
    if(input.axis)this.saw.facing=Math.sign(input.axis);
    // A severed arm cannot hold a weapon. Use the surviving arm if possible.
    const arm=(s:number)=>this.player.damage.has(`upperArm${s}`)&&this.player.damage.has(`forearm${s}`);
    if(!arm(this.saw.facing)&&arm(-this.saw.facing))this.saw.facing=-this.saw.facing;
    this.unavailable=!canCarryWeapon(this.player.damage,this.selected)||this.player.ragdoll.dead;
    const melee=this.selected==='axe'||this.selected==='sword';
    this.active=this.enabled&&!this.unavailable&&!!(input.saw||melee&&input.thrust);
    this.refreshHeadProtection(this.active);
    this.player.flight=this.active&&this.selected==='rotor'&&!this.player.ragdoll.down;
    if(this.selected==='rotor'){this.saw.cancel();if(this.active){this.rotorAngle+=dt*42;this.rotor(dt);}return;}
    if(this.selected==='svarlHead'){this.saw.cancel();if(this.active)this.autoBite(dt);else this.headTarget=null;return;}
    if(this.selected==='saw'){
      const cut=this.saw.update({...input,saw:this.active},dt);if(cut)this.cuts.push(cut);this.cuts.push(...this.saw.guard.cuts);return;
    }
    this.saw.cancel();this.saw.guard.cuts=[];
    if(!this.active||this.cooldown>0)return;
    const pose=this.pose();this.swing=1;
    if(this.selected==='launcher'){
      if(this.grenades.length>=8)return;
      // Start at the hand and sweep the barrel too, never spawn through a wall.
      this.grenades.push({position:{...pose.base},previous:{...pose.base},velocity:mul(pose.direction,15),life:2});this.shots++;this.cooldown=.8;
    }else if(this.selected==='svarl'){this.bite();this.cooldown=.24;}
    else {this.attackMode=input.thrust?'thrust':'chop';this.strike();this.cooldown=this.attackMode==='thrust'?.32:this.selected==='axe'?.58:.36;}
  }
  private headCenter(){const head=this.player.ragdoll.parts.find(p=>p.limb==='head');return head?{...head.body.translation()}:add(this.player.current,vec(0,CONFIG.player.height*.42,0));}
  private rotor(dt:number){
    const center=add(this.headCenter(),vec(0,.25,0)),blade=new RAPIER.Cuboid(1.6,.13,.85),query=this.query();let budget=8;
    const nearby=query.nearby(shapeBounds(blade,center,{x:0,y:0,z:0,w:1}));
    for(const c of nearby){const part=this.physics.partForCollider(c);if(!part||part.owner!=='npc'||budget<=0)continue;
      const hit=c.contactShape(blade,center,{x:0,y:0,z:0,w:1},.05),sweep=c.castShape(part.body.linvel(),blade,center,{x:0,y:0,z:0,w:1},vec(this.player.vx,this.player.jump.vy,0),0,dt,true);
      if(!hit&&!sweep)continue;
      const point=hit?.point1??part.body.worldCom(),direction=normalize(sub(part.body.worldCom(),center));
      const ray=new RAPIER.Ray(center,normalize(sub(point,center)));if(this.physics.world.castRay(ray,length(sub(point,center)),false,undefined,undefined,undefined,undefined,x=>!this.physics.partForCollider(x)&&x.handle!==this.player.collider.handle))continue;
      const cut=splitPart(this.physics,part.id,{...part.body.worldCom()},this.rotorCuts%2?vec(1,0,0):vec(0,1,0));
      if(cut){budget--;this.rotorCuts++;this.cuts.push(cut);const pieces=[...cut.replacement!.survivorIds];
       for(const id of pieces){const p=this.physics.parts.get(id)!;const second=budget>0?splitPart(this.physics,id,{...p.body.worldCom()},vec(0,0,1)):null;
        if(second){budget--;this.rotorCuts++;this.cuts.push(second);}
        for(const sid of second?.replacement?.survivorIds??[id]){const survivor=this.physics.parts.get(sid)!;const sign=sid%2?1:-1;survivor.body.applyImpulse(vec(sign*Math.min(25,survivor.body.mass()*6),Math.min(18,survivor.body.mass()*4),direction.z*Math.min(6,survivor.body.mass()*2)),true);}
       }
      }
    }
  }
  private autoBite(dt:number){
    const base=this.headCenter(),mouth=new RAPIER.Ball(CONFIG.svarlHead.radius),rotation={x:0,y:0,z:0,w:1},bounds=shapeBounds(mouth,base,rotation)!;
    const head=this.player.ragdoll.parts.find(p=>p.limb==='head'),velocity=head?{...head.body.linvel()}:vec(this.player.vx,this.player.jump.vy,0);
    this.headTarget=null;
    const walls=this.query().nearby(null).filter(c=>!this.physics.partForCollider(c));
    // Test all live NPC IDs against a swept broad phase: a fast incoming body
    // can cross the entire mouth between ticks. Never retain deleted handles.
    for(const part of [...this.physics.parts.values()]){
      if(part.owner!=='npc'||!part.collider.isEnabled()||part.collider.isSensor())continue;
      const c=part.collider,pos={...c.translation()},relative=sub(part.body.linvel(),velocity);
      const sweepBounds=sweptBounds(c.shape,pos,add(pos,mul(relative,dt)));
      if(sweepBounds&&!overlaps(bounds,sweepBounds))continue;
      const contact=c.contactShape(mouth,base,rotation,.002);
      const sweep=contact?null:c.castShape(part.body.linvel(),mouth,base,rotation,velocity,0,dt,true);
      if(!contact&&!sweep)continue;
      const point=contact?.point1??c.projectPoint(base,true)?.point??part.body.worldCom(),offset=sub(point,base),distance=length(offset);
      if(distance>1e-6){
        const ray=new RAPIER.Ray(base,normalize(offset));
        if(walls.some(x=>x.castRay(ray,distance,true)>=0))continue;
      }
      const cut=consumePart(this.physics,part.id,point,distance>1e-6?mul(normalize(offset),-1):vec(0,1,0));
      if(cut){this.headTarget=part.id;this.cuts.push(cut);this.bites++;this.eatenMass+=cut.removedMass;}
    }
  }
  private blastsTick(dt:number){this.blasts=this.blasts.filter(b=>{b.life-=dt;return b.life>0;});}
  private strike(){
    const {base,direction,normal,angle}=this.pose(),thrust=this.attackMode==='thrust',reach=(this.selected==='axe'?1.8:2.8)+(thrust?.35:0),width=thrust?.13:this.selected==='axe'?.5:.38;
    const blade=new RAPIER.Cuboid(reach/2,width,.7),center=add(base,mul(direction,reach/2)),rotation=axisAngle(vec(0,0,1),angle);
    const nearby=this.query().nearby(shapeBounds(blade,center,rotation)),ray=new RAPIER.Ray(base,direction);
    let obstruction=reach;for(const c of nearby)if(!this.physics.partForCollider(c)){const t=c.castRay(ray,reach,true);if(t>=0&&Number.isFinite(t))obstruction=Math.min(obstruction,t);}
    const candidates=nearby.map(c=>this.physics.partForCollider(c)).filter(p=>p?.owner==='npc').filter(p=>{
      const contact=p!.collider.contactShape(blade,center,rotation,0);
      const along=contact?dot(sub(contact.point1,base),direction):Infinity;
      return along>=-.1&&along<=obstruction&&!!contact&&contact.distance<=0;
    }).sort((a,b)=>length(sub(a!.body.worldCom(),base))-length(sub(b!.body.worldCom(),base))).slice(0,thrust||this.selected==='axe'?1:3);
    for(const p of candidates){
      const part=p!,point={...part.body.worldCom()};part.body.wakeUp();
      const impulse=mul(direction,Math.min(thrust?10:16,part.body.mass()*2));part.body.applyImpulse(impulse,true);
      let cut=splitPart(this.physics,part.id,point,thrust?direction:normal);
      if(!cut){
        const joint=[...this.physics.joints.values()].find(j=>j.a===part.id||j.b===part.id);
        if(joint){const a=this.physics.parts.get(joint.a)!;const anchor=add(a.body.translation(),rotate(joint.anchorA,a.body.rotation()));if(length(sub(anchor,base))<=obstruction)cut=severJoint(this.physics,joint.id);}
      }
      if(cut){this.cuts.push(cut);
        for(const id of cut.replacement?.survivorIds??[part.id]){const survivor=this.physics.parts.get(id);if(survivor)survivor.body.applyImpulse(mul(direction,Math.min(12,survivor.body.mass()*2)),true);}
      }
    }
    if(candidates.length){this.strikes++;if(thrust)this.thrusts++;}
  }
  private bite(){
    const {base,direction}=this.pose(),ray=new RAPIER.Ray(base,direction),reach=1.85;
    const mouth=new RAPIER.Ball(.58),center=add(base,mul(direction,1.05));
    const bounds=shapeBounds(new RAPIER.Ball(reach),base,axisAngle(vec(0,0,1),0));
    let obstruction=reach;const nearby=this.query().nearby(bounds);
    for(const c of nearby)if(!this.physics.partForCollider(c)){const t=c.castRay(ray,reach,true);if(t>=0&&Number.isFinite(t))obstruction=Math.min(obstruction,t);}
    const candidates=nearby.map(c=>this.physics.partForCollider(c)).filter(p=>p?.owner==='npc').filter(p=>{
      const contact=p!.collider.contactShape(mouth,center,{x:0,y:0,z:0,w:1},0);
      const nearest=p!.collider.projectPoint(base,true)?.point??p!.body.worldCom(),along=dot(sub(nearest,base),direction);
      return along>=-.05&&along<=obstruction&&!!contact&&contact.distance<=0;
    }).sort((a,b)=>length(sub(a!.body.worldCom(),base))-length(sub(b!.body.worldCom(),base)));
    const part=candidates[0];if(!part)return;
    const cut=bitePart(this.physics,part.id,direction,.35);if(cut){this.cuts.push(cut);this.eatenMass+=cut.removedMass;this.bites++;}
  }
  private moveGrenades(dt:number){
    if(!this.grenades.length)return;
    this.grenades=this.grenades.filter(g=>{
      // Explosions replace colliders: each grenade needs fresh live handles.
      const query=this.query();
      g.previous={...g.position};g.life-=dt;g.velocity.y-=9.81*dt;
      const delta=mul(g.velocity,dt),distance=length(delta),ray=new RAPIER.Ray(g.position,normalize(delta));
      const end=add(g.position,delta),bounds={min:vec(Math.min(g.position.x,end.x)-.12,Math.min(g.position.y,end.y)-.12,Math.min(g.position.z,end.z)-.12),max:vec(Math.max(g.position.x,end.x)+.12,Math.max(g.position.y,end.y)+.12,Math.max(g.position.z,end.z)+.12)};
      let t=1;
      for(const c of query.nearby(bounds)){
        const hit=c.castShape(vec(),new RAPIER.Ball(.12),g.position,{x:0,y:0,z:0,w:1},delta,0,1,true);
        if(hit)t=Math.min(t,hit.time_of_impact);
        const rayHit=c.castRay(ray,distance,true);if(rayHit>=0&&Number.isFinite(rayHit)&&distance>0)t=Math.min(t,rayHit/distance);
      }
      g.position=add(g.position,mul(delta,t));
      if(Math.abs(g.position.x)>CONFIG.arena.width/2||g.position.y<0||g.position.y>CONFIG.arena.height||Math.abs(g.position.z)>CONFIG.arena.depth/2)return false;
      if(t<1||g.life<=0){this.explode(g.position);return false;}
      return true;
    });
  }
  detonate(point:Vec3){this.explode(point);}
  private explode(point:Vec3){
    this.blasts.push({position:{...point},life:.35});if(this.blasts.length>8)this.blasts.shift();
    const radius=2.2,shape=new RAPIER.Ball(radius),parts=this.query().nearby(shapeBounds(shape,point,{x:0,y:0,z:0,w:1})).map(c=>this.physics.partForCollider(c)).filter(p=>p?.owner==='npc');
    let cutBudget=10;
    for(const p of parts){
      const part=p!,offset=sub(part.body.worldCom(),point),distance=length(offset);if(distance>radius)continue;
      const direction=distance>.01?normalize(offset):vec(0,1,0);
      // Arena walls occlude blast effects too.
      const ray=new RAPIER.Ray(point,direction);
      if(this.physics.world.castRay(ray,distance,false,undefined,undefined,undefined,undefined,c=>!this.physics.partForCollider(c)&&c.handle!==this.player.collider.handle))continue;
      const impulse=mul(add(direction,vec(0,.3,0)),Math.min(24,part.body.mass()*4)*(1-distance/radius));
      let cut:CutResult|null=null;if(cutBudget>0){cut=splitPart(this.physics,part.id,{...part.body.worldCom()},vec(-direction.y,direction.x,0));if(cut){cutBudget--;this.cuts.push(cut);}}
      for(const id of cut?.replacement?.survivorIds??[part.id])this.physics.parts.get(id)?.body.applyImpulse(impulse,true);
    }
  }
  get snapshot(){return {limited:this.limited,inventory:{...this.inventory.stock},durability:this.inventory.percent(this.selected),broken:this.inventory.broken,headImmune:this.player.damage.headImmune,rotorCuts:this.rotorCuts,rotorAngle:this.rotorAngle,headTarget:this.headTarget,flight:this.player.flight,selected:this.selected,enabled:this.enabled,active:this.active,unavailable:this.unavailable,shots:this.shots,strikes:this.strikes,thrusts:this.thrusts,attackMode:this.attackMode,bites:this.bites,eatenMass:this.eatenMass,grenades:this.grenades.length,blasts:this.blasts.length};}
}
