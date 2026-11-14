# Rapier native build provenance and instrumentation gate

## Resolved release identity

`@dimforge/rapier3d-compat@0.21.0` is built from **native Rapier 0.36.0**, not native0.21 and not the previously downloaded v0.35.2 source.

- Repository: https://github.com/dimforge/rapier
- Commit: `b716d375efc0201003f0cd9ef7168eee0b62c177`
- JS release tag: `js-v0.21.0`
- Workflow: `.github/workflows/typescript-bindings.yml`
- Build/publish run: https://github.com/dimforge/rapier/actions/runs/36112107426/attempts/1
- Evidence: npm `gitHead` and registry SLSA provenance payload agree on this commit.
- Generated bindings Cargo template: JS package0.21.0, native dependency0.36.0. Bindings workspace `[patch.crates-io]` points to in-repository `crates/rapier3d`.

Installed standalone WASM and the base64 payload inside `dist/rapier.mjs` are byte-identical: 3,082,103 bytes, SHA-256 `17cfa80eebd8de0291b948496dbffba724b98b489687f8272ca236a7bbf1dd4b`. `tests/physics/rapier-provenance.test.ts` verifies this fingerprint plus package version and lockfile tarball integrity offline. Manifest: `tests/fixtures/rapier-build-provenance.json`.

**Verification scope:** `npm audit signatures --json --include-attestations` completed successfully; Rapier0.21.0 is listed under `verified`, with no invalid/missing packages. npm verified registry signatures for51packages and attestations for23packages. Registry payload resolves the commit, and installed WASM equality / lockfile fingerprint is checked offline. Raw report: `.pi/npm-attestations-verified-iteration22.json`. This is npm's verification, not a custom independent cryptographic audit. No bit-identical native rebuild is claimed. No remote scripts were executed.

## Native sources, exact commit

Downloaded read-only research copies under `.pi/native021/`. Source URLs and hashes are pinned in the manifest. Previous `.pi/*v0.35.2*` excerpts remain historical; use the exact commit for future solver research.

Relevant `joint_constraint_helper.rs` implementation:

- `recentered_angle`: wrapped projected twist `2 atan2(q_i,q_w)` around the range center;
- `limit_angular`: plain joint basis axis Jacobian and bounded correction bias;
- `finalize_constraints`: orthogonalizes constrained rows against locked DOFs;
- `limit_angular_coupled`: native two-axis cone path exists, but JS wrapper does not expose that assembly.

The measured projected-twist differential differs from a plain-axis velocity projection for mixed-axis rotations. This is a **testable native Jacobian hypothesis**, not proof that changing the pre-orthogonalization Jacobian will stabilize the pile. The native relax / bias pass and orthogonalization must be instrumented together.

## Additional retained-fragment eigenframe evidence

[THIN_PHYSICS.md](THIN_PHYSICS.md) records the current102-part natural thin contact replay: baseline1465.4rad/s, exactgeometrymassframe89.6rad/s(stillfails), staticcontactcausal/nojoints. AutomaticprincipalframewronglocalXvslongY; isolatedmassscalingrevealsabsoluteeigensolverthreshold. RapierexactrootCargo declaresParry0.31.1/glamx0.3.1, glamxsourceuses`d_max<1e-20→Vec3::X`forcolumncrossproductsquared; capturedtensor~1.72e−42. Exacttransitivelockunavailable, noWASMdependencyversionproofbeyondrequirements. Candidate normalizeeigenvectorcomputationwithoutchangingphysicalmass/inertia, theninstrumentremainingcontactbias. No nativepatch/toolchaininstall performed. The next approved isolatedbuild should cover **both** shoulderYrows and tinyeigenframe/contactcase.

## Current isolated build (operator approved)

Rust1.100.0/cargo1.100.0,x86_64-pc-windows-msvc,wasm32-unknown-unknown installed under`.pi/native-build/{cargo,rustup,target}` usingofficialrustup-initverifiedSHA256`38027d51…`. `--no-modify-path` used; no globalPATH/Rustdefaultuserdirs changed. ExistingVisualStudioBuildTools2022 used, no system compiler installation. `scripts/run-native.cmd` usesper-processenv/setlocal and`vswhere`; wasm-pack0.12.1/Binaryen112officialreleaseexecutablesunderlocaltools/bin. wasm-bindgen0.2.130downloadedbywasm-pack: firstinvocationcached16MBunder`%LOCALAPPDATA%/.wasm-pack`; thiscachewascopiedlocallyandfuturecommandsset`WASM_PACK_CACHE`. Thissmallinitialusercache is explicitlynotclaimedfullyhermetic. npmwrapperpostinstallswereneverrun; deprecated/vulnerablewrapperdepsremoved, localbase64-js-onlyaudit0. About2.2GBdisk.

