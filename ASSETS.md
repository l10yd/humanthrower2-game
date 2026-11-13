# Геометрические бюджеты и метаданные персонажа

## Сертификат всей поверхности — следующее продолжение

Офлайн CLI теперь требует `SurfaceBound.ts` в обе стороны, не только прежние7samples/triangle. Для каждого source subtriangle upper bound — минимум (а) max distance трёх вершин до одного target triangle, по выпуклости distance-to-convex-set, и (б) distance центра до target union +радиус subtriangle, по1-Lipschitz distance. Если bound≤4см, **вся ячейка** сертифицирована; иначе4-way subdivision. Exhausted200000cells/14levels→inconclusiveFAIL, никогда не PASSпоsamples. Numerical safety margin1e−7м, не формальная interval-arithmetic exact proof. Все3shippingassets проходят; workerupperbound3.998см/3476cells (консервативный bound, не измеренный exactmaximum), прежний sampledmax1.937см. Browser/runtime parser по-прежнему использует legacy sampled gate, stricterofflinegate применяется перед авторингом/релизом; productionphysicscolliders по-прежнему greybox, сертификат сравнивает **metadata hull**, не игровойsolver. Imagecodec/динамика/readability/performance отдельно.

## Текущие asset gates — offline CLI и decode deadline

`npm run validate:asset -- <character.glb> <character.metadata.json> [--json]`

Пример: `npm run validate:asset -- public/assets/reference-worker/worker.glb public/assets/reference-worker/worker.metadata.json --json`. Коды завершения: 0 PASS, 1 невалидный/недоступный input, 2 неверные аргументы. Regular-file budgets проверяются до чтения: GLB16MiB, metadata1MiB. CLI использует установленный Vite SSR-loader для TypeScript, не запускает HTTP-сервер и не требует Blender/browser.

`src/assets/OfflineCharacter.ts` декодирует uncompressed float/unsigned-index accessors из уже проверенного BIN, учитывает strides/node transforms/hierarchy, создаёт временные owned Three meshes и вызывает те же metadata/rest/model валидаторы. Проверены все3 shipping characters: worker676/scout676/bruiser660 triangles, 11parts/10connectors/72kg,128atlas. Проверки worker samplederror1.937см; актуальный CLI также требует сертификат всейповерхности (см. выше). **CLI не запускает image codec**: header valid не означает CRC/zlib/entropy valid. Сертификат не принимает dynamics/art/readability/performance.

`AssetDeadline` ограничивает ожидание import+parse+failure cleanup одним бюджетом5с. На timeout `parseOwnedRigidGlb` освобождает текущие ресурсы и отклоняет promise без ожидания навсегда зависшего decoder; `CharacterResources` закрывает/освобождает поздние arrivals. Browser case: зависший createImageBitmap → start enabled/playable greybox; другой case: late resolved ImageBitmap закрыт, ≥11 geometries disposed. Download abort5s остаётся отдельно. Это таймаут async-ожидания, **не остановка CPU/нативного codec**, не worker cancellation и не универсальный OOM/security proof. Без ImageBitmap игра использует greybox; альтернативный image decoder не добавлен.

Ниже — история pipeline; утверждения о ещё отсутствующем CLI/deadline относятся к прежним итерациям.

## Первый реальный Blender-ассет — итерация31

`assets/blender/reference-worker.blend` содержит11оригинальныхfacetedrigid частей, hardnormals/UV, встроенныйpixelatlas128×128. Runtime`public/assets/reference-worker/worker.glb`(74420bytes,676triangles,1embeddedPNG) +`worker.metadata.json`. Сине-бирюзовая броня, зеленоватое лицо/синяя повязка, gloves/boots; image.jpg служит стилистическим референсом, исходная чужая модель/текстура не использовалась. Новое original projectart, без внешнегоlibrary/generationAPI.

