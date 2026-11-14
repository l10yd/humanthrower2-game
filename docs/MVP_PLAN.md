# Новый контракт и план MVP: default chaos demo

**Область:** `demo` + `twitch`, без вставания/охоты NPC.<br>
**Текущие правила рекордов:** `3.9-dynamic-destination-recovery`.

**Последнее изменение пользователя:** продолжать оставшеесяA–C, включаяC; Dне выполнять. Кислотное событие из предыдущего релиза сохранено: Кислота eligible при≥100physicsparts, предупреждение2с, rising/draining8с, maxheight1,6м; submerged debris растворяются без новых fragments, игрок повреждается. Это явное исключение сохранения частей — gameplay event, не hiddenperformanceculling. MVP gates всё ещё открыты.<br>
**Статус:** MVP в работе, не принят. Блокирующие stability/device/performance gates не заменяются зелёным demo smoke.

Этот документ — актуальный контракт для дальнейшей работы. `GDD.md`/`TDD.md` остаются источниками принципов и строгих технических проверок; их исторические runtime-значения не должны отменять описанный здесь default. Исходная ревизия: [DEMO_AUDIT.md](DEMO_AUDIT.md).

**Текущее продолжение:** [MVP_CHECKPOINT_10.md](MVP_CHECKPOINT_10.md): исправлен partial ejection island сfixed/kinematic member (joint/snapshot retained); natural seed93 captured7part/13pathblockers, boundedcoordinatedplanner1999work/17,6мс/no plan→notadopted. **BuildPASS,481/483unitPASS,129/130freshbrowserPASS**, strictphysics/latebudget/fullpathstillopen;Dnotrun.

**Предыдущее продолжение:** [MVP_CHECKPOINT_9.md](MVP_CHECKPOINT_9.md): sharedgeometryreadчерезallocationbudget/validation/colliderstage; synthetic32→64clearmean4,90→3,26мс/rawsnapshotsame. Singlepassstatistics/spansvalidatedbutdefaultOFFпоnaturalmeasurements. **BuildPASS,470/472unitPASS,129/130freshfullbrowserPASS**, strictphysicsremaining; latebudget/pathopen,Dnotrun.

**Предыдущее продолжение:** [MVP_CHECKPOINT_8.md](MVP_CHECKPOINT_8.md): isolatedJolt1.1.1comparisonrejected (normalω88–93/drift.20–.25, nativeexacttinyω1069); automatic tinyinertiaspherefallbackrefuted. Operation-scopedGeometryReadaccepted/pairedoccupancymean4,63→3,95мс, mapsame. **BuildPASS,463/465unitPASS,129/130freshfullbrowserPASS**, onlystrictstabilityfailures. A–Cnotaccepted,Dnotrun; productionRapierunchanged.

**Предыдущее продолжение:** [MVP_CHECKPOINT_7.md](MVP_CHECKPOINT_7.md): pure row preparation + opt-in Float64Worker (defaultOFF после1hit/303misses), exact-repeat welding/scalar mass arithmetic/shared occupancy transforms, full islandpathveto rejected поnaturalQTEgate. BuildPASS,458/460unitPASS;128/130fullbrowserдоbannerfix, warningthen4targetedPASS. Stablephysics/latebudget/fullpathremainopen;Dnotrun.

**Предыдущий проход A–C:** [MVP_CHECKPOINT_6.md](MVP_CHECKPOINT_6.md): unique hull scene/shadow batching, bounded HUD cadence, dynamic recovery destination checks + explicit blocked stroke, actual hardware RAF stress и bounded impulse/convergence rejection. **A–C не полностью закрыты; D не выполнялся.** Production Rapier unchanged. Final **447/449unitPASS**, failing original angular + new whole-world thin; last full browser **126/128PASS**, ragdoll test then deterministic3/3targetedPASS (full not rerun). Demo30unit+20browserPASS, performance2PASS. Строгие normal и thin gates остаются красными, NO-GO для stability acceptance.

**Предыдущий checkpoint4:** [MVP_CHECKPOINT_4.md](MVP_CHECKPOINT_4.md). Native observer/convergence analysis completed; one current-anchor candidate rejected by unchanged world gates and source restored. Production unchanged; build PASS, **431/432 unit PASS**, remaining original angular failure. Last full browser checkpoint3 **125/126**, not rerun for research-only stage.

