// Arcade preset: linear size/mass ×2. Forces ×4 and torque ×16 compensate
// the larger mass/inertia and give twice the former escape authority.
export const PLAYER_SCALE = 2;
export const CONFIG = {
  dt: 1 / 60,
  arena: { width: 9, height: 16, depth: 2.4, wall: 0.35, critical: 14.5 },
  entry:{clearance:1.2,height:8,timeout:6,fallSpeed:4},
  player: { radius: 0.48, halfHeight: 0.67, speed: 7.6, acceleration: 56, brake: 68,
    airAcceleration: 28, gravity: 36, jumpSpeed: 12.4, coyote: 0.24, buffer: 0.28,
    mass: 64, height: 2.3, ragdollWidth: 1.12, impactSpeed: 5, stunTime: 0.225,
    crawlSpeed: 1.3, crawlForce: 1040, getUpDelay: 0.4, getUpDuration: 0.45,
    getUpForce: 3000, getUpTorque: 96, recoverTime: 1, recoverSpeed: 1.8, pressureSpeed: 1.3,
    struggleDecay:1.8,strugglePerPress:.36,struggleRiseBoost:.8,crawlActiveSpeed:1.9,crawlActiveForce:1440,
    escapeLoadScale:2, getUpSpring:220, getUpDamping:24, crawlTorque:24 },
  npcActivity:{maxActive:6,pinnedMass:8,twitchTorque:5,twitchAmplitude:.32},
  forcedRecovery:{duration:1,protection:1,ejectSpeed:7,clearance:.04},
  recoveryAssist:{searchRadius:2,moveSpeed:1.9,pushForce:180,pushSpeed:.8,maxBodies:4,contactDistance:.06},
  playerContact:{maxSupports:3,supportImpulseSpeed:4,weightImpulse:12,landingTotal:16,landingPerBody:8,stompTotal:32,stompPerBody:16,landingCooldown:.3},
  escapeOverload:{thresholdKg:200,decayPerSecond:1.2,extraDecayPerKg:.004,maxPressRate:12},
  escapeQte:{jumpGain:.13,otherGain:.05,loadKg:160,decay:.07,minImpactMass:14,impactCooldown:.6,protection:.2,poseRate:4.5,settleTimeout:.35,riseForce:13000,riseTorque:150,maxRiseSpeed:3.8,crawlAssistForce:2800},
  svarlHead:{radius:.9},
  sawGuard:{minUp:.9,minFallSpeed:2,playerGrace:1.8,cooldown:.12},
  injury:{baseDamage:.18,headOnset:.25,headTripOnset:.55},
  rows: { columns: 9, count: 16, resolution: 20, cellCoverage: 0.60, meanCoverage: 0.72,
    stableRatio: 0.85, maxGap: 0.24, confirmation: 0.35, warning: 1.15, cooldown: 0.4 },
  survival:{hits:6,hitCooldown:1.2,sameNpcCooldown:3,airSeconds:5,airRecovery:4},
  spawn:{npcScale:2,npcMassMultiplier:2,interval:.5,burstInterval:.2,burstDuration:4,burstPeriod:18,firstBurst:12,warning:.9,maxPending:6},
  demo:{dropInterval:1.5,firstDrop:1.5},
  gameplay: { comboWindow:6, comboStep:.25, comboLimit:3, rowVolume:.035, hitImmunity:1.5,
    health:3, healEvery:8, levelSeconds:75, levelRows:8, maxLevel:8,
    dropIntervals:[4.8,4.3,3.8,3.4,3,2.7,2.5,2.3] },
  saw:{reach:2.1,halfWidth:.15,halfDepth:.76,cutSeconds:.19,cooldown:.09,kerf:.08,minPieceMass:.15,planeAngleTolerance:.21,planeOffsetTolerance:.12},
  impactFx:{minSpeed:2.5,minImpulse:4,npcCooldown:.5,pairCooldown:.18,maxPerSecond:8,maxPerTick:2},
  gore:{maxDrops:600,maxStains:180,maxWounds:96,woundSeconds:9},
  physics: { friction: 0.8, linearDamping: 0.35, angularDamping: 2.4, solverIterations: 8,
    npcLinearDamping:.12,npcAngularDamping:4.5,jointDamping:1.8,jointMaxTorque:2,solverSubsteps:2,
    spawnReserve: 600, hardLimit: 720, movingLimit: 28 },
} as const;

export type NpcType = 'normal' | 'small' | 'wide' | 'tall' | 'short' | 'heavy' | 'light';
export const NPC_TYPES: Record<NpcType, { height: number; width: number; mass: number }> = {
  normal: { height: 1.85, width: 1, mass: 72 }, small: { height: 1.45, width: 0.8, mass: 42 },
  wide: { height: 1.75, width: 1.35, mass: 105 }, tall: { height: 2.2, width: 1, mass: 85 },
  short: { height: 1.55, width: 1.1, mass: 64 }, heavy: { height: 1.9, width: 1.12, mass: 120 },
  light: { height: 1.8, width: 0.85, mass: 48 },
};
export const NPC_DISPLAY_MASSES:Record<NpcType,number>={normal:80,small:75,wide:100,tall:80,short:75,heavy:100,light:75};
export function randomSeed(seed: number): () => number {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
