import type { Part } from '../physics/PhysicsManager';
import { CONFIG } from '../core/Config';
/** Divide one landing budget, weighted by real closing speed. Saturated bodies
 * do not transfer leftover pressure to a non-closing or unrelated support. */
export function landingShares(supports:readonly {weight:number;velocityY:number}[],playerVelocityY:number,mass:number,stomp:boolean){
 const limits=CONFIG.playerContact,totalWeight=supports.reduce((sum,s)=>sum+s.weight,0)||1;
 const raw=supports.map(s=>.12*mass*Math.max(0,s.velocityY-playerVelocityY)*s.weight/totalWeight);
 const total=raw.reduce((sum,n)=>sum+n,0),budget=stomp?limits.stompTotal:limits.landingTotal,perBody=stomp?limits.stompPerBody:limits.landingPerBody;
 const factor=Math.min(1,budget/(total||1));
 return raw.map(n=>Math.min(perBody,n*factor));
}

/** Bound newly supplied COM pressure impulse, never an existing velocity.
 * This keeps the existing zero-torque pressure model but stops a microshard
 * receiving a full 64kg player's standing/landing impulse. */
export function supportImpulseCapacity(part:Part,maximumSpeed=CONFIG.playerContact.supportImpulseSpeed){
 const mass=part.body.mass();
 return Number.isFinite(mass)&&mass>0?mass*Math.max(0,maximumSpeed):0;
}