Предыдущий поздний CPU этап и полные gates: [MVP_CHECKPOINT_3.md](MVP_CHECKPOINT_3.md). Предыдущие checkpoints ниже — история.

## 1. Что сохраняем

- Chaos survival arcade: геометрические ряды, выживание, оружие/поставки, события, поражение и повтор.
- Шахта 9 × 16 × 2,4; NPC входят целиком из скрытой зоны сверху, игрок ограничен потолком.
- Обычный сброс каждые 1,5 с, без штатных bursts/doubles; body-rain — событие.
- Default NPC twitch-only: максимум шесть живых агентов, fresh-drop articulation заканчивается после контакта/таймаута. Не все NPC обязательно спят.
- 7 типов/7 weapons/8 events (добавлена кислота). Новые AI/оружие/арены пока не добавляем.
- Старт без оружия. Первая поставка — пила. Износ/поломка/8 launcher charges.
- Полноценное повреждение тела, retained tissue, нефатальная потеря конечностей, без ног — ползание.
- Normal NPC = 144 solver кг / 80 gameplay кг; HUD/QTE kg отдельно от inertia. Overload от 200 gameplay кг: под тремя normal NPC сначала нужна разгрузка.
- Head control faults OFF по умолчанию; повреждение головы сохраняется.
- Точный geometric occupancy и slicing, meaningful survivors вне полосы остаются; игрок не заполняет сетку.
- Default PS1 320×240, intensity .75, тени 256, Full blood. Low visual quality можно выбирать отдельно от gameplay.
- Fixed game tick 1/60, два solver substeps 1/120. Массы/CCD/суставные пределы не меняем ради зелёного performance графика.

## 2. Актуальный recovery contract

Это **явная аркадная помощь**, не обещание force-only физического вставания.

1. До win тело игрока остаётся динамическим и QTE зависит от нагрузки/опоры/новых ударов.
2. После выигранного QTE те же retained player parts переходят в кinematic straightening примерно на секунду.
3. Fixed geometry, включая неподвижную низкую крышу, может блокировать выбор destination. После освобождения statics recovery продолжается.
4. Мешающие dynamic NPC islands переводятся целиком в проверенное конечное место с bounded ejection speed 7 м/с. Не удаляются, не разрываются суставы, не меняются массы/геометрия.
5. Все перемещаемые группы должны укладываться в x/y/z границы чаши, включая верх.
6. Это destination-clearance arcade translation, **не непрерывный physical sweep через динамическую кучу**. Конечные poses теперь проверяются против других dynamic/kinematic тел и ранее перемещённых islands; если destination нет, straightening/handoff блокируются с сохранённым win. Полный dynamic path/angular sweep остаётся открытым gate.
7. После активной секунды straightening — возврат к KCC/ходьбе, с retained geometry. Verified no-destination blocking приостанавливает stroke clock на fixed ticks; `recoveryBlockedSeconds` отдельно от active duration. Новый удар после grace открывает новый QTE.
8. Нефатальный row cut во время win сохраняет выигрыш и исходный deadline, но не отращивает ткань.
9. Ни clocks, ни FPS машины не определяют порядок поисковых кандидатов/исход восстановления.

## 3. Релизные приоритеты

### Этап A — убрать известный CPU bottleneck

- [x] Далёкие обломки отсекаются AABB до narrow-phase.
- [x] Connected-member lists кэшируются по версии topology.
- [x] Shape/pose читаются один раз в пределах ejection barrier.
- [x] Верхняя граница ejection защищена regression test.
- [x] Uniform grid для repeated local collision queries; conservative large/unknown fallback, registry order сохранён.
- [x] Solver/gameplay load собираются одним traversal; повторный load update в том же player tick убран.
- [x] Bounded opt-in profiler (`?profile`) и work counters.
- [x] Large-world recovery test с двумя NPC и 300 далёкими sleeping fragments.
- [x] Offline asset CLI без Vite server/watchers; прежний timeout не увеличен.
- [x] Row warning: штриховка, границы, numeric countdown, sim-time audio pulses.
- [x] Публичные стабильные asset paths больше не получают годовой immutable cache.
- [x] Полная обычная regression suite повторена после этапов A/B: **125/126 Chromium browser PASS**, остался strict technical angular gate; **427/428 unit PASS**, остался original angular gate. **MVP acceptance не закрыт**, failures не excluded/ослаблены.

