# Humanthrower — журнал реализации

## Пользовательский приоритет — окно паузы/настройки и headfaultsOFF

`GameplaySettings.ts` strictboolean storage(defaultfalse/denied/corruptfallback),`GameplayPreferences` иPlayerController3rdoptionalheadControlFaults=false. `HeadTrauma.configure`gatesupdate/input/aim/trips, clearsactive/pendingfaultimmediately; damage/tissue/death unchanged/noheal. IndependentHeadTraumaunitclasskeepsenabledforlegacydirecttests, actualplayerdefaultsOFF. HeadfaultsON/OFFpreferencepersistsrestart/reload; HUDofftraumatextclear. Records3.6 separatefromold3.5, ONprofile suffix, mid-sessiontogglemarksassisteduntilrestart. Неизменениемассы/пороговQTE/головногоиммунитета/врагов.

В `index.html` переносsingleexistingcontrolsбезduplicateIDs вpause-menu: mode,npc-mode,resolution,shadows,intensity,blood,volume,sound,retro +head-control-faultscheckbox. `PauseMenu.ts`outoflayoutdialoginset/responsivescroll, canvas/touchinert +InputgameplayAllowedgate (manualdispatchтожеblocked), Tabcycle/Escapeclose-resume/focusrestore. Header/footerweaponcontrolsremainusable, notbrowsernativefullmodal. settingsheaderbuttonTITLE/ERROR/GAMEOVERopenssettingswithoutphysicsstart; RUNNING/DYINGpauses. resume/restart/titleactions, lifecyclecontext/hidden/pause/death/final/disposeclear. Mode/NPCsetting restartfrompausedkeepsPAUSED, fromTITLEstartsnewsession peroldmodecontract. Newrenderer/audio/bloodsettingschangesneveradvancephysics. OnmenuclosingInputcleared, noheldsawresurrect. Footerheight/stageboundssame, mobilebuttons56pxunchanged.

2newunitstrictstorage/disableclearsflags +recordisolationcase;7newbrowserpauseallsettings/byteworldfreeze/inputblocked/ON-OFFreload/immediatedisable/profileassisted/restartmodepause/TITLEclose/3viewportbounds+Tab. Legacyheadtraumaregressionexplicitoptin. ExistingkeyboardQTE/mouse/touchsourcefixturesnowclosemenuonlyintheirisolatedmanualpausedfixture; verifyactualmenuinputblockseparately. Sessionmode/audio/tutorialtestsadaptedtonowhiddencontrols/settingsentry; noproductionassertions/physicslimitsrelaxed.

**Full377unitPASS/1oldangularFAIL82.8237>35** (75files/378cases),`npm test -- --maxWorkers=1`, `.pi/pause-settings-unit-final.log`. EarlierparallelrunsCLI20stimeout26s; sequentialwholepasswithouttesttimeoutchange. **49focusedunitPASS**, **20focusedbrowserPASS** pause/head/lifecycle/mobile/weapon; **final15browserPASS** pauseprofiles/tutorial/graphics/audio, `.pi/pause-settings-{browser,final-browser,unit-focused-final,build}.log`, **buildPASS**. FullbrowsernotexecutedafterUI; broad23regressionattemptwas600stimeoutwhileoldfixturesaccessedhiddencontrols, notclaimedcomplete. Then14focused13PASS/1oldfixturefailure→finalall15PASSwithadaptedUIactions. NoactualSafari/device/referenceperformanceclaim.

## Перед UI-приоритетом — per-substep native observation

Isolatedread-only`substep-geometry` then`substep-sequence` observer gathersCOMlocalanchor/worldanchor/currentpointvelocity, linearized/fullintegrateprediction afteronejoint/alljoints/contacts/beforeafterposeintegration forincidentshoulder/elbow. Native110/102/explicitexactmatchespublished/ON-OFFsnapshotexact,dropped0. Fullreport `.pi/native-build/substep-sequence-report`, hash/WASM`substep-sequence-manifest.json`. Preliminaryfirstbiasedsubstep shoulderstart.0022344m→predictedafteralljoints.0014296→aftercontacts.0034207→actualafterintegrate.0034207; firstCCDlaststep drift.0118265. Nativejointbuilderreadsposesandrefreshesrows eachinternalstep; integratorpredictionmatchesactualmotion. Needindependentpointvelocity/residual analysisandindividualelbowcontributionbeforecandidate. No solverfixattempt/adoptionthissubstepstage; analysispausedbyuserUIrequest. Sourceisobserveronly, failedjacobian/linearbias/posecapnotactive. DefaultpublishedRapierunchanged, oldangular/thinstabilitygatesopen.

## Плановое продолжение — проверены блоки ограничений и исключена incidentCCDclampгипотеза

Новая изолированнаяread-only nativeинструментация `.pi/native-build/source`: alljointblockrows перед/послеGramSchmidt иafterlocalblocksolve (velocities), pipelinejointframes/current-nextanchors before/aftersolve/CCD/advance, rawCCDfractionдляtarget+incidentjointneighbors. Solverhelper/worker остаютсябайтамиarchivedbaseline, noforce/posewritesbeyondexistingengine;3dWASMnonparallelobserveronly. Builds`joint-block-package` then`joint-geometry-package`/lockedoffline ужеразрешённыйtoolchain. Pinned110/102baseline+102exact allbodyafterstatesexactpublished; observerON/OFFserializedsnapshotbyteexact/dropped0, capacity1state-neutral. Synthetic100m/sfallingcuboidCCDpositivecontrolrecordsrealfraction.716/ON-OFFsnapshotexact, soabsenceofincidentclampnotmissinghook.

`scripts/native-joint-block-analysis.mjs` восстанавливаетmassmetricmodifiedGramSchmidt/Tmatrix/frompreJ/preRHS, сравниваетpostJ/RHS/effectiveinverse иresidualsoriginalvsToriginal послекаждоголокальногоjointsolve. Полные40blocks: maxJrelative1.0405e−6, RHS4.6154e−6, inverseMass1.22e−7, residual5.747e−6, lockednormalizedcross-term9e−8. Originallocked residualmax.000721, подтверждаетнепростозелёныетрансформированныестроки. Неутверждаемglobalcontact/jointconvergence илиfullnonlinearposeequivalence. УвеличениеpreY−3→post116объясняетсяTlockedlinear, **GramSchmidtнеошибоченвэтомcase**.

Pipelineатрибуция: shoulderanchor.00223439m beforefirstsolve→next.01182651m aftersolvebeforeCCD; afterCCDexactsameframes/noincidentbodyclamp. NextCCDshortintervalbefore-solve.01182651→final6.99514e−6. Elbow.00563288→.00641791→1.51260e−6. Неправильнуюгипотезу«CCDостанавливаетсвязанныетеланаразныхfractions»дляpinnedincidentотвергли. Driftсоздаётсяearlierintegrationafterjoint/contactsolver, короткийCCDremainderобостряетего, нонеинициируетотдельнымclamp. Следующее — per-internalsubstepanchorframes/pose-Jrefresh/contactinduceddrift, неblindblockreplacement/CCDoff/rowcap.

Артефакты`.pi/native-build/joint-geometry-manifest.json` (WASM/lock/patch/source-trace/reportSHA), full40blockanalysis/raw3287rowsand16pipelinegeometries. `analyze-native-joint-blocks.mjs`explicitinput/output/verifiesall40; `verify-native-ccd-observer.mjs`positivecontrol. Shipping`tests/fixtures/native-joint-block-equivalence.json`464KB **samplesfirst+lastinternalsubstep** eachjoint/CCDpass=8blocks;полныеданныеосталисьignoredpi, coverageневыдаётсязаall40fixture.6newunit: reconstruction/residuals/originallockedchecks/largebiasnotGramSchmidtbug/beforeCCDdrift/positiveclamp/tamperandincompleteinputreject. **26focusedPASS**, **full374unitPASS/1originalangularFAIL82.8237>35** (74files/375cases), **buildPASS** unchangedproductionchunknames. `.pi/native-build/logs/{joint-block-tests,production-unit-joint-block,production-build-joint-block,joint-geometry-analysis,ccd-observer-positive}.log`. Browserвэтомпродолжениинеисполнялся;previous6focusedPASS, no runtimecodechange/records3.5unchanged. PublishedWASM/dependencyunchanged/gatesopen; тольконаблюдениеиtests, непринятыйnativefix.

## Плановое продолжение — exact twist Jacobian / locked-linear bias: оба отклонены

Отarchivedobserverbaseline `.pi/native-build/source` создана isolatednativeangularlimit-differentialcandidate: gradientof2atan2(q_i,q_w) ccurrentjointbasis, rangeconstantunchanged/singularitydenom≤1e−12fallbackbaselineaxis, solvercontacts/limits/CCD/motors/inertia unchanged. Localcargo lockedoffline/check/buildPASS; nativepre-rowJсовпадаетсJS`relativeTwistMotion`дляреальныхsnapshotbodyrotations/frames. Но pinned110ω82.8237→82.0796still>35, secondCCDpostorthogonalizationYrhs~431.701 vs116.082: correctgradientнегарантируетcorrectcoupledconstraintassembly. Original20dropω85.11284>35,2KCCpilePASS; native3.5natural17v77.188/ω3120.199(38s),42v79.276/ω4459.189(45s),93v79.150/ω34766.119(45s) — reject. Native142thinincidentunchanged1465.40185/exact89.60867, otherjointedbodieschanged(notwhole102exact).

Послеархивирования/restoringbase второйindependentcandidate: locked-linear correctiontargetaxisrhsboundedexistingmaxcorrective3m/s, no bodyvelocityclamp/no limit-rangechange. Targetedshoulder82.8237→15.19347, **world40.47815still>35**; secondCCDpreY−3 unchanged/postGramSchmidt116.0816→1.96769. Original20dropω94.04374>35/maxdrift.059 (baseline.0195), newKCCpreparationseed17ω39.774>35(otherseedPASS); natural17v24.522/ω85.554(23.833s),42v77.897/ω7287.236(45s),93v69.591/ω617.622(44.567s). Individualseedsmixedimprovement/worse, allfailangular — reject. Thin102worldstateexactpublished forbaseline/exactcounterfactual; isolatedbiasonlynotthinsolution.

ОбаWASM/sourcepatch/Cargo.lock/hashmanifests сохранены`.pi/native-build/{twist-jacobian,linear-bias}-manifest.json` иartifacts; packages/replay/natural/stressreports отдельные. Jointhelper восстановленbyteexact`artifacts/joint-helper-row-trace-controls.rs`; workerremainobserverbaseline(nofailedposecap). DefaultpublishedRapiernode_modules/Vite/package-lock/runtime unchanged; records3.5/massQTE/headweaponsunchanged. No ongoingnativecandidateisleftenabled. DiagnosticPlaywrightPASSmeansreportcapturedfinite/noerrors, NOTvelocitygates.

`tests/fixtures/native-joint-candidates.json` содержитsourceSHA+realpre-jointposes/frames,3baseline/candidatefirstsubsteprowsets across2CCDpasses/localworldpeaks/natural/stresssummaries.5newunit: nativeJacobian matches independentJS; originalvsderivativepostorthogonalizationYrhsamplification; linearcaplocalpass/worldfail; unchangedstress+naturalfail bothcandidates; measurednativeJ×impulseequations. Fullrawrows/posesremainignored.pi. `native-joint-candidates.test.ts` +priorcap/joint/diagnostics **20focusedPASS**, **full368unitPASS/1unchangedangular82.8237FAIL** (73files/369cases), **buildPASS**/productionchunkshashesunchanged. `.pi/native-build/logs/{native-joint-candidate-tests,production-unit-joint-candidates,production-build-joint-candidates}.log`; full/focusedbrowserнеповторялсявэтомпродолжении, последниефокусные6доэтогобылоPASS.

Дальшефизическийпорядок: исследоватьcoupledrowblock/orthogonalizationwithfinite-difference residual иCCDshortintervalposition-vsvelocityconsistency; неповторятьдерivative-only/oneaxislinearcap/damping/iterationblindtrials. Thinangularcap/accumulatedimpulse inconsistencyостаётсяотдельнойзадачей. Всеphysics/refperf gatesstillopen;невыдаёмлокальный15rad/sпоказательзафиксвсейигры.

## Плановое продолжение — native pose-cap candidate отклонён

Изолированный `worker.rs` эксперимент: existingangularrotationbound применяетсятолькокvelocityдляposeintegration; accumulatedsolverangularvelocityмеждуbias/relaxнепринудительноменяется, linearcapunchanged. Observer/diagnosticcontrolsизпредыдущейитерации, glut/glamxnopatch, localtoolchainalreadyapproved/offline/locked. Buildпервыйtypeinferenceerrorисправлен; compiledWASMисследованиевыведеновотдельныйpose-cap-package, неnode_modules/runtime. Exactpublished110shoulderunchanged82.8237; tiny102baseline1465.40185→2.84639, explicitexact89.60867→2.83294. ON/OFFobserverstates/snapshotsbyteexact/cap1reported, J×deltaimpulseequationsmaxrelativeerror5.16e−5. Изменённыетиныетраектории невыдаютсязаbaselineexact.

**Reject:** unchanged20dropω106.65746>35 (baseline82.8237),2existingKCCpilefixturesPASS. Natural3seedsmax45sнаcurrentrules3.5сотдельнымfresh5194baseline/fresh5195candidate:17identicalduration27.0167/v18.427/ω51.551;42baseline25.4167/v23.6546/ω1086.426 vscandidate25.4167/v1.3278096e11/ω4.7169965e16;93baseline26.1167/v61.7357/ω1674.618 vscandidate45s/v2.9930643e7/ω7.9271422e8. Todosfinite/numericFault0неозначаетстабильность! Различныеdownstreamcuts/sessionlengthнеpairedinstantbenchmark. Гейтыпорогов25/35неослаблены. CandidateНЕadopted; sourceworkerrestoredbytefromarchivedobserverbaseline; pose-cap.patch/WASM/lock/hash/workerarchivepreservedinpose-cap-manifest.json. DefaultproductionVite/package-lock/publishedRapierunchanged.

Дополненread-only `native-row-analysis.mjs`: cap/removaldiscontinuities matchedbysolver-slot/pipelinepass/group/substep; angularremoved/releasedvectors/opposedalignment, individualrowequations. Extracted4firstsubstepcases+2naturalsets/inputsSHA в`tests/fixtures/native-cap-impulse-causal.json` (133KB),6newunit regressions безRust/WASMdependency. Тамcandidateместныйpasses<3, ноnaturalcounterexample требуетнеpromote; tamperedJimpulsecasefails. `measure-native-candidate.mjs` explicitinput/output/measurementonly, worldangularmax+observerisolation. `verify-native-row-trace.mjs` defaultrefinedcontrolsbaselineinsteadoldincompleteobserverpackage. Source research controls restored, nohalf-adoptedpatch.

**Productionchecks:** 15focusedcausal/provenance/replaysPASS, **full363unitPASS/1oldangularFAIL** (72files/364cases) `.pi/native-build/logs/production-unit-pose-cap-rejected-final.log`; earlierconcurrentfullhadCLI20stimeout thenfinalpassedwithoutchangingtimeout. **6focusedbrowserPASS** massheavy/QTErepeat/2NPCmirrors/headweapons; **buildPASS**, sameproductionchunksasbefore. Fullbrowserafterchangesnotrerun. Logs`pose-cap-{build,wrapper,replay-final,standard-stress,natural}`and`current35-baseline-natural`. Gatephysicsstillopen; nextcandidateconstraintconsistentintegration/capimpulseaccounting иseparateCCDlockedlinearrowbias/orthogonalization/Jacobian, неrepeatpose-onlycap/velocityclamp/CCDoff.

## Пользовательский приоритет — отображаемые массы и QTE200+

Новые `NPC_DISPLAY_MASSES` normal/tall80, small/short/light75, wide/heavy100. Factory задаётpart.gameplayMassScale=display/(NPC_TYPES[type].mass×factorymultiplier); `gameplayMass` читаетbodymass×scale. ЭтоHUD/QTEкг, **не solvermass**: density/inertia/actualmass/impactdamage/KCCweight/LivingNPCpinning/crawlforce unchanged. Неизвестныеsyntheticparts безметаданных используютactualmass. Saw/bite/row replacement наследуютscale, поэтому отрезаннаямасса отображаетсяпропорциональнооставшейсягеометрии, whole/incomplete/detached consistent. `pileLoad`тотжеsupportgraph/dedup, optionalmassOfcallback; physical loadMass остаётсявdiagnostics, gameplayLoadMass отдельно, QTE/HUD используютпоследний. СуществующаяwholeNPCloadsharingпереоценка остаётсяограничением, неactualcontactforceequivalent.

`escapeOverload` threshold200kg (1e-4floatingtolerance), decay1.2/s +.004/s/kgсверхпорога. Heavyinput≤12edges/s иgain≤12×dt×jumpGain/resistance исключаютsingle-tickburstbypass, поэтомуprogressприoverloadстрогоубываетдажеприспаме; обычные≤160кгостаютсяburst-escapable. Ужеwonready100%неоткатывается, forced1sнаграда/expiry/headweaponimmunityсохранены. 2обычных=160escapable; 2heavy=200blocked; 3normal=240blocked. HUDheavy«СЛИШКОМ ТЯЖЕЛО: разгрузи завал», overload/decay/requiredRate вsnapshot. Records3.5отдельноот3.4, безудалениястарых.

Tests новыеmasslabels/native-snapshotreadexact и120physicaltickstrajectorysameс/безметаданных; inheritance saw/bite/rows; dualsupportloadactual144/game80; real360kgfixture/game200→blockedthenloadremoved→QTE; pure80/160success/200+/burstblocked/relief/wonlock; mirroredactual3NPC240kgblocked→removeone→rise. Старые3NPCforcedescapetests заменены новымblocked/reliefконтрактом, 1–2NPCsuccessregressionsсохранены. Browseractual240kgHUD/432kgphysical→removeone→recovery; 2NPCmirrors/QTErepeat/headweapons/arcade/seedednatural.

**Full357unitPASS/1originalangularFAIL82.8237>35** (71files/358cases), **59focusedunitPASS**, **11focusedbrowserPASS**, **buildPASS**. `.pi/gameplay-mass-{unit-full,focused,browser,build}.log`. AssetCLI20stimeout ранеевоспроизводился, этотfullпроходитбезtimeoutизменений. Последнийполныйbrowserдо3.3/QTEиммунитета91PASS/1angularFAIL, после3.5полныйнепроводился. Velocitygates/массфизикинеослаблены; naturalbalanceнепринят.

Natural93послеearliergetupвыявилошибкуbotobserver: savedSTANDING100%впервомtickновогоknockdownпомечалосьreadyAt, потомправильныйresetсчиталсяabortedwin. Observationnowrequiresqte.active/nonSTANDING; DYINGlethrowclassifieddefeat, noteffortreset. Новаяnaturalтраектория2successful.9833srecoveries +latelethrowabortsonewonLIMP; тестнеобещаетчтоwinспасаетотсмертельногоряда. Actualcutdeadlineunitостается. `.pi/gameplay-mass-natural.json`старыйrawдоobserverfix (explicitdiagnostic), browserattachактуальный.

## Плановое native продолжение — refinedrows/CCD/cap counterfactuals

Изолированнаяrowtrace дополненаpipelineCCDpass/dt, solvergroupdt/PGS/internal10substeps, bodybefore/afternativecap/writeback, individualtwist+tangentJ/K/impulse/limits/veldeltas. Baseline/refinedON-OFFbodyposes/velocitiesexactpublished иserializedsnapshotsbyteexact. 110shoulder2solverinvocations — **2CCDintervals .007534701/.000798632**, nottwoindependentislands. CapturedsmallerintervalrebuildgiveslockedlinearrowRHS−133, shoulderYprebias−3→postorthogonalization116; ccd-offcounterfactualfinalω10.384vs82.824, **неразрешениеdisableCCD**. Incidentcap-offunchanged82.824.

Thinbaseline internalangularcap=94.2478nativeпередintegration меняетsolverbodyvelocity, ноstoredcontactimpulsesнепересчитываются; subsequentrelaxwithnormal/tangentlimit0 снимаетихсогромнымиIinverse. Раздельныеtwist/tangenttracesподтверждаютtransient; exacttensorstoredwarmimpulse mismatchещёdistinct. 11optinone-stepcounterfactuals: thinbaseline1465.402; exact89.609; incidentnativecap-off2.83274; exactcap-off2.82605; warmstartcoeff0baseline1465.846 (неfix); exact+warmstart0=2.83223; cap-off+warmstart0~2.83267. Controls толькоизолированныйrawwrapper, gameнеполучаетметоды/no clamp added/deletedfragment/limitoff. Причиннаялокальностьнеfullnaturalphysicsacceptance.

`scripts/native-row-analysis.mjs` read-onlyпроверяетnativeJ×Δimpulse/angularvelocity иnormal/twist/tangent2×2/jointimpulseформулы; all11variantsfinite/maxrelativevelocityerror5.16e-5, snapshotneutral; dropcount0/1capexplicit. Reports`.pi/native-build/row-trace-controls-analysis`, hashes`row-trace-controls-manifest.json`, archivedbaseline/refined/controlsWASMkept. Текущийsourceobserver+diagnosticcontrols, baselineglamx no patch. Работа сновапрерванапользовательскоймассой. Следующее: physicallyconsistentnativecap/impulseaccounting correction иCCDjointbias/Jacobian отдельно сfullunchangedgates, неadoptcapoff/warmstartoff/CCDoffкакblindproductionfix.

