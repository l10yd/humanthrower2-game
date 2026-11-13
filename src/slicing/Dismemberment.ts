import { connectorIntersectsSlabs } from '../physics/Connector';
import { CONFIG } from '../core/Config';
import { PhysicsManager, type Joint, type Part } from '../physics/PhysicsManager';
import { clip, massProperties, vertices, type ConvexPolyhedron } from './ConvexClipper';
import { add, conjugate, cross, dot, mul, normalize, pointVelocity, rotate, sub, vec, type Vec3 } from './Math';

export interface Wound {partId:number;point:Vec3;normal:Vec3}
export interface CutResult {point:Vec3;normal:Vec3;wounds:Wound[];fragments:number;removedMass:number;replacement?:{sourceId:number;survivorIds:number[]}}
/** Consume an entire contacted NPC part. No survivor bodies or wound meshes.
 * Adjacent parts remain physical; joints/supports are cleaned up immediately. */
export function consumePart(physics:PhysicsManager,id:number,point:Vec3,normal:Vec3):CutResult|null {
  const part=physics.parts.get(id);if(!part||part.owner!=='npc')return null;
  const removedMass=part.body.mass(),npcId=part.npcId,neighbors=new Set<number>();
  physics.world.contactPairsWith(part.collider,c=>{const p=physics.partForCollider(c);if(p&&p.owner==='npc')neighbors.add(p.id);});
  for(const j of physics.joints.values())if(j.a===id||j.b===id)neighbors.add(j.a===id?j.b:j.a);
  physics.removePart(id);physics.world.propagateModifiedBodyPositionsToColliders();
  physics.deferDetachedContacts(new Set([npcId]),true);
  for(const other of neighbors)physics.parts.get(other)?.body.wakeUp();
  return {point:{...point},normal:normalize(normal),wounds:[],fragments:0,removedMass,replacement:{sourceId:id,survivorIds:[]}};
}
/** Eat a front slab. Eaten geometry is never allocated as a physics body. */
export function bitePart(physics:PhysicsManager,id:number,direction:Vec3,depth=.32):CutResult|null {
  const old=physics.parts.get(id);if(!old||old.owner!=='npc')return null;
  const pose={position:{...old.body.translation()},rotation:{...old.body.rotation()}},worldNormal=normalize(direction),n=rotate(worldNormal,conjugate(pose.rotation));
  const projections=vertices(old.poly).map(v=>dot(n,v)),d=Math.min(...projections)+depth;
  let poly=clip(old.poly,mul(n,-1),-d);
  const massBefore=old.density*massProperties(old.poly).volume;
  if(poly&&massProperties(poly).volume*old.density<Math.max(.15,massBefore*.08))poly=null;
  physics.checkGeometryBudget([id],poly?[poly]:[]);
  const point=add(pose.position,rotate(mul(n,d),pose.rotation)),v={...old.body.linvel()},w={...old.body.angvel()},com={...old.body.worldCom()};
  const saved=[...physics.joints.values()].filter(j=>j.a===id||j.b===id),staged:Part[]=[],joints:Joint[]=[];
  const eatenInterval={lower:dot(worldNormal,pose.position)+Math.min(...projections)-1e-6,upper:dot(worldNormal,pose.position)+d};
  try {
    if(poly){
      const survivor=physics.createPart(poly,pose,0,old.npcId,old.limb,old.generation+1,old.density,old.owner,true);survivor.renderScale=old.renderScale;survivor.gameplayMassScale=old.gameplayMassScale;staged.push(survivor);
      survivor.body.recomputeMassPropertiesFromColliders();survivor.body.setAngvel(w,true);survivor.body.setLinvel(pointVelocity(v,w,survivor.body.worldCom(),com),true);
      for(const j of saved){
        const anchor=j.a===id?j.anchorA:j.anchorB;if(dot(n,anchor)<d)continue;
        const a=physics.parts.get(j.a)!,b=physics.parts.get(j.b)!;
        if(connectorIntersectsSlabs(j,a,b,worldNormal,[eatenInterval]))continue;
        joints.push(physics.createJoint({...j,a:j.a===id?survivor.id:j.a,b:j.b===id?survivor.id:j.b}));
      }
    }
  }catch(error){for(const j of joints)physics.removeJoint(j.id);for(const p of staged)physics.removePart(p.id);throw error;}
  physics.inheritIncoming(id,staged);
  physics.removePart(id);physics.world.propagateModifiedBodyPositionsToColliders();
  const wounds:Wound[]=staged.map(p=>{const face=p.poly.faces.at(-1)!;return {partId:p.id,point:mul(face.vertices.reduce(add,vec()),1/face.vertices.length),normal:mul(n,-1)};});
  return {point,normal:mul(normalize(direction),-1),wounds,fragments:staged.length,removedMass:massBefore-staged.reduce((s,p)=>s+p.body.mass(),0),replacement:{sourceId:id,survivorIds:staged.map(p=>p.id)}};
}
function paintEnd(part:Part,point:Vec3):Wound {
  let nearest=part.poly.faces[0],distance=Infinity;
  for(const face of part.poly.faces){
    const n=normalize(cross(sub(face.vertices[1],face.vertices[0]),sub(face.vertices[2],face.vertices[0])));
    const d=Math.abs(dot(n,sub(point,face.vertices[0])));
    if(d<distance){nearest=face;distance=d;}
  }
  part.poly={faces:part.poly.faces.map(f=>f===nearest?{...f,cap:true}:f)};
  return {partId:part.id,point:mul(nearest.vertices.reduce(add,vec()),1/nearest.vertices.length),normal:normalize(cross(sub(nearest.vertices[1],nearest.vertices[0]),sub(nearest.vertices[2],nearest.vertices[0])))};
}
/** Sever the actual connector, not the rest of the limb's joints. No artificial kick. */
export function severJoint(physics:PhysicsManager,id:number):CutResult|null {
  const joint=physics.joints.get(id);if(!joint)return null;
  const a=physics.parts.get(joint.a)!,b=physics.parts.get(joint.b)!;
  if(a.owner!=='npc'||b.owner!=='npc')return null;
  const pa=add(a.body.translation(),rotate(joint.anchorA,a.body.rotation()));
  const pb=add(b.body.translation(),rotate(joint.anchorB,b.body.rotation()));
  const wounds=[paintEnd(a,joint.anchorA),paintEnd(b,joint.anchorB)];
  physics.removeJoint(id);a.body.wakeUp();b.body.wakeUp();
  physics.deferDetachedContacts(new Set([a.npcId]),true);
  return {point:mul(add(pa,pb),.5),normal:rotate(wounds[0].normal,a.body.rotation()),wounds,fragments:0,removedMass:0};
}
export function prepareSawSplit(part:Part,point:Vec3,normal:Vec3):ConvexPolyhedron[]|null {
  if(part.owner!=='npc')return null;
  const n=normalize(rotate(normal,conjugate(part.body.rotation())));
  const local=rotate(sub(point,part.body.translation()),conjugate(part.body.rotation())),d=dot(n,local);
  const low=clip(part.poly,n,d-CONFIG.saw.kerf/2),high=clip(part.poly,mul(n,-1),-d-CONFIG.saw.kerf/2);
  if(!low||!high)return null;
  const volume=massProperties(part.poly).volume;
  // A gameplay saw does not manufacture slivers on every held frame. Technical row
  // clipping keeps its independent numerical-dust policy.
  if([low,high].some(p=>{const v=massProperties(p).volume;return v/volume<.08||v*part.density<CONFIG.saw.minPieceMass;}))return null;
  return [low,high];
}
/** Atomic local plane cut with a real 4cm kerf. Both halves retain mass/velocity fields. */
export function splitPart(physics:PhysicsManager,id:number,point:Vec3,normal:Vec3):CutResult|null {
  const old=physics.parts.get(id);if(!old)return null;
  const polys=prepareSawSplit(old,point,normal);if(!polys||physics.parts.size+1>CONFIG.physics.hardLimit)return null;
  physics.checkGeometryBudget([id],polys);
  const pose={position:{...old.body.translation()},rotation:{...old.body.rotation()}};
  const v={...old.body.linvel()},w={...old.body.angvel()},com={...old.body.worldCom()};
  const saved=[...physics.joints.values()].filter(j=>j.a===id||j.b===id);
  const staged:Part[]=[],joints:Joint[]=[];
  const worldNormal=normalize(normal),cutOffset=dot(worldNormal,point),kerfInterval={lower:cutOffset-CONFIG.saw.kerf/2,upper:cutOffset+CONFIG.saw.kerf/2};
  const n=rotate(worldNormal,conjugate(pose.rotation));
  const local=rotate(sub(point,pose.position),conjugate(pose.rotation));
  const resolve=(partId:number,anchor:Vec3)=>{
    if(partId!==id)return physics.parts.get(partId);
    // Greybox connectors can sit just outside the primitive surface (shoulder/neck).
    // Classify their original anchor by the cut plane, not containment in the hull.
    const d=dot(n,sub(anchor,local));return d<-CONFIG.saw.kerf/2?staged[0]:d>CONFIG.saw.kerf/2?staged[1]:undefined;
  };
  try {
    for(const poly of polys){
      const p=physics.createPart(poly,pose,0,old.npcId,old.limb,old.generation+1,old.density,old.owner,true);p.renderScale=old.renderScale;p.gameplayMassScale=old.gameplayMassScale;staged.push(p);
      p.body.recomputeMassPropertiesFromColliders();p.body.setAngvel(w,true);
      p.body.setLinvel(pointVelocity(v,w,{...p.body.worldCom()},com),true);
    }
    for(const j of saved){
      const a=resolve(j.a,j.anchorA),b=resolve(j.b,j.anchorB);if(!a||!b)continue;
      if(connectorIntersectsSlabs(j,physics.parts.get(j.a)!,physics.parts.get(j.b)!,worldNormal,[kerfInterval]))continue;
      joints.push(physics.createJoint({...j,a:a.id,b:b.id}));
    }
  }catch(error){
    for(const j of joints)physics.removeJoint(j.id);for(const p of staged)physics.removePart(p.id);
    physics.world.propagateModifiedBodyPositionsToColliders();throw error;
  }
  const massBefore=old.density*massProperties(old.poly).volume;
  physics.inheritIncoming(id,staged);
  physics.removePart(id);physics.world.propagateModifiedBodyPositionsToColliders();
  physics.deferDetachedContacts(new Set([old.npcId]),true);
  const wounds=staged.map((p,i)=>{
    const face=p.poly.faces.at(-1)!;
    return {partId:p.id,point:mul(face.vertices.reduce(add,vec()),1/face.vertices.length),normal:mul(n,i===0?1:-1)};
  });
  return {point,normal:normalize(normal),wounds,fragments:2,removedMass:massBefore-staged.reduce((sum,p)=>sum+p.body.mass(),0),replacement:{sourceId:id,survivorIds:staged.map(p=>p.id)}};
}
