# HUMANTHROWER — Technical Design Document

> **Актуальный default-контракт и новый план:** [docs/MVP_PLAN.md](docs/MVP_PLAN.md). Первый CPU/query/recovery этап описан там; historical runtime overrides ниже сохраняются как история. `<25 m/s / <35 rad/s` physics gates и hardware performance acceptance не ослаблены.

## Runtime продолжение — mass-aware COM support pressure

Capturedmicroshinmass2.508mg received10.464Nsstandingweight→beforestepvY−4.172million. Narrowfix supportImpulseCapacity=actualpartmass×4, newstanding+landingcombinedperpartstep, oldtotal16/32/perbody8/16capsandzero-torqueCOMmodelpreserved. Existingvelocityuntouched/noheuristicdeletion/contactbypass/eigenframephysicschange.50/80/120kgfixture/100jumpsrealplatform/pile oldbudgetsPASS. Exactfragmentpropertiesfrombirth3seedsnotstable/keptOFF; inputfix3seed45sremainingv19.88–79.53/ω90–1570stillFAIL25/35. Records3.2isolatehistory, full336unit/91browserPASSwithonepreservedangularFAILeach/buildPASS; THIN_PHYSICS.md. Nativeeigenframe/contactfixstillrequiresisolatedrebuilddecision.

## Runtime продолжение — thin contact replay / read-only inertia diagnostics

102partnaturalcurrentthinimpulsebaseline1465rad/s/exactmass89.6stillFAIL; autoeigenframeXvslongY/absolute-scalediagnosticisolatedfactor1e6, upstreamglamx0.3.1`cross.length_squared<1e-20→X`candidatewithunresolvedtransitiveversionqualification. THIN_PHYSICS.md/snapshotbinary+metadata, all102stateexact/pinned20dropunchanged. No productionexactinertia/clamp/exemption/geometrydeletion. sampleeffectiveAngularInertiaNaNfallbackprincipalQdiag(I)Qᵀtaggedsource/noWASMmutation, defaultcapturethreshold35/25stillunchanged. Full333unitPASS/1angularFAIL,newbrowserobserverPASS/buildPASS. Nativeisolatedbuild/contactsrowstilldecisiongate.

## Runtime продолжение — reproducible balance diagnostic / cut-win / coarse touch

`Game.sessionSeed`uint32validatedbeforerestartmutation/default20261111/ordinaryrestartretains/recordseedstring. DiagnosticBalanceSessionfixture injectsonlynormalInputFrame/noauthorityspawns/rowarms90srightcensoring/5seeds×idle-saw, intermediateJSON, separatePlaywrightconfig/optin/freshstrictport. ResultsBALANCE.mdnotfinal4–8minhumanbalance. Revealednonfatalrowcutresetwin: PlayerControllerprepareRowDeathsaveswonDeadline/resumeAfterCutalivepreservesfullQTE/remainingduration; PlayerRagdollforcedDurationresetsnextlifecycle, limbsretained; lethalcutstillfatal. Causalseed93verifiedontfreshservervsstaleoldmodule.6walkinghandoffs.9833s+1zero-legcrawl;thinspeedv2546/ω3.36millionnotaccepted.

Coarsetouchgrid3×2portrait/6×1landscape,safepadding,min56px, compactQTElandscape/nooverflow/canvas>100. Recordsprofilematchescoarsepointerseparatefromdesktop,noschedulerbalanceoverride. ActualCDP3touch/partialrelease/blur/orientationtest Inputunchanged. Full327unit/88browserpasswithangular+1startupwaitfail, latterpassesfocused11afterexpect15sloadcontract;buildPASS. Human/device/Safari/perfstillopen.

## Runtime продолжение — tutorial observer

`Tutorial.ts` read-onlyfixedstepdataobserver,simulationtime-dwell/nonblockingMOVE-DROP-STOMP-WEAPON-firstROW-REMAINS; urgentQTE/WON/AIRBORNE/ROW preemption. Storagev1booleanenabled/completedvalidated/errorsessionfallback; resetlessonprogressnotpreferences,replaynoPhysicsrestart. Noinputmutation/RNG/timeout/deathdelay/assistedrecords. AbsoluteDOMHUD pointer-eventsnoneexceptdismiss, aria-livepoliteheading, fullstatefilter; mobilebottom/desktopright keepscanvasbounds.8unit/5browser+full326/83passwith2separateangularfails; physicsON/OFFtrajectoryexact. Humanplaytestand10sessionsstillopen.

## Текущие runtime overrides — пользовательское QTE / fresh drops / asset gates

`EscapeQte.progress=effort`, full effort locked against decay/impact rollback; escapes counted only after control handoff. `PlayerRagdoll.forcedRise` overrides demo full-effort PD: retain same bodies, convert to kinematicPositionBased, interpolate saved positions/quaternions with smoothstep over 1s. Destination uses retained geometry plus static-only footprint checks; `ejectRecoveryDebris` relocates overlapping connected NPC islands intact to a verified arena-contained/statics-compatible destination and supplies outward7m/s velocity. Explicit arcade pose/velocity reward, NOT a claim of force-only physically emergent recovery. Capsule enabled at end; dead/cut lifecycle restores dynamic types before disposal/remap. Immovable closed roof still blocks; zero-leg crawl unchanged. Recovery immune to impact rollback and suffocation during winning stroke; row cuts remain lethal. Records3.1 + npcMode profile.

`LivingNpcs(mode='twitch')`: limb-only motors8/1.5/max5Nm, no torso rise/translation/jump. Overhead actual-contact component mass≥8kg suppresses active motion for at least.25s; passive damping stays. `hunt` opt-in retains prior ground PD/hunting/jumping. `FreshDropMotion` applies to every fresh demo whole/incomplete drop independent of max6 agents: seeded rigid velocity field/wholebody spin, perjoint randomized-frequency limited strokes and equal-opposite mass/length-scaled torques; first external contact/5s ends fresh motion and restores passive motors. Factory/anatomical masses unchanged; technical spawn policy untouched.

`OfflineCharacter` parses pre-inspected accessor data into temporary owned Three meshes and runs existing metadata/rest/model validators; CLI bounded regular files16MiBGLB/1MiBmetadata, JSON/stdout/exit0success1invalid2usage. No browser codecs/network/PhysicsManager world; image headers only, sampled surfaces only. `AssetDeadline` bounds module-import/decode/cleanup waiting to one5s budget, rejects stuck tasks immediately, disposed resources owner handles late geometry/material/texture/bitmap arrivals. Cannot interrupt synchronous CPU/native codec; worker isolation still open. Browser fixture proved never-resolving createImageBitmap starts greybox and late bitmap closes.

Older runtime iteration sections below are historical where they conflict with these overrides.

**Версия:** 1.1, спецификация реализации; добавлен player ragdoll по запросу заказчика.  
**Связанные материалы:** [GDD.md](GDD.md), исходное задание `task.txt`, референс `image.jpg`.  
**Важно:** кодовые блоки ниже — проектный псевдокод/GLSL-эскизы, не готовый движок. API, пределы solver и shader integration проверяются на этапе spikes.

## Runtime итерация33 — real shadow depth / render profile

LowResShadowsonepackedRGBAdepthtargetnearest128/256/512/default256/off0, stableorthographicworldkey/DoubleSidecasterborrowedgeometryproxies, noverticesjitterinshadow. Surface+Lambertsharedharddepthvisibility, matrixoutsidefrustumlit/bias.0007/strength.38, worldinterpolatedpose/cuts/removal synced. UIshadowSizeindependentfromintensity andretro; targetdispose/reallocate/contextrestorefixtures. Effectsnotcasters, artshadowsnotcolliders. Fixedkeyshadowdoesnotmatchallanalyticlocalpools; notphysicalmultilight. `renderStats`CPUsubmit/scene+shadow+compositecalls, notGPUquery. Full284unitPASS/1oldangularFAIL,67browserPASS/1oldangularFAIL;final5focusedPASSaftercontextfixture/proxyoffcleanup/buildPASS. ProductionSW340partfrozenprofile754calls/shadowONvs392OFF,defaultCPUsubmitp95~6.2ms; exceeds<180/≤3targets, referenceFPS/GPUgateNOTaccepted. Batching/instancingnext,nophysicalfragmentculling. DetailsPROGRESS.md.

## Runtime итерация32 — Blender shaft и локальное освещение

LiveBlenderindustrialshaft11rigidgroups/648triangles/128originalatlas,12панелей/rails/pipes/grille/floor/header. Fixedassetvalidation(bakedtransforms/finiteUVnormalsindices/arena/reardepth) через sharedparseOwnedRigidGlbstrictbudget/noexternalimages/resourceownership; characterrest/modelpathunchanged. Defaultenvironmentreplacesgreybox; fail/envoptoutfallback, noPhysicsManagercalls/colliderchanges. Surfacepipelineonshaft, analyticworldgreen-blue-floorillumination+brightercharacter, nooccluders/shadowmap; nonretrorealPointLights. EnvironmentjitterOFF;armedrowlampsplusoriginalbands. Numeric426visibilityfixedbylightnotlowerthreshold. Full283unitPASS/1unchangedangularFAIL,63browserPASS/1unchangedangularFAIL/buildPASS. Actualshadow/referenceperf/humanreadabilitystillopen. ASSETS.mdpaths/rebuild/limits.

## Runtime итерация31 — первый Blender reference art

Прямой пользовательскийзапрос позволилrender-onlyprototype доclosedphysicsgate. LiveBlender11convexshells/hardnormals/UV/original128atlas/676triangles→.blend/GLB+authoringhulls/10connectormetadata. Strictparse/rest/modelvalidation passes; decodedactualsurfacesmergecoplanartriangles/scale/clipbyretainedcapplanes. Player/NPC useatlasinretroandLambert; Part.renderScale optionalrender-onlyremaps saw/bite/row; physicalcolliders/mass/joints/occupancyunchanged (exact120stepart/greyboxtrajectoryverified). Authoringconnectorsnotruntimeadopted. Significantphysicalsliveroutsideinsetshell useshullvisualfallback, no physicsdeletion. Download5sabort/failureplayablegreybox; parserImageBitmapdeadline notsolved. Full281unitPASS/1oldangularFAIL,59browserPASS/1oldangularFAIL/final6focusedPASS/buildPASS. Separateplayerrig/artjointseams/palettes/shaftlight/shadows/performanceopen; ASSETS.mdcontract/paths.

## Runtime итерация 30 — image header and per-parse lifetime

ImageHeaderPNG/JPEG/WebPdimensions≤128/encoded≤1MiB/image≤12 beforedecode, animatedPNG/WebPrefused; GLBinspectorreturnsBINslices/stableinputcopybeforeawait/restrictsnearest-linearsamplers. PerparseCharacterResources/Tasksowngeometry/material/texture/bitmapwithdedup/latepromise-settle/disposeclose; registeredGLTFpluginownsImageBitmapdecode/noobjectURLs/noexternalrequests/rejectbaddecodenotmissingtexture. Unit7/browser4new/full278unitPASS/1angularFAIL,56browserPASS/1angularFAIL,buildPASS,records2.6. HeadernotfullCRC/entropycodecproof; deadline/cancel/worker/browserfallbackopen; ASSETS.mdscope.

## Runtime итерация 29 — decodedGLB / restpose gates

CharacterRestPosechecksworldjointframeagreement/restangles/nativeapiprojection+nonneighborconvexSAT penetration>.002, directneighborspermitted. CharacterModel11rigidmeshmatch/name/transforms/scale-shear/skinmorph/triangle850/unitnormalsUV/indexchecks,texture12/128pxlimits,bidirectionalvertex-edge-centroidsampling≤.04m. NotuniformHausdorff/artqualityproof. CharacterGlbstrict≤16MiB/JSON1MiB/1BINscene/11meshes/64nodetree/accessorviewsbounded, noexternal-data-fileURLs/decoders/animations; validateparsedmetadatarestbeforedecode,explicitmodeldispose. SyntheticGLBfixturebrowserrealparse/disposalandnoexternalfetchPASS. Headers ofembeddedimages/unresolvedloaderfailureownershipstillopen.15unit+2browser/full271unitPASS/1angularFAIL,52browserPASS/1angularFAIL,buildPASS,records2.6/gameunchanged;ASSETS.mddetails.

## Runtime итерация 28 — geometry budget preflight / metadata schema

GeometryBudgetpartceilings256vertices/512fantriangles/128faces/1024corners +world100kverts/180ktriangles, cheapcounts beforeweld, PhysicsManagercachedperpartusage/remove/dispose. Directallocationchecksbudget/bodyhardlimit; factorywholeplanpreflight/clear-saw-bitecheckfinalreplacementusagebeforeallocation, internalstagedflagonlyforpreflightedreplacementstemporarydoubleusage. Failnobody/score/geometryremoved; no simplisticfragmentdeletion. CountphysicalhullsnotVFX/GPUalltextures. Technicalcapsnotreferenceperformance.

