import { PhysicsManager, RAPIER } from '../physics/PhysicsManager';
import { add, identity, length, mul, sub, vec, type Quat, type Vec3 } from '../slicing/Math';
import { slerp } from '../slicing/Quaternion';
import { type CollisionQuery, nearbyColliders, shapeBounds, sweptBounds,translationBounds } from './QueryBounds';
export interface RecoverySweep { shape:RAPIER.Shape; from:Vec3; rotation:Quat; to:Vec3; toRotation?:Quat }
/** Exact translational casts plus bounded angular samples; never mutates colliders. */
export function recoveryPathClear(physics:PhysicsManager,sweep:RecoverySweep,external:(c:RAPIER.Collider)=>boolean,query?:CollisionQuery):boolean {
  const displacement=sub(sweep.to,sweep.from);
  const destinationRotation=sweep.toRotation??identity;
  const cosine=sweep.rotation.x*destinationRotation.x+sweep.rotation.y*destinationRotation.y+sweep.rotation.z*destinationRotation.z+sweep.rotation.w*destinationRotation.w;
  // Equal float32 quaternions need not have dot(q,q)===1. Treat identical
  // orientation (including q/-q) as exact translation instead of 13+ casts.
  const sameRotation=(sweep.rotation.x===destinationRotation.x&&sweep.rotation.y===destinationRotation.y&&sweep.rotation.z===destinationRotation.z&&sweep.rotation.w===destinationRotation.w)
    ||(sweep.rotation.x===-destinationRotation.x&&sweep.rotation.y===-destinationRotation.y&&sweep.rotation.z===-destinationRotation.z&&sweep.rotation.w===-destinationRotation.w);
  const angle=sameRotation?0:2*Math.acos(Math.min(1,Math.abs(cosine)));
  const samples=Math.max(1,Math.ceil(angle/.12),Math.ceil(length(displacement)/.04));
  const endpoint=add(sweep.from,displacement);
  let clear=true;
  const candidates=angle<1e-6?translationBounds(sweep.shape,sweep.from,sweep.to,sweep.rotation):sweptBounds(sweep.shape,sweep.from,sweep.to);
  for(const c of nearbyColliders(physics,candidates,external,query)){
    if(!clear)break;
    const start=c.contactShape(sweep.shape,sweep.from,sweep.rotation,.015);
    const allowed=Math.min(0,start?.distance??0)-.002;
    const endpointContact=c.contactShape(sweep.shape,endpoint,destinationRotation,0);
    if(endpointContact&&endpointContact.distance<allowed){clear=false;break;}
    // A supporting face is not an obstacle above the player, but the destination must
    // still respect its baseline penetration (never allow a path ending below a floor).
    if(start&&start.normal1.y>.66)continue;
    // Prone box corners can return a sideways normal against the arena floor.
    // Rotation during standing is solver-supported, not a linear pose sweep into
    // the floor. Only exempt geometry entirely below y=0 for an upward path;
    // endpoint penetration was checked above, roofs/walls are never exempt.
    const bounds=shapeBounds(c.shape,c.translation(),c.rotation());
    if(bounds&&bounds.max.y<=.001&&displacement.y>=0)continue;
    // A pure translation needs one exact whole-segment cast, not repeated rebuilding
    // of the same convex hull for every 4cm segment.
    if(angle<1e-6){
      if(length(displacement)<1e-9)continue;
      // An initially overlapping pair may exit on the opposite side of a convex obstacle.
      // Keep penetration samples for this special case; endpoint-only acceptance could
      // otherwise turn baseline numerical overlap into permission to tunnel through it.
      if(start&&start.distance<.015){
        for(let i=1;i<samples;i++){
          const contact=c.contactShape(sweep.shape,add(sweep.from,mul(displacement,i/samples)),sweep.rotation,0);
          if(contact&&contact.distance<allowed){clear=false;break;}
        }
        continue;
      }
      const hit=c.castShape(vec(),sweep.shape,sweep.from,sweep.rotation,displacement,0,1,false);
      if(hit&&hit.time_of_impact<1&&(!start||start.distance>=.015)){clear=false;break;}
      continue;
    }
    for(let i=1;i<=samples;i++) {
      const t=i/samples,position=add(sweep.from,mul(displacement,t)),rotation=slerp(sweep.rotation,destinationRotation,t);
      const contact=c.contactShape(sweep.shape,position,rotation,0);
      if(contact&&contact.distance<allowed){clear=false;break;}
      // Each segment has an exact linear sweep at the segment's orientation.
      const previous=add(sweep.from,mul(displacement,(i-1)/samples));
      const hit=c.castShape(vec(),sweep.shape,previous,rotation,sub(position,previous),0,1,false);
      if(hit&&hit.time_of_impact<1&&(!start||start.distance>=.015)){clear=false;break;}
    }
  }return clear;
}
