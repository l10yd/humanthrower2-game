import { CONFIG } from '../core/Config';
import type { PlayerController } from './PlayerController';
import { clip } from '../slicing/ConvexClipper';
import { add, rotate, vec } from '../slicing/Math';

/** A row kills on any physical overlap, not just the pelvis/character center.
 * Touching a boundary alone is safe. The player never contributes occupancy. */
export function playerIntersectsRows(player:PlayerController,rows:readonly number[]):boolean {
  if(!player.ragdoll.down){
    const half=CONFIG.player.halfHeight+CONFIG.player.radius;
    return rows.some(row=>{
      if(player.current.y+half<=row+1e-6||player.current.y-half>=row+1-1e-6)return false;
      // Head protection excludes only head-only slices, never the torso/legs.
      return !player.damage.headImmune||player.ragdoll.standingParts.some(part=>part.name!=='head'&&player.damage.has(part.name)&&part.poly.faces.some(face=>face.vertices.some(v=>player.current.y+part.position.y+v.y>row+1e-6))&&part.poly.faces.some(face=>face.vertices.some(v=>player.current.y+part.position.y+v.y<row+1-1e-6)));
    });
  }
  return player.ragdoll.parts.some(part=>{
    if(part.limb==='head'&&player.damage.headImmune)return false;
    const position=part.body.translation(),rotation=part.body.rotation();
    const world={faces:part.poly.faces.map(face=>({...face,vertices:face.vertices.map(p=>add(position,rotate(p,rotation)))}))};
    return rows.some(row=>{
      const below=clip(world,vec(0,1,0),row+1-1e-6);
      return !!(below&&clip(below,vec(0,-1,0),-row-1e-6));
    });
  });
}