Пересборка: `assets/blender/build_reference_worker.py` вBlender; затем `python scripts/prepare-reference-worker.py` (offlineSciPy convexhull, нормализацияnearest/no-mips). Scriptгенерирует conservativeauthoredhulls actualGLB+anchors и10малыхconvextissuevolumes, не finalанатомия. Metadata/rest/GLB/decodedmodel/imagevalidation проходят; sampledrender↔authoringhullmaxerror1.94см. Это **authoringmetadata**, не заменённая физикаигры. Render↔текущиеgreyboxcolliders не являетсяuniformHausdorffreleaseproof.

`src/assets/ReferenceCharacter.ts` собираетclosedconvexsurfaces из actualdecodedGLB, объединяетcoplanartriangleboundaries дляclipping; поддерживаетscale/UV/capcuts. `RetroRenderer` используетатлас/оболочки уигрока/NPC, отсеченияповторяютretainedphysicalcapplanes. Significantphysicalsliveroutsideinsetbevel рендеритсяphysicalhullfallback, не удаляется. Optional`Part.renderScale` сохраняетсяatomiccuts; никакневлияетнаsolver. Authoringconnectorsframes не подключеныкruntimejoints. PlayerделитNPCshell676triangles, separateplayerrig/700–1100targetостаётсяopen.

DefaultartON; `?art=off` старыепримитивы. Downloads5sabort; missingfile/decodevalidationfailure→playablegreyboxwarning. ParseImageBitmapdeadline ещёнет, fallbackнетдоsettledparsefailure; workerизоляции/strictall-surfacebound нет. Texture/bitmap/dispose ownedсуществующимGLBparser.

3newofflineunit/3newbrowser; exactart/greybox120stepsmassposesvelocitiesmatch. Full281unitPASS/1oldangularFAIL,full59browserPASS/1oldangularFAIL,final6focusedPASS/buildPASS. Закрытыbaseauthoring/integration, неGate4: joint gaps/visualanatomy/UVartpolish/palettes, shaftlighting/shadows, productionconnectors/physicalhulladoption, memory/FPS/mobileвпереди.


## Промышленная шахта — итерация32

`assets/blender/industrial-shaft.blend`/`build_industrial_shaft.py` →`public/assets/industrial-shaft/shaft.glb`(78108bytes,648triangles,11meshgroups,1original128atlas). Twelveconcretepanels/rails/rustpipes/grilles/hazardfloor/header/lamphousings. Offline`prepare-industrial-shaft.py` normalizesnearest/no-mips. `IndustrialShaft.ts`usesexistingstrictownedGLBdecoder+fixedassetnames/bakedtransforms/finiteUVnormal/index/arena-envelope/reardepthvalidator. NoCollider/PhysicsManager API.

Rendererreplacesgreyboxonlywhenvalidatedassetloaded; `?environment=off`/missingGLBretainoldarena. Localshaderlightworldpositionanalyticgreen/blue/floorpool, **notshadow/occlusion**; nonretroPointLightsdifferentpath. EnvironmentjitterOFF; playermorelit,3NPClighttints; warninglampsrowarms. Numerical426visibilityfixture>100changedplayerpixels/delta>3000/redwarning>1000 doesNOTprovehuman1secondreadability. Actualnewassetsowned/disposedwithrenderer, noextraphysicsobjects.

2unit/4browsernew, full283unitPASS/1oldangularFAIL,63browserPASS/1oldangularFAIL/buildPASS. Physical80steptrajectorieswithrenderidenticalenvironmenton/off. Shadowpass/referenceFPS/GPU/humanrecognition/finalartnotaccepted.

## Тени — итерация33

Настоящая однаdepthshadowmap128/256/512/default256/off0,nearest/nosoftPCF;player/NPC/retainedshells/shaftcasters. Depthdrawsborrowrendergeometry/poses (inclartclip), неphysics; materialshadowcomparisoninretroandLambert, depthjitterOFF. Stableworldkey/frustum, outsidefrustumlit; невсеanalyticlocalcolourpoolsимеютсвоюshadowmap. Resourcesowned`LowResShadows`, offclearsproxies/disposestarget; deletion/sawupdates/contextrestoretested. UI`Тени`, independentintensity0. Effectsandwarningmarkersnotcasters.