### Этап B — late-session budget

- [x] Первичные invocation tails измерены новым production runner: solver p95 ~18–18,6 мс в последних 600 ticks, squeeze p95 ~7,2–10,1 мс, rowClear до ~22,8 мс. Цели ещё не приняты; подробности [MVP_PROGRESS.md](MVP_PROGRESS.md).
- [x] Body decals объединены в один dynamic draw buffer; сохраняются clipping, drying, transforms, порядок пятен и diagnostic unbatched path. 64 пятна: −63 draw calls, pixel comparison PASS; unchanged poses/ages не загружают buffers повторно.
- [x] Occupancy half-space fast path сохраняет predicates/clipping и exact карты, уменьшает повторную welding работу. На том же 30s seed17 occupancy mean 0,673→0,432 мс/tick (ticks без rebuild включены), p95 5,3→3,5 мс. Actual invocation p95 после оптимизации всё ещё ~7 мс в 60s сессии.
- [x] Colliderallocationgeometryreadsharedthroughbudget/validation/coordinates/stagedclear, finalbudgets/rollbackunchanged; same32partclear→64survivorsmean4,90→3,26мс. Naturalmax8,9–9,3мсstillabove8target(checkpoint9).
- [x] Read-onlyoperationGeometryReadreusesexactweldingwithinoccupancy/rowpreparation, noacross-tickmutablecache; pairedfrozenmean4,63→3,95мс/mapexact. Naturalp95~3,7мсstill>2target; checkpoint8.
- [x] Дальнейшее уменьшение unique-fragment scene/shadow calls: exact transform batching, pixel/depth/snapshot checks; current paired frozen30s434→108total, те же170physics parts+11player visuals/triangles. Старые364calls — другой historical snapshot.
- [x] Squeeze/recovery sweep: pure translation не запускает13angularcasts из-заfloat32 quaternion norm; точные translational bounds; один recoveryTarget barrier вместо12 full scans.
- [x] Clear: далёкие meaningful parts отсекаются доslab/weld, survivor collider готовится один раз; late preparation rollback и original dust semantics сохранены.
- [x] Paired diagnostics checkpoint3: squeeze p95 7,2→4,7 /10,1→7,2мс; clear mean18,7→14,6 /14,2→7,0мс. Общий late fixedTotal не имеет значительного выигрышa — solver доминирует.
- [x] Убраны heavy DOM updates на каждом RAF: HUD30Hz/state-change refresh after scene render; normal HUD не собирает sleeping global stats.
- [x] Production diagnostic runner `npm run profile:default` пишет rolling per-invocation timings, 10s checkpoints, active/sleeping/geometry/gore/render данные, имеет `finally` cleanup. Не FPS/reference acceptance.
- [ ] Полный default-art stress с аппаратным FPS, контактными islands и droppedTime acceptance. Новый production real-RAF runner измерен наRyzen5600/RTX5070Ti: первыйrun59,57/59,89FPS/droppedTime0, повторный215,18/224,49RAF/droppedTime0/0,0209с (display/browser scheduling разный). Обаcensoredдо60s/strict25/35FAIL; late physics p95до8,2мс, неaccepted.
- [ ] Worker adoption дляpure geometry/всегоsimulation по измеренной пользе. Реализован opt-in`?geometry-worker` Float64prepare/versionedexactcommitfallback; active natural1hit/303misses → defaultOFF, не performanceacceptance. См.checkpoint7.

### Этап C — физическая устойчивость

