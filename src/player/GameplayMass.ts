import type {Part} from '../physics/PhysicsManager';
/** HUD/QTE kilograms only. Solver impulses, inertia, damage and masses are untouched. */
export function gameplayMass(part:Part){return part.body.mass()*(part.gameplayMassScale??1);}
