# Chaos demo / 16-row cup

## Polish pass (chaos-v3)

- First supply is a saw; an independent seeded shuffle bag cycles through all usable kinds before repeats. Arm loss restricts future supplies to head weapons. Manual new-session controls choose a new crypto seed; `restart(seed)` remains reproducible.
- Swapping, recollecting or breaking a weapon no longer resets the global attack cooldown. Grenade cuts do not consume durability of an unrelated equipped melee weapon.
- Death has a separate visual clock: grenades/sky hazards continue for the two seconds, but no pickup/damage/input is processed. Exact zero-time death records work; restarting clears stale death blur/pause state.
- Death chunks are staged before replacing the source, and full-budget deaths use blood rather than exceeding allocation limits. No solver cap or arbitrary fragment pruning introduced.
- Bomb warning marks its fixed column; supply halo is pulsed and visible in front of debris. Stopped pickups reset velocity before falling again, preventing accumulated fall-speed jumps.
- Technical entry checks and actual spawn now share the same fully internal ceiling position.
- `npm run build` and `npm run test:demo` pass: **12 unit/physics + 6 browser tests**. Four ordinary bot sessions (seeds 17/42/93/20261111) finish cleanly at ~13/24/20/49 s, collect supplies, preserve object bounds; two sessions clear rows. Additional mobile controls, shader checks, continuous demo and descending-impact death checks pass.
- Full suite: **388/390 passed** in parallel with browser verification; remaining failures were known ragdoll angular gate and asset CLI timeout. Asset CLI isolated rerun passes 4/4. Large angular peaks in natural sessions remain an explicit experimental limitation, not a claim of physical stability.

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