Exactsourcearchivecommitb716d375…generatedonlydim3/non-deterministic. NewCargo.lockresolvedParry0.31.1/glamx0.3.1/glam0.33.12/wasm-bindgen0.2.130; baselinebuildsourcephysicsunchanged. OriginalCIcompiler/transitivelocksarenotknown,sobit-identicalbinarynotclaimed. BaselineWASM3130455bytes/SHA256`10f29a3e…`vsinstalled3082103bytes/`17cfa80e…`.

**Verified baseline:** pinned110bodyjointpeak and102bodythincontactworldsrestoreandone-substepallpositions/rotations/v/ωmatchpublishedbinary**exactly**. Fullunitbaseline336PASS/1unchangedangularFAIL82.8237; 3natural45sbaselinebots17/42/93matchexistingoutputs. BuildwrappersuseoriginalTS+compat overrideswithsingle3dViteinliner, notfullupstream6-variantRollupreleasepipeline. Normalgame`package-lock`/installedRapier/pinnedprovenanceunchanged.

Two isolatedglamxeigenframepatches **not adopted**:

- Broadnormalizationcorrectstinytensorbutaltersnormalbodies:20dropω146.2/twopilefailures.333PASS/4FAIL(3physical+1oldbugexpectation).
- Narrowdegeneratefallback-onlynormalizationkeepsordinary20dropω82.8237/actualpiletestsbutcorrectstinytensor~0.99996→6.24e−5normalizederrorwithidenticalmass/eigenvalues.335PASS/2FAIL(oldangular+oldknownbugexpectation). Natural45sruns**worse**:17v176.7/ω2292;42v19.9/ω93;93v32777/ω47million. No productionreplacement.

Manifest/hash/patch/lock/artifacts/logs`.pi/native-build/build-manifest.json`, baseline-replay-report/eigenframe-comparison, logsbaseline-unit-final/eigenframe-unit/eigenframe-narrow-unit/baseline-natural/narrow-natural. FullresearchdetailsTHIN_PHYSICS.md. Nextactualstep:contact/jointrowinstrumentation(RHSbias/effectivemass/Jacobian/impulse),notpromotefailedpatch.

### Local commands

```bat
scripts\run-native.cmd cargo run --manifest-path .pi\native-build\source\bindings\typescript\Cargo.toml -p prepare_builds -- -d dim3 -f non-deterministic
scripts\run-native.cmd wasm-pack --verbose build --target web --out-dir ../../rapier-compat/builds/3d/wasm-build .pi\native-build\source\bindings\typescript\builds\rapier3d
```

**Current research source now has the read-only row observer, with the narrow glamx patch removed and baseline lock restored before adding serde_json observer dependency.** Archived narrow/baseline binaries are retained; use artifacts/baseline-Cargo.lock and remove observer changes to rebuild an unmodified source baseline. Do not label the current instrumented source an unmodified baseline. Preserveoriginalarchives/binaries. Wrapperrequiresanexplicitoutputpath(env`HUMANTHROWER_NATIVE_OUTPUT`), defaultsneutralwrapper-package; optionalWASM_DIR/VARIANTavoidaccidentallyoverwritingbaseline. `node scripts/verify-native-replay.mjs` checks retainedbaselinepackage. `vite.native.config.ts`/`playwright.native.config.ts` are explicitisolatedharnesses, notdefaultViteconfig.

### Read-only row observer: built and verified, analysis incomplete

`node scripts/verify-native-row-trace.mjs` loads an explicit isolated row-trace package; reports110jointbaseline/102thinbaseline/102thinexact. All body states match published WASM exactly; observerON/OFF world snapshots are byte-identical and capacity1 truncation is explicit/state-neutral. Rows1367/94/94; final angular82.8237/1465.40185/89.60867 remain failures. Source patch, frozen lock, WASM hashes: `.pi/native-build/row-trace-manifest.json`; raw reports under `row-trace-report/`. Normal angular row coordinate/Jacobian before-after Gram-Schmidt, RHS/withoutbias/effective mass/impulse/vel deltas captured; contact normal rows and aggregate friction captured. Singlethread3D-WASM only; individual tangent/twist rows, multibody/FEM/blocksolve/restitution not covered. No solver correction adopted.