## Пользовательский приоритет — голова Сварла / вертолёт

`PlayerDamage.headImmune` включается только при heldиспользовании equipped/available `svarlHead` или `rotor`; hit/retainhead не меняют strength/tissue, безhealing. `PlayerSurvival` нулевойзащищённыйheadhit не тратитimpactcooldown; controller не уходитвragdoll/неinterruptQTE отheadhit, normalmovementнеfreezes. `WeaponController.cancel/release/select/toggle` снимаютзащиту; Gameпередdue-rowcuts использует фактическийrawInputтекущегоtick длязащиты. `playerIntersectsRows` исключаеттолькоhead-onlyoverlap, clearRows optionalprotectedPlayerLimbs сохраняетheadpoly/neckconnectorприhead-onlyслое; chest/legs по-прежнему режутся. HUDhead«ЩИТ»/tooltip/data-immune. Необщаяinvulnerability, неcureoldheadtrauma, удушье/torsofatal остаются.

`autoBite(dt)` вместоодного55cmукусакаждые90ms тестируетallliveNPCIDs черезsweptbounds+actualmouthBall.9m/contact/cast, wallray поlivecollidersбезstaleBVH. `consumePart` удаляетцеликомтолькопересекающуюNPCчасть и еёjoints, wakeadjacent/lostsupport, no newbody/fragments/wounds, CutResultremap→bloodburst. Любоечислоконтактовдоworldhardlimit обрабатываетсявтотжеtick, fast240m/sfixture/sleeping/12partsonebrowserframe; out-of-area/wallblocked/playerparts неeaten. РукаСварланеизменена. Records3.4изолируютnewrulesот3.3; previousQTEexpiryfixсохранён.

8newphysicscases +recordisolation:2weaponsheadonly/lifecycle/nocooldown/nofreeze/nohealing, allcontactsone-tick/noalloc/nohandles/remnants/blood, fastsweep/walls/off, standing/dynamichead-onlyrows andunprotectedchest. 2browser realGamefixedUpdate head-onlydue-row survival/tissueunchanged/release/switch +12NPCeaten/blood. **74focusedunitPASS** (финальныйfocusedповтор), **12browserPASS** weaponUI/head/arcade/seed93, **final7browserPASS** head+QTErepeat/mirrors/sawgrace/damagedrise, **buildPASS**. Full`npm test -- --maxWorkers=2`: **348PASS/2FAIL**,350cases/70files; unchangedangular82.8237>35 иassetCLI20stimeout21.8s, isolatedCLIтакжеFAIL21.6s. Неослаблялиtimeout/physicscriteria; логневыдаётсязаallgreen. Полныйbrowserпослеfix не запускался. Логи`.pi/head-weapons-{focused,browser,browser-final,unit-full,cli-isolated,build}.log`.

## Плановое продолжение перед новым запросом — native row observer

ИзолированнаяRust/WASMсборкасread-onlyrowtraceсоздана, безglamxnarrowpatch (baselineCargo.lockrestored; serde_jsonexistinglock добавленкакobserverdependency). `row_trace.rs` +hooksrecordsolverbodymapping, jointangularcoordinate/pre/postGramSchmidt/J/invJ/RHS/noBias/effectivemass/impulse/velbeforeafter; contactnormalgeometry+normalrows/bias-relax иaggregatefrictionvelocitydelta. Bounded100000rows, droppedexplicit, per-targetrawbodyindex/generation, perislandslotsclear. Только3DsinglethreadWASM/scalar-SIMD normal+jointpaths; multibody/FEM/blocksolve/restitution/tangentindividualrowsnotcovered, noprofileracceptance.

`node scripts/verify-native-row-trace.mjs`: 110jointbaseline1367rows;102thinbaseline94rows;102thinexact94rows. Everybodypositions/rotations/v/ωexactpublished, observerON/OFFserializedworldsnapshotsbyteexact; capacity1 stillstateexact and droppedreported. Incidentω82.8237/1465.40185/89.60867remainFAIL. Rawrows`.pi/native-build/row-trace-report/*-{baseline,exact}.json`; sourcepatch/lock/WASMhashmanifest `.pi/native-build/row-trace-manifest.json`. Preliminary: tinybaselinecontactpoint2relaxremoves9.25e-9Ns andchangesangular1690rad/s; exactinertiaaggregatefrictiontransientΔ3313rad/s despitefinal89.6. ShoulderYprebias−3→postorthogonalized+116.08 atsecondsolverinvocation, unboundedlockedlinearrowRHS−133.13/deltaω652; needstep/CCDphaseattribution andsplitfrictiontracesbeforecausalfix. Неутверждаемчтоbiascap/jacobianpatchрешитstress. Работа остановлена новымheadweaponприоритетом; gameпопрежнемупublishedRapier, defaultVite/package-lockunchanged. Следующийnativeшаг — детализироватьfriction/phase иverifiedcandidate, неpromotefailedinertia.

## Приоритет пользователя — повторный стан после первого QTE

Причина воспроизведена: `EscapeQte.complete()` сохраняет effort/progress=1 и phase=STANDING; прежний `PlayerController.update()` на каждом standing tick продлевал `protectedUntil=now+2dt`, поэтому секундная защита после подъёма не истекала. Продление теперь только при `ragdoll.down && qte.active && qte.ready`. Результат100%/счётчикescape сохраняются; новый удар начинает новую QTE, forcedrise1s/lockedwin/статическийпотолок/retaineddamage/временнаяsawgrace не ослаблены.

3 новых physics regressions: постоянныйdeadline послеhandoff и explicit sawgrace; три последовательных цикла actualfalling22kgfragment и три actualwholeNPC×2/mass×2→QTE→новыйimpact. Все3 на исходной строке FAIL (второе сбивание отсутствует), сfix PASS; `.pi/qte-repeat-before.log`. ЦелыйNPC повёрнут грудью кcapsule и получает стартовуюfallvelocity−12m/s, иначе лёгкиеarms/feet могут закономерно дать только subthresholdcontact. Testdrop удаляется исключительно междуциклами для свободногоlaunchlane, runtime NPCdeletion не добавлена.

Новый browser realWASM/HUD case: firstactualNPCimpact→QTE100%→KCC→deadlineexpires→secondactualNPCimpact→11playerparts/freshnon100%visibleQTE. Изолирует controller/physics/HUD, не проверяет весьsurvival loop; ранний fixedUpdate-вариантfixture приводил к легитимной смерти отповторныхheadinjuries и заменён. Records `3.3-qte-protection-expires` отделяют прежние3.2 сpermanentimmunity; storage/schema/режимы/старые рекорды не удалены. Новыйrecord-isolationunit PASS.

**Проверки:** профильные64unit PASS; полный `npm test -- --maxWorkers=4` **340 PASS / 1 прежний pinnedangular FAIL** (82.8236998809527>35), 69files/341cases. Первый unconstrained/full одновременно сbrowser далassetCLI20stimeout; повтор whole suite при4workers безизмененияtimeout проходитassetcase. **11focusedbrowser PASS** наfresh5191 (repeatQTE+2mirrors/saw/rowdeath/seed93cutdeadline/playerpause/damagedrise), **build PASS**. `.pi/qte-repeat-focused.log`, `.pi/qte-repeat-unit-full.log`, `.pi/qte-repeat-browser.log`, `.pi/qte-repeat-build.log`. Полныйbrowser93case набор послеfix не запускался; предыдущийfull91PASS/1angularFAIL относитсяк3.2. Физическиеangular/thin/referenceperformance гейты остаются открыты; критерии/solver/массы/удалениефрагментов не менялись. Далее исходныйпорядок PLAN: native row-level instrumentation, затем остальные открытые gates.

## Продолжение — локальный native toolchain / verifiedbaseline / rejectedpatches

Послеоператорского«продолжаем»навопросолокальнойRust/WASMустановке: официальноrustup-initsha256verified, `--no-modify-path`,CARGO_HOME/RUSTUP_HOMEinside`.pi/native-build`. Rust/cargo1.100/LLVM23,targetwasm32, existingVSBuildTools2022, no globalPATH/noMSVCinstallation. wasm-pack0.12.1/Binaryen112officialbinaryarchives/localbin; npmwrappersdownloadedignore-scripts/audit5issues, scriptsNOTexecuted/wrappersremoved/localbase64onlyaudit0. wasm-packinitialbindgencache16MBunderLOCALAPPDATAexplicitexception; movedcopylocalWASM_PACK_CACHEfuture.2.2GBlocalartifacts. `scripts/run-native.cmd`setlocal/perprocessvswherehelpertested. Sourceexactcommitb716d375archivehashed, generatedonly3dnon-deterministic; localCargo.lockParry0.31.1/glamx0.3.1/glam0.33.12/wasmbindgen0.2.130.

UnmodifiednativeWASM3130455bytes/hash10f29a3e… differsnpm3082103/hash17cfa…butoriginalTScompatwrappernewViteinliner **every110/102pinnedstateexact** aftersame1/120step. Original20droppeak82.8237/v17.8675 exactreported; fullbaseline336PASS/1oldangularFAIL. FirstfullbaselinehadassetCLI5sCPUtimeoutunderlargerunminifiedmodule, diagnosticconfig20swaitthenfull336/1; physicsassertionsnotrelaxed.3natural45sbaselinebotsmatchpriorproduction17/42/93 outputs. Productionnode_modules/package-lock/runtimeViteunchanged, normalbuildunchangedchunks.

Nativeglamxfirstpatchnormalizesallmatricesineigenvector1: tinyerror~1→6.24e−5withsamephysicalmass/eigenvalues, butnormal20dropω146.209/twopile62.6/64.4fail;333PASS/4FAIL (3physical+oldbugtest). Rejected. Secondpatchnormalizesonlytinydegeneratefallbackbranchscale<1e−4: normal20drop82.8237/pilesPASS,335PASS/2FAIL(oldangular+oldbugexpectation).3natural45s**worse**:17v176.67/ω2292.40;42v19.88/ω93.01;93v32777.4/ω47million. No productionadoption. IsolateddiagnosticPASSmeansreportwasrecorded, notvelocityacceptance. DefaultphysicsstillpublishedRapier; no deletion/clamp/limitoff. Artifactsbaseline/broad/narrowWASM/locks/patch/buildmanifest andlogsunderignored`.pi/native-build`.

NATIVE_PHYSICS.md/THIN_PHYSICS.md/PLANupdated; nextstepnativecontact/jointrowinstrumentationtoexplainremainingbias/impulses,notpromoteeigenframe-onlypatch. StandardproductionbuildPASSafterresearch,no newproductioncodechangesthisiteration. Lastproductionfull336unit/91browserPASSwithonepreservedangularfailureeach remainvalid; nativebaselinefull336/1 independentlyverified. Boundedeigenframepatchlocalcorrectnessdemonstratedbutdynamicsfailed.

## Финальная проверка support-mass

**Full336unitPASS/1originalpinnedangularFAIL,full91browserPASS/1technicalangularFAIL,buildPASS**. `.pi/unit-support-mass.log`, `.pi/browser-support-mass.log`; fullincludesmobile/tutorial/newpressure/browserdiagnostic/seed93QTE/surface/atomiccases,91/92nohiddenexclusions. Original20dropω82.8237 иtechnicalω112.4787 остаются, критерии25/35неослаблены. Oldstartupwaitcaseвfullpasses. Productiononlynewinputbudget(noexistingclamps)Records3.2; exactinertiaOFF/sourceinvestigationnativepatchnotapplied.

## Продолжение — exact-from-birth comparison и микрофрагментная нагрузка

Изолированные3seeds×45s natural-sawbaseline/exact-frombirth: exact OFFproduction, correctframepersistedallocation/recompute/step, ноω3412–2millionнеpasses. Этоопровергает«толькоменятьинерциюпоздно»; nativeeigenframe+contactbiasgatesopen. Reports`.pi/thin-from-birth.log`/lifecyclejson.

В exactcapture обнаруженвторойисточник: shin117mass2.508e−6kg **beforeworld.stepvY−4.172million**, playerstandingweightimpulse10.464Ns (~4m/s milliongain)существеннонеадекватенactualsupportmass. Narrowproductionfix `supportImpulseCapacity(part)=mass×4`caps newCOMstanding+landingcombinedperparttick, existingtotal/perbodybudgetsheld, nooldvelocityclamp/geometrydeletion/contactexemption/inertiaboost. Keptzero-torqueCOMpressuremodel; preliminarypointimpulsevariantнеadopted. Ordinary50/80/120kgfixtures unchanged. MicrotestsinitialrestΔv≤4/old−100notclamped/IDsdynamicpreserved; 100jumpsactualplatform+2actualpile100jumpsPASS/browser20pilejumpsPASS.

3postfix45sbaselinebots v/ω:17=77.88/1208.60 vs1383.46/9925.84;42=19.88/90.72 vs189.71/3160.81;93=79.53/1570.22 vs55.22/1710.04. Divergenttrajectories/sessionsnotuniformimprovement, stillFAIL25/35. Exactfrombirthafterfixstillworseangular. New3pressureunit+browser1 PASS; focused16unit+3browserPASS/buildPASS. Rules3.2mass-awarepressureisolatesrecords. SourcebugfixedbutphysicsNOTclosed; fullsuitefinalbelow.

Measurementrunnernowconfigurableoutput, preventsoldfileoverwrites; earlyprepressurefullJSONoverwrittenbutstdoutremains, summaryexplicitlynotfullreport. THIN_PHYSICS.mdsources/case/results/limitationsupdated. Nextnativeisolatedbuild/contactinstrumentationstillneedsapproval, noRustinstalled.

## Продолжение — current thin impulse / scale-dependent eigenframe

Захвачен naturaldemo17sawfirstω>1000:21.4583333s,102parts,part142chestgeneration1/nojoints,6.3137cm×.04765cm×.04108cm,mass2.423e−7kg,baselineω1465.40185. Completebinary/metadataextractedtestsfixtures/one-substepall102afterposesvelocitiesexact. Incident-onlyexactintegratedmass/COM/frame89.60867still>35; allfragmentexactunchangedlocal; exactCOM-centered92.42313; frictionoffunchanged; incidentstaticcontactoff2.84428(NEVERruntime). Original20dropω82.8237unchanged. Newcapturethresholdsdeveloperobserveronlydefault35/25 remain, no solvergatechange. Diagnosticbotoptionalhooksnotgameplay.

AutoeigenvaluesnearcorrectbutprincipalframeXvsactualthinlongY: tensorIxx/Iyywrongby~4orders; densitycalculationtest1…1e5error~1,1e6…1e8error2.18e−5withvaluesdividedback. Thisisnotmassscalingruntimefix. Read-onlyupstream exactRapierrootCargo→requirementsParry0.31.1/glamx0.3.1; glamxarchiveeigen3.rsabsolute`d_max<1e-20`returnsXforcrossproductsquaredassumedequalλ; incidentmatrixdmax1.72e−42/scaled1e6→1.72e−18matchestransition. Nativeactualresolvedlockunknown(rootCargo.lock404/cratesAPI403), exacttransitivenativeversionnotclaimed. NoRustinstallation/build/nativepatch; sourcearchiveonly. THIN_PHYSICS.mdfullcausal/results/hashes/nextdecision.

Fixedread-onlydiagnosticenergyhole: nativeeffectiveAngularInertiareturnedNaNforincidentrotation; observerfallsbackQdiag(nativeI)Qᵀwithoutinverse, marksprincipal-fallback, worldunchangedbinarytest/Chromiumcase. Thisretainsnativeconfiguredtensor(noexactframecorrection), notphysicsmutation. `ExactMass`stillOFF; significantsliverretained; runtimeinertias/limits/contacts/speedsnotchanged. New6unit(thinreplay4+tensor2) and1browserPASS; originaldiagnostics/replayfixturesPASS.

**Full333unitPASS/1pinnedangularFAIL**,buildPASS;1newbrowserPASS +10focusedunitPASSbeforelastscalecase, isolated3researchcasesPASS. Lastfullbrowser88PASS/2FAILwaspreviousbalance/mobile;startupwaitcasepassed11focusedaftertestconfig, notfullrerunthisiteration. `.pi/unit-thin-investigation.log`, `.pi/thin-capture.log`, `.pi/thin-replay/variants.json`, `.pi/thin-replay/eigenframe-scale.json`; sourcehashesinTHIN_PHYSICS.md.

NextboundaryisapprovedisolatedRust/WASMrebuildbaseline→eigenframe-scalecorrection+remainingcontactbiasrowinstrumentation. Twodistinctnativeissues(shoulderYtwistlimit+thincontact/eigenframe)notfixedbyUI/art. Toolchainnotfound/noinstallattempt.

## Финальные проверки balance/mobile

Fullunit **327PASS/1pinnedangularFAIL**, `.pi/unit-balance-mobile.log`. Fullfresh5187browser **88PASS/2FAIL**90cases: preservedtechnicalangular112.4787>35 иодинstartupdisabledat5sдоassetloadзавершения. Download5s+decode5scontractнепомещаетсявdefault5sassertion; Playwrightexpectwait15sданявно, никакогоповтораphysicalcase/relaxlimit. Послеconfig **11focusedbrowserPASS** tutorial5/mobile4/balance2, `.pi/balance-mobile-final-focused.log`. Всепроизводственныеruntimeизменениявfullrun; толькоtestexpecttimeoutпосле. BuildPASS. Последнийполныйbrowserне89/90greenclaim. Nativeangular и extreme thindynamics остаютсяоткрыты, balance не принят.

## Продолжение —10диагностическихсессий/QTEcutdeadline/mobile

`Game.restart(seed=this.sessionSeed)` uint32validationдоmutation, default20261111/обычныйrestartpreservesseed; recordseedactualstring/debugseed. `BalanceSession.ts` fixtureботчерезInput.consume/normalfixedUpdate (безspawnfixture/rowarm/иммунитета),5seeds×idle/saw,90s explicitcensoring,rows/cuts/dropTimes/knockdowns/QTErecovery/speed/parts/health/airlogged. Commands`balance:bot`existingserver +`balance:measure`separateopt-inPlaywrightconfigfreshserver, intermediatepersist/expliciterrors. `BALANCE.md`results/method/limitations. Не4–8minhumanacceptance.

Первый10run выявилseed93QTE100%→nonfatalrowcutголеней→reset0→3.1167sescape. Unitcorrespondingcasefixed: `prepareRowDeath`сохраняетwoncutdeadline, `resumeAfterCut`приalivepreservesfullQTE/remainingduration, `forcedDuration`пересобираетсяпослереальныхcutparts. Смертельныйrowdeathнеresumed, limbsнеhealed. Live5173VitecacheотдавалстарыйPlayerControllerпослеedit; directHTTPcomparisonconfirmed. ДобавленPlaywrightfresh/portenv +strictPort, новый5187freshservercausalreplayPASS. Второй10run:6walkinghandoffs.9833s+1zero-legcrawl,winaborts0. Fullresult:idlemedian14.78s/5deaths/1row; sawobservedmedian70.72s/3deaths/2≥90scensored/30rows/488cutevents/7escapes. NoNaN/errors, ноthinfragmentsv2546.8/ω3.36millionunsafe; **physicsandbalancegatesremainopen**. Peaklimitsнеrelaxed/clamped. QTEfixменяетseed93downstreamdeath37.53s, этонеbalanceimprovementclaim.

Mobilepartial: coarsepointertouch3columns×2portrait/6columnslandscape, buttons≥56pxactualbounds320×740/390×844/844×390, safepadding/canvasheight>100/QTEcompactlandscapefits. `profile`mobile/desktoprecordseparate, timingssame(noimplicitbalancechange). RealCDP3touchmove+jump+saw testedcapture/partialrelease/holdnorepeat/allrelease/blur/orientation; incorrectfirstCDPtouchEndparameterswerefixtureerror,Inputunchanged. CSSlandscapeoverrideordercorrected,notsmallerbuttons.4mobilebrowserPASS/seed+causal+recovery6freshPASS/unit17focusedPASS/buildPASS. Fullsuitebeforethis326/83wasprioriteration; finalnewrunrecordedseparately.

Next: humanplaytest/native-thindynamics, actualmobilebrowserdevices/perf/accessibility. Разделеныmeasured10botsvsunacceptedhumanbalance; globalRusttoolchainнеinstalled.

## Продолжение — неблокирующее обучение GDD13.2

Добавлен pureobserver `src/gameplay/Tutorial.ts`, безPhysicsManager/importinputwrites/RNG/gameplaytimerchange: последовательность MOVE→DROP→STOMP→WEAPON→firstROW→REMAINS, реальныеpositiontravel/jumpvelocity/warning/drop/weaponactive/rowclear данные послеfixedstep. Dwell наsimulationtime, безsetTimeout; пауза/technical/endingнеadvance. UrgentgroundedQTE/WON/AIRBORNE/ARMEDROW преemptбезпоглощенияbasicdwell. Firstclearподсказкаобостатках5s, completionтолькопослеalllessons; недожившийдопримерарядаtutorialнепомечаетсяcompleted. Persistentbooleanenabled/completed строгийread/denied/corruptstoragefallback, dismiss+resetнеenable, replayизtoolslaneповторяетбезresetphysicalworld.