CharacterMetadata v1unknownobjectschema/metersY,11expectedparts10links/72kg,adjacentratio≤10,hullUV/convexity/budgets, unitframes/ranges/worldcoincidentinsideanchors/connectorstissueinsidehulls, bounded/sparsechecks/copy. NotGLBinspection/restposeoverlap/artreleaseproof. ASSETS.mdexplicitcontract/remainingcases; fixtureoverlappingboxesNOTshippingrig.14unit+2browserfixturesPASS,full256unitPASS/1angularFAIL,50browserPASS/1angularFAIL,buildPASS,records2.6/QTEunchanged. Restpose/GLBvalidator/failurematrixnext,Blenderassetproductionnotdone.

## Runtime итерация 27 — per-face surface UVs

Faceoptionaluvspercorner/surfaceId,SurfaceAttributesfinite/count/sparsechecks; clipinterpolatesedgeUVwithsamegeometricparameter/preservesoldcorners+seams/metadatainputimmutable,position-onlymass/hullunchanged. CapUV2orthogonalcutplaneaxes/bodylocalstablebasis/oppositenormalsbasisconsistent,nocentroidsizefit/repeatedcapunchanged. RenderergeometryconsumesfaceUVorlegacyxyfallback; bloodOffpositionsnormalsUVsame. surfaceIdnotmaterialselector, finalatlasnotimplemented. Nonaffinen-goninteriortriangulationcanchange, productionfaceUVauthoringmustaddress; nofullGLBunwrapguarantee.13unit+browserretainedpixel-equalityPASS,full242unitPASS/1angularFAIL,48browserPASS/1angularFAIL,buildPASS,records2.6. Details SURFACES.md; vertexbudget/assetvalidator/fullfailurematrixnext.

## Runtime итерация 26 — optional authored attachment volumes

`Joint.connector`bodylocalconvexpolya/b+optionalframeA/B unitquat validatedbeforeallocation;factoryconnectorsmapparent:child scalesonce atfinalNPCscale(noextramass/sourceimmutable). DefaultNPCmetadataabsent:oldphysics/geometryunaltered. Rowcleardetectspositiveconnectorintersectionevenwhenendpointshullsunchanged;stageconnectoronlyremovalatomic,body/volumeunchanged, affectedfamilycontactrestore. Sawkerf/Svarleatenintervalchecksmetadata;unconsumedconnectorframes/limitsremapped. Anycutoverlapconservativelyseversattachment, notpartialstrength/connectivityphysics. CONNECTORS.md schema/authoringlimits.8unit+1browserfixturesPASS;full229unitPASS/1angularFAIL,47browserPASS/1angularFAIL,buildPASS,records2.6unchanged. Actual10assetconnectors/GLBvalidator/UVsurfaceattrs/vertexbudgetstillopen.

## Runtime итерация 25 — opt-in contact reaction diagnostics

`PhysicsManager.contactLoadDiagnosticsEnabled=false`default;`ContactLoadWindow`собираетпослекадогоsolverstepplayer↔NPCnormalreaction, orientationflipped, dedupcontacts, dtweightedkgEquivalentJ/(9.81sumdt). Upward/downwardseparate, disabled/sensors/stalepartsexcluded, sleepingfixed-player+sleepingNPCcontactoldimpulsesreportedstalePairs/complete=false. Noobserverforces/wakeup/timer/gameplaymutation, debugonly. Completeнеозначаетexactweight/impactdecoupling. Fullplayerbridge72→72kg vssecondstatic-supporthalf→36kg; legacyconservativepileLoad72unchanged. Observeron/offpose/q/v/ω/sleep identicaland10unit+browserfixturePASS; full221unitPASS/1angularFAIL,46browserPASS/1angularFAIL,buildPASS. Record2.6unchanged. Gameplayadoptionneedssleep+activePDpolicy, notclaimloadfairnessfix.

## Runtime итерация 24 — fullQTE automatic crawl + recovery space

FullQTE`recoveryTarget` range±2mactualroot/feet/capsule+retainedshapes; nearbytarget<.6boundedrise, farther/missingtarget`recoveryEscapeAxis` chooses verifiedstatic-free.16mcrawl direction/currentstickyfallback/inputoverride. NoNPCcontactsdisabled; dynamiccrawlmassweightedforcecap1800N/target1.9m/s×damage. Fullprogresswithoutstandplace no longeridlewaitsforA/D. SameplayerbodyIDs untilactualaligned/free/sweephandoff.

`openRecoverySpace`partcontacts≤.06/max4 dedupNPCdynamic, pushforce180N×dt(total3Ns/tick), forwardcap.8m/s/horizontaldepthonly/excludesrealbelow-support/fasttargets/staticendpenetrationveto. No posewrites/no deletion/no globalfamilykick. PlayerControllerholdsrecoverySpaceUntil=handoff+1.5 foruprightcapsule tinyspaceassistthenexpires;ordinaryidleuntouched. UIdebugaxis/impulse,100%autocrawl/freeplace labels, no0pressmessage. Zero-legremainscrawl/tissuesunchanged.

Mirrored1–3realNPC6fixtures fullQTE→KCC+walk≤6s/noextraedges/noNPCdeletion; fixedroofholds/reopencontinues, boundedlocalpressure/wallreverse/expiry testsPASS. Browser2mirrorQTEfixturesPASS. Full211unitPASS/1oldangularFAIL,45browserPASS/1oldangularFAIL,buildPASS, records2.6. Scope:controlledrealpilegetupnotfullMVP/closedstaticguarantee. Recentuserpriorityoverrides18/19historywaitingfullQTEwithnoautocrawl.

## Runtime итерация 23 — один общий landing/stomp budget

`CONFIG.playerContact` задаётmaxsupports3,weightImpulse12,totalnormal16/perbody8,totalstomp32/perbody16,cooldown.3. `landingShares` вычисляет raw=.12*mass*max(0,supportPointVelocityY−playerVelocityY)*normalShare, scalesallraw поone totalcap и clampsperbody; no redistributiontononclosingcontacts. Controller берётpointvelocitiesдоpressure, movementvyincludescarryY, standing64*9.81*dtseparatelyshared, landinggroundedtransitiononly. Исправленаошибкаper-supporttotalcap (3bodies40/88 вместо16/32), falseimpactonfasterfallingsupport. Ниzeroingvelocitiesниpoststepclampsнеиспользуются. Horizontalbudget160Н·с/сunchanged.

12pressuregeometry/physicsfixtures +actualsweep,2controlleddynamicplatformgetupdirections,actual6NPCpile2seeds100jumpsPASS. Browserpressureactualtwo-support +20jumppiletargetedPASS. Fullunit199PASS/1angularFAIL,fullbrowser42PASS/1angularFAIL доnewbrowserpressureaddition,buildPASS. Records2.5-shared-landing-pressure. Нативныйangularblocker/controlpileLoadfairness/fullNPCpilegetupcontinuity остаются; платформаfixtureнеfinalrig.

## Runtime итерация 22 — происхождение WASM и KCC на реальной куче

Пакет JS `@dimforge/rapier3d-compat@0.21.0` собирается из **native Rapier0.36.0**, commit `b716d375efc0201003f0cd9ef7168eee0b62c177`, tag `js-v0.21.0`. npm metadata/SLSA payload согласованы; `npm audit signatures --json --include-attestations` проверил registry signatures и attestations. Offline fixture сверяет package/lock integrity и SHA-256 external/embedded WASM. Исходники точного commit и план изолированной native-инструментации описаны в [NATIVE_PHYSICS.md](NATIVE_PHYSICS.md). Rust/WASM toolchain не установлен, rebuild и patchedsolver не заявлены.

`kcc-pile.test.ts`: 6 реальных падающих NPC ×2, seeds17/42,100прыжков каждый,10 bounded2Н·с disturbances; естественныйsleep, originalimpact detectionenabled, all100NPC-landings verified черезdownwardcapsulefootprint. Geometry/IDs/joints/mass/dynamicbodyтип сохраняются;penetration0. Seed17all66sleepbeforeplacement, реальный игрок будитpile. Exercise maxv≤3.33/ω≤8.53, preparation maxv≤13.77/ω≤30.49. Chromiumfixture20прыжковsamepile проходит. Это controlledKCCfixture, не20NPCrapidstress/referenceperformance. Forcedsleepallmovingbodies не применяется — он обнуляет реальные скорости.

Полныйrun184unitPASS/1originalangularFAIL,42browserPASS/1technicalangularFAIL,buildPASS. Runtimecontroller/solver/mass/balanceнеизменны, records2.4. Gate0/1частичнооткрыты. Следующийшаг: boundedpressure/supportsharing/recoverycontinuity; nativefix требует isolatedtoolchainиunmodifiedrebuildbaseline.

## Runtime итерации 19–20 — weapons / grounded recovery / shader fixtures

Это актуальный контракт вместо исторического `injured stays dynamic ACTIVE`/instantQTE ниже. `PlayerRagdoll.retainedPolys` хранит реальные clippedpoly; standingGeometry считаетbottom/localcapsuleoffset по ткани, shapeFor используетretainedhull. RecoveryTarget samplesroot/bothfeet/nearbyX and checksactualfreecapsule+allretainedparts. FullQTEwithoutclearstandingtarget disablespositionalantigravityservo, supportedcrawlallowed. afterStep checksuprighttorso/velocity +freecandidate+capsulesweep; PlayerController transfers toKCC/setscapsuleshape/localoffset/removestransientparts onlyonverifiedhandoff; demoACTIVEimmediate, damagedspeed/jumpfactorspreserved. Grounded recomputed, carrycleared. RetainedPolysusedbyfactoryonkockdownwithretainedvolume massratio; no regeneratedtissue. Zero-legstaysdynamiccrawl. Fullrig/HOPbalance/referencecontinuitynotaccepted.

`WeaponController` wraps existingSawController; selectedsaw/axe/sword/launcher/svarl, Qcycle/Ftoggle/dropdown/button, Inputindependent`thrust`RMBsource/contextmenuprevent/chord/cancel. Coldweaponblade narrowcontacts/cooldown/boundedimpulses+split/sever; lying/sleepingtargetsinclude+waketrue. `Dismemberment.bitePart`: stageatmost1unconsumedpoly/joints, samepose/density/pointvelocityfield, removeoldbody/collider/invalidconnectors, CutResultreplacement remapsGore; eatengeometry neverallocated. Mouthradius.58/reach1.85/slabdepth.35, visual×1.8. Gameplaydeletiononlyeatenvolume, notglobaldustpolicy. Grenades8cap/2sfuse/ball.12sweep/gravity9.81/blast2.2/.35s8cap/cutbudget10; freshCollisionQueryperprojectile after prior structuralmutations, no freedRapierhandles. Wallsocclude, playerpartsnotcut. Soundproceduralexistingcuts, finalweaponSFXnotaccepted.

Header72/footer104px fixed, statushint42px bounded, toolssingle48pxscrolllane, stablebuttonwidth; stageboundsunchanged at1280/640 duringlongtext/weaponchanges. Records`2.4-weapons-grounded-recovery`; old2.3isolated.

Gate0 `tests/browser/shader-integrity.spec.ts` executes production surfaceGLSL onperspectiveweldedmesh vs triangleUVseamduplicatedgeometry at8times: pixelidentical/snapjitteranimate/offstatefixed. Productioncomposite lineargradient checksone-time sRGBconversion/24-levelquantization/Bayer4×4 anchoredpixel numericalerror≤1byte, GLerror0. These2+existingaffinebrowserPASS; shaders/physicsnotmodifiedtofakefixture. Shadows/fullbrowsermatrix/referenceGPUstillopen. Pinned110part baseline/motoroff/incidentlimitoff causalreplay дополнительноverified. Finalfullunit177PASS/1angularFAIL,browser41PASS/1angularFAIL,buildPASS; runtimephysicscriteriaunchanged. Actualstatus — [PLAN.md](PLAN.md)/[PROGRESS.md](PROGRESS.md).

## История: Runtime итерация18 — anatomy durability/control ailments

`PlayerDamage.parts` durability independent `tissue`, retain multipliesstrengthbynewtissue/oldtissue, collisionhit base.18×clamp(speed/6,.65,2)×clamp(sqrt(mass/22),.65,1.5). alive vitalstrength>1e-6, displayedhealthceil(minvital×100), oldsixhitlimit retainedonlywhenstandalonelegacyPlayerSurvival hasnoanatomy. Game binds sameplayerdamage afterrestart, acceptedimpact cooldown appliesdamage toclosestuprightlimb or exactdowncolliderlimb; downimpactdetects allparts. Noheal/resurrect after injuries. HeadTrauma separate seeded RNG50419, simtime severityschedule: onset.25damage, keyboard/mouse/both episode.25+.65severity seconds, periodmax1.1/4−2.8severity; severe.55damage chance.4severity trip groundedunprotectedonly. Controls pipeline before saw/player, QTEedges/saw/commands remainraw. Aim reflection aboutbladebase, noactualmousemove mutation. HUDmapstrength/tooltip tissue/inversionwarning, Rnewobjects.