- [x] Original `<25 m/s / <35 rad/s` gates сохранены без ослабления; добавлен whole-world thin acceptance в обычный unit/check/MVP gate. **Прохождение всё ещё FAIL**, не закрытая stability.
- [x] Bounded native checkpoint4: fresh exact observer baseline, независимые substep equations, PGS experiment и один current-anchor candidate; world regressions → rejected/restored. Не является physics fix.
- [x] Следующий bounded spike thin impulse/integration + global convergence: archived impulse-step+PGS4one-stepjointPASS, но original20dropω90,84FAIL/KCC17/42supportFAIL; rejected. Явная архитектурная развилка NO-GO/pinned baseline + isolated CPUengine comparison описана вcheckpoint6; новый engine пока не выбран/не внедрён.
- [x] Первый isolatedCPUenginecomparison completed: Jolt1.1.1nativeprincipal/tensorpreserved/normal20drop иcapturedthinFAIL; automaticnearzeroinertiafallbackisnotstability. Joltнеadopted, exactcontract/stabilitygateopen(checkpoint8).
- [x] Явное решение по extreme thin fragments: exact survivors/массы/inertia сохраняются, proxy/culling/clamps не внедряются без отдельного согласования; stable MVP blocked до solver/engine fix.
- [x] Explosions не маскируются culling/clamps/fake sleep; strict red tests остаются в ordinary gates.
- [x] Целостность recovery island: если связный member fixed/kinematic/disabled/sensor, dynamic subset не перемещается, IDs/joints/snapshot сохранены; red→green regression(checkpoint10).
- [ ] Полная dynamic placement/path safety forced recovery. **Endpoint checks реализованы**: islands/dynamic/kinematic/containment/no-destination pause; fulltranslationveto experimentblockednaturalseed93win→rejected/restored, continuous/angular/staticpathнепринят. Coordinatedwhole-islandclosurecandidateнеadopted: seed93barrier13blockers/1999work/exhausted≈17,6мс, notproofnoroute(checkpoint10).

### Этап D — public acceptance

- [ ] Hardware desktop FPS/GPU timings.
- [ ] Средний реальный смартфон; согласованный mobile gameplay/performance profile и отдельные records.
- [ ] Chrome/Firefox/Edge + согласованный Safari/mobile matrix.
- [x] Поднята видимость персонажей через небольшой lighting boost, прежний pixel-readability threshold сохранён и PASS.
- [ ] 10 человеческих сессий и осознанный intended session length; старые 4–8 минут — гипотеза, не автоматически актуальное требование chaos аркады.
- [ ] Heap/GPU memory slope после длинной игры и 20 restarts.
- [ ] Production HTTPS smoke на реальном Netlify URL.

## 4. Команды и честные gates

```sh
npm run build
npm test
npm run test:demo
npm run test:performance
npm run test:mvp
npm run profile:default -- test-results/default-profile.json
npm run profile:geometry -- test-results/geometry-profile.json
npm run profile:stress -- test-results/default-stress.json
npm run test:stability
```

- `test:demo` проверяет mechanics/smoke, не строгую стабильность и не reference FPS.
- `test:performance` проверяет bounded workload и публикует timings; headless SwiftShader не объявляется real-device GPU acceptance.
- `profile:stress` = production actualRAF/render/contact graph, software по умолчанию; `HUMANTHROWER_STRESS_HARDWARE=1` — headed localGPU measurement. Return1 при failed/open local gates; `accepted:false` до GPU/reference acceptance. Это не этапD/device matrix.
- `test:stability` включает unchanged20drop и whole-world thin strict25/35; causal replay/evidence PASS не заменяет их.
- `test:mvp` = общий unit/physics/build gate, затем полный browser suite. **Он не должен стать зелёным за счёт исключения angular failure.**
- Unit concurrency ограничено двумя workers, чтобы дорогое surface certification/physics не конкурировало десятками процессов. Таймауты/численные thresholds не увеличены.

## 5. Измеренный прогресс этапа A

Production Chromium/SwiftShader, Ryzen 5 5600, same natural seed 17, no render in measured fixed loop:

| Метрика выигранного QTE | Аудит до | После query/recovery changes |
|---|---:|---:|
| Player среднее | 16,11 мс | 0,69 мс |
| Player p95 | 29,30 мс | 1,20 мс |
| Full tick среднее | 26,32 мс | 10,64 мс |
| Full tick p95 | 47,70 мс | 23,70 мс |