`#tutorial-hint`absoluteoverlay/desktopupperright/mobilebottom, pointer-eventsnoneexceptdismiss, QTEz3неперекрыт, stage/footerнеresize. Заголовокaria-livepolite, нетmodalfocuscapture/keyboardbinding/dummyinput. Buttons«Скрытьподсказки»/«Обучение:повторить». Gameobservesread-only dataandsyncshiddeninstates; technical/ROWDEATH/GAME_OVER/ERRORhide. Physics/difficulty/dropinterval/mass/records3.1unchanged. GDDoriginal3secondfirstdrop неadopted: пользовательскийcurrentdemo1.5sоставлен.

8newunit +5browsercases: actions/dwell/rowclearcompletion/contextpriority/pause/mode/reset/replay/storage; 1280/640visiblepanelbounds/HUDunchanged/dismissreloadpersistent; aimhit-testingpassesunderlay; realgroundedQTE/won/armedrow; exact8samples×240seededphysicalframesontutorialON/OFFmatch; deniedlocalStorageplayable. Focused12browserPASS(QTE+weaponsincluded), **full326unitPASS/1angularFAIL,full83browserPASS/1angularFAIL**,buildPASS. `.pi/unit-tutorial.log`, `.pi/browser-tutorial-full.log`, `.pi/tutorial-browser.log`. Fullrunsincludewhole-surfacecertificateandatomicmatrixfrompreviouscontinuation. Unchangedpinnedω82.8237 andcurrenttechnicalω112.4787 vs35keepgatesopen; no tests skipped/clamps.

Следующий независимыйпункт — natural-play10sessions измерение, productionauthoring/connectors иremainingatomiccases. Tutorialimplementedнеbalance/humanreadabilityacceptance; нужен человеческийплейтест. Rust/native rebuild всёещёрешениеизNATIVE_PHYSICS.md, неsilentinstallation.

## Итог последнего продолжения

Полныйunit: **318PASS/1pinnedangularFAIL** (82.8237>35), `.pi/unit-plan-continuation.log`; buildPASS. Последнийполныйbrowserпередsurface/matrix: **76PASS/1technicalangularFAIL**(112.4787>35), `.pi/browser-final-current.log`. Послеsurface/matrix **2новыхbrowsercasesPASS**, deadline2regressionsPASS; весь79-casebrowserнаборповторнонепрогонялся. Необъявляем78fullPASSбезпрогона. Новые10unit входятвполный318run.

## Продолжение — расширенная матрица атомарных отказов

`tests/physics/atomic-failure-matrix.test.ts`: для row/saw/bite сначала определяется фактическое число stagedallocations и затем **каждая** позиция отказа createPart/createJoint проверяется на исходном11part/10joint sleepingNPC. Snapshotсравниваетrawbody/collider/jointcounts, originalIDs/hulls/UV/generation/scale/density/mass/poses/velocities/sleep/enabled, jointrecords/connectedmatrix, geometryusage/clearsequence/deferredcontacts. Retryбезfault успешен. Factoryдополнительно21failurepoint(11bodies+10joints); rawcreateColliderfault неоставляетbody; motoradapterfaultпослеnativejointallocation неоставляетjoint. Browser6row/saw/bite×body/jointfaultcases проходятliveWASM, score/rowdeadline/resultнеизменены, retryуспешен.

6newunit +1browserPASS/buildPASS; найденныхruntimeatomicbugs в этой boundedматрице нет, productiontransactionкод не менялся. Это **неполная all-possiblefailurematrix**: нет исчерпывающегоeverylowlevelRAPIERoperation/commitOOM/nativecorruption/postcommitrollback, не serialbinaryidenticalallocatorstate(nextIDsнеобещаныrollback). Старыеconnector-onlyrollback/geometrybudget/clearfixtures сохранены. Полный предшествующийrun308unit/76browser ниже предшествует этим10newunit/2browser(surface+matrix), финальнаяпроверкауказанаотдельно.

## Следующее продолжение — численный whole-surface certificate

`SurfaceBound.ts` сертифицирует каждую ячейку обоих направлений triangulatedrender↔metadatahull≤4cm: convextrianglemaxvertexbound либо uniondistance-at-centroid+cellradius(Lipschitz),4-wayadaptive subdivision,1e−7msafetymargin. Hardmax200000cells/14levels fails inconclusive, не passesunknown. Catchfixture содержитмаленькиепатчи вокруг7старыхsamplepoints идыркипосредине: старыйsamplingmisspossible, новаяcertificateFAIL. Tests coplanar/paralleloffset/differentdiagonal/reverse/budget/options. `OfflineCharacter`CLI требуетcertificate; productionruntimeparser остаётсяsampled и physicsgreybox не заменён.

3shippingGLBs проходят sharedstrictcertificate, workerupperbound.03998024895m/3476cells vsoldsampledmax.01936568m; conservativeupperbound неexactmax. Numerical, неformalintervalarithmeticproof, неcodec/dynamic/anatomyreleaseacceptance. Browserfixture same3assets/unchangedgame и8focusedunit/build проведены; fullsuite308/76 ниже была **до** добавленияэтогоcertificate и будетобновленапослепрогона.

## Текущее продолжение — пользовательские механики и asset CLI/deadline

Выполнен прямой запрос: default `LivingNpcs` twitch-only, 8kg actualoverheadcomponentmass подавляет active motors с .25s hysteresis; opt-in `#npc-mode=hunt` сохраняет старый rising/hunt/jump. Все свежие demo whole/missing/half drops получают отдельный `FreshDropMotion` seed, rigid pointvelocity spin и limb motors +equal/opposite mass/length torque; max6living не ограничивает freshdrops. Motion прекращается при внешнем контакте/5s, passive damping возвращается. Техническая factory и anatomy masses не изменены. Demo разнообразие начальных углов расширено, motionSeed закреплён в warning.

QTE теперь показывает честные100% выигранного effort. После выигрыша rollback/decay невозможны, одинаковые player bodies переходят в kinematic interpolation1s/smoothstep; окружение `ejectRecoveryDebris` переносит целыми connected NPC components в проверенную arena-contained/statics-compatible позицию и даёт outward7m/s velocity. Explicit requested arcade pose/velocity reward, **не force-only emergent solution**. NPC IDs/poly/mass/joints сохраняются, capsulehandoff в конце; closedstaticroof остаётся исключением, после удаления подъём завершается≤1s; zero-legcrawl/retainedstumps не регенерируются. Dead/cut снова переводят части в Dynamic; следующая воздушная knockdown не наследует win. Winningstroke защищён от impactrollback/удушья, rowcut всё ещё смертелен. Послеhandoff1s защита. Records3.1 разделяютрежимыtwitch/hunt.

Проверки новых правил: mirrored1–3actualNPCs/fullQTE→KCC≤1s/noextraedges/attackimmunity/NPCmassIDsjointpreservation/walk; heavy180kgblock actualejection/contactclear/nooutarena; nextairborneepisode reset; defaultpinning/release/huntjump; whole/incompleteairarticulation/seedrepeat/mass/landingstop. Browser2mirrors+ring100%/nohold/pause+defaultfreshmode+damagedhandoff и visualIDpreservation проходят.

Следующий независимыйпункт `PLAN.md`: `OfflineCharacter` +`scripts/validate-character.mjs`, команда `npm run validate:asset -- <glb> <metadata> [--json]`. SharedGLB/metadat/rest/modelvalidators, реальные accessor strides/index/nodeposes/surfaces, filecaps16MiB/1MiB,exit0/1/2. Все3shippingassets passed11parts/10connectors/72kg/128atlas, worker676/scout676/bruiser660triangles. Headeronlyimages/sampledsurfaces — не codec validity/strictHausdorff/dynamics. 4newunitвключая CLI actualprocess/invalidinput.

`AssetDeadline` единый5sbudget import/parse/failurecleanup. Never-settlingImageBitmap не задерживаетcaller/boot; ownedresourcesdisposal сразу иlatearrivalsclose. Browserfixturelatebitmapclosed/≥11geometriesdisposed +realbootneverdecode→playablegreybox. 4deadlineunit+2browser; originaldecodeerror/corruptimage/immutablebytes/nofetch/regressions сохранены. Timer не отменяетCPU/nativecodec/worker, alternatedecoder не добавлен.

Полная проверка: **308unitPASS/1angularFAIL**, **76browserPASS/1angularFAIL**, **buildPASS**. Unit неизменный pinned20drop peak82.8236998809527>35; currenttechnicalbrowserpeak112.47865224942034>35 (не выдаётся за прежний49.03 trajectory). Angular criteria не ослаблены, guards/clamps/constraintdisabling не добавлены. Логи `.pi/unit-final-current.log`, `.pi/browser-final-current.log`, `.pi/build-final-current.log`. Fullbrowser раннийrun60PASS/15FAIL: repaired staleViteoptimizerpath через explicitThreefixture, устаревшиеQTE5tap/air12/weaponcycle/recordexpectations и fixtures доactuallanding/headpose; итог77cases неskipped. Последниеcodechanges включенывполныйrun.

Native toolchain decision/rowinstrumentation, thinfragstress/referenceFPS, fullatomicfailurematrix/productionconnectorruntime/strictsurfacevalidation/tutorial/mobile/deploy остаютсяopen. Следующий независимыйassetgate — строгая surface-bound проверка, не закрытиеphysicsgate.

## Итерация33 — реальная low-resolution shadow map и первый render profile

Вместоаналитического затемнения добавлен `LowResShadows.ts`: один отдельныйRGBApackeddepthtarget nearest/no-mips128/256/512, default256/off0. Stableorthographiclightcamera/keydirection, world→lightprojection иharddepthcomparison с bias.0007/strength.38. Подлиннаяvisibilityотoccluders уplayer/NPC/cutfragments/shaft; noPCF/noSSR/bloboverlay. Casterproxiesborrowactualrendergeometries/poses, noextraPhysicsManagerobjects; depthMeshDepthMaterialDoubleSideбезvertexsnap/jitter. Sourcehiddenparents/deletedparts исключаются каждыйpass; disposalнеуничтожаетborrowedgeometry. Fixedfrustumlimitedarena, outsideprojectionlit. Newshadowdirection неполностьюсовпадаетсanalytickey/staticlocalpools: это текущийsingle-shadow approximation, неphysicallybasedmultilight.

SurfaceFragmentusessharedshadowuniforms+Threepacking; LambertinstanceonBeforeCompileadapter appliessamecomparison (pinnedThree.187,shaderchunksread). ShaderdefaultuShadowEnabled0 keepsisolatedfixturesunchanged. Body/shaftLambertcastersregistered, effects/blood/markers/lightbulbsnotcasting. Castmatrix обновляетсяпослеphysicalinterpolation/standingposeartclip, so ragdoll/saw/rowshadowsfollowvisualparts; depthnoiseindependentseamjitter. Offreleasestargetandproxyregistry; reenableoneallocation, contextrestoreactualGPUresourcefixturePASS. Scene+shadow+compositecalls/triangles/submissionMs доступны `renderer.renderStats`; timings **CPUsubmission includingvisualsync**, not GPUquery/FPS.

UI`Тени`0/128/256/512 независимотintensity0/retrooff, titletextupdatedtoactualBlenderprototype. No settings persistence yet. Physics/records2.6notchanged,100stepwithshadowon/offexactposesvelocitiesmassesverified.

Newunit1discretesettingcase;4initialbrowser(shadowreceiverretroLambert3sizes/off/move/remove; targetrealloc/off/cleanup/intensity; sawdepthsilhouette/removal; trajectoryequal); final5browseraddsactualcontextloss/restorationandDOMselectverification. Firstfull**284unitPASS/1originalangularFAIL**,**67browserPASS/1originalangularFAIL**68cases beforelastcontextcase+offproxyclear; final5shadowfocusedPASSafterchanges/buildPASS. Logs `.pi/unit-iteration33.log`, `.pi/browser-iteration33.log`, `.pi/shadow-final-iteration33.log`, `.pi/build-iteration33.log`. No criteriarelaxed. Productionparse/rendererrors[]verified, images`.pi/shadows-game-iteration33.png`/`shadows-off-iteration33.png`.

**Performance gate NOT accepted:** `scripts/profile-shadows.mjs` productionheadlessChrome145/SwiftShader,20NPC220activeparts+120explicitlysleepingdetachedparts=340; frozenposes/noPhysicsstep, NOTcontinuousstressstability/refhardware. Final`.pi/shadow-profile-final-iteration33.json`: no-shadow391scene+1composite=392calls; withshadow362shadow+391scene+1=754calls, 16632scenetriangles/16284shadow. Render-submitp95ms off2.9/1283.7/2566.2/5123.5, shadowp95 0/2/4.9/1.9; noisySWbackend, nonmonotonicnotbenchmarkguarantee. Memory372geometries/4texturesoff vs5on, no leakacrosssizes. gl.finish6samples diagnosticblockingcompletion, NOTasyncGPUtimer. TDDtargetcalls<180 andCPUsubmit≤3 **notmet**; profileexposesmissingbatching/instancing, cannotclaimMVPperformance. Nextindependentart/performance: batchsharedrendergeometry andshadowdepthdraws withoutremovingphysicalparts, realreferenceCPU/GPUmeasurement/humanreadability/mobilematrix. Nativeangular/thinfragblockersremainseparate.

## Итерация 32 — промышленная шахта из liveBlender

Продолжениеartпрототипа: вliveBlenderсоздана`HT_IndustrialShaft`,11rigidgroups/648triangles, original128pxatlas dampconcrete/rust/hazard/grille. `assets/blender/industrial-shaft.blend` +`public/assets/industrial-shaft/shaft.glb`78108bytes.12панелей заднейстены, floor/sidewalls/rails/header/vents/pipes/braces/lamphousings. Defaultphysicsgeometry9×11×2.4 unchanged; decorvisualonly. Originalcharacter.blendнеперезаписан, персонажhiddenтольковenvironmentpreviewfile, defaultCubepreserved. Exportselectedmeshonly, noexportedlights/animations; `build_industrial_shaft.py` rebuild +`prepare-industrial-shaft.py` no-mipnormalization. Addedauthoringlightsтолькодляpreview, runtimeilluminationотдельно.

ExistingGLBowneddecoder выделен `parseOwnedRigidGlb(bytes,validateScene)` безослабленияstrict11meshes/850triangles/embedded128imagepolicy; Characterparse продолжаетrest/modelvalidation. Environmentvalidatorfixednames/identitytransforms/UVnormalfinite/indexlimits/authoredarenaenvelope/rear-decor-depth checks before rendereraccept. Firstpipeclampfrontz−1.045 failed−1.049bound; correctedinBlender−.03depth, notrelaxedvalidator. Initialwallatlasstretchfixed12panels; lowergrilleliftedawayfrominitialheadsilhouette. Ownassetgeometrytracked, rendererdoesn'tdoubledisposegeometry; cachedmeshmaterials/atlasownedperparser. Generaluntrustedscenevalidation/decoderdeadline неclaimed.

RetroRendererdefaultusesauthoredshaftinplaceofgreyboxwalls/grid; surfacepipelineusedonenvironment too. World-localgreenkey/bluefill/floorpool are **analytic shader illumination**, notshadowmaporocclusion. NonretrousesactualPointLights/Hemisphere/Directional; two paths visuallynotidenticallighting. EnvironmentvertexjitterOFF, snap/affine/wobble/intensitymaintained; allcharacter/legacyshaderfixturesdefaultlocaluniform0unchanged. Warmrowlamps flashonarmedrows, originalbands/criticalmarkremain. Characterlighting2brighterthanenvironment1; no outline/physicschange. Initial426pixelcontrast2434<3000 rejected; increasedcharacterlight1.65+.10, samegatepasses. This numericalchanged-pixeltest is NOThuman1secondrecognitionacceptance. SubtleNPC3tints shareoneatlas; no3newphysicsprofiles. `?environment=off` keepscharacterwitholdarena; `?art=off` disablesboth; missingenvironmentfile→oldarenaandcharacterstillplayable.

2newunit(actualGLBbudget/arena+unknownmesh/transform/depthreject),4newbrowser(threepresetsretroLambert/noGLerror/rowlamps/restart/worldcountsunchanged; missingfallback/envoptout; exact80steprenderedtrajectoryequality; player>100changedpixels/delta>3000,row>1000redpixelsat426). Full**283unitPASS/1sameangularFAIL**(82.8237),**63browserPASS/1sameangularFAIL**(49.03015),buildPASS. `.pi/unit-iteration32.log`, `.pi/browser-iteration32.log`, `.pi/build-iteration32.log`; finalnormalfiniteindexguard2focusedunitPASSafterfullrun. Productionpreviewactualcharacter+shaft/errors[] verified `.pi/production-shaft-iteration32.log`, screenshot`.pi/shaft-game-iteration32.png`. No referenceFPS/GPU/shadowacceptance. Records2.6unchanged, native/thinphysicsgatesopen. Nextart:shadowvariants/referenceperformance/humanreadability thenjointseampolish/tutorial, notclaimMVPdone.

## Итерация 31 — Blender по референсу, render-only интеграция

Прямой запрос заказчика разрешил независимый art-прототип при открытомphysicsgate. В liveBlender5.3 реально построены11rigidconvex shells, hardnormals/UV, оригинальный грязный сине-бирюзовый128atlas, лицо/повязка/жилет/перчатки/ботинки. 676triangles, `assets/blender/reference-worker.blend`, `public/assets/reference-worker/worker.glb`(74420bytes)+metadata. Референс использован как направление формы/цвета, чужой mesh/texture не копировался. DefaultCube сохранён/скрыт, остальные объекты не удалены; addoncurrent/telemetryOFF.

Сначала safe mode отвергexec/open, затем модель создана разрешённымinlinebpy/bmesh иexport/saveoperators; safe mode не отключался. Найдены и устранены: исходные ringquad nonconvex faces→bmeshconvexhull; Blender minFilter9984→offline9728 no-mips; conservativeboxes anchorsoutside→offlineconvex envelope actualmesh+jointanchors/10tissuevolumes; triangulated clip T-junctions→mergecoplanar triangle boundaries beforeartclip. LiveVitewatcher имел staleFactorycache, собственный devserver перезапущен перед финальными тестами.

ReferenceCharacter загружается через существующие strictGLB/rest/model/image/resource проверки, sampledmaxsurfaceerror0.0193657м (<.04). ActualGLBsurfaces reconstructed with percornerUV, scaled by existingfactoryplan; `Part.renderScale` optionalrender-only preserved saw/bite/rows. RetroRenderer использует оболочки/atlasbothretroandLambert; capsneutralatlastexel/directredmaterial. Survivingphysicalcapplanes режут shell; если significantphysicalsliver вне insetbevel, render fallback physicalpoly сохраняет видимость, тело не удаляется. Движение/позы/массы/коллайдеры/ограничения/occupancy не заменены; exactart/greybox120steptrajectory equality PASS. Productionmetadata connectors подготовлены/validated, но **не используются runtimejointsolver**. Игрок делит676triangleNPCshell, не final700–1100target. Discrete skin/animationrig/palettes отсутствуют.

3newunit: actualGLB11/10/rest/atlas/noexternalbudget; all11meshesconvexmanifoldfiniteUV; repeated2planeartcutsclosed/keptinsidecutplanes. 3newbrowser: actualload/move/ragdoll/saw2caps/bite/rowrenderScale/restart/retroLambert/GLerror0; physicaltrajectoryexact; missingassetplayablegreybox. Default artON, `?art=off` oldtechnicalvisuals. Fetch5sdeadline только download, parseImageBitmapdeadline ещёнеimplemented; fallbackgreyboxнаdownload/decode/validationreject. Own resources disposed with renderer. WholeuntrustedGLBpolicystillboundednotuniversalsecurity.

**Checks:** fullunit281PASS/1originalangularFAIL(ω82.8236998809527), fullbrowser59PASS/1originalangularFAIL(ω49.03015422709435), final6focusedbrowserPASS afterlastsliverfallback, buildPASS. `.pi/unit-final-iteration31.log`, `.pi/browser-iteration31.log`, `.pi/reference-final-browser-iteration31.log`, `.pi/build-iteration31.log`. Fullbrowserдоfinalsliverfallback, targetedпосле; no falseallgreens. Naturalartplay18drops/29cuts/2rows/27.05sROW_CLEAR/noNaN; ω889.94stillunacceptable(fullthinfragmentphysicsgateopen). Screenshot `.pi/art-game-iteration31.png`, `.pi/art-closeup-iteration31.png` (closeupcamera diagnostic only; defaultcameraunchanged). Referenceperformance/shadows/shaftstyling/connectorruntimeadoption/continuousUV affinepolicy/decodercancellationstillopen. Gate4STARTED, notclosed; records2.6unchanged.

## Итерация 30 — image preflight и resources owned per parse

Выполненследующийassetпункт: ImageHeader.tsPNG/JPEG/WebPheaders/containersize/dim≤128×128/encoded≤1MiB/images≤12/pixelbudget beforepixeldecode. PNGanimatedchunks/WebPanimation/unknownMIME/zero-or-huge/truncatedspoofeddimensionsrefused. ContainerinspectionreturnsimageBINoffsets/lengths andchecksrestrictedtexsamplersnearest-linear(noignoredmipmapconfiguration). **Headerparsernotcompletecodecvalidator**: CRC/zlib/JPEGentropynotfullyvalidated, smallcorruptpayloadrejectsatbrowserdecode. No universalcodec/OOMsecurityclaim.

