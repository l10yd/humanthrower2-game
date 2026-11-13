import { CONFIG } from '../core/Config';
import type { PhysicsManager } from '../physics/PhysicsManager';
import type { PlayerController } from '../player/PlayerController';
import type { GoreSystem } from './GoreSystem';
import { clip,massProperties,type ConvexPolyhedron } from '../slicing/ConvexClipper';
import { vec } from '../slicing/Math';

export const DEATH_SECONDS=2;
/** Materialize the player once, burst depleted vital parts, leave physical debris. */
export function burstPlayer(physics:PhysicsManager,player:PlayerController,gore:GoreSystem,now:number){
 player.damage.headImmune=false;
 player.prepareRowDeath(now);
 const parts=[...physics.parts.values()].filter(p=>p.owner==='player');
 const failed=parts.filter(p=>['head','chest','pelvis'].includes(p.limb)&&player.damage.parts[p.limb as 'head'|'chest'|'pelvis']<=1e-6);
 for(const part of failed){
  const point={...part.body.worldCom()},pose={position:{...part.body.translation()},rotation:{...part.body.rotation()}},density=part.density,limb=part.limb,scale=part.renderScale;
  const halves=[clip(part.poly,vec(1,0,0),-.025),clip(part.poly,vec(-1,0,0),-.025)].filter(p=>p!==null);
  let chunks=halves.flatMap(poly=>[clip(poly,vec(0,1,0),-.025),clip(poly,vec(0,-1,0),-.025)]).filter((p):p is ConvexPolyhedron=>p!==null&&massProperties(p).volume>.00001);
  // A full world must still finish a death. No extra debris allocations beyond
  // the hard budget; blood remains visible even when no chunk reserve is left.
  if(physics.parts.size-1+chunks.length>CONFIG.physics.hardLimit)chunks=[];
  try{physics.checkGeometryBudget([part.id],chunks);}catch(error){if(!String(error).includes('budget'))throw error;chunks=[];}
  const staged:ReturnType<PhysicsManager['createPart']>[]=[];
  try{
   for(const poly of chunks){const chunk=physics.createPart(poly,pose,0,0,limb,1,density,'player',true);chunk.renderScale=scale;staged.push(chunk);}
  }catch(error){for(const chunk of staged)physics.removePart(chunk.id);throw error;}
  physics.removePart(part.id);gore.burst(point,vec(0,1,0),85);
  for(const [i,chunk]of staged.entries()){
   chunk.body.setLinvel(vec(i%2?5:-5,3+i,0),true);chunk.body.setAngvel(vec(0,0,i%2?9:-9),true);
  }
 }
 if(!failed.length)gore.burst(player.current,vec(0,1,0),50);
 for(const part of physics.parts.values())if(part.owner==='player'){
  part.body.applyImpulse(vec((part.body.worldCom().x<player.current.x?-1:1)*part.body.mass()*1.8,part.body.mass()*1.5,0),true);
 }
 player.ragdoll.parts=[...physics.parts.values()].filter(p=>p.owner==='player');
 player.ragdoll.dead=true;player.qte.reset();player.flight=false;player.vx=0;
 physics.world.propagateModifiedBodyPositionsToColliders();
}
