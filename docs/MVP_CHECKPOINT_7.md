# MVP — checkpoint 7: Worker spike, exact geometry CPU и rejected path veto

**Область:** продолжение A–C; D не выполнялся. Правила остаются **`3.9-dynamic-destination-recovery`**. Production Rapier/mass/inertia/CCD/joints/timestep не менялись; новый recovery path veto **не внедрён**. A–C/stableMVP всё ещё не приняты.

## 1. Pure row preparation и optional Worker

`RowPreparation.ts` выделяет прежний exact slab/dust/score расчёт из атомарного `clearRows`. Сам commit, geometry/body budget, survivor collider preparation, remap joints, allocation rollback, lost-support wake, score/transaction sequence остаются на main thread.

`RowPreparationWorker` — opt-in **`?geometry-worker`**, по умолчанию OFF. Почему не default — ниже. Worker запускается только при ARMED row, в последние0,4с предупреждения; один pending request, не чаще0,2с simulation time. Через0,5с отсутствия ответа сервис отключает лишь оптимизацию, синхронный commit не задерживается.

Protocol:

- Float64 transferable corner/UV/pose arrays, face metadata отдельно. Не float32 pose/geometry rounding.
- Request ID и session reset отвергают старые/out-of-order replies.
- Cache хранит исходную geometry identity + exact source pose; при commit проверяет rows, ID, poly identity и все7pose coordinates **без epsilon**.
- Moved/new/replaced/deleted part не использует stale geometry; synchronous exact calculation на исходном deadline.
- Player retained/protected tissue считается непосредственно при commit, Worker не принимает authority над player cut/death.
- Worker allocation/JS failure/stuck reply → fallback, никаких дополнительных warnings/score/deadline changes.
- Restart/dispose terminate worker/resetcache; asynchronous diagnostics не добавлены в `debugSnapshot`, чтобы pause/sim-state equality не зависела от scheduling.

Unit: float64 transfer roundtrip caps/UV/surface metadata, prepared/unprepared world equality, changed pose1µm, geometry identity, rows, out-of-order/reset/replace, late allocation rollback/retry, stuck Worker. Browser: настоящий worker build path,39valid+1stalepart, unavailableWorker same warning deadline.

**Измеренное ограничение:** current natural seed17 realRAF/RTX5070Ti run c opt-in ON — **1cache hit /303misses**,6workerreplies, pendingfalse/noerror; sampled rowClear p95≈13,9мс (2events), fixed-thread rowPreflight max≈1,9мс. Активные части меняют pose доcommit; Worker выполняет speculative работу, которую приходится повторять. Такой результат **не оправдывает default promotion**. Opt-in harness сохранён для sleeping-heavy workload; не заявляем улучшения FPS или natural clear budget. Simulation Worker остаётся отдельным открытымBпунктом.

`HUMANTHROWER_GEOMETRY_WORKER=1` включает тот же opt-in в `profile:default` / `profile:stress`. По умолчанию оба измеряют WorkerOFF. Raw `.pi/mvp7-worker-raf.json`; этот run был выполнен доOFF-by-default switch, запись отражает реально enabledservice.

## 2. Accepted exact local CPU changes

### Welding exact duplicate corners

В `vertices()` exact repeated finite(x,y,z) corner сначала проверяет nested number maps. Near-distinct points по-прежнему проходят **исходный** `Math.hypot <1e−9` и первый matched coordinate; tolerance не расширен, coordinates не округляются. Nonfinite inputs используют прежний reference path, чтобы invalid geometry не потерялась до validation. Нет global mutable-poly cache.

Prototype uniform27-neighborcell welding был измерен:72corners/5000calls≈201,8→1104,8мс, **отвергнут/удалён**. Более узкий exact-repeat fastpath на том microfixture≈206,2→163,6мс; диагностический результат, не framebudget. Tests совпадения первого match, threshold/cell falsemerge/NaN/Infinity сохраняют reference output.

### Scalar tetrahedron moments