CharacterGlbinputcopiedbeforeawait, preventsTOCTOUcallerbytesmutation; bounded16MiBcopysize. ParserusesregisteredlocalpluginloadTexture +declaredAPIinstanceadapters (getDependency/loadGeometries/loadMaterial/assignFinalMaterial), no globalpatch/runtime cache. CharacterResourcesdedupsgeometries/materials/textures/bitmapclose, CharacterTaskstracksasynchronousdependencies/settleslatecompletionsonerrorbeforecleanup. EmbeddedimageownedcreateImageBitmap→Texture, noobjectURL/fetchforimages; imageheadervsdecodedresolutionchecked. Missingdecodeerrorrejectsasset(notGLTFLoader'ssilentnulltexture). Bitmapavailableprofilemandatory; noImageLoaderfallbacknotyetimplemented, nocancel/deadline/workerisolation.

7newunit(5imageheader+2resourceownership):3codecsmallvaliddimensions/large/truncated/zero, animated/container corruption, MIME, sharedresourcesonce/disposeidempotent andlatepromisecompletionclose. Browser+4newcases:actual2pxPNGdecodeonce/sharedtexture/disposeclose, oversizedPNGheaderneverreachesdecoder, rejecteddecoderreleases≥11alreadycreatedgeometries, corruptsmallIDATrejects(nottexturelessaccept), bytecaller-mutatedafterparsebeginsstillpassesstablecopy. ExistingGLBnoexternalnetwork andQTEregressionsPASS. ResourceobjectURLsnotcreated, noPromiseerrorssilentlyignored.

**Fullchecks:**278unitPASS/1originalangularFAIL across57files/279tests;56browserPASS/1technicalangularFAIL across57cases;buildPASS/dist. `.pi/unit-iteration30.log`, `.pi/browser-iteration30.log`, `.pi/build-iteration30.log`. Records2.6/QTE/gameplay/PhysicsManagerunchanged, assetparserunusedbydefaultgame. Nativeangular82.824/technical49.030stillopen. ASSETS.mdcontractupdated, noart/Blenderassetproductionyet.

ДальшепоPLAN:offlineassetvalidationCLI и подготовкатехническойauthoring/previewприopenphysicsgate; decoderdeadline/cancellation/browserfallbackостаютсяотдельнымиограничениями. НетобъявленияMVP/securityforallassets.

## Итерация 29 — rest-pose / decoded GLB validation

Продолжениеassetgate: CharacterRestPosechecksparsedmetadata worldframesangularrange иnonneighborrestpenetration>.002м. PairwiseRapierGJKнаcoincidentfixtureвозвращалнеотрицательнуюdistance, поэтомудляofflineconvexrestcheckдобавленfullSATface+edgecrossaxes сdirectiondedup; noRuntimebodiesallocated/constraintsdisabled. TangentbranchedfixturePASS; прежний11overlappingcubeschemafixtureтеперьrestgateFAIL. Directneighborsstillallowed, actualanatomyauthoringнеподменяетсяSAT.

CharacterModel validatesdecoded11rigidmeshesnames/relative-to-roottransform/unitapplyscale/shear/reflection/skin+morphoff,attrsUVnormal/indexfinite/countlimits/normalunitlength,total≤850triangles. Globalscenerootplacement ignored, novertexwrites,texturecount≤12/dim≤128. Samplesvertices/edgemidpoints/centroids**bidirectional**render↔hull error≤.04м: catchesmissingfaces+grossmismatch, ноэто**нестрогийHausdorffproofвсейтриангуляции**/nonaffineUVart. ValidatorsseparatefromGame, runtimebundleнеувеличилсяотunusedassetparser.

CharacterGlb inspectbeforeGLTFLoader: GLB2header/length/chunks≤16MiB/JSON≤1MiB, strict1BIN/1scene11meshes≤64nodes, nested/keyarraybounds,triangleprimitiveonly/requiredPOSITIONNORMALUVfloats, bufferViews/accessors bounded componentformats/indices, single-parentacyclicreachabletree. URI(data/file/network)/extensions/skins/animations/morph запрещены. Metadatarestcheckedbeforedecode; successfulparsedassetcallerdisposes/resourcesdedup, postdecodevalidationfailcleansscenes. Embeddedimageheadersещёнеcheckedbeforebrowserdecode (knownnextstep); loaderrejection-beforegltfownershipneedsaudit. не«полностьюбезопасныйuntrustedassetserver». SyntheticfixtureGLBсозданtestencoder, неBlender/humanart.

7decodedmodelunit +3rest +5containerunit=15newunit,2browser: actualselfcontainedGLBparse/meshmatch/rest/bidirectionalsurfaces/dispose;externalURIblockedbeforefetch. InitialnewGLTFLoadermoduleViteoptimizationreloaddestroyedevaluation; warmedrerunandfullsuitePASS, nohiddenwait/skipruntime. Latesttexturetypingbuildfailurefixedbyexplicitunknown-sizedimageguards; addedoversizedtexturefixture. OldQTE/connector/UV/budgetsPASS.

**Fullfinal:**271unitPASS/1originalangularFAIL across55files/272tests;52browserPASS/1technicalangularFAIL across53cases;buildPASS/dist. `.pi/unit-iteration29.log`, `.pi/browser-iteration29.log`, `.pi/build-iteration29.log`, `.pi/asset-focused-iteration29.log`. Native20dropω82.824/technicalω49.030unchanged,recordsv2.6/gamebalanceunchanged. Blenderнеизменён/defaultNPCartnotreplaced. ASSETS.mdvalidationcontract/remainingrisksupdated.

Следующийboundedшаг: embeddedimageheaderpreflight / load-failurecleanup иofflineGLBvalidationCLI, далееtechnicalauthoring/preview сBlenderприявнооткрытомnativeangularGate0. Massartproductionиreleasecriteriaнеобъявленыготовыми.

## Итерация 28 — bounded topology и metadata parser до world allocation

СледующийGate2пунктреализован: GeometryBudget countspositionalvertices/fantriangles/faces/corners, cheapceilingsдоquadraticweld. Defaultpart256verts/512triangles/128faces/1024corners, world100kverts/180ktriangles — техническиезащитныепределы, **неperformanceacceptance**. PhysicsManagercacheperPart usage/remove/disposereset/debugsnapshotgeometry; directcreatePartchecksbody+world, factorycheckwholeplan, row/saw/bitefinalreplacementpreflightbeforeallocate. Internalstagedtruepermitsalreadyvalidatedsurvivorsbesideoriginals, финальныйbudgetвычитаетsources, nofalse,doublecount. Budgetfailthrows/no originaldeletion/transactionadvance; no significantfragment simplification/dustpolicychange. Existingexternalpolycap/recolor withouttopologychangevalid; arbitraryoutside-topologymutationnotAPI.

`src/assets/CharacterMetadata.ts` boundedunknown-objectparser schema1metersY,11expectedlimbs/10directedlinks, finitepositions/unitrotationsframes, fullUVclosedconvexhulls,72±.1kg/adjacentmassratio≤10,triangles≤850, hinge/genericranges, anchorsinsidehull/worldcoincident≤1mm, allconnectortissuewithinphysicalhull. Sparsearrayscheckednotmapped-away; parsercopiesinput. Notproductionloader/GLBmatch/restoverlapvalidator yet. Syntheticfixture11overlappingcubespassesonlyschemaandhasnoreadyclaim; no shippingcharactercreated/noBlenderchanges. [ASSETS.md](ASSETS.md) records exactlimitsandunimplementedgates.

8budgetphysicsfixtures: cachedusage/release, topologybeforeallocation, wholespawnoverlimitnobodies, row/sawpreflightUV/bodypreserved, finalreplacementsnotdoublecounted, bitefree, allocationrollbackcounters, directallocationworldcap.6metadatafixtures: schema/copy, duplicate/missing/limits/frame, anchors/tissue/mass, UV/nonfinite/boundedsize, sparse, nonproductionexplicit.2browserfixtures: oversizedfactoryrejectatomic/parsernoNodefs. QTEautoescape/oldtestsPASS.

**Fullrun:**256unitPASS/1originalangularFAIL across52files/257tests;50browserPASS/1technicalangularFAIL across51cases;buildPASS/dist. `.pi/unit-iteration28.log`, `.pi/browser-iteration28.log`, `.pi/build-iteration28.log`. Originalω82.824/technical49.030unchanged, no testthresholdchanges. Gameplayrecords2.6unchanged, mostnormalassetswellbelowcaps. RendererperpartbudgetnotglobalGPUbudget, totaltextures/drawcallsnotaccepted.

Следующее:assetGLB↔metadata/restposeframe/overlapvalidator, completeauthoring10connectorsandUV, thenBlendertechnicalpreview; fullallocationfailurematrix ещёрасширять. NativeisolatedRust/WASMdecision/referenceperf/MVPopen,артнеfixangular.

## Итерация 27 — UV сохраняются на геометрических остатках

ПродолжениеGate2surfaceattributes: `Face.uvs?:{u,v}[]` perfacecorner +surfaceId; `SurfaceAttributes.ts`finite/count/sparsevalidation, legacyoutsideUV fallback, stablebodylocalplanarCapUvs. Clipperсохраняетoldcorners/perfaceUVseams, интерполируетcrossingedgeUVсgeometric t, синхронизируетcleanedpositions/attrs, carriesoldsurfaceId/cap. Newcaps имеют2Dcutplanebasis/`surfaceId=cut`;capcentroid/size неиспользуется, repeatedcaptexturedoesn'tslide. Источникнеmutated. Physicsdedup/mass/COM/colliders не используютUV. MalformedUVarraysfailbeforeclipevenno-op/pre-render; коллизии/плотностьнепереопределяются.

Renderer.geometryиспользуетauthoredfaceUVs илистарыйx/yfallback;newcapUVобеоси, исправляетгоризонтальныеcapsсвырождениемоднойtextureстроки. BloodOffнеchangesUV/normal/position. surfaceIdmetadataещёневыбираетmaterialatlas/art; normalsfanflatunchanged. Arbitrarynon-affinen-goninteriorперетриангуляцияможетизменитьinterpolation; edgeattributesверны, productionauthoringneedaffinefaceunwrap/triangulationpolicy. Этоявныйlimit, невсеUVmodelsautomaticallysupported.

9geometryfixtures:affineUVedge/seams/noinputmutation;two-axis/oppositenormalcap;repeatedcutsstableUV;position-onlygeometryvolumeCOMexact;non-affineedgeinterpolation;malformed/sparseattributes;rendererexactcorners/bloodoff/legacyfallback. 4physics:row/saw/bitegeometrymassvelocityidentical+60ticksobserveexactworld/noNaN; allocationrollbackpreservesorigUVarrays. Browser128pxDataTexturefixture pixel-equalretainedarea before/aftercut, removedsideempty,capUV2D/GL0; shader/blood/QTEtestsPASS. [SURFACES.md](SURFACES.md) containscontractandlimits.

**Fullchecks:**242unitPASS/1originalangularFAIL across50files/243tests;48browserPASS/1technicalangularFAIL across49cases;buildPASS/dist. `.pi/unit-iteration27.log`, `.pi/browser-iteration27.log`, `.pi/build-iteration27.log`. DefaultoutsideNPCtexturesunchanged, capsvisually2D; gameplayrecords2.6unchanged. Originalω82.824/technicalω49.030stillfail, thin/geometrycriteria notweakened. Blenderнеизменён, нетproductionassetfinalclaim.

СледующийнезависимыйGate2шаг: vertex/trianglebudgets,assetmetadata+all10connectorsvalidator ирасширенныйprepare/commitfailurematrix. Послеtechnicalassetpipeline можноделатьpreview/authoringвBlender, ноartнеобходитopenphysicsGate0.

## Итерация 26 — connector metadata и реальные разрывы связи при срезе

СледующийGate2пункт: `src/physics/Connector.ts`,optionalJoint.connector(a/bconvexpolys) иframeA/B. CreateJoint validatesclosedconvexpositivefinite tissue+anchorcontain1mm, unitframes; frames appliedbeforelimits/motors. RagdollOptions.connectorsmapkeyparent:child, metadataunscaledbodylocal→finalscaleonce/sourceimmutable. DefaultfactoryNPCнеполучаетавтоматическипридуманнуюткань: oldgeometry/trajectory/records2.6unchanged. Это supportauthoringAPI, неготовые10productionconnectors/assetpipeline.

`connectorIntersectsSlabs` exactworldprojectionextrema/positiveoverlap>1e-9: tangentнетcut. `clearRows` смотритallrelevantconnectorsдажебезchangedhulls,connector-onlyseverstagedbeforedestructivecommit; unrelatedallocationfailurepreservesoldjoint/parts/transactionID. Survivingframes/limits/metadataremapped, connectorsaffectedfamiliesincludedcontactrestore. Sawkerf andSvarleatenintervalalso checktissue, notanchorsalone. Noextra body/mass/decorativecollider, noNPCdeletionoutsidecut, unannotatedgreyboxpolicyunchanged. Любойcutconnectorvolumeсейчасконсервативноснимаетсвязь; нечастичнаяпрочностьсустава/CSGconnectivityproof.

8newphysicsfixtures:1)rowcrossesconnectorwithendpointshullsuntouched→onlyjointremoved/mass0removed;2)survivingconnectorandframes/limitsremap;3)connector-onlyatomicrollbackwhenanotherallocationfails;4)sawkerfanchorretainedbutslicedconnectorsever;5)bite tissueeatenwithoutbodyallocation;6)factoryscaleimmutablemass144;7)metadataoutsideanchorrollbackallparts;8)invalidframe/preallocation/rotatedtangency. Browserconnector-onlycutpreservespositions/mass/bodiesPASS. Olddismemberment/QTE/pressure/contactloadallPASS. [CONNECTORS.md](CONNECTORS.md) recordsauthoring/schema/scopeandremainingchecks.

**Полныйrun:**229unitPASS/1originalangularFAIL across48files/230tests;47browserPASS/1technicalangularFAIL across48cases;buildPASS/dist. `.pi/unit-iteration26.log`, `.pi/browser-iteration26.log`, `.pi/build-iteration26.log`, `.pi/connector-focused-iteration26.log`. Originalω82.824/technical49.030unchanged, no stresscriterionchanges, recordsv2.6 unchanged. NoBlenderscenemutations/artproduction; nextsurfaceattributes/UVfixture andauthoredmodelvalidator. Nativephysics/referenceloadfairness/fullMVPstillopen.

## Итерация 25 — измерение реальной реакции опор, не смена recovery-баланса

ПродолжениеPLANpileLoadfairness: созданread-only`src/player/ContactLoad.ts`/`ContactLoadWindow`, runtimeobserverопционален `PhysicsManager.contactLoadDiagnosticsEnabled=false`default. При включениипослекадогоsolverподшага собираетсяreactionnormalimpulse толькоplayer↔NPCmanifolds, учитываетflippednormal, normalY>.25downward / <−.25upward отдельно. Суммарныйverticalimpulseделитсяна9.81*sumdt, анепоследнийdt: два1/120substeps→один1/60sample. DedupownPart/NPCpair, no staleWASMhandles aftercuts, sensors/disabledexcluded. kgEquivalentнеphysicalmass: impact/activePD/frictionувеличиваютreaction;missing sleepdataexplicit `stalePairs/complete=false`. Спящие пары retainoldimpulses, поэтомуневыдаютсякакnewforce. No waking/forces/posewrites/health/spawn/QTEupdates со стороныobserver. DebugSnapshotcontactLoadread-only, нагрузкидляeffortостаютсястарыеpileLoad.

Controlledbridge72kgнаplayeronly→~72kg-equivalent; symmetricalplayer+staticsecondhalf→~35.96–35.99kg, ноexistingwholecomponentpileLoad72вобоихслучаях. Замеры120freshsamples/1или2solverподшага иbrowser36kgPASS. ЭкспериментwakeUpawakeпоследнихsamplesявновtestfixtureобоихcontrolworlds, невobserver/game. Темсамым**переоценкаконсервативнойнагрузкидоказана**, gameplayfixневключён: нужны awake/sleepfallback/calibration и отделениеrise/impactforces.

10newphysicsfixtures: shared/fullbridge×1/2substeps; sleepstaledata/resume; twoPlayerPartsnonduplicatedreaction; normalscreationorder/upwardsupport; duplicatepartrefs; removedpartstale; sensors/disabled/dt; observeron/offeverybodypose/q/v/ω/sleep exact360ticks, defaultOFFnotcalled. Completeflagзначитfresheligiblepair samplesвсемподшагам, не«точныйвес». Нетbody/geometrydeletion. Newbrowserfixturecomparisonexactphysics/realsharedload/stalemarkingPASS.

**Финально:**fullunit221PASS/1originalangularFAIL across47files/222tests;fullbrowser46PASS/1technicalangularFAIL across47cases;buildPASS/dist. `.pi/unit-iteration25.log`, `.pi/browser-iteration25.log`, `.pi/build-iteration25.log`, `.pi/contact-load-focused-iteration25.log`. QTE6mirrorNPCfixtures2browserпродолжаютPASS. Records2.6unchanged, gameplaynativeconstraints/recoveryassistpressureunchanged. Original20dropω82.824/technicalω49.030неfix.

Далее: authoredconnectorvolumes/UVvalidation какследующийнезависимыйGate2пункт; contactLoadgameplayadoption остаётсяopenдоsleep/activeposepolicy иcalibratednaturalpiletests. NativeWASMtoolchaindecisionпоNATIVE_PHYSICS.mdотдельно, artнеподменяетphysics.

## Итерация 24 — приоритет заказчика: QTE-выползание и освобождение места

Заказчик снова сообщил, что персонаж постоянно застревает после подъёма, и разрешил локально сдвигать ближайшие тела / реализовать выползание. Проверка нагрузки отложена до исправления этого пользовательского blocker. BlenderMCP5.3/addon1.8protocol15актуален, telemetryOFF, стандартныеCube/Camera/Light несохранённойсцены не изменены.

Воспроизведено `qte-recovery.test.ts`: три настоящих NPC ×2 падают сверху, игрокragdoll,5jump taps→100%; прежний код8секундостаётсяCRAWLING/targetnull/sleepingpose, потому что искалstandingX лишь±.55 и послеfullQTEпрекращалriseforce, ожидаяinputaxis. Один/дваNPCпроходили. **Это runtimeзастревание, не толькоangularstress.**

Исправлено: fullQTErecoveryTarget ищетlegalstandpositionsдо±2м вокругpelvis сroot/bothfeetactualground иfreecapsule/retainedhulls. Nearbytarget<.6 идёт в обычныйboundedphysicalrise; дальнийилиmissingtarget вызывает supportedautocrawlбезadditionalinput. Направление наcandidate либоstickyfallbackfromcenter, `recoveryEscapeAxis` проверяетпуть всехреальныхpartshapesна.16м противstaticwalls, можетразвернутьсяилиостановитьсяclosedtrap. Netcrawlforce≤1800Н / target1.9m/s×damagefactor, massshare, реальныеjoints/contactsenabled. Playerbodyposewrites/nearestpointteleportнеadded. Тот жеphysicalplayerIDspreservedпокадинамика, handoffтолькоclearcapsule/torsoalignment/sweep. NPCнеудалены/непереспавнены.

`RecoveryAssist.openRecoverySpace`: fullQTE локальныеactualcontacts≤.06м playerparts→NPC, дедупpartID/max4nearestbodies, horizontal/depthimpulsesonly, max180Н×dt≈3Н·сзаtickсовокупно. Targetsforwardvelocitygain ограничен.8m/s; alreadyfastbodyнеполучаетextra, realsupportbelowневыбиваетсявниз, staticwalls/endpenetrationveto. НикакогопрямогоsetTranslationNPC/familykick/globalclear. Послеsuccessfulhandoffэтотtinyspaceassistещё1.5с возлеcapsule, затемexpires; обычныйstandingдоQTEнерасталкиваеткучу. Это явноеuser-approved recoveryassistance, неnativeangularfix.

UIcircle100% теперь«ВЫПОЛЗАЕТ»/«ОСВОБОЖДАЕТ МЕСТО»/«ПОДНИМАЕТСЯ», вместо0remainingpresses; debug`recoveryAssist.axis/impulse`. Fullprogressсохраняетсяеслиfixedroofнепускает; roofremoved→continuedriseбезnewtap. Безногсохраняетсяsupportedcrawl/missinglimbsnoheal; А/Dмогутуказатьнаправление.

Проверены1/2/3NPCобаmirror-направления (6cases):fullQTE→KCC/ACTIVE≤6с, noadditionalpresses, realwalk>.5м/30ticksвнаправлениивыхода, grounded/qtehide/1escape/noNPCdeletion/playerIDsuntilhandoff. ThreeNPCcase~1.95/4.03сдоhandoff,autocrawl60/155frames; single/twocases~.4–.87с. В одномmirror2NPCшагобратно**вкучу**blockedrealshin:этонеmovementbug, прогулочнаяпроверкавыбираетнаружу, неassertwalkthroughsolidbody. Open/fixedrooftrap/staticwall/autoreverse/distantbodies/maximpulses/fastbody/ordinaryidle/assistexpiryfixturesPASS. Chromium3NPCmirrors2casesPASS, screenshotsqte-auto-escape±1.png. Старыеinjury/prone/movingplatform/sawguard/HUD/cleanupfixturesPASS.

**Полныйrun:**211unitPASS/1originalangularFAIL across46files/212tests;45browserPASS/1technicalangularFAIL across46cases;buildPASS/dist. `.pi/unit-iteration24.log`, `.pi/browser-iteration24.log`, `.pi/build-iteration24.log`; раннийrepro`.pi/qte-recovery-early-iteration24.log`, focused/mirrorlogs. Никакиеstressпорогинеослаблены, originalω82.824/technicalω49.030unchanged. Records **2.6-qte-auto-escape**, отдельноот2.5/2.4; currentdocsupdated. Это воспроизводимый recoveryfix, неguaranteeagainstfullyclosedstatictrap/весьMVP.