Recoveryfixes: protectedupright pressure=false/QTEgatefalse, unprotected/downpreserved. KCC impulsesenabledonlyupwardjumpundergrace withmass64 so cutdynamicpiecesmove, wallsneverexcluded. locomotionReady afterfullpose alignedtorso or1.2ssettle, completesQTE once/100%panelgone, existingKCCclearalignmenthandoffstillrequired. Actualretaineduprightfootbottom suppliesrootheight vsoldfullheight, supportlostcancelsforces/root ratherthan hover; damageddynamiclocomotion usesleg/rootgravityassistnotalltorsoantigravity. QTEgrace isfiniteoncecontrolready.

Checks161unitPASS/1originalangularFAIL,34browserPASS/1legacytechnicalFAIL,buildPASS. `.pi/unit-trauma-final.log`, `.pi/browser-trauma-final.log`, `.pi/build-trauma-final.log`; newinjury6fixtures + headtrauma2browser + recoverycontrol2browser, source testsupdatedfromoldhealth6→100. Records2.3-impact-anatomy-head-trauma. Physicsstress/referenceperformance/artstillopen.

## Runtime итерация 17 — progressive physics and damage

`ArcadeEscape.ts` удалён, completeEscape/nearestpoint relocation отсутствует. PlayerRagdoll.qteProgress→poseProgress bounded1.4/s, initialphysicalpose stored perpart, position/quaternionPD interpolated on same bodies withmassshare forcecap6500/torque80/maxdesiredvelocity1.6, lowangularPDdamping.8 avoids earlier handjitter. Supported only, A/D shifts targetroot gradually at≤1.9m/s/terrainYbounded1m/s. Fullprogress handoffrequires original fullaligned/clearchecks; no posewrites/freecontactbypass. Technical old fixtures preserved. Fixedroof may block, no guaranteree teleport.

SawGuard removesALLside/lift/spin assignments; split/sever retains velocityfield/density, grace1.8s onlyknockdown, no collider exemption. PlayerDamage normalized retained anatomyvolume, largestpelvis connectedroot; damageddetached outside island remainphysical but notcontrolled. alive vitalhead/chest/pelvis≥.98, limb survivalstates WALK/LIMP/HOP/CRAWL. clearincludePlayer/resumeAfterCut checks alive, keepsrunning/sameparts forlimbloss, deathDYINGonlyvital. Missinglimbs factoryoption protects future spawning, damagednoKCChealedhandoff; reducedspeed/hop/readjustground,zero-legsupportedcrawl. Map11percentstates, QTEcenter inCSS allsizes.

LegPose two-bone sagittalIK read-only independentfootray, knee bendsraisedfoot; meshes thigh/shin placedatbonecenters; colliderremainsKCCwhenhealthy. This is initialprocedural greybox animation, not authoredskinnedrig/fullybalancedactiveragdoll gait.

Tests152unitPASS/1originalangularFAIL,30browserPASS/1legacytechnicalFAIL,buildPASS. Pronefixture sameIDsprogress.2→1 successfulhandoff, damagezero-legcrawl/raisedknee, playerrowlowerlegsurvival,centerpanelcheckedsameDOMframe. Records2.2-progressive-rise-body-damage. `.pi/unit-damage-final.log`, `.pi/browser-damage-final.log`, `.pi/build-damage-final.log`. Fullpilethinvelocitystress unresolved and not claimed stable. DevVite had stalemodulecache discovered via servedJS vs disk; fresh server used for final suite.

## Runtime итерация 16 — явные аркадные исключения

- `EscapeQte`/`Input.jumpPresses`/`ArcadeEscape`: progressjump.2/other.08, no autorepeat/hold/decay. Episode survives GETTING_UP resets; 100% means immediate verified freecapsule destination, nearest floor/pile candidates then above-all finite pile fallback. `PlayerController` demo-only enables QTE, removes player transient bodies, ACTIVE rather than slow RECOVERING, protectedUntil+1.5. ROW_CLEAR still fatal. `#get-up-qte` vector ring/ВСТАТЬ/%/remainingSpace, no pointer capture obstruction; pause/reset/death lifecycle tested. Technical mode retains force-driven acceptance.
- `SawGuard`: heldactive&&direction.y≥.9&&fallingvelocity≤−2. Exact contact/cast over dt, before player.update/physics.step. Static roof truncates reach. `splitPart` COM x-plane with kerf; crossingjoint sever fallback. Only original connected impact island + split replacements receive outward7/up2 angular2 kick; unrelated sameNPC scraps unchanged. No success immunity without actual cut. Default equiptrue/Game sync/UI; E/LMB must run. Guard cooldown.12/playergrace.55; blood/audio existing CutResult observers reused.
- Row death `prepareRowDeath` + `clearRows(...,includePlayer=true)`: capsules off, upright11parts ifneeded, same transactional slab geometry, preserveowner on survivors, no player contribution removedVolumeByRow/score. Dead player renders general part meshes; intact player group/saw hidden. Remap ragdoll.parts after commit to avoid stale WASM handles. DYING.65 runs only physics/gore, no sessiontime/spawn/survival; pause/resume remembers DYING, visibility/contextloss freeze, result timer deathAt. Cleanup/reset verified.
- Clipper numerical tolerance separated: topology weld/ring/index1e-9 vs containsEPS1e-5. Plane intersection also1e-9: broad1e-5 snapping bent side faces after repeated clips. Fix preserves thin hull planes and allows convexMesh fallback rather than deleting long slivers. Original dust policy unchanged; atomic/thin/player/saw fixtures PASS. This fixes geometry validity, not thinfragment velocity stress.
- Final fullchecks147unitPASS/1originalangularFAIL,29browserPASS/1legacytechnicalFAIL,buildPASS. Records2.1-qte-active-saw-guard. Logs `.pi/unit-arcade-actions-final.log`, `.pi/browser-arcade-actions-final.log`, `.pi/build-arcade-actions-final.log`. New8QTE/guardtests +3browseractions; screenshot inspected. Longnatural session has3rows/5escapes/18interceptions, but retained thinparts peakv~389/ω~6472: **not stable fullphysics acceptance**. No thresholds silently weakened/clamps enabled; remaining risk explicit.

## Runtime итерация 15 — аркадное демо (приоритет над историей ниже)

- `CONFIG` / `PLAYER_SCALE=2`: физические/визуальные размеры и mass игрока ×2; движение/jump/queries/autostep/стопы согласованы. CrawlForce1040–1440/GetUpForce3000/GetUpTorque96, PD220/24; bounded effort `loadEffort(load,rate,2)`. Stun.225/getUpDelay.4/minDuration.45, recovery1с. 6hits/12с air/restore4. Свободный подъём .95/.77с (passive/active). Никаких pose assignments/disabled external collisions; near-wall recovery сначала supported traction, затем проверенный direct или upward-first rotational path. Floor exception лишь для геометрии полностью y≤0 при upward path с проверенным endpoint; roofs/raised platforms не исключены.
- `DropScheduler(mode)`: demo next=.6 + warning.9 → first1.5с, interval1.5; burst/double OFF. Technical сохраняет старый scheduler. Commit deadline epsilon исключает floating point дрейф. Total memory/envelope/no overlap constraints прежние.
- `Game.fixedUpdate`: occupancy/detector/due работают в обоих режимах; demo `clearRows(...,'solver')` использует normal sever-contact восстановление как saw (NPC non-neighbors уже colliding), legacy projection/pause остаётся лишь technical. Вырезается только intersecting geometry, значимые survivors сохраняются.
- `RowHazard.playerIntersectsRows`: стоя проверяет полную капсулу, down — exact world convex slab intersection каждой части. Row death after atomic clear, scoring transaction once, `ROW_CLEAR` result/record validation, survival health0. Player не в occupancy/clear geometry. Bounded blood/audio unchanged.
- `ConvexClipper.cleanRing`: tolerance collinearity1e-10 вместо geometricEPS1e-5 предотвращает исчезновение thin-strip corners лишь на одной соседней грани; `ClearTransaction` structural removed cutoff1e-12 вместо1e-9. Dust remains volume<1e-6 AND dimension<15mm. New3seed/5cuts retained volume tests, old thin fixtures PASS.
- Checks: unit139PASS/1originalangularFAIL; full browser25PASS/1legacytechnicalFAIL + newnaturalplayPASS; buildPASS. Natural12NPC/11cuts/1row/18.42сROW_CLEAR, noNaN/error; angular67.09>35, не acceptance gate. Records2.0-arcade-demo-rows, UI onboarding/demo default/result/reset. Docs/README имеют актуальные overrides; история ниже не default.

**Runtime дополнение(итерация14):** `ImpactEffects` observational motionbarrierbeforerapiersubstep +contactforceeventsdrain, normalapproachthreshold2.5/impulse4Н·с, nofromoverlapalone. ColliderCONTACT_FORCE_EVENTS setthreshold300Н, noforces. DedupstrongestbyNPCpair, npc.5с/pair.18с cooldown,2/tick8/s; exactobserveron/offtrajectoryfixturePASS. `GameAudio.impact`dampedlow-sinevoicesimpact≤6/shared8evictimpactbeforecut, filtercleanup; Gore smallburstobeysbloodmode. PoststepGameonly, nodamagechange, lifecycle/resetcleanup. BuildPASS/unit131PASS+1angularFAIL/browser23PASS+1technicalFAIL, records1.7unchanged. Referenceperformance/art stillnotaccepted.

**Runtime дополнение (итерация13):** blood sweptsegment→nearestcurrentNPCsurface+analyticarena, querybarrier1/update, source/insideexitignored, noVFXphysics. Stainlocalpoint/normal/partID/age, BloodDecals clipped12gonconvexhull, remap/recliponactualsplit, transformfrominterpolatedNPCmesh, age30сdarken. Shared180stainsbudget, drawcallworst180referenceGPUunverified. Full/Reduced25%/Off persistsblood.v1, OffclearsVFX/hidesvisualcapred withoutpoly/collidermutation; exactphysics3modefixturePASS. Newbrowsercontact/transform/remap/off/reloadfixturePASS; GoreCPUupdatep95.3мсnotreference. Physics/gates/recordsunchanged.

**Runtime дополнение (итерация12):** `GameAudio` proceduraloscillators+seededfilterednoise, WebAudiousergesturelazygraph,loadedtone/contactgain,cutnoiseone-shot≤8,mastervolume.35/mute/storageaudio.v1,compressor/attenuation,unavailablefallback. Pause/title/gameover/error/contextlosszerooutput+voicecleanup,blurstopblade,disposeclose; audiotimeнеgametime. `SawController.contact` подтверждённыйcontactданные, `GoreSystem.sawContact` fractional70drops/с, Gamebindings иUI. Nochangesphysicsorrecords, separateRNG; unit/browserwaveform+alllifecyclechecksPASS, Gate0open. ЭтоtemporarySFX,нефинальныйlicensedart.

**Runtime дополнение (итерация11):** physics tuning НЕ менялся: новыеconvergence/bevel/contactdrag/softstops/highsubsteps исследования не далиangular<35 и отклонены. Exact current peak82.82 при motoroff83.24 / incidentlimitoff5.61 — hard shoulder genericlimit/contactcorrection; limits вruntimeоставлены. Gameplayfix: SawController locks local plane + point acrossprogress, angle>0.21rad/offset>.06 restart, move followsbody, smalljitter retained,commitlockedplane. CutResult replacementids → GoreSystem remapoldwounds contains(localpoint), preserveslife/next, consumeskerf wounds; Game passesphysics, boundsunchanged. Worldlowresprogresscue disposed/pausecancel. Records1.7-local-saw-cut-progress; gatesopen.

**Runtime дополнение (итерация10):** NPC joint motor теперь named `MotorModel.ForceBased` (enum1 ранее ошибочно назван acceleration), damping1.8/maxForce2Н·м наaxis, limits/mass/player motors неизменны. Диагностическая capture перед/после каждого solver substep, world snapshot содержит dt и интерполированный KCC next target; `replayImpact` advances только тот one substep, fields fixedTime/substepIndex/replayTimestep/time. Peak faults соответствуют всем intermediate maxima; прежнее fixed-tick limitation итерации9 ниже больше не актуально. Диагностика OFF не сериализует world. Torque cap не speed clamp и не доказанная dissipativity joint solver: angular20-drop82.82 всё ещё>35, на некоторых rapid trajectories highω сохраняется. Контактная softness/external friction/cuboid/accel/off исследованы, не приняты. Browser saw20с/10cuts сохраняет физические76parts/массу; full gates не закрыты. Records1.6-bounded-joint-moments.

**Runtime дополнение (итерация 9):** default NPC self contacts для всех несоседних частей; cached unordered neighbor pair set только для direct joints. `removeJoint` снимает neighbor exemption; player connected filter не изменён. Natural saw family grace не создаётся при этом режиме (technical-row/replay legacy recovery остаётся отдельно), старые ограничения итерации8 ниже — исторические. `PhysicsManager.step` теперь два world.step(dt=1/120) за fixed game tick1/60, dt restored, forces duration conserved, position-based kinematic translation/rotation равномерно интерполированы. Watchdog max velocities проверяет оба подшага; observational replay сохраняет neighbor policy/substep count и интерполирует kinematics аналогично. CaptureFault остаётся snapshot целого fixed tick, может не показывать промежуточный пик, зато aggregate max его не скрывает. Saw targeting broad-phase по fresh CollisionQuery, narrow shape contacts, solid ray obstruction. Три settled-pile seeds по8 NPC/55с и browser6NPC/20с проходят post-cut сохранение массы/объёма/частей/no deferred; high-speed angular gate остаётся красным. Дополнительные шаги повышают CPU, reference performance не принята. Records1.5-self-contact-saw-substeps.