Отдельный synthetic blood workload: 550 distant sleeping parts +600 repeated drops, mean gore 3,20→0,56 мс. Это favorable spatial workload, не обещание всех natural scenes: natural gore tails изменились существенно меньше.

Large-world browser regression: player p95 примерно 2–2,3 мс в двух прогонах; time — diagnostic, assert — machine-independent work bound. Далёкие fragments остаются sleeping и неподвижными.

Natural seeds 17/20261111 сохранили число частей, ряды, durations и velocity peaks. **Это подтверждает локальный performance fix, но одновременно показывает, что solver stability НЕ исправлена.**

CLI worker validation wall time в последовательной локальной проверке ~11,9→3,2 с; isolated CLI tests PASS. При oversubscribed полном запуске параллельно с browser suite timed out отдельный surface-certification test. Последующий bounded-workers unit run без браузерной конкуренции: **419/420 PASS**, оба asset-validator сценария проходят, остался original angular gate.

### Browser checkpoint / следующая regression-задача

- Focused recovery/blood/records/medical: 12 PASS.
- Audio/session/mobile/shader/profiler: 13 PASS в первом UX прогоне, warning fixture затем исправлен (audio running state) и отдельно PASS.
- Head weapon/trauma fixtures обновлены под unarmed inventory и двухсекундную смерть — PASS.
- Pixel visibility старого commit FAIL (2368 <3000), текущая lighting correction PASS без изменения threshold.
- Старый browser KCC real sleeping pile даёт `no NPC support` и на baseline `48757d7`, и сейчас: остаётся открытым; unit 100-jump KCC fixtures проходят.
- Дальняя browser пачка до внешнего timeout дошла до 56 сценариев; остаются `player-ragdoll`, `recovery-control` saw-grace, `saw-pile`, default-equipped `saw`, old `tiny-support-pressure` version assertion и технический `chaos-long`. Их нужно разбирать targeted с baseline comparison. Не менять production ради устаревших fixtures и не ослаблять physical caps.
- Полный browser gate **не завершён и не принят**. Его длительность на этой среде больше 10 минут; повторять небольшими named batches/с достаточным внешним timeout.

Этот checkpoint намеренно не объявляется финальным MVP: следующий блок — оставшиеся regressions/late-session profiling, затем native stability и hardware/mobile acceptance.

## 6. Продолжение: regression cleanup / batching / occupancy

Актуальный итог следующего прохода — [MVP_PROGRESS.md](MVP_PROGRESS.md). Предыдущие числа раздела 5 сохраняются как история, не как текущий full gate.

- Build PASS; **421/422 unit PASS**, единственный FAIL original angular 82,8237 >35.
- Полный Chromium browser suite выполнен до конца: **122/126 PASS за 18 минут**. Три оставшихся `arcade-actions` после этого исправлены и targeted PASS; четвёртый — technical chaos-long angular 79,6223 >35, строгий порог не изменён. Не выдаём объединение прогонов за свежий 125/126 full run.
- Исправлен production crash после fatal row без retained vital component: смерть не пытается повторно создать пустой ragdoll. Red→green unit + browser death lifecycle PASS.
- Все прежде перечисленные saw/weapon/tiny version/hidden debug/player-ragdoll regressions закрыты targeted и полным прогоном. HUD durability label больше не меняет позицию кнопок.
- KCC browser gate сопоставлен с original open 11-row unit fixture, player создаётся после pile preparation; прежние 66 sleeping/20 NPC jumps/penetration/velocity/mass/IDs assertions сохранены. Это не default chaos stability acceptance.
- 111 natural body decals: frozen 30s total draw calls **474→364**, те же 147 parts/triangles. CPU render p95 в отдельных шумных SwiftShader прогонах ~3,6–3,7 мс — не обещаем proportional FPS gain.
- Следующий производственный этап: squeeze/cut CPU tails, сокращение остальных calls и отдельный native stability lane. Реальные GPU/mobile/human acceptance остаются открыты.

Сырые результаты предыдущего/нового измерения в `.pi/`; ключевые числа здесь сохранены в Git-visible документе. `.pi/` не является обязательным ресурсом production.
