# Retained thin fragment: contact/eigenframe investigation

## Captured current case

Natural demo seed17, saw bot from `BalanceSession.ts`, no synthetic geometry/row arming/contact bypass. Diagnostic observer stops after the first substep above1000rad/s or100m/s (capture thresholds only, not acceptance/solver settings).

- Simulation time21.4583333s,102parts.
- Part142, formerchest, generation1, no remaining joints.
- Dimensions0.0004765×0.0631367×0.0004108m.
- Volume2.0598371e−9m³, mass2.42328e−7kg; significantlength6.3cm means existing conjunctivedustrule correctly retains it.
- Beforeω~2.94rad/s, afterω**1465.40185rad/s**, linear~1.10m/s.
- Floorpenetration reaches~7.8cm; manifoldcontainsfourcontactpoints, noincidentjoint. Thus this case is distinct from pinned shoulderYlimit failure.

Full binary/metadata: `tests/fixtures/thin-contact-impact.bin`(430541bytes,SHA256`0aa93460beceba43404e85e42491de4e9b9ae7fe08b566f3d3be733858dbacb8`) and`.json`(420283bytes,SHA256`5281eb5d991ba8dcd97352c796bc086219b2cbd88dd99eeef2d7a81774d95cbe`). `thin-contact-part.json` is an extracted standalone geometry record. New replay regression verifies **all102bodies** against expected after poses/velocities on the pinned engine/platform.

## Isolated one-substep counterfactuals

| Isolated replay | Incidentω,rad/s | Interpretation |
|---|---:|---|
| Unchangedbaseline |1465.40185|Exactreproduction|
| Exactintegratedmass/COM/principalframe forincidentonly |89.60867|Bigreduction, **stillfails35**|
| Exactpropertiesforallgeneration>0 |89.60867|Samecase,notuniversalfix|
| Exact+COM-centeredcollidershape |92.42313|Doesnotresolvecontactstabilization|
| Incidentfriction0 |1465.40185|Nochange|
| Incidentstaticcontactsremoved |2.84428|Contactcausal; **neverruntimeexemption**|

`ExactMass` remains **OFF** in gameplay, as earlier195/212floorimpactcounterexamplesalsodemonstrateditdoesnotstabilizeallthinparts. No inertia multipliers/contact exemptions/deletion/speedclamps adopted.

## Specific automatic-inertia eigenframe defect

Automaticprincipalvaluesareclosetoexactintegration,buttheirframeiswrong:

- Auto minimum-inertia axislocalX.
- Exactaxisapproximately(0.002516,−0.999994,0.002169), alonglongYdimension.
- AutoIxx~3.199e−15 vs exactIxx~3.623e−11; autoIyy~3.623e−11 vs exactIyy~3.597e−15.
- Normalizedmaxabsolute tensorerror~0.99996.

Isolatedmass-computation scaling (samegeometry, principalvaluesdividedbackaftermeasurement) leaveserror~1forfactors1…1e5,butfactor1e6…1e8yieldserror~2.18e−5. Thisdiagnosesanabsolute-scalealgorithmproblem, **notpermissiontochangemass**. Regressionincludesfactor1vs1e6isolatedworldsonly.

## Read-only upstream source evidence

ExactRapiercommitb716d375…rootCargo declaresParry0.31.1/glamx0.3.1. Itsdependencylockisnotinrepository: exacttransitiveversioninpublishedWASMisnotprovenfromrootsemverrequirementsalone.

Parryv0.31.1`MassProperties::with_inertia_matrix` calls`inertia.symmetric_eigen()`. glamx0.3.1`eigen3.rs::eigenvector1` computescolumncrossproducts/length_squared, then:

```rust
if d_max < 1e-20 {
    return Vec3::X;
}
```

Thecommentassumesalleigenvaluesareequal, butthisabsolutecutoffalsotriggersontinynondegeneratetensors. Forcapturedexacttensor,maxcrossproductsquared~1.7215e−42<1e−20; scalinginertia1e6raisesit~1.7215e−18. ThismatchesobservedthresholdtransitionandwrongXfallback.