**Runtime дополнение (итерация 8):** `SawController` / `Dismemberment` / `GoreSystem`, правила в начале GDD. Game factory теперь scale=2, massMultiplier=2 (normal 144 кг), acceptance factory по умолчанию scale=1/massMultiplier=1. NPC имеют отдельные damping .12/4.5 и zero-target angular velocity motors damping 1.8, player tuning сохранён. Пила делает отдельную atomic локальную транзакцию двух convex halves с kerf .04, remap anchors по знаку cut plane (greybox anchors могут лежать вне hull), velocity point-field, rollback staged allocations. Gameplay minimum 8%/0.15кг отклоняет запрос, НЕ удаляет остатки; технический dust rule не изменён. При severing окрашивается ближайшая грань. Для бывших перекрытых соседей пилы отдельный natural contact grace: внешние контакты включены, неглубокие/разошедшиеся пары возвращаются сразу, legacy self-overlap ждёт естественного расхождения без projection/teleport; возможна длительная фильтрация глубоко пересечённых бывших соседей — открытый риск, не Gate acceptance. VFX bounded 600/180/96, instancing/low-res, wound follows part ID, restart/dispose cleanup; settings крови/audio пока нет.

**Runtime demo дополнение (итерация 7):** текущая default «Непрерывная демка»/death/air/mass-dependent effort правила в начале GDD и PROGRESS. Scene mutation constraints/total hard budget/60Hz solver сохраняются, но safe-route и awake spawn waits выключены по запросу. Automatic cuts в default demo выключены, technical puzzle mode отдельно и известный blocker не устранён. Numerical ExactMass/Separation projection developer-only OFF, не считать решениями Gate 0.

**Изменения заказчика, итерация 4:** текущие runtime defaults и частые нажатия/chaos описаны в начале GDD и PROGRESS. Game RagdollFactory применяет scale 2 только NPC (hull/anchors/centers), original acceptance fixtures остаются scale 1. Спавн теперь bounded multi-warning scheduler 0,5 с / burst 0,2 с, pending ≤6; геометрические и budget constraints не отменены. Для игрока постоянные 11 visual meshes, supported alternating motors, bounded effort без pose/velocity teleport. Query bounds — conservative broad phase по текущим collider transforms; narrow phase/rotational path samples сохранены. PS1 ON/320×240 заменяет прежний off default. Всё это не закрывает gates и не является reference performance acceptance.


---

## 1. Решения и границы

### 1.1. Стек

| Слой | Решение |
|---|---|
| Язык | TypeScript, strict mode |
| Сборка | Vite, ESM, npm lockfile |
| Рендер | Three.js, WebGL2 |
| Физика | `@dimforge/rapier3d-compat`, WASM, 3D |
| Ассеты | Blender → GLB/glTF + metadata JSON |
| UI | HTML/CSS поверх canvas, без обязательного React |
| Звук | Web Audio API, AudioBuffer pool |
| Unit tests | Vitest |
| Browser tests | Playwright |
| Профилирование | встроенные CPU/GPU метрики + инструменты браузера |
| Хранение | localStorage для настроек/рекордов, безопасный fallback |

Версии зависимостей выбираются и фиксируются после совместимости spikes. Не брать плавающий `latest` в production. У Three.js shader chunks и API Rapier могут меняться, поэтому фиксируется lockfile и добавляются shader-compilation tests.

Three.js выбран вместо R3F, чтобы явно контролировать render targets, shader variants и жизненный цикл фрагментов. Полный ECS не нужен: typed registries и отдельные системы достаточны для сотен физических частей.

WebGPU — последующее расширение, не требование запуска. Современные PBR/HDRI не используются как основной художественный материал: заданный PS1-образ приоритетнее общего пункта про современную графику. WebGL2, современная физика и модульные шейдеры удовлетворяют технической части без глянцевой PBR-картинки.

Blender применяется для ассетов, Pi — как инструмент разработки/автоматизации, а не runtime-зависимость браузера. Пользователь открывает сайт, а не устанавливает Blender или Pi.

### 1.2. Координаты

- Правосторонняя система Three.js / Rapier: x — вправо, y — вверх, z — глубина.
- Размеры/скорости — SI: метры, секунды, килограммы.
- Gravity NPC `(0, −9.81, 0)`; игрок использует собственное ускорение −18 м/с².
- NPC создаётся в конечном масштабе. Non-uniform scale не применяется к уже работающим rigid bodies.
- Физическая и визуальная геометрия имеют согласованные локальные origin и единичный scale.
- Расчистка задаётся мировыми интервалами y. Сетка не влияет на transform объектов.

---

## 2. Архитектура и данные

### 2.1. Предлагаемая структура проекта

```text
src/
  main.ts
  core/Game.ts                 # state machine, fixed-step loop
  core/Config.ts               # validated profiles and constants
  core/Events.ts               # typed domain events
  core/Session.ts              # clocks, seed, counters
  physics/PhysicsManager.ts    # Rapier world, queues, metrics
  physics/CollisionGroups.ts
  physics/RagdollFactory.ts
  physics/JointRegistry.ts
  physics/BodyRegistry.ts
  player/PlayerController.ts
  player/Input.ts
  player/SupportProbe.ts
  npc/NpcGenerator.ts
  npc/SpawnPlanner.ts
  grid/OccupancyRaster.ts
  grid/RowDetector.ts
  slicing/ConvexClipper.ts      # pure geometry, no Three/Rapier dependency
  slicing/ClearTransaction.ts
  slicing/FragmentRegistry.ts
  gameplay/DifficultyManager.ts
  gameplay/ScoreManager.ts
  gameplay/LossDetector.ts
  rendering/RetroRenderer.ts
  rendering/RetroSettings.ts
  rendering/CameraController.ts
  rendering/materials/RetroSurfaceMaterial.ts
  rendering/shaders/            # vertex snap, affine UV, fog, quantize etc.
  rendering/BloodVfx.ts
  audio/AudioManager.ts
  ui/Hud.ts
  assets/AssetLoader.ts
public/assets/
  characters/
  environment/
  textures/
  audio/
tests/
  geometry/
  occupancy/
  physics/
  browser/
```

### 2.2. Системы из задания

| Система | Владелец и ответственность |
|---|---|
| Game Core | state machine, clock, порядок шагов |
| Player Controller | input, KCC, опоры, прыжок, защита от ошибок |
| NPC Generator | типы, пропорции, массы, внешность |
| Ragdoll Physics | bodies, joints, limits, damping |
| Physics Manager | world, fixed timestep, mutation queue |
| Grid Occupancy | геометрический raster, coverage |
| Row Detection | пороги, debounce, row states |
| Row Destruction | atomic clear transaction |
| Fragment Persistence | идентичность/геометрия/суставы остатков |
| Difficulty Manager | уровень и параметры спавна |
| Score Manager | события, комбо, рекорды |
| Camera Controller | framing, shake, portrait layout |
| Rendering System | targets, shaders, materials, interpolation |
| Audio Manager | голоса, события, mute |
| UI System | HUD, обучение, меню, touch input |

Ни HUD, ни шейдер не меняют world напрямую. Clear-система не спавнит decorative rigid bodies. Score получает одно агрегированное событие после успешной транзакции.

### 2.3. Реестры

```ts
type PartId = number;
type EntityId = number;
type LogicalRegion = 'head' | 'torso' | 'legs';

interface PhysicalPart {
  id: PartId;
  sourceNpcId: EntityId;
  region: LogicalRegion;
  limb: string;
  generation: number;                 // number of cuts, not a deletion threshold
  bodyHandle: number;
  colliderHandle: number;
  convex: ConvexPolyhedron;           // actual current local collision geometry
  densityKgM3: number;
  joints: Set<number>;
  visual: PartVisual;
  previousPose: Pose;
  currentPose: Pose;
  occupancyDirty: boolean;
}

interface JointRecord {
  id: number;
  handle: number;
  a: PartId;
  b: PartId;
  anchorA: Vec3;
  anchorB: Vec3;
  frameA: Quat;
  frameB: Quat;
  kind: 'neck' | 'spine' | 'shoulder' | 'elbow' | 'hip' | 'knee';
  limits: JointLimits;
  connector: AuthoredConnectorVolume;
}

interface ClearEvent {
  transactionId: number;
  rows: number[];
  removedVolumeM3: number;
  removedVolumeByRow: Map<number, number>;
  survivingPartIds: PartId[];
  levelAtEvent: number;
  playerIntersected: boolean;
}
```

Фрагмент — PhysicalPart без предположения, что у него есть целый NPC. `sourceNpcId` нужен для текстур, фильтрации, статистики и воспроизводимости, но не связывает части физически.

Rapier handle не является бизнес-идентификатором: после удаления он может быть переиспользован. События разрешаются через собственный ID + поколение handle; stale events отбрасываются.

---

## 3. Время и порядок обновления

### 3.1. Fixed timestep

- Физика: **60 Гц**, dt = 1/60 с на всех графических пресетах.
- Максимум 5 последовательных шагов за RAF.
- Интерполяция визуального pose с `alpha = accumulator / dt`.
- Детектор заполнения: 10 Гц по simulation time.
- LossDetector: 10 Гц, поддерживает непрерывные таймеры.
- Idle-render и меню могут работать реже; world на паузе не шагает.

```ts
function frame(realNow: number) {
  if (state !== RUNNING) return renderPausedFrame();
  accumulator += Math.min(realDeltaSeconds(realNow), 0.1);
  let steps = 0;
  while (accumulator >= FIXED_DT && steps < 5) {
    fixedUpdate(FIXED_DT);
    accumulator -= FIXED_DT;
    steps++;
  }
  if (accumulator >= FIXED_DT) {
    metrics.recordDroppedSimulationTime(accumulator);
    accumulator %= FIXED_DT;
    overloadPolicy.requestLowerVisualCost();
  }
  renderer.renderInterpolated(accumulator / FIXED_DT);
}
```

При перегрузке остаток реального времени отбрасывается с метрикой; игра замедляет игровое время, не делает нестабильный огромный шаг. Дедлайны ARMED, комбо и спавн привязаны к simulation time. Нельзя обещать real-time скорость при недостаточной мощности устройства.

### 3.2. Порядок fixedUpdate

1. Сохранить предыдущие poses живых частей.
2. Прочитать input, потребить однократные команды.
3. Собрать истёкшие ARMED-полосы в одну транзакцию.
4. Выполнить подготовленный clear и обновить scene queries.
5. Выполнить допустимый спавн, не пересекающий существующую геометрию.
6. KCC: движение, gravity, прыжок, контактные силы с ограничениями.
7. `world.step(eventQueue)` с фиксированным dt.
8. Прочитать реальные poses, обновить caches.
9. Обработать contact events и audio/VFX events без изменения solver.
10. На соответствующем тике: occupancy → detector → loss.
11. Score, difficulty, HUD snapshot.

Нельзя удалять тело/сустав внутри callback контакта или посреди `world.step`. Все структурные изменения происходят на барьере перед следующим шагом.

При паузе сбрасываются real-time timestamp и accumulator. Input hold очищается. При возобновлении не исполняется накопленный прыжок из прежней вкладки.

---

## 4. Ragdoll и физический мир

### 4.1. Коллайдеры

Стартовая конфигурация: один выпуклый низкополигональный hull на часть. Обычные капсулы хороши для greybox, но релизные части должны иметь **согласованную convex-геометрию**, которую можно резать и визуально показывать.

- Голова: грубый convex hull человеческой головы, не сфера с идеально круглым силуэтом.
- Грудь/таз: угловатые выпуклые объёмы.
- Руки/ноги: усечённые призмы с authored выпуклым концом кисти/стопы.
- Визуальная оболочка соответствует hull; дополнительные складки одежды можно рисовать текстурой.
- Нельзя импортировать произвольный non-convex skinned mesh и ожидать дешёвого точного вырезания в runtime.

Близкое совпадение визуала и collider необходимо также для честной сетки. Допуск несовпадения основной поверхности: ≤0,04 м на обычном NPC, без крупных «невидимых плеч».

### 4.2. Массы обычного NPC

| Часть | Масса |
|---|---:|
| Голова | 5 кг |
| Грудь | 22 кг |
| Таз | 12 кг |
| Каждая верхняя рука | 3 кг |
| Каждое предплечье/кисть | 2 кг |
| Каждое бедро | 8 кг |
| Каждая голень/стопа | 3,5 кг |
| Всего | 72 кг |

Масса типа масштабируется через плотность всех частей после вычисления объёмов. Отдельные плотности допускаются, но соседние rigid bodies не должны иметь экстремальное отношение масс; целевой максимум 10:1.

### 4.3. Начальные свойства

