import { CONFIG, randomSeed } from '../core/Config';
import { RAPIER, type Part, type PhysicsManager } from '../physics/PhysicsManager';
import { CollisionQuery } from '../player/QueryBounds';
import type { PhysicalImpact } from '../physics/ImpactEffects';
import type { SawContact } from './SawController';
import { contains } from '../slicing/ConvexClipper';
import type { CutResult, Wound } from '../slicing/Dismemberment';
import { add, conjugate, dot, length, mul, normalize, rotate, sub, vec, type Vec3 } from '../slicing/Math';
import { readBlood, saveBlood, validateBlood, type BloodMode, type BloodStorage } from './BloodSettings';
export interface BloodDrop {position:Vec3;velocity:Vec3;life:number;size:number;sourcePartId?:number}
export interface BloodStain {position:Vec3;normal:Vec3;size:number;angle:number;age:number;partId?:number}
interface Bleeder extends Wound {life:number;next:number}
/** Read-only swept visual particles; no colliders, forces, physics RNG or mesh edits. */
export class GoreSystem {
  drops:BloodDrop[]=[];stains:BloodStain[]=[];wounds:Bleeder[]=[];emitted=0;
  mode:BloodMode;updateMs=0;rayTests=0;candidateChecks=0;
  private sprayBudget=0;private random=randomSeed(70413);
  constructor(private storage:BloodStorage|null=null){this.mode=readBlood(storage);}
  configure(value:unknown){this.mode=validateBlood(value);saveBlood(this.storage,this.mode);
    if(this.mode==='off'){this.drops=[];this.stains=[];this.wounds=[];this.sprayBudget=0;}
  }
  private get amount(){return this.mode==='full'?1:this.mode==='reduced'?.25:0;}
  burst(point:Vec3,normal:Vec3,count=65){
    for(let i=0;i<Math.round(count*this.amount);i++)this.drop(point,add(mul(normal,1+this.random()*2.8),vec((this.random()-.5)*4,this.random()*3,(this.random()-.5)*3)));
  }
  private survivor(physics:PhysicsManager|undefined,ids:number[],point:Vec3):Part|undefined {
    return physics&&ids.map(id=>physics.parts.get(id)).find(p=>p&&contains(p.poly,point));
  }
  cut(result:CutResult,physics?:PhysicsManager){
    if(this.mode==='off')return;
    const replacement=result.replacement;
    if(replacement){
      this.wounds=this.wounds.flatMap(w=>{
        if(w.partId!==replacement.sourceId)return [w];
        const survivor=this.survivor(physics,replacement.survivorIds,w.point);
        return survivor?[{...w,partId:survivor.id}]:[];
      });
      this.stains=this.stains.flatMap(s=>{
        if(s.partId!==replacement.sourceId)return [s];
        const survivor=this.survivor(physics,replacement.survivorIds,s.position);
        return survivor?[{...s,partId:survivor.id}]:[];
      });
    }
    this.burst(result.point,result.normal);
    this.wounds.push(...result.wounds.map(w=>({...w,life:CONFIG.gore.woundSeconds,next:0})));
    if(this.wounds.length>CONFIG.gore.maxWounds)this.wounds.splice(0,this.wounds.length-CONFIG.gore.maxWounds);
  }
  collision(event:PhysicalImpact){
    // Small external-impact burst, distinct from the much larger saw cut burst.
    this.burst(event.point,event.normal,Math.min(10,4+Math.floor(event.speed/3)));
  }
  sawContact(contact:SawContact|null,dt:number){
    if(!contact||!this.amount){this.sprayBudget=0;return;}
    this.sprayBudget+=dt*70*this.amount;
    const count=Math.min(12,Math.floor(this.sprayBudget));this.sprayBudget-=count;
    for(let i=0;i<count;i++)this.drop(contact.point,add(mul(contact.normal,.6+this.random()*1.2),vec((this.random()-.5)*1.8,this.random()*1.5,(this.random()-.5)*1.5)),contact.partId);
  }
  private drop(point:Vec3,velocity:Vec3,sourcePartId?:number){
    if(this.drops.length>=CONFIG.gore.maxDrops)this.drops.shift();
    this.drops.push({position:{...point},velocity,life:3,size:.025+this.random()*.045,sourcePartId});this.emitted++;
  }
  private stain(point:Vec3,normal:Vec3,part?:Part){
    if(this.stains.length>=CONFIG.gore.maxStains)this.stains.shift();
    const inverse=part?conjugate({...part.body.rotation()}):null;
    const position=part?rotate(sub(point,part.body.translation()),inverse!):point;
    this.stains.push({position:{...position},normal:inverse?rotate(normal,inverse):{...normal},size:.07+this.random()*.18,angle:this.random()*Math.PI*2,age:0,partId:part?.id});
  }
  /** Static arena planes are analytic segment hits; NPC surfaces use the nearest
   * narrow-phase ray intersection, even for fast drops crossing a thin limb. */
  private impact(physics:PhysicsManager,query:CollisionQuery,drop:BloodDrop,from:Vec3,to:Vec3):boolean {
    const delta=sub(to,from),distance=length(delta);if(distance<1e-8)return false;
    let hit:{t:number;point:Vec3;normal:Vec3;part?:Part}|null=null;
    const plane=(n:Vec3,d:number)=>{const a=dot(n,from)-d,b=dot(n,to)-d;if(a<=0&&b>0){const t=-a/(b-a);if(!hit||t<hit.t)hit={t,point:add(from,mul(delta,t)),normal:mul(n,-1)};}};
    plane(vec(0,-1,0),-.015);plane(vec(0,1,0),CONFIG.arena.height-.015);
    for(const s of [-1,1]){plane(vec(s,0,0),CONFIG.arena.width/2-.015);plane(vec(0,0,s),CONFIG.arena.depth/2-.015);}
    const ray=new RAPIER.Ray(from,delta);
    const bounds={min:vec(Math.min(from.x,to.x),Math.min(from.y,to.y),Math.min(from.z,to.z)),max:vec(Math.max(from.x,to.x),Math.max(from.y,to.y),Math.max(from.z,to.z))};
    for(const c of query.nearby(bounds)){
      const part=physics.partForCollider(c);if(!part||part.id===drop.sourcePartId)continue;
      this.rayTests++;
      const inverse=conjugate({...part.body.rotation()}),localFrom=rotate(sub(from,part.body.translation()),inverse);
      if(contains(part.poly,localFrom,0))continue;
      const intersection=c.castRayAndGetNormal(ray,hit?.t??1,false);
      if(!intersection)continue;
      // A particle born inside another primitive should exit instead of staining
      // the far/internal face. Ignore inside-exit hits, accept incoming surfaces.
      const normal=normalize({...intersection.normal});if(dot(normal,delta)>=0)continue;
      const t=intersection.timeOfImpact;
      if(t>=0&&t<=1&&(!hit||t<hit.t))hit={t,point:add(from,mul(delta,t)),normal,part};
    }
    if(!hit)return false;
    this.stain(hit.point,hit.normal,hit.part);return true;
  }
  update(physics:PhysicsManager,dt:number){
    const start=performance.now();this.rayTests=0;this.candidateChecks=0;
    if(this.mode==='off'){this.updateMs=performance.now()-start;return;}
    this.stains=this.stains.filter(s=>{s.age+=dt;return s.partId===undefined||physics.parts.has(s.partId);});
    this.wounds=this.wounds.filter(w=>{
      const p=physics.parts.get(w.partId);if(!p)return false;
      w.life-=dt;w.next-=dt;if(w.life<=0)return false;
      if(w.next<=0){
        const rotation={...p.body.rotation()},normal=rotate(w.normal,rotation),point=add(p.body.translation(),rotate(w.point,rotation));
        this.drop(point,add(p.body.linvel(),add(mul(normal,.4+this.random()*1.2),vec((this.random()-.5)*.8,this.random()*.4,(this.random()-.5)*.8))),p.id);
        w.next=(.045+(1-w.life/CONFIG.gore.woundSeconds)*.3)/this.amount;
      }return true;
    });
    if(this.drops.length){
      physics.world.propagateModifiedBodyPositionsToColliders();
      const query=new CollisionQuery(physics,c=>c.isEnabled()&&!c.isSensor()&&physics.partForCollider(c)?.owner==='npc');
      this.drops=this.drops.filter(drop=>{
        drop.life-=dt;drop.velocity.y-=9.81*dt;
        const from={...drop.position},to=add(from,mul(drop.velocity,dt));
        if(this.impact(physics,query,drop,from,to))return false;
        drop.position=to;return drop.life>0&&to.y>=0&&to.y<=CONFIG.arena.height&&Math.abs(to.x)<=CONFIG.arena.width/2&&Math.abs(to.z)<=CONFIG.arena.depth/2;
      });
      this.candidateChecks=query.candidateChecks;
    }
    this.updateMs=performance.now()-start;
  }
  reset(){this.drops=[];this.stains=[];this.wounds=[];this.emitted=0;this.sprayBudget=0;this.random=randomSeed(70413);this.rayTests=0;this.candidateChecks=0;this.updateMs=0;}
  get snapshot(){return {mode:this.mode,drops:this.drops.length,stains:this.stains.length,bodyStains:this.stains.filter(s=>s.partId!==undefined).length,wounds:this.wounds.length,emitted:this.emitted,rayTests:this.rayTests,candidateChecks:this.candidateChecks,updateMs:this.updateMs};}
}