Далее поPLANвозвращаемсякконсервативнойpileLoadfairness и authoredconnectorvalidation/retainedthinfields; Blenderдлятехническогоauthoringпослеизолированнойпроверкирисков, безподменыnativephysicsграфикой. Toolchain/builddecisionпоNATIVE_PHYSICS.mdоткрыта.

## Итерация 23 — общий pressure budget и подвижная опора

Следующий независимый PLANпункт выполнен частично: проверка standing weight/landing/stomp распределения и recovery на реально движущейся dynamic опоре. Найден и воспроизведён **настоящий runtimebug**: прежнее min(totalCap,raw*share) применялосьperbody. 3support highspeed landing давало40Н·с вместо16, stomp88вместо32; singlebody мог получить32вместоperbody16. СкоростьCOM/точки опоры игнорировалась, falling-support−8/player−2 получаллишний16Н·с удар. Старые4regressionsFAILдоfix, послеPASS.

`src/player/SupportPressure.ts` purelandingShares: raw=.12*mass*max(0,vSupportPointY−vPlayerY)*normalWeight/totalWeight, общий scaling≤16normal/32stomp; perbody8/16. Капы вынесены в `CONFIG.playerContact`, maxsupports3/weightcap12/cooldown.3unchanged. КонтроллерснимаетpointvelocityCOM+ω×leverдоимпульсов, учитываетcarryYplayer, отдельно распределяет64*9.81*dtstandingweight, не перераспределяетextraударненагруженнымопорам. Сумма всехsharesнепревышаетbudget; nofakeupwardkick/forces/velocityclamp. Landingтолькоприgroundedtransition/cooldown, duplicatecollisionpartdedupunchanged. Horizontal160Н·с/сbudgetнеизменён и проверен.

Testsgeometry3(order/closing/perbody/nonsupport), physics9 (scriptedKCCreports withactualdynamicimpulses +actualsweptlandingfixture) охватываютtotal16/32, perbody8/16, downcomingsupportzeroimpact, angularpointvelocity, equalweightshares, duplicatecontacts, norepeatedlanding, airborne/sidezerovertical, boundedhorizontal. `moving-recovery.test.ts`2directions: real180kgdynamiclowfrictionsupport drivenbybounded20Н·с impulses/20ticks, moves.245m duringrise; QTE→ACTIVE/KCC, nohealing/deletion, groundednormalwalk >.5m/30ticks,handoffdistance≈.164m, speed/ωcapsPASS. Этоwidecontrolleddynamicplatform, **неproductionrig continuity/fullmovingNPCpilegetup**.

Actual6NPCpile2seeds100jumps each/10disturbances retainedgroundedmassIDs/jointsPASS afterpressurefix: seed17exercisev.366/ω1.092,seed42v2.878/ω7.544; nofallthrough/knockdowns. Actual/maxangular82.824 неизменён (noplayer), technical36sω49.030stillFAIL. Sharedpressurefixневыдаётсязаnativeangularfix.

Fullrun**199unitPASS/1originalangularFAIL** across44files/200tests; **42browserPASS/1technicalangularFAIL** across43cases; buildPASS/dist. Логи`.pi/unit-iteration23.log`, `.pi/browser-iteration23.log`, `.pi/build-iteration23.log`. Затем добавленbrowseractualKCCtwo-supportpressurefixture: targeted2browserPASS(+existing20jumppile); новаяполнаяbrowser-suiteпоследобавленияпоканеповторена. Новаяrecordsversion**2.5-shared-landing-pressure**, isolationfrom2.4/2.3testsPASS, deliberatebalancesegregation. Recordsupgrade неменяетownership/tissues/input/saw.

Дальше: fairnessконсервативногоpileLoad (wholeNPCmass приmultipleplayer/support contacts), short-horizonNPCpilegetupcontinuity / retainedthinfields, nativebuildtoolchaindecision. Этап0/1stillopen, критериинеослаблены.

## Итерация 22 — exact WASM provenance и KCC на настоящей куче

Nativeprovenance теперь закреплена: npmmetadata`gitHead` и registrySLSApayload согласованы на **b716d375efc0201003f0cd9ef7168eee0b62c177 / tagjs-v0.21.0**, nativecrate **0.36.0**. Прежние `.pi/*v0.35.2*` исследования — исторические, неexactnativebuild. Скачаны read-onlyexactcommit source excerpts в`.pi/native021`; bindingsworkspacepatchescrates-io→inrepocrates/rapier3d, Cargotemplatepin JS.21/native.36.0, workflowbuildrun36112107426. `NATIVE_PHYSICS.md` фиксируетsources/hash/пререквизиты/инструментируемыеряды/ограничения; systemRusttoolchain неустановлен, cargo/rustc/wasm-packнеfound, no nativebuildclaim.

`npm audit signatures --json --include-attestations` PASS:51registry signatures/23attestations verified, Rapier0.21 entryverified, invalid/missingempty. Это проверка npmtooling, неcustomcryptoаудит. `.pi/npm-attestations-verified-iteration22.json`, `.pi/npm-signatures-iteration22.log`. InstalledexternalWASM=compatJSembeddedbase64byte-for-byte,3082103bytes/SHA25617cfa80e…; offline `rapier-provenance.test.ts` assertspackageversion/lockintegrity/hash/embeddedbytes. Manifesttests/fixtures/rapier-build-provenance.json. Dependency/solverнеобновлялись.

Независимый Gate0/1 KCCpilefixture: `tests/physics/kcc-pile.test.ts`6реальнопадающих×2NPC(2heavy/4normal)66parts60joints, seeds17/42. 100прыжковкаждый,10bounded2Н·с disturbancesреальныхsupports, naturalSleeponly/безstaticconversion/безmockimpact/безprotectedgrace. Seed17all66sleepbeforeplayer;placementбудиткучу. Все100landingsподтвержденыactualNPCdownwardcapsulefootprint (snap позволяетgap, прямойdistance<5cm недостаточен). Penetration0/knockdowns0/массаIDsjointsсохранены, каждыйbodydynamic. Preparationv13.762/12.168 ω30.480/30.116;exercisev.392/3.330 ω1.142/8.522 (<25/<35). Это2controlledpilefixtures, не rapidwholegame/referenceperf acceptance.

`tests/browser/kcc-pile.spec.ts`: sameactualseed17pile,20jumps/4disturbances/originalimpactdetection,66sleepbeforeplacement, realgeometry/NPCgrounded/massIDsjoints/velocities pass. Screenshotkcc-real-pile.png/reportattachment. Приразработке ошибочныйmanualsleepallmovingbodiesобнулялvelocities ивызвалhighspeeds; этотнеобычныйpose/velocitymutationfixtureотвергнут, вfinaltestsестественныйsleep, ничего вruntimeнеисправлялосьнаоснованиитакогоартефакта.

**Последняя полная проверка:**184unitPASS/1unchangedangularFAIL across41files/185tests;42browserPASS/1unchangedtechnicalangularFAIL across43cases;buildPASS/dist. Логи`.pi/unit-iteration22.log`, `.pi/browser-iteration22.log`, `.pi/build-iteration22.log`, `.pi/kcc-pile-iteration22.log`. Finalassertslandings=100/preparationspeedgateусиленыпослеfullrun и перепроверены focusedrun. Runtimeбаланс/records2.4неизменны. Whole20dropω82.824 иtechnical36sω49.030stillfail; Gates0/1неполностьюготовы.

Дальше: nativebuildisolatedtoolchaindecision и row-levelinstrumentation; параллельно независимаяsupportsharing/pressurebounds/recoverycontinuityпроверка. Безfixclaim/speedclamp/отключенияlimits.

## Итерация 21 — проверка представления суставных ограничений, без ложной стабилизации

По текущему PLAN проверены новые constraint-representation варианты, а не повторно damping/iterations. Research-only `.pi/diagnostics/constraint-rows-investigation.test.ts` + отдельный `.pi/constraint-rows.vitest.config.ts` (не входит в ordinary suite). Сначала pinned110part replay, затем неизменённая20drop/220part/160ticks +600settle траектория. Для same-monolithic rebuild добавлен контроль, чтобы не принять reset/order эффект за fix.

| Вариант | LocalupperArmω | Full20dropω | vmax | maxdrift |
|---|---:|---:|---:|---:|
| baseline |82.824|82.824|17.867|.01950|
| rebuilt samegeneric control |86.364|—|—|—|
| separateposition+3angularrows |71.659|108.878|17.672|.01837|
| separateposition+individualaxes |116.249|96.601|17.647|.03755|
| equivalentcoordinatesreframedtoAngX |113.396|137.164|18.714|.02396|
| spherical+sameangularlimits |86.364|82.824|17.867|.01950|

Все fullcases numericFaults0/calm100%. **Ни один не прошёл angular<35**; все splitrows **отклонены**, nativeSpherical идентичен исходному fulltrajectory. Не было смысла запускать дополнительныеseeds для ужеfailedварианта. Runtime creation/filtering/masses/hulls/motors/solverdt/gravity неизменны; нет clamps/disabledlimits. Результаты `.pi/constraint-rows-iteration21.md`, JSONlocal/lateststress и logs `.pi/constraint-rows-iteration21.log`/`constraint-rows-extra-iteration21.log`. Pass research означает completedexperiment, не acceptance.

Точный causalreplay усилен: выключение только shoulderYlimit даёт localω5.610; shoulderX/Z/elbowlimit не меняют82.824. Excludingexternalforearm49/shin110pair снижаетlocalω34.358, но maxworld42.697; allselfcontactsOfflocal27.493, maxworld89.651 (хуже). MotorsOff83.241. Counterfactuals только отдельныеtestworlds, все значенияasserted; исходныеconstraintsвGameвключены. Вmanifest добавленыimpactpair IDs/normal и capturedstrongestcontactimpulse130.435Н·с приdistance0.000059763м, бинарныйsnapshotнеизменён.

Добавлена read-only`relativeTwistMotion`: worldJacobian/rate каждойprojected2atan2(q_i,q_w)coordinate, axisRate и singularitydenominator. Coupledrotation меняетderivative: shoulderYafterrate92.374 vsplainaxis72.726, denominator.82954 (неsingularity). Центральныеfinite-differencefixtures на independentlymovingbody/localframes +pureaxis/singularnull проходят; diagnostic capture nowstoresratesonlywhenenabled. Observeron/off/one-stepallposes/replayequalityPASS. Это **не доказательство неправильного nativeJacobian**: nativeassembly может использовать другиеcoordinates/orthogonalization. Никакихcorrectiveforces добавлено не было.

JSwrapper0.21 API не exposesjointsoftness/coupledswingcone/solverrowimpulses; saved/downloadingupstreamv0.35.2Rustsource нельзяобъявлятьexactnativebuildofpackage. `cargo/rustc/wasm-pack` отсутствуютвPATH, systemtoolchainнеустанавливался. Следующий physicsшаг требует закрепитьnativebuildsource/toolchain иinstrumentangularrowcoordinate/Jacobian/RHS/impulse, неJSspring/velocityclamp. Независимые pileKCC/recovery/connectorработы могут продолжаться, Gate0приэтомостаётсяopen.

Проверка: **fullunit181PASS/1originalangularFAIL** across39files/182tests; ω82.8237/v17.8675/drift.01950/calm100 unchanged. **Focused12browserPASS** (weapon/HUD/inputs/recovery/context/shader). **BuildPASS**, distобновлён; records2.4unchanged (нетbalancechange). Fullbrowserнеповторялся; последнийfulliteration20 **41PASS/1technicalangularFAIL**. Logs`.pi/unit-iteration21.log`, `.pi/browser-focused-iteration21.log`, `.pi/build-iteration21.log`. Ни один полныйgateнеобъявленготовым.

## Итерация 20 — сверка документов и Gate 0 shader integrity

По запросу «посмотри потом в md файлах и сам проект что сделано что надо сделать и давай делаем по плану» прочитаны целиком GDD/TDD/PLAN/PROGRESS/README/CHANGES; сверены runtime Config/Game/PhysicsManager/RagdollFactory/PlayerController/PlayerRagdoll/slicing/renderer/input/records и fixtures. Основной игровой цикл реализован, но нет полного закрытого gate. Исторические мгновенный escape, вечный injured ragdoll, прежние defaults/счётчики тестов не являются текущим контрактом; новый верхний раздел README/PLAN явно отделяет историю.

Следующий ограниченный Gate 0 пункт реализован в `tests/browser/shader-integrity.spec.ts`: production `surfaceVertex/surfaceFragment` на perspective mesh сравниваются для welded geometry и duplicated shared positions с разными UV по каждому треугольнику. 8 visual ticks, snap+jitter on: pixel equality0differences, animation действительно меняется; off-state не зависит от времени. Production `compositeFragment` получает linear gradient DataTexture, сравнивается с CPU sRGB +24levels/Bayer4×4: maxerror≤1byte, midpoint≈188 (не linear128 и не doublegamma≈223), dither pattern повторяется каждые4rows. GL errors0. 2new+1existingaffine browser PASS. Shader/render/physics runtime не менялись ради fixtures; shadow/reference/browser-matrix пункт остаётся открытым.

Отдельно версия records поднята до `2.4-weapons-grounded-recovery`: новое оружие и немедленная ходьба после подъёма меняют survival balance; новые результаты не должны смешиваться с2.3. Проверка profile isolation добавлена в loss-records.test.ts.

Дополнительно закреплён `tests/fixtures/joint-limit-impact.bin` (432126bytes) +manifestjson из прежнего exactpeak capture `.pi/bounded-motor-peak.json`;110parts/substep1/time25.5167/upperArm-1. `joint-limit-replay.test.ts`: baseline everyposition/rotation/v/ωmatchesexactly, currentω82.8237; allmotoroffstill>35andwithin2rad/s, onlyincidentlimitoff<10and<15%baseline. Counterfactualworldstest-only, runtime limits не отключены, freshbaselineaftervariantsidentical. Это подтверждает источник именноэтогоpeak, не universalfix. Testfixturesnotinbundle. Addedpinned@types/node22.19.1devdependency forbinaryfixturefsimport; audit0. BuildPASS, focused14unit+10browserPASS (records/replay/diagnostics/shader/HUD/session); fullsuiteafternewtestsnotyetexecuted.

**Финальный полный запуск итерации20:** `npm test`177PASS/1FAIL across39files/178tests, originalω82.8237>35 unchanged; Playwright41PASS/1FAIL across42cases, technicalchaosω49.0302>35,36s/twobursts/noerrors. BuildPASS. `.pi/unit-iteration20.log`, `.pi/browser-iteration20.log`, `.pi/build-iteration20.log`. Новые fixtures/records/механики проходят; thresholds/testskip неослаблены. No completegateclaim.

Дальше по PLAN: ограниченное constraint/contact representation, сначала текущий exactreplay, затем original20drop/mixedseed/pile/thin dynamics с прежнимиcriteria.

## Итерация 19 — нормальная ходьба после подъёма, оружие и стабильный HUD

Запросы: псевдолевитация после ragdoll особенно с телом у ступней; если встал — нормальная ходьба с учётом конечностей. Добавить топор/меч/гранатомёт/руку Сварла с удалением съеденного. LMB chop/RMB thrust, увеличить Сварл, взаимодействовать с лежащими телами, Q для переключения, убрать скачки интерфейса.

PlayerRagdoll больше не сообщает ACTIVE до реального handoff. recoveryTarget пробует корень/обе ноги и несколько nearby X, проверяет actual standing capsule + retained hulls; завершение QTE не разрешает невалидное место. На полном progress без legal standing target отключается anti-gravity positional servo, остаётся supported crawl. Handoff проверяет upright torso/low speed +clear endpoint/swept capsule; вdemo после успешного перехода ACTIVE без временной slow gait. QTE остаётся на экране до handoff (zero-legcrawl отдельный completed reward), не сбрасывается из-за premature locomotionReady. Рагдолл удаляется только при успешном переходе. Grounded послеhandoff переоцениваетсяKCC, support carry очищен.

RetainedPolys сохраняет реальные оставшиеся ткани вstanding visuals/следующемknockdown; shortened capsule localoffset/bottom считаютсяпо оставшейсягеометрии, factory mass уменьшается по retainedvolume ratio, полныеNPC имеют прежнюю массу/геометрию. Jump учитываетdamage.jumpFactor; IKclamps actual footreachable distance и поднимает переносимую ногу, повреждённыеvisualsнеhealed. Testsbodycrossingonefoot/immediategroundedwalk, amputeesreturnKCC/retainedvolumeafterfall, zero-legcrawl/roof/prone/cleanupPASS. Этоgreybox IK, не productionrig; full HOP/LIMP balance/continuity stillopen.

`WeaponController`: selectedsaw/axe/sword/launcher/svarl, Qcycle/UIselect/cyclebutton/Ftoggle, LMB/Echop vs RMBthrust (independent Input sources, contextmenu prevented, chordbuttons/cancel/blur/dispose). Coldweapon realblade narrowcontacts +boundedpush/splitjointfallback/cooldown. Grenades max8/life2s/sweptballtrajectory/gravity/blastsmax8/.35s/radius2.2/cutbudget10; query refreshed for each projectile because prior explosion can freecolliders. No weapons without retained arms/hands. Sawexistingguard preserved.

Svarlvisual×1.8/readablemouth/teeth, ballbite radius.58/reach1.85/depth.35, everybitecreatesONLYuneatenpoly (atmost1survivor); eatenbodyneverallocated. Sourcecollider/body/joints removedimmediately, survivedconnectoranchorsremapped, CutResultsource/survivorids letsGore discardconsumedwounds/stains. Wholemealremovesallbody/joints. Melee/Svarl fixtures hitandwake sleepingfloorparts; aimingdown works. Staticraymiss sentinel−1 nowignored inSaw/Weapons, preventsfalsewallsblockinglyingbodyactions. TestsoldsourceID/colliderabsent, massreduction/noeatenbody, jointsurvival/removal, grenadepaths/walls/multi-explosionPASS.

HUD fixedheader72/footer104px, boundedstatus/hint, horizontaltools48pxscrolllane, saw/equipbuttonfixedwidth;1280/640 fixtures varyverylongstatus/hint/stats +allweaponlabels and assertstage/footer/buttonrect equality. New touchthrust, input/paused/contextlifecyclePASS. DocumentationCHANGES.md containscontrolandlimits;distupdated.

Последние проверки: buildPASS; **173 unit PASS** across37files при явно отдельном `ragdoll.test.ts` blocker. Полныйrun до последнегоmulti-grenadefixture:168PASS/1angularFAIL; после+5sleepingtests+1multigrenade остальные173PASS. Fullbrowser**39PASS/1angularFAIL** across40cases:technicalchaosreaches36s/twobursts/noerrors butω49.03>35. Focused36physics+10browserPASS before+1multigrenade, latest13weapons includedin173PASS. Никаких thresholds/testskip изменено не было: exclusion использовано только для явно обозначенной отдельной проверки. Original20NPC angular**82.8237>35** точно воспроизведён и с временной копией исходного NPC buildalgorithm; copyremoved. Runtimephysics tuning unchanged, fullthinfragment/referenceperf/art gates remainopen.

## Итерация18 — impact strength/head trauma + recovery finish

Заказчик заметил краткий QTEflash послеactiveupsaw и poorjump, 100%QTEstuck/hover; потребовалdamagestrengthfromfallingimpacts/vital0death/headimpairments и survivalwithoutallnonvitalextremities.

Protectedupright теперь pressure/QTE gateOFF, KCCjump appliesimpulsestodynamicbodieswithmass64 onlywhileupwardgrace, wallscontactsremain. locomotionReady completesrewardonce afterfullposealignment or1.2ssettle, damagefullragdollstateACTIVE/CRAWLING notforeverGETTING_UP; retainedfootgeometry bottomheight vsfullcapsule, lostsupportresetslift, wholebodyantigravitylimitedafterreward. Samephysicalparts/noinstantnearestpointteleport. TestsnoQTEanyguardframe/jumpheight, alreadydownQTEstillworks, amputee100%panelgone/footground pass.

Anatomy strength vs tissue separated. AcceptedImpact speed/mass formula base18%at6m/s22kg, nearestupright/exactdown limb, impactcooldowns existing. health percentage=minvital, nolegacy6hitkill inGame. head/chest/pelvis0lethal, allarms/legs missingor0stillalive. Bruisesnohiddenmesh/nohealedparts/noalwaysragdollflag. Tissue cutsproportionalstrength, slowlegdamage. HeadTrauma separateseededepisodeRNG, severity<75%health startskey/mouseinverse, <45% sometimestrip whenstandinggroundedunprotected. QTEpresscounts andpause/restartsawholdunaffected. Simtime freezeandreset verified, warningvisible.

Final161unitPASS/1oldangularFAIL,34browserPASS/1legacytechnicalFAIL,buildPASS/dist. `.pi/unit-trauma-final.log`, `.pi/browser-trauma-final.log`, `.pi/build-trauma-final.log`. Newtrauma-damage6unit/headtrauma2browser, recovery3unit/2browser. Existing actualfallingheadfixture now checkspercent→0ratherthan6exacthits. Records2.3-impact-anatomy-head-trauma; newestdocs overrideprevious98%vital/6hitsdefaults. Fullthinfragmentphysicsstress remains, nostabilitygateclaim.

