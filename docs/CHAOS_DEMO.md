# Chaos demo / 16-row cup

## Implemented

- Fatal head/chest/pelvis strength: materialize dead ragdoll, fracture depleted vital geometry into four chunks, spray blood and apply bounded outward velocity. No recovery/input during death. Simulation-time 2-second death stage; pausing freezes it. CSS blur/vignette precede the fading result overlay.
- Demo inventory starts empty. Seeded green sky supplies, automatic proximity pickup, found-only selection, sustained/contact wear, break cleanup (including head immunity/flight) and 8 launcher charges. Technical mode keeps the toolbox for diagnostics.
- Simulation-time seeded chaos director: 2-second warning, no consecutive event repeats, increasing cadence. Quake, body rain, heavy gravity, bombs, circular saws, scrap and wind.
- Swept/capped sky hazards and pickups, support recheck after rows clear, finite lifetime and boundary cleanup.
- Arena increased from 11 to 16 rows; critical zone moved to 14.5. Solid ceiling for normal worlds, fully internal NPC spawn, blocked entry waits instead of hidden out-of-bounds stacking. Camera/environment/UI follow configured dimensions. Foreground masks hide outer geometry/effects.
- Out-of-bounds physics parts, sky drops, grenades and particles cleaned up. Blood also hits the ceiling.
- Public README, Netlify configuration, repository/continuous-deployment linkage. `.pi/` (local research), `.netlify/`, environment secrets and generated output are ignored.

## Verification

`npm run build` passes. `npm run test:demo`: 6 unit/physics tests + 3 browser tests pass. An additional browser run passes 4 mobile input/layout and 2 production shader checks (9 total with chaos tests).

New unit coverage includes deterministic warnings, empty inventory/breaking/refill/ammo, death debris with finite simulation, fully internal spawn, ceiling flight containment, culling, pickup and bomb floor sweep. Browser coverage checks paused death clock, fade/blur, inventory reset and all 7 event starts.

Full battery initially: 378/384 pass. Updated three obsolete assertions (old critical height, row 11 invalid, above-arena stacking) pass. Cup topology changes collider order/trajectories: original open 11-row physics diagnostic fixtures now explicitly construct `PhysicsManager(false,11)` to preserve their historical environment; thresholds are NOT relaxed. Both KCC pile regressions pass with that original fixture. The original 20-drop angular gate remains a known failure (baseline reproduction ~82.824 rad/s > 35), already documented in `THIN_PHYSICS.md` / `NATIVE_PHYSICS.md`; no arbitrary solver speed cap added.

## Publishing

Existing `l10yd/humanthrower-game` is a separate September project and was left untouched. New repository: `l10yd/humanthrower2-game`. Netlify project `humanthrower-game`, production URL `https://humanthrower-game.netlify.app`, builds `main` to `dist`. Read-only GitHub deploy key and push/PR/delete webhook registered using authenticated CLIs.
