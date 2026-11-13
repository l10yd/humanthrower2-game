import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsManager } from './PhysicsManager';
/** Developer-only one-step replay. Same-version/platform observation, NOT cross-browser determinism.
 * Deferred pair filtering is captured for this barrier only, not for an indefinite session replay. */
export function replayImpact(fault:NonNullable<PhysicsManager['faultSnapshot']>) {
  if(!fault.replayBefore)throw Error('Enable diagnosticsReplayEnabled before the impact to capture its world.');
  const world=RAPIER.World.restoreSnapshot(fault.replayBefore),queue=new RAPIER.EventQueue(true);
  try {
    const byCollider=new Map(fault.world.map(b=>[b.colliderHandle,b]));
    const deferred=new Set([...fault.deferredPairs,...fault.neighborPairs].map(pair=>`${Math.min(pair.a,pair.b)}:${Math.max(pair.a,pair.b)}`));
    // Snapshot already includes the offending substep dt and interpolated KCC target.
    world.timestep=fault.replayTimestep;
    world.step(queue,{
      filterContactPair:(a,b)=>{
        const pa=byCollider.get(a),pb=byCollider.get(b);
        if(pa&&pb&&((!fault.npcSelfContactsEnabled||pa.owner==='player'||pb.owner==='player')&&pa.npcId===pb.npcId&&pa.component===pb.component||deferred.has(`${Math.min(pa.id,pb.id)}:${Math.max(pa.id,pb.id)}`)))return null;
        return RAPIER.SolverFlags.COMPUTE_IMPULSE;
      },filterIntersectionPair:()=>true,
    });
    return fault.world.map(state=>{
      const body=world.getRigidBody(state.bodyHandle);
      return {id:state.id,position:{...body.translation()},rotation:{...body.rotation()},velocity:{...body.linvel()},angular:{...body.angvel()}};
    });
  } finally {queue.free();world.free();}
}
