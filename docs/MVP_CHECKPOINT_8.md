# MVP — checkpoint 8: isolated Jolt comparison и operation-scoped geometry reads

**Область:** A–C, безD. Production Rapier0.21.0, records3.9, masses/inertia/CCD/joints/fixed1/60+2×1/120 unchanged. **StableMVP/A–C acceptance не закрыта.** Этот этап не внедряет другой engine.

## 1. CPUenginecomparison: Jolt1.1.1 rejected

Скачан npm tarball **в ignored `.pi/engine-comparison`**, без `npm install`, scripts/globaltoolchain/projectdependencychange. Tarball12,658,465bytes, unpacked≈46,7MB, MIT. SHA512 совпал с pinned registry integrity:

`sha512-kMCQu/b4wbHwy7EgZWaSbUyDthIKZUvAGGqta4pBF4Pdq+ljWaNvQoa5hPr/PkVCUVsqcoLwXITUm6975mQhiQ==`

CompatJS SHA256`34b3660f914ea23d196ae0b7e0014bab08e2a241f4a6bb9c3701a3a8bed11635`; explicit comparison script проверяет fingerprint доimport. npm gitHead`cccf9d568e8cbae1569ba8e1a24de731591ba0a8`, pinnedCMake declares nativeJoltcommit`6f8bc72fd5fc6a58a52a7fbfe49ca7b5170b4990`. Read-only source verification, **не bit-identicalbinaryrebuild/attestation claim**.

### Harness scope

- Same20sequentialdrops:220dynamicparts,10joints/NPC, originalposes/velocities/geometry/nativeprincipalvalues/frame, closedfloor/depth/sides/open11mfixture.
- Explicitzero hullrounding/tolerance; convexgeometryfloat32какcurrentRapiercollider; bodiesmassprovided, inertiafactor1.
- Twoobserved1/120steps pergame tick, ноdifferentengineCCDalgorithm. JoltLinearCast notRapierCCD-equivalence.
- JoltSixDOFpyramid retains every numeric angular min/max; **swing/twistcoordinates not identical Rapier projected-axis coordinates**, motorsmodelimplementationdiffers. Не выдаём это за identicalconstraints/snapshotreplay.
- Joltvelocitylimits setfloatmax, не25/35clamps; everyobservedsubstepcountsmaxima. Nativeinternal solveriterationpeaks неobserved.
- Samepostdrop160ticks +600settle. NativeWASM timingincludesJSmeasurement/anchors, not referenceperformance.
- Tinycase: isolatedactualcaptured4vertexhull/startpose/velocity/nativeinertia againstfloor, **не whole102bodypilesnapshot/manifoldwarmstartreplay**. Fulljoint110snapshotimport/geometryproof/naturalKCCcutgatesне выполнялись послеearlyrejection.

### Actual numeric results

| Variant | Tinyωmax | Tiny tensor relative error |20dropωmax|anchor driftmax|
|---|---:|---:|---:|---:|
|Providedtensor through normal Joltdecomposition /8steps|2,826|2675,54|93,353|0,2007м|
|Explicitnativeprincipal/frame viaSetInverseInertia /8steps|1069,759|2,45e−8|90,478|0,2165м|
|Sameprincipal /16steps|1059,242|2,45e−8|88,279|0,2526м|
|Geometryexacttinytensor, physicalmasssame /8steps|713,562|5,51e−8|90,478|0,2165м|

Normalmassrelativeerror<2,51e−8,tensor<1,77e−7, COMdifference≈2,31e−9m; allcalm1/numeric0, but **ω35/drift.1fail**. Timingsp95~4,4–6,0мс outsideproduction/noGPU; cannotusefailureasperformanceadoption.

**Important falsepositive refuted:** Jolt'snormal tinyinertiaassignment fellbacktosphere-radius1: actualdiagonal≈`0,4×mass=9,693e−8`, versusminimumsupplied3,199e−15. Smallω was therefore **not exactphysics stabilityPASS**. Pinned `MotionProperties.cpp` verifies `DecomposePrincipalMomentsOfInertia && !diagonal.IsNearZero()`, elsespherefallback. SourceSHA256`9f16b5c16d74adcbb732b7d9829a37336ead0cda1399c2226890f01d80e0adb8`.

Usingpublic`SetInverseInertia` preservesnativeprincipal/framewithoutinflation andexposes>1000rad/s. Geometryexacttensoralsodoesnotresolve35. **Joltno-go**, noearlyKCC/fullnaturalexpensivemigrationafterthese failures. Nootherengine declaredstable.

### Safety/ownership/provenance