## Итерация 17 — постепенный подъём, вес кусков и анатомия

Новые запросы: убрать instant nearestpointrespawn, постепенное ragdollраспрямление каждым нажатием; sawcut неpaperkick, fallingmass/downwardmomentum + playergrace; vitalhead/torso survival+damagemap/lostlegs movement; QTEпоцентру поля.

УбранArcadeEscape/completeEscape, samephysicalbodyIDs: начальныйpose→interpolatedposition/quaterniontargets поQTE, poseProgress ограничен1.4/s, massweightedboundedPD/torque, no body.setTranslation while rising. Разжимает movablepile физическими силами, A/Dmovingtarget/groundadjust, fixedroofstillblocks. Неповреждённыйhandoff onlyaligned/clear; injuredstaydynamic/renderclippedpoly missingpieces, neverregenerated. Pronefixture.2stageheadup/sameIDs/after5tap+settlehandoffPASS. Поэтому instantguaranteeстаройитерации16 отменён.

SawGuard split velocityfield keeps downwardv/kg/spin, allside/lift/spinassignment removed, grace1.8s whileactualcontacts enabled. Browser caught a staleVite servedmodule stillreferencing deletedsideSpeed→NaN althoughdiskwasfixed; identifiedcurl servedJS, restarted ownproject Vite process, fullfreshserver regressionspass.

PlayerDamage11retainedvolume states vitalhead/chest/pelvis≥98%. Bottomrowcut nowLIVE withLIMP/shortenedshins, severonelegHOP/reducedspeed/bob, severbothCRAWLsupportedforces. Detachedplayerpiecesstayphysicaloutsidecontrolledcomponent, largestpelvisrootselection, consistentmissing-limbfactory. Map11percentstatus left, QTEcenter, 100%textподнимается notinstantescape. LegPose initialtwo-linkproceduralindependentfootgroundIK, raisedlegkneebends; notproduction skeleton/GLB skin/fullytunedactiveragdoll locomotion.

Final **152unitPASS/1originalangularFAIL**, **30browserPASS/1legacytechnicalFAIL**, **buildPASS**/dist current. Logs `.pi/unit-damage-final.log`, `.pi/browser-damage-final.log`, `.pi/build-damage-final.log`; newplayer-damagetest5cases/browserUI, historicalqte/guardtests updated toassertnoinstantjump/velocitypreservation. Screenshotplayer-damage-map confirmscenter/map, QTE/rowdeath/guard images fromfullsuite. Fullstressretainedthinparts highω remains, nofinalphysicsacceptance. Records2.2-progressive-rise-body-damage, docsnewestoverrides.

## Итерация 16 — QTE, активная пила-защита и row-death fragments

Запрос заказчика: два тела зажимают игрока в безвыходной GETTING_UP/CRAWLING петле; нужен circleВСТАТЬ/число нажатий и **guaranteed** выход по100%, особенноSpace. Также default equipped saw, working upward blade cuts falling NPC into sideways parts, inactive saw no protection; player rowdeath тоже slicing before result.

Реализовано `EscapeQte` (Space/W/up20%/other8%,5jump taps,no autorepeat/decay) + `ArcadeEscape` nearest verified capsule positions, fallbackabovefinitepile. QTE сохраняется через failed rise, на100% removes transientplayer parts/standsACTIVE без slowstate, protection1.5с. Intentional arcade reposition явно заменяет старыйphysical-only контракт; тела NPC не удаляются/непереносятся. Technical mode физический прежний. КругВСТАТЬ/%/remaining нажатия Space вHTML/SVG, mobilejump темжеInput.

`SawGuard` onlyheldE/LMB+up.9+real/swept falling collider, runs before player impact. COMplane split/sever joints, onlyoriginalconnectedfamily fragments kickside7/up2/spin2, already-detachedsameNPC elsewhere unaffected. Staticroof truncation + inactive/horizontal regressions. Grace.55/cooldown.12, sharedgore/audio CutResult, default equip onstart/R, F toggle remains.

Row death exactsame slab withincludePlayer preservesowner and renderphysicalsurvivors, nointactvisual/saw; survivingclipped caps/limbs, blood andsideimpulse. DYING.65 activephysics/VFXonly, nospawn/score/time extension. Pause/context/tab frozen, resumeDYING notRUNNING, reset fullycleans. Survivorparts remapped to avoid stale Rapier handles; row score excludesplayerremovedvolume.

Long game uncovered two geometrical blockers:1e-5 vertexweld collapsed a long4micron strip into2faces; broadnearplane snap bent oldface planes after repeated clipping. Topology/ring/indexandplane intersection numerical1e-9, containsEPS unchanged; preservesmeaningfulstrips instead of removing bodies. Oldthin/atomic/mass fixtures pass. **This does NOT fix retained thinstrip dynamical instability.**

Fullfinaltests **147PASS/1originalangularFAIL unit**, **29PASS/1legacytechnicalFAIL browser**, **buildPASS/dist refreshed**. `.pi/unit-arcade-actions-final.log`, `.pi/browser-arcade-actions-final.log`, `.pi/build-arcade-actions-final.log`. Screenshot `qte-get-up.png`80%/1tap, `saw-upward-guard.png`2halves, `player-row-death.png`clippedplayer inspected. Naturalheldsaw/movement/QTE~43с/28drops/44cuts/18interceptions/5escapes/3rows, noNaN/structuralerror, but peakv389/ω6472 demonstrates severe retainedthinpart physics risk. Nofullstabilityclaim; referenceperf/art/stress gates open. Records2.1-qte-active-saw-guard, newestREADME/GDD/TDD overrides.

## Итерация 15 — рабочая аркадная демо-петля

Актуально вместо defaults итераций 4–14: игрок и пила ×2, силы/момент/queries согласованы; масса64, speed7.6/jump12.4, coyote.24/buffer.28. Пила.19с/cooldown.09/reach2.1/kerf.08. Escape equivalent-load scale2/half press requirements, stun.225/getUpDelay.4, measured freegetup.95с vs former2.25/active.77с. Полный standing capsule clearance, supported motors/forces, no teleport. Floor rotational false-block и folded wall routes исправлены conservative endpoint/up-first проверкой; при боковой стене автоматическая bounded supported traction к центру.

Default demo first/drop interval1.5с/безbursts,double; automatic occupancy/detector/cuts/overflow ON. Warning1.15 после confirmation. RowHazard включает full capsule/all down hulls; пересечение смертельноROW_CLEAR, score/record/freeze/restart работают. Survival6hits/12air/restore4. NPC вне полосы и clipped части сохранены без удаления по центру/памяти. Demo clear normal solver contact как saw, oldlegacytechnical pause path остаётся.

Three seeds17/42/123 по8NPC/5rowcuts проходят significantvolume/parts/noNaN/nolegacyfault. На seed123 пойман open/nonmanifold thinstrip: `cleanRing` удалял почти-коллинеарную вершину лишь на одной грани. Collinearity теперь численная1e-10, dust rule неизменный. Structural clear cutoff1e-12 снимает skipped tiny overlap. Старые thin/atomic/saw regressions проходят.

Проверено: **unit139PASS/1originalangularFAIL**, **fullbrowser25PASS/1legacytechnicalFAIL**, отдельный natural arcade playPASS (26 проходящих cases), **buildPASS**. Natural scripted movement/jump/heldsaw (reset to exact seed):12drops/11cuts/1automaticrow/118points/deathROW_CLEAR18.42с, noNaN/fault, maxv21.08/ω67.09. Браузер доказывает safe-row survival, instantrowdeath/off-rowlimb сохранение, six actual head hits, input/audio/VFX/restart. Logs `.pi/unit-arcade2.log`, `.pi/browser-arcade2.log`, `.pi/arcade-play-final.log`, `.pi/build-arcade-final.log`; `dist` обновлён, records2.0-arcade-demo-rows.

Это рабочее **демо**, не полный финальный MVP. Originalangular82.82>35 остаётся; currentlegacytechnical36sec всё ещёFAIL (при одном trajectory reached late contactfault), art/assets/referenceperf/10sessionbalance не закрыты. README/GDD/TDD/PLAN содержат newest override, ниже история.

## Итерация 7: непрерывная демка, смертельные удары, воздух и массовый завал

### Новый явный запрос заказчика

Вместо продолжения только numerical research добавлена default demo: трупы каждые 0,5 с, без безопасного-route ожидания до смерти; три overhead удара и удушье; escape зависит от массы, три полноценные тела почти не позволяют выбраться. **Это сознательное изменение прежней спецификации о безвредных NPC ударах и приоритетах art/physics gates.**

### Реализовано

- `mode=demo` по умолчанию, в UI «Непрерывная демка» / «Технические ряды». Рестарт при смене режима. Default demo не выполняет automatic clear/overflow: старый известный cut-contact blocker этим НЕ исправлен, изолирован в technical. Diagnostic cut кнопка в demo отключена; technical режим и failing regression сохранены.
- `ContinuousDropPlanner`: нет safe-route и moving-budget блокировок. Начальная X-метка выбирается внутри фактического envelope; если entry overlap, вся модель размещается выше с тем же X. Total spawnReserve остаётся 600 частей; этот реальный лимит — единственное бюджетное исключение обещанию «всегда». Никакого удаления старых NPC для места. Шквалы/двойные события остаются.
- Fixed-step schedule теперь не накапливает .517с вместо .5с от floating-point quantization; delayed recovery не создаёт catch-up train. Проверен 10-секундный unit timeline. Предупреждение сохраняется .9с, первый реальный сброс после 3с grace + warning.
- `PlayerSurvival`: 3 overhead injuries → IMPACT, cooldown 1,2с и per-NPC 3с. PlayerController сообщает real impact; lying head/chest проверяется также, несмотря на уже включённый ragdoll. Actual three descending shapes browser fixture даёт [1,2,3], результат «ПОГИБ ОТ УДАРОВ». Обычные low-speed/боковые события не damage.
- Air=6с, 0,25с confirmation. Drain при actual trapped или head+chest overhead coverage resting NPC; восстановление в свободном объёме ×2. Deadline simulation time, freeze в pause/result и restart reset; результат SUFFOCATION и validated persistence поддержаны отдельно.
- `pileLoad`: directed actual-contact support graph над лежащим player. Целый connected NPC масса суммируется один раз, detached fragments самостоятельно; distant/flying не дают нагрузку. Учёт полной массы при нескольких опорах консервативный, **не точное распределение contact force/веса**.
- Effort — rolling presses/с; keyboard/pointer repeats не считаются. Required rate `2+3*(loadKg/72)`. Максимум тяги: один normal 70%, два 40%, три ~1,5%; дальше exponential спад. Без нажатий под load лишь 8% остаточной тяги. Масса ограничивает target crawl speed/crawl force/get-up force; никаких pose assignments/воздушной тяги/guaranteed standing. Реальный standing volume всё ещё требуется. HUD/debug показывают kg/rate/required/mobility/air/lives.
- Данные records разделены mode и version `1.3-continuous-impact-air`.

### Факт проверки

- Full `npm test`: **93 PASS / 1 original angular FAIL** (94). Original fixture ωmax 87,11, thresholds не ослаблены.
- Full `npm run test:browser`: **15 PASS / 1 technical long-chaos FAIL** (16): default continuous survival, real impact death, reset/freeze/persistence/input/shader/old 3 loss fixtures проходят. Старые loss tests выбирают technical явно; default mode не меняется скрыто.
- Continuous idle fixture: **32 реальных NPC, смерть SUFFOCATION в 15,18с**, spawnBlocked=0, NaN=0, air=0. Сбросы до смерти, затем freeze/restart доказаны.
- **Физика новой демки НЕ принята:** vmax ≈61,13 м/с и ωmax ≈154,75 рад/с. Rapid enlarged pile делает открытый physics риск заметнее. Нет clamps/solver-limit bypass; даже без NaN это НЕ устойчивый Gate 0. Reference FPS/10 session balance остаются.
- Technical long regression после новых clock/load mechanics заканчивается SQUEEZE ≈15,78с, не достигает 36с/двух bursts и angular gate, красный сохранён. Старый pinned separation snapshot не исчез.
- `npm run build`: PASS; JS ≈4,962 MB / gzip 1,834 MB.

### Numerical research перед переключением задачи

`ExactMass.ts` рассчитывает volume/COM/tensor double precision вокруг близкого reference, Jacobi principal axes. Analytic box, translation invariance micron fixture и rotated tensor reconstruction проходят. Developer-only `exactFragmentMassEnabled=false`. Floor impact на captured 195/212: exact inertia не решила устойчивость (peaks 207,59 / 65,29 рад/с против auto 24,91 / 43,22); runtime не включён. Эти diagnostic tests не утверждают speed acceptance.

Дальше: демо playtest/survival readability и load fairness, ceiling of rapid physics workload, numerical explosion snapshots. Звука/Blender art и готового MVP пока нет.

## Итерация 6: воспроизводимый contact barrier / не принятая стабилизация

### Проверенное продвижение

- Сохранён полный Rapier world за мгновение до ошибки на **34,783 с**: 150 частей, joints/connected groups/deferred pairs и pose/velocity state. Pinned-engine fixture `tests/fixtures/separation-chaos.json` (~963 KB, только tests, не browser bundle) воспроизводится в Node. Диагностический capture включается `separationReplayEnabled`, default OFF. Он показывает блокеры каждого candidate, а не только проблемную пару.
- Выяснено: chest/head остров упирается в чужую голову (NPC 11), а pelvis — в собственное уже отделённое thigh. Все три normal-only направления ухудшают другие contacts. **Contact halfspace projection** предлагает касательный сдвиг: ≈1,18 мм chest/head и ≈8,92 мм pelvis, улучшение исходного penetration ≈6,72 мм.
- `Separation.ts` проверяет proposed correction точной геометрией, промежуточными samples/casts и relative движение обоих островов. Same-island исключается, но **другие пары между исправляемыми островами больше не игнорируются**. Общий displacement budget ≤15 мм на part за весь barrier, не по 15 мм для каждой соседней пары. Исчерпание budget переносит ограниченную recovery на следующий fixed step, не заставляет дополнительное движение. Скорости/rotations/joints/число parts не меняются. Captured-world fixtures на планирование и полный barrier проходят.
- Полностью закрытая fixture сохраняет исходные позы и выдаёт technical fault — нет принудительного выхода через стену.
- Добавлен TDD dust policy: physical survivor не создаётся только при **volume <1e−6 м³ И размер <15 мм**; длинная тонкая полоса сохраняется. Тесты conjunctive rule проходят. Geometry dust остаётся не больше заданного масштаба, не удаляет значимые heads/limbs. В natural fixture parts перед остановкой снизились 150→136, angular peak до остановки 95,82→68,69; это не закрытие physics gate.
- `debugSnapshot` показывает deferredContacts/pairSeparations/separationMs; cleanup сбрасывает сохранённый fault.

### Исследование НЕ принято в обычную игру

Projected recovery позволила дойти до 36 с / 16 NPC / 1 ряд без technical error, но физика после включения контактов **не прошла**: vmax ≈35,82 м/с, ωmax ≈2540 рад/с. Пик — ранее сохранённая thin shin strip массой ≈2,7 мг, без joints, при ударе о пол. Найден и micro-pelvis с невалидной effective inertia. Одно устранение ошибки не равняется устойчивой физике.

Попробован перенос локальной геометрии collider к COM без изменения world hull/body reference; уменьшил отдельный peak, но не обеспечил устойчивость. Этот вариант **откачен**, в runtime его нет. Projected separation оставлена developer-only (`separationProjectionEnabled=false` по умолчанию) и регрессионными тестами проверяется отдельно. Не менять setting на true для «готового решения»: post-clear thin geometry/mass/inertia/contacts требует отдельной приёмки.

Длительный browser regression теперь дополнительно проверяет vmax <25/ωmax <35, не только «нет exception». Он остаётся красным на прежнем contact blocker; angular assertions достижимы после его исправления, не ослаблены.

### Последняя проверка

- `npm test`: **82 PASS / 1 original angular FAIL** (83 tests). Original 20-NPC fixture без изменения trajectories/thresholds, ωmax **87,11 рад/с**.
- `npm run build`: PASS; initial JS ≈4,953 MB / gzip 1,831 MB.
- `npm run test:browser`: **13 PASS / 1 long-chaos FAIL**, ordinary game всё ещё безопасно останавливается около **34,783 с**, не запускает исследовательский неустойчивый вариант.
- Captured replay tests доказывают локальную допустимость displacement/no velocity edits, НЕ 0,15-секундную приёмку всех contact transitions и не многосекундную устойчивость.

Дальше: точная масса/COM/inertia и contact tolerances для long thin retained strips; bounded joint/contact восстановление; несколько seeds. Full Gate 0/2, FPS на reference hardware и Blender art не объявлены готовыми.

## Итерация 5: profile pile, query optimization и два обнаруженных среза

### Исправлено

- `CollisionQuery` — read-only snapshot collider bounds **на один decision barrier**, без сохранения между world.step/structural edits. Все 11 проверок recovery и три направления squeeze переиспользуют его. AABB через absolute rotation matrix вместо восьми аллоцируемых углов. Unknown shapes не отсекаются.
- Чистая translation использует один whole-segment exact collider cast, а не повторно строит два convex hull на каждом 4-см шаге. При исходном overlap по-прежнему проверяются промежуточные penetrations: нельзя проскочить сквозь стену к чистому endpoint. Rotation сохраняет bounded samples/exact segment casts. Destination penetration проверяется и для опорного пола.
- Greybox query cuboids математически совпадают с фактическими box convex colliders; тесты всех 7 типов/трёх углов сравнивают exact contact distances. Реконструкция convex hull для standing/spawn queries больше не нужна. Physics collider/fragment geometry не заменены box-ами.
- Spawn route проверяет поддержку от верхней границы допустимого jump, horizontal/autostep/jump path и несколько reachable endpoints. Лежачий игрок проверяется **по всем реальным частям**, не по воображаемой вертикальной capsule. Реальный blocked corridor/roof/wall и overlap по-прежнему запрещены.
- `debugSnapshot`: `spawnBlockReasons` разделяет budget/envelope/route/overlap/pendingColumns/reserve; `spawnCommitBlocks` отдельно считает отложенные allocations. HUD снова показывает physics и player update time. Новые рекорды `1.2-chaos-2x-struggle-route2`.
- Targeted «Сброс на игрока» clamp-ит **до предупреждения** свою X-метку к реальному doubled-hull envelope: у стены больше нет вечной попытки создать NPC внутри стены. После предупреждения метка не двигается.
- Natural chaos выявил long thin survivor (длина ≈0,67 м, толщина десятки микрон). `ColliderDesc.convexHull` лишь откладывает allocation: non-null descriptor ошибочно считался доказательством валидного hull. Теперь prepare вызывает/освобождает `intoRaw`, а при QuickHull rejection использует **известные замкнутые faces через convexMesh**. Масса и 120 finite steps проверены на захваченном survivor; значимая длинная часть не удаляется.
- Повторный grazing clip собирал cap из близкой к плоскости, но не лежащей на ней вершины. Near-boundary точки теперь согласованно проецируются на plane с ошибкой ≤EPSILON=10 мкм. Regression проверяет planar cap/convexity/повторный cut; прежние volume/velocity fixtures сохранены.
- Mass-weighted detached separation иногда направляла нижнюю часть в её supporting floor. Перед технической остановкой проверяются asymmetric кандидаты, включая движение только верхнего острова; каждый ≤1,5 см/part, без velocity kick. Контролируемый floor regression проходит. Это **не решение всех завалов**.

### Фактические замеры/приёмка

- Chromium software full pile fixture (5 doubled NPC, реальные collision drops): player down 485 fixed steps; физически выполз/встал; update p95 ≈0,9 мс, squeeze p95 ≈3,4 мс, physics p95 ≈1,4 мс в последнем запуске. Free get-up p95 ≈2 мс. На исходном до этой итерации long pile squeeze p95 было ≈17,3 мс. Разные сцены/solver trajectories не позволяют выдавать это за строгий процент speed-up/FPS на железе пользователя.
- Новый **обычный 36-секундный chaos regression красный**: до 34,783 с реально 15 NPC, 1 результативный ряд, player knockdown/crawl; NaN 0, ωmax ≈95,82 рад/с. После второго natural clear pelvis/chest overlap ≈2,76 см не может быть безопасно разделён под окружающей геометрией. Даже asymmetric варианты не прошли. Обычная игра выдаёт техническую остановку, не скрывает её teleport/удалением/отключением contacts.
- Раньше 36-секундная сессия с дополнительными targeted events достигала лишь 7 NPC; после улучшения route/исправления warning envelope обычная сессия даёт 15 до остановки. Это **не гарантированные 2 NPC/с**: safe routes/reserves продолжают блокировать заявки. Timing/geometry before failure сохраняется как attachment `chaos-long.json`, логи `.pi/browser-latest.log`.
- `npm test`: **78 PASS / 1 прежний angular FAIL**, original 220 parts trajectory прежняя, ωmax 87,11 рад/с.
- `npm run build`: PASS, initial JS ≈4,951 MB / gzip 1,830 MB; big WASM chunk остаётся.
- `npm run test:browser`: **13 PASS / 1 new long-chaos FAIL**. Красный тест не удалён/не skipped: он доказывает открытый blocker natural cut/contact reenable.

Следующий приоритет: воспроизводимый full-world snapshot зажатой pelvis/chest пары и безопасное восстановление контактов после natural clear; angular blocker остаётся. Multi-seed/budget/reference performance, Blender art, полный MVP не закрыты.