Preliminary row findings: tiny baseline normal relax removes~9.25e-9Ns→angularΔ1690rad/s; exact inertia aggregate friction transientΔ3313 despite final89.6. ShoulderY prebias−3 becomes post-orthogonalization+116 in a second solver invocation, adjacent lockedlinearRHS−133 produces transientΔ652. Requiresstep/CCDphaseattribution and splitfrictiontrace; not proof to cap/disable rows. Work paused for user's headweapon priority; next refine/verify, not install/publish this observer.

### Refined observer and diagnostic counterfactuals

New explicit package `row-trace-controls-package` traces pipeline CCD interval, substep dt, native angular cap before integration, writeback, and separate twist/tangent rows. `HUMANTHROWER_TRACE_COUNTERFACTUALS=1 HUMANTHROWER_TRACE_PACKAGE=.pi/native-build/row-trace-controls-package/rapier.mjs HUMANTHROWER_TRACE_OUTPUT=.pi/native-build/row-trace-controls-analysis node scripts/verify-native-row-trace.mjs` runs11one-stepvariants. Read-onlyanalysis verifies J×deltaImpulse and rowequations; maxvelocityrelativeerror5.16e-5; observerON/OFFstate/snapshotexact. Artifacts/hashes `row-trace-controls-manifest.json`; optional diagnostic setters exist only in this package, not in game wrapper.

The shoulder's two solver invocations are **two CCD intervals** .007534701s/.000798632s; ccd-off counterfactual final10.384rad/s vs82.824, incidentnativecap-offunchanged. Never disableCCD inruntime. Thinbaseline nativeangularcap94.2478beforeintegration changesbodyvelocity while accumulatednormal/frictionimpulses stay unchanged; relax removesstoredimpulses with extreme inverseinertia. Incidentcap-off→2.83274, exactcap-off→2.82605, warmstart0baseline→1465.846 (fails), exactwarmstart0→2.83223. Correctlocalinertia alone89.609stillfails. These are causal **one-step** controls, notlong-worldacceptance; no solvercorrectionadopted. Next design consistentcap/impulseaccounting and independentCCD/jointbiascandidate, run unchangedfullgates.

## Pose-only angular-cap candidate: rejected

An isolated native candidate leaves accumulated solver velocities intact and caps only the angular velocity used to integrate the pose (same existing per-step rotation bound). It does not clamp final velocity, disable contacts/limits, or delete fragments. Local102part replay:2.84639rad/s (explicitexact2.83294), vsbaseline1465.40185/89.60867;110shoulderstateexactbaseline82.8237 unchanged. ObserverON/OFFserializedsnapshots exact, allrowequationsfinite/maxrelativeerror5.16e-5. **Not sufficient:** unchanged20drop106.657>35 (baseline82.824), twoKCCpilefixturesPASS. Currentrules3.5natural45smaxsessionsbaseline/candidate:

| Seed | Baseline v / angular | Candidate v / angular |
|---|---|---|
|17|18.427 /51.551|same|
|42|23.655 /1086.426|1.3278e11 /4.7170e16|
|93|61.736 /1674.618|2.9931e7 /7.9271e8|

Natural sessions may end before45s; trajectories/cuts/deaths differ, not paired instantaneous benchmarks. Candidate **rejected**, archivedunder`pose-cap-manifest.json`/`artifacts/pose-cap.*` andpose-cap-package; currentresearchworkerrestoredobserver-onlycontrolsbaseline. Productionpackage/runtime unchanged. `measure-native-candidate.mjs` requires explicitcandidate/output and labels measurement, notacceptance. New `native-cap-impulse-causal.json` +6unitchecks pincap/removalalignment,rowequations andnaturalrefutation; no expensiveWASMrebuildrequiredtorunthem.

Next solve boundary: constraint-consistent velocity/displacement integration for extremeinverseinertia, notpose-onlycap; CCDjointlinear-bias/GramSchmidt separateissue. No cap-off/CCD-off or failedcandidate promotion. Fullproduction363unitPASS/1oldangularFAIL;6focusedproductionbrowserPASS/buildPASS thiscontinuation, fullbrowsernotrerun.

## Angular Jacobian / linear bias candidates: both rejected

Two further isolated candidates keep all joint ranges, contacts, solver iterations and CCD enabled:

