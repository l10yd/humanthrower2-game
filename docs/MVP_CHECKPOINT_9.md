# MVP — checkpoint 9: allocation read barrier и измеренный clear workload

**Область:** продолжениеA–C, Dне выполнялся. Rules3.9/publicRapier0.21.0/geometry/mass/inertia/CCD/joints/fixedtickunchanged. Не stableMVPacceptance.

## 1. Accepted: geometryread scope от preparation доcolliderallocation

Прежде `createPart` несколькораз вызывал exactvertexwelding: geometrycount/worldpreflight, `prepareCollider` budget/validation, coordinates. Теперь одинread-only`GeometryRead`передаётся черезchecksиnativecolliderpreparation. NativeQuickHull/convexMeshfallback/CCDsettingsне заменены.

- Всеbudgetchecksисполняютсяпо-прежнему; reusedverticesнеcachedbudgetdecision. Changedlimitsнебypassed.
- Validationnormalplaneвычисляетсяonce/faceвreadscope, samecross/normalize/dot/pointtolerance/order; edgeindicesreuseexactcornerreferences. NearcornersполучаютпрежнийpositionalfindIndex.
- Прямой`validate`безscopeсохраняетreference; `Array.forEach(validate)`explicitlyignoresnumericindex. Testscovervalid/open/concave/nonfinite/UVfailures.
- Scopeсоздаётсянаoperation, восстанавливаетсяв`finally`, noacross-tickmutablecache. Fault/retry/changedgeometryнеиспользуютстарыеpoints.
- `clearRows`одинscopeдляpuregeometrypreparation/finalbudgetиsurvivorallocation. FrozenpreparedWorkerresultтожеvalidatedприcommit; Workerне получаетRapierauthority.
- Checkpoint8clipGeometryReadсохранёнвreferenceallocationmode: pairedclearизолируетновоеallocationreuse, неубираетстаруюоптимизациюдляnegativecontrol.
- `shareAllocationGeometry=false`diagnosticreference; defaulttrue. `allocationQueries`showsreads/welds, неphysicalstate/debugpause equality.

Tests: allocation5reads/1weld, nextoperationnewsweld; rawworldsnapshotsreferencevsoptimizedexact; jointedclear+joints/score/geometry+60solverstepsserializedsnapshotexact; latefaultscopecleanup; budgetrecheckaftercachewarm; originalatomicmatrix/sleep/retainedtissuePASS.

## 2. Measuredsame-inputCPU workload

Новая offlineкоманда **`npm run profile:geometry -- <output>`**, NodeTSloader/noVite/watchers. Samecaptured102worldpolysдляcolliderwork; geometry-onlyreconstructionwithoutjoints/velocities/manifolds, неphysicsreplay. 20invocationsafter3warmups.

Clearworkload:32rotatedsleepingboxes, sameposes/geometryforeveryfreshworld, row1→64survivors, 10samplesafter3warmups. Slicingoutputs/nativeCOM/principalframe/mass/velocitysignatures exactandrepeat-consistent.

Latestpaired`.pi/mvp9-clear-work.json`:

|Workload|Reference mean|Optimized mean|Reference p95|Optimized p95|
|---|---:|---:|---:|---:|
|102colliderpreparations|2,873мс|1,971мс|3,848мс|2,234мс|
|32partclear→64survivors|**4,898мс**|**3,263мс**|**5,808мс**|**4,049мс**|

64survivorallocationsreusepreflightpoints:256readrequests/0**newallocationwelds**; totalpreparationshavealreadyweldedthem. Referencecounters0becausecountertracksreadscopeonly, notclaimofnowelding. Hardwaretime diagnostic, noFPSclaim.

## 3. Occupancyexperiments: validated, defaultOFF

Добавленыexact`singlePassStatistics`и`footprintSpans`referencecomparisonvariants:

- rowcolumn/total/stable/occupiedgapcountsвsingleintegertraversal;
- exactraster[start,end)spansinsteadperpixelarray, ORmapsчерезUint8Array.fill;
- cachemarksrepresentationandinvalidatesonmodechange; map/stable/overflow/RowCoverage/criticalColumnsidenticalunderoverlap/motion/deletion/boundaries.

Наofflinecaptured102geometrycombinedvariantsmean≈3,878→3,285мс, ноproductionnatural170partsнеподтвердилbenefit:

|Productionfrozenseed17/30s|Mean|p95|
|---|---:|---:|
|Sharedtransforms+GeometryRead(checkpoint8)|3,947мс|4,10мс|
|+singlepassstatistics|3,993мс|4,20мс|
|+spans|3,947мс|4,00мс|

**Неpromoted**: обаdefaultOFF, measuredreferencevariantsостаютсядляfutureworkloads. НикакогоadaptivegameplaydecisionпоFPS/clock. Pairedharnessrestoressettingsbefore nextseed. Raw`.pi/mvp9-production-paired.json`.

## 4. Currentlateproductionbaseline

Defaultart/twitch/Fullblood/WorkerOFF, seeds17/20261111,60s-limiteddirectfixedbot. Naturalendsbefore60s, noinvulnerability orfake sleep:

|Metric|17|20261111|
|---|---:|---:|
|Simduration|35,98с|47,58с|
|Final/maxparts|183/200|219/219|
|Physicsp95|8,4мс|12,6мс|
|Occupancyinvocationp95|4,7мс|4,6мс|
|Squeezep95|2,6мс|5,8мс|
|Clearmax(2events)|8,9мс|9,3мс|
|FixedTotalp95|13,3мс|22,1мс|
|Finalcalls|87|104|
|Maxangular|210,708рад/с|5733,833рад/с|

Неpairedhistoricalsessionperformanceclaim: timingenvironmentшумный,2clearsamplesслишкоммало. Samecurrenttrajectory/rows/parts/velocitiesunchanged; localallocationfixнеsolverfix. Targetsphysics5/occupancy2/clear8stillopen. Raw`.pi/mvp9-late-profile.json`.

## 5. Freshgates

- **Build/TypeScriptPASS**.
- **Fullunit470/472PASS**, onlyoriginalnormalω82,824>35 +wholeworldthin59,993>25/1465,402>35. Strictassertionsnotexcluded/notexpectedfail.
- **FullChromiumbrowser129/130PASS**, complete13,8min, onlyoriginaltechnicalchaos-long79,622>35.
- Focused11browserallocation/atomic/worker/surfaces/recovery/balance/batching/profilerPASS.
- `test:demo` **30unit+20browserPASS** послеfullrun; finaldiagnosticreportcountersonlychangesafterruntimegates.
- NoJoltpromotion/newsolverpatchinthispass. Currentengine/patharchitecturestillblocked; Dnotrun, commit/push/deploynotrun.

**Следующее:** nofinitecollectionofCPUfastpathsclosesnumericalstability. Budget/headroomimprovedlocally; Cstillneedsjoint/contactsolverfixornewmeasuredenginepolicy, pluscoordinatedrecoverypathplanner. Спорныеoccupancyvariantsнеgreen-checklistрадигалочки.
