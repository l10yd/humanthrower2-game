import { CONFIG } from '../core/Config';
import { pointVelocity, dot, sub, type Vec3 } from '../slicing/Math';
import type { PhysicsManager, Part } from './PhysicsManager';
export interface PhysicalImpact {partId:number;npcId:number;otherNpcId:number|null;otherPartId:number|null;point:Vec3;normal:Vec3;speed:number;impulse:number;mass:number;time:number}
interface Motion {velocity:Vec3;angular:Vec3;com:Vec3;mass:number}
/** Observational contact SFX. The pre-step normal approach must be real AND the
 * solved pair impulse nonzero. Static load, same-family contacts and glancing
 * tangential motion cannot emit impact events. No forces or survival mutations. */
export class ImpactEffects {
  enabled=true;events:PhysicalImpact[]=[];total=0;updateMs=0;
  private before=new Map<number,Motion>();private pending=new Map<string,PhysicalImpact>();
  private pairUntil=new Map<string,number>();private npcUntil=new Map<number,number>();private emitted:number[]=[];
  begin(){this.events=[];this.pending.clear();}
  sample(physics:PhysicsManager){
    this.before.clear();if(!this.enabled)return;
    for(const p of physics.parts.values())this.before.set(p.id,{velocity:{...p.body.linvel()},angular:{...p.body.angvel()},com:{...p.body.worldCom()},mass:p.body.mass()});
  }
  observe(physics:PhysicsManager,handleA:number,handleB:number,force:number,dt:number,time:number){
    if(!this.enabled||!Number.isFinite(force)||force*dt<CONFIG.impactFx.minImpulse)return;
    const ca=physics.world.getCollider(handleA),cb=physics.world.getCollider(handleB);if(!ca||!cb)return;
    const a=physics.partForCollider(ca),b=physics.partForCollider(cb);
    if(!a&&!b||a&&b&&a.npcId===b.npcId)return;
    const npc=a?.owner==='npc'?a:b?.owner==='npc'?b:null;if(!npc)return;
    const contact=ca.contactCollider(cb,.05);if(!contact)return;
    const normal={...contact.normal1},point={...contact.point1};
    const velocity=(p:Part|undefined)=>{const m=p&&this.before.get(p.id);return m?pointVelocity(m.velocity,m.angular,point,m.com):{x:0,y:0,z:0};};
    const speed=dot(sub(velocity(a),velocity(b)),normal);
    if(!Number.isFinite(speed)||speed<CONFIG.impactFx.minSpeed)return;
    const other=npc===a?b:a;
    const key=other?`${Math.min(npc.npcId,other.npcId)}:${Math.max(npc.npcId,other.npcId)}`:`${npc.npcId}:static`;
    const mass=this.before.get(npc.id)?.mass??npc.body.mass();
    const event:PhysicalImpact={partId:npc.id,npcId:npc.npcId,otherNpcId:other?.npcId??null,otherPartId:other?.id??null,
      point,normal:npc===a?{x:-normal.x,y:-normal.y,z:-normal.z}:normal,speed,impulse:force*dt,mass,time};
    const prior=this.pending.get(key);if(!prior||event.impulse>prior.impulse)this.pending.set(key,event);
  }
  finish(time:number){
    const start=performance.now();this.emitted=this.emitted.filter(t=>time-t<1);
    for(const [key,until]of this.pairUntil)if(until<=time)this.pairUntil.delete(key);
    for(const [key,until]of this.npcUntil)if(until<=time)this.npcUntil.delete(key);
    for(const [key,e]of [...this.pending].sort((a,b)=>b[1].impulse-a[1].impulse)){
      if(this.events.length>=CONFIG.impactFx.maxPerTick||this.emitted.length>=CONFIG.impactFx.maxPerSecond)break;
      if((this.pairUntil.get(key)??0)>time||(this.npcUntil.get(e.npcId)??0)>time||e.otherNpcId!==null&&(this.npcUntil.get(e.otherNpcId)??0)>time)continue;
      this.events.push(e);this.total++;this.emitted.push(time);this.pairUntil.set(key,time+CONFIG.impactFx.pairCooldown);
      this.npcUntil.set(e.npcId,time+CONFIG.impactFx.npcCooldown);
      if(e.otherNpcId!==null)this.npcUntil.set(e.otherNpcId,time+CONFIG.impactFx.npcCooldown);
    }
    this.pending.clear();this.updateMs=performance.now()-start;
  }
  reset(){this.events=[];this.before.clear();this.pending.clear();this.pairUntil.clear();this.npcUntil.clear();this.emitted=[];this.total=0;this.updateMs=0;}
  get snapshot(){return {total:this.total,events:this.events.length};}
}