**Candidate native correction:** normalizebyfinitepositive matrixmagnitude before eigenvector calculations (or use scale-relative degeneracy/residual checks), keep physical eigenvalues/units, verifyA·v=λv/reconstruction. Thismustbebuilt/testedagainstactualdependencyversions; **no nativepatch/buildperformed**. RootCargo.lock404; crates.ioAPI metadata403 recorded, no dependencyresolutionclaims. Archives downloadedasread-onlysource, noRustinstallation or downloadedscript execution.

Local sources/hashes:

|Source|SHA256|
|---|---|
|RapierrootCargo exactcommit|055644bd81b9cdb57f6d3e636998ac881272160d7872561cc8699efb3306e370|
|Parryv0.31.1mass_properties.rs|6f985ee56e7066b4fe9d6d06cba1ad482b3caa55669fd06f9f05398335fd782e|
|glamx0.3.1cratearchive|28d74079318e3a077bd3d15faa90fde24fa37bb9f157f92f853e6019a15fd413|
|glamx0.3.1eigen3.rs|e5508a91b4fb0b64aab331964e353941c65a6d39efcb5724b242dc0dc8d23843|

Sources: `https://raw.githubusercontent.com/dimforge/rapier/b716d375efc0201003f0cd9ef7168eee0b62c177/Cargo.toml`, `https://raw.githubusercontent.com/dimforge/parry/v0.31.1/src/mass_properties/mass_properties.rs`, `https://crates.io/api/v1/crates/glamx/0.3.1/download`.

## Diagnostic correction only

NativeeffectiveAngularInertiainvertsill-conditionedinverseinertiaandreturnedNaNforthecapturedrotation; JSONthenlostenergydataasnull. ObservernowfallsbacktoQdiag(I)Qᵀfromexistingnativeprincipalvalues/framewithoutinversion, marks`inertiaSource='principal-fallback'`. Thisretainsfinite**native-as-configured**energy, doesnotpretenditsincorrectframeisphysicaltruth. Testsassertworldsnapshotunchangedbefore/afterquery; runtimeforces/shapes/mass/solveruntouched.

## Newly found gameplay pressure source and accepted narrow fix

A secondcapturewithexactmassfrombirthstoppedat17.1417s on shin117(mass2.50795e−6kg). Beforethenativestepitwasalreadymovingdownat~**4,172,337m/s**: PlayerControllerhadappliedthefullstandingweightimpulse64×9.81/60=10.464N·s to the2.5mgfragment. Thatisan**inputforcebug**, distinctfromnativeeigenframe/contactbias.

`supportImpulseCapacity=part.mass×4` now caps **newly supplied COM weight+landing pressure combined per support per tick**, insideexistingtotal16/32/perbody8/16budgets. Existingvelocitiesarenotclamped,geometry/contacts/IDs/massesretained; normal50–120kgbodyfixturebudgetsunchanged. Point-lever-armpressurevariantwasnotadopted: currentzero-torqueCOMmodelkepttoavoidunrelatedphysicalchanges. MicrofragmenttestassertspressureΔv≤4andexisting−100m/sremains≤−100,notreset. Thisdoesnotmakea2.5mgshardareliableplatformorresolveallphysics.

Recordsnow`3.2-mass-aware-support-pressure`; oldbalance10runreports3.1arehistorical. Three45snaturalbaselinebotsafterfix:

|Seed|Beforev/ω|Afterv/ω|
|---:|---|---|
|17|1383.46 /9925.84|77.88 /1208.60|
|42|189.71 /3160.81|19.88 /90.72|
|93|55.22 /1710.04|79.53 /1570.22|

Trajectories/divergentdeath/cutsarenotpairedinstantaneousbenchmarks; **remainingpeaksstillfail25/35**, seed93linearpeakisworse. No universalstabilizationclaim. Exact-from-birthvariantsstillrejected(afterpressureω3974–5823 vsbaseline90–1570); exactinertialifecycleauditconfirmssuppliedframepersistsallocation/recompute/firststep. Nativecontactproblem remains.