## Итерация 4: запросы игрока и chaos default

Заказчик изменил приоритеты во время диагностики Gate 0: постоянная ragdoll-модель игрока, активное выползание/частые нажатия, оптимизация down-state, PS1 ON/320×240, сбросы каждые 0,5 с со шквалами и NPC ×2. Эти изменения сознательно заменяют прежние стартовые defaults, не закрывают физические gates.

### Сделано

- Стоя и при падении игрок использует **одни и те же 11 Three meshes/геометрии/материалы**. Нет смены шестичастного персонажа на другой силуэт и новых visual allocations при каждом knockdown. Standing walk/swing — visual-only, ragdoll crawl — ограниченные alternating elbow/knee/shoulder/hip motors ≤3 Н·м с реальными контактами.
- Частые реальные key/pointer presses на игровых действиях дают bounded effort 0..1, exponential decay; autorepeat/повтор одного pointer не начисляются. При усилии crawl 0,65→0,95 м/с, суммарная force 260→360 Н; standing PD gain/ранний таймер до +40%, но прежние hard force/torque caps и full aligned handoff сохраняются. Физически свободный fixture: passive 2,25 с, active 1,983 с. Навес блокирует standing, пропавшая опора отменяет подъём; воздух не даёт тяги.
- Оптимизация: повторный recovery plan/11-part sweep в том же fixed tick удалён; conservative cached shape bounds отсекают далёкие коллайдеры до expensive shape contacts/casts, в том числе на structural barrier без свежего BVH. Joint motor configuration только при смене режима (crawl target обновляется). Material uniforms обновляются один раз на shared материал, interpolated pose scratch переиспользуется. Chromium software fixture player update p95 ≈3,5–4,2 мс при свободном подъёме, ≈4,4–5,0 мс в targeted doubled-NPC escape. Baseline до изменения не измерен, процент ускорения не заявляется; FPS на компьютере заказчика не подтверждён.
- PS1 spike включён и 320×240 по умолчанию; intensity 0,75. В браузере проверены default UI/state, aspect всех трёх resolution и off/intensity path.
- **Chaos schedule:** базовые заявки каждые 0,5 с; первое предупреждение после 3 с, warning 0,9 с. Шквалы с 12 с, затем раз в 18 с, длительность 4 с: заявки 0,2 с и 45% double, pending cap 6. Все предупреждённые метки видны; двойные позиции ≥2 м друг от друга. No catch-up flood. Overlap/safe route/awake/total budgets остаются, поэтому реально сброшенные тела могут идти реже: в 8-секундном Chromium idle fixture лишь 4 успешных NPC / 6 blocked заявок. Это осознанно сохранённая безопасность, не достижение устойчивых 2 NPC/с в завале.
- **Все NPC типы ×2** по x/y/z, соответствующие hulls/centers/joint anchors; player size не изменён. Массы 42–120 кг сохранены (не автоматически ×8), физический angular blocker не замаскирован. RagdollFactory имеет game-specific scale, неизменённый original Gate 0 fixture остаётся на scale 1. Рекорды `1.2-chaos-2x-struggle` отделены от старых.
- Gate 0 диагностика: COM potential energy исправлена для смещённых fragments; filtered geometry overlaps отделены от solver manifolds/impulses. First/angular/linear/energy peaks сохраняют before/after, joint angles/limit excess/anchor drift. Опциональный world-before snapshot + component/deferred metadata; one-step pinned-platform replay воспроизводит все poses/velocities точно. Никаких clamps/rollback в обычной игре не добавлено; diagnostics/replay выключены по умолчанию.

### Проверки и ограничения

- `npm test`: **66 PASS / 1 прежний angular FAIL**, original ωmax 87,11 рад/с; не ослаблен/не skipped.
- `npm run build`: проходит; large initial WASM chunk остаётся.
- `npm run test:browser`: **12 Chromium PASS** в полном запуске (chaos, permanent visual UUIDs, player escape, get-up timings, records/loss/lifecycle/shaders).
- Скриншоты: `test-results/player-ragdoll.png`, `player-escape.png`, `chaos-default.png`.
- New doubled-size 8-second chaos fixture: NaN 0, vmax 18,24 м/с, ωmax 68,69 рад/с — это **не прошедшая stress-приёмка**, angular риск сохраняется.
- Пиковый original stress удар на 12,35 с: energy delta −887,70 Дж при ω=87,11; hip Z excess 0,2065→0,1645 рад. Отдельный mechanical-energy peak +74,38 Дж на 26,467 с ещё требует анализа источника/CCD/solver; нельзя делать общий вывод «вся энергия всегда падает» по первому удару.
- Blender подключён/актуален, telemetry OFF; сцена не изменена. Mass art production не начат.

### Отдельная проверка шквала

Текущий full Chromium run проверяет первые 8 с физического chaos (до первого burst) и чистый unit timeline burst. Длительный физический burst/pile пока не приёмка.

Следом: профилирование настоящего doubled-NPC завала на железе пользователя, route planner/заявленный tempo vs safety, физический angular blocker. Не объявлять MVP или все тормоза устранёнными по короткому fixture.

## Итерация 3: проверенные исправления и survival greybox (текущее состояние)

Фактическая сверка обнаружила изменения, не попавшие в старый журнал: recovery sweep и grace contacts уже присутствовали, тестов было 27, а build ломался из-за отсутствующего `PhysicsManager.clearSequence`. Сборка восстановлена без изменения критериев.

### Реализовано и проверено

- **Occupancy:** 3D clipping границ x/y/z и каждой полосы до проекции. Индивидуальный footprint cache, корректный rebuild через OR, удаление stale cache, отдельная strict stable map для верхней зоны. Тесты cached/full, наклонённой геометрии за глубиной и быстрого пролёта.
- **Срез:** все survivors и восстановленные joints создаются до удаления originals; allocation failure удаляет staged объекты без изменения поз/скоростей исходных тел и transactionId. Проверен injected failure. Счёт содержит объём по каждому ряду. После среза будятся локальные острова реальных опор, не вся верхняя шахта. Это НЕ формальная гарантия rollback при аварии WASM/OOM на destructive commit.
- **KCC:** тест 100 прыжков по динамической опоре нашёл snap-to-ground без computedCollision. Добавлен exact support probe: вес/landing pressure и wake передаются реальной опоре. 100 прыжков проходят; тест пока на широкой awake/sleeping опоре, НЕ на полноценной 20-NPC качающейся куче.
- **Создание:** collider/joint/ragdoll failures убирают частично созданные объекты. SpawnPlanner проверяет фактический hull envelope/overlap, reachable escape reserve 1,3 × 1,6 м, early targeting, recent columns, awake budget и reserve. Небезопасный спавн откладывается; после 2 с выбирается small. Двойные события и полный multi-step terrain route planner ещё не реализованы.
- **Сессия:** ScoreManager с per-row volume ≥0,035, transaction idempotency, комбо 6 с / +0,25 / cap ×3, бонусом времени, иммунитетом и восстановлением стойкости. DifficultyManager с GDD level/interval и ограничениями ранних/тяжёлых типов.
- **Поражение:** LossDetector использует strict stable top coverage, confirmation/hysteresis/countdown; relief продлевает deadline не более одного раза. Пока relief распознаётся только по реально занятой критической полосе, НЕ по всей цепочке опор нижнего ряда. SqueezeProbe проверяет реальные пути капсулы/всех лежачих частей и стабильный верхний контакт; blocked get-up/idle сами по себе не поражение. Помощь ≤12 Н·с горизонтально каждые 3 с. Контролируемые fixtures трёх причин проходят.
- **Результат/рекорды:** GAME_OVER замораживает simulation; причина, очки, время, ряды, drops/maxCombo/рекорд; restart и title. Validated localStorage top 10 по rules/profile/arena/assisted, безопасный memory fallback. Текущий ключ `1.1-greybox-3`: диагностические результаты не смешиваются с будущим релизом.
- **Shader spike:** production GLSL параметризован, affine vs perspective на наклонённом quad действительно отличается. Проверены off-state и compilation; остаются quantization golden/seam/shadow/full settings.
- **Браузер/cleanup:** clear/reset immunity, input disposal, независимые pointer sources/cancel/blur, listener cleanup, WebGL loss → pause → explicit resume. Browser tests запускаются последовательно, чтобы software WebGL workers не конкурировали и не ломали wall-clock input fixtures.

- **Настройки графики:** 320×240 / 426×240 / 480×270 с сохранением aspect, global intensity 0..1 и независимо валидированные эффекты. Intensity=0 сохраняет low-res target и не изменяет physics snapshot; проверено в браузере.
- **Диагностика:** опциональный read-only capture первого превышения скорости, before/after pose/velocity/inertia, actual projected twist, контакты и энергия. Getter scratch buffers копируются немедленно. В первом ω>35 событии общая механическая энергия падает с 3159,74 до 2519,20 Дж: это не доказательство добавления энергии solver, хотя критерий скорости нарушен. Все более поздние peaks/energy growth ещё надо анализировать.
- **Давление:** horizontal push теперь имеет общий budget 40 Н·с/с по всем KCC контактам, не отдельный полный budget на каждый; ограничивает ускорение в направлении target speed 2 м/с. Squeeze assist не направляется в ближайшую стену.

### Последняя проверка

- `npm test`: **56 проходят, 1 angular stress FAIL** (57 всего).
- `npm run build`: проходит. Initial JS ≈4,939 MB / gzip 1,826 MB; большой compat WASM chunk не устранён.
- `npm run test:browser`: **10 Chromium tests проходят** в полном последнем запуске, включая 3 причины defeat, persistence/restart, context restore и perspective shader.
- `npm audit --omit=dev`: 0 vulnerabilities в выполненном замере.
- Blender MCP актуален/отвечает, telemetry OFF; сцена Cube/Camera/Light не изменена. Ассеты не создавались.

### Физический blocker — не закрыт

На текущем неизменённом штатном fixture 20 normal NPC / 220 parts / 12,5 м: NaN 0, vmax **15,55 м/с**, ωmax **87,11 рад/с** (thigh1), anchor max **0,06074 м**, calm **100%**, physics p95 ≈**3,19 мс** в последнем Node запуске. Это НЕ reference desktop/mobile приёмка.

Проверены диагностические варианты CCD/soft prediction, iterations/PGS, contact skin/frequency, passive torque motors, self contacts, angular frames/hinge representation, convex chamfers, linear/angular damping, версии Rapier 0.20/0.21. Ни один не принят как надёжное решение. Более сильный linear damping иногда даёт зелёный одиночный seed, но заметно тормозит падение и не обеспечивает multi-seed стабильность. Inertia multiplier только исследован, НЕ применён в игре. Тест не ослаблен/не skipped, velocity clamps/watchdog recovery не добавлены.

Отдельный **Jolt 1.1.1 comparative spike** с теми же boxes/mass/height и hinge/swing-twist тоже не прошёл: ω≈86–94 рад/с, экстремальный drift 0,27–0,31 м; более дорогие substeps не решили проблему. Jolt удалён из dependencies, runtime остаётся Rapier 0.21.0. Исследовательские черновики в `.pi/*diagnostic*` — не shipping-код и не доказательство приёмки.

Дополнительный contact-phase damping spike (торможение только рядом с чужой/статической геометрией) дал ω=27,98 на одном normal fixture, но на mixed seeds ω=51–1249 и vmax=133 м/с: **отклонён**, в runtime НЕ добавлен. Нельзя выбирать настройку по одному зелёному seed.

### Что дальше

1. Изолировать peak impacts, записывать энергию/actual relative angles/penetration и воспроизводимые snapshots; выбрать устойчивую joint/contact/геометрию без speed clamps и искусственно медленного падения.
2. Настоящие pile KCC/player stress, dynamic recovery continuity, bounded horizontal pressure на нескольких контактах, numerical penetration recovery.
3. Authored connectors/UV interpolation, более полный terrain/safe-route planner и double events; empty rows/balance playtests.
4. Shader seam/quantization/settings, production path и memory profiles; затем Blender art, кровь и собственное лицензированное аудио.

**Ни один полный gate не объявлен закрытым.** Сессия уже играбельна как greybox, но art/balance/performance/MVP приёмка ещё впереди.

---

## Итерация 2: player ragdoll / escape (исторический отчёт)

По запросу заказчика изменены GDD/TDD до v1.1: игрок больше не остаётся кинематическим при сильном ударе NPC сверху.

### Реализовано

- `PlayerRagdoll.ts`: `ACTIVE → RAGDOLL → CRAWLING ↔ GETTING_UP → RECOVERING → ACTIVE`.
- Exact contacts/relative shape casts падающего тела с верхней половиной игрока. При ударе капсула выключается, появляются 11 динамических частей / 10 joints / 32 kg; обычные боковые/неподвижные контакты не сбивают.
- После 0,45 с A/D передают ограниченную горизонтальную силу с target speed 0,65 м/с. Для тяги нужна физическая опора; нет воздушного ползания, pose/velocity teleport или силового подъёма всей кучи. Ragdoll-player friction 0,2 / Min — текущая игровая калибровка, не финальная биомеханика.
- Вставание: реальные ground query и проверки всего standing volume. Ограниченные PD forces до 750 Н суммарно, torque до 6 Н·м/часть. Появление препятствия отменяет подъём. Возврат KCC только из приблизительно выровненного upright-положения, а не из лежачего тела под кучей.
- После подъёма 2 с скорость ≤0,9 м/с; под близким overhead-контактом скорость ≤0,65 м/с и прыжок запрещён.
- `owner=player` исключает игрока из occupancy/slicing при сохранении физических контактов с NPC. В срезе опасность определяется центром таза.
- HUD показывает состояние игрока; «Сброс на игрока» создаёт предупреждённый реальный NPC, не принудительный debug-knockdown.
- Connected-component pair filter кешируется до структурных изменений. Это не изменило траектории существующего stress fixture и не закрыло его blocker.

### Проверено

8 новых Vitest тестов: удар/11 parts/масса и physical get-up; низкий потолок/выползание; exclusion из clear/coverage; целый NPC/escape; 20 циклов с нулевыми transient registries после recovery; отсутствие тяги/вставания в воздухе; slow movement + jump denial под нагрузкой; отсутствие ragdoll при обычных боковых контактах.

Итого: 20 passing unit tests и 1 прежний failing stress test. Production build проходит. Два Chromium browser tests проходят: базовая сессия и targeted NPC/player ragdoll/пауза в down-state/выползание/сброс. Скриншоты: `test-results/player-ragdoll.png`, `test-results/player-escape.png`.

### Ещё не закрыто

- NPC angular stress остаётся 68,81 рад/с при критерии <35; Gate 0 открыт. Timing шумит при параллельных physics tests, отдельная performance-приёмка не выполнена.
- Полный swept get-up path, надёжная recovery на качающихся опорах и валидирование начального player hull vs KCC capsule в тесной геометрии — последующие Gate 1 fixtures.
- Сейчас standing handoff допускает локальную погрешность до 8,5 см/часть и использует greybox mesh. Нужны художественный blend и более строгие continuity measurements; это не готовая get-up animation.
- Crawl — ограниченная физическая тяга при опоре, не authored поочерёдная работа рук/ног. Плотный завал может реально блокировать выход; это не гарантия escape из любой конфигурации.
- Squeeze/LossDetector всё ещё не завершён. Blocked get-up не вызывает автоматический проигрыш и не телепортирует игрока.
- Массовые pile/player стресс-тесты, GPU/heap leaks, anti-explosion численные snapshots ещё нужны. Blender art production не начат.

---

## Итерация 1: Gate 0 / начало Gate 1 (исторический отчёт)

Прочитаны GDD.md, TDD.md, task.txt и image.jpg. Основные проектные документы не изменены.

### Подтверждено запуском

- Blender MCP отвечает: сцена Cube/Camera/Light, несохранённая. Модели не создавались, чужая сцена не очищалась.
- Зафиксированы npm dependencies и package-lock.json; установка: 0 vulnerabilities на момент выполнения.
- `npm run build` проходит TypeScript strict и Vite production build. JS ~4,9 MB / gzip ~1,82 MB, включая встроенный compat WASM. Предупреждение о крупном chunk остаётся; code splitting — следующая задача.
- 12 из 13 Vitest тестов проходят. Проверены caps/manifold/volume, 10 полос и независимость порядка, continuity velocity field, реальные fragment density/mass/COM, сохранение головы/ног, OR occupancy вместо суммирования/AABB, неизменность ARMED и coyote/buffer/cut-off.
- Chromium browser-test проходит: загрузка WASM/WebGL2, клавиатурное движение/прыжок, пауза без изменения snapshot, спавн, компиляция текущего PS1 shader, диагностический warning/clear, 20 рестартов без роста реестров bodies/joints. Это не доказательство отсутствия GPU/heap leaks — memory profiling ещё нужен.

## Итерация14 — тяжёлые контактные удары и брызги

- `ImpactEffects` — observationalprestepsampling linvel/angvel/COM/mass, RapierCONTACT_FORCE_EVENTS threshold300Н, drainaftereach1/120substep. Event requires normalspeed≥2.5м/с AND impulse≥4Н·с; no tangent/staticload/samefamilynpc events. Масс/forces/solver/RNG/survival mutation нет, noaudioinsidephysicscallback.
- Perfixedtickdedup поNPCfamily pair/static, strongestimpulsewins, npc cooldown.5с / pair.18с, max2events/tick+8/s; boundedtimestamps/pairmaps expiry. Observable `contactImpacts.total/events` вGame; effectsconsumedpostphysicsstep. Restartnewphysics clearsobserver, disposeclears. Noexactcontact-force-baseddamage added.
- `GameAudio.impact`: proceduraldampedlow-sine65–100→24–32Hz withlowpass/envelope, speed/massaffectpresentationonly. Общийvoices≤8, impact≤6, preferentialevictionimpact notcut, cut higherpriority. ExtraBiquadFilternodescleanup, resetSession counters/silence. Master gain сразу .value+scheduledvalue наmute/lifecycle (пойман oneblockoldvaluefixture, исправлен). Unavailable/autoplay behavior unchanged.
- `GoreSystem.collision` small4–10burst afteractualevent, obeysfull/reduced/off poollimits; no persistentbloodwoundorlimblossfromimpact. Game plays onlyafterworldstep, audio/Gore separateRNG unchanged.
- 4physicsfixturesgroundactualhit+staticcalm,11limbs2substepsdedup/ratebounds,exactphysicalstatesobserveron/off, tangential/samefamilyignored. Audiovoicepriority/impactfilters/resetfixture. Browser actualfalltrigger/audio+gore/mute/postpause/restartchecks. Existingreplay/3modeblood/pilesawallPASS.
- Финально buildPASS,unit**131PASS/1FAIL**(angular20drop82.82unchanged),fullbrowser**23PASS/1FAIL**(technicalangular40.68/time). `.pi/unit-iteration14.log`, `.pi/browser-iteration14.log`, `.pi/build-iteration14.log`. Effect flags/sampling do notchangephysicstrajectory (explicitfixture), referenceCPU overheadnotaccepted. Game stillgreybox/gatesopen. Records1.7unchanged(VFX/audioonly).

## Итерация13 — подвижные пятна крови и настройки

- Gore droplets теперь проверяют sweptsegment→nearest incoming NPC surface иanalyticarena surfaces, не пролетают через thinlimbs. FreshCollisionQuery onceupdate, broadphasepersegment, insideexit/sourcepartignored; визуальные queries не меняютbody/solver/RNG. NoVFXcolliders/impulses.
- BloodStain age/localposition/localnormal/partID, moves withinterpolatedvisualtransform; BloodDecals clips 12gon toconvex survivor hull, avoidsfloatingrings/kerfbridges. Cut remap сохраняетcentercontainedsurvivor, geometry reclips; orphan cleanup on removedpart. Body/staticstainsdarkenover30с, samehard180stainpool. Explicit limits: staticplanesanalytic, movingbodycollision uses currentfixedframepose (notfullrotationalCCD), disjointdecal swallowedbykerf removed, authoredtextureprojection нет. Bodydecalsдо180drawcallsвхудшемслучае: referenceGPU/FPSнеприняты.
- BloodSettings full/reduced/off persistedblood.v1; defaultfull, reduced25%emission/4×bleedinterval, offclearallVFX/hidecapred without alteringpoly/collider/mass/slicing. Modes noresetgame/no scoreprofilechange; gameplayrulesrecords1.7unchanged. UI«Кровь» andresponsivefooterfix: newtools nooverflowoffscreen.
- Renderer materials rebuildvisualgeometryonlyoncap modechange/polychange; BloodDecals disposesmeshes/materials onexpire/reset/dispose, staticinstancestaincolors agebased. No high-res overlay, worldlowrespasssame.
- 6newunitfixtures:nearestincomingthinbodybeforefloor, insideexit/sourceignored, stainremap/clip/orphancleanup, bloodmodevalidation/storage/off/reduced, exactphysicsstateequality3modesinclactualsplit, distant80part/40drop queryculling0rays. Browserfixtureactualdrop→bodydecal,translation/rotation,actualsplitremap, offcaps/VFXstateunchanged/reloadmode. screenshot`test-results/blood-body-stain.png`.
- Loaded6NPC20сsaw:7cuts/73parts, mass1056≈1048.916+7.084kerf,180stains100onbodies,emitted1524, maxwounds14, noNaN/deferred, vmax4.43/ω8.52. GoreCPUupdatep95~.3мс/max1.4мсcurrentChromium, notreferenceperformance. screenshot`test-results/saw-pile.png`.
- **Проверки:**buildPASS,unit**126PASS/1FAIL**(angular20drop82.82unchanged),browser**22PASS/1FAIL**(technicalangular40.68/time), newonesPASS. `.pi/unit-iteration13.log`, `.pi/browser-iteration13.log`, `.pi/build-iteration13.log`. Runtimephysicstuningunchanged; fullgate0notclosed.