Localold`.pi/jolt-comparison.diagnostic.ts`wasnotusedforacceptance (different4substeps,20/10solvercounts,limits1000,swingapproximation). Newexplicit`compare-cpu-engine.mjs`and`jolt-comparison-adapter.mjs`arenotimportedbyruntime.

BindingsreturnedscratchVec3/Quat borrowed, explicitnewallocationsdestroyed; bodies/constraints/filterRefs/worldcleanupfinally. Attempttodeletebindinggettervalues causedmemoryfault; rejected/restored, freshprincipalrepeatagain1069,759/90,478/drift.2165. Getterreadcopiedbeforethenextgetter. Package/source/publicRapierunchanged.

Raw `.pi/engine-comparison/{native-mapping,principal-mapping,principal-16,exact-thin,principal-borrowed-verified}.json`.
Git-visible **`tests/fixtures/jolt-comparison-rejection.json` +3tests** preservefailure/eigenfallbackevidence, ordinaryunitnoJolt/Rust/ignored dependency.

Reproduceafterseparateverifiedtarballextract:

```sh
HUMANTHROWER_JOLT_PACKAGE=.pi/engine-comparison/package/dist/jolt-physics.wasm-compat.js HUMANTHROWER_ENGINE_OUTPUT=.pi/engine-comparison/result.json node scripts/compare-cpu-engine.mjs
# optional isolated probes, never gameplay values:
# HUMANTHROWER_JOLT_PRINCIPAL=1
# HUMANTHROWER_JOLT_ITERATIONS=16
# HUMANTHROWER_JOLT_EXACT_THIN=1
```

## 2. Acceptedproduction: operation-scoped GeometryRead

`GeometryRead`cache exactweldedvertices perpolyidentity **внутри одной read-onlyоперации**, WeakMapnotglobal. Occupancyprojectcreates/releasesitsownreadbarrier; pureRowPreparationsame. `clip`/`subtractSlabs` optionalread reusefirst-matchweldingwithoutdifferentpredicates/arithmetic/caps/UVs. Newscopeaftergeometrymutationrecomputes.

No cache acrossworldedit/tick, noMass/COMcache; no hull simplification. Ordinary callerswithoutscopeunchanged. Unitcomparescached/referenceclips/rowcuts/caps/scores; original20dropandthin102replayremainidenticalfailures.

### Paired frozen production measurement

Same currentseed17/30s170physicsparts/115stains, noRAFduringCPUloop, geometrycache disabled betweenrebuilds:

|Occupancy15rebuilds|Mean|p95|
|---|---:|---:|
|Originalcornertransforms, noGeometryRead|5,007мс|5,5мс|
|Checkpoint7sharedcornertransforms only|4,627мс|5,5мс|
|Sharedtransforms+GeometryRead|**3,947мс**|**4,2мс**|

Actualnaturalinvocationoccupancyp95≈3,7мс vscheckpoint7≈4,5мс (differentnoisyrun, notpairedtickpromise). Physicsstill≈6,8мс, fixedTotal≈11,6мс; oneclearevent8,8мс, sampletoosmall. Exactmap/RowCoveragePASS,30s/170parts/maxω210,708/calls108same. **Targetoccupancy≤2мсnotaccepted**. No proportionalFPSclaim. Raw`.pi/mvp8-geometry-read-profile.json`.

## 3. Freshregressions

- **Build +TypeScriptPASS**.
- **Fullunit463/465PASS**, onlyoriginalangular82,824>35+strictthin59,993>25/1465,402>35; thresholds/suiteexclusionsunchanged.
- **FullChromiumbrowser129/130PASS** complete13,8min. Onlyoriginaltechnicalchaos-longω79,622>35. Checkpoint7staletextwarningfixconfirmedbyfreshfullrun.
- Worker/recovery/balance/atomic/blood/surfaces/profiler focused9/9PASS; operationread/clipping/occupancy/nativeevidenceunitPASS.
- `test:demo` послеfreshfullbrowser: **30unit+20browserPASS**; finalbuild + focused10unitPASS. Последующиеизменениятолькоdocumentation/diagnosticharnessownership,noproductionruntimechange.
- Joltpackage/lockproductionunchanged, runtimeonlygeometryCPUchanges; nofullsimulationWorker/pathplanneradoption.
- A–Cnotfinished: currentRapierstrictstabilityFAIL, JoltcomparisonFAIL, recoverycontinuouspath/angular/staticfullsafetyopen, latebudgetopen. Dnotrun. No commit/push/deploy.

**Nextboundary:** currentexactcontractstillrequiresactualsolverfix/anotherenginecapabilitycomparison, notiterationinflation/fakeinertia. Coordinatedrecoveryplannerremainsseparatefromlocaldestinationclearance. Thiscomparisonconverts“maybeJoltfixesit” into reproduciblenegativeevidence, notMVPcompletion.
