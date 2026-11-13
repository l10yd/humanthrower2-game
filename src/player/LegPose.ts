import { RAPIER,type PhysicsManager } from '../physics/PhysicsManager';
import { CONFIG } from '../core/Config';
import { vec,type Vec3 } from '../slicing/Math';
export interface LegGeometry {upper:number;lower:number;bottom:number}
export interface LegPose {hip:Vec3;knee:Vec3;foot:Vec3;thighAngle:number;shinAngle:number}
/** Two-bone sagittal IK. Ground queries are read-only and independently sampled
 * for each foot, so a raised leg bends instead of rotating as one rigid stick. */
export function legPose(physics:PhysicsManager,center:Vec3,side:number,stride:number,grounded:boolean,geometry?:LegGeometry):LegPose {
 const sy=CONFIG.player.height/1.765,hip=vec(center.x+side*.115*CONFIG.player.ragdollWidth,center.y+(.065-.0225)*sy,0);
 const upper=geometry?.upper??.425*sy,lower=geometry?.lower??.465*sy,nominal=vec(hip.x+stride,center.y+(geometry?.bottom??-CONFIG.player.height/2),0);
 const ray=new RAPIER.Ray(vec(nominal.x,nominal.y+.7,0),vec(0,-1,0));
 const hit=grounded?physics.world.castRayAndGetNormal(ray,1.4,true,undefined,undefined,undefined,undefined,c=>physics.partForCollider(c)?.owner!=='player'&&c.parent()?.isKinematic()!==true):null;
 const foot=vec(nominal.x,(hit&&hit.normal.y>.45?ray.origin.y-hit.timeOfImpact+.035:nominal.y)+(grounded?Math.max(0,stride)*.3:0),0);
 let dx=foot.x-hip.x,dy=foot.y-hip.y,d=Math.hypot(dx,dy);
 d=Math.max(Math.abs(upper-lower)+.005,Math.min(upper+lower-.005,d));
 const norm=Math.hypot(dx,dy)||1;dx/=norm;dy/=norm;
 // Clamp the actual foot as well as the knee solve: otherwise the shin is
 // stretched across an unreachable body top and visually appears to levitate.
 foot.x=hip.x+dx*d;foot.y=hip.y+dy*d;
 const along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
 const knee=vec(hip.x+dx*along-dy*bend,hip.y+dy*along+dx*bend,0);
 return {hip,knee,foot,thighAngle:Math.atan2(knee.x-hip.x,hip.y-knee.y),shinAngle:Math.atan2(foot.x-knee.x,knee.y-foot.y)};
}