1. `projected_twist_jacobian` uses the differential of `2 atan2(q_i,q_w)` for the angular limit, with a plain-axis fallback only at denominator≤1e−12. Native pre-orthogonalization row matches the independent JS differential. The same bias/ranges are retained. Pinned110shoulder82.824→82.080 (still fails); standard20drop85.113>35. KCCpile2fixturesPASS. Natural3.5seeds17/42/93 angular3120/4459/34766, all fail.
2. Locked-linear row correction target is capped to existing `max_corrective_velocity` (3m/s), rather than capping actual body velocity. Pinnedshoulder82.824→15.193, **world40.478stillfails35**. SecondCCD shoulderYpost-orthogonalizedrhs116.08→1.968, but standard20drop94.044>35 and oneKCCpreparation39.774>35. Naturalangular85.554/7287.236/617.622, allfail; linearup to77.897. Not accepted.

The Jacobian-only variant can **increase** the post-orthogonalization Y row bias from116 to431.7 on the shortCCDpass; a mathematically correct pre-row derivative is not sufficient for the coupled solver. Changing one nominal bias can improve the incidentbody and still harm unrelated constraints/piles. No productionadoption; currentjointhelper restored byte-identical toobservercontrolsbaseline. Artifacts/hashes`twist-jacobian-manifest.json` and `linear-bias-manifest.json`, fullrow/replay/natural/stresslogsunder`.pi/native-build`. Thinincident unchanged1465.402/89.609 for both; Jacobianvariantchangesotherjointedbodies, notwhole102worldexact.

`tests/fixtures/native-joint-candidates.json` +5tests pin native-vsindependentJacobian, CCDorthogonalizationbias, localvsworldmax and bothworldcounterexamples. Fullproduction368unitPASS/1oldangularFAIL;20focusedcausaltests/buildPASS;browsernotrerun(no runtimeedits). Next evidence needed: coupledblock/orthogonalization assembly and total residual acrossshortCCDintervals, notanotherone-rowcap/derivative-onlytrial. Velocity/displacement/impulse consistency remains separatethin gate.

## Joint-block equivalence and CCD pose attribution: verified

A new read-only observer captures complete pre/post-orthogonalization joint row blocks, velocities immediately after each local joint solve, and joint anchor frames before/after native solving, CCD clamping and pose advance. Native solver equations are unchanged. Pinned110/102baseline and102explicitexact still match published WASM body states exactly; observerON/OFFworldsnapshotsbyteexact, no row drops. Dedicated fast-body positivecontrol records CCDfraction.716 and is also state/snapshotneutral.

`scripts/native-joint-block-analysis.mjs` independently reconstructs the modified Gram-Schmidt transformation `J'=T J`, `rhs'=T rhs` and the original/transformed residual relation. All40capturedblocks (shoulder/elbow,10internalsteps,2CCDintervals) validate: maxJacobianerror1.05e−6, rhs4.62e−6, residual5.75e−6; lockednormalizedcross-term<9.01e−8. Immediately after a local block solve, originallocked-rowresidual<.000721, notjusttransformedrows. This does **not** claim globaljoint/contactconvergence or nonlinearposeconstraintpreservation. Large transformedrhs116aloneisnotanorthogonalizationbug.

**Hypothesis refuted:** CCDdoesnottruncate the incident shoulder/elbow's poses in this replay. Shoulderanchor distance .002234m beforefirstsolve→.011827m in its integratednextpose **beforeCCD**; afterCCDframesidentical(noincidentclamp), then secondintervalcorrectsto6.995e−6m. Nativeclampobserverpositivecontrol excludes “missinghook” as the explanation. Thus CCDshortremainderamplifies an existingintegration/contact-induceddrift, notanindependentstopofconnectedincidentbodies. Next investigate per-internal-substep pose/Jacobian refresh and contact-inducedconstraintdrift; do notdisableCCD or replacealreadyverifiedGramSchmidtblindly.

Commands: `node scripts/analyze-native-joint-blocks.mjs <trace.json> <report.json>` and `node scripts/verify-native-ccd-observer.mjs` (isolatedpackage). Fullartifact/hashmanifest `.pi/native-build/joint-geometry-manifest.json`; trace `joint-geometry-report`, all40blockanalysis `joint-geometry-analysis.json`. Shippingfixture `native-joint-block-equivalence.json` explicitly samplesfirst/lastinternalsubstep,bothjoints,bothCCDpasses (8blocks);6newunitverifyequations/lockedresidual/poseattribution/positiveCCD/tamper/incompleteinput. Currentresearchsourceobserverextensionsonly, helper/workerbaseline unchanged. Production374unitPASS/1oldangularFAIL/buildPASS;26focusedPASS, browsernotrerun. No physicsfixadopted.

