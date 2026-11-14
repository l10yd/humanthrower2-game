import { connectorIntersectsSlabs } from '../physics/Connector';
import { CONFIG } from '../core/Config';
import { clip, contains, massProperties, subtractSlabs, vertices, type ConvexPolyhedron, type Interval } from './ConvexClipper';
import { add, conjugate, dot, mul, pointVelocity, rotate, vec } from './Math';
import { PhysicsManager, type Joint, type Part, type Pose } from '../physics/PhysicsManager';
interface Replacement { source:Part; pose:Pose; survivors:ConvexPolyhedron[] }
export function belowFragmentScale(poly:ConvexPolyhedron):boolean {
  // Most intact limbs are far above the conjunctive dust volume threshold.
  // Do not weld vertices quadratically just to confirm their already-large mass.
  if(massProperties(poly).volume>=1e-6)return false;
  const points=vertices(poly),size=Math.hypot(...(['x','y','z'] as const).map(k=>Math.max(...points.map(p=>p[k]))-Math.min(...points.map(p=>p[k]))));
  return size<.015;
}
export interface ClearResult { transactionId:number; removedVolume:number; removedVolumeByRow:Record<number,number>; fragments:number; rows:number[] }
/** Prepare geometry, then stage all fallible allocations before deleting ANY original body. */
export function clearRows(physics:PhysicsManager,rows:number[],contacts:'legacy'|'solver'='legacy',includePlayer=false,protectedPlayerLimbs:readonly string[]=[]):ClearResult {
  const sorted=[...new Set(rows)].sort((a,b)=>a-b);
  if(!sorted.length||sorted.some(r=>!Number.isInteger(r)||r<0||r>=CONFIG.rows.count))throw Error('Invalid row');
  const work=physics.clearQueries;work.scannedParts=work.clippedParts=work.skippedParts=0;
  const intervals:Interval[]=sorted.map(r=>({lower:r,upper:r+1}));const replacements:Replacement[]=[];
  let removedVolume=0;const removedVolumeByRow:Record<number,number>=Object.fromEntries(sorted.map(r=>[r,0]));
  for(const source of physics.parts.values()) {
    if(source.owner==='player'&&(!includePlayer||protectedPlayerLimbs.includes(source.limb)))continue;
    work.scannedParts++;
    const pose={position:{...source.body.translation()},rotation:{...source.body.rotation()}};
    const n=rotate(vec(0,1,0),conjugate(pose.rotation));
    const local=intervals.map(i=>({lower:i.lower-pose.position.y,upper:i.upper-pose.position.y}));
    let min=Infinity,max=-Infinity;
    for(const face of source.poly.faces)for(const point of face.vertices){const y=dot(n,point);min=Math.min(min,y);max=Math.max(max,y);}
    // Conservative half-space interval rejection; same local plane arithmetic as
    // subtractSlabs, without welding/clipping uncut parts throughout the shaft.
    // Dust outside the row still follows the existing conjunctive cleanup rule.
    if(local.every(i=>max<i.lower-1e-9||min>i.upper+1e-9)&&!belowFragmentScale(source.poly)){work.skippedParts++;continue;}
    work.clippedParts++;
    const kept=subtractSlabs(source.poly,n,local);
    // TDD numerical-dust rule is conjunctive: a long thin strip must survive even if
    // its volume is tiny. Only sub-15mm AND sub-1e-6m³ scraps are below gameplay scale.
    const survivors=kept.filter(poly=>!belowFragmentScale(poly));
    const original=massProperties(source.poly).volume;
    const removed=original-survivors.reduce((v,p)=>v+massProperties(p).volume,0);
    if(removed<1e-12)continue;
    if(source.owner==='npc')for(let i=0;i<sorted.length;i++) {
      const below=clip(source.poly,n,local[i].upper);
      const slab=below&&clip(below,mul(n,-1),-local[i].lower);
      if(slab)removedVolumeByRow[sorted[i]]+=massProperties(slab).volume;
    }
    // createPart validates and prepares each survivor during the atomic staging
    // phase below. Preparing here too repeats hull validation/QuickHull, and the
    // descriptor was discarded. Any failure still rolls back before originals.
    replacements.push({source,pose,survivors});removedVolume+=removed;
  }
  const finalCount=physics.parts.size-replacements.length+replacements.reduce((n,r)=>n+r.survivors.length,0);
  if(finalCount>CONFIG.physics.hardLimit)throw Error('Fragment budget exceeded: clear paused without mutation');
  physics.checkGeometryBudget(replacements.map(r=>r.source.id),replacements.flatMap(r=>r.survivors));
  const affected=new Set(replacements.map(r=>r.source.id));
  const severedConnectors=new Set<number>();
  for(const j of physics.joints.values()){
    const a=physics.parts.get(j.a)!,b=physics.parts.get(j.b)!;
    if(!includePlayer&&(a.owner==='player'||b.owner==='player'))continue;
    if(a.owner==='player'&&protectedPlayerLimbs.includes(a.limb)||b.owner==='player'&&protectedPlayerLimbs.includes(b.limb))continue;
    if(connectorIntersectsSlabs(j,a,b,vec(0,1,0),intervals))severedConnectors.add(j.id);
  }
  const savedJoints=[...physics.joints.values()].filter(j=>affected.has(j.a)||affected.has(j.b)||severedConnectors.has(j.id));
  // Wake only surviving islands that actually rested against removed geometry. The solver
  // propagates subsequent wake through real contacts instead of waking the entire shaft.
  const lostSupport=new Set<number>();
  for(const {source}of replacements)physics.world.contactPairsWith(source.collider,c=>{
    const p=physics.partForCollider(c);if(!p||p.owner!=='npc'||affected.has(p.id))return;
    const contact=source.collider.contactCollider(c,.02);
    if(contact&&contact.normal1.y>.3)lostSupport.add(p.id);
  });
  const affectedFamilies=new Set(replacements.map(r=>r.source.npcId));
  for(const j of savedJoints)if(severedConnectors.has(j.id))for(const id of [j.a,j.b])affectedFamilies.add(physics.parts.get(id)!.npcId);
  const staged:Part[]=[],stagedJoints:Joint[]=[],mappings=new Map<number,Part[]>();
  try {
    for(const r of replacements) {
      const old=r.source,v={...old.body.linvel()},w={...old.body.angvel()},com={...old.body.worldCom()};
      const survivors:Part[]=[];
      for(const poly of r.survivors) {
        const p=physics.createPart(poly,r.pose,0,old.npcId,old.limb,old.generation+1,old.density,old.owner,true);p.renderScale=old.renderScale;p.gameplayMassScale=old.gameplayMassScale;
        staged.push(p);survivors.push(p);p.body.recomputeMassPropertiesFromColliders();
        p.body.setAngvel(w,true);
        const newCom=add(r.pose.position,rotate(massProperties(poly).center,r.pose.rotation));
        p.body.setLinvel(pointVelocity(v,w,newCom,com),true);
      }mappings.set(old.id,survivors);
    }
    const resolve=(id:number,anchor:ReturnType<typeof vec>)=>mappings.get(id)?.find(p=>contains(p.poly,anchor))??(!affected.has(id)?physics.parts.get(id):undefined);
    for(const j of savedJoints) {
      if(severedConnectors.has(j.id))continue;
      const a=resolve(j.a,j.anchorA),b=resolve(j.b,j.anchorB);if(!a||!b)continue;
      const pa=add(a.body.translation(),rotate(j.anchorA,a.body.rotation())),pb=add(b.body.translation(),rotate(j.anchorB,b.body.rotation()));
      // Greybox connector is the actual bridge; authored connector volumes remain required for art.
      if(intervals.some(i=>Math.max(pa.y,pb.y)>=i.lower-.001&&Math.min(pa.y,pb.y)<=i.upper+.001))continue;
      stagedJoints.push(physics.createJoint({...j,a:a.id,b:b.id}));
    }
  }catch(error) {
    for(const j of stagedJoints)physics.removeJoint(j.id);
    for(const p of staged)physics.removePart(p.id);
    physics.world.propagateModifiedBodyPositionsToColliders();
    throw error; // Originals, score, deadline and transaction sequence are untouched.
  }
  for(const id of severedConnectors)physics.removeJoint(id);
  for(const r of replacements)physics.removePart(r.source.id);
  physics.world.propagateModifiedBodyPositionsToColliders();
  // The arcade demo already collides all non-neighbor NPC parts. Removing a
  // connector only enables direct-neighbor contacts; use the same solver recovery
  // as the saw, without legacy family-wide projection/pause in a crowded pile.
  physics.deferDetachedContacts(affectedFamilies,contacts==='solver');
  const wakeIslands=new Set<number>();
  for(const support of lostSupport)for(const part of physics.connectedParts(support))wakeIslands.add(part.id);
  for(const id of wakeIslands)physics.parts.get(id)?.body.wakeUp();
  return {transactionId:++physics.clearSequence,removedVolume,removedVolumeByRow,fragments:staged.length,rows:sorted};
}