Frozenproduction20NPC+120sleepingpartsSwiftShaderprofile:754callswithshadow/392off,notTDD180target;submitp95default6.2msnot3target. **НеreferenceFPS/GPUacceptance.** Rendergeometrybatching/instancingвпереди; GPUtargetactualhardware/humanrecognitionstillopen. Full284unitPASS/1oldangularFAIL,67browserPASS/1oldangularFAIL thenfinal5shadowfocusedPASSwithcontextcase/buildPASS. `scripts/profile-shadows.mjs` отчёт.

## Технические пределы геометрии

`src/slicing/GeometryBudget.ts` считает уникальные позиционные вершины, число fan-треугольников, граней и углов граней. UV seams не увеличивают число physics vertices, но входят в render corners.

Текущие защитные потолки:

| Предел | Значение |
|---|---:|
| Вершины одной части | 256 |
| Треугольники одной части | 512 |
| Грани одной части | 128 |
| Углы граней одной части | 1024 |
| Вершины всех физических частей мира | 100000 |
| Треугольники всех физических частей мира | 180000 |

Это **технические верхние ограничения**, не доказанная performance-приёмка и не целевой art polycount. До дорогого positional welding выполняются дешёвые ограниченные проверки граней/углов/треугольников. World usage кэшируется по PartId и снимается при удалении/dispose; произвольная внешняя замена topology `part.poly` вне систем разреза не является поддерживаемым способом редактирования.

- Обычное `createPart` проверяет per-part и world geometry/body limits до создания Rapier body.
- Factory проверяет бюджет всей новой модели до первого allocation.
- Row/saw/bite проверяют **итог после замены**, вычитая исходные parts, до allocation. Это не двойной подсчёт staged originals+survivors.
- Replacement transactions передают внутренний `staged=true` при создании уже проверенных survivors. Это технический параметр, не разрешение спавнеру игнорировать бюджет.
- При превышении — ошибка/техническая остановка без частичного удаления. Значимые фрагменты не упрощаются и не удаляются ради лимита. В игре ошибку принимает существующий ERROR/restart путь.
- Кровавые VFX/оружие/арена не входят в этот счёт физических hulls; renderer отдельно проверяет part topology. Это не общий GPU-memory/draw-call budget.

## CharacterMetadata v1

`src/assets/CharacterMetadata.ts` валидирует **неизвестный JSON-shaped объект** до создания world. Это отдельный parser, пока не подключённый как production GLB loader.

- `schemaVersion:1`, `units:'meters'`, `upAxis:'Y'`.
- Ровно11 уникальных limb names и10 правильных направленных anatomical links.
- Позиции конечны и ограничены абсолютным значением100м, rotation/frame — unit quaternion.
- Каждый hull замкнут, выпуклый, положительного объёма, в per-part geometry limits; каждая физическая surface face имеет полный finite UV array.
- Массы положительны, всего72±0.1кг у normal source model; соседние части ≤10:1 по массе.
- Нормальный исходный персонаж не превышает850 hull triangles. Нижний art-target450 здесь не enforced: иначе минимальные технические fixtures нельзя использовать для валидации схемы.
- Hinge только локоть/колено;1 range дляhinge/3 дляgeneric, finite min<max внутри±π.
- Anchor находится внутри своего physical hull с допуском1мм; две world-rest anchor positions совпадают в пределах1мм.
- Все10связей имеют ConnectorVolume a/b, содержащие anchors; точки connector tissue также внутри соответствующего hull с допуском1мм.
- Sparse/malformed arrays отклоняются; parser копирует данные и не мутирует источник.

Пример полностью типизированной структуры — `CharacterMetadata` interfaces и **синтетическая** `tests/fixtures/CharacterMetadataFixture.ts`. Её коробки намеренно перекрываются: проход schema validation не означает production-ready rig. Эта fixture не импортируется игрой и не является персонажем для художественного выпуска.

## Декодированная модель и исходная поза — итерация 29

