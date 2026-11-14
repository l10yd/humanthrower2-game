import {PhysicsManager} from '../../src/physics/PhysicsManager';
// Runs only through vite.convergence.config.ts; sets replay convergence at every
// step before the unchanged world gate, without modifying production config.
const pgs=Number(process.env.HUMANTHROWER_CANDIDATE_PGS),step=PhysicsManager.prototype.step;
PhysicsManager.prototype.step=function(){this.world.integrationParameters.numInternalPgsIterations=pgs;return step.call(this);};