## Итерация 12 — звук пилы и кровь в процессе пропила

- `SawController.contact` — подтверждённый текущий propil point/normal/part/progress, отдельно от heldactive; сбрасывается при no target/release/cancel/cooldown/commit. Работает и наjoint cuts. `snapshot.cutting` дляSFX/diagnostics. Изменений physics/slicing-массы/time/limits нет.
- `GoreSystem.sawContact`:70visualdrops/с по fixedgame dt, fractionalemission/subframeindependent, poollimit600, no persistent wounds доactualcut, приnotcontactemissionoff. ВGameиloadedbrowserfixture интегрировано до cutburst. ОтдельныйVFX RNG, не gameplay.
- `src/audio/GameAudio.ts`: процедурный nativeWebAudio(noexternalassets): дваoscillatorsmotor + filteredseedednoisegrinding; нагруженный тон67/135Гц вместо95/192, фильтр650вместо1100, finitegain/masterattenuation/compressor. One-shotcutnoise≤8voices, source.onended cleanup, paused/mutedvoiceflush. Графlazycreates/resumes ONLYistrustedkeydown/pointerdown, neverRAFcreate; unavailablefallback не ломает игру. Dispose stops/disconnectsallnodes+closecontext; restartreusegraph/flushactivevoice.
- UI«Звук»/«Громкость»persistlocalStoragekeyaudio.v1, volume0–1default.35, validclamp/malformedorblockedstoragefallback. Pause/menu/death/ERROR/WebGLloss master0/clearSFX; blur stopsblade/contactaudio without inventinggamepause; muteimmediateand zero volume. Touchgesture unlockprovided. Этоplaceholderнеlicensedfinaudio/noimpactaudio.
- Unitfixturesaudio:validation/blockedstorage/unavailablefactory, noautoplayallocation, reusedgraph, mute/pause/voicebudget/source+nodecleanup/persistence. Contactsprayfixture beforefirstcut/noNPCmutation/norateautorepeat/sameemission60vs120Hz. Browseraudiofixtures:realgestureunlock, loadedtone, analysernonzeroRMS, immediategain0mute, volume/settingsreload, disabledstartnoalloc, pause/restart/blur/death/WebGLloss/disposecontextclosed.
- ФинальноbuildPASS,unit**120PASS/1FAIL**(angular20drop82.82unchanged),browser**21PASS/1FAIL**(technicalchaosangular40.68/time), allnewfixturesPASS. `.pi/unit-iteration12.log`, `.pi/browser-iteration12.log`, `.pi/build-iteration12.log`. Loaded6NPCsaw20с7cuts/73parts, massa1056≈1048.916+7.084, emitted1524, maxwounds14, noNaN/deferred, vmax4.43/ω8.52. Runtimephysicsunchanged,records1.7unchanged(VFX/audioonly).
- Gatesopen/realisticartandfullphysicsremain. Следующие возможности: physicalconstraintrepresentation, bloodsettings/impactSFX/artverticalslice; полноценнаяgameacceptance ещёнеобъявлена.

## Итерация 11 — источник angular blocker, честный пропил, сохранение ран

- Exact substep current peakω82.82 replay: motorOffω83.24 (не причина этого нового рывка), incident angular limit offω5.61, all contacts offω38.25. Плечевой generic limit correction + hard contact — источник именно этого replay, не доказательство всех spikes. Ограничения в игре НЕ отключались. Captured `.pi/bounded-motor-peak.json`, `.pi/source-iteration11.log`.
- Проверены полный20drop stress: internalPGS2/4 иsolver16, softCCD0, convexbevel.15/.3/.5, friction.5, native angular12/24, angular contactdrag24/48, solver4/8/12substeps, soft endstop guarded0.15/.25/.35rad. Ни один не даётω<35 наwholepile; highsubstepsω96–120 иCPU~15–39мс, strongbevel/friction могут датьlinear40м/с/ω207. Softstopsω84–91. Все новые настройки **отклонены**, runtime physics/config/mass/joints прежние. Research scripts перенесены в `.pi/diagnostics`; no measurements-only tests в обычной suite. Логи `.pi/convergence-iteration11.log`, `.pi/bevel-iteration11.log`, `.pi/drag-iteration11.log`, `.pi/temporal-iteration11.log`, `.pi/end-stop-iteration11.log`.
- Вместо бездоказательной калибровки реализованы реальные gameplay fixes. `SawController` locks part-local plane/point при начале реза; смена target/plane angle>0.21rad (~12°)/offset>6см сбрасывает timer, small aimjitter сохраняет progress, locked plane follows body transform, commit использует именно его. Нет «накопил горизонтальный, повернул, мгновенно завершил вертикальный». Release/toggle/cancel/pause очищают lock. `cuttingPoint` и low-res world mark `SawCutProgress`, material/depth-safe.
- `CutResult.replacement` source/survivorids для геометрических split. `GoreSystem.cut(result,physics)` remap старых wounds по contains в неизменной local referenceframe, сохраняет life/next/point/normal, kerf-consumed wound removed. ВызовыGame/browserfixture передают актуальныйphysics. No VFX colliders/масса/расход игрового RNG, cap surfaces сохранены.
- Новые unitfixtures: резкая смена плоскости, smalljitter, движущееся тело/lockeddensity, remaplife, kerf-consumedwound/unrelatedtimer. Browserfixture aim/progresscue/pause shader compiles/errors0. Existing saw-in-pile20с:7cuts/73parts, mass1056≈1048.916+7.084kerf, vmax4.43/ω8.52, maxwounds14bounded, noNaN/deferred. Physical postcut3seeds такжеPASS.
- **Финальные проверки:** `npm run build`PASS; unit**116PASS/1FAIL** (angular20drop unchanged82.82); fullbrowser**19PASS/1FAIL** (technicalchaos angular40.68/time), thresholds не изменены. `.pi/unit-iteration11.log`, `.pi/browser-iteration11.log`, `.pi/build-iteration11.log`. Runtime gravity/mass/damping/solver2substeps/jointmax2Н·м unchanged fromiteration10.
- Records`1.7-local-saw-cut-progress`, docs обновлены. Gates не закрыты; дальнейшая physics стратегия требует другого constraint/contact representation или корректного bounded limit solver, не очередного обещания «больше damping». Artwork/audio/continuous-sawbalance остаются.

## Итерация 10 — точный substep replay и конечные моменты суставов

- `PhysicsManager` теперь снимает `diagnosticsBefore` / world snapshot после назначения dt/KCC target **перед каждым** solver подшагом и захватывает first/peak faults на том же подшаге. Метки fixedTime/substepIndex/replayTimestep/time; peaks равны aggregate максимуму всех подшагов. Replay делает ровно один сохранённый world.step, не повторяет весь game tick. Runtime diagnostics OFF не сериализует мир. Новый regression: first-substep angular>35 затухает до<35 к концу tick, snapshot/replay всё равно обнаруживает пик.
- Воспроизведён exact shoulder peak93.43рад/с: ~11рад/с перед подшагом, +51Дж общей mechanical energy за1/120с, контакт с нижней голенью/плечевой generic limit; убирание native joint motors в том же replay уменьшает immediate пик до18.19. Это **локальная причинная проверка**, НЕ доказательство что все spikes только от мотора. `.pi/angular-substep.log`, `.pi/angular-substep-replay.json`, `.pi/kick-replay.log`.
- Исследованы force/accel motor, off, torque caps, exact cuboid manifolds, contact natural frequency10/20, angular damping8/12 и external bounded pair friction. Ни один вариант не закрыл весь stress: motorOff full-pileω124, acceleration capω179, soft contacts penetration до6см; external friction.3/.6 даёт худшие пики. Эти варианты **отклонены**, research scripts в `.pi/diagnostics`, не в обычном test discovery/runtime. Не подменяли mass/inertia/hulls и не отключали limits ради зелёного теста.
- Принята небольшая ограниченная настройка: force-based zero velocity native motor damping1.8 + **maxTorque2Н·м на каждую angular axis**, без restoring spring. Число1 ранее ошибочно подписывалось как acceleration-based, фактически enumForceBased. Теперь named enum+проверенный raw adapter. Ограничение момента не равно ограничению velocity и НЕ гарантирует dissipative solver под ударом. Проверено22axis caps на10NPC joints и3axis наremap, player motor config не менялся.
- 20-drop unit: vmax17.87/ω82.82 (было17.63/93.43), drift.0195м/calm100%, angular gate всё ещё красный. Во всех ступенях наблюдается actual speed, нет clamp/teleport. Reference CPU не приняты; per-substep diagnostics дороже и не являются runtime profiling.
- Settled8NPC post-cut seeds: 69–72sever/split,97–100parts, vmax≤4.18/ω≤8.76, mass/volume/caps/live contactsPASS, noNaN/deferred. Seed123 **до** расчлененияω46.42>35 — не full physics gate. Browser aimed6NPC/20с:10cuts,76parts,removedMass8.309кг от1056кг, сохранилось1047.691, maxWounds12 bounded, vmax4.69/ω8.84/noerrors.
- Новая contact tuning иногда даёт idle demo дожить до memory budget:54NPC/~31.15с, после резерва600NPC bodies спавн честно блокируется бюджетом, не route/overlap. Test horizon30→40с и проверка no route/overlap + budget exception, не изменение gameplay лимитов/air/hits. Air/suffocation fixtures отдельно сохраняют6с. Итог idleSUFFOCATION, vmax19.00/ω73.01, это не улучшение angular на всех seeds. Technical long terminatesSQUEEZE~12.88с/ω40.68 — по-прежнемуFAIL, 36с/two-bursts criteria не ослаблены.
- **Финальные проверки:** buildPASS; unit**112PASS/1FAIL** (stress angular); full browser**18PASS/1FAIL** (technical long angular/time), остальное PASS. Логи `.pi/unit-iteration10-final.log`, `.pi/browser-iteration10-final.log`, `.pi/build-iteration10-final.log`. Records`1.6-bounded-joint-moments` отдельно от предыдущего balance.
- Следующий физический приоритет: contact/joint-limit impulse source при выключенных/конечных motors, authored hull/connector geometry, CPU/reference stress. Game artwork/audio ещё не выполнены, full gate0 не закрыт.

## Итерация 9 — пила в куче и восстановление контактов

- Воспроизведено прежнее natural grace ограничение на трёх seeds: после десятков срезов под settled8NPC pile оставалось119–138 filtered пар на десятки секунд, проникновения до ~0.60м. Это не «свободно отделённые» тела. Лог `.pi/saw-pile-investigation.log`.
- Проверены non-neighbor и все self contacts до среза. Все direct-neighbor contacts хуже в rapid stress (continuous до236м/с/ω362), поэтому этот вариант **не принят**. Принято столкновение несоседних NPC частей с cached direct-neighbor set: всего тела сквозь себя не складывает, `removeJoint` снимает pair exemption; family-wide saw grace больше не создаётся. Player articulation filtering остаётся прежним. Technical-row recovery/replay не объявлены исправленными.
- Два world substeps1/120 за gameplay60Hz tick, force integration/time conserved. Ошибка первого spike (KCC сразу доходил до конца пути в первом substep, удваивал скорость) исправлена линейной/slerp интерполяцией target по обоим шагам. Regression измеряет скорости каждого подшага. Aggregate maxSpeed/ω наблюдает каждый substep, не скрывает промежуточные пики. Replay adapter повторяет substep/neighbor policy; CaptureFault остаётся fixed-tick observation, intermediate peak details пока не захватываются.
- 3/4 substeps исследованы, не закрыли angular35 и заметно дороже; не включены. 20-drop unit теперь vmax17.63 вместо26.81/62.78 intermediate spike, ω93.43 всё ещё >35, drift.0294м, calm100%. CPU выше, reference FPS не приняты.
- `SawController`: fresh collider bounds broad phase/narrow contact, solid-wall ray obstruction (новый fixture fail-through-wall prevented), режим/управление F/E/ЛКМ прежние.
- `tests/physics/saw-pile.test.ts`: **3 seeds**, 8 physically dropped NPC, 55с sim каждый, 68/69/70 cuts, 96–98 частей, volume/mass with kerf conserved, every hull validate, post-cut vmax≤3.30/ω≤7.11, no NaN/deferred. Предварительное падение seed17/123 имеет angular>35 — это post-cut acceptance, не full gate. Исследовательский substeps script перенесён в `.pi/diagnostics`, основной тест больше не просто печатает без asserts.
- `tests/physics/npc-self-contacts.test.ts`: non-neighbor contact while connected, immediate sever contact, player filtering/external contact, equal KCC velocities between substeps, force/time conservation. `tests/browser/saw-pile.spec.ts`: actual aimed held saw/settled6NPC/20с, 2 splits,68parts, kg/kerf preserved, bounded wounds/stains, no errors/deferred, vmax1.12/ω2.11. Screenshot `test-results/saw-pile.png`.
- Старый player-pile performance fixture зависел от случайного попадания падающего NPC в игрока и с новыми contact poses давал0samples. Теперь после real pile явно инициирует player ragdoll (не frozen/fake NPC pile), проверяет player/squeeze workload; настоящий impact detection остаётся в отдельных fixtures. 618 down updates, p95player~.4мс/squeeze~3.9мс на текущем Chromium — не reference hardware.
- **Финальные проверки:** buildPASS; unit**110PASS/1FAIL** (angular20-drop); full browser**18PASS/1FAIL** (technical long ω46.58>35, достигает36с/no errors). Continuous idle42NPC/17.15с suffocation, vmax19.45/ω56.79, high-speed angular ещё открыт. Ни thresholds, ни masses, ни budget не ослаблены; velocity clamps/teleport kicks не добавлены.
- Records`1.5-self-contact-saw-substeps`; документация актуализирована. Логи `.pi/unit-iteration9-final.log`, `.pi/browser-iteration9-final.log`, `.pi/build-iteration9-final.log`. Дальше: angular-limit/contact energy source, continuous held-saw gameplay under lethal load, CPU budget/profile, art/audio/settings. Исторические записи ниже не актуальные обещания.

## Итерация 8 — пила, расчленение, кровь, масса

- Запрос пользователя реализован в runtime greybox: F / UI toggle, удержание E / ЛКМ, mouse world aim, fallback A/D; пила работает и из ragdoll, игрок не разрезается. Touch «Пила» удерживается отдельно от toggle.
- `src/slicing/Dismemberment.ts`: независимое отделение всех десяти neck/shoulder/elbow/waist/hip/knee joints; локальный convex split груди/таза/сегментов с 4см пропилом. Сохраняются обе physical половины и velocity field, оставшиеся joints remap по стороне плоскости (anchors иногда вне greybox hull), последующими срезами всё можно отделить. Atomic rollback allocation, reject мелких повторных срезов, без impulse kick.
- `src/gameplay/GoreSystem.ts`: burst/9с wounds, bounded 600 капель/180 пятен/96 ран, истечение следует local wound/part, пол/стены; `RetroRenderer` instancing, капы в красном отдельно от цвета одежды, видимая пила/цепь в low-res pipeline. Перезапуск чистит VFX, pause freezes; без жидкости/органов/audio/final art/настроек интенсивности крови.
- Mass game multiplier 2 при size scale 2: normal **144 кг**, остальные 84/210/170/128/240/96, player 32 кг. Не ×8 по объёму. Linear damping NPC .12, angular 4.5, passive zero velocity joint motors damping 1.8 без T-pose spring. Реальная масса влияет на нагрузку/усилие.
- Saw natural contact grace отдельный от technical-row separation projection: external collisions остаются; касающиеся разрезы контактируют сразу, бывшие глубокие self-overlap соседи ждут natural separation. **Ограничение:** это может длительно фильтровать такие пары; полный penetration/pile acceptance ещё не доказан.
- Новые 8 unit / 2 browser saw fixtures PASS: все конечности, torso remap, kg/velocity/caps, rollback, player immunity, hold/progress/release, VFX budget, все 7 masses, aim/F/E/ЛКМ, freeze/restart/render. Дополнительно diagnostic test больше не зависит от случайного self-overlap при первом impact: отдельный намеренный overlap fixture сохраняет проверку filtering, replay/control equality проходит.
- **Проверки:** `npm run build` PASS; `npm test` **102 PASS / 1 FAIL** (сохранён 20-drop stress: vmax 26.81 м/с, ωmax 140.60 рад/с, drift .0541м, calm 100%); полный Playwright **17 PASS / 1 FAIL** (long technical chaos 36с, no NaN/error, ω44.54 >35). Пороги не изменены. Обычная continuous demo no-saw: vmax19.82, ω52.17, 21 drops/13.28с до suffocation; angular gate всё ещё не проходит. Улучшенный отдельный seed не означает полной стабилизации.
- Рекорды `1.4-saw-heavy-gore`; старые разделены. Screenshot `test-results/saw-gore.png`, логи `.pi/unit-saw-final.log`, `.pi/browser-saw-full.log`, `.pi/build-saw-final.log`. Остальные разделы ниже — исторические записи, не актуальные обещания готовности.

### Joint spike: решение API и открытый блокер

Rapier 0.21.0 `GenericImpulseJoint` не имеет high-level `setLimits`, но публичный `world.impulseJoints.raw` предоставляет `jointSetLimits(handle, axis, min, max)` и getters. В PhysicsManager используется узкий адаптер, привязанный к этой версии. Тест подтверждает настройку трёх angular axes и 72 kg / 11 parts / 10 joints.

Angular box limits — аппроксимация, НЕ анатомический swing cone. Плечи временно ограничены ±55°/±40°/±55°, бёдра −25..65°/±25°/±35° для исследования устойчивости. Это временное отклонение от исходных диапазонов GDD/TDD, не утверждённый финальный баланс. Rest height нормализован до 1,85 м.

Последний headless Vitest стресс: 20 последовательных NPC, 220 частей, высота 12,5 м, 160 fixed steps между сбросами, затем 600 steps покоя:

| Метрика | Измерено | Gate |
|---|---:|---|
| NaN | 0 | проходит |
| Максимум линейной скорости | 16,29 м/с | <25 проходит |
| Максимум угловой скорости | **68,81 рад/с** | <35 НЕ проходит |
| Максимальный anchor drift | 0,0692 м | <0,1 проходит; p95 ещё не измерен |
| Доля покоящихся частей после 10 с | 100% | ≥90% проходит |
| physics step p95 | ~6,29 мс | desktop target ≤5 мс пока не достигнут |

Замер — Node/Vitest на текущем компьютере, не браузерная performance-приёмка и не согласованный reference desktop/mobile. Целевая сцена TDD (20 движущихся NPC + 120 спящих частей) отдельно ещё не измерена. Увеличение iterations/damping не закрыло angular blocker; ограничения не выключались, скорости не зажимались watchdog-ом ради зелёного теста. Сохраняется **обычный failing test**, не `skip`/`todo`/`fails`.

### Что остаётся до закрытия gates

**Gate 0:**
1. Диагностировать spike angular velocity/limit solver; проверить actual относительные углы и энергии на нескольких seeds, p95 drift. Затем выбрать frames/limit representation/solver configuration.
2. Оптимизировать pair filtering (сейчас connected-component поиск выполняется в contact hook) и замерить reference нагрузку.
3. KCC fixtures на движущейся/спящей куче: 100 прыжков, перенос опоры, penetration recovery, squeeze analysis. Текущий browser-test проверяет только базовое управление.
4. PS1 perspective checkerboard fixture для affine, seam cracks и off-states. В gameplay камера orthographic: сильное affine-искажение здесь не ожидается. Surface shader сейчас применяется к NPC; окружающая greybox-геометрия и игрок используют Lambert. Это НЕ полная художественная PS1 pipeline; нет shadow pass.
5. Mobile multitouch/visibility/production-base-path browser fixtures.

**Gate 1:**
- Awake-budget scheduler и spatial safe-zone constraints полностью по GDD; сейчас есть bounded total budget, fixed warning и overlap check, но нет полного safe-route анализа/double events.
- Sleep islands/local wake policy вместо широкого пробуждения верхних остатков при cut.
- UI/error/context-loss cleanup и повторные браузерные stress runs.

**Gate 2 (включены только предварительные диагностические модули):**
- Authored connector volumes, UV interpolation и полноценные cap textures.
- Grace filtering бывших связанных перекрывающихся пар после отделения. Сейчас disconnected компоненты сразу возвращаются к контактам; Gate 2 это НЕ проходит.
- Strong prepare/commit failure handling, body/vertex reserve, numerical sliver handling и геометрическое clipping границ глубины вместо предположения о containment стенами.
- Occupancy footprint cache и stable overflow map.
- Счёт по объёму каждой полосы/idempotent transactionId, комбо и стойкость согласно GDD. Текущий score/health — только placeholder diagnostics, без Game Over.

**Gate 3–5 не начаты:** полноценные defeat/records/tutorial, художественные Blender GLB/metadata, кровь, звук, настройки/accessibility, лицензированное финальное аудио и публикация HTTPS.

Следующий приоритет: закрыть angular stress blocker, затем KCC stress. Производство ассетов не обходит Gate 0.