- `CharacterRestPose.ts` проверяет world-rest frames и диапазоны; SAT по face normals/edge-cross-edge axes запрещает проникновение несоседних hulls глубже2мм. Прямые joint-соседи исключены; анатомическое качество соединения требует авторинга.
- `CharacterModel.ts` сравнивает11decoded rigid meshes с metadata names/transforms; запрещает unappliedscale/shear/reflection/skinning/morph, проверяетtriangles≤850,finiteUV/normals/indices,unitnormals иtextures≤12/≤128px.
- Render↔hull сравниваются по vertices/edge midpoints/triangle centroids сдопуском4см **в обе стороны**. Это выборочная проверка, не строгий Hausdorffbound дляпроизвольногомеша. Complexinterior deviationsможетпотребоватьadaptive/artприёмки.
- `CharacterGlb.ts`: strictGLB2/≤16MiB/JSON≤1MiB,chunk/buffer/accessor/nodebounds; URI/data/file/network иdecoderextensions/skins/animations/morphыblockedbeforeGLTFLoader. Метаданные/rest проверяются передdecode. Successcallerownsdispose, validationfailuredisposesdecodedresources.
- Browserfixture:selfcontained11boxGLBpassesdecode/validation/disposal;externalURIrefusedwithoutnetworkrequest. Это testasset, неарт.
- `ImageHeader.ts` до декодирования проверяет подпись/структуруPNG/JPEG/WebP, width/height≤128,≤1MiB/image,≤12images/totalpixelbudget. AnimatedPNG/WebP инеподдерживаемыеформатыотклоняются. Это **неполныйcodecвалидатор**: PNG CRC/zlib иJPEGentropyпроверяетбраузерныйдекодер, corruptsmallpayloadможетбытьотклонёнужепридекодировании.
- `CharacterResources`/`CharacterTasks` принадлежатоднойparseattempt: геометрии/материалы/текстуры/bitmapsdedup, latecompleteddependenciesдренируютсяпослеошибки,disposeзакрываетbitmapодинраз. GLTFLoaderinstance-localdeclaredAPIadapters, nonglobalcache/prototypepatch. EmbeddedtexturesdecodeчерезownedcreateImageBitmap, objectURLsнесоздаются, missingtextureнеacceptedasnull. RequirementImageBitmapsявноограничиваетbrowserprofile; fallbackImageLoaderпоканеimplemented.
- SnapshotGLBbytesпередawaitисключаетcaller-mutationмеждуpreflight/decode. Texsamplersrestrictedtonearest/linear/no-mipchain; неподдерживаемыйsamplerотклоняется,неподменяетсямолча.
- Декодер ещё не имеет deadline/cancellation инеизолированвworker; крупныйencodedpayloadограничен, ноэто неуниверсальнаязащитаотcodecbugs/OOM. OfflineCLI/productionbrowsermatrixещёopen.

## Что parser пока НЕ доказывает

- строгий render↔collider Hausdorffbound длявсейповерхности (сейчасsampling≤4см);
- anatomicalquality/renderappearance инамеренныйframeaxis/calibration сверхworldalignment;
- отсутствиеoverlapsвовсехдинамическихposes, не толькоrest;
- worker cancellation/изоляциюдекодера иальтернативныйдекодердляbrowserбезImageBitmap;
- textureatlaslicensing/UV-affine policy иproductionconnectorauthoring;
- reference FPS/CPU/GPU и долговременная память укладываются в целевой профиль.

Проверка этих условий — следующий asset gate, отдельно от схемы и бюджета. Angular native solver gate также остаётся открытым; art/Blender не может закрыть его визуальным результатом.

## Проверки

`tests/physics/geometry-budget.test.ts`:8cases — accounting/removal, topology-beforeallocation, fullspawnpreflight, row/sawrejectnocreate, final-stagebudget, bitefree, rollbackcounters, directworldlimit.

`tests/geometry/character-metadata.test.ts`:6cases — schema/copiedinput, limbs/links/limits/frames, anchors/tissue/mass,UV/topology, sparse arrays, explicit non-productionfixture.

`tests/browser/asset-validation.spec.ts`:2cases — браузерный отказ oversizedspawn без частичных bodies; parser работает без Node filesystem dependency.

Рекорды и gameplay баланс не изменены (`2.6-qte-auto-escape`).