| Параметр | Начальное значение |
|---|---:|
| Restitution NPC | 0,0 |
| Friction NPC | 0,8 |
| Friction настила | 0,95 |
| Friction стен | 0,65 |
| Linear damping | 0,35 с⁻¹ |
| Angular damping | 2,4 с⁻¹ |
| Solver iterations | 8 |
| Доп. iterations активным сложным островам | 2–4, если поддерживает выбранный API |
| CCD | падающие части и быстрые фрагменты |
| Максимальная ожидаемая скорость падения | 16 м/с |
| Collision skin/contact tolerance | целевой диапазон 0,005–0,015 м после spike |

Эти значения — исходная калибровка. Названия параметров integration settings и порядок material combine проверяются на зафиксированной версии Rapier. Restitution combine задаётся так, чтобы стены не делали ragdoll упругими.

Не реализовывать «стабилизацию» через обнуление скорости всех тел каждый кадр. Damping и solver — штатные механизмы; дополнительный safety watchdog вмешивается только при численной аварии.

### 4.4. Суставы

Все anchors и angular frames авторятся в метаданных, проверяются в debug-режиме. Связи:

| Сустав | Степени свободы / стартовые ограничения |
|---|---|
| Шея | ball-like: swing ±30°, twist ±40° |
| Грудь—таз | swing ±20°, twist ±15° |
| Плечо | swing конус около 80°, twist ±55° |
| Локоть | hinge: сгибание 0–135°, разгибание ограничено |
| Бедро | сгибание −25–100°, отведение ±35°, twist ±25° |
| Колено | hinge: 0–130° |

**Критический API-риск:** простой spherical joint в доступном JS API Rapier может не предоставлять полноценные анатомические cone/twist limits. Поэтому на spike проверяется generic joint с заблокированными линейными осями и angular limits в согласованных local frames. Коробчатое ограничение Euler-осей — допустимая аппроксимация, но это не точный swing cone.

Если generic joint limits недоступны/нестабильны в выбранном wrapper, до производства выбирается одно из решений:

1. Зафиксированная версия Rapier с нужными generic joints.
2. Собственная небольшая WASM-обёртка к проверенной нативной возможности Rapier.
3. Проверенный альтернативный 3D solver с angular limits, с пересмотром интеграции.

Не подменять обязательные суставные ограничения бесконечно жёсткими ручными torque springs. Мягкие motors, если используются, имеют ограниченную силу и создают только пассивную позу, а не animation-driven «воскрешение» NPC. Стартовый лимит motor torque 5–12 Н·м, итоговое значение определяется тестом устойчивости.

### 4.5. Collision filtering

Membership categories: STATIC, NPC_PART, PLAYER. Передняя и задняя ограничивающие стены — STATIC, даже если визуально скрыты.

- STATIC ↔ NPC, PLAYER.
- NPC разных персонажей ↔ NPC.
- PLAYER ↔ NPC.
- Соседние связанные части одного ragdoll не сталкиваются: joint contacts отключены.
- Самостолкновение несоседних частей допускается при положительном результате stress-test; если оно создаёт дрожание, отключается через фильтр пар одного connected component.
- После разрыва соответствующие части постепенно возвращают взаимные контакты. Нет вечного ignore между всеми потомками исходного NPC.
- VFX не создают colliders.

32-bit group mask не может кодировать уникальную группу каждому из сотен NPC. Для per-entity исключений используются joint contact flags и проверенный pair-filter/hook API. Способ фильтрации проверяется на spike, а не предполагается по аналогии с другим движком.

### 4.6. Sleep, пробуждение, anti-explosion

Rapier sleep остаётся включённым. Целевая логическая метрика покоя: скорость COM <0,08 м/с и angular speed <0,15 рад/с не меньше 1 секунды. Для connected island проверяются все части, чтобы нельзя было усыпить грудь при активно движущихся руках.

- Покоящиеся ragdoll могут быть явно отправлены в sleep целым островом, если стандартный механизм недостаточно быстро работает.
- Столкновение нового тела/игрока будит соответствующую опору и связанный с ней остров.
- Спящие тела остаются dynamic; frozen/static conversion не входит в MVP.
- Sleep не удаляет geometry из occupancy.

Watchdog считает NaN, безосновательные скорости >25 м/с, угловые скорости >35 рад/с и рост kinetic energy без внешнего источника. В dev это assertion + snapshot. В release откатывается только повреждённый остров к последнему валидному pose, его скорости ограничиваются, пишется локальная диагностическая метрика. Это аварийный fallback, не нормальный игровой эффект.

### 4.7. Безопасный спавн

Готовые hull и joint anchors вычисляются до добавления в world. Проверяются shape overlap с аренной и динамической геометрией; AABB — только broad phase. Телу сначала задаётся согласованная поза всех частей, затем создаются суставы. Спавн внутри стен не исправляется solver-импульсом.

Скорости отдельных частей выводятся из начального движения целого тела. Сильные несовместимые начальные скорости конечностей запрещены.

---

## 5. Player Controller

### 5.1. KCC

Rapier kinematic position-based body + capsule в состояниях ACTIVE/RECOVERING. Радиус примерно 0,24 м, cylindrical half-height 0,335 м; общий рост 1,15 м. Два основных измерения управляемого движения: x и y. z хранится на центральной плоскости.

Хранятся собственные `vx`, `vy`, grounded state, support IDs, jump deadlines. Контроллер вычисляет desired translation, выполняет shape sweep/slide, затем устанавливает next kinematic translation. Нельзя каждый кадр задавать pose без sweep.

KCC autostep/snap используются только в пределах GDD. Autostep на динамических ragdoll допускается после теста; иначе заменяется ограниченной проверкой свободного объёма над препятствием.

### 5.2. Прыжок

- Input event сохраняет `jumpPressedUntil = now + 0.14`.
- Последняя корректная опора сохраняет `lastGroundedTime`.
- Прыжок разрешён, если buffer активен **и** выполняется `(grounded || now − lastGroundedTime ≤ 0.12)`; без buffered input одного coyote-состояния недостаточно.
- При прыжке vy = 6,2 м/с, buffer потребляется, snap-down временно отключается до начала падения.
- Отпускание jump один раз уменьшает положительную vy в 0,45 раза.
- Поддерживающий прыжок в assisted-режиме использует отдельный remainingAirJumps, сбрасываемый на реальной опоре.
- Input переходы потребляются один раз даже при пяти physics steps в одном RAF.

### 5.3. Динамические опоры

Grounded принимается только при нормали с углом ≤48°, ниже нижней части капсулы и без upward movement. Опорная скорость — скорость конкретной точки rigid body, не только COM:

`vSupport = vCOM + omega × (contactPoint − COM)`.

Кинематическая переносимая составляющая ограничивается 2 м/с. Высокоскоростной падающий NPC не превращается автоматически в «лифт». Опора с нестабильной нормалью не даёт бесконечные прыжки.

Стандартные KCC dynamic-body pushes не должны складываться с собственными импульсами. В MVP выбирается один контролируемый механизм: отключить автоматическое усиленное расталкивание и применить bounded contact impulse из результатов KCC/shape queries.

### 5.4. Передача давления

При контакте с опорой давление зависит от нисходящей относительной скорости и условной массы игрока 32 кг, но ограничено игровыми пределами:

```ts
const rawJ = 0.12 * PLAYER_MASS * Math.max(0, downwardRelativeSpeed);
const totalJ = Math.min(isStomp ? 22 : 10, rawJ);
const perBodyJ = Math.min(isStomp ? 8 : 4, weightedShare(totalJ));
```

Сумма по телам не превышает totalJ. Направление `(0, −1, 0)`. Impulse at point ограничивает рычаг относительно COM до 0,15 м, чтобы край длинной конечности не становился катапультой.

Горизонтальное давление рассчитывается независимо: до 2 Н·с на шаг контакта с одной частью, общий бюджет 40 Н·с в секунду; push speed не выше 2 м/с. Чем тяжелее объект, тем меньше его ускорение от того же ограниченного импульса.

Обычная поддержка веса и разовый удар приземления учитываются раздельно, без повторного landing impulse каждый fixed tick. Постоянная поддержка передаёт `J = 32 × 9,81 × dt` вниз, делится по опорам и ограничивается 6 Н·с суммарно за шаг; она не входит в разовый landing budget. Landing/stomp impulse имеет cooldown 0,3 секунды.

S при `vy < 0` меняет гравитационное ускорение игрока с 18 на 28 м/с² и terminal speed с 12 на 13 м/с только на время удержания. Восходящий прыжок не получает внезапного обрыва из-за S. Поведение явно отделено от импульсов NPC.

При clear проверяется центральная точка оси капсулы по snapshot до mutation: `lower ≤ playerCenter.y < upper`. Если она попала хотя бы в один интервал и invulnerability deadline истёк, снимается одна отметка, ставится deadline `now + 1.5`. После начисления очищенных рядов пересечение каждого кратного 8 восстанавливает одну отметку до максимума 3.

### 5.5. Penetration recovery и реальное зажатие

1. Проверить penetration capsule с actual hull, не только визуальную коллизию.
2. При проникновении ≤0,06 м выполнить до 3 MTD-поправок, каждая ≤0,02 м, с повторной проверкой.
3. Если pose невалиден из-за численной ошибки, проверить sweep к последнему safe pose не старше 0,25 секунды. Перенос только по свободному пути и максимум 0,3 м.
4. Если путь блокирован реальными телами, не телепортировать. Включить trapped analysis.

Trapped analysis использует shape casts влево/вправо на 0,25 м и вверх на 0,3 м, проверяет reachable poses и доступную опору. Стена с одной стороны и открытый путь с другой — не зажатие. Неподвижность без input тоже не доказательство.

После 1,5 секунды реального squeeze возможна одна помощь за 3 секунды: суммарно до 12 Н·с в соседние тела, не вверх и не сквозь стену. Если пути всё ещё нет 5 секунд, `LossDetector` выдаёт соответствующую причину.

### 5.6. Удар, player ragdoll и физическое восстановление (v1.1)

`ACTIVE / RECOVERING → RAGDOLL → CRAWLING ↔ GETTING_UP → RECOVERING → ACTIVE`.

Это явное изменение прежнего требования о постоянно кинематическом игроке.

- Перед world.step проверяются actual contacts/relative shape casts падающих NPC с капсулой. Стартовый порог: нисходящая скорость точки NPC <−1 м/с, относительная скорость удара ≥2,5 м/с, контакт в верхней половине игрока с направленной вниз нормалью. Одно соседство/AABB недостаточно. Боковой контакт, неподвижная опора и прыжок игрока в неподвижный навес не включают ragdoll.
- Капсула KCC выключается, создаются 11 динамических частей роста 1,15 м и общей массы 32 кг с согласованными anchors/limits и начальным velocity field игрока. Во время ragdoll работает обычный solver; не добавляется комедийный kick. Таз сохраняет центральную плоскость глубины, конечности динамические 3D.
- Все части имеют owner=player. Occupancy и ClearTransaction их исключают независимо от положения/поколения. Они сталкиваются с NPC, но не режутся; для попадания полосы используется центр таза вместо отсутствующей капсулы.
- После 0,45 с RAGDOLL начинается ограниченное управление A/D при наличии физического контакта-опоры: mass-weighted горизонтальная сила до 260 Н суммарно, target speed 0,65 м/с. Силы сбрасываются перед каждым fixed step; невозможно бесконечное накопление force. Не менять позиции/скорости напрямую, не выключать контакты с прижимающими NPC. Прыжок в этом состоянии не исполняется/не буферизуется.
- GETTING_UP разрешён не ранее 0,8 с после удара и 0,2 с непрерывно свободного recovery volume. Проверяются реальная опора, полный объём standing capsule и всех частей; penetration >2 мм блокирует попытку. Начало подъёма из воздуха запрещено.
- Подъём физический: bounded PD forces к проверенной standing pose, до 750 Н суммарно, torque ≤6 Н·м на часть. Target фиксируется на время попытки; его нельзя непрерывно уводить вслед за COM. Новое препятствие отменяет подъём. Полная проверка swept recovery path и динамических опор — обязательное дальнейшее усиление Gate 1.
- Возврат KCC не ранее 0,9 с подъёма, только когда все части близки к upright pose (≤8,5 см на часть), ориентация согласована, скорость <0,6 м/с и условия держатся 0,15 с. Это смена физического представления уже стоящего игрока, не upright-телепорт лежащего тела. Художественная blend-анимация и более строгая continuity-приёмка идут с player asset.
- После вставания 2 с скорость ≤0,9 м/с. При близком устойчивом давлении сверху — ≤0,65 м/с и запрет прыжка; обычные sweep/slide и bounded pushes сохраняются. Новое действительно падающее тело может снова сбить игрока, вечной неуязвимости нет.
- Зажатие анализируется с учётом лежачей геометрии/пути выползания. Сам по себе blocked get-up не означает Game Over; defeat остаётся отдельным подтверждённым решением LossDetector.
- Пауза замораживает transition timers/силы/solver, рестарт удаляет transient player parts и joints. Приёмка: целый NPC сбивает игрока, свободная recovery работает, низкий потолок блокирует upright, A/D позволяют ползти через доступный просвет, 20 циклов не оставляют bodies/joints.

---