Reports`.pi/thin-from-birth.log`(prepressurestdout),`.pi/thin-pressure-from-birth.log`,`.pi/thin-replay/from-birth-pressure.json`; initialfullprepressureJSONwasoverwrittenbyearlyrunner, preservedstdoutsummarylabelled`.pi/thin-replay/from-birth-before-pressure-summary.json`. RunnernowtakesexplicitoutputpathandnoresultisfabricatedfrommissingfullJSON.

## Operator-approved native rebuild and rejected patches

LocalRust1.100.0/wasm-pack0.12.1/wasm-bindgen0.2.130/Binaryen112setupcompletedwithoutglobalPATHmutation. Exactcommitunmodifiedphysicsrebuilt; **all110jointcaseand102thincaseone-stepstatesmatchpublishedbinaryexactly** despitebinaryhash/sizechange. Full336unitPASS/1oldangularFAIL andnaturalbaseline17/42/93matchexistingmeasurements. BuildlocksresolveactuallocalParry0.31.1/glamx0.3.1; publishedtransitivelockstillnotprovenbyte-identical. NATIVE_PHYSICS.mdversions/cacheexception/rebuildcommands.

Nativeglamxnormalizationexperiments:

|Variant|Tiny normalized tensorerror|Original20dropω|45snatural17v/ω|42v/ω|93v/ω|
|---|---:|---:|---|---|---|
|Unmodifiedlocalbaseline|~0.99996|82.8237|77.88/1208.60|19.88/90.72|79.53/1570.22|
|Broad eigenvector normalization|6.24e−5|146.209|notrun|notrun|notrun|
|Narrow wrong-fallback branch only|6.24e−5|82.8237|176.67/2292.40|19.88/93.01|32777.4/47,035,480.7|

Bothcorrecttinyeigenframewith**unchangednativephysicalmass/eigenvalues**. Broadpatchfailsnormalpileacceptance(62.6/64.4>35), rejected. Narrowpatchpreservesnormalfixturesbutnaturalcuttrajectoriesworsen, rejectedforproduction. Acorrectlocaltensorisnotasufficientphysicssolution. No limitsdisabled/nospeedclamps/fragmentdeletionadopted. Oneknown-bugeigenframetestfailsunderpatchedpackagebecauseitintentionallyexpectsbaselinebug; thisisnotconfusedwithphysicalfailures. Defaultgameusespublishedpackage.

Artifacts`.pi/native-build/artifacts/{baseline,eigenframe-broad,eigenframe-narrow}.wasm`, build-manifest/lock/hash, baseline/eigenframe-comparison/unitreportsandnaturalreports. Currentnativeworkspacehasnarrowexperiment; productiondependencyunchanged. Nextnativeworkneedscontactbias/rowinstrumentationandseparatejointYcase, notrepeatblindsolverparametertrials.

## Refined row/cap causal replay (isolated only)

Read-only nativeobserververifiedagainstpublishedbinaryall102bodyposes/velocitiesexact; splitnormal/twist/tangent/J×impulse equations, pipelineCCDintervals/internal10substeps/nativecap. Native solver limits angularbodyvelocity to94.2478beforeintegratingposes but does not reconcile the accumulated contact impulses; relaxremoves thoseimpulses, givingbaselinepoint2Δω1690 andfrictiontwist/tangentextremeinverseinertia. Exactinertiahasadditionalserializedwarmstartmismatch.

| One-step diagnostic | Final incident angular rad/s |
|---|---:|
| Published-equivalent baseline |1465.40185|
| Exact tensor only |89.60867|
| Incident native angular cap bypass (allow-fast diagnostic) |2.83274|
| Exact + cap bypass |2.82605|
| Warmstart coefficient0 only |1465.84640|
| Exact + warmstart0 |2.83223|
| Cap bypass + warmstart0 |2.83267|

