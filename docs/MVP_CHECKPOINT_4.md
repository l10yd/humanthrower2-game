# MVP — checkpoint 4: native convergence и отвергнутый contact-anchor candidate

**Область:** stability R&D отдельно от default demo. **Production solver не изменён.** Rapier compat0.21, physics flags/masses/geometry/CCD/timestep остаются прежними. Предыдущий этап: [MVP_CHECKPOINT_3.md](MVP_CHECKPOINT_3.md). Этот проход дал проверяемую причинную картину, но не готовый physics fix.

## 1. Что выполнено

1. Прочитаны актуальные `NATIVE_PHYSICS.md`/`THIN_PHYSICS.md`, последние per-internal-substep observer traces и native solve/integration code. Ранее rejected eigenframe/pose-only-cap/Jacobian/linear-bias patches не повторялись.
2. Запущен существующий observer `substep-sequence-package` на pinned110joint/102thin cases. Observer OFF/ON, snapshots и все body states эквивалентны public Rapier, без dropped rows.
3. Добавлен независимый JS анализ point velocity/COM anchor/quaternion integration и sequence completeness. Весь joint trace:560geometry rows,40joint-substep records. Max point-velocity error1,08e−5, pose-prediction error3,50e−7, integration error0.
4. Проведён isolated PGS1/2/4/8/16 replay experiment без изменения gameplay config.
5. Собран и проверен один новый isolated native candidate: contact Jacobian arms derived from current anchors instead of frozen world arms.
6. Кандидат прошёл measurement/observer-equivalence checks, но провалил unchanged world gates. **Отвергнут и не внедрён.** Изменённый native source восстановлен с hash verification.
7. Причинный небольшой fixture и3regression tests сохранены в Git-visible `tests/fixtures/native-substep-convergence.json` / `tests/physics/native-substep-convergence.test.ts`.

## 2. Joint-case: что показали последние traces

Решение суставов уменьшает drift, но последующая контактная стадия снова нарушает joint anchor residual. Это наблюдается до интеграции; независимый анализ подтверждает, что integration исполняет текущие velocities правильно.

Плечо, первый biased substep первого CCD interval:

- начальный anchor drift0,002234м;
- predicted drift после собственного joint solve около0,000050м;
- после всех суставов0,001430м;
- после контактов0,003421м;
- фактический drift после integration0,003421м (точное совпадение native prediction).

К концу первого interval drift около0,011827м. Затем остаётся короткий CCD interval:

- первый interval dt0,0075347с,10internal steps;
- остаточный interval dt0,000798632с,10internal steps;
- каждый внутренний step во втором interval ~0,000079863с;
- relative anchor speed после joint/contact correction первого substep второго interval ~117м/с;
- итоговая bodyω82,824рад/с выше35.

Это подтверждает **конкуренцию coupled joint/contact constraints и short-remainder correction**, не ошибку грамм-шмидтовой алгебры и не независимое усечение поз соседей CCD. Старые algebraic-equivalence/CCD-positive controls сохраняют значение.

## 3. Больше PGS iterations — не готовое исправление

`numInternalPgsIterations` изменён только внутри restored snapshots; production setting не менялся. Native observer states совпадают с public solver при том же параметре.

| PGS | Joint incidentω | Joint worldω | Thin incidentω |
|---:|---:|---:|---:|
|1|82,824|82,824|1465,402|
|2|100,866|104,524|1439,907|
|4|36,190|36,988|1406,447|
|8|33,965|35,436|1377,146|
|16|21,519|31,056|1365,102|

- Более высокая сходимость уменьшает joint drift, но немонотонно:2PGS ухудшают peak.
- При8PGS incident проходит35, **world peak всё ещё провален**.
-16PGS проходят35 на этом одномjoint replay, но CPU стоимость значительно больше и normal/natural world acceptance не запускались для этой настройки.
- Thin102case практически не исправляется. Один102snapshot уже содержит чужую линейную скорость ~59,99м/с; нельзя приписать весь world failure исключительно incidentthin body.

**Вывод:** не увеличивать глобальные iterations ради одного красного теста. Это отдельная причина от thin contacts, не экономически приемлемый universal fix.

## 4. Новый native candidate: согласование anchors/Jacobian

### Гипотеза

В `contact_with_twist_friction.rs::generate` separation берётся из текущих reconstructed contact anchors, но torque Jacobian использует frozen arms с последнего полного narrow-phase update. Проверено, поможет ли согласовать эти arms с текущими contact points.

Изменены только две arm calculations:

```rust
let dp1 = p1 - world_com1;
let dp2 = p2 - world_com2;
```

Остальные native limits/CCD, masses/inertia, geometry, collision flags, solver parameter values сохранены. Не введены post-step clamps/deletion/contact bypass.