## 6. Геометрическое заполнение рядов

### 6.1. Почему не AABB и не центры

AABB повёрнутого бедра может перекрывать почти пустую клетку. Центр головы может находиться в одной полосе, хотя существенная часть объёма в другой. Поэтому AABB только выбирает кандидатов; покрытие строится из выпуклой физической геометрии.

### 6.2. Raster

На каждой полосе:

- 9 клеток;
- каждая клетка — 20 × 20 subpixels в плоскости x/y;
- полная карта — 180 × 220 binary pixels;
- отдельная карта устойчивого покрытия;
- дополнительные sampled scanlines для поиска сквозных x-пробелов.

Алгоритм части:

1. Преобразовать vertices её текущего collider hull в мировые координаты.
2. Отсечь hull диапазоном глубины арены и объёмом игрового поля.
3. Для каждого пересечённого ряда отсечь его горизонтальной полосой.
4. Получить выпуклый XY-проекционный polygon clipped polyhedron.
5. Растеризовать polygon в карту покрытия по центрам subpixels.
6. Если часть спит либо имеет скорость COM <1 м/с и angular speed <2 рад/с, отметить stable map.
7. Объединять покрытие логическим OR, не суммированием площадей.

Ряд считается кандидатом при:

- coverage каждой клетки ≥0,60;
- mean coverage ≥0,72;
- stable area / total covered area ≥0,85;
- нет x-колонки subpixels шириной >0,24 м, пустой на всех sampled y в полосе;
- состояние держится 0,35 секунды.

Это **проекционное**, а не полное трёхмерное заполнение. При неглубокой шахте оно лучше соответствует видимой игроку линии и позволяет естественным телам заполнять ряды. Не утверждать, что таким способом измерено 100% физического объёма.

Рекомендуемая реализация — Uint32 bitsets для покрытия. Projection/render resolution не связаны: изменение 320 × 240 на 480 × 270 не меняет occupancy.

### 6.3. Cache

Для части хранится её footprint. Покоящиеся footprint переиспользуются; на каждом measurement tick они OR-ятся в очищенную карту. При новом pose, wake/sleep, cut или удалении cache инвалидируется.

Нельзя удалять вклад из общей OR-карты простым XOR: другие тела могли покрывать те же subpixels. Допустим rebuild карты из кэшированных индивидуальных footprints или reference counts.

Периодическое сравнение полного пересчёта и кэша обязательно в тестах.

### 6.4. Detector

```ts
for (const row of rows) {
  if (row.state === OPEN && passesThreshold(row)) {
    row.state = CANDIDATE;
    row.confirmStartedAt = now;
  }
  if (row.state === CANDIDATE) {
    if (!passesThreshold(row)) row.state = OPEN;
    else if (now - row.confirmStartedAt >= 0.35) {
      row.state = ARMED;
      row.fireAt = now + 1.15;
      events.emit('rowArmed', row.index);
    }
  }
}
```

События с истёкшим `fireAt` в одном fixed tick объединяются. Смежные интервалы сливаются. Игрок/стены исключаются из измерения. Посторонние objects не могут получить очки через регистрацию render mesh как collider. После успешного commit полоса переходит в COOLDOWN до `now + 0.4`, затем снова в OPEN; неудачная транзакция не запускает cooldown и не выдаёт очки.

---

## 7. Вырезание и сохранение фрагментов

### 7.1. Условие выпуклости

Для bounded convex part пересечение с каждой half-space остаётся выпуклым. Вычитание одной горизонтальной полосы даёт максимум два convex survivors: нижний и верхний. Несколько полос дают несколько независимых кусочков; это не boolean CSG произвольного сложного меша.

Фрагменты сохраняют тот же формат convex polyhedron, поэтому их можно снова резать без восстановления исходного персонажа.

### 7.2. Half-space clip

Для плоскости `n · p ≤ d`:

1. Для каждого face polygon выполнить Sutherland–Hodgman clipping.
2. Пересечения рёбер вычислить по signed distances.
3. Собрать новые vertices с позициями и surface attributes.
4. Deduplicate близкие точки с epsilon 1e−5 м.
5. Упорядочить cut ring в плоскости; построить cap с правильной outward normal.
6. Удалить дубли/коллинеарные вершины, триангулировать faces.
7. Проверить замкнутость и signed volume.

UV исходной поверхности интерполируются по рёбрам. На cap используются planar UV и тёмная низкодетальная текстура среза. Hard normals сохраняются по face; одна позиция может иметь разные UV/normals для renderer, но один physics vertex.

Нельзя просто отрезать треугольники, оставив открытый hull: Rapier convex hull восстановит другой объём и расходится с визуалом.

### 7.3. Полоса в координатах тела

Для мирового pose `pWorld = R × pLocal + t` и горизонтальной плоскости y = h:

`nLocal = transpose(R) × (0, 1, 0)`  
`dLocal = h − t.y`.

- Нижний остаток: `nLocal · pLocal ≤ lower − t.y`.
- Верхний остаток: `−nLocal · pLocal ≤ −upper + t.y`.

Scale единичный. Сама полоса не вращается вместе с телом. Snapshot pose берётся непосредственно перед обработкой, а не из устаревшего interpolated render transform.

### 7.4. Multi-row

Сначала объединить все уничтожаемые y-интервалы. Дополнение этих интервалов в пределах каждой детали задаёт сохранённые slabs. Каждый slab клипует исходную текущую геометрию двумя half-spaces.

Порядок обработки рядов не должен влиять на геометрию, mass или score. Части на границе удаляются только в пределах численного epsilon. Один и тот же объём не начисляет очки двум соседним полосам.

### 7.5. Транзакция

**Prepare, без изменения world:**

1. Broad phase: получить пересекающиеся AABB.
2. Narrow phase: actual hull/slab intersection.
3. Для каждой пересечённой части вычислить survivors, removed volumes и cap meshes.
4. Вычислить новые masses/COM/inertia, velocities и mappings суставов.
5. Подготовить валидные Rapier collider descriptors.
6. Оценить итоговый body/vertex budget и проверить все hulls.
7. Сформировать VFX plan и агрегированное событие, но не запускать его.

**Commit перед world.step:**

1. Удалить affected joints.
2. Удалить только заменяемые source bodies и colliders.
3. Добавить подготовленные survivors с сохранённым pose/скоростью.
4. Восстановить только уцелевшие суставы.
5. Обновить pair filtering и caches.
6. Разбудить локальные тела, потерявшие опору.
7. Заменить render meshes, установить обе interpolation poses новым фактическим pose.
8. Emit один ClearEvent; затем кровь/звук/счёт.

Все геометрические ошибки обнаруживаются до destructive commit. Если preparation не удался, очередь сохраняет предупреждённое событие, выдаёт dev diagnostic и пробует корректный безопасный путь; нельзя частично удалить тело и продолжить как будто clear успешен. В release повторная ошибка должна завершиться понятной технической паузой/сообщением, а не скрытой потерей фрагментов.

### 7.6. Масса и скорость остатка

Для каждой детали сохраняется плотность:

`mFragment = densityOriginal × volumeFragment`.

COM и inertia вычисляются из замкнутого convex polyhedron либо проверенным mass-properties API Rapier. Для новых local origins удобно оставить прежний reference origin детали; Rapier COM тогда смещается внутри неё.

Сохранение rigid velocity field:

`omegaFragment = omegaOriginal`  
`vFragment = vOriginalCOM + omegaOriginal × (newWorldCOM − oldWorldCOM)`.

Это сохраняет мгновенную скорость каждой точки уцелевшей геометрии. После удаления массы нельзя одновременно требовать сохранения **всего** импульса исходного тела: удалённый материал уносит свой импульс. Правильное требование — отсутствие искусственно добавленного импульса.

Сохранённая часть не получает нулевую скорость по умолчанию, не переносится в центр ряда и не «падает на клетку» программно. Старые pose/velocities unaffected частей остаются неизменными.

### 7.7. Суставы при срезе

Для каждого affected joint:

1. Проверить, принадлежат ли anchorA и anchorB уцелевшей геометрии с допуском 1 мм.
2. Проверить authored connector volume между частями: проходит ли уничтоженная полоса через реальное соединение.
3. Если крепление удалено или соединение разрезано — joint не восстанавливается.
4. Иначе переназначить joint на те survivors, в которых сохранились anchors, сохраняя local frame и limits.

Одни только anchors недостаточны: связь не должна остаться невидимой через вырезанный промежуток. Connector volumes авторятся вместе с шеей, позвоночником, плечами и суставами ног.

Если hull разрезан на два survivors, они не связываются друг с другом новым невидимым joint.

### 7.8. Фильтрация контактов после отделения

Original adjacent pieces могут иметь небольшое разрешённое перекрытие в суставе. После его разрыва немедленное включение контактов иногда создаёт separation impulse.

- Для уже перекрывающейся бывшей пары временно сохраняется ignore.
- Контакт включается при разделении >0,01 м.
- Предельное ожидание 0,15 секунды; затем выполняется ограниченная geometry-aware separation ≤0,015 м на шаг без скоростного kick.
- Во всех остальных случаях контакты включаются сразу.

Это локальная стабилизация, а не долговременная возможность частям проходить друг сквозь друга. Тест «отделённая голова физически лежит на бывшем корпусе» обязателен.

### 7.9. Микрофрагменты и budget

Нужно различать численную пыль и игровые остатки.

- Части с объёмом <1e−6 м³ и максимальным размером <0,015 м трактуются как геометрическая погрешность и могут не создавать body.
- Если хотя бы размер существенный (например, длинная тонкая часть), автоматическое удаление запрещено.
- Ни голова, ни целая кисть/стопа, ни значимый оставшийся сегмент не исчезают ради бюджета.
- Безусловный `generation > N → delete` запрещён.

Convex surfaces могут накапливать грани. После clipping удаляются дубли и коллинеарные точки. Если нужно сокращение, допускается error-bounded convex simplification с Hausdorff error ≤2 мм и изменением объёма ≤1%. Нельзя округлять фрагмент до шара или коробки ради удобства.

Бюджет требует резерва. При total bodies >600 desktop / 300 mobile прекращается новый спавн, оставляя запас до hard limits 720 / 360 для расчисток. Если подготовленная транзакция превышает запас, сначала сокращаются незначимые геометрические дубли/численные slivers, а не игровые головы. Если этого недостаточно, включается технический overload state без частичного удаления. Метрика budget-block обязательна для профилирования. При нормальном тестовом режиме она не должна срабатывать.

---

## 8. Difficulty, score, loss и статистика

### 8.1. Difficulty

Формула уровня и таблица в GDD — единственный источник параметров. Данные хранятся в validated config, а не копируются числами по разным модулям.

SpawnPlanner использует seeded PRNG. При выборе позиций рассматривает collider support map, фактическую высоту и доступность свободной капсулы игрока. Защита от забитого выхода и безопасная зона — constraints, а не случайный retry без лимита.

При невозможности выбрать x в пределах 9 candidates спавн откладывается на 0,25 секунды, после 2 секунд пробуется меньший тип. Очередь pending NPC ограничена одним планируемым событием плюс явно разрешённым двойным сбросом; пропущенные во время паузы тела не накапливаются.

### 8.2. Score

ClearEvent содержит объём по каждой полосе. Только полосы с removedVolume ≥0,035 м³ считаются результативными. ScoreManager один раз обрабатывает transactionId и игнорирует повторную доставку.

Combo deadline — simulation time. Уровень берётся на момент clear до изменения clearedRows: порядок начисления предсказуем.

### 8.3. Переполнение

Stable occupancy верхней зоны y ∈ [9,5; 11] измеряется тем же geometry raster, но с более строгим порогом скорости: <0,25 м/с и <0,5 рад/с либо sleep. Не менее 6 колонок имеют coverage ≥0,60.

Для mobile 8 × 10 × 2 м все пространственные проверки параметризованы: 8 колонок, 10 рядов, criticalHeight = arenaHeight − 1,5 м, критически заполнены `ceil(2 × columns / 3)` колонок, снятие предупреждения при числе ниже `ceil(2 × columns / 3) − 1`. Полная occupancy-карта — 160 × 200 subpixels. Центр спавна = arenaHeight + 1,2–1,8 м. Размеры из desktop-таблицы не должны быть hardcoded в detector/camera/spawn.

Порог включения держится 0,3 секунды, затем countdown 3 секунды. При падении числа занятых колонок ниже 5 на 0,3 секунды countdown сбрасывается. Один свежий летящий NPC не попадает в stable map.

Если ARMED-ряд пересекает критическую кучу либо удаляет её реальную опору, countdown может быть продлён **один раз** до fireAt + 0,5 секунды. Это не бесконечный сброс таймера при любом warning внизу: после события требуется реальное снижение stable occupancy, иначе поражение.

### 8.4. Рекорды и persistence

```ts
interface SessionRecord {
  rulesVersion: string;
  profile: 'desktop' | 'mobile';
  arenaPreset: string;
  assisted: boolean;
  seed: string;
  score: number;
  rows: number;
  durationSeconds: number;
  maxCombo: number;
  lossReason: string;
}
```

