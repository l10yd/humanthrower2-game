import { scaleConnector,type ConnectorVolume } from './Connector';
import { CONFIG, NPC_TYPES, NPC_DISPLAY_MASSES, type NpcType } from '../core/Config';
import { box, vertices, massProperties, type ConvexPolyhedron } from '../slicing/ConvexClipper';
import { CollisionQuery, nearbyColliders, shapeBounds } from '../player/QueryBounds';
import { add, rotate, sub, vec, type Vec3, type Quat } from '../slicing/Math';
import { PhysicsManager, RAPIER, type Part } from './PhysicsManager';
interface Template { name:string; center:Vec3; half:Vec3; mass:number }
export interface RagdollOptions {
  scale?:number;height?:number; width?:number; mass?:number;missingLimbs?:string[]; retainedPolys?:Map<string,ConvexPolyhedron>; owner?:Part['owner']; velocity?:Vec3;
  /** Key is `${parentLimb}:${childLimb}`; tissue in unscaled body-local authoring coordinates. */
  connectors?:ReadonlyMap<string,ConnectorVolume>;
}
const templates:Template[]=[
  {name:'head',center:vec(0,0.76,0),half:vec(.115,.145,.105),mass:5},
  {name:'chest',center:vec(0,.435,0),half:vec(.235,.18,.125),mass:22},
  {name:'pelvis',center:vec(0,.16,0),half:vec(.19,.095,.13),mass:12},
  ...[-1,1].flatMap(s=>[
    {name:`upperArm${s}`,center:vec(s*.34,.43,0),half:vec(.07,.16,.075),mass:3},
    {name:`forearm${s}`,center:vec(s*.34,.10,0),half:vec(.065,.16,.07),mass:2},
    {name:`thigh${s}`,center:vec(s*.115,-.145,0),half:vec(.09,.21,.10),mass:8},
    {name:`shin${s}`,center:vec(s*.115,-.61,.025),half:vec(.07,.25,.11),mass:3.5},
  ]),
];
export class RagdollFactory {
  private npcId=1;
  constructor(private physics:PhysicsManager,private npcScale=1,private massMultiplier=1){}
  build(type:NpcType,position:Vec3,rotation:Quat,options:RagdollOptions={}): {type:NpcType; parts:{name:string;poly:ConvexPolyhedron;queryShape:RAPIER.Cuboid;position:Vec3;mass:number}[]; scale:Vec3} {
    const spec={...NPC_TYPES[type],...options},factor=options.owner==='player'?1:options.scale??this.npcScale;
    const scale=vec(spec.width*factor,spec.height/1.765*factor,spec.width*factor);
    const parts=templates.filter(t=>!options.missingLimbs?.includes(t.name)).map(t=>{const center=vec(t.center.x*scale.x,t.center.y*scale.y,t.center.z*scale.z);
      const original=box(t.half.x*scale.x,t.half.y*scale.y,t.half.z*scale.z),poly=options.retainedPolys?.get(t.name)??original;
      return {name:t.name,poly,queryShape:new RAPIER.Cuboid(t.half.x*scale.x,t.half.y*scale.y,t.half.z*scale.z),position:add(position,rotate(center,rotation)),mass:t.mass*spec.mass/72*(options.owner==='player'?1:this.massMultiplier)*(poly===original?1:massProperties(poly).volume/massProperties(original).volume)};});
    return {type,parts,scale};
  }
  entryHeight(type:NpcType,rotation:Quat,options:RagdollOptions={}){
    const plan=this.build(type,vec(),rotation,options);
    const bottom=Math.min(...plan.parts.flatMap(p=>vertices(p.poly).map(v=>p.position.y+rotate(v,rotation).y)));
    return CONFIG.arena.height+CONFIG.entry.clearance-bottom;
  }
  horizontalEnvelope(type:NpcType,rotation:Quat):{min:number;max:number} {
    const plan=this.build(type,vec(),rotation),points=plan.parts.flatMap(p=>vertices(p.poly).map(v=>p.position.x+rotate(v,rotation).x));
    return {min:Math.min(...points),max:Math.max(...points)};
  }
  fitSpawnX(type:NpcType,x:number,rotation:Quat):number|null {
    const bounds=this.horizontalEnvelope(type,rotation),min=-CONFIG.arena.width/2+.005-bounds.min,max=CONFIG.arena.width/2-.005-bounds.max;
    return min>max?null:Math.min(max,Math.max(min,x));
  }
  canSpawn(type:NpcType,position:Vec3,rotation:Quat,options:RagdollOptions={}):boolean {
    const plan=this.build(type,position,rotation,options);
    this.physics.world.propagateModifiedBodyPositionsToColliders();
    // Newly created worlds have no query BVH until their first step. Direct contacts
    // validate the tiny (11-part) spawn plan even before that first simulation tick.
    const external=(c:Parameters<PhysicsManager['partForCollider']>[0])=>c.isEnabled()&&!c.isSensor()&&(options.owner==='player'||!this.physics.isPlayerCeiling(c));
    const query=new CollisionQuery(this.physics,external);
    for(const p of plan.parts) {
      const shape=p.queryShape;
      for(const c of nearbyColliders(this.physics,shapeBounds(shape,p.position,rotation),external,query)){
        const contact=c.contactShape(shape,p.position,rotation,0);if(contact&&contact.distance<-.002)return false;
      }
    }return true;
  }
  spawn(type:NpcType,position:Vec3,rotation:Quat,checkOverlap=true,options:RagdollOptions={}):Part[]|null {
    const plan=this.build(type,position,rotation,options);
    if(options.owner!=='player'&&[...this.physics.parts.values()].filter(p=>p.owner==='npc').length+plan.parts.length>CONFIG.physics.spawnReserve)return null;
    this.physics.checkGeometryBudget([],plan.parts.map(p=>p.poly));
    if(checkOverlap&&!this.canSpawn(type,position,rotation,options))return null;
    const npcId=options.owner==='player'?0:this.npcId++,parts:Part[]=[];
    try {
    for(const p of plan.parts){const part=this.physics.createPart(p.poly,{position:p.position,rotation},p.mass,npcId,p.name,0,undefined,options.owner);part.renderScale={...plan.scale};if(options.owner!=='player')part.gameplayMassScale=NPC_DISPLAY_MASSES[type]/(NPC_TYPES[type].mass*this.massMultiplier);parts.push(part);}
    parts.forEach(p=>p.body.setLinvel(options.velocity??vec(0,-.8,0),true));
    const byName=new Map(parts.map(p=>[p.limb,p]));const scale=plan.scale;
    const radians=(n:number)=>n*Math.PI/180;
    const joint=(aName:string,bName:string,anchor:Vec3,hinge:boolean,degrees:[number,number][])=>{
      const a=byName.get(aName),b=byName.get(bName);if(!a||!b)return;
      const scaled=vec(anchor.x*scale.x,anchor.y*scale.y,anchor.z*scale.z);
      const local=(name:string)=>{const t=templates.find(t=>t.name===name)!;
        return sub(scaled,vec(t.center.x*scale.x,t.center.y*scale.y,t.center.z*scale.z));};
      const connector=options.connectors?.get(`${aName}:${bName}`);
      this.physics.createJoint({a:a.id,b:b.id,anchorA:local(aName),anchorB:local(bName),axis:vec(1,0,0),hinge,
        ...(connector?{connector:scaleConnector(connector,scale)}:{}),
        limits:degrees.map(([min,max])=>[radians(min),radians(max)])});
    };
    joint('chest','head',vec(0,.615,0),false,[[-30,30],[-40,40],[-30,30]]);
    joint('pelvis','chest',vec(0,.255,0),false,[[-20,20],[-15,15],[-20,20]]);
    for(const s of [-1,1]) {
      joint('chest',`upperArm${s}`,vec(s*.265,.57,0),false,[[-55,55],[-40,40],[-55,55]]);
      joint(`upperArm${s}`,`forearm${s}`,vec(s*.34,.265,0),true,[[0,135]]);
      joint('pelvis',`thigh${s}`,vec(s*.115,.065,0),false,[[-25,65],[-25,25],[-35,35]]);
      joint(`thigh${s}`,`shin${s}`,vec(s*.115,-.36,0),true,[[-130,0]]);
    }
    return parts;
    }catch(error){for(const p of parts)this.physics.removePart(p.id);throw error;}
  }
}