No runtime cap bypass/warmstart/CCD disabling adopted; localtinyfinal<35doesnotproveworldsafe. Separate110shoulderCCDintervalbiasfailurestill82.824; no physicsgateclosed. Scripts `verify-native-row-trace.mjs` / `native-row-analysis.mjs`, fullrawrows/hash under`.pi/native-build/row-trace-controls-analysis`/manifest. Futureconsistentcap/impulseaccountingcandidate needs fullunchangednativeacceptance; currentwork interrupted by newgameplaymasspriority. Gameplay3.5labels/QTEkg are distinctfromactualsolvermass, retainedthinmassunchanged.

## Pose-only-cap experiment rejected by world gates

Nativecapcausality is now pinned by fixture `tests/fixtures/native-cap-impulse-causal.json`: removing angularvelocity~1001rad/s (exact~3217) betweenbias/relax is followed by oppositecontactimpulserelease~1094/~3312, alignment<−.9999; rowequationsvalidated. Candidatekeepssolverangularvelocityandcapsintegrationposeonly; localfinal2.846/2.833 below35, but original20dropω106.657 andnatural42/93 catastrophicspikes up to4.717e16. Candidate rejected, nativeworkerrestoredobserver-only. Localcorrectimpulseaccountingnotfullstableposeintegration. No productionmass/inertia/velocity/contacts changed, game still publishedRapier/rules3.5.

Currentbaseline3.5natural17=18.427/51.551,42=23.655/1086.426,93=61.736/1674.618v/ω; allnotangularaccepted. Earlier3.2/3.1naturalnumbershistorical, notcurrentbalance. Records/probeslabelledandarchived; nextnativeconsistentintegration+CCDjointbias independent, notrepeatrejectedposecap. NATIVE_PHYSICS.mddetails.

## Joint candidates do not resolve the retained-thin case

Isolated projected-twist differential and locked-linear correction-target cap were each tested with allcontacts/limits/CCDkept. Both fail unchanged20drop/naturalacceptance, rejected (NATIVE_PHYSICS.mdtable). Neither alters the incident142(nojoint) thinbaseline1465.402 or explicitexact89.609. Jacobianvariantaltersotherjointedbodiesinthe102world, so wholeworldexactnotclaimed; linearbiasvariantwhole102statesexactpublished. Researchhelperrestoredobserverbaseline; no solveradoption. These negativecontrolsreinforceindependentthinvelocity/impulseaccountingissue, notajoint-limit-onlyfix.

## Joint block / CCD attribution is independent of the thin fragment

Newread-onlyjointobserver verifies40fullpre/postGramSchmidtblocks andoriginallockedresiduals; no algebraictransformbug found. Incidentshoulderdrift.002234→.011827m appearsbeforeCCD, withnoincidentposeclamp; positivefastbodycontrolprovesclampobserverfunctional. Thislocalizesjointissue tointegrationaftercontactsolves/shortCCDremainder, ratherthanclampingconnectedincidentbodies. Tiny142nojointcaseunchanged1465.402/exact89.609, cap/impulseconsistency remainsseparategate; no productioncorrection. NATIVE_PHYSICS.md.

## Next decision boundary

1. LocalisolatedRust/WASMtoolchainandunmodifiedbaselineverified; retaincomparisonartifacts per[NATIVE_PHYSICS.md](NATIVE_PHYSICS.md).
2. PinactualParry/glamxversions/locks; instrumenttiny-inertiaeigenframefailure.
3. Testnormalizeeigenvectorswithoutphysicalinertiachanges, thennativecontactbias/manifold rowsonremaining89.6rad/s.
4. Keeporiginal20drops,multiplethinimpacts/seeds,postcutpiles/KCC and<25m/s/<35rad/scriteriaunchanged.

Thisinvestigationfindsaconcretecauseandadditionalcontactproblem; it**doesnotclose**thinorangularstressgates.