В localStorage — top 10 на ключ профиля. Данные читаются с проверкой схемы и диапазонов. Ошибка хранения/приватный режим не ломают игру. Игра офлайн после загрузки может быть добавлена через service worker позже.

Seed и input logs полезны для диагностики, но Rapier/WASM/browser не объявляются битово детерминированными на разных устройствах. Online anti-cheat и cross-platform replay требуют отдельной разработки.

---

## 9. Blender-ассеты и экспорт

### 9.1. Pipeline

1. Сделать одного полноценного низкополигонального взрослого персонажа с одеждой и лицом.
2. Разделить его на 11 визуально согласованных convex частей по суставам.
3. Author pivots, anchors, frames и connector volumes.
4. UV unwrap: лицо 32 × 32, одежда 64 × 64, nearest/bilinear per-material.
5. Сохранить hard normals, триангулировать экспортную копию.
6. Apply transforms; scale = 1; проверить метры.
7. Экспорт GLB; отдельный metadata JSON с hull vertices, joints, region labels и texture groups.
8. В asset build преобразовать систему осей Blender в y-up; сравнить GLB transforms и metadata в automated validator.
9. Отдельная preview-сцена показывает colliders, anchors и ragdoll drop.

Для NPC physics drives rigid part meshes. Наличие skeleton в GLB полезно для авторинга и исходной позы, но скиннинг не должен удерживать разрезанные фрагменты вместе. Игрок использует обычный небольшой skeleton/animation clips, отделённый от KCC capsule.

### 9.2. Валидация ассета

- 11 ожидаемых частей и 10 связей.
- Каждый hull замкнут, выпуклый, имеет положительный объём.
- Имя/ID визуальной и физической части совпадают.
- Суммарная масса обычного типа 72 ±0,1 кг после генерации.
- Anchors находятся внутри соответствующего соединительного участка.
- Rest pose не имеет запрещённого penetration со стенами и несоседними частями.
- Различие render/collision surfaces ≤0,04 м.
- Ниже лимита треугольников, текстуры допустимого разрешения.
- Нет внешних image paths, требующих доступа к локальному диску в браузере.

---

## 10. Dedicated PS1 Rendering Pipeline

### 10.1. Граф проходов

```text
interpolated physical poses
          ↓
retro surface vertex/fragment shaders + low-res shadow map
          ↓
low-res scene target (color + depth)
          ↓
retro composite: quantization + dither + grain + vignette + tiny CA
          ↓
nearest-neighbor presentation, preserved aspect ratio
          ↓
HTML/CSS HUD
```

Surface shader — не стандартный PBR с наложенным VHS-фильтром. В нём доступны snap vertices, affine UV, quantized diffuse lighting и distance fog. Постобработка обрабатывает цвет, а не пытается заменить геометрическую часть.

Общий бюджет: один scene pass, один composite/presentation pass, один небольшой shadow pass при наличии поддержки. Эффекты модульны на уровне функций/includes и settings; не обязательно выделять каждому отдельный fullscreen pass.

### 10.2. Настройки

```ts
interface RetroGraphicsSettings {
  internalResolution: '320x240' | '426x240' | '480x270';
  intensity: number;                  // 0..1, affects visual degradation only
  vertexSnapPixels: number;           // 0..2 low-res pixels
  vertexJitterPixels: number;         // 0..0.35
  vertexJitterRateHz: number;          // 6..15
  affineStrength: number;             // 0..1
  uvWobbleTexels: number;             // 0..0.3
  textureFilter: 'nearest' | 'bilinear';
  colorLevels: number;                // 16..32 levels per RGB channel
  ditherStrength: number;
  lightingLevels: number;             // 6..16
  fogNear: number;
  fogFar: number;
  grainStrength: number;              // 0..0.04 normalized color
  chromaticOffsetPixels: number;      // 0..0.3
  vignetteStrength: number;            // 0..0.45
  shadowMapSize: 128 | 256 | 512;
  visualRagdollHz: 20 | 30 | 60;
}
```

Базовый пресет: 426 × 240, intensity 0,75, snap 0,75 px, jitter 0,12 px при 10 Гц, affine 0,6, UV wobble 0,12 texel, 24 уровня цвета, 8 уровней освещения, grain 0,015, CA 0,15 px, vignette 0,25, shadows 256.

Intensity умножает деградацию на выбранные пределы и интерполирует discrete color/lighting precision. Она не увеличивает яркость крови, не меняет geometry/collider, не меняет 60 Гц физики. При intensity 0 low-resolution preset и сами low-poly ассеты остаются; отдельная опция «более читаемое разрешение» выбирает 480 × 270.

### 10.3. Low-resolution target

- WebGLRenderTarget выбранного внутреннего размера, antialias = false.
- min/mag = NearestFilter, mipmaps off для scene target.
- DepthTexture для depth-aware composite при необходимости.
- Renderer canvas совпадает с выбранным display layout; scene target не увеличивается с devicePixelRatio.
- Presentation shader явно sample-ит ближайший texel через quantized UV.
- Camera aspect = target aspect; вывод сохраняет этот aspect, без растягивания 4:3 на широкий экран.
- HUD масштабируется независимо.

Режим 320 × 240 допускает заметные поля на широком экране. 426 × 240 и 480 × 270 подходят для широкого. На portrait шахта занимает горизонтально всю доступную ширину, выше/ниже располагаются controls.

### 10.4. Vertex snap и jitter

Эскиз vertex stage:

```glsl
vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
vec4 clip = projectionMatrix * viewPos;
vec2 ndc = clip.xy / clip.w;
vec2 grid = uInternalResolution / max(uSnapPixels, 0.001);
vec2 snapped = floor(ndc * grid * 0.5 + 0.5) / (grid * 0.5);
clip.xy = mix(ndc, snapped, uSnapEnabled) * clip.w;
clip.xy += stableVertexJitter(position, uQuantizedVisualTime)
           * (2.0 / uInternalResolution) * clip.w;
gl_Position = clip;
```

Noise детерминирован относительно **позиции** shared vertex и visual tick, не render vertex index: UV seams не должны разрывать поверхность на щели. На cap используются те же правила. На shadow pass сильное jitter выключено или согласовано, чтобы тени не мигали независимо от тела.

Perspective divide сохраняет clip z/w: физические depth/visibility не заменяются случайными значениями. Эффект ограничен долей экранного пикселя и никогда не записывает округлённые positions назад в Rapier.

### 10.5. Affine texture mapping approximation

WebGL GLSL smooth varying обычно perspective-correct. При отсутствии portable `noperspective` для выбранного shader path применяется компенсация clip w:

```glsl
// Vertex, before any irrelevant fragment effects:
vUvTimesW = uv * clip.w;
vClipW = clip.w;
vUvPerspective = uv;

// Fragment:
vec2 affineUv = vUvTimesW / max(vClipW, 0.0001);
vec2 finalUv = mix(vUvPerspective, affineUv, uAffineStrength);
```

Это математически приближает screen-space linear UV interpolation. Проверяется на наклонённом textured quad с **perspective camera**. Ортографическая камера имеет постоянный w, поэтому affine и perspective UV почти совпадут: в основной боковой сцене эффект проявляется слабо, и нельзя обещать заметное affine warping только настройкой strength. Художественную нестабильность там добавляет небольшое UV wobble.

Если art direction потребует сильного affine-эффекта во время игры, вводится камера с большим focal length и небольшой перспективой, затем отдельно перепроверяется framing и покрытие видимого силуэта. Это графическое решение, не изменение логики сетки.

### 10.6. UV wobble и текстуры

- Wobble ≤0,3 texel, обновление 10–15 Гц.
- Смещение зависит от позиции/глубины и visual tick, а не от физического jitter.
- Не «желе» и не синусоидальное плавание всего персонажа.
- Diffuse textures помечены sRGB; calculations освещения в linear space.
- Nearest основной для одежды/стен; bilinear можно для мутного лица при 32 × 32.
- Texture mipmaps допускаются индивидуально для дальнего окружения; atlas borders имеют padding.
- Низкое разрешение картинки и textures — разные независимые ограничения.

### 10.7. Свет и туман

Custom diffuse material с 2–3 источниками и слабым ambient, без metallic reflections. Яркость diffuse term квантуется в 8 уровней. Цветные источники смешиваются ограниченно, чтобы не превращать картинку в современную RGB-арену.

Пример: key directional сверху сбоку, слабый грязно-бирюзовый fill, точечный аварийный red без собственного shadow map. Ambient достаточно низкий для глубоких теней, но выше нуля для игрового silhouette.

Fog вычисляется в view-depth/world-depth, а не по screen y. Начальный ориентир при камере около z = 18: near ≈17 м, far ≈28 м; фон дальше шахты почти пропадает. На самой куче falloff мягче. Постоянная случайная смена fog запрещена.

Большие аренные shadow textures можно частично bake-ить. Динамический key shadow map 256 × 256, без мягкой PCF-каши; bias калибруется под метры. Если полноценная low-res shadow map не укладывается в mobile budget, остаются статические baked shadows плюс дешёвые contact-shadow quads; visual degradation не затрагивает collider.

### 10.8. Цвет, dithering, зерно

Один раз выполнить linear → display/sRGB преобразование после освещения и fog. Dither/quantization работают в заранее выбранном display space; исключить double gamma и повторное tone mapping.

```glsl
float threshold = bayer4x4(ivec2(lowResPixel)); // approximately -0.5..0.5
vec3 c = linearToDisplay(sceneLinear);
c += threshold * uDitherStrength / (uColorLevels - 1.0);
c = floor(clamp(c, 0.0, 1.0) * (uColorLevels - 1.0) + 0.5)
    / (uColorLevels - 1.0);
c += frameGrain(lowResPixel, uVisualFrame) * uGrainStrength;
c *= vignette(screenUv, uVignetteStrength);
```

RGB quantization 24 levels/channel имитирует сниженное цветовое разрешение, а не является точной эмуляцией PS1 framebuffer. Возможен 32-level preset для приближения 5-bit каналов. Dither anchored к low-res pixel, не плавает вместе с CSS upscaling.

CA sampling ±0,15 low-res pixel, максимум 0,3. Итоговое scene изображение масштабируется nearest; отдельные high-res эффекты не размывают silhouettes.

Параметры шума должны сохранять читаемость и не вызывать flashes. Никаких сильных scanlines или кассетных tearing по умолчанию.

### 10.9. Модульность и тесты

Shader modules: `vertexPrecision`, `affineUv`, `uvWobble`, `quantizedLighting`, `distanceFog`, `paletteQuantize`, `orderedDither`, `filmGrain`, `vignette`, `chromaticOffset`.

Каждый имеет off-state и uniform-параметры. Отключение модуля не требует замены ассетов. Render smoke tests компилируют shader variants для обычных частей, cap meshes, окружения и shadows.

Golden fixtures:

- perspective checkerboard quad для affine;
- shared-vertex mesh для jitter seams;
- gradient для color quantization/dithering;
- вращающийся low-poly человек для textured silhouette;
- gameplay stack с warning для читаемости.

---

## 11. Кровь и аудио: runtime

### 11.1. Кровь

**Старые пятна:** часть environment texture/atlas, статические quads на настиле и стенах. 64 × 64 / 128 × 128, тёмно-коричневые/бордовые пятна, без большого alpha overdraw.

**Свежие эффекты:**

- Impact event проходит порог относительной скорости >2,5 м/с и cooldown NPC 1,5 секунды.
- На событие 4–10 visual droplets, максимум 96 desktop / 48 mobile одновременно.
- Clear event: 8–20 droplets на полосу, общий cap за событие 40.
- Частицы — pooled instanced quads/triangles, срок 0,2–0,6 секунды; colliders отсутствуют.
- Декаль размещается только на реально найденной статической поверхности посредством raycast; случайное пятно в воздухе запрещено.
- Desktop максимум 128 live decals, mobile 64. Старые свежие пятна постепенно темнеют/сливаются визуально; можно безопасно вытеснять **VFX**, не физические фрагменты.
- Cap meshes сохраняют тёмную поверхность среза столько, сколько существует фрагмент.

Весь world VFX проходит через low-res pipeline. Нет high-res «киношной» крови поверх пиксельной сцены. Цвет Off/Reduced не влияет на ClearTransaction.

### 11.2. Звук

AudioManager реагирует на события. В contact callback только формируется event; decode/создание узлов не выполняется внутри физического шага.

- Web Audio запускается через Start gesture.
- AudioBuffers загружаются/декодируются заранее.
- Голоса и GainNodes управляются пулом.
- Для тяжёлого столкновения используется относительная скорость/оценка contact force при доступном API; один solver-contact не равен одному звуку.
- Cooldown пары 180 мс, общий contact event limit 8/с.
- Priority: warning > clear > game over > impact > ambience.
- Пауза гасит контакты и приостанавливает фон; resume не воспроизводит старые события.

Сэмплы собственные или лицензированные. Ни изображение Manhunt, ни его аудио не копируются из чужой игры.

---

## 12. Производительность и жизненный цикл

### 12.1. Измеримые целевые профили

Performance numbers — acceptance targets, не подтверждённые текущими замерами. До этапа 0 фиксируются конкретные машины и версии браузеров.