### Сборка/изоляция

Использован уже имеющийся локальный Rust/WASM toolchain, без установки и global PATH mutation. Candidate output отдельный: `mvp4-anchor-wasm` / `.pi/native-build/mvp4-anchor-package`. Public npm dependency/lockfile не заменены.

Native build завершился ~3мин23с; package measurement проверил row equations и observerON/OFF snapshot equivalence. Это подтверждение корректного экспериментального harness, **не успешности физического patch**.

### Результаты replay

| Case | Publicω | Candidateω | Статус |
|---|---:|---:|---|
|110joint|82,824|83,644|хуже, FAIL35|
|102thin baseline|1465,402|1155,818|локально лучше, всё ещё FAIL35|
|102thin exact tensor|89,609|89,406|незначительное изменение, FAIL35|

### World gates

Без изменения assertions:

- original20drops: maxv**28,319м/с >25**, maxω**175,343рад/с >35**; baselineω82,824. Calm eventually1 и anchors остаются ограниченными — это не компенсирует скоростной failure.
- KCC pile seed17 проходит; seed42 теряет ожидаемую опору (`castRay` support null).
- Natural candidate sessions не запускались: expensive downstream acceptance остановлен после явного world regression.

**Candidate rejected.** Source restored. Контрольный hash restored contact file:
`1392f0c527ffda1433d22a405f94c2a126a1604e8d29631cc088eefcf8c78442`.

Worker/solve/row_trace hashes также проверены против исходного observer manifest. Production continues public Rapier. Archived candidate пригоден только как negative control.

## 5. Сохранённые инструменты и доказательства

Git-visible:

- `scripts/native-substep-analysis.mjs` — independent equations/completeness analyzer.
- `scripts/analyze-native-substeps.mjs` — CLI reader.
- `scripts/diagnose-native-convergence.mjs` — explicit isolated replay PGS experiment; требует локального observer package, не ordinary `npm test` dependency.
- `tests/fixtures/native-substep-convergence.json` — selected first substep каждогоCCDinterval, source SHA256, exact-observer flags. Не называется full trace.
- `tests/physics/native-substep-convergence.test.ts` — point velocity/integration, contact drift/short-remainder, truncation/tampering rejection.

Ignored local artifacts:

- `.pi/native-build/mvp4-substep-baseline/`
- `.pi/native-build/mvp4-substep-analysis.json`
- `.pi/native-build/mvp4-convergence/`
- `.pi/native-build/mvp4-anchor-consistency/anchor-current.patch`
- `.pi/native-build/mvp4-anchor-package/`
- `.pi/native-build/mvp4-anchor-replay/`
- `.pi/native-build/mvp4-anchor-manifest.json`
- `.pi/mvp4-anchor-world.log`

На fresh checkout unit tests требуют только committed fixture/JS analyzer, **не локальныйRust/WASM/ignored artifacts**. Для продолжения native research manifests/patches/WASM лучше архивировать отдельно; они не попадут вGitHub автоматически.

## 6. Проверки production после эксперимента

- `verify-native-replay.mjs`: public vs archived unmodified baseline pinned110/102body states exact (zero position/rotation/velocity/angular difference).
-21causal/provenance unit tests PASS.
- Полный unit run: **431/432PASS**, единственный прежний angular gate82,824>35.
- Build PASS; production hashed bundle не изменился, поскольку runtime code в этом проходе не редактировался.
- Full browser не повторялся после чистого research/test-only этапа; последний checkpoint3 **125/126PASS**, единственный technical angular failure79,622>35.
- Нового patch adoption, solver package upgrade или threshold relaxation нет.

## 7. Следующая разумная развилка

Продолжать bounded native spike, но не выдавать его за обычную полировку:

1. **Thin lane:** constraint-consistent integration/accumulated impulse bookkeeping при extreme inverse inertia/native rotation cap. Pose-only cap уже отвергнут, простой current-anchor regeneration теперь тоже отвергнут. Нужно совместное решение, не отключениеcap/CCD/friction.
2. **Joint lane:** глобальная convergence joint/contact residual, shortCCDremainder correction и warmstarting. Числоiterations само по себе не устраняетthin и дорого поCPU.
3. Если следующий ограниченныйbudget не даёт world-safe кандидата, требуется явное решение: продолжать exact-physicsR&D, сравнить другойCPUengine на тех же fixtures или согласовать minimalcollision-proxy policy tinyостатков. Такойкомпромисс меняет физический контракт и records, его нельзя внедрять скрыто.
4. Worker/GPU перенос не исправляет эти numerical проблемы; он отдельная performance задача.

**MVP не принят.** В этом проходе исключена ещё одна правдоподобная, но вредная «починка», доведён причинный анализ до reproducible tests и сохранён безопасный production baseline.