## Per-internal-substep observer: built; analysis paused for UI priority

Newread-onlysourceobserver captures liveCOM-spacejointanchors, pointvelocities/fullandlinearizedposepredictions afteronejoint/alljoints/contacts/beforeafterintegration. Packages`substep-geometry`/`substep-sequence`; all110/102/explicitexactbodyafterstates matchpublished, ON/OFFsnapshotsbyteexact. Hashmanifest `.pi/native-build/substep-sequence-manifest.json`, rawtrace/reportunder`substep-sequence-report`. Preliminaryfirstbiasstep shoulderpredictedafteralljoints.0014296m→aftercontacts.0034207m, actualintegration.0034207m. Jointbuildersrebuildfromcurrentposesperstep; integrationmatchespredictedvelocities. Individualjoint/contactresidualanalysis incomplete; interruptedbyuserpause/settingspriority. Observeronly, no newnativecorrectionoracceptance; existingfailedcandidates remainoff. CurrentgameheadfaultsOFF/rules3.6 changes naturaltrajectories, earlier3.5benchmarksarehistoricalcomparison.

## MVP native convergence continuation — current-anchor candidate rejected

[docs/MVP_CHECKPOINT_4.md](docs/MVP_CHECKPOINT_4.md) records a fresh observer-equivalence replay, independent per-substep COM-anchor/point-velocity/quaternion integration analysis and a bounded PGS experiment. All560jointgeometryrows match independent equations (prediction error≤3.51e−7, actualintegrationerror0). Contacts reintroduce drift afterjointsolves; secondshortCCDinterval firstinternalstep relativeanchorvelocity≈117m/s.16PGS one-stepjointworldpeak31.056<35 but thin1365>35; no gameplayiterationincrease adopted.

New isolated current-contact-anchor Jacobian-arm candidate (no mass/inertia/CCD/contact changes): joint82.824→83.644; thin1465.402→1155.818; exact89.609→89.406. Original20dropv28.319/ω175.343FAIL andKCCseed42missing-supportregression; candidate rejected before naturalruns. Contact source restored/hash`1392f0c5…`; worker/solve/observer baseline hashes unchanged, public npm package untouched. Manifests/artifacts `.pi/native-build/mvp4-anchor-*`, independent analyzer `scripts/native-substep-analysis.mjs`, selected immutable fixture `tests/fixtures/native-substep-convergence.json` +3unit gates. Production buildPASS,431/432unitPASS(oneoriginalangularFAIL), lastfullbrowser125/126(oneangularFAIL)notrerunforresearch-onlystage.

## Historical build prerequisites (before operator approval)

No `cargo`, `rustc`, `wasm-pack` found on PATH or standard user Rust directories. No Rust toolchain / global npm build dependencies were installed. The original GitHub workflow uses Ubuntu/macOS and builds six compat variants; it does not pin a Rust compiler in the workflow. Generated project installs are not a claim of hermetic reproducibility.

Recommended next native spike in an explicitly isolated build directory:

1. Install or use a separately approved Rust/WASM toolchain; record `rustc`, `cargo`, `wasm-pack`, Binaryen versions and target `wasm32-unknown-unknown`. Avoid silently altering the user's global PATH.
2. Checkout exact commit above; use the binding Cargo workspace / in-repo patch rather than crates.io latest.
3. Generate projects, build **only non-deterministic3D compat** using the repository's `rapier-compat` scripts. Freeze generated Cargo/npm locks for this experiment.
4. First test an **unmodified rebuilt binary** against pinned110part replay, original20drop and the existing mass/slicing/player fixtures. Snapshot deserialization and exact/near-exact baseline must be measured; do not treat build success as equivalence.
5. Instrument active angular row coordinate, Jacobian before/after orthogonalization, RHS with/without bias, effective mass and accumulated impulse. Compare shoulderY/contact impulse and unbiased relaxation.
6. Only then test a limited native patch; run unchanged20drop, multiple mixed seeds, awake/sleeping pile KCC, cut/remap and thin-fragment stress. `<25m/s` / `<35rad/s` remain acceptance criteria.

A JS motor/spring, contact exemption or post-step speed clamp is not a substitute for this gate. Gameplay continues using the original pinned package. Native toolchain setup is the next decision boundary, not an automatic system install.