| Профиль | Тестовый ориентир | Цель |
|---|---|---|
| Desktop | 4-core CPU, интегрированная GPU, 16 GB RAM, Chrome/Firefox актуальной стабильной версии | 60 FPS при 20 движущихся NPC + 120 спящих частей |
| Mobile | Android/iOS среднего класса, модель фиксируется в отчёте | 30 FPS при 10 движущихся NPC + 60 спящих частей |

При 30 FPS mobile всё равно выполняет два шага физики 60 Гц, а не переходит на 30 Гц solver.

Стартовые budget targets desktop:

- physics step p95 ≤5 мс при целевом stress scene;
- occupancy tick p95 ≤2 мс (не каждый frame);
- render CPU submission p95 ≤3 мс;
- GPU p95 ≤6 мс;
- обычная clear preparation + commit p95 ≤8 мс;
- редкие multi-row clear не должны создавать main-thread блокировку >25 мс;
- draw calls scene + shadows ориентир <180 в целевой нагрузке;
- сжатая initial download ориентир ≤15 MB, audio может догружаться.

### 12.2. Оптимизация

1. Broad phase Rapier, никакой ручной O(n²) проверки всех частей.
2. Sleep и bounded awake count.
3. Общие геометрии/материалы до первого cut.
4. Instancing частей по типу/палитре там, где не нарушены индивидуальные transform/UV.
5. Динамические уникальные fragment meshes после cut, с повторным использованием buffer pools.
6. Единственная маленькая shadow map.
7. Cached occupancy footprints спящих тел.
8. Ограниченный audio/VFX pool.
9. Нет аллокаций массивов Vec3 внутри основного physics loop.
10. Метрики по active/sleeping bodies, joints, fragments, vertices, draw calls, clear time.

Если clipping p95 превышает бюджет, pure geometry preparation переносится в Web Worker с typed-array snapshot. World mutation остаётся на основном потоке. План готовится незадолго до fireAt и при commit проверяет pose/version: изменившиеся части пересчитываются, устаревшая геометрия не применяется. Worker не является оправданием задержать предупреждённую расчистку на неопределённое время.

Перенос всего physics world в worker — отдельный последующий этап, если profiling показывает необходимость; это меняет взаимодействие KCC, queries и render snapshots.

### 12.3. Adaptive quality

Разрешённый порядок удешевления:

1. выключить дополнительные shadows;
2. сократить particles/decals;
3. снизить visual animation Hz;
4. выбрать 426 × 240 / 320 × 240;
5. уменьшить будущий спавн в рамках отдельного performance-профиля.

Запрещено: увеличивать dt solver, отключать ограничения суставов, удалять игровые fragments, teleport/замораживать динамическую кучу ради FPS. Смена gameplay-профиля помечает рекорды, чтобы адаптивный спавн не давал скрытого преимущества.

### 12.4. Cleanup и ошибки

Перезапуск:

- dispose старого Rapier world/event queue;
- clear registries и pending events;
- remove/dispose unique fragment geometries/material instances;
- сохранить общие загруженные immutable assets;
- stop/recycle audio voices и VFX;
- reset timers, PRNG, score, row states, input;
- не добавлять второй RAF или дублирующиеся listeners.

WebGL context loss → пауза и экран восстановления. После restore пересоздать targets/shaders из asset cache. Если сохранённый world валиден, продолжить после подтверждения, иначе предложить restart. Загрузка WASM/ассетов имеет progress и actionable error, не чёрный экран.

Диагностика хранится локально в dev. Отправка scene/input/скриншотов на сервер не входит в runtime и не включается скрыто.

---

## 13. План реализации и технические gates

### Gate 0 — обязательные spikes

До массового моделирования и full game loop:

1. **Joint spike:** 11-body ragdoll, angular limits в выбранном Rapier API, падение 20 тел.
2. **KCC spike:** прыжки и перемещение по awake/sleeping pile, autostep и ограниченные pushes.
3. **Slicing spike:** наклонённые hulls, два среза, сохранение mass/velocity field, повторное разрезание.
4. **Shader spike:** offscreen target, affine/perspective test, jitter и quantization без double gamma.
5. **Browser spike:** WASM init, WebGL2, pause/resume, mobile input.

Выход: короткие runnable fixtures и измерения. Если joints или slicing не проходят, нельзя объявлять задачу выполненной только за счёт красивого визуала.

### Gate 1 — физический greybox

Дно/стены, игрок, генератор типов, scheduler, sleep, contact filtering. Без крови и ретро. Цель — получить устойчивую управляемую кучу.

### Gate 2 — головоломка

Occupancy raster, warning states, atomic slicing, cap surfaces, joint remapping, multi-row, score. Пройти геометрические тесты и fixture сохранения головы/ног.

### Gate 3 — сессия

Difficulty, loss, HUD, pause/restart, records, обучение. Небольшой плейтест проверяет, что ряды реально возникают при плановых пропорциях NPC.

### Gate 4 — художественный vertical slice

Blender GLB, грязная шахта, image.jpg-inspired silhouettes, полная retro pipeline, кровь, базовый звук. Сравнение кадров в нескольких intensity presets.

### Gate 5 — выпуск MVP

Mobile, settings, licensed final audio, stress tests, memory cleanup, loading/errors, HTTPS deployment.

Greybox с удалением деталей по центру допустим лишь как временная диагностическая сцена. Такой shortcut **не проходит Gate 2** и не считается MVP с сохранением частей.

---

## 14. Автоматические и ручные тесты

### 14.1. Геометрия

| Тест | Критерий |
|---|---|
| Clip cube / tilted prism | positive signed volume, closed manifold, корректные normals |
| Conservation of volume | original = removed + survivors, relative error ≤0,5%, absolute tolerance для микрообъёмов |
| Repeated slicing | 10 последовательных срезов без NaN, открытых hulls и ложного исчезновения |
| Multi-row order | одинаковый retained volume независимо от порядка входных рядов |
| Boundary | grazing plane не удаляет значимый объём снаружи полосы |
| Pose continuity | мировая позиция каждой сохранённой reference point меняется ≤1 мм при commit до physics step |
| Velocity continuity | velocity field retained points отличается ≤0,01 м/с |
| Mass | fragment mass соответствует density × volume с ошибкой ≤0,5% |
| Joint cut | удалённый connector не оставляет невидимый joint |
| Joint survival | уцелевшие anchors/connector сохраняют local frame и limits |

### 14.2. Occupancy

- Повёрнутая длинная рука не занимает всю AABB-площадь.
- Два накладывающихся hull не удваивают coverage.
- Голова через границу заполняет обе полосы пропорционально geometry.
- Игрок/стены/VFX не дают coverage.
- Разница cached/full rebuild — ноль битов при одинаковом physics snapshot.
- Быстрый пролёт NPC не запускает ARMED.
- Confirmation 0,35 секунды и fire delay 1,15 секунды соблюдаются с точностью одного measurement/fixed tick соответственно.
- ARMED не отменяется при уменьшении coverage.

### 14.3. Физика

- Серия 20 NPC с высоты спавна: ни одного NaN, безосновательной скорости >25 м/с или watchdog recovery.
- Через 10 секунд после прекращения спавна ≥90% NPC parts спят либо имеют скорость ниже порога покоя.
- Между связанной парой anchor drift p95 <0,03 м; экстремальный drift >0,1 м — fail fixture.
- После clear голова сверху и ноги снизу остаются collidable/occupancy-active.
- Оседание верхней кучи создаётся gravity, не transform offset.
- Clear не увеличивает kinetic energy уцелевших тел в момент commit, кроме малой численной погрешности и корректной смены COM.
- При отделении бывших соседей они вновь сталкиваются в пределах 0,15 секунды, без взрывного separation.
- Утрамбовка соблюдает impulse caps, может перемещать лёгкую опору, не отправляет NPC на другой край арены.

### 14.4. Игрок и сессия

- Unit timeline для coyote/buffer/cut-off и consumption event на нескольких fixed steps.
- 100 прыжков на движущихся и спящих частях без провала через collider.
- Прямая стена слева не считается squeeze при свободном пути вправо.
- Standing idle не создаёт defeat.
- Три попадания в разные clear events приводят к потере стойкости; multi-row снимает максимум одну.
- Пауза не меняет positions/timers/score, resume не создаёт catch-up сбросы.
- 20 рестартов: число bodies/joints/listeners одинаково, память после GC не имеет устойчивого линейного роста.
- Score transactionId idempotency и граница combo 6 секунд.

### 14.5. Визуал и браузеры

- Screen captures при 320 × 240 / 426 × 240 / 480 × 270 сохраняют aspect и nearest edges.
- Shader compile во всех используемых variants, нет WebGL errors.
- Affine fixture действительно отличается от perspective на наклонённом quad.
- Shared jitter vertices не создают UV seam cracks.
- Full/Reduced/Off кровь не меняет physics state и score для одинакового seed/input.
- Игрок/опасная полоса различимы на reference monitor при default settings.
- Chrome, Firefox, Edge desktop; Safari macOS/iOS и Chrome Android по согласованной матрице.
- Multi-touch движение + прыжок + отпускание работает без залипания pointer.
- WASM/GLB загружаются с production base path; 404/CORS errors показываются пользователю.

Плейтесты: минимум 10 сессий по 5–10 минут с разными seeds. Измерять время до первого ряда, долю проигрышей по причинам, число пауз спавна из-за бюджета, эффективность давления и видимость предупреждений. Стартовая цель — первый ряд за 45–100 секунд и отсутствие преобладания численных застреваний. Это гипотезы для настройки, не обещанный результат.

---

## 15. Риски и решения

| Риск | Последствие | Решение / проверка |
|---|---|---|
| Angular limits недоступны в Rapier JS | руки вращаются неанатомично либо solver нестабилен | Gate 0 generic joint test, pin version, wrapper/engine decision до производства |
| Self-collision и суставы конфликтуют | ragdoll «взрывается» | корректные anchors, отключённые adjacent contacts, mass ratio, low restitution, stress scene |
| Геометрия ассета не convex | сложный дорогой CSG, несовпадение collider | авторить convex части, валидировать Blender export |
| Center-based clearing подменяет срез | исчезают целые руки/ноги вне ряда | half-space clipping обязательный Gate 2 |
| Накопление фрагментов | body budget и main-thread spikes | sleep, spawn reserve, error-bounded simplification, no significant fragment deletion |
| KCC катапультирует/застревает | потеря управления | bounded pushes, point velocity supports, sweeps, numerical recovery vs genuine squeeze |
| Порог рядов слишком строгий | шахта переполняется без расчисток | projected coverage, measurable threshold tuning, seeded playtests |
| Порог слишком мягкий | ряды возникают в визуально пустой области | actual hull clipping, per-column thresholds, gap condition |
| Тёмная кровь/сцена нечитаемы | игрок не понимает угрозу | silhouette lighting, local contrast, gamma test, shape-coded warning |
| Эффект выглядит как современный VHS | потеря заданной PS1 эстетики | geometry/UV/low-res pipeline до grain, ограничить cinematic overlays |
| Affine effect не виден в orthographic camera | несоответствие ожиданиям | перспективный fixture, честная степень эффекта, слабый UV wobble / optional long-lens camera |
| Shader/API upgrade ломает материалы | чёрный экран | lockfile, compile smoke tests, modular adapter |
| Срез и COM дают скрытый kick | фрагменты улетают | rigid velocity-field formula, no extra impulse, energy fixture |
| Прозрачные передние стены | overdraw, occlusion, sorting | mostly open visual front, fixed edge panes, physical wall отдельно |
| Недостаточная мобильная мощность | просадки/перегрузка | 30 FPS render + 60 Hz physics, отдельный cap/profile, profiling на реальном устройстве |
| Worker result устарел | срез в неверном pose | versioned snapshot, validate/recompute at commit |
| Использование чужих материалов | лицензирование/публикация | свои модели/звук, лицензии ассетов, reference только как mood/shape |

---

## 16. Definition of Done

MVP готов только когда одновременно:

1. Можно начать, сыграть, проиграть, увидеть статистику и перезапустить браузерную сессию.
2. Игрок отзывчиво двигается среди реальных динамических ragdoll.
3. Суставы ограничены, куча приходит к покою, stress tests не вызывают watchdog.
4. Ряды измеряются геометрически, предупреждаются и вырезаются снаружи/внутри согласно спецификации.
5. Значимые остатки сохраняют мировое положение, mass/velocity field, контакты и участие в следующем ряде.
6. Есть отдельные PS1 surface shaders и low-res/composite pipeline, а не один pixelation filter.
7. Модели/текстуры/свет соответствуют image.jpg и тёмному кровавому индустриальному направлению.
8. Кровь отключается без изменения правил; HUD и предупреждения читаемы.
9. Пройдены тесты, performance gates на согласованном железе и cleanup после рестартов.
10. Production build работает по HTTPS без локального Blender/Pi, содержит только лицензированные ассеты и понятные ошибки загрузки.

Эти документы описывают реализацию и приёмку. Фактическое выполнение каждого пункта подтверждается прототипом, автоматическими тестами и отчётом замеров, а не наличием текста спецификации.
