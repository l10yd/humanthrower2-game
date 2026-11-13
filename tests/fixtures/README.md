# Pinned physics fixtures

## `joint-limit-impact.bin` + `joint-limit-impact.json`

A Rapier **0.21.0** `World.takeSnapshot()` immediately before the second 1/120 s substep at simulation time **25.5166667 s**, original Gate 0 sequential-drop trajectory, 110 parts. Binary snapshot: 432,126 bytes. The manifest contains owned IDs / body and collider handles, contact exclusions, before/after state of the affected part, expected after state for every body, and incident joint diagnostics.

The original source capture is `.pi/bounded-motor-peak.json`. Only bytes and metadata needed for a one-step replay are copied into these fixtures. Nothing here is imported by the game or added to its production bundle.

`tests/physics/joint-limit-replay.test.ts` verifies:

- every body reproduces the baseline exactly on the pinned engine / this platform;
- the left upper arm reaches **82.8237 rad/s**;
- disabling all motors in an isolated test replay does not remove this peak;
- disabling only shoulder **Y** angular limit reduces this local peak below 10 rad/s; X/Z/elbow limit removal leaves it unchanged;
- excluding the captured forearm/shin impact or same-family contacts does **not** fix whole-world maxima;
- projected Y-coordinate rate differs from the plain joint-axis rate (read-only differential verified in geometry tests);
- a fresh baseline still matches after counterfactual experiments.

**Interpretation:** this is a causal regression for one specific joint-limit/contact impulse, not proof that all angular spikes have the same cause. The limit-disabled worlds are diagnostic only. Runtime limits remain enabled; the original stress criteria `<25 m/s`, `<35 rad/s` are unchanged and the failing whole-pile test is retained. Cross-browser / cross-version bitwise determinism is not promised.

## `thin-contact-impact.bin` / `.json` and `thin-contact-part.json`

Currentseed17natural-saw102-part world,21.4583333s, incident142chestfragment(length6.3cm,width<.5mm,mass2.423e−7kg),nojoints. Binary430541bytes/manifest420283bytes; SHA256/causalmeasurements in [THIN_PHYSICS.md](../../THIN_PHYSICS.md). Replayallbodyafterstatesexact. Baselineω1465.40185; exactmassCOM/principalframe89.60867stillfails35; incidentstaticcontactoff2.84428isdiagnosticonly. Automaticmin-inertiaframeXisinconsistentwithlongY; isolateddensity×1e6andreducedbacktensorprovesabsoluteeigenframefailure,notruntimefix. Productionmasspolicy unchanged/exactOFF. NaNnativeeffectiveinertiaobserverfallbackisread-onlyandlabelled.

## `native-joint-block-equivalence.json`

Read-only native source observer captures complete joint rows around Gram-Schmidt and localjointsolve, plus current/nextanchorframes aroundCCD. Full40blocksverifiedoffline; shippingfixture **samplesfirst+lastinternalsteps** ofshoulder/elbow acrossbothCCDpasses (8blocks), sourcehashreferences pointtocompleterawtrace.6testsvalidateJ/RHS/residualequivalence/originallockedrows, refuteincidentCCDclamping(anchor driftprecedesCCD), and provide positivefastbodyCCDclampcontrol/tamper/missingrowchecks. No runtimephysicsfixorglobaljoint-contactconvergenceclaimed; angular82.824stillfails35. NATIVE_PHYSICS.mdandPROGRESS.mdcontainmeasurements/limits.

## `native-joint-candidates.json`

Extracted read-only baseline and two **rejected** isolated native candidates: projected-twist gradient and capped locked-linear correction target (not a body speed clamp). Real restored-body rotations/joint frames let JS independently verify the native gradient. Pre/post orthogonalization rows from bothCCDintervals demonstrate bias coupling; local shoulder15.193 can coexist with world40.478>35, and bothvariantsfailoriginal20drop/naturalacceptance.5testcasesconsumeplainJSON/pureanalysis, no nativebuild needed. Fullsource/hash/rowartifacts under`.pi/native-build`, NATIVE_PHYSICS.md. No candidate is imported into gameplay.

## `native-cap-impulse-causal.json`

Extracted first internal-substep rows from the isolated read-only observer and a **rejected** pose-only angular-cap candidate. Includes original-input SHA256 references and current rules3.5 natural baseline/candidate summaries. Original/explicit-exact tiny worlds cap solver angular velocity while retaining contact impulses; subsequent zero-limit twist/tangent releases kick in the opposite direction (alignment<−.9999). `native-cap-impulse.test.ts` checks row equations, local candidate effect, and the natural-world counterexample that prevents promotion. No native binary or research package is required to run this fixture test.

Local candidate angular2.846/2.833rad/s vsbaseline1465.4/89.6 is **not** production acceptance: original20drop106.657>35, natural42/93explode. Fixture is diagnostic-only, does not alter gameplay or claim cross-platform dynamics. Complete native artifacts/replay reports: NATIVE_PHYSICS.md/PROGRESS.md.

## `rapier-build-provenance.json`

Resolved JS0.21.0 / native0.36.0 / commitb716d375… through npm metadata and SLSA provenance. `npm audit signatures` verified registry signatures/attestations; offline `rapier-provenance.test.ts` checks installed external WASM SHA-256 and equality with the embedded compat payload. No native rebuilt binary is claimed. Native instrumentation prerequisites — [NATIVE_PHYSICS.md](../../NATIVE_PHYSICS.md).

## `separation-chaos.json`

Historical full-world contact-restoration snapshot. Its tests distinguish legal local projected displacement from post-clear dynamic stability. Projected correction and exact fragment mass remain developer-only and OFF in the ordinary game. See `PROGRESS.md` and `tests/physics/separation-replay.test.ts`.