`massProperties()` больше не создаёт промежуточные Vec3 на каждом triangle. Operation order volume/moment sums сохранён буквально; bit-exact reference tests на repeated clips/тонком hull. Original20drop и pinned102body replay показывают прежние результаты (включая failures); masses/COM не перенастроены.

### Occupancy shared corner transforms

Одинаковая local corner reference в face lists трансформируется один раз perbodyrebuild. Face metadata сохраняется, exact arithmetic/pose и clipping остаются прежними. Diagnostic `sharedCornerTransforms=false` даёт reference path.

Один **paired frozen** seed17/30s170physics parts:15rebuilds/useCachefalse, reference vsshared map иRowCoverage exact. Mean **5,00→4,56мс**, p95 **6,0→4,7мс**. Actual natural occupancy invocation p95≈4,5мс всё ещё >2мс target. Raw `.pi/mvp7-paired-occupancy.json`; не сравниваем это как fixedtickдо/после с другой траекторией/историческими147parts.

## 3. C: full island path veto rejected, production destinations restored

Added read-only diagnostic `IslandTranslation.ts`: exact fixed-orientation shapecasts между endpoints, начальная convex penetration может выходить только вдоль supporting normal, thin2mmbarrier не пропускается. Это **не runtime dependency**.

Экспериментальное подключение этой проверки к ordered ejection candidates:

- focused original1–3NPC/roof/row/weapon fixturesPASS;
- natural seed93 wonQTE at18,95с: no completedrecoveries до31с, blocked≈11,8с, pose0 сохраняется, required naturalhandoffassertionFAIL;
- устранение falseGJKinitialTOI0 через convexsupportingplane не решило no-route ситуацию;
- veto отключён/productionendpointcode восстановлен, natural seed93 сноваPASS;
- tests не исключены/thresholds не повышены, no fullpathacceptanceclaim.

Причина архитектурная: endpoint-свободный candidate не означает существующий прямой путь в плотной связной куче. Без coordinatedmulti-islandroute planning или другого явно согласованного recovery contract blanket path veto может превратить выигрыш в постоянную блокировку. Сохраняем3.9destinationcontract; Ccontinuousdynamic/angular/staticpathgate **открыт**. Не меняемrecordsради отвергнутого experiment.

## 4. Browser presentation regression

Полный browser run обнаружил оставшийся warning race: `chaos-banner` был hidden, но сохранял старый text. Послеresume `toContainText` мог увидеть прежнюю строку до новогоrender/lane. `syncChaosUI` теперь очищает hiddenbanner text; scene→UI publication изcheckpoint6 сохранён. Focused4повтораPASS, no timingassertrelaxation.

## 5. Gates

- Build/TypeScript PASS.
- Full unit до последнего banner-onlyfix: **458/460PASS**, только прежний originalangular82,824>35 и strictthin59,993>25/1465,402>35. Никакого expected-failure/skip.
- Full browser доbannerfix: **128/130PASS**, originalchaos-longangular79,622>35 и описанный staletextwarningrace. Targetedwarning послеfix4/4PASS; полныйrunпослеfix не объявляется автоматически129/130.
- Focusedworker/recovery/balance/atomic/blood/batching **12browserPASS**; предыдущаяacid/rowwarning/recoverybatch11PASS.
- `test:demo` послеbannerfix: **30unit+20browserPASS**; strengthenedoccupancyreference/worker/geometryfocused16unitPASS. Fullsuiteпослеbannerfixиtest-onlyreferencechange не повторялась.
- Baseline defaultseed17trajectory остаётся30s/170parts/maxω210,708/calls108; CPUchanges не объявляются physicsfix.
- Новый solver/engine не выбран/не установлен. StrictstableMVPиlatebudgetFAIL/open. Dmobile/GPUtimers/reference matrix/human sessions/memory/remoteHTTPS не выполнялись. Commit/push/deploy не выполнялись.

Следующий осмысленный блок: measured sleeping/active geometry workload boundary, occupancybudget и отдельная **CPUengine/solvercomparison**. Worker scheduling не решает constraint divergence; fullrecoverypath требует coordinated planner, а не ещё одного veto на конечный candidate.
